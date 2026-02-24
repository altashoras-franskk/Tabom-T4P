import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Patchboard } from './Patchboard';
import { MatrixEditor } from './MatrixEditor';
import { SeedPanel } from './SeedPanel';
import { Codex } from './Codex';
import { PerformanceStats } from './PerformanceStats';
import { ArchetypesPanel } from './ArchetypesPanel'; // PATCH 04.3
import { MicroConfig, MicroState } from '../sim/micro/microState';
import { FieldConfig } from '../sim/field/fieldState';
import { ReconfigConfig, SemanticArtifact } from '../sim/reconfig/reconfigState';
import { InteractionMatrix } from '../sim/micro/matrix';
import { Chronicle } from '../story/beats';
import { SimulationSnapshot } from '../engine/snapshot';
import { ArchetypeRegistry } from '../sim/archetypes/archetypes'; // PATCH 04.3
import { LifeConfig } from '../sim/life/lifeConfig'; // PATCH 04.5
import { LifeStats } from '../sim/life/lifeStats'; // PATCH 04.5
import { SigilConfig } from '../sim/sigils/sigilState'; // PATCH 04.5-SIGILS
import { ArchetypeArtifact } from '../sim/sigils/archetypeDetector'; // PATCH 04.5-SIGILS

const MONO = "'IBM Plex Mono', monospace";

interface RightDockProps {
  microConfig: MicroConfig;
  fieldConfig: FieldConfig;
  reconfigConfig: ReconfigConfig;
  matrix: InteractionMatrix;
  chronicle: Chronicle;
  artifacts: SemanticArtifact[];
  diversity: number;
  clusterCount: number;
  borderStrength: number;
  avgTension: number;
  avgCohesion: number;
  avgScarcity: number;
  brushRadius: number;
  brushStrength: number;
  seedRate: number;
  eraseRate: number;
  selectedType: number;
  selectedPower: 'pulse' | 'white-hole' | 'black-hole' | 'wind' | 'vortex' | 'freeze' | 'chaos' | 'quake' | 'nova' | 'magnetize';
  targetParticleCount: number;
  fps: number;
  particleCount: number;
  fieldCellCount: number;
  artifactCount: number;
  speciesCount: number;
  onMicroChange: (config: Partial<MicroConfig>) => void;
  onFieldChange: (config: Partial<FieldConfig>) => void;
  onReconfigChange: (config: Partial<ReconfigConfig>) => void;
  onMatrixChange: (matrix: InteractionMatrix) => void;
  onMatrixRandomize: () => void;
  onMatrixSoften: () => void;
  onMatrixSymmetrize: () => void;
  onMatrixInvert: () => void;
  onMatrixNormalize: () => void;
  onLoadPreset: (index: number) => void;
  onBrushRadiusChange: (value: number) => void;
  onBrushStrengthChange: (value: number) => void;
  onSeedRateChange: (value: number) => void;
  onEraseRateChange: (value: number) => void;
  onSelectedTypeChange: (value: number) => void;
  onSelectedPowerChange: (value: 'pulse' | 'white-hole' | 'black-hole' | 'wind' | 'vortex' | 'freeze' | 'chaos' | 'quake' | 'nova' | 'magnetize') => void;
  onTargetParticleCountChange: (value: number) => void;
  onSaveSnapshot: (name: string) => SimulationSnapshot;
  onLoadSnapshot: (snapshot: SimulationSnapshot) => void;
  onRandomizeAll?: () => void;
  currentSeed?: number;
  onLoadSeed?: (seed: number) => void;
  // G) Render aesthetics (optional)
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
  // Clusters recipes
  onApplyRecipe?: (recipe: string) => void;
  onNewUniverse?: () => void;
  onChaosSeed?: () => void;
  // Stats
  stats?: {
    totalBeats: number;
    totalSpeciations: number;
    totalInstitutions: number;
    totalMutations: number;
    totalMitosis: number;
    totalMetamorphosis: number;
    peakParticleCount: number;
    peakDiversity: number;
    peakTension: number;
    peakCohesion: number;
    simulationStartTime: number;
  };
  onLoadCreativePreset?: (presetId: string) => void;
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
  // Codex
  organisms?: any[];
  onSpawnOrganism?: (organismId: string) => void;
  onDeleteOrganism?: (organismId: string) => void;
  onRenameOrganism?: (organismId: string, newName: string) => void;
  captureMode?: boolean;
  onCaptureModeChange?: (enabled: boolean) => void;
  // PATCH 04.3: Archetypes
  archetypes?: ArchetypeRegistry;
  microState?: MicroState;
  showSigils?: boolean;
  onToggleSigils?: () => void;
  // PATCH 04.5: Life System
  life?: LifeConfig;
  onLifeChange?: (config: Partial<LifeConfig>) => void;
  lifeStats?: LifeStats;
  // PATCH 04.5-SIGILS: Archetype detection system
  sigilConfig?: SigilConfig;
  onSigilConfigChange?: (cfg: Partial<SigilConfig>) => void;
  archetypesDetected?: ArchetypeArtifact[];
  archetypeRegistry?: ArchetypeRegistry;
  onClearSigils?: () => void;
}

// ── Slider component matching the Swiss identity ────────────────────────────
const HUDSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
  accent?: string;
}> = ({ label, value, min, max, step, onChange, unit, accent }) => {
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
        }}>
          {label}
        </label>
        <span style={{
          fontFamily: MONO,
          fontSize: '9px',
          fontWeight: 300,
          color: accent || 'rgba(255,255,255,0.5)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {safeValue.toFixed(decimals)}{unit}
        </span>
      </div>
      <div className="relative h-3 flex items-center">
        <div className="absolute left-0 right-0 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="absolute left-0 h-px" style={{ width: `${pct}%`, background: accent || 'rgba(255,255,255,0.25)' }} />
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
            [&::-webkit-slider-thumb]:rounded-[1px]
            [&::-webkit-slider-thumb]:bg-white/60
            [&::-webkit-slider-thumb]:hover:bg-white
            [&::-webkit-slider-thumb]:transition-colors
            [&::-moz-range-thumb]:w-1.5
            [&::-moz-range-thumb]:h-3
            [&::-moz-range-thumb]:rounded-[1px]
            [&::-moz-range-thumb]:bg-white/60
            [&::-moz-range-thumb]:hover:bg-white
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:transition-colors"
          style={{ zIndex: 1 }}
        />
      </div>
    </div>
  );
};

export const RightDock: React.FC<RightDockProps> = (props) => {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<'patchboard' | 'powers' | 'matrix' | 'seed' | 'stats' | 'codex' | 'archetypes'>('patchboard');
  const [firstLoad, setFirstLoad] = useState(true);

  // Remove first load highlight after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setFirstLoad(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (collapsed) {
    return (
      <div className="fixed right-0 top-0 bottom-0 z-10 pointer-events-none">
        <div className="h-full flex items-center">
          <button
            onClick={() => setCollapsed(false)}
            className="pointer-events-auto p-2 transition-all"
            style={{
              background: 'rgba(0,0,0,0.5)',
              borderLeft: '1px dashed rgba(255,255,255,0.08)',
              borderTop: '1px dashed rgba(255,255,255,0.08)',
              borderBottom: '1px dashed rgba(255,255,255,0.08)',
              borderRadius: '4px 0 0 4px',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <ChevronLeft size={12} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'patchboard' as const, label: 'ALGO', num: '01' },
    { id: 'archetypes' as const, label: 'ARCH', num: '02' },
    { id: 'powers' as const,     label: 'PWR',  num: '03' },
    { id: 'matrix' as const,     label: 'MTX',  num: '04' },
    { id: 'seed' as const,       label: 'SEED', num: '05' },
    { id: 'stats' as const,      label: 'STAT', num: '06' },
    { id: 'codex' as const,      label: 'CDX',  num: '07' },
  ];

  return (
    <div className="fixed right-0 top-0 bottom-0 z-10 pointer-events-none" style={{ width: '320px', fontFamily: MONO }} data-right-dock>
      <div className="h-full flex pointer-events-auto">
        {/* ── Collapse button ──────────────────────────────────── */}
        <div className="flex items-center">
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 transition-colors"
            title="Minimizar painel"
            style={{
              color: 'rgba(255,255,255,0.3)',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '3px 0 0 3px',
              border: '1px dashed rgba(255,255,255,0.06)',
              borderRight: 'none',
            }}
          >
            <ChevronRight size={10} strokeWidth={1.5} />
          </button>
        </div>

        {/* ── Vertical Tabs ────────────────────────────────────── */}
        <div className="flex flex-col gap-0 py-2"
          style={{
            background: 'rgba(0,0,0,0.6)',
            borderLeft: '1px dashed rgba(255,255,255,0.06)',
          }}>
          {tabs.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="relative px-1.5 py-3 transition-all whitespace-nowrap"
                style={{
                  writingMode: 'vertical-rl',
                  fontSize: '8px',
                  fontWeight: isActive ? 400 : 200,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: isActive ? '#ffd400' : 'rgba(255,255,255,0.25)',
                  background: isActive ? 'rgba(255,212,0,0.04)' : 'transparent',
                  borderRight: isActive ? '1px solid rgba(255,212,0,0.3)' : '1px solid transparent',
                }}
              >
                {t.label}
                {firstLoad && t.id === 'patchboard' && (
                  <div className="absolute top-1 right-0.5 w-1 h-1 rounded-full animate-pulse" style={{ background: '#ffd400' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Content Panel ────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden"
          style={{
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(12px)',
            borderLeft: '1px dashed rgba(255,255,255,0.06)',
          }}>
          {/* Panel header */}
          <div className="px-3 py-2 flex items-center justify-between"
            style={{ borderBottom: '1px dashed rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '8px', fontWeight: 200, color: 'rgba(255,255,255,0.2)' }}>
                {tabs.find(t => t.id === tab)?.num}.
              </span>
              <span style={{ fontSize: '10px', fontWeight: 300, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {tabs.find(t => t.id === tab)?.label}
              </span>
            </div>
            <span style={{ fontSize: '7px', fontWeight: 200, color: 'rgba(255,255,255,0.15)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              COMPLEXITY LAB
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-3" style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.1) transparent',
          }}>
            {tab === 'patchboard' && (
              <Patchboard
                microConfig={props.microConfig}
                fieldConfig={props.fieldConfig}
                reconfigConfig={props.reconfigConfig}
                targetParticleCount={props.targetParticleCount}
                onMicroChange={props.onMicroChange}
                onFieldChange={props.onFieldChange}
                onReconfigChange={props.onReconfigChange}
                onTargetParticleCountChange={props.onTargetParticleCountChange}
                onRandomizeAll={props.onRandomizeAll}
                life={props.life}
                onLifeChange={props.onLifeChange}
                lifeStats={props.lifeStats}
                pointSize={props.pointSize}
                fadeFactor={props.fadeFactor}
                glowIntensity={props.glowIntensity}
                paletteIndex={props.paletteIndex}
                onPointSizeChange={props.onPointSizeChange}
                onFadeFactorChange={props.onFadeFactorChange}
                onGlowIntensityChange={props.onGlowIntensityChange}
                onPaletteIndexChange={props.onPaletteIndexChange}
                onBackgroundClick={props.onBackgroundClick}
                trails={props.trails}
                fieldHeatmap={props.fieldHeatmap}
                onToggleTrails={props.onToggleTrails}
                onToggleFieldHeatmap={props.onToggleFieldHeatmap}
                onApplyRecipe={props.onApplyRecipe}
                onNewUniverse={props.onNewUniverse}
                onChaosSeed={props.onChaosSeed}
                onLoadPreset={props.onLoadCreativePreset}
                renderMode={props.renderMode}
                streakLength={props.streakLength}
                onRenderModeChange={props.onRenderModeChange}
                onStreakLengthChange={props.onStreakLengthChange}
                simQuality={props.simQuality}
                dotSize={props.dotSize}
                onSimQualityChange={props.onSimQualityChange}
                onDotSizeChange={props.onDotSizeChange}
                spawnPattern={props.spawnPattern}
                onSpawnPatternChange={props.onSpawnPatternChange}
                showBonds={props.showBonds}
                bondsDistance={props.bondsDistance}
                bondsOpacity={props.bondsOpacity}
                showTrails={props.showTrails}
                trailsLength={props.trailsLength}
                trailsOpacity={props.trailsOpacity}
                onShowBondsChange={props.onShowBondsChange}
                onBondsDistanceChange={props.onBondsDistanceChange}
                onBondsOpacityChange={props.onBondsOpacityChange}
                onShowTrailsChange={props.onShowTrailsChange}
                onTrailsLengthChange={props.onTrailsLengthChange}
                onTrailsOpacityChange={props.onTrailsOpacityChange}
                sigilConfig={props.sigilConfig}
                onSigilConfigChange={props.onSigilConfigChange}
                archetypesDetected={props.archetypesDetected}
                onClearSigils={props.onClearSigils}
              />
            )}

            {tab === 'powers' && (
              <div className="space-y-5">
                <div className="space-y-3">
                  {/* Power Selection — 10 poderes em grid 2x5 */}
                  <div className="space-y-2">
                    {(() => {
                      type PowerId = 'pulse' | 'white-hole' | 'black-hole' | 'wind' | 'vortex' | 'freeze' | 'chaos' | 'quake' | 'nova' | 'magnetize';
                      const POWERS: {
                        id: PowerId;
                        icon: string;
                        label: string;
                        desc: string;
                        color: string;
                      }[] = [
                        { id: 'pulse',      icon: '\u00B7', label: 'Pulso',      desc: 'Expansao radial',             color: '#37b2da' },
                        { id: 'white-hole', icon: 'O',      label: 'White Hole', desc: 'Mega-repulsao quadratica',    color: '#ffd400' },
                        { id: 'black-hole', icon: '\u25CF',  label: 'Black Hole', desc: 'Mega-atracao quadratica',     color: '#8b5cf6' },
                        { id: 'wind',       icon: '~',      label: 'Vento',      desc: 'Arrasta na direcao',          color: '#37b2da' },
                        { id: 'vortex',     icon: '\u25CC',  label: 'Vortice',    desc: 'Rotacao tangencial',          color: '#10d45b' },
                        { id: 'freeze',     icon: '*',      label: 'Congelar',   desc: 'Drena energia cinetica',      color: '#60a5fa' },
                        { id: 'chaos',      icon: '!',      label: 'Caos',       desc: 'Injeta ruido aleatorio',      color: '#d6552d' },
                        { id: 'quake',      icon: '\u2248',  label: 'Quake',      desc: 'Ondas de pressao',            color: '#ffaa44' },
                        { id: 'nova',       icon: '+',      label: 'Nova',       desc: 'Implosao / explosao',         color: '#ff4444' },
                        { id: 'magnetize',  icon: '\u2295',  label: 'Magnetizar', desc: 'Converte especie proxima',    color: '#ff0084' },
                      ];

                      const active = POWERS.find(p => p.id === props.selectedPower);

                      return (
                        <>
                          <div className="grid grid-cols-5 gap-1">
                            {POWERS.map(p => {
                              const isActive = props.selectedPower === p.id;
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => props.onSelectedPowerChange(p.id)}
                                  title={p.label + ' — ' + p.desc}
                                  className="flex flex-col items-center justify-center py-2 px-0.5 transition-all"
                                  style={{
                                    borderRadius: '2px',
                                    border: `1px ${isActive ? 'solid' : 'dashed'} ${isActive ? p.color + '60' : 'rgba(255,255,255,0.06)'}`,
                                    background: isActive ? p.color + '10' : 'transparent',
                                    color: isActive ? p.color : 'rgba(255,255,255,0.35)',
                                  }}
                                >
                                  <span style={{ fontSize: '14px', lineHeight: 1, marginBottom: '3px' }}>{p.icon}</span>
                                  <span style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 200, lineHeight: 1 }}>{p.label}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Active power description */}
                          {active && (
                            <div className="flex items-start gap-2 px-2 py-1.5"
                              style={{
                                borderRadius: '2px',
                                border: `1px dashed ${active.color}30`,
                                background: `${active.color}05`,
                              }}>
                              <span style={{ fontSize: '16px', lineHeight: 1, color: active.color, marginTop: '2px' }}>{active.icon}</span>
                              <div>
                                <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 300, color: active.color, marginBottom: '2px' }}>
                                  {active.label}
                                </div>
                                <div style={{ fontSize: '9px', fontWeight: 200, color: 'rgba(255,255,255,0.35)', lineHeight: 1.3 }}>
                                  {active.desc}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Dashed separator */}
                  <div className="h-px" style={{ borderBottom: '1px dashed rgba(255,255,255,0.06)' }} />

                  {/* Keyboard hints */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5"
                    style={{ fontSize: '8px', fontWeight: 200, color: 'rgba(255,255,255,0.2)' }}>
                    <span>Click — poder instantaneo</span>
                    <span>Arrastar — poder continuo</span>
                    <span>Shift+drag — semear</span>
                    <span>Alt+drag — apagar</span>
                  </div>

                  <div className="h-px" style={{ borderBottom: '1px dashed rgba(255,255,255,0.06)' }} />

                  {/* Brush controls */}
                  <div className="space-y-2 pt-1">
                    {/* Species selector */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between">
                        <label style={{ fontSize: '9px', fontWeight: 200, letterSpacing: '0.5px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
                          Especie
                        </label>
                        <span style={{ fontSize: '9px', fontWeight: 300, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>
                          {props.selectedType}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Array.from({ length: props.microConfig.typesCount }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => props.onSelectedTypeChange(i)}
                            className="transition-all"
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '2px',
                              border: props.selectedType === i
                                ? '1px solid rgba(255,255,255,0.7)'
                                : '1px dashed rgba(255,255,255,0.15)',
                              backgroundColor: `hsl(${(i * 360) / props.microConfig.typesCount}, 70%, 60%)`,
                              transform: props.selectedType === i ? 'scale(1.15)' : 'scale(1)',
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="h-px" style={{ borderBottom: '1px dashed rgba(255,255,255,0.06)' }} />

                    <HUDSlider label="Raio" value={props.brushRadius} min={20} max={220} step={5}
                      onChange={props.onBrushRadiusChange} unit="px" />
                    <HUDSlider label="Forca" value={props.brushStrength} min={0} max={100} step={1}
                      onChange={props.onBrushStrengthChange} />
                    <HUDSlider label="Taxa Semeadura" value={props.seedRate} min={0} max={200} step={5}
                      onChange={props.onSeedRateChange} unit="/s" />
                    <HUDSlider label="Taxa Apagamento" value={props.eraseRate} min={0} max={1} step={0.05}
                      onChange={props.onEraseRateChange} />
                  </div>
                </div>
              </div>
            )}

            {tab === 'matrix' && (
              <MatrixEditor
                matrix={props.matrix}
                typesCount={props.microConfig.typesCount}
                onMatrixChange={props.onMatrixChange}
                onRandomize={props.onMatrixRandomize}
                onSoften={props.onMatrixSoften}
                onSymmetrize={props.onMatrixSymmetrize}
                onInvert={props.onMatrixInvert}
                onNormalize={props.onMatrixNormalize}
              />
            )}

            {tab === 'seed' && (
              <SeedPanel
                currentSeed={props.currentSeed || Date.now()}
                onLoadSeed={props.onLoadSeed || (() => {})}
              />
            )}

            {tab === 'stats' && (
              <PerformanceStats
                fps={props.fps}
                particleCount={props.particleCount}
                fieldCellCount={props.fieldCellCount}
                artifactCount={props.artifactCount}
                speciesCount={props.speciesCount}
                avgTension={props.avgTension}
                avgCohesion={props.avgCohesion}
                avgScarcity={props.avgScarcity}
                diversity={props.diversity}
                stats={props.stats}
              />
            )}

            {tab === 'codex' && props.organisms && (
              <Codex
                organisms={props.organisms}
                onSpawnOrganism={props.onSpawnOrganism || (() => {})}
                onDeleteOrganism={props.onDeleteOrganism || (() => {})}
                onRenameOrganism={props.onRenameOrganism || (() => {})}
                captureMode={props.captureMode || false}
                onCaptureModeChange={props.onCaptureModeChange || (() => {})}
                brushRadius={props.brushRadius}
                onBrushRadiusChange={props.onBrushRadiusChange}
              />
            )}

            {/* PATCH 04.3: Archetypes Tab */}
            {tab === 'archetypes' && props.archetypesDetected && props.sigilConfig && props.onSigilConfigChange && (
              <ArchetypesPanel
                archetypesDetected={props.archetypesDetected}
                microState={props.microState!}
                microConfig={props.microConfig}
                paletteIndex={props.paletteIndex || 0}
                sigilConfig={props.sigilConfig}
                onSigilConfigChange={props.onSigilConfigChange}
                archetypeRegistry={props.archetypeRegistry || { nextId: 100, list: [] }}
                lifeStats={props.lifeStats}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
