// ── Alchemy Transmutation — Redesign v2 ──────────────────────────────────────
// Graph shape (multiple paths, not linear):
//
//        [♄ PLUMBUM]
//       ↙ Calcinatio  ↘ Solutio
//  [🜍 SULPHUR]    [☿ MERCURIUS]
//     ↓ Coagulatio   ↓ Sublimatio
//     [🜔 SAL] ←──────────╯
//      ↓ Fermentatio
//  [☽ ARGENTUM] ←── ✦ Coniunctio (Sulphur+Mercury secret!)
//      ↓ Projectio (Lapis Forged + COAGULA)
//    [☉ AURUM]

import { ElementMix } from './alchemyTypes';

// ── Substance types ───────────────────────────────────────────────────────────
export type SubstanceType =
  | 'plumbum'    // ♄ Lead
  | 'sulphur'    // 🜍 Sulfur
  | 'mercurius'  // ☿ Mercury
  | 'sal'        // 🜔 Salt
  | 'argentum'   // ☽ Silver
  | 'aurum';     // ☉ Gold ✦

export const SUBSTANCE_ORDER: SubstanceType[] = [
  'plumbum', 'sulphur', 'mercurius', 'sal', 'argentum', 'aurum',
];

export interface SubstanceMeta {
  label:     string;
  latin:     string;
  color:     string;
  glowColor: string;
  symbol:    string;
  sizeBoost: number;
}

export const SUBSTANCE_META: Record<SubstanceType, SubstanceMeta> = {
  plumbum:   { label:'Chumbo',   latin:'Plumbum',   color:'#7888a0', glowColor:'#5a6878', symbol:'♄',  sizeBoost:1.0  },
  sulphur:   { label:'Enxofre',  latin:'Sulphur',   color:'#e0b800', glowColor:'#ffe040', symbol:'🜍', sizeBoost:1.15 },
  mercurius: { label:'Mercúrio', latin:'Mercurius', color:'#60c8f0', glowColor:'#90e8ff', symbol:'☿',  sizeBoost:0.88 },
  sal:       { label:'Sal',      latin:'Sal',       color:'#c8d0e0', glowColor:'#e8f0ff', symbol:'🜔', sizeBoost:1.05 },
  argentum:  { label:'Prata',    latin:'Argentum',  color:'#80acd8', glowColor:'#b0d8ff', symbol:'☽',  sizeBoost:1.28 },
  aurum:     { label:'Ouro',     latin:'Aurum',     color:'#ffc107', glowColor:'#ffe566', symbol:'☉',  sizeBoost:1.65 },
};

// ── Condition descriptor ──────────────────────────────────────────────────────
export type ConditionType =
  | 'fire' | 'water' | 'earth' | 'air'
  | 'heat' | 'cool'
  | 'balance'        // all elements near 25%
  | 'coherence'      // agent.coherence
  | 'lapis_forged'
  | 'conjunction'    // both sulphur & mercury present (special)
  | 'pulse_any';     // COAGULA or SOLVE active

export interface RecipeCondition {
  type:   ConditionType;
  min?:   number;
  max?:   number;
  label:  string;   // short display label
}

// ── Recipe ────────────────────────────────────────────────────────────────────
export interface TransmutRecipe {
  id:          string;
  from:        SubstanceType;
  to:          SubstanceType;
  operation:   string;  // Latin
  name:        string;  // Portuguese
  path:        'fire' | 'water' | 'earth' | 'air' | 'conjunction' | 'final';
  conditions:  RecipeCondition[];
  prob:        number;  // base probability per 10-tick check
  hint:        string;
  secret?:     boolean; // hidden until discovered
}

// ── All recipes ───────────────────────────────────────────────────────────────
export const RECIPES: TransmutRecipe[] = [
  // ── Plumbum → Sulphur ───────────────────────────────────────────────────────
  {
    id: 'calcinatio',
    from: 'plumbum', to: 'sulphur',
    operation: 'Calcinatio', name: 'Calcinação',
    path: 'fire',
    conditions: [
      { type: 'fire', min: 0.33, label: '🔥 Fogo >33%' },
      { type: 'heat', min: 0.42, label: '🌡 Calor >42%' },
    ],
    prob: 0.0014,
    hint: '↑ Fogo + ↑ Calor — o chumbo calcina em enxofre amarelo.',
  },
  // ── Plumbum → Mercurius ──────────────────────────────────────────────────────
  {
    id: 'solutio',
    from: 'plumbum', to: 'mercurius',
    operation: 'Solutio', name: 'Dissolução',
    path: 'water',
    conditions: [
      { type: 'water', min: 0.36, label: '💧 Água >36%' },
      { type: 'cool',  max: 0.54, label: '🌡 Calor <54%' },
    ],
    prob: 0.0014,
    hint: '↑ Água + ↓ Calor — o chumbo dissolve em mercúrio fluido.',
  },
  // ── Sulphur → Sal ────────────────────────────────────────────────────────────
  {
    id: 'coagulatio',
    from: 'sulphur', to: 'sal',
    operation: 'Coagulatio', name: 'Coagulação',
    path: 'earth',
    conditions: [
      { type: 'earth', min: 0.28, label: '🌍 Terra >28%' },
      { type: 'cool',  max: 0.68, label: '🌡 Calor <68%' },
    ],
    prob: 0.0012,
    hint: '↑ Terra + ↓ Calor — o enxofre cristaliza em sal.',
  },
  // ── Mercurius → Sal ──────────────────────────────────────────────────────────
  {
    id: 'sublimatio',
    from: 'mercurius', to: 'sal',
    operation: 'Sublimatio', name: 'Sublimação',
    path: 'air',
    conditions: [
      { type: 'air',       min: 0.30, label: '🌬 Ar >30%' },
      { type: 'coherence', min: 0.42, label: 'Coerência >42%' },
    ],
    prob: 0.0012,
    hint: '↑ Ar — partículas coerentes sublimam de mercúrio para sal.',
  },
  // ── Sal → Argentum ───────────────────────────────────────────────────────────
  {
    id: 'fermentatio',
    from: 'sal', to: 'argentum',
    operation: 'Fermentatio', name: 'Fermentação',
    path: 'earth',
    conditions: [
      { type: 'balance',   min: 0.25, label: '⚖ Elementos ~25% cada' },
      { type: 'coherence', min: 0.50, label: 'Coerência >50%' },
      { type: 'heat',      min: 0.28, max: 0.78, label: '🌡 Calor 28-78%' },
    ],
    prob: 0.0010,
    hint: '⚖ Equilibre os 4 elementos (~25% cada) + calor moderado. Sal fermenta em Prata.',
  },
  // ── ✦ Coniunctio: Sulphur + Mercurius → Argentum (secret!) ──────────────────
  {
    id: 'coniunctio',
    from: 'sulphur', to: 'argentum',  // applies to both sulphur & mercurius
    operation: 'Coniunctio', name: 'Conjunção',
    path: 'conjunction',
    conditions: [
      { type: 'conjunction', label: '✦ Enxofre + Mercúrio juntos' },
      { type: 'heat', min: 0.33, max: 0.72, label: '🌡 Calor 33-72%' },
    ],
    prob: 0.0009,
    hint: '✦ Segredo descoberto: ter Enxofre E Mercúrio juntos desencadeia a Conjunção — as Bodas Químicas!',
    secret: true,
  },
  // ── Argentum → Aurum ─────────────────────────────────────────────────────────
  {
    id: 'projectio',
    from: 'argentum', to: 'aurum',
    operation: 'Projectio', name: 'Projeção',
    path: 'final',
    conditions: [
      { type: 'lapis_forged', label: '◈ Lapis Forjado' },
      { type: 'heat',         min: 0.58, label: '🌡 Calor >58%' },
      { type: 'pulse_any',    label: 'COAGULA / SOLVE' },
    ],
    prob: 0.0016,
    hint: '◈ Forge o Lapis (alta integração), ↑ Calor e pressione COAGULA para a Projeção Final!',
  },
];

// ── Get recipe by id ──────────────────────────────────────────────────────────
export function getRecipesFrom(sub: SubstanceType): TransmutRecipe[] {
  return RECIPES.filter(r => r.from === sub);
}

// ── Quintessência: how balanced the elements are (0..1) ──────────────────────
// = 1 when all 4 are exactly 25%, = 0 when one dominates completely
export function computeQuintessence(mix: ElementMix): number {
  const imbalance = Math.max(
    Math.abs(mix.earth - 0.25),
    Math.abs(mix.water - 0.25),
    Math.abs(mix.air   - 0.25),
    Math.abs(mix.fire  - 0.25),
  );
  return Math.max(0, 1 - imbalance * 4);
}

// ── Recipe condition score (0..1 how well-met the condition is) ───────────────
function conditionScore(
  cond:        RecipeCondition,
  mix:         ElementMix,
  heat:        number,
  lapisState:  string,
  pulse:       string,
  coherence:   number,   // agent average (0..1) or fixed for UI preview
  conjActive:  boolean,
): number {
  const v = (() => {
    switch (cond.type) {
      case 'fire':        return mix.fire;
      case 'water':       return mix.water;
      case 'earth':       return mix.earth;
      case 'air':         return mix.air;
      case 'heat':        return heat;
      case 'cool':        return 1 - heat;           // cool = inverse heat
      case 'balance':     return computeQuintessence(mix);
      case 'coherence':   return coherence;
      case 'lapis_forged':return lapisState === 'FORGED' ? 1 : 0;
      case 'conjunction': return conjActive ? 1 : 0;
      case 'pulse_any':   return (pulse === 'COAGULA' || pulse === 'SOLVE') ? 1 : 0.2;
      default:            return 0;
    }
  })();

  const lo = cond.min ?? 0;
  const hi = cond.max ?? 1;

  // For binary conditions (lapis, pulse, conjunction)
  if (cond.type === 'lapis_forged' || cond.type === 'conjunction') return v;
  if (cond.type === 'pulse_any') return v;

  // Continuous: score how far into the valid range we are
  if (cond.min != null && cond.max != null) {
    // Range condition
    if (v < lo) return Math.max(0, v / lo);
    if (v > hi) return Math.max(0, 1 - (v - hi) / (1 - hi));
    return 1;
  }
  if (cond.min != null) {
    // Min condition: v must be >= min
    if (v >= lo) return 1;
    return Math.max(0, v / lo); // partial
  }
  if (cond.max != null) {
    // Max condition: v must be <= max (for 'cool' it's inverse heat)
    if (v <= hi) return 1;
    return Math.max(0, 1 - (v - hi) / (1 - hi));
  }
  return 1;
}

// ── Full recipe score (product of all condition scores) ───────────────────────
// Returns 0..1 (1 = all conditions perfectly met)
export function getRecipeScore(
  recipe:     TransmutRecipe,
  mix:        ElementMix,
  heat:       number,
  lapisState: string,
  pulse:      string,
  avgCoherence: number,
  conjActive: boolean,
): number {
  let score = 1;
  for (const cond of recipe.conditions) {
    score *= conditionScore(cond, mix, heat, lapisState, pulse, avgCoherence, conjActive);
  }
  return score;
}

// ── Per-agent transmutation check ─────────────────────────────────────────────
export function checkTransmutation(
  substance:   SubstanceType,
  charge:      number,
  coherence:   number,
  mix:         ElementMix,
  heat:        number,
  lapisState:  string,
  pulse:       string,
  conjActive:  boolean,  // sulphur AND mercurius both present in significant qty
): SubstanceType | null {
  const r = Math.random();

  // Find applicable recipes from current substance
  for (const recipe of RECIPES) {
    if (recipe.from !== substance) continue;
    // Conjunction: only active if conjActive is true
    if (recipe.id === 'coniunctio' && !conjActive) continue;

    const score = getRecipeScore(
      recipe, mix, heat, lapisState, pulse, coherence, conjActive,
    );
    if (score <= 0) continue;

    const prob = recipe.prob * score * (charge * 0.5 + 0.5);
    if (r < prob) return recipe.to;
  }

  // Coniunctio also applies to mercurius (both can become argentum)
  if (substance === 'mercurius' && conjActive) {
    const conjRecipe = RECIPES.find(r => r.id === 'coniunctio')!;
    const score = getRecipeScore(conjRecipe, mix, heat, lapisState, pulse, coherence, conjActive);
    if (score > 0) {
      const prob = conjRecipe.prob * score * (charge * 0.5 + 0.5);
      if (Math.random() < prob) return 'argentum';
    }
  }

  // ── Reversion rules (tension, instability) ──────────────────────────────────
  switch (substance) {
    case 'sulphur':
      // Combustion: extreme heat + high air → back to plumbum
      if (heat > 0.90 && mix.air > 0.40 && Math.random() < 0.0006) return 'plumbum';
      break;
    case 'mercurius':
      // Vaporization: extreme heat → back to plumbum
      if (heat > 0.88 && Math.random() < 0.0005) return 'plumbum';
      break;
    case 'argentum':
      // Cracking: very cold + low coherence → sal
      if (heat < 0.18 && coherence < 0.25 && Math.random() < 0.0004) return 'sal';
      break;
    case 'aurum':
      // Gold is nearly indestructible
      if (heat > 0.97 && Math.random() < 0.00003) return 'argentum';
      break;
  }
  return null;
}

// ── Transmutation flash ───────────────────────────────────────────────────────
export interface TransmutFlash {
  x:         number;
  y:         number;
  substance: SubstanceType;
  life:      number;   // 1..0 descending
}

// ── Quest definitions ─────────────────────────────────────────────────────────
// Quests are now DISCOVERY-based: each unlocks when you first produce that substance.
// This avoids "grinding" and celebrates each step.
export interface TransmutQuest {
  id:        string;
  recipeId:  string;
  name:      string;
  substance: SubstanceType;
  threshold: number;  // total produced to "complete" (1 = discover, 10 = master)
  hint:      string;
}

export const QUESTS: TransmutQuest[] = [
  { id: 'discover_sulphur',   recipeId: 'calcinatio',  name: 'Primeira Faísca',   substance: 'sulphur',   threshold: 1,  hint: 'Crie sua primeira partícula de Enxofre.' },
  { id: 'discover_mercury',   recipeId: 'solutio',     name: 'Primeira Gota',     substance: 'mercurius', threshold: 1,  hint: 'Crie sua primeira partícula de Mercúrio.' },
  { id: 'discover_sal',       recipeId: 'coagulatio',  name: 'Primeiro Cristal',  substance: 'sal',       threshold: 1,  hint: 'Cristalize Sal pela primeira vez.' },
  { id: 'discover_argentum',  recipeId: 'fermentatio', name: 'Primeiro Brilho',   substance: 'argentum',  threshold: 1,  hint: 'Produza sua primeira Prata.' },
  { id: 'discover_aurum',     recipeId: 'projectio',   name: '✦ Grande Obra',     substance: 'aurum',     threshold: 1,  hint: 'Transmute Prata em Ouro. O Magistério está completo.' },
];

// ── Transmutation state ───────────────────────────────────────────────────────
export interface TransmutationState {
  counts:           Record<SubstanceType, number>;
  produced:         Record<SubstanceType, number>;
  flashes:          TransmutFlash[];
  completedQuestIds:string[];
  bannerLife:       number;
  bannerText:       string;
  bannerSubstance:  SubstanceType | null;
  conjunctionActive:boolean;  // sulphur + mercury both present (enables coniunctio)
  conjunctionDiscovered: boolean; // player has seen coniunctio happen
}

export function createTransmutationState(): TransmutationState {
  const zero = (): Record<SubstanceType, number> => ({
    plumbum: 0, sulphur: 0, mercurius: 0, sal: 0, argentum: 0, aurum: 0,
  });
  return {
    counts:            zero(),
    produced:          zero(),
    flashes:           [],
    completedQuestIds: [],
    bannerLife:        0,
    bannerText:        '',
    bannerSubstance:   null,
    conjunctionActive: false,
    conjunctionDiscovered: false,
  };
}

export function recordTransmutation(
  ts:          TransmutationState,
  x:           number,
  y:           number,
  newSubstance: SubstanceType,
  recipeId:    string,
): void {
  ts.produced[newSubstance]++;
  if (ts.flashes.length < 25) {
    ts.flashes.push({ x, y, substance: newSubstance, life: 1.0 });
  }
  // Check if this is coniunctio discovery
  if (recipeId === 'coniunctio' && !ts.conjunctionDiscovered) {
    ts.conjunctionDiscovered = true;
  }
}

export function updateTransmutationState(
  ts:              TransmutationState,
  substances:      SubstanceType[],
  dt:              number,
): void {
  // Recount
  const counts: Record<SubstanceType, number> = {
    plumbum:0, sulphur:0, mercurius:0, sal:0, argentum:0, aurum:0,
  };
  for (const s of substances) counts[s]++;
  ts.counts = counts;

  // Conjunction: active when both sulphur and mercury are present in meaningful qty
  ts.conjunctionActive = counts.sulphur >= 3 && counts.mercurius >= 3;

  // Age flashes (dt is per-frame)
  for (let i = ts.flashes.length - 1; i >= 0; i--) {
    ts.flashes[i].life -= dt * 1.5;
    if (ts.flashes[i].life <= 0) ts.flashes.splice(i, 1);
  }

  // Banner countdown
  if (ts.bannerLife > 0) ts.bannerLife -= dt;

  // Check quest completions (discovery threshold = 1)
  for (const quest of QUESTS) {
    if (ts.completedQuestIds.includes(quest.id)) continue;
    if ((ts.produced[quest.substance] ?? 0) >= quest.threshold) {
      ts.completedQuestIds.push(quest.id);
      const meta = SUBSTANCE_META[quest.substance];
      ts.bannerLife = 5.0;
      ts.bannerText = quest.name;
      ts.bannerSubstance = quest.substance;
    }
  }
}
