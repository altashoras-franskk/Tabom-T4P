// ── MetaArt Hub Panel — Save/Load presets and artes (userStorage) ─────────────
import React, { useState, useEffect } from 'react';
import { Save, Upload, Trash2, Clock, Cloud } from 'lucide-react';
import type { DNA } from '../../sim/metaart/metaArtTypes';
import { useAuth } from '../../app/components/AuthModal';
import { getHubData, addHubEntry, removeHubEntry } from '../../storage/userStorage';

const LAB_ID = 'metaArtLab';

export interface MetaArtPreset {
  id: string;
  name: string;
  timestamp: number;
  dna: DNA;
}

export interface MetaArtArte {
  id: string;
  name: string;
  timestamp: number;
  dna: DNA;
  seed: number;
}

interface MetaArtHubPanelProps {
  dna: DNA;
  seed: number;
  onLoadPreset: (dna: DNA) => void;
  onLoadArte: (dna: DNA, seed: number) => void;
}

export function MetaArtHubPanel({ dna, seed, onLoadPreset, onLoadArte }: MetaArtHubPanelProps) {
  const { user: authUser } = useAuth();
  const userId = authUser?.id ?? null;
  const [presets, setPresets] = useState<MetaArtPreset[]>([]);
  const [saves, setSaves] = useState<MetaArtArte[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getHubData<MetaArtPreset & MetaArtArte>(LAB_ID, userId);
      setPresets(Array.isArray(data.presets) ? data.presets : []);
      setSaves(Array.isArray(data.saves) ? data.saves : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const style = {
    section: { marginBottom: 12, padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' },
    label: { fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 },
    row: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
    input: { flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '4px 8px', color: '#fff', fontSize: 10 },
    btn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.5)' },
    btnPrimary: { background: 'rgba(255,0,132,0.2)', border: '1px solid rgba(255,0,132,0.4)', borderRadius: 4, padding: '4px 8px', color: '#ff80b3', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  };

  return (
    <div style={{ padding: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ ...style.section, marginBottom: 10 }}>
        <div style={{ ...style.label, display: 'flex', alignItems: 'center', gap: 4 }}>
          {userId ? <Cloud size={9} color="#60a5fa" /> : null}
          Meus presets e artes {userId ? '(conta)' : '(local)'}
        </div>
        <div style={style.row}>
          <input
            type="text"
            placeholder="Nome"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            style={style.input}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button
            type="button"
            onClick={() => {
              const name = saveName.trim() || dna.name || 'Preset';
              const entry: MetaArtPreset = {
                id: `pre_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                name,
                timestamp: Date.now(),
                dna: { ...dna },
              };
              addHubEntry(LAB_ID, 'presets', entry, userId);
              setPresets(prev => [...prev, entry]);
              setSaveName('');
            }}
            style={style.btnPrimary}
          >
            <Save size={10} /> Salvar preset
          </button>
          <button
            type="button"
            onClick={() => {
              const name = saveName.trim() || dna.name || 'Arte';
              const entry: MetaArtArte = {
                id: `art_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                name,
                timestamp: Date.now(),
                dna: { ...dna },
                seed,
              };
              addHubEntry(LAB_ID, 'saves', entry, userId);
              setSaves(prev => [...prev, entry]);
              setSaveName('');
            }}
            style={style.btnPrimary}
          >
            <Save size={10} /> Salvar arte
          </button>
        </div>
      </div>

      <div style={style.section}>
        <div style={style.label}>Presets</div>
        {loading && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Carregando...</div>}
        <div style={{ maxHeight: 120, overflowY: 'auto' }}>
          {presets.length === 0 && !loading && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Nenhum.</div>}
          {presets.map(p => (
            <div key={p.id} style={style.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={8} /> {formatDate(p.timestamp)}
                </div>
              </div>
              <button title="Carregar" onClick={() => onLoadPreset(p.dna)} style={style.btn}><Upload size={12} className="text-green-400" /></button>
              <button title="Excluir" onClick={() => { removeHubEntry(LAB_ID, 'presets', p.id, userId); setPresets(prev => prev.filter(x => x.id !== p.id)); }} style={style.btn}><Trash2 size={12} className="text-red-400" /></button>
            </div>
          ))}
        </div>
      </div>

      <div style={style.section}>
        <div style={style.label}>Artes salvas</div>
        <div style={{ maxHeight: 120, overflowY: 'auto' }}>
          {saves.length === 0 && !loading && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Nenhuma.</div>}
          {saves.map(s => (
            <div key={s.id} style={style.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}><Clock size={8} /> {formatDate(s.timestamp)}</div>
              </div>
              <button title="Carregar" onClick={() => onLoadArte(s.dna, s.seed)} style={style.btn}><Upload size={12} className="text-green-400" /></button>
              <button title="Excluir" onClick={() => { removeHubEntry(LAB_ID, 'saves', s.id, userId); setSaves(prev => prev.filter(x => x.id !== s.id)); }} style={style.btn}><Trash2 size={12} className="text-red-400" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
