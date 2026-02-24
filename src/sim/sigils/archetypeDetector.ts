// PATCH 4.5-SIGILS: Archetype Detector (RecursiveLab cluster trackers adapted to typed arrays)
// Detects stable clusters and classifies them into archetypes based on sigils/field dominance

import { MicroState } from '../micro/microState';
import { FieldState, sampleField } from '../field/fieldState';
import { SigilFieldState, sampleSigils } from './sigilState';

export interface ClusterTracker {
  id: string;
  centroid: { x: number; y: number };
  particleCount: number;
  lifetime: number;
  stability: number;       // 0..1
  lastCentroid: { x: number; y: number };
}

export interface ArchetypeArtifact {
  id: string;
  name: string;
  sigil: string;
  description: string;
  bornAt: number;
  locus: { x: number; y: number };
  radius: number;
  kind: 'VINCULO' | 'RUPTURA' | 'FLORESCER' | 'JURAMENTO' | 'MIXED';
}

const TEMPLATES = {
  VINCULO: { name: 'Vínculo', sigil: '✶', description: 'Coesão local: atração e pacto temporário.' },
  RUPTURA: { name: 'Ruptura', sigil: '⨯', description: 'Fronteira viva: repulsão, conflito, cisma.' },
  FLORESCER: { name: 'Florescer', sigil: '⚘', description: 'Zona fértil: alimento, abundância, replicação.' },
  JURAMENTO: { name: 'Juramento', sigil: '⌬', description: 'Ritual: caminho estável, memória, hábito.' },
  MIXED: { name: 'Híbrido', sigil: '⟡', description: 'Símbolos competem: regime instável e criativo.' },
};

export function detectClusters(m: MicroState, grid: number = 0.22) {
  // grid in normalized coords size; default ~0.22 => ~9x9 cells
  const cells = new Map<string, number[]>();
  for (let i = 0; i < m.count; i++) {
    const gx = Math.floor((m.x[i] + 1) / grid);
    const gy = Math.floor((m.y[i] + 1) / grid);
    const key = gx + ',' + gy;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push(i);
  }

  const clusters: Array<{ centroid: { x: number; y: number }; count: number; radius: number }> = [];
  for (const [_, idxs] of cells) {
    if (idxs.length < 8) continue;
    let sx = 0, sy = 0;
    for (const i of idxs) { sx += m.x[i]; sy += m.y[i]; }
    const cx = sx / idxs.length, cy = sy / idxs.length;
    let r = 0;
    for (const i of idxs) {
      const dx = m.x[i] - cx, dy = m.y[i] - cy;
      r = Math.max(r, Math.sqrt(dx * dx + dy * dy));
    }
    clusters.push({ centroid: { x: cx, y: cy }, count: idxs.length, radius: r });
  }
  return clusters;
}

export function updateTrackers(trackers: ClusterTracker[], m: MicroState, dt: number, t: number) {
  const clusters = detectClusters(m);
  const next: ClusterTracker[] = [];
  const used = new Set<number>();

  for (const tr of trackers) {
    let best = -1, bestDist = 1e9;
    for (let k = 0; k < clusters.length; k++) {
      if (used.has(k)) continue;
      const dx = clusters[k].centroid.x - tr.centroid.x;
      const dy = clusters[k].centroid.y - tr.centroid.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.25 && d < bestDist) { bestDist = d; best = k; }
    }
    if (best >= 0) {
      used.add(best);
      const c = clusters[best];
      const dx = c.centroid.x - tr.lastCentroid.x;
      const dy = c.centroid.y - tr.lastCentroid.y;
      const motion = Math.sqrt(dx * dx + dy * dy);

      const sizeDiff = Math.abs(c.count - tr.particleCount) / Math.max(1, tr.particleCount);
      const stableNow = (motion < 0.03 && sizeDiff < 0.35) ? 1 : 0;
      const stability = clamp01(tr.stability * 0.85 + stableNow * 0.15);

      next.push({
        ...tr,
        centroid: c.centroid,
        lastCentroid: tr.centroid,
        particleCount: c.count,
        stability,
        lifetime: tr.lifetime + dt,
      });
    }
  }

  // add new trackers
  for (let k = 0; k < clusters.length; k++) {
    if (used.has(k)) continue;
    const c = clusters[k];
    next.push({
      id: 'cl_' + Math.floor(t * 1000) + '_' + k,
      centroid: c.centroid,
      lastCentroid: c.centroid,
      particleCount: c.count,
      lifetime: 0,
      stability: 0.45,
    });
  }

  // prune
  return next.filter(tr => tr.lifetime < 90);
}

function clamp01(v: number) { return v < 0 ? 0 : v > 1 ? 1 : v; }

export function classifyArchetype(tr: ClusterTracker, field: FieldState, sig: SigilFieldState) {
  if (tr.lifetime < 6) return null;
  if (tr.stability < 0.62) return null;
  if (tr.particleCount < 10) return null;

  const F = sampleField(field, tr.centroid.x, tr.centroid.y);
  const S = sampleSigils(sig, tr.centroid.x, tr.centroid.y);

  // dominance by sigils (preferred)
  const maxSig = Math.max(S.bond, S.rift, S.bloom, S.oath);
  const second = [S.bond, S.rift, S.bloom, S.oath].sort((a, b) => b - a)[1];

  if (maxSig > 0.55 && (maxSig - second) > 0.15) {
    if (S.bond === maxSig) return 'VINCULO';
    if (S.rift === maxSig) return 'RUPTURA';
    if (S.bloom === maxSig) return 'FLORESCER';
    if (S.oath === maxSig) return 'JURAMENTO';
  }

  // fallback by field regime (if overlay off but field alive)
  if (F.cohesion > 0.62) return 'VINCULO';
  if (F.tension > 0.62) return 'RUPTURA';
  if (F.scarcity < 0.35) return 'FLORESCER';
  if (F.mythic > 0.55) return 'JURAMENTO';

  return null;
}

export function makeArtifact(tr: ClusterTracker, kind: any, bornAt: number): ArchetypeArtifact {
  const tpl = (TEMPLATES as any)[kind] || TEMPLATES.MIXED;
  return {
    id: tr.id,
    name: tpl.name,
    sigil: tpl.sigil,
    description: tpl.description,
    bornAt,
    locus: { ...tr.centroid },
    radius: Math.max(0.06, Math.min(0.35, 0.12 + tr.particleCount / 300)),
    kind: kind || 'MIXED',
  };
}
