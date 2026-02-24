// ─────────────────────────────────────────────────────────────────────────────
// Language Lab – Glyph Detector
// Lightweight: detect loops/signatures from strokes (no heavy libs)
// ─────────────────────────────────────────────────────────────────────────────
import type { WorldState, Stroke } from './types';

export interface LoopDetection {
  count: number;         // approximate loop count in current strokes
  avgRadius: number;     // avg loop radius (normalised 0..1)
  avgCentre: { x: number; y: number };
}

// ── Detect approximate loop count using stroke endpoint proximity ─────────────
export function detectLoops(state: WorldState): LoopDetection {
  const { strokes } = state;
  let loopCount = 0;
  let radSum = 0, cx = 0, cy = 0;

  for (const s of strokes) {
    if (s.points.length < 4) continue;
    const first = s.points[0];
    const last  = s.points[s.points.length - 1];
    // Approximate loop: start ≈ end
    const dx = first.x - last.x, dy = first.y - last.y;
    const gap = Math.sqrt(dx * dx + dy * dy);
    if (gap < 0.04) {
      loopCount++;
      // Estimate radius: average distance from centroid of points
      let mxSum = 0, mySum = 0;
      for (const p of s.points) { mxSum += p.x; mySum += p.y; }
      const mx = mxSum / s.points.length, my = mySum / s.points.length;
      let rSum = 0;
      for (const p of s.points) rSum += Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
      radSum += rSum / s.points.length;
      cx += mx; cy += my;
    }
  }

  return {
    count: loopCount,
    avgRadius: loopCount > 0 ? radSum / loopCount : 0,
    avgCentre: loopCount > 0
      ? { x: cx / loopCount, y: cy / loopCount }
      : { x: 0.5, y: 0.5 },
  };
}

// ── Detect dense clusters of quanta (potential glyph origins) ─────────────────
export interface QuantaCluster {
  x: number; y: number;
  radius: number;
  coherence: number;
  size: number;
}

export function detectQuantaClusters(state: WorldState, threshold = 0.4): QuantaCluster[] {
  const { quanta } = state;
  const GRID = 12;
  const cells = new Array<typeof quanta[0][]>(GRID * GRID).fill(null as any).map(() => []);

  for (const q of quanta) {
    const ci = Math.min(GRID - 1, Math.floor(q.x * GRID));
    const cj = Math.min(GRID - 1, Math.floor(q.y * GRID));
    cells[cj * GRID + ci].push(q);
  }

  const clusters: QuantaCluster[] = [];
  const cellSize = 1 / GRID;

  for (let cj = 0; cj < GRID; cj++) {
    for (let ci = 0; ci < GRID; ci++) {
      const cell = cells[cj * GRID + ci];
      if (cell.length < 4) continue;
      let cohSum = 0, xSum = 0, ySum = 0;
      for (const q of cell) { cohSum += q.coherence; xSum += q.x; ySum += q.y; }
      const cohMean = cohSum / cell.length;
      if (cohMean < threshold) continue;
      clusters.push({
        x: xSum / cell.length,
        y: ySum / cell.length,
        radius: cellSize * 1.2,
        coherence: cohMean,
        size: cell.length,
      });
    }
  }

  return clusters;
}
