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

// ── Archetype colors ──────────────────────────────────────────────────────────
// Derived from agent psychology, not group
function archetypeColor(a: StudyAgent): string {
  const maxV = Math.max(a.belief, a.fear, a.desire, a.resistance);
  if (a.resistance > 0.7 || (a.ideology > 0.5 && a.desire > 0.65 && a.fear < 0.35)) return '#f87171'; // rebel - red
  if (a.belief > 0.70 && a.status > 0.45 && a.charisma > 0.4) return '#c084fc'; // priest - purple
  if (a.centrality > 0.3 && a.status > 0.4) return '#fbbf24'; // leader - gold
  if (a.aggression > 0.65 && a.hostileCount >= 2) return '#fb923c'; // aggressor - orange
  if (a.fear > maxV * 0.8 && maxV > 0.3)  return '#6366f1'; // afraid - indigo
  if (a.belief > maxV * 0.8 && maxV > 0.3) return '#34d399'; // believer - teal
  if (a.desire > maxV * 0.8 && maxV > 0.3) return '#facc15'; // transgressor - yellow
  return '#94a3b8'; // neutral - slate
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
    renderSymbols(ctx, cw, ch, symbols, ws.exceptionActive, agents);
  }

  // ── Organic Trails ──
  if (lens !== 'off' && lens !== 'events') {
    renderTails(ctx, cw, ch, agents);
  }

  // ── Agents (always rendered; lens changes style only) ──
  const r = agentR(cw, ch);
  if (lens === 'off') {
    renderAgentsPlain(ctx, cw, ch, agents, r);
  } else if (lens === 'economy') {
    renderAgentsEconomy(ctx, cw, ch, agents, roles, r);
  } else if (lens === 'power') {
    renderAgentsPower(ctx, cw, ch, agents, roles, r);
  } else if (lens === 'events') {
    renderAgentsFaded(ctx, cw, ch, agents, r);
  } else if (lens === 'archetype') {
    renderAgentsArchetype(ctx, cw, ch, agents, roles, r);
  } else {
    // groups / field
    renderAgentsGroups(ctx, cw, ch, agents, roles, r);
  }

  // ── Pings (always) ──
  renderPings(ctx, cw, ch, pings);
}

// ── Trails (History) ──────────────────────────────────────────────────────────
function renderTails(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[],
): void {
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const a of agents) {
    if (!a.trailX || a.trailX[0] === 0) continue;

    ctx.beginPath();
    let first = true;
    for (let i = 0; i < a.trailX.length; i++) {
      const idx = (a.trailIdx + i) % a.trailX.length;
      const tx = a.trailX[idx];
      const ty = a.trailY[idx];
      if (tx === 0 && ty === 0) continue;

      const px = cx(tx, cw);
      const py = cy(ty, ch);

      if (first) {
        ctx.moveTo(px, py);
        first = false;
      } else {
        ctx.lineTo(px, py);
      }
    }
    
    ctx.strokeStyle = GROUP_COLORS[a.groupId % GROUP_COLORS.length];
    ctx.globalAlpha = 0.2;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ── Agents: Groups ────────────────────────────────────────────────────────────
// Draw circle with a direction "nose" line
function _drawAgent(ctx: CanvasRenderingContext2D, ax: number, ay: number, vx: number, vy: number, r: number, color: string, alpha: number) {
  const spd = Math.sqrt(vx * vx + vy * vy);
  const nx = spd > 0.0001 ? vx / spd : 1;
  const ny = spd > 0.0001 ? vy / spd : 0;

  ctx.globalAlpha = alpha;

  // Circle body
  ctx.beginPath();
  ctx.arc(ax, ay, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Nose line
  ctx.beginPath();
  ctx.moveTo(ax + nx * r, ay + ny * r);
  ctx.lineTo(ax + nx * (r + r * 1.3), ay + ny * (r + r * 1.3));
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, r * 0.5);
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.globalAlpha = 1;
}

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
    _drawAgent(ctx, ax, ay, a.vx, a.vy, ar, col, 0.80);

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
    const fillColor = a.fear > 0.4 ? `rgb(${fearR},${fearG},60)` : color;
    _drawAgent(ctx, ax, ay, a.vx, a.vy, r, fillColor, 0.80);

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
    _drawAgent(ctx, ax, ay, a.vx, a.vy, r, color, 0.35 + a.wealth * 0.55);

    _drawRoleIndicator(ctx, ax, ay, r, color, role);
  }
}

// ── Agents: Faded (Events lens) ───────────────────────────────────────────────
function renderAgentsFaded(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], r: number,
): void {
  for (const a of agents) {
    const color = GROUP_COLORS[a.groupId % GROUP_COLORS.length];
    _drawAgent(ctx, cx(a.x, cw), cy(a.y, ch), a.vx, a.vy, r * 0.7, color, 0.25);
  }
}

// ── Agents: Plain (Off lens) ────────────────────────────────────────────────
function renderAgentsPlain(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], r: number,
): void {
  for (const a of agents) {
    const color = GROUP_COLORS[a.groupId % GROUP_COLORS.length];
    _drawAgent(ctx, cx(a.x, cw), cy(a.y, ch), a.vx, a.vy, r, color, 0.80);
  }
}

// ── Agents: Archetype lens — color by psychological state ─────────────────────
function renderAgentsArchetype(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  agents: StudyAgent[], roles: AgentRole[], r: number,
): void {
  for (let i = 0; i < agents.length; i++) {
    const a    = agents[i];
    const ax   = cx(a.x, cw), ay = cy(a.y, ch);
    const col  = archetypeColor(a);
    const role = roles[i] ?? 'normal';
    const ar   = r * (0.72 + a.status * 0.55);

    // Aura for rebels/leaders
    if (role === 'rebel') {
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
function _countAgentsIn(agents: StudyAgent[], x: number, y: number, r: number): number {
  let n = 0;
  for (const a of agents) {
    const d2 = (a.x - x) ** 2 + (a.y - y) ** 2;
    if (d2 < r * r) n++;
  }
  return n;
}

function renderSymbols(
  ctx: CanvasRenderingContext2D, cw: number, ch: number,
  symbols: StudySymbols, exception: boolean,
  agents: StudyAgent[],
): void {
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
    const inRange = _countAgentsIn(agents, ritual.x, ritual.y, ritual.radius);
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

    const inT = _countAgentsIn(agents, tabu.x, tabu.y, tabu.radius);
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
    const inRange = _countAgentsIn(agents, totem.x, totem.y, totem.radius);
    _labelSymbol(ctx, tcx, tcy - tr - 20, tlbl[totem.kind] || totem.kind, col);
    _labelSymbol(ctx, tcx, tcy - tr - 11, tact[totem.kind] || '', col);
    _labelSymbol(ctx, tcx, tcy - tr - 2, `${inRange} agents`, col);
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