// ── Asimov Theater — World Creation & Spatial Hash ───────────────────────────
import {
  Agent, MacroField, WorldState, createMacroField,
  GRID_SIZE, makeRNG,
} from './asimovTypes';

// ── Spatial Hash ──────────────────────────────────────────────────────────
const CELL_SIZE = 0.07;
const HASH_COLS = Math.ceil(1 / CELL_SIZE) + 1; // ~15

export function buildSpatialHash(agents: Agent[]): Map<number, number[]> {
  const map = new Map<number, number[]>();
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const cx = Math.floor(a.x / CELL_SIZE);
    const cy = Math.floor(a.y / CELL_SIZE);
    const key = cx + cy * HASH_COLS;
    let cell = map.get(key);
    if (!cell) { cell = []; map.set(key, cell); }
    cell.push(i);
  }
  return map;
}

export function getNeighborIndices(
  hash: Map<number, number[]>,
  x: number, y: number,
  radius: number
): number[] {
  const result: number[] = [];
  const r = Math.ceil(radius / CELL_SIZE);
  const cx0 = Math.floor(x / CELL_SIZE);
  const cy0 = Math.floor(y / CELL_SIZE);
  for (let dcx = -r; dcx <= r; dcx++) {
    for (let dcy = -r; dcy <= r; dcy++) {
      const key = (cx0 + dcx) + (cy0 + dcy) * HASH_COLS;
      const cell = hash.get(key);
      if (cell) for (const idx of cell) result.push(idx);
    }
  }
  return result;
}

// ── Agent Creation ────────────────────────────────────────────────────────
export function createAgent(id: number, rng: () => number, factionId: number, factionCount: number): Agent {
  // Agents start clustered near faction "home" zones (quadrants)
  const fCol = factionId % 2;
  const fRow = Math.floor(factionId / 2);
  const spreadX = 0.20;
  const spreadY = 0.20;
  const baseX = fCol === 0 ? 0.25 : 0.75;
  const baseY = fRow === 0 ? 0.25 : 0.75;
  return {
    x: Math.max(0.01, Math.min(0.99, baseX + (rng() - 0.5) * spreadX * 2)),
    y: Math.max(0.01, Math.min(0.99, baseY + (rng() - 0.5) * spreadY * 2)),
    vx: (rng() - 0.5) * 0.02,
    vy: (rng() - 0.5) * 0.02,
    factionId,
    wealth: 0.3 + rng() * 0.4,
    belief: 0.4 + rng() * 0.3,
    fear: rng() * 0.2,
    status: rng() * 0.5,
    id,
  };
}

// ── Field Initialization ──────────────────────────────────────────────────
export function initField(field: MacroField, rng: () => number, opts: {
  nBaseline: number;
  lBaseline: number;
  rBaseline: number;
  nNoise: number;
  lNoise: number;
  rNoise: number;
}) {
  const n = GRID_SIZE * GRID_SIZE;
  for (let i = 0; i < n; i++) {
    field.N[i] = Math.max(0, Math.min(1, opts.nBaseline + (rng() - 0.5) * opts.nNoise));
    field.L[i] = Math.max(0, Math.min(1, opts.lBaseline + (rng() - 0.5) * opts.lNoise));
    field.R[i] = Math.max(0, Math.min(1, opts.rBaseline + (rng() - 0.5) * opts.rNoise));
  }
}

// ── World Creation ────────────────────────────────────────────────────────
export interface WorldInitOpts {
  agentCount: number;
  factionCount: number;
  seed: number;
  nBaseline: number;
  lBaseline: number;
  rBaseline: number;
  nNoise: number;
  lNoise: number;
  rNoise: number;
}

export function createWorld(opts: WorldInitOpts): WorldState {
  const rng = makeRNG(opts.seed);
  const field = createMacroField();
  initField(field, rng, opts);

  const agents: Agent[] = [];
  for (let i = 0; i < opts.agentCount; i++) {
    const factionId = i % opts.factionCount;
    agents.push(createAgent(i, rng, factionId, opts.factionCount));
  }

  // Shuffle agents so factions are not perfectly ordered
  for (let i = agents.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [agents[i], agents[j]] = [agents[j], agents[i]];
  }
  // Re-assign faction by quadrant placement to cluster nicely
  for (let k = 0; k < opts.agentCount; k++) {
    agents[k].factionId = k % opts.factionCount;
    agents[k].id = k;
  }

  const centroids = Array.from({ length: opts.factionCount }, () => ({
    x: 0.5, y: 0.5, count: 0,
  }));

  return {
    agents,
    field,
    agentCount: opts.agentCount,
    factionCount: opts.factionCount,
    t: 0,
    seed: opts.seed,
    conflictAccum: 0,
    conflictDecay: 0,
    centroids,
  };
}

// ── Deep copy world state (for forecast snapshots) ───────────────────────
export function cloneWorldState(w: WorldState): WorldState {
  const n = GRID_SIZE * GRID_SIZE;
  const field: MacroField = {
    N: new Float32Array(w.field.N),
    L: new Float32Array(w.field.L),
    R: new Float32Array(w.field.R),
    size: w.field.size,
  };
  const agents: Agent[] = w.agents.map(a => ({ ...a }));
  return {
    agents,
    field,
    agentCount: w.agentCount,
    factionCount: w.factionCount,
    t: w.t,
    seed: w.seed,
    conflictAccum: w.conflictAccum,
    conflictDecay: w.conflictDecay,
    centroids: w.centroids.map(c => ({ ...c })),
  };
}

// ── Toroidal wrap ──────────────────────────────────────────────────────────
export function wrap(v: number): number {
  if (v < 0) return v + 1;
  if (v >= 1) return v - 1;
  return v;
}

export function wrapDelta(d: number): number {
  if (d > 0.5) return d - 1;
  if (d < -0.5) return d + 1;
  return d;
}

// ── Compute faction centroids (call once per macroTick) ───────────────────
export function updateCentroids(world: WorldState) {
  const { agents, factionCount, centroids } = world;
  for (let f = 0; f < factionCount; f++) {
    centroids[f].x = 0;
    centroids[f].y = 0;
    centroids[f].count = 0;
  }
  for (const a of agents) {
    const c = centroids[a.factionId];
    c.x += a.x;
    c.y += a.y;
    c.count++;
  }
  for (let f = 0; f < factionCount; f++) {
    const c = centroids[f];
    if (c.count > 0) { c.x /= c.count; c.y /= c.count; }
    else { c.x = 0.5; c.y = 0.5; }
  }
}
