// Observables - Métricas mínimas para detectar fases emergentes
// Determinístico, baseado em grid espacial

import type { MicroState } from '../micro/microState';

export interface Observables {
  cohesion: number;        // 0-1: média de vizinhos próximos por partícula
  segregation: number;     // 0-1: fração de vizinhos do mesmo tipo
  borderStrength: number;  // 0-1: gradiente de tipo/densidade (fronteiras)
  volatility: number;      // 0-1: média de velocidade + variação
  ritualSync: number;      // 0-1: coerência de movimento circular (opcional)
  phase: PhaseLabel;       // label categórico da fase atual
}

export type PhaseLabel = 
  | 'swarm'        // alta cohesion, baixa segregation, movimento fluido
  | 'cluster'      // alta cohesion, baixa border, grupos estáveis
  | 'segregated'   // alta segregation, alta border, tipos separados
  | 'turbulent'    // alta volatility, baixa cohesion, caos
  | 'ritual'       // baixa volatility, alta sync, movimento coordenado
  | 'dispersed';   // baixa cohesion, baixa segregation, espalhado

const GRID_SIZE = 16; // grid espacial para análise (16x16)
const NEIGHBOR_RADIUS = 0.15; // raio para contar vizinhos

/**
 * Compute observables from micro state
 */
export function computeObservables(
  micro: MicroState,
  typesCount: number,
): Observables {
  const count = micro.count;
  if (count === 0) {
    return {
      cohesion: 0,
      segregation: 0,
      borderStrength: 0,
      volatility: 0,
      ritualSync: 0,
      phase: 'dispersed',
    };
  }

  // Build spatial grid for efficient neighbor queries
  const grid = buildGrid(micro, GRID_SIZE);

  // 1. Cohesion: average local density
  let totalNeighbors = 0;
  for (let i = 0; i < count; i++) {
    const neighbors = countNeighbors(micro, grid, i, NEIGHBOR_RADIUS, GRID_SIZE);
    totalNeighbors += neighbors;
  }
  const avgNeighbors = totalNeighbors / count;
  const cohesion = Math.min(1, avgNeighbors / 10); // normalize to 0-1 (10+ neighbors = max)

  // 2. Segregation: fraction of same-type neighbors
  let sameTypeCount = 0;
  let totalNearby = 0;
  for (let i = 0; i < count; i++) {
    const nearby = getNeighborTypes(micro, grid, i, NEIGHBOR_RADIUS, GRID_SIZE);
    const myType = micro.type[i];
    for (const type of nearby) {
      if (type === myType) sameTypeCount++;
      totalNearby++;
    }
  }
  const segregation = totalNearby > 0 ? sameTypeCount / totalNearby : 0;

  // 3. Border Strength: density gradient (proxy for boundaries)
  let borderSum = 0;
  for (const [key, cell] of grid.entries()) {
    if (cell.count < 2) continue;
    const neighbors = getNeighborCells(key, grid, GRID_SIZE);
    let gradient = 0;
    for (const n of neighbors) {
      gradient += Math.abs(cell.count - n.count);
    }
    borderSum += gradient / (neighbors.length || 1);
  }
  const avgBorder = borderSum / (grid.size || 1);
  const borderStrength = Math.min(1, avgBorder / 5); // normalize

  // 4. Volatility: average speed + velocity variance
  let totalSpeed = 0;
  let totalSpeedSq = 0;
  for (let i = 0; i < count; i++) {
    const speed = Math.sqrt(micro.vx[i] ** 2 + micro.vy[i] ** 2);
    totalSpeed += speed;
    totalSpeedSq += speed * speed;
  }
  const avgSpeed = totalSpeed / count;
  const variance = (totalSpeedSq / count) - (avgSpeed * avgSpeed);
  const volatility = Math.min(1, (avgSpeed * 5 + Math.sqrt(variance) * 10)); // scale

  // 5. Ritual Sync: coherence of tangential motion (optional, simplified)
  let tangentialCoherence = 0;
  let tangentialCount = 0;
  for (let i = 0; i < count; i++) {
    const px = micro.x[i];
    const py = micro.y[i];
    const vx = micro.vx[i];
    const vy = micro.vy[i];
    
    // Check if velocity is tangent to radial direction from origin
    const r = Math.sqrt(px * px + py * py);
    if (r < 0.1) continue;
    
    const rx = px / r;
    const ry = py / r;
    const tx = -ry;
    const ty = rx;
    
    // Dot product with tangent
    const tangent = vx * tx + vy * ty;
    if (Math.abs(tangent) > 0.01) {
      tangentialCoherence += Math.abs(tangent);
      tangentialCount++;
    }
  }
  const ritualSync = tangentialCount > 0 
    ? Math.min(1, tangentialCoherence / tangentialCount * 20)
    : 0;

  // Determine phase label
  const phase = phaseLabel({ cohesion, segregation, borderStrength, volatility, ritualSync });

  return {
    cohesion,
    segregation,
    borderStrength,
    volatility,
    ritualSync,
    phase,
  };
}

/**
 * Classify phase based on observables
 */
export function phaseLabel(obs: Omit<Observables, 'phase'>): PhaseLabel {
  const { cohesion, segregation, borderStrength, volatility, ritualSync } = obs;

  // Priority rules (most specific first)
  if (ritualSync > 0.6 && volatility < 0.4) {
    return 'ritual'; // coordinated circular motion
  }
  
  if (volatility > 0.7) {
    return 'turbulent'; // high chaos
  }
  
  if (segregation > 0.7 && borderStrength > 0.5) {
    return 'segregated'; // clear type separation
  }
  
  if (cohesion > 0.6 && borderStrength < 0.3) {
    return 'cluster'; // tight groups, low boundaries
  }
  
  if (cohesion > 0.5 && segregation < 0.5) {
    return 'swarm'; // cohesive but mixed
  }
  
  return 'dispersed'; // default: low structure
}

// ---- Spatial Grid Helpers ----

interface GridCell {
  count: number;
  types: Map<number, number>;
  particles: number[];
}

function buildGrid(micro: MicroState, gridSize: number): Map<string, GridCell> {
  const grid = new Map<string, GridCell>();
  
  for (let i = 0; i < micro.count; i++) {
    const x = micro.x[i];
    const y = micro.y[i];
    const type = micro.type[i];
    
    const gx = Math.floor((x + 1) / 2 * gridSize);
    const gy = Math.floor((y + 1) / 2 * gridSize);
    const key = `${gx},${gy}`;
    
    if (!grid.has(key)) {
      grid.set(key, { count: 0, types: new Map(), particles: [] });
    }
    
    const cell = grid.get(key)!;
    cell.count++;
    cell.types.set(type, (cell.types.get(type) || 0) + 1);
    cell.particles.push(i);
  }
  
  return grid;
}

function countNeighbors(
  micro: MicroState,
  grid: Map<string, GridCell>,
  idx: number,
  radius: number,
  gridSize: number,
): number {
  const px = micro.x[idx];
  const py = micro.y[idx];
  
  let count = 0;
  const r2 = radius * radius;
  
  // Check nearby cells
  const gx = Math.floor((px + 1) / 2 * gridSize);
  const gy = Math.floor((py + 1) / 2 * gridSize);
  
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${gx + dx},${gy + dy}`;
      const cell = grid.get(key);
      if (!cell) continue;
      
      for (const j of cell.particles) {
        if (j === idx) continue;
        const d2 = (micro.x[j] - px) ** 2 + (micro.y[j] - py) ** 2;
        if (d2 < r2) count++;
      }
    }
  }
  
  return count;
}

function getNeighborTypes(
  micro: MicroState,
  grid: Map<string, GridCell>,
  idx: number,
  radius: number,
  gridSize: number,
): number[] {
  const px = micro.x[idx];
  const py = micro.y[idx];
  
  const types: number[] = [];
  const r2 = radius * radius;
  
  const gx = Math.floor((px + 1) / 2 * gridSize);
  const gy = Math.floor((py + 1) / 2 * gridSize);
  
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${gx + dx},${gy + dy}`;
      const cell = grid.get(key);
      if (!cell) continue;
      
      for (const j of cell.particles) {
        if (j === idx) continue;
        const d2 = (micro.x[j] - px) ** 2 + (micro.y[j] - py) ** 2;
        if (d2 < r2) types.push(micro.type[j]);
      }
    }
  }
  
  return types;
}

function getNeighborCells(
  key: string,
  grid: Map<string, GridCell>,
  gridSize: number,
): GridCell[] {
  const [gxStr, gyStr] = key.split(',');
  const gx = parseInt(gxStr);
  const gy = parseInt(gyStr);
  
  const neighbors: GridCell[] = [];
  
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const neighborKey = `${gx + dx},${gy + dy}`;
      const cell = grid.get(neighborKey);
      if (cell) neighbors.push(cell);
    }
  }
  
  return neighbors;
}
