// ── Psyche Lab — Flow Field (Grid-based vector field) ────────────────────────
import { PsycheState, FLOW_W, FLOW_H } from './psycheTypes';
import { ARCHETYPES, ARCHETYPE_POSITIONS, archetypeFlowAt } from './archetypes';
import { PsycheConfig } from './psycheTypes';

/** Update the flow field (call every N frames) */
export function updateFlowField(
  state: PsycheState,
  config: PsycheConfig,
): void {
  const { flowU, flowV, breathPhase, elapsed } = state;
  // frozenFlow: use t=0 so all time-varying sinusoidal waves become constants.
  // Only the static self-pull + archetype attractors remain active → true
  // attractor landscape that particles can settle into.
  const t  = config.frozenFlow ? 0 : elapsed;
  const bp = breathPhase;
  const breathSin = Math.sin(bp);
  const gi  = config.danceIntensity;

  for (let gy = 0; gy < FLOW_H; gy++) {
    for (let gx = 0; gx < FLOW_W; gx++) {
      // World position of cell center
      const wx = ((gx + 0.5) / FLOW_W) * 2.0 - 1.0;
      const wy = ((gy + 0.5) / FLOW_H) * 2.0 - 1.0;
      const r  = Math.sqrt(wx * wx + wy * wy);
      const nr = r > 0.001 ? r : 0.001;

      // ── Base flow: superposed sinusoidal waves ───────────────────────────
      let u = 0, v = 0;

      // Wave 1 — slow global rotation keyed to breathing
      u += -wy * 0.35 * breathSin * gi;
      v +=  wx * 0.35 * breathSin * gi;

      // Wave 2 — undulating laminar flow
      u += Math.sin(wy * 3.14 + t * 0.38) * 0.20 * gi;
      v += Math.cos(wx * 2.71 + t * 0.29) * 0.20 * gi;

      // Wave 3 — finer turbulent detail
      u += Math.sin(wx * 5.1 - wy * 3.7 + t * 0.72) * 0.13 * gi;
      v += Math.cos(wy * 4.9 + wx * 2.3 - t * 0.61) * 0.13 * gi;

      // Wave 4 — slow drift
      u += Math.cos(wx * 1.4 + wy * 2.8 + t * 0.18) * 0.09 * gi;
      v += Math.sin(wx * 2.2 - wy * 1.6 + t * 0.22) * 0.09 * gi;

      // ── SELF center: gentle inward pull ──────────────────────────────────
      const selfPull = config.selfPull;
      u -= (wx / nr) * Math.max(0, selfPull - r * 0.9) * 0.5;
      v -= (wy / nr) * Math.max(0, selfPull - r * 0.9) * 0.5;

      // ── ID core: outward push from bottom ────────────────────────────────────
      const idx_dy = wy - 0.58;
      const idR = Math.sqrt(wx * wx + idx_dy * idx_dy);
      if (idR < 0.2) {
        const destroyerActive = config.archetypesOn && state.archetypeActive[11];
        const idForce = (0.2 - idR) * 0.6 * gi * (destroyerActive ? 1.0 : 0.5);
        u += (wx / (idR + 0.01)) * idForce;
        v += (idx_dy / (idR + 0.01)) * idForce;
      }

      // ── SUPEREGO ring: downward pressure from top ─────────────────────────
      const sgDy = wy + 0.66;
      const sgR  = Math.sqrt(wx * wx + sgDy * sgDy);
      if (sgR < 0.18 && config.archetypesOn) {
        v += sgDy * 0.5 * gi * 0.4; // push down from superego
      }

      // ── Archetype field contributions ─────────────────────────────────────
      if (config.archetypesOn) {
        for (let ai = 0; ai < ARCHETYPES.length; ai++) {
          if (!state.archetypeActive[ai]) continue;
          const arch = ARCHETYPES[ai];
          const pos  = ARCHETYPE_POSITIONS[arch.id];
          const [du, dv] = archetypeFlowAt(arch, pos, wx, wy, t, state.archetypeStrength[ai] * gi * 0.55);
          u += du;
          v += dv;
        }
      }

      // ── Exponential moving average smoothing (prevents jitter) ───────────
      const idx = gy * FLOW_W + gx;
      flowU[idx] = flowU[idx] * 0.72 + u * 0.28;
      flowV[idx] = flowV[idx] * 0.72 + v * 0.28;
    }
  }
}

/** Bilinear interpolation sample from the flow field */
export function sampleFlowField(
  state: PsycheState,
  wx: number,
  wy: number,
): [number, number] {
  // Guard: non-finite positions must not reach the flow-field grid
  if (!isFinite(wx) || !isFinite(wy)) return [0, 0];

  // Hard-clamp world coords to [-1, 1] so grid indices stay in-bounds
  const wcx = Math.max(-1, Math.min(1, wx));
  const wcy = Math.max(-1, Math.min(1, wy));

  // Map world coords [-1,1] to grid [0, FLOW_W/H - 1]
  const gxF = ((wcx + 1) * 0.5) * (FLOW_W - 1);
  const gyF = ((wcy + 1) * 0.5) * (FLOW_H - 1);

  const gx0 = Math.max(0, Math.min(FLOW_W - 1, Math.floor(gxF)));
  const gy0 = Math.max(0, Math.min(FLOW_H - 1, Math.floor(gyF)));
  const gx1 = Math.min(gx0 + 1, FLOW_W - 1);
  const gy1 = Math.min(gy0 + 1, FLOW_H - 1);
  const tx  = gxF - gx0;
  const ty  = gyF - gy0;

  const i00 = gy0 * FLOW_W + gx0;
  const i10 = gy0 * FLOW_W + gx1;
  const i01 = gy1 * FLOW_W + gx0;
  const i11 = gy1 * FLOW_W + gx1;

  const u = state.flowU[i00] * (1-tx)*(1-ty)
          + state.flowU[i10] * tx*(1-ty)
          + state.flowU[i01] * (1-tx)*ty
          + state.flowU[i11] * tx*ty;

  const v = state.flowV[i00] * (1-tx)*(1-ty)
          + state.flowV[i10] * tx*(1-ty)
          + state.flowV[i01] * (1-tx)*ty
          + state.flowV[i11] * tx*ty;

  return [u, v];
}