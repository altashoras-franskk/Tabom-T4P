// PATCH R1 — Emergence bridge: metrics → events → operators
// Non-destructive, minimal coupling.

import type { EmergenceEvent } from '../metrics/emergenceDetector';
import { phaseLabel } from '../metrics/observables';
import type { Observables } from '../metrics/observables';
import type { DetectorResults } from './detectors';
import type { FieldState } from '../field/fieldState';
import type { EmergenceOpContext } from './operators';
import { phaseShift, fortifyBorders, injectNovelty, institutionOperator } from './operators';

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export function buildEmergenceObservables(
  field: FieldState,
  detectors: DetectorResults,
  lastObs: Observables | null,
): Observables {
  const cohesion = Number.isFinite(detectors.avgCohesion) ? detectors.avgCohesion : 0;
  const borderStrength = Number.isFinite(detectors.borderStrength) ? detectors.borderStrength : 0;

  // Cheap volatility: how much key observables changed since last window.
  const dv = lastObs
    ? Math.abs(cohesion - lastObs.cohesion) + Math.abs(borderStrength - lastObs.borderStrength)
    : 0;
  const volatility = clamp01(dv * 2.5);

  const segregation = 0;
  const ritualSync = 0;
  const phase = phaseLabel({ cohesion, segregation, borderStrength, volatility, ritualSync });

  // field is unused for now but kept in signature for future cheap border ring metrics
  void field;

  return { cohesion, segregation, borderStrength, volatility, ritualSync, phase };
}

function getEventKind(e: any): string {
  return (e?.type ?? e?.kind ?? '') as string;
}

export function applyEmergenceEvents(events: EmergenceEvent[], ctx: EmergenceOpContext): void {
  if (!events || events.length === 0) return;

  console.debug('[Emergence]', events.map(getEventKind));

  for (const e of events) {
    const kind = getEventKind(e);
    if (kind === 'PHASE_SHIFT') {
      phaseShift(ctx);
      continue;
    }
    if (kind === 'COHESION_COLLAPSE') {
      institutionOperator(ctx);
      continue;
    }
    if (kind === 'BORDER_FORMED' || kind.includes('BORDER')) {
      fortifyBorders(ctx);
      continue;
    }
    if (kind === 'NOVELTY_SPIKE' || kind === 'TURBULENCE_SPIKE' || kind.includes('NOVELTY') || kind.includes('TURBULENCE')) {
      injectNovelty(ctx);
      continue;
    }
  }
}

