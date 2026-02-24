// ── Music Lab — 16 Behavior Presets (movement only, no audio) ────────────────
// Each preset overrides PhysicsParams to produce a distinct emergent movement.
// motionStyle is included so applying a preset also switches the physics engine.

import type { MotionStyle, PhysicsParams } from './musicTypes';

export interface BehaviorPreset {
  id:          string;
  name:        string;
  icon:        string;   // unicode symbol
  color:       string;
  description: string;
  ref:         string;   // scientific / cultural reference
  motionStyle: MotionStyle;
  physics:     Partial<PhysicsParams>;
}

// ─────────────────────────────────────────────────────────────────────────────
export const BEHAVIOR_PRESETS: BehaviorPreset[] = [

  // 1 ── MURMURAÇÃO ─────────────────────────────────────────────────────────
  {
    id: 'murmuration', name: 'Murmuração', icon: '≋', color: '#88aaff',
    description: 'Estorninhos em ballet coletivo. Ondas de forma pura.',
    ref: 'Reynolds 1987 · Boids: sep + align + coesão',
    motionStyle: 'murmuration',
    physics: {
      cohesion: 0.90, separation: 0.70, alignment: 1.45,
      zoneRadius: 0.22, maxSpeed: 0.42, turbulence: 0.10,
      damping: 0.972, predatorPrey: false,
    },
  },

  // 2 ── CARDUME ─────────────────────────────────────────────────────────────
  {
    id: 'school', name: 'Cardume', icon: '≀', color: '#00ccff',
    description: 'Peixes em zonas: repulsão ➔ alinhamento ➔ atração.',
    ref: 'Couzin et al. 2002 · Zone model + preferred speed',
    motionStyle: 'school',
    physics: {
      cohesion: 1.40, separation: 1.85, alignment: 1.60,
      zoneRadius: 0.20, maxSpeed: 0.36, turbulence: 0.04,
      damping: 0.975, predatorPrey: false,
    },
  },

  // 3 ── GUERRA ──────────────────────────────────────────────────────────────
  {
    id: 'war', name: 'Guerra', icon: '⊕', color: '#ff3333',
    description: 'Dois exércitos. Pares impares perseguem; pares fogem.',
    ref: 'Schelling 1969 · Agent-based conflict models',
    motionStyle: 'war',
    physics: {
      cohesion: 1.80, separation: 2.00, polarize: 0.90,
      alignment: 0.35, zoneRadius: 0.26, maxSpeed: 0.56,
      turbulence: 0.28, predatorPrey: false,
    },
  },

  // 4 ── POLARIZAÇÃO ────────────────────────────────────────────────────────
  {
    id: 'polarization', name: 'Polarização', icon: '⊷', color: '#ff8800',
    description: 'Similares atraem, diferentes repelem. Dois pólos emergem.',
    ref: 'Deffuant-Weisbuch 2000 · Opinion dynamics',
    motionStyle: 'polarization',
    physics: {
      cohesion: 0.85, separation: 1.20, polarize: 0.95,
      zoneRadius: 0.28, maxSpeed: 0.26, turbulence: 0.08,
      alignment: 0.40, predatorPrey: false,
    },
  },

  // 5 ── REVOLUÇÃO ──────────────────────────────────────────────────────────
  {
    id: 'revolution', name: 'Revolução', icon: '⟳', color: '#cc44ff',
    description: 'Espiral que aperta. Alta carga ejeta para fora periodicamente.',
    ref: 'Lorenz attractor · Centripetal collapse + bifurcação',
    motionStyle: 'revolution',
    physics: {
      vortexForce: 0.18, cohesion: 0.65, separation: 0.80,
      burstRate: 0.45, maxSpeed: 0.50, turbulence: 0.15,
      alignment: 0.50, damping: 0.966,
    },
  },

  // 6 ── EXPLOSÃO ───────────────────────────────────────────────────────────
  {
    id: 'explosion', name: 'Explosão', icon: '✳', color: '#ff6600',
    description: 'Burst radial cíclico. Expande e reagrupa em ondas.',
    ref: 'Radial particle systems · Firework physics',
    motionStyle: 'explosion',
    physics: {
      burstRate: 0.70, cohesion: 1.20, separation: 1.05,
      maxSpeed: 0.62, turbulence: 0.22, vortexForce: 0.05,
      alignment: 0.20,
    },
  },

  // 7 ── CARNAVAL ───────────────────────────────────────────────────────────
  {
    id: 'carnival', name: 'Carnaval', icon: '◈', color: '#ffcc00',
    description: 'Três vórtices girantes em festa. Alta energia + ritmo.',
    ref: 'Multi-vortex flocking · Rotational attractors',
    motionStyle: 'carnival',
    physics: {
      vortexForce: 0.26, cohesion: 1.55, separation: 0.82,
      maxSpeed: 0.68, turbulence: 0.38, alignment: 0.55,
      clusterTarget: 8, burstRate: 0.40,
    },
  },

  // 8 ── JAZZ ───────────────────────────────────────────────────────────────
  {
    id: 'jazz', name: 'Jazz', icon: '≈', color: '#ff8844',
    description: 'Pequenos grupos formam, improvisam e dissolvem. Microclusters.',
    ref: 'Pressing 1988 · Improvisation: Methods and Models',
    motionStyle: 'jazz',
    physics: {
      cohesion: 2.10, separation: 1.55, clusterTarget: 4,
      maxSpeed: 0.32, turbulence: 0.48, mutationRate: 0.28,
      alignment: 0.65, zoneRadius: 0.16,
    },
  },

  // 9 ── ORGANISMO ───────────────────────────────────────────────────────────
  {
    id: 'organism', name: 'Organismo', icon: '⬡', color: '#44ff88',
    description: 'Massa celular respirando. Pressão interna + pulso de vida.',
    ref: 'Gray-Scott reaction-diffusion · Cellular automata pulse',
    motionStyle: 'organism',
    physics: {
      cohesion: 2.55, separation: 2.25, clusterTarget: 7,
      burstRate: 0.50, maxSpeed: 0.20, turbulence: 0.10,
      zoneRadius: 0.16, alignment: 0.80,
    },
  },

  // 10 ── ÊXODO ─────────────────────────────────────────────────────────────
  {
    id: 'exodus', name: 'Êxodo', icon: '⇥', color: '#88ff44',
    description: 'Migração em massa. Todos fugindo em formação coordenada.',
    ref: 'Evacuation models · Helbing 2000 · Panic dynamics',
    motionStyle: 'exodus',
    physics: {
      migrationX: 0.0, migrationY: -1.0, alignment: 1.25,
      cohesion: 0.55, separation: 0.82, maxSpeed: 0.52,
      turbulence: 0.12, zoneRadius: 0.20,
    },
  },

  // 11 ── DANÇA ─────────────────────────────────────────────────────────────
  {
    id: 'dance', name: 'Dança', icon: '⊗', color: '#ff88cc',
    description: 'Cada quanta orbita o seu par mais próximo. Waltz quântico.',
    ref: 'Two-body problem · Paired orbital mechanics',
    motionStyle: 'dance',
    physics: {
      cohesion: 2.20, separation: 1.45, clusterTarget: 2,
      vortexForce: 0.14, maxSpeed: 0.36, turbulence: 0.08,
      zoneRadius: 0.15, alignment: 0.35,
    },
  },

  // 12 ── CAOS ──────────────────────────────────────────────────────────────
  {
    id: 'chaos', name: 'Caos', icon: '⌀', color: '#ff0055',
    description: 'Entropia máxima. Movimento browniano com jolts aleatórios.',
    ref: 'Langevin dynamics · Boltzmann chaos · Maximum entropy',
    motionStyle: 'chaos',
    physics: {
      turbulence: 0.95, damping: 0.940, burstRate: 0.82,
      cohesion: 0.08, separation: 0.15, maxSpeed: 0.68,
      alignment: 0.00, polarize: 0.00,
    },
  },

  // 13 ── MEDITAÇÃO ─────────────────────────────────────────────────────────
  {
    id: 'meditation', name: 'Meditação', icon: '○', color: '#aaccff',
    description: 'Deriva ultralenta. Arcos harmônicos. Tempo quase parado.',
    ref: 'Hamiltonian slow manifold · Drift-diffusion at ε→0',
    motionStyle: 'meditation',
    physics: {
      cohesion: 0.40, separation: 0.52, maxSpeed: 0.07,
      turbulence: 0.04, damping: 0.988, alignment: 0.32,
      zoneRadius: 0.38, vortexForce: 0.025,
    },
  },

  // 14 ── MIGRAÇÃO ──────────────────────────────────────────────────────────
  {
    id: 'migration', name: 'Migração', icon: '⇢', color: '#ffee88',
    description: 'Formação migratória. Todos em direção, alinhados por vento.',
    ref: 'Aves migration theory · Aerodynamic drafting models',
    motionStyle: 'migration',
    physics: {
      migrationX: 0.0, migrationY: 1.0, alignment: 1.80,
      cohesion: 0.62, separation: 0.92, maxSpeed: 0.44,
      turbulence: 0.08, zoneRadius: 0.20,
    },
  },

  // 15 ── PREDAÇÃO ───────────────────────────────────────────────────────────
  {
    id: 'predation', name: 'Predação', icon: '◎', color: '#ff4422',
    description: 'Predadores e presas por role. Perseguição emergente.',
    ref: 'Lotka-Volterra · Role Matrix agent pursuit/flight',
    motionStyle: 'predation',
    physics: {
      predatorPrey: true, polarize: 0.72, cohesion: 1.05,
      separation: 1.42, maxSpeed: 0.52, turbulence: 0.18,
      alignment: 0.55, zoneRadius: 0.24,
    },
  },

  // 16 ── CÉLULAS ────────────────────────────────────────────────────────────
  {
    id: 'cells', name: 'Células', icon: '⬢', color: '#44ffcc',
    description: 'Grupos celulares respirando. Pressão → expansão → contração.',
    ref: 'CPM Cellular Potts Model · Glazier-Graner 1993',
    motionStyle: 'cells',
    physics: {
      cohesion: 3.00, separation: 2.82, clusterTarget: 5,
      burstRate: 0.42, maxSpeed: 0.16, turbulence: 0.12,
      zoneRadius: 0.12, alignment: 0.98,
    },
  },
];

// ── Lookups ───────────────────────────────────────────────────────────────────
export const BEHAVIOR_BY_ID: Record<string, BehaviorPreset> =
  Object.fromEntries(BEHAVIOR_PRESETS.map(b => [b.id, b]));

// Apply behavior preset to current physics (preserves fields not overridden)
export function applyBehaviorToPhysics(
  preset: BehaviorPreset,
  current: PhysicsParams,
): PhysicsParams {
  return { ...current, ...preset.physics, motionStyle: preset.motionStyle };
}
