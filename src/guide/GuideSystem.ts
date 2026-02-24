// Guide System - Core types and logic for interactive onboarding

export type ActionType = 'click' | 'toggle' | 'drag' | 'wait' | 'observe' | 'finish';

export interface GuideStep {
  id: string;
  title: string;
  copy: string;
  targetSelector?: string | null; // null if generic/fallback
  actionType: ActionType;
  completionCondition?: () => boolean;
  onEnter?: () => void;
  onExit?: () => void;
  rewardBadge?: string;
  waitDuration?: number; // ms for 'wait' type
  skipIfUnavailable?: boolean; // Skip step if target doesn't exist
}

export interface GuideBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface GuideProgress {
  currentStep: number;
  completedSteps: Set<string>;
  xp: number;
  badges: string[];
  startTime: number;
}

export const BADGES: Record<string, GuideBadge> = {
  observer: {
    id: 'observer',
    name: 'Observador',
    icon: '👁️',
    description: 'Você vê os agentes',
  },
  field_whisperer: {
    id: 'field_whisperer',
    name: 'Sussurrador de Campos',
    icon: '🌊',
    description: 'Você revelou o invisível',
  },
  pattern_hunter: {
    id: 'pattern_hunter',
    name: 'Caçador de Padrões',
    icon: '🔍',
    description: 'Você entende a emergência',
  },
  butterfly_hand: {
    id: 'butterfly_hand',
    name: 'Mão Borboleta',
    icon: '🦋',
    description: 'Seu gesto mudou o destino',
  },
  worldsmith: {
    id: 'worldsmith',
    name: 'Forjador de Mundos',
    icon: '⚡',
    description: 'Você comanda universos',
  },
};

export class GuideState {
  private progress: GuideProgress;
  private steps: GuideStep[];
  private listeners: Set<(progress: GuideProgress) => void> = new Set();

  constructor(steps: GuideStep[]) {
    this.steps = steps;
    this.progress = {
      currentStep: 0,
      completedSteps: new Set(),
      xp: 0,
      badges: [],
      startTime: Date.now(),
    };
  }

  getSteps(): GuideStep[] {
    return this.steps;
  }

  getCurrentStep(): GuideStep | null {
    return this.steps[this.progress.currentStep] || null;
  }

  getProgress(): GuideProgress {
    return { ...this.progress, completedSteps: new Set(this.progress.completedSteps) };
  }

  nextStep(): boolean {
    const currentStep = this.getCurrentStep();
    if (currentStep) {
      this.progress.completedSteps.add(currentStep.id);
      this.progress.xp += 10;

      if (currentStep.rewardBadge && !this.progress.badges.includes(currentStep.rewardBadge)) {
        this.progress.badges.push(currentStep.rewardBadge);
      }

      if (currentStep.onExit) {
        currentStep.onExit();
      }
    }

    if (this.progress.currentStep < this.steps.length - 1) {
      this.progress.currentStep++;
      const nextStep = this.getCurrentStep();
      if (nextStep?.onEnter) {
        nextStep.onEnter();
      }
      this.notifyListeners();
      return true;
    }

    this.notifyListeners();
    return false; // Guide completed
  }

  previousStep(): boolean {
    if (this.progress.currentStep > 0) {
      const currentStep = this.getCurrentStep();
      if (currentStep?.onExit) {
        currentStep.onExit();
      }

      this.progress.currentStep--;
      const prevStep = this.getCurrentStep();
      if (prevStep?.onEnter) {
        prevStep.onEnter();
      }
      this.notifyListeners();
      return true;
    }
    return false;
  }

  skipToEnd(): void {
    this.progress.currentStep = this.steps.length;
    this.notifyListeners();
  }

  reset(): void {
    this.progress = {
      currentStep: 0,
      completedSteps: new Set(),
      xp: 0,
      badges: [],
      startTime: Date.now(),
    };
    this.notifyListeners();
  }

  subscribe(listener: (progress: GuideProgress) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const progress = this.getProgress();
    this.listeners.forEach(listener => listener(progress));
  }
}

// Persistence helpers
const STORAGE_KEY = 'metalife_guide_completed_v1';

export const hasCompletedGuide = (): boolean => {
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

export const markGuideCompleted = (): void => {
  localStorage.setItem(STORAGE_KEY, 'true');
};

export const resetGuideCompletion = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
