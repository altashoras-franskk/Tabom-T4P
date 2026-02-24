// ─────────────────────────────────────────────────────────────────────────────
// 6 Journey Presets — Tree of Life Lab
// ─────────────────────────────────────────────────────────────────────────────
import type { JourneyPreset } from './types';

export const JOURNEY_PRESETS: JourneyPreset[] = [
  {
    id: 'initiation',
    name: 'Initiation',
    emoji: '🕊',
    description: 'Begin at Malkuth, ascend gently. Balanced draw, veils off.',
    recommendedLens: 'rws',
    drawRate: 3,
    strictness: 0.40,
    veilsEnabled: false,
    pillarsEnabled: true,
    initialState: {
      malkuth:   { charge: 0.60, coherence: 0.30, tension: 0.10, openness: 0.65, memory: 0.20 },
      yesod:     { charge: 0.30, coherence: 0.15, openness: 0.45 },
      tiphereth: { charge: 0.15, coherence: 0.10, openness: 0.30 },
    },
  },
  {
    id: 'discipline',
    name: 'Discipline Path',
    emoji: '⚔',
    description: 'Severity pillar emphasis, structural reading, Marseille vocabulary.',
    recommendedLens: 'marseille',
    drawRate: 3,
    strictness: 0.70,
    veilsEnabled: false,
    pillarsEnabled: true,
    initialState: {
      geburah:   { charge: 0.55, coherence: 0.40, tension: 0.35, openness: 0.40 },
      binah:     { charge: 0.35, coherence: 0.30, tension: 0.20 },
      malkuth:   { charge: 0.50, coherence: 0.35, tension: 0.25 },
    },
  },
  {
    id: 'ecstatic',
    name: 'Ecstatic Flux',
    emoji: '⚡',
    description: 'High energy, alchemical transformation, Thoth lens. Shock and Amplify dominant.',
    recommendedLens: 'thoth',
    drawRate: 5,
    strictness: 0.35,
    veilsEnabled: false,
    pillarsEnabled: false,
    initialState: {
      netzach:   { charge: 0.70, coherence: 0.20, tension: 0.45, openness: 0.80 },
      chesed:    { charge: 0.60, coherence: 0.25, tension: 0.30 },
      tiphereth: { charge: 0.50, coherence: 0.30, tension: 0.25 },
    },
  },
  {
    id: 'dreamloops',
    name: 'Dream Loops',
    emoji: '🌀',
    description: 'Moon and loop-dominated. Ambiguity and memory cycles. RWS or Thoth.',
    recommendedLens: 'rws',
    drawRate: 4,
    strictness: 0.30,
    veilsEnabled: false,
    pillarsEnabled: true,
    initialState: {
      yesod:   { charge: 0.65, coherence: 0.15, tension: 0.25, memory: 0.50, openness: 0.55 },
      hod:     { charge: 0.40, coherence: 0.20, tension: 0.30, memory: 0.35 },
      netzach: { charge: 0.45, coherence: 0.15, tension: 0.35, memory: 0.30 },
    },
  },
  {
    id: 'middlepillar',
    name: 'Middle Pillar',
    emoji: '☯',
    description: 'Balance path: Kether→Tiphereth→Yesod→Malkuth. Equanimity practice.',
    recommendedLens: 'rws',
    drawRate: 3,
    strictness: 0.50,
    veilsEnabled: true,
    pillarsEnabled: true,
    initialState: {
      kether:    { charge: 0.20, coherence: 0.60, tension: 0.05, openness: 0.50, memory: 0.30 },
      tiphereth: { charge: 0.45, coherence: 0.45, tension: 0.15, openness: 0.55 },
      yesod:     { charge: 0.50, coherence: 0.35, tension: 0.20, openness: 0.60 },
      malkuth:   { charge: 0.55, coherence: 0.30, tension: 0.20, openness: 0.65 },
    },
  },
  {
    id: 'stresstest',
    name: 'Stress Test',
    emoji: '🔥',
    description: 'Maximum challenge: veils on, high tension, Thoth lens. For advanced users.',
    recommendedLens: 'thoth',
    drawRate: 5,
    strictness: 0.90,
    veilsEnabled: true,
    pillarsEnabled: true,
    initialState: {
      geburah:   { charge: 0.80, tension: 0.60, coherence: 0.10, openness: 0.25 },
      hod:       { charge: 0.70, tension: 0.55, coherence: 0.15, openness: 0.30 },
      malkuth:   { charge: 0.65, tension: 0.50, coherence: 0.20, openness: 0.35 },
    },
  },
];

export const DEFAULT_PARAMS = {
  deckLens:       'rws'   as const,
  preset:         'initiation',
  veilsEnabled:   false,
  pillarsEnabled: true,
  drawRate:       3      as const,
  strictness:     0.40,
};
