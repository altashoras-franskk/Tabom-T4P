/**
 * Patch R1 — Observer panel: enable, thresholds, last 20 interventions log.
 */

import React from 'react';
import type { ObserverState, ObserverLogEntry } from '../../r1/observer';

const MONO = "'IBM Plex Mono', monospace";
const DIM = 'rgba(255,255,255,0.18)';
const TEAL = '#37b2da';

interface ObserverPanelProps {
  state: ObserverState;
  onConfigChange: (patch: Partial<ObserverState['config']>) => void;
}

export function ObserverPanel({ state, onConfigChange }: ObserverPanelProps) {
  const cfg = state.config;
  const logSlice = state.log.slice(0, 20);

  return (
    <div
      style={{
        padding: 8,
        background: 'rgba(6,8,12,0.92)',
        border: `1px dashed ${TEAL}44`,
        fontFamily: MONO,
        fontSize: 9,
        maxWidth: 280,
        maxHeight: 360,
        overflowY: 'auto',
      }}
    >
      <div style={{ color: TEAL, marginBottom: 6 }}>OBSERVER (2nd order)</div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={cfg.enabled}
          onChange={e => onConfigChange({ enabled: e.target.checked })}
        />
        <span style={{ color: 'rgba(255,255,255,0.8)' }}>Enable</span>
      </label>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: DIM }}>Entropy thresh.</span>
        <input
          type="range"
          min={0.5}
          max={1}
          step={0.05}
          value={cfg.entropyThresholdHigh}
          onChange={e => onConfigChange({ entropyThresholdHigh: parseFloat(e.target.value) })}
          style={{ width: '100%', accentColor: TEAL }}
        />
        <span style={{ color: TEAL }}>{(cfg.entropyThresholdHigh * 100).toFixed(0)}%</span>
      </div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: DIM }}>Dominance thresh.</span>
        <input
          type="range"
          min={0.5}
          max={1}
          step={0.05}
          value={cfg.dominanceThreshold}
          onChange={e => onConfigChange({ dominanceThreshold: parseFloat(e.target.value) })}
          style={{ width: '100%', accentColor: TEAL }}
        />
        <span style={{ color: TEAL }}>{(cfg.dominanceThreshold * 100).toFixed(0)}%</span>
      </div>
      <div style={{ marginBottom: 6 }}>
        <span style={{ color: DIM }}>Stability (s)</span>
        <input
          type="number"
          min={1}
          max={30}
          value={cfg.stabilityThresholdSec}
          onChange={e => onConfigChange({ stabilityThresholdSec: Math.max(1, parseInt(e.target.value, 10) || 1) })}
          style={{ width: 48, marginLeft: 4, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontFamily: MONO, fontSize: 9 }}
        />
      </div>
      <div style={{ color: DIM, marginBottom: 4 }}>Last interventions</div>
      <div style={{ maxHeight: 140, overflowY: 'auto' }}>
        {logSlice.length === 0 && <div style={{ color: DIM }}>None yet.</div>}
        {logSlice.map((entry: ObserverLogEntry, i: number) => (
          <div key={i} style={{ marginBottom: 3, color: 'rgba(255,255,255,0.65)', fontSize: 8 }}>
            <span style={{ color: TEAL }}>{entry.kind}</span>
            {' — '}
            {entry.reason}
            <div style={{ color: DIM }}>{new Date(entry.timestamp).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
