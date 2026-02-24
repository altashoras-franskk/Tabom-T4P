// ── ZoomControls — small floating zoom UI for canvas labs ─────────────────────
import React from 'react';

interface ZoomControlsProps {
  zoom:       number;
  onZoomIn:   () => void;
  onZoomOut:  () => void;
  onReset:    () => void;
  className?: string;
  accentColor?: string;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom, onZoomIn, onZoomOut, onReset,
  className = '',
  accentColor = 'rgba(255,255,255,0.45)',
}) => {
  const pct = Math.round(zoom * 100);
  return (
    <div
      className={`flex items-center gap-0.5 rounded-lg border px-1.5 py-0.5 backdrop-blur-sm select-none ${className}`}
      style={{ background: 'rgba(4,6,14,0.75)', borderColor: 'rgba(255,255,255,0.07)' }}
      title="Scroll para zoom · Botão do meio para mover"
    >
      <button
        onClick={onZoomOut}
        className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/8 transition-colors"
        style={{ color: 'rgba(255,255,255,0.38)', fontSize: 14, fontFamily: 'monospace', lineHeight: 1 }}
        title="Zoom out  [−]"
      >−</button>

      <button
        onClick={onReset}
        className="px-1 text-center rounded hover:bg-white/5 transition-colors"
        style={{
          color: zoom === 1 ? 'rgba(255,255,255,0.22)' : accentColor,
          fontSize: 6.5, fontFamily: 'monospace',
          minWidth: 34, letterSpacing: '0.04em',
        }}
        title="Resetar zoom [clique]"
      >
        {pct}%
      </button>

      <button
        onClick={onZoomIn}
        className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/8 transition-colors"
        style={{ color: 'rgba(255,255,255,0.38)', fontSize: 14, fontFamily: 'monospace', lineHeight: 1 }}
        title="Zoom in  [+]"
      >+</button>

      {/* Tiny hint */}
      <span
        className="ml-0.5 hidden sm:block"
        style={{ color: 'rgba(255,255,255,0.10)', fontSize: 5.5, fontFamily: 'monospace' }}
      >⇕scroll</span>
    </div>
  );
};
