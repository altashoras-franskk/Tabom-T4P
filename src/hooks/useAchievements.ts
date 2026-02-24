import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Achievement,
  AchievementStore,
  AchievementPrompt,
  checkRuleBasedAchievements,
  detectPatternWithLLM,
} from '../sim/achievements/achievementSystem';

export const useAchievements = () => {
  const [store] = useState(() => new AchievementStore());
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [latestAchievement, setLatestAchievement] = useState<Achievement | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  
  const lastCheckTime = useRef(0);
  const checkInterval = 2000; // Check every 2 seconds
  
  // Load achievements on mount
  useEffect(() => {
    setAchievements(store.getAll());
  }, [store]);
  
  // Check for new achievements
  const checkAchievements = useCallback(async (prompt: AchievementPrompt) => {
    const now = Date.now();
    if (now - lastCheckTime.current < checkInterval) {
      return; // Throttle checks
    }
    lastCheckTime.current = now;
    
    // Get current achievements directly from store to avoid dependency loop
    const currentAchievements = store.getAll();
    
    // First, check rule-based achievements (instant)
    const ruleBasedAchievement = checkRuleBasedAchievements(prompt, currentAchievements);
    if (ruleBasedAchievement) {
      const wasUnlocked = store.unlock(ruleBasedAchievement);
      if (wasUnlocked) {
        setAchievements(store.getAll());
        setLatestAchievement(ruleBasedAchievement);
        return;
      }
    }
    
    // Then, check with LLM (async, more complex patterns)
    // This will be implemented when LLM integration is ready
    try {
      const llmAchievement = await detectPatternWithLLM(prompt, currentAchievements);
      if (llmAchievement) {
        const wasUnlocked = store.unlock(llmAchievement);
        if (wasUnlocked) {
          setAchievements(store.getAll());
          setLatestAchievement(llmAchievement);
        }
      }
    } catch (e) {
      console.warn('LLM achievement detection failed:', e);
    }
  }, [store]);
  
  const dismissLatest = useCallback(() => {
    setLatestAchievement(null);
  }, []);
  
  const openPanel = useCallback(() => {
    setShowPanel(true);
  }, []);
  
  const closePanel = useCallback(() => {
    setShowPanel(false);
  }, []);
  
  const clearAll = useCallback(() => {
    store.clear();
    setAchievements([]);
    setLatestAchievement(null);
  }, [store]);
  
  return {
    achievements,
    latestAchievement,
    showPanel,
    checkAchievements,
    dismissLatest,
    openPanel,
    closePanel,
    clearAll,
    unlockedCount: achievements.length,
  };
};
