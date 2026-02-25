// ── Radial Pie Menu — instrument-grade quick-select ─────────────────────────
import React, { useEffect, useRef, useCallback, useState } from 'react';

const MONO = "'IBM Plex Mono', monospace";
const ACCENT = '#37b2da';

export interface RadialItem {
  id:    string;
  icon:  React.ReactNode;
  label: string;
  color: string;
  group?: string;
  key?:  string;
}

interface RadialMenuProps {
  open:      boolean;
  items:     RadialItem[];
  position:  { x: number; y: number };
  activeId?: string;
  onSelect:  (id: string) => void;
  onClose:   () => void;
}

const RING_R   = 110;
const ITEM_R   = 18;
const CENTER_R = 28;

export const RadialMenu: React.FC<RadialMenuProps> = ({
  open, items, position, activeId, onSelect, onClose,
}) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const dx = e.clientX - position.x;
    const dy = e.clientY - position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < CENTER_R) { setHovered(null); return; }
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2;
    const sliceAngle = (Math.PI * 2) / items.length;
    const idx = Math.round(angle / sliceAngle) % items.length;
    setHovered(items[idx]?.id ?? null);
  }, [items, position]);

  const handleMouseUp = useCallback(() => {
    if (hovered) onSelect(hovered);
    else onClose();
  }, [hovered, onSelect, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => { if (!open) setHovered(null); }, [open]);

  if (!open || items.length === 0) return null;

  const cx = Math.max(RING_R + 20, Math.min(window.innerWidth - RING_R - 20, position.x));
  const cy = Math.max(RING_R + 20, Math.min(window.innerHeight - RING_R - 20, position.y));
  const sliceAngle = (Math.PI * 2) / items.length;

  let lastGroup: string | undefined;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200]"
      style={{ cursor: 'default' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: 'rgba(2,3,8,0.72)' }} />

      {/* Ring */}
      <svg
        style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        {/* Sector divider lines */}
        {items.map((item, i) => {
          const showDivider = item.group !== undefined && item.group !== lastGroup;
          lastGroup = item.group;
          if (!showDivider) return null;
          const a = i * sliceAngle - sliceAngle / 2;
          const x1 = cx + Math.cos(a) * (CENTER_R + 6);
          const y1 = cy + Math.sin(a) * (CENTER_R + 6);
          const x2 = cx + Math.cos(a) * (RING_R + ITEM_R + 4);
          const y2 = cy + Math.sin(a) * (RING_R + ITEM_R + 4);
          return (
            <line key={`div-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="3 3" />
          );
        })}
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={RING_R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
      </svg>

      {/* Center hub */}
      <div
        style={{
          position: 'absolute',
          left: cx - CENTER_R, top: cy - CENTER_R,
          width: CENTER_R * 2, height: CENTER_R * 2,
          background: 'rgba(0,0,0,0.92)',
          border: '1px dashed rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', pointerEvents: 'none',
        }}
      >
        {hovered ? (
          <>
            <div style={{
              fontFamily: MONO, fontSize: 7, letterSpacing: '0.10em', textTransform: 'uppercase',
              color: items.find(i => i.id === hovered)?.color ?? ACCENT,
              textAlign: 'center', lineHeight: 1.3,
            }}>
              {items.find(i => i.id === hovered)?.label}
            </div>
            {items.find(i => i.id === hovered)?.key && (
              <div style={{
                fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.25)',
                marginTop: 2,
              }}>
                [{items.find(i => i.id === hovered)?.key}]
              </div>
            )}
          </>
        ) : (
          <div style={{
            fontFamily: MONO, fontSize: 6, color: 'rgba(255,255,255,0.18)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            Select
          </div>
        )}
      </div>

      {/* Items on ring */}
      {items.map((item, i) => {
        const a = i * sliceAngle - Math.PI / 2;
        const ix = cx + Math.cos(a) * RING_R - ITEM_R;
        const iy = cy + Math.sin(a) * RING_R - ITEM_R;
        const isHov = hovered === item.id;
        const isActive = activeId === item.id;
        const scale = isHov ? 1.25 : 1;

        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              left: ix, top: iy,
              width: ITEM_R * 2, height: ITEM_R * 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isHov ? `${item.color}18` : isActive ? `${item.color}0c` : 'rgba(0,0,0,0.85)',
              border: isHov ? `1px solid ${item.color}55` : isActive ? `1px dashed ${item.color}35` : '1px dashed rgba(255,255,255,0.06)',
              color: isHov ? item.color : isActive ? `${item.color}cc` : 'rgba(255,255,255,0.35)',
              transform: `scale(${scale})`,
              transition: 'all 0.1s ease-out',
              pointerEvents: 'none',
              boxShadow: isHov ? `0 0 16px ${item.color}25` : 'none',
            }}
          >
            <div style={{ fontSize: 13, lineHeight: 1 }}>{item.icon}</div>
          </div>
        );
      })}
    </div>
  );
};
