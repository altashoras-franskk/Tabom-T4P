// ─── Powers Panel — aesthetic interventions & species control ─────────────────
import React, { useState } from 'react';
import type { DNA, AgentShape, GuideLineType, ToolId } from '../../sim/metaart/metaArtTypes';
import { BRUSH_TEXTURE_PRESETS } from '../../sim/metaart/metaArtTypes';

export interface PowersPanelProps {
  dna: DNA;
  palette: string[];
  // Recolor a specific species
  onRecolorSpecies: (species: number, hex: string) => void;
  // Recolor ALL agents from a fresh palette
  onRandomPalette: () => void;
  // Change shape of all agents instantly
  onSetAllShape: (shape: AgentShape) => void;
  // Brush texture for all brush agents
  brushTextureId: string;
  onBrushTexture: (id: string) => void;
  // DNA gene injections
  onDNAGene: (key: string, val: number) => void;
  // Intervenções rápidas (accept intensity)
  onChaosInject: (k: number) => void;
  onFreezeAll: (k: number) => void;
  onPulseAll: (k: number) => void;
  onScatterAll: (k: number) => void;
  onShockAll: (k: number) => void;
  onMagnetizeAll: (k: number) => void;
  onImplodeAll: (k: number) => void;
  onTurboAll: (k: number) => void;
  // Collective color shift
  onHueRotate: (deg: number) => void;
  // Saturation/Luminance shift all agents
  onSatShift: (delta: number) => void;
  onLitShift: (delta: number) => void;
  // Size pulse all agents
  onSizeAll: (mul: number) => void;
  // Respawn with current DNA (new positions)
  onRespawn: () => void;
  // Guide aesthetics and guide powers
  guideStroke: number;
  guideCurvature: number;
  guideColor: string;
  guideLineMode: GuideLineType;
  guidePathMode: 'stream' | 'orbit' | 'shock';
  autoGuidesPreset: boolean;
  autoGuidesRandom: boolean;
  onGuideStroke: (v: number) => void;
  onGuideCurvature: (v: number) => void;
  onGuideColor: (hex: string) => void;
  onGuideLineMode: (m: GuideLineType) => void;
  onGuidePathMode: (m: 'stream' | 'orbit' | 'shock') => void;
  onGuideClear: () => void;
  onGuideGenerate: () => void;
  onGuideStyleRandom: () => void;
  onToggleAutoGuidesPreset: () => void;
  onToggleAutoGuidesRandom: () => void;
  onExplodeAll: (k: number) => void;
  onBlackHoleAll: (k: number) => void;
  onHarmonizeAll: (k: number) => void;
  onVortexAll: (k: number) => void;
  onRepelAll: (k: number) => void;
  onAttractAll: (k: number) => void;
  onCalmAll: (k: number) => void;
  onFluxAll: (k: number) => void;
  onActivateBrush: (toolId: ToolId, pressure: number, size: number) => void;
}

const SPECIES_NAMES = ['Luminoso', 'Sombra', 'Fluxo', 'Expansão', 'Magnético', 'Glitch'];
const SHAPES: { id: AgentShape; icon: string; label: string }[] = [
  { id: 'circle',   icon: '●', label: 'Ponto' },
  { id: 'brush',    icon: '𝓑', label: 'Pincel' },
  { id: 'square',   icon: '■', label: 'Quad.' },
  { id: 'diamond',  icon: '◆', label: 'Diam.' },
  { id: 'triangle', icon: '▲', label: 'Tri.' },
  { id: 'star',     icon: '★', label: 'Estrela' },
];

const panelSty: React.CSSProperties = {
  padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
  fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(255,255,255,0.75)',
  overflowY: 'auto', background: '#000',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 7, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.14em',
  textTransform: 'uppercase', marginBottom: 5, fontFamily: "'IBM Plex Mono', monospace",
};

function ActionBtn({
  icon, label, color, desc, onClick,
}: { icon: string; label: string; color: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={desc}
      style={{
        flex: 1, padding: '7px 4px', borderRadius: 4, cursor: 'pointer',
        border: `1px solid ${color}33`, background: `${color}11`,
        color: `${color}cc`, fontSize: 8, letterSpacing: '0.06em',
        textTransform: 'uppercase', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 3, transition: 'all 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = `${color}22`)}
      onMouseLeave={e => (e.currentTarget.style.background = `${color}11`)}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export const PowersPanel: React.FC<PowersPanelProps> = ({
  dna, palette, onRecolorSpecies, onRandomPalette,
  onSetAllShape, brushTextureId, onBrushTexture,
  onDNAGene, onChaosInject, onFreezeAll, onPulseAll, onScatterAll, onShockAll, onMagnetizeAll, onImplodeAll, onTurboAll,
  onHueRotate, onSatShift, onLitShift, onSizeAll, onRespawn,
  guideStroke, guideCurvature, guideColor, guideLineMode, guidePathMode, autoGuidesPreset, autoGuidesRandom,
  onGuideStroke, onGuideCurvature, onGuideColor, onGuideLineMode, onGuidePathMode, onGuideClear, onGuideGenerate, onGuideStyleRandom,
  onToggleAutoGuidesPreset, onToggleAutoGuidesRandom, onExplodeAll, onBlackHoleAll, onHarmonizeAll, onVortexAll, onRepelAll, onAttractAll, onCalmAll, onFluxAll, onActivateBrush,
}) => {
  const [hueRotDeg, setHueRotDeg] = useState(30);
  const [quickForce, setQuickForce] = useState(2.4);
  const [liveForce, setLiveForce] = useState(2.8);
  const quickBrush = (toolId: ToolId) => onActivateBrush(toolId, quickForce, 190);
  const liveBrush = (toolId: ToolId) => onActivateBrush(toolId, liveForce, 220);

  return (
    <div style={panelSty}>
      {/* Header */}
      <div style={{ fontSize: 8, color: '#ff0084', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 400, fontFamily: "'IBM Plex Mono', monospace" }}>
        POWERS & INTERVENTIONS
      </div>

      {/* ── Intervenções Rápidas ──────────────────────────────────────── */}
      <div>
        <div style={sectionLabel}>Intervenções Rápidas</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ ...sectionLabel, marginBottom: 0, minWidth: 70 }}>Força</span>
          <input type="range" min={1.4} max={5} step={0.1} value={quickForce}
            onChange={e => setQuickForce(parseFloat(e.target.value))}
            style={{ flex: 1, cursor: 'pointer', accentColor: '#ff7a60' }} />
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', minWidth: 28 }}>{quickForce.toFixed(1)}x</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <ActionBtn icon="💥" label="Caos" color="#ff6040" desc="Injeta entropia máxima por 2s" onClick={() => { onChaosInject(quickForce); quickBrush('burst'); }} />
          <ActionBtn icon="❄" label="Freeze" color="#60c0ff" desc="Congela todos os agentes" onClick={() => { onFreezeAll(quickForce); quickBrush('freeze'); }} />
          <ActionBtn icon="⚡" label="Pulso" color="#ffd060" desc="Explosão de velocidade em todos" onClick={() => { onPulseAll(quickForce); quickBrush('burst'); }} />
          <ActionBtn icon="💫" label="Scatter" color="#c060ff" desc="Dispersão centrífuga" onClick={() => { onScatterAll(quickForce); quickBrush('scatter_burst'); }} />
          <ActionBtn icon="🌊" label="Shock" color="#60d0ff" desc="Onda de choque em anel" onClick={() => { onShockAll(quickForce); quickBrush('channel'); }} />
          <ActionBtn icon="🧲" label="Magnet" color="#80ffb0" desc="Magnetiza trajetórias" onClick={() => { onMagnetizeAll(quickForce); quickBrush('attract'); }} />
          <ActionBtn icon="🕳" label="Implode" color="#b080ff" desc="Colapso para o centro" onClick={() => { onImplodeAll(quickForce); quickBrush('black_hole'); }} />
          <ActionBtn icon="🚀" label="Turbo" color="#ffb060" desc="Impulso de velocidade global" onClick={() => { onTurboAll(quickForce); quickBrush('burst'); }} />
          <ActionBtn icon="🔄" label="Respawn" color="#60ff90" desc="Respawna com novo padrão" onClick={onRespawn} />
        </div>
      </div>

      {/* ── Força Live (consolidado da sidebar) ─────────────────────── */}
      <div>
        <div style={sectionLabel}>Força Live</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ ...sectionLabel, marginBottom: 0, minWidth: 70 }}>Força</span>
          <input type="range" min={1.6} max={6} step={0.1} value={liveForce}
            onChange={e => setLiveForce(parseFloat(e.target.value))}
            style={{ flex: 1, cursor: 'pointer', accentColor: '#ff55b0' }} />
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', minWidth: 28 }}>{liveForce.toFixed(1)}x</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          <button onClick={() => { onExplodeAll(liveForce); liveBrush('burst'); }} style={{ padding: '6px 4px', borderRadius: 3, cursor: 'pointer', border: '1px solid rgba(255,140,120,0.35)', background: 'rgba(255,110,80,0.12)', color: '#ffb09a', fontSize: 8, textTransform: 'uppercase' }}>Explodir</button>
          <button onClick={() => { onBlackHoleAll(liveForce); liveBrush('black_hole'); }} style={{ padding: '6px 4px', borderRadius: 3, cursor: 'pointer', border: '1px solid rgba(180,120,255,0.35)', background: 'rgba(160,80,255,0.14)', color: '#d3b2ff', fontSize: 8, textTransform: 'uppercase' }}>Buraco</button>
          <button onClick={() => { onHarmonizeAll(liveForce); liveBrush('freeze'); }} style={{ padding: '6px 4px', borderRadius: 3, cursor: 'pointer', border: '1px solid rgba(120,220,170,0.35)', background: 'rgba(80,190,140,0.12)', color: '#a8e7c9', fontSize: 8, textTransform: 'uppercase' }}>Harmonia</button>
          <button onClick={() => { onVortexAll(liveForce); liveBrush('vortex'); }} style={{ padding: '6px 4px', borderRadius: 3, cursor: 'pointer', border: '1px solid rgba(120,190,255,0.35)', background: 'rgba(80,140,255,0.12)', color: '#b9d4ff', fontSize: 8, textTransform: 'uppercase' }}>Vórtice</button>
          <button onClick={() => { onRepelAll(liveForce); liveBrush('repel'); }} style={{ padding: '6px 4px', borderRadius: 3, cursor: 'pointer', border: '1px solid rgba(255,160,120,0.35)', background: 'rgba(255,120,80,0.12)', color: '#ffc2a8', fontSize: 8, textTransform: 'uppercase' }}>Repelir</button>
          <button onClick={() => { onAttractAll(liveForce); liveBrush('attract'); }} style={{ padding: '6px 4px', borderRadius: 3, cursor: 'pointer', border: '1px solid rgba(120,220,255,0.35)', background: 'rgba(80,180,255,0.12)', color: '#b6e3ff', fontSize: 8, textTransform: 'uppercase' }}>Atrair</button>
          <button onClick={() => { onCalmAll(liveForce); liveBrush('freeze'); }} style={{ padding: '6px 4px', borderRadius: 3, cursor: 'pointer', border: '1px solid rgba(160,220,180,0.35)', background: 'rgba(120,200,150,0.12)', color: '#c0f0d2', fontSize: 8, textTransform: 'uppercase' }}>Calma</button>
          <button onClick={() => { onFluxAll(liveForce); liveBrush('channel'); }} style={{ padding: '6px 4px', borderRadius: 3, cursor: 'pointer', border: '1px solid rgba(220,160,255,0.35)', background: 'rgba(200,120,255,0.12)', color: '#e0c5ff', fontSize: 8, textTransform: 'uppercase' }}>Fluxo</button>
        </div>
      </div>

      {/* ── Cor por Espécie ──────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={sectionLabel}>Cor por Espécie</span>
          <button onClick={onRandomPalette}
            style={{
              fontSize: 8, padding: '2px 8px', borderRadius: 3, cursor: 'pointer',
              border: '1px solid rgba(255,200,100,0.3)', background: 'rgba(255,200,100,0.08)',
              color: 'rgba(255,210,120,0.8)', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
            🎲 Rand
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {SPECIES_NAMES.map((name, i) => {
            const currentColor = palette[i % palette.length] ?? '#888888';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: currentColor,
                  flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)',
                }} />
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', flex: 1 }}>
                  {i}· {name}
                </span>
                <input
                  type="color"
                  value={currentColor.startsWith('#') ? currentColor : '#888888'}
                  onChange={e => onRecolorSpecies(i, e.target.value)}
                  style={{
                    width: 28, height: 20, padding: 0, border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 3, cursor: 'pointer', background: 'none',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Rotação de Matiz global ──────────────────────────────────── */}
      <div>
        <div style={sectionLabel}>Rotação de Matiz (Todos)</div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <input type="range" min={0} max={180} step={5} value={hueRotDeg}
            onChange={e => setHueRotDeg(parseInt(e.target.value))}
            style={{ flex: 1, cursor: 'pointer', accentColor: '#ff80c0' }} />
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', minWidth: 30 }}>
            +{hueRotDeg}°
          </span>
          <button onClick={() => onHueRotate(hueRotDeg)}
            style={{
              padding: '4px 10px', borderRadius: 3, cursor: 'pointer',
              border: '1px solid rgba(255,100,180,0.3)', background: 'rgba(255,100,180,0.1)',
              color: 'rgba(255,150,200,0.9)', fontSize: 8, letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
            Apply
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          {[15, 30, 60, 90, 120, 180].map(deg => (
            <button key={deg} onClick={() => onHueRotate(deg)}
              style={{
                padding: '3px 7px', borderRadius: 3, cursor: 'pointer', fontSize: 7,
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.5)',
              }}>
              +{deg}°
            </button>
          ))}
        </div>
      </div>

      {/* ── Luminância / Saturação ───────────────────────────────────── */}
      <div>
        <div style={sectionLabel}>Luminância & Saturação</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { icon: '🌑', label: '-Sat', color: '#8080a0', onClick: () => onSatShift(-0.15) },
            { icon: '🎨', label: '+Sat', color: '#ff80ff', onClick: () => onSatShift(+0.15) },
            { icon: '🌙', label: '-Lit', color: '#404060', onClick: () => onLitShift(-0.10) },
            { icon: '☀', label: '+Lit', color: '#ffe060', onClick: () => onLitShift(+0.10) },
          ].map(b => (
            <button key={b.label} onClick={b.onClick}
              style={{
                flex: 1, padding: '5px 2px', borderRadius: 3, cursor: 'pointer',
                border: `1px solid ${b.color}33`, background: `${b.color}11`,
                color: `${b.color}cc`, fontSize: 7, letterSpacing: '0.04em',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
              <span style={{ fontSize: 12 }}>{b.icon}</span>
              <span style={{ textTransform: 'uppercase' }}>{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tamanho Global ───────────────────────────────────────────── */}
      <div>
        <div style={sectionLabel}>Tamanho Global</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { label: '×0.5', mul: 0.5 },
            { label: '×0.75', mul: 0.75 },
            { label: '×1.25', mul: 1.25 },
            { label: '×2', mul: 2.0 },
          ].map(b => (
            <button key={b.label} onClick={() => onSizeAll(b.mul)}
              style={{
                flex: 1, padding: '5px 2px', borderRadius: 3, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.55)', fontSize: 8, fontFamily: 'monospace',
              }}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Forma Global ─────────────────────────────────────────────── */}
      <div>
        <div style={sectionLabel}>Forma Global</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {SHAPES.map(s => (
            <button key={s.id} onClick={() => onSetAllShape(s.id)}
              style={{
                padding: '5px 3px', borderRadius: 3, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.6)', fontSize: 8,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
              <span style={{ fontSize: 13 }}>{s.icon}</span>
              <span style={{ fontSize: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Textura do Pincel ────────────────────────────────────────── */}
      <div>
        <div style={sectionLabel}>Textura do Pincel (Global)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
          {BRUSH_TEXTURE_PRESETS.map(bp => {
            const active = brushTextureId === bp.id;
            return (
              <button key={bp.id} onClick={() => onBrushTexture(bp.id)}
                title={bp.label}
                style={{
                  padding: '4px 2px', borderRadius: 3, cursor: 'pointer',
                  background: active ? 'rgba(255,200,80,0.16)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(255,200,80,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  color: active ? 'rgba(255,210,100,0.9)' : 'rgba(255,255,255,0.35)',
                  fontSize: 7, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 1,
                }}>
                <span style={{ fontSize: 11, lineHeight: 1 }}>{bp.emoji}</span>
                <span style={{ fontSize: 5, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {bp.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Injeções de Gene ─────────────────────────────────────────── */}
      <div>
        <div style={sectionLabel}>Guide Powers</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          <ActionBtn icon="🧭" label="Gerar" color="#60b0ff" desc="Gera guias criativos automáticos" onClick={onGuideGenerate} />
          <ActionBtn icon="✂" label="Limpar" color="#ff7070" desc="Remove todos os guias e canais" onClick={onGuideClear} />
          <ActionBtn icon="🎛" label="Style" color="#b080ff" desc="Randomiza cor, espessura e curvatura dos guias" onClick={onGuideStyleRandom} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <span style={{ ...sectionLabel, marginBottom: 0, minWidth: 66 }}>Cor</span>
          <input
            type="color"
            value={guideColor}
            onChange={e => onGuideColor(e.target.value)}
            style={{ width: 28, height: 20, padding: 0, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 3, cursor: 'pointer', background: 'none' }}
          />
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{guideColor}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ ...sectionLabel, marginBottom: 0, minWidth: 66 }}>Espessura</span>
          <input type="range" min={0.6} max={3.2} step={0.05} value={guideStroke}
            onChange={e => onGuideStroke(parseFloat(e.target.value))}
            style={{ flex: 1, cursor: 'pointer', accentColor: '#60b0ff' }} />
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', minWidth: 30, fontFamily: 'monospace' }}>{guideStroke.toFixed(2)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ ...sectionLabel, marginBottom: 0, minWidth: 66 }}>Curvatura</span>
          <input type="range" min={0} max={1} step={0.01} value={guideCurvature}
            onChange={e => onGuideCurvature(parseFloat(e.target.value))}
            style={{ flex: 1, cursor: 'pointer', accentColor: '#b080ff' }} />
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', minWidth: 30, fontFamily: 'monospace' }}>{guideCurvature.toFixed(2)}</span>
        </div>

        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={onToggleAutoGuidesPreset}
            style={{
              flex: 1, padding: '4px 6px', borderRadius: 3, cursor: 'pointer', fontSize: 7,
              border: `1px solid ${autoGuidesPreset ? 'rgba(96,176,255,0.45)' : 'rgba(255,255,255,0.1)'}`,
              background: autoGuidesPreset ? 'rgba(96,176,255,0.12)' : 'rgba(255,255,255,0.03)',
              color: autoGuidesPreset ? 'rgba(160,220,255,0.95)' : 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
            Preset Auto {autoGuidesPreset ? 'ON' : 'OFF'}
          </button>
          <button onClick={onToggleAutoGuidesRandom}
            style={{
              flex: 1, padding: '4px 6px', borderRadius: 3, cursor: 'pointer', fontSize: 7,
              border: `1px solid ${autoGuidesRandom ? 'rgba(176,128,255,0.45)' : 'rgba(255,255,255,0.1)'}`,
              background: autoGuidesRandom ? 'rgba(176,128,255,0.12)' : 'rgba(255,255,255,0.03)',
              color: autoGuidesRandom ? 'rgba(220,200,255,0.95)' : 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
            Random Auto {autoGuidesRandom ? 'ON' : 'OFF'}
          </button>
        </div>

        <div style={{ marginTop: 7 }}>
          <div style={{ ...sectionLabel, marginBottom: 4 }}>Modo Linha</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3 }}>
            {([
              ['flow', 'Flow'], ['pinch', 'Pinch'], ['shear', 'Shear'], ['barrier', 'Barra'], ['spiral', 'Spiral'],
              ['funnel', 'Funil'], ['repulsor', 'Repel'], ['attractor', 'Atrai'], ['wave', 'Onda'], ['orbit_line', 'Órbita'],
            ] as [GuideLineType, string][]).map(([id, tx]) => (
              <button key={id} onClick={() => onGuideLineMode(id)} style={{
                padding: '3px 1px', borderRadius: 3, cursor: 'pointer', fontSize: 7,
                border: `1px solid ${guideLineMode === id ? 'rgba(255,0,132,0.4)' : 'rgba(255,255,255,0.1)'}`,
                background: guideLineMode === id ? 'rgba(255,0,132,0.12)' : 'rgba(255,255,255,0.03)',
                color: guideLineMode === id ? 'rgba(255,180,220,0.95)' : 'rgba(255,255,255,0.45)',
              }}>{tx}</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 7 }}>
          <div style={{ ...sectionLabel, marginBottom: 4 }}>Modo Canal</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
            {([
              ['stream', 'Fluxo'],
              ['orbit', 'Órbita'],
              ['shock', 'Pulso'],
            ] as const).map(([id, tx]) => (
              <button key={id} onClick={() => onGuidePathMode(id)} style={{
                padding: '4px 2px', borderRadius: 3, cursor: 'pointer', fontSize: 7,
                border: `1px solid ${guidePathMode === id ? 'rgba(255,0,132,0.4)' : 'rgba(255,255,255,0.1)'}`,
                background: guidePathMode === id ? 'rgba(255,0,132,0.12)' : 'rgba(255,255,255,0.03)',
                color: guidePathMode === id ? 'rgba(255,180,220,0.95)' : 'rgba(255,255,255,0.45)',
              }}>{tx}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Injeções de Gene ─────────────────────────────────────────── */}
      <div>
        <div style={sectionLabel}>Injeções de Gene</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { label: 'Entropia MAX', icon: '🔥', key: 'entropy', val: 0.95, color: '#ff6040' },
            { label: 'Entropia MIN', icon: '🧊', key: 'entropy', val: 0.05, color: '#60c0ff' },
            { label: 'Fluxo MAX',    icon: '🌊', key: 'flow',    val: 0.95, color: '#40b0ff' },
            { label: 'Cohesão MAX',  icon: '🔵', key: 'coherence', val: 0.95, color: '#80ffb0' },
            { label: 'Isolamento MAX', icon: '🚧', key: 'isolation', val: 1.0, color: '#ff8040' },
            { label: 'Isolamento OFF', icon: '🌐', key: 'isolation', val: 0.0, color: '#80c0ff' },
          ].map(inj => (
            <button key={`${inj.key}-${inj.val}`}
              onClick={() => onDNAGene(inj.key, inj.val)}
              style={{
                padding: '5px 8px', borderRadius: 4, cursor: 'pointer',
                background: `${inj.color}0d`, border: `1px solid ${inj.color}25`,
                color: `${inj.color}bb`, fontSize: 8, textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.04em',
              }}>
              <span>{inj.icon}</span>
              <span>{inj.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};