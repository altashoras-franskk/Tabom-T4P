// ── Asimov Theater — Main Lab Component (PATCH 2: Live Oracle + Jiang Lens) ──
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, AlertTriangle, BookOpen,
} from 'lucide-react';
import {
  AsimovSimState, HistoricalFrame, MetricsVector,
  PHASE_COLORS, PHASE_LABELS_PT, PhaseLabel, GRID_SIZE, makeRNG,
  emptyMetrics, EventPing,
} from '../../sim/asimov/asimovTypes';
import { createWorld, cloneWorldState } from '../../sim/asimov/asimovWorld';
import { stepWorld, macroTick, computeGini } from '../../sim/asimov/asimovEngine';
import { computeMetrics, detectPhase } from '../../sim/asimov/asimovMetrics';
import { generateNarrative } from '../../sim/asimov/asimovNarrator';
import {
  INTERVENTION_CARDS, applyIntervention, applyInvertedIntervention,
} from '../../sim/asimov/asimovInterventions';
import { ASIMOV_PRESETS, AsimovPreset } from '../../sim/asimov/asimovPresets';
import {
  createMuleState, checkMuleSpawn, spawnMule, updateMule, getMuleConfidencePenalty,
} from '../../sim/asimov/asimovAnomaly';
import {
  createAutoForecastJob, createDeepForecastJob, createCompareJob,
  tickForecastJob, tickForecastJobBudgeted, aggregateForecast,
} from '../../sim/asimov/asimovForecast';
import { LessonPreset } from '../../sim/asimov/asimovLessons';
import { Timeline } from '../asimov/Timeline';
import { OracleDashboard } from '../asimov/OracleDashboard';
import { InterventionCards } from '../asimov/InterventionCards';
import { LessonPresetsPanel } from '../asimov/LessonPresets';

interface Props { active: boolean; }

// ── Faction colors ─────────────────────────────────────────────────────────
const FAC_RGBA = [
  [74, 158, 255],   // blue
  [255, 90, 90],    // red
  [90, 255, 138],   // green
  [255, 206, 90],   // gold
] as const;

// ── Canvas rendering (PATCH 2: enhanced stage) ────────────────────────────
function renderStage(
  canvas: HTMLCanvasElement,
  sim: AsimovSimState,
  fieldLayer: 'R' | 'L' | 'N' | 'off',
  showMule: boolean,
  showTension: boolean,
  showRHotspots: boolean,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  const world = sim.world;

  // ── R hotspots (subtle resource concentration) ──────────────────────
  if (showRHotspots) {
    const imgData = ctx.createImageData(GRID_SIZE, GRID_SIZE);
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const v = world.field.R[i];
      if (v > 0.5) {
        const intensity = (v - 0.5) * 2;
        imgData.data[i * 4 + 0] = 90;
        imgData.data[i * 4 + 1] = 255;
        imgData.data[i * 4 + 2] = 138;
        imgData.data[i * 4 + 3] = Math.round(intensity * 30);
      }
    }
    const offscreen = document.createElement('canvas');
    offscreen.width = GRID_SIZE;
    offscreen.height = GRID_SIZE;
    const offCtx = offscreen.getContext('2d')!;
    offCtx.putImageData(imgData, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offscreen, 0, 0, W, H);
    ctx.restore();
  }

  // ── Tension/Enforcement overlay (N/L combined, very subtle) ─────────
  if (showTension) {
    const imgData = ctx.createImageData(GRID_SIZE, GRID_SIZE);
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const n = world.field.N[i];
      const l = world.field.L[i];
      // High N + low L = tension zone (red tint)
      const tension = Math.max(0, n * 0.7 - l * 0.4);
      if (tension > 0.15) {
        const intensity = (tension - 0.15) * 3;
        imgData.data[i * 4 + 0] = 255;
        imgData.data[i * 4 + 1] = 60;
        imgData.data[i * 4 + 2] = 60;
        imgData.data[i * 4 + 3] = Math.round(Math.min(1, intensity) * 22);
      }
    }
    const offscreen = document.createElement('canvas');
    offscreen.width = GRID_SIZE;
    offscreen.height = GRID_SIZE;
    const offCtx = offscreen.getContext('2d')!;
    offCtx.putImageData(imgData, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offscreen, 0, 0, W, H);
    ctx.restore();
  }

  // ── Field overlay (explicit toggle) ──────────────────────────────────
  if (fieldLayer !== 'off') {
    const arr = fieldLayer === 'R' ? world.field.R
              : fieldLayer === 'L' ? world.field.L
              : world.field.N;
    const colors: Record<'R' | 'L' | 'N', [number, number, number]> = {
      R: [90, 255, 138],
      L: [74, 158, 255],
      N: [255, 90, 90],
    };
    const [cr, cg, cb] = colors[fieldLayer];
    const imgData = ctx.createImageData(GRID_SIZE, GRID_SIZE);
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const v = arr[i];
      imgData.data[i * 4 + 0] = cr;
      imgData.data[i * 4 + 1] = cg;
      imgData.data[i * 4 + 2] = cb;
      imgData.data[i * 4 + 3] = Math.round(v * 55);
    }
    const offscreen = document.createElement('canvas');
    offscreen.width = GRID_SIZE;
    offscreen.height = GRID_SIZE;
    const offCtx = offscreen.getContext('2d')!;
    offCtx.putImageData(imgData, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, 0, 0, W, H);
    ctx.restore();
  }

  // ── Faction centroid halos ────────────────────────────────────────────
  for (let f = 0; f < world.factionCount; f++) {
    const c = world.centroids[f];
    if (c.count === 0) continue;
    const cx = c.x * W;
    const cy = c.y * H;
    const [r, g, b] = FAC_RGBA[f % FAC_RGBA.length];
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 55);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.12)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 55, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Agents ────────────────────────────────────────────────────────────
  for (const a of world.agents) {
    const px = a.x * W;
    const py = a.y * H;
    const [r, g, b] = FAC_RGBA[a.factionId % FAC_RGBA.length];
    const alpha = 0.55 + a.wealth * 0.45;
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(px, py, 2.2 + a.status * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Mule ──────────────────────────────────────────────────────────────
  if (showMule && sim.mule.active) {
    const mx = sim.mule.x * W;
    const my = sim.mule.y * H;
    const pulseFactor = 1 + Math.sin(sim.world.t * 3) * 0.2;

    ctx.strokeStyle = 'rgba(192,90,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mx, my, sim.mule.radius * W * pulseFactor, 0, Math.PI * 2);
    ctx.stroke();

    const mGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 7 * pulseFactor);
    mGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
    mGrad.addColorStop(0.4, 'rgba(192,90,255,0.8)');
    mGrad.addColorStop(1, 'rgba(192,90,255,0)');
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.arc(mx, my, 7 * pulseFactor, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Conflict flash ─────────────────────────────────────────────────────
  if (sim.world.conflictDecay > 2) {
    const intensity = Math.min(0.08, sim.world.conflictDecay * 0.003);
    ctx.fillStyle = `rgba(255,90,90,${intensity})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Event pings ─────────────────────────────────────────────────────
  const now = sim.world.t;
  for (const ping of sim.eventPings) {
    const age = now - ping.t;
    if (age < 0 || age > ping.duration) continue;
    const frac = age / ping.duration;
    const alpha = 1 - frac;
    const radius = 8 + frac * 25;
    const px = ping.x * W;
    const py = ping.y * H;

    // Ring
    ctx.strokeStyle = ping.color + Math.round(alpha * 100).toString(16).padStart(2, '0');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Label
    if (frac < 0.6) {
      ctx.font = '9px monospace';
      ctx.fillStyle = ping.color + Math.round(alpha * 200).toString(16).padStart(2, '0');
      ctx.fillText(ping.label, px + radius + 4, py + 3);
    }
  }

  // ── Phase label ───────────────────────────────────────────────────────
  const currentPhase = detectPhase(sim.metrics, sim.prevMetrics);
  const phaseColor = PHASE_COLORS[currentPhase];
  ctx.font = '11px monospace';
  ctx.fillStyle = phaseColor + 'cc';
  ctx.fillText(PHASE_LABELS_PT[currentPhase], 10, H - 12);

  // ── Time ─────────────────────────────────────────────────────────────
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(`A${sim.currentAct} C${sim.currentScene} T${world.t.toFixed(0)}s`, 10, H - 28);
}

// ── Metric gauge ──────────────────────────────────────────────────────────
function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{
        width: 36, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{ width: `${value * 100}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      <span style={{ fontSize: 9, color, fontFamily: 'monospace' }}>{(value * 100).toFixed(0)}</span>
    </div>
  );
}

// ── Auto-forecast cooldown constant ───────────────────────────────────────
const AUTO_FORECAST_INTERVAL = 8; // seconds

// ── Main Component ────────────────────────────────────────────────────────
export const AsimovTheater: React.FC<Props> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const simRef    = useRef<AsimovSimState | null>(null);
  const rngRef    = useRef<(() => number) | null>(null);
  const lastTRef  = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── UI State ─────────────────────────────────────────────────────────
  const [running, setRunning]                 = useState(true);
  const [fps, setFps]                         = useState(0);
  const [activePreset, setActivePreset]       = useState<AsimovPreset>(ASIMOV_PRESETS[0]);
  const [sceneDuration, setSceneDuration]     = useState(30);
  const [fieldLayer, setFieldLayer]           = useState<'R' | 'L' | 'N' | 'off'>('off');
  const [anomalyEnabled, setAnomalyEnabled]   = useState(false);
  const [selectedFrame, setSelectedFrame]     = useState<number | null>(null);
  const [showLessons, setShowLessons]         = useState(false);

  // PATCH 2: Stage overlay toggles
  const [showTension, setShowTension]     = useState(true);
  const [showRHotspots, setShowRHotspots] = useState(true);

  // PATCH 2: Auto-compare
  const [autoCompareEnabled, setAutoCompareEnabled] = useState(true);

  // Reactive mirrors of sim state for UI
  const [metrics, setMetrics]     = useState<MetricsVector>(emptyMetrics());
  const [prevMetricsUI, setPrevMetricsUI] = useState<MetricsVector | null>(null);
  const [history, setHistory]     = useState<HistoricalFrame[]>([]);
  const [phase, setPhase]         = useState<PhaseLabel>('STABLE_ORDER');
  const [muleActive, setMuleActive] = useState(false);

  // PATCH 2: Forecast state (separate auto and deep)
  const [autoForecastResult, setAutoForecastResult] = useState<AsimovSimState['autoForecastResult']>(null);
  const [deepForecastResult, setDeepForecastResult] = useState<AsimovSimState['forecastResult']>(null);
  const [autoForecastRunning, setAutoForecastRunning] = useState(false);
  const [deepForecastRunning, setDeepForecastRunning] = useState(false);
  const [deepProgress, setDeepProgress] = useState(0);

  // PATCH 2: Auto-compare
  const [autoCompareResult, setAutoCompareResult] = useState<AsimovSimState['autoCompareResult']>(null);
  const [autoCompareVisible, setAutoCompareVisible] = useState(false);

  // PATCH 2: Jiang lens
  const [jiangEnabled, setJiangEnabled] = useState(true);

  const [cardCooldowns, setCardCooldowns]     = useState<Record<string, number>>({});
  const [activeInterventions, setActiveInterventions] = useState<AsimovSimState['activeInterventions']>([]);
  const [simT, setSimT] = useState(0);

  const fpsFrames  = useRef(0);
  const fpsLastT   = useRef(0);

  // Previous phase for ping detection
  const prevPhaseRef = useRef<PhaseLabel>('STABLE_ORDER');

  // ── Initialize simulation ─────────────────────────────────────────────
  const initSim = useCallback((preset: AsimovPreset, seedOverride?: number, enableAnomaly?: boolean) => {
    const seed = seedOverride ?? (Date.now() ^ Math.floor(Math.random() * 0xffffffff));
    const rng = makeRNG(seed);
    rngRef.current = rng;

    const world = createWorld({ ...preset.worldOpts, seed });

    const sim: AsimovSimState = {
      world,
      metrics: emptyMetrics(),
      prevMetrics: null,
      history: [],
      activeInterventions: [],
      cardCooldowns: {},
      mule: createMuleState(),
      currentAct: 1,
      currentScene: 0,
      sceneT: 0,
      sceneDuration: preset.sceneDuration,
      lastMacroT: 0,
      macroTickInterval: 1.5,
      forecastResult: null,
      forecastRunning: false,
      forecastJob: null,
      counterfactualResults: null,
      anomalyEnabled: enableAnomaly ?? false,
      lastAnomalyCheck: 0,
      // PATCH 2: Auto-forecast
      autoForecastResult: null,
      autoForecastJob: null,
      autoForecastRunning: false,
      lastAutoForecastT: -AUTO_FORECAST_INTERVAL, // trigger immediately
      autoForecastCooldown: AUTO_FORECAST_INTERVAL,
      // PATCH 2: Auto-compare
      autoCompareResult: null,
      autoCompareExpiry: 0,
      // PATCH 2: Jiang lens
      jiangLensEnabled: true,
      // PATCH 2: Event pings
      eventPings: [],
    };

    simRef.current = sim;
    setMetrics(emptyMetrics());
    setPrevMetricsUI(null);
    setHistory([]);
    setPhase('STABLE_ORDER');
    setMuleActive(false);
    setAutoForecastResult(null);
    setDeepForecastResult(null);
    setAutoCompareResult(null);
    setAutoCompareVisible(false);
    setCardCooldowns({});
    setActiveInterventions([]);
    setAutoForecastRunning(false);
    setDeepForecastRunning(false);
    setDeepProgress(0);
    setSelectedFrame(null);
    setSimT(0);
    prevPhaseRef.current = 'STABLE_ORDER';
  }, []);

  // Initialize on mount
  useEffect(() => {
    initSim(ASIMOV_PRESETS[0]);
  }, [initSim]);

  // ── Add event ping helper ───────────────────────────────────────────
  const addPing = useCallback((label: string, color: string, x?: number, y?: number) => {
    const sim = simRef.current;
    if (!sim) return;
    const ping: EventPing = {
      x: x ?? 0.5,
      y: y ?? 0.5,
      label,
      color,
      t: sim.world.t,
      duration: 3,
    };
    sim.eventPings.push(ping);
    // GC old pings
    sim.eventPings = sim.eventPings.filter(p => sim.world.t - p.t < p.duration + 1);
  }, []);

  // ── Main RAF loop ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    let lastTimestamp = 0;

    const loop = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(loop);

      if (lastTimestamp === 0) { lastTimestamp = timestamp; return; }
      const realDt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;

      // FPS
      fpsFrames.current++;
      if (timestamp - fpsLastT.current >= 1000) {
        setFps(fpsFrames.current);
        fpsFrames.current = 0;
        fpsLastT.current = timestamp;
      }

      const sim = simRef.current;
      if (!sim) return;

      // ── Deep Forecast job time slicing (priority) ─────────────────
      if (sim.forecastJob && sim.forecastRunning) {
        const done = tickForecastJobBudgeted(sim.forecastJob, sim.forecastJob.nBaseline, 6);
        setDeepProgress(sim.forecastJob.rolloutsDone / sim.forecastJob.totalRollouts);
        if (done) {
          const penalty = getMuleConfidencePenalty(sim.mule);
          const result  = aggregateForecast(sim.forecastJob, sim.mule.active, penalty);
          sim.forecastResult = result;
          sim.forecastRunning = false;
          sim.forecastJob = null;
          setDeepForecastResult(result);
          setDeepForecastRunning(false);
          setDeepProgress(1);
          // Also use as auto-forecast result (it's better)
          sim.autoForecastResult = result;
          setAutoForecastResult(result);
        }
        // During deep forecast, still step the sim
      }

      // ── Auto-Forecast time slicing (background, budget-limited) ──
      if (sim.autoForecastJob && sim.autoForecastRunning && !sim.forecastRunning) {
        const done = tickForecastJobBudgeted(sim.autoForecastJob, sim.autoForecastJob.nBaseline, 4);
        if (done) {
          const penalty = getMuleConfidencePenalty(sim.mule);
          const result = aggregateForecast(sim.autoForecastJob, sim.mule.active, penalty);
          sim.autoForecastResult = result;
          sim.autoForecastRunning = false;
          sim.autoForecastJob = null;
          sim.lastAutoForecastT = sim.world.t;
          setAutoForecastResult(result);
          setAutoForecastRunning(false);
        }
      }

      // ── Auto-compare job slicing (same budget pattern) ────────────
      // Auto-compare uses two jobs stored in sim.counterfactualResults temporarily
      // We handle this with a simple sync approach (jobs are tiny)

      if (!running) {
        renderFrame(sim);
        return;
      }

      const dt = realDt;

      // ── Apply active interventions ──────────────────────────────────
      sim.activeInterventions = sim.activeInterventions.filter(inter => inter.endT > sim.world.t);
      for (const inter of sim.activeInterventions) {
        const raw = (sim.world.t - inter.startT) / (inter.endT - inter.startT);
        const strength = Math.sin(raw * Math.PI);
        applyIntervention(sim.world, inter.cardId, strength);
      }

      // ── Mule update ─────────────────────────────────────────────────
      if (sim.mule.active) {
        updateMule(sim.mule, sim.world, dt);
        if (!sim.mule.active) {
          setMuleActive(false);
          addPing('Mule expired', '#c05aff', sim.mule.x, sim.mule.y);
        }
      }

      // ── Step world ─────────────────────────────────────────────────
      stepWorld(sim.world, dt, rngRef.current!);

      // ── MacroTick ──────────────────────────────────────────────────
      if (sim.world.t - sim.lastMacroT >= sim.macroTickInterval) {
        const macroInterval = sim.world.t - sim.lastMacroT;
        const gini = computeGini(sim.world.agents);
        macroTick(sim.world, macroInterval, gini, activePreset.nBaseline);

        const cps = sim.world.conflictAccum / Math.max(0.01, macroInterval);
        sim.world.conflictAccum = 0;
        const newMetrics = computeMetrics(sim.world, cps);
        sim.prevMetrics = sim.metrics;
        sim.metrics = newMetrics;
        sim.lastMacroT = sim.world.t;

        setMetrics({ ...newMetrics });
        setPrevMetricsUI(sim.prevMetrics ? { ...sim.prevMetrics } : null);
        const newPhase = detectPhase(newMetrics, sim.prevMetrics);
        setPhase(newPhase);

        // Phase shift ping
        if (newPhase !== prevPhaseRef.current) {
          const c = sim.world.centroids[0];
          addPing(`Phase: ${PHASE_LABELS_PT[newPhase]}`, PHASE_COLORS[newPhase], c.x, c.y);
          prevPhaseRef.current = newPhase;
        }
      }

      // ── Scene timer ────────────────────────────────────────────────
      sim.sceneT += dt;
      if (sim.sceneT >= sim.sceneDuration) {
        endScene(sim);
        sim.sceneT = 0;
      }

      // ── Anomaly check (once per scene) ─────────────────────────────
      if (anomalyEnabled && !sim.mule.active && sim.world.t - sim.lastAnomalyCheck > sim.sceneDuration) {
        sim.lastAnomalyCheck = sim.world.t;
        if (checkMuleSpawn(sim.mule, anomalyEnabled, sim.world.seed, sim.currentScene)) {
          sim.mule = spawnMule(sim.world, sim.world.seed ^ sim.currentScene);
          setMuleActive(true);
          addPing('Anomaly: The Mule', '#c05aff', sim.mule.x, sim.mule.y);
        }
      }

      // ── Auto-Forecast trigger ──────────────────────────────────────
      if (!sim.autoForecastRunning && !sim.forecastRunning) {
        const elapsed = sim.world.t - sim.lastAutoForecastT;
        if (elapsed >= sim.autoForecastCooldown) {
          sim.autoForecastJob = createAutoForecastJob(sim.world, activePreset.nBaseline);
          sim.autoForecastRunning = true;
          setAutoForecastRunning(true);
        }
      }

      // ── Auto-compare expiry ─────────────────────────────────────────
      if (sim.autoCompareExpiry > 0 && sim.world.t > sim.autoCompareExpiry) {
        setAutoCompareVisible(false);
      }

      // ── Event ping GC ──────────────────────────────────────────────
      sim.eventPings = sim.eventPings.filter(p => sim.world.t - p.t < p.duration + 1);

      // Sync UI
      setSimT(sim.world.t);
      setActiveInterventions([...sim.activeInterventions]);

      renderFrame(sim);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, running, anomalyEnabled, activePreset, fieldLayer, showTension, showRHotspots]);

  // ── End of scene: generate historical frame ───────────────────────────
  function endScene(sim: AsimovSimState) {
    const currentPhase = detectPhase(sim.metrics, sim.prevMetrics);
    const lastActName = sim.activeInterventions.length > 0
      ? INTERVENTION_CARDS.find(c => c.id === sim.activeInterventions[0].cardId)?.name
      : undefined;
    const isAct = !!lastActName;
    const { headline, causal } = generateNarrative(
      currentPhase, sim.metrics, sim.prevMetrics, isAct, lastActName,
    );

    const frame: HistoricalFrame = {
      act: sim.currentAct,
      scene: sim.currentScene,
      t: sim.world.t,
      phaseLabel: currentPhase,
      metrics: { ...sim.metrics },
      headline,
      causal,
      isAct,
      actName: lastActName,
    };

    sim.history.push(frame);
    sim.currentScene++;
    if (sim.currentScene % 4 === 0) sim.currentAct++;
    setHistory([...sim.history]);

    // PATCH 2: Trigger auto-forecast immediately after scene end
    sim.lastAutoForecastT = sim.world.t - sim.autoForecastCooldown - 1;
  }

  // ── Canvas render ─────────────────────────────────────────────────────
  function renderFrame(sim: AsimovSimState) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderStage(canvas, sim, fieldLayer, true, showTension, showRHotspots);
  }

  // ── Handle intervention card apply ────────────────────────────────────
  const handleApplyCard = useCallback((cardId: string) => {
    const sim = simRef.current;
    if (!sim) return;
    const card = INTERVENTION_CARDS.find(c => c.id === cardId);
    if (!card) return;

    const readyAt = sim.cardCooldowns[cardId] ?? 0;
    if (sim.world.t < readyAt) return;
    if (sim.activeInterventions.some(a => a.cardId === cardId)) return;

    const inter = {
      cardId,
      startT: sim.world.t,
      endT: sim.world.t + card.durationSeconds,
      strength: 1,
    };
    sim.activeInterventions.push(inter);
    sim.cardCooldowns[cardId] = sim.world.t + card.durationSeconds + card.cooldownSeconds;
    setCardCooldowns({ ...sim.cardCooldowns });
    setActiveInterventions([...sim.activeInterventions]);

    // Ping
    const c = sim.world.centroids[0];
    addPing(`Act: ${card.name}`, card.color, c.x, c.y);

    // PATCH 2: Trigger immediate auto-forecast after act
    sim.lastAutoForecastT = sim.world.t - sim.autoForecastCooldown - 1;

    // PATCH 2: Auto-compare (run 2 mini-forecasts synchronously, they're small)
    if (autoCompareEnabled) {
      try {
        // With act (current state, intervention just applied)
        const jobWith = createCompareJob(sim.world, activePreset.nBaseline);
        while (jobWith.rolloutsDone < jobWith.totalRollouts)
          tickForecastJob(jobWith, jobWith.nBaseline, 4);

        // Without act (clone before intervention was applied... approximate)
        const worldWithout = cloneWorldState(sim.world);
        // Undo the intervention effect approximately
        applyInvertedIntervention(worldWithout, cardId, 0.3);
        const jobWithout = createCompareJob(worldWithout, activePreset.nBaseline);
        while (jobWithout.rolloutsDone < jobWithout.totalRollouts)
          tickForecastJob(jobWithout, jobWithout.nBaseline, 4);

        const penalty = getMuleConfidencePenalty(sim.mule);
        const withActResult = aggregateForecast(jobWith, sim.mule.active, penalty);
        const withoutActResult = aggregateForecast(jobWithout, sim.mule.active, penalty);

        const compareResult = {
          withAct: withActResult,
          withoutAct: withoutActResult,
          cardId,
          appliedAt: sim.world.t,
        };
        sim.autoCompareResult = compareResult;
        sim.autoCompareExpiry = sim.world.t + 5; // 5s visibility
        setAutoCompareResult(compareResult);
        setAutoCompareVisible(true);
      } catch {
        // Silently fail - auto-compare is optional
      }
    }
  }, [activePreset, addPing, autoCompareEnabled]);

  // ── Handle deep forecast ──────────────────────────────────────────────
  const handleRunDeep = useCallback(() => {
    const sim = simRef.current;
    if (!sim || sim.forecastRunning) return;
    const job = createDeepForecastJob(sim.world, activePreset.nBaseline);
    sim.forecastJob = job;
    sim.forecastRunning = true;
    setDeepForecastRunning(true);
    setDeepProgress(0);
  }, [activePreset]);

  // ── Preset change ─────────────────────────────────────────────────────
  const handlePresetChange = useCallback((preset: AsimovPreset) => {
    setActivePreset(preset);
    setSceneDuration(preset.sceneDuration);
    initSim(preset);
  }, [initSim]);

  // ── Lesson preset ─────────────────────────────────────────────────────
  const handleLessonSelect = useCallback((lesson: LessonPreset) => {
    const asPreset: AsimovPreset = {
      id: lesson.id,
      name: lesson.name,
      description: lesson.description,
      color: lesson.color,
      worldOpts: lesson.worldOpts,
      nBaseline: lesson.nBaseline,
      sceneDuration: lesson.sceneDuration,
      expectedRegime: lesson.expectedArc,
    };
    setActivePreset(asPreset);
    setSceneDuration(lesson.sceneDuration);
    const isAnomaly = lesson.id === 'anomaly_stress_test';
    initSim(asPreset, undefined, isAnomaly);
    if (isAnomaly) setAnomalyEnabled(true);
    setShowLessons(false);
  }, [initSim]);

  // ── Reset ─────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    initSim(activePreset);
  }, [activePreset, initSim]);

  // ── Sync anomaly enabled to sim ────────────────────────────────────────
  useEffect(() => {
    if (simRef.current) simRef.current.anomalyEnabled = anomalyEnabled;
  }, [anomalyEnabled]);

  useEffect(() => {
    if (simRef.current) simRef.current.sceneDuration = sceneDuration;
  }, [sceneDuration]);

  if (!active) return null;

  const currentPhaseLabel = PHASE_LABELS_PT[phase];
  const phaseColor = PHASE_COLORS[phase];

  return (
    <div style={{
      position: 'fixed', inset: 0, top: 36,
      background: '#000',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'monospace',
    }}>
      {/* ── Top controls bar ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px',
        background: 'rgba(0,0,0,0.4)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        {/* Play/Pause */}
        <button title="Play"
          onClick={() => setRunning(r => !r)}
          style={{
            padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.85)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          {running ? <Pause size={11} strokeWidth={1.5} /> : <Play size={11} strokeWidth={1.5} />}
          <span style={{ fontSize: 10 }}>{running ? 'Pausar' : 'Rodar'}</span>
        </button>

        {/* Reset */}
        <button title="Pausar"
          onClick={handleReset}
          style={{
            padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.55)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <RotateCcw size={10} strokeWidth={1.5} />
          <span style={{ fontSize: 10 }}>Reset</span>
        </button>

        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />

        {/* Presets */}
        {ASIMOV_PRESETS.map(p => (
          <button title="Pular"
            key={p.id}
            onClick={() => handlePresetChange(p)}
            style={{
              padding: '3px 9px', borderRadius: 4, cursor: 'pointer', fontSize: 9.5,
              background: activePreset.id === p.id ? `${p.color}22` : 'transparent',
              border: `1px solid ${activePreset.id === p.id ? p.color + '55' : 'rgba(255,255,255,0.08)'}`,
              color: activePreset.id === p.id ? p.color : 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}
          >
            {p.name}
          </button>
        ))}

        {/* Scenarios button */}
        <button title="Reiniciar"
          onClick={() => setShowLessons(true)}
          style={{
            padding: '3px 9px', borderRadius: 4, cursor: 'pointer', fontSize: 9.5,
            background: 'rgba(160,255,238,0.06)',
            border: '1px solid rgba(160,255,238,0.2)',
            color: '#a0ffee',
            display: 'flex', alignItems: 'center', gap: 4,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}
        >
          <BookOpen size={10} strokeWidth={1.5} />
          Scenarios
        </button>

        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />

        {/* Scene duration */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>Cena</span>
          {[20, 30, 60].map(d => (
            <button title="Anterior"
              key={d}
              onClick={() => setSceneDuration(d)}
              style={{
                padding: '2px 7px', borderRadius: 3, cursor: 'pointer', fontSize: 9,
                background: sceneDuration === d ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: `1px solid ${sceneDuration === d ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                color: sceneDuration === d ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
              }}
            >
              {d}s
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />

        {/* Stage overlays: field, tension, R hotspots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>Campo</span>
          {(['off', 'R', 'L', 'N'] as const).map(layer => (
            <button title="Próximo"
              key={layer}
              onClick={() => setFieldLayer(layer)}
              style={{
                padding: '2px 7px', borderRadius: 3, cursor: 'pointer', fontSize: 9,
                background: fieldLayer === layer ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: `1px solid ${fieldLayer === layer ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                color: fieldLayer === layer
                  ? layer === 'R' ? '#5aff8a' : layer === 'L' ? '#4a9eff' : layer === 'N' ? '#ff5a5a' : 'rgba(255,255,255,0.7)'
                  : 'rgba(255,255,255,0.35)',
              }}
            >
              {layer === 'off' ? 'Off' : layer}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />

        {/* Tension/R toggles */}
        <button
          onClick={() => setShowTension(v => !v)}
          title="Tensao: N alto + L baixo = overlay vermelho sutil"
          style={{
            padding: '2px 7px', borderRadius: 3, cursor: 'pointer', fontSize: 9,
            background: showTension ? 'rgba(255,90,90,0.1)' : 'transparent',
            border: `1px solid ${showTension ? 'rgba(255,90,90,0.3)' : 'rgba(255,255,255,0.06)'}`,
            color: showTension ? '#ff5a5a' : 'rgba(255,255,255,0.35)',
          }}
        >
          Tens
        </button>
        <button
          onClick={() => setShowRHotspots(v => !v)}
          title="Hotspots de recurso R"
          style={{
            padding: '2px 7px', borderRadius: 3, cursor: 'pointer', fontSize: 9,
            background: showRHotspots ? 'rgba(90,255,138,0.1)' : 'transparent',
            border: `1px solid ${showRHotspots ? 'rgba(90,255,138,0.3)' : 'rgba(255,255,255,0.06)'}`,
            color: showRHotspots ? '#5aff8a' : 'rgba(255,255,255,0.35)',
          }}
        >
          R
        </button>

        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />

        {/* Anomaly toggle */}
        <button title="Fechar"
          onClick={() => setAnomalyEnabled(v => !v)}
          style={{
            padding: '3px 9px', borderRadius: 4, cursor: 'pointer', fontSize: 9.5,
            display: 'flex', alignItems: 'center', gap: 5,
            background: anomalyEnabled ? 'rgba(192,90,255,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${anomalyEnabled ? 'rgba(192,90,255,0.45)' : 'rgba(255,255,255,0.08)'}`,
            color: anomalyEnabled ? '#c05aff' : 'rgba(255,255,255,0.35)',
          }}
        >
          <AlertTriangle size={10} strokeWidth={1.5} />
          <span>Mule {anomalyEnabled ? 'On' : 'Off'}</span>
        </button>

        {/* Auto-compare toggle */}
        <button
          onClick={() => setAutoCompareEnabled(v => !v)}
          title="Auto-Compare: mostra delta apos cada ato"
          style={{
            padding: '2px 7px', borderRadius: 3, cursor: 'pointer', fontSize: 9,
            background: autoCompareEnabled ? 'rgba(255,206,90,0.08)' : 'transparent',
            border: `1px solid ${autoCompareEnabled ? 'rgba(255,206,90,0.25)' : 'rgba(255,255,255,0.06)'}`,
            color: autoCompareEnabled ? '#ffce5a' : 'rgba(255,255,255,0.35)',
          }}
        >
          Cmp {autoCompareEnabled ? 'On' : 'Off'}
        </button>

        {/* Mule indicator */}
        {muleActive && (
          <span style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 3,
            background: 'rgba(192,90,255,0.18)', color: '#c05aff',
          }}>
            MULE ATIVA
          </span>
        )}

        {/* FPS + phase */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 3,
            background: `${phaseColor}18`, color: phaseColor,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {currentPhaseLabel}
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{fps}fps</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
            T{simT.toFixed(0)}s
          </span>
        </div>
      </div>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
        {/* Stage canvas */}
        <div style={{ flex: '1 1 65%', position: 'relative', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            width={900}
            height={600}
            style={{
              width: '100%', height: '100%',
              display: 'block',
              imageRendering: 'pixelated',
            }}
          />
          {/* Metric gauges overlay */}
          <div style={{
            position: 'absolute', bottom: 14, right: 14,
            display: 'flex', gap: 14,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            borderRadius: 6, padding: '7px 12px',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <Gauge label="Cnflto" value={metrics.conflictRate} color="#ff5a5a" />
            <Gauge label="Desig"  value={metrics.inequality}   color="#ffce5a" />
            <Gauge label="Legit"  value={metrics.legitimacyMean} color="#5aff8a" />
            <Gauge label="Norma"  value={metrics.normMean}     color="#c05aff" />
            <Gauge label="Coes"   value={metrics.cohesion}     color="#4a9eff" />
            <Gauge label="Polar"  value={metrics.polarization} color="#ff9a3c" />
          </div>

          {/* Deep forecast overlay */}
          {deepForecastRunning && (
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              padding: '6px 14px', borderRadius: 6,
              background: 'rgba(7,7,18,0.85)',
              border: '1px solid rgba(74,158,255,0.25)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: 4,
                background: '#4a9eff', opacity: 0.8,
                animation: 'pulse 1s ease-in-out infinite',
              }} />
              <span style={{ fontSize: 10, color: '#4a9eff' }}>
                Deep Forecast {Math.round(deepProgress * 100)}%
              </span>
              <div style={{
                width: 60, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${deepProgress * 100}%`, height: '100%',
                  background: '#4a9eff', borderRadius: 2,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Right panel: Oracle + Timeline */}
        <div style={{
          flex: '0 0 310px',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(0,0,0,0.3)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}>
          {/* Oracle Dashboard (Tiered) */}
          <div style={{
            overflowY: 'auto', flexShrink: 0,
            maxHeight: '55%',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <OracleDashboard
              metrics={metrics}
              prevMetrics={prevMetricsUI}
              phase={phase}
              oracleResult={autoForecastResult}
              deepResult={deepForecastResult}
              isAutoRunning={autoForecastRunning}
              isDeepRunning={deepForecastRunning}
              deepProgress={deepProgress}
              jiangEnabled={jiangEnabled}
              onToggleJiang={() => setJiangEnabled(v => !v)}
              onRunDeep={handleRunDeep}
              autoCompare={autoCompareResult}
              autoCompareVisible={autoCompareVisible}
              muleActive={muleActive}
            />
          </div>

          {/* Timeline (bottom) */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              padding: '6px 12px 4px',
              fontSize: 9.5, color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              flexShrink: 0,
            }}>
              Linha do Tempo ({history.length} cenas)
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <Timeline
                frames={history}
                selected={selectedFrame}
                onSelect={setSelectedFrame}
              />
            </div>
          </div>
        </div>

        {/* Lesson Presets overlay */}
        {showLessons && (
          <LessonPresetsPanel
            onSelect={handleLessonSelect}
            onClose={() => setShowLessons(false)}
          />
        )}
      </div>

      {/* ── Bottom: Intervention cards ─────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(0,0,0,0.45)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          padding: '4px 10px 2px',
          fontSize: 9, color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          Atos Historicos
        </div>
        <InterventionCards
          cardCooldowns={cardCooldowns}
          activeInterventions={activeInterventions}
          currentT={simT}
          onApply={handleApplyCard}
        />
      </div>

      {/* Pulse animation CSS */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};