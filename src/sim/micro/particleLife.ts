// Particle Life core update logic with Particle Life canonical kernel
import { MicroState, MicroConfig, FOOD_TYPE } from './microState';
import { InteractionMatrix } from './matrix';
import { SpatialHash, createSpatialHash, clearHash, insertParticle, queryNeighbors } from './spatialHash';
import { fieldInfluence as getFieldInfluence, depositSigil as dropSigil } from './fieldAccessor';
import { updateMetamorphosis } from './metamorphosis';

// PATCH 04.3: Sigil field injector (set by App) - deprecated, use depositSigil from fieldAccessor
let sigilInjector: ((name: string, x: number, y: number, amount: number) => void) | null = null;

export function setSigilInjector(fn: (name: string, x: number, y: number, amount: number) => void) {
  sigilInjector = fn;
}

let spatialHash: SpatialHash | null = null;
let lastMaxRadius = 0;
let lastMaxParticles = 0;

// Persistent force accumulators (avoid allocation per frame)
let fx: Float32Array | null = null;
let fy: Float32Array | null = null;

// --- Micro perf stats (last frame) ---
let lastNeighborsChecked = 0;
let lastInteractionsApplied = 0;

export const getMicroPerfStats = () => ({
  neighborsChecked: lastNeighborsChecked,
  interactionsApplied: lastInteractionsApplied,
});

// Simple deterministic noise function for wander
const simpleHash = (x: number, y: number, seed: number): number => {
  let h = seed + x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296; // [0, 1)
};

export const updateParticleLife = (
  state: MicroState,
  config: MicroConfig,
  matrix: InteractionMatrix,
  fieldInfluence: (x: number, y: number) => { tension: number; cohesion: number; scarcity: number },
  rngMicro: { next: () => number; range: (min: number, max: number) => number; int: (min: number, max: number) => number },
  tick: number
): void => {
  // D) SPATIAL HASH: Calculate effective max radius
  let maxRadius = config.rmax;
  
  // Safety check: ensure matrix has required dimensions
  if (matrix.radius && matrix.radius.length >= config.typesCount) {
    for (let i = 0; i < config.typesCount; i++) {
      if (matrix.radius[i] && matrix.radius[i].length >= config.typesCount) {
        for (let j = 0; j < config.typesCount; j++) {
          if (matrix.radius[i][j] !== undefined) {
            maxRadius = Math.max(maxRadius, matrix.radius[i][j]);
          }
        }
      }
    }
  }
  maxRadius = Math.max(maxRadius, 0.08); // minimum clamp

  // Rebuild spatial hash if max radius changed or particle count changed
  if (!spatialHash || Math.abs(spatialHash.cellSize - maxRadius) > 0.01 || state.maxCount !== lastMaxParticles) {
    spatialHash = createSpatialHash(maxRadius, 2, state.maxCount);
    lastMaxRadius = maxRadius;
    lastMaxParticles = state.maxCount;
  }
  
  // Rebuild force arrays if needed
  if (!fx || fx.length !== state.maxCount) {
    fx = new Float32Array(state.maxCount);
    fy = new Float32Array(state.maxCount);
  }
  
  // Clear forces
  fx.fill(0);
  fy.fill(0);
  
  lastNeighborsChecked = 0;
  lastInteractionsApplied = 0;
  
  clearHash(spatialHash);
  for (let i = 0; i < state.count; i++) {
    insertParticle(spatialHash, i, state.x[i], state.y[i]);
  }

  // Compute forces
  for (let i = 0; i < state.count; i++) {
    const xi = state.x[i];
    const yi = state.y[i];
    const ti = state.type[i];
    
    // Skip particles with invalid types
    if (ti !== FOOD_TYPE && (ti < 0 || ti >= config.typesCount)) continue;

    // E) Get field influence for local parameter modulation (Meadows/Morin recursivity)
    // Use new fieldAccessor if available, fallback to old fieldInfluence
    const fieldNew = getFieldInfluence(xi, yi);
    const fieldOld = fieldInfluence(xi, yi);
    
    // Merge both field systems (new Meadows layers + old field)
    const scarcity = fieldNew.scarcity || fieldOld.scarcity || 0;
    const cohesion = fieldNew.cohesion || fieldOld.cohesion || 0;
    const volatility = fieldNew.volatility || 0;
    const nutrient = fieldNew.nutrient || 0.5;
    const entropy = fieldNew.entropy || 0;
    
    // PATCH 04.3: Sigil feedback (sigil→micro)
    const sigilBond = fieldNew.sigilBond || 0;
    const sigilRift = fieldNew.sigilRift || 0;
    const sigilBloom = fieldNew.sigilBloom || 0;
    const sigilOath = fieldNew.sigilOath || 0;
    
    // MEADOWS/MORIN MODULATION: macro → micro recursivity
    // Beta modulation: scarcity shifts attraction/repulsion balance (phase transitions)
    let betaLocal = config.beta * (1 + (scarcity - 0.5) * 0.25);
    betaLocal = Math.max(0.05, Math.min(0.95, betaLocal));
    
    // Drag modulation: volatility increases drag, cohesion reduces it, sigils modulate
    // sigilOath reduces drag (path persistence), sigilRift increases drag
    const dragLocal = config.drag * (1 + volatility * 0.35 - cohesion * 0.20 + sigilRift * 0.22 - sigilOath * 0.14);

    queryNeighbors(spatialHash, xi, yi, (j) => {
      if (i === j) return;

      let dx = state.x[j] - xi;
      let dy = state.y[j] - yi;

      // Wrap distance
      if (config.wrap) {
        if (dx > 1) dx -= 2;
        if (dx < -1) dx += 2;
        if (dy > 1) dy -= 2;
        if (dy < -1) dy += 2;
      }

      lastNeighborsChecked++;

      const distSq = dx * dx + dy * dy;
      if (distSq < 1e-8) return;

      const tj = state.type[j];

      // Skip invalid neighbor types
      if (tj !== FOOD_TYPE && (tj < 0 || tj >= config.typesCount)) return;

      // Defensive checks (IMPORTANT: do NOT use falsy checks; 0 is valid)
      if (!matrix.radius?.[ti] || matrix.radius[ti][tj] === undefined) return;
      if (!matrix.attract?.[ti] || matrix.attract[ti][tj] === undefined) return;

      // Radius (modulated by field)
      let r = matrix.radius[ti][tj];
      r = r * (1 + scarcity * 0.20);

      const rSq = r * r;
      if (distSq >= rSq) return;

      // Now compute dist only when inside interaction radius
      const dist = Math.sqrt(distSq);
      if (dist < 0.0001) return;

      const attract = matrix.attract[ti][tj];
      let forceMag = 0;

      if (config.kernelMode === 'classic') {
        const normalized = dist / r;

        if (normalized < betaLocal) {
          forceMag = (normalized / betaLocal - 1.0) * config.coreRepel;
        } else {
          forceMag = attract * (1.0 - Math.abs(1.0 + betaLocal - 2.0 * normalized) / (1.0 - betaLocal));
        }
      } else {
        const falloff = matrix.falloff?.[ti]?.[tj] ?? 1.2;
        const normalized = dist / r;
        forceMag = attract * Math.pow(1 - normalized, falloff);
      }

      // MEADOWS MODULATION: nutrient/volatility affects force magnitude
      // PATCH 04.3: Sigil modulation - Bond increases attraction, Rift increases repulsion
      const attractMod = 1 + (nutrient - 0.5) * 0.35 - volatility * 0.20 + sigilBond * 0.25 - sigilRift * 0.18;
      forceMag *= attractMod;

      // PATCH 04.5: Generate sigils from LOCAL INTERACTIONS (micro→sigil)
      const absF = Math.abs(forceMag);
      // BOND sigil: strong attraction events
      if (forceMag > 0.08 && absF < 0.60) {
        dropSigil('bond', xi, yi, 0.010 * absF);
      }
      // RIFT sigil: strong repulsion events
      if (forceMag < -0.10) {
        dropSigil('rift', xi, yi, 0.010 * absF);
      }

      // Apply force with softening
      const invDistSoft = 1.0 / (dist + config.softening);
      fx[i] += dx * invDistSoft * forceMag;
      fy[i] += dy * invDistSoft * forceMag;

      lastInteractionsApplied++;
    });

    // MORIN ENTROPY NOISE: add tiny deterministic force based on entropy
    // PATCH 04.3: sigilRift increases noise, sigilBond reduces it
    // DETERMINISTIC: use rngMicro instead of Math.random()
    const noise = (entropy + sigilRift * 0.10 - sigilBond * 0.05) * 0.015;
    fx[i] += (rngMicro.next() - 0.5) * noise;
    fy[i] += (rngMicro.next() - 0.5) * noise;

    // E) Field creates deterministic wander (not random walk!)
    if (scarcity > 0.3) {
      // Use simple hash for deterministic wander angle
      const wanderSeed = tick + i * 12345;
      const wanderAngle = simpleHash(Math.floor(xi * 100), Math.floor(yi * 100), wanderSeed) * Math.PI * 2;
      fx[i] += Math.cos(wanderAngle) * scarcity * 0.004;
      fy[i] += Math.sin(wanderAngle) * scarcity * 0.004;
    }
  }

  // Integrate
  for (let i = 0; i < state.count; i++) {
    const ti = state.type[i];
    
    // Skip particles with invalid types
    if (ti !== FOOD_TYPE && (ti < 0 || ti >= config.typesCount)) continue;
    
    const isFood = ti === FOOD_TYPE;
    
    // Food doesn't move by itself
    if (!isFood) {
      state.vx[i] += fx[i] * config.force * config.dt;
      state.vy[i] += fy[i] * config.force * config.dt;

      // C) Entropy with seeded RNG (not Math.random!)
      if (config.entropy > 0) {
        state.vx[i] += (rngMicro.next() - 0.5) * config.entropy;
        state.vy[i] += (rngMicro.next() - 0.5) * config.entropy;
      }

      // B) Exponential drag (Particle Life style) or old friction
      if (config.useDrag) {
        // Use new field layers system for drag modulation
        const fieldNew = getFieldInfluence(state.x[i], state.y[i]);
        const cohesion = fieldNew.cohesion || 0;
        const volatility = fieldNew.volatility || 0;
        const dragLocal = config.drag * (1 + volatility * 0.35 - cohesion * 0.20);
        const damping = Math.exp(-dragLocal * config.dt);
        state.vx[i] *= damping;
        state.vy[i] *= damping;
      } else {
        state.vx[i] *= config.friction;
        state.vy[i] *= config.friction;
      }

      // Speed clamp
      const speedSq = state.vx[i] * state.vx[i] + state.vy[i] * state.vy[i];
      if (speedSq > config.speedClamp * config.speedClamp) {
        const speed = Math.sqrt(speedSq);
        state.vx[i] = (state.vx[i] / speed) * config.speedClamp;
        state.vy[i] = (state.vy[i] / speed) * config.speedClamp;
      }

      // Update position
      state.x[i] += state.vx[i] * config.dt;
      state.y[i] += state.vy[i] * config.dt;
      
      // PATCH 04.5: Generate OATH and BLOOM sigils (sigil→field feedback)
      const F = getFieldInfluence(state.x[i], state.y[i]);
      const speed = Math.sqrt(state.vx[i] * state.vx[i] + state.vy[i] * state.vy[i]);
      
      // BLOOM sigil: high nutrient + low speed = feeding event
      if (F.nutrient && F.nutrient > 0.62 && speed < 0.06) {
        dropSigil('bloom', state.x[i], state.y[i], 0.006);
      }
      
      // OATH sigil: high memory/cohesion + low speed = ritual/path formation
      if ((F.memory && F.memory > 0.58) || (F.cohesion && F.cohesion > 0.58)) {
        if (speed < 0.045) {
          dropSigil('oath', state.x[i], state.y[i], 0.006);
        }
      }
    } else {
      // Food is stationary but has slow decay in energy
      state.energy[i] = Math.max(0.1, state.energy[i] * 0.999);
    }

    // Wrap
    if (config.wrap) {
      if (state.x[i] > 1) state.x[i] -= 2;
      if (state.x[i] < -1) state.x[i] += 2;
      if (state.y[i] > 1) state.y[i] -= 2;
      if (state.y[i] < -1) state.y[i] += 2;
    } else {
      // Bounce
      if (state.x[i] > 1) { state.x[i] = 1; state.vx[i] *= -0.5; }
      if (state.x[i] < -1) { state.x[i] = -1; state.vx[i] *= -0.5; }
      if (state.y[i] > 1) { state.y[i] = 1; state.vy[i] *= -0.5; }
      if (state.y[i] < -1) { state.y[i] = -1; state.vy[i] *= -0.5; }
    }
  }
  
  // G) Save current positions to history for trails
  const histIdx = state.historyIndex;
  for (let i = 0; i < state.count; i++) {
    state.historyX[histIdx][i] = state.x[i];
    state.historyY[histIdx][i] = state.y[i];
  }
  state.historyIndex = (state.historyIndex + 1) % state.historyLength;
  
  // I) METAMORPHOSIS: Apply mutations, evolution, and transformations
  if (config.metamorphosisEnabled) {
    updateMetamorphosis(
      state,
      config,
      matrix,
      (x: number, y: number) => {
        const field = getFieldInfluence(x, y);
        return {
          entropy: field.entropy || 0,
          volatility: field.volatility || 0,
          nutrient: field.nutrient || 0.5,
        };
      },
      rngMicro,
      tick
    );
  }
};

export const applyImpulse = (
  state: MicroState,
  x: number,
  y: number,
  radius: number,
  strength: number
): void => {
  for (let i = 0; i < state.count; i++) {
    const dx = state.x[i] - x;
    const dy = state.y[i] - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const force = strength * (1 - dist / radius);
      state.vx[i] += (dx / dist) * force;
      state.vy[i] += (dy / dist) * force;
    }
  }
};

export const applyWind = (
  state: MicroState,
  x: number,
  y: number,
  radius: number,
  dx: number,
  dy: number
): void => {
  for (let i = 0; i < state.count; i++) {
    const pdx = state.x[i] - x;
    const pdy = state.y[i] - y;
    const distSq = pdx * pdx + pdy * pdy;
    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      const force = 1 - dist / radius;
      state.vx[i] += dx * force * 0.01;
      state.vy[i] += dy * force * 0.01;
    }
  }
};

// White Hole - Strong repulsive force (pushes particles outward)
export const applyWhiteHole = (
  state: MicroState,
  x: number,
  y: number,
  radius: number,
  strength: number
): void => {
  for (let i = 0; i < state.count; i++) {
    const dx = state.x[i] - x;
    const dy = state.y[i] - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      // Repulsive force that gets stronger closer to center (inverse square-ish)
      const force = strength * (1.0 - dist / radius) * (1.0 - dist / radius);
      state.vx[i] += (dx / dist) * force;
      state.vy[i] += (dy / dist) * force;
    }
  }
};

// Black Hole - Strong attractive force (pulls particles inward)
export const applyBlackHole = (
  state: MicroState,
  x: number,
  y: number,
  radius: number,
  strength: number
): void => {
  for (let i = 0; i < state.count; i++) {
    const dx = state.x[i] - x;
    const dy = state.y[i] - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      // Attractive force that gets stronger closer to center (inverse square-ish)
      const force = strength * (1.0 - dist / radius) * (1.0 - dist / radius);
      state.vx[i] -= (dx / dist) * force;
      state.vy[i] -= (dy / dist) * force;
    }
  }
};

// ── 6 NEW POWERS ─────────────────────────────────────────────────────────────

// Vortex – tangential swirl (CCW rotation around cursor)
export const applyVortex = (
  state: MicroState, x: number, y: number,
  radius: number, strength: number
): void => {
  for (let i = 0; i < state.count; i++) {
    const dx = state.x[i] - x;
    const dy = state.y[i] - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const falloff = 1.0 - dist / radius;
      // Tangential direction (perpendicular to radial, CCW)
      state.vx[i] += (-dy / dist) * strength * falloff;
      state.vy[i] += ( dx / dist) * strength * falloff;
    }
  }
};

// Freeze – drains kinetic energy (velocity damping toward zero)
export const applyFreeze = (
  state: MicroState, x: number, y: number,
  radius: number, strength: number
): void => {
  for (let i = 0; i < state.count; i++) {
    const dx = state.x[i] - x;
    const dy = state.y[i] - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      const t = strength * (1.0 - dist / radius);
      state.vx[i] *= (1.0 - t);
      state.vy[i] *= (1.0 - t);
    }
  }
};

// Chaos – injects random velocity perturbations (thermal noise)
export const applyChaos = (
  state: MicroState, x: number, y: number,
  radius: number, strength: number
): void => {
  for (let i = 0; i < state.count; i++) {
    const dx = state.x[i] - x;
    const dy = state.y[i] - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      const falloff = 1.0 - dist / radius;
      const angle = Math.random() * Math.PI * 2;
      state.vx[i] += Math.cos(angle) * strength * falloff;
      state.vy[i] += Math.sin(angle) * strength * falloff;
    }
  }
};

// Quake – concentric sinusoidal pressure rings ripple outward
export const applyQuake = (
  state: MicroState, x: number, y: number,
  radius: number, strength: number, time: number
): void => {
  for (let i = 0; i < state.count; i++) {
    const dx = state.x[i] - x;
    const dy = state.y[i] - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const wave = Math.sin((dist / radius) * Math.PI * 6 - time * 10);
      const force = strength * wave * (1.0 - dist / radius);
      state.vx[i] += (dx / dist) * force;
      state.vy[i] += (dy / dist) * force;
    }
  }
};

// Nova – phase 0: implosion attract, phase 1: explosive repel
export const applyNova = (
  state: MicroState, x: number, y: number,
  radius: number, strength: number, phase: 0 | 1
): void => {
  const dir = phase === 0 ? -1 : 1;
  const sharpness = phase === 1 ? 2.5 : 1.5;
  for (let i = 0; i < state.count; i++) {
    const dx = state.x[i] - x;
    const dy = state.y[i] - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const falloff = Math.pow(1.0 - dist / radius, sharpness);
      state.vx[i] += dir * (dx / dist) * strength * falloff;
      state.vy[i] += dir * (dy / dist) * strength * falloff;
    }
  }
};

// Magnetize – probabilistically converts nearby particles to targetType
export const applyMagnetize = (
  state: MicroState, x: number, y: number,
  radius: number, strength: number, targetType: number
): void => {
  for (let i = 0; i < state.count; i++) {
    if (state.type[i] === 255) continue; // skip food
    const dx = state.x[i] - x;
    const dy = state.y[i] - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      const prob = strength * (1.0 - dist / radius);
      if (Math.random() < prob) state.type[i] = targetType;
    }
  }
};