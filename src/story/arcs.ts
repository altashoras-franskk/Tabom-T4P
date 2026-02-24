// Story Arcs - Era Detection
export type Arc = { name: string; since: number; reason: string };

export function detectArcShift(
  t: number,
  loops: { scarcity: number; cohesion: number; volatility: number },
  current: Arc
): Arc | null {
  const { scarcity, cohesion, volatility } = loops;

  if (scarcity > 0.70 && current.name !== 'Era da Escassez') {
    return { name: 'Era da Escassez', since: t, reason: 'Scarcity > 0.70' };
  }
  if (volatility > 0.65 && current.name !== 'Guerra de Vórtices') {
    return { name: 'Guerra de Vórtices', since: t, reason: 'Volatility > 0.65' };
  }
  if (cohesion > 0.65 && volatility < 0.45 && current.name !== 'Consolidação') {
    return { name: 'Consolidação', since: t, reason: 'High cohesion + moderate volatility' };
  }
  if (volatility < 0.18 && current.name !== 'Dormência') {
    return { name: 'Dormência', since: t, reason: 'Volatility < 0.18' };
  }
  if (current.name !== 'Vida Corrente' && scarcity <= 0.70 && volatility <= 0.65 && volatility >= 0.18) {
    return { name: 'Vida Corrente', since: t, reason: 'Back to baseline' };
  }
  return null;
}
