// H) SISTEMA DE ENERGIA & REPRODUÇÃO
// Sistema de energia opcional: partículas ganham/perdem energia e podem reproduzir ou morrer

import { MicroState } from './microState';
import { InteractionMatrix } from './matrix';
import { SpatialHash, createSpatialHash, clearHash, insertParticle, queryNeighbors } from './spatialHash';

export interface EnergyConfig {
  enabled: boolean;
  
  // Dinâmica de energia
  baseDecay: number; // perda passiva de energia por frame (0.001-0.01)
  motionCost: number; // custo de energia proporcional à velocidade (0.001-0.02)
  
  // Alimentação
  feedRadius: number; // quão perto para se alimentar (0.01-0.05)
  feedRate: number; // ganho de energia de tipos compatíveis (0.01-0.1)
  
  // Reprodução
  reproductionThreshold: number; // energia necessária para reproduzir (1.5-3.0)
  reproductionCost: number; // energia perdida pelo pai (0.5-1.0)
  childEnergyRatio: number; // fração da energia do pai dada ao filho (0.3-0.7)
  mutationChance: number; // chance do filho ser de tipo diferente (0.0-0.2)
  
  // Morte
  deathThreshold: number; // energia abaixo da qual a partícula morre (0.1-0.5)
  
  // Energia inicial
  startEnergy: number; // energia inicial para novas partículas (1.0-2.0)

  // PATCH 02 — Ciclo celular (3 fases) + campo nutriente
  /** Se true, reprodução só ocorre na fase G2/M (phase === 2). */
  cellCycleEnabled: boolean;
  /** Velocidade do ciclo: progresso por frame (ex.: 0.015 ≈ 2–3 s por ciclo completo). */
  cellCycleRate: number;
  /** Ganho de energia por frame ao amostrar o campo nutriente em (x,y). */
  nutrientFromFieldGain: number;
  /** Amostra nutriente no ponto (x,y). Se não definido, não há alimentação do campo. */
  sampleNutrient?: (x: number, y: number) => number;
  /** Deposita nutriente no ponto (x,y) ao reproduzir ou morrer. */
  depositNutrient?: (x: number, y: number, amount: number) => void;
  /** Quanto depositar no campo ao reproduzir (ex.: 0.1). */
  depositNutrientOnReproduce: number;
  /** Quanto depositar no campo ao morrer (ex.: 0.15). */
  depositNutrientOnDeath: number;
}

export const createEnergyConfig = (): EnergyConfig => ({
  enabled: false,
  baseDecay: 0.003,
  motionCost: 0.005,
  feedRadius: 0.03,
  feedRate: 0.04,
  reproductionThreshold: 2.0,
  reproductionCost: 0.8,
  childEnergyRatio: 0.5,
  mutationChance: 0.05,
  deathThreshold: 0.2,
  startEnergy: 1.2,
  /** Desligado por padrão: reprodução por energia não exige fase M. Mitose continua sendo uma das ocorrências. */
  cellCycleEnabled: false,
  cellCycleRate: 0.018,
  nutrientFromFieldGain: 0.012,
  depositNutrientOnReproduce: 0.08,
  depositNutrientOnDeath: 0.12,
});

// Spatial hash para feeding (reutilizado entre frames)
let feedingSpatialHash: SpatialHash | null = null;
let lastFeedRadius = 0;
let lastMaxCount = 0;

/** Fases do ciclo celular: 0=G1 (crescimento), 1=S (síntese), 2=G2/M (pronto para dividir) */
export const CELL_PHASE_G1 = 0;
export const CELL_PHASE_S = 1;
export const CELL_PHASE_M = 2;

/**
 * PATCH 02 — Avança o ciclo celular (3 fases). Só divide quando phase === CELL_PHASE_M.
 * Progresso acelera com energia (mais energia = ciclo mais rápido).
 */
export const stepCellCycle = (
  state: MicroState,
  config: EnergyConfig,
  dt: number = 1 / 60
): void => {
  if (!config.cellCycleEnabled || !state.cellCyclePhase || !state.cellCycleProgress) return;
  const threshold = config.reproductionThreshold;
  for (let i = 0; i < state.count; i++) {
    const energy = state.energy[i];
    if (energy <= 0) continue;
    // Taxa proporcional à energia (acima do threshold acelera)
    const rate = config.cellCycleRate * (0.6 + 0.5 * Math.min(1, energy / (threshold || 1)));
    state.cellCycleProgress[i] += rate * dt * 60; // normalizado por 1 frame
    if (state.cellCycleProgress[i] >= 1) {
      state.cellCycleProgress[i] = 0;
      state.cellCyclePhase[i] = (state.cellCyclePhase[i] + 1) % 3; // 0 -> 1 -> 2 -> 0
    }
  }
};

/**
 * Atualiza sistema de energia: alimentação, reprodução, morte
 * Retorna número de nascimentos e mortes neste frame
 */
export const updateEnergy = (
  state: MicroState,
  matrix: InteractionMatrix,
  config: EnergyConfig,
  rng: { next: () => number; int: (min: number, max: number) => number },
  maxCapacity: number
): { births: number; deaths: number } => {
  if (!config.enabled) return { births: 0, deaths: 0 };
  
  let births = 0;
  let deaths = 0;
  
  // Inicializa array de energia se necessário
  if (!state.energy || state.energy.length < maxCapacity) {
    state.energy = new Float32Array(maxCapacity);
    for (let i = 0; i < state.count; i++) {
      state.energy[i] = config.startEnergy;
    }
  }
  
  // 1) Decaimento de energia e custo de movimento
  for (let i = 0; i < state.count; i++) {
    state.energy[i] -= config.baseDecay;
    
    const speed = Math.sqrt(state.vx[i] * state.vx[i] + state.vy[i] * state.vy[i]);
    state.energy[i] -= speed * config.motionCost;
  }

  // 1b) PATCH 02 — Alimentação do campo nutriente (se disponível)
  if (config.sampleNutrient && config.nutrientFromFieldGain > 0) {
    for (let i = 0; i < state.count; i++) {
      const nut = config.sampleNutrient(state.x[i], state.y[i]);
      if (nut > 0) state.energy[i] += config.nutrientFromFieldGain * nut;
    }
  }
  
  // 2) Alimentação: partículas ganham energia de partículas próximas que são atraídas
  // OTIMIZAÇÃO: Usa spatial hash em vez de O(n²)
  
  // Reconstrói spatial hash se necessário
  if (!feedingSpatialHash || 
      Math.abs(lastFeedRadius - config.feedRadius) > 0.001 || 
      lastMaxCount !== maxCapacity) {
    feedingSpatialHash = createSpatialHash(config.feedRadius, 2, maxCapacity);
    lastFeedRadius = config.feedRadius;
    lastMaxCount = maxCapacity;
  }
  
  clearHash(feedingSpatialHash);
  for (let i = 0; i < state.count; i++) {
    insertParticle(feedingSpatialHash, i, state.x[i], state.y[i]);
  }
  
  const feedRadiusSq = config.feedRadius * config.feedRadius;
  const matrixSize = matrix.attract.length;
  const neighbors: number[] = [];
  
  // Para cada partícula, verifica apenas vizinhos próximos
  for (let i = 0; i < state.count; i++) {
    const ti = state.type[i];
    if (ti >= matrixSize) continue;
    
    // Encontra vizinhos usando spatial hash
    neighbors.length = 0;
    queryNeighbors(feedingSpatialHash, state.x[i], state.y[i], (idx: number) => {
      neighbors.push(idx);
    });
    
    for (const j of neighbors) {
      if (j <= i) continue; // Evita duplicatas
      
      const dx = state.x[j] - state.x[i];
      const dy = state.y[j] - state.y[i];
      const dSq = dx * dx + dy * dy;
      
      if (dSq < feedRadiusSq && dSq > 1e-6) {
        const tj = state.type[j];
        if (tj >= matrixSize) continue;
        
        // Se i é atraído por j, i ganha energia (alimentação)
        if (matrix.attract[ti] && matrix.attract[ti][tj] !== undefined && matrix.attract[ti][tj] > 0.3) {
          state.energy[i] += config.feedRate * matrix.attract[ti][tj] * 0.5; // Reduzido pela metade para compensar double-check
        }
        
        // Se j é atraído por i, j ganha energia
        if (matrix.attract[tj] && matrix.attract[tj][ti] !== undefined && matrix.attract[tj][ti] > 0.3) {
          state.energy[j] += config.feedRate * matrix.attract[tj][ti] * 0.5;
        }
      }
    }
  }
  
  // Limita energia em 3x threshold de reprodução
  const maxEnergy = config.reproductionThreshold * 3;
  for (let i = 0; i < state.count; i++) {
    if (state.energy[i] > maxEnergy) state.energy[i] = maxEnergy;
  }
  
  // 3) Reprodução: partículas com energia suficiente se dividem
  // PATCH 02: só divide na fase G2/M (cellCyclePhase === 2) quando cellCycleEnabled
  const canReproduce = (i: number) => {
    if (!state.cellCyclePhase) return true;
    if (!config.cellCycleEnabled) return true;
    return state.cellCyclePhase[i] === CELL_PHASE_M;
  };
  const maxReproductions = Math.max(1, Math.floor(state.count * 0.05));
  const childrenToAdd: Array<{ x: number; y: number; vx: number; vy: number; type: number; energy: number; parentIdx: number }> = [];
  
  for (let i = 0; i < state.count && childrenToAdd.length < maxReproductions; i++) {
    if (state.energy[i] >= config.reproductionThreshold && state.count + childrenToAdd.length < maxCapacity && canReproduce(i)) {
      // Pai perde energia
      state.energy[i] -= config.reproductionCost;
      // PATCH 02: deposita nutriente no ambiente ao reproduzir
      if (config.depositNutrient && config.depositNutrientOnReproduce > 0) {
        config.depositNutrient(state.x[i], state.y[i], config.depositNutrientOnReproduce);
      }
      // PATCH 02: reset ciclo celular do pai (volta a G1)
      if (state.cellCyclePhase) {
        state.cellCyclePhase[i] = CELL_PHASE_G1;
        state.cellCycleProgress[i] = 0;
      }
      
      // Cria filho próximo
      const angle = rng.next() * Math.PI * 2;
      const dist = 0.01 + rng.next() * 0.02;
      
      let childType = state.type[i];
      if (rng.next() < config.mutationChance) {
        const typesCount = matrix.attract.length;
        childType = rng.int(0, typesCount - 1);
      }
      
      childrenToAdd.push({
        x: state.x[i] + Math.cos(angle) * dist,
        y: state.y[i] + Math.sin(angle) * dist,
        vx: state.vx[i] * 0.5,
        vy: state.vy[i] * 0.5,
        type: childType,
        energy: state.energy[i] * config.childEnergyRatio,
        parentIdx: i,
      });
      
      births++;
    }
  }
  
  // Adiciona filhos ao estado (herdam linhagem, colônia, plasticidade do pai)
  for (const child of childrenToAdd) {
    if (state.count >= maxCapacity) break;
    const p = child.parentIdx;
    const idx = state.count;
    state.x[idx] = child.x;
    state.y[idx] = child.y;
    state.vx[idx] = child.vx;
    state.vy[idx] = child.vy;
    state.type[idx] = child.type;
    state.energy[idx] = child.energy;
    
    if (state.geneA) state.geneA[idx] = state.geneA[p];
    if (state.geneB) state.geneB[idx] = state.geneB[p];
    if (state.geneC) state.geneC[idx] = state.geneC[p];
    if (state.geneD) state.geneD[idx] = state.geneD[p];
    if (state.archetypeId) state.archetypeId[idx] = state.archetypeId[p];
    if (state.age) state.age[idx] = 0;
    if (state.size) state.size[idx] = 1.0;
    // PATCH 02 — EvolutionStack: herda do pai
    if (state.lineageId) state.lineageId[idx] = state.lineageId[p];
    if (state.plasticity0) {
      state.plasticity0[idx] = state.plasticity0[p];
      state.plasticity1[idx] = state.plasticity1[p];
      state.plasticity2[idx] = state.plasticity2[p];
      state.plasticity3[idx] = state.plasticity3[p];
      state.plasticity4[idx] = state.plasticity4[p];
      state.plasticity5[idx] = state.plasticity5[p];
    }
    if (state.colonyId) state.colonyId[idx] = state.colonyId[p];
    if (state.lastRewardSignal) state.lastRewardSignal[idx] = 0;
    if (state.cellCyclePhase) state.cellCyclePhase[idx] = CELL_PHASE_G1;
    if (state.cellCycleProgress) state.cellCycleProgress[idx] = 0;
    
    state.count++;
  }
  
  // 4) Morte: remove partículas com energia baixa
  // PATCH 02: deposita nutriente no ambiente ao morrer
  for (let i = state.count - 1; i >= 0; i--) {
    if (state.energy[i] < config.deathThreshold) {
      if (config.depositNutrient && config.depositNutrientOnDeath > 0) {
        config.depositNutrient(state.x[i], state.y[i], config.depositNutrientOnDeath);
      }
      const last = state.count - 1;
      if (i !== last) {
        state.x[i] = state.x[last];
        state.y[i] = state.y[last];
        state.vx[i] = state.vx[last];
        state.vy[i] = state.vy[last];
        state.type[i] = state.type[last];
        state.energy[i] = state.energy[last];
        if (state.geneA) state.geneA[i] = state.geneA[last];
        if (state.geneB) state.geneB[i] = state.geneB[last];
        if (state.geneC) state.geneC[i] = state.geneC[last];
        if (state.geneD) state.geneD[i] = state.geneD[last];
        if (state.archetypeId) state.archetypeId[i] = state.archetypeId[last];
        if (state.age) state.age[i] = state.age[last];
        if (state.size) state.size[i] = state.size[last];
        if (state.lineageId) state.lineageId[i] = state.lineageId[last];
        if (state.plasticity0) {
          state.plasticity0[i] = state.plasticity0[last];
          state.plasticity1[i] = state.plasticity1[last];
          state.plasticity2[i] = state.plasticity2[last];
          state.plasticity3[i] = state.plasticity3[last];
          state.plasticity4[i] = state.plasticity4[last];
          state.plasticity5[i] = state.plasticity5[last];
        }
        if (state.colonyId) state.colonyId[i] = state.colonyId[last];
        if (state.lastRewardSignal) state.lastRewardSignal[i] = state.lastRewardSignal[last];
        if (state.cellCyclePhase) state.cellCyclePhase[i] = state.cellCyclePhase[last];
        if (state.cellCycleProgress) state.cellCycleProgress[i] = state.cellCycleProgress[last];
      }
      state.count--;
      deaths++;
    }
  }
  
  return { births, deaths };
};

/**
 * Inicializa energia para todas as partículas existentes
 */
export const initializeEnergy = (state: MicroState, config: EnergyConfig): void => {
  if (!state.energy || state.energy.length < state.maxCount) {
    state.energy = new Float32Array(state.maxCount);
  }
  
  for (let i = 0; i < state.count; i++) {
    state.energy[i] = config.startEnergy;
  }
};
