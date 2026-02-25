// ─── Mil Platôs — Engine (orchestrator) ─────────────────────────────────────
// Coordinates CsO + Rizoma + Fields + Interventions + Metrics.
// All layers share the same world and field grids.

import type {
  MPWorldState, MPParams, MPFields, MPMetrics, MPOverlay,
  CSOState, RhizomeState, RhizomeEdge, PlateauLabel,
} from './milplatosTypes';
import { MP_FIELD_RES, createMPFields, computeK, createMPMetrics } from './milplatosTypes';
import { createCSOState, stepCSO } from './csoLayer';
import { createRhizomeState, stepRhizome, buildRhizomeEdges, computeHubDominance } from './rhizomeLayer';

// ── Create World ────────────────────────────────────────────────────────────
export function createMPWorld(params: MPParams): MPWorldState {
  return {
    cso: createCSOState(params),
    rhizome: createRhizomeState(),
    fields: createMPFields(),
    time: 0,
    tick: 0,
  };
}

// ── Field decay/diffusion (10Hz) ────────────────────────────────────────────
function stepFields(fields: MPFields, params: MPParams, dt: number): void {
  const n = MP_FIELD_RES * MP_FIELD_RES;
  const sz = MP_FIELD_RES;

  // Decay
  const memDecay = (1 - params.territorializacao * 0.5 - params.reterritorializacao * 0.3) * 0.03 * dt;
  const consDecay = 0.004 * dt;
  for (let i = 0; i < n; i++) {
    fields.territory[i] = Math.max(0, fields.territory[i] - memDecay);
    fields.consistency[i] = Math.max(0, fields.consistency[i] - consDecay);
  }

  // Diffusion pass for territory
  if (params.territorializacao > 0.2) {
    const diff = params.territorializacao * 0.012 * dt;
    for (let y = 1; y < sz - 1; y++) {
      for (let x = 1; x < sz - 1; x++) {
        const idx = y * sz + x;
        const avg = (fields.territory[idx - 1] + fields.territory[idx + 1] +
                     fields.territory[idx - sz] + fields.territory[idx + sz]) * 0.25;
        fields.territory[idx] += (avg - fields.territory[idx]) * diff;
      }
    }
  }
}

// ── Main Step ───────────────────────────────────────────────────────────────
export function stepMPWorld(world: MPWorldState, params: MPParams, dt: number): void {
  dt = Math.min(dt, 0.04);
  world.time += dt;
  world.tick++;

  stepCSO(world.cso, params, world.fields, world.time, dt);
  stepRhizome(world.rhizome, params, world.fields, world.time, dt);
  stepFields(world.fields, params, dt);
}

// ── Intervention Tools ──────────────────────────────────────────────────────
export function applyIntervention(
  world: MPWorldState, tool: string,
  wx: number, wy: number, params: MPParams, radius = 0.15,
): void {
  const { fields, cso } = world;
  const sz = MP_FIELD_RES;

  switch (tool) {
    case 'criarIntensidade': {
      const count = 5 + Math.floor(params.densidade * 10);
      for (let i = 0; i < count && cso.affects.length < 500; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius * 0.6;
        cso.affects.push({
          x: wx + Math.cos(angle) * dist,
          y: wy + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 0.008,
          vy: (Math.random() - 0.5) * 0.008,
          intensity: 0.5 + Math.random() * 0.4,
          hue: Math.random() * 360,
          phase: Math.random() * Math.PI * 2,
          life: 600 + Math.floor(Math.random() * 800),
          trailX: [wx], trailY: [wy],
        });
      }
      break;
    }
    case 'empurrar': {
      for (const n of world.rhizome.nodes) {
        const dx = n.x - wx, dy = n.y - wy;
        const d2 = dx * dx + dy * dy;
        if (d2 < radius * radius && d2 > 1e-6) { const d = Math.sqrt(d2); n.vx += (dx / d) * 0.01 * (1 - d / radius); n.vy += (dy / d) * 0.01 * (1 - d / radius); }
      }
      for (const a of cso.affects) {
        const dx = a.x - wx, dy = a.y - wy;
        const d2 = dx * dx + dy * dy;
        if (d2 < radius * radius && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (1 - d / radius) * 0.03;
          a.vx += (dx / d) * push;
          a.vy += (dy / d) * push;
        }
      }
      for (const o of cso.organs) {
        const dx = o.x - wx, dy = o.y - wy;
        const d2 = dx * dx + dy * dy;
        if (d2 < radius * radius && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          o.vx += (dx / d) * 0.008 * (1 - d / radius);
          o.vy += (dy / d) * 0.008 * (1 - d / radius);
        }
      }
      break;
    }
    case 'puxar': {
      for (const o of cso.organs) {
        const dx = wx - o.x, dy = wy - o.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < (radius * 2) * (radius * 2) && d2 > 1e-6) { const d = Math.sqrt(d2); const pull = Math.min(0.01, 0.003 / (d + 0.01)); o.vx += (dx / d) * pull; o.vy += (dy / d) * pull; }
      }
      for (const n of world.rhizome.nodes) {
        const dx = wx - n.x, dy = wy - n.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < (radius * 2) * (radius * 2) && d2 > 1e-6) { const d = Math.sqrt(d2); const pull = Math.min(0.01, 0.003 / (d + 0.01)); n.vx += (dx / d) * pull; n.vy += (dy / d) * pull; }
      }
      for (const a of cso.affects) {
        const dx = wx - a.x, dy = wy - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < (radius * 2) * (radius * 2) && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const pull = Math.min(0.02, 0.005 / (d + 0.01));
          a.vx += (dx / d) * pull;
          a.vy += (dy / d) * pull;
        }
      }
      break;
    }
    case 'sopro': {
      for (const a of cso.affects) {
        const dx = a.x - wx, dy = a.y - wy;
        if (dx * dx + dy * dy < radius * radius) {
          a.vx += (Math.random() - 0.5) * 0.025;
          a.vy += (Math.random() - 0.5) * 0.025;
          a.intensity = Math.min(1, a.intensity + 0.15);
        }
      }
      for (const o of cso.organs) {
        const dx = o.x - wx, dy = o.y - wy;
        if (dx * dx + dy * dy < radius * radius) {
          o.vx += (Math.random() - 0.5) * 0.01;
          o.vy += (Math.random() - 0.5) * 0.01;
        }
      }
      break;
    }
    case 'selo': {
      const gx0 = ((wx + 1) * 0.5 * sz) | 0;
      const gy0 = ((wy + 1) * 0.5 * sz) | 0;
      const r = Math.max(1, (radius * 0.5 * sz) | 0);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const gx = gx0 + dx, gy = gy0 + dy;
          if (gx < 0 || gx >= sz || gy < 0 || gy >= sz) continue;
          if (dx * dx + dy * dy > r * r) continue;
          const falloff = 1 - Math.sqrt(dx * dx + dy * dy) / r;
          fields.territory[gy * sz + gx] = Math.min(1, fields.territory[gy * sz + gx] + 0.7 * falloff);
        }
      }
      break;
    }
    case 'rasura': {
      const gx0 = ((wx + 1) * 0.5 * sz) | 0;
      const gy0 = ((wy + 1) * 0.5 * sz) | 0;
      const r = Math.max(1, (radius * 0.5 * sz) | 0);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const gx = gx0 + dx, gy = gy0 + dy;
          if (gx < 0 || gx >= sz || gy < 0 || gy >= sz) continue;
          if (dx * dx + dy * dy > r * r) continue;
          const idx = gy * sz + gx;
          fields.territory[idx] = 0;
          fields.consistency[idx] = 0;
        }
      }
      break;
    }
    case 'fuga': {
      for (const a of cso.affects) {
        const dx = a.x - wx, dy = a.y - wy;
        const d2 = dx * dx + dy * dy;
        if (d2 < radius * radius && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const force = (1 - d / radius) * 0.04;
          a.vx += (dx / d) * force;
          a.vy += (dy / d) * force;
        }
      }
      for (const n of world.rhizome.nodes) {
        const dx = n.x - wx, dy = n.y - wy;
        const d2 = dx * dx + dy * dy;
        if (d2 < radius * radius && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          n.vx += (dx / d) * 0.015 * (1 - d / radius);
          n.vy += (dy / d) * 0.015 * (1 - d / radius);
        }
      }
      break;
    }

    case 'criarOrgao': {
      const id = cso.nextId++;
      const newOrgan = {
        id, x: wx, y: wy, vx: 0, vy: 0,
        radius: 0.03 + Math.random() * 0.04,
        importance: 0.3 + Math.random() * 0.5,
        connections: [] as number[],
        hue: 200 + Math.random() * 50,
        health: 1.0,
      };
      // Connect to nearest existing organ
      let nearestOrgan = null as any, nearestDist = Infinity;
      for (const o of cso.organs) {
        const d = Math.sqrt((o.x - wx) ** 2 + (o.y - wy) ** 2);
        if (d < nearestDist) { nearestDist = d; nearestOrgan = o; }
      }
      if (nearestOrgan && nearestDist < 0.5) {
        newOrgan.connections.push(nearestOrgan.id);
        nearestOrgan.connections.push(id);
      }
      cso.organs.push(newOrgan);
      cso.events.push({ time: world.time, x: wx, y: wy, type: 'nascimento', message: 'Novo orgao criado', color: '#60a5fa', ttl: 120 });
      break;
    }
    case 'criarNoRizoma': {
      const id = world.rhizome.nextId++;
      const newNode = {
        id, x: wx, y: wy, vx: 0, vy: 0,
        isEntry: false, connections: [] as number[],
        heat: 0.5, age: 0, territory: 0.3,
      };
      let nearestNode = null as any, nearestDist2 = Infinity;
      for (const n of world.rhizome.nodes) {
        const d = Math.sqrt((n.x - wx) ** 2 + (n.y - wy) ** 2);
        if (d < nearestDist2) { nearestDist2 = d; nearestNode = n; }
      }
      if (nearestNode && nearestDist2 < 0.5) {
        newNode.connections.push(nearestNode.id);
        nearestNode.connections.push(id);
      }
      world.rhizome.nodes.push(newNode);
      break;
    }
    case 'criarEntrada': {
      const id = world.rhizome.nextId++;
      const newEntry = {
        id, x: wx, y: wy, vx: 0, vy: 0,
        isEntry: true, connections: [] as number[],
        heat: 0.8, age: 0, territory: 0.1,
      };
      let nearestNode3 = null as any, nearestDist3 = Infinity;
      for (const n of world.rhizome.nodes) {
        const d = Math.sqrt((n.x - wx) ** 2 + (n.y - wy) ** 2);
        if (d < nearestDist3) { nearestDist3 = d; nearestNode3 = n; }
      }
      if (nearestNode3 && nearestDist3 < 0.6) {
        newEntry.connections.push(nearestNode3.id);
        nearestNode3.connections.push(id);
      }
      world.rhizome.nodes.push(newEntry);
      cso.events.push({ time: world.time, x: wx, y: wy, type: 'nascimento', message: 'Nova entrada rizomatica', color: '#34d399', ttl: 120 });
      break;
    }
    case 'criarZona': {
      cso.zones.push({
        x: wx, y: wy, vx: (Math.random() - 0.5) * 0.002, vy: (Math.random() - 0.5) * 0.002,
        radius: 0.12 + Math.random() * 0.15,
        strength: 0.4 + Math.random() * 0.4,
        hue: Math.random() * 360, pulse: Math.random() * Math.PI * 2,
      });
      break;
    }
    case 'remover': {
      let bestType = '', bestIdx = -1, bestD = 0.1;
      for (let i = 0; i < cso.organs.length; i++) {
        const o = cso.organs[i];
        const d = Math.sqrt((o.x - wx) ** 2 + (o.y - wy) ** 2);
        if (d < bestD) { bestD = d; bestType = 'organ'; bestIdx = i; }
      }
      for (let i = 0; i < world.rhizome.nodes.length; i++) {
        const n = world.rhizome.nodes[i];
        const d = Math.sqrt((n.x - wx) ** 2 + (n.y - wy) ** 2);
        if (d < bestD) { bestD = d; bestType = 'rnode'; bestIdx = i; }
      }
      for (let i = 0; i < cso.zones.length; i++) {
        const z = cso.zones[i];
        const d = Math.sqrt((z.x - wx) ** 2 + (z.y - wy) ** 2);
        if (d < bestD) { bestD = d; bestType = 'zone'; bestIdx = i; }
      }
      if (bestType === 'organ' && bestIdx >= 0) {
        const removed = cso.organs[bestIdx];
        for (const o of cso.organs) { o.connections = o.connections.filter(c => c !== removed.id); }
        cso.organs.splice(bestIdx, 1);
        cso.events.push({ time: world.time, x: wx, y: wy, type: 'dissolucao', message: 'Orgao removido', color: '#ef4444', ttl: 120 });
      } else if (bestType === 'rnode' && bestIdx >= 0) {
        const removed = world.rhizome.nodes[bestIdx];
        for (const n of world.rhizome.nodes) { n.connections = n.connections.filter(c => c !== removed.id); }
        world.rhizome.nodes.splice(bestIdx, 1);
        cso.events.push({ time: world.time, x: wx, y: wy, type: 'dissolucao', message: 'No rizoma removido', color: '#ef4444', ttl: 120 });
      } else if (bestType === 'zone' && bestIdx >= 0) {
        cso.zones.splice(bestIdx, 1);
        cso.events.push({ time: world.time, x: wx, y: wy, type: 'dissolucao', message: 'Zona removida', color: '#ef4444', ttl: 120 });
      }
      break;
    }
    case 'gradiente': {
      const gx0 = ((wx + 1) * 0.5 * sz) | 0;
      const gy0 = ((wy + 1) * 0.5 * sz) | 0;
      const r = Math.max(1, (radius * 0.75 * sz) | 0);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const gx = gx0 + dx, gy = gy0 + dy;
          if (gx < 0 || gx >= sz || gy < 0 || gy >= sz) continue;
          if (dx * dx + dy * dy > r * r) continue;
          const falloff = 1 - Math.sqrt(dx * dx + dy * dy) / r;
          fields.consistency[gy * sz + gx] = Math.min(1, fields.consistency[gy * sz + gx] + 0.5 * falloff);
        }
      }
      break;
    }
  }
}

// ── Compute Metrics (call at 5-10 Hz) ───────────────────────────────────────
export function computeMPMetrics(world: MPWorldState, params: MPParams, fps: number): MPMetrics {
  const { cso, rhizome, fields } = world;

  // Mean intensity
  const nAff = cso.affects.length;
  let sumIntensity = 0;
  for (const a of cso.affects) sumIntensity += a.intensity;
  const meanIntensity = nAff > 0 ? sumIntensity / nAff : 0;

  // Hub dominance
  const hubDominance = computeHubDominance(rhizome.nodes);

  // Edges
  const edges = buildRhizomeEdges(rhizome);

  // Field entropy (consistency)
  const fn = MP_FIELD_RES * MP_FIELD_RES;
  let consSum = 0, terrSum = 0;
  for (let i = 0; i < fn; i++) { consSum += fields.consistency[i]; terrSum += fields.territory[i]; }
  const memoryLoad = terrSum / fn;

  let entropy = 0;
  const totalField = consSum + terrSum;
  if (totalField > 0.01) {
    for (let i = 0; i < fn; i++) {
      const p = (fields.consistency[i] + fields.territory[i]) / totalField;
      if (p > 1e-6) entropy -= p * Math.log2(p);
    }
    entropy = Math.min(1, entropy / Math.log2(fn));
  }

  const K = computeK(params);

  // Plateau score (stability proxy)
  const stabilityFactors = [
    1 - Math.abs(meanIntensity - 0.5) * 0.5,
    hubDominance > 0.1 ? 1 - Math.abs(hubDominance - 0.5) : 0.3,
    Math.min(1, nAff / 100),
  ];
  const plateauScore = Math.max(0, stabilityFactors.reduce((a, b) => a + b, 0) / stabilityFactors.length);

  // Plateau label
  let plateauLabel: PlateauLabel = 'Indeterminado';
  if (plateauScore > 0.45) {
    if (K > 0.65 && hubDominance > 0.4) plateauLabel = 'Captura (Proto-Estado)';
    else if (K < 0.25 && meanIntensity > 0.5) plateauLabel = 'Simbiose Vibrante';
    else if (params.linhasDeFuga > 0.5) plateauLabel = 'Nomadismo';
    else if (hubDominance > 0.5 && params.linhasDeFuga > 0.3) plateauLabel = 'Metástase';
    else if (memoryLoad > 0.2 && K > 0.4) plateauLabel = 'Reterritorialização';
    else if (params.desorganizacao > 0.6 && meanIntensity > 0.6) plateauLabel = 'Delírio Controlado';
    else plateauLabel = 'Simbiose Vibrante';
  }

  return {
    fps, nAffects: nAff, nOrgans: cso.organs.length,
    nRhizomeNodes: rhizome.nodes.length, nRhizomeEdges: edges.length,
    hubDominance, plateauScore, plateauLabel,
    fieldEntropy: entropy, memoryLoad, K,
    meanIntensity,
    ruptureRate: cso.ruptureCount,
    crueltyPressure: cso.crueltyAccum,
  };
}

export { buildRhizomeEdges } from './rhizomeLayer';
