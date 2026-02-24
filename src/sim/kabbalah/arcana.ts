// ─────────────────────────────────────────────────────────────────────────────
// 22 Major Arcana — Canonical Operator Mappings
// Same operators regardless of deck lens; lens only changes vocabulary & bias
// ─────────────────────────────────────────────────────────────────────────────
import type { ArcanaDefinition } from './types';

export const ARCANA: ArcanaDefinition[] = [
  {
    id: 0, canonicalName: 'The Fool', hebrewLetter: 'א', symbol: '◌',
    pillarAffinity: 'all', pathId: 11,
    operator: {
      primary: 'OPEN_GATE', secondary: 'DIVERGE', magnitude: 0.72,
      reversed: { primary: 'CLOSE_GATE', secondary: 'DELAY', costFactor: 0.3 },
    },
  },
  {
    id: 1, canonicalName: 'The Magician', hebrewLetter: 'ב', symbol: '∞',
    pillarAffinity: 'mercy', pathId: 12,
    operator: {
      primary: 'AMPLIFY', magnitude: 0.80,
      reversed: { primary: 'SILENCE', secondary: 'SLOW', costFactor: 0.25 },
    },
  },
  {
    id: 2, canonicalName: 'The High Priestess', hebrewLetter: 'ג', symbol: '☽',
    pillarAffinity: 'balance', pathId: 13,
    operator: {
      primary: 'SILENCE', secondary: 'MEMORY', magnitude: 0.70,
      reversed: { primary: 'DIVERGE', secondary: 'SHOCK', costFactor: 0.35 },
    },
  },
  {
    id: 3, canonicalName: 'The Empress', hebrewLetter: 'ד', symbol: '♀',
    pillarAffinity: 'mercy', pathId: 14,
    operator: {
      primary: 'AMPLIFY', secondary: 'OPEN_GATE', magnitude: 0.75,
      reversed: { primary: 'CLOSE_GATE', secondary: 'SLOW', costFactor: 0.20 },
    },
  },
  {
    id: 4, canonicalName: 'The Emperor', hebrewLetter: 'ה', symbol: '♂',
    pillarAffinity: 'severity', pathId: 15,
    operator: {
      primary: 'CLOSE_GATE', secondary: 'CONVERGE', magnitude: 0.78,
      reversed: { primary: 'DIVERGE', secondary: 'SHOCK', costFactor: 0.30 },
    },
  },
  {
    id: 5, canonicalName: 'The Hierophant', hebrewLetter: 'ו', symbol: '✛',
    pillarAffinity: 'balance', pathId: 16,
    operator: {
      primary: 'RITUAL_PULSE', magnitude: 0.65,
      reversed: { primary: 'DIVERGE', costFactor: 0.35 },
    },
  },
  {
    id: 6, canonicalName: 'The Lovers', hebrewLetter: 'ז', symbol: '⊕',
    pillarAffinity: 'all', pathId: 17,
    operator: {
      primary: 'BRIDGE', secondary: 'CONVERGE', magnitude: 0.72,
      reversed: { primary: 'CUT', secondary: 'DIVERGE', costFactor: 0.40 },
    },
  },
  {
    id: 7, canonicalName: 'The Chariot', hebrewLetter: 'ח', symbol: '△',
    pillarAffinity: 'severity', pathId: 18,
    operator: {
      primary: 'OPEN_GATE', secondary: 'SPEED', magnitude: 0.75,
      reversed: { primary: 'DELAY', secondary: 'CLOSE_GATE', costFactor: 0.30 },
    },
  },
  {
    id: 8, canonicalName: 'Strength', hebrewLetter: 'ט', symbol: '∿',
    pillarAffinity: 'balance', pathId: 19,
    operator: {
      primary: 'BALANCE', magnitude: 0.80,
      reversed: { primary: 'DIVERGE', secondary: 'SHOCK', costFactor: 0.35 },
    },
  },
  {
    id: 9, canonicalName: 'The Hermit', hebrewLetter: 'י', symbol: '⌗',
    pillarAffinity: 'balance', pathId: 20,
    operator: {
      primary: 'SILENCE', secondary: 'SLOW', magnitude: 0.65,
      reversed: { primary: 'OPEN_GATE', secondary: 'DIVERGE', costFactor: 0.20 },
    },
  },
  {
    id: 10, canonicalName: 'Wheel of Fortune', hebrewLetter: 'כ', symbol: '⊙',
    pillarAffinity: 'all', pathId: 21,
    operator: {
      primary: 'SHOCK', magnitude: 0.60,
      reversed: { primary: 'DELAY', secondary: 'LOOP', costFactor: 0.30 },
    },
  },
  {
    id: 11, canonicalName: 'Justice', hebrewLetter: 'ל', symbol: '⚖',
    pillarAffinity: 'balance', pathId: 22,
    operator: {
      primary: 'BALANCE', secondary: 'CLOSE_GATE', magnitude: 0.78,
      reversed: { primary: 'DIVERGE', secondary: 'LOOP', costFactor: 0.35 },
    },
  },
  {
    id: 12, canonicalName: 'The Hanged Man', hebrewLetter: 'מ', symbol: '∀',
    pillarAffinity: 'severity', pathId: 23,
    operator: {
      primary: 'DELAY', secondary: 'MEMORY', magnitude: 0.65,
      reversed: { primary: 'SPEED', secondary: 'OPEN_GATE', costFactor: 0.25 },
    },
  },
  {
    id: 13, canonicalName: 'Death', hebrewLetter: 'נ', symbol: '✕',
    pillarAffinity: 'severity', pathId: 24,
    operator: {
      primary: 'CUT', magnitude: 0.85,
      reversed: { primary: 'LOOP', secondary: 'CLOSE_GATE', costFactor: 0.45 },
    },
  },
  {
    id: 14, canonicalName: 'Temperance', hebrewLetter: 'ס', symbol: '≈',
    pillarAffinity: 'balance', pathId: 25,
    operator: {
      primary: 'BALANCE', secondary: 'STABILIZE', magnitude: 0.80,
      reversed: { primary: 'SHOCK', secondary: 'DIVERGE', costFactor: 0.30 },
    },
  },
  {
    id: 15, canonicalName: 'The Devil', hebrewLetter: 'ע', symbol: '⛧',
    pillarAffinity: 'severity', pathId: 26,
    operator: {
      primary: 'CONVERGE', secondary: 'LOOP', magnitude: 0.75,
      reversed: { primary: 'OPEN_GATE', secondary: 'DIVERGE', costFactor: 0.40 },
    },
  },
  {
    id: 16, canonicalName: 'The Tower', hebrewLetter: 'פ', symbol: '⧫',
    pillarAffinity: 'all', pathId: 27,
    operator: {
      primary: 'SHOCK', magnitude: 0.90,
      reversed: { primary: 'STABILIZE', secondary: 'CLOSE_GATE', costFactor: 0.20 },
    },
  },
  {
    id: 17, canonicalName: 'The Star', hebrewLetter: 'צ', symbol: '✦',
    pillarAffinity: 'mercy', pathId: 28,
    operator: {
      primary: 'CONVERGE', magnitude: 0.60,
      reversed: { primary: 'DIVERGE', secondary: 'SILENCE', costFactor: 0.25 },
    },
  },
  {
    id: 18, canonicalName: 'The Moon', hebrewLetter: 'ק', symbol: '☾',
    pillarAffinity: 'balance', pathId: 29,
    operator: {
      primary: 'LOOP', secondary: 'DELAY', magnitude: 0.65,
      reversed: { primary: 'CLARIFY', secondary: 'CUT', costFactor: 0.35 },
    },
  },
  {
    id: 19, canonicalName: 'The Sun', hebrewLetter: 'ר', symbol: '☀',
    pillarAffinity: 'mercy', pathId: 30,
    operator: {
      primary: 'CLARIFY', secondary: 'AMPLIFY', magnitude: 0.80,
      reversed: { primary: 'SILENCE', secondary: 'CLOSE_GATE', costFactor: 0.20 },
    },
  },
  {
    id: 20, canonicalName: 'Judgement', hebrewLetter: 'ש', symbol: '∆',
    pillarAffinity: 'balance', pathId: 31,
    operator: {
      primary: 'REVIEW', magnitude: 0.75,
      reversed: { primary: 'LOOP', secondary: 'DELAY', costFactor: 0.35 },
    },
  },
  {
    id: 21, canonicalName: 'The World', hebrewLetter: 'ת', symbol: '◉',
    pillarAffinity: 'all', pathId: 32,
    operator: {
      primary: 'INTEGRATE', magnitude: 0.85,
      reversed: { primary: 'CUT', secondary: 'DIVERGE', costFactor: 0.40 },
    },
  },
];

export const ARCANA_MAP: Map<number, ArcanaDefinition> = new Map(ARCANA.map(a => [a.id, a]));
