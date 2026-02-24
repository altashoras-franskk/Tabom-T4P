// ── Asimov Theater — Types & Interfaces ──────────────────────────────────────

export const GRID_SIZE = 64;
export const FACTION_COLORS = ['#4a9eff', '#ff5a5a', '#5aff8a', '#ffce5a'];
export const FACTION_COUNT_DEFAULT = 4;

// ── Seeded RNG (mulberry32) ────────────────────────────────────────────────
export function makeRNG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Agent ─────────────────────────────────────────────────────────────────
export interface Agent {
  x: number;    // 0..1 (toroidal)
  y: number;
  vx: number;
  vy: number;
  factionId: number;  // 0..F-1
  wealth: number;     // 0..1
  belief: number;     // conformity 0..1
  fear: number;       // 0..1
  status: number;     // 0..1
  id: number;
}

// ── Macro Fields (3-channel, 64×64) ──────────────────────────────────────
export interface MacroField {
  N: Float32Array;  // Norm / Enforcement
  L: Float32Array;  // Legitimacy / Trust
  R: Float32Array;  // Resource / Prosperity
  size: number;     // always GRID_SIZE
}

export function createMacroField(): MacroField {
  const n = GRID_SIZE * GRID_SIZE;
  return {
    N: new Float32Array(n),
    L: new Float32Array(n),
    R: new Float32Array(n),
    size: GRID_SIZE,
  };
}

export function fieldIdx(x: number, y: number): number {
  const ix = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(x * GRID_SIZE)));
  const iy = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(y * GRID_SIZE)));
  return ix + iy * GRID_SIZE;
}

export function sampleField(arr: Float32Array, x: number, y: number): number {
  return arr[fieldIdx(x, y)];
}

// ── Phase / Regime ────────────────────────────────────────────────────────
export type PhaseLabel =
  | 'STABLE_ORDER'
  | 'POLARIZED'
  | 'CONFLICT'
  | 'CRISIS'
  | 'EXCEPTION'
  | 'RECOVERY';

export const PHASE_COLORS: Record<PhaseLabel, string> = {
  STABLE_ORDER: '#5aff8a',
  POLARIZED:    '#ffce5a',
  CONFLICT:     '#ff9a3c',
  CRISIS:       '#ff5a5a',
  EXCEPTION:    '#c05aff',
  RECOVERY:     '#4a9eff',
};

export const PHASE_LABELS_PT: Record<PhaseLabel, string> = {
  STABLE_ORDER: 'Ordem Estável',
  POLARIZED:    'Polarizado',
  CONFLICT:     'Conflito',
  CRISIS:       'Crise',
  EXCEPTION:    'Exceção',
  RECOVERY:     'Recuperação',
};

// ── Metrics (Psychohistory state vector) ─────────────────────────────────
export interface MetricsVector {
  cohesion: number;         // intra-faction cohesion 0..1
  polarization: number;     // inter-faction divergence 0..1
  conflictRate: number;     // normalized 0..1
  inequality: number;       // gini 0..1
  legitimacyMean: number;   // mean(L) 0..1
  normMean: number;         // mean(N) 0..1
  scarcity: number;         // 1 - mean(R)
  volatility: number;       // mean speed
  t: number;
}

export function emptyMetrics(t = 0): MetricsVector {
  return { cohesion: 0.5, polarization: 0.3, conflictRate: 0.1,
           inequality: 0.3, legitimacyMean: 0.5, normMean: 0.4,
           scarcity: 0.3, volatility: 0.2, t };
}

// ── Historical Frame (one per scene end) ─────────────────────────────────
export interface HistoricalFrame {
  act: number;
  scene: number;
  t: number;
  phaseLabel: PhaseLabel;
  metrics: MetricsVector;
  headline: string;
  causal: string;
  isAct?: boolean;
  actName?: string;
}

// ── World State ───────────────────────────────────────────────────────────
export interface WorldState {
  agents: Agent[];
  field: MacroField;
  agentCount: number;
  factionCount: number;
  t: number;
  seed: number;
  // Accumulated conflict events since last macroTick
  conflictAccum: number;
  conflictDecay: number; // smoothed
  // Per-faction centroids (updated lazily)
  centroids: Array<{ x: number; y: number; count: number }>;
}

// ── Intervention Card ─────────────────────────────────────────────────────
export interface InterventionCardDef {
  id: string;
  name: string;
  description: string;
  cost: number;           // 0..1
  cooldownSeconds: number;
  durationSeconds: number;
  color: string;
}

export interface ActiveIntervention {
  cardId: string;
  startT: number;
  endT: number;
  strength: number;
}

// ── Forecast ──────────────────────────────────────────────────────────────
export interface ForecastTrajectory {
  metrics: MetricsVector[];   // sampled every ~5s
  finalPhase: PhaseLabel;
  conflictLine: number[];
  inequalityLine: number[];
  legitimacyLine: number[];
  seed: number;
}

export interface ForecastResult {
  trajectories: ForecastTrajectory[];
  probability: Partial<Record<PhaseLabel, number>>;
  confidence: number;
  generatedAt: number;
  isMuleActive: boolean;
}

export interface ForecastJob {
  baseSnapshot: WorldState;
  rolloutsDone: number;
  totalRollouts: number;
  horizonSeconds: number;
  results: ForecastTrajectory[];
  baseSeed: number;
  nBaseline: number;
}

// ── Anomaly / Mule ────────────────────────────────────────────────────────
export interface MuleState {
  active: boolean;
  x: number;
  y: number;
  charisma: number;  // 0..1
  age: number;       // seconds since spawn
  radius: number;    // influence radius (normalized)
  factionId: number;
}

// ── Full sim state stored in ref ─────────────────────────────────────────
export interface AsimovSimState {
  world: WorldState;
  metrics: MetricsVector;
  prevMetrics: MetricsVector | null;
  history: HistoricalFrame[];
  activeInterventions: ActiveIntervention[];
  cardCooldowns: Record<string, number>;  // cardId -> time of last use
  mule: MuleState;
  currentAct: number;
  currentScene: number;
  sceneT: number;             // seconds within current scene
  sceneDuration: number;      // configurable 20-60s
  lastMacroT: number;         // time of last macroTick
  macroTickInterval: number;  // 1.5s
  forecastResult: ForecastResult | null;
  forecastRunning: boolean;
  forecastJob: ForecastJob | null;
  // Counterfactual results
  counterfactualResults: ForecastResult[] | null;
  anomalyEnabled: boolean;
  lastAnomalyCheck: number;
  // PATCH 2: Auto-forecast (Live Oracle)
  autoForecastResult: ForecastResult | null;
  autoForecastJob: ForecastJob | null;
  autoForecastRunning: boolean;
  lastAutoForecastT: number;
  autoForecastCooldown: number; // seconds between auto-forecasts
  // PATCH 2: Auto-compare delta (after act)
  autoCompareResult: AutoCompareResult | null;
  autoCompareExpiry: number; // time when delta display expires
  // PATCH 2: Jiang Lens
  jiangLensEnabled: boolean;
  // PATCH 2: Event pings
  eventPings: EventPing[];
}

// PATCH 2: Auto-compare result (delta after act)
export interface AutoCompareResult {
  withAct: ForecastResult;
  withoutAct: ForecastResult;
  cardId: string;
  appliedAt: number;
}

// PATCH 2: Event ping (visual flash on stage)
export interface EventPing {
  x: number;
  y: number;
  label: string;
  color: string;
  t: number;      // creation time
  duration: number; // seconds to display
}