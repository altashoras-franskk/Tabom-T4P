// Narrative Engine - Interpretive Story Generation
// Works WITH aiNarrator.ts (doesn't replace it)
import type { WorldEvent } from './worldLog';

export type NarrativeTone = 'clinical' | 'mythic' | 'poetic' | 'brutalist';

export type StoryState = {
  tone: NarrativeTone;
  motifs: {
    nutrient: string;
    tension: string;
    memory: string;
    entropy: string;
  };
  currentArc: string;
  arcSince: number;
  lastParagraphAt: number;
  paragraphCooldown: number;
};

export type NarrativeInput = {
  t: number;
  loops: {
    scarcity: number;
    cohesion: number;
    volatility: number;
    avgNutrient: number;
    avgTension: number;
    avgMemory: number;
    avgEntropy: number;
  };
  events: WorldEvent[];
  signals?: { speciesCount: number; births: number; deaths: number };
};

export type NarrativeParagraph = {
  t: number;
  title: string;
  text: string;
  tags: string[];
};

export function createStoryState(tone: NarrativeTone = 'poetic'): StoryState {
  return {
    tone,
    motifs: { nutrient: 'seiva', tension: 'pressão', memory: 'trilha', entropy: 'névoa' },
    currentArc: 'Gênese',
    arcSince: 0,
    lastParagraphAt: -999,
    paragraphCooldown: 6,
  };
}

function pick<T>(arr: T[], seed: number): T {
  const i = Math.floor(Math.abs(Math.sin(seed) * 9999) % arr.length);
  return arr[i];
}

export function setMotifsFromSeed(st: StoryState, seed: number) {
  const nutrient = ['seiva', 'pão', 'ouro', 'néctar', 'caldo', 'luz'];
  const tension = ['pressão', 'ferrugem', 'raiva', 'atrito', 'carga', 'cisma'];
  const memory = ['trilha', 'arquivo', 'cicatriz', 'rito', 'mapa', 'hábito'];
  const entropy = ['névoa', 'ruído', 'fogo', 'sal', 'tempestade', 'faísca'];
  
  st.motifs = {
    nutrient: pick(nutrient, seed * 1.3),
    tension: pick(tension, seed * 2.1),
    memory: pick(memory, seed * 3.7),
    entropy: pick(entropy, seed * 4.9),
  };
}

export function interpretMoment(input: NarrativeInput, st: StoryState): NarrativeParagraph | null {
  const { t, loops, events } = input;

  if (t - st.lastParagraphAt < st.paragraphCooldown) return null;

  const top = events[0];
  const bigEvent = top && (top.type === 'beat' || top.type === 'mitosis' || top.type === 'achievement');
  const calm = loops.volatility < 0.20;
  const storm = loops.volatility > 0.60;
  const scarcityHigh = loops.scarcity > 0.65;
  const cohesionHigh = loops.cohesion > 0.60;

  const shouldSpeak =
    bigEvent ||
    (storm && loops.avgTension > 0.55) ||
    (scarcityHigh && loops.avgNutrient < 0.35) ||
    (cohesionHigh && loops.avgMemory > 0.55) ||
    (calm && t - st.lastParagraphAt > st.paragraphCooldown * 2);

  if (!shouldSpeak) return null;

  st.lastParagraphAt = t;

  const m = st.motifs;
  const title = bigEvent
    ? (top.sigil ? `${top.sigil} ${top.title}` : top.title)
    : storm
      ? 'Tempestade de Interações'
      : scarcityHigh
        ? 'Era da Escassez'
        : cohesionHigh
          ? 'Pacto de Coesão'
          : 'Respiração do Sistema';

  const line = buildSentence(st.tone, loops, m, top);
  const line2 = buildSecondSentence(st.tone, loops, m);

  return {
    t,
    title,
    text: line2 ? `${line} ${line2}` : line,
    tags: [
      st.currentArc,
      storm ? 'storm' : calm ? 'calm' : 'living',
      scarcityHigh ? 'scarcity' : '',
      cohesionHigh ? 'cohesion' : '',
      bigEvent ? top.type : '',
    ].filter(Boolean),
  };
}

function buildSentence(tone: NarrativeTone, loops: any, m: any, top?: WorldEvent) {
  const s = loops.scarcity;
  const v = loops.volatility;
  const c = loops.cohesion;

  if (tone === 'clinical') {
    return `Regime: volatilidade ${(v * 100 | 0)}%, escassez ${(s * 100 | 0)}%, coesão ${(c * 100 | 0)}%.`;
  }

  if (tone === 'brutalist') {
    return `A ${m.tension} sobe. A ${m.entropy} morde. O campo responde sem pedir licença.`;
  }

  const clauses = [];
  if (s > 0.65) clauses.push(`A ${m.nutrient} rareia, e o mundo aprende a economizar o gesto.`);
  else clauses.push(`A ${m.nutrient} circula como promessa: atrai, separa, reagrupa.`);

  if (v > 0.60) clauses.push(`A ${m.entropy} cresce; formas quebram para nascer de novo.`);
  else if (v < 0.20) clauses.push(`Tudo parece calmo — mas calma é só outro tipo de força.`);
  else clauses.push(`Há vida no meio: pequenas alianças, pequenas fricções.`);

  if (top?.type === 'beat') clauses.push(`Um sinal: ${top.title.toLowerCase()}.`);

  return clauses.join(' ');
}

function buildSecondSentence(tone: NarrativeTone, loops: any, m: any) {
  if (tone === 'clinical') return '';
  const c = loops.cohesion;
  const t = loops.avgTension;
  if (c > 0.60 && t < 0.40) return `As ${m.memory}s se alinham — território vira linguagem.`;
  if (t > 0.60) return `Onde a ${m.tension} encosta, surgem fronteiras: instituições improvisadas.`;
  return `A ${m.memory} deixa marcas e a ${m.entropy} tenta apagá-las.`;
}
