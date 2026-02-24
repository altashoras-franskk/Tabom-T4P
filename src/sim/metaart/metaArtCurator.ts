// ─── Meta-Arte: Curator (heurística local) ────────────────────────────────
import type { MetricsSnapshot, CuratorSuggestion, DNA, FieldGrid, Quantum } from './metaArtTypes';

export function computeMetrics(
  fields: FieldGrid,
  quanta: Quantum[],
  prevDensity: number
): MetricsSnapshot {
  const S = fields.size;
  let densitySum = 0, pressureSum = 0, edgeCount = 0;
  let memSum = 0;
  let symDiff = 0;

  for (let gy = 0; gy < S; gy++) {
    for (let gx = 0; gx < S; gx++) {
      const idx = gy * S + gx;
      densitySum  += fields.density[idx];
      pressureSum += fields.pressure[idx];
      memSum      += fields.memory[idx];

      // Edge detection (for fragmentation)
      if (gx > 0 && gy > 0) {
        const d00 = fields.density[idx];
        const d10 = fields.density[gy * S + (gx - 1)];
        const d01 = fields.density[(gy - 1) * S + gx];
        const grad = Math.abs(d00 - d10) + Math.abs(d00 - d01);
        if (grad > 0.08) edgeCount++;
      }

      // Symmetry check (left vs right half)
      if (gx < S / 2) {
        const mirrorIdx = gy * S + (S - 1 - gx);
        symDiff += Math.abs(fields.density[idx] - fields.density[mirrorIdx]);
      }
    }
  }

  const n = S * S;
  const density = densitySum / n;
  const pressure = pressureSum / n;
  const mem = memSum / n;

  // Novelty: rate of change
  const novelty = Math.abs(density - prevDensity) * 20;

  // Silence: how empty is the canvas
  const silenceIndex = 1 - Math.min(1, density * 5);

  // Fragmentation: edge ratio
  const fragmentation = edgeCount / (n * 0.3);

  // Symmetry: 0=asymmetric, 1=perfect
  const symmetry = Math.max(0, 1 - symDiff / (S * S * 0.25 * 0.5));

  // Motif stability: inverse of novelty
  const motifStability = Math.max(0, 1 - novelty * 2);

  return {
    density: Math.min(1, density * 4),
    contrast: Math.min(1, pressure * 3),
    novelty: Math.min(1, novelty),
    silenceIndex: Math.max(0, silenceIndex),
    motifStability,
    symmetry,
    fragmentation: Math.min(1, fragmentation),
  };
}

interface SuggestionRule {
  condition: (m: MetricsSnapshot, d: DNA) => boolean;
  action: string;
  interpretation: string;
  variation: string;
}

const RULES: SuggestionRule[] = [
  {
    condition: (m) => m.density > 0.75,
    action: 'use Solvent para abrir espaço negativo',
    interpretation: 'a obra saturou; o gesto perdeu margem de respiração',
    variation: 'mutate: -memory +erosion',
  },
  {
    condition: (m) => m.silenceIndex > 0.8,
    action: 'use Attractor ou Ink Brush para iniciar presença',
    interpretation: 'campo vazio; o sistema aguarda intenção',
    variation: 'mutate: +flow +contrast',
  },
  {
    condition: (m) => m.fragmentation > 0.7,
    action: 'use Coagula para cristalizar e unificar fragmentos',
    interpretation: 'alta fragmentação; estrutura tende ao caos sem ancoragem',
    variation: 'mutate: -fragmentation +coherence',
  },
  {
    condition: (m) => m.motifStability > 0.88 && m.novelty < 0.05,
    action: 'use Vortex ou mude a intenção para gerar ruptura',
    interpretation: 'a obra estabilizou — é momento de perturbação criativa',
    variation: 'mutate: +entropy +flow',
  },
  {
    condition: (m) => m.symmetry > 0.85 && m.density > 0.3,
    action: 'use Repulsor off-center para quebrar simetria',
    interpretation: 'simetria cristalizada; risco de rigidez formal',
    variation: 'mutate: +fragmentation -symmetry',
  },
  {
    condition: (m) => m.contrast < 0.1 && m.density > 0.2,
    action: 'use Glow Brush ou aumente o gene contrast',
    interpretation: 'tonalidade uniforme — obra precisa de tensão cromática',
    variation: 'mutate: +contrast -memory',
  },
  {
    condition: (m, d) => d.genes.glyphness > 0.6 && m.density < 0.3,
    action: 'use Glyph Stamp para inscrever marcas no campo vazio',
    interpretation: 'potencial simbólico alto, mas sem substrato de tinta',
    variation: 'mutate: +memory +layering',
  },
  {
    condition: (m) => m.novelty > 0.5,
    action: 'salve um snapshot agora — alta taxa de novidade',
    interpretation: 'sistema em transição rápida; o momento é irrecuperável',
    variation: 'mutate: +coherence',
  },
];

export function getCuratorSuggestion(
  metrics: MetricsSnapshot,
  dna: DNA
): CuratorSuggestion {
  for (const rule of RULES) {
    if (rule.condition(metrics, dna)) {
      return {
        action: rule.action,
        interpretation: rule.interpretation,
        variation: rule.variation,
      };
    }
  }
  return {
    action: 'continue — o sistema evolui',
    interpretation: 'equilíbrio dinâmico; sem necessidade de intervenção imediata',
    variation: 'mutate: +flow ou explore preset diferente',
  };
}

// Auto-grimoire observations
const OBSERVATIONS = [
  (m: MetricsSnapshot) => m.density > 0.7  ? 'saturação alcançada — campo denso' : null,
  (m: MetricsSnapshot) => m.silenceIndex > 0.9 ? 'silêncio instaurado' : null,
  (m: MetricsSnapshot) => m.fragmentation > 0.8 ? 'fragmentação intensa — estrutura em dissolução' : null,
  (m: MetricsSnapshot) => m.motifStability > 0.9 ? 'motivo estabilizou — padrão fixo emergiu' : null,
  (m: MetricsSnapshot) => m.symmetry > 0.85 ? 'simetria espontânea detectada' : null,
  (m: MetricsSnapshot) => m.novelty > 0.6 ? 'alta taxa de novidade — sistema em ruptura' : null,
];

export function getAutoGrimoireObservation(metrics: MetricsSnapshot): string | null {
  for (const obs of OBSERVATIONS) {
    const result = obs(metrics);
    if (result) return result;
  }
  return null;
}