// Economy-Lite Engine
// Pure functions — no Math.random() in step functions; RNG only in init.
// All steps are O(n) or O(gridW*gridH) ≤ O(1024) — safe at 2k agents.

import type { MicroState } from '../micro/microState';
import type { FieldState } from '../field/fieldState';
import type { CultureState } from '../sociogenesis/sociogenesisTypes';
import type { SociogenesisState } from '../sociogenesis/sociogenesisTypes';
import {
  EconomyConfig, EconomyState, EconomyMetrics, EconomyEvent,
} from './economyTypes';

// ── Coordinate helpers ──────────────────────────────────────────────────────

/** World [-1..1] → flat grid index */
function worldToCell(wx: number, wy: number, gW: number, gH: number): number {
  const gx = Math.max(0, Math.min(gW - 1, Math.floor(((wx + 1) * 0.5) * gW)));
  const gy = Math.max(0, Math.min(gH - 1, Math.floor(((wy + 1) * 0.5) * gH)));
  return gy * gW + gx;
}

/** Field grid index from world coords (existing fieldState grid) */
function fieldIndex(wx: number, wy: number, fw: number, fh: number): number {
  const fx = Math.max(0, Math.min(fw - 1, Math.floor(((wx + 1) * 0.5) * fw)));
  const fy = Math.max(0, Math.min(fh - 1, Math.floor(((wy + 1) * 0.5) * fh)));
  return fy * fw + fx;
}

// ── 1. Init ─────────────────────────────────────────────────────────────────

/**
 * Generate static resource hotspots using seeded RNG.
 * Call once on enable or world reset.
 */
export function initEconomy(
  state: EconomyState,
  _cfg: EconomyConfig,
  rng: { next: () => number },
): void {
  const { R, R_static, gridW, gridH } = state;
  const size = gridW * gridH;

  // Base low level
  R_static.fill(0.08);

  // 5 Gaussian hotspots, deterministic from RNG seed
  const NUM_HOTSPOTS = 5;
  for (let h = 0; h < NUM_HOTSPOTS; h++) {
    const cx   = rng.next() * (gridW - 2) + 1;
    const cy   = rng.next() * (gridH - 2) + 1;
    const sigma = 2.5 + rng.next() * 4.5;
    const peak  = 0.55 + rng.next() * 0.45;

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const dx  = x - cx;
        const dy  = y - cy;
        const d2  = dx * dx + dy * dy;
        const val = peak * Math.exp(-d2 / (2 * sigma * sigma));
        const idx = y * gridW + x;
        R_static[idx] = Math.min(1, R_static[idx] + val);
      }
    }
  }

  // Copy static base into live field
  for (let i = 0; i < size; i++) R[i] = R_static[i];

  // Reset claim
  state.claimOwner.fill(-1);
  state.claimStrength.fill(0);
}

// ── 2. Resource field step ──────────────────────────────────────────────────

/**
 * Regen resource toward base; optionally derive from field channels (C/A/S).
 * O(gridW × gridH) = O(1024)
 */
export function stepResourceField(
  state: EconomyState,
  cfg: EconomyConfig,
  fieldState: FieldState | null,
  dt: number,
): void {
  const { R, R_static, gridW, gridH } = state;

  if (cfg.resourceMode === 'FIELD_DERIVED' && fieldState) {
    const fw = fieldState.width;
    const fh = fieldState.height;

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        // Map economy cell to field cell
        const fx  = Math.floor((x / gridW) * fw);
        const fy  = Math.floor((y / gridH) * fh);
        const fi  = fy * fw + fx;

        const cohesion = fieldState.cohesion[fi] || 0;
        const scarcity = fieldState.scarcity[fi] || 0;
        const tension  = fieldState.tension[fi]  || 0;

        const idx = y * gridW + x;
        // Derived target: field channels modulate wealth
        const target = Math.max(0, Math.min(1,
          R_static[idx] * 0.5 + 0.2 + cohesion * 0.35 - scarcity * 0.28 - tension * 0.12,
        ));
        // Smooth approach + regen rate
        R[idx] += (target - R[idx]) * dt * 0.4 + cfg.resourceRegen * dt * (1 - R[idx]);
        if (R[idx] < 0) R[idx] = 0;
        if (R[idx] > 1) R[idx] = 1;
      }
    }
  } else {
    // STATIC: simple regen toward the pre-generated bumps
    const size = gridW * gridH;
    const k = cfg.resourceRegen * dt;
    for (let i = 0; i < size; i++) {
      R[i] += k * (R_static[i] - R[i]) * 2;
      if (R[i] < 0) R[i] = 0;
      if (R[i] > 1) R[i] = 1;
    }
  }
}

// ── 3. Harvest + Metabolism ─────────────────────────────────────────────────

const HARVEST_THRESHOLD = 0.22; // minimum R to trigger harvest
const FATIGUE_SPEED_DAMPEN = 0.92; // vx/vy multiplied per tick when energy < 0.1

/**
 * Every agent:
 *   - loses metabolism*dt energy
 *   - harvests from resource cell if R > threshold
 *   - enters fatigue mode (speed dampen) if energy < 0.1
 *
 * O(count)
 */
export function harvestAndMetabolize(
  state: EconomyState,
  cfg: EconomyConfig,
  micro: MicroState,
  fieldState: FieldState | null,
  dt: number,
): void {
  const { R, gridW, gridH } = state;

  for (let i = 0; i < micro.count; i++) {
    // Lazy-init energy if 0 (avoids agents with 0 energy from spawn)
    if (micro.energy[i] === 0) micro.energy[i] = 1.0;

    // Metabolism drain
    micro.energy[i] -= cfg.metabolism * dt;

    // Harvest
    const cell   = worldToCell(micro.x[i], micro.y[i], gridW, gridH);
    const rLevel = R[cell];

    if (rLevel > HARVEST_THRESHOLD) {
      // Field bonus: cohesion boosts, stress taxes
      let bonus = 1.0;
      if (fieldState) {
        const fi      = fieldIndex(micro.x[i], micro.y[i], fieldState.width, fieldState.height);
        const maxFi   = fieldState.cohesion.length - 1;
        const fi_safe = fi > maxFi ? maxFi : fi;
        bonus += fieldState.cohesion[fi_safe] * 0.2 - fieldState.tension[fi_safe] * 0.2;
      }

      const gain   = cfg.resourceHarvest * rLevel * bonus * dt;
      micro.energy[i] += gain;
      R[cell] -= gain * 0.55; // local depletion
      if (R[cell] < 0) R[cell] = 0;
    }

    // Fatigue mode: dampen speed when starving
    if (micro.energy[i] < 0.1) {
      micro.vx[i] *= FATIGUE_SPEED_DAMPEN;
      micro.vy[i] *= FATIGUE_SPEED_DAMPEN;
    }

    // Clamp energy
    if (micro.energy[i] < 0) micro.energy[i] = 0;
    if (micro.energy[i] > 1) micro.energy[i] = 1;
  }
}

// ── 4. Ritual / Totem social costs ─────────────────────────────────────────

const RITUAL_COST_PER_SEC = 0.010; // energy drain for ritual participants
const TOTEM_TAX_PER_SEC   = 0.004; // energy drain for totem devotees

/**
 * Symbols cost energy to maintain — transforms sociogenesis into material politics.
 * O(rituals × count + totems × count)
 */
export function applyRitualCosts(
  _eState: EconomyState,
  _cfg: EconomyConfig,
  socio: SociogenesisState,
  micro: MicroState,
  dt: number,
): void {
  const nowSec = socio.lastTickTime;

  // ── Ritual participants drain ──
  for (const ritual of socio.rituals) {
    const totem = socio.totems.find(t => t.id === ritual.totemId);
    if (!totem) continue;
    const phase = ((nowSec - ritual.bornAt) % ritual.periodSec) / ritual.periodSec;
    const active = phase < ritual.dutyCycle;
    if (!active) continue;

    const r2 = totem.radius * totem.radius;
    for (let i = 0; i < micro.count; i++) {
      const dx = micro.x[i] - totem.pos.x;
      const dy = micro.y[i] - totem.pos.y;
      if (dx * dx + dy * dy < r2) {
        micro.energy[i] -= RITUAL_COST_PER_SEC * dt * ritual.intensity;
        if (micro.energy[i] < 0) micro.energy[i] = 0;
      }
    }
  }

  // ── Totem maintenance tax (small drain from devotees) ──
  for (const totem of socio.totems) {
    if (totem.kind === 'ARCHIVE') continue; // Archive is passive, no cost
    const r2 = totem.radius * totem.radius;
    for (let i = 0; i < micro.count; i++) {
      const dx = micro.x[i] - totem.pos.x;
      const dy = micro.y[i] - totem.pos.y;
      if (dx * dx + dy * dy < r2) {
        micro.energy[i] -= TOTEM_TAX_PER_SEC * dt * totem.strength;
        if (micro.energy[i] < 0) micro.energy[i] = 0;
      }
    }
  }
}

// ── 5. Claim field ──────────────────────────────────────────────────────────

/**
 * Agents stamp their groupId onto cells they occupy.
 * Contested cells lose strength; weak cells reset to neutral.
 * Gentle 4-neighbour diffusion spreads control.
 * O(count + gridW×gridH)
 */
export function stepClaimField(
  state: EconomyState,
  cfg: EconomyConfig,
  micro: MicroState,
  culture: CultureState | null,
  dt: number,
): void {
  const { claimOwner, claimStrength, tmp, gridW, gridH } = state;
  const size = gridW * gridH;

  // Decay
  const decayFactor = Math.max(0, 1 - cfg.claimDecay * dt);
  for (let i = 0; i < size; i++) claimStrength[i] *= decayFactor;

  // Agents deposit claim
  for (let i = 0; i < micro.count; i++) {
    const cell    = worldToCell(micro.x[i], micro.y[i], gridW, gridH);
    const groupId = culture ? culture.memeId[i] : micro.type[i];

    if (claimOwner[cell] < 0 || claimOwner[cell] === groupId) {
      // Reinforce
      claimOwner[cell]    = groupId;
      claimStrength[cell] = Math.min(1, claimStrength[cell] + cfg.claimGain * dt);
    } else {
      // Contest: weaken
      claimStrength[cell] = Math.max(0, claimStrength[cell] - cfg.claimGain * dt * 0.6);
      if (claimStrength[cell] < 0.08) {
        claimOwner[cell]    = groupId; // flip
        claimStrength[cell] = 0.08;
      }
    }
  }

  // Gentle 4-neighbour diffusion
  tmp.fill(0);
  const diffAmt = cfg.claimDiffusion * dt * 0.06; // very small
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const idx = y * gridW + x;
      if (claimStrength[idx] < 0.06) continue;
      const owner  = claimOwner[idx];
      const spread = claimStrength[idx] * diffAmt;

      const n0 = y > 0         ? (y - 1) * gridW + x     : -1;
      const n1 = y < gridH - 1 ? (y + 1) * gridW + x     : -1;
      const n2 = x > 0         ? y * gridW + (x - 1)     : -1;
      const n3 = x < gridW - 1 ? y * gridW + (x + 1)     : -1;

      for (const n of [n0, n1, n2, n3]) {
        if (n < 0 || claimOwner[n] >= 0) continue; // only expand into neutral cells
        claimOwner[n] = owner;
        tmp[n] += spread;
      }
    }
  }

  // Apply diffusion + clear weak cells
  for (let i = 0; i < size; i++) {
    claimStrength[i] = Math.min(1, claimStrength[i] + tmp[i]);
    if (claimStrength[i] < 0.015) {
      claimOwner[i]    = -1;
      claimStrength[i] = 0;
    }
  }
}

// ── 6. Metrics ──────────────────────────────────────────────────────────────

/**
 * Compute economy observables. Sampled to max 200 agents for speed.
 * O(sample) + O(gridW×gridH)
 */
export function computeEconomyMetrics(
  state: EconomyState,
  _cfg: EconomyConfig,
  micro: MicroState,
  prev: EconomyMetrics,
): { metrics: EconomyMetrics; events: EconomyEvent[] } {
  const { R, claimOwner, gridW, gridH } = state;
  const size    = gridW * gridH;
  const count   = micro.count;
  const events: EconomyEvent[] = [];

  if (count === 0) return { metrics: { ...prev }, events };

  // ── Energy stats (sampled) ──
  const step      = Math.max(1, Math.floor(count / 200));
  const samples: number[] = [];
  let fatigueCount = 0;

  for (let i = 0; i < count; i += step) {
    const e = micro.energy[i];
    samples.push(e);
    if (e < 0.1) fatigueCount++;
  }

  const sN        = samples.length;
  const meanEnergy = sN > 0 ? samples.reduce((a, b) => a + b, 0) / sN : 0.5;

  // Gini from sorted sample
  samples.sort((a, b) => a - b);
  let gini = 0;
  if (sN > 1) {
    let num = 0;
    const sum = samples.reduce((a, b) => a + b, 0);
    for (let i = 0; i < sN; i++) num += (2 * (i + 1) - sN - 1) * samples[i];
    gini = sum > 0 ? Math.max(0, Math.min(1, num / (sN * sum))) : 0;
  }

  // ── Resource scarcity ──
  let scarce = 0;
  for (let i = 0; i < size; i++) { if (R[i] < 0.25) scarce++; }
  const scarcityRatio = scarce / size;

  // ── Territory ──
  const groupCells = new Map<number, number>();
  let totalClaimed = 0;
  for (let i = 0; i < size; i++) {
    const o = claimOwner[i];
    if (o >= 0) {
      groupCells.set(o, (groupCells.get(o) || 0) + 1);
      totalClaimed++;
    }
  }
  let dominantGroup = -1;
  let dominantCount = 0;
  groupCells.forEach((cnt, g) => { if (cnt > dominantCount) { dominantCount = cnt; dominantGroup = g; } });
  const territoryShare = totalClaimed > 0 ? dominantCount / totalClaimed : 0;

  // ── Famine tracking ──
  const famineConsecutive = meanEnergy < 0.2
    ? prev.famineConsecutive + 1
    : 0;

  // ── Generate events ──
  if (famineConsecutive === 3) {
    events.push({ icon: '☠', message: `FAMINE — energy critically low (${(meanEnergy * 100).toFixed(0)}%)`, color: '#ef4444' });
  }
  if (gini > prev.gini + 0.05 && gini > 0.40) {
    events.push({ icon: '⚖', message: `INEQUALITY SPIKE — Gini ${gini.toFixed(2)}`, color: '#fbbf24' });
  }
  if (dominantGroup !== prev.dominantGroup && dominantGroup >= 0) {
    events.push({ icon: '🏴', message: `TERRITORY SHIFT — group ${dominantGroup} now dominant`, color: '#a78bfa' });
  }

  return {
    metrics: { meanEnergy, gini, scarcityRatio, dominantGroup, territoryShare, fatigueCount, famineConsecutive },
    events,
  };
}