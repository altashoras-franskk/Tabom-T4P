// ── MetaLifeLab — Renderer3D ─────────────────────────────────────────────────
// Non-destructive WebGL 3D view. Only reads simulation state. Never writes it.
// Coordinate convention: world XY → 3D (x, z); Z variable → 3D Y (up).

export interface Camera3D {
  yaw:   number;   // radians — horizontal orbit
  pitch: number;   // radians — vertical orbit (0=horizon, π/2=top)
  dist:  number;   // orbit radius
  panX:  number;   // world-space pan (X)
  panY:  number;   // world-space pan (Y/depth)
}

export interface View3DConfig {
  zVar:          string;
  zScale:        number;
  mode:          'particles' | 'terrain' | 'hybrid';
  camera:        Camera3D;
  // ── 3D visual enhancements ────────────────────────────────────────────────
  showTrails:    boolean;   // particle history trails
  trailLen:      number;    // 4..32, default 14
  showBonds:     boolean;   // spring-link lines between particles
  ptSize:        number;    // point size 2..14, default 5.5
  colorScheme3D: 'default' | 'topology' | 'energy' | 'valence' | 'coherence';
}

export const DEFAULT_VIEW3D: View3DConfig = {
  zVar:          'speed',
  zScale:        0.55,
  mode:          'particles',
  camera:        { yaw: 0.55, pitch: 0.48, dist: 3.0, panX: 0, panY: 0 },
  showTrails:    false,
  trailLen:      14,
  showBonds:     false,
  ptSize:        5.5,
  colorScheme3D: 'default',
};

export interface Particle3D {
  nx: number;
  ny: number;
  z:  number;
  r:  number;
  g:  number;
  b:  number;
}

export interface Link3D { a: number; b: number; }

export interface TerrainData {
  w:       number;
  h:       number;
  heights: Float32Array;
}

// ── Minimal matrix math (column-major, OpenGL convention) ─────────────────────

type M16 = Float32Array;

function perspective(fovY: number, aspect: number, near: number, far: number): M16 {
  const f  = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  const m  = new Float32Array(16);
  m[0]  = f / aspect;  m[5] = f;
  m[10] = (far + near) * nf;  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}

function lookAt(ex: number, ey: number, ez: number,
                cx: number, cy: number, cz: number): M16 {
  let fx = cx-ex, fy = cy-ey, fz = cz-ez;
  let fl = Math.sqrt(fx*fx+fy*fy+fz*fz)||1; fx/=fl; fy/=fl; fz/=fl;
  let rx = fy*0-fz*(-1), ry = fz*0-fx*0, rz = fx*(-1)-fy*0; // up = (0,1,0)
  // right = forward × up  (up = 0,1,0)
  rx = fy*0 - fz*1;   // fy*uz - fz*uy  where uz=0,uy=1 → -fz
  ry = fz*0 - fx*0;   // fz*ux - fx*uz  where ux=0,uz=0 → 0
  rz = fx*1 - fy*0;   //  fx*uy - fy*ux  where uy=1,ux=0 → fx
  // redo properly:
  rx = -fz; ry = 0; rz = fx;
  let rl = Math.sqrt(rx*rx+ry*ry+rz*rz)||1; rx/=rl; ry/=rl; rz/=rl;
  // up = right × forward
  const upx = ry*fz-rz*fy, upy = rz*fx-rx*fz, upz = rx*fy-ry*fx;
  return new Float32Array([
     rx, upx, -fx, 0,
     ry, upy, -fy, 0,
     rz, upz, -fz, 0,
    -(rx*ex+ry*ey+rz*ez),
    -(upx*ex+upy*ey+upz*ez),
     (fx*ex+fy*ey+fz*ez), 1,
  ]);
}

function mul(a: M16, b: M16): M16 {
  const r = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      r[j*4+i] = a[0*4+i]*b[j*4+0]+a[1*4+i]*b[j*4+1]+a[2*4+i]*b[j*4+2]+a[3*4+i]*b[j*4+3];
  return r;
}

// ── Shader sources ─────────────────────────────────────────────────────────────

const VERT = `
attribute vec3 a_pos;
attribute vec3 a_col;
attribute float a_alpha;
uniform mat4 u_mvp;
uniform float u_ptSize;
varying vec3 v_col;
varying float v_alpha;
void main(){
  gl_Position = u_mvp * vec4(a_pos,1.0);
  gl_PointSize = u_ptSize;
  v_col = a_col; v_alpha = a_alpha;
}`;

const FRAG = `
precision mediump float;
varying vec3 v_col;
varying float v_alpha;
void main(){ gl_FragColor = vec4(v_col, v_alpha); }`;

// ── Renderer3D ────────────────────────────────────────────────────────────────

const VSTRIDE = 7;

export class Renderer3D {
  private gl:        WebGLRenderingContext | null = null;
  private prg:       WebGLProgram | null = null;
  private buf:       WebGLBuffer | null = null;
  private canvas:    HTMLCanvasElement;
  private verts      = new Float32Array(0);
  // Trail history per particle (ring buffer approach)
  private trailBuf:  Map<number, [number, number, number][]> = new Map();
  private frameIdx   = 0;

  get isReady(): boolean { return this.gl !== null && this.prg !== null; }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', {
      alpha: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: true,
    }) as WebGLRenderingContext | null;
    if (!gl) { console.warn('[Renderer3D] WebGL unavailable'); return; }
    this.gl  = gl;
    this.prg = this.buildProg(VERT, FRAG);
    if (this.prg) this.buf = gl.createBuffer();
  }

  private buildProg(vs: string, fs: string): WebGLProgram | null {
    const gl = this.gl!;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('[Renderer3D]', gl.getShaderInfoLog(s)); return null;
      }
      return s;
    };
    const v = compile(gl.VERTEX_SHADER, vs);
    const f = compile(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const p = gl.createProgram()!;
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('[Renderer3D]', gl.getProgramInfoLog(p)); return null;
    }
    return p;
  }

  resize(w: number, h: number): void {
    if (!this.gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width  = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(particles: Particle3D[], cfg: View3DConfig, terrain?: TerrainData, links?: Link3D[]): void {
    const gl = this.gl;
    if (!gl || !this.prg || !this.buf) return;
    const W = this.canvas.width, H = this.canvas.height;
    if (W === 0 || H === 0) return;

    const cam = cfg.camera;
    const eye = camEye(cam);
    const view = lookAt(eye[0], eye[1], eye[2], cam.panX, 0, cam.panY);
    const proj = perspective(Math.PI * 0.4, W / H, 0.01, 50);
    const mvp  = mul(proj, view);

    gl.useProgram(this.prg);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.prg, 'u_mvp'), false, mvp);

    gl.clearColor(0.027, 0.02, 0.055, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    const zS = cfg.zScale;

    this.drawGrid(gl, mvp, zS);

    if ((cfg.mode === 'terrain' || cfg.mode === 'hybrid') && terrain) {
      this.drawTerrain(gl, terrain, zS);
    }
    if (cfg.mode === 'terrain') return;

    const n = particles.length;
    if (n === 0) return;

    // ── Update trail history ──────────────────────────────────────────────────
    if (cfg.showTrails) {
      this.frameIdx++;
      for (let i = 0; i < n; i++) {
        const p = particles[i];
        if (!this.trailBuf.has(i)) this.trailBuf.set(i, []);
        const arr = this.trailBuf.get(i)!;
        arr.push([p.nx, p.ny, p.z * zS]);
        if (arr.length > (cfg.trailLen ?? 14)) arr.shift();
      }
      // Draw trail lines
      const trailVerts: number[] = [];
      for (let i = 0; i < n; i++) {
        const trail = this.trailBuf.get(i);
        if (!trail || trail.length < 2) continue;
        const p = particles[i];
        for (let t = 1; t < trail.length; t++) {
          const alpha = (t / trail.length) * 0.45;
          const prev = trail[t-1], curr = trail[t];
          // prev point
          trailVerts.push(prev[0], prev[2] > 0.001 ? prev[2] : 0.001, -prev[1]);
          trailVerts.push(p.r * 0.6, p.g * 0.6, p.b * 0.8, alpha * 0.6);
          // curr point
          trailVerts.push(curr[0], curr[2] > 0.001 ? curr[2] : 0.001, -curr[1]);
          trailVerts.push(p.r * 0.8, p.g * 0.8, p.b * 0.9, alpha);
        }
      }
      if (trailVerts.length > 0) {
        const tv = new Float32Array(trailVerts);
        const tCount = tv.length / VSTRIDE;
        this.upload(gl, tv, tCount);
        this.setAttribs(gl);
        gl.uniform1f(gl.getUniformLocation(this.prg, 'u_ptSize'), 1.0);
        gl.drawArrays(gl.LINES, 0, tCount);
      }
    } else if (this.trailBuf.size > 0) {
      this.trailBuf.clear();
    }

    // ── Bonds (spring links as GL_LINES between particle tops) ────────────────
    if (cfg.showBonds && links && links.length > 0) {
      const bondVerts: number[] = [];
      for (const lnk of links) {
        const a = lnk.a, b = lnk.b;
        if (a < 0 || b < 0 || a >= n || b >= n) continue;
        const pa = particles[a], pb = particles[b];
        const ha = pa.z * zS, hb = pb.z * zS;
        bondVerts.push(pa.nx, ha, -pa.ny, 0.55, 0.40, 0.80, 0.35);
        bondVerts.push(pb.nx, hb, -pb.ny, 0.55, 0.40, 0.80, 0.35);
      }
      if (bondVerts.length > 0) {
        const bv = new Float32Array(bondVerts);
        const bCount = bv.length / VSTRIDE;
        this.upload(gl, bv, bCount);
        this.setAttribs(gl);
        gl.uniform1f(gl.getUniformLocation(this.prg, 'u_ptSize'), 1.0);
        gl.drawArrays(gl.LINES, 0, bCount);
      }
    }

    // ── Particle stems (GL_LINES) ─────────────────────────────────────────────
    const stemVerts = n * 2;
    if (this.verts.length < stemVerts * VSTRIDE)
      this.verts = new Float32Array((stemVerts + 200) * VSTRIDE);

    let vi = 0;
    for (let i = 0; i < n; i++) {
      const p = particles[i];
      const h = p.z * zS;
      this.verts[vi++]=p.nx; this.verts[vi++]=0;  this.verts[vi++]=-p.ny;
      this.verts[vi++]=p.r;  this.verts[vi++]=p.g; this.verts[vi++]=p.b; this.verts[vi++]=0.22;
      this.verts[vi++]=p.nx; this.verts[vi++]=h;  this.verts[vi++]=-p.ny;
      this.verts[vi++]=p.r;  this.verts[vi++]=p.g; this.verts[vi++]=p.b; this.verts[vi++]=0.70;
    }
    this.upload(gl, this.verts, stemVerts);
    this.setAttribs(gl);
    gl.uniform1f(gl.getUniformLocation(this.prg, 'u_ptSize'), 1.0);
    gl.drawArrays(gl.LINES, 0, stemVerts);

    // ── Particle tops (GL_POINTS) ─────────────────────────────────────────────
    if (this.verts.length < n * VSTRIDE)
      this.verts = new Float32Array((n + 200) * VSTRIDE);

    vi = 0;
    for (let i = 0; i < n; i++) {
      const p = particles[i];
      const h = p.z * zS;
      this.verts[vi++]=p.nx; this.verts[vi++]=h;  this.verts[vi++]=-p.ny;
      this.verts[vi++]=p.r;  this.verts[vi++]=p.g; this.verts[vi++]=p.b; this.verts[vi++]=0.92;
    }
    this.upload(gl, this.verts, n);
    this.setAttribs(gl);
    gl.uniform1f(gl.getUniformLocation(this.prg, 'u_ptSize'), cfg.ptSize ?? 5.5);
    gl.drawArrays(gl.POINTS, 0, n);
  }

  // ── Ground grid (orientation reference) ────────────────────────────────────
  private drawGrid(gl: WebGLRenderingContext, _mvp: M16, _zS: number): void {
    const LINES = 11;
    const verts = new Float32Array(LINES * 4 * VSTRIDE);
    let vi = 0;
    const addLine = (x1: number, z1: number, x2: number, z2: number) => {
      for (const [x, z] of [[x1,z1],[x2,z2]]) {
        verts[vi++]=x; verts[vi++]=0; verts[vi++]=z;
        verts[vi++]=0.18; verts[vi++]=0.16; verts[vi++]=0.28;
        verts[vi++]=0.30;
      }
    };
    for (let i = 0; i <= 10; i++) {
      const t = i / 10 * 2 - 1;
      addLine(t, -1, t, 1);
      addLine(-1, t, 1, t);
    }
    this.upload(gl, verts, LINES * 4);
    this.setAttribs(gl);
    gl.uniform1f(gl.getUniformLocation(this.prg!, 'u_ptSize'), 1.0);
    gl.drawArrays(gl.LINES, 0, LINES * 4);
  }

  // ── Terrain wireframe ───────────────────────────────────────────────────────
  private drawTerrain(gl: WebGLRenderingContext, t: TerrainData, zS: number): void {
    const { w, h, heights } = t;
    const lineCount = (w-1)*h + w*(h-1);
    const buf = new Float32Array(lineCount * 2 * VSTRIDE);
    let vi = 0;
    const addV = (gx: number, gy: number) => {
      const nx = (gx/(w-1))*2-1;
      const ny = (gy/(h-1))*2-1;
      const hv = heights[gy*w+gx]*zS;
      const c  = heights[gy*w+gx];
      buf[vi++]=nx; buf[vi++]=hv; buf[vi++]=-ny;
      buf[vi++]=0.15+c*0.25; buf[vi++]=0.20+c*0.50; buf[vi++]=0.45+c*0.30;
      buf[vi++]=0.28+c*0.22;
    };
    for (let gy=0;gy<h;gy++) for (let gx=0;gx<w-1;gx++) { addV(gx,gy); addV(gx+1,gy); }
    for (let gx=0;gx<w;gx++) for (let gy=0;gy<h-1;gy++) { addV(gx,gy); addV(gx,gy+1); }
    this.upload(gl, buf, lineCount*2);
    this.setAttribs(gl);
    gl.uniform1f(gl.getUniformLocation(this.prg!, 'u_ptSize'), 1.0);
    gl.drawArrays(gl.LINES, 0, lineCount*2);
  }

  private upload(gl: WebGLRenderingContext, data: Float32Array, count: number): void {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf!);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count*VSTRIDE), gl.DYNAMIC_DRAW);
  }

  private setAttribs(gl: WebGLRenderingContext): void {
    const prg = this.prg!;
    const S = VSTRIDE * 4;
    const ap = gl.getAttribLocation(prg, 'a_pos');
    const ac = gl.getAttribLocation(prg, 'a_col');
    const aa = gl.getAttribLocation(prg, 'a_alpha');
    gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 3, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(ac); gl.vertexAttribPointer(ac, 3, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(aa); gl.vertexAttribPointer(aa, 1, gl.FLOAT, false, S, 24);
  }

  dispose(): void {
    const gl = this.gl; if (!gl) return;
    if (this.prg) gl.deleteProgram(this.prg);
    if (this.buf) gl.deleteBuffer(this.buf);
    this.prg = null; this.buf = null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function camEye(cam: Camera3D): [number, number, number] {
  const x = Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist + cam.panX;
  const y = Math.sin(cam.pitch) * cam.dist;
  const z = Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist + cam.panY;
  return [x, y, z];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1-l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(Math.min(k-3, 9-k), 1));
  };
  return [f(0), f(8), f(4)];
}

export function typeColor(type: number, nTypes: number): [number, number, number] {
  if (type === 255) return [0.85, 0.85, 0.30]; // food = yellow
  const h = (type / Math.max(1, nTypes)) * 0.83 + 0.04;
  return hslToRgb(h, 0.75, 0.60);
}

export function clamp3d(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// ── Z variable samplers ───────────────────────────────────────────────────────

/** Extract Z value (0..1) from a MicroState particle */
export function getZMicro(
  vx: number, vy: number,
  energy: number,
  geneA: number,
  age: number,
  zVar: string,
): number {
  switch (zVar) {
    case 'speed':  return clamp3d(Math.sqrt(vx*vx + vy*vy) * 2.5, 0, 1);
    case 'energy': return clamp3d(energy, 0, 1);
    case 'geneA':  return geneA;
    case 'geneB':  return geneA; // fallback
    case 'age':    return clamp3d(age / 8000, 0, 1);
    default:       return 0.4;
  }
}

/** Extract Z value (0..1) from a PsycheState quantum */
export function getZPsyche(
  coherence: number,
  arousal:   number,
  charge:    number,
  inhibition:number,
  valence:   number,
  zVar: string,
): number {
  switch (zVar) {
    case 'coherence':  return coherence;
    case 'arousal':    return arousal;
    case 'charge':     return charge;
    case 'inhibition': return inhibition;
    case 'valence':    return (valence + 1) * 0.5;
    default:           return 0.4;
  }
}