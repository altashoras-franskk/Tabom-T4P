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
  const step = 3;
  
  ctx.save();
  ctx.font = '16px monospace';
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
      if (max < 0.25) continue; // threshold for visibility
      
      let glyph = '';
      let color = '';
      
      if (b === max) { glyph = GLYPHS.bond; color = COLORS.bond; }
      else if (r === max) { glyph = GLYPHS.rift; color = COLORS.rift; }
      else if (l === max) { glyph = GLYPHS.bloom; color = COLORS.bloom; }
      else if (o === max) { glyph = GLYPHS.oath; color = COLORS.oath; }
      
      // Convert grid coords to normalized (-1..1)
      const nx = (gx / w) * 2 - 1;
      const ny = (gy / h) * 2 - 1;
      
      // Convert normalized to canvas coords
      const cx = ((nx + 1) / 2) * canvasWidth;
      const cy = ((ny + 1) / 2) * canvasHeight;
      
      // Alpha based on intensity
      const alpha = Math.min(0.6, max * 0.8);
      
      ctx.fillStyle = color + alpha + ')';
      ctx.fillText(glyph, cx, cy);
    }
  }
  
  ctx.restore();
}
