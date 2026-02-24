// Guide Overlay - Beautiful gamified onboarding UI with spotlight

import React, { useEffect, useState, useRef } from 'react';
import { GuideState, GuideProgress, BADGES } from './GuideSystem';
import { Sparkles } from 'lucide-react';

interface GuideOverlayProps {
  guideState: GuideState;
  onComplete: () => void;
  onSkip: () => void;
}

export const GuideOverlay: React.FC<GuideOverlayProps> = ({
  guideState,
  onComplete,
  onSkip,
}) => {
  const [progress, setProgress] = useState<GuideProgress>(guideState.getProgress());
  const [showBadgeToast, setShowBadgeToast] = useState<string | null>(null);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [dragProgress, setDragProgress] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  const currentStep = guideState.getCurrentStep();
  const totalSteps = guideState.getSteps().length;

  useEffect(() => {
    const unsubscribe = guideState.subscribe((newProgress) => {
      setProgress(newProgress);

      // Show badge toast if new badge earned
      if (newProgress.badges.length > progress.badges.length) {
        const newBadge = newProgress.badges[newProgress.badges.length - 1];
        setShowBadgeToast(newBadge);
        setTimeout(() => setShowBadgeToast(null), 2000);
      }
    });

    return unsubscribe;
  }, [guideState, progress.badges.length]);

  useEffect(() => {
    if (!currentStep?.targetSelector) {
      setSpotlightRect(null);
      return;
    }

    const element = document.querySelector(currentStep.targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setSpotlightRect(rect);
    } else {
      setSpotlightRect(null);
    }
  }, [currentStep]);

  const handleNext = () => {
    const hasMore = guideState.nextStep();
    if (!hasMore) {
      onComplete();
    }
  };

  const handleBack = () => {
    guideState.previousStep();
  };

  const handleSkip = () => {
    guideState.skipToEnd();
    onSkip();
  };

  if (!currentStep) return null;

  const progressPercent = ((progress.currentStep + 1) / totalSteps) * 100;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] pointer-events-none"
      style={{
        background: spotlightRect
          ? `radial-gradient(circle at ${spotlightRect.left + spotlightRect.width / 2}px ${spotlightRect.top + spotlightRect.height / 2}px, transparent ${Math.max(spotlightRect.width, spotlightRect.height) / 2 + 20}px, rgba(0, 0, 0, 0.6) ${Math.max(spotlightRect.width, spotlightRect.height) / 2 + 120}px)`
          : 'rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Spotlight border */}
      {spotlightRect && (
        <div
          className="absolute border-2 border-cyan-400/60 rounded-lg pointer-events-none transition-all duration-300 animate-pulse"
          style={{
            left: spotlightRect.left - 8,
            top: spotlightRect.top - 8,
            width: spotlightRect.width + 16,
            height: spotlightRect.height + 16,
            boxShadow: '0 0 30px rgba(6, 182, 212, 0.4)',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: spotlightRect
            ? Math.min(window.innerWidth - 360, Math.max(20, spotlightRect.left + spotlightRect.width / 2 - 160))
            : '50%',
          top: spotlightRect && spotlightRect.bottom + 240 < window.innerHeight
            ? spotlightRect.bottom + 20
            : spotlightRect
            ? Math.max(80, spotlightRect.top - 200)
            : '50%',
          transform: spotlightRect ? 'none' : 'translate(-50%, -50%)',
        }}
      >
        <div className="w-80 bg-black/90 backdrop-blur-xl border border-cyan-500/20 rounded-xl shadow-2xl shadow-cyan-500/10">
          {/* XP Bar */}
          <div className="h-1 bg-white/5 rounded-t-xl overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-white text-base font-medium mb-1 leading-tight">
                  {currentStep.title}
                </h3>
                <div className="flex items-center gap-2 text-cyan-400/70 text-[10px] uppercase tracking-wider font-light">
                  <span>Passo {progress.currentStep + 1} de {totalSteps}</span>
                </div>
              </div>
              
              {/* Progress dots */}
              <div className="flex gap-1 ml-3 mt-1">
                {Array.from({ length: Math.min(totalSteps, 8) }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i <= progress.currentStep ? 'bg-cyan-400' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Body */}
            <p className="text-white/70 text-sm leading-relaxed">
              {currentStep.copy}
            </p>

            {/* Action hint */}
            {currentStep.actionType !== 'finish' && (
              <div className="flex items-center gap-2 p-2 bg-cyan-500/5 border border-cyan-500/20 rounded text-cyan-400/80 text-[10px] uppercase tracking-wide">
                <Sparkles className="w-3 h-3 flex-shrink-0" />
                {currentStep.actionType === 'drag' && 'Experimente arrastar, depois continue'}
                {currentStep.actionType === 'observe' && 'Observe por um momento'}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              {progress.currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-[10px] uppercase tracking-wider text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 rounded-lg transition-all"
                >
                  Voltar
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-2 text-[10px] uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 rounded-lg transition-all font-medium shadow-lg shadow-cyan-500/20"
              >
                {currentStep.actionType === 'finish' ? '🚀 Começar' : 'Próximo →'}
              </button>
              
              {progress.currentStep < totalSteps - 1 && (
                <button
                  onClick={handleSkip}
                  className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/30 hover:text-white/50 transition-all"
                >
                  Pular
                </button>
              )}
            </div>

            {/* XP display */}
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
              <div className="text-[10px] text-white/40 uppercase tracking-wide">
                XP de Insight
              </div>
              <div className="text-sm text-cyan-400 font-mono font-medium">
                {progress.xp}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Badge toast */}
      {showBadgeToast && BADGES[showBadgeToast] && (
        <div className="fixed top-20 right-6 pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 backdrop-blur-xl border border-cyan-400/40 rounded-lg px-4 py-3 shadow-xl shadow-cyan-500/20">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{BADGES[showBadgeToast].icon}</div>
              <div>
                <div className="text-cyan-400 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Emblema Conquistado
                </div>
                <div className="text-white text-sm font-medium">
                  {BADGES[showBadgeToast].name}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
