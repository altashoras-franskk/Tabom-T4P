// Codex: Capture and catalog emergent organisms

export interface CapturedParticle {
  type: number;
  x: number; // Relative to organism center
  y: number;
  vx: number;
  vy: number;
  energy: number;
}

export interface Organism {
  id: string;
  name: string;
  timestamp: number;
  particles: CapturedParticle[];
  // Bounding box (for rendering)
  width: number;
  height: number;
  // Context at capture time
  captureContext: {
    typesCount: number;
    paletteIndex: number;
    seed: number;
  };
  // Thumbnail data (base64 png)
  thumbnail?: string;
}

export interface CodexState {
  organisms: Organism[];
  nextId: number;
}

export const createCodexState = (): CodexState => ({
  organisms: [],
  nextId: 1,
});

/**
 * Capture particles within a circular region and create an organism
 */
export const captureOrganism = (
  codexState: CodexState,
  particles: {
    x: Float32Array;
    y: Float32Array;
    vx: Float32Array;
    vy: Float32Array;
    type: Uint8Array;
    energy: Float32Array;
    count: number;
  },
  centerX: number,
  centerY: number,
  radius: number,
  typesCount: number,
  paletteIndex: number,
  seed: number,
  thumbnail?: string
): Organism | null => {
  const capturedParticles: CapturedParticle[] = [];
  
  // Find particles within radius
  for (let i = 0; i < particles.count; i++) {
    const dx = particles.x[i] - centerX;
    const dy = particles.y[i] - centerY;
    const distSq = dx * dx + dy * dy;
    
    if (distSq <= radius * radius) {
      capturedParticles.push({
        type: particles.type[i],
        x: dx, // Store relative position
        y: dy,
        vx: particles.vx[i],
        vy: particles.vy[i],
        energy: particles.energy[i],
      });
    }
  }
  
  if (capturedParticles.length === 0) {
    return null; // Nothing captured
  }
  
  // Calculate bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const p of capturedParticles) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Center particles around (0, 0)
  const centerOffsetX = (minX + maxX) / 2;
  const centerOffsetY = (minY + maxY) / 2;
  
  for (const p of capturedParticles) {
    p.x -= centerOffsetX;
    p.y -= centerOffsetY;
  }
  
  const organism: Organism = {
    id: `org_${codexState.nextId}`,
    name: `Organism ${codexState.nextId}`,
    timestamp: Date.now(),
    particles: capturedParticles,
    width,
    height,
    captureContext: {
      typesCount,
      paletteIndex,
      seed,
    },
    thumbnail,
  };
  
  codexState.organisms.push(organism);
  codexState.nextId++;
  
  return organism;
};

/**
 * Spawn an organism at a given position
 */
export const spawnOrganism = (
  organism: Organism,
  microState: {
    x: Float32Array;
    y: Float32Array;
    vx: Float32Array;
    vy: Float32Array;
    type: Uint8Array;
    energy: Float32Array;
    count: number;
    maxCount: number;
  },
  spawnX: number,
  spawnY: number,
  scale: number = 1.0
): number => {
  let spawned = 0;
  
  for (const p of organism.particles) {
    if (microState.count >= microState.maxCount) break;
    
    const idx = microState.count;
    microState.x[idx] = spawnX + p.x * scale;
    microState.y[idx] = spawnY + p.y * scale;
    microState.vx[idx] = p.vx;
    microState.vy[idx] = p.vy;
    microState.type[idx] = p.type;
    microState.energy[idx] = p.energy;
    
    microState.count++;
    spawned++;
  }
  
  return spawned;
};

/**
 * Delete an organism from the codex
 */
export const deleteOrganism = (codexState: CodexState, organismId: string): boolean => {
  const index = codexState.organisms.findIndex(o => o.id === organismId);
  if (index === -1) return false;
  
  codexState.organisms.splice(index, 1);
  return true;
};

/**
 * Rename an organism
 */
export const renameOrganism = (codexState: CodexState, organismId: string, newName: string): boolean => {
  const organism = codexState.organisms.find(o => o.id === organismId);
  if (!organism) return false;
  
  organism.name = newName;
  return true;
};
