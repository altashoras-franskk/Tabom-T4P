import { useState, useEffect, useRef } from 'react';
import { LoopMetrics } from '../sim/fieldLayers/loops';
import { DraggableWindow } from './DraggableWindow';
import { WorldEvent } from '../story/worldLog';

type ChallengeState = {
  stabilize: { active: boolean; progress: number; unlocked: boolean };
  oscillate: { active: boolean; progress: number; unlocked: boolean; crossings: number };
  recover: { active: boolean; progress: number; unlocked: boolean; triggered: boolean };
};

type ChallengesProps = {
  loops: LoopMetrics | null;
  currentTime: number; // sim time in seconds
  pushEvent?: (e: Omit<WorldEvent, 'id'|'ts'>) => void;
  visible?: boolean;
};

export const Challenges = ({ loops, currentTime, pushEvent, visible = true }: ChallengesProps) => {
  const [state, setState] = useState<ChallengeState>({
    stabilize: { active: true, progress: 0, unlocked: false },
    oscillate: { active: true, progress: 0, unlocked: false, crossings: 0 },
    recover: { active: true, progress: 0, unlocked: false, triggered: false },
  });

  const timerRef = useRef({ stabilize: 0, oscillate: 0, recover: 0 });
  const lastVolatilityRef = useRef(0);
  const oscillateStartTimeRef = useRef(0);
  const lastUpdateTsRef = useRef(performance.now());

  useEffect(() => {
    if (!loops) return;

    // Calculate real dt
    const now = performance.now();
    const dt = (now - lastUpdateTsRef.current) / 1000; // seconds
    lastUpdateTsRef.current = now;

    const v = loops.volatility;
    const lastV = lastVolatilityRef.current;

    setState(prev => {
      const next = { ...prev };

      // STABILIZE: volatility < 0.30 for 8s
      if (!next.stabilize.unlocked) {
        if (v < 0.30) {
          timerRef.current.stabilize += dt;
          next.stabilize.progress = Math.min(1, timerRef.current.stabilize / 8);
          if (timerRef.current.stabilize >= 8 && !prev.stabilize.unlocked) {
            next.stabilize.unlocked = true;
            pushEvent?.({
              t: currentTime,
              type: 'challenge',
              title: 'Challenge Unlocked: STABILIZE',
              sigil: '◎',
              detail: 'Maintained low volatility (<0.30) for 8 seconds',
              meta: { challenge: 'stabilize', volatility: v, duration: 8 }
            });
          }
        } else {
          timerRef.current.stabilize = 0;
          next.stabilize.progress = 0;
        }
      }

      // OSCILLATE: cross 0.35 threshold 3 times in 25s
      if (!next.oscillate.unlocked) {
        // Initialize start time if needed
        if (oscillateStartTimeRef.current === 0) {
          oscillateStartTimeRef.current = currentTime;
        }

        const elapsed = currentTime - oscillateStartTimeRef.current;
        
        // Detect threshold crossing
        if ((lastV < 0.35 && v >= 0.35) || (lastV > 0.35 && v <= 0.35)) {
          next.oscillate.crossings = (next.oscillate.crossings || 0) + 1;
        }

        // Reset window after 25s
        if (elapsed > 25) {
          oscillateStartTimeRef.current = currentTime;
          next.oscillate.crossings = 0;
        }

        next.oscillate.progress = Math.min(1, (next.oscillate.crossings || 0) / 3);
        
        if ((next.oscillate.crossings || 0) >= 3 && !prev.oscillate.unlocked) {
          next.oscillate.unlocked = true;
          pushEvent?.({
            t: currentTime,
            type: 'challenge',
            title: 'Challenge Unlocked: OSCILLATE',
            sigil: '~',
            detail: 'Crossed volatility threshold (0.35) 3 times in 25 seconds',
            meta: { challenge: 'oscillate', crossings: 3, elapsed }
          });
        }
      }

      // RECOVER: after volatility > 0.65, return to < 0.40 within 18s
      if (!next.recover.unlocked) {
        if (v > 0.65 && !next.recover.triggered) {
          next.recover.triggered = true;
          timerRef.current.recover = 0;
        }

        if (next.recover.triggered) {
          timerRef.current.recover += dt;
          
          if (v < 0.40 && !prev.recover.unlocked) {
            next.recover.unlocked = true;
            next.recover.progress = 1;
            pushEvent?.({
              t: currentTime,
              type: 'challenge',
              title: 'Challenge Unlocked: RECOVER',
              sigil: '->',
              detail: `Recovered from volatility spike in ${timerRef.current.recover.toFixed(1)}s`,
              meta: { challenge: 'recover', recoveryTime: timerRef.current.recover }
            });
          } else if (timerRef.current.recover > 18) {
            // Failed - reset
            next.recover.triggered = false;
            next.recover.progress = 0;
            timerRef.current.recover = 0;
          } else {
            next.recover.progress = Math.min(1, timerRef.current.recover / 18);
          }
        }
      }

      return next;
    });

    lastVolatilityRef.current = v;
  }, [loops, currentTime, pushEvent]);

  if (!visible) return null;

  const totalUnlocked = [state.stabilize, state.oscillate, state.recover].filter(c => c.unlocked).length;

  return (
    <DraggableWindow
      title="Challenges"
      initialX={window.innerWidth - 340}
      initialY={80}
      width={320}
    >
      <div className="p-3 space-y-3">
        <div className="text-white/60 text-[10px] leading-relaxed">
          Master emergence through volatility control. Unlocked: {totalUnlocked}/3
        </div>

        {/* STABILIZE */}
        <div className={`p-3 rounded border ${state.stabilize.unlocked ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-white/60 font-mono text-[11px]">[I]</span>
              <span className="text-white/90 text-xs font-medium">STABILIZE</span>
            </div>
            {state.stabilize.unlocked && <span className="text-green-400 text-xs">✓</span>}
          </div>
          <div className="text-white/50 text-[10px] mb-2">
            Keep volatility below 0.30 for 8 seconds
          </div>
          <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-200"
              style={{ width: `${state.stabilize.progress * 100}%` }}
            />
          </div>
          <div className="text-white/40 text-[9px] mt-1">
            {(state.stabilize.progress * 8).toFixed(1)}s / 8s
          </div>
        </div>

        {/* OSCILLATE */}
        <div className={`p-3 rounded border ${state.oscillate.unlocked ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-white/60 font-mono text-[11px]">[~]</span>
              <span className="text-white/90 text-xs font-medium">OSCILLATE</span>
            </div>
            {state.oscillate.unlocked && <span className="text-green-400 text-xs">✓</span>}
          </div>
          <div className="text-white/50 text-[10px] mb-2">
            Cross volatility 0.35 threshold 3 times in 25s
          </div>
          <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
              style={{ width: `${state.oscillate.progress * 100}%` }}
            />
          </div>
          <div className="text-white/40 text-[9px] mt-1">
            Crossings: {state.oscillate.crossings} / 3
          </div>
        </div>

        {/* RECOVER */}
        <div className={`p-3 rounded border ${state.recover.unlocked ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-white/60 font-mono text-[11px]">[+]</span>
              <span className="text-white/90 text-xs font-medium">RECOVER</span>
            </div>
            {state.recover.unlocked && <span className="text-green-400 text-xs">✓</span>}
          </div>
          <div className="text-white/50 text-[10px] mb-2">
            After spike &gt;0.65, recover to &lt;0.40 within 18s
          </div>
          {state.recover.triggered ? (
            <>
              <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-yellow-500 transition-all duration-200"
                  style={{ width: `${state.recover.progress * 100}%` }}
                />
              </div>
              <div className="text-white/40 text-[9px] mt-1">
                {(timerRef.current.recover).toFixed(1)}s / 18s
              </div>
            </>
          ) : (
            <div className="text-white/30 text-[10px] italic">
              Waiting for volatility spike...
            </div>
          )}
        </div>

        {totalUnlocked === 3 && (
          <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-center">
            <div className="text-yellow-400 text-xs font-medium">All Challenges Complete</div>
            <div className="text-white/50 text-[9px] mt-0.5">Master of Emergence</div>
          </div>
        )}
      </div>
    </DraggableWindow>
  );
};