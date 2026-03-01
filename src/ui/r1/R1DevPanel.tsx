/**
 * Patch R1 — Dev Panel: feature flag toggles + Run Self-Check. Collapsed by default.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Play } from 'lucide-react';
import { APP_PATCH_VERSION, getR1FeatureFlags, setR1FeatureFlag, type R1FeatureFlags } from '../../config/featureFlags';
import { selfCheck, type SelfCheckResult } from '../../r1/selfCheck';

const MONO = "'IBM Plex Mono', monospace";
const DIM = 'rgba(255,255,255,0.18)';
const TEAL = '#37b2da';

const FLAG_LABELS: Record<keyof R1FeatureFlags, string> = {
  R1_MORIN_ENGINE: 'Morin Engine',
  R1_OBSERVER: 'Observer',
  R1_ARCHETYPES_AS_OPERATORS: 'Archetypes as Ops',
  R1_ALCHEMICAL_PHASES: 'Alchemical Phases',
  R1_LENS_SYSTEM: 'Lens System',
  R1_ANTI_ILLUSION: 'Anti-Illusion',
};

interface R1DevPanelProps {
  /** When true, panel is visible (e.g. admin mode). */
  visible: boolean;
  /** Optional: pass current state for self-check. */
  selfCheckScope?: Parameters<typeof selfCheck>[0];
}

export function R1DevPanel({ visible, selfCheckScope }: R1DevPanelProps) {
  const [open, setOpen] = useState(false);
  const [checkResult, setCheckResult] = useState<SelfCheckResult | null>(null);
  const [flags, setFlags] = useState<R1FeatureFlags>(() => getR1FeatureFlags());

  if (!visible) return null;

  const handleToggle = (key: keyof R1FeatureFlags, value: boolean) => {
    setR1FeatureFlag(key, value);
    setFlags(getR1FeatureFlags());
  };

  const runSelfCheck = () => {
    const result = selfCheck(selfCheckScope ?? {});
    setCheckResult(result);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 8,
        left: 8,
        zIndex: 25,
        width: 280,
        background: 'rgba(6,8,12,0.96)',
        border: '1px dashed rgba(55,178,218,0.35)',
        fontFamily: MONO,
        fontSize: 10,
      }}
    >
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 8px',
          cursor: 'pointer',
          color: DIM,
        }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>Patch {APP_PATCH_VERSION} Dev</span>
      </div>
      {open && (
        <div style={{ padding: '4px 8px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {(Object.keys(FLAG_LABELS) as (keyof R1FeatureFlags)[]).map(key => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={flags[key]}
                onChange={e => handleToggle(key, e.target.checked)}
              />
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{FLAG_LABELS[key]}</span>
            </label>
          ))}
          <button
            type="button"
            onClick={runSelfCheck}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 8,
              padding: '4px 8px',
              background: TEAL + '22',
              border: `1px solid ${TEAL}44`,
              color: TEAL,
              fontFamily: MONO,
              fontSize: 9,
              cursor: 'pointer',
            }}
          >
            <Play size={10} />
            Run Self-Check
          </button>
          {checkResult && (
            <div style={{ marginTop: 6, padding: 4, background: 'rgba(0,0,0,0.3)', fontSize: 9 }}>
              <div style={{ color: checkResult.ok ? '#60ff90' : '#ff6050' }}>
                {checkResult.ok ? 'OK' : 'Errors'}
              </div>
              {checkResult.errors.map((e, i) => (
                <div key={i} style={{ color: '#ff8080' }}>{e}</div>
              ))}
              {checkResult.warnings.map((w, i) => (
                <div key={i} style={{ color: '#ffc840' }}>{w}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
