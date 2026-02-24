// Sociogenesis Overlay — Minimal, readable, reactive
// Philosophy: if you can't understand it in 2 seconds, it's noise.

import type { SociogenesisState, Totem, Taboo, Ritual, SocioLens } from './sociogenesisTypes';
import { MEME_COLORS } from './sociogenesisTypes';
import type { MicroState } from '../micro/microState';
import type { EconomyState, EconomyMetrics } from '../economy/economyTypes';

// ──── Colors ────
const TOTEM_COLORS: Record<string, string> = {
  BOND: '#5ac8fa',
  RIFT: '#ff6b6b',
  ORACLE: '#c084fc',
  ARCHIVE: '#94a3b8',
};

const TABOO_COLORS: Record<string, string> = {
  NO_ENTER: '#ef4444',
  NO_MIX: '#f97316',
};

// ──── Emergence Pings ────
export interface EmergencePing {
  x: number;   // normalized -1..1
  y: number;   // normalized -1..1
  bornAt: number;
  color: string;
  label: string;
  duration: number; // seconds to live
}

const MAX_PINGS = 12;
const pings: EmergencePing[] = [];

export function addEmergencePing(
  x: number, y: number, label: string, color: string, bornAt: number, duration = 4,
) {
  pings.push({ x, y, bornAt, color, label, duration });
  if (pings.length > MAX_PINGS) pings.shift();
}

export function clearPings() { pings.length = 0; }

// ──── Chronicle Feed (on-canvas) ────
export interface ChronicleLine {
  time: number;
  text: string;
  color: string;
}

const MAX_FEED = 6;
const feed: ChronicleLine[] = [];

export function pushChronicle(time: number, text: string, color = '#ffffff') {
  feed.unshift({ time, text, color });
  if (feed.length > MAX_FEED) feed.pop();
}

export function clearChronicle() { feed.length = 0; }

// ──── Coordinate helpers ────
function toScreen(nx: number, ny: number, w: number, h: number): [number, number] {
  return [(nx + 1) * 0.5 * w, (-ny + 1) * 0.5 * h];
}

function radiusPx(r: number, w: number, h: number): number {
  return r * 0.5 * Math.min(w, h);
}

// ──── Main render ────
export function renderSociogenesisOverlay(
  ctx: CanvasRenderingContext2D,
  state: SociogenesisState,
  width: number,
  height: number,
  elapsedSec: number,
  micro?: MicroState,
  lens: SocioLens = 'off',
) {
  if (!state.overlay.show) return;
  ctx.save();

  // 1. Culture lens: meme colors on particles + prestige halos
  if (lens === 'culture' && micro) {
    renderCultureLens(ctx, state, micro, width, height, elapsedSec);
  }

  // 2. Taboo zones — only show filled zone in law lens; always show border
  if (state.overlay.showNorms) {
    for (const taboo of state.taboos) {
      drawTaboo(ctx, taboo, state, width, height, lens === 'law');
    }
  }

  // 3. Totems — always show dots; show radius ring in culture/ritual/law
  const showRings = lens === 'ritual' || lens === 'culture' || lens === 'law' || lens === 'off';
  for (const totem of state.totems) {
    drawTotem(ctx, totem, state, width, height, elapsedSec, showRings);
  }

  // 4. Active rituals — only show in ritual lens or always for active ones
  for (const ritual of state.rituals) {
    drawRitual(ctx, ritual, state, width, height, elapsedSec);
  }

  // 5. Emergence pings — show in events lens or always
  if (lens === 'events' || lens === 'culture' || lens === 'off') {
    drawPings(ctx, width, height, elapsedSec);
  }

  // 6. Chronicle feed — bottom-left live ticker (always)
  drawChronicleFeed(ctx, width, height, elapsedSec);

  ctx.restore();
}

// ──── Culture Lens: meme colors, prestige halos, connection lines ────
function renderCultureLens(
  ctx: CanvasRenderingContext2D,
  state: SociogenesisState,
  micro: MicroState,
  w: number,
  h: number,
  t: number,
) {
  const culture = state.culture;
  const cfg = state.cultureConfig;
  const count = micro.count;
  if (count === 0) return;

  ctx.save();

  // 1. Batch-draw meme accent rings per meme (one beginPath per meme)
  for (let m = 0; m < cfg.memeCount; m++) {
    const color = MEME_COLORS[m % MEME_COLORS.length];
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.60;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      if ((culture.memeId[i] % cfg.memeCount) !== m) continue;
      const sx = (micro.x[i] + 1) * 0.5 * w;
      const sy = (-micro.y[i] + 1) * 0.5 * h;
      ctx.moveTo(sx + 2, sy);
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  // 2. Prestige halos (top 10 by prestige — reduced from 15)
  const haloList: Array<{ i: number; p: number }> = [];
  for (let i = 0; i < count; i++) {
    if (culture.prestige[i] > 0.30) {          // raised threshold: fewer halos
      haloList.push({ i, p: culture.prestige[i] });
    }
  }
  haloList.sort((a, b) => b.p - a.p);

  for (const { i, p } of haloList.slice(0, 10)) {
    const sx = (micro.x[i] + 1) * 0.5 * w;
    const sy = (-micro.y[i] + 1) * 0.5 * h;
    const mColor = MEME_COLORS[culture.memeId[i] % MEME_COLORS.length];
    const haloR = 6 + p * 14;

    const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, haloR);
    grd.addColorStop(0, mColor);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.globalAlpha = 0.12 + p * 0.28;
    ctx.beginPath();
    ctx.arc(sx, sy, haloR, 0, Math.PI * 2);
    ctx.fill();

    // Bright ring for top leaders
    if (p > 0.55) {
      ctx.beginPath();
      ctx.arc(sx, sy, 4 + p * 4, 0, Math.PI * 2);
      ctx.strokeStyle = mColor;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
    }
  }

  // 3. Connection lines: top 3 leaders → nearby same-meme followers (max 5 each)
  // Reduced from top-5/10 to top-3/5 to cut O(n×leaders) cost at 60fps
  const connectPx = 0.22 * 0.5 * Math.min(w, h);
  const connectPx2 = connectPx * connectPx;

  ctx.lineWidth = 0.6;
  ctx.setLineDash([2, 5]);

  for (const { i, p } of haloList.slice(0, 3)) {
    if (p < 0.50) break;
    const lx = (micro.x[i] + 1) * 0.5 * w;
    const ly = (-micro.y[i] + 1) * 0.5 * h;
    const myMeme = culture.memeId[i];
    const lineColor = MEME_COLORS[myMeme % MEME_COLORS.length];

    ctx.strokeStyle = lineColor;
    ctx.globalAlpha = 0.10 + p * 0.08;

    // Step through particles sparsely to avoid full O(n) scan per leader
    const step = Math.max(1, Math.floor(count / 80)); // sample ~80 candidates
    let drawn = 0;
    for (let j = 0; j < count && drawn < 5; j += step) {
      if (j === i || culture.memeId[j] !== myMeme) continue;
      const sx = (micro.x[j] + 1) * 0.5 * w;
      const sy = (-micro.y[j] + 1) * 0.5 * h;
      const dx = sx - lx;
      const dy = sy - ly;
      if (dx * dx + dy * dy > connectPx2) continue;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      drawn++;
    }
  }
  ctx.setLineDash([]);

  // 4. HUD: dominant meme stats (top-left)
  const memeCounts = new Array(cfg.memeCount).fill(0);
  for (let i = 0; i < count; i++) memeCounts[culture.memeId[i] % cfg.memeCount]++;
  let domMeme = 0;
  for (let m = 1; m < cfg.memeCount; m++) {
    if (memeCounts[m] > memeCounts[domMeme]) domMeme = m;
  }
  const domPct = count > 0 ? memeCounts[domMeme] / count : 0;
  const domColor = MEME_COLORS[domMeme % MEME_COLORS.length];
  const topLeaderCount = haloList.filter(x => x.p > 0.50).length;

  ctx.globalAlpha = 0.85;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000000';
  ctx.globalAlpha = 0.35;
  ctx.fillRect(12, 12, 180, 38);
  ctx.globalAlpha = 0.90;
  ctx.fillStyle = domColor;
  ctx.fillText(`Meme #${domMeme} dominant: ${(domPct * 100).toFixed(0)}%`, 18, 18);
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.55;
  ctx.fillText(`Leaders: ${topLeaderCount}  |  ${cfg.memeCount} memes active`, 18, 32);

  ctx.restore();
}

// ──── Totem: glowing dot + soft radius ────
function drawTotem(
  ctx: CanvasRenderingContext2D,
  totem: Totem,
  state: SociogenesisState,
  w: number, h: number,
  t: number,
  showRing: boolean = true,
) {
  const [sx, sy] = toScreen(totem.pos.x, totem.pos.y, w, h);
  const sr = radiusPx(totem.radius, w, h);
  const color = TOTEM_COLORS[totem.kind] || '#ffffff';
  const selected = state.selected?.type === 'totem' && state.selected.id === totem.id;

  if (showRing) {
    // Radius zone — soft circle
    const breath = 1 + 0.04 * Math.sin(t * 1.5 + totem.bornAt);
    ctx.beginPath();
    ctx.arc(sx, sy, sr * breath, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = selected ? 1.5 : 0.8;
    ctx.globalAlpha = selected ? 0.35 : 0.12;
    ctx.stroke();

    // Very subtle fill
    ctx.globalAlpha = 0.025;
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Core glow
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(sx, sy, 10, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.5;
  ctx.fill();

  // Center dot
  ctx.beginPath();
  ctx.arc(sx, sy, selected ? 4.5 : 3.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.fill();

  // Emergent sparkle: 3 small orbiting dots
  if (totem.emergent) {
    const phase = (t * 0.8 + totem.bornAt) % (Math.PI * 2);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = color;
    for (let i = 0; i < 3; i++) {
      const a = phase + (i / 3) * Math.PI * 2;
      const ox = sx + Math.cos(a) * (sr * 0.4);
      const oy = sy + Math.sin(a) * (sr * 0.4);
      ctx.beginPath();
      ctx.arc(ox, oy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Label: short name, only when selected
  if (selected) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = color;
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(totem.name, sx, sy + 8);
  }
}

// ──── Taboo: dashed ring, danger tint ────
function drawTaboo(
  ctx: CanvasRenderingContext2D,
  taboo: Taboo,
  state: SociogenesisState,
  w: number, h: number,
  showFill: boolean = false,
) {
  const [sx, sy] = toScreen(taboo.pos.x, taboo.pos.y, w, h);
  const sr = radiusPx(taboo.radius, w, h);
  const color = TABOO_COLORS[taboo.kind] || '#ef4444';
  const selected = state.selected?.type === 'taboo' && state.selected.id === taboo.id;

  // Dashed perimeter
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = color;
  ctx.lineWidth = selected ? 1.5 : 0.8;
  ctx.globalAlpha = selected ? 0.5 : 0.2;
  ctx.stroke();
  ctx.setLineDash([]);

  // Danger tint (only in law lens or when selected)
  if (showFill || selected) {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.04 + taboo.intensity * 0.03;
    ctx.fill();
  }

  // Small X at center
  ctx.globalAlpha = selected ? 0.6 : 0.25;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  const s = 4;
  ctx.beginPath();
  ctx.moveTo(sx - s, sy - s); ctx.lineTo(sx + s, sy + s);
  ctx.moveTo(sx + s, sy - s); ctx.lineTo(sx - s, sy + s);
  ctx.stroke();
}

// ──── Ritual: breathing ring around its totem ────
function drawRitual(
  ctx: CanvasRenderingContext2D,
  ritual: Ritual,
  state: SociogenesisState,
  w: number, h: number,
  t: number,
) {
  const totem = state.totems.find(tt => tt.id === ritual.totemId);
  if (!totem) return;

  const [sx, sy] = toScreen(totem.pos.x, totem.pos.y, w, h);
  const sr = radiusPx(totem.radius, w, h);
  const color = TOTEM_COLORS[totem.kind] || '#ffffff';

  const phase = ((t - ritual.bornAt) % ritual.periodSec) / ritual.periodSec;
  const isActive = phase < ritual.dutyCycle;

  if (!isActive) {
    // Dormant: thin dashed ring
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 1.3, 0, Math.PI * 2);
    ctx.setLineDash([2, 6]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.06;
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  // Active: breathing expanding ring
  const activePhase = phase / ritual.dutyCycle; // 0..1 within active window
  const ringRadius = sr * (1.1 + 0.25 * Math.sin(activePhase * Math.PI * 2));

  ctx.beginPath();
  ctx.arc(sx, sy, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.18 + 0.12 * Math.sin(activePhase * Math.PI);
  ctx.stroke();

  // Second ring (offset phase) for depth
  const ring2 = sr * (1.0 + 0.2 * Math.cos(activePhase * Math.PI * 2));
  ctx.beginPath();
  ctx.arc(sx, sy, ring2, 0, Math.PI * 2);
  ctx.lineWidth = 0.7;
  ctx.globalAlpha = 0.08;
  ctx.stroke();

  // Ritual kind hint via motion style
  if (ritual.kind === 'PROCESSION') {
    // Single orbiting dot
    const angle = activePhase * Math.PI * 4;
    const dotX = sx + Math.cos(angle) * ringRadius * 0.7;
    const dotY = sy + Math.sin(angle) * ringRadius * 0.7;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.fill();
  } else if (ritual.kind === 'GATHER') {
    // 4 inward arrows (simple lines)
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + t * 0.3;
      const fromR = ringRadius * 0.95;
      const toR = sr * 0.4;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * fromR, sy + Math.sin(a) * fromR);
      ctx.lineTo(sx + Math.cos(a) * toR, sy + Math.sin(a) * toR);
      ctx.stroke();
    }
  }
}

// ──── Emergence Pings ────
function drawPings(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
) {
  // Remove expired
  for (let i = pings.length - 1; i >= 0; i--) {
    if (t - pings[i].bornAt > pings[i].duration) pings.splice(i, 1);
  }

  for (const ping of pings) {
    const age = t - ping.bornAt;
    const progress = age / ping.duration; // 0..1
    const [sx, sy] = toScreen(ping.x, ping.y, w, h);

    // Expanding ring
    const maxR = 35 + progress * 25;
    const alpha = (1 - progress) * 0.5;

    ctx.beginPath();
    ctx.arc(sx, sy, maxR * progress, 0, Math.PI * 2);
    ctx.strokeStyle = ping.color;
    ctx.lineWidth = 1.5 * (1 - progress) + 0.3;
    ctx.globalAlpha = alpha;
    ctx.stroke();

    // Second ring (slightly delayed)
    if (progress > 0.15) {
      const p2 = Math.max(0, progress - 0.15);
      ctx.beginPath();
      ctx.arc(sx, sy, maxR * p2, 0, Math.PI * 2);
      ctx.lineWidth = 0.8 * (1 - p2);
      ctx.globalAlpha = alpha * 0.5;
      ctx.stroke();
    }

    // Label (fades out faster)
    if (progress < 0.6) {
      const labelAlpha = (1 - progress / 0.6) * 0.7;
      ctx.globalAlpha = labelAlpha;
      ctx.fillStyle = ping.color;
      ctx.font = '9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      // Slight float-up
      const yOff = -20 - progress * 12;
      ctx.fillText(ping.label, sx, sy + yOff);
    }
  }
}

// ──── Chronicle Feed (bottom-left) ────
function drawChronicleFeed(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
) {
  if (feed.length === 0) return;

  const x0 = 16;
  const y0 = h - 20;
  const lineH = 16;

  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';

  for (let i = 0; i < Math.min(feed.length, MAX_FEED); i++) {
    const entry = feed[i];
    const age = t - entry.time;
    // Fade: full opacity for 8s, then fade over 20s
    const fadeStart = 8;
    const fadeEnd = 28;
    let alpha: number;
    if (age < fadeStart) {
      alpha = 0.75;
    } else if (age < fadeEnd) {
      alpha = 0.75 * (1 - (age - fadeStart) / (fadeEnd - fadeStart));
    } else {
      alpha = 0;
      continue;
    }

    // New entries flash brighter
    if (age < 1.0) {
      alpha = 0.75 + 0.25 * (1 - age);
    }

    const y = y0 - i * lineH;

    // Subtle text shadow
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = '#000000';
    ctx.fillText(entry.text, x0 + 1, y + 1);

    // Text
    ctx.globalAlpha = alpha;
    ctx.fillStyle = entry.color;
    ctx.fillText(entry.text, x0, y);
  }
}

// ──── Tool cursor preview ────
export function renderSociogenesisCursor(
  ctx: CanvasRenderingContext2D,
  tool: string,
  cursorX: number,
  cursorY: number,
  width: number,
  height: number,
  subKind?: string,
) {
  if (tool === 'SELECT' || cursorX < 0 || cursorY < 0) return;
  ctx.save();

  const r = 35;

  if (tool === 'TOTEM') {
    const color = TOTEM_COLORS[subKind || 'BOND'] || '#5ac8fa';

    // Ring
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.fill();

    // Label
    ctx.globalAlpha = 0.4;
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(subKind || 'BOND', cursorX, cursorY + 10);
  } else if (tool === 'TABOO') {
    const color = TABOO_COLORS[subKind || 'NO_ENTER'] || '#ef4444';

    ctx.beginPath();
    ctx.arc(cursorX, cursorY, r, 0, Math.PI * 2);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.stroke();
    ctx.setLineDash([]);

    // X
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    const s = 5;
    ctx.beginPath();
    ctx.moveTo(cursorX - s, cursorY - s); ctx.lineTo(cursorX + s, cursorY + s);
    ctx.moveTo(cursorX + s, cursorY - s); ctx.lineTo(cursorX - s, cursorY + s);
    ctx.stroke();

    ctx.globalAlpha = 0.4;
    ctx.fillStyle = color;
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText((subKind || 'NO_ENTER').replace('_', ' '), cursorX, cursorY + 10);
  } else if (tool === 'RITUAL') {
    const color = subKind === 'PROCESSION' ? '#c084fc' : subKind === 'OFFERING' ? '#fbbf24' : '#34d399';

    ctx.beginPath();
    ctx.arc(cursorX, cursorY, r * 1.1, 0, Math.PI * 2);
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.25;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.4;
    ctx.fillStyle = color;
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(subKind || 'GATHER', cursorX, cursorY);

    ctx.globalAlpha = 0.25;
    ctx.font = '8px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('click a totem', cursorX, cursorY + 12);
  }

  ctx.restore();
}

// ──── Tribe detection (unchanged logic, fixed Math.random) ────
import type { Tribe } from './sociogenesisTypes';
import { genId } from './sociogenesisTypes';

export function detectTribes(
  state: SociogenesisState,
  micro: MicroState,
  elapsedSec: number,
): void {
  if (state.totems.length === 0) {
    state.tribes = [];
    return;
  }

  const totemPopulations = new Map<string, Map<number, number>>();

  for (const totem of state.totems) {
    const pop = new Map<number, number>();
    const r2 = totem.radius * totem.radius;

    for (let i = 0; i < micro.count; i++) {
      const dx = micro.x[i] - totem.pos.x;
      const dy = micro.y[i] - totem.pos.y;
      if (dx * dx + dy * dy < r2) {
        const t = micro.type[i];
        pop.set(t, (pop.get(t) || 0) + 1);
      }
    }
    totemPopulations.set(totem.id, pop);
  }

  const typeToTotems = new Map<number, string[]>();

  for (const totem of state.totems) {
    const pop = totemPopulations.get(totem.id);
    if (!pop || pop.size === 0) continue;

    let maxCount = 0;
    let dominantType = -1;
    for (const [type, count] of pop) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    if (dominantType >= 0 && maxCount >= 3) {
      if (!typeToTotems.has(dominantType)) {
        typeToTotems.set(dominantType, []);
      }
      typeToTotems.get(dominantType)!.push(totem.id);
    }
  }

  const newTribes: Tribe[] = [];

  for (const [typeId, totemIds] of typeToTotems) {
    const existing = state.tribes.find(t => t.typeId === typeId);

    if (existing) {
      existing.totems = totemIds;
      newTribes.push(existing);
    } else if (totemIds.length >= 1) {
      // Deterministic ethos from typeId (no Math.random!)
      const seed = typeId * 1000 + Math.floor(elapsedSec * 0.1);
      newTribes.push({
        id: genId(state, 'tribe'),
        typeId,
        totems: totemIds,
        ethos: {
          cohesionBias: Math.sin(seed * 0.0073) * 0.2,
          tensionBias: Math.cos(seed * 0.0057) * 0.2,
        },
        bornAt: elapsedSec,
      });
    }
  }

  state.tribes = newTribes;
}

// ──── Economy Lens: resource heatmap ─────────────────────────────────────────
// Green = rich, yellow = moderate, dark = depleted
export function renderEconomyLens(
  ctx: CanvasRenderingContext2D,
  eState: EconomyState,
  _metrics: EconomyMetrics | null,
  w: number,
  h: number,
): void {
  const { R, gridW, gridH } = eState;
  const cellW = w / gridW;
  const cellH = h / gridH;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const val = R[y * gridW + x];
      if (val < 0.05) continue;

      // Color: dark → green → yellow → white
      let r = 0, g = 0, b = 0;
      if (val < 0.5) {
        const t = val / 0.5;
        r = Math.round(20  * (1 - t) + 80  * t);
        g = Math.round(60  * (1 - t) + 200 * t);
        b = Math.round(20  * (1 - t) + 40  * t);
      } else {
        const t = (val - 0.5) / 0.5;
        r = Math.round(80  * (1 - t) + 255 * t);
        g = Math.round(200 * (1 - t) + 255 * t);
        b = Math.round(40  * (1 - t) + 100 * t);
      }

      const alpha = val * 0.45;
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fillRect(
        Math.floor(x * cellW),
        Math.floor(y * cellH),
        Math.ceil(cellW) + 1,
        Math.ceil(cellH) + 1,
      );
    }
  }

  // Label
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#ffffff';
  ctx.font = '9px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('◼ Resource Field', w - 10, 10);

  ctx.restore();
}

// ──── Territory Lens: claim ownership map ────────────────────────────────────
// Each owned cell colored by its owner's meme color
export function renderTerritoryLens(
  ctx: CanvasRenderingContext2D,
  eState: EconomyState,
  w: number,
  h: number,
): void {
  const { claimOwner, claimStrength, gridW, gridH } = eState;
  const cellW = w / gridW;
  const cellH = h / gridH;

  ctx.save();

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const i = y * gridW + x;
      const owner = claimOwner[i];
      if (owner < 0) continue;
      const str = claimStrength[i];
      if (str < 0.04) continue;

      const color = MEME_COLORS[owner % MEME_COLORS.length];
      ctx.fillStyle = color;
      ctx.globalAlpha = str * 0.35;
      ctx.fillRect(
        Math.floor(x * cellW),
        Math.floor(y * cellH),
        Math.ceil(cellW) + 1,
        Math.ceil(cellH) + 1,
      );
    }
  }

  // Border overlay for strong claims
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const i = y * gridW + x;
      if (claimStrength[i] < 0.6) continue;
      const right  = x < gridW - 1 ? claimOwner[(y) * gridW + x + 1] : -1;
      const bottom = y < gridH - 1 ? claimOwner[(y + 1) * gridW + x] : -1;
      const owner  = claimOwner[i];
      if (owner < 0) continue;
      if ((right >= 0 && right !== owner) || (bottom >= 0 && bottom !== owner)) {
        ctx.fillStyle = MEME_COLORS[owner % MEME_COLORS.length];
        ctx.globalAlpha = 0.6;
        ctx.fillRect(Math.floor(x * cellW), Math.floor(y * cellH), Math.ceil(cellW), Math.ceil(cellH));
      }
    }
  }

  // Label
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#ffffff';
  ctx.font = '9px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('◼ Territory Claims', w - 10, 10);

  ctx.restore();
}