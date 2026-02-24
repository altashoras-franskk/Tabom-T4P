// ─── Meta-Arte: Types ──────────────────────────────────────────────────────

export type QuantumRole = 'DRAW' | 'ERASE' | 'MASK' | 'STAMP' | 'FLOW' | 'GLYPH';
export type BlendMode = 'normal' | 'add' | 'multiply' | 'screen' | 'overlay';

// ── Boundary mode ─────────────────────────────────────────────────────────────
export type BoundaryMode = 'wrap' | 'bounce' | 'absorb' | 'open';

// ── NEW: Geometric primitives ─────────────────────────────────────────────────
export type QuantumKind =
  | 'point'           // default fluid blob
  | 'line'            // oriented line segment
  | 'arc'             // arc / partial circle
  | 'rect'            // wireframe rectangle
  | 'plane'           // filled translucent rectangle
  | 'gradientEmitter' // atmosphere halo (draws to base layer)
  | 'mask';           // clipping shape

export type GeoMode = 'fluid' | 'geometric' | 'hybrid' | '3d';

export interface GeoParams {
  mode: GeoMode;
  // ── 6 macro sliders ─────────────────────────────────────────────────────
  macroStructure: number;
  macroGesture: number;
  macroContrast: number;
  macroSilence: number;
  macroAtmosphere: number;
  macroCollage: number;
  // ── Advanced ─────────────────────────────────────────────────────────────
  snapAxes: number;
  gridStrength: number;
  gridSize: number;
  lineMastery: number;
  planeCasting: number;
  cutWindows: number;
  // ── Primitive mix ─────────────────────────────────────────────────────────
  mixPoint: number;
  mixLine: number;
  mixRect: number;
  mixArc: number;
  mixPlane: number;
  // ── Composition / FX / DNA coupling ──────────────────────────────────────
  shapeOpacity: number;
  fillSolidity: number;
  strokeWeight: number;
  shapeScale: number;
  rotationDrift: number;
  vignetteStr: number;
  grainStr: number;
  bloomShape: number;
  // ── 3D mode params ───────────────────────────────────────────────────────
  zDepth: number;
  orbitSpeed: number;
  camFOV: number;
  depthFog: number;
  light3D: number;
  particleSize3D: number;
  glowIntensity3D: number;
  waveZ: number;
  showGeoShapes?: boolean;
  solidShapes3D?: boolean;
  shapeGravity?: number;
  angleDamping?: number;
  // ── Canvas boundary ───────────────────────────────────────────────────────
  boundaryMode?: BoundaryMode;  // particle boundary behavior (default: 'wrap')
  showBorder?: boolean;          // draw canvas border indicator
  // ── 3D overlay flags ─────────────────────────────────────────────────────
  trails3D?: boolean;            // show memory trails in 3D
  trailLength3D?: number;        // 1..6 memory trail length
}

export type ToolId =
  // Live agent tools (shown in UI)
  | 'spawn_brush' | 'erase_agents'
  | 'attract' | 'repel' | 'vortex' | 'freeze' | 'burst' | 'black_hole'
  | 'color_infect' | 'size_wave' | 'ink_flood' | 'species_shift'
  | 'flow_paint' | 'channel' | 'pinch' | 'scatter_burst'
  // Legacy (backward compat only, hidden from UI)
  | 'ink_brush' | 'dust_brush' | 'glow_brush' | 'eraser' | 'mask_brush' | 'glyph_stamp'
  | 'attractor' | 'repulsor' | 'flow_comb' | 'cut_collage' | 'solve' | 'coagula';

export type LayerId = 'trail' | 'brush' | 'particles' | 'connections' | 'glow' | 'post';

export type Intention = 'ascension' | 'gravity' | 'conflict' | 'harmony' | 'ecstasy' | 'silence'
  | 'mondrian' | 'suprematist' | 'action' | 'minimal' | 'glitch' | 'botanical' | 'constellation' | 'none';

export type AgentShape = 'circle' | 'square' | 'diamond' | 'triangle' | 'cross' | 'star' | 'brush';

export type SpawnPattern =
  | 'scatter' | 'grid' | 'hex_grid' | 'ring' | 'spiral' | 'galaxy'
  | 'cross' | 'diagonal' | 'sine_wave' | 'clusters' | 'center_burst'
  | 'edges' | 'corners' | 'concentric' | 'flow_lines' | 'golden_spiral'
  | 'explosion' | 'yin_yang' | 'lattice' | 'noise_bands';

export interface Quantum {
  x: number; y: number;
  vx: number; vy: number;
  charge: number;
  ink: number;
  mood: number;
  role: QuantumRole;
  species: number;
  memX: Float32Array;
  memY: Float32Array;
  memIdx: number;
  age: number;
  hue: number; sat: number; lit: number;
  alpha: number;
  size: number;
  glyphIndex: number;
  baseHue?: number;
  isSingleton?: boolean; // true = this is the "big agent"
  // ── Geometric extensions (optional — undefined = point/fluid behaviour) ──
  kind?: QuantumKind;
  angle?: number;     // orientation 0..2π
  qscale?: number;    // shape size multiplier
  length?: number;    // for line / arc
  thickness?: number; // stroke width (px)
  fillAlpha?: number; // fill opacity for plane/rect
  qBlend?: string;    // CSS globalCompositeOperation hint
  clusterId?: number;
}

export interface FieldGrid {
  size: number;
  flowX: Float32Array;
  flowY: Float32Array;
  density: Float32Array;
  pressure: Float32Array;
  memory: Float32Array;
  symbol: Float32Array;
  mask: Float32Array;
  interactionMatrix: Float32Array;
}

export interface DNAGenes {
  structure: number;
  flow: number;
  entropy: number;
  memory: number;
  contrast: number;
  symmetry: number;
  glyphness: number;
  erosion: number;
  layering: number;
  rhythm: number;
  fragmentation: number;
  coherence: number;
  linear?: number;
  agentShape?: AgentShape;
  isolation?: number;  // 0 = full cross-species interaction, 1 = species fully isolated (chapado mode)
}

export interface DNA {
  id: string;
  genes: DNAGenes;
  intention: Intention;
  palette: string[];
  background: string;
  quantaCount: number;
  createdAt: number;
  name?: string;
}

export interface LayerState {
  id: LayerId;
  name: string;
  canvas: HTMLCanvasElement | null;
  opacity: number;
  blendMode: BlendMode;
  visible: boolean;
  locked: boolean;
}

export interface ToolState {
  activeToolId: ToolId;
  size: number;
  pressure: number;
  flow: number;
  hardness: number;
  colorIndex: number;
  glyphIndex: number;
  isDragging: boolean;
  lastX: number;
  lastY: number;
  sizeMul: number;
  dragDX: number;   // normalized drag direction x (for channel/flow tools)
  dragDY: number;   // normalized drag direction y
}

export interface OverlayFlags {
  connections: boolean;
  glow: boolean;
  pulse: boolean;
}

export interface ArchiveEntry {
  id: string;
  timestamp: number;
  dna: DNA;
  seed: number;
  thumbnail: string;
  gestures: GestureRecord[];
  note?: string;
  pinned: boolean;
  favorite: boolean;
}

export interface GrimoireEntry {
  id: string;
  timestamp: number;
  text: string;
  type: 'observation' | 'suggestion' | 'milestone';
}

export interface GestureRecord {
  toolId: ToolId;
  x: number; y: number;
  size: number;
  timestamp: number;
}

export interface MetricsSnapshot {
  density: number;
  contrast: number;
  novelty: number;
  silenceIndex: number;
  motifStability: number;
  symmetry: number;
  fragmentation: number;
}

export interface CuratorSuggestion {
  action: string;
  interpretation: string;
  variation: string;
}

export interface VitrineCard {
  id: string;
  dna: DNA;
  thumbnail: string;
  pinned: boolean;
  favorite: boolean;
  seed: number;
  label: string;
}

// ── Persistent Guide Structures ──────────────────────────────────────────────
export interface GuideLine {
  id: string;
  x1: number; y1: number;  // normalized 0..1
  x2: number; y2: number;
  type: 'flow' | 'pinch';
  color: string;
  strength: number;
}

export interface ChannelPath {
  id: string;
  points: [number, number][];  // normalized coords
  color: string;
  strength: number;
}

// ── Physics Config — direct physics overrides ─────────────────────────────────
export interface PhysicsConfig {
  rMaxMul:           number;  // 0.3..3.0 — interaction radius multiplier
  forceMul:          number;  // 0.1..4.0 — force scale multiplier
  dampingMul:        number;  // 0.5..1.5 — damping multiplier
  noiseMul:          number;  // 0..4.0   — noise/entropy multiplier
  maxSpeedMul:       number;  // 0.2..4.0 — max speed multiplier
  rMinMul:           number;  // 0.3..3.0 — core repulsion radius multiplier
  centerPull:        number;  // 0..1     — gentle pull toward canvas center
  quadrantMode:      boolean; // push species to quadrants
  quadrantStrength:  number;  // 0..1     — quadrant attraction strength
  borderRepulsion:   number;  // 0..1     — push agents away from borders
}

export function createDefaultPhysicsConfig(): PhysicsConfig {
  return {
    rMaxMul: 1.0, forceMul: 1.0, dampingMul: 1.0,
    noiseMul: 1.0, maxSpeedMul: 1.0, rMinMul: 1.0,
    centerPull: 0.0, quadrantMode: false, quadrantStrength: 0.3,
    borderRepulsion: 0.25,  // default: gentle push away from edges
  };
}

// ── Brush Texture Preset ──────────────────────────────────────────────────────
export interface BrushTexturePreset {
  id: string;
  label: string;
  emoji: string;
  lineCap: 'round' | 'butt' | 'square';
  opacityMul: number;      // base opacity multiplier
  opacityJitter: number;   // 0..1 random variation
  widthMul: number;        // stroke width multiplier
  widthJitter: number;     // 0..1 random variation
  lengthMul: number;       // stroke length multiplier
  bristles: number;        // 1..5 parallel strokes
  bristleSpread: number;   // spread of bristles in px
  edgeSoftness: number;    // 0..1 (uses blur pass)
  textureBreak: number;    // 0..1 opacity fragmentation (dry effect)
  bleed: number;           // 0..1 color spread / bloom
}

export const BRUSH_TEXTURE_PRESETS: BrushTexturePreset[] = [
  { id: 'molhado',    label: 'Molhado',    emoji: '💧', lineCap:'round',  opacityMul:0.7,  opacityJitter:0.15, widthMul:1.8, widthJitter:0.2,  lengthMul:1.2, bristles:1, bristleSpread:0,  edgeSoftness:0.6, textureBreak:0.0, bleed:0.5 },
  { id: 'seco',       label: 'Seco',       emoji: '🌵', lineCap:'square', opacityMul:0.5,  opacityJitter:0.5,  widthMul:1.4, widthJitter:0.4,  lengthMul:1.0, bristles:4, bristleSpread:3,  edgeSoftness:0.0, textureBreak:0.6, bleed:0.0 },
  { id: 'duro',       label: 'Duro',       emoji: '🪨', lineCap:'square', opacityMul:1.0,  opacityJitter:0.0,  widthMul:1.0, widthJitter:0.0,  lengthMul:1.0, bristles:1, bristleSpread:0,  edgeSoftness:0.0, textureBreak:0.0, bleed:0.0 },
  { id: 'macio',      label: 'Macio',      emoji: '🪶', lineCap:'round',  opacityMul:0.4,  opacityJitter:0.1,  widthMul:2.0, widthJitter:0.15, lengthMul:1.1, bristles:1, bristleSpread:0,  edgeSoftness:0.8, textureBreak:0.0, bleed:0.2 },
  { id: 'aquarela',   label: 'Aquarela',   emoji: '🎨', lineCap:'round',  opacityMul:0.3,  opacityJitter:0.2,  widthMul:2.5, widthJitter:0.3,  lengthMul:1.3, bristles:1, bristleSpread:0,  edgeSoftness:0.9, textureBreak:0.0, bleed:0.8 },
  { id: 'gouache',    label: 'Gouache',    emoji: '⬜', lineCap:'square', opacityMul:1.0,  opacityJitter:0.05, widthMul:1.2, widthJitter:0.05, lengthMul:0.9, bristles:1, bristleSpread:0,  edgeSoftness:0.0, textureBreak:0.0, bleed:0.0 },
  { id: 'nanquim',    label: 'Nanquim',    emoji: '🖋', lineCap:'round',  opacityMul:0.9,  opacityJitter:0.1,  widthMul:0.6, widthJitter:0.3,  lengthMul:1.4, bristles:1, bristleSpread:0,  edgeSoftness:0.0, textureBreak:0.1, bleed:0.0 },
  { id: 'crayon',     label: 'Crayon',     emoji: '🖍', lineCap:'round',  opacityMul:0.65, opacityJitter:0.35, widthMul:1.6, widthJitter:0.25, lengthMul:1.0, bristles:3, bristleSpread:2,  edgeSoftness:0.0, textureBreak:0.3, bleed:0.0 },
  { id: 'esmalte',    label: 'Esmalte',    emoji: '✨', lineCap:'round',  opacityMul:1.0,  opacityJitter:0.0,  widthMul:1.5, widthJitter:0.0,  lengthMul:0.8, bristles:1, bristleSpread:0,  edgeSoftness:0.3, textureBreak:0.0, bleed:0.3 },
  { id: 'carvao',     label: 'Carvão',     emoji: '⬛', lineCap:'square', opacityMul:0.6,  opacityJitter:0.3,  widthMul:2.2, widthJitter:0.35, lengthMul:1.0, bristles:3, bristleSpread:4,  edgeSoftness:0.1, textureBreak:0.25,bleed:0.0 },
  { id: 'aerografo',  label: 'Aerógrafo',  emoji: '🌫', lineCap:'round',  opacityMul:0.2,  opacityJitter:0.05, widthMul:3.5, widthJitter:0.1,  lengthMul:1.5, bristles:1, bristleSpread:0,  edgeSoftness:1.0, textureBreak:0.0, bleed:0.4 },
  { id: 'faca',       label: 'Faca',       emoji: '🔪', lineCap:'butt',   opacityMul:0.95, opacityJitter:0.1,  widthMul:2.8, widthJitter:0.15, lengthMul:0.7, bristles:1, bristleSpread:0,  edgeSoftness:0.0, textureBreak:0.0, bleed:0.0 },
  { id: 'pena',       label: 'Pena',       emoji: '🪶', lineCap:'round',  opacityMul:0.85, opacityJitter:0.2,  widthMul:0.4, widthJitter:0.5,  lengthMul:1.6, bristles:1, bristleSpread:0,  edgeSoftness:0.0, textureBreak:0.15,bleed:0.0 },
  { id: 'giz',        label: 'Giz',        emoji: '🏫', lineCap:'round',  opacityMul:0.55, opacityJitter:0.4,  widthMul:1.8, widthJitter:0.3,  lengthMul:1.0, bristles:2, bristleSpread:2,  edgeSoftness:0.0, textureBreak:0.5, bleed:0.0 },
  { id: 'grafite',    label: 'Grafite',    emoji: '📝', lineCap:'round',  opacityMul:0.7,  opacityJitter:0.15, widthMul:0.8, widthJitter:0.15, lengthMul:1.1, bristles:2, bristleSpread:1,  edgeSoftness:0.0, textureBreak:0.1, bleed:0.0 },
  { id: 'acrilica',   label: 'Acrílica',   emoji: '🎭', lineCap:'round',  opacityMul:0.8,  opacityJitter:0.1,  widthMul:1.3, widthJitter:0.1,  lengthMul:1.0, bristles:1, bristleSpread:0,  edgeSoftness:0.1, textureBreak:0.05,bleed:0.1 },
];