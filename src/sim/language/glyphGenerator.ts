// ─────────────────────────────────────────────────────────────────────────────
// Language Lab – Glyph Generator
// Observables → GlyphSpec  (the semantic heart)
// Three modes: linear, heptapod, experimental
// ─────────────────────────────────────────────────────────────────────────────
import type {
  Observables, GlyphSpec, OuterRing, InnerRing, Notch, GlyphArc, Blot, GlyphAxis,
  DictionaryMode,
} from './types';

const TWO_PI = Math.PI * 2;

// ── Deterministic hash from number vector ─────────────────────────────────────
function hashVec(nums: number[]): string {
  let h = 0x811c9dc5;
  for (const n of nums) {
    const q = Math.round(n * 100);
    h ^= q;
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// ── Simple seeded noise (deterministic jitter) ────────────────────────────────
function pseudoRandom(seed: number): number {
  seed = seed ^ (seed << 13); seed = seed ^ (seed >> 7); seed = seed ^ (seed << 17);
  return ((seed >>> 0) / 4294967296);
}

// ── Quantize an observable to discrete steps ─────────────────────────────────
function discretize(v: number, steps: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * steps) / steps;
}

// ── Core generator ────────────────────────────────────────────────────────────
export function generateGlyph(
  obs: Observables,
  mode: DictionaryMode,
  timestamp: number,
  idSuffix = '',
): GlyphSpec {
  // Quantise key observables to create stable signatures
  const qSync    = discretize(obs.syncIndex,     10);
  const qCoh     = discretize(obs.coherenceMean, 8);
  const qLoop    = discretize(obs.loopCount,     8);
  const qSym     = discretize(obs.symmetryIndex, 6);
  const qTension = discretize(obs.tensionIndex,  6);
  const qNovelty = discretize(obs.noveltyIndex,  6);
  const qDensity = discretize(obs.densityMean,   8);
  const qAxis    = Math.round(obs.polarityAxis / TWO_PI * 8) / 8;

  const sigKey = [qSync, qCoh, qLoop, qSym, qTension, qNovelty, qDensity, qAxis];
  const signatureHash = hashVec(sigKey);
  const id = `glyph_${signatureHash}_${idSuffix || Date.now()}`;

  // ── Outer ring: driven by sync + density ──────────────────────────────────
  const outerRadius = 0.70 + qSync * 0.20;   // 0.70..0.90
  const outerThick  = (mode === 'heptapod' || mode === 'recursive')
    ? 0.07 + qCoh * 0.09
    : 0.05 + qDensity * 0.07;
  const roughness   = Math.max(0, obs.tensionIndex * 0.4 + obs.noveltyIndex * 0.2);

  const outerRing: OuterRing = {
    radius: outerRadius,
    thickness: outerThick,
    roughness,
  };

  // ── Inner rings ──────────────────────────────────────────────────────────
  let ringCount: number;
  if (mode === 'recursive') {
    // Recursive: many nested rings (Fibonacci-like)
    ringCount = 2 + Math.round(qLoop * 3 + qSym * 2);  // 2..7 rings
  } else {
    ringCount = 1 + Math.round(qLoop * 2);  // 1..3
  }
  const innerRings: InnerRing[] = [];
  for (let i = 0; i < ringCount; i++) {
    let fraction: number;
    if (mode === 'recursive') {
      // Golden ratio spacing creates nested self-similar structure
      const phi = 0.618033988749895;
      fraction = Math.pow(phi, i + 1);
    } else {
      fraction = (i + 1) / (ringCount + 1);
    }
    innerRings.push({
      radius: outerRadius * (0.15 + fraction * 0.55),
      thickness: outerThick * (0.5 + i * 0.1),
      phaseOffset: mode === 'recursive'
        ? (pseudoRandom(sigKey[i % sigKey.length] * 1000 + i) * TWO_PI + i * Math.PI * 0.382)
        : pseudoRandom(sigKey[i % sigKey.length] * 1000 + i) * TWO_PI,
    });
  }

  // ── Notches: driven by tension + novelty ──────────────────────────────────
  let notchCount: number;
  if (mode === 'heptapod' || mode === 'recursive') {
    notchCount = 1 + Math.round(qTension * 1.0);
  } else {
    notchCount = Math.round((qTension + qNovelty) * 0.5 * 3);
  }
  const notches: Notch[] = [];
  for (let i = 0; i < Math.min(3, notchCount); i++) {
    const angleBase = (i / Math.max(1, notchCount)) * TWO_PI;
    const jitter = (pseudoRandom(sigKey[5] * 1000 + i * 77) - 0.5) * 0.5;
    notches.push({
      angle: angleBase + jitter,
      depth: 0.4 + qTension * 0.5,
      width: 0.18 + pseudoRandom(i * 113) * 0.14,
    });
  }

  // ── Arcs: driven by symmetry + mode ──────────────────────────────────────
  let arcCount: number;
  if (mode === 'linear')       arcCount = 0;
  else if (mode === 'recursive') arcCount = Math.round(qSym * 5 + 2); // more arcs for recursion
  else if (mode === 'heptapod') arcCount = Math.round(qSym * 3 + 1);
  else                           arcCount = Math.round(obs.eventRate * 4);
  const arcs: GlyphArc[] = [];
  for (let i = 0; i < arcCount; i++) {
    const startAngle = (i / arcCount) * TWO_PI + pseudoRandom(i * 200) * 0.5;
    const sweep = mode === 'recursive'
      ? 0.15 + pseudoRandom(i * 300 + 1) * 1.2  // wider sweeps for recursive
      : 0.3  + pseudoRandom(i * 300 + 1) * 0.8;
    arcs.push({
      startAngle,
      endAngle: startAngle + sweep,
      radius: outerRadius * (mode === 'recursive'
        ? 0.20 + pseudoRandom(i * 400) * 0.65  // can go deep inside for nesting
        : 0.50 + pseudoRandom(i * 400) * 0.35),
      thickness: outerThick * 0.6,
    });
  }

  // ── Blots: driven by silence + density ────────────────────────────────────
  const blotCount = (mode === 'heptapod' || mode === 'recursive')
    ? Math.round((1 - obs.silenceIndex) * obs.densityMean * 6)
    : Math.round(obs.densityMean * 3);
  const blots: Blot[] = [];
  for (let i = 0; i < Math.min(6, blotCount); i++) {
    blots.push({
      angle: (i / Math.max(1, blotCount)) * TWO_PI + pseudoRandom(i * 500) * TWO_PI * 0.3,
      radius: 0.3 + pseudoRandom(i * 600) * 0.55,
      size: 0.4 + obs.densityMean * 0.6,
      alpha: 0.4 + obs.coherenceMean * 0.5,
    });
  }

  // ── Axis: polarity ────────────────────────────────────────────────────────
  const axis: GlyphAxis = {
    angle: obs.polarityAxis,
    strength: Math.min(1, obs.syncIndex * 1.5),
  };

  return {
    outerRing,
    innerRings,
    notches,
    arcs,
    blots,
    axis,
    signatureHash,
    observables: obs,
    timestamp,
    id,
  };
}