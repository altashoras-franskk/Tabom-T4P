// ── Asimov Theater — Lesson Presets (Scenario Library) ───────────────────────
import { WorldInitOpts } from './asimovWorld';

export interface LessonPreset {
  id: string;
  name: string;
  description: string;
  color: string;
  worldOpts: Omit<WorldInitOpts, 'seed'>;
  nBaseline: number;
  sceneDuration: number;
  focusMetrics: string[];        // which metrics to highlight in Tier A
  suggestedActs?: string[];      // ordered card IDs for auto-play (optional)
  actInterval?: number;          // seconds between auto-play acts
  expectedArc: string;           // 1-2 line expected trajectory
}

export const LESSON_PRESETS: LessonPreset[] = [
  {
    id: 'late_empire_decay',
    name: 'Late Empire Decay',
    description: 'Legitimidade alta inercial, desigualdade crescente, norma coercitiva. Observe a transicao lenta de ordem para excecao.',
    color: '#c05aff',
    worldOpts: {
      agentCount: 320,
      factionCount: 4,
      nBaseline: 0.62,
      lBaseline: 0.72,
      rBaseline: 0.42,
      nNoise: 0.14,
      lNoise: 0.10,
      rNoise: 0.22,
    },
    nBaseline: 0.62,
    sceneDuration: 30,
    focusMetrics: ['inequality', 'legitimacyMean', 'normMean'],
    expectedArc: 'Ordem Estavel -> Polarizacao -> Excecao -> Crise',
  },
  {
    id: 'inequality_spiral',
    name: 'Inequality Spiral',
    description: 'Recursos concentrados, mobilidade nula. A desigualdade alimenta conflito que alimenta desigualdade.',
    color: '#ffce5a',
    worldOpts: {
      agentCount: 300,
      factionCount: 4,
      nBaseline: 0.35,
      lBaseline: 0.45,
      rBaseline: 0.30,
      nNoise: 0.20,
      lNoise: 0.18,
      rNoise: 0.35,
    },
    nBaseline: 0.35,
    sceneDuration: 25,
    focusMetrics: ['inequality', 'conflictRate', 'scarcity'],
    suggestedActs: ['redistribute', 'open_commons'],
    actInterval: 40,
    expectedArc: 'Conflito Moderado -> Crise -> (Redistribuicao?) -> Recuperacao Fragil',
  },
  {
    id: 'exception_trap',
    name: 'Exception Trap',
    description: 'N altissimo, conflito suprimido artificialmente. Ordem aparente, liberdade zero. Quanto tempo ate a ruptura?',
    color: '#ff5a5a',
    worldOpts: {
      agentCount: 300,
      factionCount: 4,
      nBaseline: 0.85,
      lBaseline: 0.55,
      rBaseline: 0.35,
      nNoise: 0.06,
      lNoise: 0.12,
      rNoise: 0.20,
    },
    nBaseline: 0.85,
    sceneDuration: 30,
    focusMetrics: ['normMean', 'legitimacyMean', 'conflictRate'],
    suggestedActs: ['amnesty'],
    actInterval: 50,
    expectedArc: 'Excecao -> Excecao Prolongada -> Crise Subita',
  },
  {
    id: 'propaganda_polarization',
    name: 'Propaganda Polarization',
    description: 'Uma faccao domina a narrativa. Observe a coesao interna subir enquanto a distancia interfaccional cresce.',
    color: '#ff9a3c',
    worldOpts: {
      agentCount: 280,
      factionCount: 4,
      nBaseline: 0.40,
      lBaseline: 0.50,
      rBaseline: 0.50,
      nNoise: 0.15,
      lNoise: 0.20,
      rNoise: 0.15,
    },
    nBaseline: 0.40,
    sceneDuration: 25,
    focusMetrics: ['polarization', 'cohesion', 'conflictRate'],
    suggestedActs: ['propaganda', 'taboo_wall'],
    actInterval: 35,
    expectedArc: 'Polarizacao -> Conflito -> Crise ou Excecao',
  },
  {
    id: 'commons_experiment',
    name: 'Commons Experiment',
    description: 'Recursos abundantes e abertos. A cooperacao emerge ou a tragedia dos comuns se instala?',
    color: '#5aff8a',
    worldOpts: {
      agentCount: 260,
      factionCount: 3,
      nBaseline: 0.25,
      lBaseline: 0.60,
      rBaseline: 0.80,
      nNoise: 0.12,
      lNoise: 0.15,
      rNoise: 0.10,
    },
    nBaseline: 0.25,
    sceneDuration: 30,
    focusMetrics: ['scarcity', 'inequality', 'legitimacyMean'],
    suggestedActs: ['open_commons', 'ritual_unity'],
    actInterval: 45,
    expectedArc: 'Ordem Estavel -> Polarizacao Economica -> ?',
  },
  {
    id: 'border_war',
    name: 'Border War',
    description: 'Faccoes proximas, R disputado nas fronteiras. Conflito localizado que pode escalar.',
    color: '#4a9eff',
    worldOpts: {
      agentCount: 340,
      factionCount: 4,
      nBaseline: 0.30,
      lBaseline: 0.48,
      rBaseline: 0.38,
      nNoise: 0.25,
      lNoise: 0.20,
      rNoise: 0.30,
    },
    nBaseline: 0.30,
    sceneDuration: 22,
    focusMetrics: ['conflictRate', 'polarization', 'volatility'],
    suggestedActs: ['emergency_decree', 'taboo_wall'],
    actInterval: 30,
    expectedArc: 'Conflito -> Crise -> Excecao ou Recuperacao',
  },
  {
    id: 'trade_boom_bust',
    name: 'Trade Boom/Bust',
    description: 'R alto mas volatil. Prosperidade gera desigualdade que gera instabilidade que drena R.',
    color: '#ffd4f0',
    worldOpts: {
      agentCount: 260,
      factionCount: 3,
      nBaseline: 0.30,
      lBaseline: 0.65,
      rBaseline: 0.78,
      nNoise: 0.12,
      lNoise: 0.14,
      rNoise: 0.25,
    },
    nBaseline: 0.30,
    sceneDuration: 35,
    focusMetrics: ['inequality', 'scarcity', 'legitimacyMean'],
    suggestedActs: ['austerity', 'redistribute'],
    actInterval: 40,
    expectedArc: 'Ordem -> Polarizacao Economica -> Conflito -> Boom/Bust',
  },
  {
    id: 'anomaly_stress_test',
    name: 'Anomaly Stress Test',
    description: 'O Mulo ativado desde o inicio. Como o sistema lida com um agente carismatico imprevisivel?',
    color: '#a0ffee',
    worldOpts: {
      agentCount: 300,
      factionCount: 4,
      nBaseline: 0.45,
      lBaseline: 0.55,
      rBaseline: 0.50,
      nNoise: 0.18,
      lNoise: 0.18,
      rNoise: 0.20,
    },
    nBaseline: 0.45,
    sceneDuration: 28,
    focusMetrics: ['legitimacyMean', 'cohesion', 'conflictRate'],
    expectedArc: 'Imprevisivel: O Mulo distorce todas as previsoes.',
  },
];

export function getLessonPreset(id: string): LessonPreset | undefined {
  return LESSON_PRESETS.find(p => p.id === id);
}
