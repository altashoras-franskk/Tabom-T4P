// Prestige Engine — Reputation, social hierarchy
// "Influence compounds: respected agents spread their memes faster"
// macroTick: decay + ritual bonus + taboo penalty

import type { MicroState } from '../micro/microState';
import type { CultureState, SociogenesisState } from './sociogenesisTypes';

export interface PrestigeEvent {
  type: 'LEADER_EMERGES';
  particleIdx: number;
  prestige: number;
  memeId: number;
  wx: number;
  wy: number;
  evidence: string;
}

const PRESTIGE_DECAY_RATE = 0.06;   // per second
const RITUAL_BONUS = 0.025;         // per second while in ritual
const TABOO_PENALTY = 0.04;         // per second while in taboo
const LEADER_THRESHOLD = 0.65;

export function stepPrestige(
  dtMacroSec: number,
  micro: MicroState,
  culture: CultureState,
  socioState: SociogenesisState,
  nowSec: number,
): PrestigeEvent[] {
  const count = micro.count;
  const events: PrestigeEvent[] = [];

  // 1. Natural decay
  const decayFactor = Math.exp(-PRESTIGE_DECAY_RATE * dtMacroSec);
  for (let i = 0; i < count; i++) {
    culture.prestige[i] = Math.max(0, culture.prestige[i] * decayFactor);
  }

  // 2. Ritual participation bonus
  for (const ritual of socioState.rituals) {
    const totem = socioState.totems.find(t => t.id === ritual.totemId);
    if (!totem) continue;
    const phase = ((nowSec - ritual.bornAt) % ritual.periodSec) / ritual.periodSec;
    if (phase >= ritual.dutyCycle) continue; // not active

    const r2 = (totem.radius * 1.3) ** 2;
    for (let i = 0; i < count; i++) {
      const dx = micro.x[i] - totem.pos.x;
      const dy = micro.y[i] - totem.pos.y;
      if (dx * dx + dy * dy < r2) {
        culture.prestige[i] = Math.min(1, culture.prestige[i] + RITUAL_BONUS * dtMacroSec);
      }
    }
  }

  // 3. Taboo violation penalty
  for (const taboo of socioState.taboos) {
    if (taboo.kind !== 'NO_ENTER') continue;
    const r2 = taboo.radius * taboo.radius;
    for (let i = 0; i < count; i++) {
      const dx = micro.x[i] - taboo.pos.x;
      const dy = micro.y[i] - taboo.pos.y;
      if (dx * dx + dy * dy < r2) {
        culture.prestige[i] = Math.max(0, culture.prestige[i] - TABOO_PENALTY * dtMacroSec);
      }
    }
  }

  // 4. Detect newly emerged leaders (top by prestige ≥ threshold)
  // Return at most 1 event per tick to avoid chronicle spam
  let topIdx = -1;
  let topPrestige = LEADER_THRESHOLD - 0.01;
  for (let i = 0; i < count; i++) {
    if (culture.prestige[i] > topPrestige) {
      topPrestige = culture.prestige[i];
      topIdx = i;
    }
  }

  if (topIdx >= 0) {
    events.push({
      type: 'LEADER_EMERGES',
      particleIdx: topIdx,
      prestige: topPrestige,
      memeId: culture.memeId[topIdx],
      wx: micro.x[topIdx],
      wy: micro.y[topIdx],
      evidence: `#${topIdx} prestige ${topPrestige.toFixed(2)}, meme #${culture.memeId[topIdx]}`,
    });
  }

  return events;
}

/**
 * Get top-N leaders by prestige for UI display.
 */
export function getTopLeaders(
  micro: MicroState,
  culture: CultureState,
  topN: number = 5,
): Array<{ idx: number; prestige: number; memeId: number; wx: number; wy: number }> {
  const leaders: Array<{ idx: number; prestige: number; memeId: number; wx: number; wy: number }> = [];

  for (let i = 0; i < micro.count; i++) {
    if (culture.prestige[i] > 0.2) {
      leaders.push({
        idx: i,
        prestige: culture.prestige[i],
        memeId: culture.memeId[i],
        wx: micro.x[i],
        wy: micro.y[i],
      });
    }
  }

  leaders.sort((a, b) => b.prestige - a.prestige);
  return leaders.slice(0, topN);
}
