// 80 Creative Presets - from abstract art to biological emergence
import { MicroConfig } from '../micro/microState';
import { FieldConfig } from '../field/fieldState';
import { ReconfigConfig } from '../reconfig/reconfigState';
import { InteractionMatrix } from '../micro/matrix';

export interface CreativePreset {
  id: string;
  name: string;
  description: string;
  category?: 'stable' | 'living' | 'wild' | 'art' | 'bio' | 'cosmos';
  tags?: string[];
  seed: number;
  particleCount: number;
  typesCount: number;
  micro: Partial<MicroConfig>;
  field: Partial<FieldConfig>;
  reconfig: Partial<ReconfigConfig>;
  matrix?: {
    style: 'pollock' | 'kandinsky' | 'mitosis' | 'predator' | 'symbiotic' | 'chaotic' | 'harmonic' | 'cyclic' | 'sparse' | 'block' | 'ring';
  };
}

// ─── 8 Featured Beta Presets ─────────────────────────────────────────────────
// Visually distinct, physics-grounded, guaranteed interesting behaviour.
export const FEATURED_PRESETS: CreativePreset[] = [
  // Stable Forms
  {
    id: 'crystal_lattice',
    name: 'Crystal Lattice',
    description: 'Grades periódicas cristalizam. Alta coesão, entropia zero.',
    category: 'stable', tags: ['crystal', 'stable', 'grid'],
    seed: 7777, particleCount: 600, typesCount: 3,
    micro: { force: 0.65, drag: 2.4, entropy: 0.0, rmax: 0.26, beta: 0.48, coreRepel: 1.2, speedClamp: 0.05 },
    field: { diffusionRate: 0.55, decayRate: 0.008 },
    reconfig: { detectionInterval: 6.0 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'orbital_dance',
    name: 'Orbital Dance',
    description: 'Clusters orbitam em ciclos estáveis. Dependência circular cria órbitas.',
    category: 'stable', tags: ['orbit', 'cyclic', 'rotation'],
    seed: 3141, particleCount: 500, typesCount: 4,
    micro: { force: 1.15, drag: 1.45, entropy: 0.04, rmax: 0.19, circularDependency: 0.65, speedClamp: 0.12 },
    field: { diffusionRate: 0.68, decayRate: 0.014 },
    reconfig: { detectionInterval: 4.5 },
    matrix: { style: 'ring' },
  },
  {
    id: 'membrane_world',
    name: 'Membrane World',
    description: 'Cascas celulares ocas colidem e fundem. Padrão biológico emergente.',
    category: 'stable', tags: ['membrane', 'shells', 'cell-like'],
    seed: 2718, particleCount: 550, typesCount: 4,
    micro: { force: 0.85, drag: 1.9, entropy: 0.02, rmax: 0.21, beta: 0.42, coreRepel: 0.95 },
    field: { diffusionRate: 0.62, decayRate: 0.011 },
    reconfig: { detectionInterval: 5.0 },
    matrix: { style: 'mitosis' },
  },
  // Living Systems
  {
    id: 'predator_wave',
    name: 'Predator Wave',
    description: 'Ondas ecológicas: populações oscilam em ciclos Lotka-Volterra.',
    category: 'living', tags: ['predator', 'prey', 'ecology', 'cycles'],
    seed: 2002, particleCount: 700, typesCount: 4,
    micro: { force: 1.45, drag: 1.05, entropy: 0.09, rmax: 0.20, foodEnabled: true, foodRatio: 0.22 },
    field: { diffusionRate: 0.78, decayRate: 0.020 },
    reconfig: { detectionInterval: 3.5 },
    matrix: { style: 'predator' },
  },
  {
    id: 'cell_division',
    name: 'Cell Division',
    description: 'Células com energia reproduzem por divisão. Observe a população crescer.',
    category: 'living', tags: ['mitosis', 'energy', 'reproduction', 'growth'],
    seed: 2001, particleCount: 200, typesCount: 3,
    micro: { force: 0.95, drag: 1.5, entropy: 0.02, rmax: 0.16,
      energyEnabled: true, energyDecay: 0.0008, energyFeedRate: 0.10, energyReproThreshold: 1.6 },
    field: { diffusionRate: 0.58, decayRate: 0.018 },
    reconfig: { detectionInterval: 3.0 },
    matrix: { style: 'mitosis' },
  },
  {
    id: 'symbiotic_web',
    name: 'Symbiotic Web',
    description: 'Espécies co-dependentes tecem redes de cooperação mútua.',
    category: 'living', tags: ['symbiosis', 'cooperation', 'clusters'],
    seed: 2003, particleCount: 600, typesCount: 5,
    micro: { force: 1.05, drag: 1.65, entropy: 0.03, rmax: 0.24, beta: 0.36 },
    field: { diffusionRate: 0.66, decayRate: 0.013 },
    reconfig: { detectionInterval: 4.5 },
    matrix: { style: 'symbiotic' },
  },
  // Wild / Oracle
  {
    id: 'spiral_galaxy',
    name: 'Spiral Galaxy',
    description: 'Braços espirais giram como uma galáxia. Dependência circular máxima.',
    category: 'wild', tags: ['spiral', 'galaxy', 'rotation'],
    seed: 9001, particleCount: 800, typesCount: 5,
    micro: { force: 1.25, drag: 1.20, entropy: 0.06, rmax: 0.22, circularDependency: 0.72 },
    field: { diffusionRate: 0.74, decayRate: 0.016 },
    reconfig: { detectionInterval: 4.0 },
    matrix: { style: 'cyclic' },
  },
  {
    id: 'reaction_diffusion',
    name: 'Reaction Diffusion',
    description: 'Padrões de Turing: ondas, manchas e listras auto-organizam.',
    category: 'wild', tags: ['turing', 'patterns', 'waves'],
    seed: 1618, particleCount: 750, typesCount: 2,
    micro: { force: 1.8, drag: 0.85, entropy: 0.28, rmax: 0.14, beta: 0.25, speedClamp: 0.18 },
    field: { diffusionRate: 0.92, decayRate: 0.030 },
    reconfig: { detectionInterval: 3.0 },
    matrix: { style: 'sparse' },
  },
];

export const CREATIVE_PRESETS: CreativePreset[] = [
  // Featured presets appear first
  ...FEATURED_PRESETS,
  // ═══════ ABSTRACT ART SERIES (8) ═══════
  {
    id: 'pollock',
    name: 'Pollock Drip',
    description: 'Chaotic splatter patterns, high entropy expressionism',
    seed: 1001,
    particleCount: 800,
    typesCount: 6,
    micro: { force: 2.0, drag: 0.8, entropy: 0.25, rmax: 0.18, speedClamp: 0.15 },
    field: { diffusionRate: 0.85, decayRate: 0.02 },
    reconfig: { detectionInterval: 4.0 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'kandinsky',
    name: 'Kandinsky Circles',
    description: 'Geometric balance, harmonic color orbits',
    seed: 1002,
    particleCount: 600,
    typesCount: 5,
    micro: { force: 1.2, drag: 1.5, entropy: 0.05, rmax: 0.25, beta: 0.4, coreRepel: 0.8 },
    field: { diffusionRate: 0.7, decayRate: 0.015 },
    reconfig: { detectionInterval: 5.0 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'mondrian',
    name: 'Mondrian Grid',
    description: 'Orthogonal structure, minimal palette',
    seed: 1003,
    particleCount: 400,
    typesCount: 3,
    micro: { force: 0.8, drag: 2.0, entropy: 0.0, rmax: 0.3, beta: 0.5 },
    field: { diffusionRate: 0.5, decayRate: 0.01 },
    reconfig: { detectionInterval: 6.0 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'miro',
    name: 'Miró Dream',
    description: 'Surreal slow drift, biomorphic shapes',
    seed: 1004,
    particleCount: 500,
    typesCount: 4,
    micro: { force: 0.6, drag: 1.8, entropy: 0.1, rmax: 0.22, circularDependency: 0.3 },
    field: { diffusionRate: 0.9, decayRate: 0.005 },
    reconfig: { detectionInterval: 5.5 },
    matrix: { style: 'symbiotic' },
  },
  {
    id: 'rothko',
    name: 'Rothko Fields',
    description: 'Color field meditation, soft boundaries',
    seed: 1005,
    particleCount: 350,
    typesCount: 3,
    micro: { force: 0.4, drag: 2.2, entropy: 0.02, rmax: 0.35, beta: 0.3 },
    field: { diffusionRate: 0.95, decayRate: 0.004 },
    reconfig: { detectionInterval: 7.0 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'klee',
    name: 'Klee Mosaic',
    description: 'Tiled patterns, playful geometry',
    seed: 1006,
    particleCount: 550,
    typesCount: 7,
    micro: { force: 1.0, drag: 1.6, entropy: 0.08, rmax: 0.2, beta: 0.4 },
    field: { diffusionRate: 0.72, decayRate: 0.016 },
    reconfig: { detectionInterval: 4.8 },
    matrix: { style: 'block' },
  },
  {
    id: 'malevich',
    name: 'Malevich Supremacy',
    description: 'Pure geometric abstraction, minimal forms',
    seed: 1007,
    particleCount: 300,
    typesCount: 2,
    micro: { force: 0.7, drag: 2.1, entropy: 0.0, rmax: 0.28, beta: 0.5 },
    field: { diffusionRate: 0.55, decayRate: 0.008 },
    reconfig: { detectionInterval: 8.0 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'dekooning',
    name: 'De Kooning Gesture',
    description: 'Violent brush strokes, abstract expressionism',
    seed: 1008,
    particleCount: 750,
    typesCount: 5,
    micro: { force: 2.3, drag: 0.85, entropy: 0.22, rmax: 0.16, speedClamp: 0.14 },
    field: { diffusionRate: 0.88, decayRate: 0.028 },
    reconfig: { detectionInterval: 3.5 },
    matrix: { style: 'chaotic' },
  },

  // ═══════ BIOLOGICAL SERIES (10) ═══════
  {
    id: 'mitosis',
    name: 'Mitosis',
    description: 'Cell division cascade, exponential growth',
    seed: 2001,
    particleCount: 200,
    typesCount: 3,
    micro: {
      force: 1.0, drag: 1.4, entropy: 0.02, rmax: 0.15,
      energyEnabled: true, energyDecay: 0.001, energyFeedRate: 0.08, energyReproThreshold: 1.8,
    },
    field: { diffusionRate: 0.6, decayRate: 0.02 },
    reconfig: { detectionInterval: 3.0 },
    matrix: { style: 'mitosis' },
  },
  {
    id: 'predator_prey',
    name: 'Predator-Prey',
    description: 'Ecological cycles, population waves',
    seed: 2002,
    particleCount: 700,
    typesCount: 4,
    micro: { force: 1.5, drag: 1.1, entropy: 0.08, rmax: 0.2, foodEnabled: true, foodRatio: 0.2 },
    field: { diffusionRate: 0.75, decayRate: 0.018 },
    reconfig: { detectionInterval: 3.5 },
    matrix: { style: 'predator' },
  },
  {
    id: 'symbiosis',
    name: 'Symbiosis',
    description: 'Mutual cooperation, stable clusters',
    seed: 2003,
    particleCount: 600,
    typesCount: 5,
    micro: { force: 1.1, drag: 1.6, entropy: 0.03, rmax: 0.24, beta: 0.35 },
    field: { diffusionRate: 0.65, decayRate: 0.012 },
    reconfig: { detectionInterval: 4.5 },
    matrix: { style: 'symbiotic' },
  },
  {
    id: 'parasitism',
    name: 'Parasitism',
    description: 'One-sided exploitation, chase dynamics',
    seed: 2004,
    particleCount: 800,
    typesCount: 6,
    micro: { force: 1.8, drag: 0.9, entropy: 0.12, rmax: 0.19, circularDependency: 0.5 },
    field: { diffusionRate: 0.8, decayRate: 0.025 },
    reconfig: { detectionInterval: 3.0 },
    matrix: { style: 'predator' },
  },
  {
    id: 'coral_reef',
    name: 'Coral Reef',
    description: 'Sessile organisms, branching structures',
    seed: 2005,
    particleCount: 650,
    typesCount: 6,
    micro: { force: 0.9, drag: 2.0, entropy: 0.04, rmax: 0.22, beta: 0.4 },
    field: { diffusionRate: 0.68, decayRate: 0.01 },
    reconfig: { detectionInterval: 5.2 },
    matrix: { style: 'symbiotic' },
  },
  {
    id: 'mycelium',
    name: 'Mycelium Network',
    description: 'Fungal threads, underground intelligence',
    seed: 2006,
    particleCount: 900,
    typesCount: 4,
    micro: { force: 0.7, drag: 1.8, entropy: 0.06, rmax: 0.28, circularDependency: 0.2 },
    field: { diffusionRate: 0.82, decayRate: 0.009 },
    reconfig: { detectionInterval: 4.8 },
    matrix: { style: 'sparse' },
  },
  {
    id: 'slime_mold',
    name: 'Slime Mold',
    description: 'Collective intelligence, path optimization',
    seed: 2007,
    particleCount: 750,
    typesCount: 3,
    micro: { force: 1.2, drag: 1.3, entropy: 0.07, rmax: 0.25, beta: 0.3 },
    field: { diffusionRate: 0.78, decayRate: 0.014 },
    reconfig: { detectionInterval: 4.2 },
    matrix: { style: 'symbiotic' },
  },
  {
    id: 'bacteria',
    name: 'Bacterial Colony',
    description: 'Rapid reproduction, biofilm formation',
    seed: 2008,
    particleCount: 1000,
    typesCount: 5,
    micro: {
      force: 1.3, drag: 1.0, entropy: 0.1, rmax: 0.18,
      energyEnabled: true, energyDecay: 0.002, energyFeedRate: 0.1, energyReproThreshold: 1.5,
    },
    field: { diffusionRate: 0.85, decayRate: 0.022 },
    reconfig: { detectionInterval: 2.8 },
    matrix: { style: 'mitosis' },
  },
  {
    id: 'virus',
    name: 'Viral Outbreak',
    description: 'Infection spread, exponential cascade',
    seed: 2009,
    particleCount: 500,
    typesCount: 4,
    micro: { force: 2.0, drag: 0.8, entropy: 0.15, rmax: 0.2, speedClamp: 0.16 },
    field: { diffusionRate: 0.9, decayRate: 0.03 },
    reconfig: { detectionInterval: 2.5 },
    matrix: { style: 'predator' },
  },
  {
    id: 'immune',
    name: 'Immune Response',
    description: 'White cells hunting pathogens',
    seed: 2010,
    particleCount: 800,
    typesCount: 6,
    micro: { force: 1.7, drag: 1.1, entropy: 0.09, rmax: 0.21 },
    field: { diffusionRate: 0.76, decayRate: 0.02 },
    reconfig: { detectionInterval: 3.3 },
    matrix: { style: 'predator' },
  },

  // ═══════ COSMIC SERIES (8) ═══════
  {
    id: 'nebula',
    name: 'Nebula',
    description: 'Gas cloud swirls, slow gravitational dance',
    seed: 3001,
    particleCount: 1000,
    typesCount: 4,
    micro: { force: 0.5, drag: 2.5, entropy: 0.15, rmax: 0.35, beta: 0.2, coreRepel: 0.3 },
    field: { diffusionRate: 0.95, decayRate: 0.003 },
    reconfig: { detectionInterval: 6.0 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'supernova',
    name: 'Supernova',
    description: 'Explosive expansion, shock waves',
    seed: 3002,
    particleCount: 600,
    typesCount: 5,
    micro: { force: 3.0, drag: 0.6, entropy: 0.3, rmax: 0.12, speedClamp: 0.2 },
    field: { diffusionRate: 0.92, decayRate: 0.04 },
    reconfig: { detectionInterval: 2.5 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'black_hole',
    name: 'Black Hole',
    description: 'Gravitational collapse, accretion disk',
    seed: 3003,
    particleCount: 700,
    typesCount: 3,
    micro: { force: 2.5, drag: 1.0, entropy: 0.05, rmax: 0.28, beta: 0.1, coreRepel: 2.0 },
    field: { diffusionRate: 0.6, decayRate: 0.008 },
    reconfig: { detectionInterval: 4.0 },
    matrix: { style: 'cyclic' },
  },
  {
    id: 'galaxy',
    name: 'Galaxy Spiral',
    description: 'Rotating arms, orbital mechanics',
    seed: 3004,
    particleCount: 900,
    typesCount: 6,
    micro: { force: 1.3, drag: 1.4, entropy: 0.07, rmax: 0.26, circularDependency: 0.7 },
    field: { diffusionRate: 0.7, decayRate: 0.01 },
    reconfig: { detectionInterval: 5.0 },
    matrix: { style: 'cyclic' },
  },
  {
    id: 'pulsar',
    name: 'Pulsar Beacon',
    description: 'Rhythmic pulses, radio waves',
    seed: 3005,
    particleCount: 450,
    typesCount: 3,
    micro: { force: 1.8, drag: 1.2, entropy: 0.12, rmax: 0.24, beta: 0.5 },
    field: { diffusionRate: 0.88, decayRate: 0.025 },
    reconfig: { detectionInterval: 3.2 },
    matrix: { style: 'ring' },
  },
  {
    id: 'quasar',
    name: 'Quasar Jet',
    description: 'High-energy beams, relativistic speeds',
    seed: 3006,
    particleCount: 550,
    typesCount: 4,
    micro: { force: 2.8, drag: 0.7, entropy: 0.2, rmax: 0.15, speedClamp: 0.18 },
    field: { diffusionRate: 0.9, decayRate: 0.035 },
    reconfig: { detectionInterval: 2.8 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'asteroid',
    name: 'Asteroid Belt',
    description: 'Orbital debris, collision dynamics',
    seed: 3007,
    particleCount: 800,
    typesCount: 5,
    micro: { force: 1.1, drag: 1.5, entropy: 0.11, rmax: 0.23 },
    field: { diffusionRate: 0.73, decayRate: 0.015 },
    reconfig: { detectionInterval: 4.5 },
    matrix: { style: 'sparse' },
  },
  {
    id: 'comet',
    name: 'Comet Tail',
    description: 'Solar wind trails, ice sublimation',
    seed: 3008,
    particleCount: 650,
    typesCount: 4,
    micro: { force: 1.6, drag: 1.0, entropy: 0.16, rmax: 0.2, speedClamp: 0.12 },
    field: { diffusionRate: 0.86, decayRate: 0.027 },
    reconfig: { detectionInterval: 3.6 },
    matrix: { style: 'chaotic' },
  },

  // ═══════ SOCIAL DYNAMICS (6) ═══════
  {
    id: 'revolution',
    name: 'Revolution',
    description: 'Uprising waves, regime change cycles',
    seed: 4001,
    particleCount: 800,
    typesCount: 5,
    micro: { force: 2.2, drag: 0.85, entropy: 0.18, rmax: 0.17, speedClamp: 0.12 },
    field: { diffusionRate: 0.88, decayRate: 0.03 },
    reconfig: { detectionInterval: 2.8, speciationThreshold: 0.6 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'harmony',
    name: 'Harmony',
    description: 'Peaceful coexistence, balanced equilibrium',
    seed: 4002,
    particleCount: 600,
    typesCount: 4,
    micro: { force: 0.9, drag: 1.7, entropy: 0.01, rmax: 0.27, beta: 0.4 },
    field: { diffusionRate: 0.65, decayRate: 0.01 },
    reconfig: { detectionInterval: 6.0 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'market',
    name: 'Market Chaos',
    description: 'Economic fluctuations, boom-bust cycles',
    seed: 4003,
    particleCount: 750,
    typesCount: 6,
    micro: { force: 1.6, drag: 1.0, entropy: 0.14, rmax: 0.21 },
    field: { diffusionRate: 0.78, decayRate: 0.022 },
    reconfig: { detectionInterval: 3.2 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'tribe',
    name: 'Tribal Clusters',
    description: 'Group formation, territorial boundaries',
    seed: 4004,
    particleCount: 700,
    typesCount: 5,
    micro: { force: 1.4, drag: 1.3, entropy: 0.06, rmax: 0.23, beta: 0.35, coreRepel: 1.2 },
    field: { diffusionRate: 0.68, decayRate: 0.015 },
    reconfig: { detectionInterval: 4.5 },
    matrix: { style: 'symbiotic' },
  },
  {
    id: 'propaganda',
    name: 'Propaganda Spread',
    description: 'Information cascade, viral memes',
    seed: 4005,
    particleCount: 850,
    typesCount: 4,
    micro: { force: 1.9, drag: 0.9, entropy: 0.17, rmax: 0.19 },
    field: { diffusionRate: 0.91, decayRate: 0.032 },
    reconfig: { detectionInterval: 2.9 },
    matrix: { style: 'predator' },
  },
  {
    id: 'migration',
    name: 'Migration',
    description: 'Mass movement, cultural diffusion',
    seed: 4006,
    particleCount: 700,
    typesCount: 5,
    micro: { force: 1.3, drag: 1.2, entropy: 0.1, rmax: 0.22 },
    field: { diffusionRate: 0.8, decayRate: 0.019 },
    reconfig: { detectionInterval: 3.8 },
    matrix: { style: 'chaotic' },
  },

  // ═══════ PHYSICS PHENOMENA (8) ═══════
  {
    id: 'quantum',
    name: 'Quantum Foam',
    description: 'Uncertainty principle, probabilistic motion',
    seed: 5001,
    particleCount: 500,
    typesCount: 7,
    micro: { force: 1.0, drag: 1.2, entropy: 0.35, rmax: 0.16, speedClamp: 0.08 },
    field: { diffusionRate: 0.92, decayRate: 0.035 },
    reconfig: { detectionInterval: 2.5 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'plasma',
    name: 'Plasma Storm',
    description: 'Ionized gas, electromagnetic chaos',
    seed: 5002,
    particleCount: 900,
    typesCount: 6,
    micro: { force: 2.1, drag: 0.8, entropy: 0.23, rmax: 0.17, speedClamp: 0.14 },
    field: { diffusionRate: 0.89, decayRate: 0.029 },
    reconfig: { detectionInterval: 3.0 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'superconductor',
    name: 'Superconductor',
    description: 'Zero resistance, perfect flow',
    seed: 5003,
    particleCount: 550,
    typesCount: 3,
    micro: { force: 1.5, drag: 0.1, entropy: 0.0, rmax: 0.26, beta: 0.5 },
    field: { diffusionRate: 0.98, decayRate: 0.001 },
    reconfig: { detectionInterval: 7.0 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'ferrofluid',
    name: 'Ferrofluid',
    description: 'Magnetic liquid, spike formations',
    seed: 5004,
    particleCount: 650,
    typesCount: 4,
    micro: { force: 1.4, drag: 1.4, entropy: 0.08, rmax: 0.21, coreRepel: 1.5 },
    field: { diffusionRate: 0.7, decayRate: 0.013 },
    reconfig: { detectionInterval: 4.0 },
    matrix: { style: 'block' },
  },
  {
    id: 'crystal',
    name: 'Crystal Growth',
    description: 'Lattice formation, periodic structure',
    seed: 5005,
    particleCount: 700,
    typesCount: 5,
    micro: { force: 1.0, drag: 1.9, entropy: 0.02, rmax: 0.24, beta: 0.45 },
    field: { diffusionRate: 0.62, decayRate: 0.008 },
    reconfig: { detectionInterval: 5.5 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'turbulence',
    name: 'Turbulence',
    description: 'Chaotic fluid flow, vortex cascade',
    seed: 5006,
    particleCount: 850,
    typesCount: 6,
    micro: { force: 1.8, drag: 0.95, entropy: 0.2, rmax: 0.19, circularDependency: 0.6 },
    field: { diffusionRate: 0.87, decayRate: 0.026 },
    reconfig: { detectionInterval: 3.1 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'bose_einstein',
    name: 'Bose-Einstein',
    description: 'Quantum condensate, collective state',
    seed: 5007,
    particleCount: 400,
    typesCount: 2,
    micro: { force: 0.6, drag: 2.3, entropy: 0.0, rmax: 0.32, beta: 0.5 },
    field: { diffusionRate: 0.97, decayRate: 0.002 },
    reconfig: { detectionInterval: 8.0 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'sonoluminescence',
    name: 'Sonoluminescence',
    description: 'Sound-to-light, bubble collapse',
    seed: 5008,
    particleCount: 550,
    typesCount: 4,
    micro: { force: 2.4, drag: 1.1, entropy: 0.13, rmax: 0.18, coreRepel: 1.8 },
    field: { diffusionRate: 0.84, decayRate: 0.024 },
    reconfig: { detectionInterval: 3.4 },
    matrix: { style: 'ring' },
  },

  // ═══════ EMERGENCE & COMPLEXITY (10) ═══════
  {
    id: 'fractal',
    name: 'Fractal Bloom',
    description: 'Self-similar patterns, recursive emergence',
    seed: 6001,
    particleCount: 650,
    typesCount: 5,
    micro: { force: 1.1, drag: 1.5, entropy: 0.04, rmax: 0.2, beta: 0.3 },
    field: { diffusionRate: 0.72, decayRate: 0.012 },
    reconfig: { detectionInterval: 4.0, speciationThreshold: 0.7 },
    matrix: { style: 'cyclic' },
  },
  {
    id: 'neural',
    name: 'Neural Net',
    description: 'Synaptic connections, learning dynamics',
    seed: 6002,
    particleCount: 800,
    typesCount: 6,
    micro: { force: 1.3, drag: 1.1, entropy: 0.09, rmax: 0.24, circularDependency: 0.4 },
    field: { diffusionRate: 0.75, decayRate: 0.018 },
    reconfig: { detectionInterval: 3.5 },
    matrix: { style: 'cyclic' },
  },
  {
    id: 'emergence',
    name: 'Pure Emergence',
    description: 'Minimal rules, maximum complexity',
    seed: 6003,
    particleCount: 700,
    typesCount: 4,
    micro: { force: 1.4, drag: 1.2, entropy: 0.11, rmax: 0.22 },
    field: { diffusionRate: 0.8, decayRate: 0.02 },
    reconfig: { detectionInterval: 3.8 },
    matrix: { style: 'symbiotic' },
  },
  {
    id: 'swarm',
    name: 'Swarm Intelligence',
    description: 'Collective behavior, stigmergy',
    seed: 6004,
    particleCount: 950,
    typesCount: 5,
    micro: { force: 1.2, drag: 1.3, entropy: 0.1, rmax: 0.21, circularDependency: 0.3 },
    field: { diffusionRate: 0.77, decayRate: 0.017 },
    reconfig: { detectionInterval: 3.9 },
    matrix: { style: 'symbiotic' },
  },
  {
    id: 'autopilot',
    name: 'Autopilot',
    description: 'Self-organization, spontaneous order',
    seed: 6005,
    particleCount: 600,
    typesCount: 4,
    micro: { force: 1.1, drag: 1.4, entropy: 0.06, rmax: 0.23, beta: 0.35 },
    field: { diffusionRate: 0.7, decayRate: 0.014 },
    reconfig: { detectionInterval: 4.3 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'cascade',
    name: 'Cascade',
    description: 'Chain reactions, avalanche dynamics',
    seed: 6006,
    particleCount: 750,
    typesCount: 6,
    micro: { force: 1.9, drag: 0.95, entropy: 0.16, rmax: 0.2 },
    field: { diffusionRate: 0.85, decayRate: 0.028 },
    reconfig: { detectionInterval: 2.9 },
    matrix: { style: 'predator' },
  },
  {
    id: 'attractor',
    name: 'Strange Attractor',
    description: 'Chaotic orbits, sensitive dependence',
    seed: 6007,
    particleCount: 550,
    typesCount: 5,
    micro: { force: 1.5, drag: 1.1, entropy: 0.19, rmax: 0.22, circularDependency: 0.8 },
    field: { diffusionRate: 0.82, decayRate: 0.021 },
    reconfig: { detectionInterval: 3.3 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'percolation',
    name: 'Percolation',
    description: 'Threshold transition, critical point',
    seed: 6008,
    particleCount: 650,
    typesCount: 4,
    micro: { force: 1.2, drag: 1.4, entropy: 0.12, rmax: 0.25 },
    field: { diffusionRate: 0.75, decayRate: 0.019 },
    reconfig: { detectionInterval: 3.7 },
    matrix: { style: 'sparse' },
  },
  {
    id: 'resonance',
    name: 'Resonance',
    description: 'Harmonic coupling, synchronized oscillation',
    seed: 6009,
    particleCount: 600,
    typesCount: 5,
    micro: { force: 1.1, drag: 1.5, entropy: 0.05, rmax: 0.24, beta: 0.4 },
    field: { diffusionRate: 0.71, decayRate: 0.013 },
    reconfig: { detectionInterval: 4.6 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'bifurcation',
    name: 'Bifurcation',
    description: 'Period doubling, route to chaos',
    seed: 6010,
    particleCount: 700,
    typesCount: 6,
    micro: { force: 1.6, drag: 1.0, entropy: 0.14, rmax: 0.21 },
    field: { diffusionRate: 0.79, decayRate: 0.023 },
    reconfig: { detectionInterval: 3.4 },
    matrix: { style: 'chaotic' },
  },

  // ═══════ NATURE & ELEMENTS (10) ═══════
  {
    id: 'aurora',
    name: 'Aurora Borealis',
    description: 'Magnetic curtains, solar wind dance',
    seed: 7001,
    particleCount: 750,
    typesCount: 5,
    micro: { force: 1.4, drag: 1.6, entropy: 0.11, rmax: 0.23, beta: 0.35 },
    field: { diffusionRate: 0.88, decayRate: 0.016 },
    reconfig: { detectionInterval: 4.2 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'volcano',
    name: 'Volcanic Eruption',
    description: 'Magma plumes, pyroclastic flow',
    seed: 7002,
    particleCount: 850,
    typesCount: 6,
    micro: { force: 2.1, drag: 0.9, entropy: 0.18, rmax: 0.19, speedClamp: 0.15 },
    field: { diffusionRate: 0.83, decayRate: 0.026 },
    reconfig: { detectionInterval: 3.1 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'tornado',
    name: 'Tornado Vortex',
    description: 'Spiral winds, destructive rotation',
    seed: 7003,
    particleCount: 700,
    typesCount: 4,
    micro: { force: 1.8, drag: 1.0, entropy: 0.13, rmax: 0.21, circularDependency: 0.9 },
    field: { diffusionRate: 0.81, decayRate: 0.023 },
    reconfig: { detectionInterval: 3.4 },
    matrix: { style: 'cyclic' },
  },
  {
    id: 'tsunami',
    name: 'Tsunami Wave',
    description: 'Tidal surge, underwater earthquake',
    seed: 7004,
    particleCount: 900,
    typesCount: 5,
    micro: { force: 1.6, drag: 1.3, entropy: 0.14, rmax: 0.22 },
    field: { diffusionRate: 0.86, decayRate: 0.021 },
    reconfig: { detectionInterval: 3.6 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'lightning',
    name: 'Lightning Storm',
    description: 'Electric discharge, fractal branching',
    seed: 7005,
    particleCount: 600,
    typesCount: 4,
    micro: { force: 2.3, drag: 0.8, entropy: 0.21, rmax: 0.17, speedClamp: 0.17 },
    field: { diffusionRate: 0.91, decayRate: 0.031 },
    reconfig: { detectionInterval: 2.7 },
    matrix: { style: 'sparse' },
  },
  {
    id: 'earthquake',
    name: 'Earthquake',
    description: 'Tectonic shift, seismic waves',
    seed: 7006,
    particleCount: 800,
    typesCount: 5,
    micro: { force: 1.9, drag: 1.1, entropy: 0.16, rmax: 0.2 },
    field: { diffusionRate: 0.79, decayRate: 0.024 },
    reconfig: { detectionInterval: 3.3 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'sandstorm',
    name: 'Sandstorm',
    description: 'Desert winds, dust devils',
    seed: 7007,
    particleCount: 950,
    typesCount: 6,
    micro: { force: 1.5, drag: 1.2, entropy: 0.19, rmax: 0.21 },
    field: { diffusionRate: 0.87, decayRate: 0.027 },
    reconfig: { detectionInterval: 3.2 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    description: 'Snow cascade, critical slope',
    seed: 7008,
    particleCount: 750,
    typesCount: 4,
    micro: { force: 1.7, drag: 1.0, entropy: 0.15, rmax: 0.22 },
    field: { diffusionRate: 0.82, decayRate: 0.025 },
    reconfig: { detectionInterval: 3.1 },
    matrix: { style: 'predator' },
  },
  {
    id: 'geyser',
    name: 'Geyser',
    description: 'Periodic eruption, hydrothermal pressure',
    seed: 7009,
    particleCount: 550,
    typesCount: 3,
    micro: { force: 2.2, drag: 1.0, entropy: 0.12, rmax: 0.19, coreRepel: 1.6 },
    field: { diffusionRate: 0.84, decayRate: 0.022 },
    reconfig: { detectionInterval: 3.5 },
    matrix: { style: 'ring' },
  },
  {
    id: 'wildfire',
    name: 'Wildfire',
    description: 'Forest blaze, exponential spread',
    seed: 7010,
    particleCount: 850,
    typesCount: 5,
    micro: { force: 1.8, drag: 0.95, entropy: 0.17, rmax: 0.2 },
    field: { diffusionRate: 0.89, decayRate: 0.029 },
    reconfig: { detectionInterval: 2.9 },
    matrix: { style: 'predator' },
  },

  // ═══════ MUSIC & SOUND (10) ═══════
  {
    id: 'symphony',
    name: 'Symphony',
    description: 'Orchestral harmony, multi-voice counterpoint',
    seed: 8001,
    particleCount: 800,
    typesCount: 7,
    micro: { force: 1.1, drag: 1.6, entropy: 0.04, rmax: 0.25, beta: 0.42 },
    field: { diffusionRate: 0.72, decayRate: 0.011 },
    reconfig: { detectionInterval: 5.0 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'jazz',
    name: 'Jazz Improvisation',
    description: 'Syncopated rhythms, spontaneous creation',
    seed: 8002,
    particleCount: 650,
    typesCount: 5,
    micro: { force: 1.4, drag: 1.2, entropy: 0.14, rmax: 0.22, circularDependency: 0.5 },
    field: { diffusionRate: 0.8, decayRate: 0.02 },
    reconfig: { detectionInterval: 3.7 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'techno',
    name: 'Techno Pulse',
    description: 'Repetitive beats, hypnotic loops',
    seed: 8003,
    particleCount: 700,
    typesCount: 4,
    micro: { force: 1.3, drag: 1.3, entropy: 0.08, rmax: 0.23, beta: 0.38 },
    field: { diffusionRate: 0.74, decayRate: 0.017 },
    reconfig: { detectionInterval: 4.1 },
    matrix: { style: 'cyclic' },
  },
  {
    id: 'ambient',
    name: 'Ambient Drift',
    description: 'Atmospheric textures, slow evolution',
    seed: 8004,
    particleCount: 500,
    typesCount: 3,
    micro: { force: 0.7, drag: 2.1, entropy: 0.06, rmax: 0.29, beta: 0.3 },
    field: { diffusionRate: 0.93, decayRate: 0.006 },
    reconfig: { detectionInterval: 6.5 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'drum_circle',
    name: 'Drum Circle',
    description: 'Polyrhythms, tribal synchronization',
    seed: 8005,
    particleCount: 750,
    typesCount: 6,
    micro: { force: 1.5, drag: 1.1, entropy: 0.1, rmax: 0.21 },
    field: { diffusionRate: 0.77, decayRate: 0.019 },
    reconfig: { detectionInterval: 3.8 },
    matrix: { style: 'ring' },
  },
  {
    id: 'glitch',
    name: 'Glitch',
    description: 'Digital artifacts, broken transmission',
    seed: 8006,
    particleCount: 600,
    typesCount: 5,
    micro: { force: 1.6, drag: 1.0, entropy: 0.26, rmax: 0.18, speedClamp: 0.11 },
    field: { diffusionRate: 0.85, decayRate: 0.028 },
    reconfig: { detectionInterval: 2.8 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'dubstep',
    name: 'Dubstep Drop',
    description: 'Bass wobbles, half-time breaks',
    seed: 8007,
    particleCount: 700,
    typesCount: 5,
    micro: { force: 1.9, drag: 0.95, entropy: 0.15, rmax: 0.2, coreRepel: 1.3 },
    field: { diffusionRate: 0.83, decayRate: 0.024 },
    reconfig: { detectionInterval: 3.3 },
    matrix: { style: 'block' },
  },
  {
    id: 'choir',
    name: 'Choir',
    description: 'Vocal harmonics, layered voices',
    seed: 8008,
    particleCount: 650,
    typesCount: 6,
    micro: { force: 1.0, drag: 1.7, entropy: 0.03, rmax: 0.26, beta: 0.45 },
    field: { diffusionRate: 0.68, decayRate: 0.012 },
    reconfig: { detectionInterval: 5.2 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'metal',
    name: 'Metal Blast',
    description: 'Distorted power, aggressive energy',
    seed: 8009,
    particleCount: 800,
    typesCount: 6,
    micro: { force: 2.0, drag: 0.85, entropy: 0.2, rmax: 0.18, speedClamp: 0.13 },
    field: { diffusionRate: 0.86, decayRate: 0.027 },
    reconfig: { detectionInterval: 3.0 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'binaural',
    name: 'Binaural Beats',
    description: 'Phase interference, brain entrainment',
    seed: 8010,
    particleCount: 550,
    typesCount: 4,
    micro: { force: 1.2, drag: 1.5, entropy: 0.07, rmax: 0.24, beta: 0.4 },
    field: { diffusionRate: 0.75, decayRate: 0.014 },
    reconfig: { detectionInterval: 4.4 },
    matrix: { style: 'harmonic' },
  },

  // ═══════ ABSTRACT MASTERS (10) ═══════
  {
    id: 'hilma_af_klint',
    name: 'Hilma af Klint',
    description: 'Spiritual geometry, theosophical abstraction',
    seed: 9001,
    particleCount: 650,
    typesCount: 5,
    micro: { force: 1.0, drag: 1.7, entropy: 0.03, rmax: 0.26, beta: 0.42, circularDependency: 0.4 },
    field: { diffusionRate: 0.68, decayRate: 0.009 },
    reconfig: { detectionInterval: 5.5 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'agnes_martin',
    name: 'Agnes Martin',
    description: 'Minimal grids, meditative repetition',
    seed: 9002,
    particleCount: 400,
    typesCount: 3,
    micro: { force: 0.65, drag: 2.2, entropy: 0.01, rmax: 0.3, beta: 0.5 },
    field: { diffusionRate: 0.55, decayRate: 0.006 },
    reconfig: { detectionInterval: 7.5 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'cy_twombly',
    name: 'Cy Twombly',
    description: 'Calligraphic gestures, scratched surfaces',
    seed: 9003,
    particleCount: 700,
    typesCount: 6,
    micro: { force: 1.6, drag: 1.0, entropy: 0.18, rmax: 0.19, speedClamp: 0.13 },
    field: { diffusionRate: 0.85, decayRate: 0.024 },
    reconfig: { detectionInterval: 3.4 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'yayoi_kusama',
    name: 'Yayoi Kusama',
    description: 'Infinity nets, obsessive dots',
    seed: 9004,
    particleCount: 900,
    typesCount: 7,
    micro: { force: 1.1, drag: 1.6, entropy: 0.06, rmax: 0.22, beta: 0.35 },
    field: { diffusionRate: 0.72, decayRate: 0.012 },
    reconfig: { detectionInterval: 4.6 },
    matrix: { style: 'block' },
  },
  {
    id: 'gerhard_richter',
    name: 'Gerhard Richter',
    description: 'Squeegee abstraction, color blur',
    seed: 9005,
    particleCount: 750,
    typesCount: 6,
    micro: { force: 1.4, drag: 1.3, entropy: 0.12, rmax: 0.21, beta: 0.3 },
    field: { diffusionRate: 0.88, decayRate: 0.018 },
    reconfig: { detectionInterval: 4.0 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'kazimir_malevich_black',
    name: 'Malevich Black Square',
    description: 'Ultimate reduction, void suprematism',
    seed: 9006,
    particleCount: 250,
    typesCount: 2,
    micro: { force: 0.5, drag: 2.4, entropy: 0.0, rmax: 0.32, beta: 0.5 },
    field: { diffusionRate: 0.5, decayRate: 0.005 },
    reconfig: { detectionInterval: 9.0 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'bridget_riley',
    name: 'Bridget Riley',
    description: 'Op art waves, optical vibration',
    seed: 9007,
    particleCount: 600,
    typesCount: 4,
    micro: { force: 1.3, drag: 1.4, entropy: 0.05, rmax: 0.23, beta: 0.45, circularDependency: 0.6 },
    field: { diffusionRate: 0.7, decayRate: 0.013 },
    reconfig: { detectionInterval: 4.8 },
    matrix: { style: 'cyclic' },
  },
  {
    id: 'franz_kline',
    name: 'Franz Kline',
    description: 'Bold black strokes, architectural gesture',
    seed: 9008,
    particleCount: 550,
    typesCount: 3,
    micro: { force: 2.1, drag: 0.9, entropy: 0.15, rmax: 0.18, speedClamp: 0.14 },
    field: { diffusionRate: 0.82, decayRate: 0.026 },
    reconfig: { detectionInterval: 3.2 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'ellsworth_kelly',
    name: 'Ellsworth Kelly',
    description: 'Hard edge color fields, pure shape',
    seed: 9009,
    particleCount: 450,
    typesCount: 4,
    micro: { force: 0.8, drag: 1.9, entropy: 0.02, rmax: 0.28, beta: 0.48 },
    field: { diffusionRate: 0.6, decayRate: 0.008 },
    reconfig: { detectionInterval: 6.2 },
    matrix: { style: 'block' },
  },
  {
    id: 'robert_motherwell',
    name: 'Robert Motherwell',
    description: 'Spanish elegies, existential abstraction',
    seed: 9010,
    particleCount: 650,
    typesCount: 5,
    micro: { force: 1.5, drag: 1.2, entropy: 0.1, rmax: 0.22, beta: 0.35 },
    field: { diffusionRate: 0.78, decayRate: 0.017 },
    reconfig: { detectionInterval: 4.2 },
    matrix: { style: 'harmonic' },
  },

  // ═══════ ARCHETYPES & SIGILS SERIES (10) - PATCH 04.3 ═══════
  // Presets designed to maximize archetype emergence and sigil visualization
  {
    id: 'bond_sigil',
    name: '✶ Bond Archetype',
    description: 'Cohesive attraction sigils, stable species bonds',
    seed: 9101,
    particleCount: 600,
    typesCount: 4,
    micro: { 
      force: 1.2, 
      drag: 1.4, 
      entropy: 0.15, // Medium entropy for sigil generation
      rmax: 0.22, 
      beta: 0.35,
      metamorphosisEnabled: true,
      mutationRate: 0.002,
    },
    field: { diffusionRate: 0.75, decayRate: 0.015 },
    reconfig: { detectionInterval: 3.5, speciationThreshold: 0.65 },
    matrix: { style: 'symbiotic' },
  },
  {
    id: 'rift_sigil',
    name: '⨯ Rift Archetype',
    description: 'Conflict repulsion sigils, fractured territories',
    seed: 9102,
    particleCount: 700,
    typesCount: 5,
    micro: { 
      force: 1.6, 
      drag: 1.1, 
      entropy: 0.18,
      rmax: 0.2, 
      beta: 0.25,
      metamorphosisEnabled: true,
      mutationRate: 0.0025,
    },
    field: { diffusionRate: 0.8, decayRate: 0.02 },
    reconfig: { detectionInterval: 3.0, speciationThreshold: 0.7 },
    matrix: { style: 'predator' },
  },
  {
    id: 'bloom_sigil',
    name: '⚘ Bloom Archetype',
    description: 'Growth and feeding sigils, flourishing populations',
    seed: 9103,
    particleCount: 550,
    typesCount: 4,
    micro: { 
      force: 1.1, 
      drag: 1.5, 
      entropy: 0.12,
      rmax: 0.24, 
      beta: 0.38,
      foodEnabled: true,
      foodRatio: 0.25,
      metamorphosisEnabled: true,
      mutationRate: 0.0018,
    },
    field: { diffusionRate: 0.7, decayRate: 0.012 },
    reconfig: { detectionInterval: 4.0, speciationThreshold: 0.6 },
    matrix: { style: 'symbiotic' },
  },
  {
    id: 'oath_sigil',
    name: '⌬ Oath Archetype',
    description: 'Ritual path sigils, cyclic ceremonies',
    seed: 9104,
    particleCount: 650,
    typesCount: 5,
    micro: { 
      force: 1.3, 
      drag: 1.3, 
      entropy: 0.16,
      rmax: 0.23, 
      beta: 0.4,
      circularDependency: 0.5,
      metamorphosisEnabled: true,
      mutationRate: 0.002,
    },
    field: { diffusionRate: 0.73, decayRate: 0.016 },
    reconfig: { detectionInterval: 3.8, speciationThreshold: 0.68 },
    matrix: { style: 'cyclic' },
  },
  {
    id: 'genesis_sigils',
    name: '⟡ Genesis Sigils',
    description: 'All sigils emerge together, primordial chaos',
    seed: 9105,
    particleCount: 750,
    typesCount: 6,
    micro: { 
      force: 1.4, 
      drag: 1.2, 
      entropy: 0.20, // High entropy = all sigils active
      rmax: 0.21, 
      beta: 0.32,
      metamorphosisEnabled: true,
      mutationRate: 0.003,
    },
    field: { diffusionRate: 0.82, decayRate: 0.018 },
    reconfig: { detectionInterval: 3.2, speciationThreshold: 0.72 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'symbiotic_sigils',
    name: '✹ Symbiotic Archetypes',
    description: 'Mutual bond sigils, cooperative species emergence',
    seed: 9106,
    particleCount: 600,
    typesCount: 5,
    micro: { 
      force: 1.0, 
      drag: 1.6, 
      entropy: 0.14,
      rmax: 0.25, 
      beta: 0.36,
      circularDependency: 0.3,
      metamorphosisEnabled: true,
      mutationRate: 0.0015,
    },
    field: { diffusionRate: 0.68, decayRate: 0.013 },
    reconfig: { detectionInterval: 4.5, speciationThreshold: 0.62 },
    matrix: { style: 'symbiotic' },
  },
  {
    id: 'warring_sigils',
    name: '⛧ Warring Archetypes',
    description: 'Rift-dominated sigils, eternal conflicts between species',
    seed: 9107,
    particleCount: 800,
    typesCount: 6,
    micro: { 
      force: 1.7, 
      drag: 1.0, 
      entropy: 0.19,
      rmax: 0.19, 
      beta: 0.28,
      metamorphosisEnabled: true,
      mutationRate: 0.0028,
    },
    field: { diffusionRate: 0.85, decayRate: 0.022 },
    reconfig: { detectionInterval: 2.9, speciationThreshold: 0.74 },
    matrix: { style: 'predator' },
  },
  {
    id: 'harmonic_sigils',
    name: '⍟ Harmonic Archetypes',
    description: 'Resonant sigils, species in perfect balance',
    seed: 9108,
    particleCount: 500,
    typesCount: 4,
    micro: { 
      force: 0.9, 
      drag: 1.7, 
      entropy: 0.08,
      rmax: 0.26, 
      beta: 0.42,
      metamorphosisEnabled: true,
      mutationRate: 0.001,
    },
    field: { diffusionRate: 0.65, decayRate: 0.01 },
    reconfig: { detectionInterval: 5.0, speciationThreshold: 0.58 },
    matrix: { style: 'harmonic' },
  },
  {
    id: 'cascade_sigils',
    name: '⚚ Cascade Archetypes',
    description: 'Chain-reaction sigils, avalanche of new species',
    seed: 9109,
    particleCount: 700,
    typesCount: 5,
    micro: { 
      force: 1.5, 
      drag: 1.1, 
      entropy: 0.22, // Very high entropy = rapid sigil formation
      rmax: 0.2, 
      beta: 0.3,
      metamorphosisEnabled: true,
      mutationRate: 0.0032,
    },
    field: { diffusionRate: 0.88, decayRate: 0.024 },
    reconfig: { detectionInterval: 2.7, speciationThreshold: 0.76 },
    matrix: { style: 'chaotic' },
  },
  {
    id: 'eternal_sigils',
    name: '☍ Eternal Archetypes',
    description: 'Persistent sigils, ancient species that never fade',
    seed: 9110,
    particleCount: 450,
    typesCount: 3,
    micro: { 
      force: 0.8, 
      drag: 1.9, 
      entropy: 0.06, // Low entropy = stable long-lasting sigils
      rmax: 0.28, 
      beta: 0.45,
      metamorphosisEnabled: true,
      mutationRate: 0.0008,
    },
    field: { diffusionRate: 0.62, decayRate: 0.008 },
    reconfig: { detectionInterval: 5.5, speciationThreshold: 0.55 },
    matrix: { style: 'harmonic' },
  },
];

/**
 * Generate matrix based on style for a preset
 */
export const generatePresetMatrix = (
  style: string,
  typesCount: number,
  rng: { next: () => number },
  rmax: number = 0.2
): InteractionMatrix => {
  const S = typesCount;
  const attract: number[][] = [];
  const radius: number[][] = [];
  const falloff: number[][] = [];
  
  for (let i = 0; i < S; i++) {
    attract[i] = new Array(S);
    radius[i] = new Array(S);
    falloff[i] = new Array(S);
  }

  switch (style) {
    case 'pollock':
    case 'chaotic':
      // High variance, unpredictable
      for (let i = 0; i < S; i++) {
        for (let j = 0; j < S; j++) {
          attract[i][j] = rng.next() * 2 - 1; // -1 to 1
          radius[i][j] = rmax * (0.8 + rng.next() * 0.4);
          falloff[i][j] = 0.5 + rng.next() * 1.5;
        }
      }
      break;

    case 'kandinsky':
    case 'harmonic':
      // Balanced, symmetric patterns
      for (let i = 0; i < S; i++) {
        for (let j = 0; j < S; j++) {
          const phase = (i - j) / S * Math.PI * 2;
          attract[i][j] = Math.cos(phase) * 0.8;
          radius[i][j] = rmax * (1.0 + Math.abs(Math.sin(phase)) * 0.2);
          falloff[i][j] = 1.0;
        }
      }
      break;

    case 'mitosis':
      // Same type attracts, different types repel
      for (let i = 0; i < S; i++) {
        for (let j = 0; j < S; j++) {
          if (i === j) {
            attract[i][j] = 0.7;
            radius[i][j] = rmax * 1.2;
            falloff[i][j] = 0.8;
          } else {
            attract[i][j] = -0.5;
            radius[i][j] = rmax * 0.8;
            falloff[i][j] = 1.2;
          }
        }
      }
      break;

    case 'predator':
      // Asymmetric chase patterns
      for (let i = 0; i < S; i++) {
        const prey = (i + 1) % S;
        const predator = (i - 1 + S) % S;
        for (let j = 0; j < S; j++) {
          if (j === prey) {
            attract[i][j] = 0.9; // Chase prey
            radius[i][j] = rmax * 1.3;
            falloff[i][j] = 0.7;
          } else if (j === predator) {
            attract[i][j] = -0.8; // Flee predator
            radius[i][j] = rmax * 1.1;
            falloff[i][j] = 1.5;
          } else {
            attract[i][j] = (rng.next() - 0.5) * 0.4;
            radius[i][j] = rmax;
            falloff[i][j] = 1.0;
          }
        }
      }
      break;

    case 'symbiotic':
      // Mutual cooperation
      for (let i = 0; i < S; i++) {
        for (let j = 0; j < S; j++) {
          const dist = Math.min(Math.abs(i - j), S - Math.abs(i - j));
          attract[i][j] = 0.6 - dist * 0.2;
          radius[i][j] = rmax * (0.9 + dist * 0.1);
          falloff[i][j] = 0.8 + dist * 0.1;
        }
      }
      break;

    case 'cyclic':
      // Circular dependency (rock-paper-scissors)
      for (let i = 0; i < S; i++) {
        for (let j = 0; j < S; j++) {
          const diff = (j - i + S) % S;
          if (diff === 1) {
            attract[i][j] = 0.8; // Chase next
            radius[i][j] = rmax * 1.2;
            falloff[i][j] = 0.9;
          } else if (diff === S - 1) {
            attract[i][j] = -0.7; // Flee previous
            radius[i][j] = rmax * 1.1;
            falloff[i][j] = 1.3;
          } else {
            attract[i][j] = (rng.next() - 0.5) * 0.3;
            radius[i][j] = rmax;
            falloff[i][j] = 1.0;
          }
        }
      }
      break;

    case 'sparse':
      // Sparse connections, few strong bonds
      for (let i = 0; i < S; i++) {
        for (let j = 0; j < S; j++) {
          if (rng.next() < 0.3) { // 30% chance of connection
            attract[i][j] = (rng.next() * 1.6 - 0.3); // -0.3 to 1.3
            radius[i][j] = rmax * (1.0 + rng.next() * 0.5);
            falloff[i][j] = 0.6 + rng.next() * 0.8;
          } else {
            attract[i][j] = (rng.next() - 0.5) * 0.2;
            radius[i][j] = rmax * 0.9;
            falloff[i][j] = 1.2;
          }
        }
      }
      break;

    case 'block':
      // Block diagonal, clusters of types
      for (let i = 0; i < S; i++) {
        for (let j = 0; j < S; j++) {
          const blockI = Math.floor(i / (S / 3));
          const blockJ = Math.floor(j / (S / 3));
          if (blockI === blockJ) {
            attract[i][j] = 0.5 + rng.next() * 0.4;
            radius[i][j] = rmax * 1.1;
            falloff[i][j] = 0.9;
          } else {
            attract[i][j] = -0.3 + rng.next() * 0.2;
            radius[i][j] = rmax * 0.9;
            falloff[i][j] = 1.1;
          }
        }
      }
      break;

    case 'ring':
      // Ring topology, circular interactions
      for (let i = 0; i < S; i++) {
        for (let j = 0; j < S; j++) {
          const dist = Math.min(Math.abs(i - j), S - Math.abs(i - j));
          if (dist <= 1) {
            attract[i][j] = 0.7;
            radius[i][j] = rmax * 1.2;
            falloff[i][j] = 0.8;
          } else if (dist === Math.floor(S / 2)) {
            attract[i][j] = -0.6; // Opposite repel
            radius[i][j] = rmax * 1.0;
            falloff[i][j] = 1.4;
          } else {
            attract[i][j] = (rng.next() - 0.5) * 0.3;
            radius[i][j] = rmax;
            falloff[i][j] = 1.0;
          }
        }
      }
      break;

    default:
      // Random fallback
      for (let i = 0; i < S; i++) {
        for (let j = 0; j < S; j++) {
          attract[i][j] = rng.next() * 2 - 1;
          radius[i][j] = rmax * (0.8 + rng.next() * 0.4);
          falloff[i][j] = 0.5 + rng.next() * 1.5;
        }
      }
  }

  return { attract, radius, falloff };
};
