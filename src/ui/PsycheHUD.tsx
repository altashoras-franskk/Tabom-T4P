// ── Psyche Lab — HUD ─────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { PSYCHE_PRESETS } from '../sim/psyche/psychePresets';
import { PsycheLens, PsychePhase, FreudMetrics, LacanMetrics } from '../sim/psyche/psycheTypes';
import { ARCHETYPES } from '../sim/psyche/archetypes';
import { Eye, EyeOff, BookOpen, Map, ChevronDown, ChevronUp, Sparkles, ScrollText } from 'lucide-react';

export interface NarrativeEntry {
  text:  string;
  color: string;
  time:  number; // elapsed seconds
}

interface PsycheHUDProps {
  presetId:           string;
  lens:               PsycheLens;
  archetypesOn:       boolean;
  journeyOn:          boolean;
  journeyAct:         number;
  journeyChapter:     string;
  quantaCount:        number;
  danceIntensity:     number;
  phase:              PsychePhase;
  integrationIndex:   number;
  tensionIndex:       number;
  fragmentIndex:      number;
  archetypeStrengths: number[];
  archetypeActive:    boolean[];
  flowGain:           number;
  springK:            number;
  linkRadius:         number;
  breathPeriod:       number;
  trailOn:            boolean;
  campoOn:            boolean;
  fieldOn:            boolean;
  bondsOn:            boolean;
  trailFade:          number;
  trailOpacity:       number;
  trailWidth:         number;
  narrativeLog:       NarrativeEntry[];
  onPresetChange:      (id: string) => void;
  onLensChange:        (l: PsycheLens) => void;
  onArchetypesToggle:  () => void;
  onJourneyToggle:     () => void;
  onQuantaChange:      (n: number) => void;
  onDanceChange:       (v: number) => void;
  onFlowGainChange:    (v: number) => void;
  onSpringKChange:     (v: number) => void;
  onLinkRadiusChange:  (v: number) => void;
  onBreathPeriodChange:(v: number) => void;
  onArchStrengthChange:(idx: number, v: number) => void;
  onArchActiveToggle:  (idx: number) => void;
  onCinematicToggle:   () => void;
  cinematicMode:       boolean;
  onTrailToggle:       () => void;
  onCampoToggle:       () => void;
  onFieldToggle:       () => void;
  onBondsToggle:       () => void;
  onTrailFadeChange:   (v: number) => void;
  onTrailOpacityChange:(v: number) => void;
  onTrailWidthChange:  (v: number) => void;
  // Bond visual config
  bondWidth:           number;
  bondOpacity:         number;
  onBondWidthChange:   (v: number) => void;
  onBondOpacityChange: (v: number) => void;
  running:             boolean;
  onToggleRun:         () => void;
  onReset:             () => void;
  onOpenConsciousness: () => void;
  // Psychoanalytic lens metrics (computed from per-particle data in PsycheLab)
  freudMetrics?:       FreudMetrics;
  lacanMetrics?:       LacanMetrics;
  // ── Physics / identity (exposed params) ──────────────────────────────────
  damping:             number;
  stateRelaxRate:      number;
  frozenFlow:          boolean;
  soulVis:             number;
  onDampingChange:     (v: number) => void;
  onStateRelaxChange:  (v: number) => void;
  onFrozenFlowToggle:  () => void;
  onSoulVisChange:     (v: number) => void;
}

// ── Static data ───────────────────────────────────────────────────────────────

const PHASE_INFO: Record<PsychePhase, { label: string; desc: string; color: string; bg: string }> = {
  CALM:        { label: 'CALMO',       desc: 'Equilíbrio dinâmico',           color: '#93c5fd', bg: 'rgba(59,130,246,0.07)'  },
  ALERT:       { label: 'ALERTA',      desc: 'Tensão crescente',               color: '#fde047', bg: 'rgba(234,179,8,0.07)'   },
  PANIC:       { label: 'COLAPSO',     desc: 'Ruptura caótica',                color: '#f87171', bg: 'rgba(239,68,68,0.09)'   },
  FLOW:        { label: 'FLUXO',       desc: 'Coerência elevada — Self ativo', color: '#86efac', bg: 'rgba(34,197,94,0.07)'   },
  FRAGMENTED:  { label: 'FRAGMENTADO', desc: 'Dissociação ativa',              color: '#fdba74', bg: 'rgba(249,115,22,0.07)'  },
  INTEGRATING: { label: 'INTEGRANDO',  desc: 'Síntese emergente',              color: '#c4b5fd', bg: 'rgba(139,92,246,0.07)'  },
};

// Freudian re-reading of phases
const PHASE_FREUD: Record<PsychePhase, string> = {
  CALM:        'Princípio de Prazer estável — Eros domina',
  ALERT:       'Conflito pulsional — Id vs Superego',
  PANIC:       'Retorno do Reprimido — defesas rompidas',
  FLOW:        'Sublimação ativa — Eros liberto',
  FRAGMENTED:  'Angústia de fragmentação — Ego frágil',
  INTEGRATING: 'Elaboração psíquica — Trabalho de luto',
};

// Lacanian re-reading of phases
const PHASE_LACAN: Record<PsychePhase, string> = {
  CALM:        'Ordem simbólica estável — Lei do Pai operativa',
  ALERT:       'Tensão RSI — borda entre registros',
  PANIC:       'Irrupção do Real — inassimilável',
  FLOW:        'Gozo modulado — circulação entre registros',
  FRAGMENTED:  'Sujeito dividido ($) em crise',
  INTEGRATING: 'Travessia da fantasia — reorganização do $',
};

const LENSES: { id: PsycheLens; label: string; color: string; group?: string }[] = [
  { id: 'TOPOLOGY',   label: 'Topologia',      color: '#c4b5fd' },
  { id: 'ENERGY',     label: 'Energia',         color: '#fca5a5' },
  { id: 'VALENCE',    label: 'Valência',        color: '#86efac' },
  { id: 'COHERENCE',  label: 'Coerência',       color: '#93c5fd' },
  { id: 'ARCHETYPES', label: 'Arquétipos',      color: '#fde047' },
  { id: 'EVENTS',     label: 'Eventos',         color: '#67e8f9' },
  { id: 'LACAN',      label: '◻ Lacan  RSI',   color: '#e0a0ff', group: 'teoria' },
  { id: 'FREUD',      label: '△ Freud  Id/Ego', color: '#f4a460', group: 'teoria' },
];

const CAMADAS_JUNG = [
  { sigil:'✦', name:'SELF',     color:'#f5c842', desc:'Centro integrador' },
  { sigil:'▽', name:'EGO',      color:'#3b82f6', desc:'Consciência diurna' },
  { sigil:'◈', name:'PERSONA',  color:'#b0c4de', desc:'Máscara social' },
  { sigil:'◗', name:'SOMBRA',   color:'#7c3aed', desc:'Conteúdo reprimido' },
  { sigil:'⊛', name:'ID',       color:'#ef4444', desc:'Pulsões primais' },
  { sigil:'⊞', name:'SUPEREGO', color:'#9ca3af', desc:'Lei interna' },
  { sigil:'∿', name:'COLETIVO', color:'#06b6d4', desc:'Inconsciente coletivo' },
];

const CAMADAS_FREUD = [
  { sigil:'🔥', name:'Id',       color:'#ef4444', desc:'Reservatório pulsional — prazer imediato' },
  { sigil:'◻',  name:'Ego',      color:'#3b82f6', desc:'Realidade — mediador Id↔Superego' },
  { sigil:'⚖',  name:'Superego', color:'#9ca3af', desc:'Lei e ideal — censura interna' },
  { sigil:'↑',  name:'Eros',     color:'#f472b6', desc:'Pulsão de Vida — ligação e amor' },
  { sigil:'↓',  name:'Thanatos', color:'#64748b', desc:'Pulsão de Morte — destruição e dissolução' },
];

const CAMADAS_LACAN = [
  { sigil:'◼', name:'Real',       color:'#dc2626', desc:'O inassimilável — além da linguagem' },
  { sigil:'◻', name:'Simbólico', color:'#3b82f6', desc:'A rede de significantes — Lei, Outro' },
  { sigil:'○', name:'Imaginário', color:'#f5c842', desc:'Identificações do Ego — espelho' },
  { sigil:'S', name:'Sujeito $',  color:'#a78bfa', desc:'Sujeito dividido — efeito da linguagem' },
  { sigil:'a', name:'Objeto a',   color:'#fb923c', desc:'Causa do desejo — plus-de-gozo' },
];

const QUANTA_OPTIONS = [300, 600, 900, 1200];

// ── Component ─────────────────────────────────────────────────────────────────

export const PsycheHUD: React.FC<PsycheHUDProps> = (props) => {
  const [showArchPanel, setShowArchPanel] = useState(false);
  const [showPresets,   setShowPresets]   = useState(false);
  const [showLens,      setShowLens]      = useState(false);
  const [showParams,    setShowParams]    = useState(false);
  const [showLog,       setShowLog]       = useState(false);

  const currentPreset = PSYCHE_PRESETS.find(p => p.id === props.presetId);
  const isRedBook     = props.presetId === 'red-book-journey';
  const isStable      = !!(currentPreset?.config as any)?.frozenFlow;
  const phaseInfo     = PHASE_INFO[props.phase];
  const isFreud       = props.lens === 'FREUD';
  const isLacan       = props.lens === 'LACAN';
  const isTheory      = isFreud || isLacan;

  // Phase card desc adapts to lens
  const phaseDesc = isFreud ? PHASE_FREUD[props.phase]
                  : isLacan ? PHASE_LACAN[props.phase]
                  : phaseInfo.desc;

  const phaseTitle = isFreud ? 'estado libidinal'
                   : isLacan ? 'posição subjetiva'
                   : 'estado psíquico';

  // Accent color adapts to theory lens
  const theoryAccent = isFreud ? '#f4a460' : isLacan ? '#e0a0ff' : phaseInfo.color;

  return (
    <div className="fixed inset-0 pointer-events-none z-20 select-none">

      {/* ── STABLE MODE BADGE (top-center) ──────────────────────────────── */}
      {isStable && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border"
            style={{ background: 'rgba(7,5,14,0.80)', borderColor: 'rgba(120,240,160,0.25)', backdropFilter: 'blur(8px)' }}>
            <span style={{ color: 'rgba(100,230,140,0.70)', fontSize: 8 }}>◉</span>
            <span className="text-[8px] font-mono uppercase tracking-widest"
              style={{ color: 'rgba(100,230,140,0.65)' }}>campo estável</span>
            <span className="text-[7px] font-mono"
              style={{ color: 'rgba(100,230,140,0.35)' }}>atratores fixos · frozenFlow</span>
          </div>
        </div>
      )}

      {/* ── LEFT DOCK ──────────────────────────────────────────────────── */}
      <div
        className="absolute left-3 top-14 bottom-3 pointer-events-auto overflow-y-auto overflow-x-hidden"
        style={{ width: 172, scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.3) transparent' }}
      >
      <div className="flex flex-col gap-2 pb-2">

        {/* Control bar */}
        <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-white/[0.07] rounded-lg px-2 py-1.5">
          <button onClick={props.onToggleRun}
            className={`flex-1 text-[10px] font-mono py-1 rounded border transition-all ${
              props.running
                ? 'border-white/15 text-white/50 hover:bg-white/5'
                : 'border-green-400/40 text-green-300 bg-green-500/10'
            }`}>
            {props.running ? '⏸ Pausar' : '▶ Iniciar'}
          </button>
          <button onClick={props.onReset} title="Reiniciar"
            className="text-[13px] text-white/30 hover:text-white/70 transition-colors px-1">↺</button>
          <button onClick={props.onCinematicToggle}
            className={`transition-colors ${props.cinematicMode ? 'text-cyan-400' : 'text-white/25 hover:text-white/60'}`}>
            {props.cinematicMode ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </div>

        {/* Phase card — title and desc adapt to active lens */}
        <div className="rounded-lg border px-3 py-2.5 transition-all duration-700"
          style={{ background: phaseInfo.bg, borderColor: (isTheory ? theoryAccent : phaseInfo.color) + '22' }}>
          <div className="text-[8px] uppercase tracking-widest font-mono mb-1"
            style={{ color: (isTheory ? theoryAccent : phaseInfo.color) + 'aa' }}>{phaseTitle}</div>
          <div className="text-[13px] font-mono tracking-widest mb-1" style={{ color: isTheory ? theoryAccent : phaseInfo.color }}>
            {phaseInfo.label}
          </div>
          <div className="text-[7.5px] leading-snug" style={{ color: (isTheory ? theoryAccent : phaseInfo.color) + '99' }}>
            {phaseDesc}
          </div>
        </div>

        {/* Metrics — switch completely by lens */}
        {isFreud && props.freudMetrics ? (
          <div className="bg-black/50 backdrop-blur-sm border rounded-lg px-3 py-2.5 space-y-2.5"
            style={{ borderColor: '#f4a46033' }}>
            <div className="text-[8px] uppercase tracking-widest" style={{ color: '#f4a46055' }}>
              Índices Freudianos
            </div>
            <MetricRow label="Eros"      sublabel="pulsão de vida"   value={props.freudMetrics.eros}          color="#f472b6" />
            <MetricRow label="Thanatos"  sublabel="pulsão de morte"  value={props.freudMetrics.thanatos}      color="#64748b" />
            <MetricRow label="Repressão" sublabel="bloqueio do Ego"  value={props.freudMetrics.repressao}     color="#f4a460" />
            <MetricRow label="Sublimação" sublabel="energia transformada" value={props.freudMetrics.sublimacao} color="#86efac" />
          </div>
        ) : isLacan && props.lacanMetrics ? (
          <div className="bg-black/50 backdrop-blur-sm border rounded-lg px-3 py-2.5 space-y-2.5"
            style={{ borderColor: '#e0a0ff33' }}>
            <div className="text-[8px] uppercase tracking-widest" style={{ color: '#e0a0ff55' }}>
              Registros RSI
            </div>
            <MetricRow label="Real"       sublabel="o inassimilável"      value={props.lacanMetrics.real}       color="#dc2626" />
            <MetricRow label="Simbólico"  sublabel="rede de significantes" value={props.lacanMetrics.simbolico}  color="#3b82f6" />
            <MetricRow label="Imaginário" sublabel="identificação especular" value={props.lacanMetrics.imaginario} color="#f5c842" />
          </div>
        ) : (
          <div className="bg-black/50 backdrop-blur-sm border border-white/[0.07] rounded-lg px-3 py-2.5 space-y-2.5">
            <div className="text-[8px] uppercase tracking-widest text-white/25">Índices</div>
            <MetricRow label="Integração"   sublabel="coesão psíquica"   value={props.integrationIndex}            color="#f5c842" />
            <MetricRow label="Tensão"       sublabel="conflito de forças" value={props.tensionIndex}               color="#f87171" />
            <MetricRow label="Fragmentação" sublabel="dissociação"        value={Math.min(1, props.fragmentIndex)} color="#fb923c" />
          </div>
        )}

        {/* Velocidade */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/[0.07] rounded-lg px-3 py-2.5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[8px] uppercase tracking-widest text-white/25">Velocidade</span>
            <span className="text-[9px] font-mono text-white/40">{Math.round(props.danceIntensity * 100)}%</span>
          </div>
          <input type="range" min={0.04} max={0.80} step={0.01}
            value={props.danceIntensity}
            onChange={e => props.onDanceChange(parseFloat(e.target.value))}
            className="w-full h-px bg-white/10 appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-purple-300/80 [&::-webkit-slider-thumb]:cursor-pointer" />
          <div className="flex justify-between mt-1">
            <span className="text-[7px] text-white/18">Contemplativo</span>
            <span className="text-[7px] text-white/18">Intenso</span>
          </div>
        </div>

        {/* Parâmetros */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/[0.07] rounded-lg overflow-hidden">
          <button onClick={() => setShowParams(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
            <span className="text-[8px] uppercase tracking-widest text-white/25">Parâmetros</span>
            {showParams ? <ChevronUp size={9} className="text-white/25" /> : <ChevronDown size={9} className="text-white/25" />}
          </button>
          {showParams && (
            <div className="border-t border-white/[0.06] px-3 py-2 space-y-3">
              <ParamSlider label="Dança"      hint="intensidade do flow field"
                value={props.flowGain}     min={0.05} max={0.80} step={0.05} display={v => `${Math.round(v*100)}%`} color="#c4b5fd" onChange={props.onFlowGainChange} />
              <ParamSlider label="Molas"      hint="rigidez dos vínculos"
                value={props.springK}      min={0.10} max={2.00} step={0.05} display={v => v.toFixed(2)}            color="#86efac" onChange={props.onSpringKChange} />
              <ParamSlider label="Alcance"    hint="raio de conexão"
                value={props.linkRadius}   min={0.04} max={0.18} step={0.005} display={v => v.toFixed(3)}           color="#67e8f9" onChange={props.onLinkRadiusChange} />
              <ParamSlider label="Respiração" hint="ciclo em segundos"
                value={props.breathPeriod} min={6}    max={60}   step={1}    display={v => `${Math.round(v)}s`}    color="#fca5a5" onChange={props.onBreathPeriodChange} />
            </div>
          )}
        </div>

        {/* ── Física Psíquica ────────────────────────────────────────────── */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/[0.07] rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[8px] uppercase tracking-widest text-white/25">Física Psíquica</span>
            {/* frozenFlow toggle inline */}
            <button onClick={props.onFrozenFlowToggle}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[7px] font-mono uppercase tracking-widest transition-all ${
                props.frozenFlow
                  ? 'border-green-400/40 text-green-300/80 bg-green-500/10'
                  : 'border-white/10 text-white/30 hover:text-white/60'
              }`}>
              {props.frozenFlow ? '◉ fixo' : '○ livre'}
            </button>
          </div>
          <div className="px-3 py-2 space-y-3">
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[8.5px] font-mono text-amber-300/70">Inércia</span>
                <span className="text-[7px] font-mono text-white/35">{props.damping.toFixed(1)}</span>
              </div>
              <div className="text-[6.5px] text-white/18 mb-1">resistência à mudança de velocidade</div>
              <input type="range" min={0.3} max={20} step={0.1}
                value={props.damping}
                onChange={e => props.onDampingChange(parseFloat(e.target.value))}
                className="w-full h-px bg-white/10 appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5
                  [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-amber-300/70" />
              <div className="flex justify-between mt-0.5">
                <span className="text-[6px] text-white/18">oscilatório</span>
                <span className="text-[6px] text-white/18">cristalino</span>
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[8.5px] font-mono text-cyan-300/70">Memória</span>
                <span className="text-[7px] font-mono text-white/35">{props.stateRelaxRate.toFixed(2)}×</span>
              </div>
              <div className="text-[6.5px] text-white/18 mb-1">velocidade de mudança de estado interno</div>
              <input type="range" min={0.05} max={3.0} step={0.05}
                value={props.stateRelaxRate}
                onChange={e => props.onStateRelaxChange(parseFloat(e.target.value))}
                className="w-full h-px bg-white/10 appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5
                  [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-cyan-300/70" />
              <div className="flex justify-between mt-0.5">
                <span className="text-[6px] text-white/18">longa memória</span>
                <span className="text-[6px] text-white/18">flip-flop</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Alma Individual ────────────────────────────────────────────── */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/[0.07] rounded-lg px-3 py-2.5">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[8px] uppercase tracking-widest text-white/25">Alma</span>
            <span className="text-[7px] font-mono text-white/35">{Math.round(props.soulVis * 100)}%</span>
          </div>
          <div className="text-[6.5px] text-white/18 mb-1.5">
            identidade individual de cada quantum — rastros mostram a jornada pessoal
          </div>
          <input type="range" min={0} max={1} step={0.02}
            value={props.soulVis}
            onChange={e => props.onSoulVisChange(parseFloat(e.target.value))}
            className="w-full h-px appearance-none cursor-pointer"
            style={{ background: props.soulVis > 0
              ? `linear-gradient(90deg, rgba(180,100,255,0.4) ${props.soulVis*100}%, rgba(255,255,255,0.08) ${props.soulVis*100}%)`
              : 'rgba(255,255,255,0.08)'
            }} />
          <div className="flex justify-between mt-1">
            <span className="text-[6px] text-white/18">anônimo</span>
            <span className="text-[6px] text-white/18">cada um com sua cor</span>
          </div>
          {props.soulVis > 0.05 && (
            <div className="mt-1.5 text-[6.5px] text-purple-300/40 italic">
              ative Rastros para ver trajetórias individuais
            </div>
          )}
        </div>

        {/* Lente */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/[0.07] rounded-lg overflow-hidden">
          <button onClick={() => setShowLens(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
            <span className="text-[8px] uppercase tracking-widest text-white/25">Lente</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono"
                style={{ color: LENSES.find(l => l.id === props.lens)?.color ?? '#aaa' }}>
                {LENSES.find(l => l.id === props.lens)?.label}
              </span>
              {showLens ? <ChevronUp size={9} className="text-white/25" /> : <ChevronDown size={9} className="text-white/25" />}
            </div>
          </button>
          {showLens && (
            <div className="border-t border-white/[0.06] px-2 py-1.5 space-y-0.5 max-h-56 overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.3) transparent' }}>
              {LENSES.map(l => (
                <button key={l.id}
                  onClick={() => { props.onLensChange(l.id); setShowLens(false); }}
                  className={`w-full text-left px-1.5 py-1 rounded transition-colors ${props.lens === l.id ? 'bg-white/8' : 'hover:bg-white/5'}`}>
                  {l.group === 'teoria' && (
                    <div className="text-[6px] uppercase tracking-widest text-white/18 mb-0.5">{l.group}</div>
                  )}
                  <span className="text-[9px]" style={{ color: props.lens === l.id ? l.color : '#666' }}>{l.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toggles */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/[0.07] rounded-lg px-3 py-2 space-y-2">
          <Toggle label="Campo"    on={props.campoOn} onToggle={props.onCampoToggle} color="#06b6d4" />
          <Toggle label="Vetores"  on={props.fieldOn} onToggle={props.onFieldToggle} color="#a3e635" />
          <Toggle label="Rastros"  on={props.trailOn} onToggle={props.onTrailToggle} color="#a78bfa" />
          <Toggle label="Bonds"    on={props.bondsOn} onToggle={props.onBondsToggle} color="#67e8f9" />
          <Toggle label="Arquétipos" on={props.archetypesOn} onToggle={props.onArchetypesToggle} color="#fde047" />
          {isRedBook && (
            <Toggle label="Jornada" on={props.journeyOn} onToggle={props.onJourneyToggle} color="#c4b5fd" />
          )}
          {props.bondsOn && (
            <div className="pl-0.5 space-y-2 border-t border-white/[0.06] pt-2 mt-1">
              <div className="text-[7px] uppercase tracking-widest text-white/18 mb-0.5">config de bonds</div>
              <ParamSlider label="Espessura" hint="largura das linhas"
                value={props.bondWidth} min={0.3} max={4.0} step={0.1}
                display={v => v.toFixed(1)} color="#67e8f9"
                onChange={props.onBondWidthChange} />
              <ParamSlider label="Opacidade" hint="transparência dos bonds"
                value={props.bondOpacity} min={0.05} max={1.00} step={0.05}
                display={v => `${Math.round(v*100)}%`} color="#67e8f9"
                onChange={props.onBondOpacityChange} />
            </div>
          )}
          {props.trailOn && (
            <div className="pl-0.5 space-y-2 border-t border-white/[0.06] pt-2 mt-1">
              <div className="text-[7px] uppercase tracking-widest text-white/18 mb-0.5">config de rastros</div>
              <ParamSlider label="Memória" hint="0.02=longa · 0.18=curta"
                value={props.trailFade} min={0.01} max={0.20} step={0.005}
                display={v => v.toFixed(3)} color="#a78bfa"
                onChange={props.onTrailFadeChange} />
              <ParamSlider label="Opacidade" hint="transparência do rastro"
                value={props.trailOpacity} min={0.10} max={1.00} step={0.05}
                display={v => `${Math.round(v*100)}%`} color="#a78bfa"
                onChange={props.onTrailOpacityChange} />
              <ParamSlider label="Cauda" hint="comprimento da cauda"
                value={props.trailWidth} min={1} max={8} step={0.5}
                display={v => v.toFixed(1)} color="#a78bfa"
                onChange={props.onTrailWidthChange} />
            </div>
          )}
        </div>

        {/* Quanta count */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/[0.07] rounded-lg px-3 py-2">
          <div className="text-[8px] uppercase tracking-widest text-white/25 mb-1.5">Partículas</div>
          <div className="grid grid-cols-4 gap-1">
            {QUANTA_OPTIONS.map(n => (
              <button key={n} onClick={() => props.onQuantaChange(n)}
                className={`text-[8px] font-mono py-0.5 rounded border transition-colors ${
                  props.quantaCount === n
                    ? 'border-purple-400/50 text-purple-300 bg-purple-500/10'
                    : 'border-white/10 text-white/25 hover:text-white/60'
                }`}>
                {n >= 1000 ? `${n/1000}k` : n}
              </button>
            ))}
          </div>
        </div>
      </div>{/* end inner flex col */}
      </div>{/* end scroll viewport */}

      {/* ── RIGHT DOCK ─────────────────────────────────────────────────── */}
      <div
        className="absolute right-3 top-14 bottom-3 pointer-events-auto overflow-y-auto overflow-x-hidden"
        style={{ width: 208, scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.3) transparent' }}
      >
      <div className="flex flex-col gap-2 pb-2">

        {/* Nova Consciência */}
        <button
          onClick={props.onOpenConsciousness}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border
            border-purple-400/30 text-purple-300/70 hover:border-purple-400/60 hover:text-purple-200
            hover:bg-purple-500/08 transition-all text-[9px] uppercase tracking-widest font-mono
            backdrop-blur-sm bg-black/40"
        >
          <Sparkles size={11} />
          Nova Consciência
        </button>

        {/* Preset selector */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/[0.07] rounded-lg overflow-hidden">
          <button onClick={() => setShowPresets(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
            <span className="text-[8px] uppercase tracking-widest text-white/25">Preset</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-purple-300/70 font-mono truncate max-w-[100px]">
                {currentPreset?.name ?? '—'}
              </span>
              {showPresets ? <ChevronUp size={9} className="text-white/25" /> : <ChevronDown size={9} className="text-white/25" />}
            </div>
          </button>
          {showPresets && (
            <div className="border-t border-white/[0.06] max-h-56 overflow-y-auto">
              {PSYCHE_PRESETS.map(p => (
                <button key={p.id}
                  onClick={() => { props.onPresetChange(p.id); setShowPresets(false); }}
                  className={`w-full text-left px-3 py-2 transition-colors border-l-2 ${
                    props.presetId === p.id
                      ? 'bg-purple-500/10 border-purple-400/50'
                      : 'hover:bg-white/5 border-transparent'
                  }`}>
                  <div className="text-[9px] text-white/70 mb-0.5">{p.name}</div>
                  <div className="text-[7.5px] text-white/28 leading-snug line-clamp-2">{p.observe}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Narrative Log */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/[0.07] rounded-lg overflow-hidden">
          <button onClick={() => setShowLog(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-1.5">
              <ScrollText size={10} className="text-white/20" />
              <span className="text-[8px] uppercase tracking-widest text-white/25">Crônica</span>
            </div>
            <div className="flex items-center gap-1.5">
              {props.narrativeLog.length > 0 && (
                <span className="text-[7px] bg-purple-500/20 text-purple-300/60 px-1 rounded">
                  {props.narrativeLog.length}
                </span>
              )}
              {showLog ? <ChevronUp size={9} className="text-white/25" /> : <ChevronDown size={9} className="text-white/25" />}
            </div>
          </button>
          {showLog && (
            <div className="border-t border-white/[0.06] max-h-48 overflow-y-auto">
              {props.narrativeLog.length === 0 ? (
                <p className="px-3 py-3 text-[8px] text-white/18 italic">
                  Nenhum evento ainda. Os padrões emergentes aparecerão aqui.
                </p>
              ) : (
                <div className="py-1">
                  {[...props.narrativeLog].reverse().map((entry, i) => (
                    <div key={i} className="flex gap-2 px-3 py-1.5 border-b border-white/[0.04] last:border-0">
                      <span className="text-[7px] text-white/20 font-mono shrink-0 mt-0.5">
                        {formatTime(entry.time)}
                      </span>
                      <span className="text-[8px] leading-snug" style={{ color: entry.color + 'cc' }}>
                        {entry.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── PAINEL TEÓRICO — muda completamente com a lente ── */}
        {isFreud ? (
          <FreudPanel metrics={props.freudMetrics} phase={props.phase} />
        ) : isLacan ? (
          <LacanPanel metrics={props.lacanMetrics} phase={props.phase} integration={props.integrationIndex} />
        ) : (
          <ProcessoJungPanel
            integration={props.integrationIndex}
            tension={props.tensionIndex}
            fragment={props.fragmentIndex}
            phase={props.phase}
          />
        )}

        {/* ── MAPA — muda completamente com a lente ── */}
        {isFreud ? (
          <MapaPanel
            title="Aparelho Psíquico"
            camadas={CAMADAS_FREUD}
            intro="Cada quantum habita zonas topográficas do aparelho freudiano."
            legenda={[
              ['#ef4444','Vermelho','Id — pulsão crua'],
              ['#3b82f6','Azul','Ego — realidade'],
              ['#9ca3af','Cinza','Superego — lei'],
              ['#f472b6','Rosa','Eros — valência +'],
              ['#64748b','Ardósia','Thanatos — inibição'],
            ]}
          />
        ) : isLacan ? (
          <MapaPanel
            title="Topologia RSI"
            camadas={CAMADAS_LACAN}
            intro="Três registros lacanians — Real, Simbólico, Imaginário — borromeanamente ligados."
            legenda={[
              ['#dc2626','Carmim','Real — inassimilável'],
              ['#3b82f6','Azul','Simbólico — lei/linguagem'],
              ['#f5c842','Dourado','Imaginário — espelho/Ego'],
            ]}
          />
        ) : (
          <MapaPanel
            title="Mapa Psíquico"
            camadas={CAMADAS_JUNG}
            intro="Cada quantum navega por regiões que modulam seu estado interno."
            legenda={[
              ['#ef4444','Vermelho','Alta energia'],
              ['#3b82f6','Azul','Coerência / baixa energia'],
              ['#86efac','Verde','Valência positiva'],
              ['#7c3aed','Roxo','Sombra / valência negativa'],
              ['#f5c842','Dourado','Self / arquétipo ativo'],
            ]}
          />
        )}

        {/* Archetypes panel */}
        {props.archetypesOn && (
          <div className="bg-black/50 backdrop-blur-sm border border-white/[0.07] rounded-lg overflow-hidden">
            <button onClick={() => setShowArchPanel(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
              <span className="text-[8px] uppercase tracking-widest text-white/25">Arquétipos</span>
              {showArchPanel ? <ChevronUp size={9} className="text-white/25" /> : <ChevronDown size={9} className="text-white/25" />}
            </button>
            {showArchPanel && (
              <div className="border-t border-white/[0.06] px-2 py-1.5 space-y-1 max-h-64 overflow-y-auto">
                {ARCHETYPES.map((arch, idx) => (
                  <div key={arch.id} className="flex items-center gap-2">
                    <button onClick={() => props.onArchActiveToggle(idx)}
                      className="shrink-0 text-[13px] transition-opacity"
                      style={{ opacity: props.archetypeActive[idx] ? 1 : 0.2 }}>
                      {arch.sigil}
                    </button>
                    <span className="text-[8px] font-mono w-16 shrink-0 truncate"
                      style={{ color: props.archetypeActive[idx] ? arch.color : '#444' }}>
                      {arch.id}
                    </span>
                    <input type="range" min={0} max={1} step={0.05}
                      value={props.archetypeStrengths[idx]}
                      disabled={!props.archetypeActive[idx]}
                      onChange={e => props.onArchStrengthChange(idx, parseFloat(e.target.value))}
                      className="flex-1 h-px bg-white/10 appearance-none cursor-pointer disabled:opacity-20
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5
                        [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-white/60" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Journey chapter */}
        {props.journeyOn && props.journeyChapter && (
          <div className="bg-black/60 backdrop-blur-sm border border-purple-400/15 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BookOpen size={9} className="text-purple-400/50" />
              <span className="text-[8px] uppercase tracking-widest text-purple-400/40">Ato {props.journeyAct + 1}</span>
            </div>
            <p className="text-[9px] text-white/40 italic leading-relaxed">{props.journeyChapter}</p>
          </div>
        )}
      </div>{/* end inner flex col */}
      </div>{/* end right scroll viewport */}
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const MetricRow: React.FC<{ label: string; sublabel: string; value: number; color: string }> = ({
  label, sublabel, value, color,
}) => {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[8.5px] font-mono text-white/60">{label}</span>
        <span className="text-[8px] font-mono" style={{ color: color + 'cc' }}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.max(2, pct)}%`, background: `linear-gradient(90deg, ${color}88, ${color}dd)` }} />
      </div>
      <div className="text-[7px] text-white/18 mt-0.5">{sublabel}</div>
    </div>
  );
};

const ParamSlider: React.FC<{
  label: string; hint: string; value: number; min: number; max: number; step: number;
  display: (v: number) => string; color: string; onChange: (v: number) => void;
}> = ({ label, hint, value, min, max, step, display, color, onChange }) => (
  <div>
    <div className="flex items-baseline justify-between mb-1">
      <span className="text-[8.5px] font-mono" style={{ color: color + 'cc' }}>{label}</span>
      <span className="text-[8px] font-mono text-white/40">{display(value)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-full h-px bg-white/10 appearance-none cursor-pointer
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5
        [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full
        [&::-webkit-slider-thumb]:bg-white/50 [&::-webkit-slider-thumb]:cursor-pointer" />
    <div className="text-[7px] text-white/18 mt-0.5">{hint}</div>
  </div>
);

const Toggle: React.FC<{ label: string; on: boolean; onToggle: () => void; color: string }> = ({
  label, on, onToggle, color,
}) => (
  <button onClick={onToggle} className="flex items-center gap-2 text-[9px] font-mono transition-colors w-full">
    <div className="w-6 h-3 rounded-full relative shrink-0 transition-all duration-300"
      style={{ background: on ? color + '30' : 'rgba(255,255,255,0.04)',
               border: `1px solid ${on ? color + '55' : 'rgba(255,255,255,0.07)'}` }}>
      <div className="absolute top-0.5 w-2 h-2 rounded-full transition-all duration-300"
        style={{ left: on ? '12px' : '1px', background: on ? color : 'rgba(255,255,255,0.18)' }} />
    </div>
    <span style={{ color: on ? color : 'rgba(255,255,255,0.22)' }}>{label}</span>
  </button>
);

const ProcessBar: React.FC<{ label: string; value: number; color: string; desc: string }> = ({
  label, value, color, desc,
}) => {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[8.5px] font-mono text-white/60">{label}</span>
        <span className="text-[8px] font-mono" style={{ color: color + 'cc' }}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.max(2, pct)}%`, background: `linear-gradient(90deg, ${color}55, ${color}bb)` }} />
      </div>
      <div className="text-[7px] text-white/18 mt-0.5">{desc}</div>
    </div>
  );
};

function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── PAINEL JUNG — processo psíquico profundo ─────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const ProcessoJungPanel: React.FC<{
  integration: number; tension: number; fragment: number; phase: PsychePhase;
}> = ({ integration, tension, fragment, phase }) => {
  const [open, setOpen] = useState(true);

  const compensacao   = Math.min(1, tension * (1 - integration) * 1.4);
  const numinosidade  = Math.min(1, integration * (1 - tension) * (1 - fragment) * 1.6);
  const complexo      = Math.min(1, tension * fragment * 1.8);
  const progressao    = Math.max(-1, Math.min(1, integration - fragment - tension * 0.5));
  const enantiodromia = Math.min(1, tension > 0.65 ? (tension - 0.65) * 2.5 : 0);
  const progrDir      = progressao >= 0;
  const progrPct      = Math.abs(progressao);
  const progrLabel    = progressao > 0.3 ? 'Progressão ativa' : progressao < -0.2 ? 'Regressão ativa' : 'Neutro';
  const progrColor    = progressao > 0.1 ? '#86efac' : progressao < -0.1 ? '#f87171' : '#94a3b8';

  return (
    <div className="bg-black/50 backdrop-blur-sm border border-white/[0.07] rounded-lg overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
        <span className="text-[8px] uppercase tracking-widest text-white/25">Processo Psíquico</span>
        {open ? <ChevronUp size={9} className="text-white/25" /> : <ChevronDown size={9} className="text-white/25" />}
      </button>
      {open && (
        <div className="border-t border-white/[0.06] px-3 py-2.5 space-y-3">
          <ProcessBar label="Compensação"  value={compensacao}  color="#fb923c" desc="inconsciente compensando o consciente" />
          <ProcessBar label="Numinosidade" value={numinosidade} color="#f5c842" desc="qualidade sagrada — Self ativo" />
          <ProcessBar label="Complexo Ativo" value={complexo}   color="#c084fc" desc="dissociação parcial em curso" />
          {enantiodromia > 0.05 && (
            <ProcessBar label="Enantiodromia" value={enantiodromia} color="#f43f5e" desc="reversão iminente dos opostos" />
          )}
          {/* Progressão / Regressão bipolar */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[8px] font-mono" style={{ color: progrColor + 'cc' }}>
                {progrDir ? 'Progressão' : 'Regressão'}
              </span>
              <span className="text-[7px] font-mono" style={{ color: progrColor + '99' }}>{progrLabel}</span>
            </div>
            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden relative">
              <div className="absolute top-0 left-1/2 w-px h-full bg-white/20" />
              {progrDir ? (
                <div className="absolute top-0 left-1/2 h-full rounded-r-full transition-all duration-700"
                  style={{ width: `${progrPct * 50}%`, background: `linear-gradient(90deg, ${progrColor}66, ${progrColor}cc)` }} />
              ) : (
                <div className="absolute top-0 h-full rounded-l-full transition-all duration-700"
                  style={{ right: '50%', width: `${progrPct * 50}%`, background: `linear-gradient(270deg, ${progrColor}66, ${progrColor}cc)` }} />
              )}
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-[6.5px] text-white/18">← Regressão</span>
              <span className="text-[6.5px] text-white/18">Progressão →</span>
            </div>
          </div>
          <div className="pt-1 border-t border-white/[0.05]">
            <p className="text-[7px] text-white/25 italic leading-snug">
              {interpretJung(compensacao, numinosidade, complexo, progressao, phase)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

function interpretJung(comp: number, numen: number, cplx: number, prog: number, phase: PsychePhase): string {
  if (numen > 0.55)  return 'Self ativo — individuação emergente. Raro e precioso.';
  if (cplx  > 0.60)  return 'Complexo autônomo dominante. Ego perdeu o centro.';
  if (comp  > 0.70)  return 'Compensação intensa. O oposto do estado consciente pressiona.';
  if (prog  > 0.50)  return 'Libido progressiva — energia fluindo para formas superiores.';
  if (prog  < -0.40) return 'Regressão ativa — libido voltando ao modo primitivo.';
  if (phase === 'FLOW')  return 'Função Transcendente ativa — síntese cosciênte/inconsciente.';
  if (phase === 'PANIC') return 'Enantiodromia em curso — ruptura antes da renovação.';
  return 'Processo em andamento — padrões emergentes aguardando leitura.';
}

// ─────────────────────────────────────────────────────────────────────────────
// ── PAINEL FREUD — Aparelho Psíquico + economia libidinal ────────────────────
// Pulsões, defesas, topografia do aparelho
// ─────────────────────────────────────────────────────────────────────────────
const FreudPanel: React.FC<{ metrics?: FreudMetrics; phase: PsychePhase }> = ({ metrics, phase }) => {
  const [open, setOpen] = useState(true);
  if (!metrics) return null;

  // Distribuição topográfica (Id / Ego / Superego) como barras horizontais
  const total = metrics.idPower + metrics.egoStrength + metrics.superegoForce + 0.001;
  const idFrac  = metrics.idPower       / total;
  const egoFrac = metrics.egoStrength   / total;
  const sgFrac  = metrics.superegoForce / total;

  // Interpretação clínica freudiana
  const interpretFreud = (): string => {
    if (metrics.eros   > 0.65) return 'Eros dominante — libido expansiva, tendência à ligação.';
    if (metrics.thanatos > 0.55) return 'Thanatos emergente — compulsão de repetição ativa.';
    if (metrics.repressao > 0.60) return 'Alta repressão — material inconsciente sob pressão.';
    if (metrics.sublimacao > 0.55) return 'Sublimação ativa — energia pulsional transformada.';
    if (phase === 'PANIC') return 'Retorno do reprimido — defesas rompidas pelo acúmulo.';
    if (phase === 'FLOW')  return 'Princípio da realidade em equilíbrio com o prazer.';
    return 'Economia libidinal em negociação — Id, Ego e Superego em tensão.';
  };

  return (
    <div className="rounded-lg overflow-hidden border" style={{ borderColor: '#f4a46033', background: 'rgba(0,0,0,0.5)' }}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
        <span className="text-[8px] uppercase tracking-widest" style={{ color: '#f4a46066' }}>
          △ Aparelho Psíquico
        </span>
        {open ? <ChevronUp size={9} style={{ color: '#f4a46055' }} /> : <ChevronDown size={9} style={{ color: '#f4a46055' }} />}
      </button>
      {open && (
        <div className="border-t px-3 py-2.5 space-y-3" style={{ borderColor: '#f4a46018' }}>

          {/* Distribuição topográfica — barra tripartida */}
          <div>
            <div className="text-[7px] uppercase tracking-widest mb-1.5" style={{ color: '#f4a46044' }}>
              Distribuição topográfica
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
              <div className="transition-all duration-700" style={{ width: `${idFrac*100}%`, background: 'rgba(239,68,68,0.7)' }} title="Id" />
              <div className="transition-all duration-700" style={{ width: `${egoFrac*100}%`, background: 'rgba(59,130,246,0.7)' }} title="Ego" />
              <div className="transition-all duration-700" style={{ width: `${sgFrac*100}%`, background: 'rgba(156,163,175,0.6)' }} title="Superego" />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[6.5px]" style={{ color: '#ef444499' }}>Id {Math.round(idFrac*100)}%</span>
              <span className="text-[6.5px]" style={{ color: '#3b82f699' }}>Ego {Math.round(egoFrac*100)}%</span>
              <span className="text-[6.5px]" style={{ color: '#9ca3af99' }}>SG {Math.round(sgFrac*100)}%</span>
            </div>
          </div>

          {/* Pulsões e defesas */}
          <ProcessBar label="Eros"       value={metrics.eros}       color="#f472b6" desc="pulsão de vida — ligação, amor" />
          <ProcessBar label="Thanatos"   value={metrics.thanatos}   color="#64748b" desc="pulsão de morte — dissolução, repetição" />
          <ProcessBar label="Repressão"  value={metrics.repressao}  color="#f4a460" desc="inibição do Superego — material bloqueado" />
          <ProcessBar label="Sublimação" value={metrics.sublimacao} color="#86efac" desc="energia pulsional transformada" />

          {/* Força das instâncias */}
          <div className="pt-1 border-t" style={{ borderColor: '#f4a46015' }}>
            <div className="text-[7px] uppercase tracking-widest mb-1.5" style={{ color: '#f4a46044' }}>
              Força das instâncias
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-mono w-14" style={{ color: '#ef444499' }}>Id</span>
                <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${metrics.idPower*100}%`, background: '#ef4444aa' }} />
                </div>
                <span className="text-[7px] font-mono" style={{ color: '#ef444466' }}>{Math.round(metrics.idPower*100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-mono w-14" style={{ color: '#3b82f699' }}>Ego</span>
                <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${metrics.egoStrength*100}%`, background: '#3b82f6aa' }} />
                </div>
                <span className="text-[7px] font-mono" style={{ color: '#3b82f666' }}>{Math.round(metrics.egoStrength*100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-mono w-14" style={{ color: '#9ca3af99' }}>Superego</span>
                <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${metrics.superegoForce*100}%`, background: '#9ca3afaa' }} />
                </div>
                <span className="text-[7px] font-mono" style={{ color: '#9ca3af66' }}>{Math.round(metrics.superegoForce*100)}%</span>
              </div>
            </div>
          </div>

          {/* Interpretação */}
          <div className="pt-1 border-t" style={{ borderColor: '#f4a46015' }}>
            <p className="text-[7px] italic leading-snug" style={{ color: '#f4a46077' }}>
              {interpretFreud()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ── PAINEL LACAN — RSI + Gozo + Sujeito Dividido ─────────────────────────────
// Os três registros borromeanamente entrelaçados
// ─────────────────────────────────────────────────────────────────────────────
const LacanPanel: React.FC<{ metrics?: LacanMetrics; phase: PsychePhase; integration: number }> = ({
  metrics, phase, integration,
}) => {
  const [open, setOpen] = useState(true);
  if (!metrics) return null;

  const rsiTotal   = metrics.real + metrics.simbolico + metrics.imaginario + 0.001;
  const realFrac   = metrics.real       / rsiTotal;
  const simbFrac   = metrics.simbolico  / rsiTotal;
  const imagFrac   = metrics.imaginario / rsiTotal;

  const interpretLacan = (): string => {
    if (metrics.real > 0.45)        return 'Irrupção do Real — o inassimilável invade o campo.';
    if (metrics.gozo > 0.65)        return 'Gozo intenso — além do princípio do prazer, Coisa lacaniana.';
    if (metrics.falta > 0.75)       return 'Falta estrutural dominante — desejo como motor sem objeto.';
    if (metrics.sujeito > 0.60)     return 'Sujeito dividido em crise — falha na cadeia significante.';
    if (metrics.simbolico > 0.55)   return 'Ordem Simbólica forte — Lei do Pai operativa.';
    if (metrics.imaginario > 0.55)  return 'Registro Imaginário dominante — identificação especular.';
    if (phase === 'FLOW')           return 'Circulação borromiana equilibrada — RSI em tensão criativa.';
    if (phase === 'PANIC')          return 'Nó borromiano solto — psicose ou passagem ao ato iminente.';
    return 'Registros RSI em reorganização — sujeito em travessia.';
  };

  return (
    <div className="rounded-lg overflow-hidden border" style={{ borderColor: '#e0a0ff33', background: 'rgba(0,0,0,0.5)' }}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
        <span className="text-[8px] uppercase tracking-widest" style={{ color: '#e0a0ff66' }}>
          ◻ Topologia RSI
        </span>
        {open ? <ChevronUp size={9} style={{ color: '#e0a0ff55' }} /> : <ChevronDown size={9} style={{ color: '#e0a0ff55' }} />}
      </button>
      {open && (
        <div className="border-t px-3 py-2.5 space-y-3" style={{ borderColor: '#e0a0ff18' }}>

          {/* Distribuição RSI — barra tripartida */}
          <div>
            <div className="text-[7px] uppercase tracking-widest mb-1.5" style={{ color: '#e0a0ff44' }}>
              Proporção dos registros
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
              <div className="transition-all duration-700" title="Real"
                style={{ width: `${realFrac*100}%`, background: 'rgba(220,38,38,0.75)' }} />
              <div className="transition-all duration-700" title="Simbólico"
                style={{ width: `${simbFrac*100}%`, background: 'rgba(59,130,246,0.75)' }} />
              <div className="transition-all duration-700" title="Imaginário"
                style={{ width: `${imagFrac*100}%`, background: 'rgba(245,200,66,0.7)' }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[6.5px]" style={{ color: '#dc262699' }}>R {Math.round(realFrac*100)}%</span>
              <span className="text-[6.5px]" style={{ color: '#3b82f699' }}>S {Math.round(simbFrac*100)}%</span>
              <span className="text-[6.5px]" style={{ color: '#f5c84299' }}>I {Math.round(imagFrac*100)}%</span>
            </div>
          </div>

          {/* Registros */}
          <ProcessBar label="Real"       value={metrics.real}       color="#dc2626" desc="o inassimilável — trauma, gozo puro" />
          <ProcessBar label="Simbólico"  value={metrics.simbolico}  color="#3b82f6" desc="rede significante — Lei, Outro, linguagem" />
          <ProcessBar label="Imaginário" value={metrics.imaginario} color="#f5c842" desc="identificação especular — Ego, imagem" />

          {/* Conceitos lacanianos */}
          <div className="pt-1 border-t" style={{ borderColor: '#e0a0ff15' }}>
            <div className="text-[7px] uppercase tracking-widest mb-1.5" style={{ color: '#e0a0ff44' }}>
              Conceitos
            </div>
            <div className="space-y-2">
              <ProcessBar label="Gozo (J)"   value={metrics.gozo}    color="#f43f5e" desc="jouissance — além do prazer" />
              <ProcessBar label="Falta (∅)"  value={metrics.falta}   color="#e0a0ff" desc="manque — buraco estrutural do desejo" />
              <ProcessBar label="Sujeito $"  value={metrics.sujeito} color="#a78bfa" desc="divisão — efeito do significante" />
            </div>
          </div>

          {/* Nó borromiano — visualização simbólica */}
          <div className="flex items-center justify-center gap-3 py-2">
            {[
              { label: 'R', color: '#dc2626', v: metrics.real },
              { label: 'S', color: '#3b82f6', v: metrics.simbolico },
              { label: 'I', color: '#f5c842', v: metrics.imaginario },
            ].map(({ label, color, v }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className="rounded-full border-2 flex items-center justify-center transition-all duration-700"
                  style={{
                    width: 28 + v * 18, height: 28 + v * 18,
                    borderColor: color + '80',
                    background: color + '15',
                    boxShadow: `0 0 ${v * 12}px ${color}40`,
                  }}>
                  <span className="text-[10px] font-mono" style={{ color }}>{label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Interpretação */}
          <div className="pt-1 border-t" style={{ borderColor: '#e0a0ff15' }}>
            <p className="text-[7px] italic leading-snug" style={{ color: '#e0a0ff77' }}>
              {interpretLacan()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ── MAPA PSÍQUICO — componente unificado, camadas via props ──────────────────
// ─────────────────────────────────────────────────────────────────────────────
const MapaPanel: React.FC<{
  title:   string;
  camadas: { sigil: string; name: string; color: string; desc: string }[];
  intro:   string;
  legenda: [string, string, string][];
}> = ({ title, camadas, intro, legenda }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-black/50 backdrop-blur-sm border border-white/[0.07] rounded-lg overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-1.5">
          <Map size={10} className="text-purple-400/40" />
          <span className="text-[8px] uppercase tracking-widest text-white/25">{title}</span>
        </div>
        {open ? <ChevronUp size={9} className="text-white/25" /> : <ChevronDown size={9} className="text-white/25" />}
      </button>
      {open && (
        <div className="border-t border-white/[0.06] px-3 py-2 space-y-1.5">
          <p className="text-[7.5px] text-white/22 italic mb-2 leading-snug">{intro}</p>
          {camadas.map(c => (
            <div key={c.name} className="flex gap-2 items-center">
              <span className="text-[13px] shrink-0" style={{ color: c.color }}>{c.sigil}</span>
              <div className="min-w-0">
                <span className="text-[9px] font-mono" style={{ color: c.color }}>{c.name}</span>
                <span className="text-[7.5px] text-white/30 ml-1.5">{c.desc}</span>
              </div>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-white/[0.05]">
            <div className="text-[7px] uppercase tracking-widest text-white/18 mb-1">Lentes de cor</div>
            {legenda.map(([color, label, desc]) => (
              <div key={label} className="flex items-center gap-1.5 mb-0.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color + 'cc' }} />
                <span className="text-[7px] font-mono" style={{ color: color + 'bb' }}>{label}</span>
                <span className="text-[7px] text-white/18">— {desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
