// ── Alchemy Lab — Opus Mode (Magnum Opus) ────────────────────────────────────
import { OpusPhase, OpusPhaseConfig, AlchemyMetrics, ElementMix } from './alchemyTypes';

export const OPUS_PHASES: Record<OpusPhase, OpusPhaseConfig> = {
  NIGREDO: {
    phase:    'NIGREDO',
    label:    'Nigredo',
    symbol:   '◼',
    color:    '#2a1a1a',
    bgTint:   'rgba(0,0,0,0.28)',
    mixTarget:  { earth:.30, water:.35, air:.15, fire:.20 },
    heatTarget: 0.55,
    duration:   45,
    minIntegration: 0.0,  // Nigredo: integration can be low
    maxTension:     1.0,  // tension expected to be high
    minNovelty:     0.15, // must have some movement
  },
  ALBEDO: {
    phase:    'ALBEDO',
    label:    'Albedo',
    symbol:   '◽',
    color:    '#c8c8d8',
    bgTint:   'rgba(180,190,220,0.06)',
    mixTarget:  { earth:.20, water:.45, air:.25, fire:.10 },
    heatTarget: 0.30,
    duration:   45,
    minIntegration: 0.45,
    maxTension:     0.45,
    minNovelty:     0.20,
  },
  CITRINITAS: {
    phase:    'CITRINITAS',
    label:    'Citrinitas',
    symbol:   '◐',
    color:    '#d4aa00',
    bgTint:   'rgba(200,160,0,0.06)',
    mixTarget:  { earth:.20, water:.25, air:.30, fire:.25 },
    heatTarget: 0.45,
    duration:   45,
    minIntegration: 0.55,
    maxTension:     0.35,
    minNovelty:     0.30,
  },
  RUBEDO: {
    phase:    'RUBEDO',
    label:    'Rubedo',
    symbol:   '◉',
    color:    '#8b0000',
    bgTint:   'rgba(139,0,0,0.07)',
    mixTarget:  { earth:.25, water:.20, air:.20, fire:.35 },
    heatTarget: 0.60,
    duration:   45,
    minIntegration: 0.60,
    maxTension:     0.40,
    minNovelty:     0.25,
  },
};

export const OPUS_ORDER: OpusPhase[] = ['NIGREDO','ALBEDO','CITRINITAS','RUBEDO'];

export interface OpusState {
  active:      boolean;
  phase:       OpusPhase;
  phaseIndex:  number;   // 0..3
  timer:       number;   // elapsed in current phase (secs)
  maxTimer:    number;   // default 45s
  completed:   OpusPhase[];
  lapisForged: boolean;
}

export function createOpusState(): OpusState {
  return {
    active:false, phase:'NIGREDO', phaseIndex:0,
    timer:0, maxTimer:45, completed:[], lapisForged:false,
  };
}

// Diagnose end-of-phase
export interface PhaseDiagnosis {
  passed:   boolean;
  reason:   string;
  metrics:  AlchemyMetrics;
}

export function diagnosePhase(
  phase: OpusPhase,
  metrics: AlchemyMetrics,
): PhaseDiagnosis {
  const cfg = OPUS_PHASES[phase];
  const m   = metrics;

  if (m.integrationIndex < cfg.minIntegration) {
    return { passed:false, reason:`Integração insuficiente (${(m.integrationIndex*100).toFixed(0)}%)`, metrics:m };
  }
  if (m.tensionIndex > cfg.maxTension) {
    return { passed:false, reason:`Tensão excessiva (${(m.tensionIndex*100).toFixed(0)}%) — a separatio domina`, metrics:m };
  }
  if (m.noveltyIndex < cfg.minNovelty) {
    return { passed:false, reason:`Novelty insuficiente — o sistema cristalizou`, metrics:m };
  }
  return { passed:true, reason:`${cfg.label} consumada com sucesso`, metrics:m };
}

// Get current phase color mix (target)
export function getPhaseTarget(phase: OpusPhase): { mix: ElementMix; heat: number } {
  const cfg = OPUS_PHASES[phase];
  return { mix: cfg.mixTarget, heat: cfg.heatTarget };
}

export function nextPhase(opus: OpusState): OpusPhase | null {
  const next = opus.phaseIndex + 1;
  if (next >= OPUS_ORDER.length) return null;
  return OPUS_ORDER[next];
}
