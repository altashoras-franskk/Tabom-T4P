// ── Psyche Lab — Gerar Nova Consciência Modal ─────────────────────────────────
import React, { useState, useEffect } from 'react';
import { X, Shuffle, Zap } from 'lucide-react';
import {
  ConsciousnessProfile, Complexo, COMPLEXOS,
  generateRandomProfile, generateComposedProfile,
} from '../sim/psyche/consciousnessGen';
import { ARCHETYPES } from '../sim/psyche/archetypes';
import { ArchetypeId } from '../sim/psyche/psycheTypes';

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
    setTimeout(() => {
      onInvoke(activeProfile);
      onClose();
    }, 320);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(3,1,10,0.90)', backdropFilter: 'blur(16px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-[640px] rounded-2xl overflow-hidden flex flex-col"
        style={{
          maxHeight: '90vh',
          background: 'linear-gradient(145deg, rgba(14,9,28,0.99) 0%, rgba(7,5,14,0.99) 100%)',
          border: '1px solid rgba(180,160,255,0.10)',
          boxShadow: '0 0 80px rgba(100,60,200,0.08)',
        }}
      >
        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b border-white/[0.07] flex items-start justify-between">
          <div>
            <div className="text-[8px] uppercase tracking-widest text-white/20 mb-1.5 font-mono">
              PSYCHE LAB · CONSCIÊNCIA
            </div>
            <h2 className="text-[17px] text-white/80 tracking-wide">Gerar Nova Consciência</h2>
            <p className="text-[9px] text-white/25 mt-1 italic">
              Cada invocação reinicia a psique com novos padrões iniciais.
            </p>
          </div>
          <button onClick={onClose}
            className="text-white/15 hover:text-white/50 transition-colors mt-0.5">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex border-b border-white/[0.06]">
          {(['random', 'compose'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[9px] uppercase tracking-widest transition-all relative ${
                tab === t ? 'text-purple-300' : 'text-white/20 hover:text-white/45'
              }`}>
              {t === 'random' ? '✦ Aleatório' : '◈ Compor'}
              {tab === t && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-px bg-purple-400/60" />
              )}
            </button>
          ))}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {tab === 'random' && (
            <div className="p-5 space-y-4">
              <div className="flex gap-2 items-center">
                <button onClick={() => setProfile(generateRandomProfile())}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10
                    text-white/35 hover:text-white/65 hover:border-white/20 transition-all text-[9px] uppercase tracking-widest">
                  <Shuffle size={11} /> Gerar Outro
                </button>
                <span className="text-[8px] text-white/18 italic">
                  Seed aleatório baseado em complexos junguianos
                </span>
              </div>

              {profile && <ProfileCard profile={profile} />}
            </div>
          )}

          {tab === 'compose' && (
            <div className="p-5 space-y-4">
              <p className="text-[8px] text-white/22 italic">
                Selecione até 3 complexos. Os campos se fundirão num perfil único.
                {selected.length > 0 && (
                  <span className="ml-1 text-purple-400/60">{selected.length}/3 selecionados.</span>
                )}
              </p>

              <div className="grid grid-cols-2 gap-2">
                {COMPLEXOS.map(c => <ComplexoCard key={c.id} c={c} selected={selected.includes(c.id)} onToggle={() => toggle(c.id)} />)}
              </div>

              {composedProfile && (
                <div className="pt-2 border-t border-white/[0.06] space-y-3">
                  <div className="text-[8px] text-white/25 uppercase tracking-widest">↓ Fusão resultante</div>
                  <ProfileCard profile={composedProfile} />
                </div>
              )}

              {selected.length === 0 && (
                <div className="py-6 text-center text-[9px] text-white/18 italic">
                  Nenhum complexo selecionado ainda.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={handleInvoke}
            disabled={!activeProfile || invoking}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl
              border text-[10px] uppercase tracking-widest font-mono transition-all duration-300
              disabled:opacity-30 disabled:cursor-not-allowed ${
                invoking
                  ? 'border-purple-400/60 text-purple-300 bg-purple-500/12 scale-[0.98]'
                  : 'border-purple-400/35 text-purple-300/80 hover:border-purple-400/70 hover:bg-purple-500/08 hover:text-purple-200'
              }`}
          >
            <Zap size={12} className={invoking ? 'animate-pulse' : ''} />
            {invoking ? 'Invocando...' : 'Invocar Consciência'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── ProfileCard ───────────────────────────────────────────────────────────────

const ProfileCard: React.FC<{ profile: ConsciousnessProfile }> = ({ profile }) => {
  const arch  = ARCHETYPES.find(a => a.id === profile.dominantArchetype);
  const color = profile.color;

  const topArchs = (Object.entries(profile.archetypeWeights) as [ArchetypeId, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div className="rounded-xl p-4 border transition-all"
      style={{ background: color + '09', borderColor: color + '25' }}>

      {/* Title row */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-[32px] leading-none shrink-0 mt-0.5" style={{ color }}>
          {arch?.sigil ?? '✦'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] text-white/85 tracking-wide mb-0.5">{profile.name}</div>
          <div className="text-[8.5px] italic leading-snug" style={{ color: color + 'aa' }}>
            "{profile.poeticLine}"
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[7.5px] px-1.5 py-0.5 rounded font-mono"
              style={{ background: color + '1a', color: color + 'cc' }}>
              ● {profile.dominantArchetype}
            </span>
            <span className="text-[7.5px] px-1.5 py-0.5 rounded font-mono bg-white/[0.05] text-white/35">
              Previsto: {profile.predictedPhase}
            </span>
            <span className="text-[7.5px] px-1.5 py-0.5 rounded font-mono bg-white/[0.05] text-white/35">
              {profile.activeArchetypes.length} arquétipos ativos
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-[8px] text-white/35 mb-3 leading-relaxed">{profile.description}</p>

      {/* Archetype bars */}
      <div className="space-y-1.5">
        {topArchs.map(([id, str]) => {
          const a = ARCHETYPES.find(x => x.id === id);
          if (!a) return null;
          return (
            <div key={id} className="flex items-center gap-2">
              <span className="text-[12px] w-4 shrink-0 text-center" style={{ color: a.color }}>{a.sigil}</span>
              <span className="text-[7.5px] font-mono w-20 shrink-0 text-white/40">{a.id}</span>
              <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.round(str * 100)}%`, background: `linear-gradient(90deg, ${a.color}77, ${a.color}cc)` }} />
              </div>
              <span className="text-[7px] font-mono text-white/25 w-7 text-right">{Math.round(str * 100)}%</span>
            </div>
          );
        })}
      </div>

      {/* Config snapshot */}
      <div className="mt-3 pt-3 border-t border-white/[0.05] flex flex-wrap gap-3">
        {profile.configMods.danceIntensity != null && (
          <ConfigChip label="Velocidade" value={`${Math.round((profile.configMods.danceIntensity) * 100)}%`} />
        )}
        {profile.configMods.breathPeriod != null && (
          <ConfigChip label="Respiração" value={`${Math.round(profile.configMods.breathPeriod)}s`} />
        )}
        {profile.configMods.maxSpeed != null && (
          <ConfigChip label="Max Speed" value={(profile.configMods.maxSpeed).toFixed(2)} />
        )}
      </div>
    </div>
  );
};

const ConfigChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col items-center">
    <span className="text-[6.5px] uppercase tracking-widest text-white/18">{label}</span>
    <span className="text-[9px] font-mono text-white/40">{value}</span>
  </div>
);

// ── ComplexoCard ──────────────────────────────────────────────────────────────

const ComplexoCard: React.FC<{ c: Complexo; selected: boolean; onToggle: () => void }> = ({
  c, selected, onToggle,
}) => {
  const topArchs = (Object.entries(c.archetypes) as [ArchetypeId, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <button
      onClick={onToggle}
      className={`text-left p-3 rounded-xl border transition-all duration-200 ${
        selected ? 'scale-[1.01]' : 'hover:scale-[1.005]'
      }`}
      style={{
        background:   selected ? c.color + '0f' : 'rgba(255,255,255,0.02)',
        borderColor:  selected ? c.color + '50' : 'rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[20px] leading-none shrink-0" style={{ color: c.color }}>{c.sigil}</span>
        <div>
          <div className="text-[9.5px] font-mono leading-tight" style={{ color: selected ? c.color : '#999' }}>
            {c.name}
          </div>
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {c.keywords.map(k => (
              <span key={k} className="text-[6.5px] text-white/18">{k}</span>
            ))}
          </div>
        </div>
        {selected && (
          <span className="ml-auto text-[9px] shrink-0" style={{ color: c.color }}>✓</span>
        )}
      </div>

      {/* Archetype pills */}
      <div className="flex gap-1 flex-wrap">
        {topArchs.map(([id, str]) => {
          const a = ARCHETYPES.find(x => x.id === id);
          return a ? (
            <span key={id} className="text-[7px] px-1.5 py-0.5 rounded font-mono"
              style={{ background: a.color + '18', color: a.color + 'bb' }}>
              {a.sigil} {Math.round(str * 100)}%
            </span>
          ) : null;
        })}
      </div>
    </button>
  );
};
