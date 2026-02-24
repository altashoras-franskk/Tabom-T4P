// Culture Engine — Meme contagion & cultural spreading
// "Ideas spread like viruses through populations"
// Operates on macroTick (cheap), not per-frame

import type { MicroState } from '../micro/microState';
import type { CultureState, CultureConfig } from './sociogenesisTypes';

export interface CultureEvent {
  type: 'CONVERSION_WAVE' | 'CULT_DOMINANCE' | 'SCHISM_WARNING';
  memeId: number;
  count: number;
  wx: number;   // world X of event center
  wy: number;   // world Y of event center
  evidence: string;
}

export interface MemeStats {
  dominantMeme: number;
  dominantPct: number;
  secondMeme: number;   // second most common meme index
  secondPct: number;
  memeCounts: number[];
  schism: boolean;  // two memes competing ~35-50%
}

export function getMemeStats(
  micro: MicroState,
  culture: CultureState,
  memeCount: number,
): MemeStats {
  const counts = new Array(memeCount).fill(0);
  const n = micro.count;
  if (n === 0) return { dominantMeme: 0, dominantPct: 0, secondMeme: 1, secondPct: 0, memeCounts: counts, schism: false };

  for (let i = 0; i < n; i++) {
    counts[culture.memeId[i] % memeCount]++;
  }

  // Find top-2 memes by count
  let domIdx = 0, secIdx = -1;
  for (let m = 1; m < memeCount; m++) {
    if (counts[m] > counts[domIdx]) { secIdx = domIdx; domIdx = m; }
    else if (secIdx < 0 || counts[m] > counts[secIdx]) { secIdx = m; }
  }
  if (secIdx < 0) secIdx = (domIdx + 1) % memeCount;

  const dominantPct = counts[domIdx] / n;
  const secondPct   = counts[secIdx] / n;

  // Schism: two memes each holding 30-65%
  const schism =
    dominantPct >= 0.35 &&
    secondPct   >= 0.28 &&
    dominantPct <= 0.68;

  return { dominantMeme: domIdx, dominantPct, secondMeme: secIdx, secondPct, memeCounts: counts, schism };
}

/**
 * Initialise meme IDs from particle types (call once after spawn).
 */
export function initCultureFromParticles(
  micro: MicroState,
  culture: CultureState,
  memeCount: number,
): void {
  for (let i = 0; i < micro.count; i++) {
    culture.memeId[i] = micro.type[i] % memeCount;
    culture.memeStrength[i] = 0.5;
    culture.prestige[i] = 0.05;
    culture.lastConvertAt[i] = 0;
  }
}

/**
 * stepCulture — macroTick contagion step.
 * Samples 20 % of particles, finds local influencer, decides conversion.
 * Returns list of notable events (pushed to chronicle by caller).
 *
 * Lazy-init: if a particle has memeStrength === 0, it's a newly spawned particle
 * that was never initialized. We seed it here on first contact.
 */
export function stepCulture(
  nowSec: number,
  micro: MicroState,
  culture: CultureState,
  cfg: CultureConfig,
  rng: { next: () => number },
  // optional field sampler: returns affinity A (0..1) and stress S (0..1)
  fieldSampler?: (x: number, y: number) => { a?: number; s?: number },
): CultureEvent[] {
  const events: CultureEvent[] = [];
  const count = micro.count;
  if (count === 0 || !cfg.enabled) return events;

  // Lazy-init newly spawned particles (memeStrength defaults to 0 via Float32Array)
  for (let i = 0; i < count; i++) {
    if (culture.memeStrength[i] < 0.01) {
      culture.memeId[i] = micro.type[i] % cfg.memeCount;
      culture.memeStrength[i] = 0.5;
      culture.prestige[i] = 0.05;
    }
  }

  const sampleSize = Math.max(10, Math.min(800, Math.floor(count * 0.20)));
  const step = Math.max(1, Math.floor(count / sampleSize));
  const r2 = cfg.convertRadius * cfg.convertRadius;

  let totalConversions = 0;
  let sumCx = 0;
  let sumCy = 0;

  for (let i = 0; i < count; i += step) {
    if (nowSec - culture.lastConvertAt[i] < cfg.convertCooldownSec) continue;

    const px = micro.x[i];
    const py = micro.y[i];
    const selfMeme = culture.memeId[i];

    // Find best influencer: highest prestige*memeStrength with DIFFERENT meme
    let bestScore = -1;
    let bestJ = -1;

    for (let j = 0; j < count; j++) {
      if (j === i || culture.memeId[j] === selfMeme) continue;
      const dx = micro.x[j] - px;
      const dy = micro.y[j] - py;
      if (dx * dx + dy * dy > r2) continue;
      const score = culture.prestige[j] * culture.memeStrength[j];
      if (score > bestScore) { bestScore = score; bestJ = j; }
    }

    if (bestJ < 0) continue;

    // Sigmoid probability: p = convertRate * sigmoid(delta * k)
    const selfResist = culture.prestige[i] * 0.65;
    const delta = bestScore - selfResist;
    const k = 5.0;
    let p = cfg.convertRate * (1.0 / (1.0 + Math.exp(-delta * k)));

    // Field coupling: high affinity → stronger spread; high stress → weaker
    if (fieldSampler) {
      const f = fieldSampler(px, py);
      const a = f.a ?? 0.5;
      const s = f.s ?? 0;
      p = Math.max(0, Math.min(1, p * (1 + a * 0.5 - s * 0.5)));
    }

    // Deterministic decision via seedable RNG (no Math.random!)
    if (rng.next() < p) {
      culture.lastConvertAt[i] = nowSec;
      culture.memeId[i] = culture.memeId[bestJ];
      // lerp memeStrength toward 1.0
      culture.memeStrength[i] = culture.memeStrength[i] * 0.65 + 1.0 * 0.35;
      // boost influencer prestige
      culture.prestige[bestJ] = Math.min(1, culture.prestige[bestJ] + 0.01);

      totalConversions++;
      sumCx += px;
      sumCy += py;
    }
  }

  if (totalConversions >= 4) {
    const cx = sumCx / totalConversions;
    const cy = sumCy / totalConversions;
    const stats = getMemeStats(micro, culture, cfg.memeCount);

    events.push({
      type: 'CONVERSION_WAVE',
      memeId: stats.dominantMeme,
      count: totalConversions,
      wx: cx,
      wy: cy,
      evidence: `${totalConversions} converts, meme #${stats.dominantMeme} → ${(stats.dominantPct * 100).toFixed(0)}%`,
    });

    if (stats.dominantPct >= 0.60) {
      events.push({
        type: 'CULT_DOMINANCE',
        memeId: stats.dominantMeme,
        count: Math.round(stats.dominantPct * count),
        wx: cx,
        wy: cy,
        evidence: `meme #${stats.dominantMeme} dominates at ${(stats.dominantPct * 100).toFixed(0)}%`,
      });
    }

    if (stats.schism) {
      events.push({
        type: 'SCHISM_WARNING',
        memeId: stats.dominantMeme,
        count: 0,
        wx: 0,
        wy: 0,
        // Use computed secondMeme for correct faction labeling
        evidence: `factions #${stats.dominantMeme} ${(stats.dominantPct * 100).toFixed(0)}% vs #${stats.secondMeme} ${(stats.secondPct * 100).toFixed(0)}%`,
      });
    }
  }

  return events;
}