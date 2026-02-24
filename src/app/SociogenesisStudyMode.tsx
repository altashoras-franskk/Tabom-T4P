// ─── Sociogenesis Study Mode ───────────────────────────────────────────────────
// Symbols as Laws · 20 presets · dropdown HUD · agent inspector · auto-emergence

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, ChevronDown, X } from 'lucide-react';
import { CanvasRecorder, RecorderState } from './components/recording/canvasRecorder';
import { RecordingButton } from './components/recording/RecordingButton';
import {
  createStudyConfig, createStudyMetrics, createStudySymbols, createStudyWorldState,
  GROUP_COLORS,
  type StudyAgent, type StudyConfig, type StudyMetrics,
  type StudySymbols, type StudyTotem, type StudyTabu, type StudyRitual,
  type StudyLens, type StudyTool, type StudyWorldState,
  type StudyPing, type StudyEvent,
} from '../sim/study/studyTypes';
import {
  spawnStudyAgents, microTick, macroTick,
  computeStudyMetrics, computeAgentRoles, buildMicroGrid,
  type AgentRole,
} from '../sim/study/studyEngine';
import { renderStudy } from '../sim/study/studyRenderer';
import {
  createSocialFields, createSocialFieldConfig, resetFields,
  type SocialFields, type SocialFieldConfig,
} from '../sim/study/socialFields';
import { STUDY_SCENARIOS, SCENARIO_CATEGORIES, type StudyScenario } from '../sim/study/studyScenarios';

function makeRng(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
let _uid = 1;
const uid = () => `u-${_uid++}`;

// ── Constants ─────────────────────────────────────────────────────────────────
const PHASE_COLORS: Record<string, string> = {
  SWARM: '#94a3b8', CLUSTERS: '#34d399', POLARIZED: '#fbd38d',
  CONFLICT: '#ef4444', CONSENSUS: '#a78bfa', EXCEPTION: '#ff6b6b',
};
const PHASE_ICONS: Record<string, string> = {
  SWARM: '◉', CLUSTERS: '⊕', POLARIZED: '⊖', CONFLICT: '!', CONSENSUS: '◎', EXCEPTION: '!',
};

const TOOLS: { id: StudyTool; icon: string; label: string; desc: string; color: string }[] = [
  { id: 'select',            icon: '◇', label: 'Select',      color: '#94a3b8', desc: 'Click agent to inspect' },
  { id: 'totem_bond',        icon: '⊕', label: 'Bond Totem',  color: '#34d399', desc: 'N+L deposit · grows leaders · draws believers' },
  { id: 'totem_rift',        icon: '⊖', label: 'Rift Totem',  color: '#ff6b6b', desc: 'Anti-N · factional L · drives polarization' },
  { id: 'tabu_enter',        icon: 'X',  label: 'No-Enter',   color: '#ef4444', desc: 'Fear pulse on entry · moral panic risk' },
  { id: 'tabu_mix',          icon: '×',  label: 'No-Mix',     color: '#f97316', desc: 'Cross-group repulsion · promotes endogamy' },
  { id: 'ritual_gather',     icon: '◎', label: 'Gather',      color: '#a78bfa', desc: 'Periodic consensus · N+L deposit · costs fatigue' },
  { id: 'ritual_procession', icon: '|', label: 'Procession', color: '#fbd38d', desc: 'Discipline march · N boost · raises leader power' },
];

const LENSES: { id: StudyLens; label: string; desc: string }[] = [
  { id: 'off',     label: 'Off',     desc: 'Plain canvas' },
  { id: 'groups',  label: 'Groups',  desc: 'Group color + psychology rings + roles' },
  { id: 'power',   label: 'Power',   desc: 'L/N fields + status auras + fear tint' },
  { id: 'economy', label: 'Economy', desc: 'R field + wealth halos (top 10)' },
  { id: 'events',  label: 'Events',  desc: 'Event pings only' },
  { id: 'field',   label: 'Fields',  desc: 'All 3 fields: N=green L=violet R=gold' },
];

interface Props { onLeave?: () => void; }

// ── Dropdown ──────────────────────────────────────────────────────────────────
function Dropdown({ label, icon, children, align = 'left' }: {
  label: React.ReactNode; icon?: React.ReactNode; children: React.ReactNode; align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-500 transition-all text-xs font-medium">
        {icon} {label} <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute top-full mt-1.5 z-50 min-w-[200px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden ${align === 'right' ? 'right-0' : 'left-0'}`}
          onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

function DropItem({ icon, label, sub, active, onClick, color }: {
  icon?: string; label: string; sub?: string; active?: boolean; onClick?: () => void; color?: string;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-800 transition-colors"
      style={{ background: active ? 'rgba(255,255,255,0.06)' : '' }}>
      {icon && <span className="text-sm shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium" style={{ color: active ? (color || '#fff') : '#d4d4d8' }}>{label}</div>
        {sub && <div className="text-[10px] text-zinc-500 truncate">{sub}</div>}
      </div>
      {active && <div className="w-1 h-1 rounded-full shrink-0" style={{ background: color || '#a78bfa' }} />}
    </button>
  );
}

function DropSep({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 text-[9px] uppercase tracking-widest text-zinc-600 border-t border-zinc-800 mt-1 pt-2">
      {label}
    </div>
  );
}

// ── PsychBar (horizontal mini bar) ──────────────────────────────────────────
function PsychBar({ label, v, c }: { label: string; v: number; c: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-500 text-[10px] w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(v * 100).toFixed(0)}%`, background: c }} />
      </div>
      <span className="text-[10px] font-mono text-zinc-400 w-7 text-right shrink-0">{(v * 100).toFixed(0)}</span>
    </div>
  );
}

// ── Collapsible panel section ──────────────────────────────────────────────
function Section({ title, badge, open, onToggle, children }: {
  title: string; badge?: string | number; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-zinc-800">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-zinc-300 hover:text-white hover:bg-zinc-800/40 transition-colors">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
          {title}
          {badge !== undefined && (
            <span className="text-[9px] px-1.5 py-px rounded bg-zinc-800 text-zinc-400 font-normal">{badge}</span>
          )}
        </span>
        <ChevronDown size={12} className={`text-zinc-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export const SociogenesisStudyMode: React.FC<Props> = ({ onLeave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sim refs
  const agentsRef     = useRef<StudyAgent[]>([]);
  const rolesRef      = useRef<AgentRole[]>([]);
  const cfgRef        = useRef<StudyConfig>(createStudyConfig());
  const symbolsRef    = useRef<StudySymbols>(createStudySymbols());
  const fieldsRef     = useRef<SocialFields>(createSocialFields());
  const fieldCfgRef   = useRef<SocialFieldConfig>(createSocialFieldConfig());
  const wsRef         = useRef<StudyWorldState>(createStudyWorldState());
  const metricsRef    = useRef<StudyMetrics>(createStudyMetrics());
  const pingsRef      = useRef<StudyPing[]>([]);
  const eventsRef     = useRef<StudyEvent[]>([]);
  const clockRef      = useRef({ elapsed: 0, lastMacro: -99, lastRole: -99 });
  const rafRef        = useRef(0);
  const lastFrameRef  = useRef(0);

  // UI state
  const [paused, setPaused]       = useState(false);
  const pausedRef                 = useRef(false);
  const [lens, setLens]           = useState<StudyLens>('groups');
  const lensRef                   = useRef<StudyLens>('groups');
  const [tool, setTool]           = useState<StudyTool>('select');
  const toolRef                   = useRef<StudyTool>('select');
  const [scenario, setScenario]   = useState('discipline_state');
  const [metricsUI, setMetricsUI] = useState<StudyMetrics>(createStudyMetrics());
  const [wsUI, setWsUI]           = useState<StudyWorldState>(createStudyWorldState());
  const [eventsUI, setEventsUI]   = useState<StudyEvent[]>([]);
  const [dims, setDims]           = useState({ w: window.innerWidth, h: window.innerHeight });
  const [symbolsVer, setSymbolsVer] = useState(0); // force panel re-render when symbols change

  // Agent inspector
  const [inspectorIdx, setInspectorIdx] = useState(-1);
  const [inspectorSnap, setInspectorSnap] = useState<StudyAgent | null>(null);
  const [inspectorRole, setInspectorRole] = useState<AgentRole>('normal');
  const inspectorIdxRef = useRef(-1);

  // Panel sections
  const [showTools,    setShowTools]    = useState(true);
  const [showAgents,   setShowAgents]   = useState(false);
  const [showSymbols,  setShowSymbols]  = useState(true);
  const [showInspect,  setShowInspect]  = useState(true);
  const [showReadout,  setShowReadout]  = useState(true);

  // Auto-symbols toggle
  const [autoSymbols, setAutoSymbols] = useState(true);

  useEffect(() => {
    const fn = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetWorld = useCallback((scId: string, keepAutoSymbols?: boolean) => {
    const sc: StudyScenario = STUDY_SCENARIOS.find(s => s.id === scId) ?? STUDY_SCENARIOS[0];
    const newCfg    = createStudyConfig();
    const newFCfg   = createSocialFieldConfig();
    sc.apply(newCfg, newFCfg);
    if (keepAutoSymbols !== undefined) newCfg.autoSymbols = keepAutoSymbols;
    cfgRef.current    = newCfg;
    fieldCfgRef.current = newFCfg;

    const rng = makeRng(Date.now());
    agentsRef.current = spawnStudyAgents(newCfg, rng);
    rolesRef.current  = new Array(agentsRef.current.length).fill('normal');

    const newFields  = createSocialFields();
    const newSymbols = createStudySymbols();
    if (sc.setupWorld) sc.setupWorld(newFields, newSymbols);
    fieldsRef.current  = newFields;
    symbolsRef.current = newSymbols;

    wsRef.current     = createStudyWorldState();
    pingsRef.current  = [];
    eventsRef.current = [];
    clockRef.current  = { elapsed: 0, lastMacro: -99, lastRole: -99 };

    setMetricsUI(createStudyMetrics());
    setWsUI(createStudyWorldState());
    setEventsUI([]);
    setScenario(scId);
    setAutoSymbols(newCfg.autoSymbols);
    setSymbolsVer(v => v + 1);
    setInspectorIdx(-1);
    setInspectorSnap(null);
    inspectorIdxRef.current = -1;
  }, []);

  useEffect(() => { resetWorld('discipline_state'); }, []);// eslint-disable-line

  // ── Viewport camera (zoom + pan) ──────────────────────────────────────────
  const socioCamRef  = useRef({ zoom: 1.0, panX: 0, panY: 0 });
  const socioDragRef = useRef({ active: false, lastX: 0, lastY: 0, btn: 0 });
  const socioKeysRef = useRef<Set<string>>(new Set());
  const [socioZoom,   setSocioZoom]   = useState(1.0);
  const [socioPanned, setSocioPanned] = useState(false);

  // Wheel zoom toward cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect   = canvas.getBoundingClientRect();
      const mx     = e.clientX - rect.left - rect.width  / 2;
      const my     = e.clientY - rect.top  - rect.height / 2;
      const cur    = socioCamRef.current;
      const factor = e.deltaY > 0 ? 1 / 1.12 : 1.12;
      const newZoom  = Math.max(0.15, Math.min(10, cur.zoom * factor));
      const ratio    = newZoom / cur.zoom;
      socioCamRef.current = {
        zoom: newZoom,
        panX: mx + (cur.panX - mx) * ratio,
        panY: my + (cur.panY - my) * ratio,
      };
      setSocioZoom(newZoom);
      setSocioPanned(Math.abs(socioCamRef.current.panX) > 2 || Math.abs(socioCamRef.current.panY) > 2);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  // Drag pan (left-click drag, differentiating from single-click tool placement)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onDown = (e: MouseEvent) => {
      socioDragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY, btn: e.button };
      if (e.button === 1) e.preventDefault(); // middle click
    };
    const onMove = (e: MouseEvent) => {
      if (!socioDragRef.current.active) return;
      // Pan on middle-click or right-click drag
      if (socioDragRef.current.btn !== 1 && socioDragRef.current.btn !== 2) return;
      const dx = e.clientX - socioDragRef.current.lastX;
      const dy = e.clientY - socioDragRef.current.lastY;
      socioDragRef.current.lastX = e.clientX;
      socioDragRef.current.lastY = e.clientY;
      const cur = socioCamRef.current;
      socioCamRef.current = { ...cur, panX: cur.panX + dx, panY: cur.panY + dy };
      setSocioPanned(true);
    };
    const onUp = () => {
      socioDragRef.current.active = false;
      const { panX, panY } = socioCamRef.current;
      setSocioPanned(Math.abs(panX) > 2 || Math.abs(panY) > 2);
    };
    const onContext = (e: MouseEvent) => { e.preventDefault(); };
    canvas.addEventListener('mousedown',  onDown);
    window.addEventListener('mousemove',  onMove);
    window.addEventListener('mouseup',    onUp);
    canvas.addEventListener('contextmenu', onContext);
    return () => {
      canvas.removeEventListener('mousedown',  onDown);
      window.removeEventListener('mousemove',  onMove);
      window.removeEventListener('mouseup',    onUp);
      canvas.removeEventListener('contextmenu', onContext);
    };
  }, []);

  // WASD pan + R = reset
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const k = e.key.toLowerCase();
      if (['w','a','s','d'].includes(k)) { socioKeysRef.current.add(k); e.preventDefault(); }
      if (k === 'r') {
        socioCamRef.current = { zoom: 1, panX: 0, panY: 0 };
        setSocioZoom(1); setSocioPanned(false);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { socioKeysRef.current.delete(e.key.toLowerCase()); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, []);

  // ── Main loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // ── WASD pan ────────────────────────────────────────────────────────
      if (socioKeysRef.current.size > 0) {
        const speed = 5 / socioCamRef.current.zoom;
        const cam = socioCamRef.current;
        let { panX, panY } = cam;
        if (socioKeysRef.current.has('a')) panX += speed;
        if (socioKeysRef.current.has('d')) panX -= speed;
        if (socioKeysRef.current.has('w')) panY += speed;
        if (socioKeysRef.current.has('s')) panY -= speed;
        socioCamRef.current = { ...cam, panX, panY };
      }

      if (!pausedRef.current) {
        const dt = Math.min((now - lastFrameRef.current) / 1000, 0.05);
        lastFrameRef.current = now;
        clockRef.current.elapsed += dt;
        const t = clockRef.current.elapsed;

        const grid = buildMicroGrid(agentsRef.current);
        microTick(agentsRef.current, grid, cfgRef.current, dt);

        for (const p of pingsRef.current) p.age += dt;
        pingsRef.current = pingsRef.current.filter(p => p.age < p.ttl);

        if (t - clockRef.current.lastMacro >= cfgRef.current.macroTickSec) {
          const dtM = Math.max(cfgRef.current.macroTickSec, t - clockRef.current.lastMacro);
          cfgRef.current.autoSymbols = autoSymbolsRef.current;
          const newEvts = macroTick(
            agentsRef.current, cfgRef.current,
            symbolsRef.current, fieldsRef.current, fieldCfgRef.current,
            wsRef.current, t, dtM, pingsRef.current,
          );

          if (newEvts.length > 0) {
            eventsRef.current = [...newEvts, ...eventsRef.current].slice(0, 30);
            setEventsUI([...eventsRef.current]);
            // Check if auto-symbols were added
            const prevTotal = symbolsRef.current.totems.length + symbolsRef.current.tabus.length + symbolsRef.current.rituals.length;
            if (prevTotal > 0) setSymbolsVer(v => v + 1);
          }

          const m = computeStudyMetrics(agentsRef.current, cfgRef.current);
          metricsRef.current = m;
          setMetricsUI({ ...m });
          setWsUI({ ...wsRef.current });
          setSymbolsVer(v => v + 1);
          clockRef.current.lastMacro = t;

          // Update inspector snapshot
          const idx = inspectorIdxRef.current;
          if (idx >= 0 && idx < agentsRef.current.length) {
            setInspectorSnap({ ...agentsRef.current[idx] });
            setInspectorRole(rolesRef.current[idx] ?? 'normal');
          }
        }

        if (t - clockRef.current.lastRole >= 2.0) {
          rolesRef.current = computeAgentRoles(agentsRef.current);
          clockRef.current.lastRole = t;
        }
      } else {
        lastFrameRef.current = now;
      }

      // ── Apply viewport transform, then render ────────────────────────────
      const W = canvas.width, H = canvas.height;
      const { zoom: vcZoom, panX: vcPanX, panY: vcPanY } = socioCamRef.current;
      // Pre-clear full canvas (important when zoom < 1)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#070714';
      ctx.fillRect(0, 0, W, H);
      // Apply camera transform
      ctx.save();
      ctx.translate(W/2 + vcPanX, H/2 + vcPanY);
      ctx.scale(vcZoom, vcZoom);
      ctx.translate(-W/2, -H/2);
      renderStudy(
        ctx, canvas.width, canvas.height,
        agentsRef.current, rolesRef.current,
        cfgRef.current, metricsRef.current,
        lensRef.current,
        symbolsRef.current,
        fieldsRef.current,
        wsRef.current,
        pingsRef.current,
        clockRef.current.elapsed,
      );
      ctx.restore();
    };

    lastFrameRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [dims]); // eslint-disable-line

  // autoSymbols ref
  const autoSymbolsRef = useRef(true);
  useEffect(() => { autoSymbolsRef.current = autoSymbols; cfgRef.current.autoSymbols = autoSymbols; }, [autoSymbols]);

  // ── Canvas click — adjusted for viewport transform ─────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx   = e.clientX - rect.left;
    const sy   = e.clientY - rect.top;
    const W    = rect.width, H = rect.height;
    const { zoom, panX, panY } = socioCamRef.current;
    // Invert viewport transform to get world coordinates
    const wx = 2 * (sx - W/2 - panX) / (zoom * W);
    const wy = 2 * (sy - H/2 - panY) / (zoom * H);
    const t     = toolRef.current;
    const syms  = symbolsRef.current;

    if (t === 'select') {
      // Find nearest agent
      let bestIdx = -1, bestD2 = 0.07 * 0.07;
      agentsRef.current.forEach((a, i) => {
        const d2 = (a.x - wx) ** 2 + (a.y - wy) ** 2;
        if (d2 < bestD2) { bestD2 = d2; bestIdx = i; }
      });
      setInspectorIdx(bestIdx);
      inspectorIdxRef.current = bestIdx;
      if (bestIdx >= 0) {
        setInspectorSnap({ ...agentsRef.current[bestIdx] });
        setInspectorRole(rolesRef.current[bestIdx] ?? 'normal');
        setShowInspect(true);
      }
      return;
    }

    const now = clockRef.current.elapsed;
    if (t === 'totem_bond' || t === 'totem_rift') {
      const item: StudyTotem = { id: uid(), kind: t === 'totem_bond' ? 'BOND' : 'RIFT', x: wx, y: wy, radius: 0.26, groupId: 0, pulseStrength: 0.85, bornAt: now };
      syms.totems = [...syms.totems, item];
      eventsRef.current = [{ time: now, icon: item.kind === 'BOND' ? '⊕' : '⊖', message: `${item.kind} Totem placed`, color: item.kind === 'BOND' ? '#34d399' : '#ff6b6b' }, ...eventsRef.current].slice(0, 30);
      setEventsUI([...eventsRef.current]);
    } else if (t === 'tabu_enter' || t === 'tabu_mix') {
      const item: StudyTabu = { id: uid(), kind: t === 'tabu_enter' ? 'NO_ENTER' : 'NO_MIX', x: wx, y: wy, radius: 0.20, severity: 0.6, bornAt: now, violationCount: 0 };
      syms.tabus = [...syms.tabus, item];
      eventsRef.current = [{ time: now, icon: 'X', message: `Taboo ${item.kind} declared`, color: '#ef4444' }, ...eventsRef.current].slice(0, 30);
      setEventsUI([...eventsRef.current]);
    } else if (t === 'ritual_gather' || t === 'ritual_procession') {
      const item: StudyRitual = { id: uid(), kind: t === 'ritual_gather' ? 'GATHER' : 'PROCESSION', x: wx, y: wy, radius: 0.30, periodSec: 7, lastFired: now, active: false, bornAt: now };
      syms.rituals = [...syms.rituals, item];
      eventsRef.current = [{ time: now, icon: '◎', message: `${item.kind} Ritual founded`, color: '#a78bfa' }, ...eventsRef.current].slice(0, 30);
      setEventsUI([...eventsRef.current]);
    }
    setSymbolsVer(v => v + 1);
  }, []);

  const patchCfg = (patch: Partial<StudyConfig>) => { Object.assign(cfgRef.current, patch); };

  const { phase } = metricsUI;
  const phaseColor = PHASE_COLORS[phase] ?? '#fff';
  const canvasW = Math.max(300, dims.w - 256);
  const canvasH = Math.max(200, dims.h - 44);
  const syms = symbolsRef.current;
  const symTotal = syms.totems.length + syms.tabus.length + syms.rituals.length;
  const currentScenario = STUDY_SCENARIOS.find(s => s.id === scenario);

  // ── Recording ────────────────────────────────────────────────────────────
  const recorderRef  = useRef<CanvasRecorder | null>(null);
  const [recState,   setRecState]   = useState<RecorderState>('idle');
  const [recElapsed, setRecElapsed] = useState(0);

  useEffect(() => {
    recorderRef.current = new CanvasRecorder(setRecState);
    return () => recorderRef.current?.dispose();
  }, []);

  useEffect(() => {
    if (recState !== 'recording') { setRecElapsed(0); return; }
    const id = setInterval(() => setRecElapsed(recorderRef.current?.elapsed ?? 0), 500);
    return () => clearInterval(id);
  }, [recState]);

  const handleRecStart = useCallback(() => {
    recorderRef.current?.start(
      () => [canvasRef.current],
      () => ({
        labName: 'Sociogenesis Tool',
        lines: [
          `fase: ${wsRef.current.phase}  ·  agentes: ${agentsRef.current.length}`,
          `coesão: ${(metricsRef.current.cohesion * 100).toFixed(0)}%  polariz.: ${(metricsRef.current.polarization * 100).toFixed(0)}%  conflito: ${(metricsRef.current.conflict * 100).toFixed(0)}%`,
          `lens: ${lensRef.current}  ·  cenário: ${scenario}`,
          `totens: ${symbolsRef.current.totems.length}  tabus: ${symbolsRef.current.tabus.length}  rituais: ${symbolsRef.current.rituals.length}`,
        ],
      }),
    );
  }, [scenario]);

  const handleRecStop = useCallback(() => recorderRef.current?.stop(), []);

  return (
    <div className="fixed inset-0 z-20 bg-zinc-950 flex flex-col overflow-hidden select-none" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Exception banner ───────────────────────────────────────────────── */}
      {wsUI.exceptionActive && (
        <div className="h-7 flex items-center justify-center gap-3 shrink-0 animate-pulse"
          style={{ background: 'rgba(239,68,68,0.15)', borderBottom: '1px solid rgba(239,68,68,0.30)' }}>
          <span className="text-xs text-red-400 font-semibold tracking-widest uppercase">STATE OF EXCEPTION</span>
          <span className="text-[10px] text-red-400/50">N field surging · policing active</span>
        </div>
      )}

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 h-11 border-b border-zinc-800 bg-zinc-950 shrink-0">

        {onLeave && (
          <button onClick={onLeave}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all text-xs">
            <ArrowLeft size={11} /> Exit
          </button>
        )}

        <span className="text-zinc-600 text-xs hidden md:block">MetaLifeLab · Sociogenesis</span>
        <div className="w-px h-5 bg-zinc-800" />

        {/* Sim dropdown */}
        <Dropdown label={paused ? 'Paused' : 'Running'} icon={paused ? <Pause size={11} /> : <Play size={11} />}>
          <div className="py-1">
            <DropItem icon={paused ? '▶' : '⏸'} label={paused ? 'Run' : 'Pause'}
              onClick={() => { const n = !paused; setPaused(n); pausedRef.current = n; }} />
            <DropItem icon="↺" label="Reset Scenario"
              onClick={() => resetWorld(scenario, autoSymbols)} />
            <div className="px-3 py-2 border-t border-zinc-800 mt-1">
              <div className="text-[10px] text-zinc-500 mb-1.5">macroTick interval</div>
              <div className="flex items-center gap-2">
                <input type="range" min={0.5} max={2.5} step={0.1} defaultValue={1.0}
                  onChange={e => patchCfg({ macroTickSec: parseFloat(e.target.value) })}
                  className="flex-1 h-px bg-zinc-700 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-300" />
                <span className="text-[10px] text-zinc-400">1.0s</span>
              </div>
            </div>
          </div>
        </Dropdown>

        {/* Scenario dropdown — grouped by category */}
        <Dropdown label={currentScenario ? `${currentScenario.icon} ${currentScenario.name}` : 'Scenario'}>
          <div className="py-1 max-h-80 overflow-y-auto">
            {(['genesis','conflict','economy','culture','power'] as const).map(cat => {
              const items = STUDY_SCENARIOS.filter(s => s.category === cat);
              return (
                <div key={cat}>
                  <DropSep label={SCENARIO_CATEGORIES[cat]} />
                  {items.map(sc => (
                    <DropItem key={sc.id} icon={sc.icon} label={sc.name} sub={sc.description}
                      active={scenario === sc.id}
                      onClick={() => resetWorld(sc.id, autoSymbols)} />
                  ))}
                </div>
              );
            })}
          </div>
        </Dropdown>

        {/* Lens dropdown */}
        <Dropdown label={LENSES.find(l => l.id === lens)?.label ?? 'Lens'}>
          <div className="py-1">
            {LENSES.map(l => (
              <DropItem key={l.id} label={l.label} sub={l.desc} active={lens === l.id}
                onClick={() => { setLens(l.id); lensRef.current = l.id; }} />
            ))}
          </div>
        </Dropdown>

        <div className="flex-1" />

        {/* Phase chip */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md border"
          style={{ borderColor: phaseColor + '40', background: phaseColor + '12' }}>
          <span>{PHASE_ICONS[phase]}</span>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: phaseColor }}>{phase}</span>
        </div>

        {/* Recording button */}
        <RecordingButton
          state={recState}
          elapsed={recElapsed}
          onStart={handleRecStart}
          onStop={handleRecStop}
        />
      </div>

      {/* ── Canvas + Panel ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Canvas */}
        <div className="flex-1 relative">
          <canvas ref={canvasRef} width={canvasW} height={canvasH}
            style={{ display: 'block', width: '100%', height: '100%', cursor: tool !== 'select' ? 'crosshair' : 'default' }}
            onClick={handleCanvasClick} />

          {/* Phase + bars — bottom left */}
          <div className="absolute bottom-5 left-5 pointer-events-none">
            <div className="text-3xl font-light tracking-widest uppercase mb-2"
              style={{ color: phaseColor, textShadow: `0 0 24px ${phaseColor}55`, letterSpacing: '0.3em' }}>
              {phase}
            </div>
            <div className="space-y-2 w-52">
              <MetricBar label="Cohesion"     v={metricsUI.cohesion}     c="#34d399" />
              <MetricBar label="Polarization" v={metricsUI.polarization} c="#fbd38d" />
              <MetricBar label="Conflict"     v={metricsUI.conflict}     c="#ef4444" />
            </div>
          </div>

          {/* Group legend — bottom right */}
          <div className="absolute bottom-5 right-5 flex flex-col items-end gap-1 pointer-events-none">
            {Array.from({ length: cfgRef.current.groupCount }).map((_, g) => (
              <div key={g} className="flex items-center gap-2">
                <span className="text-zinc-500 text-xs">G{g}</span>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: GROUP_COLORS[g] }} />
              </div>
            ))}
          </div>

          {/* Tool hint */}
          {tool !== 'select' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs">
                <span>{TOOLS.find(t2 => t2.id === tool)?.icon}</span>
                <span>{TOOLS.find(t2 => t2.id === tool)?.label}</span>
                <span className="text-sky-500/60">· click to place · Esc to cancel</span>
              </div>
            </div>
          )}

          {/* Field legend */}
          {(lens === 'field' || lens === 'power' || lens === 'economy') && (
            <div className="absolute top-3 left-3 pointer-events-none space-y-1">
              {lens !== 'economy' && <FChip c="#34d399" label="N Norma" />}
              {lens !== 'economy' && <FChip c="#a78bfa" label="L Legitimidade" />}
              {lens !== 'power'   && <FChip c="#fbbf24" label="R Recurso" />}
            </div>
          )}

          {/* Zoom indicator — bottom-right */}
          {(socioZoom < 0.99 || socioZoom > 1.01 || socioPanned) && (
            <div className="absolute bottom-5 right-5 flex flex-col items-end gap-1 pointer-events-auto select-none"
              style={{ bottom: '5rem' }}>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 border border-white/10">
                <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">zoom</span>
                <span className="text-[9px] font-mono text-emerald-300/70">{socioZoom.toFixed(2)}×</span>
              </div>
              <button
                onClick={() => { socioCamRef.current = { zoom: 1, panX: 0, panY: 0 }; setSocioZoom(1); setSocioPanned(false); }}
                className="px-2 py-0.5 rounded text-[8px] font-mono bg-black/50 border border-white/10 text-white/35 hover:text-white/70 transition-colors"
              >
                [R] reset
              </button>
            </div>
          )}
        </div>

        {/* ── Right panel ──────────────────────────────────────────────────── */}
        <div className="w-64 shrink-0 border-l border-zinc-800 bg-zinc-950 flex flex-col overflow-y-auto">

          {/* TOOLS */}
          <Section title="Tools" open={showTools} onToggle={() => setShowTools(v => !v)}>
            <div className="grid grid-cols-2 gap-1">
              {TOOLS.map(t2 => (
                <button key={t2.id}
                  onClick={() => { setTool(t2.id); toolRef.current = t2.id; }}
                  title={t2.desc}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-all"
                  style={tool === t2.id
                    ? { borderColor: t2.color + '60', background: t2.color + '14', color: t2.color }
                    : { borderColor: '#3f3f46', background: 'transparent', color: '#a1a1aa' }}>
                  <span className="text-sm">{t2.icon}</span>
                  <span className="truncate">{t2.label}</span>
                </button>
              ))}
            </div>
            {/* Active tool description */}
            <div className="text-[10px] text-zinc-500 leading-relaxed mt-1 px-0.5">
              {TOOLS.find(t2 => t2.id === tool)?.desc ?? ''}
            </div>
            {/* Auto-symbols toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800 mt-1">
              <div>
                <div className="text-xs text-zinc-300 font-medium">Auto-Emergence</div>
                <div className="text-[9px] text-zinc-600">Engine places symbols autonomously</div>
              </div>
              <button onClick={() => setAutoSymbols(v => !v)}
                className="w-8 h-4 rounded-full transition-all relative shrink-0"
                style={{ background: autoSymbols ? '#a78bfa' : '#3f3f46' }}>
                <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                  style={{ left: autoSymbols ? '17px' : '2px' }} />
              </button>
            </div>
          </Section>

          {/* AGENTS */}
          <Section title="Agents" badge={agentsRef.current.length} open={showAgents} onToggle={() => setShowAgents(v => !v)}>
            <SliderRow label="Count" v={cfgRef.current.agentCount} min={50} max={200} step={10}
              onChange={v => { cfgRef.current.agentCount = v; }} />
            <SliderRow label="Groups" v={cfgRef.current.groupCount} min={2} max={5} step={1}
              onChange={v => { cfgRef.current.groupCount = v; }} />
            <SliderRow label="Speed"  v={cfgRef.current.speed}  min={0.1} max={1.0} step={0.05}
              onChange={v => patchCfg({ speed: v })} />
            <SliderRow label="Autonomy" v={cfgRef.current.autonomy} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ autonomy: v })} />
            <SliderRow label="Cohesion" v={cfgRef.current.cohesion} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ cohesion: v })} />
            <SliderRow label="Aggress." v={cfgRef.current.aggressionBase} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ aggressionBase: v })} />
          </Section>

          {/* INSPECTOR */}
          {inspectorIdx >= 0 && inspectorSnap && (
            <Section title={`Agent #${inspectorIdx}`} badge={inspectorRole} open={showInspect} onToggle={() => setShowInspect(v => !v)}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded-full shrink-0"
                  style={{ background: GROUP_COLORS[inspectorSnap.groupId % GROUP_COLORS.length] }} />
                <span className="text-xs text-zinc-300 font-medium">Group {inspectorSnap.groupId}</span>
                <span className="text-[9px] text-zinc-500 ml-auto capitalize">{inspectorRole}</span>
                <button onClick={() => { setInspectorIdx(-1); setInspectorSnap(null); inspectorIdxRef.current = -1; }}
                  className="text-zinc-600 hover:text-zinc-400 ml-1">
                  <X size={10} />
                </button>
              </div>
              <div className="space-y-1.5">
                <PsychBar label="Belief"    v={inspectorSnap.belief}   c="#34d399" />
                <PsychBar label="Fear"      v={inspectorSnap.fear}     c="#ef4444" />
                <PsychBar label="Desire"    v={inspectorSnap.desire}   c="#fbd38d" />
                <PsychBar label="Status"    v={inspectorSnap.status}   c="#a78bfa" />
                <PsychBar label="Wealth"    v={inspectorSnap.wealth}   c="#fbbf24" />
                <PsychBar label="Fatigue"   v={inspectorSnap.fatigue}  c="#94a3b8" />
              </div>
              <div className="mt-2 pt-2 border-t border-zinc-800">
                <div className="text-[10px] text-zinc-500 mb-1">Ideology (order ↔ freedom)</div>
                <div className="relative h-1.5 bg-zinc-800 rounded-full">
                  <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white transition-all"
                    style={{ left: `calc(${((inspectorSnap.ideology + 1) / 2 * 100).toFixed(0)}% - 4px)` }} />
                  <div className="absolute inset-y-0 left-0 w-1/2 bg-blue-600/30 rounded-l-full" />
                  <div className="absolute inset-y-0 right-0 w-1/2 bg-red-600/30 rounded-r-full" />
                </div>
                <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
                  <span>Order</span><span>{inspectorSnap.ideology.toFixed(2)}</span><span>Freedom</span>
                </div>
              </div>
            </Section>
          )}

          {/* SYMBOLS */}
          <Section title="Symbols" badge={symTotal} open={showSymbols} onToggle={() => setShowSymbols(v => !v)}>
            {symTotal === 0 && (
              <div className="text-[10px] text-zinc-600 text-center py-2">
                No symbols placed.<br />Select a tool and click the canvas.
              </div>
            )}
            {syms.totems.map(t2 => (
              <SymRow key={t2.id}
                icon={t2.kind === 'BOND' ? '⊕' : '⊖'}
                label={`${t2.kind} Totem`}
                sub={t2.id.startsWith('auto-') ? 'auto-emerged' : 'manual'}
                color={t2.kind === 'BOND' ? '#34d399' : '#ff6b6b'}
                onRemove={() => { syms.totems = syms.totems.filter(x => x.id !== t2.id); setSymbolsVer(v => v + 1); }} />
            ))}
            {syms.tabus.map(t2 => (
              <SymRow key={t2.id}
                icon={t2.kind === 'NO_ENTER' ? 'X' : '×'}
                label={`Tabu ${t2.kind}`}
                sub={t2.id.startsWith('auto-') ? 'auto-emerged' : 'manual'}
                color="#ef4444"
                onRemove={() => { syms.tabus = syms.tabus.filter(x => x.id !== t2.id); setSymbolsVer(v => v + 1); }} />
            ))}
            {syms.rituals.map(r2 => (
              <SymRow key={r2.id}
                icon={r2.kind === 'GATHER' ? '◎' : '|'}
                label={`${r2.kind} Ritual`}
                sub={r2.id.startsWith('auto-') ? 'auto-emerged' : 'manual'}
                color="#a78bfa"
                onRemove={() => { syms.rituals = syms.rituals.filter(x => x.id !== r2.id); setSymbolsVer(v => v + 1); }} />
            ))}
            {symTotal > 0 && (
              <button onClick={() => { symbolsRef.current = createStudySymbols(); resetFields(fieldsRef.current); setSymbolsVer(v => v + 1); }}
                className="w-full text-[10px] text-red-400/50 hover:text-red-400/80 border border-red-400/15 hover:border-red-400/30 rounded-md py-1 mt-1 transition-all">
                Clear all symbols
              </button>
            )}
          </Section>

          {/* READOUT */}
          <Section title="Readout" open={showReadout} onToggle={() => setShowReadout(v => !v)}>
            {/* Metrics bars */}
            <div className="space-y-1.5 mb-3">
              <PsychBar label="Cohesion"     v={metricsUI.cohesion}     c="#34d399" />
              <PsychBar label="Polariz."     v={metricsUI.polarization} c="#fbd38d" />
              <PsychBar label="Conflict"     v={metricsUI.conflict}     c="#ef4444" />
              <PsychBar label="Consensus"    v={metricsUI.consensus}    c="#a78bfa" />
            </div>

            {/* Economy */}
            <div className="border-t border-zinc-800 pt-2 mb-3">
              <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1.5">Economy</div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Mean Wealth</span>
                  <span className="text-yellow-400 font-mono">{(wsUI.meanWealth * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Gini Index</span>
                  <span className={`font-mono ${wsUI.gini > 0.55 ? 'text-red-400' : wsUI.gini > 0.35 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {wsUI.gini.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Violations/min</span>
                  <span className={`font-mono ${wsUI.violationsWindow > 2 ? 'text-red-400' : 'text-zinc-400'}`}>
                    {wsUI.violationsWindow}
                  </span>
                </div>
              </div>
            </div>

            {/* Chronicle */}
            {eventsUI.length > 0 && (
              <div className="border-t border-zinc-800 pt-2">
                <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1.5">Chronicle</div>
                <div className="space-y-1">
                  {eventsUI.slice(0, 12).map((ev, i) => (
                    <div key={i} className="flex gap-1.5 items-baseline">
                      <span className="text-xs shrink-0">{ev.icon}</span>
                      <span className="text-[10px] leading-tight" style={{ color: ev.color }}>{ev.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Role + Field legend */}
          <div className="px-3 py-3 border-t border-zinc-800 mt-auto">
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <LegRow sym="◯◯" label="Leader"    c="#fbbf24" />
              <LegRow sym="▲"  label="Aggressor" c="#ef4444" />
              <LegRow sym="⊙"  label="Guardian"  c="#fbd38d" />
              <LegRow sym="·"  label="Mediator"  c="#94a3b8" />
            </div>
            <div className="mt-2 pt-2 border-t border-zinc-800 grid grid-cols-3 gap-1">
              <FieldLeg c="#34d399" label="N" title="Norma" />
              <FieldLeg c="#a78bfa" label="L" title="Legit." />
              <FieldLeg c="#fbbf24" label="R" title="Recurso" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function MetricBar({ label, v, c }: { label: string; v: number; c: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-400 text-xs w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(v * 100).toFixed(0)}%`, background: c }} />
      </div>
      <span className="text-[10px] font-mono w-5 text-right" style={{ color: c }}>{(v * 100).toFixed(0)}</span>
    </div>
  );
}

function SliderRow({ label, v, min, max, step, onChange }: {
  label: string; v: number; min: number; max: number; step: number; onChange: (n: number) => void;
}) {
  const [val, setVal] = useState(v);
  useEffect(() => { setVal(v); }, [v]);
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-500 text-[10px] w-14 shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={e => { const n = parseFloat(e.target.value); setVal(n); onChange(n); }}
        className="flex-1 h-px bg-zinc-700 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-300" />
      <span className="text-[10px] font-mono text-zinc-400 w-6 text-right shrink-0">
        {step >= 1 ? Math.round(val) : val.toFixed(2)}
      </span>
    </div>
  );
}

function SymRow({ icon, label, sub, color, onRemove }: {
  icon: string; label: string; sub: string; color: string; onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span style={{ color }} className="text-sm shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-zinc-300">{label}</div>
        <div className="text-[9px] text-zinc-600">{sub}</div>
      </div>
      <button onClick={onRemove} className="text-zinc-600 hover:text-red-400 transition-colors">
        <X size={9} />
      </button>
    </div>
  );
}

function LegRow({ sym, label, c }: { sym: string; label: string; c: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs w-4 text-center shrink-0" style={{ color: c }}>{sym}</span>
      <span className="text-[10px] text-zinc-500">{label}</span>
    </div>
  );
}

function FieldLeg({ c, label, title }: { c: string; label: string; title: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: c, opacity: 0.75 }} />
      <div>
        <div className="text-[9px] font-semibold" style={{ color: c }}>{label}</div>
        <div className="text-[8px] text-zinc-600">{title}</div>
      </div>
    </div>
  );
}

function FChip({ c, label }: { c: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c, opacity: 0.7 }} />
      <span className="text-[10px]" style={{ color: c, opacity: 0.75 }}>{label}</span>
    </div>
  );
}