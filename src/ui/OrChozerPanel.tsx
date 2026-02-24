// ─────────────────────────────────────────────────────────────────────────────
// Or Chozer Panel — Tree of Life v2 Feedback UI
// Bottom-up sensing + Tiferet controller
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  FeedbackConfig, FeedbackState, resetFeedbackMemory, PhaseLabel,
} from '../sim/micro/feedbackEngine';
import { RotateCcw, ChevronDown, ChevronRight, Activity, Zap } from 'lucide-react';

// ── Tiny shared sub-components ───────────────────────────────────────────────

function MetricBar({
  label, value, color, hint,
}: { label: string; value: number; color: string; hint?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ marginBottom: 4 }} title={hint}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 8, color: 'rgba(200,190,220,0.55)', letterSpacing: '0.06em' }}>
          {label}
        </span>
        <span style={{ fontSize: 8, color, fontFamily: 'monospace' }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: 2, transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}

function SefirahBar({
  label, value, color,
}: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
      <span style={{ fontSize: 8, color: 'rgba(220,210,235,0.5)', width: 60, letterSpacing: '0.04em', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 3, transition: 'width 0.25s ease',
          boxShadow: pct > 30 ? `0 0 6px ${color}66` : 'none',
        }} />
      </div>
      <span style={{ fontSize: 7, color, fontFamily: 'monospace', width: 22, textAlign: 'right', flexShrink: 0 }}>
        {pct}%
      </span>
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, onChange, display,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display?: string;
}) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 8, color: 'rgba(200,190,220,0.5)', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontSize: 8, color: 'rgba(200,180,255,0.7)', fontFamily: 'monospace' }}>
          {display ?? value.toFixed(2)}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#a070ff', cursor: 'pointer' }}
      />
    </div>
  );
}

// ── Phase colours ─────────────────────────────────────────────────────────────
const PHASE_COLORS: Record<PhaseLabel, string> = {
  Bloom:       '#50ff90',
  Consolidate: '#60d0ff',
  Prune:       '#ff6050',
  Renew:       '#c080ff',
};

const PHASE_EMOJI: Record<PhaseLabel, string> = {
  Bloom:       '🌸',
  Consolidate: '🏛️',
  Prune:       '✂️',
  Renew:       '✨',
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface OrChozerPanelProps {
  feedbackState: FeedbackState;
  onConfigChange: (patch: Partial<FeedbackConfig>) => void;
  onResetMemory: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export function OrChozerPanel({ feedbackState, onConfigChange, onResetMemory }: OrChozerPanelProps) {
  const [open, setOpen]           = useState(false);
  const [vizOpen, setVizOpen]     = useState(true);
  const [sefirotOpen, setSefirotOpen] = useState(true);

  const { config, metrics, activations, phaseLabel, phase, modulation } = feedbackState;
  const phaseColor = PHASE_COLORS[phaseLabel];
  const phaseEmoji = PHASE_EMOJI[phaseLabel];

  // Styles
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 48,
    left: 8,
    zIndex: 30,
    width: 220,
    background: 'rgba(4,2,16,0.93)',
    border: `1px solid ${config.enabled ? 'rgba(180,120,255,0.25)' : 'rgba(255,255,255,0.07)'}`,
    borderRadius: 8,
    backdropFilter: 'blur(10px)',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: config.enabled ? '0 0 20px rgba(160,100,255,0.12)' : 'none',
    transition: 'border-color 0.3s, box-shadow 0.3s',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 10px',
    cursor: 'pointer',
    background: config.enabled
      ? 'rgba(160,80,255,0.08)'
      : 'rgba(255,255,255,0.02)',
    borderBottom: open ? '1px solid rgba(255,255,255,0.06)' : 'none',
    transition: 'background 0.2s',
  };

  const sectionStyle: React.CSSProperties = {
    padding: '8px 10px 4px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  };

  const secLabelStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase',
    color: 'rgba(180,160,210,0.4)', marginBottom: 6, cursor: 'pointer',
    userSelect: 'none',
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '3px 7px', borderRadius: 4, cursor: 'pointer',
    fontSize: 8, border: 'none',
    background: active ? 'rgba(180,100,255,0.18)' : 'rgba(255,255,255,0.04)',
    color: active ? 'rgba(210,170,255,0.9)' : 'rgba(180,165,150,0.4)',
    letterSpacing: '0.05em', transition: 'background 0.2s, color 0.2s',
  });

  return (
    <div style={panelStyle}>
      {/* ── Header / toggle ────────────────────────────────────────── */}
      <div style={headerStyle} onClick={() => setOpen(o => !o)}>
        <Activity size={11} color={config.enabled ? '#a070ff' : 'rgba(180,165,150,0.4)'} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: config.enabled ? 'rgba(200,170,255,0.9)' : 'rgba(180,165,150,0.5)', letterSpacing: '0.08em' }}>
            Or Chozer
          </div>
          <div style={{ fontSize: 6.5, color: 'rgba(180,165,150,0.3)', letterSpacing: '0.05em' }}>
            Bottom-up feedback loop
          </div>
        </div>
        {config.enabled && (
          <div style={{
            fontSize: 7.5, padding: '1px 5px', borderRadius: 3,
            background: `${phaseColor}22`, color: phaseColor,
            border: `1px solid ${phaseColor}44`,
            letterSpacing: '0.04em',
          }}>
            {phaseEmoji} {phaseLabel}
          </div>
        )}
        {open ? <ChevronDown size={10} color="rgba(180,165,150,0.4)" /> : <ChevronRight size={10} color="rgba(180,165,150,0.4)" />}
      </div>

      {open && (
        <div>
          {/* ── Enable toggle + strength ────────────────────────────── */}
          <div style={{ ...sectionStyle, padding: '8px 10px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <button
                onClick={() => onConfigChange({ enabled: !config.enabled })}
                style={{
                  ...btnStyle(config.enabled),
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 9px', fontSize: 8,
                }}
              >
                <Zap size={9} />
                {config.enabled ? 'Or Chozer ON' : 'Or Chozer OFF'}
              </button>
              {config.enabled && (
                <button
                  onClick={onResetMemory}
                  style={{ ...btnStyle(false), display: 'flex', alignItems: 'center', gap: 3, padding: '4px 6px' }}
                  title="Reset Feedback Memory"
                >
                  <RotateCcw size={8} /> Reset
                </button>
              )}
            </div>

            <SliderRow
              label="Feedback Strength"
              value={config.strength}
              min={0} max={1} step={0.01}
              onChange={v => onConfigChange({ strength: v })}
            />
            <SliderRow
              label="Feedback Interval"
              value={config.intervalFrames}
              min={1} max={60} step={1}
              onChange={v => onConfigChange({ intervalFrames: Math.round(v) })}
              display={`${config.intervalFrames} fr`}
            />
            <SliderRow
              label="Smoothing / Inertia"
              value={config.smoothing}
              min={0} max={0.99} step={0.01}
              onChange={v => onConfigChange({ smoothing: v })}
            />
            <SliderRow
              label="Chaos Clamp"
              value={config.chaosClamp}
              min={0} max={1} step={0.01}
              onChange={v => onConfigChange({ chaosClamp: v })}
            />
          </div>

          {/* ── Metrics visualization ────────────────────────────────── */}
          <div style={sectionStyle}>
            <div style={secLabelStyle} onClick={() => setVizOpen(v => !v)}>
              {vizOpen ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
              Emergent Metrics
            </div>
            {vizOpen && (
              <div>
                <MetricBar label="Entropy"    value={metrics.entropyLike} color="#c080ff" hint="Type distribution diversity across space" />
                <MetricBar label="Clustering" value={metrics.clustering}  color="#60d0ff" hint="How clumped vs dispersed agents are" />
                <MetricBar label="Conflict"   value={metrics.conflict}    color="#ff7050" hint="High-speed / repulsion events" />
                <MetricBar label="Diversity"  value={metrics.diversity}   color="#50ff90" hint="Active type fraction above threshold" />
                <MetricBar label="Stagnation" value={metrics.stagnation}  color="#ffd060" hint="System similarity over time" />
                <MetricBar label="Energy"     value={metrics.energy}      color="#80c0ff" hint="Normalized average kinetic energy" />
              </div>
            )}
          </div>

          {/* ── Sefirot activations ──────────────────────────────────── */}
          <div style={sectionStyle}>
            <div style={secLabelStyle} onClick={() => setSefirotOpen(v => !v)}>
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

          {/* ── Phase oscillator + current mods ─────────────────────── */}
          <div style={{ padding: '7px 10px 8px' }}>
            {/* Phase pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 7.5, color: 'rgba(180,165,150,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Phase
              </span>
              <div style={{
                flex: 1, height: 4, background: 'rgba(255,255,255,0.05)',
                borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${Math.round(phase * 100)}%`,
                  background: `linear-gradient(90deg, ${phaseColor}66, ${phaseColor})`,
                  transition: 'width 0.3s ease',
                  borderRadius: 2,
                }} />
              </div>
              <span style={{
                fontSize: 8, color: phaseColor, fontFamily: 'monospace',
                padding: '1px 4px', borderRadius: 3,
                background: `${phaseColor}18`,
                border: `1px solid ${phaseColor}33`,
              }}>
                {phaseEmoji} {phaseLabel}
              </span>
            </div>

            {/* Active modulation indicators (only when enabled) */}
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
                  const isPos = v >= 0;
                  const mag   = Math.abs(v);
                  const col   = mag < 0.01 ? 'rgba(180,165,150,0.2)' : isPos ? '#70e080' : '#e07070';
                  return (
                    <div key={k} style={{
                      fontSize: 7, padding: '1px 4px', borderRadius: 3,
                      background: `${col}18`,
                      border: `1px solid ${col}33`,
                      color: col, fontFamily: 'monospace',
                    }}>
                      {k} {isPos && mag > 0.001 ? '+' : ''}{(v * 100).toFixed(1)}%
                    </div>
                  );
                })}
              </div>
            )}

            {!config.enabled && (
              <div style={{
                fontSize: 7.5, color: 'rgba(180,165,150,0.2)',
                textAlign: 'center', padding: '4px 0',
                letterSpacing: '0.05em',
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
