// ── Music Lab Hub Panel — Save/Load compositions (preset + physics) ───────────
import React, { useState, useEffect } from 'react';
import { Save, Upload, Trash2, Clock, Cloud } from 'lucide-react';
import type { MusicPreset, PhysicsParams } from '../../sim/music/musicTypes';
import { useAuth } from '../AuthModal';
import { getHubData, addHubEntry, removeHubEntry } from '../../../storage/userStorage';

const LAB_ID = 'musicLab';

export interface MusicComposition {
  id: string;
  name: string;
  timestamp: number;
  preset: MusicPreset;
  physics: PhysicsParams;
}

interface MusicLabHubPanelProps {
  preset: MusicPreset;
  physics: PhysicsParams;
  onLoadComposition: (preset: MusicPreset, physics: PhysicsParams) => void;
}

export function MusicLabHubPanel({ preset, physics, onLoadComposition }: MusicLabHubPanelProps) {
  const { user: authUser } = useAuth();
  const userId = authUser?.id ?? null;
  const [saves, setSaves] = useState<MusicComposition[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getHubData<MusicComposition>(LAB_ID, userId);
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
    btnPrimary: { background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.35)', borderRadius: 4, padding: '4px 8px', color: '#7dd3fc', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  };

  return (
    <div style={{ padding: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ ...style.section, marginBottom: 10 }}>
        <div style={{ ...style.label, display: 'flex', alignItems: 'center', gap: 4 }}>
          {userId ? <Cloud size={9} color="#60a5fa" /> : null}
          Minhas composições {userId ? '(conta)' : '(local)'}
        </div>
        <div style={style.row}>
          <input
            type="text"
            placeholder="Nome da composição"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            style={style.input}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const name = saveName.trim() || preset.name || 'Composição';
            const entry: MusicComposition = {
              id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name,
              timestamp: Date.now(),
              preset: { ...preset },
              physics: { ...physics },
            };
            addHubEntry(LAB_ID, 'saves', entry, userId);
            setSaves(prev => [...prev, entry]);
            setSaveName('');
          }}
          style={style.btnPrimary}
        >
          <Save size={10} /> Salvar composição
        </button>
      </div>

      <div style={style.section}>
        <div style={style.label}>Composições salvas</div>
        {loading && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Carregando...</div>}
        <div style={{ maxHeight: 180, overflowY: 'auto' }}>
          {saves.length === 0 && !loading && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Nenhuma.</div>}
          {saves.map(s => (
            <div key={s.id} style={style.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}><Clock size={8} /> {formatDate(s.timestamp)}</div>
              </div>
              <button title="Carregar" onClick={() => onLoadComposition(s.preset, s.physics)} style={style.btn}><Upload size={12} className="text-green-400" /></button>
              <button title="Excluir" onClick={() => { removeHubEntry(LAB_ID, 'saves', s.id, userId); setSaves(prev => prev.filter(x => x.id !== s.id)); }} style={style.btn}><Trash2 size={12} className="text-red-400" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
