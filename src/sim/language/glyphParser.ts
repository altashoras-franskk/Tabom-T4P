// ─────────────────────────────────────────────────────────────────────────────
// Language Lab – Glyph Parser
// GlyphSpec → GlyphFeatures (tokens, embedding, bins)
// ─────────────────────────────────────────────────────────────────────────────
import type {
  GlyphSpec, GlyphFeatures,
  SymmetryBin, AxisBin, DensityBin, CoherenceBin, TensionBin, NoveltyBin,
} from './types';

const TWO_PI = Math.PI * 2;

function bin3(v: number, a: string, b: string, c: string): string {
  return v < 0.33 ? a : v < 0.67 ? b : c;
}

function axisBin(angle: number): AxisBin {
  const idx = Math.round(((angle % TWO_PI + TWO_PI) % TWO_PI) / TWO_PI * 8) % 8;
  const bins: AxisBin[] = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];
  return bins[idx];
}

function symmetryBin(v: number): SymmetryBin {
  return v < 0.4 ? 'low' : v < 0.7 ? 'med' : 'high';
}

export function parseGlyph(spec: GlyphSpec): GlyphFeatures {
  const obs = spec.observables;

  const ringCount   = 1 + spec.innerRings.length;
  const notchCount  = spec.notches.length;
  const arcCount    = spec.arcs.length;
  const blotCount   = spec.blots.length;

  const symBin:  SymmetryBin  = symmetryBin(obs.symmetryIndex);
  const axBin:   AxisBin      = axisBin(obs.polarityAxis);
  const denBin:  DensityBin   = bin3(obs.densityMean, 'sparse', 'normal', 'dense') as DensityBin;
  const cohBin:  CoherenceBin = bin3(obs.coherenceMean, 'chaos', 'mixed', 'coherent') as CoherenceBin;
  const tenBin:  TensionBin   = bin3(obs.tensionIndex, 'calm', 'mid', 'tense') as TensionBin;
  const novBin:  NoveltyBin   = bin3(obs.noveltyIndex, 'stale', 'shifting', 'novel') as NoveltyBin;

  const tokens: string[] = [
    `R${ringCount}`,
    ...(notchCount > 0 ? [`N${notchCount}`] : []),
    ...(arcCount > 0   ? [`A${arcCount}`]   : []),
    ...(blotCount > 0  ? [`B${blotCount}`]  : []),
    `SYM_${symBin.toUpperCase()}`,
    `AX_${axBin}`,
    `DEN_${denBin.toUpperCase()}`,
    `COH_${cohBin.toUpperCase()}`,
    `TEN_${tenBin.toUpperCase()}`,
    `NOV_${novBin.toUpperCase()}`,
  ];

  // Normalised embedding vector (14 dims)
  const embedding: number[] = [
    ringCount / 4,
    notchCount / 5,
    arcCount / 4,
    blotCount / 6,
    obs.symmetryIndex,
    ((obs.polarityAxis % TWO_PI + TWO_PI) % TWO_PI) / TWO_PI,
    obs.densityMean,
    obs.coherenceMean,
    obs.tensionIndex,
    obs.noveltyIndex,
    obs.syncIndex,
    obs.loopCount,
    obs.silenceIndex,
    obs.eventRate,
  ];

  return { ringCount, notchCount, arcCount, blotCount, symmetryBin: symBin, axisBin: axBin, densityBin: denBin, coherenceBin: cohBin, tensionBin: tenBin, noveltyBin: novBin, tokens, embedding };
}

// ── Cosine similarity for clustering ─────────────────────────────────────────
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

// ── Derive operator kind from tokens ─────────────────────────────────────────
export function tokensToOperator(tokens: string[]): import('./types').OperatorKind {
  const set = new Set(tokens);
  if (set.has('COH_COHERENT') && set.has('SYM_HIGH'))    return 'CONVERGE';
  if (set.has('COH_CHAOS')    || set.has('TEN_TENSE'))   return 'DIVERGE';
  if (set.has('DEN_SPARSE')   && set.has('NOV_STALE'))   return 'SILENCE';
  if (set.has('DEN_DENSE')    && set.has('COH_COHERENT')) return 'AMPLIFY';
  if (set.has('N3') || set.has('N4') || set.has('N5'))  return 'CUT';
  return 'CONVERGE';
}
