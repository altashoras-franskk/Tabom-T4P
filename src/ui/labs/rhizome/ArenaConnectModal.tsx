// ── Are.na Connect Modal ─────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { ExternalLink, Check, X, Loader } from 'lucide-react';
import type { ArenaChannel } from '../../../sim/rhizome/arenaAPI';
import { ArenaClient, isArenaConnected, loadArenaToken, saveArenaToken, clearArenaToken } from '../../../sim/rhizome/arenaAPI';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onClose: () => void;
  onSaveToChannel?: (channelSlug: string, items: { label: string; description?: string; url?: string }[]) => void;
}

export function ArenaConnectModal({ onClose, onSaveToChannel }: Props) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [channels, setChannels] = useState<ArenaChannel[]>([]);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Validate token format (basic check)
  const isTokenValid = token.trim().length > 20 && !token.includes(' ');

  useEffect(() => {
    const existingToken = loadArenaToken();
    if (existingToken) {
      setToken(existingToken);
      setConnected(true);
      loadChannels(existingToken);
    }
  }, []);

  const loadChannels = async (tk: string) => {
    try {
      const client = new ArenaClient({ accessToken: tk });
      const chs = await client.getChannels();
      setChannels(chs);
    } catch (e) {
      console.warn('Failed to load channels:', e);
    }
  };

  const handleConnect = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError('');
    try {
      const client = new ArenaClient({ accessToken: token.trim() });
      const chs = await client.getChannels();
      saveArenaToken(token.trim());
      setConnected(true);
      setChannels(chs);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Token inválido ou erro de conexão';
      setError(msg);
      console.error('Are.na connection error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    clearArenaToken();
    setToken('');
    setConnected(false);
    setChannels([]);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={{
          width: 480,
          maxHeight: '75vh',
          background: 'rgba(10,8,18,0.95)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, rgba(196,181,253,0.15), rgba(124,58,237,0.15))',
              border: '1px solid rgba(196,181,253,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ExternalLink size={14} strokeWidth={1.5} style={{ color: 'rgba(196,181,253,0.8)' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                Conectar Are.na
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                Salve cards diretamente nos seus channels
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              fontSize: 18,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          {!connected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ 
                background: 'rgba(59,130,246,0.08)', 
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 8,
                padding: '12px 14px',
              }}>
                <div style={{ fontSize: 10, color: 'rgba(147,197,253,0.95)', marginBottom: 8, fontWeight: 600 }}>
                  📘 Como obter seu token:
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 6 }}>
                  1. Abra{' '}
                  <a
                    href="https://dev.are.na/oauth/applications"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'rgba(147,197,253,0.95)', textDecoration: 'underline', fontWeight: 600 }}
                  >
                    dev.are.na/oauth/applications
                  </a>
                  {' '}(faça login primeiro)
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 6 }}>
                  2. Role até <strong style={{ color: 'rgba(147,197,253,0.9)' }}>"Generate a Personal Access Token"</strong>
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 6 }}>
                  3. Clique em <strong style={{ color: 'rgba(147,197,253,0.9)' }}>"Generate token"</strong> e copie o código gerado
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 8 }}>
                  4. Cole o token abaixo (apenas o código, sem "Bearer")
                </div>
                <div style={{ 
                  fontSize: 8, 
                  color: 'rgba(255,180,0,0.8)', 
                  lineHeight: 1.5,
                  background: 'rgba(255,180,0,0.08)',
                  padding: '6px 8px',
                  borderRadius: 4,
                  border: '1px solid rgba(255,180,0,0.2)',
                }}>
                  ⚠️ Use apenas o token alfanumérico gerado
                </div>
              </div>

              <div>
                <label style={{
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.5)',
                  display: 'block',
                  marginBottom: 6,
                  fontWeight: 500,
                }}>
                  Personal Access Token
                </label>
                <div>
                  <input
                    type="text"
                    placeholder="ex: abc123def456ghi789jkl..."
                    value={token}
                    onChange={e => {
                      setToken(e.target.value);
                      setError(''); // Clear error on input change
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && isTokenValid) handleConnect(); }}
                    autoComplete="off"
                    spellCheck={false}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 6,
                      fontSize: 11,
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${
                        token.length > 0 && !isTokenValid 
                          ? 'rgba(255,180,0,0.4)' 
                          : 'rgba(255,255,255,0.12)'
                      }`,
                      color: '#fff',
                      outline: 'none',
                      fontFamily: 'monospace',
                    }}
                  />
                  {token.length > 0 && !isTokenValid && (
                    <div style={{
                      fontSize: 8,
                      color: 'rgba(255,180,0,0.8)',
                      marginTop: 6,
                      lineHeight: 1.4,
                    }}>
                      ⚠️ Token parece muito curto ou contém espaços
                    </div>
                  )}
                  {token.toLowerCase().includes('bearer') && (
                    <div style={{
                      fontSize: 8,
                      color: 'rgba(239,68,68,0.8)',
                      marginTop: 6,
                      lineHeight: 1.4,
                    }}>
                      ❌ Remova "Bearer" do token - cole apenas o código
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 6,
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}>
                  <div style={{ fontSize: 10, color: 'rgba(239,68,68,0.95)', fontWeight: 600, marginBottom: 6 }}>
                    ⚠️ Falha na autenticação
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(239,68,68,0.85)', lineHeight: 1.4, marginBottom: 8 }}>
                    {error}
                  </div>
                  {error.includes('401') && (
                    <div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginBottom: 8, lineHeight: 1.5 }}>
                        💡 <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Possíveis causas:</strong>
                        <br />
                        • Token incorreto ou inválido
                        <br />
                        • Token expirado ou revogado
                        <br />
                        • Formato incorreto (não inclua "Bearer")
                      </div>
                      <a
                        href="https://dev.are.na/oauth/applications"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          padding: '6px 10px',
                          borderRadius: 5,
                          fontSize: 9,
                          fontWeight: 600,
                          background: 'rgba(239,68,68,0.2)',
                          border: '1px solid rgba(239,68,68,0.4)',
                          color: 'rgba(252,165,165,0.95)',
                          textDecoration: 'none',
                        }}
                      >
                        🔄 Gerar novo token
                      </a>
                    </div>
                  )}
                  {error.includes('404') && (
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                      💡 Endpoint não encontrado. Verifique sua conexão de internet.
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={loading || !isTokenValid}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 600,
                  background: loading || !isTokenValid
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(124,58,237,0.25)',
                  border: `1px solid ${loading || !isTokenValid
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(124,58,237,0.45)'}`,
                  color: loading || !isTokenValid
                    ? 'rgba(255,255,255,0.3)'
                    : 'rgba(196,181,253,0.95)',
                  cursor: loading || !isTokenValid ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <Loader size={12} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Check size={12} strokeWidth={1.5} />
                    Conectar
                  </>
                )}
              </button>

              {/* Help section */}
              <button
                onClick={() => setShowHelp(!showHelp)}
                style={{
                  width: '100%',
                  padding: '8px 0',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 9,
                  cursor: 'pointer',
                  textAlign: 'center',
                  textDecoration: 'underline',
                }}
              >
                {showHelp ? '▲' : '▼'} Problemas para conectar?
              </button>

              {showHelp && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 6,
                  background: 'rgba(147,51,234,0.08)',
                  border: '1px solid rgba(147,51,234,0.2)',
                }}>
                  <div style={{ fontSize: 9, color: 'rgba(196,181,253,0.95)', fontWeight: 600, marginBottom: 8 }}>
                    ✓ Checklist de verificação:
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginLeft: 4 }}>
                    1. Faça login no <strong style={{ color: 'rgba(196,181,253,0.9)' }}>Are.na</strong> antes de gerar o token
                    <br />
                    2. Use a seção <strong style={{ color: 'rgba(196,181,253,0.9)' }}>"Generate a Personal Access Token"</strong> (não "OAuth Applications")
                    <br />
                    3. Copie <strong style={{ color: 'rgba(196,181,253,0.9)' }}>apenas</strong> o código gerado (sem espaços ou "Bearer")
                    <br />
                    4. O token deve ter pelo menos 40 caracteres alfanuméricos
                    <br />
                    5. Se continuar falhando, tente gerar um novo token
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Connected state */}
              <div style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <Check size={14} strokeWidth={1.5} style={{ color: 'rgba(34,197,94,0.9)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'rgba(34,197,94,0.95)', fontWeight: 500 }}>
                    Conectado ao Are.na
                  </div>
                  <div style={{ fontSize: 8, color: 'rgba(34,197,94,0.7)', marginTop: 2 }}>
                    {channels.length} channels encontrados
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(239,68,68,0.6)',
                    cursor: 'pointer',
                    fontSize: 9,
                    textDecoration: 'underline',
                  }}
                >
                  Desconectar
                </button>
              </div>

              {/* Channels list */}
              <div>
                <div style={{
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                }}>
                  Seus Channels
                </div>
                {channels.length > 0 ? (
                  <div style={{
                    maxHeight: 240,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}>
                    {channels.map(ch => (
                      <div
                        key={ch.id}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 6,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(124,58,237,0.1)';
                          e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                        }}
                      >
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>
                          {ch.title}
                        </div>
                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                          {ch.length} blocks · {ch.public ? 'público' : 'privado'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: '20px 16px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                      Nenhum channel encontrado
                    </div>
                    <a
                      href="https://www.are.na/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: 5,
                        fontSize: 9,
                        fontWeight: 600,
                        background: 'rgba(124,58,237,0.2)',
                        border: '1px solid rgba(124,58,237,0.4)',
                        color: 'rgba(196,181,253,0.9)',
                        textDecoration: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      + Criar primeiro channel
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
