// ── Asimov Theater — Oracle Dashboard (Tiered) ──────────────────────────────
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, Zap, HelpCircle, Brain } from 'lucide-react';
import {
  ForecastResult, PHASE_COLORS, PHASE_LABELS_PT, PhaseLabel,
  MetricsVector, AutoCompareResult,
} from '../../sim/asimov/asimovTypes';
import { DriverChip, computeDrivers, jiangPhrase, jiangWhyBullets, computeOracleProbs, OracleProbs } from '../../sim/asimov/asimovJiang';

// ── Props ─────────────────────────────────────────────────────────────────
interface OracleDashboardProps {
  // Current state
  metrics: MetricsVector;
  prevMetrics: MetricsVector | null;
  phase: PhaseLabel;
  // Oracle (auto or deep)
  oracleResult: ForecastResult | null;
  deepResult: ForecastResult | null;
  isAutoRunning: boolean;
  isDeepRunning: boolean;
  deepProgress: number; // 0..1
  // Jiang lens
  jiangEnabled: boolean;
  onToggleJiang: () => void;
  // Deep forecast
  onRunDeep: () => void;
  // Auto-compare delta
  autoCompare: AutoCompareResult | null;
  autoCompareVisible: boolean;
  // Mule
  muleActive: boolean;
}

// ── Oracle bar ────────────────────────────────────────────────────────────
function OracleBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 10, color: color + 'cc' }}>{label}</span>
        <span style={{ fontSize: 12, color, fontFamily: 'monospace' }}>
          {Math.round(value * 100)}%
        </span>
      </div>
      <div style={{
        height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.min(100, value * 100)}%`, height: '100%',
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 3, transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

// ── Driver chip ────────────────────────────────────────────────────────────
function DriverChipUI({ chip }: { chip: DriverChip }) {
  const arrow = chip.direction === 'up' ? '\u2191' : chip.direction === 'down' ? '\u2193'
    : chip.direction === 'high' ? '\u25B2' : '\u25BC';
  return (
    <span style={{
      fontSize: 9, padding: '2px 6px', borderRadius: 4,
      background: chip.color + '18', color: chip.color,
      display: 'inline-flex', alignItems: 'center', gap: 2,
      border: `1px solid ${chip.color}33`,
      whiteSpace: 'nowrap',
    }}>
      {chip.label}{arrow}
    </span>
  );
}

// ── Auto-compare delta strip ──────────────────────────────────────────────
function DeltaStrip({ compare }: { compare: AutoCompareResult }) {
  const { withAct, withoutAct, cardId } = compare;
  const oWith = computeOracleProbs(withAct.probability);
  const oWithout = computeOracleProbs(withoutAct.probability);
  const deltas = [
    { label: 'Order', val: oWith.order - oWithout.order, color: '#5aff8a' },
    { label: 'Conflict', val: oWith.conflict - oWithout.conflict, color: '#ff9a3c' },
    { label: 'Crisis', val: oWith.crisis - oWithout.crisis, color: '#ff5a5a' },
  ].filter(d => Math.abs(d.val) > 0.01);

  if (deltas.length === 0) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
      background: 'rgba(255,206,90,0.06)', borderRadius: 4,
      border: '1px solid rgba(255,206,90,0.15)',
    }}>
      <Zap size={10} strokeWidth={1.5} color="#ffce5a" />
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
        Delta:
      </span>
      {deltas.map(d => {
        const sign = d.val >= 0 ? '+' : '';
        const isGood = (d.label === 'Order' && d.val > 0) || (d.label !== 'Order' && d.val < 0);
        return (
          <span key={d.label} style={{
            fontSize: 9.5, fontFamily: 'monospace',
            color: isGood ? '#5aff8a' : '#ff8888',
          }}>
            {d.label} {sign}{Math.round(d.val * 100)}%
          </span>
        );
      })}
    </div>
  );
}

// ── Trend line (mini SVG) ──────────────────────────────────────────────────
function TrendLine({
  values, color, width = 100, height = 28,
}: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.01);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinejoin="round" opacity={0.85} />
      <circle
        cx={width}
        cy={height - (values[values.length - 1] / max) * (height - 4) - 2}
        r={2} fill={color}
      />
    </svg>
  );
}

function aggregateTrend(result: ForecastResult, key: 'conflictLine' | 'inequalityLine' | 'legitimacyLine'): number[] {
  const trajs = result.trajectories;
  if (trajs.length === 0) return [];
  const len = trajs[0][key].length;
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    const vals = trajs.map(t => t[key][i] ?? 0);
    out.push(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  return out;
}

// ── Main component ───────────────────────────────────────────────────────
export const OracleDashboard: React.FC<OracleDashboardProps> = ({
  metrics, prevMetrics, phase,
  oracleResult, deepResult,
  isAutoRunning, isDeepRunning, deepProgress,
  jiangEnabled, onToggleJiang,
  onRunDeep,
  autoCompare, autoCompareVisible,
  muleActive,
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);

  // Use deep result if available, otherwise auto
  const bestResult = deepResult ?? oracleResult;
  const oracleProbs: OracleProbs | null = bestResult
    ? computeOracleProbs(bestResult.probability) : null;
  const drivers = computeDrivers(metrics, prevMetrics);
  const phaseColor = PHASE_COLORS[phase];

  const jiangText = jiangEnabled
    ? jiangPhrase(metrics, phase, bestResult) : '';
  const whyBullets = jiangEnabled
    ? jiangWhyBullets(metrics, prevMetrics, bestResult) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, fontSize: 10 }}>

      {/* ═══ TIER A: Always visible compact strip ═══════════════════════ */}
      <div style={{
        padding: '8px 12px',
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.15)',
      }}>
        {/* Phase badge */}
        <span style={{
          fontSize: 9, padding: '2px 7px', borderRadius: 4,
          background: phaseColor + '22', color: phaseColor,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          flexShrink: 0,
        }}>
          {PHASE_LABELS_PT[phase]}
        </span>

        {/* Confidence bar */}
        <div style={{ flex: '0 0 60px' }}>
          <div style={{
            height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              width: `${(bestResult?.confidence ?? 0) * 100}%`, height: '100%',
              background: (bestResult?.confidence ?? 0) > 0.6 ? '#5aff8a'
                : (bestResult?.confidence ?? 0) > 0.3 ? '#ffce5a' : '#ff5a5a',
              borderRadius: 2, transition: 'width 0.5s',
            }} />
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 1, textAlign: 'center' }}>
            Conf {Math.round((bestResult?.confidence ?? 0) * 100)}%
          </div>
        </div>

        {/* Driver chips */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
          {drivers.map((d, i) => <DriverChipUI key={i} chip={d} />)}
        </div>

        {/* Mule badge */}
        {muleActive && (
          <span style={{
            fontSize: 8, padding: '1px 5px', borderRadius: 3,
            background: 'rgba(192,90,255,0.15)', color: '#c05aff',
          }}>
            MULE
          </span>
        )}

        {/* Auto-forecast indicator */}
        {isAutoRunning && (
          <div style={{
            width: 6, height: 6, borderRadius: 3,
            background: '#4a9eff', opacity: 0.7,
            animation: 'pulse 1.2s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* ═══ TIER B: Oracle Strip ════════════════════════════════════════ */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Oracle probability bars */}
        {oracleProbs ? (
          <div style={{ display: 'flex', gap: 10, marginBottom: jiangEnabled ? 6 : 0 }}>
            <OracleBar label="Order" value={oracleProbs.order} color="#5aff8a" />
            <OracleBar label="Conflict" value={oracleProbs.conflict} color="#ff9a3c" />
            <OracleBar label="Crisis" value={oracleProbs.crisis} color="#ff5a5a" />
          </div>
        ) : (
          <div style={{
            padding: '8px 0', color: 'rgba(255,255,255,0.25)', fontSize: 10,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: 3, background: 'rgba(74,158,255,0.4)',
              animation: isAutoRunning ? 'pulse 1.2s ease-in-out infinite' : 'none',
            }} />
            {isAutoRunning ? 'Oraculo calculando...' : 'Oraculo aguardando dados...'}
          </div>
        )}

        {/* Jiang lens one-liner */}
        {jiangEnabled && jiangText && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 6,
            padding: '5px 8px', marginTop: 4,
            background: 'rgba(160,255,238,0.04)',
            borderRadius: 4,
            border: '1px solid rgba(160,255,238,0.12)',
          }}>
            <Brain size={12} strokeWidth={1.5} color="#a0ffee" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 10, color: '#a0ffee', lineHeight: '1.35' }}>
                {jiangText}
              </span>
              <button
                onClick={() => setWhyOpen(v => !v)}
                style={{
                  marginLeft: 6, fontSize: 8, color: 'rgba(160,255,238,0.55)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  textDecoration: 'underline', textUnderlineOffset: 2,
                }}
              >
                {whyOpen ? 'fechar' : 'Why?'}
              </button>
              {whyOpen && whyBullets.length > 0 && (
                <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {whyBullets.map((b, i) => (
                    <div key={i} style={{ fontSize: 9, color: 'rgba(160,255,238,0.5)', lineHeight: 1.3 }}>
                      - {b}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Auto-compare delta (after act, 5s visibility) */}
        {autoCompareVisible && autoCompare && (
          <div style={{ marginTop: 5 }}>
            <DeltaStrip compare={autoCompare} />
          </div>
        )}

        {/* Controls row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
        }}>
          {/* Jiang toggle */}
          <button
            onClick={onToggleJiang}
            style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 3, cursor: 'pointer',
              background: jiangEnabled ? 'rgba(160,255,238,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${jiangEnabled ? 'rgba(160,255,238,0.35)' : 'rgba(255,255,255,0.08)'}`,
              color: jiangEnabled ? '#a0ffee' : 'rgba(255,255,255,0.35)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Eye size={9} strokeWidth={1.5} />
            Jiang {jiangEnabled ? 'On' : 'Off'}
          </button>

          {/* Deep Forecast button */}
          <button
            onClick={onRunDeep}
            disabled={isDeepRunning}
            style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 3, cursor: isDeepRunning ? 'default' : 'pointer',
              background: isDeepRunning ? 'rgba(74,158,255,0.08)' : 'rgba(74,158,255,0.12)',
              border: `1px solid ${isDeepRunning ? 'rgba(74,158,255,0.15)' : 'rgba(74,158,255,0.35)'}`,
              color: isDeepRunning ? 'rgba(74,158,255,0.5)' : '#4a9eff',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Zap size={9} strokeWidth={1.5} />
            {isDeepRunning ? `Deep ${Math.round(deepProgress * 100)}%` : 'Deep Forecast'}
          </button>

          <div style={{ flex: 1 }} />

          {/* Advanced toggle */}
          <button
            onClick={() => setAdvancedOpen(v => !v)}
            style={{
              fontSize: 8, color: 'rgba(255,255,255,0.3)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', gap: 3,
            }}
          >
            Advanced {advancedOpen
              ? <ChevronUp size={10} strokeWidth={1.5} />
              : <ChevronDown size={10} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* ═══ TIER C: Advanced Metrics (Collapsible) ════════════════════ */}
      {advancedOpen && (
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {/* Phase distribution */}
          {bestResult && (
            <div>
              <div style={{
                fontSize: 8.5, color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
              }}>
                Distribuicao de regimes ({bestResult.trajectories.length} rollouts)
              </div>
              {(Object.entries(bestResult.probability) as [PhaseLabel, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([ph, prob]) => {
                  const col = PHASE_COLORS[ph] ?? '#888';
                  return (
                    <div key={ph} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <span style={{ fontSize: 8.5, color: col, width: 75, flexShrink: 0 }}>
                        {PHASE_LABELS_PT[ph]}
                      </span>
                      <div style={{
                        flex: 1, height: 4, background: 'rgba(255,255,255,0.06)',
                        borderRadius: 2, overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${prob * 100}%`, height: '100%',
                          background: col, borderRadius: 2,
                        }} />
                      </div>
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', width: 26, textAlign: 'right' }}>
                        {Math.round(prob * 100)}%
                      </span>
                    </div>
                  );
                })
              }
            </div>
          )}

          {/* Trend lines */}
          {bestResult && bestResult.trajectories.length > 0 && (
            <div>
              <div style={{
                fontSize: 8.5, color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5,
              }}>
                Tendencias
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <TrendLine values={aggregateTrend(bestResult, 'conflictLine')} color="#ff5a5a" width={80} height={26} />
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Conflito</div>
                </div>
                <div>
                  <TrendLine values={aggregateTrend(bestResult, 'inequalityLine')} color="#ffce5a" width={80} height={26} />
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Desig.</div>
                </div>
                <div>
                  <TrendLine values={aggregateTrend(bestResult, 'legitimacyLine')} color="#5aff8a" width={80} height={26} />
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Legit.</div>
                </div>
              </div>
            </div>
          )}

          {/* Why this forecast? */}
          {bestResult && (
            <div style={{
              padding: '5px 8px', borderRadius: 4,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{
                fontSize: 8.5, color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <HelpCircle size={9} strokeWidth={1.5} />
                Porque esta previsao?
              </div>
              {drivers.map((d, i) => {
                const arrow = d.direction === 'up' || d.direction === 'high' ? 'subiu' : 'caiu';
                return (
                  <div key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', lineHeight: 1.35, marginBottom: 2 }}>
                    <span style={{ color: d.color }}>{d.label}</span> {arrow} -- correlacao com regime detectada.
                  </div>
                );
              })}
              {(bestResult.confidence < 0.4) && (
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', lineHeight: 1.35, marginTop: 2 }}>
                  Confianca baixa: variancia alta entre rollouts sugere bifurcacao.
                </div>
              )}
            </div>
          )}

          {/* All metrics */}
          <div>
            <div style={{
              fontSize: 8.5, color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
            }}>
              Metricas completas
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              {[
                { label: 'Conflito', val: metrics.conflictRate, color: '#ff5a5a' },
                { label: 'Desigualdade', val: metrics.inequality, color: '#ffce5a' },
                { label: 'Legitimidade', val: metrics.legitimacyMean, color: '#5aff8a' },
                { label: 'Norma', val: metrics.normMean, color: '#c05aff' },
                { label: 'Coesao', val: metrics.cohesion, color: '#4a9eff' },
                { label: 'Polarizacao', val: metrics.polarization, color: '#ff9a3c' },
                { label: 'Escassez', val: metrics.scarcity, color: '#ff7788' },
                { label: 'Volatilidade', val: metrics.volatility, color: '#ffd4f0' },
              ].map(m => (
                <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', width: 60, flexShrink: 0 }}>
                    {m.label}
                  </span>
                  <div style={{
                    flex: 1, height: 3, background: 'rgba(255,255,255,0.06)',
                    borderRadius: 2, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${m.val * 100}%`, height: '100%',
                      background: m.color, borderRadius: 2,
                    }} />
                  </div>
                  <span style={{
                    fontSize: 8, color: m.color, fontFamily: 'monospace',
                    width: 22, textAlign: 'right', flexShrink: 0,
                  }}>
                    {Math.round(m.val * 100)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
