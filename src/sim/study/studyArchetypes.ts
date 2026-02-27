import type { StudyAgent } from './studyTypes';

export type ArchetypeTier = 0 | 1 | 2;
export type ArchetypeAxis = 0 | 1 | 2 | 3; // 0=B,1=F,2=D,3=R
export type IdeologyBucket = 0 | 1 | 2; // 0=Order,1=Mixed,2=Liberty

export function tier2(v: number): ArchetypeTier {
  if (v >= 0.72) return 2;
  if (v >= 0.42) return 1;
  return 0;
}

export function dominantAxis(a: Pick<StudyAgent, 'belief' | 'fear' | 'desire' | 'resistance'>): ArchetypeAxis {
  const b = a.belief, f = a.fear, d = a.desire, r = a.resistance;
  if (r >= b && r >= f && r >= d) return 3;
  if (b >= f && b >= d) return 0;
  if (f >= d) return 1;
  return 2;
}

export function ideologyBucket(ideology: number): IdeologyBucket {
  if (ideology < -0.25) return 0;
  if (ideology > 0.25) return 2;
  return 1;
}

/**
 * Packed 16-bit-ish key for archetype combination (role excluded by design):
 * - axis (2b), axisTier (2b), powerTier (2b), agTier (2b), ideBucket (2b), meme (4b)
 */
export function computeArchetypeKey(a: StudyAgent): number {
  const axis = dominantAxis(a);
  const axisV =
    axis === 0 ? a.belief :
    axis === 1 ? a.fear :
    axis === 2 ? a.desire : a.resistance;
  const axisT = tier2(axisV);
  const powerT = tier2(Math.max(a.status * 0.92 + a.centrality * 0.55, a.status));
  const agT = tier2(a.aggression);
  const ideB = ideologyBucket(a.ideology);
  const meme = (a.memeId | 0) & 0x0f;
  return (
    (axis & 0x03) |
    ((axisT & 0x03) << 2) |
    ((powerT & 0x03) << 4) |
    ((agT & 0x03) << 6) |
    ((ideB & 0x03) << 8) |
    ((meme & 0x0f) << 10)
  ) >>> 0;
}

function scramble32(x: number): number {
  // Knuth multiplicative + xor-shift: cheap and stable
  let v = (x ^ 0x9e3779b9) >>> 0;
  v = Math.imul(v, 2654435761) >>> 0;
  v ^= v >>> 16;
  v = Math.imul(v, 2246822507) >>> 0;
  v ^= v >>> 13;
  return v >>> 0;
}

export function archetypeKeyToColor(key: number): string {
  const h = scramble32(key);
  const hue = h % 360;
  const sat = (72 + ((h >>> 9) % 10)) / 100;
  const lit = (52 + ((h >>> 17) % 10)) / 100;
  // Convert HSL → hex so downstream _hexToRgb / gradient code works
  const a2 = sat * Math.min(lit, 1 - lit);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const c = lit - a2 * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function archetypeKeyToLabel(key: number): string {
  const axis = (key & 0x03) as ArchetypeAxis;
  const axisT = ((key >>> 2) & 0x03) as ArchetypeTier;
  const pT = ((key >>> 4) & 0x03) as ArchetypeTier;
  const aT = ((key >>> 6) & 0x03) as ArchetypeTier;
  const ideB = ((key >>> 8) & 0x03) as IdeologyBucket;
  const meme = (key >>> 10) & 0x0f;

  const axisCh = axis === 0 ? 'B' : axis === 1 ? 'F' : axis === 2 ? 'D' : 'R';
  const ideCh = ideB === 0 ? 'O' : ideB === 2 ? 'L' : 'M';
  return `${axisCh}${axisT} · P${pT} · ${ideCh} · A${aT} · m${meme}`;
}

