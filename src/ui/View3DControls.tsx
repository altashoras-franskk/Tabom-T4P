// ── View3DControls — 3D viewport control strip ────────────────────────────────
import React from 'react';
import { RotateCcw } from 'lucide-react';
import { View3DConfig, DEFAULT_VIEW3D, clamp3d } from '../render/Renderer3D';
import type { LabId } from './TopHUD';

interface ZVarDef { id: string; label: string }

const Z_VARS: Record<LabId, ZVarDef[]> = {
  complexityLife: [
    { id: 'speed',  label: 'Velocidade' },
    { id: 'energy', label: 'Energia'    },
    { id: 'geneA',  label: 'Gene A'     },
    { id: 'age',    label: 'Idade'      },
  ],
  sociogenesis: [
    { id: 'speed',    label: 'Velocidade' },
    { id: 'prestige', label: 'Prestígio'  },
    { id: 'meme',     label: 'Meme'       },
  ],
  psycheLab: [
    { id: 'coherence',  label: 'Coerência'  },
    { id: 'arousal',    label: 'Excitação'  },
    { id: 'charge',     label: 'Carga'      },
    { id: 'inhibition', label: 'Inibição'   },
    { id: 'valence',    label: 'Valência'   },
  ],
};

const COLOR_SCHEMES = [
  { id: 'default',   label: 'Default'   },
  { id: 'topology',  label: 'Topologia' },
  { id: 'energy',    label: 'Energia'   },
  { id: 'valence',   label: 'Valência'  },
  { id: 'coherence', label: 'Coerência' },
] as const;

interface Props {
  activeLab:  LabId;
  config:     View3DConfig;
  onChange:   (patch: Partial<View3DConfig>) => void;
  onReset:    () => void;
}

// Small toggle button
const TB: React.FC<{ on: boolean; label: string; color: string; onClick: () => void }> = ({
  on, label, color, onClick,
}) => (
  <button
    onClick={onClick}
    className={`text-[8px] font-mono px-1.5 py-0.5 transition-all ${
      on ? '' : 'text-white/30 hover:text-white/50'
    }`}
    style={on ? { color, border: `1px dashed ${color}44`, background: color + '0c' } : { border: '1px dashed transparent' }}
  >
    {label}
  </button>
);

export const View3DControls: React.FC<Props> = ({ activeLab, config, onChange, onReset }) => {
  const zVars = Z_VARS[activeLab] ?? Z_VARS.complexityLife;
  const isPsyche = activeLab === 'psycheLab';

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto
        flex items-center gap-2.5 px-3 py-2"
      style={{ background: 'rgba(0,0,0,0.94)', border: '1px dashed rgba(255,255,255,0.06)', flexWrap: 'wrap', maxWidth: '90vw' }}
    >
      {/* Z var */}
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] uppercase tracking-widest text-white/25">Altura</span>
        <select
          value={config.zVar}
          onChange={e => onChange({ zVar: e.target.value })}
          className="text-white/70 text-[9px] font-mono px-1.5 py-1 focus:outline-none cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.06)' }}
        >
          {zVars.map(v => (
            <option key={v.id} value={v.id} className="bg-[#07050e]">{v.label}</option>
          ))}
        </select>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Z scale */}
      <div className="flex items-center gap-2">
        <span className="text-[8px] uppercase tracking-widest text-white/25">Z</span>
        <input
          type="range" min={0.1} max={1.4} step={0.05}
          value={config.zScale}
          onChange={e => onChange({ zScale: parseFloat(e.target.value) })}
          className="w-16 h-px bg-white/15 appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white/60
            [&::-webkit-slider-thumb]:bg-purple-300/80"
        />
        <span className="text-[9px] font-mono text-white/35 w-6">{config.zScale.toFixed(2)}</span>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Point size */}
      <div className="flex items-center gap-2">
        <span className="text-[8px] uppercase tracking-widest text-white/25">Pt</span>
        <input
          type="range" min={2} max={12} step={0.5}
          value={config.ptSize ?? 5.5}
          onChange={e => onChange({ ptSize: parseFloat(e.target.value) })}
          className="w-12 h-px bg-white/15 appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white/60
            [&::-webkit-slider-thumb]:bg-cyan-300/80"
        />
        <span className="text-[9px] font-mono text-white/35 w-5">{(config.ptSize ?? 5.5).toFixed(1)}</span>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Mode */}
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] uppercase tracking-widest text-white/25">Modo</span>
        {(['particles','terrain','hybrid'] as const).map(m => (
          <button
            key={m}
            onClick={() => onChange({ mode: m })}
            className="text-[8px] px-2 py-0.5 font-mono transition-all"
            style={config.mode === m
              ? { background: 'rgba(139,92,246,0.10)', color: '#a78bfa', border: '1px dashed rgba(139,92,246,0.30)' }
              : { color: 'rgba(255,255,255,0.25)', border: '1px dashed transparent' }
            }
          >
            {m === 'particles' ? 'Pts' : m === 'terrain' ? 'Terreno' : 'Híbrido'}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Visual toggles */}
      <div className="flex items-center gap-1">
        <span className="text-[8px] uppercase tracking-widest text-white/25 mr-0.5">Vis</span>
        <TB on={!!config.showTrails} label="Rastros" color="#a78bfa"
          onClick={() => onChange({ showTrails: !config.showTrails })} />
        <TB on={!!config.showBonds}  label="Bonds"   color="#67e8f9"
          onClick={() => onChange({ showBonds:  !config.showBonds  })} />
      </div>

      {/* Trail length (only when trails on) */}
      {config.showTrails && (
        <>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-white/25">Len</span>
            <input
              type="range" min={4} max={32} step={2}
              value={config.trailLen ?? 14}
              onChange={e => onChange({ trailLen: parseInt(e.target.value) })}
              className="w-12 h-px bg-white/15 appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white/60
                [&::-webkit-slider-thumb]:bg-purple-300/70"
            />
            <span className="text-[9px] font-mono text-white/35 w-4">{config.trailLen ?? 14}</span>
          </div>
        </>
      )}

      {/* Color scheme (Psyche Lab only) */}
      {isPsyche && (
        <>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] uppercase tracking-widest text-white/25">Cor</span>
            <select
              value={config.colorScheme3D ?? 'default'}
              onChange={e => onChange({ colorScheme3D: e.target.value as View3DConfig['colorScheme3D'] })}
              className="text-white/70 text-[9px] font-mono px-1.5 py-1 focus:outline-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.06)' }}
            >
              {COLOR_SCHEMES.map(s => (
                <option key={s.id} value={s.id} className="bg-[#07050e]">{s.label}</option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="w-px h-4 bg-white/10" />

      {/* Reset camera */}
      <button
        onClick={onReset}
        className="flex items-center gap-1 text-[8px] text-white/30 hover:text-white/60
          transition-colors px-1 py-0.5"
        title="Resetar câmera"
      >
        <RotateCcw size={10} />
        <span>Câmera</span>
      </button>
    </div>
  );
};
