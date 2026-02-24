// Sociogenesis Physics Adaptation
// When entering Sociogenesis Lab, modify physics to enhance social dynamics

import type { MicroConfig } from '../micro/microState';
import type { InteractionMatrix } from '../micro/matrix';
import type { SociogenesisState } from './sociogenesisTypes';
import type { SocioLens } from './sociogenesisTypes';

/**
 * Adapt physics config for sociogenesis mode
 * Make interactions more visible, slower, and cluster-prone
 */
export function adaptPhysicsForSociogenesis(config: MicroConfig): void {
  // Slow down for better observation
  config.friction = Math.max(config.friction, 0.88);
  config.speedClamp = Math.min(config.speedClamp, 0.12);
  
  // Increase interaction range for better clustering
  config.rmax = Math.max(config.rmax, 0.14);
  
  // Moderate forces for stability
  config.force = Math.min(Math.max(config.force, 1.0), 1.5);
}

/**
 * Restore original physics (when leaving sociogenesis mode)
 */
export function restoreOriginalPhysics(config: MicroConfig, backup: Partial<MicroConfig>): void {
  Object.assign(config, backup);
}

/**
 * Apply emergence lens - applies TEMPORARY per-tick modulation to attract values.
 * The modulation is small and bounded so it creates visible effects
 * without blowing up the matrix over time.
 * Each call adds a small delta that decays naturally via friction/physics.
 */
export function applyEmergenceLens(
  matrix: InteractionMatrix,
  lens: SocioLens,
  state: SociogenesisState,
): void {
  if (lens === 'off') return;

  const size = matrix.attract.length;
  const dt = 0.002;

  switch (lens) {
    case 'culture': {
      // Boost same-type cohesion (proxy: memes start aligned with types)
      for (let i = 0; i < size; i++) {
        matrix.attract[i][i] = Math.min(1.5, matrix.attract[i][i] + dt * 3);
      }
      break;
    }
    case 'field': {
      // Amplify all interactions slightly
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const sign = Math.sign(matrix.attract[i][j]);
          matrix.attract[i][j] = Math.max(-1.5, Math.min(1.5, matrix.attract[i][j] + sign * dt * 2));
        }
      }
      break;
    }
    case 'ritual': {
      // Increase same-type cohesion slightly
      for (let i = 0; i < size; i++) {
        matrix.attract[i][i] = Math.min(1.5, matrix.attract[i][i] + dt * 4);
      }
      break;
    }
    case 'law': {
      // Dampen all interactions toward zero (conformity)
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          matrix.attract[i][j] *= (1 - dt * 3);
        }
      }
      break;
    }
    case 'events': {
      // Amplify extremes (chaos amplification)
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          if (Math.abs(matrix.attract[i][j]) > 0.3) {
            const sign = Math.sign(matrix.attract[i][j]);
            matrix.attract[i][j] = Math.max(-1.5, Math.min(1.5, matrix.attract[i][j] + sign * dt * 4));
          }
        }
      }
      break;
    }
  }
}

/**
 * Apply tribe effects - tribes modulate interactions between their members.
 * Uses small per-tick deltas to avoid matrix blowup.
 */
export function applyTribeEffects(
  matrix: InteractionMatrix,
  state: SociogenesisState,
): void {
  if (state.tribes.length === 0) return;

  const dt = 0.001; // tiny per-tick delta

  for (const tribe of state.tribes) {
    const typeId = tribe.typeId;
    if (typeId >= matrix.attract.length) continue;

    // Boost same-type attraction slightly
    const cohesionDelta = dt * (1 + tribe.ethos.cohesionBias);
    matrix.attract[typeId][typeId] += cohesionDelta;
    matrix.attract[typeId][typeId] = Math.min(1.5, matrix.attract[typeId][typeId]);

    // Slight tribalism: reduce attraction to other types
    const tensionDelta = dt * (0.5 + tribe.ethos.tensionBias);
    for (let j = 0; j < matrix.attract.length; j++) {
      if (j !== typeId && matrix.attract[typeId][j] > -1) {
        matrix.attract[typeId][j] -= tensionDelta;
        matrix.attract[typeId][j] = Math.max(-1.5, matrix.attract[typeId][j]);
      }
    }
  }
}