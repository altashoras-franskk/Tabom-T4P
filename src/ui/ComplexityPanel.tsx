// ─────────────────────────────────────────────────────────────────────────────
// Complexity Panel — Console Unificado de Sistemas Complexos
//
// Um único console com:
//   • Telemetria ao vivo (FPS, agentes, births/s, deaths/s, módulos)
//   • Métricas emergentes (estado sistêmico, read-only)
//   • Forças sistêmicas (read-only)
//   • Controles de Interação (acoplamento, força, auto-org, entropia, dialógica)
//   • Controles de Metabolismo (absorção, custo, reprodução, capacidade, mutação)
//   • Controles de Retroalimentação (força loops, atraso, memória, regulação)
//   • Controles de Campo/Ambiente (recursividade, hologramático)
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
import type { MicroConfig } from '../sim/micro/microState';
import type { FieldConfig } from '../sim/field/fieldState';
import type { LifeConfig } from '../sim/life/lifeConfig';

// ── Design tokens ─────────────────────────────────────────────────────────────
const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";
const TEAL = '#37b2da';
const DIM  = 'rgba(255,255,255,0.18)';
const DIM2 = 'rgba(255,255,255,0.32)';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({
  label, open, onToggle, accent,
}: { label: string; open: boolean; onToggle: () => void; accent?: string }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontFamily: DOTO, fontSize: 7.5, letterSpacing: '0.10em', textTransform: 'uppercase',
        color: accent ?? DIM,
        marginBottom: open ? 7 : 0, cursor: 'pointer', userSelect: 'none',
      }}
    >
      {open ? <ChevronDown size={7} /> : <ChevronRight size={7} />}
      {label}
    </div>
  );
}

function MetricBar({ label, value, color, hint }: {
  label: string; value: number; color: string; hint: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ marginBottom: 4 }} title={hint}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1.5 }}>
        <span style={{ fontFamily: MONO, fontSize: 7.5, color: DIM, letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 7.5, color: color + 'bb' }}>{pct}%</span>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.04)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${color}55,${color}aa)`, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function ForceBar({ label, value, color, hint }: {
  label: string; value: number; color: string; hint: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }} title={hint}>
      <span style={{ fontFamily: MONO, fontSize: 7.5, color: DIM2, width: 70, flexShrink: 0, letterSpacing: '0.03em' }}>{label}</span>
      <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.04)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${color}55,${color}aa)`, transition: 'width 0.25s' }} />
      </div>
      <span style={{ fontFamily: MONO, fontSize: 7, color: color + '99', width: 18, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
    </div>
  );
}

function CtrlSlider({
  icon, label, hint, value, min, max, step, display, onChange,
}: {
  icon?: string; label: string; hint: string; value: number;
  min: number; max: number; step: number;
  display?: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 7 }} title={hint}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, alignItems: 'center' }}>
        <span style={{ fontFamily: MONO, fontSize: 7.5, color: DIM2, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
          {icon && <span style={{ fontSize: 9 }}>{icon}</span>}
          {label}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: `${TEAL}99` }}>
          {display ?? value.toFixed(2)}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', height: 2, accentColor: TEAL, cursor: 'pointer' }}
      />
    </div>
  );
}

function TelRow({ label, value, unit, color }: {
  label: string; value: string | number; unit?: string; color?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3.5 }}>
      <span style={{ fontFamily: MONO, fontSize: 7.5, color: DIM }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 8, color: color ?? DIM2 }}>
        {typeof value === 'number' ? value.toFixed(1) : value}
        {unit && <span style={{ color: DIM, fontSize: 6.5, marginLeft: 2 }}>{unit}</span>}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
export interface ComplexityPanelProps {
  // Lens state (telemetry + metrics + forces)
  lensState: ComplexityLensState;
  fps: number;
  agentCount: number;
  vitalRates: VitalRates;
  moduleTelemetry: ModuleTelemetryMap;

  // Feedback config controls
  onConfigChange: (patch: Partial<FeedbackConfig>) => void;
  onResetMemory: () => void;

  // Sim parameter controls (Morin + Meadows mapped params)
  microConfig: MicroConfig;
  onMicroChange: (p: Partial<MicroConfig>) => void;

  fieldConfig: FieldConfig;
  onFieldChange: (p: Partial<FieldConfig>) => void;

  life: LifeConfig;
  onLifeChange: (p: Partial<LifeConfig>) => void;

  targetParticleCount: number;
  onTargetParticleCountChange: (v: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export function ComplexityPanel({
  lensState, fps, agentCount, vitalRates, moduleTelemetry,
  onConfigChange, onResetMemory,
  microConfig, onMicroChange,
  fieldConfig, onFieldChange,
  life, onLifeChange,
  targetParticleCount, onTargetParticleCountChange,
}: ComplexityPanelProps) {
  const [open,         setOpen]     = useState(false);
  const [secTel,       setSecTel]   = useState(true);
  const [secMetrics,   setSecMet]   = useState(false);
  const [secForces,    setSecFor]   = useState(false);
  const [secInteract,  setSecInt]   = useState(true);
  const [secMeta,      setSecMeta]  = useState(true);
  const [secFeedback,  setSecFb]    = useState(true);
  const [secField,     setSecFld]   = useState(false);

  const { feedback, metrics, forces, systemPhase, modulation,
          systemHealth, emergenceIndex } = lensState;
  const cfg = feedback.config;

  const phaseColor = SYSTEM_PHASE_COLORS[systemPhase];
  const phaseSigil = SYSTEM_PHASE_SIGILS[systemPhase];
  const phaseHint  = SYSTEM_PHASE_HINT[systemPhase];
  const top3       = topModules(moduleTelemetry, 3);

  const FPS_COLOR = fps >= 50 ? '#60ff90' : fps >= 30 ? '#ffc840' : '#ff6050';
  const bal = vitalRates.birthsPerSec - vitalRates.deathsPerSec;

  return (
    <div
      data-ui-overlay="true"
      style={{
        position: 'absolute',
        bottom: 72,           // clear above zoom indicator (which is bottom-4 ≈ 16px)
        left: 8,
        zIndex: 30,
        width: 240,
        maxHeight: 'calc(100vh - 160px)',
        background: 'rgba(6,8,12,0.96)',
        border: `1px dashed ${cfg.enabled ? `${TEAL}22` : 'rgba(255,255,255,0.06)'}`,
        transition: 'border-color 0.3s',
        display: 'flex',
        flexDirection: 'column',
      }}
    >

      {/* ── Header (fixed, always visible) ──────────────────────────────── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 10px', cursor: 'pointer', flexShrink: 0,
          background: cfg.enabled ? `${TEAL}04` : 'transparent',
          borderBottom: open ? '1px dashed rgba(255,255,255,0.05)' : 'none',
        }}
      >
        <span style={{ fontSize: 10, color: cfg.enabled ? TEAL : DIM }}>⬡</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: DOTO, fontSize: 9,
            color: cfg.enabled ? `${TEAL}cc` : 'rgba(255,255,255,0.35)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Sistema Complexo
          </div>
          <div style={{ fontFamily: MONO, fontSize: 6.5, color: 'rgba(255,255,255,0.16)', letterSpacing: '0.04em' }}>
            Retroação · Emergência · Autopoiese
          </div>
        </div>

        {/* Phase pill */}
        {cfg.enabled && (
          <div title={phaseHint} style={{
            fontFamily: MONO, fontSize: 7, padding: '1px 5px',
            background: `${phaseColor}0c`, color: phaseColor,
            border: `1px dashed ${phaseColor}30`, letterSpacing: '0.04em',
          }}>
            {phaseSigil} {systemPhase}
          </div>
        )}
        {open
          ? <ChevronDown size={10} style={{ color: DIM }} />
          : <ChevronRight size={10} style={{ color: DIM }} />}
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      {open && (
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* ── Enable toggle + health indicators ──────────────────────── */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
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
                {cfg.enabled ? '◉ ATIVO' : '○ INATIVO'}
              </button>
              {cfg.enabled && (
                <button
                  onClick={onResetMemory}
                  title="Limpa memória e reinicia fase"
                  style={{
                    fontFamily: MONO, fontSize: 8, padding: '3px 6px', cursor: 'pointer',
                    background: 'transparent', border: '1px dashed rgba(255,255,255,0.06)',
                    color: DIM, letterSpacing: '0.05em',
                  }}
                >
                  ↺
                </button>
              )}

              {/* Health + emergence pills */}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                <div title="Saúde sistêmica" style={{
                  fontFamily: MONO, fontSize: 7, padding: '2px 4px',
                  background: `rgba(${systemHealth > 0.6 ? '80,255,130' : systemHealth > 0.35 ? '255,200,80' : '255,80,80'},0.06)`,
                  border: `1px dashed rgba(${systemHealth > 0.6 ? '80,255,130' : systemHealth > 0.35 ? '255,200,80' : '255,80,80'},0.25)`,
                  color: systemHealth > 0.6 ? '#60ff90' : systemHealth > 0.35 ? '#ffc840' : '#ff6050',
                }}>
                  ♥ {Math.round(systemHealth * 100)}%
                </div>
                <div title="Índice de emergência" style={{
                  fontFamily: MONO, fontSize: 7, padding: '2px 4px',
                  background: `${TEAL}06`, border: `1px dashed ${TEAL}20`, color: `${TEAL}bb`,
                }}>
                  ◈ {Math.round(emergenceIndex * 100)}%
                </div>
              </div>
            </div>

            {/* Phase bar */}
            {cfg.enabled && (
              <div style={{ marginTop: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontFamily: MONO, fontSize: 6.5, color: DIM, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fase</span>
                  <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.04)' }}>
                    <div style={{ height: '100%', width: `${(feedback.phase % 1) * 100}%`, background: `linear-gradient(90deg,${phaseColor}55,${phaseColor}aa)`, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 7, color: phaseColor, padding: '1px 4px', background: `${phaseColor}0c`, border: `1px dashed ${phaseColor}22` }}>
                    {phaseSigil} {systemPhase}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────
              SECÇÃO: TELEMETRIA AO VIVO
          ────────────────────────────────────────────────────────────── */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <SectionHeader label="Telemetria" open={secTel} onToggle={() => setSecTel(v => !v)} />
            {secTel && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', marginBottom: 6 }}>
                  <TelRow label="FPS" value={Math.round(fps)} color={FPS_COLOR} />
                  <TelRow label="Agentes" value={agentCount} />
                  <TelRow label="Nascimentos" value={vitalRates.birthsPerSec.toFixed(1)} unit="/s" color="#60ff90" />
                  <TelRow label="Mortes" value={vitalRates.deathsPerSec.toFixed(1)} unit="/s" color="#ff7060" />
                  <TelRow label="Mutações" value={vitalRates.mutationsPerSec.toFixed(1)} unit="/s" color="#c080ff" />
                  <TelRow
                    label="Balanço"
                    value={bal >= 0 ? `+${bal.toFixed(1)}` : bal.toFixed(1)}
                    unit="/s"
                    color={bal >= 0 ? '#60ff90' : '#ff7060'}
                  />
                </div>
                <div>
                  <div style={{ fontFamily: DOTO, fontSize: 6.5, color: 'rgba(255,255,255,0.14)', marginBottom: 3, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                    Módulos (ms/frame)
                  </div>
                  {top3.map(({ id, ms }) => (
                    <div key={id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2.5 }}>
                      <span style={{ fontFamily: MONO, fontSize: 7, color: DIM }}>{id}</span>
                      <span style={{ fontFamily: MONO, fontSize: 7.5, color: ms > 5 ? '#ff7060' : ms > 2 ? '#ffc840' : `${TEAL}99` }}>
                        {ms.toFixed(2)} ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────
              SECÇÃO: ESTADO EMERGENTE (read-only)
          ────────────────────────────────────────────────────────────── */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <SectionHeader label="Estado Emergente" open={secMetrics} onToggle={() => setSecMet(v => !v)} />
            {secMetrics && (
              <div>
                <MetricBar label="Variedade" value={metrics.variedade} color="#c080ff" hint="Diversidade de tipos no espaço. Alta variedade = alto potencial de resiliência (Lei de Ashby)." />
                <MetricBar label="Coesão" value={metrics.coesao} color="#60d0ff" hint="Aglomeração espacial. Nicho emergindo — padrão de auto-organização local." />
                <MetricBar label="Atrito" value={metrics.atrito} color="#ff6050" hint="Pressão competitiva. Força de seleção ativa: loop de balanço." />
                <MetricBar label="Resiliência" value={metrics.resiliencia} color="#50ff90" hint="Fração de espécies ativas. Diversidade = capacidade de absorver perturbação." />
                <MetricBar label="Persistência" value={metrics.persistencia} color="#ffd060" hint="Homeostase. Alta persistência = sistema estagnado (derive para baixa performance)." />
                <MetricBar label="Metabolismo" value={metrics.metabolismo} color="#80c0ff" hint="Fluxo de energia cinética. Stocks e flows — vitalidade do sistema." />

                {/* Forces compact */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '6px 0' }} />
                <div style={{ marginBottom: 0 }}>
                  <div style={{ fontFamily: DOTO, fontSize: 6.5, color: DIM, marginBottom: 5, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Forças Ativas</div>
                  <ForceBar label="Perturbação" value={forces.perturbacao} color="#e0c860" hint="Desordem criativa. Injeta imprevisibilidade — motor de emergência." />
                  <ForceBar label="Auto-Org" value={forces.autoOrganizacao} color="#6090e0" hint="Consolida estruturas espontâneas. Padrão sem controle externo." />
                  <ForceBar label="Amplificação" value={forces.amplificacao} color="#50e080" hint="Loop de reforço R. Crescimento se auto-alimenta." />
                  <ForceBar label="Regulação" value={forces.regulacao} color="#e05050" hint="Loop de balanço B. Freia runaway." />
                  <ForceBar label="Coerência" value={forces.coerencia} color="#d4a060" hint="Saúde global. O todo é mais do que a soma das partes." />
                </div>

                {/* Modulation deltas */}
                {cfg.enabled && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 5 }}>
                    {([
                      { k: 'Δforce',  v: modulation.force },
                      { k: 'Δdrag',   v: modulation.drag },
                      { k: 'Δentrop', v: modulation.entropy },
                      { k: 'Δbeta',   v: modulation.beta },
                      { k: 'Δrmax',   v: modulation.rmax },
                      { k: 'Δmut',    v: modulation.mutationRate },
                    ] as { k: string; v: number }[]).map(({ k, v }) => {
                      const col = Math.abs(v) < 0.01 ? 'rgba(255,255,255,0.14)' : v >= 0 ? '#70e080' : '#e07070';
                      return (
                        <div key={k} style={{ fontFamily: MONO, fontSize: 6.5, padding: '1px 3px', background: `${col}0c`, border: `1px dashed ${col}22`, color: col }}>
                          {k} {v >= 0 && Math.abs(v) > 0.001 ? '+' : ''}{(v * 100).toFixed(1)}%
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────
              SECÇÃO: DINÂMICA DE INTERAÇÃO
              Parâmetros: acoplamento, força, auto-org, entropia, dialógica
          ────────────────────────────────────────────────────────────── */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <SectionHeader label="Interação" open={secInteract} onToggle={() => setSecInt(v => !v)} accent={`${TEAL}88`} />
            {secInteract && (
              <div>
                <CtrlSlider
                  icon="🔗" label="Acoplamento"
                  hint="Raio de interação entre agentes. Alto acoplamento = mais interconexões. (rmax)"
                  value={microConfig.rmax} min={0.04} max={0.50} step={0.01}
                  onChange={v => onMicroChange({ rmax: v })}
                />
                <CtrlSlider
                  icon="⚡" label="Força de Atração"
                  hint="Magnitude das forças de atração/repulsão. Amplitude dos loops de interação. (force)"
                  value={microConfig.force} min={0.05} max={1.0} step={0.01}
                  onChange={v => onMicroChange({ force: v })}
                />
                <CtrlSlider
                  icon="⭐" label="Limiar Auto-Org"
                  hint="Raio central de repulsão (beta). Controla quando agentes se organizam em estruturas vs. se dispersam."
                  value={microConfig.beta} min={0.05} max={0.95} step={0.01}
                  onChange={v => onMicroChange({ beta: v })}
                />
                <CtrlSlider
                  icon="🔥" label="Entropia"
                  hint="Ruído injetado por frame. Alta entropia = perturbação criativa. Baixa = sistema determinístico."
                  value={microConfig.entropy} min={0} max={0.05} step={0.001}
                  display={microConfig.entropy.toFixed(3)}
                  onChange={v => onMicroChange({ entropy: v })}
                />
                <CtrlSlider
                  icon="☯" label="Dialógica"
                  hint="Intensidade da dependência circular entre tipos. Cria tensão ordem/desordem — opostos que coexistem."
                  value={microConfig.circularDependency} min={0} max={1} step={0.01}
                  onChange={v => onMicroChange({ circularDependency: v })}
                />
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────
              SECÇÃO: METABOLISMO
              Parâmetros: absorção, custo, reprodução, capacidade, mutação
          ────────────────────────────────────────────────────────────── */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <SectionHeader label="Metabolismo" open={secMeta} onToggle={() => setSecMeta(v => !v)} accent={`${TEAL}88`} />
            {secMeta && (
              <div>
                <CtrlSlider
                  icon="💧" label="Taxa de Absorção"
                  hint="Velocidade de ganho de energia ao interagir com outros. Stocks e flows: taxa de entrada no estoque de energia."
                  value={life.energyFeedRate} min={0.005} max={0.15} step={0.005}
                  display={life.energyFeedRate.toFixed(3)}
                  onChange={v => onLifeChange({ energyFeedRate: v })}
                />
                <CtrlSlider
                  icon="⚗️" label="Custo Metabólico"
                  hint="Decaimento de energia por frame. Pressão de seleção: agentes de baixo custo sobrevivem mais. (energyDecay)"
                  value={life.energyDecay} min={0.0005} max={0.01} step={0.0005}
                  display={life.energyDecay.toFixed(4)}
                  onChange={v => onLifeChange({ energyDecay: v })}
                />
                <CtrlSlider
                  icon="🌱" label="Limiar de Reprodução"
                  hint="Energia necessária para se reproduzir. Alto limiar = seleção mais rígida. (reproductionThreshold)"
                  value={life.energyReproThreshold} min={0.5} max={5.0} step={0.1}
                  onChange={v => onLifeChange({ energyReproThreshold: v })}
                />
                <CtrlSlider
                  icon="👥" label="Capacidade de Suporte"
                  hint="Número máximo de agentes. Define o teto do estoque populacional. (targetParticleCount)"
                  value={targetParticleCount} min={100} max={3000} step={50}
                  display={`${targetParticleCount}`}
                  onChange={v => onTargetParticleCountChange(Math.round(v))}
                />
                <CtrlSlider
                  icon="🧬" label="Mutação"
                  hint="Dial de mutação [0..1]. Alto = tipos evoluem rapidamente, baixa estabilidade. (mutationDial)"
                  value={life.mutationDial} min={0} max={1} step={0.01}
                  onChange={v => onLifeChange({ mutationDial: v })}
                />
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────
              SECÇÃO: RETROALIMENTAÇÃO (LOOPS)
              Parâmetros: força, atraso, memória, regulação
          ────────────────────────────────────────────────────────────── */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <SectionHeader label="Retroalimentação" open={secFeedback} onToggle={() => setSecFb(v => !v)} accent={`${TEAL}88`} />
            {secFeedback && (
              <div>
                <CtrlSlider
                  icon="🔄" label="Força dos Loops"
                  hint="Intensidade dos loops de feedback. 0 = sistema aberto. 1 = retroação máxima nos parâmetros. (strength)"
                  value={cfg.strength} min={0} max={1} step={0.01}
                  onChange={v => onConfigChange({ strength: v })}
                />
                <CtrlSlider
                  icon="⏱" label="Atraso Sistêmico"
                  hint="Delay entre causa e efeito do loop de feedback. Atrasos longos → instabilidade e oscilações. (intervalFrames)"
                  value={cfg.intervalFrames} min={1} max={60} step={1}
                  display={`${cfg.intervalFrames} fr`}
                  onChange={v => onConfigChange({ intervalFrames: Math.round(v) })}
                />
                <CtrlSlider
                  icon="🧠" label="Memória do Sistema"
                  hint="Inércia do loop de feedback. Alta memória = sistema 'lembra' perturbações. Correlato de história acumulada. (smoothing)"
                  value={cfg.smoothing} min={0} max={0.99} step={0.01}
                  onChange={v => onConfigChange({ smoothing: v })}
                />
                <CtrlSlider
                  icon="🛡" label="Regulação Máxima"
                  hint="Teto da autorregulação. Limita quanto os loops de balanço podem comprimir os parâmetros. (chaosClamp)"
                  value={cfg.chaosClamp} min={0} max={1} step={0.01}
                  onChange={v => onConfigChange({ chaosClamp: v })}
                />
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────
              SECÇÃO: CAMPO / AMBIENTE
              Parâmetros: recursividade (influenceStrength), hologramático (depositStrength)
          ────────────────────────────────────────────────────────────── */}
          <div style={{ padding: '8px 10px' }}>
            <SectionHeader label="Campo / Ambiente" open={secField} onToggle={() => setSecFld(v => !v)} accent={`${TEAL}88`} />
            {secField && (
              <div>
                <CtrlSlider
                  icon="♻️" label="Recursividade"
                  hint="Força com que o campo alimenta de volta os agentes. Efeito se torna causa: agentes modificam o campo que os modifica. (influenceStrength)"
                  value={fieldConfig.influenceStrength} min={0} max={2} step={0.05}
                  onChange={v => onFieldChange({ influenceStrength: v })}
                />
                <CtrlSlider
                  icon="🔮" label="Hologramático"
                  hint="Intensidade do depósito local no campo global. Cada parte escreve o todo. O trace local emerge como padrão global. (depositStrength)"
                  value={fieldConfig.depositStrength} min={0} max={3} step={0.05}
                  onChange={v => onFieldChange({ depositStrength: v })}
                />
                <CtrlSlider
                  icon="🌊" label="Difusão do Campo"
                  hint="Velocidade de difusão do campo espacial. Alta difusão = efeitos locais se propagam rapidamente. (diffusion)"
                  value={fieldConfig.diffusion} min={0.01} max={0.5} step={0.01}
                  onChange={v => onFieldChange({ diffusion: v })}
                />
                <CtrlSlider
                  icon="📉" label="Decaimento do Campo"
                  hint="Velocidade de decaimento das memórias de campo. Baixo decay = campo tem memória longa. (decay)"
                  value={fieldConfig.decay} min={0.001} max={0.1} step={0.001}
                  display={fieldConfig.decay.toFixed(3)}
                  onChange={v => onFieldChange({ decay: v })}
                />
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
