import type {
  CanvasPalette,
  MusicAesthetic,
  MusicPreset,
  MusicState,
  PhysicsParams,
  RoleConfig,
  Scale,
  VoiceRole,
} from '../sim/music/musicTypes';

import type { DNA, GeoParams, OverlayFlags } from '../sim/metaart/metaArtTypes';

export const MUSIC_METAART_SNAPSHOT_KEY = 't4p_musiclab_metaart_snapshot_v1';

export interface MusicLabSnapshotV1 {
  v: 1;
  ts: number;
  preset: Pick<MusicPreset,
    | 'id' | 'name' | 'tags' | 'intensity'
    | 'bpm' | 'scale' | 'root'
    | 'reverbAmt' | 'delayAmt' | 'delayTime'
    | 'primary' | 'secondary' | 'accent'
    | 'lens'
  > & {
    harmonyMode?: string;
    eventRate?: number;
  };
  palette: CanvasPalette;
  aesthetic: MusicAesthetic;
  phys: PhysicsParams;
  roleOverrides: Partial<Record<VoiceRole, Partial<RoleConfig>>>;
  // Minimal scene summary (for “cover” mapping)
  scene: {
    quantaCount: number;
    roles: Partial<Record<VoiceRole, number>>; // counts
    roleEnergy: Partial<Record<VoiceRole, number>>;
    gates: number;
    attractors: number;
    channels: number;
    rails: number;
    tunnels: number;
    cages: number;
    strings: number;
    fxZones: number;
    sequencerOn: boolean;
    fxKinds: Record<string, number>;
  };
}

export function captureMusicSnapshotV1(args: {
  state: MusicState;
  preset: MusicPreset;
  palette: CanvasPalette;
  aesthetic: MusicAesthetic;
  phys: PhysicsParams;
  roleOverrides: Partial<Record<VoiceRole, Partial<RoleConfig>>>;
}): MusicLabSnapshotV1 {
  const { state, preset, palette, aesthetic, phys, roleOverrides } = args;
  const rolesCount: Partial<Record<VoiceRole, number>> = {};
  for (const q of state.quanta) rolesCount[q.role] = (rolesCount[q.role] ?? 0) + 1;

  const fxKinds: Record<string, number> = {};
  for (const z of (state.fxZones ?? [])) fxKinds[z.effect] = (fxKinds[z.effect] ?? 0) + 1;

  return {
    v: 1,
    ts: Date.now(),
    preset: {
      id: preset.id,
      name: preset.name,
      tags: preset.tags,
      intensity: preset.intensity,
      bpm: preset.bpm,
      scale: preset.scale,
      root: preset.root,
      reverbAmt: preset.reverbAmt,
      delayAmt: preset.delayAmt,
      delayTime: preset.delayTime,
      primary: preset.primary,
      secondary: preset.secondary,
      accent: preset.accent,
      lens: preset.lens,
      harmonyMode: (preset as any).harmonyMode,
      eventRate: (preset as any).eventRate,
    },
    palette,
    aesthetic,
    phys,
    roleOverrides,
    scene: {
      quantaCount: state.count,
      roles: rolesCount,
      roleEnergy: state.roleEnergy ?? {},
      gates: state.gates?.length ?? 0,
      attractors: state.attractors?.length ?? 0,
      channels: state.channels?.length ?? 0,
      rails: state.rails?.length ?? 0,
      tunnels: state.tunnels?.length ?? 0,
      cages: state.cages?.length ?? 0,
      strings: state.strings?.length ?? 0,
      fxZones: state.fxZones?.length ?? 0,
      sequencerOn: !!state.sequencer?.active,
      fxKinds,
    },
  };
}

export function saveMusicSnapshotToStorage(snap: MusicLabSnapshotV1): void {
  try {
    localStorage.setItem(MUSIC_METAART_SNAPSHOT_KEY, JSON.stringify(snap));
  } catch {
    // ignore quota errors
  }
}

export function loadMusicSnapshotFromStorage(): MusicLabSnapshotV1 | null {
  try {
    const raw = localStorage.getItem(MUSIC_METAART_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MusicLabSnapshotV1;
    if (!parsed || parsed.v !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function paletteFromMusic(s: MusicLabSnapshotV1): { palette: string[]; background: string } {
  const bg = s.palette?.bgColor ?? s.preset.secondary ?? '#000000';
  const cols: string[] = [];
  const push = (c?: string) => { if (c && /^#[0-9a-fA-F]{6}$/.test(c) && !cols.includes(c)) cols.push(c); };
  push(s.preset.primary);
  push(s.preset.accent);
  push(s.preset.secondary);
  push(s.palette?.accent);
  // include a few role overrides for “orchestral covers”
  if (s.palette?.roleColorOverrides) {
    for (const c of Object.values(s.palette.roleColorOverrides)) push(c);
  }
  if (cols.length < 3) cols.push('#ffffff', '#00d4ff', '#ff0084');
  return { palette: cols.slice(0, 6), background: bg };
}

function inferIntention(tags: string[] | undefined): DNA['intention'] {
  const t = new Set((tags ?? []).map(String));
  if (t.has('Techno') || t.has('Club') || t.has('Rave') || t.has('Breakbeat')) return 'ecstasy';
  if (t.has('Ambient') || t.has('Meditative') || t.has('Drone')) return 'silence';
  if (t.has('Glitch')) return 'glitch';
  if (t.has('Minimalist') || t.has('Minimalist')) return 'minimal';
  if (t.has('Orchestral') || t.has('Choral') || t.has('Strings')) return 'harmony';
  return 'none';
}

export function musicSnapshotToMetaArtConfig(s: MusicLabSnapshotV1): {
  dna: DNA;
  geo: GeoParams;
  overlays: OverlayFlags;
  seed: number;
} {
  const { palette, background } = paletteFromMusic(s);

  // Scene-derived macros
  const density = clamp01((s.scene.quantaCount ?? 0) / 160);
  const structure = clamp01(((s.scene.gates + s.scene.rails + s.scene.cages) / 16) * 0.9);
  const atmosphere = clamp01(lerp(s.preset.reverbAmt ?? 0.3, 1, 0.25) * 0.9);
  const gesture = clamp01(((s.phys.alignment ?? 0.8) / 2) * 0.65 + (s.scene.channels > 0 ? 0.25 : 0));
  const contrast = clamp01((s.preset.intensity ?? 2) / 5 * 0.65 + (s.palette?.mode === 'mono' ? 0.15 : 0.35));
  const rhythm = clamp01(((s.preset.bpm ?? 90) - 40) / 140 * 0.55 + clamp01((s.preset.eventRate ?? 0.6) / 2.5) * 0.45);
  const entropy = clamp01((s.phys.turbulence ?? 0.2) * 0.75 + (Object.keys(s.scene.fxKinds ?? {}).includes('glitch') ? 0.25 : 0));
  const memory = clamp01(s.aesthetic?.trails?.persistence ?? 0.55);

  const seed = (s.ts ^ (s.scene.quantaCount << 5) ^ ((s.preset.bpm ?? 0) << 1)) >>> 0;

  const dna: DNA = {
    id: `musiclab_${s.preset.id}_${s.ts}`,
    createdAt: Date.now(),
    name: `Capa · ${s.preset.name}`,
    intention: inferIntention(s.preset.tags),
    background,
    palette,
    quantaCount: Math.round(380 + density * 900),
    genes: {
      structure,
      flow: gesture,
      entropy,
      memory,
      contrast,
      symmetry: clamp01((s.scene.sequencerOn ? 0.4 : 0.2) + (s.preset.scale === 'whole_tone' ? 0.1 : 0)),
      glyphness: clamp01(0.15 + (s.scene.tunnels > 0 ? 0.20 : 0) + (s.scene.fxKinds['harmonize_zone'] ? 0.15 : 0)),
      erosion: clamp01(0.15 + (s.scene.fxKinds['mute'] ? 0.20 : 0)),
      layering: clamp01(0.25 + (s.scene.fxZones > 1 ? 0.25 : 0) + atmosphere * 0.2),
      rhythm,
      fragmentation: clamp01(0.10 + (s.scene.tunnels > 0 ? 0.2 : 0) + (s.scene.fxKinds['scatter_zone'] ? 0.2 : 0)),
      coherence: clamp01(0.35 + (s.preset.harmonyMode === 'consonant' ? 0.25 : s.preset.harmonyMode === 'dissonant' ? -0.1 : 0)),
      linear: clamp01(0.15 + (s.scene.channels > 0 ? 0.2 : 0) + (s.phys.migrationX || s.phys.migrationY ? 0.15 : 0)),
    },
  };

  const geo: GeoParams = {
    mode: 'hybrid',
    macroStructure: structure,
    macroGesture: gesture,
    macroContrast: contrast,
    macroSilence: clamp01(1 - (rhythm * 0.8 + density * 0.2)),
    macroAtmosphere: clamp01(atmosphere * 0.85 + memory * 0.15),
    macroCollage: clamp01(0.12 + (s.scene.fxZones > 0 ? 0.25 : 0) + entropy * 0.15),
    snapAxes: 0.12,
    gridStrength: clamp01(structure * 0.65),
    gridSize: 0.35,
    lineMastery: clamp01(0.18 + structure * 0.55),
    planeCasting: clamp01(0.15 + atmosphere * 0.55),
    cutWindows: clamp01(0.05 + entropy * 0.35),
    mixPoint: clamp01(0.55 - structure * 0.15),
    mixLine: clamp01(0.25 + structure * 0.35),
    mixRect: clamp01(0.08 + structure * 0.25),
    mixArc: clamp01(0.06 + gesture * 0.30),
    mixPlane: clamp01(0.06 + atmosphere * 0.25),
    shapeOpacity: clamp01(0.25 + atmosphere * 0.35),
    fillSolidity: clamp01(0.25 + contrast * 0.45),
    strokeWeight: lerp(0.35, 1.6, structure),
    shapeScale: lerp(0.7, 1.6, gesture),
    rotationDrift: clamp01(entropy * 0.65),
    vignetteStr: clamp01(0.15 + contrast * 0.55),
    grainStr: clamp01(0.15 + (s.aesthetic?.canvas?.grain ?? 0.5) * 0.65),
    bloomShape: clamp01(0.12 + (s.aesthetic?.post?.bloom ?? 0.25) * 0.65),
    zDepth: clamp01(0.35 + structure * 0.55),
    orbitSpeed: clamp01(0.25 + rhythm * 0.55),
    camFOV: 55,
    depthFog: clamp01(0.15 + atmosphere * 0.65),
    light3D: clamp01(0.35 + contrast * 0.45),
    particleSize3D: lerp(0.7, 1.5, density),
    glowIntensity3D: clamp01(0.25 + (s.aesthetic?.quanta?.glow ?? 0.65) * 0.65),
    waveZ: clamp01(0.2 + rhythm * 0.6),
    showGeoShapes: true,
    solidShapes3D: false,
    trails3D: true,
    trailLength3D: lerp(1, 4.5, memory),
    boundaryMode: 'wrap',
    showBorder: false,
  };

  const overlays: OverlayFlags = {
    connections: (s.aesthetic?.connections?.enabled ?? true) && (s.scene.quantaCount ?? 0) <= 220,
    glow: (s.aesthetic?.post?.bloom ?? 0) > 0.15,
    pulse: (s.scene.sequencerOn || rhythm > 0.55),
  };

  return { dna, geo, overlays, seed };
}

export function scaleLabel(scale: Scale): string {
  const m: Record<Scale, string> = {
    major: 'Major',
    minor: 'Minor',
    pentatonic: 'Penta',
    blues: 'Blues',
    dorian: 'Dorian',
    phrygian: 'Phrygian',
    lydian: 'Lydian',
    mixolydian: 'Mixo',
    whole_tone: 'Whole',
    harmonic_minor: 'H.Min',
    chromatic: 'Chrom',
  };
  return m[scale] ?? String(scale);
}

