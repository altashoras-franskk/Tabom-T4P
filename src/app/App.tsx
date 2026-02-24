// MetaLifeLab - Particle Life Simulation System
// Narrative Engine + Chronicle integrated
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast, Toaster } from 'sonner';
import { TopHUD } from '../ui/TopHUD';
import { RightDock } from '../ui/RightDock';
import { SeededRNG } from '../engine/rng';
import { createTimeState, updateTime, TimeState, BASE_STEP } from '../engine/time';
import { createPerformanceConfig, applyQualityPreset, SimQuality, RenderQuality, PerformanceConfig } from '../engine/performance';
import { checkPerformanceAndAutoReduce } from '../engine/performance-patch';
import { screenToWorld } from '../engine/camera';
import { setRandomPaletteSeed } from '../render/palette';
import { createMicroState, createMicroConfig, spawnParticles, spawnParticlesWithPattern, addParticle, removeParticlesInRadius, MicroState, MicroConfig } from '../sim/micro/microState';
import { createMatrix, randomizeMatrix, softenMatrix, symmetrizeMatrix, invertMatrix, normalizeMatrix, copyMatrix, expandMatrix, applyCircularDependency, InteractionMatrix } from '../sim/micro/matrix';
import { updateParticleLife, applyImpulse, applyWind, applyWhiteHole, applyBlackHole, applyVortex, applyFreeze, applyChaos, applyQuake, applyNova, applyMagnetize, getMicroPerfStats } from '../sim/micro/particleLife';
import { updateParticleLifeWithField } from '../sim/micro/recursiveFieldWrapper';
import { microPresets } from '../sim/micro/presets';
import { updateEnergy, createEnergyConfig } from '../sim/micro/energy';
import { createFieldState, createFieldConfig, sampleField, FieldState, FieldConfig, depositField, depositFieldRadius } from '../sim/field/fieldState';
import { updateField } from '../sim/field/fieldUpdate';
import { depositMicroMetrics } from '../sim/field/fieldSampling';
import { createReconfigState, createReconfigConfig, updateArtifacts, ReconfigState, ReconfigConfig } from '../sim/reconfig/reconfigState';
import { runDetectors, computeDiversity, DetectorResults } from '../sim/reconfig/detectors';
import { runOperators, Beat } from '../sim/reconfig/operators';
import { createChronicle, addBeat, Chronicle } from '../story/beats';
import { createUndoBuffer, takeSnapshot, canUndo as canUndoFunc, undo as undoFunc, UndoBuffer } from '../engine/undo';
import { createSnapshot, restoreSnapshot, SimulationSnapshot } from '../engine/snapshot';
import { initWebGLRenderer, renderWebGL, setRenderConfig, WebGLRenderer } from '../render/webgl/renderer';
import { renderCanvas2D } from '../render/canvas2d/renderer2d';
import { renderFieldHeatmap, renderFieldLayersHeatmap, renderArtifacts, renderBrushCursor, renderMiniStatus, renderSigilOverlay, renderSigilPings } from '../render/overlays';
import { renderBonds, renderTrails, updateTrails, clearTrails, BondsConfig, TrailsConfig } from '../render/bondsOverlay';
import { drawSigils } from '../render/drawSigils';
import { renderRecursiveFieldHeatmap } from '../render/recursiveFieldRenderer';
import { calculateStabilityMetrics, interpretBeat, interpretMitosis, interpretSystemState } from '../sim/narrative/aiNarrator';
import { useWorldLog } from '../hooks/useWorldLog';
import { WorldLogPanel } from '../ui/WorldLogPanel';
import { ChroniclePanel } from '../ui/ChroniclePanel';
import type { NarrativeTone, NarrativeParagraph } from '../story/narrativeEngine';
import { createStoryState, interpretMoment, setMotifsFromSeed } from '../story/narrativeEngine';
import type { Arc } from '../story/arcs';
import { detectArcShift } from '../story/arcs';
import { WebGLParticleRenderer } from '../render/webgl-renderer';
import { PALETTES } from '../render/palette';
import { getColorSchemeName } from '../render/colorTheory';
import { CREATIVE_PRESETS, FEATURED_PRESETS, generatePresetMatrix, CreativePreset } from '../sim/presets/creativePalette';
import { SPAWN_RECIPES, spawnFromRecipe } from '../sim/presets/spawnRecipes';
import { generateStructuralMatrix } from '../sim/micro/matrixGenerators';
import { WorldDNA, generateDNA, generateRecipeDNA, chaosMutateDNA, dnaToString } from '../sim/universe/worldDNA';
import { performMitosis, createMitosisConfig } from '../sim/life/mitosis';
import { createCodexState, captureOrganism, spawnOrganism, deleteOrganism, renameOrganism, CodexState } from '../sim/codex/organism';
import { useGuide } from '../guide/useGuide';
import { createFieldLayers, updateFieldLayers, addToLayer, sampleLayer, FieldLayersConfig } from '../sim/fieldLayers/fieldLayers';
import { computeLoopMetrics, LoopMetrics } from '../sim/fieldLayers/loops';
import { setFieldSampler } from '../sim/micro/fieldAccessor';
import { LoopsMap } from '../ui/LoopsMap';
import { Challenges } from '../ui/Challenges';
import { createMetaLifeLabAdapter } from '../guide/adapters/metalifelabAdapter';
import { GuideOverlay } from '../guide/GuideOverlay';
import { WelcomeModal } from '../guide/WelcomeModal';
import { useAchievements } from '../hooks/useAchievements';
import { trackExternalEvent } from '../sim/achievements/achievementSystem';
import { AchievementsPanel } from '../ui/AchievementsPanel';
import { AchievementToast } from '../ui/AchievementToast';
import { BackgroundPicker } from '../ui/BackgroundPicker';
import { GuideHintArrow } from '../guide/GuideHintArrow';
// PATCH 04.3: Archetypes + Mutation
import { createRegistry, maybeCreateArchetype, sampleGenesCentroid, ArchetypeRegistry } from '../sim/archetypes/archetypes';
import { mutateGenes } from '../sim/archetypes/mutation';
import { setSigilInjector } from '../sim/micro/particleLife';
import { markGuideCompleted } from '../guide/GuideSystem';
// PATCH 04.5: Life System (single source of truth)
import { DEFAULT_LIFE, applyLifeDial, LifeConfig } from '../sim/life/lifeConfig';
import { createLifeStats, LifeStats } from '../sim/life/lifeStats';
import { FOOD_TYPE } from '../sim/micro/microState';
// PATCH 04.6: Sigil Pings (símbolos discretos)
import { createSigilPingSystem, updateSigilPings, addSigilPing, getArchetypeColor, SigilPingSystem } from '../sim/archetypes/sigilPings';
// PATCH 04.5-SIGILS: Archetype detection from clusters
import { createSigilState, createSigilConfig, updateSigils, depositSigil, sampleSigils, SigilFieldState, SigilConfig } from '../sim/sigils/sigilState';
import { setSigilSampler, setSigilDepositor } from '../sim/micro/fieldAccessor';
import { updateTrackers, classifyArchetype, makeArtifact, ClusterTracker, ArchetypeArtifact } from '../sim/sigils/archetypeDetector';

// SOCIOGENESIS: Import sociogenesis system
import { createSociogenesisState, genId, SociogenesisState } from '../sim/sociogenesis/sociogenesisTypes';
import type { SocioTool, TotemKind, TabooKind, RitualKind, SocioLens } from '../sim/sociogenesis/sociogenesisTypes';
// Culture & Prestige engines
import { stepCulture, getMemeStats, initCultureFromParticles, type MemeStats } from '../sim/sociogenesis/cultureEngine';
import { stepPrestige, getTopLeaders } from '../sim/sociogenesis/prestigeEngine';
import { runSociogenesisTick, shouldTickSociogenesis } from '../sim/sociogenesis/sociogenesisEngine';
import { narrateEvent, generateTotemName } from '../sim/sociogenesis/sociogenesisNarrator';
import { renderSociogenesisOverlay, renderSociogenesisCursor, detectTribes, addEmergencePing, pushChronicle, clearPings, clearChronicle } from '../sim/sociogenesis/sociogenesisOverlay';
import { detectEmergentInstitutions, shouldRunDetection } from '../sim/sociogenesis/sociogenesisDetector';
import { SOCIOGENESIS_PRESETS, applySpawnLayout } from '../sim/sociogenesis/sociogenesisPresets';
import { SociogenesisPanel } from '../ui/SociogenesisPanel';
import { applyEmergenceLens, applyTribeEffects } from '../sim/sociogenesis/sociogenesisAdaptation';
import { detectLeaders, applyLeaderInfluence, renderLeaders, type Leader } from '../sim/sociogenesis/leaderSystem';
import type { LabId } from '../ui/TopHUD';
import { SociogenesisStudyMode } from './SociogenesisStudyMode';
import { PsycheLab } from './PsycheLab';
import { MusicLab } from './MusicLab';
import { PhysicsSandbox } from './PhysicsSandbox';
import { AlchemyLab } from '../ui/labs/AlchemyLab';
import { MetaArtLab } from '../ui/labs/MetaArtLab';
import { AsimovTheater } from '../ui/labs/AsimovTheater';
import { RhizomeLab } from '../ui/labs/RhizomeLab';
import { LanguageLab } from '../ui/labs/LanguageLab';
import { TreeOfLifeLab } from '../ui/labs/TreeOfLifeLab';
import { HomePage } from './components/HomePage';
import { Renderer3D, View3DConfig, DEFAULT_VIEW3D, typeColor, getZMicro, clamp3d, Particle3D } from '../render/Renderer3D';
import { getPsycheState, registerPsycheState } from '../sim/psyche/psycheLabGlobal';
import { View3DControls } from '../ui/View3DControls';
import { MEME_COLORS } from '../sim/sociogenesis/sociogenesisTypes';
import { CanvasRecorder, RecorderState } from './components/recording/canvasRecorder';
import { RecordingButton } from './components/recording/RecordingButton';

// OR CHOZER: Bottom-up feedback engine (kept for legacy / feature-flag fallback)
import {
  createFeedbackState, stepFeedbackEngine, applyModulation, restoreParams,
  resetFeedbackMemory, FeedbackState,
} from '../sim/micro/feedbackEngine';
import { OrChozerPanel } from '../ui/OrChozerPanel';

// COMPLEXITY LENS (PATCH 01): Morin + Meadows complexity theory framing
import {
  COMPLEXITY_LENS,
  ComplexityLensState, createComplexityLensState, stepComplexityLens,
  createVitalAccumulator, tickVitalRates, VitalAccumulator,
  recordModuleMs,
} from '../sim/complexity/complexityLens';
import { ComplexityPanel } from '../ui/ComplexityPanel';

// ECONOMY-LITE
import {
  createEconomyConfig, createEconomyState, createEconomyMetrics,
  EconomyConfig, EconomyState, EconomyMetrics,
} from '../sim/economy/economyTypes';
import {
  initEconomy, stepResourceField, harvestAndMetabolize,
  applyRitualCosts, stepClaimField, computeEconomyMetrics,
} from '../sim/economy/economyEngine';
import {
  renderEconomyLens, renderTerritoryLens,
} from '../sim/sociogenesis/sociogenesisOverlay';

// OBSERVABLES & EVENTS: Recursive readability
import { computeObservables, type Observables } from '../sim/observables';
import { detectEvents, initDetector, resetDetector } from '../sim/eventDetector';

// RECURSIVE FIELD ENGINE (new system)
import { createRecursiveFieldState, createRecursiveFieldConfig, type RecursiveFieldState, type RecursiveFieldConfig } from '../sim/field/fieldTypes';
import { stepField as stepRecursiveField, getFieldStats as getRecursiveFieldStats } from '../sim/field/fieldEngine';

// ── Asimov Theater password gate ──────────────────────────────────────────────
function AsimovGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw] = React.useState('');
  const [error, setError] = React.useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.trim().toLowerCase() === 'meadow2026') {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'radial-gradient(ellipse at 50% 40%, #0c0a18 0%, #040308 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 340, padding: '0 20px' }}>
        <div style={{
          fontSize: 36, marginBottom: 16, color: 'rgba(124,111,205,0.6)',
          filter: 'drop-shadow(0 0 12px rgba(124,111,205,0.3))',
        }}>&#x229A;</div>
        <div style={{
          fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.6)', marginBottom: 6,
        }}>Asimov Theater</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 24 }}>
          Acesso restrito. Insira a senha para continuar.
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)}
            placeholder="Senha..." autoFocus
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 6,
              background: 'rgba(255,255,255,0.05)',
              border: error ? '1px solid rgba(255,80,80,0.5)' : '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.8)', fontSize: 12, outline: 'none', fontFamily: 'monospace',
              transition: 'border-color 0.2s',
            }}
          />
          <button type="submit" style={{
            padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
            background: 'rgba(124,111,205,0.15)', border: '1px solid rgba(124,111,205,0.3)',
            color: 'rgba(124,111,205,0.9)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>Entrar</button>
        </form>
        {error && (
          <div style={{ marginTop: 12, fontSize: 10, color: 'rgba(255,80,80,0.7)' }}>
            Senha incorreta.
          </div>
        )}
      </div>
    </div>
  );
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasInnerRef = useRef<HTMLDivElement>(null); // inner canvas-only wrapper for zoom/pan
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  // Core state
  const timeRef = useRef<TimeState>(createTimeState());
  const rngRef = useRef<SeededRNG>(new SeededRNG(Date.now()));
  const microStateRef = useRef<MicroState>(createMicroState(1000)); // Reduced for better initial FPS
  const microConfigRef = useRef<MicroConfig>(createMicroConfig());
  const matrixRef = useRef<InteractionMatrix>(createMatrix(4));
  const baseMatrixRef = useRef<InteractionMatrix>(createMatrix(4)); // Matrix without circular dependency
  const fieldStateRef = useRef<FieldState>(createFieldState(48, 27)); // OTIMIZAÇÃO: Old field system
  const fieldConfigRef = useRef<FieldConfig>(createFieldConfig());
  
  // Field Layers (Meadows Engine)
  const fieldLayersRef = useRef(createFieldLayers(64));
  
  // RECURSIVE FIELD ENGINE (new - 3-channel cascata)
  const recursiveFieldRef = useRef<{ field: RecursiveFieldState; cfg: RecursiveFieldConfig }>({
    field: createRecursiveFieldState(createRecursiveFieldConfig()),
    cfg: createRecursiveFieldConfig(),
  });
  const [fieldLensActive, setFieldLensActive] = useState(false);
  
  const [fieldLayersCfg, setFieldLayersCfg] = useState<FieldLayersConfig>(({
    size: 64,
    diffusion: {
      nutrient: 0.15,
      tension: 0.12,
      memory: 0.10,
      entropy: 0.15,
      // PATCH 04.3: Sigil layers with fast decay
      sigilBond: 0.04,
      sigilRift: 0.05,
      sigilBloom: 0.03,
      sigilOath: 0.06,
    },
    decay: {
      nutrient: 0.08,
      tension: 0.12,
      memory: 0.03,
      entropy: 0.10,
      // PATCH 04.3: Fast decay for sigils (short-lived symbols)
      sigilBond: 0.9,
      sigilRift: 1.2,
      sigilBloom: 0.7,
      sigilOath: 0.8,
    },
    injection: {
      nutrientFromFood: 0.35, // 3x increase for dramatic effect
      nutrientFromAgents: 0.0,
      tensionFromCrowding: 0.5, // 2.7x increase
      memoryFromMotion: 0.25, // 3x increase
      entropyFromInstability: 0.3, // 3x increase
    },
    clamps: {
      nutrient: { min: 0, max: 1 },
      tension: { min: 0, max: 1 },
      memory: { min: 0, max: 1 },
      entropy: { min: 0, max: 1 },
      // PATCH 04.3: Sigil clamps
      sigilBond: { min: 0, max: 1 },
      sigilRift: { min: 0, max: 1 },
      sigilBloom: { min: 0, max: 1 },
      sigilOath: { min: 0, max: 1 },
    },
    delays: {
      nutrient: 0.2,
      tension: 0.3,
      memory: 0.5,
      entropy: 0.25,
      // PATCH 04.3: Small delays for sigils (more responsive)
      sigilBond: 0.15,
      sigilRift: 0.12,
      sigilBloom: 0.18,
      sigilOath: 0.20,
    },
  } as any) as FieldLayersConfig);
  const reconfigStateRef = useRef<ReconfigState>(createReconfigState());
  const reconfigConfigRef = useRef<ReconfigConfig>(createReconfigConfig());
  const chronicleRef = useRef<Chronicle>(createChronicle());
  const undoBufferRef = useRef<UndoBuffer>(createUndoBuffer());
  const codexStateRef = useRef<CodexState>(createCodexState());

  // OR CHOZER: Bottom-up feedback engine (Tree of Life v2)
  const feedbackStateRef = useRef<FeedbackState>(createFeedbackState());
  const [feedbackSnap, setFeedbackSnap] = useState<FeedbackState>(() => ({
    ...createFeedbackState(),
  }));

  // COMPLEXITY LENS (PATCH 01): wraps feedbackEngine with Morin+Meadows framing + telemetry
  const complexityLensRef = useRef<ComplexityLensState>(createComplexityLensState());
  const vitalAccRef       = useRef<VitalAccumulator>(createVitalAccumulator());
  const [complexitySnap, setComplexitySnap] = useState<ComplexityLensState>(
    () => createComplexityLensState(),
  );
  
  // PATCH 04.3: Archetypes + Mutation
  const archetypesRef = useRef<ArchetypeRegistry>(createRegistry());
  const [mutationCfg] = useState({
    baseRate: 0.002, // 0.2% per second
    entropyGain: 0.010, // additional from entropy fields
    step: 0.08, // mutation magnitude
  });
  const lastSpeciationAttempt = useRef(0);
  const lastPopulationLog = useRef(0);
  const populationAccumulator = useRef({ births: 0, deaths: 0 });
  
  // PATCH 04.6: Sigil Pings (símbolos discretos quando arquétipos emergem)
  const sigilPingsRef = useRef<SigilPingSystem>(createSigilPingSystem());
  
  // PATCH 04.5-SIGILS: Archetype detection system
  const sigilStateRef = useRef<SigilFieldState>(createSigilState(32, 32)); // match field resolution vibe
  const [sigilConfig, setSigilConfig] = useState<SigilConfig>(createSigilConfig());
  const sigilCfgRef = useRef(sigilConfig);
  useEffect(() => { sigilCfgRef.current = sigilConfig; }, [sigilConfig]);
  
  const trackersRef = useRef<ClusterTracker[]>([]);
  const [archetypesDetected, setArchetypesDetected] = useState<ArchetypeArtifact[]>([]);
  const archetypesDetectedRef = useRef<ArchetypeArtifact[]>([]);
  const lastArchetypeCheckRef = useRef(0);
  
  // PATCH 04.5: Life System (single source of truth)
  const [life, setLife] = useState(() => applyLifeDial(DEFAULT_LIFE));
  const lifeRef = useRef(life);
  useEffect(() => { lifeRef.current = life; }, [life]);
  
  const lifeStatsRef = useRef(createLifeStats());
  const [lifeStatsUI, setLifeStatsUI] = useState(lifeStatsRef.current);
  
  // Persistent energy config (not recreated each step)
  const energyConfigRef = useRef(createEnergyConfig());
  
  // WorldLog: Unified event stream
  const worldLog = useWorldLog();
  
  // Accumulated Stats (resetable) - useState for reactivity
  const [stats, setStats] = useState({
    totalBeats: 0,
    totalSpeciations: 0,
    totalInstitutions: 0,
    totalMutations: 0,
    totalMitosis: 0,
    totalMetamorphosis: 0,
    peakParticleCount: 0,
    peakDiversity: 0,
    peakTension: 0,
    peakCohesion: 0,
    simulationStartTime: Date.now(),
  });
  
  const detectorsRef = useRef<DetectorResults>({
    stableClusters: 0,
    borderStrength: 0,
    oscillation: 0,
    scarcityCrisis: false,
    noveltyBurst: false,
    avgTension: 0,
    avgCohesion: 0,
    avgScarcity: 0,
    avgNovelty: 0,
    avgMythic: 0,
  });

  // Renderer
  const webglRendererRef = useRef<WebGLRenderer | null>(null);
  const ctx2dRef = useRef<CanvasRenderingContext2D | null>(null);
  const overlayCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // ── 3D View (non-destructive) ──────────────────────────────────────────────
  const [viewMode,    setViewMode]    = useState<'2D'|'3D'>('2D');
  const [view3DConfig, setView3DConfig] = useState<View3DConfig>(DEFAULT_VIEW3D);
  const canvas3dRef    = useRef<HTMLCanvasElement>(null);
  const renderer3dRef  = useRef<Renderer3D | null>(null);
  // Refs for RAF loop (avoid stale closures)
  const view3dRef = useRef<{ mode: '2D'|'3D'; cfg: View3DConfig }>({
    mode: '2D', cfg: DEFAULT_VIEW3D,
  });
  const orbit3dRef = useRef({ active: false, lastX: 0, lastY: 0, shift: false });

  // ── Recording ─────────────────────────────────────────────────────────────
  const recorderRef  = useRef<CanvasRecorder | null>(null);
  const [recState,   setRecState]   = useState<RecorderState>('idle');
  const [recElapsed, setRecElapsed] = useState(0);

  // ── Complexity Life Viewport Camera ───────────────────────────────────────
  const vpRef      = useRef({ zoom: 1.0, panX: 0, panY: 0 });
  const vpDragRef  = useRef({ active: false, lastX: 0, lastY: 0 });
  const vpKeysRef  = useRef<Set<string>>(new Set());
  const [vpZoom,   setVpZoom]   = useState(1.0);
  const [vpPanned, setVpPanned] = useState(false);

  // UI state
  const [showGuideHint, setShowGuideHint] = useState(false);
  const [trails, setTrails] = useState(false); // OTIMIZAÇÃO: Trails desabilitados por padrão (performance)
  const [fieldHeatmap, setFieldHeatmap] = useState(false);
  const [fieldLayer, setFieldLayer] = useState<'tension' | 'cohesion' | 'scarcity' | 'novelty' | 'mythic'>('tension');
  const [selectedType, setSelectedType] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [hideUI, setHideUI] = useState(false);
  const [collapseDock, setCollapseDock] = useState(false);
  const [showSigils, setShowSigils] = useState(false); // PATCH 04.3: Sigil overlay toggle
  const [currentRegime, setCurrentRegime] = useState<string>('Orbit');
  const [currentSeed, setCurrentSeed] = useState<number>(Date.now());
  const [currentDNA, setCurrentDNA] = useState<WorldDNA | null>(null);
  
  // G) Render aesthetics
  const [pointSize, setPointSize] = useState(3.5); // OTIMIZAÇÃO: Reduzido de 4.0 para performance
  const [fadeFactor, setFadeFactor] = useState(0.96); // OTIMIZAÇÃO: Trails mais leves (4% fade, era 8%)
  const [glowIntensity, setGlowIntensity] = useState(0.5);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [renderMode, setRenderMode] = useState<'dots' | 'streaks'>('dots');
  const [streakLength, setStreakLength] = useState(8.0);
  const [dotSize, setDotSize] = useState(2.0);
  
  // Loop Metrics (Meadows/Morin)
  const [loops, setLoops] = useState<LoopMetrics | null>(null);
  const loopUpdateCounterRef = useRef(0);
  
  // Bonds & Trails overlay (OTIMIZAÇÃO: Bonds desabilitado por padrão)
  const [showBonds, setShowBonds] = useState(false);
  const [bondsDistance, setBondsDistance] = useState(0.10); // Normalized distance (0-2 range)
  const [bondsOpacity, setBondsOpacity] = useState(0.10); // 10% opacity
  const [showTrails, setShowTrails] = useState(false); // OTIMIZAÇÃO: Trails desabilitado por padrão
  const [trailsLength, setTrailsLength] = useState(20);
  const [trailsOpacity, setTrailsOpacity] = useState(0.10); // 10% opacity
  
  // AI Narrator status
  const [narrativeStatus, setNarrativeStatus] = useState<string>('');
  
  // Narrative Engine (Chronicle)
  const storyRef = useRef(createStoryState('poetic'));
  const [storyTone, setStoryTone] = useState<NarrativeTone>('poetic');
  const [paragraphs, setParagraphs] = useState<NarrativeParagraph[]>([]);
  const arcRef = useRef<Arc>({ name: 'Gênese', since: 0, reason: 'init' });
  const [showChronicle, setShowChronicle] = useState(false);
  
  // Spawn pattern
  const [spawnPattern, setSpawnPattern] = useState<string>('random');
  
  // Performance telemetry
  const [simMsHUD, setSimMsHUD] = useState(0);
  const [renderMsHUD, setRenderMsHUD] = useState(0);
  const [neighborsHUD, setNeighborsHUD] = useState(0);
  const [interactionsHUD, setInteractionsHUD] = useState(0);
  const perfAccumRef = useRef({ simMs: 0, renderMs: 0, frames: 0 });
  
  // Power selection
  const [selectedPower, setSelectedPower] = useState<'pulse' | 'white-hole' | 'black-hole' | 'wind' | 'vortex' | 'freeze' | 'chaos' | 'quake' | 'nova' | 'magnetize'>('pulse');
  const novaPhaseRef = useRef<0 | 1>(1); // 1 = explosion by default
  
  // Panels visibility
  const [showWorldLog, setShowWorldLog] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  
  // Performance config (START WITH FAST)
  const perfConfigRef = useRef<PerformanceConfig>(createPerformanceConfig());
  const [simQuality, setSimQuality] = useState<SimQuality>('FAST');

  // Brush parameters
  const [brushRadius, setBrushRadius] = useState(80);
  const [brushStrength, setBrushStrength] = useState(25); // Now 0-100 range
  const [seedRate, setSeedRate] = useState(50);
  const [eraseRate, setEraseRate] = useState(0.3);
  
  // Codex capture mode
  const [captureMode, setCaptureMode] = useState(false);
  
  // Achievement system
  const achievements = useAchievements();
  
  // SOCIOGENESIS: Lab mode & state
  const [showHome, setShowHome] = useState(true); // start on homepage
  const [activeLab, setActiveLab] = useState<LabId>('complexityLife');
  const [asimovUnlocked, setAsimovUnlocked] = useState(false);
  const socioStateRef = useRef<SociogenesisState>(createSociogenesisState());
  const [socioForce, setSocioForce] = useState(0); // force re-render for socio panel
  const socioPointerRef = useRef({ cursorX: -1, cursorY: -1 });
  // Overlay rect cache — avoids getBoundingClientRect() on every frame (layout reflow)
  const overlayRectRef = useRef({ width: 0, height: 0, valid: false });

  // ECONOMY-LITE
  const economyStateRef  = useRef<EconomyState>(createEconomyState());
  const economyCfgRef    = useRef<EconomyConfig>(createEconomyConfig());
  const economyMetricsRef = useRef<EconomyMetrics>(createEconomyMetrics());
  const ecoInitializedRef = useRef(false);
  const [economyCfgUI,    setEconomyCfgUI]    = useState<EconomyConfig>(economyCfgRef.current);
  const [economyMetricsUI, setEconomyMetricsUI] = useState<EconomyMetrics>(economyMetricsRef.current);
  
  // OBSERVABLES & EMERGENCE LENS
  const observablesRef = useRef<Observables | null>(null);
  const lastObservablesTime = useRef<number>(0);
  const [emergenceLens, setEmergenceLens] = useState<SocioLens>('off');
  const [memeStatsUI, setMemeStatsUI] = useState<MemeStats | null>(null);
  const [prestigeLeadersUI, setPrestigeLeadersUI] = useState<Array<{idx:number;prestige:number;memeId:number;wx:number;wy:number}>>([]);
  const cultureInitializedRef = useRef(false);
  
  const [selectedTotemKind, setSelectedTotemKind] = useState<TotemKind>('BOND');
  const [selectedTabooKind, setSelectedTabooKind] = useState<TabooKind>('NO_ENTER');
  const [selectedRitualKind, setSelectedRitualKind] = useState<RitualKind>('GATHER');
  const lastTribeDetectRef = useRef(0);
  const lastEmergenceDetectRef = useRef(0); // for emergent institution detection
  const leadersRef = useRef<Leader[]>([]);
  const lastLeaderDetectRef = useRef(0);

  // Background gradient
  const [background, setBackground] = useState('radial-gradient(circle, #000000 0%, #000000 100%)');
  const [showBgPicker, setShowBgPicker] = useState(false);
  
  // Guide system
  const [isPausedState, setIsPausedState] = useState(false);
  const guideAdapter = createMetaLifeLabAdapter({
    setFieldHeatmap,
    setTrails,
    fieldHeatmap,
    trails,
    onSpeedChange: (speed) => {
      timeRef.current.speed = speed;
      setForceUpdate(v => v + 1);
    },
    isPaused: () => isPausedState,
    onPauseToggle: () => setIsPausedState(v => !v),
    onNewUniverse: () => {
      handleSeedChange(Date.now());
    },
    onApplyRecipe: (recipe) => {
      const preset = CREATIVE_PRESETS.find(p => p.id === recipe);
      if (preset) {
        loadCreativePreset(preset, true);
      }
    },
    timeSpeed: timeRef.current.speed,
    canvasRef,
  });
  
  const guide = useGuide(guideAdapter);
  
  // Log achievements to WorldLog
  useEffect(() => {
    if (achievements.latestAchievement) {
      const a = achievements.latestAchievement;
      worldLog.push({
        t: timeRef.current.elapsed,
        type: 'achievement',
        title: `${a.icon} ${a.name}`,
        sigil: a.icon,
        detail: a.description,
        meta: a
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievements.latestAchievement]);
  
  // Particle count control (Start with 300 for better initial performance)
  const targetParticleCountRef = useRef(300);
  const [targetParticleCountUI, setTargetParticleCountUI] = useState(300);

  // Pointer state
  const pointerRef = useRef({ 
    down: false, 
    id: -1,
    x: 0, 
    y: 0, 
    prevX: 0, 
    prevY: 0, 
    cursorX: 0,
    cursorY: 0,
    shift: false, 
    alt: false,
    mode: 'PULSE' as 'PULSE' | 'WHITE-HOLE' | 'BLACK-HOLE' | 'WIND' | 'SEED' | 'ERASE' | 'CAPTURE' | 'VORTEX' | 'FREEZE' | 'CHAOS' | 'QUAKE' | 'NOVA' | 'MAGNETIZE'
  });

  // ── Recorder lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    recorderRef.current = new CanvasRecorder(setRecState);
    return () => recorderRef.current?.dispose();
  }, []);

  useEffect(() => {
    if (recState !== 'recording') { setRecElapsed(0); return; }
    const id = setInterval(() => setRecElapsed(recorderRef.current?.elapsed ?? 0), 500);
    return () => clearInterval(id);
  }, [recState]);

  // ── Viewport zoom/pan for Complexity Life ────────────────────────────────
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const applyVp = () => {
      const inner = canvasInnerRef.current;
      if (!inner) return;
      const { zoom, panX, panY } = vpRef.current;
      inner.style.transform       = `translate(${panX}px,${panY}px) scale(${zoom})`;
      inner.style.transformOrigin = '50% 50%';
    };
    const onWheel = (e: WheelEvent) => {
      if (activeLab !== 'complexityLife') return;
      e.preventDefault();
      const rect   = container.getBoundingClientRect();
      const mx     = e.clientX - rect.left - rect.width  / 2;
      const my     = e.clientY - rect.top  - rect.height / 2;
      const cur    = vpRef.current;
      const factor = e.deltaY > 0 ? 1 / 1.12 : 1.12;
      const newZoom = Math.max(0.12, Math.min(14, cur.zoom * factor));
      const ratio   = newZoom / cur.zoom;
      vpRef.current = { zoom: newZoom, panX: mx + (cur.panX - mx) * ratio, panY: my + (cur.panY - my) * ratio };
      applyVp();
      setVpZoom(newZoom);
      setVpPanned(Math.abs(vpRef.current.panX) > 2 || Math.abs(vpRef.current.panY) > 2);
    };
    const onDown = (e: MouseEvent) => {
      if (activeLab !== 'complexityLife') return;
      if (e.button !== 1 && e.button !== 2) return; // middle or right drag only
      vpDragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
      if (e.button === 1) e.preventDefault();
    };
    const onMove = (e: MouseEvent) => {
      if (!vpDragRef.current.active) return;
      const dx = e.clientX - vpDragRef.current.lastX;
      const dy = e.clientY - vpDragRef.current.lastY;
      vpDragRef.current.lastX = e.clientX;
      vpDragRef.current.lastY = e.clientY;
      vpRef.current = { ...vpRef.current, panX: vpRef.current.panX + dx, panY: vpRef.current.panY + dy };
      applyVp();
      setVpPanned(true);
    };
    const onUp = () => {
      vpDragRef.current.active = false;
      setVpPanned(Math.abs(vpRef.current.panX) > 2 || Math.abs(vpRef.current.panY) > 2);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeLab !== 'complexityLife') return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const k = e.key;
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(k)) {
        vpKeysRef.current.add(k); e.preventDefault();
      }
      if (k === 'Home') {
        vpRef.current = { zoom: 1, panX: 0, panY: 0 }; applyVp();
        setVpZoom(1); setVpPanned(false);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { vpKeysRef.current.delete(e.key); };
    const onContext = (e: MouseEvent) => { if (activeLab === 'complexityLife') e.preventDefault(); };
    // Arrow-key pan per animation frame
    const keyInterval = setInterval(() => {
      if (vpKeysRef.current.size === 0) return;
      const speed = 6 / vpRef.current.zoom;
      const { panX, panY, zoom } = vpRef.current;
      let nx = panX, ny = panY;
      if (vpKeysRef.current.has('ArrowLeft'))  nx += speed;
      if (vpKeysRef.current.has('ArrowRight')) nx -= speed;
      if (vpKeysRef.current.has('ArrowUp'))    ny += speed;
      if (vpKeysRef.current.has('ArrowDown'))  ny -= speed;
      vpRef.current = { zoom, panX: nx, panY: ny };
      applyVp();
    }, 16);

    container.addEventListener('wheel',       onWheel,    { passive: false });
    container.addEventListener('mousedown',   onDown);
    container.addEventListener('contextmenu', onContext);
    window.addEventListener('mousemove',  onMove);
    window.addEventListener('mouseup',    onUp);
    window.addEventListener('keydown',    onKeyDown);
    window.addEventListener('keyup',      onKeyUp);
    return () => {
      clearInterval(keyInterval);
      container.removeEventListener('wheel',       onWheel);
      container.removeEventListener('mousedown',   onDown);
      container.removeEventListener('contextmenu', onContext);
      window.removeEventListener('mousemove',  onMove);
      window.removeEventListener('mouseup',    onUp);
      window.removeEventListener('keydown',    onKeyDown);
      window.removeEventListener('keyup',      onKeyUp);
    };
  }, [activeLab]); // eslint-disable-line

  // Initialize
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!canvas || !overlayCanvas) return;

    // Try WebGL2
    webglRendererRef.current = initWebGLRenderer(canvas);
    
    // Initialize random palette seed
    setRandomPaletteSeed(currentSeed);
    if (!webglRendererRef.current) {
      ctx2dRef.current = canvas.getContext('2d');
    }

    // Get overlay context
    overlayCtxRef.current = overlayCanvas.getContext('2d');
    
    // Log initial system event
    worldLog.push({
      t: 0,
      type: 'system',
      title: '🚀 MetaLifeLab Started',
      sigil: '⚙️',
      detail: 'System initialized and ready',
      meta: { version: '1.0' }
    });

    // Initial toasts removed — clean start

    // Don't load initial preset - let user choose from launcher

    const handleResize = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      } else {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      }
      // Invalidate overlay rect cache on resize
      overlayRectRef.current.valid = false;
    };

    // Skip simulation + render when tab is hidden (free 100% CPU)
    const handleVisibility = () => {
      if (!document.hidden) overlayRectRef.current.valid = false;
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    // Initial size calculation
    handleResize();

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Never intercept keys when user is typing in an input/textarea/select
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const isEditable = (document.activeElement as HTMLElement)?.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) return;

      if (e.key === 'h' || e.key === 'H') {
        setHideUI(v => !v);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setCollapseDock(v => !v);
      } else if (e.key === ' ') {
        e.preventDefault();
        timeRef.current.running = !timeRef.current.running;
        setForceUpdate(v => v + 1);
      } else if (e.key === '1') {
        timeRef.current.speed = 1;
        setForceUpdate(v => v + 1);
      } else if (e.key === '2') {
        timeRef.current.speed = 2;
        setForceUpdate(v => v + 1);
      } else if (e.key === '3') {
        timeRef.current.speed = 3;
        setForceUpdate(v => v + 1);
      } else if (e.key === '4') {
        timeRef.current.speed = 5;
        setForceUpdate(v => v + 1);
      } else if (e.key === 's' || e.key === 'S') {
        // PATCH 04.5-SIGILS: Toggle sigil overlay (S key) - controls both old and new system
        setShowSigils(v => !v);
        setSigilConfig(prev => ({ ...prev, showOverlay: !prev.showOverlay }));
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync view3d ref whenever state changes ────────────────────────────────
  useEffect(() => {
    view3dRef.current.mode = viewMode;
    view3dRef.current.cfg  = view3DConfig;
  }, [viewMode, view3DConfig]);

  // ── Initialize Renderer3D when canvas3d mounts ────────────────────────────
  useEffect(() => {
    const c = canvas3dRef.current;
    if (!c) return;
    renderer3dRef.current = new Renderer3D(c);
    const { width, height } = dimensions;
    renderer3dRef.current.resize(width, height);
    return () => { renderer3dRef.current?.dispose(); renderer3dRef.current = null; };
  }, []); // eslint-disable-line

  // Resize 3D canvas with window
  useEffect(() => {
    renderer3dRef.current?.resize(dimensions.width, dimensions.height);
  }, [dimensions]);

  // ── Orbit mouse handlers for 3D canvas ────────────────────────────────────
  useEffect(() => {
    const c = canvas3dRef.current;
    if (!c) return;
    const onDown  = (e: MouseEvent) => {
      orbit3dRef.current = { active: true, lastX: e.clientX, lastY: e.clientY, shift: e.shiftKey };
    };
    const onMove  = (e: MouseEvent) => {
      if (!orbit3dRef.current.active) return;
      const dx = e.clientX - orbit3dRef.current.lastX;
      const dy = e.clientY - orbit3dRef.current.lastY;
      orbit3dRef.current.lastX = e.clientX;
      orbit3dRef.current.lastY = e.clientY;
      const cur = view3dRef.current.cfg;
      if (orbit3dRef.current.shift || e.shiftKey) {
        view3dRef.current.cfg = {
          ...cur, camera: {
            ...cur.camera,
            panX: cur.camera.panX + dx * 0.002,
            panY: cur.camera.panY + dy * 0.002,
          },
        };
      } else {
        view3dRef.current.cfg = {
          ...cur, camera: {
            ...cur.camera,
            yaw:   cur.camera.yaw   + dx * 0.008,
            pitch: clamp3d(cur.camera.pitch + dy * 0.008, 0.04, Math.PI/2 - 0.04),
          },
        };
      }
      setView3DConfig({ ...view3dRef.current.cfg });
    };
    const onUp    = () => { orbit3dRef.current.active = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cur = view3dRef.current.cfg;
      view3dRef.current.cfg = {
        ...cur, camera: {
          ...cur.camera,
          dist: clamp3d(cur.camera.dist * (1 + e.deltaY * 0.001), 0.5, 8.0),
        },
      };
      setView3DConfig({ ...view3dRef.current.cfg });
    };
    c.addEventListener('mousedown',  onDown);
    c.addEventListener('mousemove',  onMove);
    c.addEventListener('mouseup',    onUp);
    c.addEventListener('mouseleave', onUp);
    c.addEventListener('wheel',      onWheel, { passive: false });
    return () => {
      c.removeEventListener('mousedown',  onDown);
      c.removeEventListener('mousemove',  onMove);
      c.removeEventListener('mouseup',    onUp);
      c.removeEventListener('mouseleave', onUp);
      c.removeEventListener('wheel',      onWheel);
    };
  }, []); // eslint-disable-line

  // Initialize Field Sampler (Meadows Engine)
  useEffect(() => {
    setFieldSampler((x, y) => {
      const FL = fieldLayersRef.current;
      const nutrient = sampleLayer(FL, 'nutrient', x, y);
      const tension = sampleLayer(FL, 'tension', x, y);
      const memory = sampleLayer(FL, 'memory', x, y);
      const entropy = sampleLayer(FL, 'entropy', x, y);
      // PATCH 04.3: Sample sigil layers
      const sigilBond = sampleLayer(FL, 'sigilBond', x, y);
      const sigilRift = sampleLayer(FL, 'sigilRift', x, y);
      const sigilBloom = sampleLayer(FL, 'sigilBloom', x, y);
      const sigilOath = sampleLayer(FL, 'sigilOath', x, y);

      const scarcity = Math.max(0, Math.min(1, 1 - nutrient));
      const cohesion = Math.max(0, Math.min(1, memory * 0.9 - entropy * 0.7));
      const volatility = Math.max(0, Math.min(1, tension * 0.8 + entropy * 0.8));

      return {
        nutrient,
        tension,
        memory,
        entropy,
        scarcity,
        cohesion,
        volatility,
        sigilBond,
        sigilRift,
        sigilBloom,
        sigilOath,
      };
    });
    
    // PATCH 04.3: Setup sigil injector (micro→sigil feedback)
    setSigilInjector((name: string, x: number, y: number, amount: number) => {
      const FL = fieldLayersRef.current;
      if (name === 'sigilBond' || name === 'sigilRift' || name === 'sigilBloom' || name === 'sigilOath') {
        addToLayer(FL, name as any, x, y, amount);
      }
    });
    
    // PATCH 04.5-SIGILS: Setup sigil sampler + depositor for archetype detection
    setSigilSampler((x, y) => {
      const cfg = sigilCfgRef.current;
      if (!cfg.enabled) return { bond: 0, rift: 0, bloom: 0, oath: 0 };
      const s = sampleSigils(sigilStateRef.current, x, y);
      // scale by influence (hard gate)
      return {
        bond: s.bond * cfg.influence,
        rift: s.rift * cfg.influence,
        bloom: s.bloom * cfg.influence,
        oath: s.oath * cfg.influence,
      };
    });

    setSigilDepositor((kind, x, y, amount) => {
      const cfg = sigilCfgRef.current;
      if (!cfg.enabled) return;
      depositSigil(sigilStateRef.current, x, y, kind, amount * cfg.deposit);
    });
  }, []);

  // Main loop
  useEffect(() => {
    let animationId: number;
    let lastFpsCheck = 0;
    let frameCount = 0;
    let lastAutoReduceTime = 0;

    const loop = (time: number) => {
      // Skip entirely when tab is hidden — saves 100% CPU
      if (document.hidden) {
        animationId = requestAnimationFrame(loop);
        return;
      }

      // ── Fully stop this loop when another self-contained lab is active or when
      //    home is shown. The useEffect deps (activeLab, showHome) restart it
      //    automatically when we come back to complexityLife / sociogenesis.
      if (showHome || (activeLab !== 'complexityLife' && activeLab !== 'sociogenesis')) {
        return; // no next frame — loop suspends until useEffect re-runs
      }

      // PERFORMANCE GUARDRAIL: Skip heavy ops if paused
      if (!timeRef.current.running) {
        render();
        animationId = requestAnimationFrame(loop);
        return;
      }
      
      // FPS monitor and auto-downgrade (check every 240 frames = ~4-8 seconds)
      frameCount++;
      if (frameCount >= 240) {
        const fps = timeRef.current.fps;
        const now = Date.now();
        
        // Use performance patch for aggressive auto-reduction
        lastAutoReduceTime = checkPerformanceAndAutoReduce(
          fps,
          now,
          lastAutoReduceTime,
          microStateRef.current.count,
          (newCount, reduction) => {
            microStateRef.current.count = newCount;
            targetParticleCountRef.current = newCount;
            setTargetParticleCountUI(newCount);
            toast(`⚡ Performance: ${newCount} partículas (−${reduction})`, {
              duration: 3000,
              style: { background: '#1a1a2e', color: '#94a3b8', border: '1px solid #334155', fontSize: '11px' },
            });
          }
        );
        
        frameCount = 0;
      }
      
      // Update maxStepsPerFrame from performance config
      timeRef.current.maxStepsPerFrame = perfConfigRef.current.maxStepsPerFrame;
      
      const { stepCount, fieldTick, reconfigTick } = updateTime(
        timeRef.current,
        time,
        reconfigConfigRef.current.interval
      );
      


      const simStart = performance.now();

      // Micro steps (fixed timestep)
      for (let i = 0; i < stepCount; i++) {
        // Update config dt to BASE_STEP
        microConfigRef.current.dt = BASE_STEP;
        
        // PATCH 04.5: Apply Life config to all systems (single source of truth)
        const L = lifeRef.current;
        
        // Food system
        microConfigRef.current.foodEnabled = L.foodEnabled;
        microConfigRef.current.foodRatio = L.foodRatio;
        
        // Energy system
        microConfigRef.current.energyEnabled = L.energyEnabled;
        microConfigRef.current.energyDecay = L.energyDecay;
        microConfigRef.current.energyFeedRate = L.energyFeedRate;
        microConfigRef.current.energyReproThreshold = L.energyReproThreshold;
        
        // Metamorphosis
        microConfigRef.current.metamorphosisEnabled = (L.mode === 'EVOLUTIVE' || L.mode === 'FULL');
        microConfigRef.current.mutationRate = L.mutationRate;
        microConfigRef.current.typeStability = L.typeStability;
        
        // Reconfig
        reconfigConfigRef.current.mutationRate = L.reconfigRate;
        reconfigConfigRef.current.mutationAmount = L.reconfigAmount;
        
        // COMPLEXITY LENS / OR CHOZER: Apply feedback modulation (non-destructive save + restore)
        // Uses shared FeedbackState via complexityLensRef.feedback
        const lensState = complexityLensRef.current;
        const fbEnabled = lensState.feedback.config.enabled;
        const savedParams = fbEnabled
          ? applyModulation(microConfigRef.current, lensState.feedback.modulation)
          : null;

        // MICRO: Particle Life step (with optional recursive field) — timed for telemetry
        const _t_pl0 = performance.now();
        if (recursiveFieldRef.current?.cfg?.enabled) {
          updateParticleLifeWithField(
            microStateRef.current,
            microConfigRef.current,
            matrixRef.current,
            (x: number, y: number) => {
              const field = sampleField(fieldStateRef.current, x, y);
              return {
                tension: field.tension * fieldConfigRef.current.influenceStrength,
                cohesion: field.cohesion * fieldConfigRef.current.influenceStrength,
                scarcity: field.scarcity * fieldConfigRef.current.influenceStrength,
              };
            },
            rngRef.current,
            timeRef.current.tick,
            recursiveFieldRef.current,
          );
        } else {
          updateParticleLife(
            microStateRef.current,
            microConfigRef.current,
            matrixRef.current,
            (x: number, y: number) => {
              const field = sampleField(fieldStateRef.current, x, y);
              return {
                tension: field.tension * fieldConfigRef.current.influenceStrength,
                cohesion: field.cohesion * fieldConfigRef.current.influenceStrength,
                scarcity: field.scarcity * fieldConfigRef.current.influenceStrength,
              };
            },
            rngRef.current,
            timeRef.current.tick
          );
        }
        recordModuleMs(lensState.moduleTelemetry, 'particleLife', performance.now() - _t_pl0);

        // Restore base params after simulation step
        if (fbEnabled && savedParams) {
          restoreParams(microConfigRef.current, savedParams);
        }
        
        // H) Energy/reproduction system — timed for telemetry
        if (microConfigRef.current.energyEnabled && microStateRef.current.count < 1500) {
          const e = energyConfigRef.current;
          e.enabled = true;
          e.baseDecay = L.energyDecay;
          e.feedRate = L.energyFeedRate;
          e.reproductionThreshold = L.energyReproThreshold;
          
          // Map dial → energy mutation chance & death threshold
          e.mutationChance = 0.02 + L.mutationDial * 0.18;       // 0.02..0.20
          e.deathThreshold = 0.18 + (1 - L.mutationDial) * 0.12; // stable worlds die less
          
          const _t_en0 = performance.now();
          const res = updateEnergy(
            microStateRef.current,
            matrixRef.current,
            e,
            rngRef.current,
            microStateRef.current.maxCount
          );
          recordModuleMs(lensState.moduleTelemetry, 'energy', performance.now() - _t_en0);
          
          // Track births/deaths for Life stats AND vital rate accumulator
          const births  = res.births  ?? 0;
          const deaths  = res.deaths  ?? 0;
          if (births) {
            lifeStatsRef.current.births += births;
            populationAccumulator.current.births += births;
          }
          if (deaths) {
            lifeStatsRef.current.deaths += deaths;
            populationAccumulator.current.deaths += deaths;
          }
          // Feed vital rate accumulator (frameMs approximated per-step)
          tickVitalRates(vitalAccRef.current, 1000 / 60, births, deaths, 0);
        }
      }

      // Update Field Layers (Meadows Engine) - inject from micro world
      const FL = fieldLayersRef.current;
      const sampleStep = Math.max(1, Math.floor(microStateRef.current.count / 150)); // OTIMIZAÇÃO: Amostragem mais agressiva (era 200)
      
      for (let i = 0; i < microStateRef.current.count; i += sampleStep) {
        const x = microStateRef.current.x[i];
        const y = microStateRef.current.y[i];
        const vx = microStateRef.current.vx[i];
        const vy = microStateRef.current.vy[i];
        const sp = Math.sqrt(vx * vx + vy * vy);

        // Memory from motion (increased from 0.02 to 0.08 for butterfly effect)
        addToLayer(FL, 'memory', x, y, fieldLayersCfg.injection.memoryFromMotion * sp * 0.08);
        
        // Entropy from instability (increased from 0.02 to 0.08)
        addToLayer(FL, 'entropy', x, y, fieldLayersCfg.injection.entropyFromInstability * Math.max(0, sp - 0.15) * 0.08);
        
        // Nutrient from food agents (increased from 0.02 to 0.08)
        if (microStateRef.current.type[i] === FOOD_TYPE) {
          addToLayer(FL, 'nutrient', x, y, fieldLayersCfg.injection.nutrientFromFood * 0.08);
        }
      }

      // Update field layers with diffusion, decay, and delays
      // Use total simulated time this frame (stepCount * BASE_STEP)
      const simulatedDt = stepCount * BASE_STEP;
      {
        const _t_fl0 = performance.now();
        updateFieldLayers(FL, fieldLayersCfg, simulatedDt);
        recordModuleMs(complexityLensRef.current.moduleTelemetry, 'field', performance.now() - _t_fl0);
      }

      // PATCH 04.3: Apply gene mutations (entropy-driven)
      {
        const _t_gn0 = performance.now();
        mutateGenes(
        microStateRef.current,
        (x: number, y: number) => {
          const FL = fieldLayersRef.current;
          const nutrient = sampleLayer(FL, 'nutrient', x, y);
          const tension = sampleLayer(FL, 'tension', x, y);
          const memory = sampleLayer(FL, 'memory', x, y);
          const entropy = sampleLayer(FL, 'entropy', x, y);
          const scarcity = Math.max(0, Math.min(1, 1 - nutrient));
          const cohesion = Math.max(0, Math.min(1, memory * 0.9 - entropy * 0.7));
          const volatility = Math.max(0, Math.min(1, tension * 0.8 + entropy * 0.8));
          return { nutrient, tension, memory, entropy, scarcity, cohesion, volatility };
        },
        simulatedDt,
        mutationCfg
        );
        recordModuleMs(complexityLensRef.current.moduleTelemetry, 'genes', performance.now() - _t_gn0);
      }

      // PATCH 04.3: Attempt speciation every 15 seconds
      const t = timeRef.current.elapsed;
      if (t - lastSpeciationAttempt.current > 15.0) {
        lastSpeciationAttempt.current = t;
        const sample = sampleGenesCentroid(microStateRef.current, 200);
        if (sample) {
          const m = computeLoopMetrics(FL);
          const signal = {
            volatility: m.volatility,
            scarcity: m.scarcity,
            cohesion: m.cohesion,
          };
          
          const newArchetype = maybeCreateArchetype(
            archetypesRef.current,
            t,
            sample.centroid,
            signal
          );
          if (newArchetype) {
            // PATCH 04.6: Criar ping visual quando arquétipo emerge
            const color = getArchetypeColor(newArchetype.notes);
            // Posição aleatória próxima ao centro de massa da população (seeded RNG)
            const pingX = (rngRef.current.next() - 0.5) * 1.5;
            const pingY = (rngRef.current.next() - 0.5) * 1.5;
            addSigilPing(
              sigilPingsRef.current,
              pingX,
              pingY,
              newArchetype.sigil,
              color,
              newArchetype.name,
              6.0 // 6 segundos de duração
            );
            
            // Log to WorldLog with better explanation
            worldLog.push({
              t,
              type: 'beat',
              title: `${newArchetype.sigil} Novo Arquétipo: ${newArchetype.name}`,
              sigil: newArchetype.sigil,
              detail: `Uma nova espécie emergiu através de especiação genética!\n\n` +
                `Condições de nascimento: ${newArchetype.notes.join(', ')}\n` +
                `Perfil genético:\n` +
                `  • Gene A (Atração): ${newArchetype.genes.a.toFixed(2)}\n` +
                `  • Gene B (Mobilidade): ${newArchetype.genes.b.toFixed(2)}\n` +
                `  • Gene C (Coesão): ${newArchetype.genes.c.toFixed(2)}\n` +
                `  • Gene D (Sensibilidade): ${newArchetype.genes.d.toFixed(2)}\n\n` +
                `Contexto do campo:\n` +
                `  • Volatilidade: ${(signal.volatility * 100).toFixed(0)}%\n` +
                `  • Escassez: ${(signal.scarcity * 100).toFixed(0)}%\n` +
                `  • Coesão: ${(signal.cohesion * 100).toFixed(0)}%`,
              meta: { archetype: newArchetype, signal },
            });
            
            // Update stats
            setStats((prev) => ({
              ...prev,
              totalSpeciations: prev.totalSpeciations + 1,
            }));
          }
        }
      }

      // Log population changes every 15 seconds
      if (t - lastPopulationLog.current > 15.0) {
        lastPopulationLog.current = t;
        const acc = populationAccumulator.current;
        
        // Only log if there were significant births or deaths
        if (acc.births > 5 || acc.deaths > 5) {
          worldLog.push({
            t,
            type: 'system',
            title: `Dinâmica Populacional`,
            sigil: acc.births > acc.deaths ? '+' : '-',
            detail: `Mudanças na população nos últimos 15 segundos:\n\n` +
              `+ Nascimentos: ${acc.births} novos agentes\n` +
              `- Mortes: ${acc.deaths} agentes eliminados\n` +
              `📊 Saldo: ${acc.births - acc.deaths > 0 ? '+' : ''}${acc.births - acc.deaths}\n\n` +
              `População atual: ${microStateRef.current.count} agentes`,
          });
        }
        
        // Reset accumulator
        populationAccumulator.current.births = 0;
        populationAccumulator.current.deaths = 0;
      }

      // PATCH 04.5-SIGILS: Update sigil fields (diffusion + decay) - only if enabled
      if (sigilCfgRef.current.enabled) {
        updateSigils(sigilStateRef.current, sigilCfgRef.current, simulatedDt);
      }
      
      // PATCH 04.5-SIGILS: Update cluster trackers and detect archetypes (every ~1.5s) - only if enabled
      if (sigilCfgRef.current.enabled) {
        trackersRef.current = updateTrackers(
          trackersRef.current,
          microStateRef.current,
          simulatedDt,
          t
        );
        
        if (t - lastArchetypeCheckRef.current > 1.5) {
          lastArchetypeCheckRef.current = t;
          for (const tr of trackersRef.current) {
            const kind = classifyArchetype(
              tr,
              fieldStateRef.current,
              sigilStateRef.current
            );
            if (kind && !archetypesDetectedRef.current.find(a => a.id === tr.id)) {
              const art = makeArtifact(tr, kind, t);
              archetypesDetectedRef.current = [art, ...archetypesDetectedRef.current].slice(0, 60);
              setArchetypesDetected([...archetypesDetectedRef.current]);
              
              addBeat(chronicleRef.current, {
                time: t,
                type: 'speciation',
                message: `${art.sigil} Archetype emerged: ${art.name}`,
                sigil: art.sigil,
              });
              
              // PATCH 04.6: Add ping visual
              const color = art.kind === 'VINCULO' ? '#64c8ff' :
                            art.kind === 'RUPTURA' ? '#ff6478' :
                            art.kind === 'FLORESCER' ? '#78ff8c' :
                            art.kind === 'JURAMENTO' ? '#c8b4ff' : '#ffffff';
              addSigilPing(
                sigilPingsRef.current,
                art.locus.x,
                art.locus.y,
                art.sigil,
                color,
                art.name,
                6.0
              );
              
              // Update stats
              setStats((prev) => ({
                ...prev,
                totalSpeciations: prev.totalSpeciations + 1,
              }));
            }
          }
        }
      }

      // COMPLEXITY LENS (PATCH 01): step replaces stepFeedbackEngine
      // complexityLensRef.feedback is the shared FeedbackState
      stepComplexityLens(
        complexityLensRef.current,
        microStateRef.current,
        microConfigRef.current,
        1 / Math.max(1, timeRef.current.fps || 60),
      );
      // Keep legacy feedbackStateRef in sync (for any legacy code referencing it)
      feedbackStateRef.current = complexityLensRef.current.feedback;

      // Update loop metrics every 20 frames for UI
      loopUpdateCounterRef.current++;
      if (loopUpdateCounterRef.current >= 20) {
        loopUpdateCounterRef.current = 0;
        // Sync complexity lens snapshot for React UI
        const cl = complexityLensRef.current;
        setComplexitySnap({
          feedback:       cl.feedback,
          metrics:        { ...cl.metrics },
          forces:         { ...cl.forces },
          systemPhase:    cl.systemPhase,
          modulation:     { ...cl.modulation },
          moduleTelemetry: cl.moduleTelemetry,
          vitalRates:     { ...vitalAccRef.current.lastRates },
          systemHealth:   cl.systemHealth,
          emergenceIndex: cl.emergenceIndex,
        });
        // Also keep legacy feedbackSnap alive in case OrChozer panel is still used
        setFeedbackSnap({
          config:        { ...cl.feedback.config },
          metrics:       { ...cl.feedback.metrics },
          activations:   { ...cl.feedback.activations },
          modulation:    { ...cl.feedback.modulation },
          metricsHistory: cl.feedback.metricsHistory,
          historyMaxLen: cl.feedback.historyMaxLen,
          phase:         cl.feedback.phase,
          phaseLabel:    cl.feedback.phaseLabel,
          frameCounter:  cl.feedback.frameCounter,
          runawayCounter: cl.feedback.runawayCounter,
        });
        const m = computeLoopMetrics(FL);
        setLoops(m);
        
        // PATCH 04.5: Update Life stats UI (with decay)
        setLifeStatsUI({ ...lifeStatsRef.current });
        lifeStatsRef.current.births = Math.floor(lifeStatsRef.current.births * 0.6);
        lifeStatsRef.current.deaths = Math.floor(lifeStatsRef.current.deaths * 0.6);
        lifeStatsRef.current.mutations = Math.floor(lifeStatsRef.current.mutations * 0.6);
        
        // === NARRATIVE ENGINE: Arc detection & paragraph generation ===
        const t = timeRef.current.elapsed;
        
        // Detect arc shifts
        const nextArc = detectArcShift(
          t,
          { scarcity: m.scarcity, cohesion: m.cohesion, volatility: m.volatility },
          arcRef.current
        );
        if (nextArc) {
          arcRef.current = nextArc;
          storyRef.current.currentArc = nextArc.name;
          worldLog.push({
            t,
            type: 'system',
            title: `⟡ ${nextArc.name}`,
            sigil: '⟡',
            detail: nextArc.reason,
            meta: nextArc,
          });
        }
        
        // Generate narrative paragraph (throttled)
        storyRef.current.tone = storyTone;
        const para = interpretMoment(
          {
            t,
            loops: {
              scarcity: m.scarcity,
              cohesion: m.cohesion,
              volatility: m.volatility,
              avgNutrient: m.avgNutrient,
              avgTension: m.avgTension,
              avgMemory: m.avgMemory,
              avgEntropy: m.avgEntropy,
            },
            events: worldLog.events.slice(0, 6),
          },
          storyRef.current
        );
        
        if (para) {
          setParagraphs(prev => [para, ...prev].slice(0, 120));
          // Also mirror into world log
          worldLog.push({
            t,
            type: 'pattern',
            title: para.title,
            sigil: '✎',
            detail: para.text,
            meta: { tags: para.tags },
          });
        }
        
        // Add tension from scarcity (feedback loop - increased from 0.01 to 0.05 for butterfly effect)
        const avgScarcity = m.scarcity;
        for (let i = 0; i < microStateRef.current.count; i += sampleStep * 2) {
          const x = microStateRef.current.x[i];
          const y = microStateRef.current.y[i];
          addToLayer(FL, 'tension', x, y, fieldLayersCfg.injection.tensionFromCrowding * avgScarcity * 0.05);
        }
      }

      const simEnd = performance.now();
      const simMs = simEnd - simStart;

      // Field tick
      if (fieldTick && microStateRef.current.count < 2000) {
        depositMicroMetrics(microStateRef.current, fieldStateRef.current, fieldConfigRef.current.depositStrength);
        updateField(fieldStateRef.current, fieldConfigRef.current);

        // Apply artifact effects
        for (const artifact of reconfigStateRef.current.artifacts) {
          if (artifact.effect.type === 'field' && artifact.effect.fieldMod) {
            depositField(
              fieldStateRef.current,
              artifact.x,
              artifact.y,
              artifact.effect.fieldMod.layer,
              artifact.effect.fieldMod.delta
            );
          }
        }
      }

      // Update peak stats (always, not just on reconfig tick)
      if (reconfigTick) {
        const currentDiversity = computeDiversity(microStateRef.current, microConfigRef.current.typesCount);
        setStats(prev => ({
          ...prev,
          peakParticleCount: Math.max(prev.peakParticleCount, microStateRef.current.count),
          peakTension: Math.max(prev.peakTension, detectorsRef.current.avgTension),
          peakCohesion: Math.max(prev.peakCohesion, detectorsRef.current.avgCohesion),
          peakDiversity: Math.max(prev.peakDiversity, currentDiversity),
        }));
      }

      // Reconfig tick
      if (reconfigTick && microStateRef.current.count < 1200) {
        detectorsRef.current = runDetectors(microStateRef.current, fieldStateRef.current);
        
        const beat = runOperators(
          microStateRef.current,
          microConfigRef.current,
          matrixRef.current,
          reconfigStateRef.current,
          detectorsRef.current,
          reconfigConfigRef.current.mutationStrength,
          reconfigConfigRef.current.speciationRate,
          reconfigConfigRef.current.institutionRate,
          rngRef.current,
          timeRef.current.elapsed
        );

        if (beat) {
          addBeat(chronicleRef.current, beat);
          
          // Update stats
          setStats(prev => ({
            ...prev,
            totalBeats: prev.totalBeats + 1,
            totalSpeciations: prev.totalSpeciations + (beat.type === 'speciation' ? 1 : 0),
            totalInstitutions: prev.totalInstitutions + (beat.type === 'institution' ? 1 : 0),
            totalMutations: prev.totalMutations + (beat.type === 'mutation' ? 1 : 0),
          }));
          
          // AI Narrator: Interpret beat
          const narrative = interpretBeat(beat, detectorsRef.current);
          
          // Push enriched beat to WorldLog
          worldLog.push({
            t: timeRef.current.elapsed,
            type: 'beat',
            title: narrative.title,
            sigil: beat.sigil,
            detail: narrative.description,
            meta: { 
              beatType: beat.type, 
              typesCount: microConfigRef.current.typesCount,
              mood: narrative.mood,
              significance: narrative.significance
            }
          });
          
          // Show toast with narrative
          toast.success(narrative.title, {
            description: narrative.description,
            duration: 4000,
          });
          
          takeSnapshot(
            undoBufferRef.current,
            microConfigRef.current,
            matrixRef.current,
            baseMatrixRef.current,
            reconfigStateRef.current,
            timeRef.current.elapsed
          );
          
          setForceUpdate((v) => v + 1);
        }
        
        // Try mitosis if enabled
        if (currentDNA && currentDNA.mitosisRate > 0.01 && microStateRef.current.count < 1200) {
          const mitosisConfig = createMitosisConfig(currentDNA.mitosisRate);
          const result = performMitosis(
            microStateRef.current,
            matrixRef.current,
            mitosisConfig,
            rngRef.current
          );
          
          if (result.success && result.message) {
            // Update stats
            setStats(prev => ({
              ...prev,
              totalMitosis: prev.totalMitosis + 1
            }));
            
            // AI Narrator: Interpret mitosis
            const narrative = interpretMitosis(
              result.parentSize || 50,
              result.childrenCount || 2,
              timeRef.current.elapsed
            );
            
            // Push to WorldLog with narrative
            worldLog.push({
              t: timeRef.current.elapsed,
              type: 'mitosis',
              title: narrative.title,
              sigil: '🧬',
              detail: narrative.description,
              meta: { 
                childrenCreated: result.childrenCount || 0,
                particleCount: microStateRef.current.count,
                mood: narrative.mood,
                significance: narrative.significance
              }
            });
            
            toast.success(narrative.title, {
              description: narrative.description,
              duration: 4000,
            });
          }
        }
      }

      // Update trails if enabled
      if (showTrails) {
        updateTrails(microStateRef.current, trailsLength);
      }

      // PATCH 04.6: Atualizar pings de sigils
      updateSigilPings(sigilPingsRef.current, timeRef.current.elapsed);

      // SOCIOGENESIS: Per-frame effects (leader influence, position tracking)
      let socioDirty = false; // batch all setSocioForce into one at end of tick
      if (activeLab === 'sociogenesis') {
        if (leadersRef.current.length > 0) {
          for (const leader of leadersRef.current) {
            if (leader.particleIndex < microStateRef.current.count) {
              leader.x = microStateRef.current.x[leader.particleIndex];
              leader.y = microStateRef.current.y[leader.particleIndex];
            }
          }
          applyLeaderInfluence(
            microStateRef.current,
            leadersRef.current,
            socioStateRef.current.config.influenceGain * socioStateRef.current.config.simSpeed
          );
        }
      }

      // SOCIOGENESIS: Cadence-based engine tick
      if (activeLab === 'sociogenesis' && shouldTickSociogenesis(socioStateRef.current, timeRef.current.elapsed)) {
        socioStateRef.current.lastTickTime = timeRef.current.elapsed;

        // ── Lazy culture init (once after particles spawn) ──
        if (!cultureInitializedRef.current && microStateRef.current.count > 0) {
          cultureInitializedRef.current = true;
          initCultureFromParticles(
            microStateRef.current,
            socioStateRef.current.culture,
            socioStateRef.current.cultureConfig.memeCount,
          );
        }

        const socioEntries = runSociogenesisTick(
          socioStateRef.current,
          microStateRef.current,
          timeRef.current.elapsed,
        );
        if (socioEntries.length > 0) {
          for (const entry of socioEntries) {
            socioStateRef.current.chronicle.unshift(entry);
            addBeat(chronicleRef.current, {
              time: timeRef.current.elapsed,
              type: 'institution' as any,
              message: `${entry.icon} ${entry.message}`,
              sigil: entry.icon,
            });
            const evColor = entry.cause.includes('crossed') ? '#ef4444'
              : entry.cause.includes('Case') ? '#fbbf24'
              : '#94a3b8';
            pushChronicle(timeRef.current.elapsed, `${entry.icon} ${entry.message}`, evColor);
          }
          socioDirty = true;
        }

        // ── Culture Engine: meme contagion ──
        if (cultureInitializedRef.current && socioStateRef.current.cultureConfig.enabled) {
          const nowSec = timeRef.current.elapsed;
          const dtMacro = socioStateRef.current.config.cadenceSec / socioStateRef.current.config.simSpeed;

          const cultureEvents = stepCulture(
            nowSec,
            microStateRef.current,
            socioStateRef.current.culture,
            socioStateRef.current.cultureConfig,
            rngRef.current,
            // Field coupling: memory layer → affinity (A), tension layer → stress (S)
            (x, y) => ({
              a: sampleLayer(fieldLayersRef.current, 'memory', x, y),
              s: sampleLayer(fieldLayersRef.current, 'tension', x, y),
            }),
          );

          for (const evt of cultureEvents) {
            // Throttle: only log if not same type recently
            const icon = evt.type === 'CONVERSION_WAVE' ? '->'
              : evt.type === 'CULT_DOMINANCE' ? '*' : 'x';
            const color = evt.type === 'CULT_DOMINANCE' ? '#ffd166'
              : evt.type === 'SCHISM_WARNING' ? '#ef476f' : '#06d6a0';
            
            if (evt.type !== 'CULT_DOMINANCE' || socioStateRef.current.chronicle.length === 0 ||
                !socioStateRef.current.chronicle[0].message.includes('DOMINANCE')) {
              const entry = {
                time: nowSec,
                icon,
                message: `${evt.type.replace(/_/g, ' ')}: ${evt.evidence}`,
                cause: evt.evidence,
                consequence: evt.type === 'CULT_DOMINANCE' ? 'Cultural homogenization' : 'Cultural flux',
              };
              socioStateRef.current.chronicle.unshift(entry);
              pushChronicle(nowSec, `${icon} ${evt.evidence}`, color);
            }

            if (evt.wx !== 0 || evt.wy !== 0) {
              addEmergencePing(evt.wx, evt.wy, evt.type === 'CULT_DOMINANCE' ? '*' : '->', color, nowSec, 5);
            }
          }

          // ── Prestige Engine: decay + ritual/taboo bonuses ──
          const prestigeEvents = stepPrestige(
            dtMacro,
            microStateRef.current,
            socioStateRef.current.culture,
            socioStateRef.current,
            nowSec,
          );

          for (const evt of prestigeEvents) {
            const color = '#c084fc';
            // Only log if no leader event in last 15s
            const recentLeader = socioStateRef.current.chronicle.find(
              e => e.icon === '◎' && nowSec - e.time < 15
            );
            if (!recentLeader) {
              socioStateRef.current.chronicle.unshift({
                time: nowSec,
                icon: '◎',
                message: `LEADER EMERGES: ${evt.evidence}`,
                cause: evt.evidence,
                consequence: 'Accelerates meme spread in local area',
              });
              pushChronicle(nowSec, `◎ LEADER: ${evt.evidence}`, color);
              addEmergencePing(evt.wx, evt.wy, 'LEADER', color, nowSec, 6);
            }
          }

          // ── Update meme stats UI ──
          const mStats = getMemeStats(microStateRef.current, socioStateRef.current.culture, socioStateRef.current.cultureConfig.memeCount);
          setMemeStatsUI(mStats);
          const topLeaders = getTopLeaders(microStateRef.current, socioStateRef.current.culture, 5);
          setPrestigeLeadersUI(topLeaders);
          socioDirty = true;

          // ── Trim chronicle to avoid unbounded growth ──
          const MAX_SOCIO_CHRONICLE = 80;
          if (socioStateRef.current.chronicle.length > MAX_SOCIO_CHRONICLE) {
            socioStateRef.current.chronicle.length = MAX_SOCIO_CHRONICLE;
          }
        }

        // Tribe detection every ~10 seconds
        if (timeRef.current.elapsed - lastTribeDetectRef.current > 10) {
          lastTribeDetectRef.current = timeRef.current.elapsed;
          detectTribes(socioStateRef.current, microStateRef.current, timeRef.current.elapsed);
          socioDirty = true;
        }

        // Leader detection every ~8 seconds (spatial clusters)
        if (timeRef.current.elapsed - lastLeaderDetectRef.current > 8) {
          lastLeaderDetectRef.current = timeRef.current.elapsed;
          leadersRef.current = detectLeaders(
            microStateRef.current,
            socioStateRef.current,
            timeRef.current.elapsed
          );
        }

        // Apply tribe effects to matrix (small per-tick deltas)
        if (socioStateRef.current.tribes.length > 0) {
          applyTribeEffects(matrixRef.current, socioStateRef.current);
        }

        // Apply emergence lens (small per-tick deltas)
        if (emergenceLens !== 'off') {
          applyEmergenceLens(matrixRef.current, emergenceLens, socioStateRef.current);
        }

        // EMERGENT INSTITUTIONS: Detect and spawn from particle behavior
        if (
          socioStateRef.current.config.autoEmergence &&
          shouldRunDetection(lastEmergenceDetectRef.current, timeRef.current.elapsed)
        ) {
          lastEmergenceDetectRef.current = timeRef.current.elapsed;
          const prevTotems = socioStateRef.current.totems.length;
          const prevTaboos = socioStateRef.current.taboos.length;
          const prevRituals = socioStateRef.current.rituals.length;

          detectEmergentInstitutions(
            socioStateRef.current,
            microStateRef.current,
            timeRef.current.elapsed
          );

          // Ping + chronicle for newly emerged entities
          const nowT = timeRef.current.elapsed;
          for (let i = prevTotems; i < socioStateRef.current.totems.length; i++) {
            const t = socioStateRef.current.totems[i];
            const c = t.kind === 'BOND' ? '#5ac8fa' : t.kind === 'RIFT' ? '#ff6b6b' : t.kind === 'ORACLE' ? '#c084fc' : '#94a3b8';
            addEmergencePing(t.pos.x, t.pos.y, `${t.kind} totem`, c, nowT);
            pushChronicle(nowT, `Totem emerged: ${t.name} (${t.kind})`, c);
          }
          for (let i = prevTaboos; i < socioStateRef.current.taboos.length; i++) {
            const tb = socioStateRef.current.taboos[i];
            const c = tb.kind === 'NO_ENTER' ? '#ef4444' : '#f97316';
            addEmergencePing(tb.pos.x, tb.pos.y, `${tb.kind.replace('_', ' ')} zone`, c, nowT);
            pushChronicle(nowT, `Taboo emerged: ${tb.kind.replace('_', ' ')} boundary`, c);
          }
          for (let i = prevRituals; i < socioStateRef.current.rituals.length; i++) {
            const r = socioStateRef.current.rituals[i];
            const totemForRitual = socioStateRef.current.totems.find(tt => tt.id === r.totemId);
            if (totemForRitual) {
              addEmergencePing(totemForRitual.pos.x, totemForRitual.pos.y, `${r.kind} ritual`, '#34d399', nowT);
              pushChronicle(nowT, `Ritual emerged: ${r.kind} at ${totemForRitual.name}`, '#34d399');
            }
          }

          socioDirty = true;
        }
      }

      // SOCIOGENESIS: Observables (every 2s, independent of cadence)
      if (activeLab === 'sociogenesis') {
        const timeSinceLastObs = timeRef.current.elapsed - lastObservablesTime.current;
        if (timeSinceLastObs >= 2.0) {
          const nowSec = timeRef.current.elapsed;
          const activeRitual = socioStateRef.current.rituals.find(r => {
            const phase = ((nowSec - r.bornAt) % r.periodSec) / r.periodSec;
            return phase < r.dutyCycle;
          });
          const ritualActive = !!activeRitual;
          const ritualTotem = activeRitual
            ? socioStateRef.current.totems.find(t => t.id === activeRitual.totemId)
            : undefined;
          const ritualCenter = ritualTotem ? ritualTotem.pos : undefined;
          
          const obs = computeObservables(
            microStateRef.current,
            microConfigRef.current.typesCount,
            ritualActive,
            ritualCenter,
          );
          observablesRef.current = obs;
          
          const events = detectEvents(obs, timeRef.current.elapsed);
          for (const event of events) {
            socioStateRef.current.chronicle.unshift({
              time: event.time,
              icon: event.icon,
              message: event.title,
              cause: event.detail,
              consequence: `Phase: ${obs.phase}`,
            });
            // Chronicle feed for events
            const evColor = event.kind === 'PHASE_SHIFT' ? '#a78bfa'
              : event.kind === 'VOLATILITY_SPIKE' ? '#fbbf24'
              : event.kind === 'COHESION_SPIKE' ? '#34d399'
              : event.kind === 'BORDER_FORMED' ? '#f97316'
              : '#94a3b8';
            pushChronicle(event.time, `${event.icon} ${event.title}`, evColor);
          }
          
          lastObservablesTime.current = timeRef.current.elapsed;
          socioDirty = true;

          // ── ECONOMY-LITE: step every 2 s (same cadence as observables) ──
          if (economyCfgRef.current.enabled) {
            const edt = timeSinceLastObs; // seconds since last tick (≈2)

            // Lazy init on first enable
            if (!ecoInitializedRef.current) {
              ecoInitializedRef.current = true;
              initEconomy(economyStateRef.current, economyCfgRef.current, rngRef.current);
            }

            // 1. Resource field
            stepResourceField(economyStateRef.current, economyCfgRef.current, fieldStateRef.current, edt);

            // 2. Harvest + metabolism
            harvestAndMetabolize(economyStateRef.current, economyCfgRef.current, microStateRef.current, fieldStateRef.current, edt);

            // 3. Claim field
            stepClaimField(economyStateRef.current, economyCfgRef.current, microStateRef.current, socioStateRef.current.culture, edt);

            // 4. Metrics + events
            const { metrics: eMetrics, events: eEvents } = computeEconomyMetrics(
              economyStateRef.current, economyCfgRef.current, microStateRef.current, economyMetricsRef.current,
            );
            economyMetricsRef.current = eMetrics;

            // Push economy events to Chronicle
            for (const ev of eEvents) {
              socioStateRef.current.chronicle.unshift({
                time: nowSec, icon: ev.icon, message: ev.message,
                cause: 'Economy engine', consequence: '',
              });
              pushChronicle(nowSec, `${ev.icon} ${ev.message}`, ev.color);
            }

            setEconomyMetricsUI({ ...eMetrics });
            socioDirty = true;
          }

          // ── Ritual/Totem costs (on sociogenesis cadence, not here; handled below) ──
        }
      }

      // Ritual+totem energy cost (runs on sociogenesis cadence, separate block)
      if (activeLab === 'sociogenesis' && economyCfgRef.current.enabled && socioStateRef.current.rituals.length > 0) {
        const dtMacroCost = socioStateRef.current.config.cadenceSec / socioStateRef.current.config.simSpeed;
        applyRitualCosts(economyStateRef.current, economyCfgRef.current, socioStateRef.current, microStateRef.current, dtMacroCost);
      }

      // Single batched React update for all sociogenesis state changes this tick
      if (socioDirty) setSocioForce(v => v + 1);

      // Update artifacts
      updateArtifacts(reconfigStateRef.current, BASE_STEP);

      // Check achievements (every 5 seconds = 600 ticks at 120fps)
      if (timeRef.current.tick % 600 === 0) {
        // PATCH 04.3.1: Use archetype data for organisms
        const archetypePopulation = new Map<number, number>();
        for (let i = 0; i < microStateRef.current.count; i++) {
          const aId = microStateRef.current.archetypeId[i];
          archetypePopulation.set(aId, (archetypePopulation.get(aId) || 0) + 1);
        }
        
        const organisms = Array.from(archetypePopulation.entries()).map(([aId, count]) => {
          const archetype = archetypesRef.current.list.find(a => a.id === aId);
          return {
            id: archetype?.sigil || '?',
            age: timeRef.current.elapsed - (archetype?.bornAt || 0),
            stability: 0.5, // Placeholder
            particleCount: count,
          };
        });
        
        // Calculate real stability metrics using AI Narrator
        const stabilityMetrics = calculateStabilityMetrics(
          detectorsRef.current,
          microStateRef.current.count,
          timeRef.current.elapsed
        );
        
        // Add system state interpretation to WorldLog (every 30 seconds)
        if (timeRef.current.tick % 3600 === 0 && timeRef.current.elapsed > 10) {
          const stateInterpretation = interpretSystemState(stabilityMetrics);
          setNarrativeStatus(stateInterpretation); // Update HUD
          
          worldLog.push({
            t: timeRef.current.elapsed,
            type: 'system',
            title: '🔮 Estado do Universo',
            sigil: '📊',
            detail: stateInterpretation,
            meta: {
              stability: stabilityMetrics.score.toFixed(2),
              entropy: stabilityMetrics.entropy.toFixed(2),
              complexity: stabilityMetrics.complexity.toFixed(2),
              resilience: stabilityMetrics.resilience.toFixed(2),
            }
          });
        }
        
        // Get recent events from WorldLog
        const recentEvents = worldLog.events
          .slice(-10)
          .map(e => e.title);
        
        achievements.checkAchievements({
          currentTime: timeRef.current.elapsed,
          particleCount: microStateRef.current.count,
          typesCount: microConfigRef.current.typesCount,
          organisms,
          stabilityScore: stabilityMetrics.score,
          entropyLevel: stabilityMetrics.entropy,
          recentEvents,
          configSummary: currentDNA ? dnaToString(currentDNA) : 'N/A',
          // Rich physics metrics for better achievement detection
          borderStrength:    detectorsRef.current.borderStrength,
          stableClusters:    detectorsRef.current.stableClusters,
          oscillation:       detectorsRef.current.oscillation,
          diversityIndex:    computeDiversity(microStateRef.current, microConfigRef.current.typesCount),
          avgTension:        detectorsRef.current.avgTension,
          avgCohesion:       detectorsRef.current.avgCohesion,
          totalBeats:        stats.totalBeats,
          totalSpeciations:  stats.totalSpeciations,
          totalMutations:    stats.totalMutations,
          totalMitosis:      stats.totalMitosis,
          peakParticleCount: stats.peakParticleCount,
        });
      }

      // Adjust particle count gradually (ULTRA: only check every 30 frames)
      if (timeRef.current.tick % 30 === 0) {
        const currentCount = microStateRef.current.count;
        const targetCount = targetParticleCountRef.current;
        if (currentCount < targetCount) {
          // Add particles gradually (ULTRA: reduced to 10 per check)
          const toAdd = Math.min(10, targetCount - currentCount);
          for (let i = 0; i < toAdd; i++) {
            // Determine if this should be food based on ratio
            let type;
            if (microConfigRef.current.foodEnabled) {
              const foodCount = Math.floor(targetCount * microConfigRef.current.foodRatio);
              const currentFoodCount = Array.from(microStateRef.current.type.slice(0, currentCount))
                .filter(t => t === 255).length;
              
              if (currentFoodCount < foodCount && rngRef.current.next() < 0.5) {
                type = 255; // FOOD_TYPE
              } else {
                type = rngRef.current.int(0, microConfigRef.current.typesCount - 1);
              }
            } else {
              type = rngRef.current.int(0, microConfigRef.current.typesCount - 1);
            }
            
            addParticle(
              microStateRef.current,
              rngRef.current.next() * 2 - 1,
              rngRef.current.next() * 2 - 1,
              type
            );
          }
        } else if (currentCount > targetCount) {
          // Remove particles gradually (ULTRA: reduced to 10 per check)
          const toRemove = Math.min(10, currentCount - targetCount);
          microStateRef.current.count -= toRemove;
        }
      }

      // Render
      const renderStart = performance.now();
      render();
      if (view3dRef.current.mode === '3D' && activeLab !== 'psycheLab') render3D();
      const renderEnd = performance.now();
      const renderMs = renderEnd - renderStart;

      const microStats = getMicroPerfStats();

      perfAccumRef.current.simMs += simMs;
      perfAccumRef.current.renderMs += renderMs;
      perfAccumRef.current.frames += 1;

      if (perfAccumRef.current.frames >= 60) {  // was 30 — halves HUD setState frequency
        setSimMsHUD(perfAccumRef.current.simMs / perfAccumRef.current.frames);
        setRenderMsHUD(perfAccumRef.current.renderMs / perfAccumRef.current.frames);
        setNeighborsHUD(microStats.neighborsChecked);
        setInteractionsHUD(microStats.interactionsApplied);

        perfAccumRef.current.simMs = 0;
        perfAccumRef.current.renderMs = 0;
        perfAccumRef.current.frames = 0;
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [trails, fieldHeatmap, fieldLayer, dimensions, pointSize, fadeFactor, glowIntensity, paletteIndex, renderMode, streakLength, currentDNA, dotSize, simQuality, spawnPattern, showBonds, showTrails, activeLab, emergenceLens, showHome]);

  // ── 3D render helper ────────────────────────────────────────────────────────
  const render3D = useCallback(() => {
    const r3d = renderer3dRef.current;
    if (!r3d?.isReady) return;
    const { mode, cfg } = view3dRef.current;
    if (mode !== '3D') return;

    // PsycheLab handles its own 3D rendering (isolated, self-contained)
    if (activeLab === 'psycheLab') return;

    // Complexity / Sociogenesis
    const ms = microStateRef.current;
    const pts: Particle3D[] = [];
    const nTypes = microConfigRef.current.typesCount;
    const socio  = activeLab === 'sociogenesis' ? socioStateRef.current : null;

    for (let i = 0; i < ms.count; i++) {
      const z = getZMicro(ms.vx[i], ms.vy[i], ms.energy[i], ms.geneA[i], ms.age[i], cfg.zVar);
      let [r, g, b] = typeColor(ms.type[i], nTypes);
      // Sociogenesis: override colour by meme
      if (socio && activeLab === 'sociogenesis') {
        const memeId = socio.culture.memeId[i] ?? 0;
        const hex = MEME_COLORS[memeId % MEME_COLORS.length] ?? '#aaa';
        r = parseInt(hex.slice(1,3),16)/255;
        g = parseInt(hex.slice(3,5),16)/255;
        b = parseInt(hex.slice(5,7),16)/255;
        if (cfg.zVar === 'prestige')
          pts.push({ nx: ms.x[i], ny: ms.y[i], z: clamp3d(socio.culture.prestige[i],0,1), r, g, b });
        else pts.push({ nx: ms.x[i], ny: ms.y[i], z, r, g, b });
        continue;
      }
      pts.push({ nx: ms.x[i], ny: ms.y[i], z, r, g, b });
    }
    r3d.render(pts, cfg);
  }, [activeLab]); // eslint-disable-line

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!canvas || !overlayCanvas) return;

    // Render particles on main canvas
    if (webglRendererRef.current) {
      // G) Update render config
      setRenderConfig(webglRendererRef.current, {
        pointSize,
        fade: fadeFactor,
        glow: glowIntensity,
        paletteIndex,
      });
      
      // Disable main trails when overlay bonds/trails are active
      const useMainTrails = trails && !showBonds && !showTrails;
      
      renderWebGL(
        webglRendererRef.current,
        microStateRef.current,
        microConfigRef.current.typesCount,
        dimensions.width,
        dimensions.height,
        useMainTrails
      );
    } else if (ctx2dRef.current) {
      // Disable main trails when overlay bonds/trails are active
      const useMainTrails = trails && !showBonds && !showTrails;
      
      renderCanvas2D(
        ctx2dRef.current, 
        microStateRef.current, 
        dimensions.width, 
        dimensions.height, 
        useMainTrails,
        renderMode,
        streakLength,
        perfConfigRef.current.renderQuality,
        dotSize
      );
    }

    // Render overlays on separate canvas
    if (!overlayCtxRef.current) {
      overlayCtxRef.current = overlayCanvas.getContext('2d');
    }

    if (overlayCtxRef.current) {
      const ctx = overlayCtxRef.current;
      // Cap DPR at 1.5 — halves pixel count on 2x/3x retina displays for overlays
      // (overlay elements are soft indicators, not crisp UI — barely noticeable)
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      // Sync overlay canvas size — use cached rect, only recompute when invalidated
      if (!overlayRectRef.current.valid) {
        const r = overlayCanvas.getBoundingClientRect();
        overlayRectRef.current.width  = r.width;
        overlayRectRef.current.height = r.height;
        overlayRectRef.current.valid  = true;
      }
      const rW = overlayRectRef.current.width;
      const rH = overlayRectRef.current.height;
      const targetW = Math.floor(rW * dpr);
      const targetH = Math.floor(rH * dpr);
      if (overlayCanvas.width !== targetW || overlayCanvas.height !== targetH) {
        overlayCanvas.width  = targetW;
        overlayCanvas.height = targetH;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Clear overlay
      ctx.clearRect(0, 0, rW, rH);

      // Field heatmap — uses the active FieldLayers (Meadows Engine)
      if (fieldHeatmap) {
        const layerMap: Record<string, import('../sim/fieldLayers/fieldLayers').FieldLayerName> = {
          tension: 'tension', cohesion: 'memory', scarcity: 'nutrient',
          novelty: 'entropy', mythic: 'sigilBond',
        };
        const flLayer = layerMap[fieldLayer] ?? 'tension';
        renderFieldLayersHeatmap(ctx, fieldLayersRef.current, flLayer, rW, rH, 1.2);
      }

      // Artifacts
      renderArtifacts(ctx, reconfigStateRef.current.artifacts, rW, rH);

      // Bonds overlay
      if (showBonds) {
        const bondsConfig: BondsConfig = {
          enabled: true,
          maxDistance: bondsDistance,
          opacity: bondsOpacity,
          thickness: 1.5,
        };
        renderBonds(ctx, microStateRef.current, bondsConfig, paletteIndex);
      }

      // Trails overlay
      if (showTrails) {
        const trailsConfig: TrailsConfig = {
          enabled: true,
          length: trailsLength,
          opacity: trailsOpacity,
          fadeOut: true,
        };
        renderTrails(ctx, microStateRef.current, trailsConfig, paletteIndex);
      }

      // PATCH 04.6: Sigil pings
      if (showSigils) {
        renderSigilPings(ctx, sigilPingsRef.current.pings, rW, rH);
      }

      // PATCH 04.5-SIGILS: Sigil field overlay
      if (sigilCfgRef.current.enabled && sigilCfgRef.current.showOverlay) {
        drawSigils(ctx, sigilStateRef.current, sigilCfgRef.current, rW, rH);
      }

      // SOCIOGENESIS: Render overlay when in sociogenesis lab
      if (activeLab === 'sociogenesis') {
        renderSociogenesisOverlay(
          ctx,
          socioStateRef.current,
          rW,
          rH,
          timeRef.current.elapsed,
          microStateRef.current,
          emergenceLens,
        );

        // RECURSIVE FIELD: Render heatmap when active
        if (fieldLensActive && recursiveFieldRef.current?.cfg?.enabled && recursiveFieldRef.current?.field) {
          renderRecursiveFieldHeatmap(ctx, recursiveFieldRef.current.field, rW, rH);
        }

        // ECONOMY-LITE: Economy / Territory lenses
        if (emergenceLens === 'economy' && economyCfgRef.current.enabled) {
          renderEconomyLens(ctx, economyStateRef.current, economyMetricsRef.current, rW, rH);
        }
        if (emergenceLens === 'territory' && economyCfgRef.current.enabled) {
          renderTerritoryLens(ctx, economyStateRef.current, rW, rH);
        }

        // Render spatial leaders (only when NOT using culture lens)
        if (leadersRef.current.length > 0 && emergenceLens !== 'culture') {
          const palette = PALETTES[paletteIndex % PALETTES.length] || PALETTES[0];
          renderLeaders(ctx, leadersRef.current, rW, rH, palette);
        }

        // Render tool cursor
        if (socioPointerRef.current.cursorX >= 0 && socioPointerRef.current.cursorY >= 0) {
          renderSociogenesisCursor(
            ctx,
            socioStateRef.current.tool,
            socioPointerRef.current.cursorX,
            socioPointerRef.current.cursorY,
            rW,
            rH,
            socioStateRef.current.tool === 'TOTEM'
              ? selectedTotemKind
              : socioStateRef.current.tool === 'TABOO'
                ? selectedTabooKind
                : socioStateRef.current.tool === 'RITUAL'
                  ? selectedRitualKind
                  : undefined,
          );
        }
      }

      // Brush cursor
      if (pointerRef.current.cursorX > 0 && pointerRef.current.cursorY > 0) {
        if (captureMode || pointerRef.current.down) {
          renderBrushCursor(
            ctx,
            pointerRef.current.cursorX,
            pointerRef.current.cursorY,
            brushRadius,
            pointerRef.current.mode,
            rW,
            rH
          );
        }
      }

      // Mini status when UI hidden
      if (hideUI) {
        const lastBeat = chronicleRef.current.beats[chronicleRef.current.beats.length - 1];
        renderMiniStatus(
          ctx,
          microStateRef.current.count,
          microConfigRef.current.typesCount,
          lastBeat ? lastBeat.message.substring(0, 20) : 'None',
          rW,
          rH
        );
      }
    }
  }, [trails, fieldHeatmap, fieldLayer, dimensions, brushRadius, hideUI, pointSize, fadeFactor, glowIntensity, paletteIndex, renderMode, streakLength, dotSize, showBonds, bondsDistance, bondsOpacity, showTrails, trailsLength, trailsOpacity, showSigils, activeLab, selectedTotemKind, selectedTabooKind, selectedRitualKind, captureMode, emergenceLens, fieldLensActive]);

  // Reset stats helper
  const resetStats = () => {
    setStats({
      totalBeats: 0,
      totalSpeciations: 0,
      totalInstitutions: 0,
      totalMutations: 0,
      totalMitosis: 0,
      totalMetamorphosis: 0,
      peakParticleCount: 0,
      peakDiversity: 0,
      peakTension: 0,
      peakCohesion: 0,
      simulationStartTime: Date.now(),
    });
  };

  const loadPreset = (index: number) => {
    const preset = microPresets[index];
    
    // Reset stats
    resetStats();
    
    // Reset sociogenesis symbols when changing preset
    if (activeLab === 'sociogenesis') {
      socioStateRef.current = createSociogenesisState();
      setSocioForce(v => v + 1);
    }
    
    // PATCH 04.3: Auto-enable sigils for archetype presets
    if (preset.showSigils) {
      setShowSigils(true);
    }
    
    // Log system event
    worldLog.push({
      t: timeRef.current.elapsed,
      type: 'system',
      title: `Preset Loaded: ${preset.name}`,
      sigil: '⚙️',
      detail: `${preset.typesCount} types, ${preset.particleCount} particles`,
      meta: { preset: preset.name }
    });
    
    microConfigRef.current.typesCount = preset.typesCount;
    Object.assign(microConfigRef.current, preset.config);

    matrixRef.current = createMatrix(preset.typesCount);
    preset.matrixInit(matrixRef.current);
    
    // Save as base matrix and apply circular dependency if enabled
    baseMatrixRef.current = createMatrix(preset.typesCount);
    copyMatrix(matrixRef.current, baseMatrixRef.current);
    if (microConfigRef.current.circularDependency > 0) {
      applyCircularDependency(matrixRef.current, microConfigRef.current.circularDependency);
    }
    
    // Update regime display
    setCurrentRegime(preset.name);

    // Reset particles with zeroed velocities
    microStateRef.current.count = 0;
    clearTrails(); // Clear trails on reset
    spawnParticles(
      microStateRef.current, 
      preset.particleCount, 
      rngRef.current, 
      preset.typesCount,
      lifeRef.current.foodEnabled,
      lifeRef.current.foodRatio
    );
    // Give small random velocities for initial movement
    for (let i = 0; i < microStateRef.current.count; i++) {
      const angle = rngRef.current.next() * Math.PI * 2;
      const speed = rngRef.current.next() * 0.008;
      microStateRef.current.vx[i] = Math.cos(angle) * speed;
      microStateRef.current.vy[i] = Math.sin(angle) * speed;
    }
    
    // Update target particle count
    targetParticleCountRef.current = preset.particleCount;
    setTargetParticleCountUI(preset.particleCount);
    
    // Clear field systems (flush ghost patterns between presets)
    fieldStateRef.current = createFieldState(48, 27);
    fieldLayersRef.current = createFieldLayers(64);
    
    // Clear chronicles and artifacts
    chronicleRef.current.beats = [];
    reconfigStateRef.current.artifacts = [];
    undoBufferRef.current.snapshots = [];

    takeSnapshot(
      undoBufferRef.current,
      microConfigRef.current,
      matrixRef.current,
      baseMatrixRef.current,
      reconfigStateRef.current,
      timeRef.current.elapsed
    );

    // Ensure simulation is running
    timeRef.current.running = true;

    setForceUpdate((v) => v + 1);
    toast.success(`${preset.name} | ${preset.typesCount} types | ${preset.particleCount} particles`);
  };
  
  // PATCH 04.5: Life config update handler
  const onLifeChange = (patch: Partial<LifeConfig>) => {
    setLife(prev => applyLifeDial({ ...prev, ...patch }));
  };
  
  const loadCreativePresetById = (presetId: string) => {
    const preset = CREATIVE_PRESETS.find(p => p.id === presetId);
    if (preset) {
      loadCreativePreset(preset, false);
    } else {
      toast.error(`Preset ${presetId} not found`);
    }
  };

  const loadCreativePreset = (preset: CreativePreset, fromLauncher: boolean = false) => {
    // Reset stats
    resetStats();
    
    // Log system event
    worldLog.push({
      t: timeRef.current.elapsed,
      type: 'system',
      title: `Creative Preset: ${preset.name}`,
      sigil: '◈',
      detail: preset.description,
      meta: { preset: preset.name, seed: preset.seed }
    });
    
    // Update RNG with preset seed
    rngRef.current = new SeededRNG(preset.seed);
    setCurrentSeed(preset.seed);
    setRandomPaletteSeed(preset.seed); // Update random palette colors
    
    // Apply configuration
    microConfigRef.current.typesCount = preset.typesCount;
    Object.assign(microConfigRef.current, preset.micro);
    Object.assign(fieldConfigRef.current, preset.field);
    Object.assign(reconfigConfigRef.current, preset.reconfig);
    
    // Generate matrix based on style
    if (preset.matrix) {
      matrixRef.current = generatePresetMatrix(
        preset.matrix.style,
        preset.typesCount,
        rngRef.current,
        microConfigRef.current.rmax
      );
    } else {
      matrixRef.current = createMatrix(preset.typesCount);
      randomizeMatrix(matrixRef.current, rngRef.current, microConfigRef.current.rmax);
    }
    
    // Save as base matrix
    baseMatrixRef.current = createMatrix(preset.typesCount);
    copyMatrix(matrixRef.current, baseMatrixRef.current);
    
    if (microConfigRef.current.circularDependency && microConfigRef.current.circularDependency > 0) {
      applyCircularDependency(matrixRef.current, microConfigRef.current.circularDependency);
    }
    
    // Update regime display
    setCurrentRegime(preset.name);
    
    // PATCH 04.3: Auto-enable sigil overlay for Archetype presets
    if (preset.id.includes('sigil') || preset.id.includes('archetype')) {
      setShowSigils(true);
      toast.info('Sigil Overlay Ativado', {
        description: 'Observe os símbolos emergentes aparecerem nos campos!',
        duration: 4000,
      });
    }
    
    // Show guide hint if guide was never opened (on first preset load)
    if (fromLauncher) {
      const guideCompleted = localStorage.getItem('guide_completed');
      if (!guideCompleted) {
        setShowGuideHint(true);
        // Hide after 10 seconds
        setTimeout(() => setShowGuideHint(false), 10000);
      }
    }
    
    // Reset particles
    microStateRef.current.count = 0;
    clearTrails();
    const safeParticleCount = Math.min(preset.particleCount, 800);
    spawnParticles(
      microStateRef.current,
      safeParticleCount,
      rngRef.current,
      preset.typesCount,
      lifeRef.current.foodEnabled,
      lifeRef.current.foodRatio
    );
    
    // Update target count
    targetParticleCountRef.current = safeParticleCount;
    setTargetParticleCountUI(safeParticleCount);
    
    // Initialize velocities
    for (let i = 0; i < microStateRef.current.count; i++) {
      const angle = rngRef.current.next() * Math.PI * 2;
      const speed = rngRef.current.next() * 0.01;
      microStateRef.current.vx[i] = Math.cos(angle) * speed;
      microStateRef.current.vy[i] = Math.sin(angle) * speed;
      
      // Initialize energy if enabled
      if (microConfigRef.current.energyEnabled) {
        microStateRef.current.energy[i] = 1.2;
      }
    }
    
    // Clear field systems (flush ghost patterns between presets)
    fieldStateRef.current = createFieldState(48, 27);
    fieldLayersRef.current = createFieldLayers(64);
    chronicleRef.current.beats = [];
    reconfigStateRef.current.artifacts = [];
    undoBufferRef.current.snapshots = [];
    
    takeSnapshot(
      undoBufferRef.current,
      microConfigRef.current,
      matrixRef.current,
      baseMatrixRef.current,
      reconfigStateRef.current,
      timeRef.current.elapsed
    );
    
    // Ensure running
    timeRef.current.running = true;
    
    setForceUpdate((v) => v + 1);
    
    trackExternalEvent('preset_loaded');
    toast.success(preset.name, {
      description: preset.description
    });
  };

  const handleSeedChange = (newSeed: number) => {
    setCurrentSeed(newSeed);
    rngRef.current = new SeededRNG(newSeed);
    setRandomPaletteSeed(newSeed); // Update random palette colors
    toast.info(`Seed updated: ${newSeed}`);
  };

  // SOCIOGENESIS: Load preset within sociogenesis lab
  const loadSociogenesisPreset = (presetId: string) => {
    const preset = SOCIOGENESIS_PRESETS.find(p => p.id === presetId);
    if (!preset) {
      toast.error(`Preset ${presetId} not found`);
      return;
    }

    // Reset sociogenesis state completely
    socioStateRef.current = createSociogenesisState();
    leadersRef.current = [];
    cultureInitializedRef.current = false;
    setMemeStatsUI(null);
    setPrestigeLeadersUI([]);
    lastLeaderDetectRef.current = 0;
    lastTribeDetectRef.current = 0;
    lastEmergenceDetectRef.current = 0;
    clearPings();
    clearChronicle();
    
    // Apply preset to micro system
    microConfigRef.current.typesCount = preset.typesCount;
    Object.assign(microConfigRef.current, preset.microConfig);

    matrixRef.current = createMatrix(preset.typesCount);
    preset.matrixInit(matrixRef.current);
    
    baseMatrixRef.current = createMatrix(preset.typesCount);
    copyMatrix(matrixRef.current, baseMatrixRef.current);
    
    // Reset particles
    microStateRef.current.count = 0;
    clearTrails();
    const safeCount = Math.min(preset.particleCount, 1000);
    spawnParticles(
      microStateRef.current,
      safeCount,
      rngRef.current,
      preset.typesCount,
      false, // no food in sociogenesis
      0
    );
    
    // Apply spawn layout for visual differentiation
    if (preset.spawnLayout && preset.spawnLayout !== 'random') {
      applySpawnLayout(microStateRef.current, preset.spawnLayout, preset.typesCount);
    }
    
    // Initialize velocities (small, type-specific for better initial dynamics)
    for (let i = 0; i < microStateRef.current.count; i++) {
      const angle = rngRef.current.next() * Math.PI * 2;
      const speed = rngRef.current.next() * 0.005 + 0.001;
      microStateRef.current.vx[i] = Math.cos(angle) * speed;
      microStateRef.current.vy[i] = Math.sin(angle) * speed;
    }

    // Run socioSetup to place initial totems/taboos/rituals
    if (preset.socioSetup) {
      preset.socioSetup(socioStateRef.current);
    }

    targetParticleCountRef.current = safeCount;
    setTargetParticleCountUI(safeCount);
    
    // Reset field state
    fieldStateRef.current = createFieldState(48, 27);
    
    // Reset time for fresh emergence detection
    timeRef.current.tick = 0;
    timeRef.current.elapsed = 0;
    timeRef.current.running = true;
    
    setCurrentRegime(preset.name);
    setEmergenceLens('off');
    setForceUpdate(v => v + 1);
    setSocioForce(v => v + 1);
    
    // Chronicle + initial ping
    pushChronicle(0, `${preset.icon} ${preset.name}`, '#a78bfa');
    pushChronicle(0, preset.description, '#94a3b8');
    
    toast.success(preset.name, {
      description: preset.description,
      duration: 4000,
    });
  };

  // SOCIOGENESIS: Generate random world
  const handleSocioNewWorld = () => {
    const idx = Math.floor(rngRef.current.next() * SOCIOGENESIS_PRESETS.length);
    const randomPreset = SOCIOGENESIS_PRESETS[idx];
    // Reset economy so hotspots regenerate for the new world seed
    ecoInitializedRef.current = false;
    economyStateRef.current.claimOwner.fill(-1);
    economyStateRef.current.claimStrength.fill(0);
    setEconomyMetricsUI(createEconomyMetrics());
    loadSociogenesisPreset(randomPreset.id);
  };

  // SOCIOGENESIS: Reset all symbols
  const handleSocioResetSymbols = () => {
    socioStateRef.current.totems = [];
    socioStateRef.current.taboos = [];
    socioStateRef.current.rituals = [];
    socioStateRef.current.tribes = [];
    socioStateRef.current.cases = [];
    socioStateRef.current.selected = null;
    leadersRef.current = [];
    cultureInitializedRef.current = false;
    clearPings();
    clearChronicle();
    pushChronicle(timeRef.current.elapsed, 'All symbols cleared — blank slate', '#94a3b8');
    socioStateRef.current.chronicle.unshift({
      time: timeRef.current.elapsed,
      icon: '🗑️',
      message: 'All symbols cleared',
      cause: 'Manual reset',
      consequence: 'Blank slate - ready for new emergence',
    });
    setSocioForce(v => v + 1);
  };
  
  // Change simulation quality
  const handleQualityChange = (quality: SimQuality) => {
    applyQualityPreset(perfConfigRef.current, quality);
    setSimQuality(quality);
    toast.info(`Quality: ${quality}`, {
      description: `Max steps: ${perfConfigRef.current.maxStepsPerFrame}`,
      duration: 2000,
    });
    setForceUpdate((v) => v + 1);
  };
  
  // Change spawn pattern and respawn
  const handleSpawnPatternChange = (pattern: string) => {
    setSpawnPattern(pattern);
    
    // Find recipe
    const recipe = SPAWN_RECIPES.find(r => r.id === pattern);
    
    if (recipe) {
      // Use new spawn recipe system
      const count = microStateRef.current.count;
      const { positions, types } = spawnFromRecipe(
        recipe,
        count,
        microConfigRef.current.typesCount,
        2, // worldWidth
        2  // worldHeight
      );
      
      // Apply positions and types
      microStateRef.current.count = count;
      for (let i = 0; i < count; i++) {
        microStateRef.current.x[i] = positions[i * 2] - 1; // Convert to -1..1
        microStateRef.current.y[i] = positions[i * 2 + 1] - 1;
        microStateRef.current.type[i] = types[i];
        microStateRef.current.vx[i] = 0;
        microStateRef.current.vy[i] = 0;
        microStateRef.current.energy[i] = 1.0;
      }
      
      setForceUpdate((v) => v + 1);
      toast.info(recipe.name, {
        description: recipe.description,
        duration: 3000,
      });
    } else {
      // Fallback to old system
      const count = microStateRef.current.count;
      microStateRef.current.count = 0;
      spawnParticlesWithPattern(
        microStateRef.current,
        count,
        pattern as any,
        rngRef.current,
        microConfigRef.current.typesCount,
        lifeRef.current.foodEnabled,
        lifeRef.current.foodRatio
      );
      
      for (let i = 0; i < microStateRef.current.count; i++) {
        microStateRef.current.vx[i] = 0;
        microStateRef.current.vy[i] = 0;
        microStateRef.current.energy[i] = 1.0;
      }
      
      setForceUpdate((v) => v + 1);
      toast.info(`Spawn: ${pattern}`, {
        description: 'Particles repositioned',
        duration: 2000,
      });
    }
  };
  
  // Apply DNA to simulation
  const applyDNA = (dna: WorldDNA, seed: number) => {
    // Reset stats
    resetStats();
    
    // Log system event
    worldLog.push({
      t: timeRef.current.elapsed,
      type: 'system',
      title: `New DNA Applied`,
      sigil: '◎',
      detail: `${dna.speciesCount} species, ${dna.matrixMode} matrix`,
      meta: { seed, matrixMode: dna.matrixMode }
    });
    
    // Update seed and DNA
    rngRef.current = new SeededRNG(seed);
    setCurrentSeed(seed);
    setCurrentDNA(dna);
    
    // Initialize narrative motifs from seed
    setMotifsFromSeed(storyRef.current, seed);
    arcRef.current = { name: 'Gênese', since: 0, reason: 'init' };
    setParagraphs([]);
    
    // ULTRA SAFETY: Cap total particles at MAX_CAPACITY
    const MAX_SAFE_PARTICLES = 1200; // ULTRA: Reduced from 2500
    let totalParticles = dna.speciesCount * dna.particlesPerSpecies;
    
    console.log(`🧬 DNA: ${dna.speciesCount} species × ${dna.particlesPerSpecies} = ${totalParticles} particles`);
    
    if (totalParticles > MAX_SAFE_PARTICLES) {
      console.warn(`⚠️ ULTRA CAP: ${totalParticles} → ${MAX_SAFE_PARTICLES} particles`);
      totalParticles = MAX_SAFE_PARTICLES;
    }
    
    microConfigRef.current.typesCount = dna.speciesCount;
    
    // Apply physics
    microConfigRef.current.beta = dna.beta;
    microConfigRef.current.coreRepel = dna.coreRepel;
    microConfigRef.current.rmax = dna.rmax;
    microConfigRef.current.force = dna.forceGain;
    microConfigRef.current.drag = dna.drag;
    microConfigRef.current.speedClamp = dna.speedClamp;
    microConfigRef.current.useDrag = true;
    microConfigRef.current.kernelMode = 'classic';
    
    // Generate matrix
    matrixRef.current = generateStructuralMatrix(
      dna.speciesCount,
      dna.matrixMode,
      dna.matrixSparsity,
      dna.radiusSpread,
      rngRef.current
    );
    
    baseMatrixRef.current = createMatrix(dna.speciesCount);
    copyMatrix(matrixRef.current, baseMatrixRef.current);
    
    // Apply render settings
    setRenderMode(dna.renderMode);
    setFadeFactor(dna.trailsFade);
    setPaletteIndex(dna.paletteId);
    setSpawnPattern(dna.spawnPattern);
    
    // Spawn particles with pattern
    microStateRef.current.count = 0;
    spawnParticlesWithPattern(
      microStateRef.current,
      totalParticles,
      dna.spawnPattern as any,
      rngRef.current,
      dna.speciesCount,
      lifeRef.current.foodEnabled,
      lifeRef.current.foodRatio
    );
    
    // Initialize velocities
    for (let i = 0; i < microStateRef.current.count; i++) {
      const angle = rngRef.current.next() * Math.PI * 2;
      const speed = rngRef.current.next() * 0.01;
      microStateRef.current.vx[i] = Math.cos(angle) * speed;
      microStateRef.current.vy[i] = Math.sin(angle) * speed;
      microStateRef.current.energy[i] = 1.0;
    }
    
    // Update target
    targetParticleCountRef.current = totalParticles;
    setTargetParticleCountUI(totalParticles);
    
    // Clear state (OTIMIZAÇÃO: Resolução reduzida)
    fieldStateRef.current = createFieldState(48, 27);
    chronicleRef.current.beats = [];
    reconfigStateRef.current.artifacts = [];
    undoBufferRef.current.snapshots = [];
    
    // Energy settings
    microConfigRef.current.energyEnabled = dna.energyEnabled;
    
    // Metamorphosis settings
    if (dna.metamorphosisEnabled !== undefined) {
      microConfigRef.current.metamorphosisEnabled = dna.metamorphosisEnabled;
    }
    if (dna.mutationRate !== undefined) {
      microConfigRef.current.mutationRate = dna.mutationRate;
    }
    if (dna.typeStability !== undefined) {
      microConfigRef.current.typeStability = dna.typeStability;
    }
    
    // Reset time
    timeRef.current.tick = 0;
    timeRef.current.elapsed = 0;
    timeRef.current.running = true;
    
    setForceUpdate((v) => v + 1);
    toast.success(`DNA Applied`, {
      description: dnaToString(dna),
      duration: 4000,
    });
  };
  
  // Apply a recipe
  const applyRecipe = (recipeName: string) => {
    const seed = Date.now();
    const dna = generateRecipeDNA(recipeName, seed);
    applyDNA(dna, seed);
    setCurrentRegime(recipeName.charAt(0).toUpperCase() + recipeName.slice(1));
    
    // Special message for Darwin
    if (recipeName === 'darwin') {
      setTimeout(() => {
        toast.success('Evolução Ativa', {
          description: 'Observe partículas mudando de cor (tipo), crescendo com energia e pulsando ao evoluir.',
          duration: 7000,
        });
      }, 1500);
    }
  };
  
  // Chaos seed: random DNA with high mutation
  const applyChaosSeed = () => {
    const seed = Date.now();
    let dna = generateDNA(seed);
    
    // Apply chaos mutation
    dna = chaosMutateDNA(dna, rngRef.current);
    
    applyDNA(dna, seed);
    setCurrentRegime('Chaos');
    toast('CHAOS SEED', {
      description: 'Extreme randomization applied',
      duration: 3000,
    });
  };
  
  // New universe with DNA
  const newUniverseWithDNA = () => {
    const seed = Date.now();
    const dna = generateDNA(seed);
    applyDNA(dna, seed);
    setCurrentRegime('New Universe');
    
    // Add explanatory message about archetypes
    worldLog.push({
      t: 0,
      type: 'system',
      title: '🧬 Sistema de Arquétipos Ativo',
      sigil: '✶',
      detail: `O MetaLifeLab agora observa a evolução genética dos agentes!\n\n` +
        `📖 Como funciona:\n` +
        `• Cada partícula possui 4 genes (A, B, C, D) que influenciam seu comportamento\n` +
        `• Os genes mutam gradualmente através de campos de entropia\n` +
        `• Quando genes divergem o suficiente, uma nova ESPÉCIE emerge (arquétipo)\n` +
        `• Cada arquétipo recebe um nome, sigil único e perfil genético\n\n` +
        `🔬 Especiação acontece a cada ~10 segundos se as condições forem adequadas.\n` +
        `Aguarde... novas espécies podem surgir a qualquer momento!`,
    });
  };

  const handleRandomizeAll = () => {
    // New seed
    const seed = Date.now();
    rngRef.current = new SeededRNG(seed);
    setCurrentSeed(seed);
    
    // Choose a random regime that favors pattern formation
    const regime = rngRef.current.int(0, 5);
    const newTypesCount = rngRef.current.int(3, 7); // Fewer types = clearer patterns
    const newParticleCount = rngRef.current.int(1500, 3000);
    
    microConfigRef.current.typesCount = newTypesCount;
    
    // Balanced physics parameters for stable patterns
    microConfigRef.current.rmax = 0.10 + rngRef.current.next() * 0.08; // 0.10-0.18
    microConfigRef.current.force = 0.9 + rngRef.current.next() * 0.6; // 0.9-1.5 (more moderate)
    microConfigRef.current.friction = 0.90 + rngRef.current.next() * 0.06; // 0.90-0.96 (higher friction = more stable)
    microConfigRef.current.speedClamp = 0.08 + rngRef.current.next() * 0.08; // 0.08-0.16
    microConfigRef.current.entropy = rngRef.current.next() * 0.001; // Low entropy

    // Create structured matrix based on regime
    matrixRef.current = createMatrix(newTypesCount);
    
    if (regime === 0) {
      // ORBITAL: Types chase each other in a cycle
      for (let i = 0; i < newTypesCount; i++) {
        for (let j = 0; j < newTypesCount; j++) {
          const dist = (j - i + newTypesCount) % newTypesCount;
          if (dist === 0) {
            matrixRef.current.attract[i][j] = 0.2 + rngRef.current.next() * 0.3; // Self-attraction
          } else if (dist === 1) {
            matrixRef.current.attract[i][j] = 0.5 + rngRef.current.next() * 0.4; // Chase next
          } else if (dist === newTypesCount - 1) {
            matrixRef.current.attract[i][j] = -0.5 - rngRef.current.next() * 0.3; // Flee from previous
          } else {
            matrixRef.current.attract[i][j] = -0.2 + rngRef.current.next() * 0.3;
          }
          matrixRef.current.radius[i][j] = microConfigRef.current.rmax * (0.7 + rngRef.current.next() * 0.4);
          matrixRef.current.falloff[i][j] = 1.0 + rngRef.current.next() * 0.5;
        }
      }
      setCurrentRegime('Orbital');
      toast.info('Orbital regime', { description: 'Cyclic attraction patterns' });
      
    } else if (regime === 1) {
      // CLUSTERING: Strong self-attraction, weak cross-repulsion
      for (let i = 0; i < newTypesCount; i++) {
        for (let j = 0; j < newTypesCount; j++) {
          if (i === j) {
            matrixRef.current.attract[i][j] = 0.4 + rngRef.current.next() * 0.3; // Strong cohesion
          } else {
            matrixRef.current.attract[i][j] = -0.3 - rngRef.current.next() * 0.4; // Repulsion
          }
          matrixRef.current.radius[i][j] = microConfigRef.current.rmax * (0.6 + rngRef.current.next() * 0.5);
          matrixRef.current.falloff[i][j] = 0.9 + rngRef.current.next() * 0.6;
        }
      }
      setCurrentRegime('Clustering');
      toast.info('Clustering regime', { description: 'Tribal segregation' });
      
    } else if (regime === 2) {
      // SYMBIOTIC: Pairs of types attract each other strongly
      for (let i = 0; i < newTypesCount; i++) {
        const partner = (i + 1) % newTypesCount;
        for (let j = 0; j < newTypesCount; j++) {
          if (j === partner || j === i) {
            matrixRef.current.attract[i][j] = 0.6 + rngRef.current.next() * 0.3;
          } else {
            matrixRef.current.attract[i][j] = -0.2 - rngRef.current.next() * 0.3;
          }
          matrixRef.current.radius[i][j] = microConfigRef.current.rmax * (0.7 + rngRef.current.next() * 0.4);
          matrixRef.current.falloff[i][j] = 1.2 + rngRef.current.next() * 0.4;
        }
      }
      symmetrizeMatrix(matrixRef.current); // Make symbiosis mutual
      setCurrentRegime('Symbiotic');
      toast.info('Symbiotic regime', { description: 'Paired dependencies' });
      
    } else if (regime === 3) {
      // WAVES: Oscillatory push-pull
      randomizeMatrix(matrixRef.current, rngRef.current, microConfigRef.current.rmax);
      symmetrizeMatrix(matrixRef.current); // Symmetry creates stable oscillations
      // Moderate all forces
      for (let i = 0; i < newTypesCount; i++) {
        for (let j = 0; j < newTypesCount; j++) {
          matrixRef.current.attract[i][j] *= 0.7; // Reduce intensity
        }
      }
      setCurrentRegime('Wave');
      toast.info('Wave regime', { description: 'Symmetric oscillations' });
      
    } else if (regime === 4) {
      // HIERARCHY: One dominant type attracts all, others compete
      const dominant = rngRef.current.int(0, newTypesCount - 1);
      for (let i = 0; i < newTypesCount; i++) {
        for (let j = 0; j < newTypesCount; j++) {
          if (j === dominant) {
            matrixRef.current.attract[i][j] = 0.5 + rngRef.current.next() * 0.4; // All attracted to dominant
          } else if (i === dominant) {
            matrixRef.current.attract[i][j] = -0.3 + rngRef.current.next() * 0.2; // Dominant repels slightly
          } else if (i === j) {
            matrixRef.current.attract[i][j] = 0.3 + rngRef.current.next() * 0.2;
          } else {
            matrixRef.current.attract[i][j] = -0.4 - rngRef.current.next() * 0.3;
          }
          matrixRef.current.radius[i][j] = microConfigRef.current.rmax * (0.6 + rngRef.current.next() * 0.5);
          matrixRef.current.falloff[i][j] = 1.1 + rngRef.current.next() * 0.5;
        }
      }
      setCurrentRegime('Hierarchy');
      toast.info('Hierarchy regime', { description: 'Dominant center structure' });
      
    } else {
      // FRACTAL: Nested sub-groups
      const groupSize = Math.max(2, Math.floor(newTypesCount / 2));
      for (let i = 0; i < newTypesCount; i++) {
        const groupA = Math.floor(i / groupSize);
        for (let j = 0; j < newTypesCount; j++) {
          const groupB = Math.floor(j / groupSize);
          if (i === j) {
            matrixRef.current.attract[i][j] = 0.4 + rngRef.current.next() * 0.2;
          } else if (groupA === groupB) {
            matrixRef.current.attract[i][j] = 0.2 + rngRef.current.next() * 0.3; // Same sub-group
          } else {
            matrixRef.current.attract[i][j] = -0.4 - rngRef.current.next() * 0.3; // Different sub-groups
          }
          matrixRef.current.radius[i][j] = microConfigRef.current.rmax * (0.7 + rngRef.current.next() * 0.4);
          matrixRef.current.falloff[i][j] = 1.0 + rngRef.current.next() * 0.6;
        }
      }
      setCurrentRegime('Fractal');
      toast.info('Fractal regime', { description: 'Nested communities' });
    }
    
    // Save as base matrix and apply circular dependency if enabled
    baseMatrixRef.current = createMatrix(newTypesCount);
    copyMatrix(matrixRef.current, baseMatrixRef.current);
    if (microConfigRef.current.circularDependency > 0) {
      applyCircularDependency(matrixRef.current, microConfigRef.current.circularDependency);
    }

    // Start with fewer particles, let them spawn gradually
    microStateRef.current.count = 0;
    const initialCount = Math.min(800, newParticleCount);
    spawnParticles(
      microStateRef.current, 
      initialCount, 
      rngRef.current, 
      newTypesCount,
      lifeRef.current.foodEnabled,
      lifeRef.current.foodRatio
    );
    // Give small random velocities for initial movement
    for (let i = 0; i < microStateRef.current.count; i++) {
      const angle = rngRef.current.next() * Math.PI * 2;
      const speed = rngRef.current.next() * 0.01;
      microStateRef.current.vx[i] = Math.cos(angle) * speed;
      microStateRef.current.vy[i] = Math.sin(angle) * speed;
    }
    
    // Update target particle count - rest will spawn gradually
    targetParticleCountRef.current = newParticleCount;
    setTargetParticleCountUI(newParticleCount);
    
    // Balanced field config - subtle influence to enhance patterns
    fieldConfigRef.current.diffusion = 0.12 + rngRef.current.next() * 0.08; // 0.12-0.20
    fieldConfigRef.current.decay = 0.025 + rngRef.current.next() * 0.02; // 0.025-0.045
    fieldConfigRef.current.influenceStrength = 0.5 + rngRef.current.next() * 0.8; // 0.5-1.3 (moderate)
    
    // Moderate reconfig - let patterns stabilize before mutating
    reconfigConfigRef.current.mutationStrength = 0.05 + rngRef.current.next() * 0.15; // 0.05-0.20
    reconfigConfigRef.current.speciationRate = 0.3 + rngRef.current.next() * 0.4; // 30-70%
    reconfigConfigRef.current.institutionRate = 0.15 + rngRef.current.next() * 0.35; // 15-50%
    
    // Clear field (OTIMIZAÇÃO: Resolução reduzida)
    fieldStateRef.current = createFieldState(48, 27);
    
    // Clear chronicles and artifacts
    chronicleRef.current.beats = [];
    reconfigStateRef.current.artifacts = [];
    undoBufferRef.current.snapshots = []

;

    takeSnapshot(
      undoBufferRef.current,
      microConfigRef.current,
      matrixRef.current,
      baseMatrixRef.current,
      reconfigStateRef.current,
      timeRef.current.elapsed
    );

    // Ensure simulation is running
    timeRef.current.running = true;

    setForceUpdate((v) => v + 1);
  };

  const handleSaveSnapshot = (name: string): SimulationSnapshot => {
    return createSnapshot(
      microStateRef.current,
      microConfigRef.current,
      matrixRef.current,
      baseMatrixRef.current,
      fieldStateRef.current,
      fieldConfigRef.current,
      reconfigStateRef.current,
      reconfigConfigRef.current,
      chronicleRef.current,
      name
    );
  };

  const handleLoadSnapshot = (snapshot: SimulationSnapshot): void => {
    restoreSnapshot(
      snapshot,
      microStateRef.current,
      microConfigRef.current,
      matrixRef.current,
      baseMatrixRef.current,
      fieldStateRef.current,
      fieldConfigRef.current,
      reconfigStateRef.current,
      reconfigConfigRef.current,
      chronicleRef.current
    );
    setForceUpdate((v) => v + 1);
    toast.success(`Loaded: ${snapshot.name}`);
  };

  // Codex handlers
  const handleSpawnOrganism = (organismId: string) => {
    const organism = codexStateRef.current.organisms.find(o => o.id === organismId);
    if (!organism) return;

    // Spawn at center of screen
    const spawned = spawnOrganism(organism, microStateRef.current, 0, 0, 1.0);
    
    if (spawned > 0) {
      toast.success(`Summoned: ${organism.name}`, {
        description: `${spawned} particles spawned`
      });
    } else {
      toast.error('Failed to summon organism', {
        description: 'Particle limit reached'
      });
    }
  };

  const handleDeleteOrganism = (organismId: string) => {
    const success = deleteOrganism(codexStateRef.current, organismId);
    if (success) {
      toast.success('Organism deleted');
      setForceUpdate(v => v + 1);
    }
  };

  const handleRenameOrganism = (organismId: string, newName: string) => {
    const success = renameOrganism(codexStateRef.current, organismId, newName);
    if (success) {
      setForceUpdate(v => v + 1);
    }
  };

  // Capture thumbnail of canvas region
  const captureThumbnail = (centerX: number, centerY: number, radiusPx: number): string | undefined => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Convert screen coordinates to canvas coordinates
    const canvasX = centerX * dpr;
    const canvasY = centerY * dpr;
    const canvasRadius = radiusPx * dpr;
    
    // Create temporary canvas for thumbnail
    const thumbSize = 160; // Fixed thumbnail size
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbSize;
    thumbCanvas.height = thumbSize;
    const thumbCtx = thumbCanvas.getContext('2d');
    
    if (!thumbCtx) return undefined;
    
    // Calculate source region
    const sx = Math.max(0, canvasX - canvasRadius);
    const sy = Math.max(0, canvasY - canvasRadius);
    const sw = Math.min(canvas.width - sx, canvasRadius * 2);
    const sh = Math.min(canvas.height - sy, canvasRadius * 2);
    
    // Dark background
    thumbCtx.fillStyle = '#0a0a0f';
    thumbCtx.fillRect(0, 0, thumbSize, thumbSize);
    
    // Draw scaled region
    const scale = thumbSize / (canvasRadius * 2);
    const dx = (thumbSize - sw * scale) / 2;
    const dy = (thumbSize - sh * scale) / 2;
    
    try {
      thumbCtx.drawImage(canvas, sx, sy, sw, sh, dx, dy, sw * scale, sh * scale);
      return thumbCanvas.toDataURL('image/png');
    } catch (err) {
      console.error('Failed to capture thumbnail:', err);
      return undefined;
    }
  };

  const screenToWorldCorrect = (clientX: number, clientY: number): [number, number] => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    
    const rect = canvas.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
    
    return [nx, ny];
  };

  // SOCIOGENESIS: Canvas click handler
  const handleSociogenesisClick = useCallback((wx: number, wy: number, shiftKey: boolean) => {
    const S = socioStateRef.current;
    const tool = S.tool;

    if (tool === 'SELECT') {
      // Try to select the nearest entity
      let bestDist = 0.04; // max click distance
      let bestSel: SociogenesisState['selected'] = null;

      for (const t of S.totems) {
        const d2 = (t.pos.x - wx) ** 2 + (t.pos.y - wy) ** 2;
        if (d2 < bestDist) { bestDist = d2; bestSel = { type: 'totem', id: t.id }; }
      }
      for (const t of S.taboos) {
        const d2 = (t.pos.x - wx) ** 2 + (t.pos.y - wy) ** 2;
        if (d2 < bestDist) { bestDist = d2; bestSel = { type: 'taboo', id: t.id }; }
      }

      S.selected = bestSel;
      setSocioForce(v => v + 1);
      return;
    }

    if (tool === 'TOTEM') {
      if (S.totems.length >= S.config.maxTotems) {
        toast.warning('Max totems reached');
        return;
      }
      // Use user-selected kind from panel picker
      const kind: TotemKind = selectedTotemKind;
      const name = generateTotemName(kind);

      const totem = {
        id: genId(S, 'totem'),
        kind,
        pos: { x: wx, y: wy },
        radius: 0.15,
        strength: 0.8,
        pinned: true,
        bornAt: timeRef.current.elapsed,
        name,
      };
      S.totems.push(totem);

      const entry = narrateEvent('TOTEM_FOUNDED', { kind, name }, timeRef.current.elapsed);
      S.chronicle.unshift(entry);
      addBeat(chronicleRef.current, {
        time: timeRef.current.elapsed,
        type: 'institution' as any,
        message: `${entry.icon} ${entry.message}`,
        sigil: entry.icon,
      });
      const tc = kind === 'BOND' ? '#5ac8fa' : kind === 'RIFT' ? '#ff6b6b' : kind === 'ORACLE' ? '#c084fc' : '#94a3b8';
      addEmergencePing(wx, wy, `${kind} placed`, tc, timeRef.current.elapsed);
      pushChronicle(timeRef.current.elapsed, `Totem placed: ${name} (${kind})`, tc);

      setSocioForce(v => v + 1);
      return;
    }

    if (tool === 'TABOO') {
      const kind: TabooKind = selectedTabooKind;

      // If NO_MIX, infer target type by local density
      let targetType: number | undefined;
      if (kind === 'NO_MIX') {
        const typeCounts = new Map<number, number>();
        for (let i = 0; i < microStateRef.current.count; i++) {
          const d2 = (microStateRef.current.x[i] - wx) ** 2 + (microStateRef.current.y[i] - wy) ** 2;
          if (d2 < 0.04) { // within radius
            const t = microStateRef.current.type[i];
            typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
          }
        }
        let maxCount = 0;
        for (const [t, c] of typeCounts) {
          if (c > maxCount) { maxCount = c; targetType = t; }
        }
      }

      const taboo = {
        id: genId(S, 'taboo'),
        kind,
        pos: { x: wx, y: wy },
        radius: 0.12,
        intensity: 0.7,
        targetType,
        bornAt: timeRef.current.elapsed,
      };
      S.taboos.push(taboo);

      const entry = narrateEvent('TABOO_DECLARED', { kind }, timeRef.current.elapsed);
      S.chronicle.unshift(entry);
      addBeat(chronicleRef.current, {
        time: timeRef.current.elapsed,
        type: 'institution' as any,
        message: `${entry.icon} ${entry.message}`,
        sigil: entry.icon,
      });
      const tbc = kind === 'NO_ENTER' ? '#ef4444' : '#f97316';
      addEmergencePing(wx, wy, `${kind.replace('_', ' ')} taboo`, tbc, timeRef.current.elapsed);
      pushChronicle(timeRef.current.elapsed, `Taboo declared: ${kind.replace('_', ' ')}`, tbc);

      setSocioForce(v => v + 1);
      return;
    }

    if (tool === 'RITUAL') {
      // Find nearest totem
      let nearestTotem: typeof S.totems[0] | null = null;
      let bestDist = 0.06;
      for (const t of S.totems) {
        const d2 = (t.pos.x - wx) ** 2 + (t.pos.y - wy) ** 2;
        if (d2 < bestDist) { bestDist = d2; nearestTotem = t; }
      }
      if (!nearestTotem) {
        toast.warning('Click on a totem to create a ritual');
        return;
      }
      if (S.rituals.length >= S.config.maxRituals) {
        toast.warning('Max rituals reached');
        return;
      }

      // Check if ritual already exists for this totem
      const existing = S.rituals.find(r => r.totemId === nearestTotem!.id);
      let kind: RitualKind = selectedRitualKind;
      if (existing) {
        // Update existing ritual to selected kind (or cycle if same)
        if (existing.kind === selectedRitualKind) {
          const RITUAL_KINDS_CYCLE: RitualKind[] = ['GATHER', 'PROCESSION', 'OFFERING'];
          const idx = RITUAL_KINDS_CYCLE.indexOf(existing.kind);
          kind = RITUAL_KINDS_CYCLE[(idx + 1) % RITUAL_KINDS_CYCLE.length];
        }
        existing.kind = kind;

        const entry = narrateEvent('RITUAL_STARTED', { kind, totemName: nearestTotem.name }, timeRef.current.elapsed);
        S.chronicle.unshift(entry);
        setSocioForce(v => v + 1);
        toast.success(`Ritual changed to ${kind}`, { duration: 2000 });
        return;
      }

      const ritual = {
        id: genId(S, 'ritual'),
        kind,
        totemId: nearestTotem.id,
        periodSec: 8,
        dutyCycle: 0.4,
        intensity: 0.7,
        bornAt: timeRef.current.elapsed,
      };
      S.rituals.push(ritual);

      const entry = narrateEvent('RITUAL_STARTED', { kind, totemName: nearestTotem.name }, timeRef.current.elapsed);
      S.chronicle.unshift(entry);
      addBeat(chronicleRef.current, {
        time: timeRef.current.elapsed,
        type: 'institution' as any,
        message: `${entry.icon} ${entry.message}`,
        sigil: entry.icon,
      });
      addEmergencePing(nearestTotem.pos.x, nearestTotem.pos.y, `${kind} ritual`, '#34d399', timeRef.current.elapsed);
      pushChronicle(timeRef.current.elapsed, `Ritual started: ${kind} at ${nearestTotem.name}`, '#34d399');

      setSocioForce(v => v + 1);
      return;
    }
  }, [selectedTotemKind, selectedTabooKind, selectedRitualKind]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    
    const rect = canvas.getBoundingClientRect();
    pointerRef.current.down = true;
    pointerRef.current.id = e.pointerId;
    pointerRef.current.x = e.clientX;
    pointerRef.current.y = e.clientY;
    pointerRef.current.prevX = e.clientX;
    pointerRef.current.prevY = e.clientY;
    pointerRef.current.cursorX = e.clientX - rect.left;
    pointerRef.current.cursorY = e.clientY - rect.top;
    pointerRef.current.shift = e.shiftKey;
    pointerRef.current.alt = e.altKey;

    // SOCIOGENESIS: Handle sociogenesis tool clicks
    if (activeLab === 'sociogenesis') {
      const [wx, wy] = screenToWorldCorrect(e.clientX, e.clientY);
      handleSociogenesisClick(wx, wy, e.shiftKey);
      return;
    }

    // Determine mode based on capture mode state and modifiers
    if (captureMode) {
      pointerRef.current.mode = 'CAPTURE';
    } else if (e.altKey) {
      pointerRef.current.mode = 'ERASE';
    } else if (e.shiftKey) {
      pointerRef.current.mode = 'SEED';
    } else {
      // Use selected power
      pointerRef.current.mode = selectedPower.toUpperCase() as typeof pointerRef.current.mode;
    }

    const [wx, wy] = screenToWorldCorrect(e.clientX, e.clientY);
    const radiusWorld = (brushRadius / Math.min(rect.width, rect.height)) * 2;

    if (pointerRef.current.mode === 'CAPTURE') {
      // Capture thumbnail
      const thumbnail = captureThumbnail(
        e.clientX - rect.left,
        e.clientY - rect.top,
        brushRadius
      );
      
      // Capture organism on click
      const organism = captureOrganism(
        codexStateRef.current,
        microStateRef.current,
        wx,
        wy,
        radiusWorld,
        microConfigRef.current.typesCount,
        paletteIndex,
        currentSeed,
        thumbnail
      );
      
      if (organism) {
        toast.success(`Captured: ${organism.name}`, {
          description: `${organism.particles.length} particles`
        });
        setForceUpdate(v => v + 1);
      } else {
        toast.error('No particles in capture area');
      }
    } else if (pointerRef.current.mode === 'PULSE') {
      applyImpulse(microStateRef.current, wx, wy, radiusWorld, 50.0 * (brushStrength / 100));
    } else if (pointerRef.current.mode === 'WHITE-HOLE') {
      applyWhiteHole(microStateRef.current, wx, wy, radiusWorld, 250.0 * (brushStrength / 100));
      depositFieldRadius(fieldStateRef.current, wx, wy, radiusWorld * 0.5, 500.0 * (brushStrength / 100), 0, 0, 0, 0);
    } else if (pointerRef.current.mode === 'BLACK-HOLE') {
      applyBlackHole(microStateRef.current, wx, wy, radiusWorld, 250.0 * (brushStrength / 100));
      depositFieldRadius(fieldStateRef.current, wx, wy, radiusWorld * 0.5, 0, 500.0 * (brushStrength / 100), 0, 0, 0);
    } else if (pointerRef.current.mode === 'WIND') {
      applyImpulse(microStateRef.current, wx, wy, radiusWorld, 25.0 * (brushStrength / 100));
    // ── 6 NEW POWERS ──────────────────────────────────────────────────────────
    } else if (pointerRef.current.mode === 'VORTEX') {
      applyVortex(microStateRef.current, wx, wy, radiusWorld, 80.0 * (brushStrength / 100));
    } else if (pointerRef.current.mode === 'FREEZE') {
      applyFreeze(microStateRef.current, wx, wy, radiusWorld, Math.min(0.98, 0.6 * (brushStrength / 100)));
    } else if (pointerRef.current.mode === 'CHAOS') {
      applyChaos(microStateRef.current, wx, wy, radiusWorld, 80.0 * (brushStrength / 100));
    } else if (pointerRef.current.mode === 'QUAKE') {
      applyQuake(microStateRef.current, wx, wy, radiusWorld, 80.0 * (brushStrength / 100), timeRef.current.elapsed);
    } else if (pointerRef.current.mode === 'NOVA') {
      applyNova(microStateRef.current, wx, wy, radiusWorld, 500.0 * (brushStrength / 100), novaPhaseRef.current);
      novaPhaseRef.current = novaPhaseRef.current === 0 ? 1 : 0; // toggle phase
    } else if (pointerRef.current.mode === 'MAGNETIZE') {
      applyMagnetize(microStateRef.current, wx, wy, radiusWorld, 0.4 * (brushStrength / 100), selectedType);
    } else if (pointerRef.current.mode === 'ERASE') {
      removeParticlesInRadius(microStateRef.current, wx, wy, radiusWorld, 1.0);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // SOCIOGENESIS: Track cursor for tool preview
    if (activeLab === 'sociogenesis') {
      socioPointerRef.current.cursorX = e.clientX - rect.left;
      socioPointerRef.current.cursorY = e.clientY - rect.top;
    }
    
    // Show cursor when capture mode is active (always) or when dragging
    if (captureMode || pointerRef.current.down) {
      pointerRef.current.cursorX = e.clientX - rect.left;
      pointerRef.current.cursorY = e.clientY - rect.top;
      if (captureMode) {
        pointerRef.current.mode = 'CAPTURE';
      }
    } else {
      pointerRef.current.cursorX = -1;
      pointerRef.current.cursorY = -1;
    }

    if (!pointerRef.current.down || pointerRef.current.id !== e.pointerId) return;

    const [wx, wy] = screenToWorldCorrect(e.clientX, e.clientY);
    const [pwx, pwy] = screenToWorldCorrect(pointerRef.current.prevX, pointerRef.current.prevY);
    const radiusWorld = (brushRadius / Math.min(rect.width, rect.height)) * 2;

    if (pointerRef.current.mode === 'WIND') {
      const dx = wx - pwx;
      const dy = wy - pwy;
      applyWind(microStateRef.current, wx, wy, radiusWorld, dx * 500.0 * (brushStrength / 100), dy * 500.0 * (brushStrength / 100));
    } else if (pointerRef.current.mode === 'PULSE') {
      applyImpulse(microStateRef.current, wx, wy, radiusWorld, 50.0 * (brushStrength / 100));
    } else if (pointerRef.current.mode === 'WHITE-HOLE') {
      applyWhiteHole(microStateRef.current, wx, wy, radiusWorld, 250.0 * (brushStrength / 100));
      depositFieldRadius(fieldStateRef.current, wx, wy, radiusWorld * 0.5, 400.0 * (brushStrength / 100), 0, 0, 0, 0);
    } else if (pointerRef.current.mode === 'BLACK-HOLE') {
      applyBlackHole(microStateRef.current, wx, wy, radiusWorld, 250.0 * (brushStrength / 100));
      depositFieldRadius(fieldStateRef.current, wx, wy, radiusWorld * 0.5, 0, 400.0 * (brushStrength / 100), 0, 0, 0);
    // ── 6 NEW POWERS (drag) ───────────────────────────────────────────────────
    } else if (pointerRef.current.mode === 'VORTEX') {
      applyVortex(microStateRef.current, wx, wy, radiusWorld, 80.0 * (brushStrength / 100));
    } else if (pointerRef.current.mode === 'FREEZE') {
      applyFreeze(microStateRef.current, wx, wy, radiusWorld, Math.min(0.98, 0.6 * (brushStrength / 100)));
    } else if (pointerRef.current.mode === 'CHAOS') {
      applyChaos(microStateRef.current, wx, wy, radiusWorld, 80.0 * (brushStrength / 100));
    } else if (pointerRef.current.mode === 'QUAKE') {
      applyQuake(microStateRef.current, wx, wy, radiusWorld, 80.0 * (brushStrength / 100), timeRef.current.elapsed);
    } else if (pointerRef.current.mode === 'NOVA') {
      // On drag Nova pulses in current phase without toggling
      applyNova(microStateRef.current, wx, wy, radiusWorld, 500.0 * (brushStrength / 100), novaPhaseRef.current);
    } else if (pointerRef.current.mode === 'MAGNETIZE') {
      applyMagnetize(microStateRef.current, wx, wy, radiusWorld, 0.25 * (brushStrength / 100), selectedType);
    } else if (pointerRef.current.mode === 'SEED') {
      const count = Math.max(1, Math.floor(seedRate / 30)); // ~30fps assumption
      for (let i = 0; i < count; i++) {
        addParticle(
          microStateRef.current,
          wx + (Math.random() - 0.5) * radiusWorld * 0.5,
          wy + (Math.random() - 0.5) * radiusWorld * 0.5,
          selectedType
        );
      }
    } else if (pointerRef.current.mode === 'ERASE') {
      removeParticlesInRadius(microStateRef.current, wx, wy, radiusWorld, eraseRate * 0.3);
    }

    pointerRef.current.prevX = e.clientX;
    pointerRef.current.prevY = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (canvas && pointerRef.current.id === e.pointerId) {
      canvas.releasePointerCapture(e.pointerId);
    }
    
    pointerRef.current.down = false;
    pointerRef.current.cursorX = -1;
    pointerRef.current.cursorY = -1;
    // Keep socio cursor alive for hover preview
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    handlePointerUp(e);
  };

  // ── Recording handlers (Complexity Life Lab) ──────────────────────────────
  const handleRecStart = useCallback((opts?: { format?: string; quality?: string }) => {
    recorderRef.current?.start(
      () => viewMode === '3D'
        ? [canvasRef.current, overlayCanvasRef.current, canvas3dRef.current]
        : [canvasRef.current, overlayCanvasRef.current],
      () => ({
        labName: 'Complexity Life Lab',
        lines: [
          `partículas: ${microStateRef.current.count}  ·  espécies: ${microConfigRef.current.typesCount}`,
          `qualidade: ${simQuality}  ·  fps: ${Math.round(timeRef.current.fps)}`,
          currentDNA ? `dna: ${dnaToString(currentDNA).slice(0, 28)}` : `regime: ${currentRegime}`,
        ],
      }),
      30, undefined,
      { format: (opts?.format ?? 'auto') as any, quality: (opts?.quality ?? 'standard') as any },
    );
  }, [viewMode, simQuality, currentDNA, currentRegime]);

  const handleRecStop = useCallback(() => recorderRef.current?.stop(), []);

  return (
    <div className="w-full h-screen overflow-hidden flex" style={{ background }}>
      {/* Canvas container - takes remaining space, hidden on homepage */}
      <div ref={canvasContainerRef} className="flex-1 relative overflow-hidden"
        style={{ display: showHome ? 'none' : undefined }}>
        {/* Inner wrapper — only the canvases get CSS zoom/pan transform */}
        <div ref={canvasInnerRef} className="absolute inset-0" style={{ willChange: 'transform' }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          style={{ width: '100%', height: '100%', touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        />
        
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        />

        {/* 3D canvas — overlays the 2D render when viewMode='3D', hidden for Psyche Lab */}
        <canvas
          ref={canvas3dRef}
          className="absolute inset-0"
          style={{
            width: '100%', height: '100%',
            display: viewMode === '3D' && activeLab !== 'psycheLab' ? 'block' : 'none',
            pointerEvents: viewMode === '3D' && activeLab !== 'psycheLab' ? 'auto' : 'none',
            cursor: 'grab',
          }}
        />
        </div>{/* end canvasInnerRef */}

        {/* Recording button — Complexity Life Lab only */}
        {activeLab === 'complexityLife' && (
          <RecordingButton
            state={recState}
            elapsed={recElapsed}
            onStart={handleRecStart}
            onStop={handleRecStop}
            showOptions
            className="absolute bottom-4 right-4 z-20"
          />
        )}

        {/* COMPLEXITY LENS (PATCH 01): Bottom-up feedback panel — Complexity Life Lab */}
        {activeLab === 'complexityLife' && COMPLEXITY_LENS && (
          <ComplexityPanel
            lensState={complexitySnap}
            fps={timeRef.current.fps ?? 60}
            agentCount={microStateRef.current.count}
            vitalRates={complexitySnap.vitalRates}
            moduleTelemetry={complexitySnap.moduleTelemetry}
            microConfig={{ ...microConfigRef.current }}
            fieldConfig={{ ...fieldConfigRef.current }}
            life={lifeRef.current}
            targetParticleCount={targetParticleCountUI}
            onMicroChange={(patch) => {
              Object.assign(microConfigRef.current, patch);
            }}
            onFieldChange={(patch) => {
              Object.assign(fieldConfigRef.current, patch);
            }}
            onLifeChange={(patch) => {
              setLife(prev => applyLifeDial({ ...prev, ...patch }));
            }}
            onTargetParticleCountChange={(v) => {
              targetParticleCountRef.current = v;
              setTargetParticleCountUI(v);
            }}
            onConfigChange={(patch) => {
              Object.assign(complexityLensRef.current.feedback.config, patch);
              setComplexitySnap(prev => ({
                ...prev,
                feedback: {
                  ...prev.feedback,
                  config: { ...complexityLensRef.current.feedback.config },
                },
              }));
            }}
            onResetMemory={() => {
              resetFeedbackMemory(complexityLensRef.current.feedback);
              setComplexitySnap(prev => ({
                ...prev,
                feedback: {
                  ...prev.feedback,
                  config:      { ...complexityLensRef.current.feedback.config },
                  metrics:     { ...complexityLensRef.current.feedback.metrics },
                  activations: { ...complexityLensRef.current.feedback.activations },
                  modulation:  { ...complexityLensRef.current.feedback.modulation },
                  phase:       complexityLensRef.current.feedback.phase,
                  phaseLabel:  complexityLensRef.current.feedback.phaseLabel,
                },
              }));
            }}
          />
        )}
        {/* Legacy Or Chozer panel — shown only when COMPLEXITY_LENS is false */}
        {activeLab === 'complexityLife' && !COMPLEXITY_LENS && (
          <OrChozerPanel
            feedbackState={feedbackSnap}
            onConfigChange={(patch) => {
              Object.assign(feedbackStateRef.current.config, patch);
              setFeedbackSnap(prev => ({ ...prev, config: { ...feedbackStateRef.current.config } }));
            }}
            onResetMemory={() => {
              resetFeedbackMemory(feedbackStateRef.current);
              setFeedbackSnap(prev => ({
                ...prev,
                config:      { ...feedbackStateRef.current.config },
                metrics:     { ...feedbackStateRef.current.metrics },
                activations: { ...feedbackStateRef.current.activations },
                modulation:  { ...feedbackStateRef.current.modulation },
                phase:       feedbackStateRef.current.phase,
                phaseLabel:  feedbackStateRef.current.phaseLabel,
              }));
            }}
          />
        )}

        {/* Viewport zoom indicator — Complexity Life */}
        {activeLab === 'complexityLife' && (vpZoom < 0.99 || vpZoom > 1.01 || vpPanned) && (
          <div className="absolute bottom-4 left-4 z-20 flex flex-col items-start gap-1 pointer-events-auto">
            <div className="flex items-center gap-1.5 px-2 py-1" style={{ background: 'rgba(0,0,0,0.92)', border: '1px dashed rgba(255,255,255,0.06)' }}>
              <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">zoom</span>
              <span className="text-[9px] font-mono text-cyan-300/70">{vpZoom.toFixed(2)}×</span>
            </div>
            <button
              onClick={() => {
                vpRef.current = { zoom: 1, panX: 0, panY: 0 };
                if (canvasInnerRef.current) { canvasInnerRef.current.style.transform = ''; }
                setVpZoom(1); setVpPanned(false);
              }}
              className="px-2 py-0.5 text-[8px] font-mono text-white/35 hover:text-white/70 transition-colors" style={{ background: 'rgba(0,0,0,0.85)', border: '1px dashed rgba(255,255,255,0.06)' }}
            >
              [Home] reset
            </button>
            <div className="px-1.5 py-0.5" style={{ background: 'rgba(0,0,0,0.70)', border: '1px dashed rgba(255,255,255,0.04)' }}>
              <span className="text-[7px] font-mono text-white/18">roda=zoom · rclique+drag=pan · ←↑→↓=nav</span>
            </div>
          </div>
        )}
      </div>

      {!hideUI && !showHome && (
        <>
          <TopHUD
            running={timeRef.current.running}
            speed={timeRef.current.speed}
            fps={timeRef.current.fps}
            trails={trails}
            fieldHeatmap={fieldHeatmap}
            canUndo={canUndoFunc(undoBufferRef.current)}
            particleCount={microStateRef.current.count}
            speciesCount={microConfigRef.current.typesCount}
            mode={activeLab === 'sociogenesis' ? socioStateRef.current.tool : pointerRef.current.mode}
            regime={currentRegime}
            circularDependency={microConfigRef.current.circularDependency}
            dnaString={currentDNA ? dnaToString(currentDNA) : undefined}
            simQuality={simQuality}
            simMs={simMsHUD}
            renderMs={renderMsHUD}
            neighborsChecked={neighborsHUD}
            interactionsApplied={interactionsHUD}
            narrativeStatus={narrativeStatus}
            activeLab={activeLab}
            socioStats={activeLab === 'sociogenesis' ? {
              totems: socioStateRef.current.totems.length,
              taboos: socioStateRef.current.taboos.length,
              rituals: socioStateRef.current.rituals.length,
              tribes: socioStateRef.current.tribes.length,
              openCases: socioStateRef.current.cases.filter(c => c.status === 'OPEN').length,
            } : undefined}
            onGoHome={() => setShowHome(true)}
            onLabChange={(lab) => {
              setActiveLab(lab);
              setShowHome(false);
              const LABELS: Record<string, [string, string]> = {
                complexityLife: ['Complexity Life Lab', 'Particle life simulation'],
                sociogenesis:   ['Sociogenesis Tool',  'Place totems, declare taboos, bind rituals'],
                psycheLab:      ['Psyche Lab',         'Neural fields & consciousness dynamics'],
                musicLab:       ['Music Lab',          'Synesthetic Quanta Instrument'],
                alchemyLab:     ['Alchemy Lab',        'Transmutation — The Great Work'],
                metaArtLab:     ['Meta-Arte Tool',     'Experimental Spiritual Photoshop'],
                rhizomeLab:     ['Rhizome Lab',        'Heuristic-Exact — Rede rizomatica viva'],
                asimovTheater:  ['Asimov Theater',     'Psychohistory — Previsao por agentes complexos'],
                languageLab:    ['Language Lab',       'Heptapod — Linguagem não-linear viva'],
                physicsSandbox: ['Physics Sandbox',    'Build Robot · Live Learning via CEM'],
              };
              const [title, desc] = LABELS[lab] ?? [lab, ''];
              toast.info(title, { description: desc, duration: 2000 });
            }}
            onTogglePlay={() => {
              timeRef.current.running = !timeRef.current.running;
              setForceUpdate((v) => v + 1);
            }}
            onStep={() => {
              // Manual step: run one simulation step
              microConfigRef.current.dt = BASE_STEP;
              
              // PATCH 04.5: Apply Life config (same as loop)
              const L = lifeRef.current;
              microConfigRef.current.foodEnabled = L.foodEnabled;
              microConfigRef.current.foodRatio = L.foodRatio;
              microConfigRef.current.energyEnabled = L.energyEnabled;
              microConfigRef.current.energyDecay = L.energyDecay;
              microConfigRef.current.energyFeedRate = L.energyFeedRate;
              microConfigRef.current.energyReproThreshold = L.energyReproThreshold;
              microConfigRef.current.metamorphosisEnabled = (L.mode === 'EVOLUTIVE' || L.mode === 'FULL');
              microConfigRef.current.mutationRate = L.mutationRate;
              microConfigRef.current.typeStability = L.typeStability;
              reconfigConfigRef.current.mutationRate = L.reconfigRate;
              reconfigConfigRef.current.mutationAmount = L.reconfigAmount;
              
              if (recursiveFieldRef.current?.cfg?.enabled) {
                updateParticleLifeWithField(
                  microStateRef.current,
                  microConfigRef.current,
                  matrixRef.current,
                  (x: number, y: number) => {
                    const field = sampleField(fieldStateRef.current, x, y);
                    return {
                      tension: field.tension * fieldConfigRef.current.influenceStrength,
                      cohesion: field.cohesion * fieldConfigRef.current.influenceStrength,
                      scarcity: field.scarcity * fieldConfigRef.current.influenceStrength,
                    };
                  },
                  rngRef.current,
                  timeRef.current.tick,
                  recursiveFieldRef.current,
                );
              } else {
                updateParticleLife(
                  microStateRef.current,
                  microConfigRef.current,
                  matrixRef.current,
                  (x: number, y: number) => {
                    const field = sampleField(fieldStateRef.current, x, y);
                    return {
                      tension: field.tension * fieldConfigRef.current.influenceStrength,
                      cohesion: field.cohesion * fieldConfigRef.current.influenceStrength,
                      scarcity: field.scarcity * fieldConfigRef.current.influenceStrength,
                    };
                  },
                  rngRef.current,
                  timeRef.current.tick
                );
              }
              timeRef.current.tick++;
              timeRef.current.elapsed += BASE_STEP;
              setForceUpdate((v) => v + 1);
            }}
            onSetSpeed={(speed) => {
              timeRef.current.speed = speed;
              setForceUpdate((v) => v + 1);
            }}
            onReset={() => {
              loadPreset(0);
            }}
            onToggleTrails={() => setTrails((v) => !v)}
            onToggleFieldHeatmap={() => setFieldHeatmap((v) => !v)}
            fieldLayer={fieldLayer}
            onFieldLayerChange={(layer) => setFieldLayer(layer as typeof fieldLayer)}
            hideUI={hideUI}
            onToggleHideUI={() => setHideUI(v => !v)}
            onUndo={() => {
              if (undoFunc(undoBufferRef.current, microConfigRef.current, matrixRef.current, baseMatrixRef.current, reconfigStateRef.current)) {
                toast.info('Undone');
                setForceUpdate((v) => v + 1);
              }
            }}
            onOpenGuide={() => {
              setShowGuideHint(false);
              guide.startGuide();
            }}
            achievementCount={achievements.unlockedCount}
            onOpenAchievements={() => setShowAchievements(true)}
            onOpenWorldLog={() => setShowWorldLog(true)}
            onOpenChronicle={() => setShowChronicle(true)}
            viewMode={viewMode}
            onViewModeToggle={() => setViewMode(v => v === '2D' ? '3D' : '2D')}
          />

          {/* 3D Controls — floating bottom bar */}
          {viewMode === '3D' && activeLab !== 'psycheLab' && (
            <View3DControls
              activeLab={activeLab}
              config={view3DConfig}
              onChange={patch => setView3DConfig(prev => ({ ...prev, ...patch }))}
              onReset={() => setView3DConfig(DEFAULT_VIEW3D)}
            />
          )}

          {/* SOCIOGENESIS STUDY MODE: Full-screen overlay — completely isolates from Complexity Lab */}
          {!showHome && activeLab === 'sociogenesis' && (
            <SociogenesisStudyMode
              onLeave={() => setActiveLab('complexityLife')}
            />
          )}

          {/* SOCIOGENESIS LEGACY PANEL: Hidden — kept for reference, replaced by StudyMode above */}
          {false && activeLab === 'sociogenesis' && (
            <SociogenesisPanel
              state={socioStateRef.current}
              observables={observablesRef.current}
              lens={emergenceLens}
              onLensChange={setEmergenceLens}
              memeStats={memeStatsUI}
              prestigeLeaders={prestigeLeadersUI}
              onToolChange={(tool) => {
                socioStateRef.current.tool = tool;
                setSocioForce(v => v + 1);
              }}
              onConfigChange={(patch) => {
                // Log auto-emergence toggle to chronicle
                if ('autoEmergence' in patch) {
                  socioStateRef.current.chronicle.unshift({
                    time: timeRef.current.elapsed,
                    icon: patch.autoEmergence ? '✨' : '🔒',
                    message: patch.autoEmergence
                      ? 'Auto-Emergence ENABLED: Institutions will spawn from particle behavior'
                      : 'Auto-Emergence DISABLED: Manual placement only',
                    cause: 'Observer action',
                    consequence: patch.autoEmergence ? 'System will detect emergent patterns' : 'Manual placement only',
                  });
                }
                Object.assign(socioStateRef.current.config, patch);
                setSocioForce(v => v + 1);
              }}
              onSelectEntity={(sel) => {
                socioStateRef.current.selected = sel;
                setSocioForce(v => v + 1);
              }}
              onRemoveTotem={(id) => {
                const totem = socioStateRef.current.totems.find(t => t.id === id);
                socioStateRef.current.totems = socioStateRef.current.totems.filter(t => t.id !== id);
                // Also remove rituals bound to this totem
                socioStateRef.current.rituals = socioStateRef.current.rituals.filter(r => r.totemId !== id);
                socioStateRef.current.selected = null;
                if (totem) {
                  const entry = narrateEvent('TOTEM_REMOVED', { name: totem.name }, timeRef.current.elapsed);
                  socioStateRef.current.chronicle.unshift(entry);
                }
                setSocioForce(v => v + 1);
              }}
              onRemoveTaboo={(id) => {
                socioStateRef.current.taboos = socioStateRef.current.taboos.filter(t => t.id !== id);
                socioStateRef.current.selected = null;
                const entry = narrateEvent('TABOO_REMOVED', {}, timeRef.current.elapsed);
                socioStateRef.current.chronicle.unshift(entry);
                setSocioForce(v => v + 1);
              }}
              onRemoveRitual={(id) => {
                socioStateRef.current.rituals = socioStateRef.current.rituals.filter(r => r.id !== id);
                socioStateRef.current.selected = null;
                const entry = narrateEvent('RITUAL_ENDED', {}, timeRef.current.elapsed);
                socioStateRef.current.chronicle.unshift(entry);
                setSocioForce(v => v + 1);
              }}
              onOverlayChange={(patch) => {
                Object.assign(socioStateRef.current.overlay, patch);
                setSocioForce(v => v + 1);
              }}
              onForceResolveCase={(id) => {
                const c = socioStateRef.current.cases.find(c => c.id === id);
                if (c && c.status === 'OPEN') {
                  c.status = 'RESOLVED';
                  c.resolution = 'RESTORE';
                  c.resolvedAt = timeRef.current.elapsed;
                }
                setSocioForce(v => v + 1);
              }}
              selectedTotemKind={selectedTotemKind}
              selectedTabooKind={selectedTabooKind}
              selectedRitualKind={selectedRitualKind}
              onTotemKindChange={setSelectedTotemKind}
              onTabooKindChange={setSelectedTabooKind}
              onRitualKindChange={setSelectedRitualKind}
              particleCount={microStateRef.current.count}
              onNewWorld={handleSocioNewWorld}
              onLoadPreset={loadSociogenesisPreset}
              onResetSymbols={handleSocioResetSymbols}
              onCultureConfigChange={(patch) => {
                Object.assign(socioStateRef.current.cultureConfig, patch);
                setSocioForce(v => v + 1);
              }}
              onEntityUpdate={(type, id, patch) => {
                const S = socioStateRef.current;
                if (type === 'totem') {
                  const t = S.totems.find(t => t.id === id);
                  if (t) Object.assign(t, patch);
                } else if (type === 'taboo') {
                  const t = S.taboos.find(t => t.id === id);
                  if (t) Object.assign(t, patch);
                } else if (type === 'ritual') {
                  const r = S.rituals.find(r => r.id === id);
                  if (r) Object.assign(r, patch);
                }
                setSocioForce(v => v + 1);
              }}
              economyConfig={economyCfgUI}
              economyMetrics={economyMetricsUI}
              onEconomyConfigChange={(patch) => {
                if (patch.enabled === true && !economyCfgRef.current.enabled) {
                  ecoInitializedRef.current = false;
                }
                Object.assign(economyCfgRef.current, patch);
                setEconomyCfgUI({ ...economyCfgRef.current });
              }}
              onEconomyPreset={(preset) => {
                const cfg  = economyCfgRef.current;
                const socio = socioStateRef.current;
                const t    = timeRef.current.elapsed;
                ecoInitializedRef.current = false;
                if (preset === 'market_scarcity') {
                  Object.assign(cfg, {
                    enabled: true, resourceMode: 'STATIC' as const,
                    metabolism: 0.035, resourceRegen: 0.025, resourceHarvest: 0.08,
                    claimGain: 0.15, giniAlert: 0.40,
                  });
                  pushChronicle(t, '📈 MARKET SCARCITY — hotspot competition begins', '#fbbf24');
                } else if (preset === 'ritual_economy') {
                  Object.assign(cfg, {
                    enabled: true, resourceMode: 'FIELD_DERIVED' as const,
                    metabolism: 0.012, resourceRegen: 0.07, resourceHarvest: 0.10,
                    claimGain: 0.10, giniAlert: 0.50,
                  });
                  pushChronicle(t, '⛩ RITUAL ECONOMY — symbols have material cost now', '#a78bfa');
                } else if (preset === 'fortress_taboo') {
                  Object.assign(cfg, {
                    enabled: true, resourceMode: 'STATIC' as const,
                    metabolism: 0.018, resourceRegen: 0.05, resourceHarvest: 0.08,
                    claimGain: 0.28, claimDecay: 0.01, giniAlert: 0.35,
                  });
                  if (socio.taboos.length === 0) {
                    socio.taboos.push({
                      id: genId(socio, 'taboo'), kind: 'NO_ENTER',
                      pos: { x: 0, y: 0 }, radius: 0.22, intensity: 1.5,
                      bornAt: t, emergent: false,
                    });
                    pushChronicle(t, '🏰 FORTRESS TABOO — sacred zone placed at center', '#ef4444');
                  } else {
                    pushChronicle(t, '🏰 FORTRESS TABOO — territory conflict intensified', '#ef4444');
                  }
                }
                setEconomyCfgUI({ ...cfg });
                setSocioForce(v => v + 1);
              }}
            />
          )}{/* end legacy SociogenesisPanel */}

          {!collapseDock && activeLab === 'complexityLife' && (
            <RightDock
              microConfig={{...microConfigRef.current}}
              fieldConfig={{...fieldConfigRef.current}}
              reconfigConfig={{...reconfigConfigRef.current}}
              matrix={matrixRef.current}
              chronicle={chronicleRef.current}
              artifacts={reconfigStateRef.current.artifacts}
              diversity={computeDiversity(microStateRef.current, microConfigRef.current.typesCount)}
              clusterCount={detectorsRef.current.stableClusters}
              borderStrength={detectorsRef.current.borderStrength}
              avgTension={detectorsRef.current.avgTension}
              avgCohesion={detectorsRef.current.avgCohesion}
              avgScarcity={detectorsRef.current.avgScarcity}
              brushRadius={brushRadius}
              brushStrength={brushStrength}
              seedRate={seedRate}
              eraseRate={eraseRate}
              selectedType={selectedType}
              selectedPower={selectedPower}
              targetParticleCount={targetParticleCountUI}
              fps={timeRef.current.fps}
              particleCount={microStateRef.current.count}
              onBrushRadiusChange={setBrushRadius}
              onBrushStrengthChange={setBrushStrength}
              onSeedRateChange={setSeedRate}
              onEraseRateChange={setEraseRate}
              onSelectedTypeChange={setSelectedType}
              onSelectedPowerChange={setSelectedPower}
              onTargetParticleCountChange={(value) => {
                targetParticleCountRef.current = value;
                setTargetParticleCountUI(value);
              }}
              onSaveSnapshot={handleSaveSnapshot}
              onLoadSnapshot={handleLoadSnapshot}
              pointSize={pointSize}
              fadeFactor={fadeFactor}
              glowIntensity={glowIntensity}
              paletteIndex={paletteIndex}
              onPointSizeChange={setPointSize}
              onFadeFactorChange={setFadeFactor}
              onGlowIntensityChange={setGlowIntensity}
              onPaletteIndexChange={(newIndex) => {
                setPaletteIndex(newIndex);
                const paletteName = PALETTES[newIndex % PALETTES.length]?.name || `Paleta ${newIndex}`;
                
                // Show color scheme name if it's the random palette
                if (newIndex === PALETTES.length - 1) {
                  const schemeName = getColorSchemeName(currentSeed);
                  toast.success(`${paletteName}: ${schemeName}`, { duration: 2500 });
                } else {
                  toast.success(paletteName, { duration: 1500 });
                }
              }}
              trails={trails}
              fieldHeatmap={fieldHeatmap}
              onToggleTrails={() => setTrails((v) => !v)}
              onToggleFieldHeatmap={() => setFieldHeatmap((v) => !v)}
              onMicroChange={(config) => {
                // Handle metamorphosisEnabled toggle specially
                if (config.metamorphosisEnabled !== undefined && 
                    config.metamorphosisEnabled !== microConfigRef.current.metamorphosisEnabled &&
                    config.metamorphosisEnabled === true) {
                  toast.success('Metamorfose Ativada', {
                    description: 'Partículas agora evoluem e mudam de tipo! Observe anéis dourados ao mutar e tamanhos variando com energia.',
                    duration: 6000,
                  });
                }
                
                // Handle typesCount change specially
                if (config.typesCount !== undefined && config.typesCount !== microConfigRef.current.typesCount) {
                  const oldCount = microConfigRef.current.typesCount;
                  const newCount = Math.max(2, Math.min(16, config.typesCount)); // Clamp 2-16
                  
                  // Update config FIRST
                  microConfigRef.current.typesCount = newCount;
                  
                  if (newCount > oldCount) {
                    // Expand matrix using the utility function
                    expandMatrix(matrixRef.current, newCount, rngRef.current, microConfigRef.current.rmax);
                    expandMatrix(baseMatrixRef.current, newCount, rngRef.current, microConfigRef.current.rmax);
                  } else if (newCount < oldCount) {
                    // Shrink matrix - create new one and copy safely
                    const newMatrix = createMatrix(newCount);
                    const newBaseMatrix = createMatrix(newCount);
                    for (let i = 0; i < newCount; i++) {
                      for (let j = 0; j < newCount; j++) {
                        if (matrixRef.current.attract[i] && matrixRef.current.attract[i][j] !== undefined) {
                          newMatrix.attract[i][j] = matrixRef.current.attract[i][j];
                          newMatrix.radius[i][j] = matrixRef.current.radius[i][j];
                          newMatrix.falloff[i][j] = matrixRef.current.falloff?.[i]?.[j] ?? 1.2;
                        }
                        if (baseMatrixRef.current.attract[i] && baseMatrixRef.current.attract[i][j] !== undefined) {
                          newBaseMatrix.attract[i][j] = baseMatrixRef.current.attract[i][j];
                          newBaseMatrix.radius[i][j] = baseMatrixRef.current.radius[i][j];
                          newBaseMatrix.falloff[i][j] = baseMatrixRef.current.falloff?.[i]?.[j] ?? 1.2;
                        }
                      }
                    }
                    matrixRef.current = newMatrix;
                    baseMatrixRef.current = newBaseMatrix;
                  }
                  
                  // Reapply circular dependency after resize
                  copyMatrix(matrixRef.current, baseMatrixRef.current);
                  if (microConfigRef.current.circularDependency > 0) {
                    applyCircularDependency(matrixRef.current, microConfigRef.current.circularDependency);
                  }
                  
                  // Convert or remove invalid types
                  let validCount = 0;
                  for (let i = 0; i < microStateRef.current.count; i++) {
                    const t = microStateRef.current.type[i];
                    
                    // Keep valid types (0 to newCount-1, or FOOD_TYPE)
                    if (t === 255 || (t >= 0 && t < newCount)) {
                      // Copy to compacted position
                      if (validCount !== i) {
                        microStateRef.current.x[validCount] = microStateRef.current.x[i];
                        microStateRef.current.y[validCount] = microStateRef.current.y[i];
                        microStateRef.current.vx[validCount] = microStateRef.current.vx[i];
                        microStateRef.current.vy[validCount] = microStateRef.current.vy[i];
                        microStateRef.current.type[validCount] = microStateRef.current.type[i];
                        microStateRef.current.energy[validCount] = microStateRef.current.energy[i];
                      }
                      validCount++;
                    }
                    // Invalid types are simply not copied (removed)
                  }
                  microStateRef.current.count = validCount;
                  
                  // Fix selectedType if out of bounds
                  if (selectedType >= newCount) {
                    setSelectedType(0);
                  }
                  
                  toast.success(`Archetypes: ${oldCount} → ${newCount}`);
                  setForceUpdate((v) => v + 1);
                }
                
                // Handle circularDependency change
                if (config.circularDependency !== undefined) {
                  Object.assign(microConfigRef.current, config);
                  // Copy base matrix and apply circular dependency
                  copyMatrix(baseMatrixRef.current, matrixRef.current);
                  applyCircularDependency(matrixRef.current, config.circularDependency);
                  
                  if (config.circularDependency > 0) {
                    toast.success(`Circular Drive: ${Math.round(config.circularDependency * 100)}%`, {
                      description: 'Cyclical attraction layer applied'
                    });
                  } else {
                    toast.info('Circular Drive disabled', {
                      description: 'Reverted to base matrix'
                    });
                  }
                  
                  setForceUpdate((v) => v + 1);
                  return;
                }
                
                Object.assign(microConfigRef.current, config);
                setForceUpdate((v) => v + 1);
              }}
              onFieldChange={(config) => {
                Object.assign(fieldConfigRef.current, config);
                setForceUpdate((v) => v + 1);
              }}
              onReconfigChange={(config) => {
                Object.assign(reconfigConfigRef.current, config);
                setForceUpdate((v) => v + 1);
              }}
              onMatrixChange={(matrix) => {
                copyMatrix(matrix, matrixRef.current);
                copyMatrix(matrixRef.current, baseMatrixRef.current);
                if (microConfigRef.current.circularDependency > 0) {
                  applyCircularDependency(matrixRef.current, microConfigRef.current.circularDependency);
                }
                setForceUpdate((v) => v + 1);
              }}
              onMatrixRandomize={() => {
                randomizeMatrix(matrixRef.current, rngRef.current, microConfigRef.current.rmax);
                copyMatrix(matrixRef.current, baseMatrixRef.current);
                if (microConfigRef.current.circularDependency > 0) {
                  applyCircularDependency(matrixRef.current, microConfigRef.current.circularDependency);
                }
                setForceUpdate((v) => v + 1);
              }}
              onMatrixSoften={() => {
                softenMatrix(matrixRef.current);
                copyMatrix(matrixRef.current, baseMatrixRef.current);
                if (microConfigRef.current.circularDependency > 0) {
                  applyCircularDependency(matrixRef.current, microConfigRef.current.circularDependency);
                }
                setForceUpdate((v) => v + 1);
              }}
              onMatrixSymmetrize={() => {
                symmetrizeMatrix(matrixRef.current);
                copyMatrix(matrixRef.current, baseMatrixRef.current);
                if (microConfigRef.current.circularDependency > 0) {
                  applyCircularDependency(matrixRef.current, microConfigRef.current.circularDependency);
                }
                setForceUpdate((v) => v + 1);
              }}
              onMatrixInvert={() => {
                invertMatrix(matrixRef.current);
                copyMatrix(matrixRef.current, baseMatrixRef.current);
                if (microConfigRef.current.circularDependency > 0) {
                  applyCircularDependency(matrixRef.current, microConfigRef.current.circularDependency);
                }
                setForceUpdate((v) => v + 1);
              }}
              onMatrixNormalize={() => {
                normalizeMatrix(matrixRef.current);
                copyMatrix(matrixRef.current, baseMatrixRef.current);
                if (microConfigRef.current.circularDependency > 0) {
                  applyCircularDependency(matrixRef.current, microConfigRef.current.circularDependency);
                }
                setForceUpdate((v) => v + 1);
              }}
              onLoadPreset={loadPreset}
              onRandomizeAll={handleRandomizeAll}
              onApplyRecipe={applyRecipe}
              onNewUniverse={newUniverseWithDNA}
              onChaosSeed={applyChaosSeed}
              onLoadCreativePreset={loadCreativePresetById}
              renderMode={renderMode}
              streakLength={streakLength}
              onRenderModeChange={setRenderMode}
              onStreakLengthChange={setStreakLength}
              simQuality={simQuality}
              dotSize={dotSize}
              onSimQualityChange={handleQualityChange}
              onDotSizeChange={setDotSize}
              spawnPattern={spawnPattern}
              onSpawnPatternChange={handleSpawnPatternChange}
              onBackgroundClick={() => setShowBgPicker(true)}
              showBonds={showBonds}
              bondsDistance={bondsDistance}
              bondsOpacity={bondsOpacity}
              showTrails={showTrails}
              trailsLength={trailsLength}
              trailsOpacity={trailsOpacity}
              onShowBondsChange={setShowBonds}
              onBondsDistanceChange={setBondsDistance}
              onBondsOpacityChange={setBondsOpacity}
              onShowTrailsChange={setShowTrails}
              onTrailsLengthChange={setTrailsLength}
              onTrailsOpacityChange={setTrailsOpacity}
              organisms={codexStateRef.current.organisms}
              onSpawnOrganism={handleSpawnOrganism}
              onDeleteOrganism={handleDeleteOrganism}
              onRenameOrganism={handleRenameOrganism}
              captureMode={captureMode}
              onCaptureModeChange={setCaptureMode}
              // PATCH 04.3: Archetypes
              archetypes={archetypesRef.current}
              microState={microStateRef.current}
              showSigils={showSigils}
              onToggleSigils={() => setShowSigils((v) => !v)}
              fieldCellCount={microConfigRef.current.typesCount * microConfigRef.current.typesCount}
              artifactCount={reconfigStateRef.current.artifacts.length}
              speciesCount={microConfigRef.current.typesCount}
              currentSeed={currentSeed}
              onLoadSeed={handleSeedChange}
              stats={stats}
              life={life}
              onLifeChange={onLifeChange}
              lifeStats={lifeStatsUI}
              sigilConfig={sigilConfig}
              onSigilConfigChange={(cfg) => setSigilConfig((prev) => ({ ...prev, ...cfg }))}
              archetypesDetected={archetypesDetected}
              archetypeRegistry={archetypesRef.current}
              onClearSigils={() => {
                // Import clearSigils function and call it
                sigilStateRef.current.bond.fill(0);
                sigilStateRef.current.rift.fill(0);
                sigilStateRef.current.bloom.fill(0);
                sigilStateRef.current.oath.fill(0);
                toast.info('🧹 Sigils limpos', { duration: 2000 });
              }}
            />
          )}
        </>
      )}

      {/* Psyche Lab — isolated canvas & runtime */}
      <PsycheLab
        active={!showHome && activeLab === 'psycheLab'}
        viewMode={viewMode}
        view3DConfig={view3DConfig}
        onView3DConfigChange={patch => setView3DConfig(prev => ({ ...prev, ...patch }))}
      />

      {/* Music Lab — isolated instrument */}
      <MusicLab active={!showHome && activeLab === 'musicLab'} />

      {/* Alchemy Lab — hermetic simulation */}
      <AlchemyLab active={!showHome && activeLab === 'alchemyLab'} />

      {/* Meta-Arte Lab — experimental spiritual photoshop */}
      <MetaArtLab active={!showHome && activeLab === 'metaArtLab'} />

      {/* Rhizome Lab — heuristic-exact network simulation (v2) */}
      <RhizomeLab active={!showHome && activeLab === 'rhizomeLab'} />

      {/* Asimov Theater — predictive history by complex agents (password-gated) */}
      {!showHome && activeLab === 'asimovTheater' && !asimovUnlocked ? (
        <AsimovGate onUnlock={() => setAsimovUnlocked(true)} />
      ) : (
        <AsimovTheater active={!showHome && activeLab === 'asimovTheater' && asimovUnlocked} />
      )}

      {/* Language Lab — Heptapod language simulation */}
      <LanguageLab active={!showHome && activeLab === 'languageLab'} />

      {/* Tree of Life Lab — Kabbalah + Tarot Journey */}
      <TreeOfLifeLab active={!showHome && activeLab === 'treeOfLife'} />

      {/* Physics Sandbox — modular robot builder + CEM learning */}
      <PhysicsSandbox active={!showHome && activeLab === 'physicsSandbox'} />

      <Toaster position="bottom-right" theme="dark" />

      {/* Achievement System */}
      <AchievementToast 
        achievement={achievements.latestAchievement}
        onDismiss={achievements.dismissLatest}
      />
      
      {showAchievements && (
        <AchievementsPanel 
          achievements={achievements.achievements}
          onClose={() => setShowAchievements(false)}
          onClearAll={() => { achievements.clearAll(); }}
        />
      )}
      
      {/* World Log Panel */}
      {showWorldLog && (
        <WorldLogPanel 
          events={worldLog.events}
          visible={showWorldLog}
          onClose={() => setShowWorldLog(false)}
        />
      )}
      
      {/* Chronicle Panel (Narrative) */}
      <ChroniclePanel
        isOpen={showChronicle}
        onClose={() => setShowChronicle(false)}
        paragraphs={paragraphs}
        currentArc={arcRef.current.name}
        tone={storyTone}
        setTone={setStoryTone}
      />
      
      {/* Background Gradient Picker */}
      {showBgPicker && (
        <BackgroundPicker
          currentBg={background}
          onBgChange={(bg) => {
            setBackground(bg);
            setShowBgPicker(false);
          }}
          onClose={() => setShowBgPicker(false)}
        />
      )}

      {/* Guide Hint Arrow - Points to guide button after preset selection */}
      <GuideHintArrow
        targetSelector="[data-guide-button]"
        show={showGuideHint && guide.mode === 'hidden'}
      />

      {/* Guide System — suppressed on homepage */}
      {!showHome && guide.mode === 'welcome' && (
        <WelcomeModal
          onStart={() => {
            // Hide guide hint
            setShowGuideHint(false);
            
            // Load a random preset to have something to show
            const randomPreset = CREATIVE_PRESETS[Math.floor(Math.random() * CREATIVE_PRESETS.length)];
            loadCreativePreset(randomPreset, true);
            
            guide.startGuide();
          }}
          onSkip={() => {
            setShowGuideHint(false);
            markGuideCompleted();
            guide.skipGuide();
          }}
        />
      )}

      {guide.mode === 'active' && guide.guideState && (
        <GuideOverlay
          guideState={guide.guideState}
          onComplete={() => {
            markGuideCompleted();
            guide.hideGuide();
            toast.success('Guide completed!', {
              description: 'You earned all badges'
            });
          }}
          onSkip={() => {
            markGuideCompleted();
            guide.skipGuide();
          }}
        />
      )}
      {/* ── Homepage — shown at startup, pauses all labs ────────────────── */}
      {showHome && (
        <HomePage
          onEnterLab={(lab) => {
            setActiveLab(lab);
            setShowHome(false);
          }}
        />
      )}
    </div>
  );
};

export default App;
