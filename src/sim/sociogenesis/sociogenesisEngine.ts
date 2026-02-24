// Sociogenesis Engine
// Runs on cadence (not per frame), applies local multipliers / steering bias
// "Rules, not forces"

import type { MicroState } from '../micro/microState';
import type {
  SociogenesisState,
  Totem,
  Taboo,
  Ritual,
  Tribe,
  SocioCase,
  SocioChronicleEntry,
} from './sociogenesisTypes';
import { genId } from './sociogenesisTypes';
import { narrateEvent } from './sociogenesisNarrator';
import { updateParticleRoles, applyRoleBehaviors } from './sociogenesisRoles';

// Simple deterministic noise generator per totem
const totemOracles = new Map<string, { angle: number; phase: number }>();

function getOracleVector(totemId: string, elapsed: number): { x: number; y: number } {
  if (!totemOracles.has(totemId)) {
    // Initialize with deterministic seed from totem ID
    const seed = totemId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    totemOracles.set(totemId, { angle: (seed % 360) * Math.PI / 180, phase: 0 });
  }
  
  const oracle = totemOracles.get(totemId)!;
  // Low-pass filter: slow rotation
  oracle.phase += 0.03; // ~3 degrees per tick
  oracle.angle += Math.sin(oracle.phase) * 0.1; // wobble
  
  return {
    x: Math.cos(oracle.angle),
    y: Math.sin(oracle.angle),
  };
}

const VIOLATION_THRESHOLD = 0.3;
const CASE_COOLDOWN_SEC = 12; // minimum seconds between cases for same taboo
const MAX_CHRONICLE = 80;
const PENALTY_DURATION = 6; // seconds of velocity damping for PUNISH
const RESTORE_GATHER_DURATION = 3; // seconds for restorative mini-gather

// Velocity bias helpers (amplified for visible emergence)
function applySteeringBias(
  micro: MicroState,
  idx: number,
  bx: number,
  by: number,
  gain: number,
) {
  const clamp = 0.025; // max velocity change per tick (amplified from 0.004)
  micro.vx[idx] += Math.max(-clamp, Math.min(clamp, bx * gain));
  micro.vy[idx] += Math.max(-clamp, Math.min(clamp, by * gain));
}

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/**
 * Main tick - called from the game loop when cadence elapses.
 * Returns new chronicle entries (if any).
 */
export function runSociogenesisTick(
  state: SociogenesisState,
  micro: MicroState,
  elapsedSec: number,
): SocioChronicleEntry[] {
  if (!state.config.enabled) return [];

  const entries: SocioChronicleEntry[] = [];
  const gain = state.config.influenceGain * state.config.simSpeed; // apply sim speed multiplier
  const count = micro.count;

  // Reset affected counts
  state.totems.forEach(t => t.affectedCount = 0);
  state.taboos.forEach(t => t.affectedCount = 0);
  state.rituals.forEach(r => r.affectedCount = 0);

  // ---- 3.0 FOUCAULT ROLES: Assign/update particle roles ----
  if (state.config.enableRoles) {
    updateParticleRoles(state, micro, elapsedSec);
  }

  // ---- 3.1 Totems ----
  for (const totem of state.totems) {
    const r2 = totem.radius * totem.radius;
    const str = totem.strength * gain;

    for (let i = 0; i < count; i++) {
      const px = micro.x[i];
      const py = micro.y[i];
      const d2 = dist2(px, py, totem.pos.x, totem.pos.y);
      if (d2 > r2 || d2 < 1e-8) continue;

      totem.affectedCount!++; // count particles in range

      const d = Math.sqrt(d2);
      const falloff = 1 - d / totem.radius; // 1 at center, 0 at edge

      if (totem.kind === 'BOND') {
        // Attract toward same-type neighbors (cohesion bias)
        // Simple: bias toward totem center
        const dx = (totem.pos.x - px) * falloff * str * 1.2; // amplified 8x (was 0.15)
        const dy = (totem.pos.y - py) * falloff * str * 1.2;
        applySteeringBias(micro, i, dx, dy, 1);
      } else if (totem.kind === 'RIFT') {
        // Repel from totem center (separation bias)
        const dx = (px - totem.pos.x) * falloff * str * 0.9; // amplified 7.5x (was 0.12)
        const dy = (py - totem.pos.y) * falloff * str * 0.9;
        applySteeringBias(micro, i, dx, dy, 1);
      } else if (totem.kind === 'ORACLE') {
        // Deterministic filtered noise (no Math.random)
        const vec = getOracleVector(totem.id, elapsedSec);
        const jx = vec.x * falloff * str * 0.4;
        const jy = vec.y * falloff * str * 0.4;
        applySteeringBias(micro, i, jx, jy, 1);
      }
      // ARCHIVE: no behavior change - passive memory
    }
  }

  // ---- 3.2 Taboos ----
  for (const taboo of state.taboos) {
    const r2 = taboo.radius * taboo.radius;
    let violationStrength = 0;

    for (let i = 0; i < count; i++) {
      const px = micro.x[i];
      const py = micro.y[i];
      const d2 = dist2(px, py, taboo.pos.x, taboo.pos.y);

      if (taboo.kind === 'NO_ENTER') {
        if (d2 < r2) {
          taboo.affectedCount!++; // count violations
          
          // Elastic repulsion outward
          const d = Math.sqrt(d2);
          const overlap = 1 - d / taboo.radius;
          const nx = (px - taboo.pos.x) / (d + 1e-6);
          const ny = (py - taboo.pos.y) / (d + 1e-6);
          const push = overlap * taboo.intensity * gain * 2.0; // amplified 8x (was 0.25)
          applySteeringBias(micro, i, nx * push, ny * push, 1);
          violationStrength += overlap;
        }
      } else if (taboo.kind === 'NO_MIX') {
        if (d2 < r2 && taboo.targetType !== undefined) {
          const pType = micro.type[i];
          if (pType === taboo.targetType) {
            taboo.affectedCount!++; // count affected particles
            
            // Dampen velocity (reduce mixing energy)
            micro.vx[i] *= (1 - taboo.intensity * gain * 0.35); // amplified 4.3x (was 0.08)
            micro.vy[i] *= (1 - taboo.intensity * gain * 0.35);
            violationStrength += 0.3;
          }
        }
      }
    }

    // ---- 3.4 Crime & Castigo ----
    if (violationStrength > VIOLATION_THRESHOLD) {
      // Check cooldown
      const recentCase = state.cases.find(
        (c) => c.tabooId === taboo.id && c.status === 'OPEN',
      );
      const lastResolved = state.cases
        .filter((c) => c.tabooId === taboo.id && c.status === 'RESOLVED')
        .sort((a, b) => (b.resolvedAt || 0) - (a.resolvedAt || 0))[0];

      const canOpen =
        !recentCase &&
        (!lastResolved ||
          elapsedSec - (lastResolved.resolvedAt || 0) > CASE_COOLDOWN_SEC);

      if (canOpen) {
        const newCase: SocioCase = {
          id: genId(state, 'case'),
          tabooId: taboo.id,
          status: 'OPEN',
          resolution: null,
          createdAt: elapsedSec,
        };
        state.cases.push(newCase);

        const entry = narrateEvent('TRANSGRESSION', {
          tabooKind: taboo.kind,
          tabooId: taboo.id,
          violationStrength: violationStrength.toFixed(2),
        }, elapsedSec);
        entries.push(entry);

        // Resolve immediately based on justice mode
        resolveCase(state, newCase, micro, elapsedSec, entries);
      }
    }
  }

  // ---- 3.3 Rituals ----
  for (const ritual of state.rituals) {
    const totem = state.totems.find((t) => t.id === ritual.totemId);
    if (!totem) continue;

    const phase = ((elapsedSec - ritual.bornAt) % ritual.periodSec) / ritual.periodSec;
    const isActive = phase < ritual.dutyCycle;
    if (!isActive) continue;

    const r2 = totem.radius * totem.radius;
    const str = ritual.intensity * gain;

    for (let i = 0; i < micro.count; i++) {
      const px = micro.x[i];
      const py = micro.y[i];
      const d2 = dist2(px, py, totem.pos.x, totem.pos.y);
      if (d2 > r2 * 2.25 || d2 < 1e-8) continue; // 1.5x totem radius

      ritual.affectedCount!++; // count participants

      const d = Math.sqrt(d2);

      if (ritual.kind === 'GATHER') {
        // Radial attraction toward totem
        const nx = (totem.pos.x - px) / d;
        const ny = (totem.pos.y - py) / d;
        const pull = str * 1.5 * Math.min(1, d / totem.radius); // amplified 7.5x (was 0.2)
        applySteeringBias(micro, i, nx * pull, ny * pull, 1);
      } else if (ritual.kind === 'PROCESSION') {
        // Tangential component for orbit
        const nx = (totem.pos.x - px) / d;
        const ny = (totem.pos.y - py) / d;
        // Tangent = perpendicular to radial
        const tx = -ny;
        const ty = nx;
        const orbit = str * 1.2; // amplified 8x (was 0.15)
        // Slight radial pull to keep orbit stable
        const radial = str * 0.4 * (1 - d / (totem.radius * 1.2)); // amplified 8x (was 0.05)
        applySteeringBias(micro, i, tx * orbit + nx * radial, ty * orbit + ny * radial, 1);
      } else if (ritual.kind === 'OFFERING') {
        // Slow down near totem (deposit energy metaphor)
        const falloff = 1 - d / (totem.radius * 1.5);
        if (falloff > 0) {
          micro.vx[i] *= 1 - falloff * str * 0.45; // amplified 4.5x (was 0.1)
          micro.vy[i] *= 1 - falloff * str * 0.45;
        }
      }
    }
  }

  // ---- 3.5 FOUCAULT ROLES: Apply role-based behaviors ----
  if (state.config.enableRoles) {
    applyRoleBehaviors(state, micro, gain);
  }

  // Trim chronicle
  while (state.chronicle.length > MAX_CHRONICLE) {
    state.chronicle.pop();
  }

  // Trim old resolved cases (keep last 20)
  const resolved = state.cases.filter((c) => c.status === 'RESOLVED');
  if (resolved.length > 20) {
    const toRemove = resolved.slice(0, resolved.length - 20);
    state.cases = state.cases.filter((c) => !toRemove.includes(c));
  }

  return entries;
}

function resolveCase(
  state: SociogenesisState,
  caseObj: SocioCase,
  micro: MicroState,
  elapsedSec: number,
  entries: SocioChronicleEntry[],
) {
  const taboo = state.taboos.find((t) => t.id === caseObj.tabooId);
  if (!taboo) return;

  let mode = state.config.justiceMode;

  if (mode === 'AUTO') {
    // Heuristic: check local tension vs cohesion
    // Simple: count particles in taboo zone
    let insideCount = 0;
    const r2 = taboo.radius * taboo.radius;
    for (let i = 0; i < micro.count; i++) {
      if (dist2(micro.x[i], micro.y[i], taboo.pos.x, taboo.pos.y) < r2) {
        insideCount++;
      }
    }
    // High density -> retributive (punish to disperse)
    // Low density -> restorative (heal the community)
    mode = insideCount > 15 ? 'RETRIBUTIVE' : 'RESTORATIVE';
  }

  if (mode === 'RETRIBUTIVE') {
    caseObj.resolution = 'PUNISH';
    // Apply velocity damping to particles inside taboo zone
    const r2 = taboo.radius * taboo.radius;
    for (let i = 0; i < micro.count; i++) {
      if (dist2(micro.x[i], micro.y[i], taboo.pos.x, taboo.pos.y) < r2) {
        // Banish: push outward strongly
        const d = Math.sqrt(dist2(micro.x[i], micro.y[i], taboo.pos.x, taboo.pos.y));
        if (d > 1e-6) {
          const nx = (micro.x[i] - taboo.pos.x) / d;
          const ny = (micro.y[i] - taboo.pos.y) / d;
          micro.vx[i] += nx * 0.08; // amplified 5.3x (was 0.015)
          micro.vy[i] += ny * 0.08;
        }
        // Dampen
        micro.vx[i] *= 0.5; // stronger damping (was 0.7)
        micro.vy[i] *= 0.5;
      }
    }
  } else {
    caseObj.resolution = 'RESTORE';
    // Mini-gather around nearest totem
    const nearestTotem = state.totems.reduce<Totem | null>((best, t) => {
      if (!best) return t;
      const d1 = dist2(t.pos.x, t.pos.y, taboo.pos.x, taboo.pos.y);
      const d2b = dist2(best.pos.x, best.pos.y, taboo.pos.x, taboo.pos.y);
      return d1 < d2b ? t : best;
    }, null);

    if (nearestTotem) {
      // Pull particles gently toward nearest totem
      const r2 = taboo.radius * taboo.radius * 2; // wider range
      for (let i = 0; i < micro.count; i++) {
        if (dist2(micro.x[i], micro.y[i], taboo.pos.x, taboo.pos.y) < r2) {
          const dx = nearestTotem.pos.x - micro.x[i];
          const dy = nearestTotem.pos.y - micro.y[i];
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > 1e-6) {
            micro.vx[i] += (dx / d) * 0.025; // amplified 5x (was 0.005)
            micro.vy[i] += (dy / d) * 0.025;
          }
        }
      }
    }
  }

  caseObj.status = 'RESOLVED';
  caseObj.resolvedAt = elapsedSec;

  const entry = narrateEvent('JUDGMENT', {
    resolution: caseObj.resolution,
    tabooId: caseObj.tabooId,
    caseId: caseObj.id,
  }, elapsedSec);
  entries.push(entry);
}

/**
 * Check if it's time for a sociogenesis tick.
 */
export function shouldTickSociogenesis(
  state: SociogenesisState,
  elapsedSec: number,
): boolean {
  // Apply simSpeed multiplier to cadence
  const adjustedCadence = state.config.cadenceSec / state.config.simSpeed;
  return (
    state.config.enabled &&
    elapsedSec - state.lastTickTime >= adjustedCadence
  );
}