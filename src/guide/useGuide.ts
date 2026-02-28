// useGuide - Main hook for guide system integration

import { useState, useEffect, useRef } from 'react';
import { GuideState, hasCompletedGuide, markGuideCompleted, resetGuideCompletion } from './GuideSystem';
import { AppAdapter } from './adapters/metalifelabAdapter';
import { createGuideJourney } from './guideJourney';
import type { GuideStep } from './GuideSystem';

export type GuideMode = 'welcome' | 'active' | 'hidden';

export interface UseGuideResult {
  mode: GuideMode;
  guideState: GuideState | null;
  startGuide: () => void;
  skipGuide: () => void;
  restartGuide: () => void;
  hideGuide: () => void;
}

/** Optional: return steps from a factory (e.g. createEmergenceGuideJourney) so the guide uses translated 3-step experiment. */
export const useGuide = (
  adapter: AppAdapter,
  stepFactory?: (adapter: AppAdapter) => GuideStep[]
): UseGuideResult => {
  const [mode, setMode] = useState<GuideMode>('hidden');
  const guideStateRef = useRef<GuideState | null>(null);

  useEffect(() => {
    // Guide stays hidden — user can trigger it manually
  }, []);

  const startGuide = () => {
    try {
      const steps = stepFactory ? stepFactory(adapter) : createGuideJourney(adapter);
      if (!Array.isArray(steps) || steps.length === 0) {
        guideStateRef.current = new GuideState([{ id: 'noop', title: 'Guide', copy: '', targetSelector: null, actionType: 'finish' }]);
      } else {
        guideStateRef.current = new GuideState(steps);
      }
      setMode('active');
    } catch (err) {
      console.error('[Guide] startGuide failed', err);
      try {
        guideStateRef.current = new GuideState(createGuideJourney(adapter));
        setMode('active');
      } catch (e2) {
        console.error('[Guide] fallback createGuideJourney failed', e2);
      }
    }
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
