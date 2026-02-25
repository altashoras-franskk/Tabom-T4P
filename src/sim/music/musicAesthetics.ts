import type { CanvasPalette, MusicAesthetic, MusicVisualPreset } from './musicTypes';

export const DEFAULT_MUSIC_AESTHETIC: MusicAesthetic = {
  canvas: {
    bgStyle: 'radial',
    grain: 0.55,
    vignette: 0.45,
  },
  quanta: {
    shape: 'circle',
    baseSize: 1.0,
    glow: 0.65,
    outline: 0.15,
  },
  trails: {
    enabled: false,
    style: 'line',
    persistence: 0.55,
    width: 1.0,
    blur: 0.15,
    blend: 'screen',
  },
  connections: {
    enabled: true,
    width: 0.8,
    alpha: 0.35,
    blend: 'screen',
  },
  tools: {
    intensity: 0.85,
    labels: true,
  },
  post: {
    bloom: 0.25,
    chroma: 0.0,
  },
  overlays: {
    showAnnotations: true,
    showHitFlashes: true,
  },
  threeD: {
    fog: 0.55,
    exposure: 1.3,
    emissive: 0.65,
    overlays: true,
  },
};

const P = (p: Partial<CanvasPalette>): Partial<CanvasPalette> => p;
const A = (a: Partial<MusicAesthetic>): Partial<MusicAesthetic> => a;

export const MUSIC_VISUAL_PRESETS: MusicVisualPreset[] = [
  {
    id: 'meta-lite',
    name: 'Meta-Lite',
    description: 'Camadas suaves, glow controlado, vibe Meta-Arte sem pesar.',
    palette: P({ mode: 'plasma', bgColor: '#04060a', accent: '#ff0084' }),
    aesthetic: A({
      canvas: { bgStyle: 'radial', grain: 0.75, vignette: 0.55 },
      trails: { enabled: false, persistence: 0.72, blur: 0.25, blend: 'screen' },
      post: { bloom: 0.35 },
      connections: { alpha: 0.42, width: 0.85, blend: 'screen' },
      quanta: { glow: 0.75, outline: 0.10 },
    }),
  },
  {
    id: 'neon-noir',
    name: 'Neon Noir',
    description: 'Alto contraste, neon limpo, barras e campos com presença.',
    palette: P({ mode: 'neon', bgColor: '#020208', accent: '#00d4ff' }),
    aesthetic: A({
      canvas: { bgStyle: 'solid', grain: 0.35, vignette: 0.65 },
      trails: { enabled: false, persistence: 0.52, width: 1.1, blur: 0.08, blend: 'lighter' },
      post: { bloom: 0.18 },
      connections: { alpha: 0.30, blend: 'lighter' },
      quanta: { glow: 0.9, outline: 0.22 },
      tools: { intensity: 1.05 },
      threeD: { fog: 0.6, exposure: 1.45, emissive: 0.8, overlays: true },
    }),
  },
  {
    id: 'ink-paper',
    name: 'Ink / Paper',
    description: 'Traço orgânico, fundo claro, estética editorial.',
    palette: P({ mode: 'mono', bgColor: '#f6f3ea', accent: '#111111' }),
    aesthetic: A({
      canvas: { bgStyle: 'solid', grain: 0.22, vignette: 0.12 },
      trails: { enabled: false, persistence: 0.82, width: 0.9, blur: 0.0, blend: 'multiply' },
      connections: { alpha: 0.18, blend: 'multiply', width: 0.7 },
      quanta: { shape: 'diamond', glow: 0.05, outline: 0.55 },
      tools: { intensity: 0.55, labels: false },
      post: { bloom: 0.0 },
      overlays: { showAnnotations: false, showHitFlashes: false },
      threeD: { fog: 0.15, exposure: 1.0, emissive: 0.1, overlays: false },
    }),
  },
  {
    id: 'ritual-aurora',
    name: 'Ritual Aurora',
    description: 'Neblina + rastros longos; campos viram pintura.',
    palette: P({ mode: 'earth', bgColor: '#02050a', accent: '#ffd700' }),
    aesthetic: A({
      canvas: { bgStyle: 'radial', grain: 0.62, vignette: 0.58 },
      trails: { enabled: false, persistence: 0.88, width: 1.2, blur: 0.35, blend: 'screen' },
      connections: { alpha: 0.55, width: 1.0, blend: 'screen' },
      quanta: { shape: 'spark', glow: 0.85, outline: 0.05 },
      post: { bloom: 0.45, chroma: 0.12 },
      tools: { intensity: 0.95 },
      threeD: { fog: 0.7, exposure: 1.25, emissive: 0.7, overlays: true },
    }),
  },
];

const VISUAL_MAP = new Map(MUSIC_VISUAL_PRESETS.map(v => [v.id, v]));
export function getMusicVisualPreset(id: string): MusicVisualPreset | undefined {
  return VISUAL_MAP.get(id);
}

