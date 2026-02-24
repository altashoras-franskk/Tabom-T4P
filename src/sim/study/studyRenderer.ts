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
    d[i*4  ] = r;
    d[i*4+1] = g;
    d[i*4+2] = b;
    d[i*4+3] = Math.min(255, v * 240);
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
    ctx.globalAlpha = 0.5;
    drawFieldLayer(ctx, _fieldImgN, cw, ch);
    ctx.globalAlpha = 0.4;
    drawFieldLayer(ctx, _fieldImgL, cw, ch);
    ctx.globalAlpha = 0.35;
    drawFieldLayer(ctx, _fieldImgR, cw, ch);
    ctx.globalAlpha = 1;
  } else if (lens === 'power' && _fieldImgN && _fieldImgL) {
    ctx.globalAlpha = 0.45;
    drawFieldLayer(ctx, _fieldImgN, cw, ch);
    ctx.globalAlpha = 0.55;
    drawFieldLayer(ctx, _fieldImgL, cw, ch);
    ctx.globalAlpha = 1;
  } else if (lens === 'economy' && _fieldImgR) {
    ctx.globalAlpha = 0.55;
    drawFieldLayer(ctx, _fieldImgR, cw, ch);
    ctx.globalAlpha = 1;
  }

  // ── Symbols (all lenses except off) ──
  if (lens !== 'off') {
    renderSymbols(ctx, cw, ch, symbols, ws.exceptionActive);
  }

  // ── Agents (always rendered; lens changes style only) ──
  const r = agentR(cw, ch);
  if (lens === 'off') {
    // Plain: agents as simple group-colored dots, no decorations
    renderAgentsPlain(ctx, cw, ch, agents, r);
  } else if (lens === 'economy') {
    renderAgentsEconomy(ctx, cw, ch, agents, roles, r);
  } else if (lens === 'power') {
    renderAgentsPower(ctx, cw, ch, agents, roles, r);
  } else if (lens === 'events') {
    renderAgentsFaded(ctx, cw, ch, agents, r);
  } else {
    // groups / field
    renderAgentsGroups(ctx, cw, ch, agents, roles, r);
  }

  // ── Pings (always) ──
  renderPings(ctx, cw, ch, pings);
}

// ── Agents: Groups ────────────────────────────────────────────────────────────
function renderAgentsGroups(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], roles: AgentRole[], r: number,
): void {
  for (let i = 0; i < agents.length; i++) {
    const a    = agents[i];
    const ax   = cx(a.x, cw), ay = cy(a.y, ch);
    const col  = GROUP_COLORS[a.groupId % GROUP_COLORS.length];
    const role = roles[i] ?? 'normal';

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
    ctx.beginPath();
    ctx.arc(ax, ay, ar, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.80;
    ctx.fill();
    ctx.globalAlpha = 1;

    _drawRoleIndicator(ctx, ax, ay, ar, col, role);
  }
}

// ── Agents: Power lens — status/fear auras ───────────────────────────────────
function renderAgentsPower(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], roles: AgentRole[], r: number,
): void {
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const color = GROUP_COLORS[a.groupId % GROUP_COLORS.length];
    const role  = roles[i] ?? 'normal';

    // Status aura (soft glow proportional to status)
    if (a.status > 0.15) {
      ctx.beginPath();
      ctx.arc(ax, ay, r + a.status * r * 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = hexA(color, a.status * 0.4);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Fear tint (darker/redder)
    const fearR = Math.round(255 * (0.5 + a.fear * 0.5));
    const fearG = Math.round(100 * (1 - a.fear * 0.6));
    ctx.beginPath();
    ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.fillStyle = a.fear > 0.4 ? `rgb(${fearR},${fearG},60)` : color;
    ctx.globalAlpha = 0.80;
    ctx.fill();
    ctx.globalAlpha = 1;

    _drawRoleIndicator(ctx, ax, ay, r, color, role);
  }
}

// ── Agents: Economy lens — wealth auras ──────────────────────────────────────
function renderAgentsEconomy(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], roles: AgentRole[], r: number,
): void {
  // Find top 10 by wealth
  const sorted = agents.map((a, i) => ({ i, w: a.wealth })).sort((a, b) => b.w - a.w);
  const top10 = new Set(sorted.slice(0, 10).map(x => x.i));

  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const ax = cx(a.x, cw), ay = cy(a.y, ch);
    const color = GROUP_COLORS[a.groupId % GROUP_COLORS.length];
    const role  = roles[i] ?? 'normal';

    // Wealth halo for top 10
    if (top10.has(i)) {
      ctx.beginPath();
      ctx.arc(ax, ay, r + 5 + a.wealth * 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(251,191,36,${a.wealth * 0.55})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Agent fill: dim=poor, bright=rich
    ctx.beginPath();
    ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.35 + a.wealth * 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;

    _drawRoleIndicator(ctx, ax, ay, r, color, role);
  }
}

// ── Agents: Faded (Events lens) ───────────────────────────────────────────────
function renderAgentsFaded(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], r: number,
): void {
  for (const a of agents) {
    ctx.beginPath();
    ctx.arc(cx(a.x, cw), cy(a.y, ch), r * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = GROUP_COLORS[a.groupId % GROUP_COLORS.length];
    ctx.globalAlpha = 0.25;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Agents: Plain (Off lens) ────────────────────────────────────────────────
function renderAgentsPlain(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], r: number,
): void {
  for (const a of agents) {
    ctx.beginPath();
    ctx.arc(cx(a.x, cw), cy(a.y, ch), r, 0, Math.PI * 2);
    ctx.fillStyle = GROUP_COLORS[a.groupId % GROUP_COLORS.length];
    ctx.globalAlpha = 0.80;
    ctx.fill();
    ctx.globalAlpha = 1;
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
  }
}

// ── Symbols ───────────────────────────────────────────────────────────────────
function renderSymbols(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  symbols: StudySymbols, exception: boolean,
): void {
  // Rituals (outermost, behind everything)
  for (const ritual of symbols.rituals) {
    const rcx = cx(ritual.x, cw);
    const rcy = cy(ritual.y, ch);
    const rr  = ritual.radius * 0.5 * Math.min(cw, ch);
    const col = ritual.kind === 'GATHER' ? '#a78bfa' : '#fbd38d';
    ctx.beginPath();
    ctx.arc(rcx, rcy, rr, 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = ritual.active ? 2 : 1;
    ctx.globalAlpha = ritual.active ? 0.5 : 0.2;
    ctx.setLineDash(ritual.active ? [] : [4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    _labelSymbol(ctx, rcx, rcy - rr - 8, ritual.kind === 'GATHER' ? '◎ Gather' : '🥁 Procession', col);
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
    _labelSymbol(ctx, tcx, tcy, tabu.kind === 'NO_ENTER' ? '⛔' : '⚔', col);
  }

  // Totems
  for (const totem of symbols.totems) {
    const tcx = cx(totem.x, cw);
    const tcy = cy(totem.y, ch);
    const tr  = totem.radius * 0.5 * Math.min(cw, ch);
    const col = totem.kind === 'BOND' ? '#34d399' : '#ff6b6b';

    // Soft fill
    ctx.beginPath();
    ctx.arc(tcx, tcy, tr, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.06;
    ctx.fill();

    // Outer ring (pulsing)
    ctx.beginPath();
    ctx.arc(tcx, tcy, tr, 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.45;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Center marker
    ctx.beginPath();
    ctx.arc(tcx, tcy, 5, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;

    _labelSymbol(ctx, tcx, tcy - tr - 8, totem.kind === 'BOND' ? '⊕ Bond' : '⊖ Rift', col);
  }
}

function _labelSymbol(
  ctx: CanvasRenderingContext2D, lx: number, ly: number, label: string, color: string,
): void {
  ctx.font = '9px system-ui, sans-serif';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.65;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, lx, ly);
  ctx.globalAlpha = 1;
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