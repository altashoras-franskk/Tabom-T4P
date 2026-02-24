// Leader System — Detects influential particles via spatial clustering
// Leaders = particles near the centroid of same-type clusters
// Visual: subtle enlarged glow, no icons/text

import type { MicroState } from '../micro/microState';
import type { SociogenesisState } from './sociogenesisTypes';

export interface Leader {
  particleIndex: number;
  type: number;
  influence: number; // 0-1
  followers: number[];
  bornAt: number;
  x: number;
  y: number;
}

const GRID_SIZE = 12;
const INFLUENCE_RADIUS = 0.2;
const MIN_FOLLOWERS = 4;

/**
 * Detect leaders using spatial grid (O(n))
 */
export function detectLeaders(
  micro: MicroState,
  state: SociogenesisState,
  elapsedSec: number,
): Leader[] {
  if (micro.count < 20) return [];

  // Build spatial grid
  const grid = new Map<string, number[]>();
  for (let i = 0; i < micro.count; i++) {
    const gx = Math.floor((micro.x[i] + 1) * GRID_SIZE / 2);
    const gy = Math.floor((micro.y[i] + 1) * GRID_SIZE / 2);
    const key = `${gx},${gy}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(i);
  }

  const candidateScores = new Float32Array(micro.count);
  const r2 = INFLUENCE_RADIUS * INFLUENCE_RADIUS;
  const sampleStep = Math.max(1, Math.floor(micro.count / 300));

  for (let i = 0; i < micro.count; i += sampleStep) {
    const px = micro.x[i];
    const py = micro.y[i];
    const myType = micro.type[i];
    const gx = Math.floor((px + 1) * GRID_SIZE / 2);
    const gy = Math.floor((py + 1) * GRID_SIZE / 2);

    let neighbors = 0;
    let sameTypeNeighbors = 0;
    let avgDx = 0;
    let avgDy = 0;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gx + dx},${gy + dy}`;
        const cell = grid.get(key);
        if (!cell) continue;
        for (const j of cell) {
          if (i === j) continue;
          const ddx = micro.x[j] - px;
          const ddy = micro.y[j] - py;
          const d2 = ddx * ddx + ddy * ddy;
          if (d2 < r2) {
            neighbors++;
            if (micro.type[j] === myType) {
              sameTypeNeighbors++;
              avgDx += ddx;
              avgDy += ddy;
            }
          }
        }
      }
    }

    if (sameTypeNeighbors >= MIN_FOLLOWERS) {
      avgDx /= sameTypeNeighbors;
      avgDy /= sameTypeNeighbors;
      const displacement = Math.sqrt(avgDx * avgDx + avgDy * avgDy);
      const centrality = Math.max(0, 1 - displacement / 0.08);
      candidateScores[i] = sameTypeNeighbors * 0.5 + centrality * 30 + neighbors * 0.2;
    }
  }

  const maxLeaders = Math.min(6, Math.ceil(micro.count * 0.02));
  const allCandidates: Array<{ idx: number; score: number }> = [];
  for (let i = 0; i < micro.count; i += sampleStep) {
    if (candidateScores[i] > 0) {
      allCandidates.push({ idx: i, score: candidateScores[i] });
    }
  }
  allCandidates.sort((a, b) => b.score - a.score);

  const leaders: Leader[] = [];

  for (const cand of allCandidates) {
    if (leaders.length >= maxLeaders) break;
    const idx = cand.idx;
    const t = micro.type[idx];

    if (leaders.filter(l => l.type === t).length >= 2) continue;

    const followers: number[] = [];
    const px = micro.x[idx];
    const py = micro.y[idx];
    const gx = Math.floor((px + 1) * GRID_SIZE / 2);
    const gy = Math.floor((py + 1) * GRID_SIZE / 2);
    const followerR2 = (INFLUENCE_RADIUS * 1.5) ** 2;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gx + dx},${gy + dy}`;
        const cell = grid.get(key);
        if (!cell) continue;
        for (const j of cell) {
          if (j === idx || micro.type[j] !== t) continue;
          const ddx = micro.x[j] - px;
          const ddy = micro.y[j] - py;
          if (ddx * ddx + ddy * ddy < followerR2) {
            followers.push(j);
          }
        }
      }
    }

    if (followers.length < MIN_FOLLOWERS) continue;

    leaders.push({
      particleIndex: idx,
      type: t,
      influence: Math.min(1, cand.score / 60),
      followers,
      bornAt: elapsedSec,
      x: micro.x[idx],
      y: micro.y[idx],
    });
  }

  return leaders;
}

/**
 * Apply leader influence — leaders pull followers
 */
export function applyLeaderInfluence(
  micro: MicroState,
  leaders: Leader[],
  gain: number,
): void {
  for (const leader of leaders) {
    if (leader.particleIndex >= micro.count) continue;
    const lx = micro.x[leader.particleIndex];
    const ly = micro.y[leader.particleIndex];
    const strength = leader.influence * gain * 0.008;

    for (const fi of leader.followers) {
      if (fi >= micro.count) continue;
      const dx = lx - micro.x[fi];
      const dy = ly - micro.y[fi];
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d > 0.005 && d < 0.4) {
        const pull = strength * Math.min(1, d * 5);
        micro.vx[fi] += (dx / d) * pull;
        micro.vy[fi] += (dy / d) * pull;
      }
    }

    // Slight charisma boost
    const speed = Math.sqrt(
      micro.vx[leader.particleIndex] ** 2 + micro.vy[leader.particleIndex] ** 2
    );
    if (speed > 0.001) {
      const boost = 1 + leader.influence * 0.02;
      micro.vx[leader.particleIndex] *= boost;
      micro.vy[leader.particleIndex] *= boost;
    }
  }
}

/**
 * Render leaders — subtle glow only, no icons/text
 */
export function renderLeaders(
  ctx: CanvasRenderingContext2D,
  leaders: Leader[],
  width: number,
  height: number,
  palette: string[],
): void {
  if (leaders.length === 0) return;
  ctx.save();

  for (const leader of leaders) {
    const sx = (leader.x + 1) * 0.5 * width;
    const sy = (-leader.y + 1) * 0.5 * height;
    const color = palette[leader.type % palette.length] || '#ffffff';
    const size = 3 + leader.influence * 3;

    // Soft glow
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 4);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(sx, sy, size * 4, 0, Math.PI * 2);
    ctx.fill();

    // Brighter core (larger than a regular particle)
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(sx, sy, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
