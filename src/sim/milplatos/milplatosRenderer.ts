import type {
  CSOState, CSOOrgan, CSOAffect, CSOZone, CSOEvent,
  RhizomeState, RhizomeNode, RhizomeEdge,
  MPFields, MPOverlay, MPParams, PlateauLabel,
} from './milplatosTypes';
import { MP_FIELD_RES } from './milplatosTypes';

const TWO_PI = Math.PI * 2;

function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsla(${h | 0},${(s * 100) | 0}%,${(l * 100) | 0}%,${a})`;
}

export interface MPViewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface MPHudInfo {
  plateauLabel: PlateauLabel;
  K: number;
  meanIntensity: number;
}

export function renderMPWorld(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  cso: CSOState, rhizome: RhizomeState,
  fields: MPFields,
  overlays: Set<MPOverlay>,
  params: MPParams,
  rhizomeEdges: RhizomeEdge[],
  time: number,
  viewport: MPViewport = { zoom: 1, panX: 0, panY: 0 },
  hud?: MPHudInfo,
): void {
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = '#040408';
  ctx.fillRect(0, 0, cw, ch);

  const cx = cw * 0.5 + viewport.panX;
  const cy = ch * 0.5 + viewport.panY;
  const scale = Math.min(cw, ch) * 0.47 * viewport.zoom;

  if (overlays.has('heatConsistency')) {
    renderHeatmap(ctx, cx, cy, scale, fields.consistency, 220, 0.50, time);
  }
  if (overlays.has('heatTerritory')) {
    renderHeatmap(ctx, cx, cy, scale, fields.territory, 30, 0.55, time);
  }

  if (overlays.has('cso')) {
    renderZones(ctx, cx, cy, scale, cso.zones, time);
    renderEvents(ctx, cx, cy, scale, cso.events, time);
  }

  if (overlays.has('afetos')) {
    renderAffectTrails(ctx, cx, cy, scale, cso.affects);
    renderAffects(ctx, cx, cy, scale, cso.affects, time);
  }

  if (overlays.has('connections') || overlays.has('cso')) {
    renderOrganConnections(ctx, cx, cy, scale, cso.organs, params);
    renderOrgans(ctx, cx, cy, scale, cso.organs, params, time);
  }

  if (overlays.has('rizoma')) {
    renderRhizomeEdges(ctx, cx, cy, scale, rhizome, rhizomeEdges, time);
    renderRhizomeNodes(ctx, cx, cy, scale, rhizome.nodes, time);
  }

  if (overlays.has('flights')) {
    renderFlightLines(ctx, cx, cy, scale, rhizome, rhizomeEdges, time);
  }

  if (hud) {
    renderCanvasHUD(ctx, cw, ch, hud, time);
  }
}

// ---- On-canvas HUD (plateau + status) ------------------------------------
function renderCanvasHUD(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  hud: MPHudInfo, time: number,
): void {
  const pulse = 0.6 + Math.sin(time * 0.3) * 0.15;
  ctx.save();
  ctx.font = "600 11px 'Doto', monospace";
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(99,102,241,${0.35 * pulse})`;
  ctx.fillText(hud.plateauLabel, cw * 0.5, 40);
  ctx.font = "500 8px 'IBM Plex Mono', monospace";
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillText(`K=${hud.K.toFixed(2)}  intensidade=${hud.meanIntensity.toFixed(2)}`, cw * 0.5, 54);
  ctx.restore();
}

function renderHeatmap(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  field: Float32Array, baseHue: number, alpha: number, time: number,
): void {
  const sz = MP_FIELD_RES;
  const cellW = (scale * 2) / sz;
  const cellH = (scale * 2) / sz;
  const ox = cx - scale, oy = cy - scale;

  for (let y = 0; y < sz; y++) {
    for (let x = 0; x < sz; x++) {
      const v = field[y * sz + x];
      if (v < 0.003) continue;
      const pulse = Math.sin(time * 1.2 + x * 0.2 + y * 0.2) * 0.05 + 1;
      ctx.globalAlpha = Math.min(alpha, v * alpha * pulse);
      ctx.fillStyle = hsl(baseHue + v * 20, 0.6 + v * 0.3, 0.15 + v * 0.35);
      ctx.fillRect(ox + x * cellW, oy + y * cellH, cellW + 0.5, cellH + 0.5);
    }
  }
  ctx.globalAlpha = 1;
}

function renderZones(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  zones: CSOZone[], time: number,
): void {
  for (const z of zones) {
    const px = cx + z.x * scale, py = cy + z.y * scale;
    const r = z.radius * scale;
    const pulseR = r * (1 + Math.sin(z.pulse + time * 1.5) * 0.08);

    const grad = ctx.createRadialGradient(px, py, 0, px, py, pulseR);
    grad.addColorStop(0, hsl(z.hue, 0.7, 0.5, z.strength * 0.12));
    grad.addColorStop(0.7, hsl(z.hue, 0.5, 0.3, z.strength * 0.06));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(px - pulseR, py - pulseR, pulseR * 2, pulseR * 2);
  }
}

function renderAffectTrails(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  affects: CSOAffect[],
): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const a of affects) {
    const len = a.trailX.length;
    if (len < 2) continue;
    for (let t = 1; t < len; t++) {
      const frac = t / len;
      ctx.beginPath();
      ctx.moveTo(cx + a.trailX[t - 1] * scale, cy + a.trailY[t - 1] * scale);
      ctx.lineTo(cx + a.trailX[t] * scale, cy + a.trailY[t] * scale);
      ctx.lineWidth = (0.4 + a.intensity * 1.2) * frac;
      ctx.strokeStyle = hsl(a.hue, 0.5, 0.45, (0.03 + a.intensity * 0.06) * frac);
      ctx.stroke();
    }
  }
}

function renderAffects(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  affects: CSOAffect[], time: number,
): void {
  for (const a of affects) {
    const px = cx + a.x * scale, py = cy + a.y * scale;
    const pulse = 1 + Math.sin(a.phase + time * 0.6) * 0.12;
    const r = (1.0 + a.intensity * 2.0) * pulse;

    if (a.intensity > 0.3) {
      ctx.beginPath();
      ctx.arc(px, py, r * 3.5, 0, TWO_PI);
      ctx.fillStyle = hsl(a.hue, 0.5, 0.5, a.intensity * 0.03);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(px, py, r, 0, TWO_PI);
    ctx.fillStyle = hsl(a.hue, 0.6, 0.5 + a.intensity * 0.15, 0.35 + a.intensity * 0.3);
    ctx.fill();
  }
}

function renderOrganConnections(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  organs: CSOOrgan[], params: MPParams,
): void {
  const organMap = new Map<number, CSOOrgan>();
  for (const o of organs) organMap.set(o.id, o);
  const seen = new Set<string>();
  ctx.lineCap = 'round';

  for (const o of organs) {
    for (const cid of o.connections) {
      const key = o.id < cid ? `${o.id}-${cid}` : `${cid}-${o.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const c = organMap.get(cid);
      if (!c) continue;
      const x1 = cx + o.x * scale, y1 = cy + o.y * scale;
      const x2 = cx + c.x * scale, y2 = cy + c.y * scale;
      const importance = (o.importance + c.importance) * 0.5;
      ctx.lineWidth = 0.5 + importance * 2.5 * params.hierarquia;
      const health = (o.health + c.health) * 0.5;
      ctx.globalAlpha = health * 0.5;
      ctx.strokeStyle = hsl((o.hue + c.hue) * 0.5, 0.4, 0.5);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function renderOrgans(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  organs: CSOOrgan[], params: MPParams, time: number,
): void {
  for (const o of organs) {
    const px = cx + o.x * scale, py = cy + o.y * scale;
    const r = (o.radius * scale) * (0.8 + o.importance * 0.4);
    const alpha = o.health * (0.3 + params.organismo * 0.6);

    ctx.beginPath();
    ctx.arc(px, py, r, 0, TWO_PI);
    ctx.strokeStyle = hsl(o.hue, 0.5, 0.6, alpha * 0.6);
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = alpha;
    ctx.stroke();

    const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
    grad.addColorStop(0, hsl(o.hue, 0.6, 0.55, alpha * 0.35));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fill();

    if (o.importance > 0.5) {
      const pulse = 1 + Math.sin(time * 2 + o.id) * 0.2;
      ctx.beginPath();
      ctx.arc(px, py, r * 0.3 * pulse, 0, TWO_PI);
      ctx.fillStyle = hsl(o.hue, 0.7, 0.7, alpha * 0.5);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function renderEvents(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  events: CSOEvent[], time: number,
): void {
  for (const ev of events) {
    const px = cx + ev.x * scale, py = cy + ev.y * scale;
    const progress = 1 - ev.ttl / 180;
    const r = 5 + progress * 30;
    const alpha = Math.max(0, 1 - progress * 1.2);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, TWO_PI);
    ctx.strokeStyle = ev.color;
    ctx.lineWidth = 2 - progress * 1.5;
    ctx.globalAlpha = alpha * 0.4;
    ctx.stroke();
    if (ev.type === 'ruptura') {
      const sparkR = r * 0.6;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * TWO_PI + time * 3;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(ang) * sparkR, py + Math.sin(ang) * sparkR);
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * 0.3;
        ctx.strokeStyle = ev.color;
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}

function renderRhizomeEdges(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  rhizome: RhizomeState, edges: RhizomeEdge[], time: number,
): void {
  const nodeMap = new Map<number, RhizomeNode>();
  for (const n of rhizome.nodes) nodeMap.set(n.id, n);
  ctx.lineCap = 'round';
  for (const e of edges) {
    if (e.isFlight) continue;
    const a = nodeMap.get(e.from), b = nodeMap.get(e.to);
    if (!a || !b) continue;
    const x1 = cx + a.x * scale, y1 = cy + a.y * scale;
    const x2 = cx + b.x * scale, y2 = cy + b.y * scale;
    const heatColor = e.heat > 0.5
      ? hsl(50 + e.heat * 30, 0.7, 0.5 + e.heat * 0.2, 0.25 + e.heat * 0.2)
      : hsl(200, 0.3, 0.4, 0.15 + e.heat * 0.15);
    ctx.lineWidth = 0.6 + e.heat * 1.5;
    ctx.strokeStyle = heatColor;
    ctx.beginPath();
    const mx = (x1 + x2) * 0.5 + (y2 - y1) * 0.08;
    const my = (y1 + y2) * 0.5 - (x2 - x1) * 0.08;
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(mx, my, x2, y2);
    ctx.stroke();
  }
}

function renderRhizomeNodes(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  nodes: RhizomeNode[], time: number,
): void {
  for (const n of nodes) {
    const px = cx + n.x * scale, py = cy + n.y * scale;
    const baseR = 2 + n.heat * 3;
    if (n.isEntry) {
      const pulse = 1 + Math.sin(time * 2 + n.id) * 0.15;
      const r = baseR * 1.5 * pulse;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.rect(-r, -r, r * 2, r * 2);
      ctx.strokeStyle = hsl(160, 0.8, 0.6, 0.6);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = hsl(160, 0.6, 0.5, 0.15);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(px, py, baseR, 0, TWO_PI);
      ctx.fillStyle = hsl(200 + n.heat * 40, 0.5, 0.4 + n.heat * 0.3, 0.3 + n.heat * 0.4);
      ctx.fill();
    }
  }
}

function renderFlightLines(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  rhizome: RhizomeState, edges: RhizomeEdge[], time: number,
): void {
  const nodeMap = new Map<number, RhizomeNode>();
  for (const n of rhizome.nodes) nodeMap.set(n.id, n);
  ctx.lineCap = 'round';
  ctx.setLineDash([4, 6]);
  ctx.lineDashOffset = -time * 20;
  for (const e of edges) {
    if (!e.isFlight) continue;
    const a = nodeMap.get(e.from), b = nodeMap.get(e.to);
    if (!a || !b) continue;
    const x1 = cx + a.x * scale, y1 = cy + a.y * scale;
    const x2 = cx + b.x * scale, y2 = cy + b.y * scale;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = hsl(280, 0.8, 0.6, 0.5);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(mx + Math.cos(ang) * 5, my + Math.sin(ang) * 5);
    ctx.lineTo(mx + Math.cos(ang + 2.5) * 4, my + Math.sin(ang + 2.5) * 4);
    ctx.lineTo(mx + Math.cos(ang - 2.5) * 4, my + Math.sin(ang - 2.5) * 4);
    ctx.closePath();
    ctx.fillStyle = hsl(280, 0.8, 0.6, 0.4);
    ctx.fill();
    ctx.setLineDash([4, 6]);
  }
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}
