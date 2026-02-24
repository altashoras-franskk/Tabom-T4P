// Type x Type interaction matrix
export interface InteractionMatrix {
  attract: number[][];
  radius: number[][];
  falloff: number[][];
}

export const createMatrix = (typesCount: number): InteractionMatrix => {
  const attract: number[][] = [];
  const radius: number[][] = [];
  const falloff: number[][] = [];

  for (let i = 0; i < typesCount; i++) {
    attract[i] = new Array(typesCount).fill(0);
    radius[i] = new Array(typesCount).fill(1);
    falloff[i] = new Array(typesCount).fill(1);
  }

  return { attract, radius, falloff };
};

export const randomizeMatrix = (
  matrix: InteractionMatrix,
  rng: { next: () => number; range: (min: number, max: number) => number },
  rmax: number
): void => {
  const S = matrix.attract.length;
  for (let i = 0; i < S; i++) {
    for (let j = 0; j < S; j++) {
      matrix.attract[i][j] = rng.range(-1, 1);
      matrix.radius[i][j] = rng.range(0.3, 1) * rmax;
      matrix.falloff[i][j] = rng.range(0.8, 2.0);
    }
  }
};

export const softenMatrix = (matrix: InteractionMatrix): void => {
  const S = matrix.attract.length;
  for (let i = 0; i < S; i++) {
    for (let j = 0; j < S; j++) {
      matrix.attract[i][j] *= 0.7;
    }
  }
};

export const symmetrizeMatrix = (matrix: InteractionMatrix): void => {
  const S = matrix.attract.length;
  for (let i = 0; i < S; i++) {
    for (let j = i + 1; j < S; j++) {
      const avg = (matrix.attract[i][j] + matrix.attract[j][i]) / 2;
      matrix.attract[i][j] = avg;
      matrix.attract[j][i] = avg;

      const avgR = (matrix.radius[i][j] + matrix.radius[j][i]) / 2;
      matrix.radius[i][j] = avgR;
      matrix.radius[j][i] = avgR;
    }
  }
};

export const invertMatrix = (matrix: InteractionMatrix): void => {
  const S = matrix.attract.length;
  for (let i = 0; i < S; i++) {
    for (let j = 0; j < S; j++) {
      matrix.attract[i][j] *= -1;
    }
  }
};

export const normalizeMatrix = (matrix: InteractionMatrix): void => {
  const S = matrix.attract.length;
  let maxAbs = 0;
  for (let i = 0; i < S; i++) {
    for (let j = 0; j < S; j++) {
      maxAbs = Math.max(maxAbs, Math.abs(matrix.attract[i][j]));
    }
  }
  if (maxAbs > 0) {
    for (let i = 0; i < S; i++) {
      for (let j = 0; j < S; j++) {
        matrix.attract[i][j] /= maxAbs;
      }
    }
  }
};

export const copyMatrix = (source: InteractionMatrix, dest: InteractionMatrix): void => {
  const S = source.attract.length;
  
  // Ensure dest has the required structure
  if (!dest.attract || dest.attract.length !== S) {
    dest.attract = Array(S).fill(0).map(() => Array(S).fill(0));
  }
  if (!dest.radius || dest.radius.length !== S) {
    dest.radius = Array(S).fill(0).map(() => Array(S).fill(0));
  }
  if (!dest.falloff || dest.falloff.length !== S) {
    dest.falloff = Array(S).fill(0).map(() => Array(S).fill(1.2));
  }
  
  for (let i = 0; i < S; i++) {
    // Ensure rows exist
    if (!dest.attract[i]) dest.attract[i] = Array(S).fill(0);
    if (!dest.radius[i]) dest.radius[i] = Array(S).fill(0);
    if (!dest.falloff[i]) dest.falloff[i] = Array(S).fill(1.2);
    
    // Ensure source rows exist
    if (!source.attract[i]) continue;
    if (!source.radius[i]) continue;
    
    for (let j = 0; j < S; j++) {
      dest.attract[i][j] = source.attract[i][j] ?? 0;
      dest.radius[i][j] = source.radius[i][j] ?? 0;
      dest.falloff[i][j] = source.falloff?.[i]?.[j] ?? 1.2;
    }
  }
};

export const expandMatrix = (matrix: InteractionMatrix, newSize: number, rng: { range: (min: number, max: number) => number }, rmax: number): void => {
  const oldSize = matrix.attract.length;
  if (newSize <= oldSize) return;

  // Expand existing rows first - ensure they exist
  for (let i = 0; i < oldSize; i++) {
    if (!matrix.attract[i]) matrix.attract[i] = [];
    if (!matrix.radius[i]) matrix.radius[i] = [];
    if (!matrix.falloff[i]) matrix.falloff[i] = [];
    
    for (let j = oldSize; j < newSize; j++) {
      matrix.attract[i][j] = rng.range(-0.5, 0.5);
      matrix.radius[i][j] = rng.range(0.3, 1) * rmax;
      matrix.falloff[i][j] = 1.2;
    }
  }

  // Add completely new rows
  for (let i = oldSize; i < newSize; i++) {
    matrix.attract[i] = new Array(newSize);
    matrix.radius[i] = new Array(newSize);
    matrix.falloff[i] = new Array(newSize);
    
    for (let j = 0; j < newSize; j++) {
      matrix.attract[i][j] = rng.range(-0.5, 0.5);
      matrix.radius[i][j] = rng.range(0.3, 1) * rmax;
      matrix.falloff[i][j] = 1.2;
    }
  }
};

/**
 * Applies circular dependency pattern on top of existing matrix
 * Each type attracts the next type in sequence (0→1→2→...→0)
 * Strength controls how much this pattern overlays the base matrix
 */
export const applyCircularDependency = (
  matrix: InteractionMatrix,
  strength: number
): void => {
  const size = matrix.attract.length;
  if (size < 2 || strength <= 0) return;
  
  for (let i = 0; i < size; i++) {
    const next = (i + 1) % size;
    const prev = (i - 1 + size) % size;
    
    // Boost attraction to next type in cycle
    matrix.attract[i][next] = matrix.attract[i][next] * (1 - strength) + (0.7 * strength);
    
    // Add slight repulsion from previous type (creates chase dynamic)
    matrix.attract[i][prev] = matrix.attract[i][prev] * (1 - strength) + (-0.3 * strength);
  }
};
