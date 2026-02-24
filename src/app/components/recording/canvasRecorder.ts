// ── CanvasRecorder — compositor + MediaRecorder pipeline ─────────────────────
// Works with any set of stacked canvases (2D or WebGL with preserveDrawingBuffer).
// Creates an off-screen compositor, draws sources in order, overlays minimal HUD,
// then encodes via MediaRecorder and triggers a file download on stop.
//
// FORMAT NOTES:
// • MP4  — supported only on Safari 15.4+ via video/mp4;codecs=avc1.
//          On Chrome/Firefox falls back automatically to WebM.
// • WebM — universally supported, always reliable.
// • MOV  — not a direct MediaRecorder output; equals MP4 with .mov extension.
//          Selected as "QuickTime MOV" in the UI for familiarity.
//
// To convert WebM → MP4 offline:
//   ffmpeg -i recording.webm -c:v libx264 -crf 18 -preset slow output.mp4

export type RecorderState = 'idle' | 'recording' | 'saving';
export type RecordFormat  = 'auto' | 'webm' | 'mp4' | 'mov';
export type RecordQuality = 'draft' | 'standard' | 'high' | 'ultra';

export const RECORD_QUALITY_LABELS: Record<RecordQuality, string> = {
  draft:    'Draft (3 Mbps)',
  standard: 'Standard (8 Mbps)',
  high:     'High (20 Mbps)',
  ultra:    'Ultra (40 Mbps)',
};
export const RECORD_FORMAT_LABELS: Record<RecordFormat, string> = {
  auto: 'Auto',
  webm: 'WebM',
  mp4:  'MP4',
  mov:  'MOV (QT)',
};

export interface RecordingOptions {
  format?:  RecordFormat;   // default 'auto'
  quality?: RecordQuality;  // default 'standard'
  fps?:     number;         // default 30
}

export interface RecordingParams {
  labName:  string;
  lines:    string[];
}

const QUALITY_BITRATE: Record<RecordQuality, number> = {
  draft:    3_000_000,
  standard: 8_000_000,
  high:     20_000_000,
  ultra:    40_000_000,
};

// ── Time formatter ─────────────────────────────────────────────────────────────
export function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── MIME / extension negotiation ──────────────────────────────────────────────
function getBestMime(format: RecordFormat): { mime: string; ext: string } {
  // Try MP4 (works on Safari, not Chrome/Firefox)
  if (format === 'mp4' || format === 'mov' || format === 'auto') {
    const mp4candidates = [
      'video/mp4;codecs=avc1',
      'video/mp4;codecs=h264',
      'video/mp4',
    ];
    for (const t of mp4candidates) {
      try {
        if (MediaRecorder.isTypeSupported(t)) {
          const ext = format === 'mov' ? 'mov' : 'mp4';
          return { mime: t, ext };
        }
      } catch { /* ignore */ }
    }
    // If format was explicitly mp4/mov but not supported, tell the caller
    if (format === 'mp4' || format === 'mov') {
      // Will fall through to WebM below — we'll use .webm extension
    }
  }

  // WebM (always works)
  const webmCandidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const t of webmCandidates) {
    try { if (MediaRecorder.isTypeSupported(t)) return { mime: t, ext: 'webm' }; } catch { /* ignore */ }
  }
  return { mime: 'video/webm', ext: 'webm' };
}

/** Check at runtime whether a given format is natively supported */
export function isFormatSupported(format: RecordFormat): boolean {
  if (format === 'webm') return true;
  const mp4 = ['video/mp4;codecs=avc1', 'video/mp4;codecs=h264', 'video/mp4'];
  for (const t of mp4) {
    try { if (MediaRecorder.isTypeSupported(t)) return true; } catch { /* */ }
  }
  return false;
}

// ── CanvasRecorder ────────────────────────────────────────────────────────────
export class CanvasRecorder {
  private compositor: HTMLCanvasElement;
  private ctx:        CanvasRenderingContext2D;
  private recorder:   MediaRecorder | null = null;
  private chunks:     Blob[]               = [];
  private rafId:      number               = 0;
  private startTime:  number               = 0;
  private _state:     RecorderState        = 'idle';
  private onState:    (s: RecorderState) => void;
  private _ext:       string               = 'webm';
  private _actualFmt: string               = 'WebM';

  constructor(onState: (s: RecorderState) => void) {
    this.compositor = document.createElement('canvas');
    this.ctx        = this.compositor.getContext('2d', { alpha: false })!;
    this.onState    = onState;
  }

  get state():     RecorderState { return this._state; }
  get elapsed():   number        { return this.startTime > 0 ? (performance.now() - this.startTime) / 1000 : 0; }
  /** The actual format used (e.g. "MP4", "WebM") — available after start() */
  get actualFmt(): string        { return this._actualFmt; }

  private set(s: RecorderState) { this._state = s; this.onState(s); }

  // ── Start ─────────────────────────────────────────────────────────────────
  start(
    getSources: () => (HTMLCanvasElement | null)[],
    getParams:  () => RecordingParams,
    fps                                          = 30,
    audioStream?: MediaStream,
    options: RecordingOptions                    = {},
  ): void {
    if (this._state !== 'idle') return;

    const sources = getSources();
    const first   = sources.find(c => c != null);
    if (!first) { console.warn('[CanvasRecorder] No source canvas'); return; }

    const W = Math.min(1920, first.clientWidth  || window.innerWidth);
    const H = Math.min(1080, first.clientHeight || window.innerHeight);
    this.compositor.width  = W;
    this.compositor.height = H;

    this.chunks    = [];
    this.startTime = performance.now();

    const format         = options.format  ?? 'auto';
    const quality        = options.quality ?? 'standard';
    const targetFps      = options.fps     ?? fps;
    const { mime, ext }  = getBestMime(format);
    const bitrate        = QUALITY_BITRATE[quality];

    this._ext = ext;
    this._actualFmt = ext === 'mp4' ? 'MP4'
      : ext === 'mov' ? 'MOV'
      : 'WebM';

    const videoStream = this.compositor.captureStream(targetFps);

    let stream: MediaStream;
    if (audioStream && audioStream.getAudioTracks().length > 0) {
      stream = new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
    } else {
      stream = videoStream;
    }

    try {
      this.recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
    } catch {
      this.recorder = new MediaRecorder(stream);
    }

    this.recorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
    this.recorder.onstop = () => this.finalize(mime);
    this.recorder.start(100);
    this.set('recording');

    const loop = () => {
      if (!this.recorder || this.recorder.state === 'inactive') return;
      this.rafId = requestAnimationFrame(loop);
      this.composite(getSources(), getParams());
    };
    loop();
  }

  // ── Stop ──────────────────────────────────────────────────────────────────
  stop(): void {
    if (this._state !== 'recording') return;
    cancelAnimationFrame(this.rafId);
    this.set('saving');
    if (this.recorder?.state === 'recording') this.recorder.stop();
  }

  // ── Compositor frame ──────────────────────────────────────────────────────
  private composite(sources: (HTMLCanvasElement | null)[], params: RecordingParams): void {
    const { ctx, compositor } = this;
    const W = compositor.width, H = compositor.height;

    ctx.fillStyle = '#07050e';
    ctx.fillRect(0, 0, W, H);

    for (const canvas of sources) {
      if (!canvas) continue;
      try { ctx.drawImage(canvas, 0, 0, W, H); } catch { /* tainted or disposed */ }
    }

    this.drawOverlay(params, W, H);
  }

  // ── Overlay renderer ──────────────────────────────────────────────────────
  private drawOverlay(params: RecordingParams, W: number, H: number): void {
    const ctx     = this.ctx;
    const elapsed = this.elapsed;
    const PAD     = 14;
    const LINE_H  = 15;

    // TOP-LEFT: Lab name + time
    ctx.save();
    ctx.font = '11px monospace';
    const topLabel = `${params.labName}  ·  ${fmtTime(elapsed)}`;
    const tlW      = ctx.measureText(topLabel).width + 20;
    ctx.globalAlpha = 0.70;
    ctx.fillStyle   = 'rgba(7,5,14,0.85)';
    ctx.beginPath(); ctx.roundRect(PAD - 5, PAD - 13, tlW, 21, 4); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle   = '#c4b5fd';
    ctx.fillText(topLabel, PAD, PAD);
    ctx.restore();

    // TOP-RIGHT: blinking ● REC + format
    if (Math.floor(elapsed * 1.5) % 2 === 0) {
      ctx.save();
      ctx.font = 'bold 10px monospace';
      const recLabel = `● REC  ${this._actualFmt}`;
      const recW     = ctx.measureText(recLabel).width + 18;
      ctx.globalAlpha = 0.80;
      ctx.fillStyle   = 'rgba(7,5,14,0.85)';
      ctx.beginPath(); ctx.roundRect(W - recW - PAD, PAD - 13, recW, 21, 4); ctx.fill();
      ctx.fillStyle   = '#f87171';
      ctx.fillText(recLabel, W - ctx.measureText(recLabel).width - PAD, PAD);
      ctx.restore();
    }

    // BOTTOM-LEFT: parameter lines
    if (params.lines.length === 0) return;
    ctx.save();
    ctx.font = '10px monospace';
    const maxTW = Math.max(...params.lines.map(l => ctx.measureText(l).width));
    const bgH   = params.lines.length * LINE_H + 10;
    const bgY   = H - bgH - PAD + 2;
    ctx.globalAlpha = 0.60;
    ctx.fillStyle   = 'rgba(7,5,14,0.88)';
    ctx.beginPath(); ctx.roundRect(PAD - 6, bgY - 4, maxTW + 18, bgH, 5); ctx.fill();
    ctx.globalAlpha = 0.88;
    for (let i = 0; i < params.lines.length; i++) {
      const y = H - PAD - (params.lines.length - 1 - i) * LINE_H;
      ctx.fillStyle = i === 0 ? 'rgba(196,181,253,0.92)' : 'rgba(210,200,255,0.80)';
      ctx.fillText(params.lines[i], PAD, y);
    }
    ctx.restore();
  }

  // ── Finalize & download ──────────────────────────────────────────────────
  private finalize(mime: string): void {
    const blob = new Blob(this.chunks, { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `metalife-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.${this._ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    this.chunks = [];
    this.set('idle');
  }

  dispose(): void { this.stop(); }
}
