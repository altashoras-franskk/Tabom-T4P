// Micro-level particle state (typed arrays for performance)
export interface MicroState {
  count: number;
  maxCount: number;
  capacity: number; // alias for maxCount
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  type: Uint8Array;
  energy: Float32Array;
  // Trail history (for rendering trails)
  historyX: Float32Array[]; // Array of history buffers
  historyY: Float32Array[];
  historyLength: number; // How many frames to keep
  historyIndex: number; // Current write position
  // Metamorphosis extended state
  age: Uint32Array; // Particle age in ticks
  mutationPotential: Float32Array; // Accumulated mutation pressure (0-1)
  size: Float32Array; // Visual size multiplier (0.5-2.0)
  // PATCH 04.3: Genome + Archetypes
  geneA: Float32Array; // Gene A (0..1)
  geneB: Float32Array; // Gene B (0..1)
  geneC: Float32Array; // Gene C (0..1)
  geneD: Float32Array; // Gene D (0..1)
  archetypeId: Uint16Array; // Archetype species ID
}

export interface MicroConfig {
  wrap: boolean;
  rmax: number;
  friction: number; // deprecated, use drag instead
  drag: number; // exponential drag coefficient
  useDrag: boolean; // true = exponential drag, false = old friction
  force: number;
  dt: number;
  speedClamp: number;
  entropy: number;
  typesCount: number;
  foodEnabled: boolean;
  foodRatio: number; // 0-1, percentage of particles that are food
  circularDependency: number; // 0-1, strength of circular chase pattern
  beta: number; // core repulsion radius ratio (default 0.3)
  coreRepel: number; // core repulsion intensity (default 1.0)
  kernelMode: 'classic' | 'pow'; // classic = Particle Life triangular, pow = old falloff
  softening: number; // numerical stability (default 1e-4)
  // H) Energy system
  energyEnabled: boolean;
  energyDecay: number;
  energyFeedRate: number;
  energyReproThreshold: number;
  // I) Metamorphosis system
  metamorphosisEnabled: boolean;
  mutationRate: number; // Base mutation probability per frame (0-0.01)
  typeStability: number; // Resistance to mutation (0-1)
}

// Food type is always 255 (reserved)
export const FOOD_TYPE = 255;

const TRAIL_HISTORY_LENGTH = 8; // Keep last 8 positions

export const createMicroState = (maxCount: number): MicroState => {
  // Create history buffers
  const historyX: Float32Array[] = [];
  const historyY: Float32Array[] = [];
  for (let i = 0; i < TRAIL_HISTORY_LENGTH; i++) {
    historyX.push(new Float32Array(maxCount));
    historyY.push(new Float32Array(maxCount));
  }
  
  return {
    count: 0,
    maxCount,
    capacity: maxCount,
    x: new Float32Array(maxCount),
    y: new Float32Array(maxCount),
    vx: new Float32Array(maxCount),
    vy: new Float32Array(maxCount),
    type: new Uint8Array(maxCount),
    energy: new Float32Array(maxCount),
    historyX,
    historyY,
    historyLength: TRAIL_HISTORY_LENGTH,
    historyIndex: 0,
    // Metamorphosis state
    age: new Uint32Array(maxCount),
    mutationPotential: new Float32Array(maxCount),
    size: new Float32Array(maxCount).fill(1.0),
    // PATCH 04.3: Genome + Archetypes
    geneA: new Float32Array(maxCount),
    geneB: new Float32Array(maxCount),
    geneC: new Float32Array(maxCount),
    geneD: new Float32Array(maxCount),
    archetypeId: new Uint16Array(maxCount),
  };
};

export const createMicroConfig = (): MicroConfig => ({
  wrap: true,
  rmax: 0.24, // increased for more patterns
  friction: 0.9, // deprecated
  drag: 1.0, // exponential drag (REDUCED for more movement)
  useDrag: true, // use new drag by default
  force: 1.8, // INCREASED for alien life
  dt: 1 / 60,
  speedClamp: 0.15, // increased for more dynamic movement
  entropy: 0.0, // zero by default, user controlled
  typesCount: 4,
  foodEnabled: false,
  foodRatio: 0.15,
  circularDependency: 0.0,
  beta: 0.3, // core repulsion radius
  coreRepel: 1.0, // core intensity
  kernelMode: 'classic', // Particle Life kernel
  softening: 1e-4, // numerical stability
  // H) Energy system
  energyEnabled: false,
  energyDecay: 0.002,
  energyFeedRate: 0.04,
  energyReproThreshold: 2.0,
  // I) Metamorphosis system
  metamorphosisEnabled: true, // ENABLED by default for emergent behavior
  mutationRate: 0.0008, // 0.08% per frame = ~5% per second
  typeStability: 0.985, // 98.5% stable
});

export const spawnParticles = (
  state: MicroState,
  count: number,
  rng: { next: () => number; int: (min: number, max: number) => number },
  typesCount: number,
  foodEnabled: boolean = false,
  foodRatio: number = 0.15
): void => {
  state.count = Math.min(count, state.maxCount);
  const foodCount = foodEnabled ? Math.floor(state.count * foodRatio) : 0;
  
  for (let i = 0; i < state.count; i++) {
    state.x[i] = rng.next() * 2 - 1;
    state.y[i] = rng.next() * 2 - 1;
    state.vx[i] = 0;
    state.vy[i] = 0;
    
    // First foodCount particles are food, rest are normal agents
    if (i < foodCount) {
      state.type[i] = FOOD_TYPE;
    } else {
      state.type[i] = rng.int(0, typesCount - 1);
    }
    
    state.energy[i] = 1.0;
    
    // Initialize metamorphosis state
    state.age[i] = 0;
    state.mutationPotential[i] = 0;
    state.size[i] = 1.0;
    
    // PATCH 04.3: Initialize genes randomly but seeded
    state.geneA[i] = rng.next();
    state.geneB[i] = rng.next();
    state.geneC[i] = rng.next();
    state.geneD[i] = rng.next();
    state.archetypeId[i] = state.type[i]; // start aligned with type
  }
};

export const addParticle = (
  state: MicroState,
  x: number,
  y: number,
  type: number
): boolean => {
  if (state.count >= state.maxCount) return false;
  const i = state.count++;
  state.x[i] = x;
  state.y[i] = y;
  state.vx[i] = 0;
  state.vy[i] = 0;
  state.type[i] = type;
  state.energy[i] = 1.0;
  // Initialize metamorphosis state
  state.age[i] = 0;
  state.mutationPotential[i] = 0;
  state.size[i] = 1.0;
  // PATCH 04.3: Initialize genes
  state.geneA[i] = Math.random();
  state.geneB[i] = Math.random();
  state.geneC[i] = Math.random();
  state.geneD[i] = Math.random();
  state.archetypeId[i] = type;
  return true;
};

export const removeParticlesInRadius = (
  state: MicroState,
  x: number,
  y: number,
  radius: number,
  probability: number = 1.0,
  rng: { next: () => number } = { next: () => Math.random() } // C) RNG seedado
): number => {
  let removed = 0;
  for (let i = state.count - 1; i >= 0; i--) {
    const dx = state.x[i] - x;
    const dy = state.y[i] - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius && rng.next() < probability) {
      // Swap with last and decrement count
      const last = state.count - 1;
      if (i !== last) {
        state.x[i] = state.x[last];
        state.y[i] = state.y[last];
        state.vx[i] = state.vx[last];
        state.vy[i] = state.vy[last];
        state.type[i] = state.type[last];
        state.energy[i] = state.energy[last];
        // Swap metamorphosis state
        state.age[i] = state.age[last];
        state.mutationPotential[i] = state.mutationPotential[last];
        state.size[i] = state.size[last];
        // PATCH 04.3: Swap genes
        state.geneA[i] = state.geneA[last];
        state.geneB[i] = state.geneB[last];
        state.geneC[i] = state.geneC[last];
        state.geneD[i] = state.geneD[last];
        state.archetypeId[i] = state.archetypeId[last];
      }
      state.count--;
      removed++;
    }
  }
  return removed;
};

// Spawn particles with spatial patterns (Jeffrey Ventrella Clusters style)
// 
// Pattern Gallery:
// - random: ····  ····  ···· (uniform distribution, classic)
// - circle: ····⭕···· (single ring)
// - rings: ⭕⭕⭕ (concentric circles by species)
// - clusters: 🔴  🔵  🟢 (species separated in space)
// - grid: ▦▦▦▦ (uniform lattice)
// - center: ●···· (dense core → sparse edge)
// - spray: ↓↓↓ (falling particles, Pollock drip)
// - islands: 🏝️ 🏝️ 🏝️ (scattered groups)
// - columns: |||||| (vertical stripes)
// - web: ✱ (radial spokes from center)
// - spiral: 🌀 (galaxy arms)
// - double-ring: ⚛️ (inner+outer counter-rotating)
//
export type SpawnPattern = 
  | 'random'        // Uniform random (classic)
  | 'circle'        // Single circle/ring
  | 'rings'         // Concentric rings
  | 'clusters'      // Species-separated clusters
  | 'grid'          // Uniform grid
  | 'center'        // Dense center burst
  | 'spray'         // Random with velocity
  | 'islands'       // Scattered islands
  | 'columns'       // Vertical stripes
  | 'web'           // Radial spokes
  | 'spiral'        // Spiral galaxy
  | 'double-ring';  // Two counter-rotating rings

export const spawnParticlesWithPattern = (
  state: MicroState,
  count: number,
  pattern: SpawnPattern,
  rng: { next: () => number; int: (min: number, max: number) => number },
  typesCount: number,
  foodEnabled: boolean = false,
  foodRatio: number = 0.15
): void => {
  state.count = Math.min(count, state.maxCount);
  const foodCount = foodEnabled ? Math.floor(state.count * foodRatio) : 0;
  
  for (let i = 0; i < state.count; i++) {
    let x = 0, y = 0;
    let vx = 0, vy = 0;
    
    // Determine type (food vs agent)
    let type: number;
    if (i < foodCount) {
      type = FOOD_TYPE;
    } else {
      type = rng.int(0, typesCount - 1);
    }
    
    switch (pattern) {
      case 'random':
        // Uniform random (classic Clusters default)
        x = rng.next() * 2 - 1;
        y = rng.next() * 2 - 1;
        break;
        
      case 'circle':
        // Single circle (all particles on ring)
        const circleAngle = (i / state.count) * Math.PI * 2;
        const circleRadius = 0.7 + (rng.next() - 0.5) * 0.1;
        x = Math.cos(circleAngle) * circleRadius;
        y = Math.sin(circleAngle) * circleRadius;
        break;
        
      case 'rings':
        // Concentric rings by species
        const ringCount = Math.min(5, Math.max(2, typesCount));
        const ring = type % ringCount;
        const ringRadius = (ring + 1) / ringCount * 0.85;
        const ringAngle = (i / (state.count / ringCount)) * Math.PI * 2 + rng.next() * 0.5;
        x = Math.cos(ringAngle) * ringRadius;
        y = Math.sin(ringAngle) * ringRadius;
        break;
        
      case 'clusters':
        // Species-separated clusters (Clusters-style)
        const clusterAngle = (type / typesCount) * Math.PI * 2;
        const clusterDist = 0.4 + rng.next() * 0.2;
        const clusterScatter = (rng.next() - 0.5) * 0.25;
        const clusterScatterAngle = rng.next() * Math.PI * 2;
        x = Math.cos(clusterAngle) * clusterDist + Math.cos(clusterScatterAngle) * clusterScatter;
        y = Math.sin(clusterAngle) * clusterDist + Math.sin(clusterScatterAngle) * clusterScatter;
        break;
        
      case 'grid':
        // Uniform grid
        const gridSize = Math.ceil(Math.sqrt(state.count));
        const gx = (i % gridSize) / gridSize;
        const gy = Math.floor(i / gridSize) / gridSize;
        x = gx * 1.8 - 0.9 + (rng.next() - 0.5) * 0.1;
        y = gy * 1.8 - 0.9 + (rng.next() - 0.5) * 0.1;
        break;
        
      case 'center':
        // Dense center (Big Bang style)
        const centerR = rng.next() * rng.next() * 0.3; // Bias towards center
        const centerA = rng.next() * Math.PI * 2;
        x = Math.cos(centerA) * centerR;
        y = Math.sin(centerA) * centerR;
        // Add explosion velocity
        vx = Math.cos(centerA) * 0.02;
        vy = Math.sin(centerA) * 0.02;
        break;
        
      case 'spray':
        // Random with initial downward velocity (Pollock drip)
        x = (rng.next() - 0.5) * 1.5;
        y = -0.9 + rng.next() * 0.3;
        vx = (rng.next() - 0.5) * 0.01;
        vy = 0.01 + rng.next() * 0.02;
        break;
        
      case 'islands':
        // Scattered islands
        const islandCount = Math.min(8, Math.max(3, typesCount * 2));
        const island = i % islandCount;
        const islandAngle = (island / islandCount) * Math.PI * 2;
        const islandDist = 0.5 + rng.next() * 0.3;
        const scatter = rng.next() * 0.15;
        const scatterAngle = rng.next() * Math.PI * 2;
        x = Math.cos(islandAngle) * islandDist + Math.cos(scatterAngle) * scatter;
        y = Math.sin(islandAngle) * islandDist + Math.sin(scatterAngle) * scatter;
        break;
        
      case 'columns':
        // Vertical stripes by species
        const col = (type / typesCount);
        x = col * 2 - 1 + (rng.next() - 0.5) * 0.25;
        y = rng.next() * 2 - 1;
        break;
        
      case 'web':
        // Radial spokes
        const spokeCount = Math.max(4, typesCount);
        const spokeId = type % spokeCount;
        const spokeAngle = (spokeId / spokeCount) * Math.PI * 2;
        const spokeDist = rng.next() * 0.85;
        const spokeWidth = 0.04 + rng.next() * 0.04;
        x = Math.cos(spokeAngle) * spokeDist + (rng.next() - 0.5) * spokeWidth;
        y = Math.sin(spokeAngle) * spokeDist + (rng.next() - 0.5) * spokeWidth;
        break;
        
      case 'spiral':
        // Spiral galaxy
        const spiralTurns = 3;
        const spiralT = i / state.count;
        const spiralAngle = spiralT * Math.PI * 2 * spiralTurns;
        const spiralR = spiralT * 0.85;
        x = Math.cos(spiralAngle) * spiralR + (rng.next() - 0.5) * 0.1;
        y = Math.sin(spiralAngle) * spiralR + (rng.next() - 0.5) * 0.1;
        break;
        
      case 'double-ring':
        // Two counter-rotating rings
        const innerRing = i < state.count / 2;
        const ringIdx = innerRing ? i : i - Math.floor(state.count / 2);
        const ringTotal = innerRing ? Math.floor(state.count / 2) : state.count - Math.floor(state.count / 2);
        const drAngle = (ringIdx / ringTotal) * Math.PI * 2;
        const drRadius = innerRing ? 0.45 : 0.75;
        x = Math.cos(drAngle) * drRadius;
        y = Math.sin(drAngle) * drRadius;
        // Counter-rotating velocities
        const tangentSpeed = 0.015;
        vx = -Math.sin(drAngle) * tangentSpeed * (innerRing ? 1 : -1);
        vy = Math.cos(drAngle) * tangentSpeed * (innerRing ? 1 : -1);
        break;
    }
    
    state.x[i] = x;
    state.y[i] = y;
    state.vx[i] = vx;
    state.vy[i] = vy;
    state.type[i] = type;
    state.energy[i] = 1.0;
    // Initialize metamorphosis state
    state.age[i] = 0;
    state.mutationPotential[i] = 0;
    state.size[i] = 1.0;
    // PATCH 04.3: Initialize genes randomly but seeded
    state.geneA[i] = rng.next();
    state.geneB[i] = rng.next();
    state.geneC[i] = rng.next();
    state.geneD[i] = rng.next();
    state.archetypeId[i] = type; // start aligned with type
  }
};

