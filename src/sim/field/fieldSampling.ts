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
  const velocitySum = new Float32Array(gridSize);
  const MAX_TYPES = 16;
  const sampleStep = Math.max(1, Math.floor(micro.count / 800)); // keeps this O(800) in practice
  const w = field.width;
  const h = field.height;
  const idxToWorldX = (idx: number) => {
    const gx = idx % w;
    return w <= 1 ? 0 : (gx / (w - 1)) * 2 - 1;
  };
  const idxToWorldY = (idx: number) => {
    const gy = Math.floor(idx / w);
    return h <= 1 ? 0 : (gy / (h - 1)) * 2 - 1;
  };

  // Initialize type count maps - skip invalid types
  for (let i = 0; i < micro.count; i += sampleStep) {
    const t = micro.type[i];
    // Only track valid types (including FOOD_TYPE = 255)
    if (t === 255 || (t >= 0 && t < MAX_TYPES)) {
      if (!typeCountMap.has(t)) {
        typeCountMap.set(t, new Uint32Array(gridSize));
      }
    }
  }

  // Accumulate density and type counts
  const weight = sampleStep;
  for (let i = 0; i < micro.count; i += sampleStep) {
    const t = micro.type[i];
    
    // Skip invalid types
    if (t !== 255 && (t < 0 || t >= MAX_TYPES)) continue;
    
    const idx = getFieldIndex(micro.x[i], micro.y[i], field.width, field.height);
    densityMap[idx] += weight;
    
    const typeMap = typeCountMap.get(t);
    if (typeMap) {
      typeMap[idx] += weight;
    }

    // Velocity variance (novelty proxy)
    const speed = Math.sqrt(micro.vx[i] * micro.vx[i] + micro.vy[i] * micro.vy[i]);
    velocitySum[idx] += speed * weight;
  }

  // Compute deposits
  const avgDensity = micro.count / gridSize;
  const eps = 1e-6;
  
  for (let idx = 0; idx < gridSize; idx++) {
    const density = densityMap[idx];
    const rel = density / (avgDensity + eps);
    
    // Tension: high local density
    if (rel > 1.6) {
      const x = idxToWorldX(idx);
      const y = idxToWorldY(idx);
      const amt = (rel - 1.6) * 0.020 * depositStrength;
      depositField(field, x, y, 'tension', amt);
    }

    // Cohesion: consistent type clustering
    let maxTypeCount = 0;
    typeCountMap.forEach((typeMap) => {
      maxTypeCount = Math.max(maxTypeCount, typeMap[idx]);
    });
    if (density > 0) {
      const dominance = maxTypeCount / (density + eps);
      if (dominance > 0.65 && rel > 1.2) {
        const x = idxToWorldX(idx);
        const y = idxToWorldY(idx);
        const amt = (dominance - 0.65) * (rel - 1.2) * 0.030 * depositStrength;
        depositField(field, x, y, 'cohesion', amt);
      }
    }

    // Scarcity: low density areas
    if (rel < 0.35) {
      const x = idxToWorldX(idx);
      const y = idxToWorldY(idx);
      const amt = (0.35 - rel) * 0.015 * depositStrength;
      depositField(field, x, y, 'scarcity', amt);
    }

    // Novelty: high velocity variance
    if (density > 0) {
      const avgSpeed = velocitySum[idx] / (density + eps);
      if (avgSpeed > 0.07 && rel > 0.9) {
        const x = idxToWorldX(idx);
        const y = idxToWorldY(idx);
        const amt = (avgSpeed - 0.07) * 0.35 * (rel - 0.9) * depositStrength;
        depositField(field, x, y, 'novelty', amt);
      }
    }
  }
};
