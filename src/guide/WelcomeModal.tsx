import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface WelcomeModalProps {
  onStart: () => void;
  onSkip: () => void;
}

const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";
const ACCENT = '#ffd400';

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onStart, onSkip }) => {
  const [hoverStart, setHoverStart] = useState(false);
  const [hoverSkip, setHoverSkip] = useState(false);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          width: 520, maxWidth: '92vw',
          background: '#000',
          border: '1px dashed rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Accent line */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT}40, transparent)` }} />

        <div style={{ padding: '40px 36px 32px' }}>
          {/* Symbol */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 28, opacity: 0.3 }}>🝛</span>
          </div>

          {/* Title */}
          <h2 style={{
            fontFamily: DOTO, fontSize: 28, fontWeight: 300,
            textAlign: 'center', color: 'white', letterSpacing: '0.04em',
            textTransform: 'uppercase', marginBottom: 4,
          }}>
            Complexity Lab
          </h2>

          <p style={{
            fontFamily: MONO, fontSize: 9, color: `${ACCENT}90`,
            textAlign: 'center', letterSpacing: '0.4em', textTransform: 'uppercase',
            marginBottom: 32,
          }}>
            VIDA ARTIFICIAL
          </p>

          {/* Core concept */}
          <div style={{
            borderTop: '1px dashed rgba(255,255,255,0.06)',
            borderBottom: '1px dashed rgba(255,255,255,0.06)',
            padding: '20px 0', marginBottom: 24,
          }}>
            <p style={{
              fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.8, textTransform: 'uppercase', textAlign: 'center',
              maxWidth: 420, margin: '0 auto',
            }}>
              Agentes com regras simples de atração e repulsão
              geram padrões complexos emergentes — membranas,
              colônias, organismos, caos.
            </p>
          </div>

          {/* Three pillars */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
            marginBottom: 28,
          }}>
            {[
              { symbol: '◯', label: 'Campo', desc: 'Ambiente invisível', color: ACCENT },
              { symbol: '◆', label: 'Agentes', desc: 'Partículas com tipo', color: '#ff0084' },
              { symbol: '⟷', label: 'Interação', desc: 'Matriz de forças', color: '#37b2da' },
            ].map(p => (
              <div key={p.label} style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 16, color: p.color, opacity: 0.5, marginBottom: 6 }}>{p.symbol}</div>
                <div style={{
                  fontFamily: DOTO, fontSize: 11, color: 'rgba(255,255,255,0.6)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3,
                }}>
                  {p.label}
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.25)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {p.desc}
                </div>
              </div>
            ))}
          </div>

          {/* Guide suggestion */}
          <div style={{
            background: `${ACCENT}06`,
            border: `1px dashed ${ACCENT}18`,
            padding: '14px 16px', marginBottom: 24,
          }}>
            <p style={{
              fontFamily: MONO, fontSize: 9, color: `${ACCENT}90`,
              textAlign: 'center', letterSpacing: '0.12em', textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              Primeiro acesso?
            </p>
            <p style={{
              fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.4)',
              textAlign: 'center', lineHeight: 1.6, textTransform: 'uppercase',
            }}>
              Um guia rápido e discreto vai apontar os controles essenciais.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={onStart}
              onMouseEnter={() => setHoverStart(true)}
              onMouseLeave={() => setHoverStart(false)}
              style={{
                width: '100%', padding: '12px 0',
                background: hoverStart ? `${ACCENT}15` : `${ACCENT}08`,
                border: `1px dashed ${hoverStart ? `${ACCENT}50` : `${ACCENT}25`}`,
                color: hoverStart ? ACCENT : `${ACCENT}c0`,
                fontFamily: MONO, fontSize: 10,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              Iniciar Guia
            </button>
            <button
              onClick={onSkip}
              onMouseEnter={() => setHoverSkip(true)}
              onMouseLeave={() => setHoverSkip(false)}
              style={{
                width: '100%', padding: '10px 0',
                background: 'none', border: 'none',
                color: hoverSkip ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                fontFamily: MONO, fontSize: 9,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              Explorar sozinho
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
