// ── Music Lab — Physics Engine v2 (Channels + Rails + Tunnels + QSeq) ────────
import {
  MusicState, MusicQuantum, GateLine, NoteEvent,
  VoiceRole, MusicPreset, RoleConfig, PhysicsParams,
  quantizeToScale, consonanceScore, ROLE_MATRIX, ROLE_HUES,
  EmergentEvent, QuantumChannel, GravityRail, QuantumTunnel, QuantumSequencer,
  GateType, HarmonicString, defaultUserMatrix, Cage, FxZone, FxZoneEffect,
} from './musicTypes';

const rng  = () => Math.random();
const rng2 = () => (Math.random() - 0.5) * 2;

function computeZoneBB(zone: { pts: [number,number][] }): [number,number,number,number] {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x,y] of zone.pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const bb: [number,number,number,number] = [minX, maxX, minY, maxY];
  (zone as any)._bb = bb;
  return bb;
}

// ── Deterministic-but-variable RNG for preset scenes ──────────────────────────
function fnv1a32(str: string): number {
  // 32-bit FNV-1a
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const r2 = (r: () => number) => (r() - 0.5) * 2;
const rIn = (r: () => number, a: number, b: number) => a + r() * (b - a);

// ── Line segment intersection ─────────────────────────────────────────────────
function segsCross(
  p1x:number,p1y:number,p2x:number,p2y:number,
  p3x:number,p3y:number,p4x:number,p4y:number,
): boolean {
  const d1x=p2x-p1x,d1y=p2y-p1y, d2x=p4x-p3x,d2y=p4y-p3y;
  const den=d1x*d2y-d1y*d2x;
  if (Math.abs(den)<1e-10) return false;
  const t=((p3x-p1x)*d2y-(p3y-p1y)*d2x)/den;
  const u=((p3x-p1x)*d1y-(p3y-p1y)*d1x)/den;
  return t>=0&&t<=1&&u>=0&&u<=1;
}

// ── Curl noise for turbulence ─────────────────────────────────────────────────
function curlNoise(x:number, y:number, t:number): [number,number] {
  const s=2.4;
  return [
    Math.cos(y*s+t*.4) * .5 + Math.cos(x*s*.7+t*.7) * .5,
    Math.sin(x*s+t*.4) * .5 + Math.sin(y*s*.7+t*.7) * .5,
  ];
}

// ── Build role list ───────────────────────────────────────────────────────────
function buildRoleList(preset: MusicPreset): VoiceRole[] {
  const list: VoiceRole[] = [];
  const total = Object.values(preset.roles).reduce((s,r)=>s+r.proportion,0);
  for (const [role, cfg] of Object.entries(preset.roles)) {
    const n = Math.max(1, Math.round((cfg.proportion/total)*64));
    for (let i=0;i<n;i++) list.push(role as VoiceRole);
  }
  return list;
}

// ── Make quantum ──────────────────────────────────────────────────────────────
export function makeQuantum(
  id: number, preset: MusicPreset, role: VoiceRole,
  x?: number, y?: number,
  r: () => number = rng,
): MusicQuantum {
  const rcfg = preset.roles[role];
  const pr   = rcfg?.pitchRange ?? [48,84];
  const pitch = quantizeToScale(
    Math.round(pr[0] + r() * (pr[1]-pr[0])),
    preset.root, preset.scale,
  );
  const wx = x ?? r2(r)*0.82;
  const wy = y ?? r2(r)*0.82;
  return {
    id, role, x:wx, y:wy, vx:r2(r)*.028, vy:r2(r)*.028,
    prevX:wx, prevY:wy, phase:r(), pitch,
    brightness:.3+r()*.5, charge:.2+r()*.5,
    hue: ROLE_HUES[role], cooldown:r()*1.2,
    trailX:[], trailY:[],
    age:0, dischargeTimer:0, recentlyFired:0,
    selected:false, mutations:0, phaseLocked:-1, roleLockTimer:0,
    timbreIdx: -1,
  };
}

// ── Build gates ───────────────────────────────────────────────────────────────
function buildGates(preset: MusicPreset, r: () => number): GateLine[] {
  const gates: GateLine[] = [];
  const n = preset.gateCount ?? 0;
  if (n <= 0) return gates;
  const tags = new Set((preset.tags ?? []).map(String));
  const wantsBarriers = tags.has('Experimental') || tags.has('Dark') || preset.intensity >= 4;
  const pool: GateType[] = wantsBarriers
    ? ['gate','gate','mirror','mirror','absorber','membrane','membrane']
    : ['gate','gate','gate','mirror'];
  const colsMap: Record<GateType, string[]> = {
    gate:     [preset.primary, preset.secondary, preset.accent, '#fff'],
    mirror:   ['#c8e8ff','#d8f0ff','#a8d8ef'],
    absorber: ['#dd3333','#cc1111','#ff4444'],
    membrane: ['#dd66ff','#cc44ff','#aa22ee'],
  };
  for (let i = 0; i < n; i++) {
    const type = pool[Math.floor(r() * pool.length)];
    const cx = r2(r) * 0.62;
    const cy = r2(r) * 0.62;
    const ang = r() * Math.PI;
    const len = 0.10 + r() * 0.55;
    gates.push({
      x1: cx - Math.cos(ang) * len,
      y1: cy - Math.sin(ang) * len,
      x2: cx + Math.cos(ang) * len,
      y2: cy + Math.sin(ang) * len,
      cooldown: 0,
      color: colsMap[type][i % colsMap[type].length],
      type,
    });
  }
  return gates;
}

// ── Build attractors ──────────────────────────────────────────────────────────
function buildAttractors(preset: MusicPreset, r: () => number) {
  const atts: any[] = [];
  const n = preset.attractorCount ?? 0;
  if (n <= 0) return atts;
  const tags = new Set((preset.tags ?? []).map(String));
  const rhythmic = tags.has('Techno') || tags.has('Club') || tags.has('Groove') || tags.has('Breakbeat') || preset.bpm >= 118;
  const pool: Array<'attractor'|'repulsor'|'vortex'|'metro'> = rhythmic
    ? ['metro','attractor','attractor','vortex','repulsor']
    : ['attractor','attractor','vortex','repulsor'];

  // Anchor the composition with a gentle center field
  atts.push({ x: 0, y: 0, strength: 0.06 + r() * 0.10, vortexStr: 0, radius: 0.65 + r() * 0.35, type: 'attractor' as const });

  for (let i = 1; i < n; i++) {
    const type = pool[Math.floor(r() * pool.length)];
    const x = r2(r) * 0.78;
    const y = r2(r) * 0.78;
    const base = 0.04 + r() * 0.20;
    const radius = 0.18 + r() * 0.65;
    if (type === 'vortex') {
      atts.push({ x, y, strength: 0, vortexStr: base * (0.55 + r() * 0.45), radius, type: 'vortex' as const });
    } else if (type === 'repulsor') {
      atts.push({ x, y, strength: -base, vortexStr: 0, radius, type: 'repulsor' as const });
    } else if (type === 'metro') {
      atts.push({ x, y, strength: base * (0.8 + r() * 0.6), vortexStr: 0, radius, type: 'metro' as const });
    } else {
      atts.push({ x, y, strength: base, vortexStr: 0, radius, type: 'attractor' as const });
    }
  }
  return atts as any[];
}

function initialSpawn(preset: MusicPreset, idx: number, total: number, r: () => number): [number, number] | null {
  const style = preset.motionStyle;
  if (total <= 0) return null;
  switch (style) {
    case 'orbit': {
      const a = (idx / total) * Math.PI * 2 + r2(r) * 0.35;
      const rad = 0.35 + r() * 0.18;
      return [Math.cos(a) * rad, Math.sin(a) * rad];
    }
    case 'lattice': {
      const side = Math.max(3, Math.round(Math.sqrt(total)));
      const gx = (idx % side) / (side - 1) * 2 - 1;
      const gy = Math.floor(idx / side) / (side - 1) * 2 - 1;
      return [gx * 0.72 + r2(r) * 0.03, gy * 0.72 + r2(r) * 0.03];
    }
    case 'meditation':
    case 'drift': {
      return [r2(r) * 0.22, r2(r) * 0.22];
    }
    case 'migration':
    case 'exodus': {
      // Start from a "frontier" edge
      const side = Math.floor(r() * 4);
      const t = r2(r) * 0.78;
      if (side === 0) return [-0.92, t];
      if (side === 1) return [0.92, t];
      if (side === 2) return [t, -0.92];
      return [t, 0.92];
    }
    case 'ballistic': {
      return [r2(r) * 0.85, 0.85 + r() * 0.25];
    }
    default:
      return null;
  }
}

function seedExtraStructures(state: MusicState, preset: MusicPreset, r: () => number): void {
  if (preset.id === 'blank-canvas') return;
  if (preset.quantaCount <= 0) return;

  const tags = new Set((preset.tags ?? []).map(String));
  const rhythmic = tags.has('Techno') || tags.has('Club') || tags.has('Groove') || tags.has('Breakbeat') || tags.has('Rave') || preset.bpm >= 118;
  const experimental = tags.has('Experimental') || tags.has('Space') || preset.name.toLowerCase().includes('quantum');
  const stringy = tags.has('Strings') || tags.has('Orchestral') || tags.has('Choral');
  const minimalist = tags.has('Minimalist') || preset.id === 'solo-particle' || preset.quantaCount <= 2;

  // Channels (flow fields) — best with drift/flow/migration
  if (!minimalist && (preset.motionStyle === 'flow' || preset.motionStyle === 'drift' || preset.motionStyle === 'migration' || preset.motionStyle === 'exodus') && r() < 0.85) {
    const pts: QuantumChannel['pts'] = [];
    const cx = r2(r) * 0.55;
    const cy = r2(r) * 0.55;
    const ang = r() * Math.PI * 2;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const steps = 6 + Math.floor(r() * 10);
    for (let i = 0; i < steps; i++) {
      const t = i / Math.max(1, steps - 1);
      const px = cx + dx * (t - 0.5) * 1.1 + r2(r) * 0.06;
      const py = cy + dy * (t - 0.5) * 1.1 + r2(r) * 0.06;
      pts.push([clamp(px, -0.95, 0.95), clamp(py, -0.95, 0.95), dx, dy]);
    }
    state.channels.push({
      id: Math.floor(r() * 100000),
      pts,
      strength: 0.45 + r() * 0.45,
      radius: 0.10 + r() * 0.10,
      color: preset.secondary,
    });
  }

  // Rails (magnetic bars)
  const railN = minimalist ? 0 : rhythmic ? 2 : 1;
  for (let i = 0; i < railN; i++) {
    const cx = r2(r) * 0.55;
    const cy = r2(r) * 0.55;
    const ang = r() * Math.PI;
    const len = 0.18 + r() * 0.55;
    state.rails.push({
      x1: cx - Math.cos(ang) * len,
      y1: cy - Math.sin(ang) * len,
      x2: cx + Math.cos(ang) * len,
      y2: cy + Math.sin(ang) * len,
      strength: 0.25 + r() * 0.55,
      color: preset.accent,
    });
  }

  // Tunnels (portals)
  if (experimental && r() < 0.85) {
    const nTun = 1 + (rhythmic ? 1 : 0) + (r() < 0.35 ? 1 : 0);
    for (let i = 0; i < nTun; i++) {
      const ax = r2(r) * 0.85, ay = r2(r) * 0.85;
      const bx = r2(r) * 0.85, by = r2(r) * 0.85;
      state.tunnels.push({
        id: Math.floor(r() * 100000),
        ax, ay, bx, by,
        radius: 0.05 + r() * 0.06,
        color: i % 2 === 0 ? preset.primary : preset.accent,
        cd: 0,
      });
    }
  }

  // Cages
  if ((stringy || rhythmic) && r() < 0.55) {
    const isCircle = r() < 0.35;
    const cx = r2(r) * 0.35;
    const cy = r2(r) * 0.35;
    const w = 0.55 + r() * 0.55;
    const h = 0.45 + r() * 0.55;
    const rr = 0.28 + r() * 0.30;
    const cage: Cage = isCircle ? {
      id: Math.floor(r() * 100000),
      shape: 'circle',
      x: cx, y: cy, w, h, r: rr,
      elasticity: 0.75 + r() * 0.20,
      color: '#00ffcc',
    } : {
      id: Math.floor(r() * 100000),
      shape: 'rect',
      x: cx, y: cy, w, h, r: Math.max(w, h) / 2,
      elasticity: 0.75 + r() * 0.20,
      color: '#00ffcc',
    };
    state.cages.push(cage);
  }

  // Harmonic strings
  const strN = stringy ? 2 + Math.floor(r() * 2) : (!minimalist && r() < 0.25 ? 1 : 0);
  for (let i = 0; i < strN; i++) {
    const cx = r2(r) * 0.65;
    const cy = r2(r) * 0.65;
    const ang = r() * Math.PI;
    const len = 0.18 + r() * 0.70;
    state.strings.push({
      id: Math.floor(r() * 100000),
      x1: cx - Math.cos(ang) * len,
      y1: cy - Math.sin(ang) * len,
      x2: cx + Math.cos(ang) * len,
      y2: cy + Math.sin(ang) * len,
      tension: r(),
      vibAmp: 0, vibPhase: 0,
      decay: 0.55 + r() * 0.55,
      color: '#ffd700',
      lastHit: 99,
    } as HarmonicString);
  }

  // FX Zones — always at least 1 unless blank/minimal
  const fxCount = preset.intensity >= 4 ? 3 : preset.intensity >= 2 ? 2 : 1;
  const fxPool: FxZoneEffect[] = rhythmic
    ? ['pulse_beat','compress_zone','excite_zone','glitch','scatter_zone','harmonize_zone']
    : tags.has('Ambient') || tags.has('Meditative')
      ? ['slow','tremolo','warp','harmonize_zone','freeze_zone']
      : ['vortex_zone','density_wave','phase_lock','harmonize_zone','transpose','scatter_zone'];

  for (let i = 0; i < fxCount; i++) {
    const eff = fxPool[Math.floor(r() * fxPool.length)];
    const cx = r2(r) * 0.65;
    const cy = r2(r) * 0.65;
    const w = 0.20 + r() * 0.40;
    const h = 0.18 + r() * 0.35;
    const pts: FxZone['pts'] = [
      [clamp(cx - w, -0.95, 0.95), clamp(cy - h, -0.95, 0.95)],
      [clamp(cx + w, -0.95, 0.95), clamp(cy - h, -0.95, 0.95)],
      [clamp(cx + w, -0.95, 0.95), clamp(cy + h, -0.95, 0.95)],
      [clamp(cx - w, -0.95, 0.95), clamp(cy + h, -0.95, 0.95)],
    ];
    const zone: FxZone = {
      id: Math.floor(r() * 100000),
      pts,
      effect: eff,
      strength: 0.35 + r() * 0.60,
      param: r(),
      color: preset.accent,
    };
    state.fxZones.push(zone);
  }

  // Sequencer — only for rhythmic presets, but keep UI-friendly defaults
  if (rhythmic && r() < 0.85) {
    const stepCount = r() < 0.55 ? 16 : 8;
    const tempoMult = r() < 0.5 ? 1 : 2;
    state.sequencer = {
      ...state.sequencer,
      active: true,
      x: r2(r) * 0.75,
      y: r2(r) * 0.75,
      ringR: 0.18 + r() * 0.34,
      tempoMult,
      steps: Array.from({ length: stepCount }, (_, si) => ({
        armed: r() < (0.25 + preset.intensity * 0.08) || (si % 4 === 0),
        pitchOff: Math.floor((r() - 0.5) * 10),
        vel: 0.35 + r() * 0.65,
        role: null,
      })),
      stepCd: new Array(stepCount).fill(0),
    };
  }
}

// ── Create state ──────────────────────────────────────────────────────────────
export function createMusicState(preset: MusicPreset, opts?: { variation?: number }): MusicState {
  const variation = opts?.variation ?? Math.random();
  const seed = (fnv1a32(preset.id) ^ Math.floor(clamp(variation, 0, 1) * 0xffffffff)) >>> 0;
  const r = mulberry32(seed);

  const roles = buildRoleList(preset);
  const quanta: MusicQuantum[] = [];
  for (let i=0;i<preset.quantaCount;i++) {
    const p0 = initialSpawn(preset, i, preset.quantaCount, r);
    const q = p0
      ? makeQuantum(i, preset, roles[i%roles.length], p0[0], p0[1], r)
      : makeQuantum(i, preset, roles[i%roles.length], undefined, undefined, r);

    // Gentle velocity shaping per motion style (keeps presets feeling distinct)
    const ms = preset.motionStyle;
    const velScale =
      (ms === 'meditation') ? 0.18 :
      (ms === 'drift')      ? 0.35 :
      (ms === 'orbit')      ? 0.65 :
      (ms === 'lattice')    ? 0.55 :
      (ms === 'ballistic')  ? 0.85 :
      (preset.intensity <= 1 ? 0.45 : preset.intensity >= 4 ? 1.10 : 0.75);
    q.vx *= velScale; q.vy *= velScale;
    quanta.push(q);
  }
  const state: MusicState = {
    quanta, count:preset.quantaCount,
    gates:buildGates(preset, r), attractors:buildAttractors(preset, r) as any,
    ripples:[], emergent:[],
    channels:[], rails:[], tunnels:[],
    cages:[], strings:[], fxZones:[],
    userMatrix: defaultUserMatrix(),
    sequencer: {
      active:false, x:0, y:0, ringR:0.42,
      steps: Array.from({length:8},(_,i)=>({
        armed: i%2===0, pitchOff:0, vel:0.65, role:null,
      })),
      cursor:0, tempoMult:1, triggerR:0.15,
      stepCd: new Array(8).fill(0),
    },
    elapsed:0, tick:0, bpm:preset.bpm,
    beatPhase:0, barPhase:0, lastBeatTime:0,
    syncIntensity:0, roleEnergy:{},
  };
  seedExtraStructures(state, preset, r);
  return state;
}

// ── Spawn ripple ─────────────────────────────────────────────────────────────
export function spawnRipple(state: MusicState, ev: NoteEvent, color: string): void {
  if (state.ripples.length>28) return;
  state.ripples.push({
    x:ev.x, y:ev.y, r:0, maxR:.08+rng()*.08,
    alpha:.7, color, thick:1.2+ev.velocity*2,
  });
}

// ── Emergent event helpers ────────────────────────────────────────────────────
function addEmergent(state: MusicState, e: EmergentEvent): void {
  if (state.emergent.length>40) return;
  state.emergent.push(e);
}

// ── Correct duration helper: sustain is a LEVEL (0..1), not a time
// dur = time until release starts; release happens AFTER this
function noteDur(env: {attack:number;decay:number;sustain:number;release:number}): number {
  return Math.max(0.05, env.attack + env.decay + env.sustain * 1.5);
}

// ── Main step ─────────────────────────────────────────────────────────────────
export function stepMusic(
  state:  MusicState,
  preset: MusicPreset,
  phys:   PhysicsParams,
  dt:     number,
  onNote: (ev: NoteEvent, cfg: RoleConfig) => void,
): void {
  if (dt<=0||dt>.1) return;
  state.elapsed += dt;
  state.tick++;

  // Beat / bar timing
  const spb = 60/state.bpm;
  state.beatPhase = (state.elapsed/spb) % 1;
  state.barPhase  = (state.elapsed/(spb*4)) % 1;

  const n = state.count;

  // ── Per-quantum physics ───────────────────────────────────────────────────
  for (let i=0;i<n;i++) {
    const q = state.quanta[i];
    q.prevX = q.x; q.prevY = q.y;
    q.age  += dt;
    if (q.cooldown>0) q.cooldown -= dt;
    if (q.recentlyFired>0) q.recentlyFired -= dt;
    if (q.roleLockTimer>0) q.roleLockTimer -= dt;

    q.phase = (q.phase + (.5 + q.brightness*2)*dt) % 1;
    q.charge += (0.5-q.charge)*dt*.12;

    let fx=0, fy=0;

    // ── Gravity: ballistic = correct Newtonian
    // Real physics scale: effective a = gravityY × 30  wu/s²
    // Earth ≈ 9.81 m/s² → set gravityY ≈ 0.327 (slider range [-2, 2])
    // Moon ≈ 0.054, Mars ≈ 0.126, Jupiter ≈ 0.822
    if (phys.motionStyle === 'ballistic' || phys.bounceWalls) {
      fx += phys.gravityX;
      fy += phys.gravityY;
    } else {
      fx += phys.gravityX * 0.15 * dt;
      fy += phys.gravityY * 0.15 * dt;
    }

    if (phys.turbulence>0) {
      const [tx,ty] = curlNoise(q.x, q.y, state.elapsed);
      fx += tx * phys.turbulence * .06;
      fy += ty * phys.turbulence * .06;
    }

    // ── Quantum Channel forces ────────────────────────────────────────────
    if (state.channels.length > 0) {
      for (const ch of state.channels) {
        let bestD = ch.radius, bDx = 0, bDy = 0;
        for (const [cx,cy,dx,dy] of ch.pts) {
          const ddx=q.x-cx, ddy=q.y-cy;
          const d=Math.sqrt(ddx*ddx+ddy*ddy);
          if (d < bestD) { bestD=d; bDx=dx; bDy=dy; }
        }
        if (bestD < ch.radius) {
          const w = (1 - bestD/ch.radius) * ch.strength;
          fx += bDx * w * 0.055;
          fy += bDy * w * 0.055;
        }
      }
    }

    // ── Gravity Rail forces ───────────────────────────────────────────────
    for (const rail of state.rails) {
      const rdx=rail.x2-rail.x1, rdy=rail.y2-rail.y1;
      const rlen2=rdx*rdx+rdy*rdy;
      if (rlen2<0.0001) continue;
      const t=Math.max(0,Math.min(1,((q.x-rail.x1)*rdx+(q.y-rail.y1)*rdy)/rlen2));
      const px=rail.x1+t*rdx, py=rail.y1+t*rdy;
      const tox=px-q.x, toy=py-q.y;
      const d=Math.sqrt(tox*tox+toy*toy)+0.001;
      if (d > 0.5) continue;
      const force=rail.strength*0.06/(d*d*2+0.008);
      fx += (tox/d)*force; fy += (toy/d)*force;
    }

    // Motion style — uses phys.motionStyle (set by behavior presets) falling back to preset's
    switch (phys.motionStyle ?? preset.motionStyle) {

      // ── ORIGINAL 6 (updated to use new phys params) ──────────────────────
      case 'orbit': {
        const r=Math.sqrt(q.x*q.x+q.y*q.y)+.001;
        const tgt=.38+(i%5)*.08;
        const orb=0.08+phys.vortexForce;
        fx+=(-q.y/r)*orb;   fy+=(q.x/r)*orb;
        fx+=(q.x/r)*(tgt-r)*.22; fy+=(q.y/r)*(tgt-r)*.22;
        break;
      }
      case 'swarm': {
        const R=phys.zoneRadius; const R2=R*R;
        let cx2=0,cy2=0,avgVx=0,avgVy=0,cnt=0;
        const sStride = n > 120 ? 2 : 1;
        for (let j=0;j<n;j+=sStride) {
          if (j===i) continue;
          const dx=state.quanta[j].x-q.x, dy=state.quanta[j].y-q.y;
          const d2=dx*dx+dy*dy;
          if (d2<R2) {
            cx2+=state.quanta[j].x; cy2+=state.quanta[j].y;
            avgVx+=state.quanta[j].vx; avgVy+=state.quanta[j].vy; cnt++;
            if (d2<R2*0.22) { fx-=dx*phys.separation*2; fy-=dy*phys.separation*2; }
          }
        }
        if (cnt>0) {
          fx+=(cx2/cnt-q.x)*phys.cohesion*.38; fy+=(cy2/cnt-q.y)*phys.cohesion*.38;
          fx+=(avgVx/cnt-q.vx)*phys.alignment*0.2; fy+=(avgVy/cnt-q.vy)*phys.alignment*0.2;
        }
        fx+=rng2()*.035; fy+=rng2()*.035;
        break;
      }
      case 'flow': {
        const ang=q.x*2.1+q.y*1.7+state.elapsed*.4;
        fx+=Math.cos(ang)*(0.055+phys.turbulence*0.03);
        fy+=Math.sin(ang)*(0.055+phys.turbulence*0.03);
        break;
      }
      case 'drift': { fx+=rng2()*(0.018+phys.turbulence*0.04); fy+=rng2()*(0.018+phys.turbulence*0.04); break; }
      case 'spiral': {
        const r=Math.sqrt(q.x*q.x+q.y*q.y)+.001;
        const sp=0.10+phys.vortexForce;
        fx+=(-q.y/r)*sp+(-q.x/r)*.025;
        fy+=(q.x/r)*sp+(-q.y/r)*.025;
        break;
      }
      case 'lattice': {
        const cell=Math.max(0.04, phys.zoneRadius*0.9);
        const gx=Math.round(q.x/cell)*cell;
        const gy=Math.round(q.y/cell)*cell;
        fx+=(gx-q.x)*1.1; fy+=(gy-q.y)*1.1;
        break;
      }

      // ── 16 NEW BEHAVIOR PRESETS ──────────────────────────────────────────

      // 1. MURMURAÇÃO — Reynolds Boids full (sep + align + cohesion)
      case 'murmuration': {
        const R=phys.zoneRadius, R2=R*R, Rr=R*0.30;
        let avgVx=0,avgVy=0,cx2=0,cy2=0,cnt=0,repX=0,repY=0,nRep=0;
        for (let j=0;j<n;j++) {
          if (j===i) continue;
          const dx=state.quanta[j].x-q.x, dy=state.quanta[j].y-q.y;
          const d2=dx*dx+dy*dy;
          if (d2>R2) continue;
          const d=Math.sqrt(d2)+0.001;
          if (d<Rr) { repX-=dx/d*(Rr-d)/Rr; repY-=dy/d*(Rr-d)/Rr; nRep++; }
          else       { avgVx+=state.quanta[j].vx; avgVy+=state.quanta[j].vy; cx2+=state.quanta[j].x; cy2+=state.quanta[j].y; cnt++; }
        }
        if (nRep>0) { fx+=repX/nRep*phys.separation*3; fy+=repY/nRep*phys.separation*3; }
        if (cnt>0) {
          fx+=(avgVx/cnt-q.vx)*phys.alignment*0.5; fy+=(avgVy/cnt-q.vy)*phys.alignment*0.5;
          fx+=(cx2/cnt-q.x)*phys.cohesion*0.28;    fy+=(cy2/cnt-q.y)*phys.cohesion*0.28;
        }
        fx+=rng2()*0.012*phys.turbulence; fy+=rng2()*0.012*phys.turbulence;
        break;
      }

      // 2. CARDUME — Couzin zone model (repulsion → alignment → attraction)
      case 'school': {
        const R=phys.zoneRadius,R2=R*R;
        let repX=0,repY=0,aX=0,aY=0,atX=0,atY=0,nR=0,nA=0,nAt=0;
        for (let j=0;j<n;j++) {
          if (j===i) continue;
          const dx=state.quanta[j].x-q.x, dy=state.quanta[j].y-q.y;
          const d2=dx*dx+dy*dy;
          if (d2>R2) continue;
          const d=Math.sqrt(d2)+0.001;
          if (d<R*0.25)      { repX-=dx/d; repY-=dy/d; nR++; }
          else if (d<R*0.60) { aX+=state.quanta[j].vx; aY+=state.quanta[j].vy; nA++; }
          else               { atX+=state.quanta[j].x; atY+=state.quanta[j].y; nAt++; }
        }
        if (nR>0)  { fx+=repX/nR*phys.separation*3;   fy+=repY/nR*phys.separation*3; }
        if (nA>0)  { fx+=(aX/nA-q.vx)*phys.alignment*0.6; fy+=(aY/nA-q.vy)*phys.alignment*0.6; }
        if (nAt>0) { fx+=(atX/nAt-q.x)*phys.cohesion*0.35; fy+=(atY/nAt-q.y)*phys.cohesion*0.35; }
        // preferred speed
        const spd=Math.sqrt(q.vx*q.vx+q.vy*q.vy)+0.001;
        fx+=(q.vx/spd)*(phys.maxSpeed*0.55-spd)*0.35; fy+=(q.vy/spd)*(phys.maxSpeed*0.55-spd)*0.35;
        break;
      }

      // 3. GUERRA — Two factions: even pursues odd, odd flees even
      case 'war': {
        const isA=(i%2===0);
        for (let j=0;j<n;j++) {
          if (j===i) continue;
          const dx=state.quanta[j].x-q.x, dy=state.quanta[j].y-q.y;
          const d2=dx*dx+dy*dy;
          if (d2>phys.zoneRadius*phys.zoneRadius||d2<0.0001) continue;
          const d=Math.sqrt(d2);
          const isJA=(j%2===0);
          if (isA&&!isJA)  { fx+=dx/d*phys.cohesion*0.45; fy+=dy/d*phys.cohesion*0.45; } // A chases B
          if (!isA&&isJA)  { fx-=dx/d*phys.separation*0.55; fy-=dy/d*phys.separation*0.55; } // B flees A
          if (isA===isJA && d2<0.04) { fx-=dx/d*phys.separation*1.5; fy-=dy/d*phys.separation*1.5; }
        }
        fx+=rng2()*0.022*phys.turbulence; fy+=rng2()*0.022*phys.turbulence;
        break;
      }

      // 4. POLARIZAÇÃO — Opinion dynamics: same phase attracts, different repels
      case 'polarization': {
        for (let j=0;j<n;j++) {
          if (j===i) continue;
          const qj=state.quanta[j];
          const dx=qj.x-q.x, dy=qj.y-q.y;
          const d2=dx*dx+dy*dy;
          if (d2>phys.zoneRadius*phys.zoneRadius||d2<0.0001) continue;
          const d=Math.sqrt(d2);
          const diff=Math.abs(((q.phase-qj.phase+1.5)%1)-0.5)*2;
          if (diff<0.4)      { fx+=dx/d*phys.cohesion*phys.polarize*0.42; fy+=dy/d*phys.cohesion*phys.polarize*0.42; }
          else if (diff>0.6) { fx-=dx/d*phys.separation*phys.polarize*0.42; fy-=dy/d*phys.separation*phys.polarize*0.42; }
        }
        fx+=rng2()*0.014; fy+=rng2()*0.014;
        break;
      }

      // 5. REVOLUÇÃO — Tightening orbit + charge-burst ejection
      case 'revolution': {
        const r=Math.sqrt(q.x*q.x+q.y*q.y)+.001;
        fx+=(-q.y/r)*phys.vortexForce; fy+=(q.x/r)*phys.vortexForce;
        fx+=(-q.x/r)*(0.035+phys.cohesion*0.018); fy+=(-q.y/r)*(0.035+phys.cohesion*0.018);
        if (q.charge>0.75) { fx+=(q.x/r)*phys.burstRate*0.28; fy+=(q.y/r)*phys.burstRate*0.28; }
        fx+=rng2()*phys.turbulence*0.02; fy+=rng2()*phys.turbulence*0.02;
        break;
      }

      // 6. EXPLOSÃO — Radial burst cycle: expand then contract
      case 'explosion': {
        const r=Math.sqrt(q.x*q.x+q.y*q.y)+.001;
        const cycle=(state.elapsed*phys.burstRate+q.phase*0.5)%1;
        if (cycle<0.15) { fx+=(q.x/r)*0.38; fy+=(q.y/r)*0.38; }
        else            { fx+=(-q.x)*phys.cohesion*0.28; fy+=(-q.y)*phys.cohesion*0.28; }
        for (let j=i+1;j<Math.min(n,i+20);j++) {
          const dx=state.quanta[j].x-q.x, dy=state.quanta[j].y-q.y;
          const d2=dx*dx+dy*dy;
          if (d2<0.04&&d2>0.0001) { const d=Math.sqrt(d2); fx-=dx/d*phys.separation*0.5; fy-=dy/d*phys.separation*0.5; }
        }
        break;
      }

      // 7. CARNAVAL — Multiple rotating vortex centers, high energy
      case 'carnival': {
        const nc=3;
        for (let c=0;c<nc;c++) {
          const ang=state.elapsed*0.45+(c/nc)*Math.PI*2;
          const cx=Math.cos(ang)*0.38, cy=Math.sin(ang)*0.38;
          const dx=cx-q.x, dy=cy-q.y;
          const d=Math.sqrt(dx*dx+dy*dy)+0.01;
          if (d<0.5) {
            fx+=dx/d*phys.cohesion*0.32; fy+=dy/d*phys.cohesion*0.32;
            fx+=(-dy/d)*phys.vortexForce; fy+=(dx/d)*phys.vortexForce;
          }
        }
        fx+=rng2()*phys.turbulence*0.04; fy+=rng2()*phys.turbulence*0.04;
        break;
      }

      // 8. JAZZ — Small clusters that form, improvise, dissolve
      case 'jazz': {
        const numG=Math.max(1,Math.ceil(n/Math.max(2,phys.clusterTarget)));
        const myG=i%numG;
        let cx2=0,cy2=0,cnt=0;
        for (let j=0;j<n;j++) {
          if (j%numG!==myG) continue;
          cx2+=state.quanta[j].x; cy2+=state.quanta[j].y; cnt++;
        }
        if (cnt>1) { fx+=(cx2/cnt-q.x)*phys.cohesion*0.55; fy+=(cy2/cnt-q.y)*phys.cohesion*0.55; }
        for (let j=0;j<n;j++) {
          if (j===i||j%numG===myG) continue;
          const dx=state.quanta[j].x-q.x, dy=state.quanta[j].y-q.y;
          const d2=dx*dx+dy*dy;
          if (d2<0.07&&d2>0.001) { const d=Math.sqrt(d2); fx-=dx/d*phys.separation*0.35; fy-=dy/d*phys.separation*0.35; }
        }
        fx+=rng2()*phys.turbulence*0.058; fy+=rng2()*phys.turbulence*0.058;
        break;
      }

      // 9. ORGANISMO — Breathing cellular mass with internal pressure
      case 'organism': {
        const r=Math.sqrt(q.x*q.x+q.y*q.y)+.001;
        const tgtR=0.28*(1+Math.sin(state.elapsed*phys.burstRate*3+i*0.08)*0.35);
        fx+=(q.x/r)*(tgtR-r)*phys.cohesion*1.6; fy+=(q.y/r)*(tgtR-r)*phys.cohesion*1.6;
        const Rrep=phys.zoneRadius*0.5, Rrep2=Rrep*Rrep;
        for (let j=0;j<n;j++) {
          if (j===i) continue;
          const dx=state.quanta[j].x-q.x, dy=state.quanta[j].y-q.y;
          const d2=dx*dx+dy*dy;
          if (d2<Rrep2&&d2>0.0001) { const d=Math.sqrt(d2); fx-=dx/d*phys.separation*0.75; fy-=dy/d*phys.separation*0.75; }
        }
        break;
      }

      // 10. ÊXODO — Mass directional migration + alignment
      case 'exodus': {
        const ml=Math.sqrt(phys.migrationX*phys.migrationX+phys.migrationY*phys.migrationY)+0.001;
        fx+=phys.migrationX/ml*phys.maxSpeed*0.14; fy+=phys.migrationY/ml*phys.maxSpeed*0.14;
        const R=phys.zoneRadius,R2=R*R;
        let avgVx=0,avgVy=0,cnt=0;
        for (let j=0;j<n;j++) {
          if (j===i) continue;
          const dx=state.quanta[j].x-q.x, dy=state.quanta[j].y-q.y;
          if (dx*dx+dy*dy<R2) { avgVx+=state.quanta[j].vx; avgVy+=state.quanta[j].vy; cnt++; }
        }
        if (cnt>0) { fx+=(avgVx/cnt-q.vx)*phys.alignment*0.4; fy+=(avgVy/cnt-q.vy)*phys.alignment*0.4; }
        fx+=rng2()*0.01*phys.turbulence; fy+=rng2()*0.01*phys.turbulence;
        break;
      }

      // 11. DANÇA — Pairs orbit each other (waltz)
      case 'dance': {
        let bestD=phys.zoneRadius*3,bx=0,by=0;
        for (let j=0;j<n;j++) {
          if (j===i) continue;
          const dx=state.quanta[j].x-q.x, dy=state.quanta[j].y-q.y;
          const d=Math.sqrt(dx*dx+dy*dy);
          if (d<bestD) { bestD=d; bx=state.quanta[j].x; by=state.quanta[j].y; }
        }
        const pdx=bx-q.x, pdy=by-q.y;
        const pd=Math.sqrt(pdx*pdx+pdy*pdy)+0.001;
        if (pd>0.07&&pd<phys.zoneRadius*3) { fx+=pdx/pd*phys.cohesion*0.5; fy+=pdy/pd*phys.cohesion*0.5; }
        fx+=(-pdy/pd)*phys.vortexForce*(i%2===0?1:-1);
        fy+=(pdx/pd)*phys.vortexForce*(i%2===0?1:-1);
        if (pd<0.06) { fx-=pdx/pd*phys.separation; fy-=pdy/pd*phys.separation; }
        break;
      }

      // 12. CAOS — Brownian entropy + random jolts
      case 'chaos': {
        fx+=rng2()*phys.turbulence*0.14; fy+=rng2()*phys.turbulence*0.14;
        if (Math.random()<phys.burstRate*0.009) { fx+=rng2()*phys.burstRate*0.12; fy+=rng2()*phys.burstRate*0.12; }
        if (phys.cohesion>0) { fx+=(-q.x)*phys.cohesion*0.018; fy+=(-q.y)*phys.cohesion*0.018; }
        break;
      }

      // ── BALLISTIC — Pure Newtonian: only gravity acts. No social forces, no life.
      // gravityX/Y already applied above — nothing else to do here.
      case 'ballistic': break;

      // 13. MEDITAÇÃO — Ultra-slow harmonic drift
      case 'meditation': {
        const [tx,ty]=curlNoise(q.x,q.y,state.elapsed*0.12);
        fx+=tx*0.014; fy+=ty*0.014;
        const r=Math.sqrt(q.x*q.x+q.y*q.y)+.001;
        const tgt=0.38+(i%7)*0.055;
        fx+=(-q.y/r)*phys.vortexForce*0.35; fy+=(q.x/r)*phys.vortexForce*0.35;
        fx+=(q.x/r)*(tgt-r)*phys.cohesion*0.12; fy+=(q.y/r)*(tgt-r)*phys.cohesion*0.12;
        break;
      }

      // 14. MIGRAÇÃO — Formation flight in migrationX/Y direction
      case 'migration': {
        const ml=Math.sqrt(phys.migrationX*phys.migrationX+phys.migrationY*phys.migrationY)+0.001;
        fx+=phys.migrationX/ml*0.11; fy+=phys.migrationY/ml*0.11;
        const R=phys.zoneRadius,R2=R*R;
        let avgVx=0,avgVy=0,cnt=0;
        for (let j=0;j<n;j++) {
          if (j===i) continue;
          const dx=state.quanta[j].x-q.x, dy=state.quanta[j].y-q.y;
          if (dx*dx+dy*dy<R2) { avgVx+=state.quanta[j].vx; avgVy+=state.quanta[j].vy; cnt++; }
        }
        if (cnt>0) { fx+=(avgVx/cnt-q.vx)*phys.alignment*0.55; fy+=(avgVy/cnt-q.vy)*phys.alignment*0.55; }
        for (let j=0;j<n;j++) {
          if (j===i) continue;
          const dx=state.quanta[j].x-q.x, dy=state.quanta[j].y-q.y;
          const d2=dx*dx+dy*dy;
          if (d2<0.04&&d2>0.0001) { const d=Math.sqrt(d2); fx-=dx/d*phys.separation*0.45; fy-=dy/d*phys.separation*0.45; }
        }
        break;
      }

      // 15. PREDAÇÃO — Role-based pursuit/flight (ROLE_MATRIX amplified)
      case 'predation': {
        const roleI=ROLE_MATRIX[q.role];
        for (let j=0;j<n;j++) {
          if (j===i) continue;
          const qj=state.quanta[j];
          const force=roleI?roleI[qj.role]:undefined;
          if (!force) continue;
          const dx=qj.x-q.x, dy=qj.y-q.y;
          const d2=dx*dx+dy*dy;
          if (d2<phys.zoneRadius*phys.zoneRadius&&d2>0.0001) {
            const d=Math.sqrt(d2);
            fx+=dx/d*force*phys.polarize*2.2; fy+=dy/d*force*phys.polarize*2.2;
          }
        }
        let avgVx=0,avgVy=0,cnt=0;
        for (let j=0;j<n;j++) {
          if (j===i||state.quanta[j].role!==q.role) continue;
          const dx=state.quanta[j].x-q.x, dy=state.quanta[j].y-q.y;
          if (dx*dx+dy*dy<phys.zoneRadius*phys.zoneRadius) { avgVx+=state.quanta[j].vx; avgVy+=state.quanta[j].vy; cnt++; }
        }
        if (cnt>0) { fx+=(avgVx/cnt-q.vx)*phys.alignment*0.32; fy+=(avgVy/cnt-q.vy)*phys.alignment*0.32; }
        fx+=rng2()*phys.turbulence*0.022; fy+=rng2()*phys.turbulence*0.022;
        break;
      }

      // 16. CÉLULAS — Cluster shells + breathing pressure (Gray-Scott-ish)
      case 'cells': {
        const numG=Math.max(1,Math.ceil(n/Math.max(2,phys.clusterTarget)));
        const myG=i%numG;
        const breathPhase=Math.sin(state.elapsed*phys.burstRate*2+myG*1.4);
        const tgtR=0.055+Math.abs(breathPhase)*0.09;
        let gcx=0,gcy=0,gcnt=0;
        for (let j=0;j<n;j++) {
          if (j%numG===myG) { gcx+=state.quanta[j].x; gcy+=state.quanta[j].y; gcnt++; }
        }
        if (gcnt>0) {
          const dcx=q.x-gcx/gcnt, dcy=q.y-gcy/gcnt;
          const dr=Math.sqrt(dcx*dcx+dcy*dcy)+0.001;
          fx+=(dcx/dr)*(tgtR-dr)*phys.cohesion*2.6; fy+=(dcy/dr)*(tgtR-dr)*phys.cohesion*2.6;
        }
        for (let j=0;j<n;j++) {
          if (j===i||j%numG===myG) continue;
          const dx=state.quanta[j].x-q.x, dy=state.quanta[j].y-q.y;
          const d2=dx*dx+dy*dy;
          if (d2<0.06&&d2>0.0001) { const d=Math.sqrt(d2); fx-=dx/d*phys.separation*1.25; fy-=dy/d*phys.separation*1.25; }
        }
        break;
      }
    }

    for (const att of state.attractors) {
      const dx=att.x-q.x, dy=att.y-q.y;
      const d2=dx*dx+dy*dy;
      if (d2<att.radius*att.radius&&d2>.0001) {
        const d=Math.sqrt(d2);
        if (att.type === 'metro') {
          // Pulsing beat-sync attractor
          const beatPulse = Math.max(0, Math.cos(state.elapsed * (state.bpm / 60) * Math.PI * 2));
          const ps = att.strength * beatPulse * beatPulse * 2;
          fx += (dx/d) * ps; fy += (dy/d) * ps;
        } else {
          fx+=(dx/d)*att.strength;    fy+=(dy/d)*att.strength;
          fx+=(-dy/d)*att.vortexStr;  fy+=(dx/d)*att.vortexStr;
        }
      }
    }

    // ── User Interaction Matrix forces (sparse check) ──────────────────────
    if (state.userMatrix && state.tick % 3 === 0) {
      const IR2 = 0.09;
      const rowA = state.userMatrix[q.role];
      if (rowA) {
        const stride = n > 100 ? 2 : 1;
        for (let j = 0; j < n; j += stride) {
          if (j === i) continue;
          const qj = state.quanta[j];
          const mVal = rowA[qj.role] ?? 0;
          if (Math.abs(mVal) < 0.008) continue;
          const mdx = qj.x - q.x, mdy = qj.y - q.y;
          const md2 = mdx*mdx + mdy*mdy;
          if (md2 > IR2 || md2 < 0.0004) continue;
          const md = Math.sqrt(md2);
          const force = mVal * 0.08 / (md + 0.025);
          fx += (mdx/md) * force; fy += (mdy/md) * force;
        }
      }
    }

    if (phys.predatorPrey && state.tick%3===0) {
      const roleI = ROLE_MATRIX[q.role];
      if (roleI) {
        const stride = n > 100 ? 2 : 1;
        for (let j=0;j<n;j+=stride) {
          if (j===i) continue;
          const qj=state.quanta[j];
          const force=roleI[qj.role];
          if (!force) continue;
          const dx=qj.x-q.x, dy=qj.y-q.y;
          const d2=dx*dx+dy*dy;
          if (d2>.001&&d2<.22) {
            const d=Math.sqrt(d2);
            fx+=(dx/d)*force; fy+=(dy/d)*force;
          }
        }
      }
    }

    q.vx = (q.vx+fx*dt) * Math.pow(phys.damping, dt*60);
    q.vy = (q.vy+fy*dt) * Math.pow(phys.damping, dt*60);
    const spd=Math.sqrt(q.vx*q.vx+q.vy*q.vy);
    if (spd>phys.maxSpeed) { q.vx=q.vx/spd*phys.maxSpeed; q.vy=q.vy/spd*phys.maxSpeed; }

    q.x += q.vx * dt * 30; q.y += q.vy * dt * 30;

    // ── Quantum Tunnel teleportation ──────────────────────────────────────
    for (const tun of state.tunnels) {
      if (tun.cd > 0) { tun.cd -= dt; continue; }
      const dax=q.x-tun.ax, day=q.y-tun.ay;
      if (dax*dax+day*day < tun.radius*tun.radius) {
        const speed=Math.sqrt(q.vx*q.vx+q.vy*q.vy);
        const abAngle=Math.atan2(tun.by-tun.ay, tun.bx-tun.ax);
        q.x=tun.bx + (Math.random()-.5)*.01;
        q.y=tun.by + (Math.random()-.5)*.01;
        q.vx=Math.cos(abAngle)*speed;
        q.vy=Math.sin(abAngle)*speed;
        tun.cd=0.25;
        q.recentlyFired=0.6;
        spawnRipple(state,{pitch:q.pitch,velocity:.7,role:q.role,x:tun.bx,y:tun.by,duration:.15,timbre:.8},tun.color);
        break;
      }
    }

    // Wall bounce (ballistic / bounceWalls) — or classic wrap
    if (phys.bounceWalls || (phys.motionStyle === 'ballistic')) {
      const B = 0.97;
      const REST = phys.restitution ?? 0.82;
      if (q.x > B)  { q.x = B;  q.vx = -Math.abs(q.vx) * REST; }
      if (q.x < -B) { q.x = -B; q.vx =  Math.abs(q.vx) * REST; }
      if (q.y > B)  { q.y = B;  q.vy = -Math.abs(q.vy) * REST; }
      if (q.y < -B) { q.y = -B; q.vy =  Math.abs(q.vy) * REST; }
    } else {
      if (q.x>1) q.x-=2; if (q.x<-1) q.x+=2;
      if (q.y>1) q.y-=2; if (q.y<-1) q.y+=2;
    }

    // ── Cage collision (bouncing inside) ────────────────────────────────────
    for (const cage of (state.cages ?? [])) {
      if (cage.shape === 'rect') {
        const hw = cage.w / 2, hh = cage.h / 2;
        const prevIn = q.prevX > cage.x-hw && q.prevX < cage.x+hw &&
                       q.prevY > cage.y-hh && q.prevY < cage.y+hh;
        if (!prevIn) continue;
        if (q.x < cage.x - hw) { q.x = cage.x - hw + 0.001; q.vx =  Math.abs(q.vx) * cage.elasticity; }
        if (q.x > cage.x + hw) { q.x = cage.x + hw - 0.001; q.vx = -Math.abs(q.vx) * cage.elasticity; }
        if (q.y < cage.y - hh) { q.y = cage.y - hh + 0.001; q.vy =  Math.abs(q.vy) * cage.elasticity; }
        if (q.y > cage.y + hh) { q.y = cage.y + hh - 0.001; q.vy = -Math.abs(q.vy) * cage.elasticity; }
      } else {
        const ddx = q.x - cage.x, ddy = q.y - cage.y;
        const d = Math.sqrt(ddx*ddx + ddy*ddy);
        const prevD = Math.sqrt((q.prevX-cage.x)**2 + (q.prevY-cage.y)**2);
        if (prevD > cage.r || d <= cage.r) continue; // only reflect if was inside
        const nx = ddx/(d+0.0001), ny = ddy/(d+0.0001);
        const dot = q.vx*nx + q.vy*ny;
        if (dot > 0) { q.vx -= 2*dot*nx; q.vy -= 2*dot*ny; }
        q.vx *= cage.elasticity; q.vy *= cage.elasticity;
        q.x = cage.x + nx * (cage.r - 0.002);
        q.y = cage.y + ny * (cage.r - 0.002);
      }
    }

    // ── FX Zone effects ──────────────────────────────────────────────────────
    for (const zone of (state.fxZones ?? [])) {
      if (zone.pts.length < 3) continue;
      // Quick AABB rejection before expensive point-in-polygon
      const zb = (zone as any)._bb ?? computeZoneBB(zone);
      if (q.x < zb[0] || q.x > zb[1] || q.y < zb[2] || q.y > zb[3]) continue;
      let inside = false;
      for (let pi = 0, pj = zone.pts.length-1; pi < zone.pts.length; pj = pi++) {
        const xi = zone.pts[pi][0], yi = zone.pts[pi][1];
        const xj = zone.pts[pj][0], yj = zone.pts[pj][1];
        if (((yi > q.y) !== (yj > q.y)) && (q.x < (xj-xi)*(q.y-yi)/(yj-yi)+xi)) inside = !inside;
      }
      if (!inside) continue;
      const s = zone.strength;
      const p2 = zone.param ?? 0.5;
      switch (zone.effect) {
        case 'slow':        q.vx *= (1 - s * 0.04 * dt * 60); q.vy *= (1 - s * 0.04 * dt * 60); break;
        case 'fast':        q.vx *= (1 + s * 0.025 * dt * 60); q.vy *= (1 + s * 0.025 * dt * 60); break;
        case 'mute':        q.cooldown = Math.max(q.cooldown, 0.25); break;
        case 'excite_zone': q.charge = Math.min(1, q.charge + s * 0.015 * dt * 60); break;
        case 'freeze_zone': q.vx *= 0.95; q.vy *= 0.95; q.charge *= 0.998; break;
        case 'pitch_up':    if (state.tick % Math.max(1, Math.round(90 * (1 - s * 0.8))) === 0) q.pitch = Math.min(108, q.pitch + 1); break;
        case 'pitch_down':  if (state.tick % Math.max(1, Math.round(90 * (1 - s * 0.8))) === 0) q.pitch = Math.max(24,  q.pitch - 1); break;
        case 'reverse':     if (state.tick % 120 === Math.round(i * 7) % 120) { q.vx *= -1; q.vy *= -1; } break;
        case 'vortex_zone': {
          const cx2 = zone.pts.reduce((a, pt) => a + pt[0], 0) / zone.pts.length;
          const cy2 = zone.pts.reduce((a, pt) => a + pt[1], 0) / zone.pts.length;
          const rdx = q.x - cx2, rdy = q.y - cy2;
          const rd = Math.sqrt(rdx*rdx + rdy*rdy) + 0.001;
          fx += (-rdy/rd) * s * (0.3 + p2 * 0.4);
          fy += ( rdx/rd) * s * (0.3 + p2 * 0.4);
          break;
        }
        case 'gravity_down': fy += s * (0.5 + p2 * 1.5); break;
        case 'gravity_up':   fy -= s * (0.5 + p2 * 1.5); break;
        case 'transpose': {
          if (state.tick % 45 === (i * 5) % 45) {
            const semis = Math.round((p2 - 0.5) * 24); // 0..1 → -12..+12
            q.pitch = Math.max(24, Math.min(108, q.pitch + semis));
          }
          break;
        }
        case 'harmonize_zone':
          if (state.tick % 60 === (i * 7) % 60)
            q.pitch = quantizeToScale(q.pitch, preset.root, preset.scale);
          break;
        case 'bounce': {
          if (rng() < s * 0.04 * dt * 60) {
            const a = rng() * Math.PI * 2;
            q.vx += Math.cos(a) * (0.05 + p2 * 0.2);
            q.vy += Math.sin(a) * (0.05 + p2 * 0.2);
          }
          break;
        }
        case 'compress_zone': {
          const cx3 = zone.pts.reduce((a, pt) => a + pt[0], 0) / zone.pts.length;
          const cy3 = zone.pts.reduce((a, pt) => a + pt[1], 0) / zone.pts.length;
          fx += (cx3 - q.x) * s * (0.25 + p2 * 0.5);
          fy += (cy3 - q.y) * s * (0.25 + p2 * 0.5);
          break;
        }
        case 'scatter_zone': {
          if (rng() < s * 0.02 * dt * 60) {
            q.x += rng2() * 0.04; q.y += rng2() * 0.04;
          }
          break;
        }
        // ── Patch 01.2 — New FX Zone effects ──────────────────────────────────
        case 'glitch': {
          if (rng() < s * 0.025 * dt * 60) {
            q.x += rng2() * (0.06 + p2 * 0.20);
            q.y += rng2() * (0.06 + p2 * 0.20);
            q.vx += rng2() * s * 0.08;
            q.vy += rng2() * s * 0.08;
          }
          break;
        }
        case 'tremolo': {
          // Charge oscillation at audio rate (amplitude modulation)
          const depth = s * (0.3 + p2 * 0.7);
          q.charge = Math.max(0, Math.min(1,
            q.charge + Math.sin(state.elapsed * (8 + p2 * 24) + q.phase * 4) * depth * 0.04 * dt * 60,
          ));
          break;
        }
        case 'pulse_beat': {
          // Beat-synced pull toward zone center + charge excite on peak
          const beat = Math.max(0, Math.sin(state.elapsed * (state.bpm / 60) * Math.PI * 2));
          const force = s * (0.3 + p2 * 0.7) * beat * beat;
          const pcx = zone.pts.reduce((a, pt) => a + pt[0], 0) / zone.pts.length;
          const pcy = zone.pts.reduce((a, pt) => a + pt[1], 0) / zone.pts.length;
          fx += (pcx - q.x) * force;
          fy += (pcy - q.y) * force;
          if (beat > 0.85) q.charge = Math.min(1, q.charge + s * 0.010);
          break;
        }
        case 'warp': {
          // Standing-wave velocity distortion field
          const wX = Math.sin(q.y * (6 + p2 * 10) + state.elapsed * 1.5) * s * (0.15 + p2 * 0.35);
          const wY = Math.cos(q.x * (6 + p2 * 10) + state.elapsed * 1.5) * s * (0.15 + p2 * 0.35);
          fx += wX; fy += wY;
          break;
        }
        case 'phase_lock': {
          // Synchronizes phases toward param-defined target
          const pTarget = p2 * Math.PI * 2;
          const pDiff = Math.sin(q.phase * Math.PI * 2 - pTarget);
          q.phase = (q.phase - pDiff * s * 0.04 * dt * 60 + 1) % 1;
          break;
        }
        case 'role_shift': {
          // Probability-based role mutation toward param-indexed role
          if (q.roleLockTimer <= 0 && rng() < s * 0.004 * dt * 60) {
            const rls: VoiceRole[] = ['KICK','BASS','PERC','PAD','LEAD','ARP','STRINGS','CHOIR'];
            q.role = rls[Math.min(Math.floor(p2 * rls.length), rls.length - 1)];
            q.hue = ROLE_HUES[q.role];
            q.roleLockTimer = 2.0;
          }
          break;
        }
        case 'density_wave': {
          // Spiral density-wave compression
          const r2 = Math.sqrt(q.x * q.x + q.y * q.y) + 0.001;
          const wave = Math.sin(r2 * (8 + p2 * 16) - state.elapsed * 2) * s * 0.12;
          fx += (q.x / r2) * wave;
          fy += (q.y / r2) * wave;
          break;
        }
      }
    }

    if (preset.trailLen>0) {
      q.trailX.push(q.x); q.trailY.push(q.y);
      const over = q.trailX.length - preset.trailLen;
      if (over > 16) { q.trailX.splice(0, over); q.trailY.splice(0, over); }
    }
  }

  // ── Harmonic Strings collision ────────────────────────────────────────────
  for (const hs of (state.strings ?? [])) {
    hs.lastHit = Math.max(0, hs.lastHit - dt);
    hs.vibPhase = (hs.vibPhase + (2 + hs.tension * 4) * dt) % (Math.PI * 2);
    hs.vibAmp *= Math.pow(1 - hs.decay * 0.8, dt * 60);
    if (hs.vibAmp < 0.001) hs.vibAmp = 0;

    if (hs.lastHit > 0) continue; // cooldown

    for (let i = 0; i < state.count; i++) {
      const q = state.quanta[i];
      if (!segsCross(q.prevX, q.prevY, q.x, q.y, hs.x1, hs.y1, hs.x2, hs.y2)) continue;
      // Reflect velocity off string
      const sdx = hs.x2 - hs.x1, sdy = hs.y2 - hs.y1;
      const slen = Math.sqrt(sdx*sdx + sdy*sdy) + 0.001;
      const nx = -sdy/slen, ny = sdx/slen;
      const dot = q.vx*nx + q.vy*ny;
      q.vx -= 2*dot*nx * 0.75;
      q.vy -= 2*dot*ny * 0.75;
      q.x = q.prevX; q.y = q.prevY; // push back

      // Excite string
      hs.vibAmp = Math.min(1, hs.vibAmp + q.charge * 0.45);
      hs.lastHit = 0.08;

      // Fire harmonic note via STRINGS role
      if (q.cooldown <= 0) {
        const strLen = Math.sqrt((hs.x2-hs.x1)**2 + (hs.y2-hs.y1)**2);
        const basePitch = quantizeToScale(
          Math.round(52 + (1 - Math.min(1, strLen / 1.5)) * 26),
          0, 'chromatic',
        );
        const harmonicOffset = [0, 12, 19, 24][Math.floor(Math.random() * 4)];
        const pitch = Math.min(108, basePitch + harmonicOffset);
        const cfg = preset.roles['STRINGS'];
        if (cfg) {
          onNote({ pitch, velocity: 0.5 + q.charge*0.4, role: 'STRINGS',
            x: (hs.x1+hs.x2)/2, y: (hs.y1+hs.y2)/2,
            duration: 0.6 + hs.tension * 1.2, timbre: 0.65 }, cfg);
          q.cooldown = 0.12;
          spawnRipple(state, { pitch, velocity: 0.6, role: 'STRINGS',
            x: (hs.x1+hs.x2)/2, y: (hs.y1+hs.y2)/2, duration: 0.2, timbre: 0.7 }, hs.color);
        }
      }
      break; // only first collision per string per frame
    }
  }

  // ── Sequencer tick ────────────────────────────────────────────────────────
  if (state.sequencer.active) {
    tickSequencer(state, preset, dt, onNote);
  }

  // ── Phase entrainment ─────────────────────────────────────────────────────
  if (state.tick%3===0) {
    const str=phys.entainment*dt;
    for (let i=0;i<n;i++) {
      const qi=state.quanta[i];
      for (let j=i+1;j<Math.min(i+8,n);j++) {
        const qj=state.quanta[j];
        const dx=qi.x-qj.x,dy=qi.y-qj.y;
        if (dx*dx+dy*dy<.09) {
          const diff=((qj.phase-qi.phase+1.5)%1)-.5;
          qi.phase=(qi.phase+diff*str*.5+1)%1;
          qj.phase=(qj.phase-diff*str*.5+1)%1;
        }
      }
    }
  }

  if (state.tick%8===0) {
    let sin=0,cos=0;
    for (let i=0;i<n;i++) {
      sin+=Math.sin(state.quanta[i].phase*Math.PI*2);
      cos+=Math.cos(state.quanta[i].phase*Math.PI*2);
    }
    state.syncIntensity=Math.sqrt(sin*sin+cos*cos)/n;
  }

  if (state.tick%4===0 && (phys.energyTransfer>0 || phys.mutationRate>0)) {
    const xR2=(preset.encounterR*1.6)*(preset.encounterR*1.6);
    for (let i=0;i<n;i++) {
      const qi=state.quanta[i];
      for (let j=i+1;j<Math.min(i+10,n);j++) {
        const qj=state.quanta[j];
        const dx=qi.x-qj.x, dy=qi.y-qj.y;
        if (dx*dx+dy*dy>xR2) continue;
        if (phys.energyTransfer>0) {
          const delta=(qi.charge-qj.charge)*phys.energyTransfer*dt*4;
          qi.charge=Math.max(0,Math.min(1,qi.charge-delta));
          qj.charge=Math.max(0,Math.min(1,qj.charge+delta));
        }
        if (phys.mutationRate>0 && qi.roleLockTimer<=0 && qj.roleLockTimer<=0) {
          const dvx=qi.vx-qj.vx, dvy=qi.vy-qj.vy;
          const relV=Math.sqrt(dvx*dvx+dvy*dvy);
          if (relV>.18 && rng()<phys.mutationRate*dt*8) {
            const target = qi.charge < qj.charge ? qi : qj;
            const source = qi.charge < qj.charge ? qj : qi;
            target.role = source.role;
            target.hue  = ROLE_HUES[source.role];
            target.mutations++;
            target.roleLockTimer=2.0;
            state.emergent.push({type:'mutation',x:target.x,y:target.y,r:.08,alpha:1.0,color:'#ffffff'});
          }
        }
      }
    }
  }

  for (let i=0;i<n;i++) {
    const q=state.quanta[i];
    if (q.charge>0.90) {
      q.dischargeTimer+=dt;
      if (q.dischargeTimer>0.45) {
        q.dischargeTimer=0;
        const oldCharge=q.charge;
        q.charge=0.15;
        for (let j=0;j<n;j++) {
          if (j===i) continue;
          const qj=state.quanta[j];
          const dx=q.x-qj.x, dy=q.y-qj.y;
          const d2=dx*dx+dy*dy;
          if (d2<.18&&d2>.0001) {
            const d=Math.sqrt(d2);
            qj.vx+=(qj.x-q.x)/d*.12*oldCharge;
            qj.vy+=(qj.y-q.y)/d*.12*oldCharge;
            qj.charge=Math.min(1,qj.charge+oldCharge*.15);
          }
        }
        const cfg=preset.roles[q.role];
        if (cfg && !phys.physicsOnly) {
          onNote({pitch:q.pitch,velocity:0.85,role:q.role,x:q.x,y:q.y,
            duration: noteDur(cfg.envelope),
            timbre:1.0, timbreIdx:q.timbreIdx},cfg);
          q.recentlyFired=1.0;
          q.cooldown=Math.max(cfg.cooldownMin*1.5,.3);
        }
        state.emergent.push({type:'discharge',x:q.x,y:q.y,r:.05,alpha:1.0,color:'#ffff80'});
        spawnRipple(state,{pitch:q.pitch,velocity:.85,role:q.role,x:q.x,y:q.y,duration:.3,timbre:1},'#ffff80');
      }
    } else {
      q.dischargeTimer=Math.max(0,q.dischargeTimer-dt*2);
    }
  }

  for (let i=state.emergent.length-1;i>=0;i--) {
    const e=state.emergent[i];
    e.r    +=dt*.4;
    e.alpha-=dt*2.5;
    if (e.alpha<=0) state.emergent.splice(i,1);
  }

  const globalCd=60/(state.bpm*preset.eventRate*4+.001);
  for (const gate of state.gates) {
    if (gate.cooldown>0) { gate.cooldown-=dt; continue; }
    const gateType: GateType = gate.type ?? 'gate';

    for (let i=0;i<n;i++) {
      const q=state.quanta[i];
      if (q.cooldown>0 && gateType==='gate') continue;
      if (!segsCross(q.prevX,q.prevY,q.x,q.y, gate.x1,gate.y1,gate.x2,gate.y2)) continue;
      const cfg=preset.roles[q.role];
      if (!cfg) continue;

      if (gateType === 'mirror') {
        // ── Specular reflection — no note ──────────────────────────────────
        const ldx=gate.x2-gate.x1, ldy=gate.y2-gate.y1;
        const llen=Math.sqrt(ldx*ldx+ldy*ldy)+0.0001;
        const nx=-ldy/llen, ny=ldx/llen;
        const dot=q.vx*nx+q.vy*ny;
        q.vx -= 2*dot*nx;
        q.vy -= 2*dot*ny;
        q.x = q.prevX; q.y = q.prevY;  // push back to avoid tunneling
        spawnRipple(state,{pitch:q.pitch,velocity:.25,role:q.role,x:q.x,y:q.y,duration:.08,timbre:.15},gate.color);
        break;

      } else if (gateType === 'absorber') {
        // ── Drain energy + velocity ─────────────────────────────────────────
        q.charge = Math.max(0, q.charge * 0.07);
        q.vx *= 0.12; q.vy *= 0.12;
        q.recentlyFired = 0.45;
        gate.cooldown = globalCd * 0.08;
        spawnRipple(state,{pitch:q.pitch,velocity:.28,role:q.role,x:q.x,y:q.y,duration:.18,timbre:.05},gate.color);
        break;

      } else if (gateType === 'membrane') {
        // ── One-way: blocks from positive-normal side only ──────────────────
        const ldx=gate.x2-gate.x1, ldy=gate.y2-gate.y1;
        const llen=Math.sqrt(ldx*ldx+ldy*ldy)+0.0001;
        const nx=-ldy/llen, ny=ldx/llen;
        const prevSide=(q.prevX-gate.x1)*nx+(q.prevY-gate.y1)*ny;
        if (prevSide > 0) {
          // Came from "left" (blocked side) → reflect with slight damping
          const dot=q.vx*nx+q.vy*ny;
          q.vx -= 2*dot*nx*0.84;
          q.vy -= 2*dot*ny*0.84;
          q.x = q.prevX; q.y = q.prevY;
          spawnRipple(state,{pitch:q.pitch,velocity:.20,role:q.role,x:q.x,y:q.y,duration:.08,timbre:.2},gate.color);
        }
        // else: came from "right" side → passes through freely
        break;

      } else {
        // ── Original gate: trigger note ────────────────────────────────────
        if (q.cooldown>0) break;
        const vel=.55+q.charge*.45;
        const dur = noteDur(cfg.envelope);
        onNote({pitch:q.pitch,velocity:vel,role:q.role,x:q.x,y:q.y,duration:dur,timbre:q.brightness,timbreIdx:q.timbreIdx},cfg);
        q.cooldown=Math.max(cfg.cooldownMin,globalCd);
        q.recentlyFired=.8;
        gate.cooldown=globalCd*.3;
        spawnRipple(state,{pitch:q.pitch,velocity:vel,role:q.role,x:q.x,y:q.y,duration:dur,timbre:q.brightness},gate.color);
        break;
      }
    }
  }

  if (!phys.physicsOnly && state.syncIntensity>preset.syncThreshold && state.tick%12===0) {
    for (let i=0;i<n;i++) {
      const q=state.quanta[i];
      if (q.cooldown>0||q.phase>.08) continue;
      const cfg=preset.roles[q.role];
      if (!cfg) continue;
      const vel=.45+state.syncIntensity*.4;
      onNote({pitch:q.pitch,velocity:vel,role:q.role,x:q.x,y:q.y,
        duration:noteDur(cfg.envelope),timbre:q.brightness,timbreIdx:q.timbreIdx},cfg);
      q.cooldown=Math.max(cfg.cooldownMin*1.5,globalCd*2);
      q.recentlyFired=.6;
      break;
    }
  }

  if (!phys.physicsOnly && state.tick%4===0) {
    const r2=preset.encounterR*preset.encounterR;
    let enc=0;
    for (let i=0;i<n&&enc<3;i++) {
      const qi=state.quanta[i];
      if (qi.cooldown>0) continue;
      for (let j=i+1;j<n&&enc<3;j++) {
        const qj=state.quanta[j];
        if (qj.cooldown>0) continue;
        const dx=qi.x-qj.x,dy=qi.y-qj.y;
        if (dx*dx+dy*dy>=r2) continue;
        const cons=consonanceScore(qi.pitch,qj.pitch);
        if (preset.harmonyMode==='consonant'&&cons<.5) continue;
        if (preset.harmonyMode==='dissonant'&&cons>.5) continue;
        const cfg=preset.roles[qi.role];
        if (!cfg) continue;
        const vel=.35+qi.charge*.4;
        const dur = noteDur(cfg.envelope);
        onNote({pitch:qi.pitch,velocity:vel,role:qi.role,x:qi.x,y:qi.y,duration:dur,timbre:qi.brightness,timbreIdx:qi.timbreIdx},cfg);
        qi.cooldown=Math.max(cfg.cooldownMin*2,globalCd*3);
        qi.recentlyFired=.5;
        enc++;
        break;
      }
    }
  }

  for (let i=state.ripples.length-1;i>=0;i--) {
    const rp=state.ripples[i];
    rp.r+=.55*dt; rp.alpha-=dt*1.8;
    if (rp.alpha<=0||rp.r>rp.maxR) state.ripples.splice(i,1);
  }
}

// ── Quantum Sequencer tick ────────────────────────────────────────────────────
function tickSequencer(
  state:  MusicState,
  preset: MusicPreset,
  dt:     number,
  onNote: (ev: NoteEvent, cfg: RoleConfig) => void,
): void {
  const seq  = state.sequencer;
  const prev = seq.cursor;
  const qLen = state.quanta.length;
  if (qLen === 0) return;

  // ── Advance cursor (1 full revolution = 1 musical bar × tempoMult) ────────
  const barsPerSec = state.bpm / 240;           // bars per second at this BPM
  const delta      = seq.tempoMult * barsPerSec * dt;
  seq.cursor       = (seq.cursor + delta) % 1;

  // ── Decay per-step cooldowns ──────────────────────────────────────────────
  for (let si = 0; si < seq.stepCd.length; si++) {
    if (seq.stepCd[si] > 0) seq.stepCd[si] -= dt;
  }

  const nSteps = seq.steps.length;

  for (let si = 0; si < nSteps; si++) {
    const step = seq.steps[si];
    if (!step.armed) continue;

    // Ensure stepCd array is long enough (may be stale after resize)
    if (seq.stepCd.length <= si) seq.stepCd.push(0);
    if (seq.stepCd[si] > 0) continue;

    const stepFrac = si / nSteps;   // 0..1 position on the ring

    // ── Did cursor sweep past this step this frame? ───────────────────────
    let crossed: boolean;
    if (seq.cursor >= prev) {
      // Normal advance (no wrap-around)
      crossed = stepFrac >= prev && stepFrac < seq.cursor;
    } else {
      // Cursor wrapped past 1.0 → 0.0
      crossed = stepFrac >= prev || stepFrac < seq.cursor;
    }
    if (!crossed) continue;

    // ── Step world-position on ring ───────────────────────────────────────
    const ang = stepFrac * Math.PI * 2 - Math.PI * 0.5;  // start top
    const sx  = seq.x + seq.ringR * Math.cos(ang);
    const sy  = seq.y + seq.ringR * Math.sin(ang);

    // ── Find GLOBALLY nearest quantum (no hard cutoff — always fires) ────
    // Quantum "uncertainty" = which particle is nearest changes chaotically
    let nearest: MusicQuantum | null = null;
    let nearestD2 = Infinity;
    for (let i = 0; i < qLen; i++) {
      const q   = state.quanta[i];
      const dx  = q.x - sx;
      const dy  = q.y - sy;
      const d2  = dx * dx + dy * dy;
      if (d2 < nearestD2) { nearestD2 = d2; nearest = q; }
    }
    if (!nearest) continue;

    const cfg = preset.roles[nearest.role];
    if (!cfg) continue;

    const pitch = Math.max(0, Math.min(127, nearest.pitch + step.pitchOff));
    const vel   = step.vel > 0 ? step.vel : Math.min(1, 0.45 + nearest.charge * 0.55);
    const dur   = noteDur(cfg.envelope);

    onNote({ pitch, velocity: vel, role: nearest.role,
             x: nearest.x, y: nearest.y, duration: dur, timbre: nearest.brightness, timbreIdx: nearest.timbreIdx }, cfg);

    nearest.recentlyFired = 0.5;
    seq.stepCd[si] = Math.max(0.04, 60 / state.bpm / nSteps * 0.8);

    // Visual ripple at the step position on the ring
    spawnRipple(state,
      { pitch, velocity: vel, role: nearest.role, x: sx, y: sy, duration: 0.2, timbre: 0.8 },
      '#aaddff88');
  }
}