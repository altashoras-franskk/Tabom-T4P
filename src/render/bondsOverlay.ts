import { MicroState } from '../sim/micro/state';
import { getTypeColor } from './palette';

export interface BondsConfig {
  enabled: boolean;
  maxDistance: number; // Max distance to draw bonds (in normalized space 0-2)
  opacity: number;
  thickness: number;
}

export interface TrailsConfig {
  enabled: boolean;
  length: number; // Number of previous positions to keep
  opacity: number;
  fadeOut: boolean; // Whether trails fade out
}

// Store particle trails
interface ParticleTrail {
  positions: { x: number; y: number }[];
}

const particleTrails: Map<number, ParticleTrail> = new Map();

export function updateTrails(state: MicroState, trailLength: number) {
  for (let i = 0; i < state.count; i++) {
    if (!particleTrails.has(i)) {
      particleTrails.set(i, { positions: [] });
    }
    
    const trail = particleTrails.get(i)!;
    trail.positions.push({ x: state.x[i], y: state.y[i] });
    
    // Keep only last N positions
    if (trail.positions.length > trailLength) {
      trail.positions.shift();
    }
  }
}

export function clearTrails() {
  particleTrails.clear();
}

export function renderBonds(
  ctx: CanvasRenderingContext2D,
  state: MicroState,
  config: BondsConfig,
  paletteIndex: number
) {
  if (!config.enabled) return;

  const maxDistSq = config.maxDistance * config.maxDistance;
  // Use CSS dimensions (not canvas buffer dimensions)
  const rect = ctx.canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  
  // Match canvas2d coordinate system
  const scaleX = width / 2;
  const scaleY = height / 2;
  const centerX = width / 2;
  const centerY = height / 2;

  ctx.save();
  ctx.globalAlpha = config.opacity;
  ctx.lineWidth = config.thickness;

  // Draw bonds between nearby particles
  for (let i = 0; i < state.count; i++) {
    const xi = state.x[i];
    const yi = state.y[i];
    const ti = state.type[i];

    for (let j = i + 1; j < state.count; j++) {
      const xj = state.x[j];
      const yj = state.y[j];
      
      const dx = xj - xi;
      const dy = yj - yi;
      const distSq = dx * dx + dy * dy;

      // Skip if distance is too large (could be wrapping artifact)
      if (distSq < maxDistSq && distSq > 0 && Math.abs(dx) < 1.0 && Math.abs(dy) < 1.0) {
        // Use color of first particle, convert RGB to CSS color
        ctx.strokeStyle = getTypeColor(ti, paletteIndex);
        
        // Convert normalized coords (-1 to 1) to screen coords
        // Invert Y because canvas Y grows downward but simulation Y grows upward
        const screenXi = xi * scaleX + centerX;
        const screenYi = -yi * scaleY + centerY;
        const screenXj = xj * scaleX + centerX;
        const screenYj = -yj * scaleY + centerY;

        ctx.beginPath();
        ctx.moveTo(screenXi, screenYi);
        ctx.lineTo(screenXj, screenYj);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

export function renderTrails(
  ctx: CanvasRenderingContext2D,
  state: MicroState,
  config: TrailsConfig,
  paletteIndex: number
) {
  if (!config.enabled) return;

  // Use CSS dimensions (not canvas buffer dimensions)
  const rect = ctx.canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  
  // Match canvas2d coordinate system
  const scaleX = width / 2;
  const scaleY = height / 2;
  const centerX = width / 2;
  const centerY = height / 2;

  ctx.save();
  ctx.lineWidth = 2.0; // Increased from 1.5 for better visibility
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < state.count; i++) {
    const trail = particleTrails.get(i);
    if (!trail || trail.positions.length < 2) continue;

    const ti = state.type[i];
    const color = getTypeColor(ti, paletteIndex);

    ctx.strokeStyle = color;

    for (let p = 1; p < trail.positions.length; p++) {
      const prev = trail.positions[p - 1];
      const curr = trail.positions[p];

      // Skip if segment is too long (could be wrapping artifact)
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      if (Math.abs(dx) > 1.0 || Math.abs(dy) > 1.0) continue;

      // Fade out older positions
      if (config.fadeOut) {
        const alpha = (p / trail.positions.length) * config.opacity;
        ctx.globalAlpha = alpha;
      } else {
        ctx.globalAlpha = config.opacity;
      }

      // Convert normalized coords (-1 to 1) to screen coords
      // Invert Y because canvas Y grows downward but simulation Y grows upward
      const screenX1 = prev.x * scaleX + centerX;
      const screenY1 = -prev.y * scaleY + centerY;
      const screenX2 = curr.x * scaleX + centerX;
      const screenY2 = -curr.y * scaleY + centerY;

      ctx.beginPath();
      ctx.moveTo(screenX1, screenY1);
      ctx.lineTo(screenX2, screenY2);
      ctx.stroke();
    }
  }

  ctx.restore();
}
