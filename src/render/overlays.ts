// Overlay rendering (field heatmap, artifacts, etc.)
import { FieldState } from '../sim/field/fieldState';
import { FieldLayers, FieldLayerName } from '../sim/fieldLayers/fieldLayers';
import { SemanticArtifact } from '../sim/reconfig/reconfigState';
import { FIELD_COLORS } from './palette';

// ── FieldLayers heatmap (the active Meadows Engine) ───────────────────────────
const LAYER_COLORS: Record<string, string> = {
  nutrient: '#34d399',  // green
  tension:  '#f87171',  // red
  memory:   '#60a5fa',  // blue
  entropy:  '#fbbf24',  // amber
  sigilBond:  '#5ac8fa',
  sigilRift:  '#ff6b6b',
  sigilBloom: '#78ff8c',
  sigilOath:  '#c084fc',
};

export const renderFieldLayersHeatmap = (
  ctx: CanvasRenderingContext2D,
  fl: FieldLayers,
  layer: FieldLayerName,
  width: number,
  height: number,
  alpha: number
): void => {
  const size = fl.size;
  const data_arr = fl.layers[layer];
  if (!data_arr) return;

  const hex = LAYER_COLORS[layer] ?? '#ffffff';
  const rC = parseInt(hex.slice(1, 3), 16);
  const gC = parseInt(hex.slice(3, 5), 16);
  const bC = parseInt(hex.slice(5, 7), 16);

  const imgW = Math.min(width, 256);
  const imgH = Math.min(height, 256);
  const imageData = ctx.createImageData(imgW, imgH);
  const d = imageData.data;

  for (let py = 0; py < imgH; py++) {
    for (let px = 0; px < imgW; px++) {
      const fx = (px / imgW) * size;
      const fy = (py / imgH) * size;
      const x0 = Math.min(Math.floor(fx), size - 1);
      const y0 = Math.min(Math.floor(fy), size - 1);
      const x1 = Math.min(x0 + 1, size - 1);
      const y1 = Math.min(y0 + 1, size - 1);
      const tx = fx - x0, ty = fy - y0;
      const v = (data_arr[y0 * size + x0] * (1 - tx) + data_arr[y0 * size + x1] * tx) * (1 - ty)
              + (data_arr[y1 * size + x0] * (1 - tx) + data_arr[y1 * size + x1] * tx) * ty;
      if (v > 0.02) {
        const g2 = Math.pow(Math.min(1, v * alpha), 0.7);
        const idx = (py * imgW + px) * 4;
        d[idx]     = rC * g2;
        d[idx + 1] = gC * g2;
        d[idx + 2] = bC * g2;
        d[idx + 3] = g2 * 255;
      }
    }
  }
  // Scale to full canvas
  ctx.save();
  ctx.globalAlpha = 0.75;
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = imgW; tmpCanvas.height = imgH;
  const tmpCtx = tmpCanvas.getContext('2d')!;
  tmpCtx.putImageData(imageData, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low';
  ctx.drawImage(tmpCanvas, 0, 0, width, height);
  ctx.restore();
};

export const renderFieldHeatmap = (
  ctx: CanvasRenderingContext2D,
  field: FieldState,
  layer: 'tension' | 'cohesion' | 'scarcity' | 'novelty' | 'mythic',
  width: number,
  height: number,
  alpha: number
): void => {
  const cellWidth = width / field.width;
  const cellHeight = height / field.height;
  const color = FIELD_COLORS[layer];
  
  // Parse RGB from hex color
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // Create smooth gradient field using bilinear interpolation
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      // Map pixel to field coordinates
      const fx = (px / width) * field.width;
      const fy = (py / height) * field.height;
      
      // Get surrounding cells
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const x1 = Math.min(x0 + 1, field.width - 1);
      const y1 = Math.min(y0 + 1, field.height - 1);
      
      // Get values at corners
      const v00 = field[layer][y0 * field.width + x0] || 0;
      const v10 = field[layer][y0 * field.width + x1] || 0;
      const v01 = field[layer][y1 * field.width + x0] || 0;
      const v11 = field[layer][y1 * field.width + x1] || 0;
      
      // Bilinear interpolation
      const tx = fx - x0;
      const ty = fy - y0;
      const top = v00 * (1 - tx) + v10 * tx;
      const bottom = v01 * (1 - tx) + v11 * tx;
      const value = top * (1 - ty) + bottom * ty;
      
      // Apply to pixel with smooth falloff
      if (value > 0.02) {
        const intensity = Math.min(1, value * alpha);
        const pixelIndex = (py * width + px) * 4;
        
        // Add glow effect
        const glowValue = Math.pow(intensity, 0.7);
        
        data[pixelIndex + 0] = r * glowValue;
        data[pixelIndex + 1] = g * glowValue;
        data[pixelIndex + 2] = b * glowValue;
        data[pixelIndex + 3] = intensity * 255;
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
};

export const renderArtifacts = (
  ctx: CanvasRenderingContext2D,
  artifacts: SemanticArtifact[],
  width: number,
  height: number
): void => {
  const scaleX = width / 2;
  const scaleY = height / 2;
  const centerX = width / 2;
  const centerY = height / 2;

  for (const artifact of artifacts) {
    const x = artifact.x * scaleX + centerX;
    const y = artifact.y * scaleY + centerY;
    const radius = artifact.radius * scaleX;
    const life = 1 - artifact.elapsed / artifact.duration;

    // Pulsing circle
    ctx.strokeStyle = `rgba(255, 100, 255, ${life * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius * (1 + Math.sin(artifact.elapsed * 3) * 0.1), 0, Math.PI * 2);
    ctx.stroke();

    // Sigil
    ctx.fillStyle = `rgba(255, 150, 255, ${life})`;
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(artifact.sigil, x, y);
  }
};

export const renderReconfigPing = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  elapsed: number,
  width: number,
  height: number
): void => {
  const scaleX = width / 2;
  const scaleY = height / 2;
  const centerX = width / 2;
  const centerY = height / 2;

  const px = x * scaleX + centerX;
  const py = y * scaleY + centerY;
  const radius = elapsed * 100;
  const alpha = Math.max(0, 1 - elapsed);

  ctx.strokeStyle = `rgba(255, 200, 100, ${alpha * 0.8})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.stroke();
};

export const renderBrushCursor = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusPx: number,
  mode: string,
  width: number,
  height: number
): void => {
  // Draw circle with color based on mode
  let strokeColor = 'rgba(255, 255, 255, 0.5)';
  if (mode === 'CAPTURE') {
    strokeColor = 'rgba(255, 200, 0, 0.8)'; // Golden for capture
  } else if (mode === 'ERASE') {
    strokeColor = 'rgba(255, 100, 100, 0.6)'; // Red for erase
  } else if (mode === 'SEED') {
    strokeColor = 'rgba(100, 255, 100, 0.6)'; // Green for seed
  }
  
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = mode === 'CAPTURE' ? 2.5 : 1.5;
  ctx.setLineDash(mode === 'CAPTURE' ? [2, 2] : [4, 4]);
  ctx.beginPath();
  ctx.arc(x, y, radiusPx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw mode label
  let labelColor = 'rgba(255, 255, 255, 0.8)';
  if (mode === 'CAPTURE') {
    labelColor = 'rgba(255, 220, 0, 1)';
  }
  
  ctx.fillStyle = labelColor;
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(mode, x, y - radiusPx - 8);
  
  // Draw crosshair for capture mode
  if (mode === 'CAPTURE') {
    ctx.strokeStyle = 'rgba(255, 220, 0, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y + 6);
    ctx.stroke();
  }
};

export const renderMiniStatus = (
  ctx: CanvasRenderingContext2D,
  particleCount: number,
  speciesCount: number,
  lastEvent: string,
  width: number,
  height: number
): void => {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(10, height - 70, 200, 60);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  ctx.fillText(`Particles: ${particleCount}`, 15, height - 65);
  ctx.fillText(`Species: ${speciesCount}`, 15, height - 50);
  ctx.fillText(`Last: ${lastEvent}`, 15, height - 35);
};

// PATCH 04.3: Render sigils as GORGEOUS glowing glyphs overlay
const SIGIL_GLYPHS: Record<string, string> = {
  sigilBond: '✶', // star (cohesion)
  sigilRift: '⨯', // cross (conflict)
  sigilBloom: '⚘', // flower (growth)
  sigilOath: '⌬', // delta (ritual)
};

export const renderSigilOverlay = (
  ctx: CanvasRenderingContext2D,
  fieldLayers: FieldLayers,
  width: number,
  height: number,
  alpha: number = 0.8 // MUCH more visible
): void => {
  const gridSize = fieldLayers.size;
  const cellWidth = width / gridSize;
  const cellHeight = height / gridSize;

  // Sample grid at medium resolution for better visibility
  const sampleStep = Math.max(1, Math.floor(gridSize / 24));

  const sigilLayers: Array<{ 
    name: 'sigilBond' | 'sigilRift' | 'sigilBloom' | 'sigilOath'; 
    threshold: number;
  }> = [
    { name: 'sigilBond', threshold: 0.5 }, // Lower thresholds = more visible
    { name: 'sigilRift', threshold: 0.5 },
    { name: 'sigilBloom', threshold: 0.5 },
    { name: 'sigilOath', threshold: 0.5 },
  ];

  for (const { name, threshold } of sigilLayers) {
    const layer = fieldLayers.layers[name];
    const glyph = SIGIL_GLYPHS[name];
    const color = LAYER_COLORS[name];

    // Parse RGB
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    for (let gy = 0; gy < gridSize; gy += sampleStep) {
      for (let gx = 0; gx < gridSize; gx += sampleStep) {
        const idx = gy * gridSize + gx;
        const value = layer[idx];

        if (value > threshold) {
          const px = (gx / gridSize) * width + cellWidth * sampleStep * 0.5;
          const py = (gy / gridSize) * height + cellHeight * sampleStep * 0.5;
          const intensity = Math.min(1, (value - threshold) / (1 - threshold));

          // GORGEOUS GLOW EFFECT
          const glowRadius = cellWidth * sampleStep * 0.6;
          const fontSize = cellWidth * sampleStep * 1.2;
          
          // Outer glow
          ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${intensity * alpha * 0.8})`;
          ctx.shadowBlur = glowRadius;
          
          // Pulsing animation based on value
          const pulse = 0.9 + Math.sin(Date.now() * 0.003 + gx + gy) * 0.1;
          ctx.font = `${fontSize * pulse}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Draw glyph with glow
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${intensity * alpha})`;
          ctx.fillText(glyph, px, py);
          
          // Reset shadow
          ctx.shadowBlur = 0;
        }
      }
    }
  }
};

// PATCH 04.6: Renderizar pings de sigils (símbolos discretos quando arquétipos emergem)
import type { SigilPing } from '../sim/archetypes/sigilPings';

export const renderSigilPings = (
  ctx: CanvasRenderingContext2D,
  pings: SigilPing[],
  width: number,
  height: number
): void => {
  const scaleX = width / 2;
  const scaleY = height / 2;
  const centerX = width / 2;
  const centerY = height / 2;

  ctx.save();

  for (const ping of pings) {
    const px = ping.x * scaleX + centerX;
    const py = ping.y * scaleY + centerY;

    // Parse RGB
    const r = parseInt(ping.color.slice(1, 3), 16);
    const g = parseInt(ping.color.slice(3, 5), 16);
    const b = parseInt(ping.color.slice(5, 7), 16);

    const alpha  = ping.intensity;
    const now    = Date.now() / 1000;
    const elapsed = now - ping.spawnTime;
    const pulse  = 1.0 + Math.sin(elapsed * 2.8) * 0.10;

    // ── Expanding ripple rings ───────────────────────────────────────────────
    const waveCount = 2;
    for (let w = 0; w < waveCount; w++) {
      const wavePhase = (elapsed * 1.6 + w * 0.5) % 2;
      if (wavePhase < 1) {
        const waveRadius = 22 + wavePhase * 55;
        const waveAlpha  = (1 - wavePhase) * alpha * 0.35;
        ctx.globalAlpha  = waveAlpha;
        ctx.strokeStyle  = `rgb(${r},${g},${b})`;
        ctx.lineWidth    = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, waveRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // ── Soft radial glow ────────────────────────────────────────────────────
    const glowR = 36 * pulse;
    const glow  = ctx.createRadialGradient(px, py, 0, px, py, glowR);
    glow.addColorStop(0, `rgba(${r},${g},${b},${(alpha * 0.30).toFixed(3)})`);
    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.globalAlpha = 1;
    ctx.fillStyle   = glow;
    ctx.beginPath(); ctx.arc(px, py, glowR, 0, Math.PI * 2); ctx.fill();

    // ── Sigil — use serif fallback so Unicode renders correctly ────────────
    // Monospace has poor coverage for exotic Unicode; serif does much better.
    const fontSize = Math.round(28 * pulse);
    ctx.globalAlpha = alpha;
    ctx.font        = `${fontSize}px serif, sans-serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = `rgba(${r},${g},${b},${alpha * 0.9})`;
    ctx.shadowBlur   = 14;
    ctx.fillStyle    = `rgb(${r},${g},${b})`;
    ctx.fillText(ping.sigil, px, py);
    ctx.shadowBlur   = 0;

    // ── Name pill (only while still fairly opaque) ──────────────────────────
    if (alpha > 0.30) {
      const nameAlpha  = Math.min(1, alpha * 1.4);
      const nameFS     = Math.max(9, Math.round(10 * pulse));
      ctx.font         = `${nameFS}px monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';

      const nameY  = py + fontSize * 0.75 + 10;
      const tw     = ctx.measureText(ping.name).width;
      const padH   = 3, padW = 7;

      // Pill background
      ctx.globalAlpha = nameAlpha * 0.55;
      ctx.fillStyle   = 'rgba(4,2,12,0.80)';
      ctx.beginPath();
      ctx.roundRect(px - tw/2 - padW, nameY - nameFS/2 - padH, tw + padW*2, nameFS + padH*2, 4);
      ctx.fill();

      // Pill border
      ctx.globalAlpha = nameAlpha * 0.35;
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.lineWidth   = 0.8;
      ctx.stroke();

      // Name text
      ctx.globalAlpha = nameAlpha;
      ctx.fillStyle   = `rgba(${r},${g},${b},${nameAlpha})`;
      ctx.fillText(ping.name, px, nameY);
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
  }

  ctx.restore();
};