// ── Asimov Theater — Intervention Cards (Historical Acts) ────────────────────
import { WorldState, InterventionCardDef, GRID_SIZE, makeRNG } from './asimovTypes';
import { wrapDelta } from './asimovWorld';

// ── Apply helpers ──────────────────────────────────────────────────────────
function boostField(arr: Float32Array, amount: number) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.max(0, Math.min(1, arr[i] + amount));
  }
}

function scaleField(arr: Float32Array, factor: number) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.max(0, Math.min(1, arr[i] * factor));
  }
}

function boostFieldInRadius(
  arr: Float32Array,
  cx: number, cy: number, radius: number,
  amount: number,
) {
  for (let iy = 0; iy < GRID_SIZE; iy++) {
    for (let ix = 0; ix < GRID_SIZE; ix++) {
      const wx = (ix + 0.5) / GRID_SIZE;
      const wy = (iy + 0.5) / GRID_SIZE;
      const dx = wrapDelta(wx - cx);
      const dy = wrapDelta(wy - cy);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < radius) {
        const str = 1 - d / radius;
        const i = ix + iy * GRID_SIZE;
        arr[i] = Math.max(0, Math.min(1, arr[i] + amount * str));
      }
    }
  }
}

// ── 8 Mandatory Cards ─────────────────────────────────────────────────────
export const INTERVENTION_CARDS: InterventionCardDef[] = [
  {
    id: 'redistribute',
    name: 'Redistribute',
    description: 'Transferência de riqueza: reduz desigualdade, drena R temporariamente.',
    cost: 0.15,
    cooldownSeconds: 45,
    durationSeconds: 30,
    color: '#5aff8a',
  },
  {
    id: 'austerity',
    name: 'Austerity',
    description: 'Contração fiscal: R aumenta curto prazo, desigualdade sobe.',
    cost: 0.05,
    cooldownSeconds: 40,
    durationSeconds: 25,
    color: '#ffce5a',
  },
  {
    id: 'propaganda',
    name: 'Propaganda Broadcast',
    description: 'Boost de L para facção 0; polarização cresce no longo prazo.',
    cost: 0.1,
    cooldownSeconds: 35,
    durationSeconds: 20,
    color: '#ff9a3c',
  },
  {
    id: 'emergency_decree',
    name: 'Emergency Decree',
    description: 'N sobe fortemente; conflito cai curto prazo, risco EXCEPTION.',
    cost: 0.08,
    cooldownSeconds: 60,
    durationSeconds: 35,
    color: '#c05aff',
  },
  {
    id: 'open_commons',
    name: 'Open Commons',
    description: 'R acessível a todos; cooperação sobe, status de elites cai.',
    cost: 0.12,
    cooldownSeconds: 38,
    durationSeconds: 28,
    color: '#4a9eff',
  },
  {
    id: 'taboo_wall',
    name: 'Taboo Wall',
    description: 'Fronteira simbólica: coesão interna ↑, conflito interfaccional ↑.',
    cost: 0.06,
    cooldownSeconds: 42,
    durationSeconds: 40,
    color: '#ff5a5a',
  },
  {
    id: 'ritual_unity',
    name: 'Ritual of Unity',
    description: 'Polarização cai; custa wealth coletivo e fadiga.',
    cost: 0.18,
    cooldownSeconds: 50,
    durationSeconds: 25,
    color: '#ffd4f0',
  },
  {
    id: 'amnesty',
    name: 'Amnesty',
    description: 'Medo cai, L sobe; transgressão curto prazo pode subir.',
    cost: 0.07,
    cooldownSeconds: 35,
    durationSeconds: 22,
    color: '#a0ffee',
  },
];

// ── Apply intervention effect to world ───────────────────────────────────
export function applyIntervention(
  world: WorldState,
  cardId: string,
  strength: number,  // 0..1 progress within duration (eased)
): void {
  const { agents, field } = world;
  const dtEffect = strength * 0.016; // per-frame delta

  switch (cardId) {

    case 'redistribute': {
      // Transfer wealth from top 25% to bottom 25%
      const wArr = agents.map(a => a.wealth).sort((a, b) => a - b);
      const lo = wArr[Math.floor(wArr.length * 0.25)];
      const hi = wArr[Math.floor(wArr.length * 0.75)];
      for (const a of agents) {
        if (a.wealth > hi) a.wealth = Math.max(lo, a.wealth - 0.002 * strength);
        if (a.wealth < lo) a.wealth = Math.min(hi, a.wealth + 0.002 * strength);
      }
      // Drain R slightly (policy cost)
      boostField(field.R, -0.003 * dtEffect);
      break;
    }

    case 'austerity': {
      // Boost R, but widen wealth gap (high-status agents benefit more)
      boostField(field.R, 0.006 * dtEffect);
      for (const a of agents) {
        const gain = a.status * 0.004 * dtEffect;
        a.wealth = Math.min(1, a.wealth + gain);
      }
      break;
    }

    case 'propaganda': {
      // Boost L in faction 0 territory, slight N boost globally
      const factionCx = world.centroids[0].x;
      const factionCy = world.centroids[0].y;
      boostFieldInRadius(field.L, factionCx, factionCy, 0.35, 0.008 * dtEffect);
      // Increase belief of faction 0 agents
      for (const a of agents) {
        if (a.factionId === 0) a.belief = Math.min(1, a.belief + 0.003 * dtEffect);
        else a.fear = Math.min(1, a.fear + 0.001 * dtEffect); // slight fear in others
      }
      break;
    }

    case 'emergency_decree': {
      // Strong N boost
      boostField(field.N, 0.015 * dtEffect);
      // Temporarily slow all agents (curfew effect)
      for (const a of agents) {
        a.vx *= 0.97;
        a.vy *= 0.97;
        a.fear = Math.min(1, a.fear + 0.005 * dtEffect);
      }
      break;
    }

    case 'open_commons': {
      // Uniform R boost
      boostField(field.R, 0.010 * dtEffect);
      // Reduce status inequality
      for (const a of agents) {
        a.status = a.status * (1 - 0.005 * dtEffect) + 0.5 * 0.005 * dtEffect;
      }
      // Boost L slightly
      boostField(field.L, 0.005 * dtEffect);
      break;
    }

    case 'taboo_wall': {
      // Boost N in border regions (boundary of agent clusters)
      // Approximate: raise N uniformly a bit, then boost cohesion via belief
      boostField(field.N, 0.006 * dtEffect);
      for (const a of agents) {
        a.belief = Math.min(1, a.belief + 0.003 * dtEffect * (a.factionId === 0 ? 1 : -0.5));
      }
      break;
    }

    case 'ritual_unity': {
      // Reduce inter-faction velocity (pull centroids together)
      for (const a of agents) {
        // Slight pull toward world center
        a.vx += (0.5 - a.x) * 0.001 * dtEffect;
        a.vy += (0.5 - a.y) * 0.001 * dtEffect;
        // Cost in wealth
        a.wealth = Math.max(0, a.wealth - 0.001 * dtEffect);
        a.fear = Math.max(0, a.fear - 0.005 * dtEffect);
      }
      // Boost L globally
      boostField(field.L, 0.008 * dtEffect);
      break;
    }

    case 'amnesty': {
      // Fear reduction for all
      for (const a of agents) {
        a.fear = Math.max(0, a.fear - 0.010 * dtEffect);
        a.belief = Math.min(1, a.belief + 0.002 * dtEffect);
      }
      // L boost
      boostField(field.L, 0.010 * dtEffect);
      // N slight decrease (normative relaxation)
      boostField(field.N, -0.004 * dtEffect);
      break;
    }
  }
}

// ── Invert effect (for counterfactual A/C scenarios) ─────────────────────
export function applyInvertedIntervention(
  world: WorldState,
  cardId: string,
  strength: number,
): void {
  // Map original card to its "opposite"
  const invertMap: Record<string, string> = {
    redistribute:     'austerity',
    austerity:        'redistribute',
    propaganda:       'amnesty',
    emergency_decree: 'amnesty',
    open_commons:     'austerity',
    taboo_wall:       'ritual_unity',
    ritual_unity:     'taboo_wall',
    amnesty:          'emergency_decree',
  };
  const invertedId = invertMap[cardId] ?? cardId;
  applyIntervention(world, invertedId, strength);
}
