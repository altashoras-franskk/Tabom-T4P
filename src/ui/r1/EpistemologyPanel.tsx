/**
 * Patch R1 — Epistemology panel: KnowledgeState display + Speculative badges.
 */

import React from 'react';
import type { KnowledgeState } from '../../r1/knowledgeState';

const MONO = "'IBM Plex Mono', monospace";
const DIM = 'rgba(255,255,255,0.18)';
const TEAL = '#37b2da';

interface EpistemologyPanelProps {
  state: KnowledgeState;
}

export function EpistemologyPanel({ state }: EpistemologyPanelProps) {
  const speculative = new Set(state.speculativeNodes ?? []);

  return (
    <div
      style={{
        padding: 8,
        background: 'rgba(6,8,12,0.92)',
        border: `1px dashed ${TEAL}44`,
        fontFamily: MONO,
        fontSize: 9,
        maxWidth: 260,
        maxHeight: 320,
        overflowY: 'auto',
      }}
    >
      <div style={{ color: TEAL, marginBottom: 6, letterSpacing: '0.06em' }}>EPISTEMOLOGY</div>
      <div style={{ marginBottom: 6 }}>
        <span style={{ color: DIM }}>Uncertainty </span>
        <span style={{ color: TEAL }}>{(state.uncertainty_level * 100).toFixed(0)}%</span>
      </div>
      <div style={{ marginBottom: 4, color: DIM }}>Scale: {state.scale}</div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: DIM }}>Assumptions</span>
        {state.assumptions.map((a, i) => (
          <div key={i} style={{ marginLeft: 6, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
            {speculative.has(a) && <span style={{ color: '#ffc840', marginRight: 4 }}>Speculative</span>}
            {a}
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: DIM }}>Blindspots</span>
        {state.blindspots.map((b, i) => (
          <div key={i} style={{ marginLeft: 6, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{b}</div>
        ))}
      </div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: DIM }}>Uncertainties</span>
        {state.uncertainties.map((u, i) => (
          <div key={i} style={{ marginLeft: 6, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{u}</div>
        ))}
      </div>
      {state.risk_ethics.length > 0 && (
        <div>
          <span style={{ color: DIM }}>Risk / ethics</span>
          {state.risk_ethics.map((r, i) => (
            <div key={i} style={{ marginLeft: 6, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{r}</div>
          ))}
        </div>
      )}
    </div>
  );
}
