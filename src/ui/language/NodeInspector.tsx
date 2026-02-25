// ─────────────────────────────────────────────────────────────────────────────
// NodeInspector — verbete view for a selected glyph / lexicon entry
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useEffect, useState } from 'react';
import type { GlyphSpec, LexiconEntry } from '../../sim/language/types';
import { drawGlyph } from './glyphRenderer';
import { Sparkles, CheckCircle, Edit3, Link2, X, Clock } from 'lucide-react';

interface Props {
  spec: GlyphSpec;
  entry: LexiconEntry | null;
  allEntries: LexiconEntry[];
  llmLoading: boolean;
  onAskLLM: (spec: GlyphSpec, entry: LexiconEntry | null) => void;
  onAccept: (glyphId: string) => void;
  onEdit: (glyphId: string, field: 'gloss' | 'definition' | 'usage', value: string) => void;
  onLink: (glyphId: string, targetGloss: string) => void;
  onClose: () => void;
  onSpeak: (spec: GlyphSpec) => void;
}

function GlyphBig({ spec, size = 140 }: { spec: GlyphSpec; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const t = useRef(0);

  useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, size, size);
          t.current += 0.016;
          // drawGlyph fills its own white background — just call it directly
          drawGlyph(ctx, spec, size / 2, size / 2, size * 0.46, { alpha: 0.96, animated: true, time: t.current });
        }
      }
      frameRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, [spec, size]);

  return (
    <canvas ref={canvasRef} width={size} height={size}
      style={{ display: 'block', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }} />
  );
}

export function NodeInspector({
  spec, entry, allEntries, llmLoading, onAskLLM, onAccept, onEdit, onLink, onClose, onSpeak,
}: Props) {
  const [editField, setEditField] = useState<null | 'gloss' | 'definition' | 'usage'>(null);
  const [editVal,   setEditVal]   = useState('');
  const [linkSearch, setLinkSearch] = useState('');
  const [showLink,  setShowLink]  = useState(false);

  const sty: React.CSSProperties = {
    position: 'absolute', top: 60, right: 8, zIndex: 30,
    width: 280, background: 'rgba(8,6,20,0.97)',
    border: '1px solid rgba(160,80,255,0.25)',
    borderRadius: 10, padding: 14,
    fontFamily: 'system-ui, sans-serif',
    color: 'rgba(230,220,210,0.9)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 32px rgba(0,0,0,0.6)',
    maxHeight: 'calc(100vh - 140px)',
    overflowY: 'auto',
  };

  const lbl: React.CSSProperties = {
    fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: 'rgba(160,80,255,0.7)', marginBottom: 2,
  };

  const val: React.CSSProperties = {
    fontSize: 11, color: 'rgba(235,225,210,0.85)', marginBottom: 10, lineHeight: 1.5,
  };

  const conf = entry?.confidence ?? 0;
  const confPct = Math.round(conf * 100);
  const confColor = conf > 0.7 ? '#80ff80' : conf > 0.4 ? '#ffd060' : '#ff8060';

  const linkMatches = linkSearch.length > 0
    ? allEntries.filter(e => e.gloss.toLowerCase().includes(linkSearch.toLowerCase()) && e.glyphId !== spec.id).slice(0, 5)
    : [];

  return (
    <div style={sty}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 7, color: 'rgba(160,80,255,0.5)', letterSpacing: '0.12em' }}>
            HEPTAPOD · {spec.signatureHash.slice(0, 8)}
          </div>
          <div style={{ fontSize: 15, color: 'rgba(242,232,215,0.95)', marginTop: 2 }}>
            {entry?.gloss ?? '—'}
          </div>
          {entry && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: confColor }} />
              <span style={{ fontSize: 8, color: confColor }}>{confPct}% conf</span>
              {entry.status === 'accepted' && <CheckCircle size={9} color="#80ff80" />}
              {entry.needs_verification && <Clock size={9} color="#ffd060" />}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => onSpeak(spec)}
            style={{ fontSize: 8, padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
              background: 'rgba(160,80,255,0.15)', border: '1px solid rgba(160,80,255,0.3)',
              color: 'rgba(200,160,255,0.9)', letterSpacing: '0.1em' }}>
            SPEAK
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Glyph big */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <GlyphBig spec={spec} size={130} />
      </div>

      {/* Tokens */}
      <div style={lbl}>Tokens</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 10 }}>
        {spec.observables && (entry?.tokens ?? []).map(tok => (
          <span key={tok} style={{
            fontSize: 8, padding: '1px 5px', borderRadius: 3,
            background: 'rgba(160,80,255,0.12)', border: '1px solid rgba(160,80,255,0.2)',
            color: 'rgba(200,170,255,0.8)',
          }}>{tok}</span>
        ))}
        {!entry && spec.id && (
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>sem verbete ainda</span>
        )}
      </div>

      {/* Definition */}
      {entry && (
        <>
          <div style={lbl}>Definição</div>
          {editField === 'definition'
            ? <textarea
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                onBlur={() => { onEdit(spec.id, 'definition', editVal); setEditField(null); }}
                autoFocus
                style={{ width: '100%', fontSize: 10, background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(160,80,255,0.3)', color: 'rgba(235,225,210,0.9)',
                  borderRadius: 4, padding: 4, resize: 'vertical', minHeight: 50 }}
              />
            : <div style={val} onClick={() => { setEditField('definition'); setEditVal(entry.definition); }}>
                {entry.definition || '—'}
              </div>
          }

          <div style={lbl}>Uso</div>
          <div style={val}>{entry.usage || '—'}</div>

          {entry.contrasts.length > 0 && (
            <>
              <div style={lbl}>Contrasta com</div>
              <div style={{ ...val, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {entry.contrasts.map(c => (
                  <span key={c} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3,
                    background: 'rgba(255,80,60,0.1)', border: '1px solid rgba(255,80,60,0.2)',
                    color: 'rgba(255,140,120,0.8)' }}>{c}</span>
                ))}
              </div>
            </>
          )}

          {entry.examples.length > 0 && (
            <>
              <div style={lbl}>Ocorrências ({entry.frequency}×)</div>
              <div style={{ fontSize: 9, color: 'rgba(200,190,180,0.6)', marginBottom: 10 }}>
                {entry.examples.slice(-3).map((ex, i) => (
                  <div key={i}>· {new Date(ex.timestamp).toLocaleTimeString()}</div>
                ))}
              </div>
            </>
          )}

          {entry.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 10 }}>
              {entry.tags.map(t => (
                <span key={t} style={{ fontSize: 7, padding: '1px 5px', borderRadius: 3,
                  background: 'rgba(60,160,255,0.1)', border: '1px solid rgba(60,160,255,0.2)',
                  color: 'rgba(120,180,255,0.7)' }}>#{t}</span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
        <button
          onClick={() => onAskLLM(spec, entry)}
          disabled={llmLoading}
          style={{ flex: 1, fontSize: 8, padding: '4px 6px', borderRadius: 5, cursor: llmLoading ? 'wait' : 'pointer',
            background: llmLoading ? 'rgba(160,80,255,0.05)' : 'rgba(160,80,255,0.14)',
            border: '1px solid rgba(160,80,255,0.3)', color: 'rgba(200,160,255,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            opacity: llmLoading ? 0.5 : 1 }}>
          <Sparkles size={9} />
          {llmLoading ? 'Pensando…' : 'Ask LLM'}
        </button>

        {entry && (
          <>
            <button
              onClick={() => onAccept(spec.id)}
              style={{ fontSize: 8, padding: '4px 7px', borderRadius: 5, cursor: 'pointer',
                background: entry.status === 'accepted' ? 'rgba(80,200,80,0.15)' : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(80,200,80,0.25)', color: 'rgba(140,220,140,0.9)',
                display: 'flex', alignItems: 'center', gap: 3 }}>
              <CheckCircle size={9} />
              {entry.status === 'accepted' ? 'Aceito' : 'Aceitar'}
            </button>

            <button
              onClick={() => setShowLink(!showLink)}
              style={{ fontSize: 8, padding: '4px 7px', borderRadius: 5, cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(200,200,200,0.8)',
                display: 'flex', alignItems: 'center', gap: 3 }}>
              <Link2 size={9} />
              Link
            </button>
          </>
        )}
      </div>

      {showLink && (
        <div style={{ marginTop: 8 }}>
          <input
            value={linkSearch}
            onChange={e => setLinkSearch(e.target.value)}
            placeholder="buscar gloss…"
            style={{ width: '100%', fontSize: 9, padding: '3px 6px', borderRadius: 4, boxSizing: 'border-box',
              background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(160,80,255,0.2)',
              color: 'rgba(235,225,210,0.85)', outline: 'none' }}
          />
          {linkMatches.map(e => (
            <div key={e.glyphId}
              onClick={() => { onLink(spec.id, e.gloss); setShowLink(false); setLinkSearch(''); }}
              style={{ padding: '4px 6px', cursor: 'pointer', fontSize: 9,
                color: 'rgba(200,190,180,0.8)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {e.gloss}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}