// 20 Spawn Recipes - Different ways to initialize the particle universe
export interface SpawnRecipe {
  id: string;
  name: string;
  description: string;
  pattern: string; // Pattern identifier for spawn algorithm
  params?: Record<string, number>; // Optional parameters for pattern
}

export const SPAWN_RECIPES: SpawnRecipe[] = [
  {
    id: 'random',
    name: 'Random Chaos',
    description: 'Uniform random distribution, no structure',
    pattern: 'random',
  },
  {
    id: 'center_cluster',
    name: 'Center Cluster',
    description: 'Dense core formation, explosive potential',
    pattern: 'center',
    params: { radius: 0.15, density: 2.0 },
  },
  {
    id: 'ring',
    name: 'Ring',
    description: 'Circular boundary, inward pressure',
    pattern: 'ring',
    params: { radius: 0.4, thickness: 0.1 },
  },
  {
    id: 'spiral',
    name: 'Spiral',
    description: 'Galaxy-like arms, rotational momentum',
    pattern: 'spiral',
    params: { arms: 3, twist: 2.5 },
  },
  {
    id: 'grid',
    name: 'Grid',
    description: 'Orthogonal lattice, crystalline order',
    pattern: 'grid',
    params: { spacing: 0.05 },
  },
  {
    id: 'two_clusters',
    name: 'Two Clusters',
    description: 'Binary collision, merger dynamics',
    pattern: 'two_clusters',
    params: { separation: 0.5, radius: 0.15 },
  },
  {
    id: 'perimeter',
    name: 'Perimeter',
    description: 'Edge boundary, centripetal flow',
    pattern: 'perimeter',
    params: { margin: 0.05 },
  },
  {
    id: 'vertical_bands',
    name: 'Vertical Bands',
    description: 'Striped layers, mixing zones',
    pattern: 'vertical_bands',
    params: { bands: 5, width: 0.15 },
  },
  {
    id: 'horizontal_bands',
    name: 'Horizontal Bands',
    description: 'Horizontal layers, stratification',
    pattern: 'horizontal_bands',
    params: { bands: 5, width: 0.15 },
  },
  {
    id: 'checkerboard',
    name: 'Checkerboard',
    description: 'Alternating cells, territorial conflict',
    pattern: 'checkerboard',
    params: { cells: 6 },
  },
  {
    id: 'triangle',
    name: 'Triangle',
    description: 'Triangular formation, apex dynamics',
    pattern: 'triangle',
    params: { size: 0.6 },
  },
  {
    id: 'corners',
    name: 'Four Corners',
    description: 'Corner clusters, diagonal flows',
    pattern: 'corners',
    params: { radius: 0.12 },
  },
  {
    id: 'cross',
    name: 'Cross',
    description: 'Plus sign, axial symmetry',
    pattern: 'cross',
    params: { width: 0.15, length: 0.7 },
  },
  {
    id: 'double_helix',
    name: 'Double Helix',
    description: 'DNA-like twist, intertwined strands',
    pattern: 'double_helix',
    params: { radius: 0.2, turns: 3 },
  },
  {
    id: 'sunburst',
    name: 'Sunburst',
    description: 'Radial rays, explosive symmetry',
    pattern: 'sunburst',
    params: { rays: 8, length: 0.4 },
  },
  {
    id: 'concentric_rings',
    name: 'Concentric Rings',
    description: 'Nested circles, wave interference',
    pattern: 'concentric_rings',
    params: { rings: 4, spacing: 0.12 },
  },
  {
    id: 'wave',
    name: 'Wave',
    description: 'Sinusoidal distribution, periodic structure',
    pattern: 'wave',
    params: { frequency: 3, amplitude: 0.3 },
  },
  {
    id: 'vortex',
    name: 'Vortex',
    description: 'Logarithmic spiral, rotational seed',
    pattern: 'vortex',
    params: { tightness: 0.15, rotation: 1.5 },
  },
  {
    id: 'fractal_dust',
    name: 'Fractal Dust',
    description: 'Clustered random, self-similar distribution',
    pattern: 'fractal_dust',
    params: { iterations: 3, clusterSize: 0.08 },
  },
  {
    id: 'yin_yang',
    name: 'Yin Yang',
    description: 'Dual swirl, complementary balance',
    pattern: 'yin_yang',
    params: { radius: 0.35 },
  },
];

/** RNG interface for deterministic spawn (same seed = same layout). */
export type SpawnRng = { next: () => number; int: (min: number, max: number) => number };

/**
 * Spawn particles based on recipe pattern.
 * DETERMINISTIC: pass seeded rng so same seed + same params = same layout.
 */
export const spawnFromRecipe = (
  recipe: SpawnRecipe,
  particleCount: number,
  typesCount: number,
  worldWidth: number,
  worldHeight: number,
  rng: SpawnRng
): { positions: Float32Array; types: Uint8Array } => {
  const positions = new Float32Array(particleCount * 2);
  const types = new Uint8Array(particleCount);
  
  const cx = worldWidth / 2;
  const cy = worldHeight / 2;
  const scale = Math.min(worldWidth, worldHeight);
  
  switch (recipe.pattern) {
    case 'random':
      for (let i = 0; i < particleCount; i++) {
        positions[i * 2] = rng.next() * worldWidth;
        positions[i * 2 + 1] = rng.next() * worldHeight;
        types[i] = rng.int(0, typesCount - 1);
      }
      break;
      
    case 'center':
      {
        const radius = (recipe.params?.radius || 0.15) * scale;
        for (let i = 0; i < particleCount; i++) {
          const angle = rng.next() * Math.PI * 2;
          const r = Math.sqrt(rng.next()) * radius;
          positions[i * 2] = cx + Math.cos(angle) * r;
          positions[i * 2 + 1] = cy + Math.sin(angle) * r;
          types[i] = rng.int(0, typesCount - 1);
        }
      }
      break;
      
    case 'ring':
      {
        const radius = (recipe.params?.radius || 0.4) * scale;
        const thickness = (recipe.params?.thickness || 0.1) * scale;
        for (let i = 0; i < particleCount; i++) {
          const angle = rng.next() * Math.PI * 2;
          const r = radius + (rng.next() - 0.5) * thickness;
          positions[i * 2] = cx + Math.cos(angle) * r;
          positions[i * 2 + 1] = cy + Math.sin(angle) * r;
          types[i] = rng.int(0, typesCount - 1);
        }
      }
      break;
      
    case 'spiral':
      {
        const arms = recipe.params?.arms || 3;
        const twist = recipe.params?.twist || 2.5;
        for (let i = 0; i < particleCount; i++) {
          const t = i / particleCount;
          const armIndex = rng.int(0, arms - 1);
          const baseAngle = (armIndex / arms) * Math.PI * 2;
          const spiralAngle = baseAngle + t * Math.PI * twist;
          const r = t * scale * 0.4;
          positions[i * 2] = cx + Math.cos(spiralAngle) * r + (rng.next() - 0.5) * 20;
          positions[i * 2 + 1] = cy + Math.sin(spiralAngle) * r + (rng.next() - 0.5) * 20;
          types[i] = armIndex % typesCount;
        }
      }
      break;
      
    case 'grid':
      {
        const spacing = (recipe.params?.spacing || 0.05) * scale;
        const gridSize = Math.ceil(Math.sqrt(particleCount));
        const totalSize = gridSize * spacing;
        const startX = cx - totalSize / 2;
        const startY = cy - totalSize / 2;
        
        for (let i = 0; i < particleCount; i++) {
          const gx = i % gridSize;
          const gy = Math.floor(i / gridSize);
          positions[i * 2] = startX + gx * spacing + (rng.next() - 0.5) * 5;
          positions[i * 2 + 1] = startY + gy * spacing + (rng.next() - 0.5) * 5;
          types[i] = ((gx + gy) % typesCount);
        }
      }
      break;
      
    case 'two_clusters':
      {
        const separation = (recipe.params?.separation || 0.5) * scale;
        const radius = (recipe.params?.radius || 0.15) * scale;
        const halfCount = Math.floor(particleCount / 2);
        
        for (let i = 0; i < particleCount; i++) {
          const isLeft = i < halfCount;
          const clusterX = cx + (isLeft ? -separation / 2 : separation / 2);
          const angle = rng.next() * Math.PI * 2;
          const r = Math.sqrt(rng.next()) * radius;
          positions[i * 2] = clusterX + Math.cos(angle) * r;
          positions[i * 2 + 1] = cy + Math.sin(angle) * r;
          types[i] = isLeft ? 0 : (typesCount > 1 ? 1 : 0);
        }
      }
      break;
      
    case 'perimeter':
      {
        const margin = (recipe.params?.margin || 0.05) * scale;
        for (let i = 0; i < particleCount; i++) {
          const side = rng.int(0, 3);
          if (side === 0) { // Top
            positions[i * 2] = rng.next() * worldWidth;
            positions[i * 2 + 1] = margin;
          } else if (side === 1) { // Right
            positions[i * 2] = worldWidth - margin;
            positions[i * 2 + 1] = rng.next() * worldHeight;
          } else if (side === 2) { // Bottom
            positions[i * 2] = rng.next() * worldWidth;
            positions[i * 2 + 1] = worldHeight - margin;
          } else { // Left
            positions[i * 2] = margin;
            positions[i * 2 + 1] = rng.next() * worldHeight;
          }
          types[i] = side % typesCount;
        }
      }
      break;
      
    case 'vertical_bands':
      {
        const bands = recipe.params?.bands || 5;
        const bandWidth = worldWidth / bands;
        for (let i = 0; i < particleCount; i++) {
          const band = rng.int(0, bands - 1);
          positions[i * 2] = band * bandWidth + rng.next() * bandWidth;
          positions[i * 2 + 1] = rng.next() * worldHeight;
          types[i] = band % typesCount;
        }
      }
      break;
      
    case 'horizontal_bands':
      {
        const bands = recipe.params?.bands || 5;
        const bandHeight = worldHeight / bands;
        for (let i = 0; i < particleCount; i++) {
          const band = rng.int(0, bands - 1);
          positions[i * 2] = rng.next() * worldWidth;
          positions[i * 2 + 1] = band * bandHeight + rng.next() * bandHeight;
          types[i] = band % typesCount;
        }
      }
      break;
      
    case 'checkerboard':
      {
        const cells = recipe.params?.cells || 6;
        const cellWidth = worldWidth / cells;
        const cellHeight = worldHeight / cells;
        
        for (let i = 0; i < particleCount; i++) {
          const cellX = rng.int(0, cells - 1);
          const cellY = rng.int(0, cells - 1);
          positions[i * 2] = cellX * cellWidth + rng.next() * cellWidth;
          positions[i * 2 + 1] = cellY * cellHeight + rng.next() * cellHeight;
          types[i] = ((cellX + cellY) % 2) % typesCount;
        }
      }
      break;
      
    case 'triangle':
      {
        const size = (recipe.params?.size || 0.6) * scale;
        for (let i = 0; i < particleCount; i++) {
          let u = rng.next();
          let v = rng.next();
          if (u + v > 1) {
            u = 1 - u;
            v = 1 - v;
          }
          const x = cx - size / 2 + u * size;
          const y = cy - size / 2 + v * size;
          positions[i * 2] = x;
          positions[i * 2 + 1] = y;
          types[i] = Math.floor((u + v) / 2 * typesCount) % typesCount;
        }
      }
      break;
      
    case 'corners':
      {
        const radius = (recipe.params?.radius || 0.12) * scale;
        const margin = radius * 2;
        const corners = [
          { x: margin, y: margin },
          { x: worldWidth - margin, y: margin },
          { x: margin, y: worldHeight - margin },
          { x: worldWidth - margin, y: worldHeight - margin }
        ];
        
        for (let i = 0; i < particleCount; i++) {
          const corner = corners[rng.int(0, 3)];
          const angle = rng.next() * Math.PI * 2;
          const r = Math.sqrt(rng.next()) * radius;
          positions[i * 2] = corner.x + Math.cos(angle) * r;
          positions[i * 2 + 1] = corner.y + Math.sin(angle) * r;
          types[i] = rng.int(0, typesCount - 1);
        }
      }
      break;
      
    case 'cross':
      {
        const width = (recipe.params?.width || 0.15) * scale;
        const length = (recipe.params?.length || 0.7) * scale;
        
        for (let i = 0; i < particleCount; i++) {
          const isVertical = rng.next() < 0.5;
          if (isVertical) {
            positions[i * 2] = cx + (rng.next() - 0.5) * width;
            positions[i * 2 + 1] = cy + (rng.next() - 0.5) * length;
          } else {
            positions[i * 2] = cx + (rng.next() - 0.5) * length;
            positions[i * 2 + 1] = cy + (rng.next() - 0.5) * width;
          }
          types[i] = isVertical ? 0 : (typesCount > 1 ? 1 : 0);
        }
      }
      break;
      
    case 'double_helix':
      {
        const radius = (recipe.params?.radius || 0.2) * scale;
        const turns = recipe.params?.turns || 3;
        const helixHeight = scale * 0.6;
        
        for (let i = 0; i < particleCount; i++) {
          const t = i / particleCount;
          const angle = t * Math.PI * 2 * turns;
          const isFirstStrand = i % 2 === 0;
          const offset = isFirstStrand ? 0 : Math.PI;
          positions[i * 2] = cx + Math.cos(angle + offset) * radius;
          positions[i * 2 + 1] = cy - helixHeight / 2 + t * helixHeight;
          types[i] = isFirstStrand ? 0 : (typesCount > 1 ? 1 : 0);
        }
      }
      break;
      
    case 'sunburst':
      {
        const rays = recipe.params?.rays || 8;
        const length = (recipe.params?.length || 0.4) * scale;
        
        for (let i = 0; i < particleCount; i++) {
          const ray = rng.int(0, rays - 1);
          const angle = (ray / rays) * Math.PI * 2;
          const r = rng.next() * length;
          positions[i * 2] = cx + Math.cos(angle) * r + (rng.next() - 0.5) * 10;
          positions[i * 2 + 1] = cy + Math.sin(angle) * r + (rng.next() - 0.5) * 10;
          types[i] = ray % typesCount;
        }
      }
      break;
      
    case 'concentric_rings':
      {
        const rings = recipe.params?.rings || 4;
        const spacing = (recipe.params?.spacing || 0.12) * scale;
        
        for (let i = 0; i < particleCount; i++) {
          const ring = rng.int(0, rings - 1);
          const radius = (ring + 1) * spacing;
          const angle = rng.next() * Math.PI * 2;
          positions[i * 2] = cx + Math.cos(angle) * radius;
          positions[i * 2 + 1] = cy + Math.sin(angle) * radius;
          types[i] = ring % typesCount;
        }
      }
      break;
      
    case 'wave':
      {
        const frequency = recipe.params?.frequency || 3;
        const amplitude = (recipe.params?.amplitude || 0.3) * scale;
        
        for (let i = 0; i < particleCount; i++) {
          const x = rng.next() * worldWidth;
          const phase = (x / worldWidth) * Math.PI * 2 * frequency;
          const y = cy + Math.sin(phase) * amplitude + (rng.next() - 0.5) * 20;
          positions[i * 2] = x;
          positions[i * 2 + 1] = y;
          types[i] = Math.floor((x / worldWidth) * typesCount) % typesCount;
        }
      }
      break;
      
    case 'vortex':
      {
        const tightness = recipe.params?.tightness || 0.15;
        const rotation = recipe.params?.rotation || 1.5;
        
        for (let i = 0; i < particleCount; i++) {
          const t = Math.sqrt(i / particleCount);
          const angle = t * Math.PI * 2 * rotation * 5;
          const r = t * scale * 0.45;
          positions[i * 2] = cx + Math.cos(angle) * r * (1 + t * tightness);
          positions[i * 2 + 1] = cy + Math.sin(angle) * r * (1 + t * tightness);
          types[i] = Math.floor(t * typesCount) % typesCount;
        }
      }
      break;
      
    case 'fractal_dust':
      {
        const iterations = recipe.params?.iterations || 3;
        const clusterSize = (recipe.params?.clusterSize || 0.08) * scale;
        
        for (let i = 0; i < particleCount; i++) {
          let x = rng.next() * worldWidth;
          let y = rng.next() * worldHeight;
          
          // Apply multiple levels of clustering
          for (let j = 0; j < iterations; j++) {
            x += (rng.next() - 0.5) * clusterSize / (j + 1);
            y += (rng.next() - 0.5) * clusterSize / (j + 1);
          }
          
          positions[i * 2] = Math.max(0, Math.min(worldWidth, x));
          positions[i * 2 + 1] = Math.max(0, Math.min(worldHeight, y));
          types[i] = rng.int(0, typesCount - 1);
        }
      }
      break;
      
    case 'yin_yang':
      {
        const radius = (recipe.params?.radius || 0.35) * scale;
        
        for (let i = 0; i < particleCount; i++) {
          const isYin = rng.next() < 0.5;
          const angle = rng.next() * Math.PI * 2;
          const r = Math.sqrt(rng.next()) * radius;
          
          if (isYin) {
            // Left half circle
            const localAngle = Math.PI / 2 + angle / 2;
            positions[i * 2] = cx - radius / 2 + Math.cos(localAngle) * r;
            positions[i * 2 + 1] = cy + Math.sin(localAngle) * r;
            types[i] = 0;
          } else {
            // Right half circle
            const localAngle = -Math.PI / 2 + angle / 2;
            positions[i * 2] = cx + radius / 2 + Math.cos(localAngle) * r;
            positions[i * 2 + 1] = cy + Math.sin(localAngle) * r;
            types[i] = typesCount > 1 ? 1 : 0;
          }
        }
      }
      break;
      
    default:
      // Fallback to random
      for (let i = 0; i < particleCount; i++) {
        positions[i * 2] = rng.next() * worldWidth;
        positions[i * 2 + 1] = rng.next() * worldHeight;
        types[i] = rng.int(0, typesCount - 1);
      }
  }
  
  return { positions, types };
};
