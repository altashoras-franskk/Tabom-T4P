/**
 * Patch R1 — Per-archetype tweak UI: editable params + description when archetype selected.
 */

import React from 'react';
import { getArchetypeOperator, getArchetypeOperatorIds, type ArchetypeOperator } from '../../r1/archetypeOperators';

const MONO = "'IBM Plex Mono', monospace";
const TEAL = '#37b2da';

interface ArchetypeOperatorTweakProps {
  selectedArchetypeId: string | null;
  onParamsChange?: (id: string, attraction_bias: number, repulsion_bias: number) => void;
}

export function ArchetypeOperatorTweak({ selectedArchetypeId, onParamsChange }: ArchetypeOperatorTweakProps) {
  const op = selectedArchetypeId ? getArchetypeOperator(selectedArchetypeId) : null;
  const ids = getArchetypeOperatorIds();

  if (!op) {
    return (
      <div style={{ padding: 8, fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
        Select an archetype to edit operator params.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 8,
        background: 'rgba(6,8,12,0.92)',
        border: `1px dashed ${TEAL}44`,
        fontFamily: MONO,
        fontSize: 9,
        maxWidth: 260,
      }}
    >
      <div style={{ color: TEAL, marginBottom: 6 }}>OPERATOR: {op.name}</div>
      <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>{op.description}</div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Attraction bias </span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.05}
          value={op.attraction_bias}
          onChange={e => onParamsChange?.(op.id, parseFloat(e.target.value), op.repulsion_bias)}
          style={{ width: 80, accentColor: TEAL, marginLeft: 4 }}
        />
        <span style={{ color: TEAL }}> {op.attraction_bias.toFixed(2)}</span>
      </div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Repulsion bias </span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.05}
          value={op.repulsion_bias}
          onChange={e => onParamsChange?.(op.id, op.attraction_bias, parseFloat(e.target.value))}
          style={{ width: 80, accentColor: TEAL, marginLeft: 4 }}
        />
        <span style={{ color: TEAL }}> {op.repulsion_bias.toFixed(2)}</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>
        Others: {ids.filter(id => id !== op.id).slice(0, 5).join(', ')}…
      </div>
    </div>
  );
}
