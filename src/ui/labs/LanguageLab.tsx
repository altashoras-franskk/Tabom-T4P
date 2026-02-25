// ─────────────────────────────────────────────────────────────────────────────
// Language Lab — Heptapod
// "A Chegada" — Ink Quanta Simulation + Living Lexicon + OpenAI Lexicographer
// ─────────────────────────────────────────────────────────────────────────────
import React, {
  useEffect, useRef, useState, useCallback,
} from 'react';

import type {
  LanguageParams, LangMode, LensId, GlyphSpec,
  LexiconEntry, WorldEvent, LLMStatus, GlyphAct,
  TrainChoice, LexiconCluster, LanguageSession,
  Observables, WorldState,
} from '../../sim/language/types';
import { createWorld, stepWorld } from '../../sim/language/engine';
import { depositStrokes, createStrokeState } from '../../sim/language/strokes';
import type { StrokeState } from '../../sim/language/strokes';
import { computeObservables } from '../../sim/language/observables';
import { generateGlyph } from '../../sim/language/glyphGenerator';
import { parseGlyph, cosineSimilarity } from '../../sim/language/glyphParser';
import { createGlyphAct, OPERATOR_LABELS } from '../../sim/language/operators';
import { computeLanguageMetrics } from '../../sim/language/metrics';
import { DEFAULT_PARAMS } from '../../sim/language/presets';
import type { LanguagePreset } from '../../sim/language/presets';
import { drawGlyph } from '../language/glyphRenderer';
import { GlyphStream } from '../language/GlyphStream';
import { NodeInspector } from '../language/NodeInspector';
import { LexiconDrawer } from '../language/LexiconDrawer';
import { MentorPanel } from '../language/MentorPanel';
import { ControlsBar } from '../language/ControlsBar';
import {
  saveLexicon, loadLexicon, saveSessions, loadSessions, upsertEntry,
} from '../../storage/grimoireStore';
import { refineEntry, clusterLexicon } from '../../llm/lexicographer';

interface Props { active: boolean; }

const TWO_PI = Math.PI * 2;
const STREAM_MAX = 12;
const MACRO_TICK_INTERVAL = 1.1; // seconds

// ── Main component ────────────────────────────────────────────────────────────
export function LanguageLab({ active }: Props) {
  // ── Canvas refs ─────────────────────────────────────────────────────────────
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const glyphOverRef = useRef<HTMLCanvasElement>(null);  // glyph overlay canvas

  // ── Sim state (mutable, no re-render on change) ───────────────────────────
  const worldRef    = useRef<WorldState>(createWorld(DEFAULT_PARAMS));
  const paramsRef   = useRef<LanguageParams>({ ...DEFAULT_PARAMS });
  const actsRef     = useRef<GlyphAct[]>([]);
  const strokeState = useRef<StrokeState>(createStrokeState(800, 600));
  const lastTime    = useRef<number>(0);
  const macroTimer  = useRef<number>(0);
  const prevObsRef  = useRef<Observables | null>(null);
  const timeRef     = useRef<number>(0);
  const rafRef      = useRef<number>(0);
  const modeRef     = useRef<LangMode>('listen');
  const lensRef     = useRef<LensId>('world');
  const runningRef  = useRef(true);
  const lastGlyphIdRef = useRef<string>(''); // tracks last rendered glyph overlay

  // ── React state (display only) ────────────────────────────────────────────
  const [params,       setParams]       = useState<LanguageParams>({ ...DEFAULT_PARAMS });
  const [mode,         setMode]         = useState<LangMode>('listen');
  const [lens,         setLens]         = useState<LensId>('world');
  const [running,      setRunning]      = useState(true);
  const [glyphStream,  setGlyphStream]  = useState<GlyphSpec[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<GlyphSpec | null>(null);
  const [lexicon,      setLexicon]      = useState<LexiconEntry[]>(() => loadLexicon());
  const [clusters,     setClusters]     = useState<LexiconCluster[]>([]);
  const [sessions,     setSessions]     = useState<LanguageSession[]>(() => loadSessions());
  const [events,       setEvents]       = useState<WorldEvent[]>([]);
  const [llmStatus,    setLlmStatus]    = useState<LLMStatus>({ state: 'idle' });
  const [lastRationale, setLastRationale] = useState('');
  const [showLexicon,  setShowLexicon]  = useState(false);
  const [trainEvent,   setTrainEvent]   = useState<{ spec: GlyphSpec; question: string } | null>(null);
  const [metrics,      setMetrics]      = useState<ReturnType<typeof computeLanguageMetrics> | null>(null);
  const [canvasSize,   setCanvasSize]   = useState({ w: 800, h: 600 });
  const [currentCoherence, setCurrentCoherence] = useState(0); // drives overlay blur

  const lexiconRef = useRef<LexiconEntry[]>(lexicon);
  lexiconRef.current = lexicon;

  const clustersRef = useRef<LexiconCluster[]>(clusters);
  clustersRef.current = clusters;

  // ── Resize: use ResizeObserver so canvas pixel dims always match CSS display ─
  useEffect(() => {
    const container = canvasRef.current?.parentElement;
    if (!container) return;

    const apply = (w: number, h: number) => {
      const ww = Math.max(1, Math.floor(w));
      const hh = Math.max(1, Math.floor(h));
      setCanvasSize({ w: ww, h: hh });
      strokeState.current.width  = ww;
      strokeState.current.height = hh;
    };

    // Initial measurement
    apply(container.clientWidth, container.clientHeight);

    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        apply(e.contentRect.width, e.contentRect.height);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Sync params to ref ─────────────────────────────────────────────────────
  useEffect(() => { paramsRef.current = params; }, [params]);
  useEffect(() => { modeRef.current = mode; },   [mode]);
  useEffect(() => { lensRef.current = lens; },   [lens]);
  useEffect(() => { runningRef.current = running; }, [running]);

  // ── Build lexicon entry from glyph ────────────────────────────────────────
  const buildEntry = useCallback((spec: GlyphSpec): LexiconEntry => {
    const features = parseGlyph(spec);
    return {
      glyphId: spec.id,
      signatureHash: spec.signatureHash,
      miniGlyphSpec: spec,
      gloss: `${features.densityBin}-${features.coherenceBin}`,
      definition: '',
      usage: '',
      contrasts: [],
      tokens: features.tokens,
      embedding: features.embedding,
      examples: [{ timestamp: spec.timestamp, snapshotMetrics: spec.observables }],
      confidence: 0,
      status: 'tentative',
      lastUpdated: Date.now(),
      tags: [],
      clusterId: '',
      frequency: 1,
    };
  }, []);

  // ── Macro tick: glyph generation ──────────────────────────────────────────
  const macroTick = useCallback(() => {
    const state  = worldRef.current;
    const p      = paramsRef.current;
    const m      = modeRef.current;

    const obs   = computeObservables(state, p);
    const spec  = generateGlyph(obs, p.dictionaryMode, Date.now());

    // Update stream
    setGlyphStream(prev => {
      const next = [...prev, spec].slice(-STREAM_MAX);
      return next;
    });

    // Update lexicon
    const curLex = lexiconRef.current;
    const existing = curLex.find(e => e.signatureHash === spec.signatureHash);
    let nextLex: LexiconEntry[];

    if (existing) {
      // Reinforce
      const updated: LexiconEntry = {
        ...existing,
        frequency: existing.frequency + 1,
        examples: [
          ...existing.examples.slice(-4),
          { timestamp: spec.timestamp, snapshotMetrics: obs },
        ],
        lastUpdated: Date.now(),
      };
      nextLex = curLex.map(e => e.glyphId === existing.glyphId ? updated : e);
      // Event: PATTERN_STABLE
      if (existing.frequency % 3 === 0) {
        setEvents(prev => [...prev.slice(-19), {
          id: Date.now().toString(),
          kind: 'PATTERN_STABLE',
          timestamp: Date.now(),
          description: `Padrão "${existing.gloss || existing.signatureHash.slice(0,6)}" reforçado (${updated.frequency}×)`,
        }]);
      }
    } else {
      // New entry
      const entry = buildEntry(spec);
      nextLex = [...curLex, entry].slice(-200);
      setEvents(prev => [...prev.slice(-19), {
        id: Date.now().toString(),
        kind: 'GLYPH_SHIFT',
        timestamp: Date.now(),
        description: `Novo glifo: ${spec.signatureHash.slice(0,8)} — ${entry.tokens.slice(0,3).join(' ')}`,
      }]);

      // Auto-refine if enabled
      if (p.llmAutoRefine) {
        refineEntryLLM(spec, entry, obs, nextLex).catch(() => {});
      }
    }

    setLexicon(nextLex);
    saveLexicon(nextLex);

    // Metrics
    const met = computeLanguageMetrics(obs, nextLex);
    setMetrics(met);
    // Update coherence for overlay blur
    setCurrentCoherence(obs.coherenceMean);

    // Train mode: pick ambiguous entry
    if (m === 'train') {
      const ambiguous = nextLex
        .filter(e => e.confidence < 0.4 && e.frequency >= 2)
        .sort((a, b) => a.confidence - b.confidence)[0];
      if (ambiguous && !trainEvent) {
        setTrainEvent({
          spec: ambiguous.miniGlyphSpec,
          question: `"${ambiguous.tokens.slice(0,3).join(', ')}" — esse glifo significa mais:`,
        });
      }
    }

    prevObsRef.current = obs;
  }, [buildEntry, trainEvent]);

  const macroTickRef = useRef(macroTick);
  macroTickRef.current = macroTick;

  // ── LLM refine ────────────────────────────────────────────────────────────
  const refineEntryLLM = useCallback(async (
    spec: GlyphSpec,
    entry: LexiconEntry,
    obs: Observables,
    curLex: LexiconEntry[],
  ) => {
    setLlmStatus({ state: 'loading' });
    try {
      const allGlosses = curLex.filter(e => e.gloss && e.glyphId !== entry.glyphId).map(e => e.gloss);
      const prev = prevObsRef.current;
      const effectDelta = prev
        ? { before: prev, after: obs }
        : undefined;
      const result = await refineEntry(entry, obs, effectDelta, [], allGlosses);
      setLastRationale(result.rationale);

      const updated: LexiconEntry = {
        ...entry,
        gloss:       result.gloss,
        definition:  result.definition,
        usage:       result.usage,
        contrasts:   result.contrasts,
        tags:        result.tags,
        confidence:  result.confidence,
        status:      result.needs_verification ? 'tentative' : entry.status,
        lastUpdated: Date.now(),
      };

      setLexicon(prev => {
        const next = upsertEntry(prev, updated);
        saveLexicon(next);
        return next;
      });
      setLlmStatus({ state: 'ok' });
    } catch (e) {
      setLlmStatus({ state: 'error', lastError: (e as Error).message });
    }
  }, []);

  // ── Handle Ask LLM button ─────────────────────────────────────────────────
  const handleAskLLM = useCallback((spec: GlyphSpec, entry: LexiconEntry | null) => {
    const obs = computeObservables(worldRef.current, paramsRef.current);
    const ent = entry ?? buildEntry(spec);
    const curLex = lexiconRef.current;
    refineEntryLLM(spec, ent, obs, curLex);
  }, [buildEntry, refineEntryLLM]);

  // ── Handle Speak ──────────────────────────────────────────────────────────
  const handleSpeak = useCallback((spec: GlyphSpec, tx?: number, ty?: number) => {
    const state = worldRef.current;
    const p     = paramsRef.current;
    // Default target: centre of mass of quanta
    let cx = 0.5, cy = 0.5;
    if (state.quanta.length) {
      let xs = 0, ys = 0;
      for (const q of state.quanta) { xs += q.x; ys += q.y; }
      cx = xs / state.quanta.length; cy = ys / state.quanta.length;
    }
    const act = createGlyphAct(spec, tx ?? cx, ty ?? cy, p);
    actsRef.current.push(act);

    const obs = computeObservables(state, p);
    setEvents(prev => [...prev.slice(-19), {
      id: Date.now().toString(),
      kind: 'SPEAK_EFFECT',
      timestamp: Date.now(),
      description: `Speak: ${OPERATOR_LABELS[act.kind].label} r=${act.radius.toFixed(2)} dur=${act.duration.toFixed(1)}s`,
    }]);

    // Record effect after a short delay
    const prevObs = { ...obs };
    setTimeout(() => {
      const afterObs = computeObservables(worldRef.current, paramsRef.current);
      setLexicon(prev => {
        const idx = prev.findIndex(e => e.glyphId === spec.id);
        if (idx < 0) return prev;
        const entry = prev[idx];
        if (paramsRef.current.llmAutoRefine) {
          refineEntryLLM(spec, entry, afterObs, prev);
        }
        return prev;
      });
    }, 3000);
  }, [refineEntryLLM]);

  // ── Canvas click (Speak in speak mode) ───────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (modeRef.current !== 'speak') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Convert CSS click position to square-world [0,1] coords
    const cssPx = (e.clientX - rect.left) * (canvas.width  / rect.width);
    const cssPy = (e.clientY - rect.top)  * (canvas.height / rect.height);
    const S  = Math.min(canvas.width, canvas.height);
    const OX = (canvas.width  - S) * 0.5;
    const OY = (canvas.height - S) * 0.5;
    const tx = (cssPx - OX) / S;
    const ty = (cssPy - OY) / S;
    const spec = selectedSpec ?? glyphStream[glyphStream.length - 1];
    if (spec) handleSpeak(spec, tx, ty);
  }, [selectedSpec, glyphStream, handleSpeak]);

  // ── Train choice ──────────────────────────────────────────────────────────
  const handleTrainChoice = useCallback((choice: TrainChoice) => {
    if (!trainEvent) return;
    setLexicon(prev => {
      const idx = prev.findIndex(e => e.glyphId === trainEvent.spec.id);
      if (idx < 0) return prev;
      const entry = prev[idx];
      const updated: LexiconEntry = {
        ...entry,
        confidence: Math.min(1, entry.confidence + 0.25),
        tags: [...new Set([...entry.tags, choice.toLowerCase()])],
        lastUpdated: Date.now(),
      };
      const next = upsertEntry(prev, updated);
      saveLexicon(next);
      return next;
    });
    setTrainEvent(null);
  }, [trainEvent]);

  // ── Cluster ────────────────────────────────────────────────────────────────
  const handleCluster = useCallback(async () => {
    const curLex = lexiconRef.current;
    if (curLex.length < 3) return;
    setLlmStatus({ state: 'loading' });
    try {
      const result = await clusterLexicon(curLex);
      const COLORS = ['#a070ff', '#60c0ff', '#ff8060', '#80ff80', '#ffd060'];
      const newClusters: LexiconCluster[] = result.clusters.map((c, i) => ({
        id: c.id, label: c.label, members: c.members,
        color: COLORS[i % COLORS.length],
      }));
      setClusters(newClusters);
      // Apply cluster IDs to lexicon
      setLexicon(prev => {
        const clustMap = new Map<string, string>();
        for (const cl of result.clusters) {
          for (const mid of cl.members) clustMap.set(mid, cl.id);
        }
        return prev.map(e => ({ ...e, clusterId: clustMap.get(e.glyphId) ?? e.clusterId }));
      });
      setLlmStatus({ state: 'ok', lastOutput: result.notes });
    } catch (e) {
      setLlmStatus({ state: 'error', lastError: (e as Error).message });
    }
  }, []);

  // ── RAF render loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;

    const canvas     = canvasRef.current;
    const glyphOver  = glyphOverRef.current;
    if (!canvas || !glyphOver) return;

    let frameCount = 0;
    lastTime.current = performance.now();

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const rawDt = (now - lastTime.current) / 1000;
      const dt = Math.min(rawDt > 0 ? rawDt : 0.016, 0.05);
      lastTime.current = now;
      timeRef.current += dt;

      if (!runningRef.current) {
        // Still render even when paused (just don't step physics)
        const W = canvas.width, H = canvas.height;
        if (W < 2 || H < 2) return;
        const ctx2 = canvas.getContext('2d');
        if (!ctx2) return;
        // Redraw glyph overlay while paused
        const streamArr2 = glyphStreamRef.current;
        if (streamArr2.length > 0) {
          const spec2 = streamArr2[streamArr2.length - 1];
          const gCtx2 = glyphOver.getContext('2d')!;
          gCtx2.clearRect(0, 0, glyphOver.width, glyphOver.height);
          const gR2 = Math.min(glyphOver.width, glyphOver.height) * 0.44;
          drawGlyph(gCtx2, spec2, glyphOver.width / 2, glyphOver.height / 2, gR2, {
            alpha: 0.96, animated: true, time: timeRef.current,
          });
        }
        return;
      }

      const state  = worldRef.current;
      const p      = paramsRef.current;
      const acts   = actsRef.current;

      // Step physics
      stepWorld(state, p, dt, acts);
      actsRef.current = acts.filter(a => a.duration > 0);

      // Deposit strokes
      depositStrokes(state, p, dt);

      // Macro tick
      macroTimer.current += dt;
      if (macroTimer.current >= MACRO_TICK_INTERVAL) {
        macroTimer.current = 0;
        macroTickRef.current();
      }

      // ── RENDER ────────────────────────────────────────────────────────────
      const W = canvas.width, H = canvas.height;
      const ctx = canvas.getContext('2d')!;
      const lensId = lensRef.current;

      // ── Square-world mapping — fixes the oval distortion ─────────────────
      // All world coords [0,1]×[0,1] map to a square of S×S pixels centred
      // in the canvas. This ensures a circle in world space = circle on screen.
      const S    = Math.min(W, H);      // square scale
      const OX   = (W - S) * 0.5;      // horizontal offset to centre the square
      const OY   = (H - S) * 0.5;      // vertical offset
      const CX_S = OX + S * 0.5;       // screen-space center X
      const CY_S = OY + S * 0.5;       // screen-space center Y
      const windowR = S * 0.47;         // visible circular window radius (px)
      const clipR   = windowR * 0.970;  // the actual "glass" circle
      const clipR2  = clipR * clipR;

      // ── Trail fade — creates orbital ink trails (hypnotic smear) ──────────
      if (frameCount === 0) {
        ctx.fillStyle = 'rgb(248,245,240)';
        ctx.fillRect(0, 0, W, H);
      } else {
        // 0.92 opacity = 8% bleed → ~12 frame trail at 60fps = beautiful ghosting
        ctx.fillStyle = 'rgba(248,245,240,0.92)';
        ctx.fillRect(0, 0, W, H);
      }

      // Keep ONE functional circular window for all lenses
      ctx.save();
      ctx.beginPath();
      ctx.arc(CX_S, CY_S, clipR, 0, TWO_PI);
      ctx.clip();

      if (lensId === 'meaning') {
        renderMeaningMap(ctx, lexiconRef.current, clustersRef.current, W, H);
      } else {
        const quanta = state.quanta;
        const n = quanta.length;

        // ── World / Glyphs lens — ferrofluid ink ring ─────────────────────
        if (lensId === 'world' || lensId === 'glyphs') {
          const t = timeRef.current;
          
          // Pass 1: Draw ferrofluid connections between close particles
          ctx.lineCap = 'round';
          for (let i = 0; i < n; i++) {
            const q = quanta[i];
            const px = OX + q.x * S;
            const py = OY + q.y * S;
            const dsx = px - CX_S, dsy = py - CY_S;
            if (dsx * dsx + dsy * dsy > clipR2) continue;
            
            for (let j = i + 1; j < n; j++) {
              const q2 = quanta[j];
              const dx = q2.x - q.x, dy = q2.y - q.y;
              const d2 = dx * dx + dy * dy;
              const linkDist = 0.035;
              if (d2 > linkDist * linkDist) continue;
              
              const d = Math.sqrt(d2);
              const phaseSim = Math.cos(q.phase - q2.phase);
              if (phaseSim < 0.3) continue;
              
              const px2 = OX + q2.x * S;
              const py2 = OY + q2.y * S;
              const linkAlpha = (1 - d / linkDist) * phaseSim * 0.35;
              const coh2 = (q.coherence + q2.coherence) * 0.5;
              const dk = Math.round(10 + (1 - coh2) * 30);
              
              ctx.beginPath();
              ctx.moveTo(px, py);
              // Curved link (ferrofluid surface tension)
              const midX = (px + px2) * 0.5;
              const midY = (py + py2) * 0.5;
              const perpX = -(py2 - py) * 0.15 * Math.sin(t * 2 + i * 0.1);
              const perpY =  (px2 - px) * 0.15 * Math.sin(t * 2 + i * 0.1);
              ctx.quadraticCurveTo(midX + perpX, midY + perpY, px2, py2);
              ctx.strokeStyle = `rgba(${dk},${dk},${dk},${linkAlpha.toFixed(3)})`;
              ctx.lineWidth = 0.6 + coh2 * 0.8;
              ctx.stroke();
            }
          }

          // Pass 2: Draw particles with pulsing sizes
          for (let i = 0; i < n; i++) {
            const q = quanta[i];
            const px = OX + q.x * S;
            const py = OY + q.y * S;
            const dsx = px - CX_S, dsy = py - CY_S;
            if (dsx * dsx + dsy * dsy > clipR2) continue;

            const rNorm  = Math.sqrt(dsx * dsx + dsy * dsy) / clipR;
            const edgeFade = Math.max(0, 1 - rNorm * rNorm * 2.5);

            const coh = Math.max(0, Math.min(1, q.coherence));
            // Pulsing size based on phase
            const pulse = 1 + Math.sin(q.phase + t * 1.5) * 0.25 * coh;
            const size = Math.max(0.5, (1.6 + coh * 1.2) * pulse);
            const a    = Math.min(0.94, (0.42 + coh * 0.50 + q.ink * 0.10) * edgeFade);

            ctx.globalAlpha = a;

            const spd = Math.sqrt(q.vx * q.vx + q.vy * q.vy);
            const dk  = Math.round(6 + (1 - coh) * 42);
            ctx.fillStyle = `rgb(${dk},${dk},${dk})`;

            if (spd > 0.0005) {
              const len = Math.max(size, Math.min(size * 5, spd * S * 14));
              const nx = q.vx / spd, ny = q.vy / spd;
              ctx.save();
              ctx.strokeStyle = ctx.fillStyle;
              ctx.lineWidth = size * 1.8;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(px - nx * len * 0.25, py - ny * len * 0.25);
              ctx.lineTo(px + nx * len * 0.75, py + ny * len * 0.75);
              ctx.stroke();
              ctx.restore();
            } else {
              ctx.beginPath();
              ctx.arc(px, py, size, 0, TWO_PI);
              ctx.fill();
            }
          }
          ctx.globalAlpha = 1;
        }

        // ── Events lens — intent-colored particles ────────────────────────
        if (lensId === 'events') {
          for (const q of quanta) {
            const px = OX + q.x * S;
            const py = OY + q.y * S;
            const dsx = px - CX_S, dsy = py - CY_S;
            if (dsx * dsx + dsy * dsy > clipR2) continue;
            const coh = Math.max(0, q.coherence);
            const ab  = Math.abs(q.intent);
            const r = Math.round(30 + Math.max(0,  q.intent) * 200);
            const g = Math.round(20 + (1 - ab) * 100);
            const b = Math.round(30 + Math.max(0, -q.intent) * 220);
            ctx.globalAlpha = Math.min(0.9, 0.35 + coh * 0.55 + ab * 0.25);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.beginPath();
            ctx.arc(px, py, Math.max(0.5, 1.4 + coh * 0.8), 0, TWO_PI);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        // ── Map lens — density heatmap ────────────────────────────────────
        if (lensId === 'map') {
          // Ink-weight density into a 64×64 grid
          const RES  = 64;
          const grid = new Float32Array(RES * RES);
          for (const q of quanta) {
            const gx = Math.min(RES - 1, Math.max(0, Math.floor(q.x * RES)));
            const gy = Math.min(RES - 1, Math.max(0, Math.floor(q.y * RES)));
            grid[gy * RES + gx] += q.ink * (0.5 + Math.max(0, q.coherence) * 0.5);
          }
          let mx = 0.01;
          for (let k = 0; k < RES * RES; k++) if (grid[k] > mx) mx = grid[k];

          const cellS = S / RES;
          for (let gy = 0; gy < RES; gy++) {
            for (let gx = 0; gx < RES; gx++) {
              const v = grid[gy * RES + gx] / mx;
              if (v < 0.03) continue;
              const cx2 = OX + (gx + 0.5) * cellS;
              const cy2 = OY + (gy + 0.5) * cellS;
              const dd = (cx2 - CX_S) * (cx2 - CX_S) + (cy2 - CY_S) * (cy2 - CY_S);
              if (dd > clipR2) continue;
              // Black → teal → cyan color scale
              const r2 = Math.round(v < 0.5 ? v * 2 * 30 : 30 + (v - 0.5) * 2 * 60);
              const g2 = Math.round(v * 180);
              const b2 = Math.round(60 + v * 180);
              ctx.fillStyle = `rgb(${r2},${g2},${b2})`;
              ctx.globalAlpha = Math.min(0.95, v * 1.2);
              ctx.fillRect(cx2 - cellS * 0.5, cy2 - cellS * 0.5, cellS, cellS);
            }
          }
          ctx.globalAlpha = 1;
        }

        // ── Advanced lens — phase rainbow + coherence rings ───────────────
        if (lensId === 'phase') {
          for (const q of quanta) {
            const px = OX + q.x * S;
            const py = OY + q.y * S;
            const dsx = px - CX_S, dsy = py - CY_S;
            if (dsx * dsx + dsy * dsy > clipR2) continue;
            const coh = Math.max(0, q.coherence);
            // Hue: phase angle → rainbow; rotates slowly with world time
            const hue = Math.round(((q.phase / TWO_PI) * 360 + state.time * 18) % 360);
            const lit = Math.round(28 + coh * 38);
            ctx.globalAlpha = Math.max(0.05, 0.22 + coh * 0.72);
            ctx.fillStyle = `hsl(${hue},82%,${lit}%)`;
            ctx.beginPath();
            ctx.arc(px, py, Math.max(0.4, 1.2 + coh * 1.2), 0, TWO_PI);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

      }

      ctx.restore(); // end circular clip for lens content

      // ── Radial vignette — soft circular window ─────────────────────────
      const vig = ctx.createRadialGradient(CX_S, CY_S, windowR * 0.72, CX_S, CY_S, windowR * 1.02);
      vig.addColorStop(0,    'rgba(248,245,240,0)');
      vig.addColorStop(0.6,  'rgba(248,245,240,0.04)');
      vig.addColorStop(0.84, 'rgba(248,245,240,0.75)');
      vig.addColorStop(1.0,  'rgba(248,245,240,0.99)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      // ── Alien glass border ──────────────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(CX_S, CY_S, clipR, 0, TWO_PI);
      ctx.strokeStyle = 'rgba(140,130,118,0.20)';
      ctx.lineWidth   = 1.2;
      ctx.stroke();
      ctx.restore();

      // ── Active GlyphAct rings (always clipped to the window) ───────────
      if (actsRef.current.length > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(CX_S, CY_S, clipR, 0, TWO_PI);
        ctx.clip();
        for (const act of actsRef.current) {
          const opInfo = OPERATOR_LABELS[act.kind];
          ctx.save();
          ctx.strokeStyle = opInfo.color;
          ctx.lineWidth   = 1.5;
          ctx.globalAlpha = Math.min(0.8, (act.duration / 8) * 0.7);
          ctx.setLineDash([4, 4]);
          const ax = OX + act.targetX * S;
          const ay = OY + act.targetY * S;
          ctx.beginPath();
          ctx.arc(ax, ay, Math.max(1, act.radius * S), 0, TWO_PI);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
        ctx.restore();
      }

      // ── Glyph overlay: animate continuously ────────────────────────────
      const streamArr = glyphStreamRef.current;
      if (streamArr.length > 0) {
        const spec = streamArr[streamArr.length - 1];
        const gCtx = glyphOver.getContext('2d')!;
        gCtx.clearRect(0, 0, glyphOver.width, glyphOver.height);
        const gR = Math.min(glyphOver.width, glyphOver.height) * 0.44;
        drawGlyph(gCtx, spec, glyphOver.width / 2, glyphOver.height / 2, gR, {
          alpha: 0.96, animated: true, time: timeRef.current,
        });
        lastGlyphIdRef.current = spec.id;
      }

      frameCount++;
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]); // eslint-disable-line

  // Keep glyphStream accessible from RAF
  const glyphStreamRef = useRef<GlyphSpec[]>([]);
  useEffect(() => { glyphStreamRef.current = glyphStream; }, [glyphStream]);

  // ── Params handler ────────────────────────────────────────────────────────
  const handleParams = useCallback((update: Partial<LanguageParams>) => {
    setParams(p => { const next = { ...p, ...update }; paramsRef.current = next; return next; });
  }, []);

  const handlePreset = useCallback((preset: LanguagePreset) => {
    const next = { ...preset.params };
    setParams(next); paramsRef.current = next;
    worldRef.current = createWorld(next);
    actsRef.current  = [];
    setGlyphStream([]);
  }, []);

  const handleReset = useCallback(() => {
    worldRef.current = createWorld(paramsRef.current);
    actsRef.current  = [];
    setGlyphStream([]);
    setEvents([]);
    macroTimer.current = 0;
  }, []);

  const handleAccept = useCallback((glyphId: string) => {
    setLexicon(prev => {
      const next = prev.map(e => e.glyphId === glyphId ? { ...e, status: 'accepted' as const, lastUpdated: Date.now() } : e);
      saveLexicon(next); return next;
    });
  }, []);

  const handleEdit = useCallback((glyphId: string, field: 'gloss' | 'definition' | 'usage', value: string) => {
    setLexicon(prev => {
      const next = prev.map(e => e.glyphId === glyphId ? { ...e, [field]: value, lastUpdated: Date.now() } : e);
      saveLexicon(next); return next;
    });
  }, []);

  const handleLink = useCallback((glyphId: string, targetGloss: string) => {
    setLexicon(prev => {
      const next = prev.map(e => e.glyphId === glyphId
        ? { ...e, contrasts: [...new Set([...e.contrasts, targetGloss])], lastUpdated: Date.now() }
        : e);
      saveLexicon(next); return next;
    });
  }, []);

  const handleConfigKey = useCallback((key: string) => {
    if (typeof window !== 'undefined') {
      (window as any).__APP_CONFIG__ = { ...(window as any).__APP_CONFIG__, OPENAI_API_KEY: key };
    }
    setLlmStatus({ state: 'idle' });
  }, []);

  const selectedEntry = selectedSpec
    ? lexiconRef.current.find(e => e.glyphId === selectedSpec.id) ?? null
    : null;

  // ── Render ────────────────────────────────────────────────────────────────
  if (!active) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, top: 38,
      display: 'flex', flexDirection: 'column',
      background: '#040210',
      fontFamily: 'system-ui, sans-serif',
      zIndex: 1,
    }}>
      {/* Main layout row */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Controls sidebar */}
        <ControlsBar
          params={params}
          mode={mode}
          lens={lens}
          running={running}
          onParams={handleParams}
          onMode={(m) => { setMode(m); modeRef.current = m; }}
          onLens={(l) => { setLens(l); lensRef.current = l; }}
          onReset={handleReset}
          onOpenLexicon={() => setShowLexicon(true)}
          onPreset={handlePreset}
          onToggleRunning={() => setRunning(r => { const n = !r; runningRef.current = n; return n; })}
        />

        {/* Canvas area */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Main simulation canvas — position:absolute;inset:0 guarantees no CSS stretch */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#f8f5f0' }}>
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              style={{
                position: 'absolute', inset: 0,
                display: 'block',
                cursor: mode === 'speak' ? 'crosshair' : 'default',
              }}
              onClick={handleCanvasClick}
            />

            {/* Current glyph large — top-right overlay — blurs away from frosted glass as coherence rises */}
            {(() => {
              const blurPx = Math.max(0, Math.pow(1 - currentCoherence, 1.8) * 14).toFixed(1);
              return (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  borderRadius: 14, overflow: 'hidden',
                  border: '1px solid rgba(180,170,155,0.4)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                  transition: 'filter 0.8s ease',
                  filter: `blur(${blurPx}px)`,
                }}>
                  <canvas
                    ref={glyphOverRef}
                    width={140}
                    height={140}
                    style={{ display: 'block' }}
                  />
                  {metrics && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'rgba(250,248,244,0.9)',
                      textAlign: 'center', fontSize: 7, color: 'rgba(60,45,30,0.5)',
                      letterSpacing: '0.1em', padding: '2px 0 3px',
                    }}>
                      sync {metrics.sync.toFixed(2)} · coh {metrics.coherence.toFixed(2)}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Speak hint */}
            {mode === 'speak' && (
              <div style={{
                position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                padding: '4px 14px', borderRadius: 20,
                background: 'rgba(255,200,60,0.1)', border: '1px solid rgba(255,200,60,0.25)',
                fontSize: 8, color: 'rgba(255,220,120,0.8)', letterSpacing: '0.12em',
                textTransform: 'uppercase', pointerEvents: 'none',
              }}>
                SPEAK — clique no canvas para emitir • duplo-clique no glifo no stream
              </div>
            )}

            {/* Train prompt */}
            {mode === 'train' && trainEvent && (
              <TrainPrompt
                spec={trainEvent.spec}
                question={trainEvent.question}
                onChoice={handleTrainChoice}
                onSkip={() => setTrainEvent(null)}
              />
            )}

            {/* Metrics mini-bar */}
            {metrics && (
              <div style={{
                position: 'absolute', bottom: 8, left: 8,
                display: 'flex', flexDirection: 'column', gap: 2, pointerEvents: 'none',
              }}>
                {[
                  { label: 'sync',   v: metrics.sync,        c: '#60c0ff' },
                  { label: 'cohere', v: metrics.coherence,   c: '#a070ff' },
                  { label: 'loop',   v: metrics.loopDensity, c: '#ffd060' },
                  { label: 'novel',  v: metrics.novelty,     c: '#ff8060' },
                ].map(({ label, v, c }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', width: 36, textAlign: 'right', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                      {label}
                    </span>
                    <div style={{ width: 50, height: 2.5, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                      <div style={{ width: `${Math.min(100, v * 100)}%`, height: '100%', background: c, borderRadius: 2, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Lens badge */}
            <div style={{
              position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
              padding: '2px 10px', borderRadius: 10,
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)',
              fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em', textTransform: 'uppercase',
              pointerEvents: 'none',
            }}>
              {lens} · {params.preset.replace('_', ' ')} · {params.agentCount} quanta
            </div>
          </div>

          {/* Glyph Stream bar */}
          <GlyphStream
            glyphs={glyphStream}
            lexicon={lexicon}
            selectedId={selectedSpec?.id ?? null}
            onSelect={setSelectedSpec}
            onSpeak={(spec) => handleSpeak(spec)}
          />
        </div>

        {/* Right panel: MentorPanel + optional NodeInspector */}
        <div style={{
          width: 210, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(4,2,14,0.95)',
          overflowY: 'auto', scrollbarWidth: 'none',
          padding: '8px 0',
          gap: 0,
        }}>
          <MentorPanel
            status={llmStatus}
            events={events}
            lastRationale={lastRationale}
            onConfigKey={handleConfigKey}
          />

          {/* LLM cluster button */}
          {lexicon.length >= 3 && (
            <div style={{ padding: '8px 10px 4px' }}>
              <button title="Executar"
                onClick={handleCluster}
                disabled={llmStatus.state === 'loading'}
                style={{
                  width: '100%', fontSize: 8, padding: '4px',
                  borderRadius: 5, cursor: 'pointer',
                  background: 'rgba(160,80,255,0.1)', border: '1px solid rgba(160,80,255,0.2)',
                  color: 'rgba(200,160,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase',
                  opacity: llmStatus.state === 'loading' ? 0.5 : 1,
                }}>
                Clusterizar Lexicon
              </button>
            </div>
          )}

          {/* Metrics panel */}
          {metrics && (
            <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 4 }}>
              <div style={{ fontSize: 7, letterSpacing: '0.14em', color: 'rgba(160,80,255,0.45)', textTransform: 'uppercase', marginBottom: 5 }}>
                Lexicon
              </div>
              <div style={{ fontSize: 9, color: 'rgba(200,190,180,0.6)', lineHeight: 1.7 }}>
                <div>{metrics.lexiconSize} verbetes</div>
                <div>{Math.round(metrics.lexiconHealth * 100)}% aceitos</div>
                <div>conf média {metrics.avgConfidence.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lexicon drawer */}
      {showLexicon && (
        <LexiconDrawer
          entries={lexicon}
          clusters={clusters}
          sessions={sessions}
          onSelect={(entry) => {
            setSelectedSpec(entry.miniGlyphSpec);
            setShowLexicon(false);
          }}
          onClose={() => setShowLexicon(false)}
          onImport={(imported) => {
            setLexicon(imported);
            saveLexicon(imported);
          }}
        />
      )}

      {/* NodeInspector */}
      {selectedSpec && (
        <NodeInspector
          spec={selectedSpec}
          entry={selectedEntry}
          allEntries={lexicon}
          llmLoading={llmStatus.state === 'loading'}
          onAskLLM={handleAskLLM}
          onAccept={handleAccept}
          onEdit={handleEdit}
          onLink={handleLink}
          onClose={() => setSelectedSpec(null)}
          onSpeak={handleSpeak}
        />
      )}
    </div>
  );
}

// ── MeaningMap renderer (canvas) ──────────────────────────────────────────────
function renderMeaningMap(
  ctx: CanvasRenderingContext2D,
  lexicon: LexiconEntry[],
  clusters: LexiconCluster[],
  W: number, H: number,
): void {
  if (lexicon.length === 0) return;

  // Position nodes in a spiral/force layout (simple grid for now)
  const n = Math.min(lexicon.length, 60);
  const entries = lexicon.slice(0, n);
  const cols = Math.ceil(Math.sqrt(n));
  const spacing = Math.min(W, H) / (cols + 1);
  const startX = (W - (cols - 1) * spacing) / 2;
  const startY = (H - (Math.ceil(n / cols) - 1) * spacing) / 2;

  const clusterColorMap = new Map<string, string>();
  const COLORS = ['#a070ff', '#60c0ff', '#ff8060', '#80ff80', '#ffd060'];
  clusters.forEach((cl, i) => clusterColorMap.set(cl.id, COLORS[i % COLORS.length]));

  // Draw edges (similarity > threshold)
  const SIM_THRESH = 0.75;
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const sim = cosineSimilarity(entries[i].embedding, entries[j].embedding);
      if (sim < SIM_THRESH) continue;
      const xi = startX + (i % cols) * spacing;
      const yi = startY + Math.floor(i / cols) * spacing;
      const xj = startX + (j % cols) * spacing;
      const yj = startY + Math.floor(j / cols) * spacing;
      ctx.save();
      ctx.strokeStyle = 'rgba(160,80,255,0.2)';
      ctx.lineWidth = (sim - SIM_THRESH) * 4;
      ctx.beginPath();
      ctx.moveTo(xi, yi); ctx.lineTo(xj, yj);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Draw nodes
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const x = startX + (i % cols) * spacing;
    const y = startY + Math.floor(i / cols) * spacing;
    const r = 18 + entry.confidence * 8;
    const color = clusterColorMap.get(entry.clusterId) ?? 'rgba(200,180,255,0.4)';

    drawGlyph(ctx, entry.miniGlyphSpec, x, y, r, {
      alpha: 0.55 + entry.confidence * 0.4,
      glow: true,
      glowColor: color + '66',
      strokeColor: color,
    });

    if (entry.gloss) {
      ctx.fillStyle = 'rgba(230,220,210,0.45)';
      ctx.font = '7px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(entry.gloss.slice(0, 10), x, y + r + 9);
    }
  }
}

// ── Train Prompt overlay ──────────────────────────────────────────────────────
function TrainPrompt({
  spec, question, onChoice, onSkip,
}: {
  spec: GlyphSpec; question: string;
  onChoice: (c: TrainChoice) => void; onSkip: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = useRef(0);
  const rafRef = useRef(0);
  const SZ = 80;

  useEffect(() => {
    let alive = true;
    const go = () => {
      if (!alive) return;
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, SZ, SZ);
        t.current += 0.02;
        drawGlyph(ctx, spec, SZ / 2, SZ / 2, SZ * 0.44, {
          alpha: 0.9, glow: true, animated: true, time: t.current,
        });
      }
      rafRef.current = requestAnimationFrame(go);
    };
    go();
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [spec]);

  const CHOICES: TrainChoice[] = ['UNIR', 'CORTAR', 'ABRIR', 'SILENCIAR'];
  const COLORS: Record<TrainChoice, string> = {
    UNIR: '#60c0ff', CORTAR: '#ff8060', ABRIR: '#80ff80', SILENCIAR: '#a070ff',
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(4,2,12,0.7)', backdropFilter: 'blur(6px)', zIndex: 20,
    }}>
      <div style={{
        background: 'rgba(8,6,20,0.96)', border: '1px solid rgba(160,80,255,0.3)',
        borderRadius: 14, padding: '20px 24px', maxWidth: 340, textAlign: 'center',
      }}>
        <div style={{ fontSize: 7, color: 'rgba(160,80,255,0.5)', letterSpacing: '0.16em',
          textTransform: 'uppercase', marginBottom: 10 }}>
          Training · Active Learning
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <canvas ref={canvasRef} width={SZ} height={SZ}
            style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 8 }} />
        </div>
        <div style={{ fontSize: 10, color: 'rgba(230,220,210,0.85)', marginBottom: 14, lineHeight: 1.5 }}>
          {question}
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          {CHOICES.map(ch => (
            <button title={ch} key={ch}
              onClick={() => onChoice(ch)}
              style={{
                fontSize: 9, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                background: `${COLORS[ch]}18`, border: `1px solid ${COLORS[ch]}55`,
                color: COLORS[ch], letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
              {ch}
            </button>
          ))}
        </div>
        <button title="Pular" onClick={onSkip} style={{ marginTop: 12, fontSize: 8, background: 'none',
          border: 'none', cursor: 'pointer', color: 'rgba(200,190,180,0.3)', letterSpacing: '0.1em' }}>
          PULAR
        </button>
      </div>
    </div>
  );
}