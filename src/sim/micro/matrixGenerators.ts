// Structural matrix generators for Particle Life patterns
import { SeededRNG } from '../../engine/rng';
import { InteractionMatrix } from './matrix';

export type MatrixMode = 'sparse' | 'block' | 'ring' | 'predator-prey' | 'symbiosis' | 'random';

// Generate matrix based on structural mode
export const generateStructuralMatrix = (
  typesCount: number,
  mode: MatrixMode,
  sparsity: number,
  radiusSpread: number,
  rng: SeededRNG
): InteractionMatrix => {
  const matrix: InteractionMatrix = {
    attract: Array(typesCount).fill(0).map(() => Array(typesCount).fill(0)),
    radius: Array(typesCount).fill(0).map(() => Array(typesCount).fill(0)),
    falloff: Array(typesCount).fill(0).map(() => Array(typesCount).fill(1.2)),
  };
  
  const baseRadius = 0.22;
  
  switch (mode) {
    case 'sparse':
      generateSparse(matrix, typesCount, sparsity, radiusSpread, baseRadius, rng);
      break;
    case 'block':
      generateBlock(matrix, typesCount, radiusSpread, baseRadius, rng);
      break;
    case 'ring':
      generateRing(matrix, typesCount, radiusSpread, baseRadius, rng);
      break;
    case 'predator-prey':
      generatePredatorPrey(matrix, typesCount, radiusSpread, baseRadius, rng);
      break;
    case 'symbiosis':
      generateSymbiosis(matrix, typesCount, radiusSpread, baseRadius, rng);
      break;
    case 'random':
    default:
      generateRandom(matrix, typesCount, radiusSpread, baseRadius, rng);
      break;
  }
  
  // Apply global clamps
  clampMatrix(matrix, typesCount);
  
  // Normalize to target energy (INCREASED for more dynamics)
  normalizeMatrixEnergy(matrix, typesCount, 0.65);
  
  return matrix;
};

// SPARSE: Mostly zeros, few strong links
const generateSparse = (
  matrix: InteractionMatrix,
  typesCount: number,
  sparsity: number,
  radiusSpread: number,
  baseRadius: number,
  rng: SeededRNG
): void => {
  for (let i = 0; i < typesCount; i++) {
    for (let j = 0; j < typesCount; j++) {
      if (rng.next() > sparsity) {
        // Strong interaction (INCREASED for dynamics)
        matrix.attract[i][j] = rng.range(-1.0, 1.0);
        matrix.radius[i][j] = baseRadius * rng.range(1.0 - radiusSpread, 1.0 + radiusSpread);
      } else {
        // Weak or zero
        matrix.attract[i][j] = rng.range(-0.15, 0.15);
        matrix.radius[i][j] = baseRadius * rng.range(0.8, 1.2);
      }
    }
  }
};

// BLOCK: Groups with internal attraction and external repulsion
const generateBlock = (
  matrix: InteractionMatrix,
  typesCount: number,
  radiusSpread: number,
  baseRadius: number,
  rng: SeededRNG
): void => {
  const groupCount = Math.max(2, Math.min(4, Math.floor(typesCount / 3)));
  const groups: number[][] = Array(groupCount).fill(0).map(() => []);
  
  // Assign species to groups
  for (let i = 0; i < typesCount; i++) {
    groups[i % groupCount].push(i);
  }
  
  // Generate interactions
  for (let i = 0; i < typesCount; i++) {
    const groupI = groups.findIndex(g => g.includes(i));
    
    for (let j = 0; j < typesCount; j++) {
      const groupJ = groups.findIndex(g => g.includes(j));
      
      if (groupI === groupJ) {
        // Same group: strong attraction (INCREASED)
        matrix.attract[i][j] = rng.range(0.4, 0.9);
        matrix.radius[i][j] = baseRadius * rng.range(1.0, 1.0 + radiusSpread * 0.5);
      } else {
        // Different group: repulsion (INCREASED)
        matrix.attract[i][j] = rng.range(-0.8, -0.3);
        matrix.radius[i][j] = baseRadius * rng.range(0.8, 1.0);
      }
    }
  }
};

// RING: Species i attracts i+1, repels i-1 (cycles)
const generateRing = (
  matrix: InteractionMatrix,
  typesCount: number,
  radiusSpread: number,
  baseRadius: number,
  rng: SeededRNG
): void => {
  for (let i = 0; i < typesCount; i++) {
    for (let j = 0; j < typesCount; j++) {
      const next = (i + 1) % typesCount;
      const prev = (i - 1 + typesCount) % typesCount;
      
      if (j === next) {
        // Attract next (INCREASED)
        matrix.attract[i][j] = rng.range(0.5, 1.0);
        matrix.radius[i][j] = baseRadius * rng.range(1.0, 1.0 + radiusSpread);
      } else if (j === prev) {
        // Repel previous (INCREASED)
        matrix.attract[i][j] = rng.range(-0.9, -0.4);
        matrix.radius[i][j] = baseRadius * rng.range(0.8, 1.0);
      } else {
        // Weak interaction with others
        matrix.attract[i][j] = rng.range(-0.25, 0.25);
        matrix.radius[i][j] = baseRadius * rng.range(0.9, 1.1);
      }
    }
  }
};

// PREDATOR-PREY: Pairs with opposite signs and different radii
const generatePredatorPrey = (
  matrix: InteractionMatrix,
  typesCount: number,
  radiusSpread: number,
  baseRadius: number,
  rng: SeededRNG
): void => {
  const pairCount = Math.floor(typesCount / 2);
  
  for (let i = 0; i < typesCount; i++) {
    const pairIndex = Math.floor(i / 2);
    const isPredator = i % 2 === 0;
    
    for (let j = 0; j < typesCount; j++) {
      const pairJ = Math.floor(j / 2);
      const jIsPredator = j % 2 === 0;
      
      if (pairIndex === pairJ && i !== j) {
        // Predator-prey pair
        if (isPredator) {
          // Predator attracts prey
          matrix.attract[i][j] = rng.range(0.5, 0.8);
          matrix.radius[i][j] = baseRadius * rng.range(1.0, 1.0 + radiusSpread);
        } else {
          // Prey repels predator
          matrix.attract[i][j] = rng.range(-0.6, -0.3);
          matrix.radius[i][j] = baseRadius * rng.range(1.0 + radiusSpread * 0.5, 1.0 + radiusSpread);
        }
      } else if (i === j) {
        // Self-interaction
        matrix.attract[i][j] = rng.range(-0.3, 0.3);
        matrix.radius[i][j] = baseRadius;
      } else {
        // Other interactions
        matrix.attract[i][j] = rng.range(-0.2, 0.2);
        matrix.radius[i][j] = baseRadius * rng.range(0.9, 1.1);
      }
    }
  }
};

// SYMBIOSIS: 2-4 coalitions with mutual benefits
const generateSymbiosis = (
  matrix: InteractionMatrix,
  typesCount: number,
  radiusSpread: number,
  baseRadius: number,
  rng: SeededRNG
): void => {
  const coalitionCount = Math.max(2, Math.min(4, Math.floor(typesCount / 4)));
  const coalitions: number[][] = Array(coalitionCount).fill(0).map(() => []);
  
  // Assign species to coalitions
  for (let i = 0; i < typesCount; i++) {
    coalitions[i % coalitionCount].push(i);
  }
  
  // Pick allied coalitions
  const allies = new Set<string>();
  for (let c = 0; c < coalitionCount; c++) {
    const allyCount = rng.int(1, Math.min(2, coalitionCount - 1));
    for (let a = 0; a < allyCount; a++) {
      const ally = (c + 1 + a) % coalitionCount;
      allies.add(`${c}-${ally}`);
      allies.add(`${ally}-${c}`);
    }
  }
  
  // Generate interactions
  for (let i = 0; i < typesCount; i++) {
    const coalI = coalitions.findIndex(c => c.includes(i));
    
    for (let j = 0; j < typesCount; j++) {
      const coalJ = coalitions.findIndex(c => c.includes(j));
      
      if (coalI === coalJ) {
        // Same coalition: strong attraction
        matrix.attract[i][j] = rng.range(0.4, 0.7);
        matrix.radius[i][j] = baseRadius * rng.range(1.0, 1.0 + radiusSpread * 0.4);
      } else if (allies.has(`${coalI}-${coalJ}`)) {
        // Allied coalitions: mutual benefit
        matrix.attract[i][j] = rng.range(0.2, 0.5);
        matrix.radius[i][j] = baseRadius * rng.range(1.0, 1.0 + radiusSpread * 0.6);
      } else {
        // Neutral or weak repulsion
        matrix.attract[i][j] = rng.range(-0.3, 0.1);
        matrix.radius[i][j] = baseRadius * rng.range(0.9, 1.1);
      }
    }
  }
};

// RANDOM: Fully random with no structure
const generateRandom = (
  matrix: InteractionMatrix,
  typesCount: number,
  radiusSpread: number,
  baseRadius: number,
  rng: SeededRNG
): void => {
  for (let i = 0; i < typesCount; i++) {
    for (let j = 0; j < typesCount; j++) {
      // INCREASED range for more dynamics
      matrix.attract[i][j] = rng.range(-0.9, 0.9);
      matrix.radius[i][j] = baseRadius * rng.range(1.0 - radiusSpread, 1.0 + radiusSpread);
    }
  }
};

// Apply hard clamps to matrix values
const clampMatrix = (matrix: InteractionMatrix, typesCount: number): void => {
  for (let i = 0; i < typesCount; i++) {
    for (let j = 0; j < typesCount; j++) {
      // Clamp attraction
      matrix.attract[i][j] = Math.max(-0.9, Math.min(0.9, matrix.attract[i][j]));
      
      // Clamp radius
      matrix.radius[i][j] = Math.max(0.08, Math.min(0.42, matrix.radius[i][j]));
    }
  }
};

// Normalize matrix to target average energy
const normalizeMatrixEnergy = (
  matrix: InteractionMatrix,
  typesCount: number,
  targetEnergy: number
): void => {
  // Calculate average absolute attraction
  let sumAbs = 0;
  let count = 0;
  
  for (let i = 0; i < typesCount; i++) {
    for (let j = 0; j < typesCount; j++) {
      sumAbs += Math.abs(matrix.attract[i][j]);
      count++;
    }
  }
  
  const avgEnergy = sumAbs / count;
  
  if (avgEnergy > 0.01) {
    const scale = targetEnergy / avgEnergy;
    
    // Scale all attractions
    for (let i = 0; i < typesCount; i++) {
      for (let j = 0; j < typesCount; j++) {
        matrix.attract[i][j] *= scale;
        // Re-clamp after scaling
        matrix.attract[i][j] = Math.max(-0.9, Math.min(0.9, matrix.attract[i][j]));
      }
    }
  }
};
