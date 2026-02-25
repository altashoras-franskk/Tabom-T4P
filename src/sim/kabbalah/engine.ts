// ─────────────────────────────────────────────────────────────────────────────
// Tree of Life Engine — Hermetic Qabalah Simulation
// ─────────────────────────────────────────────────────────────────────────────
import type {
  TreeState, SephirahState, PathState, SephirahId,
  CardPlay, TreeEvent, OperatorKind, TreeOfLifeParams,
  RitualToolId,
} from './types';
import { SEPHIROT, PATHS, PILLAR_NODES } from './topology';
import { ARCANA_MAP } from './arcana';
import { DECK_LENS_MAP } from './deckLenses';

// ── Factory ──────────────────────────────────────────────────────────────────
function makeSephirah(id: SephirahId, overrides?: Partial<SephirahState>): SephirahState {
  return {
    id,
    charge:    0.30,
    coherence: 0.20,
    tension:   0.15,
    openness:  0.50,
    memory:    0.10,
    ...overrides,
  };
}

function makePath(pathId: number): PathState {
  return { pathId, flow: 0.20, blockage: 0.10, pulseAcc: 0, recentOps: [] };
}

export function createTree(params: TreeOfLifeParams): TreeState {
  const sephirot = new Map<SephirahId, SephirahState>();
  for (const s of SEPHIROT) sephirot.set(s.id, makeSephirah(s.id));

  const malkuth = sephirot.get('malkuth')!;
  malkuth.charge   = 0.55;
  malkuth.openness = 0.65;

  const paths = new Map<number, PathState>();
  for (const p of PATHS) paths.set(p.pathId, makePath(p.pathId));

  return {
    sephirot, paths,
    tick: 0, time: 0,
    globalCoherence: 0.20,
    globalTension:   0.15,
    expansionAccum:  0,
    severityAccum:   0,
    events: [],
    novelty: 0,
    veilsEnabled:   params.veilsEnabled,
    pillarsEnabled:  params.pillarsEnabled,
  };
}

export function resetTree(state: TreeState, params: TreeOfLifeParams): void {
  Object.assign(state, createTree(params));
}

// ── Pillar bias ──────────────────────────────────────────────────────────────
function pillarBias(id: SephirahId): { mercy: number; severity: number } {
  if (PILLAR_NODES.mercy.includes(id))    return { mercy: 0.12, severity: 0 };
  if (PILLAR_NODES.severity.includes(id)) return { mercy: 0, severity: 0.12 };
  return { mercy: 0.06, severity: 0.06 };
}

// ── Global metric update ─────────────────────────────────────────────────────
function refreshGlobals(state: TreeState): void {
  let coh = 0, ten = 0, n = 0;
  for (const s of state.sephirot.values()) {
    coh += s.coherence; ten += s.tension; n++;
  }
  const prev = state.globalCoherence;
  state.globalCoherence = coh / n;
  state.globalTension   = ten / n;
  state.novelty = Math.abs(state.globalCoherence - prev) * 10;
}

// ── Step function ────────────────────────────────────────────────────────────
export function stepTree(state: TreeState, dt: number, params: TreeOfLifeParams): void {
  state.time += dt;
  state.tick++;

  const ritualMod = params.ritualIntensity ?? 0.5;
  const clarityMod = params.astralClarity ?? 0.5;

  for (const s of state.sephirot.values()) {
    const pb = pillarBias(s.id);
    const merBias = state.pillarsEnabled ? pb.mercy * 0.08 : 0;
    const sevBias = state.pillarsEnabled ? pb.severity * 0.08 : 0;

    s.charge    = clamp(s.charge    - 0.005 * dt + merBias * dt * 0.5);
    s.coherence = clamp(s.coherence - 0.003 * dt + merBias * dt + sevBias * dt * 0.5 + clarityMod * 0.002 * dt);
    s.tension   = clamp(s.tension   - 0.004 * dt + sevBias * dt);
    s.openness  = clamp(s.openness  + (0.5 - s.openness) * 0.01 * dt);
    s.memory    = clamp(s.memory    - 0.002 * dt);
  }

  for (const path of state.paths.values()) {
    path.pulseAcc += dt;
    path.blockage = clamp(path.blockage - 0.005 * dt);
    path.flow     = clamp(path.flow + (0.20 - path.flow) * 0.01 * dt);
    if (path.recentOps.length > 3) path.recentOps = path.recentOps.slice(-3);
  }

  // Chesed–Geburah balance (Mercy vs Severity accumulation)
  const chesed  = state.sephirot.get('chesed')!;
  const geburah = state.sephirot.get('geburah')!;

  if (chesed.charge > 0.70)  state.expansionAccum += dt;
  else                        state.expansionAccum  = Math.max(0, state.expansionAccum - dt * 0.5);
  if (geburah.tension > 0.70) state.severityAccum  += dt;
  else                         state.severityAccum   = Math.max(0, state.severityAccum - dt * 0.5);

  if (state.expansionAccum > 18) {
    state.expansionAccum = 0;
    emitEvent(state, 'DISSOLUTION',
      'Chesed overflow: Mercy without Severity dissolves form. Apply Banish or Seal to restore balance.');
  }
  if (state.severityAccum > 18) {
    state.severityAccum = 0;
    emitEvent(state, 'CRYSTALLIZATION',
      'Geburah excess: Severity crystallises the astral field. Invoke or open gates to restore flow.');
  }

  // Great Work pulse — when global coherence and openness are both high
  const globalOpen = [...state.sephirot.values()].reduce((s, v) => s + v.openness, 0) / 10;
  if (state.globalCoherence > 0.6 && globalOpen > 0.6 && ritualMod > 0.4) {
    if (Math.random() < dt * 0.05) {
      emitEvent(state, 'GREAT_WORK_PULSE',
        'The Great Work resonates — a pulse of alchemical harmony radiates through the Tree.');
      for (const s of state.sephirot.values()) {
        s.charge = clamp(s.charge + 0.02);
        s.coherence = clamp(s.coherence + 0.01);
      }
    }
  }

  refreshGlobals(state);
}

// ── Apply a card play ────────────────────────────────────────────────────────
export function applyCard(state: TreeState, play: CardPlay, params: TreeOfLifeParams): void {
  const arcana = ARCANA_MAP.get(play.arcanaId);
  if (!arcana) return;

  const lens = DECK_LENS_MAP.get(play.lensId);
  const bias = lens?.bias.operators ?? {};

  const op   = play.reversed ? arcana.operator.reversed : arcana.operator;
  const base = play.reversed ? arcana.operator.reversed.costFactor : arcana.operator.magnitude;
  const mag  = (base ?? 0.7) * (params.strictness * 0.4 + 0.6) * (1 + (params.ritualIntensity ?? 0.5) * 0.3);

  if (play.targetType === 'sephirah') {
    const s = state.sephirot.get(play.targetId as SephirahId);
    if (s) {
      applyOpToSephirah(s, op.primary, mag, bias);
      if (op.secondary) applyOpToSephirah(s, op.secondary, mag * 0.5, bias);
      if (play.reversed) s.tension = clamp(s.tension + arcana.operator.reversed.costFactor * 0.3);
    }
  } else if (play.targetType === 'path') {
    const p = state.paths.get(play.targetId as number);
    if (p) {
      applyOpToPath(p, op.primary, mag, bias);
      if (op.secondary) applyOpToPath(p, op.secondary, mag * 0.5, bias);
    }
  } else {
    const m = mag * 0.35;
    for (const s of state.sephirot.values()) {
      applyOpToSephirah(s, op.primary, m, bias);
    }
  }

  refreshGlobals(state);
  if (state.veilsEnabled) checkVeils(state);
}

// ── Ritual tool application ──────────────────────────────────────────────────
export function applyRitualTool(
  state: TreeState,
  tool: RitualToolId,
  targetId: SephirahId | number,
  targetType: 'sephirah' | 'path',
  params: TreeOfLifeParams,
): void {
  const intensity = params.ritualIntensity ?? 0.5;

  if (targetType === 'sephirah') {
    const s = state.sephirot.get(targetId as SephirahId);
    if (!s) return;
    switch (tool) {
      case 'invoke':
        s.charge    = clamp(s.charge + 0.15 * intensity);
        s.openness  = clamp(s.openness + 0.08 * intensity);
        break;
      case 'banish':
        s.tension   = clamp(s.tension - 0.15 * intensity);
        s.blockage  && (s.memory = clamp(s.memory - 0.05));
        s.memory    = clamp(s.memory - 0.08 * intensity);
        break;
      case 'seal':
        s.coherence = clamp(s.coherence + 0.12 * intensity);
        s.openness  = clamp(s.openness - 0.06 * intensity);
        break;
      case 'transmute':
        const excess = Math.max(s.tension - 0.3, 0);
        s.tension   = clamp(s.tension - excess * 0.6);
        s.charge    = clamp(s.charge + excess * 0.4);
        s.coherence = clamp(s.coherence + excess * 0.2);
        break;
      case 'portal':
        s.openness  = clamp(s.openness + 0.20 * intensity);
        s.charge    = clamp(s.charge + 0.10 * intensity);
        s.tension   = clamp(s.tension + 0.05 * intensity);
        break;
      case 'trace':
        s.charge    = clamp(s.charge + 0.08 * intensity);
        s.coherence = clamp(s.coherence + 0.05 * intensity);
        break;
    }
  } else {
    const p = state.paths.get(targetId as number);
    if (!p) return;
    switch (tool) {
      case 'invoke':
        p.flow     = clamp(p.flow + 0.15 * intensity);
        p.blockage = clamp(p.blockage - 0.08 * intensity);
        break;
      case 'banish':
        p.blockage = clamp(p.blockage - 0.20 * intensity);
        p.flow     = clamp(p.flow + 0.05 * intensity);
        break;
      case 'seal':
        p.blockage = clamp(p.blockage + 0.12 * intensity);
        break;
      case 'transmute':
        p.flow     = clamp(p.flow + 0.10 * intensity);
        p.blockage = clamp(p.blockage * (1 - 0.3 * intensity));
        break;
      case 'portal':
        p.flow     = clamp(p.flow + 0.20 * intensity);
        p.blockage = clamp(p.blockage - 0.15 * intensity);
        break;
      case 'trace':
        p.flow     = clamp(p.flow + 0.12 * intensity);
        break;
    }
  }

  refreshGlobals(state);
}

// ── Operator application ─────────────────────────────────────────────────────
function getBias(op: OperatorKind, bias: Partial<Record<OperatorKind, number>>): number {
  return bias[op] ?? 1.0;
}

function applyOpToSephirah(
  s: SephirahState, op: OperatorKind, mag: number,
  bias: Partial<Record<OperatorKind, number>>,
): void {
  const m = mag * getBias(op, bias);
  switch (op) {
    case 'OPEN_GATE':     s.openness  = clamp(s.openness  + m * 0.5); break;
    case 'CLOSE_GATE':    s.openness  = clamp(s.openness  - m * 0.4); break;
    case 'AMPLIFY':       s.charge    = clamp(s.charge    + m * 0.6);
                          s.coherence = clamp(s.coherence + m * 0.2); break;
    case 'SILENCE':       s.tension   = clamp(s.tension   - m * 0.4);
                          s.charge    = clamp(s.charge    - m * 0.2); break;
    case 'CONVERGE':      s.coherence = clamp(s.coherence + m * 0.5); break;
    case 'DIVERGE':       s.coherence = clamp(s.coherence - m * 0.3);
                          s.tension   = clamp(s.tension   + m * 0.2); break;
    case 'CUT':           s.memory    = clamp(s.memory    - m * 0.6);
                          s.tension   = clamp(s.tension   - m * 0.3); break;
    case 'BALANCE':       s.tension   = clamp(s.tension   - m * 0.4);
                          s.coherence = clamp(s.coherence + m * 0.3); break;
    case 'SHOCK':         s.tension   = clamp(s.tension   + m * 0.5);
                          s.charge    = clamp(s.charge    + m * 0.4); break;
    case 'LOOP':          s.memory    = clamp(s.memory    + m * 0.4); break;
    case 'MEMORY':        s.memory    = clamp(s.memory    + m * 0.5); break;
    case 'STABILIZE':     s.tension   = clamp(s.tension   * (1 - m * 0.3));
                          s.coherence = clamp(s.coherence + m * 0.2); break;
    case 'CLARIFY':       s.coherence = clamp(s.coherence + m * 0.4);
                          s.tension   = clamp(s.tension   - m * 0.3); break;
    case 'REVIEW':        s.memory    = clamp(s.memory    + m * 0.3);
                          s.coherence = clamp(s.coherence + m * 0.2); break;
    case 'INTEGRATE':     s.coherence = clamp(s.coherence + m * 0.5);
                          s.memory    = clamp(s.memory    + m * 0.3);
                          s.tension   = clamp(s.tension   * (1 - m * 0.4)); break;
    case 'SPEED':         s.openness  = clamp(s.openness  + m * 0.3); break;
    case 'SLOW':          s.openness  = clamp(s.openness  - m * 0.2);
                          s.memory    = clamp(s.memory    + m * 0.2); break;
    case 'DELAY':         s.openness  = clamp(s.openness  - m * 0.3);
                          s.memory    = clamp(s.memory    + m * 0.4); break;
    case 'BRIDGE':        s.openness  = clamp(s.openness  + m * 0.4);
                          s.coherence = clamp(s.coherence + m * 0.2); break;
    case 'RITUAL_PULSE':  s.charge    = clamp(s.charge    + m * 0.3);
                          s.memory    = clamp(s.memory    + m * 0.2); break;
    case 'INVOKE':        s.charge    = clamp(s.charge    + m * 0.5);
                          s.openness  = clamp(s.openness  + m * 0.3); break;
    case 'BANISH':        s.tension   = clamp(s.tension   - m * 0.5);
                          s.memory    = clamp(s.memory    - m * 0.3); break;
    case 'TRANSMUTE':     { const ex = Math.max(s.tension - 0.3, 0) * m;
                          s.tension   = clamp(s.tension   - ex);
                          s.charge    = clamp(s.charge    + ex * 0.5);
                          s.coherence = clamp(s.coherence + ex * 0.3); break; }
    case 'SEAL':          s.coherence = clamp(s.coherence + m * 0.4);
                          s.openness  = clamp(s.openness  - m * 0.2); break;
  }
}

function applyOpToPath(
  p: PathState, op: OperatorKind, mag: number,
  bias: Partial<Record<OperatorKind, number>>,
): void {
  const m = mag * getBias(op, bias);
  p.recentOps = [...p.recentOps.slice(-2), op];
  switch (op) {
    case 'OPEN_GATE':    p.flow     = clamp(p.flow    + m * 0.5);
                         p.blockage = clamp(p.blockage - m * 0.3); break;
    case 'CLOSE_GATE':   p.flow     = clamp(p.flow    - m * 0.4); break;
    case 'CUT':          p.blockage = clamp(p.blockage + m * 0.5);
                         p.flow     = clamp(p.flow    - m * 0.4); break;
    case 'AMPLIFY':      p.flow     = clamp(p.flow    + m * 0.6); break;
    case 'DELAY':        p.blockage = clamp(p.blockage + m * 0.4); break;
    case 'SPEED':        p.flow     = clamp(p.flow    + m * 0.6);
                         p.blockage = clamp(p.blockage - m * 0.2); break;
    case 'RITUAL_PULSE': p.pulseAcc = 0; p.flow = clamp(p.flow + m * 0.3); break;
    case 'INVOKE':       p.flow     = clamp(p.flow    + m * 0.5);
                         p.blockage = clamp(p.blockage - m * 0.2); break;
    case 'BANISH':       p.blockage = clamp(p.blockage - m * 0.5);
                         p.flow     = clamp(p.flow    + m * 0.1); break;
    case 'TRANSMUTE':    p.flow     = clamp(p.flow    + m * 0.3);
                         p.blockage = clamp(p.blockage * (1 - m * 0.4)); break;
    case 'SEAL':         p.blockage = clamp(p.blockage + m * 0.3); break;
    default:             p.flow     = clamp(p.flow    + m * 0.2); break;
  }
}

// ── Veil check ───────────────────────────────────────────────────────────────
function checkVeils(state: TreeState): void {
  const aboveTiph: SephirahId[] = ['kether','chokmah','binah','chesed','geburah'];
  for (const id of aboveTiph) {
    const s = state.sephirot.get(id)!;
    if (state.globalCoherence < 0.45 && s.charge > 0.65) {
      s.charge = 0.65;
      emitEvent(state, 'VEIL_BREACH',
        `Veil of Paroketh: insufficient coherence (${(state.globalCoherence * 100).toFixed(0)}%) to sustain charge in ${id}. Strengthen the lower Tree first.`);
    }
  }
  const kether = state.sephirot.get('kether')!;
  if (state.globalTension > 0.55 && kether.charge > 0.50) {
    kether.charge = 0.50;
    emitEvent(state, 'VEIL_BREACH',
      `Veil of the Abyss: tension too high (${(state.globalTension * 100).toFixed(0)}%) to access Kether. Purify the astral before attempting the crossing.`);
  }
}

function emitEvent(state: TreeState, kind: TreeEvent['kind'], description: string): void {
  state.events = [
    ...state.events.slice(-19),
    { id: Date.now().toString(), kind, timestamp: Date.now(), description },
  ];
}

function clamp(v: number): number { return Math.max(0, Math.min(1, v)); }

// ── Snapshot helpers ─────────────────────────────────────────────────────────
export function getStateSnapshot(state: TreeState) {
  let memory = 0, openness = 0, n = 0;
  for (const s of state.sephirot.values()) {
    memory  += s.memory;
    openness += s.openness;
    n++;
  }
  return {
    coherence: state.globalCoherence,
    tension:   state.globalTension,
    memory:    memory / n,
    openness:  openness / n,
    novelty:   state.novelty,
  };
}

// ── Draw a hand from full deck ───────────────────────────────────────────────
let _drawSeed = Date.now();
function rand(): number {
  _drawSeed = (_drawSeed * 1664525 + 1013904223) & 0xffffffff;
  return (_drawSeed >>> 0) / 0xffffffff;
}

export function drawHand(size: 3 | 4 | 5, exclude: number[] = []): { id: number; reversed: boolean }[] {
  const pool = Array.from({ length: 22 }, (_, i) => i).filter(i => !exclude.includes(i));
  const hand: { id: number; reversed: boolean }[] = [];
  while (hand.length < size && pool.length > 0) {
    const idx = Math.floor(rand() * pool.length);
    hand.push({ id: pool[idx], reversed: rand() < 0.25 });
    pool.splice(idx, 1);
  }
  return hand;
}
