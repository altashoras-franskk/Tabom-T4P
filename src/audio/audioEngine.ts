// ── Music Lab — Audio Engine v2 (Role-specific synthesis + Cable-Synth modulation) ──
import { VoiceRole, NoteEvent, RoleConfig, Envelope, midiToFreq } from '../sim/music/musicTypes';

const POOL_SIZE = 48;

interface AudioVoice {
  id:        number;
  role:      VoiceRole;
  active:    boolean;
  startTime: number;
  endTime:   number;
  gainNode:  GainNode;
  filter:    BiquadFilterNode;
  panner:    StereoPannerNode;
  oscs:      OscillatorNode[];
  noise:     AudioBufferSourceNode | null;
  mixNodes:  GainNode[];           // per-fire mix gains — disconnected on recycle
}

// ── Noise buffer (white noise, looped) ───────────────────────────────────────
function makeNoiseBuffer(ctx: AudioContext, dur = 2.0): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// ── Reverb impulse response ───────────────────────────────────────────────────
function makeIR(ctx: AudioContext, dur = 2.8, decay = 3.2): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

// ─────────────────────────────────────────────────────────────────────────────
export class MusicAudioEngine {
  ctx!:        AudioContext;
  masterBus!:  GainNode;
  compressor!: DynamicsCompressorNode;
  reverbSend!: GainNode;
  reverbRet!:  GainNode;
  convolver!:  ConvolverNode;
  delayNode!:  DelayNode;
  delayFb!:    GainNode;
  delaySend!:  GainNode;
  delayRet!:   GainNode;

  private voices:      AudioVoice[] = [];
  private noiseBuffer!: AudioBuffer;
  private _ready = false;

  roleEnergy: Partial<Record<VoiceRole, number>> = {};

  private _audioDestNode: MediaStreamAudioDestinationNode | null = null;

  get ready() { return this._ready; }

  async init(): Promise<void> {
    if (this._ready) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    this.noiseBuffer = makeNoiseBuffer(this.ctx);

    // ── Master chain ─────────────────────────────────────────────────────────
    this.masterBus  = this.ctx.createGain(); this.masterBus.gain.value = 0.88;
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value      = 6;
    this.compressor.ratio.value     = 5;
    this.compressor.attack.value    = 0.004;
    this.compressor.release.value   = 0.22;

    // Reverb
    this.convolver  = this.ctx.createConvolver();
    this.convolver.buffer = makeIR(this.ctx, 2.8, 3.2);
    this.reverbSend = this.ctx.createGain(); this.reverbSend.gain.value = 0;
    this.reverbRet  = this.ctx.createGain(); this.reverbRet.gain.value  = 0.85;

    // Delay
    this.delayNode  = this.ctx.createDelay(2.0); this.delayNode.delayTime.value = 0.35;
    this.delayFb    = this.ctx.createGain();       this.delayFb.gain.value        = 0.28;
    this.delaySend  = this.ctx.createGain();       this.delaySend.gain.value      = 0;
    this.delayRet   = this.ctx.createGain();       this.delayRet.gain.value       = 0.65;

    // Routing
    this.masterBus.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);

    this.masterBus.connect(this.reverbSend);
    this.reverbSend.connect(this.convolver);
    this.convolver.connect(this.reverbRet);
    this.reverbRet.connect(this.compressor);

    this.masterBus.connect(this.delaySend);
    this.delaySend.connect(this.delayNode);
    this.delayNode.connect(this.delayFb);
    this.delayFb.connect(this.delayNode);
    this.delayNode.connect(this.delayRet);
    this.delayRet.connect(this.compressor);

    // ── Voice pool ────────────────────────────────────────────────────────────
    for (let i = 0; i < POOL_SIZE; i++) {
      const g = this.ctx.createGain();       g.gain.value = 0;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 18000; f.Q.value = 0.7;
      const p = this.ctx.createStereoPanner();
      f.connect(g); g.connect(p); p.connect(this.masterBus);
      this.voices.push({
        id: i, role: 'PAD', active: false,
        startTime: 0, endTime: 0,
        gainNode: g, filter: f, panner: p,
        oscs: [], noise: null, mixNodes: [],
      });
    }

    this._ready = true;
  }

  // ── MediaStream tap for recording ─────────────────────────────────────────
  createAudioStream(): MediaStream {
    if (!this._ready) throw new Error('AudioEngine not initialised');
    if (!this._audioDestNode) {
      this._audioDestNode = this.ctx.createMediaStreamDestination();
      this.compressor.connect(this._audioDestNode);
    }
    return this._audioDestNode.stream;
  }

  // ── Acquire voice (steal oldest if full) ──────────────────────────────────
  private acquireVoice(): AudioVoice {
    const now = this.ctx.currentTime;
    let v = this.voices.find(v => !v.active || v.endTime <= now);
    if (!v) {
      v = this.voices.reduce((a, b) => a.endTime < b.endTime ? a : b);
    }
    v.oscs.forEach(o => { try { o.stop(); o.disconnect(); } catch {} });
    v.oscs = [];
    if (v.noise) { try { v.noise.stop(); v.noise.disconnect(); } catch {} v.noise = null; }
    // Disconnect + clear intermediate mix nodes to prevent accumulation on v.filter
    v.mixNodes.forEach(g => { try { g.disconnect(); } catch {} });
    v.mixNodes = [];
    v.gainNode.gain.cancelScheduledValues(now);
    v.gainNode.gain.setValueAtTime(0, now);
    v.active = true;
    return v;
  }

  // ── ADSR envelope helper ───────────────────────────────────────────────────
  // dur = time until release starts (NOT including release duration)
  private _applyEnv(g: AudioParam, now: number, amp: number, env: Envelope, dur: number): void {
    const A = Math.max(0.002, env.attack);
    const decayTau = env.sustain < 0.05
      ? env.decay * 0.10 + 0.001
      : env.decay * 0.28 + 0.001;
    g.cancelScheduledValues(now);
    if (A > 0.06) {
      // Slow-attack voices: inject a micro-transient so the ear
      // registers the event at the moment of gate crossing, then
      // continue with the real envelope swell.
      const tap = Math.min(amp * 0.12, 0.08);
      g.setValueAtTime(tap, now);
      g.linearRampToValueAtTime(tap * 0.6, now + 0.025);
      g.linearRampToValueAtTime(amp, now + A);
    } else {
      g.setValueAtTime(0.0001, now);
      g.linearRampToValueAtTime(amp, now + A);
    }
    g.setTargetAtTime(amp * env.sustain, now + A, decayTau);
    g.setTargetAtTime(0.0001, now + dur, Math.max(0.01, env.release) * 0.38 + 0.001);
  }

  // ── Main fire method ──────────────────────────────────────────────────────
  fire(ev: NoteEvent, cfg: RoleConfig): void {
    if (!this._ready) return;
    const now  = this.ctx.currentTime;
    const v    = this.acquireVoice();
    v.role      = ev.role;
    v.startTime = now;

    // Pan from world x-position
    v.panner.pan.setValueAtTime(ev.x * 0.65 * cfg.panSpread, now);

    // ── Cable-Synth timbre modulation ─────────────────────────────────────
    // ev.timbre = particle brightness (0=dark/slow → 1=bright/fast)
    // ev.velocity = hit strength
    // Both modulate the filter cutoff — physically coupling motion to timbre
    const brightMod = 0.22 + ev.timbre * 0.78;
    const velMod    = 0.50 + ev.velocity * 0.50;
    const filtFreq  = Math.min(18000, cfg.filterFreq * brightMod * velMod);

    const amp  = ev.velocity * cfg.gainScale;
    const freq = midiToFreq(ev.pitch);
    const env  = cfg.envelope;

    // Set filter (role-specific methods may override for percussion)
    v.filter.type = cfg.filterType;
    v.filter.frequency.setValueAtTime(filtFreq, now);
    v.filter.Q.setValueAtTime(cfg.filterQ, now);

    // ── Dispatch by role → distinct synthesis per role ────────────────────
    switch (ev.role) {
      case 'KICK':    this._kick(v, now, amp); break;
      case 'BASS':    this._bassVoice(v, now, freq, amp, env, cfg.detune); break;
      case 'PERC':
        if (cfg.waveform === 'snare')      this._snare(v, now, amp);
        else if (cfg.waveform === 'hihat') this._hihat(v, now, amp, ev.timbre);
        else                               this._percVoice(v, now, freq, amp, env, ev.timbre);
        break;
      case 'PAD':     this._padVoice(v, now, freq, amp, env, cfg.detune); break;
      case 'LEAD':    this._leadVoice(v, now, freq, amp, env, cfg.detune); break;
      case 'ARP':     this._arpVoice(v, now, freq, amp, env, ev.timbre); break;
      case 'STRINGS': this._stringsVoice(v, now, freq, amp, env, cfg.detune); break;
      case 'CHOIR':   this._choirVoice(v, now, freq, amp, env); break;
      default:        this._oscVoice(v, now, freq, (cfg.waveform as OscillatorType) || 'sine',
                                     cfg.detune, amp, env, ev.duration); break;
    }

    this.roleEnergy[ev.role] = Math.min(1, (this.roleEnergy[ev.role] ?? 0) + amp * 0.5);
  }

  // ── KICK — Sub sweep + click transient ───────────────────────────────────
  private _kick(v: AudioVoice, now: number, amp: number): void {
    // Sub body
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(145, now);
    sub.frequency.exponentialRampToValueAtTime(48, now + 0.09);
    sub.frequency.exponentialRampToValueAtTime(36, now + 0.38);
    sub.connect(v.filter);
    sub.start(now); sub.stop(now + 0.42);
    // Click transient
    const click = this.ctx.createOscillator();
    click.type = 'sine';
    click.frequency.setValueAtTime(1400, now);
    click.frequency.exponentialRampToValueAtTime(220, now + 0.016);
    click.connect(v.filter);
    click.start(now); click.stop(now + 0.028);
    v.oscs = [sub, click];

    v.filter.type = 'lowpass';
    v.filter.frequency.value = 260;
    v.filter.Q.value = 0.5;

    const g = v.gainNode.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(amp * 1.15, now);
    g.exponentialRampToValueAtTime(amp * 0.55, now + 0.022);
    g.exponentialRampToValueAtTime(amp * 0.10, now + 0.13);
    g.exponentialRampToValueAtTime(0.0001, now + 0.38);
    v.endTime = now + 0.42;
  }

  // ── SNARE — Noise burst + body tone ──────────────────────────────────────
  private _snare(v: AudioVoice, now: number, amp: number): void {
    // Body
    const body = this.ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(250, now);
    body.frequency.exponentialRampToValueAtTime(155, now + 0.055);
    body.connect(v.filter);
    body.start(now); body.stop(now + 0.16);
    v.oscs.push(body);
    // Noise (snare wires)
    const ns = this.ctx.createBufferSource();
    ns.buffer = this.noiseBuffer;
    ns.loop   = false;
    ns.connect(v.filter);
    ns.start(now); ns.stop(now + 0.20);
    v.noise = ns;

    v.filter.type            = 'bandpass';
    v.filter.frequency.value = 3800;
    v.filter.Q.value         = 0.65;

    const g = v.gainNode.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(amp * 0.92, now);
    g.exponentialRampToValueAtTime(amp * 0.38, now + 0.024);
    g.exponentialRampToValueAtTime(0.0001, now + 0.18);
    v.endTime = now + 0.20;
  }

  // ── HI-HAT — Shaped noise ─────────────────────────────────────────────────
  private _hihat(v: AudioVoice, now: number, amp: number, open = 0): void {
    const ns = this.ctx.createBufferSource();
    ns.buffer = this.noiseBuffer;
    ns.loop   = false;
    ns.connect(v.filter);
    v.filter.type            = 'highpass';
    v.filter.frequency.value = 7800 + open * 2000;
    v.filter.Q.value         = 0.5;
    const dur = 0.032 + open * 0.28;
    ns.start(now); ns.stop(now + dur + 0.05);
    v.noise = ns;

    const g = v.gainNode.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(amp * 0.58, now);
    g.exponentialRampToValueAtTime(0.0001, now + dur);
    v.endTime = now + dur + 0.05;
  }

  // ── BASS — 2 detuned saws + sub sine (fat, resonant) ────────────────────
  private _bassVoice(v: AudioVoice, now: number, freq: number,
                     amp: number, env: Envelope, detune: number): void {
    const dur = Math.max(0.05, env.attack + env.decay + env.sustain * 1.8);
    // Low sub (octave down) for weight
    const sub = this.ctx.createOscillator();
    sub.type = 'sine'; sub.frequency.value = freq * 0.5;
    sub.detune.value = 0;
    // Two detuned saws for body
    const s1 = this.ctx.createOscillator();
    s1.type = 'sawtooth'; s1.frequency.value = freq; s1.detune.value = detune - 7;
    const s2 = this.ctx.createOscillator();
    s2.type = 'sawtooth'; s2.frequency.value = freq; s2.detune.value = detune + 7;

    // Mix: sub at 0.7, saws at 0.5 each
    const mSub = this.ctx.createGain(); mSub.gain.value = 0.70;
    const mS1  = this.ctx.createGain(); mS1.gain.value  = 0.50;
    const mS2  = this.ctx.createGain(); mS2.gain.value  = 0.50;
    v.mixNodes.push(mSub, mS1, mS2);

    sub.connect(mSub); mSub.connect(v.filter);
    s1.connect(mS1);   mS1.connect(v.filter);
    s2.connect(mS2);   mS2.connect(v.filter);

    [sub, s1, s2].forEach(o => { o.start(now); o.stop(now + dur + env.release + 0.08); });
    v.oscs = [sub, s1, s2];

    this._applyEnv(v.gainNode.gain, now, amp * 0.60, env, dur);
    v.endTime = now + dur + env.release + 0.08;
  }

  // ── PERC — Pitched percussion (non-kit) ───────────────────────────────────
  private _percVoice(v: AudioVoice, now: number, freq: number,
                     amp: number, env: Envelope, timbre: number): void {
    const dur = Math.max(0.04, env.attack + env.decay * 1.2);
    const o = this.ctx.createOscillator();
    o.type = timbre > 0.55 ? 'square' : 'triangle';
    o.frequency.setValueAtTime(freq * 1.45, now);
    o.frequency.exponentialRampToValueAtTime(freq, now + 0.018);
    o.connect(v.filter);
    o.start(now); o.stop(now + dur + 0.06);
    v.oscs.push(o);
    // Brief noise attack click
    const ns = this.ctx.createBufferSource();
    ns.buffer = this.noiseBuffer; ns.loop = false;
    ns.connect(v.filter);
    ns.start(now); ns.stop(now + Math.min(0.025, dur * 0.3));
    v.noise = ns;

    const g = v.gainNode.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(amp, now);
    g.exponentialRampToValueAtTime(0.0001, now + dur);
    v.endTime = now + dur + 0.06;
  }

  // ── PAD — Supersaw (3 detuned saws, lush pads) ───────────────────────────
  private _padVoice(v: AudioVoice, now: number, freq: number,
                    amp: number, env: Envelope, detune: number): void {
    const dur = Math.max(0.1, env.attack + env.decay + env.sustain * 2.5);
    const detunes = [detune - 14, detune, detune + 14];
    for (const d of detunes) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = d;
      o.connect(v.filter);
      o.start(now); o.stop(now + dur + env.release + 0.12);
      v.oscs.push(o);
    }
    this._applyEnv(v.gainNode.gain, now, amp * 0.40, env, dur);
    v.endTime = now + dur + env.release + 0.12;
  }

  // ── LEAD — Saw + triangle blend + vibrato LFO ────────────────────────────
  private _leadVoice(v: AudioVoice, now: number, freq: number,
                     amp: number, env: Envelope, detune: number): void {
    const dur = Math.max(0.05, env.attack + env.decay + env.sustain * 2.0);
    const end = now + dur + env.release + 0.08;

    // Vibrato LFO (starts delayed, like a real player applying vibrato)
    const lfo  = this.ctx.createOscillator();
    const lfoG = this.ctx.createGain();
    lfo.type = 'sine'; lfo.frequency.value = 5.2;
    lfoG.gain.setValueAtTime(0, now);
    lfoG.gain.linearRampToValueAtTime(5.5, now + env.attack + 0.12); // vibrato kicks in
    lfo.connect(lfoG);
    lfo.start(now); lfo.stop(end + 0.05);
    v.oscs.push(lfo);
    v.mixNodes.push(lfoG);

    // Saw
    const saw = this.ctx.createOscillator();
    saw.type = 'sawtooth'; saw.frequency.value = freq; saw.detune.value = detune;
    lfoG.connect(saw.detune);
    // Triangle octave up (adds brightness)
    const tri = this.ctx.createOscillator();
    tri.type = 'triangle'; tri.frequency.value = freq; tri.detune.value = detune + 4;
    lfoG.connect(tri.detune);

    const mSaw = this.ctx.createGain(); mSaw.gain.value = 0.70;
    const mTri = this.ctx.createGain(); mTri.gain.value = 0.35;
    v.mixNodes.push(mSaw, mTri);

    saw.connect(mSaw); mSaw.connect(v.filter);
    tri.connect(mTri); mTri.connect(v.filter);

    saw.start(now); tri.start(now);
    saw.stop(end); tri.stop(end);
    v.oscs.push(saw, tri);

    this._applyEnv(v.gainNode.gain, now, amp * 0.62, env, dur);
    v.endTime = end;
  }

  // ── ARP — Triangle fundamental + harmonic series (bell/crystalline) ───────
  private _arpVoice(v: AudioVoice, now: number, freq: number,
                    amp: number, env: Envelope, timbre: number): void {
    const dur = Math.max(0.04, env.attack + env.decay + env.sustain * 1.2);
    const end = now + dur + env.release + 0.06;

    // Harmonic series: fundamental + 2nd + 3rd partials with slight inharmonicity
    const ratios  = [1.0, 2.003, 3.009, 4.02];
    const weights = [1.0, 0.45,  0.22,  0.10];
    // Adjust spectral tilt by timbre (bright = more harmonics)
    const tiltFn = (i: number) => weights[i] * (timbre > 0.5 ? 1 : Math.pow(0.5, i * 0.6));

    for (let i = 0; i < ratios.length; i++) {
      const o  = this.ctx.createOscillator();
      const mg = this.ctx.createGain();
      o.type = i === 0 ? 'triangle' : 'sine';
      o.frequency.value = freq * ratios[i];
      mg.gain.value = tiltFn(i);
      v.mixNodes.push(mg);
      o.connect(mg); mg.connect(v.filter);
      o.start(now); o.stop(end);
      v.oscs.push(o);
    }

    this._applyEnv(v.gainNode.gain, now, amp * 0.65, env, dur);
    v.endTime = end;
  }

  // ── STRINGS — 2 detuned saws + tremolo LFO ───────────────────────────────
  private _stringsVoice(v: AudioVoice, now: number, freq: number,
                        amp: number, env: Envelope, detune: number): void {
    const dur = Math.max(0.1, env.attack + env.decay + env.sustain * 2.8);
    const end = now + dur + env.release + 0.12;

    // Tremolo LFO (slow amplitude modulation)
    const lfo  = this.ctx.createOscillator();
    const lfoG = this.ctx.createGain();
    lfo.type = 'sine'; lfo.frequency.value = 4.5;
    lfoG.gain.setValueAtTime(0, now);
    lfoG.gain.linearRampToValueAtTime(3.2, now + env.attack * 0.6 + 0.08);
    lfo.connect(lfoG);
    lfo.start(now); lfo.stop(end + 0.05);
    v.oscs.push(lfo);
    v.mixNodes.push(lfoG);

    const detunes = [detune - 9, detune + 9];
    for (const d of detunes) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = d;
      lfoG.connect(o.detune); // subtle pitch tremolo
      o.connect(v.filter);
      o.start(now); o.stop(end);
      v.oscs.push(o);
    }

    this._applyEnv(v.gainNode.gain, now, amp * 0.52, env, dur);
    v.endTime = end;
  }

  // ── CHOIR — Formant-weighted sine layers (vowel "ah") ────────────────────
  private _choirVoice(v: AudioVoice, now: number, freq: number,
                      amp: number, env: Envelope): void {
    const dur = Math.max(0.1, env.attack + env.decay + env.sustain * 3.0);
    const end = now + dur + env.release + 0.15;
    // Vowel "ah" formants: F1≈700Hz, F2≈1100Hz
    const F1 = 700, F2 = 1100;
    const harmonics = [1, 2, 3, 4, 5];

    for (let i = 0; i < harmonics.length; i++) {
      const h  = harmonics[i];
      const hf = freq * h;
      // Formant weighting: Gaussian proximity to F1 and F2
      const d1 = Math.abs(hf - F1), d2 = Math.abs(hf - F2);
      const formantW = Math.exp(-d1 * d1 / (F1 * F1 * 0.6)) + Math.exp(-d2 * d2 / (F2 * F2 * 0.5));
      const baseW = h === 1 ? 1.0 : 0.18;
      const weight = baseW + formantW * 0.55;

      const o  = this.ctx.createOscillator();
      const mg = this.ctx.createGain();
      o.type = h <= 2 ? 'triangle' : 'sine';
      o.frequency.value = hf;
      o.detune.value = (Math.random() - 0.5) * 7; // small chorus per partial
      mg.gain.value = weight;
      v.mixNodes.push(mg);
      o.connect(mg); mg.connect(v.filter);
      o.start(now); o.stop(end);
      v.oscs.push(o);
    }

    this._applyEnv(v.gainNode.gain, now, amp * 0.38, env, dur);
    v.endTime = end;
  }

  // ── Generic oscillator fallback ───────────────────────────────────────────
  private _oscVoice(v: AudioVoice, now: number, freq: number,
                    wave: OscillatorType, detune: number,
                    amp: number, env: Envelope, dur: number): void {
    const o = this.ctx.createOscillator();
    o.type = wave;
    o.frequency.setValueAtTime(freq, now);
    o.detune.setValueAtTime(detune, now);
    o.connect(v.filter);
    o.start(now);
    o.stop(now + dur + env.release + 0.05);
    v.oscs.push(o);
    this._applyEnv(v.gainNode.gain, now, amp, env, dur);
    v.endTime = now + dur + env.release + 0.05;
  }

  // ── Active voice count ────────────────────────────────────────────────────
  getActiveCount(role?: VoiceRole): number {
    const now = this.ctx?.currentTime ?? 0;
    if (role) return this.voices.filter(v => v.active && v.role === role && v.endTime > now).length;
    return this.voices.filter(v => v.active && v.endTime > now).length;
  }

  // ── FX controls ───────────────────────────────────────────────────────────
  setReverb(amount: number): void {
    if (!this._ready) return;
    const now = this.ctx.currentTime;
    this.reverbSend.gain.setTargetAtTime(amount, now, 0.1);
  }
  setDelay(amount: number, time: number): void {
    if (!this._ready) return;
    const now = this.ctx.currentTime;
    this.delaySend.gain.setTargetAtTime(amount * 0.32, now, 0.1);
    this.delayNode.delayTime.setTargetAtTime(time, now, 0.05);
    this.delayFb.gain.setTargetAtTime(amount * 0.38, now, 0.1);
  }
  setMasterGain(v: number): void {
    if (!this._ready) return;
    this.masterBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  // ── CUT ALL — instant silence (kills tails, delay loop, reverb) ──────────
  cutAll(): void {
    if (!this._ready) return;
    const now = this.ctx.currentTime;

    // 1. Kill every active voice oscillator/noise immediately
    for (const v of this.voices) {
      v.oscs.forEach(o => { try { o.stop(now); o.disconnect(); } catch {} });
      v.oscs = [];
      if (v.noise) { try { v.noise.stop(now); v.noise.disconnect(); } catch {} v.noise = null; }
      v.mixNodes.forEach(g => { try { g.disconnect(); } catch {} });
      v.mixNodes = [];
      v.gainNode.gain.cancelScheduledValues(now);
      v.gainNode.gain.setValueAtTime(0, now);
      v.active = false;
      v.endTime = 0;
    }

    // 2. Kill delay feedback loop first (prevents tail from re-feeding itself)
    this.delayFb.gain.cancelScheduledValues(now);
    this.delayFb.gain.setValueAtTime(0, now);

    // 3. Mute all FX sends/returns instantly
    this.delaySend.gain.cancelScheduledValues(now);
    this.delaySend.gain.setValueAtTime(0, now);
    this.delayRet.gain.cancelScheduledValues(now);
    this.delayRet.gain.setValueAtTime(0, now);
    this.reverbSend.gain.cancelScheduledValues(now);
    this.reverbSend.gain.setValueAtTime(0, now);
    this.reverbRet.gain.cancelScheduledValues(now);
    this.reverbRet.gain.setValueAtTime(0, now);

    // 4. Cut master bus
    this.masterBus.gain.cancelScheduledValues(now);
    this.masterBus.gain.setValueAtTime(0, now);
  }

  // ── Restore FX gains after cutAll (soft 40ms fade-in to avoid click) ─────
  restoreGains(reverbAmt: number, delayAmt: number, delayTime: number, masterGain: number): void {
    if (!this._ready) return;
    const now = this.ctx.currentTime;
    const T   = 0.04;
    this.masterBus.gain.setTargetAtTime(masterGain, now, T);
    this.reverbSend.gain.setTargetAtTime(reverbAmt, now, T);
    this.reverbRet.gain.setTargetAtTime(0.85, now, T);
    this.delaySend.gain.setTargetAtTime(delayAmt * 0.32, now, T);
    this.delayFb.gain.setTargetAtTime(delayAmt * 0.38, now, T);
    this.delayRet.gain.setTargetAtTime(0.65, now, T);
    this.delayNode.delayTime.setTargetAtTime(delayTime, now, 0.02);
  }

  // ── Decay role energy each frame ─────────────────────────────────────────
  tickEnergy(dt: number): void {
    for (const role in this.roleEnergy) {
      const r = role as VoiceRole;
      this.roleEnergy[r] = Math.max(0, (this.roleEnergy[r] ?? 0) - dt * 3.5);
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  dispose(): void {
    if (!this._ready) return;
    this.voices.forEach(v => {
      v.oscs.forEach(o => { try { o.stop(); } catch {} });
      v.mixNodes.forEach(g => { try { g.disconnect(); } catch {} });
      if (v.noise) { try { v.noise.stop(); } catch {} }
    });
    this.ctx.close().catch(() => {});
    this._ready = false;
  }
}

export const audioEngine = new MusicAudioEngine();