// ── Rhizome Search — Node Inspector Logic ──────────────────────────────────────

import type { KnowledgeMap, KnowledgeNode } from './types';

// ── Find Node at Position ─────────────────────────────────────────────────────
export function findNodeAtPosition(
  map: KnowledgeMap,
  x: number,
  y: number,
  radius: number = 20
): KnowledgeNode | null {
  let closest: KnowledgeNode | null = null;
  let minDist = radius;

  map.nodes.forEach(node => {
    if (node.x === undefined || node.y === undefined) return;

    const dx = x - node.x;
    const dy = y - node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < minDist) {
      minDist = dist;
      closest = node;
    }
  });

  return closest;
}
