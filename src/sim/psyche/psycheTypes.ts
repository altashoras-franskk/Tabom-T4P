// ── Psyche Lab — Types & Constants ───────────────────────────────────────────

export type ArchetypeId =
  | 'SELF' | 'PERSONA' | 'SHADOW' | 'ANIMA' | 'TRICKSTER' | 'HERO'
  | 'MOTHER' | 'FATHER' | 'WISE_ONE' | 'CHILD' | 'LOVER' | 'DESTROYER';

export const ARCHETYPE_IDS: ArchetypeId[] = [
  'SELF','PERSONA','SHADOW','ANIMA','TRICKSTER','HERO',
  'MOTHER','FATHER','WISE_ONE','CHILD','LOVER','DESTROYER',
];

export type RegionId =
  | 'SELF_REGION' | 'EGO' | 'PERSONA_REGION' | 'SHADOW_REGION'
  | 'COLLECTIVE' | 'ID' | 'SUPEREGO';

export type PsycheLens =
  | 'TOPOLOGY' | 'ENERGY' | 'VALENCE' | 'COHERENCE' | 'ARCHETYPES' | 'EVENTS'
  | 'LACAN' | 'FREUD';

export type PsychePhase =
  | 'CALM' | 'ALERT' | 'PANIC' | 'FLOW' | 'FRAGMENTED' | 'INTEGRATING';

export const TAG_NONE = 0;
// TAG indices 1..12 map to ARCHETYPE_IDS[0..11]

/** World-space positions of region centers (x, y: -1..1, y-down canvas convention) */
export const REGION_CENTERS: Record<RegionId, [number, number]> = {
  SELF_REGION:     [ 0.00,  0.00],
  EGO:             [ 0.40, -0.30],
  PERSONA_REGION:  [-0.40, -0.30],
  SHADOW_REGION:   [-0.40,  0.35],
  COLLECTIVE:      [ 0.40,  0.35],
  ID:              [ 0.00,  0.58],
  SUPEREGO:        [ 0.00, -0.66],
};

/** Gaussian sigma for each region weight */
export const REGION_SIGMA: Record<RegionId, number> = {
  SELF_REGION:     0.12,
  EGO:             0.25,
  PERSONA_REGION:  0.25,
  SHADOW_REGION:   0.25,
  COLLECTIVE:      0.27,
  ID:              0.20,
  SUPEREGO:        0.22,
};

export const FLOW_W = 64;
export const FLOW_H = 64;
export const MAX_QUANTA = 1300;
export const MAX_LINKS  = 500;

/** Archetype node — static definition */
export interface ArchetypeNode {
  id:             ArchetypeId;
  sigil:          string;
  color:          string;
  preferredRegion: RegionId;
  /** 'vortex' | 'sink' | 'source' | 'shear' | 'oscillate' | 'spiral' */
  fieldMode:      string;
  fieldRadius:    number;   // world radius of influence
  description:    string;
}

export interface PsycheState {
  count:     number;
  x:         Float32Array;
  y:         Float32Array;
  vx:        Float32Array;
  vy:        Float32Array;
  charge:    Float32Array;   // 0..1 energy/pulsion
  valence:   Float32Array;   // -1..1 pleasant/unpleasant
  coherence: Float32Array;   // 0..1 integration
  arousal:   Float32Array;   // 0..1 activation
  inhibition:Float32Array;   // 0..1 superego lock
  tag:       Uint8Array;     // 0=NONE, 1..12 = archetype index+1
  tagAge:    Float32Array;   // how long has this tag been held
  age:       Float32Array;
  // ── Individual identity ─────────────────────────────────────────────────
  // soulHue: random hue (0–360) assigned once at birth, never changes.
  // Lets each quantum be visually trackable across its journey.
  soulHue:   Float32Array;

  // Flow field
  flowU:     Float32Array;   // FLOW_W * FLOW_H
  flowV:     Float32Array;

  // Spring links
  linkA:     Int32Array;     // MAX_LINKS: index of particle A
  linkB:     Int32Array;     // index of particle B
  linkTtl:   Float32Array;   // seconds remaining
  linkCount: number;

  // Archetype activity (12 values, one per archetype)
  archetypeActive:   boolean[];
  archetypeStrength: number[];

  // Runtime
  breathT:    number;   // elapsed time for breath oscillator
  breathPhase:number;   // 0..2π
  tick:       number;
  elapsed:    number;

  // Metrics (computed every ~1s)
  integrationIndex:   number;
  tensionIndex:       number;
  fragmentationIndex: number;
  phase:              PsychePhase;

  // Narrator events (ring buffer)
  events:    Array<{ text: string; x: number; y: number; ttl: number; color: string }>;

  // Journey (Red Book)
  journeyActive: boolean;
  journeyAct:    number;   // 0..3
  journeyActT:   number;   // elapsed in current act (seconds)
  journeyDone:   boolean;
}

export interface PsycheConfig {
  quantaTarget:    number;
  danceIntensity:  number;
  flowGain:        number;
  damping:         number;
  maxSpeed:        number;
  breathPeriod:    number;
  springK:         number;
  springRestLen:   number;
  linkRadius:      number;
  linkValDiff:     number;
  linkProbability: number;
  linkMaxTtl:      number;
  archetypesOn:    boolean;
  selfPull:        number;
  spawnRate:       number;
  deathAge:        number;
  lens:            PsycheLens;
  // Trail config
  trailFade:       number;    // 0.01 (long memory) → 0.20 (short), default 0.06
  trailOpacity:    number;    // 0..1, default 0.65
  trailWidth:      number;    // glow radius multiplier 1..8, default 3
  // Bonds visibility
  bondsOn:         boolean;   // default true
  // ── Stable-state controls ────────────────────────────────────────────────
  // frozenFlow: freeze the time-varying sinusoidal waves in the flow field.
  // When true, only the self-pull / archetype attractors remain — particles can
  // settle into genuine stable attractor states instead of being constantly
  // stirred by ever-changing wave functions.
  frozenFlow:      boolean;   // default false
  // stateRelaxRate: multiplier on inner-state update rates (charge/valence/etc).
  // 1.0 = normal speed, 0.30 = slow relaxation (more "memory", less flip-flopping).
  stateRelaxRate:  number;    // default 1.0
  // soulVis: 0 = pure state colors (default), 1 = pure individual soul color.
  // At 0.3–0.5, each quantum gets a subtle tint that persists through its whole life
  // so you can visually track individual journeys within the collective pattern.
  soulVis:         number;    // default 0
}

// ── Psychoanalytic lens metrics (computed from per-particle data) ──────────────

/** Freudian metrics — Second Topography (Id/Ego/Superego) + drive theory */
export interface FreudMetrics {
  eros:          number; // Pulsão de Vida: valence+ × charge × (1-inhibition)
  thanatos:      number; // Pulsão de Morte: inhibition × (1-valence+)
  repressao:     number; // avg inhibition — Superego lock
  idPower:       number; // fraction of quanta in Id zone
  superegoForce: number; // fraction in Superego zone
  egoStrength:   number; // avg coherence in Ego zone
  sublimacao:    number; // integration × eros — energy sublimated
}

/** Lacanian metrics — RSI (Réel/Symbolique/Imaginaire) topology */
export interface LacanMetrics {
  real:       number; // fraction in Real register (inassimilable)
  simbolico:  number; // Symbolic (bond density + Superego zone)
  imaginario: number; // Imaginary (Ego zone + coherence)
  gozo:       number; // Jouissance: charge × arousal in Real
  falta:      number; // Manque: 1 − integration
  sujeito:    number; // $ Divided subject: fragmentation
}

export function defaultPsycheConfig(): PsycheConfig {
  return {
    quantaTarget:   600,
    danceIntensity: 0.20,
    flowGain:       0.30,
    damping:        2.0,
    maxSpeed:       0.18,
    breathPeriod:   24,
    springK:        0.55,
    springRestLen:  0.045,
    linkRadius:     0.07,
    linkValDiff:    0.35,
    linkProbability:0.004,
    linkMaxTtl:     2.5,
    archetypesOn:   true,
    selfPull:       0.18,
    spawnRate:      4,
    deathAge:       70,
    lens:           'TOPOLOGY',
    trailFade:      0.06,
    trailOpacity:   0.65,
    trailWidth:     3,
    bondsOn:        true,
    frozenFlow:     false,
    stateRelaxRate: 1.0,
    soulVis:        0,
  };
}