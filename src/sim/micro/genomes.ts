// F) PROCEDURAL MATRIX/GENOME GENERATORS
// Advanced matrix generation algorithms for specific pattern types

import { InteractionMatrix, createMatrix } from './matrix';

export type GenomeMode = 
  | 'classicRandom'
  | 'predatorPrey'
  | 'orbitalRings'
  | 'membraneBodies'
  | 'parasitic'
  | 'symbiosis';

/**
 * Generate matrix using classic random approach
 */
export const generateClassicRandom = (
  typesCount: number,
  rng: { next: () => number; int: (min: number, max: number) => number },
  rmax: number
): InteractionMatrix => {
  const matrix = createMatrix(typesCount);
  
  for (let i = 0; i < typesCount; i++) {
    for (let j = 0; j < typesCount; j++) {
      matrix.attract[i][j] = rng.next() * 2 - 1; // -1 to 1
      matrix.radius[i][j] = rmax * (0.5 + rng.next() * 0.5); // 0.5x to 1.0x rmax
      matrix.falloff[i][j] = 0.5 + rng.next() * 1.5; // 0.5 to 2.0
    }
  }
  
  return matrix;
};

/**
 * Generate predator-prey cyclic food chain: A→B→C→...→A
 */
export const generatePredatorPrey = (
  typesCount: number,
  rng: { next: () => number; int: (min: number, max: number) => number },
  rmax: number
): InteractionMatrix => {
  const matrix = createMatrix(typesCount);
  
  for (let i = 0; i < typesCount; i++) {
    for (let j = 0; j < typesCount; j++) {
      const next = (i + 1) % typesCount;
      const prev = (i - 1 + typesCount) % typesCount;
      
      if (j === i) {
        // Self-cohesion
        matrix.attract[i][j] = 0.3 + rng.next() * 0.3;
      } else if (j === next) {
        // Chase prey (next type)
        matrix.attract[i][j] = 0.6 + rng.next() * 0.3;
      } else if (j === prev) {
        // Flee from predator (previous type)
        matrix.attract[i][j] = -0.7 - rng.next() * 0.2;
      } else {
        // Weak interaction with others
        matrix.attract[i][j] = -0.1 + rng.next() * 0.2;
      }
      
      matrix.radius[i][j] = rmax * (0.7 + rng.next() * 0.4);
      matrix.falloff[i][j] = 1.0 + rng.next() * 0.5;
    }
  }
  
  return matrix;
};

/**
 * Generate orbital rings: types form concentric rotating rings
 */
export const generateOrbitalRings = (
  typesCount: number,
  rng: { next: () => number; int: (min: number, max: number) => number },
  rmax: number
): InteractionMatrix => {
  const matrix = createMatrix(typesCount);
  
  for (let i = 0; i < typesCount; i++) {
    for (let j = 0; j < typesCount; j++) {
      const dist = Math.abs(i - j);
      
      if (i === j) {
        // Strong self-attraction
        matrix.attract[i][j] = 0.5 + rng.next() * 0.3;
      } else if (dist === 1 || dist === typesCount - 1) {
        // Adjacent types: orbital attraction
        matrix.attract[i][j] = 0.3 + rng.next() * 0.2;
      } else {
        // Distant types: repulsion
        matrix.attract[i][j] = -0.4 - rng.next() * 0.3;
      }
      
      matrix.radius[i][j] = rmax * (0.6 + rng.next() * 0.5);
      matrix.falloff[i][j] = 0.8 + rng.next() * 0.8;
    }
  }
  
  return matrix;
};

/**
 * Generate membrane-forming bodies: strong intra-type cohesion, inter-type repulsion
 */
export const generateMembraneBodies = (
  typesCount: number,
  rng: { next: () => number; int: (min: number, max: number) => number },
  rmax: number
): InteractionMatrix => {
  const matrix = createMatrix(typesCount);
  
  for (let i = 0; i < typesCount; i++) {
    for (let j = 0; j < typesCount; j++) {
      if (i === j) {
        // Very strong self-attraction (forms membranes)
        matrix.attract[i][j] = 0.7 + rng.next() * 0.2;
        matrix.radius[i][j] = rmax * 0.9;
        matrix.falloff[i][j] = 1.5;
      } else {
        // Strong repulsion between different types
        matrix.attract[i][j] = -0.6 - rng.next() * 0.3;
        matrix.radius[i][j] = rmax * (0.5 + rng.next() * 0.3);
        matrix.falloff[i][j] = 1.0 + rng.next() * 0.5;
      }
    }
  }
  
  return matrix;
};

/**
 * Generate parasitic relationships: asymmetric dependencies
 */
export const generateParasitic = (
  typesCount: number,
  rng: { next: () => number; int: (min: number, max: number) => number },
  rmax: number
): InteractionMatrix => {
  const matrix = createMatrix(typesCount);
  
  // Assign host-parasite pairs
  for (let i = 0; i < typesCount; i++) {
    const host = (i + 1) % typesCount;
    
    for (let j = 0; j < typesCount; j++) {
      if (j === host) {
        // Parasite strongly attracted to host
        matrix.attract[i][j] = 0.7 + rng.next() * 0.2;
      } else if (i === host && j === (host + typesCount - 1) % typesCount) {
        // Host weakly repels parasite
        matrix.attract[i][j] = -0.3 - rng.next() * 0.2;
      } else if (i === j) {
        // Self-cohesion
        matrix.attract[i][j] = 0.2 + rng.next() * 0.3;
      } else {
        // Random weak interactions
        matrix.attract[i][j] = -0.2 + rng.next() * 0.4;
      }
      
      matrix.radius[i][j] = rmax * (0.6 + rng.next() * 0.5);
      matrix.falloff[i][j] = 0.8 + rng.next() * 0.8;
    }
  }
  
  return matrix;
};

/**
 * Generate symbiotic pairs: mutual attraction between paired types
 */
export const generateSymbiosis = (
  typesCount: number,
  rng: { next: () => number; int: (min: number, max: number) => number },
  rmax: number
): InteractionMatrix => {
  const matrix = createMatrix(typesCount);
  
  for (let i = 0; i < typesCount; i++) {
    const partner = (i + 1) % typesCount;
    
    for (let j = 0; j < typesCount; j++) {
      if (i === j) {
        // Moderate self-attraction
        matrix.attract[i][j] = 0.3 + rng.next() * 0.2;
      } else if (j === partner) {
        // Strong mutual attraction to partner
        matrix.attract[i][j] = 0.6 + rng.next() * 0.3;
      } else {
        // Weak repulsion to others
        matrix.attract[i][j] = -0.3 - rng.next() * 0.2;
      }
      
      matrix.radius[i][j] = rmax * (0.7 + rng.next() * 0.4);
      matrix.falloff[i][j] = 1.0 + rng.next() * 0.6;
    }
  }
  
  // Make symbiosis symmetric
  for (let i = 0; i < typesCount; i++) {
    for (let j = i + 1; j < typesCount; j++) {
      const avg = (matrix.attract[i][j] + matrix.attract[j][i]) / 2;
      matrix.attract[i][j] = avg;
      matrix.attract[j][i] = avg;
    }
  }
  
  return matrix;
};

/**
 * Main genome generator function
 */
export const generateGenome = (
  mode: GenomeMode,
  typesCount: number,
  rng: { next: () => number; int: (min: number, max: number) => number },
  rmax: number
): InteractionMatrix => {
  switch (mode) {
    case 'classicRandom':
      return generateClassicRandom(typesCount, rng, rmax);
    case 'predatorPrey':
      return generatePredatorPrey(typesCount, rng, rmax);
    case 'orbitalRings':
      return generateOrbitalRings(typesCount, rng, rmax);
    case 'membraneBodies':
      return generateMembraneBodies(typesCount, rng, rmax);
    case 'parasitic':
      return generateParasitic(typesCount, rng, rmax);
    case 'symbiosis':
      return generateSymbiosis(typesCount, rng, rmax);
    default:
      return generateClassicRandom(typesCount, rng, rmax);
  }
};
