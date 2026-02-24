// Sociogenesis Presets - Real phenomena and social patterns
// Each preset defines a unique physical + symbolic universe
import type { InteractionMatrix } from '../micro/matrix';
import type { MicroConfig } from '../micro/microState';
import type { SociogenesisState } from './sociogenesisTypes';
import { genId } from './sociogenesisTypes';
import { generateTotemName } from './sociogenesisNarrator';

export type SpawnLayout = 'random' | 'clustered' | 'ring' | 'grid' | 'diagonal' | 'poles' | 'spiral' | 'center-scatter' | 'border-pack';

export interface SociogenesisPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  typesCount: number;
  particleCount: number;
  microConfig: Partial<MicroConfig>;
  matrixInit: (matrix: InteractionMatrix) => void;
  spawnLayout: SpawnLayout;
  socioSetup?: (state: SociogenesisState) => void;
  typeLabels?: string[];
}

/**
 * Spawn particles in preset-specific layouts (called from loadSociogenesisPreset)
 */
export function applySpawnLayout(
  micro: { x: Float32Array; y: Float32Array; type: Uint8Array; count: number },
  layout: SpawnLayout,
  typesCount: number,
): void {
  const count = micro.count;
  if (count === 0) return;

  switch (layout) {
    case 'clustered': {
      // Each type gets its own cluster center
      const centers: Array<{ x: number; y: number }> = [];
      const angleStep = (Math.PI * 2) / typesCount;
      const clusterRadius = 0.5;
      for (let t = 0; t < typesCount; t++) {
        centers.push({
          x: Math.cos(angleStep * t) * clusterRadius,
          y: Math.sin(angleStep * t) * clusterRadius,
        });
      }
      for (let i = 0; i < count; i++) {
        const t = micro.type[i] % typesCount;
        const c = centers[t];
        const r = 0.12 + Math.random() * 0.15;
        const a = Math.random() * Math.PI * 2;
        micro.x[i] = Math.max(-0.95, Math.min(0.95, c.x + Math.cos(a) * r));
        micro.y[i] = Math.max(-0.95, Math.min(0.95, c.y + Math.sin(a) * r));
      }
      break;
    }
    case 'ring': {
      // Particles on a large ring, typed in sectors
      for (let i = 0; i < count; i++) {
        const t = micro.type[i] % typesCount;
        const sectorAngle = (t / typesCount) * Math.PI * 2;
        const spread = (Math.PI * 2) / typesCount * 0.8;
        const angle = sectorAngle + (Math.random() - 0.5) * spread;
        const r = 0.45 + (Math.random() - 0.5) * 0.2;
        micro.x[i] = Math.cos(angle) * r;
        micro.y[i] = Math.sin(angle) * r;
      }
      break;
    }
    case 'grid': {
      // Types in strict grid quadrants
      const sqrtTypes = Math.ceil(Math.sqrt(typesCount));
      for (let i = 0; i < count; i++) {
        const t = micro.type[i] % typesCount;
        const gx = t % sqrtTypes;
        const gy = Math.floor(t / sqrtTypes);
        const cellW = 1.8 / sqrtTypes;
        const cellH = 1.8 / sqrtTypes;
        const baseX = -0.9 + gx * cellW;
        const baseY = -0.9 + gy * cellH;
        micro.x[i] = baseX + Math.random() * cellW * 0.8 + cellW * 0.1;
        micro.y[i] = baseY + Math.random() * cellH * 0.8 + cellH * 0.1;
      }
      break;
    }
    case 'diagonal': {
      // Types spread along a diagonal band
      for (let i = 0; i < count; i++) {
        const t = micro.type[i] % typesCount;
        const band = t / typesCount;
        const along = Math.random();
        const across = (Math.random() - 0.5) * 0.3;
        micro.x[i] = (along - 0.5) * 1.6 + across;
        micro.y[i] = (band - 0.5) * 1.6 + (along - 0.5) * 0.4 + (Math.random() - 0.5) * 0.15;
      }
      break;
    }
    case 'poles': {
      // Two clusters at opposite poles (oppressor/oppressed dynamic)
      for (let i = 0; i < count; i++) {
        const t = micro.type[i] % typesCount;
        const isTopHalf = t < typesCount / 2;
        const cx = isTopHalf ? -0.45 : 0.45;
        const cy = isTopHalf ? -0.3 : 0.3;
        const r = 0.15 + Math.random() * 0.2;
        const a = Math.random() * Math.PI * 2;
        micro.x[i] = Math.max(-0.95, Math.min(0.95, cx + Math.cos(a) * r));
        micro.y[i] = Math.max(-0.95, Math.min(0.95, cy + Math.sin(a) * r));
      }
      break;
    }
    case 'spiral': {
      // Spiral arrangement
      for (let i = 0; i < count; i++) {
        const frac = i / count;
        const turns = 3;
        const angle = frac * Math.PI * 2 * turns;
        const r = 0.1 + frac * 0.7;
        micro.x[i] = Math.cos(angle) * r + (Math.random() - 0.5) * 0.08;
        micro.y[i] = Math.sin(angle) * r + (Math.random() - 0.5) * 0.08;
      }
      break;
    }
    case 'center-scatter': {
      // Dense center with scattered outliers
      for (let i = 0; i < count; i++) {
        const t = micro.type[i] % typesCount;
        if (t === 0) {
          // Type 0: tight center
          const r = Math.random() * 0.15;
          const a = Math.random() * Math.PI * 2;
          micro.x[i] = Math.cos(a) * r;
          micro.y[i] = Math.sin(a) * r;
        } else {
          // Others: scattered around
          const r = 0.3 + Math.random() * 0.6;
          const a = Math.random() * Math.PI * 2;
          micro.x[i] = Math.cos(a) * r;
          micro.y[i] = Math.sin(a) * r;
        }
      }
      break;
    }
    case 'border-pack': {
      // Pack against edges (simulating imprisonment/walls)
      for (let i = 0; i < count; i++) {
        const t = micro.type[i] % typesCount;
        if (t === 0) {
          // Watchers: center
          micro.x[i] = (Math.random() - 0.5) * 0.4;
          micro.y[i] = (Math.random() - 0.5) * 0.4;
        } else {
          // Others: packed near walls
          const side = Math.floor(Math.random() * 4);
          const along = (Math.random() - 0.5) * 1.6;
          const depth = 0.7 + Math.random() * 0.25;
          if (side === 0) { micro.x[i] = along; micro.y[i] = depth; }
          else if (side === 1) { micro.x[i] = along; micro.y[i] = -depth; }
          else if (side === 2) { micro.x[i] = depth; micro.y[i] = along; }
          else { micro.x[i] = -depth; micro.y[i] = along; }
        }
      }
      break;
    }
    // 'random' is default - no repositioning needed
  }
}

export const SOCIOGENESIS_PRESETS: SociogenesisPreset[] = [
  // ===== 1. FRENCH REVOLUTION =====
  {
    id: 'french-revolution',
    name: 'French Revolution',
    description: 'Three estates collide, monarchy falls, chaos erupts',
    icon: '⚜️',
    typesCount: 4,
    particleCount: 600,
    spawnLayout: 'clustered',
    typeLabels: ['Nobility', 'Clergy', 'Bourgeoisie', 'Peasants'],
    microConfig: {
      rmax: 0.22, force: 2.0, friction: 0.85, speedClamp: 0.15,
      beta: 0.35, coreRepel: 1.5, useDrag: true, drag: 0.8,
    },
    matrixInit: (m) => {
      // Nobility: loves itself, hates peasants
      m.attract[0][0] = 0.9;  m.attract[0][1] = 0.4;  m.attract[0][2] = -0.7; m.attract[0][3] = -0.9;
      // Clergy: moderate, mediates
      m.attract[1][0] = 0.3;  m.attract[1][1] = 0.7;  m.attract[1][2] = 0.2;  m.attract[1][3] = 0.1;
      // Bourgeoisie: rejects nobility, allies with peasants
      m.attract[2][0] = -0.8; m.attract[2][1] = 0.1;  m.attract[2][2] = 0.6;  m.attract[2][3] = 0.5;
      // Peasants: hate nobility, flock together
      m.attract[3][0] = -1.0; m.attract[3][1] = -0.3; m.attract[3][2] = 0.4;  m.attract[3][3] = 0.7;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        m.radius[i][j] = i === j ? 0.18 : 0.14;
        m.falloff[i][j] = 1.0;
      }
    },
    socioSetup: (state) => {
      state.totems.push({
        id: genId(state, 'totem'), kind: 'BOND', pos: { x: -0.5, y: -0.5 },
        radius: 0.2, strength: 1.0, pinned: true, bornAt: 0, name: 'Versailles',
      });
      state.totems.push({
        id: genId(state, 'totem'), kind: 'RIFT', pos: { x: 0.4, y: 0.4 },
        radius: 0.2, strength: 0.9, pinned: true, bornAt: 0, name: 'Bastille',
      });
      state.taboos.push({
        id: genId(state, 'taboo'), kind: 'NO_MIX', pos: { x: -0.5, y: -0.5 },
        radius: 0.25, intensity: 0.8, targetType: 3, bornAt: 0,
      });
    },
  },

  // ===== 2. SILK ROAD =====
  {
    id: 'trade-networks',
    name: 'Silk Road',
    description: 'Merchant caravans connect distant cities, goods flow',
    icon: '🐫',
    typesCount: 5,
    particleCount: 700,
    spawnLayout: 'ring',
    typeLabels: ['Chang\'an', 'Samarkand', 'Baghdad', 'Constantinople', 'Rome'],
    microConfig: {
      rmax: 0.28, force: 1.2, friction: 0.93, speedClamp: 0.08,
      beta: 0.25, coreRepel: 0.8, useDrag: true, drag: 1.2,
    },
    matrixInit: (m) => {
      for (let i = 0; i < 5; i++) {
        const next = (i + 1) % 5;
        const prev = (i - 1 + 5) % 5;
        for (let j = 0; j < 5; j++) {
          if (i === j) m.attract[i][j] = 0.7;
          else if (j === next || j === prev) m.attract[i][j] = 0.55;
          else m.attract[i][j] = -0.15;
          m.radius[i][j] = j === next || j === prev ? 0.22 : 0.12;
          m.falloff[i][j] = 1.5;
        }
      }
    },
    socioSetup: (state) => {
      const cities = [
        { x: 0.6, y: 0 }, { x: 0.18, y: 0.57 }, { x: -0.48, y: 0.35 },
        { x: -0.48, y: -0.35 }, { x: 0.18, y: -0.57 },
      ];
      cities.forEach((c, i) => {
        state.totems.push({
          id: genId(state, 'totem'), kind: 'BOND', pos: c,
          radius: 0.15, strength: 0.8, pinned: true, bornAt: 0,
          name: ['Chang\'an', 'Samarkand', 'Baghdad', 'Constantinople', 'Rome'][i],
        });
      });
    },
  },

  // ===== 3. GREAT AWAKENING =====
  {
    id: 'religious-movement',
    name: 'Great Awakening',
    description: 'Charismatic preachers, sects, schisms',
    icon: '✟',
    typesCount: 3,
    particleCount: 500,
    spawnLayout: 'center-scatter',
    typeLabels: ['Orthodox', 'Reformers', 'Heretics'],
    microConfig: {
      rmax: 0.25, force: 2.5, friction: 0.88, speedClamp: 0.14,
      beta: 0.3, coreRepel: 1.2, useDrag: true, drag: 0.9,
    },
    matrixInit: (m) => {
      m.attract[0][0] = 0.9; m.attract[0][1] = 0.3; m.attract[0][2] = -1.0;
      m.attract[1][0] = 0.5; m.attract[1][1] = 0.5; m.attract[1][2] = -0.2;
      m.attract[2][0] = -0.9; m.attract[2][1] = -0.4; m.attract[2][2] = 0.8;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        m.radius[i][j] = i === j ? 0.2 : 0.15;
        m.falloff[i][j] = 1.1;
      }
    },
    socioSetup: (state) => {
      state.totems.push({
        id: genId(state, 'totem'), kind: 'BOND', pos: { x: 0, y: 0 },
        radius: 0.25, strength: 1.2, pinned: true, bornAt: 0, name: 'Cathedral',
      });
      state.taboos.push({
        id: genId(state, 'taboo'), kind: 'NO_MIX', pos: { x: 0, y: 0 },
        radius: 0.3, intensity: 0.9, targetType: 2, bornAt: 0,
      });
    },
  },

  // ===== 4. TRIBAL WARFARE =====
  {
    id: 'tribal-warfare',
    name: 'Tribal Conflict',
    description: 'Clans defend territory, raid neighbors',
    icon: '⚔️',
    typesCount: 4,
    particleCount: 600,
    spawnLayout: 'grid',
    typeLabels: ['Wolf Clan', 'Bear Clan', 'Eagle Clan', 'Serpent Clan'],
    microConfig: {
      rmax: 0.18, force: 2.5, friction: 0.84, speedClamp: 0.16,
      beta: 0.4, coreRepel: 2.0, useDrag: true, drag: 0.7,
    },
    matrixInit: (m) => {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        if (i === j) m.attract[i][j] = 0.95;
        else m.attract[i][j] = -0.95;
        m.radius[i][j] = i === j ? 0.16 : 0.12;
        m.falloff[i][j] = 0.8;
      }
    },
  },

  // ===== 5. GREEK POLIS =====
  {
    id: 'city-states',
    name: 'Greek Polis',
    description: 'Independent city-states, alliances and rivalries',
    icon: '🏛️',
    typesCount: 6,
    particleCount: 800,
    spawnLayout: 'ring',
    typeLabels: ['Athens', 'Sparta', 'Corinth', 'Thebes', 'Argos', 'Delphi'],
    microConfig: {
      rmax: 0.22, force: 1.5, friction: 0.90, speedClamp: 0.11,
      beta: 0.3, coreRepel: 1.0, useDrag: true, drag: 1.0,
    },
    matrixInit: (m) => {
      // Athens-Sparta rivalry, Corinth neutral, Thebes allied with Sparta
      const alliances = [
        [ 0.8, -0.7,  0.3, -0.4,  0.2,  0.4], // Athens
        [-0.7,  0.8, -0.2,  0.5, -0.3, -0.1], // Sparta
        [ 0.3, -0.2,  0.7,  0.1,  0.3,  0.2], // Corinth
        [-0.4,  0.5,  0.1,  0.7, -0.2, -0.1], // Thebes
        [ 0.2, -0.3,  0.3, -0.2,  0.7,  0.1], // Argos
        [ 0.4, -0.1,  0.2, -0.1,  0.1,  0.6], // Delphi (oracle)
      ];
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
        m.attract[i][j] = alliances[i][j];
        m.radius[i][j] = i === j ? 0.18 : 0.14;
        m.falloff[i][j] = 1.2;
      }
    },
    socioSetup: (state) => {
      state.totems.push({
        id: genId(state, 'totem'), kind: 'ORACLE', pos: { x: 0.45, y: -0.55 },
        radius: 0.18, strength: 0.7, pinned: true, bornAt: 0, name: 'Oracle of Delphi',
      });
    },
  },

  // ===== 6. GREAT MIGRATION =====
  {
    id: 'migration-patterns',
    name: 'Great Migration',
    description: 'Populations flow from scarcity to opportunity',
    icon: '🗺️',
    typesCount: 3,
    particleCount: 500,
    spawnLayout: 'diagonal',
    typeLabels: ['Migrants', 'Settled', 'Resources'],
    microConfig: {
      rmax: 0.30, force: 1.0, friction: 0.95, speedClamp: 0.07,
      beta: 0.2, coreRepel: 0.6, useDrag: true, drag: 1.5,
    },
    matrixInit: (m) => {
      m.attract[0][0] = 0.3; m.attract[0][1] = 0.8; m.attract[0][2] = 0.3;
      m.attract[1][0] = -0.3; m.attract[1][1] = 0.5; m.attract[1][2] = 0.7;
      m.attract[2][0] = -0.4; m.attract[2][1] = -0.2; m.attract[2][2] = 0.6;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        m.radius[i][j] = 0.22;
        m.falloff[i][j] = 1.6;
      }
    },
  },

  // ===== 7. CASTE SYSTEM =====
  {
    id: 'caste-system',
    name: 'Rigid Hierarchy',
    description: 'Strict vertical layers, no mobility',
    icon: '🏔️',
    typesCount: 5,
    particleCount: 700,
    spawnLayout: 'diagonal',
    typeLabels: ['Brahmins', 'Kshatriyas', 'Vaishyas', 'Shudras', 'Untouchables'],
    microConfig: {
      rmax: 0.16, force: 1.8, friction: 0.92, speedClamp: 0.08,
      beta: 0.35, coreRepel: 1.8, useDrag: true, drag: 1.3,
    },
    matrixInit: (m) => {
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
        if (i === j) m.attract[i][j] = 0.85;
        else {
          const distance = Math.abs(i - j);
          m.attract[i][j] = -0.3 - distance * 0.25;
        }
        m.radius[i][j] = i === j ? 0.14 : 0.08;
        m.falloff[i][j] = 0.8;
      }
    },
    socioSetup: (state) => {
      // Taboo: untouchables cannot enter upper area
      state.taboos.push({
        id: genId(state, 'taboo'), kind: 'NO_MIX', pos: { x: -0.4, y: -0.4 },
        radius: 0.3, intensity: 1.0, targetType: 4, bornAt: 0,
      });
      state.taboos.push({
        id: genId(state, 'taboo'), kind: 'NO_MIX', pos: { x: -0.4, y: -0.4 },
        radius: 0.3, intensity: 0.8, targetType: 3, bornAt: 0,
      });
    },
  },

  // ===== 8. DEMOCRACY =====
  {
    id: 'democracy-emergence',
    name: 'Demos Rising',
    description: 'Citizens debate, consensus forms and dissolves',
    icon: '🗳️',
    typesCount: 4,
    particleCount: 600,
    spawnLayout: 'random',
    typeLabels: ['Democrats', 'Oligarchs', 'Populists', 'Moderates'],
    microConfig: {
      rmax: 0.26, force: 1.3, friction: 0.91, speedClamp: 0.10,
      beta: 0.25, coreRepel: 0.8, useDrag: true, drag: 1.1,
    },
    matrixInit: (m) => {
      // Everyone moderately attracted - deliberation
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        if (i === j) m.attract[i][j] = 0.55;
        else m.attract[i][j] = 0.25;
        m.radius[i][j] = 0.2;
        m.falloff[i][j] = 1.4;
      }
      // But oligarchs repel populists
      m.attract[1][2] = -0.5; m.attract[2][1] = -0.5;
    },
    socioSetup: (state) => {
      state.totems.push({
        id: genId(state, 'totem'), kind: 'BOND', pos: { x: 0, y: 0 },
        radius: 0.3, strength: 0.6, pinned: true, bornAt: 0, name: 'Agora',
      });
    },
  },

  // ===== 9. FEUDAL BONDS =====
  {
    id: 'feudalism',
    name: 'Feudal Bonds',
    description: 'Lords, vassals, serfs - pyramid of fealty',
    icon: '👑',
    typesCount: 4,
    particleCount: 700,
    spawnLayout: 'center-scatter',
    typeLabels: ['King', 'Lords', 'Knights', 'Serfs'],
    microConfig: {
      rmax: 0.20, force: 1.8, friction: 0.90, speedClamp: 0.10,
      beta: 0.3, coreRepel: 1.2, useDrag: true, drag: 1.0,
    },
    matrixInit: (m) => {
      // King attracts all, serfs are bound to land
      m.attract[0][0] = 0.8; m.attract[0][1] = 0.5; m.attract[0][2] = 0.3; m.attract[0][3] = 0.1;
      m.attract[1][0] = 0.7; m.attract[1][1] = 0.6; m.attract[1][2] = 0.5; m.attract[1][3] = 0.2;
      m.attract[2][0] = 0.4; m.attract[2][1] = 0.7; m.attract[2][2] = 0.5; m.attract[2][3] = -0.3;
      m.attract[3][0] = 0.1; m.attract[3][1] = 0.3; m.attract[3][2] = -0.2; m.attract[3][3] = 0.65;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        m.radius[i][j] = 0.16;
        m.falloff[i][j] = 1.1;
      }
      // King has tiny count, huge radius
      m.radius[0][0] = 0.25;
    },
    socioSetup: (state) => {
      state.totems.push({
        id: genId(state, 'totem'), kind: 'BOND', pos: { x: 0, y: 0 },
        radius: 0.2, strength: 1.5, pinned: true, bornAt: 0, name: 'Throne',
      });
    },
  },

  // ===== 10. INVISIBLE HAND =====
  {
    id: 'market-economy',
    name: 'Invisible Hand',
    description: 'Buyers, sellers, wealth circulates',
    icon: '💰',
    typesCount: 3,
    particleCount: 500,
    spawnLayout: 'random',
    typeLabels: ['Producers', 'Traders', 'Consumers'],
    microConfig: {
      rmax: 0.30, force: 1.0, friction: 0.88, speedClamp: 0.12,
      beta: 0.2, coreRepel: 0.7, useDrag: true, drag: 1.0,
    },
    matrixInit: (m) => {
      // Circular economy: producers→traders→consumers→producers
      m.attract[0][0] = 0.4; m.attract[0][1] = 0.8; m.attract[0][2] = 0.2;
      m.attract[1][0] = 0.5; m.attract[1][1] = 0.3; m.attract[1][2] = 0.8;
      m.attract[2][0] = 0.7; m.attract[2][1] = 0.6; m.attract[2][2] = 0.35;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        m.radius[i][j] = 0.25;
        m.falloff[i][j] = 1.5;
      }
    },
  },

  // ===== 11. PLAGUE TIMES =====
  {
    id: 'pandemic-response',
    name: 'Plague Times',
    description: 'Infected spread, healthy flee, healers risk all',
    icon: '☣️',
    typesCount: 4,
    particleCount: 600,
    spawnLayout: 'center-scatter',
    typeLabels: ['Infected', 'Healthy', 'Immune', 'Healers'],
    microConfig: {
      rmax: 0.22, force: 2.0, friction: 0.86, speedClamp: 0.14,
      beta: 0.3, coreRepel: 1.3, useDrag: true, drag: 0.8,
    },
    matrixInit: (m) => {
      // Infected chase healthy, healthy flee, healers approach infected
      m.attract[0][0] = 0.3; m.attract[0][1] = 0.7; m.attract[0][2] = -0.3; m.attract[0][3] = -0.5;
      m.attract[1][0] = -1.0; m.attract[1][1] = 0.5; m.attract[1][2] = 0.4; m.attract[1][3] = 0.3;
      m.attract[2][0] = 0.3; m.attract[2][1] = 0.2; m.attract[2][2] = 0.4; m.attract[2][3] = 0.3;
      m.attract[3][0] = 0.8; m.attract[3][1] = 0.1; m.attract[3][2] = 0.3; m.attract[3][3] = 0.4;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        m.radius[i][j] = 0.18;
        m.falloff[i][j] = 1.0;
      }
    },
    socioSetup: (state) => {
      // Quarantine zone
      state.taboos.push({
        id: genId(state, 'taboo'), kind: 'NO_ENTER', pos: { x: 0.5, y: 0.5 },
        radius: 0.25, intensity: 1.0, bornAt: 0,
      });
      state.totems.push({
        id: genId(state, 'totem'), kind: 'BOND', pos: { x: -0.5, y: -0.5 },
        radius: 0.2, strength: 0.8, pinned: true, bornAt: 0, name: 'Hospital',
      });
    },
  },

  // ===== 12. WAR & PEACE =====
  {
    id: 'war-and-peace',
    name: 'War & Peace',
    description: 'Armies clash, diplomats negotiate',
    icon: '⚖️',
    typesCount: 5,
    particleCount: 800,
    spawnLayout: 'poles',
    typeLabels: ['France', 'Russia', 'Prussia', 'Austria', 'Diplomats'],
    microConfig: {
      rmax: 0.20, force: 2.2, friction: 0.87, speedClamp: 0.15,
      beta: 0.35, coreRepel: 1.5, useDrag: true, drag: 0.8,
    },
    matrixInit: (m) => {
      // Shifting alliances with strong conflicts
      const war = [
        [ 0.7, -0.8,  0.3, -0.5,  0.4],
        [-0.8,  0.7, -0.3,  0.4,  0.2],
        [ 0.3, -0.3,  0.7,  0.5, -0.1],
        [-0.5,  0.4,  0.5,  0.7,  0.3],
        [ 0.4,  0.2, -0.1,  0.3,  0.5],
      ];
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
        m.attract[i][j] = war[i][j];
        m.radius[i][j] = 0.16;
        m.falloff[i][j] = 1.0;
      }
    },
  },

  // ===== 13. MELTING POT =====
  {
    id: 'cultural-exchange',
    name: 'Melting Pot',
    description: 'Immigrants arrive, cultures blend',
    icon: '🌐',
    typesCount: 6,
    particleCount: 800,
    spawnLayout: 'clustered',
    typeLabels: ['Italian', 'Irish', 'Chinese', 'Jewish', 'African', 'Native'],
    microConfig: {
      rmax: 0.28, force: 1.2, friction: 0.92, speedClamp: 0.09,
      beta: 0.2, coreRepel: 0.6, useDrag: true, drag: 1.3,
    },
    matrixInit: (m) => {
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
        if (i === j) m.attract[i][j] = 0.55;
        else m.attract[i][j] = 0.35;
        m.radius[i][j] = 0.22;
        m.falloff[i][j] = 1.5;
      }
    },
  },

  // ===== 14. SILICON AGE =====
  {
    id: 'tech-revolution',
    name: 'Silicon Age',
    description: 'Innovators disrupt, laggards resist',
    icon: '💻',
    typesCount: 4,
    particleCount: 600,
    spawnLayout: 'spiral',
    typeLabels: ['Innovators', 'Early Adopters', 'Majority', 'Laggards'],
    microConfig: {
      rmax: 0.24, force: 1.6, friction: 0.86, speedClamp: 0.14,
      beta: 0.25, coreRepel: 1.0, useDrag: true, drag: 0.9,
    },
    matrixInit: (m) => {
      m.attract[0][0] = 0.4; m.attract[0][1] = 0.7; m.attract[0][2] = 0.3; m.attract[0][3] = -0.6;
      m.attract[1][0] = 0.8; m.attract[1][1] = 0.5; m.attract[1][2] = 0.5; m.attract[1][3] = -0.3;
      m.attract[2][0] = 0.2; m.attract[2][1] = 0.4; m.attract[2][2] = 0.6; m.attract[2][3] = 0.3;
      m.attract[3][0] = -0.7; m.attract[3][1] = -0.4; m.attract[3][2] = 0.3; m.attract[3][3] = 0.8;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        m.radius[i][j] = 0.2;
        m.falloff[i][j] = 1.2;
      }
    },
    socioSetup: (state) => {
      state.totems.push({
        id: genId(state, 'totem'), kind: 'ORACLE', pos: { x: 0, y: 0 },
        radius: 0.2, strength: 0.8, pinned: true, bornAt: 0, name: 'Silicon-Valley',
      });
    },
  },

  // ===== 15. ECO COLLAPSE =====
  {
    id: 'environmental-crisis',
    name: 'Eco Collapse',
    description: 'Resources dwindle, competition for survival',
    icon: '🌍',
    typesCount: 3,
    particleCount: 400,
    spawnLayout: 'random',
    typeLabels: ['Predators', 'Herbivores', 'Resources'],
    microConfig: {
      rmax: 0.18, force: 2.8, friction: 0.83, speedClamp: 0.18,
      beta: 0.4, coreRepel: 2.0, useDrag: true, drag: 0.6,
    },
    matrixInit: (m) => {
      m.attract[0][0] = 0.5; m.attract[0][1] = -0.9; m.attract[0][2] = -0.9;
      m.attract[1][0] = -0.9; m.attract[1][1] = 0.5; m.attract[1][2] = -0.9;
      m.attract[2][0] = -0.9; m.attract[2][1] = -0.9; m.attract[2][2] = 0.5;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        m.radius[i][j] = 0.14;
        m.falloff[i][j] = 0.7;
      }
    },
  },

  // ===== 16. EMPIRE EXPANDS =====
  {
    id: 'colonial-expansion',
    name: 'Empire Expands',
    description: 'Colonizers advance, natives resist',
    icon: '🗿',
    typesCount: 3,
    particleCount: 500,
    spawnLayout: 'poles',
    typeLabels: ['Colonizers', 'Settlers', 'Natives'],
    microConfig: {
      rmax: 0.24, force: 2.0, friction: 0.87, speedClamp: 0.13,
      beta: 0.3, coreRepel: 1.3, useDrag: true, drag: 0.9,
    },
    matrixInit: (m) => {
      m.attract[0][0] = 0.6; m.attract[0][1] = 0.5; m.attract[0][2] = 0.8;  // colonizers chase natives
      m.attract[1][0] = 0.7; m.attract[1][1] = 0.5; m.attract[1][2] = 0.2;
      m.attract[2][0] = -1.0; m.attract[2][1] = -0.7; m.attract[2][2] = 0.85; // natives flee
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        m.radius[i][j] = 0.2;
        m.falloff[i][j] = 1.1;
      }
    },
    socioSetup: (state) => {
      state.totems.push({
        id: genId(state, 'totem'), kind: 'BOND', pos: { x: 0.5, y: 0.3 },
        radius: 0.25, strength: 1.0, pinned: true, bornAt: 0, name: 'Sacred-Ground',
      });
      state.taboos.push({
        id: genId(state, 'taboo'), kind: 'NO_ENTER', pos: { x: 0.5, y: 0.3 },
        radius: 0.2, intensity: 0.9, bornAt: 0,
      });
    },
  },

  // ===== 17. RESISTANCE =====
  {
    id: 'resistance-movement',
    name: 'Revolution',
    description: 'Underground networks, sabotage, regime falls',
    icon: '✊',
    typesCount: 4,
    particleCount: 600,
    spawnLayout: 'border-pack',
    typeLabels: ['Regime', 'Collaborators', 'Resisters', 'Neutrals'],
    microConfig: {
      rmax: 0.20, force: 2.2, friction: 0.85, speedClamp: 0.15,
      beta: 0.35, coreRepel: 1.5, useDrag: true, drag: 0.8,
    },
    matrixInit: (m) => {
      m.attract[0][0] = 0.8; m.attract[0][1] = 0.6; m.attract[0][2] = -1.0; m.attract[0][3] = 0.3;
      m.attract[1][0] = 0.7; m.attract[1][1] = 0.6; m.attract[1][2] = -0.8; m.attract[1][3] = 0.2;
      m.attract[2][0] = -0.9; m.attract[2][1] = -0.7; m.attract[2][2] = 0.7; m.attract[2][3] = 0.5;
      m.attract[3][0] = 0.2; m.attract[3][1] = 0.1; m.attract[3][2] = 0.4; m.attract[3][3] = 0.5;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        m.radius[i][j] = 0.16;
        m.falloff[i][j] = 1.0;
      }
    },
    socioSetup: (state) => {
      state.totems.push({
        id: genId(state, 'totem'), kind: 'BOND', pos: { x: 0, y: 0 },
        radius: 0.2, strength: 1.2, pinned: true, bornAt: 0, name: 'Palace',
      });
      state.totems.push({
        id: genId(state, 'totem'), kind: 'RIFT', pos: { x: -0.6, y: 0.6 },
        radius: 0.15, strength: 0.8, pinned: true, bornAt: 0, name: 'Underground',
      });
    },
  },

  // ===== 18. UTOPIA =====
  {
    id: 'utopian-commune',
    name: 'Utopia Attempt',
    description: 'Idealists share all, test cooperation',
    icon: '☮️',
    typesCount: 2,
    particleCount: 400,
    spawnLayout: 'random',
    typeLabels: ['Idealists', 'Pragmatists'],
    microConfig: {
      rmax: 0.35, force: 0.8, friction: 0.94, speedClamp: 0.06,
      beta: 0.2, coreRepel: 0.5, useDrag: true, drag: 1.6,
    },
    matrixInit: (m) => {
      m.attract[0][0] = 0.8; m.attract[0][1] = 0.75;
      m.attract[1][0] = 0.75; m.attract[1][1] = 0.8;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        m.radius[i][j] = 0.3;
        m.falloff[i][j] = 1.6;
      }
    },
    socioSetup: (state) => {
      state.totems.push({
        id: genId(state, 'totem'), kind: 'BOND', pos: { x: 0, y: 0 },
        radius: 0.4, strength: 0.5, pinned: true, bornAt: 0, name: 'Commune',
      });
      state.rituals.push({
        id: genId(state, 'ritual'), kind: 'GATHER',
        totemId: state.totems[0].id, periodSec: 6, dutyCycle: 0.5,
        intensity: 0.8, bornAt: 0,
      });
    },
  },

  // ===== 19. PANOPTICON =====
  {
    id: 'surveillance-state',
    name: 'Panopticon',
    description: 'Watchers see all, conformity enforced',
    icon: '👁️',
    typesCount: 4,
    particleCount: 700,
    spawnLayout: 'border-pack',
    typeLabels: ['Watchers', 'Loyalists', 'Conformists', 'Dissidents'],
    microConfig: {
      rmax: 0.22, force: 1.8, friction: 0.91, speedClamp: 0.09,
      beta: 0.3, coreRepel: 1.2, useDrag: true, drag: 1.1,
    },
    matrixInit: (m) => {
      // Watchers attract toward dissidents (surveillance), others fear watchers
      m.attract[0][0] = 0.6; m.attract[0][1] = 0.4; m.attract[0][2] = 0.3; m.attract[0][3] = 0.7; // watchers chase dissidents
      m.attract[1][0] = 0.8; m.attract[1][1] = 0.6; m.attract[1][2] = 0.3; m.attract[1][3] = -0.7;
      m.attract[2][0] = 0.3; m.attract[2][1] = 0.3; m.attract[2][2] = 0.6; m.attract[2][3] = 0.1;
      m.attract[3][0] = -0.6; m.attract[3][1] = -0.8; m.attract[3][2] = 0.2; m.attract[3][3] = 0.6; // dissidents flee
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        m.radius[i][j] = i === 0 ? 0.25 : 0.14; // watchers see far
        m.falloff[i][j] = 1.1;
      }
    },
    socioSetup: (state) => {
      state.totems.push({
        id: genId(state, 'totem'), kind: 'ARCHIVE', pos: { x: 0, y: 0 },
        radius: 0.3, strength: 0.6, pinned: true, bornAt: 0, name: 'Panopticon',
      });
      // Taboo: dissidents not allowed near center
      state.taboos.push({
        id: genId(state, 'taboo'), kind: 'NO_MIX', pos: { x: 0, y: 0 },
        radius: 0.35, intensity: 1.0, targetType: 3, bornAt: 0,
      });
    },
  },

  // ===== 20. POTLATCH =====
  {
    id: 'gift-economy',
    name: 'Potlatch',
    description: 'Reciprocal giving, debts accumulate',
    icon: '🎁',
    typesCount: 5,
    particleCount: 600,
    spawnLayout: 'spiral',
    typeLabels: ['Clan A', 'Clan B', 'Clan C', 'Clan D', 'Clan E'],
    microConfig: {
      rmax: 0.26, force: 1.3, friction: 0.90, speedClamp: 0.10,
      beta: 0.25, coreRepel: 0.8, useDrag: true, drag: 1.1,
    },
    matrixInit: (m) => {
      for (let i = 0; i < 5; i++) {
        const next = (i + 1) % 5;
        const prev = (i - 1 + 5) % 5;
        for (let j = 0; j < 5; j++) {
          if (i === j) m.attract[i][j] = 0.45;
          else if (j === next) m.attract[i][j] = 0.8;
          else if (j === prev) m.attract[i][j] = 0.5;
          else m.attract[i][j] = 0.15;
          m.radius[i][j] = 0.2;
          m.falloff[i][j] = 1.4;
        }
      }
    },
    socioSetup: (state) => {
      state.totems.push({
        id: genId(state, 'totem'), kind: 'ORACLE', pos: { x: 0, y: 0 },
        radius: 0.2, strength: 0.6, pinned: true, bornAt: 0, name: 'Gathering-Place',
      });
      state.rituals.push({
        id: genId(state, 'ritual'), kind: 'PROCESSION',
        totemId: state.totems[0].id, periodSec: 10, dutyCycle: 0.4,
        intensity: 0.7, bornAt: 0,
      });
    },
  },
];
