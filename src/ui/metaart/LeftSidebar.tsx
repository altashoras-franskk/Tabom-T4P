// ─── Left Sidebar — Tool palette + simulation quick-controls ──────────────────
// Swiss-brutalist identity · IBM Plex Mono · Doto · #ff0084 accent
import React from 'react';
import type { ToolState, AgentShape } from '../../sim/metaart/metaArtTypes';
import { BRUSH_TEXTURE_PRESETS } from '../../sim/metaart/metaArtTypes';
import { TOOL_DEFS } from '../../sim/metaart/metaArtTools';

const MONO = "'IBM Plex Mono', monospace";
const DOTO = "'Doto', monospace";
const ACCENT = '#ff0084';
const DIM = 'rgba(255,255,255,0.28)';
const MID = 'rgba(255,255,255,0.5)';
const BRIGHT = 'rgba(255,255,255,0.85)';
const BORDER = 'rgba(255,255,255,0.06)';

export interface LeftSidebarProps {
  toolState: ToolState;
  palette: string[];
  onToolChange: (patch: Partial<ToolState>) => void;
  agentShape: AgentShape;
  onAgentShape: (s: AgentShape) => void;
  sizeMul: number;
  onSizeMul: (v: number) => void;
  brushTextureId: string;
  onBrushTexture: (id: string) => void;
  onSpawnSingleton: () => void;
  singletonSize: number;
  onSingletonSize: (v: number) => void;
  simSpeed: number;
  onSimSpeed: (v: number) => void;
  staticAgents: boolean;
  onStaticAgents: () => void;
  isolatedSpecies: boolean;
  onIsolated: () => void;
  linear: boolean;
  onLinear: () => void;
  geoMode: 'fluid' | 'geometric' | 'hybrid' | '3d';
  onGeoMode: (m: 'fluid' | 'geometric' | 'hybrid' | '3d') => void;
  geoPanelOpen: boolean;
  onToggleGeoPanel: () => void;
}

const CATEGORY_CONFIG = {
  vida:  { label: 'VIDA',  accent: '#ff0084' },
  forca: { label: 'FORÇA', accent: '#ff0084' },
  mutar: { label: 'MUTAR', accent: '#ff0084' },
  guiar: { label: 'GUIAR', accent: '#ff0084' },
} as const;

const CATEGORY_ORDER = ['vida', 'forca', 'mutar', 'guiar'] as const;

const POINT_SHAPES: { id: AgentShape; icon: string }[] = [
  { id: 'circle',   icon: '●' },
  { id: 'square',   icon: '■' },
  { id: 'diamond',  icon: '◆' },
  { id: 'triangle', icon: '▲' },
  { id: 'cross',    icon: '+' },
  { id: 'star',     icon: '★' },
];

const W = 92;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 7, letterSpacing: '0.16em', textTransform: 'uppercase',
      color: DIM, textAlign: 'center', fontFamily: MONO,
      padding: '6px 0 4px',
      borderTop: `1px dashed ${BORDER}`,
    }}>
      {children}
    </div>
  );
}

function SmallToggle({
  label, active, onClick,
}: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '4px 2px', borderRadius: 1, cursor: 'pointer',
      fontSize: 7, letterSpacing: '0.1em', textTransform: 'uppercase',
      fontFamily: MONO,
      background: active ? 'rgba(255,0,132,0.08)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${active ? 'rgba(255,0,132,0.3)' : BORDER}`,
      color: active ? ACCENT : DIM,
      transition: 'all 0.12s',
    }}>
      {label}
    </button>
  );
}

function MiniSlider({
  label, val, min, max, step, fmt, onChange,
}: {
  label: string; val: number; min: number; max: number; step: number;
  fmt?: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 7, color: DIM, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: MONO }}>
          {label}
        </span>
        <span style={{ fontSize: 7, color: MID, fontFamily: MONO }}>
          {fmt ? fmt(val) : val.toFixed(1)}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', cursor: 'pointer', accentColor: ACCENT }} />
    </div>
  );
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  toolState, palette, onToolChange,
  agentShape, onAgentShape,
  sizeMul, onSizeMul,
  brushTextureId, onBrushTexture,
  onSpawnSingleton, singletonSize, onSingletonSize,
  simSpeed, onSimSpeed,
  staticAgents, onStaticAgents,
  isolatedSpecies, onIsolated,
  linear, onLinear,
  geoMode, onGeoMode,
  geoPanelOpen, onToggleGeoPanel,
}) => {
  const activeTool = TOOL_DEFS.find(t => t.id === toolState.activeToolId);
  const isBrush = agentShape === 'brush';

  return (
    <div style={{
      width: W, height: '100%', display: 'flex', flexDirection: 'column',
      background: '#000', borderRight: `1px solid ${BORDER}`,
      overflow: 'hidden', userSelect: 'none', flexShrink: 0,
    }}>
      {/* ── Scrollable body ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {/* ── Tool groups ─────────────────────────────────────────────────── */}
        {CATEGORY_ORDER.map(cat => {
          const cfg   = CATEGORY_CONFIG[cat];
          const tools = TOOL_DEFS.filter(t => t.category === cat);
          return (
            <div key={cat}>
              <div style={{
                padding: '5px 0 3px', textAlign: 'center', fontSize: 7,
                letterSpacing: '0.16em', textTransform: 'uppercase',
                color: DIM, fontFamily: MONO,
                borderBottom: `1px dashed ${BORDER}`,
                borderTop: `1px solid rgba(255,255,255,0.02)`,
              }}>
                {cfg.label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {tools.map(tool => {
                  const isActive = toolState.activeToolId === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => onToolChange({ activeToolId: tool.id })}
                      title={`${tool.name} — ${tool.description}`}
                      style={{
                        padding: '7px 2px 5px', border: 'none', cursor: 'pointer',
                        background: isActive ? 'rgba(255,0,132,0.08)' : 'transparent',
                        borderBottom: isActive
                          ? `1px solid ${ACCENT}` : `1px solid transparent`,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 2, transition: 'all 0.1s',
                        color: isActive ? ACCENT : DIM,
                      }}
                      onMouseEnter={e => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                      }}
                      onMouseLeave={e => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: 13, lineHeight: 1 }}>{tool.icon}</span>
                      <span style={{
                        fontSize: 6, lineHeight: 1.2, textAlign: 'center',
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        fontFamily: MONO,
                        opacity: isActive ? 1 : 0.5,
                        wordBreak: 'break-word', maxWidth: 32,
                      }}>
                        {tool.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ── Color swatches ───────────────────────────────────────────────── */}
        <div style={{ borderTop: `1px dashed ${BORDER}`, padding: '5px 5px' }}>
          <div style={{
            fontSize: 7, color: DIM, letterSpacing: '0.14em',
            textTransform: 'uppercase', textAlign: 'center', marginBottom: 3,
            fontFamily: MONO,
          }}>COR</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {palette.slice(0, 6).map((color, i) => (
              <button key={i} onClick={() => onToolChange({ colorIndex: i })}
                title={color}
                style={{
                  width: '100%', aspectRatio: '1', borderRadius: 1, background: color,
                  border: 'none', cursor: 'pointer',
                  outline: toolState.colorIndex === i
                    ? `1.5px solid rgba(255,255,255,0.8)` : `1px solid ${BORDER}`,
                  outlineOffset: 1,
                }} />
            ))}
          </div>
        </div>

        {/* ── Active tool params ─────────────────────────────────────────────── */}
        {activeTool && activeTool.params.length > 0 && (
          <div style={{
            borderTop: `1px dashed ${BORDER}`,
            padding: '5px 6px 6px',
            background: 'rgba(255,255,255,0.01)',
          }}>
            <div style={{
              fontSize: 7, color: ACCENT, letterSpacing: '0.14em',
              textTransform: 'uppercase', textAlign: 'center', marginBottom: 4,
              fontFamily: MONO,
            }}>
              {activeTool.name}
            </div>
            {activeTool.params.map(param => (
              <div key={param.key} style={{ marginBottom: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 7, color: DIM, letterSpacing: '0.08em', fontFamily: MONO }}>
                    {param.label}
                  </span>
                  <span style={{ fontSize: 7, color: MID, fontFamily: MONO }}>
                    {((toolState[param.key] as number) ?? param.min).toFixed(param.step < 0.1 ? 2 : 0)}
                  </span>
                </div>
                <input
                  type="range"
                  min={param.min} max={param.max} step={param.step}
                  value={(toolState[param.key] as number) ?? param.min}
                  onChange={e => onToolChange({ [param.key]: parseFloat(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer', accentColor: ACCENT }}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── FORMA + BRUSH ───────────────────────────────────────────────── */}
        <SectionLabel>Forma</SectionLabel>
        <div style={{ padding: '4px 5px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {POINT_SHAPES.map(({ id, icon }) => {
              const active = agentShape === id;
              return (
                <button key={id} onClick={() => onAgentShape(id)} title={id}
                  style={{
                    padding: '5px 2px', borderRadius: 1, cursor: 'pointer',
                    background: active ? 'rgba(255,0,132,0.08)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(255,0,132,0.3)' : BORDER}`,
                    color: active ? BRIGHT : DIM,
                    fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.1s',
                  }}>
                  {icon}
                </button>
              );
            })}
          </div>

          {/* Brush toggle */}
          <button
            onClick={() => onAgentShape(isBrush ? 'circle' : 'brush')}
            title="Pincel reto"
            style={{
              width: '100%', marginTop: 3, padding: '5px 4px', borderRadius: 1,
              cursor: 'pointer', fontSize: 7, letterSpacing: '0.1em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              background: isBrush ? 'rgba(255,0,132,0.1)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isBrush ? 'rgba(255,0,132,0.35)' : BORDER}`,
              color: isBrush ? ACCENT : DIM,
              fontFamily: MONO, textTransform: 'uppercase',
              transition: 'all 0.12s',
            }}>
            <span style={{ fontSize: 12 }}>𝓑</span>
            <span>Pincel</span>
          </button>
        </div>

        {/* ── Brush Texture ─────────────────────────────────────────────── */}
        {isBrush && (
          <div style={{ padding: '4px 5px 5px' }}>
            <div style={{
              fontSize: 7, color: 'rgba(255,0,132,0.5)', letterSpacing: '0.12em',
              textTransform: 'uppercase', textAlign: 'center', marginBottom: 4,
              fontFamily: MONO,
            }}>Textura</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              {BRUSH_TEXTURE_PRESETS.map(bp => {
                const active = brushTextureId === bp.id;
                return (
                  <button key={bp.id} onClick={() => onBrushTexture(bp.id)}
                    title={bp.label}
                    style={{
                      padding: '4px 2px', borderRadius: 1, cursor: 'pointer', fontSize: 7,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                      background: active ? 'rgba(255,0,132,0.08)' : 'rgba(255,255,255,0.01)',
                      border: `1px solid ${active ? 'rgba(255,0,132,0.3)' : BORDER}`,
                      color: active ? ACCENT : DIM,
                      fontFamily: MONO,
                      transition: 'all 0.1s',
                    }}>
                    <span style={{ fontSize: 11, lineHeight: 1 }}>{bp.emoji}</span>
                    <span style={{ fontSize: 5.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {bp.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SOLO Agent ─────────────────────────────────────────────────── */}
        <SectionLabel>Solo</SectionLabel>
        <div style={{ padding: '4px 5px 6px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <MiniSlider
            label="Tamanho"
            val={singletonSize}
            min={2} max={20} step={0.5}
            fmt={v => `${v.toFixed(1)}x`}
            onChange={onSingletonSize}
          />
          <button
            onClick={onSpawnSingleton}
            style={{
              width: '100%', padding: '5px 4px', borderRadius: 1, cursor: 'pointer',
              fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase',
              fontFamily: MONO,
              background: 'rgba(255,0,132,0.06)',
              border: '1px solid rgba(255,0,132,0.25)',
              color: ACCENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              transition: 'all 0.12s',
            }}>
            <span style={{ fontSize: 12 }}>◎</span>
            <span>Spawn</span>
          </button>
        </div>

        {/* ── AGENTES sliders ────────────────────────────────────────────── */}
        <SectionLabel>Agentes</SectionLabel>
        <div style={{ padding: '5px 6px 2px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <MiniSlider label="Tam." val={sizeMul} min={0.2} max={6} step={0.1}
            fmt={v => `${v.toFixed(1)}x`} onChange={onSizeMul} />
          <MiniSlider label="Tempo" val={simSpeed} min={0.01} max={10} step={0.01}
            fmt={v => v < 0.1 ? v.toFixed(2) + 'x' : v.toFixed(1) + 'x'} onChange={onSimSpeed} />
        </div>

        {/* ── Mode toggles ──────────────────────────────────────────────── */}
        <SectionLabel>Modos</SectionLabel>
        <div style={{ padding: '4px 5px 5px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <SmallToggle label="Fixo" active={staticAgents} onClick={onStaticAgents} />
          <SmallToggle label="Isolado" active={isolatedSpecies} onClick={onIsolated} />
          <SmallToggle label="Rizoma" active={linear} onClick={onLinear} />
        </div>

        {/* ── Geo compositor ────────────────────────────────────────────── */}
        <SectionLabel>Compositor</SectionLabel>
        <div style={{ padding: '4px 5px 5px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(['fluid', 'geometric', 'hybrid', '3d'] as const).map(m => {
              const labels = { fluid: 'FLUID', geometric: 'GEO', hybrid: 'HYBRID', '3d': '3D' };
              const active = geoMode === m;
              return (
                <button key={m} onClick={() => onGeoMode(m)}
                  style={{
                    padding: '4px 6px', borderRadius: 1, cursor: 'pointer',
                    background: active ? 'rgba(255,0,132,0.08)' : 'rgba(255,255,255,0.01)',
                    border: `1px solid ${active ? 'rgba(255,0,132,0.3)' : BORDER}`,
                    color: active ? ACCENT : DIM,
                    fontSize: 7, textAlign: 'left', letterSpacing: '0.12em',
                    fontFamily: MONO, textTransform: 'uppercase',
                    transition: 'all 0.12s',
                  }}>
                  {labels[m]}
                </button>
              );
            })}
          </div>

          <button onClick={onToggleGeoPanel}
            style={{
              width: '100%', marginTop: 5, padding: '4px 0', borderRadius: 1,
              cursor: 'pointer', fontSize: 7, letterSpacing: '0.1em',
              textTransform: 'uppercase', textAlign: 'center',
              fontFamily: MONO,
              background: geoPanelOpen ? 'rgba(255,0,132,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${geoPanelOpen ? 'rgba(255,0,132,0.25)' : BORDER}`,
              color: geoPanelOpen ? ACCENT : DIM,
              transition: 'all 0.12s',
            }}>
            PARAMS
          </button>
        </div>

        <div style={{ height: 12 }} />
      </div>
    </div>
  );
};
