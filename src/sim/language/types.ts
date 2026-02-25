// ─────────────────────────────────────────────────────────────────────────────
// Language Lab – Core Types
// Heptapod Language Simulation (Ink Quanta)
// ─────────────────────────────────────────────────────────────────────────────

export type LangMode        = 'listen' | 'speak' | 'train';
export type DictionaryMode  = 'linear' | 'heptapod' | 'recursive' | 'experimental';
export type EntryStatus     = 'tentative' | 'accepted';
export type LensId          = 'world' | 'glyphs' | 'events' | 'map' | 'phase' | 'meaning';
export type OperatorKind    = 'CONVERGE' | 'DIVERGE' | 'SILENCE' | 'AMPLIFY' | 'CUT';
export type TrainChoice     = 'UNIR' | 'CORTAR' | 'ABRIR' | 'SILENCIAR';
export type WorldEventKind  = 'GLYPH_SHIFT' | 'PATTERN_STABLE' | 'SPEAK_EFFECT' | 'LOOP_DETECTED';
export type SymmetryBin     = 'low' | 'med' | 'high';
export type AxisBin         = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export type DensityBin      = 'sparse' | 'normal' | 'dense';
export type CoherenceBin    = 'chaos' | 'mixed' | 'coherent';
export type TensionBin      = 'calm' | 'mid' | 'tense';
export type NoveltyBin      = 'stale' | 'shifting' | 'novel';

// ── Ink Quantum ────────────────────────────────────────────────────────────────
export interface InkQuanta {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  phase: number;       // 0..2π
  phaseVel: number;    // rad/s
  charge: number;      // 0..1
  coherence: number;   // 0..1
  intent: number;      // -1..1  (converge < 0 vs diverge > 0)
  ink: number;         // 0..1  tinta disponível
  scribeAffinity: number; // 0..1  tendência a escrever loops
}

// ── Strokes (tinta depositada) ─────────────────────────────────────────────────
export interface StrokePoint { x: number; y: number; }

export interface Stroke {
  points: StrokePoint[];
  thickness: number;
  alpha: number;
  age: number;       // seconds elapsed
  maxAge: number;    // 30–60s
}

// ── Flow grid caligráfico (96×96) ──────────────────────────────────────────────
export interface FlowGrid {
  w: number; h: number;
  vx: Float32Array;
  vy: Float32Array;
}

// ── Snapshot para ring-buffer ──────────────────────────────────────────────────
export interface WorldSnapshot {
  time: number;
  densityGrid: Float32Array;   // coarse 16×16
  syncIndex: number;
  coherenceMean: number;
  loopCount: number;
  eventRate: number;
}

// ── World state ────────────────────────────────────────────────────────────────
export interface WorldState {
  quanta: InkQuanta[];
  strokes: Stroke[];
  flowGrid: FlowGrid;
  tick: number;
  time: number;             // seconds elapsed
  snapshots: WorldSnapshot[];
  snapshotInterval: number;  // seconds between snapshots
  lastSnapshotTime: number;
  recentEventCount: number;
  prevObservables: Observables | null;
}

// ── Observables (12 + 2 slots) ─────────────────────────────────────────────────
export interface Observables {
  densityMean: number;
  densityVariance: number;
  syncIndex: number;
  coherenceMean: number;
  coherenceVariance: number;
  loopCount: number;
  symmetryIndex: number;
  polarityAxis: number;    // 0..2π
  eventRate: number;
  noveltyIndex: number;
  tensionIndex: number;
  silenceIndex: number;
  slot13: number;
  slot14: number;
}

// ── GlyphSpec (forma heptapod vetorial) ────────────────────────────────────────
export interface OuterRing  { radius: number; thickness: number; roughness: number; }
export interface InnerRing  { radius: number; thickness: number; phaseOffset: number; }
export interface Notch      { angle: number; depth: number; width: number; }
export interface GlyphArc   { startAngle: number; endAngle: number; radius: number; thickness: number; }
export interface Blot       { angle: number; radius: number; size: number; alpha: number; }
export interface GlyphAxis  { angle: number; strength: number; }

export interface GlyphSpec {
  outerRing: OuterRing;
  innerRings: InnerRing[];   // 1–3
  notches: Notch[];
  arcs: GlyphArc[];
  blots: Blot[];
  axis: GlyphAxis;
  signatureHash: string;
  observables: Observables;
  timestamp: number;
  id: string;
}

// ── GlyphFeatures (parsed) ─────────────────────────────────────────────────────
export interface GlyphFeatures {
  ringCount: number;
  notchCount: number;
  arcCount: number;
  blotCount: number;
  symmetryBin: SymmetryBin;
  axisBin: AxisBin;
  densityBin: DensityBin;
  coherenceBin: CoherenceBin;
  tensionBin: TensionBin;
  noveltyBin: NoveltyBin;
  tokens: string[];
  embedding: number[];    // normalised numeric vector for clustering
}

// ── Lexicon ────────────────────────────────────────────────────────────────────
export interface LexiconExample {
  timestamp: number;
  snapshotMetrics: Partial<Observables>;
}

export interface LexiconEntry {
  glyphId: string;
  signatureHash: string;
  miniGlyphSpec: GlyphSpec;
  gloss: string;
  definition: string;
  usage: string;
  contrasts: string[];       // gloss strings
  tokens: string[];
  embedding: number[];
  examples: LexiconExample[];
  confidence: number;
  status: EntryStatus;
  needs_verification?: boolean;
  lastUpdated: number;
  tags: string[];
  clusterId: string;
  frequency: number;
}

// ── Glyph Act (Speak) ──────────────────────────────────────────────────────────
export interface GlyphAct {
  glyphId: string;
  kind: OperatorKind;
  strength: number;
  radius: number;
  duration: number;       // seconds remaining
  targetX: number;
  targetY: number;
  timestamp: number;
}

// ── Training ────────────────────────────────────────────────────────────────────
export interface TrainEvent {
  glyphId: string;
  question: string;
  choice: TrainChoice | null;
  timestamp: number;
}

// ── World events ────────────────────────────────────────────────────────────────
export interface WorldEvent {
  id: string;
  kind: WorldEventKind;
  timestamp: number;
  description: string;
  observablesBefore?: Partial<Observables>;
  observablesAfter?: Partial<Observables>;
}

// ── Lab params ──────────────────────────────────────────────────────────────────
export interface LanguageParams {
  agentCount: number;
  seed: number;
  timeScope: number;        // 0..1 (window size for observables)
  dance: number;            // 0..1 flow field strength
  entrainment: number;      // 0..1 phase sync strength
  inkDecay: number;         // 0..1 (maps to 60→30s stroke life)
  loopThreshold: number;    // 0..1 coherence threshold for loop tendency
  speakIntensity: number;   // 0..1
  dictionaryMode: DictionaryMode;
  llmAutoRefine: boolean;
  preset: string;
}

// ── LLM ────────────────────────────────────────────────────────────────────────
export interface LLMRefineOutput {
  gloss: string;
  definition: string;
  usage: string;
  contrasts: string[];
  tags: string[];
  confidence: number;
  needs_verification: boolean;
  rationale: string;
}

export interface LLMClusterOutput {
  clusters: { id: string; label: string; members: string[] }[];
  bridges: string[];
  notes: string;
}

export interface LLMStatus {
  state: 'idle' | 'loading' | 'ok' | 'error';
  lastError?: string;
  lastOutput?: string;
}

// ── Cluster (UI) ────────────────────────────────────────────────────────────────
export interface LexiconCluster {
  id: string;
  label: string;
  members: string[];
  color: string;
}

// ── Session ────────────────────────────────────────────────────────────────────
export interface LanguageSession {
  id: string;
  preset: string;
  seed: number;
  timestamp: number;
  glyphCount: number;
  lexiconSize: number;
}