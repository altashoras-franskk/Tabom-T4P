// ─────────────────────────────────────────────────────────────────────────────
// GlyphStream — horizontal scroll of last 12 glyphs with mini-render
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useEffect, useCallback } from 'react';
import type { GlyphSpec, LexiconEntry } from '../../sim/language/types';
import { drawGlyph } from './glyphRenderer';

interface Props {
  glyphs: GlyphSpec[];
  lexicon: LexiconEntry[];
  selectedId: string | null;
  onSelect: (spec: GlyphSpec) => void;
  onSpeak: (spec: GlyphSpec) => void;
}

function GlyphThumb({
  spec, lexEntry, selected, onClick, onSpeak,
}: {
  spec: GlyphSpec;
  lexEntry?: LexiconEntry;
  selected: boolean;
  onClick: () => void;
  onSpeak: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const SIZE = 54;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    // drawGlyph fills its own white background
    drawGlyph(ctx, spec, SIZE / 2, SIZE / 2, SIZE * 0.44, { alpha: 0.96 });
  }, [spec, selected, SIZE]);

  const conf = lexEntry?.confidence ?? 0;
  const confColor = conf > 0.7 ? '#2a9a50' : conf > 0.4 ? '#b07a10' : '#aa3020';
  // NO blur — the frosted-glass effect was hiding all glyphs by default. Removed.

  return (
    <div
      title={lexEntry ? `${lexEntry.gloss} — conf ${Math.round(conf * 100)}%` : spec.signatureHash.slice(0, 8)}
      style={{
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
        borderRadius: 6,
        border: selected ? '2px solid rgba(40,30,20,0.6)' : '1px solid rgba(180,170,155,0.45)',
        overflow: 'hidden',
        background: 'rgba(250,248,244,0.97)',
        transition: 'border-color 0.2s, transform 0.15s',
        transform: selected ? 'scale(1.07)' : 'scale(1)',
      }}
      onClick={onClick}
      onDoubleClick={onSpeak}
    >
      <div style={{ filter: 'none' }}>
        <canvas ref={canvasRef} width={SIZE} height={SIZE} style={{ display: 'block' }} />
      </div>
      {lexEntry && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(248,244,238,0.88)',
          fontSize: 7, color: 'rgba(40,30,20,0.7)',
          textAlign: 'center', padding: '1px 2px',
          letterSpacing: '0.05em',
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {lexEntry.gloss}
        </div>
      )}
      {/* Confidence dot */}
      <div style={{
        position: 'absolute', top: 3, right: 3,
        width: 4, height: 4, borderRadius: '50%',
        background: lexEntry ? confColor : 'rgba(100,90,80,0.2)',
      }} />
    </div>
  );
}

export function GlyphStream({ glyphs, lexicon, selectedId, onSelect, onSpeak }: Props) {
  const lexMap = new Map(lexicon.map(e => [e.signatureHash, e]));

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 10px',
      borderTop: '1px solid rgba(160,150,135,0.2)',
      overflowX: 'auto', overflowY: 'hidden',
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(100,80,60,0.2) transparent',
      minHeight: 70,
      background: 'rgba(248,245,240,0.97)',
    }}>
      <div style={{
        fontSize: 7, color: 'rgba(100,85,65,0.45)',
        letterSpacing: '0.15em', textTransform: 'uppercase',
        flexShrink: 0, paddingRight: 4,
        writingMode: 'vertical-rl',
      }}>
        STREAM
      </div>
      {glyphs.length === 0 && (
        <div style={{
          fontSize: 9, color: 'rgba(100,85,65,0.4)',
          letterSpacing: '0.1em', padding: '0 10px',
        }}>
          aguardando glifos...
        </div>
      )}
      {[...glyphs].reverse().map(spec => (
        <GlyphThumb
          key={spec.id}
          spec={spec}
          lexEntry={lexMap.get(spec.signatureHash)}
          selected={selectedId === spec.id}
          onClick={() => onSelect(spec)}
          onSpeak={() => onSpeak(spec)}
        />
      ))}
    </div>
  );
}