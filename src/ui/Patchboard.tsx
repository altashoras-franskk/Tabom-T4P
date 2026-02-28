import React from 'react';
import { MicroConfig } from '../sim/micro/microState';
import { FieldConfig } from '../sim/field/fieldState';
import { ReconfigConfig } from '../sim/reconfig/reconfigState';
import { CREATIVE_PRESETS, FEATURED_PRESETS } from '../sim/presets/creativePalette';
import { PALETTES } from '../render/palette';
import { LifeConfig } from '../sim/life/lifeConfig';
import { LifeStats } from '../sim/life/lifeStats';
import { SigilConfig } from '../sim/sigils/sigilState';
import { ArchetypeArtifact } from '../sim/sigils/archetypeDetector';

const MONO = "'IBM Plex Mono', monospace";

interface PatchboardProps {
  microConfig: MicroConfig;
  fieldConfig: FieldConfig;
  reconfigConfig: ReconfigConfig;
  targetParticleCount: number;
  onMicroChange: (config: Partial<MicroConfig>) => void;
  onFieldChange: (config: Partial<FieldConfig>) => void;
  onReconfigChange: (config: Partial<ReconfigConfig>) => void;
  onTargetParticleCountChange: (value: number) => void;
  onRandomizeAll?: () => void;
  // PATCH 04.5: Life system
  life?: LifeConfig;
  onLifeChange?: (config: Partial<LifeConfig>) => void;
  lifeStats?: LifeStats;
  // G) Render aesthetics
  pointSize?: number;
  fadeFactor?: number;
  glowIntensity?: number;
  paletteIndex?: number;
  onPointSizeChange?: (value: number) => void;
  onFadeFactorChange?: (value: number) => void;
  onGlowIntensityChange?: (value: number) => void;
  onPaletteIndexChange?: (value: number) => void;
  onBackgroundClick?: () => void;
  // Visual toggles
  trails?: boolean;
  fieldHeatmap?: boolean;
  onToggleTrails?: () => void;
  onToggleFieldHeatmap?: () => void;
  // Clusters-style recipes
  onApplyRecipe?: (recipe: string) => void;
  onNewUniverse?: () => void;
  onChaosSeed?: () => void;
  // Creative presets
  onLoadPreset?: (presetId: string) => void;
  renderMode?: 'dots' | 'streaks';
  streakLength?: number;
  onRenderModeChange?: (mode: 'dots' | 'streaks') => void;
  onStreakLengthChange?: (value: number) => void;
  // Performance
  simQuality?: 'FAST' | 'HIGH' | 'ULTRA';
  dotSize?: number;
  onSimQualityChange?: (quality: 'FAST' | 'HIGH' | 'ULTRA') => void;
  onDotSizeChange?: (value: number) => void;
  // Spawn pattern
  spawnPattern?: string;
  onSpawnPatternChange?: (pattern: string) => void;
  // Bonds & Trails overlay
  showBonds?: boolean;
  bondsDistance?: number;
  bondsOpacity?: number;
  showTrails?: boolean;
  trailsLength?: number;
  trailsOpacity?: number;
  onShowBondsChange?: (value: boolean) => void;
  onBondsDistanceChange?: (value: number) => void;
  onBondsOpacityChange?: (value: number) => void;
  onShowTrailsChange?: (value: boolean) => void;
  onTrailsLengthChange?: (value: number) => void;
  onTrailsOpacityChange?: (value: number) => void;
  // PATCH 04.5-SIGILS: Archetype detection system
  sigilConfig?: SigilConfig;
  onSigilConfigChange?: (cfg: Partial<SigilConfig>) => void;
  archetypesDetected?: ArchetypeArtifact[];
  onClearSigils?: () => void;
  /** If true, hide core algo sliders to avoid redundancy with ComplexityPanel. */
  hideCoreControls?: boolean;
}

const Knob: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
}> = ({ label, value, min, max, step, onChange, unit }) => {
  // Safety check for undefined values
  const safeValue = value ?? min ?? 0;
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;
  const pct = ((safeValue - min) / (max - min)) * 100;
  
  return (
    <div className="flex flex-col gap-1 group">
      <div className="flex items-baseline justify-between">
        <label style={{
          fontFamily: MONO,
          fontSize: '9px',
          fontWeight: 200,
          letterSpacing: '0.5px',
          color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase',
        }}>{label}</label>
        <span style={{
          fontFamily: MONO,
          fontSize: '9px',
          fontWeight: 300,
          color: 'rgba(255,255,255,0.5)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {safeValue.toFixed(decimals)}{unit}
        </span>
      </div>
      <div className="relative h-3 flex items-center">
        <div className="absolute left-0 right-0 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="absolute left-0 h-px" style={{ width: `${pct}%`, background: 'rgba(255,212,0,0.3)' }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeValue}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute w-full h-3 appearance-none cursor-pointer bg-transparent
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-1.5
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:bg-white/50
            [&::-webkit-slider-thumb]:transition-colors
            [&::-moz-range-thumb]:w-1.5
            [&::-moz-range-thumb]:h-3
            [&::-moz-range-thumb]:bg-white/50
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:transition-colors"
          style={{ zIndex: 1 }}
        />
      </div>
    </div>
  );
};

export const Patchboard: React.FC<PatchboardProps> = ({
  microConfig,
  fieldConfig,
  reconfigConfig,
  targetParticleCount,
  onMicroChange,
  onFieldChange,
  onReconfigChange,
  onTargetParticleCountChange,
  onRandomizeAll,
  life,
  onLifeChange,
  lifeStats,
  pointSize = 4.0,
  fadeFactor = 0.92,
  glowIntensity = 0.5,
  paletteIndex = 0,
  onPointSizeChange,
  onFadeFactorChange,
  onGlowIntensityChange,
  onPaletteIndexChange,
  trails = true,
  fieldHeatmap = false,
  onToggleTrails,
  onToggleFieldHeatmap,
  onApplyRecipe,
  onNewUniverse,
  onChaosSeed,
  onLoadPreset,
  renderMode = 'dots',
  streakLength = 8.0,
  onRenderModeChange,
  onStreakLengthChange,
  simQuality = 'HIGH',
  dotSize = 2.0,
  onSimQualityChange,
  onDotSizeChange,
  spawnPattern = 'random',
  onSpawnPatternChange,
  onBackgroundClick,
  showBonds = false,
  bondsDistance = 0.07,
  bondsOpacity = 0.10,
  showTrails = false,
  trailsLength = 20,
  trailsOpacity = 0.6,
  onShowBondsChange,
  onBondsDistanceChange,
  onBondsOpacityChange,
  onShowTrailsChange,
  onTrailsLengthChange,
  onTrailsOpacityChange,
  sigilConfig,
  onSigilConfigChange,
  archetypesDetected,
  onClearSigils,
  hideCoreControls = false,
}) => {
  return (
    <div className="space-y-6">
      {/* Header - Descricao do Motor */}
      <div className="space-y-2 pb-3" style={{ borderBottom: '1px dashed rgba(255,255,255,0.08)' }}>
        <h2 style={{
          fontFamily: "'Doto', monospace",
          fontSize: '11px',
          fontWeight: 400,
          letterSpacing: '0.1em',
          color: '#ffd400',
          textTransform: 'uppercase',
        }}>
          {'\u{1F71B}'} Algoritmo
        </h2>
        <p style={{
          fontFamily: MONO,
          fontSize: '9px',
          fontWeight: 200,
          color: 'rgba(255,255,255,0.35)',
          lineHeight: 1.4,
        }}>
          Motor central do MetaLifeLab. Controle a fisica, quimica e estetica do universo.
        </p>
      </div>

      {/* Ecosystem Controls */}
      {(onApplyRecipe || onNewUniverse || onChaosSeed || onSpawnPatternChange) && (
        <>
          <div className="space-y-3">
            <h3 style={{ fontFamily: "'Doto', monospace", fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: 5, borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
              Ecossistema
            </h3>
            <p className="text-white/30 text-[9px] font-light italic leading-relaxed">
              Gere universos com o sistema WorldDNA
            </p>
            
            {onSpawnPatternChange && (
              <div>
                <label className="text-white/40 text-[9px] tracking-wide uppercase font-light block mb-1.5">
                  Padrão Inicial
                </label>
                <select
                  value={spawnPattern}
                  onChange={(e) => onSpawnPatternChange(e.target.value)}
                  style={{ fontFamily: MONO, fontSize: 10, border: '1px dashed rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.55)', padding: '5px 8px' }}
                  className="w-full focus:outline-none transition-colors"
                >
                  <optgroup label="Básicos" className="bg-black">
                    <option value="random" className="bg-black">Random Chaos</option>
                    <option value="center_cluster" className="bg-black">Center Cluster</option>
                    <option value="grid" className="bg-black">Grid</option>
                    <option value="perimeter" className="bg-black">Perimeter</option>
                  </optgroup>
                  <optgroup label="Circulares" className="bg-black">
                    <option value="ring" className="bg-black">Ring</option>
                    <option value="concentric_rings" className="bg-black">Concentric Rings</option>
                    <option value="spiral" className="bg-black">Spiral</option>
                    <option value="vortex" className="bg-black">Vortex</option>
                  </optgroup>
                  <optgroup label="Geométricos" className="bg-black">
                    <option value="triangle" className="bg-black">Triangle</option>
                    <option value="cross" className="bg-black">Cross</option>
                    <option value="checkerboard" className="bg-black">Checkerboard</option>
                    <option value="corners" className="bg-black">Four Corners</option>
                  </optgroup>
                  <optgroup label="Bandas" className="bg-black">
                    <option value="vertical_bands" className="bg-black">Vertical Bands</option>
                    <option value="horizontal_bands" className="bg-black">Horizontal Bands</option>
                  </optgroup>
                  <optgroup label="Especiais" className="bg-black">
                    <option value="two_clusters" className="bg-black">Two Clusters</option>
                    <option value="double_helix" className="bg-black">Double Helix</option>
                    <option value="sunburst" className="bg-black">Sunburst</option>
                    <option value="wave" className="bg-black">Wave</option>
                    <option value="fractal_dust" className="bg-black">Fractal Dust</option>
                    <option value="yin_yang" className="bg-black">Yin Yang</option>
                  </optgroup>
                </select>
              </div>
            )}
            
            {(onNewUniverse || onChaosSeed) && (
              <div className="grid grid-cols-2 gap-1.5">
                {onNewUniverse && (
                  <button
                    onClick={onNewUniverse}
                    className="text-[10px] py-1.5 px-2 transition-all uppercase" style={{ border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}
                  >
                    Novo Universo
                  </button>
                )}
                {onChaosSeed && (
                  <button
                    onClick={onChaosSeed}
                    className="text-[10px] py-1.5 px-2 transition-all uppercase" style={{ border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}
                  >
                    Semente do Caos
                  </button>
                )}
              </div>
            )}
            
            {onApplyRecipe && (
              <div>
                <label className="text-white/40 text-[9px] tracking-wide uppercase font-light block mb-1.5">
                  Receitas
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => onApplyRecipe('pollock')}
                    className="text-[10px] py-1.5 px-2 transition-all uppercase" style={{ border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)', fontFamily: "'IBM Plex Mono', monospace" }}
                    title="Chaotic streaking patterns"
                  >
                    Pollock
                  </button>
                  <button
                    onClick={() => onApplyRecipe('mitosis')}
                    className="text-[10px] py-1.5 px-2 transition-all uppercase" style={{ border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)', fontFamily: "'IBM Plex Mono', monospace" }}
                    title="Self-dividing clusters"
                  >
                    Mitosis
                  </button>
                  <button
                    onClick={() => onApplyRecipe('alliances')}
                    className="text-[10px] py-1.5 px-2 transition-all uppercase" style={{ border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)', fontFamily: "'IBM Plex Mono', monospace" }}
                    title="Symbiotic coalitions"
                  >
                    Alliances
                  </button>
                  <button
                    onClick={() => onApplyRecipe('planets')}
                    className="text-[10px] py-1.5 px-2 transition-all uppercase" style={{ border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)', fontFamily: "'IBM Plex Mono', monospace" }}
                    title="Orbital ring structures"
                  >
                    Planets
                  </button>
                  <button
                    onClick={() => onApplyRecipe('field')}
                    className="text-[10px] py-1.5 px-2 transition-all uppercase" style={{ border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)', fontFamily: "'IBM Plex Mono', monospace" }}
                    title="Sparse high-energy field"
                  >
                    Field
                  </button>
                  <button
                    onClick={() => onApplyRecipe('gems')}
                    className="text-[10px] py-1.5 px-2 transition-all uppercase" style={{ border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)', fontFamily: "'IBM Plex Mono', monospace" }}
                    title="Dense crystalline clusters"
                  >
                    Gems
                  </button>
                  <button
                    onClick={() => onApplyRecipe('drift')}
                    className="text-[10px] py-1.5 px-2 transition-all uppercase" style={{ border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)', fontFamily: "'IBM Plex Mono', monospace" }}
                    title="Flowing sparse patterns"
                  >
                    Drift
                  </button>
                  <button
                    onClick={() => onApplyRecipe('simplify')}
                    className="text-[10px] py-1.5 px-2 transition-all uppercase" style={{ border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)', fontFamily: "'IBM Plex Mono', monospace" }}
                    title="Minimal stable structures"
                  >
                    Simplify
                  </button>
                  <button
                    onClick={() => onApplyRecipe('darwin')}
                    className="text-[10px] py-1.5 px-2 transition-all uppercase" style={{ border: '1px dashed rgba(16,212,91,0.20)', color: 'rgba(16,212,91,0.70)', fontFamily: "'IBM Plex Mono', monospace" }}
                    title="Evolution with mutations and adaptations"
                  >
                    Darwin
                  </button>
                </div>
              </div>
            )}
            
            {/* Featured Presets — cards with description + tags */}
            {onLoadPreset && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-white/50 text-[9px] tracking-wide uppercase font-light">
                    ✦ Featured ({FEATURED_PRESETS.length})
                  </label>
                </div>
                {/* Category labels */}
                {(['stable', 'living', 'wild'] as const).map(cat => {
                  const catPresets = FEATURED_PRESETS.filter(p => p.category === cat);
                  const catLabel = cat === 'stable' ? '◆ Stable Forms' : cat === 'living' ? '◉ Living Systems' : '◈ Wild / Oracle';
                  const catColor = cat === 'stable' ? 'text-cyan-400/70' : cat === 'living' ? 'text-green-400/70' : 'text-purple-400/70';
                  const catBorder = cat === 'stable' ? 'border-cyan-500/20 hover:border-cyan-500/40' : cat === 'living' ? 'border-green-500/20 hover:border-green-500/40' : 'border-purple-500/20 hover:border-purple-500/40';
                  return (
                    <div key={cat} className="space-y-1">
                      <div className={`text-[8px] tracking-widest uppercase font-light ${catColor} pl-0.5`}>{catLabel}</div>
                      {catPresets.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => onLoadPreset(preset.id)}
                          className={`w-full border ${catBorder} text-white/60 hover:text-white/90 text-left py-2 px-2.5 transition-all group`}
                        >
                          <div className="flex items-baseline justify-between gap-1">
                            <span className="text-[10px] font-medium text-white/80">{preset.name}</span>
                            <span className="text-[8px] text-white/25 font-mono shrink-0">{preset.particleCount}p/{preset.typesCount}t</span>
                          </div>
                          <div className="text-[8px] text-white/40 leading-tight mt-0.5 line-clamp-2">{preset.description}</div>
                          {preset.tags && (
                            <div className="flex flex-wrap gap-0.5 mt-1">
                              {preset.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-[7px] px-1 py-px bg-white/5 text-white/30 border border-white/[0.06]">{tag}</span>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                })}

                {/* All Presets — compact grid */}
                <details className="group">
                  <summary className="cursor-pointer text-white/30 text-[9px] tracking-wide uppercase font-light py-1 hover:text-white/50 transition-colors select-none">
                    ▶ All Presets ({CREATIVE_PRESETS.length - FEATURED_PRESETS.length} more)
                  </summary>
                  <div className="mt-1.5 grid grid-cols-2 gap-1 max-h-[300px] overflow-y-auto pr-1
                    [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-white/5
                    [&::-webkit-scrollbar-thumb]:bg-white/20">
                    {CREATIVE_PRESETS.filter(p => !FEATURED_PRESETS.find(f => f.id === p.id)).map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => onLoadPreset(preset.id)}
                        className="text-white/50 hover:text-white/80 text-[9px] py-1.5 px-2 transition-all text-left" style={{ border: '1px dashed rgba(255,255,255,0.05)', fontFamily: "'IBM Plex Mono', monospace" }}
                        title={preset.description}
                      >
                        <div className="truncate font-medium">{preset.name}</div>
                        <div className="text-[7px] text-white/25 mt-0.5">{preset.typesCount} types</div>
                      </button>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
          
          <div className="h-px bg-white/[0.04]" />
        </>
      )}

      {/* Randomize All */}
      {onRandomizeAll && (
        <>
          <div>
            <button
              onClick={onRandomizeAll}
              className="w-full text-[10px] py-2 px-2 transition-all uppercase" style={{ border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}
            >
              Aleatorizar Tudo
            </button>
          </div>
          <div className="h-px bg-white/[0.04]" />
        </>
      )}

      {/* Visual Controls */}
      <div className="space-y-3">
        <h3 className="text-[10px] uppercase pb-1.5" style={{ fontFamily: "'Doto', monospace", color: 'rgba(255,255,255,0.50)', letterSpacing: '0.08em', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
          Visual
        </h3>
        
        {onToggleTrails && (
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              id="enableTrails"
              checked={trails}
              onChange={onToggleTrails}
              className="w-2.5 h-2.5 bg-transparent border border-white/15 checked:bg-white/20 cursor-pointer"
            />
            <label htmlFor="enableTrails" className="text-white/40 text-[10px] font-light cursor-pointer uppercase tracking-wide">
              Rastros (Trails)
            </label>
          </div>
        )}
        
        {onToggleFieldHeatmap && (
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              id="enableFieldHeatmap"
              checked={fieldHeatmap}
              onChange={onToggleFieldHeatmap}
              className="w-2.5 h-2.5 bg-transparent border border-white/15 checked:bg-white/20 cursor-pointer"
            />
            <label htmlFor="enableFieldHeatmap" className="text-white/40 text-[10px] font-light cursor-pointer uppercase tracking-wide">
              Campo (Heatmap)
            </label>
          </div>
        )}
      </div>

      <div className="h-px bg-white/[0.04]" />

      {/* Population */}
      <div className="space-y-3">
        <h3 className="text-[10px] uppercase pb-1.5" style={{ fontFamily: "'Doto', monospace", color: 'rgba(255,255,255,0.50)', letterSpacing: '0.08em', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
          População
        </h3>
        <Knob
          label="Agentes"
          value={targetParticleCount}
          min={100}
          max={5000}
          step={100}
          onChange={onTargetParticleCountChange}
        />
        <Knob
          label="Espécies"
          value={microConfig.typesCount}
          min={2}
          max={16}
          step={1}
          onChange={(v) => onMicroChange({ typesCount: v })}
        />
        
        <div className="flex items-center gap-1.5 pt-1">
          <input
            type="checkbox"
            id="foodEnabled"
            checked={microConfig.foodEnabled}
            onChange={(e) => onMicroChange({ foodEnabled: e.target.checked })}
            className="w-2.5 h-2.5 bg-transparent border border-white/15 checked:bg-white/20 cursor-pointer"
          />
          <label htmlFor="foodEnabled" className="text-white/40 text-[10px] font-light cursor-pointer uppercase tracking-wide">
            Ativar Partículas de Alimento
          </label>
        </div>
        
        {microConfig.foodEnabled && (
          <Knob
            label="Proporção de Alimento"
            value={microConfig.foodRatio}
            min={0.05}
            max={0.5}
            step={0.05}
            onChange={(v) => onMicroChange({ foodRatio: v })}
            unit="%"
          />
        )}
      </div>

      <div className="h-px bg-white/[0.04]" />

      {/* Physics */}
      {!hideCoreControls && (
      <div className="space-y-3">
        <h3 className="text-[10px] uppercase pb-1.5" style={{ fontFamily: "'Doto', monospace", color: 'rgba(255,255,255,0.50)', letterSpacing: '0.08em', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
          Física
        </h3>
        
        <div className="flex items-center gap-1.5">
          <input
            type="checkbox"
            id="wrapBoundaries"
            checked={microConfig.wrap}
            onChange={(e) => onMicroChange({ wrap: e.target.checked })}
            className="w-2.5 h-2.5 bg-transparent border border-white/15 checked:bg-white/20 cursor-pointer"
          />
          <label htmlFor="wrapBoundaries" className="text-white/40 text-[10px] font-light cursor-pointer uppercase tracking-wide">
            {microConfig.wrap ? 'Universo Infinito (Wrap)' : 'Bordas Fechadas'}
          </label>
        </div>
        
        <Knob
          label="Alcance de Interação"
          value={microConfig.rmax}
          min={0.1}
          max={0.5}
          step={0.01}
          onChange={(v) => onMicroChange({ rmax: v })}
        />
        <Knob
          label="Ganho de Força"
          value={microConfig.force}
          min={0.2}
          max={4.0}
          step={0.1}
          onChange={(v) => onMicroChange({ force: v })}
        />
        <Knob
          label="Arrasto (Viscosidade)"
          value={microConfig.drag}
          min={0.1}
          max={5.0}
          step={0.1}
          onChange={(v) => onMicroChange({ drag: v })}
        />
        <Knob
          label="Limite de Velocidade"
          value={microConfig.speedClamp}
          min={0.02}
          max={0.5}
          step={0.01}
          onChange={(v) => onMicroChange({ speedClamp: v })}
        />
        <Knob
          label="Entropia (Caos)"
          value={microConfig.entropy}
          min={0}
          max={1.0}
          step={0.01}
          onChange={(v) => onMicroChange({ entropy: v })}
        />
        <Knob
          label="Repulsão Central (Beta)"
          value={microConfig.beta}
          min={0.05}
          max={0.95}
          step={0.01}
          onChange={(v) => onMicroChange({ beta: v })}
        />
      </div>
      )}

      <div className="h-px bg-white/[0.04]" />

      {/* Metamorfose / Mutações */}
      {/* PATCH 04.5: SISTEMA VIDA (Unificado) */}
      {!hideCoreControls && life && onLifeChange && (
        <div className="space-y-3">
          <h3 className="text-[10px] uppercase pb-1.5" style={{ fontFamily: "'Doto', monospace", color: 'rgba(255,255,255,0.50)', letterSpacing: '0.08em', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
            VIDA (4.5)
          </h3>
          
          <p className="text-white/30 text-[9px] font-light italic leading-relaxed">
            Sistema unificado de energia, mutação e evolução
          </p>
          
          {/* Modo */}
          <div>
            <label className="text-white/40 text-[9px] tracking-wide uppercase font-light block mb-1.5">
              Modo
            </label>
            <select
              value={life.mode}
              onChange={(e) => onLifeChange({ mode: e.target.value as any })}
              className="w-full text-white/70 text-[10px] py-1.5 px-2 focus:outline-none transition-colors" style={{ background: 'rgba(0,0,0,0.4)', border: '1px dashed rgba(255,255,255,0.08)', fontFamily: "'IBM Plex Mono', monospace" }}
            >
              <option value="OFF">OFF (Estático)</option>
              <option value="METABOLIC">METABÓLICO (Apenas energia)</option>
              <option value="EVOLUTIVE">EVOLUTIVO (Apenas mutação)</option>
              <option value="FULL">COMPLETO (Todos os sistemas)</option>
            </select>
          </div>
          
          {/* Sistema de Comida */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                id="foodEnabled"
                checked={life.foodEnabled}
                onChange={(e) => onLifeChange({ foodEnabled: e.target.checked })}
                className="w-2.5 h-2.5 bg-transparent border border-white/15 checked:bg-white/20 cursor-pointer"
              />
              <label htmlFor="foodEnabled" className="text-white/40 text-[10px] font-light cursor-pointer uppercase tracking-wide">
                Comida Ativada
              </label>
            </div>
            
            {life.foodEnabled && (
              <Knob
                label="Proporção de Comida"
                value={life.foodRatio}
                min={0.05}
                max={0.5}
                step={0.05}
                onChange={(v) => onLifeChange({ foodRatio: v })}
              />
            )}
          </div>
          
          {/* Sistema de Energia */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                id="energyEnabled"
                checked={life.energyEnabled}
                onChange={(e) => onLifeChange({ energyEnabled: e.target.checked })}
                className="w-2.5 h-2.5 bg-transparent border border-white/15 checked:bg-white/20 cursor-pointer"
              />
              <label htmlFor="energyEnabled" className="text-white/40 text-[10px] font-light cursor-pointer uppercase tracking-wide">
                Energia Ativada
              </label>
            </div>
            
            {life.energyEnabled && (
              <>
                <Knob
                  label="Decaimento de Energia"
                  value={life.energyDecay}
                  min={0.0001}
                  max={0.01}
                  step={0.0001}
                  onChange={(v) => onLifeChange({ energyDecay: v })}
                />
                <Knob
                  label="Taxa de Alimentação"
                  value={life.energyFeedRate}
                  min={0.01}
                  max={0.2}
                  step={0.01}
                  onChange={(v) => onLifeChange({ energyFeedRate: v })}
                />
                <Knob
                  label="Limiar de Reprodução"
                  value={life.energyReproThreshold}
                  min={1.5}
                  max={3.0}
                  step={0.1}
                  onChange={(v) => onLifeChange({ energyReproThreshold: v })}
                />
              </>
            )}
          </div>
          
          {/* Controle de Mutação (controle unificado) */}
          <div className="space-y-2">
            <Knob
              label="Dial de Mutação"
              value={life.mutationDial}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => onLifeChange({ mutationDial: v })}
            />
            
            {/* Valores derivados (somente leitura) */}
            <div className="space-y-0.5 p-2 bg-white/[0.02]" style={{ border: '1px dashed rgba(255,255,255,0.04)' }}>
              <div className="flex justify-between text-[9px]">
                <span className="text-white/30">Taxa de Mutação:</span>
                <span className="text-white/60 font-mono">{life.mutationRate.toFixed(5)}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-white/30">Estabilidade de Tipo:</span>
                <span className="text-white/60 font-mono">{life.typeStability.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-white/30">Intensidade de Mutação:</span>
                <span className="text-white/60 font-mono">{life.mutationAmount.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-white/30">Taxa de Reconfiguração:</span>
                <span className="text-white/60 font-mono">{life.reconfigRate.toFixed(3)}</span>
              </div>
            </div>
          </div>
          
          {/* Toggle de Reconfiguração */}
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              id="reconfigEnabled"
              checked={life.reconfigEnabled}
              onChange={(e) => onLifeChange({ reconfigEnabled: e.target.checked })}
              className="w-2.5 h-2.5 bg-transparent border border-white/15 checked:bg-white/20 cursor-pointer"
            />
            <label htmlFor="reconfigEnabled" className="text-white/40 text-[10px] font-light cursor-pointer uppercase tracking-wide">
              Mutação Macro (Reconfig)
            </label>
          </div>
          
          {/* Estatísticas ao Vivo */}
          {lifeStats && (
            <div className="space-y-1 p-2" style={{ background: 'rgba(16,212,91,0.04)', border: '1px dashed rgba(16,212,91,0.10)' }}>
              <div className="text-white/50 text-[9px] uppercase tracking-wide mb-1">Estatísticas ao Vivo</div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
                <span className="text-white/30">Nascimentos:</span>
                <span className="text-green-400/80 font-mono text-right">{lifeStats.births}</span>
                <span className="text-white/30">Mortes:</span>
                <span className="text-red-400/80 font-mono text-right">{lifeStats.deaths}</span>
                <span className="text-white/30">Mutações:</span>
                <span className="text-purple-400/80 font-mono text-right">{lifeStats.mutations}</span>
                <span className="text-white/30">Especiação:</span>
                <span className="text-blue-400/80 font-mono text-right">{lifeStats.speciation}</span>
              </div>
              {lifeStats.lastEvent && (
                <div className="text-white/40 text-[9px] mt-1 italic">{lifeStats.lastEvent}</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="h-px bg-white/[0.04]" />

      {/* Field */}
      {!hideCoreControls && (
      <div className="space-y-3">
        <h3 className="text-[10px] uppercase pb-1.5" style={{ fontFamily: "'Doto', monospace", color: 'rgba(255,255,255,0.50)', letterSpacing: '0.08em', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
          Campo
        </h3>
        <Knob
          label="Difusão (Espalha)"
          value={fieldConfig.diffusion}
          min={0.3}
          max={0.99}
          step={0.01}
          onChange={(v) => onFieldChange({ diffusion: v })}
        />
        <Knob
          label="Decaimento (Evap.)"
          value={fieldConfig.decay}
          min={0.0}
          max={0.2}
          step={0.001}
          onChange={(v) => onFieldChange({ decay: v })}
        />
      </div>
      )}

      <div className="h-px bg-white/[0.04]" />

      {/* Render */}
      <div className="space-y-3">
        <h3 className="text-[10px] uppercase pb-1.5" style={{ fontFamily: "'Doto', monospace", color: 'rgba(255,255,255,0.50)', letterSpacing: '0.08em', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
          Renderização
        </h3>
        
        {onSimQualityChange && (
          <div>
            <label className="text-white/40 text-[9px] tracking-wide uppercase font-light block mb-1.5">
              Qualidade
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['FAST', 'HIGH', 'ULTRA'] as const).map((quality) => (
                <button
                  key={quality}
                  onClick={() => onSimQualityChange(quality)}
                  className="text-[10px] py-1 px-1.5 transition-all uppercase"
                  style={{
                    fontFamily: MONO,
                    border: simQuality === quality ? '1px dashed rgba(255,212,0,0.25)' : '1px dashed rgba(255,255,255,0.06)',
                    color: simQuality === quality ? '#ffd400' : 'rgba(255,255,255,0.40)',
                    background: simQuality === quality ? 'rgba(255,212,0,0.04)' : 'transparent',
                  }}
                >
                  {quality}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {onDotSizeChange && (
          <Knob
            label="Tamanho do Ponto"
            value={dotSize}
            min={1.0}
            max={6.0}
            step={0.5}
            onChange={onDotSizeChange}
            unit="px"
          />
        )}
        
        {onPointSizeChange && (
          <Knob
            label="Brilho do Ponto"
            value={pointSize}
            min={1.0}
            max={12.0}
            step={0.5}
            onChange={onPointSizeChange}
            unit="px"
          />
        )}
        
        {onGlowIntensityChange && (
          <Knob
            label="Intensidade Glow"
            value={glowIntensity}
            min={0.0}
            max={2.0}
            step={0.1}
            onChange={onGlowIntensityChange}
          />
        )}
        
        {onPaletteIndexChange && (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label className="text-white/40 text-[9px] tracking-wide uppercase font-light">Paleta de Cores</label>
              <span className="text-white/80 text-[11px] font-mono font-semibold">{PALETTES[paletteIndex % PALETTES.length]?.name || `#${paletteIndex}`}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const newPalette = Math.floor(Math.random() * PALETTES.length);
                console.log('[Patchboard] Randomizing palette:', { old: paletteIndex, new: newPalette });
                onPaletteIndexChange(newPalette);
              }}
              className="w-full text-[10px] py-2.5 px-2 transition-all uppercase cursor-pointer" style={{ border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', fontFamily: MONO, letterSpacing: '0.06em' }}
            >
              Randomizar Cores
            </button>
          </div>
        )}
        
        {/* Background Button */}
        <div>
          <button
            onClick={() => {
              if (onBackgroundClick) {
                onBackgroundClick();
              }
            }}
            className="w-full text-[10px] py-2.5 px-2 transition-all uppercase cursor-pointer" style={{ border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', fontFamily: MONO, letterSpacing: '0.06em' }}
          >
            Fundo do Canvas
          </button>
        </div>
      </div>

      <div className="h-px bg-white/[0.04]" />

      {/* Bonds & Trails Overlay */}
      <div className="space-y-3">
        <h3 className="text-[10px] uppercase pb-1.5" style={{ fontFamily: "'Doto', monospace", color: 'rgba(255,255,255,0.50)', letterSpacing: '0.08em', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
          Overlays
        </h3>
        
        <div className="space-y-3">
          {/* Bonds */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <input
                type="checkbox"
                id="showBonds"
                checked={showBonds}
                onChange={(e) => onShowBondsChange?.(e.target.checked)}
                className="w-3 h-3 border-white/15 bg-white/[0.05] checked:bg-cyan-500/50 cursor-pointer"
              />
              <label htmlFor="showBonds" className="text-white/70 text-[10px] font-light cursor-pointer">
                Conexões (Bonds)
              </label>
            </div>
            
            {showBonds && (
              <div className="space-y-2 pl-4">
                {onBondsDistanceChange && (
                  <Knob
                    label="Distância"
                    value={bondsDistance}
                    min={0.01}
                    max={0.5}
                    step={0.01}
                    onChange={onBondsDistanceChange}
                  />
                )}
                {onBondsOpacityChange && (
                  <Knob
                    label="Opacidade"
                    value={bondsOpacity}
                    min={0.05}
                    max={1.0}
                    step={0.05}
                    onChange={onBondsOpacityChange}
                  />
                )}
              </div>
            )}
          </div>
          
          {/* Trails */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <input
                type="checkbox"
                id="showTrails"
                checked={showTrails}
                onChange={(e) => onShowTrailsChange?.(e.target.checked)}
                className="w-3 h-3 border-white/15 bg-white/[0.05] checked:bg-cyan-500/50 cursor-pointer"
              />
              <label htmlFor="showTrails" className="text-white/70 text-[10px] font-light cursor-pointer">
                Rastros (Trails)
              </label>
            </div>
            
            {showTrails && (
              <div className="space-y-2 pl-4">
                {onTrailsLengthChange && (
                  <Knob
                    label="Comprimento"
                    value={trailsLength}
                    min={5}
                    max={60}
                    step={5}
                    onChange={onTrailsLengthChange}
                    unit=" pts"
                  />
                )}
                {onTrailsOpacityChange && (
                  <Knob
                    label="Opacidade"
                    value={trailsOpacity}
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    onChange={onTrailsOpacityChange}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-white/[0.04]" />

      {/* PATCH 04.5-SIGILS: Archetype Detection System */}
      {sigilConfig && onSigilConfigChange && (
        <>
          <div className="space-y-3">
            <h3 className="text-[10px] uppercase pb-1.5" style={{ fontFamily: "'Doto', monospace", color: 'rgba(255,255,255,0.50)', letterSpacing: '0.08em', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
              SIGILS (RecursiveLab)
            </h3>
            
            <p className="text-white/30 text-[9px] font-light italic leading-relaxed">
              Sistema de detecção de arquétipos baseado em símbolos depositados por interações locais.
            </p>
            
            {/* Master Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sigilsEnabled"
                checked={sigilConfig.enabled}
                onChange={(e) => onSigilConfigChange({ enabled: e.target.checked })}
                className="w-3 h-3 border-white/15 bg-white/[0.05] checked:bg-cyan-500/50 cursor-pointer"
              />
              <label htmlFor="sigilsEnabled" className="text-white/70 text-[10px] font-light cursor-pointer">
                Sistema de Sigils Ativo
              </label>
            </div>
            
            {sigilConfig.enabled && (
              <>
                {/* Show Overlay Toggle */}
                <div className="flex items-center gap-2 pl-4">
                  <input
                    type="checkbox"
                    id="sigilsShowOverlay"
                    checked={sigilConfig.showOverlay}
                    onChange={(e) => onSigilConfigChange({ showOverlay: e.target.checked })}
                    className="w-3 h-3 border-white/15 bg-white/[0.05] checked:bg-cyan-500/50 cursor-pointer"
                  />
                  <label htmlFor="sigilsShowOverlay" className="text-white/70 text-[10px] font-light cursor-pointer">
                    Mostrar Overlay (Tecla: S)
                  </label>
                </div>
                
                {/* Sliders */}
                <div className="space-y-2 pl-4">
                  <Knob
                    label="Influência"
                    value={sigilConfig.influence}
                    min={0}
                    max={1.0}
                    step={0.05}
                    onChange={(v) => onSigilConfigChange({ influence: v })}
                  />
                  <Knob
                    label="Depósito"
                    value={sigilConfig.deposit}
                    min={0}
                    max={2.0}
                    step={0.1}
                    onChange={(v) => onSigilConfigChange({ deposit: v })}
                  />
                  <Knob
                    label="Difusão"
                    value={sigilConfig.diffusion}
                    min={0}
                    max={0.3}
                    step={0.01}
                    onChange={(v) => onSigilConfigChange({ diffusion: v })}
                  />
                  <Knob
                    label="Decaimento"
                    value={sigilConfig.decay}
                    min={0}
                    max={2.0}
                    step={0.05}
                    onChange={(v) => onSigilConfigChange({ decay: v })}
                  />
                </div>
                
                {/* Quick Actions */}
                {onClearSigils && (
                  <div className="pl-4 space-y-1.5">
                    <button
                      onClick={onClearSigils}
                      className="w-full text-[10px] py-1.5 px-2 transition-all uppercase cursor-pointer" style={{ border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', fontFamily: MONO, letterSpacing: '0.06em' }}
                    >
                      Limpar Sigils
                    </button>
                  </div>
                )}
                
                {/* Legend */}
                <div className="space-y-1.5 pl-4">
                  <div className="text-white/40 text-[9px] tracking-wide uppercase font-light">Símbolos:</div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="text-cyan-400/70">✶ Vínculo</div>
                    <div className="text-red-400/70">⨯ Ruptura</div>
                    <div className="text-green-400/70">⚘ Florescer</div>
                    <div className="text-purple-400/70">⌬ Juramento</div>
                  </div>
                </div>
                
                {/* Archetypes List */}
                <div className="space-y-1.5 pl-4">
                  <div className="text-white/40 text-[9px] tracking-wide uppercase font-light border-b border-white/[0.06] pb-1">
                    Arquétipos Detectados ({archetypesDetected?.length || 0})
                  </div>
                  {archetypesDetected && archetypesDetected.length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {archetypesDetected.slice(0, 8).map((art) => (
                        <div key={art.id} className="text-[9px] text-white/50 flex items-center gap-1.5">
                          <span className="text-[11px]">{art.sigil}</span>
                          <span className="font-mono">{art.name}</span>
                          <span className="text-white/30 text-[8px]">({art.particleCount || '?'}p)</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[9px] text-white/30 italic">
                      Nenhum arquétipo emergiu ainda — aumente entropia e aguarde…
                    </div>
                  )}
                </div>
                
                {/* Info Card */}
                <div className="pl-4 space-y-1.5 p-2 text-[9px] text-white/40 leading-relaxed" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.04)' }}>
                  <div className="text-white/60 font-semibold uppercase tracking-wide text-[8px]">COMO FUNCIONA:</div>
                  <div>• <strong>Mutação:</strong> genes mudam com entropia (se metamorphosis on)</div>
                  <div>• <strong>Especiação:</strong> quando padrões divergem, arquétipo emerge</div>
                  <div>• <strong>Sigils:</strong> símbolos depositados por interações e decaem/difundem</div>
                </div>
              </>
            )}
          </div>
          
          <div className="h-px bg-white/[0.04]" />
        </>
      )}

      {/* Reconfig */}
      <div className="space-y-3">
        <h3 className="text-[10px] uppercase pb-1.5" style={{ fontFamily: "'Doto', monospace", color: 'rgba(255,255,255,0.50)', letterSpacing: '0.08em', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
          Reconfiguration
        </h3>
        <p className="text-white/30 text-[9px] font-light italic leading-relaxed">
          Detection interval controls when macro mutations can occur. Mutation rate/amount now controlled by Life Dial.
        </p>
        <Knob
          label="Interval (Reconfig Tick)"
          value={reconfigConfig.interval}
          min={0.5}
          max={12.0}
          step={0.5}
          onChange={(v) => onReconfigChange({ interval: v })}
          unit="s"
        />
      </div>
    </div>
  );
};