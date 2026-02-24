// ── Asimov Theater — Forecast Engine (Cone of Futures) ───────────────────────
import {
  WorldState, ForecastJob, ForecastTrajectory, ForecastResult,
  PhaseLabel, MetricsVector, makeRNG,
} from './asimovTypes';
import { cloneWorldState } from './asimovWorld';
import { stepWorld, macroTick } from './asimovEngine';
import { computeMetrics, detectPhase } from './asimovMetrics';

const FORECAST_ROLLOUTS      = 18;
const FORECAST_HORIZON_SECS  = 60;
const FAST_DT                = 0.12;        // larger timestep for speed
const FAST_AGENT_COUNT       = 120;         // fewer agents in rollout
const SAMPLE_INTERVAL        = 6;           // sample metrics every 6s simulated
const MACRO_TICK_FAST        = 3;           // macroTick every 3s in fast mode

// PATCH 2: Auto-forecast config (lightweight, runs every 8s)
const AUTO_ROLLOUTS           = 8;
const AUTO_HORIZON_SECS       = 45;
const AUTO_AGENT_COUNT        = 80;

// PATCH 2: Deep forecast config (heavyweight, on-demand)
const DEEP_ROLLOUTS           = 30;
const DEEP_HORIZON_SECS       = 120;

// PATCH 2: Auto-compare config (mini-rollouts for act delta)
const COMPARE_ROLLOUTS        = 4;
const COMPARE_HORIZON_SECS    = 30;

// ── Helper: make a thinned snapshot ──────────────────────────────────────
function makeThinSnapshot(world: WorldState, maxAgents: number): WorldState {
  const snapshot = cloneWorldState(world);
  if (snapshot.agents.length > maxAgents) {
    snapshot.agents = snapshot.agents.slice(0, maxAgents);
    snapshot.agentCount = maxAgents;
  }
  return snapshot;
}

// ── Create a standard forecast job ────────────────────────────────────────
export function createForecastJob(
  world: WorldState,
  nBaseline: number,
): ForecastJob {
  return {
    baseSnapshot: makeThinSnapshot(world, FAST_AGENT_COUNT),
    rolloutsDone: 0,
    totalRollouts: FORECAST_ROLLOUTS,
    horizonSeconds: FORECAST_HORIZON_SECS,
    results: [],
    baseSeed: (world.seed ^ Math.floor(world.t * 1000)) >>> 0,
    nBaseline,
  };
}

// PATCH 2: Create a lightweight auto-forecast job (runs in background)
export function createAutoForecastJob(
  world: WorldState,
  nBaseline: number,
): ForecastJob {
  return {
    baseSnapshot: makeThinSnapshot(world, AUTO_AGENT_COUNT),
    rolloutsDone: 0,
    totalRollouts: AUTO_ROLLOUTS,
    horizonSeconds: AUTO_HORIZON_SECS,
    results: [],
    baseSeed: (world.seed ^ Math.floor(world.t * 1000 + 0x42)) >>> 0,
    nBaseline,
  };
}

// PATCH 2: Create a deep (heavyweight) forecast job
export function createDeepForecastJob(
  world: WorldState,
  nBaseline: number,
): ForecastJob {
  return {
    baseSnapshot: makeThinSnapshot(world, FAST_AGENT_COUNT),
    rolloutsDone: 0,
    totalRollouts: DEEP_ROLLOUTS,
    horizonSeconds: DEEP_HORIZON_SECS,
    results: [],
    baseSeed: (world.seed ^ Math.floor(world.t * 1000 + 0x99)) >>> 0,
    nBaseline,
  };
}

// PATCH 2: Create a mini-comparison forecast job (for auto-compare delta)
export function createCompareJob(
  world: WorldState,
  nBaseline: number,
): ForecastJob {
  return {
    baseSnapshot: makeThinSnapshot(world, AUTO_AGENT_COUNT),
    rolloutsDone: 0,
    totalRollouts: COMPARE_ROLLOUTS,
    horizonSeconds: COMPARE_HORIZON_SECS,
    results: [],
    baseSeed: (world.seed ^ Math.floor(world.t * 1000 + 0xAB)) >>> 0,
    nBaseline,
  };
}

// ── Run one rollout (sync, designed for time slicing) ─────────────────────
export function runOneRollout(job: ForecastJob, nBaseline: number): ForecastTrajectory {
  const seed = (job.baseSeed + job.rolloutsDone * 0x9e3779b9) >>> 0;
  const rng = makeRNG(seed);

  // Clone snapshot and add seeded noise
  const world = cloneWorldState(job.baseSnapshot);
  world.seed = seed;

  // Add small variation to fields (seeded noise)
  const noiseAmp = 0.04;
  for (let i = 0; i < world.field.N.length; i++) {
    world.field.N[i] = Math.max(0, Math.min(1, world.field.N[i] + (rng() - 0.5) * noiseAmp));
    world.field.L[i] = Math.max(0, Math.min(1, world.field.L[i] + (rng() - 0.5) * noiseAmp));
    world.field.R[i] = Math.max(0, Math.min(1, world.field.R[i] + (rng() - 0.5) * noiseAmp));
  }
  // Add small velocity noise to agents
  for (const a of world.agents) {
    a.vx += (rng() - 0.5) * 0.003;
    a.vy += (rng() - 0.5) * 0.003;
  }

  const sampledMetrics: MetricsVector[] = [];
  const conflictLine: number[]    = [];
  const inequalityLine: number[]  = [];
  const legitimacyLine: number[]  = [];

  let lastSampleT  = 0;
  let lastMacroT   = 0;
  let conflictAccum = 0;
  const startT = world.t;

  // Run fast loop
  while (world.t - startT < job.horizonSeconds) {
    world.conflictAccum = 0;
    stepWorld(world, FAST_DT, rng);
    conflictAccum += world.conflictAccum;

    // MacroTick
    if (world.t - lastMacroT >= MACRO_TICK_FAST) {
      const gini = computeGiniLocal(world.agents.map(a => a.wealth));
      macroTick(world, MACRO_TICK_FAST, gini, nBaseline);
      lastMacroT = world.t;
    }

    // Sample
    if (world.t - lastSampleT >= SAMPLE_INTERVAL) {
      const cps = conflictAccum / SAMPLE_INTERVAL;
      const m = computeMetrics(world, cps);
      sampledMetrics.push(m);
      conflictLine.push(m.conflictRate);
      inequalityLine.push(m.inequality);
      legitimacyLine.push(m.legitimacyMean);
      lastSampleT = world.t;
      conflictAccum = 0;
    }
  }

  // Final metrics sample
  const finalCps = conflictAccum / Math.max(1, MACRO_TICK_FAST);
  const finalMetrics = computeMetrics(world, finalCps);
  if (sampledMetrics.length === 0) sampledMetrics.push(finalMetrics);
  conflictLine.push(finalMetrics.conflictRate);
  inequalityLine.push(finalMetrics.inequality);
  legitimacyLine.push(finalMetrics.legitimacyMean);

  const finalPhase = detectPhase(finalMetrics, sampledMetrics.length > 1 ? sampledMetrics[sampledMetrics.length - 2] : null);

  return { metrics: sampledMetrics, finalPhase, conflictLine, inequalityLine, legitimacyLine, seed };
}

// ── Process K rollouts in slices (call each frame) ────────────────────────
// Returns true when complete
export function tickForecastJob(
  job: ForecastJob,
  nBaseline: number,
  rolloutsPerSlice: number,
): boolean {
  const end = Math.min(job.rolloutsDone + rolloutsPerSlice, job.totalRollouts);
  for (let i = job.rolloutsDone; i < end; i++) {
    job.results.push(runOneRollout(job, nBaseline));
    job.rolloutsDone++;
  }
  return job.rolloutsDone >= job.totalRollouts;
}

// PATCH 2: Time-budgeted tick (stops when budget exhausted)
export function tickForecastJobBudgeted(
  job: ForecastJob,
  nBaseline: number,
  budgetMs: number,
): boolean {
  const start = performance.now();
  while (job.rolloutsDone < job.totalRollouts) {
    job.results.push(runOneRollout(job, nBaseline));
    job.rolloutsDone++;
    if (performance.now() - start > budgetMs) break;
  }
  return job.rolloutsDone >= job.totalRollouts;
}

// ── Aggregate job results into ForecastResult ─────────────────────────────
export function aggregateForecast(
  job: ForecastJob,
  muleActive: boolean,
  muleConfidencePenalty: number,
): ForecastResult {
  const { results } = job;
  if (results.length === 0) {
    return {
      trajectories: [],
      probability: {},
      confidence: 0,
      generatedAt: Date.now(),
      isMuleActive: muleActive,
    };
  }

  // Phase probabilities
  const phaseCounts: Partial<Record<PhaseLabel, number>> = {};
  for (const r of results) {
    phaseCounts[r.finalPhase] = (phaseCounts[r.finalPhase] ?? 0) + 1;
  }
  const probability: Partial<Record<PhaseLabel, number>> = {};
  for (const [phase, count] of Object.entries(phaseCounts)) {
    probability[phase as PhaseLabel] = count / results.length;
  }

  // Confidence: 1 - variance of final conflict rate
  const finalConflicts = results.map(r => r.conflictLine[r.conflictLine.length - 1] ?? 0);
  const meanConflict = finalConflicts.reduce((a, b) => a + b, 0) / finalConflicts.length;
  const variance = finalConflicts.reduce((acc, v) => acc + (v - meanConflict) ** 2, 0) / finalConflicts.length;
  let confidence = Math.max(0, Math.min(1, 1 - variance * 8));
  confidence = Math.max(0, confidence - muleConfidencePenalty);

  // Pick up to 7 representative trajectories (diverse final phases)
  const byPhase = new Map<PhaseLabel, ForecastTrajectory[]>();
  for (const r of results) {
    if (!byPhase.has(r.finalPhase)) byPhase.set(r.finalPhase, []);
    byPhase.get(r.finalPhase)!.push(r);
  }
  const representative: ForecastTrajectory[] = [];
  for (const [, group] of byPhase) {
    representative.push(group[0]);
    if (representative.length >= 7) break;
  }

  return {
    trajectories: representative,
    probability,
    confidence,
    generatedAt: Date.now(),
    isMuleActive: muleActive,
  };
}

// ── Local Gini for forecast (avoid circular import) ───────────────────────
function computeGiniLocal(wealthArr: number[]): number {
  if (wealthArr.length === 0) return 0;
  const sorted = [...wealthArr].sort((a, b) => a - b);
  const n = sorted.length;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (2 * (i + 1) - n - 1) * sorted[i];
    den += sorted[i];
  }
  if (den === 0) return 0;
  return Math.max(0, Math.min(1, num / (n * den)));
}
