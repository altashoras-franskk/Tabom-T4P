// ─── CsO Layer — Organs + Affects + Zones + Cruelty ─────────────────────────
// Organs: hierarchical nodes connected by springs.
// Affects: intensity particles that flow through zones.
// Zones: mobile affect fields that modulate particle behavior.
// Cruelty: accumulates → rupture bursts that break connections / spawn events.

import type {
  CSOState, CSOOrgan, CSOAffect, CSOZone, CSOEvent,
  MPParams, MPFields,
} from './milplatosTypes';
import { MP_FIELD_RES } from './milplatosTypes';

const TWO_PI = Math.PI * 2;
const TRAIL_LEN = 28;
const MAX_AFFECTS = 400;

// ── Create ──────────────────────────────────────────────────────────────────
export function createCSOState(params: MPParams): CSOState {
  const organs: CSOOrgan[] = [];
  const nOrgans = 8 + Math.round(params.organismo * 12); // 8..20
  const nextId = { v: 0 };

  for (let i = 0; i < nOrgans; i++) {
    const angle = (i / nOrgans) * TWO_PI;
    const r = 0.15 + Math.random() * 0.35;
    organs.push({
      id: nextId.v++,
      x: Math.cos(angle) * r, y: Math.sin(angle) * r,
      vx: 0, vy: 0,
      radius: 0.03 + Math.random() * 0.04,
      importance: 0.3 + Math.random() * 0.7,
      connections: [],
      hue: 200 + (i / nOrgans) * 50,
      health: 0.8 + Math.random() * 0.2,
    });
  }

  // Wire organs: chain + random cross-links based on hierarchy
  for (let i = 0; i < nOrgans; i++) {
    const next = (i + 1) % nOrgans;
    if (!organs[i].connections.includes(organs[next].id)) {
      organs[i].connections.push(organs[next].id);
      organs[next].connections.push(organs[i].id);
    }
    if (params.hierarquia > 0.3 && Math.random() < params.hierarquia * 0.3) {
      const other = Math.floor(Math.random() * nOrgans);
      if (other !== i && !organs[i].connections.includes(organs[other].id)) {
        organs[i].connections.push(organs[other].id);
        organs[other].connections.push(organs[i].id);
      }
    }
  }

  // Initial affects
  const nAffects = 50 + Math.round(params.densidade * 200);
  const affects: CSOAffect[] = [];
  for (let i = 0; i < nAffects; i++) {
    const a = Math.random() * TWO_PI;
    const rd = 0.1 + Math.random() * 0.5;
    const ax = Math.cos(a) * rd, ay = Math.sin(a) * rd;
    affects.push({
      x: ax, y: ay, vx: (Math.random() - 0.5) * 0.005, vy: (Math.random() - 0.5) * 0.005,
      intensity: 0.3 + Math.random() * 0.5,
      hue: Math.random() * 360,
      phase: Math.random() * TWO_PI,
      life: 600 + Math.floor(Math.random() * 1200),
      trailX: new Array(TRAIL_LEN).fill(ax),
      trailY: new Array(TRAIL_LEN).fill(ay),
    });
  }

  // Initial zones
  const zones: CSOZone[] = [];
  for (let i = 0; i < 3; i++) {
    zones.push({
      x: (Math.random() - 0.5) * 0.8, y: (Math.random() - 0.5) * 0.8,
      vx: (Math.random() - 0.5) * 0.002, vy: (Math.random() - 0.5) * 0.002,
      radius: 0.15 + Math.random() * 0.15,
      strength: 0.3 + Math.random() * 0.5,
      hue: i * 120,
      pulse: Math.random() * TWO_PI,
    });
  }

  return {
    organs, affects, zones, events: [],
    nextId: nextId.v, crueltyAccum: 0, ruptureCount: 0,
  };
}

// ── Step CsO ────────────────────────────────────────────────────────────────
export function stepCSO(
  state: CSOState, params: MPParams, fields: MPFields, time: number, dt: number,
): void {
  dt = Math.min(dt, 0.04);
  const { organs, affects, zones, events } = state;

  // ── Step Organs ───────────────────────────────────────────────────────────
  const organMap = new Map<number, CSOOrgan>();
  for (const o of organs) organMap.set(o.id, o);

  for (const o of organs) {
    let fx = 0, fy = 0;

    // Spring forces to connected organs (rigidity)
    for (const cid of o.connections) {
      const c = organMap.get(cid);
      if (!c) continue;
      const dx = c.x - o.x, dy = c.y - o.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
      const restLen = 0.12 + (1 - params.rigidez) * 0.15;
      const force = (d - restLen) * params.rigidez * 2.0;
      fx += (dx / d) * force;
      fy += (dy / d) * force;
    }

    // Repulsion between organs
    for (const other of organs) {
      if (other.id === o.id) continue;
      const dx = other.x - o.x, dy = other.y - o.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 0.04 && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        fx -= (dx / d) * 0.08 / (d + 0.01);
        fy -= (dy / d) * 0.08 / (d + 0.01);
      }
    }

    // Noise
    if (params.ruido > 0.01) {
      fx += Math.sin(time * 0.8 + o.id * 2.1) * params.ruido * 0.02;
      fy += Math.cos(time * 0.8 + o.id * 1.7) * params.ruido * 0.02;
    }

    // CsO dissolution: health decreases with desorganizacao
    o.health = Math.max(0.05, o.health - params.desorganizacao * 0.002 * dt +
      params.organismo * 0.001 * dt);
    o.health = Math.min(1, o.health);

    o.vx = (o.vx + fx * dt) * 0.96;
    o.vy = (o.vy + fy * dt) * 0.96;
    const ospd = Math.sqrt(o.vx * o.vx + o.vy * o.vy);
    if (ospd > 0.004) { o.vx = (o.vx / ospd) * 0.004; o.vy = (o.vy / ospd) * 0.004; }
    o.x += o.vx; o.y += o.vy;
    o.x = Math.max(-0.9, Math.min(0.9, o.x));
    o.y = Math.max(-0.9, Math.min(0.9, o.y));
  }

  // ── Disorganization: chance to break/reconnect organ links ────────────
  if (params.desorganizacao > 0.1 && Math.random() < params.desorganizacao * 0.02 * dt) {
    const oi = Math.floor(Math.random() * organs.length);
    const o = organs[oi];
    if (o && o.connections.length > 1) {
      const ci = Math.floor(Math.random() * o.connections.length);
      const removedId = o.connections[ci];
      o.connections.splice(ci, 1);
      const other = organMap.get(removedId);
      if (other) {
        const idx = other.connections.indexOf(o.id);
        if (idx >= 0) other.connections.splice(idx, 1);
      }
      // Anti-habit: reconnect to random other organ
      if (params.antiHabito > 0.2 && Math.random() < params.antiHabito) {
        const candidates = organs.filter(c => c.id !== o.id && !o.connections.includes(c.id));
        if (candidates.length > 0) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          o.connections.push(target.id);
          target.connections.push(o.id);
          events.push({
            time, x: (o.x + target.x) * 0.5, y: (o.y + target.y) * 0.5,
            type: 'reconexao', message: 'Reconexão anti-hábito',
            color: '#a78bfa', ttl: 120,
          });
        }
      }
    }
  }

  // ── Step Zones ────────────────────────────────────────────────────────────
  for (const z of zones) {
    z.pulse += dt * 2;
    z.x += z.vx; z.y += z.vy;
    // Bounce
    if (z.x < -0.85 || z.x > 0.85) z.vx *= -1;
    if (z.y < -0.85 || z.y > 0.85) z.vy *= -1;
    z.x = Math.max(-0.9, Math.min(0.9, z.x));
    z.y = Math.max(-0.9, Math.min(0.9, z.y));
    // Slow drift
    z.vx += (Math.random() - 0.5) * 0.0005;
    z.vy += (Math.random() - 0.5) * 0.0005;
    z.vx *= 0.98; z.vy *= 0.98;
  }

  // ── Step Affects ──────────────────────────────────────────────────────────
  for (let i = affects.length - 1; i >= 0; i--) {
    const a = affects[i];
    a.life--;
    if (a.life <= 0) { affects.splice(i, 1); continue; }

    a.phase += dt * (0.6 + a.intensity * 0.8);
    let fx = 0, fy = 0;

    // Zone influence
    for (const z of zones) {
      const dx = z.x - a.x, dy = z.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
      if (d < z.radius) {
        const pull = z.strength * (1 - d / z.radius) * 0.10;
        fx += (dx / d) * pull;
        fy += (dy / d) * pull;
        // Zone modulates intensity
        a.intensity = Math.min(1, a.intensity + z.strength * 0.01 * dt);
        // Hue blending
        a.hue += (z.hue - a.hue) * 0.01 * dt;
      }
    }

    // Noise (slow drift)
    fx += Math.sin(time * 1.2 + i * 1.3) * params.ruido * 0.02;
    fy += Math.cos(time * 1.2 + i * 0.9) * params.ruido * 0.02;

    // Intensity pulse
    const pulse = Math.sin(a.phase) * params.intensidade * 0.02;
    a.intensity = Math.max(0.05, Math.min(1, a.intensity + pulse * dt));

    // Deposit to consistency field
    const sz = MP_FIELD_RES;
    const gx = Math.max(0, Math.min(sz - 1, ((a.x + 1) * 0.5 * sz) | 0));
    const gy = Math.max(0, Math.min(sz - 1, ((a.y + 1) * 0.5 * sz) | 0));
    fields.consistency[gy * sz + gx] = Math.min(1,
      fields.consistency[gy * sz + gx] + a.intensity * 0.035 * dt);

    // Integrate — contemplative drift, high drag
    a.vx = (a.vx + fx * dt) * 0.975;
    a.vy = (a.vy + fy * dt) * 0.975;
    const spd = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
    if (spd > 0.006) { a.vx = (a.vx / spd) * 0.006; a.vy = (a.vy / spd) * 0.006; }
    a.x += a.vx; a.y += a.vy;
    a.x = Math.max(-0.95, Math.min(0.95, a.x));
    a.y = Math.max(-0.95, Math.min(0.95, a.y));

    // Trail
    a.trailX.push(a.x); a.trailY.push(a.y);
    if (a.trailX.length > TRAIL_LEN) { a.trailX.shift(); a.trailY.shift(); }
  }

  // Spawn new affects to maintain density
  const targetCount = 50 + Math.round(params.densidade * 300);
  while (affects.length < targetCount && affects.length < MAX_AFFECTS) {
    const ang = Math.random() * TWO_PI;
    const rd = 0.1 + Math.random() * 0.4;
    const ax = Math.cos(ang) * rd, ay = Math.sin(ang) * rd;
    affects.push({
      x: ax, y: ay, vx: (Math.random() - 0.5) * 0.005, vy: (Math.random() - 0.5) * 0.005,
      intensity: 0.2 + Math.random() * 0.4,
      hue: Math.random() * 360, phase: Math.random() * TWO_PI,
      life: 400 + Math.floor(Math.random() * 800),
      trailX: [ax], trailY: [ay],
    });
  }

  // ── Cruelty accumulation → Rupture ────────────────────────────────────────
  let crueltyInput = 0;
  // Cruelty increases from high intensity + density
  const avgIntensity = affects.length > 0
    ? affects.reduce((s, a) => s + a.intensity, 0) / affects.length : 0;
  crueltyInput += avgIntensity * params.intensidade * 0.05 * dt;
  crueltyInput += (affects.length / MAX_AFFECTS) * params.densidade * 0.03 * dt;

  state.crueltyAccum = Math.min(1, state.crueltyAccum + crueltyInput);

  // Rupture threshold (low crueldade param = easier ruptures)
  const threshold = 0.3 + (1 - params.crueldade) * 0.5;
  if (state.crueltyAccum > threshold) {
    state.crueltyAccum = 0;
    state.ruptureCount++;

    // Pick a point for the rupture (highest density zone)
    let rx = 0, ry = 0;
    if (zones.length > 0) {
      const z = zones[Math.floor(Math.random() * zones.length)];
      rx = z.x; ry = z.y;
    }

    // Burst: push affects away from rupture point
    for (const a of affects) {
      const dx = a.x - rx, dy = a.y - ry;
      const d2 = dx * dx + dy * dy;
      if (d2 < 0.09 && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = (1 - d / 0.3) * 0.04;
        a.vx += (dx / d) * push;
        a.vy += (dy / d) * push;
        a.intensity = Math.min(1, a.intensity + 0.3);
      }
    }

    // Break an organ connection near the rupture
    for (const o of organs) {
      const dx = o.x - rx, dy = o.y - ry;
      if (dx * dx + dy * dy < 0.15 && o.connections.length > 1) {
        o.connections.pop();
        o.health = Math.max(0.05, o.health - 0.2);
        break;
      }
    }

    events.push({
      time, x: rx, y: ry, type: 'ruptura',
      message: `Ruptura — crueldade excedeu limiar (${state.ruptureCount})`,
      color: '#ef4444', ttl: 180,
    });
  }

  // ── Decay events ──────────────────────────────────────────────────────────
  for (let i = events.length - 1; i >= 0; i--) {
    events[i].ttl--;
    if (events[i].ttl <= 0) events.splice(i, 1);
  }
}
