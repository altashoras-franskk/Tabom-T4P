// ─── Meta-Arte: Engine (Quanta Simulation + Particle Life) ─────────────────
import type { Quantum, DNA, DNAGenes, FieldGrid, ToolState, GuideLine, ChannelPath, PhysicsConfig, BrushTexturePreset } from './metaArtTypes';
import { sampleFlowAt, depositDensity } from './metaArtFields';

// ── RNG ─────────────────────────────────────────────────────────────────────
function seededRng(seed: number): () => number {
  let s = (Math.abs(seed | 0) % 233280) || 1;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// ── Color util (exported for palette recoloring) ─────────────────────────────
export function hexToHSL(hex: string): [number, number, number] {
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

// ── Recolor all existing agents to match a new palette (for CLR button) ──────
// Each agent maps to palette[species % palette.length] with minimal hue variance.
export function recolorQuantaToPalette(
  quanta: Quantum[],
  palette: string[],
  hueVariance = 8,   // small variance so colors stay pure but feel organic
): void {
  const n = palette.length;
  if (n === 0) return;
  for (const q of quanta) {
    const hex = palette[q.species % n] ?? palette[0];
    const [hue, sat, lit] = hexToHSL(hex);
    q.hue  = (hue + (Math.random() - 0.5) * hueVariance + 360) % 360;
    q.sat  = Math.max(0.35, Math.min(1.0, sat  + (Math.random() - 0.5) * 0.06));
    q.lit  = Math.max(0.15, Math.min(0.88, lit + (Math.random() - 0.5) * 0.04));
    if (q.baseHue !== undefined) q.baseHue = hue;
  }
}

// ── Spatial grid for O(n·k) PL interactions ─────────────────────────────────
const SG = 18;

function buildSpatialGrid(quanta: Quantum[]): number[][] {
  const cells: number[][] = Array.from({ length: SG * SG }, () => []);
  for (let i = 0; i < quanta.length; i++) {
    const q = quanta[i];
    const gx = Math.min(SG - 1, Math.max(0, Math.floor(q.x * SG)));
    const gy = Math.min(SG - 1, Math.max(0, Math.floor(q.y * SG)));
    cells[gy * SG + gx].push(i);
  }
  return cells;
}

// Particle Life force kernel
function plForce(dist: number, a: number, rMin: number, rMax: number): number {
  if (dist < rMin) {
    return -Math.max(0.3, Math.abs(a)) * (rMin / (dist + 0.0001) - 1) * 3.0;
  }
  if (dist >= rMax) return 0;
  const beta = (dist - rMin) / (rMax - rMin);
  return a * (1 - Math.abs(2 * beta - 1));
}

// ── Quadrant targets per species ──────────────────────────────────────────────
const QUADRANT_TARGETS: [number, number][] = [
  [0.22, 0.22], // 0 → top-left
  [0.78, 0.22], // 1 → top-right
  [0.22, 0.78], // 2 → bottom-left
  [0.78, 0.78], // 3 → bottom-right
  [0.50, 0.22], // 4 → top-center
  [0.50, 0.78], // 5 → bottom-center
];

// ── Species movement archetypes — more distinct for emergent diversity ─────────
const SPECIES_PARAMS = [
  { flowFollow: 1.2, noiseScale: 0.6,  dampOffset: 0.04,  maxSpeedMul: 1.0,  name: 'luminous'  }, // balanced orbiter
  { flowFollow: 0.2, noiseScale: 0.2,  dampOffset: 0.14,  maxSpeedMul: 0.35, name: 'shadowed'  }, // slow, sticky, heavy
  { flowFollow: 2.8, noiseScale: 0.18, dampOffset: 0.01,  maxSpeedMul: 2.2,  name: 'flowing'   }, // fast stream follower
  { flowFollow: 0.05,noiseScale: 2.8,  dampOffset: -0.20, maxSpeedMul: 3.5,  name: 'expander'  }, // explosive burst
  { flowFollow: 1.5, noiseScale: 0.35, dampOffset: 0.05,  maxSpeedMul: 1.3,  name: 'magnetic'  }, // orbital attractor
  { flowFollow: 0.08,noiseScale: 4.0,  dampOffset: -0.30, maxSpeedMul: 4.5,  name: 'glitch'    }, // hyper-chaotic
];

// ── createQuanta ──────────────────────────────────────────────────────────────
export function createQuanta(dna: DNA, seed: number): Quantum[] {
  const rng = seededRng(seed);
  const count = dna.quantaCount;
  const quanta: Quantum[] = [];
  if (count <= 0) return quanta;

  const roles: Quantum['role'][] = ['DRAW', 'DRAW', 'DRAW', 'DRAW', 'FLOW', 'GLYPH', 'STAMP', 'ERASE'];
  const roleWeights = [0.5, 0.5, 0.5, 0.5, 0.15, dna.genes.glyphness * 0.3, 0.08, 0.04];
  const roleSum = roleWeights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < count; i++) {
    const paletteIdx = Math.floor(rng() * dna.palette.length);
    const hex = dna.palette[paletteIdx] ?? '#888888';
    const [hue, sat, lit] = hexToHSL(hex);

    let role: Quantum['role'] = 'DRAW';
    const rv = rng() * roleSum;
    let acc = 0;
    for (let ri = 0; ri < roles.length; ri++) {
      acc += roleWeights[ri];
      if (rv < acc) { role = roles[ri]; break; }
    }

    const species = (i % 6 + Math.floor(rng() * 2)) % 6;
    const baseSpeed = 0.003 + dna.genes.flow * 0.008;
    const angle0 = rng() * Math.PI * 2;
    const sp = SPECIES_PARAMS[species] ?? SPECIES_PARAMS[0];
    const speedBias = baseSpeed * sp.maxSpeedMul * (0.5 + rng() * 0.5);

    quanta.push({
      x: rng(), y: rng(),
      vx: Math.cos(angle0) * speedBias,
      vy: Math.sin(angle0) * speedBias,
      charge: rng(), ink: 0.4 + rng() * 0.6, mood: rng(),
      role, species,
      memX: new Float32Array([rng(), rng(), rng(), rng(), rng(), rng()]),
      memY: new Float32Array([rng(), rng(), rng(), rng(), rng(), rng()]),
      memIdx: 0,
      age: Math.floor(rng() * 200),
      hue:  hue  + (rng() - 0.5) * 40  * (1 - dna.genes.coherence),
      sat:  Math.max(0.05, Math.min(1, sat + (rng() - 0.5) * 0.25 * dna.genes.contrast)),
      lit:  Math.max(0.1,  Math.min(0.9, lit + (rng() - 0.5) * 0.25)),
      alpha: 0.45 + rng() * 0.55,
      size:  0.8 + rng() * 2.5 * (1 + dna.genes.structure * 0.5),
      glyphIndex: Math.floor(rng() * 32),
    });
  }
  return quanta;
}

// ── spawnQuantaAtPoint — create live agents from a brush stroke ───────────────
export function spawnQuantaAtPoint(
  dna: DNA,
  nx: number, ny: number,     // normalized 0..1
  vx: number, vy: number,     // initial velocity
  count: number,
  spread: number,             // normalized radius
  colorIndex: number,
): Quantum[] {
  const result: Quantum[] = [];
  const palette = dna.palette;
  for (let i = 0; i < count; i++) {
    const rng = Math.random;
    const cidx = colorIndex >= 0 && colorIndex < palette.length
      ? colorIndex
      : Math.floor(rng() * palette.length);
    const hex = palette[cidx] ?? '#888888';
    const [hue, sat, lit] = hexToHSL(hex);
    const species = Math.floor(rng() * 6);
    const sp = SPECIES_PARAMS[species] ?? SPECIES_PARAMS[0];
    const sx = Math.max(0.001, Math.min(0.999, nx + (rng() - 0.5) * spread));
    const sy = Math.max(0.001, Math.min(0.999, ny + (rng() - 0.5) * spread));
    const jit = 0.6 + rng() * 1.2;
    result.push({
      x: sx, y: sy,
      vx: vx * jit * sp.maxSpeedMul + (rng() - 0.5) * 0.003,
      vy: vy * jit * sp.maxSpeedMul + (rng() - 0.5) * 0.003,
      charge: rng(), ink: 0.7 + rng() * 0.3, mood: rng(),
      role: 'DRAW', species,
      memX: new Float32Array([sx, sx, sx, sx, sx, sx]),
      memY: new Float32Array([sy, sy, sy, sy, sy, sy]),
      memIdx: 0, age: 0,
      hue:  hue  + (rng() - 0.5) * 30 * (1 - dna.genes.coherence),
      sat:  Math.max(0.1, Math.min(1, sat + (rng() - 0.5) * 0.2)),
      lit:  Math.max(0.15, Math.min(0.9, lit + (rng() - 0.5) * 0.15)),
      alpha: 0.6 + rng() * 0.4,
      size:  0.8 + rng() * 2.5 * (1 + dna.genes.structure * 0.5),
      glyphIndex: Math.floor(rng() * 32),
    });
  }
  return result;
}

// ── updateQuanta — AMPLIFIED DNA effects ─────────────────────────────────────
export function updateQuanta(
  quanta: Quantum[],
  fields: FieldGrid,
  dna: DNA,
  toolState: ToolState,
  W: number, H: number,
  tick: number,
  dt = 1.0,
  staticAgents = false,
  boundaryMode: import('./metaArtTypes').BoundaryMode = 'wrap',
  physicsConfig?: PhysicsConfig,
): void {
  const { flow, entropy, coherence, erosion, rhythm, fragmentation, structure } = dna.genes;
  const linear = dna.genes.linear ?? 0;

  const rMaxMul    = physicsConfig?.rMaxMul    ?? 1.0;
  const forceMul   = physicsConfig?.forceMul   ?? 1.0;
  const dampingMul = physicsConfig?.dampingMul ?? 1.0;
  const noiseMul   = physicsConfig?.noiseMul   ?? 1.0;
  const speedMul   = physicsConfig?.maxSpeedMul ?? 1.0;
  const rMinMul    = physicsConfig?.rMinMul    ?? 1.0;
  const centerPull = physicsConfig?.centerPull ?? 0.0;
  const quadMode   = physicsConfig?.quadrantMode ?? false;
  const quadStr    = physicsConfig?.quadrantStrength ?? 0.3;
  const borderRep  = physicsConfig?.borderRepulsion ?? 0.0;

  const maxSpeed      = (0.0003 + Math.pow(flow, 1.6) * 0.0175) * speedMul;
  const noiseBase     = entropy * entropy * 0.038 * noiseMul;
  const baseDamping   = (0.97 - Math.pow(entropy, 1.5) * 0.39) * Math.max(0.5, Math.min(1.5, dampingMul));
  const flowFollowBase = 0.02 + Math.pow(flow, 1.5) * 0.28;

  const inkRefill   = 1 - erosion;
  const rhythmPulse = rhythm > 0.35 ? 0.88 + 0.12 * Math.sin(tick * 0.07 * rhythm) : 1;

  const R_MIN  = 0.016 * rMinMul;
  const R_MAX  = (0.07 + fragmentation * 0.055 + coherence * 0.025) * rMaxMul;
  const plScale = (0.015 + coherence * 0.045 + dna.genes.contrast * 0.025) * forceMul;

  const sgCells = buildSpatialGrid(quanta);
  const mat     = fields.interactionMatrix;
  const len     = quanta.length;

  // Isolation: 0 = full cross-species interaction, 1 = species are completely isolated
  const isolation = dna.genes.isolation ?? 0;
  // When isolation is high, only same-species forces survive; cross-species forces suppressed
  const crossSpeciesScale = isolation > 0.01 ? Math.max(0, 1 - isolation * 1.2) : 1;

  // Precompute tool globals
  const tActive = toolState.isDragging;
  const tx = toolState.lastX / W;
  const ty = toolState.lastY / H;
  const toolRadN = toolState.size / Math.max(W, H);

  for (let qi = 0; qi < len; qi++) {
    const q   = quanta[qi];
    const sp  = SPECIES_PARAMS[q.species] ?? SPECIES_PARAMS[0];

    // ── 1. Flow field ──────────────────────────────────────────────────────
    const { fx, fy } = sampleFlowAt(fields, q.x, q.y);
    // Reduce flow-field pull for linear agents (they choose their own direction)
    const linearMod   = linear > 0.4 ? Math.max(0, 1 - linear * 0.9) : 1;
    const followStr   = flowFollowBase * sp.flowFollow * (1 - entropy * 0.4) * linearMod;
    const noiseAmt    = noiseBase * sp.noiseScale * linearMod;
    const damping     = Math.max(0.48, Math.min(0.98,
      baseDamping + sp.dampOffset + coherence * 0.03));

    let ax = fx * followStr + (Math.random() - 0.5) * noiseAmt;
    let ay = fy * followStr + (Math.random() - 0.5) * noiseAmt;

    // ── 2. Particle Life forces ────────────────────────────────────────────
    const gx2 = Math.min(SG - 1, Math.max(0, Math.floor(q.x * SG)));
    const gy2 = Math.min(SG - 1, Math.max(0, Math.floor(q.y * SG)));
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx2 = gx2 + dx, ny2 = gy2 + dy;
        if (nx2 < 0 || ny2 < 0 || nx2 >= SG || ny2 >= SG) continue;
        const cell = sgCells[ny2 * SG + nx2];
        for (const ni of cell) {
          if (ni === qi) continue;
          const n = quanta[ni];
          let ddx = n.x - q.x; let ddy = n.y - q.y;
          if (ddx > 0.5) ddx -= 1; if (ddx < -0.5) ddx += 1;
          if (ddy > 0.5) ddy -= 1; if (ddy < -0.5) ddy += 1;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist < 0.0001 || dist > R_MAX) continue;
          const a = mat[q.species * 6 + n.species];
          // Apply isolation: scale down cross-species interactions
          const isSameSpecies = q.species === n.species;
          const interactionScale = isSameSpecies ? 1 : crossSpeciesScale;
          if (interactionScale <= 0.0001) continue;
          const f = plForce(dist, a, R_MIN, R_MAX) * interactionScale;
          if (f === 0) continue;
          const inv = (f * plScale) / (dist + 0.0001);
          ax += ddx * inv;
          ay += ddy * inv;
        }
      }
    }

    // ── 3. Structure snapping ──────────────────────────────────────────────
    if (structure > 0.65) {
      const snapStr  = (structure - 0.65) * 1.8;
      const gridSz   = 0.04 + (1 - structure) * 0.08;
      const snapX    = Math.round(q.x / gridSz) * gridSz;
      const snapY    = Math.round(q.y / gridSz) * gridSz;
      ax += (snapX - q.x) * snapStr * 0.15;
      ay += (snapY - q.y) * snapStr * 0.15;
    }

    // ── 4. Rhythm bursts ───────────────────────────────────────────────────
    if ((q.species === 3 || q.species === 5) && Math.random() < rhythm * 0.04) {
      ax += (Math.random() - 0.5) * 0.012;
      ay += (Math.random() - 0.5) * 0.012;
    }

    // ── 4b. Center pull ────────────────────────────────────────────────────
    if (centerPull > 0.001) {
      ax += (0.5 - q.x) * centerPull * 0.003;
      ay += (0.5 - q.y) * centerPull * 0.003;
    }

    // ── 4c. Quadrant attraction per species ────────────────────────────────
    if (quadMode) {
      const tgt = QUADRANT_TARGETS[q.species] ?? QUADRANT_TARGETS[0];
      const qdx = tgt[0] - q.x;
      const qdy = tgt[1] - q.y;
      const qdist = Math.sqrt(qdx * qdx + qdy * qdy);
      // Stronger base force + extra boost when agent is far from its quadrant
      const distBoost = qdist > 0.28 ? 2.8 : 1.0;
      const qForce = quadStr * 0.022 * distBoost;
      ax += qdx * qForce;
      ay += qdy * qForce;
      // Extra isolation boost inside quadrant mode
      if (isolation > 0.3) {
        const isolBoost = (isolation - 0.3) * 1.5;
        ax += qdx * isolBoost * 0.010;
        ay += qdy * isolBoost * 0.010;
      }
    }

    // ── 4d. Border repulsion ───────────────────────────────────────────────
    if (borderRep > 0.001) {
      const MARGIN = 0.08;
      const str = borderRep * 0.005;
      if (q.x < MARGIN)     ax += (MARGIN - q.x) * str * 4;
      if (q.x > 1 - MARGIN) ax -= (q.x - (1 - MARGIN)) * str * 4;
      if (q.y < MARGIN)     ay += (MARGIN - q.y) * str * 4;
      if (q.y > 1 - MARGIN) ay -= (q.y - (1 - MARGIN)) * str * 4;
    }

    // ── 5. RHIZOME — strict straight-line movement ─────────────────────────
    if (linear > 0.4) {
      // Threshold: above 0.4 linear, start suppressing all turning
      const linearStr = Math.min(1, (linear - 0.4) * 1.67);
      const speed = Math.sqrt(q.vx * q.vx + q.vy * q.vy);
      if (speed > 0.00002) {
        const ux = q.vx / speed, uy = q.vy / speed;
        // Project force onto heading — preserve forward, kill lateral
        const parallel = ax * ux + ay * uy;
        const perpx = ax - parallel * ux;
        const perpy = ay - parallel * uy;
        // Suppress ALL perpendicular force when fully linear
        ax -= perpx * linearStr * 0.97;
        ay -= perpy * linearStr * 0.97;
        // High damping preservation → velocity barely decays (agent keeps going straight)
        // done below by using very high dampDt
      }
    }

    // ── 6. Integrate ──────────────────────────────────────────────────────
    // Rhizome: when linear > 0.7, preserve velocity much longer (near-0 damping)
    const linearDampBoost = linear > 0.4 ? linear * 0.015 : 0;
    const dampDt = Math.pow(Math.max(0.01, Math.min(0.9999, damping + linearDampBoost)), dt);
    q.vx = (q.vx * dampDt + ax * dt) * rhythmPulse;
    q.vy = (q.vy * dampDt + ay * dt) * rhythmPulse;

    const speed = Math.sqrt(q.vx * q.vx + q.vy * q.vy);
    const mxSpd = maxSpeed * sp.maxSpeedMul;
    // Rhizome: don't cap speed as aggressively
    const actualMax = linear > 0.5 ? mxSpd * (1 + linear * 1.5) : mxSpd;
    if (speed > actualMax) { const s = actualMax / speed; q.vx *= s; q.vy *= s; }

    if (boundaryMode === 'wrap') {
      q.x = ((q.x + q.vx * dt) % 1 + 1) % 1;
      q.y = ((q.y + q.vy * dt) % 1 + 1) % 1;
    } else if (boundaryMode === 'bounce') {
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.x < 0)   { q.x = -q.x;     q.vx = Math.abs(q.vx); }
      if (q.x > 1)   { q.x = 2 - q.x;  q.vx = -Math.abs(q.vx); }
      if (q.y < 0)   { q.y = -q.y;     q.vy = Math.abs(q.vy); }
      if (q.y > 1)   { q.y = 2 - q.y;  q.vy = -Math.abs(q.vy); }
      q.x = Math.max(0, Math.min(1, q.x));
      q.y = Math.max(0, Math.min(1, q.y));
    } else if (boundaryMode === 'absorb') {
      // Particles that escape boundaries are respawned at random inside the canvas
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.x < 0 || q.x > 1 || q.y < 0 || q.y > 1) {
        q.x = 0.1 + Math.random() * 0.8;
        q.y = 0.1 + Math.random() * 0.8;
        q.vx = (Math.random() - 0.5) * 0.005;
        q.vy = (Math.random() - 0.5) * 0.005;
      }
    } else {
      // 'open' — no boundary, particles can drift out (clamp at safe range)
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.x = Math.max(-0.5, Math.min(1.5, q.x));
      q.y = Math.max(-0.5, Math.min(1.5, q.y));
    }

    // Track brush angle from velocity
    const spd2 = Math.sqrt(q.vx * q.vx + q.vy * q.vy);
    if (spd2 > 0.0001 && dna.genes.agentShape === 'brush') {
      q.angle = Math.atan2(q.vy, q.vx);
    }

    q.memX[q.memIdx] = q.x;
    q.memY[q.memIdx] = q.y;
    q.memIdx = (q.memIdx + 1) % 6;

    depositDensity(fields, q.x, q.y, 0.008 * q.ink);

    // ── 7. Live tool effects ───────────────────────────────────────────────
    if (tActive) {
      const ddx  = tx - q.x;
      const ddy  = ty - q.y;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy) + 0.0001;
      if (dist < toolRadN) {
        const falloff  = (1 - dist / toolRadN);
        const f        = falloff * toolState.pressure;
        const inv      = 1 / dist;
        const tid = toolState.activeToolId;

        if (tid === 'attract' || tid === 'attractor') {
          q.vx += ddx * inv * f * 0.35;
          q.vy += ddy * inv * f * 0.35;
        } else if (tid === 'repel' || tid === 'repulsor') {
          q.vx -= ddx * inv * f * 0.35;
          q.vy -= ddy * inv * f * 0.35;
        } else if (tid === 'vortex') {
          q.vx += (-ddy * inv) * f * 0.45;
          q.vy += ( ddx * inv) * f * 0.45;
        } else if (tid === 'freeze') {
          const damp = Math.max(0, 1 - f * 0.55);
          q.vx *= damp; q.vy *= damp;
        } else if (tid === 'burst') {
          const ba = Math.random() * Math.PI * 2;
          const bs = f * actualMax * 40;
          q.vx += Math.cos(ba) * bs;
          q.vy += Math.sin(ba) * bs;
        } else if (tid === 'black_hole') {
          const bhf = f * f * 1.2 / (dist + 0.005);
          q.vx += ddx * inv * bhf;
          q.vy += ddy * inv * bhf;
          if (dist < toolRadN * 0.08) {
            q.x = ((1 - q.x) + (Math.random() - 0.5) * 0.15 + 1) % 1;
            q.y = ((1 - q.y) + (Math.random() - 0.5) * 0.15 + 1) % 1;
          }
        } else if (tid === 'color_infect') {
          const col = dna.palette[toolState.colorIndex % dna.palette.length];
          if (col) {
            const [th, ts, tl] = hexToHSL(col);
            const hdiff = ((th - q.hue + 540) % 360) - 180;
            q.hue = (q.hue + hdiff * f * 0.08 + 360) % 360;
            q.sat = q.sat + (ts - q.sat) * f * 0.05;
            q.lit = q.lit + (tl - q.lit) * f * 0.04;
          }
        } else if (tid === 'size_wave') {
          q.size = Math.max(0.2, q.size + Math.sin(tick * 0.08 + q.age * 0.05) * f * 0.6);
        } else if (tid === 'ink_flood') {
          q.ink = Math.min(1, q.ink + f * 0.06);
        } else if (tid === 'species_shift') {
          if (Math.random() < f * 0.018) q.species = Math.floor(Math.random() * 6);
        } else if (tid === 'pinch') {
          q.vy += (ty - q.y) * f * 0.18;
          q.vx += (tx - q.x) * f * 0.05;
        } else if (tid === 'scatter_burst') {
          q.vx -= ddx * inv * f * 0.40;
          q.vy -= ddy * inv * f * 0.40;
        } else if (tid === 'channel') {
          q.vx += toolState.dragDX * f * 0.30;
          q.vy += toolState.dragDY * f * 0.30;
        }
      }
    }

    // ── 8. Agent lifecycle ─────────────────────────────────────────────────
    if (!staticAgents) {
      q.ink = Math.max(0, q.ink - erosion * 0.0018);
      if (q.ink < 0.08) q.ink = 0.2 + Math.random() * 0.6 * inkRefill;
      q.mood  += (Math.random() - 0.5) * 0.009;
      q.mood   = Math.max(0, Math.min(1, q.mood));
      if (q.species === 2 || q.species === 5) q.hue = (q.hue + 0.08) % 360;
    }
    q.age++;
  }
}

// ── Shape-based mark drawing ───────────────────────────────────────────────────
function drawShapeMark(
  ctx: CanvasRenderingContext2D,
  shape: string,
  cx: number, cy: number, r: number,
  hsl: string, alpha: number,
): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = hsl;
  ctx.strokeStyle = hsl;
  ctx.beginPath();
  switch (shape) {
    case 'square':
      ctx.rect(cx - r, cy - r, r * 2, r * 2);
      ctx.fill();
      break;
    case 'diamond':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
      break;
    case 'triangle':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.87, cy + r * 0.5);
      ctx.lineTo(cx - r * 0.87, cy + r * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    case 'cross': {
      const t = r * 0.35;
      ctx.rect(cx - t, cy - r, t * 2, r * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.rect(cx - r, cy - t, r * 2, t * 2);
      ctx.fill();
      break;
    }
    case 'star': {
      const spikes = 5;
      const inner  = r * 0.42;
      for (let j = 0; j < spikes * 2; j++) {
        const ang = (j / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
        const rr  = j % 2 === 0 ? r : inner;
        if (j === 0) ctx.moveTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
        else         ctx.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    default: // circle
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
  }
}

// ── Render archetype helpers ──────────────────────────────────────────────────
function getRenderArchetype(genes: import('./metaArtTypes').DNAGenes): 'lines' | 'dust' | 'blocks' | 'blobs' | 'straight' {
  if ((genes.linear ?? 0) > 0.5) return 'straight';
  if (genes.entropy > 0.68 && genes.memory < 0.50) return 'dust';
  if (genes.structure > 0.70) return 'blocks';
  if (genes.coherence > 0.76 && genes.entropy < 0.32) return 'blobs';
  return 'lines';
}

function getSymFolds(symmetry: number): number {
  if (symmetry < 0.28) return 1;
  if (symmetry < 0.50) return 2;
  if (symmetry < 0.66) return 4;
  if (symmetry < 0.82) return 6;
  return 8;
}

// Draw a species-specific line stroke
function drawSpeciesLine(
  ctx: CanvasRenderingContext2D,
  q: Quantum, px: number, py: number, ppx: number, ppy: number,
  hslColor: string, drawAlpha: number, smul: number, genes: import('./metaArtTypes').DNAGenes,
): void {
  if (q.role === 'ERASE') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = drawAlpha * 0.3;
    ctx.beginPath();
    ctx.arc(px, py, q.size * smul * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    return;
  }
  if (q.role !== 'DRAW' && q.role !== 'STAMP') return;

  ctx.strokeStyle = hslColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Linear gene > 0.5: force crisp straight lines for all species
  const isLinear = (genes.linear ?? 0) > 0.5;
  if (isLinear) {
    ctx.globalAlpha = drawAlpha;
    ctx.lineWidth = Math.max(0.4, q.size * smul * (0.4 + q.mood * 0.7));
    ctx.beginPath();
    ctx.moveTo(ppx, ppy);
    ctx.lineTo(px, py);
    ctx.stroke();
    return;
  }

  const sp = q.species;
  if (sp === 3) {
    ctx.globalAlpha = drawAlpha * 0.7;
    ctx.fillStyle = hslColor;
    ctx.beginPath();
    ctx.arc(px, py, q.size * smul * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (sp === 5) {
    ctx.globalAlpha = drawAlpha * 0.55;
    ctx.lineWidth = Math.max(0.3, 0.5 * smul + q.mood * 0.3);
    ctx.beginPath();
    ctx.moveTo(ppx + (Math.random() - 0.5) * 4, ppy + (Math.random() - 0.5) * 4);
    ctx.lineTo(px, py);
    ctx.stroke();
  } else if (sp === 1) {
    ctx.globalAlpha = drawAlpha * 0.48;
    ctx.lineWidth = Math.max(0.2, 0.7 * smul + q.mood * 0.4);
    ctx.beginPath();
    ctx.moveTo(ppx, ppy);
    ctx.lineTo(px, py);
    ctx.stroke();
  } else if (sp === 2) {
    ctx.globalAlpha = drawAlpha * 0.85;
    const strokeW = q.size * smul * (0.6 + q.mood * 1.2);
    ctx.lineWidth = Math.max(0.5, strokeW * (1 + genes.flow * 0.7));
    const mx = (ppx + px) / 2, my = (ppy + py) / 2;
    ctx.beginPath();
    ctx.moveTo(ppx, ppy);
    ctx.quadraticCurveTo(
      ppx + (Math.random() - 0.5) * q.size * smul * 0.5,
      ppy + (Math.random() - 0.5) * q.size * smul * 0.5,
      mx, my,
    );
    ctx.stroke();
  } else {
    ctx.globalAlpha = drawAlpha;
    ctx.lineWidth = Math.max(0.4, q.size * smul * (0.4 + q.mood * 0.9));
    ctx.beginPath();
    ctx.moveTo(ppx, ppy);
    ctx.lineTo(px, py);
    ctx.stroke();
  }
}

// ── renderQuantaTrail — Catmull-Rom smooth strokes, Hilma-style ──────────────
export function renderQuantaTrail(
  ctx: CanvasRenderingContext2D,
  quanta: Quantum[],
  dna: DNA,
  W: number, H: number,
  tick: number,
  smul = 1.0,
  brushPreset?: BrushTexturePreset,
): void {
  const { contrast, glyphness, symmetry } = dna.genes;
  const archetype = getRenderArchetype(dna.genes);
  const folds = getSymFolds(symmetry);
  const cx = W / 2, cy = H / 2;
  const shape = dna.genes.agentShape ?? 'circle';
  const isBrush = shape === 'brush';
  const bp = brushPreset;

  for (const q of quanta) {
    if (q.role === 'FLOW' || q.role === 'MASK') continue;
    if (q.ink < 0.04) continue;

    const px  = q.x * W;
    const py  = q.y * H;

    // Build 6-point history in chronological order
    const pts: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const idx = (q.memIdx + i) % 6;
      pts.push([q.memX[idx] * W, q.memY[idx] * H]);
    }

    // Skip if any consecutive pair jumped (boundary wrap or teleport)
    let jumped = false;
    for (let i = 1; i < 6; i++) {
      if (Math.abs(pts[i][0] - pts[i-1][0]) > W * 0.18 ||
          Math.abs(pts[i][1] - pts[i-1][1]) > H * 0.18) { jumped = true; break; }
    }
    if (jumped) continue;

    const hslColor  = `hsl(${q.hue.toFixed(0)},${(q.sat * 100).toFixed(0)}%,${(q.lit * 100).toFixed(0)}%)`;
    const hslColor0 = `hsla(${q.hue.toFixed(0)},${(q.sat * 100).toFixed(0)}%,${(q.lit * 100).toFixed(0)}%,0)`;
    const baseAlpha = q.ink * q.alpha;
    const drawAlpha = Math.min(0.85, baseAlpha * (0.14 + contrast * 0.52));

    // ── Brush stroke: oriented along velocity, drawn as trail segment ────────
    if (isBrush && bp) {
      const angle = q.angle ?? 0;
      const pt = pts[5];
      const brushLen = Math.max(3, q.size * smul * 8 * bp.lengthMul * (q.isSingleton ? 3 : 1));
      const brushW = Math.max(0.4, q.size * smul * bp.widthMul * (0.4 + q.mood * 0.6) * (q.isSingleton ? 2 : 1));
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const jitteredAlpha = drawAlpha * bp.opacityMul * (1 - bp.opacityJitter * Math.random());
      if (bp.textureBreak > 0 && Math.random() < bp.textureBreak) continue;

      ctx.lineCap = bp.lineCap;
      for (let b = 0; b < bp.bristles; b++) {
        const offsetPerp = bp.bristleSpread > 0 ? (b - (bp.bristles - 1) / 2) * bp.bristleSpread : 0;
        const ox = -sin * offsetPerp, oy = cos * offsetPerp;
        const widthVar = brushW * (1 - bp.widthJitter * Math.random());
        ctx.globalAlpha = Math.min(0.8, jitteredAlpha / bp.bristles);
        ctx.strokeStyle = hslColor;
        ctx.lineWidth = Math.max(0.3, widthVar);
        ctx.beginPath();
        ctx.moveTo(pt[0] - cos * brushLen * 0.5 + ox, pt[1] - sin * brushLen * 0.5 + oy);
        ctx.lineTo(pt[0] + cos * brushLen * 0.5 + ox, pt[1] + sin * brushLen * 0.5 + oy);
        ctx.stroke();
      }
      if (bp.bleed > 0.05) {
        ctx.globalAlpha = jitteredAlpha * bp.bleed * 0.08;
        ctx.filter = 'blur(4px)';
        ctx.strokeStyle = hslColor;
        ctx.lineWidth = brushW * 3;
        ctx.beginPath();
        ctx.moveTo(pt[0] - cos * brushLen * 0.4, pt[1] - sin * brushLen * 0.4);
        ctx.lineTo(pt[0] + cos * brushLen * 0.4, pt[1] + sin * brushLen * 0.4);
        ctx.stroke();
        ctx.filter = 'none';
      }
      ctx.lineCap = 'round';
      continue;
    }

    // Glyph role
    if (q.role === 'GLYPH' && glyphness > 0.12 && tick % 10 === Math.floor(q.age % 10)) {
      const glyphs = ['◎', '⊕', '×', '∴', '○', '∞', '◆', '⊛', '∇', '∑', '⊘', '◬'];
      ctx.globalAlpha = Math.min(0.9, drawAlpha * 1.5);
      ctx.fillStyle = hslColor;
      ctx.font = `${Math.max(6, q.size * smul * 1.6)}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let f = 0; f < folds; f++) {
        const angle = (f / folds) * Math.PI * 2;
        const c = Math.cos(angle), s = Math.sin(angle);
        const dx = px - cx, dy = py - cy;
        ctx.fillText(glyphs[q.glyphIndex % glyphs.length],
          cx + dx * c - dy * s, cy + dx * s + dy * c);
      }
      continue;
    }

    // Per symmetry fold
    for (let f = 0; f < folds; f++) {
      let fpts = pts;
      if (folds > 1) {
        const angle = (f / folds) * Math.PI * 2;
        const c = Math.cos(angle), s = Math.sin(angle);
        fpts = pts.map(([px2, py2]) => {
          const dx = px2 - cx, dy = py2 - cy;
          return [cx + dx * c - dy * s, cy + dx * s + dy * c];
        });
      }

      ctx.fillStyle = hslColor;
      ctx.strokeStyle = hslColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (archetype) {
        case 'dust': {
          const r = Math.max(0.3, q.size * smul * 0.22 + q.mood * 0.18);
          drawShapeMark(ctx, shape, fpts[5][0], fpts[5][1], r, hslColor, drawAlpha * 0.65);
          break;
        }
        case 'blocks': {
          const bs = Math.max(2, Math.round(q.size * smul * (0.8 + dna.genes.structure * 1.3)));
          const bx = Math.round(fpts[5][0] / bs) * bs;
          const by = Math.round(fpts[5][1] / bs) * bs;
          const pad = dna.genes.fragmentation * bs * 0.3;
          const half = (bs - pad) / 2;
          drawShapeMark(ctx, shape, bx + bs / 2, by + bs / 2, half, hslColor, drawAlpha * 0.88);
          break;
        }
        case 'blobs': {
          const r = Math.max(3, q.size * smul * (1.8 + dna.genes.coherence * 5));
          const grad = ctx.createRadialGradient(fpts[5][0], fpts[5][1], 0, fpts[5][0], fpts[5][1], r);
          grad.addColorStop(0, hslColor);
          grad.addColorStop(0.6, hslColor);
          grad.addColorStop(1, hslColor0);
          ctx.fillStyle = grad;
          ctx.globalAlpha = drawAlpha * 0.22;
          ctx.beginPath();
          ctx.arc(fpts[5][0], fpts[5][1], r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = hslColor;
          break;
        }
        case 'straight':
        case 'lines':
        default: {
          // ── Catmull-Rom smooth curve through memory points ───────────────
          if (shape !== 'circle') {
            const r = Math.max(0.3, q.size * smul * 0.32);
            drawShapeMark(ctx, shape, fpts[5][0], fpts[5][1], r, hslColor, drawAlpha * 0.78);
          } else {
            // Thin bezier spline through pts[1]→pts[4] using pts[0] and pts[5] as tangent guides
            ctx.globalAlpha = drawAlpha;
            ctx.lineWidth = Math.max(0.2, q.size * smul * (archetype === 'straight' ? 0.35 : 0.28) * (0.5 + q.mood * 0.7));
            if (archetype === 'straight') ctx.lineCap = 'square';

            ctx.beginPath();
            ctx.moveTo(fpts[1][0], fpts[1][1]);
            for (let pi = 2; pi <= 4; pi++) {
              const p0 = fpts[pi - 2];
              const p1 = fpts[pi - 1];
              const p2 = fpts[pi];
              const p3 = fpts[Math.min(pi + 1, 5)];
              const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
              const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
              const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
              const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
              ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
            }
            ctx.stroke();
            if (archetype === 'straight') ctx.lineCap = 'round';
          }
          break;
        }
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

// ── renderQuantaParticles ─────────────────────────────────────────────────────
export function renderQuantaParticles(
  ctx: CanvasRenderingContext2D,
  quanta: Quantum[],
  dna: DNA,
  W: number, H: number,
  smul = 1.0,
  brushPreset?: BrushTexturePreset,
): void {
  ctx.clearRect(0, 0, W, H);
  const { contrast } = dna.genes;
  const isBrush = dna.genes.agentShape === 'brush';
  const bp = brushPreset;

  for (const q of quanta) {
    if (q.role === 'FLOW' || q.role === 'MASK') continue;
    const px = q.x * W;
    const py = q.y * H;
    const hsl = `hsl(${q.hue.toFixed(0)},${(q.sat * 100).toFixed(0)}%,${(q.lit * 100).toFixed(0)}%)`;
    const baseAlpha = Math.min(0.9, q.ink * q.alpha * (0.28 + contrast * 0.55));

    if (isBrush && bp) {
      // ── Brush rendering ────────────────────────────────────────────────
      const angle = q.angle ?? 0;
      const brushLen = Math.max(2, q.size * smul * 6 * bp.lengthMul * (q.isSingleton ? 3 : 1));
      const brushW = Math.max(0.5, q.size * smul * bp.widthMul * (0.5 + q.mood * 0.5) * (q.isSingleton ? 2 : 1));
      const cos = Math.cos(angle), sin = Math.sin(angle);

      ctx.lineCap = bp.lineCap;
      ctx.lineJoin = 'round';

      // Dry texture: skip strokes randomly
      if (bp.textureBreak > 0 && Math.random() < bp.textureBreak) continue;

      const jitteredAlpha = baseAlpha * bp.opacityMul * (1 - bp.opacityJitter * Math.random());

      for (let b = 0; b < bp.bristles; b++) {
        const offsetPerp = bp.bristleSpread > 0 ? (b - (bp.bristles - 1) / 2) * bp.bristleSpread : 0;
        const ox = -sin * offsetPerp;
        const oy =  cos * offsetPerp;
        const widthVar = brushW * (1 - bp.widthJitter * Math.random());
        ctx.globalAlpha = jitteredAlpha / bp.bristles;
        ctx.strokeStyle = hsl;
        ctx.lineWidth = Math.max(0.3, widthVar);
        ctx.beginPath();
        ctx.moveTo(px - cos * brushLen * 0.5 + ox, py - sin * brushLen * 0.5 + oy);
        ctx.lineTo(px + cos * brushLen * 0.5 + ox, py + sin * brushLen * 0.5 + oy);
        ctx.stroke();
      }

      // Bleed / bloom for wet/watercolor textures
      if (bp.bleed > 0.05) {
        ctx.globalAlpha = jitteredAlpha * bp.bleed * 0.12;
        ctx.filter = 'blur(3px)';
        ctx.strokeStyle = hsl;
        ctx.lineWidth = brushW * 2.5;
        ctx.beginPath();
        ctx.moveTo(px - cos * brushLen * 0.3, py - sin * brushLen * 0.3);
        ctx.lineTo(px + cos * brushLen * 0.3, py + sin * brushLen * 0.3);
        ctx.stroke();
        ctx.filter = 'none';
      }
    } else {
      // ── Normal dot rendering ────────────────────────────────────────────
      const a = baseAlpha;
      ctx.globalAlpha = a;
      ctx.fillStyle = hsl;
      const r = Math.max(0.5, q.size * smul * 0.38 * (q.isSingleton ? 5 : 1) + q.mood * 0.4);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
}

// ── renderConnections ─────────────────────────────────────────────────────────
export function renderConnections(
  ctx: CanvasRenderingContext2D,
  quanta: Quantum[],
  dna: DNA,
  W: number, H: number,
): void {
  ctx.clearRect(0, 0, W, H);
  const maxDist = (0.06 + dna.genes.coherence * 0.055) * Math.min(W, H);
  const maxDistSq = maxDist * maxDist;
  const sgCells = buildSpatialGrid(quanta);
  const { contrast, coherence } = dna.genes;

  for (let qi = 0; qi < quanta.length; qi++) {
    const q = quanta[qi];
    const px = q.x * W, py = q.y * H;
    const gx = Math.min(SG - 1, Math.max(0, Math.floor(q.x * SG)));
    const gy = Math.min(SG - 1, Math.max(0, Math.floor(q.y * SG)));

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx2 = gx + dx, ny2 = gy + dy;
        if (nx2 < 0 || ny2 < 0 || nx2 >= SG || ny2 >= SG) continue;
        for (const ni of sgCells[ny2 * SG + nx2]) {
          if (ni <= qi) continue;
          const n = quanta[ni];
          const npx = n.x * W, npy = n.y * H;
          const ddx = npx - px, ddy = npy - py;
          const dsq = ddx * ddx + ddy * ddy;
          if (dsq > maxDistSq) continue;
          const dist = Math.sqrt(dsq);
          const t = 1 - dist / maxDist;
          const hue = (q.hue + n.hue) / 2;
          const lit = Math.max(0.2, Math.min(0.85, (q.lit + n.lit) / 2));
          const alpha = t * t * (0.08 + contrast * 0.18) * coherence;
          ctx.globalAlpha = Math.min(0.6, alpha);
          ctx.strokeStyle = `hsl(${hue.toFixed(0)},${(((q.sat + n.sat) / 2) * 100).toFixed(0)}%,${(lit * 100).toFixed(0)}%)`;
          ctx.lineWidth = Math.max(0.2, t * 0.9);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(npx, npy);
          ctx.stroke();
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ── renderGlow ────────────────────────────────────────────────────────────────
export function renderGlow(
  ctx: CanvasRenderingContext2D,
  quanta: Quantum[],
  dna: DNA,
  W: number, H: number,
  smul = 1.0,
): void {
  ctx.clearRect(0, 0, W, H);
  const { coherence, contrast, flow } = dna.genes;
  // Reduced glow radius — was causing an ugly "fixed halo" at default settings
  const glowR = (5 + coherence * 10 + flow * 5) * smul;

  const bg = dna.background;
  const bgLuma = bg.length >= 7
    ? (parseInt(bg.slice(1, 3), 16) * 0.299 + parseInt(bg.slice(3, 5), 16) * 0.587 + parseInt(bg.slice(5, 7), 16) * 0.114) / 255
    : 0.1;
  const isLight = bgLuma > 0.5;

  for (const q of quanta) {
    if (q.ink < 0.08) continue;
    const px = q.x * W, py = q.y * H;
    const alpha = q.ink * q.alpha * (0.04 + contrast * 0.08 + (isLight ? 0.03 : 0));
    if (alpha < 0.004) continue;
    const r = glowR * (0.5 + q.size * 0.08);
    const litAdj = isLight ? Math.max(0.1, q.lit * 0.72) : Math.min(0.9, q.lit + 0.15);
    const hsl0 = `hsl(${q.hue.toFixed(0)},${Math.min(100, q.sat * 120).toFixed(0)}%,${(litAdj * 100).toFixed(0)}%)`;
    const hsl1 = `hsla(${q.hue.toFixed(0)},${(q.sat * 100).toFixed(0)}%,${(litAdj * 100).toFixed(0)}%,0.3)`;
    const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
    grad.addColorStop(0, hsl0);
    grad.addColorStop(0.45, hsl1);
    grad.addColorStop(1, `hsla(${q.hue.toFixed(0)},50%,50%,0)`);
    ctx.globalAlpha = Math.min(0.7, alpha);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── applyGuideForces — persistent guide lines + channel paths act on quanta ──
export function applyGuideForces(
  quanta: Quantum[],
  guideLines: GuideLine[],
  channelPaths: ChannelPath[],
): void {
  const GUIDE_REACH = 0.12;      // normalized distance at which guide line force fades to 0
  const CHANNEL_REACH = 0.06;    // narrower reach for pencil channels

  for (const q of quanta) {
    // ── Guide Lines (flow / pinch) — attract toward line like gravity rails ──
    for (const gl of guideLines) {
      const rdx = gl.x2 - gl.x1, rdy = gl.y2 - gl.y1;
      const rlen2 = rdx * rdx + rdy * rdy;
      if (rlen2 < 0.0001) continue;
      // Project agent onto the line segment
      const t = Math.max(0, Math.min(1, ((q.x - gl.x1) * rdx + (q.y - gl.y1) * rdy) / rlen2));
      const px = gl.x1 + t * rdx, py = gl.y1 + t * rdy;
      const tox = px - q.x, toy = py - q.y;
      const d = Math.sqrt(tox * tox + toy * toy) + 0.0001;
      if (d > GUIDE_REACH) continue;
      const falloff = 1 - d / GUIDE_REACH;

      if (gl.type === 'flow') {
        // Attract perpendicularly toward line + push along line direction
        const perpF = gl.strength * 0.08 * falloff * falloff / (d * 2 + 0.005);
        q.vx += (tox / d) * perpF;
        q.vy += (toy / d) * perpF;
        // Push along line direction
        const lineLen = Math.sqrt(rlen2);
        const ldx = rdx / lineLen, ldy = rdy / lineLen;
        q.vx += ldx * gl.strength * 0.012 * falloff;
        q.vy += ldy * gl.strength * 0.012 * falloff;
      } else {
        // Pinch: pure perpendicular attraction (compress toward line)
        const perpF = gl.strength * 0.12 * falloff * falloff / (d * 2 + 0.005);
        q.vx += (tox / d) * perpF;
        q.vy += (toy / d) * perpF;
      }
    }

    // ── Channel Paths (pencil) — push agents along the closest path segment ──
    for (const ch of channelPaths) {
      const pts = ch.points;
      if (pts.length < 2) continue;
      let bestDist = Infinity, bestTox = 0, bestToy = 0, bestDx = 0, bestDy = 0;
      // Find nearest segment
      for (let i = 0; i < pts.length - 1; i++) {
        const ax = pts[i][0], ay = pts[i][1];
        const bx = pts[i + 1][0], by = pts[i + 1][1];
        const sdx = bx - ax, sdy = by - ay;
        const slen2 = sdx * sdx + sdy * sdy;
        if (slen2 < 0.000001) continue;
        const t = Math.max(0, Math.min(1, ((q.x - ax) * sdx + (q.y - ay) * sdy) / slen2));
        const px = ax + t * sdx, py = ay + t * sdy;
        const tx = px - q.x, ty = py - q.y;
        const dd = Math.sqrt(tx * tx + ty * ty);
        if (dd < bestDist) {
          bestDist = dd;
          bestTox = tx; bestToy = ty;
          const slen = Math.sqrt(slen2);
          bestDx = sdx / slen; bestDy = sdy / slen;
        }
      }
      if (bestDist > CHANNEL_REACH) continue;
      const falloff = 1 - bestDist / CHANNEL_REACH;
      // Attract toward path + push along path direction
      const perpF = ch.strength * 0.06 * falloff * falloff / (bestDist + 0.003);
      q.vx += (bestTox / (bestDist + 0.0001)) * perpF;
      q.vy += (bestToy / (bestDist + 0.0001)) * perpF;
      // Along-path push
      q.vx += bestDx * ch.strength * 0.02 * falloff;
      q.vy += bestDy * ch.strength * 0.02 * falloff;
    }
  }
}

// ── renderGuides — draw guide lines (dashed) and channel paths (pencil) onto ctx
export function renderGuides(
  ctx: CanvasRenderingContext2D,
  guideLines: GuideLine[],
  channelPaths: ChannelPath[],
  W: number, H: number,
  tick: number,
): void {
  ctx.save();
  ctx.lineCap = 'round';

  // ── Guide Lines ─────────────────────────────────────────────────────────────
  for (const gl of guideLines) {
    const x1 = gl.x1 * W, y1 = gl.y1 * H;
    const x2 = gl.x2 * W, y2 = gl.y2 * H;
    const col = gl.color;
    // Outer glow
    ctx.strokeStyle = col; ctx.lineWidth = 6 * gl.strength;
    ctx.globalAlpha = 0.06;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    // Inner dashed core
    ctx.lineWidth = 1.4; ctx.globalAlpha = 0.65;
    ctx.setLineDash(gl.type === 'pinch' ? [3, 5] : [6, 4]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
    // Notch ticks (like Music Lab rails)
    const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    if (len > 10) {
      const nx = -dy / len, ny = dx / len;
      const nTicks = Math.floor(len / 16);
      ctx.lineWidth = 0.7; ctx.globalAlpha = 0.35;
      for (let k = 1; k < nTicks; k++) {
        const fx = x1 + dx * (k / nTicks), fy = y1 + dy * (k / nTicks);
        ctx.beginPath();
        ctx.moveTo(fx + nx * 4, fy + ny * 4);
        ctx.lineTo(fx - nx * 4, fy - ny * 4);
        ctx.stroke();
      }
    }
    // Animated particles along line
    const nP = 3;
    for (let k = 0; k < nP; k++) {
      const phase = ((k / nP) + tick * 0.003) % 1;
      const px = x1 + (x2 - x1) * phase, py = y1 + (y2 - y1) * phase;
      ctx.globalAlpha = 0.5 * (0.5 + 0.5 * Math.sin(tick * 0.06 + k * 1.5));
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // Endpoint dots
    ctx.globalAlpha = 0.7; ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x1, y1, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x2, y2, 3, 0, Math.PI * 2); ctx.fill();
  }

  // ── Channel Paths (pencil stroke) ───────────────────────────────────────────
  for (const ch of channelPaths) {
    if (ch.points.length < 2) continue;
    const col = ch.color;
    // Soft glow
    ctx.strokeStyle = col; ctx.lineWidth = 4 * ch.strength;
    ctx.globalAlpha = 0.05;
    ctx.beginPath();
    ctx.moveTo(ch.points[0][0] * W, ch.points[0][1] * H);
    for (let i = 1; i < ch.points.length; i++) {
      ctx.lineTo(ch.points[i][0] * W, ch.points[i][1] * H);
    }
    ctx.stroke();
    // Core pencil line
    ctx.lineWidth = 1.2; ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(ch.points[0][0] * W, ch.points[0][1] * H);
    for (let i = 1; i < ch.points.length; i++) {
      ctx.lineTo(ch.points[i][0] * W, ch.points[i][1] * H);
    }
    ctx.stroke();
    // Direction arrows every ~15 points
    ctx.globalAlpha = 0.45; ctx.fillStyle = col;
    for (let i = 8; i < ch.points.length - 1; i += 12) {
      const px = ch.points[i][0] * W, py = ch.points[i][1] * H;
      const nx = ch.points[i + 1][0] * W, ny = ch.points[i + 1][1] * H;
      const ddx = nx - px, ddy = ny - py;
      const dlen = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dlen < 0.5) continue;
      const ux = ddx / dlen, uy = ddy / dlen;
      const al = 7, aw = 3;
      ctx.beginPath();
      ctx.moveTo(px + ux * al, py + uy * al);
      ctx.lineTo(px - uy * aw, py + ux * aw);
      ctx.lineTo(px + uy * aw, py - ux * aw);
      ctx.closePath(); ctx.fill();
    }
  }

  ctx.restore();
}

// ── renderToolCursor — circle indicator for active force/guide tools ──────────
export function renderToolCursor(
  ctx: CanvasRenderingContext2D,
  toolState: ToolState,
  W: number, H: number,
  tick: number,
): void {
  if (!toolState.isDragging) return;
  const tid = toolState.activeToolId;
  // Only show for force and guide tools (not spawn/erase/mutation)
  const forceTools = [
    'attract', 'attractor', 'repel', 'repulsor', 'vortex', 'freeze',
    'burst', 'black_hole', 'scatter_burst',
  ];
  if (!forceTools.includes(tid)) return;

  const x = toolState.lastX;
  const y = toolState.lastY;
  const r = toolState.size;

  ctx.save();
  // Outer pulse ring
  const pulse = 0.6 + 0.4 * Math.sin(tick * 0.08);
  ctx.globalAlpha = 0.25 * pulse;
  ctx.strokeStyle = tid === 'freeze' ? '#80ddff'
    : tid === 'burst' || tid === 'scatter_burst' ? '#ff6040'
    : tid === 'black_hole' ? '#a040ff'
    : '#ffffff';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  // Inner crosshair
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 0.8;
  const ch = 6;
  ctx.beginPath(); ctx.moveTo(x - ch, y); ctx.lineTo(x + ch, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - ch); ctx.lineTo(x, y + ch); ctx.stroke();
  // Center dot
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}