// Recursive Field Heatmap Renderer
// Renders A-S (Affinity - Stress) as visual overlay

import type { RecursiveFieldState } from '../sim/field/fieldTypes';

export function renderRecursiveFieldHeatmap(
  ctx: CanvasRenderingContext2D,
  field: RecursiveFieldState,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const w = field.w;
  const h = field.h;
  
  const cellW = canvasWidth / w;
  const cellH = canvasHeight / h;
  
  // Render with threshold to avoid noise
  const threshold = 0.08;
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = field.A[i];
      const s = field.S[i];
      
      // A-S differential
      const diff = a - s;
      
      if (Math.abs(diff) < threshold) continue;
      
      // A > S: cyan (cohesion), S > A: red (stress)
      const px = x * cellW;
      const py = y * cellH;
      
      if (diff > 0) {
        // Affinity/cohesion
        ctx.fillStyle = `rgba(100, 200, 255, ${Math.min(0.3, diff * 0.4)})`;
      } else {
        // Stress/tension
        ctx.fillStyle = `rgba(255, 100, 120, ${Math.min(0.3, -diff * 0.4)})`;
      }
      
      ctx.fillRect(px, py, cellW, cellH);
    }
  }
}

// Declare for App.tsx
declare global {
  interface Window {
    renderRecursiveFieldHeatmap?: typeof renderRecursiveFieldHeatmap;
  }
}

if (typeof window !== 'undefined') {
  window.renderRecursiveFieldHeatmap = renderRecursiveFieldHeatmap;
}
