// ── Psyche Lab — Consciousness Generation Engine ─────────────────────────────
import { PsycheConfig, ArchetypeId, ARCHETYPE_IDS } from './psycheTypes';

export interface ConsciousnessProfile {
  name:               string;
  description:        string;
  poeticLine:         string;
  archetypeWeights:   Partial<Record<ArchetypeId, number>>;
  activeArchetypes:   ArchetypeId[];
  configMods:         Partial<PsycheConfig>;
  dominantArchetype:  ArchetypeId;
  predictedPhase:     string;
  color:              string;
}

export interface Complexo {
  id:          string;
  name:        string;
  sigil:       string;
  color:       string;
  keywords:    string[];
  description: string;
  poeticLine:  string;
  archetypes:  Partial<Record<ArchetypeId, number>>;
  configMods:  Partial<PsycheConfig>;
}

// ── 8 Psychological Complexos ─────────────────────────────────────────────────

export const COMPLEXOS: Complexo[] = [
  {
    id:          'hero-inflation',
    name:        'Herói Inflado',
    sigil:       '↑',
    color:       '#3b82f6',
    keywords:    ['força', 'direção', 'sombra negada'],
    description: 'Ego identificado com o Herói. Persona brilhante. Sombra cresce às escuras.',
    poeticLine:  'A espada erguida que não vê sua própria sombra.',
    archetypes:  { HERO: 0.95, PERSONA: 0.85, FATHER: 0.75, SHADOW: 0.25, SELF: 0.10 },
    configMods:  { danceIntensity: 0.38, maxSpeed: 0.30, breathPeriod: 10, selfPull: 0.08 },
  },
  {
    id:          'shadow-surge',
    name:        'Sombra Emergente',
    sigil:       '◗',
    color:       '#7c3aed',
    keywords:    ['reprimido', 'retorno', 'complexo'],
    description: 'Conteúdo reprimido pressiona por emergência. Vórtices no quadrante da Sombra.',
    poeticLine:  'O que foi enterrado começa a mover a terra.',
    archetypes:  { SHADOW: 0.95, DESTROYER: 0.80, TRICKSTER: 0.65, SELF: 0.20, HERO: 0.20 },
    configMods:  { danceIntensity: 0.50, maxSpeed: 0.40, breathPeriod: 8,  selfPull: 0.12 },
  },
  {
    id:          'grande-mae',
    name:        'Grande Mãe',
    sigil:       '∞',
    color:       '#f59e0b',
    keywords:    ['nutrição', 'eros', 'vínculo'],
    description: 'Campo matrizal dominante. Anima e Amante tecem o espaço.',
    poeticLine:  'A mão que sustenta sem prender.',
    archetypes:  { MOTHER: 0.95, ANIMA: 0.80, LOVER: 0.75, CHILD: 0.60, SELF: 0.55 },
    configMods:  { danceIntensity: 0.26, maxSpeed: 0.20, breathPeriod: 22, selfPull: 0.22 },
  },
  {
    id:          'lei-pai',
    name:        'Lei do Pai',
    sigil:       '⊞',
    color:       '#6b7280',
    keywords:    ['estrutura', 'repressão', 'lei'],
    description: 'Estrutura normativa alta. Inibição cresce. Movimento restrito mas coeso.',
    poeticLine:  'A lei que ordena também aprisiona.',
    archetypes:  { FATHER: 0.95, PERSONA: 0.75, HERO: 0.55, SHADOW: 0.35, SELF: 0.15 },
    configMods:  { danceIntensity: 0.28, maxSpeed: 0.20, breathPeriod: 18, selfPull: 0.10 },
  },
  {
    id:          'crianca-divina',
    name:        'Criança Divina',
    sigil:       '✧',
    color:       '#06b6d4',
    keywords:    ['potencial', 'abertura', 'renascimento'],
    description: 'Abertura radical ao novo. Inibição baixa. Movimento livre e exploratório.',
    poeticLine:  'O olho que vê tudo pela primeira vez.',
    archetypes:  { CHILD: 0.95, LOVER: 0.75, ANIMA: 0.70, TRICKSTER: 0.55, SELF: 0.40 },
    configMods:  { danceIntensity: 0.42, maxSpeed: 0.34, breathPeriod: 12, selfPull: 0.16 },
  },
  {
    id:          'velho-sabio',
    name:        'Velho Sábio',
    sigil:       '◉',
    color:       '#6366f1',
    keywords:    ['síntese', 'sentido', 'profundidade'],
    description: 'Self e Sábio em confluência. Integração ativa. Campo centralizado.',
    poeticLine:  'O silêncio que contém todas as respostas.',
    archetypes:  { WISE_ONE: 0.95, SELF: 0.90, ANIMA: 0.65, MOTHER: 0.55, SHADOW: 0.30 },
    configMods:  { danceIntensity: 0.22, maxSpeed: 0.16, breathPeriod: 28, selfPull: 0.30 },
  },
  {
    id:          'possessao',
    name:        'Possessão',
    sigil:       '⚡',
    color:       '#84cc16',
    keywords:    ['caos', 'ruptura', 'transfiguração'],
    description: 'Trickster e Destruidor dominam. Estrutura colapsa. Reconfiguração emerge.',
    poeticLine:  'O relâmpago que ilumina ao destruir.',
    archetypes:  { TRICKSTER: 0.95, DESTROYER: 0.88, SHADOW: 0.75, SELF: 0.10, HERO: 0.15 },
    configMods:  { danceIntensity: 0.68, maxSpeed: 0.58, breathPeriod: 6,  selfPull: 0.08 },
  },
  {
    id:          'individuation',
    name:        'Individuação',
    sigil:       '✦',
    color:       '#f5c842',
    keywords:    ['integração', 'totalidade', 'mandala'],
    description: 'Todos em equilíbrio dinâmico. Self como centro gravitacional.',
    poeticLine:  'O círculo que contém todos os opostos.',
    archetypes:  { SELF: 0.90, WISE_ONE: 0.75, HERO: 0.65, SHADOW: 0.55, ANIMA: 0.60, MOTHER: 0.50 },
    configMods:  { danceIntensity: 0.30, maxSpeed: 0.22, breathPeriod: 22, selfPull: 0.28 },
  },
];

// ── Name pools ─────────────────────────────────────────────────────────────────

const NAMES: Partial<Record<ArchetypeId, string[]>> = {
  SHADOW:    ['O Retorno',      'A Sombra que Fala',  'O Abismo',         'A Escuridão Fértil'],
  HERO:      ['A Espada',       'O Ego Diretivo',     'O Conquistador',   'A Força Cega'],
  SELF:      ['O Centro',       'O Mandala Vivo',     'A Totalidade',     'O Eixo'],
  TRICKSTER: ['O Caos',         'O Shapeshifter',     'A Ordem Quebrada', 'O Limiar'],
  MOTHER:    ['O Campo',        'A Nutrição',         'O Acolhimento',    'A Origem'],
  DESTROYER: ['A Ruptura',      'O Fim Necessário',   'A Transfiguração', 'O Vazio'],
  ANIMA:     ['A Ponte',        'O Mensageiro',       'O Feminino',       'A Mediação'],
  WISE_ONE:  ['O Sábio',        'A Síntese',          'O Sentido',        'A Profundidade'],
  FATHER:    ['A Lei',          'A Estrutura',        'O Pai',            'A Norma'],
  CHILD:     ['O Novo',         'O Potencial',        'A Abertura',       'A Inocência'],
  LOVER:     ['O Eros',         'O Vínculo',          'A Ressonância',    'O Encontro'],
  PERSONA:   ['A Máscara',      'O Papel',            'A Interface',      'O Rosto Público'],
};

const ARCH_COLORS: Partial<Record<ArchetypeId, string>> = {
  SELF: '#f5c842', PERSONA: '#b0c4de', SHADOW: '#7c3aed', ANIMA: '#f43f5e',
  TRICKSTER: '#84cc16', HERO: '#3b82f6', MOTHER: '#f59e0b', FATHER: '#6b7280',
  WISE_ONE: '#6366f1', CHILD: '#06b6d4', LOVER: '#ec4899', DESTROYER: '#ef4444',
};

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Random generation ─────────────────────────────────────────────────────────

export function generateRandomProfile(): ConsciousnessProfile {
  const seed = pick(COMPLEXOS);
  const weights: Partial<Record<ArchetypeId, number>> = {};

  // Seed archetypes with noise
  for (const [id, str] of Object.entries(seed.archetypes)) {
    weights[id as ArchetypeId] = Math.max(0.05, Math.min(1,
      (str as number) + (Math.random() - 0.5) * 0.28));
  }
  // Add 1-2 random extras
  const extras = ARCHETYPE_IDS.filter(id => !(id in weights));
  const nExtras = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < nExtras; i++) {
    const extra = pick(extras.slice(i));
    if (extra) weights[extra] = 0.12 + Math.random() * 0.42;
  }

  const dominant = getDominant(weights);
  const name = pick(NAMES[dominant] ?? ['Uma Nova Consciência']);
  const color = ARCH_COLORS[dominant] ?? '#c4b5fd';

  const mods = { ...seed.configMods };
  if (mods.danceIntensity) mods.danceIntensity = clamp(mods.danceIntensity + (Math.random() - 0.5) * 0.14, 0.12, 0.75);
  if (mods.maxSpeed)       mods.maxSpeed       = clamp(mods.maxSpeed       + (Math.random() - 0.5) * 0.10, 0.10, 0.65);
  if (mods.breathPeriod)   mods.breathPeriod   = clamp(mods.breathPeriod   + (Math.random() - 0.5) * 8,    6,    55);

  return {
    name, description: seed.description, poeticLine: seed.poeticLine,
    archetypeWeights: weights, activeArchetypes: Object.keys(weights) as ArchetypeId[],
    configMods: mods, dominantArchetype: dominant,
    predictedPhase: predictPhase(weights), color,
  };
}

// ── Composed generation ───────────────────────────────────────────────────────

export function generateComposedProfile(ids: string[]): ConsciousnessProfile | null {
  if (ids.length === 0) return null;
  const selected = COMPLEXOS.filter(c => ids.includes(c.id));
  if (selected.length === 0) return null;

  const merged: Partial<Record<ArchetypeId, number>> = {};
  for (const c of selected) {
    for (const [id, str] of Object.entries(c.archetypes) as [ArchetypeId, number][]) {
      merged[id] = Math.min(1, Math.max(merged[id] ?? 0, str) * 0.80 + str * 0.20);
    }
  }

  const avgD = avg(selected, c => c.configMods.danceIntensity ?? 0.32);
  const avgS = avg(selected, c => c.configMods.maxSpeed       ?? 0.24);
  const avgB = avg(selected, c => c.configMods.breathPeriod   ?? 20);
  const avgP = avg(selected, c => c.configMods.selfPull       ?? 0.18);

  const dominant = getDominant(merged);
  const color    = ARCH_COLORS[dominant] ?? '#c4b5fd';
  const name     = selected.map(c => c.name).join(' × ');
  const desc     = selected.map(c => c.description).join(' ');
  const poetic   = selected[0].poeticLine;

  return {
    name, description: desc, poeticLine: poetic,
    archetypeWeights: merged, activeArchetypes: Object.keys(merged) as ArchetypeId[],
    configMods: { danceIntensity: avgD, maxSpeed: avgS, breathPeriod: avgB, selfPull: avgP },
    dominantArchetype: dominant, predictedPhase: predictPhase(merged), color,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDominant(w: Partial<Record<ArchetypeId, number>>): ArchetypeId {
  let best: ArchetypeId = 'SELF', max = 0;
  for (const [id, str] of Object.entries(w) as [ArchetypeId, number][]) {
    if (str > max) { max = str; best = id; }
  }
  return best;
}

function predictPhase(w: Partial<Record<ArchetypeId, number>>): string {
  const tension     = (w.SHADOW ?? 0)*0.30 + (w.DESTROYER ?? 0)*0.30 + (w.TRICKSTER ?? 0)*0.20;
  const integration = (w.SELF   ?? 0)*0.40 + (w.WISE_ONE  ?? 0)*0.30 + (w.ANIMA     ?? 0)*0.15;
  if (tension > 0.60) return tension > 0.75 ? 'COLAPSO' : 'ALERTA';
  if (integration > 0.55) return integration > 0.70 ? 'FLUXO' : 'INTEGRANDO';
  return 'CALMO';
}

function avg<T>(arr: T[], fn: (t: T) => number): number {
  return arr.reduce((s, x) => s + fn(x), 0) / arr.length;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
