// ── DraggablePanel — drag-by-header + minimize/collapse floating container ──
import React, { useRef, useState, useCallback, useEffect } from 'react';

const MONO = "'IBM Plex Mono', monospace";

export interface DraggablePanelProps {
  /** Unique key for persisting position (localStorage) */
  id: string;
  /** Panel title shown in the drag handle */
  title: string;
  /** Title color */
  titleColor?: string;
  /** Initial position — overridden by persisted value */
  defaultX: number;
  defaultY: number;
  /** CSS z-index */
  zIndex?: number;
  /** If true, panel starts minimized */
  defaultMinimized?: boolean;
  /** Extra header elements (right side of title bar) */
  headerExtra?: React.ReactNode;
  /** Panel width — auto if not set */
  width?: number | string;
  /** Max height of content area (scrolls beyond) */
  maxHeight?: number | string;
  /** Children = panel body (hidden when minimized) */
  children: React.ReactNode;
  /** Called when close button is clicked (if provided, a close button appears) */
  onClose?: () => void;
  /** If true, position is anchored to right/bottom edge. defaultX/Y become offsets from right/bottom. */
  anchorRight?: boolean;
  anchorBottom?: boolean;
  /** Whether to persist position to localStorage */
  persist?: boolean;
  /** Custom class on the root */
  className?: string;
}

function loadPos(id: string): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(`dp_${id}`);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p.x === 'number' && typeof p.y === 'number') return p;
  } catch { /* ignore */ }
  return null;
}

function savePos(id: string, x: number, y: number) {
  try { localStorage.setItem(`dp_${id}`, JSON.stringify({ x, y })); } catch { /* ignore */ }
}

export const DraggablePanel: React.FC<DraggablePanelProps> = ({
  id, title, titleColor, defaultX, defaultY, zIndex = 30,
  defaultMinimized = false, headerExtra, width, maxHeight,
  children, onClose, anchorRight, anchorBottom, persist = true, className,
}) => {
  const saved = persist ? loadPos(id) : null;
  const [pos, setPos] = useState({ x: saved?.x ?? defaultX, y: saved?.y ?? defaultY });
  const [minimized, setMinimized] = useState(defaultMinimized);
  const dragging = useRef(false);
  const offset = useRef({ dx: 0, dy: 0 });
  const rootRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select')) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    offset.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const nx = e.clientX - offset.current.dx;
    const ny = e.clientY - offset.current.dy;
    setPos({ x: nx, y: ny });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const nx = e.clientX - offset.current.dx;
    const ny = e.clientY - offset.current.dy;
    setPos({ x: nx, y: ny });
    if (persist) savePos(id, nx, ny);
  }, [id, persist]);

  // Keep within viewport on resize
  useEffect(() => {
    const onResize = () => {
      setPos(prev => ({
        x: Math.min(prev.x, window.innerWidth - 40),
        y: Math.min(prev.y, window.innerHeight - 24),
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex,
    fontFamily: MONO,
    background: 'rgba(0,0,0,0.94)',
    border: '1px dashed rgba(255,255,255,0.06)',
    pointerEvents: 'auto',
    ...(width != null ? { width } : {}),
    ...(anchorRight
      ? { right: pos.x, top: pos.y }
      : anchorBottom
        ? { left: pos.x, bottom: pos.y }
        : { left: pos.x, top: pos.y }),
  };

  return (
    <div ref={rootRef} style={style} className={className}>
      {/* ── Drag handle / title bar ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 6px',
          borderBottom: minimized ? 'none' : '1px dashed rgba(255,255,255,0.04)',
          cursor: 'grab', userSelect: 'none',
          minHeight: 20,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Drag grip dots */}
        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.12)', letterSpacing: 1, marginRight: 2 }}>⠿</span>
        <span style={{
          fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: titleColor ?? 'rgba(55,178,218,0.55)',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
        {headerExtra}
        <button
          onClick={() => setMinimized(v => !v)}
          style={{
            background: 'none', border: 'none', padding: '0 2px',
            color: 'rgba(255,255,255,0.20)', fontSize: 9, cursor: 'pointer', lineHeight: 1,
          }}
          title={minimized ? 'Expand' : 'Minimize'}
        >
          {minimized ? '▸' : '▾'}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', padding: '0 2px',
              color: 'rgba(255,255,255,0.15)', fontSize: 9, cursor: 'pointer', lineHeight: 1,
            }}
            title="Close"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Body ── */}
      {!minimized && (
        <div style={{
          overflowY: maxHeight ? 'auto' : undefined,
          maxHeight: maxHeight ?? undefined,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(55,178,218,.08) transparent',
        }}>
          {children}
        </div>
      )}
    </div>
  );
};
