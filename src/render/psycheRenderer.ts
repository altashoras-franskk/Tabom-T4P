// ── Psyche Renderer — 2D Canvas ───────────────────────────────────────────────
import {
  PsycheState, PsycheLens, REGION_CENTERS,
  TAG_NONE, RegionId,
} from '../sim/psyche/psycheTypes';
import { ARCHETYPES, ARCHETYPE_POSITIONS } from '../sim/psyche/archetypes';
import { sampleFlowField } from '../sim/psyche/flowField';

const MANDALA_FRAC = 0.43;
const BG_COLOR     = '#07050e';
const BG_R = 7, BG_G = 5, BG_B = 14;

// ── Soul color helper ─────────────────────────────────────────────────────────
// Converts HSL (h: 0-360, s/l: 0-1) to [r,g,b] 0-255
function hsl2rgb(h: number, s: number, l: number): [number,number,number] {
  const c = (1 - Math.abs(2*l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if      (h < 60)  { r=c; g=x; b=0; }
  else if (h < 120) { r=x; g=c; b=0; }
  else if (h < 180) { r=0; g=c; b=x; }
  else if (h < 240) { r=0; g=x; b=c; }
  else if (h < 300) { r=x; g=0; b=c; }
  else              { r=c; g=0; b=x; }
  return [Math.round((r+m)*255), Math.round((g+m)*255), Math.round((b+m)*255)];
}

// Blend state color with soul identity color.
// soulVis=0 → pure state color  |  soulVis=1 → pure soul color
// Returns 'rgba(r,g,b,a)' string.
function blendSoul(
  sr: number, sg: number, sb: number,
  alpha: number,
  soulH: number,
  soulVis: number,
): string {
  if (soulVis <= 0.005) return `rgba(${sr},${sg},${sb},${alpha})`;
  const [hr, hg, hb] = hsl2rgb(soulH, 0.70, 0.60);
  const t = Math.min(1, soulVis);
  const r = Math.round(sr * (1-t) + hr * t);
  const g = Math.round(sg * (1-t) + hg * t);
  const b = Math.round(sb * (1-t) + hb * t);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Camera / Viewport ─────────────────────────────────────────────────────────
export interface PsycheCamera {
  zoom: number;
  panX: number;
  panY: number;
}
export const DEFAULT_PSYCHE_CAMERA: PsycheCamera = { zoom: 1.0, panX: 0, panY: 0 };

// ── Render options object (optional, all have defaults) ───────────────────────
export interface PsycheRenderOpts {
  rastrosOn?:    boolean;   // default false
  campoOn?:      boolean;   // default false
  fieldOn?:      boolean;   // default false
  bondsOn?:      boolean;   // default true
  trailFade?:    number;    // 0.02–0.18, default 0.06
  trailOpacity?: number;    // 0..1, default 0.65
  trailWidth?:   number;    // 1..8, default 3  — controls tail length
  soulVis?:      number;    // 0 = pure state colors, 1 = full soul identity, default 0
  bondWidth?:    number;    // 0.3..4.0, default 1.0
  bondOpacity?:  number;    // 0..1, default 0.8
}

interface Ctx { cx: number; cy: number; R: number }

function project(ctx: Ctx, wx: number, wy: number): [number, number] {
  return [ctx.cx + wx * ctx.R, ctx.cy + wy * ctx.R];
}

// ── Color helpers ─────────────────────────────────────────────────────────────
function energyColor(charge: number, arousal: number, alpha: number): string {
  const h = 200 - charge * 160;
  const s = 50 + arousal * 50;
  const l = 35 + charge * 30;
  return `hsla(${h},${s}%,${l}%,${alpha})`;
}
function valenceColor(valence: number, alpha: number): string {
  if (valence >= 0) {
    return `hsla(120,${valence * 80}%,${30 + valence * 25}%,${alpha})`;
  } else {
    return `hsla(0,${-valence * 80}%,${30 + (-valence) * 25}%,${alpha})`;
  }
}
function coherenceColor(coherence: number, alpha: number): string {
  return `hsla(240,${30 + coherence * 40}%,${22 + coherence * 50}%,${alpha})`;
}

// ── Lacanian register colors ──────────────────────────────────────────────────
function lacanRegister(wx: number, wy: number): 'R' | 'S' | 'I' {
  const r = Math.sqrt(wx * wx + wy * wy);
  if (wy > 0.40 || r > 0.75) return 'R';
  if (wy < -0.35 || (Math.abs(wx) > 0.30 && wy < -0.10)) return 'S';
  return 'I';
}
function lacanColor(state: PsycheState, i: number, alpha: number): string {
  const reg = lacanRegister(state.x[i], state.y[i]);
  if (reg === 'R') return `rgba(220,40,50,${alpha})`;
  if (reg === 'S') return `rgba(50,100,230,${alpha})`;
  return             `rgba(240,190,30,${alpha * 0.9})`;
}

// ── Freudian DRIVE classification ─────────────────────────────────────────────
// Each quantum gets one of 4 pulsional states derived from its actual data,
// NOT just from spatial zone — so you can visually read the drives on screen.
//
//   EROS       = hot pink    — positive valence (vida, ligação, amor)
//   THANATOS   = deep indigo — negative valence (morte, dissolução, repetição)
//   REPRESSAO  = amber       — high inhibition  (superego bloqueando o impulso)
//   SUBLIMACAO = cyan-green  — high coherence   (energia pulsional transformada)
//
// Priority: REPRESSAO > SUBLIMACAO > EROS > THANATOS
// (repressão always wins because it's the superego actively suppressing)

export type FreudDrive = 'REPRESSAO' | 'SUBLIMACAO' | 'EROS' | 'THANATOS';

// RGB tuples — shared so the legend in drawFreudOverlay uses the same values
export const FREUD_DRIVE_RGB: Record<FreudDrive, [number,number,number]> = {
  EROS:       [255,  70, 155],  // hot pink
  THANATOS:   [ 80,  30, 200],  // deep indigo-violet
  REPRESSAO:  [230, 140,  20],  // warm amber
  SUBLIMACAO: [ 40, 215, 165],  // cyan-green
};

export function freudDriveOf(state: PsycheState, i: number): FreudDrive {
  if (state.inhibition[i] > 0.50) return 'REPRESSAO';
  if (state.coherence[i]  > 0.60) return 'SUBLIMACAO';
  if (state.valence[i]    >= 0)   return 'EROS';
  return 'THANATOS';
}

function freudColor(state: PsycheState, i: number, alpha: number): string {
  const drive   = freudDriveOf(state, i);
  const [r,g,b] = FREUD_DRIVE_RGB[drive];
  // brighten slightly for highly charged quanta so active particles pop
  const boost   = 0.75 + state.charge[i] * 0.50;
  return `rgba(${Math.min(255,Math.round(r*boost))},${Math.min(255,Math.round(g*boost))},${Math.min(255,Math.round(b*boost))},${alpha})`;
}

// ── Region colors ─────────────────────────────────────────────────────────────
const REGION_COLORS: Record<string, string> = {
  SELF_REGION:     '#f5c842',
  EGO:             '#3b82f6',
  PERSONA_REGION:  '#b0c4de',
  SHADOW_REGION:   '#7c3aed',
  COLLECTIVE:      '#06b6d4',
  ID:              '#ef4444',
  SUPEREGO:        '#9ca3af',
};
const REGION_GLOW_DEF: {
  key: string; rgb: [number,number,number]; r: number; baseA: number;
}[] = [
  { key: 'SELF_REGION',    rgb: [245, 200,  66], r: 0.18, baseA: 0.15 },
  { key: 'EGO',            rgb: [ 59, 130, 246], r: 0.30, baseA: 0.09 },
  { key: 'PERSONA_REGION', rgb: [176, 196, 222], r: 0.30, baseA: 0.07 },
  { key: 'SHADOW_REGION',  rgb: [124,  58, 237], r: 0.30, baseA: 0.09 },
  { key: 'COLLECTIVE',     rgb: [  6, 182, 212], r: 0.30, baseA: 0.09 },
  { key: 'ID',             rgb: [239,  68,  68], r: 0.26, baseA: 0.10 },
  { key: 'SUPEREGO',       rgb: [156, 163, 175], r: 0.27, baseA: 0.06 },
];

function regionForPos(wx: number, wy: number): string {
  const r = Math.sqrt(wx * wx + wy * wy);
  if (r < 0.14) return 'SELF_REGION';
  const dx_ego  = wx - 0.40, dy_ego  = wy + 0.30;
  const dx_per  = wx + 0.40, dy_per  = wy + 0.30;
  const dx_sha  = wx + 0.42, dy_sha  = wy - 0.35;
  const dx_col  = wx - 0.40, dy_col  = wy - 0.32;
  const dx_id   = wx       , dy_id   = wy - 0.58;
  const dx_sg   = wx       , dy_sg   = wy + 0.66;
  const dists: [string, number][] = [
    ['EGO',           dx_ego*dx_ego + dy_ego*dy_ego],
    ['PERSONA_REGION',dx_per*dx_per + dy_per*dy_per],
    ['SHADOW_REGION', dx_sha*dx_sha + dy_sha*dy_sha],
    ['COLLECTIVE',    dx_col*dx_col + dy_col*dy_col],
    ['ID',            dx_id*dx_id   + dy_id*dy_id],
    ['SUPEREGO',      dx_sg*dx_sg   + dy_sg*dy_sg],
  ];
  dists.sort((a, b) => a[1] - b[1]);
  return dists[0][0];
}

// ── Region overlays ───────────────────────────────────────────────────────────
function countByRegion(state: PsycheState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (let i = 0; i < state.count; i++) {
    const r = regionForPos(state.x[i], state.y[i]);
    counts[r] = (counts[r] || 0) + 1;
  }
  return counts;
}
function drawRegionOverlays(c: CanvasRenderingContext2D, ctx: Ctx, state: PsycheState, t: number): void {
  const counts  = countByRegion(state);
  const expected = state.count / REGION_GLOW_DEF.length;
  c.save();
  for (const def of REGION_GLOW_DEF) {
    const [rwx, rwy] = REGION_CENTERS[def.key as RegionId];
    const [sx, sy]   = project(ctx, rwx, rwy);
    const gradR      = ctx.R * def.r;
    const density    = (counts[def.key] || 0) / Math.max(1, expected);
    const alphaCore  = def.baseA * Math.min(1.8, 0.5 + 0.8 * density);
    const pulse = def.key === 'SELF_REGION'
      ? 1 + 0.15 * Math.sin(t * 0.9)
      : 1 + 0.05 * Math.sin(t * 0.7 + rwx * 2);
    const a0 = alphaCore * pulse;
    const [r, g, b] = def.rgb;
    const grad = c.createRadialGradient(sx, sy, 0, sx, sy, gradR);
    grad.addColorStop(0.00, `rgba(${r},${g},${b},${(a0).toFixed(3)})`);
    grad.addColorStop(0.30, `rgba(${r},${g},${b},${(a0 * 0.55).toFixed(3)})`);
    grad.addColorStop(0.65, `rgba(${r},${g},${b},${(a0 * 0.18).toFixed(3)})`);
    grad.addColorStop(1.00, `rgba(${r},${g},${b},0)`);
    c.beginPath(); c.arc(sx, sy, gradR, 0, Math.PI * 2);
    c.fillStyle = grad; c.fill();
  }
  c.restore();
}

// ── Topology geometry ─────────────────────────────────────────────────────────
function drawTopology(c: CanvasRenderingContext2D, ctx: Ctx, t: number): void {
  const { cx, cy, R } = ctx;
  c.save();
  c.beginPath(); c.arc(cx, cy, R * 0.95, 0, Math.PI * 2);
  c.strokeStyle = 'rgba(180,160,240,0.13)'; c.lineWidth = 1.5; c.stroke();
  const selfPulse = 1 + 0.08 * Math.sin(t * 0.9);
  c.beginPath(); c.arc(cx, cy, R * 0.13 * selfPulse, 0, Math.PI * 2);
  c.strokeStyle = 'rgba(245,200,66,0.28)'; c.lineWidth = 1; c.stroke();
  c.beginPath(); c.arc(cx, cy, R * 0.50, 0, Math.PI * 2);
  c.strokeStyle = 'rgba(150,130,200,0.08)'; c.lineWidth = 1; c.stroke();
  c.strokeStyle = 'rgba(150,130,200,0.07)'; c.lineWidth = 0.8;
  for (const [x1,y1,x2,y2] of [[-R*0.95,0,R*0.95,0],[0,-R*0.95,0,R*0.95]] as [number,number,number,number][]) {
    c.beginPath(); c.moveTo(cx+x1,cy+y1); c.lineTo(cx+x2,cy+y2); c.stroke();
  }
  const diag = R * 0.95 * 0.707;
  c.strokeStyle = 'rgba(150,130,200,0.045)';
  for (const [x1,y1,x2,y2] of [[-diag,-diag,diag,diag],[-diag,diag,diag,-diag]] as [number,number,number,number][]) {
    c.beginPath(); c.moveTo(cx+x1,cy+y1); c.lineTo(cx+x2,cy+y2); c.stroke();
  }
  const labels: [string,string,RegionId][] = [
    ['EGO','▽','EGO'],['PERSONA','◈','PERSONA_REGION'],['SOMBRA','◗','SHADOW_REGION'],
    ['COLETIVO','∿','COLLECTIVE'],['ID','⊛','ID'],['SUPEREGO','⊞','SUPEREGO'],
  ];
  const fs = Math.max(9, R * 0.034);
  c.textAlign='center'; c.textBaseline='middle';
  for (const [label, sigil, regionId] of labels) {
    const [rwx, rwy] = REGION_CENTERS[regionId as keyof typeof REGION_CENTERS];
    const [sx, sy]   = project(ctx, rwx, rwy);
    const col        = REGION_COLORS[regionId] ?? '#b0a0f0';
    c.font=`${fs+3}px sans-serif`; c.fillStyle=col+'55'; c.fillText(sigil,sx,sy-fs*0.9);
    c.font=`${fs}px monospace`;    c.fillStyle=col+'44'; c.fillText(label,sx,sy+fs*0.5);
  }
  const [sx,sy]=project(ctx,0,0);
  c.font=`${fs+4}px sans-serif`; c.fillStyle='rgba(245,200,66,0.65)'; c.fillText('✦',sx,sy-fs*0.85);
  c.font=`${fs+1}px monospace`;  c.fillStyle='rgba(245,200,66,0.55)'; c.fillText('SELF',sx,sy+fs*0.55);
  c.restore();
}

// ── Lacanian overlay (Borromean knot + RSI labels) ────────────────────────────
function drawLacanOverlay(c: CanvasRenderingContext2D, ctx: Ctx, t: number): void {
  const { cx, cy, R } = ctx;
  const rr = R * 0.52;
  const offset = R * 0.24;
  const centers: [number,number,string,string][] = [
    [cx,        cy - offset * 0.80, 'rgba(50,100,230,0.14)', 'S'],
    [cx - offset * 0.70, cy + offset * 0.40, 'rgba(240,190,30,0.13)', 'I'],
    [cx + offset * 0.70, cy + offset * 0.40, 'rgba(220,40,50,0.12)',  'R'],
  ];
  c.save();
  const fs = Math.max(9, R * 0.030);
  const lblFull: Record<string,string> = { S:'SYMBOLIQUE', I:'IMAGINAIRE', R:'RÉEL' };
  const lblCol:  Record<string,string> = { S:'#6080e0',    I:'#d4a800',    R:'#cc3030' };
  for (const [ox, oy, col, key] of centers) {
    const pulse = 1 + 0.04 * Math.sin(t * 0.6 + centers.indexOf(centers.find(c=>c[3]===key)!) * 2.1);
    c.globalAlpha = 0.60;
    c.strokeStyle  = lblCol[key] + '44';
    c.lineWidth    = 1.2 * pulse;
    c.beginPath(); c.arc(ox, oy, rr * pulse, 0, Math.PI * 2); c.stroke();
    const grd = c.createRadialGradient(ox,oy,0,ox,oy,rr);
    grd.addColorStop(0, col); grd.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
    c.globalAlpha = 0.40;
    c.fillStyle = grd; c.beginPath(); c.arc(ox,oy,rr,0,Math.PI*2); c.fill();
    c.globalAlpha = 0.72;
    c.font = `${fs}px monospace`; c.textAlign='center'; c.textBaseline='middle';
    c.fillStyle = lblCol[key]; c.fillText(lblFull[key], ox, oy + rr * 0.30);
    c.font = `bold ${fs+2}px monospace`;
    c.fillStyle = lblCol[key]+'cc'; c.fillText(key, ox, oy - rr * 0.10);
  }
  const [isx,isy] = [cx, cy + offset * 0.08];
  c.globalAlpha = 0.85;
  c.font = `${fs+1}px serif`; c.textAlign='center'; c.textBaseline='middle';
  c.fillStyle = 'rgba(255,230,120,0.90)'; c.fillText('◌ᵃ', isx, isy);
  c.globalAlpha = 1; c.restore();
}

// ── Freudian overlay: iceberg layers + agency labels + drive legend ────────────
function drawFreudOverlay(c: CanvasRenderingContext2D, ctx: Ctx, state: PsycheState, t: number): void {
  const { cx, cy, R } = ctx;
  c.save();

  // ── 1. Iceberg waterlines ────────────────────────────────────────────────────
  const yLine1 = cy - R * 0.26;   // conscious / preconscious
  const yLine2 = cy + R * 0.22;   // preconscious / unconscious
  const lineW  = R * 1.6;

  // Preconscious band tint
  c.globalAlpha = 0.20;
  const bandGrd = c.createLinearGradient(cx, yLine1, cx, yLine2);
  bandGrd.addColorStop(0, 'rgba(50,120,200,0.10)');
  bandGrd.addColorStop(1, 'rgba(50,120,200,0.00)');
  c.fillStyle = bandGrd;
  c.fillRect(cx - lineW/2, yLine1, lineW, yLine2 - yLine1);

  // Dashed waterlines
  c.globalAlpha = 0.35;
  c.strokeStyle = 'rgba(80,140,220,0.60)'; c.lineWidth = 1;
  c.setLineDash([8, 6]);
  c.beginPath(); c.moveTo(cx - lineW/2, yLine1); c.lineTo(cx + lineW/2, yLine1); c.stroke();
  c.strokeStyle = 'rgba(220,80,50,0.50)';
  c.beginPath(); c.moveTo(cx - lineW/2, yLine2); c.lineTo(cx + lineW/2, yLine2); c.stroke();
  c.setLineDash([]);

  const fs = Math.max(8, R * 0.028);

  // Layer labels (left side)
  c.textAlign = 'left'; c.textBaseline = 'middle';
  const lblX = cx - R * 0.88;
  const layerLabels: [number, string, string][] = [
    [yLine1 - R * 0.25, 'CONSCIENT',      'rgba(140,180,255,0.60)'],
    [yLine1 + (yLine2 - yLine1)/2, 'PRÉCONSCIENT', 'rgba(100,140,220,0.55)'],
    [yLine2 + R * 0.22, 'INCONSCIENT',   'rgba(220,80,50,0.55)'],
  ];
  c.font = `${fs}px monospace`;
  c.globalAlpha = 0.80;
  for (const [y, lbl, col] of layerLabels) {
    c.fillStyle = col; c.fillText(lbl, lblX, y);
  }

  // Agency names (right side, animated)
  const agencyLabels: [number, string, string][] = [
    [yLine1 - R * 0.46, 'SUR-MOI',  'rgba(180,180,200,0.65)'],
    [cy,                'MOI',       'rgba(60,150,220,0.70)'],
    [yLine2 + R * 0.40, 'ÇA',        'rgba(240,80,60,0.75)'],
  ];
  c.font = `bold ${fs+1}px monospace`; c.textAlign = 'right';
  const lblXR = cx + R * 0.88;
  for (const [y, lbl, col] of agencyLabels) {
    c.fillStyle = col; c.fillText(lbl, lblXR, y + 0.04*R*Math.sin(t*0.5));
  }

  // ── 2. Drive legend (bottom-left corner) ────────────────────────────────────
  // Count particles per drive for live percentages
  const driveCounts: Record<FreudDrive, number> = { EROS:0, THANATOS:0, REPRESSAO:0, SUBLIMACAO:0 };
  for (let i = 0; i < state.count; i++) driveCounts[freudDriveOf(state, i)]++;
  const total = Math.max(1, state.count);

  const legendItems: [FreudDrive, string, string][] = [
    ['EROS',       '♥ Eros',       'pulsão de vida'],
    ['THANATOS',   '☠ Thanatos',   'pulsão de morte'],
    ['REPRESSAO',  '⊘ Repressão',  'inibição do Ego'],
    ['SUBLIMACAO', '✦ Sublimação', 'energia transformada'],
  ];

  const legX    = cx - R * 0.93;
  const legYTop = cy + R * 0.55;
  const rowH    = Math.max(16, fs * 1.65);
  const dotR    = Math.max(4, fs * 0.45);
  const panW    = R * 0.72;
  const panH    = rowH * 4 + 10;

  // Panel background
  c.globalAlpha = 0.60;
  c.fillStyle = 'rgba(7,5,14,0.82)';
  c.beginPath(); c.roundRect(legX - 4, legYTop - 6, panW, panH, 5); c.fill();
  c.strokeStyle = 'rgba(120,100,180,0.30)'; c.lineWidth = 0.8;
  c.beginPath(); c.roundRect(legX - 4, legYTop - 6, panW, panH, 5); c.stroke();

  c.globalAlpha = 1;
  c.font = `${fs}px monospace`;

  legendItems.forEach(([drive, label, desc], idx) => {
    const [r,g,b] = FREUD_DRIVE_RGB[drive];
    const pct     = Math.round(driveCounts[drive] / total * 100);
    const y       = legYTop + idx * rowH + rowH * 0.5;
    const col     = `rgb(${r},${g},${b})`;

    // Colored dot with glow
    const dotGrad = c.createRadialGradient(legX + dotR, y, 0, legX + dotR, y, dotR * 2.5);
    dotGrad.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
    dotGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    c.fillStyle = dotGrad;
    c.beginPath(); c.arc(legX + dotR, y, dotR * 2.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = col;
    c.beginPath(); c.arc(legX + dotR, y, dotR, 0, Math.PI * 2); c.fill();

    // Label + pct
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillStyle = `rgba(${r},${g},${b},0.92)`;
    c.font = `${fs}px monospace`;
    c.fillText(label, legX + dotR * 3.5, y - fs * 0.28);

    // Subtitle
    c.fillStyle = `rgba(${r},${g},${b},0.50)`;
    c.font = `${Math.max(7, fs - 1)}px monospace`;
    c.fillText(desc, legX + dotR * 3.5, y + fs * 0.55);

    // Percentage (right-aligned)
    c.textAlign = 'right';
    c.font = `${fs}px monospace`;
    c.fillStyle = `rgba(${r},${g},${b},0.80)`;
    c.fillText(`${pct}%`, legX + panW - 8, y);
  });

  c.globalAlpha = 1; c.restore();
}

// ── Flow vectors ──────────────────────────────────────────────────────────────
function drawFlowVectors(c: CanvasRenderingContext2D, ctx: Ctx, state: PsycheState): void {
  const GRID = 17;
  const step = 1.82 / GRID;
  c.save(); c.lineCap = 'round';
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const wx = -0.91 + (gx + 0.5) * step;
      const wy = -0.91 + (gy + 0.5) * step;
      if (wx*wx + wy*wy > 0.80) continue;
      const [u, v] = sampleFlowField(state, wx, wy);
      const mag = Math.sqrt(u*u + v*v);
      if (mag < 0.004) continue;
      const norm = Math.min(1, mag * 3.5);
      const [sx, sy] = project(ctx, wx, wy);
      const arrowLen = ctx.R * 0.024 * norm;
      const nx = u/mag, ny = v/mag;
      const tailX = sx - nx*arrowLen*0.45, tailY = sy - ny*arrowLen*0.45;
      const tipX  = sx + nx*arrowLen*0.55, tipY  = sy + ny*arrowLen*0.55;
      const region = regionForPos(wx, wy);
      const col    = REGION_COLORS[region] ?? '#b0a0f0';
      const alpha  = 0.10 + norm * 0.18;
      c.globalAlpha = alpha;
      c.strokeStyle = col; c.lineWidth = 0.7 + norm * 0.5;
      c.beginPath(); c.moveTo(tailX,tailY); c.lineTo(tipX,tipY); c.stroke();
      const perpX = -ny*arrowLen*0.12, perpY = nx*arrowLen*0.12;
      const backX = tipX - nx*arrowLen*0.20, backY = tipY - ny*arrowLen*0.20;
      c.globalAlpha = alpha * 1.3; c.fillStyle = col;
      c.beginPath(); c.moveTo(tipX,tipY);
      c.lineTo(backX+perpX,backY+perpY); c.lineTo(backX-perpX,backY-perpY);
      c.closePath(); c.fill();
    }
  }
  c.globalAlpha = 1; c.restore();
}

// ── Archetype sigils ──────────────────────────────────────────────────────────
function drawArchetypeSigils(c: CanvasRenderingContext2D, ctx: Ctx, state: PsycheState): void {
  const tagCounts = new Int32Array(13);
  for (let i = 0; i < state.count; i++) tagCounts[state.tag[i]]++;
  const sorted: [number,number][] = [];
  for (let t = 1; t <= 12; t++) {
    if (tagCounts[t] > 0 && state.archetypeActive[t-1]) sorted.push([t, tagCounts[t]]);
  }
  sorted.sort((a,b)=>b[1]-a[1]);
  const top3 = sorted.slice(0,3);
  c.save(); c.textAlign='center'; c.textBaseline='middle';
  const R = ctx.R;
  c.font=`${Math.max(14,R*0.05)}px serif`;
  for (const [tag, cnt] of top3) {
    const arch = ARCHETYPES[tag-1];
    const apos = ARCHETYPE_POSITIONS[arch.id];
    const [sx,sy] = project(ctx, apos[0], apos[1]);
    const alpha = Math.min(1, 0.3 + cnt/state.count*8);
    const grad = c.createRadialGradient(sx,sy,0,sx,sy,R*0.12);
    grad.addColorStop(0, arch.color+'55'); grad.addColorStop(1, arch.color+'00');
    c.beginPath(); c.arc(sx,sy,R*0.12,0,Math.PI*2); c.fillStyle=grad; c.fill();
    c.fillStyle = arch.color+Math.round(alpha*255).toString(16).padStart(2,'0');
    c.fillText(arch.sigil, sx, sy);
    c.font=`${Math.max(7,R*0.022)}px monospace`; c.fillStyle=arch.color+'99';
    c.fillText(arch.id, sx, sy+R*0.07);
    c.font=`${Math.max(14,R*0.05)}px serif`;
  }
  c.restore();
}

// ── Events ────────────────────────────────────────────────────────────────────
function drawEvents(c: CanvasRenderingContext2D, ctx: Ctx, state: PsycheState, dt: number): void {
  c.save(); c.textAlign='center'; c.textBaseline='middle';
  const R = ctx.R;
  c.font=`${Math.max(9,R*0.030)}px monospace`;
  for (let i = state.events.length-1; i >= 0; i--) {
    const ev = state.events[i];
    ev.ttl -= dt;
    if (ev.ttl <= 0) { state.events.splice(i,1); continue; }
    const alpha = Math.min(1, ev.ttl/1.2);
    const [sx,sy] = project(ctx, ev.x, ev.y-(3.5-ev.ttl)*0.08);
    c.font=`${Math.max(9,R*0.030)}px monospace`;
    const tw = c.measureText(ev.text).width;
    c.globalAlpha = alpha*0.5;
    c.fillStyle = 'rgba(7,5,14,0.7)';
    c.beginPath(); c.roundRect(sx-tw/2-4,sy-8,tw+8,16,4); c.fill();
    c.globalAlpha = alpha;
    c.fillStyle = ev.color+Math.round(alpha*230).toString(16).padStart(2,'0');
    c.fillText(ev.text, sx, sy);
  }
  c.globalAlpha = 1; c.restore();
}

// ── Links / Bonds ─────────────────────────────────────────────────────────────
function drawLinks(
  c: CanvasRenderingContext2D, ctx: Ctx, state: PsycheState,
  prominent: boolean,
  bondWidth  = 1.0,
  bondOpacity = 0.8,
): void {
  if (state.linkCount === 0) return;
  c.save();
  c.lineCap  = 'round';
  c.lineJoin = 'round';
  for (let li = 0; li < state.linkCount; li++) {
    const a = state.linkA[li], b = state.linkB[li];
    if (a < 0 || b < 0 || a >= state.count || b >= state.count) continue;
    const life  = Math.min(1, state.linkTtl[li] / 2.5);
    const alpha = (prominent ? (0.18 + life * 0.75) : (0.12 + life * 0.60)) * bondOpacity;
    const lw    = (prominent ? (1.6 + life * 2.4) : (1.2 + life * 1.6)) * bondWidth;
    const [ax, ay] = project(ctx, state.x[a], state.y[a]);
    const [bx, by] = project(ctx, state.x[b], state.y[b]);
    const hexA = Math.round(Math.min(1, alpha) * 255).toString(16).padStart(2,'0');
    const colA = REGION_COLORS[regionForPos(state.x[a], state.y[a])] + hexA;
    const colB = REGION_COLORS[regionForPos(state.x[b], state.y[b])] + hexA;
    const grad = c.createLinearGradient(ax, ay, bx, by);
    grad.addColorStop(0, colA); grad.addColorStop(1, colB);
    c.lineWidth = lw; c.strokeStyle = grad;
    if (prominent) {
      const mx = (ax+bx)/2 - (by-ay)*0.15;
      const my = (ay+by)/2 + (bx-ax)*0.15;
      c.beginPath(); c.moveTo(ax,ay); c.quadraticCurveTo(mx,my,bx,by); c.stroke();
    } else {
      c.beginPath(); c.moveTo(ax,ay); c.lineTo(bx,by); c.stroke();
    }
  }
  c.restore();
}

// ── Quanta color ──────────────────────────────────────────────────────────────
function getQuantaColor(
  state: PsycheState, i: number, lens: PsycheLens,
  alpha = 0.85, soulVis = 0,
): string {
  const sh = state.soulHue[i];
  switch (lens) {
    case 'TOPOLOGY': {
      const col = REGION_COLORS[regionForPos(state.x[i], state.y[i])];
      if (!soulVis) return col + 'cc';
      const r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), b = parseInt(col.slice(5,7),16);
      return blendSoul(r,g,b,0.8,sh,soulVis);
    }
    case 'ENERGY': {
      const h2 = 200 - state.charge[i]*160, s2 = 50+state.arousal[i]*50, l2 = 35+state.charge[i]*30;
      if (!soulVis) return `hsla(${h2},${s2}%,${l2}%,${alpha})`;
      const [er,eg,eb] = hsl2rgb(h2,s2/100,l2/100);
      return blendSoul(er,eg,eb,alpha,sh,soulVis);
    }
    case 'VALENCE': {
      const v2 = state.valence[i];
      if (!soulVis) return valenceColor(v2, alpha);
      const [vr,vg,vb] = v2 >= 0
        ? hsl2rgb(120, v2*0.80, 0.30 + v2*0.25)
        : hsl2rgb(0,  -v2*0.80, 0.30 + (-v2)*0.25);
      return blendSoul(vr,vg,vb,alpha,sh,soulVis);
    }
    case 'COHERENCE': {
      if (!soulVis) return coherenceColor(state.coherence[i], alpha);
      const [cr,cg,cb] = hsl2rgb(240, (30+state.coherence[i]*40)/100, (22+state.coherence[i]*50)/100);
      return blendSoul(cr,cg,cb,alpha,sh,soulVis);
    }
    case 'LACAN': {
      const reg = lacanRegister(state.x[i], state.y[i]);
      const [lr,lg,lb] = reg==='R' ? [220,40,50] : reg==='S' ? [50,100,230] : [240,190,30];
      return blendSoul(lr,lg,lb,alpha,sh,soulVis);
    }
    case 'FREUD': {
      const drive = freudDriveOf(state, i);
      const [fr,fg,fb] = FREUD_DRIVE_RGB[drive];
      const boost = 0.75 + state.charge[i]*0.50;
      return blendSoul(
        Math.min(255,Math.round(fr*boost)), Math.min(255,Math.round(fg*boost)), Math.min(255,Math.round(fb*boost)),
        alpha, sh, soulVis,
      );
    }
    case 'ARCHETYPES': {
      const tag = state.tag[i];
      if (tag === TAG_NONE) return `rgba(120,110,160,${alpha*0.3})`;
      const col2 = ARCHETYPES[tag-1].color;
      if (!soulVis) return col2 + 'dd';
      const ar = parseInt(col2.slice(1,3),16), ag2 = parseInt(col2.slice(3,5),16), ab = parseInt(col2.slice(5,7),16);
      return blendSoul(ar,ag2,ab,alpha,sh,soulVis);
    }
    case 'EVENTS':
      return energyColor(state.charge[i], state.arousal[i], alpha*0.82);
    default:
      return `rgba(180,170,220,${alpha*0.82})`;
  }
}

// ── Quanta dots ───────────────────────────────────────────────────────────────
function drawQuanta(
  c: CanvasRenderingContext2D, ctx: Ctx,
  state: PsycheState, lens: PsycheLens, soulVis = 0,
): void {
  const R = ctx.R;
  const baseR = Math.max(2.0, R * 0.0055);

  for (let i = 0; i < state.count; i++) {
    const [sx,sy] = project(ctx, state.x[i], state.y[i]);
    const color   = getQuantaColor(state, i, lens, 0.85, soulVis);
    let size = baseR;
    if (lens === 'ENERGY')    size = baseR * (0.7 + state.arousal[i] * 0.9);
    if (lens === 'COHERENCE') size = baseR * (0.6 + state.coherence[i] * 0.8);
    if ((lens === 'ARCHETYPES' || lens === 'LACAN' || lens === 'FREUD') && state.tag[i] !== TAG_NONE) size = baseR * 1.5;

    // ── Freud: pulsional halo ────────────────────────────────────────────────
    if (lens === 'FREUD') {
      const drive = freudDriveOf(state, i);
      const [r,g,b] = FREUD_DRIVE_RGB[drive];
      const haloMult = 2.2 + state.charge[i] * 1.8 + state.arousal[i] * 1.0;
      const haloR = size * haloMult;
      const halo = c.createRadialGradient(sx,sy, size*0.4, sx,sy, haloR);
      halo.addColorStop(0, `rgba(${r},${g},${b},0.28)`);
      halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
      c.fillStyle = halo;
      c.beginPath(); c.arc(sx, sy, haloR, 0, Math.PI*2); c.fill();
    }

    c.fillStyle = color;
    c.beginPath(); c.arc(sx, sy, size, 0, Math.PI*2); c.fill();

    if (lens === 'ARCHETYPES' && state.tag[i] !== TAG_NONE) {
      const arch = ARCHETYPES[state.tag[i]-1];
      const haloGrad = c.createRadialGradient(sx,sy,size*0.5,sx,sy,size*3.5);
      haloGrad.addColorStop(0, arch.color+'44'); haloGrad.addColorStop(1, arch.color+'00');
      c.beginPath(); c.arc(sx,sy,size*3.5,0,Math.PI*2); c.fillStyle=haloGrad; c.fill();
    }

    // ── Soul ring: tiny outer ring in soul color when soulVis > 0.15 ────────
    // Makes each individual quantum recognizable at a glance without overwhelming
    // the state-based color. Scales with soulVis intensity.
    if (soulVis > 0.15) {
      const [sr,sg,sb] = hsl2rgb(state.soulHue[i], 0.80, 0.65);
      const ringAlpha  = Math.min(0.90, soulVis * 0.85);
      const ringR      = size + Math.max(0.5, size * 0.4);
      c.strokeStyle = `rgba(${sr},${sg},${sb},${ringAlpha})`;
      c.lineWidth   = Math.max(0.5, size * 0.35);
      c.beginPath(); c.arc(sx, sy, ringR, 0, Math.PI*2); c.stroke();
    }
  }
}

// ── RASTROS — Offscreen fade-canvas trail system ──────────────────────────────
let _trailCvs: HTMLCanvasElement | null = null;

export function clearPsycheTrails(): void {
  if (_trailCvs) {
    const tc = _trailCvs.getContext('2d');
    if (tc) tc.clearRect(0, 0, _trailCvs.width, _trailCvs.height);
  }
}

function getTrailCtx(W: number, H: number, dpr: number): CanvasRenderingContext2D | null {
  if (!_trailCvs) _trailCvs = document.createElement('canvas');
  const tw = Math.round(W * dpr), th = Math.round(H * dpr);
  if (_trailCvs.width !== tw || _trailCvs.height !== th) {
    _trailCvs.width = tw; _trailCvs.height = th;
  }
  return _trailCvs.getContext('2d');
}

function updateTrailCanvas(
  tc:         CanvasRenderingContext2D,
  ctx:        Ctx,
  state:      PsycheState,
  lens:       PsycheLens,
  trailFade:  number,
  trailWidth: number,
  dpr:        number,
  soulVis:    number,
): void {
  const W = tc.canvas.width, H = tc.canvas.height;

  // ── Fade previous frame (creates the tail's gradient-in-time effect) ─────
  tc.setTransform(1, 0, 0, 1, 0, 0);
  tc.globalAlpha = Math.min(0.99, Math.max(0.01, trailFade));
  tc.fillStyle   = `rgb(${BG_R},${BG_G},${BG_B})`;
  tc.fillRect(0, 0, W, H);
  tc.setTransform(dpr, 0, 0, dpr, 0, 0);

  const baseR = Math.max(1.5, ctx.R * 0.0052);
  tc.lineCap  = 'round';

  for (let i = 0; i < state.count; i++) {
    const [sx, sy] = project(ctx, state.x[i], state.y[i]);
    const color    = getQuantaColor(state, i, lens, 1.0, soulVis);

    const wvx  = state.vx[i];
    const wvy  = state.vy[i];
    const wSpd = Math.hypot(wvx, wvy);

    if (wSpd > 0.0002) {
      // ── Sperm tail: thin stroke extending BEHIND the direction of motion ─
      // The offscreen canvas's per-frame fade turns these into a gradient tail.
      const nx = wvx / wSpd;   // normalized velocity (forward direction)
      const ny = wvy / wSpd;

      // Tail length: speed-responsive, scales with trailWidth slider
      const tailLen = baseR * Math.min(12, 1.5 + wSpd * trailWidth * 22);

      // Tail stroke — starts at particle center, extends backward
      const tx = sx - nx * tailLen;
      const ty = sy - ny * tailLen;

      // Thin stroke: width tapers naturally due to lineCap='round' on a short line
      tc.globalAlpha = 0.55;
      tc.strokeStyle = color;
      tc.lineWidth   = Math.max(0.4, baseR * 0.50);
      tc.beginPath();
      tc.moveTo(sx, sy);
      tc.lineTo(tx, ty);
      tc.stroke();
    }

    // ── Head: bright dot ────────────────────────────────────────────────────
    tc.globalAlpha = wSpd > 0.0002 ? 0.85 : 0.45;
    tc.fillStyle   = color;
    tc.beginPath();
    tc.arc(sx, sy, baseR, 0, Math.PI * 2);
    tc.fill();
  }
  tc.globalAlpha = 1;
}

// ── CAMPO — density heat-map ──────────────────────────────────────────────────
let campoCvs: HTMLCanvasElement | null = null;
let prevCampoOn = true;

function getCampoCtx(W: number, H: number, dpr: number): CanvasRenderingContext2D {
  if (!campoCvs) campoCvs = document.createElement('canvas');
  const tw = Math.round(W*dpr), th = Math.round(H*dpr);
  if (campoCvs.width !== tw || campoCvs.height !== th) {
    campoCvs.width = tw; campoCvs.height = th;
  }
  return campoCvs.getContext('2d')!;
}
function drawCampoGlows(tc: CanvasRenderingContext2D, ctx: Ctx, state: PsycheState, lens: PsycheLens): void {
  const R = ctx.R;
  const haloR = Math.max(10, R * 0.030);
  const coreR = Math.max(3,  R * 0.008);
  for (let i = 0; i < state.count; i++) {
    const [sx, sy] = project(ctx, state.x[i], state.y[i]);
    const color    = getQuantaColor(state, i, lens, 1.0);
    tc.globalAlpha = 0.10; tc.fillStyle = color;
    tc.beginPath(); tc.arc(sx,sy,haloR,0,Math.PI*2); tc.fill();
    tc.globalAlpha = 0.30; tc.fillStyle = color;
    tc.beginPath(); tc.arc(sx,sy,coreR,0,Math.PI*2); tc.fill();
  }
  tc.globalAlpha = 1;
}

// ── Main render entry ─────────────────────────────────────────────────────────
let lastRenderTime = 0;
let prevRenderLens: PsycheLens | null = null;

export function renderPsyche(
  canvas:        HTMLCanvasElement,
  state:         PsycheState,
  lens:          PsycheLens,
  cinematicMode: boolean,
  presetName:    string,
  opts:          PsycheRenderOpts = {},
  camera:        PsycheCamera = DEFAULT_PSYCHE_CAMERA,
): void {
  const {
    rastrosOn    = false,
    campoOn      = false,
    fieldOn      = false,
    bondsOn      = true,
    trailFade    = 0.06,
    trailOpacity = 0.65,
    trailWidth   = 3,
    soulVis      = 0,
    bondWidth    = 1.0,
    bondOpacity  = 0.8,
  } = opts;

  const now = performance.now();
  const dt  = Math.min(0.05, (now - lastRenderTime) / 1000);
  lastRenderTime = now;

  // Flush offscreen caches when lens changes
  if (prevRenderLens !== null && prevRenderLens !== lens) {
    if (_trailCvs) {
      const tc = _trailCvs.getContext('2d');
      if (tc) tc.clearRect(0, 0, _trailCvs.width, _trailCvs.height);
    }
    if (campoCvs) {
      const cc = campoCvs.getContext('2d');
      if (cc) cc.clearRect(0, 0, campoCvs.width, campoCvs.height);
    }
  }
  prevRenderLens = lens;

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const W   = canvas.clientWidth;
  const H   = canvas.clientHeight;
  if (canvas.width !== Math.round(W*dpr) || canvas.height !== Math.round(H*dpr)) {
    canvas.width  = Math.round(W*dpr);
    canvas.height = Math.round(H*dpr);
  }

  const c = canvas.getContext('2d')!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const baseR = Math.min(W, H) * MANDALA_FRAC;
  const ctxL: Ctx = {
    cx: W/2 + camera.panX,
    cy: H/2 + camera.panY,
    R:  baseR * camera.zoom,
  };

  // 1. Background
  c.clearRect(0, 0, W, H);
  c.fillStyle = BG_COLOR;
  c.fillRect(0, 0, W, H);

  // 2. CAMPO — density heat-map
  if (campoOn) {
    const tc = getCampoCtx(W, H, dpr);
    tc.setTransform(dpr, 0, 0, dpr, 0, 0);
    tc.fillStyle = `rgba(${BG_R},${BG_G},${BG_B},0.055)`;
    tc.fillRect(0, 0, W, H);
    drawCampoGlows(tc, ctxL, state, lens);
    c.save(); c.globalAlpha = 0.85;
    c.drawImage(campoCvs!, 0, 0, W, H); c.restore();
  } else if (prevCampoOn && !campoOn) {
    const tc = getCampoCtx(W, H, dpr);
    tc.clearRect(0, 0, campoCvs!.width, campoCvs!.height);
  }
  prevCampoOn = campoOn;

  // 3. RASTROS
  if (rastrosOn) {
    const tc = getTrailCtx(W, H, dpr);
    if (tc) {
      updateTrailCanvas(tc, ctxL, state, lens, trailFade, trailWidth, dpr, soulVis);
      c.save(); c.globalAlpha = trailOpacity;
      c.drawImage(_trailCvs!, 0, 0, W, H); c.restore();
    }
  }

  // 4. Flow vectors
  if (fieldOn) drawFlowVectors(c, ctxL, state);

  // 5. Region overlays
  drawRegionOverlays(c, ctxL, state, state.elapsed);

  // 6. Topology geometry
  drawTopology(c, ctxL, state.elapsed);

  // 7. Theory overlays
  if (lens === 'LACAN') drawLacanOverlay(c, ctxL, state.elapsed);
  if (lens === 'FREUD') drawFreudOverlay(c, ctxL, state, state.elapsed);

  // 8. Bonds / Links
  if (bondsOn) drawLinks(c, ctxL, state, false, bondWidth, bondOpacity);

  // 9. Quanta
  drawQuanta(c, ctxL, state, lens, soulVis);

  // 10. Archetype sigils
  if (lens === 'ARCHETYPES') drawArchetypeSigils(c, ctxL, state);

  // 11. Events
  if (lens === 'EVENTS' || lens === 'TOPOLOGY') drawEvents(c, ctxL, state, dt);

  // 12. Cinematic overlay
  if (cinematicMode) {
    c.save(); c.textAlign='center'; c.textBaseline='bottom';
    c.font=`${Math.max(10,ctxL.R*0.03)}px monospace`;
    c.fillStyle='rgba(200,180,255,0.28)'; c.fillText(presetName, W/2, H-12);
    c.font=`${Math.max(8,ctxL.R*0.022)}px monospace`;
    c.fillStyle='rgba(180,160,230,0.20)'; c.fillText(state.phase, W/2, H-28);
    c.restore();
  }
}