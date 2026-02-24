// ── Psyche Lab — Main Simulation Step ────────────────────────────────────────
import { PsycheState, PsycheConfig, TAG_NONE, MAX_LINKS } from './psycheTypes';
import { recycleQuantum } from './psycheState';
import { updateFlowField, sampleFlowField } from './flowField';
import { ARCHETYPES, ARCHETYPE_POSITIONS, archetypeTransformQuantum } from './archetypes';

// Reusable spatial grid for spring link detection (avoids allocations)
const GRID_SIZE = 20;
const CELL = 2.0 / GRID_SIZE; // world units per cell
const grid: number[][] = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => []);

function gridIndex(wx: number, wy: number): number {
  // Guard against NaN / Infinity — returns safe cell 0
  if (!isFinite(wx) || !isFinite(wy)) return 0;
  const gx = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((wx + 1) / CELL)));
  const gy = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((wy + 1) / CELL)));
  return gy * GRID_SIZE + gx;
}

/** Compute gaussian weight of region at (wx, wy) */
function gaussianAt(
  wx: number, wy: number,
  cx: number, cy: number,
  sigma: number,
): number {
  const d2 = (wx - cx) ** 2 + (wy - cy) ** 2;
  return Math.exp(-d2 / (2 * sigma * sigma));
}

export function stepPsyche(
  state: PsycheState,
  config: PsycheConfig,
  dt: number, // seconds (typically ~0.016)
): void {
  const { count } = state;
  if (count === 0) return;

  // ── 1. Breath oscillator ───────────────────────────────────────────────────
  state.breathT    += dt;
  state.breathPhase = (state.breathT % config.breathPeriod) / config.breathPeriod * Math.PI * 2;
  const breathSin  = Math.sin(state.breathPhase); // -1..1
  const breathIn   = (breathSin + 1) * 0.5;       // 0..1 (1=inhale peak)

  // ── 2. Flow field update (every 3 ticks) ──────────────────────────────────
  state.tick++;
  if (state.tick % 3 === 0) {
    updateFlowField(state, config);
  }

  // ── 3. Decay and apply spring links ───────────────────────────────────────
  let lc = 0;
  for (let li = 0; li < state.linkCount; li++) {
    state.linkTtl[li] -= dt;
    if (state.linkTtl[li] <= 0) continue;
    // Compact
    state.linkA[lc]   = state.linkA[li];
    state.linkB[lc]   = state.linkB[li];
    state.linkTtl[lc] = state.linkTtl[li];
    lc++;
  }
  state.linkCount = lc;

  // Apply spring forces
  const springK       = config.springK * dt * 60; // frame-rate-normalized
  const restLen       = config.springRestLen;
  for (let li = 0; li < state.linkCount; li++) {
    const a = state.linkA[li];
    const b = state.linkB[li];
    if (a < 0 || b < 0 || a >= count || b >= count) continue;
    const dx = state.x[b] - state.x[a];
    const dy = state.y[b] - state.y[a];
    if (!isFinite(dx) || !isFinite(dy)) continue;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.001 || !isFinite(d)) continue;
    const stretch = (d - restLen) * springK;
    const fx = (dx / d) * stretch;
    const fy = (dy / d) * stretch;
    if (!isFinite(fx) || !isFinite(fy)) continue;
    state.vx[a] += fx;
    state.vy[a] += fy;
    state.vx[b] -= fx;
    state.vy[b] -= fy;
  }

  // ── 4. Build spatial grid for new link detection ──────────────────────────
  for (let c = 0; c < GRID_SIZE * GRID_SIZE; c++) grid[c].length = 0;
  for (let i = 0; i < count; i++) {
    // Skip any particle whose position was corrupted (NaN / Infinity)
    if (!isFinite(state.x[i]) || !isFinite(state.y[i])) {
      recycleQuantum(state, i);
      continue;
    }
    grid[gridIndex(state.x[i], state.y[i])].push(i);
  }

  // ── 5. Integrate each quantum ──────────────────────────────────────────────
  const damping     = 1 - config.damping * dt;
  const maxSpeed    = config.maxSpeed;
  const flowGain    = config.flowGain * config.danceIntensity;
  const archOn      = config.archetypesOn;
  // stateRelaxRate slows inner-state time constants → more "memory" per quantum.
  // At 0.3: a quantum must spend ~3× longer in a region to fully converge its state,
  // preventing flip-flopping when particles drift through multiple zones.
  const relaxDt     = dt * (config.stateRelaxRate ?? 1.0);

  for (let i = 0; i < count; i++) {
    let x = state.x[i], y = state.y[i], vx = state.vx[i], vy = state.vy[i];

    // Skip/recycle corrupted particles before any computation
    if (!isFinite(x) || !isFinite(y) || !isFinite(vx) || !isFinite(vy)) {
      recycleQuantum(state, i);
      continue;
    }

    // ── Flow field ──────────────────────────────────────────────────────────
    const [fu, fv] = sampleFlowField(state, x, y);
    if (isFinite(fu)) vx += fu * flowGain;
    if (isFinite(fv)) vy += fv * flowGain;

    // ── Breathing modulation — gentle pulsation ─────────────────────────────
    const breathPush = (1 - breathIn) * 0.012 * config.danceIntensity;
    const nr = Math.sqrt(x * x + y * y);
    if (nr > 0.05) {
      vx += (x / nr) * breathPush;
      vy += (y / nr) * breathPush;
    }

    // ── Region effects (use relaxDt so stateRelaxRate controls memory depth) ─
    let charge     = state.charge[i];
    let valence    = state.valence[i];
    let coherence  = state.coherence[i];
    let arousal    = state.arousal[i];
    let inhibition = state.inhibition[i];

    // Self center — integrating attractor
    const selfW = gaussianAt(x, y, 0, 0, 0.12);
    coherence   = Math.min(1, coherence + selfW * 0.45 * relaxDt);
    inhibition  = inhibition  + (0.2 - inhibition) * selfW * 0.35 * relaxDt;
    charge      = charge + (0.5 - charge) * selfW * 0.20 * relaxDt;
    arousal     = arousal + (0.3 - arousal) * selfW * 0.25 * relaxDt;
    valence     = valence + (0 - valence) * selfW * 0.10 * relaxDt;

    // ID core — amplifies charge + arousal, reduces coherence
    const idW = gaussianAt(x, y, 0, 0.58, 0.18);
    charge    = Math.min(1, charge    + idW * 0.30 * relaxDt);
    arousal   = Math.min(1, arousal   + idW * 0.25 * relaxDt);
    coherence = Math.max(0, coherence - idW * 0.20 * relaxDt);
    valence   = valence - idW * 0.08 * relaxDt;

    // Shadow — decreases coherence, increases inhibition
    const shadowW  = gaussianAt(x, y, -0.42, 0.35, 0.22);
    coherence  = Math.max(0, coherence  - shadowW * 0.18 * relaxDt);
    inhibition = Math.min(1, inhibition + shadowW * 0.15 * relaxDt);
    charge     = Math.min(1, charge     + shadowW * 0.10 * relaxDt);

    // Collective — increases coherence and archetype exposure
    const collectW = gaussianAt(x, y, 0.40, 0.32, 0.24);
    coherence  = Math.min(1, coherence + collectW * 0.15 * relaxDt);

    // Ego — increases valence, arousal
    const egoW = gaussianAt(x, y, 0.40, -0.30, 0.22);
    valence    = Math.min(1, valence + egoW * 0.12 * relaxDt);
    arousal    = Math.min(1, arousal + egoW * 0.10 * relaxDt);

    // Superego — increases inhibition, reduces arousal
    const sgW  = gaussianAt(x, y, 0, -0.66, 0.20);
    inhibition = Math.min(1, inhibition + sgW * 0.20 * relaxDt);
    arousal    = Math.max(0, arousal    - sgW * 0.15 * relaxDt);
    valence    = valence + sgW * 0.05 * relaxDt;

    // Inhibition slows down quanta (superego locks movement)
    vx *= (1 - inhibition * 0.35 * dt);
    vy *= (1 - inhibition * 0.35 * dt);

    // ── Archetype operator effects ─────────────────────────────────────────
    if (archOn) {
      for (let ai = 0; ai < ARCHETYPES.length; ai++) {
        if (!state.archetypeActive[ai]) continue;
        const arch  = ARCHETYPES[ai];
        const apos  = ARCHETYPE_POSITIONS[arch.id];
        const str   = state.archetypeStrength[ai];
        const result = archetypeTransformQuantum(
          arch.id, [x, y], apos,
          charge, valence, coherence, arousal, inhibition,
          arch.fieldRadius, str, dt,
        );
        charge     = Math.max(0, Math.min(1, result.charge));
        valence    = Math.max(-1, Math.min(1, result.valence));
        coherence  = Math.max(0, Math.min(1, result.coherence));
        arousal    = Math.max(0, Math.min(1, result.arousal));
        inhibition = Math.max(0, Math.min(1, result.inhibition));
      }
    }

    // Write back inner state
    state.charge[i]    = charge;
    state.valence[i]   = valence;
    state.coherence[i] = coherence;
    state.arousal[i]   = arousal;
    state.inhibition[i]= inhibition;

    // ── Velocity integration ────────────────────────────────────────────────
    vx *= damping;
    vy *= damping;
    // Clamp to maxSpeed — also catches any lingering NaN
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (!isFinite(speed) || speed === 0) {
      vx = 0; vy = 0;
    } else if (speed > maxSpeed) {
      vx = (vx / speed) * maxSpeed;
      vy = (vy / speed) * maxSpeed;
    }
    x += vx * dt * 55; // scale to get nice visual motion
    y += vy * dt * 55;

    // ── Soft boundary — keep within mandala radius ~0.90 ──────────────────
    const dist = Math.sqrt(x * x + y * y);
    if (dist > 0.90 && dist > 0) {
      // Hard clamp: project back onto the boundary circle immediately.
      // This prevents positions ever going out-of-bounds for sampleFlowField.
      const inv = 0.90 / dist;
      x = x * inv;
      y = y * inv;
      // Dampen outward velocity component so particles don't keep bouncing out
      const vDot = vx * (x / 0.90) + vy * (y / 0.90); // positive = moving outward
      if (vDot > 0) {
        vx -= (x / 0.90) * vDot * 0.8;
        vy -= (y / 0.90) * vDot * 0.8;
      }
    }

    state.x[i]  = x;
    state.y[i]  = y;
    state.vx[i] = vx;
    state.vy[i] = vy;

    // ── Archetype tagging ─────────────────────────────────────────────────
    if (archOn) {
      updateTag(state, i, dt);
    }

    // ── Age / recycle ──────────────────────────────────────────────────────
    state.age[i] += dt;
    if (state.age[i] > config.deathAge) {
      recycleQuantum(state, i);
    }
  }

  // ── 6. Form new spring links (sparse sampling) ─────────────────────────────
  if (state.linkCount < MAX_LINKS - 10) {
    const triesPerFrame = Math.floor(count * 0.04);
    const linkR         = config.linkRadius;
    const linkR2        = linkR * linkR;
    for (let t = 0; t < triesPerFrame; t++) {
      const i = Math.floor(Math.random() * count);
      if (state.coherence[i] < 0.35) continue;
      // Guard: skip particles with invalid positions
      if (!isFinite(state.x[i]) || !isFinite(state.y[i])) continue;
      const gx = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((state.x[i] + 1) / CELL)));
      const gy = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((state.y[i] + 1) / CELL)));
      for (let dy2 = -1; dy2 <= 1; dy2++) {
        for (let dx2 = -1; dx2 <= 1; dx2++) {
          const nx = gx + dx2, ny = gy + dy2;
          if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
          const cell = grid[ny * GRID_SIZE + nx];
          if (!cell) continue; // should never be undefined, but guard anyway
          for (const j of cell) {
            if (j === i) continue;
            const ddx = state.x[j] - state.x[i];
            const ddy = state.y[j] - state.y[i];
            if (ddx * ddx + ddy * ddy > linkR2) continue;
            // Check valence resonance
            if (Math.abs(state.valence[i] - state.valence[j]) > config.linkValDiff) continue;
            // Check probability
            if (Math.random() > config.linkProbability * 40) continue;
            // Check not already linked
            let alreadyLinked = false;
            for (let li = 0; li < state.linkCount; li++) {
              if ((state.linkA[li] === i && state.linkB[li] === j) ||
                  (state.linkA[li] === j && state.linkB[li] === i)) {
                alreadyLinked = true; break;
              }
            }
            if (!alreadyLinked && state.linkCount < MAX_LINKS) {
              state.linkA[state.linkCount]   = i;
              state.linkB[state.linkCount]   = j;
              state.linkTtl[state.linkCount] = config.linkMaxTtl * (0.5 + Math.random() * 0.5);
              state.linkCount++;
            }
          }
        }
      }
    }
  }

  state.elapsed += dt;
}

function updateTag(state: PsycheState, i: number, dt: number): void {
  const x  = state.x[i], y  = state.y[i];
  const coherence   = state.coherence[i];
  const valence     = state.valence[i];
  const inhibition  = state.inhibition[i];
  const arousal     = state.arousal[i];
  let   tag         = state.tag[i];

  state.tagAge[i] += dt;

  // Decay tag over time (quanta change their dominant archetype)
  if (tag !== TAG_NONE && state.tagAge[i] > 8 + Math.random() * 6) {
    tag = TAG_NONE;
    state.tagAge[i] = 0;
  }

  if (tag !== TAG_NONE) return; // already tagged

  // Check for tag acquisition based on region + inner state
  const r = Math.sqrt(x * x + y * y);

  // SELF — center + high coherence after arousal
  if (r < 0.14 && coherence > 0.65 && arousal > 0.25) {
    state.tag[i] = 1; state.tagAge[i] = 0; return; // SELF
  }
  // SHADOW — lower left + low coherence + high inhibition
  const sdx = x + 0.42, sdy = y - 0.35;
  if (Math.sqrt(sdx*sdx+sdy*sdy) < 0.22 && coherence < 0.40 && inhibition > 0.45) {
    state.tag[i] = 3; state.tagAge[i] = 0; return; // SHADOW (index 2 in 0-based = tag 3)
  }
  // HERO — upper right + high charge + high valence
  const hdx = x - 0.40, hdy = y + 0.30;
  if (Math.sqrt(hdx*hdx+hdy*hdy) < 0.22 && valence > 0.5 && arousal > 0.55) {
    state.tag[i] = 6; state.tagAge[i] = 0; return; // HERO
  }
  // TRICKSTER — high arousal + low coherence + fast movement
  if (arousal > 0.75 && coherence < 0.30 && Math.random() < 0.003) {
    state.tag[i] = 5; state.tagAge[i] = 0; return; // TRICKSTER
  }
  // DESTROYER — ID core + very high charge + negative valence
  const ddx = x, ddy = y - 0.58;
  if (Math.sqrt(ddx*ddx+ddy*ddy) < 0.18 && state.charge[i] > 0.75 && valence < -0.40) {
    state.tag[i] = 12; state.tagAge[i] = 0; return; // DESTROYER
  }
  // LOVER — collective region + high valence + coherence
  const ldx = x - 0.40, ldy = y - 0.32;
  if (Math.sqrt(ldx*ldx+ldy*ldy) < 0.22 && valence > 0.45 && coherence > 0.55) {
    state.tag[i] = 11; state.tagAge[i] = 0; return; // LOVER
  }
}