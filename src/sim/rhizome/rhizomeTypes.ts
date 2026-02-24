// ── Rhizome: Types, Params & Presets ──────────────────────────────────────────

export const MAX_NODES       = 180;
export const CANVAS_PAD      = 30;
export const LONG_LINK_DISTANCE = 160;
export const ENTRY_START     = 3;
export const BASE_NODE_RADIUS = 3.5;

// ── Node ──────────────────────────────────────────────────────────────────────
export interface RhizomeNode {
  id:          number;
  x:           number;
  y:           number;
  vx:          number;
  vy:          number;
  heat:        number;   // 0..1
  isEntry:     boolean;
  age:         number;   // seconds
  connections: Map<number, number>; // nodeId -> weight
  // Optional label overlay (from LLM or user)
  label?:       string;
  description?: string;
  connectionsLabels?: string[];
  category?:    string;
  pinned?:      boolean;
  userPlaced?:  boolean;
  isAnchor?:    boolean;
  relevance?:   number;   // 0..1 from LLM — drives size + distance
  popularity?:  number;   // 0..1 from LLM — drives heat/brightness
}

// ── Simulation Params (10 physics controls) ───────────────────────────────────
export interface RhizomeParams {
  organismToIntensity: number; // 0..1
  visibility:          number; // 0..1
  noise:               number; // 0..1
  density:             number; // 0..1
  multiplicidade:      number; // 0..1
  linhasDeFuga:        number; // 0..1
  territorializacao:   number; // 0..1
  reterritorializacao: number; // 0..1
  hubs:                number; // 0..1
  esquecimento:        number; // 0..1
}

export const DEFAULT_PARAMS: RhizomeParams = {
  organismToIntensity: 0.38,
  visibility:          0.70,
  noise:               0.07,
  density:             0.32,
  multiplicidade:      0.42,
  linhasDeFuga:        0.28,   // enough long-range flights to span canvas
  territorializacao:   0.15,   // LOW → long spring rest lengths → nodes spread out
  reterritorializacao: 0.35,
  hubs:                0.22,
  esquecimento:        0.12,
};

// ── Aesthetics ────────────────────────────────────────────────────────────────
export interface RhizomeAesthetics {
  bgColor:        string;
  nodeColor:      string;
  entryColor:     string;
  hubColor:       string;
  hotColor:       string;
  linkColor:      string;
  flightColor:    string;
  labelColor:     string;
  glowIntensity:  number;
  nodeSize:       number;
  linkOpacity:    number;
  linkWidth:      number;
  showLabels:     boolean;
  labelSize:      number;
  // ── Search semantic mappings ─────────────────────────────────────────
  relSizeScale:   number;  // 0..1 → how much relevance enlarges nodes
  connSizeScale:  number;  // 0..1 → how much connections count enlarges nodes
  relDistScale:   number;  // 0..1 → relevance pulls nodes closer to anchor
}

export const DEFAULT_AESTHETICS: RhizomeAesthetics = {
  bgColor:        '#000000',
  nodeColor:      '#e0e0e0',
  entryColor:     '#ffffff',
  hubColor:       '#b0b0b0',
  hotColor:       '#ffffff',
  linkColor:      '#2a2a2a',
  flightColor:    '#555555',
  labelColor:     '#ffffff',
  glowIntensity:  0.0,
  nodeSize:       0.48,
  linkOpacity:    0.60,
  linkWidth:      0.38,
  showLabels:     false,
  labelSize:      0.30,
  relSizeScale:   0.55,   // relevance visibly enlarges key concepts
  connSizeScale:  0.55,   // connectivity visibly enlarges hubs
  relDistScale:   0.50,   // relevant nodes sit closer to anchor
};

// ── 3D Camera ─────────────────────────────────────────────────────────────────
export interface Camera3D {
  rotX:       number;   // pitch  ±π/2
  rotY:       number;   // yaw    unbounded
  rotZ:       number;   // roll   ±π
  zoom:       number;   // dolly  0.1..5
  fov:        number;   // FOV multiplier 0.2..1.5
  zSpread:    number;   // Z depth spread 40..500
  fog:        number;   // depth fog 0..1
  autoRotate: boolean;
  autoSpeed:  number;   // rad/s
  panX:       number;   // screen-space offset
  panY:       number;
}

export const DEFAULT_CAMERA3D: Camera3D = {
  rotX: 0.22, rotY: 0, rotZ: 0,
  zoom: 1.0, fov: 0.55, zSpread: 500,   // max extrude por padrão
  fog: 0.55, autoRotate: false, autoSpeed: 0.18,
  panX: 0, panY: 0,
};

// ── Simulation State ──────────────────────────────────────────────────────────
export interface RhizomeState {
  nodes:          RhizomeNode[];
  nextId:         number;
  params:         RhizomeParams;
  aesthetics:     RhizomeAesthetics;
  growthTimer:    number;
  entryTimer:     number;
  forgetTimer:    number;
  reterritTimer:  number;
  seed:           number;
  rngState:       number;
  searchMode?:    boolean;  // when true: freeze organic growth + disable random capture
}

// ── Metrics ───────────────────────────────────────────────────────────────────
export interface RhizomeMetrics {
  nodeCount:     number;
  entryCount:    number;
  longLinkCount: number;
  avgDegree:     number;
  hubness:       number;
  isolatedCount: number;
}

// ── Preset ────────────────────────────────────────────────────────────────────
export interface RhizomePreset {
  name:        string;
  description: string;
  params:      RhizomeParams;
}

export const RHIZOME_PRESETS: RhizomePreset[] = [
  {
    name: 'Open Rhizome',
    description: 'Multiplas entradas, baixa hierarquia, rede respira e se espalha.',
    params: {
      organismToIntensity: 0.65, visibility: 0.75, noise: 0.18, density: 0.60,
      multiplicidade: 0.85, linhasDeFuga: 0.55, territorializacao: 0.30,
      reterritorializacao: 0.25, hubs: 0.10, esquecimento: 0.28,
    },
  },
  {
    name: 'Territorial Clusters',
    description: 'Territorios fortes e consolidados. Assentamentos e bordas claras.',
    params: {
      organismToIntensity: 0.60, visibility: 0.70, noise: 0.10, density: 0.70,
      multiplicidade: 0.55, linhasDeFuga: 0.20, territorializacao: 0.85,
      reterritorializacao: 0.75, hubs: 0.25, esquecimento: 0.18,
    },
  },
  {
    name: 'Line of Flight',
    description: 'Pontes longas surgem o tempo todo. Saltos e conexoes improvaveis.',
    params: {
      organismToIntensity: 0.72, visibility: 0.80, noise: 0.22, density: 0.50,
      multiplicidade: 0.75, linhasDeFuga: 0.90, territorializacao: 0.35,
      reterritorializacao: 0.28, hubs: 0.18, esquecimento: 0.22,
    },
  },
  {
    name: 'Forgetting Storm',
    description: 'Poda agressiva. Ruinas e renascimentos continuos.',
    params: {
      organismToIntensity: 0.55, visibility: 0.65, noise: 0.15, density: 0.60,
      multiplicidade: 0.60, linhasDeFuga: 0.40, territorializacao: 0.55,
      reterritorializacao: 0.40, hubs: 0.25, esquecimento: 0.92,
    },
  },
  {
    name: 'Hub Temptation',
    description: 'A rede tenta virar tronco. Hubs crescem, mas entradas ainda competem.',
    params: {
      organismToIntensity: 0.60, visibility: 0.75, noise: 0.10, density: 0.65,
      multiplicidade: 0.55, linhasDeFuga: 0.22, territorializacao: 0.55,
      reterritorializacao: 0.55, hubs: 0.88, esquecimento: 0.22,
    },
  },
  {
    name: 'Anti-Hierarchy',
    description: 'Sem troncos. Muitas entradas e pontes leves, sempre distribuido.',
    params: {
      organismToIntensity: 0.70, visibility: 0.80, noise: 0.22, density: 0.58,
      multiplicidade: 0.92, linhasDeFuga: 0.38, territorializacao: 0.30,
      reterritorializacao: 0.18, hubs: 0.00, esquecimento: 0.38,
    },
  },
  {
    name: 'Crystal Garden',
    description: 'Rede estavel, quase mineral. Crescimento lento e coesao alta.',
    params: {
      organismToIntensity: 0.50, visibility: 0.60, noise: 0.05, density: 0.42,
      multiplicidade: 0.38, linhasDeFuga: 0.08, territorializacao: 0.72,
      reterritorializacao: 0.88, hubs: 0.28, esquecimento: 0.08,
    },
  },
  {
    name: 'Schizo Drift',
    description: 'Alta deriva e novidade. Instavel, multiplo e eletrico.',
    params: {
      organismToIntensity: 0.82, visibility: 0.88, noise: 0.38, density: 0.72,
      multiplicidade: 0.88, linhasDeFuga: 0.75, territorializacao: 0.22,
      reterritorializacao: 0.12, hubs: 0.12, esquecimento: 0.58,
    },
  },
  {
    name: 'Vacuum Explorers',
    description: 'Nos solitarios navegam o vazio ate serem capturados por linhas de fuga.',
    params: {
      organismToIntensity: 0.75, visibility: 0.78, noise: 0.28, density: 0.45,
      multiplicidade: 0.50, linhasDeFuga: 0.80, territorializacao: 0.18,
      reterritorializacao: 0.20, hubs: 0.08, esquecimento: 0.35,
    },
  },
];

// ── Param metadata for HUD ────────────────────────────────────────────────────
export interface ParamMeta {
  key:      keyof RhizomeParams;
  label:    string;
  tooltip?: string;
}

export const PARAM_METAS: ParamMeta[] = [
  { key: 'organismToIntensity', label: 'Intensidade' },
  { key: 'visibility', label: 'Visibilidade' },
  { key: 'noise', label: 'Ruído / Deriva' },
  { key: 'density', label: 'Densidade' },
  {
    key: 'multiplicidade', label: 'Multiplicidade',
    tooltip: 'Multiplica pontos de entrada. Mais = mais inicios, mais territorios, menos centro unico.',
  },
  {
    key: 'linhasDeFuga', label: 'Linhas de Fuga',
    tooltip: 'Força que atrai nos para conexoes de longa distancia. Nodes navegam o vacuo ate serem capturados.',
  },
  {
    key: 'territorializacao', label: 'Territorializacao',
    tooltip: 'Puxa formacoes para territorios. Mais = clusters; menos = deriva livre.',
  },
  {
    key: 'reterritorializacao', label: 'Reterritorializacao',
    tooltip: 'Consolida ligacoes locais. Mais = cristalizacao; menos = rede solta.',
  },
  {
    key: 'hubs', label: 'Hubs',
    tooltip: 'Tendencia a hierarquia por anexacao preferencial. Mais = troncos; menos = distribuicao.',
  },
  {
    key: 'esquecimento', label: 'Esquecimento',
    tooltip: 'Poda e renova. Mais = cortes e renascimentos; menos = acumulo e saturacao.',
  },
];

// ── LLM Integration Types ─────────────────────────────────────────────────────
// These types define the architecture for connecting a language model
// to generate epistemological rhizomes from any knowledge domain.

export type LLMDepth    = 'shallow' | 'medium' | 'deep';
export type LLMProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';
export type LLMMode =
  | 'concepts'      // default — mixed concepts + people
  | 'names_only'    // only researchers / thinkers / people
  | 'person_theory' // key concepts, books, terms from a specific thinker
  | 'study_order'   // sequential learning path (numbered steps)
  | 'controversies' // debates, tensions, opposing schools
  | 'keywords';     // dense keyword cloud, no descriptions
export type LLMStatus   = 'idle' | 'loading' | 'done' | 'error';

/** Per-node definition returned by the LLM */
export interface LLMNodeDef {
  label:        string;
  description?: string;
  category?:    string;
  isEntry?:     boolean;
  connections:  string[];
  relevance?:   number;
  popularity?:  number;
  directLink?:  boolean;
  order?:       number;  // study_order mode: sequential step index
}

/** Request sent to the LLM service */
export interface LLMRhizomeRequest {
  topic:        string;
  depth:        LLMDepth;
  nodeCount:    number;
  provider:     LLMProvider;
  apiKey?:      string;
  modelId?:     string;
  llmMode?:     LLMMode;
  customPrompt?: string;   // override prompt for the selected mode
}

/** Response from the LLM service */
export interface LLMRhizomeResponse {
  nodes:        LLMNodeDef[];
  title:        string;
  description:  string;
  generatedAt:  number;         // timestamp
}