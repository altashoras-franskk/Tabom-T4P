// ─── Meta-Arte: Live Tool Definitions ─────────────────────────────────────
import type { ToolId, ToolState } from './metaArtTypes';

export interface ToolParam {
  label: string;
  key: keyof ToolState;
  min: number; max: number; step: number;
}

export interface ToolDef {
  id: ToolId;
  icon: string;
  name: string;
  category: 'vida' | 'forca' | 'mutar' | 'guiar';
  description: string;
  params: ToolParam[];
  cursor?: string;
}

// ── 16 Live Tools ─────────────────────────────────────────────────────────────
export const TOOL_DEFS: ToolDef[] = [
  // ── VIDA — create / destroy agents ──────────────────────────────────────────
  {
    id: 'spawn_brush', icon: '✦', name: 'Spawn', category: 'vida',
    description: 'Pinta agentes vivos — cada traço gera quanta que ganham vida própria',
    params: [
      { label: 'Raio',    key: 'size',     min: 5,    max: 220, step: 5 },
      { label: 'Dens.',   key: 'pressure', min: 0.05, max: 1,   step: 0.05 },
    ],
  },
  {
    id: 'erase_agents', icon: '✕', name: 'Apagar', category: 'vida',
    description: 'Remove quanta do campo — apaga agentes dentro do raio',
    params: [
      { label: 'Raio',    key: 'size',     min: 10,   max: 350, step: 10 },
      { label: 'Força',   key: 'pressure', min: 0.1,  max: 1,   step: 0.05 },
    ],
  },

  // ── FORCA — direct live forces on agents ──────────────────────────────────
  {
    id: 'attract', icon: '⊙', name: 'Atrator', category: 'forca',
    description: 'Puxa quanta para o cursor — cria concentração e densidade viva',
    params: [
      { label: 'Raio',    key: 'size',     min: 10,   max: 300, step: 5 },
      { label: 'Força',   key: 'pressure', min: 0.05, max: 1,   step: 0.05 },
    ],
  },
  {
    id: 'repel', icon: '⊗', name: 'Repulsor', category: 'forca',
    description: 'Expande e dispersa quanta — cria espaço negativo',
    params: [
      { label: 'Raio',    key: 'size',     min: 10,   max: 300, step: 5 },
      { label: 'Força',   key: 'pressure', min: 0.05, max: 1,   step: 0.05 },
    ],
  },
  {
    id: 'vortex', icon: '◉', name: 'Vórtice', category: 'forca',
    description: 'Gira quanta em torno do cursor — redemoinhos e espirais vivas',
    params: [
      { label: 'Raio',    key: 'size',     min: 10,   max: 300, step: 5 },
      { label: 'Força',   key: 'pressure', min: 0.05, max: 1,   step: 0.05 },
    ],
  },
  {
    id: 'freeze', icon: '◈', name: 'Congelar', category: 'forca',
    description: 'Retarda quanta no raio — cria zonas de silêncio e suspensão',
    params: [
      { label: 'Raio',    key: 'size',     min: 10,   max: 300, step: 5 },
      { label: 'Força',   key: 'pressure', min: 0.05, max: 1,   step: 0.05 },
    ],
  },
  {
    id: 'burst', icon: '⊛', name: 'Explosão', category: 'forca',
    description: 'Explode velocidade aleatória nos agentes — caos localizado',
    params: [
      { label: 'Raio',    key: 'size',     min: 10,   max: 300, step: 5 },
      { label: 'Força',   key: 'pressure', min: 0.05, max: 1,   step: 0.05 },
    ],
  },
  {
    id: 'black_hole', icon: '⦿', name: 'Buraco Negro', category: 'forca',
    description: 'Atração extrema — os quanta chegam e são lançados ao outro lado',
    params: [
      { label: 'Raio',    key: 'size',     min: 10,   max: 250, step: 5 },
      { label: 'Força',   key: 'pressure', min: 0.05, max: 1,   step: 0.05 },
    ],
  },

  // ── MUTAR — mutate live agent properties ──────────────────────────────────
  {
    id: 'color_infect', icon: '⊜', name: 'Infectar Cor', category: 'mutar',
    description: 'Propaga a cor ativa para os quanta no raio — contágio cromático',
    params: [
      { label: 'Raio',    key: 'size',     min: 10,   max: 300, step: 5 },
      { label: 'Força',   key: 'pressure', min: 0.02, max: 1,   step: 0.02 },
    ],
  },
  {
    id: 'size_wave', icon: '◬', name: 'Onda Tamanho', category: 'mutar',
    description: 'Modula o tamanho dos quanta em onda pulsante — textura dinâmica',
    params: [
      { label: 'Raio',    key: 'size',     min: 10,   max: 300, step: 5 },
      { label: 'Ampli.',  key: 'pressure', min: 0.05, max: 1,   step: 0.05 },
    ],
  },
  {
    id: 'ink_flood', icon: '⊕', name: 'Inundar Tinta', category: 'mutar',
    description: 'Reabastece tinta dos quanta — intensifica rastros na região',
    params: [
      { label: 'Raio',    key: 'size',     min: 10,   max: 300, step: 5 },
      { label: 'Força',   key: 'pressure', min: 0.05, max: 1,   step: 0.05 },
    ],
  },
  {
    id: 'species_shift', icon: '⟁', name: 'Mudar Espécie', category: 'mutar',
    description: 'Converte espécie dos quanta — muda o "tipo" dos agentes vivos',
    params: [
      { label: 'Raio',    key: 'size',     min: 10,   max: 300, step: 5 },
      { label: 'Taxa',    key: 'pressure', min: 0.01, max: 1,   step: 0.02 },
    ],
  },

  // ── GUIAR — guide/channel agents ──────────────────────────────────────────
  {
    id: 'flow_paint', icon: '≋', name: 'Pintar Fluxo', category: 'guiar',
    description: 'Define direção do campo vetorial com o gesto — guia quanta por muito tempo',
    params: [
      { label: 'Raio',    key: 'size',     min: 10,   max: 300, step: 5 },
      { label: 'Força',   key: 'pressure', min: 0.1,  max: 1,   step: 0.05 },
    ],
  },
  {
    id: 'channel', icon: '⟹', name: 'Canal', category: 'guiar',
    description: 'Cria corrente direcional — empurra quanta na direção do arraste',
    params: [
      { label: 'Raio',    key: 'size',     min: 10,   max: 300, step: 5 },
      { label: 'Força',   key: 'pressure', min: 0.05, max: 1,   step: 0.05 },
    ],
  },
  {
    id: 'pinch', icon: '⟨', name: 'Pinçar', category: 'guiar',
    description: 'Comprime quanta em direção a uma linha — cria acumulações lineares',
    params: [
      { label: 'Raio',    key: 'size',     min: 10,   max: 350, step: 5 },
      { label: 'Força',   key: 'pressure', min: 0.05, max: 1,   step: 0.05 },
    ],
  },
  {
    id: 'scatter_burst', icon: '✳', name: 'Dispersão', category: 'guiar',
    description: 'Explode quanta radialmente do cursor — dispersão controlada',
    params: [
      { label: 'Raio',    key: 'size',     min: 10,   max: 350, step: 5 },
      { label: 'Força',   key: 'pressure', min: 0.05, max: 1,   step: 0.05 },
    ],
  },
];

export const GLYPH_DICT: string[] = [
  '○', '◎', '●', '◆', '◇', '▲', '▽', '▪', '⬡', '✦',
  '∂', '∑', '∫', '∇', '∆', 'Ω', '∞', '×', '±', '≈',
  '⊕', '⊗', '⊘', '⊛', '⊙', '◬', '⊞', '⊠', '⊜', '⌘',
  '·', '⋆', '∴', '∵', '≡',
];

export function createDefaultToolState(): ToolState {
  return {
    activeToolId: 'spawn_brush',
    size: 40,
    pressure: 0.65,
    flow: 0.6,
    hardness: 0.6,
    colorIndex: 0,
    glyphIndex: 0,
    isDragging: false,
    lastX: 0, lastY: 0,
    sizeMul: 1.0,
    dragDX: 0, dragDY: 0,
  };
}

// Kept for backward compat — brush tools still exist as types but not in UI
export function applyBrushToCanvas(): void { /* no-op — brush tools removed from UI */ }