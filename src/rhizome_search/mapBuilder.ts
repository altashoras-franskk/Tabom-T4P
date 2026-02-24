// ── Rhizome Search — Map Builder & Layout ──────────────────────────────────────

import type { KnowledgeMap, KnowledgeNode, LayoutConfig } from './types';
import { DEFAULT_LAYOUT_CONFIG } from './types';

// ── Initialize Positions ──────────────────────────────────────────────────────
export function initializePositions(
  map: KnowledgeMap,
  width: number,
  height: number
): void {
  const clusters = map.clusters;
  const clusterCentroids = new Map<string, { x: number; y: number }>();

  // Place cluster centroids in a circle
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.35;

  clusters.forEach((cluster, idx) => {
    const angle = (idx / clusters.length) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    clusterCentroids.set(cluster.id, { x, y });
  });

  // Assign node positions based on cluster
  map.nodes.forEach(node => {
    const centroid = clusterCentroids.get(node.cluster) || { x: cx, y: cy };
    const jitter = 60;
    node.x = centroid.x + (Math.random() - 0.5) * jitter;
    node.y = centroid.y + (Math.random() - 0.5) * jitter;
    node.vx = 0;
    node.vy = 0;
  });
}

// ── Force-Directed Layout ─────────────────────────────────────────────────────
export function runForceLayout(
  map: KnowledgeMap,
  width: number,
  height: number,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): void {
  const nodes = map.nodes;
  const edges = map.edges;

  // Build adjacency map
  const adjacency = new Map<string, Set<string>>();
  edges.forEach(edge => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  });

  const cx = width / 2;
  const cy = height / 2;

  for (let iter = 0; iter < config.iterations; iter++) {
    // Reset forces
    nodes.forEach(node => {
      node.vx = 0;
      node.vy = 0;
    });

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x! - a.x!;
        const dy = b.y! - a.y!;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const force = config.repulsionStrength / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx! -= fx;
        a.vy! -= fy;
        b.vx! += fx;
        b.vy! += fy;
      }
    }

    // Spring attraction on connected nodes
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (!source || !target) return;
      if (source.x === undefined || target.x === undefined) return;

      const dx = target.x - source.x;
      const dy = target.y! - source.y!;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const force = (dist - config.springLength) * config.springStrength * edge.weight;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      source.vx! += fx;
      source.vy! += fy;
      target.vx! -= fx;
      target.vy! -= fy;
    });

    // Center gravity
    nodes.forEach(node => {
      const dx = cx - node.x!;
      const dy = cy - node.y!;
      node.vx! += dx * config.centerGravity;
      node.vy! += dy * config.centerGravity;
    });

    // Apply velocities with damping
    nodes.forEach(node => {
      node.x! += node.vx! * config.damping;
      node.y! += node.vy! * config.damping;

      // Bounds checking
      const margin = 50;
      node.x! = Math.max(margin, Math.min(width - margin, node.x!));
      node.y! = Math.max(margin, Math.min(height - margin, node.y!));
    });
  }
}

// ── Living Layout (Breathing Animation) ───────────────────────────────────────
let livingTime = 0;

export function updateLivingLayout(
  map: KnowledgeMap,
  dt: number,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): void {
  livingTime += dt * config.livingSpeed;

  map.nodes.forEach((node, idx) => {
    if (node.x === undefined || node.y === undefined) return;

    // Each node gets a unique phase
    const phase = idx * 0.3;
    const noiseX = Math.sin(livingTime + phase) * config.livingNoiseScale;
    const noiseY = Math.cos(livingTime + phase * 1.3) * config.livingNoiseScale;

    node.x! += noiseX;
    node.y! += noiseY;
  });
}

// ── Ensure Connectedness ──────────────────────────────────────────────────────
export function ensureConnectedness(map: KnowledgeMap): void {
  const nodes = map.nodes;
  const edges = map.edges;

  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach(node => adjacency.set(node.id, new Set()));
  edges.forEach(edge => {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  // Find connected components using BFS
  const visited = new Set<string>();
  const components: string[][] = [];

  nodes.forEach(node => {
    if (visited.has(node.id)) return;

    const component: string[] = [];
    const queue: string[] = [node.id];
    visited.add(node.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);

      adjacency.get(current)?.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }

    components.push(component);
  });

  // If only one component, we're done
  if (components.length <= 1) return;

  // Connect components with minimal bridges
  for (let i = 1; i < components.length; i++) {
    const prevComponent = components[i - 1];
    const currComponent = components[i];

    // Find closest pair of nodes between components
    let minDist = Infinity;
    let bestPair: [string, string] | null = null;

    prevComponent.forEach(nodeA => {
      currComponent.forEach(nodeB => {
        const a = nodes.find(n => n.id === nodeA);
        const b = nodes.find(n => n.id === nodeB);
        if (!a || !b || a.x === undefined || b.x === undefined) return;

        const dx = b.x - a.x;
        const dy = b.y! - a.y!;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist) {
          minDist = dist;
          bestPair = [nodeA, nodeB];
        }
      });
    });

    if (bestPair) {
      map.edges.push({
        source: bestPair[0],
        target: bestPair[1],
        weight: 0.3,
        relation: 'auto-bridge',
        is_long: true,
      });
    }
  }
}

// ── Clean Map ─────────────────────────────────────────────────────────────────
export function cleanMap(map: KnowledgeMap): void {
  // Deduplicate nodes by ID
  const uniqueNodes = new Map<string, KnowledgeNode>();
  map.nodes.forEach(node => {
    if (!uniqueNodes.has(node.id)) {
      uniqueNodes.set(node.id, node);
    }
  });
  map.nodes = Array.from(uniqueNodes.values());

  // Remove invalid edges
  const validNodeIds = new Set(map.nodes.map(n => n.id));
  map.edges = map.edges.filter(edge => {
    // Remove self-loops
    if (edge.source === edge.target) return false;
    // Remove edges with invalid source/target
    if (!validNodeIds.has(edge.source)) return false;
    if (!validNodeIds.has(edge.target)) return false;
    return true;
  });

  // Deduplicate edges
  const edgeSet = new Set<string>();
  map.edges = map.edges.filter(edge => {
    const key = [edge.source, edge.target].sort().join('|');
    if (edgeSet.has(key)) return false;
    edgeSet.add(key);
    return true;
  });
}
