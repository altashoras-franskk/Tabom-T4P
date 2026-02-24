// ─────────────────────────────────────────────────────────────────────────────
// Tree of Life Lab — Core Types
// Kabbalah + Tarot Journey Simulator
// ─────────────────────────────────────────────────────────────────────────────

export type SephirahId =
  | 'kether' | 'chokmah' | 'binah'
  | 'chesed' | 'geburah' | 'tiphereth'
  | 'netzach' | 'hod' | 'yesod' | 'malkuth';

export type PillarId = 'mercy' | 'severity' | 'balance';

// 0..21 — The Fool to The World
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
  | 'SPEED'     | 'SLOW';

export type TargetType = 'sephirah' | 'path' | 'global';

// ── Sephirah runtime state ────────────────────────────────────────────────────
export interface SephirahState {
  id:        SephirahId;
  charge:    number; // 0..1  energy level
  coherence: number; // 0..1  order/stability
  tension:   number; // 0..1  conflict/stress
  openness:  number; // 0..1  receptivity to travellers
  memory:    number; // 0..1  accumulated pattern history
}

// ── Path runtime state ────────────────────────────────────────────────────────
export interface PathState {
  pathId:   number;  // 11..32
  flow:     number;  // 0..1 how much passes through
  blockage: number;  // 0..1 resistance
  pulseAcc: number;  // 0..1 internal accumulator for RITUAL_PULSE
  recentOps: OperatorKind[];
}

// ── World state ───────────────────────────────────────────────────────────────
export interface TreeState {
  sephirot:        Map<SephirahId, SephirahState>;
  paths:           Map<number, PathState>;
  tick:            number;
  time:            number;
  globalCoherence: number;
  globalTension:   number;
  expansionAccum:  number; // tracks Chesed dominance over time
  severityAccum:   number; // tracks Geburah dominance over time
  events:          KabbalahEvent[];
  novelty:         number;
  veilsEnabled:    boolean;
  pillarsEnabled:  boolean;
}

// ── Events ────────────────────────────────────────────────────────────────────
export type KabbalahEventKind =
  | 'DISSOLUTION' | 'CRYSTALLIZATION'
  | 'VEIL_BREACH' | 'CHAPTER_CLOSE'
  | 'BALANCE_ACHIEVED' | 'SHOCK_WAVE';

export interface KabbalahEvent {
  id:          string;
  kind:        KabbalahEventKind;
  timestamp:   number;
  description: string;
}

// ── Card play ─────────────────────────────────────────────────────────────────
export interface CardPlay {
  arcanaId:   MajorArcanaId;
  reversed:   boolean;
  targetType: TargetType;
  targetId:   SephirahId | number | 'global';
  timestamp:  number;
  lensId:     DeckLensId;
}

// ── Grimoire chapter ──────────────────────────────────────────────────────────
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
  llmInterpretation?: {
    summary:            string;
    reading:            string;
    suggestion:         string;
    confidence:         number;
    needs_verification: boolean;
  };
}

// ── Deck lens definition ──────────────────────────────────────────────────────
export interface ArcanaLensData {
  name:      string;
  keywords:  [string, string, string]; // triad
  tone:      'logical' | 'imaginal' | 'ritual';
  microNote: string; // 1-sentence description
}

export interface DeckLens {
  id:          DeckLensId;
  label:       string;
  description: string;
  majors:      Record<number, ArcanaLensData>;
  bias: {
    operators: Partial<Record<OperatorKind, number>>; // multiplier 0.9..1.2
  };
  mentorTone:  string;
}

// ── Arcana operator mapping ───────────────────────────────────────────────────
export interface ArcanaOperator {
  primary:   OperatorKind;
  secondary?: OperatorKind;
  magnitude: number; // base strength 0..1
  reversed: {
    primary:   OperatorKind;
    secondary?: OperatorKind;
    costFactor: number; // extra tension cost
  };
}

export interface ArcanaDefinition {
  id:            MajorArcanaId;
  canonicalName: string;    // base name across all decks
  hebrewLetter:  string;
  symbol:        string;    // unicode glyph for UI
  pillarAffinity: PillarId | 'all';
  operator:      ArcanaOperator;
  pathId:        number;    // canonical path (11..32) this arcana governs
}

// ── Preset ────────────────────────────────────────────────────────────────────
export interface JourneyPreset {
  id:            string;
  name:          string;
  emoji:         string;
  description:   string;
  recommendedLens: DeckLensId;
  drawRate:      3 | 4 | 5;
  strictness:    number; // 0..1
  veilsEnabled:  boolean;
  pillarsEnabled: boolean;
  initialState:  Partial<Record<SephirahId, Partial<SephirahState>>>;
}

// ── Lab params (user-controlled) ──────────────────────────────────────────────
export interface TreeOfLifeParams {
  deckLens:       DeckLensId;
  preset:         string;
  veilsEnabled:   boolean;
  pillarsEnabled: boolean;
  drawRate:       3 | 4 | 5;
  strictness:     number;
}
