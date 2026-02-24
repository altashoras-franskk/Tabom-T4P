// Field update: diffusion + decay
import { FieldState, FieldConfig } from './fieldState';

const diffuseLayer = (
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  diffusion: number
): void => {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      let sum = src[idx] * (1 - diffusion);
      let count = 1;

      // 4-neighbor diffusion
      if (x > 0) { sum += src[idx - 1] * diffusion * 0.25; }
      if (x < width - 1) { sum += src[idx + 1] * diffusion * 0.25; }
      if (y > 0) { sum += src[idx - width] * diffusion * 0.25; }
      if (y < height - 1) { sum += src[idx + width] * diffusion * 0.25; }

      dst[idx] = sum;
    }
  }
};

const decayLayer = (layer: Float32Array, decay: number): void => {
  for (let i = 0; i < layer.length; i++) {
    layer[i] = Math.max(0, layer[i] - decay);
  }
};

const tempBuffer = new Map<number, Float32Array>();

export const updateField = (state: FieldState, config: FieldConfig): void => {
  const size = state.width * state.height;
  
  if (!tempBuffer.has(size)) {
    tempBuffer.set(size, new Float32Array(size));
  }
  const temp = tempBuffer.get(size)!;

  // Diffuse each layer
  diffuseLayer(state.tension, temp, state.width, state.height, config.diffusion);
  state.tension.set(temp);

  diffuseLayer(state.cohesion, temp, state.width, state.height, config.diffusion);
  state.cohesion.set(temp);

  diffuseLayer(state.scarcity, temp, state.width, state.height, config.diffusion);
  state.scarcity.set(temp);

  diffuseLayer(state.novelty, temp, state.width, state.height, config.diffusion);
  state.novelty.set(temp);

  diffuseLayer(state.mythic, temp, state.width, state.height, config.diffusion);
  state.mythic.set(temp);

  // Decay
  decayLayer(state.tension, config.decay);
  decayLayer(state.cohesion, config.decay);
  decayLayer(state.scarcity, config.decay);
  decayLayer(state.novelty, config.decay);
  decayLayer(state.mythic, config.decay);
};
