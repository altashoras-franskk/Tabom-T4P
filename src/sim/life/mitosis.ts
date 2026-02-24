// Mitosis operator: cluster division and species evolution
import { MicroState } from '../micro/microState';
import { InteractionMatrix } from '../micro/matrix';
import { SeededRNG } from '../../engine/rng';

export interface MitosisConfig {
  enabled: boolean;
  rate: number;          // Probability per check (0.03..0.12)
  impulse: number;       // Push strength (0.6..2.0)
  splitFraction: number; // Fraction of particles to duplicate (0.1..0.3)
  mutationSize: number;  // How much to mutate species (0.05..0.15)
}

export const createMitosisConfig = (rate: number = 0.06): MitosisConfig => ({
  enabled: rate > 0.01,
  rate,
  impulse: 1.2,
  splitFraction: 0.2,
  mutationSize: 0.08,
});

// Detect dense clusters
interface Cluster {
  typeId: number;
  indices: number[];
  centerX: number;
  centerY: number;
  radius: number;
}

const detectClusters = (
  state: MicroState,
  typesCount: number,
  minSize: number = 50
): Cluster[] => {
  const clusters: Cluster[] = [];
  
  // Simple clustering by type and spatial proximity
  for (let t = 0; t < typesCount; t++) {
    const particles = [];
    
    for (let i = 0; i < state.count; i++) {
      if (state.type[i] === t) {
        particles.push(i);
      }
    }
    
    if (particles.length < minSize) continue;
    
    // Calculate center
    let sumX = 0, sumY = 0;
    for (const idx of particles) {
      sumX += state.x[idx];
      sumY += state.y[idx];
    }
    
    const centerX = sumX / particles.length;
    const centerY = sumY / particles.length;
    
    // Calculate radius (average distance to center)
    let sumDist = 0;
    for (const idx of particles) {
      let dx = state.x[idx] - centerX;
      let dy = state.y[idx] - centerY;
      
      // Wrap distance
      if (dx > 1) dx -= 2;
      if (dx < -1) dx += 2;
      if (dy > 1) dy -= 2;
      if (dy < -1) dy += 2;
      
      sumDist += Math.sqrt(dx * dx + dy * dy);
    }
    
    const radius = sumDist / particles.length;
    
    // Only consider tight clusters
    if (radius < 0.15) {
      clusters.push({
        typeId: t,
        indices: particles,
        centerX,
        centerY,
        radius,
      });
    }
  }
  
  // Sort by size (largest first)
  clusters.sort((a, b) => b.indices.length - a.indices.length);
  
  return clusters;
};

// Perform mitosis on a cluster
export const performMitosis = (
  state: MicroState,
  matrix: InteractionMatrix,
  config: MitosisConfig,
  rng: SeededRNG
): { success: boolean; message?: string } => {
  if (!config.enabled) return { success: false };
  
  // Check rate
  if (rng.next() > config.rate) return { success: false };
  
  // Detect clusters
  const clusters = detectClusters(state, matrix.attract.length, 50);
  
  if (clusters.length === 0) {
    return { success: false };
  }
  
  // Pick largest cluster
  const cluster = clusters[0];
  
  // Calculate how many particles to duplicate
  const splitCount = Math.floor(cluster.indices.length * config.splitFraction);
  
  if (splitCount < 10) return { success: false };
  
  // Check if we have space
  if (state.count + splitCount > state.maxCount) {
    return { success: false };
  }
  
  // Pick random particles from cluster to duplicate
  const toDuplicate: number[] = [];
  const shuffled = [...cluster.indices].sort(() => rng.next() - 0.5);
  
  for (let i = 0; i < splitCount && i < shuffled.length; i++) {
    toDuplicate.push(shuffled[i]);
  }
  
  // Duplicate particles with radial push
  const angle = rng.next() * Math.PI * 2;
  const pushX = Math.cos(angle) * config.impulse * 0.01;
  const pushY = Math.sin(angle) * config.impulse * 0.01;
  
  for (const srcIdx of toDuplicate) {
    const newIdx = state.count;
    
    // Copy position with small offset
    state.x[newIdx] = state.x[srcIdx] + pushX * 0.5;
    state.y[newIdx] = state.y[srcIdx] + pushY * 0.5;
    
    // Copy type
    state.type[newIdx] = state.type[srcIdx];
    
    // Give impulse (daughter cells pushed apart)
    state.vx[newIdx] = pushX;
    state.vy[newIdx] = pushY;
    
    // Push original particle in opposite direction (conservation)
    state.vx[srcIdx] -= pushX * 0.3;
    state.vy[srcIdx] -= pushY * 0.3;
    
    // Copy energy if exists
    if (state.energy) {
      state.energy[newIdx] = state.energy[srcIdx] * 0.5;
      state.energy[srcIdx] *= 0.5;
    }
    
    state.count++;
  }
  
  // Mutate the species slightly (evolve after division)
  mutateSpecies(matrix, cluster.typeId, config.mutationSize, rng);
  
  return {
    success: true,
    message: `Cluster #${cluster.typeId} divided (${splitCount} new particles)`,
  };
};

// Mutate a species' interactions
const mutateSpecies = (
  matrix: InteractionMatrix,
  typeId: number,
  mutationSize: number,
  rng: SeededRNG
): void => {
  const typesCount = matrix.attract.length;
  
  if (typeId < 0 || typeId >= typesCount) return;
  
  // Mutate attractions
  for (let j = 0; j < typesCount; j++) {
    const delta = rng.range(-mutationSize, mutationSize);
    matrix.attract[typeId][j] += delta;
    
    // Clamp
    matrix.attract[typeId][j] = Math.max(-0.9, Math.min(0.9, matrix.attract[typeId][j]));
  }
  
  // Mutate radii
  for (let j = 0; j < typesCount; j++) {
    const delta = rng.range(-mutationSize * 0.5, mutationSize * 0.5);
    matrix.radius[typeId][j] *= (1 + delta);
    
    // Clamp
    matrix.radius[typeId][j] = Math.max(0.08, Math.min(0.42, matrix.radius[typeId][j]));
  }
};
