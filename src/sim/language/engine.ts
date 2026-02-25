// ─────────────────────────────────────────────────────────────────────────────
// Language Lab – Ink Quanta Engine (Ring Formation Physics)
// Heptapod orbital dynamics: quanta form a ring around a centre, then crystallise
// ─────────────────────────────────────────────────────────────────────────────
import type { InkQuanta, WorldState, WorldSnapshot, Observables, LanguageParams } from './types';
import { computeObservables } from './observables';

const TWO_PI = Math.PI * 2;

// ── Global ring geometry (normalised 0..1 space) ─────────────────────────────
const CX           = 0.5;   // center X
const CY           = 0.5;   // center Y
const RING_OUTER   = 0.280; // primary ring radius
const RING_INNER   = 0.095; // inner ring radius (~20% of quanta)
const RING_SPLAT   = 0.345; // splatter ring (high scribeAffinity quanta)
const WALL_R       = 0.440; // soft boundary (particles pushed back beyond this)
const CORE_R       = 0.030; // inner no-go zone

// ── Deterministic PRNG ────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Ring assignment ───────────────────────────────────────────────────────────
function targetRadius(q: InkQuanta): number {
  if (q.charge < 0.20) return RING_INNER;
  if (q.scribeAffinity > 0.72) return RING_SPLAT + (q.scribeAffinity - 0.72) * 0.15;
  return RING_OUTER;
}

// ── Create world ──────────────────────────────────────────────────────────────
export function createWorld(params: LanguageParams): WorldState {
  const rng = mulberry32(params.seed ^ 0xDEAD1234);
  const n   = params.agentCount;

  const quanta: InkQuanta[] = [];
  for (let i = 0; i < n; i++) {
    const charge         = rng();
    const scribeAffinity = rng();
    const intent         = (rng() - 0.5) * 2;

    // Place near the target ring radius with small scatter
    const tR    = charge < 0.20 ? RING_INNER : scribeAffinity > 0.72 ? RING_SPLAT : RING_OUTER;
    const angle = rng() * TWO_PI;
    const scatter = (rng() - 0.5) * 0.06; // ±3% scatter
    const r     = tR + scatter;
    const x     = CX + Math.cos(angle) * r;
    const y     = CY + Math.sin(angle) * r;

    // Initial velocity: tangential (CCW by default)
    const orbSpeed = 0.006 + rng() * 0.006;
    const orbitDir = intent > 0 ? 1 : -1;
    const vx = -Math.sin(angle) * orbSpeed * orbitDir;
    const vy =  Math.cos(angle) * orbSpeed * orbitDir;

    quanta.push({
      id: i,
      x, y, vx, vy,
      phase:         rng() * TWO_PI,
      phaseVel:      0.5 + rng() * 1.5,
      charge,
      coherence:     rng() * 0.3,
      intent,
      ink:           0.4 + rng() * 0.5,
      scribeAffinity,
    });
  }

  return {
    quanta,
    strokes: [],
    flowGrid: { w: 1, h: 1, vx: new Float32Array(1), vy: new Float32Array(1) }, // unused
    tick: 0,
    time: 0,
    snapshots: [],
    snapshotInterval: 2,
    lastSnapshotTime: 0,
    recentEventCount: 0,
    prevObservables: null,
  };
}

export function resetWorld(state: WorldState, params: LanguageParams): void {
  const fresh = createWorld(params);
  Object.assign(state, fresh);
}

// ── Snapshot ──────────────────────────────────────────────────────────────────
function takeSnapshot(state: WorldState, obs: Observables): void {
  const snap: WorldSnapshot = {
    time: state.time,
    densityGrid: new Float32Array(16 * 16),
    syncIndex: obs.syncIndex,
    coherenceMean: obs.coherenceMean,
    loopCount: obs.loopCount,
    eventRate: obs.eventRate,
  };
  for (const q of state.quanta) {
    const ci = Math.min(15, Math.floor(q.x * 16));
    const cj = Math.min(15, Math.floor(q.y * 16));
    snap.densityGrid[cj * 16 + ci]++;
  }
  state.snapshots.push(snap);
  if (state.snapshots.length > 60) state.snapshots.shift();
  state.lastSnapshotTime = state.time;
}

// ── Main step ─────────────────────────────────────────────────────────────────
export function stepWorld(
  state: WorldState,
  params: LanguageParams,
  dt: number,
  acts: import('./types').GlyphAct[],
): void {
  dt = Math.min(dt, 0.04);
  state.time += dt;
  state.tick++;

  const { quanta } = state;
  const DT60 = dt * 60; // normalise per-tick impulse

  // Tunable strengths (driven by params)
  const kRing    = 0.55 + params.loopThreshold * 0.30; // 0.55–0.85: very strong ring spring
  const kOrbit   = params.dance * 0.007;                // tangential orbital impulse
  const kEntrain = params.entrainment;

  // ── Spatial bucket for entrainment (coarse 16×16) ─────────────────────────
  const GRID = 16;
  const buckets = new Array<InkQuanta[]>(GRID * GRID)
    .fill(null as any).map(() => [] as InkQuanta[]);
  for (const q of quanta) {
    const ci = Math.min(GRID - 1, Math.max(0, Math.floor(q.x * GRID)));
    const cj = Math.min(GRID - 1, Math.max(0, Math.floor(q.y * GRID)));
    buckets[cj * GRID + ci].push(q);
  }

  function getNeighbours(q: InkQuanta, r: number): InkQuanta[] {
    const span = Math.ceil(r * GRID) + 1;
    const ci0 = Math.max(0, Math.floor(q.x * GRID) - span);
    const ci1 = Math.min(GRID - 1, Math.floor(q.x * GRID) + span);
    const cj0 = Math.max(0, Math.floor(q.y * GRID) - span);
    const cj1 = Math.min(GRID - 1, Math.floor(q.y * GRID) + span);
    const out: InkQuanta[] = [];
    for (let cj2 = cj0; cj2 <= cj1; cj2++)
      for (let ci2 = ci0; ci2 <= ci1; ci2++)
        for (const nb of buckets[cj2 * GRID + ci2]) {
          if (nb === q) continue;
          const dx = nb.x - q.x, dy = nb.y - q.y;
          if (dx * dx + dy * dy < r * r) out.push(nb);
        }
    return out;
  }

  // ── Apply active GlyphActs ─────────────────────────────────────────────────
  for (const act of acts) {
    if (act.duration <= 0) continue;
    act.duration -= dt;
    for (const q of quanta) {
      const dx = q.x - act.targetX, dy = q.y - act.targetY;
      const d2 = dx * dx + dy * dy;
      if (d2 > act.radius * act.radius) continue;
      const fac = (1 - Math.sqrt(d2) / act.radius) * act.strength * dt;
      switch (act.kind) {
        case 'CONVERGE':
          q.intent    = Math.max(-1, q.intent    - fac * 3);
          q.coherence = Math.min(1,  q.coherence + fac * 2);
          q.vx -= dx * fac * 4; q.vy -= dy * fac * 4;
          break;
        case 'DIVERGE':
          q.intent    = Math.min(1, q.intent    + fac * 3);
          q.coherence = Math.max(0, q.coherence - fac * 2);
          q.vx += dx * fac * 3; q.vy += dy * fac * 3;
          break;
        case 'SILENCE':
          q.vx *= (1 - fac * 4); q.vy *= (1 - fac * 4);
          q.ink = Math.max(0, q.ink - fac * 2);
          break;
        case 'AMPLIFY':
          q.ink = Math.min(1, q.ink + fac * 3);
          q.scribeAffinity = Math.min(1, q.scribeAffinity + fac * 2);
          break;
        case 'CUT': {
          const dSqrt = Math.sqrt(d2) + 1e-5;
          if (d2 < (act.radius * 0.3) * (act.radius * 0.3)) {
            q.vx += (dx / dSqrt) * fac * 5;
            q.vy += (dy / dSqrt) * fac * 5;
          }
          break;
        }
      }
    }
  }

  // ── Per-quantum physics ────────────────────────────────────────────────────
  for (const q of quanta) {
    // Phase evolution — modulated by dance param for pulsing speed
    q.phase = (q.phase + q.phaseVel * dt * (0.6 + params.dance * 1.4)) % TWO_PI;

    // Radial vector from global center
    const dx   = q.x - CX;
    const dy   = q.y - CY;
    const dist = Math.sqrt(dx * dx + dy * dy) + 1e-7;

    // Multi-harmonic breathing: 3 waves at different frequencies create organic pulsing
    const qAngle  = Math.atan2(dy, dx);
    const breathe = Math.sin(state.time * 1.2 + qAngle * 2) * 0.012
                  + Math.sin(state.time * 0.7 + qAngle * 3 + q.phase) * 0.006
                  + Math.sin(state.time * 2.1 + q.id * 0.3) * 0.004;

    const ux   = dx / dist; // outward radial
    const uy   = dy / dist;
    const tx   = -uy;       // CCW tangential
    const ty   =  ux;

    // A) Ring attraction — softer spring with dance-modulated stiffness
    const tR      = targetRadius(q) + breathe;
    const ringErr = dist - tR;
    const fRing   = -ringErr * kRing * (0.7 + 0.3 * Math.cos(state.time * 0.5 + q.id * 0.1));
    q.vx += ux * fRing * DT60;
    q.vy += uy * fRing * DT60;

    // B) Orbital force — tangential with dance-driven speed variation
    const orbitDir  = q.intent < 0 ? 1.0 : -0.4 + q.scribeAffinity * 0.6;
    const danceWave = 1.0 + Math.sin(state.time * 0.8 + qAngle * 1.5) * params.dance * 0.4;
    const fOrbit    = kOrbit * (0.4 + q.coherence * 0.6) * danceWave;
    q.vx += tx * fOrbit * orbitDir * DT60;
    q.vy += ty * fOrbit * orbitDir * DT60;

    // C) Phase entrainment + ferrofluid neighbor attraction
    const neighbours = getNeighbours(q, 0.10);
    if (neighbours.length > 0) {
      let sinSum = 0, cosSum = 0;
      for (const nb of neighbours) { sinSum += Math.sin(nb.phase); cosSum += Math.cos(nb.phase); }
      const avgPhase = Math.atan2(sinSum / neighbours.length, cosSum / neighbours.length);
      const diff     = avgPhase - q.phase;
      const aligned  = Math.cos(diff);
      q.phase += diff * kEntrain * dt * 0.9;
      q.coherence = Math.min(1, q.coherence + (aligned > 0.55 ? 0.025 : -0.012) * dt * 5);

      // Ferrofluid chain force: same-phase neighbors attract, opposite repel
      for (const nb of neighbours) {
        const ndx = nb.x - q.x, ndy = nb.y - q.y;
        const nd  = Math.sqrt(ndx * ndx + ndy * ndy) + 1e-6;
        const phaseSim = Math.cos(nb.phase - q.phase);
        // Short-range attraction for aligned phases, repulsion for anti-aligned
        const chainF = phaseSim * 0.0008 * (1 + q.coherence) * params.dance;
        if (nd > 0.012 && nd < 0.08) {
          q.vx += (ndx / nd) * chainF * DT60;
          q.vy += (ndy / nd) * chainF * DT60;
        }
        // Short-range separation to avoid overlap
        if (nd < 0.015) {
          q.vx -= (ndx / nd) * 0.0015 * DT60;
          q.vy -= (ndy / nd) * 0.0015 * DT60;
        }
      }
    } else {
      q.coherence = Math.max(0, q.coherence - 0.008 * dt);
    }

    // D) Soft wall — push back if beyond WALL_R
    if (dist > WALL_R) {
      const wallF = (dist - WALL_R) * 0.6;
      q.vx -= ux * wallF * DT60;
      q.vy -= uy * wallF * DT60;
    }

    // E) Inner repulsion — keep out of the core
    if (dist < CORE_R) {
      const coreF = (CORE_R - dist) * 0.5;
      q.vx += ux * coreF * DT60;
      q.vy += uy * coreF * DT60;
    }

    // F) Splatter quanta: occasional radial burst at their phase angle
    if (q.scribeAffinity > 0.78 && dist > tR * 0.85 && Math.sin(q.phase * 3) > 0.85) {
      q.vx += ux * 0.003 * q.scribeAffinity * DT60;
      q.vy += uy * 0.003 * q.scribeAffinity * DT60;
    }

    // G) Velocity cap + damping (slightly less damping → more fluid motion)
    const speed = Math.sqrt(q.vx * q.vx + q.vy * q.vy);
    const maxSpeed = 0.022;
    if (speed > maxSpeed) { q.vx = (q.vx / speed) * maxSpeed; q.vy = (q.vy / speed) * maxSpeed; }
    q.vx *= 0.984; q.vy *= 0.984;

    // H) Integrate position
    q.x = Math.max(0.02, Math.min(0.98, q.x + q.vx * DT60));
    q.y = Math.max(0.02, Math.min(0.98, q.y + q.vy * DT60));

    // I) Ink replenish
    q.ink = Math.min(1, q.ink + 0.025 * dt);
  }

  // ── Snapshot if due ────────────────────────────────────────────────────────
  if (state.time - state.lastSnapshotTime >= state.snapshotInterval) {
    const obs = computeObservables(state, params);
    takeSnapshot(state, obs);
  }
}

// ── Expose ring constants for renderer ────────────────────────────────────────
export const RING_CONSTANTS = { CX, CY, RING_OUTER, RING_INNER, RING_SPLAT, WALL_R };