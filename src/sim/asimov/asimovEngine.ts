// ── Asimov Theater — Simulation Engine ────────────────────────────────────────
import {
  WorldState, MacroField, Agent, GRID_SIZE,
  fieldIdx, sampleField, makeRNG,
} from './asimovTypes';
import {
  buildSpatialHash, getNeighborIndices, wrap, wrapDelta, updateCentroids,
} from './asimovWorld';

// ── Config ─────────────────────────────────────────────────────────────────
const INTERACT_RADIUS      = 0.065;
const CONFLICT_THRESHOLD   = 0.030;
const COHESION_STRENGTH    = 0.45;
const REPULSION_STRENGTH   = 0.55;
const WEALTH_HARVEST_RATE  = 0.012;
const WEALTH_DECAY_RATE    = 0.0015;
const WEALTH_TRANSFER_RATE = 0.008;
const VELOCITY_DAMPING     = 0.88;
const MAX_SPEED            = 0.012;
const R_REGEN_RATE         = 0.014;
const R_DIFFUSION          = 0.08;
const N_DECAY_RATE         = 0.004;
const L_ADJUST_RATE        = 0.018;
const GRADIENT_STRENGTH    = 0.18;
const MULE_L_PULL          = 0.35;
const MULE_FEAR_REDUCE     = 0.15;

// ── Field helpers ──────────────────────────────────────────────────────────
function addToField(arr: Float32Array, x: number, y: number, amount: number) {
  const i = fieldIdx(x, y);
  arr[i] = Math.max(0, Math.min(1, arr[i] + amount));
}

function fieldGradient(arr: Float32Array, x: number, y: number): [number, number] {
  const ix = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(x * GRID_SIZE)));
  const iy = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(y * GRID_SIZE)));
  const ixp = Math.min(GRID_SIZE - 1, ix + 1);
  const ixm = Math.max(0, ix - 1);
  const iyp = Math.min(GRID_SIZE - 1, iy + 1);
  const iym = Math.max(0, iy - 1);
  const gx = (arr[ixp + iy * GRID_SIZE] - arr[ixm + iy * GRID_SIZE]) * 0.5;
  const gy = (arr[ix + iyp * GRID_SIZE] - arr[ix + iym * GRID_SIZE]) * 0.5;
  return [gx, gy];
}

// ── Main step function ─────────────────────────────────────────────────────
export function stepWorld(world: WorldState, dt: number, rng: () => number): void {
  const { agents, field } = world;
  let newConflicts = 0;

  const hash = buildSpatialHash(agents);

  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    let fx = 0, fy = 0;

    // Field sampling
    const localR = sampleField(field.R, a.x, a.y);
    const localN = sampleField(field.N, a.x, a.y);
    const localL = sampleField(field.L, a.x, a.y);

    // Gradient attraction to R (resource seeking)
    const [gxR, gyR] = fieldGradient(field.R, a.x, a.y);
    fx += gxR * GRADIENT_STRENGTH;
    fy += gyR * GRADIENT_STRENGTH;

    // Agent interactions
    const candidates = getNeighborIndices(hash, a.x, a.y, INTERACT_RADIUS);
    for (const j of candidates) {
      if (j === i) continue;
      const b = agents[j];
      const dx = wrapDelta(b.x - a.x);
      const dy = wrapDelta(b.y - a.y);
      const d2 = dx * dx + dy * dy;
      if (d2 === 0 || d2 > INTERACT_RADIUS * INTERACT_RADIUS) continue;
      const d = Math.sqrt(d2);
      const strength = (1 - d / INTERACT_RADIUS);
      const ux = dx / d;
      const uy = dy / d;

      if (a.factionId === b.factionId) {
        // Intra-faction: attraction (cohesion)
        const cohStrength = COHESION_STRENGTH * strength * (0.5 + a.belief * 0.5);
        fx += cohStrength * ux;
        fy += cohStrength * uy;

        // Slow wealth equalization
        if (rng() < WEALTH_TRANSFER_RATE * dt) {
          const diff = b.wealth - a.wealth;
          a.wealth = Math.max(0, Math.min(1, a.wealth + diff * 0.05 * (1 + localL)));
        }
      } else {
        // Inter-faction: repulsion (conflict)
        // N field reduces inter-faction aggression
        const normDamp = 0.25 + 0.75 * localN;
        const repStrength = REPULSION_STRENGTH * strength * normDamp;
        fx -= repStrength * ux;
        fy -= repStrength * uy;

        // Fear response to nearby enemies
        if (d < CONFLICT_THRESHOLD * 2) {
          a.fear = Math.min(1, a.fear + 0.015 * strength);
        }

        // Conflict event: very close enemy contact
        if (d < CONFLICT_THRESHOLD) {
          newConflicts++;
          // Status contest: higher status "wins" wealth
          if (a.status > b.status && b.wealth > 0.05) {
            const stolen = Math.min(b.wealth * 0.02, 0.01);
            a.wealth = Math.min(1, a.wealth + stolen);
          }
        }
      }
    }

    // Fear-driven avoidance (global)
    fx -= a.fear * a.vx * 0.2;
    fy -= a.fear * a.vy * 0.2;

    // Resource harvesting
    const harvest = localR * WEALTH_HARVEST_RATE * dt;
    a.wealth = Math.min(1, a.wealth + harvest);
    addToField(field.R, a.x, a.y, -harvest * 0.4);

    // Wealth decay (metabolism/spending)
    a.wealth = Math.max(0, a.wealth - WEALTH_DECAY_RATE * dt);

    // Fear decay
    a.fear = Math.max(0, a.fear - 0.008 * dt);

    // Velocity integration
    a.vx = (a.vx + fx * dt) * VELOCITY_DAMPING;
    a.vy = (a.vy + fy * dt) * VELOCITY_DAMPING;

    // Speed cap
    const spd = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
    if (spd > MAX_SPEED) {
      a.vx = (a.vx / spd) * MAX_SPEED;
      a.vy = (a.vy / spd) * MAX_SPEED;
    }

    // Position update (toroidal)
    a.x = wrap(a.x + a.vx);
    a.y = wrap(a.y + a.vy);
  }

  world.conflictAccum += newConflicts;
  world.conflictDecay = world.conflictDecay * 0.92 + newConflicts * 0.08;
  world.t += dt;
}

// ── MacroTick: field + global dynamics ────────────────────────────────────
export function macroTick(
  world: WorldState,
  dt: number,           // macroTick interval
  gini: number,         // from metrics
  nBaseline: number,    // preset's N baseline
): void {
  const { field, agents } = world;
  const sz = GRID_SIZE;
  const n = sz * sz;

  // Scratch buffer for diffusion
  const Rnew = new Float32Array(n);

  // R: regeneration + diffusion
  for (let iy = 0; iy < sz; iy++) {
    for (let ix = 0; ix < sz; ix++) {
      const i = ix + iy * sz;
      const neighbors = [
        field.R[((ix - 1 + sz) % sz) + iy * sz],
        field.R[((ix + 1) % sz) + iy * sz],
        field.R[ix + ((iy - 1 + sz) % sz) * sz],
        field.R[ix + ((iy + 1) % sz) * sz],
      ];
      const avgNeighbor = (neighbors[0] + neighbors[1] + neighbors[2] + neighbors[3]) / 4;
      let r = field.R[i];
      r += R_REGEN_RATE * dt;
      r = r * (1 - R_DIFFUSION) + avgNeighbor * R_DIFFUSION;
      Rnew[i] = Math.max(0, Math.min(1, r));
    }
  }
  field.R.set(Rnew);

  // N: decay toward baseline
  for (let i = 0; i < n; i++) {
    field.N[i] = field.N[i] + (nBaseline - field.N[i]) * N_DECAY_RATE * dt;
    field.N[i] = Math.max(0, Math.min(1, field.N[i]));
  }

  // L: adjust toward target
  // target_L = f(R, N, gini)
  // High R and moderate N → higher L; high gini erodes L slowly
  const giniImpact = gini * 0.4 * dt;
  for (let iy = 0; iy < sz; iy++) {
    for (let ix = 0; ix < sz; ix++) {
      const i = ix + iy * sz;
      const localR = field.R[i];
      const localN = field.N[i];
      // Legitimacy target: prosperity helps, excessive norm hurts
      const targetL = Math.max(0,
        localR * 0.6
        + (1 - Math.max(0, localN - 0.6) * 1.2) * 0.3
        + 0.1
      );
      field.L[i] = field.L[i] + (targetL - field.L[i]) * L_ADJUST_RATE * dt;
      field.L[i] = Math.max(0, Math.min(1, field.L[i] - giniImpact * 0.05));
    }
  }

  updateCentroids(world);
}

// ── Mule influence (if active) ────────────────────────────────────────────
export function applyMuleEffect(world: WorldState, muleX: number, muleY: number, muleRadius: number): void {
  const { agents, field } = world;

  // Boost L in mule's radius
  for (let iy = 0; iy < GRID_SIZE; iy++) {
    for (let ix = 0; ix < GRID_SIZE; ix++) {
      const cx = (ix + 0.5) / GRID_SIZE;
      const cy = (iy + 0.5) / GRID_SIZE;
      const dx = wrapDelta(cx - muleX);
      const dy = wrapDelta(cy - muleY);
      const d2 = dx * dx + dy * dy;
      if (d2 < muleRadius * muleRadius) {
        const str = 1 - Math.sqrt(d2) / muleRadius;
        const i = ix + iy * GRID_SIZE;
        field.L[i] = Math.min(1, field.L[i] + MULE_L_PULL * str * 0.01);
      }
    }
  }

  // Affect nearby agents: reduce fear, increase belief
  for (const a of agents) {
    const dx = wrapDelta(a.x - muleX);
    const dy = wrapDelta(a.y - muleY);
    const d2 = dx * dx + dy * dy;
    if (d2 < muleRadius * muleRadius) {
      const str = 1 - Math.sqrt(d2) / muleRadius;
      a.fear = Math.max(0, a.fear - MULE_FEAR_REDUCE * str * 0.02);
      a.belief = Math.min(1, a.belief + 0.01 * str);
    }
  }
}

// ── Forecast mini-step (simplified physics, larger dt) ───────────────────
export function stepWorldFast(world: WorldState, dt: number, rng: () => number): void {
  // Same as stepWorld but skip some expensive path (no hash rebuild every call)
  stepWorld(world, dt, rng);
}

// ── Gini coefficient ──────────────────────────────────────────────────────
export function computeGini(agents: Agent[]): number {
  if (agents.length === 0) return 0;
  const sorted = agents.map(a => a.wealth).sort((a, b) => a - b);
  const n = sorted.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (2 * (i + 1) - n - 1) * sorted[i];
    den += sorted[i];
  }
  if (den === 0) return 0;
  return Math.max(0, Math.min(1, num / (n * den)));
}
