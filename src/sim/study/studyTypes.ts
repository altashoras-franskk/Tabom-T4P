// ─── Sociogenesis Study Mode — Types ─────────────────────────────────────────
// Agents = social actors. Groups = identity coalitions.
// Symbols (Totem/Tabu/Ritual) = laws inscribed in the field.

export const MAX_STUDY_AGENTS = 600;
export const MAX_STUDY_GROUPS = 5;

export const GROUP_COLORS: readonly string[] = [
  '#ff6b6b', // red     — Group 0
  '#4ecdc4', // teal    — Group 1
  '#ffd93d', // yellow  — Group 2
  '#6bcb77', // green   — Group 3
  '#a78bfa', // purple  — Group 4
];

export type StudySpawnLayout =
  | 'unified_center'
  | 'separated_clusters'
  | 'corners'
  | 'ring'
  | 'line'
  | 'random';

// ── Encounter memory ──────────────────────────────────────────────────────────
export interface Encounter {
  agentIdx: number;
  friendly: boolean;
  time: number;
}

// ── Agent (core + psychology) ─────────────────────────────────────────────────
export interface StudyAgent {
  // Physics (world coords -1..1)
  x: number; y: number;
  vx: number; vy: number;

  // Social identity
  groupId: number;
  familyId: number;  // 0 = no family; 1+ = household/clan — same group, spawn clustered, signaled on canvas

  // Core social traits
  opinion:    number;  // -1..1 — ideological position
  trust:      number;  // 0..1  — openness to influence
  aggression: number;  // 0..1  — out-group hostility
  need:       number;  // 0..1  — belonging drive

  // Goal (set by macroTick, consumed by microTick)
  goalX: number;
  goalY: number;
  /** Current activity label for UI (set each macroTick): e.g. "Buscando recurso", "Com o grupo" */
  currentActivity: string;

  // Short memory (last 3 encounters)
  memory: Encounter[];
  // Deep memory: birthplace is persistent (never overwritten)
  birthX: number;
  birthY: number;
  // Immutable initial social state (used for long-memory coherence)
  originGroupId: number;
  originFamilyId: number;
  // 0..1 — how strongly the agent is anchored to birthplace under stress
  birthMemory: number;
  // 0..1 — emergent social entanglement intensity (organic, not hard links)
  entanglement: number;
  // Auditability — dominant behavioral drivers tracked each macroTick
  auditThreat: number;
  auditResource: number;
  auditSocial: number;
  auditTransgression: number;
  auditMemoryPull: number;
  auditReason: string;

  // Analytics
  centrality:  number;  // 0..1 — connection richness → leader signal
  hostileCount: number; // hostile encounters in last macro window

  // ── Psychology (Patch: Symbols as Laws) ──────────────────────────────────
  belief:    number;  // 0..1 — internalised conformity
  fear:      number;  // 0..1 — coercion response
  desire:    number;  // 0..1 — transgression/novelty drive
  status:    number;  // 0..1 — symbolic power (prestige)
  wealth:    number;  // 0..1 — accumulated resource
  ideology:  number;  // -1..1 — order(−1) ↔ freedom(+1) axis
  fatigue:   number;  // 0..1  — exhaustion from conflict/ritual

  // ── Complex dynamics ───────────────────────────────────────────────────
  conformity:   number;  // 0..1 — tendency to align with local norms
  empathy:      number;  // 0..1 — emotional contagion sensitivity
  charisma:     number;  // 0..1 — influence multiplier on neighbors
  groupLoyalty: number;  // 0..1 — resistance to switching groups
  memeId:       number;  // cultural meme index (0..groupCount-1, can spread)

  // ── Foucault Dynamics (Surveillance & Resistance) ──────────────────────
  visibility:   number;  // 0..1 — how "seen" the agent feels by the panopticon
  resistance:   number;  // 0..1 — drive to rebel against discipline/norms
  
  // ── Visuals ────────────────────────────────────────────────────────────
  trailX: Float32Array;
  trailY: Float32Array;
  trailIdx: number;
  lastGroupChange: number; // timestamp of last group change for visual effects

  // ── Archetype identity (stabilized) ─────────────────────────────────────
  // Packed numeric key representing the agent's archetypic combination.
  // We keep both a "moment" key and a "stable" key to avoid flicker.
  archKeyMoment: number;
  archKeyStable: number;
  archKeyCandidate: number;
  archCandidateAt: number; // seconds
  archStableAt: number;    // seconds

  // ── Morin: Complexity dimensions ──────────────────────────────────────
  // Percepção falível (blindness of knowledge): agents never see the world perfectly.
  // High perception = accurate field reading; low = distorted by ideology/fear/desire.
  perception: number;       // 0..1 — fidelity of world-model

  // Homo sapiens-demens: rational-irrational duality. Hybris grows with unchecked power;
  // fervor from collective belief+fear feedback. Both distort judgment.
  hybris: number;           // 0..1 — overconfidence from high status (blindness of power)
  fervor: number;           // 0..1 — collective irrational passion (sapiens → demens)

  // Ética emergente (anthropo-ethics): arises from diverse, non-hostile encounters.
  // High ethics = self-limitation, cross-group cooperation, reduced aggression.
  ethics: number;           // 0..1 — emergent moral compass

  // Compreensão (understanding): grows with repeated peaceful cross-group contact.
  // Reduces out-group hostility and increases empathy locally.
  understanding: number;    // 0..1 — depth of inter-subjective comprehension

  // Auto-eco-organização: dependence on environmental R field. Overextraction
  // degrades the field permanently — product is also producer of its milieu.
  ecoFootprint: number;     // 0..1 — cumulative environmental damage caused
}

// ── Symbols — laws inscribed in field + behaviour ─────────────────────────────

export type TotemKind   = 'BOND' | 'RIFT' | 'ORACLE' | 'ARCHIVE' | 'PANOPTICON';
export type TabuKind    = 'NO_ENTER' | 'NO_MIX';
export type RitualKind  = 'GATHER' | 'PROCESSION' | 'OFFERING' | 'REVOLT';

export interface StudyTotem {
  id: string;
  kind: TotemKind;
  x: number; y: number;
  radius: number;
  groupId: number;        // for RIFT — which group's L it boosts
  pulseStrength: number;  // N/L deposit amount per macroTick
  bornAt: number;
  emergent?: boolean;     // true if auto-placed by engine
  /** Explicação assertiva: o que na dinâmica causou esta instituição (emergência, cenário ou manual). */
  cause?: string;
}

export interface StudyTabu {
  id: string;
  kind: TabuKind;
  x: number; y: number;
  radius: number;
  severity: number;       // 0..1 — how harsh the punishment
  bornAt: number;
  violationCount: number; // tracked per macroTick window
  cause?: string;
}

export interface StudyRitual {
  id: string;
  kind: RitualKind;
  x: number; y: number;
  radius: number;
  periodSec: number;      // how often it fires
  lastFired: number;      // timestamp of last activation
  active: boolean;        // currently in a firing cycle
  linkedTotemId?: string;
  bornAt: number;
  cause?: string;
}

export interface StudySymbols {
  totems:  StudyTotem[];
  tabus:   StudyTabu[];
  rituals: StudyRitual[];
}

// ── Group Profile (Bourdieu: each group = a social field with its own logic) ──
export type GroupSphere = 'political' | 'economic' | 'religious' | 'artistic' | 'scientific' | 'military' | 'popular';
export interface GroupProfile {
  name: string;
  sphere: GroupSphere;
  fieldSensitivity: { n: number; l: number; r: number }; // how much this group weighs each field (0..2)
  ideologyBias: number;    // -1..1 — initial ideology tendency (order ↔ freedom)
  trustBias: number;       // 0..1 — baseline trust modifier
  aggressionBias: number;  // 0..1 — baseline aggression modifier
  cohesionBias: number;    // 0..1 — in-group cohesion modifier
  desireBias: number;      // 0..1 — desire/transgression tendency
}

export function defaultGroupProfiles(groupCount: number): GroupProfile[] {
  const templates: GroupProfile[] = [
    { name: 'Político',   sphere: 'political',  fieldSensitivity: { n: 1.4, l: 1.6, r: 0.6 }, ideologyBias: -0.3, trustBias: 0.5, aggressionBias: 0.3, cohesionBias: 0.6, desireBias: 0.3 },
    { name: 'Mercador',   sphere: 'economic',   fieldSensitivity: { n: 0.6, l: 0.8, r: 1.8 }, ideologyBias:  0.2, trustBias: 0.4, aggressionBias: 0.2, cohesionBias: 0.4, desireBias: 0.6 },
    { name: 'Devoto',     sphere: 'religious',   fieldSensitivity: { n: 1.8, l: 1.2, r: 0.4 }, ideologyBias: -0.5, trustBias: 0.7, aggressionBias: 0.2, cohesionBias: 0.8, desireBias: 0.2 },
    { name: 'Artista',    sphere: 'artistic',    fieldSensitivity: { n: 0.5, l: 1.0, r: 1.0 }, ideologyBias:  0.5, trustBias: 0.5, aggressionBias: 0.1, cohesionBias: 0.3, desireBias: 0.8 },
    { name: 'Científico', sphere: 'scientific',  fieldSensitivity: { n: 1.0, l: 1.4, r: 1.0 }, ideologyBias:  0.3, trustBias: 0.6, aggressionBias: 0.1, cohesionBias: 0.5, desireBias: 0.5 },
  ];
  return Array.from({ length: groupCount }, (_, i) => ({ ...templates[i % templates.length] }));
}

// ── Config ────────────────────────────────────────────────────────────────────
export interface StudyConfig {
  agentCount: number;   // 50..200
  groupCount: number;   // 2..5
  speed:      number;
  friction:   number;
  rMax:       number;   // social interaction radius
  autonomy:   number;   // goal-steer weight
  cohesion:   number;   // same-group attraction
  pressure:   number;   // opinion/ideology update speed
  aggressionBase: number;
  trustBase:  number;
  needBase:   number;
  macroTickSec: number;

  // Psychology constants
  kBelief:  number;     // belief response sensitivity to N
  kFear:    number;     // fear response sensitivity
  kDesire:  number;     // desire / transgression drive
  harvestRate:  number; // wealth gain from R per tick
  decayWealth:  number; // wealth maintenance cost per second
  ideologyPressure: number; // ideology contágio strength

  // Complex dynamics
  conformity:      number;  // 0..1 — social pressure to align with local norm
  empathy:         number;  // 0..1 — cross-group emotional contagion
  mobility:        number;  // 0..1 — group switching probability
  contagion:       number;  // 0..1 — idea/meme spreading speed
  hierarchyStrength: number;  // 0..1 — status amplifies influence
  innovationRate:  number;  // 0..1 — spontaneous ideology mutation
  cooperationBias: number;  // 0..1 — tendency to share wealth
  culturalInertia: number;  // 0..1 — resistance to belief change
  resourceScarcity: number; // 0..1 — 0=scarce, 1=abundant (R regen modifier)
  /** 0..1 — how much out-group neighbors influence opinion/belief (troca entre grupos) */
  crossGroupInfluence: number;

  // Boids / Crowd movement
  boidsAlignment:  number;  // 0..1 — tendency to align velocity with neighbors
  boidsCohesion:   number;  // 0..1 — tendency to move towards center of mass of neighbors
  wander:          number;  // 0..1 — stochastic micro-wander (nonlinear motion)
  impulseRate:     number;  // 0..2 — impulses per second (approx)
  impulseStrength: number;  // 0..1 — impulse magnitude
  goalOvershoot:   number;  // 0..1 — steer past the goal to create "vai e volta"
  zigzag:          number;  // 0..1 — perpendicular drift while steering

  // Foucault / Control
  panopticism:     number;  // 0..1 — how much visibility increases fear/conformity vs resistance
  
  // Coercion / Exception
  violationThreshold: number;  // violations per minute to trigger exception
  exceptionDuration:  number;  // seconds
  autoSymbols: boolean;         // engine auto-places symbols when conditions emerge

  // Group profiles (Bourdieu social fields — each group has its own field logic)
  groupProfiles: GroupProfile[];

  // World size: 1 = "sala" (-1..1), 2 = "bairro" (-2..2), more space for clusters/emergence
  worldHalf: number;

  /** If false, agents start with no family (familyId 0); bonds form over time via proximity + friendly encounters. */
  startWithFamilies: boolean;
  /**
   * Birth relation mode:
   * - families: clustered households from spawn
   * - sparse: few tiny families (1-2 pair bonds per group)
   * - none: no initial relations
   */
  spawnRelationMode: 'families' | 'sparse' | 'none';
  /** Probability per macro tick that two unbound neighbors (same group, friendly memory) form a bond. */
  bondFormationRate: number;
  /** 0..1 — global gain for birthplace attraction under stress/scarcity. */
  birthMemoryStrength: number;

  // Archetype identity
  archetypeHoldSec: number;     // seconds candidate must persist before committing stable archetype

  // ── Morin dimensions ──────────────────────────────────────────────────
  perceptionBias: number;       // 0..1 — how much traits distort field sampling
  hybrisThreshold: number;      // 0..1 — status level above which hybris grows
  fervorThreshold: number;      // 0..1 — belief+fear sum that triggers demens behavior
  ethicsGrowth: number;         // 0..1 — rate ethics develops from diverse peaceful encounters
  understandingGrowth: number;  // 0..1 — rate understanding grows from cross-group contact
  ecoDegradation: number;       // 0..1 — permanent R field damage from overextraction
  consensusDecay: number;       // 0..1 — rate at which total consensus erodes (order without disorder = death)

  // ── Leader mode: emergent vs fixed (democracy) ───────────────────────────
  /** emergent = leaders by centrality/status; fixed_democracy = one leader per group, rotates every term */
  leaderMode: 'emergent' | 'fixed_democracy';
  /** Simulated "years" per term when leaderMode === 'fixed_democracy' (e.g. 4 years). 1 year ≈ 20s sim time. */
  democracyTermSec: number;
}

// ── World state (mutable, passed by ref to macroTick) ────────────────────────
export interface StudyWorldState {
  exceptionActive:     boolean;
  exceptionStartTime:  number;
  violationCount:      number;
  violationsWindowStart: number;
  violationsWindow:    number;  // count in last minute
  meanWealth:          number;
  gini:                number;
  rngState:            number;  // deterministic RNG state for reproducible runs
  /** Next family id to assign when a new bond is formed (societies from 0). */
  nextFamilyId:        number;
  /** When leaderMode === 'fixed_democracy': current term index (increments every democracyTermSec). */
  democracyEpoch:     number;
  /** Sim time when current term started. */
  democracyEpochStartTime: number;
  /** Agent indices that are fixed leaders this term (one per group). */
  fixedLeaderIndices: number[];
  /** 0..1 — spikes when conflict high, decays when low; drives "guerra" (fuga, hostilidade). */
  warPhase: number;
}

// ── Metrics ───────────────────────────────────────────────────────────────────
export type StudyPhase =
  | 'SWARM'
  | 'CLUSTERS'
  | 'POLARIZED'
  | 'CONFLICT'
  | 'CONSENSUS'
  | 'EXCEPTION'
  | 'FERVOR'
  | 'ECO_CRISIS'
  | 'TRANSCENDENCE';

export interface StudyMetrics {
  cohesion:     number;  // 0..1
  polarization: number;  // 0..1
  conflict:     number;  // 0..1
  consensus:    number;  // 0..1
  phase:        StudyPhase;
  // Extended telemetry
  leaderCount:  number;
  rebelCount:   number;
  meanFear:     number;
  meanBelief:   number;
  entropy:      number;  // 0..1 — opinion diversity
  // Morin indices
  meanPerception: number;   // 0..1 — collective accuracy of world-model
  meanEthics:     number;   // 0..1 — emergent collective ethics
  meanHybris:     number;   // 0..1 — collective overconfidence
  meanFervor:     number;   // 0..1 — collective irrationality
  meanUnderstanding: number; // 0..1 — cross-group comprehension
  meanEntanglement: number;  // 0..1 — collective relational coherence
  ecoHealth:      number;   // 0..1 — environmental integrity
}

// ── Lens / Tool ───────────────────────────────────────────────────────────────
export type StudyLens = 'off' | 'groups' | 'power' | 'economy' | 'events' | 'field' | 'archetype' | 'morin';
export type StudyTool =
  | 'select'
  | 'spawn_agent'
  | 'totem_bond'
  | 'totem_rift'
  | 'totem_oracle'
  | 'totem_archive'
  | 'totem_panopticon'
  | 'tabu_enter'
  | 'tabu_mix'
  | 'ritual_gather'
  | 'ritual_procession'
  | 'ritual_offering'
  | 'ritual_revolt';

// ── Events / Pings ────────────────────────────────────────────────────────────
export interface StudyEvent {
  time:    number;
  icon:    string;
  message: string;
  color:   string;
  /** Explicação do que causou o evento (ex.: guerra, anomia, filosofia emergente) */
  cause?:  string;
}

export interface StudyPing {
  x: number; y: number;
  message: string; color: string;
  bornAt: number; ttl: number; age: number;
}

// ── Factories ─────────────────────────────────────────────────────────────────
export function createStudyConfig(): StudyConfig {
  return {
    agentCount: 280, groupCount: 3,
    speed: 0.62, friction: 0.85, rMax: 0.32,
    autonomy: 0.62, cohesion: 0.48, pressure: 0.38,
    aggressionBase: 0.20, trustBase: 0.55, needBase: 0.58,
    macroTickSec: 1.0,
    kBelief: 0.45, kFear: 0.40, kDesire: 0.35,
    harvestRate: 0.09, decayWealth: 0.018,
    ideologyPressure: 0.20,
    conformity: 0.38, empathy: 0.32, mobility: 0.12,
    contagion: 0.40, hierarchyStrength: 0.45,
    innovationRate: 0.08, cooperationBias: 0.28,
    culturalInertia: 0.42, resourceScarcity: 0.55, crossGroupInfluence: 0.35,
    boidsAlignment: 0.48, boidsCohesion: 0.40,
    wander: 0.35, impulseRate: 0.38, impulseStrength: 0.68, goalOvershoot: 0.20, zigzag: 0.22,
    panopticism: 0.50,
    violationThreshold: 3, exceptionDuration: 25,
    autoSymbols: true,
    groupProfiles: defaultGroupProfiles(3),
    worldHalf: 2,  // "bairro": world [-2,2] x [-2,2], more space for emergence
    startWithFamilies: true,  // false = "do zero", laços formam com o tempo
    spawnRelationMode: 'families',
    bondFormationRate: 0.04,
    birthMemoryStrength: 0.55,
    archetypeHoldSec: 1.8,
    // Morin
    perceptionBias: 0.25,
    hybrisThreshold: 0.65,
    fervorThreshold: 1.30,
    ethicsGrowth: 0.18,
    understandingGrowth: 0.15,
    ecoDegradation: 0.04,
    consensusDecay: 0.02,
    leaderMode: 'emergent',
    democracyTermSec: 80, // 4 "years" ≈ 80s (1 year ≈ 20s)
  };
}

export function createStudySymbols(): StudySymbols {
  return { totems: [], tabus: [], rituals: [] };
}

export function createStudyWorldState(): StudyWorldState {
  return {
    exceptionActive: false, exceptionStartTime: 0,
    violationCount: 0, violationsWindowStart: 0, violationsWindow: 0,
    meanWealth: 0.25, gini: 0,
    rngState: 1,
    nextFamilyId: 1,
    democracyEpoch: 0,
    democracyEpochStartTime: 0,
    fixedLeaderIndices: [],
    warPhase: 0,
  };
}

export function createStudyMetrics(): StudyMetrics {
  return {
    cohesion: 0.2, polarization: 0.1, conflict: 0.05, consensus: 0.5, phase: 'SWARM',
    leaderCount: 0, rebelCount: 0, meanFear: 0.1, meanBelief: 0.2, entropy: 0.5,
    meanPerception: 0.5, meanEthics: 0.05, meanHybris: 0.05, meanFervor: 0.05,
    meanUnderstanding: 0.05, meanEntanglement: 0.1, ecoHealth: 1.0,
  };
}