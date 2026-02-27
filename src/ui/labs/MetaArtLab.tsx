// ─── Meta-Arte Lab ─────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera, Download, RefreshCw, Play, Pause, Maximize2, X,
  Layers, Dna, Archive, Heart, Pin, Trash2, RotateCcw, Link2, Zap, Box, Grid3X3,
} from 'lucide-react';
import type {
  DNA, LayerState, ToolState, ArchiveEntry, GrimoireEntry,
  VitrineCard, MetricsSnapshot, Quantum, GestureRecord,
  OverlayFlags, SpawnPattern, GuideLine, ChannelPath, GuideLineType,
} from '../../sim/metaart/metaArtTypes';
import { PRESETS, EXTRA_PRESETS, GEO_PRESETS, generateRandomPalette, generateFullyRandomDNA } from '../../sim/metaart/metaArtDNA';
import {
  createFieldGrid, generateFlowField, buildInteractionMatrix,
  applyToolToField, diffuseField,
} from '../../sim/metaart/metaArtFields';
import {
  createQuanta, updateQuanta, spawnQuantaAtPoint,
  renderQuantaTrail, renderQuantaParticles,
  renderConnections, renderGlow,
  recolorQuantaToPalette,
  applyGuideForces, renderGuides, renderToolCursor,
} from '../../sim/metaart/metaArtEngine';
import { createLayerStack, getLayer, clearLayer, compositeLayersToMain } from '../../sim/metaart/metaArtLayers';
import { fadeTrailLayer, renderPostLayer } from '../../sim/metaart/metaArtRenderer';
import { createDefaultToolState, TOOL_DEFS } from '../../sim/metaart/metaArtTools';
import { addGrimoireEntry } from '../../sim/metaart/metaArtArchive';
import { captureSnapshot } from '../../sim/metaart/metaArtArchive';
import { generateThumbnail, mutateDNA } from '../../sim/metaart/metaArtMutations';
import { exportPNG, exportDNA } from '../../sim/metaart/metaArtExport';
import { createQuantaWithPattern, SPAWN_PATTERN_LABELS } from '../../sim/metaart/metaArtSpawnPatterns';
import { computeMetrics } from '../../sim/metaart/metaArtCurator';
import { loadMusicSnapshotFromStorage, musicSnapshotToMetaArtConfig } from '../../bridge/musicMetaArtBridge';
import { LeftSidebar } from '../metaart/LeftSidebar';
import { LayerPanel } from '../metaart/LayerPanel';
import { ArchivePanel } from '../metaart/ArchivePanel';
import { getControllerManager } from '../../input/controller/ControllerInputManager';
import { useController, shouldUseController } from '../../input/controller/useController';
import { ControllerCursor } from '../../input/controller/ControllerCursor';
import { ControllerHUD } from '../../input/controller/ControllerHUD';
import { QuickMenu } from '../../input/controller/QuickMenu';
import type { ControllerFrameState } from '../../input/controller/types';
import { CanvasRecorder, RecorderState, fmtTime } from '../../app/components/recording/canvasRecorder';
import { RecordingButton } from '../../app/components/recording/RecordingButton';
import type { GeoParams, PhysicsConfig, BrushTexturePreset } from '../../sim/metaart/metaArtTypes';
import { createDefaultPhysicsConfig, BRUSH_TEXTURE_PRESETS } from '../../sim/metaart/metaArtTypes';
import {
  createDefaultGeoParams, assignKindByGeoParams, clearGeoKinds,
  applyGeometricForces, tickGestaltCompositor, syncDerivedParams,
  GEO_PRESET_PARAMS,
} from '../../sim/metaart/metaArtGeo';
import { renderAtmosphereGradients, renderGeometricPrimitives } from '../../sim/metaart/metaArtGeoRenderer';
import { MetaArt3DRenderer } from '../../sim/metaart/metaArt3DRenderer';
import { MatrixPanel } from '../metaart/MatrixPanel';
import { PhysicsPanel } from '../metaart/PhysicsPanel';
import { PowersPanel } from '../metaart/PowersPanel';
import { MetaArtHubPanel } from './MetaArtHubPanel';
import { computeMetaArtMorin } from '../../sim/metaart/metaArtComplexity';
import type { MorinIndices } from '../../sim/complexity/complexityLens';

interface Props { active: boolean; }

type RightPanel = 'layers' | 'dna' | 'archive' | 'vitrine' | 'geo' | 'matrix' | 'physics' | 'powers' | 'hub' | null;

// ── Design tokens — matches homepage identity ──────────────────────────────────
const MONO = "'IBM Plex Mono', monospace";
const DOTO = "'Doto', monospace";
const ACCENT = '#ff0084';
const BG = '#000';
const SURFACE = 'rgba(255,255,255,0.02)';
const BORDER = 'rgba(255,255,255,0.06)';
const DIM = 'rgba(255,255,255,0.28)';
const MID = 'rgba(255,255,255,0.5)';
const BRIGHT = 'rgba(255,255,255,0.85)';

type RitualKey = 'pulse' | 'order' | 'heat' | 'surrender' | 'memory' | 'gesture';
type RitualAnswers = Record<RitualKey, number>;
type RitualQuestion = {
  key: RitualKey;
  prompt: string;
  options: Array<{ label: string; value: number }>;
};

const RITUAL_QUESTIONS: RitualQuestion[] = [
  {
    key: 'pulse',
    prompt: 'Qual ritmo interno você quer para esta sessão?',
    options: [
      { label: 'Silêncio', value: 0.1 },
      { label: 'Respiração lenta', value: 0.3 },
      { label: 'Ritmo vivo', value: 0.55 },
      { label: 'Pulsação intensa', value: 0.78 },
      { label: 'Êxtase', value: 0.95 },
    ],
  },
  {
    key: 'order',
    prompt: 'Hoje sua forma pede ordem ou caos?',
    options: [
      { label: 'Caos total', value: 0.05 },
      { label: 'Ruptura', value: 0.25 },
      { label: 'Equilíbrio', value: 0.5 },
      { label: 'Arquitetura', value: 0.75 },
      { label: 'Geometria rígida', value: 0.95 },
    ],
  },
  {
    key: 'heat',
    prompt: 'Qual temperatura emocional da paleta?',
    options: [
      { label: 'Fria', value: 0.1 },
      { label: 'Neutra-fria', value: 0.3 },
      { label: 'Mista', value: 0.5 },
      { label: 'Neutra-quente', value: 0.7 },
      { label: 'Incandescente', value: 0.9 },
    ],
  },
  {
    key: 'surrender',
    prompt: 'Quanto controle você quer manter?',
    options: [
      { label: 'Controle total', value: 0.1 },
      { label: 'Direção firme', value: 0.3 },
      { label: 'Coautoria', value: 0.55 },
      { label: 'Fluxo livre', value: 0.78 },
      { label: 'Entrega total', value: 0.95 },
    ],
  },
  {
    key: 'memory',
    prompt: 'Você quer rastro/memória longa na composição?',
    options: [
      { label: 'Quase nenhum', value: 0.1 },
      { label: 'Curto', value: 0.3 },
      { label: 'Médio', value: 0.5 },
      { label: 'Longo', value: 0.75 },
      { label: 'Profundo', value: 0.95 },
    ],
  },
  {
    key: 'gesture',
    prompt: 'O gesto deve ser mais traço ou massa?',
    options: [
      { label: 'Ponto/massa', value: 0.1 },
      { label: 'Forma curta', value: 0.3 },
      { label: 'Híbrido', value: 0.5 },
      { label: 'Traço fluido', value: 0.75 },
      { label: 'Caligrafia', value: 0.95 },
    ],
  },
];

// ── Geo Panel ─────────────────────────────────────────────────────────────────
function GeoPanel({
  geoParams, onParamChange, onApplyPreset,
}: {
  geoParams: GeoParams;
  onParamChange: (key: keyof GeoParams, val: GeoParams[keyof GeoParams]) => void;
  onApplyPreset: (key: string) => void;
}) {
  const [advOpen, setAdvOpen] = React.useState(false);
  const p = geoParams;

  const sty: React.CSSProperties = {
    padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
    fontFamily: MONO,
  };
  const label: React.CSSProperties = {
    fontSize: 8, color: DIM, letterSpacing: '0.12em',
    textTransform: 'uppercase', marginBottom: 1, fontFamily: MONO,
  };
  const WIDE_RANGE: Partial<Record<keyof GeoParams, [number, number]>> = {
    strokeWeight: [0.1, 3], shapeScale: [0.1, 3],
    particleSize3D: [0.1, 3], zDepth: [0, 2], camFOV: [20, 90],
    shapeGravity: [0, 1], angleDamping: [0, 1],
    trailLength3D: [1, 6],
  };

  const sliderRow = (key: keyof GeoParams, name: string, color = '#60ff90') => {
    const raw = p[key];
    const val = (typeof raw === 'number' && isFinite(raw)) ? raw : 0;
    const [rMin, rMax] = WIDE_RANGE[key] ?? [0, 1];
    return (
      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ ...label, width: 62, marginBottom: 0, textAlign: 'right' }}>{name}</span>
        <input
          type="range" min={rMin} max={rMax} step={rMax > 1 ? 0.05 : 0.01} value={val}
          onChange={e => onParamChange(key, parseFloat(e.target.value))}
          style={{ flex: 1, cursor: 'pointer', accentColor: color }}
        />
        <span style={{ fontSize: 7, color: DIM, fontFamily: MONO, minWidth: 28, textAlign: 'right' }}>
          {val.toFixed(2)}
        </span>
      </div>
    );
  };

  const modeColor =
    p.mode === 'geometric' ? 'rgba(100,220,120,0.9)' :
    p.mode === 'hybrid'    ? 'rgba(100,180,255,0.9)' :
    p.mode === '3d'        ? 'rgba(200,130,255,0.95)' :
    'rgba(255,255,255,0.4)';

  return (
    <div style={{ ...sty, color: 'rgba(255,255,255,0.75)', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ fontSize: 8, color: ACCENT, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 400, fontFamily: MONO }}>
        COMPOSITOR GESTALT
      </div>

      {/* Mode selector */}
      <div>
        <div style={label}>Modo</div>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {(['fluid', 'geometric', 'hybrid', '3d'] as const).map(m => (
            <button title={m} key={m}
              onClick={() => onParamChange('mode', m)}
              style={{
                flex: 1, minWidth: 42, padding: '4px 0', borderRadius: 1, cursor: 'pointer', fontSize: 7,
                fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase',
                background: p.mode === m ? 'rgba(255,0,132,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${p.mode === m ? 'rgba(255,0,132,0.3)' : BORDER}`,
                color: p.mode === m ? ACCENT : DIM,
              }}>
              {m === 'fluid' ? 'FLUID' : m === 'geometric' ? 'GEO' : m === 'hybrid' ? 'HYBRID' : '3D'}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3D params ─────────────────────────────────────────────────── */}
      {p.mode === '3d' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ ...label, marginBottom: 3, color: 'rgba(200,130,255,0.75)' }}>⬡ Câmera & Espaço</div>
            {sliderRow('zDepth',    'Z-Depth',  '#c080ff')}
            {sliderRow('orbitSpeed','Órbita',   '#a060ff')}
            {sliderRow('camFOV',    'FOV°',     '#8060ff')}
            {sliderRow('depthFog',  'Fog',      '#607090')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ ...label, marginBottom: 3, color: 'rgba(200,130,255,0.75)' }}>⬡ Luz & Glow</div>
            {sliderRow('light3D',         'Luz',        '#ffd060')}
            {sliderRow('particleSize3D',  'Pt Size',    '#a0ffa0')}
            {sliderRow('glowIntensity3D', 'Glow',       '#80c0ff')}
            {sliderRow('waveZ',           'Z-Wave',     '#ff80c0')}
            {sliderRow('fillSolidity',    'Fill Solid', '#ffcc60')}
            {sliderRow('shapeScale',      'Scale',      '#a0ffa0')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ ...label, marginBottom: 3, color: 'rgba(200,130,255,0.75)' }}>⬡ Conexões & Overlays</div>
            {sliderRow('macroAtmosphere', 'Conexões', '#ff80c0')}
            {sliderRow('macroGesture',    'Flow',     '#60c0ff')}
            {/* Trails toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ ...label, marginBottom: 0, width: 60 }}>Rastros</span>
              <button title={`Trails 3D: ${p.trails3D ? "ON" : "OFF"}`}
                onClick={() => onParamChange('trails3D', !p.trails3D)}
                style={{
                  flex: 1, fontSize: 8, padding: '3px 0', borderRadius: 3, cursor: 'pointer',
                  background: p.trails3D ? 'rgba(80,200,255,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${p.trails3D ? 'rgba(80,200,255,0.45)' : 'rgba(255,255,255,0.1)'}`,
                  color: p.trails3D ? 'rgba(160,230,255,0.95)' : 'rgba(255,255,255,0.28)',
                  fontFamily: 'monospace',
                }}>
                {p.trails3D ? '● ON' : '○ OFF'}
              </button>
            </div>
            {p.trails3D && sliderRow('trailLength3D', 'Trail Len', '#80d0ff')}
          </div>

          {/* DNA Genes info in 3D */}
          <div style={{
            fontSize: 7, color: 'rgba(200,130,255,0.4)', lineHeight: 1.65,
            background: 'rgba(140,60,255,0.06)', borderRadius: 4, padding: '6px 8px',
          }}>
            <div style={{ color: 'rgba(200,130,255,0.6)', marginBottom: 3, fontSize: 8 }}>◎ DNA → 3D</div>
            <div>Memory → auto-rastros · Entropy → jitter</div>
            <div>Contrast → luminância · Rhythm → pulso</div>
            <div>Frag. → escala alternada · Linear → Rizoma</div>
          </div>

          {/* 3D Geo shapes toggle row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ ...label, marginBottom: 2, color: 'rgba(200,130,255,0.75)' }}>◈ Formas Geo</div>
            {/* Wire toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ ...label, marginBottom: 0, width: 60 }}>Wireframe</span>
              <button title={`Geo Shapes: ${p.showGeoShapes !== false ? "ON" : "OFF"}`}
                onClick={() => onParamChange('showGeoShapes', p.showGeoShapes === false ? true : false)}
                style={{
                  flex: 1, fontSize: 8, padding: '3px 0', borderRadius: 3, cursor: 'pointer',
                  background: p.showGeoShapes !== false
                    ? 'rgba(160,80,255,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${p.showGeoShapes !== false
                    ? 'rgba(200,100,255,0.45)' : 'rgba(255,255,255,0.1)'}`,
                  color: p.showGeoShapes !== false
                    ? 'rgba(220,170,255,0.95)' : 'rgba(255,255,255,0.28)',
                  fontFamily: 'monospace',
                }}>
                {p.showGeoShapes !== false ? '● ON' : '○ OFF'}
              </button>
            </div>
            {/* Solid fill toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ ...label, marginBottom: 0, width: 60 }}>Sólido 3D</span>
              <button title={`Solid 3D: ${p.solidShapes3D ? "ON" : "OFF"}`}
                onClick={() => onParamChange('solidShapes3D', !p.solidShapes3D)}
                style={{
                  flex: 1, fontSize: 8, padding: '3px 0', borderRadius: 3, cursor: 'pointer',
                  background: p.solidShapes3D
                    ? 'rgba(255,160,60,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${p.solidShapes3D
                    ? 'rgba(255,200,80,0.45)' : 'rgba(255,255,255,0.1)'}`,
                  color: p.solidShapes3D
                    ? 'rgba(255,220,150,0.95)' : 'rgba(255,255,255,0.28)',
                  fontFamily: 'monospace',
                }}>
                {p.solidShapes3D ? '◆ ON' : '◇ OFF'}
              </button>
            </div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', lineHeight: 1.5 }}>
              Sólido: preenche rect/plane/arc com triângulos.<br />
              Ajusta Fill Solid para controlar a opacidade.
            </div>
          </div>

          {/* 3D Presets */}
          <div>
            <div style={{ ...label, marginBottom: 5, color: 'rgba(200,130,255,0.6)' }}>Presets 3D</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {([
                { key: 'nebula_drift',    name: 'Nebula Drift',    desc: 'Órbita lenta · glow volumétrico · névoa' },
                { key: 'crystal_lattice', name: 'Crystal Lattice', desc: 'Estrutura · linhas frias · luz dura' },
                { key: 'void_bloom',      name: 'Void Bloom',      desc: 'Vazio · explosão aditiva · órbita rápida' },
                { key: 'solar_wind',      name: 'Solar Wind',      desc: 'Fluxo · arcos 3D · vento solar' },
                { key: 'quantum_foam',    name: 'Quantum Foam',    desc: 'Turbulência máxima · glow total · caos' },
                { key: 'deep_field',      name: 'Deep Field',      desc: 'Campo estelar · deriva lenta · Hubble' },
                { key: 'rhizome_3d',      name: 'Rizoma 3D',       desc: 'Linhas retas · rastros neon · rede viva' },
              ]).map(({ key, name, desc }) => (
                <button title={name} key={key}
                  onClick={() => onApplyPreset(key)}
                  style={{
                    textAlign: 'left', padding: '6px 8px', borderRadius: 1, cursor: 'pointer',
                    background: 'rgba(255,0,132,0.04)', border: '1px solid rgba(255,0,132,0.15)',
                    color: BRIGHT, fontSize: 8, fontFamily: MONO,
                  }}>
                  <div style={{ fontWeight: 400, marginBottom: 2, letterSpacing: '0.06em' }}>{name}</div>
                  <div style={{ fontSize: 7, color: DIM }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{
            fontSize: 8, color: 'rgba(160,100,255,0.4)', lineHeight: 1.65,
            borderTop: '1px solid rgba(160,80,255,0.12)', paddingTop: 8,
          }}>
            🖱 drag → órbita · scroll → zoom<br />
            👆 2 dedos → pinch-zoom
          </div>
        </>
      )}

      {/* 6 Macro sliders (non-fluid, non-3D) */}
      {(p.mode === 'geometric' || p.mode === 'hybrid') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ ...label, marginBottom: 4, color: 'rgba(160,240,160,0.5)' }}>Macros</div>
          {sliderRow('macroStructure', 'Structure', '#c0a0ff')}
          {sliderRow('macroGesture',   'Gesture',   '#60c0ff')}
          {sliderRow('macroContrast',  'Contrast',  '#ffd060')}
          {sliderRow('macroSilence',   'Silence',   '#80ffa0')}
          {sliderRow('macroAtmosphere','Atmosphere','#ff80c0')}
          {sliderRow('macroCollage',   'Collage',   '#ff9060')}
        </div>
      )}

      {/* ── Shape Physics (geo/hybrid) ─────────────────────────────────────── */}
      {(p.mode === 'geometric' || p.mode === 'hybrid') && (
        <div>
          <div style={{ ...label, marginBottom: 6, color: 'rgba(100,200,255,0.6)' }}>◉ Física das Formas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {/* macroGesture already above but restated here for physics context */}
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.22)', lineHeight: 1.5, marginBottom: 2 }}>
              Gesture → velocidade autônoma das formas (linha, arco, rect, plano).<br />
              Gravity → atrai formas para o centro. Ang.Damp → congela ângulo.
            </div>
            {sliderRow('shapeGravity',  'Gravity',    '#ffaa40')}
            {sliderRow('angleDamping',  'Ang. Damp',  '#80d0ff')}
          </div>
        </div>
      )}

      {/* Primitive mix (geo/hybrid) */}
      {(p.mode === 'geometric' || p.mode === 'hybrid') && (
        <div>
          <div style={{ ...label, marginBottom: 6 }}>Primitive Mix</div>
          {(['mixPoint','mixLine','mixRect','mixArc','mixPlane'] as const).map((k, i) => {
            const names = ['● Point','— Line','□ Rect','◠ Arc','▭ Plane'];
            const colors = ['#888','#60c0ff','#ffd060','#ff80c0','#c0a0ff'];
            return sliderRow(k, names[i], colors[i]);
          })}
        </div>
      )}

      {/* Composition / FX sliders (geo/hybrid only) */}
      {(p.mode === 'geometric' || p.mode === 'hybrid') && (
        <div>
          <div style={{ ...label, marginBottom: 6, color: 'rgba(255,200,100,0.6)' }}>Composição & FX</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {sliderRow('shapeOpacity',  'Opacity',    '#ffffff')}
            {sliderRow('fillSolidity',  'Fill Solid', '#ffcc60')}
            {sliderRow('strokeWeight',  'Stroke W.',  '#60d0ff')}
            {sliderRow('shapeScale',    'Scale',      '#a0ffa0')}
            {sliderRow('rotationDrift', 'Rot. Drift', '#ff80ff')}
            {sliderRow('bloomShape',    'Bloom',      '#80c0ff')}
            {sliderRow('vignetteStr',   'Vignette',   '#888888')}
            {sliderRow('grainStr',      'Grain',      '#cccccc')}
          </div>
        </div>
      )}

      {/* Advanced (collapsible, geo/hybrid only) */}
      {(p.mode === 'geometric' || p.mode === 'hybrid') && (
        <div>
          <button title={advOpen ? "Fechar avançado" : "Abrir avançado"}
            onClick={() => setAdvOpen(v => !v)}
            style={{
              width: '100%', background: 'none', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 4, padding: '4px 8px', cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)', fontSize: 8, display: 'flex',
              alignItems: 'center', justifyContent: 'space-between', letterSpacing: '0.08em',
            }}>
            <span>AVANÇADO</span>
            <span>{advOpen ? '▲' : '▼'}</span>
          </button>
          {advOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
              {sliderRow('snapAxes',    'Snap Axes',   '#c0a0ff')}
              {sliderRow('gridStrength','Grid Str.',   '#ffd060')}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ ...label, width: 62, marginBottom: 0, textAlign: 'right' }}>Grid Size</span>
                <input type="range" min={8} max={80} step={4}
                  value={p.gridSize}
                  onChange={e => onParamChange('gridSize', parseInt(e.target.value))}
                  style={{ flex: 1, cursor: 'pointer', accentColor: '#ffd060' }} />
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>
                  {p.gridSize}px
                </span>
              </div>
              {sliderRow('lineMastery', 'Line Mst.',  '#60ff90')}
              {sliderRow('planeCasting','Planes',     '#ff9060')}
              {sliderRow('cutWindows',  'Cut Win.',   '#ff6060')}
            </div>
          )}
        </div>
      )}

      {/* Geometric presets (non-3D) */}
      {p.mode !== '3d' && (
        <div>
          <div style={{ ...label, marginBottom: 6 }}>Presets Geométricos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {([
              { key: 'constructive_score', name: 'Constructive Score', desc: 'Linhas longas + grade + tensão' },
              { key: 'geometric_orchestra', name: 'Geometric Orchestra', desc: 'Arcos + diagonais + halos' },
              { key: 'analytical_collage', name: 'Analytical Collage', desc: 'Recortes + planos + colagem' },
              { key: 'spiritual_geometry', name: 'Spiritual Geometry', desc: 'Minimal + aura + silêncio' },
            ]).map(({ key, name, desc }) => (
              <button title={name} key={key}
                onClick={() => onApplyPreset(key)}
                style={{
                  textAlign: 'left', padding: '6px 8px', borderRadius: 1, cursor: 'pointer',
                  background: 'rgba(255,0,132,0.04)', border: '1px solid rgba(255,0,132,0.15)',
                  color: BRIGHT, fontSize: 8, fontFamily: MONO,
                }}>
                <div style={{ fontWeight: 400, marginBottom: 2, letterSpacing: '0.06em' }}>{name}</div>
                <div style={{ fontSize: 7, color: DIM }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode description */}
      {(p.mode === 'geometric' || p.mode === 'hybrid') && (
        <div style={{
          fontSize: 8, color: 'rgba(255,255,255,0.22)', lineHeight: 1.55,
          borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8,
        }}>
          {p.mode === 'geometric'
            ? 'Modo Geométrico: quanta renderizam como primitivas (linha, arco, retângulo, plano). Compositor Gestalt aplica snap-de-eixos, grade, crescimento de linhas e planos translúcidos.'
            : 'Modo Híbrido: traços fluidos + primitivas geométricas sobrepostos. Atmosphere + halos ativos.'}
        </div>
      )}
    </div>
  );
}

// ── Vitrine Card ─────────────────────────────────────────────────────────────
function VitrineCardView({
  card, selected, onSelect, onFavorite, onPin, onDiscard, onMutateFrom,
}: {
  card: VitrineCard; selected: boolean;
  onSelect: () => void; onFavorite: () => void; onPin: () => void;
  onDiscard: () => void; onMutateFrom: () => void;
}) {
  return (
    <div style={{
      border: `1px solid ${selected ? 'rgba(255,0,132,0.3)' : BORDER}`,
      borderRadius: 1, overflow: 'hidden', cursor: 'pointer',
      background: selected ? 'rgba(255,0,132,0.04)' : 'rgba(255,255,255,0.01)',
    }}>
      <img src={card.thumbnail} alt={card.label} onClick={onSelect}
        style={{ width: '100%', aspectRatio: '1', display: 'block', objectFit: 'cover' }} />
      <div style={{ padding: '4px 5px' }}>
        <div style={{ fontSize: 7, color: DIM, marginBottom: 3, fontFamily: MONO, letterSpacing: '0.1em' }}>{card.label}</div>
        <div style={{ display: 'flex', gap: 3, justifyContent: 'space-between' }}>
          <button onClick={onFavorite} title="Favoritar"
            style={{ ...vBtnSty, color: card.favorite ? ACCENT : DIM }}>
            <Heart size={9} strokeWidth={1.2} />
          </button>
          <button onClick={onPin} title="Pinnar DNA"
            style={{ ...vBtnSty, color: card.pinned ? ACCENT : DIM }}>
            <Pin size={9} strokeWidth={1.2} />
          </button>
          <button onClick={onMutateFrom} title="Mutar a partir deste" style={{ ...vBtnSty }}>
            <RefreshCw size={9} strokeWidth={1.2} />
          </button>
          <button onClick={onDiscard} title="Descartar" style={{ ...vBtnSty }}>
            <Trash2 size={9} strokeWidth={1.2} />
          </button>
        </div>
      </div>
    </div>
  );
}

const vBtnSty: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  color: DIM, display: 'flex', alignItems: 'center',
};

// ── Main Component ────────────────────────────────────────────────────────────
export const MetaArtLab: React.FC<Props> = ({ active }) => {
  const mainCanvasRef  = useRef<HTMLCanvasElement>(null);
  const canvas3DRef    = useRef<HTMLCanvasElement>(null);
  const renderer3DRef  = useRef<MetaArt3DRenderer | null>(null);
  const rafRef         = useRef<number>(0);
  const tickRef        = useRef(0);

  // Simulation state (refs for perf)
  const dnaRef      = useRef<DNA>(PRESETS[0]);
  const quantaRef   = useRef<Quantum[]>([]);
  const fieldsRef   = useRef(createFieldGrid());
  const layersRef   = useRef<LayerState[]>([]);
  const seedRef     = useRef(Date.now());
  const prevDensRef = useRef(0);

  // UI state
  const [dna,         setDNA]         = useState<DNA>(PRESETS[0]);
  const [layers,      setLayers]      = useState<LayerState[]>([]);
  const [toolState,   setToolState]   = useState<ToolState>(createDefaultToolState());
  const [rightPanel,  setRightPanel]  = useState<RightPanel>('physics');
  const [paused,      setPaused]      = useState(false);
  const [cinematic,   setCinematic]   = useState(false);
  const [archive,     setArchive]     = useState<ArchiveEntry[]>([]);
  const [grimoire,    setGrimoire]    = useState<GrimoireEntry[]>([]);
  const [vitrine,     setVitrine]     = useState<VitrineCard[]>([]);
  const [selectedVitrine, setSelectedVitrine] = useState<string | null>(null);
  const [pinnedDNA,   setPinnedDNA]   = useState<DNA | null>(null);
  const [metrics,     setMetrics]     = useState<MetricsSnapshot | null>(null);
  const [overlays,    setOverlays]    = useState<OverlayFlags>({ connections: false, glow: false, pulse: false });
  const [dims,        setDims]        = useState({ W: window.innerWidth, H: window.innerHeight });
  const [simSpeed,    setSimSpeed]    = useState(1.0);
  const [sizeMul,     setSizeMul]     = useState(1.0);
  const [quantaCount, setQuantaCount] = useState(0);
  const [spawnPattern, setSpawnPattern] = useState<SpawnPattern>('scatter');
  const [staticAgents, setStaticAgents] = useState(false);
  const [isolatedSpecies, setIsolatedSpecies] = useState(false);
  const [ritualOpen, setRitualOpen] = useState(true);
  const [ritualStep, setRitualStep] = useState(0);
  const [ritualAnswers, setRitualAnswers] = useState<RitualAnswers>({
    pulse: 0.55, order: 0.5, heat: 0.5, surrender: 0.55, memory: 0.65, gesture: 0.6,
  });
  const ritualDoneRef = useRef(false);

  // ── Guide/Channel persistent structures ────────────────────────────────────
  const guideLinesRef     = useRef<GuideLine[]>([]);
  const channelPathsRef   = useRef<ChannelPath[]>([]);
  const guideDrawingRef   = useRef<{ x1: number; y1: number; x2: number; y2: number; type: GuideLineType } | null>(null);
  const channelPtsRef     = useRef<[number, number][]>([]);
  const [guideCount,      setGuideCount] = useState(0);  // for UI reactivity
  const [guideStroke,     setGuideStroke] = useState(1.3);
  const [guideCurvature,  setGuideCurvature] = useState(0.45);
  const [guideColor,      setGuideColor] = useState('#40b0ff');
  const [guideLineMode,   setGuideLineMode] = useState<GuideLineType>('flow');
  const [guidePathMode,   setGuidePathMode] = useState<'stream' | 'orbit' | 'shock'>('stream');
  const [autoGuidesPreset, setAutoGuidesPreset] = useState(true);
  const [autoGuidesRandom, setAutoGuidesRandom] = useState(true);
  const guideStrokeRef = useRef(1.3);
  const guideCurvatureRef = useRef(0.45);
  const guideColorRef = useRef('#40b0ff');
  const guideLineModeRef = useRef<GuideLineType>('flow');
  const guidePathModeRef = useRef<'stream' | 'orbit' | 'shock'>('stream');

  const toolRef      = useRef<ToolState>(createDefaultToolState());
  const canvasPointerIdRef = useRef<number | null>(null);
  const pausedRef    = useRef(false);
  const overlaysRef  = useRef<OverlayFlags>({ connections: false, glow: false, pulse: false });
  const gesturesRef  = useRef<GestureRecord[]>([]);

  // ── Geo mode ──────────────────────────────────────────────────────────────
  const [geoParams,   setGeoParams]   = useState<GeoParams>(createDefaultGeoParams());
  const geoParamsRef  = useRef<GeoParams>(createDefaultGeoParams());

  // ── Interaction matrix (6×6 flat array, mirrors fieldsRef.current.interactionMatrix) ──
  const [matrixValues, setMatrixValues] = useState<number[]>(() => Array(36).fill(0));
  // Physics config
  const [physicsConfig, setPhysicsConfig] = useState<PhysicsConfig>(createDefaultPhysicsConfig());
  const physicsConfigRef = useRef<PhysicsConfig>(createDefaultPhysicsConfig());

  // Brush texture preset
  const [brushTextureId, setBrushTextureId] = useState<string>('molhado');
  const brushTextureRef = useRef<BrushTexturePreset>(BRUSH_TEXTURE_PRESETS[0]);

  // Singleton big-agent size
  const [singletonSize, setSingletonSize] = useState(6.0);

  // Morin complexity indices (computed every N frames)
  const morinRef = useRef<MorinIndices>({ dialogica: 0, recursivo: 0, hologramatico: 0, sapiensDemens: 0.5, tetralogia: 0 });
  const [morin, setMorin] = useState<MorinIndices>(morinRef.current);
  const [showMorin, setShowMorin] = useState(false);

  const gestaltTickRef = useRef(0);
  const simSpeedRef  = useRef(1.0);
  const sizeMulRef   = useRef(1.0);
  const spawnPatternRef = useRef<SpawnPattern>('scatter');
  const staticAgentsRef = useRef(false);
  const isolatedSpeciesRef = useRef(false);

  const getPresetByName = useCallback((name: string): DNA => {
    const all = [...PRESETS, ...EXTRA_PRESETS];
    return all.find(p => p.name === name) ?? PRESETS[0];
  }, []);

  const buildRitualSeed = useCallback((a: RitualAnswers): {
    dna: DNA; spawn: SpawnPattern; tool: ToolState['activeToolId']; speed: number; size: number;
  } => {
    const baseName =
      a.order > 0.84 ? 'Mondrian Grid' :
      a.order > 0.70 ? 'Blueprint' :
      a.surrender > 0.82 && a.pulse > 0.70 ? 'Action Paint' :
      a.memory > 0.82 && a.pulse < 0.35 ? 'Slow Fog' :
      a.heat > 0.75 ? 'Chromatic Ecstasy' :
      a.gesture > 0.78 ? 'Ink Calligraphy' :
      a.surrender < 0.30 ? 'Signal' :
      'Quadro Branco';
    const base = getPresetByName(baseName);
    const warm = ['#ff5d3d', '#ff9e2c', '#ffd166', '#ff3d8f', '#b13dff', '#592a20'];
    const cool = ['#46c2ff', '#7ad3ff', '#6ef2d1', '#70a5ff', '#3457ff', '#173046'];
    const temp = a.heat;
    const pick = temp >= 0.5 ? warm : cool;
    const blend = Math.abs(temp - 0.5) * 2;
    const pal = base.palette.map((c, i) => (i % 2 === 0 && blend > 0.2) ? pick[i % pick.length] : c);
    const genes = { ...base.genes };
    genes.flow = Math.max(0.02, Math.min(0.98, (genes.flow ?? 0.5) * 0.55 + a.pulse * 0.45));
    genes.entropy = Math.max(0.02, Math.min(0.98, (genes.entropy ?? 0.4) * 0.5 + (1 - a.order) * 0.5));
    genes.memory = Math.max(0.02, Math.min(0.99, (genes.memory ?? 0.6) * 0.55 + a.memory * 0.45));
    genes.coherence = Math.max(0.05, Math.min(0.98, (genes.coherence ?? 0.6) * 0.55 + a.order * 0.45));
    genes.fragmentation = Math.max(0.02, Math.min(0.98, (genes.fragmentation ?? 0.4) * 0.6 + (1 - a.order) * 0.4));
    genes.rhythm = Math.max(0.02, Math.min(0.98, (genes.rhythm ?? 0.5) * 0.55 + a.pulse * 0.45));
    genes.linear = Math.max(0, Math.min(1, (genes.linear ?? 0.4) * 0.6 + a.order * 0.4));
    const dnaSeed: DNA = {
      ...base,
      id: `${base.id}-ritual-${Date.now()}`,
      name: `Ritual: ${base.name ?? 'Quadro Branco'}`,
      palette: pal,
      genes,
      quantaCount: 0,
      background: '#ffffff',
      createdAt: Date.now(),
    };
    const spawn: SpawnPattern =
      a.order > 0.75 ? 'grid' :
      a.surrender > 0.8 ? 'explosion' :
      a.gesture > 0.72 ? 'flow_lines' :
      'scatter';
    const tool: ToolState['activeToolId'] =
      a.gesture > 0.72 ? 'flow_paint' :
      a.surrender > 0.8 ? 'spawn_brush' :
      a.order > 0.72 ? 'channel' :
      'spawn_brush';
    const speed = Math.max(0.35, Math.min(1.45, 0.45 + a.pulse * 0.95));
    const size = Math.max(0.55, Math.min(1.8, 0.75 + a.gesture * 0.8));
    return { dna: dnaSeed, spawn, tool, speed, size };
  }, [getPresetByName]);

  // ── Recording ─────────────────────────────────────────────────────────────
  const recorderRef  = useRef<CanvasRecorder | null>(null);
  const [recState,   setRecState]   = useState<RecorderState>('idle');
  const [recElapsed, setRecElapsed] = useState(0);

  useEffect(() => {
    recorderRef.current = new CanvasRecorder(setRecState);
    return () => recorderRef.current?.dispose();
  }, []);

  useEffect(() => {
    if (recState !== 'recording') return;
    const id = setInterval(() => setRecElapsed(recorderRef.current?.elapsed ?? 0), 500);
    return () => clearInterval(id);
  }, [recState]);

  const handleRecStart = useCallback((opts?: { format?: string; quality?: string }) => {
    const dnaSnap = dnaRef.current;
    recorderRef.current?.start(
      () => [mainCanvasRef.current],
      () => ({
        labName: `Meta-Arte: ${dnaSnap.name ?? 'untitled'}`,
        lines: [
          `quanta:${dnaSnap.genes.particleCount ?? '?'}  flow:${(dnaSnap.genes.flowStrength ?? 0).toFixed(2)}`,
        ],
      }),
      30, undefined,
      { format: (opts?.format ?? 'auto') as any, quality: (opts?.quality ?? 'standard') as any },
    );
  }, []);

  const handleRecStop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  // ── Controller ─────────────────────────────────────────────────────────────
  const { status: ctrlStatus, inputModeRef, setInputMode } = useController();
  const ctrlCursorRef      = useRef({ x: 0.5, y: 0.5 });          // normalized position
  const ctrlCursorElRef    = useRef<HTMLDivElement | null>(null);   // DOM element (direct mutation)
  const [ctrlHUDVisible, setCtrlHUDVisible] = useState(true);
  const [ctrlFrameState, setCtrlFrameState] = useState<ControllerFrameState>({
    connected: false, name: '', axes: { lx:0, ly:0, rx:0, ry:0 },
    triggers: { lt:0, rt:0 }, buttons: {} as never, justPressed: {} as never, justReleased: {} as never,
  });
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const ctrlHUDRef = useRef(ctrlHUDVisible);
  useEffect(() => { ctrlHUDRef.current = ctrlHUDVisible; }, [ctrlHUDVisible]);

  // All presets combined
  const currentPresetIdx = useRef(0);
  // Tool carousel for controller
  const CTRL_TOOLS = ['spawn_brush','erase_agents','ink_brush','attractor','repulsor','flow_comb','vortex','glyph_stamp'] as const;
  const ctrlToolIdx = useRef(0);

  // ── Canvas layout ─────────────────────────────────────────────────────────
  const panelWidth = cinematic ? 0 : 92;  // LeftSidebar width
  const rightWidth = (cinematic || rightPanel === null) ? 0 : 240;
  // Layout size (for flex); may shrink when right panel opens
  const layoutW = Math.max(200, dims.W - panelWidth - rightWidth);
  const layoutH = Math.max(200, dims.H - 40 - 36);
  // Stable canvas pixel size: only change on window resize so params/panel don't clear the buffer
  const [canvasSize, setCanvasSize] = useState(() => ({
    w: Math.max(200, typeof window !== 'undefined' ? window.innerWidth - panelWidth : 800),
    h: Math.max(200, typeof window !== 'undefined' ? window.innerHeight - 40 - 36 : 600),
  }));
  const canvasSizeRef = useRef(canvasSize);
  useEffect(() => { canvasSizeRef.current = canvasSize; }, [canvasSize]);

  useEffect(() => {
    const fn = () => setDims({ W: window.innerWidth, H: window.innerHeight });
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    const w = Math.max(200, dims.W - panelWidth);
    const h = Math.max(200, dims.H - 40 - 36);
    setCanvasSize(prev => (prev.w === w && prev.h === h ? prev : { w, h }));
    canvasSizeRef.current = { w, h };
  }, [dims.W, dims.H, panelWidth]);

  // ── Sync refs ─────────────────────────────────────────────────────────────
  useEffect(() => { dnaRef.current = dna; }, [dna]);
  useEffect(() => { toolRef.current = toolState; }, [toolState]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { overlaysRef.current = overlays; }, [overlays]);
  useEffect(() => { simSpeedRef.current = simSpeed; }, [simSpeed]);
  useEffect(() => { sizeMulRef.current = sizeMul; }, [sizeMul]);
  useEffect(() => { spawnPatternRef.current = spawnPattern; }, [spawnPattern]);
  useEffect(() => { staticAgentsRef.current = staticAgents; }, [staticAgents]);
  useEffect(() => { isolatedSpeciesRef.current = isolatedSpecies; }, [isolatedSpecies]);
  useEffect(() => { geoParamsRef.current = geoParams; }, [geoParams]);
  useEffect(() => { physicsConfigRef.current = physicsConfig; }, [physicsConfig]);
  useEffect(() => { guideStrokeRef.current = guideStroke; }, [guideStroke]);
  useEffect(() => { guideCurvatureRef.current = guideCurvature; }, [guideCurvature]);
  useEffect(() => { guideColorRef.current = guideColor; }, [guideColor]);
  useEffect(() => { guideLineModeRef.current = guideLineMode; }, [guideLineMode]);
  useEffect(() => { guidePathModeRef.current = guidePathMode; }, [guidePathMode]);
  useEffect(() => {
    const preset = BRUSH_TEXTURE_PRESETS.find(p => p.id === brushTextureId) ?? BRUSH_TEXTURE_PRESETS[0];
    brushTextureRef.current = preset;
  }, [brushTextureId]);

  // ── Initialize simulation ─────────────────────────────────────────────────
  const initSim = useCallback((newDNA: DNA, seed: number) => {
    const { w: W, h: H } = canvasSizeRef.current;
    dnaRef.current = newDNA;
    seedRef.current = seed;

    const fields = createFieldGrid();
    generateFlowField(fields, newDNA, seed);
    fields.interactionMatrix = buildInteractionMatrix(newDNA, seed);
    fieldsRef.current = fields;

    quantaRef.current = newDNA.quantaCount > 0
      ? createQuantaWithPattern(newDNA, seed, spawnPatternRef.current)
      : [];
    // Assign geo kinds if not in fluid mode
    const gp = geoParamsRef.current;
    if (gp.mode !== 'fluid' && quantaRef.current.length > 0) {
      syncDerivedParams(gp);
      assignKindByGeoParams(quantaRef.current, gp);
    }
    setQuantaCount(quantaRef.current.length);
    setMatrixValues(Array.from(fields.interactionMatrix));

    const newLayers = createLayerStack(W, H);
    layersRef.current = newLayers;
    setLayers(newLayers.map(l => ({ ...l })));
  }, []);

  useEffect(() => {
    if (active) initSim(dnaRef.current, Date.now());
  }, [active]); // eslint-disable-line

  useEffect(() => {
    if (!active) return;
    if (!ritualDoneRef.current) {
      setRitualStep(0);
      setRitualOpen(true);
    }
  }, [active]);

  // ── Main loop — dt-based slow motion + controller polling ─────────────────
  useEffect(() => {
    if (!active) return;
    const ctrlMgr = getControllerManager();
    const CURSOR_SPEED = 0.013;
    let prevCtrlStart = false;
    let prevCtrlA = false;
    let prevCtrlSel = false;
    let prevCtrlLB = false;
    let prevCtrlRB = false;
    let prevCtrlY = false;
    let prevCtrlDL = false;
    let prevCtrlDR = false;
    let lastHapticStroke = 0;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const canvas = mainCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;

      // ── Controller polling ──────────────────────────────────────────────
      const ctrl = ctrlMgr.poll();
      const useCtrl = shouldUseController(ctrl, inputModeRef.current);

      if (ctrl.connected) {
        // Cursor movement
        ctrlCursorRef.current.x = Math.max(0, Math.min(1, ctrlCursorRef.current.x + ctrl.axes.lx * CURSOR_SPEED));
        ctrlCursorRef.current.y = Math.max(0, Math.min(1, ctrlCursorRef.current.y + ctrl.axes.ly * CURSOR_SPEED));

        // Update cursor DOM element directly (no React state = no re-render)
        const el = ctrlCursorElRef.current;
        if (el) {
          el.style.display = useCtrl ? 'block' : 'none';
          el.style.left = `${ctrlCursorRef.current.x * 100}%`;
          el.style.top  = `${ctrlCursorRef.current.y * 100}%`;
        }

        if (useCtrl) {
          const nx = ctrlCursorRef.current.x;
          const ny = ctrlCursorRef.current.y;
          const ts = toolRef.current;

          // RT → spawn agents with analog intensity
          if (ctrl.triggers.rt > 0.08) {
            const intensity = ctrl.triggers.rt;
            const count = Math.max(1, Math.round(intensity * ts.pressure * ts.size * 0.12));
            const spread = (ts.size / Math.max(W, H)) * 0.4;
            const vx = ctrl.axes.lx * 0.004 * intensity;
            const vy = ctrl.axes.ly * 0.004 * intensity;
            const newQ = spawnQuantaAtPoint(dnaRef.current, nx, ny, vx, vy, count, spread, ts.colorIndex);
            // Assign geo kinds to ctrl-spawned quanta
            const gpCtrl = geoParamsRef.current;
            if (gpCtrl.mode !== 'fluid' && newQ.length > 0) {
              syncDerivedParams(gpCtrl);
              assignKindByGeoParams(newQ, gpCtrl);
            }
            quantaRef.current = [...quantaRef.current, ...newQ].slice(-4000);
            // Haptics stroke budget
            const now = performance.now();
            if (now - lastHapticStroke > 80) {
              ctrlMgr.rumble(intensity * 0.2, 40, 0.6, 0.4);
              lastHapticStroke = now;
            }
          }

          // LT → erase agents
          if (ctrl.triggers.lt > 0.2) {
            const radius = (ts.size / Math.max(W, H)) * 0.65;
            const r2 = radius * radius;
            quantaRef.current = quantaRef.current.filter(q => {
              const dx = q.x - nx, dy = q.y - ny;
              return dx * dx + dy * dy > r2;
            });
          }

          // RS vertical → adjust size
          if (Math.abs(ctrl.axes.ry) > 0.15) {
            setToolState(ts2 => {
              const next = { ...ts2, size: Math.max(5, Math.min(180, ts2.size - ctrl.axes.ry * 2)) };
              toolRef.current = next;
              return next;
            });
          }

          // LB → prev tool in carousel
          if (ctrl.buttons.lb && !prevCtrlLB) {
            ctrlToolIdx.current = (ctrlToolIdx.current - 1 + CTRL_TOOLS.length) % CTRL_TOOLS.length;
            setToolState(ts2 => { const n = { ...ts2, activeToolId: CTRL_TOOLS[ctrlToolIdx.current] }; toolRef.current = n; return n; });
            ctrlMgr.rumble(0.15, 40, 0.5, 0.5);
          }
          // RB → next tool in carousel
          if (ctrl.buttons.rb && !prevCtrlRB) {
            ctrlToolIdx.current = (ctrlToolIdx.current + 1) % CTRL_TOOLS.length;
            setToolState(ts2 => { const n = { ...ts2, activeToolId: CTRL_TOOLS[ctrlToolIdx.current] }; toolRef.current = n; return n; });
            ctrlMgr.rumble(0.15, 40, 0.5, 0.5);
          }

          // D-pad left → prev preset
          if (ctrl.buttons.dpadLeft && !prevCtrlDL) {
            const presets = [...PRESETS, ...EXTRA_PRESETS];
            currentPresetIdx.current = (currentPresetIdx.current - 1 + presets.length) % presets.length;
            handlePreset(presets[currentPresetIdx.current]);
            ctrlMgr.rumble(0.12, 35, 0.5, 0.5);
          }
          // D-pad right → next preset
          if (ctrl.buttons.dpadRight && !prevCtrlDR) {
            const presets = [...PRESETS, ...EXTRA_PRESETS];
            currentPresetIdx.current = (currentPresetIdx.current + 1) % presets.length;
            handlePreset(presets[currentPresetIdx.current]);
            ctrlMgr.rumble(0.12, 35, 0.5, 0.5);
          }

          // Y → snapshot
          if (ctrl.buttons.y && !prevCtrlY) {
            handleCaptureSnapshot();
            ctrlMgr.rumble(0.3, 80, 0.4, 0.6);
          }

          // A → toggle HUD
          if (ctrl.buttons.a && !prevCtrlA) setCtrlHUDVisible(v => !v);

          // Start → open quick menu
          if (ctrl.buttons.start && !prevCtrlStart) setQuickMenuOpen(v => !v);

          // Select → cinematic toggle
          if (ctrl.buttons.select && !prevCtrlSel) setCinematic(v => !v);

          // Update React state for HUD every 4 frames (avoid per-frame setState)
          if (tickRef.current % 4 === 0) setCtrlFrameState({ ...ctrl });
        }

        prevCtrlStart = ctrl.buttons.start;
        prevCtrlA     = ctrl.buttons.a;
        prevCtrlSel   = ctrl.buttons.select;
        prevCtrlLB    = ctrl.buttons.lb;
        prevCtrlRB    = ctrl.buttons.rb;
        prevCtrlY     = ctrl.buttons.y;
        prevCtrlDL    = ctrl.buttons.dpadLeft;
        prevCtrlDR    = ctrl.buttons.dpadRight;
      } else {
        const el = ctrlCursorElRef.current;
        if (el) el.style.display = 'none';
      }

      const pausedNow = pausedRef.current;
      const spd = simSpeedRef.current;
      const gp = geoParamsRef.current;
      const gMode = gp.mode;

      // TRUE slow-motion: scale dt for sub-1 speeds. When paused: no stepping.
      const steps = !pausedNow && spd >= 1 ? Math.max(1, Math.round(spd)) : 1;
      const dt    = !pausedNow ? (spd < 1 ? spd : 1.0) : 0;

      if (!pausedNow) {
        for (let s = 0; s < steps; s++) {
          const tick = tickRef.current + s;
          updateQuanta(
            quantaRef.current, fieldsRef.current, dnaRef.current,
            toolRef.current, W, H, tick, dt,
            staticAgentsRef.current,
            geoParamsRef.current.boundaryMode ?? 'wrap',
            physicsConfigRef.current,
          );
          // Apply persistent guide/channel forces
          if (guideLinesRef.current.length > 0 || channelPathsRef.current.length > 0) {
            applyGuideForces(quantaRef.current, guideLinesRef.current, channelPathsRef.current, tickRef.current);
          }
          // Geo forces (only in geo/hybrid mode)
          if (gMode !== 'fluid') {
            applyGeometricForces(quantaRef.current, gp, W, H);
          }
          diffuseField(fieldsRef.current, dnaRef.current);
        }
        tickRef.current += steps;

        // Gestalt compositor every 30 ticks
        if (gMode !== 'fluid') {
          gestaltTickRef.current++;
          if (gestaltTickRef.current >= 30) {
            gestaltTickRef.current = 0;
            tickGestaltCompositor(quantaRef.current, gp, W, H, tickRef.current);
          }
        }

        const tickM = tickRef.current;
        if (tickM % 90 === 0) {
          const m = computeMetrics(fieldsRef.current, quantaRef.current, prevDensRef.current);
          prevDensRef.current = m.density;
          setMetrics(m);
          setQuantaCount(quantaRef.current.length);
          morinRef.current = computeMetaArtMorin(quantaRef.current, dnaRef.current);
          setMorin(morinRef.current);
        }
      }

      const tick = tickRef.current;

      // ── Render (always, even when paused) ─────────────────────────────────
      if (gMode === '3d') {
        // Lazy-init: create renderer on first 3D frame
        if (!renderer3DRef.current && canvas3DRef.current) {
          renderer3DRef.current = new MetaArt3DRenderer(canvas3DRef.current);
          renderer3DRef.current.attachHandlers();
        }
        if (renderer3DRef.current) {
          renderer3DRef.current.resize(W, H);
          renderer3DRef.current.render(
            quantaRef.current, dnaRef.current, gp, W, H, tick,
            overlaysRef.current,
          );
        }
        // Clear all 2D layers so composite produces just a black bg
        for (const layer of layersRef.current) {
          if (layer.canvas) {
            layer.canvas.getContext('2d')!.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
          }
        }
      } else {
        // ── 2D rendering path ─────────────────────────────────────────────
        const trailLayer = getLayer(layersRef.current, 'trail');
        const hasQuanta = quantaRef.current.length > 0;
        if (trailLayer?.canvas) {
          const tCtx = trailLayer.canvas.getContext('2d')!;
          if (gMode === 'geometric' && hasQuanta) {
            tCtx.clearRect(0, 0, W, H);
          } else if (!pausedNow && hasQuanta) {
            fadeTrailLayer(trailLayer, dnaRef.current, dt);
            if (gMode === 'fluid' || gMode === 'hybrid') {
              renderQuantaTrail(tCtx, quantaRef.current, dnaRef.current, W, H, tick, sizeMulRef.current, brushTextureRef.current);
            }
            if (gMode !== 'fluid' && gp.macroAtmosphere > 0.05) {
              renderAtmosphereGradients(tCtx, quantaRef.current, gp, dnaRef.current.palette, W, H);
            }
          } else if (gMode !== 'fluid' && gp.macroAtmosphere > 0.05) {
            // In paused mode, keep the persistent trail bitmap, but allow atmosphere overlays to update.
            renderAtmosphereGradients(tCtx, quantaRef.current, gp, dnaRef.current.palette, W, H);
          }
        }

        const particlesLayer = getLayer(layersRef.current, 'particles');
        if (particlesLayer?.canvas) {
          particlesLayer.opacity = gMode === 'geometric' ? 1.0
                                 : gMode === 'hybrid'    ? 0.85
                                 : 0.18;
          const pCtx = particlesLayer.canvas.getContext('2d')!;
          if (gMode === 'fluid') {
            renderQuantaParticles(pCtx, quantaRef.current, dnaRef.current, W, H, sizeMulRef.current, brushTextureRef.current);
          } else if (gMode === 'hybrid') {
            renderQuantaParticles(pCtx, quantaRef.current, dnaRef.current, W, H, sizeMulRef.current * 0.35, brushTextureRef.current);
            renderGeometricPrimitives(pCtx, quantaRef.current, dnaRef.current, gp, W, H, tick);
          } else {
            pCtx.clearRect(0, 0, W, H);
            renderGeometricPrimitives(pCtx, quantaRef.current, dnaRef.current, gp, W, H, tick);
          }
        }

        const connectionsLayer = getLayer(layersRef.current, 'connections');
        if (connectionsLayer?.canvas) {
          if (overlaysRef.current.connections) {
            const cCtx = connectionsLayer.canvas.getContext('2d')!;
            renderConnections(cCtx, quantaRef.current, dnaRef.current, W, H);
          } else {
            connectionsLayer.canvas.getContext('2d')!.clearRect(0, 0, W, H);
          }
        }

        const glowLayer = getLayer(layersRef.current, 'glow');
        if (glowLayer?.canvas) {
          if (gMode === 'geometric') {
            glowLayer.canvas.getContext('2d')!.clearRect(0, 0, W, H);
          } else if (overlaysRef.current.glow && (!pausedNow ? tick % 2 === 0 : true)) {
            const gCtx = glowLayer.canvas.getContext('2d')!;
            renderGlow(gCtx, quantaRef.current, dnaRef.current, W, H, sizeMulRef.current);
          } else if (!overlaysRef.current.glow) {
            glowLayer.canvas.getContext('2d')!.clearRect(0, 0, W, H);
          }
        }

        const trailLayerPost = getLayer(layersRef.current, 'trail');
        const postLayer = getLayer(layersRef.current, 'post');
        if (postLayer?.canvas) {
          if (gMode === 'geometric') {
            postLayer.canvas.getContext('2d')!.clearRect(0, 0, W, H);
          } else if (trailLayerPost && (!pausedNow ? tick % 8 === 0 : true)) {
            renderPostLayer(postLayer, trailLayerPost, dnaRef.current, W, H);
          }
        }
      }
      compositeLayersToMain(ctx, layersRef.current, dnaRef.current.background, W, H);

      // ── Canvas border visualization ────────────────────────────────────────
      const gpBorder = geoParamsRef.current;
      if (gpBorder.showBorder) {
        ctx.save();
        const bm = gpBorder.boundaryMode ?? 'wrap';
        const borderColor = bm === 'bounce' ? 'rgba(60,140,255,0.7)'
                          : bm === 'absorb' ? 'rgba(255,80,60,0.7)'
                          : bm === 'open'   ? 'rgba(255,255,255,0.12)'
                          : 'rgba(255,255,255,0.22)'; // wrap
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = bm === 'open' ? 1 : 2;
        ctx.globalAlpha = 1;
        if (bm === 'wrap') ctx.setLineDash([6, 5]);
        else ctx.setLineDash([]);
        ctx.strokeRect(1, 1, W - 2, H - 2);
        // Corner accents
        if (bm !== 'open') {
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.55;
          const cs = 16;
          [[0,0],[W,0],[0,H],[W,H]].forEach(([cx2, cy2]) => {
            const sx = cx2 === 0 ? 1 : -1, sy = cy2 === 0 ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(cx2 + sx * cs, cy2); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2, cy2 + sy * cs);
            ctx.stroke();
          });
        }
        ctx.setLineDash([]);
        ctx.restore();
      }

      // ── Render persistent guides + channel paths on top of composite ──────
      const tick2 = tickRef.current;
      if (guideLinesRef.current.length > 0 || channelPathsRef.current.length > 0) {
        renderGuides(ctx, guideLinesRef.current, channelPathsRef.current, W, H, tick2);
      }

      // ── Guide drawing preview (dashed line while dragging) ────────────────
      if (guideDrawingRef.current) {
        const d = guideDrawingRef.current;
        const mode = guideLineModeRef.current ?? d.type;
        const previewColor =
          mode === 'barrier' ? '#ff7070' :
          mode === 'shear' ? '#ffd060' :
          mode === 'pinch' ? '#a060ff' : '#40b0ff';
        const previewDash =
          mode === 'barrier' ? [2, 2] :
          mode === 'shear' ? [10, 3] :
          mode === 'pinch' ? [3, 5] : [5, 4];
        ctx.save();
        ctx.strokeStyle = previewColor;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.6;
        ctx.setLineDash(previewDash);
        ctx.beginPath();
        ctx.moveTo(d.x1 * W, d.y1 * H);
        ctx.lineTo(d.x2 * W, d.y2 * H);
        ctx.stroke();
        ctx.setLineDash([]);
        // Endpoint dots
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath(); ctx.arc(d.x1 * W, d.y1 * H, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(d.x2 * W, d.y2 * H, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // ── Channel pencil preview (while dragging) ───────────────────────────
      if (channelPtsRef.current.length > 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 4]);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(channelPtsRef.current[0][0] * W, channelPtsRef.current[0][1] * H);
        for (let i = 1; i < channelPtsRef.current.length; i++) {
          ctx.lineTo(channelPtsRef.current[i][0] * W, channelPtsRef.current[i][1] * H);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // ── Tool cursor indicator for force tools ─────────────────────────────
      renderToolCursor(ctx, toolRef.current, W, H, tick2);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      // Dispose 3D renderer when the lab becomes inactive
      if (renderer3DRef.current) {
        renderer3DRef.current.detachHandlers();
        renderer3DRef.current.dispose();
        renderer3DRef.current = null;
      }
    };
  }, [active]); // eslint-disable-line

  // ── Spawn/erase agents helpers ────────────────────────────────────────────
  const applyAgentTool = useCallback((x: number, y: number, lx: number, ly: number, W: number, H: number) => {
    const ts = toolRef.current;
    if (ts.activeToolId === 'spawn_brush') {
      const nx = x / W, ny = y / H;
      const dx = x - lx, dy = y - ly;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
      const vel = ts.pressure * 0.007;
      const vx = (dx / dist) * vel;
      const vy = (dy / dist) * vel;
      const count = Math.max(1, Math.round(ts.pressure * ts.size * 0.18));
      const spread = (ts.size / Math.max(W, H)) * 0.55;
      const newQ = spawnQuantaAtPoint(
        dnaRef.current, nx, ny, vx, vy, count, spread, ts.colorIndex
      );
      // ── Assign geo kinds to spawned quanta in non-fluid mode ──────────────
      const gpSpawn = geoParamsRef.current;
      if (gpSpawn.mode !== 'fluid' && newQ.length > 0) {
        syncDerivedParams(gpSpawn);
        assignKindByGeoParams(newQ, gpSpawn);
      }
      quantaRef.current = [...quantaRef.current, ...newQ].slice(-4000);
      setQuantaCount(quantaRef.current.length);
    } else if (ts.activeToolId === 'erase_agents') {
      const nx = x / W, ny = y / H;
      const radius = (ts.size / Math.max(W, H)) * 0.75;
      const r2 = radius * radius;
      const before = quantaRef.current.length;
      quantaRef.current = quantaRef.current.filter(q => {
        const dx = q.x - nx, dy = q.y - ny;
        return dx * dx + dy * dy > r2;
      });
      if (quantaRef.current.length !== before) setQuantaCount(quantaRef.current.length);
    }
  }, []);

  // ── Canvas pointer events (coords in canvas buffer space to fix cursor offset) ─
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    canvasPointerIdRef.current = e.pointerId;
    const rect = e.currentTarget.getBoundingClientRect();
    const W = e.currentTarget.width  || canvasSize.w;
    const H = e.currentTarget.height || canvasSize.h;
    const scaleX = rect.width > 0 ? W / rect.width : 1;
    const scaleY = rect.height > 0 ? H / rect.height : 1;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setToolState(ts => {
      const next = { ...ts, isDragging: true, lastX: x, lastY: y };
      toolRef.current = next;

      // Agent tools
      if (ts.activeToolId === 'spawn_brush' || ts.activeToolId === 'erase_agents') {
        applyAgentTool(x, y, x, y, W, H);
      }

      // Field tools
      if (['attractor','repulsor','flow_comb','vortex','solve','coagula'].includes(ts.activeToolId)) {
        applyToolToField(
          fieldsRef.current, x / W, y / H,
          ts.size / Math.max(W, H),
          ts.activeToolId as 'attractor',
          ts.pressure, Math.atan2(0, 1)
        );
      }

      // Guide tools — start drawing a fixed line (flow_paint or pinch)
      if (ts.activeToolId === 'flow_paint' || ts.activeToolId === 'pinch') {
        guideDrawingRef.current = {
          x1: x / W, y1: y / H, x2: x / W, y2: y / H,
          type: ts.activeToolId === 'flow_paint' ? 'flow' : 'pinch',
        };
      }

      // Channel tool — start collecting freehand pencil points
      if (ts.activeToolId === 'channel') {
        channelPtsRef.current = [[x / W, y / H]];
      }

      // Brush tools (legacy)
      if (['ink_brush','dust_brush','glow_brush','eraser','mask_brush','glyph_stamp'].includes(ts.activeToolId)) {
        // These tools are hidden from UI but still technically accessible
      }

      gesturesRef.current.push({ toolId: ts.activeToolId, x, y, size: ts.size, timestamp: Date.now() });
      if (gesturesRef.current.length > 100) gesturesRef.current.shift();
      return next;
    });
  }, [canvasSize.w, canvasSize.h, applyAgentTool]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!toolRef.current.isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const W  = e.currentTarget.width  || canvasSize.w;
    const H  = e.currentTarget.height || canvasSize.h;
    const scaleX = rect.width > 0 ? W / rect.width : 1;
    const scaleY = rect.height > 0 ? H / rect.height : 1;
    const x  = (e.clientX - rect.left) * scaleX;
    const y  = (e.clientY - rect.top) * scaleY;
    const lx = toolRef.current.lastX;
    const ly = toolRef.current.lastY;

    setToolState(ts => {
      const ddx = x - lx, ddy = y - ly;
      const dlen = Math.sqrt(ddx * ddx + ddy * ddy) + 0.0001;
      const next = { ...ts, lastX: x, lastY: y, dragDX: ddx / dlen, dragDY: ddy / dlen };
      toolRef.current = next;

      // Agent tools
      if (ts.activeToolId === 'spawn_brush' || ts.activeToolId === 'erase_agents') {
        applyAgentTool(x, y, lx, ly, W, H);
      }

      // Field tools (but NOT flow_paint or channel -- those now create persistent structures)
      if (['attractor','repulsor','flow_comb','vortex','solve','coagula'].includes(ts.activeToolId)) {
        const angle = Math.atan2(y - ly, x - lx);
        applyToolToField(
          fieldsRef.current, x / W, y / H,
          ts.size / Math.max(W, H),
          ts.activeToolId as 'attractor',
          ts.pressure * 0.5, angle
        );
      }

      // Guide line preview — update endpoint
      if ((ts.activeToolId === 'flow_paint' || ts.activeToolId === 'pinch') && guideDrawingRef.current) {
        guideDrawingRef.current.x2 = x / W;
        guideDrawingRef.current.y2 = y / H;
      }

      // Channel pencil — collect points (subsample every ~4px)
      if (ts.activeToolId === 'channel' && channelPtsRef.current.length > 0) {
        const lastPt = channelPtsRef.current[channelPtsRef.current.length - 1];
        const dx2 = x / W - lastPt[0], dy2 = y / H - lastPt[1];
        if (dx2 * dx2 + dy2 * dy2 > 0.00003) {
          channelPtsRef.current.push([x / W, y / H]);
        }
      }

      return next;
    });
  }, [canvasSize.w, canvasSize.h, applyAgentTool]);

  const handlePointerUp = useCallback((e?: React.PointerEvent<HTMLCanvasElement>) => {
    const el = e?.currentTarget ?? mainCanvasRef.current;
    const pid = (e?.pointerId ?? canvasPointerIdRef.current);
    if (el && pid !== null && pid !== undefined) {
      try {
        if (typeof (el as any).hasPointerCapture === 'function' && (el as any).hasPointerCapture(pid)) {
          (el as any).releasePointerCapture(pid);
        }
      } catch { /* ignore */ }
    }
    canvasPointerIdRef.current = null;
    const ts = toolRef.current;

    // Finalize guide line
    if ((ts.activeToolId === 'flow_paint' || ts.activeToolId === 'pinch') && guideDrawingRef.current) {
      const d = guideDrawingRef.current;
      const dx = d.x2 - d.x1, dy = d.y2 - d.y1;
      if (dx * dx + dy * dy > 0.001) {
        const color = guideColorRef.current || (dnaRef.current.palette[toolRef.current.colorIndex % dnaRef.current.palette.length] ?? '#40b0ff');
        guideLinesRef.current.push({
          id: `gl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2,
          type: guideLineModeRef.current || d.type, color, strength: ts.pressure,
          thickness: guideStrokeRef.current,
        });
        setGuideCount(guideLinesRef.current.length + channelPathsRef.current.length);
      }
      guideDrawingRef.current = null;
    }

    // Finalize channel path
    if (ts.activeToolId === 'channel' && channelPtsRef.current.length > 2) {
      const color = guideColorRef.current || (dnaRef.current.palette[toolRef.current.colorIndex % dnaRef.current.palette.length] ?? '#40b0ff');
      channelPathsRef.current.push({
        id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        points: [...channelPtsRef.current], color, strength: ts.pressure,
        thickness: guideStrokeRef.current,
        smoothness: guideCurvatureRef.current,
        behavior: guidePathModeRef.current,
      });
      setGuideCount(guideLinesRef.current.length + channelPathsRef.current.length);
    }
    channelPtsRef.current = [];

    setToolState(tsState => {
      const next = { ...tsState, isDragging: false };
      toolRef.current = next;
      return next;
    });
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  // handleDNAChange must be declared BEFORE handlePreset (which depends on it)
  const handleDNAChange = useCallback((newDNA: DNA) => {
    // Just update DNA ref — physics adapts naturally next frame WITHOUT resetting painting
    setDNA(newDNA);
    dnaRef.current = newDNA;
    // Add/remove agents when quantaCount changes (no full recreate)
    if (newDNA.quantaCount !== quantaRef.current.length) {
      if (newDNA.quantaCount > quantaRef.current.length) {
        const extra = createQuanta(
          { ...newDNA, quantaCount: newDNA.quantaCount - quantaRef.current.length },
          seedRef.current + Date.now()
        );
        quantaRef.current = [...quantaRef.current, ...extra];
      } else {
        quantaRef.current = quantaRef.current.slice(0, newDNA.quantaCount);
      }
      setQuantaCount(quantaRef.current.length);
    }
  }, []);

  const handlePreset = useCallback((preset: DNA) => {
    const newDNA = { ...preset };
    // Apply DNA WITHOUT resetting particle positions — genes/palette adapt in-place
    handleDNAChange(newDNA);
    // Rebuild flow field and interaction matrix to match new DNA style (no position reset)
    generateFlowField(fieldsRef.current, newDNA, seedRef.current);
    const mat = buildInteractionMatrix(newDNA, seedRef.current);
    fieldsRef.current.interactionMatrix = mat;
    setMatrixValues(Array.from(mat));
    if (autoGuidesPreset) {
      clearGuides();
      spawnAutoGuides('preset', newDNA);
    }
    setGrimoire(prev => addGrimoireEntry(prev, `DNA: ${preset.name ?? '?'}`, 'milestone'));
  }, [handleDNAChange, autoGuidesPreset]);

  // ── Geo param helpers ─────────────────────────────────────────────────────
  const handleGeoParamChange = useCallback((key: keyof GeoParams, val: GeoParams[keyof GeoParams]) => {
    setGeoParams(prev => {
      const next = { ...prev, [key]: val } as GeoParams;
      syncDerivedParams(next);
      geoParamsRef.current = next;
      // Re-assign kinds if mode changed or mix changed
      const keyStr = key as string;
      if ((keyStr === 'mode' || keyStr.startsWith('mix') || keyStr === 'macroAtmosphere') &&
          quantaRef.current.length > 0) {
        if (next.mode === 'fluid') {
          clearGeoKinds(quantaRef.current);
        } else {
          // Assign kinds for geometric/hybrid/3d modes
          assignKindByGeoParams(quantaRef.current, next);
        }
      }
      // Dispose 3D renderer when switching away from 3D
      if (keyStr === 'mode' && val !== '3d' && renderer3DRef.current) {
        renderer3DRef.current.detachHandlers();
        renderer3DRef.current.dispose();
        renderer3DRef.current = null;
      }
      return next;
    });
  }, []);

  const handleGeoModeSelect = useCallback((m: GeoParams['mode']) => {
    handleGeoParamChange('mode', m);
    // UX: entering Geo/Hybrid/3D should reveal its params automatically.
    if (m !== 'fluid') {
      setRightPanel('geo');
    } else {
      // UX: returning to fluid should bring core controls back by default.
      setRightPanel('physics');
    }
  }, [handleGeoParamChange]);

  const handleGeoPanelParamChange = useCallback((key: keyof GeoParams, val: GeoParams[keyof GeoParams]) => {
    if (key === 'mode') {
      handleGeoModeSelect(val as GeoParams['mode']);
      return;
    }
    handleGeoParamChange(key, val);
  }, [handleGeoModeSelect, handleGeoParamChange]);

  // UX safety: always allow exiting cinematic with Escape.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCinematic(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7859/ingest/0abf9fcf-b217-4f00-9c34-3f0a1bb469c8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4659b2'},body:JSON.stringify({sessionId:'4659b2',runId:'repro-2',hypothesisId:'H0',location:'MetaArtLab.tsx:1525',message:'metaart_mount_ping',data:{active},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [active]);

  const applyGeoPresetByKey = useCallback((key: string, dnaPreset?: DNA) => {
    const gp = GEO_PRESET_PARAMS[key];
    if (!gp) return;
    // Merge with defaults so old presets missing new FX fields still work
    const next = { ...createDefaultGeoParams(), ...gp };
    syncDerivedParams(next);
    geoParamsRef.current = next;
    setGeoParams(next);
    // Dispose 3D renderer if switching away from 3D
    if (next.mode !== '3d' && renderer3DRef.current) {
      renderer3DRef.current.detachHandlers();
      renderer3DRef.current.dispose();
      renderer3DRef.current = null;
    }
    if (dnaPreset) {
      setDNA(dnaPreset);
      initSim(dnaPreset, Date.now());
    } else if (quantaRef.current.length > 0 && next.mode !== 'fluid') {
      assignKindByGeoParams(quantaRef.current, next);
    }
  }, [initSim]);

  // ── Import a “cover” snapshot from MusicLab ────────────────────────────────
  const handleImportFromMusicLab = useCallback(() => {
    const snap = loadMusicSnapshotFromStorage();
    if (!snap) {
      setGrimoire(prev => addGrimoireEntry(prev, 'Nenhum snapshot do MusicLab encontrado', 'observation'));
      setRightPanel('physics');
      return;
    }
    const cfg = musicSnapshotToMetaArtConfig(snap);

    // Apply overlays
    setOverlays(cfg.overlays);

    // Apply Geo params (merge with defaults for forward-compat)
    const nextGeo = { ...createDefaultGeoParams(), ...cfg.geo };
    syncDerivedParams(nextGeo);
    geoParamsRef.current = nextGeo;
    setGeoParams(nextGeo);
    // Dispose 3D renderer if switching away from 3D
    if (nextGeo.mode !== '3d' && renderer3DRef.current) {
      renderer3DRef.current.detachHandlers();
      renderer3DRef.current.dispose();
      renderer3DRef.current = null;
    }

    // Apply DNA and reinit
    setDNA(cfg.dna);
    initSim(cfg.dna, cfg.seed);
    setRightPanel('physics');
    setGrimoire(prev => addGrimoireEntry(
      prev,
      `Importado do MusicLab: ${snap.preset.name} · ${snap.preset.bpm}bpm · ${snap.preset.root} ${snap.preset.scale}`,
      'milestone',
    ));
  }, [initSim]);

  const handleMutate = useCallback((variants: DNA[]) => {
    const list = variants.length > 0 ? variants : mutateDNA(dnaRef.current, 0.28, 8);
    const cards = list.map((d, i) => ({
      id: `vit-${Date.now()}-${i}`,
      dna: d,
      thumbnail: generateThumbnail(d, 96),
      pinned: false,
      favorite: false,
      seed: seedRef.current + i * 7919,
      label: `M${i + 1}`,
    }));
    setVitrine(cards);
    setRightPanel('vitrine');
    setGrimoire(prev => addGrimoireEntry(prev, `${list.length} variantes geradas`, 'suggestion'));
  }, []);

  const handleCaptureSnapshot = useCallback(() => {
    // In 3D mode capture the WebGL canvas (preserveDrawingBuffer=true ensures it's readable)
    const canvas = geoParamsRef.current.mode === '3d'
      ? (canvas3DRef.current ?? mainCanvasRef.current)
      : mainCanvasRef.current;
    if (!canvas) return;
    const entry = captureSnapshot(canvas, dnaRef.current, seedRef.current, gesturesRef.current);
    setArchive(prev => [entry, ...prev].slice(0, 50));
    setRightPanel('archive');
    setGrimoire(prev => addGrimoireEntry(prev, 'snapshot capturado', 'milestone'));
  }, []);

  const clearGuides = useCallback(() => {
    guideLinesRef.current = [];
    channelPathsRef.current = [];
    guideDrawingRef.current = null;
    channelPtsRef.current = [];
    setGuideCount(0);
  }, []);

  const retuneGuidesLive = useCallback((patch: {
    color?: string;
    thickness?: number;
    smoothness?: number;
    lineMode?: GuideLineType;
    pathMode?: 'stream' | 'orbit' | 'shock';
  }) => {
    if (guideLinesRef.current.length > 0) {
      guideLinesRef.current = guideLinesRef.current.map(g => ({
        ...g,
        color: patch.color ?? g.color,
        thickness: patch.thickness ?? g.thickness,
        type: patch.lineMode ?? g.type,
      }));
    }
    if (channelPathsRef.current.length > 0) {
      channelPathsRef.current = channelPathsRef.current.map(c => ({
        ...c,
        color: patch.color ?? c.color,
        thickness: patch.thickness ?? c.thickness,
        smoothness: patch.smoothness ?? c.smoothness,
        behavior: patch.pathMode ?? c.behavior,
      }));
    }
  }, []);

  const spawnAutoGuides = useCallback((mode: 'preset' | 'random', dnaSrc?: DNA) => {
    const baseDNA = dnaSrc ?? dnaRef.current;
    const colA = guideColorRef.current || (baseDNA.palette[0] ?? '#40b0ff');
    const colB = baseDNA.palette[Math.floor(Math.random() * Math.max(1, baseDNA.palette.length))] ?? colA;
    const stroke = Math.max(0.6, guideStrokeRef.current);
    const smoothness = Math.max(0, Math.min(1, guideCurvatureRef.current));
    const guideN = mode === 'random' ? 3 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);
    const channelN = mode === 'random' ? 1 + Math.floor(Math.random() * 2) : 1;

    const newGuides: GuideLine[] = [];
    const lineModes: GuideLineType[] = ['flow', 'pinch', 'shear', 'barrier', 'spiral', 'funnel', 'repulsor', 'attractor', 'wave', 'orbit_line'];
    const pathModes: Array<'stream' | 'orbit' | 'shock'> = ['stream', 'orbit', 'shock'];
    for (let i = 0; i < guideN; i++) {
      const side = Math.floor(Math.random() * 4);
      const inward = 0.16 + Math.random() * 0.22;
      let x1 = Math.random(), y1 = Math.random();
      if (side === 0) { x1 = 0.02; y1 = Math.random(); }
      if (side === 1) { x1 = 0.98; y1 = Math.random(); }
      if (side === 2) { x1 = Math.random(); y1 = 0.02; }
      if (side === 3) { x1 = Math.random(); y1 = 0.98; }
      const x2 = Math.max(0.03, Math.min(0.97, x1 + (0.5 - x1) * inward + (Math.random() - 0.5) * 0.45));
      const y2 = Math.max(0.03, Math.min(0.97, y1 + (0.5 - y1) * inward + (Math.random() - 0.5) * 0.45));
      newGuides.push({
        id: `agl-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        x1, y1, x2, y2,
        type: mode === 'random'
          ? lineModes[Math.floor(Math.random() * lineModes.length)]
          : (guideLineModeRef.current ?? 'flow'),
        color: i % 2 === 0 ? colA : colB,
        strength: 0.5 + Math.random() * 0.45,
        thickness: stroke * (0.8 + Math.random() * 0.55),
      });
    }

    const newChannels: ChannelPath[] = [];
    for (let i = 0; i < channelN; i++) {
      const pts: [number, number][] = [];
      const sx = 0.08 + Math.random() * 0.84;
      const sy = 0.08 + Math.random() * 0.84;
      const ang = Math.random() * Math.PI * 2;
      const segs = 10 + Math.floor(Math.random() * 10);
      const amp = 0.04 + smoothness * 0.12;
      for (let p = 0; p < segs; p++) {
        const t = p / (segs - 1);
        const baseX = sx + Math.cos(ang) * (t - 0.5) * (0.45 + Math.random() * 0.18);
        const baseY = sy + Math.sin(ang) * (t - 0.5) * (0.45 + Math.random() * 0.18);
        const wig = Math.sin(t * Math.PI * 2.0 + i) * amp;
        const nx = Math.max(0.02, Math.min(0.98, baseX + Math.cos(ang + Math.PI / 2) * wig));
        const ny = Math.max(0.02, Math.min(0.98, baseY + Math.sin(ang + Math.PI / 2) * wig));
        pts.push([nx, ny]);
      }
      newChannels.push({
        id: `ach-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        points: pts,
        color: i % 2 === 0 ? colB : colA,
        strength: 0.46 + Math.random() * 0.4,
        thickness: stroke * (0.85 + Math.random() * 0.5),
        smoothness,
        behavior: mode === 'random'
          ? pathModes[Math.floor(Math.random() * pathModes.length)]
          : (guidePathModeRef.current ?? 'stream'),
      });
    }

    guideLinesRef.current = [...guideLinesRef.current, ...newGuides];
    channelPathsRef.current = [...channelPathsRef.current, ...newChannels];
    setGuideCount(guideLinesRef.current.length + channelPathsRef.current.length);
  }, []);

  const handleClearAll = useCallback(() => {
    // Clear the "board": persistent layers + live agents + fields.
    for (const layer of layersRef.current) {
      if (!layer.canvas) continue;
      if (layer.id === 'trail' || layer.id === 'brush') {
        const ctx = layer.canvas.getContext('2d')!;
        ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      }
    }
    quantaRef.current = [];
    setQuantaCount(0);
    gesturesRef.current = [];
    const fields = createFieldGrid();
    generateFlowField(fields, dnaRef.current, seedRef.current);
    fields.interactionMatrix = buildInteractionMatrix(dnaRef.current, seedRef.current);
    fieldsRef.current = fields;
    setMatrixValues(Array.from(fields.interactionMatrix));
    setGrimoire(prev => addGrimoireEntry(prev, 'tela limpa — reinício do gesto', 'observation'));
  }, []);

  const primeWhiteCanvas = useCallback((dnaOverride?: DNA, note?: string) => {
    if (dnaOverride) {
      setDNA(dnaOverride);
      dnaRef.current = dnaOverride;
    }
    for (const layer of layersRef.current) {
      if (!layer.canvas) continue;
      const ctx = layer.canvas.getContext('2d')!;
      ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    }
    quantaRef.current = [];
    setQuantaCount(0);
    gesturesRef.current = [];
    const fields = createFieldGrid();
    generateFlowField(fields, dnaRef.current, seedRef.current);
    fields.interactionMatrix = buildInteractionMatrix(dnaRef.current, seedRef.current);
    fieldsRef.current = fields;
    setMatrixValues(Array.from(fields.interactionMatrix));
    clearGuides();
    // White board should remain live: no forced pause.
    setPaused(false);
    pausedRef.current = false;
    setGrimoire(prev => addGrimoireEntry(prev, note ?? 'blank canvas — tela viva para pintura em tempo real', 'milestone'));
  }, [clearGuides]);

  const handleBlankCanvas = useCallback(() => {
    primeWhiteCanvas(undefined, 'blank canvas — tela viva para pintura em tempo real');
  }, [primeWhiteCanvas]);

  const handleApplyRitual = useCallback(() => {
    const seed = buildRitualSeed(ritualAnswers);
    setSpawnPattern(seed.spawn);
    spawnPatternRef.current = seed.spawn;
    setToolState(prev => {
      const next = { ...prev, activeToolId: seed.tool };
      toolRef.current = next;
      return next;
    });
    setSimSpeed(seed.speed);
    simSpeedRef.current = seed.speed;
    setSizeMul(seed.size);
    sizeMulRef.current = seed.size;
    primeWhiteCanvas(seed.dna, `ritual aplicado — ${seed.dna.name ?? 'preset espiritual'}`);
    ritualDoneRef.current = true;
    setRitualOpen(false);
  }, [buildRitualSeed, ritualAnswers, primeWhiteCanvas]);

  const handleLayerChange = useCallback((id: string, patch: Partial<LayerState>) => {
    layersRef.current = layersRef.current.map(l => l.id === id ? { ...l, ...patch } : l);
    setLayers(layersRef.current.map(l => ({ ...l })));
  }, []);

  const handleClearLayer = useCallback((id: string) => {
    const layer = getLayer(layersRef.current, id as LayerState['id']);
    if (layer) clearLayer(layer);
  }, []);

  const handleVitrineSelect = useCallback((card: VitrineCard) => {
    setSelectedVitrine(card.id);
    handleDNAChange(card.dna);
  }, [handleDNAChange]);

  const handleVitrinePin = useCallback((cardId: string) => {
    setVitrine(prev => {
      const card = prev.find(c => c.id === cardId);
      if (card) setPinnedDNA(card.dna);
      return prev.map(c => c.id === cardId ? { ...c, pinned: !c.pinned } : c);
    });
  }, []);

  const handleRestoreEntry = useCallback((entry: ArchiveEntry) => {
    handleDNAChange(entry.dna);
    seedRef.current = entry.seed;
    setGrimoire(prev => addGrimoireEntry(prev, 'snapshot restaurado', 'observation'));
  }, [handleDNAChange]);

  const handleHubLoadPreset = useCallback((newDNA: DNA) => {
    handleDNAChange(newDNA);
    initSim(newDNA, seedRef.current);
  }, [handleDNAChange, initSim]);

  const handleHubLoadArte = useCallback((newDNA: DNA, seed: number) => {
    handleDNAChange(newDNA);
    seedRef.current = seed;
    initSim(newDNA, seed);
  }, [handleDNAChange, initSim]);

  // ── Random Canvas — truly random DNA + agents ─────────────────────────────
  const handleRandomCanvas = useCallback(() => {
    const newDNA = generateFullyRandomDNA();
    setDNA(newDNA);
    dnaRef.current = newDNA;
    clearGuides();
    initSim(newDNA, Date.now());
    if (autoGuidesRandom) spawnAutoGuides('random', newDNA);
    setGrimoire(prev => addGrimoireEntry(prev, 'DNA completamente aleatorio gerado', 'milestone'));
  }, [initSim, autoGuidesRandom, clearGuides, spawnAutoGuides]);

  // ── Spawn singleton big agent ─────────────────────────────────────────────
  const handleSpawnSingleton = useCallback(() => {
    const dna_ = dnaRef.current;
    const canvas = mainCanvasRef.current;
    const W = canvas?.width ?? canvasSize.w;
    const H = canvas?.height ?? canvasSize.h;
    const palette = dna_.palette;
    const cidx = Math.floor(Math.random() * palette.length);
    const hex = palette[cidx] ?? '#ff88cc';
    const [hue, sat, lit] = (window as any).__metaHexToHSL ? (window as any).__metaHexToHSL(hex) : [300, 0.8, 0.6];
    // Simple inline hue extraction
    const r2 = parseInt(hex.slice(1,3),16)/255, g2=parseInt(hex.slice(3,5),16)/255, b2=parseInt(hex.slice(5,7),16)/255;
    const mx=Math.max(r2,g2,b2), mn=Math.min(r2,g2,b2);
    let h2=0; const d2=mx-mn;
    if(d2!==0){if(mx===r2)h2=((g2-b2)/d2+(g2<b2?6:0))/6;else if(mx===g2)h2=((b2-r2)/d2+2)/6;else h2=((r2-g2)/d2+4)/6;}
    const l2=(mx+mn)/2;
    const s2=mx===mn?0:(l2>0.5?d2/(2-mx-mn):d2/(mx+mn));
    const singl: import('../../sim/metaart/metaArtTypes').Quantum = {
      x: 0.5 + (Math.random() - 0.5) * 0.1,
      y: 0.5 + (Math.random() - 0.5) * 0.1,
      vx: (Math.random() - 0.5) * 0.004,
      vy: (Math.random() - 0.5) * 0.004,
      charge: 0.5, ink: 1.0, mood: 0.5,
      role: 'DRAW', species: cidx % 6,
      memX: new Float32Array([0.5,0.5,0.5,0.5,0.5,0.5]),
      memY: new Float32Array([0.5,0.5,0.5,0.5,0.5,0.5]),
      memIdx: 0, age: 0,
      hue: h2 * 360, sat: s2, lit: l2,
      alpha: 1.0,
      size: singletonSize * 3,
      glyphIndex: 0,
      isSingleton: true,
      angle: 0,
    };
    quantaRef.current = [...quantaRef.current, singl];
    setQuantaCount(quantaRef.current.length);
  }, [canvasSize.w, canvasSize.h, singletonSize]);

  // ── Powers callbacks ──────────────────────────────────────────────────────
  const handleRecolorSpecies = useCallback((species: number, hex: string) => {
    const r2=parseInt(hex.slice(1,3),16)/255, g2=parseInt(hex.slice(3,5),16)/255, b2=parseInt(hex.slice(5,7),16)/255;
    const mx=Math.max(r2,g2,b2), mn=Math.min(r2,g2,b2);
    let h2=0; const d2=mx-mn;
    if(d2!==0){if(mx===r2)h2=((g2-b2)/d2+(g2<b2?6:0))/6;else if(mx===g2)h2=((b2-r2)/d2+2)/6;else h2=((r2-g2)/d2+4)/6;}
    const l2=(mx+mn)/2;
    const s2=mx===mn?0:(l2>0.5?d2/(2-mx-mn):d2/(mx+mn));
    // Update palette
    const newPalette = [...dnaRef.current.palette];
    newPalette[species % newPalette.length] = hex;
    const newDNA = { ...dnaRef.current, palette: newPalette };
    setDNA(newDNA); dnaRef.current = newDNA;
    // Recolor existing agents of this species
    for (const q of quantaRef.current) {
      if (q.species === species) {
        q.hue = h2 * 360 + (Math.random() - 0.5) * 8;
        q.sat = Math.max(0.2, Math.min(1, s2 + (Math.random()-0.5)*0.05));
        q.lit = Math.max(0.15, Math.min(0.85, l2 + (Math.random()-0.5)*0.04));
      }
    }
  }, []);

  const handleSetAllShape = useCallback((shape: import('../../sim/metaart/metaArtTypes').AgentShape) => {
    const newDNA = { ...dnaRef.current, genes: { ...dnaRef.current.genes, agentShape: shape } };
    setDNA(newDNA); dnaRef.current = newDNA;
  }, []);

  const getPowerCenter = useCallback(() => {
    const W = Math.max(1, canvasSize.w);
    const H = Math.max(1, canvasSize.h);
    const lx = toolRef.current.lastX / W;
    const ly = toolRef.current.lastY / H;
    if (Number.isFinite(lx) && Number.isFinite(ly) && lx >= 0 && lx <= 1 && ly >= 0 && ly <= 1) {
      return { cx: lx, cy: ly };
    }
    return { cx: 0.5, cy: 0.5 };
  }, [canvasSize.w, canvasSize.h]);
  const dbgPower = useCallback((runId: string, hypothesisId: string, message: string, data: Record<string, unknown>) => {
    // #region agent log
    fetch('http://127.0.0.1:7859/ingest/0abf9fcf-b217-4f00-9c34-3f0a1bb469c8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4659b2'},body:JSON.stringify({sessionId:'4659b2',runId,hypothesisId,location:'MetaArtLab.tsx:1900',message,data,timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, []);

  const handleChaosInject = useCallback((k = 2.4) => {
    // #region agent log
    dbgPower('repro-1', 'H3', 'handler_enter_chaos', { k, quanta: quantaRef.current.length });
    // #endregion
    const prev = dnaRef.current.genes.entropy;
    const newDNA = { ...dnaRef.current, genes: { ...dnaRef.current.genes, entropy: 1 } };
    setDNA(newDNA); dnaRef.current = newDNA;
    const s = Math.max(1, k);
    for (const q of quantaRef.current) {
      q.vx += (Math.random() - 0.5) * 0.09 * s;
      q.vy += (Math.random() - 0.5) * 0.09 * s;
    }
    setTimeout(() => {
      const restored = { ...dnaRef.current, genes: { ...dnaRef.current.genes, entropy: prev } };
      setDNA(restored); dnaRef.current = restored;
    }, 2000);
  }, [dbgPower]);

  const handleFreezeAll = useCallback((k = 2.4) => {
    // #region agent log
    dbgPower('repro-1', 'H3', 'handler_enter_freeze', { k, quanta: quantaRef.current.length });
    // #endregion
    const f = Math.max(0, 1 - Math.max(1, k) * 0.35);
    for (const q of quantaRef.current) { q.vx *= f; q.vy *= f; }
  }, [dbgPower]);

  const handlePulseAll = useCallback((k = 2.4) => {
    const s = Math.max(1, k);
    for (const q of quantaRef.current) {
      const a = Math.random() * Math.PI * 2;
      const spd = (0.03 + Math.random() * 0.05) * s;
      q.vx += Math.cos(a) * spd; q.vy += Math.sin(a) * spd;
    }
  }, []);

  const handleScatterAll = useCallback((k = 2.4) => {
    const s = Math.max(1, k);
    const { cx, cy } = getPowerCenter();
    for (const q of quantaRef.current) {
      q.vx -= (cx - q.x) * 0.12 * s;
      q.vy -= (cy - q.y) * 0.12 * s;
    }
  }, [getPowerCenter]);

  const handleExplodeAll = useCallback((k = 2.8) => {
    const s = Math.max(1, k);
    const { cx, cy } = getPowerCenter();
    // #region agent log
    dbgPower('repro-1', 'H3', 'handler_enter_explode', { k, s, cx, cy, quanta: quantaRef.current.length });
    // #endregion
    for (const q of quantaRef.current) {
      const dx = q.x - cx;
      const dy = q.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.0001;
      const f = (0.06 + Math.random() * 0.08) * s / (d * 5 + 1);
      q.vx += (dx / d) * f;
      q.vy += (dy / d) * f;
    }
  }, [getPowerCenter, dbgPower]);

  const handleBlackHoleAll = useCallback((k = 2.8) => {
    const s = Math.max(1, k);
    const { cx, cy } = getPowerCenter();
    // #region agent log
    dbgPower('repro-1', 'H3', 'handler_enter_black_hole', { k, s, cx, cy, quanta: quantaRef.current.length });
    // #endregion
    for (const q of quantaRef.current) {
      const dx = cx - q.x;
      const dy = cy - q.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.0001;
      const pull = (0.09 * s) / (d * 4 + 0.015);
      q.vx += (dx / d) * pull;
      q.vy += (dy / d) * pull;
      // Orbital component
      q.vx += (-dy / d) * 0.02 * s;
      q.vy += (dx / d) * 0.02 * s;
      if (d < 0.04) {
        q.x = ((1 - q.x) + (Math.random() - 0.5) * 0.08 + 1) % 1;
        q.y = ((1 - q.y) + (Math.random() - 0.5) * 0.08 + 1) % 1;
      }
    }
  }, [getPowerCenter, dbgPower]);

  const handleHarmonizeAll = useCallback((k = 2.8) => {
    const s = Math.max(1, k);
    // #region agent log
    dbgPower('repro-1', 'H3', 'handler_enter_harmonize', { k, s, quanta: quantaRef.current.length });
    // #endregion
    const nextDNA = {
      ...dnaRef.current,
      genes: {
        ...dnaRef.current.genes,
        coherence: Math.min(1, (dnaRef.current.genes.coherence ?? 0.5) + 0.28 * s),
        entropy: Math.max(0, (dnaRef.current.genes.entropy ?? 0.5) - 0.24 * s),
        flow: Math.min(1, (dnaRef.current.genes.flow ?? 0.5) + 0.15 * s),
      },
    };
    setDNA(nextDNA);
    dnaRef.current = nextDNA;
    const mat = new Float32Array(36);
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        mat[i * 6 + j] = 0.25 + Math.random() * 0.40;
      }
    }
    fieldsRef.current.interactionMatrix = mat;
    setMatrixValues(Array.from(mat));
    for (const q of quantaRef.current) {
      q.vx *= 0.72;
      q.vy *= 0.72;
    }
  }, [dbgPower]);

  const handleShockAll = useCallback((k = 2.4) => {
    const s = Math.max(1, k);
    const { cx, cy } = getPowerCenter();
    for (const q of quantaRef.current) {
      const dx = q.x - cx; const dy = q.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.0001;
      const ring = Math.sin(Math.min(1, d * 18) * Math.PI);
      const f = (0.10 * s * ring) / (d * 4 + 1);
      q.vx += (dx / d) * f;
      q.vy += (dy / d) * f;
    }
  }, [getPowerCenter]);

  const handleMagnetizeAll = useCallback((k = 2.4) => {
    const s = Math.max(1, k);
    for (const q of quantaRef.current) {
      const a = Math.atan2(q.vy, q.vx);
      q.vx += Math.cos(a) * 0.02 * s;
      q.vy += Math.sin(a) * 0.02 * s;
    }
  }, []);

  const handleImplodeAll = useCallback((k = 2.4) => {
    const s = Math.max(1, k);
    const { cx, cy } = getPowerCenter();
    for (const q of quantaRef.current) {
      const dx = cx - q.x; const dy = cy - q.y;
      q.vx += dx * 0.11 * s;
      q.vy += dy * 0.11 * s;
    }
  }, [getPowerCenter]);

  const handleTurboAll = useCallback((k = 2.4) => {
    const s = Math.max(1, k);
    for (const q of quantaRef.current) {
      q.vx *= (1.25 + 0.35 * s);
      q.vy *= (1.25 + 0.35 * s);
    }
  }, []);

  const handleVortexAll = useCallback((k = 2.8) => {
    const s = Math.max(1, k);
    const { cx, cy } = getPowerCenter();
    for (const q of quantaRef.current) {
      const dx = q.x - cx; const dy = q.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.0001;
      const t = 0.10 * s / (d * 5 + 1);
      q.vx += (-dy / d) * t;
      q.vy += (dx / d) * t;
    }
  }, [getPowerCenter]);

  const handleRepelAll = useCallback((k = 2.8) => handleExplodeAll(k * 1.1), [handleExplodeAll]);
  const handleAttractAll = useCallback((k = 2.8) => handleImplodeAll(k * 1.1), [handleImplodeAll]);
  const handleCalmAll = useCallback((k = 2.8) => {
    const s = Math.max(1, k);
    const f = Math.max(0.4, 1 - 0.22 * s);
    for (const q of quantaRef.current) { q.vx *= f; q.vy *= f; }
  }, []);
  const handleFluxAll = useCallback((k = 2.8) => {
    const s = Math.max(1, k);
    const { cx, cy } = getPowerCenter();
    for (const q of quantaRef.current) {
      const dx = cx - q.x; const dy = cy - q.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.0001;
      q.vx += (dx / d) * 0.03 * s + (-dy / d) * 0.02 * s;
      q.vy += (dy / d) * 0.03 * s + (dx / d) * 0.02 * s;
    }
  }, [getPowerCenter]);

  const handleActivatePowerBrush = useCallback((toolId: ToolState['activeToolId'], pressure: number, size: number) => {
    setToolState(prev => {
      const next = {
        ...prev,
        activeToolId: toolId,
        pressure: Math.max(0.2, Math.min(6, pressure)),
        size: Math.max(20, Math.min(360, size)),
      };
      toolRef.current = next;
      return next;
    });
  }, []);

  const handleHueRotate = useCallback((deg: number) => {
    for (const q of quantaRef.current) { q.hue = (q.hue + deg + 360) % 360; }
    const newPalette = dnaRef.current.palette.map(hex => {
      const r2=parseInt(hex.slice(1,3),16)/255, g2=parseInt(hex.slice(3,5),16)/255, b2=parseInt(hex.slice(5,7),16)/255;
      const mx=Math.max(r2,g2,b2), mn=Math.min(r2,g2,b2);
      let h2=0; const d2=mx-mn;
      if(d2!==0){if(mx===r2)h2=((g2-b2)/d2+(g2<b2?6:0))*60;else if(mx===g2)h2=((b2-r2)/d2+2)*60;else h2=((r2-g2)/d2+4)*60;}
      const newH = (h2 + deg + 360) % 360;
      const l2=(mx+mn)/2, s2=mx===mn?0:(l2>0.5?d2/(2-mx-mn):d2/(mx+mn));
      // Convert back
      const h3=newH/360, s3=s2, l3=l2;
      const hue2rgb=(p:number,q:number,t:number)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
      const q3=l3<0.5?l3*(1+s3):l3+s3-l3*s3, p3=2*l3-q3;
      const rr=Math.round(hue2rgb(p3,q3,h3+1/3)*255), gg=Math.round(hue2rgb(p3,q3,h3)*255), bb=Math.round(hue2rgb(p3,q3,h3-1/3)*255);
      return `#${rr.toString(16).padStart(2,'0')}${gg.toString(16).padStart(2,'0')}${bb.toString(16).padStart(2,'0')}`;
    });
    const newDNA = { ...dnaRef.current, palette: newPalette };
    setDNA(newDNA); dnaRef.current = newDNA;
  }, []);

  const handleSatShift = useCallback((delta: number) => {
    for (const q of quantaRef.current) {
      q.sat = Math.max(0.05, Math.min(1, q.sat + delta));
    }
  }, []);

  const handleLitShift = useCallback((delta: number) => {
    for (const q of quantaRef.current) {
      q.lit = Math.max(0.05, Math.min(0.95, q.lit + delta));
    }
  }, []);

  const handleSizeAll = useCallback((mul: number) => {
    for (const q of quantaRef.current) {
      q.size = Math.max(0.3, Math.min(30, q.size * mul));
    }
  }, []);

  const handleDNAGeneChange = useCallback((key: string, val: number) => {
    const newDNA = { ...dnaRef.current, genes: { ...dnaRef.current.genes, [key]: val } };
    setDNA(newDNA); dnaRef.current = newDNA;
    // Rebuild interaction matrix when isolation changes
    if (key === 'isolation') {
      const mat = buildInteractionMatrix(newDNA, seedRef.current, val > 0.5);
      fieldsRef.current.interactionMatrix = mat;
      setMatrixValues(Array.from(mat));
    }
  }, []);

  // ── Interaction matrix callbacks ──────────────────────────────────────────
  const handleMatrixCellChange = useCallback((i: number, j: number, val: number) => {
    fieldsRef.current.interactionMatrix[i * 6 + j] = val;
    setMatrixValues(prev => {
      const next = [...prev];
      next[i * 6 + j] = val;
      return next;
    });
  }, []);

  const handleMatrixRandomize = useCallback(() => {
    const mat = buildInteractionMatrix(dnaRef.current, Date.now());
    fieldsRef.current.interactionMatrix = mat;
    setMatrixValues(Array.from(mat));
  }, []);

  const handleMatrixSymmetrize = useCallback(() => {
    const mat = fieldsRef.current.interactionMatrix;
    const next = Array.from(mat);
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        const avg = (mat[i * 6 + j] + mat[j * 6 + i]) / 2;
        mat[i * 6 + j] = avg;
        mat[j * 6 + i] = avg;
        next[i * 6 + j] = avg;
        next[j * 6 + i] = avg;
      }
    }
    setMatrixValues(next);
  }, []);

  const handleMatrixReset = useCallback(() => {
    const mat = buildInteractionMatrix(dnaRef.current, seedRef.current);
    fieldsRef.current.interactionMatrix = mat;
    setMatrixValues(Array.from(mat));
  }, []);

  const handleMatrixPreset = useCallback((type: 'chaos' | 'harmony' | 'predator' | 'bubbles') => {
    const next = new Float32Array(36);
    switch (type) {
      case 'chaos':
        // All repulsion cross-species, neutral self
        for (let i = 0; i < 6; i++)
          for (let j = 0; j < 6; j++)
            next[i * 6 + j] = i === j ? 0.0 : -(0.4 + Math.random() * 0.4);
        break;
      case 'harmony':
        // All attraction
        for (let i = 0; i < 6; i++)
          for (let j = 0; j < 6; j++)
            next[i * 6 + j] = 0.25 + Math.random() * 0.45;
        break;
      case 'predator':
        // Ring chain: 0 hunts 1, 1 hunts 2, ..., 5 hunts 0 (attract forward, repel backward)
        for (let i = 0; i < 6; i++) {
          for (let j = 0; j < 6; j++) {
            const diff = ((j - i) + 6) % 6;
            if (diff === 0) next[i * 6 + j] = 0.55;       // self-cluster
            else if (diff === 1) next[i * 6 + j] = 0.70;  // hunts next
            else if (diff === 5) next[i * 6 + j] = -0.60; // flees prev
            else next[i * 6 + j] = (Math.random() - 0.5) * 0.2;
          }
        }
        break;
      case 'bubbles':
        // Strong self-attraction, strong cross-repulsion → distinct clusters
        for (let i = 0; i < 6; i++)
          for (let j = 0; j < 6; j++)
            next[i * 6 + j] = i === j ? 0.70 + Math.random() * 0.25 : -(0.35 + Math.random() * 0.30);
        break;
    }
    fieldsRef.current.interactionMatrix = next;
    setMatrixValues(Array.from(next));
  }, []);

  const toggleOverlay = useCallback((key: keyof OverlayFlags) => {
    setOverlays(prev => {
      const next = { ...prev, [key]: !prev[key] };
      overlaysRef.current = next;
      return next;
    });
  }, []);

  if (!active) return null;

  const activeTool = TOOL_DEFS.find(t => t.id === toolState.activeToolId);

  // ── Top bar overlay button style ─────────────────────────────────────────
  const ovlBtnStyle = (on: boolean): React.CSSProperties => ({
    ...topBtnSty,
    color: on ? BRIGHT : DIM,
    background: on ? 'rgba(255,0,132,0.06)' : 'transparent',
    borderBottom: on ? `1px solid ${ACCENT}` : '1px solid transparent',
    borderRadius: 1,
    padding: '3px 5px',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 250,
      display: 'flex', flexDirection: 'column',
      paddingTop: cinematic ? 0 : 36,
      background: BG, fontFamily: MONO,
    }}>
      {/* ── Top Bar ── */}
      {!cinematic && (
        <div style={{
          height: 38, display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px',
          borderBottom: `1px solid ${BORDER}`,
          background: BG, flexShrink: 0, zIndex: 2,
        }}>
          {/* Presets */}
          <select
            value=""
            onChange={e => {
              const val = e.target.value;
              // 3D presets are pure GeoParams presets — handle them first
              const geo3DMap: Record<string, string> = {
                'Nebula Drift':    'nebula_drift',
                'Crystal Lattice': 'crystal_lattice',
                'Void Bloom':      'void_bloom',
                'Solar Wind':      'solar_wind',
                'Quantum Foam':    'quantum_foam',
                'Deep Field':      'deep_field',
                'Rizoma 3D':       'rhizome_3d',
              };
              if (geo3DMap[val]) { applyGeoPresetByKey(geo3DMap[val]); return; }

              const all = [...PRESETS, ...EXTRA_PRESETS, ...GEO_PRESETS];
              const preset = all.find(p => p.name === val);
              if (preset) {
                handlePreset(preset);
                // Auto-activate geo mode for geo presets
                const geoPresetKeys: Record<string, string> = {
                  'Constructive Score': 'constructive_score',
                  'Geometric Orchestra': 'geometric_orchestra',
                  'Analytical Collage': 'analytical_collage',
                  'Spiritual Geometry': 'spiritual_geometry',
                };
                const geoKey = geoPresetKeys[preset.name ?? ''];
                if (geoKey) applyGeoPresetByKey(geoKey);
              }
            }}
            style={{
              background: SURFACE, border: `1px solid ${BORDER}`,
              color: MID, fontSize: 9, padding: '3px 8px', borderRadius: 2,
              cursor: 'pointer', fontFamily: MONO, letterSpacing: '0.04em',
            }}>
            <option value="">PRESET</option>
            <optgroup label="Principais">
              {PRESETS.map(p => <option key={p.name} value={p.name ?? ''}>{p.name}</option>)}
            </optgroup>
            <optgroup label="Extra">
              {EXTRA_PRESETS.map(p => <option key={p.name} value={p.name ?? ''}>{p.name}</option>)}
            </optgroup>
            <optgroup label="◈ Geométrico">
              {GEO_PRESETS.map(p => <option key={p.name} value={p.name ?? ''}>◈ {p.name}</option>)}
            </optgroup>
            <optgroup label="⬡ 3D">
              {(['Nebula Drift','Crystal Lattice','Void Bloom','Solar Wind','Quantum Foam','Deep Field','Rizoma 3D']).map(n => (
                <option key={n} value={n}>⬡ {n}</option>
              ))}
            </optgroup>
          </select>

          {/* Spawn Pattern selector */}
          <select
            value={spawnPattern}
            onChange={e => {
              const p = e.target.value as SpawnPattern;
              setSpawnPattern(p);
              spawnPatternRef.current = p;
            }}
            title="Padrão inicial dos agentes"
            style={{
              background: SURFACE, border: `1px solid ${BORDER}`,
              color: DIM, fontSize: 8, padding: '3px 6px', borderRadius: 2,
              cursor: 'pointer', maxWidth: 90, fontFamily: MONO, letterSpacing: '0.04em',
            }}>
            {(Object.entries(SPAWN_PATTERN_LABELS) as [SpawnPattern, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <Divider />

          {/* Play/Pause */}
          <button onClick={() => setPaused(v => !v)}
            title={paused ? 'Continuar' : 'Pausar'}
            style={topBtnSty}>
            {paused ? <Play size={12} strokeWidth={1.5} /> : <Pause size={12} strokeWidth={1.5} />}
          </button>

          {/* Blank Canvas — clears everything and keeps simulation live */}
          <button onClick={handleBlankCanvas} title="Tela em branco viva (limpa tudo e continua em tempo real)"
            style={{ ...topBtnSty, color: '#fff', fontSize: 8, letterSpacing: '0.08em', fontFamily: MONO }}>
            BLANK
          </button>

          {/* Clear canvas */}
          <button onClick={handleClearAll} title="Limpar tela" style={topBtnSty}>
            <RotateCcw size={12} strokeWidth={1.5} />
          </button>

          {/* Clear Guides */}
          {guideCount > 0 && (
            <button
              onClick={clearGuides}
              title="Limpar guias e canais"
              style={{
                ...topBtnSty,
                color: ACCENT,
                background: 'rgba(255,0,132,0.06)',
                border: `1px solid rgba(255,0,132,0.2)`,
                borderRadius: 1, padding: '2px 6px',
              }}>
              <X size={9} strokeWidth={1.2} />
              <span style={{ fontSize: 7, letterSpacing: '0.1em', fontFamily: MONO }}>GUIAS ({guideCount})</span>
            </button>
          )}

          {/* Re-seed (preserves DNA, new positions) */}
          <button onClick={() => initSim(dnaRef.current, Date.now())} title="Resetar simulação (novo seed, posições resetadas)" style={topBtnSty}>
            <RefreshCw size={12} strokeWidth={1.5} />
          </button>

          {/* Random Canvas — fully randomizes DNA */}
          <button onClick={handleRandomCanvas} title="Gerar DNA completamente aleatorio"
            style={{ ...topBtnSty, color: ACCENT }}>
            <span style={{ fontSize: 8, letterSpacing: '0.08em', fontFamily: MONO }}>RAND</span>
          </button>

          {/* Random Colors — re-colors palette AND all existing agents */}
          <button
            onClick={() => {
              const pal = generateRandomPalette(Math.max(4, dnaRef.current.palette.length));
              const newDNA = { ...dnaRef.current, palette: pal };
              setDNA(newDNA);
              dnaRef.current = newDNA;
              recolorQuantaToPalette(quantaRef.current, pal);
            }}
            title="Gerar paleta aleatoria e recolorir agentes"
            style={{ ...topBtnSty, color: 'rgba(255,0,132,0.6)' }}>
            <span style={{ fontSize: 8, letterSpacing: '0.08em', fontFamily: MONO }}>CLR</span>
          </button>

          <Divider />

          {/* Boundary mode */}
          <select
            value={geoParams.boundaryMode ?? 'wrap'}
            onChange={e => handleGeoParamChange('boundaryMode', e.target.value as any)}
            title="Modo de bordas do canvas"
            style={{
              background: SURFACE, border: `1px solid ${BORDER}`,
              color: DIM, fontSize: 8, padding: '3px 6px', borderRadius: 2,
              cursor: 'pointer', fontFamily: MONO,
            }}>
            <option value="wrap">↺ Wrap</option>
            <option value="bounce">↕ Bounce</option>
            <option value="absorb">◌ Absorb</option>
            <option value="open">⊙ Open</option>
          </select>

          {/* Show border toggle */}
          <button
            onClick={() => handleGeoParamChange('showBorder', !geoParams.showBorder)}
            title="Exibir borda do canvas"
            style={{
              ...topBtnSty,
              color: geoParams.showBorder ? BRIGHT : DIM,
              background: geoParams.showBorder ? 'rgba(255,0,132,0.06)' : 'transparent',
              borderRadius: 1, padding: '2px 4px',
              borderBottom: geoParams.showBorder ? `1px solid ${ACCENT}` : '1px solid transparent',
            }}>
            <span style={{ fontSize: 8 }}>⬛</span>
          </button>

          <Divider />

          {/* Overlay toggles */}
          <button
            onClick={() => toggleOverlay('connections')}
            title="Conexoes entre quanta"
            style={ovlBtnStyle(overlays.connections)}>
            <Link2 size={12} strokeWidth={1.5} />
            <span style={{ fontSize: 8, marginLeft: 2 }}>CON</span>
          </button>
          <button
            onClick={() => toggleOverlay('glow')}
            title="Brilho aditivo"
            style={ovlBtnStyle(overlays.glow)}>
            <Zap size={12} strokeWidth={1.5} />
            <span style={{ fontSize: 8, marginLeft: 2 }}>BRILHO</span>
          </button>
          <button
            onClick={() => setShowMorin(v => !v)}
            title="Índices de Complexidade (Morin)"
            style={ovlBtnStyle(showMorin)}>
            <span style={{ fontSize: 8 }}>MORIN</span>
          </button>

          <Divider />

          {/* Import from MusicLab */}
          <button
            onClick={handleImportFromMusicLab}
            title="Importar snapshot do MusicLab (gera capa)"
            style={{ ...topBtnSty, color: 'rgba(55,178,218,0.65)' }}>
            <Box size={12} strokeWidth={1.5} />
          </button>

          {/* Snapshot */}
          <button onClick={handleCaptureSnapshot} title="Snapshot" style={topBtnSty}>
            <Camera size={12} strokeWidth={1.5} />
          </button>

          {/* Export PNG */}
          <button
            onClick={() => {
              const canvas = geoParamsRef.current.mode === '3d'
                ? (canvas3DRef.current ?? mainCanvasRef.current)
                : mainCanvasRef.current;
              if (canvas) exportPNG(canvas, dnaRef.current.name ?? 'metaarte-3d');
            }}
            title="Export PNG (captura canvas ativo — 2D ou WebGL 3D)"
            style={topBtnSty}>
            <Download size={12} strokeWidth={1.5} />
          </button>

          {/* ── Recording ── */}
          <RecordingButton
            state={recState}
            elapsed={recElapsed}
            onStart={handleRecStart}
            onStop={handleRecStop}
            showOptions
            className="ml-1"
          />

          {/* Export DNA */}
          <button onClick={() => exportDNA(dnaRef.current, dnaRef.current.name ?? 'recipe')} title="Export DNA JSON" style={topBtnSty}>
            <Dna size={12} strokeWidth={1.5} />
          </button>

          <Divider />

          {/* Quanta count */}
          <span style={{ fontSize: 8, color: DIM, fontFamily: MONO, letterSpacing: '0.08em' }}>
            Q:<span style={{ color: quantaCount === 0 ? ACCENT : MID, marginLeft: 2 }}>
              {quantaCount}
            </span>
          </span>

          <div style={{ flex: 1 }} />

          {/* DNA name */}
          <span style={{ fontSize: 9, color: DIM, letterSpacing: '0.1em', fontFamily: MONO, textTransform: 'uppercase' }}>
            {dna.name ?? 'custom'}
          </span>

          {/* Curator toggle — REMOVED */}

          {/* Cinematic */}
          <button onClick={() => setCinematic(v => !v)} title="Modo Cinematico" style={topBtnSty}>
            <Maximize2 size={12} strokeWidth={1.5} />
          </button>

          {/* Panel dropdown */}
          <select
            value={rightPanel ?? ''}
            onChange={e => setRightPanel((e.target.value || null) as RightPanel)}
            title="Painel lateral"
            style={{
              background: SURFACE, border: `1px solid ${BORDER}`,
              color: DIM, fontSize: 8, padding: '3px 6px', borderRadius: 2,
              cursor: 'pointer', fontFamily: MONO, letterSpacing: '0.08em',
              minWidth: 118,
            }}>
            <option value="">PAINEL: OFF</option>
            <option value="layers">LAYERS</option>
            <option value="archive">ARCHIVE</option>
            <option value="vitrine">VITRINE</option>
            <option value="matrix">MATRIX</option>
            <option value="physics">PHYSICS & BEHAVIOR</option>
            <option value="powers">POWERS</option>
            <option value="geo">GEOMETRY</option>
            <option value="hub">HUB</option>
          </select>
        </div>
      )}

      {/* Cinematic exit */}
      {cinematic && (
        <button title="Sair modo cinema (ESC)" onClick={() => setCinematic(false)}
          style={{
            position: 'fixed', top: 10, right: 10, zIndex: 1000,
            background: 'rgba(0,0,0,0.82)', border: `1px solid rgba(255,255,255,0.14)`,
            borderRadius: 2, padding: '6px 12px', cursor: 'pointer',
            color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 9, fontFamily: MONO, letterSpacing: '0.14em', textTransform: 'uppercase',
            boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
          }}>
          <X size={11} strokeWidth={1.6} /> VOLTAR <span style={{ opacity: 0.55, fontSize: 8 }}>ESC</span>
        </button>
      )}

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Left Sidebar — always on top so controls work with any canvas background */}
        {!cinematic && (
          <div style={{ position: 'relative', zIndex: 15 }}>
            <LeftSidebar
            toolState={toolState}
            palette={dna.palette}
            onToolChange={patch => setToolState(ts => {
              const next = { ...ts, ...patch };
              toolRef.current = next;
              return next;
            })}
            agentShape={dna.genes.agentShape ?? 'circle'}
            onAgentShape={sh => {
              const next = { ...dna, genes: { ...dna.genes, agentShape: sh } };
              setDNA(next); dnaRef.current = next;
            }}
            brushTextureId={brushTextureId}
            onBrushTexture={id => setBrushTextureId(id)}
            onSpawnSingleton={handleSpawnSingleton}
            singletonSize={singletonSize}
            onSingletonSize={setSingletonSize}
            sizeMul={sizeMul}
            onSizeMul={v => { setSizeMul(v); sizeMulRef.current = v; }}
            simSpeed={simSpeed}
            onSimSpeed={v => { setSimSpeed(v); simSpeedRef.current = v; }}
            staticAgents={staticAgents}
            onStaticAgents={() => setStaticAgents(v => { staticAgentsRef.current = !v; return !v; })}
            isolatedSpecies={isolatedSpecies}
            onIsolated={() => {
              const nv = !isolatedSpeciesRef.current;
              setIsolatedSpecies(nv);
              isolatedSpeciesRef.current = nv;
              const mat = buildInteractionMatrix(dnaRef.current, seedRef.current, nv);
              fieldsRef.current.interactionMatrix = mat;
              setMatrixValues(Array.from(mat));
            }}
            linear={(dna.genes.linear ?? 0) > 0.5}
            onLinear={() => {
              const cur = dna.genes.linear ?? 0;
              const next = { ...dna, genes: { ...dna.genes, linear: cur > 0.5 ? 0 : 1 } };
              setDNA(next); dnaRef.current = next;
            }}
            geoMode={geoParams.mode}
            onGeoMode={handleGeoModeSelect}
            geoPanelOpen={rightPanel === 'geo'}
            onToggleGeoPanel={() => setRightPanel(prev => prev === 'geo' ? null : 'geo')}
          />
          </div>
        )}

        {/* Canvas Area — overflow hidden so stable canvas size doesn't clear when panel opens; z-index below panels */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0, zIndex: 1 }}>
          {/* 2D simulation canvas (always present, hidden behind 3D canvas when in 3D mode) */}
          <canvas
            key="meta-art-main-canvas"
            ref={mainCanvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            style={{
              display: 'block', width: '100%', height: '100%',
              cursor: activeTool?.cursor ?? 'crosshair',
              // In 3D mode the WebGL canvas is on top; keep 2D canvas for physics continuity
              visibility: geoParams.mode === '3d' ? 'hidden' : 'visible',
              position: 'absolute', inset: 0,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />

          {/* 3D WebGL canvas — overlaid, handles orbit events in 3D mode */}
          <canvas
            ref={canvas3DRef}
            style={{
              display: 'block', width: '100%', height: '100%',
              position: 'absolute', inset: 0,
              pointerEvents: geoParams.mode === '3d' ? 'auto' : 'none',
              opacity: geoParams.mode === '3d' ? 1 : 0,
              transition: 'opacity 0.35s ease',
              background: 'transparent',
            }}
          />

          {/* 3D mode HUD overlay — orbit hint + mode badge */}
          {geoParams.mode === '3d' && !cinematic && (
            <div style={{
              position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{
                padding: '4px 12px', borderRadius: 1,
                background: 'rgba(0,0,0,0.6)',
                border: `1px solid ${BORDER}`,
                fontSize: 7, color: DIM,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 7,
                pointerEvents: 'none', fontFamily: MONO,
              }}>
                <Box size={10} strokeWidth={1.2} />
                <span>3D — DRAG=ORBIT — SCROLL=ZOOM</span>
              </div>
              <button
                onClick={() => renderer3DRef.current?.resetCamera()}
                title="Reset câmera"
                style={{
                  padding: '3px 8px', borderRadius: 1, cursor: 'pointer',
                  background: 'rgba(0,0,0,0.6)',
                  border: `1px solid ${BORDER}`,
                  fontSize: 7, color: DIM,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontFamily: MONO,
                }}>
                <RotateCcw size={9} strokeWidth={1.2} />
                <span>CAM</span>
              </button>
            </div>
          )}

          {/* ── 3D-mode border overlay ── mirrors the 2D canvas border visualization */}
          {geoParams.mode === '3d' && geoParams.showBorder && (() => {
            const bm = geoParams.boundaryMode ?? 'wrap';
            const borderColor = bm === 'bounce' ? 'rgba(60,140,255,0.7)'
                              : bm === 'absorb' ? 'rgba(255,80,60,0.7)'
                              : bm === 'open'   ? 'rgba(255,255,255,0.12)'
                              : 'rgba(255,255,255,0.22)'; // wrap
            const borderW = bm === 'open' ? 1 : 2;
            const isDashed = bm === 'wrap';
            const showCorners = bm !== 'open';
            const cs = 16;
            type CornerDef = {
              top?: number; bottom?: number;
              left?: number; right?: number;
              bt: number; bb: number; bl: number; br: number;
            };
            const corners: CornerDef[] = [
              { top: 0, left: 0,   bt: borderW, bl: borderW, bb: 0, br: 0 },
              { top: 0, right: 0,  bt: borderW, br: borderW, bb: 0, bl: 0 },
              { bottom: 0, left: 0,  bb: borderW, bl: borderW, bt: 0, br: 0 },
              { bottom: 0, right: 0, bb: borderW, br: borderW, bt: 0, bl: 0 },
            ];
            return (
              <div key="3d-border-overlay" style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5,
              }}>
                {/* Main border rect */}
                <div style={{
                  position: 'absolute', inset: 1,
                  border: `${borderW}px ${isDashed ? 'dashed' : 'solid'} ${borderColor}`,
                  boxSizing: 'border-box',
                }} />
                {/* Corner accents */}
                {showCorners && corners.map((c, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    width: cs, height: cs,
                    ...(c.top    !== undefined ? { top: c.top }       : {}),
                    ...(c.bottom !== undefined ? { bottom: c.bottom } : {}),
                    ...(c.left   !== undefined ? { left: c.left }     : {}),
                    ...(c.right  !== undefined ? { right: c.right }   : {}),
                    borderTop:    c.bt > 0 ? `${c.bt}px solid ${borderColor}` : 'none',
                    borderBottom: c.bb > 0 ? `${c.bb}px solid ${borderColor}` : 'none',
                    borderLeft:   c.bl > 0 ? `${c.bl}px solid ${borderColor}` : 'none',
                    borderRight:  c.br > 0 ? `${c.br}px solid ${borderColor}` : 'none',
                    opacity: 0.55,
                  }} />
                ))}
                {/* Mode label badge */}
                <div style={{
                  position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
                  padding: '2px 8px', borderRadius: 8,
                  background: bm === 'bounce' ? 'rgba(30,80,200,0.18)'
                            : bm === 'absorb' ? 'rgba(200,40,30,0.18)'
                            : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${borderColor}`,
                  fontSize: 7, color: borderColor, letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}>
                  {bm}
                </div>
              </div>
            );
          })()}

          {/* Tool hint */}
          {!cinematic && (
            <div style={{
              position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
              pointerEvents: 'none',
            }}>
              <div style={{
                padding: '4px 14px', borderRadius: 1, background: 'rgba(0,0,0,0.6)',
                border: `1px solid ${BORDER}`,
                fontSize: 8, color: DIM, letterSpacing: '0.1em',
                fontFamily: MONO, textTransform: 'uppercase',
              }}>
                {activeTool?.name} — {activeTool?.description}
              </div>
            </div>
          )}

          {/* Metrics mini-bar */}
          {metrics && !cinematic && (
            <div style={{
              position: 'absolute', bottom: 10, right: 10,
              display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none',
            }}>
              {[
                { label: 'DENS',  v: metrics.density,      c: 'rgba(255,255,255,0.4)' },
                { label: 'CNTR',  v: metrics.contrast,     c: 'rgba(255,255,255,0.3)' },
                { label: 'SLNC',  v: metrics.silenceIndex, c: 'rgba(255,255,255,0.25)' },
              ].map(({ label, v, c }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 7, color: DIM, width: 28, textAlign: 'right',
                    letterSpacing: '0.1em', fontFamily: MONO }}>{label}</span>
                  <div style={{ width: 50, height: 1, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ width: `${v * 100}%`, height: '100%', background: c,
                      transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Morin complexity panel */}
          {showMorin && !cinematic && (
            <div style={{
              position: 'absolute', top: 8, left: 8,
              display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none',
              background: 'rgba(0,0,0,0.55)', padding: '8px 12px', borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 7, color: ACCENT, letterSpacing: '0.14em', fontFamily: MONO, marginBottom: 2 }}>MORIN</div>
              {([
                { key: 'dialogica',     label: 'DIALÓG',   c: 'rgba(255,100,100,0.7)',  v: morin.dialogica },
                { key: 'recursivo',     label: 'RECURS',   c: 'rgba(100,200,255,0.7)',  v: morin.recursivo },
                { key: 'hologramatico', label: 'HOLOGR',   c: 'rgba(100,255,160,0.7)',  v: morin.hologramatico },
                { key: 'sapiensDemens', label: 'SAP/DEM',  c: 'rgba(255,200,80,0.7)',   v: morin.sapiensDemens },
                { key: 'tetralogia',    label: 'TETRAL',   c: 'rgba(180,120,255,0.7)',  v: morin.tetralogia },
              ] as const).map(({ key, label, c, v }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 6, color: DIM, width: 32, textAlign: 'right',
                    letterSpacing: '0.08em', fontFamily: MONO }}>{label}</span>
                  <div style={{ width: 60, height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 1 }}>
                    <div style={{ width: `${v * 100}%`, height: '100%', background: c,
                      borderRadius: 1, transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize: 6, color: DIM, width: 18, fontFamily: MONO }}>{v.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Overlay legend */}
          {!cinematic && (overlays.connections || overlays.glow) && (
            <div style={{
              position: 'absolute', top: 8, right: 8,
              display: 'flex', flexDirection: 'column', gap: 2, pointerEvents: 'none',
            }}>
              {overlays.connections && (
                <div style={{ fontSize: 7, color: DIM, letterSpacing: '0.12em', fontFamily: MONO }}>
                  CON ●
                </div>
              )}
              {overlays.glow && (
                <div style={{ fontSize: 7, color: DIM, letterSpacing: '0.12em', fontFamily: MONO }}>
                  GLOW ●
                </div>
              )}
            </div>
          )}

          {/* Controller Cursor — position driven directly via ref in RAF */}
          <ControllerCursor cursorRef={ctrlCursorElRef} />

          {/* Controller HUD */}
          <ControllerHUD
            ctrl={ctrlFrameState}
            toolName={activeTool?.name ?? ''}
            presetName={dna.name ?? ''}
            radius={toolState.size / 180}
            intensity={ctrlFrameState.triggers.rt}
            quantaCount={quantaCount}
            showHUD={ctrlHUDVisible} />

          {/* Gamepad indicator + Input Mode toggle in corner */}
          {ctrlStatus.connected && (
            <div style={{
              position: 'absolute', top: 8, left: 8,
              display: 'flex', alignItems: 'center', gap: 5, zIndex: 20,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(80,220,120,0.7)', flexShrink: 0 }} />
              <span style={{ fontSize: 7, color: 'rgba(80,220,120,0.55)', letterSpacing: '0.08em' }}>
                CTRL
              </span>
              {/* Input mode cycle button */}
              <button
                onClick={() => {
                  const modes = ['auto', 'controller', 'mouse'] as const;
                  const cur = inputModeRef.current;
                  const next = modes[(modes.indexOf(cur) + 1) % modes.length];
                  setInputMode(next);
                }}
                title="Modo de input: auto / controller / mouse"
                style={{
                  background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(80,220,120,0.3)',
                  borderRadius: 3, padding: '1px 5px', cursor: 'pointer',
                  fontSize: 7, color: 'rgba(80,220,120,0.7)', letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                {ctrlStatus.inputMode}
              </button>
            </div>
          )}
        </div>

        {/* ── Right Panel — always on top so sliders/params work with any canvas background */}
        {!cinematic && rightPanel !== null && (
          <div style={{
            width: rightWidth, flexShrink: 0, display: 'flex', flexDirection: 'column',
            borderLeft: `1px solid ${BORDER}`,
            background: BG, overflowY: 'auto',
            position: 'relative', zIndex: 15,
          }}>
            {rightPanel === 'layers' && (
              <LayerPanel
                layers={layers}
                onChange={handleLayerChange}
                onClearLayer={handleClearLayer} />
            )}
            {rightPanel === 'archive' && (
              <ArchivePanel
                archive={archive}
                grimoire={grimoire}
                onRestoreEntry={handleRestoreEntry}
                onDeleteEntry={id => setArchive(prev => prev.filter(e => e.id !== id))}
                onToggleFavorite={id => setArchive(prev => prev.map(e => e.id === id ? { ...e, favorite: !e.favorite } : e))}
                onTogglePin={id => {
                  setArchive(prev => prev.map(e => e.id === id ? { ...e, pinned: !e.pinned } : e));
                  const entry = archive.find(e => e.id === id);
                  if (entry) setPinnedDNA(entry.dna);
                }} />
            )}
            {rightPanel === 'geo' && (
              <GeoPanel
                geoParams={geoParams}
                onParamChange={handleGeoPanelParamChange}
                onApplyPreset={applyGeoPresetByKey}
              />
            )}
            {rightPanel === 'matrix' && (
              <MatrixPanel
                matrix={matrixValues}
                onCellChange={handleMatrixCellChange}
                onRandomize={handleMatrixRandomize}
                onSymmetrize={handleMatrixSymmetrize}
                onReset={handleMatrixReset}
                onPreset={handleMatrixPreset}
              />
            )}
            {rightPanel === 'vitrine' && (
              <VitrineView
                vitrine={vitrine}
                selectedId={selectedVitrine}
                onSelect={handleVitrineSelect}
                onFavorite={id => setVitrine(prev => prev.map(c => c.id === id ? { ...c, favorite: !c.favorite } : c))}
                onPin={handleVitrinePin}
                onDiscard={id => setVitrine(prev => prev.filter(c => c.id !== id))}
                onMutateFrom={id => {
                  const card = vitrine.find(c => c.id === id);
                  if (card) handleMutate(
                    Array.from({ length: 8 }, (_, i) => ({ ...card.dna, id: `mut-${Date.now()}-${i}` }))
                  );
                }}
                onNewMutate={() => handleMutate([])}
                currentDNA={dna} />
            )}
            {(rightPanel === 'physics' || rightPanel === 'dna') && (
              <PhysicsPanel
                physics={physicsConfig}
                dna={dna}
                onPhysics={patch => {
                  setPhysicsConfig(prev => {
                    const next = { ...prev, ...patch };
                    physicsConfigRef.current = next;
                    return next;
                  });
                }}
                onDNAGene={handleDNAGeneChange}
                onDNAChange={handleDNAChange}
                onMutate={handleMutate}
                pinnedDNA={pinnedDNA}
              />
            )}
            {rightPanel === 'powers' && (
              <PowersPanel
                dna={dna}
                palette={dna.palette}
                onRecolorSpecies={handleRecolorSpecies}
                onRandomPalette={() => {
                  const pal = generateRandomPalette(Math.max(4, dnaRef.current.palette.length));
                  const newDNA = { ...dnaRef.current, palette: pal };
                  setDNA(newDNA); dnaRef.current = newDNA;
                  recolorQuantaToPalette(quantaRef.current, pal);
                }}
                onSetAllShape={handleSetAllShape}
                brushTextureId={brushTextureId}
                onBrushTexture={id => setBrushTextureId(id)}
                onDNAGene={handleDNAGeneChange}
                onChaosInject={handleChaosInject}
                onFreezeAll={handleFreezeAll}
                onPulseAll={handlePulseAll}
                onScatterAll={handleScatterAll}
                onShockAll={handleShockAll}
                onMagnetizeAll={handleMagnetizeAll}
                onImplodeAll={handleImplodeAll}
                onTurboAll={handleTurboAll}
                onHueRotate={handleHueRotate}
                onSatShift={handleSatShift}
                onLitShift={handleLitShift}
                onSizeAll={handleSizeAll}
                onRespawn={() => initSim(dnaRef.current, Date.now())}
                guideStroke={guideStroke}
                guideCurvature={guideCurvature}
                guideColor={guideColor}
                guideLineMode={guideLineMode}
                guidePathMode={guidePathMode}
                autoGuidesPreset={autoGuidesPreset}
                autoGuidesRandom={autoGuidesRandom}
                onGuideStroke={v => {
                  setGuideStroke(v);
                  guideStrokeRef.current = v;
                  retuneGuidesLive({ thickness: v });
                }}
                onGuideCurvature={v => {
                  setGuideCurvature(v);
                  guideCurvatureRef.current = v;
                  retuneGuidesLive({ smoothness: v });
                }}
                onGuideColor={hex => {
                  setGuideColor(hex);
                  guideColorRef.current = hex;
                  retuneGuidesLive({ color: hex });
                }}
                onGuideLineMode={m => {
                  setGuideLineMode(m);
                  guideLineModeRef.current = m;
                  retuneGuidesLive({ lineMode: m });
                }}
                onGuidePathMode={m => {
                  setGuidePathMode(m);
                  guidePathModeRef.current = m;
                  retuneGuidesLive({ pathMode: m });
                }}
                onGuideClear={clearGuides}
                onGuideGenerate={() => spawnAutoGuides('random')}
                onGuideStyleRandom={() => {
                  const col = dnaRef.current.palette[Math.floor(Math.random() * Math.max(1, dnaRef.current.palette.length))] ?? '#40b0ff';
                  const stroke = 0.8 + Math.random() * 2.3;
                  const smooth = Math.random();
                  const lineMode: GuideLineType = (['flow', 'pinch', 'shear', 'barrier', 'spiral', 'funnel', 'repulsor', 'attractor', 'wave', 'orbit_line'] as const)[Math.floor(Math.random() * 10)];
                  const pathMode = (['stream', 'orbit', 'shock'] as const)[Math.floor(Math.random() * 3)];
                  setGuideColor(col);
                  setGuideStroke(stroke);
                  setGuideCurvature(smooth);
                  setGuideLineMode(lineMode);
                  setGuidePathMode(pathMode);
                  guideColorRef.current = col;
                  guideStrokeRef.current = stroke;
                  guideCurvatureRef.current = smooth;
                  guideLineModeRef.current = lineMode;
                  guidePathModeRef.current = pathMode;
                  retuneGuidesLive({ color: col, thickness: stroke, smoothness: smooth, lineMode, pathMode });
                }}
                onToggleAutoGuidesPreset={() => setAutoGuidesPreset(v => !v)}
                onToggleAutoGuidesRandom={() => setAutoGuidesRandom(v => !v)}
                onExplodeAll={handleExplodeAll}
                onBlackHoleAll={handleBlackHoleAll}
                onHarmonizeAll={handleHarmonizeAll}
                onVortexAll={handleVortexAll}
                onRepelAll={handleRepelAll}
                onAttractAll={handleAttractAll}
                onCalmAll={handleCalmAll}
                onFluxAll={handleFluxAll}
                onActivateBrush={handleActivatePowerBrush}
              />
            )}
            {rightPanel === 'hub' && (
              <MetaArtHubPanel
                dna={dna}
                seed={seedRef.current}
                onLoadPreset={handleHubLoadPreset}
                onLoadArte={handleHubLoadArte}
              />
            )}
          </div>
        )}
      </div>

      {/* Ritual onboarding — spiritual questionnaire that seeds DNA/palette/tools */}
      {ritualOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 120,
            background: 'radial-gradient(circle at 50% 30%, rgba(24,18,36,0.92), rgba(0,0,0,0.96))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}>
          <div style={{
            width: 'min(640px, 94vw)',
            border: `1px solid ${BORDER}`,
            background: 'rgba(0,0,0,0.76)',
            borderRadius: 4,
            padding: '16px 16px 14px',
            fontFamily: MONO,
          }}>
            <div style={{ fontSize: 8, letterSpacing: '0.18em', color: ACCENT, textTransform: 'uppercase' }}>
              Ritual de Entrada
            </div>
            <div style={{ fontSize: 11, color: BRIGHT, marginTop: 8, lineHeight: 1.5 }}>
              {RITUAL_QUESTIONS[ritualStep]?.prompt}
            </div>
            <div style={{ fontSize: 8, color: DIM, marginTop: 4 }}>
              Etapa {ritualStep + 1}/{RITUAL_QUESTIONS.length} · define preset inicial, DNA e paleta sobre quadro branco.
            </div>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
              {RITUAL_QUESTIONS[ritualStep]?.options.map(opt => (
                <button
                  key={`${RITUAL_QUESTIONS[ritualStep].key}-${opt.label}`}
                  onClick={() => {
                    const key = RITUAL_QUESTIONS[ritualStep].key;
                    setRitualAnswers(prev => ({ ...prev, [key]: opt.value }));
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '7px 10px',
                    borderRadius: 2,
                    border: `1px solid ${Math.abs(ritualAnswers[RITUAL_QUESTIONS[ritualStep].key] - opt.value) < 0.001 ? 'rgba(255,0,132,0.45)' : BORDER}`,
                    background: Math.abs(ritualAnswers[RITUAL_QUESTIONS[ritualStep].key] - opt.value) < 0.001
                      ? 'rgba(255,0,132,0.09)' : 'rgba(255,255,255,0.02)',
                    color: Math.abs(ritualAnswers[RITUAL_QUESTIONS[ritualStep].key] - opt.value) < 0.001 ? BRIGHT : MID,
                    cursor: 'pointer',
                    fontSize: 9,
                    letterSpacing: '0.04em',
                    fontFamily: MONO,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button
                onClick={() => {
                  ritualDoneRef.current = true;
                  setRitualOpen(false);
                }}
                style={{
                  border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.02)',
                  color: DIM, padding: '6px 10px', fontSize: 8, letterSpacing: '0.12em',
                  textTransform: 'uppercase', cursor: 'pointer', fontFamily: MONO,
                }}>
                Pular ritual
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setRitualStep(s => Math.max(0, s - 1))}
                  disabled={ritualStep === 0}
                  style={{
                    border: `1px solid ${BORDER}`, background: ritualStep === 0 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                    color: ritualStep === 0 ? 'rgba(255,255,255,0.2)' : MID,
                    padding: '6px 10px', fontSize: 8, letterSpacing: '0.12em',
                    textTransform: 'uppercase', cursor: ritualStep === 0 ? 'default' : 'pointer', fontFamily: MONO,
                  }}>
                  Voltar
                </button>
                {ritualStep < RITUAL_QUESTIONS.length - 1 ? (
                  <button
                    onClick={() => setRitualStep(s => Math.min(RITUAL_QUESTIONS.length - 1, s + 1))}
                    style={{
                      border: `1px solid rgba(255,0,132,0.35)`, background: 'rgba(255,0,132,0.08)',
                      color: ACCENT, padding: '6px 10px', fontSize: 8, letterSpacing: '0.12em',
                      textTransform: 'uppercase', cursor: 'pointer', fontFamily: MONO,
                    }}>
                    Continuar
                  </button>
                ) : (
                  <button
                    onClick={handleApplyRitual}
                    style={{
                      border: `1px solid rgba(255,0,132,0.45)`, background: 'rgba(255,0,132,0.15)',
                      color: BRIGHT, padding: '6px 10px', fontSize: 8, letterSpacing: '0.12em',
                      textTransform: 'uppercase', cursor: 'pointer', fontFamily: MONO,
                    }}>
                    Iniciar quadro vivo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controller Quick Menu — full-screen overlay */}
      <QuickMenu
        open={quickMenuOpen}
        onClose={() => setQuickMenuOpen(false)}
        ctrl={ctrlFrameState}
        presetsSection={{
          label: 'Presets',
          items: [...PRESETS, ...EXTRA_PRESETS] as DNA[],
          getLabel: (p: DNA) => p.name ?? '?',
          onSelect: (p: DNA) => handlePreset(p),
        }}
        toolsSection={{
          label: 'Ferramentas',
          items: CTRL_TOOLS as unknown as string[],
          getLabel: (id: string) => TOOL_DEFS.find(t => t.id === id)?.name ?? id,
          onSelect: (id: string) => setToolState(ts => {
            const n = { ...ts, activeToolId: id as never };
            toolRef.current = n; return n;
          }),
        }}
      />
    </div>
  );
};

// ── Vitrine panel ─────────────────────────────────────────────────────────────
function VitrineView({
  vitrine, selectedId, onSelect, onFavorite, onPin, onDiscard, onMutateFrom, onNewMutate, currentDNA,
}: {
  vitrine: VitrineCard[]; selectedId: string | null;
  onSelect: (c: VitrineCard) => void; onFavorite: (id: string) => void;
  onPin: (id: string) => void; onDiscard: (id: string) => void;
  onMutateFrom: (id: string) => void; onNewMutate: () => void;
  currentDNA: DNA;
}) {
  return (
    <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 8, fontFamily: MONO }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 8, color: ACCENT, letterSpacing: '0.16em',
          textTransform: 'uppercase' }}>VITRINE</span>
        <button title="Nova mutação" onClick={onNewMutate}
          style={{ fontSize: 7, padding: '2px 8px', borderRadius: 1, cursor: 'pointer',
            border: `1px solid rgba(255,0,132,0.2)`, background: 'rgba(255,0,132,0.04)',
            color: 'rgba(255,0,132,0.6)', fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          + GERAR
        </button>
      </div>
      {vitrine.length === 0 ? (
        <div style={{ fontSize: 8, color: DIM, textAlign: 'center', padding: '20px 0', letterSpacing: '0.06em' }}>
          Use MUTATE no painel DNA.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {vitrine.map(card => (
            <VitrineCardView
              key={card.id} card={card}
              selected={selectedId === card.id}
              onSelect={() => onSelect(card)}
              onFavorite={() => onFavorite(card.id)}
              onPin={() => onPin(card.id)}
              onDiscard={() => onDiscard(card.id)}
              onMutateFrom={() => onMutateFrom(card.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const topBtnSty: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: '3px 5px',
  color: DIM, display: 'flex', alignItems: 'center', gap: 2,
  borderRadius: 1, fontFamily: MONO, fontSize: 8,
};

function Divider() {
  return <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.06)', flexShrink: 0, margin: '0 2px' }} />;
}