// ─── Sociogenesis Study Mode — 20 Scenarios ──────────────────────────────────
// Five thematic clusters: Genesis · Conflict · Economy · Culture · Power

import type { StudyConfig, StudySymbols, StudyTotem, StudyRitual, StudyTabu, GroupProfile } from './studyTypes';
import type { SocialFieldConfig, SocialFields } from './socialFields';
import { depositN, depositL, depositR } from './socialFields';

export interface StudyScenario {
  id: string;
  name: string;
  icon: string;
  category: 'genesis' | 'conflict' | 'economy' | 'culture' | 'power' | 'multi-field';
  description: string;
  apply: (cfg: StudyConfig, fcfg: SocialFieldConfig) => void;
  setupWorld?: (fields: SocialFields, symbols: StudySymbols) => void;
}

let _sid = 500;
const uid = () => `sc-${_sid++}`;

// ── Helper shortcuts ──────────────────────────────────────────────────────────
const totem = (kind: StudyTotem['kind'], x: number, y: number, r = 0.26, g = 0, ps = 0.85): StudyTotem =>
  ({ id: uid(), kind, x, y, radius: r, groupId: g, pulseStrength: ps, bornAt: 0 });
const tabu = (kind: StudyTabu['kind'], x: number, y: number, r = 0.18, sev = 0.55): StudyTabu =>
  ({ id: uid(), kind, x, y, radius: r, severity: sev, bornAt: 0, violationCount: 0 });
const ritual = (kind: StudyRitual['kind'], x: number, y: number, r = 0.28, period = 8): StudyRitual =>
  ({ id: uid(), kind, x, y, radius: r, periodSec: period, lastFired: 0, active: false, bornAt: 0 });

export const STUDY_SCENARIOS: StudyScenario[] = [

  // ══════════════════════════════════════════════════════════ GENESIS ══════════

  {
    id: 'open_market', name: 'Open Market Tension', icon: '📈', category: 'economy',
    description: 'Resources abundant · no norms · accumulation → inequality & conflict',
    apply(cfg, fcfg) {
      cfg.agentCount = 160; cfg.groupCount = 4; cfg.speed = 0.50; cfg.aggressionBase = 0.35;
      cfg.trustBase = 0.45; cfg.kBelief = 0.20; cfg.harvestRate = 0.10; cfg.decayWealth = 0.008;
      cfg.ideologyPressure = 0.15; cfg.violationThreshold = 6; cfg.autoSymbols = true;
      fcfg.decayN = 0.035; fcfg.regenR = 0.040;
      cfg.groupProfiles = [
        { name: 'Oligarca',   sphere: 'economic',   fieldSensitivity: { n: 0.4, l: 1.0, r: 2.0 }, ideologyBias: 0.3,  trustBias: 0.3, aggressionBias: 0.2, cohesionBias: 0.6, desireBias: 0.7 },
        { name: 'Comerciante',sphere: 'economic',   fieldSensitivity: { n: 0.6, l: 0.8, r: 1.8 }, ideologyBias: 0.2,  trustBias: 0.4, aggressionBias: 0.2, cohesionBias: 0.4, desireBias: 0.6 },
        { name: 'Trabalhador',sphere: 'popular',     fieldSensitivity: { n: 1.3, l: 0.6, r: 1.4 }, ideologyBias: -0.1, trustBias: 0.5, aggressionBias: 0.3, cohesionBias: 0.5, desireBias: 0.5 },
        { name: 'Artesão',    sphere: 'artistic',    fieldSensitivity: { n: 0.5, l: 0.8, r: 1.2 }, ideologyBias: 0.1,  trustBias: 0.5, aggressionBias: 0.1, cohesionBias: 0.4, desireBias: 0.5 },
      ];
    },
    setupWorld(f, _s) {
      depositR(f,  0.55,  0.00, 0.60, 0.28); depositR(f, -0.45,  0.50, 0.50, 0.22);
      depositR(f, -0.20, -0.55, 0.40, 0.18); depositR(f,  0.10,  0.55, 0.35, 0.15);
    },
  },

  {
    id: 'discipline_state', name: 'Discipline State', icon: '🏛', category: 'power',
    description: 'Central BOND totem + Procession · high norms · conformity enforced',
    apply(cfg, fcfg) {
      cfg.agentCount = 140; cfg.groupCount = 3; cfg.speed = 0.38; cfg.aggressionBase = 0.18;
      cfg.trustBase = 0.65; cfg.kBelief = 0.65; cfg.kFear = 0.50; cfg.ideologyPressure = 0.40;
      cfg.violationThreshold = 2; cfg.autoSymbols = true;
      fcfg.decayN = 0.008; fcfg.diffuseN = 0.14; fcfg.regenR = 0.016;
      cfg.groupProfiles = [
        { name: 'Governante', sphere: 'political',  fieldSensitivity: { n: 1.0, l: 2.0, r: 1.0 }, ideologyBias: -0.6, trustBias: 0.6, aggressionBias: 0.15, cohesionBias: 0.8, desireBias: 0.2 },
        { name: 'Funcionário',sphere: 'political',  fieldSensitivity: { n: 1.2, l: 1.5, r: 0.8 }, ideologyBias: -0.4, trustBias: 0.7, aggressionBias: 0.1, cohesionBias: 0.6, desireBias: 0.3 },
        { name: 'Súdito',     sphere: 'popular',     fieldSensitivity: { n: 1.5, l: 0.6, r: 1.2 }, ideologyBias: -0.2, trustBias: 0.5, aggressionBias: 0.2, cohesionBias: 0.5, desireBias: 0.4 },
      ];
    },
    setupWorld(f, s) {
      for (let i = 0; i < f.n.length; i++) f.n[i] = Math.min(1, f.n[i] + 0.38);
      depositL(f, 0, 0, 0.55, 0.38);
      s.totems.push(totem('BOND', 0, 0, 0.34, 0, 1.0));
      s.rituals.push(ritual('PROCESSION', 0, 0, 0.50, 9));
      f.dirty = true;
    },
  },

  {
    id: 'sociedades_do_zero', name: 'Sociedades do zero', icon: '🌱', category: 'genesis',
    description: 'Agentes começam sem laços; famílias e laços formam com o tempo (proximidade + memória amigável)',
    apply(cfg, _fcfg) {
      cfg.agentCount = 200; cfg.groupCount = 4; cfg.speed = 0.48;
      cfg.startWithFamilies = false;
      cfg.spawnRelationMode = 'none';
      cfg.bondFormationRate = 0.06;
      cfg.trustBase = 0.50; cfg.empathy = 0.38; cfg.cohesion = 0.35;
    },
  },

  {
    id: 'polarization_spiral', name: 'Polarization Spiral', icon: '🌀', category: 'conflict',
    description: '2 RIFT totems · low trust · ideology → extreme polarization',
    apply(cfg, fcfg) {
      cfg.agentCount = 120; cfg.groupCount = 2; cfg.speed = 0.52; cfg.aggressionBase = 0.50;
      cfg.trustBase = 0.28; cfg.ideologyPressure = 0.65; cfg.violationThreshold = 3; cfg.autoSymbols = true;
      fcfg.diffuseN = 0.05; fcfg.diffuseL = 0.03;
    },
    setupWorld(f, s) {
      s.totems.push(totem('RIFT', -0.58, 0, 0.30, 0, 1.0));
      s.totems.push(totem('RIFT',  0.58, 0, 0.30, 1, 1.0));
      depositL(f, -0.58, 0, 0.45, 0.28); depositL(f, 0.58, 0, 0.45, 0.28);
      f.dirty = true;
    },
  },

  {
    id: 'sacred_founder', name: 'Sacred Founder', icon: '⛩️', category: 'genesis',
    description: 'Single massive BOND totem draws all groups · pilgrimage dynamics',
    apply(cfg, fcfg) {
      cfg.agentCount = 160; cfg.groupCount = 4; cfg.speed = 0.42; cfg.cohesion = 0.45;
      cfg.kBelief = 0.55; cfg.kFear = 0.25; cfg.ideologyPressure = 0.30; cfg.autoSymbols = true;
      fcfg.decayL = 0.004; fcfg.diffuseL = 0.08;
    },
    setupWorld(f, s) {
      s.totems.push(totem('BOND', 0, 0, 0.55, 0, 1.2));
      depositL(f, 0, 0, 0.90, 0.55); depositN(f, 0, 0, 0.60, 0.40);
      f.dirty = true;
    },
  },

  {
    id: 'tribal_council', name: 'Tribal Council', icon: '🔥', category: 'genesis',
    description: '5 independent tribes · each with a BOND totem · federation dynamics',
    apply(cfg, fcfg) {
      cfg.agentCount = 150; cfg.groupCount = 5; cfg.speed = 0.45; cfg.cohesion = 0.65;
      cfg.aggressionBase = 0.28; cfg.ideologyPressure = 0.20; cfg.autoSymbols = true;
      cfg.spawnRelationMode = 'none';
      cfg.startWithFamilies = false;
      cfg.bondFormationRate = 0.10;
      cfg.birthMemoryStrength = 0.75;
      fcfg.diffuseN = 0.08;
      cfg.groupProfiles = [
        { name: 'Tribo do Fogo',  sphere: 'military',   fieldSensitivity: { n: 1.0, l: 1.0, r: 1.2 }, ideologyBias: -0.3, trustBias: 0.5, aggressionBias: 0.35, cohesionBias: 0.8, desireBias: 0.4 },
        { name: 'Tribo da Água',  sphere: 'religious',   fieldSensitivity: { n: 1.6, l: 1.0, r: 0.6 }, ideologyBias: -0.4, trustBias: 0.6, aggressionBias: 0.1, cohesionBias: 0.7, desireBias: 0.3 },
        { name: 'Tribo do Vento', sphere: 'artistic',    fieldSensitivity: { n: 0.6, l: 0.8, r: 1.0 }, ideologyBias:  0.4, trustBias: 0.4, aggressionBias: 0.1, cohesionBias: 0.5, desireBias: 0.7 },
        { name: 'Tribo da Terra', sphere: 'economic',    fieldSensitivity: { n: 0.8, l: 0.6, r: 1.8 }, ideologyBias:  0.1, trustBias: 0.5, aggressionBias: 0.2, cohesionBias: 0.6, desireBias: 0.5 },
        { name: 'Tribo do Raio',  sphere: 'political',   fieldSensitivity: { n: 0.8, l: 1.6, r: 0.8 }, ideologyBias: -0.5, trustBias: 0.4, aggressionBias: 0.3, cohesionBias: 0.7, desireBias: 0.3 },
      ];
    },
    setupWorld(f, s) {
      const positions = [
        [0, -0.62], [0.59, -0.19], [0.36, 0.50], [-0.36, 0.50], [-0.59, -0.19],
      ];
      positions.forEach(([x, y], g) => {
        s.totems.push(totem('BOND', x, y, 0.22, g, 0.75));
        depositL(f, x, y, 0.35, 0.20);
      });
      f.dirty = true;
    },
  },

  // ══════════════════════════════════════════════════════════ CONFLICT ══════════

  {
    id: 'scarcity_war', name: 'Scarcity War', icon: '⚔️', category: 'conflict',
    description: 'Resources near depletion · groups clash over remaining hotspots',
    apply(cfg, fcfg) {
      cfg.agentCount = 160; cfg.groupCount = 4; cfg.speed = 0.55; cfg.aggressionBase = 0.60;
      cfg.trustBase = 0.30; cfg.harvestRate = 0.14; cfg.decayWealth = 0.025;
      cfg.violationThreshold = 4; cfg.autoSymbols = true;
      fcfg.regenR = 0.006; fcfg.decayR = 0.015;
    },
    setupWorld(f, _s) {
      // Only 2 small R hotspots for 160 agents → competition
      for (let i = 0; i < f.r.length; i++) f.r[i] = 0.05;
      depositR(f,  0.50, -0.50, 0.70, 0.22);
      depositR(f, -0.50,  0.50, 0.65, 0.20);
      f.dirty = true;
    },
  },

  {
    id: 'factional_war', name: 'Factional Holy War', icon: '🗡️', category: 'conflict',
    description: '2 groups · opposing RIFT totems · max aggression · legitimacy conflict',
    apply(cfg, fcfg) {
      cfg.agentCount = 140; cfg.groupCount = 2; cfg.speed = 0.58; cfg.aggressionBase = 0.72;
      cfg.trustBase = 0.15; cfg.ideologyPressure = 0.70; cfg.kFear = 0.55;
      cfg.violationThreshold = 2; cfg.exceptionDuration = 40; cfg.autoSymbols = true;
      fcfg.diffuseN = 0.04;
      cfg.groupProfiles = [
        { name: 'Cruzado',    sphere: 'religious',   fieldSensitivity: { n: 2.0, l: 1.5, r: 0.4 }, ideologyBias: -0.7, trustBias: 0.6, aggressionBias: 0.5, cohesionBias: 0.9, desireBias: 0.2 },
        { name: 'Herege',     sphere: 'religious',   fieldSensitivity: { n: 1.8, l: 0.8, r: 0.6 }, ideologyBias:  0.5, trustBias: 0.3, aggressionBias: 0.5, cohesionBias: 0.7, desireBias: 0.6 },
      ];
    },
    setupWorld(f, s) {
      s.totems.push(totem('RIFT', -0.55,  0.10, 0.32, 0, 1.1));
      s.totems.push(totem('RIFT',  0.55, -0.10, 0.32, 1, 1.1));
      depositL(f, -0.55, 0, 0.55, 0.30); depositL(f, 0.55, 0, 0.55, 0.30);
      s.tabus.push(tabu('NO_MIX', 0, 0, 0.20, 0.80)); // central mixing forbidden
      f.dirty = true;
    },
  },

  {
    id: 'the_schism', name: 'The Schism', icon: '💥', category: 'conflict',
    description: '4 groups unified then split — watch polarization break cohesion',
    apply(cfg, fcfg) {
      cfg.agentCount = 160; cfg.groupCount = 4; cfg.speed = 0.46; cfg.cohesion = 0.70;
      cfg.aggressionBase = 0.22; cfg.ideologyPressure = 0.55; cfg.autoSymbols = true;
      fcfg.diffuseN = 0.07; fcfg.diffuseL = 0.04;
    },
    setupWorld(f, s) {
      // Start unified, RIFT added at 2 corners to pull apart
      s.totems.push(totem('BOND',  0.00, 0.00, 0.40, 0, 0.8));
      s.totems.push(totem('RIFT',  0.70, 0.70, 0.22, 0, 0.9));
      s.totems.push(totem('RIFT', -0.70,-0.70, 0.22, 2, 0.9));
      depositN(f, 0, 0, 0.50, 0.40);
      f.dirty = true;
    },
  },

  {
    id: 'border_tensions', name: 'Border Tensions', icon: '🚧', category: 'conflict',
    description: '3 groups · 3 Taboo boundaries · mixing forbidden → endogamy',
    apply(cfg, fcfg) {
      cfg.agentCount = 150; cfg.groupCount = 3; cfg.speed = 0.44; cfg.aggressionBase = 0.40;
      cfg.trustBase = 0.35; cfg.autoSymbols = true;
      fcfg.diffuseN = 0.10;
    },
    setupWorld(f, s) {
      s.tabus.push(tabu('NO_MIX',  0.55,  0.00, 0.22, 0.70));
      s.tabus.push(tabu('NO_MIX', -0.28,  0.48, 0.22, 0.70));
      s.tabus.push(tabu('NO_MIX', -0.28, -0.48, 0.22, 0.70));
      f.dirty = true;
    },
  },

  // ══════════════════════════════════════════════════════════ ECONOMY ══════════

  {
    id: 'gold_rush', name: 'Gold Rush', icon: '💰', category: 'economy',
    description: '5 resource hotspots · fast harvest · visible inequality race',
    apply(cfg, fcfg) {
      cfg.agentCount = 160; cfg.groupCount = 4; cfg.harvestRate = 0.13; cfg.decayWealth = 0.006;
      cfg.aggressionBase = 0.30; cfg.trustBase = 0.50; cfg.autoSymbols = true;
      fcfg.regenR = 0.030; fcfg.decayR = 0.003;
    },
    setupWorld(f, _s) {
      const spots: [number,number][] = [[0.60,0],[-0.60,0],[0,0.60],[0,-0.60],[0,0]];
      spots.forEach(([x,y]) => depositR(f, x, y, 0.80, 0.18));
      f.dirty = true;
    },
  },

  {
    id: 'plutocracy', name: 'Plutocracy', icon: '🏦', category: 'economy',
    description: 'Extreme wealth→status advantage · elites dominate access to L',
    apply(cfg, fcfg) {
      cfg.agentCount = 160; cfg.groupCount = 4; cfg.harvestRate = 0.15; cfg.decayWealth = 0.004;
      cfg.aggressionBase = 0.20; cfg.trustBase = 0.45; cfg.ideologyPressure = 0.20;
      cfg.autoSymbols = true;
      fcfg.regenR = 0.025; fcfg.decayL = 0.004;
    },
    setupWorld(f, s) {
      depositR(f, 0, 0, 0.90, 0.50);
      s.totems.push(totem('BOND', 0, 0, 0.45, 0, 1.2)); // central L source benefits rich
      f.dirty = true;
    },
  },

  {
    id: 'redistribution', name: 'Redistribution Crisis', icon: '⚖️', category: 'economy',
    description: 'Equal starting R + fast depletion · GATHER rituals redistribute',
    apply(cfg, fcfg) {
      cfg.agentCount = 140; cfg.groupCount = 3; cfg.harvestRate = 0.08; cfg.decayWealth = 0.018;
      cfg.cohesion = 0.60; cfg.kBelief = 0.45; cfg.autoSymbols = true;
      fcfg.regenR = 0.012; fcfg.decayR = 0.010;
    },
    setupWorld(f, s) {
      // Uniform R but depletes fast
      for (let i = 0; i < f.r.length; i++) f.r[i] = 0.80;
      s.rituals.push(ritual('GATHER', -0.45, -0.45, 0.30, 7));
      s.rituals.push(ritual('GATHER',  0.45,  0.45, 0.30, 7));
      f.dirty = true;
    },
  },

  // ══════════════════════════════════════════════════════════ CULTURE ══════════

  {
    id: 'mind_merge', name: 'Mind Merge', icon: '🧠', category: 'culture',
    description: 'Extreme ideology pressure · 5 groups converging to single worldview',
    apply(cfg, fcfg) {
      cfg.agentCount = 150; cfg.groupCount = 5; cfg.speed = 0.40; cfg.ideologyPressure = 0.80;
      cfg.pressure = 0.60; cfg.trustBase = 0.70; cfg.aggressionBase = 0.10;
      cfg.autoSymbols = true; fcfg.diffuseN = 0.15;
    },
  },

  {
    id: 'reform_wave', name: 'Reform Wave', icon: '🌊', category: 'culture',
    description: 'Declining norms · high desire · transgression becomes new norm',
    apply(cfg, fcfg) {
      cfg.agentCount = 160; cfg.groupCount = 4; cfg.kDesire = 0.65; cfg.kBelief = 0.15;
      cfg.aggressionBase = 0.22; cfg.trustBase = 0.55; cfg.ideologyPressure = 0.35;
      cfg.violationThreshold = 8; cfg.autoSymbols = true;
      fcfg.decayN = 0.045; fcfg.diffuseN = 0.08;
    },
    setupWorld(f, _s) {
      for (let i = 0; i < f.n.length; i++) f.n[i] = Math.min(1, f.n[i] + 0.45); // starts high, decays
      f.dirty = true;
    },
  },

  {
    id: 'assembly_democracy', name: 'Assembly Democracy', icon: '🗳️', category: 'culture',
    description: '3 GATHER rituals · consensus building · polarization falls over time',
    apply(cfg, fcfg) {
      cfg.agentCount = 140; cfg.groupCount = 3; cfg.speed = 0.38; cfg.cohesion = 0.55;
      cfg.pressure = 0.50; cfg.trustBase = 0.65; cfg.aggressionBase = 0.12;
      cfg.autoSymbols = true; fcfg.diffuseN = 0.12;
    },
    setupWorld(f, s) {
      s.rituals.push(ritual('GATHER',  0.00,  0.00, 0.35, 7));
      s.rituals.push(ritual('GATHER', -0.55,  0.55, 0.28, 11));
      s.rituals.push(ritual('GATHER',  0.55,  0.55, 0.28, 11));
      f.dirty = true;
    },
  },

  {
    id: 'carnival_collapse', name: 'Carnival & Collapse', icon: '🎭', category: 'culture',
    description: 'High desire · ritual overload → fatigue cascade · norms dissolve',
    apply(cfg, fcfg) {
      cfg.agentCount = 160; cfg.groupCount = 4; cfg.speed = 0.58; cfg.kDesire = 0.75;
      cfg.kBelief = 0.10; cfg.aggressionBase = 0.18; cfg.trustBase = 0.60;
      cfg.violationThreshold = 10; cfg.autoSymbols = true;
      fcfg.decayN = 0.055; fcfg.regenR = 0.035;
    },
    setupWorld(f, s) {
      // Lots of rituals → fatigue
      s.rituals.push(ritual('GATHER',  0.00,  0.00, 0.45, 4));
      s.rituals.push(ritual('GATHER',  0.60,  0.60, 0.25, 3));
      s.rituals.push(ritual('GATHER', -0.60,  0.60, 0.25, 3));
      s.rituals.push(ritual('GATHER',  0.00, -0.65, 0.25, 5));
      for (let i = 0; i < f.r.length; i++) f.r[i] = 0.60;
      f.dirty = true;
    },
  },

  // ══════════════════════════════════════════════════════════ POWER ══════════

  {
    id: 'iron_order', name: 'Iron Order', icon: '⚙️', category: 'power',
    description: 'N field maxed · fear economy · exception threshold = 1 violation',
    apply(cfg, fcfg) {
      cfg.agentCount = 140; cfg.groupCount = 3; cfg.speed = 0.35; cfg.kBelief = 0.80;
      cfg.kFear = 0.75; cfg.aggressionBase = 0.10; cfg.trustBase = 0.55;
      cfg.violationThreshold = 1; cfg.exceptionDuration = 40; cfg.autoSymbols = true;
      fcfg.decayN = 0.005; fcfg.diffuseN = 0.18;
    },
    setupWorld(f, s) {
      for (let i = 0; i < f.n.length; i++) f.n[i] = 0.85;
      s.totems.push(totem('BOND', 0, 0, 0.55, 0, 1.4));
      s.rituals.push(ritual('PROCESSION', 0, 0, 0.65, 6));
      f.dirty = true;
    },
  },

  {
    id: 'panopticon', name: 'Panopticon', icon: '👁️', category: 'power',
    description: '4 Taboo NO_ENTER zones · surveillance grid · fear drives compliance',
    apply(cfg, fcfg) {
      cfg.agentCount = 150; cfg.groupCount = 3; cfg.speed = 0.40; cfg.kFear = 0.65;
      cfg.kBelief = 0.50; cfg.violationThreshold = 2; cfg.autoSymbols = true;
      fcfg.diffuseN = 0.12;
    },
    setupWorld(f, s) {
      s.tabus.push(tabu('NO_ENTER',  0.55,  0.55, 0.20, 0.80));
      s.tabus.push(tabu('NO_ENTER', -0.55,  0.55, 0.20, 0.80));
      s.tabus.push(tabu('NO_ENTER',  0.55, -0.55, 0.20, 0.80));
      s.tabus.push(tabu('NO_ENTER', -0.55, -0.55, 0.20, 0.80));
      f.dirty = true;
    },
  },

  {
    id: 'peace_brokers', name: 'Peace Brokers', icon: '🕊️', category: 'power',
    description: 'High trust · mediators dominant · cross-group bonds prevent escalation',
    apply(cfg, fcfg) {
      cfg.agentCount = 160; cfg.groupCount = 4; cfg.speed = 0.42; cfg.trustBase = 0.82;
      cfg.aggressionBase = 0.05; cfg.pressure = 0.55; cfg.cohesion = 0.40;
      cfg.ideologyPressure = 0.35; cfg.autoSymbols = true;
      fcfg.diffuseL = 0.10; fcfg.regenR = 0.025;
    },
  },

  {
    id: 'phoenix', name: 'Phoenix', icon: '🐦‍🔥', category: 'power',
    description: 'Starts in STATE OF EXCEPTION · watch how order rebuilds from collapse',
    apply(cfg, fcfg) {
      cfg.agentCount = 140; cfg.groupCount = 4; cfg.speed = 0.50; cfg.kFear = 0.60;
      cfg.kBelief = 0.40; cfg.aggressionBase = 0.45; cfg.trustBase = 0.30;
      cfg.violationThreshold = 1; cfg.exceptionDuration = 35; cfg.autoSymbols = true;
      fcfg.decayN = 0.025;
    },
    setupWorld(f, _s) {
      // Start with low N + high R (anomic abundance) → exception triggers fast
      for (let i = 0; i < f.n.length; i++) f.n[i] = 0.05;
      for (let i = 0; i < f.r.length; i++) f.r[i] = 0.70;
      f.dirty = true;
    },
  },

  // ══════════════════════════════════════════════════════ NEW SCENARIOS ════════

  // ── Genesis II ───────────────────────────────────────────────────────────────

  {
    id: 'nomadic_encounter', name: 'Nomadic Encounter', icon: '🏕️', category: 'genesis',
    description: 'High mobility · low loyalty · groups intermix freely → emergent tribes',
    apply(cfg) {
      cfg.agentCount = 180; cfg.groupCount = 5; cfg.speed = 0.55; cfg.mobility = 0.60;
      cfg.cohesion = 0.20; cfg.culturalInertia = 0.15; cfg.contagion = 0.55;
      cfg.empathy = 0.50; cfg.conformity = 0.15; cfg.cooperationBias = 0.35;
      cfg.autoSymbols = true;
    },
  },

  {
    id: 'silent_consensus', name: 'Silent Consensus', icon: '🤫', category: 'genesis',
    description: 'Extreme conformity · no aggression · ideology converges without conflict',
    apply(cfg) {
      cfg.agentCount = 160; cfg.groupCount = 3; cfg.conformity = 0.90; cfg.empathy = 0.65;
      cfg.aggressionBase = 0.02; cfg.ideologyPressure = 0.50; cfg.culturalInertia = 0.70;
      cfg.innovationRate = 0.01; cfg.autoSymbols = true;
    },
    setupWorld(f) {
      for (let i = 0; i < f.n.length; i++) f.n[i] = 0.35;
      f.dirty = true;
    },
  },

  {
    id: 'first_contact', name: 'First Contact', icon: '👋', category: 'genesis',
    description: '2 isolated groups meet · empathy vs aggression determines outcome',
    apply(cfg) {
      cfg.agentCount = 120; cfg.groupCount = 2; cfg.speed = 0.42; cfg.empathy = 0.55;
      cfg.aggressionBase = 0.35; cfg.contagion = 0.40; cfg.mobility = 0.15;
      cfg.culturalInertia = 0.60; cfg.cooperationBias = 0.25; cfg.autoSymbols = true;
    },
    setupWorld(f, s) {
      s.totems.push(totem('BOND', -0.60, 0, 0.22, 0, 0.7));
      s.totems.push(totem('BOND',  0.60, 0, 0.22, 1, 0.7));
      f.dirty = true;
    },
  },

  {
    id: 'oral_tradition', name: 'Oral Tradition', icon: '📖', category: 'genesis',
    description: 'High contagion + archives emerge · memes spread and crystallize',
    apply(cfg) {
      cfg.agentCount = 150; cfg.groupCount = 4; cfg.contagion = 0.75; cfg.culturalInertia = 0.55;
      cfg.hierarchyStrength = 0.50; cfg.empathy = 0.40; cfg.conformity = 0.45;
      cfg.autoSymbols = true;
    },
  },

  // ── Conflict II ──────────────────────────────────────────────────────────────

  {
    id: 'culture_war', name: 'Culture War', icon: '📡', category: 'conflict',
    description: 'High contagion + low empathy + innovation → memetic conflict',
    apply(cfg) {
      cfg.agentCount = 180; cfg.groupCount = 4; cfg.contagion = 0.70; cfg.empathy = 0.10;
      cfg.innovationRate = 0.15; cfg.ideologyPressure = 0.65; cfg.aggressionBase = 0.40;
      cfg.culturalInertia = 0.25; cfg.hierarchyStrength = 0.55; cfg.autoSymbols = true;
    },
    setupWorld(f, s) {
      s.totems.push(totem('RIFT', -0.50, -0.50, 0.24, 0, 0.9));
      s.totems.push(totem('RIFT',  0.50,  0.50, 0.24, 2, 0.9));
      f.dirty = true;
    },
  },

  {
    id: 'class_revolt', name: 'Class Revolt', icon: '✊', category: 'conflict',
    description: 'Extreme inequality + high desire + low conformity → uprising',
    apply(cfg) {
      cfg.agentCount = 200; cfg.groupCount = 3; cfg.speed = 0.52; cfg.aggressionBase = 0.45;
      cfg.conformity = 0.10; cfg.kDesire = 0.70; cfg.cooperationBias = 0.55;
      cfg.resourceScarcity = 0.20; cfg.harvestRate = 0.12; cfg.decayWealth = 0.020;
      cfg.violationThreshold = 2; cfg.autoSymbols = true;
      cfg.groupProfiles = [
        { name: 'Aristocrata',sphere: 'political',  fieldSensitivity: { n: 0.5, l: 2.0, r: 1.8 }, ideologyBias: -0.7, trustBias: 0.3, aggressionBias: 0.15, cohesionBias: 0.8, desireBias: 0.2 },
        { name: 'Operário',   sphere: 'popular',     fieldSensitivity: { n: 1.4, l: 0.5, r: 1.4 }, ideologyBias:  0.4, trustBias: 0.4, aggressionBias: 0.4, cohesionBias: 0.6, desireBias: 0.7 },
        { name: 'Intelectual',sphere: 'scientific',  fieldSensitivity: { n: 1.0, l: 1.3, r: 0.8 }, ideologyBias:  0.5, trustBias: 0.5, aggressionBias: 0.1, cohesionBias: 0.3, desireBias: 0.6 },
      ];
    },
    setupWorld(f) {
      for (let i = 0; i < f.r.length; i++) f.r[i] = 0.08;
      depositR(f, 0, 0, 0.90, 0.18);
      f.dirty = true;
    },
  },

  {
    id: 'proxy_war', name: 'Proxy War', icon: '🎭', category: 'conflict',
    description: '4 groups · 2 Oracles manipulate · hierarchy drives factional violence',
    apply(cfg) {
      cfg.agentCount = 160; cfg.groupCount = 4; cfg.hierarchyStrength = 0.80;
      cfg.aggressionBase = 0.38; cfg.empathy = 0.12; cfg.contagion = 0.50;
      cfg.ideologyPressure = 0.55; cfg.autoSymbols = true;
    },
    setupWorld(f, s) {
      s.totems.push(totem('ORACLE', -0.55, 0.20, 0.26, 0, 1.0));
      s.totems.push(totem('ORACLE',  0.55, -0.20, 0.26, 2, 1.0));
      depositL(f, -0.55, 0.20, 0.50, 0.25);
      depositL(f,  0.55, -0.20, 0.50, 0.25);
      f.dirty = true;
    },
  },

  {
    id: 'genocide_risk', name: 'Genocide Risk', icon: '🩸', category: 'conflict',
    description: 'Exception + max aggression + NO_MIX + zero empathy → worst case',
    apply(cfg) {
      cfg.agentCount = 140; cfg.groupCount = 2; cfg.speed = 0.50; cfg.aggressionBase = 0.80;
      cfg.empathy = 0.0; cfg.conformity = 0.70; cfg.kFear = 0.70; cfg.trustBase = 0.10;
      cfg.violationThreshold = 1; cfg.exceptionDuration = 50; cfg.autoSymbols = true;
    },
    setupWorld(f, s) {
      for (let i = 0; i < f.n.length; i++) f.n[i] = 0.70;
      s.tabus.push(tabu('NO_MIX', 0, 0, 0.30, 0.90));
      s.totems.push(totem('RIFT', -0.55, 0, 0.28, 0, 1.2));
      s.totems.push(totem('RIFT',  0.55, 0, 0.28, 1, 1.2));
      f.dirty = true;
    },
  },

  // ── Economy II ───────────────────────────────────────────────────────────────

  {
    id: 'commons_tragedy', name: 'Tragedy of the Commons', icon: '🌾', category: 'economy',
    description: 'Shared resources + zero cooperation → depletion → conflict',
    apply(cfg) {
      cfg.agentCount = 180; cfg.groupCount = 4; cfg.cooperationBias = 0.0;
      cfg.harvestRate = 0.14; cfg.decayWealth = 0.015; cfg.resourceScarcity = 0.30;
      cfg.aggressionBase = 0.35; cfg.conformity = 0.20; cfg.autoSymbols = true;
    },
    setupWorld(f) {
      for (let i = 0; i < f.r.length; i++) f.r[i] = 0.50;
      f.dirty = true;
    },
  },

  {
    id: 'gift_economy', name: 'Gift Economy', icon: '🎁', category: 'economy',
    description: 'Max cooperation + offering rituals + empathy → wealth equality',
    apply(cfg) {
      cfg.agentCount = 140; cfg.groupCount = 3; cfg.cooperationBias = 0.85;
      cfg.empathy = 0.65; cfg.harvestRate = 0.07; cfg.decayWealth = 0.010;
      cfg.aggressionBase = 0.05; cfg.conformity = 0.45; cfg.autoSymbols = true;
    },
    setupWorld(f, s) {
      s.rituals.push(ritual('OFFERING', 0, 0, 0.35, 6));
      s.rituals.push(ritual('OFFERING', -0.55, -0.55, 0.25, 8));
      for (let i = 0; i < f.r.length; i++) f.r[i] = 0.55;
      f.dirty = true;
    },
  },

  {
    id: 'colonial_extraction', name: 'Colonial Extraction', icon: '⛏️', category: 'economy',
    description: 'Central group hoards R · peripheral groups depleted · hierarchy exploits',
    apply(cfg) {
      cfg.agentCount = 180; cfg.groupCount = 4; cfg.hierarchyStrength = 0.75;
      cfg.cooperationBias = 0.10; cfg.harvestRate = 0.15; cfg.decayWealth = 0.005;
      cfg.resourceScarcity = 0.35; cfg.conformity = 0.55; cfg.autoSymbols = true;
      cfg.spawnRelationMode = 'sparse';
      cfg.startWithFamilies = false;
      cfg.bondFormationRate = 0.05;
      cfg.birthMemoryStrength = 0.85;
      cfg.groupProfiles = [
        { name: 'Colono',     sphere: 'political',  fieldSensitivity: { n: 0.5, l: 2.0, r: 1.8 }, ideologyBias: -0.6, trustBias: 0.3, aggressionBias: 0.3, cohesionBias: 0.8, desireBias: 0.4 },
        { name: 'Missionário',sphere: 'religious',   fieldSensitivity: { n: 2.0, l: 1.2, r: 0.4 }, ideologyBias: -0.7, trustBias: 0.6, aggressionBias: 0.1, cohesionBias: 0.7, desireBias: 0.15 },
        { name: 'Nativo',     sphere: 'popular',     fieldSensitivity: { n: 1.2, l: 0.4, r: 1.2 }, ideologyBias:  0.1, trustBias: 0.5, aggressionBias: 0.3, cohesionBias: 0.6, desireBias: 0.5 },
        { name: 'Escravo',    sphere: 'popular',     fieldSensitivity: { n: 1.5, l: 0.3, r: 1.5 }, ideologyBias:  0.3, trustBias: 0.2, aggressionBias: 0.4, cohesionBias: 0.5, desireBias: 0.7 },
      ];
    },
    setupWorld(f, s) {
      for (let i = 0; i < f.r.length; i++) f.r[i] = 0.10;
      depositR(f, 0, 0, 0.95, 0.30);
      s.totems.push(totem('BOND', 0, 0, 0.35, 0, 1.1));
      s.tabus.push(tabu('NO_ENTER', 0, 0, 0.20, 0.80));
      f.dirty = true;
    },
  },

  // ── Culture II ───────────────────────────────────────────────────────────────

  {
    id: 'renaissance', name: 'Renaissance', icon: '🎨', category: 'culture',
    description: 'High innovation + high empathy + oracles → cultural explosion',
    apply(cfg) {
      cfg.agentCount = 160; cfg.groupCount = 5; cfg.innovationRate = 0.20;
      cfg.empathy = 0.60; cfg.contagion = 0.55; cfg.culturalInertia = 0.10;
      cfg.cooperationBias = 0.45; cfg.hierarchyStrength = 0.40;
      cfg.aggressionBase = 0.08; cfg.autoSymbols = true;
      cfg.groupProfiles = [
        { name: 'Mecenas',    sphere: 'economic',   fieldSensitivity: { n: 0.6, l: 1.2, r: 1.8 }, ideologyBias: 0.2,  trustBias: 0.5, aggressionBias: 0.08, cohesionBias: 0.5, desireBias: 0.5 },
        { name: 'Artista',    sphere: 'artistic',    fieldSensitivity: { n: 0.4, l: 0.8, r: 1.0 }, ideologyBias: 0.6,  trustBias: 0.5, aggressionBias: 0.05, cohesionBias: 0.3, desireBias: 0.9 },
        { name: 'Humanista',  sphere: 'scientific',  fieldSensitivity: { n: 1.0, l: 1.5, r: 0.8 }, ideologyBias: 0.4,  trustBias: 0.7, aggressionBias: 0.05, cohesionBias: 0.4, desireBias: 0.6 },
        { name: 'Clero',      sphere: 'religious',   fieldSensitivity: { n: 1.8, l: 1.3, r: 0.4 }, ideologyBias: -0.5, trustBias: 0.6, aggressionBias: 0.1, cohesionBias: 0.7, desireBias: 0.15 },
        { name: 'Povo',       sphere: 'popular',     fieldSensitivity: { n: 1.2, l: 0.5, r: 1.3 }, ideologyBias: -0.1, trustBias: 0.4, aggressionBias: 0.2, cohesionBias: 0.5, desireBias: 0.5 },
      ];
    },
    setupWorld(f, s) {
      s.totems.push(totem('ORACLE', 0, 0, 0.30, 0, 1.0));
      depositR(f, 0, 0, 0.60, 0.40);
      f.dirty = true;
    },
  },

  {
    id: 'mass_hysteria', name: 'Mass Hysteria', icon: '😱', category: 'culture',
    description: 'Max empathy + fear contagion + low conformity → panic cascades',
    apply(cfg) {
      cfg.agentCount = 180; cfg.groupCount = 3; cfg.empathy = 0.90;
      cfg.kFear = 0.65; cfg.conformity = 0.15; cfg.contagion = 0.65;
      cfg.aggressionBase = 0.30; cfg.innovationRate = 0.08;
      cfg.speed = 0.55; cfg.autoSymbols = true;
    },
    setupWorld(f, s) {
      s.tabus.push(tabu('NO_ENTER', 0, 0, 0.25, 0.90));
      f.dirty = true;
    },
  },

  {
    id: 'cultural_assimilation', name: 'Cultural Assimilation', icon: '🔄', category: 'culture',
    description: 'High mobility + high conformity + 1 dominant BOND → groups merge',
    apply(cfg) {
      cfg.agentCount = 160; cfg.groupCount = 5; cfg.mobility = 0.50;
      cfg.conformity = 0.70; cfg.contagion = 0.60; cfg.culturalInertia = 0.20;
      cfg.empathy = 0.40; cfg.cohesion = 0.30; cfg.autoSymbols = true;
    },
    setupWorld(f, s) {
      s.totems.push(totem('BOND', 0, 0, 0.45, 0, 1.2));
      depositN(f, 0, 0, 0.60, 0.40);
      f.dirty = true;
    },
  },

  {
    id: 'counter_culture', name: 'Counter-Culture', icon: '✌️', category: 'culture',
    description: 'High innovation + low conformity + high desire → new movements emerge',
    apply(cfg) {
      cfg.agentCount = 160; cfg.groupCount = 4; cfg.innovationRate = 0.18;
      cfg.conformity = 0.08; cfg.kDesire = 0.65; cfg.empathy = 0.45;
      cfg.contagion = 0.50; cfg.culturalInertia = 0.15; cfg.mobility = 0.30;
      cfg.aggressionBase = 0.15; cfg.autoSymbols = true;
    },
    setupWorld(f) {
      for (let i = 0; i < f.n.length; i++) f.n[i] = 0.55;
      f.dirty = true;
    },
  },

  // ── Power II ─────────────────────────────────────────────────────────────────

  {
    id: 'theocracy', name: 'Theocracy', icon: '⛪', category: 'power',
    description: 'Oracle + BOND + max hierarchy + high conformity → total control',
    apply(cfg) {
      cfg.agentCount = 150; cfg.groupCount = 3; cfg.hierarchyStrength = 0.90;
      cfg.conformity = 0.80; cfg.kBelief = 0.75; cfg.empathy = 0.30;
      cfg.culturalInertia = 0.80; cfg.innovationRate = 0.01;
      cfg.violationThreshold = 1; cfg.autoSymbols = true;
      cfg.groupProfiles = [
        { name: 'Sacerdote',  sphere: 'religious',   fieldSensitivity: { n: 2.0, l: 1.8, r: 0.3 }, ideologyBias: -0.8, trustBias: 0.7, aggressionBias: 0.1, cohesionBias: 0.9, desireBias: 0.1 },
        { name: 'Fiel',       sphere: 'religious',   fieldSensitivity: { n: 1.8, l: 1.0, r: 0.6 }, ideologyBias: -0.5, trustBias: 0.6, aggressionBias: 0.15, cohesionBias: 0.7, desireBias: 0.2 },
        { name: 'Herético',   sphere: 'artistic',    fieldSensitivity: { n: 0.5, l: 0.6, r: 1.0 }, ideologyBias:  0.6, trustBias: 0.2, aggressionBias: 0.2, cohesionBias: 0.2, desireBias: 0.8 },
      ];
    },
    setupWorld(f, s) {
      for (let i = 0; i < f.n.length; i++) f.n[i] = 0.75;
      s.totems.push(totem('ORACLE', 0, 0, 0.40, 0, 1.3));
      s.totems.push(totem('BOND', 0, 0.35, 0.28, 0, 0.9));
      s.rituals.push(ritual('PROCESSION', 0, 0, 0.55, 7));
      depositL(f, 0, 0, 0.80, 0.45);
      f.dirty = true;
    },
  },

  {
    id: 'anarchist_commune', name: 'Anarchist Commune', icon: '🏴', category: 'power',
    description: 'Zero hierarchy + max cooperation + high empathy + no norms → self-org',
    apply(cfg) {
      cfg.agentCount = 120; cfg.groupCount = 4; cfg.hierarchyStrength = 0.0;
      cfg.cooperationBias = 0.80; cfg.empathy = 0.70; cfg.conformity = 0.0;
      cfg.groupProfiles = [
        { name: 'Assembleia', sphere: 'political',  fieldSensitivity: { n: 1.0, l: 1.0, r: 1.0 }, ideologyBias:  0.5, trustBias: 0.7, aggressionBias: 0.05, cohesionBias: 0.3, desireBias: 0.5 },
        { name: 'Artesão',    sphere: 'artistic',    fieldSensitivity: { n: 0.5, l: 0.8, r: 1.2 }, ideologyBias:  0.6, trustBias: 0.6, aggressionBias: 0.05, cohesionBias: 0.3, desireBias: 0.7 },
        { name: 'Agricultor', sphere: 'economic',    fieldSensitivity: { n: 0.6, l: 0.6, r: 1.6 }, ideologyBias:  0.2, trustBias: 0.6, aggressionBias: 0.1, cohesionBias: 0.4, desireBias: 0.4 },
        { name: 'Nômade',     sphere: 'popular',     fieldSensitivity: { n: 0.8, l: 0.5, r: 1.0 }, ideologyBias:  0.7, trustBias: 0.4, aggressionBias: 0.1, cohesionBias: 0.15, desireBias: 0.8 },
      ];
      cfg.kBelief = 0.05; cfg.kFear = 0.10; cfg.aggressionBase = 0.08;
      cfg.innovationRate = 0.12; cfg.mobility = 0.40; cfg.autoSymbols = true;
      cfg.violationThreshold = 99;
    },
    setupWorld(f) {
      for (let i = 0; i < f.r.length; i++) f.r[i] = 0.65;
      f.dirty = true;
    },
  },

  {
    id: 'populist_surge', name: 'Populist Surge', icon: '📢', category: 'power',
    description: 'Charismatic Oracle + high contagion + empathy → rapid mass movement',
    apply(cfg) {
      cfg.agentCount = 200; cfg.groupCount = 4; cfg.contagion = 0.80;
      cfg.empathy = 0.55; cfg.hierarchyStrength = 0.65; cfg.conformity = 0.45;
      cfg.ideologyPressure = 0.60; cfg.speed = 0.50; cfg.autoSymbols = true;
    },
    setupWorld(f, s) {
      s.totems.push(totem('ORACLE', -0.30, -0.30, 0.30, 0, 1.2));
      depositL(f, -0.30, -0.30, 0.65, 0.30);
      f.dirty = true;
    },
  },

  {
    id: 'panopticon_regime', name: 'Panopticon Regime', icon: '👁️', category: 'power',
    description: 'PANOPTICON + PROCESSION + strict tabus · fear rises · dictators emerge',
    apply(cfg, fcfg) {
      cfg.agentCount = 170; cfg.groupCount = 4; cfg.speed = 0.44;
      cfg.trustBase = 0.38; cfg.aggressionBase = 0.32;
      cfg.kBelief = 0.62; cfg.kFear = 0.70; cfg.conformity = 0.70;
      cfg.hierarchyStrength = 0.85; cfg.panopticism = 0.95;
      cfg.ideologyPressure = 0.45; cfg.violationThreshold = 2; cfg.exceptionDuration = 45;
      cfg.autoSymbols = true;
      fcfg.decayN = 0.010; fcfg.diffuseN = 0.10; fcfg.decayL = 0.006; fcfg.regenR = 0.014;
    },
    setupWorld(f, s) {
      // High N everywhere (discipline baseline)
      for (let i = 0; i < f.n.length; i++) f.n[i] = Math.min(1, f.n[i] + 0.30);
      // Central surveillance + legitimacy source
      s.totems.push(totem('PANOPTICON', 0, 0, 0.62, 0, 1.0));
      s.rituals.push(ritual('PROCESSION', 0, 0, 0.62, 8));
      // Tabus around the center to create transgression/justice dynamics
      s.tabus.push(tabu('NO_ENTER',  0.18, 0.08, 0.16, 0.70));
      s.tabus.push(tabu('NO_ENTER', -0.22,-0.12, 0.16, 0.70));
      // Scarce resources → hierarchy + coercion feedback
      for (let i = 0; i < f.r.length; i++) f.r[i] = 0.12;
      depositR(f,  0.65,  0.00, 0.70, 0.18);
      depositR(f, -0.65,  0.00, 0.55, 0.16);
      depositL(f, 0, 0, 0.55, 0.35);
      f.dirty = true;
    },
  },

  {
    id: 'state_church', name: 'State Church', icon: '⛪', category: 'power',
    description: 'BOND + ARCHIVE + GATHER · high belief · priests legitimize authority',
    apply(cfg, fcfg) {
      cfg.agentCount = 160; cfg.groupCount = 4; cfg.speed = 0.40;
      cfg.kBelief = 0.75; cfg.kFear = 0.35; cfg.kDesire = 0.22;
      cfg.hierarchyStrength = 0.70; cfg.conformity = 0.60; cfg.empathy = 0.35;
      cfg.cooperationBias = 0.25; cfg.culturalInertia = 0.70;
      cfg.panopticism = 0.25; cfg.autoSymbols = true;
      fcfg.decayN = 0.006; fcfg.diffuseN = 0.12; fcfg.decayL = 0.003; fcfg.regenR = 0.018;
    },
    setupWorld(f, s) {
      s.totems.push(totem('BOND', 0, 0, 0.48, 0, 1.15));
      s.totems.push(totem('ARCHIVE', 0.00, 0.38, 0.28, 0, 0.70));
      s.rituals.push(ritual('GATHER', 0, 0, 0.50, 9));
      depositN(f, 0, 0, 0.65, 0.45);
      depositL(f, 0, 0, 0.70, 0.40);
      f.dirty = true;
    },
  },

  {
    id: 'empire_collapse', name: 'Empire Collapse', icon: '🏚️', category: 'power',
    description: 'Archive crumbles · high innovation + mobility → fragmentation',
    apply(cfg) {
      cfg.agentCount = 180; cfg.groupCount = 5; cfg.mobility = 0.55;
      cfg.innovationRate = 0.15; cfg.culturalInertia = 0.10; cfg.conformity = 0.15;
      cfg.kBelief = 0.15; cfg.aggressionBase = 0.40; cfg.cooperationBias = 0.15;
      cfg.hierarchyStrength = 0.25; cfg.autoSymbols = true;
    },
    setupWorld(f, s) {
      s.totems.push(totem('ARCHIVE', 0, 0, 0.35, 0, 0.6));
      for (let i = 0; i < f.n.length; i++) f.n[i] = 0.50;
      for (let i = 0; i < f.l.length; i++) f.l[i] = 0.40;
      f.dirty = true;
    },
  },
  // ══════════════════════════════════════════════════════ MULTI-FIELD ══════════

  {
    id: 'bourdieu_fields', name: 'Campos Sociais', icon: '🔷', category: 'multi-field',
    description: '5 grupos com lógicas de campo distintas (Bourdieu) — político, econômico, religioso, artístico, científico',
    apply(cfg) {
      cfg.agentCount = 200; cfg.groupCount = 5; cfg.speed = 0.48;
      cfg.cohesion = 0.55; cfg.empathy = 0.35; cfg.mobility = 0.10;
      cfg.ideologyPressure = 0.30; cfg.autoSymbols = true;
      cfg.groupProfiles = [
        { name: 'Político',   sphere: 'political',  fieldSensitivity: { n: 1.4, l: 1.8, r: 0.5 }, ideologyBias: -0.4, trustBias: 0.5, aggressionBias: 0.35, cohesionBias: 0.7, desireBias: 0.4 },
        { name: 'Mercador',   sphere: 'economic',   fieldSensitivity: { n: 0.5, l: 0.7, r: 2.0 }, ideologyBias:  0.3, trustBias: 0.4, aggressionBias: 0.2, cohesionBias: 0.4, desireBias: 0.7 },
        { name: 'Devoto',     sphere: 'religious',   fieldSensitivity: { n: 2.0, l: 1.2, r: 0.3 }, ideologyBias: -0.6, trustBias: 0.8, aggressionBias: 0.15, cohesionBias: 0.9, desireBias: 0.15 },
        { name: 'Artista',    sphere: 'artistic',    fieldSensitivity: { n: 0.4, l: 0.9, r: 1.1 }, ideologyBias:  0.6, trustBias: 0.5, aggressionBias: 0.1, cohesionBias: 0.25, desireBias: 0.9 },
        { name: 'Científico', sphere: 'scientific',  fieldSensitivity: { n: 1.0, l: 1.5, r: 1.0 }, ideologyBias:  0.4, trustBias: 0.7, aggressionBias: 0.08, cohesionBias: 0.5, desireBias: 0.55 },
      ];
    },
    setupWorld(f, s) {
      depositL(f, -0.55, -0.30, 0.40, 0.30);
      depositR(f,  0.55, -0.30, 0.45, 0.30);
      depositN(f,  0.00,  0.55, 0.40, 0.35);
      depositL(f, -0.30,  0.30, 0.30, 0.20);
      depositR(f,  0.30,  0.30, 0.30, 0.20);
      s.totems.push(totem('BOND', 0, 0.55, 0.30, 2, 0.8));
      s.totems.push(totem('ARCHIVE', -0.30, 0.30, 0.25, 4, 0.6));
      f.dirty = true;
    },
  },

  {
    id: 'stratified_society', name: 'Sociedade Estratificada', icon: '🏛️', category: 'multi-field',
    description: 'Classes sociais com capitais diferentes — elite política, burguesia, clero, proletariado, marginais',
    apply(cfg) {
      cfg.agentCount = 200; cfg.groupCount = 5; cfg.speed = 0.42;
      cfg.hierarchyStrength = 0.70; cfg.cooperationBias = 0.20;
      cfg.mobility = 0.06; cfg.conformity = 0.50; cfg.autoSymbols = true;
      cfg.groupProfiles = [
        { name: 'Elite',       sphere: 'political',  fieldSensitivity: { n: 0.8, l: 2.0, r: 1.5 }, ideologyBias: -0.6, trustBias: 0.3, aggressionBias: 0.2, cohesionBias: 0.8, desireBias: 0.3 },
        { name: 'Burguesia',   sphere: 'economic',   fieldSensitivity: { n: 0.5, l: 1.0, r: 2.0 }, ideologyBias:  0.1, trustBias: 0.5, aggressionBias: 0.15, cohesionBias: 0.5, desireBias: 0.65 },
        { name: 'Clero',       sphere: 'religious',   fieldSensitivity: { n: 2.0, l: 1.5, r: 0.3 }, ideologyBias: -0.7, trustBias: 0.8, aggressionBias: 0.1, cohesionBias: 0.9, desireBias: 0.1 },
        { name: 'Trabalhador', sphere: 'popular',     fieldSensitivity: { n: 1.2, l: 0.6, r: 1.5 }, ideologyBias: -0.1, trustBias: 0.5, aggressionBias: 0.3, cohesionBias: 0.6, desireBias: 0.5 },
        { name: 'Marginal',    sphere: 'artistic',    fieldSensitivity: { n: 0.3, l: 0.4, r: 0.8 }, ideologyBias:  0.7, trustBias: 0.2, aggressionBias: 0.5, cohesionBias: 0.2, desireBias: 0.9 },
      ];
    },
    setupWorld(f, s) {
      depositL(f, 0, -0.50, 0.50, 0.45);
      depositR(f, 0.50, 0, 0.45, 0.35);
      depositN(f, -0.50, 0, 0.40, 0.40);
      s.totems.push(totem('BOND', 0, -0.50, 0.30, 0, 0.9));
      s.tabus.push(tabu('NO_MIX', 0, 0, 0.15, 0.70));
      f.dirty = true;
    },
  },

  {
    id: 'cultural_melting_pot', name: 'Caldeirão Cultural', icon: '🫕', category: 'multi-field',
    description: 'Alta mobilidade, diversidade radical — subculturas se misturam e colidem',
    apply(cfg) {
      cfg.agentCount = 180; cfg.groupCount = 5; cfg.speed = 0.55;
      cfg.mobility = 0.35; cfg.empathy = 0.50; cfg.innovationRate = 0.12;
      cfg.culturalInertia = 0.15; cfg.conformity = 0.20; cfg.autoSymbols = true;
      cfg.groupProfiles = [
        { name: 'Imigrante',   sphere: 'popular',     fieldSensitivity: { n: 1.3, l: 0.7, r: 1.5 }, ideologyBias: -0.2, trustBias: 0.4, aggressionBias: 0.2, cohesionBias: 0.7, desireBias: 0.6 },
        { name: 'Nativo',      sphere: 'political',   fieldSensitivity: { n: 1.0, l: 1.5, r: 1.0 }, ideologyBias: -0.3, trustBias: 0.5, aggressionBias: 0.3, cohesionBias: 0.6, desireBias: 0.35 },
        { name: 'Artista',     sphere: 'artistic',    fieldSensitivity: { n: 0.4, l: 0.8, r: 1.0 }, ideologyBias:  0.6, trustBias: 0.5, aggressionBias: 0.08, cohesionBias: 0.3, desireBias: 0.85 },
        { name: 'Comerciante', sphere: 'economic',    fieldSensitivity: { n: 0.5, l: 0.7, r: 2.0 }, ideologyBias:  0.2, trustBias: 0.4, aggressionBias: 0.15, cohesionBias: 0.4, desireBias: 0.6 },
        { name: 'Religioso',   sphere: 'religious',   fieldSensitivity: { n: 1.8, l: 1.2, r: 0.4 }, ideologyBias: -0.5, trustBias: 0.7, aggressionBias: 0.12, cohesionBias: 0.8, desireBias: 0.2 },
      ];
    },
    setupWorld(f) {
      depositN(f, 0, 0, 0.80, 0.25);
      depositL(f, 0, 0, 0.60, 0.20);
      depositR(f, -0.3, -0.3, 0.50, 0.30);
      depositR(f,  0.3,  0.3, 0.50, 0.30);
      f.dirty = true;
    },
  },

  {
    id: 'revolution_1789', name: 'Revolução', icon: '🔥', category: 'multi-field',
    description: 'Nobreza × Clero × Burguesia × Povo × Sans-culottes — tensão pré-revolucionária',
    apply(cfg) {
      cfg.agentCount = 200; cfg.groupCount = 5; cfg.speed = 0.50;
      cfg.aggressionBase = 0.40; cfg.ideologyPressure = 0.50;
      cfg.hierarchyStrength = 0.65; cfg.cooperationBias = 0.10;
      cfg.mobility = 0.08; cfg.autoSymbols = true;
      cfg.groupProfiles = [
        { name: 'Nobreza',       sphere: 'political',  fieldSensitivity: { n: 0.6, l: 2.0, r: 1.8 }, ideologyBias: -0.8, trustBias: 0.3, aggressionBias: 0.2, cohesionBias: 0.85, desireBias: 0.2 },
        { name: 'Clero',         sphere: 'religious',   fieldSensitivity: { n: 2.0, l: 1.5, r: 0.5 }, ideologyBias: -0.7, trustBias: 0.7, aggressionBias: 0.1, cohesionBias: 0.8, desireBias: 0.1 },
        { name: 'Burguesia',     sphere: 'economic',    fieldSensitivity: { n: 0.7, l: 1.2, r: 2.0 }, ideologyBias:  0.3, trustBias: 0.5, aggressionBias: 0.2, cohesionBias: 0.5, desireBias: 0.7 },
        { name: 'Povo',          sphere: 'popular',     fieldSensitivity: { n: 1.4, l: 0.5, r: 1.2 }, ideologyBias: -0.1, trustBias: 0.4, aggressionBias: 0.35, cohesionBias: 0.5, desireBias: 0.6 },
        { name: 'Sans-culotte',  sphere: 'military',    fieldSensitivity: { n: 1.0, l: 0.3, r: 0.8 }, ideologyBias:  0.8, trustBias: 0.2, aggressionBias: 0.65, cohesionBias: 0.6, desireBias: 0.9 },
      ];
    },
    setupWorld(f, s) {
      depositL(f, 0, -0.55, 0.55, 0.50);
      depositR(f, 0.50, -0.20, 0.40, 0.35);
      depositN(f, -0.50, 0, 0.40, 0.40);
      s.totems.push(totem('BOND', 0, -0.55, 0.30, 0, 1.0));
      s.totems.push(totem('RIFT', 0, 0.30, 0.25, 4, 0.9));
      f.dirty = true;
    },
  },

  {
    id: 'neoliberal_city', name: 'Metrópole Neoliberal', icon: '🏙️', category: 'multi-field',
    description: 'Financistas, tecnocratas, precários, artistas underground, migrantes — desigualdade extrema',
    apply(cfg) {
      cfg.agentCount = 200; cfg.groupCount = 5; cfg.speed = 0.52;
      cfg.resourceScarcity = 0.35; cfg.hierarchyStrength = 0.60;
      cfg.cooperationBias = 0.12; cfg.mobility = 0.15;
      cfg.innovationRate = 0.10; cfg.autoSymbols = true;
      cfg.groupProfiles = [
        { name: 'Financista',  sphere: 'economic',    fieldSensitivity: { n: 0.3, l: 1.0, r: 2.0 }, ideologyBias: 0.5,  trustBias: 0.3, aggressionBias: 0.15, cohesionBias: 0.7, desireBias: 0.5 },
        { name: 'Tecnocrata',  sphere: 'scientific',  fieldSensitivity: { n: 0.8, l: 1.6, r: 1.2 }, ideologyBias: 0.2,  trustBias: 0.6, aggressionBias: 0.1, cohesionBias: 0.5, desireBias: 0.4 },
        { name: 'Precário',    sphere: 'popular',     fieldSensitivity: { n: 1.5, l: 0.5, r: 1.5 }, ideologyBias: -0.1, trustBias: 0.3, aggressionBias: 0.4, cohesionBias: 0.5, desireBias: 0.7 },
        { name: 'Underground', sphere: 'artistic',    fieldSensitivity: { n: 0.3, l: 0.6, r: 0.7 }, ideologyBias: 0.7,  trustBias: 0.4, aggressionBias: 0.12, cohesionBias: 0.2, desireBias: 0.95 },
        { name: 'Migrante',    sphere: 'popular',     fieldSensitivity: { n: 1.4, l: 0.4, r: 1.6 }, ideologyBias: -0.2, trustBias: 0.35, aggressionBias: 0.25, cohesionBias: 0.8, desireBias: 0.55 },
      ];
    },
    setupWorld(f) {
      depositR(f, 0.50, -0.50, 0.50, 0.45);
      depositR(f, -0.40, 0.40, 0.30, 0.15);
      depositL(f, 0, -0.30, 0.40, 0.30);
      depositN(f, -0.50, -0.20, 0.35, 0.25);
      f.dirty = true;
    },
  },

  {
    id: 'exodo_urbano', name: 'Êxodo Urbano', icon: '🚶', category: 'multi-field',
    description: 'Centro colapsa em recursos; agentes migram para periferias e refazem laços',
    apply(cfg, fcfg) {
      cfg.agentCount = 200; cfg.groupCount = 5; cfg.speed = 0.56;
      cfg.spawnRelationMode = 'none'; cfg.startWithFamilies = false;
      cfg.bondFormationRate = 0.11; cfg.birthMemoryStrength = 0.90;
      cfg.mobility = 0.42; cfg.resourceScarcity = 0.22; cfg.cooperationBias = 0.22;
      cfg.empathy = 0.46; cfg.contagion = 0.48; cfg.autoSymbols = true;
      fcfg.regenR = 0.016; fcfg.decayR = 0.010;
    },
    setupWorld(f, s) {
      for (let i = 0; i < f.r.length; i++) f.r[i] = 0.08;
      depositR(f, -0.75, -0.65, 0.62, 0.26);
      depositR(f,  0.78, -0.60, 0.58, 0.24);
      depositR(f,  0.74,  0.66, 0.60, 0.24);
      depositR(f, -0.72,  0.70, 0.56, 0.23);
      depositN(f, 0, 0, -0.20, 0.50);
      s.tabus.push(tabu('NO_ENTER', 0, 0, 0.22, 0.65));
      f.dirty = true;
    },
  },

  {
    id: 'colonialismo', name: 'Colonialismo', icon: '🏴', category: 'economy',
    description: 'Extração desigual + fronteiras simbólicas + memórias de origem em disputa',
    apply(cfg, fcfg) {
      cfg.agentCount = 190; cfg.groupCount = 4; cfg.speed = 0.50;
      cfg.spawnRelationMode = 'sparse'; cfg.startWithFamilies = false;
      cfg.bondFormationRate = 0.06; cfg.birthMemoryStrength = 0.92;
      cfg.hierarchyStrength = 0.80; cfg.cooperationBias = 0.08;
      cfg.resourceScarcity = 0.30; cfg.panopticism = 0.62; cfg.autoSymbols = true;
      fcfg.diffuseN = 0.08; fcfg.regenR = 0.015;
    },
    setupWorld(f, s) {
      for (let i = 0; i < f.r.length; i++) f.r[i] = 0.11;
      depositR(f, 0.15, -0.10, 0.92, 0.28);
      s.totems.push(totem('PANOPTICON', 0.08, -0.02, 0.44, 0, 0.9));
      s.tabus.push(tabu('NO_ENTER', 0.12, -0.04, 0.18, 0.82));
      f.dirty = true;
    },
  },

  {
    id: 'formacao_tribal', name: 'Formação Tribal', icon: '🪶', category: 'genesis',
    description: 'Sociedade nasce sem famílias; clãs emergem por vizinhança, memória e cooperação',
    apply(cfg, fcfg) {
      cfg.agentCount = 170; cfg.groupCount = 5; cfg.speed = 0.46;
      cfg.spawnRelationMode = 'none'; cfg.startWithFamilies = false;
      cfg.bondFormationRate = 0.14; cfg.birthMemoryStrength = 0.74;
      cfg.cohesion = 0.56; cfg.empathy = 0.52; cfg.cooperationBias = 0.42;
      cfg.contagion = 0.34; cfg.autoSymbols = true;
      fcfg.diffuseN = 0.10; fcfg.regenR = 0.022;
    },
    setupWorld(f, s) {
      depositR(f, 0, -0.55, 0.45, 0.25);
      depositR(f, 0.58, 0.32, 0.35, 0.20);
      depositR(f, -0.58, 0.32, 0.35, 0.20);
      s.totems.push(totem('BOND', 0, -0.50, 0.24, 0, 0.75));
      f.dirty = true;
    },
  },

  {
    id: 'novas_ferramentas', name: 'Novas Ferramentas', icon: '🛠️', category: 'culture',
    description: 'Salto técnico aumenta mobilidade e contato; reconfigura laços e territórios sociais',
    apply(cfg, fcfg) {
      cfg.agentCount = 180; cfg.groupCount = 4; cfg.speed = 0.58;
      cfg.spawnRelationMode = 'sparse'; cfg.startWithFamilies = false;
      cfg.bondFormationRate = 0.09; cfg.birthMemoryStrength = 0.58;
      cfg.mobility = 0.50; cfg.innovationRate = 0.16; cfg.contagion = 0.62;
      cfg.empathy = 0.38; cfg.culturalInertia = 0.20; cfg.autoSymbols = true;
      fcfg.diffuseR = 0.08; fcfg.regenR = 0.024;
    },
    setupWorld(f, s) {
      s.totems.push(totem('ARCHIVE', -0.45, -0.25, 0.24, 0, 0.6));
      s.totems.push(totem('ORACLE', 0.48, 0.22, 0.24, 1, 0.75));
      depositR(f, 0.45, 0.20, 0.50, 0.25);
      f.dirty = true;
    },
  },

  {
    id: 'descoberta_cientifica', name: 'Descoberta Científica', icon: '🔬', category: 'culture',
    description: 'Alta compreensão e ética reduzem conflito e criam entanglement cooperativo estável',
    apply(cfg, fcfg) {
      cfg.agentCount = 160; cfg.groupCount = 4; cfg.speed = 0.44;
      cfg.spawnRelationMode = 'none'; cfg.startWithFamilies = false;
      cfg.bondFormationRate = 0.12; cfg.birthMemoryStrength = 0.50;
      cfg.empathy = 0.64; cfg.understandingGrowth = 0.28; cfg.ethicsGrowth = 0.26;
      cfg.aggressionBase = 0.08; cfg.innovationRate = 0.14; cfg.autoSymbols = true;
      fcfg.diffuseL = 0.11; fcfg.diffuseN = 0.10; fcfg.regenR = 0.020;
    },
    setupWorld(f, s) {
      s.totems.push(totem('ARCHIVE', 0, 0.35, 0.28, 0, 0.7));
      s.rituals.push(ritual('GATHER', 0, 0, 0.38, 8));
      depositL(f, 0, 0.35, 0.65, 0.35);
      depositN(f, 0, 0, 0.42, 0.42);
      f.dirty = true;
    },
  },

  {
    id: 'medieval_guilds', name: 'Guildas Medievais', icon: '⚒️', category: 'multi-field',
    description: 'Nobres, clero, mercadores, artesãos, camponeses — capitais simbólicos distintos',
    apply(cfg) {
      cfg.agentCount = 180; cfg.groupCount = 5; cfg.speed = 0.38;
      cfg.hierarchyStrength = 0.55; cfg.conformity = 0.60;
      cfg.culturalInertia = 0.65; cfg.mobility = 0.04;
      cfg.cooperationBias = 0.30; cfg.autoSymbols = true;
      cfg.groupProfiles = [
        { name: 'Nobre',     sphere: 'political',  fieldSensitivity: { n: 0.7, l: 2.0, r: 1.5 }, ideologyBias: -0.7, trustBias: 0.4, aggressionBias: 0.25, cohesionBias: 0.8, desireBias: 0.2 },
        { name: 'Clérigo',   sphere: 'religious',   fieldSensitivity: { n: 2.0, l: 1.3, r: 0.3 }, ideologyBias: -0.6, trustBias: 0.7, aggressionBias: 0.08, cohesionBias: 0.85, desireBias: 0.15 },
        { name: 'Mercador',  sphere: 'economic',    fieldSensitivity: { n: 0.5, l: 0.8, r: 2.0 }, ideologyBias: 0.2,  trustBias: 0.5, aggressionBias: 0.15, cohesionBias: 0.5, desireBias: 0.6 },
        { name: 'Artesão',   sphere: 'artistic',    fieldSensitivity: { n: 0.6, l: 0.7, r: 1.3 }, ideologyBias: 0.1,  trustBias: 0.6, aggressionBias: 0.12, cohesionBias: 0.6, desireBias: 0.5 },
        { name: 'Camponês',  sphere: 'popular',     fieldSensitivity: { n: 1.5, l: 0.4, r: 1.2 }, ideologyBias: -0.2, trustBias: 0.4, aggressionBias: 0.3, cohesionBias: 0.6, desireBias: 0.4 },
      ];
    },
    setupWorld(f, s) {
      depositL(f, 0, -0.50, 0.50, 0.40);
      depositR(f, 0, 0.20, 0.60, 0.25);
      depositN(f, -0.50, 0, 0.35, 0.35);
      s.totems.push(totem('BOND', 0, -0.50, 0.30, 0, 0.8));
      s.totems.push(totem('BOND', -0.50, 0, 0.25, 1, 0.7));
      s.rituals.push(ritual('FEAST', 0, 0.20, 0.35, 12));
      f.dirty = true;
    },
  },

  {
    id: 'cold_war_blocs', name: 'Blocos Ideológicos', icon: '🌐', category: 'multi-field',
    description: '3 blocos (Ocidente, Leste, Não-alinhados) + militares + intelectuais dissidentes',
    apply(cfg) {
      cfg.agentCount = 200; cfg.groupCount = 5; cfg.speed = 0.44;
      cfg.aggressionBase = 0.35; cfg.ideologyPressure = 0.55;
      cfg.panopticism = 0.65; cfg.conformity = 0.55;
      cfg.mobility = 0.05; cfg.autoSymbols = true;
      cfg.groupProfiles = [
        { name: 'Ocidente',      sphere: 'political',  fieldSensitivity: { n: 0.6, l: 1.8, r: 1.8 }, ideologyBias:  0.5, trustBias: 0.5, aggressionBias: 0.25, cohesionBias: 0.7, desireBias: 0.5 },
        { name: 'Leste',         sphere: 'political',  fieldSensitivity: { n: 1.6, l: 1.8, r: 0.4 }, ideologyBias: -0.7, trustBias: 0.5, aggressionBias: 0.3, cohesionBias: 0.8, desireBias: 0.2 },
        { name: 'Não-alinhado',  sphere: 'popular',     fieldSensitivity: { n: 1.2, l: 0.8, r: 1.2 }, ideologyBias:  0.0, trustBias: 0.4, aggressionBias: 0.2, cohesionBias: 0.4, desireBias: 0.5 },
        { name: 'Militar',       sphere: 'military',    fieldSensitivity: { n: 0.8, l: 1.5, r: 0.8 }, ideologyBias: -0.5, trustBias: 0.3, aggressionBias: 0.6, cohesionBias: 0.9, desireBias: 0.3 },
        { name: 'Dissidente',    sphere: 'artistic',    fieldSensitivity: { n: 0.5, l: 0.5, r: 0.6 }, ideologyBias:  0.8, trustBias: 0.3, aggressionBias: 0.1, cohesionBias: 0.2, desireBias: 0.9 },
      ];
    },
    setupWorld(f, s) {
      depositL(f, -0.55, 0, 0.50, 0.40);
      depositL(f, 0.55, 0, 0.50, 0.40);
      depositN(f, 0.55, 0, 0.40, 0.30);
      depositR(f, -0.55, 0, 0.40, 0.30);
      s.totems.push(totem('RIFT', -0.55, 0, 0.30, 0, 0.9));
      s.totems.push(totem('RIFT',  0.55, 0, 0.30, 1, 0.9));
      s.totems.push(totem('PANOPTICON', 0.55, 0, 0.40, 1, 0.8));
      f.dirty = true;
    },
  },

  {
    id: 'digital_platform', name: 'Plataforma Digital', icon: '📱', category: 'multi-field',
    description: 'Influencers, trolls, moderadores, consumidores, ativistas — economia da atenção',
    apply(cfg) {
      cfg.agentCount = 200; cfg.groupCount = 5; cfg.speed = 0.60;
      cfg.contagion = 0.55; cfg.empathy = 0.25; cfg.mobility = 0.25;
      cfg.innovationRate = 0.15; cfg.conformity = 0.35; cfg.autoSymbols = true;
      cfg.groupProfiles = [
        { name: 'Influencer',  sphere: 'artistic',    fieldSensitivity: { n: 0.6, l: 1.5, r: 1.5 }, ideologyBias: 0.3,  trustBias: 0.3, aggressionBias: 0.1, cohesionBias: 0.3, desireBias: 0.8 },
        { name: 'Troll',       sphere: 'military',    fieldSensitivity: { n: 0.8, l: 0.5, r: 0.5 }, ideologyBias: 0.6,  trustBias: 0.1, aggressionBias: 0.7, cohesionBias: 0.2, desireBias: 0.7 },
        { name: 'Moderador',   sphere: 'political',   fieldSensitivity: { n: 1.2, l: 1.8, r: 0.8 }, ideologyBias: -0.3, trustBias: 0.6, aggressionBias: 0.1, cohesionBias: 0.5, desireBias: 0.3 },
        { name: 'Consumidor',  sphere: 'economic',    fieldSensitivity: { n: 0.7, l: 0.6, r: 1.8 }, ideologyBias: 0.0,  trustBias: 0.5, aggressionBias: 0.15, cohesionBias: 0.4, desireBias: 0.6 },
        { name: 'Ativista',    sphere: 'popular',     fieldSensitivity: { n: 1.5, l: 1.0, r: 0.5 }, ideologyBias: 0.5,  trustBias: 0.4, aggressionBias: 0.35, cohesionBias: 0.6, desireBias: 0.7 },
      ];
    },
    setupWorld(f) {
      depositN(f, 0, 0, 0.90, 0.20);
      depositL(f, 0, 0, 0.70, 0.15);
      depositR(f, 0, 0, 0.60, 0.15);
      f.dirty = true;
    },
  },
];

export const SCENARIO_CATEGORIES: Record<string, string> = {
  genesis:      'Genesis',
  conflict:     'Conflict',
  economy:      'Economy',
  culture:      'Culture',
  power:        'Power',
  'multi-field': 'Campos Sociais',
};