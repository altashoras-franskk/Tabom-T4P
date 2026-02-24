// WorldDNA: Complete universe seed configuration system
import { SeededRNG } from '../../engine/rng';

export interface WorldDNA {
  // Population
  speciesCount: number;           // 4..24
  particlesPerSpecies: number;    // 80..900
  
  // Physics kernel
  beta: number;                   // 0.18..0.42
  coreRepel: number;              // 0.7..1.4
  rmax: number;                   // 0.12..0.38
  forceGain: number;              // 0.6..2.6
  drag: number;                   // 0.6..2.2
  speedClamp: number;             // 0.06..0.18
  
  // Matrix generation
  matrixMode: 'sparse' | 'block' | 'ring' | 'predator-prey' | 'symbiosis' | 'random';
  matrixSparsity: number;         // 0.15..0.85
  radiusSpread: number;           // 0.0..0.55
  
  // Spawn pattern
  spawnPattern: 'random' | 'circle' | 'rings' | 'clusters' | 'grid' | 'center' | 'spray' | 'islands' | 'columns' | 'web' | 'spiral' | 'double-ring';
  
  // Render aesthetics
  renderMode: 'dots' | 'streaks';
  trailsFade: number;             // 0.90..0.985
  paletteId: number;              // 0..5
  
  // Optional features
  energyEnabled: boolean;
  mitosisRate: number;            // 0.0..0.12
  metamorphosisEnabled?: boolean;  // Optional: particle type mutations
  mutationRate?: number;           // 0.0001..0.005
  typeStability?: number;          // 0.95..0.999
}

// Generate DNA from seed with wide distributions
export const generateDNA = (seed: number): WorldDNA => {
  const rng = new SeededRNG(seed);
  
  // ULTRA PERFORMANCE: Cap total particles at ~1200 max
  // Log-distributed particle count (bias toward middle)
  const particleLog = rng.range(Math.log(60), Math.log(200)); // ULTRA: Reduced from 80-350
  const particlesPerSpecies = Math.round(Math.exp(particleLog));
  
  // Species count with bias toward 3-6 (ULTRA REDUCED)
  const speciesCount = rng.next() < 0.7 
    ? rng.int(3, 6) // ULTRA: Reduced from 4-8
    : rng.int(2, 8); // ULTRA: Reduced from 3-12
  
  // SAFETY: Ensure total doesn't exceed 1200
  const totalParticles = speciesCount * particlesPerSpecies;
  let finalSpecies = speciesCount;
  let finalPerSpecies = particlesPerSpecies;
  
  if (totalParticles > 1200) {
    // Scale down proportionally
    const scale = Math.sqrt(1200 / totalParticles);
    finalSpecies = Math.max(2, Math.round(speciesCount * scale));
    finalPerSpecies = Math.floor(1200 / finalSpecies);
  }
  
  return {
    speciesCount: finalSpecies,
    particlesPerSpecies: finalPerSpecies,
    
    // Physics (TUNED for emergence - avoid dead combos)
    beta: rng.range(0.22, 0.40), // INCREASED: was 0.18-0.42, more mid-range repulsion
    coreRepel: rng.range(0.8, 1.3), // INCREASED min: was 0.7
    rmax: rng.range(0.16, 0.36), // INCREASED min: was 0.14-0.38
    forceGain: rng.range(1.2, 2.8), // INCREASED min: was 1.0, more force = more patterns
    drag: rng.range(0.9, 1.7), // NARROWED: was 0.8-1.8, avoid extremes
    speedClamp: rng.range(0.09, 0.16), // NARROWED: was 0.08-0.18, moderate speeds
    
    // Matrix structure
    matrixMode: ['sparse', 'block', 'ring', 'predator-prey', 'symbiosis', 'random'][rng.int(0, 5)] as any,
    matrixSparsity: rng.range(0.20, 0.80), // NARROWED: was 0.15-0.85
    radiusSpread: rng.range(0.05, 0.50), // NARROWED: was 0.0-0.55
    
    // Spawn
    spawnPattern: ['random', 'circle', 'rings', 'clusters', 'grid', 'center', 'islands', 'columns', 'web', 'spiral', 'double-ring'][rng.int(0, 10)] as any,
    
    // Aesthetics
    renderMode: rng.next() < 0.3 ? 'streaks' : 'dots',
    trailsFade: rng.range(0.90, 0.985),
    paletteId: rng.int(0, 5),
    
    // Features
    energyEnabled: rng.next() < 0.2,
    mitosisRate: rng.range(0.0, 0.12),
  };
};

// Generate DNA for specific recipe
export const generateRecipeDNA = (recipe: string, seed: number): WorldDNA => {
  const rng = new SeededRNG(seed);
  
  switch (recipe) {
    case 'pollock': {
      return {
        speciesCount: rng.int(4, 6), // ULTRA: Reduced from 6-10
        particlesPerSpecies: rng.int(100, 160), // ULTRA: Increased min from 80
        
        beta: rng.range(0.24, 0.36), // INCREASED: more mid-range
        coreRepel: rng.range(0.9, 1.2), // INCREASED min
        rmax: rng.range(0.20, 0.32), // INCREASED min
        forceGain: rng.range(1.4, 2.4), // INCREASED min for more action
        drag: rng.range(0.9, 1.3), // NARROWED for stability
        speedClamp: rng.range(0.09, 0.14),
        
        matrixMode: rng.next() < 0.5 ? 'sparse' : 'symbiosis',
        matrixSparsity: rng.range(0.4, 0.7),
        radiusSpread: rng.range(0.2, 0.45),
        
        spawnPattern: 'spray',
        
        renderMode: 'streaks',
        trailsFade: rng.range(0.975, 0.985),
        paletteId: rng.int(0, 5),
        
        energyEnabled: false,
        mitosisRate: 0.0,
      };
    }
    
    case 'mitosis': {
      return {
        speciesCount: rng.int(3, 5), // ULTRA: Reduced from 4-6
        particlesPerSpecies: rng.int(120, 200), // ULTRA: Increased min from 100
        
        beta: rng.range(0.26, 0.36), // NARROWED for stability
        coreRepel: rng.range(0.95, 1.25), // INCREASED min
        rmax: rng.range(0.17, 0.28), // INCREASED min
        forceGain: rng.range(1.0, 1.8), // INCREASED min
        drag: rng.range(1.1, 1.7), // NARROWED
        speedClamp: rng.range(0.07, 0.12),
        
        matrixMode: 'block',
        matrixSparsity: rng.range(0.3, 0.6),
        radiusSpread: rng.range(0.1, 0.3),
        
        spawnPattern: rng.next() < 0.5 ? 'rings' : 'islands',
        
        renderMode: 'dots',
        trailsFade: rng.range(0.93, 0.97),
        paletteId: rng.int(0, 5),
        
        energyEnabled: false,
        mitosisRate: rng.range(0.04, 0.12), // INCREASED min from 0.03
      };
    }
    
    case 'alliances': {
      return {
        speciesCount: rng.int(3, 5), // ULTRA: Reduced from 5-8
        particlesPerSpecies: rng.int(80, 150), // ULTRA: Reduced from 120-250
        
        beta: rng.range(0.20, 0.35),
        coreRepel: rng.range(0.8, 1.2),
        rmax: rng.range(0.16, 0.30),
        forceGain: rng.range(1.0, 2.0),
        drag: rng.range(0.8, 1.5),
        speedClamp: rng.range(0.08, 0.14),
        
        matrixMode: 'symbiosis',
        matrixSparsity: rng.range(0.3, 0.6),
        radiusSpread: rng.range(0.15, 0.40),
        
        spawnPattern: 'islands',
        
        renderMode: 'dots',
        trailsFade: rng.range(0.94, 0.98),
        paletteId: rng.int(0, 5),
        
        energyEnabled: false,
        mitosisRate: 0.0,
      };
    }
    
    case 'planets': {
      return {
        speciesCount: rng.int(2, 4), // ULTRA: Reduced from 3-5
        particlesPerSpecies: rng.int(120, 220), // ULTRA: Reduced from 180-350
        
        beta: rng.range(0.24, 0.38),
        coreRepel: rng.range(1.0, 1.4),
        rmax: rng.range(0.20, 0.35),
        forceGain: rng.range(0.8, 1.4),
        drag: rng.range(1.2, 2.0),
        speedClamp: rng.range(0.06, 0.10),
        
        matrixMode: 'ring',
        matrixSparsity: rng.range(0.2, 0.5),
        radiusSpread: rng.range(0.20, 0.45),
        
        spawnPattern: 'rings',
        
        renderMode: 'dots',
        trailsFade: rng.range(0.92, 0.96),
        paletteId: rng.int(0, 5),
        
        energyEnabled: false,
        mitosisRate: 0.0,
      };
    }
    
    case 'field': {
      return {
        speciesCount: rng.int(5, 8), // ULTRA: Reduced from 8-12
        particlesPerSpecies: rng.int(60, 120), // ULTRA: Reduced from 100-220
        
        beta: rng.range(0.18, 0.30),
        coreRepel: rng.range(0.7, 1.1),
        rmax: rng.range(0.14, 0.26),
        forceGain: rng.range(1.4, 2.4),
        drag: rng.range(0.6, 1.0),
        speedClamp: rng.range(0.10, 0.16),
        
        matrixMode: 'sparse',
        matrixSparsity: rng.range(0.5, 0.8),
        radiusSpread: rng.range(0.3, 0.55),
        
        spawnPattern: 'spray',
        
        renderMode: 'dots',
        trailsFade: rng.range(0.96, 0.98),
        paletteId: rng.int(0, 5),
        
        energyEnabled: false,
        mitosisRate: 0.0,
      };
    }
    
    case 'gems': {
      return {
        speciesCount: rng.int(3, 5), // ULTRA: Reduced from 5-8
        particlesPerSpecies: rng.int(80, 150), // ULTRA: Reduced from 120-250
        
        beta: rng.range(0.28, 0.40),
        coreRepel: rng.range(1.1, 1.4),
        rmax: rng.range(0.12, 0.22),
        forceGain: rng.range(0.8, 1.6),
        drag: rng.range(1.4, 2.2),
        speedClamp: rng.range(0.06, 0.10),
        
        matrixMode: 'block',
        matrixSparsity: rng.range(0.2, 0.4),
        radiusSpread: rng.range(0.05, 0.20),
        
        spawnPattern: 'center',
        
        renderMode: 'dots',
        trailsFade: rng.range(0.90, 0.94),
        paletteId: rng.int(0, 5),
        
        energyEnabled: false,
        mitosisRate: 0.0,
      };
    }
    
    case 'drift': {
      return {
        speciesCount: rng.int(4, 6), // ULTRA: Reduced from 6-10
        particlesPerSpecies: rng.int(60, 140), // ULTRA: Reduced from 100-250
        
        beta: rng.range(0.20, 0.32),
        coreRepel: rng.range(0.7, 1.0),
        rmax: rng.range(0.18, 0.30),
        forceGain: rng.range(1.6, 2.6),
        drag: rng.range(0.6, 1.2),
        speedClamp: rng.range(0.12, 0.18),
        
        matrixMode: 'sparse',
        matrixSparsity: rng.range(0.6, 0.85),
        radiusSpread: rng.range(0.35, 0.55),
        
        spawnPattern: 'web',
        
        renderMode: rng.next() < 0.4 ? 'streaks' : 'dots',
        trailsFade: rng.range(0.97, 0.985),
        paletteId: rng.int(0, 5),
        
        energyEnabled: false,
        mitosisRate: 0.0,
      };
    }
    
    case 'simplify': {
      return {
        speciesCount: rng.int(2, 4), // ULTRA: Reduced from 3-5
        particlesPerSpecies: rng.int(120, 220), // ULTRA: Reduced from 180-350
        
        beta: rng.range(0.25, 0.35),
        coreRepel: rng.range(0.9, 1.2),
        rmax: rng.range(0.18, 0.28),
        forceGain: rng.range(1.0, 1.8),
        drag: rng.range(1.0, 1.6),
        speedClamp: rng.range(0.08, 0.12),
        
        matrixMode: 'block',
        matrixSparsity: rng.range(0.2, 0.4),
        radiusSpread: rng.range(0.10, 0.25),
        
        spawnPattern: 'rings',
        
        renderMode: 'dots',
        trailsFade: rng.range(0.92, 0.96),
        paletteId: rng.int(0, 5),
        
        energyEnabled: false,
        mitosisRate: 0.0,
      };
    }
    
    case 'darwin': {
      return {
        speciesCount: 5, // Fixed 5 types for evolution chain
        particlesPerSpecies: rng.int(80, 140),
        
        beta: rng.range(0.30, 0.40), // Higher beta for more separation
        coreRepel: rng.range(1.0, 1.3),
        rmax: rng.range(0.20, 0.28),
        forceGain: rng.range(1.4, 2.0),
        drag: rng.range(1.0, 1.4),
        speedClamp: rng.range(0.10, 0.14),
        
        matrixMode: 'predator-prey', // Evolutionary pressure
        matrixSparsity: rng.range(0.3, 0.5),
        radiusSpread: rng.range(0.15, 0.30),
        
        spawnPattern: rng.next() < 0.5 ? 'clusters' : 'islands',
        
        renderMode: 'dots',
        trailsFade: rng.range(0.94, 0.97),
        paletteId: rng.int(0, 5),
        
        energyEnabled: true, // Energy system drives evolution
        mitosisRate: 0.0,
        metamorphosisEnabled: true, // Enable evolution!
        mutationRate: rng.range(0.0015, 0.0025), // Moderate mutation
        typeStability: rng.range(0.975, 0.985), // Allow changes
      };
    }
    
    default: // random
      return generateDNA(seed);
  }
};

// Apply chaos mutation to DNA (for CHAOS SEED button)
export const chaosMutateDNA = (dna: WorldDNA, rng: SeededRNG): WorldDNA => {
  const mutated = { ...dna };
  
  // High probability changes
  if (rng.next() < 0.7) {
    mutated.speciesCount = rng.int(4, 24);
  }
  
  if (rng.next() < 0.6) {
    const modes: WorldDNA['matrixMode'][] = ['sparse', 'block', 'ring', 'predator-prey', 'symbiosis', 'random'];
    mutated.matrixMode = modes[rng.int(0, modes.length - 1)];
  }
  
  if (rng.next() < 0.5) {
    mutated.radiusSpread = rng.range(0.2, 0.55);
  }
  
  if (rng.next() < 0.5) {
    const patterns: WorldDNA['spawnPattern'][] = ['spray', 'rings', 'islands', 'columns', 'center', 'web'];
    mutated.spawnPattern = patterns[rng.int(0, patterns.length - 1)];
  }
  
  if (rng.next() < 0.4) {
    mutated.renderMode = rng.next() < 0.5 ? 'streaks' : 'dots';
  }
  
  if (rng.next() < 0.4) {
    mutated.paletteId = rng.int(0, 5);
  }
  
  // Physics tweaks
  mutated.forceGain *= rng.range(0.7, 1.4);
  mutated.drag *= rng.range(0.8, 1.3);
  
  return mutated;
};

// Get human-readable DNA summary
export const dnaToString = (dna: WorldDNA): string => {
  const parts: string[] = [];
  
  parts.push(`species=${dna.speciesCount}`);
  parts.push(`p/s=${dna.particlesPerSpecies}`);
  parts.push(`mode=${dna.matrixMode}`);
  
  if (dna.renderMode === 'streaks') {
    parts.push('streaks=on');
  }
  
  if (dna.mitosisRate > 0.01) {
    parts.push(`mitosis=${dna.mitosisRate.toFixed(2)}`);
  }
  
  parts.push(`palette=${dna.paletteId}`);
  
  return parts.join(', ');
};
