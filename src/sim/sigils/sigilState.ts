// PATCH 4.5-SIGILS: Sigil field state (separate from main FieldState)
// Sigils are temporary local fields deposited by interactions and emergent patterns

export type SigilKind = 'bond' | 'rift' | 'bloom' | 'oath';

export interface SigilFieldState {
  width: number;
  height: number;
  bond: Float32Array;
  rift: Float32Array;
  bloom: Float32Array;
  oath: Float32Array;
}

export interface SigilConfig {
  enabled: boolean;            // master toggle (SAFE)
  showOverlay: boolean;        // render glyphs overlay
  influence: number;           // 0..1 how much sigils modulate micro rules
  deposit: number;             // base deposit strength
  diffusion: number;           // 0..1
  decay: number;               // 0..1 per second-ish
}

export const createSigilState = (w: number, h: number): SigilFieldState => {
  const n = w * h;
  return {
    width: w,
    height: h,
    bond: new Float32Array(n),
    rift: new Float32Array(n),
    bloom: new Float32Array(n),
    oath: new Float32Array(n),
  };
};

export const createSigilConfig = (): SigilConfig => ({
  enabled: false,
  showOverlay: false,
  influence: 0.15, // Reduced from 0.35
  deposit: 0.3,    // Reduced from 1.0 - much less overwhelming
  diffusion: 0.08,
  decay: 0.95,     // Increased from 0.55 - faster decay
});

const clamp01 = (v: number) => v < 0 ? 0 : v > 1 ? 1 : v;

const idxAt = (x: number, y: number, w: number, h: number) => {
  const gx = Math.floor(((x + 1) / 2) * w);
  const gy = Math.floor(((y + 1) / 2) * h);
  const cx = Math.max(0, Math.min(w - 1, gx));
  const cy = Math.max(0, Math.min(h - 1, gy));
  return cy * w + cx;
};

export function depositSigil(s: SigilFieldState, x: number, y: number, kind: SigilKind, amount: number) {
  const i = idxAt(x, y, s.width, s.height);
  const a = clamp01(amount);
  if (kind === 'bond') s.bond[i] = clamp01(s.bond[i] + a);
  if (kind === 'rift') s.rift[i] = clamp01(s.rift[i] + a);
  if (kind === 'bloom') s.bloom[i] = clamp01(s.bloom[i] + a);
  if (kind === 'oath') s.oath[i] = clamp01(s.oath[i] + a);
}

export function sampleSigils(s: SigilFieldState, x: number, y: number) {
  const i = idxAt(x, y, s.width, s.height);
  return { bond: s.bond[i], rift: s.rift[i], bloom: s.bloom[i], oath: s.oath[i] };
}

// Small, fast diffusion + decay
export function updateSigils(s: SigilFieldState, cfg: SigilConfig, dt: number) {
  if (!cfg.enabled) return;

  const w = s.width, h = s.height;
  const n = w * h;

  // Single buffer for neighbor diffusion (reuse arrays via temp)
  // Do minimal 4-neighbor diffusion in-place using a scratch copy.
  const b0 = s.bond.slice();  // acceptable at 32x32/64x64; if too slow, replace with persistent scratch buffers
  const r0 = s.rift.slice();
  const l0 = s.bloom.slice();
  const o0 = s.oath.slice();

  const diff = cfg.diffusion * dt;
  const decay = Math.exp(-cfg.decay * dt);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const up = (y > 0) ? i - w : i;
      const dn = (y < h - 1) ? i + w : i;
      const lf = (x > 0) ? i - 1 : i;
      const rt = (x < w - 1) ? i + 1 : i;

      const db = (b0[up] + b0[dn] + b0[lf] + b0[rt] - 4 * b0[i]) * diff;
      const dr = (r0[up] + r0[dn] + r0[lf] + r0[rt] - 4 * r0[i]) * diff;
      const dl = (l0[up] + l0[dn] + l0[lf] + l0[rt] - 4 * l0[i]) * diff;
      const do_ = (o0[up] + o0[dn] + o0[lf] + o0[rt] - 4 * o0[i]) * diff;

      s.bond[i] = clamp01((b0[i] + db) * decay);
      s.rift[i] = clamp01((r0[i] + dr) * decay);
      s.bloom[i] = clamp01((l0[i] + dl) * decay);
      s.oath[i] = clamp01((o0[i] + do_) * decay);
    }
  }
}

// Clear all sigils from the field
export function clearSigils(s: SigilFieldState) {
  s.bond.fill(0);
  s.rift.fill(0);
  s.bloom.fill(0);
  s.oath.fill(0);
}
