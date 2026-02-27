// ─── Sociogenesis Study Mode — Engine ────────────────────────────────────────
// Two clocks:
//   microTick (every frame)  — kinematics: separation + goal-steer + friction
//   macroTick (every ~1s)    — social decisions + field updates + psychology
//
// Theory: symbols write into fields (N/L/R), fields modulate psychology
// (belief/fear/desire), psychology drives goals, goals drive movement.

import type {
  StudyAgent, StudyConfig, StudyMetrics, StudyWorldState, StudySpawnLayout,
  StudySymbols, StudyEvent, StudyPing, Encounter,
  StudyTotem, StudyTabu, StudyRitual,
} from './studyTypes';
import { GROUP_COLORS } from './studyTypes';
import { computeArchetypeKey } from './studyArchetypes';
import {
  type SocialFields, type SocialFieldConfig,
  sampleN, sampleL, sampleR,
  depositN, depositL, depositR,
  stepAllFields,
} from './socialFields';

// ── Spatial Grid ──────────────────────────────────────────────────────────────
export type Grid = Map<number, number[]>;

function buildGrid(agents: StudyAgent[], cellSize: number): Grid {
  const grid: Grid = new Map();
  for (let i = 0; i < agents.length; i++) {
    const gx = ((agents[i].x + 1.0) / cellSize) | 0;
    const gy = ((agents[i].y + 1.0) / cellSize) | 0;
    const key = gx * 1024 + gy;
    let cell = grid.get(key);
    if (!cell) { cell = []; grid.set(key, cell); }
    cell.push(i);
  }
  return grid;
}

function getNeighbors(
  idx: number, agents: StudyAgent[], grid: Grid,
  rMax: number, cellSize: number, maxN: number,
): number[] {
  const a = agents[idx];
  const gx = ((a.x + 1.0) / cellSize) | 0;
  const gy = ((a.y + 1.0) / cellSize) | 0;
  const r2 = rMax * rMax;
  const result: number[] = [];
  outer: for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      const cell = grid.get((gx + dx) * 1024 + (gy + dy));
      if (!cell) continue;
      for (const j of cell) {
        if (j === idx) continue;
        const ddx = agents[j].x - a.x;
        const ddy = agents[j].y - a.y;
        if (ddx * ddx + ddy * ddy < r2) {
          result.push(j);
          if (result.length >= maxN) break outer;
        }
      }
    }
  }
  return result;
}

// ── 1. Spawn ─────────────────────────────────────────────────────────────────
export function spawnStudyAgents(cfg: StudyConfig, rng: () => number, layout: StudySpawnLayout): StudyAgent[] {
  const { agentCount, groupCount } = cfg;
  const agents: StudyAgent[] = [];

  const clampPos = (v: number) => Math.max(-0.95, Math.min(0.95, v));

  const centers: [number, number][] = [];
  if (layout === 'unified_center') {
    for (let g = 0; g < groupCount; g++) centers.push([0, 0]);
  } else if (layout === 'corners') {
    const pts: [number, number][] = [
      [-0.68, -0.68], [0.68, -0.68], [0.68, 0.68], [-0.68, 0.68],
      [0, -0.78], [0.78, 0], [0, 0.78], [-0.78, 0],
    ];
    for (let g = 0; g < groupCount; g++) centers.push(pts[g % pts.length]);
  } else {
    // default: separated clusters on a ring
    for (let g = 0; g < groupCount; g++) {
      const angle = (g / groupCount) * Math.PI * 2 - Math.PI / 2;
      centers.push([Math.cos(angle) * 0.52, Math.sin(angle) * 0.52]);
    }
  }

  for (let i = 0; i < agentCount; i++) {
    const g = i % groupCount;
    const [cx, cy] = centers[g] ?? [0, 0];
    const angle = rng() * Math.PI * 2;
    const r = rng() * 0.17 + 0.02;
    const groupOp = (g / Math.max(groupCount - 1, 1)) * 2 - 1;
    const ideology = Math.max(-1, Math.min(1, groupOp + (rng() - 0.5) * 0.6));

    let px = cx + Math.cos(angle) * r;
    let py = cy + Math.sin(angle) * r;

    if (layout === 'ring') {
      const sectorAngle = (g / Math.max(groupCount, 1)) * Math.PI * 2 - Math.PI / 2;
      const spread = (Math.PI * 2) / Math.max(groupCount, 1) * 0.8;
      const a2 = sectorAngle + (rng() - 0.5) * spread;
      const rr = 0.55 + (rng() - 0.5) * 0.22;
      px = Math.cos(a2) * rr;
      py = Math.sin(a2) * rr;
    } else if (layout === 'line') {
      const band = g / Math.max(groupCount - 1, 1);
      const along = rng();
      const across = (rng() - 0.5) * 0.28;
      px = (along - 0.5) * 1.6 + across;
      py = (band - 0.5) * 1.6 + (along - 0.5) * 0.4 + (rng() - 0.5) * 0.12;
    } else if (layout === 'random') {
      px = (rng() - 0.5) * 1.8;
      py = (rng() - 0.5) * 1.8;
    }

    // ── Archetype seeding: inject rich trait diversity so emergences vary ──────
    // ~12% of population gets a "proto-archetype" boost making them clearly different
    // from the start. This prevents the visual homogeneity trap.
    const roll = rng();
    const isProtoLeader    = roll < 0.10;                          // 10%
    const isProtoRebel     = !isProtoLeader && roll < 0.20;        // 10%
    const isProtoPriest    = !isProtoRebel  && roll < 0.30;        // 10%
    const isProtoAggressor = !isProtoPriest && roll < 0.38;        // 8%

    const baseBelief  = isProtoPriest    ? 0.65 + rng() * 0.28 :
                        isProtoAggressor ? 0.15 + rng() * 0.20 :
                        0.18 + rng() * 0.55;
    const baseFear    = isProtoRebel     ? 0.05 + rng() * 0.12 :
                        isProtoAggressor ? 0.08 + rng() * 0.20 :
                        isProtoLeader    ? 0.05 + rng() * 0.14 :
                        0.05 + rng() * 0.55;
    const baseDesire  = isProtoRebel     ? 0.55 + rng() * 0.40 :
                        isProtoLeader    ? 0.30 + rng() * 0.35 :
                        0.10 + rng() * 0.65;
    const baseStatus  = isProtoLeader    ? 0.25 + rng() * 0.35 :
                        isProtoPriest    ? 0.18 + rng() * 0.22 :
                        0.02 + rng() * 0.12;
    const baseAgg     = isProtoAggressor ? 0.55 + rng() * 0.35 :
                        isProtoRebel     ? 0.22 + rng() * 0.30 :
                        isProtoLeader    ? 0.08 + rng() * 0.20 :
                        0.05 + rng() * 0.40;
    const baseCharisma = isProtoLeader   ? 0.45 + rng() * 0.45 :
                         isProtoPriest   ? 0.35 + rng() * 0.35 :
                         rng() * 0.30 + 0.04;
    const baseResist   = isProtoRebel    ? 0.45 + rng() * 0.50 :
                         isProtoAggressor ? 0.20 + rng() * 0.30 :
                         0.05 + rng() * 0.30;

    const a: StudyAgent = {
      x: clampPos(px),
      y: clampPos(py),
      vx: (rng() - 0.5) * 0.07,
      vy: (rng() - 0.5) * 0.07,
      groupId: g,
      opinion: ideology,
      trust:      Math.max(0, Math.min(1, cfg.trustBase      + (rng() - 0.5) * 0.35)),
      aggression: Math.max(0, Math.min(1, baseAgg)),
      need:       Math.max(0, Math.min(1, cfg.needBase        + (rng() - 0.5) * 0.30)),
      goalX: cx, goalY: cy,
      memory: [], centrality: 0, hostileCount: 0,
      belief:   Math.max(0, Math.min(1, baseBelief)),
      fear:     Math.max(0, Math.min(1, baseFear)),
      desire:   Math.max(0, Math.min(1, baseDesire)),
      status:   Math.max(0, Math.min(1, baseStatus)),
      wealth:   0.12 + rng() * 0.30,
      ideology,
      fatigue:  0.03 + rng() * 0.07,
      conformity:   Math.max(0, Math.min(1, (isProtoPriest ? 0.60 : isProtoRebel ? 0.08 : cfg.conformity) + (rng() - 0.5) * 0.30)),
      empathy:      Math.max(0, Math.min(1, cfg.empathy + (rng() - 0.5) * 0.30)),
      charisma:     Math.max(0, Math.min(1, baseCharisma)),
      groupLoyalty: isProtoRebel ? 0.12 + rng() * 0.22 : 0.35 + rng() * 0.55,
      memeId:       g,
      visibility:   0,
      resistance:   Math.max(0, Math.min(1, baseResist)),
      trailX:       new Float32Array(15).fill(clampPos(px)),
      trailY:       new Float32Array(15).fill(clampPos(py)),
      trailIdx:     0,
      lastGroupChange: 0,
      archKeyMoment: 0,
      archKeyStable: 0,
      archKeyCandidate: 0,
      archCandidateAt: 0,
      archStableAt: 0,
      // Morin dimensions
      perception: 0.40 + rng() * 0.45,
      hybris: isProtoLeader ? 0.15 + rng() * 0.20 : 0.02 + rng() * 0.08,
      fervor: isProtoPriest ? 0.12 + rng() * 0.15 : 0.01 + rng() * 0.05,
      ethics: 0.02 + rng() * 0.10,
      understanding: 0.02 + rng() * 0.08,
      ecoFootprint: 0,
    };
    const k = computeArchetypeKey(a);
    a.archKeyMoment = k;
    a.archKeyStable = k;
    a.archKeyCandidate = k;
    agents.push(a);
  }
  return agents;
}

// ── 2. microTick — kinematics only ────────────────────────────────────────────
// Visual agent radius (world) ≈ 0.030 * (0.72 + status*0.72) → 0.022..0.043
// Separation envelope matches visual radius tightly so agents touch but don't
// form a rigid lattice.
const SEP_BASE   = 0.014;
const SEP_STATUS = 0.012;  // extra radius per unit of status
const SEP_FORCE  = 1.2;    // soft push — allows brief overlap during fast moves
const SEP_HARD   = 0.20;   // very gentle projection — only resolves deep overlap
const SEP_CELL   = 0.08;   // spatial grid cell size

function agentSepR(a: StudyAgent): number {
  return SEP_BASE + a.status * SEP_STATUS;
}

export function buildMicroGrid(agents: StudyAgent[]): Grid {
  return buildGrid(agents, SEP_CELL);
}

export function microTick(agents: StudyAgent[], grid: Grid, cfg: StudyConfig, ws: StudyWorldState, dt: number): void {
  const { friction, speed, autonomy } = cfg;
  const cellSize = SEP_CELL;

  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const aR = agentSepR(a);
    let fx = 0, fy = 0;
    
    // Boids accumulators
    let alignX = 0, alignY = 0, alignN = 0;
    let cohX = 0, cohY = 0, cohN = 0;

    // Separation & Boids
    const gx = ((a.x + 1.0) / cellSize) | 0;
    const gy = ((a.y + 1.0) / cellSize) | 0;
    for (let dx2 = -1; dx2 <= 1; dx2++) {
      for (let dy2 = -1; dy2 <= 1; dy2++) {
        const cell = grid.get((gx + dx2) * 1024 + (gy + dy2));
        if (!cell) continue;
        for (const j of cell) {
          if (j === i) continue;
          const b = agents[j];
          const bR = agentSepR(b);
          const combinedR = aR + bR;
          const nx = a.x - b.x;
          const ny = a.y - b.y;
          const d2 = nx * nx + ny * ny;
          
          if (d2 < combinedR * combinedR && d2 > 1e-9) {
            const d = Math.sqrt(d2);
            const overlap = combinedR - d;
            const push = (overlap / combinedR);
            const f = push * push * SEP_FORCE;
            fx += (nx / d) * f;
            fy += (ny / d) * f;
          }
          
          // Boids (Alignment & Cohesion) — applied to nearby in-group members
          const boidsR2 = combinedR * combinedR * 4;
          if (b.groupId === a.groupId && d2 < boidsR2) {
            alignX += b.vx; alignY += b.vy; alignN++;
            cohX += b.x; cohY += b.y; cohN++;
          }
        }
      }
    }
    
    // Apply Boids
    if (alignN > 0) {
      alignX /= alignN; alignY /= alignN;
      fx += (alignX - a.vx) * cfg.boidsAlignment * 1.5;
      fy += (alignY - a.vy) * cfg.boidsAlignment * 1.5;
    }
    if (cohN > 0) {
      cohX /= cohN; cohY /= cohN;
      const dx = cohX - a.x; const dy = cohY - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
      fx += (dx / d) * cfg.boidsCohesion * 1.2;
      fy += (dy / d) * cfg.boidsCohesion * 1.2;
    }

    // Goal steering (with overshoot + zigzag for non-linearity)
    const gdx0 = a.goalX - a.x;
    const gdy0 = a.goalY - a.y;
    const gd0  = Math.sqrt(gdx0 * gdx0 + gdy0 * gdy0) + 0.001;
    const og   = Math.max(0, cfg.goalOvershoot || 0);
    const gdx  = gdx0 * (1 + og);
    const gdy  = gdy0 * (1 + og);
    const gd   = Math.sqrt(gdx * gdx + gdy * gdy) + 0.001;
    const steer = Math.min(gd / 0.5, 1.0);
    // Fear modulates speed: fearful agents move faster toward safety
    const fearBoost = 1 + a.fear * 0.6;
    fx += (gdx / gd) * autonomy * speed * 2.2 * steer * fearBoost;
    fy += (gdy / gd) * autonomy * speed * 2.2 * steer * fearBoost;

    // Zigzag (perpendicular drift while steering) → "vai e volta" feel
    const zz = Math.max(0, cfg.zigzag || 0);
    if (zz > 0.001) {
      const px = -gdy / gd;
      const py =  gdx / gd;
      const z  = randSigned(ws) * zz * speed * 1.35 * (0.6 + steer * 0.8);
      fx += px * z;
      fy += py * z;
    }

    // Wander (small stochastic micro-forces) → less linear, more human
    const w = Math.max(0, cfg.wander || 0);
    if (w > 0.001) {
      fx += randSigned(ws) * w * speed * 1.55;
      fy += randSigned(ws) * w * speed * 1.55;
    }

    // Impulses (rare kicks) → sudden non-linear changes of direction
    const ir = Math.max(0, cfg.impulseRate || 0);
    const is = Math.max(0, cfg.impulseStrength || 0);
    if (ir > 0.001 && is > 0.001 && rand01(ws) < ir * dt) {
      const kick = (0.35 + 0.65 * rand01(ws)) * is * speed * 2.2;
      // Prefer sideways / backtracking, not always forward
      const px = -gdy0 / gd0;
      const py =  gdx0 / gd0;
      const sgn = rand01(ws) < 0.5 ? -1 : 1;
      a.vx += px * kick * sgn - a.vx * (0.15 + 0.25 * is);
      a.vy += py * kick * sgn - a.vy * (0.15 + 0.25 * is);
    }

    a.vx = (a.vx + fx * dt) * friction;
    a.vy = (a.vy + fy * dt) * friction;
    const spd = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
    if (spd > speed * 1.4) { const inv = speed * 1.4 / spd; a.vx *= inv; a.vy *= inv; }

    a.x += a.vx * dt;
    a.y += a.vy * dt;

    if (a.x < -0.97) { a.x = -0.97; a.vx =  Math.abs(a.vx) * 0.4; }
    if (a.x >  0.97) { a.x =  0.97; a.vx = -Math.abs(a.vx) * 0.4; }
    if (a.y < -0.97) { a.y = -0.97; a.vy =  Math.abs(a.vy) * 0.4; }
    if (a.y >  0.97) { a.y =  0.97; a.vy = -Math.abs(a.vy) * 0.4; }
    
    a.trailX[a.trailIdx] = a.x;
    a.trailY[a.trailIdx] = a.y;
    a.trailIdx = (a.trailIdx + 1) % 15;
  }

  // Hard projection pass: directly push apart any still-overlapping agents
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const aR = agentSepR(a);
    const gx = ((a.x + 1.0) / cellSize) | 0;
    const gy = ((a.y + 1.0) / cellSize) | 0;
    for (let dx2 = -1; dx2 <= 1; dx2++) {
      for (let dy2 = -1; dy2 <= 1; dy2++) {
        const cell = grid.get((gx + dx2) * 1024 + (gy + dy2));
        if (!cell) continue;
        for (const j of cell) {
          if (j <= i) continue;
          const b = agents[j];
          const bR = agentSepR(b);
          const combinedR = aR + bR;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < combinedR * combinedR && d2 > 1e-12) {
            const d = Math.sqrt(d2);
            const overlap = (combinedR - d) * SEP_HARD;
            const invD = 1 / d;
            const halfPush = overlap * 0.5;
            a.x += dx * invD * halfPush;
            a.y += dy * invD * halfPush;
            b.x -= dx * invD * halfPush;
            b.y -= dy * invD * halfPush;
          }
        }
      }
    }
  }
}

// ── 3. macroTick — social decisions ──────────────────────────────────────────
const MAX_NEIGH  = 12;
const MEMORY_CAP = 3;

function rand01(ws: StudyWorldState): number {
  // LCG (Numerical Recipes). Deterministic per seed via ws.rngState.
  ws.rngState = (Math.imul(ws.rngState >>> 0, 1664525) + 1013904223) >>> 0;
  return ws.rngState / 4294967296;
}

function randSigned(ws: StudyWorldState): number {
  return rand01(ws) - 0.5;
}

export function macroTick(
  agents:    StudyAgent[],
  cfg:       StudyConfig,
  symbols:   StudySymbols,
  fields:    SocialFields,
  fieldCfg:  SocialFieldConfig,
  ws:        StudyWorldState,  // mutated in place
  t:         number,
  dt:        number,          // seconds since last macroTick
  pings:     StudyPing[],
): StudyEvent[] {
  const events: StudyEvent[] = [];

  // 1. Step fields (decay + diffusion)
  stepAllFields(fields, fieldCfg, dt);

  // 2. Symbol → field deposits
  _depositSymbols(symbols, fields, ws, t, dt, pings, events);

  // 3. Build neighbor grid
  const grid = buildGrid(agents, cfg.rMax * 1.1);

  // 4. Group centroids
  const centroids = _buildCentroids(agents, cfg.groupCount);
  const gcx = agents.reduce((s, a) => s + a.x, 0) / (agents.length || 1);
  const gcy = agents.reduce((s, a) => s + a.y, 0) / (agents.length || 1);

  // 5. Snapshot pre-update metrics (phase transition detection)
  const prevMetrics = computeStudyMetrics(agents, cfg);

  // 6. Per-agent update
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const neighbors = getNeighbors(i, agents, grid, cfg.rMax, cfg.rMax * 1.1, MAX_NEIGH);

    // Sample fields at agent position
    const n = sampleN(fields, a.x, a.y);
    const l = sampleL(fields, a.x, a.y);
    const r = sampleR(fields, a.x, a.y);

    // ── Foucault: Surveillance & Resistance ────────────────────────────────
    a.visibility = 0;
    for (const totem of symbols.totems) {
      if (totem.kind === 'PANOPTICON') {
        const dx = totem.x - a.x; const dy = totem.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < totem.radius * totem.radius) {
          const d = Math.sqrt(d2);
          a.visibility = Math.max(a.visibility, 1 - (d / totem.radius));
        }
      }
    }
    
    const surveillancePressure = a.visibility * cfg.panopticism;
    if (surveillancePressure > 0) {
      a.fear = clamp(a.fear + surveillancePressure * 0.1 * dt, 0, 1);
      a.conformity = clamp(a.conformity + surveillancePressure * 0.05 * dt, 0, 1);
      if (a.ideology > 0 && a.desire > 0.5) {
        a.resistance = clamp(a.resistance + surveillancePressure * 0.15 * dt, 0, 1);
      }
    } else {
      a.resistance = clamp(a.resistance - 0.02 * dt, 0, 1);
    }

    // Micro-power resistance effects
    if (a.resistance > 0.8) {
      a.conformity = clamp(a.conformity - 0.1 * dt, 0, 1);
      a.aggression = clamp(a.aggression + 0.05 * dt, 0, 1);
      a.belief = clamp(a.belief - 0.1 * dt, 0, 1);
      // Rebels try to pull away from the panopticon
    }

    // ── Morin: Percepção falível (blindness of knowledge) ─────────────────
    // Perception drifts slowly; distortion only nudges it, never dominates.
    const percBias = cfg.perceptionBias;
    const distortionPressure = Math.abs(a.ideology) * 0.3 + a.fear * 0.2 + a.hybris * 0.4;
    a.perception = clamp(
      a.perception + (0.025 - distortionPressure * percBias * 0.015) * dt,
      0.40, 1,
    );
    // Perceived fields: light blend (20% max distortion) to preserve diversity
    const distort = (1 - a.perception) * 0.5;
    const pN = n * (1 - distort) + distort * (a.belief * 0.4 + 0.3);
    const pL = l * (1 - distort) + distort * (a.status * 0.3 + 0.2);
    const pR = r * (1 - distort) + distort * (a.wealth * 0.3 + 0.3);

    // ── Psychology update (uses perceived fields — mostly faithful to reality) ─
    const beliefDelta = (cfg.kBelief * pN * (1 - a.desire * 0.7) - 0.05 * a.desire) * dt;
    a.belief = clamp(a.belief + beliefDelta, 0, 1);

    const fearFromN      = cfg.kFear * pN * (1 - a.belief * 0.8);
    const fearFromConflict = 0.12 * (a.hostileCount / 3);
    const fearFromL      = -0.15 * pL * a.belief;
    a.fear = clamp(a.fear + (fearFromN + fearFromConflict + fearFromL) * dt - 0.08 * dt, 0, 1);

    const desireDelta = (cfg.kDesire * (1 - pN) * 0.7 + 0.1 * (1 - a.wealth)) * dt - 0.06 * dt;
    a.desire = clamp(a.desire + desireDelta, 0, 1);

    // wealth: harvest R, minus maintenance
    const gain = cfg.harvestRate * r * dt;
    a.wealth = clamp(a.wealth + gain - cfg.decayWealth * dt, 0, 1);
    if (gain > 0.001) {
      depositR(fields, a.x, a.y, -gain * 0.6, 0.08);
      // Morin: auto-eco-organização — overextraction causes permanent damage
      a.ecoFootprint = clamp(a.ecoFootprint + gain * cfg.ecoDegradation * 0.3, 0, 1);
      if (a.ecoFootprint > 0.5) {
        depositR(fields, a.x, a.y, -a.ecoFootprint * 0.003 * dt, 0.12);
      }
    }

    // status: cumulative advantage (wealth + L proximity + influence)
    const nearTotemL = l;
    const statusGain = (0.08 * a.centrality + 0.05 * a.wealth * nearTotemL + 0.03 * l) * dt;
    a.status = clamp(a.status * (1 - 0.015 * dt) + statusGain, 0, 1);

    // ── Morin: Hybris (blindness of power) ─────────────────────────────
    // Unchecked high-status agents grow overconfident, which degrades perception
    // and increases aggression — the tyrant's trap.
    if (a.status > cfg.hybrisThreshold) {
      const hybrisGrowth = (a.status - cfg.hybrisThreshold) * 0.08 * (1 - a.ethics * 0.6) * dt;
      a.hybris = clamp(a.hybris + hybrisGrowth, 0, 1);
    } else {
      a.hybris = clamp(a.hybris - 0.03 * dt, 0, 1);
    }
    if (a.hybris > 0.4) {
      a.aggression = clamp(a.aggression + a.hybris * 0.04 * dt, 0, 1);
      a.trust = clamp(a.trust - a.hybris * 0.03 * dt, 0, 1);
    }

    // ── Morin: Fervor — Homo sapiens-demens ─────────────────────────────
    // When belief + fear exceed threshold, the agent enters demens state:
    // rational judgment collapses, conformity spikes, aggression can surge.
    const sapiensDemensSum = a.belief + a.fear;
    if (sapiensDemensSum > cfg.fervorThreshold) {
      const fervorGrowth = (sapiensDemensSum - cfg.fervorThreshold) * 0.12 * dt;
      a.fervor = clamp(a.fervor + fervorGrowth, 0, 1);
    } else {
      a.fervor = clamp(a.fervor - 0.06 * dt, 0, 1);
    }
    if (a.fervor > 0.5) {
      a.conformity = clamp(a.conformity + a.fervor * 0.03 * dt, 0, 1);
      a.perception = clamp(a.perception - a.fervor * 0.02 * dt, 0.40, 1);
      if (rand01(ws) < a.fervor * 0.02) {
        a.aggression = clamp(a.aggression + 0.08, 0, 1);
      }
    }

    // ideology contágio: weighted by neighbor status
    let ideologySum = 0, ideologyW = 0;
    for (const j of neighbors) {
      const b = agents[j];
      const wt = b.status + 0.1;
      ideologySum += b.ideology * wt;
      ideologyW   += wt;
    }
    if (ideologyW > 0) {
      const idealPull = ideologySum / ideologyW - a.ideology;
      a.ideology = clamp(a.ideology + idealPull * cfg.ideologyPressure * dt, -1, 1);
    }
    // Keep opinion in sync with ideology
    a.opinion = a.ideology;

    // fatigue: rises with conflict and ritual presence, falls in R-rich zones
    const inRitual = symbols.rituals.some(r2 =>
      (a.x - r2.x) ** 2 + (a.y - r2.y) ** 2 < r2.radius ** 2
    ) ? 1 : 0;
    const fatigueDelta = (0.08 * (a.hostileCount / 3) + 0.04 * inRitual - 0.06 * r) * dt;
    a.fatigue = clamp(a.fatigue + fatigueDelta, 0, 1);

    // ── Conformity pressure ────────────────────────────────────────────────
    // Agent adjusts belief toward local N field proportional to conformity
    const confPull = cfg.conformity * a.conformity * (n - a.belief) * 0.15;
    a.belief = clamp(a.belief + confPull * dt, 0, 1);

    // ── Cultural inertia dampens ideology change ───────────────────────────
    const inertiaFactor = 1.0 - cfg.culturalInertia * 0.7;

    // ── Neighbor analysis ──────────────────────────────────────────────────
    a.hostileCount = 0;
    let inGroupCount = 0, opSum = a.opinion, opN = 1;
    let inGroupCx = a.x, inGroupCy = a.y;
    let centralN = 0;
    let empFear = 0, empDesire = 0, empBelief = 0, empN2 = 0;
    let coercion = 0;   // coercive authority pressure from nearby high-status actors
    let legit = 0;      // legitimating authority pressure (belief/status/charisma)

    for (const j of neighbors) {
      const b = agents[j];
      centralN++;

      // ── Authority channels (local micro-power) ──
      // Model: high-status + charisma amplifies both coercion and legitimation.
      const bPower = (0.35 + b.centrality * 0.65) * b.status * (0.55 + b.charisma);
      const bDictatorLike =
        b.status > 0.72 &&
        b.centrality > 0.28 &&
        b.aggression > 0.62 &&
        b.belief > 0.55 &&
        b.ideology < -0.15;
      const bPriestLike = b.belief > 0.70 && b.status > 0.45 && b.charisma > 0.4 && b.aggression < 0.55;

      if (bDictatorLike) {
        coercion += bPower * (0.9 + b.aggression * 0.6);
      } else {
        // Generic coercion is mostly aggression + order-leaning ideology
        coercion += bPower * b.aggression * (b.ideology < -0.15 ? 0.85 : 0.45);
      }

      if (bPriestLike) {
        legit += bPower * 1.05;
      } else {
        // Generic legitimation is belief + status, stronger for order-leaning ideologies
        legit += bPower * b.belief * (b.ideology < -0.15 ? 0.85 : 0.55);
      }

      if (b.groupId === a.groupId) {
        inGroupCount++;
        const influenceW = 1 + (cfg.hierarchyStrength * b.status * b.charisma);
        opSum += b.opinion * b.trust * influenceW;
        opN += influenceW;
        inGroupCx += b.x; inGroupCy += b.y;
        addMem(a, j, true, t);
      } else {
        const hostile = b.aggression > 0.5 || a.aggression > 0.5;
        if (hostile) {
          a.hostileCount++;
          addMem(a, j, false, t);
        } else {
          const influenceW = 0.1 + cfg.hierarchyStrength * b.status * 0.3;
          opSum += b.opinion * influenceW;
          opN += influenceW;
          addMem(a, j, true, t);
        }
      }
      // Empathy: accumulate emotional states from ALL neighbors
      const empW = a.empathy * cfg.empathy;
      empFear += b.fear * empW;
      empDesire += b.desire * empW;
      empBelief += b.belief * empW;
      empN2++;
    }
    a.centrality = Math.min(1, centralN / MAX_NEIGH);

    // ── Local authority effects (separate from fields) ─────────────────────
    if (centralN > 0) {
      const invN = 1 / centralN;
      const coercionLevel = Math.max(0, Math.min(1, coercion * invN));
      const legitLevel    = Math.max(0, Math.min(1, legit * invN));

      // Coercion mostly increases fear/conformity (muted by resistance)
      const resistShield = 1 - a.resistance * 0.65;
      a.fear = clamp(a.fear + coercionLevel * 0.10 * dt * resistShield, 0, 1);
      a.conformity = clamp(a.conformity + coercionLevel * 0.06 * dt * resistShield, 0, 1);

      // Legitimation increases belief and lowers fear for believers (muted by desire)
      const desireNoise = 1 - a.desire * 0.55;
      a.belief = clamp(a.belief + legitLevel * 0.08 * dt * desireNoise, 0, 1);
      a.fear = clamp(a.fear - legitLevel * a.belief * 0.05 * dt, 0, 1);
    }

    // ── Empathy contagion (gentle — preserves individual variation) ──────
    if (empN2 > 0) {
      const empScale = 0.025 * dt;
      a.fear   = clamp(a.fear   + (empFear / empN2 - a.fear)   * empScale, 0, 1);
      a.desire = clamp(a.desire + (empDesire / empN2 - a.desire) * empScale, 0, 1);
      a.belief = clamp(a.belief + (empBelief / empN2 - a.belief) * empScale * 0.4, 0, 1);
    }

    // ── Morin: Understanding (compreensão) ──────────────────────────────
    // Grows from repeated peaceful cross-group encounters. Reduces hostility.
    const crossFriendlyMem = a.memory.filter(m =>
      m.agentIdx < agents.length && agents[m.agentIdx].groupId !== a.groupId && m.friendly
    ).length;
    if (crossFriendlyMem >= 2) {
      a.understanding = clamp(a.understanding + cfg.understandingGrowth * 0.05 * dt, 0, 1);
    } else {
      a.understanding = clamp(a.understanding - 0.01 * dt, 0, 1);
    }
    if (a.understanding > 0.3) {
      a.aggression = clamp(a.aggression - a.understanding * 0.04 * dt, 0, 1);
      a.empathy = clamp(a.empathy + a.understanding * 0.02 * dt, 0, 1);
    }

    // ── Morin: Ética emergente (anthropo-ethics) ────────────────────────
    // Ethics emerge from the combination of understanding + diverse encounters
    // + self-limitation. High ethics reduce hybris and increase cooperation.
    if (a.understanding > 0.25 && crossFriendlyMem >= 1) {
      const ethicsRise = cfg.ethicsGrowth * a.understanding * 0.04 * dt;
      a.ethics = clamp(a.ethics + ethicsRise, 0, 1);
    }
    a.ethics = clamp(a.ethics - 0.008 * dt, 0, 1); // slow decay without reinforcement
    if (a.ethics > 0.4) {
      a.hybris = clamp(a.hybris - a.ethics * 0.05 * dt, 0, 1);
      a.aggression = clamp(a.aggression - a.ethics * 0.03 * dt, 0, 1);
    }

    // ── Meme contagion ─────────────────────────────────────────────────────
    if (cfg.contagion > 0 && neighbors.length > 0) {
      const memeCounts: number[] = [];
      for (const j of neighbors) {
        const bm = agents[j].memeId;
        memeCounts[bm] = (memeCounts[bm] || 0) + 1 + agents[j].charisma * cfg.hierarchyStrength;
      }
      let bestMeme = a.memeId, bestCount = 0;
      for (let m = 0; m < memeCounts.length; m++) {
        if (memeCounts[m] > bestCount) { bestCount = memeCounts[m]; bestMeme = m; }
      }
      if (bestMeme !== a.memeId && rand01(ws) < cfg.contagion * 0.12 * (1 - cfg.culturalInertia * 0.6)) {
        a.memeId = bestMeme;
      }
    }

    // ── Innovation (spontaneous ideology mutation) ─────────────────────────
    if (cfg.innovationRate > 0 && rand01(ws) < cfg.innovationRate * 0.03) {
      a.ideology = clamp(a.ideology + randSigned(ws) * 0.4, -1, 1);
      a.desire = clamp(a.desire + 0.05, 0, 1);
    }

    // ── Cooperation (wealth sharing with in-group neighbors) ───────────────
    if (cfg.cooperationBias > 0 && a.wealth > 0.3) {
      for (const j of neighbors) {
        const b = agents[j];
        if (b.groupId === a.groupId && b.wealth < a.wealth - 0.1) {
          const share = cfg.cooperationBias * 0.02 * dt;
          a.wealth = clamp(a.wealth - share, 0, 1);
          b.wealth = clamp(b.wealth + share, 0, 1);
        }
      }
    }

    // Weak opinion pull from neighbours (modulated by cultural inertia)
    if (opN > 1) {
      const delta = (opSum / opN - a.opinion) * cfg.pressure * 0.3 * inertiaFactor * dt / cfg.macroTickSec;
      a.opinion = clamp(a.opinion + delta, -1, 1);
    }

    // ── Goal update ───────────────────────────────────────────────────────
    const centroid = centroids[a.groupId] ?? centroids[0] ?? [0, 0, 1];
    const [gcxG, gcyG] = centroid;
    const inAvgX = inGroupCount > 0 ? inGroupCx / (inGroupCount + 1) : gcxG;
    const inAvgY = inGroupCount > 0 ? inGroupCy / (inGroupCount + 1) : gcyG;

    // ── Ideological repulsion: strongly polarised agents actively flee from
    //    the opposing ideology cluster (creates spatial separation emergence)
    let ideoFleeX = 0, ideoFleeY = 0;
    if (Math.abs(a.ideology) > 0.50) {
      for (const j of neighbors) {
        const b = agents[j];
        if (Math.sign(b.ideology) !== Math.sign(a.ideology) && Math.abs(b.ideology - a.ideology) > 0.70) {
          ideoFleeX += a.x - b.x;
          ideoFleeY += a.y - b.y;
        }
      }
    }

    if (ws.exceptionActive) {
      // Exception: high-belief agents rush to in-group; low-belief flee
      if (a.belief > 0.5) {
        a.goalX = inAvgX; a.goalY = inAvgY;
      } else {
        a.goalX = gcxG * 0.3 + gcx * 0.7;
        a.goalY = gcyG * 0.3 + gcy * 0.7;
      }
    } else if (a.fear > 0.55) {
      // Flee hostile zone → toward in-group
      let fleeX = 0, fleeY = 0, fleeN = 0;
      for (const j of neighbors) {
        const b = agents[j];
        if (b.groupId !== a.groupId && b.aggression > 0.4) {
          fleeX += a.x - b.x; fleeY += a.y - b.y; fleeN++;
        }
      }
      if (fleeN > 0) {
        const fd = Math.sqrt(fleeX * fleeX + fleeY * fleeY) + 0.001;
        a.goalX = a.x + (fleeX / fd) * 0.3 + gcxG * 0.7;
        a.goalY = a.y + (fleeY / fd) * 0.3 + gcyG * 0.7;
      } else {
        a.goalX = gcxG; a.goalY = gcyG;
      }
    } else if (a.wealth < 0.25) {
      // Resource hunger → find R hotspot (simple: move toward high-R neighbor)
      let bestR = r, bestX = gcx, bestY = gcy;
      for (const j of neighbors) {
        const bR = sampleR(fields, agents[j].x, agents[j].y);
        if (bR > bestR) { bestR = bR; bestX = agents[j].x; bestY = agents[j].y; }
      }
      a.goalX = bestX * 0.6 + inAvgX * 0.4;
      a.goalY = bestY * 0.6 + inAvgY * 0.4;
    } else if (a.desire > 0.65 && a.fear < 0.3) {
      // Transgression drive → explore taboo edges
      const tabu = symbols.tabus[0];
      if (tabu) {
        a.goalX = tabu.x + (a.x - tabu.x) * 0.4;
        a.goalY = tabu.y + (a.y - tabu.y) * 0.4;
      } else {
        a.goalX = randSigned(ws) * 1.4;
        a.goalY = randSigned(ws) * 1.4;
      }
    } else if (a.need > 0.5 || cfg.cohesion > 0.5) {
      a.goalX = inAvgX; a.goalY = inAvgY;
    } else {
      const driftX = gcxG * 0.5 + gcx * 0.5;
      const driftY = gcyG * 0.5 + gcy * 0.5;
      a.goalX = a.goalX * 0.7 + driftX * 0.3;
      a.goalY = a.goalY * 0.7 + driftY * 0.3;
    }

    // Tabu repulsion (physical boundary)
    for (const tabu of symbols.tabus) {
      const dx = a.x - tabu.x;
      const dy = a.y - tabu.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < tabu.radius * tabu.radius) {
        if (tabu.kind === 'NO_ENTER') {
          // Push goal outward
          const d = Math.sqrt(d2) + 0.001;
          a.goalX = tabu.x + (dx / d) * (tabu.radius + 0.1);
          a.goalY = tabu.y + (dy / d) * (tabu.radius + 0.1);
        } else if (tabu.kind === 'NO_MIX') {
          // Cross-group repulsion only
          for (const j of neighbors) {
            const b = agents[j];
            if (b.groupId !== a.groupId) {
              const bx = a.x - b.x; const by = a.y - b.y;
              const bd = Math.sqrt(bx * bx + by * by) + 0.001;
              a.goalX += (bx / bd) * 0.2;
              a.goalY += (by / bd) * 0.2;
            }
          }
        }
      }
    }

    // Totem attraction
    for (const totem of symbols.totems) {
      const dx = totem.x - a.x;
      const dy = totem.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < totem.radius * totem.radius) {
        if (totem.kind === 'BOND' && a.belief > 0.35) {
          a.goalX = a.goalX * 0.5 + totem.x * 0.5;
          a.goalY = a.goalY * 0.5 + totem.y * 0.5;
        } else if (totem.kind === 'RIFT' && a.groupId === totem.groupId) {
          a.goalX = a.goalX * 0.4 + totem.x * 0.6;
          a.goalY = a.goalY * 0.4 + totem.y * 0.6;
        } else if (totem.kind === 'ORACLE' && a.status > 0.20) {
          a.goalX = a.goalX * 0.6 + totem.x * 0.4;
          a.goalY = a.goalY * 0.6 + totem.y * 0.4;
          a.belief = clamp(a.belief + 0.02 * dt, 0, 1);
        } else if (totem.kind === 'ARCHIVE') {
          a.groupLoyalty = clamp(a.groupLoyalty + 0.01 * dt, 0, 1);
          a.conformity = clamp(a.conformity + 0.008 * dt, 0, 1);
        }
      }
    }

    // ── Archetype identity (stable) ───────────────────────────────────────
    const kNow = computeArchetypeKey(a);
    a.archKeyMoment = kNow;
    if (kNow !== a.archKeyCandidate) {
      a.archKeyCandidate = kNow;
      a.archCandidateAt = t;
    } else if (kNow !== a.archKeyStable) {
      const hold = Math.max(0.2, cfg.archetypeHoldSec || 0);
      if (t - a.archCandidateAt >= hold) {
        a.archKeyStable = kNow;
        a.archStableAt = t;
      }
    }

    // Apply ideological repulsion (spatially separates polar ideologies)
    if (ideoFleeX !== 0 || ideoFleeY !== 0) {
      const fd = Math.sqrt(ideoFleeX * ideoFleeX + ideoFleeY * ideoFleeY) + 0.001;
      const strength = Math.min(1, Math.abs(a.ideology) * 0.50);
      a.goalX = a.goalX * 0.65 + (a.x + (ideoFleeX / fd) * 0.45) * 0.35 * strength + a.goalX * (1 - strength) * 0.35;
      a.goalY = a.goalY * 0.65 + (a.y + (ideoFleeY / fd) * 0.45) * 0.35 * strength + a.goalY * (1 - strength) * 0.35;
    }

    a.goalX = clamp(a.goalX, -0.95, 0.95);
    a.goalY = clamp(a.goalY, -0.95, 0.95);
  }

  // 7. Taboo violation check
  _checkTabuViolations(agents, symbols, ws, t, pings, events);

  // 8. Policing (high-belief/status guardians punish nearby transgressors)
  _applyPolicing(agents, ws, t);

  // 9. Exception state management
  _updateException(ws, cfg, fields, t, events);

  // 9b. Group mobility — agents may switch groups
  if (cfg.mobility > 0) {
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      if (rand01(ws) > cfg.mobility * 0.02 * (1 - a.groupLoyalty)) continue;
      const neighbors2 = getNeighbors(i, agents, grid, cfg.rMax, cfg.rMax * 1.1, MAX_NEIGH);
      const neighborGroups: number[] = new Array(cfg.groupCount).fill(0);
      for (const j of neighbors2) neighborGroups[agents[j].groupId]++;
      let bestG = a.groupId, bestC = neighborGroups[a.groupId] || 0;
      for (let g = 0; g < cfg.groupCount; g++) {
        if (g !== a.groupId && neighborGroups[g] > bestC) { bestG = g; bestC = neighborGroups[g]; }
      }
      if (bestG !== a.groupId && bestC >= 3) {
        const oldG = a.groupId;
        a.groupId = bestG;
        a.groupLoyalty *= 0.7;
        a.memeId = bestG;
        events.push({ time: t, icon: '↔', message: `Agent migrated G${oldG}→G${bestG}`, color: GROUP_COLORS[bestG] || '#fff' });
      }
    }
  }

  // 9c. Resource scarcity modifier — adjusts R regen in real-time
  if (cfg.resourceScarcity < 0.5) {
    const scarcityDrain = (0.5 - cfg.resourceScarcity) * 0.008 * dt;
    for (let ci = 0; ci < fields.r.length; ci++) {
      fields.r[ci] = Math.max(0, fields.r[ci] - scarcityDrain);
    }
    fields.dirty = true;
  }

  // 9d. Morin: Consensus decay — total consensus without disorder = stagnation → death
  // When consensus is too high for too long, innovation stalls and dissent erupts
  {
    const m2 = computeStudyMetrics(agents, cfg);
    if (m2.consensus > 0.90 && cfg.consensusDecay > 0) {
      for (let i = 0; i < agents.length; i++) {
        const aa = agents[i];
        if (rand01(ws) < cfg.consensusDecay * 0.03) {
          aa.desire = clamp(aa.desire + 0.05, 0, 1);
          aa.ideology = clamp(aa.ideology + randSigned(ws) * 0.15, -1, 1);
        }
      }
    }
  }

  // 10. Economy metrics
  _computeEconomyMetrics(agents, ws);

  // 11. General events (phase shift, coalition, etc.)
  _generateEvents(agents, cfg, prevMetrics, ws, t, pings, events);

  // 12. Autonomous symbol emergence (if enabled)
  if (cfg.autoSymbols) _tryAutoPlaceSymbols(agents, cfg, symbols, ws, t, pings, events);

  return events;
}

// ── Sub-functions ─────────────────────────────────────────────────────────────

function _depositSymbols(
  symbols: StudySymbols, fields: SocialFields, ws: StudyWorldState,
  t: number, dt: number, pings: StudyPing[], events: StudyEvent[],
): void {
  const exBoost = ws.exceptionActive ? 1.6 : 1.0;

  for (const totem of symbols.totems) {
    const ps = totem.pulseStrength * dt * exBoost;
    if (totem.kind === 'BOND') {
      depositN(fields, totem.x, totem.y,  ps * 1.2, totem.radius);
      depositL(fields, totem.x, totem.y,  ps * 0.8, totem.radius);
    } else if (totem.kind === 'RIFT') {
      depositN(fields, totem.x, totem.y, -ps * 0.9, totem.radius * 0.7);
      depositL(fields, totem.x, totem.y,  ps * 1.1, totem.radius);
    } else if (totem.kind === 'ORACLE') {
      depositL(fields, totem.x, totem.y, ps * 1.4, totem.radius);
      depositN(fields, totem.x, totem.y, ps * 0.3, totem.radius * 0.5);
    } else if (totem.kind === 'PANOPTICON') {
      depositN(fields, totem.x, totem.y, ps * 1.5, totem.radius * 1.2);
    } else if (totem.kind === 'ARCHIVE') {
      const nx = Math.floor((totem.x + 1) * fields.size / 2);
      const ny = Math.floor((totem.y + 1) * fields.size / 2);
      const ir = Math.ceil(totem.radius * fields.size / 2);
      for (let dx2 = -ir; dx2 <= ir; dx2++) {
        for (let dy2 = -ir; dy2 <= ir; dy2++) {
          const ci = (ny + dy2) * fields.size + (nx + dx2);
          if (ci >= 0 && ci < fields.n.length) {
            fields.n[ci] = Math.min(1, fields.n[ci] + 0.003 * dt);
            fields.l[ci] = Math.min(1, fields.l[ci] + 0.002 * dt);
          }
        }
      }
    }
  }

  for (const tabu of symbols.tabus) {
    // Tabu writes N on the boundary ring
    const ring = tabu.radius * 0.9;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const rx = tabu.x + Math.cos(a) * ring;
      const ry = tabu.y + Math.sin(a) * ring;
      depositN(fields, rx, ry, 0.015 * dt * exBoost, 0.10);
    }
  }

  for (const ritual of symbols.rituals) {
    const period = ritual.periodSec;
    const phase  = (t - ritual.bornAt) % period;
    const active = phase < period * 0.3;
    ritual.active = active;

    if (active) {
      if (ritual.kind === 'GATHER') {
        depositN(fields, ritual.x, ritual.y, 0.04 * dt * exBoost, ritual.radius);
        depositL(fields, ritual.x, ritual.y, 0.03 * dt, ritual.radius);
        if (Math.abs(phase) < 0.1 && phase < 0.15) {
          events.push({ time: t, icon: '🔔', message: 'Gathering ritual begins', color: '#a78bfa' });
          pings.push({ x: ritual.x, y: ritual.y, message: 'Gather', color: '#a78bfa', bornAt: t, ttl: 3, age: 0 });
        }
      } else if (ritual.kind === 'OFFERING') {
        depositR(fields, ritual.x, ritual.y, 0.06 * dt * exBoost, ritual.radius);
        depositL(fields, ritual.x, ritual.y, 0.02 * dt, ritual.radius * 0.7);
        if (Math.abs(phase) < 0.1 && phase < 0.15) {
          events.push({ time: t, icon: '🎁', message: 'Offering ritual — resources redistributed', color: '#fbbf24' });
          pings.push({ x: ritual.x, y: ritual.y, message: 'Offering', color: '#fbbf24', bornAt: t, ttl: 3, age: 0 });
        }
      } else if (ritual.kind === 'REVOLT') {
        depositN(fields, ritual.x, ritual.y, -0.08 * dt * exBoost, ritual.radius * 1.5);
        if (Math.abs(phase) < 0.1 && phase < 0.15) {
          events.push({ time: t, icon: '🔥', message: 'Revolt ritual — norms shattered', color: '#ef4444' });
          pings.push({ x: ritual.x, y: ritual.y, message: 'Revolt', color: '#ef4444', bornAt: t, ttl: 3, age: 0 });
        }
      } else {
        depositN(fields, ritual.x, ritual.y, 0.05 * dt * exBoost, ritual.radius * 1.2);
        if (Math.abs(phase) < 0.1 && phase < 0.15) {
          events.push({ time: t, icon: '🥁', message: 'Procession ritual in march', color: '#fbd38d' });
          pings.push({ x: ritual.x, y: ritual.y, message: 'Procession', color: '#fbd38d', bornAt: t, ttl: 3, age: 0 });
        }
      }
    }
  }
}

function _checkTabuViolations(
  agents: StudyAgent[], symbols: StudySymbols, ws: StudyWorldState,
  t: number, pings: StudyPing[], events: StudyEvent[],
): void {
  for (const tabu of symbols.tabus) {
    let violations = 0;
    for (const a of agents) {
      const dx = a.x - tabu.x;
      const dy = a.y - tabu.y;
      if (dx * dx + dy * dy < tabu.radius * tabu.radius) {
        if (tabu.kind === 'NO_ENTER') {
          // Violation: increase fear, log if desire high (conscious transgression)
          const conscious = a.desire > 0.5;
          a.fear = clamp(a.fear + tabu.severity * 0.12, 0, 1);
          if (conscious) {
            a.status = clamp(a.status + 0.04, 0, 1); // transgressor prestige
            violations++;
            ws.violationCount++;
            ws.violationsWindow++;
          }
        } else if (tabu.kind === 'NO_MIX') {
          // Check if cross-group neighbors present
          tabu.violationCount++;
        }
      }
    }
    if (violations > 0) {
      tabu.violationCount += violations;
      events.push({ time: t, icon: '⚠️', message: `Taboo violation ×${violations}`, color: '#ef4444' });
      pings.push({ x: tabu.x, y: tabu.y, message: `×${violations} violations`, color: '#ef4444', bornAt: t, ttl: 2, age: 0 });
    }
  }

  // Reset window every 60s
  if (t - ws.violationsWindowStart > 60) {
    ws.violationsWindowStart = t;
    ws.violationsWindow = 0;
  }
}

function _applyPolicing(agents: StudyAgent[], ws: StudyWorldState, t: number): void {
  // Guardians: high belief + high status agents "police" nearby high-desire agents
  for (let i = 0; i < agents.length; i++) {
    const g = agents[i];
    if (g.belief < 0.60 || g.status < 0.35) continue;
    // Guardian: scan nearby agents
    for (let j = 0; j < agents.length; j++) {
      if (j === i) continue;
      const b = agents[j];
      const dx = b.x - g.x; const dy = b.y - g.y;
      if (dx * dx + dy * dy > 0.06 * 0.06) continue;
      if (b.desire > 0.60) {
        // Apply punishment pulse
        b.fear   = clamp(b.fear   + 0.08, 0, 1);
        b.status = clamp(b.status - 0.03, 0, 1);
        if (ws.exceptionActive) {
          b.fear = clamp(b.fear + 0.04, 0, 1); // harsher during exception
        }
      }
    }
  }
  void t;
}

function _updateException(
  ws: StudyWorldState, cfg: StudyConfig, fields: SocialFields,
  t: number, events: StudyEvent[],
): void {
  // Trigger
  if (!ws.exceptionActive && ws.violationsWindow >= cfg.violationThreshold) {
    ws.exceptionActive = true;
    ws.exceptionStartTime = t;
    events.push({ time: t, icon: '⚡', message: 'STATE OF EXCEPTION declared', color: '#ef4444' });
    // Hard N boost across field
    for (let i = 0; i < fields.n.length; i++) {
      fields.n[i] = Math.min(1, fields.n[i] + 0.15);
    }
    fields.dirty = true;
  }

  // Expire
  if (ws.exceptionActive && t - ws.exceptionStartTime > cfg.exceptionDuration) {
    ws.exceptionActive = false;
    events.push({ time: t, icon: '🕊', message: 'State of Exception lifted', color: '#34d399' });
  }
}

function _computeEconomyMetrics(agents: StudyAgent[], ws: StudyWorldState): void {
  if (agents.length === 0) return;
  const total = agents.reduce((s, a) => s + a.wealth, 0);
  ws.meanWealth = total / agents.length;

  // Gini: sum of absolute differences / (2 * n * total)
  const sorted = agents.map(a => a.wealth).sort((a, b) => a - b);
  let giniSum = 0;
  for (let i = 0; i < sorted.length; i++) {
    giniSum += (2 * (i + 1) - sorted.length - 1) * sorted[i];
  }
  ws.gini = total > 0 ? Math.abs(giniSum) / (sorted.length * total) : 0;
}

function _generateEvents(
  agents: StudyAgent[], cfg: StudyConfig,
  prevMetrics: StudyMetrics, ws: StudyWorldState,
  t: number, pings: StudyPing[], events: StudyEvent[],
): void {
  // Phase shift
  const newMetrics = computeStudyMetrics(agents, cfg);
  if (newMetrics.phase !== prevMetrics.phase) {
    const pc: Record<string, string> = {
      SWARM: '#94a3b8', CLUSTERS: '#34d399', POLARIZED: '#fbd38d',
      CONFLICT: '#ef4444', CONSENSUS: '#a78bfa', EXCEPTION: '#ff6b6b',
      FERVOR: '#ff4500', ECO_CRISIS: '#8b4513', TRANSCENDENCE: '#00d4aa',
    };
    events.push({ time: t, icon: '🔄', message: `Phase: ${prevMetrics.phase} → ${newMetrics.phase}`, color: pc[newMetrics.phase] || '#fff' });
  }

  // Wealth gap
  if (ws.gini > 0.55 && rand01(ws) < 0.2) {
    events.push({ time: t, icon: '💰', message: `Wealth gap — Gini ${ws.gini.toFixed(2)}`, color: '#fbbf24' });
  }

  // Coalition
  const groups: number[] = new Array(cfg.groupCount).fill(0);
  for (const a of agents) { if (a.groupId < groups.length) groups[a.groupId]++; }
  const maxG = Math.max(...groups);
  if (maxG > agents.length * 0.55 && rand01(ws) < 0.15) {
    const domGroup = groups.indexOf(maxG);
    const c = GROUP_COLORS[domGroup % GROUP_COLORS.length];
    events.push({ time: t, icon: '🤝', message: `Coalition — Group ${domGroup} (${Math.round(maxG/agents.length*100)}%)`, color: c });
    pings.push({ x: 0, y: 0, message: 'Coalition', color: c, bornAt: t, ttl: 3, age: 0 });
  }
}

function _buildCentroids(agents: StudyAgent[], groupCount: number): [number, number, number][] {
  const c: [number, number, number][] = [];
  for (let g = 0; g < groupCount; g++) c.push([0, 0, 0]);
  for (const a of agents) {
    if (a.groupId < groupCount) {
      c[a.groupId][0] += a.x; c[a.groupId][1] += a.y; c[a.groupId][2]++;
    }
  }
  for (const ci of c) { if (ci[2] > 0) { ci[0] /= ci[2]; ci[1] /= ci[2]; } }
  return c;
}

function addMem(agent: StudyAgent, j: number, friendly: boolean, t: number): void {
  agent.memory.unshift({ agentIdx: j, friendly, time: t });
  if (agent.memory.length > MEMORY_CAP) agent.memory.pop();
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// ── 4. Metrics ────────────────────────────────────────────────────────────────
export function computeStudyMetrics(agents: StudyAgent[], cfg: StudyConfig): StudyMetrics {
  if (!agents.length) return {
    cohesion: 0, polarization: 0, conflict: 0, consensus: 0.5, phase: 'SWARM',
    leaderCount: 0, rebelCount: 0, meanFear: 0, meanBelief: 0, entropy: 0.5,
    meanPerception: 0.5, meanEthics: 0, meanHybris: 0, meanFervor: 0,
    meanUnderstanding: 0, ecoHealth: 1,
  };

  const groupAgents: StudyAgent[][] = Array.from({ length: cfg.groupCount }, () => []);
  for (const a of agents) groupAgents[a.groupId]?.push(a);

  // Cohesion
  let cohSum = 0, cohN = 0;
  for (let g = 0; g < cfg.groupCount; g++) {
    const ga = groupAgents[g];
    if (ga.length < 2) continue;
    const gcx = ga.reduce((s, a) => s + a.x, 0) / ga.length;
    const gcy = ga.reduce((s, a) => s + a.y, 0) / ga.length;
    const spread = ga.reduce((s, a) => s + Math.sqrt((a.x - gcx) ** 2 + (a.y - gcy) ** 2), 0) / ga.length;
    cohSum += 1 - Math.min(1, spread / 0.7);
    cohN++;
  }
  const cohesion = cohN > 0 ? cohSum / cohN : 0;

  // Polarization
  const gOps = groupAgents.map(ga => ga.length > 0 ? ga.reduce((s, a) => s + a.ideology, 0) / ga.length : 0);
  const opMean = gOps.reduce((s, v) => s + v, 0) / gOps.length;
  const opVar  = gOps.reduce((s, v) => s + (v - opMean) ** 2, 0) / gOps.length;
  const polarization = Math.min(1, Math.sqrt(opVar));

  // Conflict
  const conflict = Math.min(1, agents.reduce((s, a) => s + a.hostileCount, 0) / (agents.length * 3));

  // Consensus
  const allMean = agents.reduce((s, a) => s + a.ideology, 0) / agents.length;
  const allVar  = agents.reduce((s, a) => s + (a.ideology - allMean) ** 2, 0) / agents.length;
  const consensus = Math.max(0, 1 - Math.sqrt(allVar) / 1.1);

  // Extended metrics
  const meanFear   = agents.reduce((s, a) => s + a.fear,   0) / agents.length;
  const meanBelief = agents.reduce((s, a) => s + a.belief, 0) / agents.length;
  const leaderCount = agents.filter(a => a.centrality > 0.3 && a.status > 0.4).length;
  const rebelCount  = agents.filter(a => a.resistance > 0.7 || (a.ideology > 0.5 && a.fear < 0.3 && a.desire > 0.65)).length;

  // Opinion entropy (bucket ideologies into 5 bins, compute Shannon entropy)
  const bins = new Float32Array(5);
  for (const a of agents) bins[Math.min(4, Math.floor((a.ideology + 1) / 2 * 5))]++;
  let entropy = 0;
  for (let b = 0; b < 5; b++) {
    const p = bins[b] / agents.length;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  entropy = Math.min(1, entropy / Math.log2(5));

  // Morin metrics
  const meanPerception = agents.reduce((s, a) => s + a.perception, 0) / agents.length;
  const meanEthics = agents.reduce((s, a) => s + a.ethics, 0) / agents.length;
  const meanHybris = agents.reduce((s, a) => s + a.hybris, 0) / agents.length;
  const meanFervor2 = agents.reduce((s, a) => s + a.fervor, 0) / agents.length;
  const meanUnderstanding = agents.reduce((s, a) => s + a.understanding, 0) / agents.length;
  const ecoHealth = 1 - (agents.reduce((s, a) => s + a.ecoFootprint, 0) / agents.length);

  let phase: StudyMetrics['phase'];
  // Morin phases take precedence when conditions are strong enough
  if      (meanFervor2 > 0.40)                                         phase = 'FERVOR';
  else if (ecoHealth < 0.35)                                           phase = 'ECO_CRISIS';
  else if (meanEthics > 0.45 && meanUnderstanding > 0.35 && conflict < 0.15) phase = 'TRANSCENDENCE';
  else if (consensus  > 0.78 && conflict  < 0.2)                      phase = 'CONSENSUS';
  else if (conflict   > 0.50)                                          phase = 'CONFLICT';
  else if (polarization > 0.58)                                        phase = 'POLARIZED';
  else if (cohesion   > 0.55 && polarization < 0.35)                   phase = 'CLUSTERS';
  else                                                                  phase = 'SWARM';

  return {
    cohesion, polarization, conflict, consensus, phase,
    leaderCount, rebelCount, meanFear, meanBelief, entropy,
    meanPerception, meanEthics, meanHybris, meanFervor: meanFervor2,
    meanUnderstanding, ecoHealth,
  };
}

// ── 5. Agent Roles ────────────────────────────────────────────────────────────
export type AgentRole =
  | 'normal'
  | 'leader'
  | 'authority'
  | 'dictator'
  | 'priest'
  | 'guardian'
  | 'mediator'
  | 'aggressor'
  | 'rebel';

export function computeAgentRoles(agents: StudyAgent[]): AgentRole[] {
  const roles: AgentRole[] = new Array(agents.length).fill('normal');
  if (!agents.length) return roles;

  // Leaders: top-5 centrality + status
  const sorted = agents.map((a, i) => ({ i, c: a.centrality + a.status })).sort((a, b) => b.c - a.c);
  for (let k = 0; k < Math.min(5, agents.length); k++) {
    if (sorted[k].c > 0.5) roles[sorted[k].i] = 'leader';
  }

  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    // Dictator: coercive high-status central figure (often also a leader)
    const dictatorLike =
      a.status > 0.72 &&
      a.centrality > 0.28 &&
      a.aggression > 0.62 &&
      a.belief > 0.55 &&
      a.ideology < -0.15;
    if (dictatorLike) { roles[i] = 'dictator'; continue; }

    // Priest: high belief + status + charisma (legitimation)
    const priestLike = a.belief > 0.70 && a.status > 0.45 && a.charisma > 0.4 && a.aggression < 0.55;
    if (priestLike)  { roles[i] = 'priest';  continue; }

    // Rebel: high resistance or freedom ideology + desire + low fear
    if (a.resistance > 0.7 || (a.ideology > 0.5 && a.desire > 0.65 && a.fear < 0.35)) { roles[i] = 'rebel'; continue; }

    // Authority: high status + high conformity/belief (institutional power)
    const authorityLike = a.status > 0.58 && (a.belief > 0.62 || a.conformity > 0.70) && a.charisma > 0.18;
    if (authorityLike) { roles[i] = 'authority'; continue; }

    // Aggressor
    if (a.aggression > 0.65 && a.hostileCount >= 2) { roles[i] = 'aggressor'; continue; }

    // Guardian (kept for backwards-compat semantics; overlaps with authority)
    if (a.belief > 0.65 && a.status > 0.40)         { roles[i] = 'guardian';  continue; }

    // Mediator
    const crossFriendly = a.memory.filter(m =>
      m.agentIdx < agents.length && agents[m.agentIdx].groupId !== a.groupId && m.friendly
    ).length;
    if (a.trust > 0.7 && crossFriendly >= 2) roles[i] = 'mediator';
  }
  return roles;
}

// ── 6. Autonomous Symbol Emergence ───────────────────────────────────────────
let _autoSymUid = 2000;
const _aid = () => `auto-${_autoSymUid++}`;

function _nearAny<T extends { x: number; y: number }>(x: number, y: number, arr: T[], r: number): boolean {
  return arr.some(s => (s.x - x) ** 2 + (s.y - y) ** 2 < r * r);
}

export function _tryAutoPlaceSymbols(
  agents:  StudyAgent[],
  cfg:     StudyConfig,
  symbols: StudySymbols,
  ws:      StudyWorldState,
  t:       number,
  pings:   StudyPing[],
  events:  StudyEvent[],
): void {
  const total = symbols.totems.length + symbols.tabus.length + symbols.rituals.length;
  if (total >= 12) return; // raised cap for richer ecosystems
  if (rand01(ws) > 0.12) return; // ~12% chance per macroTick (doubled)

  // ── Emergent BOND: group cluster with high belief + high status ──
  if (symbols.totems.length < 4) {
    // Find group centroid with high mean belief
    const groups: { g: number; cx: number; cy: number; mb: number; ms: number; n: number }[] = [];
    for (let g = 0; g < cfg.groupCount; g++) groups.push({ g, cx: 0, cy: 0, mb: 0, ms: 0, n: 0 });
    for (const a of agents) {
      const d = groups[a.groupId];
      if (!d) continue;
      d.cx += a.x; d.cy += a.y; d.mb += a.belief; d.ms += a.status; d.n++;
    }
    for (const d of groups) {
      if (d.n < 8) continue;
      d.cx /= d.n; d.cy /= d.n; d.mb /= d.n; d.ms /= d.n;
      if (d.mb > 0.62 && d.ms > 0.25 && !_nearAny(d.cx, d.cy, symbols.totems, 0.4)) {
        const t2: StudyTotem = { id: _aid(), kind: 'BOND', x: d.cx, y: d.cy, radius: 0.22, groupId: d.g, pulseStrength: 0.65, bornAt: t, emergent: true };
        symbols.totems.push(t2);
        events.push({ time: t, icon: '⊕', message: `Foundation — Group ${d.g} crystallised belief`, color: '#34d399' });
        pings.push({ x: d.cx, y: d.cy, message: 'Foundation', color: '#34d399', bornAt: t, ttl: 5, age: 0 });
        return;
      }
    }
  }

  // ── Emergent Taboo: violation spike → community closes the zone ──
  if (symbols.tabus.length < 3 && ws.violationsWindow >= 2) {
    const transgressors = agents.filter(a => a.desire > 0.65);
    if (transgressors.length >= 3) {
      const cx = transgressors.slice(0, 6).reduce((s, a) => s + a.x, 0) / Math.min(6, transgressors.length);
      const cy = transgressors.slice(0, 6).reduce((s, a) => s + a.y, 0) / Math.min(6, transgressors.length);
      if (!_nearAny(cx, cy, symbols.tabus, 0.25)) {
        const tb: StudyTabu = { id: _aid(), kind: 'NO_ENTER', x: cx, y: cy, radius: 0.17, severity: 0.55, bornAt: t, violationCount: 0 };
        symbols.tabus.push(tb);
        events.push({ time: t, icon: '⛔', message: 'Taboo sealed — community declares limit', color: '#ef4444' });
        pings.push({ x: cx, y: cy, message: 'Sealed', color: '#ef4444', bornAt: t, ttl: 4, age: 0 });
        return;
      }
    }
  }

  // ── Emergent Ritual: ideological convergence → collective practice ──
  if (symbols.rituals.length < 3) {
    const meanBelief = agents.reduce((s, a) => s + a.belief, 0) / agents.length;
    const ideVar = agents.reduce((s, a) => s + a.ideology ** 2, 0) / agents.length;
    if (meanBelief > 0.65 && ideVar < 0.18) {
      const cx = agents.reduce((s, a) => s + a.x, 0) / agents.length;
      const cy = agents.reduce((s, a) => s + a.y, 0) / agents.length;
      if (!_nearAny(cx, cy, symbols.rituals, 0.35)) {
        const rt: StudyRitual = { id: _aid(), kind: 'GATHER', x: cx, y: cy, radius: 0.28, periodSec: 9, lastFired: t, active: false, bornAt: t };
        symbols.rituals.push(rt);
        events.push({ time: t, icon: '◎', message: 'Ritual emerged — collective belief crystallised', color: '#a78bfa' });
        pings.push({ x: cx, y: cy, message: 'Ritual', color: '#a78bfa', bornAt: t, ttl: 5, age: 0 });
        return;
      }
    }
  }

  // ── Emergent RIFT: polarization spike → factional totem ──
  if (symbols.totems.filter(t2 => t2.kind === 'RIFT').length < 2) {
    const meanIde = agents.reduce((s, a) => s + a.ideology, 0) / agents.length;
    const riftGrp = agents.filter(a => a.ideology < meanIde - 0.55);
    if (riftGrp.length >= 10) {
      const cx = riftGrp.reduce((s, a) => s + a.x, 0) / riftGrp.length;
      const cy = riftGrp.reduce((s, a) => s + a.y, 0) / riftGrp.length;
      const gid = riftGrp[0].groupId;
      if (!_nearAny(cx, cy, symbols.totems, 0.35)) {
        const rt2: StudyTotem = { id: _aid(), kind: 'RIFT', x: cx, y: cy, radius: 0.22, groupId: gid, pulseStrength: 0.8, bornAt: t, emergent: true };
        symbols.totems.push(rt2);
        events.push({ time: t, icon: '⊖', message: `Schism — faction ${gid} breaks from consensus`, color: '#ff6b6b' });
        pings.push({ x: cx, y: cy, message: 'Schism', color: '#ff6b6b', bornAt: t, ttl: 5, age: 0 });
        return;
      }
    }
  }

  // ── Emergent ORACLE: high-charisma leader cluster → prophetic authority ──
  if (symbols.totems.filter(t2 => t2.kind === 'ORACLE').length < 2) {
    const leaders = agents.filter(a => a.charisma > 0.25 && a.status > 0.35);
    if (leaders.length >= 3) {
      const cx = leaders.reduce((s, a) => s + a.x, 0) / leaders.length;
      const cy = leaders.reduce((s, a) => s + a.y, 0) / leaders.length;
      if (!_nearAny(cx, cy, symbols.totems, 0.35)) {
        const ot: StudyTotem = { id: _aid(), kind: 'ORACLE', x: cx, y: cy, radius: 0.24, groupId: leaders[0].groupId, pulseStrength: 0.9, bornAt: t, emergent: true };
        symbols.totems.push(ot);
        events.push({ time: t, icon: '🔮', message: 'Oracle emerged — charismatic authority crystallised', color: '#c084fc' });
        pings.push({ x: cx, y: cy, message: 'Oracle', color: '#c084fc', bornAt: t, ttl: 5, age: 0 });
        return;
      }
    }
  }

  // ── Emergent ARCHIVE: long-lived stable zone → memory preservation ──
  if (symbols.totems.filter(t2 => t2.kind === 'ARCHIVE').length < 2) {
    const stableAgents = agents.filter(a => a.fatigue < 0.15 && a.belief > 0.50 && a.fear < 0.20);
    if (stableAgents.length >= agents.length * 0.25) {
      const cx = stableAgents.reduce((s, a) => s + a.x, 0) / stableAgents.length;
      const cy = stableAgents.reduce((s, a) => s + a.y, 0) / stableAgents.length;
      if (!_nearAny(cx, cy, symbols.totems, 0.40)) {
        const at: StudyTotem = { id: _aid(), kind: 'ARCHIVE', x: cx, y: cy, radius: 0.20, groupId: 0, pulseStrength: 0.5, bornAt: t, emergent: true };
        symbols.totems.push(at);
        events.push({ time: t, icon: '📜', message: 'Archive emerged — collective memory preserved', color: '#94a3b8' });
        pings.push({ x: cx, y: cy, message: 'Archive', color: '#94a3b8', bornAt: t, ttl: 5, age: 0 });
        return;
      }
    }
  }

  // ── Emergent OFFERING: wealth inequality + nearby ritual → redistribution ──
  if (symbols.rituals.filter(r2 => r2.kind === 'OFFERING').length < 2 && ws.gini > 0.45) {
    const poorAgents = agents.filter(a => a.wealth < 0.15);
    if (poorAgents.length >= 8) {
      const cx = poorAgents.reduce((s, a) => s + a.x, 0) / poorAgents.length;
      const cy = poorAgents.reduce((s, a) => s + a.y, 0) / poorAgents.length;
      if (!_nearAny(cx, cy, symbols.rituals, 0.30)) {
        const or: StudyRitual = { id: _aid(), kind: 'OFFERING', x: cx, y: cy, radius: 0.25, periodSec: 8, lastFired: t, active: false, bornAt: t };
        symbols.rituals.push(or);
        events.push({ time: t, icon: '🎁', message: 'Offering emerged — community responds to poverty', color: '#fbbf24' });
        pings.push({ x: cx, y: cy, message: 'Offering', color: '#fbbf24', bornAt: t, ttl: 5, age: 0 });
        return;
      }
    }
  }

  // ── Emergent REVOLT: high resistance + proximity to Panopticon ──
  if (symbols.rituals.filter(r2 => r2.kind === 'REVOLT').length < 2) {
    const rebels = agents.filter(a => a.resistance > 0.85);
    if (rebels.length >= 6) {
      const cx = rebels.reduce((s, a) => s + a.x, 0) / rebels.length;
      const cy = rebels.reduce((s, a) => s + a.y, 0) / rebels.length;
      if (!_nearAny(cx, cy, symbols.rituals, 0.30)) {
        const rr: StudyRitual = { id: _aid(), kind: 'REVOLT', x: cx, y: cy, radius: 0.35, periodSec: 6, lastFired: t, active: false, bornAt: t, emergent: true };
        symbols.rituals.push(rr);
        events.push({ time: t, icon: '🔥', message: 'Revolt erupted against surveillance', color: '#ef4444' });
        pings.push({ x: cx, y: cy, message: 'Revolt', color: '#ef4444', bornAt: t, ttl: 5, age: 0 });
        return;
      }
    }
  }
}

export { buildGrid };