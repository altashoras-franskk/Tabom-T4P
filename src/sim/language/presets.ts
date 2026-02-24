// ─────────────────────────────────────────────────────────────────────────────
// Language Lab – Presets (tuned for ring-formation physics)
// ─────────────────────────────────────────────────────────────────────────────
import type { LanguageParams } from './types';

export interface LanguagePreset {
  id: string;
  name: string;
  description: string;
  params: LanguageParams;
  emoji: string;
}

export const LANGUAGE_PRESETS: LanguagePreset[] = [
  {
    id: 'first_contact',
    name: 'First Contact',
    emoji: '🪐',
    description: 'Anel limpo e estável. Glifos bem formados. LLM ativo.',
    params: {
      agentCount:      720,
      seed:            0x1F1F1,
      timeScope:       0.12,
      dance:           0.42,
      entrainment:     0.72,
      inkDecay:        0.25,
      loopThreshold:   0.86,
      speakIntensity:  0.65,
      dictionaryMode:  'heptapod',
      llmAutoRefine:   true,
      preset:          'first_contact',
    },
  },
  {
    id: 'two_rings',
    name: 'Two Rings',
    emoji: '◎',
    description: 'Dois anéis concêntricos visíveis — leitura não-linear.',
    params: {
      agentCount:      600,
      seed:            0xA2B3,
      timeScope:       0.20,
      dance:           0.34,
      entrainment:     0.62,
      inkDecay:        0.20,
      loopThreshold:   0.78,
      speakIntensity:  0.55,
      dictionaryMode:  'heptapod',
      llmAutoRefine:   true,
      preset:          'two_rings',
    },
  },
  {
    id: 'glossolalia',
    name: 'Glossolalia',
    emoji: '🌊',
    description: 'Muitos glifos — anel turb, splatters frequentes, léxico cresce rápido.',
    params: {
      agentCount:      900,
      seed:            0x6105,
      timeScope:       0.22,
      dance:           0.60,
      entrainment:     0.30,
      inkDecay:        0.55,
      loopThreshold:   0.50,
      speakIntensity:  0.72,
      dictionaryMode:  'experimental',
      llmAutoRefine:   false,
      preset:          'glossolalia',
    },
  },
  {
    id: 'true_names',
    name: 'True Names',
    emoji: '🔮',
    description: 'Anel denso e imóvel. Poucos glifos únicos, Speak potente.',
    params: {
      agentCount:      480,
      seed:            0x7777,
      timeScope:       0.05,
      dance:           0.20,
      entrainment:     0.90,
      inkDecay:        0.15,
      loopThreshold:   0.92,
      speakIntensity:  0.95,
      dictionaryMode:  'heptapod',
      llmAutoRefine:   true,
      preset:          'true_names',
    },
  },
  {
    id: 'nonlinear_time',
    name: 'Nonlinear Time',
    emoji: '⏳',
    description: 'TimeScope alto — anel holístico, glifos estáveis e cíclicos.',
    params: {
      agentCount:      650,
      seed:            0xF0F0,
      timeScope:       0.78,
      dance:           0.44,
      entrainment:     0.54,
      inkDecay:        0.12,
      loopThreshold:   0.68,
      speakIntensity:  0.50,
      dictionaryMode:  'heptapod',
      llmAutoRefine:   false,
      preset:          'nonlinear_time',
    },
  },
];

export const DEFAULT_PARAMS: LanguageParams = LANGUAGE_PRESETS[0].params;