// MetaLifeLab Adapter - Connects guide system to MetaLifeLab app

export interface AppAdapter {
  // Selectors - return null if not available
  selectors: {
    playButton: string | null;
    speedControl: string | null;
    seedButton: string | null;
    presetsPanel: string | null;
    overlayField: string | null;
    overlayTrails: string | null;
    overlayInstitutions: string | null;
    canvas: string | null;
    newUniverseButton: string | null;
  };

  // Actions - return false if not available
  actions: {
    setSpeed: (speed: number) => boolean;
    pause: () => boolean;
    resume: () => boolean;
    toggleOverlay: (name: 'field' | 'trails' | 'institutions', enabled: boolean) => boolean;
    applyPreset: (presetId: string) => boolean;
    newUniverse: () => boolean;
    isOverlayEnabled: (name: 'field' | 'trails' | 'institutions') => boolean;
    getSpeed: () => number;
    isPaused: () => boolean;
  };

  // State queries
  canvasInteractionDetector: {
    startListening: (callback: (distance: number) => void) => () => void;
  };
}

export const createMetaLifeLabAdapter = (
  appContext: {
    setFieldHeatmap?: (enabled: boolean) => void;
    setTrails?: (enabled: boolean) => void;
    fieldHeatmap?: boolean;
    trails?: boolean;
    onSpeedChange?: (speed: number) => void;
    isPaused?: () => boolean;
    onPauseToggle?: () => void;
    onNewUniverse?: () => void;
    onApplyRecipe?: (recipe: string) => void;
    timeSpeed?: number;
    canvasRef?: React.RefObject<HTMLCanvasElement>;
  }
): AppAdapter => {
  return {
    selectors: {
      playButton: '[data-guide="play-button"]',
      speedControl: '[data-guide="speed-control"]',
      seedButton: '[data-guide="seed-button"]',
      presetsPanel: '[data-guide="presets-panel"]',
      overlayField: '[data-guide="overlay-field"]',
      overlayTrails: '[data-guide="overlay-trails"]',
      overlayInstitutions: null, // Not available in MetaLifeLab
      canvas: 'canvas',
      newUniverseButton: '[data-guide="new-universe"]',
    },

    actions: {
      setSpeed: (speed: number) => {
        if (appContext.onSpeedChange) {
          appContext.onSpeedChange(speed);
          return true;
        }
        return false;
      },

      pause: () => {
        if (appContext.onPauseToggle && !appContext.isPaused?.()) {
          appContext.onPauseToggle();
          return true;
        }
        return false;
      },

      resume: () => {
        if (appContext.onPauseToggle && appContext.isPaused?.()) {
          appContext.onPauseToggle();
          return true;
        }
        return false;
      },

      toggleOverlay: (name, enabled) => {
        if (name === 'field' && appContext.setFieldHeatmap) {
          appContext.setFieldHeatmap(enabled);
          return true;
        }
        if (name === 'trails' && appContext.setTrails) {
          appContext.setTrails(enabled);
          return true;
        }
        return false;
      },

      applyPreset: (presetId) => {
        if (appContext.onApplyRecipe) {
          appContext.onApplyRecipe(presetId);
          return true;
        }
        return false;
      },

      newUniverse: () => {
        if (appContext.onNewUniverse) {
          appContext.onNewUniverse();
          return true;
        }
        return false;
      },

      isOverlayEnabled: (name) => {
        if (name === 'field') return appContext.fieldHeatmap ?? false;
        if (name === 'trails') return appContext.trails ?? false;
        return false;
      },

      getSpeed: () => appContext.timeSpeed ?? 1,

      isPaused: () => appContext.isPaused?.() ?? false,
    },

    canvasInteractionDetector: {
      startListening: (callback) => {
        const canvas = appContext.canvasRef?.current;
        if (!canvas) return () => {};

        let startX = 0;
        let startY = 0;
        let isDragging = false;

        const handlePointerDown = (e: PointerEvent) => {
          startX = e.clientX;
          startY = e.clientY;
          isDragging = true;
        };

        const handlePointerMove = (e: PointerEvent) => {
          if (!isDragging) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          callback(distance);
        };

        const handlePointerUp = () => {
          isDragging = false;
        };

        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);

        return () => {
          canvas.removeEventListener('pointerdown', handlePointerDown);
          canvas.removeEventListener('pointermove', handlePointerMove);
          canvas.removeEventListener('pointerup', handlePointerUp);
        };
      },
    },
  };
};
