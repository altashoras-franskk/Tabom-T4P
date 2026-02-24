// WebGL2 renderer — uniform locations cached at init, palette pre-allocated
import { MicroState } from '../../sim/micro/microState';
import { PARTICLE_VERTEX_SHADER, PARTICLE_FRAGMENT_SHADER } from './shaders';
import { getPaletteRgb } from '../palette';

export interface RenderConfig {
  pointSize: number;
  fade: number; // 0.90-0.99
  glow: number; // 0-2
  paletteIndex: number;
}

// Cached uniform locations — looked up ONCE at init, never again per frame
interface UniformCache {
  pointSize: WebGLUniformLocation | null;
  typeCount: WebGLUniformLocation | null;
  glow: WebGLUniformLocation | null;
  palette: WebGLUniformLocation | null;
}

// Cached palette — only rebuilt when paletteIndex or typesCount changes
interface PaletteCache {
  index: number;
  typesCount: number;
  array: Float32Array; // pre-allocated 16*3
}

export interface WebGLRenderer {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  program: WebGLProgram;
  fadeProgram: WebGLProgram | null;
  positionBuffer: WebGLBuffer;
  typeBuffer: WebGLBuffer;
  sizeBuffer: WebGLBuffer;
  mutationGlowBuffer: WebGLBuffer;
  vao: WebGLVertexArrayObject;
  fadeVao: WebGLVertexArrayObject | null;
  quadBuffer: WebGLBuffer | null;
  config: RenderConfig;
  // Pre-allocated CPU-side arrays — never reallocated unless maxCount grows
  positionsArray: Float32Array | null;
  typesArray: Float32Array | null;
  sizesArray: Float32Array | null;
  mutationGlowsArray: Float32Array | null;
  maxParticles: number;
  // Cached uniform locations
  uniforms: UniformCache;
  // Cached palette data
  paletteCache: PaletteCache;
  // Last uploaded particle count — lets us use bufferSubData (faster than bufferData)
  lastCount: number;
  // Canvas size cache — avoid getBoundingClientRect every frame
  cachedW: number;
  cachedH: number;
}

const createShader = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createProgram = (gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram | null => {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
};

export const initWebGLRenderer = (canvas: HTMLCanvasElement): WebGLRenderer | null => {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) return null;

  const vertexShader   = createShader(gl, gl.VERTEX_SHADER,   PARTICLE_VERTEX_SHADER);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, PARTICLE_FRAGMENT_SHADER);
  if (!vertexShader || !fragmentShader) return null;

  const program = createProgram(gl, vertexShader, fragmentShader);
  if (!program) return null;

  const positionBuffer     = gl.createBuffer();
  const typeBuffer         = gl.createBuffer();
  const sizeBuffer         = gl.createBuffer();
  const mutationGlowBuffer = gl.createBuffer();
  const vao                = gl.createVertexArray();
  if (!positionBuffer || !typeBuffer || !sizeBuffer || !mutationGlowBuffer || !vao) return null;

  gl.bindVertexArray(vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const posLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, typeBuffer);
  const typeLoc = gl.getAttribLocation(program, 'a_type');
  gl.enableVertexAttribArray(typeLoc);
  gl.vertexAttribPointer(typeLoc, 1, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
  const sizeLoc = gl.getAttribLocation(program, 'a_size');
  gl.enableVertexAttribArray(sizeLoc);
  gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, mutationGlowBuffer);
  const mutGlowLoc = gl.getAttribLocation(program, 'a_mutationGlow');
  gl.enableVertexAttribArray(mutGlowLoc);
  gl.vertexAttribPointer(mutGlowLoc, 1, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  // ── Cache ALL uniform locations here — never again inside renderWebGL ──
  const uniforms: UniformCache = {
    pointSize: gl.getUniformLocation(program, 'u_pointSize'),
    typeCount:  gl.getUniformLocation(program, 'u_typeCount'),
    glow:       gl.getUniformLocation(program, 'u_glow'),
    palette:    gl.getUniformLocation(program, 'u_palette'),
  };

  // Pre-allocate palette array once
  const paletteCache: PaletteCache = {
    index: -1,
    typesCount: -1,
    array: new Float32Array(16 * 3),
  };

  // Fullscreen quad for fade
  let fadeVao: WebGLVertexArrayObject | null = null;
  let quadBuffer: WebGLBuffer | null = null;
  let fadeProgram: WebGLProgram | null = null;

  const FADE_VS = `#version 300 es\nin vec2 a_position;\nout vec2 v_texCoord;\nvoid main(){v_texCoord=a_position*0.5+0.5;gl_Position=vec4(a_position,0.0,1.0);}`;
  const FADE_FS = `#version 300 es\nprecision mediump float;\nin vec2 v_texCoord;\nout vec4 fragColor;\nuniform float u_fade;\nvoid main(){float alpha=1.0-u_fade;fragColor=vec4(0.02,0.02,0.05,alpha);}`;
  const fadeVS = createShader(gl, gl.VERTEX_SHADER, FADE_VS);
  const fadeFS = createShader(gl, gl.FRAGMENT_SHADER, FADE_FS);
  if (fadeVS && fadeFS) {
    fadeProgram = createProgram(gl, fadeVS, fadeFS);
    if (fadeProgram) {
      fadeVao    = gl.createVertexArray();
      quadBuffer = gl.createBuffer();
      if (fadeVao && quadBuffer) {
        gl.bindVertexArray(fadeVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
        const fPosLoc = gl.getAttribLocation(fadeProgram, 'a_position');
        gl.enableVertexAttribArray(fPosLoc);
        gl.vertexAttribPointer(fPosLoc, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
      }
    }
  }

  return {
    gl, canvas, program, fadeProgram,
    positionBuffer, typeBuffer, sizeBuffer, mutationGlowBuffer,
    vao, fadeVao, quadBuffer,
    config: { pointSize: 4.0, fade: 0.96, glow: 0.5, paletteIndex: 0 },
    positionsArray: null, typesArray: null, sizesArray: null, mutationGlowsArray: null,
    maxParticles: 0,
    uniforms,
    paletteCache,
    lastCount: -1,
    cachedW: 0,
    cachedH: 0,
  };
};

/** Resize only when canvas physical size actually changes — not every frame */
const syncCanvasSize = (renderer: WebGLRenderer): void => {
  const { canvas, gl } = renderer;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const W = Math.floor(rect.width  * dpr);
  const H = Math.floor(rect.height * dpr);
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width  = W;
    canvas.height = H;
    renderer.cachedW = W;
    renderer.cachedH = H;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
};

export const setRenderConfig = (renderer: WebGLRenderer, config: Partial<RenderConfig>): void => {
  Object.assign(renderer.config, config);
};

/** Rebuild palette uniform array only when paletteIndex or typesCount changes */
const ensurePalette = (renderer: WebGLRenderer, typesCount: number): void => {
  const { paletteCache, config } = renderer;
  if (paletteCache.index === config.paletteIndex && paletteCache.typesCount === typesCount) return;
  paletteCache.index      = config.paletteIndex;
  paletteCache.typesCount = typesCount;
  const arr = paletteCache.array;
  for (let i = 0; i < Math.min(typesCount, 16); i++) {
    const rgb = getPaletteRgb(config.paletteIndex, i, typesCount);
    arr[i * 3]     = rgb[0];
    arr[i * 3 + 1] = rgb[1];
    arr[i * 3 + 2] = rgb[2];
  }
};

export const renderWebGL = (
  renderer: WebGLRenderer,
  state: MicroState,
  typesCount: number,
  width: number,
  height: number,
  trails: boolean,
): void => {
  const { gl, program, positionBuffer, typeBuffer, sizeBuffer, mutationGlowBuffer, vao, uniforms } = renderer;

  syncCanvasSize(renderer);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Grow CPU buffers only if maxCount increased
  if (!renderer.positionsArray || renderer.maxParticles < state.maxCount) {
    renderer.positionsArray    = new Float32Array(state.maxCount * 2);
    renderer.typesArray        = new Float32Array(state.maxCount);
    renderer.sizesArray        = new Float32Array(state.maxCount);
    renderer.mutationGlowsArray = new Float32Array(state.maxCount);
    renderer.maxParticles      = state.maxCount;
    renderer.lastCount         = -1; // force bufferData on first upload
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // ── Fill CPU arrays ──
  const positions     = renderer.positionsArray!;
  const types         = renderer.typesArray!;
  const sizes         = renderer.sizesArray!;
  const mutationGlows = renderer.mutationGlowsArray!;
  const count         = state.count;

  for (let i = 0; i < count; i++) {
    positions[i * 2]     = state.x[i];
    positions[i * 2 + 1] = state.y[i];
    types[i]             = state.type[i];
    sizes[i]             = state.size[i];
    const p              = state.mutationPotential[i];
    mutationGlows[i]     = Math.sin(p * Math.PI) * p;
  }

  // ── Upload to GPU — bufferSubData when same count (avoids realloc on driver) ──
  const posSub  = positions.subarray(0, count * 2);
  const typSub  = types.subarray(0, count);
  const sizSub  = sizes.subarray(0, count);
  const mgSub   = mutationGlows.subarray(0, count);

  if (renderer.lastCount === count) {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);     gl.bufferSubData(gl.ARRAY_BUFFER, 0, posSub);
    gl.bindBuffer(gl.ARRAY_BUFFER, typeBuffer);         gl.bufferSubData(gl.ARRAY_BUFFER, 0, typSub);
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);         gl.bufferSubData(gl.ARRAY_BUFFER, 0, sizSub);
    gl.bindBuffer(gl.ARRAY_BUFFER, mutationGlowBuffer); gl.bufferSubData(gl.ARRAY_BUFFER, 0, mgSub);
  } else {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);     gl.bufferData(gl.ARRAY_BUFFER, posSub, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, typeBuffer);         gl.bufferData(gl.ARRAY_BUFFER, typSub, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);         gl.bufferData(gl.ARRAY_BUFFER, sizSub, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, mutationGlowBuffer); gl.bufferData(gl.ARRAY_BUFFER, mgSub, gl.DYNAMIC_DRAW);
    renderer.lastCount = count;
  }

  // ── Draw particles ──
  gl.useProgram(program);
  gl.bindVertexArray(vao);

  const dpr = window.devicePixelRatio || 1;
  gl.uniform1f(uniforms.pointSize, renderer.config.pointSize * dpr);
  gl.uniform1f(uniforms.typeCount,  typesCount);
  gl.uniform1f(uniforms.glow,       renderer.config.glow);

  // Rebuild palette only when changed
  ensurePalette(renderer, typesCount);
  gl.uniform3fv(uniforms.palette, renderer.paletteCache.array);

  gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive for glow
  gl.drawArrays(gl.POINTS, 0, count);

  gl.bindVertexArray(null);
};