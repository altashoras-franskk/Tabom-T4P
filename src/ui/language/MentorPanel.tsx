// ─────────────────────────────────────────────────────────────────────────────
// MentorPanel — LLM Lens, status, history, API key config
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import type { LLMStatus, WorldEvent } from '../../sim/language/types';
import { Sparkles, AlertCircle, CheckCircle, Key, ChevronDown, ChevronRight } from 'lucide-react';
import { hasApiKey } from '../../llm/openaiClient';

interface Props {
  status: LLMStatus;
  events: WorldEvent[];
  lastRationale: string;
  onConfigKey: (key: string) => void;
}

export function MentorPanel({ status, events, lastRationale, onConfigKey }: Props) {
  const [expanded,    setExpanded]    = useState(true);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyInput,    setKeyInput]    = useState('');

  const hasKey = hasApiKey();

  const statusColor = status.state === 'ok'      ? '#80ff80'
                    : status.state === 'loading'  ? '#ffd060'
                    : status.state === 'error'    ? '#ff6060'
                    : 'rgba(255,255,255,0.2)';

  const panelSty: React.CSSProperties = {
    background: 'rgba(6,4,18,0.92)',
    border: '1px solid rgba(160,80,255,0.2)',
    borderRadius: 8, margin: '0 0 0 0',
    fontFamily: 'system-ui, sans-serif',
    overflow: 'hidden',
  };

  const hdrSty: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px',
    cursor: 'pointer', borderBottom: expanded ? '1px solid rgba(255,255,255,0.05)' : 'none',
  };

  return (
    <div style={panelSty}>
      <div style={hdrSty} onClick={() => setExpanded(!expanded)}>
        <Sparkles size={11} color="rgba(200,160,255,0.7)" />
        <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'rgba(200,160,255,0.8)', flex: 1 }}>
          Lexicógrafo LLM
        </span>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
        {expanded ? <ChevronDown size={10} color="rgba(255,255,255,0.3)" />
                  : <ChevronRight size={10} color="rgba(255,255,255,0.3)" />}
      </div>

      {expanded && (
        <div style={{ padding: '8px 10px' }}>

          {/* API key status */}
          {!hasKey && !showKeyForm && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: '#ffd060', marginBottom: 4, display: 'flex', gap: 4, alignItems: 'center' }}>
                <AlertCircle size={10} />
                OPENAI_API_KEY não configurada
              </div>
              <button
                onClick={() => setShowKeyForm(true)}
                style={{ fontSize: 8, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                  background: 'rgba(255,200,60,0.12)', border: '1px solid rgba(255,200,60,0.3)',
                  color: 'rgba(255,220,120,0.9)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Key size={9} /> Configurar key temporária
              </button>
            </div>
          )}

          {showKeyForm && (
            <div style={{ marginBottom: 8 }}>
              <input
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                placeholder="sk-…"
                type="password"
                style={{ width: '100%', fontSize: 9, padding: '4px 6px', borderRadius: 4, boxSizing: 'border-box',
                  background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,200,60,0.3)',
                  color: 'rgba(255,230,150,0.9)', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button
                  onClick={() => { onConfigKey(keyInput); setShowKeyForm(false); setKeyInput(''); }}
                  style={{ fontSize: 8, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                    background: 'rgba(80,200,80,0.15)', border: '1px solid rgba(80,200,80,0.3)',
                    color: 'rgba(140,220,140,0.9)' }}>
                  Salvar
                </button>
                <button
                  onClick={() => setShowKeyForm(false)}
                  style={{ fontSize: 8, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(200,200,200,0.5)' }}>
                  Cancelar
                </button>
              </div>
              <div style={{ fontSize: 7, color: 'rgba(255,200,60,0.5)', marginTop: 4, lineHeight: 1.4 }}>
                ⚠ A key não é enviada a servidores externos além da OpenAI API.
                Figma Make não é indicado para coletar dados sensíveis.
              </div>
            </div>
          )}

          {hasKey && status.state === 'idle' && (
            <div style={{ fontSize: 9, color: 'rgba(140,220,140,0.6)', marginBottom: 6, display: 'flex', gap: 4, alignItems: 'center' }}>
              <CheckCircle size={9} />
              Pronto — clique "Ask LLM" em qualquer glifo
            </div>
          )}

          {status.state === 'loading' && (
            <div style={{ fontSize: 9, color: '#ffd060', marginBottom: 6 }}>
              ⏳ Consultando lexicógrafo…
            </div>
          )}

          {status.state === 'error' && (
            <div style={{ fontSize: 9, color: '#ff8060', marginBottom: 6, lineHeight: 1.4 }}>
              ✗ {status.lastError}
            </div>
          )}

          {lastRationale && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 7, color: 'rgba(160,80,255,0.5)', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 3 }}>
                Último raciocínio
              </div>
              <div style={{ fontSize: 9, color: 'rgba(210,200,190,0.7)', lineHeight: 1.5,
                borderLeft: '2px solid rgba(160,80,255,0.25)', paddingLeft: 6 }}>
                {lastRationale}
              </div>
            </div>
          )}

          {/* Recent events */}
          {events.length > 0 && (
            <div>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 4 }}>
                Eventos recentes
              </div>
              {events.slice(-5).reverse().map(ev => (
                <div key={ev.id} style={{ fontSize: 8, color: 'rgba(200,190,180,0.6)',
                  marginBottom: 2, display: 'flex', gap: 5 }}>
                  <span style={{ color: 'rgba(160,80,255,0.5)', flexShrink: 0 }}>
                    {ev.kind === 'GLYPH_SHIFT'     ? '⟳'
                   : ev.kind === 'PATTERN_STABLE'  ? '◉'
                   : ev.kind === 'SPEAK_EFFECT'    ? '◈'
                   : '◎'}
                  </span>
                  <span>{ev.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
