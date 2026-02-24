// ─── Meta-Arte: DNA ────────────────────────────────────────────────────────
import type { DNA, DNAGenes, Intention, AgentShape } from './metaArtTypes';

let _id = 1;
export function newDNAId(): string { return `dna-${Date.now()}-${_id++}`; }

export function createDefaultDNA(): DNA {
  return {
    id: newDNAId(),
    name: 'Quadro Branco',
    genes: {
      structure: 0.18, flow: 0.55, entropy: 0.32, memory: 0.75,
      contrast: 0.60, symmetry: 0.05, glyphness: 0.06, erosion: 0.08,
      layering: 0.75, rhythm: 0.38, fragmentation: 0.22, coherence: 0.70,
    },
    intention: 'none',
    palette: ['#2a4a7f', '#7f2a4a', '#2a7f4a', '#7f6a2a', '#4a2a7f', '#2a6a7f'],
    background: '#f8f6f0',
    quantaCount: 0,
    createdAt: Date.now(),
  };
}

export const INTENTION_OVERRIDES: Record<Intention, Partial<DNAGenes>> = {
  ascension:    { flow: 0.85, entropy: 0.3,  memory: 0.7,  contrast: 0.4,  coherence: 0.8 },
  gravity:      { flow: 0.4,  entropy: 0.2,  memory: 0.9,  contrast: 0.7,  coherence: 0.7 },
  conflict:     { entropy: 0.8, contrast: 0.9, fragmentation: 0.8, rhythm: 0.7, erosion: 0.6 },
  harmony:      { coherence: 0.9, entropy: 0.15, symmetry: 0.6, memory: 0.7, contrast: 0.3 },
  ecstasy:      { flow: 0.95, entropy: 0.7, contrast: 0.5, rhythm: 0.8, fragmentation: 0.5 },
  silence:      { flow: 0.1,  entropy: 0.05, memory: 0.95, contrast: 0.1, coherence: 0.9 },
  mondrian:     { structure: 0.98, linear: 1.0, entropy: 0.02, coherence: 0.98, fragmentation: 0.02, flow: 0.2 },
  suprematist:  { structure: 0.92, linear: 0.9, entropy: 0.08, coherence: 0.9, symmetry: 0.12, agentShape: 'square' },
  action:       { flow: 0.92, entropy: 0.88, fragmentation: 0.95, rhythm: 0.9, contrast: 0.92, erosion: 0.7 },
  minimal:      { flow: 0.12, entropy: 0.04, memory: 0.98, contrast: 0.8, coherence: 0.97, erosion: 0.02 },
  glitch:       { entropy: 0.95, fragmentation: 0.98, rhythm: 0.95, structure: 0.12, linear: 0.7 },
  botanical:    { flow: 0.62, entropy: 0.22, memory: 0.90, coherence: 0.82, structure: 0.18, fragmentation: 0.18 },
  constellation: { structure: 0.08, flow: 0.25, entropy: 0.12, memory: 0.95, coherence: 0.92, agentShape: 'star' },
  none: {},
};

export function applyIntention(dna: DNA, intention: Intention): DNA {
  const overrides = INTENTION_OVERRIDES[intention] ?? {};
  return {
    ...dna,
    intention,
    genes: { ...dna.genes, ...overrides },
  };
}

// ── Preset builder ────────────────────────────────────────────────────────────
function preset(
  name: string,
  genes: DNAGenes,
  palette: string[],
  background: string,
  quantaCount = 1200,
  intention: Intention = 'none'
): DNA {
  return { id: newDNAId(), name, genes, palette, background, quantaCount, createdAt: Date.now(), intention };
}

// ── CORE PRESETS — each targets a distinct archetype ─────────────────────────
export const PRESETS: DNA[] = [
  // ── BLANK CANVAS ──
  preset(
    'Quadro Branco',
    { structure:0.18, flow:0.55, entropy:0.32, memory:0.75,
      contrast:0.60, symmetry:0.05, glyphness:0.06, erosion:0.08,
      layering:0.75, rhythm:0.38, fragmentation:0.22, coherence:0.70 },
    ['#2a4a7f', '#7f2a4a', '#2a7f4a', '#7f6a2a', '#4a2a7f', '#2a6a7f'],
    '#f8f6f0', 0
  ),
  // ── MONDRIAN GRID — BLOCKS archetype, primary colors, linear ──
  preset(
    'Mondrian Grid',
    { structure:0.98, flow:0.18, entropy:0.03, memory:0.40,
      contrast:0.99, symmetry:0.0, glyphness:0.0, erosion:0.60,
      layering:0.30, rhythm:0.85, fragmentation:0.04, coherence:0.98,
      linear:1.0, agentShape:'square' },
    ['#e31414', '#1449cc', '#f5e614', '#000000', '#f5f5f5'],
    '#f5f5f5', 700, 'mondrian'
  ),
  // ── ACTION PAINT — extreme chaos, gestural, drips ──
  preset(
    'Action Paint',
    { structure:0.06, flow:0.95, entropy:0.92, memory:0.35,
      contrast:0.95, symmetry:0.0, glyphness:0.0, erosion:0.72,
      layering:0.85, rhythm:0.95, fragmentation:0.97, coherence:0.18 },
    ['#cc1a00', '#ff6600', '#f0c000', '#1a1a1a', '#e0e0e0'],
    '#f0ece0', 1200, 'action'
  ),
  // ── INK CALLIGRAPHY — lines archetype, organic flow ──
  preset(
    'Ink Calligraphy',
    { structure:0.15, flow:0.88, entropy:0.18, memory:0.85,
      contrast:0.70, symmetry:0.05, glyphness:0.18, erosion:0.12,
      layering:0.65, rhythm:0.35, fragmentation:0.08, coherence:0.80 },
    ['#0d0a08', '#3a1808', '#8b4513', '#5c3317'],
    '#f7f3e9', 800
  ),
  // ── DUST CLOUD — DUST archetype, granular/cinematic ──
  preset(
    'Dust Cloud',
    { structure:0.12, flow:0.42, entropy:0.88, memory:0.22,
      contrast:0.55, symmetry:0.0, glyphness:0.0, erosion:0.62,
      layering:0.78, rhythm:0.55, fragmentation:0.92, coherence:0.20 },
    ['#d4c4a8', '#8a7060', '#4a3828', '#2a1a10', '#f0e0c8'],
    '#0e0a08', 1100
  ),
  // ── SOFT BLOBS — BLOBS archetype, watercolor/amoeba ──
  preset(
    'Watercolor Blobs',
    { structure:0.06, flow:0.42, entropy:0.14, memory:0.92,
      contrast:0.05, symmetry:0.12, glyphness:0.0, erosion:0.04,
      layering:0.96, rhythm:0.18, fragmentation:0.04, coherence:0.94 },
    ['#d080c0', '#80a0e0', '#60c0a0', '#e0c060', '#c0a0d0'],
    '#f0eef8', 700, 'silence'
  ),
  // ── BLUEPRINT — STRAIGHT lines, technical/architectural ──
  preset(
    'Blueprint',
    { structure:0.88, flow:0.38, entropy:0.06, memory:0.85,
      contrast:0.88, symmetry:0.10, glyphness:0.0, erosion:0.20,
      layering:0.60, rhythm:0.45, fragmentation:0.12, coherence:0.90,
      linear:0.95, agentShape:'diamond' },
    ['#a8d8ff', '#60b0e8', '#ffffff', '#204070'],
    '#0a1a28', 850
  ),
  // ── CHROMATIC ECSTASY — high flow, vivid, spectral ──
  preset(
    'Chromatic Ecstasy',
    { structure:0.10, flow:0.92, entropy:0.70, memory:0.40,
      contrast:0.10, symmetry:0.0, glyphness:0.0, erosion:0.30,
      layering:0.92, rhythm:0.35, fragmentation:0.22, coherence:0.65 },
    ['#ff2060', '#2040ff', '#00e8c0', '#ffdd00', '#e040a0'],
    '#030308', 800, 'ecstasy'
  ),
  // ── CONSTELLATION — dots+connections, deep space ──
  preset(
    'Constellation',
    { structure:0.08, flow:0.22, entropy:0.10, memory:0.98,
      contrast:0.70, symmetry:0.0, glyphness:0.0, erosion:0.02,
      layering:0.95, rhythm:0.10, fragmentation:0.08, coherence:0.96,
      agentShape:'star' },
    ['#ffffff', '#a0c8ff', '#c8a0ff', '#60d0ff'],
    '#010308', 500, 'constellation'
  ),
  // ── GLYPH ECOLOGY — symbols in green field ──
  preset(
    'Glyph Ecology',
    { structure:0.38, flow:0.62, entropy:0.30, memory:0.80,
      contrast:0.52, symmetry:0.18, glyphness:0.92, erosion:0.18,
      layering:0.68, rhythm:0.45, fragmentation:0.28, coherence:0.72 },
    ['#1a4a1a', '#2d7c2d', '#84c884', '#c8ecc8', '#406040'],
    '#060e06', 700, 'harmony'
  ),
  // ── SYMMETRY TEMPLE — radial mandala ──
  preset(
    'Symmetry Temple',
    { structure:0.60, flow:0.42, entropy:0.20, memory:0.72,
      contrast:0.75, symmetry:0.98, glyphness:0.28, erosion:0.28,
      layering:0.78, rhythm:0.50, fragmentation:0.08, coherence:0.90 },
    ['#c8a020', '#9030b0', '#1040c0', '#080818', '#e0c060'],
    '#060410', 700, 'harmony'
  ),
  // ── FRACTURE & RIFT — conflict archetype, raw shards ──
  preset(
    'Fracture & Rift',
    { structure:0.52, flow:0.28, entropy:0.68, memory:0.42,
      contrast:0.92, symmetry:0.05, glyphness:0.0, erosion:0.70,
      layering:0.62, rhythm:0.85, fragmentation:0.95, coherence:0.22 },
    ['#c04020', '#6a3018', '#e8b040', '#181008'],
    '#060402', 800, 'conflict'
  ),
  // ── HIGH-CONTRAST SIGNAL — black & white geometry ──
  preset(
    'Signal',
    { structure:0.58, flow:0.42, entropy:0.40, memory:0.42,
      contrast:0.99, symmetry:0.0, glyphness:0.05, erosion:0.52,
      layering:0.40, rhythm:0.78, fragmentation:0.32, coherence:0.58 },
    ['#000000', '#ffffff'],
    '#ffffff', 800
  ),
];

// ── EXTRA PRESETS — additional distinct styles ─────────────────────────────
export const EXTRA_PRESETS: DNA[] = [
  // ── SUPREMATIST — Malevich shapes on white ──
  preset(
    'Suprematist',
    { structure:0.95, flow:0.20, entropy:0.05, memory:0.55,
      contrast:0.98, symmetry:0.08, glyphness:0.0, erosion:0.65,
      layering:0.25, rhythm:0.75, fragmentation:0.05, coherence:0.96,
      linear:0.9, agentShape:'square' },
    ['#000000', '#cc1414', '#1430aa', '#f5e010', '#ffffff'],
    '#f0f0f0', 550, 'suprematist'
  ),
  // ── NEON WIREFRAME — straight cyan/magenta on black ──
  preset(
    'Neon Wireframe',
    { structure:0.82, flow:0.55, entropy:0.08, memory:0.72,
      contrast:0.98, symmetry:0.0, glyphness:0.0, erosion:0.28,
      layering:0.50, rhythm:0.68, fragmentation:0.18, coherence:0.78,
      linear:1.0 },
    ['#00ffaa', '#00aaff', '#ff00aa'],
    '#000000', 900
  ),
  // ── BOTANICAL GROWTH — organic tendrils ──
  preset(
    'Botanical',
    { structure:0.20, flow:0.62, entropy:0.22, memory:0.90,
      contrast:0.48, symmetry:0.08, glyphness:0.12, erosion:0.08,
      layering:0.92, rhythm:0.28, fragmentation:0.18, coherence:0.84 },
    ['#1a4a10', '#2d7020', '#6ab040', '#a8d870', '#d0f0a8', '#386028'],
    '#040a02', 900, 'botanical'
  ),
  // ── PSYCHEDELIC MANDALA — vivid symmetry ──
  preset(
    'Psychedelic Mandala',
    { structure:0.55, flow:0.62, entropy:0.32, memory:0.70,
      contrast:0.60, symmetry:0.98, glyphness:0.35, erosion:0.20,
      layering:0.88, rhythm:0.55, fragmentation:0.15, coherence:0.82 },
    ['#ff2020', '#ff8800', '#ffff00', '#00ff80', '#0080ff', '#8000ff'],
    '#040008', 800, 'ecstasy'
  ),
  // ── AURORA BOREALIS — flowing light curtains ──
  preset(
    'Aurora Borealis',
    { structure:0.12, flow:0.88, entropy:0.28, memory:0.82,
      contrast:0.30, symmetry:0.05, glyphness:0.0, erosion:0.10,
      layering:0.95, rhythm:0.25, fragmentation:0.08, coherence:0.78 },
    ['#00ffc0', '#0080ff', '#8000ff', '#00ff80', '#40c8ff'],
    '#000810', 700, 'ascension'
  ),
  // ── INK STORM — chaotic black on white ──
  preset(
    'Ink Storm',
    { structure:0.28, flow:0.78, entropy:0.55, memory:0.52,
      contrast:0.90, symmetry:0.0, glyphness:0.08, erosion:0.40,
      layering:0.72, rhythm:0.80, fragmentation:0.58, coherence:0.42 },
    ['#0a0a0a', '#1a1a1a', '#888888', '#cccccc'],
    '#f2f0ec', 1000, 'conflict'
  ),
  // ── PRISM SCATTER — rainbow fragmented ──
  preset(
    'Prism Scatter',
    { structure:0.15, flow:0.72, entropy:0.55, memory:0.55,
      contrast:0.80, symmetry:0.0, glyphness:0.0, erosion:0.35,
      layering:0.88, rhythm:0.62, fragmentation:0.65, coherence:0.48 },
    ['#ff0040', '#ff8000', '#ffff00', '#00ff80', '#00aaff', '#8800ff'],
    '#0a0008', 1100, 'ecstasy'
  ),
  // ── SLOW FOG — extremely slow, misty ──
  preset(
    'Slow Fog',
    { structure:0.04, flow:0.18, entropy:0.20, memory:0.98,
      contrast:0.15, symmetry:0.0, glyphness:0.0, erosion:0.02,
      layering:0.98, rhythm:0.08, fragmentation:0.08, coherence:0.92 },
    ['#aac8e0', '#d0e8f0', '#80a8c0', '#e8f0f8'],
    '#e8f0f8', 700, 'silence'
  ),
  // ── GLITCH DIGITAL — digital error, noise stripes ──
  preset(
    'Glitch',
    { structure:0.15, flow:0.65, entropy:0.95, memory:0.18,
      contrast:0.95, symmetry:0.0, glyphness:0.0, erosion:0.78,
      layering:0.60, rhythm:0.92, fragmentation:0.98, coherence:0.12,
      linear:0.72 },
    ['#ff00ff', '#00ffff', '#ffffff', '#000000', '#ff4400'],
    '#050505', 1200, 'glitch'
  ),
  // ── ANCIENT SCRIPT — glyph-heavy, warm paper ──
  preset(
    'Ancient Script',
    { structure:0.32, flow:0.40, entropy:0.12, memory:0.90,
      contrast:0.62, symmetry:0.08, glyphness:0.98, erosion:0.08,
      layering:0.80, rhythm:0.28, fragmentation:0.15, coherence:0.75 },
    ['#8b6914', '#3d2a04', '#c8a84b', '#5c3d10', '#e0c88a'],
    '#f5edd8', 600, 'gravity'
  ),
  // ── MARBLE VEINS — flowing grey/blue, organic striation ──
  preset(
    'Marble Veins',
    { structure:0.35, flow:0.55, entropy:0.22, memory:0.78,
      contrast:0.65, symmetry:0.05, glyphness:0.0, erosion:0.15,
      layering:0.85, rhythm:0.28, fragmentation:0.55, coherence:0.60 },
    ['#c8c8c8', '#888888', '#e8e8f0', '#9090a8', '#6060a0'],
    '#f8f8ff', 800
  ),
  // ── CRYSTALLINE LATTICE — ultra-structured, symmetric, linear ──
  preset(
    'Crystalline Lattice',
    { structure:0.95, flow:0.20, entropy:0.03, memory:0.90,
      contrast:0.78, symmetry:0.75, glyphness:0.0, erosion:0.55,
      layering:0.25, rhythm:0.80, fragmentation:0.05, coherence:0.98,
      linear:0.9, agentShape:'diamond' },
    ['#a0d8ff', '#60a8e0', '#ffffff', '#204060'],
    '#020810', 600, 'harmony'
  ),
  // ── CORAL REEF — organic, warm, layered ──
  preset(
    'Coral Reef',
    { structure:0.22, flow:0.48, entropy:0.18, memory:0.88,
      contrast:0.50, symmetry:0.12, glyphness:0.15, erosion:0.08,
      layering:0.90, rhythm:0.30, fragmentation:0.22, coherence:0.82 },
    ['#ff6050', '#ff9070', '#ffb090', '#40c0a0', '#20a080', '#ff4040'],
    '#020e0c', 900, 'harmony'
  ),
  // ── WABI-SABI — Japanese minimal, muted, sparse ──
  preset(
    'Wabi-Sabi',
    { structure:0.12, flow:0.30, entropy:0.08, memory:0.96,
      contrast:0.40, symmetry:0.0, glyphness:0.0, erosion:0.04,
      layering:0.98, rhythm:0.12, fragmentation:0.10, coherence:0.95 },
    ['#8a7060', '#c0a888', '#403028', '#d8c8b0', '#f0e8d8'],
    '#f4efe8', 350, 'minimal'
  ),
  // ── VOID STATIC — white noise / digital texture ──
  preset(
    'Void Static',
    { structure:0.18, flow:0.52, entropy:0.90, memory:0.12,
      contrast:0.95, symmetry:0.0, glyphness:0.0, erosion:0.65,
      layering:0.55, rhythm:0.70, fragmentation:0.90, coherence:0.18 },
    ['#ffffff', '#cccccc', '#888888', '#000000'],
    '#000000', 900
  ),
  // ── NEON PLASMA — electric, vivid, swirling ──
  preset(
    'Neon Plasma',
    { structure:0.22, flow:0.82, entropy:0.45, memory:0.60,
      contrast:0.70, symmetry:0.72, glyphness:0.0, erosion:0.25,
      layering:0.90, rhythm:0.65, fragmentation:0.30, coherence:0.68 },
    ['#ff0080', '#8000ff', '#00ffff', '#ff8000'],
    '#010006', 800, 'ecstasy'
  ),
];

// ── GEO PRESETS — Geometric/Constructive mode DNA ─────────────────────────────
export const GEO_PRESETS: DNA[] = [
  preset(
    'Constructive Score',
    { structure:0.90, flow:0.35, entropy:0.08, memory:0.70,
      contrast:0.88, symmetry:0.05, glyphness:0.0, erosion:0.40,
      layering:0.55, rhythm:0.55, fragmentation:0.12, coherence:0.82,
      linear:0.80, agentShape:'square' },
    ['#e8e8e4', '#c0c0b8', '#404040', '#808080', '#1a1a1a'],
    '#0a0a0a', 800
  ),
  preset(
    'Geometric Orchestra',
    { structure:0.55, flow:0.60, entropy:0.22, memory:0.75,
      contrast:0.70, symmetry:0.18, glyphness:0.0, erosion:0.20,
      layering:0.82, rhythm:0.45, fragmentation:0.20, coherence:0.75 },
    ['#0080ff', '#8040ff', '#00c8ff', '#ff4080', '#40ffcc'],
    '#020510', 900
  ),
  preset(
    'Analytical Collage',
    { structure:0.60, flow:0.28, entropy:0.18, memory:0.55,
      contrast:0.75, symmetry:0.0, glyphness:0.0, erosion:0.50,
      layering:0.70, rhythm:0.35, fragmentation:0.45, coherence:0.60,
      agentShape:'square' },
    ['#e8d5b0', '#b88040', '#402010', '#c0a060', '#f0e8d0', '#805020'],
    '#f5f0e8', 700
  ),
  preset(
    'Spiritual Geometry',
    { structure:0.30, flow:0.22, entropy:0.06, memory:0.95,
      contrast:0.60, symmetry:0.40, glyphness:0.0, erosion:0.05,
      layering:0.92, rhythm:0.18, fragmentation:0.05, coherence:0.95 },
    ['#e8e0c8', '#b0a878', '#404030', '#d8d0a0'],
    '#08080a', 350
  ),
];

// ── Generate a completely random DNA ─────────────────────────────────────────
export function generateFullyRandomDNA(): DNA {
  const r = Math.random;
  // Only randomize between the two "universal" shapes (circle, brush) — geometric shapes are intentional choices
  const shapes: import('./metaArtTypes').AgentShape[] = ['circle', 'brush'];
  const intentions: Intention[] = [
    'ascension','gravity','conflict','harmony','ecstasy','silence',
    'mondrian','suprematist','action','minimal','glitch','botanical','constellation','none',
  ];

  // Randomly pick extreme or moderate values — avoid clustering in 0.3-0.7
  const extreme = (lo: number, hi: number) => lo + r() * (hi - lo);

  const linear = r() > 0.5 ? extreme(0.6, 1.0) : extreme(0, 0.3);
  const useShape = r() > 0.4;

  const genes: DNAGenes = {
    structure:     r() > 0.5 ? extreme(0.65, 1.0) : extreme(0, 0.35),
    flow:          r() > 0.4 ? extreme(0.5, 1.0)  : extreme(0, 0.3),
    entropy:       r() > 0.5 ? extreme(0.6, 1.0)  : extreme(0, 0.25),
    memory:        extreme(0.1, 1.0),
    contrast:      r() > 0.4 ? extreme(0.65, 1.0) : extreme(0.05, 0.4),
    symmetry:      r() > 0.6 ? extreme(0.6, 1.0)  : extreme(0, 0.2),
    glyphness:     r() > 0.7 ? extreme(0.5, 1.0)  : extreme(0, 0.15),
    erosion:       extreme(0.02, 0.9),
    layering:      extreme(0.2, 1.0),
    rhythm:        extreme(0.05, 1.0),
    fragmentation: r() > 0.5 ? extreme(0.65, 1.0) : extreme(0, 0.3),
    coherence:     r() > 0.5 ? extreme(0.65, 1.0) : extreme(0.1, 0.45),
    linear,
    agentShape: useShape ? shapes[Math.floor(r() * shapes.length)] : 'circle',
  };

  const intention = intentions[Math.floor(r() * intentions.length)];
  const bg = r() > 0.55 ? darkBackground() : lightBackground();

  return {
    id: newDNAId(),
    name: 'Random',
    genes,
    intention,
    palette: generateRandomPalette(4 + Math.floor(r() * 4)),
    background: bg,
    quantaCount: Math.floor(350 + r() * 900),
    createdAt: Date.now(),
  };
}

function darkBackground(): string {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * 25);
  const l = Math.floor(2 + Math.random() * 10);
  return hslToHex(h, s, l);
}

function lightBackground(): string {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * 18);
  const l = Math.floor(88 + Math.random() * 10);
  return hslToHex(h, s, l);
}

export function lerpGenes(a: DNAGenes, b: DNAGenes, t: number): DNAGenes {
  const out: Partial<DNAGenes> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof DNAGenes>;
  for (const k of keys) {
    if (k === 'agentShape') { out[k] = t < 0.5 ? a[k] : b[k]; continue; }
    const av = (a[k] ?? 0) as number;
    const bv = (b[k] ?? 0) as number;
    if (a[k] === undefined && b[k] === undefined) continue;
    (out as Record<string, number>)[k as string] = av * (1 - t) + bv * t;
  }
  return out as DNAGenes;
}

// ── Fully random palette generator ───────────────────────────────────────────
function hslToHex(h: number, s: number, l: number): string {
  l /= 100; s /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function generateRandomPalette(count = 6): string[] {
  const base = Math.random() * 360;
  const scheme = Math.random();
  const palette: string[] = [];

  // Choose whether dark or light key
  const isDark = Math.random() > 0.45;
  const litLo  = isDark ? 20 : 45;
  const litHi  = isDark ? 60 : 85;

  for (let i = 0; i < count; i++) {
    let hue: number;
    if (scheme < 0.15)      hue = (base + i * 12) % 360;                     // monochromatic
    else if (scheme < 0.30) hue = (base + (i % 2 ? 180 : 0) + i * 6) % 360; // complementary
    else if (scheme < 0.50) hue = (base + (i % 3) * 120 + i * 4) % 360;      // triadic
    else if (scheme < 0.65) hue = (base + (i % 4) * 90) % 360;               // tetradic
    else if (scheme < 0.80) hue = (base + (i % 2) * 150 + i * 8) % 360;      // split-comp
    else                    hue = (base + i / count * 360) % 360;             // rainbow

    // Occasionally add an accent with very different saturation/lightness
    const sat = i === count - 1 && Math.random() > 0.5
      ? 10 + Math.random() * 20          // near-neutral accent
      : 55 + Math.random() * 40;
    const lit = litLo + Math.random() * (litHi - litLo);
    palette.push(hslToHex((hue + 360) % 360, sat, lit));
  }
  return palette;
}

// ── Hue-rotate an existing palette (for mutation) ─────────────────────────────
export function randomizePalette(base: string[], rng: () => number): string[] {
  const hueShift = (rng() * 80 - 40 + 360) % 360;
  return base.map(hex => {
    // Parse to HSL, rotate hue, convert back
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0; const d = max - min;
    const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
        case g: h = ((b - r) / d + 2) * 60; break;
        case b: h = ((r - g) / d + 4) * 60; break;
      }
    }
    return hslToHex((h + hueShift) % 360, s * 100, l * 100);
  });
}