// ── Alchemy Lab — Renderer v2 (Bars + Sequencer + Quantum tunneling) ─────────
import {
  AlchemyState, AlchemyLens,
  AlchemyElement, OpusPhase,
  FIELD_SIZE, FieldGrid, AlchemyBar, BarType, BAR_COLORS,
  QuantumSequencer, QSeqStep,
} from './alchemyTypes';
import { SUBSTANCE_META, SubstanceType } from './alchemyTransmutation';

const G = FIELD_SIZE;

// ── Palette ───────────────────────────────────────────────────────────────────
const ELEM_COLORS: Record<AlchemyElement, string> = {
  earth: '#8b7a55', water: '#3a7fa0', air: '#90b0c0', fire: '#c8561e',
};
const PHASE_TINTS: Record<OpusPhase, string> = {
  NIGREDO:    'rgba(0,0,0,0.25)',
  ALBEDO:     'rgba(180,190,220,0.055)',
  CITRINITAS: 'rgba(200,160,0,0.055)',
  RUBEDO:     'rgba(160,0,0,0.07)',
};
const GOLD = 'rgba(200,150,12,';
const SILVER = 'rgba(180,190,210,';

// ── Hex to rgba helper ────────────────────────────────────────────────────────
function hexA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

// ── Coord helpers ─────────────────────────────────────────────────────────────
function wx(v: number, W: number) { return v * W; }
function wy(v: number, H: number) { return v * H; }

// ── Bar rendering ─────────────────────────────────────────────────────────────
export function renderBars(
  c:    CanvasRenderingContext2D,
  bars: AlchemyBar[],
  W:    number, H: number,
  elapsed: number,
): void {
  if (bars.length === 0) return;
  c.save();
  c.lineCap = 'round';

  for (const bar of bars) {
    if (!bar.active) continue;
    const x1=wx(bar.x1,W), y1=wy(bar.y1,H);
    const x2=wx(bar.x2,W), y2=wy(bar.y2,H);
    const col = BAR_COLORS[bar.type];
    const pulse = bar.type==='tunnel'
      ? 0.5+0.5*Math.sin(elapsed*4)
      : bar.type==='channel'
        ? 0.5+0.5*Math.sin(elapsed*2.5)
        : 1;

    // Outer glow
    c.strokeStyle = col;
    c.lineWidth   = 8 * bar.strength;
    c.globalAlpha = 0.08 * pulse;
    c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke();

    // Inner line
    c.lineWidth   = 1.5 + bar.strength;
    c.globalAlpha = 0.6 * pulse;
    c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke();

    // Direction arrow for channel bars
    if (bar.type === 'channel') {
      const mx=(x1+x2)/2, my=(y1+y2)/2;
      const dx=x2-x1, dy=y2-y1;
      const len=Math.sqrt(dx*dx+dy*dy)+0.001;
      const ux=dx/len, uy=dy/len;
      const arrLen=14;
      c.globalAlpha=0.8;
      c.fillStyle=col;
      c.beginPath();
      c.moveTo(mx+ux*arrLen, my+uy*arrLen);
      c.lineTo(mx-uy*6,      my+ux*6);
      c.lineTo(mx+uy*6,      my-ux*6);
      c.closePath(); c.fill();
    }

    // Tunnel bars: quantum shimmer particles
    if (bar.type === 'tunnel') {
      const n = Math.floor(bar.strength * 8 + 2);
      for (let k=0;k<n;k++) {
        const t=(k/n+elapsed*0.3)%1;
        const px=x1+t*(x2-x1), py=y1+t*(y2-y1);
        c.globalAlpha=0.6*(0.5+0.5*Math.sin(elapsed*6+k));
        c.fillStyle=col;
        c.beginPath(); c.arc(px,py,1.5,0,Math.PI*2); c.fill();
      }
    }

    // Endpoint dots
    c.globalAlpha=0.5;
    c.fillStyle=col;
    c.beginPath(); c.arc(x1,y1,3,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(x2,y2,3,0,Math.PI*2); c.fill();

    // Label
    if (bar.label) {
      c.font='7px monospace'; c.textAlign='center'; c.textBaseline='bottom';
      c.fillStyle=col; c.globalAlpha=0.6;
      c.fillText(bar.label, (x1+x2)/2, Math.min(y1,y2)-3);
    }
  }
  c.restore();
}

// ── Sequencer strip ───────────────────────────────────────────────────────────
export function renderSequencer(
  c:   CanvasRenderingContext2D,
  seq: QuantumSequencer,
  W:   number, H: number,
  elapsed: number,
): void {
  if (!seq.active) return;
  const steps = seq.steps;
  const n     = steps.length;
  const stripH = 22, stripY = H - 52 - stripH;
  const cellW  = Math.min(28, (W*0.6) / n);
  const totalW = cellW * n;
  const ox     = (W - totalW) / 2;

  c.save();

  // Background strip
  c.fillStyle   = 'rgba(0,0,0,0.55)';
  c.strokeStyle = 'rgba(200,150,12,0.15)';
  c.lineWidth   = 1;
  const rx = ox-4, rw = totalW+8;
  c.beginPath();
  c.roundRect(rx, stripY, rw, stripH, 4);
  c.fill(); c.stroke();

  for (let i=0; i<n; i++) {
    const step = steps[i];
    const cx = ox + i*cellW + cellW/2;
    const cy = stripY + stripH/2;
    const isCurrent  = i === seq.cursor;
    const isSuper    = i === seq.superStep;
    const isEntangled = steps.some((s,j)=>s.entangled===i&&j===seq.cursor);

    // Step cell bg
    const active = step.active;
    let bg = 'rgba(255,255,255,0.03)';
    if (isCurrent)  bg = 'rgba(200,150,12,0.18)';
    if (isSuper)    bg = 'rgba(160,90,220,0.15)';

    c.fillStyle = bg;
    c.beginPath();
    c.roundRect(ox+i*cellW+1, stripY+2, cellW-2, stripH-4, 3);
    c.fill();

    // Probability bar (quantum mode)
    if (seq.quantum && active) {
      const bh = (stripH-8) * step.probability;
      c.fillStyle = 'rgba(200,150,12,0.25)';
      c.fillRect(ox+i*cellW+2, stripY+stripH-4-bh, cellW-4, bh);
    }

    // Label
    const labelColor = !active ? 'rgba(255,255,255,.15)'
      : isCurrent  ? '#f0c040'
      : isSuper    ? '#cc88ff'
      : isEntangled? '#88ccff'
      : 'rgba(255,255,255,.45)';

    c.font = `${isCurrent?8:7}px monospace`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = labelColor;
    c.globalAlpha = active ? 1 : 0.35;
    c.fillText(step.label, cx, cy);

    // Op indicator below label
    if (step.op !== 'NONE') {
      c.font = '5px monospace';
      c.fillStyle = step.op==='SOLVE' ? '#3a7fa0' : '#c8960a';
      c.fillText(step.op==='SOLVE'?'≋':'⊕', cx, stripY+stripH-3);
    }

    // Cursor tick above
    if (isCurrent) {
      const pulse = 0.5+0.5*Math.sin(elapsed*8);
      c.fillStyle = `rgba(240,192,64,${0.6+pulse*0.4})`;
      c.fillRect(cx-1, stripY, 2, 2);
    }
    // Superposition bracket
    if (isSuper) {
      c.strokeStyle=`rgba(160,90,220,${seq.superWeight*0.8})`;
      c.lineWidth=1; c.globalAlpha=1;
      c.beginPath(); c.moveTo(ox+i*cellW+2,stripY+2); c.lineTo(ox+i*cellW+2,stripY+stripH-2); c.stroke();
    }
    c.globalAlpha=1;
  }

  // BPM display
  c.font='6px monospace'; c.textAlign='right'; c.textBaseline='middle';
  c.fillStyle='rgba(200,150,12,0.4)';
  c.fillText(`${seq.bpm}bpm${seq.quantum?' ψ':''}`, ox+totalW+2, stripY+stripH/2);

  c.restore();
}

// ── Main render ───────────────────────────────────────────────────────────────
export function renderAlchemy(
  canvas:      HTMLCanvasElement,
  state:       AlchemyState,
  lens:        AlchemyLens,
  opusPhase:   OpusPhase | null,
  breathScale: number,
  bars:        AlchemyBar[],
  sequencer:   QuantumSequencer,
  zoom = 1, panX = 0, panY = 0,
): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (canvas.width !== Math.round(W*dpr) || canvas.height !== Math.round(H*dpr)) {
    canvas.width = Math.round(W*dpr); canvas.height = Math.round(H*dpr);
  }
  const c = canvas.getContext('2d')!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);

  // ── 1. Background (not zoomed) ────────────────────────────────────────────
  c.fillStyle = '#08060a';
  c.fillRect(0, 0, W, H);

  // Warm radial glow (athanor heat)
  const heat = state.heat;
  const grad = c.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*.6);
  grad.addColorStop(0,   `rgba(${Math.round(heat*80)},${Math.round(heat*40)},5,${0.03+heat*0.08})`);
  grad.addColorStop(0.6, `rgba(20,10,5,0.03)`);
  grad.addColorStop(1,   'rgba(0,0,0,0)');
  c.fillStyle = grad; c.fillRect(0, 0, W, H);

  // Opus phase tint
  if (opusPhase) {
    c.fillStyle = PHASE_TINTS[opusPhase];
    c.fillRect(0, 0, W, H);
  }

  // ── Apply world zoom/pan transform ────────────────────────────────────────
  c.save();
  c.translate(W / 2 + panX, H / 2 + panY);
  c.scale(zoom, zoom);
  c.translate(-W / 2, -H / 2);

  // ── 2. Field overlay ─────────────────────────────────────────────────────
  if (lens === 'FIELD' || lens === 'LAPIS') {
    renderFieldOverlay(c, state.field, W, H, lens === 'LAPIS' ? state.lapis.charge : 1);
  }

  // ── 3. Hermetic Sigil ────────────────────────────────────────────────────
  const cx = W / 2, cy = H / 2;
  const R  = Math.min(W, H) * 0.42;
  const sigilAlpha = lens === 'FIELD' ? 0.25 : 0.55;

  c.save();
  c.lineCap   = 'round';
  c.lineJoin  = 'round';

  const breathPulse = 1 + breathScale * 0.012;

  // ── Outer circle (Totalidade / Unus Mundus) ──────────────────────────────
  c.strokeStyle = GOLD + sigilAlpha + ')';
  c.lineWidth   = 0.8;
  c.beginPath(); c.arc(cx, cy, R * breathPulse, 0, Math.PI*2); c.stroke();

  // Second outer ring (thinner)
  c.strokeStyle = GOLD + (sigilAlpha * 0.4) + ')';
  c.lineWidth   = 0.4;
  c.beginPath(); c.arc(cx, cy, R * 0.95 * breathPulse, 0, Math.PI*2); c.stroke();

  // ── Inscribed square (Matéria / Quaternidade) ─────────────────────────────
  c.strokeStyle = GOLD + (sigilAlpha * 0.7) + ')';
  c.lineWidth   = 0.7;
  c.beginPath();
  for (let i=0; i<4; i++) {
    const a = i * Math.PI/2 + Math.PI/4;
    const sx = cx + R * Math.cos(a), sy = cy + R * Math.sin(a);
    if (i===0) c.moveTo(sx, sy); else c.lineTo(sx, sy);
  }
  c.closePath(); c.stroke();

  // ── Inscribed triangle (Transformação / Tríade) — pointing up ────────────
  c.strokeStyle = GOLD + (sigilAlpha * 0.6) + ')';
  c.lineWidth   = 0.7;
  c.beginPath();
  for (let i=0; i<3; i++) {
    const a = i * Math.PI*2/3 - Math.PI/2;
    const sx = cx + R * Math.cos(a), sy = cy + R * Math.sin(a);
    if (i===0) c.moveTo(sx, sy); else c.lineTo(sx, sy);
  }
  c.closePath(); c.stroke();

  // ── Inner circle (Lapis locus / Self) ────────────────────────────────────
  const innerR = R * 0.12;
  const lapis  = state.lapis;
  const lapisColor =
    lapis.state === 'FORGED'  ? `rgba(255,215,0,${sigilAlpha*1.2})` :
    lapis.state === 'CRACKED' ? `rgba(180,50,0,${sigilAlpha*0.9})` :
    lapis.state === 'FORMING' ? `rgba(200,160,50,${sigilAlpha})` :
    GOLD + (sigilAlpha * 0.5) + ')';

  c.strokeStyle = lapisColor;
  c.lineWidth   = lapis.state === 'FORGED' ? 1.5 : 0.7;
  c.beginPath(); c.arc(cx, cy, innerR, 0, Math.PI*2); c.stroke();

  // ── Cross at center (4 elements united) ──────────────────────────────────
  c.strokeStyle = GOLD + (sigilAlpha * 0.5) + ')';
  c.lineWidth   = 0.5;
  const crossR  = innerR * 1.8;
  c.beginPath();
  c.moveTo(cx-crossR, cy); c.lineTo(cx+crossR, cy);
  c.moveTo(cx, cy-crossR); c.lineTo(cx, cy+crossR);
  c.stroke();

  // ── Lapis glow (FORGED) ───────────────────────────────────────────────────
  if (lapis.state === 'FORGED' || lapis.state === 'FORMING') {
    const t     = state.elapsed;
    const pulse = 0.5 + 0.5*Math.sin(t * 1.8);
    const glowR = innerR * (2.5 + pulse * 1.5);
    const gg    = c.createRadialGradient(cx,cy,0,cx,cy,glowR);
    gg.addColorStop(0, `rgba(255,215,0,${lapis.state==='FORGED'?0.18*pulse:0.08*pulse})`);
    gg.addColorStop(1, 'rgba(255,215,0,0)');
    c.fillStyle = gg;
    c.beginPath(); c.arc(cx,cy,glowR,0,Math.PI*2); c.fill();
  }

  // ── CRACKED lines ─────────────────────────────────────────────────────────
  if (lapis.state === 'CRACKED') {
    c.strokeStyle = 'rgba(200,50,0,0.4)'; c.lineWidth=0.6;
    for (let k=0;k<4;k++) {
      const a = k * Math.PI/2 + 0.3;
      c.beginPath();
      c.moveTo(cx,cy);
      c.lineTo(cx+Math.cos(a)*innerR*2.5, cy+Math.sin(a)*innerR*2.5);
      c.stroke();
    }
  }

  // ── Cardinal element symbols (subtle, at triangle vertices) ──────────────
  if (lens !== 'FIELD') {
    const symR = R * 1.08;
    const syms = [
      { a:-Math.PI/2,  s:'△', color: ELEM_COLORS.fire  },  // top = Fire
      { a:Math.PI/6,   s:'▽', color: ELEM_COLORS.water },   // bottom-right = Water
      { a:Math.PI*5/6, s:'☽', color: ELEM_COLORS.earth },   // bottom-left = Earth
    ];
    c.font = `${Math.round(R*0.065)}px serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const sym of syms) {
      const sx = cx + Math.cos(sym.a)*symR;
      const sy = cy + Math.sin(sym.a)*symR;
      c.globalAlpha = sigilAlpha * 0.55;
      c.fillStyle   = sym.color;
      c.fillText(sym.s, sx, sy);
    }
    c.globalAlpha = 1;
  }

  c.restore();

  // ── 4. Agent links ────────────────────────────────────────────────────────
  if (lens !== 'FIELD') {
    c.save(); c.lineCap = 'round';
    for (let i=0; i<state.count; i++) {
      const q = state.agents[i];
      if (q.linkId < 0 || q.linkId >= state.count) continue;
      if (q.linkId <= i) continue; // draw once per pair
      const p = state.agents[q.linkId];
      const prog = q.linkTtl / 6; // normalized ttl
      c.globalAlpha = 0.12 + prog * 0.15;
      c.strokeStyle = ELEM_COLORS[q.element];
      c.lineWidth   = 0.5 + q.coherence * 0.6;
      c.beginPath();
      c.moveTo(wx(q.x,W), wy(q.y,H));
      c.lineTo(wx(p.x,W), wy(p.y,H));
      c.stroke();
    }
    c.restore();
  }

  // ── 5. Agents ─────────────────────────────────────────────────────────────
  c.save();
  for (let i=0; i<state.count; i++) {
    const q = state.agents[i];
    const sx = wx(q.x,W), sy = wy(q.y,H);

    // ✦ Use substance color when not plumbum, else fall back to element color
    const sub   = q.substance ?? 'plumbum';
    const smeta = SUBSTANCE_META[sub];
    const col   = sub === 'plumbum' ? ELEM_COLORS[q.element] : smeta.color;
    const gcol  = sub === 'plumbum' ? ELEM_COLORS[q.element] : smeta.glowColor;
    const sizeMult = smeta.sizeBoost;

    let baseR: number;
    let alpha: number;

    switch (lens) {
      case 'FIELD':
      case 'SIGIL':
        baseR = (1.5 + q.charge * 1.8) * sizeMult;
        alpha = 0.4 + q.coherence * 0.5;
        break;
      case 'EVENTS':
        baseR = (1.8 + q.charge * 2) * sizeMult;
        alpha = 0.5 + q.coherence * 0.5;
        break;
      case 'LAPIS':
        baseR = (1.5 + state.lapis.charge * 2.5 * q.charge) * sizeMult;
        alpha = 0.35 + state.lapis.charge * 0.55;
        break;
      default:
        baseR = (1.5 + q.charge * 1.8) * sizeMult;
        alpha = 0.4 + q.coherence * 0.5;
    }

    // ── Aurum: large pulsing golden ring ──────────────────────────────────
    if (sub === 'aurum') {
      const pulse = 0.6 + 0.4 * Math.sin(state.elapsed * 2.5 + q.phase * Math.PI * 2);
      const gl = c.createRadialGradient(sx,sy,0,sx,sy,baseR*5);
      gl.addColorStop(0, `rgba(255,200,40,${0.30 * pulse})`);
      gl.addColorStop(0.4, `rgba(255,160,0,${0.15 * pulse})`);
      gl.addColorStop(1, 'rgba(255,140,0,0)');
      c.fillStyle = gl;
      c.globalAlpha = alpha;
      c.beginPath(); c.arc(sx,sy,baseR*5,0,Math.PI*2); c.fill();
      // outer ring
      c.strokeStyle = `rgba(255,215,64,${0.5 * pulse})`;
      c.lineWidth = 0.8;
      c.globalAlpha = 0.6 * pulse;
      c.beginPath(); c.arc(sx,sy,baseR*3.2,0,Math.PI*2); c.stroke();
    }

    // ── Argentum: silver shimmer ──────────────────────────────────────────
    if (sub === 'argentum') {
      const sh = c.createRadialGradient(sx,sy,0,sx,sy,baseR*3.5);
      sh.addColorStop(0, `rgba(180,210,255,0.18)`);
      sh.addColorStop(1, 'rgba(150,180,220,0)');
      c.fillStyle = sh;
      c.globalAlpha = alpha * 0.8;
      c.beginPath(); c.arc(sx,sy,baseR*3.5,0,Math.PI*2); c.fill();
    }

    // ── Sulphur: volatile yellow flicker ─────────────────────────────────
    if (sub === 'sulphur') {
      const flk = 0.7 + 0.3 * Math.sin(state.elapsed * 8 + q.phase * Math.PI * 4);
      c.globalAlpha = alpha * 0.15 * flk;
      c.fillStyle = smeta.glowColor;
      c.beginPath(); c.arc(sx,sy,baseR*3,0,Math.PI*2); c.fill();
    }

    // ── Mercurius: quick silver blur ─────────────────────────────────────
    if (sub === 'mercurius') {
      c.globalAlpha = alpha * 0.12;
      c.fillStyle = smeta.glowColor;
      c.beginPath(); c.arc(sx,sy,baseR*2.8,0,Math.PI*2); c.fill();
    }

    // Glow (outer) — all substances
    c.globalAlpha = alpha * 0.22;
    c.fillStyle   = gcol;
    c.beginPath(); c.arc(sx, sy, baseR * 2.5, 0, Math.PI*2); c.fill();

    // Core
    c.globalAlpha = alpha;
    c.fillStyle   = col;
    c.beginPath(); c.arc(sx, sy, baseR * 0.6, 0, Math.PI*2); c.fill();

    // Sal: crystal outline
    if (sub === 'sal') {
      c.strokeStyle = `rgba(220,228,248,${alpha*0.6})`;
      c.lineWidth = 0.5;
      c.globalAlpha = alpha * 0.5;
      c.beginPath(); c.arc(sx,sy,baseR*1.1,0,Math.PI*2); c.stroke();
    }

    // Lapis lens: bright aureole
    if (lens === 'LAPIS' && state.lapis.state === 'FORGED') {
      const gl = c.createRadialGradient(sx,sy,0,sx,sy,baseR*4);
      gl.addColorStop(0, 'rgba(255,215,0,0.12)');
      gl.addColorStop(1, 'rgba(255,215,0,0)');
      c.fillStyle = gl;
      c.globalAlpha = 1;
      c.beginPath(); c.arc(sx,sy,baseR*4,0,Math.PI*2); c.fill();
    }

    c.globalAlpha = 1;
  }

  // ── ✦ Transmutation flashes ────────────────────────────────────────────
  const flashes = state.transmutation?.flashes ?? [];
  for (const f of flashes) {
    if (f.life <= 0) continue;
    const fmeta  = SUBSTANCE_META[f.substance];
    const fx2    = wx(f.x, W), fy2 = wy(f.y, H);
    const r2     = f.life * 20;
    const alpha2 = f.life * 0.9;
    const gl2    = c.createRadialGradient(fx2,fy2,0,fx2,fy2,r2);
    gl2.addColorStop(0,   hexA(fmeta.glowColor, alpha2));
    gl2.addColorStop(0.4, hexA(fmeta.color,     alpha2 * 0.45));
    gl2.addColorStop(1,   'rgba(0,0,0,0)');
    c.fillStyle   = gl2;
    c.globalAlpha = 1;
    c.beginPath(); c.arc(fx2, fy2, r2, 0, Math.PI*2); c.fill();
    // Ripple ring
    c.strokeStyle = hexA(fmeta.glowColor, f.life * 0.55);
    c.lineWidth   = 0.9 * f.life;
    c.beginPath(); c.arc(fx2, fy2, r2 * 1.5, 0, Math.PI*2); c.stroke();
    c.globalAlpha = 1;
  }

  c.restore(); // agents save

  // ── 8. Bars (world-space — inside zoom) ──────────────────────────────────
  renderBars(c, bars, W, H, state.elapsed);

  // ── Restore world zoom (event flash + HUD drawn at screen-space) ─────────
  c.restore();

  // ── 6. Event flash ────────────────────────────────────────────────────────
  if (state.activeEvent) {
    const eColors: Record<string, string> = {
      BURNOUT:'rgba(255,60,0,', CRYSTALLIZATION:'rgba(180,160,80,',
      DISSOLUTION:'rgba(40,120,200,', NOISE:'rgba(200,200,255,',
    };
    const col = eColors[state.activeEvent] ?? 'rgba(200,200,200,';
    const t   = state.eventTimer;
    const a   = Math.max(0, 0.15 - t * 0.04);
    if (a > 0) {
      c.fillStyle = col + a + ')';
      c.fillRect(0,0,W,H);
    }
    // Label
    c.save();
    c.textAlign     = 'center';
    c.textBaseline  = 'top';
    c.font          = `${Math.max(10,W*0.013)}px monospace`;
    c.fillStyle     = col + Math.max(0, 0.8-t*0.25) + ')';
    c.fillText(`⚠ ${state.activeEvent}`, W/2, H*.08);
    c.restore();
  }

  // ── 7. Metrics strip (bottom) ─────────────────────────────────────────────
  renderMetricsStrip(c, state, W, H, opusPhase);

  // ── ✦ Substance histogram (bottom left, screen-space) ─────────────────────
  renderSubstanceBar(c, state, W, H);

  // ── 9. Sequencer ──────────────────────────────────────────────────────────
  renderSequencer(c, sequencer, W, H, state.elapsed);
}

// ── Field heatmap overlay ─────────────────────────────────────────────────────
function renderFieldOverlay(
  c: CanvasRenderingContext2D,
  field: FieldGrid,
  W: number, H: number,
  lapisMult: number,
): void {
  const cellW = W / G, cellH = H / G;
  c.save();
  for (let gy=0; gy<G; gy++) {
    for (let gx=0; gx<G; gx++) {
      const i = gy*G + gx;
      const cv = field.C[i], av = field.A[i], sv = field.S[i];
      if (cv < 0.005 && av < 0.005 && sv < 0.005) continue;
      const x = gx*cellW, y = gy*cellH;
      // C = amber, A = blue-green, S = red
      if (cv > 0.01) {
        c.fillStyle = `rgba(200,140,0,${cv*0.35})`;
        c.fillRect(x,y,cellW,cellH);
      }
      if (av > 0.01) {
        c.fillStyle = `rgba(0,150,180,${av*0.35*lapisMult})`;
        c.fillRect(x,y,cellW,cellH);
      }
      if (sv > 0.01) {
        c.fillStyle = `rgba(180,40,0,${sv*0.30})`;
        c.fillRect(x,y,cellW,cellH);
      }
    }
  }
  c.restore();
}

// ── Metrics bottom strip ──────────────────────────────────────────────────────
function renderMetricsStrip(
  c: CanvasRenderingContext2D,
  state: AlchemyState,
  W: number, H: number,
  opusPhase: OpusPhase | null,
): void {
  const m    = state.metrics;
  const stripH = 30, stripY = H - stripH;
  c.save();
  c.fillStyle = 'rgba(5,3,8,0.7)';
  c.fillRect(0, stripY, W, stripH);
  c.strokeStyle = 'rgba(200,150,12,0.2)'; c.lineWidth=1;
  c.beginPath(); c.moveTo(0,stripY); c.lineTo(W,stripY); c.stroke();

  const bars = [
    { label:'Integration', val:m.integrationIndex, color:'rgba(0,180,120,' },
    { label:'Tension',     val:m.tensionIndex,      color:'rgba(200,60,0,'  },
    { label:'Novelty',     val:m.noveltyIndex,      color:'rgba(160,120,220,'},
    { label:'Lapis',       val:m.lapisCharge,       color:'rgba(255,215,0,' },
  ];

  const bW = W / bars.length;
  c.font = '7px monospace'; c.textAlign='center'; c.textBaseline='bottom';

  for (let i=0; i<bars.length; i++) {
    const b   = bars[i];
    const bx  = i*bW, bh = b.val * (stripH - 10);
    c.fillStyle = b.color + '0.35)';
    c.fillRect(bx+bW*.1, stripY+stripH-bh-2, bW*.8, bh);
    c.fillStyle = b.color + '0.75)';
    c.fillRect(bx+bW*.3, stripY+stripH-bh-2, bW*.4, Math.min(bh,2));
    c.fillStyle = b.color + '0.6)';
    c.fillText(b.label.slice(0,3).toUpperCase(), bx+bW*.5, H-2);
  }

  // Lapis state badge
  const ls   = state.lapis.state;
  const lCol: Record<string,string> = { DORMANT:'#555', FORMING:'#aa8', FORGED:'#fd0', CRACKED:'#c33' };
  c.fillStyle = lCol[ls] ?? '#555';
  c.textAlign = 'right'; c.font = '7px monospace';
  c.fillText(`◉ ${ls}`, W-6, H-2);

  // Phase indicator
  if (opusPhase) {
    const phaseColors: Record<OpusPhase,string> = {
      NIGREDO:'#333',ALBEDO:'#aac',CITRINITAS:'#da0',RUBEDO:'#800',
    };
    c.fillStyle = phaseColors[opusPhase];
    c.textAlign = 'left';
    c.fillText(`◼ ${opusPhase}`, 6, H-2);
  }
  c.restore();
}

// ── ✦ Substance histogram bar ─────────────────────────────────────────────────
function renderSubstanceBar(
  c: CanvasRenderingContext2D,
  state: AlchemyState,
  W: number, H: number,
): void {
  const ts = state.transmutation;
  if (!ts) return;
  const counts = ts.counts;
  const total  = Math.max(1, Object.values(counts).reduce((a,b)=>a+b,0));
  const BAR_W  = Math.min(180, W * 0.22);
  const BAR_H  = 5;
  const BAR_X  = 188;
  const BAR_Y  = H - 28;

  // Background
  c.fillStyle   = 'rgba(0,0,0,0.5)';
  c.beginPath(); c.roundRect(BAR_X - 4, BAR_Y - 2, BAR_W + 8, BAR_H + 14, 3); c.fill();

  // Substance segments
  const subOrder: Array<{sub: string; color: string; glow: string}> = [
    { sub:'plumbum',   color:'#7888a0', glow:'#4a5868' },
    { sub:'sulphur',   color:'#e0b800', glow:'#ffe040' },
    { sub:'mercurius', color:'#60c8f0', glow:'#90e8ff' },
    { sub:'sal',       color:'#c8d0e0', glow:'#e8f0ff' },
    { sub:'argentum',  color:'#80acd8', glow:'#b0d8ff' },
    { sub:'aurum',     color:'#ffc107', glow:'#ffe566' },
  ];
  const symbols: Record<string, string> = {
    plumbum:'♄', sulphur:'🜍', mercurius:'☿', sal:'🜔', argentum:'☽', aurum:'☉',
  };

  let xOff = BAR_X;
  for (const { sub, color, glow } of subOrder) {
    const cnt  = (counts as Record<string,number>)[sub] ?? 0;
    const pct  = cnt / total;
    const segW = pct * BAR_W;
    if (segW < 1) continue;
    c.fillStyle   = sub === 'plumbum' ? 'rgba(100,120,140,0.25)' : color;
    c.globalAlpha = sub === 'plumbum' ? 0.4 : 0.85;
    c.fillRect(xOff, BAR_Y, segW, BAR_H);
    if (segW > 12 && sub !== 'plumbum') {
      // glow
      c.fillStyle   = glow;
      c.globalAlpha = 0.25;
      c.fillRect(xOff, BAR_Y, segW, BAR_H);
    }
    xOff += segW;
  }
  c.globalAlpha = 1;

  // Labels below bar
  c.font        = '5px monospace';
  c.textBaseline = 'top';
  let xLbl = BAR_X;
  for (const { sub, color } of subOrder) {
    const cnt  = (counts as Record<string,number>)[sub] ?? 0;
    const pct  = cnt / total;
    const segW = pct * BAR_W;
    if (segW < 8) { xLbl += segW; continue; }
    c.textAlign   = 'left';
    c.fillStyle   = sub === 'plumbum' ? 'rgba(255,255,255,0.2)' : color;
    c.globalAlpha = sub === 'plumbum' ? 0.4 : 0.7;
    c.fillText(`${symbols[sub]}${cnt}`, xLbl + 1, BAR_Y + BAR_H + 2);
    xLbl += segW;
  }
  c.globalAlpha  = 1;
  c.textBaseline = 'alphabetic';

  // Conjunction indicator
  if (ts.conjunctionActive) {
    c.font      = '5px monospace';
    c.fillStyle = 'rgba(160,80,220,0.6)';
    c.textAlign = 'left';
    c.fillText('⚯ Conjunção', BAR_X, BAR_Y - 5);
  }
}