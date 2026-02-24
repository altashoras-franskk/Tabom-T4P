// ── Rhizome Graph Metrics — Real Network Analysis ────────────────────────────
// Implements actual graph algorithms for semantic search:
// - Betweenness centrality (bridge nodes between communities)
// - Closeness centrality (proximity to all other nodes)
// - Community detection (thematic clusters)
// - Semantic distance (shortest path + edge weights)

import type { RhizomeNode } from './rhizomeTypes';

// ── Graph Utilities ───────────────────────────────────────────────────────────

/** Build adjacency list from nodes */
function buildAdjacencyList(nodes: RhizomeNode[]): Map<number, Set<number>> {
  const adj = new Map<number, Set<number>>();
  for (const node of nodes) {
    if (!adj.has(node.id)) adj.set(node.id, new Set());
    for (const [targetId] of node.connections) {
      adj.get(node.id)!.add(targetId);
    }
  }
  return adj;
}

/** Breadth-first search from a node */
function bfs(
  start: number,
  adj: Map<number, Set<number>>,
  nodeMap: Map<number, RhizomeNode>
): Map<number, number> {
  const dist = new Map<number, number>();
  const queue: number[] = [start];
  dist.set(start, 0);

  while (queue.length > 0) {
    const u = queue.shift()!;
    const neighbors = adj.get(u) || new Set();
    for (const v of neighbors) {
      if (!dist.has(v)) {
        dist.set(v, dist.get(u)! + 1);
        queue.push(v);
      }
    }
  }
  return dist;
}

// ── Betweenness Centrality ────────────────────────────────────────────────────
// Measures how often a node sits on shortest paths between other nodes
// High betweenness = bridge between communities

export function computeBetweenness(nodes: RhizomeNode[]): Map<number, number> {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adj = buildAdjacencyList(nodes);
  const betweenness = new Map<number, number>();
  
  // Initialize
  for (const node of nodes) betweenness.set(node.id, 0);

  // For each node, run BFS and accumulate path counts
  for (const s of nodes) {
    const stack: number[] = [];
    const pred = new Map<number, number[]>();
    const sigma = new Map<number, number>();
    const dist = new Map<number, number>();
    
    for (const v of nodes) {
      pred.set(v.id, []);
      sigma.set(v.id, 0);
      dist.set(v.id, -1);
    }
    
    sigma.set(s.id, 1);
    dist.set(s.id, 0);
    
    const queue = [s.id];
    while (queue.length > 0) {
      const v = queue.shift()!;
      stack.push(v);
      const neighbors = adj.get(v) || new Set();
      for (const w of neighbors) {
        if (dist.get(w)! < 0) {
          queue.push(w);
          dist.set(w, dist.get(v)! + 1);
        }
        if (dist.get(w) === dist.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          pred.get(w)!.push(v);
        }
      }
    }
    
    const delta = new Map<number, number>();
    for (const v of nodes) delta.set(v.id, 0);
    
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred.get(w)!) {
        const c = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
        delta.set(v, delta.get(v)! + c);
      }
      if (w !== s.id) {
        betweenness.set(w, betweenness.get(w)! + delta.get(w)!);
      }
    }
  }
  
  // Normalize
  const n = nodes.length;
  if (n > 2) {
    const norm = 2 / ((n - 1) * (n - 2));
    for (const [id, val] of betweenness) {
      betweenness.set(id, val * norm);
    }
  }
  
  return betweenness;
}

// ── Closeness Centrality ──────────────────────────────────────────────────────
// Measures average distance to all other nodes
// High closeness = central position in network

export function computeCloseness(nodes: RhizomeNode[]): Map<number, number> {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adj = buildAdjacencyList(nodes);
  const closeness = new Map<number, number>();
  
  for (const node of nodes) {
    const dist = bfs(node.id, adj, nodeMap);
    let sum = 0;
    let reachable = 0;
    for (const [target, d] of dist) {
      if (target !== node.id && d > 0) {
        sum += d;
        reachable++;
      }
    }
    if (reachable > 0) {
      closeness.set(node.id, reachable / sum);
    } else {
      closeness.set(node.id, 0);
    }
  }
  
  return closeness;
}

// ── Community Detection (Louvain-lite) ────────────────────────────────────────
// Groups nodes into thematic clusters using modularity optimization

export function detectCommunities(nodes: RhizomeNode[]): Map<number, number> {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adj = buildAdjacencyList(nodes);
  const community = new Map<number, number>();
  
  // Initialize: each node in its own community
  for (const node of nodes) community.set(node.id, node.id);
  
  // Simple greedy modularity: merge nodes with strong connections
  let improved = true;
  let iteration = 0;
  while (improved && iteration < 10) {
    improved = false;
    iteration++;
    
    for (const node of nodes) {
      const neighbors = adj.get(node.id) || new Set();
      const communityScores = new Map<number, number>();
      
      for (const nId of neighbors) {
        const nComm = community.get(nId)!;
        const weight = node.connections.get(nId) || 1;
        communityScores.set(nComm, (communityScores.get(nComm) || 0) + weight);
      }
      
      let bestComm = community.get(node.id)!;
      let bestScore = communityScores.get(bestComm) || 0;
      
      for (const [comm, score] of communityScores) {
        if (score > bestScore) {
          bestScore = score;
          bestComm = comm;
        }
      }
      
      if (bestComm !== community.get(node.id)) {
        community.set(node.id, bestComm);
        improved = true;
      }
    }
  }
  
  return community;
}

// ── Semantic Distance ─────────────────────────────────────────────────────────
// Shortest path with weighted edges (connection strength)

export function semanticDistance(
  from: number,
  to: number,
  nodes: RhizomeNode[]
): number {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adj = buildAdjacencyList(nodes);
  
  // Dijkstra with inverted weights (stronger connection = shorter distance)
  const dist = new Map<number, number>();
  const visited = new Set<number>();
  const queue: { id: number; dist: number }[] = [{ id: from, dist: 0 }];
  dist.set(from, 0);
  
  while (queue.length > 0) {
    queue.sort((a, b) => a.dist - b.dist);
    const { id: u, dist: d } = queue.shift()!;
    
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === to) return d;
    
    const node = nodeMap.get(u);
    if (!node) continue;
    
    const neighbors = adj.get(u) || new Set();
    for (const v of neighbors) {
      if (visited.has(v)) continue;
      const weight = node.connections.get(v) || 0.1;
      const edgeCost = 1 / (weight + 0.1); // stronger = cheaper
      const newDist = d + edgeCost;
      
      if (!dist.has(v) || newDist < dist.get(v)!) {
        dist.set(v, newDist);
        queue.push({ id: v, dist: newDist });
      }
    }
  }
  
  return Infinity; // not connected
}

// ── Hub Detection ─────────────────────────────────────────────────────────────
// Identifies nodes with high degree centrality (many connections)

export function findHubs(nodes: RhizomeNode[], threshold = 0.7): RhizomeNode[] {
  const degrees = nodes.map(n => n.connections.size);
  const maxDeg = Math.max(...degrees, 1);
  
  return nodes.filter(n => {
    const normalized = n.connections.size / maxDeg;
    return normalized >= threshold;
  });
}

// ── Bridge Nodes ──────────────────────────────────────────────────────────────
// Nodes connecting different communities (high betweenness, multiple communities)

export function findBridges(nodes: RhizomeNode[]): RhizomeNode[] {
  const betweenness = computeBetweenness(nodes);
  const communities = detectCommunities(nodes);
  
  // Find nodes with high betweenness connecting different communities
  const bridges: RhizomeNode[] = [];
  
  for (const node of nodes) {
    const bet = betweenness.get(node.id) || 0;
    if (bet < 0.3) continue; // low betweenness
    
    // Check if neighbors belong to different communities
    const neighborComms = new Set<number>();
    for (const [nId] of node.connections) {
      const comm = communities.get(nId);
      if (comm !== undefined) neighborComms.add(comm);
    }
    
    if (neighborComms.size >= 2) {
      bridges.push(node);
    }
  }
  
  return bridges;
}

// ── Comprehensive Node Scoring ────────────────────────────────────────────────
// Combines multiple metrics for intelligent node ranking

export interface NodeScore {
  nodeId:      number;
  relevance:   number;  // 0..1 from LLM or default
  betweenness: number;  // bridge quality
  closeness:   number;  // centrality
  degree:      number;  // connection count
  combined:    number;  // weighted composite score
  isBridge:    boolean;
  isHub:       boolean;
}

export function scoreNodes(nodes: RhizomeNode[]): Map<number, NodeScore> {
  const betweenness = computeBetweenness(nodes);
  const closeness = computeCloseness(nodes);
  const bridges = new Set(findBridges(nodes).map(n => n.id));
  const hubs = new Set(findHubs(nodes, 0.6).map(n => n.id));
  
  const scores = new Map<number, NodeScore>();
  
  for (const node of nodes) {
    const bet = betweenness.get(node.id) || 0;
    const clo = closeness.get(node.id) || 0;
    const deg = node.connections.size;
    const rel = node.relevance || 0.5;
    
    // Normalize degree
    const maxDeg = Math.max(...nodes.map(n => n.connections.size), 1);
    const degNorm = deg / maxDeg;
    
    // Weighted combination: relevance + bridge quality + centrality
    const combined = (
      rel * 0.40 +           // LLM relevance
      bet * 0.30 +           // bridge between communities
      clo * 0.20 +           // central position
      degNorm * 0.10         // connection count
    );
    
    scores.set(node.id, {
      nodeId: node.id,
      relevance: rel,
      betweenness: bet,
      closeness: clo,
      degree: deg,
      combined,
      isBridge: bridges.has(node.id),
      isHub: hubs.has(node.id),
    });
  }
  
  return scores;
}
