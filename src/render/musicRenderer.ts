// ── Music Lab — Premium Synesthetic Renderer v2 ───────────────────────────────
import {
  MusicState, MusicLens, MusicPreset,
  ROLE_COLORS, VoiceRole, consonanceScore, ToolCursor, CanvasPalette, PaletteMode, DEFAULT_PALETTE,
} from '../sim/music/musicTypes';

const ROLES: VoiceRole[] = ['KICK','BASS','PERC','PAD','LEAD','ARP','STRINGS','CHOIR'];

// ── Grain canvas (static, generated once) ─────────────────────────────────────
let grainCvs: HTMLCanvasElement | null = null;
function getGrain(): HTMLCanvasElement {
  if (grainCvs) return grainCvs;
  const s=256;
  grainCvs=document.createElement('canvas');
  grainCvs.width=grainCvs.height=s;
  const c=grainCvs.getContext('2d')!;
  const id=c.createImageData(s,s);
  for (let i=0;i<id.data.length;i+=4) {
    const v=Math.random()*26;
    id.data[i]=id.data[i+1]=id.data[i+2]=v; id.data[i+3]=255;
  }
  c.putImageData(id,0,0);
  return grainCvs;
}

// ── World → screen ────────────────────────────────────────────────────────────
const wx2s = (x:number,W:number) => (x+1)*W*.5;
const wy2s = (y:number,H:number) => (y+1)*H*.5;

// ── Quantum color by lens (+ palette override) ────────────────────────────────
function qColor(
  q: {role:VoiceRole;pitch:number;charge:number;brightness:number;phase:number},
  lens: MusicLens,
  a = 1,
  paletteMode: PaletteMode = 'role',
  roleOverrides?: Partial<Record<VoiceRole, string>>,
): string {
  // Per-role color override (only in 'role' mode — raw palette)
  if (paletteMode === 'role' && roleOverrides?.[q.role]) {
    const c = roleOverrides[q.role]!;
    return c + Math.round(a * 255).toString(16).padStart(2, '0');
  }
  if (paletteMode === 'mono') return `rgba(255,255,255,${a * (0.4 + q.charge * 0.6)})`;
  if (paletteMode === 'neon') {
    const h = (q.pitch * 3.5) % 360;
    return `hsla(${h},100%,68%,${a})`;
  }
  if (paletteMode === 'heat') {
    const h = 0 + (1 - q.charge) * 60;
    return `hsla(${h},95%,${45 + q.charge * 25}%,${a})`;
  }
  if (paletteMode === 'earth') {
    const earthH = [32, 20, 50, 38, 44, 28, 38, 35] as const;
    const ROLES: VoiceRole[] = ['KICK','BASS','PERC','PAD','LEAD','ARP','STRINGS','CHOIR'];
    const hi = earthH[ROLES.indexOf(q.role)] ?? 35;
    return `hsla(${hi},55%,${38 + q.charge * 22}%,${a})`;
  }
  if (paletteMode === 'plasma') {
    const h = (q.phase * 360 + q.charge * 120) % 360;
    return `hsla(${h},90%,65%,${a})`;
  }
  // default 'role' — check overrides first
  const roleCol = roleOverrides?.[q.role] ?? ROLE_COLORS[q.role];
  switch (lens) {
    case 'Off': case 'Events':
      return roleCol + (Math.round(a*255).toString(16).padStart(2,'0'));
    case 'Notes': {
      const h=250-((q.pitch-33)/72)*190;
      return `hsla(${h},80%,${55+q.charge*25}%,${a})`;
    }
    case 'Harmony':
      return roleCol + (Math.round(a*200).toString(16).padStart(2,'0'));
    case 'Rhythm': {
      const h=q.phase*360;
      return `hsla(${h},90%,62%,${a})`;
    }
    case 'Tension': {
      const h=40-q.charge*40;
      return `hsla(${h},90%,${45+q.brightness*25}%,${a})`;
    }
  }
}

function hexToRgb(h:string):[number,number,number] {
  return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
}

// ── Draw Quantum Channels (flow arrow field) ──────────────────────────────────
function drawChannels(c:CanvasRenderingContext2D,state:MusicState,W:number,H:number):void {
  if (!state.channels?.length) return;
  c.save(); c.lineCap='round';
  for (const ch of state.channels) {
    if (!ch.pts.length) continue;
    // Path curve
    c.strokeStyle=ch.color; c.lineWidth=1.5;
    c.globalAlpha=0.20;
    c.beginPath();
    c.moveTo(wx2s(ch.pts[0][0],W), wy2s(ch.pts[0][1],H));
    for (let i=1;i<ch.pts.length;i++) {
      c.lineTo(wx2s(ch.pts[i][0],W), wy2s(ch.pts[i][1],H));
    }
    c.stroke();
    // Arrows every ~12 pts
    c.globalAlpha=0.55;
    for (let i=6;i<ch.pts.length;i+=10) {
      const [px,py,dx,dy]=ch.pts[i];
      const sx=wx2s(px,W), sy=wy2s(py,H);
      const al=12; const aw=4;
      c.fillStyle=ch.color;
      c.beginPath();
      c.moveTo(sx+dx*al, sy+dy*al);
      c.lineTo(sx-dy*aw, sy+dx*aw);
      c.lineTo(sx+dy*aw, sy-dx*aw);
      c.closePath(); c.fill();
    }
  }
  c.restore();
}

// ── Draw Gravity Rails (magnetic bar) ─────────────────────────────────────────
function drawRails(c:CanvasRenderingContext2D,state:MusicState,W:number,H:number,t:number):void {
  if (!state.rails?.length) return;
  c.save(); c.lineCap='round';
  for (const rail of state.rails) {
    const x1=wx2s(rail.x1,W), y1=wy2s(rail.y1,H);
    const x2=wx2s(rail.x2,W), y2=wy2s(rail.y2,H);
    const col=rail.color;
    // Outer glow
    c.strokeStyle=col; c.lineWidth=8*rail.strength;
    c.globalAlpha=0.07; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke();
    // Inner core
    c.lineWidth=1.8; c.globalAlpha=0.7;
    c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke();
    // Notch ticks (shows it's a magnetic rail)
    const dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy);
    const nx=-dy/len, ny=dx/len;
    const nTicks=Math.floor(len/14);
    c.lineWidth=0.8; c.globalAlpha=0.4;
    for (let k=1;k<nTicks;k++) {
      const fx=x1+dx*(k/nTicks), fy=y1+dy*(k/nTicks);
      c.beginPath();
      c.moveTo(fx+nx*4, fy+ny*4);
      c.lineTo(fx-nx*4, fy-ny*4);
      c.stroke();
    }
    // Animated particles along rail
    const nP=4;
    for (let k=0;k<nP;k++) {
      const phase=((k/nP)+t*0.3)%1;
      const px=x1+dx*phase, py=y1+dy*phase;
      c.globalAlpha=0.5*(0.5+0.5*Math.sin(t*4+k*1.5));
      c.fillStyle=col;
      c.beginPath(); c.arc(px,py,1.5,0,Math.PI*2); c.fill();
    }
  }
  c.restore();
}

// ── Draw Quantum Tunnels (portal pairs) ───────────────────────────────────────
function drawTunnels(c:CanvasRenderingContext2D,state:MusicState,W:number,H:number,t:number):void {
  if (!state.tunnels?.length) return;
  c.save(); c.lineCap='round';
  for (const tun of state.tunnels) {
    const ax=wx2s(tun.ax,W), ay=wy2s(tun.ay,H);
    const bx=wx2s(tun.bx,W), by=wy2s(tun.by,H);
    const pr=tun.radius*W*.5;
    const col=tun.color;
    // Connection arc
    const mx=(ax+bx)/2, my=(ay+by)/2;
    const dist=Math.sqrt((bx-ax)**2+(by-ay)**2);
    c.strokeStyle=col; c.lineWidth=0.8;
    c.globalAlpha=0.12+0.06*Math.sin(t*2);
    c.setLineDash([3,6]);
    c.beginPath(); c.moveTo(ax,ay); c.lineTo(bx,by); c.stroke();
    c.setLineDash([]);
    // Portal A (entrance)
    const pulse=0.5+0.5*Math.sin(t*5);
    for (let k=0;k<3;k++) {
      c.globalAlpha=(0.5-k*.12)*(0.6+pulse*.4);
      c.strokeStyle=col; c.lineWidth=1.5-k*.4;
      c.beginPath(); c.arc(ax,ay,pr*(1+k*.6),0,Math.PI*2); c.stroke();
    }
    c.globalAlpha=0.8; c.fillStyle='rgba(0,0,0,.5)';
    c.beginPath(); c.arc(ax,ay,pr*.4,0,Math.PI*2); c.fill();
    c.globalAlpha=0.7; c.fillStyle=col;
    c.font='8px monospace'; c.textAlign='center'; c.textBaseline='middle';
    c.fillText('A', ax, ay);
    // Portal B (exit) — slightly different phase
    const pulse2=0.5+0.5*Math.sin(t*5+Math.PI);
    for (let k=0;k<3;k++) {
      c.globalAlpha=(0.5-k*.12)*(0.6+pulse2*.4);
      c.strokeStyle=col; c.lineWidth=1.5-k*.4;
      c.beginPath(); c.arc(bx,by,pr*(1+k*.6),0,Math.PI*2); c.stroke();
    }
    c.globalAlpha=0.7; c.fillStyle='rgba(0,0,0,.5)';
    c.beginPath(); c.arc(bx,by,pr*.4,0,Math.PI*2); c.fill();
    c.globalAlpha=0.7; c.fillStyle=col;
    c.fillText('B', bx, by);
  }
  c.restore();
}

// ── Draw Quantum Sequencer Ring ────────────────────────────────────────────────
// Rotating cursor ring — armed steps fire notes from nearest quanta when swept
function drawSequencer(c:CanvasRenderingContext2D,state:MusicState,W:number,H:number,t:number):void {
  const seq=state.sequencer;
  if (!seq?.active) return;
  c.save();
  const cx=wx2s(seq.x,W), cy=wy2s(seq.y,H);
  const rr=seq.ringR*W*.5;
  const n=seq.steps.length;

  // Ring base
  c.strokeStyle='rgba(255,255,255,0.08)'; c.lineWidth=1;
  c.beginPath(); c.arc(cx,cy,rr,0,Math.PI*2); c.stroke();

  // Step marks
  for (let i=0;i<n;i++) {
    const step=seq.steps[i];
    const ang=i/n*Math.PI*2 - Math.PI/2;
    const sx=cx+Math.cos(ang)*rr, sy=cy+Math.sin(ang)*rr;
    const isArmed=step.armed;

    // Outer tick
    c.strokeStyle=isArmed?'rgba(255,255,255,0.55)':'rgba(255,255,255,0.12)';
    c.lineWidth=isArmed?1.5:0.8;
    c.beginPath();
    c.moveTo(cx+Math.cos(ang)*(rr-4), cy+Math.sin(ang)*(rr-4));
    c.lineTo(cx+Math.cos(ang)*(rr+4), cy+Math.sin(ang)*(rr+4));
    c.stroke();

    // Armed dot
    if (isArmed) {
      const pulse=0.7+0.3*Math.sin(t*3+i);
      c.globalAlpha=pulse; c.fillStyle='#ffffff';
      c.beginPath(); c.arc(sx,sy,3,0,Math.PI*2); c.fill();
      // Role color if role-filtered
      if (step.role) {
        c.globalAlpha=0.5; c.fillStyle=ROLE_COLORS[step.role]??'#fff';
        c.beginPath(); c.arc(sx,sy,2.2,0,Math.PI*2); c.fill();
      }
    } else {
      c.globalAlpha=0.2; c.fillStyle='rgba(255,255,255,0.3)';
      c.beginPath(); c.arc(sx,sy,1.5,0,Math.PI*2); c.fill();
    }
    c.globalAlpha=1;
  }

  // Cursor beam (rotating sweep)
  const cursorAng=seq.cursor*Math.PI*2 - Math.PI/2;
  const gradient=c.createLinearGradient(cx,cy,cx+Math.cos(cursorAng)*rr*1.1,cy+Math.sin(cursorAng)*rr*1.1);
  gradient.addColorStop(0,'rgba(255,255,255,0)');
  gradient.addColorStop(0.6,'rgba(255,255,255,0.08)');
  gradient.addColorStop(1,'rgba(255,255,255,0.45)');
  c.strokeStyle=gradient; c.lineWidth=1.5;
  c.beginPath(); c.moveTo(cx,cy);
  c.lineTo(cx+Math.cos(cursorAng)*rr*1.1,cy+Math.sin(cursorAng)*rr*1.1);
  c.stroke();

  // Cursor tip flash
  const tipX=cx+Math.cos(cursorAng)*(rr+4), tipY=cy+Math.sin(cursorAng)*(rr+4);
  const tipPulse=0.5+0.5*Math.sin(t*8);
  c.globalAlpha=tipPulse*0.9;
  c.fillStyle='#ffffff';
  c.beginPath(); c.arc(tipX,tipY,2.5,0,Math.PI*2); c.fill();

  // Center hub
  c.globalAlpha=0.4; c.strokeStyle='rgba(255,255,255,0.2)'; c.lineWidth=0.8;
  c.beginPath(); c.arc(cx,cy,6,0,Math.PI*2); c.stroke();
  c.globalAlpha=0.25; c.fillStyle='rgba(255,255,255,0.15)';
  c.beginPath(); c.arc(cx,cy,5,0,Math.PI*2); c.fill();

  // Trigger radius hint (faint)
  c.globalAlpha=0.05; c.strokeStyle='#fff'; c.lineWidth=1;
  c.setLineDash([3,8]);
  c.beginPath(); c.arc(cx,cy,seq.triggerR*W*.5,0,Math.PI*2); c.stroke();
  c.setLineDash([]);

  c.restore();
}

// ── Draw Cages ────────────────────────────────────────────────────────────────
function drawCages(c: CanvasRenderingContext2D, state: MusicState, W: number, H: number, t: number): void {
  if (!state.cages?.length) return;
  c.save();
  for (const cage of state.cages) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2);
    const [cr, cg, cb] = hexToRgb(cage.color);
    if (cage.shape === 'rect') {
      const sx1 = wx2s(cage.x - cage.w/2, W), sy1 = wy2s(cage.y - cage.h/2, H);
      const sx2 = wx2s(cage.x + cage.w/2, W), sy2 = wy2s(cage.y + cage.h/2, H);
      const sw = sx2 - sx1, sh = sy2 - sy1;
      // Outer glow
      c.shadowColor = cage.color; c.shadowBlur = 12 * pulse;
      c.strokeStyle = cage.color; c.lineWidth = 1.5;
      c.globalAlpha = 0.7;
      c.beginPath(); c.rect(sx1, sy1, sw, sh); c.stroke();
      c.shadowBlur = 0;
      // Corner ticks
      const tick = 8;
      c.strokeStyle = cage.color; c.lineWidth = 2.5; c.globalAlpha = 0.9;
      for (const [cx, cy, sx, sy] of [[sx1,sy1,1,1],[sx2,sy1,-1,1],[sx2,sy2,-1,-1],[sx1,sy2,1,-1]] as [number,number,number,number][]) {
        c.beginPath(); c.moveTo(cx, cy + sy*tick); c.lineTo(cx, cy); c.lineTo(cx + sx*tick, cy); c.stroke();
      }
      // Inner glow fill
      const grd = c.createLinearGradient(sx1, sy1, sx2, sy2);
      grd.addColorStop(0, `rgba(${cr},${cg},${cb},0.03)`);
      grd.addColorStop(1, `rgba(${cr},${cg},${cb},0.01)`);
      c.fillStyle = grd; c.globalAlpha = 1;
      c.beginPath(); c.rect(sx1+1, sy1+1, sw-2, sh-2); c.fill();
    } else {
      const sx = wx2s(cage.x, W), sy2 = wy2s(cage.y, H);
      const sr = cage.r * W * 0.5;
      // Glow rings
      for (let k = 0; k < 3; k++) {
        c.globalAlpha = (0.5 - k*0.15) * (0.5 + pulse*0.4);
        c.strokeStyle = cage.color; c.lineWidth = 1.5 - k*0.4;
        c.beginPath(); c.arc(sx, sy2, sr * (1 + k*0.06), 0, Math.PI*2); c.stroke();
      }
      // Fill
      const grd = c.createRadialGradient(sx, sy2, 0, sx, sy2, sr);
      grd.addColorStop(0, `rgba(${cr},${cg},${cb},0.04)`);
      grd.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      c.fillStyle = grd; c.globalAlpha = 1;
      c.beginPath(); c.arc(sx, sy2, sr, 0, Math.PI*2); c.fill();
    }
  }
  c.shadowBlur = 0;
  c.restore();
}

// ── Draw Harmonic Strings ─────────────────────────────────────────────────────
function drawStrings(c: CanvasRenderingContext2D, state: MusicState, W: number, H: number, t: number): void {
  if (!state.strings?.length) return;
  c.save(); c.lineCap = 'round';
  for (const hs of state.strings) {
    const sx1 = wx2s(hs.x1, W), sy1 = wy2s(hs.y1, H);
    const sx2 = wx2s(hs.x2, W), sy2 = wy2s(hs.y2, H);
    const dx = sx2 - sx1, dy = sy2 - sy1;
    const len = Math.sqrt(dx*dx + dy*dy);
    const nx = -dy/len, ny = dx/len; // perpendicular
    const nSegs = 20;
    const vibScale = hs.vibAmp * 12 * (0.8 + 0.2 * Math.sin(t * 8));

    // Glow behind string
    c.globalAlpha = 0.08 + hs.vibAmp * 0.25;
    c.strokeStyle = hs.color; c.lineWidth = 8 + hs.vibAmp * 10;
    c.filter = 'blur(4px)';
    c.beginPath(); c.moveTo(sx1, sy1); c.lineTo(sx2, sy2); c.stroke();
    c.filter = 'none';

    // Vibrating string path
    c.globalAlpha = 0.8 + hs.vibAmp * 0.2;
    c.strokeStyle = hs.color; c.lineWidth = 1.5 + hs.vibAmp;
    c.beginPath();
    for (let k = 0; k <= nSegs; k++) {
      const frac = k / nSegs;
      const px = sx1 + dx * frac;
      const py = sy1 + dy * frac;
      const wave = Math.sin(frac * Math.PI) * Math.sin(hs.vibPhase * 2) * vibScale;
      if (k === 0) c.moveTo(px + nx*wave, py + ny*wave);
      else c.lineTo(px + nx*wave, py + ny*wave);
    }
    c.stroke();

    // End dots
    c.globalAlpha = 0.9;
    c.fillStyle = hs.color;
    c.beginPath(); c.arc(sx1, sy1, 4, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc(sx2, sy2, 4, 0, Math.PI*2); c.fill();

    // Resonance glow when vibrating
    if (hs.vibAmp > 0.05) {
      const mx = (sx1+sx2)/2, my = (sy1+sy2)/2;
      const [hr, hg, hb] = hexToRgb(hs.color);
      c.filter = 'blur(6px)';
      c.globalAlpha = hs.vibAmp * 0.4;
      const grd = c.createRadialGradient(mx, my, 0, mx, my, 30 + hs.vibAmp*40);
      grd.addColorStop(0, `rgba(${hr},${hg},${hb},0.8)`);
      grd.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
      c.fillStyle = grd;
      c.beginPath(); c.arc(mx, my, 30 + hs.vibAmp*40, 0, Math.PI*2); c.fill();
      c.filter = 'none';
    }
  }
  c.restore();
}

// ── Draw FX Zones ─────────────────────────────────────────────────────────────
function drawFxZones(c: CanvasRenderingContext2D, state: MusicState, W: number, H: number, t: number): void {
  if (!state.fxZones?.length) return;
  const effectColors: Record<string, string> = {
    slow: '#0066ff', fast: '#ff4400', mute: '#444488',
    excite_zone: '#ff8800', pitch_up: '#00ff88', pitch_down: '#ff0088',
    reverse: '#ff00ff', freeze_zone: '#88ccff',
    vortex_zone: '#cc44ff', gravity_down: '#ff8844', gravity_up: '#44ccff',
    transpose: '#ffdd00', harmonize_zone: '#88ff44', bounce: '#ff4444',
    compress_zone: '#4488ff', scatter_zone: '#ff88cc',
  };
  const effectLabels: Record<string, string> = {
    slow: 'SLOW', fast: 'FAST', mute: 'MUTE', excite_zone: 'EXCITE',
    pitch_up: 'PITCH↑', pitch_down: 'PITCH↓', reverse: 'REVERSE', freeze_zone: 'FREEZE',
    vortex_zone: 'VORTEX', gravity_down: 'GRAV↓', gravity_up: 'GRAV↑',
    transpose: 'TRANS', harmonize_zone: 'HARM', bounce: 'BOUNCE',
    compress_zone: 'COMPRESS', scatter_zone: 'SCATTER',
  };
  c.save();
  for (const zone of state.fxZones) {
    if (zone.pts.length < 3) continue;
    const col = effectColors[zone.effect] ?? '#ffffff';
    const [fr, fg, fb] = hexToRgb(col);
    const pulse = 0.5 + 0.5 * Math.sin(t * 3 + zone.id * 0.7);

    // Build screen path
    c.beginPath();
    for (let k = 0; k < zone.pts.length; k++) {
      const sx = wx2s(zone.pts[k][0], W), sy = wy2s(zone.pts[k][1], H);
      if (k === 0) c.moveTo(sx, sy); else c.lineTo(sx, sy);
    }
    c.closePath();

    // Fill
    c.globalAlpha = 0.06 + zone.strength * 0.08 + pulse * 0.03;
    c.fillStyle = `rgb(${fr},${fg},${fb})`;
    c.fill();

    // Animated dashed border
    c.globalAlpha = 0.5 + pulse * 0.3;
    c.strokeStyle = col; c.lineWidth = 1.2;
    c.setLineDash([6, 4]);
    c.lineDashOffset = -t * 10;
    c.stroke();
    c.setLineDash([]);

    // Label at centroid
    const cx2 = zone.pts.reduce((s, p) => s + p[0], 0) / zone.pts.length;
    const cy2 = zone.pts.reduce((s, p) => s + p[1], 0) / zone.pts.length;
    c.globalAlpha = 0.7;
    c.fillStyle = col;
    c.font = '8px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(effectLabels[zone.effect] ?? zone.effect, wx2s(cx2, W), wy2s(cy2, H));
  }
  c.restore();
}

// ── Main render ───────────────────────────────────────────────────────────────
export function renderMusic(
  canvas:   HTMLCanvasElement,
  state:    MusicState,
  preset:   MusicPreset,
  lens:     MusicLens,
  cinematic: boolean,
  fxAmount:  number,
  beatPulse: boolean,
  drawingGate: { x1:number;y1:number;x2:number;y2:number }|null,
  cursor:      ToolCursor|null,
  showVelocity: boolean,
  drawingChannel?: [number,number,number,number][] | null,
  tunnelFirst?:    { x:number; y:number } | null,
  drawingRail?:    { x1:number;y1:number;x2:number;y2:number } | null,
  zoom = 1, panX = 0, panY = 0,
  hoverIdx = -1,
  lassoRect: { x1: number; y1: number; x2: number; y2: number } | null = null,
  showOverlays = true,
  palette: CanvasPalette = DEFAULT_PALETTE,
  drawingCage?: { x1:number;y1:number;x2:number;y2:number }|null,
  zonePreviewPts?: [number,number][]|null,
): void {
  const dpr = Math.min(window.devicePixelRatio||1, 1.5);
  const W   = canvas.clientWidth, H=canvas.clientHeight;
  if (canvas.width!==Math.round(W*dpr)||canvas.height!==Math.round(H*dpr)) {
    canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
  }
  const c = canvas.getContext('2d')!;
  c.setTransform(dpr,0,0,dpr,0,0);

  // ── 1. Background ─────────────────────────────────────────────────────────
  c.fillStyle = palette.bgColor;
  c.fillRect(0,0,W,H);

  const [pr,pg,pb]=hexToRgb(preset.primary);
  const radGrad=c.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.62);
  radGrad.addColorStop(0,  `rgba(${pr},${pg},${pb},${beatPulse?.050:.026})`);
  radGrad.addColorStop(.5, `rgba(${pr},${pg},${pb},.012)`);
  radGrad.addColorStop(1,  'rgba(0,0,0,0)');
  c.fillStyle=radGrad; c.fillRect(0,0,W,H);

  c.save();
  c.globalAlpha=.05;
  const pat=c.createPattern(getGrain(),'repeat');
  if (pat){c.fillStyle=pat;c.fillRect(0,0,W,H);}
  c.restore();

  // ── Apply world zoom/pan transform ────────────────────────────────────────
  c.save();
  c.translate(W / 2 + panX, H / 2 + panY);
  c.scale(zoom, zoom);
  c.translate(-W / 2, -H / 2);

  if (showOverlays) {
    // ── 2. Attractor fields ─────────────────────────────────────────────────
    c.save();
    for (const att of state.attractors) {
      const sx=wx2s(att.x,W), sy=wy2s(att.y,H), sr=att.radius*W*.5;
      let col = att.type === 'metro' ? '255,200,0' : att.type==='repulsor' ? '255,80,0' : att.type==='vortex' ? '180,0,255' : '0,180,255';
      const g2=c.createRadialGradient(sx,sy,0,sx,sy,sr);
      g2.addColorStop(0, `rgba(${col},.1)`);
      g2.addColorStop(.5,`rgba(${col},.03)`);
      g2.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle=g2;
      c.globalAlpha=1;
      c.beginPath();c.arc(sx,sy,sr,0,Math.PI*2);c.fill();
      if (att.type==='metro') {
        // Metronome tick mark
        const pulse = 0.5 + 0.5 * Math.cos(state.elapsed * (state.bpm / 60) * Math.PI * 2);
        c.strokeStyle=`rgba(255,200,0,${0.4 + pulse * 0.5})`; c.lineWidth=2;
        c.beginPath();
        c.moveTo(sx, sy - 12 * (0.7 + pulse*0.5));
        c.lineTo(sx, sy + 8);
        c.moveTo(sx - 6, sy + 8);
        c.lineTo(sx + 6, sy + 8);
        c.stroke();
      }
    }
    c.restore();

    // ── FX Zones ─────────────────────────────────────────────────────────────
    drawFxZones(c, state, W, H, state.elapsed);

    // ── Cages ─────────────────────────────────────────────────────────────────
    drawCages(c, state, W, H, state.elapsed);

    // ── Harmonic Strings ──────────────────────────────────────────────────────
    drawStrings(c, state, W, H, state.elapsed);
  } else {
    // Even when overlays hidden, still draw attractor fields dimly
    c.save();
    for (const att of state.attractors) {
      const sx=wx2s(att.x,W), sy=wy2s(att.y,H), sr=att.radius*W*.5;
      c.globalAlpha=0.015;
      c.fillStyle = att.type==='repulsor'?'#ff5000':att.type==='vortex'?'#8800ff':'#00aaff';
      c.beginPath();c.arc(sx,sy,sr,0,Math.PI*2);c.fill();
    }
    c.restore();
  }

  // ── 3. Harmonic links ─────────────────────────────────────────────────────
  if (lens!=='Off'&&lens!=='Rhythm') {
    c.save(); c.lineCap='round';
    const lR2=.12*.12, maxL=200; let links=0;
    for (let i=0;i<state.count&&links<maxL;i++) {
      const qi=state.quanta[i];
      for (let j=i+1;j<state.count&&links<maxL;j++) {
        const qj=state.quanta[j];
        const dx=qi.x-qj.x,dy=qi.y-qj.y;
        if (dx*dx+dy*dy>lR2) continue;
        const d=Math.sqrt(dx*dx+dy*dy);
        const cons=consonanceScore(qi.pitch,qj.pitch);
        const a=(1-d/.12)*.28;
        const col = lens==='Harmony'
          ? `hsla(${cons*140},70%,55%,${a*(0.4+cons*.6)})`
          : `rgba(255,255,255,${a*.22})`;
        c.globalAlpha=1;
        c.strokeStyle=col;
        c.lineWidth=.5+cons*.7;
        const sxi=wx2s(qi.x,W),syi=wy2s(qi.y,H);
        const sxj=wx2s(qj.x,W),syj=wy2s(qj.y,H);
        c.beginPath();c.moveTo(sxi,syi);c.lineTo(sxj,syj);c.stroke();
        links++;
      }
    }
    c.restore();
  }

  // ── 4. Gate lines ─────────────────────────────────────────────────────────
  c.save(); c.lineCap='round';
  for (const gate of state.gates) {
    const sx1=wx2s(gate.x1,W),sy1=wy2s(gate.y1,H);
    const sx2=wx2s(gate.x2,W),sy2=wy2s(gate.y2,H);
    const gtype = (gate as any).type ?? 'gate';

    if (gtype === 'mirror') {
      // ── Silver chrome with specular tick marks ──────────────────────────
      c.globalAlpha=.22; c.strokeStyle='#d0eeff'; c.lineWidth=8;
      c.beginPath();c.moveTo(sx1,sy1);c.lineTo(sx2,sy2);c.stroke();
      c.globalAlpha=.92; c.strokeStyle='#e8f6ff'; c.lineWidth=1.8;
      c.beginPath();c.moveTo(sx1,sy1);c.lineTo(sx2,sy2);c.stroke();
      // Specular tick marks (reflective surface pattern)
      const mdx=sx2-sx1, mdy=sy2-sy1, mlen=Math.sqrt(mdx*mdx+mdy*mdy)+0.001;
      const mnx=-mdy/mlen, mny=mdx/mlen;
      const nmt=Math.max(2,Math.floor(mlen/10));
      c.lineWidth=0.9; c.globalAlpha=0.55; c.strokeStyle='#c0e8ff';
      for (let k=1;k<nmt;k++) {
        const fx=sx1+mdx*(k/nmt), fy=sy1+mdy*(k/nmt);
        c.beginPath(); c.moveTo(fx+mnx*6, fy+mny*6); c.lineTo(fx+mnx*1, fy+mny*1); c.stroke();
      }
      c.globalAlpha=.85; c.fillStyle='#e8f6ff';
      c.beginPath();c.arc(sx1,sy1,4,0,Math.PI*2);c.fill();
      c.beginPath();c.arc(sx2,sy2,4,0,Math.PI*2);c.fill();
      // "M" label at midpoint
      c.globalAlpha=0.55; c.fillStyle='#c0e8ff';
      c.font='7px monospace'; c.textAlign='center'; c.textBaseline='middle';
      c.fillText('⟺', (sx1+sx2)/2, (sy1+sy2)/2-10);

    } else if (gtype === 'absorber') {
      // ── Dark crimson absorption field ────────────────────────────────────
      c.globalAlpha=.18; c.strokeStyle='#cc1111'; c.lineWidth=12;
      c.beginPath();c.moveTo(sx1,sy1);c.lineTo(sx2,sy2);c.stroke();
      c.globalAlpha=.80; c.strokeStyle='#dd3333'; c.lineWidth=1.5;
      c.setLineDash([5,3]);
      c.beginPath();c.moveTo(sx1,sy1);c.lineTo(sx2,sy2);c.stroke();
      c.setLineDash([]);
      // Inner dark core
      c.globalAlpha=.45; c.strokeStyle='#880000'; c.lineWidth=0.8;
      c.beginPath();c.moveTo(sx1,sy1);c.lineTo(sx2,sy2);c.stroke();
      c.globalAlpha=.75; c.fillStyle='#dd3333';
      c.beginPath();c.arc(sx1,sy1,4,0,Math.PI*2);c.fill();
      c.beginPath();c.arc(sx2,sy2,4,0,Math.PI*2);c.fill();
      // "●" absorption dots along the line
      const adx=sx2-sx1, ady=sy2-sy1, alen=Math.sqrt(adx*adx+ady*ady)+0.001;
      const nat=Math.max(2,Math.floor(alen/20));
      c.globalAlpha=0.4; c.fillStyle='#ff2222';
      for (let k=1;k<nat;k++) {
        const fx=sx1+adx*(k/nat), fy=sy1+ady*(k/nat);
        c.beginPath(); c.arc(fx, fy, 2, 0, Math.PI*2); c.fill();
      }
      c.globalAlpha=0.45; c.fillStyle='#cc1111';
      c.font='7px monospace'; c.textAlign='center'; c.textBaseline='middle';
      c.fillText('◉', (sx1+sx2)/2, (sy1+sy2)/2-10);

    } else if (gtype === 'membrane') {
      // ── Purple one-way with directional arrows ────────────────────────────
      c.globalAlpha=.22; c.strokeStyle='#cc44ff'; c.lineWidth=9;
      c.beginPath();c.moveTo(sx1,sy1);c.lineTo(sx2,sy2);c.stroke();
      c.globalAlpha=.82; c.strokeStyle='#dd66ff'; c.lineWidth=1.5;
      c.beginPath();c.moveTo(sx1,sy1);c.lineTo(sx2,sy2);c.stroke();
      // Directional arrows pointing from blocked side (left/positive normal)
      const bdx=sx2-sx1, bdy=sy2-sy1, blen=Math.sqrt(bdx*bdx+bdy*bdy)+0.001;
      const bnx=-bdy/blen, bny=bdx/blen; // left-normal = blocked side
      const nar=Math.max(2,Math.floor(blen/22));
      c.fillStyle='#cc44ff'; c.globalAlpha=0.65;
      for (let k=1;k<nar;k++) {
        const fx=sx1+bdx*(k/nar), fy=sy1+bdy*(k/nar);
        const aLen=9;
        // Arrow points away from blocked side (away from left-normal)
        c.beginPath();
        c.moveTo(fx - bnx*aLen, fy - bny*aLen);  // tip (right side, allowed)
        c.lineTo(fx + bnx*3 - bdy/blen*4, fy + bny*3 + bdx/blen*4);
        c.lineTo(fx + bnx*3 + bdy/blen*4, fy + bny*3 - bdx/blen*4);
        c.closePath(); c.fill();
      }
      c.globalAlpha=.75; c.fillStyle='#dd66ff';
      c.beginPath();c.arc(sx1,sy1,4,0,Math.PI*2);c.fill();
      c.beginPath();c.arc(sx2,sy2,4,0,Math.PI*2);c.fill();
      c.globalAlpha=0.50; c.fillStyle='#cc44ff';
      c.font='7px monospace'; c.textAlign='center'; c.textBaseline='middle';
      c.fillText('⇥', (sx1+sx2)/2, (sy1+sy2)/2-10);

    } else {
      // ── Original gate ─────────────────────────────────────────────────────
      c.globalAlpha=.18; c.strokeStyle=gate.color; c.lineWidth=6;
      c.beginPath();c.moveTo(sx1,sy1);c.lineTo(sx2,sy2);c.stroke();
      c.globalAlpha=.75; c.lineWidth=1.2;
      c.beginPath();c.moveTo(sx1,sy1);c.lineTo(sx2,sy2);c.stroke();
      c.globalAlpha=.55; c.fillStyle=gate.color;
      c.beginPath();c.arc(sx1,sy1,3.5,0,Math.PI*2);c.fill();
      c.beginPath();c.arc(sx2,sy2,3.5,0,Math.PI*2);c.fill();
    }
  }
  if (drawingGate) {
    const {x1,y1,x2,y2}=drawingGate;
    // Color preview by tool type
    const toolType = cursor?.tool;
    const previewColor = toolType==='mirror' ? '#e8f6ff'
                       : toolType==='absorber' ? '#dd3333'
                       : toolType==='membrane' ? '#dd66ff'
                       : '#ffffff';
    c.globalAlpha=.65; c.strokeStyle=previewColor; c.lineWidth=1;
    c.setLineDash([4,4]);
    c.beginPath();c.moveTo(wx2s(x1,W),wy2s(y1,H));c.lineTo(wx2s(x2,W),wy2s(y2,H));c.stroke();
    c.setLineDash([]);
  }
  c.restore();

  // After gate lines, draw new interactive objects
  // ── 4b. Gravity Rails ────────────────────────────────────────────────────
  drawRails(c, state, W, H, state.elapsed);

  // ── 4c. Quantum Channels ─────────────────────────────────────────────────
  drawChannels(c, state, W, H);

  // ── 4d. Quantum Tunnels ───────────────────────────────────────────────────
  drawTunnels(c, state, W, H, state.elapsed);

  // ── 4e. Quantum Sequencer Ring ────────────────────────────────────────────
  drawSequencer(c, state, W, H, state.elapsed);

  // ── 4f. Drawing previews ──────────────────────────────────────────────────
  if (drawingChannel?.length && drawingChannel.length > 1) {
    c.save(); c.lineCap='round';
    c.strokeStyle='rgba(255,255,255,0.35)'; c.lineWidth=1.2;
    c.setLineDash([3,4]);
    c.beginPath();
    c.moveTo(wx2s(drawingChannel[0][0],W), wy2s(drawingChannel[0][1],H));
    for (let i=1;i<drawingChannel.length;i++) {
      c.lineTo(wx2s(drawingChannel[i][0],W), wy2s(drawingChannel[i][1],H));
    }
    c.stroke(); c.setLineDash([]); c.restore();
  }
  if (tunnelFirst) {
    c.save();
    const ax=wx2s(tunnelFirst.x,W), ay=wy2s(tunnelFirst.y,H);
    const pulse=0.5+0.5*Math.sin(state.elapsed*6);
    c.strokeStyle='#cc66ff'; c.lineWidth=1.5;
    for (let k=0;k<3;k++) {
      c.globalAlpha=(0.6-k*.15)*(0.6+pulse*.4);
      c.beginPath(); c.arc(ax,ay,10*(1+k*.6),0,Math.PI*2); c.stroke();
    }
    c.globalAlpha=0.7; c.fillStyle='#cc66ff';
    c.font='8px monospace'; c.textAlign='center'; c.textBaseline='middle';
    c.fillText('A', ax, ay);
    c.restore();
  }
  if (drawingRail) {
    const {x1,y1,x2,y2}=drawingRail;
    c.save(); c.lineCap='round';
    c.globalAlpha=0.55; c.strokeStyle='#c8960a'; c.lineWidth=2;
    c.setLineDash([5,4]);
    c.beginPath(); c.moveTo(wx2s(x1,W),wy2s(y1,H)); c.lineTo(wx2s(x2,W),wy2s(y2,H)); c.stroke();
    c.setLineDash([]); c.restore();
  }

  // ── Cage drawing preview ─────────────────────────────────────────────────
  if (drawingCage) {
    const {x1,y1,x2,y2}=drawingCage;
    c.save();
    c.globalAlpha=0.65; c.strokeStyle='#00ffcc'; c.lineWidth=1.5;
    c.setLineDash([5,4]);
    const sx1=wx2s(x1,W),sy1=wy2s(y1,H),sx2=wx2s(x2,W),sy2=wy2s(y2,H);
    c.beginPath(); c.rect(Math.min(sx1,sx2),Math.min(sy1,sy2),Math.abs(sx2-sx1),Math.abs(sy2-sy1)); c.stroke();
    c.setLineDash([]); c.restore();
  }

  // ── Zone drawing preview ─────────────────────────────────────────────────
  if (zonePreviewPts && zonePreviewPts.length > 1) {
    c.save();
    c.globalAlpha=0.5; c.strokeStyle='#ff44cc'; c.lineWidth=1.2;
    c.setLineDash([4,4]);
    c.beginPath();
    c.moveTo(wx2s(zonePreviewPts[0][0],W), wy2s(zonePreviewPts[0][1],H));
    for (let k=1;k<zonePreviewPts.length;k++) c.lineTo(wx2s(zonePreviewPts[k][0],W), wy2s(zonePreviewPts[k][1],H));
    c.stroke(); c.setLineDash([]); c.restore();
  }

  // ── 5. Ripples ────────────────────────────────────────────────────────────
  c.save(); c.lineCap='round';
  for (const rp of state.ripples) {
    c.globalAlpha=Math.max(0,rp.alpha);
    c.strokeStyle=rp.color; c.lineWidth=rp.thick;
    c.beginPath();c.arc(wx2s(rp.x,W),wy2s(rp.y,H),rp.r*W*.5,0,Math.PI*2);c.stroke();
  }
  c.restore();

  // ── 6. Emergent events (discharge, mutation) ──────────────────────────────
  c.save();
  for (const e of state.emergent) {
    const sx=wx2s(e.x,W), sy=wy2s(e.y,H);
    c.globalAlpha=Math.max(0,e.alpha);
    if (e.type==='discharge') {
      const sg=c.createRadialGradient(sx,sy,0,sx,sy,e.r*W*.5);
      sg.addColorStop(0,'rgba(255,255,150,.9)');
      sg.addColorStop(.5,'rgba(255,200,0,.4)');
      sg.addColorStop(1,'rgba(255,150,0,0)');
      c.fillStyle=sg;
      c.beginPath();c.arc(sx,sy,e.r*W*.5,0,Math.PI*2);c.fill();
    } else if (e.type==='mutation') {
      c.strokeStyle='#fff';c.lineWidth=1.5;
      for (let r=0;r<3;r++) {
        c.globalAlpha=Math.max(0,e.alpha*(1-r*.28));
        c.beginPath();c.arc(sx,sy,(e.r+r*.04)*W*.5,0,Math.PI*2);c.stroke();
      }
    }
  }
  c.restore();

  // ── 7. Trails ─────────────────────────────────────────────────────────────
  if (preset.trailLen>0) {
    c.save();
    for (const q of state.quanta) {
      if (q.trailX.length<2) continue;
      const len=q.trailX.length;
      for (let t=1;t<len;t++) {
        c.globalAlpha=(t/len)*.32;
        c.fillStyle=qColor(q,lens,1,palette.mode,palette.roleColorOverrides);
        c.beginPath();c.arc(wx2s(q.trailX[t],W),wy2s(q.trailY[t],H),1.3,0,Math.PI*2);c.fill();
      }
    }
    c.restore();
  }

  // ── 8. Velocity vectors (optional) ───────────────────────────────────────
  if (showVelocity) {
    c.save(); c.lineCap='round';
    for (const q of state.quanta) {
      const spd=Math.sqrt(q.vx*q.vx+q.vy*q.vy);
      if (spd<.002) continue;
      const sx=wx2s(q.x,W),sy=wy2s(q.y,H);
      const ex=wx2s(q.x+q.vx*4,W),ey=wy2s(q.y+q.vy*4,H);
      c.globalAlpha=.4;
      c.strokeStyle=qColor(q,lens,1,palette.mode,palette.roleColorOverrides);
      c.lineWidth=.7;
      c.beginPath();c.moveTo(sx,sy);c.lineTo(ex,ey);c.stroke();
    }
    c.restore();
  }

  // ── 9. Quanta particles ───────────────────────────────────────────────────
  c.save();
  const glow=preset.particleGlow;
  const pm = palette.mode;
  const ro = palette.roleColorOverrides;
  for (let qi = 0; qi < state.quanta.length; qi++) {
    const q = state.quanta[qi];
    const sx=wx2s(q.x,W),sy=wy2s(q.y,H);
    const baseR=3.0+q.charge*2.8;
    const col=qColor(q,lens,1,pm,ro);
    const isHovered = qi === hoverIdx;

    // Discharge aura (charge > 0.82)
    if (q.charge>0.82) {
      const pulse=Math.sin(state.elapsed*20+q.phase*8)*.5+.5;
      c.globalAlpha=.08+pulse*.12;
      c.fillStyle='#ffff80';
      c.beginPath();c.arc(sx,sy,baseR*glow*4,0,Math.PI*2);c.fill();
    }

    // Hover ring — pulsing white ring around nearest quantum under cursor
    if (isHovered) {
      const hp = 0.55 + 0.45 * Math.sin(state.elapsed * 8);
      c.globalAlpha = hp * 0.85;
      c.strokeStyle = '#ffffff';
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(sx, sy, baseR * glow * 3.2, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = hp * 0.25;
      c.beginPath(); c.arc(sx, sy, baseR * glow * 4.4, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = 1;
    }

    // Selected highlight
    if (q.selected) {
      c.globalAlpha=.55;
      c.strokeStyle='#ffffff';c.lineWidth=1.5;
      c.beginPath();c.arc(sx,sy,baseR*glow*2.8,0,Math.PI*2);c.stroke();
    }

    // Outer glow
    c.globalAlpha=.15+q.charge*.10;
    c.fillStyle=col;
    c.beginPath();c.arc(sx,sy,baseR*glow*2.4,0,Math.PI*2);c.fill();

    // Mid glow
    c.globalAlpha=.36;
    c.beginPath();c.arc(sx,sy,baseR*glow,0,Math.PI*2);c.fill();

    // Bright core
    c.globalAlpha=.90;
    c.beginPath();c.arc(sx,sy,baseR*.52,0,Math.PI*2);c.fill();

    // Event flash
    if (q.recentlyFired>0) {
      c.globalAlpha=q.recentlyFired*.7;
      c.fillStyle='#ffffff';
      c.beginPath();c.arc(sx,sy,baseR*2.8,0,Math.PI*2);c.fill();
    }
  }
  c.restore();

  // ── 9b. Lasso selection rect ─────────────────────────────────────────────
  if (lassoRect) {
    const lx1 = wx2s(lassoRect.x1, W), ly1 = wy2s(lassoRect.y1, H);
    const lx2 = wx2s(lassoRect.x2, W), ly2 = wy2s(lassoRect.y2, H);
    const lw = lx2 - lx1, lh = ly2 - ly1;
    c.save();
    c.globalAlpha = 0.18;
    c.fillStyle = '#88ccff';
    c.fillRect(lx1, ly1, lw, lh);
    c.globalAlpha = 0.75;
    c.strokeStyle = '#88ccff';
    c.lineWidth = 1.2;
    c.setLineDash([4, 3]);
    c.strokeRect(lx1, ly1, lw, lh);
    c.setLineDash([]);
    c.restore();
  }

  // ── 10. Tool cursor ───────────────────────────────────────────────────────
  if (cursor) {
    const cx=wx2s(cursor.wx,W), cy=wy2s(cursor.wy,H);
    c.save(); c.lineCap='round';
    switch (cursor.tool) {
      case 'excite': {
        const r=cursor.radius*W*.5;
        const g=c.createRadialGradient(cx,cy,0,cx,cy,r);
        g.addColorStop(0,'rgba(255,160,0,.18)');
        g.addColorStop(1,'rgba(255,160,0,0)');
        c.fillStyle=g;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();
        c.globalAlpha=.5+cursor.active?.2:0;c.strokeStyle='#ff8800';c.lineWidth=1;
        c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();
        break;
      }
      case 'freeze': {
        const r=cursor.radius*W*.5;
        const g=c.createRadialGradient(cx,cy,0,cx,cy,r);
        g.addColorStop(0,'rgba(100,200,255,.18)');
        g.addColorStop(1,'rgba(100,200,255,0)');
        c.fillStyle=g;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();
        c.globalAlpha=.5;c.strokeStyle='#88ddff';c.lineWidth=1;
        c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();
        break;
      }
      case 'attractor': {
        c.globalAlpha=.6;c.strokeStyle='#00aaff';c.lineWidth=1;
        c.beginPath();c.arc(cx,cy,14,0,Math.PI*2);c.stroke();
        c.beginPath();c.arc(cx,cy,5,0,Math.PI*2);c.stroke();
        // Inward rays
        for (let a=0;a<8;a++) {
          const ang=a/8*Math.PI*2;
          c.beginPath();
          c.moveTo(cx+Math.cos(ang)*22,cy+Math.sin(ang)*22);
          c.lineTo(cx+Math.cos(ang)*16,cy+Math.sin(ang)*16);
          c.stroke();
        }
        break;
      }
      case 'repulsor': {
        c.globalAlpha=.6;c.strokeStyle='#ff4400';c.lineWidth=1;
        c.beginPath();c.arc(cx,cy,14,0,Math.PI*2);c.stroke();
        for (let a=0;a<8;a++) {
          const ang=a/8*Math.PI*2;
          c.beginPath();
          c.moveTo(cx+Math.cos(ang)*8,cy+Math.sin(ang)*8);
          c.lineTo(cx+Math.cos(ang)*20,cy+Math.sin(ang)*20);
          c.stroke();
        }
        break;
      }
      case 'vortex': {
        c.globalAlpha=.65;c.strokeStyle='#cc44ff';c.lineWidth=1;
        const now=performance.now()/1000;
        for (let r=8;r<=22;r+=7) {
          c.beginPath();
          c.arc(cx,cy,r,now*.5,now*.5+Math.PI*1.6);
          c.stroke();
        }
        break;
      }
      case 'spawn': {
        c.globalAlpha=.7;c.strokeStyle='#aaffaa';c.lineWidth=1;
        c.beginPath();c.arc(cx,cy,10,0,Math.PI*2);c.stroke();
        c.beginPath();c.moveTo(cx-10,cy);c.lineTo(cx+10,cy);
        c.moveTo(cx,cy-10);c.lineTo(cx,cy+10);c.stroke();
        break;
      }
      case 'mutate': {
        c.globalAlpha=.7;c.strokeStyle='#ff88ff';c.lineWidth=1;
        c.beginPath();c.arc(cx,cy,12,0,Math.PI*2);c.stroke();
        // Rotating dashes
        const ta=performance.now()/800;
        c.setLineDash([4,4]);
        c.beginPath();c.arc(cx,cy,18,ta,ta+Math.PI*1.5);c.stroke();
        c.setLineDash([]);
        break;
      }
      case 'erase': {
        c.globalAlpha=.5;c.strokeStyle='#ff4466';c.lineWidth=1;
        c.beginPath();c.arc(cx,cy,12,0,Math.PI*2);c.stroke();
        c.beginPath();
        c.moveTo(cx-7,cy-7);c.lineTo(cx+7,cy+7);
        c.moveTo(cx+7,cy-7);c.lineTo(cx-7,cy+7);
        c.stroke();
        break;
      }
      case 'channel': {
        c.globalAlpha=.65; c.strokeStyle='rgba(200,210,220,0.7)'; c.lineWidth=1;
        c.beginPath(); c.arc(cx,cy,10,0,Math.PI*2); c.stroke();
        const now2=performance.now()/1000;
        c.fillStyle='rgba(200,210,220,0.7)';
        c.beginPath();
        c.moveTo(cx+Math.cos(now2)*14, cy+Math.sin(now2)*14);
        c.lineTo(cx+Math.cos(now2+2.4)*6, cy+Math.sin(now2+2.4)*6);
        c.lineTo(cx+Math.cos(now2-2.4)*6, cy+Math.sin(now2-2.4)*6);
        c.closePath(); c.fill();
        break;
      }
      case 'tunnel': {
        c.globalAlpha=.65; c.strokeStyle='#cc66ff'; c.lineWidth=1;
        const pulse=0.5+0.5*Math.sin(performance.now()/200);
        c.beginPath(); c.arc(cx,cy,10*(1+pulse*.2),0,Math.PI*2); c.stroke();
        c.globalAlpha=.3;
        c.beginPath(); c.arc(cx,cy,18,0,Math.PI*2); c.stroke();
        break;
      }
      case 'rail': {
        c.globalAlpha=.65; c.strokeStyle='#c8960a'; c.lineWidth=1;
        c.beginPath(); c.arc(cx,cy,10,0,Math.PI*2); c.stroke();
        for (let k=0;k<4;k++) {
          c.beginPath();
          c.moveTo(cx,cy-16-k*3); c.lineTo(cx,cy-10-k*3);
          c.moveTo(cx,cy+10+k*3); c.lineTo(cx,cy+16+k*3);
          c.moveTo(cx-16-k*3,cy); c.lineTo(cx-10-k*3,cy);
          c.moveTo(cx+10+k*3,cy); c.lineTo(cx+16+k*3,cy);
        }
        c.stroke();
        break;
      }
      default: { // select, gate
        c.globalAlpha=.35;c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=1;
        c.beginPath();c.arc(cx,cy,4,0,Math.PI*2);c.stroke();
        break;
      }
    }
    c.restore();
  }

  // ── Restore world zoom/pan (spectral strip + cinematic are screen-space) ──
  c.restore();

  // ── 11. Spectral strip ────────────────────────────────────────────────────
  const stripH=40, stripY=H-stripH, barW=W/ROLES.length;
  c.save();
  c.globalAlpha=.60; c.fillStyle='#080c14';
  c.fillRect(0,stripY,W,stripH);
  c.globalAlpha=.25; c.strokeStyle='rgba(255,255,255,.1)'; c.lineWidth=1;
  c.beginPath();c.moveTo(0,stripY);c.lineTo(W,stripY);c.stroke();

  for (let ri=0;ri<ROLES.length;ri++) {
    const role=ROLES[ri];
    const e=state.roleEnergy[role]??0;
    const bx=ri*barW;
    const bh=Math.max(2,e*(stripH-10));
    const col=ROLE_COLORS[role];
    c.globalAlpha=e*.38;
    c.fillStyle=col;
    c.fillRect(bx+barW*.12,stripY+(stripH-bh)-4,barW*.76,bh+4);
    c.globalAlpha=.6+e*.38;
    c.fillStyle=col;
    c.fillRect(bx+barW*.3,stripY+(stripH-bh),barW*.4,bh);
    c.globalAlpha=.3+e*.35;
    c.fillStyle=col;
    c.font='7px monospace'; c.textAlign='center'; c.textBaseline='bottom';
    c.fillText(role,bx+barW*.5,H-2);
  }
  c.restore();

  // ── 12. Cinematic overlay ─────────────────────────────────────────────────
  if (cinematic) {
    c.save();
    c.textAlign='center'; c.textBaseline='top';
    c.fillStyle=preset.primary+'44';
    c.font=`${Math.max(11,W*.016)}px monospace`;
    c.fillText(preset.name.toUpperCase(),W/2,22);
    c.font=`${Math.max(8,W*.010)}px monospace`;
    c.fillStyle=preset.accent+'aa';
    c.fillText(preset.vibe,W/2,42);
    c.restore();
  }
}