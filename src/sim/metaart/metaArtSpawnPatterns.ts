// ─── Meta-Arte: Spawn Patterns — 20 initial configurations ────────────────
import type { DNA, Quantum, SpawnPattern } from './metaArtTypes';

function seededRng(seed: number): () => number {
  let s = (Math.abs(seed | 0) % 233280) || 1;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function hexToHSL(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s, l];
}

function makeAgent(
  dna: DNA, rng: () => number,
  x: number, y: number,
  vx = 0, vy = 0,
  paletteIdx?: number,
): Quantum {
  const cidx = paletteIdx ?? Math.floor(rng() * dna.palette.length);
  const hex  = dna.palette[cidx % dna.palette.length] ?? '#888';
  const [hue, sat, lit] = hexToHSL(hex);
  const species = Math.floor(rng() * 6);
  const baseSpeed = 0.003 + dna.genes.flow * 0.008;
  const angle = rng() * Math.PI * 2;
  const speed = baseSpeed * (0.5 + rng() * 0.8);
  const svx = vx !== 0 || vy !== 0 ? vx : Math.cos(angle) * speed;
  const svy = vx !== 0 || vy !== 0 ? vy : Math.sin(angle) * speed;
  return {
    x, y, vx: svx, vy: svy,
    charge: rng(), ink: 0.5 + rng() * 0.5, mood: rng(),
    role: 'DRAW', species,
    memX: new Float32Array([x, x, x, x, x, x]),
    memY: new Float32Array([y, y, y, y, y, y]),
    memIdx: 0, age: 0,
    hue:  hue  + (rng() - 0.5) * 30 * (1 - dna.genes.coherence),
    sat:  Math.max(0.1, Math.min(1, sat)),
    lit:  Math.max(0.15, Math.min(0.9, lit)),
    alpha: 0.6 + rng() * 0.4,
    size:  0.8 + rng() * 2.5 * (1 + dna.genes.structure * 0.5),
    glyphIndex: Math.floor(rng() * 32),
    baseHue: hue,
  };
}

export const SPAWN_PATTERN_LABELS: Record<SpawnPattern, string> = {
  scatter:       'Scatter',
  grid:          'Grade',
  hex_grid:      'Grade Hex',
  ring:          'Anel',
  spiral:        'Espiral',
  galaxy:        'Galáxia',
  cross:         'Cruz',
  diagonal:      'Diagonal',
  sine_wave:     'Onda',
  clusters:      'Clusters',
  center_burst:  'Explosão',
  edges:         'Bordas',
  corners:       'Cantos',
  concentric:    'Concêntrico',
  flow_lines:    'Fluxos',
  golden_spiral: 'Fibonacci',
  explosion:     'Big Bang',
  yin_yang:      'Yin-Yang',
  lattice:       'Retículo',
  noise_bands:   'Bandas',
};

export function createQuantaWithPattern(
  dna: DNA,
  seed: number,
  pattern: SpawnPattern,
): Quantum[] {
  const rng = seededRng(seed);
  const count = Math.max(1, dna.quantaCount);
  const quanta: Quantum[] = [];

  switch (pattern) {
    // ── Random scatter ──────────────────────────────────────────────────────
    case 'scatter': {
      for (let i = 0; i < count; i++) {
        quanta.push(makeAgent(dna, rng, rng(), rng()));
      }
      break;
    }

    // ── Uniform grid ────────────────────────────────────────────────────────
    case 'grid': {
      const cols = Math.ceil(Math.sqrt(count * (16 / 9)));
      const rows = Math.ceil(count / cols);
      let n = 0;
      for (let r = 0; r < rows && n < count; r++) {
        for (let c = 0; c < cols && n < count; c++, n++) {
          const x = (c + 0.5 + (rng() - 0.5) * 0.2) / cols;
          const y = (r + 0.5 + (rng() - 0.5) * 0.2) / rows;
          quanta.push(makeAgent(dna, rng, x, y, 0, 0, n % dna.palette.length));
        }
      }
      break;
    }

    // ── Hexagonal grid ──────────────────────────────────────────────────────
    case 'hex_grid': {
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      let n = 0;
      for (let r = 0; r < rows && n < count; r++) {
        for (let c = 0; c < cols && n < count; c++, n++) {
          const offset = r % 2 === 0 ? 0 : 0.5 / cols;
          const x = offset + (c + 0.5) / cols + (rng() - 0.5) * 0.015;
          const y = (r + 0.5) / rows * 0.9 + 0.05 + (rng() - 0.5) * 0.015;
          quanta.push(makeAgent(dna, rng, Math.min(0.99, x), Math.min(0.99, y), 0, 0, n % dna.palette.length));
        }
      }
      break;
    }

    // ── Single ring ─────────────────────────────────────────────────────────
    case 'ring': {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const r = 0.32 + (rng() - 0.5) * 0.06;
        const x = 0.5 + Math.cos(a) * r;
        const y = 0.5 + Math.sin(a) * r * 0.7;
        const speed = dna.genes.flow * 0.006;
        quanta.push(makeAgent(dna, rng, x, y,
          -Math.sin(a) * speed, Math.cos(a) * speed * 0.7,
          i % dna.palette.length));
      }
      break;
    }

    // ── Archimedean spiral ──────────────────────────────────────────────────
    case 'spiral': {
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 8;
        const r = t / (Math.PI * 8) * 0.42 + 0.02;
        const x = 0.5 + Math.cos(t) * r;
        const y = 0.5 + Math.sin(t) * r * 0.75;
        const speed = 0.004 + dna.genes.flow * 0.004;
        quanta.push(makeAgent(dna, rng,
          Math.max(0.01, Math.min(0.99, x)),
          Math.max(0.01, Math.min(0.99, y)),
          -Math.sin(t) * speed, Math.cos(t) * speed,
          i % dna.palette.length));
      }
      break;
    }

    // ── Two-arm galaxy ──────────────────────────────────────────────────────
    case 'galaxy': {
      for (let i = 0; i < count; i++) {
        const arm = i % 2;
        const t = (Math.floor(i / 2) / (count / 2)) * Math.PI * 5 + arm * Math.PI;
        const r = (t / (Math.PI * 5)) * 0.38 + 0.03;
        const scatter = (rng() - 0.5) * 0.06;
        const x = 0.5 + Math.cos(t) * r + scatter;
        const y = 0.5 + Math.sin(t) * r * 0.65 + scatter * 0.5;
        const speed = 0.003 + dna.genes.flow * 0.003;
        quanta.push(makeAgent(dna, rng,
          Math.max(0.01, Math.min(0.99, x)),
          Math.max(0.01, Math.min(0.99, y)),
          -Math.sin(t) * speed, Math.cos(t) * speed,
          arm));
      }
      break;
    }

    // ── Cross / plus sign ───────────────────────────────────────────────────
    case 'cross': {
      const arm = Math.ceil(count / 4);
      for (let i = 0; i < count; i++) {
        const seg = Math.floor(i / arm);
        const t = (i % arm) / arm;
        let x = 0.5, y = 0.5;
        const jit = (rng() - 0.5) * 0.04;
        switch (seg % 4) {
          case 0: x = t * 0.9 + 0.05;       y = 0.5 + jit; break;
          case 1: x = 0.5 + jit;            y = t * 0.9 + 0.05; break;
          case 2: x = (1 - t) * 0.9 + 0.05; y = 0.5 + jit; break;
          case 3: x = 0.5 + jit;            y = (1 - t) * 0.9 + 0.05; break;
        }
        quanta.push(makeAgent(dna, rng, x, y, 0, 0, seg % dna.palette.length));
      }
      break;
    }

    // ── Diagonal stripes ────────────────────────────────────────────────────
    case 'diagonal': {
      const stripes = Math.min(8, dna.palette.length);
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const s = Math.floor(t * stripes);
        const pos = (t * stripes) % 1;
        const x = pos * 0.92 + 0.04 + (rng() - 0.5) * 0.04;
        const y = pos * 0.85 + (s / stripes) * 0.15 + 0.04 + (rng() - 0.5) * 0.04;
        quanta.push(makeAgent(dna, rng, x, Math.min(0.96, y), 0, 0, s % dna.palette.length));
      }
      break;
    }

    // ── Sine wave ───────────────────────────────────────────────────────────
    case 'sine_wave': {
      const waves = 3 + Math.floor(dna.genes.rhythm * 5);
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const x = t * 0.92 + 0.04;
        const y = 0.5 + Math.sin(t * Math.PI * 2 * waves) * 0.35 + (rng() - 0.5) * 0.03;
        const vy = Math.cos(t * Math.PI * 2 * waves) * 0.003;
        quanta.push(makeAgent(dna, rng, x, y, 0.002, vy, i % dna.palette.length));
      }
      break;
    }

    // ── Gaussian clusters ───────────────────────────────────────────────────
    case 'clusters': {
      const nClusters = Math.max(2, Math.min(8, dna.palette.length));
      const centers: [number, number][] = [];
      for (let c = 0; c < nClusters; c++) {
        centers.push([0.1 + rng() * 0.8, 0.1 + rng() * 0.8]);
      }
      for (let i = 0; i < count; i++) {
        const c = i % nClusters;
        const [cx, cy] = centers[c];
        const angle = rng() * Math.PI * 2;
        const r = Math.pow(rng(), 0.5) * 0.12;
        quanta.push(makeAgent(dna, rng,
          Math.max(0.01, Math.min(0.99, cx + Math.cos(angle) * r)),
          Math.max(0.01, Math.min(0.99, cy + Math.sin(angle) * r * 0.75)),
          0, 0, c % dna.palette.length));
      }
      break;
    }

    // ── Center burst — all agents from center pointing outward ──────────────
    case 'center_burst': {
      for (let i = 0; i < count; i++) {
        const angle = rng() * Math.PI * 2;
        const r = Math.pow(rng(), 2) * 0.12;
        const speed = 0.004 + dna.genes.flow * 0.008;
        quanta.push(makeAgent(dna, rng,
          0.5 + Math.cos(angle) * r,
          0.5 + Math.sin(angle) * r * 0.75,
          Math.cos(angle) * speed, Math.sin(angle) * speed,
          i % dna.palette.length));
      }
      break;
    }

    // ── Along edges ─────────────────────────────────────────────────────────
    case 'edges': {
      for (let i = 0; i < count; i++) {
        const t = rng();
        const edge = Math.floor(rng() * 4);
        const margin = 0.03 + rng() * 0.06;
        let x = t, y = t;
        switch (edge) {
          case 0: x = t; y = margin; break;
          case 1: x = t; y = 1 - margin; break;
          case 2: x = margin;     y = t; break;
          case 3: x = 1 - margin; y = t; break;
        }
        const speed = dna.genes.flow * 0.004;
        const inward = [0.5 - x, 0.5 - y];
        const len = Math.sqrt(inward[0] ** 2 + inward[1] ** 2) + 0.001;
        quanta.push(makeAgent(dna, rng, x, y,
          inward[0] / len * speed, inward[1] / len * speed,
          edge % dna.palette.length));
      }
      break;
    }

    // ── Four corner clusters ─────────────────────────────────────────────────
    case 'corners': {
      const corners = [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]];
      for (let i = 0; i < count; i++) {
        const c = i % 4;
        const [cx, cy] = corners[c];
        const r = rng() * 0.10;
        const a = rng() * Math.PI * 2;
        quanta.push(makeAgent(dna, rng,
          cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.75,
          0, 0, c % dna.palette.length));
      }
      break;
    }

    // ── Multiple concentric rings ────────────────────────────────────────────
    case 'concentric': {
      const rings = Math.max(2, Math.min(8, dna.palette.length));
      for (let i = 0; i < count; i++) {
        const ring = i % rings;
        const a = (i / count) * Math.PI * 2 * rings + ring * 0.5;
        const r = 0.06 + (ring + 1) * (0.38 / rings) + (rng() - 0.5) * 0.02;
        quanta.push(makeAgent(dna, rng,
          0.5 + Math.cos(a) * r,
          0.5 + Math.sin(a) * r * 0.72,
          0, 0, ring % dna.palette.length));
      }
      break;
    }

    // ── Agents placed along imaginary flow lines ─────────────────────────────
    case 'flow_lines': {
      const lines = 8 + Math.floor(dna.genes.flow * 12);
      for (let i = 0; i < count; i++) {
        const line = i % lines;
        const t = (i / count) * lines % 1;
        const phase = (line / lines) * Math.PI * 2;
        const x = line / lines * 0.9 + 0.05;
        const y = t * 0.85 + 0.07 + Math.sin(t * Math.PI * 3 + phase) * 0.08;
        quanta.push(makeAgent(dna, rng, x, Math.min(0.97, y), 0, 0.002, line % dna.palette.length));
      }
      break;
    }

    // ── Golden spiral (Fibonacci) ────────────────────────────────────────────
    case 'golden_spiral': {
      const phi = (1 + Math.sqrt(5)) / 2;
      for (let i = 0; i < count; i++) {
        const r = Math.sqrt(i / count) * 0.44;
        const a = i * 2 * Math.PI / (phi * phi);
        quanta.push(makeAgent(dna, rng,
          0.5 + Math.cos(a) * r,
          0.5 + Math.sin(a) * r * 0.75,
          0, 0, i % dna.palette.length));
      }
      break;
    }

    // ── Big bang — agents at dead center, fly outward ────────────────────────
    case 'explosion': {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + rng() * 0.3;
        const speed = (0.005 + rng() * 0.015) * (1 + dna.genes.flow * 2);
        quanta.push(makeAgent(dna, rng,
          0.5 + (rng() - 0.5) * 0.02,
          0.5 + (rng() - 0.5) * 0.02,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed * 0.75,
          i % dna.palette.length));
      }
      break;
    }

    // ── Yin-Yang — two interleaved swirls ────────────────────────────────────
    case 'yin_yang': {
      for (let i = 0; i < count; i++) {
        const half = i < count / 2 ? 0 : 1;
        const t = (i % (count / 2)) / (count / 2);
        const a = t * Math.PI * 6 + half * Math.PI;
        const r = t * 0.35 + 0.03;
        const cx = 0.5 + (half === 0 ? 0.1 : -0.1);
        quanta.push(makeAgent(dna, rng,
          Math.max(0.01, Math.min(0.99, cx + Math.cos(a) * r)),
          Math.max(0.01, Math.min(0.99, 0.5 + Math.sin(a) * r * 0.72)),
          0, 0, half % dna.palette.length));
      }
      break;
    }

    // ── Isometric-like lattice ───────────────────────────────────────────────
    case 'lattice': {
      const n = Math.ceil(Math.sqrt(count));
      let idx = 0;
      for (let r = 0; r < n && idx < count; r++) {
        for (let c = 0; c < n && idx < count; c++, idx++) {
          const x = (c + 0.5) / n + (r % 2 ? 0.25 / n : 0);
          const y = (r + 0.5) / n * 0.85 + 0.07;
          quanta.push(makeAgent(dna, rng, x, y, 0, 0, ((r + c) % dna.palette.length)));
        }
      }
      break;
    }

    // ── Horizontal noise bands ───────────────────────────────────────────────
    case 'noise_bands': {
      const bands = dna.palette.length;
      for (let i = 0; i < count; i++) {
        const band = i % bands;
        const y = (band + rng()) / bands * 0.9 + 0.05;
        const x = rng() * 0.9 + 0.05;
        quanta.push(makeAgent(dna, rng, x, y, 0, 0, band));
      }
      break;
    }
  }

  return quanta.slice(0, count);
}
