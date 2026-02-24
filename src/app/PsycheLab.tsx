// ── Psyche Lab — Main Component ──────────────────────────────────────────────
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PsycheState, PsycheConfig, PsycheLens, PsychePhase, defaultPsycheConfig, ARCHETYPE_IDS, FreudMetrics, LacanMetrics, MAX_LINKS } from '../sim/psyche/psycheTypes';
import { createPsycheState, resizeQuantaTo } from '../sim/psyche/psycheState';
import { stepPsyche } from '../sim/psyche/psycheEngine';
import { updateMetrics, stepJourney, startJourney, stopJourney } from '../sim/psyche/psycheNarrator';
import { renderPsyche, clearPsycheTrails, PsycheCamera, DEFAULT_PSYCHE_CAMERA } from '../render/psycheRenderer';
import { PSYCHE_PRESETS, getPreset } from '../sim/psyche/psychePresets';
import { PsycheHUD, NarrativeEntry } from '../ui/PsycheHUD';
import { ConsciousnessModal } from '../ui/ConsciousnessModal';
import { ConsciousnessProfile } from '../sim/psyche/consciousnessGen';
import { registerPsycheState, unregisterPsycheState } from '../sim/psyche/psycheLabGlobal';
import {
  Renderer3D, View3DConfig, DEFAULT_VIEW3D,
  Particle3D, Link3D, getZPsyche, clamp3d, hslToRgb,
} from '../render/Renderer3D';
import { View3DControls } from '../ui/View3DControls';
import { CanvasRecorder, RecorderState } from './components/recording/canvasRecorder';
import { RecordingButton } from './components/recording/RecordingButton';

interface PsycheLabProps {
  active:               boolean;
  viewMode?:            '2D' | '3D';
  view3DConfig?:        View3DConfig;
  onView3DConfigChange?:(patch: Partial<View3DConfig>) => void;
}

const PHASE_COLORS: Record<PsychePhase, string> = {
  CALM:        '#93c5fd',
  ALERT:       '#fde047',
  PANIC:       '#f87171',
  FLOW:        '#86efac',
  FRAGMENTED:  '#fdba74',
  INTEGRATING: '#c4b5fd',
};

// Archetype colors in tag order 1..12
const ARCH_RGB: [number, number, number][] = [
  [0.96, 0.78, 0.26], // SELF       – gold
  [0.69, 0.77, 0.87], // PERSONA    – steel blue
  [0.49, 0.23, 0.93], // SHADOW     – purple
  [0.96, 0.25, 0.37], // ANIMA      – rose
  [0.52, 0.80, 0.09], // TRICKSTER  – lime
  [0.23, 0.51, 0.96], // HERO       – blue
  [0.96, 0.62, 0.07], // MOTHER     – amber
  [0.42, 0.44, 0.63], // FATHER     – slate
  [0.39, 0.40, 0.95], // WISE_ONE   – indigo
  [0.02, 0.71, 0.83], // CHILD      – cyan
  [0.93, 0.28, 0.60], // LOVER      – pink
  [0.94, 0.27, 0.27], // DESTROYER  – red
];

export const PsycheLab: React.FC<PsycheLabProps> = ({
  active,
  viewMode   = '2D',
  view3DConfig,
  onView3DConfigChange,
}) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const stateRef   = useRef<PsycheState>(createPsycheState(600));
  const configRef  = useRef<PsycheConfig>(defaultPsycheConfig());
  const rafRef     = useRef<number>(0);
  const lastFrameT = useRef<number>(0);
  const runningRef = useRef<boolean>(true);

  // ── 2D Camera (zoom + pan) ────────────────────────────────────────────────
  const camera2dRef  = useRef<PsycheCamera>({ ...DEFAULT_PSYCHE_CAMERA });
  const drag2dRef    = useRef({ active: false, lastX: 0, lastY: 0 });
  const keysRef      = useRef<Set<string>>(new Set());
  const [camZoom,    setCamZoom]  = useState(1.0);
  const [camPanned,  setCamPanned] = useState(false);

  // ── Recording ────────────────────────────────────────────────────────────
  const recorderRef   = useRef<CanvasRecorder | null>(null);
  const [recState,    setRecState]   = useState<RecorderState>('idle');
  const [recElapsed,  setRecElapsed] = useState(0);

  useEffect(() => {
    recorderRef.current = new CanvasRecorder(setRecState);
    return () => recorderRef.current?.dispose();
  }, []);

  // Update elapsed timer while recording
  useEffect(() => {
    if (recState !== 'recording') { setRecElapsed(0); return; }
    const id = setInterval(() => {
      setRecElapsed(recorderRef.current?.elapsed ?? 0);
    }, 500);
    return () => clearInterval(id);
  }, [recState]);

  const handleRecStart = useCallback((opts?: { format?: string; quality?: string }) => {
    const state   = stateRef.current;
    const presetN = getPresetName(presetId);
    recorderRef.current?.start(
      () => [
        viewMode === '3D' ? canvas3dRef.current : canvasRef.current,
      ],
      () => ({
        labName: 'Psyche Lab',
        lines: [
          `fase: ${state.phase}  ·  quanta: ${state.count}`,
          `integração: ${(state.integrationIndex * 100).toFixed(0)}%  tensão: ${(state.tensionIndex * 100).toFixed(0)}%  frag: ${(state.fragmentationIndex * 100).toFixed(0)}%`,
          `lens: ${configRef.current.lens}  ·  preset: ${presetN}`,
          `dança: ${configRef.current.danceIntensity.toFixed(2)}  ·  arq.: ${state.archetypeActive.filter(Boolean).length} ativos`,
        ],
      }),
      30, undefined,
      { format: (opts?.format ?? 'auto') as any, quality: (opts?.quality ?? 'standard') as any },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const handleRecStop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  // ── 3D: self-contained, isolated ─────────────────────────────────────────
  const canvas3dRef      = useRef<HTMLCanvasElement>(null);
  const renderer3dRef    = useRef<Renderer3D | null>(null);
  const orbit3dRef       = useRef({ active: false, lastX: 0, lastY: 0, shift: false });
  // Local copy of 3D config (synced from props)
  const view3dCfgRef     = useRef<View3DConfig>(view3DConfig ?? DEFAULT_VIEW3D);

  // Keep ref in sync with prop
  useEffect(() => {
    if (view3DConfig) view3dCfgRef.current = view3DConfig;
  }, [view3DConfig]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [lens,           setLens]           = useState<PsycheLens>('TOPOLOGY');
  const [presetId,       setPresetId]       = useState('mandala-calm');
  const [archetypesOn,   setArchetypesOn]   = useState(true);
  const [journeyOn,      setJourneyOn]      = useState(false);
  const [danceIntensity, setDanceIntensity] = useState(0.22);
  const [quantaCount,    setQuantaCount]    = useState(600);
  const [cinematicMode,  setCinematicMode]  = useState(false);
  const [running,        setRunning]        = useState(true);

  const [rastrosOn, setRastrosOn] = useState(false);
  const [campoOn,   setCampoOn]   = useState(false);   // ← OFF by default
  const [fieldOn,   setFieldOn]   = useState(false);
  const [bondsOn,   setBondsOn]   = useState(true);

  // Trail config
  const [trailFade,    setTrailFade]    = useState(0.06);
  const [trailOpacity, setTrailOpacity] = useState(0.65);
  const [trailWidth,   setTrailWidth]   = useState(3);

  // Bond visual config
  const [bondWidth,   setBondWidth]   = useState(1.0);
  const [bondOpacity, setBondOpacity] = useState(0.8);

  const [flowGain,      setFlowGain]      = useState(configRef.current.flowGain);
  const [springK,       setSpringK]       = useState(configRef.current.springK);
  const [linkRadius,    setLinkRadius]    = useState(configRef.current.linkRadius);
  const [breathPeriod,  setBreathPeriod]  = useState(configRef.current.breathPeriod);

  // ── Physics / identity panel ─────────────────────────────────────────────
  const [damping,        setDamping]        = useState(configRef.current.damping);
  const [stateRelaxRate, setStateRelaxRate] = useState(configRef.current.stateRelaxRate ?? 1.0);
  const [frozenFlow,     setFrozenFlow]     = useState(configRef.current.frozenFlow ?? false);
  const [soulVis,        setSoulVis]        = useState(configRef.current.soulVis ?? 0);

  const [phase,    setPhase]    = useState<PsychePhase>(stateRef.current.phase);
  const [intIdx,   setIntIdx]   = useState(0.0);
  const [tenIdx,   setTenIdx]   = useState(0.0);
  const [fragIdx,  setFragIdx]  = useState(0.0);

  // ── Psychoanalytic metrics (computed from per-particle data) ─────────────
  const [freudMetrics, setFreudMetrics] = useState<FreudMetrics>({
    eros: 0, thanatos: 0, repressao: 0, idPower: 0.2,
    superegoForce: 0.15, egoStrength: 0.5, sublimacao: 0,
  });
  const [lacanMetrics, setLacanMetrics] = useState<LacanMetrics>({
    real: 0.25, simbolico: 0.35, imaginario: 0.4,
    gozo: 0, falta: 0.5, sujeito: 0,
  });

  const [archStrengths, setArchStrengths] = useState<number[]>([...stateRef.current.archetypeStrength]);
  const [archActive,    setArchActive]    = useState<boolean[]>([...stateRef.current.archetypeActive]);

  const [journeyAct,     setJourneyAct]     = useState(0);
  const [journeyChapter, setJourneyChapter] = useState('');

  const [narrativeLog,   setNarrativeLog]   = useState<NarrativeEntry[]>([]);
  const prevPhaseRef = useRef<PsychePhase>('CALM');

  const [modalOpen, setModalOpen] = useState(false);

  const lastMetricUpdate = useRef(0);

  // ── Register psyche state so App.tsx (and tests) can read it ─────────────
  useEffect(() => {
    registerPsycheState(stateRef.current);
    return () => { unregisterPsycheState(); };
  }, []);

  // ── Init Renderer3D ───────────────────────────────────────────────────────
  useEffect(() => {
    const c = canvas3dRef.current;
    if (!c) return;
    renderer3dRef.current = new Renderer3D(c);
    const W = window.innerWidth, H = window.innerHeight;
    renderer3dRef.current.resize(W, H);
    return () => { renderer3dRef.current?.dispose(); renderer3dRef.current = null; };
  }, []);

  // ── Resize 3D canvas ─────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      renderer3dRef.current?.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Orbit mouse handlers (canvas3d) ──────────────────────────────────────
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
      const cur = view3dCfgRef.current;
      let next: View3DConfig;
      if (orbit3dRef.current.shift || e.shiftKey) {
        next = { ...cur, camera: { ...cur.camera, panX: cur.camera.panX + dx*0.002, panY: cur.camera.panY + dy*0.002 } };
      } else {
        next = { ...cur, camera: { ...cur.camera,
          yaw:   cur.camera.yaw   + dx * 0.008,
          pitch: clamp3d(cur.camera.pitch + dy * 0.008, 0.04, Math.PI/2 - 0.04),
        }};
      }
      view3dCfgRef.current = next;
      onView3DConfigChange?.(next);
    };
    const onUp    = () => { orbit3dRef.current.active = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cur = view3dCfgRef.current;
      const next = { ...cur, camera: { ...cur.camera, dist: clamp3d(cur.camera.dist * (1 + e.deltaY*0.001), 0.5, 8.0) } };
      view3dCfgRef.current = next;
      onView3DConfigChange?.(next);
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
  }, [onView3DConfigChange]);

  // ── 2D Canvas — wheel zoom (towards cursor) ───────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      if (viewMode === '3D') return;
      e.preventDefault();
      const rect    = canvas.getBoundingClientRect();
      const mx      = e.clientX - rect.left - rect.width  / 2;
      const my      = e.clientY - rect.top  - rect.height / 2;
      const cur     = camera2dRef.current;
      const factor  = e.deltaY > 0 ? 1 / 1.12 : 1.12;
      const newZoom = Math.max(0.12, Math.min(14, cur.zoom * factor));
      const ratio   = newZoom / cur.zoom;
      const newPanX = mx + (cur.panX - mx) * ratio;
      const newPanY = my + (cur.panY - my) * ratio;
      camera2dRef.current = { zoom: newZoom, panX: newPanX, panY: newPanY };
      setCamZoom(newZoom);
      setCamPanned(Math.abs(newPanX) > 2 || Math.abs(newPanY) > 2);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [viewMode]);

  // ── 2D Canvas — drag pan (left-click drag) ────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onDown = (e: MouseEvent) => {
      if (viewMode === '3D') return;
      drag2dRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
      canvas.style.cursor = 'grabbing';
    };
    const onMove = (e: MouseEvent) => {
      if (!drag2dRef.current.active) return;
      const dx = e.clientX - drag2dRef.current.lastX;
      const dy = e.clientY - drag2dRef.current.lastY;
      drag2dRef.current.lastX = e.clientX;
      drag2dRef.current.lastY = e.clientY;
      camera2dRef.current = {
        ...camera2dRef.current,
        panX: camera2dRef.current.panX + dx,
        panY: camera2dRef.current.panY + dy,
      };
      setCamPanned(true);
    };
    const onUp = () => {
      drag2dRef.current.active = false;
      canvas.style.cursor = 'grab';
      const { panX, panY } = camera2dRef.current;
      setCamPanned(Math.abs(panX) > 2 || Math.abs(panY) > 2);
    };
    canvas.addEventListener('mousedown',  onDown);
    window.addEventListener('mousemove',  onMove);
    window.addEventListener('mouseup',    onUp);
    canvas.addEventListener('mouseleave', onUp);
    return () => {
      canvas.removeEventListener('mousedown',  onDown);
      window.removeEventListener('mousemove',  onMove);
      window.removeEventListener('mouseup',    onUp);
      canvas.removeEventListener('mouseleave', onUp);
    };
  }, [viewMode]);

  // ── WASD keyboard pan + R = reset view ───────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (viewMode === '3D') return;
      const k = e.key.toLowerCase();
      if (['w','a','s','d'].includes(k)) { keysRef.current.add(k); e.preventDefault(); }
      if (k === 'r') {
        camera2dRef.current = { ...DEFAULT_PSYCHE_CAMERA };
        setCamZoom(1.0);
        setCamPanned(false);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.key.toLowerCase()); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, [viewMode]);

  // ── Reset 2D camera ───────────────────────────────────────────────────────
  const resetCamera2D = useCallback(() => {
    camera2dRef.current = { ...DEFAULT_PSYCHE_CAMERA };
    setCamZoom(1.0);
    setCamPanned(false);
  }, []);

  // ── Narrative log helper ──────────────────────────────────────────────────
  const addLog = useCallback((text: string, color: string) => {
    setNarrativeLog(prev => {
      const entry: NarrativeEntry = { text, color, time: stateRef.current.elapsed };
      return [...prev.slice(-19), entry];
    });
  }, []);

  // ── 3D render helper ─────────────────────────────────────────────────────
  const render3DPsyche = useCallback(() => {
    const r3d = renderer3dRef.current;
    if (!r3d?.isReady) return;
    const state = stateRef.current;
    const cfg   = view3dCfgRef.current;
    const pts: Particle3D[] = [];
    const scheme = cfg.colorScheme3D ?? 'default';

    for (let i = 0; i < state.count; i++) {
      const z = getZPsyche(
        state.coherence[i], state.arousal[i], state.charge[i],
        state.inhibition[i], state.valence[i], cfg.zVar,
      );
      const tag = state.tag[i];
      let r = 0.5, g = 0.4, b = 0.8;
      if (scheme === 'default') {
        if (tag > 0 && tag <= 12) { [r, g, b] = ARCH_RGB[tag - 1]; }
        else { const c = state.coherence[i]; r = c*0.9; g = c*0.6+0.1; b = 0.4+c*0.4; }
      } else if (scheme === 'energy') {
        const h = (200 - state.charge[i] * 160) / 360;
        const s = 0.5 + state.arousal[i] * 0.5;
        const l = 0.35 + state.charge[i] * 0.30;
        [r, g, b] = hslToRgb(h, s, l);
      } else if (scheme === 'valence') {
        if (state.valence[i] >= 0) { r = 0.1; g = 0.3 + state.valence[i]*0.5; b = 0.15; }
        else { r = 0.3 + (-state.valence[i])*0.5; g = 0.1; b = 0.1; }
      } else if (scheme === 'coherence') {
        r = 0.1 + state.coherence[i]*0.2;
        g = 0.1 + state.coherence[i]*0.3;
        b = 0.25 + state.coherence[i]*0.5;
      } else if (scheme === 'topology') {
        // Color by Jungian region
        const wx = state.x[i], wy = state.y[i];
        const dist = Math.sqrt(wx*wx + wy*wy);
        if (dist < 0.14) { r=0.96; g=0.78; b=0.26; }  // SELF — gold
        else if (wy < -0.30) { r=0.61; g=0.72; b=0.97; } // SUPEREGO — blue
        else if (wy > 0.45) { r=0.94; g=0.27; b=0.27; }  // ID — red
        else { r=0.49; g=0.23; b=0.93; b = 0.6; }          // shadow/collective
      }
      pts.push({ nx: state.x[i], ny: state.y[i], z, r, g, b });
    }

    // Collect bonds for 3D rendering
    const links: Link3D[] = [];
    if (cfg.showBonds) {
      for (let li = 0; li < state.linkCount; li++) {
        links.push({ a: state.linkA[li], b: state.linkB[li] });
      }
    }

    r3d.render(pts, cfg, undefined, cfg.showBonds ? links : []);
  }, []);

  // ── RAF loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) { cancelAnimationFrame(rafRef.current); return; }

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (!canvasRef.current) return;

      const dt = Math.min(0.05, (now - lastFrameT.current) / 1000);
      lastFrameT.current = now;

      const state  = stateRef.current;
      const config = configRef.current;

      if (runningRef.current) {
        stepPsyche(state, config, dt);

        if (state.journeyActive) {
          stepJourney(state, dt,
            act => { setJourneyAct(act.act); setJourneyChapter(`Ato ${act.act+1}: ${act.name}`); },
            text => setJourneyChapter(text),
          );
        }

        if (now - lastMetricUpdate.current > 450) {
          updateMetrics(state);
          lastMetricUpdate.current = now;
          setPhase(state.phase);
          setIntIdx(state.integrationIndex);
          setTenIdx(state.tensionIndex);
          setFragIdx(state.fragmentationIndex);

          // ── Freudian per-particle aggregation ───────────────────────────
          let erosSum = 0, thanatosSum = 0, repressaoSum = 0;
          let idCnt = 0, superegoC = 0, egoC = 0, egoCoh = 0;
          for (let i = 0; i < state.count; i++) {
            const wy  = state.y[i];
            const ch  = state.charge[i];
            const inh = state.inhibition[i];
            const val = state.valence[i];
            const vp  = Math.max(0, val);
            erosSum     += vp * ch * (1 - inh);
            thanatosSum += inh * (1 - vp) * ch;
            repressaoSum += inh;
            if (wy > 0.28) idCnt++;
            else if (wy < -0.30) superegoC++;
            else { egoC++; egoCoh += state.coherence[i]; }
          }
          const n = state.count || 1;
          const eInt = state.integrationIndex;
          const erosVal = Math.min(1, erosSum / n * 2.5);
          setFreudMetrics({
            eros:          erosVal,
            thanatos:      Math.min(1, thanatosSum / n * 3.0),
            repressao:     Math.min(1, repressaoSum / n),
            idPower:       idCnt / n,
            superegoForce: superegoC / n,
            egoStrength:   egoC > 0 ? egoCoh / egoC : 0,
            sublimacao:    Math.min(1, erosVal * eInt * 1.4),
          });

          // ── Lacanian per-particle aggregation ───────────────────────────
          let realN = 0, simbN = 0, imagN = 0, gozoSum = 0;
          for (let i = 0; i < state.count; i++) {
            const wx = state.x[i], wy = state.y[i];
            const r2 = Math.sqrt(wx*wx + wy*wy);
            const reg = wy > 0.40 || r2 > 0.75 ? 'R'
                      : wy < -0.35 || (Math.abs(wx) > 0.30 && wy < -0.10) ? 'S' : 'I';
            if (reg === 'R') { realN++; gozoSum += state.charge[i] * state.arousal[i]; }
            else if (reg === 'S') simbN++;
            else imagN++;
          }
          const linkDensity = Math.min(1, state.linkCount / Math.max(1, MAX_LINKS * 0.3));
          setLacanMetrics({
            real:       realN / n,
            simbolico:  Math.min(1, (simbN / n) * 0.7 + linkDensity * 0.3),
            imaginario: imagN / n,
            gozo:       realN > 0 ? Math.min(1, gozoSum / realN) : 0,
            falta:      1 - state.integrationIndex,
            sujeito:    state.fragmentationIndex,
          });

          if (state.phase !== prevPhaseRef.current) {
            addLog(`Fase → ${state.phase}`, PHASE_COLORS[state.phase]);
            prevPhaseRef.current = state.phase;
          }
        }
      }

      // ── WASD pan (processed every frame for smooth motion) ──────────────
      if (viewMode !== '3D' && keysRef.current.size > 0) {
        const speed = 4.5 / camera2dRef.current.zoom; // faster when zoomed out
        const cam   = camera2dRef.current;
        let { panX, panY } = cam;
        if (keysRef.current.has('a')) panX += speed;
        if (keysRef.current.has('d')) panX -= speed;
        if (keysRef.current.has('w')) panY += speed;
        if (keysRef.current.has('s')) panY -= speed;
        camera2dRef.current = { ...cam, panX, panY };
      }

      // 2D render (always, even in 3D mode — gives reference)
      if (viewMode !== '3D') {
        renderPsyche(
          canvasRef.current, state, config.lens, cinematicMode,
          getPresetName(presetId),
          { rastrosOn, campoOn, fieldOn, bondsOn, trailFade, trailOpacity, trailWidth, soulVis, bondWidth, bondOpacity },
          camera2dRef.current,
        );
      }

      // 3D render (only when 3D mode active)
      if (viewMode === '3D') {
        render3DPsyche();
      }
    };

    lastFrameT.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, cinematicMode, presetId, rastrosOn, campoOn, fieldOn, bondsOn, trailFade, trailOpacity, trailWidth, viewMode, render3DPsyche]);

  // ── Sync lens ─────────────────────────────────────────────────────────────
  useEffect(() => { configRef.current.lens = lens; }, [lens]);

  // ── Apply preset ──────────────────────────────────────────────────────────
  const applyPreset = useCallback((id: string) => {
    const preset = getPreset(id);
    if (!preset) return;
    const state  = stateRef.current;
    const config = configRef.current;

    Object.assign(config, defaultPsycheConfig(), preset.config);
    config.lens        = lens;
    config.archetypesOn = archetypesOn;

    const n = preset.quantaCount ?? 600;
    resizeQuantaTo(state, n, config);
    setQuantaCount(n);

    if (preset.archetypeActive) {
      for (let i = 0; i < 12; i++) {
        state.archetypeActive[i] = preset.archetypeActive.includes(ARCHETYPE_IDS[i]);
      }
    }
    if (preset.archetypeStrengths) {
      for (let i = 0; i < 12; i++) {
        const val = preset.archetypeStrengths[ARCHETYPE_IDS[i]];
        if (val !== undefined) state.archetypeStrength[i] = val;
      }
    }

    setArchStrengths([...state.archetypeStrength]);
    setArchActive([...state.archetypeActive]);
    setDanceIntensity(config.danceIntensity);
    setFlowGain(config.flowGain);
    setSpringK(config.springK);
    setLinkRadius(config.linkRadius);
    setBreathPeriod(config.breathPeriod);
    // Sync physics/identity params from preset
    setDamping(config.damping);
    setStateRelaxRate(config.stateRelaxRate ?? 1.0);
    setFrozenFlow(config.frozenFlow ?? false);
    setSoulVis(config.soulVis ?? 0);

    if (!preset.journeyMode) { stopJourney(state); setJourneyOn(false); }

    setPresetId(id);
    addLog(`Preset: ${preset.name}`, '#c4b5fd');
  }, [lens, archetypesOn, addLog]);

  useEffect(() => { applyPreset('mandala-calm'); }, []); // eslint-disable-line

  // ── Apply consciousness profile ───────────────────────────────────────────
  const applyConsciousness = useCallback((profile: ConsciousnessProfile) => {
    const state  = stateRef.current;
    const config = configRef.current;

    for (let i = 0; i < 12; i++) {
      const id = ARCHETYPE_IDS[i];
      state.archetypeActive[i]   = id in profile.archetypeWeights;
      state.archetypeStrength[i] = profile.archetypeWeights[id] ?? 0.15;
    }

    const defaults = defaultPsycheConfig();
    Object.assign(config, defaults, profile.configMods);
    config.lens        = lens;
    config.archetypesOn = archetypesOn;

    setArchStrengths([...state.archetypeStrength]);
    setArchActive([...state.archetypeActive]);
    if (profile.configMods.danceIntensity != null) setDanceIntensity(profile.configMods.danceIntensity);
    setFlowGain(config.flowGain);
    setSpringK(config.springK);
    setLinkRadius(config.linkRadius);
    setBreathPeriod(config.breathPeriod);

    clearPsycheTrails();
    setNarrativeLog([]);

    addLog(`⊕ "${profile.name}" — ${profile.description.slice(0, 60)}…`, profile.color);
    setPresetId('');
  }, [lens, archetypesOn, addLog]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggleRun = () => { runningRef.current = !runningRef.current; setRunning(runningRef.current); };

  const handleReset = () => {
    Object.assign(stateRef.current, createPsycheState(quantaCount));
    clearPsycheTrails();
    setNarrativeLog([]);
    prevPhaseRef.current = 'CALM';
    applyPreset(presetId || 'mandala-calm');
  };

  const handleArchetypesToggle = () => {
    const val = !archetypesOn;
    setArchetypesOn(val);
    configRef.current.archetypesOn = val;
  };

  const handleJourneyToggle = () => {
    const state = stateRef.current;
    if (!journeyOn) {
      startJourney(state); setJourneyOn(true);
      setJourneyAct(0); setJourneyChapter('Ato 1: Descent — a jornada começa.');
      addLog('✦ Red Book Journey iniciado.', '#c4b5fd');
    } else {
      stopJourney(state); setJourneyOn(false); setJourneyChapter('');
    }
  };

  const handleQuantaChange  = (n: number) => { resizeQuantaTo(stateRef.current, n, configRef.current); setQuantaCount(n); };
  const handleDanceChange   = (v: number) => { configRef.current.danceIntensity = v; configRef.current.maxSpeed = 0.18 * (v / 0.20); setDanceIntensity(v); };
  const handleLensChange    = (l: PsycheLens) => { configRef.current.lens = l; setLens(l); };

  const handleArchStrengthChange = (idx: number, v: number) => {
    stateRef.current.archetypeStrength[idx] = v;
    setArchStrengths(prev => { const n = [...prev]; n[idx] = v; return n; });
  };
  const handleArchActiveToggle = (idx: number) => {
    stateRef.current.archetypeActive[idx] = !stateRef.current.archetypeActive[idx];
    setArchActive(prev => { const n = [...prev]; n[idx] = stateRef.current.archetypeActive[idx]; return n; });
  };

  const handleFlowGainChange     = (v: number) => { configRef.current.flowGain      = v; setFlowGain(v);      };
  const handleSpringKChange      = (v: number) => { configRef.current.springK       = v; setSpringK(v);       };
  const handleLinkRadiusChange   = (v: number) => { configRef.current.linkRadius    = v; setLinkRadius(v);    };
  const handleBreathPeriodChange = (v: number) => { configRef.current.breathPeriod  = v; setBreathPeriod(v);  };

  // ── Physics / identity handlers ──────────────────────────────────────────
  const handleDampingChange       = (v: number) => { configRef.current.damping        = v; setDamping(v);        };
  const handleStateRelaxChange    = (v: number) => { configRef.current.stateRelaxRate = v; setStateRelaxRate(v); };
  const handleFrozenFlowToggle    = ()          => {
    const next = !configRef.current.frozenFlow;
    configRef.current.frozenFlow = next;
    setFrozenFlow(next);
  };
  const handleSoulVisChange       = (v: number) => { configRef.current.soulVis        = v; setSoulVis(v);        };

  return (
    <div style={{ display: active ? 'block' : 'none' }} className="fixed inset-0 z-0">
      {/* ── 2D Canvas (always exists, shown when not in 3D mode) ─────────── */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          background: '#07050e',
          display: viewMode === '3D' ? 'none' : 'block',
          cursor: drag2dRef.current.active ? 'grabbing' : 'grab',
        }}
      />

      {/* ── 3D Canvas (WebGL, Renderer3D instance) ───────────────────────── */}
      <canvas
        ref={canvas3dRef}
        className="absolute inset-0 w-full h-full"
        style={{
          display: viewMode === '3D' ? 'block' : 'none',
          pointerEvents: viewMode === '3D' ? 'auto' : 'none',
          cursor: 'grab',
          background: '#070514',
        }}
      />

      {/* ── 3D Controls bar ──────────────────────────────────────────────── */}
      {viewMode === '3D' && (
        <View3DControls
          activeLab="psycheLab"
          config={view3DConfig ?? view3dCfgRef.current}
          onChange={patch => {
            const next = { ...view3dCfgRef.current, ...patch };
            view3dCfgRef.current = next;
            onView3DConfigChange?.(next);
          }}
          onReset={() => {
            view3dCfgRef.current = { ...DEFAULT_VIEW3D };
            onView3DConfigChange?.({ ...DEFAULT_VIEW3D });
          }}
        />
      )}

      {/* ── 2D Viewport controls (zoom/pan HUD) ─────────────────────────── */}
      {viewMode !== '3D' && (
        <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-1.5 pointer-events-none select-none">
          {/* Zoom + pan info pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md
            bg-black/60 border border-purple-400/15 backdrop-blur-sm pointer-events-none">
            <span className="text-[8px] font-mono text-white/25 uppercase tracking-widest">zoom</span>
            <span className="text-[9px] font-mono text-purple-300/60">{camZoom.toFixed(2)}×</span>
            {camPanned && (
              <span className="text-[8px] font-mono text-white/25">pan</span>
            )}
          </div>
          {/* Reset button — only show when not at default */}
          {(Math.abs(camZoom - 1) > 0.02 || camPanned) && (
            <button
              onClick={resetCamera2D}
              className="pointer-events-auto px-2.5 py-1 rounded-md text-[8px] font-mono
                uppercase tracking-widest transition-all
                bg-purple-900/40 border border-purple-400/20 text-purple-300/70
                hover:bg-purple-800/50 hover:text-purple-200/90 hover:border-purple-400/40"
            >
              [R] reset view
            </button>
          )}
          {/* Controls hint */}
          <div className="px-2 py-0.5 rounded
            bg-black/40 border border-white/5 pointer-events-none">
            <span className="text-[7px] font-mono text-white/18">
              scroll=zoom · drag=pan · wasd=navegar
            </span>
          </div>
        </div>
      )}

      {/* ── HUD (2D only) ────────────────────────────────────────────────── */}
      {!cinematicMode && viewMode !== '3D' && (
        <PsycheHUD
          presetId={presetId}
          lens={lens}
          archetypesOn={archetypesOn}
          journeyOn={journeyOn}
          journeyAct={journeyAct}
          journeyChapter={journeyChapter}
          quantaCount={quantaCount}
          danceIntensity={danceIntensity}
          phase={phase}
          integrationIndex={intIdx}
          tensionIndex={tenIdx}
          fragmentIndex={fragIdx}
          archetypeStrengths={archStrengths}
          archetypeActive={archActive}
          flowGain={flowGain}
          springK={springK}
          linkRadius={linkRadius}
          breathPeriod={breathPeriod}
          trailOn={rastrosOn}
          campoOn={campoOn}
          fieldOn={fieldOn}
          narrativeLog={narrativeLog}
          onPresetChange={applyPreset}
          onLensChange={handleLensChange}
          onArchetypesToggle={handleArchetypesToggle}
          onJourneyToggle={handleJourneyToggle}
          onQuantaChange={handleQuantaChange}
          onDanceChange={handleDanceChange}
          onFlowGainChange={handleFlowGainChange}
          onSpringKChange={handleSpringKChange}
          onLinkRadiusChange={handleLinkRadiusChange}
          onBreathPeriodChange={handleBreathPeriodChange}
          onArchStrengthChange={handleArchStrengthChange}
          onArchActiveToggle={handleArchActiveToggle}
          onCinematicToggle={() => setCinematicMode(v => !v)}
          cinematicMode={cinematicMode}
          onTrailToggle={() => setRastrosOn(v => !v)}
          onCampoToggle={() => setCampoOn(v => !v)}
          onFieldToggle={() => setFieldOn(v => !v)}
          bondsOn={bondsOn}
          onBondsToggle={() => setBondsOn(v => !v)}
          trailFade={trailFade}
          trailOpacity={trailOpacity}
          trailWidth={trailWidth}
          onTrailFadeChange={setTrailFade}
          onTrailOpacityChange={setTrailOpacity}
          onTrailWidthChange={setTrailWidth}
          // Bond visual config
          bondWidth={bondWidth}
          bondOpacity={bondOpacity}
          onBondWidthChange={setBondWidth}
          onBondOpacityChange={setBondOpacity}
          running={running}
          onToggleRun={handleToggleRun}
          onReset={handleReset}
          onOpenConsciousness={() => setModalOpen(true)}
          freudMetrics={freudMetrics}
          lacanMetrics={lacanMetrics}
          // Physics / identity
          damping={damping}
          stateRelaxRate={stateRelaxRate}
          frozenFlow={frozenFlow}
          soulVis={soulVis}
          onDampingChange={handleDampingChange}
          onStateRelaxChange={handleStateRelaxChange}
          onFrozenFlowToggle={handleFrozenFlowToggle}
          onSoulVisChange={handleSoulVisChange}
        />
      )}

      {/* 3D overlay: minimal info strip ─────────────────────────────────── */}
      {viewMode === '3D' && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none
          flex items-center gap-3 px-4 py-1.5 rounded-lg border border-purple-400/15
          bg-black/50 backdrop-blur-sm">
          <span className="text-[8px] uppercase tracking-widest text-white/30 font-mono">Psyche 3D</span>
          <span className="text-[8px] font-mono" style={{ color: PHASE_COLORS[phase] + 'cc' }}>
            {phase} · {stateRef.current.count} quanta
          </span>
          <span className="text-[8px] text-white/20 font-mono">
            Z: {view3DConfig?.zVar ?? 'coherence'}
          </span>
          <span className="text-[8px] text-white/18 font-mono italic">
            drag=órbita · shift+drag=pan · roda=zoom
          </span>
        </div>
      )}

      {cinematicMode && viewMode !== '3D' && (
        <button onClick={() => setCinematicMode(false)}
          className="fixed top-14 right-3 z-30 text-[9px] text-white/20 hover:text-white/50 transition-colors font-mono">
          [H] show HUD
        </button>
      )}

      {modalOpen && (
        <ConsciousnessModal
          onClose={() => setModalOpen(false)}
          onInvoke={applyConsciousness}
        />
      )}

      {/* Recording button */}
      <RecordingButton
        state={recState}
        elapsed={recElapsed}
        onStart={handleRecStart}
        onStop={handleRecStop}
        className="fixed bottom-4 left-4 z-40"
      />
    </div>
  );
};

function getPresetName(id: string): string {
  return PSYCHE_PRESETS.find(p => p.id === id)?.name ?? 'Psyche Lab';
}

export default PsycheLab;