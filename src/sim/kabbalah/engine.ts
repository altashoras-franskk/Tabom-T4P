// ─────────────────────────────────────────────────────────────────────────────
// Tree of Life Engine — World State Management + Physics Step
// ─────────────────────────────────────────────────────────────────────────────
import type {
  TreeState, SephirahState, PathState, SephirahId,
  CardPlay, KabbalahEvent, OperatorKind, TreeOfLifeParams,
} from './types';
import { SEPHIROT, PATHS, PILLAR_NODES } from './topology';
import { ARCANA_MAP } from './arcana';
import { DECK_LENS_MAP } from './deckLenses';

// ── Factory ───────────────────────────────────────────────────────────────────
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
  return {
    pathId,
    flow:     0.20,
    blockage: 0.10,
    pulseAcc: 0,
    recentOps: [],
  };
}

export function createTree(params: TreeOfLifeParams): TreeState {
  const sephirot = new Map<SephirahId, SephirahState>();
  for (const s of SEPHIROT) sephirot.set(s.id, makeSephirah(s.id));

  // Malkuth starts more charged (material base)
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
  const fresh = createTree(params);
  Object.assign(state, fresh);
}

// ── Pillar bias ───────────────────────────────────────────────────────────────
function pillarBias(id: SephirahId): { mercy: number; severity: number } {
  if (PILLAR_NODES.mercy.includes(id))    return { mercy: 0.12, severity: 0 };
  if (PILLAR_NODES.severity.includes(id)) return { mercy: 0, severity: 0.12 };
  return { mercy: 0.06, severity: 0.06 };
}

// ── Global metric update ──────────────────────────────────────────────────────
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

// ── Step function (called ~10fps) ─────────────────────────────────────────────
export function stepTree(state: TreeState, dt: number, params: TreeOfLifeParams): void {
  state.time += dt;
  state.tick++;

  // 1) Natural drift — each node evolves slowly toward equilibrium
  for (const s of state.sephirot.values()) {
    const pb = pillarBias(s.id);

    // Mercy pillar softly raises openness, Severity raises structure (coherence↑, tension↑)
    const merBias = state.pillarsEnabled ? pb.mercy * 0.08 : 0;
    const sevBias = state.pillarsEnabled ? pb.severity * 0.08 : 0;

    s.charge    = clamp(s.charge    - 0.005 * dt + merBias * dt * 0.5);
    s.coherence = clamp(s.coherence - 0.003 * dt + merBias * dt + sevBias * dt * 0.5);
    s.tension   = clamp(s.tension   - 0.004 * dt + sevBias * dt);
    s.openness  = clamp(s.openness  + (0.5 - s.openness) * 0.01 * dt);
    s.memory    = clamp(s.memory    - 0.002 * dt);
  }

  // 2) Path flow — edges transmit small impulses between connected sephirot
  for (const path of state.paths.values()) {
    path.pulseAcc  += dt;
    path.blockage   = clamp(path.blockage - 0.005 * dt);

    // Flow decays toward baseline
    path.flow = clamp(path.flow + (0.20 - path.flow) * 0.01 * dt);

    // Clear old ops
    if (path.recentOps.length > 3) path.recentOps = path.recentOps.slice(-3);
  }

  // 3) Chesed–Geburah balance tracking
  const chesed  = state.sephirot.get('chesed')!;
  const geburah = state.sephirot.get('geburah')!;
  if (chesed.charge > 0.70)  state.expansionAccum += dt;
  else                        state.expansionAccum  = Math.max(0, state.expansionAccum - dt * 0.5);
  if (geburah.tension > 0.70) state.severityAccum  += dt;
  else                         state.severityAccum   = Math.max(0, state.severityAccum - dt * 0.5);

  // Fire events
  if (state.expansionAccum > 18) {
    state.expansionAccum = 0;
    emitEvent(state, 'DISSOLUTION',
      'Chesed overflow: expansion accumulation causes dissolution — consider CUT or SILENCE.');
  }
  if (state.severityAccum > 18) {
    state.severityAccum = 0;
    emitEvent(state, 'CRYSTALLIZATION',
      'Geburah excess: over-restriction crystallises the field — consider OPEN_GATE or AMPLIFY.');
  }

  // 4) Refresh globals
  refreshGlobals(state);
}

// ── Apply a card play ─────────────────────────────────────────────────────────
export function applyCard(state: TreeState, play: CardPlay, params: TreeOfLifeParams): void {
  const arcana = ARCANA_MAP.get(play.arcanaId);
  if (!arcana) return;

  const lens = DECK_LENS_MAP.get(play.lensId);
  const bias = lens?.bias.operators ?? {};

  const op     = play.reversed ? arcana.operator.reversed : arcana.operator;
  const base   = play.reversed ? arcana.operator.reversed.costFactor : arcana.operator.magnitude;
  const mag    = (base ?? 0.7) * (params.strictness * 0.4 + 0.6);

  // Apply operators to target
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
    // Global: apply weaker version to all nodes
    const m = mag * 0.35;
    for (const s of state.sephirot.values()) {
      applyOpToSephirah(s, op.primary, m, bias);
    }
  }

  refreshGlobals(state);

  // Check veil breach
  if (state.veilsEnabled) checkVeils(state);
}

// ── Operator application ──────────────────────────────────────────────────────
function getBias(op: OperatorKind, bias: Partial<Record<OperatorKind, number>>): number {
  return bias[op] ?? 1.0;
}

function applyOpToSephirah(
  s: SephirahState,
  op: OperatorKind,
  mag: number,
  bias: Partial<Record<OperatorKind, number>>,
): void {
  const m = mag * getBias(op, bias);
  switch (op) {
    case 'OPEN_GATE':    s.openness  = clamp(s.openness  + m * 0.5); break;
    case 'CLOSE_GATE':   s.openness  = clamp(s.openness  - m * 0.4); break;
    case 'AMPLIFY':      s.charge    = clamp(s.charge    + m * 0.6);
                         s.coherence = clamp(s.coherence + m * 0.2); break;
    case 'SILENCE':      s.tension   = clamp(s.tension   - m * 0.4);
                         s.charge    = clamp(s.charge    - m * 0.2); break;
    case 'CONVERGE':     s.coherence = clamp(s.coherence + m * 0.5); break;
    case 'DIVERGE':      s.coherence = clamp(s.coherence - m * 0.3);
                         s.tension   = clamp(s.tension   + m * 0.2); break;
    case 'CUT':          s.memory    = clamp(s.memory    - m * 0.6);
                         s.tension   = clamp(s.tension   - m * 0.3); break;
    case 'BALANCE':      s.tension   = clamp(s.tension   - m * 0.4);
                         s.coherence = clamp(s.coherence + m * 0.3); break;
    case 'SHOCK':        s.tension   = clamp(s.tension   + m * 0.5);
                         s.charge    = clamp(s.charge    + m * 0.4); break;
    case 'LOOP':         s.memory    = clamp(s.memory    + m * 0.4); break;
    case 'MEMORY':       s.memory    = clamp(s.memory    + m * 0.5); break;
    case 'STABILIZE':    s.tension   = clamp(s.tension   * (1 - m * 0.3));
                         s.coherence = clamp(s.coherence + m * 0.2); break;
    case 'CLARIFY':      s.coherence = clamp(s.coherence + m * 0.4);
                         s.tension   = clamp(s.tension   - m * 0.3); break;
    case 'REVIEW':       s.memory    = clamp(s.memory    + m * 0.3);
                         s.coherence = clamp(s.coherence + m * 0.2); break;
    case 'INTEGRATE':    s.coherence = clamp(s.coherence + m * 0.5);
                         s.memory    = clamp(s.memory    + m * 0.3);
                         s.tension   = clamp(s.tension   * (1 - m * 0.4)); break;
    case 'SPEED':        s.openness  = clamp(s.openness  + m * 0.3); break;
    case 'SLOW':         s.openness  = clamp(s.openness  - m * 0.2);
                         s.memory    = clamp(s.memory    + m * 0.2); break;
    case 'DELAY':        s.openness  = clamp(s.openness  - m * 0.3);
                         s.memory    = clamp(s.memory    + m * 0.4); break;
    case 'BRIDGE':       s.openness  = clamp(s.openness  + m * 0.4);
                         s.coherence = clamp(s.coherence + m * 0.2); break;
    case 'RITUAL_PULSE': s.charge    = clamp(s.charge    + m * 0.3);
                         s.memory    = clamp(s.memory    + m * 0.2); break;
  }
}

function applyOpToPath(
  p: PathState,
  op: OperatorKind,
  mag: number,
  bias: Partial<Record<OperatorKind, number>>,
): void {
  const m = mag * getBias(op, bias);
  p.recentOps = [...p.recentOps.slice(-2), op];
  switch (op) {
    case 'OPEN_GATE': p.flow     = clamp(p.flow    + m * 0.5);
                      p.blockage = clamp(p.blockage - m * 0.3); break;
    case 'CLOSE_GATE':p.flow     = clamp(p.flow    - m * 0.4); break;
    case 'CUT':       p.blockage = clamp(p.blockage + m * 0.5);
                      p.flow     = clamp(p.flow    - m * 0.4); break;
    case 'AMPLIFY':   p.flow     = clamp(p.flow    + m * 0.6); break;
    case 'DELAY':     p.blockage = clamp(p.blockage + m * 0.4); break;
    case 'SPEED':     p.flow     = clamp(p.flow    + m * 0.6);
                      p.blockage = clamp(p.blockage - m * 0.2); break;
    case 'RITUAL_PULSE': p.pulseAcc = 0; p.flow = clamp(p.flow + m * 0.3); break;
    default:          p.flow     = clamp(p.flow    + m * 0.2); break;
  }
}

// ── Veil check ────────────────────────────────────────────────────────────────
function checkVeils(state: TreeState): void {
  // Veil 1: need globalCoherence > 0.45 for sephirot above Tiphereth
  const aboveTiph: SephirahId[] = ['kether','chokmah','binah','chesed','geburah'];
  for (const id of aboveTiph) {
    const s = state.sephirot.get(id)!;
    if (state.globalCoherence < 0.45 && s.charge > 0.65) {
      s.charge = 0.65; // cap
      emitEvent(state, 'VEIL_BREACH',
        `Veil I: insufficient global coherence (${(state.globalCoherence * 100).toFixed(0)}%) to charge ${id}.`);
    }
  }
  // Veil 2: need globalTension < 0.55 for Kether
  const kether = state.sephirot.get('kether')!;
  if (state.globalTension > 0.55 && kether.charge > 0.50) {
    kether.charge = 0.50;
    emitEvent(state, 'VEIL_BREACH',
      `Veil II: tension too high (${(state.globalTension * 100).toFixed(0)}%) for Kether access.`);
  }
}

function emitEvent(state: TreeState, kind: KabbalahEvent['kind'], description: string): void {
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

// ── Draw a hand from full deck ────────────────────────────────────────────────
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
