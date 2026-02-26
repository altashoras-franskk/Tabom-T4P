// PATCH 4.5-SIGILS: Render sigil overlay (subtle glyphs on canvas)

import { SigilFieldState, SigilConfig } from '../sim/sigils/sigilState';

const GLYPHS = {
  bond: '✶',
  rift: '⨯',
  bloom: '⚘',
  oath: '⌬',
};

const COLORS = {
  bond: 'rgba(100, 200, 255, ',   // cyan
  rift: 'rgba(255, 100, 120, ',   // red
  bloom: 'rgba(120, 255, 140, ',  // green
  oath: 'rgba(200, 180, 255, ',   // purple
};

export function drawSigils(
  ctx: CanvasRenderingContext2D,
  sigils: SigilFieldState,
  cfg: SigilConfig,
  canvasWidth: number,
  canvasHeight: number
) {
  if (!cfg.enabled || !cfg.showOverlay) return;

  const w = sigils.width;
  const h = sigils.height;
  
  // Sample sparse grid (every 3rd cell to avoid clutter)
  const step = 4;
  
  ctx.save();
  ctx.font = '12px serif, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for (let gy = 0; gy < h; gy += step) {
    for (let gx = 0; gx < w; gx += step) {
      const idx = gy * w + gx;
      
      const b = sigils.bond[idx];
      const r = sigils.rift[idx];
      const l = sigils.bloom[idx];
      const o = sigils.oath[idx];
      
      // Find dominant sigil
      const max = Math.max(b, r, l, o);
      if (max < 0.33) continue; // threshold for visibility (subtle)
      
      let glyph = '';
      let color = '';
      
      if (b === max) { glyph = GLYPHS.bond; color = COLORS.bond; }
      else if (r === max) { glyph = GLYPHS.rift; color = COLORS.rift; }
      else if (l === max) { glyph = GLYPHS.bloom; color = COLORS.bloom; }
      else if (o === max) { glyph = GLYPHS.oath; color = COLORS.oath; }
      
      // Convert grid coords to canvas coords (cover full extent; avoid left-bias)
      const fx = w <= 1 ? 0.5 : gx / (w - 1);
      const fy = h <= 1 ? 0.5 : gy / (h - 1);
      const pad = 10;
      const cx = pad + fx * Math.max(1, canvasWidth - pad * 2);
      const cy = pad + fy * Math.max(1, canvasHeight - pad * 2);
      
      // Alpha based on intensity
      const alpha = Math.min(0.26, Math.pow(max, 1.6) * 0.32);
      
      ctx.fillStyle = color + alpha + ')';
      ctx.fillText(glyph, cx, cy);
    }
  }
  
  ctx.restore();
}
