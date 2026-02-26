// ─────────────────────────────────────────────────────────────────────────────
// Or Chozer — Bottom-Up Feedback Engine (Tree of Life v2)
// Measures emergent state → feeds back into simulation parameters
// NON-DESTRUCTIVE: base params are saved/restored around modulation.
// ─────────────────────────────────────────────────────────────────────────────
import { MicroState, MicroConfig, FOOD_TYPE } from './microState';

// ── Config ───────────────────────────────────────────────────────────────────
export interface FeedbackConfig {
  enabled: boolean;
  strength: number;       // 0..1  — how strongly feedback is applied
  intervalFrames: number; // 1..60 — how often metrics recompute
  smoothing: number;      // 0..1  — inertia / smoothing factor
  chaosClamp: number;     // 0..1  — hard cap on modulation magnitude
}

export const createFeedbackConfig = (): FeedbackConfig => ({
  enabled: true,
  strength: 0.25,
  intervalFrames: 10,
  smoothing: 0.85,
  chaosClamp: 0.75,
});

// ── Metrics (all normalized 0..1) ────────────────────────────────────────────
export interface FeedbackMetrics {
  entropyLike: number; // distribution spread of agent types across space
  clustering:  number; // how clumpy vs dispersed agents are
  conflict:    number; // how much repulsion / high-speed is happening
  diversity:   number; // fraction of active types above min population
  stagnation:  number; // how similar system is over rolling window
  energy:      number; // avg kinetic energy (speed normalized)
}

const ZERO_METRICS: FeedbackMetrics = {
  entropyLike: 0, clustering: 0, conflict: 0,
  diversity: 0, stagnation: 0, energy: 0,
};

// ── Sefirot Activations ───────────────────────────────────────────────────────
export interface SefirotActivations {
  chokhmah: number; // novelty injection
  binah:    number; // structure stabilization
  chesed:   number; // expansion / attraction / mixing
  gevurah:  number; // constraint / repulsion / separation
  tiferet:  number; // integrator / balance
}

const ZERO_ACTIVATIONS: SefirotActivations = {
  chokhmah: 0, binah: 0, chesed: 0, gevurah: 0, tiferet: 0,
};

// ── Modulation Deltas ─────────────────────────────────────────────────────────
export interface ModulationDeltas {
  force:        number; // attraction strength modifier
  drag:         number; // damping / cohesion modifier
  entropy:      number; // randomness modifier
  beta:         number; // core repulsion modifier
  rmax:         number; // interaction radius modifier
  mutationRate: number; // mutation rate modifier
}

const ZERO_MODULATION: ModulationDeltas = {
  force: 0, drag: 0, entropy: 0, beta: 0, rmax: 0, mutationRate: 0,
};

// ── Phase Labels ──────────────────────────────────────────────────────────────
export type PhaseLabel = 'Bloom' | 'Consolidate' | 'Prune' | 'Renew';

// ── Engine State ──────────────────────────────────────────────────────────────
export interface FeedbackState {
  config: FeedbackConfig;
  metrics: FeedbackMetrics;
  activations: SefirotActivations;
  modulation: ModulationDeltas;
  metricsHistory: FeedbackMetrics[];
  historyMaxLen: number;
  phase: number;        // 0..1 looping oscillator
  phaseLabel: PhaseLabel;
  frameCounter: number;
  runawayCounter: number;
}

export const createFeedbackState = (): FeedbackState => ({
  config: createFeedbackConfig(),
  metrics: { ...ZERO_METRICS },
  activations: { ...ZERO_ACTIVATIONS },
  modulation: { ...ZERO_MODULATION },
  metricsHistory: [],
  historyMaxLen: 20,
  phase: 0,
  phaseLabel: 'Bloom',
  frameCounter: 0,
  runawayCounter: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

const GRID = 16;         // 16×16 spatial grid for entropy
const MAX_SAMPLE = 500;  // max agents sampled for performance

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clampDelta(v: number, maxAbs: number): number {
  return Math.max(-maxAbs, Math.min(maxAbs, v));
}

// ─────────────────────────────────────────────────────────────────────────────
// A) Emergent Metrics Computation
// ─────────────────────────────────────────────────────────────────────────────
function computeRawMetrics(state: MicroState, config: MicroConfig): FeedbackMetrics {
  const n = state.count;
  if (n === 0) return { ...ZERO_METRICS };

  const typesCount = Math.max(1, config.typesCount);
  const sampleStep = Math.max(1, Math.floor(n / MAX_SAMPLE));
  let sampledN = 0;

  // ── Grid for entropy + clustering ─────────────────────────────────────────
  // Each cell stores type counts
  const gridTypeCount = new Uint16Array(GRID * GRID * typesCount);
  const gridTotal = new Uint16Array(GRID * GRID);

  let totalSpeed = 0;
  let highConflictCount = 0;
  const typePop = new Float32Array(typesCount);

  for (let i = 0; i < n; i += sampleStep) {
    const t = state.type[i];
    if (t === FOOD_TYPE) continue; // skip food

    const gx = Math.min(GRID - 1, Math.max(0, Math.floor((state.x[i] + 1) * 0.5 * GRID)));
    const gy = Math.min(GRID - 1, Math.max(0, Math.floor((state.y[i] + 1) * 0.5 * GRID)));
    const cellIdx = gy * GRID + gx;

    const safeT = Math.min(typesCount - 1, Math.max(0, t));
    gridTypeCount[cellIdx * typesCount + safeT]++;
    gridTotal[cellIdx]++;

    if (safeT < typesCount) typePop[safeT]++;

    const sp = Math.sqrt(state.vx[i] * state.vx[i] + state.vy[i] * state.vy[i]);
    totalSpeed += sp;
    if (sp > config.speedClamp * 0.55) highConflictCount++;

    sampledN++;
  }

  if (sampledN === 0) return { ...ZERO_METRICS };

  // ── A) Entropy-like: Shannon entropy per cell, averaged ───────────────────
  let totalEntropy = 0;
  let cellsOccupied = 0;
  const logTypesCount = Math.log2(Math.max(2, typesCount));

  for (let c = 0; c < GRID * GRID; c++) {
    const tot = gridTotal[c];
    if (tot === 0) continue;
    cellsOccupied++;
    let h = 0;
    for (let t = 0; t < typesCount; t++) {
      const cnt = gridTypeCount[c * typesCount + t];
      if (cnt > 0) {
        const p = cnt / tot;
        h -= p * Math.log2(p);
      }
    }
    totalEntropy += h / logTypesCount;
  }
  const entropyLike = cellsOccupied > 0 ? clamp01(totalEntropy / cellsOccupied) : 0;

  // ── B) Clustering: variance in cell occupancy ─────────────────────────────
  const avgCellPop = sampledN / (GRID * GRID);
  let variance = 0;
  for (let c = 0; c < GRID * GRID; c++) {
    const d = gridTotal[c] - avgCellPop;
    variance += d * d;
  }
  variance /= (GRID * GRID);
  const maxVar = Math.max(1, avgCellPop * avgCellPop * 6);
  const clustering = clamp01(variance / maxVar);

  // ── C) Conflict: fraction of high-speed particles ─────────────────────────
  const conflict = clamp01(highConflictCount / sampledN * 2.2);

  // ── D) Diversity: fraction of types above 2% population threshold ─────────
  const minPop = Math.max(1, sampledN * 0.02);
  let activeTypes = 0;
  for (let t = 0; t < typesCount; t++) {
    if (typePop[t] >= minPop) activeTypes++;
  }
  const diversity = typesCount > 1 ? clamp01(activeTypes / typesCount) : 1;

  // ── F) Energy: normalized average speed ──────────────────────────────────
  const avgSpeed = totalSpeed / sampledN;
  const energy = clamp01(avgSpeed / Math.max(0.001, config.speedClamp));

  return { entropyLike, clustering, conflict, diversity, stagnation: 0, energy };
}

// ── E) Stagnation: similarity over rolling history ────────────────────────
function computeStagnation(history: FeedbackMetrics[]): number {
  const len = history.length;
  if (len < 4) return 0;

  const recentSlice = history.slice(-Math.min(5, len));
  const prevSlice   = history.slice(-Math.min(10, len), -Math.min(5, len));
  if (prevSlice.length === 0) return 0;

  const avgRecent = averageMetrics(recentSlice);
  const avgPrev   = averageMetrics(prevSlice);

  const diff = (
    Math.abs(avgRecent.entropyLike - avgPrev.entropyLike) +
    Math.abs(avgRecent.clustering  - avgPrev.clustering)  +
    Math.abs(avgRecent.conflict    - avgPrev.conflict)    +
    Math.abs(avgRecent.diversity   - avgPrev.diversity)   +
    Math.abs(avgRecent.energy      - avgPrev.energy)
  ) / 5;

  // diff≈0 means stagnant, diff>0.3 means dynamic
  return clamp01(1 - diff * 4);
}

function averageMetrics(list: FeedbackMetrics[]): FeedbackMetrics {
  const n = list.length;
  if (n === 0) return { ...ZERO_METRICS };
  const s = { ...ZERO_METRICS };
  for (const m of list) {
    s.entropyLike += m.entropyLike;
    s.clustering  += m.clustering;
    s.conflict    += m.conflict;
    s.diversity   += m.diversity;
    s.energy      += m.energy;
    s.stagnation  += m.stagnation;
  }
  return {
    entropyLike: s.entropyLike / n,
    clustering:  s.clustering  / n,
    conflict:    s.conflict    / n,
    diversity:   s.diversity   / n,
    energy:      s.energy      / n,
    stagnation:  s.stagnation  / n,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// B) Sefirot Activations
// ─────────────────────────────────────────────────────────────────────────────
function computeSefirotActivations(
  metrics: FeedbackMetrics,
  prev: SefirotActivations,
  smoothing: number,
): SefirotActivations {
  const { entropyLike, clustering, conflict, diversity, stagnation } = metrics;

  // Target ranges (deadzones):
  //   entropyLike: 0.45..0.70
  //   conflict:    0.20..0.60
  //   diversity:   0.30..0.90
  //   clustering:  0.30..0.70

  let chokhmah = 0; // novelty
  let binah    = 0; // structure
  let chesed   = 0; // expansion
  let gevurah  = 0; // constraint

  // Stagnation → novelty + expansion
  if (stagnation > 0.5) {
    const excess = stagnation - 0.5;
    chokhmah += excess * 1.2;
    chesed   += excess * 0.7;
  }

  // High conflict → structure + constraint
  if (conflict > 0.6) {
    const excess = conflict - 0.6;
    binah   += excess * 1.5;
    gevurah += excess * 1.0;
  }

  // Low entropy → inject novelty
  if (entropyLike < 0.45) {
    chokhmah += (0.45 - entropyLike) * 1.3;
  }
  // High entropy → constrain
  if (entropyLike > 0.70) {
    gevurah += (entropyLike - 0.70) * 1.4;
    binah   += (entropyLike - 0.70) * 0.6;
  }

  // Low diversity → novelty injection
  if (diversity < 0.30) {
    chokhmah += (0.30 - diversity) * 1.5;
  }

  // High clustering (blobs) → separation
  if (clustering > 0.70) {
    gevurah += (clustering - 0.70) * 1.2;
  }
  // Low clustering (dust) → cohesion
  if (clustering < 0.30) {
    chesed += (0.30 - clustering) * 1.2;
  }

  // Tiferet: integrator = magnitude of total deviation from target ranges
  const eErr = Math.max(0, Math.abs(entropyLike - 0.575) - 0.125);
  const cErr = Math.max(0, Math.abs(conflict    - 0.40)  - 0.20);
  const dErr = Math.max(0, Math.abs(diversity   - 0.60)  - 0.30);
  const kErr = Math.max(0, Math.abs(clustering  - 0.50)  - 0.20);
  const totalErr = (eErr + cErr + dErr + kErr) * 0.25;
  const tiferet = clamp01(totalErr * 2.5);

  // Raw activations (clamped)
  const rawAct: SefirotActivations = {
    chokhmah: clamp01(chokhmah),
    binah:    clamp01(binah),
    chesed:   clamp01(chesed),
    gevurah:  clamp01(gevurah),
    tiferet,
  };

  // Exponential smoothing (inertia)
  const blend = clamp01(1 - smoothing);
  return {
    chokhmah: lerp(prev.chokhmah, rawAct.chokhmah, blend),
    binah:    lerp(prev.binah,    rawAct.binah,    blend),
    chesed:   lerp(prev.chesed,   rawAct.chesed,   blend),
    gevurah:  lerp(prev.gevurah,  rawAct.gevurah,  blend),
    tiferet:  lerp(prev.tiferet,  rawAct.tiferet,  blend),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// C) Phase Oscillator
// ─────────────────────────────────────────────────────────────────────────────
// phase 0..1 looping
// Phases: 0..0.25 Bloom, 0.25..0.5 Consolidate, 0.5..0.75 Prune, 0.75..1.0 Renew
const BASE_PHASE_SPEED = 0.016; // cycles/sec — full cycle ≈ 60 s
const K_STAG  = 0.025; // stagnation accelerates phase
const K_CONF  = 0.010; // conflict slows phase

function stepPhaseOscillator(state: FeedbackState, dt: number): void {
  const { stagnation, conflict } = state.metrics;
  const speed = Math.max(0.004, BASE_PHASE_SPEED + K_STAG * stagnation - K_CONF * conflict);
  state.phase = (state.phase + speed * dt) % 1.0;

  if      (state.phase < 0.25) state.phaseLabel = 'Bloom';
  else if (state.phase < 0.50) state.phaseLabel = 'Consolidate';
  else if (state.phase < 0.75) state.phaseLabel = 'Prune';
  else                          state.phaseLabel = 'Renew';
}

// ─────────────────────────────────────────────────────────────────────────────
// D) Modulation Deltas
// ─────────────────────────────────────────────────────────────────────────────
function computeModulationDeltas(
  act: SefirotActivations,
  phase: number,
  strength: number,
  chaosClamp: number,
): ModulationDeltas {
  // Phase oscillator swings Chesed↔Gevurah and Chokhmah↔Binah
  const phAngle = phase * Math.PI * 2;
  const phSwing = strength * 0.3;
  const cSwing  = Math.sin(phAngle) * phSwing;
  const nSwing  = Math.cos(phAngle) * phSwing * 0.8;

  const effChesed  = clamp01(act.chesed  + cSwing);
  const effGevurah = clamp01(act.gevurah - cSwing);
  const effChokhmah = clamp01(act.chokhmah + nSwing);
  const effBinah   = clamp01(act.binah   - nSwing);

  // Hard cap on modulation magnitude: ±20% at strength=1 × chaosClamp
  const MAX_MOD = 0.20 * Math.min(1, chaosClamp) * Math.min(1, strength);

  // Parameter modulations (all relative deltas in [-1, +1] scaled by MAX_MOD)
  const force       = clampDelta((effChesed - effGevurah) * 0.55, MAX_MOD);
  const drag        = clampDelta((effBinah  - effChokhmah) * 0.45, MAX_MOD);
  const entropy     = clampDelta(effChokhmah * 0.35,              MAX_MOD);
  const beta        = clampDelta((effGevurah - effChesed) * 0.18, MAX_MOD);
  const rmax        = clampDelta((effChesed  - effGevurah) * 0.12, MAX_MOD);
  const mutationRate = clampDelta(effChokhmah * 0.40,             MAX_MOD);

  return { force, drag, entropy, beta, rmax, mutationRate };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/** Apply modulation deltas to config params.
 *  Call BEFORE updateParticleLife, then RESTORE after.
 *  Returns saved base values for easy restore. */
export function applyModulation(
  config: MicroConfig,
  deltas: ModulationDeltas,
): {
  force: number; drag: number; entropy: number;
  beta: number; rmax: number; mutationRate: number;
} {
  const saved = {
    force: config.force,
    drag: config.drag,
    entropy: config.entropy,
    beta: config.beta,
    rmax: config.rmax,
    mutationRate: config.mutationRate,
  };

  config.force       = Math.max(0.05, config.force  * (1 + deltas.force));
  config.drag        = Math.max(0.05, Math.min(10, config.drag * (1 + deltas.drag)));
  config.entropy     = Math.max(0, Math.min(0.05, config.entropy * (1 + deltas.entropy) + Math.abs(deltas.entropy) * 0.001));
  config.beta        = Math.max(0.05, Math.min(0.95, config.beta  * (1 + deltas.beta)));
  config.rmax        = Math.max(0.04, Math.min(0.50, config.rmax  * (1 + deltas.rmax)));
  config.mutationRate = Math.max(0, Math.min(0.01, config.mutationRate * (1 + deltas.mutationRate)));

  return saved;
}

/** Restore config params after simulation step */
export function restoreParams(
  config: MicroConfig,
  saved: { force: number; drag: number; entropy: number; beta: number; rmax: number; mutationRate: number; },
): void {
  config.force       = saved.force;
  config.drag        = saved.drag;
  config.entropy     = saved.entropy;
  config.beta        = saved.beta;
  config.rmax        = saved.rmax;
  config.mutationRate = saved.mutationRate;
}

/** Main per-frame engine step.
 *  dt = seconds since last FRAME (not physics step).
 *  This runs outside the inner physics loop. */
export function stepFeedbackEngine(
  feedbackState: FeedbackState,
  microState: MicroState,
  microConfig: MicroConfig,
  dt: number,
): void {
  feedbackState.frameCounter++;

  if (!feedbackState.config.enabled) {
    // When disabled: zero out modulation so no residual effect
    feedbackState.modulation = { ...ZERO_MODULATION };
    return;
  }

  // Only run metrics every N frames for performance
  if (feedbackState.frameCounter < feedbackState.config.intervalFrames) return;
  feedbackState.frameCounter = 0;

  const cfg = feedbackState.config;
  const simDt = cfg.intervalFrames * (1 / 60); // approx time since last metrics run

  // ── 1. Compute raw metrics ────────────────────────────────────────────────
  const raw = computeRawMetrics(microState, microConfig);

  // ── 2. Rolling history for stagnation ────────────────────────────────────
  feedbackState.metricsHistory.push({ ...raw });
  if (feedbackState.metricsHistory.length > feedbackState.historyMaxLen) {
    feedbackState.metricsHistory.shift();
  }
  raw.stagnation = computeStagnation(feedbackState.metricsHistory);

  // ── 3. Smooth metrics ─────────────────────────────────────────────────────
  // Faster per-metric smoothing (separate from sefirot smoothing)
  const metricBlend = clamp01(1 - cfg.smoothing * 0.5);
  const prev = feedbackState.metrics;
  feedbackState.metrics = {
    entropyLike: lerp(prev.entropyLike, raw.entropyLike, metricBlend),
    clustering:  lerp(prev.clustering,  raw.clustering,  metricBlend),
    conflict:    lerp(prev.conflict,     raw.conflict,     metricBlend),
    diversity:   lerp(prev.diversity,    raw.diversity,    metricBlend),
    stagnation:  lerp(prev.stagnation,   raw.stagnation,   metricBlend),
    energy:      lerp(prev.energy,       raw.energy,       metricBlend),
  };

  // ── 4. Safety: Runaway detection ─────────────────────────────────────────
  // If conflict or energy is critically high → emergency cooldown
  if (feedbackState.metrics.conflict > 0.95 || feedbackState.metrics.energy > 0.97) {
    feedbackState.runawayCounter++;
    if (feedbackState.runawayCounter > 4) {
      // Emergency: zero modulation, let system settle
      feedbackState.modulation = { ...ZERO_MODULATION };
      feedbackState.runawayCounter = 0;
      return;
    }
  } else {
    feedbackState.runawayCounter = Math.max(0, feedbackState.runawayCounter - 1);
  }

  // ── 5. Sefirot activations ────────────────────────────────────────────────
  feedbackState.activations = computeSefirotActivations(
    feedbackState.metrics,
    feedbackState.activations,
    cfg.smoothing,
  );

  // ── 6. Phase oscillator ───────────────────────────────────────────────────
  stepPhaseOscillator(feedbackState, simDt);

  // ── 7. Modulation deltas ──────────────────────────────────────────────────
  feedbackState.modulation = computeModulationDeltas(
    feedbackState.activations,
    feedbackState.phase,
    cfg.strength,
    cfg.chaosClamp,
  );
}

/** Hard-reset: clears all rolling history and resets to baseline */
export function resetFeedbackMemory(feedbackState: FeedbackState): void {
  feedbackState.metricsHistory = [];
  feedbackState.metrics        = { ...ZERO_METRICS };
  feedbackState.activations    = { ...ZERO_ACTIVATIONS };
  feedbackState.modulation     = { ...ZERO_MODULATION };
  feedbackState.phase          = 0;
  feedbackState.phaseLabel     = 'Bloom';
  feedbackState.runawayCounter = 0;
  feedbackState.frameCounter   = 0;
}
