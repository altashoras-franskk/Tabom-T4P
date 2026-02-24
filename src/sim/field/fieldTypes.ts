// Field Types - 3-channel recursive field
// C = Charge/memory, A = Affinity/glue, S = Stress/tension

export interface RecursiveFieldConfig {
  enabled: boolean;
  gridW: number;
  gridH: number;
  writeGain: number;      // how much interaction writes to field
  decay: number;          // per second
  diffusion: number;      // 0..0.35
  influenceGain: number;  // how much field affects interactions
  globalMix: number;      // non-local cascade (global averaging)
  clampMax: number;
}

export interface RecursiveFieldState {
  C: Float32Array;  // Charge / general memory
  A: Float32Array;  // Affinity / cohesion
  S: Float32Array;  // Stress / tension
  tmp: Float32Array; // diffusion buffer
  w: number;
  h: number;
}

export function createRecursiveFieldConfig(): RecursiveFieldConfig {
  return {
    enabled: true,
    gridW: 96,
    gridH: 96,
    writeGain: 0.08,
    decay: 0.04,
    diffusion: 0.18,
    influenceGain: 0.22,
    globalMix: 0.04,
    clampMax: 1.0,
  };
}

export function createRecursiveFieldState(cfg: RecursiveFieldConfig): RecursiveFieldState {
  const size = cfg.gridW * cfg.gridH;
  return {
    C: new Float32Array(size),
    A: new Float32Array(size),
    S: new Float32Array(size),
    tmp: new Float32Array(size),
    w: cfg.gridW,
    h: cfg.gridH,
  };
}

export function idx(x: number, y: number, w: number, h: number): number {
  // Wrap around boundaries
  const xi = ((x % w) + w) % w;
  const yi = ((y % h) + h) % h;
  return yi * w + xi;
}
