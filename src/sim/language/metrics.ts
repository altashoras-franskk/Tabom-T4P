// ─────────────────────────────────────────────────────────────────────────────
// Language Lab – Metrics
// Derived metrics for display: sync, coherence, novelty, lexicon health
// ─────────────────────────────────────────────────────────────────────────────
import type { Observables, LexiconEntry } from './types';

export interface LanguageMetrics {
  sync: number;           // 0..1 Kuramoto order
  coherence: number;      // 0..1 mean quantum coherence
  novelty: number;        // 0..1 rate of change
  loopDensity: number;    // 0..1 loop formation
  lexiconHealth: number;  // 0..1 accepted entries / total
  lexiconSize: number;
  avgConfidence: number;
}

export function computeLanguageMetrics(
  obs: Observables,
  lexicon: LexiconEntry[],
): LanguageMetrics {
  const accepted = lexicon.filter(e => e.status === 'accepted').length;
  const health = lexicon.length > 0 ? accepted / lexicon.length : 0;
  const avgConf = lexicon.length > 0
    ? lexicon.reduce((s, e) => s + e.confidence, 0) / lexicon.length
    : 0;

  return {
    sync:          obs.syncIndex,
    coherence:     obs.coherenceMean,
    novelty:       obs.noveltyIndex,
    loopDensity:   obs.loopCount,
    lexiconHealth: health,
    lexiconSize:   lexicon.length,
    avgConfidence: avgConf,
  };
}
