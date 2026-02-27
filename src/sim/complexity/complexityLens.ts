// ─────────────────────────────────────────────────────────────────────────────
// Complexity Lens — Sistema de retroalimentação baseado em
//   Donella Meadows (Thinking in Systems) + Edgar Morin (Complexidade)
//
// Wraps feedbackEngine.ts de forma não-destrutiva.
// Adiciona: telemetria por módulo, births/s, deaths/s, lentes teóricas.
// Feature flag: COMPLEXITY_LENS = true (substitui Or Chozer no UI)
//               LEGACY_ORCHOZER = false (mantém Or Chozer como baseline)
// ─────────────────────────────────────────────────────────────────────────────
import {
  FeedbackState,
  FeedbackConfig,
  FeedbackMetrics,
  SefirotActivations,
  ModulationDeltas,
  PhaseLabel,
  createFeedbackState,
  createFeedbackConfig,
  stepFeedbackEngine,
  applyModulation,
  restoreParams,
  resetFeedbackMemory,
} from '../micro/feedbackEngine';
import type { MicroState, MicroConfig } from '../micro/microState';

// ─────────────────────────────────────────────────────────────────────────────
// Feature flags
// ─────────────────────────────────────────────────────────────────────────────
export const COMPLEXITY_LENS = true;   // set false → revert to Or Chozer UI only
export const LEGACY_ORCHOZER = false;  // keep both panels side-by-side (debug)

// ─────────────────────────────────────────────────────────────────────────────
// Telemetria de módulos (PATCH 01)
// Cada módulo registra seu custo em ms por frame.
// Budget mode (PATCH 07) vai usar isso para throttling automático.
// ─────────────────────────────────────────────────────────────────────────────
export type ModuleId =
  | 'particleLife'
  | 'energy'
  | 'field'
  | 'genes'
  | 'metamorphosis'
  | 'reconfig'
  | 'mitosis'
  | 'archetypes'
  | 'feedbackLens'
  | 'render';

export interface ModuleTelemetry {
  ms: number;       // custo médio por frame (exponential moving average)
  active: boolean;  // módulo está ativo?
}

// Uma amostra pontual (não acumula alocações — é um objeto estático reutilizado)
export type ModuleTelemetryMap = Record<ModuleId, ModuleTelemetry>;

export function createModuleTelemetry(): ModuleTelemetryMap {
  const ids: ModuleId[] = [
    'particleLife', 'energy', 'field', 'genes', 'metamorphosis',
    'reconfig', 'mitosis', 'archetypes', 'feedbackLens', 'render',
  ];
  const map = {} as ModuleTelemetryMap;
  for (const id of ids) {
    map[id] = { ms: 0, active: true };
  }
  return map;
}

/** Registra custo de um módulo usando EMA (alpha=0.1 → ~10 frames de suavização) */
const EMA_ALPHA = 0.12;
export function recordModuleMs(
  telem: ModuleTelemetryMap,
  id: ModuleId,
  ms: number,
): void {
  const t = telem[id];
  t.ms = t.ms + EMA_ALPHA * (ms - t.ms);
}

/** Retorna os N módulos mais custosos, ordenados por ms desc */
export function topModules(
  telem: ModuleTelemetryMap,
  n = 3,
): Array<{ id: ModuleId; ms: number }> {
  const entries = (Object.keys(telem) as ModuleId[])
    .map(id => ({ id, ms: telem[id].ms }))
    .sort((a, b) => b.ms - a.ms);
  return entries.slice(0, n);
}

// ─────────────────────────────────────────────────────────────────────────────
// Births / Deaths rate tracker (PATCH 01)
// Acumula eventos por frame, calcula taxa em eventos/segundo.
// ─────────────────────────────────────────────────────────────────────────────
export interface VitalRates {
  birthsPerSec: number;
  deathsPerSec: number;
  mutationsPerSec: number;
  // Decomposição de mortes por causa (PATCH 03)
  deathsByStarvation: number;
  deathsByAge: number;
  deathsByCollision: number;
  deathsByPredation: number;
}

export interface VitalAccumulator {
  births: number;
  deaths: number;
  mutations: number;
  deathsByStarvation: number;
  deathsByAge: number;
  deathsByCollision: number;
  deathsByPredation: number;
  windowMs: number;   // tempo acumulado desde último reset
  lastRates: VitalRates;
}

export function createVitalAccumulator(): VitalAccumulator {
  return {
    births: 0, deaths: 0, mutations: 0,
    deathsByStarvation: 0, deathsByAge: 0,
    deathsByCollision: 0, deathsByPredation: 0,
    windowMs: 0,
    lastRates: {
      birthsPerSec: 0, deathsPerSec: 0, mutationsPerSec: 0,
      deathsByStarvation: 0, deathsByAge: 0,
      deathsByCollision: 0, deathsByPredation: 0,
    },
  };
}

const VITAL_WINDOW_MS = 1000; // calcula taxas a cada ~1s

/** Atualiza acumulador com os eventos do frame e retorna taxas se janela expirou. */
export function tickVitalRates(
  acc: VitalAccumulator,
  frameMs: number,
  births: number,
  deaths: number,
  mutations: number,
): void {
  acc.births    += births;
  acc.deaths    += deaths;
  acc.mutations += mutations;
  acc.windowMs  += frameMs;

  if (acc.windowMs >= VITAL_WINDOW_MS) {
    const s = acc.windowMs / 1000;
    acc.lastRates = {
      birthsPerSec:    acc.births    / s,
      deathsPerSec:    acc.deaths    / s,
      mutationsPerSec: acc.mutations / s,
      deathsByStarvation: acc.deathsByStarvation / s,
      deathsByAge:        acc.deathsByAge        / s,
      deathsByCollision:  acc.deathsByCollision  / s,
      deathsByPredation:  acc.deathsByPredation  / s,
    };
    acc.births    = 0;
    acc.deaths    = 0;
    acc.mutations = 0;
    acc.deathsByStarvation = 0;
    acc.deathsByAge        = 0;
    acc.deathsByCollision  = 0;
    acc.deathsByPredation  = 0;
    acc.windowMs  = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lens: tradução Sefirot → Forças Complexas (Morin + Meadows)
// ─────────────────────────────────────────────────────────────────────────────

/** Forças do sistema segundo a teoria da complexidade */
export interface ComplexityForces {
  /** Perturbação criativa (Morin) — injeta desordem geradora */
  perturbacao: number;
  /** Auto-organização (Morin/Meadows) — consolida padrões emergentes */
  autoOrganizacao: number;
  /** Amplificação (Meadows: R loop) — loop de reforço, crescimento */
  amplificacao: number;
  /** Regulação (Meadows: B loop) — loop de balanço, amortecimento */
  regulacao: number;
  /** Coerência (Meadows: goal) — saúde sistêmica, resiliência global */
  coerencia: number;
}

export function toComplexityForces(act: SefirotActivations): ComplexityForces {
  return {
    perturbacao:    act.chokhmah,  // novelty → creative disturbance
    autoOrganizacao: act.binah,    // structure → pattern lock-in
    amplificacao:   act.chesed,    // expansion → reinforcing loop
    regulacao:      act.gevurah,   // constraint → balancing loop
    coerencia:      act.tiferet,   // integrator → system coherence
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lens: tradução Métricas → Indicadores de Meadows
// ─────────────────────────────────────────────────────────────────────────────

/** Indicadores sistêmicos (linguagem de Meadows + Morin) */
export interface ComplexityMetrics {
  /** Variedade (Ashby) — diversidade de tipos no espaço = potencial de resiliência */
  variedade: number;
  /** Coesão — aglomeração espacial = auto-organização de nicho */
  coesao: number;
  /** Atrito — pressão competitiva = força de seleção */
  atrito: number;
  /** Resiliência — fração de espécies ativas = robustez do sistema */
  resiliencia: number;
  /** Persistência — quanto o sistema mantém estado = homeostase/inércia */
  persistencia: number;
  /** Metabolismo — fluxo de energia cinética = vitalidade */
  metabolismo: number;
}

export function toComplexityMetrics(m: FeedbackMetrics): ComplexityMetrics {
  return {
    variedade:   m.entropyLike,
    coesao:      m.clustering,
    atrito:      m.conflict,
    resiliencia: m.diversity,
    persistencia: m.stagnation,
    metabolismo: m.energy,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lens: fase sistêmica (Morin: perturbação-reorganização)
// ─────────────────────────────────────────────────────────────────────────────

export type SystemPhase = 'Expansão' | 'Estruturação' | 'Seleção' | 'Reorganização';

export const SYSTEM_PHASE_COLORS: Record<SystemPhase, string> = {
  Expansão:       '#50ff90',  // verde: crescimento, R loops dominantes
  Estruturação:   '#60d0ff',  // azul: auto-organização
  Seleção:        '#ff6050',  // vermelho: pressão seletiva, B loops
  Reorganização:  '#c080ff',  // lilás: perturbação → nova ordem (Morin)
};

export const SYSTEM_PHASE_SIGILS: Record<SystemPhase, string> = {
  Expansão:      '◈',
  Estruturação:  '◻',
  Seleção:       '◗',
  Reorganização: '✦',
};

export const SYSTEM_PHASE_HINT: Record<SystemPhase, string> = {
  Expansão:      'Loops de reforço dominantes. Crescimento, diversificação.',
  Estruturação:  'Auto-organização emergindo. Padrões se consolidam.',
  Seleção:       'Pressão seletiva alta. Loops de balanço freiam o crescimento.',
  Reorganização: 'Perturbação → crise → nova ordem. Motor de emergência e renovação.',
};

export function phaseFromLabel(label: PhaseLabel): SystemPhase {
  const map: Record<PhaseLabel, SystemPhase> = {
    Bloom:       'Expansão',
    Consolidate: 'Estruturação',
    Prune:       'Seleção',
    Renew:       'Reorganização',
  };
  return map[label];
}

// ─────────────────────────────────────────────────────────────────────────────
// ComplexityLensState — estado completo do painel
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Morin Deep Indices — derived complexity indicators beyond Meadows
// ─────────────────────────────────────────────────────────────────────────────
export interface MorinIndices {
  /** Dialógica: co-presence of antagonistic forces (order+disorder, R+B loops).
   *  High = complementary opposites coexist productively. */
  dialogica: number;
  /** Loop recursivo: feedback strength × delay sensitivity.
   *  High = system effect becomes its own cause (product-is-producer). */
  recursivo: number;
  /** Hologramático: correlation between local agent dynamics and global field pattern.
   *  High = each part embeds the logic of the whole. */
  hologramatico: number;
  /** Sapiens-Demens: ratio of constructive emergence vs destructive oscillation.
   *  Close to 0.5 = balanced duality; high = hyper-rational stagnation; low = chaotic collapse. */
  sapiensDemens: number;
  /** Tetralogy index: order ↔ disorder ↔ interactions ↔ organization cycle health.
   *  High = all four poles are active and cycling, not locked in one state. */
  tetralogia: number;
}

export interface ComplexityLensState {
  // Passes-through do feedbackEngine (lógica imutada)
  feedback: FeedbackState;

  // Tradução para lente de complexidade
  metrics: ComplexityMetrics;
  forces: ComplexityForces;
  systemPhase: SystemPhase;
  modulation: ModulationDeltas; // deltas aplicados ao sim

  // Telemetria PATCH 01
  moduleTelemetry: ModuleTelemetryMap;
  vitalRates: VitalRates;

  // Indicadores de saúde do sistema
  systemHealth: number;   // 0..1 (1 = saudável, 0 = em colapso)
  emergenceIndex: number; // 0..1 (mede quão "complexo" o estado atual é)

  // Morin deep indices
  morin: MorinIndices;
}

export function createComplexityLensState(): ComplexityLensState {
  const fb = createFeedbackState();
  return {
    feedback: fb,
    metrics: toComplexityMetrics(fb.metrics),
    forces: toComplexityForces(fb.activations),
    systemPhase: 'Expansão',
    modulation: { force: 0, drag: 0, entropy: 0, beta: 0, rmax: 0, mutationRate: 0 },
    moduleTelemetry: createModuleTelemetry(),
    vitalRates: createVitalAccumulator().lastRates,
    systemHealth: 1,
    emergenceIndex: 0,
    morin: { dialogica: 0, recursivo: 0, hologramatico: 0, sapiensDemens: 0.5, tetralogia: 0 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Meadows health: combinação de métricas boas vs. sinais de colapso
// ─────────────────────────────────────────────────────────────────────────────
function computeSystemHealth(m: ComplexityMetrics): number {
  // Saúde = diversidade presente + energia razoável + baixo atrito
  const diversityScore  = m.resiliencia;
  const metabolismScore = m.metabolismo;
  const conflictPenalty = Math.max(0, m.atrito - 0.6) * 2;
  const stagnationPenalty = m.persistencia > 0.7 ? (m.persistencia - 0.7) * 1.5 : 0;
  const raw = (diversityScore * 0.45 + metabolismScore * 0.30) - conflictPenalty * 0.15 - stagnationPenalty * 0.10;
  return Math.max(0, Math.min(1, raw));
}

// Emergence index: Morin — alta variedade + alta coesão (auto-organização) + baixa persistência
function computeEmergenceIndex(m: ComplexityMetrics): number {
  const raw = m.variedade * 0.35 + m.coesao * 0.35 + (1 - m.persistencia) * 0.30;
  return Math.max(0, Math.min(1, raw));
}

// ─────────────────────────────────────────────────────────────────────────────
// Morin Deep Indices — derived from forces and metrics
// ─────────────────────────────────────────────────────────────────────────────

function computeMorinIndices(f: ComplexityForces, m: ComplexityMetrics): MorinIndices {
  // Dialógica: co-presence of antagonistic forces.
  // Amplificação (R-loop) and Regulação (B-loop) are antagonistic;
  // Perturbação and Auto-Organização are antagonistic.
  // High dialogica = both poles active simultaneously (min of the pair × 2, capped at 1).
  const dialRB = Math.min(f.amplificacao, f.regulacao) * 2;
  const dialPA = Math.min(f.perturbacao, f.autoOrganizacao) * 2;
  const dialogica = Math.min(1, (dialRB * 0.5 + dialPA * 0.5));

  // Loop recursivo: product is producer. Measured by feedback strength ×
  // how different the output (forces) is from input stability.
  // If metrics change rapidly while forces respond, the loop is active.
  const forceSum = (f.perturbacao + f.autoOrganizacao + f.amplificacao + f.regulacao + f.coerencia) / 5;
  const metricsChange = 1 - m.persistencia;
  const recursivo = Math.min(1, forceSum * metricsChange * 3);

  // Hologramático: local = global. High coesão (local clusters) + high variedade (global diversity)
  // + balanced metabolismo means each locality mirrors the whole.
  const hologramatico = Math.min(1, m.coesao * 0.35 + m.variedade * 0.35 + m.metabolismo * 0.30);

  // Sapiens-Demens: ratio of constructive vs destructive forces.
  // 0.5 = perfectly balanced; >0.5 = hyper-rational; <0.5 = chaotic.
  const constructive = f.autoOrganizacao + f.coerencia + f.regulacao;
  const destructive = f.perturbacao + f.amplificacao + m.atrito;
  const total = constructive + destructive || 1;
  const sapiensDemens = constructive / total;

  // Tetralogia: order ↔ disorder ↔ interactions ↔ organization.
  // All four poles need to be active (none near zero) for a healthy cycle.
  const order = f.regulacao;
  const disorder = f.perturbacao;
  const interactions = m.metabolismo;
  const organization = f.autoOrganizacao;
  const minPole = Math.min(order, disorder, interactions, organization);
  const maxPole = Math.max(order, disorder, interactions, organization) || 1;
  const tetralogia = Math.min(1, (minPole / maxPole) * 2 + minPole * 0.5);

  return { dialogica, recursivo, hologramatico, sapiensDemens, tetralogia };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main step (wraps stepFeedbackEngine)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Atualiza o ComplexityLensState um frame.
 * Chamar APÓS stepFeedbackEngine (ou usa a mesma FeedbackState que você já tem).
 */
export function stepComplexityLens(
  lensState: ComplexityLensState,
  micro: MicroState,
  cfg: MicroConfig,
  dt: number,
): void {
  // 1. Roda a engine subjacente (Or Chozer logic)
  const t0 = performance.now();
  stepFeedbackEngine(lensState.feedback, micro, cfg, dt);
  recordModuleMs(lensState.moduleTelemetry, 'feedbackLens', performance.now() - t0);

  // 2. Traduz para lente de complexidade
  lensState.metrics     = toComplexityMetrics(lensState.feedback.metrics);
  lensState.forces      = toComplexityForces(lensState.feedback.activations);
  lensState.systemPhase = phaseFromLabel(lensState.feedback.phaseLabel);
  lensState.modulation  = lensState.feedback.modulation;

  // 3. Indicadores derivados
  lensState.systemHealth   = computeSystemHealth(lensState.metrics);
  lensState.emergenceIndex = computeEmergenceIndex(lensState.metrics);

  // 4. Morin deep indices
  lensState.morin = computeMorinIndices(lensState.forces, lensState.metrics);
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export da API do feedbackEngine para conveniência
// ─────────────────────────────────────────────────────────────────────────────
export {
  createFeedbackState,
  createFeedbackConfig,
  applyModulation,
  restoreParams,
  resetFeedbackMemory,
  type FeedbackState,
  type FeedbackConfig,
  type FeedbackMetrics,
  type SefirotActivations,
  type ModulationDeltas,
  type PhaseLabel,
};
