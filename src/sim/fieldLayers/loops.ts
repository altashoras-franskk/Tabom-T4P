import type { FieldLayers } from './fieldLayers';

export type LoopMetrics = {
  avgNutrient: number;
  avgTension: number;
  avgMemory: number;
  avgEntropy: number;

  // simple derived loop signals
  scarcity: number;     // 0..1 from low nutrient
  cohesion: number;     // 0..1 from memory vs entropy
  volatility: number;   // 0..1 from tension+entropy
};

export function computeLoopMetrics(l: FieldLayers): LoopMetrics {
  const n = l.size * l.size;
  let aN = 0, aT = 0, aM = 0, aE = 0;

  const N = l.layers.nutrient;
  const T = l.layers.tension;
  const M = l.layers.memory;
  const E = l.layers.entropy;

  for (let i = 0; i < n; i++) {
    aN += N[i];
    aT += T[i];
    aM += M[i];
    aE += E[i];
  }
  aN /= n; aT /= n; aM /= n; aE /= n;

  const scarcity = clamp01(1 - aN);                 // nutrient low => scarcity high
  const cohesion = clamp01(aM * 0.9 - aE * 0.7);    // memory beats entropy => cohesion
  const volatility = clamp01(aT * 0.8 + aE * 0.8);  // tension+entropy

  return { avgNutrient: aN, avgTension: aT, avgMemory: aM, avgEntropy: aE, scarcity, cohesion, volatility };
}

function clamp01(v: number) { return v < 0 ? 0 : v > 1 ? 1 : v; }
