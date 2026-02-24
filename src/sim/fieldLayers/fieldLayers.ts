export type FieldLayerName =
  | 'nutrient'
  | 'tension'
  | 'memory'
  | 'entropy'
  | 'sigilBond'
  | 'sigilRift'
  | 'sigilBloom'
  | 'sigilOath';

export type FieldLayersConfig = {
  size: number;           // grid side (e.g. 64)
  diffusion: Record<FieldLayerName, number>; // 0..1
  decay: Record<FieldLayerName, number>;     // 0..1 per second
  injection: {
    nutrientFromFood: number;     // how much nutrient food adds
    nutrientFromAgents: number;   // how much agents add (optional)
    tensionFromCrowding: number;
    memoryFromMotion: number;
    entropyFromInstability: number;
  };
  clamps: Record<FieldLayerName, { min: number; max: number }>;
  delays: Record<FieldLayerName, number>; // time constant in seconds (0 = instant)
};

export type FieldLayers = {
  size: number;
  layers: Record<FieldLayerName, Float32Array>;
  next: Record<FieldLayerName, Float32Array>;
  // optional scratch for diffusion
  scratch: Float32Array;
};

export function createFieldLayers(size: number): FieldLayers {
  const make = () => new Float32Array(size * size);
  return {
    size,
    layers: {
      nutrient: make(),
      tension: make(),
      memory: make(),
      entropy: make(),
      sigilBond: make(),
      sigilRift: make(),
      sigilBloom: make(),
      sigilOath: make(),
    },
    next: {
      nutrient: make(),
      tension: make(),
      memory: make(),
      entropy: make(),
      sigilBond: make(),
      sigilRift: make(),
      sigilBloom: make(),
      sigilOath: make(),
    },
    scratch: make(),
  };
}

function idxOf(x: number, y: number, size: number) {
  return y * size + x;
}

// map world [-1..1] to grid index
export function worldToGrid(x: number, y: number, size: number) {
  const nx = Math.max(0, Math.min(0.9999, (x + 1) * 0.5));
  const ny = Math.max(0, Math.min(0.9999, (y + 1) * 0.5));
  const gx = Math.min(size - 1, (nx * size) | 0);
  const gy = Math.min(size - 1, (ny * size) | 0);
  return { gx, gy, gi: idxOf(gx, gy, size) };
}

export function sampleLayer(layers: FieldLayers, name: FieldLayerName, x: number, y: number) {
  const { gi } = worldToGrid(x, y, layers.size);
  return layers.layers[name][gi];
}

export function addToLayer(layers: FieldLayers, name: FieldLayerName, x: number, y: number, amount: number) {
  const { gi } = worldToGrid(x, y, layers.size);
  layers.layers[name][gi] += amount;
}

// 4-neighbor diffusion + decay + delayed response (inertia)
export function updateFieldLayers(layers: FieldLayers, cfg: FieldLayersConfig, dt: number) {
  const S = layers.size;
  const N = S * S;

  const names: FieldLayerName[] = [
    'nutrient',
    'tension',
    'memory',
    'entropy',
    'sigilBond',
    'sigilRift',
    'sigilBloom',
    'sigilOath',
  ];

  for (const name of names) {
    const src = layers.layers[name];
    const dst = layers.next[name];

    const diff = cfg.diffusion[name];
    const dec  = cfg.decay[name];

    // diffusion + decay
    for (let y = 0; y < S; y++) {
      const y0 = y === 0 ? 0 : y - 1;
      const y1 = y === S - 1 ? S - 1 : y + 1;
      for (let x = 0; x < S; x++) {
        const x0 = x === 0 ? 0 : x - 1;
        const x1 = x === S - 1 ? S - 1 : x + 1;

        const i  = y * S + x;
        const c  = src[i];

        const n  = src[y0 * S + x];
        const s  = src[y1 * S + x];
        const w  = src[y * S + x0];
        const e  = src[y * S + x1];

        // laplacian-ish
        const lap = (n + s + w + e - 4 * c);
        const v = c + diff * lap;

        // decay per second
        const v2 = v * Math.exp(-dec * dt);

        dst[i] = v2;
      }
    }

    // delayed response: blend toward dst using time constant
    const tau = cfg.delays[name];
    if (tau > 0.0001) {
      const a = 1 - Math.exp(-dt / tau);
      for (let i = 0; i < N; i++) {
        src[i] = src[i] + (dst[i] - src[i]) * a;
      }
    } else {
      // immediate
      src.set(dst);
    }

    // clamp
    const { min, max } = cfg.clamps[name];
    for (let i = 0; i < N; i++) {
      const v = src[i];
      src[i] = v < min ? min : (v > max ? max : v);
    }
  }
}
