// ─── Controller Performance HUD ─────────────────────────────────────────────
import React from 'react';
import type { ControllerFrameState } from './types';

interface Props {
  ctrl: ControllerFrameState;
  toolName: string;
  presetName: string;
  radius: number;          // 0..1
  intensity: number;       // 0..1 (RT)
  quantaCount?: number;
  showHUD: boolean;
}

function Bar({ value, color = 'rgba(80,230,140,0.8)', label }: { value: number; color?: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
      <span style={{ width: 60, fontSize: 9, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right' }}>
        {label}
      </span>
      <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <div style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

export const ControllerHUD: React.FC<Props> = ({
  ctrl, toolName, presetName, radius, intensity, quantaCount, showHUD,
}) => {
  if (!ctrl.connected || !showHUD) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 48, left: 10,
      background: 'rgba(4,6,12,0.82)',
      border: '1px solid rgba(80,230,140,0.18)',
      borderRadius: 6, padding: '8px 12px',
      pointerEvents: 'none', zIndex: 40,
      backdropFilter: 'blur(4px)',
    }}>
      {/* Gamepad indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(80,230,140,0.8)', flexShrink: 0 }} />
        <span style={{ fontSize: 8, color: 'rgba(80,230,140,0.7)', letterSpacing: '0.1em' }}>
          {ctrl.name.slice(0, 20)}
        </span>
      </div>

      {/* Tool */}
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.06em', marginBottom: 6 }}>
        {toolName.toUpperCase()}
      </div>

      <Bar value={intensity} color="rgba(80,230,140,0.8)" label="RT" />
      <Bar value={ctrl.triggers.lt} color="rgba(200,100,80,0.8)" label="LT" />
      <Bar value={radius} color="rgba(140,160,255,0.8)" label="RAIO" />

      {/* Preset */}
      <div style={{ marginTop: 6, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
        {presetName.slice(0, 22)}
      </div>
      {quantaCount !== undefined && (
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', marginTop: 2 }}>
          Q {quantaCount}
        </div>
      )}

      {/* Button hints */}
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[
          ['LB / RB', 'ferramenta'],
          ['D ◄ ►', 'preset'],
          ['Y', 'snapshot'],
          ['A', 'HUD on/off'],
          ['SEL', 'cinem.'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <span style={{ fontSize: 7, color: 'rgba(200,180,100,0.7)', minWidth: 36, textAlign: 'right', fontFamily: 'monospace' }}>{k}</span>
            <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
