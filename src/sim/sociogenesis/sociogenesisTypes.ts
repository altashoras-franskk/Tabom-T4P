// Sociogenesis Tool - Types & State
// Symbolic institutions that shape particle societies

export type TotemKind = 'BOND' | 'RIFT' | 'ORACLE' | 'ARCHIVE';
export type TabooKind = 'NO_ENTER' | 'NO_MIX';
export type RitualKind = 'GATHER' | 'PROCESSION' | 'OFFERING';
export type JusticeMode = 'RETRIBUTIVE' | 'RESTORATIVE' | 'AUTO';
export type SocioTool = 'SELECT' | 'TOTEM' | 'TABOO' | 'RITUAL';

// Active lens — one at a time
export type SocioLens = 'off' | 'culture' | 'law' | 'ritual' | 'field' | 'events' | 'economy' | 'territory';

// ── Meme palette (8 distinct colors, different from particle types) ──
export const MEME_COLORS: string[] = [
  '#ff6b9d', // pink
  '#ffd166', // yellow
  '#06d6a0', // teal
  '#118ab2', // blue
  '#ef476f', // red
  '#8ac926', // green
  '#ff9f1c', // orange
  '#2ec4b6', // cyan
];

// ── Culture / Prestige State (parallel arrays indexed by particle index) ──
export interface CultureState {
  memeId: Uint8Array;          // meme ID 0..M-1 per particle
  memeStrength: Float32Array;  // 0..1
  prestige: Float32Array;      // 0..1 (reputation)
  lastConvertAt: Float32Array; // seconds of last conversion
}

export interface CultureConfig {
  enabled: boolean;
  memeCount: number;           // default 6
  convertCooldownSec: number;  // default 6
  convertRadius: number;       // default 0.17
  convertRate: number;         // default 0.25
}

export function createCultureState(maxCount: number): CultureState {
  const memeId = new Uint8Array(maxCount);
  const memeStrength = new Float32Array(maxCount);
  const prestige = new Float32Array(maxCount);
  const lastConvertAt = new Float32Array(maxCount);
  memeStrength.fill(0.5);
  prestige.fill(0.05);
  return { memeId, memeStrength, prestige, lastConvertAt };
}

export function createCultureConfig(): CultureConfig {
  return {
    enabled: true,
    memeCount: 6,
    convertCooldownSec: 6,
    convertRadius: 0.17,
    convertRate: 0.25,
  };
}

// Foucault-inspired: particles can take on roles in the justice system
export type ParticleRole = 'NEUTRAL' | 'ENFORCER' | 'VIGILANTE' | 'RESISTER';

export interface ParticleRoleState {
  roles: ParticleRole[]; // indexed by particle id
  enforcerTargets: number[]; // particle id being chased by enforcer (-1 if none)
}

export interface Totem {
  id: string;
  kind: TotemKind;
  pos: { x: number; y: number };
  radius: number;
  strength: number;
  pinned: boolean;
  bornAt: number;
  name: string;
  emergent?: boolean; // true if auto-detected, false if manually placed
  affectedCount?: number; // how many particles currently influenced
  mobile?: boolean; // true if totem follows a particle
  targetParticleId?: number; // particle id to follow if mobile
}

export interface Taboo {
  id: string;
  kind: TabooKind;
  pos: { x: number; y: number };
  radius: number;
  intensity: number;
  targetType?: number; // for NO_MIX
  bornAt: number;
  emergent?: boolean; // true if auto-detected
  affectedCount?: number; // how many particles currently influenced
}

export interface Ritual {
  id: string;
  kind: RitualKind;
  totemId: string;
  periodSec: number;
  dutyCycle: number; // 0..1 fraction of period that is "active"
  intensity: number;
  bornAt: number;
  emergent?: boolean; // true if auto-detected
  affectedCount?: number; // how many particles currently in ritual
}

export interface Tribe {
  id: string;
  typeId: number;
  totems: string[];
  ethos: { cohesionBias: number; tensionBias: number };
  bornAt: number;
}

export type CaseStatus = 'OPEN' | 'RESOLVED';
export type CaseResolution = 'PUNISH' | 'RESTORE' | null;

export interface SocioCase {
  id: string;
  tabooId: string;
  offenderParticleId?: number;
  status: CaseStatus;
  resolution: CaseResolution;
  createdAt: number;
  resolvedAt?: number;
}

export interface SociogenesisConfig {
  enabled: boolean;
  cadenceSec: number;       // 2..10, default 5
  influenceGain: number;    // 0..0.25, default 0.12
  justiceMode: JusticeMode; // default 'AUTO'
  maxTotems: number;        // default 8
  maxRituals: number;       // default 8
  autoEmergence: boolean;   // enable emergent institution detection
  simSpeed: number;         // 0.25..2.0, default 1.0 - multiplier for time flow
  showImpactMetrics: boolean; // show how many particles affected by each symbol
  enableRoles: boolean;     // enable Foucault-inspired particle roles
}

export interface SocioSelection {
  type: 'totem' | 'taboo' | 'ritual' | 'tribe' | 'case';
  id: string;
}

export interface SocioOverlay {
  show: boolean;
  showTribes: boolean;
  showNorms: boolean;
  showChronicle: boolean;
}

export interface SociogenesisState {
  totems: Totem[];
  taboos: Taboo[];
  rituals: Ritual[];
  tribes: Tribe[];
  cases: SocioCase[];
  config: SociogenesisConfig;
  tool: SocioTool;
  selected: SocioSelection | null;
  overlay: SocioOverlay;
  lastTickTime: number;
  chronicle: SocioChronicleEntry[];
  nextId: number;
  roleState: ParticleRoleState;
  // Culture & Prestige system
  culture: CultureState;
  cultureConfig: CultureConfig;
}

export interface SocioChronicleEntry {
  time: number;
  icon: string;
  message: string;
  cause: string;
  consequence: string;
}

// Icon map for rendering
export const TOTEM_ICONS: Record<TotemKind, string> = {
  BOND: '\u2295',     // circled plus
  RIFT: '\u2716',     // heavy multiplication x
  ORACLE: '\u269A',   // staff of hermes
  ARCHIVE: '\u25A3',  // white square with small black square
};

export const TABOO_ICONS: Record<TabooKind, string> = {
  NO_ENTER: '\u26D4',  // no entry
  NO_MIX: '\u2298',    // circled division slash
};

export const RITUAL_ICONS: Record<RitualKind, string> = {
  GATHER: '\u2609',    // sun
  PROCESSION: '\u2742', // asterisk
  OFFERING: '\u2621',   // caution
};

export function createSociogenesisState(): SociogenesisState {
  return {
    totems: [],
    taboos: [],
    rituals: [],
    tribes: [],
    cases: [],
    config: {
      enabled: true,
      cadenceSec: 5, // slower for more readable emergence (was 2)
      influenceGain: 0.35, // amplified for visible effects (was 0.12)
      justiceMode: 'AUTO',
      maxTotems: 8,
      maxRituals: 8,
      autoEmergence: true, // enable auto-detection by default
      simSpeed: 0.5, // slower simulation speed (0.5x)
      showImpactMetrics: true,
      enableRoles: true,
    },
    tool: 'SELECT',
    selected: null,
    overlay: {
      show: true,
      showTribes: true,
      showNorms: true,
      showChronicle: true,
    },
    lastTickTime: 0,
    chronicle: [],
    nextId: 1,
    roleState: {
      roles: [],
      enforcerTargets: [],
    },
    culture: createCultureState(1000),
    cultureConfig: createCultureConfig(),
  };
}

export function genId(state: SociogenesisState, prefix: string): string {
  const id = `${prefix}-${String(state.nextId).padStart(3, '0')}`;
  state.nextId++;
  return id;
}