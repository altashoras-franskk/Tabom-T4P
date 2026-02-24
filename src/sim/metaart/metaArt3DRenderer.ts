// ─── Meta-Arte: 3D WebGL Renderer ────────────────────────────────────────────
// Pure WebGL1, zero external deps.
//
// Render pipeline:
//   P-1 — Solid filled shapes (normal blend, base layer)
//   P0  — Trail lines + connection threads + 3D primitives (additive neon)
//   P1  — Far glow halo  (additive, 3.6× size, very faint)
//   P2  — Mid glow halo  (additive, 2.0× size, moderate)
//   P3  — Crisp discs    (normal blend — final sharp particles)
//
// NEW in this revision:
//   • Memory trail rendering (respects dna.genes.memory + linear/Rhizome)
//   • DNA gene effects on particles (contrast, rhythm, entropy, fragmentation)
//   • Overlay flags (connections, glow) wired to dedicated passes
//   • Solid shapes decoupled from wireframe toggle (solidShapes3D vs showGeoShapes)
//   • Rhizome mode: high linear gene → crisp straight trail lines

import type { Quantum, DNA, GeoParams, OverlayFlags } from './metaArtTypes';

// ─── Types ────────────────────────────────────────────────────────────────────
type M16 = Float32Array;

interface GlBundle {
  prog: WebGLProgram;
  u: Record<string, WebGLUniformLocation | null>;
  a: Record<string, number>;
}

// ─── Matrix math (column-major / OpenGL convention) ──────────────────────────
function perspective(fovDeg: number, aspect: number, near: number, far: number): M16 {
  const f  = 1 / Math.tan((fovDeg * Math.PI) / 360);
  const nf = 1 / (near - far);
  const m  = new Float32Array(16);
  m[0] = f / aspect;  m[5] = f;
  m[10] = (far + near) * nf;  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}

function lookAtMat(ex: number, ey: number, ez: number,
                   cx: number, cy: number, cz: number): M16 {
  let fx = cx - ex, fy = cy - ey, fz = cz - ez;
  const fl = Math.sqrt(fx*fx + fy*fy + fz*fz) || 1;
  fx /= fl; fy /= fl; fz /= fl;

  let sx = -fz, sy = 0, sz = fx;
  const sl = Math.sqrt(sx*sx + sz*sz) || 1;
  sx /= sl; sz /= sl;

  const ux = sy*fz - sz*fy;
  const uy = sz*fx - sx*fz;
  const uz = sx*fy - sy*fx;

  const m = new Float32Array(16);
  m[0]=sx; m[1]=ux; m[2]=-fx;
  m[4]=sy; m[5]=uy; m[6]=-fy;
  m[8]=sz; m[9]=uz; m[10]=-fz;
  m[12]=-(sx*ex+sy*ey+sz*ez);
  m[13]=-(ux*ex+uy*ey+uz*ez);
  m[14]=  fx*ex+fy*ey+fz*ez;
  m[15]=1;
  return m;
}

function mulMat(a: M16, b: M16): M16 {
  const r = new Float32Array(16);
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k*4+row] * b[col*4+k];
      r[col*4+row] = s;
    }
  return r;
}

// ─── GLSL ─────────────────────────────────────────────────────────────────────

const VERT_PT = `
attribute vec3  a_pos;
attribute vec4  a_color;
attribute float a_size;
uniform   mat4  u_mvp;
uniform   float u_ptScale;
uniform   float u_alphaScale;
varying   vec4  v_color;
void main() {
  vec4 clip    = u_mvp * vec4(a_pos, 1.0);
  gl_Position  = clip;
  float w      = max(0.12, clip.w);
  gl_PointSize = max(1.0, u_ptScale * a_size / w);
  v_color      = vec4(a_color.rgb, a_color.a * u_alphaScale);
}`;

/** Glow fragment — soft exponential falloff → additive nebula effect. */
const FRAG_GLOW = `
precision mediump float;
varying vec4 v_color;
void main() {
  vec2  c  = gl_PointCoord - 0.5;
  float r2 = dot(c, c) * 4.0;
  float a  = exp(-r2 * 2.6);
  if (a < 0.005) discard;
  gl_FragColor = vec4(v_color.rgb, v_color.a * a);
}`;

/** Crisp fragment — hard disc with anti-alias rim. */
const FRAG_CRISP = `
precision mediump float;
varying vec4 v_color;
void main() {
  vec2  c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float a = 1.0 - smoothstep(0.55, 1.0, r);
  if (a < 0.01) discard;
  gl_FragColor = vec4(v_color.rgb, v_color.a * a);
}`;

const VERT_LINE = `
attribute vec3 a_pos;
attribute vec4 a_color;
uniform   mat4 u_mvp;
varying   vec4 v_color;
void main() {
  gl_Position = u_mvp * vec4(a_pos, 1.0);
  v_color     = a_color;
}`;
const FRAG_LINE = `
precision mediump float;
varying vec4 v_color;
void main() { gl_FragColor = v_color; }`;

// ─── Constants ────────────────────────────────────────────────────────────────
const VSTRIDE_PT   = 8;
const VSTRIDE_LINE = 7;
const VSTRIDE_TRI  = 7;
const MAX_PT       = 4096;
const MAX_LN       = 32000;   // enlarged for trails + arc/rect + connections
const MAX_TRI      = 14000;
const ARC_SEGS     = 12;
const ORBIT_RESUME_MS = 2500;

// ─── MetaArt3DRenderer ────────────────────────────────────────────────────────
export class MetaArt3DRenderer {
  private gl:      WebGLRenderingContext | null = null;
  private glowB:   GlBundle | null = null;
  private crispB:  GlBundle | null = null;
  private lineB:   GlBundle | null = null;
  private ptBuf:   WebGLBuffer | null = null;
  private lnBuf:   WebGLBuffer | null = null;
  private triBuf:  WebGLBuffer | null = null;
  private canvas:  HTMLCanvasElement;

  private ptData  = new Float32Array(MAX_PT  * VSTRIDE_PT);
  private lnData  = new Float32Array(MAX_LN  * VSTRIDE_LINE);
  private triData = new Float32Array(MAX_TRI * VSTRIDE_TRI);

  // ── Orbital camera ────────────────────────────────────────────────────────
  theta   = 0.4;   phi    = 0.22;   radius  = 2.9;
  tTheta  = 0.4;   tPhi   = 0.22;   tRadius = 2.9;

  private lastW = 0;  private lastH = 0;
  private dragging     = false;
  private dragX        = 0;  private dragY = 0;
  private twoFingerDist = 0;
  private _dragEndTime  = 0;

  private _md: (e: MouseEvent)  => void;
  private _mm: (e: MouseEvent)  => void;
  private _mu: (e: MouseEvent)  => void;
  private _mw: (e: WheelEvent)  => void;
  private _ts: (e: TouchEvent)  => void;
  private _tm: (e: TouchEvent)  => void;
  private _te: (e: TouchEvent)  => void;
  private _dd: (e: MouseEvent)  => void;

  get isReady(): boolean {
    return !!(this.gl && this.glowB && this.crispB && this.lineB);
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this._md = (e: MouseEvent) => {
      if (e.button !== 0) return;
      this.dragging = true;
      this.dragX = e.clientX; this.dragY = e.clientY;
      e.preventDefault();
    };
    this._mm = (e: MouseEvent) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.dragX, dy = e.clientY - this.dragY;
      this.dragX = e.clientX; this.dragY = e.clientY;
      this.tTheta -= dx * 0.006;
      this.tPhi    = clampPhi(this.tPhi + dy * 0.005);
    };
    this._mu = () => {
      this.dragging = false;
      this._dragEndTime = performance.now();
    };
    this._mw = (e: WheelEvent) => {
      const s = e.deltaY > 0 ? 1.12 : 0.89;
      this.tRadius = clamp(this.tRadius * s, 0.6, 9.0);
      e.preventDefault();
    };
    this._dd = (e: MouseEvent) => {
      e.preventDefault();
      this.resetCamera();
    };

    this._ts = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        this.dragging = true;
        this.dragX = e.touches[0].clientX; this.dragY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        this.twoFingerDist = touchDist(e);
      }
    };
    this._tm = (e: TouchEvent) => {
      if (e.touches.length === 1 && this.dragging) {
        const dx = e.touches[0].clientX - this.dragX;
        const dy = e.touches[0].clientY - this.dragY;
        this.dragX = e.touches[0].clientX; this.dragY = e.touches[0].clientY;
        this.tTheta -= dx * 0.006;
        this.tPhi    = clampPhi(this.tPhi + dy * 0.005);
      } else if (e.touches.length === 2 && this.twoFingerDist > 0) {
        const d = touchDist(e);
        const s = this.twoFingerDist / Math.max(1, d);
        this.tRadius = clamp(this.tRadius * (0.5 + s * 0.5), 0.6, 9.0);
        this.twoFingerDist = d;
      }
      e.preventDefault();
    };
    this._te = () => {
      this.dragging = false;
      this._dragEndTime = performance.now();
      this.twoFingerDist = 0;
    };

    const gl = canvas.getContext('webgl', {
      alpha: true, antialias: true, premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    }) as WebGLRenderingContext | null;

    if (!gl) { console.warn('[MetaArt3D] WebGL unavailable'); return; }
    this.gl = gl;

    const PT_U = ['u_mvp', 'u_ptScale', 'u_alphaScale'];
    const PT_A = ['a_pos', 'a_color', 'a_size'];
    const LN_U = ['u_mvp'];
    const LN_A = ['a_pos', 'a_color'];

    this.glowB  = buildBundle(gl, VERT_PT,   FRAG_GLOW,  PT_U, PT_A);
    this.crispB = buildBundle(gl, VERT_PT,   FRAG_CRISP, PT_U, PT_A);
    this.lineB  = buildBundle(gl, VERT_LINE, FRAG_LINE,  LN_U, LN_A);
    this.ptBuf  = gl.createBuffer();
    this.lnBuf  = gl.createBuffer();
    this.triBuf = gl.createBuffer();
  }

  resetCamera(): void {
    this.tTheta  = 0.4;
    this.tPhi    = 0.22;
    this.tRadius = 2.9;
  }

  attachHandlers(): void {
    const c = this.canvas;
    c.addEventListener('mousedown',  this._md,  { passive: false });
    c.addEventListener('mousemove',  this._mm);
    c.addEventListener('mouseup',    this._mu);
    c.addEventListener('mouseleave', this._mu);
    c.addEventListener('wheel',      this._mw,  { passive: false });
    c.addEventListener('dblclick',   this._dd,  { passive: false });
    c.addEventListener('touchstart', this._ts,  { passive: false });
    c.addEventListener('touchmove',  this._tm,  { passive: false });
    c.addEventListener('touchend',   this._te);
  }

  detachHandlers(): void {
    const c = this.canvas;
    c.removeEventListener('mousedown',  this._md);
    c.removeEventListener('mousemove',  this._mm);
    c.removeEventListener('mouseup',    this._mu);
    c.removeEventListener('mouseleave', this._mu);
    c.removeEventListener('wheel',      this._mw);
    c.removeEventListener('dblclick',   this._dd);
    c.removeEventListener('touchstart', this._ts);
    c.removeEventListener('touchmove',  this._tm);
    c.removeEventListener('touchend',   this._te);
  }

  resize(w: number, h: number): void {
    if (w === this.lastW && h === this.lastH) return;
    this.lastW = w; this.lastH = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width  = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  // ── Main render ──────────────────────────────────────────────────────────
  render(
    quanta: Quantum[],
    dna: DNA,
    params: GeoParams,
    W: number, H: number,
    tick: number,
    overlays?: OverlayFlags,
  ): void {
    const gl = this.gl;
    if (!gl || !this.isReady || !this.ptBuf || !this.lnBuf || !this.triBuf) return;
    const cW = this.canvas.width, cH = this.canvas.height;
    if (cW === 0 || cH === 0) return;

    const glowB  = this.glowB!;
    const crispB = this.crispB!;
    const lineB  = this.lineB!;

    // ── Camera lerp + auto-orbit ─────────────────────────────────────────────
    const orbitSpeed = (params.orbitSpeed ?? 0.2) * 0.0014;
    if (!this.dragging) {
      const orbitReady = this._dragEndTime === 0 ||
        (performance.now() - this._dragEndTime) > ORBIT_RESUME_MS;
      if (orbitReady) this.tTheta += orbitSpeed;
    }
    this.theta  += (this.tTheta  - this.theta)  * 0.07;
    this.phi    += (this.tPhi    - this.phi)     * 0.06;
    this.radius += (this.tRadius - this.radius)  * 0.05;

    // ── MVP matrix ──────────────────────────────────────────────────────────
    const fov  = params.camFOV ?? 55;
    const cPhi = Math.cos(this.phi);
    const ex = this.radius * cPhi * Math.sin(this.theta);
    const ey = this.radius * Math.sin(this.phi);
    const ez = this.radius * cPhi * Math.cos(this.theta);
    const view = lookAtMat(ex, ey, ez, 0, 0, 0);
    const proj = perspective(fov, cW / cH, 0.05, 30);
    const mvp  = mulMat(proj, view);

    // ── GL state ─────────────────────────────────────────────────────────────
    const [bgR, bgG, bgB] = hexRgbNorm(dna.background ?? '#060608');
    gl.clearColor(bgR * 0.35, bgG * 0.35, bgB * 0.45, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);

    // ── DNA gene parameters ───────────────────────────────────────────────────
    const contrastGene    = dna.genes.contrast    ?? 0.5;
    const rhythmGene      = dna.genes.rhythm      ?? 0.3;
    const entropyGene     = dna.genes.entropy     ?? 0.3;
    const fragmentGene    = dna.genes.fragmentation ?? 0.3;
    const memoryGene      = dna.genes.memory      ?? 0.5;
    const isRhizome       = (dna.genes.linear     ?? 0) > 0.4;
    const linearGene      = dna.genes.linear      ?? 0;

    // ── Build particle buffer ─────────────────────────────────────────────────
    const zDepth    = params.zDepth        ?? 1.0;
    const waveZ     = params.waveZ         ?? 0.3;
    const fogStr    = params.depthFog      ?? 0.3;
    const lightStr  = params.light3D       ?? 0.5;
    const ptSizeMul = params.particleSize3D ?? 1.0;
    const ptScale   = cH * 0.026 * ptSizeMul;

    const dofFactor = Math.max(0, fogStr - 0.25) * 1.6;

    const nQ = Math.min(quanta.length, MAX_PT);
    let ptCount = 0;

    for (let i = 0; i < nQ; i++) {
      const q = quanta[i];
      const wx = (q.x - 0.5) * 2.2;
      const wy = (q.y - 0.5) * -2.2;
      const wz = particleZ(q, zDepth, waveZ, tick);

      const dDist = Math.abs(wz) / Math.max(0.1, zDepth);
      const fogA  = 1.0 - fogStr * Math.min(1, dDist);

      // ── DNA contrast: exaggerate luminance per particle ──────────────────
      let litMod = q.lit;
      if (contrastGene > 0.3) {
        litMod = 0.5 + (q.lit - 0.5) * (1 + contrastGene * 1.5);
        litMod = Math.max(0.05, Math.min(0.95, litMod));
      }

      const lightBoost = 1.0 + lightStr * (0.5 - dDist * 0.4);
      let [r, g, b] = hslToRgb(q.hue, q.sat, litMod);
      r = Math.min(1, r * lightBoost);
      g = Math.min(1, g * lightBoost);
      b = Math.min(1, b * lightBoost);

      const baseAlpha = fogA * Math.min(1, q.ink * 2.8 + 0.4);

      const dofDist  = Math.abs(wz);
      const dofScale = 1 + dofFactor * dofDist * 0.9;
      const dofAlpha = 1 / (1 + dofFactor * dofDist * 0.55);

      // ── DNA rhythm: pulse size ───────────────────────────────────────────
      const rhythmPulse = rhythmGene > 0.2
        ? 1 + 0.35 * rhythmGene * Math.sin(tick * 0.06 * rhythmGene + q.hue * 0.1)
        : 1;

      // ── DNA entropy: stable per-particle size jitter ─────────────────────
      const entropyJit = entropyGene > 0.15
        ? 1 + (((q.age * 7 + 13) % 17) / 17 - 0.5) * entropyGene * 0.7
        : 1;

      // ── DNA fragmentation: alternating scale per species ─────────────────
      const fragScale = fragmentGene > 0.5
        ? (q.species % 2 === 0 ? 0.55 : 1.45)
        : 1.0;

      const size  = Math.max(1.5, q.size * (q.qscale ?? 1.0) * 2.0 * dofScale * rhythmPulse * entropyJit * fragScale);
      const alpha = baseAlpha * dofAlpha;

      const o = ptCount * VSTRIDE_PT;
      this.ptData[o]   = wx;
      this.ptData[o+1] = wy;
      this.ptData[o+2] = wz;
      this.ptData[o+3] = r;
      this.ptData[o+4] = g;
      this.ptData[o+5] = b;
      this.ptData[o+6] = alpha;
      this.ptData[o+7] = size;
      ptCount++;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.ptBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.ptData.subarray(0, ptCount * VSTRIDE_PT), gl.DYNAMIC_DRAW);

    // ── PASS −1: Solid filled shapes ─────────────────────────────────────────
    // FIXED: solidShapes3D is independent of showGeoShapes wireframe toggle
    if (params.solidShapes3D) {
      const triCount = buildPrimitiveTris(quanta, nQ, zDepth, waveZ, tick, W, params, this.triData);
      if (triCount > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuf!);
        gl.bufferData(gl.ARRAY_BUFFER, this.triData.subarray(0, triCount * VSTRIDE_TRI), gl.DYNAMIC_DRAW);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(lineB.prog);
        gl.uniformMatrix4fv(lineB.u['u_mvp'], false, mvp);
        setLnAttribs(gl, lineB);
        gl.drawArrays(gl.TRIANGLES, 0, triCount);
      }
    }

    // ── PASS 1 & 2: Glow halos (additive) ────────────────────────────────────
    const glowStr = params.glowIntensity3D ?? 0.5;
    const useGlow = overlays ? overlays.glow : glowStr > 0.01;
    const effectiveGlow = overlays?.glow ? Math.max(0.3, glowStr) : glowStr;

    if (useGlow && effectiveGlow > 0.01) {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(glowB.prog);
      gl.uniformMatrix4fv(glowB.u['u_mvp'], false, mvp);

      gl.uniform1f(glowB.u['u_ptScale'],    ptScale * 3.6);
      gl.uniform1f(glowB.u['u_alphaScale'], effectiveGlow * 0.055);
      setPtAttribs(gl, glowB);
      gl.drawArrays(gl.POINTS, 0, ptCount);

      gl.uniform1f(glowB.u['u_ptScale'],    ptScale * 2.0);
      gl.uniform1f(glowB.u['u_alphaScale'], effectiveGlow * 0.18);
      setPtAttribs(gl, glowB);
      gl.drawArrays(gl.POINTS, 0, ptCount);
    }

    // ── PASS 3: Crisp discs (normal blend) ───────────────────────────────────
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(crispB.prog);
    gl.uniformMatrix4fv(crispB.u['u_mvp'], false, mvp);
    gl.uniform1f(crispB.u['u_ptScale'],    ptScale);
    gl.uniform1f(crispB.u['u_alphaScale'], 1.0);
    setPtAttribs(gl, crispB);
    gl.drawArrays(gl.POINTS, 0, ptCount);

    // ── PASS 0 (rendered after crisp for overdraw): Lines, Trails, Wires ─────
    let lnCount = 0;

    // Connection lines (controlled by overlay or macroAtmosphere)
    const showConnections = overlays ? overlays.connections : false;
    const connOp = showConnections
      ? Math.max(0.4, clamp((params.macroAtmosphere ?? 0) * 0.55 + effectiveGlow * 0.35, 0, 0.85))
      : clamp((params.macroAtmosphere ?? 0) * 0.55 + (params.glowIntensity3D ?? 0.5) * 0.35, 0, 0.85);

    if (connOp > 0.02 && nQ > 2) {
      lnCount = buildConnectionLines(quanta, nQ, zDepth, waveZ, tick, connOp, this.lnData);
    }

    // ── Memory trails (NEW) ────────────────────────────────────────────────────
    const showTrails = params.trails3D ?? false;
    const trailLen   = params.trailLength3D ?? 3;

    // Auto-activate trails in Rhizome mode (linear > 0.5) or when trails3D is on
    if (showTrails || isRhizome) {
      const effectiveTrailLen = isRhizome ? 6 : trailLen;
      lnCount = buildTrailLines(
        quanta, nQ, zDepth, waveZ, tick, dna,
        effectiveTrailLen, isRhizome, linearGene, lnCount, this.lnData,
      );
    }

    // ── DNA memory: auto-activate short trails when memory gene is high ───────
    if (!showTrails && !isRhizome && memoryGene > 0.55) {
      const autoLen = Math.round(1 + (memoryGene - 0.55) * 10);
      lnCount = buildTrailLines(
        quanta, nQ, zDepth, waveZ, tick, dna,
        autoLen, false, linearGene, lnCount, this.lnData,
      );
    }

    // 3D primitives (wireframe geo shapes)
    if (params.showGeoShapes !== false) {
      lnCount = buildPrimitiveLines(quanta, nQ, zDepth, waveZ, tick, W, params, lnCount, this.lnData);
    }

    if (lnCount > 1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lnBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.lnData.subarray(0, lnCount * VSTRIDE_LINE), gl.DYNAMIC_DRAW);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(lineB.prog);
      gl.uniformMatrix4fv(lineB.u['u_mvp'], false, mvp);
      setLnAttribs(gl, lineB);
      gl.drawArrays(gl.LINES, 0, lnCount);
    }

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.flush();
  }

  dispose(): void {
    const gl = this.gl;
    if (!gl) return;
    [this.ptBuf, this.lnBuf, this.triBuf].forEach(b => b && gl.deleteBuffer(b));
    [this.glowB, this.crispB, this.lineB].forEach(b => { if (b) gl.deleteProgram(b.prog); });
    this.gl = null;
  }
}

// ─── GL program builder ───────────────────────────────────────────────────────
function buildBundle(
  gl: WebGLRenderingContext,
  vs: string, fs: string,
  uniformNames: readonly string[],
  attribNames: readonly string[],
): GlBundle | null {
  const prog = buildProg(gl, vs, fs);
  if (!prog) return null;
  const u: GlBundle['u'] = {};
  for (const n of uniformNames) u[n] = gl.getUniformLocation(prog, n);
  const a: GlBundle['a'] = {};
  for (const n of attribNames) a[n] = gl.getAttribLocation(prog, n);
  return { prog, u, a };
}

function buildProg(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram | null {
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[MetaArt3D] Shader error:', gl.getShaderInfoLog(s)); return null;
    }
    return s;
  };
  const v = compile(gl.VERTEX_SHADER, vs);
  const f = compile(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error('[MetaArt3D] Link error:', gl.getProgramInfoLog(p)); return null;
  }
  return p;
}

function setPtAttribs(gl: WebGLRenderingContext, b: GlBundle): void {
  const stride = VSTRIDE_PT * 4;
  const { a } = b;
  const pLoc = a['a_pos'], cLoc = a['a_color'], sLoc = a['a_size'];
  if (pLoc >= 0) { gl.enableVertexAttribArray(pLoc); gl.vertexAttribPointer(pLoc, 3, gl.FLOAT, false, stride, 0);  }
  if (cLoc >= 0) { gl.enableVertexAttribArray(cLoc); gl.vertexAttribPointer(cLoc, 4, gl.FLOAT, false, stride, 12); }
  if (sLoc >= 0) { gl.enableVertexAttribArray(sLoc); gl.vertexAttribPointer(sLoc, 1, gl.FLOAT, false, stride, 28); }
}

function setLnAttribs(gl: WebGLRenderingContext, b: GlBundle): void {
  const stride = VSTRIDE_LINE * 4;
  const { a } = b;
  const pLoc = a['a_pos'], cLoc = a['a_color'];
  if (pLoc >= 0) { gl.enableVertexAttribArray(pLoc); gl.vertexAttribPointer(pLoc, 3, gl.FLOAT, false, stride, 0);  }
  if (cLoc >= 0) { gl.enableVertexAttribArray(cLoc); gl.vertexAttribPointer(cLoc, 4, gl.FLOAT, false, stride, 12); }
}

// ─── Particle Z from simulation properties ────────────────────────────────────
function particleZ(q: Quantum, zDepth: number, waveZ: number, tick: number): number {
  const specZ   = (q.species / 6 - 0.5) * 0.55;
  const chargeZ = (q.charge  - 0.5) * 0.85;
  const wave    = Math.sin(q.age * 0.008 + q.hue * 0.035 + tick * 0.0007) * waveZ;
  return (chargeZ + specZ + wave) * zDepth;
}

// ─── Memory trail rendering (NEW) ────────────────────────────────────────────
// Draws memory trail lines for each quantum using its memX/memY buffer.
// In Rhizome mode (high linear), uses full 6-segment trails as crisp straight
// lines to create the rhizome aesthetic.
function buildTrailLines(
  quanta: Quantum[], nQ: number,
  zDepth: number, waveZ: number, tick: number,
  dna: DNA,
  trailLength: number,
  isRhizome: boolean,
  linearGene: number,
  lnStart: number,
  lnData: Float32Array,
): number {
  let lnCount = lnStart;
  const MEM_LEN = 6;
  const effectiveLen = Math.max(1, Math.min(MEM_LEN - 1, trailLength));

  // Subsample: avoid exceeding buffer
  const step = Math.max(1, Math.floor(nQ / 700));

  // Rhizome trails: higher alpha, full length, additive neon look
  const trailAlphaMul = isRhizome
    ? 0.55 + linearGene * 0.35
    : 0.25 + (dna.genes.memory ?? 0.5) * 0.35;

  for (let i = 0; i < nQ; i += step) {
    if (lnCount >= MAX_LN - MEM_LEN * 2 - 4) break;

    const q = quanta[i];
    if (q.role === 'FLOW' || q.role === 'MASK') continue;
    if (q.ink < 0.04) continue;

    const [r, g, b] = hslToRgb(q.hue, q.sat, Math.min(0.9, q.lit + (isRhizome ? 0.15 : 0.05)));
    const baseAlpha = q.ink * q.alpha * trailAlphaMul;
    if (baseAlpha < 0.01) continue;

    for (let seg = 0; seg < effectiveLen && lnCount < MAX_LN - 2; seg++) {
      // Oldest point first
      const idx1 = (q.memIdx + (MEM_LEN - effectiveLen + seg))     % MEM_LEN;
      const idx2 = (q.memIdx + (MEM_LEN - effectiveLen + seg + 1)) % MEM_LEN;

      const x1 = q.memX[idx1], y1 = q.memY[idx1];
      const x2 = q.memX[idx2], y2 = q.memY[idx2];

      // Skip boundary wraps (large positional jumps)
      if (Math.abs(x2 - x1) > 0.15 || Math.abs(y2 - y1) > 0.15) continue;

      const wx1 = (x1 - 0.5) * 2.2, wy1 = (y1 - 0.5) * -2.2;
      const wx2 = (x2 - 0.5) * 2.2, wy2 = (y2 - 0.5) * -2.2;
      const wz  = particleZ(q, zDepth, waveZ, tick);

      // Alpha fades from 0 (oldest) to full (newest)
      const t1 = seg       / effectiveLen;
      const t2 = (seg + 1) / effectiveLen;
      const a1 = baseAlpha * t1;
      const a2 = baseAlpha * t2;

      let o = lnCount * VSTRIDE_LINE;
      lnData[o]=wx1; lnData[o+1]=wy1; lnData[o+2]=wz;
      lnData[o+3]=r; lnData[o+4]=g; lnData[o+5]=b; lnData[o+6]=a1;
      lnCount++;
      o = lnCount * VSTRIDE_LINE;
      lnData[o]=wx2; lnData[o+1]=wy2; lnData[o+2]=wz;
      lnData[o+3]=r; lnData[o+4]=g; lnData[o+5]=b; lnData[o+6]=a2;
      lnCount++;
    }
  }
  return lnCount;
}

// ─── Proximity connection threads ────────────────────────────────────────────
function buildConnectionLines(
  quanta: Quantum[], nQ: number,
  zDepth: number, waveZ: number, tick: number,
  connOp: number,
  lnData: Float32Array,
): number {
  const MAX_DIST2 = 0.32 * 0.32;
  const step = Math.max(1, Math.floor(nQ / 600));
  let lnCount = 0;

  for (let i = 0; i < nQ - step && lnCount < MAX_LN - 2; i += step) {
    const qi = quanta[i], qj = quanta[i + step];
    const wx1 = (qi.x - 0.5) * 2.2, wy1 = (qi.y - 0.5) * -2.2;
    const wx2 = (qj.x - 0.5) * 2.2, wy2 = (qj.y - 0.5) * -2.2;
    const dx = wx2 - wx1, dy = wy2 - wy1;
    if (dx*dx + dy*dy > MAX_DIST2) continue;

    const wz1  = particleZ(qi, zDepth, waveZ, tick);
    const wz2  = particleZ(qj, zDepth, waveZ, tick);
    const dist = Math.sqrt(dx*dx + dy*dy);
    const a    = connOp * (1.0 - dist / 0.32) * 0.5;
    const [r1,g1,b1] = hslToRgb(qi.hue, qi.sat, qi.lit);
    const [r2,g2,b2] = hslToRgb(qj.hue, qj.sat, qj.lit);

    let o = lnCount * VSTRIDE_LINE;
    lnData[o]=wx1; lnData[o+1]=wy1; lnData[o+2]=wz1;
    lnData[o+3]=r1; lnData[o+4]=g1; lnData[o+5]=b1; lnData[o+6]=a;
    lnCount++;

    o = lnCount * VSTRIDE_LINE;
    lnData[o]=wx2; lnData[o+1]=wy2; lnData[o+2]=wz2;
    lnData[o+3]=r2; lnData[o+4]=g2; lnData[o+5]=b2; lnData[o+6]=a * 0.6;
    lnCount++;
  }
  return lnCount;
}

// ─── 3D wireframe geometric primitives ───────────────────────────────────────
function buildPrimitiveLines(
  quanta: Quantum[], nQ: number,
  zDepth: number, waveZ: number, tick: number,
  W: number, params: GeoParams,
  lnStart: number,
  lnData: Float32Array,
): number {
  let lnCount = lnStart;
  const baseAlpha  = Math.min(0.92, params.shapeOpacity ?? 0.85);
  const sceneScale = 2.2 / Math.max(1, W);
  const shapeScale = params.shapeScale ?? 1.0;

  for (let i = 0; i < nQ; i++) {
    if (lnCount >= MAX_LN - ARC_SEGS * 2 - 10) break;

    const q = quanta[i];
    if (q.kind !== 'line' && q.kind !== 'arc' &&
        q.kind !== 'rect' && q.kind !== 'plane') continue;

    const wx  = (q.x - 0.5) * 2.2;
    const wy  = (q.y - 0.5) * -2.2;
    const wz  = particleZ(q, zDepth, waveZ, tick);
    const [r, g, b] = hslToRgb(q.hue, q.sat, Math.min(0.95, q.lit + 0.12));

    if (q.kind === 'line') {
      const ang = q.angle ?? 0;
      const len = ((q.length ?? 40) * sceneScale) * (q.qscale ?? 1) * shapeScale;
      const cosA = Math.cos(ang) * len, sinA = Math.sin(ang) * len;

      let o = lnCount * VSTRIDE_LINE;
      lnData[o]=wx-cosA; lnData[o+1]=wy-sinA; lnData[o+2]=wz;
      lnData[o+3]=r; lnData[o+4]=g; lnData[o+5]=b; lnData[o+6]=baseAlpha;
      lnCount++;
      o = lnCount * VSTRIDE_LINE;
      lnData[o]=wx+cosA; lnData[o+1]=wy+sinA; lnData[o+2]=wz;
      lnData[o+3]=r; lnData[o+4]=g; lnData[o+5]=b; lnData[o+6]=baseAlpha * 0.7;
      lnCount++;
    }

    else if (q.kind === 'arc') {
      const radius   = ((q.length ?? 24) * sceneScale) * (q.qscale ?? 1) * shapeScale;
      const arcStart = q.angle ?? 0;
      const arcSpan  = Math.PI * 1.5;

      for (let seg = 0; seg < ARC_SEGS && lnCount < MAX_LN - 2; seg++) {
        const t1 = seg       / ARC_SEGS;
        const t2 = (seg + 1) / ARC_SEGS;
        const a1 = arcStart + t1 * arcSpan;
        const a2 = arcStart + t2 * arcSpan;
        const segAlpha = baseAlpha * (0.65 + 0.35 * (1 - t1));

        let o = lnCount * VSTRIDE_LINE;
        lnData[o]   = wx + Math.cos(a1) * radius;
        lnData[o+1] = wy + Math.sin(a1) * radius;
        lnData[o+2] = wz;
        lnData[o+3] = r; lnData[o+4] = g; lnData[o+5] = b; lnData[o+6] = segAlpha;
        lnCount++;
        o = lnCount * VSTRIDE_LINE;
        lnData[o]   = wx + Math.cos(a2) * radius;
        lnData[o+1] = wy + Math.sin(a2) * radius;
        lnData[o+2] = wz;
        lnData[o+3] = r; lnData[o+4] = g; lnData[o+5] = b; lnData[o+6] = segAlpha * 0.9;
        lnCount++;
      }
    }

    else if (q.kind === 'rect' || q.kind === 'plane') {
      const hw  = (q.qscale ?? 1) * shapeScale * 22 * sceneScale;
      const hh  = hw * 0.65;
      const ang = q.angle ?? 0;
      const cA  = Math.cos(ang), sA = Math.sin(ang);
      const fa  = q.kind === 'plane' ? baseAlpha * 0.60 : baseAlpha * 0.85;

      const cx = [
        wx + cA*hw - sA*hh,
        wx - cA*hw - sA*hh,
        wx - cA*hw + sA*hh,
        wx + cA*hw + sA*hh,
      ];
      const cy = [
        wy + sA*hw + cA*hh,
        wy - sA*hw + cA*hh,
        wy - sA*hw - cA*hh,
        wy + sA*hw - cA*hh,
      ];

      for (let e = 0; e < 4 && lnCount < MAX_LN - 2; e++) {
        const e2 = (e + 1) % 4;
        let o = lnCount * VSTRIDE_LINE;
        lnData[o]=cx[e]; lnData[o+1]=cy[e]; lnData[o+2]=wz;
        lnData[o+3]=r; lnData[o+4]=g; lnData[o+5]=b; lnData[o+6]=fa;
        lnCount++;
        o = lnCount * VSTRIDE_LINE;
        lnData[o]=cx[e2]; lnData[o+1]=cy[e2]; lnData[o+2]=wz;
        lnData[o+3]=r; lnData[o+4]=g; lnData[o+5]=b; lnData[o+6]=fa * 0.85;
        lnCount++;
      }
    }
  }
  return lnCount;
}

// ─── 3D solid filled shapes ───────────────────────────────────────────────────
// FIXED: no longer gated by showGeoShapes — solid shapes have their own toggle (solidShapes3D)
function buildPrimitiveTris(
  quanta: Quantum[], nQ: number,
  zDepth: number, waveZ: number, tick: number,
  W: number, params: GeoParams,
  triData: Float32Array,
): number {
  let tc = 0;
  const sceneScale = 2.2 / Math.max(1, W);
  const shapeScale = params.shapeScale ?? 1.0;
  const masterAlpha = Math.min(0.88, params.shapeOpacity ?? 0.85);
  // Use fillSolidity to boost visibility — min 0.35 so shapes are always visible
  const solidFrac   = Math.max(0.35, params.fillSolidity ?? 0.5);

  const writeVert = (x: number, y: number, z: number, r: number, g: number, b: number, a: number) => {
    const o = tc * VSTRIDE_TRI;
    triData[o] = x; triData[o+1] = y; triData[o+2] = z;
    triData[o+3] = r; triData[o+4] = g; triData[o+5] = b; triData[o+6] = a;
    tc++;
  };

  for (let i = 0; i < nQ; i++) {
    if (tc >= MAX_TRI - ARC_SEGS * 3 - 8) break;

    const q = quanta[i];
    if (q.kind !== 'arc' && q.kind !== 'rect' && q.kind !== 'plane') continue;

    const wx = (q.x - 0.5) * 2.2;
    const wy = (q.y - 0.5) * -2.2;
    const wz = particleZ(q, zDepth, waveZ, tick);
    const [r, g, b] = hslToRgb(q.hue, q.sat, Math.min(0.88, q.lit * 0.9 + 0.05));

    if (q.kind === 'arc') {
      const radius   = ((q.length ?? 24) * sceneScale) * (q.qscale ?? 1) * shapeScale;
      const arcStart = q.angle ?? 0;
      const arcSpan  = Math.PI * 1.5;
      // Increase arc fill alpha for better visibility
      const fa       = masterAlpha * solidFrac * 0.85;

      for (let seg = 0; seg < ARC_SEGS && tc < MAX_TRI - 3; seg++) {
        const t1 = seg       / ARC_SEGS;
        const t2 = (seg + 1) / ARC_SEGS;
        const a1 = arcStart + t1 * arcSpan;
        const a2 = arcStart + t2 * arcSpan;
        const edgeAlpha = fa * (0.6 + 0.4 * (1 - t1));
        writeVert(wx, wy, wz, r, g, b, fa);
        writeVert(wx + Math.cos(a1) * radius, wy + Math.sin(a1) * radius, wz, r, g, b, edgeAlpha);
        writeVert(wx + Math.cos(a2) * radius, wy + Math.sin(a2) * radius, wz, r, g, b, edgeAlpha * 0.9);
      }
    }

    else if (q.kind === 'rect' || q.kind === 'plane') {
      const hw  = (q.qscale ?? 1) * shapeScale * 22 * sceneScale;
      const hh  = hw * 0.65;
      const ang = q.angle ?? 0;
      const cA  = Math.cos(ang), sA = Math.sin(ang);
      // Significantly increased alpha for solid rects and planes
      const fa  = q.kind === 'plane'
        ? masterAlpha * solidFrac * 0.75
        : masterAlpha * solidFrac * 0.55;

      const x0 = wx + cA*hw - sA*hh; const y0 = wy + sA*hw + cA*hh;
      const x1 = wx - cA*hw - sA*hh; const y1 = wy - sA*hw + cA*hh;
      const x2 = wx - cA*hw + sA*hh; const y2 = wy - sA*hw - cA*hh;
      const x3 = wx + cA*hw + sA*hh; const y3 = wy + sA*hw - cA*hh;

      writeVert(x0, y0, wz, r, g, b, fa);
      writeVert(x1, y1, wz, r, g, b, fa * 0.92);
      writeVert(x2, y2, wz, r, g, b, fa * 0.85);
      writeVert(x0, y0, wz, r, g, b, fa);
      writeVert(x2, y2, wz, r, g, b, fa * 0.85);
      writeVert(x3, y3, wz, r, g, b, fa * 0.92);
    }
  }
  return tc;
}

// ─── Color utils ──────────────────────────────────────────────────────────────
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c  = (1 - Math.abs(2*l - 1)) * s;
  const hp = (h / 60) % 6;
  const x  = c * (1 - Math.abs(hp % 2 - 1));
  const m  = l - c / 2;
  const hi = Math.floor(hp) % 6;
  let r = 0, g = 0, bv = 0;
  if      (hi===0) { r=c; g=x; }
  else if (hi===1) { r=x; g=c; }
  else if (hi===2) { g=c; bv=x; }
  else if (hi===3) { g=x; bv=c; }
  else if (hi===4) { r=x; bv=c; }
  else             { r=c; bv=x; }
  return [r+m, g+m, bv+m];
}

function hexRgbNorm(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (h.length < 6) return [0.02, 0.02, 0.04];
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
function clampPhi(v: number): number {
  return clamp(v, -Math.PI * 0.45, Math.PI * 0.45);
}
function touchDist(e: TouchEvent): number {
  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.sqrt(dx*dx + dy*dy);
}
