import { Play, Pause, RotateCcw, Undo2, BookOpen, Trophy, FileText, BookText, Eye, EyeOff, Layers, Box, LayoutGrid, KeyRound } from 'lucide-react';

export type LabId =
  | 'complexityLife'
  | 'sociogenesis'
  | 'psycheLab'
  | 'musicLab'
  | 'alchemyLab'
  | 'metaArtLab'
  | 'rhizomeLab'
  | 'asimovTheater'
  | 'languageLab'
  | 'treeOfLife'
  | 'physicsSandbox'
  | 'milPlatos';

interface TopHUDProps {
  running: boolean;
  speed: number;
  fps: number;
  trails: boolean;
  fieldHeatmap: boolean;
  fieldLayer?: string;
  canUndo: boolean;
  particleCount: number;
  speciesCount: number;
  mode: string;
  regime: string;
  circularDependency: number;
  dnaString?: string;
  simQuality?: string;
  achievementCount?: number;
  simMs?: number;
  renderMs?: number;
  neighborsChecked?: number;
  interactionsApplied?: number;
  narrativeStatus?: string;
  activeLab: LabId;
  hideUI?: boolean;
  socioStats?: { totems: number; taboos: number; rituals: number; tribes: number; openCases: number };
  viewMode?: '2D' | '3D';
  onLabChange: (lab: LabId) => void;
  onGoHome?: () => void;
  availableLabs?: LabId[];
  adminMode?: boolean;
  onOpenAdmin?: () => void;
  onTogglePlay: () => void;
  onStep: () => void;
  onSetSpeed: (speed: number) => void;
  onReset: () => void;
  onToggleTrails: () => void;
  onToggleFieldHeatmap: () => void;
  onFieldLayerChange?: (layer: string) => void;
  onUndo: () => void;
  onOpenGuide?: () => void;
  onOpenAchievements?: () => void;
  onOpenWorldLog?: () => void;
  onOpenChronicle?: () => void;
  onToggleHideUI?: () => void;
  onViewModeToggle?: () => void;
}

const FIELD_LAYERS = [
  { id: 'tension', label: 'T', title: 'Tensao',   color: '#ff4444' },
  { id: 'cohesion', label: 'C', title: 'Coesao',   color: '#4488ff' },
  { id: 'scarcity', label: 'N', title: 'Nutricao', color: '#44ff88' },
  { id: 'novelty',  label: 'E', title: 'Entropia', color: '#ffaa44' },
];

const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";

// Lab accent colors matching the homepage
const LAB_ACCENTS: Record<LabId, string> = {
  complexityLife: '#ffd400',
  metaArtLab:     '#ff0084',
  musicLab:       '#37b2da',
  rhizomeLab:     '#10d45b',
  alchemyLab:     '#d6552d',
  treeOfLife:     '#601480',
  sociogenesis:   '#601480',
  psycheLab:      '#8b5cf6',
  languageLab:    '#c8bfaa',
  asimovTheater:  '#7c6fcd',
  physicsSandbox: '#22d3ee',
  milPlatos:      '#6366f1',
};

// Lab symbols (alchemical)
const LAB_SYMBOLS: Record<LabId, string> = {
  complexityLife: '\u{1F71B}',
  metaArtLab:     '\u{1F762}',
  musicLab:       '\u{1F770}',
  rhizomeLab:     '\u{1F709}',
  alchemyLab:     '\u{1F701}',
  treeOfLife:     '\u{1F739}',
  sociogenesis:   '\u{1F755}',
  psycheLab:      '\u25C8',
  languageLab:    '\u25EF',
  asimovTheater:  '\u229A',
  physicsSandbox: '\u2B21',
  milPlatos:      '\u22C6',
};

export const TopHUD: React.FC<TopHUDProps> = ({
  running,
  speed,
  fps,
  trails,
  fieldHeatmap,
  fieldLayer = 'tension',
  canUndo,
  particleCount,
  speciesCount,
  mode,
  regime,
  circularDependency,
  dnaString,
  simQuality,
  achievementCount = 0,
  simMs,
  renderMs,
  neighborsChecked,
  interactionsApplied,
  narrativeStatus,
  activeLab,
  hideUI = false,
  socioStats,
  viewMode,
  onLabChange,
  onGoHome,
  availableLabs,
  adminMode = false,
  onOpenAdmin,
  onTogglePlay,
  onStep,
  onSetSpeed,
  onReset,
  onToggleTrails,
  onToggleFieldHeatmap,
  onFieldLayerChange,
  onUndo,
  onOpenGuide,
  onOpenAchievements,
  onOpenWorldLog,
  onOpenChronicle,
  onToggleHideUI,
  onViewModeToggle,
}) => {
  const ALL_LAB_TABS: { id: LabId; label: string }[] = [
    { id: 'complexityLife', label: 'Complexity Life' },
    { id: 'metaArtLab',     label: 'Meta-Gen-Art' },
    { id: 'musicLab',       label: 'Music Lab' },
    { id: 'rhizomeLab',     label: 'Rhizome' },
    { id: 'alchemyLab',     label: 'Alchemy' },
    { id: 'treeOfLife',     label: 'Tree of Life' },
    { id: 'sociogenesis',   label: 'Sociogenesis' },
    { id: 'psycheLab',      label: 'Psyche' },
    { id: 'milPlatos',     label: 'Mil Platôs' },
    { id: 'languageLab',    label: 'Language' },
    { id: 'asimovTheater',  label: 'Asimov' },
    { id: 'physicsSandbox', label: 'Physics' },
  ];

  const LAB_TABS = availableLabs && availableLabs.length
    ? ALL_LAB_TABS.filter(t => availableLabs.includes(t.id))
    : ALL_LAB_TABS;

  const accent = LAB_ACCENTS[activeLab] || '#ffd400';

  return (
    <div className="fixed top-0 left-0 right-0 z-[900] pointer-events-none" style={{ fontFamily: MONO }}>
      {/* ── Top bar: brand + lab tabs ────────────────────────────── */}
      <div className="flex items-stretch pointer-events-auto" style={{ borderBottom: '1px dashed rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.94)' }}>
        {/* Brand / Home button */}
        {onGoHome && (
          <button
            onClick={onGoHome}
            title="Voltar para Labs"
            className="flex items-center gap-2 px-4 py-2 transition-all shrink-0"
            style={{
              background: 'transparent',
              borderRight: '1px dashed rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.40)',
              fontFamily: DOTO,
              fontSize: '10px',
              fontWeight: 400,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}
          >
            <LayoutGrid size={10} strokeWidth={1.5} />
            <span className="hidden sm:inline">TOOLS</span>
          </button>
        )}

        {/* Lab tabs — horizontal scroll */}
        <div className="flex items-stretch overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          {LAB_TABS.map((tab) => {
            const isActive = activeLab === tab.id;
            const tabAccent = LAB_ACCENTS[tab.id] || '#fff';
            return (
              <button
                key={tab.id}
                onClick={() => onLabChange(tab.id)}
                title={tab.label}
                className="flex items-center gap-1.5 px-3 py-2 transition-all whitespace-nowrap shrink-0 relative"
                style={{
                  color: isActive ? tabAccent : 'rgba(255,255,255,0.25)',
                  fontFamily: MONO,
                  fontSize: '10px',
                  fontWeight: isActive ? 400 : 200,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  background: isActive ? `${tabAccent}06` : 'transparent',
                  borderRight: '1px dashed rgba(255,255,255,0.03)',
                }}
              >
                <span style={{ fontSize: '13px', lineHeight: 1 }}>{LAB_SYMBOLS[tab.id]}</span>
                <span className="hidden lg:inline">{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: tabAccent + '55' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Admin mode */}
        {onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            title={adminMode ? 'Admin Mode (ativado)' : 'Admin Mode (senha)'}
            className="flex items-center gap-1 px-3 py-2 transition-all shrink-0"
            style={{
              borderLeft: '1px dashed rgba(255,255,255,0.06)',
              background: adminMode ? 'rgba(245,158,11,0.10)' : 'transparent',
              color: adminMode ? '#f59e0b' : 'rgba(255,255,255,0.25)',
              fontFamily: MONO,
              fontSize: '9px',
              fontWeight: 300,
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            <KeyRound size={10} strokeWidth={1.5} />
            <span className="hidden sm:inline">ADMIN</span>
          </button>
        )}

        {/* 2D / 3D toggle */}
        {onViewModeToggle && (
          <button
            onClick={onViewModeToggle}
            title={viewMode === '3D' ? 'Voltar para 2D' : 'Modo 3D'}
            className="flex items-center gap-1 px-3 py-2 transition-all shrink-0"
            style={{
              borderLeft: '1px dashed rgba(255,255,255,0.06)',
              background: viewMode === '3D' ? 'rgba(139,92,246,0.06)' : 'transparent',
              color: viewMode === '3D' ? '#a78bfa' : 'rgba(255,255,255,0.25)',
              fontFamily: MONO,
              fontSize: '9px',
              fontWeight: 300,
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            <Box size={10} strokeWidth={1.5} />
            3D
          </button>
        )}
      </div>

      {/* ── Controls bar — Complexity Lab / Sociogenesis only ──── */}
      {activeLab !== 'psycheLab' && activeLab !== 'musicLab' && activeLab !== 'alchemyLab' && activeLab !== 'metaArtLab' && activeLab !== 'rhizomeLab' && activeLab !== 'asimovTheater' && activeLab !== 'languageLab' && activeLab !== 'treeOfLife' && activeLab !== 'physicsSandbox' && activeLab !== 'milPlatos' && (
      <div className="flex items-center justify-between px-3 py-1.5 gap-2 pointer-events-auto"
        style={{
          background: 'rgba(0,0,0,0.92)',
          borderBottom: '1px dashed rgba(255,255,255,0.06)',
        }}>
        {/* Left: Transport + tools */}
        <div className="flex items-center gap-1">
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="p-1.5 transition-all"
            title={running ? 'Pausar' : 'Reproduzir'}
            data-guide="play-button"
            style={{
              color: running ? accent : 'rgba(255,255,255,0.7)',
              background: running ? `${accent}10` : 'transparent',
              border: running ? `1px dashed ${accent}30` : '1px dashed transparent',
            }}
          >
            {running ? <Pause size={12} strokeWidth={1.5} /> : <Play size={12} strokeWidth={1.5} />}
          </button>

          {/* Dashed separator */}
          <div className="w-px h-3" style={{ borderLeft: '1px dashed rgba(255,255,255,0.12)' }} />

          {/* Speed */}
          <div data-guide="speed-control">
            <select
              value={speed}
              onChange={(e) => onSetSpeed(Number(e.target.value))}
              className="cursor-pointer transition-colors focus:outline-none"
              style={{
                fontFamily: MONO,
                fontSize: '10px',
                fontWeight: 300,
                color: 'rgba(255,255,255,0.7)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px dashed rgba(255,255,255,0.08)',
                padding: '2px 4px',
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                <option key={s} value={s} style={{ background: '#000', color: '#fff' }}>{s}x</option>
              ))}
            </select>
          </div>

          <div className="w-px h-3" style={{ borderLeft: '1px dashed rgba(255,255,255,0.12)' }} />

          {/* Reset + Undo */}
          <button onClick={onReset} className="p-1.5 transition-colors" title="Reiniciar"
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            <RotateCcw size={11} strokeWidth={1.5} />
          </button>
          <button onClick={onUndo} className="p-1.5 transition-colors disabled:opacity-20" title="Desfazer" disabled={!canUndo}
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            <Undo2 size={11} strokeWidth={1.5} />
          </button>

          {/* Field heatmap (Complexity Lab) */}
          {activeLab === 'complexityLife' && (
            <>
              <div className="w-px h-3" style={{ borderLeft: '1px dashed rgba(255,255,255,0.12)' }} />
              <button
                onClick={onToggleFieldHeatmap}
                className="flex items-center gap-1 p-1.5 transition-all"
                title="Campo de Energia"
                style={{
                  color: fieldHeatmap ? '#ffaa44' : 'rgba(255,255,255,0.30)',
                  background: fieldHeatmap ? 'rgba(255,170,68,0.06)' : 'transparent',
                  border: fieldHeatmap ? '1px dashed rgba(255,170,68,0.25)' : '1px dashed transparent',
                  fontFamily: MONO,
                  fontSize: '9px',
                  fontWeight: 200,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                <Layers size={10} strokeWidth={1.5} />
                <span className="hidden sm:inline">CAMPO</span>
              </button>
              {fieldHeatmap && onFieldLayerChange && (
                <div className="flex items-center gap-0.5">
                  {FIELD_LAYERS.map(fl => (
                    <button
                      key={fl.id}
                      onClick={() => onFieldLayerChange(fl.id)}
                      title={fl.title}
                      className="w-5 h-5 transition-all flex items-center justify-center"
                      style={{
                        fontSize: '8px',
                        fontFamily: MONO,
                        fontWeight: fieldLayer === fl.id ? 400 : 200,
                        color: fieldLayer === fl.id ? fl.color : 'rgba(255,255,255,0.25)',
                        background: fieldLayer === fl.id ? `${fl.color}0c` : 'transparent',
                        border: fieldLayer === fl.id ? `1px dashed ${fl.color}35` : '1px dashed transparent',
                      }}
                    >
                      {fl.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Utility buttons */}
          {onOpenGuide && (
            <>
              <div className="w-px h-3" style={{ borderLeft: '1px dashed rgba(255,255,255,0.12)' }} />
              <button onClick={onOpenGuide} className="p-1.5 transition-colors" title="Tour Guiado" data-guide-button
                style={{ color: '#ffd400' }}>
                <BookOpen size={11} strokeWidth={1.5} />
              </button>
            </>
          )}

          {onOpenAchievements && (
            <button onClick={onOpenAchievements} className="relative p-1.5 transition-colors" title="Conquistas"
              style={{ color: '#ffd400' }}>
              <Trophy size={11} strokeWidth={1.5} />
              {achievementCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 flex items-center justify-center"
                  style={{ background: '#ffd400' }}>
                  <span style={{ fontSize: '7px', fontWeight: 600, color: '#000' }}>{achievementCount > 9 ? '9+' : achievementCount}</span>
                </div>
              )}
            </button>
          )}

          {onOpenWorldLog && (
            <button onClick={onOpenWorldLog} className="p-1.5 transition-colors" title="World Log"
              style={{ color: '#37b2da' }}>
              <FileText size={11} strokeWidth={1.5} />
            </button>
          )}

          {onOpenChronicle && (
            <button onClick={onOpenChronicle} className="p-1.5 transition-colors" title="Chronicle"
              style={{ color: '#8b5cf6' }}>
              <BookText size={11} strokeWidth={1.5} />
            </button>
          )}

          {onToggleHideUI && (
            <>
              <div className="w-px h-3" style={{ borderLeft: '1px dashed rgba(255,255,255,0.12)' }} />
              <button
                onClick={onToggleHideUI}
                className="p-1.5 transition-colors"
                title="Modo Cinematico (H)"
                style={{ color: hideUI ? '#37b2da' : 'rgba(255,255,255,0.30)' }}
              >
                {hideUI ? <EyeOff size={11} strokeWidth={1.5} /> : <Eye size={11} strokeWidth={1.5} />}
              </button>
            </>
          )}
        </div>

        {/* Right: Status pills */}
        <div className="flex items-center gap-1.5">
          {/* FPS */}
          <span style={{ fontFamily: MONO, fontSize: '9px', fontWeight: 300, color: 'rgba(255,255,255,0.4)' }}>
            {fps}
          </span>

          {(simMs !== undefined || renderMs !== undefined) && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
              <span style={{ fontFamily: MONO, fontSize: '9px', fontWeight: 200, color: 'rgba(255,255,255,0.3)' }}>
                {simMs?.toFixed?.(1) ?? '-'}+{renderMs?.toFixed?.(1) ?? '-'}ms
              </span>
            </>
          )}

          {simQuality && (
            <>
              <div className="w-px h-3" style={{ borderLeft: '1px dashed rgba(255,255,255,0.08)' }} />
              <span style={{ fontFamily: MONO, fontSize: '9px', fontWeight: 200, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {simQuality}
              </span>
            </>
          )}

          <div className="w-px h-3" style={{ borderLeft: '1px dashed rgba(255,255,255,0.08)' }} />

          {/* Particle count */}
          <span style={{ fontFamily: MONO, fontSize: '9px', fontWeight: 300, color: 'rgba(255,255,255,0.5)' }}>
            {particleCount}
            <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 2px' }}>/</span>
            <span style={{ color: accent }}>{speciesCount}</span>
          </span>

          <div className="w-px h-3" style={{ borderLeft: '1px dashed rgba(255,255,255,0.08)' }} />

          {/* Regime */}
          <span style={{
            fontFamily: MONO,
            fontSize: '9px',
            fontWeight: 300,
            color: accent,
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            {regime}
          </span>

          {narrativeStatus && (
            <>
              <div className="w-px h-3" style={{ borderLeft: '1px dashed rgba(255,255,255,0.08)' }} />
              <span style={{ fontFamily: MONO, fontSize: '9px', fontWeight: 200, color: '#37b2da', fontStyle: 'italic' }}>
                {narrativeStatus}
              </span>
            </>
          )}

          {circularDependency > 0 && (
            <>
              <div className="w-px h-3" style={{ borderLeft: '1px dashed rgba(255,255,255,0.08)' }} />
              <span style={{ fontFamily: MONO, fontSize: '9px', fontWeight: 300, color: 'rgba(255,255,255,0.5)' }}>
                CIRCULAR {Math.round(circularDependency * 100)}%
              </span>
            </>
          )}

          {socioStats && activeLab === 'sociogenesis' && (
            <>
              <div className="w-px h-3" style={{ borderLeft: '1px dashed rgba(255,255,255,0.08)' }} />
              <span style={{ fontFamily: MONO, fontSize: '9px', fontWeight: 300 }}>
                <span style={{ color: '#37b2da' }}>T{socioStats.totems}</span>
                {' '}<span style={{ color: '#ff4444' }}>X{socioStats.taboos}</span>
                {' '}<span style={{ color: '#8b5cf6' }}>R{socioStats.rituals}</span>
                {socioStats.tribes > 0 && <>{' '}<span style={{ color: '#10d45b' }}>G{socioStats.tribes}</span></>}
              </span>
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
