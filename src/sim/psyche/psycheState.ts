// ── Psyche Lab — State Creation & Spawn ──────────────────────────────────────
import {
  PsycheState, ARCHETYPE_IDS, MAX_QUANTA, MAX_LINKS, FLOW_W, FLOW_H,
  TAG_NONE, defaultPsycheConfig, PsycheConfig,
} from './psycheTypes';

function rng(): number { return Math.random(); }

function spawnQuantum(
  state: PsycheState,
  i: number,
  region: 'id' | 'collective',
): void {
  // ID region: lower center ~ (0, 0.55)
  // COLLECTIVE: lower right ~ (0.4, 0.32)
  let cx: number, cy: number, sigma: number;
  if (region === 'id') {
    cx = 0; cy = 0.55; sigma = 0.20;
  } else {
    cx = 0.38; cy = 0.32; sigma = 0.26;
  }

  // Box-Muller normal distribution
  const u1 = Math.max(1e-6, rng());
  const u2 = rng();
  const nx = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const ny = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

  let px = cx + nx * sigma;
  let py = cy + ny * sigma;

  // Clamp to the boundary circle (radius 0.88) rather than an axis-aligned box
  // so no particle ever starts outside sampleFlowField's safe range.
  const r = Math.sqrt(px * px + py * py);
  const maxR = 0.88;
  if (r > maxR) {
    px = px * (maxR / r);
    py = py * (maxR / r);
  }

  state.x[i]         = px;
  state.y[i]         = py;
  state.vx[i]        = (rng() - 0.5) * 0.06;
  state.vy[i]        = (rng() - 0.5) * 0.06;
  state.charge[i]    = region === 'id' ? 0.55 + rng() * 0.35 : 0.30 + rng() * 0.40;
  state.valence[i]   = (rng() - 0.5) * (region === 'id' ? 0.8 : 0.6);
  state.coherence[i] = region === 'collective' ? 0.30 + rng() * 0.30 : 0.10 + rng() * 0.20;
  state.arousal[i]   = region === 'id' ? 0.5 + rng() * 0.4 : 0.2 + rng() * 0.4;
  state.inhibition[i]= 0.1 + rng() * 0.2;
  state.tag[i]       = TAG_NONE;
  state.tagAge[i]    = 0;
  state.age[i]       = rng() * 10; // stagger ages so they don't all die at once
  // soulHue: permanent identity, never reset even on recycle.
  // Only assign if still 0 (uninitialized) so recycled particles keep their soul.
  if (state.soulHue[i] === 0) {
    state.soulHue[i] = rng() * 360;
  }
}

export function createPsycheState(count: number): PsycheState {
  const n = Math.min(count, MAX_QUANTA);
  const state: PsycheState = {
    count: n,
    x:          new Float32Array(MAX_QUANTA),
    y:          new Float32Array(MAX_QUANTA),
    vx:         new Float32Array(MAX_QUANTA),
    vy:         new Float32Array(MAX_QUANTA),
    charge:     new Float32Array(MAX_QUANTA),
    valence:    new Float32Array(MAX_QUANTA),
    coherence:  new Float32Array(MAX_QUANTA),
    arousal:    new Float32Array(MAX_QUANTA),
    inhibition: new Float32Array(MAX_QUANTA),
    tag:        new Uint8Array(MAX_QUANTA),
    tagAge:     new Float32Array(MAX_QUANTA),
    age:        new Float32Array(MAX_QUANTA),
    soulHue:    new Float32Array(MAX_QUANTA), // 0 = uninitialized (assigned at first spawn)

    flowU: new Float32Array(FLOW_W * FLOW_H),
    flowV: new Float32Array(FLOW_W * FLOW_H),

    linkA:     new Int32Array(MAX_LINKS).fill(-1),
    linkB:     new Int32Array(MAX_LINKS).fill(-1),
    linkTtl:   new Float32Array(MAX_LINKS),
    linkCount: 0,

    archetypeActive:   ARCHETYPE_IDS.map(() => true),
    archetypeStrength: ARCHETYPE_IDS.map(() => 0.5),

    breathT:    0,
    breathPhase:0,
    tick:       0,
    elapsed:    0,

    integrationIndex:   0.5,
    tensionIndex:       0.3,
    fragmentationIndex: 0.4,
    phase:              'CALM',

    events: [],

    journeyActive: false,
    journeyAct:    0,
    journeyActT:   0,
    journeyDone:   false,
  };

  // Spawn: 60% in ID, 40% in Collective
  const idCount = Math.floor(n * 0.60);
  for (let i = 0; i < idCount; i++)        spawnQuantum(state, i, 'id');
  for (let i = idCount; i < n; i++)         spawnQuantum(state, i, 'collective');

  return state;
}

export function recycleQuantum(state: PsycheState, i: number): void {
  // Re-use slot i — 60/40 split
  spawnQuantum(state, i, Math.random() < 0.60 ? 'id' : 'collective');
}

export function resizeQuantaTo(
  state: PsycheState,
  targetCount: number,
  config: PsycheConfig,
): void {
  const n = Math.min(targetCount, MAX_QUANTA);
  if (n > state.count) {
    for (let i = state.count; i < n; i++) {
      spawnQuantum(state, i, i < state.count + (n - state.count) * 0.6 ? 'id' : 'collective');
    }
  }
  state.count = n;
  config.quantaTarget = n;
}