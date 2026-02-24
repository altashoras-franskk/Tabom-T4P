// ─── Controller Cursor — crosshair overlay ───────────────────────────────────
import React from 'react';

interface Props {
  /** ref to the div element — parent mutates style.left/top directly in RAF */
  cursorRef: React.RefObject<HTMLDivElement | null>;
  /** Color accent for the crosshair */
  color?: string;
}

export const ControllerCursor: React.FC<Props> = ({ cursorRef, color = 'rgba(80,230,140,0.92)' }) => {
  return (
    <div
      ref={cursorRef}
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        display: 'none',            // hidden by default; shown in RAF when controller active
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
      }}
    >
      {/* Outer ring */}
      <div style={{
        position: 'absolute',
        width: 28, height: 28,
        left: -14, top: -14,
        borderRadius: '50%',
        border: `1px solid ${color}`,
        opacity: 0.6,
      }} />
      {/* Cross */}
      <div style={{ position: 'absolute', left: -10, top: -0.5, width: 20, height: 1, background: color }} />
      <div style={{ position: 'absolute', top: -10, left: -0.5, height: 20, width: 1, background: color }} />
      {/* Center dot */}
      <div style={{
        position: 'absolute', width: 4, height: 4,
        left: -2, top: -2, borderRadius: '50%', background: color,
      }} />
    </div>
  );
};
