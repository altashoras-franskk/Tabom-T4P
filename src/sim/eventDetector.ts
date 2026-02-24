// Event Detector - Detecta mudanças e gera eventos narráveis

import type { Observables, PhaseLabel } from './observables';

export interface EmergenceEvent {
  time: number;
  kind: EventKind;
  title: string;
  detail: string;
  icon: string;
  tags: string[];
  evidence: Partial<Observables>;
}

export type EventKind = 
  | 'PHASE_SHIFT'
  | 'BORDER_FORMED'
  | 'BORDER_DISSOLVED'
  | 'RITUAL_SYNC_PEAK'
  | 'TABOO_BREACH'
  | 'JUDGMENT'
  | 'COHESION_SPIKE'
  | 'VOLATILITY_SPIKE'
  | 'RECOVERY';

interface DetectorState {
  lastPhase: PhaseLabel;
  lastObs: Observables;
  phaseStability: number; // ticks na mesma phase
  history: Array<{ time: number; obs: Observables }>;
}

let state: DetectorState | null = null;

const THRESHOLDS = {
  borderFormed: 0.6,
  borderDissolved: 0.3,
  ritualPeak: 0.65,
  cohesionSpike: 0.7,
  volatilitySpike: 0.75,
};

export function initDetector(obs: Observables): void {
  state = {
    lastPhase: obs.phase,
    lastObs: obs,
    phaseStability: 0,
    history: [{ time: 0, obs }],
  };
}

export function detectEvents(obs: Observables, time: number): EmergenceEvent[] {
  if (!state) {
    initDetector(obs);
    return [];
  }

  const events: EmergenceEvent[] = [];
  const prev = state.lastObs;

  // 1. Phase shift (com estabilidade de 2 ticks)
  if (obs.phase !== state.lastPhase) {
    state.phaseStability = 0;
  } else {
    state.phaseStability++;
  }

  if (state.phaseStability === 2 && obs.phase !== prev.phase) {
    events.push({
      time,
      kind: 'PHASE_SHIFT',
      title: `Phase Shift: ${prev.phase} → ${obs.phase}`,
      detail: `System transitioned to ${obs.phase}`,
      icon: '🔄',
      tags: ['phase', 'transition'],
      evidence: { phase: obs.phase, cohesion: obs.cohesion, volatility: obs.volatility },
    });
  }

  // 2. Border formed
  if (prev.borderStrength < THRESHOLDS.borderFormed && obs.borderStrength >= THRESHOLDS.borderFormed) {
    events.push({
      time,
      kind: 'BORDER_FORMED',
      title: 'Borders Crystallizing',
      detail: `Border strength: ${(obs.borderStrength * 100).toFixed(0)}%`,
      icon: '🧱',
      tags: ['border', 'structure'],
      evidence: { borderStrength: obs.borderStrength, segregation: obs.segregation },
    });
  }

  // 3. Border dissolved
  if (prev.borderStrength >= THRESHOLDS.borderDissolved && obs.borderStrength < THRESHOLDS.borderDissolved) {
    events.push({
      time,
      kind: 'BORDER_DISSOLVED',
      title: 'Borders Dissolving',
      detail: 'Types mixing - boundaries eroding',
      icon: '🌊',
      tags: ['border', 'mixing'],
      evidence: { borderStrength: obs.borderStrength },
    });
  }

  // 4. Ritual sync peak
  if (obs.ritualSync > 0 && prev.ritualSync < THRESHOLDS.ritualPeak && obs.ritualSync >= THRESHOLDS.ritualPeak) {
    events.push({
      time,
      kind: 'RITUAL_SYNC_PEAK',
      title: 'Ritual Synchronization',
      detail: `Sync: ${(obs.ritualSync * 100).toFixed(0)}% - coordinated motion`,
      icon: '✨',
      tags: ['ritual', 'sync'],
      evidence: { ritualSync: obs.ritualSync, volatility: obs.volatility },
    });
  }

  // 5. Cohesion spike
  if (prev.cohesion < THRESHOLDS.cohesionSpike && obs.cohesion >= THRESHOLDS.cohesionSpike) {
    events.push({
      time,
      kind: 'COHESION_SPIKE',
      title: 'High Cohesion Achieved',
      detail: 'Tight clustering formed',
      icon: '◉',
      tags: ['cohesion', 'cluster'],
      evidence: { cohesion: obs.cohesion },
    });
  }

  // 6. Volatility spike
  if (prev.volatility < THRESHOLDS.volatilitySpike && obs.volatility >= THRESHOLDS.volatilitySpike) {
    events.push({
      time,
      kind: 'VOLATILITY_SPIKE',
      title: 'Turbulence Spike',
      detail: 'System entering chaotic regime',
      icon: '⚡',
      tags: ['volatility', 'chaos'],
      evidence: { volatility: obs.volatility },
    });
  }

  // 7. Recovery (trend)
  if (state.history.length >= 3) {
    const recent = state.history.slice(-3);
    const cohesionIncreasing = recent.every((h, i) => i === 0 || h.obs.cohesion > recent[i - 1].obs.cohesion);
    
    if (cohesionIncreasing && prev.cohesion < 0.4 && obs.cohesion >= 0.4) {
      events.push({
        time,
        kind: 'RECOVERY',
        title: 'System Recovery',
        detail: 'Cohesion rebuilding after collapse',
        icon: '🌱',
        tags: ['recovery', 'cohesion'],
        evidence: { cohesion: obs.cohesion },
      });
    }
  }

  // Update state
  state.lastPhase = obs.phase;
  state.lastObs = obs;
  state.history.push({ time, obs });
  
  if (state.history.length > 10) state.history.shift();

  return events;
}

export function resetDetector(): void {
  state = null;
}

export function recordTabooBreach(time: number, tabooType: string): EmergenceEvent {
  return {
    time,
    kind: 'TABOO_BREACH',
    title: 'Taboo Violated',
    detail: `${tabooType} boundary crossed`,
    icon: '⚠️',
    tags: ['taboo', 'violation'],
    evidence: {},
  };
}

export function recordJudgment(time: number, mode: string, resolved: boolean): EmergenceEvent {
  return {
    time,
    kind: 'JUDGMENT',
    title: resolved ? 'Justice Applied' : 'Case Opened',
    detail: `Mode: ${mode}`,
    icon: resolved ? '⚖️' : '👁️',
    tags: ['justice', mode],
    evidence: {},
  };
}
