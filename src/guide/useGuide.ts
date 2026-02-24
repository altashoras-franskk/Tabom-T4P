// useGuide - Main hook for guide system integration

import { useState, useEffect, useRef } from 'react';
import { GuideState, hasCompletedGuide, markGuideCompleted, resetGuideCompletion } from './GuideSystem';
import { AppAdapter } from './adapters/metalifelabAdapter';
import { createGuideJourney } from './guideJourney';

export type GuideMode = 'welcome' | 'active' | 'hidden';

export interface UseGuideResult {
  mode: GuideMode;
  guideState: GuideState | null;
  startGuide: () => void;
  skipGuide: () => void;
  restartGuide: () => void;
  hideGuide: () => void;
}

export const useGuide = (adapter: AppAdapter): UseGuideResult => {
  const [mode, setMode] = useState<GuideMode>('hidden');
  const guideStateRef = useRef<GuideState | null>(null);

  useEffect(() => {
    // Guide stays hidden — user can trigger it manually
  }, []);

  const startGuide = () => {
    if (!guideStateRef.current) {
      const steps = createGuideJourney(adapter);
      guideStateRef.current = new GuideState(steps);
    } else {
      guideStateRef.current.reset();
    }
    setMode('active');
  };

  const skipGuide = () => {
    markGuideCompleted();
    setMode('hidden');
  };

  const restartGuide = () => {
    resetGuideCompletion();
    if (guideStateRef.current) {
      guideStateRef.current.reset();
    }
    startGuide();
  };

  const hideGuide = () => {
    setMode('hidden');
  };

  return {
    mode,
    guideState: guideStateRef.current,
    startGuide,
    skipGuide,
    restartGuide,
    hideGuide,
  };
};
