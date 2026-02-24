// ─── Sociogenesis Study Mode — Engine ────────────────────────────────────────
// Two clocks:
//   microTick (every frame)  — kinematics: separation + goal-steer + friction
//   macroTick (every ~1s)    — social decisions + field updates + psychology
//
// Theory: symbols write into fields (N/L/R), fields modulate psychology
// (belief/fear/desire), psychology drives goals, goals drive movement.

import type {
  StudyAgent, StudyConfig, StudyMetrics, StudyWorldState,
  StudySymbols, StudyEvent, StudyPing, Encounter,
  StudyTotem, StudyTabu, StudyRitual,
} from './studyTypes';
import { GROUP_COLORS } from './studyTypes';
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
export function spawnStudyAgents(cfg: StudyConfig, rng: () => number): StudyAgent[] {
  const { agentCount, groupCount } = cfg;
  const agents: StudyAgent[] = [];

  const centers: [number, number][] = [];
  for (let g = 0; g < groupCount; g++) {
    const angle = (g / groupCount) * Math.PI * 2 - Math.PI / 2;
    centers.push([Math.cos(angle) * 0.52, Math.sin(angle) * 0.52]);
  }

  for (let i = 0; i < agentCount; i++) {
    const g = i % groupCount;
    const [cx, cy] = centers[g];
    const angle = rng() * Math.PI * 2;
    const r = rng() * 0.17 + 0.02;
    const groupOp = (g / Math.max(groupCount - 1, 1)) * 2 - 1;
    const ideology = Math.max(-1, Math.min(1, groupOp + (rng() - 0.5) * 0.6));

    agents.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      vx: (rng() - 0.5) * 0.07,
      vy: (rng() - 0.5) * 0.07,
      groupId: g,
      opinion: ideology,
      trust:      Math.max(0, Math.min(1, cfg.trustBase      + (rng() - 0.5) * 0.3)),
      aggression: Math.max(0, Math.min(1, cfg.aggressionBase + (rng() - 0.5) * 0.2)),
      need:       Math.max(0, Math.min(1, cfg.needBase        + (rng() - 0.5) * 0.25)),
      goalX: cx, goalY: cy,
      memory: [], centrality: 0, hostileCount: 0,
      // Psychology
      belief:   0.3 + rng() * 0.3,
      fear:     0.1 + rng() * 0.15,
      desire:   0.2 + rng() * 0.3,
      status:   0.05 + rng() * 0.1,
      wealth:   0.2  + rng() * 0.15,
      ideology,
      fatigue:  0.05 + rng() * 0.05,
    });
  }
  return agents;
}

// ── 2. microTick — kinematics only ────────────────────────────────────────────
const SEP_RADIUS = 0.042;
const SEP_FORCE  = 1.9;

export function buildMicroGrid(agents: StudyAgent[]): Grid {
  return buildGrid(agents, SEP_RADIUS * 2.5);
}

export function microTick(agents: StudyAgent[], grid: Grid, cfg: StudyConfig, dt: number): void {
  const { friction, speed, autonomy } = cfg;
  const sep2 = SEP_RADIUS * SEP_RADIUS;
  const cellSize = SEP_RADIUS * 2.5;

  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    let fx = 0, fy = 0;

    // Separation
    const gx = ((a.x + 1.0) / cellSize) | 0;
    const gy = ((a.y + 1.0) / cellSize) | 0;
    for (let dx2 = -1; dx2 <= 1; dx2++) {
      for (let dy2 = -1; dy2 <= 1; dy2++) {
        const cell = grid.get((gx + dx2) * 1024 + (gy + dy2));
        if (!cell) continue;
        for (const j of cell) {
          if (j === i) continue;
          const nx = a.x - agents[j].x;
          const ny = a.y - agents[j].y;
          const d2 = nx * nx + ny * ny;
          if (d2 < sep2 && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            const push = (SEP_RADIUS - d) / SEP_RADIUS;
            fx += (nx / d) * push * SEP_FORCE;
            fy += (ny / d) * push * SEP_FORCE;
          }
        }
      }
    }

    // Goal steering
    const gdx = a.goalX - a.x;
    const gdy = a.goalY - a.y;
    const gd  = Math.sqrt(gdx * gdx + gdy * gdy) + 0.001;
    const steer = Math.min(gd / 0.5, 1.0);
    // Fear modulates speed: fearful agents move faster toward safety
    const fearBoost = 1 + a.fear * 0.6;
    fx += (gdx / gd) * autonomy * speed * 2.2 * steer * fearBoost;
    fy += (gdy / gd) * autonomy * speed * 2.2 * steer * fearBoost;

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
  }
}

// ── 3. macroTick — social decisions ──────────────────────────────────────────
const MAX_NEIGH  = 12;
const MEMORY_CAP = 3;

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

    // ── Psychology update ──────────────────────────────────────────────────
    // belief: rises with N (discipline zone), falls with high desire
    const beliefDelta = (cfg.kBelief * n * (1 - a.desire * 0.7) - 0.05 * a.desire) * dt;
    a.belief = clamp(a.belief + beliefDelta, 0, 1);

    // fear: rises with N when belief is low (coercion), rises with conflict,
    //        falls when L is high (legitimate authority = safety for believers)
    const fearFromN      = cfg.kFear * n * (1 - a.belief * 0.8);
    const fearFromConflict = 0.12 * (a.hostileCount / 3);
    const fearFromL      = -0.15 * l * a.belief;  // legitimacy calms believers
    a.fear = clamp(a.fear + (fearFromN + fearFromConflict + fearFromL) * dt - 0.08 * dt, 0, 1);

    // desire: rises in low-N zones (anomic freedom) and with scarcity
    const desireDelta = (cfg.kDesire * (1 - n) * 0.7 + 0.1 * (1 - a.wealth)) * dt - 0.06 * dt;
    a.desire = clamp(a.desire + desireDelta, 0, 1);

    // wealth: harvest R, minus maintenance
    const gain = cfg.harvestRate * r * dt;
    a.wealth = clamp(a.wealth + gain - cfg.decayWealth * dt, 0, 1);
    if (gain > 0.001) depositR(fields, a.x, a.y, -gain * 0.6, 0.08); // deplete

    // status: cumulative advantage (wealth + L proximity + influence)
    const nearTotemL = l;
    const statusGain = (0.08 * a.centrality + 0.05 * a.wealth * nearTotemL + 0.03 * l) * dt;
    a.status = clamp(a.status * (1 - 0.015 * dt) + statusGain, 0, 1);

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

    // ── Neighbor analysis ──────────────────────────────────────────────────
    a.hostileCount = 0;
    let inGroupCount = 0, opSum = a.opinion, opN = 1;
    let inGroupCx = a.x, inGroupCy = a.y;
    let centralN = 0;

    for (const j of neighbors) {
      const b = agents[j];
      centralN++;
      if (b.groupId === a.groupId) {
        inGroupCount++;
        opSum += b.opinion * b.trust;
        opN++;
        inGroupCx += b.x; inGroupCy += b.y;
        addMem(a, j, true, t);
      } else {
        const hostile = b.aggression > 0.5 || a.aggression > 0.5;
        if (hostile) {
          a.hostileCount++;
          addMem(a, j, false, t);
        } else {
          // Cross-group neutral: weak opinion pull
          opSum += b.opinion * 0.1;
          opN += 0.1;
          addMem(a, j, true, t);
        }
      }
    }
    a.centrality = Math.min(1, centralN / MAX_NEIGH);

    // Weak opinion pull from neighbours (separate from ideology contágio)
    if (opN > 1) {
      const delta = (opSum / opN - a.opinion) * cfg.pressure * 0.3 * dt / cfg.macroTickSec;
      a.opinion = clamp(a.opinion + delta, -1, 1);
    }

    // ── Goal update ───────────────────────────────────────────────────────
    const centroid = centroids[a.groupId] ?? centroids[0] ?? [0, 0, 1];
    const [gcxG, gcyG] = centroid;
    const inAvgX = inGroupCount > 0 ? inGroupCx / (inGroupCount + 1) : gcxG;
    const inAvgY = inGroupCount > 0 ? inGroupCy / (inGroupCount + 1) : gcyG;

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
        a.goalX = (Math.random() - 0.5) * 1.4;
        a.goalY = (Math.random() - 0.5) * 1.4;
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

    // Totem attraction (in-group, high-belief)
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
        }
      }
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
    } else {
      // RIFT: anti-norma + factional legitimacy
      depositN(fields, totem.x, totem.y, -ps * 0.9, totem.radius * 0.7);
      depositL(fields, totem.x, totem.y,  ps * 1.1, totem.radius); // legitimacy for the faction
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
      } else {
        // PROCESSION: discipline deposits along N
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
    };
    events.push({ time: t, icon: '🔄', message: `Phase: ${prevMetrics.phase} → ${newMetrics.phase}`, color: pc[newMetrics.phase] || '#fff' });
  }

  // Wealth gap
  if (ws.gini > 0.55 && Math.random() < 0.2) {
    events.push({ time: t, icon: '💰', message: `Wealth gap — Gini ${ws.gini.toFixed(2)}`, color: '#fbbf24' });
  }

  // Coalition
  const groups: number[] = new Array(cfg.groupCount).fill(0);
  for (const a of agents) { if (a.groupId < groups.length) groups[a.groupId]++; }
  const maxG = Math.max(...groups);
  if (maxG > agents.length * 0.55 && Math.random() < 0.15) {
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
  if (!agents.length) return { cohesion: 0, polarization: 0, conflict: 0, consensus: 0.5, phase: 'SWARM' };

  const groupAgents: StudyAgent[][] = Array.from({ length: cfg.groupCount }, () => []);
  for (const a of agents) groupAgents[a.groupId]?.push(a);

  // Cohesion
  let cohSum = 0, cohN = 0;
  for (let g = 0; g < cfg.groupCount; g++) {
    const ga = groupAgents[g];
    if (ga.length < 2) continue;
    const cx = ga.reduce((s, a) => s + a.x, 0) / ga.length;
    const cy = ga.reduce((s, a) => s + a.y, 0) / ga.length;
    const spread = ga.reduce((s, a) => s + Math.sqrt((a.x - cx) ** 2 + (a.y - cy) ** 2), 0) / ga.length;
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
  const allIde = agents.map(a => a.ideology);
  const allMean = allIde.reduce((s, v) => s + v, 0) / allIde.length;
  const allVar  = allIde.reduce((s, v) => s + (v - allMean) ** 2, 0) / allIde.length;
  const consensus = Math.max(0, 1 - Math.sqrt(allVar) / 1.1);

  let phase: StudyMetrics['phase'];
  if      (consensus  > 0.78 && conflict  < 0.2)    phase = 'CONSENSUS';
  else if (conflict   > 0.50)                         phase = 'CONFLICT';
  else if (polarization > 0.58)                       phase = 'POLARIZED';
  else if (cohesion   > 0.55 && polarization < 0.35) phase = 'CLUSTERS';
  else                                                phase = 'SWARM';

  return { cohesion, polarization, conflict, consensus, phase };
}

// ── 5. Agent Roles ────────────────────────────────────────────────────────────
export type AgentRole = 'normal' | 'leader' | 'aggressor' | 'mediator' | 'guardian';

export function computeAgentRoles(agents: StudyAgent[]): AgentRole[] {
  const roles: AgentRole[] = new Array(agents.length).fill('normal');
  if (!agents.length) return roles;

  // Leaders: top-5 centrality
  const sorted = agents.map((a, i) => ({ i, c: a.centrality })).sort((a, b) => b.c - a.c);
  for (let k = 0; k < Math.min(5, agents.length); k++) {
    if (sorted[k].c > 0.3) roles[sorted[k].i] = 'leader';
  }

  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    if (a.aggression > 0.65 && a.hostileCount >= 2) { roles[i] = 'aggressor'; continue; }
    if (a.belief > 0.65 && a.status > 0.40)         { roles[i] = 'guardian';  continue; }
    if (roles[i] !== 'normal') continue;
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
  if (total >= 7) return; // cap
  if (Math.random() > 0.06) return; // ~6% chance per macroTick

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
        const t2: StudyTotem = { id: _aid(), kind: 'BOND', x: d.cx, y: d.cy, radius: 0.22, groupId: d.g, pulseStrength: 0.65, bornAt: t };
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
        const rt2: StudyTotem = { id: _aid(), kind: 'RIFT', x: cx, y: cy, radius: 0.22, groupId: gid, pulseStrength: 0.8, bornAt: t };
        symbols.totems.push(rt2);
        events.push({ time: t, icon: '⊖', message: `Schism — faction ${gid} breaks from consensus`, color: '#ff6b6b' });
        pings.push({ x: cx, y: cy, message: 'Schism', color: '#ff6b6b', bornAt: t, ttl: 5, age: 0 });
      }
    }
  }
}

export { buildGrid };