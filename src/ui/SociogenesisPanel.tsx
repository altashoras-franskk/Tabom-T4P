// Sociogenesis Panel — Lens-first, readable, narrative-rich
import React, { useState } from 'react';
import type {
  SociogenesisState,
  SocioTool,
  TotemKind,
  TabooKind,
  RitualKind,
  SocioLens,
  CultureConfig,
} from '../sim/sociogenesis/sociogenesisTypes';
import { MEME_COLORS } from '../sim/sociogenesis/sociogenesisTypes';
import { SOCIOGENESIS_PRESETS } from '../sim/sociogenesis/sociogenesisPresets';
import { ChevronRight, ChevronLeft, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Observables } from '../sim/observables';
import type { MemeStats } from '../sim/sociogenesis/cultureEngine';
import type { EconomyConfig, EconomyMetrics } from '../sim/economy/economyTypes';

interface PrestigeLeader {
  idx: number;
  prestige: number;
  memeId: number;
  wx: number;
  wy: number;
}

interface SociogenesisPanelProps {
  state: SociogenesisState;
  observables: Observables | null;
  lens: SocioLens;
  onLensChange: (lens: SocioLens) => void;
  onToolChange: (tool: SocioTool) => void;
  onConfigChange: (patch: Partial<SociogenesisState['config']>) => void;
  onCultureConfigChange?: (patch: Partial<CultureConfig>) => void;
  onSelectEntity: (sel: SociogenesisState['selected']) => void;
  onRemoveTotem: (id: string) => void;
  onRemoveTaboo: (id: string) => void;
  onRemoveRitual: (id: string) => void;
  onOverlayChange: (patch: Partial<SociogenesisState['overlay']>) => void;
  onForceResolveCase: (id: string) => void;
  onTotemKindChange?: (kind: TotemKind) => void;
  onTabooKindChange?: (kind: TabooKind) => void;
  onRitualKindChange?: (kind: RitualKind) => void;
  onEntityUpdate?: (type: string, id: string, patch: Record<string, any>) => void;
  selectedTotemKind?: TotemKind;
  selectedTabooKind?: TabooKind;
  selectedRitualKind?: RitualKind;
  particleCount?: number;
  onNewWorld?: () => void;
  onLoadPreset?: (presetId: string) => void;
  onResetSymbols?: () => void;
  memeStats?: MemeStats | null;
  prestigeLeaders?: PrestigeLeader[];
  economyConfig?: EconomyConfig;
  economyMetrics?: EconomyMetrics;
  onEconomyConfigChange?: (patch: Partial<EconomyConfig>) => void;
  onEconomyPreset?: (preset: 'market_scarcity' | 'ritual_economy' | 'fortress_taboo') => void;
}

// Phase palette
const PHASE_COLORS: Record<string, string> = {
  SWARM: '#fbbf24',
  CLUSTER: '#34d399',
  SEGREGATED: '#f97316',
  RITUALIZED: '#a78bfa',
  COLLAPSE: '#ef4444',
  DISPERSED: '#94a3b8',
};

const TOTEM_KINDS: { id: TotemKind; label: string; color: string; hint: string }[] = [
  { id: 'BOND',    label: 'Bond',    color: '#5ac8fa', hint: 'Attracts nearby agents toward center' },
  { id: 'RIFT',    label: 'Rift',    color: '#ff6b6b', hint: 'Repels all agents from zone' },
  { id: 'ORACLE',  label: 'Oracle',  color: '#c084fc', hint: 'Adds controlled directional drift' },
  { id: 'ARCHIVE', label: 'Archive', color: '#94a3b8', hint: 'Passively stabilizes field memory' },
];

const TABOO_KINDS: { id: TabooKind; label: string; color: string; hint: string }[] = [
  { id: 'NO_ENTER', label: 'No Entry', color: '#ef4444', hint: 'Forbidden zone — elastic repulsion' },
  { id: 'NO_MIX',   label: 'No Mix',   color: '#f97316', hint: 'Type segregation boundary' },
];

const RITUAL_KINDS: { id: RitualKind; label: string; color: string; hint: string }[] = [
  { id: 'GATHER',     label: 'Gather',  color: '#34d399', hint: 'Periodic mass attraction to totem' },
  { id: 'PROCESSION', label: 'Orbit',   color: '#c084fc', hint: 'Circular orbit around totem' },
  { id: 'OFFERING',   label: 'Offering', color: '#fbbf24', hint: 'Dampens velocity — restful state' },
];

const LENS_OPTIONS: { id: SocioLens; label: string; desc: string; color: string }[] = [
  { id: 'off',       label: 'Off',       desc: 'Clean canvas — symbols only',               color: '#94a3b8' },
  { id: 'culture',   label: 'Culture',   desc: 'Meme spread + prestige halos + connections', color: '#ff6b9d' },
  { id: 'law',       label: 'Law',       desc: 'Taboo zones + transgression highlight',      color: '#ef4444' },
  { id: 'ritual',    label: 'Ritual',    desc: 'Ritual activity + sync visualization',      color: '#a78bfa' },
  { id: 'field',     label: 'Field',     desc: 'Amplifies all particle interactions',        color: '#5ac8fa' },
  { id: 'events',    label: 'Events',    desc: 'Emergence pings + chaos amplification',     color: '#fbbf24' },
  { id: 'economy',   label: 'Economy',   desc: 'Resource field heatmap (R)',                color: '#34d399' },
  { id: 'territory', label: 'Territory', desc: 'Claim ownership by meme group',             color: '#8ac926' },
];

// Chronicle symbol legend
const SYMBOL_LEGEND = [
  { icon: '⊕', label: 'BOND Totem', desc: 'Attracts nearby agents toward it' },
  { icon: '✖', label: 'RIFT Totem', desc: 'Repels agents from zone' },
  { icon: '☿', label: 'ORACLE Totem', desc: 'Adds directional drift/chaos' },
  { icon: '⊟', label: 'ARCHIVE Totem', desc: 'Stabilizes field memory passively' },
  { icon: '⛔', label: 'NO ENTER Taboo', desc: 'Elastic forbidden zone' },
  { icon: '⊘', label: 'NO MIX Taboo', desc: 'Segregation barrier between types' },
  { icon: '☀', label: 'GATHER Ritual', desc: 'Periodic pull toward totem center' },
  { icon: '✲', label: 'ORBIT Ritual', desc: 'Tangential orbit around totem' },
  { icon: '☣', label: 'OFFERING Ritual', desc: 'Velocity damping — restful state' },
  { icon: '⚠', label: 'TRANSGRESSION', desc: 'Taboo boundary was violated' },
  { icon: '⚖', label: 'JUDGMENT', desc: 'Justice applied: punish or restore' },
  { icon: '🔄', label: 'CONVERSION WAVE', desc: 'Many agents adopted a new meme' },
  { icon: '👑', label: 'CULT DOMINANCE', desc: 'One meme exceeds 60% of population' },
  { icon: '⚔', label: 'SCHISM WARNING', desc: 'Two rival memes in near-equal tension' },
  { icon: '◎', label: 'LEADER EMERGES', desc: 'Agent prestige crossed 0.65 threshold' },
];

const slider = `w-full h-px bg-white/10 appearance-none cursor-pointer
  [&::-webkit-slider-thumb]:appearance-none
  [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2
  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/70
  [&::-moz-range-thumb]:w-2 [&::-moz-range-thumb]:h-2
  [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white/70
  [&::-moz-range-thumb]:border-0`;

export const SociogenesisPanel: React.FC<SociogenesisPanelProps> = ({
  state,
  observables,
  lens,
  onLensChange,
  onToolChange,
  onConfigChange,
  onCultureConfigChange,
  onSelectEntity,
  onRemoveTotem,
  onRemoveTaboo,
  onRemoveRitual,
  onOverlayChange,
  onForceResolveCase,
  onTotemKindChange,
  onTabooKindChange,
  onRitualKindChange,
  onEntityUpdate,
  selectedTotemKind = 'BOND',
  selectedTabooKind = 'NO_ENTER',
  selectedRitualKind = 'GATHER',
  particleCount = 0,
  onNewWorld,
  onLoadPreset,
  onResetSymbols,
  memeStats,
  prestigeLeaders = [],
  economyConfig,
  economyMetrics,
  onEconomyConfigChange,
  onEconomyPreset,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showEntities, setShowEntities] = useState(false);
  const [showChronicle, setShowChronicle] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCulture, setShowCulture] = useState(true);
  const [showEconomy, setShowEconomy] = useState(false);

  const { config, tool, selected, totems, taboos, rituals, chronicle, cultureConfig } = state;

  if (collapsed) {
    return (
      <div className="fixed right-0 top-0 bottom-0 z-10 pointer-events-none">
        <div className="h-full flex items-center">
          <button
            onClick={() => setCollapsed(false)}
            className="pointer-events-auto p-2 bg-black/5 backdrop-blur-sm rounded-l border border-r-0 border-white/[0.02] hover:border-white/10 transition-all"
          >
            <ChevronLeft size={14} className="text-white/60" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    );
  }

  const phase = observables?.phase || 'DISPERSED';
  const phaseColor = PHASE_COLORS[phase] || '#94a3b8';
  const activeLensInfo = LENS_OPTIONS.find(l => l.id === lens);

  return (
    <div className="fixed right-0 top-0 bottom-0 z-10 w-[260px] pointer-events-none">
      <div className="h-full flex p-3 gap-0">
        {/* Collapse tab */}
        <div className="flex items-center pointer-events-auto mr-2">
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 bg-black/5 backdrop-blur-sm rounded-l border border-r-0 border-white/[0.02] hover:bg-white/5 transition-colors"
          >
            <ChevronRight size={14} className="text-white/40" strokeWidth={1.5} />
          </button>
        </div>

        {/* Main panel */}
        <div className="pointer-events-auto bg-black/5 backdrop-blur-sm rounded border border-white/[0.02] flex-1 flex flex-col overflow-hidden">

          {/* ─── HEADER ─── */}
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between shrink-0">
            <div>
              <div className="text-white/80 text-[10px] tracking-[0.12em] uppercase">Sociogenesis</div>
              <div className="text-white/25 text-[8px] mt-0.5">{particleCount}p · {totems.length}T · {taboos.length}B · {rituals.length}R</div>
            </div>
            <div className="flex gap-1">
              {onNewWorld && (
                <button onClick={onNewWorld} className="px-2 py-0.5 rounded text-[8px] bg-purple-500/15 border border-purple-400/25 text-purple-200/80 hover:bg-purple-500/25 transition-all">
                  New
                </button>
              )}
              {onResetSymbols && (
                <button onClick={onResetSymbols} className="px-2 py-0.5 rounded text-[8px] bg-red-500/10 border border-red-400/20 text-red-200/60 hover:bg-red-500/20 transition-all">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto scrollbar-none">

            {/* ─── PHASE + OBSERVABLES ─── */}
            {observables && (
              <div className="px-3 py-2 border-b border-white/[0.04] shrink-0">
                {/* Phase label */}
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-white/30 text-[8px] uppercase tracking-wider">Phase</span>
                  <span className="text-[13px] tracking-widest uppercase" style={{ color: phaseColor }}>{phase}</span>
                </div>
                {/* 4 metric bars */}
                <div className="space-y-1">
                  <MiniBar label="Cohesion"    value={observables.cohesion}      color="#34d399" />
                  <MiniBar label="Segregation" value={observables.segregation}   color="#f97316" />
                  <MiniBar label="Borders"     value={observables.borderStrength} color="#5ac8fa" />
                  <MiniBar label="Volatility"  value={observables.volatility}    color="#fbbf24" />
                  {memeStats && (
                    <div className="mt-1 pt-1 border-t border-white/[0.04] space-y-0.5">
                      {/* Stacked meme bar — all memes at once */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-white/20 text-[7px] w-14 shrink-0">Memes</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden flex">
                          {memeStats.memeCounts.map((c, m) => {
                            const total = memeStats.memeCounts.reduce((a, b) => a + b, 0) || 1;
                            const pct = c / total * 100;
                            if (pct < 0.5) return null;
                            return (
                              <div
                                key={m}
                                title={`Meme #${m}: ${pct.toFixed(0)}%`}
                                style={{
                                  width: `${pct}%`,
                                  background: MEME_COLORS[m % MEME_COLORS.length],
                                  opacity: m === memeStats.dominantMeme ? 1 : 0.6,
                                  transition: 'width 0.7s ease',
                                }}
                              />
                            );
                          })}
                        </div>
                        {/* dominant label */}
                        <span className="text-[7px] font-mono shrink-0"
                          style={{ color: MEME_COLORS[memeStats.dominantMeme % MEME_COLORS.length] }}>
                          #{memeStats.dominantMeme} {(memeStats.dominantPct * 100).toFixed(0)}%
                        </span>
                      </div>
                      {/* Schism indicator */}
                      {memeStats.schism && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[8px]">⚔</span>
                          <span className="text-[7px]" style={{ color: '#ef476f' }}>
                            SCHISM #{memeStats.dominantMeme} vs #{memeStats.secondMeme}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── LENS SELECTOR ─── */}
            <div className="px-3 py-2 border-b border-white/[0.04] shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/30 text-[8px] uppercase tracking-wider">Lens</span>
                {activeLensInfo && lens !== 'off' && (
                  <span className="text-[7px]" style={{ color: activeLensInfo.color }}>{activeLensInfo.desc}</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-0.5">
                {LENS_OPTIONS.map(l => (
                  <button
                    key={l.id}
                    onClick={() => onLensChange(l.id)}
                    className={`py-1 rounded text-[7px] border transition-all ${
                      lens === l.id
                        ? 'border-current text-white/90'
                        : 'border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/15'
                    }`}
                    style={lens === l.id ? { borderColor: l.color + '80', color: l.color, background: l.color + '15' } : {}}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── TOOLS ─── */}
            <div className="px-3 py-2 border-b border-white/[0.04] shrink-0">
              <div className="flex gap-0.5">
                {(['SELECT', 'TOTEM', 'TABOO', 'RITUAL'] as SocioTool[]).map(t => (
                  <button
                    key={t}
                    onClick={() => onToolChange(t)}
                    className={`flex-1 py-1 rounded text-[7px] border transition-all ${
                      tool === t
                        ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'
                        : 'bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/15'
                    }`}
                  >
                    {t === 'SELECT' ? 'Sel' : t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Kind picker */}
              {tool === 'TOTEM' && (
                <div className="mt-1 grid grid-cols-4 gap-0.5">
                  {TOTEM_KINDS.map(k => (
                    <button
                      key={k.id}
                      title={k.hint}
                      onClick={() => onTotemKindChange?.(k.id)}
                      className={`py-1 rounded text-[6px] border transition-all ${
                        selectedTotemKind === k.id
                          ? 'border-current text-white/80'
                          : 'border-white/[0.06] text-white/25 hover:border-white/15'
                      }`}
                      style={selectedTotemKind === k.id ? { borderColor: k.color + '80', background: k.color + '15' } : {}}
                    >
                      <div className="w-1 h-1 rounded-full mx-auto mb-0.5" style={{ background: k.color }} />
                      {k.label}
                    </button>
                  ))}
                </div>
              )}
              {tool === 'TABOO' && (
                <div className="mt-1 flex gap-0.5">
                  {TABOO_KINDS.map(k => (
                    <button
                      key={k.id}
                      title={k.hint}
                      onClick={() => onTabooKindChange?.(k.id)}
                      className={`flex-1 py-1 rounded text-[6px] border transition-all ${
                        selectedTabooKind === k.id
                          ? 'border-current text-white/80'
                          : 'border-white/[0.06] text-white/25 hover:border-white/15'
                      }`}
                      style={selectedTabooKind === k.id ? { borderColor: k.color + '80', background: k.color + '15' } : {}}
                    >
                      <div className="w-1 h-1 rounded-full mx-auto mb-0.5" style={{ background: k.color }} />
                      {k.label}
                    </button>
                  ))}
                </div>
              )}
              {tool === 'RITUAL' && (
                <div className="mt-1 space-y-0.5">
                  <div className="flex gap-0.5">
                    {RITUAL_KINDS.map(k => (
                      <button
                        key={k.id}
                        title={k.hint}
                        onClick={() => onRitualKindChange?.(k.id)}
                        className={`flex-1 py-1 rounded text-[6px] border transition-all ${
                          selectedRitualKind === k.id
                            ? 'border-current text-white/80'
                            : 'border-white/[0.06] text-white/25 hover:border-white/15'
                        }`}
                        style={selectedRitualKind === k.id ? { borderColor: k.color + '80', background: k.color + '15' } : {}}
                      >
                        <div className="w-1 h-1 rounded-full mx-auto mb-0.5" style={{ background: k.color }} />
                        {k.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-white/15 text-[6px] text-center">click a totem to bind</div>
                </div>
              )}
            </div>

            {/* ─── INSPECTOR ─── */}
            {selected && (
              <div className="px-3 py-2 border-b border-white/[0.04] shrink-0">
                {selected.type === 'totem' && (() => {
                  const t = totems.find(x => x.id === selected.id);
                  if (!t) return null;
                  const c = TOTEM_KINDS.find(k => k.id === t.kind);
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: c?.color }} />
                          <span className="text-white/60 text-[9px]">{t.name}</span>
                          <span className="text-white/20 text-[7px]">{t.kind}</span>
                          {t.emergent && <span className="text-cyan-300/40 text-[6px]">emergent</span>}
                        </div>
                        <button onClick={() => onRemoveTotem(t.id)} className="text-red-400/40 hover:text-red-400 p-0.5">
                          <Trash2 size={9} strokeWidth={1.5} />
                        </button>
                      </div>
                      <div className="text-white/20 text-[7px] italic">{c?.hint}</div>
                      <SliderRow label="Radius"   value={t.radius}   min={0.05} max={0.5} step={0.01} onChange={v => onEntityUpdate?.('totem', t.id, { radius: v })} />
                      <SliderRow label="Strength" value={t.strength} min={0.1}  max={2}   step={0.05} onChange={v => onEntityUpdate?.('totem', t.id, { strength: v })} />
                    </div>
                  );
                })()}
                {selected.type === 'taboo' && (() => {
                  const t = taboos.find(x => x.id === selected.id);
                  if (!t) return null;
                  const k = TABOO_KINDS.find(k => k.id === t.kind);
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: k?.color }} />
                          <span className="text-white/60 text-[9px]">{t.kind.replace('_', ' ')}</span>
                        </div>
                        <button onClick={() => onRemoveTaboo(t.id)} className="text-red-400/40 hover:text-red-400 p-0.5">
                          <Trash2 size={9} strokeWidth={1.5} />
                        </button>
                      </div>
                      <div className="text-white/20 text-[7px] italic">{k?.hint}</div>
                      <SliderRow label="Radius"    value={t.radius}    min={0.04} max={0.4} step={0.01} onChange={v => onEntityUpdate?.('taboo', t.id, { radius: v })} />
                      <SliderRow label="Intensity" value={t.intensity} min={0.1}  max={2}   step={0.05} onChange={v => onEntityUpdate?.('taboo', t.id, { intensity: v })} />
                    </div>
                  );
                })()}
                {selected.type === 'ritual' && (() => {
                  const r = rituals.find(x => x.id === selected.id);
                  if (!r) return null;
                  const totem = totems.find(t => t.id === r.totemId);
                  const k = RITUAL_KINDS.find(k => k.id === r.kind);
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: k?.color }} />
                          <span className="text-white/60 text-[9px]">{r.kind}</span>
                          {totem && <span className="text-white/20 text-[7px]">at {totem.name}</span>}
                        </div>
                        <button onClick={() => onRemoveRitual(r.id)} className="text-red-400/40 hover:text-red-400 p-0.5">
                          <Trash2 size={9} strokeWidth={1.5} />
                        </button>
                      </div>
                      <div className="text-white/20 text-[7px] italic">{k?.hint}</div>
                      <SliderRow label="Period"    value={r.periodSec} min={3} max={30} step={1} onChange={v => onEntityUpdate?.('ritual', r.id, { periodSec: v })} />
                      <SliderRow label="Intensity" value={r.intensity} min={0.1} max={2} step={0.05} onChange={v => onEntityUpdate?.('ritual', r.id, { intensity: v })} />
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ─── CULTURE / PRESTIGE ─── */}
            <div className="px-3 py-1.5 border-b border-white/[0.04]">
              <button
                onClick={() => setShowCulture(!showCulture)}
                className="w-full flex items-center justify-between text-white/35 text-[8px] uppercase tracking-wider hover:text-white/50 transition-colors"
              >
                <span>Culture &amp; Prestige</span>
                {showCulture ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>

              {showCulture && (
                <div className="mt-1.5 space-y-1.5">
                  {/* Meme palette preview */}
                  <div className="flex gap-0.5 items-center">
                    <span className="text-white/20 text-[7px] w-10 shrink-0">Memes</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: cultureConfig.memeCount }).map((_, m) => (
                        <div
                          key={m}
                          className="w-3 h-3 rounded-sm"
                          style={{ background: MEME_COLORS[m % MEME_COLORS.length] }}
                          title={`Meme #${m}${memeStats ? ': ' + (memeStats.memeCounts[m] || 0) + ' agents' : ''}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Prestige Leaders */}
                  {prestigeLeaders.length > 0 && (
                    <div className="space-y-0.5">
                      <div className="text-white/20 text-[7px] uppercase tracking-wider">Top Leaders</div>
                      {prestigeLeaders.slice(0, 5).map(leader => (
                        <div key={leader.idx} className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: MEME_COLORS[leader.memeId % MEME_COLORS.length] }} />
                          <span className="text-white/40 text-[7px] font-mono w-8 shrink-0">#{leader.idx}</span>
                          <span className="text-white/20 text-[6px] shrink-0">m{leader.memeId}</span>
                          <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{
                                width: `${leader.prestige * 100}%`,
                                background: MEME_COLORS[leader.memeId % MEME_COLORS.length],
                              }} />
                          </div>
                          <span className="text-[6px] font-mono text-white/35 w-6 text-right shrink-0">
                            {leader.prestige.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {prestigeLeaders.length === 0 && (
                    <div className="text-white/15 text-[7px] italic">prestige accumulating...</div>
                  )}

                  {/* Culture config: just 2 sliders */}
                  <SliderRow
                    label="Conv."
                    value={cultureConfig.convertRate}
                    min={0.05} max={0.5} step={0.05}
                    onChange={v => onCultureConfigChange?.({ convertRate: v })}
                  />
                  <SliderRow
                    label="Radius"
                    value={cultureConfig.convertRadius}
                    min={0.05} max={0.35} step={0.01}
                    onChange={v => onCultureConfigChange?.({ convertRadius: v })}
                  />
                </div>
              )}
            </div>

            {/* ─── ECONOMY ─── */}
            {economyConfig && (
              <div className="px-3 py-1.5 border-b border-white/[0.04]">
                <button
                  onClick={() => setShowEconomy(!showEconomy)}
                  className="w-full flex items-center justify-between text-white/35 text-[8px] uppercase tracking-wider hover:text-white/50 transition-colors"
                >
                  <span className="flex items-center gap-1">
                    <span style={{ color: '#34d399' }}>◆</span>
                    Economy
                    {!economyConfig.enabled && <span className="text-white/15 ml-1">(off)</span>}
                  </span>
                  {showEconomy ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>

                {showEconomy && (
                  <div className="mt-1.5 space-y-1.5">
                    {/* Metrics display */}
                    {economyConfig.enabled && economyMetrics && (
                      <div className="space-y-1 mb-2">
                        <EcoBar label="Mean Energy"  value={economyMetrics.meanEnergy}    color="#34d399" />
                        <EcoBar label="Inequality"   value={economyMetrics.gini}          color="#fbbf24"
                          alert={economyMetrics.gini > economyConfig.giniAlert} />
                        <EcoBar label="Scarcity"     value={economyMetrics.scarcityRatio} color="#f97316" />
                        <EcoBar label="Territory"    value={economyMetrics.territoryShare} color="#a78bfa" />
                        {economyMetrics.fatigueCount > 0 && (
                          <div className="text-orange-300/50 text-[7px]">
                            ⚡ {economyMetrics.fatigueCount} in fatigue
                          </div>
                        )}
                        {economyMetrics.famineConsecutive >= 3 && (
                          <div className="text-red-400/70 text-[7px] animate-pulse">☠ FAMINE</div>
                        )}
                      </div>
                    )}

                    {/* Enable toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-white/35 text-[7px]">Economy Engine</span>
                      <button
                        onClick={() => onEconomyConfigChange?.({ enabled: !economyConfig.enabled })}
                        className="text-[7px] px-2 py-0.5 rounded border transition-all"
                        style={{
                          borderColor: economyConfig.enabled ? '#34d39940' : '#ffffff20',
                          background:  economyConfig.enabled ? '#34d39915' : 'transparent',
                          color:       economyConfig.enabled ? '#34d399'   : '#ffffff40',
                        }}
                      >
                        {economyConfig.enabled ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    {/* 5 sliders — only show when enabled */}
                    {economyConfig.enabled && (<>
                      <SliderRow label="Metabol."   value={economyConfig.metabolism}      min={0.002} max={0.06}  step={0.002} onChange={v => onEconomyConfigChange?.({ metabolism: v })} />
                      <SliderRow label="Harvest"    value={economyConfig.resourceHarvest} min={0.01}  max={0.2}   step={0.01}  onChange={v => onEconomyConfigChange?.({ resourceHarvest: v })} />
                      <SliderRow label="Regen"      value={economyConfig.resourceRegen}   min={0.01}  max={0.15}  step={0.01}  onChange={v => onEconomyConfigChange?.({ resourceRegen: v })} />
                      <SliderRow label="Claim Gain" value={economyConfig.claimGain}       min={0.02}  max={0.4}   step={0.02}  onChange={v => onEconomyConfigChange?.({ claimGain: v })} />

                      {/* Mode toggle */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-white/25 text-[7px] w-14 shrink-0">Mode</span>
                        {(['STATIC', 'FIELD_DERIVED'] as const).map(m => (
                          <button key={m}
                            onClick={() => onEconomyConfigChange?.({ resourceMode: m })}
                            className="flex-1 py-0.5 rounded text-[6px] border transition-all"
                            style={{
                              borderColor: economyConfig.resourceMode === m ? '#34d39940' : '#ffffff15',
                              background:  economyConfig.resourceMode === m ? '#34d39915' : 'transparent',
                              color:       economyConfig.resourceMode === m ? '#34d399'   : '#ffffff30',
                            }}
                          >
                            {m === 'STATIC' ? 'Static' : 'Field'}
                          </button>
                        ))}
                      </div>
                    </>)}

                    {/* 3 preset buttons */}
                    <div className="pt-1 border-t border-white/[0.04]">
                      <div className="text-white/20 text-[6px] mb-1 uppercase tracking-wider">Presets</div>
                      <div className="space-y-0.5">
                        <PresetBtn
                          icon="📈" label="Market Scarcity"
                          hint="Metabolism ↑ · Regen ↓ — hotspot competition"
                          onClick={() => onEconomyPreset?.('market_scarcity')}
                        />
                        <PresetBtn
                          icon="⛩" label="Ritual Economy"
                          hint="Ritual costs energy → investment vs exhaustion"
                          onClick={() => onEconomyPreset?.('ritual_economy')}
                        />
                        <PresetBtn
                          icon="🏰" label="Fortress Taboo"
                          hint="ClaimGain ↑ + NO_ENTER near hotspot → inequality"
                          onClick={() => onEconomyPreset?.('fortress_taboo')}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── ENTITIES ─── */}
            <div className="px-3 py-1.5 border-b border-white/[0.04]">
              <button
                onClick={() => setShowEntities(!showEntities)}
                className="w-full flex items-center justify-between text-white/30 text-[8px] uppercase tracking-wider hover:text-white/50 transition-colors"
              >
                <span>Entities ({totems.length + taboos.length + rituals.length})</span>
                {showEntities ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
              {showEntities && (
                <div className="mt-1 space-y-0.5 max-h-32 overflow-auto">
                  {totems.map(t => {
                    const c = TOTEM_KINDS.find(k => k.id === t.kind);
                    return (
                      <EntityRow key={t.id} color={c?.color || '#fff'}
                        label={t.name} sub={t.kind} emergent={!!t.emergent}
                        selected={selected?.type === 'totem' && selected.id === t.id}
                        onClick={() => onSelectEntity({ type: 'totem', id: t.id })}
                        onRemove={() => onRemoveTotem(t.id)} />
                    );
                  })}
                  {taboos.map(t => (
                    <EntityRow key={t.id} color={TABOO_KINDS.find(k => k.id === t.kind)?.color || '#f00'}
                      label={t.kind.replace('_', ' ')} sub={t.targetType !== undefined ? `type ${t.targetType}` : ''}
                      emergent={!!t.emergent}
                      selected={selected?.type === 'taboo' && selected.id === t.id}
                      onClick={() => onSelectEntity({ type: 'taboo', id: t.id })}
                      onRemove={() => onRemoveTaboo(t.id)} />
                  ))}
                  {rituals.map(r => {
                    const totem = totems.find(t => t.id === r.totemId);
                    return (
                      <EntityRow key={r.id} color={RITUAL_KINDS.find(k => k.id === r.kind)?.color || '#0f0'}
                        label={r.kind} sub={totem ? `at ${totem.name}` : ''} emergent={!!r.emergent}
                        selected={selected?.type === 'ritual' && selected.id === r.id}
                        onClick={() => onSelectEntity({ type: 'ritual', id: r.id })}
                        onRemove={() => onRemoveRitual(r.id)} />
                    );
                  })}
                  {totems.length + taboos.length + rituals.length === 0 && (
                    <div className="text-white/15 text-[7px] italic py-1">no entities yet</div>
                  )}
                </div>
              )}
            </div>

            {/* ─── PRESETS ─── */}
            {onLoadPreset && (
              <div className="px-3 py-1.5 border-b border-white/[0.04]">
                <button
                  onClick={() => setShowPresets(!showPresets)}
                  className="w-full flex items-center justify-between text-white/30 text-[8px] uppercase tracking-wider hover:text-white/50 transition-colors"
                >
                  <span>Scenarios ({SOCIOGENESIS_PRESETS.length})</span>
                  {showPresets ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
                {showPresets && (
                  <div className="mt-1 space-y-0.5 max-h-56 overflow-auto">
                    {SOCIOGENESIS_PRESETS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { onLoadPreset(p.id); setShowPresets(false); }}
                        className="w-full flex items-start gap-2 px-2 py-1.5 rounded bg-white/[0.02] border border-white/[0.06] hover:border-purple-400/30 hover:bg-purple-500/5 transition-all text-left"
                      >
                        <span className="text-sm shrink-0">{p.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[8px] text-white/70">{p.name}</div>
                          <div className="text-[7px] text-white/25 mt-0.5 leading-tight truncate">{p.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── CHRONICLE ─── */}
            <div className="px-3 py-1.5 border-b border-white/[0.04]">
              <button
                onClick={() => setShowChronicle(!showChronicle)}
                className="w-full flex items-center justify-between text-white/30 text-[8px] uppercase tracking-wider hover:text-white/50 transition-colors"
              >
                <span>Chronicle ({chronicle.length})</span>
                {showChronicle ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
              {showChronicle && (
                <div className="mt-1 space-y-0.5 max-h-40 overflow-auto">
                  {chronicle.slice(0, 15).map((entry, i) => (
                    <div key={i} className="text-[7px] text-white/35 leading-relaxed group relative">
                      <div className="flex gap-1 items-start">
                        <span className="text-white/50 shrink-0 mt-0.5">{entry.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{entry.message}</div>
                          {/* Expandable cause on hover — show via title */}
                          <div className="text-white/20 text-[6px] truncate">{entry.cause}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {chronicle.length === 0 && (
                    <div className="text-white/15 text-[7px] italic">waiting for emergence…</div>
                  )}
                </div>
              )}
            </div>

            {/* ─── SYMBOL LEGEND ─── */}
            <div className="px-3 py-1.5 border-b border-white/[0.04]">
              <button
                onClick={() => setShowLegend(!showLegend)}
                className="w-full flex items-center justify-between text-white/25 text-[8px] uppercase tracking-wider hover:text-white/40 transition-colors"
              >
                <span>Symbol Legend</span>
                {showLegend ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
              {showLegend && (
                <div className="mt-1 space-y-0.5 max-h-52 overflow-auto">
                  {SYMBOL_LEGEND.map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5 py-0.5">
                      <span className="text-[11px] shrink-0 mt-0.5">{item.icon}</span>
                      <div>
                        <div className="text-white/50 text-[7px]">{item.label}</div>
                        <div className="text-white/20 text-[6px]">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── ADVANCED (collapsed by default) ─── */}
            <div className="px-3 py-1.5">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-white/25 text-[8px] uppercase tracking-wider hover:text-white/40 transition-colors"
              >
                <span>Advanced</span>
                {showAdvanced ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
              {showAdvanced && (
                <div className="mt-2 space-y-2">
                  <ToggleRow label="Auto Emergence" hint="Institutions emerge from behavior"
                    value={config.autoEmergence}
                    onChange={() => onConfigChange({ autoEmergence: !config.autoEmergence })} />

                  <SliderRow label="Influence" value={config.influenceGain} min={0} max={0.5} step={0.01}
                    onChange={v => onConfigChange({ influenceGain: v })} />
                  <SliderRow label="Speed" value={config.simSpeed || 1} min={0.25} max={2} step={0.25}
                    onChange={v => onConfigChange({ simSpeed: v })} />
                  <SliderRow label="Cadence" value={config.cadenceSec} min={1} max={15} step={1}
                    onChange={v => onConfigChange({ cadenceSec: v })} suffix="s" />

                  <SliderRow label="Meme Count" value={cultureConfig.memeCount} min={2} max={8} step={1}
                    onChange={v => onCultureConfigChange?.({ memeCount: v })} />
                  <SliderRow label="Conv. Cooldown" value={cultureConfig.convertCooldownSec} min={2} max={20} step={1}
                    onChange={v => onCultureConfigChange?.({ convertCooldownSec: v })} suffix="s" />

                  <div className="flex gap-1 mt-1">
                    <SmallToggle label="Symbols" active={state.overlay.show}
                      onClick={() => onOverlayChange({ show: !state.overlay.show })} />
                    <SmallToggle label="Norms" active={state.overlay.showNorms}
                      onClick={() => onOverlayChange({ showNorms: !state.overlay.showNorms })} />
                    <SmallToggle label="Tribes" active={state.overlay.showTribes}
                      onClick={() => onOverlayChange({ showTribes: !state.overlay.showTribes })} />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ───

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-white/20 text-[7px] w-14 shrink-0">{label}</span>
      <div className="flex-1 h-px bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value * 100}%`, background: color }} />
      </div>
      <span className="text-[7px] font-mono w-6 text-right shrink-0" style={{ color }}>{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

function EntityRow({ color, label, sub, emergent, selected, onClick, onRemove }: {
  color: string; label: string; sub: string; emergent: boolean;
  selected: boolean; onClick: () => void; onRemove: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded cursor-pointer group border transition-all ${
        selected ? 'bg-white/5 border-white/15' : 'border-transparent hover:bg-white/[0.02]'
      }`}
    >
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-white/45 text-[7px] flex-1 truncate">{label}</span>
      {sub && <span className="text-white/18 text-[6px] shrink-0">{sub}</span>}
      {emergent && <span className="text-cyan-300/25 text-[6px]">e</span>}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="opacity-0 group-hover:opacity-100 text-red-400/40 hover:text-red-400 transition-all p-0.5"
      >
        <Trash2 size={7} strokeWidth={1.5} />
      </button>
    </div>
  );
}

function SliderRow({ label, value, min, max, step, onChange, suffix }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/25 text-[7px] w-14 shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))} className={`flex-1 ${slider}`} />
      <span className="text-white/40 text-[7px] font-mono w-8 text-right shrink-0">
        {Number.isInteger(step) ? value : value.toFixed(2)}{suffix || ''}
      </span>
    </div>
  );
}

function ToggleRow({ label, hint, value, onChange }: {
  label: string; hint: string; value: boolean; onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-white/45 text-[8px]">{label}</div>
        <div className="text-white/18 text-[7px]">{hint}</div>
      </div>
      <button
        onClick={onChange}
        className={`w-7 h-3.5 rounded-full transition-all ${
          value ? 'bg-cyan-500/50 border-cyan-400/40' : 'bg-white/5 border-white/10'
        } border flex items-center px-0.5`}
      >
        <div className={`w-2.5 h-2.5 rounded-full bg-white/80 transition-transform ${
          value ? 'translate-x-3' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
}

function SmallToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex-1 px-1 py-0.5 rounded text-[6px] border transition-all ${
        active
          ? 'bg-green-500/10 border-green-400/30 text-green-300/60'
          : 'bg-white/[0.02] border-white/[0.06] text-white/20'
      }`}
    >
      {label}
    </button>
  );
}

function EcoBar({ label, value, color, alert }: {
  label: string; value: number; color: string; alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-white/20 text-[7px] w-16 shrink-0">{label}</span>
      <div className="flex-1 h-px rounded-full overflow-hidden" style={{ background: '#ffffff15' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, value * 100)}%`, background: alert ? '#ef4444' : color }}
        />
      </div>
      <span className="text-[7px] font-mono w-7 text-right shrink-0"
        style={{ color: alert ? '#ef4444' : color }}>
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function PresetBtn({ icon, label, hint, onClick }: {
  icon: string; label: string; hint: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.02] border border-white/[0.06] hover:border-emerald-400/25 hover:bg-emerald-500/5 transition-all text-left"
    >
      <span className="text-sm shrink-0">{icon}</span>
      <div>
        <div className="text-[7px] text-white/55">{label}</div>
        <div className="text-[6px] text-white/20 leading-tight">{hint}</div>
      </div>
    </button>
  );
}