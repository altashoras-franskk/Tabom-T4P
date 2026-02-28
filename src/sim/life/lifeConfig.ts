import type { MicroConfig } from '../micro/microState';

export type LifeMode = 'OFF' | 'METABOLIC' | 'EVOLUTIVE' | 'FULL';

export type LifeConfig = {
  mode: LifeMode;

  // Food (resource nodes / prey)
  foodEnabled: boolean;
  foodRatio: number;           // 0..0.5
  foodType: number;            // always 255

  // Energy system
  energyEnabled: boolean;
  energyDecay: number;         // per frame
  energyFeedRate: number;      // gain from attraction feeding
  energyReproThreshold: number;

  // Evolution / mutation (single dial)
  mutationDial: number;        // 0..1
  mutationAmount: number;      // derived
  mutationRate: number;        // derived
  typeStability: number;       // derived

  // Reconfiguration coupling (macro mutation)
  reconfigEnabled: boolean;
  reconfigRate: number;        // derived from dial
  reconfigAmount: number;      // derived from dial
};

export const DEFAULT_LIFE: LifeConfig = {
  // Default: stable. Evolution starts when user explicitly dials it up.
  mode: 'METABOLIC',
  foodEnabled: false,
  foodRatio: 0.15,
  foodType: 255,
  energyEnabled: false,
  energyDecay: 0.002,
  energyFeedRate: 0.04,
  energyReproThreshold: 2.0,
  mutationDial: 0.05,
  mutationAmount: 0.08,
  mutationRate: 0.0008,
  typeStability: 0.985,
  reconfigEnabled: false,
  reconfigRate: 0.08,
  reconfigAmount: 0.06,
};

export function applyLifeDial(life: LifeConfig): LifeConfig {
  // dial → usable values (tuned to feel real)
  const d = clamp01(life.mutationDial);

  // micro mutation
  const mutationRate = lerp(0.00005, 0.0035, d);    // per frame-ish
  const typeStability = lerp(0.999, 0.955, d);      // lower = more mutational drift
  const mutationAmount = lerp(0.02, 0.18, d);       // used by reconfig and species mutation

  // energy child mutation
  // (we'll map in App to energyConfig.mutationChance)
  // reconfig coupling
  const reconfigRate = lerp(0.02, 0.20, d);
  const reconfigAmount = lerp(0.01, 0.14, d);

  return { ...life, mutationRate, typeStability, mutationAmount, reconfigRate, reconfigAmount };
}

function clamp01(v: number) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
