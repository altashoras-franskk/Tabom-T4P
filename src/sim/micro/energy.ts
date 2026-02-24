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
});

// Spatial hash para feeding (reutilizado entre frames)
let feedingSpatialHash: SpatialHash | null = null;
let lastFeedRadius = 0;
let lastMaxCount = 0;

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
  // Limita taxa de reprodução para prevenir explosão (max 5% da população por frame)
  const maxReproductions = Math.max(1, Math.floor(state.count * 0.05));
  const childrenToAdd: Array<{ x: number; y: number; vx: number; vy: number; type: number; energy: number }> = [];
  
  for (let i = 0; i < state.count && childrenToAdd.length < maxReproductions; i++) {
    if (state.energy[i] >= config.reproductionThreshold && state.count + childrenToAdd.length < maxCapacity) {
      // Pai perde energia
      state.energy[i] -= config.reproductionCost;
      
      // Cria filho próximo
      const angle = rng.next() * Math.PI * 2;
      const dist = 0.01 + rng.next() * 0.02;
      
      let childType = state.type[i];
      if (rng.next() < config.mutationChance) {
        // Mutação: filho é de tipo diferente
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
      });
      
      births++;
    }
  }
  
  // Adiciona filhos ao estado
  for (const child of childrenToAdd) {
    if (state.count >= maxCapacity) break;
    
    const idx = state.count;
    state.x[idx] = child.x;
    state.y[idx] = child.y;
    state.vx[idx] = child.vx;
    state.vy[idx] = child.vy;
    state.type[idx] = child.type;
    state.energy[idx] = child.energy;
    
    // Inicializa outros campos
    if (state.geneA) state.geneA[idx] = state.geneA[Math.floor(rng.next() * state.count)] || 0;
    if (state.geneB) state.geneB[idx] = state.geneB[Math.floor(rng.next() * state.count)] || 0;
    if (state.geneC) state.geneC[idx] = state.geneC[Math.floor(rng.next() * state.count)] || 0;
    if (state.geneD) state.geneD[idx] = state.geneD[Math.floor(rng.next() * state.count)] || 0;
    if (state.archetypeId) state.archetypeId[idx] = state.archetypeId[Math.floor(rng.next() * state.count)] || 0;
    if (state.age) state.age[idx] = 0;
    if (state.size) state.size[idx] = 1.0;
    
    state.count++;
  }
  
  // 4) Morte: remove partículas com energia baixa
  // Itera de trás para frente para remover com segurança
  for (let i = state.count - 1; i >= 0; i--) {
    if (state.energy[i] < config.deathThreshold) {
      // Remove trocando com a última partícula
      const last = state.count - 1;
      if (i !== last) {
        state.x[i] = state.x[last];
        state.y[i] = state.y[last];
        state.vx[i] = state.vx[last];
        state.vy[i] = state.vy[last];
        state.type[i] = state.type[last];
        state.energy[i] = state.energy[last];
        
        // Copia outros campos
        if (state.geneA) state.geneA[i] = state.geneA[last];
        if (state.geneB) state.geneB[i] = state.geneB[last];
        if (state.geneC) state.geneC[i] = state.geneC[last];
        if (state.geneD) state.geneD[i] = state.geneD[last];
        if (state.archetypeId) state.archetypeId[i] = state.archetypeId[last];
        if (state.age) state.age[i] = state.age[last];
        if (state.size) state.size[i] = state.size[last];
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
