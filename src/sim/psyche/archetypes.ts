// ── Psyche Lab — 12 Jungian Archetypes as Field Operators ────────────────────
import { ArchetypeNode, ArchetypeId, RegionId } from './psycheTypes';

export const ARCHETYPES: ArchetypeNode[] = [
  {
    id: 'SELF', sigil: '✦', color: '#f5c842',
    preferredRegion: 'SELF_REGION',
    fieldMode: 'sink', fieldRadius: 0.28,
    description: 'Integração — centro unificador da psique',
  },
  {
    id: 'PERSONA', sigil: '◈', color: '#b0c4de',
    preferredRegion: 'PERSONA_REGION',
    fieldMode: 'shear', fieldRadius: 0.28,
    description: 'Máscara social — interface com o mundo',
  },
  {
    id: 'SHADOW', sigil: '◗', color: '#7c3aed',
    preferredRegion: 'SHADOW_REGION',
    fieldMode: 'vortex', fieldRadius: 0.32,
    description: 'Conteúdo reprimido e negado',
  },
  {
    id: 'ANIMA', sigil: '☽', color: '#f43f5e',
    preferredRegion: 'COLLECTIVE',
    fieldMode: 'oscillate', fieldRadius: 0.35,
    description: 'Ponte entre Ego e Inconsciente',
  },
  {
    id: 'TRICKSTER', sigil: '⚡', color: '#84cc16',
    preferredRegion: 'SHADOW_REGION',
    fieldMode: 'spiral', fieldRadius: 0.30,
    description: 'Ruptura criativa — recombinação',
  },
  {
    id: 'HERO', sigil: '↑', color: '#3b82f6',
    preferredRegion: 'EGO',
    fieldMode: 'source', fieldRadius: 0.28,
    description: 'Direção e conquista — ego dirigido',
  },
  {
    id: 'MOTHER', sigil: '∞', color: '#f59e0b',
    preferredRegion: 'COLLECTIVE',
    fieldMode: 'sink', fieldRadius: 0.34,
    description: 'Nutrição e acolhimento — campo matrizal',
  },
  {
    id: 'FATHER', sigil: '⊞', color: '#6b7280',
    preferredRegion: 'SUPEREGO',
    fieldMode: 'shear', fieldRadius: 0.30,
    description: 'Lei e ordem — estrutura normativa',
  },
  {
    id: 'WISE_ONE', sigil: '◉', color: '#6366f1',
    preferredRegion: 'SELF_REGION',
    fieldMode: 'sink', fieldRadius: 0.38,
    description: 'Síntese e sentido — sabedoria profunda',
  },
  {
    id: 'CHILD', sigil: '✧', color: '#06b6d4',
    preferredRegion: 'EGO',
    fieldMode: 'oscillate', fieldRadius: 0.26,
    description: 'Potencial e renascimento — abertura',
  },
  {
    id: 'LOVER', sigil: '❋', color: '#ec4899',
    preferredRegion: 'COLLECTIVE',
    fieldMode: 'spiral', fieldRadius: 0.32,
    description: 'Vínculo e Eros — campo de ressonância',
  },
  {
    id: 'DESTROYER', sigil: '✖', color: '#ef4444',
    preferredRegion: 'ID',
    fieldMode: 'source', fieldRadius: 0.28,
    description: 'Morte e transformação — ruptura necessária',
  },
];

/** Region centers for archetype field nodes (world space x, y) */
export const ARCHETYPE_POSITIONS: Record<ArchetypeId, [number, number]> = {
  SELF:       [ 0.00,  0.00],
  PERSONA:    [-0.42, -0.30],
  SHADOW:     [-0.42,  0.35],
  ANIMA:      [ 0.10,  0.20],
  TRICKSTER:  [-0.22,  0.45],
  HERO:       [ 0.42, -0.30],
  MOTHER:     [ 0.20,  0.48],
  FATHER:     [ 0.00, -0.64],
  WISE_ONE:   [ 0.00, -0.10],
  CHILD:      [ 0.30, -0.52],
  LOVER:      [ 0.45,  0.20],
  DESTROYER:  [ 0.00,  0.68],
};

/** Per-archetype flow field contribution at world point (wx, wy) */
export function archetypeFlowAt(
  arch: ArchetypeNode,
  pos: [number, number],
  wx: number,
  wy: number,
  t: number,
  strength: number,
): [number, number] {
  const [ax, ay] = pos;
  const dx = wx - ax;
  const dy = wy - ay;
  const r  = Math.sqrt(dx * dx + dy * dy);
  if (r < 0.001 || r > arch.fieldRadius) return [0, 0];

  const falloff = (1 - r / arch.fieldRadius) ** 2;
  let u = 0, v = 0;

  switch (arch.fieldMode) {
    case 'sink':
      // Attract inward (toward archetype center)
      u = -dx / r * falloff;
      v = -dy / r * falloff;
      break;
    case 'source':
      // Push outward
      u = dx / r * falloff;
      v = dy / r * falloff;
      break;
    case 'vortex':
      // CCW tangential
      u = -dy / r * falloff;
      v =  dx / r * falloff;
      break;
    case 'shear':
      // Horizontal shear
      u =  dy / r * falloff;
      v = -dx / r * falloff * 0.3;
      break;
    case 'oscillate': {
      // Pulsating radial + tangential
      const phase = t * 1.5;
      u = Math.cos(phase) * (-dx / r) * falloff + Math.sin(phase) * (-dy / r) * falloff * 0.5;
      v = Math.cos(phase) * (-dy / r) * falloff + Math.sin(phase) * ( dx / r) * falloff * 0.5;
      break;
    }
    case 'spiral':
      // Inward + CCW tangential
      u = (-dx / r - dy / r * 0.7) * falloff;
      v = (-dy / r + dx / r * 0.7) * falloff;
      break;
    default:
      break;
  }

  return [u * strength, v * strength];
}

/** Per-quantum operator: archetype transforms the quantum's inner state */
export function archetypeTransformQuantum(
  archId: ArchetypeId,
  qPos: [number, number],
  archPos: [number, number],
  charge: number,
  valence: number,
  coherence: number,
  arousal: number,
  inhibition: number,
  radius: number,
  strength: number,
  dt: number,
): { charge: number; valence: number; coherence: number; arousal: number; inhibition: number } {
  const dx = qPos[0] - archPos[0];
  const dy = qPos[1] - archPos[1];
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r > radius) return { charge, valence, coherence, arousal, inhibition };

  const w = (1 - r / radius) * strength * dt;

  switch (archId) {
    case 'SELF':
      return {
        charge:    charge + (0.5 - charge) * w * 0.4,
        valence:   valence + (0 - valence) * w * 0.3,
        coherence: coherence + (1 - coherence) * w * 0.8,
        arousal:   arousal + (0.3 - arousal) * w * 0.5,
        inhibition:inhibition + (0.2 - inhibition) * w * 0.6,
      };
    case 'SHADOW':
      return {
        charge:    charge + (charge > 0.5 ? 0.02 : 0) * w,
        valence:   valence - 0.05 * w,
        coherence: coherence - 0.06 * w,
        arousal:   arousal + 0.04 * w,
        inhibition:inhibition + 0.03 * w,
      };
    case 'HERO':
      return {
        charge:    Math.min(1, charge + 0.04 * w),
        valence:   Math.min(1, valence + 0.05 * w),
        coherence: coherence + 0.03 * w,
        arousal:   Math.min(1, arousal + 0.04 * w),
        inhibition:inhibition,
      };
    case 'MOTHER':
      return {
        charge:    charge + (0.5 - charge) * w * 0.3,
        valence:   Math.min(1, valence + 0.06 * w),
        coherence: Math.min(1, coherence + 0.05 * w),
        arousal:   arousal + (0.35 - arousal) * w * 0.4,
        inhibition:Math.max(0, inhibition - 0.04 * w),
      };
    case 'FATHER':
      return {
        charge:    charge,
        valence:   valence,
        coherence: coherence + 0.02 * w,
        arousal:   Math.max(0, arousal - 0.04 * w),
        inhibition:Math.min(1, inhibition + 0.06 * w),
      };
    case 'TRICKSTER':
      return {
        charge:    charge + (Math.random() - 0.5) * 0.15 * w,
        valence:   valence + (Math.random() - 0.5) * 0.12 * w,
        coherence: Math.max(0, coherence - 0.05 * w),
        arousal:   Math.min(1, arousal + 0.06 * w),
        inhibition:Math.max(0, inhibition - 0.05 * w),
      };
    case 'DESTROYER':
      return {
        charge:    Math.min(1, charge + 0.08 * w),
        valence:   valence - 0.07 * w,
        coherence: Math.max(0, coherence - 0.08 * w),
        arousal:   Math.min(1, arousal + 0.07 * w),
        inhibition:Math.max(0, inhibition - 0.03 * w),
      };
    case 'ANIMA':
      return {
        charge:    charge + Math.sin(charge * Math.PI) * 0.03 * w,
        valence:   valence + (Math.random() > 0.5 ? 0.04 : -0.02) * w,
        coherence: coherence + 0.04 * w,
        arousal:   arousal + 0.02 * w,
        inhibition:Math.max(0, inhibition - 0.03 * w),
      };
    case 'WISE_ONE':
      return {
        charge:    charge + (0.5 - charge) * w * 0.2,
        valence:   Math.min(1, valence + 0.04 * w),
        coherence: Math.min(1, coherence + 0.07 * w),
        arousal:   arousal + (0.4 - arousal) * w * 0.3,
        inhibition:inhibition + (0.3 - inhibition) * w * 0.3,
      };
    case 'CHILD':
      return {
        charge:    Math.min(1, charge + 0.03 * w),
        valence:   Math.min(1, valence + 0.05 * w),
        coherence: Math.max(0, coherence - 0.02 * w),
        arousal:   Math.min(1, arousal + 0.05 * w),
        inhibition:Math.max(0, inhibition - 0.05 * w),
      };
    case 'LOVER':
      return {
        charge:    charge + 0.03 * w,
        valence:   Math.min(1, valence + 0.07 * w),
        coherence: Math.min(1, coherence + 0.04 * w),
        arousal:   Math.min(1, arousal + 0.04 * w),
        inhibition:inhibition,
      };
    case 'PERSONA':
      return {
        charge:    charge,
        valence:   valence + (0.1 - valence) * w * 0.3,
        coherence: coherence + 0.02 * w,
        arousal:   Math.max(0, arousal - 0.03 * w),
        inhibition:Math.min(1, inhibition + 0.04 * w),
      };
    default:
      return { charge, valence, coherence, arousal, inhibition };
  }
}
