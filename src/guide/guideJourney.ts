// Guide Journey - Creates the step-by-step onboarding journey

import { GuideStep } from './GuideSystem';
import { AppAdapter } from './adapters/metalifelabAdapter';

export const createGuideJourney = (adapter: AppAdapter): GuideStep[] => {
  const steps: GuideStep[] = [];

  // STEP 0: Welcome
  steps.push({
    id: 'welcome',
    title: 'Bem-vindo',
    copy: 'Você está observando um mundo de agentes. Eles se atraem e repelem por regras simples — e disso, formas emergem.',
    targetSelector: null,
    actionType: 'observe',
    rewardBadge: 'observer',
  });

  // STEP 1: Agents and Species
  steps.push({
    id: 'agents',
    title: 'Agentes & Espécies',
    copy: 'Cada ponto é um agente. Cores/tipos indicam espécies: cada espécie tem seus próprios relacionamentos com outras.',
    targetSelector: adapter.selectors.canvas,
    actionType: 'observe',
  });

  // STEP 2: Order vs Chaos
  steps.push({
    id: 'patterns',
    title: 'Ordem vs Caos',
    copy: 'Quando as forças se equilibram, padrões estáveis emergem (anéis, membranas, colônias). Quando conflitam, o sistema se torna turbulento.',
    targetSelector: adapter.selectors.canvas,
    actionType: 'observe',
    rewardBadge: 'pattern_hunter',
  });

  // STEP 3: Time/Speed Control
  if (adapter.selectors.speedControl) {
    steps.push({
      id: 'speed',
      title: 'Tempo',
      copy: 'O tempo muda o que você percebe: lento revela negociações locais; rápido revela estrutura. Tente mudar a velocidade.',
      targetSelector: adapter.selectors.speedControl,
      actionType: 'observe',
    });
  }

  // STEP 4: Pause (optional, quick)
  if (adapter.selectors.playButton) {
    steps.push({
      id: 'pause',
      title: 'Pausar & Inspecionar',
      copy: 'Pause para ler o mundo. O guia não requer controle — apenas atenção.',
      targetSelector: adapter.selectors.playButton,
      actionType: 'observe',
    });
  }

  // STEP 5: Field Overlay
  if (adapter.selectors.overlayField) {
    steps.push({
      id: 'field',
      title: 'Overlays: Ver o Invisível',
      copy: 'O campo é o ambiente invisível (tensão/néctar/memória). Tente ativá-lo para ver por que os padrões se formam onde se formam.',
      targetSelector: adapter.selectors.overlayField,
      actionType: 'observe',
      rewardBadge: 'field_whisperer',
    });
  }

  // STEP 6: Trails
  if (adapter.selectors.overlayTrails) {
    steps.push({
      id: 'trails',
      title: 'Rastros: História do Movimento',
      copy: 'Rastros registram o passado imediato: você começa a ver escrita — não apenas movimento. Tente ativá-los.',
      targetSelector: adapter.selectors.overlayTrails,
      actionType: 'observe',
    });
  }

  // STEP 7: Canvas Interaction (drag)
  steps.push({
    id: 'gesture',
    title: 'Efeito Borboleta',
    copy: 'Clique e arraste no canvas para aplicar um gesto (vento/impulso). Experimente agora, depois clique em Próximo.',
    targetSelector: adapter.selectors.canvas,
    actionType: 'drag',
    rewardBadge: 'butterfly_hand',
  });

  // STEP 8: Presets
  if (adapter.selectors.presetsPanel) {
    steps.push({
      id: 'presets',
      title: 'Receitas / Presets',
      copy: 'Presets são mundos curados: cada um reconfigura relacionamentos, campo, e o início da história.',
      targetSelector: adapter.selectors.presetsPanel,
      actionType: 'observe',
    });
  }

  // STEP 9: New Universe / Seed
  if (adapter.selectors.newUniverseButton || adapter.selectors.seedButton) {
    steps.push({
      id: 'seed',
      title: 'Seed / Novo Universo',
      copy: 'Seed é a identidade do mundo. Novo universo muda o DNA: novos relacionamentos, novos começos.',
      targetSelector: adapter.selectors.newUniverseButton || adapter.selectors.seedButton,
      actionType: 'observe',
    });
  }

  // STEP 10: Completion
  steps.push({
    id: 'complete',
    title: 'Você Conhece o Essencial',
    copy: 'Agora é exploração: observe, intervenha pouco, e deixe o mundo encontrar suas próprias instituições.',
    targetSelector: null,
    actionType: 'finish',
    rewardBadge: 'worldsmith',
  });

  return steps;
};
