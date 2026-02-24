// Optimized Canvas 2D renderer with Particle Life-style trails
import { MicroState } from '../../sim/micro/microState';
import { getTypeColor } from '../palette';
import { RenderQuality } from '../../engine/performance';

// Trail canvas (persistent offscreen buffer)
let trailCanvas: HTMLCanvasElement | null = null;
let trailCtx: CanvasRenderingContext2D | null = null;
let lastWidth = 0;
let lastHeight = 0;

// Performance optimizations: gradient cache
const gradientCache = new Map<string, CanvasGradient>();
const colorCache = new Map<number, { solid: string; transparent: string; glow: string }>();

const getColorVariants = (type: number): { solid: string; transparent: string; glow: string } => {
  if (!colorCache.has(type)) {
    const baseColor = getTypeColor(type);
    colorCache.set(type, {
      solid: baseColor,
      transparent: baseColor.replace('rgb', 'rgba').replace(')', ', 0.05)'),
      glow: baseColor.replace('rgb', 'rgba').replace(')', ', 0.15)')
    });
  }
  return colorCache.get(type)!;
};

const createGradient = (
  ctx: CanvasRenderingContext2D, 
  x1: number, y1: number, 
  x2: number, y2: number, 
  type: number
): CanvasGradient => {
  const key = `${type}_${Math.round(x2-x1)}_${Math.round(y2-y1)}`;
  
  if (!gradientCache.has(key)) {
    const gradient = ctx.createLinearGradient(0, 0, x2-x1, y2-y1);
    const colors = getColorVariants(type);
    gradient.addColorStop(0, colors.transparent);
    gradient.addColorStop(0.5, colors.solid.replace('rgb', 'rgba').replace(')', ', 0.4)'));
    gradient.addColorStop(1, colors.solid);
    gradientCache.set(key, gradient);
    
    // Limit cache size
    if (gradientCache.size > 50) {
      const firstKey = gradientCache.keys().next().value;
      gradientCache.delete(firstKey);
    }
  }
  
  return gradientCache.get(key)!;
};

const initTrailCanvas = (width: number, height: number): void => {
  if (!trailCanvas || lastWidth !== width || lastHeight !== height) {
    trailCanvas = document.createElement('canvas');
    trailCanvas.width = width;
    trailCanvas.height = height;
    trailCtx = trailCanvas.getContext('2d', { 
      alpha: false,
      desynchronized: true, // Better performance
      willReadFrequently: false
    });
    
    if (trailCtx) {
      trailCtx.fillStyle = 'rgb(5, 5, 13)';
      trailCtx.fillRect(0, 0, width, height);
    }
    
    lastWidth = width;
    lastHeight = height;
    
    // Clear caches on resize
    gradientCache.clear();
  }
};

export const renderCanvas2D = (
  ctx: CanvasRenderingContext2D,
  state: MicroState,
  width: number,
  height: number,
  trails: boolean,
  renderMode: 'dots' | 'streaks' = 'dots',
  streakLength: number = 8.0,
  quality: RenderQuality = 'HIGH',
  dotSize: number = 2.0
): void => {
  const scaleX = width / 2;
  const scaleY = height / 2;
  const centerX = width / 2;
  const centerY = height / 2;

  // Performance optimization: reduce render quality for high particle counts
  const particleCount = state.count;
  const autoQuality: RenderQuality = 
    particleCount > 600 ? 'FAST' : 
    particleCount > 400 ? 'HIGH' : 
    quality;

  if (trails) {
    // Init trail canvas
    initTrailCanvas(width, height);
    
    if (trailCtx && trailCanvas) {
      // Fade trails (Particle Life style)
      trailCtx.globalCompositeOperation = 'source-over';
      trailCtx.fillStyle = 'rgba(5, 5, 13, 0.08)'; // Slow fade
      trailCtx.fillRect(0, 0, width, height);
      
      // Draw current particles to trail canvas
      if (renderMode === 'streaks' && autoQuality !== 'FAST') {
        trailCtx.lineCap = 'round';
        
        // OPTIMIZATION: Batch rendering by type to reduce context switches
        const particlesByType = new Map<number, { x: number, y: number, vx: number, vy: number, speed: number }[]>();
        
        for (let i = 0; i < state.count; i++) {
          const type = state.type[i];
          const vx = state.vx[i];
          const vy = state.vy[i];
          const speed = Math.sqrt(vx * vx + vy * vy);
          
          if (!particlesByType.has(type)) {
            particlesByType.set(type, []);
          }
          
          particlesByType.get(type)!.push({
            x: state.x[i] * scaleX + centerX,
            y: state.y[i] * scaleY + centerY,
            vx,
            vy,
            speed
          });
        }
        
        // Draw streaks by type (fewer color switches)
        particlesByType.forEach((particles, type) => {
          const colors = getColorVariants(type);
          
          for (const p of particles) {
            const len = Math.max(2, Math.min(24, p.speed * streakLength * 1000));
            const thickness = Math.max(0.8, Math.min(3.5, p.speed * 800));
            
            const x2 = p.x - p.vx * len * scaleX;
            const y2 = p.y - p.vy * len * scaleY;
            
            // Use cached gradient
            trailCtx.save();
            trailCtx.translate(x2, y2);
            trailCtx.strokeStyle = createGradient(trailCtx, x2, y2, p.x, p.y, type);
            trailCtx.lineWidth = thickness;
            trailCtx.beginPath();
            trailCtx.moveTo(0, 0);
            trailCtx.lineTo(p.x - x2, p.y - y2);
            trailCtx.stroke();
            trailCtx.restore();
            
            // Glow only for very fast particles in ULTRA (skip to save perf)
            if (p.speed > 0.03 && autoQuality === 'ULTRA') {
              trailCtx.globalCompositeOperation = 'lighter';
              trailCtx.strokeStyle = colors.glow;
              trailCtx.lineWidth = thickness * 1.8;
              trailCtx.beginPath();
              trailCtx.moveTo(x2, y2);
              trailCtx.lineTo(p.x, p.y);
              trailCtx.stroke();
              trailCtx.globalCompositeOperation = 'source-over';
            }
          }
        });
      } else {
        // FAST mode: simple dots on trail canvas
        for (let i = 0; i < state.count; i++) {
          const x = state.x[i] * scaleX + centerX;
          const y = state.y[i] * scaleY + centerY;
          const type = state.type[i];

          trailCtx.fillStyle = getColorVariants(type).solid;
          trailCtx.fillRect(x - dotSize/2, y - dotSize/2, dotSize, dotSize);
        }
      }
      
      // Copy trail canvas to main canvas
      ctx.drawImage(trailCanvas, 0, 0);
    }
    
    // Draw bright cores on top (only in HIGH/ULTRA quality)
    if (autoQuality !== 'FAST' && state.count < 500) {
      for (let i = 0; i < state.count; i++) {
        const x = state.x[i] * scaleX + centerX;
        const y = state.y[i] * scaleY + centerY;
        const type = state.type[i];

        ctx.fillStyle = getColorVariants(type).solid;
        ctx.beginPath();
        ctx.arc(x, y, dotSize * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // No trails: clear and draw
    ctx.fillStyle = 'rgb(5, 5, 13)';
    ctx.fillRect(0, 0, width, height);
    
    if (renderMode === 'streaks' && autoQuality !== 'FAST') {
      ctx.lineCap = 'round';
      
      // OPTIMIZATION: Batch rendering by type
      const particlesByType = new Map<number, { x: number, y: number, vx: number, vy: number, speed: number }[]>();
      
      for (let i = 0; i < state.count; i++) {
        const type = state.type[i];
        const vx = state.vx[i];
        const vy = state.vy[i];
        const speed = Math.sqrt(vx * vx + vy * vy);
        
        if (!particlesByType.has(type)) {
          particlesByType.set(type, []);
        }
        
        particlesByType.get(type)!.push({
          x: state.x[i] * scaleX + centerX,
          y: state.y[i] * scaleY + centerY,
          vx,
          vy,
          speed
        });
      }
      
      // Draw streaks by type
      particlesByType.forEach((particles, type) => {
        const colors = getColorVariants(type);
        
        for (const p of particles) {
          const len = Math.max(2, Math.min(24, p.speed * streakLength * 1000));
          const thickness = Math.max(0.8, Math.min(3.5, p.speed * 800));
          
          const x2 = p.x - p.vx * len * scaleX;
          const y2 = p.y - p.vy * len * scaleY;
          
          // Use cached gradient
          ctx.save();
          ctx.translate(x2, y2);
          ctx.strokeStyle = createGradient(ctx, x2, y2, p.x, p.y, type);
          ctx.lineWidth = thickness;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(p.x - x2, p.y - y2);
          ctx.stroke();
          ctx.restore();
          
          // Glow only for very fast particles in ULTRA
          if (p.speed > 0.03 && autoQuality === 'ULTRA') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = colors.glow;
            ctx.lineWidth = thickness * 1.8;
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
          }
          
          // Bright core
          ctx.fillStyle = colors.solid;
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    } else {
      // Simple dots
      for (let i = 0; i < state.count; i++) {
        const x = state.x[i] * scaleX + centerX;
        const y = state.y[i] * scaleY + centerY;
        const type = state.type[i];

        ctx.fillStyle = getColorVariants(type).solid;
        
        if (autoQuality === 'FAST') {
          ctx.fillRect(x - dotSize/2, y - dotSize/2, dotSize, dotSize);
        } else {
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
};
