/**
 * Patch R1 — Container that shows Epistemology, Observer, Phase, Lens, Anti-Illusion, Archetype Tweak based on flags.
 */

import React, { useState } from 'react';
import { getR1FeatureFlags } from '../../config/featureFlags';
import { EpistemologyPanel } from './EpistemologyPanel';
import { ObserverPanel } from './ObserverPanel';
import { PhaseIndicator } from './PhaseIndicator';
import { LensSelector } from './LensSelector';
import { AntiIllusionPanel } from './AntiIllusionPanel';
import { ArchetypeOperatorTweak } from './ArchetypeOperatorTweak';
import type { KnowledgeState } from '../../r1/knowledgeState';
import type { ObserverState } from '../../r1/observer';
import type { PhaseResult } from '../../r1/alchemicalPhases';
import type { AntiIllusionIndices, CounterMapEntry } from '../../r1/antiIllusion';
import type { LensId } from '../../r1/lensSystem';
import { generateCounterMap } from '../../r1/antiIllusion';

const MONO = "'IBM Plex Mono', monospace";
const TEAL = '#37b2da';

interface R1PanelsContainerProps {
  knowledgeState: KnowledgeState;
  observerState: ObserverState;
  phaseResult: PhaseResult | null;
  indices: AntiIllusionIndices;
  selectedLensId: LensId;
  onLensChange: (id: LensId) => void;
  onObserverConfigChange: (patch: Partial<ObserverState['config']>) => void;
  selectedArchetypeId: string | null;
}

export function R1PanelsContainer({
  knowledgeState,
  observerState,
  phaseResult,
  indices,
  selectedLensId,
  onLensChange,
  onObserverConfigChange,
  selectedArchetypeId,
}: R1PanelsContainerProps) {
  const [open, setOpen] = useState(false);
  const flags = getR1FeatureFlags();
  const anyOn = Object.values(flags).some(Boolean);

  if (!anyOn) return null;

  const handleGenerateCounterMap = (): CounterMapEntry[] => {
    return generateCounterMap({
      currentPhase: phaseResult?.phase,
      dominantMetric: 'entropy',
      assumptions: knowledgeState.assumptions,
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 48,
        left: 8,
        zIndex: 24,
        maxWidth: 320,
        maxHeight: '70vh',
        background: 'rgba(6,8,12,0.96)',
        border: '1px dashed rgba(55,178,218,0.4)',
        fontFamily: MONO,
        fontSize: 10,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '6px 8px',
          cursor: 'pointer',
          color: TEAL,
          borderBottom: open ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        Patch R1 Panels {open ? '▼' : '▶'}
      </div>
      {open && (
        <div style={{ overflowY: 'auto', padding: 6, flex: 1 }}>
          {flags.R1_LENS_SYSTEM && (
            <div style={{ marginBottom: 8 }}>
              <LensSelector value={selectedLensId} onChange={onLensChange} />
            </div>
          )}
          {flags.R1_MORIN_ENGINE && (
            <div style={{ marginBottom: 8 }}>
              <EpistemologyPanel state={knowledgeState} />
            </div>
          )}
          {flags.R1_OBSERVER && (
            <div style={{ marginBottom: 8 }}>
              <ObserverPanel state={observerState} onConfigChange={onObserverConfigChange} />
            </div>
          )}
          {flags.R1_ALCHEMICAL_PHASES && phaseResult && (
            <div style={{ marginBottom: 8 }}>
              <PhaseIndicator result={phaseResult} />
            </div>
          )}
          {flags.R1_ANTI_ILLUSION && (
            <div style={{ marginBottom: 8 }}>
              <AntiIllusionPanel indices={indices} onGenerateCounterMap={handleGenerateCounterMap} />
            </div>
          )}
          {flags.R1_ARCHETYPES_AS_OPERATORS && (
            <div>
              <ArchetypeOperatorTweak selectedArchetypeId={selectedArchetypeId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
