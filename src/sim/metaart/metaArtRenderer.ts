// ─── Meta-Arte: Renderer ───────────────────────────────────────────────────
import type { DNA, LayerState, Quantum } from './metaArtTypes';
import { compositeLayersToMain } from './metaArtLayers';

// ── Fade the trail canvas — dramatic memory curve ────────────────────────────
export function fadeTrailLayer(layer: LayerState, dna: DNA, dt = 1.0): void {
  if (!layer.canvas) return;
  const ctx = layer.canvas.getContext('2d')!;
  const { memory } = dna.genes;
  // Dramatic range: memory=0 → 0.48 (gone in ~8 frames), memory=1 → 0.998 (almost permanent)
  const baseDecay = 0.48 + Math.pow(memory, 0.45) * 0.518;
  // TRUE slow-motion: scale fade by dt so trail persists proportionally to sim speed
  // dt=1.0 → normal fade; dt=0.1 → pow(baseDecay, 0.1) ≈ almost no fade per frame
  const decayAlpha = dt <= 0 ? 1.0 : Math.pow(Math.max(0.001, Math.min(0.9999, baseDecay)), Math.max(0.02, dt));

  ctx.globalCompositeOperation = 'destination-in';
  ctx.globalAlpha = decayAlpha;
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// ── Post / FX layer — soft bloom from the trail canvas ─────────────────────
export function renderPostLayer(
  postLayer: LayerState,
  trailLayer: LayerState,
  dna: DNA,
  W: number, H: number
): void {
  if (!postLayer.canvas || !trailLayer.canvas) return;
  const ctx = postLayer.canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  const { coherence, contrast } = dna.genes;
  const bloomStr = coherence * (1 - contrast * 0.3);

  if (bloomStr > 0.1) {
    ctx.save();
    ctx.filter = `blur(${Math.round(6 + coherence * 14)}px)`;
    ctx.globalAlpha = bloomStr * 0.5;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(trailLayer.canvas, 0, 0);
    ctx.filter = 'none';
    ctx.restore();
  }
}

// ── Pulse overlay — concentric rings from dense cluster centres ─────────────
export function renderPulseOnto(
  ctx: CanvasRenderingContext2D,
  quanta: Quantum[],
  dna: DNA,
  W: number, H: number,
  tick: number
): void {
  const { coherence, flow } = dna.genes;
  if (coherence < 0.3) return;

  // Find rough cluster centre (weighted average)
  let cx = 0, cy = 0, w = 0;
  for (const q of quanta) {
    const ink = q.ink;
    cx += q.x * ink; cy += q.y * ink; w += ink;
  }
  if (w < 1) return;
  cx /= w; cy /= w;

  const baseR = Math.min(W, H) * 0.08;
  const rings = 3;
  for (let r = 0; r < rings; r++) {
    const phase  = (tick * 0.012 * (1 + flow * 0.5) + r / rings) % 1;
    const radius = baseR * (1 + phase * 3.5);
    const alpha  = (1 - phase) * coherence * 0.08;
    ctx.globalAlpha = Math.min(0.35, alpha);
    const col = dna.palette[r % dna.palette.length] ?? '#ffffff';
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx * W, cy * H, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ── Main composite ──────────────────────────────────────────────────────────
export function compositeFinal(
  mainCtx: CanvasRenderingContext2D,
  layers: LayerState[],
  dna: DNA,
  W: number, H: number
): void {
  compositeLayersToMain(mainCtx, layers, dna.background, W, H);
}