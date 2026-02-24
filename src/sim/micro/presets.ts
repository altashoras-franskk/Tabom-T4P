// Micro-level presets
import { InteractionMatrix, createMatrix } from './matrix';
import { MicroConfig } from './microState';

export interface MicroPreset {
  name: string;
  typesCount: number;
  particleCount: number;
  config: Partial<MicroConfig>;
  matrixInit: (matrix: InteractionMatrix) => void;
  showSigils?: boolean; // PATCH 04.3: Auto-enable sigils for archetype presets
}

export const microPresets: MicroPreset[] = [
  {
    name: 'Orbit',
    typesCount: 3,
    particleCount: 1200,
    config: {
      rmax: 0.12,
      force: 1.2,
      friction: 0.92,
      speedClamp: 0.10,
    },
    matrixInit: (m) => {
      // Classic orbit pattern
      m.attract[0][0] = -0.3; m.attract[0][1] = 0.5; m.attract[0][2] = -0.2;
      m.attract[1][0] = -0.5; m.attract[1][1] = -0.3; m.attract[1][2] = 0.6;
      m.attract[2][0] = 0.6; m.attract[2][1] = -0.5; m.attract[2][2] = -0.3;
      
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          m.radius[i][j] = 0.1;
          m.falloff[i][j] = 1.2;
        }
      }
    },
  },
  {
    name: 'Flocks',
    typesCount: 4,
    particleCount: 1500,
    config: {
      rmax: 0.15,
      force: 0.8,
      friction: 0.88,
      speedClamp: 0.12,
    },
    matrixInit: (m) => {
      // Flocking behavior
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (i === j) {
            m.attract[i][j] = 0.4;
          } else {
            m.attract[i][j] = -0.2;
          }
          m.radius[i][j] = 0.12;
          m.falloff[i][j] = 1.5;
        }
      }
    },
  },
  {
    name: 'Borders',
    typesCount: 5,
    particleCount: 2000,
    config: {
      rmax: 0.1,
      force: 1.0,
      friction: 0.9,
      speedClamp: 0.12,
    },
    matrixInit: (m) => {
      // Strong repulsion between different types, attraction within
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          if (i === j) {
            m.attract[i][j] = 0.6;
          } else {
            m.attract[i][j] = -0.7;
          }
          m.radius[i][j] = 0.08;
          m.falloff[i][j] = 1.0;
        }
      }
    },
  },
  {
    name: 'Mitosis',
    typesCount: 2,
    particleCount: 800,
    config: {
      rmax: 0.2,
      force: 1.5,
      friction: 0.85,
      speedClamp: 0.16,
    },
    matrixInit: (m) => {
      m.attract[0][0] = 0.7; m.attract[0][1] = -0.9;
      m.attract[1][0] = -0.9; m.attract[1][1] = 0.7;
      
      m.radius[0][0] = 0.15; m.radius[0][1] = 0.18;
      m.radius[1][0] = 0.18; m.radius[1][1] = 0.15;
      
      m.falloff[0][0] = 1.0; m.falloff[0][1] = 0.8;
      m.falloff[1][0] = 0.8; m.falloff[1][1] = 1.0;
    },
  },
  {
    name: 'Ritual',
    typesCount: 6,
    particleCount: 2500,
    config: {
      rmax: 0.14,
      force: 0.9,
      friction: 0.93,
      speedClamp: 0.10,
    },
    matrixInit: (m) => {
      // Circular dependency
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          const diff = (j - i + 6) % 6;
          if (diff === 0) {
            m.attract[i][j] = 0.3;
          } else if (diff === 1) {
            m.attract[i][j] = 0.5;
          } else if (diff === 5) {
            m.attract[i][j] = -0.6;
          } else {
            m.attract[i][j] = -0.2;
          }
          m.radius[i][j] = 0.11;
          m.falloff[i][j] = 1.3;
        }
      }
    },
  },
  {
    name: 'Crisis',
    typesCount: 3,
    particleCount: 1000,
    config: {
      rmax: 0.08,
      force: 2.0,
      friction: 0.8,
      speedClamp: 0.1,
      entropy: 0.002,
    },
    matrixInit: (m) => {
      // High chaos
      m.attract[0][0] = 0.8; m.attract[0][1] = -0.9; m.attract[0][2] = 0.6;
      m.attract[1][0] = 0.6; m.attract[1][1] = -0.5; m.attract[1][2] = -0.8;
      m.attract[2][0] = -0.9; m.attract[2][1] = 0.7; m.attract[2][2] = 0.5;
      
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          m.radius[i][j] = 0.06;
          m.falloff[i][j] = 0.7;
        }
      }
    },
  },
  {
    name: 'Symbiosis',
    typesCount: 4,
    particleCount: 1800,
    config: {
      rmax: 0.16,
      force: 1.1,
      friction: 0.91,
      speedClamp: 0.12,
    },
    matrixInit: (m) => {
      // Pairs of symbiotic types
      m.attract[0][0] = 0.2; m.attract[0][1] = 0.8; m.attract[0][2] = -0.3; m.attract[0][3] = -0.4;
      m.attract[1][0] = 0.8; m.attract[1][1] = 0.2; m.attract[1][2] = -0.4; m.attract[1][3] = -0.3;
      m.attract[2][0] = -0.3; m.attract[2][1] = -0.4; m.attract[2][2] = 0.2; m.attract[2][3] = 0.8;
      m.attract[3][0] = -0.4; m.attract[3][1] = -0.3; m.attract[3][2] = 0.8; m.attract[3][3] = 0.2;
      
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          m.radius[i][j] = 0.13;
          m.falloff[i][j] = 1.4;
        }
      }
    },
  },
  {
    name: 'Anomaly',
    typesCount: 7,
    particleCount: 2800,
    config: {
      rmax: 0.13,
      force: 1.3,
      friction: 0.87,
      speedClamp: 0.14,
      entropy: 0.003,
    },
    matrixInit: (m) => {
      // Random chaotic
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          const v = Math.sin(i * 1.7 + j * 2.3) * 0.9;
          m.attract[i][j] = v;
          m.radius[i][j] = 0.1 + Math.abs(Math.cos(i + j)) * 0.05;
          m.falloff[i][j] = 0.9 + Math.abs(Math.sin(i * j)) * 0.8;
        }
      }
    },
  },
  {
    name: 'Nested',
    typesCount: 6,
    particleCount: 2200,
    config: {
      rmax: 0.14,
      force: 1.0,
      friction: 0.92,
      speedClamp: 0.12,
      entropy: 0.001,
    },
    matrixInit: (m) => {
      // Three pairs of types, each pair forms clusters, clusters orbit each other
      // Pair 0: types 0,1  |  Pair 1: types 2,3  |  Pair 2: types 4,5
      for (let i = 0; i < 6; i++) {
        const pairA = Math.floor(i / 2);
        for (let j = 0; j < 6; j++) {
          const pairB = Math.floor(j / 2);
          
          if (i === j) {
            // Self attraction
            m.attract[i][j] = 0.5;
          } else if (pairA === pairB) {
            // Same pair - strong mutual attraction
            m.attract[i][j] = 0.7;
          } else if ((pairB - pairA + 3) % 3 === 1) {
            // Next pair in cycle - weak attraction
            m.attract[i][j] = 0.2;
          } else if ((pairB - pairA + 3) % 3 === 2) {
            // Previous pair - repulsion
            m.attract[i][j] = -0.6;
          } else {
            m.attract[i][j] = -0.1;
          }
          
          m.radius[i][j] = 0.11;
          m.falloff[i][j] = 1.3;
        }
      }
    },
  },
  {
    name: 'Particle Life',
    typesCount: 6,
    particleCount: 2000,
    config: {
      rmax: 0.25,
      force: 1.5,
      drag: 1.3,
      useDrag: true,
      beta: 0.3,
      coreRepel: 1.0,
      kernelMode: 'classic' as 'classic' | 'pow',
      speedClamp: 0.15,
      entropy: 0.0,
      softening: 1e-4,
    },
    matrixInit: (m) => {
      // Rich alien genome with varied interactions
      const types = 6;
      for (let i = 0; i < types; i++) {
        for (let j = 0; j < types; j++) {
          // Create interesting patterns using sine waves
          const phase = (i * 1.3 + j * 2.7);
          m.attract[i][j] = Math.sin(phase) * 0.8;
          
          // Varied radius creates membrane-like structures
          m.radius[i][j] = 0.18 + Math.cos(i + j) * 0.08;
          
          // Falloff doesn't matter in classic mode, but set anyway
          m.falloff[i][j] = 1.2;
        }
      }
      
      // Add some predator-prey dynamics
      m.attract[0][1] = 0.7;  // 0 chases 1
      m.attract[1][0] = -0.6; // 1 flees 0
      m.attract[2][3] = 0.6;
      m.attract[3][2] = -0.5;
      
      // Strong self-cohesion for some types (creates islands)
      m.attract[1][1] = 0.5;
      m.attract[3][3] = 0.4;
    },
  },
  {
    name: 'Membranes',
    typesCount: 5,
    particleCount: 2000,
    config: {
      rmax: 0.14,
      force: 1.1,
      friction: 0.91,
      speedClamp: 0.12,
    },
    matrixInit: (m) => {
      // F) Use procedural genome: membraneBodies
      // Strong internal cohesion, strong external repulsion = membranes
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          if (i === j) {
            m.attract[i][j] = 0.7; // strong self-attraction
          } else {
            m.attract[i][j] = -0.8; // strong repulsion
          }
          m.radius[i][j] = 0.12;
          m.falloff[i][j] = 1.2;
        }
      }
    },
  },
  {
    name: 'Predators',
    typesCount: 4,
    particleCount: 1600,
    config: {
      rmax: 0.16,
      force: 1.3,
      friction: 0.89,
      speedClamp: 0.14,
    },
    matrixInit: (m) => {
      // F) Use procedural genome: predatorPrey cyclic chain
      for (let i = 0; i < 4; i++) {
        const next = (i + 1) % 4;
        const prev = (i - 1 + 4) % 4;
        
        for (let j = 0; j < 4; j++) {
          if (j === next) {
            m.attract[i][j] = 0.7; // chase next
          } else if (j === prev) {
            m.attract[i][j] = -0.6; // flee from previous
          } else if (i === j) {
            m.attract[i][j] = 0.3; // mild self-attraction
          } else {
            m.attract[i][j] = -0.2; // weak repulsion
          }
          m.radius[i][j] = 0.14;
          m.falloff[i][j] = 1.4;
        }
      }
    },
  },
  {
    name: 'Parasites',
    typesCount: 6,
    particleCount: 2200,
    config: {
      rmax: 0.13,
      force: 1.0,
      friction: 0.90,
      speedClamp: 0.12,
    },
    matrixInit: (m) => {
      // F) Use procedural genome: parasitic (asymmetric relationships)
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          if (i === j) {
            m.attract[i][j] = 0.4; // self-attraction
          } else {
            // Asymmetric: host (even) vs parasite (odd)
            if (i % 2 === 0 && j % 2 === 1) {
              m.attract[i][j] = -0.5; // host repels parasite
            } else if (i % 2 === 1 && j % 2 === 0) {
              m.attract[i][j] = 0.6; // parasite chases host
            } else {
              m.attract[i][j] = -0.2;
            }
          }
          m.radius[i][j] = 0.11;
          m.falloff[i][j] = 1.3;
        }
      }
    },
  },
  {
    name: 'Orbits',
    typesCount: 5,
    particleCount: 1800,
    config: {
      rmax: 0.15,
      force: 1.2,
      friction: 0.92,
      speedClamp: 0.12,
    },
    matrixInit: (m) => {
      // F) Use procedural genome: orbitalRings
      const center = 0; // Type 0 is the center/sun
      
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          if (i === center) {
            // Center type
            if (j === center) {
              m.attract[i][j] = 0.5; // self cohesion
            } else {
              m.attract[i][j] = -0.3; // push others away
            }
          } else {
            // Orbiting types
            if (j === center) {
              m.attract[i][j] = 0.6; // attracted to center
            } else if (i === j) {
              m.attract[i][j] = 0.2; // weak self-attraction
            } else {
              m.attract[i][j] = -0.4; // repel each other (separate rings)
            }
          }
          m.radius[i][j] = 0.13;
          m.falloff[i][j] = 1.3;
        }
      }
    },
  },
  // PATCH 04.3: ARCHETYPE SHOWCASE PRESETS (focused on mutation/sigils/speciation)
  {
    name: '🧬 Genesis Pool',
    typesCount: 3,
    particleCount: 600,
    showSigils: true,
    config: {
      rmax: 0.18,
      force: 1.0,
      friction: 0.88,
      speedClamp: 0.12,
      entropy: 0.004, // HIGH mutation rate
      beta: 0.15,
      drag: 1.2,
      useDrag: true,
    },
    matrixInit: (m) => {
      // Balanced soup - all interactions moderate
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          m.attract[i][j] = (i + j) % 2 === 0 ? 0.3 : -0.3;
          m.radius[i][j] = 0.14;
          m.falloff[i][j] = 1.2;
        }
      }
    },
  },
  {
    name: '✶ Bond Ritual',
    typesCount: 4,
    particleCount: 1000,
    showSigils: true,
    config: {
      rmax: 0.16,
      force: 1.4,
      friction: 0.90,
      speedClamp: 0.10,
      entropy: 0.002,
      beta: 0.25,
    },
    matrixInit: (m) => {
      // Strong attractions create many bond sigils
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (i === j) {
            m.attract[i][j] = 0.8; // Very strong self-attraction
          } else {
            m.attract[i][j] = 0.4; // Moderate inter-attraction
          }
          m.radius[i][j] = 0.12;
          m.falloff[i][j] = 1.0;
        }
      }
    },
  },
  {
    name: '⨯ Rift Storm',
    typesCount: 5,
    particleCount: 1400,
    showSigils: true,
    config: {
      rmax: 0.14,
      force: 1.6,
      friction: 0.85,
      speedClamp: 0.14,
      entropy: 0.005, // High chaos
      beta: 0.10,
    },
    matrixInit: (m) => {
      // Strong repulsions create rift sigils
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          if (i === j) {
            m.attract[i][j] = 0.3;
          } else {
            m.attract[i][j] = -0.7; // Strong repulsion
          }
          m.radius[i][j] = 0.10;
          m.falloff[i][j] = 0.9;
        }
      }
    },
  },
  {
    name: '⚘ Bloom Garden',
    typesCount: 4,
    particleCount: 1200,
    showSigils: true,
    config: {
      rmax: 0.20,
      force: 0.9,
      friction: 0.92,
      speedClamp: 0.12,
      entropy: 0.003,
      beta: 0.20,
      drag: 1.4,
      useDrag: true,
    },
    matrixInit: (m) => {
      // Feeding relationships (bloom sigils in nutrient zones)
      m.attract[0][0] = 0.5; m.attract[0][1] = 0.6; m.attract[0][2] = -0.3; m.attract[0][3] = -0.2;
      m.attract[1][0] = -0.4; m.attract[1][1] = 0.4; m.attract[1][2] = 0.7; m.attract[1][3] = -0.3;
      m.attract[2][0] = 0.6; m.attract[2][1] = -0.5; m.attract[2][2] = 0.3; m.attract[2][3] = 0.5;
      m.attract[3][0] = -0.3; m.attract[3][1] = 0.6; m.attract[3][2] = -0.4; m.attract[3][3] = 0.4;
      
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          m.radius[i][j] = 0.16;
          m.falloff[i][j] = 1.3;
        }
      }
    },
  },
  {
    name: '⌬ Oath Paths',
    typesCount: 3,
    particleCount: 800,
    showSigils: true,
    config: {
      rmax: 0.18,
      force: 0.8,
      friction: 0.95, // Very low friction = persistent paths
      speedClamp: 0.08, // Low speed for ritual-like movement
      entropy: 0.001,
      beta: 0.30,
    },
    matrixInit: (m) => {
      // Circular attraction creates persistent paths (oath sigils)
      const next = [1, 2, 0];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (j === next[i]) {
            m.attract[i][j] = 0.7; // Chase next in circle
          } else if (i === j) {
            m.attract[i][j] = 0.2;
          } else {
            m.attract[i][j] = -0.4;
          }
          m.radius[i][j] = 0.15;
          m.falloff[i][j] = 1.4;
        }
      }
    },
  },
  {
    name: '🌀 Speciation Vortex',
    typesCount: 6,
    particleCount: 1800,
    showSigils: true,
    config: {
      rmax: 0.15,
      force: 1.2,
      friction: 0.88,
      speedClamp: 0.13,
      entropy: 0.006, // VERY high mutation
      beta: 0.18,
      drag: 1.3,
      useDrag: true,
    },
    matrixInit: (m) => {
      // Complex asymmetric relationships encourage diversity
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          const phase = i * 2.1 + j * 1.7;
          m.attract[i][j] = Math.sin(phase) * 0.7;
          m.radius[i][j] = 0.12 + Math.abs(Math.cos(i - j)) * 0.04;
          m.falloff[i][j] = 1.1;
        }
      }
    },
  },
  {
    name: '💎 Crystal Archive',
    typesCount: 4,
    particleCount: 1000,
    showSigils: true,
    config: {
      rmax: 0.12,
      force: 1.0,
      friction: 0.94, // Very stable
      speedClamp: 0.08,
      entropy: 0.001, // Low mutation - stable species
      beta: 0.25,
    },
    matrixInit: (m) => {
      // Symmetric lattice - stable archetype preservation
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (i === j) {
            m.attract[i][j] = 0.6;
          } else if ((i + j) % 2 === 0) {
            m.attract[i][j] = 0.3;
          } else {
            m.attract[i][j] = -0.5;
          }
          m.radius[i][j] = 0.10;
          m.falloff[i][j] = 1.0;
        }
      }
    },
  },
  {
    name: '🔥 Mutation Forge',
    typesCount: 7,
    particleCount: 2000,
    showSigils: true,
    config: {
      rmax: 0.14,
      force: 1.4,
      friction: 0.86,
      speedClamp: 0.14,
      entropy: 0.008, // EXTREME mutation
      beta: 0.12,
      drag: 1.1,
      useDrag: true,
    },
    matrixInit: (m) => {
      // Chaotic high-energy soup
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          const v = Math.sin(i * 3.14 + j * 1.618) * 0.9;
          m.attract[i][j] = v;
          m.radius[i][j] = 0.11;
          m.falloff[i][j] = 0.95;
        }
      }
    },
  },
  {
    name: '🧿 Sigil Mandala',
    typesCount: 5,
    particleCount: 1500,
    showSigils: true,
    config: {
      rmax: 0.17,
      force: 1.1,
      friction: 0.91,
      speedClamp: 0.11,
      entropy: 0.003,
      beta: 0.22,
      drag: 1.25,
      useDrag: true,
    },
    matrixInit: (m) => {
      // Radially symmetric - creates beautiful sigil patterns
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          const angle = ((j - i + 5) % 5) * (2 * Math.PI / 5);
          m.attract[i][j] = Math.cos(angle) * 0.6;
          m.radius[i][j] = 0.14;
          m.falloff[i][j] = 1.2;
        }
      }
    },
  },
  {
    name: '🌊 Primordial Soup',
    typesCount: 8,
    particleCount: 2400,
    showSigils: true,
    config: {
      rmax: 0.16,
      force: 1.0,
      friction: 0.89,
      speedClamp: 0.13,
      entropy: 0.004,
      beta: 0.16,
      drag: 1.2,
      useDrag: true,
    },
    matrixInit: (m) => {
      // Rich diversity starter - all 4 sigil types emerge
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          if (i === j) {
            m.attract[i][j] = 0.4;
          } else if (Math.abs(i - j) === 1 || Math.abs(i - j) === 7) {
            m.attract[i][j] = 0.5; // Bond neighbors
          } else if (Math.abs(i - j) === 4) {
            m.attract[i][j] = -0.6; // Rift opposites
          } else {
            m.attract[i][j] = Math.sin(i + j) * 0.3;
          }
          m.radius[i][j] = 0.13;
          m.falloff[i][j] = 1.15;
        }
      }
    },
  },
];
