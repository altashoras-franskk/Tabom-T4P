// ─────────────────────────────────────────────────────────────────────────────
// Language Lab – Operators (Speak)
// GlyphSpec + position + intensity → GlyphAct
// ─────────────────────────────────────────────────────────────────────────────
import type { GlyphSpec, GlyphAct, OperatorKind, LanguageParams } from './types';
import { tokensToOperator } from './glyphParser';
import { parseGlyph } from './glyphParser';

export function createGlyphAct(
  spec: GlyphSpec,
  targetX: number,
  targetY: number,
  params: LanguageParams,
): GlyphAct {
  const features = parseGlyph(spec);
  const kind = tokensToOperator(features.tokens);
  const intensity = params.speakIntensity;

  // Radius and duration scale with intensity and features
  const radius   = 0.12 + intensity * 0.18 + features.ringCount * 0.02;
  const duration = 2 + intensity * 6 + features.arcCount * 0.5;

  return {
    glyphId: spec.id,
    kind,
    strength: 0.3 + intensity * 0.7,
    radius,
    duration,
    targetX,
    targetY,
    timestamp: Date.now(),
  };
}

// ── Operator descriptions (for UI) ────────────────────────────────────────────
export const OPERATOR_LABELS: Record<OperatorKind, { label: string; color: string; desc: string }> = {
  CONVERGE: { label: 'UNIR',       color: '#60c0ff', desc: 'Alinha fases, favorece loops e sincronização' },
  DIVERGE:  { label: 'DISPERSAR',  color: '#ff6060', desc: 'Fragmenta, repele, reduz coerência' },
  SILENCE:  { label: 'SILENCIAR',  color: '#80ff80', desc: 'Acalma velocidades, reduz depósito de tinta' },
  AMPLIFY:  { label: 'AMPLIFICAR', color: '#ffd060', desc: 'Intensifica escrita e tinta, aumenta loops' },
  CUT:      { label: 'CORTAR',     color: '#ff80ff', desc: 'Cria fronteira local por tempo limitado' },
};

export function getOperatorFromKind(kind: OperatorKind) {
  return OPERATOR_LABELS[kind];
}
