// ─── Sociogenesis Study Mode — Types ─────────────────────────────────────────
// Agents = social actors. Groups = identity coalitions.
// Symbols (Totem/Tabu/Ritual) = laws inscribed in the field.

export const MAX_STUDY_AGENTS = 200;
export const MAX_STUDY_GROUPS = 5;

export const GROUP_COLORS: readonly string[] = [
  '#ff6b6b', // red     — Group 0
  '#4ecdc4', // teal    — Group 1
  '#ffd93d', // yellow  — Group 2
  '#6bcb77', // green   — Group 3
  '#a78bfa', // purple  — Group 4
];

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

  // Core social traits
  opinion:    number;  // -1..1 — ideological position
  trust:      number;  // 0..1  — openness to influence
  aggression: number;  // 0..1  — out-group hostility
  need:       number;  // 0..1  — belonging drive

  // Goal (set by macroTick, consumed by microTick)
  goalX: number;
  goalY: number;

  // Short memory (last 3 encounters)
  memory: Encounter[];

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
}

// ── Symbols — laws inscribed in field + behaviour ─────────────────────────────

export type TotemKind   = 'BOND' | 'RIFT';
export type TabuKind    = 'NO_ENTER' | 'NO_MIX';
export type RitualKind  = 'GATHER' | 'PROCESSION';

export interface StudyTotem {
  id: string;
  kind: TotemKind;
  x: number; y: number;
  radius: number;
  groupId: number;        // for RIFT — which group's L it boosts
  pulseStrength: number;  // N/L deposit amount per macroTick
  bornAt: number;
}

export interface StudyTabu {
  id: string;
  kind: TabuKind;
  x: number; y: number;
  radius: number;
  severity: number;       // 0..1 — how harsh the punishment
  bornAt: number;
  violationCount: number; // tracked per macroTick window
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
}

export interface StudySymbols {
  totems:  StudyTotem[];
  tabus:   StudyTabu[];
  rituals: StudyRitual[];
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

  // Coercion / Exception
  violationThreshold: number;  // violations per minute to trigger exception
  exceptionDuration:  number;  // seconds
  autoSymbols: boolean;         // engine auto-places symbols when conditions emerge
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
}

// ── Metrics ───────────────────────────────────────────────────────────────────
export type StudyPhase =
  | 'SWARM'
  | 'CLUSTERS'
  | 'POLARIZED'
  | 'CONFLICT'
  | 'CONSENSUS'
  | 'EXCEPTION';

export interface StudyMetrics {
  cohesion:     number;  // 0..1
  polarization: number;  // 0..1
  conflict:     number;  // 0..1
  consensus:    number;  // 0..1
  phase:        StudyPhase;
}

// ── Lens / Tool ───────────────────────────────────────────────────────────────
export type StudyLens = 'off' | 'groups' | 'power' | 'economy' | 'events' | 'field';
export type StudyTool = 'select' | 'totem_bond' | 'totem_rift' | 'tabu_enter' | 'tabu_mix' | 'ritual_gather' | 'ritual_procession';

// ── Events / Pings ────────────────────────────────────────────────────────────
export interface StudyEvent {
  time:    number;
  icon:    string;
  message: string;
  color:   string;
}

export interface StudyPing {
  x: number; y: number;
  message: string; color: string;
  bornAt: number; ttl: number; age: number;
}

// ── Factories ─────────────────────────────────────────────────────────────────
export function createStudyConfig(): StudyConfig {
  return {
    agentCount: 160, groupCount: 4,
    speed: 0.45, friction: 0.88, rMax: 0.30,
    autonomy: 0.55, cohesion: 0.50, pressure: 0.35,
    aggressionBase: 0.25, trustBase: 0.55, needBase: 0.60,
    macroTickSec: 1.0,
    kBelief: 0.40, kFear: 0.35, kDesire: 0.30,
    harvestRate: 0.06, decayWealth: 0.012,
    ideologyPressure: 0.25,
    violationThreshold: 3, exceptionDuration: 25,
    autoSymbols: true,
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
  };
}

export function createStudyMetrics(): StudyMetrics {
  return { cohesion: 0.2, polarization: 0.1, conflict: 0.05, consensus: 0.5, phase: 'SWARM' };
}