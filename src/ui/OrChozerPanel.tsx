// ── Or Chozer Panel — Tree of Life v2 Feedback UI (DOTO/MONO design system)
import React, { useState } from 'react';
import {
  FeedbackConfig, FeedbackState, PhaseLabel,
} from '../sim/micro/feedbackEngine';
import { ChevronDown, ChevronRight } from 'lucide-react';

const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";
const ACCENT = '#ffd400';

function MetricBar({ label, value, color, hint }: { label: string; value: number; color: string; hint?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ marginBottom: 5 }} title={hint}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: color + 'bb' }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}55, ${color}aa)`, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function SefirahBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
      <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.30)', width: 60, letterSpacing: '0.04em', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}55, ${color}aa)`, transition: 'width 0.25s' }} />
      </div>
      <span style={{ fontFamily: MONO, fontSize: 7, color: color + '99', width: 22, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
    </div>
  );
}

function SliderRow({ label, value, min, max, step, onChange, display }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display?: string;
}) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>{display ?? value.toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', height: 2, accentColor: ACCENT, cursor: 'pointer' }} />
    </div>
  );
}

const PHASE_COLORS: Record<PhaseLabel, string> = {
  Bloom:       '#50ff90',
  Consolidate: '#60d0ff',
  Prune:       '#ff6050',
  Renew:       '#c080ff',
};

const PHASE_SIGILS: Record<PhaseLabel, string> = {
  Bloom:       '◈',
  Consolidate: '◻',
  Prune:       '◗',
  Renew:       '✦',
};

interface OrChozerPanelProps {
  feedbackState: FeedbackState;
  onConfigChange: (patch: Partial<FeedbackConfig>) => void;
  onResetMemory: () => void;
}

export function OrChozerPanel({ feedbackState, onConfigChange, onResetMemory }: OrChozerPanelProps) {
  const [open, setOpen]               = useState(false);
  const [vizOpen, setVizOpen]         = useState(true);
  const [sefirotOpen, setSefirotOpen] = useState(true);

  const { config, metrics, activations, phaseLabel, phase, modulation } = feedbackState;
  const phaseColor = PHASE_COLORS[phaseLabel];
  const phaseSigil = PHASE_SIGILS[phaseLabel];

  return (
    <div style={{
      position: 'absolute', bottom: 48, left: 8, zIndex: 30, width: 220,
      background: 'rgba(0,0,0,0.94)',
      border: `1px dashed ${config.enabled ? `${ACCENT}18` : 'rgba(255,255,255,0.06)'}`,
      overflow: 'hidden',
      transition: 'border-color 0.3s',
    }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 10px', cursor: 'pointer',
        background: config.enabled ? `${ACCENT}04` : 'transparent',
        borderBottom: open ? '1px dashed rgba(255,255,255,0.04)' : 'none',
        transition: 'background 0.2s',
      }}>
        <span style={{ fontSize: 10, color: config.enabled ? ACCENT : 'rgba(255,255,255,0.25)' }}>◈</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: DOTO, fontSize: 9, color: config.enabled ? `${ACCENT}cc` : 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Or Chozer
          </div>
          <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.05em' }}>
            Bottom-up feedback loop
          </div>
        </div>
        {config.enabled && (
          <div style={{
            fontFamily: MONO, fontSize: 7, padding: '1px 6px',
            background: `${phaseColor}0c`, color: phaseColor,
            border: `1px dashed ${phaseColor}30`,
            letterSpacing: '0.04em',
          }}>
            {phaseSigil} {phaseLabel}
          </div>
        )}
        {open ? <ChevronDown size={10} style={{ color: 'rgba(255,255,255,0.25)' }} /> : <ChevronRight size={10} style={{ color: 'rgba(255,255,255,0.25)' }} />}
      </div>

      {open && (
        <div>
          {/* Enable toggle + params */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <button onClick={() => onConfigChange({ enabled: !config.enabled })} style={{
                fontFamily: MONO, fontSize: 8, padding: '3px 8px',
                background: config.enabled ? `${ACCENT}0c` : 'transparent',
                border: `1px dashed ${config.enabled ? `${ACCENT}30` : 'rgba(255,255,255,0.08)'}`,
                color: config.enabled ? `${ACCENT}cc` : 'rgba(255,255,255,0.30)',
                cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {config.enabled ? '◉ ON' : '○ OFF'}
              </button>
              {config.enabled && (
                <button onClick={onResetMemory} style={{
                  fontFamily: MONO, fontSize: 8, padding: '3px 6px',
                  background: 'transparent', border: '1px dashed rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.25)', cursor: 'pointer',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  ↺ Reset
                </button>
              )}
            </div>

            <SliderRow label="Strength" value={config.strength} min={0} max={1} step={0.01}
              onChange={v => onConfigChange({ strength: v })} />
            <SliderRow label="Interval" value={config.intervalFrames} min={1} max={60} step={1}
              onChange={v => onConfigChange({ intervalFrames: Math.round(v) })} display={`${config.intervalFrames} fr`} />
            <SliderRow label="Smoothing" value={config.smoothing} min={0} max={0.99} step={0.01}
              onChange={v => onConfigChange({ smoothing: v })} />
            <SliderRow label="Chaos Clamp" value={config.chaosClamp} min={0} max={1} step={0.01}
              onChange={v => onConfigChange({ chaosClamp: v })} />
          </div>

          {/* Metrics */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <div onClick={() => setVizOpen(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: DOTO, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.22)', marginBottom: 6, cursor: 'pointer', userSelect: 'none',
            }}>
              {vizOpen ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
              Emergent Metrics
            </div>
            {vizOpen && (
              <div>
                <MetricBar label="Entropy"    value={metrics.entropyLike} color="#c080ff" hint="Type distribution diversity" />
                <MetricBar label="Clustering" value={metrics.clustering}  color="#60d0ff" hint="Clumped vs dispersed" />
                <MetricBar label="Conflict"   value={metrics.conflict}    color="#ff7050" hint="High-speed / repulsion events" />
                <MetricBar label="Diversity"  value={metrics.diversity}   color="#50ff90" hint="Active type fraction" />
                <MetricBar label="Stagnation" value={metrics.stagnation}  color="#ffd060" hint="System similarity over time" />
                <MetricBar label="Energy"     value={metrics.energy}      color="#80c0ff" hint="Kinetic energy" />
              </div>
            )}
          </div>

          {/* Sefirot */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <div onClick={() => setSefirotOpen(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: DOTO, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.22)', marginBottom: 6, cursor: 'pointer', userSelect: 'none',
            }}>
              {sefirotOpen ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
              Sefirot Activations
            </div>
            {sefirotOpen && (
              <div>
                <SefirahBar label="Chokhmah" value={activations.chokhmah} color="#e0c860" />
                <SefirahBar label="Binah"    value={activations.binah}    color="#6090e0" />
                <SefirahBar label="Chesed"   value={activations.chesed}   color="#50e080" />
                <SefirahBar label="Gevurah"  value={activations.gevurah}  color="#e05050" />
                <SefirahBar label="Tiferet"  value={activations.tiferet}  color="#d4a060" />
              </div>
            )}
          </div>

          {/* Phase */}
          <div style={{ padding: '7px 10px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Phase</span>
              <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(phase * 100)}%`, background: `linear-gradient(90deg, ${phaseColor}55, ${phaseColor}aa)`, transition: 'width 0.3s' }} />
              </div>
              <span style={{
                fontFamily: MONO, fontSize: 8, color: phaseColor,
                padding: '1px 5px',
                background: `${phaseColor}0c`, border: `1px dashed ${phaseColor}25`,
              }}>
                {phaseSigil} {phaseLabel}
              </span>
            </div>

            {config.enabled && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {[
                  { k: 'Δforce', v: modulation.force },
                  { k: 'Δdrag',  v: modulation.drag },
                  { k: 'Δentropy', v: modulation.entropy },
                  { k: 'Δbeta',  v: modulation.beta },
                  { k: 'Δrmax',  v: modulation.rmax },
                  { k: 'Δmut',   v: modulation.mutationRate },
                ].map(({ k, v }) => {
                  const mag = Math.abs(v);
                  const col = mag < 0.01 ? 'rgba(255,255,255,0.15)' : v >= 0 ? '#70e080' : '#e07070';
                  return (
                    <div key={k} style={{
                      fontFamily: MONO, fontSize: 7, padding: '1px 4px',
                      background: `${col}0c`, border: `1px dashed ${col}22`,
                      color: col,
                    }}>
                      {k} {v >= 0 && mag > 0.001 ? '+' : ''}{(v * 100).toFixed(1)}%
                    </div>
                  );
                })}
              </div>
            )}

            {!config.enabled && (
              <div style={{
                fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.15)',
                textAlign: 'center', padding: '4px 0', letterSpacing: '0.05em',
              }}>
                Enable Or Chozer to activate feedback
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
