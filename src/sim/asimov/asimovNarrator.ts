// ── Asimov Theater — Historical Narrator ─────────────────────────────────────
import { MetricsVector, PhaseLabel } from './asimovTypes';

// ── Template pool per phase ────────────────────────────────────────────────
const HEADLINES: Record<PhaseLabel, string[]> = {
  STABLE_ORDER: [
    'Coesão elevada sustenta a estrutura vigente.',
    'As facções mantêm distância segura; a ordem prevalece.',
    'Recursos equilibrados favorecem a cooperação intragrupal.',
    'A legitimidade consolidada amortece tensões latentes.',
    'Um equilíbrio frágil mas funcional persiste no sistema.',
  ],
  POLARIZED: [
    'Centralidades divergem: os grupos se afastam progressivamente.',
    'A polarização avança enquanto a confiança intermedia enfraquece.',
    'Fronteiras identitárias se cristalizam nas regiões de contato.',
    'O abismo entre facções aprofunda-se sem ruptura imediata.',
    'Grupos fecham-se sobre si mesmos; a heterofilia declina.',
  ],
  CONFLICT: [
    'Incidentes de contato hostil aceleram na fronteira entre grupos.',
    'A frequência de conflito supera a capacidade de mediação.',
    'Tensão converte-se em ação: confrontos se multiplicam.',
    'O limiar de violência foi cruzado; a volatilidade sobe.',
    'Recursos disputados intensificam os embates interfaccionais.',
  ],
  CRISIS: [
    'O sistema entra em colapso de coesão: múltiplos pontos de ruptura.',
    'Desigualdade extrema destrói a legitimidade institucional.',
    'A espiral conflito-medo realimenta instabilidade global.',
    'Crise total: previsibilidade histórica colapsa.',
    'Todos os vetores apontam deterioração simultânea.',
  ],
  EXCEPTION: [
    'A norma se impõe pela força: ordem visível, liberdade restrita.',
    'Alta coerção suprime o conflito sem resolver a desigualdade subjacente.',
    'O estado de exceção normaliza-se gradualmente no tecido social.',
    'Controle formal cresce enquanto legitimidade orgânica murcha.',
    'Superfície estável; profundidade sob pressão acumulada.',
  ],
  RECOVERY: [
    'Sinais de recuperação: conflito cede, confiança reaparece lentamente.',
    'Após a crise, redistribuição emergente reduz tensões agudas.',
    'O sistema busca novo equilíbrio sobre as ruínas do anterior.',
    'A legitimidade ressurge — frágil, condicional, ainda incerta.',
    'Recuperação em curso: trajetória depende das intervenções subsequentes.',
  ],
};

// ── Causal templates (one per metric state) ──────────────────────────────
function buildCausal(m: MetricsVector, prev: MetricsVector | null): string {
  if (!prev) return 'Condições iniciais ainda em transição.';

  const dConflict   = m.conflictRate    - prev.conflictRate;
  const dIneq       = m.inequality      - prev.inequality;
  const dLegit      = m.legitimacyMean  - prev.legitimacyMean;
  const dNorm       = m.normMean        - prev.normMean;
  const dPolar      = m.polarization    - prev.polarization;
  const dCohesion   = m.cohesion        - prev.cohesion;
  const dScarcity   = m.scarcity        - prev.scarcity;

  const clauses: string[] = [];

  if (Math.abs(dConflict) > 0.04) {
    clauses.push(dConflict > 0 ? 'conflito elevou-se' : 'conflito recuou');
  }
  if (Math.abs(dIneq) > 0.03) {
    clauses.push(dIneq > 0 ? 'desigualdade avançou' : 'desigualdade reduziu');
  }
  if (Math.abs(dLegit) > 0.03) {
    clauses.push(dLegit > 0 ? 'legitimidade cresceu' : 'legitimidade caiu');
  }
  if (Math.abs(dNorm) > 0.05) {
    clauses.push(dNorm > 0 ? 'coerção normativa aumentou' : 'pressão normativa recuou');
  }
  if (Math.abs(dPolar) > 0.05) {
    clauses.push(dPolar > 0 ? 'polarização acentuou-se' : 'polarização amenizou');
  }
  if (Math.abs(dCohesion) > 0.04) {
    clauses.push(dCohesion > 0 ? 'coesão interna fortaleceu' : 'coesão interna fragmentou');
  }
  if (Math.abs(dScarcity) > 0.04) {
    clauses.push(dScarcity > 0 ? 'escassez de recursos agravou' : 'abundância de recursos melhorou');
  }

  // Causal chains
  if (dIneq > 0.03 && dLegit < -0.02) {
    return 'Desigualdade crescente erodiu a legitimidade institucional.';
  }
  if (dConflict > 0.05 && dIneq > 0.02) {
    return 'Disputa por recursos amplificou a desigualdade via conflito.';
  }
  if (dNorm > 0.06 && dConflict < -0.04) {
    return 'Aumento coercitivo da norma suprimiu conflito visível — a curto prazo.';
  }
  if (dLegit > 0.05 && dConflict < -0.03) {
    return 'Recuperação de legitimidade amorteceu o ciclo de conflito.';
  }
  if (m.normMean > 0.7 && m.inequality > 0.55) {
    return 'A exceção se normalizou: ordem crescente, liberdade declinante.';
  }

  if (clauses.length === 0) return 'Tendências se mantêm estáveis; sem mudança discernível.';
  if (clauses.length === 1) return `${capitalize(clauses[0])}.`;
  if (clauses.length === 2) return `${capitalize(clauses[0])} enquanto ${clauses[1]}.`;
  return `${capitalize(clauses[0])}, ${clauses[1]} e ${clauses[2]}.`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Pick a headline pseudo-randomly but deterministically ─────────────────
function pickTemplate(templates: string[], t: number): string {
  const idx = Math.floor(t) % templates.length;
  return templates[Math.max(0, idx)];
}

// ── Generate a narrative frame ────────────────────────────────────────────
export function generateNarrative(
  phase: PhaseLabel,
  metrics: MetricsVector,
  prev: MetricsVector | null,
  isAct: boolean,
  actName?: string,
): { headline: string; causal: string } {
  const templates = HEADLINES[phase] ?? HEADLINES.STABLE_ORDER;
  const headline  = isAct && actName
    ? `Ato aplicado: ${actName}. ${pickTemplate(templates, metrics.t)}`
    : pickTemplate(templates, metrics.t);
  const causal = buildCausal(metrics, prev);
  return { headline, causal };
}

// ── Short label for metric value ──────────────────────────────────────────
export function metricLabel(v: number): string {
  if (v < 0.25) return 'Baixo';
  if (v < 0.50) return 'Moderado';
  if (v < 0.75) return 'Alto';
  return 'Muito alto';
}
