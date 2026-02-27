// ── Meta-Art Complexity (Morin) ───────────────────────────────────────────────
// Derives MorinIndices from particle state + DNA, using the same theoretical
// framework applied in Sociogenesis and the Complexity Lab.

import type { MorinIndices } from '../complexity/complexityLens';
import type { Quantum, DNA } from './metaArtTypes';

const EMPTY: MorinIndices = { dialogica: 0, recursivo: 0, hologramatico: 0, sapiensDemens: 0.5, tetralogia: 0 };

export function computeMetaArtMorin(quanta: Quantum[], dna: DNA): MorinIndices {
  const n = quanta.length;
  if (n < 3) return EMPTY;

  let sumVx = 0, sumVy = 0, sumS = 0, sumS2 = 0;
  let sumX = 0, sumY = 0;
  for (let i = 0; i < n; i++) {
    const q = quanta[i];
    sumVx += q.vx; sumVy += q.vy;
    const s = Math.sqrt(q.vx * q.vx + q.vy * q.vy);
    sumS += s; sumS2 += s * s;
    sumX += q.x; sumY += q.y;
  }
  const meanSpeed = sumS / n;
  const speedVar = Math.sqrt(Math.max(0, sumS2 / n - meanSpeed * meanSpeed));
  const meanX = sumX / n, meanY = sumY / n;

  // Alignment: how much particles move in the same direction
  const meanDirMag = Math.sqrt((sumVx / n) ** 2 + (sumVy / n) ** 2);
  const alignment = meanSpeed > 0.001 ? Math.min(1, meanDirMag / meanSpeed) : 0;

  // Spatial spread (position std-dev, normalized to ~0..1 assuming 0..1 canvas)
  let varP = 0;
  for (let i = 0; i < n; i++) {
    const q = quanta[i];
    varP += (q.x - meanX) ** 2 + (q.y - meanY) ** 2;
  }
  const spread = Math.min(1, Math.sqrt(varP / n) * 3);

  // Hue diversity (quantized into 12 bins)
  const hueBins = new Set<number>();
  for (let i = 0; i < n; i++) hueBins.add(Math.floor(quanta[i].hue / 30));
  const colorDiversity = Math.min(1, hueBins.size / 8);

  const g = dna.genes;

  // ── Dialogica ─────────────────────────────────────────────────────────────
  // Co-presence of order (structure, alignment) and disorder (entropy, speed variance)
  const orderPole = alignment * 0.4 + g.structure * 0.3 + g.coherence * 0.3;
  const disorderPole = Math.min(1, speedVar * 8) * 0.4 + g.entropy * 0.3 + g.fragmentation * 0.3;
  const dialogica = Math.min(1, Math.min(orderPole, disorderPole) * 2.5);

  // ── Recursivo ─────────────────────────────────────────────────────────────
  // Product-is-producer: particles create trails that influence flow that moves particles.
  // Proxy: high flow + high memory + particles actually moving → active feedback loop.
  const feedbackStrength = g.flow * 0.35 + g.memory * 0.35 + Math.min(1, meanSpeed * 4) * 0.30;
  const changeRate = Math.min(1, speedVar * 6 + g.entropy * 0.3);
  const recursivo = Math.min(1, feedbackStrength * changeRate * 3);

  // ── Hologramático ─────────────────────────────────────────────────────────
  // Local clusters mirror global pattern. Proxy: moderate spread + color diversity +
  // some coherence means each locality carries the whole's signature.
  const spreadFit = 1 - Math.abs(spread - 0.45) * 2; // peaks when spread ≈ 0.45
  const hologramatico = Math.min(1, spreadFit * 0.35 + colorDiversity * 0.35 + g.coherence * 0.30);

  // ── Sapiens-Demens ────────────────────────────────────────────────────────
  // Constructive (organized beauty) vs destructive (chaotic dissolution)
  const constructive = g.structure * 0.25 + g.coherence * 0.25 + alignment * 0.25 + g.memory * 0.25;
  const destructive = g.entropy * 0.25 + g.erosion * 0.25 + g.fragmentation * 0.25 + Math.min(1, speedVar * 6) * 0.25;
  const total = constructive + destructive || 1;
  const sapiensDemens = constructive / total;

  // ── Tetralogia ────────────────────────────────────────────────────────────
  // Four poles: order, disorder, interactions, organization — all must be active.
  const t_order        = g.structure * 0.5 + alignment * 0.5;
  const t_disorder     = g.entropy * 0.5 + Math.min(1, speedVar * 6) * 0.5;
  const t_interactions = g.flow * 0.4 + Math.min(1, meanSpeed * 4) * 0.3 + colorDiversity * 0.3;
  const t_organization = g.coherence * 0.4 + g.memory * 0.3 + (1 - g.fragmentation) * 0.3;
  const minP = Math.min(t_order, t_disorder, t_interactions, t_organization);
  const maxP = Math.max(t_order, t_disorder, t_interactions, t_organization) || 1;
  const tetralogia = Math.min(1, (minP / maxP) * 2 + minP * 0.5);

  return { dialogica, recursivo, hologramatico, sapiensDemens, tetralogia };
}
