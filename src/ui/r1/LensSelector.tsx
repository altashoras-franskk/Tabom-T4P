/**
 * Patch R1 — Lens selector dropdown (5 lenses).
 */

import React from 'react';
import { LENSES, DEFAULT_LENS_ID, type LensId } from '../../r1/lensSystem';

const MONO = "'IBM Plex Mono', monospace";
const TEAL = '#37b2da';

interface LensSelectorProps {
  value: LensId;
  onChange: (id: LensId) => void;
}

export function LensSelector({ value, onChange }: LensSelectorProps) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 10 }}>
      <label style={{ color: 'rgba(255,255,255,0.5)', marginRight: 6 }}>Lens</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value as LensId)}
        style={{
          background: 'rgba(0,0,0,0.4)',
          border: `1px solid ${TEAL}44`,
          color: '#fff',
          fontFamily: MONO,
          fontSize: 9,
          padding: '2px 6px',
          cursor: 'pointer',
        }}
      >
        {LENSES.map(l => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
    </div>
  );
}

export { DEFAULT_LENS_ID, LENSES };
