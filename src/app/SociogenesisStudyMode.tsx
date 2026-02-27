// ─── Sociogenesis Study Mode ───────────────────────────────────────────────────
// Symbols as Laws · 20 presets · dropdown HUD · agent inspector · auto-emergence

import React, { useEffect, useRef, useState, useCallback } from 'react';

const MONO = "'IBM Plex Mono', monospace";
const DOTO = "'Doto', monospace";
import { Play, Pause, RotateCcw, ArrowLeft, ChevronDown, X } from 'lucide-react';
import { CanvasRecorder, RecorderState } from './components/recording/canvasRecorder';
import { RecordingButton } from './components/recording/RecordingButton';
import {
  createStudyConfig, createStudyMetrics, createStudySymbols, createStudyWorldState,
  GROUP_COLORS, defaultGroupProfiles,
  type StudyAgent, type StudyConfig, type StudyMetrics, type StudyPhase,
  type StudySymbols, type StudyTotem, type StudyTabu, type StudyRitual,
  type StudyLens, type StudyTool, type StudyWorldState, type StudySpawnLayout,
  type StudyPing, type StudyEvent,
  type GroupProfile,
} from '../sim/study/studyTypes';
import {
  spawnStudyAgents, microTick, macroTick,
  computeStudyMetrics, computeAgentRoles, buildMicroGrid,
  type AgentRole,
} from '../sim/study/studyEngine';
import { renderStudy, type StudyVisualConfig, defaultVisualConfig } from '../sim/study/studyRenderer';
import {
  createSocialFields, createSocialFieldConfig, resetFields,
  type SocialFields, type SocialFieldConfig,
} from '../sim/study/socialFields';
import { STUDY_SCENARIOS, SCENARIO_CATEGORIES, type StudyScenario } from '../sim/study/studyScenarios';
import { archetypeKeyToColor, archetypeKeyToLabel, computeArchetypeKey } from '../sim/study/studyArchetypes';
import {
  getPhaseLabel,
  getRoleLabel,
  getTotemLabel,
  getTabuLabel,
  getRitualLabel,
  getEventSociologicalLabel,
  archetypeKeyToSociologicalLabel,
  TOOL_SOCIOLOGICAL_LABELS,
  getPhaseCodex,
  METRIC_LABELS,
} from '../sim/study/studySociologicalLexicon';

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
  FERVOR: '#ff4500', ECO_CRISIS: '#8b4513', TRANSCENDENCE: '#00d4aa',
};
const PHASE_ICONS: Record<string, string> = {
  SWARM: '◉', CLUSTERS: '⊕', POLARIZED: '⊖', CONFLICT: '!', CONSENSUS: '◎', EXCEPTION: '!',
  FERVOR: '🔥', ECO_CRISIS: '🌍', TRANSCENDENCE: '✦',
};

const TOOLS: { id: StudyTool; icon: string; label: string; desc: string; color: string }[] = [
  { id: 'select',            icon: '◇', label: 'Select',      color: '#94a3b8', desc: 'Click agent to inspect' },
  { id: 'spawn_agent',       icon: '+', label: 'Spawn',       color: '#60a5fa', desc: 'Place agents 1-by-1 (template or custom archetype)' },
  { id: 'totem_bond',        icon: '⊕', label: 'Bond Totem',  color: '#34d399', desc: 'N+L deposit · grows leaders · draws believers' },
  { id: 'totem_rift',        icon: '⊖', label: 'Rift Totem',  color: '#ff6b6b', desc: 'Anti-N · factional L · drives polarization' },
  { id: 'totem_oracle',      icon: '🔮', label: 'Oracle',      color: '#c084fc', desc: 'High L deposit · amplifies charismatic authority' },
  { id: 'totem_archive',     icon: '📜', label: 'Archive',     color: '#94a3b8', desc: 'Preserves N/L against decay · collective memory' },
  { id: 'totem_panopticon',  icon: '👁', label: 'Panopticon',  color: '#fbbf24', desc: 'Max N visibility · forces conformity but sparks resistance' },
  { id: 'tabu_enter',        icon: 'X',  label: 'No-Enter',   color: '#ef4444', desc: 'Fear pulse on entry · moral panic risk' },
  { id: 'tabu_mix',          icon: '×',  label: 'No-Mix',     color: '#f97316', desc: 'Cross-group repulsion · promotes endogamy' },
  { id: 'ritual_gather',     icon: '◎', label: 'Gather',      color: '#a78bfa', desc: 'Periodic consensus · N+L deposit · costs fatigue' },
  { id: 'ritual_procession', icon: '|', label: 'Procession', color: '#fbd38d', desc: 'Discipline march · N boost · raises leader power' },
  { id: 'ritual_offering',   icon: '🎁', label: 'Offering',   color: '#fbbf24', desc: 'Redistributes R in radius · reduces inequality' },
  { id: 'ritual_revolt',     icon: '🔥', label: 'Revolt',     color: '#ef4444', desc: 'Destroys N · driven by high resistance & desire' },
];

const LENSES: { id: StudyLens; label: string; desc: string }[] = [
  { id: 'off',     label: 'Off',     desc: 'Plain canvas' },
  { id: 'groups',  label: 'Groups',  desc: 'Group color + psychology rings + roles' },
  { id: 'archetype', label: 'Archetype', desc: 'Unique color per archetype-combination (not start groups)' },
  { id: 'power',   label: 'Power',   desc: 'L/N fields + status auras + fear tint' },
  { id: 'economy', label: 'Economy', desc: 'R field + wealth halos (top 10)' },
  { id: 'events',  label: 'Events',  desc: 'Event pings only' },
  { id: 'field',   label: 'Fields',  desc: 'All 3 fields: N=green L=violet R=gold' },
  { id: 'morin',   label: 'Morin',   desc: 'Complexity: perception/hybris/fervor/ethics/eco' },
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
        style={{ fontFamily: MONO }}
        className="flex items-center gap-1.5 px-2.5 py-1 border border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white/90 hover:border-white/20 transition-all text-[10px] tracking-wide">
        {icon} {label} <ChevronDown size={9} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute top-full mt-1 z-50 min-w-[200px] overflow-hidden ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ background: 'rgba(4,6,10,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}
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
      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors"
      style={{ fontFamily: MONO, background: active ? 'rgba(255,255,255,0.05)' : '' }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = ''; }}>
      {icon && <span className="text-[11px] shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-[10px]" style={{ color: active ? (color || 'rgba(255,255,255,0.90)') : 'rgba(255,255,255,0.55)' }}>{label}</div>
        {sub && <div className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>{sub}</div>}
      </div>
      {active && <div className="w-1 h-1 rounded-full shrink-0" style={{ background: color || '#a78bfa' }} />}
    </button>
  );
}

function DropSep({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 text-[8px] uppercase tracking-[0.15em] mt-1 pt-2"
      style={{ color: 'rgba(255,255,255,0.20)', borderTop: '1px solid rgba(255,255,255,0.05)', fontFamily: MONO }}>
      {label}
    </div>
  );
}

// ── PsychBar (horizontal mini bar) ──────────────────────────────────────────
function PsychBar({ label, v, c }: { label: string; v: number; c: string }) {
  return (
    <div className="flex items-center gap-2" style={{ fontFamily: MONO }}>
      <span className="text-[9px] w-14 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      <div className="flex-1 h-px rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full transition-all duration-300" style={{ width: `${(v * 100).toFixed(0)}%`, background: c }} />
      </div>
      <span className="text-[9px] w-7 text-right shrink-0" style={{ color: 'rgba(255,255,255,0.45)' }}>{(v * 100).toFixed(0)}</span>
    </div>
  );
}

// ── Collapsible panel section ──────────────────────────────────────────────
function Section({ title, badge, open, onToggle, children }: {
  title: string; badge?: string | number; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <button onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 transition-colors min-w-0"
        style={{ fontFamily: MONO }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}>
        <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.12em] min-w-0 truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {title}
          {badge !== undefined && (
            <span className="text-[8px] px-1 py-px shrink-0" style={{ color: 'rgba(255,255,255,0.30)', background: 'rgba(255,255,255,0.06)' }}>{badge}</span>
          )}
        </span>
        <ChevronDown size={10} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'rgba(255,255,255,0.20)' }} />
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
  const [lens, setLens]           = useState<StudyLens>('archetype');
  const lensRef                   = useRef<StudyLens>('archetype');
  const [tool, setTool]           = useState<StudyTool>('select');
  const toolRef                   = useRef<StudyTool>('select');
  const [scenario, setScenario]   = useState('discipline_state');
  const [seed, setSeed]           = useState<number>(() => ((Date.now() >>> 0) % 1_000_000_000));
  const seedRef                   = useRef<number>(seed);
  const [spawnLayout, setSpawnLayout] = useState<StudySpawnLayout>('separated_clusters');
  const spawnLayoutRef            = useRef<StudySpawnLayout>('separated_clusters');
  const [spawnTemplate, setSpawnTemplate] = useState<'neutral' | 'leader' | 'authority' | 'dictator' | 'priest' | 'rebel'>('neutral');
  const [spawnAdvanced, setSpawnAdvanced] = useState(false);
  const [spawnCustom, setSpawnCustom] = useState({
    belief: 0.45,
    fear: 0.18,
    desire: 0.35,
    resistance: 0.18,
    status: 0.18,
    wealth: 0.25,
    aggression: 0.30,
    trust: 0.55,
    need: 0.60,
    conformity: 0.45,
    empathy: 0.30,
    charisma: 0.22,
    ideology: 0.0,
  });
  const [spawnGroupId, setSpawnGroupId] = useState(0);
  const [spawnMemeId, setSpawnMemeId] = useState(0);
  const [metricsUI, setMetricsUI] = useState<StudyMetrics>(createStudyMetrics());
  const [wsUI, setWsUI]           = useState<StudyWorldState>(createStudyWorldState());
  const [eventsUI, setEventsUI]   = useState<StudyEvent[]>([]);
  const [leadersUI, setLeadersUI] = useState<Array<{ idx: number; score: number; role: AgentRole; color: string; label: string }>>([]);
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
  const [showDynamics, setShowDyn]      = useState(false);
  const [showSymbols,  setShowSymbols]  = useState(true);
  const [showInspect,  setShowInspect]  = useState(true);
  const [showReadout,  setShowReadout]  = useState(true);

  // Auto-symbols toggle
  const [autoSymbols, setAutoSymbols] = useState(true);

  // Visual config
  const visualCfgRef = useRef<StudyVisualConfig>({ ...defaultVisualConfig });
  const [, setVisualVer] = useState(0);
  const [showVisual, setShowVisual] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showCodex, setShowCodex] = useState(false);
  const [archetypesUI, setArchetypesUI] = useState<Array<{ key: number; count: number; color: string; label: string }>>([]);
  const lastPhaseRef = useRef<string>('');
  const patchVisual = (p: Partial<StudyVisualConfig>) => {
    Object.assign(visualCfgRef.current, p);
    setVisualVer(v => v + 1);
  };

  useEffect(() => {
    const fn = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => { seedRef.current = seed; }, [seed]);
  useEffect(() => { spawnLayoutRef.current = spawnLayout; }, [spawnLayout]);
  const spawnTemplateRef = useRef(spawnTemplate);
  const spawnAdvancedRef = useRef(spawnAdvanced);
  const spawnCustomRef   = useRef(spawnCustom);
  const spawnGroupIdRef  = useRef(spawnGroupId);
  const spawnMemeIdRef   = useRef(spawnMemeId);
  useEffect(() => { spawnTemplateRef.current = spawnTemplate; }, [spawnTemplate]);
  useEffect(() => { spawnAdvancedRef.current = spawnAdvanced; }, [spawnAdvanced]);
  useEffect(() => { spawnCustomRef.current = spawnCustom; }, [spawnCustom]);
  useEffect(() => { spawnGroupIdRef.current = spawnGroupId; }, [spawnGroupId]);
  useEffect(() => { spawnMemeIdRef.current = spawnMemeId; }, [spawnMemeId]);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetWorld = useCallback((scId: string, keepAutoSymbols?: boolean) => {
    const sc: StudyScenario = STUDY_SCENARIOS.find(s => s.id === scId) ?? STUDY_SCENARIOS[0];
    const newCfg    = createStudyConfig();
    const newFCfg   = createSocialFieldConfig();
    sc.apply(newCfg, newFCfg);
    if (keepAutoSymbols !== undefined) newCfg.autoSymbols = keepAutoSymbols;
    if (newCfg.groupProfiles.length !== newCfg.groupCount) {
      newCfg.groupProfiles = defaultGroupProfiles(newCfg.groupCount);
    }
    cfgRef.current    = newCfg;
    fieldCfgRef.current = newFCfg;

    const rng = makeRng(seedRef.current >>> 0);
    agentsRef.current = spawnStudyAgents(newCfg, rng, spawnLayoutRef.current);
    rolesRef.current  = new Array(agentsRef.current.length).fill('normal');

    const newFields  = createSocialFields();
    const newSymbols = createStudySymbols();
    if (sc.setupWorld) sc.setupWorld(newFields, newSymbols);
    fieldsRef.current  = newFields;
    symbolsRef.current = newSymbols;

    wsRef.current     = createStudyWorldState();
    wsRef.current.rngState = seedRef.current >>> 0;
    pingsRef.current  = [];
    eventsRef.current = [];
    clockRef.current  = { elapsed: 0, lastMacro: -99, lastRole: -99 };

    setMetricsUI(createStudyMetrics());
    setWsUI({ ...wsRef.current });
    setEventsUI([]);
    setScenario(scId);
    setAutoSymbols(newCfg.autoSymbols);
    setSymbolsVer(v => v + 1);
    setInspectorIdx(-1);
    setInspectorSnap(null);
    inspectorIdxRef.current = -1;

    const archCounts = new Map<number, number>();
    for (const a of agentsRef.current) {
      const k = (a.archKeyStable >>> 0) || computeArchetypeKey(a);
      archCounts.set(k, (archCounts.get(k) ?? 0) + 1);
    }
    const topArch = Array.from(archCounts.entries())
      .map(([key, count]) => ({ key, count, color: archetypeKeyToColor(key), label: archetypeKeyToSociologicalLabel(key) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setArchetypesUI(topArch);
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

        const grid = buildMicroGrid(agentsRef.current, cfgRef.current.worldHalf);
        microTick(agentsRef.current, grid, cfgRef.current, wsRef.current, dt);

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

          // Top leaders panel (stable identity color + role label)
          const ranked = agentsRef.current
            .map((a, idx) => {
              const role = rolesRef.current[idx] ?? 'normal';
              const roleBoost =
                role === 'leader'    ? 0.20 :
                role === 'dictator'  ? 0.18 :
                role === 'authority' ? 0.14 :
                role === 'priest'    ? 0.10 :
                role === 'rebel'     ? 0.08 :
                role === 'artist'    ? 0.06 :
                role === 'innovator' ? 0.06 :
                role === 'predator'  ? 0.04 :
                0;
              const score = a.centrality * 0.55 + a.status * 0.35 + a.charisma * 0.25 - a.fear * 0.08 + roleBoost;
              const k = (a.archKeyStable >>> 0) || computeArchetypeKey(a);
              return { idx, score, role, color: archetypeKeyToColor(k), label: archetypeKeyToSociologicalLabel(k) };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 6);
          setLeadersUI(ranked);

          // Top archetypes present (species/culture/niche) for dynamic legend
          const archCounts = new Map<number, number>();
          for (const a of agentsRef.current) {
            const k = (a.archKeyStable >>> 0) || computeArchetypeKey(a);
            archCounts.set(k, (archCounts.get(k) ?? 0) + 1);
          }
          const topArch = Array.from(archCounts.entries())
            .map(([key, count]) => ({ key, count, color: archetypeKeyToColor(key), label: archetypeKeyToSociologicalLabel(key) }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
          setArchetypesUI(topArch);
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
        { ...defaultVisualConfig, ...visualCfgRef.current },
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
    if (t === 'totem_bond' || t === 'totem_rift' || t === 'totem_oracle' || t === 'totem_archive' || t === 'totem_panopticon') {
      const kindMap: Record<string, StudyTotem['kind']> = { totem_bond: 'BOND', totem_rift: 'RIFT', totem_oracle: 'ORACLE', totem_archive: 'ARCHIVE', totem_panopticon: 'PANOPTICON' };
      const colorMap: Record<string, string> = { BOND: '#34d399', RIFT: '#ff6b6b', ORACLE: '#c084fc', ARCHIVE: '#94a3b8', PANOPTICON: '#fbbf24' };
      const iconMap: Record<string, string> = { BOND: '⊕', RIFT: '⊖', ORACLE: '🔮', ARCHIVE: '📜', PANOPTICON: '👁' };
      const kind = kindMap[t];
      const item: StudyTotem = { id: uid(), kind, x: wx, y: wy, radius: 0.26, groupId: 0, pulseStrength: 0.85, bornAt: now };
      syms.totems = [...syms.totems, item];
      eventsRef.current = [{ time: now, icon: iconMap[kind], message: `${kind} Totem placed`, color: colorMap[kind] }, ...eventsRef.current].slice(0, 30);
      setEventsUI([...eventsRef.current]);
    } else if (t === 'tabu_enter' || t === 'tabu_mix') {
      const item: StudyTabu = { id: uid(), kind: t === 'tabu_enter' ? 'NO_ENTER' : 'NO_MIX', x: wx, y: wy, radius: 0.20, severity: 0.6, bornAt: now, violationCount: 0 };
      syms.tabus = [...syms.tabus, item];
      eventsRef.current = [{ time: now, icon: 'X', message: `Taboo ${item.kind} declared`, color: '#ef4444' }, ...eventsRef.current].slice(0, 30);
      setEventsUI([...eventsRef.current]);
    } else if (t === 'ritual_gather' || t === 'ritual_procession' || t === 'ritual_offering' || t === 'ritual_revolt') {
      const kindMap2: Record<string, StudyRitual['kind']> = { ritual_gather: 'GATHER', ritual_procession: 'PROCESSION', ritual_offering: 'OFFERING', ritual_revolt: 'REVOLT' };
      const colorMap2: Record<string, string> = { GATHER: '#a78bfa', PROCESSION: '#fbd38d', OFFERING: '#fbbf24', REVOLT: '#ef4444' };
      const iconMap2: Record<string, string> = { GATHER: '◎', PROCESSION: '|', OFFERING: '🎁', REVOLT: '🔥' };
      const kind2 = kindMap2[t];
      const item: StudyRitual = { id: uid(), kind: kind2, x: wx, y: wy, radius: 0.30, periodSec: 7, lastFired: now, active: false, bornAt: now };
      syms.rituals = [...syms.rituals, item];
      eventsRef.current = [{ time: now, icon: iconMap2[kind2], message: `${kind2} Ritual founded`, color: colorMap2[kind2] }, ...eventsRef.current].slice(0, 30);
      setEventsUI([...eventsRef.current]);
    }
    setSymbolsVer(v => v + 1);
  }, []);

  const patchCfg = (patch: Partial<StudyConfig>) => { Object.assign(cfgRef.current, patch); };

  const { phase } = metricsUI;
  const phaseColor = PHASE_COLORS[phase] ?? '#fff';

  useEffect(() => {
    if (phase !== lastPhaseRef.current) {
      lastPhaseRef.current = phase;
      setShowCodex(true);
    }
  }, [phase]);
  const canvasW = Math.max(400, dims.w - 256);
  const canvasH = Math.max(300, dims.h - 40);
  const syms = symbolsRef.current;
  const symTotal = syms.totems.length + syms.tabus.length + syms.rituals.length;
  const currentScenario = STUDY_SCENARIOS.find(s => s.id === scenario) ?? STUDY_SCENARIOS[0];

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
          `fase: ${metricsRef.current?.phase ?? '—'}  ·  agentes: ${agentsRef.current.length}`,
          `coesão: ${(metricsRef.current.cohesion * 100).toFixed(0)}%  polariz.: ${(metricsRef.current.polarization * 100).toFixed(0)}%  conflito: ${(metricsRef.current.conflict * 100).toFixed(0)}%`,
          `lens: ${lensRef.current}  ·  cenário: ${scenario}`,
          `totens: ${symbolsRef.current.totems.length}  tabus: ${symbolsRef.current.tabus.length}  rituais: ${symbolsRef.current.rituals.length}`,
        ],
      }),
    );
  }, [scenario]);

  const handleRecStop = useCallback(() => recorderRef.current?.stop(), []);

  return (
    <div className="fixed inset-0 z-20 flex flex-col overflow-hidden select-none" style={{ background: '#000', fontFamily: MONO }}>

      {/* ── Exception banner ───────────────────────────────────────────────── */}
      {wsUI.exceptionActive && (
        <div className="h-7 flex items-center justify-center gap-3 shrink-0 animate-pulse"
          style={{ background: 'rgba(239,68,68,0.15)', borderBottom: '1px solid rgba(239,68,68,0.30)' }}>
          <span className="text-xs text-red-400 font-semibold tracking-widest uppercase">STATE OF EXCEPTION</span>
          <span className="text-[10px] text-red-400/50">N field surging · policing active</span>
        </div>
      )}

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 h-10 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.95)' }}>

        {onLeave && (
          <button onClick={onLeave}
            className="flex items-center gap-1.5 px-2.5 py-1 border transition-all text-[10px]"
            style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', fontFamily: MONO }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.80)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.20)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}>
            <ArrowLeft size={10} /> Exit
          </button>
        )}

        <span className="text-[10px] hidden md:block" style={{ color: 'rgba(255,255,255,0.20)', fontFamily: DOTO, letterSpacing: '0.08em' }}>SOCIOGENESIS</span>
        <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Sim dropdown */}
        <Dropdown label={paused ? 'Paused' : 'Running'} icon={paused ? <Pause size={11} /> : <Play size={11} />}>
          <div className="py-1">
            <DropItem icon={paused ? '▶' : '⏸'} label={paused ? 'Run' : 'Pause'}
              onClick={() => { const n = !paused; setPaused(n); pausedRef.current = n; }} />
            <DropItem icon="↺" label="Reset Scenario"
              onClick={() => resetWorld(scenario, autoSymbols)} />
            <div className="px-3 py-2 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', fontFamily: MONO }}>
              <div className="text-[9px] mb-1.5" style={{ color: 'rgba(255,255,255,0.30)' }}>macroTick interval</div>
              <div className="flex items-center gap-2">
                <input type="range" min={0.5} max={2.5} step={0.1} defaultValue={1.0}
                  onChange={e => patchCfg({ macroTickSec: parseFloat(e.target.value) })}
                  className="flex-1 h-px appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/60"
                  style={{ background: 'rgba(255,255,255,0.10)' }} />
                <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.40)' }}>1.0s</span>
              </div>
            </div>
          </div>
        </Dropdown>

        {/* Scenario dropdown — grouped by category (Campos Sociais first = guildas, metrópoles, sociedades) */}
        <Dropdown label={currentScenario ? `${currentScenario.icon} ${currentScenario.name}` : 'Cenário'}>
          <div className="py-1 max-h-80 overflow-y-auto">
            {(['multi-field', 'genesis', 'conflict', 'economy', 'culture', 'power'] as const).map(cat => {
              const items = STUDY_SCENARIOS.filter(s => s.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <DropSep label={cat === 'multi-field' ? 'Campos Sociais (Guildas, Metrópoles, Sociedades)' : SCENARIO_CATEGORIES[cat]} />
                  {items.map(sc => (
                    <DropItem key={sc.id} icon={sc.icon} label={sc.name} sub={sc.description}
                      active={scenario === sc.id}
                      onClick={() => { setScenario(sc.id); resetWorld(sc.id, autoSymbols); }} />
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

        {/* Seed button */}
        <button
          title={`Seed atual: ${seed} — clique para novo seed aleatório`}
          onClick={() => {
            const newSeed = (Math.random() * 0xffffffff) >>> 0;
            seedRef.current = newSeed;
            setSeed(newSeed);
            resetWorld(scenario, autoSymbols);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 border transition-all text-[10px]"
          style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', fontFamily: MONO }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(167,139,250,0.45)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}>
          🎲 <span style={{ color: 'rgba(167,139,250,0.65)', fontSize: 8 }}>{seed % 1000000}</span>
        </button>

        <div className="flex-1" />

        {/* Phase + Scenario chip — deixa claro qual sociedade (guildas, metrópole, etc.) */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 px-2.5 py-0.5 border"
            style={{ borderColor: phaseColor + '35', background: phaseColor + '0e', fontFamily: MONO }}>
            <span className="text-[10px]">{PHASE_ICONS[phase]}</span>
            <span className="text-[9px] uppercase tracking-[0.12em]" style={{ color: phaseColor }} title={phase}>{getPhaseLabel(phase)}</span>
          </div>
          {currentScenario && (
            <div className="text-[8px] uppercase tracking-wider px-2 py-0.5" style={{ fontFamily: MONO, color: 'rgba(255,255,255,0.35)' }} title={currentScenario.description}>
              {currentScenario.icon} {currentScenario.name}
              {currentScenario.category === 'multi-field' ? ' · Campos Sociais' : ` · ${SCENARIO_CATEGORIES[currentScenario.category] ?? ''}`}
            </div>
          )}
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

          {/* Phase + codex + bars — bottom left */}
          <div className="absolute bottom-5 left-5 pointer-events-auto">
            {/* Phase title: click toggles codex card */}
            <button
              type="button"
              onClick={() => { setShowCodex(v => !v); lastPhaseRef.current = phase; }}
              className="text-left block w-full mb-2 rounded-lg border transition-all px-3 py-2"
              style={{
                borderColor: phaseColor + '40',
                background: phaseColor + '0c',
                color: phaseColor,
              }}
            >
              <div className="text-2xl font-light tracking-widest uppercase" style={{ letterSpacing: '0.2em', textShadow: `0 0 20px ${phaseColor}44` }}>
                {getPhaseLabel(phase)}
              </div>
              <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Clique para ver o codex
              </div>
            </button>

            {/* Metric bars — labels from METRIC_LABELS; title = long description */}
            <div className="space-y-2.5 w-60">
              <MetricBar label={METRIC_LABELS.cohesion?.short ?? 'Coesão'} v={metricsUI.cohesion} c="#34d399" title={METRIC_LABELS.cohesion?.long} />
              <MetricBar label={METRIC_LABELS.polarization?.short ?? 'Polarização'} v={metricsUI.polarization} c="#fbd38d" title={METRIC_LABELS.polarization?.long} />
              <MetricBar label={METRIC_LABELS.conflict?.short ?? 'Conflito'} v={metricsUI.conflict} c="#ef4444" title={METRIC_LABELS.conflict?.long} />
              <MetricBar label={METRIC_LABELS.consensus?.short ?? 'Consenso'} v={metricsUI.consensus} c="#a78bfa" title={METRIC_LABELS.consensus?.long} />
            </div>

            {/* Codex card — didactic explanation of current phase */}
            {showCodex && (
              <PhaseCodexCard
                phase={phase}
                phaseColor={phaseColor}
                onClose={() => setShowCodex(false)}
              />
            )}
          </div>

          {/* Group + Archetype legend — bottom right (dynamic by species/culture/niche) */}
          <div className="absolute bottom-5 right-5 flex flex-col items-end gap-3 pointer-events-none max-w-[200px]">
            {/* Símbolos sobre agentes (papéis / roles) — o que são os ícones em cima dos agentes */}
            <div className="flex flex-col items-end gap-0.5">
              <div className="text-[8px] uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: MONO }} title="Ícones que aparecem em cima de alguns agentes">Símbolos sobre agentes</div>
              {([
                { role: 'leader' as const, sym: '●', color: '#fbbf24' },
                { role: 'authority' as const, sym: '◆', color: '#60a5fa' },
                { role: 'dictator' as const, sym: '▲', color: '#ef4444' },
                { role: 'aggressor' as const, sym: '×', color: '#ef4444' },
                { role: 'guardian' as const, sym: '■', color: '#fbd38d' },
                { role: 'mediator' as const, sym: '·', color: '#fff' },
                { role: 'rebel' as const, sym: '⁄', color: '#f87171' },
                { role: 'priest' as const, sym: '○', color: '#c084fc' },
              ]).map(({ role, sym, color }) => (
                <div key={role} className="flex items-center gap-2" style={{ fontFamily: MONO }}>
                  <span className="text-[9px] text-right" style={{ color: 'rgba(255,255,255,0.5)' }}>{getRoleLabel(role)}</span>
                  <span className="text-[10px] shrink-0" style={{ color }} title={getRoleLabel(role, true)}>{sym}</span>
                </div>
              ))}
            </div>
            {/* Groups (sociedades / nichos) */}
            <div className="flex flex-col items-end gap-1">
              <div className="text-[8px] uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: MONO }}>Grupos</div>
              {Array.from({ length: cfgRef.current.groupCount }).map((_, g) => {
                const profiles = cfgRef.current.groupProfiles ?? defaultGroupProfiles(cfgRef.current.groupCount);
                const gp = profiles[g];
                return (
                  <div key={g} className="flex items-center gap-2" style={{ fontFamily: MONO }}>
                    <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{gp ? gp.name : `G${g}`}</span>
                    <span className="text-[7px] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>{gp?.sphere ?? ''}</span>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: GROUP_COLORS[g] }} />
                  </div>
                );
              })}
            </div>
            {/* Arquétipos presentes (muda conforme simulação) */}
            {archetypesUI.length > 0 && (
              <div className="flex flex-col items-end gap-0.5">
                <div className="text-[8px] uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: MONO }}>Arquétipos presentes</div>
                {archetypesUI.slice(0, 8).map((arch, i) => (
                  <div key={i} className="flex items-center gap-2" style={{ fontFamily: MONO }}>
                    <span className="text-[9px] text-right truncate max-w-[120px]" style={{ color: 'rgba(255,255,255,0.5)' }} title={arch.label}>{arch.label}</span>
                    <span className="text-[8px] shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>{arch.count}</span>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: arch.color }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tool hint */}
          {tool !== 'select' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="flex items-center gap-2 px-3 py-1 border text-[10px]"
                style={{ borderColor: 'rgba(56,189,248,0.25)', background: 'rgba(56,189,248,0.08)', color: 'rgba(186,230,253,0.85)', fontFamily: MONO }}>
                <span>{TOOLS.find(t2 => t2.id === tool)?.icon}</span>
                <span>{TOOL_SOCIOLOGICAL_LABELS[tool]?.short ?? TOOLS.find(t2 => t2.id === tool)?.label}</span>
                <span style={{ color: 'rgba(56,189,248,0.45)' }}>· click to place · Esc to cancel</span>
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
        <div className="w-64 shrink-0 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.92)' }}>

          {/* TOOLS */}
          <Section title="Tools" open={showTools} onToggle={() => setShowTools(v => !v)}>
            <div className="grid grid-cols-2 gap-1">
              {TOOLS.map(t2 => (
                <button key={t2.id}
                  onClick={() => { setTool(t2.id); toolRef.current = t2.id; }}
                  title={TOOL_SOCIOLOGICAL_LABELS[t2.id]?.long ?? t2.desc}
                  className="flex items-center gap-1.5 px-2 py-1.5 border text-[10px] transition-all"
                  style={tool === t2.id
                    ? { borderColor: t2.color + '55', background: t2.color + '12', color: t2.color, fontFamily: MONO }
                    : { borderColor: 'rgba(255,255,255,0.07)', background: 'transparent', color: 'rgba(255,255,255,0.40)', fontFamily: MONO }}>
                  <span className="text-[11px]">{t2.icon}</span>
                  <span className="truncate">{TOOL_SOCIOLOGICAL_LABELS[t2.id]?.short ?? t2.label}</span>
                </button>
              ))}
            </div>
            {/* Active tool description */}
            <div className="text-[9px] leading-relaxed mt-1 px-0.5" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: MONO }}>
              {TOOL_SOCIOLOGICAL_LABELS[tool]?.long ?? TOOLS.find(t2 => t2.id === tool)?.desc ?? ''}
            </div>
            {/* Auto-symbols toggle */}
            <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.60)', fontFamily: MONO }}>Auto-Emergence</div>
                <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.22)', fontFamily: MONO }}>Engine places symbols autonomously</div>
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
            <div className="space-y-2">
              <div className="flex items-center gap-2" style={{ fontFamily: MONO }}>
                <span className="text-[9px] w-12 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>Seed</span>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(Math.max(0, Math.min(2_147_483_647, parseInt(e.target.value || '0', 10) || 0)))}
                  className="flex-1 px-2 py-1 text-[10px] rounded border border-white/[0.08] bg-white/[0.03] text-white/70"
                />
                <button
                  onClick={() => setSeed(((Date.now() >>> 0) % 1_000_000_000))}
                  className="px-2 py-1 rounded text-[9px] border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
                  style={{ fontFamily: MONO, background: 'rgba(255,255,255,0.02)' }}
                >
                  Rand
                </button>
                <button
                  onClick={() => { try { navigator.clipboard?.writeText(String(seedRef.current)); } catch { /* ignore */ } }}
                  className="px-2 py-1 rounded text-[9px] border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
                  style={{ fontFamily: MONO, background: 'rgba(255,255,255,0.02)' }}
                >
                  Copy
                </button>
              </div>

              <div className="flex items-center gap-2" style={{ fontFamily: MONO }}>
                <span className="text-[9px] w-12 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>Start</span>
                <select
                  value={spawnLayout}
                  onChange={(e) => setSpawnLayout(e.target.value as StudySpawnLayout)}
                  className="flex-1 px-2 py-1 text-[10px] rounded border border-white/[0.08]"
                >
                  <option value="unified_center">Unified</option>
                  <option value="separated_clusters">Clusters</option>
                  <option value="corners">Corners</option>
                  <option value="ring">Ring</option>
                  <option value="line">Line</option>
                  <option value="random">Random</option>
                </select>
                <button
                  onClick={() => resetWorld(scenario, autoSymbols)}
                  className="px-2 py-1 rounded text-[9px] border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
                  style={{ fontFamily: MONO, background: 'rgba(255,255,255,0.02)' }}
                >
                  Respawn
                </button>
              </div>
            </div>

            <SliderRow label="Count" v={cfgRef.current.agentCount} min={20} max={600} step={10}
              onChange={v => { cfgRef.current.agentCount = v; }} />
            <SliderRow label="Groups" v={cfgRef.current.groupCount} min={2} max={5} step={1}
              onChange={v => { cfgRef.current.groupCount = v; cfgRef.current.groupProfiles = defaultGroupProfiles(v); }} />
            <SliderRow label="Speed"  v={cfgRef.current.speed}  min={0.1} max={1.0} step={0.05}
              onChange={v => patchCfg({ speed: v })} />
            <SliderRow label="Autonomy" v={cfgRef.current.autonomy} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ autonomy: v })} />
            <SliderRow label="Cohesion" v={cfgRef.current.cohesion} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ cohesion: v })} />
            <SliderRow label="Aggress." v={cfgRef.current.aggressionBase} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ aggressionBase: v })} />
          </Section>

          {/* VISUAL */}
          <Section title="Visual" open={showVisual} onToggle={() => setShowVisual(v => !v)}>
            <SliderRow label="Agent Size" v={visualCfgRef.current.agentScale} min={0.3} max={2.5} step={0.1}
              onChange={v => patchVisual({ agentScale: v })} />
            <SliderRow label="Trail Opacity" v={visualCfgRef.current.trailOpacity} min={0} max={1} step={0.05}
              onChange={v => patchVisual({ trailOpacity: v })} />
            <div className="flex items-center justify-between py-1">
              <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: MONO, color: 'rgba(255,255,255,0.35)' }}>Trails</span>
              <button onClick={() => patchVisual({ showTrails: !visualCfgRef.current.showTrails })}
                className="text-[9px] px-2 py-0.5" style={{
                  fontFamily: MONO, letterSpacing: '0.08em',
                  color: visualCfgRef.current.showTrails ? '#00d4aa' : 'rgba(255,255,255,0.25)',
                  border: `1px dashed ${visualCfgRef.current.showTrails ? '#00d4aa33' : 'rgba(255,255,255,0.08)'}`,
                  background: visualCfgRef.current.showTrails ? '#00d4aa08' : 'transparent',
                }}>{visualCfgRef.current.showTrails ? 'ON' : 'OFF'}</button>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: MONO, color: 'rgba(255,255,255,0.35)' }}>Direction</span>
              <button onClick={() => patchVisual({ showDirection: !visualCfgRef.current.showDirection })}
                className="text-[9px] px-2 py-0.5" style={{
                  fontFamily: MONO, letterSpacing: '0.08em',
                  color: visualCfgRef.current.showDirection ? '#00d4aa' : 'rgba(255,255,255,0.25)',
                  border: `1px dashed ${visualCfgRef.current.showDirection ? '#00d4aa33' : 'rgba(255,255,255,0.08)'}`,
                  background: visualCfgRef.current.showDirection ? '#00d4aa08' : 'transparent',
                }}>{visualCfgRef.current.showDirection ? 'ON' : 'OFF'}</button>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[9px] uppercase tracking-wider" style={{ fontFamily: MONO, color: 'rgba(255,255,255,0.35)' }} title="Linhas entre agentes da mesma família (rizoma)">Conexões família</span>
              <button onClick={() => patchVisual({ showFamilyConnections: !(visualCfgRef.current.showFamilyConnections ?? true) })}
                className="text-[9px] px-2 py-0.5" style={{
                  fontFamily: MONO, letterSpacing: '0.08em',
                  color: (visualCfgRef.current.showFamilyConnections ?? true) ? '#00d4aa' : 'rgba(255,255,255,0.25)',
                  border: `1px dashed ${(visualCfgRef.current.showFamilyConnections ?? true) ? '#00d4aa33' : 'rgba(255,255,255,0.08)'}`,
                  background: (visualCfgRef.current.showFamilyConnections ?? true) ? '#00d4aa08' : 'transparent',
                }}>{(visualCfgRef.current.showFamilyConnections ?? true) ? 'ON' : 'OFF'}</button>
            </div>
          </Section>

          {/* GRUPOS (Bourdieu) */}
          <Section title="Campos Sociais" open={showGroups} onToggle={() => setShowGroups(v => !v)}>
            {(() => {
              const profiles = cfgRef.current.groupProfiles ?? defaultGroupProfiles(cfgRef.current.groupCount);
              if (!cfgRef.current.groupProfiles) cfgRef.current.groupProfiles = profiles;
              return profiles.map((gp, gi) => (
              <div key={gi} className="mb-2 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: GROUP_COLORS[gi] }} />
                  <input
                    className="bg-transparent text-[9px] font-medium tracking-wide w-full outline-none"
                    style={{ fontFamily: MONO, color: 'rgba(255,255,255,0.65)' }}
                    value={gp.name}
                    onChange={e => {
                      cfgRef.current.groupProfiles[gi] = { ...gp, name: e.target.value };
                      setShowGroups(v => v); // force re-render
                    }}
                  />
                  <span className="text-[7px] uppercase tracking-widest flex-shrink-0" style={{ color: 'rgba(255,255,255,0.20)', fontFamily: MONO }}>{gp.sphere}</span>
                </div>
                <SliderRow label="N sens." v={gp.fieldSensitivity.n} min={0} max={2} step={0.1}
                  onChange={v => { cfgRef.current.groupProfiles[gi] = { ...gp, fieldSensitivity: { ...gp.fieldSensitivity, n: v } }; }} />
                <SliderRow label="L sens." v={gp.fieldSensitivity.l} min={0} max={2} step={0.1}
                  onChange={v => { cfgRef.current.groupProfiles[gi] = { ...gp, fieldSensitivity: { ...gp.fieldSensitivity, l: v } }; }} />
                <SliderRow label="R sens." v={gp.fieldSensitivity.r} min={0} max={2} step={0.1}
                  onChange={v => { cfgRef.current.groupProfiles[gi] = { ...gp, fieldSensitivity: { ...gp.fieldSensitivity, r: v } }; }} />
                <SliderRow label="Ideology" v={gp.ideologyBias} min={-1} max={1} step={0.1}
                  onChange={v => { cfgRef.current.groupProfiles[gi] = { ...gp, ideologyBias: v }; }} />
                <SliderRow label="Cohesion" v={gp.cohesionBias} min={0} max={1} step={0.05}
                  onChange={v => { cfgRef.current.groupProfiles[gi] = { ...gp, cohesionBias: v }; }} />
                <SliderRow label="Desire" v={gp.desireBias} min={0} max={1} step={0.05}
                  onChange={v => { cfgRef.current.groupProfiles![gi] = { ...gp, desireBias: v }; }} />
              </div>
            ));
            })()}
          </Section>

          {/* DYNAMICS */}
          <Section title="Dynamics" open={showDynamics} onToggle={() => setShowDyn(v => !v)}>
            <SliderRow label="Conform." v={cfgRef.current.conformity} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ conformity: v })} />
            <SliderRow label="Empathy" v={cfgRef.current.empathy} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ empathy: v })} />
            <SliderRow label="Mobility" v={cfgRef.current.mobility} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ mobility: v })} />
            <SliderRow label="Contagion" v={cfgRef.current.contagion} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ contagion: v })} />
            <SliderRow label="Hierarchy" v={cfgRef.current.hierarchyStrength} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ hierarchyStrength: v })} />
            <SliderRow label="Innovate" v={cfgRef.current.innovationRate} min={0} max={0.30} step={0.01}
              onChange={v => patchCfg({ innovationRate: v })} />
            <SliderRow label="Cooperat." v={cfgRef.current.cooperationBias} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ cooperationBias: v })} />
            <SliderRow label="Inertia" v={cfgRef.current.culturalInertia} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ culturalInertia: v })} />
            <SliderRow label="ArchHold" v={cfgRef.current.archetypeHoldSec} min={0.4} max={5.0} step={0.1}
              onChange={v => patchCfg({ archetypeHoldSec: v })} />
            <SliderRow label="Scarcity" v={cfgRef.current.resourceScarcity} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ resourceScarcity: v })} />
            <SliderRow label="Panoptic." v={cfgRef.current.panopticism} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ panopticism: v })} />
            <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="text-[8px] uppercase tracking-[0.14em] mb-2" style={{ color: '#00d4aa55', fontFamily: MONO }}>Morin · Complexidade</div>
            </div>
            <SliderRow label="Perc.Bias" v={cfgRef.current.perceptionBias} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ perceptionBias: v })} />
            <SliderRow label="Hybris.Th" v={cfgRef.current.hybrisThreshold} min={0.3} max={0.95} step={0.05}
              onChange={v => patchCfg({ hybrisThreshold: v })} />
            <SliderRow label="Fervor.Th" v={cfgRef.current.fervorThreshold} min={0.6} max={1.8} step={0.05}
              onChange={v => patchCfg({ fervorThreshold: v })} />
            <SliderRow label="Ethics" v={cfgRef.current.ethicsGrowth} min={0} max={0.5} step={0.02}
              onChange={v => patchCfg({ ethicsGrowth: v })} />
            <SliderRow label="Underst." v={cfgRef.current.understandingGrowth} min={0} max={0.5} step={0.02}
              onChange={v => patchCfg({ understandingGrowth: v })} />
            <SliderRow label="Eco.Degr" v={cfgRef.current.ecoDegradation} min={0} max={0.3} step={0.01}
              onChange={v => patchCfg({ ecoDegradation: v })} />
            <SliderRow label="Cons.Dec" v={cfgRef.current.consensusDecay} min={0} max={0.2} step={0.01}
              onChange={v => patchCfg({ consensusDecay: v })} />
            <SliderRow label="Boids.Al" v={cfgRef.current.boidsAlignment} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ boidsAlignment: v })} />
            <SliderRow label="Boids.Co" v={cfgRef.current.boidsCohesion} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ boidsCohesion: v })} />
            <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />
            <SliderRow label="Wander" v={cfgRef.current.wander} min={0} max={1} step={0.05}
              onChange={v => patchCfg({ wander: v })} />
            <SliderRow label="ImpulseRt" v={cfgRef.current.impulseRate} min={0} max={2.0} step={0.05}
              onChange={v => patchCfg({ impulseRate: v })} />
            <SliderRow label="ImpulseSt" v={cfgRef.current.impulseStrength} min={0} max={1.0} step={0.05}
              onChange={v => patchCfg({ impulseStrength: v })} />
            <SliderRow label="Overshoot" v={cfgRef.current.goalOvershoot} min={0} max={0.8} step={0.05}
              onChange={v => patchCfg({ goalOvershoot: v })} />
            <SliderRow label="Zigzag" v={cfgRef.current.zigzag} min={0} max={1.0} step={0.05}
              onChange={v => patchCfg({ zigzag: v })} />
          </Section>

          {/* INSPECTOR */}
          {inspectorIdx >= 0 && inspectorSnap && (
            <Section title={`Agent #${inspectorIdx}`} badge={getRoleLabel(inspectorRole)} open={showInspect} onToggle={() => setShowInspect(v => !v)}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ background: GROUP_COLORS[inspectorSnap.groupId % GROUP_COLORS.length] }} />
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: MONO }}>Group {inspectorSnap.groupId}</span>
                <span className="text-[9px] ml-auto" style={{ color: 'rgba(255,255,255,0.30)', fontFamily: MONO }}>{getRoleLabel(inspectorRole, true)}</span>
                <button onClick={() => { setInspectorIdx(-1); setInspectorSnap(null); inspectorIdxRef.current = -1; }}
                  className="ml-1 transition-colors" style={{ color: 'rgba(255,255,255,0.20)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.20)'; }}>
                  <X size={9} />
                </button>
              </div>
              <div className="space-y-1.5">
                <PsychBar label="Belief"    v={inspectorSnap.belief}   c="#34d399" />
                <PsychBar label="Fear"      v={inspectorSnap.fear}     c="#ef4444" />
                <PsychBar label="Desire"    v={inspectorSnap.desire}   c="#fbd38d" />
                <PsychBar label="Status"    v={inspectorSnap.status}   c="#a78bfa" />
                <PsychBar label="Wealth"    v={inspectorSnap.wealth}   c="#fbbf24" />
                <PsychBar label="Fatigue"   v={inspectorSnap.fatigue}  c="#94a3b8" />
                <PsychBar label="Conform."  v={inspectorSnap.conformity} c="#60d0ff" />
                <PsychBar label="Empathy"   v={inspectorSnap.empathy}  c="#ff6b9d" />
                <PsychBar label="Charisma"  v={inspectorSnap.charisma} c="#ffd060" />
                <PsychBar label="Loyalty"   v={inspectorSnap.groupLoyalty} c="#6bcb77" />
              </div>
              <div className="space-y-1.5 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-[8px] uppercase tracking-[0.10em] mb-1" style={{ color: '#00d4aa55', fontFamily: MONO }}>Morin</div>
                <PsychBar label="Percepção"   v={inspectorSnap.perception}    c="#60d0ff" />
                <PsychBar label="Ética"       v={inspectorSnap.ethics}        c="#00d4aa" />
                <PsychBar label="Compreensão" v={inspectorSnap.understanding} c="#34d399" />
                <PsychBar label="Hybris"      v={inspectorSnap.hybris}        c="#ffa000" />
                <PsychBar label="Fervor"      v={inspectorSnap.fervor}        c="#ff4500" />
                <PsychBar label="Eco.Peg."    v={inspectorSnap.ecoFootprint}  c="#8b4513" />
              </div>
              <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', fontFamily: MONO }}>
                <div className="text-[9px] mb-1" style={{ color: 'rgba(255,255,255,0.30)' }}>Ideology (order ↔ freedom)</div>
                <div className="relative h-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/70 transition-all"
                    style={{ left: `calc(${((inspectorSnap.ideology + 1) / 2 * 100).toFixed(0)}% - 4px)` }} />
                  <div className="absolute inset-y-0 left-0 w-1/2" style={{ background: 'rgba(37,99,235,0.25)' }} />
                  <div className="absolute inset-y-0 right-0 w-1/2" style={{ background: 'rgba(220,38,38,0.25)' }} />
                </div>
                <div className="flex justify-between text-[8px] mt-0.5" style={{ color: 'rgba(255,255,255,0.22)' }}>
                  <span>Order</span><span>{inspectorSnap.ideology.toFixed(2)}</span><span>Freedom</span>
                </div>
              </div>
            </Section>
          )}

          {/* SYMBOLS */}
          <Section title="Symbols" badge={symTotal} open={showSymbols} onToggle={() => setShowSymbols(v => !v)}>
            {symTotal === 0 && (
              <div className="text-[9px] text-center py-2" style={{ color: 'rgba(255,255,255,0.20)', fontFamily: MONO }}>
                No symbols placed.<br />Select a tool and click the canvas.
              </div>
            )}
            {syms.totems.map(t2 => {
              const ic: Record<string, string> = { BOND: '⊕', RIFT: '⊖', ORACLE: '🔮', ARCHIVE: '📜', PANOPTICON: '👁' };
              const cl: Record<string, string> = { BOND: '#34d399', RIFT: '#ff6b6b', ORACLE: '#c084fc', ARCHIVE: '#94a3b8', PANOPTICON: '#fbbf24' };
              return (
              <SymRow key={t2.id}
                icon={ic[t2.kind] || '⊕'}
                label={`${t2.kind} Totem`}
                sub={t2.emergent ? 'auto-emerged' : t2.id.startsWith('auto-') ? 'auto-emerged' : 'manual'}
                color={cl[t2.kind] || '#34d399'}
                onRemove={() => { syms.totems = syms.totems.filter(x => x.id !== t2.id); setSymbolsVer(v => v + 1); }} />
              );
            })}
            {syms.tabus.map(t2 => (
              <SymRow key={t2.id}
                icon={t2.kind === 'NO_ENTER' ? 'X' : '×'}
                label={`Tabu ${t2.kind}`}
                sub={t2.id.startsWith('auto-') ? 'auto-emerged' : 'manual'}
                color="#ef4444"
                onRemove={() => { syms.tabus = syms.tabus.filter(x => x.id !== t2.id); setSymbolsVer(v => v + 1); }} />
            ))}
            {syms.rituals.map(r2 => {
              const ic: Record<string, string> = { GATHER: '◎', PROCESSION: '|', OFFERING: '🎁', REVOLT: '🔥' };
              const cl: Record<string, string> = { GATHER: '#a78bfa', PROCESSION: '#fbd38d', OFFERING: '#fbbf24', REVOLT: '#ef4444' };
              return (
              <SymRow key={r2.id}
                icon={ic[r2.kind] || '◎'}
                label={`${r2.kind} Ritual`}
                sub={r2.emergent ? 'auto-emerged' : r2.id.startsWith('auto-') ? 'auto-emerged' : 'manual'}
                color={cl[r2.kind] || '#a78bfa'}
                onRemove={() => { syms.rituals = syms.rituals.filter(x => x.id !== r2.id); setSymbolsVer(v => v + 1); }} />
              );
            })}
            {symTotal > 0 && (
              <button onClick={() => { symbolsRef.current = createStudySymbols(); resetFields(fieldsRef.current); setSymbolsVer(v => v + 1); }}
                className="w-full text-[9px] py-1 mt-1 transition-all"
                style={{ color: 'rgba(239,68,68,0.50)', border: '1px solid rgba(239,68,68,0.15)', fontFamily: MONO }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.80)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.30)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.50)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.15)'; }}>
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

            {/* Morin indices */}
            <div className="pt-2 mb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', fontFamily: MONO }}>
              <div className="text-[8px] uppercase tracking-[0.14em] mb-1.5" style={{ color: '#00d4aa66' }}>Morin · Complexidade</div>
              <div className="space-y-1.5">
                <PsychBar label="Percepção"     v={metricsUI.meanPerception}    c="#60d0ff" />
                <PsychBar label="Ética"         v={metricsUI.meanEthics}        c="#00d4aa" />
                <PsychBar label="Compreensão"   v={metricsUI.meanUnderstanding} c="#34d399" />
                <PsychBar label="Hybris"        v={metricsUI.meanHybris}        c="#ffa000" />
                <PsychBar label="Fervor"        v={metricsUI.meanFervor}        c="#ff4500" />
                <PsychBar label="Eco Saúde"     v={metricsUI.ecoHealth}         c="#8b6914" />
              </div>
            </div>

            {/* Economy */}
            <div className="pt-2 mb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', fontFamily: MONO }}>
              <div className="text-[8px] uppercase tracking-[0.14em] mb-1.5" style={{ color: 'rgba(255,255,255,0.22)' }}>Economy</div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>Mean Wealth</span>
                  <span style={{ color: '#fbbf24' }}>{(wsUI.meanWealth * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>Gini Index</span>
                  <span style={{ color: wsUI.gini > 0.55 ? '#f87171' : wsUI.gini > 0.35 ? '#fbbf24' : '#4ade80' }}>
                    {wsUI.gini.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>Violations/min</span>
                  <span style={{ color: wsUI.violationsWindow > 2 ? '#f87171' : 'rgba(255,255,255,0.45)' }}>
                    {wsUI.violationsWindow}
                  </span>
                </div>
              </div>
            </div>

            {/* Leaders */}
            {leadersUI.length > 0 && (
              <div className="pt-2 mb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', fontFamily: MONO }}>
                <div className="text-[8px] uppercase tracking-[0.14em] mb-1.5" style={{ color: 'rgba(255,255,255,0.22)' }}>
                  Leaders
                </div>
                <div className="space-y-1">
                  {leadersUI.map((l, k) => (
                    <div key={l.idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="shrink-0" style={{ width: 8, height: 8, borderRadius: 2, background: l.color, opacity: 0.9 }} />
                        <div className="min-w-0">
                          <div className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
                            {k + 1}. {getRoleLabel(l.role)}
                          </div>
                          <div className="text-[8px] truncate" style={{ color: 'rgba(255,255,255,0.28)' }}>
                            {l.label}
                          </div>
                        </div>
                      </div>
                      <div className="text-[9px] shrink-0" style={{ color: k === 0 ? '#fbbf24' : 'rgba(255,255,255,0.35)' }}>
                        {l.score.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chronicle */}
            {eventsUI.length > 0 && (
              <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', fontFamily: MONO }}>
                <div className="text-[8px] uppercase tracking-[0.14em] mb-1.5" style={{ color: 'rgba(255,255,255,0.22)' }}>Chronicle</div>
                <div className="space-y-1">
                  {eventsUI.slice(0, 12).map((ev, i) => (
                    <div key={i} className="flex gap-1.5 items-baseline" title={ev.message}>
                      <span className="text-[10px] shrink-0">{ev.icon}</span>
                      <span className="text-[9px] leading-tight" style={{ color: ev.color }}>{getEventSociologicalLabel(ev.message)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Role + Field legend */}
          <div className="px-3 py-3 mt-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="text-[8px] uppercase tracking-[0.12em] mb-1.5" style={{ color: 'rgba(255,255,255,0.22)' }}>Papéis (lente sociológica)</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <LegRow sym="◯◯" label={getRoleLabel('leader')}    c="#fbbf24" />
              <LegRow sym="▲"  label={getRoleLabel('aggressor')} c="#ef4444" />
              <LegRow sym="⊙"  label={getRoleLabel('guardian')} c="#fbd38d" />
              <LegRow sym="·"  label={getRoleLabel('mediator')} c="#94a3b8" />
              <LegRow sym="✕"  label={getRoleLabel('rebel')}    c="#ff6b6b" />
              <LegRow sym="◇"  label={getRoleLabel('priest')}   c="#a78bfa" />
              <LegRow sym="◆"  label={getRoleLabel('dictator')} c="#ef4444" />
              <LegRow sym="△"  label={getRoleLabel('artist')}   c="#34d399" />
            </div>
            <div className="mt-2 pt-2 grid grid-cols-3 gap-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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

function PhaseCodexCard({ phase, phaseColor, onClose }: { phase: StudyPhase; phaseColor: string; onClose: () => void }) {
  const codex = getPhaseCodex(phase);
  return (
    <div
      className="mt-2 py-2.5 px-3 rounded-lg border pointer-events-auto"
      style={{
        background: 'rgba(0,0,0,0.4)',
        borderColor: phaseColor + '25',
        maxWidth: 280,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: phaseColor }}>
          {codex.title}
        </span>
        <button type="button" onClick={onClose} className="text-white/30 hover:text-white/60 text-sm leading-none" aria-label="Fechar">×</button>
      </div>
      <p className="text-[9px] leading-snug m-0" style={{ color: 'rgba(255,255,255,0.6)' }}>
        {codex.what}
      </p>
      <p className="text-[8px] leading-snug mt-1 m-0" style={{ color: 'rgba(255,255,255,0.4)' }} title={codex.conditions}>
        {codex.why}
      </p>
    </div>
  );
}

function MetricBar({ label, v, c, title }: { label: string; v: number; c: string; title?: string }) {
  return (
    <div className="flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }} title={title}>
      <span className="text-[10px] w-20 shrink-0" style={{ color: 'rgba(255,255,255,0.40)' }}>{label}</span>
      <div className="flex-1 h-px overflow-hidden" style={{ background: 'rgba(255,255,255,0.10)' }}>
        <div className="h-full transition-all duration-500" style={{ width: `${(v * 100).toFixed(0)}%`, background: c }} />
      </div>
      <span className="text-[10px] w-5 text-right" style={{ color: c }}>{(v * 100).toFixed(0)}</span>
    </div>
  );
}

function SliderRow({ label, v, min, max, step, onChange }: {
  label: string; v: number; min: number; max: number; step: number; onChange: (n: number) => void;
}) {
  const [val, setVal] = useState(v);
  useEffect(() => { setVal(v); }, [v]);
  return (
    <div className="flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <span className="text-[9px] w-14 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={e => { const n = parseFloat(e.target.value); setVal(n); onChange(n); }}
        className="flex-1 h-px appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/60"
        style={{ background: 'rgba(255,255,255,0.10)' }} />
      <span className="text-[9px] w-6 text-right shrink-0" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {step >= 1 ? Math.round(val) : val.toFixed(2)}
      </span>
    </div>
  );
}

function SymRow({ icon, label, sub, color, onRemove }: {
  icon: string; label: string; sub: string; color: string; onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <span style={{ color }} className="text-[11px] shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.60)' }}>{label}</div>
        <div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.22)' }}>{sub}</div>
      </div>
      <button onClick={onRemove} className="transition-colors" style={{ color: 'rgba(255,255,255,0.20)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.70)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.20)'; }}>
        <X size={9} />
      </button>
    </div>
  );
}

function LegRow({ sym, label, c }: { sym: string; label: string; c: string }) {
  return (
    <div className="flex items-center gap-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <span className="text-[10px] w-4 text-center shrink-0" style={{ color: c }}>{sym}</span>
      <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
    </div>
  );
}

function FieldLeg({ c, label, title }: { c: string; label: string; title: string }) {
  return (
    <div className="flex items-center gap-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <div className="w-1.5 h-1.5 shrink-0" style={{ background: c, opacity: 0.75 }} />
      <div>
        <div className="text-[9px]" style={{ color: c }}>{label}</div>
        <div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.22)' }}>{title}</div>
      </div>
    </div>
  );
}

function FChip({ c, label }: { c: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <div className="w-2 h-2 shrink-0" style={{ background: c, opacity: 0.65 }} />
      <span className="text-[9px]" style={{ color: c, opacity: 0.75 }}>{label}</span>
    </div>
  );
}