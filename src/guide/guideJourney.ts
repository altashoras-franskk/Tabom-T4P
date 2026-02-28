import { GuideStep } from './GuideSystem';
import { AppAdapter } from './adapters/metalifelabAdapter';
import type { StringKey } from '../i18n/strings';

/** 3-step emergence experiment: observe → one change (speed) → what you saw. For all ages, with breathing room. */
export const createEmergenceGuideJourney = (
  adapter: AppAdapter,
  t: (key: StringKey) => string
): GuideStep[] => {
  const steps: GuideStep[] = [];

  steps.push({
    id: 'emergence-1-observe',
    title: t('guide_emergence_1_title'),
    copy: t('guide_emergence_1_copy'),
    targetSelector: adapter.selectors.canvas,
    actionType: 'observe',
    rewardBadge: 'observer',
    waitDuration: 6000,
  });

  steps.push({
    id: 'emergence-2-adjust',
    title: t('guide_emergence_2_title'),
    copy: t('guide_emergence_2_copy'),
    targetSelector: adapter.selectors.speedControl ?? null,
    actionType: 'observe',
  });

  steps.push({
    id: 'emergence-3-what-you-saw',
    title: t('guide_emergence_3_title'),
    copy: t('guide_emergence_3_copy'),
    targetSelector: null,
    actionType: 'finish',
    rewardBadge: 'pattern_hunter',
  });

  return steps;
};

export const createGuideJourney = (adapter: AppAdapter): GuideStep[] => {
  const steps: GuideStep[] = [];

  steps.push({
    id: 'welcome',
    title: 'O Campo',
    copy: 'Você está olhando para um campo. Agentes se movem por regras de atração e repulsão — observe antes de agir.',
    targetSelector: null,
    actionType: 'observe',
    rewardBadge: 'observer',
  });

  steps.push({
    id: 'agents',
    title: 'Espécies',
    copy: 'Cada cor é uma espécie. Cada espécie reage de forma diferente às outras — simbiose, predação, indiferença.',
    targetSelector: adapter.selectors.canvas,
    actionType: 'observe',
  });

  steps.push({
    id: 'patterns',
    title: 'Emergência',
    copy: 'Quando as forças se equilibram, formas surgem: anéis, membranas, organismos. Quando conflitam, caos. Nada foi programado para acontecer.',
    targetSelector: adapter.selectors.canvas,
    actionType: 'observe',
    rewardBadge: 'pattern_hunter',
  });

  if (adapter.selectors.speedControl) {
    steps.push({
      id: 'speed',
      title: 'Tempo',
      copy: 'Velocidade muda percepção. Lento revela negociações locais. Rápido revela estrutura macro.',
      targetSelector: adapter.selectors.speedControl,
      actionType: 'observe',
    });
  }

  if (adapter.selectors.overlayField) {
    steps.push({
      id: 'field',
      title: 'O Invisível',
      copy: 'O campo é o ambiente por trás dos agentes — tensão, nutrição, memória. Ative overlays para ver por que os padrões se formam onde se formam.',
      targetSelector: adapter.selectors.overlayField,
      actionType: 'observe',
      rewardBadge: 'field_whisperer',
    });
  }

  steps.push({
    id: 'gesture',
    title: 'Interferência',
    copy: 'Clique e arraste no canvas para aplicar uma força. Observe como o sistema responde e se reorganiza.',
    targetSelector: adapter.selectors.canvas,
    actionType: 'drag',
    rewardBadge: 'butterfly_hand',
  });

  if (adapter.selectors.presetsPanel) {
    steps.push({
      id: 'presets',
      title: 'Presets',
      copy: 'Cada preset reconfigura a matriz de forças e gera um mundo com personalidade própria.',
      targetSelector: adapter.selectors.presetsPanel,
      actionType: 'observe',
    });
  }

  if (adapter.selectors.newUniverseButton || adapter.selectors.seedButton) {
    steps.push({
      id: 'seed',
      title: 'DNA',
      copy: 'Seed é o código genético do universo. Novo universo = novas relações, novas possibilidades.',
      targetSelector: adapter.selectors.newUniverseButton || adapter.selectors.seedButton,
      actionType: 'observe',
    });
  }

  steps.push({
    id: 'complete',
    title: 'Explore',
    copy: 'Agora observe, intervenha pouco, deixe o sistema encontrar suas próprias instituições. Tudo que surge, surge de baixo.',
    targetSelector: null,
    actionType: 'finish',
    rewardBadge: 'worldsmith',
  });

  return steps;
};
