// Field Engine - Recursive field dynamics
// Interactions write to field → field decays/diffuses → field modulates interactions

import type { RecursiveFieldState, RecursiveFieldConfig } from './fieldTypes';
import { idx } from './fieldTypes';

/**
 * Sample field at normalized position (xNorm, yNorm in [-1, 1])
 * Returns {c, a, s} values
 */
export function sampleField(
  field: RecursiveFieldState,
  cfg: RecursiveFieldConfig,
  xNorm: number,
  yNorm: number,
): { c: number; a: number; s: number } {
  if (!cfg.enabled) return { c: 0, a: 0, s: 0 };

  // Convert to grid coordinates
  const xf = ((xNorm + 1) / 2) * field.w;
  const yf = ((yNorm + 1) / 2) * field.h;
  
  // Nearest neighbor (fast)
  const x = Math.floor(xf);
  const y = Math.floor(yf);
  
  const i = idx(x, y, field.w, field.h);
  
  return {
    c: field.C[i],
    a: field.A[i],
    s: field.S[i],
  };
}

/**
 * Deposit to field at normalized position with circular brush
 * radiusCells controls spread (1 = 3x3, 2 = 5x5)
 */
export function depositField(
  field: RecursiveFieldState,
  cfg: RecursiveFieldConfig,
  xNorm: number,
  yNorm: number,
  dc: number,
  da: number,
  ds: number,
  radiusCells: number = 1,
): void {
  if (!cfg.enabled) return;

  // Convert to grid coordinates
  const xc = Math.floor(((xNorm + 1) / 2) * field.w);
  const yc = Math.floor(((yNorm + 1) / 2) * field.h);
  
  // Circular brush
  const r2 = radiusCells * radiusCells;
  
  for (let dy = -radiusCells; dy <= radiusCells; dy++) {
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      
      const falloff = 1 - Math.sqrt(d2 / r2);
      const i = idx(xc + dx, yc + dy, field.w, field.h);
      
      field.C[i] = Math.min(cfg.clampMax, field.C[i] + dc * falloff);
      field.A[i] = Math.min(cfg.clampMax, field.A[i] + da * falloff);
      field.S[i] = Math.min(cfg.clampMax, field.S[i] + ds * falloff);
    }
  }
}

/**
 * Step field: decay, diffusion, global cascade
 */
export function stepField(
  field: RecursiveFieldState,
  cfg: RecursiveFieldConfig,
  dt: number,
): void {
  if (!cfg.enabled) return;

  const w = field.w;
  const h = field.h;
  const size = w * h;

  // 1. Decay (exponential)
  const decayFactor = Math.exp(-cfg.decay * dt);
  for (let i = 0; i < size; i++) {
    field.C[i] *= decayFactor;
    field.A[i] *= decayFactor;
    field.S[i] *= decayFactor;
  }

  // 2. Diffusion (simple 4-neighbor average)
  const diffWeight = cfg.diffusion * dt;
  
  // Diffuse C
  diffuseChannel(field.C, field.tmp, w, h, diffWeight);
  
  // Diffuse A
  diffuseChannel(field.A, field.tmp, w, h, diffWeight);
  
  // Diffuse S
  diffuseChannel(field.S, field.tmp, w, h, diffWeight);

  // 3. Global Mix (non-local cascade)
  if (cfg.globalMix > 0) {
    const mixWeight = cfg.globalMix * dt;
    
    // Calculate means
    let meanC = 0;
    let meanA = 0;
    let meanS = 0;
    for (let i = 0; i < size; i++) {
      meanC += field.C[i];
      meanA += field.A[i];
      meanS += field.S[i];
    }
    meanC /= size;
    meanA /= size;
    meanS /= size;
    
    // Pull towards mean
    for (let i = 0; i < size; i++) {
      field.C[i] = lerp(field.C[i], meanC, mixWeight);
      field.A[i] = lerp(field.A[i], meanA, mixWeight);
      field.S[i] = lerp(field.S[i], meanS, mixWeight);
    }
  }
}

/**
 * Diffuse a single channel using 4-neighbor averaging
 */
function diffuseChannel(
  src: Float32Array,
  tmp: Float32Array,
  w: number,
  h: number,
  weight: number,
): void {
  // Copy to tmp
  for (let i = 0; i < src.length; i++) {
    tmp[i] = src[i];
  }
  
  // Diffuse
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w, h);
      
      const n = tmp[idx(x, y - 1, w, h)];
      const s = tmp[idx(x, y + 1, w, h)];
      const e = tmp[idx(x + 1, y, w, h)];
      const w2 = tmp[idx(x - 1, y, w, h)];
      
      const avg = (n + s + e + w2) / 4;
      src[i] = lerp(tmp[i], avg, weight);
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Get global field stats (for UI/Chronicle)
 */
export function getFieldStats(field: RecursiveFieldState): {
  meanC: number;
  meanA: number;
  meanS: number;
  maxC: number;
  maxA: number;
  maxS: number;
} {
  const size = field.C.length;
  let meanC = 0;
  let meanA = 0;
  let meanS = 0;
  let maxC = 0;
  let maxA = 0;
  let maxS = 0;
  
  for (let i = 0; i < size; i++) {
    meanC += field.C[i];
    meanA += field.A[i];
    meanS += field.S[i];
    maxC = Math.max(maxC, field.C[i]);
    maxA = Math.max(maxA, field.A[i]);
    maxS = Math.max(maxS, field.S[i]);
  }
  
  return {
    meanC: meanC / size,
    meanA: meanA / size,
    meanS: meanS / size,
    maxC,
    maxA,
    maxS,
  };
}
