// ── Asimov Theater — Timeline Component ──────────────────────────────────────
import React, { useRef, useEffect } from 'react';
import { HistoricalFrame, PHASE_COLORS, PHASE_LABELS_PT, PhaseLabel } from '../../sim/asimov/asimovTypes';

interface TimelineProps {
  frames: HistoricalFrame[];
  selected: number | null;
  onSelect: (index: number) => void;
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, width: 30, flexShrink: 0 }}>{label}</span>
      <div style={{
        flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${value * 100}%`, height: '100%',
          background: color, borderRadius: 2, transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}

export const Timeline: React.FC<TimelineProps> = ({ frames, selected, onSelect }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [frames.length]);

  if (frames.length === 0) {
    return (
      <div style={{ padding: '16px 12px', color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
        Aguardando primeira cena...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 6px', overflowY: 'auto', maxHeight: '100%' }}>
      {frames.map((frame, idx) => {
        const isSelected = selected === idx;
        const phaseColor = PHASE_COLORS[frame.phaseLabel] ?? '#ffffff';
        const isAct = !!frame.isAct;

        return (
          <div
            key={idx}
            onClick={() => onSelect(idx)}
            style={{
              padding: '8px 10px',
              borderRadius: 5,
              cursor: 'pointer',
              background: isSelected
                ? 'rgba(255,255,255,0.07)'
                : 'rgba(255,255,255,0.025)',
              border: `1px solid ${isSelected
                ? phaseColor + '55'
                : 'rgba(255,255,255,0.05)'}`,
              transition: 'all 0.15s',
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              {isAct && (
                <span style={{
                  fontSize: 8, padding: '1px 4px', borderRadius: 3,
                  background: 'rgba(255,200,90,0.18)', color: '#ffce5a',
                  textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
                }}>
                  Ato
                </span>
              )}
              <span style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 3,
                background: phaseColor + '22', color: phaseColor,
                textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
              }}>
                {PHASE_LABELS_PT[frame.phaseLabel]}
              </span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>
                A{frame.act}·C{frame.scene}
              </span>
            </div>

            {/* Headline */}
            <p style={{
              fontSize: 10.5, color: 'rgba(255,255,255,0.82)',
              lineHeight: 1.35, marginBottom: 4, margin: '0 0 5px',
            }}>
              {frame.headline}
            </p>

            {/* Causal */}
            <p style={{
              fontSize: 9.5, color: 'rgba(255,255,255,0.45)',
              fontStyle: 'italic', lineHeight: 1.3, margin: '0 0 6px',
            }}>
              {frame.causal}
            </p>

            {/* Mini metric bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <MetricBar label="Cnflto" value={frame.metrics.conflictRate} color="#ff5a5a" />
              <MetricBar label="Desig" value={frame.metrics.inequality} color="#ffce5a" />
              <MetricBar label="Legit" value={frame.metrics.legitimacyMean} color="#5aff8a" />
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
