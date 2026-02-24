// ─── Meta-Arte: Geometric Engine ─────────────────────────────────────────────
// Gestalt compositor + kind assignment + geo forces
// Additive on top of the ALife engine — does not replace it.
import type { Quantum, GeoParams, QuantumKind } from './metaArtTypes';

// ── Default geo params ────────────────────────────────────────────────────────
export function createDefaultGeoParams(): GeoParams {
  return {
    mode: 'fluid',
    macroStructure:  0.0,
    macroGesture:    0.28,  // reduced: prevents uncontrolled shape velocity
    macroContrast:   0.5,
    macroSilence:    0.0,
    macroAtmosphere: 0.0,
    macroCollage:    0.0,
    snapAxes:        0.0,
    gridStrength:    0.0,
    gridSize:        40,
    lineMastery:     0.0,
    planeCasting:    0.0,
    cutWindows:      0.0,
    mixPoint: 0.3,
    mixLine:  0.3,
    mixRect:  0.2,
    mixArc:   0.1,
    mixPlane: 0.1,
    // Composition / FX / DNA coupling — safe defaults
    shapeOpacity:  0.85,
    fillSolidity:  0.35,
    strokeWeight:  1.0,
    shapeScale:    1.0,
    rotationDrift: 0.0,
    vignetteStr:   0.0,
    grainStr:      0.0,
    bloomShape:    0.0,
    // 3D mode defaults
    zDepth:          1.0,
    orbitSpeed:      0.2,
    camFOV:          55,
    depthFog:        0.3,
    light3D:         0.5,
    particleSize3D:  1.0,
    glowIntensity3D: 0.55,
    waveZ:           0.3,
    // Shape physics defaults (optional fields — backward compat)
    showGeoShapes:   true,
    solidShapes3D:   false,
    shapeGravity:    0.0,
    angleDamping:    0.0,
    // Canvas boundary
    boundaryMode:    'wrap',
    showBorder:      false,
    // 3D overlays
    trails3D:        false,
    trailLength3D:   3,
  };
}

// ── Sync derived advanced params from the 6 macros ───────────────────────────
export function syncDerivedParams(p: GeoParams): void {
  p.snapAxes      = Math.min(1, p.macroStructure * 1.2);
  p.gridStrength  = Math.min(1, p.macroStructure * 0.9);
  p.lineMastery   = Math.min(1, p.macroStructure * 0.7 + p.macroContrast * 0.3);
  p.planeCasting  = Math.min(1, p.macroCollage * 0.8 + p.macroSilence * 0.2);
  p.cutWindows    = Math.min(1, p.macroCollage * 0.6);
}

// ── Assign kind to every quantum based on primitiveMix ───────────────────────
// Stable: assignment is based on quantum index so it doesn't flicker each call.
export function assignKindByGeoParams(quanta: Quantum[], params: GeoParams): void {
  const total = quanta.length;
  if (total === 0) return;

  // How many gradient emitters (atmosphere)
  const numEmitters = Math.max(0, Math.min(8, Math.round(params.macroAtmosphere * 6)));

  // Normalise mix
  const rawSum = params.mixPoint + params.mixLine + params.mixRect + params.mixArc + params.mixPlane;
  const s = rawSum > 0 ? rawSum : 1;
  const cP = params.mixPoint / s;
  const cL = cP + params.mixLine  / s;
  const cR = cL + params.mixRect  / s;
  const cA = cR + params.mixArc   / s;

  const remainder = total - numEmitters;

  for (let i = 0; i < total; i++) {
    const q = quanta[i];

    // Reserve first numEmitters quanta (most-aged) as gradient emitters
    if (i < numEmitters) {
      q.kind = 'gradientEmitter';
      if (q.qscale === undefined) q.qscale = 1.5 + Math.random() * 2.5;
      continue;
    }

    const frac = remainder > 0 ? (i - numEmitters) / remainder : 0;
    let kind: QuantumKind;
    if      (frac < cP) kind = 'point';
    else if (frac < cL) kind = 'line';
    else if (frac < cR) kind = 'rect';
    else if (frac < cA) kind = 'arc';
    else                kind = 'plane';

    q.kind = kind;

    // Initialise geo fields once — generous sizes so shapes are immediately visible
    if (q.angle === undefined) {
      q.angle = Math.atan2(q.vy, q.vx) + (Math.random() - 0.5) * 0.3;
    }
    if (q.qscale === undefined) q.qscale = 1.2 + Math.random() * 2.0;  // bigger default scale

    if (kind === 'line' && q.length === undefined) {
      q.length = 30 + Math.random() * 80;   // longer lines by default
    }
    if (kind === 'arc' && q.length === undefined) {
      q.length = 16 + Math.random() * 40;   // radius — visible arc
    }
    if (kind === 'rect' && q.thickness === undefined) {
      q.thickness = 1.0 + Math.random() * 2.0;  // visible border
    }
    if (kind === 'plane' && q.fillAlpha === undefined) {
      q.fillAlpha = 0.25 + Math.random() * 0.25;  // solid enough to see
    }
    if (kind === 'rect' && q.fillAlpha === undefined) {
      q.fillAlpha = 0.0;  // rect is outline-only by default
    }
  }
}

// ── Strip geo kind (reset to point) ─────────────────────────────────────────
export function clearGeoKinds(quanta: Quantum[]): void {
  for (const q of quanta) {
    q.kind      = undefined;
    q.angle     = undefined;
    q.qscale    = undefined;
    q.length    = undefined;
    q.thickness = undefined;
    q.fillAlpha = undefined;
    q.qBlend    = undefined;
  }
}

// ── Per-frame geometric forces ────────────────────────────────────────────────
// Kind-aware micro-forces applied AFTER the standard ALife update.
export function applyGeometricForces(
  quanta: Quantum[],
  params: GeoParams,
  W: number, H: number,
): void {
  const snapStr  = params.snapAxes * 0.12;
  const gridStr  = params.gridStrength * 0.08;
  const gridN    = params.gridSize / Math.max(W, H); // grid step in normalised coords
  const silExtra = params.macroSilence * 0.004;      // extra repulsion in silence mode
  const drift    = (params.rotationDrift ?? 0) * 0.0008; // slow angular drift

  // ── Gesture-driven physics ──────────────────────────────────────────────────
  // macroGesture (0..1) controls both how fast shapes track their velocity direction
  // AND adds autonomous movement noise so shapes visibly move even with low DNA flow.
  const gesture     = params.macroGesture ?? 0.5;
  const trackStr    = 0.012 + gesture * 0.055;   // angle tracking speed — tamed
  const gNoise      = gesture * 0.0012;           // autonomous velocity noise — tamed
  const angDamp     = params.angleDamping ?? 0;   // 0=track fast, 1=frozen orientation
  const effectiveTrack = trackStr * (1 - angDamp * 0.85);

  // Centre attraction for geo shapes (pulls shapes toward canvas centre)
  const gravity  = (params.shapeGravity ?? 0) * 0.0006;

  for (const q of quanta) {
    const kind = q.kind;

    // ── 1. Angle tracking — angle follows velocity direction ─────────────────
    if (kind === 'line' || kind === 'rect' || kind === 'arc' || kind === 'plane') {
      const speed = Math.sqrt(q.vx * q.vx + q.vy * q.vy);
      if (speed > 0.00005) {
        const targetAngle = Math.atan2(q.vy, q.vx);
        const cur = q.angle ?? 0;
        let diff = targetAngle - cur;
        while (diff >  Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        q.angle = cur + diff * effectiveTrack;
      }
      // Rotation drift — cosmological slow spin
      if (drift > 0) {
        q.angle = ((q.angle ?? 0) + drift * (q.species % 2 === 0 ? 1 : -1));
      }
    }

    // ── 2. Autonomous gesture movement noise (all non-point, non-emitter) ────
    if (gNoise > 0.0001 && kind !== 'gradientEmitter' && kind !== 'point' && kind !== undefined) {
      q.vx += (Math.random() - 0.5) * gNoise;
      q.vy += (Math.random() - 0.5) * gNoise;
    }

    // ── 3. Centre gravity ─────────────────────────────────────────────────────
    if (gravity > 0.00001 && kind !== 'gradientEmitter') {
      const dx = 0.5 - q.x;
      const dy = 0.5 - q.y;
      q.vx += dx * gravity;
      q.vy += dy * gravity;
    }

    // ── 4. Snap-to-axes (for lines + rects) ─────────────────────────────────
    if (snapStr > 0.001 && (kind === 'line' || kind === 'rect')) {
      const a    = (q.angle ?? 0);
      const norm = ((a % Math.PI) + Math.PI) % Math.PI; // undirected 0..π
      const targets = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4];
      let best = 0, bestDist = Infinity;
      for (const t of targets) {
        const d = Math.abs(norm - t);
        if (d < bestDist) { bestDist = d; best = t; }
      }
      const delta = best - norm;
      q.angle = (q.angle ?? 0) + delta * snapStr;
    }

    // ── 5. Grid attractor (for rects + planes) ────────────────────────────────
    if (gridStr > 0.001 && gridN > 0.001 && (kind === 'rect' || kind === 'plane')) {
      const snapX = Math.round(q.x / gridN) * gridN;
      const snapY = Math.round(q.y / gridN) * gridN;
      q.vx += (snapX - q.x) * gridStr * 0.3;
      q.vy += (snapY - q.y) * gridStr * 0.3;
    }

    // ── 6. Silence: extra spacing force ─────────────────────────────────────
    if (silExtra > 0 && kind !== 'gradientEmitter') {
      const dx = q.x - 0.5, dy = q.y - 0.5;
      const d  = Math.sqrt(dx * dx + dy * dy) + 0.001;
      q.vx += (dx / d) * silExtra;
      q.vy += (dy / d) * silExtra;
    }

    // ── 7. Line mastery — long lines stay long ───────────────────────────────
    if (kind === 'line' && params.lineMastery > 0.1) {
      const targetLen = 40 + params.lineMastery * 140;
      const cur = q.length ?? 30;
      if (cur < targetLen) q.length = cur + params.lineMastery * 0.4;
    }
  }
}

// ── Gestalt compositor (runs every N frames) ──────────────────────────────────
// Applies structural operators: snap, grid, plane casting.
export function tickGestaltCompositor(
  quanta: Quantum[],
  params: GeoParams,
  _W: number, _H: number,
  tick: number,
): void {
  const budget = 80; // max quanta processed per call
  const n = quanta.length;
  if (n === 0) return;

  // Rotate through quanta with a budget window
  const start = (tick * budget) % n;

  // D) Plane casting — promote aged rects to planes ─────────────────────────
  if (params.planeCasting > 0.15) {
    let promoted = 0;
    for (let i = 0; i < Math.min(budget, n); i++) {
      const q = quanta[(start + i) % n];
      if (q.kind === 'rect' && q.age > 300 && Math.random() < params.planeCasting * 0.03) {
        q.kind      = 'plane';
        q.fillAlpha = (q.fillAlpha ?? 0.06) + 0.02;
        q.qBlend    = params.macroCollage > 0.5 ? 'multiply' : 'screen';
        promoted++;
        if (promoted >= 2) break;
      }
    }
  }

  // E) Cut windows — demote some planes back to rect for turnover ────────────
  if (params.cutWindows > 0.1 && tick % 120 === 0) {
    let cut = 0;
    for (let i = 0; i < n && cut < 2; i++) {
      const q = quanta[(start + i) % n];
      if (q.kind === 'plane' && Math.random() < params.cutWindows * 0.15) {
        q.kind = 'rect'; cut++;
      }
    }
  }

  // A) Line Growth — lengthen master lines ──────────────────────────────────
  if (params.lineMastery > 0.3) {
    let count = 0;
    for (let i = 0; i < n && count < 4; i++) {
      const q = quanta[(start + i) % n];
      if (q.kind === 'line' && q.age > 200) {
        const maxLen = 60 + params.lineMastery * 180;
        if ((q.length ?? 0) < maxLen) {
          q.length = (q.length ?? 20) + params.lineMastery * 1.2;
        }
        count++;
      }
    }
  }
}

// ── Geo-preset factory ────────────────────────────────────────────────────────
export const GEO_PRESET_PARAMS: Record<string, GeoParams> = {
  // ── 1. Constructive Score ─ 80% lines, axes snapped, Mondrian/Malevich feel
  'constructive_score': {
    mode: 'geometric',
    macroStructure: 0.92, macroGesture: 0.35, macroContrast: 0.95,
    macroSilence: 0.60, macroAtmosphere: 0.0, macroCollage: 0.10,
    snapAxes: 0.95, gridStrength: 0.85, gridSize: 48,
    lineMastery: 0.95, planeCasting: 0.05, cutWindows: 0.0,
    mixPoint: 0.02, mixLine: 0.80, mixRect: 0.12, mixArc: 0.04, mixPlane: 0.02,
    shapeOpacity: 0.92, fillSolidity: 0.15, strokeWeight: 1.8, shapeScale: 1.2,
    rotationDrift: 0.0, vignetteStr: 0.25, grainStr: 0.05, bloomShape: 0.0,
    zDepth: 1.0, orbitSpeed: 0.2, camFOV: 55, depthFog: 0.3,
    light3D: 0.5, particleSize3D: 1.0, glowIntensity3D: 0.55, waveZ: 0.3,
  },
  // ── 2. Geometric Orchestra ─ 70% arcs + circles, hybrid energy + shapes
  'geometric_orchestra': {
    mode: 'hybrid',
    macroStructure: 0.30, macroGesture: 0.70, macroContrast: 0.85,
    macroSilence: 0.10, macroAtmosphere: 0.20, macroCollage: 0.15,
    snapAxes: 0.20, gridStrength: 0.10, gridSize: 32,
    lineMastery: 0.20, planeCasting: 0.10, cutWindows: 0.05,
    mixPoint: 0.08, mixLine: 0.10, mixRect: 0.08, mixArc: 0.70, mixPlane: 0.04,
    shapeOpacity: 0.80, fillSolidity: 0.50, strokeWeight: 1.3, shapeScale: 1.1,
    rotationDrift: 0.3, vignetteStr: 0.15, grainStr: 0.0, bloomShape: 0.35,
    zDepth: 1.0, orbitSpeed: 0.2, camFOV: 55, depthFog: 0.3,
    light3D: 0.5, particleSize3D: 1.0, glowIntensity3D: 0.55, waveZ: 0.3,
  },
  // ── 3. Analytical Collage ─ 70% planes + rects, Schwitters/Rothko
  'analytical_collage': {
    mode: 'geometric',
    macroStructure: 0.55, macroGesture: 0.20, macroContrast: 0.90,
    macroSilence: 0.55, macroAtmosphere: 0.0, macroCollage: 0.95,
    snapAxes: 0.60, gridStrength: 0.70, gridSize: 64,
    lineMastery: 0.10, planeCasting: 0.90, cutWindows: 0.70,
    mixPoint: 0.02, mixLine: 0.05, mixRect: 0.28, mixArc: 0.02, mixPlane: 0.63,
    shapeOpacity: 0.88, fillSolidity: 0.75, strokeWeight: 0.8, shapeScale: 1.4,
    rotationDrift: 0.0, vignetteStr: 0.40, grainStr: 0.20, bloomShape: 0.0,
    zDepth: 1.0, orbitSpeed: 0.2, camFOV: 55, depthFog: 0.3,
    light3D: 0.5, particleSize3D: 1.0, glowIntensity3D: 0.55, waveZ: 0.3,
  },
  // ── 4. Spiritual Geometry ─ 60% points (shape variety) + arcs, Kandinsky
  'spiritual_geometry': {
    mode: 'geometric',
    macroStructure: 0.25, macroGesture: 0.15, macroContrast: 0.80,
    macroSilence: 0.80, macroAtmosphere: 0.30, macroCollage: 0.10,
    snapAxes: 0.15, gridStrength: 0.05, gridSize: 80,
    lineMastery: 0.30, planeCasting: 0.05, cutWindows: 0.0,
    mixPoint: 0.60, mixLine: 0.05, mixRect: 0.05, mixArc: 0.28, mixPlane: 0.02,
    shapeOpacity: 0.75, fillSolidity: 0.60, strokeWeight: 1.0, shapeScale: 0.9,
    rotationDrift: 0.5, vignetteStr: 0.55, grainStr: 0.10, bloomShape: 0.45,
    zDepth: 1.0, orbitSpeed: 0.2, camFOV: 55, depthFog: 0.3,
    light3D: 0.5, particleSize3D: 1.0, glowIntensity3D: 0.55, waveZ: 0.3,
  },

  // ─── 3D Mode Presets ─────────────────────────────────────────────────────

  // ── 5. Nebula Drift ─ Organic slow orbit, volumetric glow, deep atmosphere
  'nebula_drift': {
    mode: '3d',
    macroStructure: 0.05, macroGesture: 0.65, macroContrast: 0.70,
    macroSilence: 0.20, macroAtmosphere: 0.80, macroCollage: 0.0,
    snapAxes: 0.0, gridStrength: 0.0, gridSize: 40,
    lineMastery: 0.0, planeCasting: 0.0, cutWindows: 0.0,
    mixPoint: 0.8, mixLine: 0.1, mixRect: 0.0, mixArc: 0.1, mixPlane: 0.0,
    shapeOpacity: 0.85, fillSolidity: 0.35, strokeWeight: 1.0, shapeScale: 1.0,
    rotationDrift: 0.0, vignetteStr: 0.0, grainStr: 0.0, bloomShape: 0.0,
    zDepth: 1.6, orbitSpeed: 0.15, camFOV: 55, depthFog: 0.55,
    light3D: 0.45, particleSize3D: 1.1, glowIntensity3D: 0.80, waveZ: 0.55,
  },

  // ── 6. Crystal Lattice ─ Structured, sharp, line-heavy, slow cold orbit
  'crystal_lattice': {
    mode: '3d',
    macroStructure: 0.88, macroGesture: 0.20, macroContrast: 0.95,
    macroSilence: 0.55, macroAtmosphere: 0.25, macroCollage: 0.0,
    snapAxes: 0.90, gridStrength: 0.85, gridSize: 48,
    lineMastery: 0.90, planeCasting: 0.0, cutWindows: 0.0,
    mixPoint: 0.05, mixLine: 0.85, mixRect: 0.05, mixArc: 0.05, mixPlane: 0.0,
    shapeOpacity: 0.92, fillSolidity: 0.15, strokeWeight: 1.6, shapeScale: 1.1,
    rotationDrift: 0.0, vignetteStr: 0.0, grainStr: 0.0, bloomShape: 0.0,
    zDepth: 0.85, orbitSpeed: 0.08, camFOV: 48, depthFog: 0.20,
    light3D: 0.80, particleSize3D: 0.85, glowIntensity3D: 0.40, waveZ: 0.12,
  },

  // ── 7. Void Bloom ─ Dark void + explosive additive glow, fast orbit
  'void_bloom': {
    mode: '3d',
    macroStructure: 0.0, macroGesture: 0.90, macroContrast: 1.0,
    macroSilence: 0.0, macroAtmosphere: 0.90, macroCollage: 0.0,
    snapAxes: 0.0, gridStrength: 0.0, gridSize: 40,
    lineMastery: 0.0, planeCasting: 0.0, cutWindows: 0.0,
    mixPoint: 0.95, mixLine: 0.05, mixRect: 0.0, mixArc: 0.0, mixPlane: 0.0,
    shapeOpacity: 1.0, fillSolidity: 0.35, strokeWeight: 1.0, shapeScale: 1.3,
    rotationDrift: 0.0, vignetteStr: 0.0, grainStr: 0.0, bloomShape: 0.0,
    zDepth: 2.0, orbitSpeed: 0.45, camFOV: 65, depthFog: 0.70,
    light3D: 0.60, particleSize3D: 1.3, glowIntensity3D: 0.95, waveZ: 0.75,
  },

  // ── 8. Solar Wind ─ Streaming motion, arc-heavy, medium orbit
  'solar_wind': {
    mode: '3d',
    macroStructure: 0.15, macroGesture: 0.95, macroContrast: 0.85,
    macroSilence: 0.05, macroAtmosphere: 0.50, macroCollage: 0.0,
    snapAxes: 0.0, gridStrength: 0.0, gridSize: 40,
    lineMastery: 0.25, planeCasting: 0.0, cutWindows: 0.0,
    mixPoint: 0.30, mixLine: 0.25, mixRect: 0.0, mixArc: 0.45, mixPlane: 0.0,
    shapeOpacity: 0.88, fillSolidity: 0.40, strokeWeight: 1.2, shapeScale: 1.0,
    rotationDrift: 0.3, vignetteStr: 0.0, grainStr: 0.0, bloomShape: 0.0,
    zDepth: 1.2, orbitSpeed: 0.30, camFOV: 58, depthFog: 0.35,
    light3D: 0.65, particleSize3D: 0.90, glowIntensity3D: 0.65, waveZ: 0.40,
  },

  // ── 9. Quantum Foam ─ Chaotic near-Planck scale turbulence, max glow, fast orbit
  'quantum_foam': {
    mode: '3d',
    macroStructure: 0.0, macroGesture: 1.0, macroContrast: 1.0,
    macroSilence: 0.0, macroAtmosphere: 0.85, macroCollage: 0.0,
    snapAxes: 0.0, gridStrength: 0.0, gridSize: 40,
    lineMastery: 0.0, planeCasting: 0.0, cutWindows: 0.0,
    mixPoint: 0.70, mixLine: 0.20, mixRect: 0.0, mixArc: 0.10, mixPlane: 0.0,
    shapeOpacity: 1.0, fillSolidity: 0.35, strokeWeight: 1.0, shapeScale: 0.75,
    rotationDrift: 0.0, vignetteStr: 0.0, grainStr: 0.0, bloomShape: 0.0,
    zDepth: 1.9, orbitSpeed: 0.60, camFOV: 72, depthFog: 0.72,
    light3D: 0.50, particleSize3D: 0.65, glowIntensity3D: 1.0, waveZ: 0.95,
  },

  // ── 10. Deep Field ─ Hubble-like — dense, slow drift, stellar point-cloud
  'deep_field': {
    mode: '3d',
    macroStructure: 0.05, macroGesture: 0.18, macroContrast: 0.75,
    macroSilence: 0.60, macroAtmosphere: 0.35, macroCollage: 0.0,
    snapAxes: 0.0, gridStrength: 0.0, gridSize: 40,
    lineMastery: 0.0, planeCasting: 0.0, cutWindows: 0.0,
    mixPoint: 0.92, mixLine: 0.04, mixRect: 0.0, mixArc: 0.04, mixPlane: 0.0,
    shapeOpacity: 0.80, fillSolidity: 0.35, strokeWeight: 1.0, shapeScale: 0.70,
    rotationDrift: 0.0, vignetteStr: 0.0, grainStr: 0.0, bloomShape: 0.0,
    zDepth: 1.4, orbitSpeed: 0.05, camFOV: 42, depthFog: 0.50,
    light3D: 0.35, particleSize3D: 0.72, glowIntensity3D: 0.55, waveZ: 0.18,
  },

  // ── 11. Rhizome 3D ─ Straight line trails, crisp neon network, Rhizome aesthetic
  'rhizome_3d': {
    mode: '3d',
    macroStructure: 0.70, macroGesture: 0.80, macroContrast: 0.90,
    macroSilence: 0.30, macroAtmosphere: 0.45, macroCollage: 0.0,
    snapAxes: 0.60, gridStrength: 0.30, gridSize: 40,
    lineMastery: 0.85, planeCasting: 0.0, cutWindows: 0.0,
    mixPoint: 0.1, mixLine: 0.85, mixRect: 0.0, mixArc: 0.05, mixPlane: 0.0,
    shapeOpacity: 0.92, fillSolidity: 0.35, strokeWeight: 1.5, shapeScale: 1.0,
    rotationDrift: 0.0, vignetteStr: 0.0, grainStr: 0.0, bloomShape: 0.0,
    zDepth: 0.75, orbitSpeed: 0.12, camFOV: 52, depthFog: 0.15,
    light3D: 0.70, particleSize3D: 0.65, glowIntensity3D: 0.60, waveZ: 0.08,
    trails3D: true, trailLength3D: 6,
    showGeoShapes: true, solidShapes3D: false,
  },
};