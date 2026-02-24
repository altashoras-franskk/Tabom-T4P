// ─────────────────────────────────────────────────────────────────────────────
// Language Lab – Stroke Accumulator
// Manages ink deposits with decay; renders to offscreen canvas for performance
// ─────────────────────────────────────────────────────────────────────────────
import type { WorldState, Stroke, LanguageParams } from './types';

// ── State ─────────────────────────────────────────────────────────────────────
export interface StrokeState {
  offscreen: OffscreenCanvas | null;
  offCtx: OffscreenCanvasRenderingContext2D | null;
  width: number;
  height: number;
  lastFadeTime: number;
}

export function createStrokeState(w: number, h: number): StrokeState {
  let offscreen: OffscreenCanvas | null = null;
  let offCtx: OffscreenCanvasRenderingContext2D | null = null;
  try {
    offscreen = new OffscreenCanvas(w, h);
    offCtx = offscreen.getContext('2d', { alpha: true }) as OffscreenCanvasRenderingContext2D;
  } catch (_) { /* OffscreenCanvas not available */ }
  return { offscreen, offCtx, width: w, height: h, lastFadeTime: 0 };
}

export function resizeStrokeState(ss: StrokeState, w: number, h: number): void {
  ss.width = w; ss.height = h;
  try {
    ss.offscreen = new OffscreenCanvas(w, h);
    ss.offCtx = ss.offscreen.getContext('2d', { alpha: true }) as OffscreenCanvasRenderingContext2D;
  } catch (_) {}
}

// ── Deposit strokes from high-coherence quanta forming loops ─────────────────
export function depositStrokes(
  state: WorldState,
  params: LanguageParams,
  dt: number,
): void {
  const { quanta } = state;
  const maxAge = 60 - params.inkDecay * 30; // inkDecay=0 → 60s, =1 → 30s

  // Age and prune existing strokes
  const keep: Stroke[] = [];
  for (const s of state.strokes) {
    s.age += dt;
    s.alpha = Math.max(0, 1 - s.age / s.maxAge);
    if (s.age < s.maxAge) keep.push(s);
  }
  state.strokes = keep;

  // Deposit new strokes from scribing quanta
  for (const q of quanta) {
    const loopFac = q.coherence * q.scribeAffinity;
    if (loopFac < 0.35 || q.ink < 0.25) continue;
    // Only deposit every so often per quantum (stochastic)
    if (Math.random() > loopFac * 0.04 * dt * 60) continue;

    // Build a short arc segment
    const segLen = 3 + Math.floor(loopFac * 8);
    const points = [{ x: q.x, y: q.y }];
    // Extrapolate forward based on velocity
    let px = q.x, py = q.y;
    for (let i = 1; i < segLen; i++) {
      px += q.vx * 0.6 / 60;
      py += q.vy * 0.6 / 60;
      points.push({ x: ((px % 1) + 1) % 1, y: ((py % 1) + 1) % 1 });
    }

    state.strokes.push({
      points,
      thickness: 1.5 + loopFac * 3.5,
      alpha: 0.6 + q.ink * 0.35,
      age: 0,
      maxAge: maxAge * (0.7 + q.scribeAffinity * 0.3),
    });

    // Consume ink
    q.ink = Math.max(0, q.ink - 0.06 * loopFac);
  }

  // Cap at 800 strokes for performance
  if (state.strokes.length > 800) {
    state.strokes = state.strokes.slice(state.strokes.length - 800);
  }
}

// ── Render strokes onto offscreen canvas ─────────────────────────────────────
export function renderStrokesToOffscreen(
  ss: StrokeState,
  strokes: Stroke[],
  time: number,
): void {
  const ctx = ss.offCtx;
  if (!ctx) return;

  // Fade the offscreen canvas (alpha rectangle)
  const fadeInterval = 0.5; // seconds
  if (time - ss.lastFadeTime > fadeInterval) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, 0, ss.width, ss.height);
    ss.lastFadeTime = time;
  }

  const W = ss.width, H = ss.height;

  ctx.save();
  ctx.strokeStyle = 'rgba(8,5,2,0.72)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(8,5,2,0.18)';
  ctx.shadowBlur = 3;

  for (const s of strokes) {
    if (s.points.length < 2) continue;
    ctx.globalAlpha = s.alpha * 0.55;
    ctx.lineWidth = s.thickness;
    ctx.beginPath();
    ctx.moveTo(s.points[0].x * W, s.points[0].y * H);
    for (let i = 1; i < s.points.length; i++) {
      ctx.lineTo(s.points[i].x * W, s.points[i].y * H);
    }
    ctx.stroke();
  }

  ctx.restore();
}

// ── Draw offscreen to main canvas ────────────────────────────────────────────
export function blitStrokes(
  mainCtx: CanvasRenderingContext2D,
  ss: StrokeState,
  alpha = 0.85,
): void {
  if (!ss.offscreen) return;
  mainCtx.save();
  mainCtx.globalAlpha = alpha;
  mainCtx.drawImage(ss.offscreen, 0, 0, mainCtx.canvas.width, mainCtx.canvas.height);
  mainCtx.restore();
}

// ── Draw strokes directly on main canvas (fallback) ──────────────────────────
export function renderStrokesDirect(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  W: number, H: number,
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(8,5,2,0.75)';
  ctx.shadowColor = 'rgba(8,5,2,0.15)';
  ctx.shadowBlur = 3;

  for (const s of strokes) {
    if (s.points.length < 2) continue;
    ctx.globalAlpha = s.alpha * 0.55;
    ctx.lineWidth = s.thickness;
    ctx.beginPath();
    ctx.moveTo(s.points[0].x * W, s.points[0].y * H);
    for (let i = 1; i < s.points.length; i++) {
      ctx.lineTo(s.points[i].x * W, s.points[i].y * H);
    }
    ctx.stroke();
  }
  ctx.restore();
}