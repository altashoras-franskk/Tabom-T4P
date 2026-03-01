/**
 * Patch R1 — Alchemical phase indicator: current phase + why (metrics snapshot).
 */

import React from 'react';
import type { PhaseResult } from '../../r1/alchemicalPhases';
import { getPhaseHint } from '../../r1/alchemicalPhases';

const MONO = "'IBM Plex Mono', monospace";
const TEAL = '#37b2da';
const PHASE_COLORS: Record<string, string> = {
  NIGREDO: '#4a4a6a',
  ALBEDO: '#c0c0d0',
  CITRINITAS: '#c4a035',
  RUBEDO: '#a03030',
};

interface PhaseIndicatorProps {
  result: PhaseResult;
}

export function PhaseIndicator({ result }: PhaseIndicatorProps) {
  const color = PHASE_COLORS[result.phase] ?? TEAL;
  const hint = getPhaseHint(result.phase as 'NIGREDO' | 'ALBEDO' | 'CITRINITAS' | 'RUBEDO');

  return (
    <div
      style={{
        padding: 6,
        background: 'rgba(6,8,12,0.92)',
        border: `1px dashed ${color}66`,
        fontFamily: MONO,
        fontSize: 9,
        maxWidth: 200,
      }}
    >
      <div style={{ color, marginBottom: 4, fontWeight: 600 }}>{result.phase}</div>
      <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>{(result.confidence * 100).toFixed(0)}% confidence</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8, marginBottom: 4 }}>{result.reason}</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8 }} title={hint}>{hint}</div>
    </div>
  );
}
