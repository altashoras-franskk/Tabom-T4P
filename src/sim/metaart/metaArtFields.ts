// ─── Meta-Arte: Field Grid ─────────────────────────────────────────────────
import type { FieldGrid, DNA } from './metaArtTypes';

const FIELD_SIZE = 48;

export function createFieldGrid(): FieldGrid {
  const n = FIELD_SIZE * FIELD_SIZE;
  return {
    size: FIELD_SIZE,
    flowX:    new Float32Array(n),
    flowY:    new Float32Array(n),
    density:  new Float32Array(n),
    pressure: new Float32Array(n),
    memory:   new Float32Array(n),
    symbol:   new Float32Array(n),
    mask:     new Float32Array(n),
    interactionMatrix: new Float32Array(36), // 6×6, filled later
  };
}

function seededRng(seed: number): () => number {
  let s = (Math.abs(seed | 0) % 233280) || 1;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// Simple deterministic noise helper — returns [-1, 1] (centered, no gravitational bias)
function noise2(x: number, y: number, seed: number): number {
  const sv = seed % 1000; // normalize seed to avoid systematic bias
  const s = Math.sin(x * 127.1 + sv * 0.311) * 43758.5453;
  const t = Math.sin(y * 269.5 + sv * 0.183) * 43758.5453;
  return (s - Math.floor(s) - 0.5) + (t - Math.floor(t) - 0.5); // range ≈ [-1, 1]
}

export function generateFlowField(grid: FieldGrid, dna: DNA, seed: number): void {
  const { structure, coherence, entropy, flow: flowG, symmetry } = dna.genes;
  const S = grid.size;
  const sv = (seed % 6283) * 0.001; // normalize seed → [0, 6.28] for phase

  for (let gy = 0; gy < S; gy++) {
    for (let gx = 0; gx < S; gx++) {
      const nx = gx / S;
      const ny = gy / S;
      let angle: number;

      if (structure > 0.80) {
        const q = Math.round(nx * 4 * structure) % 4;
        angle = (q * Math.PI / 2) + ny * flowG * Math.PI * 0.3;
      } else if (symmetry > 0.65) {
        const dx = nx - 0.5, dy = ny - 0.5;
        const baseAngle = Math.atan2(dy, dx);
        const r = Math.sqrt(dx * dx + dy * dy);
        angle = baseAngle + Math.PI / 2
          + Math.sin(r * (6 + coherence * 8) + sv) * flowG * 1.5;
      } else if (entropy > 0.80) {
        angle = noise2(nx + sv * 0.1, ny + sv * 0.1, seed) * Math.PI * 3;
      } else {
        const f1 = 2 + coherence * 3;
        const f2 = f1 * 1.8;
        angle = (
          Math.sin(nx * f1 + sv) * Math.cos(ny * f1 + sv * 0.7) * Math.PI * 2 +
          Math.cos(nx * f2 - ny * f2 + sv * 0.5) * flowG * Math.PI +
          noise2(nx + sv * 0.08, ny + sv * 0.06, seed) * entropy * Math.PI  // halved → no bias
        );
      }

      const idx = gy * S + gx;
      grid.flowX[idx] = Math.cos(angle);
      grid.flowY[idx] = Math.sin(angle);
    }
  }
}

// Build the 6×6 Particle Life interaction matrix from DNA genes + seed
// isolate = true → off-diagonal entries are zeroed: species only interact with their own kind
export function buildInteractionMatrix(dna: DNA, seed: number, isolate = false): Float32Array {
  const rng = seededRng((Math.abs(seed | 0) ^ 0xDEAD) % 233280 || 1);
  const mat = new Float32Array(36);
  const { entropy, coherence, fragmentation, contrast, rhythm, structure } = dna.genes;

  // Archetype base matrix — asymmetric pairs create orbital/chase dynamics
  const ARCHETYPE: number[][] = [
    //  →0     →1     →2     →3     →4     →5
    [ 0.35, -0.25,  0.15, -0.50,  0.40,  0.05],  // 0: luminous
    [ 0.30,  0.20, -0.30,  0.10, -0.15,  0.35],  // 1: shadowed
    [ 0.10, -0.15,  0.25,  0.30, -0.20,  0.10],  // 2: flowing
    [-0.45,  0.15, -0.20, -0.10,  0.50, -0.35],  // 3: expander
    [ 0.55, -0.25,  0.15,  0.30,  0.15,  0.00],  // 4: magnetic
    [ 0.05,  0.35, -0.10, -0.30,  0.05,  0.40],  // 5: glitch
  ];

  // Seeded permutation: increases macro-variety without destabilizing the system.
  const perm = [0, 1, 2, 3, 4, 5];
  for (let i = perm.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp;
  }
  const baseFlip = rng() < 0.5 ? 1 : -1;
  const baseSkew = (rng() - 0.5) * 0.18; // subtle asymmetry bias

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const self = (i === j);

      // ── ISOLATION MODE: species only see themselves ──────────────────────
      if (isolate && !self) {
        // Consume the RNG to keep seed behavior consistent
        rng(); rng();
        mat[i * 6 + j] = 0;
        continue;
      }

      let val: number;

      if (isolate && self) {
        // In isolated mode: strong self-attraction for clean chapado clusters
        val = 0.65 + rng() * 0.25;
      } else if (structure > 0.82) {
        val = self ? 0.55 + rng() * 0.3 : -(0.12 + rng() * 0.22);
      } else if (coherence > 0.80 && entropy < 0.28) {
        val = self ? 0.75 + rng() * 0.22 : (rng() - 0.72) * 0.18;
      } else if (fragmentation > 0.85) {
        val = self ? 0.4 + rng() * 0.5 : (rng() - 0.5) * 0.08;
      } else if (entropy > 0.82) {
        val = (rng() - 0.5) * 2.2;
      } else {
        const base = (ARCHETYPE[perm[i]][perm[j]] * baseFlip) + baseSkew * ((i - j) / 5);
        const noise = (rng() - 0.5) * entropy * 0.9;
        const scale = 0.35 + coherence * 0.55 + contrast * 0.35;
        const fragBias = self ? 0 : -fragmentation * 0.28;
        val = base * scale + noise + fragBias;
      }

      val += (rng() - 0.5) * rhythm * 0.12;
      mat[i * 6 + j] = val;
    }
  }
  return mat;
}

export function sampleFlowAt(grid: FieldGrid, nx: number, ny: number): { fx: number; fy: number } {
  const S = grid.size;
  const gx = Math.max(0, Math.min(S - 1, Math.floor(nx * S)));
  const gy = Math.max(0, Math.min(S - 1, Math.floor(ny * S)));
  const idx = gy * S + gx;
  return { fx: grid.flowX[idx], fy: grid.flowY[idx] };
}

export function depositDensity(grid: FieldGrid, nx: number, ny: number, amount: number): void {
  const S = grid.size;
  const gx = Math.max(0, Math.min(S - 1, Math.floor(nx * S)));
  const gy = Math.max(0, Math.min(S - 1, Math.floor(ny * S)));
  const idx = gy * S + gx;
  grid.density[idx] = Math.min(1, grid.density[idx] + amount);
  grid.memory[idx]  = Math.min(1, grid.memory[idx]  + amount * 0.3);
}

export function applyToolToField(
  grid: FieldGrid,
  nx: number, ny: number,
  radius: number,
  kind: 'attractor' | 'repulsor' | 'flow_comb' | 'vortex' | 'solve' | 'coagula',
  strength: number,
  angle = 0
): void {
  const S = grid.size;
  const gr = Math.ceil(radius * S);
  const cgx = Math.floor(nx * S);
  const cgy = Math.floor(ny * S);

  for (let dy = -gr; dy <= gr; dy++) {
    for (let dx = -gr; dx <= gr; dx++) {
      const gx = cgx + dx;
      const gy = cgy + dy;
      if (gx < 0 || gy < 0 || gx >= S || gy >= S) continue;
      const d = Math.sqrt(dx * dx + dy * dy) / (gr + 0.1);
      if (d > 1) continue;
      const falloff = (1 - d) * (1 - d) * strength;
      const idx = gy * S + gx;

      switch (kind) {
        case 'attractor': {
          const ax = (cgx - gx) / (S * 0.01 + Math.abs(cgx - gx));
          const ay = (cgy - gy) / (S * 0.01 + Math.abs(cgy - gy));
          grid.flowX[idx] = grid.flowX[idx] * (1 - falloff * 0.5) + ax * falloff * 0.5;
          grid.flowY[idx] = grid.flowY[idx] * (1 - falloff * 0.5) + ay * falloff * 0.5;
          break;
        }
        case 'repulsor': {
          const rx = (gx - cgx) / (S * 0.01 + Math.abs(gx - cgx));
          const ry = (gy - cgy) / (S * 0.01 + Math.abs(gy - cgy));
          grid.flowX[idx] = grid.flowX[idx] * (1 - falloff * 0.5) + rx * falloff * 0.5;
          grid.flowY[idx] = grid.flowY[idx] * (1 - falloff * 0.5) + ry * falloff * 0.5;
          break;
        }
        case 'flow_comb':
          grid.flowX[idx] = grid.flowX[idx] * (1 - falloff) + Math.cos(angle) * falloff;
          grid.flowY[idx] = grid.flowY[idx] * (1 - falloff) + Math.sin(angle) * falloff;
          break;
        case 'vortex': {
          const vx = -(gy - cgy) / (S + 1);
          const vy = (gx - cgx) / (S + 1);
          const len = Math.sqrt(vx * vx + vy * vy) + 0.0001;
          grid.flowX[idx] = grid.flowX[idx] * (1 - falloff * 0.6) + (vx / len) * falloff * 0.6;
          grid.flowY[idx] = grid.flowY[idx] * (1 - falloff * 0.6) + (vy / len) * falloff * 0.6;
          break;
        }
        case 'solve':
          grid.density[idx]  *= (1 - falloff * 0.15);
          grid.pressure[idx] *= (1 - falloff * 0.2);
          grid.memory[idx]   *= (1 - falloff * 0.05);
          break;
        case 'coagula':
          grid.density[idx]  = Math.min(1, grid.density[idx]  + falloff * 0.1);
          grid.pressure[idx] = Math.min(1, grid.pressure[idx] + falloff * 0.15);
          grid.memory[idx]   = Math.min(1, grid.memory[idx]   + falloff * 0.08);
          break;
      }
    }
  }
}

export function diffuseField(grid: FieldGrid, dna: DNA): void {
  const { memory, coherence } = dna.genes;
  const S = grid.size;
  const decayRate   = 0.982 + memory * 0.017;
  const diffuseAmt  = coherence * 0.015;

  const tmp = new Float32Array(grid.density);
  for (let gy = 1; gy < S - 1; gy++) {
    for (let gx = 1; gx < S - 1; gx++) {
      const idx = gy * S + gx;
      const neighbors =
        tmp[(gy - 1) * S + gx] + tmp[(gy + 1) * S + gx] +
        tmp[gy * S + (gx - 1)] + tmp[gy * S + (gx + 1)];
      grid.density[idx]  = (tmp[idx] * (1 - diffuseAmt) + (neighbors / 4) * diffuseAmt) * decayRate;
      grid.pressure[idx] *= 0.94;
      grid.memory[idx]   *= 0.9995;
    }
  }
}

export function measureDensity(grid: FieldGrid): number {
  let sum = 0;
  const n = grid.density.length;
  for (let i = 0; i < n; i++) sum += grid.density[i];
  return sum / n;
}