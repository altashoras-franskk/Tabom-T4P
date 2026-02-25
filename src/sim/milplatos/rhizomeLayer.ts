// ─── Rizoma Layer — Graph Simulation ─────────────────────────────────────────
// Anti-hierarchical graph with multiple entries, branching, lines of flight,
// preferential attachment (hubs), pruning (esquecimento), and layout forces.

import type {
  RhizomeState, RhizomeNode, RhizomeEdge, MPParams, MPFields,
} from './milplatosTypes';
import { MP_FIELD_RES } from './milplatosTypes';

const MAX_NODES = 150;

// ── Create ──────────────────────────────────────────────────────────────────
export function createRhizomeState(): RhizomeState {
  const nodes: RhizomeNode[] = [];
  // Start with 3 entry points
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.3;
    const r = 0.25 + Math.random() * 0.15;
    nodes.push({
      id: i, x: Math.cos(angle) * r, y: Math.sin(angle) * r,
      vx: 0, vy: 0, isEntry: true, connections: [],
      heat: 0.8 + Math.random() * 0.2, age: 0, territory: 0.3,
    });
  }

  // Wire entries
  nodes[0].connections.push(1);
  nodes[1].connections.push(0, 2);
  nodes[2].connections.push(1);

  return { nodes, nextId: 3, growthTimer: 0, flightEdges: [] };
}

// ── Step ────────────────────────────────────────────────────────────────────
export function stepRhizome(
  state: RhizomeState, params: MPParams, fields: MPFields, time: number, dt: number,
): void {
  dt = Math.min(dt, 0.04);
  const { nodes } = state;
  if (nodes.length === 0) return;

  const nodeMap = new Map<number, RhizomeNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // ── Growth: branch from existing nodes ────────────────────────────────
  state.growthTimer += dt;
  const growthInterval = 0.8 - params.multiplicidade * 0.5; // faster with high multiplicidade
  if (state.growthTimer > growthInterval && nodes.length < MAX_NODES) {
    state.growthTimer = 0;

    // Pick parent: preferential attachment if hubs high
    let parent: RhizomeNode;
    if (params.hubs > 0.4 && Math.random() < params.hubs) {
      // Prefer nodes with more connections (hub behavior)
      let bestN = nodes[0], bestC = nodes[0].connections.length;
      for (const n of nodes) {
        if (n.connections.length > bestC) { bestN = n; bestC = n.connections.length; }
      }
      parent = bestN;
    } else {
      parent = nodes[Math.floor(Math.random() * nodes.length)];
    }

    const angle = Math.random() * Math.PI * 2;
    const dist = 0.06 + Math.random() * 0.08;
    const child: RhizomeNode = {
      id: state.nextId++,
      x: parent.x + Math.cos(angle) * dist,
      y: parent.y + Math.sin(angle) * dist,
      vx: 0, vy: 0, isEntry: false,
      connections: [parent.id],
      heat: parent.heat * 0.7 + Math.random() * 0.3,
      age: 0, territory: params.territorializacao * 0.5,
    };
    child.x = Math.max(-0.9, Math.min(0.9, child.x));
    child.y = Math.max(-0.9, Math.min(0.9, child.y));
    parent.connections.push(child.id);
    nodes.push(child);

    // Multiplicidade: burst of new entries
    if (params.multiplicidade > 0.5 && Math.random() < (params.multiplicidade - 0.5) * 0.15) {
      const burstCount = 1 + Math.floor(Math.random() * 2);
      for (let b = 0; b < burstCount && nodes.length < MAX_NODES; b++) {
        const ea = Math.random() * Math.PI * 2;
        const er = 0.3 + Math.random() * 0.3;
        const entry: RhizomeNode = {
          id: state.nextId++,
          x: Math.cos(ea) * er, y: Math.sin(ea) * er,
          vx: 0, vy: 0, isEntry: true,
          connections: [],
          heat: 0.7 + Math.random() * 0.3, age: 0, territory: 0.2,
        };
        // Connect to nearest existing node
        let nearest = nodes[0], nearD = 999;
        for (const n of nodes) {
          const d = (n.x - entry.x) ** 2 + (n.y - entry.y) ** 2;
          if (d < nearD) { nearest = n; nearD = d; }
        }
        entry.connections.push(nearest.id);
        nearest.connections.push(entry.id);
        nodes.push(entry);
      }
    }
  }

  // ── Lines of Flight: improbable long-distance connections ─────────────
  state.flightEdges = [];
  if (params.linhasDeFuga > 0.1 && Math.random() < params.linhasDeFuga * 0.04 * dt) {
    if (nodes.length > 4) {
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      // Find a distant node (not already connected)
      let farthest: RhizomeNode | null = null, farthestD = 0;
      for (const n of nodes) {
        if (n.id === a.id || a.connections.includes(n.id)) continue;
        const d = (n.x - a.x) ** 2 + (n.y - a.y) ** 2;
        if (d > farthestD) { farthest = n; farthestD = d; }
      }
      if (farthest && farthestD > 0.04) {
        a.connections.push(farthest.id);
        farthest.connections.push(a.id);
        state.flightEdges.push({
          from: a.id, to: farthest.id, heat: 1, isFlight: true,
        });
      }
    }
  }

  // ── Esquecimento (pruning): remove edges from low-heat nodes, prune isolated ──
  if (params.esquecimento > 0.1 && Math.random() < params.esquecimento * 0.03 * dt) {
    // Find a low-heat non-entry node
    const candidates = nodes.filter(n => !n.isEntry && n.heat < 0.3 && n.connections.length > 0);
    if (candidates.length > 0) {
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      if (target.connections.length > 0) {
        const removedId = target.connections.pop()!;
        const other = nodeMap.get(removedId);
        if (other) {
          const idx = other.connections.indexOf(target.id);
          if (idx >= 0) other.connections.splice(idx, 1);
        }
      }
    }
  }

  // Remove isolated non-entry nodes
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (!n.isEntry && n.connections.length === 0 && n.age > 60) {
      nodes.splice(i, 1);
    }
  }

  // ── Layout forces (force-directed, O(N) with spatial approx) ──────────
  const repelR2 = 0.015;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    a.age++;
    let fx = 0, fy = 0;

    // Repulsion from other nodes (use stride to approximate)
    const stride = Math.max(1, (nodes.length / 40) | 0);
    for (let j = 0; j < nodes.length; j += stride) {
      if (j === i) continue;
      const b = nodes[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < repelR2 && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const repel = 0.003 / (d + 0.005);
        fx -= (dx / d) * repel;
        fy -= (dy / d) * repel;
      }
    }

    // Attraction to connected nodes (spring)
    for (const cid of a.connections) {
      const c = nodeMap.get(cid);
      if (!c) continue;
      const dx = c.x - a.x, dy = c.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
      const restLen = 0.08 + (1 - params.territorializacao) * 0.05;
      const force = (d - restLen) * 0.5;
      fx += (dx / d) * force;
      fy += (dy / d) * force;
    }

    // Reterritorialização: pull toward center (re-capture)
    if (params.reterritorializacao > 0.2) {
      const cd = Math.sqrt(a.x * a.x + a.y * a.y);
      if (cd > 0.3) {
        fx -= a.x * params.reterritorializacao * 0.05;
        fy -= a.y * params.reterritorializacao * 0.05;
      }
    }

    // Noise
    fx += Math.sin(time * 2 + a.id * 1.7) * params.ruido * 0.02;
    fy += Math.cos(time * 2 + a.id * 2.3) * params.ruido * 0.02;

    // Territory: deposit to field
    const sz = MP_FIELD_RES;
    const gx = Math.max(0, Math.min(sz - 1, ((a.x + 1) * 0.5 * sz) | 0));
    const gy = Math.max(0, Math.min(sz - 1, ((a.y + 1) * 0.5 * sz) | 0));
    fields.territory[gy * sz + gx] = Math.min(1,
      fields.territory[gy * sz + gx] + a.territory * 0.05 * dt);

    // Heat decay
    a.heat = Math.max(0.05, a.heat - 0.002 * dt);
    // Activity propagation: connected nodes share heat
    if (a.connections.length > 0 && Math.random() < 0.05) {
      const cid = a.connections[Math.floor(Math.random() * a.connections.length)];
      const c = nodeMap.get(cid);
      if (c) {
        const share = (a.heat - c.heat) * 0.1;
        a.heat -= share * 0.5;
        c.heat += share * 0.5;
      }
    }

    a.vx = (a.vx + fx * dt) * 0.88;
    a.vy = (a.vy + fy * dt) * 0.88;
    a.x += a.vx; a.y += a.vy;
    a.x = Math.max(-0.92, Math.min(0.92, a.x));
    a.y = Math.max(-0.92, Math.min(0.92, a.y));
  }
}

// ── Sampled edge list for rendering (called at 5-10Hz) ──────────────────────
export function buildRhizomeEdges(state: RhizomeState): RhizomeEdge[] {
  const edges: RhizomeEdge[] = [];
  const seen = new Set<string>();
  const nodeMap = new Map<number, RhizomeNode>();
  for (const n of state.nodes) nodeMap.set(n.id, n);

  for (const n of state.nodes) {
    for (const cid of n.connections) {
      const key = n.id < cid ? `${n.id}-${cid}` : `${cid}-${n.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const other = nodeMap.get(cid);
      if (!other) continue;
      const isFlight = state.flightEdges.some(e =>
        (e.from === n.id && e.to === cid) || (e.from === cid && e.to === n.id));
      edges.push({
        from: n.id, to: cid,
        heat: (n.heat + other.heat) * 0.5,
        isFlight,
      });
    }
  }
  return edges;
}

// ── Hub Dominance metric ────────────────────────────────────────────────────
export function computeHubDominance(nodes: RhizomeNode[]): number {
  if (nodes.length < 2) return 0;
  let maxConn = 0, totalConn = 0;
  for (const n of nodes) {
    if (n.connections.length > maxConn) maxConn = n.connections.length;
    totalConn += n.connections.length;
  }
  const avgConn = totalConn / nodes.length;
  return avgConn > 0 ? Math.min(1, maxConn / (avgConn * 3)) : 0;
}
