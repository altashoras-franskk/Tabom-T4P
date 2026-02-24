// ─── Sociogenesis Study Mode — 20 Scenarios ──────────────────────────────────
// Five thematic clusters: Genesis · Conflict · Economy · Culture · Power

import type { StudyConfig, StudySymbols, StudyTotem, StudyRitual, StudyTabu } from './studyTypes';
import type { SocialFieldConfig, SocialFields } from './socialFields';
import { depositN, depositL, depositR } from './socialFields';

export interface StudyScenario {
  id: string;
  name: string;
  icon: string;
  category: 'genesis' | 'conflict' | 'economy' | 'culture' | 'power';
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
      cfg.violationThreshold = 2; cfg.autoSymbols = false;
      fcfg.decayN = 0.008; fcfg.diffuseN = 0.14; fcfg.regenR = 0.016;
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
      cfg.aggressionBase = 0.28; cfg.ideologyPressure = 0.20; cfg.autoSymbols = false;
      fcfg.diffuseN = 0.08;
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
      cfg.violationThreshold = 2; cfg.exceptionDuration = 40; cfg.autoSymbols = false;
      fcfg.diffuseN = 0.04;
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
      cfg.violationThreshold = 10; cfg.autoSymbols = false;
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
      cfg.violationThreshold = 1; cfg.exceptionDuration = 40; cfg.autoSymbols = false;
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
];

export const SCENARIO_CATEGORIES: Record<string, string> = {
  genesis:  'Genesis',
  conflict: 'Conflict',
  economy:  'Economy',
  culture:  'Culture',
  power:    'Power',
};