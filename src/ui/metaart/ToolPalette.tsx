// ─── Tool Palette — 16 Live Tools ─────────────────────────────────────────
import React from 'react';
import type { ToolState } from '../../sim/metaart/metaArtTypes';
import { TOOL_DEFS } from '../../sim/metaart/metaArtTools';

interface Props {
  toolState: ToolState;
  palette: string[];
  onChange: (patch: Partial<ToolState>) => void;
}

const CATEGORY_CONFIG = {
  vida:   { label: 'VIDA',  accent: '#50dc78' },
  forca:  { label: 'FORCA', accent: '#ff6040' },
  mutar:  { label: 'MUTAR', accent: '#a060ff' },
  guiar:  { label: 'GUIAR', accent: '#40b0ff' },
} as const;

const CATEGORY_ORDER = ['vida', 'forca', 'mutar', 'guiar'] as const;

export const ToolPalette: React.FC<Props> = ({ toolState, palette, onChange }) => {
  const activeTool = TOOL_DEFS.find(t => t.id === toolState.activeToolId);

  return (
    <div style={{
      width: 62, height: '100%', display: 'flex', flexDirection: 'column',
      background: 'rgba(6,6,14,0.98)', borderRight: '1px solid rgba(255,255,255,0.05)',
      overflow: 'hidden', userSelect: 'none',
    }}>
      {/* ── Tool groups ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {CATEGORY_ORDER.map(cat => {
          const cfg   = CATEGORY_CONFIG[cat];
          const tools = TOOL_DEFS.filter(t => t.category === cat);
          return (
            <div key={cat}>
              {/* Category header */}
              <div style={{
                padding: '4px 0 3px',
                textAlign: 'center',
                fontSize: 6,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: cfg.accent + '88',
                borderBottom: `1px solid ${cfg.accent}22`,
                borderTop: '1px solid rgba(255,255,255,0.03)',
              }}>
                {cfg.label}
              </div>
              {/* Tools in 2-col grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {tools.map(tool => {
                  const isActive = toolState.activeToolId === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => onChange({ activeToolId: tool.id })}
                      title={`${tool.name} — ${tool.description}`}
                      style={{
                        padding: '7px 2px 5px',
                        border: 'none',
                        cursor: 'pointer',
                        background: isActive ? cfg.accent + '18' : 'transparent',
                        borderBottom: isActive
                          ? `2px solid ${cfg.accent}88`
                          : '2px solid transparent',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 2,
                        transition: 'all 0.1s',
                        color: isActive ? cfg.accent : 'rgba(255,255,255,0.3)',
                      }}
                      onMouseEnter={e => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                      }}
                      onMouseLeave={e => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: 13, lineHeight: 1 }}>{tool.icon}</span>
                      <span style={{
                        fontSize: 6, lineHeight: 1.2, textAlign: 'center',
                        letterSpacing: '0.04em', textTransform: 'uppercase',
                        opacity: isActive ? 1 : 0.5,
                        wordBreak: 'break-word', maxWidth: 26,
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
      </div>

      {/* ── Color swatches ───────────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '5px 4px',
      }}>
        <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em',
          textTransform: 'uppercase', textAlign: 'center', marginBottom: 3 }}>COR</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {palette.slice(0, 6).map((color, i) => (
            <button key={i} onClick={() => onChange({ colorIndex: i })}
              title={color}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 2, background: color,
                border: 'none', cursor: 'pointer',
                outline: toolState.colorIndex === i
                  ? '2px solid rgba(255,255,255,0.7)'
                  : '1px solid rgba(255,255,255,0.08)',
                outlineOffset: 1,
              }} />
          ))}
        </div>
      </div>

      {/* ── Active tool params ────────────────────────────────────────────── */}
      {activeTool && activeTool.params.length > 0 && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '5px 5px 6px',
          background: 'rgba(255,255,255,0.02)',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 6.5, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em',
            textTransform: 'uppercase', textAlign: 'center', marginBottom: 4,
          }}>
            {activeTool.name}
          </div>
          {activeTool.params.map(param => (
            <div key={param.key} style={{ marginBottom: 5 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 2,
              }}>
                <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>
                  {param.label}
                </span>
                <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
                  {((toolState[param.key] as number) ?? param.min).toFixed(
                    param.step < 0.1 ? 2 : 0
                  )}
                </span>
              </div>
              <input
                type="range"
                min={param.min} max={param.max} step={param.step}
                value={(toolState[param.key] as number) ?? param.min}
                onChange={e => onChange({ [param.key]: parseFloat(e.target.value) })}
                style={{
                  width: '100%', cursor: 'pointer',
                  accentColor: CATEGORY_CONFIG[activeTool.category].accent + 'cc',
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
