// ─────────────────────────────────────────────────────────────────────────────
// Complexity Panel — Lente Morin + Meadows para o Complexity Life Lab
//
// Substitui OrChozerPanel com framing científico:
//   • Métricas emergentes com nomes da teoria da complexidade
//   • Forças sistêmicas (loops R e B) ao invés de Sefirot
//   • Fase sistêmica (Expansão/Estruturação/Seleção/Reorganização)
//   • Telemetria ao vivo: FPS, N agentes, births/s, deaths/s
//   • Timers por módulo (top 3 mais custosos)
//   • Controles com tooltips explicativos (Meadows / Morin)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  ComplexityLensState,
  ComplexityMetrics,
  ComplexityForces,
  SystemPhase,
  SYSTEM_PHASE_COLORS,
  SYSTEM_PHASE_SIGILS,
  SYSTEM_PHASE_HINT,
  VitalRates,
  ModuleTelemetryMap,
  topModules,
} from '../sim/complexity/complexityLens';
import type { FeedbackConfig } from '../sim/micro/feedbackEngine';

// ── Design tokens ────────────────────────────────────────────────────────────
const DOTO  = "'Doto', monospace";
const MONO  = "'IBM Plex Mono', monospace";
const TEAL  = '#37b2da';    // Complexity accent (replaces Or Chozer gold)
const DIM   = 'rgba(255,255,255,0.18)';
const DIM2  = 'rgba(255,255,255,0.30)';

// ── Metric definitions (Meadows + Morin) ─────────────────────────────────────
interface MetricDef {
  key: keyof ComplexityMetrics;
  label: string;
  color: string;
  hint: string;
}

const METRIC_DEFS: MetricDef[] = [
  {
    key: 'variedade',
    label: 'Variedade',
    color: '#c080ff',
    hint: 'Ashby: diversidade de tipos por área. Alta variedade = alto potencial de resiliência.',
  },
  {
    key: 'coesao',
    label: 'Coesão',
    color: '#60d0ff',
    hint: 'Auto-organização espacial. Alta coesão = nicho emergindo (Morin: ordem local).',
  },
  {
    key: 'atrito',
    label: 'Atrito',
    color: '#ff6050',
    hint: 'Pressão competitiva. Alto atrito = força de seleção ativa (B loop).',
  },
  {
    key: 'resiliencia',
    label: 'Resiliência',
    color: '#50ff90',
    hint: 'Meadows: fração de espécies ativas. Diversidade = capacidade de absorver perturbação.',
  },
  {
    key: 'persistencia',
    label: 'Persistência',
    color: '#ffd060',
    hint: 'Homeostase. Alta persistência = sistema estagnado (Meadows: drift to low performance).',
  },
  {
    key: 'metabolismo',
    label: 'Metabolismo',
    color: '#80c0ff',
    hint: 'Fluxo de energia cinética. Metabolismo = vitalidade do sistema (stocks e flows).',
  },
];

// ── Force definitions ─────────────────────────────────────────────────────────
interface ForceDef {
  key: keyof ComplexityForces;
  label: string;
  sublabel: string;
  color: string;
  hint: string;
}

const FORCE_DEFS: ForceDef[] = [
  {
    key: 'perturbacao',
    label: 'Perturbação',
    sublabel: 'Morin: desordem criativa',
    color: '#e0c860',
    hint: 'Injeta imprevisibilidade. Morin: perturbação é motor de emergência — sem caos não há novidade.',
  },
  {
    key: 'autoOrganizacao',
    label: 'Auto-Organização',
    sublabel: 'Morin: padrão emergente',
    color: '#6090e0',
    hint: 'Consolida estruturas espontâneas. Meadows: self-organization = criar estrutura sem controle externo.',
  },
  {
    key: 'amplificacao',
    label: 'Amplificação',
    sublabel: 'Meadows: loop R',
    color: '#50e080',
    hint: 'Loop de reforço ativo. Crescimento se auto-alimenta. Cuidado: pode ser runaway.',
  },
  {
    key: 'regulacao',
    label: 'Regulação',
    sublabel: 'Meadows: loop B',
    color: '#e05050',
    hint: 'Loop de balanço. Freia crescimento. Meadows: meta do sistema (B loop tende a seu goal).',
  },
  {
    key: 'coerencia',
    label: 'Coerência',
    sublabel: 'Resiliência sistêmica',
    color: '#d4a060',
    hint: 'Saúde global do sistema. Morin: o todo é mais do que a soma das partes. Alta coerência = emergência real.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function MetricBar({
  label, value, color, hint,
}: { label: string; value: number; color: string; hint: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ marginBottom: 5 }} title={hint}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: color + 'bb' }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${color}55,${color}aa)`, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function ForceBar({
  label, sublabel, value, color, hint,
}: { label: string; sublabel: string; value: number; color: string; hint: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }} title={hint}>
      <div style={{ width: 72, flexShrink: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 8, color: DIM2, letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.16)', letterSpacing: '0.03em' }}>{sublabel}</div>
      </div>
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${color}55,${color}aa)`, transition: 'width 0.25s' }} />
      </div>
      <span style={{ fontFamily: MONO, fontSize: 7, color: color + '99', width: 22, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
    </div>
  );
}

function SliderRow({
  label, hint, value, min, max, step, onChange, display,
}: {
  label: string; hint: string; value: number; min: number; max: number;
  step: number; onChange: (v: number) => void; display?: string;
}) {
  return (
    <div style={{ marginBottom: 7 }} title={hint}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: DIM2 }}>{display ?? value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', height: 2, accentColor: TEAL, cursor: 'pointer' }}
      />
    </div>
  );
}

function SectionHeader({
  label, open, onToggle,
}: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontFamily: DOTO, fontSize: 8, letterSpacing: '0.10em', textTransform: 'uppercase',
        color: DIM, marginBottom: open ? 8 : 0, cursor: 'pointer', userSelect: 'none',
      }}
    >
      {open ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
      {label}
    </div>
  );
}

// ── Telemetry bar ─────────────────────────────────────────────────────────────
function TelemetryRow({ label, value, unit, color }: {
  label: string; value: string | number; unit?: string; color?: string;
}) {
  const col = color ?? DIM2;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontFamily: MONO, fontSize: 7.5, color: DIM, letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 8, color: col }}>
        {typeof value === 'number' ? value.toFixed(1) : value}
        {unit && <span style={{ color: DIM, fontSize: 7, marginLeft: 2 }}>{unit}</span>}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
export interface ComplexityPanelProps {
  lensState: ComplexityLensState;
  fps: number;
  agentCount: number;
  vitalRates: VitalRates;
  moduleTelemetry: ModuleTelemetryMap;
  onConfigChange: (patch: Partial<FeedbackConfig>) => void;
  onResetMemory: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export function ComplexityPanel({
  lensState,
  fps,
  agentCount,
  vitalRates,
  moduleTelemetry,
  onConfigChange,
  onResetMemory,
}: ComplexityPanelProps) {
  const [open, setOpen]           = useState(false);
  const [metricsOpen, setMetrics] = useState(true);
  const [forcesOpen,  setForces]  = useState(true);
  const [telOpen,     setTel]     = useState(true);
  const [cfgOpen,     setCfg]     = useState(false);

  const { feedback, metrics, forces, systemPhase, modulation,
          systemHealth, emergenceIndex } = lensState;
  const cfg = feedback.config;

  const phaseColor = SYSTEM_PHASE_COLORS[systemPhase];
  const phaseSigil = SYSTEM_PHASE_SIGILS[systemPhase];
  const phaseHint  = SYSTEM_PHASE_HINT[systemPhase];

  const top3 = topModules(moduleTelemetry, 3);

  return (
    <div style={{
      position: 'absolute', bottom: 48, left: 8, zIndex: 30, width: 232,
      background: 'rgba(0,0,0,0.94)',
      border: `1px dashed ${cfg.enabled ? `${TEAL}22` : 'rgba(255,255,255,0.06)'}`,
      overflow: 'hidden',
      transition: 'border-color 0.3s',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 10px', cursor: 'pointer',
          background: cfg.enabled ? `${TEAL}04` : 'transparent',
          borderBottom: open ? '1px dashed rgba(255,255,255,0.04)' : 'none',
          transition: 'background 0.2s',
        }}
      >
        <span style={{ fontSize: 10, color: cfg.enabled ? TEAL : DIM }}>⬡</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: DOTO, fontSize: 9,
            color: cfg.enabled ? `${TEAL}cc` : 'rgba(255,255,255,0.35)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Complexity Lens
          </div>
          <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.04em' }}>
            Morin · Meadows · Sistemas Complexos
          </div>
        </div>

        {cfg.enabled && (
          <div style={{
            fontFamily: MONO, fontSize: 7, padding: '1px 6px',
            background: `${phaseColor}0c`, color: phaseColor,
            border: `1px dashed ${phaseColor}30`,
            letterSpacing: '0.04em',
          }} title={phaseHint}>
            {phaseSigil} {systemPhase}
          </div>
        )}
        {open
          ? <ChevronDown size={10} style={{ color: DIM }} />
          : <ChevronRight size={10} style={{ color: DIM }} />}
      </div>

      {open && (
        <div>

          {/* ── Enable + Reset ─────────────────────────────────────────── */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => onConfigChange({ enabled: !cfg.enabled })}
                style={{
                  fontFamily: MONO, fontSize: 8, padding: '3px 8px', cursor: 'pointer',
                  background: cfg.enabled ? `${TEAL}0c` : 'transparent',
                  border: `1px dashed ${cfg.enabled ? `${TEAL}40` : 'rgba(255,255,255,0.08)'}`,
                  color: cfg.enabled ? `${TEAL}cc` : 'rgba(255,255,255,0.30)',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}
              >
                {cfg.enabled ? '◉ ON' : '○ OFF'}
              </button>
              {cfg.enabled && (
                <button
                  onClick={onResetMemory}
                  style={{
                    fontFamily: MONO, fontSize: 8, padding: '3px 6px', cursor: 'pointer',
                    background: 'transparent', border: '1px dashed rgba(255,255,255,0.06)',
                    color: DIM, letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}
                  title="Limpa histórico de métricas e reinicia fase"
                >
                  ↺ Reset
                </button>
              )}

              {/* System health pill */}
              <div style={{
                marginLeft: 'auto', fontFamily: MONO, fontSize: 7, padding: '2px 5px',
                background: `rgba(${systemHealth > 0.6 ? '80,255,130' : systemHealth > 0.35 ? '255,200,80' : '255,80,80'},0.06)`,
                border: `1px dashed rgba(${systemHealth > 0.6 ? '80,255,130' : systemHealth > 0.35 ? '255,200,80' : '255,80,80'},0.25)`,
                color: systemHealth > 0.6 ? '#60ff90' : systemHealth > 0.35 ? '#ffc840' : '#ff6050',
              }}
                title="Saúde sistêmica: diversidade × metabolismo − atrito − estagnação"
              >
                {Math.round(systemHealth * 100)}%
              </div>
            </div>

            {/* Emergence index */}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: MONO, fontSize: 7.5, color: DIM, letterSpacing: '0.06em' }}>
                  Emergência
                </span>
                <span style={{ fontFamily: MONO, fontSize: 8, color: `${TEAL}bb` }}>
                  {Math.round(emergenceIndex * 100)}%
                </span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.04)' }}>
                <div style={{
                  height: '100%', width: `${emergenceIndex * 100}%`,
                  background: `linear-gradient(90deg,${TEAL}44,${TEAL}99)`,
                  transition: 'width 0.4s',
                }} />
              </div>
              <div style={{ fontFamily: MONO, fontSize: 6.5, color: 'rgba(255,255,255,0.14)', marginTop: 2 }}>
                Morin: variedade × coesão × dinamismo
              </div>
            </div>
          </div>

          {/* ── Live Telemetry (PATCH 01) ───────────────────────────────── */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <SectionHeader label="Telemetria ao Vivo" open={telOpen} onToggle={() => setTel(v => !v)} />
            {telOpen && (
              <div>
                {/* Vitals grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: '3px 8px', marginBottom: 6,
                }}>
                  <TelemetryRow
                    label="FPS"
                    value={Math.round(fps)}
                    color={fps >= 50 ? '#60ff90' : fps >= 30 ? '#ffc840' : '#ff6050'}
                  />
                  <TelemetryRow label="Agentes" value={agentCount} />
                  <TelemetryRow
                    label="Nascimentos"
                    value={vitalRates.birthsPerSec.toFixed(1)}
                    unit="/s"
                    color="#60ff90"
                  />
                  <TelemetryRow
                    label="Mortes"
                    value={vitalRates.deathsPerSec.toFixed(1)}
                    unit="/s"
                    color="#ff7060"
                  />
                  <TelemetryRow
                    label="Mutações"
                    value={vitalRates.mutationsPerSec.toFixed(1)}
                    unit="/s"
                    color="#c080ff"
                  />
                  <TelemetryRow
                    label="Balanço"
                    value={vitalRates.birthsPerSec - vitalRates.deathsPerSec >= 0
                      ? `+${(vitalRates.birthsPerSec - vitalRates.deathsPerSec).toFixed(1)}`
                      : (vitalRates.birthsPerSec - vitalRates.deathsPerSec).toFixed(1)}
                    unit="/s"
                    color={vitalRates.birthsPerSec >= vitalRates.deathsPerSec ? '#60ff90' : '#ff7060'}
                  />
                </div>

                {/* Phase bar */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Fase</span>
                    <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.04)' }}>
                      <div style={{
                        height: '100%',
                        width: `${(feedback.phase % 1) * 100}%`,
                        background: `linear-gradient(90deg,${phaseColor}55,${phaseColor}aa)`,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                    <span style={{
                      fontFamily: MONO, fontSize: 7.5, color: phaseColor,
                      padding: '1px 4px', background: `${phaseColor}0c`,
                      border: `1px dashed ${phaseColor}25`, letterSpacing: '0.04em',
                    }} title={phaseHint}>
                      {phaseSigil} {systemPhase}
                    </span>
                  </div>
                </div>

                {/* Module timers top-3 */}
                <div style={{ marginTop: 4 }}>
                  <div style={{
                    fontFamily: DOTO, fontSize: 7, letterSpacing: '0.10em',
                    color: 'rgba(255,255,255,0.16)', marginBottom: 4, textTransform: 'uppercase',
                  }}>
                    Top módulos (ms/frame)
                  </div>
                  {top3.map(({ id, ms }) => (
                    <div key={id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontFamily: MONO, fontSize: 7, color: DIM, letterSpacing: '0.04em' }}>{id}</span>
                      <span style={{
                        fontFamily: MONO, fontSize: 7.5,
                        color: ms > 5 ? '#ff7060' : ms > 2 ? '#ffc840' : `${TEAL}99`,
                      }}>
                        {ms.toFixed(2)} ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Emergent Metrics (Meadows / Ashby) ─────────────────────── */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <SectionHeader label="Métricas Emergentes" open={metricsOpen} onToggle={() => setMetrics(v => !v)} />
            {metricsOpen && METRIC_DEFS.map(d => (
              <MetricBar
                key={d.key}
                label={d.label}
                value={metrics[d.key]}
                color={d.color}
                hint={d.hint}
              />
            ))}
          </div>

          {/* ── System Forces (Morin: R loops, B loops) ─────────────────── */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <SectionHeader label="Forças Sistêmicas" open={forcesOpen} onToggle={() => setForces(v => !v)} />
            {forcesOpen && (
              <div>
                {FORCE_DEFS.map(d => (
                  <ForceBar
                    key={d.key}
                    label={d.label}
                    sublabel={d.sublabel}
                    value={forces[d.key]}
                    color={d.color}
                    hint={d.hint}
                  />
                ))}
                {cfg.enabled && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                    {([
                      { k: 'Δforce', v: modulation.force, hint: 'Força de atração/repulsão (R loop amplitude)' },
                      { k: 'Δdrag',  v: modulation.drag,  hint: 'Amortecimento (B loop fricção)' },
                      { k: 'Δentrop', v: modulation.entropy, hint: 'Ruído/perturbação injetada' },
                      { k: 'Δbeta',  v: modulation.beta,  hint: 'Raio de repulsão central' },
                      { k: 'Δrmax',  v: modulation.rmax,  hint: 'Raio de interação (alcance)' },
                      { k: 'Δmut',   v: modulation.mutationRate, hint: 'Taxa de mutação ativa' },
                    ] as { k: string; v: number; hint: string }[]).map(({ k, v, hint }) => {
                      const mag = Math.abs(v);
                      const col = mag < 0.01
                        ? 'rgba(255,255,255,0.15)'
                        : v >= 0 ? '#70e080' : '#e07070';
                      return (
                        <div key={k} title={hint} style={{
                          fontFamily: MONO, fontSize: 7, padding: '1px 4px',
                          background: `${col}0c`, border: `1px dashed ${col}22`, color: col,
                        }}>
                          {k} {v >= 0 && mag > 0.001 ? '+' : ''}{(v * 100).toFixed(1)}%
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Config (Meadows leverage points) ────────────────────────── */}
          <div style={{ padding: '8px 10px' }}>
            <SectionHeader label="Parâmetros de Controle" open={cfgOpen} onToggle={() => setCfg(v => !v)} />
            {cfgOpen && (
              <div>
                <SliderRow
                  label="Força das Retroações"
                  hint="Meadows: intensidade dos loops de feedback. 0 = sistema aberto, 1 = retroação máxima."
                  value={cfg.strength} min={0} max={1} step={0.01}
                  onChange={v => onConfigChange({ strength: v })}
                />
                <SliderRow
                  label="Delay do Ciclo"
                  hint="Meadows: atraso sistêmico. Delays longos → instabilidade, oscilações (Thinking in Systems, cap. 3)."
                  value={cfg.intervalFrames} min={1} max={60} step={1}
                  display={`${cfg.intervalFrames} fr`}
                  onChange={v => onConfigChange({ intervalFrames: Math.round(v) })}
                />
                <SliderRow
                  label="Inércia / Memória"
                  hint="Morin: memória do sistema. Alta inércia = sistema 'lembra' perturbações. Correlato de história."
                  value={cfg.smoothing} min={0} max={0.99} step={0.01}
                  onChange={v => onConfigChange({ smoothing: v })}
                />
                <SliderRow
                  label="Amortecimento Máx."
                  hint="Meadows: limite da autorregulação. Limita quanto os B loops podem comprimir os parâmetros."
                  value={cfg.chaosClamp} min={0} max={1} step={0.01}
                  onChange={v => onConfigChange({ chaosClamp: v })}
                />

                {!cfg.enabled && (
                  <div style={{
                    fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.15)',
                    textAlign: 'center', padding: '4px 0', letterSpacing: '0.05em',
                  }}>
                    Ative a Complexity Lens para aplicar retroações
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
