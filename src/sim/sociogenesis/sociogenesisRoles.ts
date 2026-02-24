// Sociogenesis Roles - Foucault-inspired agent behaviors
// Enforcers, Vigilantes, and Resisters emerge from the population

import type { MicroState } from '../micro/microState';
import type { SociogenesisState, ParticleRole } from './sociogenesisTypes';

const ROLE_ASSIGNMENT_CHANCE = 0.003; // 0.3% per tick per particle
const ROLE_DURATION_SEC = 30; // roles last 30 seconds
const ENFORCER_SPEED_BOOST = 1.3; // enforcers move faster when chasing
const RESISTER_SPEED_BOOST = 1.2; // resisters move faster when challenging
const VIGILANTE_PATROL_RADIUS = 0.15; // vigilantes patrol around taboos

interface RoleTimer {
  particleId: number;
  role: ParticleRole;
  expiresAt: number;
}

const roleTimers: RoleTimer[] = [];

/**
 * Update particle roles based on behavior and context
 */
export function updateParticleRoles(
  state: SociogenesisState,
  micro: MicroState,
  elapsedSec: number,
): void {
  // Ensure role arrays match particle count
  while (state.roleState.roles.length < micro.count) {
    state.roleState.roles.push('NEUTRAL');
    state.roleState.enforcerTargets.push(-1);
  }

  // Expire old roles
  for (let i = roleTimers.length - 1; i >= 0; i--) {
    const timer = roleTimers[i];
    if (elapsedSec >= timer.expiresAt) {
      if (timer.particleId < micro.count) {
        state.roleState.roles[timer.particleId] = 'NEUTRAL';
        state.roleState.enforcerTargets[timer.particleId] = -1;
      }
      roleTimers.splice(i, 1);
    }
  }

  // Assign new roles probabilistically
  for (let i = 0; i < micro.count; i++) {
    if (state.roleState.roles[i] !== 'NEUTRAL') continue; // already has a role
    if (Math.random() > ROLE_ASSIGNMENT_CHANCE) continue;

    // Determine role based on local context
    const px = micro.x[i];
    const py = micro.y[i];
    const vx = micro.vx[i];
    const vy = micro.vy[i];
    const speed = Math.sqrt(vx * vx + vy * vy);

    // Check proximity to taboos (justice zones)
    let nearTaboo = false;
    let nearTabooId = '';
    for (const taboo of state.taboos) {
      const d2 = (px - taboo.pos.x) ** 2 + (py - taboo.pos.y) ** 2;
      const r2 = (taboo.radius * 2) ** 2;
      if (d2 < r2) {
        nearTaboo = true;
        nearTabooId = taboo.id;
        break;
      }
    }

    let newRole: ParticleRole = 'NEUTRAL';

    if (nearTaboo && state.cases.length > 0) {
      // Near justice zones - become enforcer or vigilante
      if (speed < 0.03) {
        // Slow particles become vigilantes (watchers)
        newRole = 'VIGILANTE';
      } else if (speed > 0.06) {
        // Fast particles become enforcers (pursuers)
        newRole = 'ENFORCER';
        // Find a violator to chase
        const openCase = state.cases.find(c => c.status === 'OPEN' && c.tabooId === nearTabooId);
        if (openCase && openCase.offenderParticleId !== undefined) {
          state.roleState.enforcerTargets[i] = openCase.offenderParticleId;
        }
      }
    } else if (speed > 0.08) {
      // Fast particles far from taboos become resisters (challengers)
      newRole = 'RESISTER';
    }

    if (newRole !== 'NEUTRAL') {
      state.roleState.roles[i] = newRole;
      roleTimers.push({
        particleId: i,
        role: newRole,
        expiresAt: elapsedSec + ROLE_DURATION_SEC,
      });
    }
  }
}

/**
 * Apply role-based behaviors
 */
export function applyRoleBehaviors(
  state: SociogenesisState,
  micro: MicroState,
  gain: number,
): void {
  if (!state.config.enableRoles) return;

  for (let i = 0; i < micro.count; i++) {
    const role = state.roleState.roles[i];
    if (!role || role === 'NEUTRAL') continue;

    const px = micro.x[i];
    const py = micro.y[i];

    if (role === 'ENFORCER') {
      // Chase assigned target
      const targetId = state.roleState.enforcerTargets[i];
      if (targetId >= 0 && targetId < micro.count) {
        const tx = micro.x[targetId];
        const ty = micro.y[targetId];
        const dx = tx - px;
        const dy = ty - py;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0.01) {
          const force = 0.03 * gain * ENFORCER_SPEED_BOOST;
          micro.vx[i] += (dx / d) * force;
          micro.vy[i] += (dy / d) * force;
        }
      }
    } else if (role === 'VIGILANTE') {
      // Patrol around nearest taboo
      let nearestTaboo = null;
      let minDist2 = Infinity;
      for (const taboo of state.taboos) {
        const d2 = (px - taboo.pos.x) ** 2 + (py - taboo.pos.y) ** 2;
        if (d2 < minDist2) {
          minDist2 = d2;
          nearestTaboo = taboo;
        }
      }
      if (nearestTaboo) {
        // Orbit around taboo
        const dx = px - nearestTaboo.pos.x;
        const dy = py - nearestTaboo.pos.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0.01) {
          // Tangential force for orbit
          const tx = -dy / d;
          const ty = dx / d;
          const orbit = 0.015 * gain;
          micro.vx[i] += tx * orbit;
          micro.vy[i] += ty * orbit;
          // Radial force to maintain distance
          const targetDist = nearestTaboo.radius * 1.5;
          const radial = (d - targetDist) * 0.02 * gain;
          micro.vx[i] -= (dx / d) * radial;
          micro.vy[i] -= (dy / d) * radial;
        }
      }
    } else if (role === 'RESISTER') {
      // Challenge taboos - move toward them defiantly
      let nearestTaboo = null;
      let minDist2 = Infinity;
      for (const taboo of state.taboos) {
        const d2 = (px - taboo.pos.x) ** 2 + (py - taboo.pos.y) ** 2;
        if (d2 < minDist2 && d2 > (taboo.radius * 0.5) ** 2) { // not already inside
          minDist2 = d2;
          nearestTaboo = taboo;
        }
      }
      if (nearestTaboo) {
        const dx = nearestTaboo.pos.x - px;
        const dy = nearestTaboo.pos.y - py;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0.01) {
          const force = 0.02 * gain * RESISTER_SPEED_BOOST;
          micro.vx[i] += (dx / d) * force;
          micro.vy[i] += (dy / d) * force;
        }
      }
    }
  }
}
