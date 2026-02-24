// Economy-Lite: types & factories
// Integrates with existing Field (C/A/S) and Particle energy

export const ECONOMY_GRID_W = 32;
export const ECONOMY_GRID_H = 32;

export interface EconomyConfig {
  enabled: boolean;
  resourceMode: 'STATIC' | 'FIELD_DERIVED';
  resourceRegen: number;    // regen/s per cell toward static base  (default 0.06)
  resourceHarvest: number;  // harvest/s when in rich cell           (default 0.08)
  metabolism: number;       // energy drain/s                        (default 0.015)
  claimGain: number;        // claim strength added/s by presence    (default 0.12)
  claimDecay: number;       // claim decay /s                        (default 0.02)
  claimDiffusion: number;   // neighbour spread rate (0..1)          (default 0.08)
  giniAlert: number;        // Gini coefficient alert threshold       (default 0.45)
}

export interface EconomyState {
  R: Float32Array;              // resource field [gridW × gridH] 0..1
  R_static: Float32Array;       // static base (Gaussian hotspots generated once)
  claimOwner: Int16Array;       // owner groupId per cell (-1 = neutral)
  claimStrength: Float32Array;  // claim intensity 0..1 per cell
  tmp: Float32Array;            // scratch for diffusion
  gridW: number;
  gridH: number;
}

export interface EconomyMetrics {
  meanEnergy: number;       // average agent energy 0..1
  gini: number;             // Gini coefficient 0..1
  scarcityRatio: number;    // fraction of cells with R < 0.25
  dominantGroup: number;    // memeId / type with most cells (-1 = none)
  territoryShare: number;   // dominant group's share of claimed cells
  fatigueCount: number;     // agents with energy < 0.1
  famineConsecutive: number;// consecutive 2-s ticks with meanEnergy < 0.2
}

export function createEconomyConfig(): EconomyConfig {
  return {
    enabled: false,
    resourceMode: 'FIELD_DERIVED',
    resourceRegen:   0.06,
    resourceHarvest: 0.08,
    metabolism:      0.015,
    claimGain:       0.12,
    claimDecay:      0.02,
    claimDiffusion:  0.08,
    giniAlert:       0.45,
  };
}

export function createEconomyState(): EconomyState {
  const W    = ECONOMY_GRID_W;
  const H    = ECONOMY_GRID_H;
  const size = W * H;
  return {
    R:             new Float32Array(size).fill(0.25),
    R_static:      new Float32Array(size).fill(0.25),
    claimOwner:    new Int16Array(size).fill(-1),
    claimStrength: new Float32Array(size),
    tmp:           new Float32Array(size),
    gridW:         W,
    gridH:         H,
  };
}

export function createEconomyMetrics(): EconomyMetrics {
  return {
    meanEnergy:        0.5,
    gini:              0,
    scarcityRatio:     0,
    dominantGroup:     -1,
    territoryShare:    0,
    fatigueCount:      0,
    famineConsecutive: 0,
  };
}

// ── Economy events returned from step functions ──
export interface EconomyEvent {
  icon:    string;
  message: string;
  color:   string;
}
