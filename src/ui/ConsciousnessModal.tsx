// ── Psyche Lab — Gerar Nova Consciência Modal (DOTO/MONO design system) ──────
import React, { useState, useEffect } from 'react';
import {
  ConsciousnessProfile, Complexo, COMPLEXOS,
  generateRandomProfile, generateComposedProfile,
} from '../sim/psyche/consciousnessGen';
import { ARCHETYPES } from '../sim/psyche/archetypes';
import { ArchetypeId } from '../sim/psyche/psycheTypes';

const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";
const ACCENT = '#8b5cf6';

interface Props {
  onClose:  () => void;
  onInvoke: (profile: ConsciousnessProfile) => void;
}

export const ConsciousnessModal: React.FC<Props> = ({ onClose, onInvoke }) => {
  const [tab,      setTab]      = useState<'random' | 'compose'>('random');
  const [profile,  setProfile]  = useState<ConsciousnessProfile | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [invoking, setInvoking] = useState(false);

  useEffect(() => { setProfile(generateRandomProfile()); }, []);

  const composedProfile = selected.length > 0 ? generateComposedProfile(selected) : null;
  const activeProfile   = tab === 'random' ? profile : composedProfile;

  const toggle = (id: string) =>
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev,
    );

  const handleInvoke = () => {
    if (!activeProfile) return;
    setInvoking(true);
    setTimeout(() => { onInvoke(activeProfile); onClose(); }, 320);
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        background: 'rgba(0,0,0,0.92)',
      }}
    >
      <div style={{
        position: 'relative', width: '100%', maxWidth: 640, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'rgba(0,0,0,0.98)',
        border: '1px dashed rgba(255,255,255,0.08)',
      }}>
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: '18px 24px 14px',
          borderBottom: '1px dashed rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
              PSYCHE LAB · CONSCIÊNCIA
            </div>
            <h2 style={{ fontFamily: DOTO, fontSize: 17, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.04em', margin: 0 }}>
              Gerar Nova Consciência
            </h2>
            <p style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.22)', marginTop: 4, fontStyle: 'italic' }}>
              Cada invocação reinicia a psique com novos padrões iniciais.
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.15)', fontSize: 16, padding: '0 2px',
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{
          flexShrink: 0, display: 'flex',
          borderBottom: '1px dashed rgba(255,255,255,0.05)',
        }}>
          {(['random', 'compose'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: tab === t ? `${ACCENT}cc` : 'rgba(255,255,255,0.18)',
              borderBottom: tab === t ? `1px solid ${ACCENT}55` : '1px solid transparent',
              transition: 'all 0.15s',
            }}>
              {t === 'random' ? '✦ Aleatório' : '◈ Compor'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {tab === 'random' && (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => setProfile(generateRandomProfile())} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', background: 'none',
                  border: '1px dashed rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
                  fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                  transition: 'all 0.15s',
                }}>
                  ↻ Gerar Outro
                </button>
                <span style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>
                  Seed aleatório baseado em complexos junguianos
                </span>
              </div>
              {profile && <ProfileCard profile={profile} />}
            </div>
          )}

          {tab === 'compose' && (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.20)', fontStyle: 'italic', margin: 0 }}>
                Selecione até 3 complexos. Os campos se fundirão num perfil único.
                {selected.length > 0 && <span style={{ marginLeft: 4, color: `${ACCENT}55` }}>{selected.length}/3 selecionados.</span>}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {COMPLEXOS.map(c => <ComplexoCard key={c.id} c={c} selected={selected.includes(c.id)} onToggle={() => toggle(c.id)} />)}
              </div>
              {composedProfile && (
                <div style={{ paddingTop: 8, borderTop: '1px dashed rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>↓ Fusão resultante</div>
                  <ProfileCard profile={composedProfile} />
                </div>
              )}
              {selected.length === 0 && (
                <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>
                  Nenhum complexo selecionado ainda.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: '14px 20px', borderTop: '1px dashed rgba(255,255,255,0.05)' }}>
          <button onClick={handleInvoke} disabled={!activeProfile || invoking} style={{
            width: '100%', padding: '12px 0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: invoking ? `${ACCENT}0c` : `${ACCENT}06`,
            border: `1px dashed ${invoking ? `${ACCENT}50` : `${ACCENT}25`}`,
            color: invoking ? `${ACCENT}cc` : `${ACCENT}90`,
            fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: !activeProfile || invoking ? 'not-allowed' : 'pointer',
            opacity: !activeProfile ? 0.3 : 1,
            transition: 'all 0.2s',
          }}>
            ◈ {invoking ? 'Invocando...' : 'Invocar Consciência'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── ProfileCard ─────────────────────────────────────────────────────────────
const ProfileCard: React.FC<{ profile: ConsciousnessProfile }> = ({ profile }) => {
  const arch  = ARCHETYPES.find(a => a.id === profile.dominantArchetype);
  const color = profile.color;

  const topArchs = (Object.entries(profile.archetypeWeights) as [ArchetypeId, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div style={{
      padding: 16,
      background: color + '06',
      border: `1px dashed ${color}22`,
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, color }}>{arch?.sigil ?? '✦'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: DOTO, fontSize: 15, color: 'rgba(255,255,255,0.80)', letterSpacing: '0.04em', marginBottom: 3 }}>
            {profile.name}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 8, fontStyle: 'italic', lineHeight: 1.5, color: color + '99' }}>
            "{profile.poeticLine}"
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 7, padding: '2px 6px', background: color + '12', color: color + 'bb' }}>
              ● {profile.dominantArchetype}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 7, padding: '2px 6px', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.30)' }}>
              {profile.predictedPhase}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 7, padding: '2px 6px', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.30)' }}>
              {profile.activeArchetypes.length} arquétipos
            </span>
          </div>
        </div>
      </div>

      <p style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.28)', marginBottom: 12, lineHeight: 1.6 }}>
        {profile.description}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {topArchs.map(([id, str]) => {
          const a = ARCHETYPES.find(x => x.id === id);
          if (!a) return null;
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, width: 16, flexShrink: 0, textAlign: 'center', color: a.color }}>{a.sigil}</span>
              <span style={{ fontFamily: MONO, fontSize: 7, width: 70, flexShrink: 0, color: 'rgba(255,255,255,0.35)' }}>{a.id}</span>
              <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(str * 100)}%`, background: `linear-gradient(90deg, ${a.color}55, ${a.color}aa)`, transition: 'width 0.7s' }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.20)', width: 26, textAlign: 'right' }}>{Math.round(str * 100)}%</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed rgba(255,255,255,0.04)', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {profile.configMods.danceIntensity != null && (
          <ConfigChip label="Velocidade" value={`${Math.round(profile.configMods.danceIntensity * 100)}%`} />
        )}
        {profile.configMods.breathPeriod != null && (
          <ConfigChip label="Respiração" value={`${Math.round(profile.configMods.breathPeriod)}s`} />
        )}
        {profile.configMods.maxSpeed != null && (
          <ConfigChip label="Max Speed" value={profile.configMods.maxSpeed.toFixed(2)} />
        )}
      </div>
    </div>
  );
};

const ConfigChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <span style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
    <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{value}</span>
  </div>
);

// ── ComplexoCard ─────────────────────────────────────────────────────────────
const ComplexoCard: React.FC<{ c: Complexo; selected: boolean; onToggle: () => void }> = ({ c, selected, onToggle }) => {
  const topArchs = (Object.entries(c.archetypes) as [ArchetypeId, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <button onClick={onToggle} style={{
      textAlign: 'left', padding: 12, cursor: 'pointer',
      background: selected ? c.color + '08' : 'rgba(255,255,255,0.01)',
      border: `1px dashed ${selected ? c.color + '40' : 'rgba(255,255,255,0.05)'}`,
      transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, color: c.color }}>{c.sigil}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, lineHeight: 1.3, color: selected ? c.color : 'rgba(255,255,255,0.50)' }}>
            {c.name}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
            {c.keywords.map(k => (
              <span key={k} style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.15)' }}>{k}</span>
            ))}
          </div>
        </div>
        {selected && <span style={{ fontSize: 9, flexShrink: 0, color: c.color }}>✓</span>}
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {topArchs.map(([id, str]) => {
          const a = ARCHETYPES.find(x => x.id === id);
          return a ? (
            <span key={id} style={{ fontFamily: MONO, fontSize: 7, padding: '2px 6px', background: a.color + '12', color: a.color + '99' }}>
              {a.sigil} {Math.round(str * 100)}%
            </span>
          ) : null;
        })}
      </div>
    </button>
  );
};
