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
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n/context';
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
  MODULE_IDS,
  topModules,
  getModuleStats,
  getAllModuleStats,
  type MorinIndices,
} from '../sim/complexity/complexityLens';
import type { FeedbackConfig } from '../sim/micro/feedbackEngine';
import type { MicroConfig } from '../sim/micro/microState';
import type { FieldConfig } from '../sim/field/fieldState';
import type { LifeConfig } from '../sim/life/lifeConfig';
import type { ReconfigConfig } from '../sim/reconfig/reconfigState';

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
        fontFamily: DOTO, fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: accent ?? DIM,
        marginBottom: open ? 7 : 0, cursor: 'pointer', userSelect: 'none',
      }}
    >
      {open ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
      {label}
    </div>
  );
}

function MetricBar({ label, value, color, hint }: {
  label: string; value: number; color: string; hint: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ marginBottom: 3 }} title={hint}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: DIM, letterSpacing: '0.04em' }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: color + 'bb' }}>{pct}%</span>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }} title={hint}>
      <span style={{ fontFamily: MONO, fontSize: 8, color: DIM2, width: 72, flexShrink: 0, letterSpacing: '0.03em' }}>{label}</span>
      <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.04)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${color}55,${color}aa)`, transition: 'width 0.25s' }} />
      </div>
      <span style={{ fontFamily: MONO, fontSize: 8, color: color + '99', width: 20, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
    </div>
  );
}

function CtrlSlider({
  icon, label, hint, value, min, max, step, display, effectiveDisplay, effectiveValueTitle, onChange,
}: {
  icon?: string; label: string; hint: string; value: number;
  min: number; max: number; step: number;
  display?: string; /** Quando retroação ativa: mostra valor efetivo (base + Δ) */
  effectiveDisplay?: string;
  /** Tooltip for the "→ effective" span (parent passes t('cl_effectiveValue')) */
  effectiveValueTitle?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 7 }} title={hint}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: DIM2, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
          {icon && <span style={{ fontSize: 10 }}>{icon}</span>}
          {label}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: `${TEAL}99` }}>
          {display ?? value.toFixed(2)}
          {effectiveDisplay != null && (
            <span style={{ marginLeft: 4, fontSize: 8, color: 'rgba(255,255,255,0.4)' }} title={effectiveValueTitle ?? ''}>
              → {effectiveDisplay}
            </span>
          )}
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

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }} title={hint}>
      <span style={{ fontFamily: MONO, fontSize: 9, color: DIM2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 14, height: 14, accentColor: TEAL, cursor: 'pointer' }}
      />
    </div>
  );
}

function TelRow({ label, value, unit, color }: {
  label: string; value: string | number; unit?: string; color?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1.5 }}>
      <span style={{ fontFamily: MONO, fontSize: 8, color: DIM }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 8, color: color ?? DIM2 }}>
        {typeof value === 'number' ? value.toFixed(1) : value}
        {unit && <span style={{ color: DIM, fontSize: 8, marginLeft: 2 }}>{unit}</span>}
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

  reconfigConfig: ReconfigConfig;
  onReconfigChange: (p: Partial<ReconfigConfig>) => void;

  maintainPopulation: boolean;
  onMaintainPopulationChange: (v: boolean) => void;

  targetParticleCount: number;
  onTargetParticleCountChange: (v: number) => void;

  /** Modo padrão = presets estáveis (como Psyche/Sociogenesis). Modo avançado = Hebbian + reconfig + feedback. */
  advancedSimulationMode?: boolean;
  onAdvancedSimulationModeChange?: (v: boolean) => void;

  /** Budget mode: quando over budget, LOD sobe e max steps é reduzido (escalabilidade). */
  budgetState?: { lodLevel: number; recommendedMaxSteps: number };

  /** When true, panel is inside a DraggablePanel — no absolute positioning */
  embedded?: boolean;
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
  reconfigConfig, onReconfigChange,
  maintainPopulation, onMaintainPopulationChange,
  targetParticleCount, onTargetParticleCountChange,
  advancedSimulationMode = false,
  onAdvancedSimulationModeChange,
  budgetState,
  embedded = false,
}: ComplexityPanelProps) {
  const { t } = useI18n();
  const [open,         setOpen]     = useState(() => {
    try {
      const v = localStorage.getItem('complexityPanelOpen');
      return v === null ? true : v === '1';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try { localStorage.setItem('complexityPanelOpen', open ? '1' : '0'); } catch {}
  }, [open]);
  const [secTel,       setSecTel]   = useState(true);
  const [secMetrics,   setSecMet]   = useState(false);
  const [secForces,    setSecFor]   = useState(false);
  const [secInteract,  setSecInt]   = useState(true);
  const [secMeta,      setSecMeta]  = useState(true);
  const [secFeedback,  setSecFb]    = useState(true);
  const [secField,     setSecFld]   = useState(false);
  const [secMorin,     setSecMorin] = useState(true);
  const [secPerf,      setSecPerf]  = useState(false);

  // Guard: avoid crash if lensState is stale/undefined (e.g. during rapid updates)
  if (!lensState?.feedback?.config) {
    return (
      <div data-ui-overlay="true" style={{ padding: 8, fontFamily: MONO, fontSize: 9, color: DIM }}>
        Sistema Complexo — carregando…
      </div>
    );
  }

  const { feedback, metrics, forces, systemPhase, modulation,
          systemHealth, emergenceIndex, morin } = lensState;
  const cfg = feedback.config;

  const safePhase = systemPhase && SYSTEM_PHASE_COLORS[systemPhase as keyof typeof SYSTEM_PHASE_COLORS] ? systemPhase : 'Expansão';
  const phaseColor = SYSTEM_PHASE_COLORS[safePhase as keyof typeof SYSTEM_PHASE_COLORS];
  const phaseSigil = SYSTEM_PHASE_SIGILS[safePhase as keyof typeof SYSTEM_PHASE_SIGILS];
  const phaseHint  = SYSTEM_PHASE_HINT[safePhase as keyof typeof SYSTEM_PHASE_HINT];
  const telem      = moduleTelemetry ?? lensState?.moduleTelemetry ?? {};
  const top3       = topModules(telem, 3);

  const FPS_COLOR = fps >= 50 ? '#60ff90' : fps >= 30 ? '#ffc840' : '#ff6050';
  const bal = vitalRates.birthsPerSec - vitalRates.deathsPerSec;

  // Valores efetivos (base + retroação) quando feedback ativo — para alinhar telemetria aos sliders
  const mod = cfg.enabled ? modulation : null;
  const eff = mod
    ? {
        rmax: Math.max(0.04, Math.min(0.5, microConfig.rmax * (1 + mod.rmax))),
        force: Math.max(0.05, microConfig.force * (1 + mod.force)),
        drag: Math.max(0.05, Math.min(10, microConfig.drag * (1 + mod.drag))),
        beta: Math.max(0.05, Math.min(0.95, microConfig.beta * (1 + mod.beta))),
        entropy: Math.max(0, Math.min(0.05, microConfig.entropy * (1 + mod.entropy) + Math.abs(mod.entropy) * 0.001)),
        mutationRate: Math.max(0, Math.min(0.01, microConfig.mutationRate * (1 + mod.mutationRate))),
      }
    : null;

  return (
    <div
      data-ui-overlay="true"
      style={{
        ...(embedded ? { position: 'relative', width: '100%' } : { position: 'absolute', bottom: 72, left: 8, zIndex: 30, width: 240 }),
        maxHeight: embedded ? '70vh' : 'calc(100vh - 160px)',
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
          <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.16)', letterSpacing: '0.04em' }}>
            {advancedSimulationMode ? 'Retroação · Emergência · Autopoiese' : 'Modo padrão · presets estáveis'}
          </div>
        </div>

        {/* Modo padrão / avançado */}
        {onAdvancedSimulationModeChange && (
          <button
            type="button"
            onClick={() => onAdvancedSimulationModeChange(!advancedSimulationMode)}
            title={advancedSimulationMode ? 'Modo avançado: Hebbian, reconfig, feedback. Clique para modo padrão (estável).' : 'Modo padrão: presets fixos, sem mutação. Clique para modo avançado.'}
            style={{
              fontFamily: MONO, fontSize: 8, padding: '3px 6px', cursor: 'pointer',
              background: advancedSimulationMode ? `${TEAL}12` : 'rgba(255,255,255,0.06)',
              border: `1px dashed ${advancedSimulationMode ? `${TEAL}44` : 'rgba(255,255,255,0.1)'}`,
              color: advancedSimulationMode ? TEAL : 'rgba(255,255,255,0.5)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}
          >
            {advancedSimulationMode ? 'Avançado' : 'Padrão'}
          </button>
        )}

        {/* Phase pill */}
        {cfg.enabled && (
          <div title={phaseHint} style={{
            fontFamily: MONO, fontSize: 8.5, padding: '1px 5px',
            background: `${phaseColor}0c`, color: phaseColor,
            border: `1px dashed ${phaseColor}30`, letterSpacing: '0.04em',
          }}>
            {phaseSigil} {safePhase}
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
                  fontFamily: MONO, fontSize: 9, padding: '3px 8px', cursor: 'pointer',
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
                  title={t('cl_resetPhase')}
                  style={{
                    fontFamily: MONO, fontSize: 9, padding: '3px 6px', cursor: 'pointer',
                    background: 'transparent', border: '1px dashed rgba(255,255,255,0.06)',
                    color: DIM, letterSpacing: '0.05em',
                  }}
                >
                  ↺
                </button>
              )}

              {/* Health + emergence pills */}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                <div title={t('cl_systemHealth')} style={{
                  fontFamily: MONO, fontSize: 8.5, padding: '2px 4px',
                  background: `rgba(${systemHealth > 0.6 ? '80,255,130' : systemHealth > 0.35 ? '255,200,80' : '255,80,80'},0.06)`,
                  border: `1px dashed rgba(${systemHealth > 0.6 ? '80,255,130' : systemHealth > 0.35 ? '255,200,80' : '255,80,80'},0.25)`,
                  color: systemHealth > 0.6 ? '#60ff90' : systemHealth > 0.35 ? '#ffc840' : '#ff6050',
                }}>
                  ♥ {Math.round(systemHealth * 100)}%
                </div>
                <div title={t('cl_emergenceIndex')} style={{
                  fontFamily: MONO, fontSize: 8.5, padding: '2px 4px',
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
                  <span style={{ fontFamily: MONO, fontSize: 8, color: DIM, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('cl_phase')}</span>
                  <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.04)' }}>
                    <div style={{ height: '100%', width: `${(feedback.phase % 1) * 100}%`, background: `linear-gradient(90deg,${phaseColor}55,${phaseColor}aa)`, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 8.5, color: phaseColor, padding: '1px 4px', background: `${phaseColor}0c`, border: `1px dashed ${phaseColor}22` }}>
                    {phaseSigil} {safePhase}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────
              SECÇÃO: TELEMETRIA AO VIVO (reflete parâmetros efetivos em tempo real)
          ────────────────────────────────────────────────────────────── */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <SectionHeader label={t('cl_telemetry')} open={secTel} onToggle={() => setSecTel(v => !v)} />
            {secTel && (
              <div>
                {cfg.enabled && (
                  <div style={{ fontFamily: MONO, fontSize: 7.5, color: 'rgba(255,255,255,0.35)', marginBottom: 6, letterSpacing: '0.03em' }}>
                    {t('cl_effectiveParams')}
                  </div>
                )}
                {!life.energyEnabled && (
                  <div style={{ fontFamily: MONO, fontSize: 8, color: '#ffa050', marginBottom: 6, letterSpacing: '0.02em' }}>
                    ⚡ Energia desligada — ative em Metabolismo para nasc./mortes
                  </div>
                )}
                <div style={{ fontFamily: MONO, fontSize: 7.5, color: DIM, marginBottom: 6, lineHeight: 1.35 }}>
                  Clusters parados = equilíbrio (forças balanceadas). Use &quot;Destacar clusters&quot; no painel direito para vê-los; aumente Entropia ou Limite de velocidade para mais movimento.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', marginBottom: 4 }}>
                  <TelRow label={t('cl_fps')} value={Math.round(fps)} color={FPS_COLOR} />
                  <TelRow label={t('cl_agents')} value={agentCount} />
                  <TelRow label={t('cl_births')} value={vitalRates.birthsPerSec.toFixed(1)} unit="/s" color="#60ff90" />
                  <TelRow label={t('cl_deaths')} value={vitalRates.deathsPerSec.toFixed(1)} unit="/s" color="#ff7060" />
                  <TelRow label={t('cl_mutations')} value={vitalRates.mutationsPerSec.toFixed(1)} unit="/s" color="#c080ff" />
                  <TelRow
                    label={t('cl_balance')}
                    value={bal >= 0 ? `+${bal.toFixed(1)}` : bal.toFixed(1)}
                    unit="/s"
                    color={bal >= 0 ? '#60ff90' : '#ff7060'}
                  />
                </div>
                <div style={{ fontFamily: DOTO, fontSize: 7.5, color: 'rgba(255,255,255,0.12)', marginBottom: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {t('cl_deathsByCause')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', marginBottom: 6 }}>
                  <TelRow label={t('cl_starvation')} value={vitalRates.deathsByStarvation.toFixed(1)} unit="/s" color="#ff6050" />
                  <TelRow label={t('cl_age')} value={vitalRates.deathsByAge.toFixed(1)} unit="/s" color="#ffa050" />
                  <TelRow label={t('cl_collision')} value={vitalRates.deathsByCollision.toFixed(1)} unit="/s" color="#ffc840" />
                  <TelRow label={t('cl_predation')} value={vitalRates.deathsByPredation.toFixed(1)} unit="/s" color="#c080ff" />
                </div>
                <div>
                  <div style={{ fontFamily: DOTO, fontSize: 8, color: 'rgba(255,255,255,0.14)', marginBottom: 3, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                    {t('cl_modules')}
                  </div>
                  {top3.length > 0
                    ? top3.map(({ id, ms }) => {
                        const st = getModuleStats(telem, id);
                        return (
                          <div key={id} style={{ marginBottom: 2.5 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>{id}</span>
                              <span style={{ fontFamily: MONO, fontSize: 9, color: ms > 5 ? '#ff7060' : ms > 2 ? '#ffc840' : `${TEAL}99` }}>
                                {ms.toFixed(2)} ms
                              </span>
                            </div>
                            {st.historySize > 0 && (
                              <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.2)', marginLeft: 2 }}>
                                avg {st.avgMs.toFixed(1)} · max {st.maxMs.toFixed(1)} · {st.percentOfFrame.toFixed(0)}% frame
                              </div>
                            )}
                          </div>
                        );
                      })
                    : (
                      <>
                        <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                          Aguardando telemetria (atualiza a cada 20 quadros)…
                        </div>
                        {MODULE_IDS.slice(0, 5).map((id) => (
                          <div key={id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1.5 }}>
                            <span style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>{id}</span>
                            <span style={{ fontFamily: MONO, fontSize: 9, color: DIM }}>— ms</span>
                          </div>
                        ))}
                        {MODULE_IDS.length > 5 && (
                          <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>
                            +{MODULE_IDS.length - 5} módulos
                          </div>
                        )}
                      </>
                    )}
                </div>
                {/* Performance completa: todos os módulos (para otimização e claims de escalabilidade) */}
                <SectionHeader label="Performance (todos os módulos)" open={secPerf} onToggle={() => setSecPerf(v => !v)} />
                {secPerf && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontFamily: MONO, fontSize: 7.5, color: DIM, marginBottom: 4 }}>
                      avg · max (ms) · % do frame (60fps). Histórico 120 frames.
                    </div>
                    {getAllModuleStats(telem).map((st) => (
                      <div key={st.module} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2, fontFamily: MONO, fontSize: 8.5 }}>
                        <span style={{ color: DIM }}>{st.module}</span>
                        <span style={{ color: st.percentOfFrame > 80 ? '#ff7060' : st.percentOfFrame > 40 ? '#ffc840' : 'rgba(255,255,255,0.5)' }}>
                          {st.avgMs.toFixed(2)} · {st.maxMs.toFixed(2)} ms · {st.percentOfFrame.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                    {budgetState && budgetState.lodLevel > 0 && (
                      <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 8, color: '#ffc840' }}>
                        Budget ativo: LOD {budgetState.lodLevel} · max steps → {budgetState.recommendedMaxSteps}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────
              SECÇÃO: ESTADO EMERGENTE (read-only)
          ────────────────────────────────────────────────────────────── */}
          <div style={{ padding: '6px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <SectionHeader label={t('cl_meadowsState')} open={secMetrics} onToggle={() => setSecMet(v => !v)} />
            {secMetrics && (
              <div>
                <MetricBar label={t('cl_variety')} value={metrics.variedade} color="#c080ff" hint="Diversidade de tipos no espaço. Alta variedade = alto potencial de resiliência (Lei de Ashby)." />
                <MetricBar label={t('cl_cohesion')} value={metrics.coesao} color="#60d0ff" hint="Aglomeração espacial. Nicho emergindo — padrão de auto-organização local." />
                <MetricBar label={t('cl_friction')} value={metrics.atrito} color="#ff6050" hint="Pressão competitiva. Força de seleção ativa: loop de balanço." />
                <MetricBar label={t('cl_resilience')} value={metrics.resiliencia} color="#50ff90" hint="Fração de espécies ativas. Diversidade = capacidade de absorver perturbação." />
                <MetricBar label={t('cl_persistence')} value={metrics.persistencia} color="#ffd060" hint="Homeostase. Alta persistência = sistema estagnado (derive para baixa performance)." />
                <MetricBar label={t('cl_metabolism')} value={metrics.metabolismo} color="#80c0ff" hint="Fluxo de energia cinética. Stocks e flows — vitalidade do sistema." />

                {/* Forces compact */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '5px 0' }} />
                <div style={{ marginBottom: 0 }}>
                  <div style={{ fontFamily: DOTO, fontSize: 7.5, color: DIM, marginBottom: 4, letterSpacing: '0.09em', textTransform: 'uppercase' }}>{t('cl_meadowsForces')}</div>
                  <ForceBar label={t('cl_perturbation')} value={forces.perturbacao} color="#e0c860" hint="Desordem criativa. Injeta imprevisibilidade — motor de emergência." />
                  <ForceBar label={t('cl_autoOrg')} value={forces.autoOrganizacao} color="#6090e0" hint="Consolida estruturas espontâneas. Padrão sem controle externo." />
                  <ForceBar label={t('cl_amplification')} value={forces.amplificacao} color="#50e080" hint="Loop de reforço R. Crescimento se auto-alimenta." />
                  <ForceBar label={t('cl_regulation')} value={forces.regulacao} color="#e05050" hint="Loop de balanço B. Freia runaway." />
                  <ForceBar label={t('cl_coherence')} value={forces.coerencia} color="#d4a060" hint="Saúde global. O todo é mais do que a soma das partes." />
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
                        <div key={k} style={{ fontFamily: MONO, fontSize: 8, padding: '1px 3px', background: `${col}0c`, border: `1px dashed ${col}22`, color: col }}>
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
              SECÇÃO: MORIN — ÍNDICES PROFUNDOS
              Dialogica, Recursivo, Hologramático, Sapiens/Demens, Tetralogia
          ────────────────────────────────────────────────────────────── */}
          <div style={{ padding: '6px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <SectionHeader label={t('cl_morinIndices')} open={secMorin} onToggle={() => setSecMorin(v => !v)} accent="#00d4aa88" />
            {secMorin && (
              <div>
                <ForceBar label={t('cl_dialogic')} value={morin.dialogica} color="#c080ff"
                  hint="Co-presença de forças antagônicas (R+B loops). Alto = opostos coexistem produtivamente." />
                <ForceBar label={t('cl_recursive')} value={morin.recursivo} color="#60d0ff"
                  hint="Loop recursivo: efeito se torna causa. Produto é também produtor. O sistema modifica a si mesmo." />
                <ForceBar label={t('cl_hologrammatic')} value={morin.hologramatico} color="#50e080"
                  hint="Cada parte contém a lógica do todo. Correlação entre dinâmica local e padrão global." />
                <ForceBar label={t('cl_tetralogy')} value={morin.tetralogia} color="#e0c860"
                  hint="Ordem ↔ Desordem ↔ Interações ↔ Organização. Alto = todos os 4 polos ativos e ciclando." />

                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '6px 0' }} />

                {/* Sapiens-Demens gauge */}
                <div style={{ marginBottom: 4 }} title="Razão construtivo/destrutivo. 0.5 = equilíbrio sapiens-demens.">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: DIM2, letterSpacing: '0.03em' }}>{t('cl_sapiensDemens')}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: Math.abs(morin.sapiensDemens - 0.5) < 0.15 ? '#00d4aa' : '#ffc840' }}>
                      {(morin.sapiensDemens * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3 }}>
                    {/* Center marker at 50% */}
                    <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: 6, background: 'rgba(255,255,255,0.15)' }} />
                    {/* Indicator */}
                    <div style={{
                      position: 'absolute',
                      left: `${morin.sapiensDemens * 100}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 8, height: 8, borderRadius: '50%',
                      background: Math.abs(morin.sapiensDemens - 0.5) < 0.15 ? '#00d4aa' : morin.sapiensDemens > 0.65 ? '#60d0ff' : '#ff6050',
                      border: '1px solid rgba(255,255,255,0.20)',
                      transition: 'left 0.3s',
                    }} />
                    {/* Labels */}
                    <div style={{ position: 'absolute', left: 4, top: 8, fontFamily: MONO, fontSize: 7, color: '#ff605080' }}>Demens</div>
                    <div style={{ position: 'absolute', right: 4, top: 8, fontFamily: MONO, fontSize: 7, color: '#60d0ff80' }}>Sapiens</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────
              SECÇÃO: INTERAÇÃO (micro) + DIALÓGICA (Morin)
              Parâmetros: acoplamento, força, viscosidade, beta, entropia, dialógica
              Com retroação ativa: valor efetivo = base + Δ exibido ao lado do slider.
          ────────────────────────────────────────────────────────────── */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <SectionHeader label={t('cl_interactionDialogic')} open={secInteract} onToggle={() => setSecInt(v => !v)} accent={`${TEAL}88`} />
            {secInteract && (
              <div>
                <CtrlSlider
                  icon="🧬" label={t('cl_speciesCount')}
                  hint="Número de tipos/espécies na matriz de interação (typesCount). Afeta diversidade e matriz atração/repulsão."
                  value={microConfig.typesCount} min={2} max={16} step={1}
                  display={`${microConfig.typesCount}`}
                  onChange={v => onMicroChange({ typesCount: Math.round(v) })}
                />
                <ToggleRow
                  label={t('cl_toroidalBoundary')}
                  hint="wrap: true = agentes reaparecem do outro lado; false = bordas sólidas."
                  checked={microConfig.wrap}
                  onChange={(v) => onMicroChange({ wrap: v })}
                />
                <CtrlSlider
                  icon="↓" label={t('cl_gravity')}
                  hint="Gravidade global (unidades/s²). Diferencia universos: sedimentação, pressão. Y negativo = para baixo."
                  value={microConfig.gravityY ?? 0} min={-1.2} max={1.2} step={0.05}
                  onChange={v => onMicroChange({ gravityY: v })}
                />
                <CtrlSlider
                  icon="→" label={t('cl_gravityX')}
                  hint="Gravidade horizontal. X positivo = puxa para a direita."
                  value={microConfig.gravityX ?? 0} min={-1.2} max={1.2} step={0.05}
                  onChange={v => onMicroChange({ gravityX: v })}
                />
                <CtrlSlider
                  icon="🔗" label={t('cl_coupling')}
                  hint="Raio de interação entre agentes. Alto acoplamento = mais interconexões. (rmax)"
                  value={microConfig.rmax} min={0.04} max={0.50} step={0.01}
                  effectiveDisplay={eff ? eff.rmax.toFixed(2) : undefined}
                  effectiveValueTitle={t('cl_effectiveValue')}
                  onChange={v => onMicroChange({ rmax: v })}
                />
                <CtrlSlider
                  icon="⚡" label={t('cl_attractionForce')}
                  hint="Magnitude das forças de atração/repulsão. Amplitude dos loops de interação. (force)"
                  value={microConfig.force} min={0.2} max={4.0} step={0.05}
                  effectiveDisplay={eff ? eff.force.toFixed(2) : undefined}
                  effectiveValueTitle={t('cl_effectiveValue')}
                  onChange={v => onMicroChange({ force: v })}
                />
                <CtrlSlider
                  icon="🫧" label={t('cl_viscosity')}
                  hint="Arrasto exponencial (drag). Alto = movimento mais contido; baixo = mais cinético."
                  value={microConfig.drag} min={0.1} max={5.0} step={0.1}
                  effectiveDisplay={eff ? eff.drag.toFixed(2) : undefined}
                  effectiveValueTitle={t('cl_effectiveValue')}
                  onChange={v => onMicroChange({ drag: v })}
                />
                <CtrlSlider
                  icon="🏎" label={t('cl_speedLimit')}
                  hint="Clamp de velocidade (speedClamp). Controla quanto energia cinética pode acumular."
                  value={microConfig.speedClamp} min={0.02} max={0.5} step={0.01}
                  onChange={v => onMicroChange({ speedClamp: v })}
                />
                <CtrlSlider
                  icon="⭐" label={t('cl_autoOrgThreshold')}
                  hint="Raio central de repulsão (beta). Controla quando agentes se organizam em estruturas vs. se dispersam."
                  value={microConfig.beta} min={0.05} max={0.95} step={0.01}
                  effectiveDisplay={eff ? eff.beta.toFixed(2) : undefined}
                  effectiveValueTitle={t('cl_effectiveValue')}
                  onChange={v => onMicroChange({ beta: v })}
                />
                <CtrlSlider
                  icon="🧲" label={t('cl_centralRepulsion')}
                  hint="Intensidade da repulsão no núcleo (coreRepel). Alto = evita colapso; baixo = favorece aglomeração."
                  value={microConfig.coreRepel} min={0.2} max={2.0} step={0.05}
                  onChange={v => onMicroChange({ coreRepel: v })}
                />
                <ToggleRow
                  label={t('cl_particleCollision')}
                  hint="Colisão partícula–partícula: exclusão espacial (empurrar quando muito perto)."
                  checked={microConfig.collisionEnabled !== false}
                  onChange={(v) => onMicroChange({ collisionEnabled: v })}
                />
                <CtrlSlider
                  icon="◎" label={t('cl_collisionRadius')}
                  hint="Distância mínima entre partículas; abaixo disso repulsão (collisionRadius)."
                  value={microConfig.collisionRadius ?? 0.012} min={0} max={0.04} step={0.002}
                  onChange={v => onMicroChange({ collisionRadius: v })}
                />
                <CtrlSlider
                  icon="⚡" label={t('cl_collisionStiffness')}
                  hint="Rigidez da repulsão de colisão (collisionStiffness)."
                  value={microConfig.collisionStiffness ?? 0.6} min={0.1} max={1.5} step={0.05}
                  onChange={v => onMicroChange({ collisionStiffness: v })}
                />
                <CtrlSlider
                  icon="🔥" label={t('cl_entropy')}
                  hint="Ruído injetado por frame. Alta entropia = perturbação criativa. Baixa = sistema determinístico."
                  value={microConfig.entropy} min={0} max={1.0} step={0.01}
                  display={microConfig.entropy.toFixed(2)}
                  effectiveDisplay={eff ? eff.entropy.toFixed(3) : undefined}
                  effectiveValueTitle={t('cl_effectiveValue')}
                  onChange={v => onMicroChange({ entropy: v })}
                />
                <CtrlSlider
                  icon="☯" label={t('cl_dialogicLabel')}
                  hint="Intensidade da dependência circular entre tipos. Cria tensão ordem/desordem — opostos que coexistem."
                  value={microConfig.circularDependency} min={0} max={1} step={0.01}
                  onChange={v => onMicroChange({ circularDependency: v })}
                />
                <ToggleRow
                  label={t('cl_sigilForces')}
                  hint="Usa sigilBond/sigilRift como forças causais na microdinâmica (toggle)."
                  checked={microConfig.enableSigilForces !== false}
                  onChange={(v) => onMicroChange({ enableSigilForces: v })}
                />
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────
              SECÇÃO: METABOLISMO · Auto-Eco-Organização (Morin)
              Parâmetros: absorção, custo, reprodução, capacidade, mutação
          ────────────────────────────────────────────────────────────── */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <SectionHeader label={t('cl_metabolismSection')} open={secMeta} onToggle={() => setSecMeta(v => !v)} accent={`${TEAL}88`} />
            {secMeta && (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontFamily: DOTO, fontSize: 8, color: DIM, marginBottom: 5, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                    {t('cl_lifeToggles')}
                  </div>
                  <ToggleRow
                    label={t('cl_food')}
                    hint="Ativa nós de recurso (food). Sem isso, a dinâmica fica mais 'física' e menos metabólica."
                    checked={life.foodEnabled}
                    onChange={(v) => onLifeChange({ foodEnabled: v })}
                  />
                {life.foodEnabled && (
                  <CtrlSlider
                    icon="🍎" label={t('cl_foodRatio')}
                    hint="Proporção de partículas que são recurso (food). life.foodRatio → microConfig.foodRatio."
                    value={life.foodRatio} min={0.05} max={0.5} step={0.01}
                    display={life.foodRatio.toFixed(2)}
                    onChange={v => onLifeChange({ foodRatio: v })}
                  />
                )}
                  <ToggleRow
                    label={t('cl_energy')}
                    hint="Ativa o sistema de energia/reprodução. Sem energia, não há seleção por custo/ganho."
                    checked={life.energyEnabled}
                    onChange={(v) => onLifeChange({ energyEnabled: v })}
                  />
                  <ToggleRow
                    label={t('cl_reconfig')}
                    hint="Ativa mutação macro (reconfig) em janelas — útil para phase shifts e novidades."
                    checked={life.reconfigEnabled}
                    onChange={(v) => onLifeChange({ reconfigEnabled: v })}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: DIM2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {t('cl_mode')}
                    </span>
                    <select
                      value={life.mode}
                      onChange={(e) => onLifeChange({ mode: e.target.value as any })}
                      style={{
                        fontFamily: MONO,
                        fontSize: 9,
                        color: 'rgba(255,255,255,0.55)',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px dashed rgba(255,255,255,0.08)',
                        padding: '2px 6px',
                      }}
                    >
                      <option value="OFF">{t('cl_OFF')}</option>
                      <option value="METABOLIC">{t('cl_METABOLIC')}</option>
                      <option value="EVOLUTIVE">{t('cl_EVOLUTIVE')}</option>
                      <option value="FULL">{t('cl_FULL')}</option>
                    </select>
                  </div>
                </div>

                <CtrlSlider
                  icon="💧" label={t('cl_absorptionRate')}
                  hint="Velocidade de ganho de energia ao interagir com outros. Stocks e flows: taxa de entrada no estoque de energia."
                  value={life.energyFeedRate} min={0.005} max={0.15} step={0.005}
                  display={life.energyFeedRate.toFixed(3)}
                  onChange={v => onLifeChange({ energyFeedRate: v })}
                />
                <CtrlSlider
                  icon="⚗️" label={t('cl_metabolicCost')}
                  hint="Decaimento de energia por frame. Pressão de seleção: agentes de baixo custo sobrevivem mais. (energyDecay)"
                  value={life.energyDecay} min={0.0005} max={0.01} step={0.0005}
                  display={life.energyDecay.toFixed(4)}
                  onChange={v => onLifeChange({ energyDecay: v })}
                />
                <CtrlSlider
                  icon="🌱" label={t('cl_reproductionThreshold')}
                  hint="Energia necessária para se reproduzir. Alto limiar = seleção mais rígida. (reproductionThreshold)"
                  value={life.energyReproThreshold} min={0.5} max={5.0} step={0.1}
                  onChange={v => onLifeChange({ energyReproThreshold: v })}
                />
                <CtrlSlider
                  icon="👥" label={t('cl_supportCapacity')}
                  hint="Número máximo de agentes. Define o teto do estoque populacional. (targetParticleCount)"
                  value={targetParticleCount} min={100} max={3000} step={50}
                  display={`${targetParticleCount}`}
                  onChange={v => onTargetParticleCountChange(Math.round(v))}
                />
                <ToggleRow
                  label={t('cl_maintainPopulation')}
                  hint="Se desligado, a população pode oscilar (nascimentos/mortes alteram o total). Se ligado, o sistema força o total até a capacidade alvo."
                  checked={maintainPopulation}
                  onChange={onMaintainPopulationChange}
                />
                <CtrlSlider
                  icon="🧬" label={t('cl_mutation')}
                  hint="Dial de mutação [0..1]. Alto = tipos evoluem rapidamente, baixa estabilidade. (mutationDial)"
                  value={life.mutationDial} min={0} max={1} step={0.01}
                  onChange={v => onLifeChange({ mutationDial: v })}
                />
                <div style={{ marginTop: 6, padding: '6px 8px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.05)' }}>
                  {(() => {
                    const evolutionOff = life.mode === 'OFF';
                    const mr = evolutionOff ? 0 : life.mutationRate;
                    const ts = evolutionOff ? 1 : life.typeStability;
                    const effMr = eff != null && !evolutionOff ? eff.mutationRate : mr;
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 8.5, color: DIM }}>
                          <span>mutationRate</span><span style={{ color: evolutionOff ? 'rgba(255,255,255,0.25)' : DIM2 }}>{mr.toFixed(5)}{eff != null && !evolutionOff && <span style={{ marginLeft: 4, fontSize: 7.5, color: 'rgba(255,255,255,0.35)' }} title={t('cl_effectiveValue')}>→ {effMr.toFixed(5)}</span>}{evolutionOff && <span style={{ marginLeft: 4, fontSize: 7.5, color: 'rgba(255,255,255,0.25)' }}>(OFF)</span>}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 8.5, color: DIM }}>
                          <span>typeStability</span><span style={{ color: evolutionOff ? 'rgba(255,255,255,0.25)' : DIM2 }}>{ts.toFixed(3)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 8.5, color: DIM }}>
                          <span>mutationAmount</span><span style={{ color: DIM2 }}>{life.mutationAmount.toFixed(3)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────
              SECÇÃO: RETROALIMENTAÇÃO · Recursivité (Morin)
              Parâmetros: força, atraso, memória, regulação
          ────────────────────────────────────────────────────────────── */}
          <div style={{ padding: '8px 10px', borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
            <SectionHeader label={t('cl_feedbackSection')} open={secFeedback} onToggle={() => setSecFb(v => !v)} accent={`${TEAL}88`} />
            {secFeedback && (
              <div>
                <CtrlSlider
                  icon="🔄" label={t('cl_loopStrength')}
                  hint="Intensidade dos loops de feedback. 0 = sistema aberto. 1 = retroação máxima nos parâmetros. (strength)"
                  value={cfg.strength} min={0} max={1} step={0.01}
                  onChange={v => onConfigChange({ strength: v })}
                />
                <CtrlSlider
                  icon="⏱" label={t('cl_systemDelay')}
                  hint="Delay entre causa e efeito do loop de feedback. Atrasos longos → instabilidade e oscilações. (intervalFrames)"
                  value={cfg.intervalFrames} min={1} max={60} step={1}
                  display={`${cfg.intervalFrames} fr`}
                  onChange={v => onConfigChange({ intervalFrames: Math.round(v) })}
                />
                <CtrlSlider
                  icon="🧠" label={t('cl_systemMemory')}
                  hint="Inércia do loop de feedback. Alta memória = sistema 'lembra' perturbações. Correlato de história acumulada. (smoothing)"
                  value={cfg.smoothing} min={0} max={0.99} step={0.01}
                  onChange={v => onConfigChange({ smoothing: v })}
                />
                <CtrlSlider
                  icon="🛡" label={t('cl_maxRegulation')}
                  hint="Teto da autorregulação. Limita quanto os loops de balanço podem comprimir os parâmetros. (chaosClamp)"
                  value={cfg.chaosClamp} min={0} max={1} step={0.01}
                  onChange={v => onConfigChange({ chaosClamp: v })}
                />

                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
                <div style={{ fontFamily: DOTO, fontSize: 8, color: DIM, marginBottom: 5, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                  Macro (Reconfig / Matriz)
                </div>
                <CtrlSlider
                  icon="⏱" label={t('cl_interval')}
                  hint="Intervalo entre ticks de reconfiguração (operadores macro: mutação de matriz, especiação, instituição)."
                  value={reconfigConfig.interval} min={0.5} max={12} step={0.5}
                  display={`${reconfigConfig.interval.toFixed(1)}s`}
                  onChange={v => onReconfigChange({ interval: v })}
                />
                <CtrlSlider
                  icon="🧬" label={t('cl_speciation')}
                  hint="Probabilidade do operador de especiação quando há clusters estáveis."
                  value={reconfigConfig.speciationRate} min={0} max={1} step={0.05}
                  onChange={v => onReconfigChange({ speciationRate: v })}
                />
                <CtrlSlider
                  icon="🏛" label={t('cl_institution')}
                  hint="Probabilidade do operador de instituição (artefatos semânticos) quando há oscilação/mythic."
                  value={reconfigConfig.institutionRate} min={0} max={1} step={0.05}
                  onChange={v => onReconfigChange({ institutionRate: v })}
                />
                <CtrlSlider
                  icon="⚙" label={t('cl_matrixMutationForce')}
                  hint="Intensidade/chance do operador de mutação da matriz de atração (mutationStrength)."
                  value={reconfigConfig.mutationStrength} min={0} max={0.5} step={0.01}
                  display={reconfigConfig.mutationStrength.toFixed(2)}
                  onChange={v => onReconfigChange({ mutationStrength: v })}
                />
                <CtrlSlider
                  icon="⏳" label={t('cl_operatorCooldown')}
                  hint="Tempo mínimo entre disparos dos operadores macro (operatorCooldown, segundos)."
                  value={reconfigConfig.operatorCooldown} min={0.5} max={8} step={0.5}
                  display={`${reconfigConfig.operatorCooldown.toFixed(1)}s`}
                  onChange={v => onReconfigChange({ operatorCooldown: v })}
                />
                <CtrlSlider
                  icon="⊕" label={t('cl_attractionScale')}
                  hint="Fator de escala para atração na fase shift (matrixAttractScale). 1 = neutro."
                  value={reconfigConfig.matrixAttractScale ?? 1} min={0.3} max={1.5} step={0.05}
                  onChange={v => onReconfigChange({ matrixAttractScale: v })}
                />
                <CtrlSlider
                  icon="⊖" label={t('cl_repulsionScale')}
                  hint="Fator de escala para repulsão na fase shift (matrixRepelScale). 1 = neutro."
                  value={reconfigConfig.matrixRepelScale ?? 1} min={0.3} max={1.5} step={0.05}
                  onChange={v => onReconfigChange({ matrixRepelScale: v })}
                />
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────
              SECÇÃO: CAMPO / AMBIENTE
              Parâmetros: recursividade (influenceStrength), hologramático (depositStrength)
          ────────────────────────────────────────────────────────────── */}
          <div style={{ padding: '8px 10px' }}>
            <SectionHeader label={t('cl_fieldSection')} open={secField} onToggle={() => setSecFld(v => !v)} accent={`${TEAL}88`} />
            {secField && (
              <div>
                <CtrlSlider
                  icon="♻️" label={t('cl_recursivity')}
                  hint="Força com que o campo alimenta de volta os agentes. Efeito se torna causa: agentes modificam o campo que os modifica. (influenceStrength)"
                  value={fieldConfig.influenceStrength} min={0} max={2} step={0.05}
                  onChange={v => onFieldChange({ influenceStrength: v })}
                />
                <CtrlSlider
                  icon="🔮" label={t('cl_hologrammaticField')}
                  hint="Intensidade do depósito local no campo global. Cada parte escreve o todo. O trace local emerge como padrão global. (depositStrength)"
                  value={fieldConfig.depositStrength} min={0} max={3} step={0.05}
                  onChange={v => onFieldChange({ depositStrength: v })}
                />
                <CtrlSlider
                  icon="🌊" label={t('cl_fieldDiffusion')}
                  hint="Velocidade de difusão do campo espacial. Alta difusão = efeitos locais se propagam rapidamente. (diffusion)"
                  value={fieldConfig.diffusion} min={0.01} max={0.5} step={0.01}
                  onChange={v => onFieldChange({ diffusion: v })}
                />
                <CtrlSlider
                  icon="📉" label={t('cl_fieldDecay')}
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
