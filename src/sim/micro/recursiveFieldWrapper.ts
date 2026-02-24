// Recursive Field Wrapper - Adds field recursion to existing Particle Life
// Wraps existing updateParticleLife without rewriting it

import type { MicroState, MicroConfig } from './microState';
import type { InteractionMatrix } from './matrix';
import type { RecursiveFieldState, RecursiveFieldConfig } from '../field/fieldTypes';
import { sampleField, depositField, stepField } from '../field/fieldEngine';
import { updateParticleLife, getMicroPerfStats } from './particleLife';

/**
 * Wrapper that adds recursive field to existing particle life
 * Call this INSTEAD of updateParticleLife when recursiveField is enabled
 */
export function updateParticleLifeWithField(
  state: MicroState,
  config: MicroConfig,
  matrix: InteractionMatrix,
  fieldInfluence: (x: number, y: number) => { tension: number; cohesion: number; scarcity: number },
  rngMicro: { next: () => number; range: (min: number, max: number) => number; int: (min: number, max: number) => number },
  tick: number,
  recursiveField: { field: RecursiveFieldState; cfg: RecursiveFieldConfig },
): void {
  if (!recursiveField.cfg.enabled) {
    // Just call original
    updateParticleLife(state, config, matrix, fieldInfluence, rngMicro, tick);
    return;
  }

  // Safety check
  if (!matrix || !matrix.attract || !Array.isArray(matrix.attract) || matrix.attract.length === 0) {
    updateParticleLife(state, config, matrix, fieldInfluence, rngMicro, tick);
    return;
  }

  // 1. Calculate modulation multiplier but don't modify matrix yet
  const modMult = calculateFieldModulation(state, recursiveField);

  // 2. Temporarily store original values and apply modulation
  const size = matrix.attract.length;
  const originalAttract: number[][] = Array(size);
  
  for (let i = 0; i < size; i++) {
    if (!Array.isArray(matrix.attract[i])) continue;
    originalAttract[i] = Array(matrix.attract[i].length);
    for (let j = 0; j < matrix.attract[i].length; j++) {
      originalAttract[i][j] = matrix.attract[i][j];
      matrix.attract[i][j] *= modMult;
    }
  }

  // 3. Run normal particle life
  updateParticleLife(state, config, matrix, fieldInfluence, rngMicro, tick);

  // 4. Write interactions to field AFTER
  const stats = getMicroPerfStats();
  if (stats.interactionsApplied > 0) {
    writeInteractionsToField(state, config, matrix, recursiveField);
  }

  // 5. Step field (decay, diffusion, cascade)
  stepField(recursiveField.field, recursiveField.cfg, config.dt);

  // 6. Restore original matrix values
  for (let i = 0; i < size; i++) {
    if (!originalAttract[i]) continue;
    for (let j = 0; j < originalAttract[i].length; j++) {
      matrix.attract[i][j] = originalAttract[i][j];
    }
  }
}

/**
 * Calculate field modulation multiplier
 */
function calculateFieldModulation(
  state: MicroState,
  recursiveField: { field: RecursiveFieldState; cfg: RecursiveFieldConfig },
): number {
  // Sample field at a few representative points and modulate globally
  const samplePoints = 16;
  let totalA = 0;
  let totalS = 0;
  
  for (let i = 0; i < samplePoints; i++) {
    const idx = Math.floor((i / samplePoints) * state.count);
    if (idx >= state.count) continue;
    
    const { a, s } = sampleField(recursiveField.field, recursiveField.cfg, state.x[idx], state.y[idx]);
    totalA += a;
    totalS += s;
  }
  
  const avgA = totalA / samplePoints;
  const avgS = totalS / samplePoints;
  
  // Calculate modulation multiplier
  return Math.max(0.7, Math.min(1.3, 1 + recursiveField.cfg.influenceGain * (avgA - avgS)));
}

/**
 * Write interaction patterns to field
 */
function writeInteractionsToField(
  state: MicroState,
  config: MicroConfig,
  matrix: InteractionMatrix,
  recursiveField: { field: RecursiveFieldState; cfg: RecursiveFieldConfig },
): void {
  // Sample interactions and deposit to field
  const sampleRate = 0.1; // 10% of particles
  const step = Math.max(1, Math.floor(1 / sampleRate));
  
  for (let i = 0; i < state.count; i += step) {
    const xi = state.x[i];
    const yi = state.y[i];
    const ti = state.type[i];
    
    // Check a few neighbors
    for (let j = i + 1; j < Math.min(i + 10, state.count); j++) {
      const dx = state.x[j] - xi;
      const dy = state.y[j] - yi;
      const d2 = dx * dx + dy * dy;
      
      if (d2 > 0.25 * 0.25) continue; // only close interactions
      
      const tj = state.type[j];
      
      // Matrix is 2D array, not flat
      const attract = matrix.attract[ti]?.[tj] ?? 0;
      
      // Midpoint
      const mx = (xi + state.x[j]) / 2;
      const my = (yi + state.y[j]) / 2;
      
      // Energy
      const energy = Math.min(1, Math.abs(attract) * 0.5);
      
      // Deposits
      const dc = recursiveField.cfg.writeGain * energy;
      const da = (ti === tj && attract > 0) ? recursiveField.cfg.writeGain * energy : 0;
      const ds = (ti !== tj && attract < 0) ? recursiveField.cfg.writeGain * energy * 0.8 : 0;
      
      depositField(recursiveField.field, recursiveField.cfg, mx, my, dc, da, ds, 1);
    }
  }
}
