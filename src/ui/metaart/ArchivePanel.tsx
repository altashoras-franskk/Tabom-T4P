// ─── Archive & Grimoire Panel ─────────────────────────────────────────────
import React, { useState } from 'react';
import { Heart, Pin, Trash2, BookOpen } from 'lucide-react';
import type { ArchiveEntry, GrimoireEntry, DNA } from '../../sim/metaart/metaArtTypes';
import { formatGrimoireTime } from '../../sim/metaart/metaArtArchive';

interface Props {
  archive: ArchiveEntry[];
  grimoire: GrimoireEntry[];
  onRestoreEntry: (entry: ArchiveEntry) => void;
  onDeleteEntry: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onTogglePin: (id: string) => void;
}

type Tab = 'archive' | 'grimoire';

const TYPE_COLOR: Record<GrimoireEntry['type'], string> = {
  observation: 'rgba(100,180,255,0.7)',
  suggestion:  'rgba(180,140,255,0.7)',
  milestone:   'rgba(100,220,140,0.7)',
};

export const ArchivePanel: React.FC<Props> = ({
  archive, grimoire, onRestoreEntry, onDeleteEntry, onToggleFavorite, onTogglePin,
}) => {
  const [tab, setTab] = useState<Tab>('archive');

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#000', fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px dashed rgba(255,255,255,0.06)' }}>
        {(['archive', 'grimoire'] as Tab[]).map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
              background: tab === t ? 'rgba(255,0,132,0.04)' : 'transparent',
              color: tab === t ? '#ff0084' : 'rgba(255,255,255,0.28)',
              fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase',
              borderBottom: tab === t ? '1px solid #ff0084' : '1px solid transparent',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
            {t === 'archive' ? 'ARCHIVE' : 'GRIMOIRE'}
          </button>
        ))}
      </div>

      {tab === 'archive' ? (
        <div className="flex-1 overflow-y-auto" style={{ padding: '8px 6px' }}>
          {archive.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
              Nenhum snapshot salvo.<br />Use a camera icon para capturar.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {archive.map(entry => (
                <ArchiveCard key={entry.id} entry={entry}
                  onRestore={() => onRestoreEntry(entry)}
                  onDelete={() => onDeleteEntry(entry.id)}
                  onFavorite={() => onToggleFavorite(entry.id)}
                  onPin={() => onTogglePin(entry.id)} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" style={{ padding: '8px 6px' }}>
          {grimoire.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
              Grimoire vazio. Observacoes emergem durante a criacao.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {grimoire.map(entry => (
                <div key={entry.id}
                  style={{ padding: '6px 8px', borderRadius: 4,
                    background: 'rgba(255,255,255,0.02)', borderLeft: `2px solid ${TYPE_COLOR[entry.type]}` }}>
                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', marginBottom: 2, fontFamily: 'monospace' }}>
                    {formatGrimoireTime(entry.timestamp)} · {entry.type}
                  </div>
                  <div style={{ fontSize: 9, color: TYPE_COLOR[entry.type], lineHeight: 1.4 }}>
                    {entry.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function ArchiveCard({
  entry, onRestore, onDelete, onFavorite, onPin,
}: {
  entry: ArchiveEntry;
  onRestore: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onPin: () => void;
}) {
  const date = new Date(entry.timestamp);
  const label = `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;

  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4,
      background: entry.pinned ? 'rgba(255,200,60,0.04)' : 'rgba(255,255,255,0.02)',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', gap: 0 }}>
        {/* Thumbnail */}
        <button onClick={onRestore}
          title="Restaurar DNA e semente"
          style={{ border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
          <img src={entry.thumbnail} alt=""
            style={{ width: 52, height: 52, display: 'block', objectFit: 'cover' }} />
        </button>

        {/* Info */}
        <div style={{ flex: 1, padding: '5px 7px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{label}</div>
            {entry.dna.name && (
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{entry.dna.name}</div>
            )}
            <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
              {entry.dna.palette.map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <button onClick={onFavorite}
              style={{ ...iconBtnStyle, color: entry.favorite ? '#f87171' : 'rgba(255,255,255,0.2)' }}>
              <Heart size={10} strokeWidth={1.5} />
            </button>
            <button onClick={onPin}
              style={{ ...iconBtnStyle, color: entry.pinned ? '#fbbf24' : 'rgba(255,255,255,0.2)' }}>
              <Pin size={10} strokeWidth={1.5} />
            </button>
            <button onClick={onDelete}
              style={{ ...iconBtnStyle, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>
              <Trash2 size={10} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Gestures summary */}
      {entry.gestures.length > 0 && (
        <div style={{ padding: '3px 7px', borderTop: '1px solid rgba(255,255,255,0.04)',
          fontSize: 7, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
          {entry.gestures.map(g => g.toolId.replace('_', ' ')).slice(0, 5).join(' · ')}
        </div>
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  display: 'flex', alignItems: 'center',
};