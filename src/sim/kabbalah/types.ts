// ─────────────────────────────────────────────────────────────────────────────
// Tree of Life Lab — Core Types (Hermetic Qabalah / Golden Dawn)
// ─────────────────────────────────────────────────────────────────────────────

export type SephirahId =
  | 'kether' | 'chokmah' | 'binah'
  | 'chesed' | 'geburah' | 'tiphereth'
  | 'netzach' | 'hod' | 'yesod' | 'malkuth';

export type PillarId = 'mercy' | 'severity' | 'balance';

export type MajorArcanaId = number; // 0–21

export type DeckLensId = 'rws' | 'marseille' | 'thoth';

export type OperatorKind =
  | 'OPEN_GATE' | 'CLOSE_GATE'
  | 'AMPLIFY'   | 'SILENCE'
  | 'CONVERGE'  | 'DIVERGE'
  | 'CUT'       | 'BALANCE'
  | 'SHOCK'     | 'LOOP'
  | 'BRIDGE'    | 'DELAY'
  | 'MEMORY'    | 'STABILIZE'
  | 'REVIEW'    | 'INTEGRATE'
  | 'CLARIFY'   | 'RITUAL_PULSE'
  | 'SPEED'     | 'SLOW'
  | 'INVOKE'    | 'BANISH'
  | 'TRANSMUTE' | 'SEAL';

export type TargetType = 'sephirah' | 'path' | 'global';

// ── Ritual Tool IDs ──────────────────────────────────────────────────────────
export type RitualToolId =
  | 'select' | 'drag' | 'invoke' | 'banish'
  | 'trace'  | 'seal' | 'transmute' | 'portal';

export interface RitualTool {
  id:    RitualToolId;
  icon:  string;
  label: string;
  color: string;
  desc:  string;
}

export const RITUAL_TOOLS: RitualTool[] = [
  { id: 'select',    icon: '◇', label: 'Scry',       color: '#94a3b8', desc: 'Inspect any element on the Tree' },
  { id: 'drag',      icon: '✋', label: 'Drag',       color: '#e2e8f0', desc: 'Move sephiroth and paths' },
  { id: 'invoke',    icon: '✦', label: 'Invoke',     color: '#ffd060', desc: 'Channel energy into a sephirah' },
  { id: 'banish',    icon: '✕', label: 'Banish',     color: '#ff6040', desc: 'Dispel blockages and excess' },
  { id: 'trace',     icon: '⊕', label: 'Trace',      color: '#60c0ff', desc: 'Draw the Lightning Flash path' },
  { id: 'seal',      icon: '■', label: 'Seal',       color: '#34d399', desc: 'Lock energy into crystalline form' },
  { id: 'transmute', icon: '◐', label: 'Transmute',  color: '#a78bfa', desc: 'Alchemical transformation of forces' },
  { id: 'portal',    icon: '◉', label: 'Portal',     color: '#f472b6', desc: 'Open a gateway between worlds' },
];

// ── Overlay layers ───────────────────────────────────────────────────────────
export type TreeOverlay =
  | 'sephiroth' | 'paths' | 'orYashar' | 'orChozer'
  | 'pillars' | 'aura' | 'particles' | 'veils';

// ── Sephirah runtime state ───────────────────────────────────────────────────
export interface SephirahState {
  id:        SephirahId;
  charge:    number; // 0..1  energy / light level
  coherence: number; // 0..1  order / stability / purity
  tension:   number; // 0..1  conflict / astral friction
  openness:  number; // 0..1  receptivity / gate aperture
  memory:    number; // 0..1  accumulated pattern / karma
}

// ── Path runtime state ───────────────────────────────────────────────────────
export interface PathState {
  pathId:    number;
  flow:      number; // 0..1
  blockage:  number; // 0..1
  pulseAcc:  number;
  recentOps: OperatorKind[];
}

// ── World state ──────────────────────────────────────────────────────────────
export interface TreeState {
  sephirot:        Map<SephirahId, SephirahState>;
  paths:           Map<number, PathState>;
  tick:            number;
  time:            number;
  globalCoherence: number;
  globalTension:   number;
  expansionAccum:  number;
  severityAccum:   number;
  events:          TreeEvent[];
  novelty:         number;
  veilsEnabled:    boolean;
  pillarsEnabled:  boolean;
}

// ── Events ───────────────────────────────────────────────────────────────────
export type TreeEventKind =
  | 'DISSOLUTION' | 'CRYSTALLIZATION'
  | 'VEIL_BREACH' | 'CHAPTER_CLOSE'
  | 'BALANCE_ACHIEVED' | 'SHOCK_WAVE'
  | 'GRADE_ADVANCEMENT' | 'QLIPHOTIC_WARNING'
  | 'GREAT_WORK_PULSE';

export interface TreeEvent {
  id:          string;
  kind:        TreeEventKind;
  timestamp:   number;
  description: string;
}

// ── Card play ────────────────────────────────────────────────────────────────
export interface CardPlay {
  arcanaId:   MajorArcanaId;
  reversed:   boolean;
  targetType: TargetType;
  targetId:   SephirahId | number | 'global';
  timestamp:  number;
  lensId:     DeckLensId;
}

// ── Grimoire chapter ─────────────────────────────────────────────────────────
export interface GrimoireChapter {
  id:         string;
  timestamp:  number;
  lens:       DeckLensId;
  preset:     string;
  cards:      CardPlay[];
  snapshot: {
    coherence: number;
    tension:   number;
    memory:    number;
    openness:  number;
    novelty:   number;
  };
  deltas: {
    coherence: number;
    tension:   number;
    memory:    number;
    openness:  number;
    novelty:   number;
  };
  tags:       OperatorKind[];
  text:       string;
}

// ── Deck lens definition ─────────────────────────────────────────────────────
export interface ArcanaLensData {
  name:      string;
  keywords:  [string, string, string];
  tone:      'logical' | 'imaginal' | 'ritual';
  microNote: string;
}

export interface DeckLens {
  id:          DeckLensId;
  label:       string;
  description: string;
  tradition:   string;
  majors:      Record<number, ArcanaLensData>;
  bias: {
    operators: Partial<Record<OperatorKind, number>>;
  };
  mentorTone:  string;
}

// ── Arcana operator mapping ──────────────────────────────────────────────────
export interface ArcanaOperator {
  primary:   OperatorKind;
  secondary?: OperatorKind;
  magnitude: number;
  reversed: {
    primary:   OperatorKind;
    secondary?: OperatorKind;
    costFactor: number;
  };
}

export interface ArcanaDefinition {
  id:             MajorArcanaId;
  canonicalName:  string;
  hebrewLetter:   string;
  symbol:         string;
  pillarAffinity: PillarId | 'all';
  operator:       ArcanaOperator;
  pathId:         number;
}

// ── Preset ───────────────────────────────────────────────────────────────────
export interface JourneyPreset {
  id:              string;
  name:            string;
  emoji:           string;
  description:     string;
  recommendedLens: DeckLensId;
  drawRate:        3 | 4 | 5;
  strictness:      number;
  veilsEnabled:    boolean;
  pillarsEnabled:  boolean;
  initialState:    Partial<Record<SephirahId, Partial<SephirahState>>>;
  gdGrade?:        string;
  ritualTheme?:    string;
}

// ── Lab params (user-controlled) ─────────────────────────────────────────────
export interface TreeOfLifeParams {
  deckLens:       DeckLensId;
  preset:         string;
  veilsEnabled:   boolean;
  pillarsEnabled: boolean;
  drawRate:       3 | 4 | 5;
  strictness:     number;
  ritualIntensity: number; // 0..1
  astralClarity:   number; // 0..1
  speed:           number; // simulation speed multiplier
}

// ── Mystical Journey questionnaire ───────────────────────────────────────────
export interface JourneyQuestion {
  id:      string;
  text:    string;
  low:     string;
  high:    string;
  params:  (keyof TreeOfLifeParams | 'charge' | 'coherence' | 'tension' | 'openness' | 'memory')[];
}

// ── backward compat alias ────────────────────────────────────────────────────
export type KabbalahEvent = TreeEvent;
export type KabbalahEventKind = TreeEventKind;
