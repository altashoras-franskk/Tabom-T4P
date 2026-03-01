// ── TelemetryHUD — live parameter overlay ─────────────────────────────────────
// Renders a small, elegant, semi-transparent corner panel showing all active
// lab parameters in real time.  Uses a polling callback so it works with both
// React state and ref-based simulation values.
//
// Usage:
//   <TelemetryHUD getLines={() => [`BPM: ${bpm}`, `Scale: ${root} ${scale}`]} />
import React, { useCallback, useEffect, useRef, useState } from 'react';

export type TelemetryCorner = 'tl' | 'tr' | 'bl' | 'br';

interface Props {
  /** Callback that returns current parameter lines. Re-evaluated every `interval` ms. */
  getLines: () => string[];
  /** Corner to dock to (default 'br') */
  corner?:  TelemetryCorner;
  /** Poll interval in ms (default 500) */
  interval?: number;
  /** Optional bottom offset in px — useful when a docked panel sits above */
  bottomOffset?: number;
  /** When false the overlay is hidden (default true) */
  visible?: boolean;
  /** Accent color for dot and LIVE label (e.g. phase color to match bar/ball) */
  accentColor?: string;
}

const MONO = "'IBM Plex Mono', monospace";
const DEFAULT_ACCENT = '#37b2da';

export const TelemetryHUD: React.FC<Props> = ({
  getLines,
  corner       = 'br',
  interval     = 500,
  bottomOffset = 0,
  visible      = true,
  accentColor  = DEFAULT_ACCENT,
}) => {
  const [lines, setLines] = useState<string[]>(() => getLines());
  const cbRef = useRef(getLines);
  useEffect(() => { cbRef.current = getLines; });

  useEffect(() => {
    const id = setInterval(() => setLines(cbRef.current()), interval);
    return () => clearInterval(id);
  }, [interval]);

  if (!visible || lines.length === 0) return null;

  const isRight  = corner.endsWith('r');
  const isBottom = corner.startsWith('b');

  const pos: React.CSSProperties = {
    position:  'fixed',
    zIndex:    29,
    right:     isRight  ? 16      : undefined,
    left:      !isRight ? 16      : undefined,
    bottom:    isBottom ? 16 + bottomOffset : undefined,
    top:       !isBottom ? 16     : undefined,
    pointerEvents: 'none',
    userSelect:    'none',
  };

  return (
    <div style={pos}>
      <div style={{
        fontFamily:     MONO,
        background:     'rgba(7,5,14,0.70)',
        border:         '1px solid rgba(255,255,255,0.06)',
        borderRadius:   5,
        padding:        '5px 10px 6px 8px',
        backdropFilter: 'blur(10px)',
        minWidth:       120,
        maxWidth:       280,
      }}>
        {/* Header row — dot and LIVE use accentColor (e.g. phase color) */}
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
          <span style={{
            width:5, height:5, borderRadius:'50%',
            background: `${accentColor}80`,
            flexShrink: 0,
            animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
          }} />
          <span style={{
            fontSize:    6,
            color:       `${accentColor}99`,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}>
            LIVE
          </span>
        </div>

        {/* Parameter lines */}
        {lines.map((line, i) => (
          <div key={i} style={{
            fontSize:      9,
            lineHeight:    1.55,
            letterSpacing: '0.02em',
            color: i === 0
              ? 'rgba(255,255,255,0.68)'
              : 'rgba(255,255,255,0.40)',
            whiteSpace:    'nowrap',
            overflow:      'hidden',
            textOverflow:  'ellipsis',
            maxWidth:      260,
          }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};
