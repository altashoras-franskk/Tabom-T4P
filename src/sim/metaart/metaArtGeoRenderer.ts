// ─── Meta-Arte: Geometric Primitive Renderer ─────────────────────────────────
// Solid, legible geometric shapes. In geometric/hybrid mode shapes are
// rendered with FIXED strong alphas — NOT multiplied by q.ink/q.alpha
// (which are fluid-simulation values and start near-zero, making everything
// invisible). Shape identity > transparency.
//
// New params used: shapeOpacity, fillSolidity, strokeWeight, shapeScale,
//                  vignetteStr, grainStr, bloomShape
import type { Quantum, DNA, GeoParams } from './metaArtTypes';

// ── Safe param accessor (backward compat with old presets) ────────────────────
function gp(params: GeoParams, key: keyof GeoParams, def: number): number {
  const v = params[key];
  return (typeof v === 'number' && isFinite(v)) ? v : def;
}

// ── Radial atmosphere — gradient emitters write halos to the base/trail layer ─
export function renderAtmosphereGradients(
  ctx: CanvasRenderingContext2D,
  quanta: Quantum[],
  params: GeoParams,
  palette: string[],
  W: number, H: number,
): void {
  if (params.macroAtmosphere < 0.02) return;
  const emitters = quanta.filter(q => q.kind === 'gradientEmitter');
  if (emitters.length === 0) return;

  // Modest halos — accent only, not the main element
  const baseAlpha = 0.04 + params.macroAtmosphere * 0.09;

  for (const q of emitters) {
    const cx = q.x * W;
    const cy = q.y * H;
    const r  = Math.max(40, (q.qscale ?? 1.5) * 55 * params.macroAtmosphere);

    const col = palette[q.species % palette.length] ?? '#ffffff';
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0,   hexToRgba(col, baseAlpha));
    grad.addColorStop(0.5, hexToRgba(col, baseAlpha * 0.4));
    grad.addColorStop(1,   hexToRgba(col, 0));

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

// ── Geometric primitive renderer ──────────────────────────────────────────────
// Call this on the particles layer (geometric) or on top of trail (hybrid).
// Each frame this clears the particles layer and redraws all shapes fresh —
// shapes are CRISP, OPAQUE and immediately visible.
export function renderGeometricPrimitives(
  ctx: CanvasRenderingContext2D,
  quanta: Quantum[],
  dna: DNA,
  params: GeoParams,
  W: number, H: number,
  tick: number,
): void {
  ctx.save();

  const contrast    = Math.max(0.25, params.macroContrast); // never go below 0.25
  const silence     = params.macroSilence;
  const masterAlpha = gp(params, 'shapeOpacity', 0.85);
  const solidity    = gp(params, 'fillSolidity', 0.35);
  const swMul       = gp(params, 'strokeWeight', 1.0);
  const scaleMul    = gp(params, 'shapeScale', 1.0);

  // Fixed strong alphas — independent of fluid ink/alpha values
  // shapeOpacity is the master gate; macroContrast modulates within it
  const strokeAlpha = masterAlpha * (0.60 + contrast * 0.38);   // solid strokes
  const fillAlpha   = masterAlpha * solidity * (0.28 + contrast * 0.50); // fills scale with solidity

  const { symmetry } = dna.genes;
  const folds = getSymFolds(symmetry);
  const cx = W / 2, cy = H / 2;

  // Draw order: planes first (background) → rects → arcs → lines → points
  const ORDER: Record<string, number> = {
    gradientEmitter: -1, mask: -1,
    plane: 0, rect: 1, arc: 2, line: 3, point: 4,
  };

  const sorted = [...quanta].sort((a, b) =>
    (ORDER[a.kind ?? 'point'] ?? 4) - (ORDER[b.kind ?? 'point'] ?? 4),
  );

  for (const q of sorted) {
    const kind = q.kind ?? 'point';
    if (kind === 'gradientEmitter' || kind === 'mask') continue;

    const px  = q.x * W;
    const py  = q.y * H;
    const hsl = `hsl(${q.hue.toFixed(0)},${Math.min(100, q.sat * 100).toFixed(0)}%,${Math.min(85, q.lit * 100).toFixed(0)}%)`;

    // Silence mode: space-out and reduce density visually
    if (silence > 0.5 && Math.random() < silence * 0.3) continue;

    for (let f = 0; f < folds; f++) {
      let fpx = px, fpy = py;
      if (folds > 1) {
        const angle = (f / folds) * Math.PI * 2;
        const c2 = Math.cos(angle), s2 = Math.sin(angle);
        const dx = px - cx, dy = py - cy;
        fpx = cx + dx * c2 - dy * s2;
        fpy = cy + dx * s2 + dy * c2;
      }

      switch (kind) {
        case 'point':
          drawSolidPoint(ctx, fpx, fpy, q, hsl, strokeAlpha, fillAlpha, W, scaleMul, swMul);
          break;
        case 'line':
          drawSolidLine(ctx, fpx, fpy, q, hsl, strokeAlpha, scaleMul, swMul);
          break;
        case 'arc':
          drawSolidArc(ctx, fpx, fpy, q, hsl, strokeAlpha, fillAlpha, tick, scaleMul, swMul);
          break;
        case 'rect':
          drawSolidRect(ctx, fpx, fpy, q, hsl, strokeAlpha, fillAlpha, scaleMul, swMul);
          break;
        case 'plane':
          drawSolidPlane(ctx, fpx, fpy, q, hsl, fillAlpha, scaleMul);
          break;
      }
    }
  }

  ctx.restore();

  // ── Post-FX passes — applied directly to the same ctx ────────────────────
  const bloomStr  = gp(params, 'bloomShape', 0);
  const grainStr  = gp(params, 'grainStr', 0);
  const vigStr    = gp(params, 'vignetteStr', 0);

  if (bloomStr > 0.05) {
    applyBloomPass(ctx, W, H, bloomStr);
  }
  if (vigStr > 0.02) {
    applyVignette(ctx, W, H, vigStr);
  }
  if (grainStr > 0.02) {
    applyGrain(ctx, W, H, grainStr, tick);
  }
}

// ── POINT — solid dot with shape variant by species ───────────────────────────
// Species 0 = circle, 1 = square, 2 = diamond, 3 = cross/plus, 4 = triangle
function drawSolidPoint(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  q: Quantum, hsl: string,
  strokeAlpha: number, fillAlpha: number,
  W: number, scaleMul: number, swMul: number,
): void {
  const r = Math.max(2.5, q.size * (q.qscale ?? 1) * (W / 800) * scaleMul);
  const variant = q.species % 5;
  ctx.beginPath();

  switch (variant) {
    case 0: // filled circle
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.globalAlpha = strokeAlpha;
      ctx.fillStyle   = hsl;
      ctx.fill();
      break;
    case 1: // filled square
      ctx.globalAlpha = strokeAlpha;
      ctx.fillStyle   = hsl;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
      break;
    case 2: // diamond — filled + outlined
      ctx.moveTo(px,     py - r * 1.4);
      ctx.lineTo(px + r, py);
      ctx.lineTo(px,     py + r * 1.4);
      ctx.lineTo(px - r, py);
      ctx.closePath();
      ctx.globalAlpha = fillAlpha;
      ctx.fillStyle   = hsl;
      ctx.fill();
      ctx.globalAlpha = strokeAlpha;
      ctx.strokeStyle = hsl;
      ctx.lineWidth   = Math.max(1.2, 1.0 * swMul);
      ctx.stroke();
      break;
    case 3: // cross
      ctx.strokeStyle = hsl;
      ctx.lineWidth   = Math.max(1.2, r * 0.6 * swMul);
      ctx.lineCap     = 'round';
      ctx.globalAlpha = strokeAlpha;
      ctx.moveTo(px - r, py); ctx.lineTo(px + r, py);
      ctx.moveTo(px, py - r); ctx.lineTo(px, py + r);
      ctx.stroke();
      break;
    case 4: // triangle — filled
      ctx.moveTo(px,          py - r * 1.3);
      ctx.lineTo(px + r * 1.1, py + r * 0.8);
      ctx.lineTo(px - r * 1.1, py + r * 0.8);
      ctx.closePath();
      ctx.globalAlpha = fillAlpha;
      ctx.fillStyle   = hsl;
      ctx.fill();
      ctx.globalAlpha = strokeAlpha;
      ctx.strokeStyle = hsl;
      ctx.lineWidth   = Math.max(1.0, 0.9 * swMul);
      ctx.stroke();
      break;
  }
}

// ── LINE — solid, thick, oriented stroke ──────────────────────────────────────
function drawSolidLine(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  q: Quantum, hsl: string, alpha: number,
  scaleMul: number, swMul: number,
): void {
  const a   = q.angle ?? 0;
  const len = Math.max(12, (q.length ?? 40) * (q.qscale ?? 1) * scaleMul);
  const hw  = len / 2;
  const cos = Math.cos(a), sin = Math.sin(a);
  const lw  = Math.max(1.2, (q.thickness ?? 1.5) * (q.qscale ?? 1) * swMul);

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = hsl;
  ctx.lineWidth   = lw;
  ctx.lineCap     = 'round';
  ctx.globalCompositeOperation = 'source-over';

  ctx.beginPath();
  ctx.moveTo(px - cos * hw, py - sin * hw);
  ctx.lineTo(px + cos * hw, py + sin * hw);
  ctx.stroke();
}

// ── ARC — partial circle stroke, optionally filled ────────────────────────────
function drawSolidArc(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  q: Quantum, hsl: string,
  strokeAlpha: number, fillAlpha: number,
  _tick: number,
  scaleMul: number, swMul: number,
): void {
  const r     = Math.max(6, (q.length ?? 22) * (q.qscale ?? 1) * scaleMul);
  const phase = (q.age * 0.009 + q.charge * 0.5) % (Math.PI * 2);
  const sweep = Math.PI * (0.5 + q.mood * 1.2);
  const start = phase;
  const end   = phase + sweep;

  ctx.globalAlpha = strokeAlpha;
  ctx.strokeStyle = hsl;
  ctx.lineWidth   = Math.max(1.2, (q.thickness ?? 1.8) * (q.qscale ?? 1) * swMul);
  ctx.lineCap     = 'round';
  ctx.globalCompositeOperation = 'source-over';

  ctx.beginPath();
  ctx.arc(px, py, r, start, end);
  ctx.stroke();

  // Chord fill (subtle) when fillAlpha is significant
  if (fillAlpha > 0.05 && sweep >= Math.PI) {
    ctx.globalAlpha = fillAlpha * 0.5;
    ctx.fillStyle   = hsl;
    ctx.beginPath();
    ctx.arc(px, py, r, start, end);
    ctx.closePath();
    ctx.fill();
  }
}

// ── RECT — outlined rectangle, optionally filled ──────────────────────────────
function drawSolidRect(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  q: Quantum, hsl: string,
  strokeAlpha: number, fillAlpha: number,
  scaleMul: number, swMul: number,
): void {
  const s  = Math.max(6, q.size * (q.qscale ?? 1) * 5 * scaleMul);
  const a  = q.angle ?? 0;
  const th = Math.max(1.0, (q.thickness ?? 1.5) * swMul);
  const w  = s;
  const h  = Math.max(4, s * (0.45 + q.mood * 0.75));

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(a);

  // Fill — driven by fillSolidity (fillAlpha already has it baked in)
  if (fillAlpha > 0.02) {
    ctx.globalAlpha = fillAlpha;
    ctx.fillStyle   = hsl;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }

  // Stroke — always solid
  ctx.globalAlpha = strokeAlpha;
  ctx.strokeStyle = hsl;
  ctx.lineWidth   = th;
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  ctx.restore();
}

// ── PLANE — large filled block ────────────────────────────────────────────────
function drawSolidPlane(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  q: Quantum, hsl: string,
  fillAlpha: number,
  scaleMul: number,
): void {
  const baseW = Math.max(24, q.size * (q.qscale ?? 1) * 20 * scaleMul);
  const baseH = Math.max(16, baseW * (0.4 + q.mood * 0.9));
  const a     = q.angle ?? 0;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(a);

  // Planes get a boosted fill — they ARE the composition element
  // fillAlpha already incorporates shapeOpacity * fillSolidity
  const planeFill = Math.min(0.92, fillAlpha * 1.6 + 0.15);
  ctx.globalAlpha = planeFill;
  ctx.fillStyle   = hsl;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillRect(-baseW / 2, -baseH / 2, baseW, baseH);

  // Thin border
  ctx.globalAlpha = Math.min(0.85, planeFill * 0.9);
  ctx.strokeStyle = hsl;
  ctx.lineWidth   = 0.9;
  ctx.strokeRect(-baseW / 2, -baseH / 2, baseW, baseH);

  ctx.restore();
}

// ── FX: bloom — duplicate + blur + screen ─────────────────────────────────────
function applyBloomPass(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  strength: number,
): void {
  // Copy existing pixel data into a temp canvas, blur it, screen-blend back
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  const tCtx = tmp.getContext('2d')!;
  tCtx.drawImage(ctx.canvas, 0, 0);

  const blurPx = Math.round(4 + strength * 18);
  ctx.save();
  ctx.filter = `blur(${blurPx}px)`;
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = strength * 0.55;
  ctx.drawImage(tmp, 0, 0);
  ctx.filter = 'none';
  ctx.restore();
}

// ── FX: vignette — radial dark gradient from edges ───────────────────────────
function applyVignette(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  strength: number,
): void {
  const cx = W / 2, cy = H / 2;
  const r  = Math.sqrt(cx * cx + cy * cy);
  const grad = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${(strength * 0.75).toFixed(3)})`);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ── FX: grain — pseudo-random additive noise ─────────────────────────────────
// Uses a cheap XOR-shift tiled approach — no ImageData so it stays GPU-friendly
function applyGrain(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  strength: number,
  tick: number,
): void {
  // Only update every 2 frames for performance
  if (tick % 2 !== 0) return;

  const seed = tick * 1234567;
  const cols = Math.ceil(W / 4);
  const rows = Math.ceil(H / 4);
  const alpha = strength * 0.18;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      // Fast hash
      let h = (i * 73856093) ^ (j * 19349663) ^ seed;
      h = ((h >> 16) ^ h) * 0x45d9f3b;
      h = ((h >> 16) ^ h);
      const v = (h & 0xff) / 255;

      if (v > 0.5) {
        ctx.globalAlpha = alpha * (v - 0.5) * 2;
        ctx.fillStyle   = v > 0.75 ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)';
        ctx.fillRect(i * 4, j * 4, 4, 4);
      }
    }
  }

  ctx.restore();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSymFolds(symmetry: number): number {
  if (symmetry < 0.28) return 1;
  if (symmetry < 0.50) return 2;
  if (symmetry < 0.66) return 4;
  if (symmetry < 0.82) return 6;
  return 8;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const len = h.length;
  if (len < 6) return `rgba(128,128,128,${alpha.toFixed(4)})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(4)})`;
}
