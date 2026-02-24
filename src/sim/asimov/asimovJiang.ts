// -- Asimov Theater -- Prof. Jiang Lens (Interpretive Heuristics) ---------------
import { MetricsVector, PhaseLabel, ForecastResult } from './asimovTypes';

// -- Driver Chip (for Tier A display) ------------------------------------------
export interface DriverChip {
  label: string;
  direction: 'up' | 'down' | 'high' | 'low';
  color: string;
  magnitude: number; // 0..1
}

// -- Compute top drivers from metrics delta ------------------------------------
export function computeDrivers(
  metrics: MetricsVector,
  prev: MetricsVector | null,
): DriverChip[] {
  const drivers: DriverChip[] = [];

  if (!prev) {
    if (metrics.inequality > 0.5)
      drivers.push({ label: 'Inequality', direction: 'high', color: '#ffce5a', magnitude: metrics.inequality });
    if (metrics.conflictRate > 0.3)
      drivers.push({ label: 'Conflict', direction: 'high', color: '#ff5a5a', magnitude: metrics.conflictRate });
    if (metrics.legitimacyMean < 0.35)
      drivers.push({ label: 'Legitimacy', direction: 'low', color: '#5aff8a', magnitude: 1 - metrics.legitimacyMean });
    if (metrics.normMean > 0.65)
      drivers.push({ label: 'Norm', direction: 'high', color: '#c05aff', magnitude: metrics.normMean });
    if (metrics.polarization > 0.45)
      drivers.push({ label: 'Polarization', direction: 'high', color: '#ff9a3c', magnitude: metrics.polarization });
    if (metrics.scarcity > 0.5)
      drivers.push({ label: 'Scarcity', direction: 'high', color: '#ff7788', magnitude: metrics.scarcity });
    drivers.sort((a, b) => b.magnitude - a.magnitude);
    return drivers.slice(0, 3);
  }

  const deltas = [
    { label: 'Inequality', val: metrics.inequality - prev.inequality, abs: metrics.inequality, color: '#ffce5a' },
    { label: 'Conflict', val: metrics.conflictRate - prev.conflictRate, abs: metrics.conflictRate, color: '#ff5a5a' },
    { label: 'Legitimacy', val: metrics.legitimacyMean - prev.legitimacyMean, abs: metrics.legitimacyMean, color: '#5aff8a' },
    { label: 'Polarization', val: metrics.polarization - prev.polarization, abs: metrics.polarization, color: '#ff9a3c' },
    { label: 'Norm', val: metrics.normMean - prev.normMean, abs: metrics.normMean, color: '#c05aff' },
    { label: 'Scarcity', val: metrics.scarcity - prev.scarcity, abs: metrics.scarcity, color: '#ff7788' },
  ];

  // Sort by absolute change, with a bonus for extreme values
  deltas.sort((a, b) => {
    const scoreA = Math.abs(a.val) * 2 + (a.abs > 0.6 || a.abs < 0.25 ? 0.1 : 0);
    const scoreB = Math.abs(b.val) * 2 + (b.abs > 0.6 || b.abs < 0.25 ? 0.1 : 0);
    return scoreB - scoreA;
  });

  for (let i = 0; i < Math.min(3, deltas.length); i++) {
    const d = deltas[i];
    if (Math.abs(d.val) > 0.015 || d.abs > 0.55 || d.abs < 0.2) {
      drivers.push({
        label: d.label,
        direction: d.val >= 0 ? 'up' : 'down',
        color: d.color,
        magnitude: Math.abs(d.val),
      });
    }
  }

  return drivers.slice(0, 3);
}

// -- Jiang Phrase (one-liner interpretation) ------------------------------------
export function jiangPhrase(
  metrics: MetricsVector,
  phase: PhaseLabel,
  forecast: ForecastResult | null,
): string {
  // High variance in forecast = bifurcation
  if (forecast && forecast.confidence < 0.35) {
    return 'Futuro aberto: bifurcacao iminente (alta variancia).';
  }

  // Specific phase interpretations
  if (phase === 'CRISIS') {
    if (metrics.inequality > 0.6 && metrics.scarcity > 0.5) {
      return 'Atrator de crise: desigualdade e escassez dominam.';
    }
    return 'Crise sistemica: multiplos vetores convergem para ruptura.';
  }

  if (phase === 'EXCEPTION') {
    if (metrics.normMean > 0.7 && metrics.legitimacyMean < 0.45) {
      return 'Ordem por coercao: N alto e L caindo -- excecao normalizante.';
    }
    return 'Estado de excecao: controle formal substitui legitimidade organica.';
  }

  if (phase === 'CONFLICT') {
    if (metrics.polarization > 0.5) {
      return 'Conflito polarizado: faccoes em trajetoria de colisao.';
    }
    return 'Tensao em escalada: limiar de violencia cruzado.';
  }

  if (phase === 'POLARIZED') {
    if (metrics.cohesion > 0.5) {
      return 'Coesao interna alta mas distancia interfaccional cresce.';
    }
    return 'Polarizacao em curso: fronteiras identitarias cristalizam.';
  }

  if (phase === 'RECOVERY') {
    return 'Recuperacao fragil: trajetoria depende das proximas intervencoes.';
  }

  // STABLE_ORDER
  if (metrics.inequality > 0.45) {
    return 'Ordem aparente com desigualdade latente -- equilíbrio instável.';
  }
  if (metrics.legitimacyMean > 0.65) {
    return 'Equilibrio sustentado por legitimidade: janela de oportunidade.';
  }
  return 'Sistema estavel: dinâmicas internas dentro de parametros.';
}

// -- Jiang "Why?" bullets (driver explanation from forecast) --------------------
export function jiangWhyBullets(
  metrics: MetricsVector,
  prev: MetricsVector | null,
  forecast: ForecastResult | null,
): string[] {
  const bullets: string[] = [];
  const drivers = computeDrivers(metrics, prev);

  for (const d of drivers) {
    const arrow = d.direction === 'up' || d.direction === 'high' ? 'subiu' : 'caiu';
    bullets.push(`${d.label} ${arrow} -- correlacao com regime detectada.`);
  }

  if (forecast && forecast.confidence < 0.4) {
    bullets.push('Confianca baixa: variancia alta entre rollouts sugere bifurcacao.');
  }

  if (metrics.inequality > 0.55 && metrics.legitimacyMean < 0.4) {
    bullets.push('Desigualdade alta + legitimidade baixa: padrao de crise historico.');
  }

  // Jiang suggestions (optional questions)
  if (bullets.length < 3) {
    bullets.push('Tente inverter o ato para ver o contrafactual.');
  }

  return bullets.slice(0, 4);
}

// -- Oracle probabilities (3-category aggregation) -----------------------------
export interface OracleProbs {
  order: number;
  conflict: number;
  crisis: number;
}

export function computeOracleProbs(
  probability: Partial<Record<PhaseLabel, number>>,
): OracleProbs {
  const p = (k: PhaseLabel) => probability[k] ?? 0;
  return {
    order:    p('STABLE_ORDER') + p('RECOVERY') * 0.6,
    conflict: p('POLARIZED') * 0.5 + p('CONFLICT'),
    crisis:   p('CRISIS') + p('EXCEPTION') * 0.65 + p('POLARIZED') * 0.1,
  };
}
