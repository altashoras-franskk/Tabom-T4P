/**
 * WebGL Particle Renderer
 * High-performance rendering for thousands of particles
 */

export interface WebGLRendererConfig {
  canvas: HTMLCanvasElement;
  maxParticles: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export class WebGLParticleRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private colorBuffer: WebGLBuffer | null = null;
  private positions: Float32Array;
  private colors: Float32Array;
  private maxParticles: number;
  private camera: CameraState = { x: 0, y: 0, zoom: 1.0 };

  constructor(config: WebGLRendererConfig) {
    const gl = config.canvas.getContext('webgl', {
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      throw new Error('WebGL not supported');
    }

    this.gl = gl;
    this.maxParticles = config.maxParticles;
    this.positions = new Float32Array(config.maxParticles * 2);
    this.colors = new Float32Array(config.maxParticles * 4);

    this.initShaders();
    this.initBuffers();
  }

  private initShaders() {
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec4 a_color;
      uniform vec2 u_resolution;
      uniform vec2 u_camera;
      uniform float u_zoom;
      uniform float u_pointSize;
      varying vec4 v_color;

      void main() {
        // Apply camera transformation
        vec2 worldPos = (a_position - u_camera) * u_zoom;
        
        // Convert from world space to clip space
        vec2 clipSpace = (worldPos / u_resolution) * 2.0 - 1.0;
        clipSpace.y = -clipSpace.y; // Flip Y
        
        gl_Position = vec4(clipSpace, 0.0, 1.0);
        gl_PointSize = u_pointSize * u_zoom;
        v_color = a_color;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      varying vec4 v_color;

      void main() {
        // Circular point with soft edges
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        if (dist > 0.5) {
          discard;
        }
        
        // Soft glow falloff
        float alpha = v_color.a * (1.0 - smoothstep(0.3, 0.5, dist));
        gl_FragColor = vec4(v_color.rgb, alpha);
      }
    `;

    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      throw new Error('Failed to compile shaders');
    }

    this.program = this.gl.createProgram();
    if (!this.program) {
      throw new Error('Failed to create program');
    }

    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(this.program);
      throw new Error('Program linking failed: ' + info);
    }
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      console.error('Shader compilation failed:', info);
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private initBuffers() {
    this.positionBuffer = this.gl.createBuffer();
    this.colorBuffer = this.gl.createBuffer();
  }

  setCamera(camera: CameraState) {
    this.camera = camera;
  }

  getCamera(): CameraState {
    return { ...this.camera };
  }

  updateParticles(
    positions: { x: number; y: number }[],
    types: number[],
    typeCount: number,
    pointSize: number
  ) {
    const count = Math.min(positions.length, this.maxParticles);

    // Update position data
    for (let i = 0; i < count; i++) {
      this.positions[i * 2] = positions[i].x;
      this.positions[i * 2 + 1] = positions[i].y;
    }

    // Update color data
    for (let i = 0; i < count; i++) {
      const hue = (types[i] / typeCount) * 360;
      const rgb = this.hslToRgb(hue, 0.7, 0.6);
      this.colors[i * 4] = rgb.r;
      this.colors[i * 4 + 1] = rgb.g;
      this.colors[i * 4 + 2] = rgb.b;
      this.colors[i * 4 + 3] = 0.9; // Alpha
    }

    this.render(count, pointSize);
  }

  private render(count: number, pointSize: number) {
    if (!this.program) return;

    const gl = this.gl;
    const width = gl.canvas.width;
    const height = gl.canvas.height;

    // Set viewport
    gl.viewport(0, 0, width, height);

    // Clear with black background
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Enable blending for glow effect
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Use program
    gl.useProgram(this.program);

    // Set uniforms
    const resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
    const cameraLocation = gl.getUniformLocation(this.program, 'u_camera');
    const zoomLocation = gl.getUniformLocation(this.program, 'u_zoom');
    const pointSizeLocation = gl.getUniformLocation(this.program, 'u_pointSize');

    gl.uniform2f(resolutionLocation, width, height);
    gl.uniform2f(cameraLocation, this.camera.x, this.camera.y);
    gl.uniform1f(zoomLocation, this.camera.zoom);
    gl.uniform1f(pointSizeLocation, pointSize);

    // Bind position buffer
    const positionLocation = gl.getAttribLocation(this.program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions.subarray(0, count * 2), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Bind color buffer
    const colorLocation = gl.getAttribLocation(this.program, 'a_color');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.colors.subarray(0, count * 4), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);

    // Draw points
    gl.drawArrays(gl.POINTS, 0, count);
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h = h / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    return {
      r: hue2rgb(p, q, h + 1 / 3),
      g: hue2rgb(p, q, h),
      b: hue2rgb(p, q, h - 1 / 3),
    };
  }

  clear() {
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  resize(width: number, height: number) {
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;
  }

  dispose() {
    if (this.positionBuffer) {
      this.gl.deleteBuffer(this.positionBuffer);
    }
    if (this.colorBuffer) {
      this.gl.deleteBuffer(this.colorBuffer);
    }
    if (this.program) {
      this.gl.deleteProgram(this.program);
    }
  }
}
