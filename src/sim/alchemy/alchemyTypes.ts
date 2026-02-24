// ── Alchemy Lab — Core Types v2 ───────────────────────────────────────────────
// Hermetic correspondences:
// C = Prima Materia / charge field
// A = Coagulatio / affinity / binding
// S = Separatio / stress / putrefaction
// Elements → physics operators, not decoration

export type AlchemyElement  = 'earth' | 'water' | 'air' | 'fire';
export type OpusPhase       = 'NIGREDO' | 'ALBEDO' | 'CITRINITAS' | 'RUBEDO';
export type LapisState      = 'DORMANT' | 'FORMING' | 'FORGED' | 'CRACKED';
export type AlchemyEvent    = 'BURNOUT' | 'CRYSTALLIZATION' | 'DISSOLUTION' | 'NOISE';
export type AlchemyLens     = 'SIGIL' | 'FIELD' | 'EVENTS' | 'LAPIS';
export type AlchOp          = 'NONE' | 'SOLVE' | 'COAGULA';
export type BarType         = 'attractor' | 'repulsor' | 'channel' | 'barrier' | 'tunnel';

import { SubstanceType, TransmutationState } from './alchemyTransmutation';
export type { SubstanceType, TransmutationState };

// ── Element mix ───────────────────────────────────────────────────────────────
export interface ElementMix {
  earth: number;
  water: number;
  air:   number;
  fire:  number;
}
export const DEFAULT_MIX: ElementMix = { earth:.25, water:.25, air:.25, fire:.25 };

// ── Derived physics ───────────────────────────────────────────────────────────
export interface AlchemyPhysics {
  diffusion:    number;
  decay:        number;
  globalMix:    number;
  writeGain:    number;
  cohesion:     number;
  maxSpeed:     number;
  springStr:    number;
  mutationRate: number;
  thresholds:   number;
  breathStr:    number;
  heat:         number;
  transformRate:number;
  tunnelProb:   number;  // 0..1 quantum tunneling base probability
}

// ── Agent ─────────────────────────────────────────────────────────────────────
export interface AlchemyAgent {
  id:        number;
  x:         number;    // 0..1
  y:         number;
  vx:        number;
  vy:        number;
  charge:    number;    // 0..1 prima materia
  coherence: number;    // 0..1
  valence:   number;    // -1..1
  element:   AlchemyElement;
  substance: SubstanceType;  // ✦ material state for transmutation
  phase:     number;    // 0..1
  age:       number;
  linkId:    number;
  linkTtl:   number;
  tunneling: boolean;   // currently tunneling through a barrier
}

// ── Field grid ────────────────────────────────────────────────────────────────
export const FIELD_SIZE = 64;
export interface FieldGrid {
  C: Float32Array;
  A: Float32Array;
  S: Float32Array;
}

// ── Metrics ───────────────────────────────────────────────────────────────────
export interface AlchemyMetrics {
  integrationIndex: number;
  tensionIndex:     number;
  noveltyIndex:     number;
  lapisCharge:      number;
  meanCharge:       number;
}

// ── Glyph spec ────────────────────────────────────────────────────────────────
export interface GlyphSpec {
  outerR:    number;
  rings:     number;
  segments:  number;
  notches:   number;
  hue:       number;
  brightness:number;
  cracked:   boolean;
  phase:     OpusPhase | null;
}

// ── Grimoire entry ─────────────────────────────────────────────────────────────
export interface GrimoireEntry {
  id:           number;
  timestamp:    number;
  text:         string;
  causalLine:   string;
  phase:        OpusPhase | null;
  event:        AlchemyEvent | null;
  tags:         string[];
  elements:     ElementMix;
  metrics:      AlchemyMetrics;
  glyphSpec:    GlyphSpec;
  bookmarked:   boolean;
}

// ── Opus phase config ─────────────────────────────────────────────────────────
export interface OpusPhaseConfig {
  phase:          OpusPhase;
  label:          string;
  symbol:         string;
  color:          string;
  bgTint:         string;
  mixTarget:      ElementMix;
  heatTarget:     number;
  duration:       number;
  minIntegration: number;
  maxTension:     number;
  minNovelty:     number;
}

// ── Lapis state ───────────────────────────────────────────────────────────────
export interface LapisData {
  state:       LapisState;
  charge:      number;
  forgeTimer:  number;
  crackRisk:   number;
}

// ── Op pulse (solve/coagula) ──────────────────────────────────────────────────
export interface OpPulse {
  op:       AlchOp;
  strength: number;
  duration: number;
  maxDur:   number;
}

// ── ✦ QUANTUM BAR (fixed canvas object) ──────────────────────────────────────
// Bars are fixed physics objects on the canvas.
// Each bar is a line segment that affects nearby agents by type:
//   attractor — pulls agents toward the bar (amber glow)
//   repulsor  — pushes agents away         (blue glow)
//   channel   — directional flow field     (white/silver)
//   barrier   — reflects agents (may tunnel with quantum prob) (red)
//   tunnel    — reduces barrier reflection, creates quantum pass-through (purple)
export interface AlchemyBar {
  id:       number;
  x1: number; y1: number;   // world space [0..1]
  x2: number; y2: number;
  type:     BarType;
  strength: number;         // 0..1
  active:   boolean;
  label?:   string;
}

// Bar color palette
export const BAR_COLORS: Record<BarType, string> = {
  attractor: '#c8960a',
  repulsor:  '#3a7fa0',
  channel:   '#c0c8d0',
  barrier:   '#aa2020',
  tunnel:    '#9966cc',
};

// ── ✦ QUANTUM SEQUENCER ───────────────────────────────────────────────────────
// A step-sequencer that applies alchemical operations over time.
// In quantum mode: each step has a probability of collapsing (0..1).
// Uncollapsed steps hold the cursor in superposition between current and next.
// Entangled pairs: when step A collapses, step B's probability shifts.
export interface QSeqStep {
  id:           number;
  label:        string;        // short label: 'N','A','C','R','S≋','S⊕','·' etc.
  // Target mix (null = no change, agent = lerp toward this over step duration)
  earthTarget:  number | null;
  waterTarget:  number | null;
  airTarget:    number | null;
  fireTarget:   number | null;
  heatTarget:   number | null;
  op:           AlchOp;        // operation fired when step activates
  active:       boolean;       // is this step enabled
  // Quantum properties
  probability:  number;        // 0..1: chance this step collapses per period
  entangled:    number | null; // index of entangled step (null = none)
  entangleSign: 1 | -1;        // +1 = correlated, -1 = anti-correlated
}

export interface QuantumSequencer {
  active:    boolean;
  steps:     QSeqStep[];
  cursor:    number;       // current step index
  stepDur:   number;       // seconds per step
  timer:     number;       // elapsed in current step
  quantum:   boolean;      // enable superposition/probabilistic mode
  bpm:       number;       // for display (stepDur = 60/bpm)
  // Superposition: when in quantum mode, two steps can be active simultaneously
  superStep: number | null;  // secondary active step index
  superWeight:number;        // 0..1 weight of superStep (1-w = primary)
}

// ── Full simulation state ─────────────────────────────────────────────────────
export interface AlchemyState {
  agents:     AlchemyAgent[];
  count:      number;
  field:      FieldGrid;
  metrics:    AlchemyMetrics;
  lapis:      LapisData;
  elapsed:    number;
  tick:       number;
  pulse:      OpPulse;
  activeEvent: AlchemyEvent | null;
  eventTimer:  number;
  breathPhase: number;
  elements:   ElementMix;
  heat:       number;
  transmutation: TransmutationState;  // ✦ gamified transmutation system
}

// ── Preset config ─────────────────────────────────────────────────────────────
export interface AlchemyPreset {
  id:          string;
  name:        string;
  subtitle:    string;
  description: string;
  agentCount:  number;
  elements:    ElementMix;
  heat:        number;
  // Optional defaults for bars/sequencer
  suggestBars?: Omit<AlchemyBar, 'id'>[];
}