// ── Music Lab — Core Types (v2) ───────────────────────────────────────────────

export type VoiceRole = 'KICK' | 'BASS' | 'PERC' | 'PAD' | 'LEAD' | 'ARP' | 'STRINGS' | 'CHOIR';
export type Scale     = 'major'|'minor'|'pentatonic'|'blues'|'dorian'|'phrygian'
                      | 'lydian'|'mixolydian'|'whole_tone'|'harmonic_minor'|'chromatic';
export type MotionStyle = 'swarm'|'orbit'|'flow'|'drift'|'spiral'|'lattice'
                        | 'murmuration'|'school'|'war'|'polarization'|'revolution'
                        | 'explosion'|'carnival'|'jazz'|'organism'|'exodus'
                        | 'dance'|'chaos'|'meditation'|'migration'|'predation'|'cells'
                        | 'ballistic';
export type MusicLens   = 'Off'|'Notes'|'Harmony'|'Rhythm'|'Tension'|'Events';
export type MusicalTool = 'select'|'spawn'|'gate'|'attractor'|'repulsor'|'vortex'
                        | 'excite'|'freeze'|'mutate'|'erase'
                        | 'channel'|'tunnel'|'rail'
                        | 'mirror'|'absorber'|'membrane'
                        | 'cage'|'string'|'zone'|'metro';
// ── Scales ────────────────────────────────────────────────────────────────────
export const SCALE_INTERVALS: Record<Scale, number[]> = {
  major:          [0,2,4,5,7,9,11],
  minor:          [0,2,3,5,7,8,10],
  pentatonic:     [0,2,4,7,9],
  blues:          [0,3,5,6,7,10],
  dorian:         [0,2,3,5,7,9,10],
  phrygian:       [0,1,3,5,7,8,10],
  lydian:         [0,2,4,6,7,9,11],
  mixolydian:     [0,2,4,5,7,9,10],
  whole_tone:     [0,2,4,6,8,10],
  harmonic_minor: [0,2,3,5,7,8,11],
  chromatic:      [0,1,2,3,4,5,6,7,8,9,10,11],
};

export const ROLE_COLORS: Record<VoiceRole, string> = {
  KICK:    '#ff3b5c',
  BASS:    '#ff8c00',
  PERC:    '#00e5ff',
  PAD:     '#9b59ff',
  LEAD:    '#39ff70',
  ARP:     '#00d4c8',
  STRINGS: '#ffd700',
  CHOIR:   '#ff69b4',
};

export const ROLE_HUES: Record<VoiceRole, number> = {
  KICK:0, BASS:28, PERC:190, PAD:270, LEAD:135, ARP:175, STRINGS:48, CHOIR:330,
};

// ── Math helpers ──────────────────────────────────────────────────────────────
export function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}
export function quantizeToScale(midi: number, root: number, scale: Scale): number {
  const iv = SCALE_INTERVALS[scale];
  const oct = Math.floor((midi - root) / 12);
  const rem = ((midi - root) % 12 + 12) % 12;
  let best = iv[0], bestD = 12;
  for (const s of iv) { const d = Math.abs(s - rem); if (d < bestD) { bestD = d; best = s; } }
  return root + oct * 12 + best;
}
export function consonanceScore(a: number, b: number): number {
  const iv = ((b - a) % 12 + 12) % 12;
  const t: Record<number,number> = {0:1,7:.9,5:.8,4:.7,3:.65,9:.65,2:.35,10:.35,8:.3,6:.15,1:.1,11:.1};
  return t[iv] ?? .2;
}

// ── Quantum ───────────────────────────────────────────────────────────────────
export interface MusicQuantum {
  id:      number;
  x: number; y: number;
  vx: number; vy: number;
  prevX: number; prevY: number;
  phase:      number;   // 0..1
  pitch:      number;   // MIDI
  brightness: number;   // 0..1
  charge:     number;   // 0..1 energy/amplitude
  role:       VoiceRole;
  hue:        number;   // 0..360
  cooldown:   number;   // secs until next note
  trailX:     number[];
  trailY:     number[];
  // Emergent
  age:             number;  // seconds alive
  dischargeTimer:  number;  // secs at high charge (triggers discharge > 0.45)
  recentlyFired:   number;  // visual flash timer
  selected:        boolean;
  mutations:       number;  // how many times role-changed
  phaseLocked:     number;  // partner id, -1 = none
  roleLockTimer:   number;  // secs locked in role after mutation
  // Per-particle timbre override (-1 = use role/preset default)
  timbreIdx:       number;
}

// ── Gate line ─────────────────────────────────────────────────────────────────
export type GateType = 'gate' | 'mirror' | 'absorber' | 'membrane';
export interface GateLine {
  x1: number; y1: number;
  x2: number; y2: number;
  cooldown: number;
  color:    string;
  type?:    GateType;
}

// ── Attractor (includes vortex/repulsor) ──────────────────────────────────────
export interface Attractor {
  x:         number;
  y:         number;
  strength:  number;  // radial: + attract, − repel
  vortexStr: number;  // tangential force (spin)
  radius:    number;
  type:      'attractor' | 'repulsor' | 'vortex' | 'metro';
}

// ── Ripple ────────────────────────────────────────────────────────────────────
export interface Ripple {
  x: number; y: number;
  r: number; maxR: number;
  alpha: number;
  color: string;
  thick: number;
}

// ── Emergent event (visual) ───────────────────────────────────────────────────
export interface EmergentEvent {
  type:   'discharge' | 'mutation' | 'birth' | 'death' | 'phaseLock';
  x:      number; y:  number;
  x2?:    number; y2?: number;  // arc endpoint
  r:      number;
  alpha:  number;
  color:  string;
}

// ── Quantum Channel (painted directional flow field) ──────────────────────────
// User drags to paint "wind" arrows that guide particles in that direction
export interface QuantumChannel {
  id:       number;
  pts:      Array<[number,number,number,number]>; // [wx,wy, dx,dy] normalized direction
  strength: number;  // 0..1 force magnitude
  radius:   number;  // world units  influence radius
  color:    string;
}

// ── Gravity Rail (magnetic bar) ───────────────────────────────────────────────
// Line that continuously attracts particles toward it — like a magnetic track
export interface GravityRail {
  x1: number; y1: number;
  x2: number; y2: number;
  strength: number;  // 0..1 pull force
  color:    string;
}

// ── Quantum Tunnel (portal pair) ──────────────────────────────────────────────
// Particle entering portal A is teleported to portal B; velocity is rotated
export interface QuantumTunnel {
  id:     number;
  ax: number; ay: number;  // entrance world coords
  bx: number; by: number;  // exit world coords
  radius: number;
  color:  string;
  cd:     number;          // per-portal cooldown timer
}

// ── Quantum Sequencer ─────────────────────────────────────────────────────────
// Ring of N steps; rotating cursor fires notes from nearest particles when it
// sweeps past armed steps — outcome depends on chaotic particle positions = "quantum"
export interface QSeqStep {
  armed:    boolean;
  pitchOff: number;         // semitone offset added to nearest particle's pitch
  vel:      number;         // 0..1 velocity override
  role:     VoiceRole | null; // null = accept any role
}

export interface QuantumSequencer {
  active:    boolean;
  x:         number;        // world center
  y:         number;
  ringR:     number;        // ring radius (world units)
  steps:     QSeqStep[];    // 8 or 16 steps
  cursor:    number;        // 0..1 current angle / (2π)
  tempoMult: number;        // revolutions per musical bar (0.5, 1, 2, 4)
  triggerR:  number;        // proximity radius for each step
  stepCd:    number[];      // per-step cooldown (secs)
}

// ── Update MusicState to include new structures ───────────────────────────────
export interface MusicState {
  quanta:      MusicQuantum[];
  count:       number;
  gates:       GateLine[];
  attractors:  Attractor[];
  ripples:     Ripple[];
  emergent:    EmergentEvent[];
  channels:    QuantumChannel[];    // NEW
  rails:       GravityRail[];       // NEW
  tunnels:     QuantumTunnel[];     // NEW
  sequencer:   QuantumSequencer;    // NEW
  cages:       Cage[];              // P01.1
  strings:     HarmonicString[];    // P01.1
  fxZones:     FxZone[];            // P01.1
  userMatrix:  UserMatrix;          // P01.1
  elapsed:     number;
  tick:        number;
  bpm:         number;
  beatPhase:   number;
  barPhase:    number;
  lastBeatTime: number;
  syncIntensity: number;
  roleEnergy:  Partial<Record<VoiceRole, number>>;
}

// ── Envelope ──────────────────────────────────────────────────────────────────
export interface Envelope {
  attack: number; decay: number; sustain: number; release: number;
}

// ── Role config (per preset, overridable at runtime) ─────────────────────────
export interface RoleConfig {
  proportion:  number;
  pitchRange:  [number, number];
  envelope:    Envelope;
  waveform:    OscillatorType | 'noise' | 'kick' | 'snare' | 'hihat';
  filterType:  BiquadFilterType;
  filterFreq:  number;
  filterQ:     number;
  gainScale:   number;
  detune:      number;
  panSpread:   number;
  maxVoices:   number;
  cooldownMin: number;
}

// ── Note event ────────────────────────────────────────────────────────────────
export interface NoteEvent {
  pitch:    number;
  velocity: number;
  role:     VoiceRole;
  x:        number; y: number;
  duration: number;
  timbre:   number;
  timbreIdx?: number;  // per-particle timbre template index (-1 or absent = use role default)
}

// ── Physics params (runtime controls) ────────────────────────────────────────
export interface PhysicsParams {
  damping:        number;  // 0.90..0.999
  cohesion:       number;  // 0..3
  separation:     number;  // 0..3
  maxSpeed:       number;  // 0.02..0.6
  gravityX:       number;  // -0.4..0.4
  gravityY:       number;  // -0.4..0.4
  turbulence:     number;  // 0..1
  mutationRate:   number;  // 0..1
  energyTransfer: number;  // 0..1
  entainment:     number;  // 0..1
  predatorPrey:   boolean;
  // ── New: Behavior Physics ─────────────────────────────────────────────────
  motionStyle:    MotionStyle; // active motion pattern (overrides preset)
  alignment:      number;  // 0..2   velocity alignment force (boids)
  zoneRadius:     number;  // 0.03..0.5  neighborhood radius
  vortexForce:    number;  // 0..0.4  tangential spin force
  burstRate:      number;  // 0..1   pulse / burst intensity
  migrationX:     number;  // -1..1  drift direction X
  migrationY:     number;  // -1..1  drift direction Y
  clusterTarget:  number;  // 2..20  target cluster size
  polarize:       number;  // 0..1   similar-attract / different-repel
  // ── Physics Sandbox extensions ────────────────────────────────────────────
  bounceWalls?:   boolean; // elastic wall bounce instead of wrap-around
  physicsOnly?:   boolean; // disable encounter/spontaneous notes (gates only)
  restitution?:   number;  // 0..1  wall/floor bounce energy kept (1=perfect bounce)
}

export const DEFAULT_PHYSICS: PhysicsParams = {
  damping: 0.962, cohesion: 1.3, separation: 1.1, maxSpeed: 0.38,
  gravityX: 0, gravityY: 0, turbulence: 0.28,
  mutationRate: 0.10, energyTransfer: 0.38, entainment: 0.45,
  predatorPrey: false,
  motionStyle: 'swarm',
  alignment: 0.8, zoneRadius: 0.18, vortexForce: 0.0,
  burstRate: 0.3, migrationX: 0, migrationY: 1,
  clusterTarget: 6, polarize: 0.5,
};

// ── Tool cursor state (for renderer) ─────────────────────────────────────────
export interface ToolCursor {
  tool:    MusicalTool;
  wx:      number;  // world coords
  wy:      number;
  radius:  number;  // for brush tools
  active:  boolean; // mouse down
}

// ── Role interaction matrix (predator/prey) ───────────────────────────────────
export const ROLE_MATRIX: Partial<Record<VoiceRole, Partial<Record<VoiceRole, number>>>> = {
  KICK:    { BASS: -0.04, PERC: -0.03 },
  BASS:    { KICK: 0.06,  LEAD: 0.018 },
  PERC:    { KICK: -0.025 },
  LEAD:    { BASS: 0.045, ARP:  -0.02 },
  PAD:     { CHOIR: 0.018 },
  ARP:     { LEAD:  0.032, STRINGS: 0.015 },
  STRINGS: { PAD:   0.025, CHOIR: 0.018 },
  CHOIR:   { STRINGS: 0.02 },
};

// ── Preset ────────────────────────────────────────────────────────────────────
export interface MusicPreset {
  id:          string;
  name:        string;
  description: string;
  vibe:        string;
  tags:        string[];
  intensity:   number;
  bpm:         number;
  scale:       Scale;
  root:        number;
  quantaCount: number;
  motionStyle: MotionStyle;
  roles:       Partial<Record<VoiceRole, RoleConfig>>;
  syncThreshold:  number;
  encounterR:     number;
  entainment:     number;
  eventRate:      number;
  reverbAmt:  number;
  delayAmt:   number;
  delayTime:  number;
  masterGain: number;
  harmonyMode: 'consonant' | 'dissonant' | 'modal' | 'free';
  particleGlow: number;
  trailLen:     number;
  lens:         MusicLens;
  bgPulse:      boolean;
  cinematic:    boolean;
  primary:   string;
  secondary: string;
  accent:    string;
  gateCount:      number;
  attractorCount: number;
}

// ── Cage (closed rect or circle that traps particles inside) ──────────────────
export interface Cage {
  id:          number;
  shape:       'rect' | 'circle';
  x:           number;  y: number;   // center
  w:           number;  h: number;   // rect half-dims (used when shape='rect')
  r:           number;               // radius (used when shape='circle')
  elasticity:  number;  // 0..1 bounce coefficient
  color:       string;
}

// ── Harmonic String (resonates when hit by particles, fires string notes) ──────
export interface HarmonicString {
  id:       number;
  x1: number; y1: number;
  x2: number; y2: number;
  tension:  number;   // 0..1 — affects pitch (shorter+higher tension = higher)
  vibAmp:   number;   // current vibration amplitude (0..1)
  vibPhase: number;   // vibration phase for animation
  decay:    number;   // vibration decay per second
  color:    string;
  lastHit:  number;   // seconds since last hit (cooldown)
}

// ── FX Zone (painted polygon area with audio/physics effect) ─────────────────
export type FxZoneEffect =
  | 'slow' | 'fast' | 'mute' | 'excite_zone'
  | 'pitch_up' | 'pitch_down' | 'reverse' | 'freeze_zone'
  | 'vortex_zone' | 'gravity_down' | 'gravity_up'
  | 'transpose' | 'harmonize_zone' | 'bounce'
  | 'compress_zone' | 'scatter_zone'
  | 'glitch' | 'tremolo' | 'pulse_beat' | 'warp'
  | 'phase_lock' | 'role_shift' | 'density_wave';

export interface FxZone {
  id:       number;
  pts:      [number, number][];  // polygon vertices in world coords
  effect:   FxZoneEffect;
  strength: number;   // 0..1
  param:    number;   // secondary param (e.g. semitones for transpose, force for vortex_zone)
  color:    string;
}

// ── User Interaction Matrix ───────────────────────────────────────────────────
// 8×8 VoiceRole × VoiceRole.  Values: -1 (repel) .. 0 (neutral) .. +1 (attract)
export type UserMatrix = Record<VoiceRole, Record<VoiceRole, number>>;

export function defaultUserMatrix(): UserMatrix {
  const roles: VoiceRole[] = ['KICK','BASS','PERC','PAD','LEAD','ARP','STRINGS','CHOIR'];
  const m: Partial<UserMatrix> = {};
  for (const a of roles) {
    m[a] = {} as Record<VoiceRole, number>;
    for (const b of roles) (m[a] as Record<VoiceRole, number>)[b] = 0;
  }
  return m as UserMatrix;
}

// ── Palette ───────────────────────────────────────────────────────────────────
export type PaletteMode = 'role' | 'mono' | 'neon' | 'heat' | 'earth' | 'plasma';
export interface CanvasPalette {
  mode:              PaletteMode;
  bgColor:           string;
  accent:            string;
  roleColorOverrides: Partial<Record<VoiceRole, string>>;
}
export const DEFAULT_PALETTE: CanvasPalette = {
  mode: 'role', bgColor: '#050810', accent: '#00d4ff', roleColorOverrides: {},
};