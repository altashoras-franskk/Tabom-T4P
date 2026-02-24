// ─────────────────────────────────────────────────────────────────────────────
// LexiconDrawer — Grimório / Dicionário vivo
// search + clusters + list + export/import
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useMemo, useRef } from 'react';
import type { LexiconEntry, LexiconCluster, GlyphSpec } from '../../sim/language/types';
import { drawGlyph } from './glyphRenderer';
import { Search, Download, Upload, CheckCircle, Clock, SortAsc, X } from 'lucide-react';
import { exportGrimoire, importGrimoire } from '../../storage/grimoireStore';
import type { LanguageSession } from '../../sim/language/types';

type SortKey = 'confidence' | 'recent' | 'frequency';

interface Props {
  entries: LexiconEntry[];
  clusters: LexiconCluster[];
  sessions: LanguageSession[];
  onSelect: (entry: LexiconEntry) => void;
  onClose: () => void;
  onImport: (entries: LexiconEntry[]) => void;
}

function EntryRow({ entry, onClick }: { entry: LexiconEntry; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const SIZE = 36;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, SIZE, SIZE);
    drawGlyph(ctx, entry.miniGlyphSpec, SIZE / 2, SIZE / 2, SIZE * 0.43, { alpha: 0.88, glow: false });
  }, [entry.miniGlyphSpec, SIZE]);

  const conf = entry.confidence;
  const confColor = conf > 0.7 ? '#80ff80' : conf > 0.4 ? '#ffd060' : '#ff8060';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', cursor: 'pointer',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(160,80,255,0.07)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <canvas ref={canvasRef} width={SIZE} height={SIZE}
        style={{ borderRadius: 4, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, color: 'rgba(242,232,215,0.92)', fontWeight: 500 }}>
            {entry.gloss || '(sem gloss)'}
          </span>
          {entry.status === 'accepted'
            ? <CheckCircle size={9} color="#80ff80" />
            : <Clock size={9} color="rgba(255,255,255,0.2)" />
          }
        </div>
        <div style={{ fontSize: 9, color: 'rgba(200,190,180,0.6)', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.definition || entry.tokens.slice(0, 4).join(' · ')}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 7, color: confColor }}>{Math.round(conf * 100)}%</span>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)' }}>{entry.frequency}×</span>
          {entry.tags.slice(0, 2).map(t => (
            <span key={t} style={{ fontSize: 7, color: 'rgba(100,160,255,0.6)' }}>#{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LexiconDrawer({ entries, clusters, sessions, onSelect, onClose, onImport }: Props) {
  const [query,       setQuery]       = useState('');
  const [sortKey,     setSortKey]     = useState<SortKey>('recent');
  const [activeClust, setActiveClust] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let list = [...entries];
    if (activeClust) list = list.filter(e => e.clusterId === activeClust);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(e =>
        e.gloss.toLowerCase().includes(q) ||
        e.definition.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q)) ||
        e.tokens.some(t => t.toLowerCase().includes(q)),
      );
    }
    list.sort((a, b) => {
      if (sortKey === 'confidence') return b.confidence - a.confidence;
      if (sortKey === 'frequency')  return b.frequency  - a.frequency;
      return b.lastUpdated - a.lastUpdated;
    });
    return list;
  }, [entries, query, sortKey, activeClust]);

  const panelSty: React.CSSProperties = {
    position: 'fixed', top: 0, right: 0, bottom: 0,
    width: 320, zIndex: 50,
    background: 'rgba(6,4,18,0.98)',
    borderLeft: '1px solid rgba(160,80,255,0.2)',
    display: 'flex', flexDirection: 'column',
    fontFamily: 'system-ui, sans-serif',
    backdropFilter: 'blur(16px)',
    boxShadow: '-4px 0 40px rgba(0,0,0,0.7)',
  };

  const CLUSTER_COLORS = ['#a070ff', '#60c0ff', '#ff8060', '#80ff80', '#ffd060'];

  return (
    <div style={panelSty}>
      {/* Header */}
      <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 8, letterSpacing: '0.18em', color: 'rgba(160,80,255,0.6)', textTransform: 'uppercase' }}>
              Grimório Heptapod
            </div>
            <div style={{ fontSize: 13, color: 'rgba(242,232,215,0.9)', marginTop: 1 }}>
              {entries.length} verbetes
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button
              onClick={() => exportGrimoire(entries, sessions)}
              title="Exportar JSON"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 5, padding: '4px 6px', cursor: 'pointer', color: 'rgba(200,200,200,0.7)' }}>
              <Download size={11} />
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              title="Importar JSON"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 5, padding: '4px 6px', cursor: 'pointer', color: 'rgba(200,200,200,0.7)' }}>
              <Upload size={11} />
            </button>
            <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) importGrimoire(f, data => onImport(data.lexicon), err => alert(err));
                e.target.value = '';
              }} />
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={10} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.2)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="buscar gloss, tag, token…"
            style={{ width: '100%', fontSize: 10, padding: '5px 8px 5px 24px', borderRadius: 5,
              background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(235,225,210,0.85)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Clusters */}
      {clusters.length > 0 && (
        <div style={{ padding: '6px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveClust(null)}
            style={{ fontSize: 8, padding: '2px 7px', borderRadius: 10, cursor: 'pointer',
              background: !activeClust ? 'rgba(160,80,255,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${!activeClust ? 'rgba(160,80,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: !activeClust ? 'rgba(200,160,255,0.9)' : 'rgba(200,200,200,0.5)' }}>
            todos
          </button>
          {clusters.map((cl, i) => (
            <button key={cl.id}
              onClick={() => setActiveClust(activeClust === cl.id ? null : cl.id)}
              style={{ fontSize: 8, padding: '2px 7px', borderRadius: 10, cursor: 'pointer',
                background: activeClust === cl.id ? `${CLUSTER_COLORS[i % CLUSTER_COLORS.length]}22` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${activeClust === cl.id ? CLUSTER_COLORS[i % CLUSTER_COLORS.length] + '55' : 'rgba(255,255,255,0.08)'}`,
                color: CLUSTER_COLORS[i % CLUSTER_COLORS.length] + 'cc' }}>
              {cl.label} ({cl.members.length})
            </button>
          ))}
        </div>
      )}

      {/* Sort controls */}
      <div style={{ padding: '4px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', gap: 5, alignItems: 'center' }}>
        <SortAsc size={9} style={{ color: 'rgba(255,255,255,0.2)' }} />
        {(['confidence', 'recent', 'frequency'] as SortKey[]).map(k => (
          <button key={k}
            onClick={() => setSortKey(k)}
            style={{ fontSize: 7, padding: '1px 6px', borderRadius: 3, cursor: 'pointer',
              background: sortKey === k ? 'rgba(160,80,255,0.15)' : 'transparent',
              border: `1px solid ${sortKey === k ? 'rgba(160,80,255,0.3)' : 'transparent'}`,
              color: sortKey === k ? 'rgba(200,160,255,0.9)' : 'rgba(200,200,200,0.35)',
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {k}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 7, color: 'rgba(255,255,255,0.2)' }}>
          {filtered.length}
        </span>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(160,80,255,0.15) transparent' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 20, fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
            {entries.length === 0 ? 'Dicionário vazio — Listen por 1 minuto!' : 'Nenhum resultado.'}
          </div>
        )}
        {filtered.map(entry => (
          <EntryRow key={entry.glyphId} entry={entry} onClick={() => onSelect(entry)} />
        ))}
      </div>
    </div>
  );
}
