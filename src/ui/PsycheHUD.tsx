// ── Psyche Lab — HUD (Design System: DOTO/MONO, dashed borders, #8b5cf6 accent)
import React, { useState } from 'react';
import { PSYCHE_PRESETS } from '../sim/psyche/psychePresets';
import { PsycheLens, PsychePhase, FreudMetrics, LacanMetrics } from '../sim/psyche/psycheTypes';
import { ARCHETYPES } from '../sim/psyche/archetypes';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface NarrativeEntry {
  text:  string;
  color: string;
  time:  number;
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
  overlayOn:          boolean;
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
  onOverlayToggle:     () => void;
  onTrailFadeChange:   (v: number) => void;
  onTrailOpacityChange:(v: number) => void;
  onTrailWidthChange:  (v: number) => void;
  bondWidth:           number;
  bondOpacity:         number;
  onBondWidthChange:   (v: number) => void;
  onBondOpacityChange: (v: number) => void;
  running:             boolean;
  onToggleRun:         () => void;
  onReset:             () => void;
  onOpenConsciousness: () => void;
  freudMetrics?:       FreudMetrics;
  lacanMetrics?:       LacanMetrics;
  damping:             number;
  stateRelaxRate:      number;
  frozenFlow:          boolean;
  soulVis:             number;
  onDampingChange:     (v: number) => void;
  onStateRelaxChange:  (v: number) => void;
  onFrozenFlowToggle:  () => void;
  onSoulVisChange:     (v: number) => void;
  bgColor:             string;
  onBgColorChange:     (c: string) => void;
}

const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";
const ACCENT = '#8b5cf6';

const PHASE_INFO: Record<PsychePhase, { label: string; desc: string; color: string }> = {
  CALM:        { label: 'CALMO',       desc: 'Equilíbrio dinâmico',           color: '#93c5fd' },
  ALERT:       { label: 'ALERTA',      desc: 'Tensão crescente',               color: '#fde047' },
  PANIC:       { label: 'COLAPSO',     desc: 'Ruptura caótica',                color: '#f87171' },
  FLOW:        { label: 'FLUXO',       desc: 'Coerência elevada — Self ativo', color: '#86efac' },
  FRAGMENTED:  { label: 'FRAGMENTADO', desc: 'Dissociação ativa',              color: '#fdba74' },
  INTEGRATING: { label: 'INTEGRANDO',  desc: 'Síntese emergente',              color: '#c4b5fd' },
};

const PHASE_FREUD: Record<PsychePhase, string> = {
  CALM:        'Princípio de Prazer estável — Eros domina',
  ALERT:       'Conflito pulsional — Id vs Superego',
  PANIC:       'Retorno do Reprimido — defesas rompidas',
  FLOW:        'Sublimação ativa — Eros liberto',
  FRAGMENTED:  'Angústia de fragmentação — Ego frágil',
  INTEGRATING: 'Elaboração psíquica — Trabalho de luto',
};

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
  { sigil:'🔥', name:'Id',       color:'#ef4444', desc:'Reservatório pulsional' },
  { sigil:'◻',  name:'Ego',      color:'#3b82f6', desc:'Realidade — mediador' },
  { sigil:'⚖',  name:'Superego', color:'#9ca3af', desc:'Lei e ideal — censura' },
  { sigil:'↑',  name:'Eros',     color:'#f472b6', desc:'Pulsão de Vida' },
  { sigil:'↓',  name:'Thanatos', color:'#64748b', desc:'Pulsão de Morte' },
];

const CAMADAS_LACAN = [
  { sigil:'◼', name:'Real',       color:'#dc2626', desc:'O inassimilável' },
  { sigil:'◻', name:'Simbólico', color:'#3b82f6', desc:'Rede de significantes' },
  { sigil:'○', name:'Imaginário', color:'#f5c842', desc:'Identificações do Ego' },
  { sigil:'S', name:'Sujeito $',  color:'#a78bfa', desc:'Sujeito dividido' },
  { sigil:'a', name:'Objeto a',   color:'#fb923c', desc:'Causa do desejo' },
];

const QUANTA_OPTIONS = [300, 600, 900, 1200];

const BG_PRESETS: { hex: string; label: string }[] = [
  { hex: '#000000', label: 'Preto' },
  { hex: '#0a0a0a', label: 'Quase preto' },
  { hex: '#0d0d1a', label: 'Índigo escuro' },
  { hex: '#0a0f0a', label: 'Verde escuro' },
  { hex: '#1a1a1a', label: 'Cinza escuro' },
  { hex: '#f5f5f0', label: 'Quase branco' },
  { hex: '#ffffff', label: 'Branco' },
];

// ── Shared inline styles ────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.94)',
  border: '1px dashed rgba(255,255,255,0.06)',
  overflow: 'hidden',
};

const sectionHeaderStyle = (accent = 'rgba(255,255,255,0.22)'): React.CSSProperties => ({
  background: 'none', border: 'none', cursor: 'pointer',
  width: '100%', padding: '8px 12px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  fontFamily: DOTO, fontSize: 10, color: accent,
  letterSpacing: '0.08em', textTransform: 'uppercase',
  transition: 'background 0.15s',
});

const labelStyle: React.CSSProperties = {
  fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.35)',
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

const valueStyle: React.CSSProperties = {
  fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.22)',
};

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

  const phaseDesc = isFreud ? PHASE_FREUD[props.phase]
                  : isLacan ? PHASE_LACAN[props.phase]
                  : phaseInfo.desc;

  const phaseTitle = isFreud ? 'estado libidinal'
                   : isLacan ? 'posição subjetiva'
                   : 'estado psíquico';

  const theoryAccent = isFreud ? '#f4a460' : isLacan ? '#e0a0ff' : phaseInfo.color;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 20, userSelect: 'none' }}>

      {/* ── STABLE MODE BADGE ──────────────────────────────────────────── */}
      {isStable && (
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 30,
          ...cardStyle, padding: '4px 14px',
          display: 'flex', alignItems: 'center', gap: 6,
          borderColor: 'rgba(120,240,160,0.20)',
        }}>
          <span style={{ color: 'rgba(100,230,140,0.70)', fontSize: 8 }}>◉</span>
          <span style={{ ...labelStyle, color: 'rgba(100,230,140,0.60)' }}>campo estável</span>
          <span style={{ ...valueStyle, color: 'rgba(100,230,140,0.30)' }}>frozenFlow</span>
        </div>
      )}

      {/* ── LEFT DOCK ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', left: 10, top: 50, bottom: 10, width: 172,
        pointerEvents: 'auto', overflowY: 'auto', overflowX: 'hidden',
        scrollbarWidth: 'thin' as any, scrollbarColor: `${ACCENT}40 transparent`,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}>

          {/* Control bar */}
          <div style={{ ...cardStyle, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <button onClick={props.onToggleRun} style={{
              flex: 1, padding: '4px 0', fontFamily: MONO, fontSize: 9,
              background: 'none', cursor: 'pointer',
              border: `1px dashed ${props.running ? 'rgba(255,255,255,0.10)' : `${ACCENT}40`}`,
              color: props.running ? 'rgba(255,255,255,0.40)' : `${ACCENT}cc`,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {props.running ? '⏸ Pausar' : '▶ Iniciar'}
            </button>
            <button onClick={props.onReset} title="Reiniciar" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.25)', fontSize: 13, padding: '0 4px',
            }}>↺</button>
            <button onClick={props.onCinematicToggle} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: props.cinematicMode ? ACCENT : 'rgba(255,255,255,0.20)',
              fontSize: 10, padding: '0 2px',
            }}>
              {props.cinematicMode ? '◉' : '○'}
            </button>
          </div>

          {/* Phase card */}
          <div style={{
            ...cardStyle,
            borderColor: (isTheory ? theoryAccent : phaseInfo.color) + '18',
            padding: '10px 12px',
          }}>
            <div style={{ ...labelStyle, color: (isTheory ? theoryAccent : phaseInfo.color) + '80', marginBottom: 4 }}>
              {phaseTitle}
            </div>
            <div style={{
              fontFamily: DOTO, fontSize: 13, letterSpacing: '0.1em',
              color: isTheory ? theoryAccent : phaseInfo.color, marginBottom: 3,
            }}>
              {phaseInfo.label}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 7, lineHeight: 1.5, color: (isTheory ? theoryAccent : phaseInfo.color) + '70' }}>
              {phaseDesc}
            </div>
          </div>

          {/* Metrics */}
          {isFreud && props.freudMetrics ? (
            <div style={{ ...cardStyle, borderColor: '#f4a46018', padding: '10px 12px' }}>
              <div style={{ ...labelStyle, color: '#f4a46050', marginBottom: 8 }}>Índices Freudianos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <MetricRow label="Eros"      sublabel="pulsão de vida"   value={props.freudMetrics.eros}     color="#f472b6" />
                <MetricRow label="Thanatos"  sublabel="pulsão de morte"  value={props.freudMetrics.thanatos} color="#64748b" />
                <MetricRow label="Repressão" sublabel="bloqueio do Ego"  value={props.freudMetrics.repressao} color="#f4a460" />
                <MetricRow label="Sublimação" sublabel="energia transformada" value={props.freudMetrics.sublimacao} color="#86efac" />
              </div>
            </div>
          ) : isLacan && props.lacanMetrics ? (
            <div style={{ ...cardStyle, borderColor: '#e0a0ff18', padding: '10px 12px' }}>
              <div style={{ ...labelStyle, color: '#e0a0ff50', marginBottom: 8 }}>Registros RSI</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <MetricRow label="Real"       sublabel="o inassimilável"        value={props.lacanMetrics.real}       color="#dc2626" />
                <MetricRow label="Simbólico"  sublabel="rede de significantes"  value={props.lacanMetrics.simbolico}  color="#3b82f6" />
                <MetricRow label="Imaginário" sublabel="identificação especular" value={props.lacanMetrics.imaginario} color="#f5c842" />
              </div>
            </div>
          ) : (
            <div style={{ ...cardStyle, padding: '10px 12px' }}>
              <div style={{ ...labelStyle, marginBottom: 8 }}>Índices</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <MetricRow label="Integração"   sublabel="coesão psíquica"    value={props.integrationIndex}            color="#f5c842" />
                <MetricRow label="Tensão"       sublabel="conflito de forças" value={props.tensionIndex}               color="#f87171" />
                <MetricRow label="Fragmentação" sublabel="dissociação"        value={Math.min(1, props.fragmentIndex)} color="#fb923c" />
              </div>
            </div>
          )}

          {/* Velocidade */}
          <div style={{ ...cardStyle, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={labelStyle}>Velocidade</span>
              <span style={valueStyle}>{Math.round(props.danceIntensity * 100)}%</span>
            </div>
            <input type="range" min={0.04} max={0.80} step={0.01}
              value={props.danceIntensity}
              onChange={e => props.onDanceChange(parseFloat(e.target.value))}
              style={{ width: '100%', height: 2, accentColor: ACCENT, cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
              <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.15)' }}>Contemplativo</span>
              <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.15)' }}>Intenso</span>
            </div>
          </div>

          {/* Parâmetros */}
          <Section title="Parâmetros" open={showParams} onToggle={() => setShowParams(v => !v)}>
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ParamSlider label="Dança"      hint="intensidade do flow field"  value={props.flowGain}     min={0.05} max={0.80} step={0.05} display={v => `${Math.round(v*100)}%`} color="#c4b5fd" onChange={props.onFlowGainChange} />
              <ParamSlider label="Molas"      hint="rigidez dos vínculos"       value={props.springK}      min={0.10} max={2.00} step={0.05} display={v => v.toFixed(2)}            color="#86efac" onChange={props.onSpringKChange} />
              <ParamSlider label="Alcance"    hint="raio de conexão"            value={props.linkRadius}   min={0.04} max={0.18} step={0.005} display={v => v.toFixed(3)}           color="#67e8f9" onChange={props.onLinkRadiusChange} />
              <ParamSlider label="Respiração" hint="ciclo em segundos"          value={props.breathPeriod} min={6}    max={60}   step={1}    display={v => `${Math.round(v)}s`}    color="#fca5a5" onChange={props.onBreathPeriodChange} />
            </div>
          </Section>

          {/* Física Psíquica */}
          <div style={cardStyle}>
            <div style={{ padding: '8px 12px', borderBottom: '1px dashed rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: DOTO, fontSize: 10, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Física Psíquica</span>
              <button onClick={props.onFrozenFlowToggle} style={{
                padding: '2px 8px', fontFamily: MONO, fontSize: 7,
                background: props.frozenFlow ? 'rgba(100,230,140,0.08)' : 'none',
                border: `1px dashed ${props.frozenFlow ? 'rgba(100,230,140,0.30)' : 'rgba(255,255,255,0.08)'}`,
                color: props.frozenFlow ? 'rgba(100,230,140,0.75)' : 'rgba(255,255,255,0.25)',
                cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {props.frozenFlow ? '◉ fixo' : '○ livre'}
              </button>
            </div>
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ParamSlider label="Inércia" hint="resistência à mudança" value={props.damping} min={0.3} max={20} step={0.1} display={v => v.toFixed(1)} color="#fbbf24" onChange={props.onDampingChange} />
              <ParamSlider label="Memória" hint="velocidade de mudança interna" value={props.stateRelaxRate} min={0.05} max={3.0} step={0.05} display={v => `${v.toFixed(2)}×`} color="#67e8f9" onChange={props.onStateRelaxChange} />
            </div>
          </div>

          {/* Alma Individual */}
          <div style={{ ...cardStyle, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={labelStyle}>Alma</span>
              <span style={valueStyle}>{Math.round(props.soulVis * 100)}%</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.15)', marginBottom: 5, lineHeight: 1.5 }}>
              identidade individual de cada quantum
            </div>
            <input type="range" min={0} max={1} step={0.02} value={props.soulVis}
              onChange={e => props.onSoulVisChange(parseFloat(e.target.value))}
              style={{ width: '100%', height: 2, accentColor: ACCENT, cursor: 'pointer' }} />
          </div>

          {/* Lente */}
          <Section title="Lente" open={showLens} onToggle={() => setShowLens(v => !v)}
            accent={LENSES.find(l => l.id === props.lens)?.color ?? ACCENT}
            extra={<span style={{ fontFamily: MONO, fontSize: 8, color: LENSES.find(l => l.id === props.lens)?.color ?? '#aaa' }}>{LENSES.find(l => l.id === props.lens)?.label}</span>}>
            <div style={{ padding: '4px 8px' }}>
              {LENSES.map(l => (
                <button key={l.id} onClick={() => { props.onLensChange(l.id); setShowLens(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '5px 6px', background: props.lens === l.id ? 'rgba(255,255,255,0.04)' : 'none',
                    border: 'none', cursor: 'pointer',
                    borderLeft: `2px solid ${props.lens === l.id ? l.color + '60' : 'transparent'}`,
                    fontFamily: MONO, fontSize: 9,
                    color: props.lens === l.id ? l.color : 'rgba(255,255,255,0.30)',
                    transition: 'all 0.1s',
                  }}>
                  {l.group === 'teoria' && <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>{l.group}</div>}
                  {l.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Toggles */}
          <div style={{ ...cardStyle, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Toggle label="Mapa"     on={props.overlayOn}   onToggle={props.onOverlayToggle}   color="#c4b5fd" />
            <Toggle label="Campo"    on={props.campoOn}     onToggle={props.onCampoToggle}     color="#06b6d4" />
            <Toggle label="Vetores"  on={props.fieldOn}     onToggle={props.onFieldToggle}     color="#a3e635" />
            <Toggle label="Rastros"  on={props.trailOn}     onToggle={props.onTrailToggle}     color="#a78bfa" />
            <Toggle label="Bonds"    on={props.bondsOn}     onToggle={props.onBondsToggle}     color="#67e8f9" />
            <Toggle label="Arquétipos" on={props.archetypesOn} onToggle={props.onArchetypesToggle} color="#fde047" />
            {isRedBook && <Toggle label="Jornada" on={props.journeyOn} onToggle={props.onJourneyToggle} color="#c4b5fd" />}
            {props.bondsOn && (
              <div style={{ paddingTop: 6, borderTop: '1px dashed rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <ParamSlider label="Espessura" hint="bonds" value={props.bondWidth} min={0.3} max={4.0} step={0.1} display={v => v.toFixed(1)} color="#67e8f9" onChange={props.onBondWidthChange} />
                <ParamSlider label="Opac. bonds" hint="" value={props.bondOpacity} min={0.05} max={1.00} step={0.05} display={v => `${Math.round(v*100)}%`} color="#67e8f9" onChange={props.onBondOpacityChange} />
              </div>
            )}
            {props.trailOn && (
              <div style={{ paddingTop: 6, borderTop: '1px dashed rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <ParamSlider label="Memória" hint="rastros" value={props.trailFade} min={0.01} max={0.20} step={0.005} display={v => v.toFixed(3)} color="#a78bfa" onChange={props.onTrailFadeChange} />
                <ParamSlider label="Opac. rastro" hint="" value={props.trailOpacity} min={0.10} max={1.00} step={0.05} display={v => `${Math.round(v*100)}%`} color="#a78bfa" onChange={props.onTrailOpacityChange} />
                <ParamSlider label="Cauda" hint="" value={props.trailWidth} min={1} max={8} step={0.5} display={v => v.toFixed(1)} color="#a78bfa" onChange={props.onTrailWidthChange} />
              </div>
            )}
          </div>

          {/* Quanta count */}
          <div style={{ ...cardStyle, padding: '8px 12px' }}>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Partículas</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {QUANTA_OPTIONS.map(n => (
                <button key={n} onClick={() => props.onQuantaChange(n)} style={{
                  padding: '3px 0', fontFamily: MONO, fontSize: 8,
                  background: props.quantaCount === n ? `${ACCENT}10` : 'none',
                  border: `1px dashed ${props.quantaCount === n ? `${ACCENT}40` : 'rgba(255,255,255,0.06)'}`,
                  color: props.quantaCount === n ? `${ACCENT}cc` : 'rgba(255,255,255,0.22)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {n >= 1000 ? `${n/1000}k` : n}
                </button>
              ))}
            </div>
          </div>

          {/* Background color */}
          <div style={{ ...cardStyle, padding: '8px 12px' }}>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Fundo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 20, height: 20,
                  border: '1px dashed rgba(255,255,255,0.12)',
                  background: props.bgColor,
                  cursor: 'pointer',
                }} />
                <input type="color" value={props.bgColor} onChange={e => props.onBgColorChange(e.target.value)}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.30)' }}>{props.bgColor}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
              {BG_PRESETS.map(bg => (
                <button key={bg.hex} onClick={() => props.onBgColorChange(bg.hex)} title={bg.label} style={{
                  width: 18, height: 18, cursor: 'pointer',
                  background: bg.hex,
                  border: `1px dashed ${props.bgColor === bg.hex ? `${ACCENT}55` : 'rgba(255,255,255,0.08)'}`,
                  transition: 'border-color 0.15s',
                }} />
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── RIGHT DOCK ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', right: 10, top: 50, bottom: 10, width: 208,
        pointerEvents: 'auto', overflowY: 'auto', overflowX: 'hidden',
        scrollbarWidth: 'thin' as any, scrollbarColor: `${ACCENT}40 transparent`,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}>

          {/* Nova Consciência */}
          <button onClick={props.onOpenConsciousness} style={{
            width: '100%', padding: '10px 0',
            background: `${ACCENT}06`, border: `1px dashed ${ACCENT}25`,
            color: `${ACCENT}90`, fontFamily: MONO, fontSize: 9,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.15s',
          }}>
            ◈ Nova Consciência
          </button>

          {/* Preset selector */}
          <Section title="Preset" open={showPresets} onToggle={() => setShowPresets(v => !v)} accent={`${ACCENT}80`}
            extra={<span style={{ fontFamily: MONO, fontSize: 8, color: `${ACCENT}60` }}>{currentPreset?.name ?? '—'}</span>}>
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {PSYCHE_PRESETS.map(p => (
                <button key={p.id} onClick={() => { props.onPresetChange(p.id); setShowPresets(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 12px', background: 'none', cursor: 'pointer',
                    borderLeft: `2px solid ${props.presetId === p.id ? `${ACCENT}60` : 'transparent'}`,
                    borderTop: 'none', borderRight: 'none', borderBottom: '1px dashed rgba(255,255,255,0.03)',
                    transition: 'all 0.1s',
                  }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: props.presetId === p.id ? `${ACCENT}cc` : 'rgba(255,255,255,0.45)', marginBottom: 2 }}>
                    {p.name}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.18)', lineHeight: 1.4 }}>
                    {p.observe}
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* Narrative Log */}
          <Section title="Crônica" open={showLog} onToggle={() => setShowLog(v => !v)}
            extra={props.narrativeLog.length > 0 ? <span style={{ fontFamily: MONO, fontSize: 7, color: `${ACCENT}50` }}>{props.narrativeLog.length}</span> : undefined}>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {props.narrativeLog.length === 0 ? (
                <p style={{ padding: '10px 12px', fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>
                  Nenhum evento ainda.
                </p>
              ) : (
                [...props.narrativeLog].reverse().map((entry, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 12px', borderBottom: '1px dashed rgba(255,255,255,0.03)' }}>
                    <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.18)', flexShrink: 0, marginTop: 1 }}>
                      {formatTime(entry.time)}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 8, lineHeight: 1.4, color: entry.color + 'bb' }}>
                      {entry.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Section>

          {/* Theory panels */}
          {isFreud ? (
            <FreudPanel metrics={props.freudMetrics} phase={props.phase} />
          ) : isLacan ? (
            <LacanPanel metrics={props.lacanMetrics} phase={props.phase} integration={props.integrationIndex} />
          ) : (
            <ProcessoJungPanel integration={props.integrationIndex} tension={props.tensionIndex} fragment={props.fragmentIndex} phase={props.phase} />
          )}

          {/* Map panel */}
          {isFreud ? (
            <MapaPanel title="Aparelho Psíquico" camadas={CAMADAS_FREUD} intro="Cada quantum habita zonas do aparelho freudiano."
              legenda={[['#ef4444','Id','pulsão crua'],['#3b82f6','Ego','realidade'],['#9ca3af','Superego','lei']]} />
          ) : isLacan ? (
            <MapaPanel title="Topologia RSI" camadas={CAMADAS_LACAN} intro="Real, Simbólico, Imaginário — borromeanamente ligados."
              legenda={[['#dc2626','Real','inassimilável'],['#3b82f6','Simbólico','lei/linguagem'],['#f5c842','Imaginário','espelho']]} />
          ) : (
            <MapaPanel title="Mapa Psíquico" camadas={CAMADAS_JUNG} intro="Cada quantum navega por regiões que modulam seu estado."
              legenda={[['#ef4444','Vermelho','alta energia'],['#3b82f6','Azul','coerência'],['#86efac','Verde','valência +'],['#7c3aed','Roxo','sombra'],['#f5c842','Dourado','Self']]} />
          )}

          {/* Archetypes */}
          {props.archetypesOn && (
            <Section title="Arquétipos" open={showArchPanel} onToggle={() => setShowArchPanel(v => !v)}>
              <div style={{ padding: '4px 8px', maxHeight: 280, overflowY: 'auto' }}>
                {ARCHETYPES.map((arch, idx) => (
                  <div key={arch.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                    <button onClick={() => props.onArchActiveToggle(idx)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, flexShrink: 0,
                      opacity: props.archetypeActive[idx] ? 1 : 0.2, transition: 'opacity 0.2s',
                    }}>
                      {arch.sigil}
                    </button>
                    <span style={{
                      fontFamily: MONO, fontSize: 8, width: 56, flexShrink: 0,
                      color: props.archetypeActive[idx] ? arch.color : 'rgba(255,255,255,0.15)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {arch.id}
                    </span>
                    <input type="range" min={0} max={1} step={0.05}
                      value={props.archetypeStrengths[idx]}
                      disabled={!props.archetypeActive[idx]}
                      onChange={e => props.onArchStrengthChange(idx, parseFloat(e.target.value))}
                      style={{ flex: 1, height: 2, accentColor: arch.color, cursor: 'pointer', opacity: props.archetypeActive[idx] ? 1 : 0.15 }} />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Journey */}
          {props.journeyOn && props.journeyChapter && (
            <div style={{ ...cardStyle, borderColor: `${ACCENT}15`, padding: '10px 12px' }}>
              <div style={{ ...labelStyle, color: `${ACCENT}40`, marginBottom: 5 }}>Ato {props.journeyAct + 1}</div>
              <p style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', lineHeight: 1.6 }}>
                {props.journeyChapter}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, open, onToggle, children, accent = 'rgba(255,255,255,0.22)', extra }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode; accent?: string; extra?: React.ReactNode;
}) {
  return (
    <div style={cardStyle}>
      <button onClick={onToggle} style={{ ...sectionHeaderStyle(accent) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {open ? <ChevronDown size={9} style={{ opacity: 0.35 }} /> : <ChevronRight size={9} style={{ opacity: 0.35 }} />}
          {title}
        </div>
        {extra}
      </button>
      {open && <div style={{ borderTop: '1px dashed rgba(255,255,255,0.04)' }}>{children}</div>}
    </div>
  );
}

function MetricRow({ label, sublabel, value, color }: { label: string; sublabel: string; value: number; color: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.50)' }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: color + 'bb' }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.max(2, pct)}%`, background: `linear-gradient(90deg, ${color}55, ${color}aa)`, transition: 'width 0.7s' }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.15)', marginTop: 2 }}>{sublabel}</div>
    </div>
  );
}

function ParamSlider({ label, hint, value, min, max, step, display, color, onChange }: {
  label: string; hint: string; value: number; min: number; max: number; step: number;
  display: (v: number) => string; color: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: color + 'aa', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.22)' }}>{display(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', height: 2, accentColor: color, cursor: 'pointer' }} />
      {hint && <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.12)', marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function Toggle({ label, on, onToggle, color }: { label: string; on: boolean; onToggle: () => void; color: string }) {
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'none', border: 'none', cursor: 'pointer',
      width: '100%', padding: 0, transition: 'all 0.15s',
    }}>
      <span style={{
        fontFamily: MONO, fontSize: 10,
        color: on ? color : 'rgba(255,255,255,0.15)',
        transition: 'color 0.2s',
      }}>
        {on ? '◉' : '○'}
      </span>
      <span style={{
        fontFamily: MONO, fontSize: 9,
        color: on ? color + 'cc' : 'rgba(255,255,255,0.22)',
        letterSpacing: '0.04em', textTransform: 'uppercase' as const,
        transition: 'color 0.2s',
      }}>
        {label}
      </span>
    </button>
  );
}

function ProcessBar({ label, value, color, desc }: { label: string; value: number; color: string; desc: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: color + 'aa' }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.max(2, pct)}%`, background: `linear-gradient(90deg, ${color}44, ${color}99)`, transition: 'width 0.7s' }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.12)', marginTop: 2 }}>{desc}</div>
    </div>
  );
}

function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── PAINEL JUNG ─────────────────────────────────────────────────────────────
const ProcessoJungPanel: React.FC<{ integration: number; tension: number; fragment: number; phase: PsychePhase }> = ({ integration, tension, fragment, phase }) => {
  const [open, setOpen] = useState(true);
  const compensacao   = Math.min(1, tension * (1 - integration) * 1.4);
  const numinosidade  = Math.min(1, integration * (1 - tension) * (1 - fragment) * 1.6);
  const complexo      = Math.min(1, tension * fragment * 1.8);
  const progressao    = Math.max(-1, Math.min(1, integration - fragment - tension * 0.5));
  const enantiodromia = Math.min(1, tension > 0.65 ? (tension - 0.65) * 2.5 : 0);
  const progrColor    = progressao > 0.1 ? '#86efac' : progressao < -0.1 ? '#f87171' : '#94a3b8';
  const progrLabel    = progressao > 0.3 ? 'Progressão ativa' : progressao < -0.2 ? 'Regressão ativa' : 'Neutro';

  return (
    <Section title="Processo Psíquico" open={open} onToggle={() => setOpen(v => !v)}>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ProcessBar label="Compensação"    value={compensacao}  color="#fb923c" desc="inconsciente compensando o consciente" />
        <ProcessBar label="Numinosidade"   value={numinosidade} color="#f5c842" desc="qualidade sagrada — Self ativo" />
        <ProcessBar label="Complexo Ativo" value={complexo}     color="#c084fc" desc="dissociação parcial em curso" />
        {enantiodromia > 0.05 && <ProcessBar label="Enantiodromia" value={enantiodromia} color="#f43f5e" desc="reversão iminente" />}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, color: progrColor + 'aa' }}>{progressao >= 0 ? 'Progressão' : 'Regressão'}</span>
            <span style={{ fontFamily: MONO, fontSize: 7, color: progrColor + '77' }}>{progrLabel}</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.12)' }} />
            <div style={{
              position: 'absolute', top: 0, height: '100%', transition: 'all 0.7s',
              ...(progressao >= 0
                ? { left: '50%', width: `${Math.abs(progressao) * 50}%`, background: `${progrColor}88` }
                : { right: '50%', width: `${Math.abs(progressao) * 50}%`, background: `${progrColor}88` }),
            }} />
          </div>
        </div>
        <div style={{ paddingTop: 6, borderTop: '1px dashed rgba(255,255,255,0.04)' }}>
          <p style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.20)', fontStyle: 'italic', lineHeight: 1.6 }}>
            {interpretJung(compensacao, numinosidade, complexo, progressao, phase)}
          </p>
        </div>
      </div>
    </Section>
  );
};

function interpretJung(comp: number, numen: number, cplx: number, prog: number, phase: PsychePhase): string {
  if (numen > 0.55)  return 'Self ativo — individuação emergente. Raro e precioso.';
  if (cplx  > 0.60)  return 'Complexo autônomo dominante. Ego perdeu o centro.';
  if (comp  > 0.70)  return 'Compensação intensa. O oposto do estado consciente pressiona.';
  if (prog  > 0.50)  return 'Libido progressiva — energia fluindo para formas superiores.';
  if (prog  < -0.40) return 'Regressão ativa — libido voltando ao modo primitivo.';
  if (phase === 'FLOW')  return 'Função Transcendente ativa — síntese consciente/inconsciente.';
  if (phase === 'PANIC') return 'Enantiodromia em curso — ruptura antes da renovação.';
  return 'Processo em andamento — padrões emergentes aguardando leitura.';
}

// ── PAINEL FREUD ────────────────────────────────────────────────────────────
const FreudPanel: React.FC<{ metrics?: FreudMetrics; phase: PsychePhase }> = ({ metrics, phase }) => {
  const [open, setOpen] = useState(true);
  if (!metrics) return null;

  const total = metrics.idPower + metrics.egoStrength + metrics.superegoForce + 0.001;
  const idFrac  = metrics.idPower       / total;
  const egoFrac = metrics.egoStrength   / total;
  const sgFrac  = metrics.superegoForce / total;

  const interpretFreud = (): string => {
    if (metrics.eros > 0.65)      return 'Eros dominante — libido expansiva, tendência à ligação.';
    if (metrics.thanatos > 0.55)  return 'Thanatos emergente — compulsão de repetição ativa.';
    if (metrics.repressao > 0.60) return 'Alta repressão — material inconsciente sob pressão.';
    if (metrics.sublimacao > 0.55) return 'Sublimação ativa — energia pulsional transformada.';
    if (phase === 'PANIC') return 'Retorno do reprimido — defesas rompidas pelo acúmulo.';
    if (phase === 'FLOW')  return 'Princípio da realidade em equilíbrio com o prazer.';
    return 'Economia libidinal em negociação — Id, Ego e Superego em tensão.';
  };

  return (
    <Section title="△ Aparelho Psíquico" open={open} onToggle={() => setOpen(v => !v)} accent="#f4a46080">
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <div style={{ ...labelStyle, color: '#f4a46040', marginBottom: 5 }}>Distribuição topográfica</div>
          <div style={{ display: 'flex', height: 4, gap: 1, overflow: 'hidden' }}>
            <div style={{ width: `${idFrac*100}%`, background: 'rgba(239,68,68,0.65)', transition: 'width 0.7s' }} />
            <div style={{ width: `${egoFrac*100}%`, background: 'rgba(59,130,246,0.65)', transition: 'width 0.7s' }} />
            <div style={{ width: `${sgFrac*100}%`, background: 'rgba(156,163,175,0.55)', transition: 'width 0.7s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
            <span style={{ fontFamily: MONO, fontSize: 7, color: '#ef444477' }}>Id {Math.round(idFrac*100)}%</span>
            <span style={{ fontFamily: MONO, fontSize: 7, color: '#3b82f677' }}>Ego {Math.round(egoFrac*100)}%</span>
            <span style={{ fontFamily: MONO, fontSize: 7, color: '#9ca3af77' }}>SG {Math.round(sgFrac*100)}%</span>
          </div>
        </div>
        <ProcessBar label="Eros"       value={metrics.eros}       color="#f472b6" desc="pulsão de vida" />
        <ProcessBar label="Thanatos"   value={metrics.thanatos}   color="#64748b" desc="pulsão de morte" />
        <ProcessBar label="Repressão"  value={metrics.repressao}  color="#f4a460" desc="material bloqueado" />
        <ProcessBar label="Sublimação" value={metrics.sublimacao} color="#86efac" desc="energia transformada" />
        <div style={{ paddingTop: 6, borderTop: '1px dashed rgba(255,255,255,0.04)' }}>
          <p style={{ fontFamily: MONO, fontSize: 7, color: '#f4a46060', fontStyle: 'italic', lineHeight: 1.6 }}>
            {interpretFreud()}
          </p>
        </div>
      </div>
    </Section>
  );
};

// ── PAINEL LACAN ────────────────────────────────────────────────────────────
const LacanPanel: React.FC<{ metrics?: LacanMetrics; phase: PsychePhase; integration: number }> = ({ metrics, phase }) => {
  const [open, setOpen] = useState(true);
  if (!metrics) return null;

  const rsiTotal = metrics.real + metrics.simbolico + metrics.imaginario + 0.001;
  const realFrac = metrics.real / rsiTotal;
  const simbFrac = metrics.simbolico / rsiTotal;
  const imagFrac = metrics.imaginario / rsiTotal;

  const interpretLacan = (): string => {
    if (metrics.real > 0.45)       return 'Irrupção do Real — o inassimilável invade o campo.';
    if (metrics.gozo > 0.65)       return 'Gozo intenso — além do princípio do prazer.';
    if (metrics.falta > 0.75)      return 'Falta estrutural dominante — desejo como motor.';
    if (metrics.sujeito > 0.60)    return 'Sujeito dividido em crise — falha na cadeia significante.';
    if (metrics.simbolico > 0.55)  return 'Ordem Simbólica forte — Lei do Pai operativa.';
    if (metrics.imaginario > 0.55) return 'Registro Imaginário dominante — identificação especular.';
    if (phase === 'FLOW')          return 'Circulação borromiana equilibrada — RSI em tensão criativa.';
    if (phase === 'PANIC')         return 'Nó borromiano solto — passagem ao ato iminente.';
    return 'Registros RSI em reorganização — sujeito em travessia.';
  };

  return (
    <Section title="◻ Topologia RSI" open={open} onToggle={() => setOpen(v => !v)} accent="#e0a0ff80">
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <div style={{ ...labelStyle, color: '#e0a0ff40', marginBottom: 5 }}>Proporção dos registros</div>
          <div style={{ display: 'flex', height: 4, gap: 1, overflow: 'hidden' }}>
            <div style={{ width: `${realFrac*100}%`, background: 'rgba(220,38,38,0.70)', transition: 'width 0.7s' }} />
            <div style={{ width: `${simbFrac*100}%`, background: 'rgba(59,130,246,0.70)', transition: 'width 0.7s' }} />
            <div style={{ width: `${imagFrac*100}%`, background: 'rgba(245,200,66,0.65)', transition: 'width 0.7s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
            <span style={{ fontFamily: MONO, fontSize: 7, color: '#dc262677' }}>R {Math.round(realFrac*100)}%</span>
            <span style={{ fontFamily: MONO, fontSize: 7, color: '#3b82f677' }}>S {Math.round(simbFrac*100)}%</span>
            <span style={{ fontFamily: MONO, fontSize: 7, color: '#f5c84277' }}>I {Math.round(imagFrac*100)}%</span>
          </div>
        </div>
        <ProcessBar label="Real"       value={metrics.real}       color="#dc2626" desc="inassimilável — trauma" />
        <ProcessBar label="Simbólico"  value={metrics.simbolico}  color="#3b82f6" desc="lei, linguagem, Outro" />
        <ProcessBar label="Imaginário" value={metrics.imaginario} color="#f5c842" desc="espelho, Ego, imagem" />
        <div style={{ paddingTop: 6, borderTop: '1px dashed rgba(255,255,255,0.04)' }}>
          <div style={{ ...labelStyle, color: '#e0a0ff40', marginBottom: 5 }}>Conceitos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ProcessBar label="Gozo (J)"  value={metrics.gozo}    color="#f43f5e" desc="jouissance — além do prazer" />
            <ProcessBar label="Falta (∅)" value={metrics.falta}   color="#e0a0ff" desc="manque — buraco do desejo" />
            <ProcessBar label="Sujeito $" value={metrics.sujeito} color="#a78bfa" desc="divisão — efeito do significante" />
          </div>
        </div>
        {/* RSI mini diagram */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '8px 0' }}>
          {[
            { label: 'R', color: '#dc2626', v: metrics.real },
            { label: 'S', color: '#3b82f6', v: metrics.simbolico },
            { label: 'I', color: '#f5c842', v: metrics.imaginario },
          ].map(({ label, color, v }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: 26 + v * 14, height: 26 + v * 14,
                border: `1px dashed ${color}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.7s',
              }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color }}>{label}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ paddingTop: 6, borderTop: '1px dashed rgba(255,255,255,0.04)' }}>
          <p style={{ fontFamily: MONO, fontSize: 7, color: '#e0a0ff55', fontStyle: 'italic', lineHeight: 1.6 }}>
            {interpretLacan()}
          </p>
        </div>
      </div>
    </Section>
  );
};

// ── MAPA PSÍQUICO ───────────────────────────────────────────────────────────
const MapaPanel: React.FC<{
  title: string;
  camadas: { sigil: string; name: string; color: string; desc: string }[];
  intro: string;
  legenda: [string, string, string][];
}> = ({ title, camadas, intro, legenda }) => {
  const [open, setOpen] = useState(false);
  return (
    <Section title={title} open={open} onToggle={() => setOpen(v => !v)}>
      <div style={{ padding: '8px 12px' }}>
        <p style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.18)', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5 }}>{intro}</p>
        {camadas.map(c => (
          <div key={c.name} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '3px 0' }}>
            <span style={{ fontSize: 12, flexShrink: 0, color: c.color }}>{c.sigil}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: c.color }}>{c.name}</span>
            <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.20)' }}>{c.desc}</span>
          </div>
        ))}
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px dashed rgba(255,255,255,0.04)' }}>
          <div style={{ ...labelStyle, marginBottom: 4 }}>Lentes de cor</div>
          {legenda.map(([color, label, desc]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <div style={{ width: 6, height: 6, background: color + 'bb', flexShrink: 0 }} />
              <span style={{ fontFamily: MONO, fontSize: 7, color: color + '99' }}>{label}</span>
              <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.15)' }}>— {desc}</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
};
