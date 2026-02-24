// ── Rhizome Search — Types & Interfaces ────────────────────────────────────────
// Complete type system for LLM-powered knowledge map generation

export type MapSize = 'small' | 'medium' | 'large';
export type OutputStyle = 'concepts' | 'people_works' | 'methods' | 'balanced';
export type NodeType = 'concept' | 'person' | 'work' | 'method' | 'discipline';
export type ClusterColorHint = string; // hex color
export type Confidence = number; // 0..1

// ── Map Size Configuration ────────────────────────────────────────────────────
export const MAP_SIZE_NODE_COUNT: Record<MapSize, number> = {
  small: 40,
  medium: 80,
  large: 150,
};

// ── Rendering Constants ───────────────────────────────────────────────────────
export const MAX_VISIBLE_LINKS = 160; // Performance limit for large maps
export const BRIDGE_HALO_RADIUS = 8; // Visual indicator for bridge nodes

// ── Bibliography Entry ────────────────────────────────────────────────────────
export interface BibliographyEntry {
  title: string;
  author: string | null;
  year: number | null;
  doi_or_isbn: string | null;
  confidence: Confidence;
  needs_verification: boolean;
}

// ── Node Inspector Data ───────────────────────────────────────────────────────
export interface NodeInspectorData {
  bullets: string[];              // exactly 3 bullets
  connections: string[];          // node ids (3-8)
  search_queries: string[];       // 5-10 queries for research
  bibliography: BibliographyEntry[];
}

// ── Knowledge Map Node ────────────────────────────────────────────────────────
export interface KnowledgeNode {
  id: string;
  label: string;
  type: NodeType;
  cluster: string;
  importance: number;             // 0..1
  keywords: string[];             // 3-8 keywords
  inspector: NodeInspectorData;
  // Runtime rendering data
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

// ── Knowledge Map Edge ────────────────────────────────────────────────────────
export interface KnowledgeEdge {
  source: string;
  target: string;
  weight: number;                 // 0..1
  relation: string;               // "influences", "contrasts", "method_for", etc.
  is_long: boolean;               // true if cross-cluster
}

// ── Cluster Definition ────────────────────────────────────────────────────────
export interface KnowledgeCluster {
  id: string;
  label: string;
  colorHint: ClusterColorHint;
  description: string;
}

// ── Recommended Visual Presets ────────────────────────────────────────────────
export interface RecommendedPresets {
  visibility: number;
  noise: number;
  territorializacao: number;
  reterritorializacao: number;
  linhasDeFuga: number;
  hubs: number;
  esquecimento: number;
}

// ── Complete Knowledge Map ────────────────────────────────────────────────────
export interface KnowledgeMap {
  title: string;
  summary: string;                // 1-2 lines
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  clusters: KnowledgeCluster[];
  bridges: string[];              // node ids that bridge 3+ clusters
  recommended_presets: RecommendedPresets;
  // Metadata
  generatedAt: number;
  query: string;
  mapSize: MapSize;
  outputStyle: OutputStyle;
}

// ── LLM Request ───────────────────────────────────────────────────────────────
export interface RhizomeSearchRequest {
  query: string;
  mapSize: MapSize;
  outputStyle: OutputStyle;
  apiKey?: string;
  modelId?: string;
  baseURL?: string;
}

// ── Cache Entry ───────────────────────────────────────────────────────────────
export interface MapCacheEntry {
  id: string;
  map: KnowledgeMap;
  timestamp: number;
}

// ── Layout Configuration ──────────────────────────────────────────────────────
export interface LayoutConfig {
  iterations: number;
  repulsionStrength: number;
  springStrength: number;
  springLength: number;
  centerGravity: number;
  damping: number;
  // Living layout
  livingNoiseScale: number;
  livingSpeed: number;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  iterations: 300,
  repulsionStrength: 5000,
  springStrength: 0.02,
  springLength: 80,
  centerGravity: 0.01,
  damping: 0.85,
  livingNoiseScale: 0.3,
  livingSpeed: 0.5,
};

// ── UI State ──────────────────────────────────────────────────────────────────
export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SearchUIState {
  status: SearchStatus;
  message: string;
  currentMap: KnowledgeMap | null;
  selectedNodeId: string | null;
  livingLayout: boolean;
}
