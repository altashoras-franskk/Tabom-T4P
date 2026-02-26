// Operators: structural changes to the system
import { InteractionMatrix, expandMatrix } from '../micro/matrix';
import { MicroState, MicroConfig } from '../micro/microState';
import { ReconfigState, ReconfigConfig, createArtifact } from './reconfigState';
import { DetectorResults } from './detectors';
import { SeededRNG } from '../../engine/rng';
import type { FieldState } from '../field/fieldState';

export interface Beat {
  time: number;
  type: 'mutation' | 'speciation' | 'institution';
  message: string;
  sigil: string;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

function idxToWorldCoord(c: number, n: number): number {
  if (!Number.isFinite(c) || !Number.isFinite(n) || n <= 1) return 0;
  return (c / (n - 1)) * 2 - 1;
}

function pickBestCellIndex(field: FieldState): number {
  const w = field.width;
  const h = field.height;
  const N = w * h;
  let bestIdx = 0;
  let best = -Infinity;

  for (let idx = 0; idx < N; idx++) {
    const v =
      field.mythic?.[idx] ??
      field.novelty?.[idx] ??
      field.cohesion?.[idx] ??
      field.tension?.[idx] ??
      0;
    const num = typeof v === 'number' && Number.isFinite(v) ? v : 0;
    if (num > best) {
      best = num;
      bestIdx = idx;
    }
  }

  return bestIdx;
}

export const runOperators = (
  micro: MicroState,
  microConfig: MicroConfig,
  matrix: InteractionMatrix,
  reconfig: ReconfigState,
  detectors: DetectorResults,
  mutationStrength: number,
  speciationRate: number,
  institutionRate: number,
  rng: SeededRNG,
  totalTime: number
): Beat | null => {
  // Check cooldown
  if (totalTime - reconfig.lastOperatorTime < 3) {
    return null;
  }

  // Decide which operator to run (weighted by rates)
  const roll = rng.next();
  
  // Matrix Mutation
  if (roll < mutationStrength && (
    detectors.borderStrength > 0.05 ||
    detectors.avgTension > 0.06 ||
    detectors.noveltyBurst ||
    detectors.oscillation > 0.08
  )) {
    reconfig.lastOperatorTime = totalTime;
    
    // Mutate 2-4 random pairs
    const pairs = rng.int(2, 4);
    const amt = typeof reconfig.mutationAmount === 'number' && Number.isFinite(reconfig.mutationAmount)
      ? reconfig.mutationAmount
      : 0.06;
    const amplitude = clamp(amt * 1.45, 0.03, 0.22);
    for (let p = 0; p < pairs; p++) {
      const i = rng.int(0, microConfig.typesCount - 1);
      const j = rng.int(0, microConfig.typesCount - 1);
      const delta = rng.range(-amplitude, amplitude);
      matrix.attract[i][j] = Math.max(-1, Math.min(1, matrix.attract[i][j] + delta));
    }

    return {
      time: totalTime,
      type: 'mutation',
      message: 'Contact patterns shift',
      sigil: '◈',
    };
  }

  // Speciation - made easier to trigger
  {
    const f = reconfig.field;
    const size = f ? (f.width * f.height) : 1296;
    const minClusters = Math.max(8, Math.floor(size * 0.01)); // ~1% of cells
    if (detectors.stableClusters > minClusters && roll < speciationRate && microConfig.typesCount < 16) {
    reconfig.lastOperatorTime = totalTime;
    
    // Add new species
    const oldCount = microConfig.typesCount;
    const newCount = oldCount + 1;
    
    // Update config FIRST
    microConfig.typesCount = newCount;
    
    // Then expand matrix
    expandMatrix(matrix, newCount, rng, microConfig.rmax);

    // Convert more particles to new type for visibility (10-20%)
    const motherType = rng.int(0, oldCount - 1);
    let converted = 0;
    const targetConversions = Math.floor(micro.count * (0.1 + rng.next() * 0.1));
    for (let i = 0; i < micro.count && converted < targetConversions; i++) {
      if (micro.type[i] === motherType && rng.next() < 0.5) {
        micro.type[i] = oldCount;
        converted++;
      }
    }

    return {
      time: totalTime,
      type: 'speciation',
      message: `⚘ Speciation! ${oldCount} → ${microConfig.typesCount} (${converted} converted)`,
      sigil: '⚘',
    };
    }
  }

  // Institution (semantic artifact)
  if ((detectors.oscillation > 0.2 || detectors.avgMythic > 0.2) && roll < institutionRate) {
    reconfig.lastOperatorTime = totalTime;
    
    // Find cell with highest mythic (fallback: novelty/cohesion/tension). Uses current field reference if available.
    let maxX = 0;
    let maxY = 0;
    const field = reconfig.field;
    if (field && field.width > 0 && field.height > 0) {
      const bestIdx = pickBestCellIndex(field);
      const cx = bestIdx % field.width;
      const cy = Math.floor(bestIdx / field.width);
      maxX = idxToWorldCoord(cx, field.width);
      maxY = idxToWorldCoord(cy, field.height);
    }

    const artifact = createArtifact(
      'Taboo',
      maxX,
      maxY,
      {
        type: 'field',
        fieldMod: {
          layer: 'mythic',
          delta: 0.1,
        },
      },
      '⊛'
    );
    reconfig.artifacts.push(artifact);

    return {
      time: totalTime,
      type: 'institution',
      message: 'A taboo spreads',
      sigil: '⊛',
    };
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH R1: Emergence-driven operators (lightweight, non-destructive)
// ─────────────────────────────────────────────────────────────────────────────

export interface EmergenceOpContext {
  micro: MicroState;
  microConfig: MicroConfig;
  matrix: InteractionMatrix;
  field: FieldState;
  reconfig: ReconfigState;
  reconfigConfig: ReconfigConfig;
  rng: SeededRNG;
  time: number;
}

export function phaseShift(ctx: EmergenceOpContext): void {
  const cfg = ctx.reconfigConfig;
  cfg.matrixAttractScale = clamp((cfg.matrixAttractScale ?? 1) * 1.05, 0.3, 1.5);
  cfg.matrixRepelScale = clamp((cfg.matrixRepelScale ?? 1) * 0.98, 0.3, 1.5);

  // Apply immediately: scale positives (attract) and negatives (repel) differently.
  const a = ctx.matrix.attract;
  for (let i = 0; i < a.length; i++) {
    const row = a[i];
    if (!row) continue;
    for (let j = 0; j < row.length; j++) {
      const v = row[j];
      if (!Number.isFinite(v)) continue;
      row[j] = clamp(v >= 0 ? v * 1.05 : v * 0.98, -1, 1);
    }
  }
}

export function fortifyBorders(ctx: EmergenceOpContext): void {
  const { field } = ctx;
  const w = field.width;
  const h = field.height;
  if (w <= 0 || h <= 0) return;
  const delta = 0.12;
  for (let idx = 0; idx < field.tension.length; idx++) {
    const x = idx % w;
    const y = Math.floor(idx / w);
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
      const v = (field.tension[idx] ?? 0) + delta;
      field.tension[idx] = clamp01(v);
    }
  }
}

export function injectNovelty(ctx: EmergenceOpContext): void {
  const { field, rng } = ctx;
  const w = field.width;
  const h = field.height;
  if (w <= 0 || h <= 0) return;

  const seeds = rng.int(3, 5);
  const delta = 0.08;
  for (let s = 0; s < seeds; s++) {
    const cx = rng.int(0, w - 1);
    const cy = rng.int(0, h - 1);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const idx = y * w + x;
        field.novelty[idx] = clamp01((field.novelty[idx] ?? 0) + delta);
      }
    }
  }
}

export function institutionOperator(ctx: EmergenceOpContext): void {
  const bestIdx = pickBestCellIndex(ctx.field);
  const cx = bestIdx % ctx.field.width;
  const cy = Math.floor(bestIdx / ctx.field.width);
  const x = idxToWorldCoord(cx, ctx.field.width);
  const y = idxToWorldCoord(cy, ctx.field.height);
  ctx.reconfig.artifacts.push(
    createArtifact(
      'Taboo',
      x,
      y,
      { type: 'field', fieldMod: { layer: 'mythic', delta: 0.1 } },
      '⊛',
    ),
  );
  ctx.reconfig.lastOperatorTime = ctx.time;
}
