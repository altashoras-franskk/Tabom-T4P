// ─── Layer Panel ──────────────────────────────────────────────────────────
import React from 'react';
import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import type { LayerState, BlendMode } from '../../sim/metaart/metaArtTypes';

interface Props {
  layers: LayerState[];
  onChange: (id: string, patch: Partial<LayerState>) => void;
  onClearLayer: (id: string) => void;
}

const BLEND_OPTIONS: BlendMode[] = ['normal', 'add', 'multiply', 'screen', 'overlay'];

export const LayerPanel: React.FC<Props> = ({ layers, onChange, onClearLayer }) => (
  <div className="flex flex-col gap-0 overflow-y-auto" style={{ background: '#000', fontFamily: "'IBM Plex Mono', monospace" }}>
    <div style={{ padding: '10px 12px 8px', fontSize: 8, letterSpacing: '0.16em',
      color: '#ff0084', textTransform: 'uppercase', borderBottom: '1px dashed rgba(255,255,255,0.06)' }}>
      LAYER STACK
    </div>

    {[...layers].reverse().map(layer => (
      <div key={layer.id}
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: layer.visible ? 'transparent' : 'rgba(0,0,0,0.3)',
          opacity: layer.visible ? 1 : 0.5,
        }}>

        {/* Row 1: visibility, lock, name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <button
            onClick={() => onChange(layer.id, { visible: !layer.visible })}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: layer.visible ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)', padding: 0 }}>
            {layer.visible ? <Eye size={11} strokeWidth={1.5} /> : <EyeOff size={11} strokeWidth={1.5} />}
          </button>
          <button
            onClick={() => onChange(layer.id, { locked: !layer.locked })}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: layer.locked ? 'rgba(255,180,60,0.7)' : 'rgba(255,255,255,0.2)', padding: 0 }}>
            {layer.locked ? <Lock size={11} strokeWidth={1.5} /> : <Unlock size={11} strokeWidth={1.5} />}
          </button>
          <span style={{ flex: 1, fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>
            {layer.name}
          </span>
          <button
            onClick={() => onClearLayer(layer.id)}
            title="Limpar camada"
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.18)', fontSize: 9, padding: 0 }}>
            clr
          </button>
        </div>

        {/* Row 2: opacity + blend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', width: 14 }}>
            {Math.round(layer.opacity * 100)}
          </span>
          <input type="range" min={0} max={1} step={0.01}
            value={layer.opacity}
            onChange={e => onChange(layer.id, { opacity: parseFloat(e.target.value) })}
            style={{ flex: 1, cursor: 'pointer', accentColor: 'rgba(255,255,255,0.4)' }} />
          <select
            value={layer.blendMode}
            onChange={e => onChange(layer.id, { blendMode: e.target.value as BlendMode })}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)', fontSize: 8, padding: '1px 3px', borderRadius: 3,
              cursor: 'pointer', width: 58,
            }}>
            {BLEND_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>
    ))}
  </div>
);