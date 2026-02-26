// ── Rhizome: Simulation Engine ────────────────────────────────────────────────
// Physics model: nodes navigate vacuum via exploration drift,
// then get "captured" into networks via spring forces on edges.
// Lines of flight create long-distance spring bridges with momentum.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  RhizomeNode, RhizomeParams, RhizomeState, RhizomeMetrics, RhizomeAesthetics,
} from './rhizomeTypes';
import {
  MAX_NODES, CANVAS_PAD, LONG_LINK_DISTANCE, ENTRY_START,
  BASE_NODE_RADIUS, DEFAULT_AESTHETICS,
} from './rhizomeTypes';
import type { Camera3D } from './rhizomeTypes';
import { getCategoryColor } from './rhizomeLLM';

// ── Seedable RNG ──────────────────────────────────────────────────────────────
interface SeedRng { next: () => number; getState: () => number; setState: (v: number) => void; }

function makeRng(seed: number): SeedRng {
  let s = (Math.abs(seed | 0) % 2147483647) || 1;
  return {
    next():            number { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; },
    getState():        number { return s; },
    setState(v: number)       { s = v; },
  };
}

function lerp(a: number, b: number, t: number):          number { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number):       number { return v < lo ? lo : v > hi ? hi : v; }
function dist(a: RhizomeNode, b: RhizomeNode):           number { const dx = a.x-b.x, dy=a.y-b.y; return Math.sqrt(dx*dx+dy*dy); }
function dist2(ax:number,ay:number,bx:number,by:number): number { const dx=ax-bx,dy=ay-by; return Math.sqrt(dx*dx+dy*dy); }

function gaussian(r: () => number): number {
  const u1 = r() || 0.0001, u2 = r();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function nodeDegree(n: RhizomeNode): number { return n.connections.size; }

// ── Create initial state ──────────────────────────────────────────────────────
export function createRhizomeState(
  W: number, H: number, seed: number, params: RhizomeParams,
): RhizomeState {
  const rng  = makeRng(seed);
  const nodes: RhizomeNode[] = [];
  let nextId = 0;

  // Entry positions at triangle vertices
  const entryPositions = [
    { x: W * 0.25, y: H * 0.35 },
    { x: W * 0.75, y: H * 0.35 },
    { x: W * 0.50, y: H * 0.72 },
  ];

  for (let i = 0; i < ENTRY_START; i++) {
    nodes.push({
      id: nextId++,
      x: entryPositions[i].x, y: entryPositions[i].y,
      vx: (rng.next()-0.5)*15, vy: (rng.next()-0.5)*15,
      heat: 1.0, isEntry: true, age: 0,
      connections: new Map(),
    });
  }

  // Connect entries
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (rng.next() < 0.55) {
        const w = 0.4 + rng.next() * 0.2;
        nodes[i].connections.set(nodes[j].id, w);
        nodes[j].connections.set(nodes[i].id, w);
      }
    }
  }

  // Create ~14 initial nodes (some near entries, some drifting freely)
  const initCount = 14;
  for (let k = 0; k < initCount; k++) {
    const freeFloat = rng.next() < 0.3; // 30% start drifting in vacuum

    let nx: number, ny: number;
    if (freeFloat) {
      nx = CANVAS_PAD + rng.next() * (W - 2 * CANVAS_PAD);
      ny = CANVAS_PAD + rng.next() * (H - 2 * CANVAS_PAD);
    } else {
      const entryIdx = Math.floor(rng.next() * ENTRY_START);
      const entry    = nodes[entryIdx];
      const sigma    = 70;
      nx = clamp(entry.x + gaussian(rng.next.bind(rng)) * sigma, CANVAS_PAD, W - CANVAS_PAD);
      ny = clamp(entry.y + gaussian(rng.next.bind(rng)) * sigma, CANVAS_PAD, H - CANVAS_PAD);
    }

    const newNode: RhizomeNode = {
      id: nextId++, x: nx, y: ny,
      vx: (rng.next()-0.5)*30, vy: (rng.next()-0.5)*30,
      heat: 0.4 + rng.next() * 0.4, isEntry: false, age: 0,
      connections: new Map(),
    };

    if (!freeFloat) {
      // Connect to nearest entry
      let nearEntry = nodes[0];
      let nearDist  = Infinity;
      for (let e = 0; e < ENTRY_START; e++) {
        const d = dist2(newNode.x, newNode.y, nodes[e].x, nodes[e].y);
        if (d < nearDist) { nearDist = d; nearEntry = nodes[e]; }
      }
      const w = 0.4 + rng.next() * 0.4;
      newNode.connections.set(nearEntry.id, w);
      nearEntry.connections.set(newNode.id, w);
    }
    nodes.push(newNode);
  }

  return {
    nodes, nextId,
    params: { ...params },
    aesthetics: { ...DEFAULT_AESTHETICS },
    growthTimer: 0, entryTimer: 0, forgetTimer: 0, reterritTimer: 0,
    seed, rngState: rng.getState(),
  };
}

// ── Add node interactively ────────────────────────────────────────────────────
export function addNodeAtPosition(
  state: RhizomeState,
  x: number, y: number,
  W: number, H: number,
  label?: string,
): RhizomeNode {
  const node: RhizomeNode = {
    id:    state.nextId++,
    x:     clamp(x, CANVAS_PAD, W - CANVAS_PAD),
    y:     clamp(y, CANVAS_PAD, H - CANVAS_PAD),
    vx:    (Math.random() - 0.5) * 25,
    vy:    (Math.random() - 0.5) * 25,
    heat:  1.0,
    isEntry:   false,
    age:       0,
    connections: new Map(),
    label,
    userPlaced: true,
  };

  // Auto-connect to the nearest node
  if (state.nodes.length > 0) {
    let nearest: RhizomeNode | null  = null;
    let nearestDist                   = Infinity;
    for (const n of state.nodes) {
      const d = dist2(node.x, node.y, n.x, n.y);
      if (d < nearestDist) { nearestDist = d; nearest = n; }
    }
    if (nearest) {
      const w = 0.55 + Math.random() * 0.3;
      node.connections.set(nearest.id, w);
      nearest.connections.set(node.id, w);
      nearest.heat = Math.min(1, nearest.heat + 0.6);
    }

    // If close enough, also connect to a second nearby node
    if (state.nodes.length > 1 && nearestDist < 200) {
      let second: RhizomeNode | null = null;
      let secondDist                 = Infinity;
      for (const n of state.nodes) {
        if (node.connections.has(n.id)) continue;
        const d = dist2(node.x, node.y, n.x, n.y);
        if (d < secondDist && d < 300) { secondDist = d; second = n; }
      }
      if (second) {
        const w2 = 0.35 + Math.random() * 0.3;
        node.connections.set(second.id, w2);
        second.connections.set(node.id, w2);
      }
    }
  }

  state.nodes.push(node);
  return node;
}

// ── Tick ───────────────────────────────────────────────────────────────────────
export function tickRhizome(
  state: RhizomeState, W: number, H: number, rawDt: number,
): void {
  const dt = Math.min(rawDt, 0.033);
  const p  = state.params;
  const rng = makeRng(0);
  rng.setState(state.rngState);
  const r = rng.next.bind(rng);

  const entryRateSec  = lerp(9.0, 2.0, p.multiplicidade);
  const growthRateSec = lerp(1.8, 0.35, p.multiplicidade);

  state.entryTimer    += dt;
  state.growthTimer   += dt;
  state.forgetTimer   += dt;
  state.reterritTimer += dt;

  for (const n of state.nodes) n.age += dt;

  // ── Spawn entries ──────────────────────────────────────────────────────────
  if (state.entryTimer >= entryRateSec) {
    state.entryTimer = 0;
    const burstCount = Math.floor(1 + p.multiplicidade * 2);
    const entries    = state.nodes.filter(n => n.isEntry);

    for (let b = 0; b < burstCount; b++) {
      if (state.nodes.length >= MAX_NODES) break;
      let bestX = CANVAS_PAD + r() * (W - 2 * CANVAS_PAD);
      let bestY = CANVAS_PAD + r() * (H - 2 * CANVAS_PAD);
      let bestMinDist = 0;

      for (let attempt = 0; attempt < 14; attempt++) {
        const cx = CANVAS_PAD + r() * (W - 2 * CANVAS_PAD);
        const cy = CANVAS_PAD + r() * (H - 2 * CANVAS_PAD);
        let minD = Infinity;
        for (const e of entries) { const d = dist2(e.x,e.y,cx,cy); if(d<minD) minD=d; }
        if (minD > 180) { bestX = cx; bestY = cy; break; }
        if (minD > bestMinDist) { bestMinDist = minD; bestX = cx; bestY = cy; }
      }

      const newEntry: RhizomeNode = {
        id: state.nextId++, x: bestX, y: bestY,
        vx: (r()-0.5)*20, vy: (r()-0.5)*20,
        heat: 1, isEntry: true, age: 0, connections: new Map(),
      };

      const connCount = 1 + Math.floor(r() * 3);
      for (let c = 0; c < connCount && state.nodes.length > 0; c++) {
        let bestNode: RhizomeNode | null = null; let bestScore = -1;
        for (let s2 = 0; s2 < 4; s2++) {
          const cand = state.nodes[Math.floor(r() * state.nodes.length)];
          if (newEntry.connections.has(cand.id)) continue;
          const d = dist2(cand.x,cand.y,newEntry.x,newEntry.y);
          const score = 1 / (d + 1);
          if (score > bestScore) { bestScore = score; bestNode = cand; }
        }
        if (bestNode) {
          const w = 0.4 + r() * 0.3;
          newEntry.connections.set(bestNode.id, w);
          bestNode.connections.set(newEntry.id, w);
        }
      }
      state.nodes.push(newEntry);
      entries.push(newEntry);
    }
  }

  // ── Growth ─────────────────────────────────────────────────────────────────
  if (state.growthTimer >= growthRateSec) {
    state.growthTimer = 0;
    const growBurstCount = Math.floor(1 + p.density * 2);

    for (let b = 0; b < growBurstCount; b++) {
      if (state.nodes.length >= MAX_NODES) break;
      if (state.nodes.length === 0) break; // nothing to branch from yet

      let parent: RhizomeNode;
      if (p.hubs > 0 && state.nodes.length > 0) {
        const pw = lerp(0.2, 1.4, p.hubs);
        let bestParent = state.nodes[Math.floor(r() * state.nodes.length)];
        let bestVal    = Math.pow(nodeDegree(bestParent) + 1, pw);
        for (let s2 = 1; s2 < 6; s2++) {
          const cand = state.nodes[Math.floor(r() * state.nodes.length)];
          const val  = Math.pow(nodeDegree(cand) + 1, pw);
          if (val > bestVal) { bestVal = val; bestParent = cand; }
        }
        parent = bestParent;
      } else {
        parent = state.nodes[Math.floor(r() * state.nodes.length)];
      }

      if (!parent) break; // extra guard: should never happen but prevents crash

      // Wider spawn sigma — more malleable, nodes born farther from parent
      const sigma = lerp(110, 30, p.territorializacao);
      const nx    = clamp(parent.x + gaussian(r) * sigma, CANVAS_PAD, W - CANVAS_PAD);
      const ny    = clamp(parent.y + gaussian(r) * sigma, CANVAS_PAD, H - CANVAS_PAD);

      const child: RhizomeNode = {
        id: state.nextId++, x: nx, y: ny,
        vx: (r()-0.5)*40, vy: (r()-0.5)*40,
        heat: 0.6 + r() * 0.3, isEntry: false, age: 0,
        connections: new Map(),
      };

      const w = 0.4 + r() * 0.4;
      child.connections.set(parent.id, w);
      parent.connections.set(child.id, w);

      // Optional second connection
      if (r() < p.reterritorializacao * 0.55 && state.nodes.length > 1) {
        let closestNode: RhizomeNode | null = null; let closestD = Infinity;
        const samples = Math.min(14, state.nodes.length);
        for (let s2 = 0; s2 < samples; s2++) {
          const cand = state.nodes[Math.floor(r() * state.nodes.length)];
          if (cand.id === parent.id || cand.id === child.id) continue;
          const d = dist2(cand.x, cand.y, child.x, child.y);
          if (d < closestD) { closestD = d; closestNode = cand; }
        }
        if (closestNode) {
          const w2 = 0.3 + r() * 0.3;
          child.connections.set(closestNode.id, w2);
          closestNode.connections.set(child.id, w2);
        }
      }
      state.nodes.push(child);
    }

    if (p.reterritorializacao > 0) doReterritorialization(state, r);
  }

  if (state.reterritTimer >= 0.5) {
    state.reterritTimer = 0;
    if (p.reterritorializacao > 0) doReterritorialization(state, r);
  }

  // ── Forces ─────────────────────────────────────────────────────────────────
  applyForces(state, W, H, dt, r);

  // ── Lines of flight ─────────────────────────────────────────────────────────
  if (r() < p.linhasDeFuga * 0.10) maybeLinesOfFlight(state, r);

  // ── Forgetting prune ────────────────────────────────────────────────────────
  if (state.forgetTimer >= 1.0) {
    state.forgetTimer = 0;
    forgettingPrune(state);
  }

  // ── Integrate + bounds ──────────────────────────────────────────────────────
  const maxV = lerp(80, 220, p.linhasDeFuga);
  for (const n of state.nodes) {
    if (n.pinned) { n.vx = 0; n.vy = 0; continue; }

    n.x += n.vx * dt;
    n.y += n.vy * dt;

    // Soft border bounce
    if (n.x < CANVAS_PAD)     { n.vx *= -0.55; n.x = CANVAS_PAD; }
    if (n.x > W - CANVAS_PAD) { n.vx *= -0.55; n.x = W - CANVAS_PAD; }
    if (n.y < CANVAS_PAD)     { n.vy *= -0.55; n.y = CANVAS_PAD; }
    if (n.y > H - CANVAS_PAD) { n.vy *= -0.55; n.y = H - CANVAS_PAD; }

    // Velocity cap
    const spd = Math.sqrt(n.vx*n.vx + n.vy*n.vy);
    if (spd > maxV) { n.vx = (n.vx/spd)*maxV; n.vy = (n.vy/spd)*maxV; }

    // Heat decay
    n.heat = clamp(n.heat * (1 - dt * 0.22), 0, 1);
  }

  state.rngState = rng.getState();
}

// ── Forces ────────────────────────────────────────────────────────────────────
function applyForces(
  state: RhizomeState, W: number, H: number, dt: number, r: () => number,
): void {
  const p       = state.params;
  const nodes   = state.nodes;
  const entries = nodes.filter(n => n.isEntry);

  // Build id->node map
  const nodeMap = new Map<number, RhizomeNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  for (const n of nodes) {
    if (n.pinned) continue;

    // ── 1. Damping (fluid, not flat) ─────────────────────────────────────
    const damp = lerp(0.96, 0.88, p.linhasDeFuga * 0.4 + p.noise * 0.3);
    n.vx *= damp;
    n.vy *= damp;

    // ── 2. Noise / exploration drift ───────────────────────────────────
    const degree = nodeDegree(n);
    // Isolated nodes drift more aggressively ("navigating the vacuum")
    const explorationFactor = degree === 0 ? 3.5 : degree === 1 ? 1.8 : 1.0;
    const noiseAmp = p.noise * 18 * explorationFactor;
    n.vx += (r() * 2 - 1) * noiseAmp;
    n.vy += (r() * 2 - 1) * noiseAmp;

    // Entry nodes drift with a bit more wander
    if (n.isEntry) {
      n.vx += (r() * 2 - 1) * p.noise * 10;
      n.vy += (r() * 2 - 1) * p.noise * 10;
    }

    // ── 3. Spring forces on edges (category-aware) ──────────────────────────
    for (const [neighborId, weight] of n.connections) {
      const neighbor = nodeMap.get(neighborId);
      if (!neighbor) continue;

      const dx = neighbor.x - n.x;
      const dy = neighbor.y - n.y;
      const d  = Math.sqrt(dx * dx + dy * dy) || 0.001;

      // Category-aware spring mechanics
      const sameCategory = n.category && neighbor.category &&
        n.category.toLowerCase() === neighbor.category.toLowerCase();
      const edgeRel = n.edgeTypes?.get(neighborId);
      const isBridge = edgeRel === 'bridges';
      const isLong = isBridge || d > LONG_LINK_DISTANCE;

      // Intra-cluster: short rest (tight clusters). Inter-cluster: long rest (spread apart).
      const restLen = isLong
        ? lerp(280, 500, p.linhasDeFuga)
        : sameCategory
          ? lerp(60, 140, 1 - p.territorializacao)
          : lerp(180, 380, 1 - p.territorializacao);

      // Intra-cluster springs are stronger, inter-cluster springs are weaker
      const springK = isLong
        ? lerp(4, 14, p.linhasDeFuga) * weight
        : sameCategory
          ? lerp(14, 35, p.reterritorializacao) * weight
          : lerp(4, 12, p.reterritorializacao) * weight * 0.5;

      const stretch = d - restLen;
      const fx = (dx / d) * springK * stretch * dt * 0.5;
      const fy = (dy / d) * springK * stretch * dt * 0.5;
      n.vx += fx;
      n.vy += fy;
    }

    // ── 4. Territorial pull toward nearest entry ──────────────────────────
    if (p.territorializacao > 0 && !n.isEntry && entries.length > 0) {
      let nearestEntry = entries[0];
      let nearestDist  = Infinity;
      for (const e of entries) {
        const d = dist2(e.x, e.y, n.x, n.y);
        if (d < nearestDist) { nearestDist = d; nearestEntry = e; }
      }
      // Only pull when reasonably far away
      if (nearestDist > 80 && nearestDist < 600) {
        const strength = p.territorializacao * 10;
        const dx = nearestEntry.x - n.x;
        const dy = nearestEntry.y - n.y;
        const inv = 1 / nearestDist;
        n.vx += dx * inv * strength * dt;
        n.vy += dy * inv * strength * dt;
      }
    }
  }

  // ── 5. Entry-to-entry repulsion ───────────────────────────────────────────
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i], b = entries[j];
      if (a.pinned && b.pinned) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < 300 && d > 0.01) {
        const repel = (1 - d / 300) * 140 * p.territorializacao;
        const inv   = 1 / d;
        if (!a.pinned) { a.vx -= dx * inv * repel * dt; a.vy -= dy * inv * repel * dt; }
        if (!b.pinned) { b.vx += dx * inv * repel * dt; b.vy += dy * inv * repel * dt; }
      }
    }
  }

  // ── 6. General node-node repulsion (stronger, category-aware) ──────────────
  const nn = nodes.length;
  // More samples for better separation
  const sampleCount = Math.min(500, nn * (nn - 1) / 2);
  for (let s = 0; s < sampleCount; s++) {
    const ai = Math.floor(r() * nn);
    const bi = Math.floor(r() * nn);
    if (ai === bi) continue;
    const a = nodes[ai], b = nodes[bi];
    if (a.pinned && b.pinned) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d  = Math.sqrt(dx * dx + dy * dy);

    // Different categories repel at much greater distance
    const sameCategory = a.category && b.category &&
      a.category.toLowerCase() === b.category.toLowerCase();
    const repRadius = sameCategory ? 55 : 120;
    const repForce  = sameCategory ? 60 : 160;

    if (d < repRadius && d > 0.01) {
      const repel = (1 - d / repRadius) * repForce;
      const inv   = 1 / d;
      if (!a.pinned) { a.vx -= dx * inv * repel * dt; a.vy -= dy * inv * repel * dt; }
      if (!b.pinned) { b.vx += dx * inv * repel * dt; b.vy += dy * inv * repel * dt; }
    }
  }

  // ── 7. "Capture" mechanism: isolated nodes near others form connections ────
  const captureRadius   = lerp(50, 120, p.linhasDeFuga);
  const captureProb     = p.linhasDeFuga * 0.05;
  // In search mode: disable random capture entirely — only LLM connections count
  if (!state.searchMode) {
    for (let i = 0; i < Math.min(10, nn); i++) {
      const idx = Math.floor(r() * nn);
      const nodeA = nodes[idx];
      if (nodeA.connections.size > 0) continue; // already connected

      // Find nearby node to connect to
      const jdx = Math.floor(r() * nn);
      const nodeB = nodes[jdx];
      if (jdx === idx || nodeB === nodeA) continue;

      // Category-aware: same category connects much more easily
      const sameCategory = nodeA.category && nodeB.category &&
        nodeA.category.toLowerCase() === nodeB.category.toLowerCase();
      const adjustedProb = sameCategory
        ? captureProb * 4   // 4x more likely same category
        : captureProb * 0.2; // 80% less likely different category

      const d2 = dist2(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
      if (d2 < captureRadius && r() < adjustedProb) {
        const w = 0.3 + r() * 0.4;
        nodeA.connections.set(nodeB.id, w);
        nodeB.connections.set(nodeA.id, w);
        nodeA.heat = Math.min(1, nodeA.heat + 0.5);
        nodeB.heat = Math.min(1, nodeB.heat + 0.3);
      }
    }
  }
}

// ── Lines of flight ────────────────────────────────────────────────────────────
function maybeLinesOfFlight(state: RhizomeState, r: () => number): void {
  const nodes = state.nodes;
  if (nodes.length < 2) return;

  // In search mode: flights should only happen between DIFFERENT categories
  // to maintain semantic integrity of the graph
  for (let attempt = 0; attempt < 12; attempt++) {
    const a = nodes[Math.floor(r() * nodes.length)];
    const b = nodes[Math.floor(r() * nodes.length)];
    if (a.id === b.id || (a.pinned && b.pinned)) continue;

    // In search mode: only cross-category flights
    if (state.searchMode) {
      const sameCategory = a.category && b.category &&
        a.category.toLowerCase() === b.category.toLowerCase();
      if (sameCategory || !a.category || !b.category) continue;
    }

    const d = dist(a, b);

    if (d > LONG_LINK_DISTANCE) {
      if (!a.connections.has(b.id)) {
        const w = 0.20 + r() * 0.30;
        a.connections.set(b.id, w);
        b.connections.set(a.id, w);
        a.heat = Math.min(1, a.heat + 0.45);
        b.heat = Math.min(1, b.heat + 0.45);

        // Tag as bridge
        if (!a.edgeTypes) a.edgeTypes = new Map();
        if (!b.edgeTypes) b.edgeTypes = new Map();
        a.edgeTypes.set(b.id, 'bridges');
        b.edgeTypes.set(a.id, 'bridges');

        const boostMag = 15 + r() * 20;
        const dx = b.x - a.x, dy = b.y - a.y;
        const inv = 1 / (d || 1);
        if (!a.pinned) { a.vx -= dx * inv * boostMag * 0.4; a.vy -= dy * inv * boostMag * 0.4; }
        if (!b.pinned) { b.vx += dx * inv * boostMag * 0.4; b.vy += dy * inv * boostMag * 0.4; }
        return;
      }
    }
  }
}

// ── Reterritorialization ───────────────────────────────────────────────────────
function doReterritorialization(state: RhizomeState, r: () => number): void {
  // In search mode: only strengthen existing connections, never create new random ones.
  // This prevents the LLM-generated semantic graph from being polluted by random edges.
  const p      = state.params;
  const nodes  = state.nodes;
  const sample = Math.min(35, nodes.length);

  for (let s = 0; s < sample; s++) {
    const n       = nodes[Math.floor(r() * nodes.length)];
    const nearest: { node: RhizomeNode; dist: number }[] = [];
    const nsamp   = Math.min(14, nodes.length);

    for (let c = 0; c < nsamp; c++) {
      const cand = nodes[Math.floor(r() * nodes.length)];
      if (cand.id === n.id) continue;
      const d = dist(n, cand);
      if (nearest.length < 2) { nearest.push({ node: cand, dist: d }); nearest.sort((a,b)=>a.dist-b.dist); }
      else if (d < nearest[1].dist) { nearest[1] = { node: cand, dist: d }; nearest.sort((a,b)=>a.dist-b.dist); }
    }

    for (const { node: neighbor } of nearest) {
      if (r() < p.reterritorializacao * 0.55) {
        if (n.connections.has(neighbor.id)) {
          // Strengthen existing connection
          const w = Math.min(1.0, (n.connections.get(neighbor.id)!) + 0.05);
          n.connections.set(neighbor.id, w);
          neighbor.connections.set(n.id, w);
        } else if (!state.searchMode) {
          // Only create new random connections outside search mode
          const sameCategory = n.category && neighbor.category &&
            n.category.toLowerCase() === neighbor.category.toLowerCase();
          // Only connect same-category nodes, and at lower probability
          if (sameCategory && r() < 0.3) {
            const w = 0.2 + r() * 0.25;
            n.connections.set(neighbor.id, w);
            neighbor.connections.set(n.id, w);
          }
        }
      }
    }
  }
}

// ── Forgetting prune ──────────────────────────────────────────────────────────
function forgettingPrune(state: RhizomeState): void {
  const p = state.params;
  if (p.esquecimento <= 0) return;

  const nodeMap = new Map<number, RhizomeNode>();
  for (const n of state.nodes) nodeMap.set(n.id, n);

  for (const n of state.nodes) {
    const toRemove: number[] = [];
    for (const [neighborId, weight] of n.connections) {
      const newW = weight * (1 - p.esquecimento * 0.09);
      if (newW < 0.07) { toRemove.push(neighborId); }
      else { n.connections.set(neighborId, newW); }
    }
    for (const id of toRemove) {
      n.connections.delete(id);
      nodeMap.get(id)?.connections.delete(n.id);
    }
  }

  // Remove isolated non-entry, non-userPlaced nodes (max 4 per tick)
  let removed = 0;
  state.nodes = state.nodes.filter(n => {
    if (removed >= 4) return true;
    if (!n.isEntry && !n.userPlaced && n.connections.size === 0) { removed++; return false; }
    return true;
  });
}

// ── Metrics ───────────────────────────────────────────────────────────────────
export function computeRhizomeMetrics(state: RhizomeState): RhizomeMetrics {
  const nodes = state.nodes;
  const nc    = nodes.length;
  if (nc === 0) return { nodeCount:0, entryCount:0, longLinkCount:0, avgDegree:0, hubness:0, isolatedCount:0 };

  let totalDegree = 0, maxDegree = 0, longLinks = 0, isolatedCount = 0;
  const seenEdges  = new Set<string>();
  const entryCount = nodes.filter(n => n.isEntry).length;

  for (const n of nodes) {
    const deg = n.connections.size;
    totalDegree += deg;
    if (deg > maxDegree) maxDegree = deg;
    if (deg === 0 && !n.isEntry) isolatedCount++;

    for (const [neighborId] of n.connections) {
      const key = n.id < neighborId ? `${n.id}-${neighborId}` : `${neighborId}-${n.id}`;
      if (!seenEdges.has(key)) {
        seenEdges.add(key);
        const neighbor = nodes.find(nd => nd.id === neighborId);
        if (neighbor && dist(n, neighbor) > LONG_LINK_DISTANCE) longLinks++;
      }
    }
  }

  return {
    nodeCount: nc, entryCount, longLinkCount: longLinks,
    avgDegree: totalDegree / nc, hubness: maxDegree / Math.max(1, nc),
    isolatedCount,
  };
}

// ── Render ─────────────────────────────────────────────────────────────────────
export function renderRhizome(
  ctx: CanvasRenderingContext2D,
  state: RhizomeState,
  W: number, H: number,
  overrideAesthetics?: Partial<RhizomeAesthetics>,
): void {
  const p    = state.params;
  const ae   = overrideAesthetics
    ? { ...state.aesthetics, ...overrideAesthetics }
    : state.aesthetics;
  const nodes = state.nodes;

  // Background
  ctx.fillStyle = ae.bgColor;
  ctx.fillRect(0, 0, W, H);

  if (nodes.length === 0) return;

  const nodeMap = new Map<number, RhizomeNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // ── Collect edges with semantic type ──────────────────────────────────────
  type EdgeRelType = string | undefined;
  const edges: { a: RhizomeNode; b: RhizomeNode; w: number; d: number; isLong: boolean; relation: EdgeRelType }[] = [];
  const seenEdges = new Set<string>();

  for (const n of nodes) {
    for (const [neighborId, weight] of n.connections) {
      const edgeKey = n.id < neighborId ? `${n.id}-${neighborId}` : `${neighborId}-${n.id}`;
      if (seenEdges.has(edgeKey)) continue;
      seenEdges.add(edgeKey);
      const neighbor = nodeMap.get(neighborId);
      if (!neighbor) continue;
      const d = dist(n, neighbor);
      const relation = n.edgeTypes?.get(neighborId) ?? neighbor.edgeTypes?.get(n.id);
      const isFlight = relation === 'bridges' || d > LONG_LINK_DISTANCE;
      edges.push({ a: n, b: neighbor, w: weight, d, isLong: isFlight, relation });
    }
  }

  edges.sort((a, b) => b.w - a.w);

  // Separate bridges from normal edges — bridges always render
  const bridgeEdges = edges.filter(e => e.relation === 'bridges' || e.isLong);
  const normalEdges = edges.filter(e => e.relation !== 'bridges' && !e.isLong);

  // Filter normal edges: only show edges above a minimum weight threshold
  const minWeight = 0.25;
  const visibleNormal = normalEdges.filter(e => e.w >= minWeight).slice(0, 100);
  const drawn = [...bridgeEdges, ...visibleNormal];

  // ── Edge color by semantic relation type ───────────────────────────────────
  const EDGE_COLORS: Record<string, string> = {
    influences: '#a78bfa',   // violet — genealogy
    contrasts:  '#ef4444',   // red — opposition/tension
    bridges:    '#f472b6',   // magenta — line of flight
    extends:    '#60a5fa',   // blue — development
    contains:   '#4ade80',   // green — subsumption
    co_occurs:  ae.linkColor, // default — co-occurrence
    method_for: '#fbbf24',   // yellow — methodology
    example_of: '#fb923c',   // orange — instance
    critiques:  '#f87171',   // light red — challenge
    related:    ae.linkColor, // default
  };

  // ── Draw links ──────────────────────────────────────────────────────────────
  const linkW     = lerp(0.5, 3.0, ae.linkWidth);
  const linkOpac  = ae.linkOpacity;
  ctx.lineCap = 'round';

  for (const e of drawn) {
    const edgeColor = e.relation ? (EDGE_COLORS[e.relation] ?? ae.linkColor) : ae.linkColor;

    if (e.isLong || e.relation === 'bridges') {
      const alpha = Math.min(0.95, 0.3 + e.w * 0.6);
      ctx.strokeStyle = e.relation === 'bridges' ? EDGE_COLORS.bridges : ae.flightColor;
      ctx.lineWidth   = linkW * (1.2 + e.w * 0.8);
      ctx.globalAlpha = alpha * linkOpac * (0.6 + ae.glowIntensity * 0.4);

      ctx.shadowColor = ctx.strokeStyle as string;
      ctx.shadowBlur  = 6 * ae.glowIntensity;
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (e.relation === 'contrasts' || e.relation === 'critiques') {
      // Tension/contrast edges: dashed red lines
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth   = linkW * 0.8;
      ctx.globalAlpha = linkOpac * e.w * 0.8;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
      ctx.setLineDash([]);
    } else if (e.relation === 'influences' || e.relation === 'extends') {
      // Genealogy/development edges: slightly thicker, colored
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth   = linkW * (0.8 + e.w * 0.5);
      ctx.globalAlpha = linkOpac * e.w;
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
    } else {
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth   = linkW;
      ctx.globalAlpha = linkOpac * e.w;
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // ── Draw nodes ──────────────────────────────────────────────────────────────
  const sizeScale  = lerp(0.4, 2.0, ae.nodeSize);
  const connScale  = lerp(0.1, 2.5, ae.connSizeScale ?? 0.5);
  const intensity  = 0.4 + p.organismToIntensity * 0.6;

  for (const n of nodes) {
    const deg    = Math.min(n.connections.size, 20); // Clamp degree to prevent infinite growth
    const relev  = n.relevance ?? 0.5;
    const relevMult = 1.0 + relev * lerp(0, 1.6, ae.relSizeScale ?? 0.5);
    const radius = (BASE_NODE_RADIUS + deg * 0.38 * p.hubs * 2.0 * connScale) * sizeScale * relevMult;

    // Color logic
    let fillColor: string;
    if (n.category) {
      fillColor = getCategoryColor(n.category);
    } else if (n.isEntry) {
      fillColor = ae.entryColor;
    } else if (deg >= 6 && p.hubs > 0.1) {
      fillColor = ae.hubColor;
    } else if (n.heat > 0.6) {
      fillColor = ae.hotColor;
    } else {
      fillColor = ae.nodeColor;
    }

    // Glow halo
    if (ae.glowIntensity > 0.05) {
      ctx.globalAlpha = 0.10 * intensity * ae.glowIntensity;
      ctx.fillStyle   = fillColor;
      ctx.shadowColor = fillColor;
      ctx.shadowBlur  = 14;
      ctx.beginPath(); ctx.arc(n.x, n.y, radius * 4.0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      ctx.globalAlpha = 0.22 * intensity * ae.glowIntensity;
      ctx.beginPath(); ctx.arc(n.x, n.y, radius * 2.0, 0, Math.PI * 2); ctx.fill();
    }

    // Core node
    ctx.globalAlpha = (0.65 + n.heat * 0.35) * intensity;
    ctx.fillStyle   = fillColor;
    ctx.beginPath(); ctx.arc(n.x, n.y, radius, 0, Math.PI * 2); ctx.fill();

    // Bridge indicator — double ring pulsing
    if (n.isBridge) {
      const pulse = Math.sin(n.age * 3) * 0.15 + 0.35;
      ctx.globalAlpha = pulse * intensity;
      ctx.strokeStyle = '#f472b6'; // magenta — line of flight color
      ctx.lineWidth   = 1.5;
      ctx.beginPath(); ctx.arc(n.x, n.y, radius + 6, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = pulse * 0.5 * intensity;
      ctx.beginPath(); ctx.arc(n.x, n.y, radius + 10, 0, Math.PI * 2); ctx.stroke();
    }

    // Hub indicator — solid outer ring
    if (n.isHub && !n.isBridge) {
      ctx.globalAlpha = 0.25 * intensity;
      ctx.strokeStyle = ae.hubColor;
      ctx.lineWidth   = 2;
      ctx.beginPath(); ctx.arc(n.x, n.y, radius + 5, 0, Math.PI * 2); ctx.stroke();
    }

    // Entry ring
    if (n.isEntry) {
      ctx.globalAlpha = 0.18 * intensity;
      ctx.strokeStyle = ae.entryColor;
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.arc(n.x, n.y, radius + 4.5, 0, Math.PI * 2); ctx.stroke();
    }

    // User-placed or pinned indicator
    if (n.userPlaced && n.age < 3) {
      const pulse = Math.sin(n.age * 6) * 0.4 + 0.6;
      ctx.globalAlpha = 0.5 * pulse * intensity;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.arc(n.x, n.y, radius + 7, 0, Math.PI * 2); ctx.stroke();
    }

    // (labels rendered in a separate pass below — no per-node label draw here)
  }

  // ── Label pass — separate, importance-sorted, depth-layered ─────────────────
  // ALL labeled nodes are shown. Overlapping ones render smaller + more transparent
  // (behind the important ones), so zooming in always reveals full text.
  if (ae.showLabels) {
    const labeledNodes = state.nodes.filter(n => n.label);
    if (labeledNodes.length > 0) {
      type LC = {
        n: RhizomeNode; importance: number; fs: number;
        lx: number; ly: number; lw: number; lh: number;
        degraded: boolean; // true = overlaps a more-important label
      };

      const baseFs = lerp(6, 10, ae.labelSize);

      // First pass: measure all candidates
      const candidates: LC[] = labeledNodes.map(n => {
        const deg = n.connections.size;
        const importance = Math.min(1,
          (deg / 10) * 0.45 + n.heat * 0.40 +
          (n.isEntry  ? 0.25 : 0) +
          (n.isAnchor ? 0.40 : 0)
        );
        const fs  = Math.round(baseFs + importance * 2.5);
        const tw  = fs * n.label!.length * 0.52; // fast width estimate
        const pad = 3;
        const nodeR = BASE_NODE_RADIUS * lerp(0.6, 2.2, ae.nodeSize) * (0.6 + n.heat * 0.7);
        const lx = n.x - tw / 2 - pad;
        const ly = n.y + nodeR + 2;
        return { n, importance, fs, lx, ly, lw: tw + pad * 2, lh: fs + 2, degraded: false };
      });

      // Sort: most important first (they win priority placement)
      candidates.sort((a, b) => b.importance - a.importance);

      // Second pass: AABB overlap detection — mark overlapping as degraded (not hidden)
      const placed: { x: number; y: number; w: number; h: number; importance: number }[] = [];

      for (const c of candidates) {
        const overlapsImportant = placed.some(p =>
          p.importance > c.importance * 0.6 && // only degrade if vs. significantly more important
          c.lx < p.x + p.w + 2 && c.lx + c.lw > p.x - 2 &&
          c.ly < p.y + p.h + 2 && c.ly + c.lh > p.y - 2
        );
        c.degraded = overlapsImportant;
        placed.push({ x: c.lx, y: c.ly, w: c.lw, h: c.lh, importance: c.importance });
      }

      // Third pass: render all — degraded ones smaller, dimmer, no background
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';

      // Measure accurately for non-degraded labels (background pill)
      for (const c of candidates) {
        const fs = c.degraded ? Math.max(5, c.fs - 2) : c.fs;
        ctx.font = `${fs}px system-ui, sans-serif`;

        if (c.degraded) {
          // Degraded: just text, smaller, dimmer — no background pill
          const alpha = 0.20 + c.importance * 0.25;
          ctx.globalAlpha = alpha;
          ctx.fillStyle   = ae.labelColor;
          ctx.fillText(c.n.label!, c.n.x, c.ly + 1);
        } else {
          // Primary: pill background + full opacity text
          const tw  = ctx.measureText(c.n.label!).width;
          const pad = 3;
          const bx  = c.n.x - tw / 2 - pad;
          const by  = c.ly;
          const bw  = tw + pad * 2;
          const bh  = fs + 2;
          const br  = 3;

          ctx.globalAlpha = 0.52 + c.importance * 0.28;
          ctx.fillStyle   = 'rgba(0,0,0,0.78)';
          ctx.beginPath();
          ctx.moveTo(bx + br, by);
          ctx.lineTo(bx + bw - br, by);
          ctx.quadraticCurveTo(bx + bw, by,      bx + bw, by + br);
          ctx.lineTo(bx + bw, by + bh - br);
          ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh);
          ctx.lineTo(bx + br, by + bh);
          ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
          ctx.lineTo(bx, by + br);
          ctx.quadraticCurveTo(bx, by, bx + br, by);
          ctx.closePath();
          ctx.fill();

          ctx.globalAlpha = 0.70 + c.importance * 0.28;
          ctx.fillStyle   = ae.labelColor;
          ctx.fillText(c.n.label!, c.n.x, c.ly + 1);
        }
      }

      ctx.textBaseline = 'alphabetic';
    }
  }

  ctx.globalAlpha = 1;
  ctx.textAlign   = 'left';
}

// ── 3D Render ──────────────────────────────────────────────────────────────────
// Full Camera3D orbit: rotX (pitch) + rotY (yaw) + rotZ (roll),
// variable FOV, Z-spread, depth fog, dolly zoom, screen-space pan.
export function renderRhizome3D(
  ctx: CanvasRenderingContext2D,
  state: RhizomeState,
  W: number, H: number,
  cam: Camera3D,
  overrideAesthetics?: Partial<RhizomeAesthetics>,
): void {
  const ae    = overrideAesthetics ? { ...state.aesthetics, ...overrideAesthetics } : state.aesthetics;
  const p     = state.params;
  const nodes = state.nodes;

  ctx.fillStyle = ae.bgColor;
  ctx.fillRect(0, 0, W, H);
  if (nodes.length === 0) return;

  const cx = W / 2 + cam.panX;
  const cy = H / 2 + cam.panY;

  const fovPx = Math.min(W, H) * cam.fov;
  const camD  = fovPx + 300;

  const nodeMap = new Map<number, RhizomeNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const cosY = Math.cos(cam.rotY), sinY = Math.sin(cam.rotY);
  const cosX = Math.cos(cam.rotX), sinX = Math.sin(cam.rotX);
  const cosZ = Math.cos(cam.rotZ), sinZ = Math.sin(cam.rotZ);

  type P3 = { n: RhizomeNode; px: number; py: number; pz: number; scale: number; alpha: number };

  function project(n: RhizomeNode): P3 {
    const deg = n.connections.size;
    const importance = Math.min(1,
      (deg / 8) * 0.5 + n.heat * 0.45 +
      (n.isEntry  ? 0.2  : 0) +
      (n.isAnchor ? 0.4  : 0) +
      ((n.relevance ?? 0.5) - 0.5) * 0.3
    );
    const z0 = (importance - 0.5) * cam.zSpread
             + Math.sin(n.id * 2.39996) * cam.zSpread * 0.33;

    let x = n.x - (W / 2);
    let y = n.y - (H / 2);
    let z = z0;

    // 1. Yaw
    const x1 =  x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;
    // 2. Pitch
    const y2 =  y * cosX - z1 * sinX;
    const z2 =  y * sinX + z1 * cosX;
    // 3. Roll (screen-space)
    const xf =  x1 * cosZ - y2 * sinZ;
    const yf =  x1 * sinZ + y2 * cosZ;

    const factor = camD / (z2 + camD) * cam.zoom;
    const px = cx + xf * factor;
    const py = cy + yf * factor;

    const normDepth = Math.max(0, Math.min(1, (z2 + cam.zSpread) / (cam.zSpread * 2)));
    const alpha = cam.fog > 0
      ? (1 - cam.fog) + cam.fog * Math.max(0.08, normDepth)
      : 1.0;

    const scale = Math.max(0.15, factor / camD * 2.2);
    return { n, px, py, pz: z2, scale, alpha };
  }

  const projected = nodes.map(project);
  projected.sort((a, b) => a.pz - b.pz);

  const projMap = new Map<number, P3>();
  for (const p3 of projected) projMap.set(p3.n.id, p3);

  // ── Draw edges (with semantic type coloring) ────────────────────────────────
  const seenEdges = new Set<string>();
  const linkW = lerp(0.4, 2.5, ae.linkWidth);

  const EDGE3D_COLORS: Record<string, string> = {
    influences: '#a78bfa', contrasts: '#ef4444', bridges: '#f472b6',
    extends: '#60a5fa', contains: '#4ade80', co_occurs: ae.linkColor,
    method_for: '#fbbf24', example_of: '#fb923c', critiques: '#f87171',
    related: ae.linkColor,
  };

  for (const pa of projected) {
    for (const [nid, weight] of pa.n.connections) {
      const key = pa.n.id < nid ? `${pa.n.id}-${nid}` : `${nid}-${pa.n.id}`;
      if (seenEdges.has(key)) continue;
      seenEdges.add(key);
      const pb = projMap.get(nid);
      if (!pb) continue;

      const avgAlpha = (pa.alpha + pb.alpha) / 2;
      const relation = pa.n.edgeTypes?.get(nid) ?? pb.n.edgeTypes?.get(pa.n.id);
      const isLong   = relation === 'bridges' || Math.hypot(pa.n.x - pb.n.x, pa.n.y - pb.n.y) > LONG_LINK_DISTANCE;
      const edgeColor = relation ? (EDGE3D_COLORS[relation] ?? ae.linkColor) : ae.linkColor;

      ctx.globalAlpha = ae.linkOpacity * avgAlpha * weight * 0.85;
      ctx.strokeStyle = isLong ? ae.flightColor : edgeColor;
      ctx.lineWidth   = linkW * (0.7 + avgAlpha * 0.5);

      if (relation === 'contrasts' || relation === 'critiques') {
        ctx.setLineDash([3, 2]);
        ctx.strokeStyle = edgeColor;
      }

      ctx.beginPath(); ctx.moveTo(pa.px, pa.py); ctx.lineTo(pb.px, pb.py); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ── Draw nodes ──────────────────────────────────────────────────────────────
  const sizeScale  = lerp(0.4, 2.0, ae.nodeSize);
  const connScale3 = lerp(0.1, 2.5, ae.connSizeScale ?? 0.5);

  for (const p3 of projected) {
    const { n } = p3;
    const deg    = Math.min(n.connections.size, 20); // Clamp degree to prevent infinite growth
    const relev  = n.relevance ?? 0.5;
    const relevMult = 1.0 + relev * lerp(0, 1.6, ae.relSizeScale ?? 0.5);
    const radius = (BASE_NODE_RADIUS + deg * 0.38 * p.hubs * 2.0 * connScale3)
                 * sizeScale * p3.scale * relevMult;

    let fillColor: string;
    if (n.category)        fillColor = getCategoryColor(n.category);
    else if (n.isAnchor)   fillColor = ae.entryColor;
    else if (n.isEntry)    fillColor = ae.entryColor;
    else if (deg >= 6)     fillColor = ae.hubColor;
    else if (n.heat > 0.6) fillColor = ae.hotColor;
    else                   fillColor = ae.nodeColor;

    if (ae.glowIntensity > 0.05) {
      ctx.globalAlpha = 0.09 * p3.alpha * ae.glowIntensity;
      ctx.fillStyle   = fillColor;
      ctx.shadowColor = fillColor;
      ctx.shadowBlur  = 14;
      ctx.beginPath(); ctx.arc(p3.px, p3.py, radius * 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur  = 0;
    }

    ctx.globalAlpha = (0.50 + n.heat * 0.40) * p3.alpha;
    ctx.fillStyle   = fillColor;
    ctx.beginPath(); ctx.arc(p3.px, p3.py, Math.max(1.2, radius), 0, Math.PI * 2); ctx.fill();

    if (n.isEntry || n.isAnchor) {
      ctx.globalAlpha = 0.18 * p3.alpha;
      ctx.strokeStyle = ae.entryColor;
      ctx.lineWidth   = 0.8;
      ctx.beginPath(); ctx.arc(p3.px, p3.py, Math.max(2, radius + 4.5), 0, Math.PI * 2); ctx.stroke();
    }
  }

  // ── Labels (depth-faded, importance-sorted) ─────────────────────────────────
  if (ae.showLabels) {
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';

    const labeled = projected
      .filter(p3 => p3.n.label)
      .map(p3 => {
        const deg = p3.n.connections.size;
        const importance = Math.min(1,
          (deg / 8) * 0.45 + p3.n.heat * 0.35 +
          (p3.n.isEntry  ? 0.30 : 0) +
          (p3.n.isAnchor ? 0.50 : 0) +
          ((p3.n.relevance ?? 0.5) - 0.5) * 0.4
        );
        return { p3, importance };
      })
      .filter(({ importance }) => importance > 0.28)
      .sort((a, b) => b.importance - a.importance);

    const baseFs = lerp(6, 10, ae.labelSize);
    for (const { p3, importance } of labeled) {
      const fs = Math.round(baseFs + importance * 2.5 + p3.scale * 1.5);
      ctx.font = `${fs}px system-ui, sans-serif`;
      const deg = p3.n.connections.size;
      const r3d = (BASE_NODE_RADIUS + deg * 0.38) * sizeScale * p3.scale;
      const ly  = p3.py + Math.max(2, r3d) + 2;
      const tw  = ctx.measureText(p3.n.label!).width;
      const pad = 3;

      ctx.globalAlpha = Math.min(0.9, p3.alpha * (0.5 + importance * 0.4));
      ctx.fillStyle   = 'rgba(0,0,0,0.78)';
      ctx.fillRect(p3.px - tw / 2 - pad, ly, tw + pad * 2, fs + 2);

      ctx.globalAlpha = Math.min(1, p3.alpha * (0.65 + importance * 0.3));
      ctx.fillStyle   = ae.labelColor;
      ctx.fillText(p3.n.label!, p3.px, ly + 1);
    }
    ctx.textBaseline = 'alphabetic';
  }

  ctx.globalAlpha = 1;
  ctx.textAlign   = 'left';
}

// ── Canvas Loading Animation ───────────────────────────────────────────────────
// Called every frame while the LLM is processing. Renders directly to canvas.
export function renderLoadingAnimation(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  time: number,      // seconds since loading started
  topic: string,
  bgColor = '#000000',
): void {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;

  // Expanding rings
  for (let i = 0; i < 4; i++) {
    const phase  = ((time * 0.55 + i * 0.25) % 1);
    const radius = 20 + phase * 220;
    const alpha  = (1 - phase) * 0.18;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 0.8;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
  }

  // Inner slow ring
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.arc(cx, cy, 90 + Math.sin(time * 0.4) * 8, 0, Math.PI * 2); ctx.stroke();

  // Orbiting particles
  const COUNT = 12;
  for (let i = 0; i < COUNT; i++) {
    const angle = time * 0.9 + (i / COUNT) * Math.PI * 2;
    const r     = 70 + Math.sin(time * 0.6 + i * 0.8) * 22;
    const x     = cx + Math.cos(angle) * r;
    const y     = cy + Math.sin(angle) * r * 0.55;
    const bright = (Math.sin(time * 2.5 + i * 1.3) + 1) / 2;

    ctx.globalAlpha = 0.18 + bright * 0.45;
    ctx.fillStyle   = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + bright * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Trail line to center
    ctx.globalAlpha = 0.04 + bright * 0.08;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 0.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
  }

  // Connecting arcs between particles (dynamic topology hint)
  for (let i = 0; i < COUNT; i++) {
    for (let j = i + 2; j < COUNT; j += 3) {
      const a1 = time * 0.9 + (i / COUNT) * Math.PI * 2;
      const a2 = time * 0.9 + (j / COUNT) * Math.PI * 2;
      const r1 = 70 + Math.sin(time * 0.6 + i * 0.8) * 22;
      const r2 = 70 + Math.sin(time * 0.6 + j * 0.8) * 22;
      const x1 = cx + Math.cos(a1) * r1, y1 = cy + Math.sin(a1) * r1 * 0.55;
      const x2 = cx + Math.cos(a2) * r2, y2 = cy + Math.sin(a2) * r2 * 0.55;
      const visibility = (Math.sin(time * 1.2 + i + j) + 1) / 2;

      ctx.globalAlpha = visibility * 0.07;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 0.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  }

  // Center pulse
  const pulse = (Math.sin(time * 3.5) + 1) / 2;
  ctx.globalAlpha = 0.35 + pulse * 0.45;
  ctx.fillStyle   = '#ffffff';
  ctx.beginPath(); ctx.arc(cx, cy, 3 + pulse * 2, 0, Math.PI * 2); ctx.fill();

  // Topic label
  const fadeIn = Math.min(1, time * 1.5);
  ctx.globalAlpha = fadeIn * (0.55 + Math.sin(time * 1.2) * 0.1);
  ctx.fillStyle   = '#ffffff';
  ctx.font        = '13px system-ui, sans-serif';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(topic, cx, cy + 108);

  // Scanning line  
  const scanY = cy + 135;
  const dots  = ['·', '·', '·'];
  const dotStr = dots.map((_, i) => (Math.floor(time * 2 + i) % 3 === 0 ? '●' : '·')).join(' ');
  ctx.globalAlpha = fadeIn * 0.28;
  ctx.font        = '9px monospace';
  ctx.fillText(`mapeando rizoma epistêmico  ${dotStr}`, cx, scanY);

  ctx.globalAlpha  = 1;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ── Snapshot & Restore ─────────────────────────────────────────────────────────
// Create a serializable snapshot of the current rhizome state

export function createSnapshot(state: RhizomeState): string {
  try {
    // Convert Map to plain object for serialization
    const serializableNodes = state.nodes.map(n => ({
      ...n,
      connections: Array.from(n.connections.entries()),
    }));
    
    const snapshot = {
      nodes: serializableNodes,
      nextId: state.nextId,
      params: state.params,
      aesthetics: state.aesthetics,
      seed: state.seed,
      rngState: state.rngState,
    };
    
    return JSON.stringify(snapshot);
  } catch (err) {
    console.error('Failed to create snapshot:', err);
    return '';
  }
}

export function restoreFromSnapshot(
  snapshot: string,
  W: number,
  H: number
): RhizomeState | null {
  try {
    const data = JSON.parse(snapshot);
    
    // Restore Map from plain array
    const nodes = data.nodes.map((n: any) => ({
      ...n,
      connections: new Map(n.connections),
    }));
    
    const state: RhizomeState = {
      nodes,
      nextId: data.nextId,
      params: data.params,
      aesthetics: data.aesthetics || DEFAULT_AESTHETICS,
      growthTimer: 0,
      entryTimer: 0,
      forgetTimer: 0,
      reterritTimer: 0,
      seed: data.seed,
      rngState: data.rngState,
    };
    
    return state;
  } catch (err) {
    console.error('Failed to restore from snapshot:', err);
    return null;
  }
}