// Fast spatial hash grid using linked-list (zero allocation per frame)
export interface SpatialHash {
  cellSize: number;
  gridWidth: number;
  gridHeight: number;
  head: Int32Array;      // head[cellIndex] = first particle in cell (-1 if empty)
  next: Int32Array;      // next[particleIndex] = next particle in same cell (-1 if end)
  maxParticles: number;
}

export const createSpatialHash = (cellSize: number, worldSize: number, maxParticles: number): SpatialHash => {
  const gridWidth = Math.ceil(worldSize / cellSize);
  const gridHeight = Math.ceil(worldSize / cellSize);
  const numCells = gridWidth * gridHeight;
  
  return {
    cellSize,
    gridWidth,
    gridHeight,
    head: new Int32Array(numCells).fill(-1),
    next: new Int32Array(maxParticles).fill(-1),
    maxParticles,
  };
};

export const clearHash = (hash: SpatialHash): void => {
  hash.head.fill(-1);
  // No need to clear next - it will be overwritten during insert
};

export const insertParticle = (hash: SpatialHash, idx: number, x: number, y: number): void => {
  const gx = Math.floor((x + 1) / hash.cellSize);
  const gy = Math.floor((y + 1) / hash.cellSize);
  
  if (gx >= 0 && gx < hash.gridWidth && gy >= 0 && gy < hash.gridHeight) {
    const cellIdx = gy * hash.gridWidth + gx;
    hash.next[idx] = hash.head[cellIdx];
    hash.head[cellIdx] = idx;
  }
};

export const queryNeighbors = (
  hash: SpatialHash,
  x: number,
  y: number,
  callback: (idx: number) => void
): void => {
  const gx = Math.floor((x + 1) / hash.cellSize);
  const gy = Math.floor((y + 1) / hash.cellSize);

  // Check 3x3 neighborhood
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = gx + dx;
      const ny = gy + dy;
      
      if (nx >= 0 && nx < hash.gridWidth && ny >= 0 && ny < hash.gridHeight) {
        const cellIdx = ny * hash.gridWidth + nx;
        
        // Walk the linked list for this cell
        let particleIdx = hash.head[cellIdx];
        while (particleIdx !== -1) {
          callback(particleIdx);
          particleIdx = hash.next[particleIdx];
        }
      }
    }
  }
};
