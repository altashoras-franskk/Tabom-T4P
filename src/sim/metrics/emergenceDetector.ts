// Emergence Detector - Detect transitions and generate narrative events
// Watches observables over time to spot emergence

import type { Observables, PhaseLabel } from './observables';

export interface EmergenceEvent {
  type: EmergenceEventType;
  timestamp: number;
  message: string;
  metrics: Partial<Observables>;
}

export type EmergenceEventType =
  | 'PHASE_SHIFT'
  | 'BORDER_FORMED'
  | 'BORDER_DISSOLVED'
  | 'RITUAL_SYNC_PEAK'
  | 'TURBULENCE_SPIKE'
  | 'COHESION_COLLAPSE'
  | 'SEGREGATION_PEAK'
  | 'RECOVERY';

interface DetectorState {
  lastPhase: PhaseLabel;
  lastObservables: Observables;
  history: { time: number; obs: Observables }[];
}

const HISTORY_LENGTH = 10; // keep last 10 measurements for trend detection

// Thresholds for event detection
const THRESHOLDS = {
  borderFormed: 0.6,       // borderStrength crosses up
  borderDissolved: 0.3,    // borderStrength crosses down
  ritualPeak: 0.7,         // ritualSync crosses up
  turbulenceSpike: 0.75,   // volatility crosses up
  cohesionCollapse: 0.25,  // cohesion crosses down
  segregationPeak: 0.8,    // segregation crosses up
};

let detectorState: DetectorState | null = null;

/**
 * Initialize detector (call once at start)
 */
export function initEmergenceDetector(initialObs: Observables): void {
  detectorState = {
    lastPhase: initialObs.phase,
    lastObservables: initialObs,
    history: [{ time: 0, obs: initialObs }],
  };
}

/**
 * Detect emergences by comparing current observables to history
 * Returns array of events (can be empty)
 */
export function detectEmergences(
  currentObs: Observables,
  timestamp: number,
): EmergenceEvent[] {
  if (!detectorState) {
    initEmergenceDetector(currentObs);
    return [];
  }

  const events: EmergenceEvent[] = [];
  const prev = detectorState.lastObservables;

  // 1. Phase shift detection
  if (currentObs.phase !== detectorState.lastPhase) {
    events.push({
      type: 'PHASE_SHIFT',
      timestamp,
      message: `Phase transition: ${detectorState.lastPhase} → ${currentObs.phase}`,
      metrics: { phase: currentObs.phase },
    });
  }

  // 2. Border formation (threshold crossing up)
  if (prev.borderStrength < THRESHOLDS.borderFormed && 
      currentObs.borderStrength >= THRESHOLDS.borderFormed) {
    events.push({
      type: 'BORDER_FORMED',
      timestamp,
      message: `Borders crystallizing (strength ${currentObs.borderStrength.toFixed(2)})`,
      metrics: { borderStrength: currentObs.borderStrength },
    });
  }

  // 3. Border dissolution (threshold crossing down)
  if (prev.borderStrength >= THRESHOLDS.borderDissolved && 
      currentObs.borderStrength < THRESHOLDS.borderDissolved) {
    events.push({
      type: 'BORDER_DISSOLVED',
      timestamp,
      message: `Borders dissolving - mixing resumed`,
      metrics: { borderStrength: currentObs.borderStrength },
    });
  }

  // 4. Ritual sync peak
  if (prev.ritualSync < THRESHOLDS.ritualPeak && 
      currentObs.ritualSync >= THRESHOLDS.ritualPeak) {
    events.push({
      type: 'RITUAL_SYNC_PEAK',
      timestamp,
      message: `Ritual synchronization achieved (${(currentObs.ritualSync * 100).toFixed(0)}%)`,
      metrics: { ritualSync: currentObs.ritualSync },
    });
  }

  // 5. Turbulence spike
  if (prev.volatility < THRESHOLDS.turbulenceSpike && 
      currentObs.volatility >= THRESHOLDS.turbulenceSpike) {
    events.push({
      type: 'TURBULENCE_SPIKE',
      timestamp,
      message: `System entering chaotic regime`,
      metrics: { volatility: currentObs.volatility },
    });
  }

  // 6. Cohesion collapse
  if (prev.cohesion >= THRESHOLDS.cohesionCollapse && 
      currentObs.cohesion < THRESHOLDS.cohesionCollapse) {
    events.push({
      type: 'COHESION_COLLAPSE',
      timestamp,
      message: `Social fabric fraying - dispersion`,
      metrics: { cohesion: currentObs.cohesion },
    });
  }

  // 7. Segregation peak
  if (prev.segregation < THRESHOLDS.segregationPeak && 
      currentObs.segregation >= THRESHOLDS.segregationPeak) {
    events.push({
      type: 'SEGREGATION_PEAK',
      timestamp,
      message: `Maximum segregation reached - types isolated`,
      metrics: { segregation: currentObs.segregation },
    });
  }

  // 8. Recovery detection (trend analysis)
  if (detectorState.history.length >= 3) {
    const recent = detectorState.history.slice(-3);
    const cohesionTrend = recent.map(h => h.obs.cohesion);
    const increasing = cohesionTrend.every((v, i) => i === 0 || v > cohesionTrend[i - 1]);
    
    if (increasing && prev.cohesion < 0.4 && currentObs.cohesion >= 0.4) {
      events.push({
        type: 'RECOVERY',
        timestamp,
        message: `System recovering - cohesion rebuilding`,
        metrics: { cohesion: currentObs.cohesion },
      });
    }
  }

  // Update state
  detectorState.lastPhase = currentObs.phase;
  detectorState.lastObservables = currentObs;
  detectorState.history.push({ time: timestamp, obs: currentObs });
  
  // Trim history
  if (detectorState.history.length > HISTORY_LENGTH) {
    detectorState.history.shift();
  }

  return events;
}

/**
 * Reset detector (call when simulation resets)
 */
export function resetEmergenceDetector(): void {
  detectorState = null;
}

/**
 * Get icon for event type
 */
export function getEventIcon(type: EmergenceEventType): string {
  switch (type) {
    case 'PHASE_SHIFT': return '🔄';
    case 'BORDER_FORMED': return '🧱';
    case 'BORDER_DISSOLVED': return '🌊';
    case 'RITUAL_SYNC_PEAK': return '✨';
    case 'TURBULENCE_SPIKE': return '⚡';
    case 'COHESION_COLLAPSE': return '💥';
    case 'SEGREGATION_PEAK': return '🔒';
    case 'RECOVERY': return '🌱';
    default: return '📊';
  }
}
