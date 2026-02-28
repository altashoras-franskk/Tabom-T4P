import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Undo2, BookOpen, Trophy, FileText, BookText, Eye, EyeOff, Layers, Box, LayoutGrid, KeyRound, Menu } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useIsMobile } from '../app/components/ui/use-mobile';

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

const FIELD_LAYER_KEYS = [
  { id: 'tension', label: 'T', titleKey: 'layer_tension' as const, color: '#ff4444' },
  { id: 'cohesion', label: 'C', titleKey: 'layer_cohesion' as const, color: '#4488ff' },
  { id: 'scarcity', label: 'N', titleKey: 'layer_scarcity' as const, color: '#44ff88' },
  { id: 'novelty',  label: 'E', titleKey: 'layer_novelty' as const, color: '#ffaa44' },
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
  const { t, locale, setLocale } = useI18n();
  const ALL_LAB_TABS: { id: LabId; labelKey: string }[] = [
    { id: 'complexityLife', labelKey: 'tab_complexityLife' },
    { id: 'metaArtLab',     labelKey: 'tab_metaArtLab' },
    { id: 'musicLab',       labelKey: 'tab_musicLab' },
    { id: 'rhizomeLab',     labelKey: 'tab_rhizomeLab' },
    { id: 'alchemyLab',     labelKey: 'tab_alchemyLab' },
    { id: 'treeOfLife',     labelKey: 'tab_treeOfLife' },
    { id: 'sociogenesis',   labelKey: 'tab_sociogenesis' },
    { id: 'psycheLab',      labelKey: 'tab_psycheLab' },
    { id: 'milPlatos',      labelKey: 'tab_milPlatos' },
    { id: 'languageLab',    labelKey: 'tab_languageLab' },
    { id: 'asimovTheater',  labelKey: 'tab_asimovTheater' },
    { id: 'physicsSandbox', labelKey: 'tab_physicsSandbox' },
  ];

  const LAB_TABS = availableLabs && availableLabs.length
    ? ALL_LAB_TABS.filter((tab) => availableLabs.includes(tab.id))
    : ALL_LAB_TABS;

  const accent = LAB_ACCENTS[activeLab] ?? '#ffd400';
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /** Desktop: wrap callbacks so a thrown error doesn't white-screen the app */
  const safeDesktop = (fn: ((...args: unknown[]) => void) | undefined, ...args: unknown[]) => () => {
    try { fn?.(...args); } catch (e) { console.error('[TopHUD] action failed', e); }
  };

  const MOBILE_ROW = { minHeight: 48, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' as const };
  const safe = (fn: (() => void) | undefined, close = true) => () => {
    try {
      fn?.();
      if (close) setMobileMenuOpen(false);
    } catch (e) {
      console.error('[TopHUD] menu action failed', e);
    }
  };

  if (isMobile) {
    return (
      <>
        {/* Minimal top bar — Menu + lab + fullscreen */}
        <div className="fixed top-0 left-0 right-0 z-[900] pointer-events-auto flex items-center justify-between px-2 py-2 safe-top"
          style={{ fontFamily: MONO, background: 'rgba(0,0,0,0.94)', borderBottom: '1px dashed rgba(255,255,255,0.06)', minHeight: 48, paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
          <button
            onClick={() => { try { setMobileMenuOpen(true); } catch (e) { console.error(e); } }}
            aria-label="Menu"
            className="flex items-center justify-center rounded-xl transition-all active:opacity-80"
            style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.06)', color: accent, border: '1px dashed rgba(255,255,255,0.1)' }}
          >
            <Menu size={22} strokeWidth={1.8} />
          </button>
          <span style={{ fontFamily: DOTO, fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {t((LAB_TABS.find(l => l.id === activeLab)?.labelKey || 'tab_complexityLife') as import('../i18n/strings').StringKey)}
          </span>
          {onToggleHideUI && (
            <button
              onClick={onToggleHideUI}
              aria-label={t('topHud_cinematic')}
              className="flex items-center justify-center rounded-xl transition-all active:opacity-80"
              style={{ width: 48, height: 48, background: hideUI ? `${accent}15` : 'rgba(255,255,255,0.06)', color: hideUI ? accent : 'rgba(255,255,255,0.5)', border: '1px dashed rgba(255,255,255,0.1)' }}
            >
              <Eye size={20} strokeWidth={1.8} />
            </button>
          )}
        </div>

        {/* Bottom sheet — Menu (colapsável, fácil acesso) */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-[950]"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="false"
          >
            <div
              className="absolute left-0 right-0 bottom-0 overflow-y-auto"
              style={{
                maxHeight: '85vh',
                background: 'rgba(0,0,0,0.98)',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                borderTop: '1px dashed rgba(255,255,255,0.1)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                fontFamily: MONO,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ ...MOBILE_ROW, justifyContent: 'center', padding: '16px' }}>
                <span style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Menu</span>
              </div>

              {onGoHome && (
                <button onClick={safe(onGoHome)} style={{ width: '100%', ...MOBILE_ROW, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                  <LayoutGrid size={20} strokeWidth={1.5} />
                  {t('topHud_tools')} / Labs
                </button>
              )}

              <div style={{ ...MOBILE_ROW, background: 'rgba(255,255,255,0.02)' }}>
                <button onClick={() => safe(onTogglePlay, false)()} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14 }}>
                  {running ? <Pause size={22} /> : <Play size={22} />}
                  {running ? t('topHud_pause') : t('topHud_play')}
                </button>
              </div>

              <div style={{ ...MOBILE_ROW, gap: 16 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Velocidade</span>
                <select
                  value={speed}
                  onChange={(e) => { try { onSetSpeed(Number(e.target.value)); } catch (err) { console.error(err); } }}
                  data-guide="speed-control"
                  style={{ flex: 1, maxWidth: 100, padding: '10px 12px', fontSize: 14, background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.15)', color: '#fff', borderRadius: 10 }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                    <option key={s} value={s}>{s}x</option>
                  ))}
                </select>
              </div>

              <button onClick={safe(onReset)} style={{ width: '100%', ...MOBILE_ROW, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                <RotateCcw size={20} strokeWidth={1.5} />
                {t('topHud_reset')}
              </button>
              <button onClick={safe(onUndo)} disabled={!canUndo} style={{ width: '100%', ...MOBILE_ROW, background: 'transparent', border: 'none', color: canUndo ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)', fontSize: 13, cursor: canUndo ? 'pointer' : 'default', textAlign: 'left' }}>
                <Undo2 size={20} strokeWidth={1.5} />
                {t('topHud_undo')}
              </button>

              {activeLab === 'complexityLife' && onToggleFieldHeatmap && (
                <button onClick={() => safe(onToggleFieldHeatmap, false)()} style={{ width: '100%', ...MOBILE_ROW, background: 'transparent', border: 'none', color: fieldHeatmap ? '#ffaa44' : 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                  <Layers size={20} strokeWidth={1.5} />
                  {t('topHud_field')} {fieldHeatmap ? 'ON' : 'OFF'}
                </button>
              )}

              {onOpenGuide && (
                <button onClick={safe(onOpenGuide)} style={{ width: '100%', ...MOBILE_ROW, background: 'transparent', border: 'none', color: '#ffd400', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                  <BookOpen size={20} strokeWidth={1.5} />
                  {t('topHud_guide')}
                </button>
              )}
              {onOpenAchievements && (
                <button onClick={safe(onOpenAchievements)} style={{ width: '100%', ...MOBILE_ROW, background: 'transparent', border: 'none', color: '#ffd400', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                  <Trophy size={20} strokeWidth={1.5} />
                  {t('topHud_achievements')} {achievementCount > 0 ? `(${achievementCount})` : ''}
                </button>
              )}
              {onOpenWorldLog && (
                <button onClick={safe(onOpenWorldLog)} style={{ width: '100%', ...MOBILE_ROW, background: 'transparent', border: 'none', color: '#37b2da', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                  <FileText size={20} strokeWidth={1.5} />
                  World Log
                </button>
              )}
              {onOpenChronicle && (
                <button onClick={safe(onOpenChronicle)} style={{ width: '100%', ...MOBILE_ROW, background: 'transparent', border: 'none', color: '#8b5cf6', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                  <BookText size={20} strokeWidth={1.5} />
                  Chronicle
                </button>
              )}
              {onToggleHideUI && (
                <button onClick={safe(onToggleHideUI)} style={{ width: '100%', ...MOBILE_ROW, background: 'transparent', border: 'none', color: hideUI ? accent : 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                  {hideUI ? <Eye size={20} /> : <EyeOff size={20} />}
                  {hideUI ? 'Mostrar UI' : 'Canvas inteiro'}
                </button>
              )}
              {onViewModeToggle && (
                <button onClick={safe(onViewModeToggle)} style={{ width: '100%', ...MOBILE_ROW, background: 'transparent', border: 'none', color: viewMode === '3D' ? '#a78bfa' : 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                  <Box size={20} strokeWidth={1.5} />
                  3D {viewMode === '3D' ? 'ON' : 'OFF'}
                </button>
              )}
              {onOpenAdmin && (
                <button onClick={safe(onOpenAdmin)} style={{ width: '100%', ...MOBILE_ROW, background: 'transparent', border: 'none', color: adminMode ? '#f59e0b' : 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                  <KeyRound size={20} strokeWidth={1.5} />
                  {t('topHud_admin')} {adminMode ? 'ON' : ''}
                </button>
              )}

              <div style={{ padding: '20px 16px', borderTop: '1px dashed rgba(255,255,255,0.06)' }}>
                <button onClick={() => setMobileMenuOpen(false)} style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[900] pointer-events-none" style={{ fontFamily: MONO }}>
      {/* ── Top bar: brand + lab tabs ────────────────────────────── */}
      <div className="flex items-stretch pointer-events-auto" style={{ borderBottom: '1px dashed rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.94)' }}>
        {/* Brand / Home button */}
        {onGoHome && (
          <button
            onClick={onGoHome}
            title={t('topHud_goHome')}
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
            <span className="hidden sm:inline">{t('topHud_tools')}</span>
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
                onClick={safeDesktop(onLabChange, tab.id)}
                title={t(tab.labelKey as import('../i18n/strings').StringKey)}
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
                <span className="hidden lg:inline">{t(tab.labelKey as import('../i18n/strings').StringKey)}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: tabAccent + '55' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Language EN / PT-BR */}
        <div className="flex items-center shrink-0" style={{ borderLeft: '1px dashed rgba(255,255,255,0.06)' }}>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'en' | 'pt-BR')}
            title={locale === 'en' ? 'English' : 'Português (Brasil)'}
            className="cursor-pointer transition-colors focus:outline-none"
            style={{
              fontFamily: MONO,
              fontSize: '9px',
              fontWeight: 300,
              color: 'rgba(255,255,255,0.55)',
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.08)',
              padding: '2px 6px',
              margin: '0 8px',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
            }}
          >
            <option value="pt-BR" style={{ background: '#000', color: '#fff' }}>PT</option>
            <option value="en" style={{ background: '#000', color: '#fff' }}>EN</option>
          </select>
        </div>

        {/* Admin mode */}
        {onOpenAdmin && (
          <button
            onClick={safeDesktop(onOpenAdmin)}
            title={adminMode ? t('topHud_admin_title') : t('topHud_admin_title_off')}
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
            <span className="hidden sm:inline">{t('topHud_admin')}</span>
          </button>
        )}

        {/* 2D / 3D toggle */}
        {onViewModeToggle && (
          <button
            onClick={onViewModeToggle}
            title={viewMode === '3D' ? t('topHud_3d_title') : t('topHud_3d_title_off')}
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
            onClick={safeDesktop(onTogglePlay)}
            className="p-1.5 transition-all"
            title={running ? t('topHud_pause') : t('topHud_play')}
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
          <button onClick={safeDesktop(onReset)} className="p-1.5 transition-colors" title={t('topHud_reset')}
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            <RotateCcw size={11} strokeWidth={1.5} />
          </button>
          <button onClick={safeDesktop(onUndo)} className="p-1.5 transition-colors disabled:opacity-20" title={t('topHud_undo')} disabled={!canUndo}
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            <Undo2 size={11} strokeWidth={1.5} />
          </button>

          {/* Field heatmap (Complexity Lab) */}
          {activeLab === 'complexityLife' && (
            <>
              <div className="w-px h-3" style={{ borderLeft: '1px dashed rgba(255,255,255,0.12)' }} />
              <button
                onClick={safeDesktop(onToggleFieldHeatmap)}
                className="flex items-center gap-1 p-1.5 transition-all"
                title={t('topHud_field_title')}
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
                <span className="hidden sm:inline">{t('topHud_field')}</span>
              </button>
              {fieldHeatmap && onFieldLayerChange && (
                <div className="flex items-center gap-0.5">
                  {FIELD_LAYER_KEYS.map(fl => (
                    <button
                      key={fl.id}
                      onClick={() => onFieldLayerChange(fl.id)}
                      title={t(fl.titleKey)}
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
              <button onClick={safeDesktop(onOpenGuide)} className="p-1.5 transition-colors" title={t('topHud_guide')} data-guide-button
                style={{ color: '#ffd400' }}>
                <BookOpen size={11} strokeWidth={1.5} />
              </button>
            </>
          )}

          {onOpenAchievements && (
            <button onClick={safeDesktop(onOpenAchievements)} className="relative p-1.5 transition-colors" title={t('topHud_achievements')}
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
            <button onClick={safeDesktop(onOpenWorldLog)} className="p-1.5 transition-colors" title="World Log"
              style={{ color: '#37b2da' }}>
              <FileText size={11} strokeWidth={1.5} />
            </button>
          )}

          {onOpenChronicle && (
            <button onClick={safeDesktop(onOpenChronicle)} className="p-1.5 transition-colors" title="Chronicle"
              style={{ color: '#8b5cf6' }}>
              <BookText size={11} strokeWidth={1.5} />
            </button>
          )}

          {onToggleHideUI && (
            <>
              <div className="w-px h-3" style={{ borderLeft: '1px dashed rgba(255,255,255,0.12)' }} />
              <button
                onClick={safeDesktop(onToggleHideUI)}
                className="p-1.5 transition-colors"
                title={t('topHud_cinematic')}
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
