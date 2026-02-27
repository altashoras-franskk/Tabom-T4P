// ── Music Lab Complexity (Morin) ──────────────────────────────────────────────
// Derives MorinIndices from MusicQuantum[] + PhysicsParams, mirroring the
// same theoretical framework used in Sociogenesis and the Complexity Lab.

import type { MorinIndices } from '../complexity/complexityLens';
import type { MusicQuantum, PhysicsParams, VoiceRole } from './musicTypes';

const EMPTY: MorinIndices = { dialogica: 0, recursivo: 0, hologramatico: 0, sapiensDemens: 0.5, tetralogia: 0 };

export function computeMusicMorin(quanta: MusicQuantum[], physics: PhysicsParams): MorinIndices {
  const n = quanta.length;
  if (n < 3) return EMPTY;

  // Role diversity (Shannon entropy normalized to [0..1])
  const roleCounts = new Map<VoiceRole, number>();
  for (let i = 0; i < n; i++) {
    const r = quanta[i].role;
    roleCounts.set(r, (roleCounts.get(r) ?? 0) + 1);
  }
  let roleEntropy = 0;
  for (const c of roleCounts.values()) {
    const p = c / n;
    if (p > 0) roleEntropy -= p * Math.log2(p);
  }
  roleEntropy /= Math.log2(8); // 8 voice roles

  // Velocity & energy statistics
  let sumS = 0, sumS2 = 0, sumCharge = 0, sumPitch = 0;
  let phaseLocked = 0;
  for (let i = 0; i < n; i++) {
    const q = quanta[i];
    const s = Math.sqrt(q.vx * q.vx + q.vy * q.vy);
    sumS += s; sumS2 += s * s;
    sumCharge += q.charge;
    sumPitch += q.pitch;
    if (q.phaseLocked >= 0) phaseLocked++;
  }
  const meanSpeed = sumS / n;
  const speedVar = Math.sqrt(Math.max(0, sumS2 / n - meanSpeed * meanSpeed));
  const meanCharge = sumCharge / n;
  const meanPitch = sumPitch / n;
  const lockRatio = phaseLocked / n;

  // Pitch variance (harmonic diversity)
  let pitchVar = 0;
  for (let i = 0; i < n; i++) pitchVar += (quanta[i].pitch - meanPitch) ** 2;
  pitchVar = Math.sqrt(pitchVar / n);
  const pitchDiversity = Math.min(1, pitchVar / 12);

  // ── Dialogica ─────────────────────────────────────────────────────────────
  // Consonance (order) and dissonance (disorder) coexisting productively.
  const orderPole = physics.cohesion * 0.25 + physics.damping * 0.25 + lockRatio * 0.25 + physics.entainment * 0.25;
  const disorderPole = physics.turbulence * 0.25 + physics.mutationRate * 0.25 + Math.min(1, speedVar * 5) * 0.25 + pitchDiversity * 0.25;
  const dialogica = Math.min(1, Math.min(orderPole, disorderPole) * 2.5);

  // ── Recursivo ─────────────────────────────────────────────────────────────
  // Musical events create energy → energy creates new events → feedback loop.
  const recursivo = Math.min(1, meanCharge * 0.4 + physics.energyTransfer * 0.3 + roleEntropy * 0.3) * Math.min(1, 1 + speedVar * 2);

  // ── Hologramático ─────────────────────────────────────────────────────────
  // Each voice carries the essence of the whole composition.
  const hologramatico = Math.min(1, roleEntropy * 0.35 + lockRatio * 0.25 + pitchDiversity * 0.20 + Math.min(1, meanCharge * 2) * 0.20);

  // ── Sapiens-Demens ────────────────────────────────────────────────────────
  // Constructive (harmonic structure) vs destructive (chaotic dissolution)
  const constructive = physics.cohesion * 0.25 + physics.entainment * 0.25 + lockRatio * 0.25 + (1 - physics.mutationRate) * 0.25;
  const destructive = physics.turbulence * 0.25 + physics.mutationRate * 0.25 + (1 - physics.damping) * 0.25 + Math.min(1, speedVar * 4) * 0.25;
  const total = constructive + destructive || 1;
  const sapiensDemens = constructive / total;

  // ── Tetralogia ────────────────────────────────────────────────────────────
  // Order ↔ disorder ↔ interactions ↔ organization — all four poles active.
  const t_order        = physics.damping * 0.5 + lockRatio * 0.5;
  const t_disorder     = physics.turbulence * 0.5 + Math.min(1, speedVar * 5) * 0.5;
  const t_interactions = roleEntropy * 0.5 + Math.min(1, meanCharge * 2) * 0.5;
  const t_organization = physics.cohesion * 0.4 + physics.entainment * 0.3 + (1 - physics.mutationRate) * 0.3;
  const minP = Math.min(t_order, t_disorder, t_interactions, t_organization);
  const maxP = Math.max(t_order, t_disorder, t_interactions, t_organization) || 1;
  const tetralogia = Math.min(1, (minP / maxP) * 2 + minP * 0.5);

  return { dialogica, recursivo, hologramatico, sapiensDemens, tetralogia };
}
