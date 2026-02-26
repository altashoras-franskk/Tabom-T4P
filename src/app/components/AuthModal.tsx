// ── AuthModal — Login / Register for Devices for Intuition ────────────────────
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { X, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-0834700c`;

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
);

interface Props {
  onClose: () => void;
  onAuthChange: (user: AuthUser | null) => void;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  accessToken: string;
}

type Mode = 'login' | 'register';

export function AuthModal({ onClose, onAuthChange }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputSty: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 12,
    outline: 'none',
    fontFamily: 'system-ui',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Preencha email e senha.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      const user = data.session?.user;
      const token = data.session?.access_token;
      if (!user || !token) throw new Error('Login falhou — sem sessão.');
      onAuthChange({
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name,
        accessToken: token,
      });
      setSuccess('Login realizado! Coleções sincronizadas.');
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Preencha email e senha.');
      return;
    }
    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Create user via server (with email_confirm: true)
      const res = await fetch(`${SERVER_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() || undefined }),
      });
      const signupData = await res.json();
      if (!res.ok || !signupData.success) {
        throw new Error(signupData.error || 'Erro ao criar conta.');
      }
      // Auto sign in after registration
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      const user = data.session?.user;
      const token = data.session?.access_token;
      if (!user || !token) throw new Error('Conta criada mas login falhou. Tente fazer login.');
      onAuthChange({
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || name,
        accessToken: token,
      });
      setSuccess('Conta criada! Bem-vindo ao Rhizome.');
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 360, background: 'rgba(8,5,20,0.98)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12, padding: '28px 28px 24px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button title="Fechar"
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)', padding: 4,
          }}
        >
          <X size={14} strokeWidth={2} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: 22, textAlign: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 6 }}>
            Devices for Intuition
          </div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginBottom: 4 }}>
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>
            {mode === 'login'
              ? 'Coleções sincronizadas entre dispositivos'
              : 'Pesquisa rizomática persistente em todos os dispositivos'}
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 20,
          background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: 3,
        }}>
          {(['login', 'register'] as Mode[]).map(m => (
            <button title={m}
              key={m}
              onClick={() => { setMode(m); setError(''); setSuccess(''); }}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 5, cursor: 'pointer',
                background: mode === m ? 'rgba(124,58,237,0.3)' : 'transparent',
                border: `1px solid ${mode === m ? 'rgba(124,58,237,0.5)' : 'transparent'}`,
                color: mode === m ? 'rgba(196,181,253,0.95)' : 'rgba(255,255,255,0.4)',
                fontSize: 10, fontWeight: mode === m ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {m === 'login' ? 'Entrar' : 'Cadastrar'}
            </button>
          ))}
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
          {/* Name (register only) */}
          {mode === 'register' && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' }}>
                Nome (opcional)
              </div>
              <input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputSty}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' }}>
              Email
            </div>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputSty}
              autoFocus
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' }}>
              Senha {mode === 'register' && <span style={{ color: 'rgba(255,255,255,0.25)' }}>(mín. 6 caracteres)</span>}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ ...inputSty, paddingRight: 36 }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <button title={showPw ? "Esconder senha" : "Mostrar senha"}
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.3)',
                }}
              >
                {showPw ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{
              marginBottom: 14, padding: '8px 12px', borderRadius: 6,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              fontSize: 10, color: 'rgba(252,165,165,0.9)', lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              marginBottom: 14, padding: '8px 12px', borderRadius: 6,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              fontSize: 10, color: 'rgba(134,239,172,0.9)',
            }}>
              {success}
            </div>
          )}

          {/* Submit */}
          <button title={loading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar conta"}
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 7, cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.25)',
              border: `1px solid ${loading ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.5)'}`,
              color: loading ? 'rgba(196,181,253,0.5)' : 'rgba(196,181,253,0.95)',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'all 0.15s',
            }}
          >
            {loading ? (
              <>
                <span style={{ fontSize: 11, animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
                {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
              </>
            ) : mode === 'login' ? (
              <><LogIn size={11} strokeWidth={2} /> Entrar</>
            ) : (
              <><UserPlus size={11} strokeWidth={2} /> Criar conta</>
            )}
          </button>
        </form>

        {/* Note */}
        <div style={{
          marginTop: 16, fontSize: 8, color: 'rgba(255,255,255,0.2)',
          textAlign: 'center', lineHeight: 1.5,
        }}>
          Coleções, pastas e mapas rizomáticos sincronizados entre dispositivos.<br/>
          Sem conta, dados ficam apenas neste browser.
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── useAuth hook ──────────────────────────────────────────────────────────────
export function useAuth() {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && session?.access_token) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name,
          accessToken: session.access_token,
        });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && session?.access_token) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name,
          accessToken: session.access_token,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return { user, loading, signOut, setUser };
}
