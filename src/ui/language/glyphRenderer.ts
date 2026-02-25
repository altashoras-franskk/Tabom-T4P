// ─────────────────────────────────────────────────────────────────────────────
// Glyph Renderer — Heptapod Ink ("A Chegada")
// Thick calligraphic brushstroke ring + organic ink splatters
// Black ink on frosted-white background
// ─────────────────────────────────────────────────────────────────────────────
import type { GlyphSpec, Notch } from '../../sim/language/types';

const TWO_PI = Math.PI * 2;

export interface DrawGlyphOptions {
  alpha?: number;
  glow?: boolean;           // kept for compat — ignored in ink style
  glowColor?: string;       // kept for compat — ignored
  strokeColor?: string;     // kept for compat — ignored
  animated?: boolean;
  time?: number;
  skipBackground?: boolean; // if true, don't fill the white circle background
  fast?: boolean;           // simplified single-pass render for small thumbnails
}

// ── Seeded deterministic pseudo-random (no state) ────────────────────────────
function rng(seed: number): number {
  const s = Math.sin(seed * 9301.0 + 49297.0) * 233280.0;
  return s - Math.floor(s);
}

// ── Is an angle inside a notch gap region? ───────────────────────────────────
function isInNotchGap(angle: number, notches: Notch[]): boolean {
  const a = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  for (const n of notches) {
    const na = ((n.angle % TWO_PI) + TWO_PI) % TWO_PI;
    const half = n.width * 0.22; // narrow gap — splatters dominate
    const diff = Math.abs(((a - na + Math.PI * 3) % TWO_PI) - Math.PI);
    if (diff < half) return true;
  }
  return false;
}

// ── Stroke thickness profile — varies smoothly around the ring ───────────────
function strokeProfile(t: number, hashSeed: number, notches: Notch[]): number {
  // 3 harmonics give organic variation
  let v = 1.0;
  v += 0.20 * Math.sin(t * TWO_PI * 3 + hashSeed * 0.011);
  v += 0.12 * Math.sin(t * TWO_PI * 5 + hashSeed * 0.023);
  v += 0.07 * Math.sin(t * TWO_PI * 8 + hashSeed * 0.037);

  // Taper near notch positions
  for (const n of notches) {
    const na = ((n.angle % TWO_PI) + TWO_PI) % TWO_PI;
    const tAngle = t * TWO_PI;
    const diff = Math.abs(((tAngle - na + Math.PI * 3) % TWO_PI) - Math.PI);
    if (diff < n.width * 2.5) {
      const fade = diff / (n.width * 2.5);
      v *= 0.18 + 0.82 * fade; // thin down as we approach the splatter
    }
  }
  return Math.max(0.05, v);
}

// ── Draw the main brushstroke ring ───────────────────────────────────────────
function drawBrushRing(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  notches: Notch[],
  roughness: number,
  hashSeed: number,
  fast = false,
): void {
  if (r <= 1) return;

  const SEGS    = fast ? 60 : r < 40 ? 100 : r < 80 ? 160 : 220;
  const baseW   = r * 0.105;

  const passes = fast
    ? [{ widthMult: 1.0, alpha: 0.88, rOff: 0.0 }]
    : [
        { widthMult: 2.0, alpha: 0.09, rOff: 1.2  },
        { widthMult: 1.35, alpha: 0.22, rOff: 0.4  },
        { widthMult: 1.0,  alpha: 0.91, rOff: 0.0  },
        { widthMult: 0.45, alpha: 0.52, rOff: -0.5 },
      ];

  for (const pass of passes) {
    for (let i = 0; i < SEGS; i++) {
      const t  = i / SEGS;
      const t2 = (i + 1) / SEGS;
      const a  = t  * TWO_PI - Math.PI / 2;
      const a2 = t2 * TWO_PI - Math.PI / 2;

      if (isInNotchGap(a, notches)) continue;

      const prof = strokeProfile(t, hashSeed, notches);

      // Roughness jitter (each pass gets its own offset so layers don't align perfectly)
      const seed1 = hashSeed + i * 7 + pass.rOff * 1000;
      const seed2 = hashSeed + (i + 1) * 7 + pass.rOff * 1000;
      const rj1 = roughness > 0.01 ? (rng(seed1) - 0.5) * roughness * r * 0.14 : 0;
      const rj2 = roughness > 0.01 ? (rng(seed2) - 0.5) * roughness * r * 0.14 : 0;

      const r1 = Math.max(0.1, r + pass.rOff + rj1);
      const r2 = Math.max(0.1, r + pass.rOff + rj2);

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a)  * r1, cy + Math.sin(a)  * r1);
      ctx.lineTo(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2);
      ctx.lineWidth    = Math.max(0.5, baseW * pass.widthMult * prof);
      ctx.strokeStyle  = `rgba(8,5,2,${pass.alpha})`;
      ctx.lineCap      = 'round';
      ctx.stroke();
    }
  }
}

// ── Ink splatter / tendril burst at a notch position ─────────────────────────
function drawInkSplatter(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number, y: number,   // position on the ring
  r: number,              // glyph radius (for scale)
  outwardAngle: number,   // angle pointing AWAY from circle centre
  seed: number,
): void {
  const baseSize = r * (0.14 + rng(seed) * 0.18);

  // ── Central irregular blob ─────────────────────────────────────────────────
  const blobR = Math.max(0.5, baseSize * (0.28 + rng(seed + 1) * 0.22));
  ctx.beginPath();
  ctx.arc(x, y, blobR, 0, TWO_PI);
  ctx.fillStyle = 'rgba(6,4,2,0.96)';
  ctx.fill();

  // Blob is irregular: add 3-5 offset sub-circles
  for (let k = 0; k < 4; k++) {
    const offAngle = outwardAngle + (rng(seed + k * 3 + 10) - 0.5) * Math.PI * 0.6;
    const offDist  = blobR * (0.35 + rng(seed + k * 3 + 11) * 0.55);
    const subR     = Math.max(0.4, blobR * (0.35 + rng(seed + k * 3 + 12) * 0.65));
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(offAngle) * offDist,
      y + Math.sin(offAngle) * offDist,
      subR, 0, TWO_PI,
    );
    ctx.fillStyle = `rgba(6,4,2,${0.72 + rng(seed + k * 3 + 13) * 0.24})`;
    ctx.fill();
  }

  // ── Tendrils ──────────────────────────────────────────────────────────────
  const numTendrils = 3 + Math.floor(rng(seed + 2) * 6); // 3–8

  for (let i = 0; i < numTendrils; i++) {
    // ~80% go outward, ~20% go inward
    const isOutward = rng(seed + i * 7 + 20) > 0.18;
    const baseDir   = isOutward ? outwardAngle : outwardAngle + Math.PI;
    const spread    = (rng(seed + i * 7 + 21) - 0.5) * Math.PI * 0.9;
    const dir       = baseDir + spread;
    const length    = baseSize * (0.7 + rng(seed + i * 7 + 22) * 2.8);
    const tendrilW  = Math.max(0.4, baseSize * (0.035 + rng(seed + i * 7 + 23) * 0.10));
    const alpha     = 0.5 + rng(seed + i * 7 + 24) * 0.46;

    // Curved bezier tendril
    const bend  = (rng(seed + i * 7 + 25) - 0.5) * 0.8;
    const cpLen = length * (0.3 + rng(seed + i * 7 + 26) * 0.35);
    const cpx   = x + Math.cos(dir + bend) * cpLen;
    const cpy   = y + Math.sin(dir + bend) * cpLen;
    const ex    = x + Math.cos(dir) * length;
    const ey    = y + Math.sin(dir) * length;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(cpx, cpy, ex, ey);
    ctx.lineWidth   = tendrilW;
    ctx.strokeStyle = `rgba(6,4,2,${alpha})`;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Droplet at tip
    const dropR = Math.max(0.3, tendrilW * (1.0 + rng(seed + i * 7 + 27) * 1.8));
    ctx.beginPath();
    ctx.arc(ex, ey, dropR, 0, TWO_PI);
    ctx.fillStyle = `rgba(6,4,2,${alpha * 0.88})`;
    ctx.fill();

    // Sub-branch (fork)
    if (length > baseSize * 0.85 && rng(seed + i * 7 + 28) > 0.42) {
      const subN = 1 + Math.floor(rng(seed + i * 7 + 29) * 2);
      for (let j = 0; j < subN; j++) {
        // Approximate a point along the bezier at t~0.5
        const bt   = 0.42 + rng(seed + i * 7 + j * 31 + 30) * 0.38;
        const bt1  = 1 - bt;
        const bpx  = bt1 * bt1 * x + 2 * bt1 * bt * cpx + bt * bt * ex;
        const bpy  = bt1 * bt1 * y + 2 * bt1 * bt * cpy + bt * bt * ey;
        const sDir = dir + (rng(seed + i * 7 + j * 31 + 31) - 0.5) * Math.PI * 0.75;
        const sLen = length * (0.14 + rng(seed + i * 7 + j * 31 + 32) * 0.32);

        ctx.beginPath();
        ctx.moveTo(bpx, bpy);
        ctx.lineTo(bpx + Math.cos(sDir) * sLen, bpy + Math.sin(sDir) * sLen);
        ctx.lineWidth   = Math.max(0.3, tendrilW * 0.55);
        ctx.strokeStyle = `rgba(6,4,2,${alpha * 0.65})`;
        ctx.stroke();
      }
    }
  }
}

// ── Animated breathing ring (ferrofluid-style flowing ink) ──────────────────
function drawAnimatedBrushRing(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  notches: Notch[], roughness: number, hashSeed: number,
  time: number,
): void {
  if (r <= 1) return;

  const SEGS  = r < 40 ? 100 : r < 80 ? 160 : 220;
  const baseW = r * 0.105;

  const passes = [
    { widthMult: 2.0,  alpha: 0.07, rOff: 1.5 },
    { widthMult: 1.35, alpha: 0.18, rOff: 0.6 },
    { widthMult: 1.0,  alpha: 0.88, rOff: 0.0 },
    { widthMult: 0.45, alpha: 0.45, rOff: -0.6 },
  ];

  for (const pass of passes) {
    for (let i = 0; i < SEGS; i++) {
      const t  = i / SEGS;
      const t2 = (i + 1) / SEGS;
      const a  = t  * TWO_PI - Math.PI / 2;
      const a2 = t2 * TWO_PI - Math.PI / 2;

      if (isInNotchGap(a, notches)) continue;

      const prof = strokeProfile(t, hashSeed, notches);

      // Time-driven flow: ink "pulse" travels around the ring
      const flowPhase = time * 1.8 + hashSeed * 0.001;
      const flowWave  = 0.85 + 0.15 * Math.sin(a * 3 + flowPhase)
                       + 0.10 * Math.sin(a * 5 - flowPhase * 0.7)
                       + 0.05 * Math.sin(a * 8 + flowPhase * 1.3);

      // Breathing: ring radius oscillates
      const breathe = Math.sin(time * 0.9 + a * 2) * r * 0.015
                    + Math.sin(time * 1.7 + a * 4) * r * 0.008;

      const seed1 = hashSeed + i * 7 + pass.rOff * 1000;
      const seed2 = hashSeed + (i + 1) * 7 + pass.rOff * 1000;
      const rj1 = roughness > 0.01 ? (rng(seed1) - 0.5) * roughness * r * 0.14 : 0;
      const rj2 = roughness > 0.01 ? (rng(seed2) - 0.5) * roughness * r * 0.14 : 0;

      const r1 = Math.max(0.1, r + pass.rOff + rj1 + breathe);
      const r2 = Math.max(0.1, r + pass.rOff + rj2 + breathe);

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a)  * r1, cy + Math.sin(a)  * r1);
      ctx.lineTo(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2);
      ctx.lineWidth   = Math.max(0.5, baseW * pass.widthMult * prof * flowWave);
      ctx.strokeStyle = `rgba(8,5,2,${pass.alpha * flowWave})`;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }
  }
}

// ── Public: draw glyph ────────────────────────────────────────────────────────
export function drawGlyph(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  spec: GlyphSpec,
  cx: number, cy: number,
  r: number,
  opts: DrawGlyphOptions = {},
): void {
  if (r <= 2) return;

  const { alpha = 1, skipBackground = false, fast = r < 32, animated = false, time = 0 } = opts;
  const hashSeed = (parseInt(spec.signatureHash.slice(0, 8), 16) || 1) >>> 0;
  const ringR    = Math.max(2, r * Math.max(0.55, spec.outerRing.radius));

  ctx.save();
  ctx.globalAlpha = alpha;

  // ── Frosted-white background circle ───────────────────────────────────────
  if (!skipBackground) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.08, 0, TWO_PI);
    ctx.fillStyle = 'rgba(250,248,244,0.97)';
    ctx.fill();
    if (!fast) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.08, 0, TWO_PI);
      ctx.strokeStyle = 'rgba(190,180,165,0.25)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  // ── Main brushstroke ring ─────────────────────────────────────────────────
  if (animated && !fast) {
    drawAnimatedBrushRing(ctx, cx, cy, ringR, spec.notches, spec.outerRing.roughness, hashSeed, time);
  } else {
    drawBrushRing(ctx, cx, cy, ringR, spec.notches, spec.outerRing.roughness, hashSeed, fast);
  }

  // ── Inner rings (animated: they rotate) ──────────────────────────────────
  if (!fast && spec.innerRings.length > 0) {
    for (let ri = 0; ri < spec.innerRings.length; ri++) {
      const ir = spec.innerRings[ri];
      const irR = Math.max(2, r * Math.max(0.2, ir.radius));
      const rotAngle = animated ? time * 0.5 * (ri % 2 === 0 ? 1 : -1) + ir.phaseOffset : ir.phaseOffset;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotAngle);
      ctx.translate(-cx, -cy);
      if (animated) {
        drawAnimatedBrushRing(ctx, cx, cy, irR, [], spec.outerRing.roughness * 0.5, hashSeed + ri * 999 + 7777, time);
      } else {
        drawBrushRing(ctx, cx, cy, irR, [], spec.outerRing.roughness * 0.5, hashSeed + ri * 999 + 7777, false);
      }
      ctx.restore();
    }
  }

  // ── Ink splatters at notch positions ──────────────────────────────────────
  const maxSplatters = fast ? Math.min(1, spec.notches.length) : spec.notches.length;
  for (let ni = 0; ni < maxSplatters; ni++) {
    const n   = spec.notches[ni];
    const ang = n.angle + (animated ? Math.sin(time * 0.6 + ni * 1.2) * 0.06 : 0);
    const splatR = ringR + (animated ? Math.sin(time * 1.1 + ni) * r * 0.02 : 0);
    const sx  = cx + Math.cos(ang) * splatR;
    const sy  = cy + Math.sin(ang) * splatR;
    drawInkSplatter(ctx, sx, sy, r, ang, hashSeed + ni * 4001);
  }

  ctx.restore();
}

// ── Draw large (used for overlay and NodeInspector) ──────────────────────────
export function drawGlyphLarge(
  ctx: CanvasRenderingContext2D,
  spec: GlyphSpec,
  cx: number, cy: number,
  r: number,
  time: number,
  alpha = 1,
): void {
  drawGlyph(ctx, spec, cx, cy, r, { alpha, animated: true, time });
}