// 20 THEMED PRESETS: Art + Biology + Phenomena
// Each preset has a seed for reproducibility

import { MicroConfig } from './microState';
import { InteractionMatrix, createMatrix } from './matrix';

export interface ThemedPreset {
  name: string;
  emoji: string;
  description: string;
  seed: number; // Deterministic seed
  typesCount: number;
  config: Partial<MicroConfig>;
  matrixGen: (rng: { next: () => number }) => InteractionMatrix;
}

// Seeded RNG (simple LCG)
const seededRNG = (seed: number) => {
  let state = seed;
  return {
    next: (): number => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    },
    int: (min: number, max: number): number => {
      const val = seededRNG(state).next();
      return Math.floor(val * (max - min + 1)) + min;
    }
  };
};

export const themedPresets: ThemedPreset[] = [
  // === ART ===
  {
    name: 'Pollock',
    emoji: '🎨',
    description: 'Drip painting chaos, wild attraction/repulsion splatter',
    seed: 1948,
    typesCount: 8,
    config: {
      rmax: 0.18,
      force: 2.0,
      drag: 0.8,
      speedClamp: 0.15,
      entropy: 0.15,
    },
    matrixGen: (rng) => {
      const m = createMatrix(8);
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          m.attract[i][j] = rng.next() * 2 - 1; // Full chaos
          m.minR[i][j] = rng.next() * 0.1;
          m.maxR[i][j] = 0.1 + rng.next() * 0.2;
        }
      }
      return m;
    }
  },
  {
    name: 'Kandinsky',
    emoji: '🔷',
    description: 'Geometric abstraction, concentric circles and lines',
    seed: 1911,
    typesCount: 6,
    config: {
      rmax: 0.25,
      force: 1.2,
      drag: 1.5,
      speedClamp: 0.08,
      entropy: 0.0,
    },
    matrixGen: (rng) => {
      const m = createMatrix(6);
      // Orbital patterns
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          const dist = Math.abs(i - j);
          m.attract[i][j] = dist === 1 ? 0.8 : dist === 2 ? -0.3 : 0.0;
          m.minR[i][j] = 0.05 + dist * 0.02;
          m.maxR[i][j] = 0.15 + dist * 0.03;
        }
      }
      return m;
    }
  },
  {
    name: 'Mondrian',
    emoji: '▪️',
    description: 'Grid structure, orthogonal constraints',
    seed: 1921,
    typesCount: 3,
    config: {
      rmax: 0.3,
      force: 0.8,
      drag: 2.0,
      speedClamp: 0.05,
      entropy: 0.0,
    },
    matrixGen: () => {
      const m = createMatrix(3);
      // Red, Blue, Yellow - structured
      m.attract[0][0] = -0.5; m.attract[0][1] = 0.3; m.attract[0][2] = 0.6;
      m.attract[1][0] = 0.6; m.attract[1][1] = -0.5; m.attract[1][2] = 0.3;
      m.attract[2][0] = 0.3; m.attract[2][1] = 0.6; m.attract[2][2] = -0.5;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          m.minR[i][j] = 0.08;
          m.maxR[i][j] = 0.25;
        }
      }
      return m;
    }
  },
  {
    name: 'Rothko',
    emoji: '🟧',
    description: 'Layered color fields, slow drift',
    seed: 1950,
    typesCount: 4,
    config: {
      rmax: 0.35,
      force: 0.5,
      drag: 2.5,
      speedClamp: 0.03,
      entropy: 0.02,
    },
    matrixGen: () => {
      const m = createMatrix(4);
      // All weakly attracted, forming layers
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          m.attract[i][j] = 0.2 + Math.abs(i - j) * 0.1;
          m.minR[i][j] = 0.15;
          m.maxR[i][j] = 0.35;
        }
      }
      return m;
    }
  },
  {
    name: 'Escher',
    emoji: '🔄',
    description: 'Tessellation loops, impossible rotations',
    seed: 1948,
    typesCount: 6,
    config: {
      rmax: 0.2,
      force: 1.5,
      drag: 1.1,
      speedClamp: 0.1,
      entropy: 0.0,
      circularDependency: 0.8, // Strong circular chase
    },
    matrixGen: () => {
      const m = createMatrix(6);
      // Circular chase: 0→1→2→3→4→5→0
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          if ((i + 1) % 6 === j) {
            m.attract[i][j] = 0.9; // Chase next
          } else if ((i + 5) % 6 === j) {
            m.attract[i][j] = -0.5; // Flee prev
          } else {
            m.attract[i][j] = 0.0;
          }
          m.minR[i][j] = 0.05;
          m.maxR[i][j] = 0.18;
        }
      }
      return m;
    }
  },

  // === BIOLOGY ===
  {
    name: 'Mitosis',
    emoji: '🧬',
    description: 'Cell division, splitting colonies',
    seed: 2001,
    typesCount: 4,
    config: {
      rmax: 0.2,
      force: 1.0,
      drag: 1.4,
      speedClamp: 0.07,
      entropy: 0.05,
      energyEnabled: true,
      energyDecay: 0.001,
      energyFeedRate: 0.08,
      energyReproThreshold: 2.5,
    },
    matrixGen: () => {
      const m = createMatrix(4);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          m.attract[i][j] = i === j ? 0.6 : -0.2; // Self-attract, repel others
          m.minR[i][j] = 0.04;
          m.maxR[i][j] = 0.15;
        }
      }
      return m;
    }
  },
  {
    name: 'Symbiosis',
    emoji: '🤝',
    description: 'Mutualism, species pairs help each other',
    seed: 1879,
    typesCount: 6,
    config: {
      rmax: 0.22,
      force: 1.3,
      drag: 1.3,
      speedClamp: 0.09,
      entropy: 0.03,
    },
    matrixGen: () => {
      const m = createMatrix(6);
      // Pairs: (0,1), (2,3), (4,5) are symbiotic
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          const partner = i % 2 === 0 ? i + 1 : i - 1;
          if (j === partner) {
            m.attract[i][j] = 0.8; // Strong mutual attraction
          } else if (i === j) {
            m.attract[i][j] = 0.3; // Weak cohesion
          } else {
            m.attract[i][j] = -0.1; // Slight repulsion
          }
          m.minR[i][j] = 0.05;
          m.maxR[i][j] = 0.2;
        }
      }
      return m;
    }
  },
  {
    name: 'Predators',
    emoji: '🦁',
    description: 'Apex hunters chase prey',
    seed: 1859,
    typesCount: 5,
    config: {
      rmax: 0.25,
      force: 2.2,
      drag: 0.9,
      speedClamp: 0.18,
      entropy: 0.1,
      foodEnabled: true,
      foodRatio: 0.2,
    },
    matrixGen: () => {
      const m = createMatrix(5);
      // Type 0 = apex, 1-3 = mid, 4 = prey
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          if (i < j) {
            m.attract[i][j] = 0.9; // Hunt weaker
          } else if (i > j) {
            m.attract[i][j] = -0.6; // Flee stronger
          } else {
            m.attract[i][j] = 0.2; // Pack
          }
          m.minR[i][j] = 0.06;
          m.maxR[i][j] = 0.22;
        }
      }
      return m;
    }
  },
  {
    name: 'Parasites',
    emoji: '🦠',
    description: 'Asymmetric exploitation',
    seed: 1676,
    typesCount: 4,
    config: {
      rmax: 0.18,
      force: 1.6,
      drag: 1.1,
      speedClamp: 0.12,
      entropy: 0.08,
    },
    matrixGen: () => {
      const m = createMatrix(4);
      // 0,1 = hosts, 2,3 = parasites
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (i < 2 && j >= 2) {
            m.attract[i][j] = -0.4; // Hosts flee parasites
          } else if (i >= 2 && j < 2) {
            m.attract[i][j] = 0.9; // Parasites chase hosts
          } else {
            m.attract[i][j] = i === j ? 0.5 : 0.0;
          }
          m.minR[i][j] = 0.04;
          m.maxR[i][j] = 0.16;
        }
      }
      return m;
    }
  },
  {
    name: 'Microbiome',
    emoji: '🦠',
    description: 'Dense microbial ecosystem',
    seed: 1683,
    typesCount: 12,
    config: {
      rmax: 0.15,
      force: 1.1,
      drag: 1.6,
      speedClamp: 0.06,
      entropy: 0.12,
    },
    matrixGen: (rng) => {
      const m = createMatrix(12);
      // Random but constrained: 30% positive, 20% negative, 50% neutral
      for (let i = 0; i < 12; i++) {
        for (let j = 0; j < 12; j++) {
          const r = rng.next();
          if (r < 0.3) m.attract[i][j] = rng.next() * 0.7;
          else if (r < 0.5) m.attract[i][j] = -rng.next() * 0.5;
          else m.attract[i][j] = 0.0;
          m.minR[i][j] = 0.03;
          m.maxR[i][j] = 0.12;
        }
      }
      return m;
    }
  },

  // === PHENOMENA ===
  {
    name: 'Revolution',
    emoji: '⚡',
    description: 'Sudden phase transition, cascading change',
    seed: 1789,
    typesCount: 5,
    config: {
      rmax: 0.24,
      force: 2.5,
      drag: 0.7,
      speedClamp: 0.2,
      entropy: 0.2,
    },
    matrixGen: () => {
      const m = createMatrix(5);
      // High energy, unstable
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          m.attract[i][j] = (i + j) % 2 === 0 ? 0.8 : -0.8; // Oscillating
          m.minR[i][j] = 0.07;
          m.maxR[i][j] = 0.2;
        }
      }
      return m;
    }
  },
  {
    name: 'Crystallization',
    emoji: '💎',
    description: 'Lattice formation, hexagonal order',
    seed: 1669,
    typesCount: 3,
    config: {
      rmax: 0.28,
      force: 0.9,
      drag: 2.2,
      speedClamp: 0.04,
      entropy: 0.0,
      beta: 0.15, // Tight core
    },
    matrixGen: () => {
      const m = createMatrix(3);
      // All types form crystal
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          m.attract[i][j] = 0.7;
          m.minR[i][j] = 0.12;
          m.maxR[i][j] = 0.28;
        }
      }
      return m;
    }
  },
  {
    name: 'Turbulence',
    emoji: '🌀',
    description: 'Chaotic vortices, eddies within eddies',
    seed: 1883,
    typesCount: 7,
    config: {
      rmax: 0.2,
      force: 1.8,
      drag: 0.85,
      speedClamp: 0.16,
      entropy: 0.18,
      circularDependency: 0.5,
    },
    matrixGen: (rng) => {
      const m = createMatrix(7);
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          m.attract[i][j] = rng.next() * 1.4 - 0.7; // High variance
          m.minR[i][j] = 0.04 + rng.next() * 0.04;
          m.maxR[i][j] = 0.12 + rng.next() * 0.08;
        }
      }
      return m;
    }
  },
  {
    name: 'Nebula',
    emoji: '🌌',
    description: 'Cosmic dust, slow gravitational collapse',
    seed: 1054,
    typesCount: 6,
    config: {
      rmax: 0.32,
      force: 0.6,
      drag: 1.9,
      speedClamp: 0.05,
      entropy: 0.04,
    },
    matrixGen: () => {
      const m = createMatrix(6);
      // Universal weak attraction (gravity)
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          m.attract[i][j] = 0.3;
          m.minR[i][j] = 0.15;
          m.maxR[i][j] = 0.32;
        }
      }
      return m;
    }
  },
  {
    name: 'Avalanche',
    emoji: '⛰️',
    description: 'Critical self-organized criticality',
    seed: 1987,
    typesCount: 4,
    config: {
      rmax: 0.22,
      force: 1.4,
      drag: 1.0,
      speedClamp: 0.11,
      entropy: 0.1,
    },
    matrixGen: () => {
      const m = createMatrix(4);
      // Chain reaction: 0→1→2→3, then 3 repels all
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (i === 3) {
            m.attract[i][j] = -0.9; // Type 3 explodes
          } else if (j === i + 1) {
            m.attract[i][j] = 0.8; // Trigger next
          } else {
            m.attract[i][j] = 0.1;
          }
          m.minR[i][j] = 0.05;
          m.maxR[i][j] = 0.18;
        }
      }
      return m;
    }
  },

  // === HYBRID / EXOTIC ===
  {
    name: 'Turing Patterns',
    emoji: '🐆',
    description: 'Reaction-diffusion stripes and spots',
    seed: 1952,
    typesCount: 2,
    config: {
      rmax: 0.26,
      force: 1.1,
      drag: 1.7,
      speedClamp: 0.07,
      entropy: 0.02,
      beta: 0.25,
    },
    matrixGen: () => {
      const m = createMatrix(2);
      // Activator-inhibitor
      m.attract[0][0] = 0.6; // Activator self-activates
      m.attract[0][1] = -0.4; // Activator repels inhibitor
      m.attract[1][0] = 0.7; // Inhibitor attracted to activator
      m.attract[1][1] = -0.3; // Inhibitor self-inhibits
      m.minR[0][0] = 0.08; m.maxR[0][0] = 0.15;
      m.minR[0][1] = 0.1; m.maxR[0][1] = 0.25;
      m.minR[1][0] = 0.12; m.maxR[1][0] = 0.26;
      m.minR[1][1] = 0.1; m.maxR[1][1] = 0.2;
      return m;
    }
  },
  {
    name: 'Quantum Foam',
    emoji: '⚛️',
    description: 'Virtual particles, uncertainty',
    seed: 1927,
    typesCount: 8,
    config: {
      rmax: 0.16,
      force: 2.0,
      drag: 0.9,
      speedClamp: 0.14,
      entropy: 0.25, // High entropy!
    },
    matrixGen: (rng) => {
      const m = createMatrix(8);
      // Completely random, high entropy
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          m.attract[i][j] = rng.next() * 2 - 1;
          m.minR[i][j] = rng.next() * 0.08;
          m.maxR[i][j] = 0.08 + rng.next() * 0.12;
        }
      }
      return m;
    }
  },
  {
    name: 'Membranes',
    emoji: '🫧',
    description: 'Lipid bilayers, enclosed spaces',
    seed: 1925,
    typesCount: 5,
    config: {
      rmax: 0.2,
      force: 1.3,
      drag: 1.4,
      speedClamp: 0.08,
      entropy: 0.04,
    },
    matrixGen: () => {
      const m = createMatrix(5);
      // Type 0 = hydrophobic tails, 1 = hydrophilic heads, 2-4 = interior
      m.attract[0][0] = 0.9; // Tails cluster
      m.attract[0][1] = -0.7; // Tails repel heads
      m.attract[1][0] = -0.7;
      m.attract[1][1] = 0.4; // Heads loosely cluster
      for (let i = 2; i < 5; i++) {
        m.attract[0][i] = -0.5; // Tails exclude interior
        m.attract[1][i] = 0.2; // Heads tolerate interior
        m.attract[i][0] = -0.5;
        m.attract[i][1] = 0.2;
        m.attract[i][i] = 0.1;
      }
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          m.minR[i][j] = 0.05;
          m.maxR[i][j] = 0.18;
        }
      }
      return m;
    }
  },
  {
    name: 'Neural Storm',
    emoji: '🧠',
    description: 'Spike trains, synaptic avalanches',
    seed: 1906,
    typesCount: 10,
    config: {
      rmax: 0.19,
      force: 1.7,
      drag: 1.1,
      speedClamp: 0.13,
      entropy: 0.14,
    },
    matrixGen: (rng) => {
      const m = createMatrix(10);
      // Small-world network: mostly weak, few strong
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if (Math.abs(i - j) <= 1) {
            m.attract[i][j] = 0.6 + rng.next() * 0.3; // Local strong
          } else if (rng.next() < 0.1) {
            m.attract[i][j] = 0.8; // Rare long-range
          } else {
            m.attract[i][j] = -0.1 + rng.next() * 0.2; // Weak
          }
          m.minR[i][j] = 0.04;
          m.maxR[i][j] = 0.15;
        }
      }
      return m;
    }
  },
  {
    name: 'Mythopoeia',
    emoji: '📜',
    description: 'Emergent narrative, archetypal dance',
    seed: 1954,
    typesCount: 7,
    config: {
      rmax: 0.23,
      force: 1.2,
      drag: 1.3,
      speedClamp: 0.09,
      entropy: 0.06,
      circularDependency: 0.4,
    },
    matrixGen: () => {
      const m = createMatrix(7);
      // Hero's journey: 0=hero, 1=mentor, 2=shadow, 3=threshold, 4=allies, 5=trickster, 6=return
      const roles = [
        [0.3, 0.7, -0.6, 0.5, 0.6, -0.3, 0.4], // Hero
        [0.7, 0.2, -0.4, 0.4, 0.5, 0.2, 0.6],  // Mentor
        [-0.8, -0.5, 0.5, 0.3, -0.7, 0.4, -0.6], // Shadow
        [0.4, 0.3, 0.2, 0.1, 0.3, 0.5, 0.7],    // Threshold
        [0.6, 0.4, -0.5, 0.2, 0.7, 0.3, 0.5],   // Allies
        [-0.2, 0.1, 0.3, 0.4, 0.2, 0.4, -0.3],  // Trickster
        [0.5, 0.6, -0.4, 0.6, 0.6, 0.2, 0.3],   // Return
      ];
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          m.attract[i][j] = roles[i][j];
          m.minR[i][j] = 0.06;
          m.maxR[i][j] = 0.2;
        }
      }
      return m;
    }
  },
  
  // === NEW: EVOLUTION ===
  {
    name: 'Darwin',
    emoji: '🧬',
    description: 'Evolução em ação: mutações, adaptação, seleção natural',
    seed: 1859,
    typesCount: 5,
    config: {
      rmax: 0.22,
      force: 1.6,
      drag: 1.1,
      speedClamp: 0.12,
      entropy: 0.08,
      energyEnabled: true,
      energyDecay: 0.003,
      metamorphosisEnabled: true,
      mutationRate: 0.002, // High mutation rate
      typeStability: 0.97, // Lower stability = more mutations
      beta: 0.35,
    },
    matrixGen: (rng) => {
      const m = createMatrix(5);
      // Evolution stages: 0=simple, 1=basic, 2=complex, 3=advanced, 4=apex
      // Lower types attracted to higher (evolution pressure)
      // Higher types avoid lower (de-evolution resistance)
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          if (j > i) {
            // Attracted to more evolved
            m.attract[i][j] = 0.3 + (j - i) * 0.15;
          } else if (j === i) {
            // Cohesion with same type
            m.attract[i][j] = 0.5;
          } else {
            // Avoid less evolved
            m.attract[i][j] = -0.2 - (i - j) * 0.1;
          }
          m.minR[i][j] = 0.05;
          m.maxR[i][j] = 0.18 + i * 0.02; // More evolved = larger range
        }
      }
      return m;
    }
  },
];

/**
 * Load a themed preset by index with its deterministic seed
 */
export const loadThemedPreset = (index: number): {
  preset: ThemedPreset;
  matrix: InteractionMatrix;
} => {
  const preset = themedPresets[index % themedPresets.length];
  const rng = seededRNG(preset.seed);
  const matrix = preset.matrixGen(rng);
  return { preset, matrix };
};
