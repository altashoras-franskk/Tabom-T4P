import React, { useEffect, useState } from 'react';
import { GuideState, GuideProgress, BADGES } from './GuideSystem';
import { motion, AnimatePresence } from 'motion/react';

interface GuideOverlayProps {
  guideState: GuideState;
  onComplete: () => void;
  onSkip: () => void;
}

const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";
const ACCENT = '#ffd400';

export const GuideOverlay: React.FC<GuideOverlayProps> = ({
  guideState,
  onComplete,
  onSkip,
}) => {
  const [progress, setProgress] = useState<GuideProgress>(guideState.getProgress());
  const [showBadge, setShowBadge] = useState<string | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const currentStep = guideState.getCurrentStep();
  const totalSteps = guideState.getSteps().length;

  useEffect(() => {
    const unsubscribe = guideState.subscribe((newProgress) => {
      setProgress(newProgress);
      if (newProgress.badges.length > progress.badges.length) {
        const badge = newProgress.badges[newProgress.badges.length - 1];
        setShowBadge(badge);
        setTimeout(() => setShowBadge(null), 2400);
      }
    });
    return unsubscribe;
  }, [guideState, progress.badges.length]);

  useEffect(() => {
    if (!currentStep?.targetSelector) {
      setTargetRect(null);
      return;
    }
    try {
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    } catch (err) {
      console.error('[GuideOverlay] target rect failed', err);
      setTargetRect(null);
    }
  }, [currentStep]);

  const handleNext = () => {
    const hasMore = guideState.nextStep();
    if (!hasMore) onComplete();
  };

  const handleBack = () => {
    guideState.previousStep();
  };

  const handleSkip = () => {
    guideState.skipToEnd();
    onSkip();
  };

  if (!currentStep) return null;

  const pct = ((progress.currentStep + 1) / totalSteps) * 100;
  const isLast = currentStep.actionType === 'finish';

  return (
    <>
      {/* Subtle target indicator — dashed ring instead of spotlight */}
      {targetRect && (
        <div
          style={{
            position: 'fixed', zIndex: 99, pointerEvents: 'none',
            left: targetRect.left - 6,
            top: targetRect.top - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            border: `1px dashed ${ACCENT}50`,
            transition: 'all 0.4s ease',
          }}
        />
      )}

      {/* Guide panel — bottom-left, non-invasive */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, y: 12, x: 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{
              position: 'fixed', bottom: 20, left: 20, zIndex: 100,
              width: 320, maxWidth: 'calc(100vw - 40px)',
              background: 'rgba(0,0,0,0.96)',
              border: '1px dashed rgba(255,255,255,0.08)',
              pointerEvents: 'auto',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Progress bar */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: `linear-gradient(90deg, ${ACCENT}60, ${ACCENT})`,
                transition: 'width 0.5s ease',
              }} />
            </div>

            <div style={{ padding: '16px 18px 14px' }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                marginBottom: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontFamily: DOTO, fontSize: 14, fontWeight: 400,
                    color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase',
                    letterSpacing: '0.06em', margin: 0, lineHeight: 1.2,
                  }}>
                    {currentStep.title}
                  </h3>
                  <div style={{
                    fontFamily: MONO, fontSize: 8, color: `${ACCENT}70`,
                    letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 4,
                  }}>
                    {progress.currentStep + 1} / {totalSteps}
                  </div>
                </div>

                {/* Step dots */}
                <div style={{ display: 'flex', gap: 3, marginTop: 4, flexShrink: 0 }}>
                  {Array.from({ length: Math.min(totalSteps, 10) }).map((_, i) => (
                    <div key={i} style={{
                      width: 4, height: 4,
                      background: i <= progress.currentStep
                        ? (i === progress.currentStep ? ACCENT : `${ACCENT}60`)
                        : 'rgba(255,255,255,0.08)',
                      transition: 'all 0.3s',
                    }} />
                  ))}
                </div>
              </div>

              {/* Body */}
              <p style={{
                fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.7, margin: '0 0 14px 0', textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}>
                {currentStep.copy}
              </p>

              {/* Action hint */}
              {!isLast && currentStep.actionType !== 'observe' && (
                <div style={{
                  fontFamily: MONO, fontSize: 8,
                  color: `${ACCENT}60`, letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: 12,
                  paddingTop: 8, borderTop: '1px dashed rgba(255,255,255,0.04)',
                }}>
                  {currentStep.actionType === 'drag' && '↗ Experimente arrastar no canvas'}
                </div>
              )}

              {/* Buttons */}
              <div style={{
                display: 'flex', gap: 6, alignItems: 'center',
                paddingTop: 10, borderTop: '1px dashed rgba(255,255,255,0.06)',
              }}>
                {progress.currentStep > 0 && (
                  <button onClick={handleBack} style={{
                    padding: '6px 12px', background: 'none',
                    border: '1px dashed rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.3)', fontFamily: MONO, fontSize: 8,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    ←
                  </button>
                )}

                <button onClick={handleNext} style={{
                  flex: 1, padding: '7px 0',
                  background: isLast ? `${ACCENT}12` : 'rgba(255,255,255,0.03)',
                  border: `1px dashed ${isLast ? `${ACCENT}35` : 'rgba(255,255,255,0.08)'}`,
                  color: isLast ? `${ACCENT}e0` : 'rgba(255,255,255,0.55)',
                  fontFamily: MONO, fontSize: 9,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {isLast ? 'Começar' : 'Próximo →'}
                </button>

                {!isLast && (
                  <button onClick={handleSkip} style={{
                    padding: '6px 10px', background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.15)', fontFamily: MONO, fontSize: 8,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    Pular
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed state — minimal pill */}
      {collapsed && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setCollapsed(false)}
          style={{
            position: 'fixed', bottom: 20, left: 20, zIndex: 100,
            padding: '6px 14px', background: 'rgba(0,0,0,0.92)',
            border: `1px dashed ${ACCENT}30`, cursor: 'pointer',
            fontFamily: MONO, fontSize: 8, color: `${ACCENT}80`,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 10 }}>🝛</span>
          Guia {progress.currentStep + 1}/{totalSteps}
        </motion.button>
      )}

      {/* Collapse toggle — on panel header */}
      {!collapsed && (
        <button
          onClick={() => setCollapsed(true)}
          style={{
            position: 'fixed', bottom: 20 + 1, left: 320 + 20 - 22, zIndex: 101,
            width: 18, height: 18,
            background: 'rgba(0,0,0,0.96)', border: '1px dashed rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.2)', fontSize: 8,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: MONO,
          }}
          title="Minimizar guia"
        >
          ▾
        </button>
      )}

      {/* Badge toast — subtle */}
      <AnimatePresence>
        {showBadge && BADGES[showBadge] && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed', bottom: 80, left: 20, zIndex: 102,
              background: 'rgba(0,0,0,0.96)',
              border: `1px dashed ${ACCENT}25`,
              padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <span style={{ fontSize: 18 }}>{BADGES[showBadge].icon}</span>
            <div>
              <div style={{
                fontFamily: MONO, fontSize: 7, color: `${ACCENT}70`,
                letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 2,
              }}>
                Emblema
              </div>
              <div style={{
                fontFamily: DOTO, fontSize: 12, color: 'rgba(255,255,255,0.7)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {BADGES[showBadge].name}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
