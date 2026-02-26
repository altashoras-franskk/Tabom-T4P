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

// ── Agent radius ──────────────────────────────────────────────────────────────
function agentR(cw: number, ch: number): number { return 0.028 * 0.5 * Math.min(cw, ch); }

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
  mainCtx.imageSmoothingQuality = 'low';
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
): void {
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
  if (lens === 'field' && _fieldImgN && _fieldImgL && _fieldImgR) {
    ctx.globalAlpha = 0.75;
    drawFieldLayer(ctx, _fieldImgN, cw, ch);
    ctx.globalAlpha = 0.65;
    drawFieldLayer(ctx, _fieldImgL, cw, ch);
    ctx.globalAlpha = 0.60;
    drawFieldLayer(ctx, _fieldImgR, cw, ch);
    ctx.globalAlpha = 1;
  } else if (lens === 'power' && _fieldImgN && _fieldImgL) {
    ctx.globalAlpha = 0.65;
    drawFieldLayer(ctx, _fieldImgN, cw, ch);
    ctx.globalAlpha = 0.72;
    drawFieldLayer(ctx, _fieldImgL, cw, ch);
    ctx.globalAlpha = 1;
  } else if (lens === 'economy' && _fieldImgR) {
    ctx.globalAlpha = 0.72;
    drawFieldLayer(ctx, _fieldImgR, cw, ch);
    ctx.globalAlpha = 1;
  }

  // ── Symbols (all lenses except off) ──
  if (lens !== 'off') {
    renderSymbols(ctx, cw, ch, symbols, ws.exceptionActive, agents);
  }

  // ── Organic Trails ──
  if (lens !== 'off' && lens !== 'events') {
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
function renderTails(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[],
  roles: AgentRole[],
): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const stride = agents.length > 260 ? 3 : agents.length > 180 ? 2 : 1;
  const tLen = 15; // trail buffer length

  for (let ai = 0; ai < agents.length; ai += stride) {
    const a = agents[ai];
    if (!a.trailX) continue;

    const col = archetypeKeyToColor(stableKey(a));
    // Draw trail as individual line segments so each can fade
    for (let i = 1; i < tLen; i++) {
      const idx0 = (a.trailIdx + i - 1) % tLen;
      const idx1 = (a.trailIdx + i)     % tLen;
      const x0 = a.trailX[idx0], y0 = a.trailY[idx0];
      const x1 = a.trailX[idx1], y1 = a.trailY[idx1];
      if ((x0 === 0 && y0 === 0) || (x1 === 0 && y1 === 0)) continue;

      const progress = i / tLen; // 0=oldest, 1=newest
      ctx.beginPath();
      ctx.moveTo(cx(x0, cw), cy(y0, ch));
      ctx.lineTo(cx(x1, cw), cy(y1, ch));
      ctx.strokeStyle = col;
      ctx.lineWidth = 0.8 + progress * 1.0;
      ctx.globalAlpha = progress * progress * 0.38; // quadratic fade: near-zero at tail
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// ── Agents: Groups ────────────────────────────────────────────────────────────
// Draw circle with a direction "nose" line
function _drawAgent(ctx: CanvasRenderingContext2D, ax: number, ay: number, vx: number, vy: number, r: number, color: string, alpha: number) {
  const spd = Math.sqrt(vx * vx + vy * vy);
  const nx = spd > 0.0001 ? vx / spd : 1;
  const ny = spd > 0.0001 ? vy / spd : 0;
  const sp01 = Math.min(1, spd * 80); // heuristic: makes direction feel responsive without flicker

  ctx.globalAlpha = alpha;

  // Circle body
  ctx.beginPath();
  ctx.arc(ax, ay, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Nose (thin + reactive): small wedge + hairline stem
  const noseLen = r * (0.8 + 1.9 * sp01);
  const noseW   = Math.max(0.7, r * 0.16);
  const px = ax + nx * (r + noseLen);
  const py = ay + ny * (r + noseLen);
  const tx = -ny, ty = nx;

  // stem
  ctx.beginPath();
  ctx.moveTo(ax + nx * r, ay + ny * r);
  ctx.lineTo(ax + nx * (r + noseLen * 0.72), ay + ny * (r + noseLen * 0.72));
  ctx.strokeStyle = color;
  ctx.lineWidth = noseW;
  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha * (0.55 + sp01 * 0.35);
  ctx.stroke();

  // wedge tip
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px - nx * noseLen * 0.38 + tx * noseW * 1.4, py - ny * noseLen * 0.38 + ty * noseW * 1.4);
  ctx.lineTo(px - nx * noseLen * 0.38 - tx * noseW * 1.4, py - ny * noseLen * 0.38 - ty * noseW * 1.4);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha * (0.35 + sp01 * 0.35);
  ctx.fill();

  ctx.globalAlpha = 1;
}

function _drawLeaderHighlight(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  r: number,
  primary: boolean,
): void {
  const glowR = r * (primary ? 5.2 : 3.6);
  const g = ctx.createRadialGradient(ax, ay, r * 0.2, ax, ay, glowR);
  g.addColorStop(0.0, primary ? 'rgba(251,191,36,0.16)' : 'rgba(251,191,36,0.10)');
  g.addColorStop(0.45, primary ? 'rgba(251,191,36,0.07)' : 'rgba(251,191,36,0.05)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(ax - glowR, ay - glowR, glowR * 2, glowR * 2);
  ctx.restore();

  // Crown glyph (screen-space)
  const y = ay - r - (primary ? r * 1.05 : r * 0.85);
  const w = r * (primary ? 1.9 : 1.5);
  const h = r * (primary ? 1.05 : 0.85);
  ctx.save();
  ctx.globalAlpha = primary ? 0.95 : 0.85;
  ctx.fillStyle = primary ? 'rgba(251,191,36,0.95)' : 'rgba(251,191,36,0.78)';
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(ax - w, y);
  ctx.lineTo(ax - w * 0.55, y - h * 0.65);
  ctx.lineTo(ax,           y - h);
  ctx.lineTo(ax + w * 0.55, y - h * 0.65);
  ctx.lineTo(ax + w, y);
  ctx.lineTo(ax + w, y + h * 0.20);
  ctx.lineTo(ax - w, y + h * 0.20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function renderAgentsGroups(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], roles: AgentRole[], r: number,
  leaders: Set<number>, primeLeader: number,
): void {
  for (let i = 0; i < agents.length; i++) {
    const a    = agents[i];
    const ax   = cx(a.x, cw), ay = cy(a.y, ch);
    const role = roles[i] ?? 'normal';
    const baseCol = archetypeKeyToColor(stableKey(a));
    const groupCol = GROUP_COLORS[a.groupId % GROUP_COLORS.length];

    // Size varies by status (leaders are visibly bigger)
    const ar = r * (0.72 + a.status * 0.72);

    // Psychology mood ring: dominant inner state shown as colored outer ring
    const dom = Math.max(a.belief, a.fear, a.desire);
    if (dom > 0.42) {
      let moodCol = '';
      if (a.belief >= a.fear && a.belief >= a.desire && a.belief > 0.42)      moodCol = '#34d399';
      else if (a.fear  >= a.desire && a.fear  > 0.42)                          moodCol = '#ef4444';
      else if (a.desire > 0.42)                                                 moodCol = '#fbd38d';
      if (moodCol) {
        ctx.beginPath();
        ctx.arc(ax, ay, ar + 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = moodCol;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = (dom - 0.4) * 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Agent fill
    _drawAgent(ctx, ax, ay, a.vx, a.vy, ar, baseCol, 0.82);

    // Group identity (thin ring only; avoids "start-group color blocks")
    ctx.beginPath();
    ctx.arc(ax, ay, ar + 1.2, 0, Math.PI * 2);
    ctx.strokeStyle = hexA(groupCol, 0.65);
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;

    _drawRoleIndicator(ctx, ax, ay, ar, baseCol, role);
    if (leaders.has(i)) _drawLeaderHighlight(ctx, ax, ay, ar, i === primeLeader);
  }
}

// ── Agents: Power lens — status/fear auras ───────────────────────────────────
function renderAgentsPower(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], roles: AgentRole[], r: number,
  leaders: Set<number>, primeLeader: number,
): void {
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const role  = roles[i] ?? 'normal';
    const baseCol = archetypeKeyToColor(stableKey(a));
    const ar = r * (0.72 + a.status * 0.72);

    // Status aura (soft glow proportional to status)
    if (a.status > 0.15) {
      ctx.beginPath();
      ctx.arc(ax, ay, r + a.status * r * 2.5, 0, Math.PI * 2);
      ctx.save();
      ctx.strokeStyle = baseCol;
      ctx.lineWidth = 1;
      ctx.globalAlpha = Math.min(0.6, 0.12 + a.status * 0.35);
      ctx.stroke();
      ctx.restore();
    }

    // Fear tint (darker/redder)
    const fearR = Math.round(255 * (0.5 + a.fear * 0.5));
    const fearG = Math.round(100 * (1 - a.fear * 0.6));
    const fillColor = a.fear > 0.4 ? `rgb(${fearR},${fearG},60)` : baseCol;
    _drawAgent(ctx, ax, ay, a.vx, a.vy, ar, fillColor, 0.80);

    _drawRoleIndicator(ctx, ax, ay, ar, baseCol, role);
    if (leaders.has(i)) _drawLeaderHighlight(ctx, ax, ay, ar, i === primeLeader);
  }
}

// ── Agents: Economy lens — wealth auras ──────────────────────────────────────
function renderAgentsEconomy(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], roles: AgentRole[], r: number,
  leaders: Set<number>, primeLeader: number,
): void {
  // Find top 10 by wealth
  const sorted = agents.map((a, i) => ({ i, w: a.wealth })).sort((a, b) => b.w - a.w);
  const top10 = new Set(sorted.slice(0, 10).map(x => x.i));

  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const role  = roles[i] ?? 'normal';
    const baseCol = archetypeKeyToColor(stableKey(a));
    const ar = r * (0.72 + a.status * 0.72);

    // Wealth halo for top 10
    if (top10.has(i)) {
      ctx.beginPath();
      ctx.arc(ax, ay, r + 5 + a.wealth * 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(251,191,36,${a.wealth * 0.55})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Agent fill: dim=poor, bright=rich
    _drawAgent(ctx, ax, ay, a.vx, a.vy, ar, baseCol, 0.35 + a.wealth * 0.55);

    _drawRoleIndicator(ctx, ax, ay, ar, baseCol, role);
    if (leaders.has(i)) _drawLeaderHighlight(ctx, ax, ay, ar, i === primeLeader);
  }
}

// ── Agents: Faded (Events lens) ───────────────────────────────────────────────
function renderAgentsFaded(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], roles: AgentRole[], r: number,
  leaders: Set<number>, primeLeader: number,
): void {
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const baseCol = archetypeKeyToColor(stableKey(a));
    const ar = r * (0.58 + a.status * 0.55);
    _drawAgent(ctx, ax, ay, a.vx, a.vy, ar, baseCol, 0.22);
    if (leaders.has(i)) _drawLeaderHighlight(ctx, ax, ay, ar, i === primeLeader);
  }
}

// ── Agents: Plain (Off lens) ────────────────────────────────────────────────
function renderAgentsPlain(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], roles: AgentRole[], r: number,
  leaders: Set<number>, primeLeader: number,
): void {
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const baseCol = archetypeKeyToColor(stableKey(a));
    const ar = r * (0.72 + a.status * 0.72);
    _drawAgent(ctx, ax, ay, a.vx, a.vy, ar, baseCol, 0.82);
    if (leaders.has(i)) _drawLeaderHighlight(ctx, ax, ay, ar, i === primeLeader);
  }
}

// ── Agents: Archetype lens — color by psychological state ─────────────────────
function renderAgentsArchetype(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], roles: AgentRole[], r: number,
  leaders: Set<number>, primeLeader: number,
): void {
  for (let i = 0; i < agents.length; i++) {
    const a    = agents[i];
    const ax   = cx(a.x, cw), ay = cy(a.y, ch);
    const role = roles[i] ?? 'normal';
    const stableCol = archetypeKeyToColor(stableKey(a));
    const momentCol = archetypeKeyToColor(momentKey(a));
    const col  = stableCol;
    const ar   = r * (0.72 + a.status * 0.55);

    // Moment accent: show current drift only if different from stable
    if (momentKey(a) !== stableKey(a)) {
      ctx.beginPath();
      ctx.arc(ax, ay, ar + 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = momentCol;
      ctx.lineWidth = 1.0;
      ctx.setLineDash([2, 3]);
      ctx.globalAlpha = 0.35;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Auras for power archetypes
    if (role === 'dictator') {
      ctx.beginPath();
      ctx.arc(ax, ay, ar + 7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239,68,68,0.95)';
      ctx.lineWidth = 2.2;
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (role === 'rebel') {
      ctx.beginPath();
      ctx.arc(ax, ay, ar + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.45;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (role === 'leader') {
      ctx.beginPath();
      ctx.arc(ax, ay, ar + 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.50;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (role === 'authority' || role === 'guardian') {
      ctx.beginPath();
      ctx.arc(ax, ay, ar + 4.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.45;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (role === 'priest') {
      ctx.beginPath();
      ctx.arc(ax, ay, ar + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    _drawAgent(ctx, ax, ay, a.vx, a.vy, ar, col, 0.85);
    _drawRoleIndicator(ctx, ax, ay, ar, col, role);
    if (leaders.has(i)) _drawLeaderHighlight(ctx, ax, ay, ar, i === primeLeader);
  }
}

// ── Role indicators ───────────────────────────────────────────────────────────
function _drawRoleIndicator(
  ctx: CanvasRenderingContext2D, ax: number, ay: number,
  r: number, color: string, role: AgentRole,
): void {
  switch (role) {
    case 'leader':
      ctx.beginPath();
      ctx.arc(ax, ay, r + 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.65;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ax, ay, r + 5.0, 0, Math.PI * 2);
      ctx.lineWidth = 0.7;
      ctx.globalAlpha = 0.28;
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    case 'authority': {
      // Shield-like outline + inner dot
      ctx.beginPath();
      ctx.arc(ax, ay, r + 3.2, 0, Math.PI * 2);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.75;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ax, ay, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = '#60a5fa';
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case 'dictator': {
      // Coercive double-ring with spikes radiating at 45°
      const s = r + 4.5;
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(ax, ay, s, 0, Math.PI * 2);
      ctx.stroke();
      // 4 outward spikes
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 0.65;
      for (let si = 0; si < 4; si++) {
        const ang = si * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(ax + Math.cos(ang) * (s + 1), ay + Math.sin(ang) * (s + 1));
        ctx.lineTo(ax + Math.cos(ang) * (s + 8), ay + Math.sin(ang) * (s + 8));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'aggressor':
      ctx.beginPath();
      ctx.arc(ax, ay, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax, ay - r - 6);
      ctx.lineTo(ax - 3, ay - r);
      ctx.lineTo(ax + 3, ay - r);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    case 'guardian':
      ctx.beginPath();
      ctx.arc(ax, ay, r + 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#fbd38d';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    case 'mediator':
      ctx.beginPath();
      ctx.arc(ax, ay, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    case 'rebel':
      // Zigzag spark above
      ctx.beginPath();
      ctx.moveTo(ax - 3, ay - r - 8);
      ctx.lineTo(ax + 1, ay - r - 4);
      ctx.lineTo(ax - 1, ay - r - 2);
      ctx.lineTo(ax + 3, ay - r + 1);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.85;
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    case 'priest':
      // Small cross / halo
      ctx.beginPath();
      ctx.arc(ax, ay, r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 3]);
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      break;
  }
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
  // Rituals
  for (const ritual of symbols.rituals) {
    const rcx = cx(ritual.x, cw);
    const rcy = cy(ritual.y, ch);
    const rr  = ritual.radius * 0.5 * Math.min(cw, ch);
    const col = ritual.kind === 'GATHER' ? '#a78bfa' : ritual.kind === 'OFFERING' ? '#fbbf24' : ritual.kind === 'REVOLT' ? '#ef4444' : '#fbd38d';
    ctx.beginPath();
    ctx.arc(rcx, rcy, rr, 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = ritual.active ? (ritual.kind === 'REVOLT' ? 3 : 2) : 1;
    ctx.globalAlpha = ritual.active ? (ritual.kind === 'REVOLT' ? 0.6 : 0.5) : 0.2;
    if (ritual.kind === 'REVOLT' && ritual.active) {
      ctx.setLineDash([10, 5, 2, 5]);
    } else {
      ctx.setLineDash(ritual.active ? [] : [4, 4]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Semantic label: what is this ritual doing right now?
    const inRange = _countAgentsIn(agents, ritual.x, ritual.y, ritual.radius, sampleStep);
    const rlbl = ritual.kind === 'GATHER' ? '◎ Gather' : ritual.kind === 'OFFERING' ? '🎁 Offering' : ritual.kind === 'REVOLT' ? '🔥 Revolt' : '🥁 Procession';
    const activity = ritual.active ? ` · ${inRange} in` : ` · ${inRange} near`;
    _labelSymbol(ctx, rcx, rcy - rr - 12, rlbl, col);
    _labelSymbol(ctx, rcx, rcy - rr - 3, activity, col);
  }

  // Taboos
  for (const tabu of symbols.tabus) {
    const tcx = cx(tabu.x, cw);
    const tcy = cy(tabu.y, ch);
    const tr  = tabu.radius * 0.5 * Math.min(cw, ch);
    const col = '#ef4444';

    ctx.beginPath();
    ctx.arc(tcx, tcy, tr, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.07 * (exception ? 1.8 : 1);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tcx, tcy, tr, 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = exception ? 2.5 : 1.5;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;

    const inT = _countAgentsIn(agents, tabu.x, tabu.y, tabu.radius, sampleStep);
    const tname = tabu.kind === 'NO_ENTER' ? '⛔ No-Enter' : '⚔ No-Mix';
    const viol = tabu.violationCount > 0 ? ` · ${tabu.violationCount} violations` : '';
    _labelSymbol(ctx, tcx, tcy - tr - 12, tname, col);
    _labelSymbol(ctx, tcx, tcy - tr - 3, `${inT} inside${viol}`, col);
  }

  // Totems
  for (const totem of symbols.totems) {
    const tcx = cx(totem.x, cw);
    const tcy = cy(totem.y, ch);
    const tr  = totem.radius * 0.5 * Math.min(cw, ch);
    const totemCols: Record<string, string> = { BOND: '#34d399', RIFT: '#ff6b6b', ORACLE: '#c084fc', ARCHIVE: '#94a3b8', PANOPTICON: '#fbbf24' };
    const col = totemCols[totem.kind] || '#34d399';

    // Soft fill
    ctx.beginPath();
    ctx.arc(tcx, tcy, tr, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.06;
    ctx.fill();

    // Outer ring
    ctx.beginPath();
    ctx.arc(tcx, tcy, tr, 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = totem.kind === 'PANOPTICON' ? 2 : 1.5;
    ctx.globalAlpha = totem.kind === 'PANOPTICON' ? 0.6 : 0.45;
    if (totem.kind === 'PANOPTICON') ctx.setLineDash([2, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Center marker
    ctx.beginPath();
    ctx.arc(tcx, tcy, totem.kind === 'PANOPTICON' ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.globalAlpha = totem.kind === 'PANOPTICON' ? 0.9 : 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Semantic label: what is this totem depositing?
    const tlbl: Record<string, string> = { BOND: '⊕ Bond', RIFT: '⊖ Rift', ORACLE: '🔮 Oracle', ARCHIVE: '📜 Archive', PANOPTICON: '👁 Panopticon' };
    const tact: Record<string, string> = { BOND: 'deposits N+L', RIFT: 'erodes N · faction L', ORACLE: 'amplifies charisma', ARCHIVE: 'locks memory', PANOPTICON: 'surveils · conformity' };
    const inRange = _countAgentsIn(agents, totem.x, totem.y, totem.radius, sampleStep);
    _labelSymbol(ctx, tcx, tcy - tr - 20, tlbl[totem.kind] || totem.kind, col);
    _labelSymbol(ctx, tcx, tcy - tr - 11, tact[totem.kind] || '', col);
    _labelSymbol(ctx, tcx, tcy - tr - 2, `${inRange} agents`, col);
  }
}

function _labelSymbol(
  ctx: CanvasRenderingContext2D, lx: number, ly: number, label: string, color: string,
): void {
  if (!label) return;
  ctx.save();
  ctx.font = '9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const padX = 6;
  const padY = 3;
  const w = Math.ceil(ctx.measureText(label).width + padX * 2);
  const h = 14;
  const x = Math.round(lx - w / 2);
  const y = Math.round(ly - h / 2);
  const rr = 6;

  // Rounded pill background
  ctx.globalAlpha = 0.80;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.stroke();

  // Text
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.72;
  ctx.fillText(label, lx, ly + 0.5);
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