import React, { useEffect, useRef, useState, useCallback } from 'react';
import type {
  MPParams, MPMetrics, MPOverlay, MPToolId, MPTab,
  PlateauSnapshot, RhizomeEdge,
} from '../../sim/milplatos/milplatosTypes';
import {
  createDefaultParams, computeMacroDial, macroToParams, computeK,
  createMPMetrics, MP_TOOLS,
} from '../../sim/milplatos/milplatosTypes';
import {
  createMPWorld, stepMPWorld, applyIntervention, computeMPMetrics, buildRhizomeEdges,
} from '../../sim/milplatos/milplatosEngine';
import { renderMPWorld } from '../../sim/milplatos/milplatosRenderer';
import type { MPViewport } from '../../sim/milplatos/milplatosRenderer';
import { MP_PRESETS } from '../../sim/milplatos/milplatosPresets';
import { Renderer3D, DEFAULT_VIEW3D } from '../../render/Renderer3D';
import type { Particle3D, Link3D, View3DConfig, Camera3D } from '../../render/Renderer3D';

const MONO = "'IBM Plex Mono', monospace";
const DOTO = "'Doto', monospace";
const ACCENT = '#6366f1';
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const uid = () => Math.random().toString(36).slice(2, 8);

const CSO_PARAMS: { key: keyof MPParams; label: string; color: string }[] = [
  { key: 'organismo',       label: 'Organismo',       color: '#f472b6' },
  { key: 'intensidade',     label: 'Intensidade',     color: '#fbbf24' },
  { key: 'hierarquia',      label: 'Hierarquia',      color: '#fb923c' },
  { key: 'rigidez',         label: 'Rigidez',         color: '#ef4444' },
  { key: 'desorganizacao',  label: 'Desorganizacao',  color: '#a78bfa' },
  { key: 'crueldade',       label: 'Crueldade',       color: '#dc2626' },
  { key: 'antiHabito',      label: 'Anti-habito',     color: '#818cf8' },
];

const RIZOMA_PARAMS: { key: keyof MPParams; label: string; color: string }[] = [
  { key: 'multiplicidade',      label: 'Multiplicidade',      color: '#34d399' },
  { key: 'linhasDeFuga',        label: 'Linhas de Fuga',      color: '#a78bfa' },
  { key: 'territorializacao',   label: 'Territorializacao',   color: '#f97316' },
  { key: 'reterritorializacao', label: 'Reterritorializacao', color: '#fb923c' },
  { key: 'hubs',                label: 'Hubs',                color: '#60a5fa' },
  { key: 'esquecimento',        label: 'Esquecimento',        color: '#94a3b8' },
];

const SHARED_PARAMS: { key: keyof MPParams; label: string; color: string }[] = [
  { key: 'ruido',     label: 'Ruido',     color: '#38bdf8' },
  { key: 'densidade', label: 'Densidade', color: '#6ee7b7' },
];

const OVERLAY_DEFS: { key: MPOverlay; label: string }[] = [
  { key: 'cso',             label: 'CsO' },
  { key: 'afetos',          label: 'Afetos' },
  { key: 'rizoma',          label: 'Rizoma' },
  { key: 'heatConsistency', label: 'Consistencia' },
  { key: 'heatTerritory',   label: 'Territorio' },
  { key: 'connections',     label: 'Conexoes' },
  { key: 'flights',         label: 'Fugas' },
];

type InspectedElement =
  | { type: 'afeto'; x: number; y: number; intensity: number; hue: number; life: number }
  | { type: 'orgao'; id: number; x: number; y: number; importance: number; health: number; nConns: number; hue: number }
  | { type: 'no-rizoma'; id: number; x: number; y: number; heat: number; territory: number; isEntry: boolean; nConns: number }
  | { type: 'zona'; x: number; y: number; strength: number; hue: number; radius: number };

const EL_INFO: Record<string, { title: string; desc: string; color: string }> = {
  afeto: { title: 'AFETO (Intensidade)', desc: 'Particula de intensidade que percorre o CsO. Fluxo de desejo sem organizacao.', color: '#fbbf24' },
  orgao: { title: 'ORGAO (Estrato)', desc: 'No da hierarquia organica. Conectado por springs. Saude diminui com desorganizacao.', color: '#60a5fa' },
  'no-rizoma': { title: 'NO RIZOMA (Multiplicidade)', desc: 'Ponto do grafo acentrico. Diamantes verdes = entradas. Heat = atividade local.', color: '#34d399' },
  zona: { title: 'ZONA DE AFETO', desc: 'Campo movel que modula intensidades. Atrai afetos, mistura hues, deposita consistencia.', color: '#a78bfa' },
};

const SPEED_OPTS = [0.1, 0.25, 0.5, 1, 2, 3];

function hslToRGB(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return [r + m, g + m, b + m];
}

function worldTo3D(world: any, overlays: Set<MPOverlay>): { particles: Particle3D[]; links: Link3D[] } {
  const particles: Particle3D[] = [];
  const links: Link3D[] = [];
  const indexMap = new Map<string, number>();
  if (overlays.has('cso') || overlays.has('connections')) {
    for (const o of world.cso.organs) {
      const idx = particles.length;
      indexMap.set('o' + o.id, idx);
      const [r, g, b] = hslToRGB(o.hue, 0.5, 0.55);
      particles.push({ nx: o.x, ny: o.y, z: o.importance * 0.5, r, g, b });
    }
    for (const o of world.cso.organs) {
      const ai = indexMap.get('o' + o.id);
      if (ai === undefined) continue;
      for (const cid of o.connections) {
        const bi = indexMap.get('o' + cid);
        if (bi !== undefined && ai < bi) links.push({ a: ai, b: bi });
      }
    }
  }
  if (overlays.has('afetos')) {
    for (const a of world.cso.affects) {
      const [r, g, b] = hslToRGB(a.hue, 0.6, 0.5 + a.intensity * 0.15);
      particles.push({ nx: a.x, ny: a.y, z: a.intensity * 0.3, r, g, b });
    }
  }
  if (overlays.has('rizoma')) {
    for (const n of world.rhizome.nodes) {
      const idx = particles.length;
      indexMap.set('r' + n.id, idx);
      const [r, g, b] = hslToRGB(160 + n.heat * 40, 0.6, 0.45 + n.heat * 0.2);
      particles.push({ nx: n.x, ny: n.y, z: n.heat * 0.4 + 0.05, r, g, b });
    }
    const edges = buildRhizomeEdges(world.rhizome);
    for (const e of edges) {
      const ai = indexMap.get('r' + e.from);
      const bi = indexMap.get('r' + e.to);
      if (ai !== undefined && bi !== undefined) links.push({ a: ai, b: bi });
    }
  }
  return { particles, links };
}

export const MilPlatosLab: React.FC<{ active: boolean }> = ({ active }) => {
  const [running, setRunning] = useState(true);
  const [params, setParams] = useState<MPParams>(createDefaultParams);
  const [tab, setTab] = useState<MPTab>('cso');
  const [activeTool, setActiveTool] = useState<MPToolId>('select');
  const [overlays, setOverlays] = useState<Set<MPOverlay>>(new Set(['cso', 'afetos', 'rizoma', 'connections']));
  const [metrics, setMetrics] = useState<MPMetrics>(createMPMetrics);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [inspected, setInspected] = useState<InspectedElement | null>(null);
  const [presetsExpanded, setPresetsExpanded] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [legendPos, setLegendPos] = useState<{ x: number; y: number } | null>(null);
  const [snapshots, setSnapshots] = useState<PlateauSnapshot[]>(() => {
    try { const r = localStorage.getItem('mp_snapshots'); return r ? JSON.parse(r) : []; }
    catch { return []; }
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas3dRef = useRef<HTMLCanvasElement>(null);
  const renderer3dRef = useRef<Renderer3D | null>(null);
  const view3dRef = useRef<View3DConfig>({
    ...DEFAULT_VIEW3D, showTrails: true, trailLen: 8, showBonds: true, ptSize: 4,
    camera: { yaw: 0.55, pitch: 0.48, dist: 3.0, panX: 0, panY: 0 },
  });
  const worldRef = useRef(createMPWorld(createDefaultParams()));
  const paramsRef = useRef(params);
  const runningRef = useRef(running);
  const activeToolRef = useRef(activeTool);
  const overlaysRef = useRef(overlays);
  const rhizomeEdgesRef = useRef<RhizomeEdge[]>([]);
  const metricsRef = useRef(metrics);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const fpsFrames = useRef<number[]>([]);
  const metricsTimer = useRef(0);
  const rhizomeTimer = useRef(0);
  const viewportRef = useRef<MPViewport>({ zoom: 1, panX: 0, panY: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, vpx: 0, vpy: 0 });
  const speedRef = useRef(speed);
  const viewModeRef = useRef(viewMode);
  const legendDragRef = useRef<{ dragging: boolean; ox: number; oy: number }>({ dragging: false, ox: 0, oy: 0 });
  const dragTargetRef = useRef<{ type: 'organ' | 'rnode' | 'zone'; idx: number } | null>(null);
  const [showJornada, setShowJornada] = useState(false);
  const [jornadaStep, setJornadaStep] = useState(0);
  const [jornadaAnswers, setJornadaAnswers] = useState<number[]>([]);

  paramsRef.current = params;
  runningRef.current = running;
  activeToolRef.current = activeTool;
  overlaysRef.current = overlays;
  speedRef.current = speed;
  viewModeRef.current = viewMode;

  const resetWorld = useCallback((p: MPParams) => { worldRef.current = createMPWorld(p); rhizomeEdgesRef.current = []; setInspected(null); }, []);
  const applyPreset = useCallback((presetId: string) => { const preset = MP_PRESETS.find(p => p.id === presetId); if (!preset) return; setParams({ ...preset.params }); setOverlays(new Set(preset.overlays)); setSelectedPreset(presetId); resetWorld(preset.params); }, [resetWorld]);
  const macroValue = computeMacroDial(params);
  const handleMacro = useCallback((v: number) => { setParams(macroToParams(v)); setSelectedPreset(''); }, []);
  const toggleOverlay = useCallback((key: MPOverlay) => { setOverlays(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; }); }, []);

  const canvasToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const rect = canvas.getBoundingClientRect(); const vp = viewportRef.current;
    const cx = canvas.width * 0.5 + vp.panX; const cy = canvas.height * 0.5 + vp.panY;
    const scale = Math.min(canvas.width, canvas.height) * 0.47 * vp.zoom;
    return { wx: (clientX - rect.left - cx) / scale, wy: (clientY - rect.top - cy) / scale };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (viewModeRef.current === '3d') { const cam = view3dRef.current.camera; cam.dist = Math.max(1, Math.min(10, cam.dist + (e.deltaY > 0 ? 0.2 : -0.2))); return; }
    const vp = viewportRef.current; const factor = e.deltaY > 0 ? 0.92 : 1.08;
    const newZoom = Math.max(0.25, Math.min(5, vp.zoom * factor));
    const canvas = canvasRef.current;
    if (canvas) { const rect = canvas.getBoundingClientRect(); const mx = e.clientX - rect.left - canvas.width * 0.5; const my = e.clientY - rect.top - canvas.height * 0.5; const zr = newZoom / vp.zoom; vp.panX = mx - (mx - vp.panX) * zr; vp.panY = my - (my - vp.panY) * zr; }
    vp.zoom = newZoom; setZoomLevel(newZoom);
  }, []);

  const inspectAt = useCallback((wx: number, wy: number) => {
    const w = worldRef.current; let bestD = 0.08; let result: InspectedElement | null = null;
    for (const o of w.cso.organs) { const d = Math.sqrt((o.x - wx) ** 2 + (o.y - wy) ** 2); if (d < bestD) { bestD = d; result = { type: 'orgao', id: o.id, x: o.x, y: o.y, importance: o.importance, health: o.health, nConns: o.connections.length, hue: o.hue }; } }
    for (const n of w.rhizome.nodes) { const d = Math.sqrt((n.x - wx) ** 2 + (n.y - wy) ** 2); if (d < bestD) { bestD = d; result = { type: 'no-rizoma', id: n.id, x: n.x, y: n.y, heat: n.heat, territory: n.territory, isEntry: n.isEntry, nConns: n.connections.length }; } }
    for (const z of w.cso.zones) { const d = Math.sqrt((z.x - wx) ** 2 + (z.y - wy) ** 2); if (d < z.radius && d < bestD + 0.05) { result = { type: 'zona', x: z.x, y: z.y, strength: z.strength, hue: z.hue, radius: z.radius }; bestD = d; } }
    for (const a of w.cso.affects) { const d = Math.sqrt((a.x - wx) ** 2 + (a.y - wy) ** 2); if (d < Math.min(bestD, 0.04)) { bestD = d; result = { type: 'afeto', x: a.x, y: a.y, intensity: a.intensity, hue: a.hue, life: a.life }; } }
    setInspected(result);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault(); isPanningRef.current = true;
      if (viewModeRef.current === '3d') { panStartRef.current = { x: e.clientX, y: e.clientY, vpx: view3dRef.current.camera.yaw, vpy: view3dRef.current.camera.pitch }; }
      else { const vp = viewportRef.current; panStartRef.current = { x: e.clientX, y: e.clientY, vpx: vp.panX, vpy: vp.panY }; }
      return;
    }
    if (viewModeRef.current === '3d') return;
    const coords = canvasToWorld(e.clientX, e.clientY); if (!coords) return;
    const tool = activeToolRef.current;
    if (tool === 'select') { inspectAt(coords.wx, coords.wy); return; }
    if (tool === 'arrastar') {
      const w = worldRef.current; let bestD = 0.1; let target: typeof dragTargetRef.current = null;
      for (let i = 0; i < w.cso.organs.length; i++) { const o = w.cso.organs[i]; const d = Math.sqrt((o.x - coords.wx) ** 2 + (o.y - coords.wy) ** 2); if (d < bestD) { bestD = d; target = { type: 'organ', idx: i }; } }
      for (let i = 0; i < w.rhizome.nodes.length; i++) { const n = w.rhizome.nodes[i]; const d = Math.sqrt((n.x - coords.wx) ** 2 + (n.y - coords.wy) ** 2); if (d < bestD) { bestD = d; target = { type: 'rnode', idx: i }; } }
      for (let i = 0; i < w.cso.zones.length; i++) { const z = w.cso.zones[i]; const d = Math.sqrt((z.x - coords.wx) ** 2 + (z.y - coords.wy) ** 2); if (d < bestD) { bestD = d; target = { type: 'zone', idx: i }; } }
      dragTargetRef.current = target;
      return;
    }
    applyIntervention(worldRef.current, tool, coords.wx, coords.wy, paramsRef.current, 0.15);
  }, [canvasToWorld, inspectAt]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      if (viewModeRef.current === '3d') { const cam = view3dRef.current.camera; cam.yaw = panStartRef.current.vpx + (e.clientX - panStartRef.current.x) * 0.005; cam.pitch = Math.max(0.1, Math.min(1.4, panStartRef.current.vpy - (e.clientY - panStartRef.current.y) * 0.005)); }
      else { const vp = viewportRef.current; vp.panX = panStartRef.current.vpx + (e.clientX - panStartRef.current.x); vp.panY = panStartRef.current.vpy + (e.clientY - panStartRef.current.y); }
      return;
    }
    if (e.buttons !== 1 || viewModeRef.current === '3d') return;
    const tool = activeToolRef.current; if (tool === 'select') return;
    if (tool === 'arrastar' && dragTargetRef.current) {
      const coords2 = canvasToWorld(e.clientX, e.clientY); if (!coords2) return;
      const w = worldRef.current; const t = dragTargetRef.current;
      if (t.type === 'organ' && w.cso.organs[t.idx]) { w.cso.organs[t.idx].x = coords2.wx; w.cso.organs[t.idx].y = coords2.wy; w.cso.organs[t.idx].vx = 0; w.cso.organs[t.idx].vy = 0; }
      else if (t.type === 'rnode' && w.rhizome.nodes[t.idx]) { w.rhizome.nodes[t.idx].x = coords2.wx; w.rhizome.nodes[t.idx].y = coords2.wy; w.rhizome.nodes[t.idx].vx = 0; w.rhizome.nodes[t.idx].vy = 0; }
      else if (t.type === 'zone' && w.cso.zones[t.idx]) { w.cso.zones[t.idx].x = coords2.wx; w.cso.zones[t.idx].y = coords2.wy; }
      return;
    }
    const coords = canvasToWorld(e.clientX, e.clientY); if (!coords) return;
    applyIntervention(worldRef.current, tool, coords.wx, coords.wy, paramsRef.current, 0.15);
  }, [canvasToWorld]);

  const handleMouseUp = useCallback(() => { isPanningRef.current = false; dragTargetRef.current = null; }, []);
  const captureSnapshot = useCallback(() => { const m = metricsRef.current; const snap: PlateauSnapshot = { id: uid(), label: m.plateauLabel, timestamp: Date.now(), params: { ...paramsRef.current }, K: m.K, metrics: { ...m } }; setSnapshots(prev => { const upd = [snap, ...prev].slice(0, 6); localStorage.setItem('mp_snapshots', JSON.stringify(upd)); return upd; }); }, []);
  const loadSnapshot = useCallback((s: PlateauSnapshot) => { setParams({ ...s.params }); setSelectedPreset(''); }, []);
  const resetView = useCallback(() => { viewportRef.current = { zoom: 1, panX: 0, panY: 0 }; setZoomLevel(1); }, []);

  const JORNADA_QS = [
    { q: 'Como voce se sente em relacao a estrutura e ordem na sua vida?', low: 'Caos total', high: 'Tudo organizado', params: ['organismo', 'hierarquia'] },
    { q: 'Qual a intensidade dos seus sentimentos agora?', low: 'Amortecido', high: 'Muito intenso', params: ['intensidade', 'crueldade'] },
    { q: 'Quanto desejo de romper padroes voce sente?', low: 'Nenhum', high: 'Quero destruir tudo', params: ['desorganizacao', 'antiHabito'] },
    { q: 'Como voce se sente em relacao a rigidez das suas conexoes?', low: 'Tudo fluido', high: 'Muito rigido', params: ['rigidez'] },
    { q: 'Quanta vontade de fugir, de escapar voce sente?', low: 'Estou bem aqui', high: 'Preciso sair', params: ['linhasDeFuga'] },
    { q: 'Quao conectado(a) voce se sente com diferentes mundos/pessoas?', low: 'Isolado', high: 'Hiperconectado', params: ['multiplicidade', 'hubs'] },
    { q: 'Quanto territorio voce quer marcar, defender?', low: 'Sou nomade', high: 'Defendo meu espaco', params: ['territorializacao', 'reterritorializacao'] },
    { q: 'Quanta turbulencia, ruido mental voce sente?', low: 'Mente clara', high: 'Muito ruido', params: ['ruido'] },
    { q: 'Quao povoado e o seu mundo interno?', low: 'Vazio', high: 'Transbordando', params: ['densidade'] },
    { q: 'Quanto voce quer esquecer, deixar ir?', low: 'Guardo tudo', high: 'Quero apagar', params: ['esquecimento'] },
  ];

  const finishJornada = useCallback(() => {
    const p = createDefaultParams();
    const answers = jornadaAnswers;
    const qs = JORNADA_QS;
    for (let i = 0; i < qs.length && i < answers.length; i++) {
      const v = answers[i];
      for (const key of qs[i].params) {
        (p as any)[key] = v;
      }
    }
    setParams(p);
    setSelectedPreset('');
    resetWorld(p);
    setShowJornada(false);
    setJornadaStep(0);
    setJornadaAnswers([]);
  }, [jornadaAnswers, resetWorld]);


  const onLegendMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); const el = e.currentTarget as HTMLElement; const rect = el.getBoundingClientRect();
    legendDragRef.current = { dragging: true, ox: e.clientX - rect.left, oy: e.clientY - rect.top };
    const onMove = (ev: MouseEvent) => { if (!legendDragRef.current.dragging) return; setLegendPos({ x: ev.clientX - legendDragRef.current.ox, y: ev.clientY - legendDragRef.current.oy }); };
    const onUp = () => { legendDragRef.current.dragging = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }, []);

  useEffect(() => { if (!active || viewMode !== '3d') return; const c = canvas3dRef.current; if (!c) return; if (!renderer3dRef.current) renderer3dRef.current = new Renderer3D(c); const par = c.parentElement; if (par) renderer3dRef.current.resize(par.clientWidth, par.clientHeight); }, [active, viewMode]);

  useEffect(() => {
    if (!active) return; let cancelled = false; lastTimeRef.current = performance.now();
    const loop = (now: number) => {
      if (cancelled) return; const raw = now - lastTimeRef.current; lastTimeRef.current = now;
      const dt = Math.min(raw * 0.001, 0.04) * speedRef.current;
      fpsFrames.current.push(raw); if (fpsFrames.current.length > 60) fpsFrames.current.shift();
      if (runningRef.current) stepMPWorld(worldRef.current, paramsRef.current, dt);
      metricsTimer.current += raw;
      if (metricsTimer.current > 125) { metricsTimer.current = 0; const avg = fpsFrames.current.reduce((a, b) => a + b, 0) / fpsFrames.current.length; const fps = avg > 0 ? 1000 / avg : 60; const m = computeMPMetrics(worldRef.current, paramsRef.current, fps); metricsRef.current = m; setMetrics(m); }
      rhizomeTimer.current += raw;
      if (rhizomeTimer.current > 200) { rhizomeTimer.current = 0; if (overlaysRef.current.has('rizoma') || overlaysRef.current.has('flights')) { rhizomeEdgesRef.current = buildRhizomeEdges(worldRef.current.rhizome); } }
      if (viewModeRef.current === '2d') {
        const canvas = canvasRef.current;
        if (canvas) { const ctx = canvas.getContext('2d'); if (ctx) { const m = metricsRef.current; renderMPWorld(ctx, canvas.width, canvas.height, worldRef.current.cso, worldRef.current.rhizome, worldRef.current.fields, overlaysRef.current, paramsRef.current, rhizomeEdgesRef.current, worldRef.current.time, viewportRef.current, { plateauLabel: m.plateauLabel, K: m.K, meanIntensity: m.meanIntensity }); } }
      } else {
        const r3d = renderer3dRef.current;
        if (r3d && r3d.isReady) { const { particles, links } = worldTo3D(worldRef.current, overlaysRef.current); r3d.render(particles, view3dRef.current, undefined, links); }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelled = true; cancelAnimationFrame(rafRef.current); };
  }, [active]);

  useEffect(() => { if (!active) return; const resize = () => { const canvas = canvasRef.current; if (canvas) { const par = canvas.parentElement; if (par) { canvas.width = par.clientWidth; canvas.height = par.clientHeight; } } const c3d = canvas3dRef.current; if (c3d && renderer3dRef.current) { const par = c3d.parentElement; if (par) renderer3dRef.current.resize(par.clientWidth, par.clientHeight); } }; resize(); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize); }, [active]);
  useEffect(() => { if (!active) return; const el = canvasRef.current?.parentElement; if (!el) return; const prevent = (e: WheelEvent) => { e.preventDefault(); }; el.addEventListener('wheel', prevent, { passive: false }); return () => el.removeEventListener('wheel', prevent); }, [active]);

  if (!active) return null;
  const K = computeK(params);
  const currentSliders = tab === 'cso' ? CSO_PARAMS : tab === 'rizoma' ? RIZOMA_PARAMS : [...CSO_PARAMS, ...RIZOMA_PARAMS];
  const ei = inspected ? EL_INFO[inspected.type] : null;
  const legendStyle: React.CSSProperties = legendPos ? { position: 'fixed', left: legendPos.x, top: legendPos.y, zIndex: 50 } : { position: 'absolute', bottom: 12, left: 12, zIndex: 50 };

  return (
    <div className="fixed inset-0 flex" style={{ fontFamily: MONO, background: '#040408', color: 'rgba(255,255,255,0.88)' }}>
      <div className="flex-1 relative" style={{ minWidth: 0 }}>
        <canvas ref={canvasRef} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onContextMenu={e => e.preventDefault()} style={{ width: '100%', height: '100%', cursor: activeTool !== 'select' ? 'crosshair' : 'pointer', display: viewMode === '2d' ? 'block' : 'none' }} />
        <canvas ref={canvas3dRef} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onContextMenu={e => e.preventDefault()} style={{ width: '100%', height: '100%', display: viewMode === '3d' ? 'block' : 'none' }} />

        {/* View mode */}
        <div style={{ position: 'absolute', top: 56, right: 312, display: 'flex', gap: 2 }}>
          <button onClick={() => setViewMode('2d')} style={{ background: viewMode === '2d' ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.6)', border: viewMode === '2d' ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '3px 8px', cursor: 'pointer', fontSize: 7.5, fontWeight: 600, color: viewMode === '2d' ? ACCENT : 'rgba(255,255,255,0.4)', fontFamily: MONO }}>2D</button>
          <button onClick={() => setViewMode('3d')} style={{ background: viewMode === '3d' ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.6)', border: viewMode === '3d' ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '3px 8px', cursor: 'pointer', fontSize: 7.5, fontWeight: 600, color: viewMode === '3d' ? ACCENT : 'rgba(255,255,255,0.4)', fontFamily: MONO }}>3D</button>
        </div>

        {/* Speed */}
        <div style={{ position: 'absolute', top: 56, left: 12, display: 'flex', gap: 2, alignItems: 'center' }}>
          <span style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.25)', fontFamily: MONO }}>VEL</span>
          {SPEED_OPTS.map(s => (
            <button key={s} onClick={() => setSpeed(s)} style={{ background: speed === s ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.6)', border: speed === s ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '2px 5px', cursor: 'pointer', fontSize: 7, color: speed === s ? ACCENT : 'rgba(255,255,255,0.35)', fontFamily: MONO }}>{s}x</button>
          ))}
        </div>

        {viewMode === '2d' && (<div style={{ position: 'absolute', bottom: 12, right: 312, background: 'rgba(0,0,0,0.75)', borderRadius: 4, padding: '3px 8px', fontSize: 7, color: 'rgba(255,255,255,0.35)', fontFamily: MONO, pointerEvents: 'none' }}>{(zoomLevel * 100).toFixed(0)}% | alt+arraste = pan | scroll = zoom</div>)}
        {viewMode === '3d' && (<div style={{ position: 'absolute', bottom: 12, right: 312, background: 'rgba(0,0,0,0.75)', borderRadius: 4, padding: '3px 8px', fontSize: 7, color: 'rgba(255,255,255,0.35)', fontFamily: MONO, pointerEvents: 'none' }}>3D | alt+arraste = orbitar | scroll = distancia</div>)}
        {zoomLevel !== 1 && viewMode === '2d' && (<button onClick={resetView} style={{ position: 'absolute', bottom: 30, right: 312, background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 7, color: ACCENT, fontFamily: MONO }}>Reset zoom</button>)}

        {activeTool !== 'select' && (<div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 14px', fontSize: 8.5, color: 'rgba(255,255,255,0.5)', fontFamily: MONO, pointerEvents: 'none' }}>{MP_TOOLS.find(t => t.id === activeTool)?.icon}{' '}{MP_TOOLS.find(t => t.id === activeTool)?.label}</div>)}

        {/* Inspect tooltip */}
        {inspected && ei && (
          <div style={{ position: 'absolute', top: 80, left: 12, background: 'rgba(0,0,0,0.92)', border: `1px solid ${ei.color}33`, borderRadius: 6, padding: '8px 12px', fontSize: 8, color: 'rgba(255,255,255,0.7)', fontFamily: MONO, pointerEvents: 'none', minWidth: 180, maxWidth: 260 }}>
            <div style={{ fontWeight: 700, color: ei.color, marginBottom: 3, fontSize: 8.5 }}>{ei.title}</div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.35)', marginBottom: 5, lineHeight: 1.4 }}>{ei.desc}</div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 4 }}>
              {inspected.type === 'afeto' && (<><div>Intensidade: <span style={{ color: '#fbbf24' }}>{inspected.intensity.toFixed(2)}</span></div><div>Hue: <span style={{ color: `hsl(${inspected.hue},70%,60%)` }}>{inspected.hue.toFixed(0)}</span></div><div>Vida: <span style={{ color: '#6ee7b7' }}>{inspected.life}</span></div></>)}
              {inspected.type === 'orgao' && (<><div>Importancia: <span style={{ color: '#60a5fa' }}>{inspected.importance.toFixed(2)}</span></div><div>Saude: <span style={{ color: inspected.health > 0.5 ? '#6ee7b7' : '#ef4444' }}>{inspected.health.toFixed(2)}</span></div><div>Conexoes: <span style={{ color: '#fb923c' }}>{inspected.nConns}</span></div></>)}
              {inspected.type === 'no-rizoma' && (<><div>Heat: <span style={{ color: '#fbbf24' }}>{inspected.heat.toFixed(2)}</span></div><div>Territorio: <span style={{ color: '#f97316' }}>{inspected.territory.toFixed(2)}</span></div><div>Entrada: <span style={{ color: inspected.isEntry ? '#34d399' : '#94a3b8' }}>{inspected.isEntry ? 'Sim' : 'Nao'}</span></div><div>Conexoes: <span style={{ color: '#60a5fa' }}>{inspected.nConns}</span></div></>)}
              {inspected.type === 'zona' && (<><div>Forca: <span style={{ color: '#a78bfa' }}>{inspected.strength.toFixed(2)}</span></div><div>Raio: <span style={{ color: '#60a5fa' }}>{inspected.radius.toFixed(3)}</span></div></>)}
              <div style={{ color: 'rgba(255,255,255,0.20)', marginTop: 2 }}>({inspected.x.toFixed(3)}, {inspected.y.toFixed(3)})</div>
            </div>
          </div>
        )}

        {/* Draggable legend */}
        <div onMouseDown={onLegendMouseDown} style={{ ...legendStyle, background: 'rgba(0,0,0,0.80)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, padding: '6px 10px', cursor: 'grab', fontSize: 6.5, fontFamily: MONO, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, userSelect: 'none' }}>
          <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.20)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Legenda (arraste)</div>
          <div><span style={{ color: '#60a5fa' }}>&#9675;</span> Orgaos (estratificacao)</div>
          <div><span style={{ color: '#fbbf24' }}>&#8226;</span> Afetos (intensidades)</div>
          <div><span style={{ color: '#34d399' }}>&#9670;</span> Nos rizoma (entradas)</div>
          <div><span style={{ color: '#60a5fa' }}>&#8212;</span> Conexoes rizoma</div>
          <div><span style={{ color: '#a78bfa' }}>- -</span> Linhas de fuga</div>
          <div><span style={{ color: 'rgba(99,102,241,0.5)' }}>&#9632;</span> Consistencia (azul)</div>
          <div><span style={{ color: 'rgba(251,191,36,0.5)' }}>&#9632;</span> Territorio (ambar)</div>
          <div style={{ marginTop: 2, color: 'rgba(255,255,255,0.15)' }}>clique = inspecionar</div>
        </div>

        {worldRef.current.cso.events.length > 0 && (<div style={{ position: 'absolute', top: 80, right: 312, maxWidth: 240, pointerEvents: 'none' }}>{worldRef.current.cso.events.slice(-4).map((ev, i) => (<div key={i} style={{ fontSize: 7.5, color: ev.color, fontFamily: MONO, background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: 3, marginBottom: 2, opacity: Math.min(1, ev.ttl / 60) }}>{ev.type === 'ruptura' ? '!' : ev.type === 'reconexao' ? '~' : '*'} {ev.message}</div>))}</div>)}
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-shrink-0 overflow-y-auto" style={{ width: 300, borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.93)', padding: '52px 10px 16px' }}>
        <div style={{ fontFamily: DOTO, fontSize: 15, fontWeight: 700, color: ACCENT, marginBottom: 1 }}>MIL PLATOS</div>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.30)', marginBottom: 6, lineHeight: 1.4 }}>Clique em qualquer elemento para inspecionar. Scroll = zoom. Alt+arraste = pan.</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}><MiniBtn label={running ? 'II' : '>'} onClick={() => setRunning(!running)} /><MiniBtn label="R" onClick={() => resetWorld(params)} /><div style={{ flex: 1 }} /><MiniBtn label="+ Plato" onClick={captureSnapshot} /><MiniBtn label="Jornada" onClick={() => { setShowJornada(true); setJornadaStep(0); setJornadaAnswers([]); }} /></div>

        <Hdr label="EIXO CsO" />
        <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span>Corpo c/ Orgaos</span><span>CsO</span></div>
        <input type="range" min={0} max={1} step={0.01} value={macroValue} onChange={e => handleMacro(parseFloat(e.target.value))} style={{ width: '100%', accentColor: ACCENT }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 8, color: ACCENT }}>{(macroValue * 100).toFixed(0)}% CsO</span><span style={{ fontSize: 8, color: '#f472b6' }}>K={K.toFixed(2)}</span></div>

        <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
          {(['cso', 'rizoma', 'platos'] as MPTab[]).map(t => (<button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '3px 0', borderRadius: 3, cursor: 'pointer', fontSize: 7.5, fontWeight: 600, fontFamily: MONO, textTransform: 'uppercase', background: tab === t ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: tab === t ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.06)', color: tab === t ? ACCENT : 'rgba(255,255,255,0.4)' }}>{t === 'cso' ? 'CsO' : t === 'rizoma' ? 'Rizoma' : 'Platos'}</button>))}
        </div>

        <Hdr label={tab === 'cso' ? 'PARAMETROS CsO' : tab === 'rizoma' ? 'PARAMETROS RIZOMA' : 'TODOS OS PARAMETROS'} />
        {currentSliders.map(s => (<Slider key={s.key} label={s.label} color={s.color} value={params[s.key]} onChange={v => { setParams(p => ({ ...p, [s.key]: v })); setSelectedPreset(''); }} />))}
        {SHARED_PARAMS.map(s => (<Slider key={s.key} label={s.label} color={s.color} value={params[s.key]} onChange={v => { setParams(p => ({ ...p, [s.key]: v })); setSelectedPreset(''); }} />))}

        <Hdr label="INTERVENCOES" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 2, marginBottom: 6 }}>{MP_TOOLS.map(t => (<button key={t.id} onClick={() => setActiveTool(t.id)} title={t.desc} style={{ background: activeTool === t.id ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.02)', border: activeTool === t.id ? `1px solid ${t.color}` : '1px solid rgba(255,255,255,0.05)', borderRadius: 3, padding: '3px 2px', cursor: 'pointer', fontSize: 7, color: activeTool === t.id ? t.color : 'rgba(255,255,255,0.4)', textAlign: 'center', fontFamily: MONO, lineHeight: 1.3 }}><div style={{ fontSize: 11 }}>{t.icon}</div>{t.label}</button>))}</div>

        <Hdr label="CAMADAS" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 6 }}>{OVERLAY_DEFS.map(o => (<button key={o.key} onClick={() => toggleOverlay(o.key)} style={{ background: overlays.has(o.key) ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)', border: overlays.has(o.key) ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.05)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontSize: 7, color: overlays.has(o.key) ? ACCENT : 'rgba(255,255,255,0.35)', fontFamily: MONO }}>{o.label}</button>))}</div>

        <Hdr label="DIAGNOSTICOS" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 8px', marginBottom: 4 }}>
          <MetRow label="FPS" value={metrics.fps.toFixed(0)} color="#6ee7b7" />
          <MetRow label="Afetos" value={`${metrics.nAffects}`} color="#fbbf24" />
          <MetRow label="Orgaos" value={`${metrics.nOrgans}`} color="#60a5fa" />
          <MetRow label="Nos" value={`${metrics.nRhizomeNodes}`} color="#34d399" />
          <MetRow label="Arestas" value={`${metrics.nRhizomeEdges}`} color="#60a5fa" />
          <MetRow label="Rupturas" value={`${metrics.ruptureRate}`} color="#ef4444" />
        </div>
        <BarReadout label="Hub Dominance" value={metrics.hubDominance} color="#f472b6" />
        <BarReadout label="Crueldade" value={metrics.crueltyPressure} color="#ef4444" />
        <BarReadout label="Intensidade" value={metrics.meanIntensity} color="#fbbf24" />
        <BarReadout label="Entropia" value={metrics.fieldEntropy} color="#38bdf8" />
        <BarReadout label="Memoria" value={metrics.memoryLoad} color="#f97316" />

        <div style={{ textAlign: 'center', padding: '4px 6px', margin: '4px 0', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.10)', borderRadius: 4 }}>
          <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1 }}>Plato</div>
          <div style={{ fontSize: 10, fontFamily: DOTO, fontWeight: 600, color: ACCENT }}>{metrics.plateauLabel}</div>
        </div>

        {selectedPreset && (() => { const preset = MP_PRESETS.find(p => p.id === selectedPreset); if (!preset?.theory) return null; return (<div style={{ margin: '6px 0', padding: '8px 10px', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.10)', borderRadius: 5 }}><div style={{ fontSize: 6.5, fontWeight: 600, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4, fontFamily: MONO, borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 2 }}>TEORIA</div>{preset.plateauRef && (<div style={{ fontSize: 7.5, color: ACCENT, fontWeight: 600, marginBottom: 5, fontFamily: DOTO, lineHeight: 1.3 }}>{preset.plateauRef}</div>)}<div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.55, fontFamily: MONO, textAlign: 'justify' }}>{preset.theory}</div></div>); })()}

        {snapshots.length > 0 && (<><Hdr label="PLATOS CAPTURADOS" />{snapshots.map(s => (<button key={s.id} onClick={() => loadSnapshot(s)} style={{ width: '100%', padding: '3px 5px', borderRadius: 3, cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', fontSize: 7, fontFamily: MONO, textAlign: 'left', marginBottom: 2 }}><strong style={{ color: ACCENT }}>{s.label}</strong><span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>K={s.K.toFixed(2)}</span></button>))}</>)}

        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginTop: 6 }} onClick={() => setPresetsExpanded(!presetsExpanded)}>
          <Hdr label={`PRESETS (${MP_PRESETS.length})`} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto', marginTop: 4 }}>{presetsExpanded ? 'v' : '>'}</span>
        </div>
        {presetsExpanded && (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginTop: 2 }}>{MP_PRESETS.map(p => (<button key={p.id} onClick={() => applyPreset(p.id)} style={{ background: selectedPreset === p.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)', border: selectedPreset === p.id ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.04)', borderRadius: 3, padding: '4px 4px 3px', cursor: 'pointer', textAlign: 'left' }}><div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 1 }}><span style={{ fontSize: 10 }}>{p.icon}</span><span style={{ fontSize: 7, fontWeight: 500, color: selectedPreset === p.id ? ACCENT : 'rgba(255,255,255,0.55)' }}>{p.name}</span></div><div style={{ fontSize: 6, color: 'rgba(255,255,255,0.20)', lineHeight: 1.2 }}>{p.description}</div></button>))}</div>)}

        {showJornada && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)' }}>
            <div style={{ background: 'rgba(10,10,20,0.98)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '24px 32px', maxWidth: 460, width: '90%', fontFamily: MONO }}>
              <div style={{ fontFamily: DOTO, fontSize: 14, fontWeight: 700, color: ACCENT, marginBottom: 4 }}>JORNADA CsO</div>
              <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Pergunta {jornadaStep + 1} de {JORNADA_QS.length}</div>
              {jornadaStep < JORNADA_QS.length ? (<>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginBottom: 16, lineHeight: 1.5 }}>{JORNADA_QS[jornadaStep].q}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                  <span>{JORNADA_QS[jornadaStep].low}</span><span>{JORNADA_QS[jornadaStep].high}</span>
                </div>
                <input type="range" min={0} max={1} step={0.05} value={jornadaAnswers[jornadaStep] ?? 0.5}
                  onChange={e => { const v = parseFloat(e.target.value); setJornadaAnswers(prev => { const next = [...prev]; next[jornadaStep] = v; return next; }); }}
                  style={{ width: '100%', accentColor: ACCENT, marginBottom: 16 }} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  {jornadaStep > 0 && <button onClick={() => setJornadaStep(s => s - 1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '6px 16px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 9, fontFamily: MONO }}>Voltar</button>}
                  <button onClick={() => { if (jornadaAnswers[jornadaStep] === undefined) setJornadaAnswers(prev => { const next = [...prev]; next[jornadaStep] = 0.5; return next; }); setJornadaStep(s => s + 1); }} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid ' + ACCENT, borderRadius: 4, padding: '6px 16px', cursor: 'pointer', color: ACCENT, fontSize: 9, fontFamily: MONO, fontWeight: 600 }}>
                    {jornadaStep < JORNADA_QS.length - 1 ? 'Proximo' : 'Gerar CsO'}
                  </button>
                </div>
              </>) : (<>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 16, lineHeight: 1.5 }}>Seu Corpo sem Orgaos esta pronto. Clique para gerar a simulacao personalizada.</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowJornada(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '6px 16px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 9, fontFamily: MONO }}>Cancelar</button>
                  <button onClick={finishJornada} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid ' + ACCENT, borderRadius: 4, padding: '6px 16px', cursor: 'pointer', color: ACCENT, fontSize: 9, fontFamily: MONO, fontWeight: 600 }}>Gerar meu CsO</button>
                </div>
              </>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Hdr: React.FC<{ label: string }> = ({ label }) => (<div style={{ fontSize: 6.5, fontWeight: 600, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3, marginTop: 6, fontFamily: MONO, borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 2 }}>{label}</div>);
const Slider: React.FC<{ label: string; color: string; value: number; onChange: (v: number) => void }> = ({ label, color, value, onChange }) => (<div style={{ marginBottom: 3 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, marginBottom: 1 }}><span style={{ color }}>{label}</span><span style={{ color: 'rgba(255,255,255,0.35)' }}>{value.toFixed(2)}</span></div><input type="range" min={0} max={1} step={0.01} value={value} onChange={e => onChange(parseFloat(e.target.value))} style={{ width: '100%', height: 3, accentColor: color }} /></div>);
const MetRow: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, marginBottom: 1 }}><span style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span><span style={{ color, fontWeight: 500 }}>{value}</span></div>);
const BarReadout: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (<div style={{ marginBottom: 2 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 6.5, marginBottom: 1 }}><span style={{ color: 'rgba(255,255,255,0.30)' }}>{label}</span><span style={{ color }}>{(clamp01(value) * 100).toFixed(0)}%</span></div><div style={{ height: 2.5, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}><div style={{ height: '100%', width: `${clamp01(value) * 100}%`, background: color, borderRadius: 2, transition: 'width 0.15s' }} /></div></div>);
const MiniBtn: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (<button onClick={onClick} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '3px 8px', cursor: 'pointer', color: ACCENT, fontSize: 10, fontFamily: MONO }}>{label}</button>);