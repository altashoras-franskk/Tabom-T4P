// ── Asimov Theater — Metrics (Psychohistory State Vector) ────────────────────
import {
  WorldState, MetricsVector, PhaseLabel, GRID_SIZE, sampleField,
} from './asimovTypes';
import { computeGini } from './asimovEngine';
import { wrapDelta } from './asimovWorld';

// ── Compute full metrics vector ──────────────────────────────────────────
export function computeMetrics(world: WorldState, conflictEventsPerSecond: number): MetricsVector {
  const { agents, field, factionCount, centroids } = world;

  if (agents.length === 0) return {
    cohesion: 0.5, polarization: 0.3, conflictRate: 0,
    inequality: 0, legitimacyMean: 0.5, normMean: 0.5,
    scarcity: 0.5, volatility: 0, t: world.t,
  };

  // ── Intra-faction cohesion ─────────────────────────────────────────────
  // For each faction, compute mean distance to centroid
  const intraDists = new Array(factionCount).fill(0);
  const factionSizes = new Array(factionCount).fill(0);
  for (const a of agents) {
    const c = centroids[a.factionId];
    if (c.count === 0) continue;
    const dx = wrapDelta(a.x - c.x);
    const dy = wrapDelta(a.y - c.y);
    intraDists[a.factionId] += Math.sqrt(dx * dx + dy * dy);
    factionSizes[a.factionId]++;
  }
  let totalIntraDist = 0;
  let factionsWithAgents = 0;
  for (let f = 0; f < factionCount; f++) {
    if (factionSizes[f] > 0) {
      totalIntraDist += intraDists[f] / factionSizes[f];
      factionsWithAgents++;
    }
  }
  const meanIntraDist = factionsWithAgents > 0 ? totalIntraDist / factionsWithAgents : 0.5;
  // cohesion = 1 - normalized dist (max feasible spread ≈ 0.35)
  const cohesion = Math.max(0, Math.min(1, 1 - meanIntraDist / 0.35));

  // ── Polarization (inter-faction centroid distances) ───────────────────
  let totalInterDist = 0;
  let pairsCount = 0;
  for (let f1 = 0; f1 < factionCount; f1++) {
    for (let f2 = f1 + 1; f2 < factionCount; f2++) {
      const c1 = centroids[f1];
      const c2 = centroids[f2];
      if (c1.count === 0 || c2.count === 0) continue;
      const dx = wrapDelta(c1.x - c2.x);
      const dy = wrapDelta(c1.y - c2.y);
      totalInterDist += Math.sqrt(dx * dx + dy * dy);
      pairsCount++;
    }
  }
  const meanInterDist = pairsCount > 0 ? totalInterDist / pairsCount : 0.3;
  const polarization = Math.max(0, Math.min(1, meanInterDist / 0.6));

  // ── Conflict rate ──────────────────────────────────────────────────────
  // Normalize: 1 conflict/second/100 agents = 0.1
  const conflictRate = Math.max(0, Math.min(1,
    conflictEventsPerSecond / (agents.length * 0.015)));

  // ── Inequality (Gini) ──────────────────────────────────────────────────
  const inequality = computeGini(agents);

  // ── Field means ───────────────────────────────────────────────────────
  const n = GRID_SIZE * GRID_SIZE;
  let lSum = 0, nSum = 0, rSum = 0;
  for (let i = 0; i < n; i++) {
    lSum += field.L[i];
    nSum += field.N[i];
    rSum += field.R[i];
  }
  const legitimacyMean = lSum / n;
  const normMean = nSum / n;
  const scarcity = Math.max(0, 1 - rSum / n);

  // ── Volatility (mean agent speed) ────────────────────────────────────
  let speedSum = 0;
  for (const a of agents) {
    speedSum += Math.sqrt(a.vx * a.vx + a.vy * a.vy);
  }
  // Normalize: max meaningful speed ≈ 0.012
  const volatility = Math.max(0, Math.min(1, (speedSum / agents.length) / 0.012));

  return {
    cohesion,
    polarization,
    conflictRate,
    inequality,
    legitimacyMean,
    normMean,
    scarcity,
    volatility,
    t: world.t,
  };
}

// ── Phase detection ────────────────────────────────────────────────────────
export function detectPhase(m: MetricsVector, prev: MetricsVector | null): PhaseLabel {
  const { conflictRate, inequality, legitimacyMean, normMean, polarization, cohesion } = m;

  // CRISIS: severe instability
  if (conflictRate > 0.55 || (inequality > 0.65 && legitimacyMean < 0.28)) {
    return 'CRISIS';
  }

  // EXCEPTION: high norm enforcement with surface order
  if (normMean > 0.72 && conflictRate < 0.18 && inequality > 0.35) {
    return 'EXCEPTION';
  }

  // RECOVERY: was in bad state, improving
  if (prev) {
    const wasDistressed = prev.conflictRate > 0.4 || (prev.inequality > 0.6 && prev.legitimacyMean < 0.35);
    const improving = conflictRate < prev.conflictRate - 0.05 || legitimacyMean > prev.legitimacyMean + 0.03;
    if (wasDistressed && improving) return 'RECOVERY';
  }

  // CONFLICT: active tension
  if (conflictRate > 0.3 || (polarization > 0.55 && conflictRate > 0.18)) {
    return 'CONFLICT';
  }

  // POLARIZED: divided but not yet fighting
  if (polarization > 0.5 || (cohesion > 0.5 && polarization > 0.35)) {
    return 'POLARIZED';
  }

  return 'STABLE_ORDER';
}

// ── Delta summary for counterfactual display ─────────────────────────────
export interface MetricsDelta {
  conflict: number;
  inequality: number;
  legitimacy: number;
}

export function computeDelta(a: MetricsVector, b: MetricsVector): MetricsDelta {
  return {
    conflict: b.conflictRate - a.conflictRate,
    inequality: b.inequality - a.inequality,
    legitimacy: b.legitimacyMean - a.legitimacyMean,
  };
}

export function formatDelta(d: number, positive = false): string {
  const sign = d >= 0 ? '+' : '';
  return `${sign}${(d * 100).toFixed(0)}%`;
}
