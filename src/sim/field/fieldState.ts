// Field-level state (tension, cohesion, scarcity, novelty, mythic)
export interface FieldState {
  width: number;
  height: number;
  tension: Float32Array;
  cohesion: Float32Array;
  scarcity: Float32Array;
  novelty: Float32Array;
  mythic: Float32Array;
}

export interface FieldConfig {
  diffusion: number;
  decay: number;
  depositStrength: number;
  influenceStrength: number;
}

export const createFieldState = (width: number, height: number): FieldState => {
  const size = width * height;
  return {
    width,
    height,
    tension: new Float32Array(size),
    cohesion: new Float32Array(size),
    scarcity: new Float32Array(size),
    novelty: new Float32Array(size),
    mythic: new Float32Array(size),
  };
};

export const createFieldConfig = (): FieldConfig => ({
  diffusion: 0.15,
  decay: 0.02,
  depositStrength: 1.0,
  influenceStrength: 0.5,
});

export const clearField = (state: FieldState): void => {
  state.tension.fill(0);
  state.cohesion.fill(0);
  state.scarcity.fill(0);
  state.novelty.fill(0);
  state.mythic.fill(0);
};

export const getFieldIndex = (x: number, y: number, width: number, height: number): number => {
  const gx = Math.floor(((x + 1) / 2) * width);
  const gy = Math.floor(((y + 1) / 2) * height);
  const cx = Math.max(0, Math.min(width - 1, gx));
  const cy = Math.max(0, Math.min(height - 1, gy));
  return cy * width + cx;
};

export const sampleField = (
  state: FieldState,
  x: number,
  y: number
): { tension: number; cohesion: number; scarcity: number; novelty: number; mythic: number } => {
  const idx = getFieldIndex(x, y, state.width, state.height);
  return {
    tension: state.tension[idx],
    cohesion: state.cohesion[idx],
    scarcity: state.scarcity[idx],
    novelty: state.novelty[idx],
    mythic: state.mythic[idx],
  };
};

export const depositField = (
  state: FieldState,
  x: number,
  y: number,
  layer: 'tension' | 'cohesion' | 'scarcity' | 'novelty' | 'mythic',
  amount: number
): void => {
  const idx = getFieldIndex(x, y, state.width, state.height);
  if (idx >= 0 && idx < state[layer].length) {
    state[layer][idx] = Math.min(1, state[layer][idx] + amount);
  }
};

// Multi-layer deposit with radius
export const depositFieldRadius = (
  state: FieldState,
  x: number,
  y: number,
  radius: number,
  tension: number,
  cohesion: number,
  scarcity: number,
  novelty: number,
  mythic: number
): void => {
  // Deposit in a circular area
  const steps = Math.max(3, Math.floor(radius * state.width * 0.5));
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const r = radius * Math.random(); // Random radius for smoother distribution
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    
    const idx = getFieldIndex(px, py, state.width, state.height);
    if (idx >= 0 && idx < state.tension.length) {
      const falloff = 1 - (r / radius);
      if (tension !== 0) state.tension[idx] = Math.min(1, state.tension[idx] + tension * falloff);
      if (cohesion !== 0) state.cohesion[idx] = Math.min(1, state.cohesion[idx] + cohesion * falloff);
      if (scarcity !== 0) state.scarcity[idx] = Math.min(1, state.scarcity[idx] + scarcity * falloff);
      if (novelty !== 0) state.novelty[idx] = Math.min(1, state.novelty[idx] + novelty * falloff);
      if (mythic !== 0) state.mythic[idx] = Math.min(1, state.mythic[idx] + mythic * falloff);
    }
  }
};
