// ─── Social Fields N / L / R ──────────────────────────────────────────────────
// Three low-resolution Float32Array grids over world [-1,1]²
//   N — Norma/disciplina   (conformity pressure, diffuse law)
//   L — Legitimidade/aura  (symbolic power, institutional status)
//   R — Recurso            (material/attentional wealth field)
//
// Resolution: 32×32.  All ops are O(size²) — trivially fast.

export interface SocialFields {
  n:     Float32Array;  // Norma
  l:     Float32Array;  // Legitimidade
  r:     Float32Array;  // Recurso
  size:  number;
  dirty: boolean;       // set true after step — tells renderer to rebuild cache
}

export interface SocialFieldConfig {
  decayN:   number;  // N decays quickly (needs active maintenance)
  decayL:   number;  // L decays slowly (institutions persist)
  decayR:   number;  // R maintenance cost per cell
  diffuseN: number;  // N diffusion (laws spread)
  diffuseL: number;  // L diffusion (power aura, localised)
  diffuseR: number;  // R barely spreads (geographically fixed)
  regenR:   number;  // R natural regeneration rate per cell
}

export function createSocialFields(size = 32): SocialFields {
  const r = new Float32Array(size * size);
  r.fill(0.22);  // base level — agents need to find hotspots
  const fields: SocialFields = {
    n: new Float32Array(size * size),
    l: new Float32Array(size * size),
    r,
    size,
    dirty: true,
  };
  // Default spatial variation: a few resource hotspots (comida/energia) so agents spread across the bairro
  depositR(fields, -0.6, -0.5, 0.45, 0.28);
  depositR(fields,  0.55,  0.4, 0.40, 0.25);
  depositR(fields,  0.0, -0.7, 0.35, 0.22);
  depositR(fields, -0.3,  0.65, 0.30, 0.20);
  return fields;
}

export function createSocialFieldConfig(): SocialFieldConfig {
  return {
    decayN: 0.018, decayL: 0.007, decayR: 0.004,
    diffuseN: 0.10, diffuseL: 0.05, diffuseR: 0.02,
    regenR: 0.020,
  };
}

// ── Coordinate conversion ─────────────────────────────────────────────────────

function wToG(v: number, size: number): number {
  return Math.max(0, Math.min(size - 1, ((v + 1) * 0.5 * size) | 0));
}

// ── Bilinear sample ───────────────────────────────────────────────────────────

export function sampleField(arr: Float32Array, size: number, wx: number, wy: number): number {
  const fx = (wx + 1) * 0.5 * (size - 1);
  const fy = (wy + 1) * 0.5 * (size - 1);
  const ix = Math.max(0, Math.min(size - 2, fx | 0));
  const iy = Math.max(0, Math.min(size - 2, fy | 0));
  const tx = fx - ix;
  const ty = fy - iy;
  const v00 = arr[ iy      * size + ix    ];
  const v10 = arr[ iy      * size + ix + 1];
  const v01 = arr[(iy + 1) * size + ix    ];
  const v11 = arr[(iy + 1) * size + ix + 1];
  return v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
}

export function sampleN(f: SocialFields, wx: number, wy: number): number { return sampleField(f.n, f.size, wx, wy); }
export function sampleL(f: SocialFields, wx: number, wy: number): number { return sampleField(f.l, f.size, wx, wy); }
export function sampleR(f: SocialFields, wx: number, wy: number): number { return sampleField(f.r, f.size, wx, wy); }

// ── Soft Gaussian deposit ─────────────────────────────────────────────────────
// amount can be negative (RIFT totem deposits anti-N)

export function depositField(
  arr: Float32Array, size: number,
  wx: number, wy: number,
  amount: number, radius: number,
): void {
  const cx = wToG(wx, size);
  const cy = wToG(wy, size);
  const gr = Math.max(1, Math.ceil(radius * size * 0.5));
  for (let dy = -gr; dy <= gr; dy++) {
    for (let dx = -gr; dx <= gr; dx++) {
      const gx = cx + dx;
      const gy = cy + dy;
      if (gx < 0 || gx >= size || gy < 0 || gy >= size) continue;
      const dist = Math.sqrt(dx * dx + dy * dy) / gr;
      if (dist > 1) continue;
      const w = Math.exp(-dist * dist * 3.0);
      const idx = gy * size + gx;
      arr[idx] = Math.max(0, Math.min(1, arr[idx] + amount * w));
    }
  }
}

export function depositN(f: SocialFields, wx: number, wy: number, a: number, r: number): void { depositField(f.n, f.size, wx, wy, a, r); }
export function depositL(f: SocialFields, wx: number, wy: number, a: number, r: number): void { depositField(f.l, f.size, wx, wy, a, r); }
export function depositR(f: SocialFields, wx: number, wy: number, a: number, r: number): void { depositField(f.r, f.size, wx, wy, a, r); }

// ── Step: Laplacian diffusion + decay + regen ─────────────────────────────────

const _stepBuf = new Float32Array(32 * 32 * 4); // pre-alloc for largest expected grid

function stepSingleField(
  arr:     Float32Array,
  size:    number,
  decay:   number,
  diffuse: number,
  regen:   number,
  dt:      number,
): void {
  const n2 = size * size;
  const tmp = _stepBuf.length >= n2 ? _stepBuf : new Float32Array(n2);
  const k = diffuse * dt;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = arr[y * size + x];
      let lap = -4 * c;
      lap += y > 0        ? arr[(y - 1) * size + x] : c;
      lap += y < size - 1 ? arr[(y + 1) * size + x] : c;
      lap += x > 0        ? arr[y * size + x - 1]   : c;
      lap += x < size - 1 ? arr[y * size + x + 1]   : c;
      tmp[y * size + x] = c + k * lap;
    }
  }

  const decFactor = 1 - decay * dt;
  for (let i = 0; i < n2; i++) {
    arr[i] = Math.max(0, Math.min(1, tmp[i] * decFactor + regen * dt));
  }
}

export function stepAllFields(f: SocialFields, cfg: SocialFieldConfig, dt: number): void {
  stepSingleField(f.n, f.size, cfg.decayN, cfg.diffuseN, 0,          dt);
  stepSingleField(f.l, f.size, cfg.decayL, cfg.diffuseL, 0,          dt);
  stepSingleField(f.r, f.size, cfg.decayR, cfg.diffuseR, cfg.regenR, dt);
  f.dirty = true;
}

export function resetFields(f: SocialFields): void {
  f.n.fill(0);
  f.l.fill(0);
  f.r.fill(0.28);
  f.dirty = true;
}
