// ─── Sociogenesis Study Mode — Canvas 2D Renderer ───────────────────────────
// Lenses: off | groups | power | economy | events | field
// Field heatmaps rendered via ImageData + scaled drawImage.

import type {
  StudyAgent, StudyConfig, StudyMetrics,
  StudySymbols, StudyPing, StudyLens, StudyWorldState,
} from './studyTypes';
import { GROUP_COLORS } from './studyTypes';
import type { AgentRole } from './studyEngine';
import type { SocialFields } from './socialFields';
import { archetypeKeyToColor, archetypeKeyToLabel, computeArchetypeKey } from './studyArchetypes';

// ── Coordinate helpers ────────────────────────────────────────────────────────
function cx(wx: number, cw: number) { return ((wx + 1.0) * 0.5) * cw; }
function cy(wy: number, ch: number) { return ((wy + 1.0) * 0.5) * ch; }

// ── Visual config ─────────────────────────────────────────────────────────────
export interface StudyVisualConfig {
  agentScale: number;    // 0.3..2.0 — multiplier on base agent radius
  showTrails: boolean;
  showDirection: boolean;
  trailOpacity: number;  // 0..1
}

export const defaultVisualConfig: StudyVisualConfig = {
  agentScale: 1.0,
  showTrails: true,
  showDirection: true,
  trailOpacity: 0.5,
};

// ── Agent radius ──────────────────────────────────────────────────────────────
let _visualCfg: StudyVisualConfig = defaultVisualConfig;
function agentR(cw: number, ch: number): number { return 0.030 * 0.5 * Math.min(cw, ch) * _visualCfg.agentScale; }

// ── Hex → rgba ────────────────────────────────────────────────────────────────
function hexA(hex: string, a: number): string {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Field ImageData cache ─────────────────────────────────────────────────────
// Reused between frames; only rebuilt when fields.dirty = true.
let _fieldCanvas: HTMLCanvasElement | null = null;
let _fieldCtx:    CanvasRenderingContext2D | null = null;
let _fieldSize  = 0;
let _fieldImgN: ImageData | null = null;
let _fieldImgL: ImageData | null = null;
let _fieldImgR: ImageData | null = null;

// ── Archetype legend cache ────────────────────────────────────────────────────
let _archLegendBucket = -1;
let _archLegendAgentCount = -1;
let _archLegendTop: Array<{ n: number; label: string; color: string }> = [];

function ensureFieldCache(size: number): CanvasRenderingContext2D | null {
  if (!_fieldCanvas || _fieldSize !== size) {
    _fieldCanvas = document.createElement('canvas');
    _fieldCanvas.width  = size;
    _fieldCanvas.height = size;
    _fieldCtx   = _fieldCanvas.getContext('2d');
    _fieldSize  = size;
    _fieldImgN = null; _fieldImgL = null; _fieldImgR = null;
  }
  return _fieldCtx;
}

function buildFieldImage(arr: Float32Array, size: number, r: number, g: number, b: number): ImageData {
  const img = new ImageData(size, size);
  const d   = img.data;
  for (let i = 0; i < size * size; i++) {
    const v = arr[i];
    // Gamma-lift: sqrt makes low values more visible while keeping high values bright
    const vv = Math.sqrt(v);
    d[i*4  ] = r;
    d[i*4+1] = g;
    d[i*4+2] = b;
    d[i*4+3] = Math.min(255, vv * 255);
  }
  return img;
}

function drawFieldLayer(
  mainCtx: CanvasRenderingContext2D,
  img: ImageData, cw: number, ch: number,
): void {
  const tmpCtx = _fieldCtx;
  if (!tmpCtx || !_fieldCanvas) return;
  tmpCtx.putImageData(img, 0, 0);
  mainCtx.save();
  mainCtx.imageSmoothingEnabled = true;
  mainCtx.imageSmoothingQuality = 'high';
  mainCtx.drawImage(_fieldCanvas, 0, 0, cw, ch);
  mainCtx.restore();
}

function stableKey(a: StudyAgent): number {
  return (a.archKeyStable >>> 0) || computeArchetypeKey(a);
}

function momentKey(a: StudyAgent): number {
  return (a.archKeyMoment >>> 0) || computeArchetypeKey(a);
}

// ── Main entry ────────────────────────────────────────────────────────────────
export function renderStudy(
  ctx:     CanvasRenderingContext2D,
  cw:      number,
  ch:      number,
  agents:  StudyAgent[],
  roles:   AgentRole[],
  _cfg:    StudyConfig,
  _metrics: StudyMetrics,
  lens:    StudyLens,
  symbols: StudySymbols,
  fields:  SocialFields,
  ws:      StudyWorldState,
  pings:   StudyPing[],
  _t:      number,
  visualConfig?: StudyVisualConfig,
): void {
  _visualCfg = visualConfig ?? defaultVisualConfig;
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, cw, ch);

  // Subtle world border
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  ctx.strokeRect(3, 3, cw - 6, ch - 6);

  // ── Rebuild field cache if dirty ──
  const sz = fields.size;
  ensureFieldCache(sz);
  if (fields.dirty) {
    _fieldImgN = buildFieldImage(fields.n, sz, 52,  211, 153); // green-teal = N
    _fieldImgL = buildFieldImage(fields.l, sz, 167, 139, 250); // violet = L
    _fieldImgR = buildFieldImage(fields.r, sz, 251, 191, 36);  // gold = R
    fields.dirty = false;
  }

  // ── Lens: field heatmaps (behind agents) ──
  // Using 'screen' blending for softer, more artistic field overlay
  if (lens === 'field' && _fieldImgN && _fieldImgL && _fieldImgR) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.65;
    drawFieldLayer(ctx, _fieldImgN, cw, ch);
    ctx.globalAlpha = 0.55;
    drawFieldLayer(ctx, _fieldImgL, cw, ch);
    ctx.globalAlpha = 0.50;
    drawFieldLayer(ctx, _fieldImgR, cw, ch);
    ctx.restore();
  } else if (lens === 'power' && _fieldImgN && _fieldImgL) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.55;
    drawFieldLayer(ctx, _fieldImgN, cw, ch);
    ctx.globalAlpha = 0.60;
    drawFieldLayer(ctx, _fieldImgL, cw, ch);
    ctx.restore();
  } else if (lens === 'economy' && _fieldImgR) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.60;
    drawFieldLayer(ctx, _fieldImgR, cw, ch);
    ctx.restore();
  } else if (lens === 'morin' && _fieldImgN && _fieldImgR) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.30;
    drawFieldLayer(ctx, _fieldImgN, cw, ch);
    ctx.globalAlpha = 0.25;
    drawFieldLayer(ctx, _fieldImgR, cw, ch);
    ctx.restore();
  }

  // ── Symbols (all lenses except off) ──
  if (lens !== 'off') {
    renderSymbols(ctx, cw, ch, symbols, ws.exceptionActive, agents);
  }

  // ── Organic Trails ──
  if (_visualCfg.showTrails && lens !== 'off' && lens !== 'events') {
    renderTails(ctx, cw, ch, agents, roles);
  }

  // ── Agents (always rendered; lens changes style only) ──
  const r = agentR(cw, ch);

  // ── Compute "top leaders" (always highlighted, independent of role label) ──
  const leaders = new Set<number>();
  let primeLeader = -1;
  if (agents.length) {
    let i1 = -1, i2 = -1, i3 = -1;
    let s1 = -1, s2 = -1, s3 = -1;
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      const role = roles[i] ?? 'normal';
      const roleBoost =
        role === 'leader'    ? 0.20 :
        role === 'dictator'  ? 0.18 :
        role === 'authority' ? 0.14 :
        role === 'priest'    ? 0.10 :
        0;
      const score = a.centrality * 0.55 + a.status * 0.35 + a.charisma * 0.25 - a.fear * 0.08 + roleBoost;
      if (score > s1) { i3 = i2; s3 = s2; i2 = i1; s2 = s1; i1 = i; s1 = score; }
      else if (score > s2) { i3 = i2; s3 = s2; i2 = i; s2 = score; }
      else if (score > s3) { i3 = i; s3 = score; }
    }
    if (i1 >= 0) leaders.add(i1);
    if (i2 >= 0) leaders.add(i2);
    if (i3 >= 0) leaders.add(i3);
    primeLeader = i1;
  }

  if (lens === 'off') {
    renderAgentsPlain(ctx, cw, ch, agents, roles, r, leaders, primeLeader);
  } else if (lens === 'economy') {
    renderAgentsEconomy(ctx, cw, ch, agents, roles, r, leaders, primeLeader);
  } else if (lens === 'power') {
    renderAgentsPower(ctx, cw, ch, agents, roles, r, leaders, primeLeader);
  } else if (lens === 'events') {
    renderAgentsFaded(ctx, cw, ch, agents, roles, r, leaders, primeLeader);
  } else if (lens === 'archetype') {
    renderAgentsArchetype(ctx, cw, ch, agents, roles, r, leaders, primeLeader);
  } else if (lens === 'morin') {
    renderAgentsMorin(ctx, cw, ch, agents, roles, r, leaders, primeLeader);
  } else {
    // groups / field
    renderAgentsGroups(ctx, cw, ch, agents, roles, r, leaders, primeLeader);
  }

  // ── Pings (always) ──
  renderPings(ctx, cw, ch, pings);

  // ── Archetype legend (only in archetype lens) ──
  if (lens === 'archetype') {
    const bucket = ((_t * 2) | 0); // recompute ~2Hz
    if (bucket !== _archLegendBucket || agents.length !== _archLegendAgentCount) {
      _archLegendBucket = bucket;
      _archLegendAgentCount = agents.length;
      const counts = new Map<number, { n: number; label: string; color: string }>();
      for (let i = 0; i < agents.length; i++) {
        const k = stableKey(agents[i]);
        const e = counts.get(k);
        if (e) e.n++;
        else counts.set(k, { n: 1, label: archetypeKeyToLabel(k), color: archetypeKeyToColor(k) });
      }
      _archLegendTop = Array.from(counts.values()).sort((a, b) => b.n - a.n).slice(0, 8);
    }

    const top = _archLegendTop;
    if (top.length) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(10, 10, 255, 18 + top.length * 12);
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText('Archetype (stable)', 16, 14);
      for (let i = 0; i < top.length; i++) {
        const y = 28 + i * 12;
        ctx.fillStyle = top[i].color;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(16, y + 2, 7, 7);
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = 'rgba(255,255,255,0.70)';
        ctx.fillText(`${top[i].n} · ${top[i].label}`, 28, y);
      }
      ctx.restore();
    }
  }
}

// ── Trails (History) ──────────────────────────────────────────────────────────
// Smooth quadratic bezier curves with gentle fade. Art-quality.
function renderTails(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[],
  _roles: AgentRole[],
): void {
  const stride = agents.length > 260 ? 3 : agents.length > 180 ? 2 : 1;
  const tLen = 15;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let ai = 0; ai < agents.length; ai += stride) {
    const a = agents[ai];
    if (!a.trailX) continue;

    const col = archetypeKeyToColor(stableKey(a));
    const [tr, tg, tb] = _hexToRgb(col);

    // Collect valid trail points (newest first)
    const pts: [number, number][] = [];
    for (let i = tLen - 1; i >= 0; i--) {
      const idx = (a.trailIdx + i) % tLen;
      const px = a.trailX[idx], py = a.trailY[idx];
      if (px === 0 && py === 0) continue;
      pts.push([cx(px, cw), cy(py, ch)]);
    }
    if (pts.length < 3) continue;

    // Draw as a single smooth path with gradient-like fade via segments
    for (let i = 1; i < pts.length; i++) {
      const t = 1 - i / pts.length; // 1=newest, 0=oldest
      const alpha = t * t * 0.30 * _visualCfg.trailOpacity;
      const width = 0.4 + t * 1.0;

      if (alpha < 0.01) continue;

      ctx.beginPath();
      if (i >= 2) {
        // Quadratic curve through midpoint for smoothness
        const prev = pts[i - 1];
        const midX = (prev[0] + pts[i][0]) * 0.5;
        const midY = (prev[1] + pts[i][1]) * 0.5;
        ctx.moveTo(prev[0], prev[1]);
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], midX, midY);
      } else {
        ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.strokeStyle = `rgba(${tr},${tg},${tb},${alpha})`;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// ── Parse color string to RGB components ──────────────────────────────────────
function _hexToRgb(color: string): [number, number, number] {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return [isNaN(r) ? 128 : r, isNaN(g) ? 128 : g, isNaN(b) ? 128 : b];
  }
  return [128, 128, 128];
}

// ── Agents: Core draw ────────────────────────────────────────────────────────
// Art-exhibition quality: radial gradient body with directional glow arc.
// No chunky nose/wedge. Clean, organic, luminous.
function _drawAgent(ctx: CanvasRenderingContext2D, ax: number, ay: number, vx: number, vy: number, r: number, color: string, alpha: number) {
  const spd = Math.sqrt(vx * vx + vy * vy);
  const nx = spd > 0.0001 ? vx / spd : 1;
  const ny = spd > 0.0001 ? vy / spd : 0;
  const sp01 = Math.min(1, spd * 80);

  const [cr, cg, cb] = _hexToRgb(color);

  ctx.save();
  ctx.globalAlpha = alpha;

  // Body: radial gradient — bright center fading to color at edge
  const grad = ctx.createRadialGradient(
    ax - nx * r * 0.15, ay - ny * r * 0.15, r * 0.05,
    ax, ay, r,
  );
  grad.addColorStop(0.0, `rgba(${Math.min(255, cr + 80)},${Math.min(255, cg + 80)},${Math.min(255, cb + 80)},1)`);
  grad.addColorStop(0.55, `rgba(${cr},${cg},${cb},0.95)`);
  grad.addColorStop(1.0, `rgba(${Math.max(0, cr - 30)},${Math.max(0, cg - 30)},${Math.max(0, cb - 30)},0.85)`);

  ctx.beginPath();
  ctx.arc(ax, ay, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle rim light — gives depth
  ctx.beginPath();
  ctx.arc(ax, ay, r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,255,255,0.12)`;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Direction: thin tapered line from edge, length proportional to speed.
  if (_visualCfg.showDirection && sp01 > 0.05) {
    const lineLen = r * (0.6 + sp01 * 1.8);
    const tipX = ax + nx * (r + lineLen);
    const tipY = ay + ny * (r + lineLen);
    ctx.beginPath();
    ctx.moveTo(ax + nx * r * 0.85, ay + ny * r * 0.85);
    ctx.lineTo(tipX, tipY);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.5, r * 0.12 * (1 - sp01 * 0.3));
    ctx.lineCap = 'round';
    ctx.globalAlpha = alpha * (0.25 + sp01 * 0.40);
    ctx.stroke();
  }

  ctx.restore();
}

function _drawLeaderHighlight(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  r: number,
  primary: boolean,
): void {
  // Soft radial glow — no crown, purely luminous. Art-quality.
  const glowR = r * (primary ? 5.5 : 4.0);
  const g = ctx.createRadialGradient(ax, ay, r * 0.5, ax, ay, glowR);
  g.addColorStop(0.0, primary ? 'rgba(251,191,36,0.14)' : 'rgba(251,191,36,0.08)');
  g.addColorStop(0.5, primary ? 'rgba(251,191,36,0.06)' : 'rgba(251,191,36,0.03)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ax, ay, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Thin bright ring at body edge — the only solid indicator
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, ay, r + 1.5, 0, Math.PI * 2);
  ctx.strokeStyle = primary ? 'rgba(251,191,36,0.65)' : 'rgba(251,191,36,0.40)';
  ctx.lineWidth = primary ? 1.2 : 0.8;
  ctx.stroke();
  ctx.restore();
}

function renderAgentsGroups(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], roles: AgentRole[], r: number,
  leaders: Set<number>, primeLeader: number,
): void {
  // First pass: leader glows (behind agents)
  for (const li of leaders) {
    if (li < 0 || li >= agents.length) continue;
    const a = agents[li];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const ar = r * (0.72 + a.status * 0.72);
    _drawLeaderHighlight(ctx, ax, ay, ar, li === primeLeader);
  }

  // Second pass: agents
  for (let i = 0; i < agents.length; i++) {
    const a    = agents[i];
    const ax   = cx(a.x, cw), ay = cy(a.y, ch);
    const role = roles[i] ?? 'normal';
    const baseCol = archetypeKeyToColor(stableKey(a));
    const groupCol = GROUP_COLORS[a.groupId % GROUP_COLORS.length];
    const ar = r * (0.72 + a.status * 0.72);

    // Mood encoded as a subtle bottom arc (half-ring), not a full circle overlay.
    // This keeps the agent clean while showing dominant emotion.
    const dom = Math.max(a.belief, a.fear, a.desire);
    if (dom > 0.50) {
      let moodCol = '';
      if (a.belief >= a.fear && a.belief >= a.desire)  moodCol = '#34d399';
      else if (a.fear >= a.desire)                      moodCol = '#ef4444';
      else                                              moodCol = '#fbd38d';
      ctx.beginPath();
      ctx.arc(ax, ay, ar + 2.0, Math.PI * 0.2, Math.PI * 0.8);
      ctx.strokeStyle = moodCol;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = (dom - 0.45) * 0.9;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    _drawAgent(ctx, ax, ay, a.vx, a.vy, ar, baseCol, 0.88);

    // Group identity: thin colored dot below agent instead of full ring
    ctx.beginPath();
    ctx.arc(ax, ay + ar + 3, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = groupCol;
    ctx.globalAlpha = 0.65;
    ctx.fill();
    ctx.globalAlpha = 1;

    _drawRoleIndicator(ctx, ax, ay, ar, baseCol, role);
  }
}

// ── Agents: Power lens — status/fear ──────────────────────────────────────────
function renderAgentsPower(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], roles: AgentRole[], r: number,
  leaders: Set<number>, primeLeader: number,
): void {
  // Glow pass (behind agents)
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    if (a.status < 0.25) continue;
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const ar = r * (0.72 + a.status * 0.72);
    const baseCol = archetypeKeyToColor(stableKey(a));
    const [cr, cg, cb] = _hexToRgb(baseCol);
    const glowR = ar + a.status * r * 3;
    const g = ctx.createRadialGradient(ax, ay, ar * 0.5, ax, ay, glowR);
    g.addColorStop(0, `rgba(${cr},${cg},${cb},${a.status * 0.12})`);
    g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ax, ay, glowR, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const li of leaders) {
    if (li < 0 || li >= agents.length) continue;
    const a = agents[li];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const ar = r * (0.72 + a.status * 0.72);
    _drawLeaderHighlight(ctx, ax, ay, ar, li === primeLeader);
  }

  // Agent pass
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const role  = roles[i] ?? 'normal';
    const baseCol = archetypeKeyToColor(stableKey(a));
    const ar = r * (0.72 + a.status * 0.72);

    // Fear blends toward red
    const [cr, cg, cb] = _hexToRgb(baseCol);
    const fearBlend = a.fear * 0.6;
    const fr = Math.round(cr + (220 - cr) * fearBlend);
    const fg = Math.round(cg + (50 - cg) * fearBlend);
    const fb = Math.round(cb + (50 - cb) * fearBlend);
    const fillHex = `#${fr.toString(16).padStart(2, '0')}${fg.toString(16).padStart(2, '0')}${fb.toString(16).padStart(2, '0')}`;

    _drawAgent(ctx, ax, ay, a.vx, a.vy, ar, fillHex, 0.85);
    _drawRoleIndicator(ctx, ax, ay, ar, baseCol, role);
  }
}

// ── Agents: Economy lens — wealth as luminosity ──────────────────────────────
function renderAgentsEconomy(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], roles: AgentRole[], r: number,
  leaders: Set<number>, primeLeader: number,
): void {
  // Glow pass for wealthy agents
  const sorted = agents.map((a, i) => ({ i, w: a.wealth })).sort((a, b) => b.w - a.w);
  const top10 = new Set(sorted.slice(0, 10).map(x => x.i));

  for (const li of leaders) {
    if (li < 0 || li >= agents.length) continue;
    const a = agents[li];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const ar = r * (0.72 + a.status * 0.72);
    _drawLeaderHighlight(ctx, ax, ay, ar, li === primeLeader);
  }

  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const role  = roles[i] ?? 'normal';
    const baseCol = archetypeKeyToColor(stableKey(a));
    const ar = r * (0.72 + a.status * 0.72);

    // Wealth gold glow for top 10
    if (top10.has(i)) {
      const glowR = ar + 3 + a.wealth * 5;
      const g = ctx.createRadialGradient(ax, ay, ar, ax, ay, glowR);
      g.addColorStop(0, `rgba(251,191,36,${a.wealth * 0.15})`);
      g.addColorStop(1, 'rgba(251,191,36,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ax, ay, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    _drawAgent(ctx, ax, ay, a.vx, a.vy, ar, baseCol, 0.35 + a.wealth * 0.55);
    _drawRoleIndicator(ctx, ax, ay, ar, baseCol, role);
  }
}

// ── Agents: Faded (Events lens) ───────────────────────────────────────────────
function renderAgentsFaded(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], _roles: AgentRole[], r: number,
  _leaders: Set<number>, _primeLeader: number,
): void {
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const baseCol = archetypeKeyToColor(stableKey(a));
    const ar = r * (0.58 + a.status * 0.55);
    _drawAgent(ctx, ax, ay, a.vx, a.vy, ar, baseCol, 0.18);
  }
}

// ── Agents: Plain (Off lens) ────────────────────────────────────────────────
function renderAgentsPlain(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], _roles: AgentRole[], r: number,
  leaders: Set<number>, primeLeader: number,
): void {
  for (const li of leaders) {
    if (li < 0 || li >= agents.length) continue;
    const a = agents[li];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const ar = r * (0.72 + a.status * 0.72);
    _drawLeaderHighlight(ctx, ax, ay, ar, li === primeLeader);
  }
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const baseCol = archetypeKeyToColor(stableKey(a));
    const ar = r * (0.72 + a.status * 0.72);
    _drawAgent(ctx, ax, ay, a.vx, a.vy, ar, baseCol, 0.85);
  }
}

// ── Agents: Archetype lens — color by psychological state ─────────────────────
function renderAgentsArchetype(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], roles: AgentRole[], r: number,
  leaders: Set<number>, primeLeader: number,
): void {
  // Leader glows behind agents
  for (const li of leaders) {
    if (li < 0 || li >= agents.length) continue;
    const a = agents[li];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const ar = r * (0.72 + a.status * 0.55);
    _drawLeaderHighlight(ctx, ax, ay, ar, li === primeLeader);
  }

  for (let i = 0; i < agents.length; i++) {
    const a    = agents[i];
    const ax   = cx(a.x, cw), ay = cy(a.y, ch);
    const role = roles[i] ?? 'normal';
    const stableCol = archetypeKeyToColor(stableKey(a));
    const col  = stableCol;
    const ar   = r * (0.72 + a.status * 0.55);

    // Moment drift: subtle half-ring at top if archetype is shifting
    if (momentKey(a) !== stableKey(a)) {
      const momentCol = archetypeKeyToColor(momentKey(a));
      ctx.beginPath();
      ctx.arc(ax, ay, ar + 2, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.strokeStyle = momentCol;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.40;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    _drawAgent(ctx, ax, ay, a.vx, a.vy, ar, col, 0.88);
    _drawRoleIndicator(ctx, ax, ay, ar, col, role);
  }
}

// ── Role indicators — minimal geometric glyphs above the agent ────────────────
// Each role gets a single tiny symbol floating above, no rings or spikes.
// Art-exhibition quality: clean, readable, beautiful.
function _drawRoleIndicator(
  ctx: CanvasRenderingContext2D, ax: number, ay: number,
  r: number, _color: string, role: AgentRole,
): void {
  if (role === 'normal') return;
  const gy = ay - r - 5; // glyph Y position: just above agent
  ctx.save();

  switch (role) {
    case 'leader': {
      // Small golden circle
      ctx.beginPath();
      ctx.arc(ax, gy, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.globalAlpha = 0.80;
      ctx.fill();
      break;
    }
    case 'authority': {
      // Small blue diamond
      ctx.beginPath();
      ctx.moveTo(ax, gy - 2.5);
      ctx.lineTo(ax + 2, gy);
      ctx.lineTo(ax, gy + 2.5);
      ctx.lineTo(ax - 2, gy);
      ctx.closePath();
      ctx.fillStyle = '#60a5fa';
      ctx.globalAlpha = 0.75;
      ctx.fill();
      break;
    }
    case 'dictator': {
      // Red filled triangle (pointing up)
      ctx.beginPath();
      ctx.moveTo(ax, gy - 3);
      ctx.lineTo(ax + 2.5, gy + 1.5);
      ctx.lineTo(ax - 2.5, gy + 1.5);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.globalAlpha = 0.85;
      ctx.fill();
      // Red glow ring around the agent body
      ctx.beginPath();
      ctx.arc(ax, ay, r + 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.40;
      ctx.stroke();
      break;
    }
    case 'aggressor': {
      // Small red X
      const s = 2;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.70;
      ctx.beginPath();
      ctx.moveTo(ax - s, gy - s); ctx.lineTo(ax + s, gy + s);
      ctx.moveTo(ax + s, gy - s); ctx.lineTo(ax - s, gy + s);
      ctx.stroke();
      break;
    }
    case 'guardian': {
      // Small amber square
      ctx.fillStyle = '#fbd38d';
      ctx.globalAlpha = 0.65;
      ctx.fillRect(ax - 1.8, gy - 1.8, 3.6, 3.6);
      break;
    }
    case 'mediator': {
      // White inner dot
      ctx.beginPath();
      ctx.arc(ax, ay, r * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.55;
      ctx.fill();
      break;
    }
    case 'rebel': {
      // Small spark — single short diagonal line
      ctx.beginPath();
      ctx.moveTo(ax - 1.5, gy - 2);
      ctx.lineTo(ax + 1.5, gy + 2);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.80;
      ctx.stroke();
      break;
    }
    case 'priest': {
      // Small purple circle outline
      ctx.beginPath();
      ctx.arc(ax, gy, 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.70;
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// ── Agents: Morin Lens — perception/ethics/hybris/fervor/understanding/eco ────
function renderAgentsMorin(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], roles: AgentRole[], r: number,
  leaders: Set<number>, primeLeader: number,
): void {
  // Pass 1: understanding bridges (behind everything)
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    if (a.understanding < 0.3 || agents.length > 200) continue;
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    for (const m of a.memory) {
      if (m.friendly && m.agentIdx < agents.length) {
        const b = agents[m.agentIdx];
        if (b.groupId !== a.groupId) {
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(cx(b.x, cw), cy(b.y, ch));
          ctx.strokeStyle = '#00d4aa';
          ctx.lineWidth = 0.4;
          ctx.globalAlpha = a.understanding * 0.18;
          ctx.stroke();
        }
      }
    }
  }
  ctx.globalAlpha = 1;

  // Pass 2: soft glows (ethics + hybris halos behind agents)
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const ar = r * (0.72 + a.status * 0.72);

    if (a.ethics > 0.25) {
      const eR = ar + 3 + a.ethics * 8;
      const g = ctx.createRadialGradient(ax, ay, ar * 0.5, ax, ay, eR);
      g.addColorStop(0, `rgba(0,212,170,${a.ethics * 0.14})`);
      g.addColorStop(1, 'rgba(0,212,170,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ax, ay, eR, 0, Math.PI * 2);
      ctx.fill();
    }

    if (a.hybris > 0.25) {
      const hR = ar + 3 + a.hybris * 8;
      const g2 = ctx.createRadialGradient(ax, ay, ar * 0.5, ax, ay, hR);
      g2.addColorStop(0, `rgba(255,160,0,${a.hybris * 0.12})`);
      g2.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(ax, ay, hR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Pass 3: leader glows
  for (const li of leaders) {
    if (li < 0 || li >= agents.length) continue;
    const a = agents[li];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const ar = r * (0.72 + a.status * 0.72);
    _drawLeaderHighlight(ctx, ax, ay, ar, li === primeLeader);
  }

  // Pass 4: agent bodies
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const role = roles[i] ?? 'normal';
    const baseCol = archetypeKeyToColor(stableKey(a));
    const ar = r * (0.72 + a.status * 0.72);

    // Perception controls body opacity: low perception = dim
    const percAlpha = 0.40 + a.perception * 0.50;

    // Fervor: subtle red bottom arc
    if (a.fervor > 0.3) {
      ctx.beginPath();
      ctx.arc(ax, ay, ar + 2, Math.PI * 0.1, Math.PI * 0.9);
      ctx.strokeStyle = '#ff4500';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = a.fervor * 0.50;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // EcoFootprint: subtle brown dot below
    if (a.ecoFootprint > 0.3) {
      ctx.beginPath();
      ctx.arc(ax, ay + ar + 3, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#8b4513';
      ctx.globalAlpha = a.ecoFootprint * 0.55;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    _drawAgent(ctx, ax, ay, a.vx, a.vy, ar, baseCol, percAlpha);
    _drawRoleIndicator(ctx, ax, ay, ar, baseCol, role);
  }

  // Legend (bottom-left) — minimal, translucent
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.font = '8px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const legends = [
    { color: '#00d4aa', label: 'Ética' },
    { color: '#ff4500', label: 'Fervor' },
    { color: '#ffa000', label: 'Hybris' },
    { color: '#8b4513', label: 'Eco' },
  ];
  for (let li = 0; li < legends.length; li++) {
    const ly = ch - 50 + li * 11;
    ctx.fillStyle = legends[li].color;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(10, ly + 1, 5, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.globalAlpha = 0.5;
    ctx.fillText(legends[li].label, 18, ly);
  }
  ctx.restore();
}

// ── Symbols ───────────────────────────────────────────────────────────────────
function _countAgentsIn(agents: StudyAgent[], x: number, y: number, r: number, step = 1): number {
  let n = 0;
  for (let i = 0; i < agents.length; i += step) {
    const a = agents[i];
    const d2 = (a.x - x) ** 2 + (a.y - y) ** 2;
    if (d2 < r * r) n++;
  }
  return step > 1 ? Math.round(n * step) : n;
}

function renderSymbols(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  symbols: StudySymbols, exception: boolean,
  agents: StudyAgent[],
): void {
  const sampleStep = agents.length > 260 ? 4 : agents.length > 180 ? 3 : agents.length > 120 ? 2 : 1;

  // Rituals — clean dashed circles with single label
  for (const ritual of symbols.rituals) {
    const rcx = cx(ritual.x, cw);
    const rcy = cy(ritual.y, ch);
    const rr  = ritual.radius * 0.5 * Math.min(cw, ch);
    const col = ritual.kind === 'GATHER' ? '#a78bfa' : ritual.kind === 'OFFERING' ? '#fbbf24' : ritual.kind === 'REVOLT' ? '#ef4444' : '#fbd38d';
    ctx.beginPath();
    ctx.arc(rcx, rcy, rr, 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = ritual.active ? 1.5 : 0.8;
    ctx.globalAlpha = ritual.active ? 0.45 : 0.15;
    ctx.setLineDash(ritual.active ? [6, 3] : [3, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    const inRange = _countAgentsIn(agents, ritual.x, ritual.y, ritual.radius, sampleStep);
    const rlbl = ritual.kind === 'GATHER' ? '◎' : ritual.kind === 'OFFERING' ? '◈' : ritual.kind === 'REVOLT' ? '✦' : '◻';
    _labelSymbol(ctx, rcx, rcy - rr - 6, `${rlbl} ${inRange}`, col);
  }

  // Taboos — subtle red zone
  for (const tabu of symbols.tabus) {
    const tcx = cx(tabu.x, cw);
    const tcy = cy(tabu.y, ch);
    const tr  = tabu.radius * 0.5 * Math.min(cw, ch);
    const col = '#ef4444';

    ctx.beginPath();
    ctx.arc(tcx, tcy, tr, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.04 * (exception ? 1.8 : 1);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tcx, tcy, tr, 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = exception ? 1.5 : 0.8;
    ctx.globalAlpha = 0.35;
    ctx.stroke();
    ctx.globalAlpha = 1;

    const inT = _countAgentsIn(agents, tabu.x, tabu.y, tabu.radius, sampleStep);
    const sym = tabu.kind === 'NO_ENTER' ? '⊘' : '⊗';
    _labelSymbol(ctx, tcx, tcy - tr - 6, `${sym} ${inT}`, col);
  }

  // Totems — soft radial glow + center dot + single label
  for (const totem of symbols.totems) {
    const tcx = cx(totem.x, cw);
    const tcy = cy(totem.y, ch);
    const tr  = totem.radius * 0.5 * Math.min(cw, ch);
    const totemCols: Record<string, string> = { BOND: '#34d399', RIFT: '#ff6b6b', ORACLE: '#c084fc', ARCHIVE: '#94a3b8', PANOPTICON: '#fbbf24' };
    const col = totemCols[totem.kind] || '#34d399';
    const [rr, gg, bb] = _hexToRgb(col);

    // Soft radial fill instead of flat circle
    const grad = ctx.createRadialGradient(tcx, tcy, 0, tcx, tcy, tr);
    grad.addColorStop(0.0, `rgba(${rr},${gg},${bb},0.08)`);
    grad.addColorStop(0.7, `rgba(${rr},${gg},${bb},0.03)`);
    grad.addColorStop(1.0, `rgba(${rr},${gg},${bb},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(tcx, tcy, tr, 0, Math.PI * 2);
    ctx.fill();

    // Thin ring
    ctx.beginPath();
    ctx.arc(tcx, tcy, tr, 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.30;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Center marker
    ctx.beginPath();
    ctx.arc(tcx, tcy, 3, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.60;
    ctx.fill();
    ctx.globalAlpha = 1;

    const tlbl: Record<string, string> = { BOND: '⊕', RIFT: '⊖', ORACLE: '◈', ARCHIVE: '▪', PANOPTICON: '◉' };
    const inRange = _countAgentsIn(agents, totem.x, totem.y, totem.radius, sampleStep);
    _labelSymbol(ctx, tcx, tcy - tr - 6, `${tlbl[totem.kind] || '·'} ${inRange}`, col);
  }
}

function _labelSymbol(
  ctx: CanvasRenderingContext2D, lx: number, ly: number, label: string, color: string,
): void {
  if (!label) return;
  ctx.save();
  ctx.font = '8px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Simple text with subtle shadow — no pill background for cleaner look
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  ctx.fillText(label, lx + 0.5, ly + 0.5);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = color;
  ctx.fillText(label, lx, ly);
  ctx.restore();
}

// ── Pings ────────────────────────��────────────────────────────────────────────
export function renderPings(
  ctx: CanvasRenderingContext2D, cw: number, ch: number, pings: StudyPing[],
): void {
  for (const p of pings) {
    const life = 1 - p.age / p.ttl;
    if (life <= 0) continue;
    const px = cx(p.x, cw), py = cy(p.y, ch);
    const r  = (1 - life) * 55 + 8;

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = life * 0.55;
    ctx.stroke();

    if (life > 0.4) {
      ctx.font = '8px system-ui, sans-serif';
      ctx.fillStyle = p.color;
      ctx.globalAlpha = life * 0.75;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(p.message, px, py - r - 4);
    }
    ctx.globalAlpha = 1;
  }
}