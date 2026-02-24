// Observables - Métricas mínimas para emergência
// Amostragem de 20% para performance

import type { MicroState } from '../micro/microState';

export interface Observables {
  cohesion: number;        // 0-1: densidade local
  segregation: number;     // 0-1: separação por tipo
  borderStrength: number;  // 0-1: força das fronteiras
  volatility: number;      // 0-1: agitação/velocidade
  ritualSync: number;      // 0-1: sincronização ritual
  phase: PhaseLabel;
}

export type PhaseLabel = 'SWARM' | 'CLUSTER' | 'SEGREGATED' | 'RITUALIZED' | 'COLLAPSE' | 'DISPERSED';

const SAMPLE_RATE = 0.2; // amostrar 20% para performance
const NEIGHBOR_RADIUS = 0.15;
const GRID_SIZE = 12;

export function computeObservables(
  micro: MicroState,
  typesCount: number,
  ritualActive: boolean = false,
  ritualCenter?: { x: number; y: number },
): Observables {
  const count = micro.count;
  if (count === 0) {
    return { cohesion: 0, segregation: 0, borderStrength: 0, volatility: 0, ritualSync: 0, phase: 'DISPERSED' };
  }

  const sampleSize = Math.max(10, Math.floor(count * SAMPLE_RATE));
  const step = Math.floor(count / sampleSize);

  // 1. Cohesion: densidade local (amostragem)
  let totalNeighbors = 0;
  for (let i = 0; i < count; i += step) {
    let neighbors = 0;
    const px = micro.x[i];
    const py = micro.y[i];
    const r2 = NEIGHBOR_RADIUS * NEIGHBOR_RADIUS;
    
    for (let j = 0; j < count; j++) {
      if (i === j) continue;
      const dx = micro.x[j] - px;
      const dy = micro.y[j] - py;
      if (dx * dx + dy * dy < r2) neighbors++;
    }
    totalNeighbors += neighbors;
  }
  const avgNeighbors = totalNeighbors / sampleSize;
  const cohesion = Math.min(1, avgNeighbors / 8);

  // 2. Segregation: fração de vizinhos do mesmo tipo (amostragem)
  let sameTypeCount = 0;
  let totalNearbyCount = 0;
  for (let i = 0; i < count; i += step) {
    const px = micro.x[i];
    const py = micro.y[i];
    const myType = micro.type[i];
    const r2 = NEIGHBOR_RADIUS * NEIGHBOR_RADIUS;
    
    for (let j = 0; j < count; j++) {
      if (i === j) continue;
      const dx = micro.x[j] - px;
      const dy = micro.y[j] - py;
      if (dx * dx + dy * dy < r2) {
        totalNearbyCount++;
        if (micro.type[j] === myType) sameTypeCount++;
      }
    }
  }
  const segregation = totalNearbyCount > 0 ? sameTypeCount / totalNearbyCount : 0;

  // 3. Border Strength: usar grid simplificado
  const grid = new Map<string, { count: number; types: Map<number, number> }>();
  for (let i = 0; i < count; i++) {
    const gx = Math.floor((micro.x[i] + 1) * GRID_SIZE / 2);
    const gy = Math.floor((micro.y[i] + 1) * GRID_SIZE / 2);
    const key = `${gx},${gy}`;
    
    if (!grid.has(key)) {
      grid.set(key, { count: 0, types: new Map() });
    }
    
    const cell = grid.get(key)!;
    cell.count++;
    const t = micro.type[i];
    cell.types.set(t, (cell.types.get(t) || 0) + 1);
  }

  let borderSum = 0;
  let cellCount = 0;
  for (const [key, cell] of grid.entries()) {
    const [gxStr, gyStr] = key.split(',');
    const gx = parseInt(gxStr);
    const gy = parseInt(gyStr);
    
    // Check neighbors
    let gradient = 0;
    for (const [dx, dy] of [[-1,0], [1,0], [0,-1], [0,1]]) {
      const nkey = `${gx+dx},${gy+dy}`;
      const ncell = grid.get(nkey);
      if (ncell) {
        // Type diversity difference
        const myDiversity = cell.types.size;
        const nDiversity = ncell.types.size;
        gradient += Math.abs(myDiversity - nDiversity);
      }
    }
    borderSum += gradient;
    cellCount++;
  }
  const borderStrength = cellCount > 0 ? Math.min(1, borderSum / (cellCount * 4)) : 0;

  // 4. Volatility: velocidade média
  let totalSpeed = 0;
  for (let i = 0; i < count; i++) {
    const speed = Math.sqrt(micro.vx[i] * micro.vx[i] + micro.vy[i] * micro.vy[i]);
    totalSpeed += speed;
  }
  const avgSpeed = totalSpeed / count;
  const volatility = Math.min(1, avgSpeed * 20); // scale

  // 5. Ritual Sync: apenas se ritual ativo
  let ritualSync = 0;
  if (ritualActive && ritualCenter) {
    let tangentSum = 0;
    let ritualCount = 0;
    const ritualR2 = 0.25 * 0.25; // raio do ritual
    
    for (let i = 0; i < count; i++) {
      const dx = micro.x[i] - ritualCenter.x;
      const dy = micro.y[i] - ritualCenter.y;
      const d2 = dx * dx + dy * dy;
      
      if (d2 < ritualR2 && d2 > 0.001) {
        const d = Math.sqrt(d2);
        // Tangent direction
        const tx = -dy / d;
        const ty = dx / d;
        
        // Dot with velocity
        const dot = micro.vx[i] * tx + micro.vy[i] * ty;
        tangentSum += Math.abs(dot);
        ritualCount++;
      }
    }
    
    if (ritualCount > 0) {
      ritualSync = Math.min(1, tangentSum / ritualCount * 15);
    }
  }

  // Phase label
  const phase = determinePhase(cohesion, segregation, borderStrength, volatility, ritualSync);

  return { cohesion, segregation, borderStrength, volatility, ritualSync, phase };
}

function determinePhase(
  cohesion: number,
  segregation: number,
  border: number,
  volatility: number,
  ritual: number,
): PhaseLabel {
  // Priority order (most specific first)
  if (ritual > 0.6) return 'RITUALIZED';
  if (volatility > 0.7 && cohesion < 0.3) return 'COLLAPSE';
  if (segregation > 0.7 && border > 0.5) return 'SEGREGATED';
  if (cohesion > 0.6 && segregation < 0.5) return 'CLUSTER';
  if (volatility > 0.5 && cohesion > 0.4) return 'SWARM';
  return 'DISPERSED';
}
