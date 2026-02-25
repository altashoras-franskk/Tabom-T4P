// ─── Mil Platôs — Types ─────────────────────────────────────────────────────
// Three-layer system: CsO (organs+affects+zones), Rizoma (graph), Platôs

export const MP_FIELD_RES = 64;

// ── Full Parameter Set ──────────────────────────────────────────────────────
export interface MPParams {
  // CsO dial (derived, 0..1): 0=Corpo com Órgãos, 1=CsO
  // Organism vs Intensity
  organismo: number;     // 0..1 — hierarchy/organ dominance
  intensidade: number;   // 0..1 — affect particle intensity
  hierarquia: number;    // 0..1 — organ connection rigidity
  rigidez: number;       // 0..1 — organ spring stiffness
  desorganizacao: number;// 0..1 — chance of random organ reconnection
  crueldade: number;     // 0..1 — rupture threshold (low = ruptures happen easily)
  antiHabito: number;    // 0..1 — tendency to break patterns
  // Rizoma
  multiplicidade: number; // 0..1 — rate of new entry points
  linhasDeFuga: number;  // 0..1 — improbable connections
  territorializacao: number; // 0..1 — local attraction/clustering
  reterritorializacao: number; // 0..1 — re-capture after flight
  hubs: number;          // 0..1 — preferential attachment
  esquecimento: number;  // 0..1 — pruning rate
  // Shared
  ruido: number;         // 0..1 — noise/temperature
  densidade: number;     // 0..1 — affects particle count target
}

export function createDefaultParams(): MPParams {
  return {
    organismo: 0.5, intensidade: 0.5, hierarquia: 0.5, rigidez: 0.5,
    desorganizacao: 0.3, crueldade: 0.5, antiHabito: 0.3,
    multiplicidade: 0.3, linhasDeFuga: 0.3, territorializacao: 0.5,
    reterritorializacao: 0.3, hubs: 0.3, esquecimento: 0.2,
    ruido: 0.25, densidade: 0.5,
  };
}

export function computeMacroDial(p: MPParams): number {
  return Math.min(1, Math.max(0,
    (1 - p.organismo) * 0.25 + p.intensidade * 0.15 + p.desorganizacao * 0.20 +
    (1 - p.hierarquia) * 0.15 + p.linhasDeFuga * 0.10 + p.ruido * 0.10 +
    p.antiHabito * 0.05
  ));
}

export function macroToParams(macro: number): MPParams {
  return {
    organismo: 0.85 - macro * 0.75,
    intensidade: 0.15 + macro * 0.75,
    hierarquia: 0.80 - macro * 0.70,
    rigidez: 0.75 - macro * 0.60,
    desorganizacao: 0.05 + macro * 0.80,
    crueldade: 0.60 - macro * 0.30,
    antiHabito: 0.05 + macro * 0.70,
    multiplicidade: 0.10 + macro * 0.60,
    linhasDeFuga: 0.05 + macro * 0.75,
    territorializacao: 0.70 - macro * 0.45,
    reterritorializacao: 0.50 - macro * 0.30,
    hubs: 0.50 - macro * 0.30,
    esquecimento: 0.10 + macro * 0.40,
    ruido: 0.10 + macro * 0.45,
    densidade: 0.50,
  };
}

export function computeK(p: MPParams): number {
  return Math.min(1, Math.max(0,
    p.organismo * 0.35 + p.hierarquia * 0.30 + p.rigidez * 0.20 +
    (1 - p.desorganizacao) * 0.15
  ));
}

// ── CsO: Organ ──────────────────────────────────────────────────────────────
export interface CSOOrgan {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  radius: number;       // visual radius
  importance: number;   // 0..1, how "central" this organ is
  connections: number[]; // ids of connected organs
  hue: number;          // 0..360
  health: number;       // 0..1 — goes to 0 when CsO dissolves
}

// ── CsO: Affect Particle ────────────────────────────────────────────────────
export interface CSOAffect {
  x: number; y: number;
  vx: number; vy: number;
  intensity: number;  // 0..1
  hue: number;        // 0..360
  phase: number;      // for pulsation
  life: number;       // remaining life (ticks)
  trailX: number[];   // last 8 positions
  trailY: number[];
}

// ── CsO: Zone of Affect ─────────────────────────────────────────────────────
export interface CSOZone {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  strength: number;   // 0..1
  hue: number;        // 0..360
  pulse: number;      // phase
}

// ── CsO: Rupture Event ──────────────────────────────────────────────────────
export interface CSOEvent {
  time: number;
  x: number; y: number;
  type: 'ruptura' | 'reconexao' | 'dissolucao' | 'nascimento';
  message: string;
  color: string;
  ttl: number;
}

// ── CsO State ───────────────────────────────────────────────────────────────
export interface CSOState {
  organs: CSOOrgan[];
  affects: CSOAffect[];
  zones: CSOZone[];
  events: CSOEvent[];
  nextId: number;
  crueltyAccum: number; // accumulated cruelty pressure
  ruptureCount: number;
}

// ── Rizoma: Node ────────────────────────────────────────────────────────────
export interface RhizomeNode {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  isEntry: boolean;
  connections: number[]; // ids of connected nodes
  heat: number;         // 0..1 — activity level
  age: number;
  territory: number;    // 0..1 — how "territorialized"
}

// ── Rizoma: Edge (for rendering) ────────────────────────────────────────────
export interface RhizomeEdge {
  from: number; to: number;
  heat: number;
  isFlight: boolean;
}

// ── Rizoma State ────────────────────────────────────────────────────────────
export interface RhizomeState {
  nodes: RhizomeNode[];
  nextId: number;
  growthTimer: number;
  flightEdges: RhizomeEdge[];
}

// ── Field Layers (MP_FIELD_RES × MP_FIELD_RES) ─────────────────────────────
export interface MPFields {
  consistency: Float32Array; // Plano de consistência
  territory: Float32Array;   // Territory trace
  size: number;
}

export function createMPFields(): MPFields {
  const n = MP_FIELD_RES * MP_FIELD_RES;
  return {
    consistency: new Float32Array(n),
    territory: new Float32Array(n),
    size: MP_FIELD_RES,
  };
}

// ── Intervention Tool ────────────────────────────────────────────────────────
export type MPToolId = 'select' | 'arrastar' | 'criarIntensidade' | 'criarOrgao' | 'criarNoRizoma' | 'criarEntrada' | 'criarZona' | 'remover' | 'empurrar' | 'puxar' | 'sopro' | 'selo' | 'rasura' | 'fuga' | 'gradiente';

export interface MPTool {
  id: MPToolId;
  icon: string;
  label: string;
  desc: string;
  color: string;
}

export const MP_TOOLS: MPTool[] = [
  { id: 'select',           icon: '◇', label: 'Selecionar',       color: '#94a3b8', desc: 'Inspecionar qualquer elemento' },
  { id: 'arrastar',         icon: '✋', label: 'Arrastar',         color: '#e2e8f0', desc: 'Arrastar orgaos, nos, zonas' },
  { id: 'criarIntensidade', icon: '✦', label: 'Criar Afetos',     color: '#fbbf24', desc: 'Criar particulas de intensidade' },
  { id: 'criarOrgao',       icon: '⬤', label: 'Criar Orgao',      color: '#60a5fa', desc: 'Adicionar orgao ao corpo' },
  { id: 'criarNoRizoma',    icon: '○', label: 'Criar No',         color: '#34d399', desc: 'Adicionar no ao rizoma' },
  { id: 'criarEntrada',     icon: '◇', label: 'Criar Entrada',    color: '#6ee7b7', desc: 'Adicionar portal de entrada' },
  { id: 'criarZona',        icon: '◎', label: 'Criar Zona',       color: '#a78bfa', desc: 'Criar zona de afeto' },
  { id: 'remover',          icon: '✕', label: 'Remover',          color: '#ef4444', desc: 'Remover orgao/no/zona mais proximo' },
  { id: 'empurrar',         icon: '⊕', label: 'Empurrar',         color: '#f472b6', desc: 'Empurrar tudo para fora' },
  { id: 'puxar',            icon: '⊖', label: 'Puxar',            color: '#a78bfa', desc: 'Atrair tudo para o cursor' },
  { id: 'sopro',            icon: '≈', label: 'Sopro',            color: '#fbbf24', desc: 'Injetar ruido local' },
  { id: 'selo',             icon: '⬛', label: 'Selo',             color: '#34d399', desc: 'Aumentar traco territorial' },
  { id: 'rasura',           icon: '╳', label: 'Rasura',           color: '#ef4444', desc: 'Apagar campos localmente' },
  { id: 'fuga',             icon: '↗', label: 'Fuga',             color: '#a78bfa', desc: 'Burst de fuga' },
  { id: 'gradiente',        icon: '◐', label: 'Gradiente',        color: '#60a5fa', desc: 'Pintar plano de consistencia' },
];

// ── Visualization Overlay ───────────────────────────────────────────────────
export type MPOverlay = 'cso' | 'afetos' | 'rizoma' | 'heatConsistency' | 'heatTerritory' | 'connections' | 'flights' | 'plateaus';

// ── Plateau Detection ────────────────────────────────────────────────────────
export type PlateauLabel =
  | 'Simbiose Vibrante'
  | 'Captura (Proto-Estado)'
  | 'Nomadismo'
  | 'Metástase'
  | 'Reterritorialização'
  | 'Delírio Controlado'
  | 'Indeterminado';

export interface PlateauSnapshot {
  id: string;
  label: PlateauLabel;
  timestamp: number;
  params: MPParams;
  K: number;
  metrics: MPMetrics;
}

// ── Metrics ─────────────────────────────────────────────────────────────────
export interface MPMetrics {
  fps: number;
  nAffects: number;
  nOrgans: number;
  nRhizomeNodes: number;
  nRhizomeEdges: number;
  hubDominance: number;
  plateauScore: number;
  plateauLabel: PlateauLabel;
  fieldEntropy: number;
  memoryLoad: number;
  K: number;
  meanIntensity: number;
  ruptureRate: number;
  crueltyPressure: number;
}

export function createMPMetrics(): MPMetrics {
  return {
    fps: 60, nAffects: 0, nOrgans: 0, nRhizomeNodes: 0, nRhizomeEdges: 0,
    hubDominance: 0, plateauScore: 0, plateauLabel: 'Indeterminado',
    fieldEntropy: 0.5, memoryLoad: 0, K: 0.5,
    meanIntensity: 0.5, ruptureRate: 0, crueltyPressure: 0,
  };
}

// ── Lab Tab ─────────────────────────────────────────────────────────────────
export type MPTab = 'cso' | 'rizoma' | 'platos';

// ── Preset ──────────────────────────────────────────────────────────────────
export interface MPPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  params: MPParams;
  overlays: MPOverlay[];
  plateauRef?: string;
  theory?: string;
}

// ── Full World State ────────────────────────────────────────────────────────
export interface MPWorldState {
  cso: CSOState;
  rhizome: RhizomeState;
  fields: MPFields;
  time: number;
  tick: number;
}
