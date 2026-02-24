// ─────────────────────────────────────────────────────────────────────────────
// Language Lab – Observables
// World state → 14-dimensional observable vector
// Supports TimeScope: 0 = current instant, 1 = compressed history window
// ─────────────────────────────────────────────────────────────────────────────
import type { WorldState, Observables, LanguageParams, WorldSnapshot } from './types';

const TWO_PI = Math.PI * 2;

// ── Compute from current quanta ───────────────────────────────────────────────
function computeInstant(state: WorldState): Observables {
  const { quanta } = state;
  if (!quanta.length) return zeroObs();

  const n = quanta.length;
  const GRID = 8; // 8×8 for density variance

  // Density grid
  const densityGrid = new Float32Array(GRID * GRID);
  for (const q of quanta) {
    const ci = Math.min(GRID - 1, Math.floor(q.x * GRID));
    const cj = Math.min(GRID - 1, Math.floor(q.y * GRID));
    densityGrid[cj * GRID + ci]++;
  }
  const cells = GRID * GRID;
  let dSum = 0, dSq = 0;
  for (let i = 0; i < cells; i++) dSum += densityGrid[i];
  const dMean = dSum / cells;
  for (let i = 0; i < cells; i++) { const d = densityGrid[i] - dMean; dSq += d * d; }
  const dVar = Math.min(1, Math.sqrt(dSq / cells) / (n / cells + 1));

  // Sync index (Kuramoto order parameter)
  let sinSum = 0, cosSum = 0;
  for (const q of quanta) { sinSum += Math.sin(q.phase); cosSum += Math.cos(q.phase); }
  const syncIndex = Math.sqrt(sinSum * sinSum + cosSum * cosSum) / n;

  // Coherence stats
  let cohSum = 0, cohSqSum = 0;
  for (const q of quanta) { cohSum += q.coherence; cohSqSum += q.coherence * q.coherence; }
  const cohMean = cohSum / n;
  const cohVar = Math.min(1, Math.sqrt(Math.max(0, cohSqSum / n - cohMean * cohMean)));

  // Loop count: quanta with high coherence×scribeAffinity clusters
  let loopCount = 0;
  const loopThresh = 0.5;
  for (const q of quanta) {
    if (q.coherence * q.scribeAffinity > loopThresh) loopCount++;
  }
  loopCount = loopCount / n; // normalised

  // Symmetry: compare quadrant densities
  const q00 = densityGrid.slice(0, cells / 4).reduce((a, b) => a + b, 0);
  const q01 = densityGrid.slice(cells / 4, cells / 2).reduce((a, b) => a + b, 0);
  const q10 = densityGrid.slice(cells / 2, 3 * cells / 4).reduce((a, b) => a + b, 0);
  const q11 = densityGrid.slice(3 * cells / 4).reduce((a, b) => a + b, 0);
  const qMax = Math.max(q00, q01, q10, q11, 1);
  const symmetryIndex = 1 - (Math.abs(q00 - q11) + Math.abs(q01 - q10)) / (2 * qMax);

  // Polarity axis: mean velocity direction
  let vxSum = 0, vySum = 0;
  for (const q of quanta) { vxSum += q.vx; vySum += q.vy; }
  const polarityAxis = ((Math.atan2(vySum / n, vxSum / n) % TWO_PI) + TWO_PI) % TWO_PI;

  // Event rate (recent events count, already tracked)
  const eventRate = Math.min(1, state.recentEventCount / 20);

  // Novelty: compare to previous snapshot
  let noveltyIndex = 0;
  if (state.snapshots.length >= 2) {
    const prev = state.snapshots[state.snapshots.length - 2];
    const cur  = state.snapshots[state.snapshots.length - 1];
    if (prev && cur) {
      noveltyIndex = Math.abs(cur.syncIndex - prev.syncIndex) +
                     Math.abs(cur.coherenceMean - prev.coherenceMean) * 0.5;
      noveltyIndex = Math.min(1, noveltyIndex * 4);
    }
  }

  // Tension: conflict between converge and diverge
  let convergeCount = 0, divergeCount = 0;
  for (const q of quanta) {
    if (q.intent < -0.2) convergeCount++;
    else if (q.intent > 0.2) divergeCount++;
  }
  const tensionIndex = Math.min(1, Math.abs(convergeCount - divergeCount) / (n * 0.3));

  // Silence: fraction of sparse space
  const sparseCount = Array.from(densityGrid).filter(v => v < 0.5).length;
  const silenceIndex = sparseCount / cells;

  return {
    densityMean: Math.min(1, dMean / (n / cells)),
    densityVariance: dVar,
    syncIndex,
    coherenceMean: cohMean,
    coherenceVariance: cohVar,
    loopCount,
    symmetryIndex: Math.max(0, Math.min(1, symmetryIndex)),
    polarityAxis,
    eventRate,
    noveltyIndex,
    tensionIndex,
    silenceIndex,
    slot13: 0,
    slot14: 0,
  };
}

// ── Compute from snapshots (TimeScope compressed) ─────────────────────────────
function computeFromSnapshots(snaps: WorldSnapshot[], weight: number): Observables {
  if (!snaps.length) return zeroObs();
  // weighted average: more recent = higher weight
  let wTotal = 0;
  const acc: Omit<WorldSnapshot, 'time' | 'densityGrid'> = {
    syncIndex: 0, coherenceMean: 0, loopCount: 0, eventRate: 0,
  };

  for (let i = 0; i < snaps.length; i++) {
    const w = (i + 1) ** weight;
    const s = snaps[i];
    acc.syncIndex    += s.syncIndex * w;
    acc.coherenceMean += s.coherenceMean * w;
    acc.loopCount    += s.loopCount * w;
    acc.eventRate    += s.eventRate * w;
    wTotal += w;
  }
  if (wTotal === 0) return zeroObs();
  acc.syncIndex /= wTotal;
  acc.coherenceMean /= wTotal;
  acc.loopCount /= wTotal;
  acc.eventRate /= wTotal;

  return {
    densityMean: 0.5,
    densityVariance: 0.3,
    syncIndex: Math.min(1, acc.syncIndex),
    coherenceMean: Math.min(1, acc.coherenceMean),
    coherenceVariance: 0.2,
    loopCount: Math.min(1, acc.loopCount),
    symmetryIndex: 0.5,
    polarityAxis: 0,
    eventRate: Math.min(1, acc.eventRate),
    noveltyIndex: 0.3,
    tensionIndex: 0.2,
    silenceIndex: 0.4,
    slot13: 0, slot14: 0,
  };
}

// ── Public entry ──────────────────────────────────────────────────────────────
export function computeObservables(state: WorldState, params: LanguageParams): Observables {
  const instant = computeInstant(state);

  if (params.timeScope < 0.05) return instant;

  // TimeScope > 0: blend instant with compressed snapshot history
  const windowCount = Math.max(1, Math.round(params.timeScope * state.snapshots.length));
  const recentSnaps = state.snapshots.slice(-windowCount);
  const historical = computeFromSnapshots(recentSnaps, 1.5);

  const t = params.timeScope;
  return lerpObs(instant, historical, t);
}

function lerpObs(a: Observables, b: Observables, t: number): Observables {
  const lerp = (x: number, y: number) => x * (1 - t) + y * t;
  return {
    densityMean:       lerp(a.densityMean,       b.densityMean),
    densityVariance:   lerp(a.densityVariance,   b.densityVariance),
    syncIndex:         lerp(a.syncIndex,         b.syncIndex),
    coherenceMean:     lerp(a.coherenceMean,     b.coherenceMean),
    coherenceVariance: lerp(a.coherenceVariance, b.coherenceVariance),
    loopCount:         lerp(a.loopCount,         b.loopCount),
    symmetryIndex:     lerp(a.symmetryIndex,     b.symmetryIndex),
    polarityAxis:      a.polarityAxis,
    eventRate:         lerp(a.eventRate,         b.eventRate),
    noveltyIndex:      lerp(a.noveltyIndex,      b.noveltyIndex),
    tensionIndex:      lerp(a.tensionIndex,      b.tensionIndex),
    silenceIndex:      lerp(a.silenceIndex,      b.silenceIndex),
    slot13: 0, slot14: 0,
  };
}

function zeroObs(): Observables {
  return {
    densityMean: 0, densityVariance: 0, syncIndex: 0,
    coherenceMean: 0, coherenceVariance: 0, loopCount: 0,
    symmetryIndex: 0.5, polarityAxis: 0, eventRate: 0,
    noveltyIndex: 0, tensionIndex: 0, silenceIndex: 1,
    slot13: 0, slot14: 0,
  };
}

export function obsToVector(obs: Observables): number[] {
  return [
    obs.densityMean, obs.densityVariance, obs.syncIndex,
    obs.coherenceMean, obs.coherenceVariance, obs.loopCount,
    obs.symmetryIndex, obs.polarityAxis / (Math.PI * 2),
    obs.eventRate, obs.noveltyIndex, obs.tensionIndex, obs.silenceIndex,
    obs.slot13, obs.slot14,
  ];
}
