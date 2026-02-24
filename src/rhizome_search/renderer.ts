// ── Rhizome Search — Canvas Renderer ───────────────────────────────────────────

import type { KnowledgeMap, KnowledgeNode, KnowledgeEdge } from './types';
import { MAX_VISIBLE_LINKS, BRIDGE_HALO_RADIUS } from './types';

// ── Render Knowledge Map ──────────────────────────────────────────────────────
export function renderKnowledgeMap(
  ctx: CanvasRenderingContext2D,
  map: KnowledgeMap,
  width: number,
  height: number,
  selectedNodeId?: string
): void {
  // Clear
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Get cluster colors
  const clusterColors = new Map<string, string>();
  map.clusters.forEach(cluster => {
    clusterColors.set(cluster.id, cluster.colorHint);
  });

  // Render edges
  renderEdges(ctx, map, selectedNodeId);

  // Render nodes
  renderNodes(ctx, map, clusterColors, selectedNodeId);

  // Render labels
  renderLabels(ctx, map, clusterColors, selectedNodeId);
}

// ── Render Edges ──────────────────────────────────────────────────────────────
function renderEdges(
  ctx: CanvasRenderingContext2D,
  map: KnowledgeMap,
  selectedNodeId?: string
): void {
  const nodes = map.nodes;
  const edges = map.edges;

  // Sort edges by weight (render low weight first)
  const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);

  // Limit visible links
  const isLongEdges = sortedEdges.filter(e => e.is_long);
  const normalEdges = sortedEdges.filter(e => !e.is_long);

  // Always draw is_long, then top weighted normal edges
  const visibleNormalCount = Math.max(0, MAX_VISIBLE_LINKS - isLongEdges.length);
  const topNormalEdges = normalEdges.slice(-visibleNormalCount);

  const edgesToRender = [...isLongEdges, ...topNormalEdges];

  edgesToRender.forEach(edge => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    if (!source || !target) return;
    if (source.x === undefined || target.x === undefined) return;

    const isSelected = selectedNodeId === source.id || selectedNodeId === target.id;

    ctx.beginPath();
    ctx.moveTo(source.x, source.y!);
    ctx.lineTo(target.x, target.y!);

    if (edge.is_long) {
      // Line of flight (magenta)
      ctx.strokeStyle = isSelected ?
        'rgba(255, 59, 213, 0.8)' : 'rgba(255, 59, 213, 0.4)';
      ctx.lineWidth = isSelected ? 1.5 : 1;
    } else {
      // Normal link
      const alpha = Math.max(0.15, edge.weight * 0.5);
      ctx.strokeStyle = isSelected ?
        `rgba(124, 58, 237, ${alpha * 1.5})` : `rgba(124, 58, 237, ${alpha})`;
      ctx.lineWidth = isSelected ? 1 : 0.6;
    }

    ctx.stroke();
  });
}

// ── Render Nodes ──────────────────────────────────────────────────────────────
function renderNodes(
  ctx: CanvasRenderingContext2D,
  map: KnowledgeMap,
  clusterColors: Map<string, string>,
  selectedNodeId?: string
): void {
  const bridges = new Set(map.bridges);

  map.nodes.forEach(node => {
    if (node.x === undefined || node.y === undefined) return;

    const isBridge = bridges.has(node.id);
    const isSelected = selectedNodeId === node.id;

    // Bridge halo (white)
    if (isBridge) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, BRIDGE_HALO_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();
    }

    // Selected halo (bright white)
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, BRIDGE_HALO_RADIUS + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();
    }

    // Node color
    let color = clusterColors.get(node.cluster) || '#7c3aed';
    if (node.type === 'person') color = '#fbbf24'; // gold
    else if (node.type === 'work') color = '#60a5fa'; // blue
    else if (node.type === 'method') color = '#34d399'; // green

    // Node circle
    const baseRadius = 4;
    const importanceRadius = baseRadius + node.importance * 3;
    const bridgeBonus = isBridge ? 1.5 : 0;
    const radius = importanceRadius + bridgeBonus;

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Border
    ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();
  });
}

// ── Render Labels ─────────────────────────────────────────────────────────────
function renderLabels(
  ctx: CanvasRenderingContext2D,
  map: KnowledgeMap,
  clusterColors: Map<string, string>,
  selectedNodeId?: string
): void {
  const bridges = new Set(map.bridges);

  map.nodes.forEach(node => {
    if (node.x === undefined || node.y === undefined) return;

    const isBridge = bridges.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const isImportant = node.importance > 0.6;

    // Show labels for all nodes — opacity varies by importance
    const labelAlpha = isSelected ? 0.95 : isBridge ? 0.85 : isImportant ? 0.75 : 0.55;

    ctx.save();
    ctx.font = isSelected ? 'bold 11px system-ui' : isImportant ? '10px system-ui' : '9px system-ui';
    ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.95)' : `rgba(255, 255, 255, ${labelAlpha})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Background
    const textMetrics = ctx.measureText(node.label);
    const textWidth = textMetrics.width;
    const textHeight = 12;
    const padding = 3;
    const bgX = node.x - textWidth / 2 - padding;
    const bgY = node.y + 10;
    const bgWidth = textWidth + padding * 2;
    const bgHeight = textHeight + padding * 2;

    ctx.fillStyle = `rgba(0, 0, 0, ${isSelected ? 0.85 : 0.6})`;
    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

    // Text
    ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.95)' : `rgba(255, 255, 255, ${labelAlpha})`;
    ctx.fillText(node.label, node.x, node.y + 12);

    ctx.restore();
  });
}
