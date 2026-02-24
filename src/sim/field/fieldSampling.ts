// Deposit metrics from micro to field
import { MicroState } from '../micro/microState';
import { FieldState, depositField, getFieldIndex } from './fieldState';

export const depositMicroMetrics = (
  micro: MicroState,
  field: FieldState,
  depositStrength: number
): void => {
  const gridSize = field.width * field.height;
  const densityMap = new Float32Array(gridSize);
  const typeCountMap = new Map<number, Uint32Array>();
  const velocityVariance = new Float32Array(gridSize);

  // Initialize type count maps - skip invalid types
  for (let i = 0; i < micro.count; i++) {
    const t = micro.type[i];
    // Only track valid types (including FOOD_TYPE = 255)
    if (t === 255 || (t >= 0 && t < 16)) { // Max 16 types
      if (!typeCountMap.has(t)) {
        typeCountMap.set(t, new Uint32Array(gridSize));
      }
    }
  }

  // Accumulate density and type counts
  for (let i = 0; i < micro.count; i++) {
    const t = micro.type[i];
    
    // Skip invalid types
    if (t !== 255 && (t < 0 || t >= 16)) continue;
    
    const idx = getFieldIndex(micro.x[i], micro.y[i], field.width, field.height);
    densityMap[idx] += 1;
    
    const typeMap = typeCountMap.get(t);
    if (typeMap) {
      typeMap[idx] += 1;
    }

    // Velocity variance (novelty proxy)
    const speed = Math.sqrt(micro.vx[i] * micro.vx[i] + micro.vy[i] * micro.vy[i]);
    velocityVariance[idx] += speed;
  }

  // Compute deposits
  const avgDensity = micro.count / gridSize;
  
  for (let idx = 0; idx < gridSize; idx++) {
    const density = densityMap[idx];
    
    // Tension: high local density
    if (density > avgDensity * 2) {
      const x = (idx % field.width) / field.width * 2 - 1;
      const y = Math.floor(idx / field.width) / field.height * 2 - 1;
      depositField(field, x, y, 'tension', 0.05 * depositStrength);
    }

    // Cohesion: consistent type clustering
    let maxTypeCount = 0;
    typeCountMap.forEach((typeMap) => {
      maxTypeCount = Math.max(maxTypeCount, typeMap[idx]);
    });
    if (maxTypeCount > density * 0.7 && density > 5) {
      const x = (idx % field.width) / field.width * 2 - 1;
      const y = Math.floor(idx / field.width) / field.height * 2 - 1;
      depositField(field, x, y, 'cohesion', 0.04 * depositStrength);
    }

    // Scarcity: low density areas
    if (density < avgDensity * 0.3) {
      const x = (idx % field.width) / field.width * 2 - 1;
      const y = Math.floor(idx / field.width) / field.height * 2 - 1;
      depositField(field, x, y, 'scarcity', 0.03 * depositStrength);
    }

    // Novelty: high velocity variance
    if (velocityVariance[idx] > 0.1 && density > 3) {
      const x = (idx % field.width) / field.width * 2 - 1;
      const y = Math.floor(idx / field.width) / field.height * 2 - 1;
      depositField(field, x, y, 'novelty', 0.06 * depositStrength);
    }
  }
};
