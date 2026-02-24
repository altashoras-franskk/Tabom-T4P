// ── Asimov Theater — Presets ──────────────────────────────────────────────────
import { WorldInitOpts } from './asimovWorld';

export interface AsimovPreset {
  id: string;
  name: string;
  description: string;
  color: string;
  worldOpts: Omit<WorldInitOpts, 'seed'>;
  nBaseline: number;   // N field target for macroTick decay
  sceneDuration: number; // seconds
  expectedRegime: string; // what to expect in 1-2min
}

export const ASIMOV_PRESETS: AsimovPreset[] = [
  {
    id: 'late_empire',
    name: 'Late Empire',
    description: 'Legitimidade alta, desigualdade crescente, norma coercitiva.',
    color: '#c05aff',
    worldOpts: {
      agentCount: 300,
      factionCount: 4,
      nBaseline: 0.60,
      lBaseline: 0.72,
      rBaseline: 0.45,
      nNoise: 0.15,
      lNoise: 0.10,
      rNoise: 0.20,
    },
    nBaseline: 0.60,
    sceneDuration: 30,
    expectedRegime: 'Ordem inicial → Polarização → Exceção',
  },
  {
    id: 'frontier_republic',
    name: 'Frontier Republic',
    description: 'Norma fraca, recursos irregulares, alta mobilidade.',
    color: '#5aff8a',
    worldOpts: {
      agentCount: 280,
      factionCount: 4,
      nBaseline: 0.22,
      lBaseline: 0.50,
      rBaseline: 0.40,
      nNoise: 0.30,
      lNoise: 0.25,
      rNoise: 0.40,
    },
    nBaseline: 0.22,
    sceneDuration: 25,
    expectedRegime: 'Conflito moderado → Ordem instável',
  },
  {
    id: 'discipline_state',
    name: 'Discipline State',
    description: 'N muito alto, L estável; risco de Exceção rápida.',
    color: '#ff5a5a',
    worldOpts: {
      agentCount: 320,
      factionCount: 4,
      nBaseline: 0.82,
      lBaseline: 0.60,
      rBaseline: 0.38,
      nNoise: 0.08,
      lNoise: 0.12,
      rNoise: 0.18,
    },
    nBaseline: 0.82,
    sceneDuration: 30,
    expectedRegime: 'Ordem forçada → Exceção → Crise',
  },
  {
    id: 'trade_league',
    name: 'Trade League',
    description: 'R alto, desigualdade sobe via prosperidade, L via comércio.',
    color: '#ffce5a',
    worldOpts: {
      agentCount: 260,
      factionCount: 3,
      nBaseline: 0.30,
      lBaseline: 0.62,
      rBaseline: 0.75,
      nNoise: 0.12,
      lNoise: 0.15,
      rNoise: 0.15,
    },
    nBaseline: 0.30,
    sceneDuration: 35,
    expectedRegime: 'Ordem estável → Polarização econômica',
  },
];

export function getPreset(id: string): AsimovPreset | undefined {
  return ASIMOV_PRESETS.find(p => p.id === id);
}
