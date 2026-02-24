// ── Map Library — Saved Maps Drawer ────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import { X, Download, Edit2, Trash2, Check } from 'lucide-react';
import type { KnowledgeMap } from '../types';
import { getAllCachedMaps, deleteCachedMap, renameCachedMap, exportMapAsJSON } from '../mapCache';

interface Props {
  onClose: () => void;
  onLoadMap: (map: KnowledgeMap) => void;
}

export const MapLibrary: React.FC<Props> = ({ onClose, onLoadMap }) => {
  const [maps, setMaps] = useState(() => getAllCachedMaps());
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const handleDelete = useCallback((id: string) => {
    if (confirm('Tem certeza que deseja deletar este mapa?')) {
      deleteCachedMap(id);
      setMaps(getAllCachedMaps());
    }
  }, []);

  const handleStartRename = useCallback((id: string, currentTitle: string) => {
    setRenaming(id);
    setNewTitle(currentTitle);
  }, []);

  const handleConfirmRename = useCallback((id: string) => {
    if (newTitle.trim()) {
      renameCachedMap(id, newTitle.trim());
      setMaps(getAllCachedMaps());
    }
    setRenaming(null);
  }, [newTitle]);

  const handleExport = useCallback((map: KnowledgeMap) => {
    exportMapAsJSON(map);
  }, []);

  const handleLoad = useCallback((map: KnowledgeMap) => {
    onLoadMap(map);
  }, [onLoadMap]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: 450,
      height: '100%',
      background: 'rgba(10,8,20,0.98)',
      borderLeft: '1px solid rgba(255,255,255,0.1)',
      padding: 20,
      overflowY: 'auto',
      zIndex: 200,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, color: '#c4b5fd', fontWeight: 600, marginBottom: 4 }}>
            Biblioteca de Mapas
          </h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            {maps.length} {maps.length === 1 ? 'mapa salvo' : 'mapas salvos'}
          </p>
        </div>
        <button onClick={onClose}
          style={{
            padding: 4,
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
          }}>
          <X size={20} />
        </button>
      </div>

      {/* Maps List */}
      {maps.length === 0 ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: 12,
        }}>
          Nenhum mapa salvo ainda.
          <br />
          Gere seu primeiro mapa!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {maps.slice().reverse().map((entry) => {
            const map = entry.map;
            const isRenaming = renaming === entry.id;

            return (
              <div key={entry.id} style={{
                padding: 14,
                borderRadius: 6,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                {/* Title */}
                {isRenaming ? (
                  <div style={{ marginBottom: 10, display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleConfirmRename(entry.id);
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                    <button onClick={() => handleConfirmRename(entry.id)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: 'rgba(74,222,128,0.2)',
                        border: '1px solid rgba(74,222,128,0.4)',
                        color: '#4ade80',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}>
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <h3 style={{ fontSize: 14, color: '#fff', fontWeight: 600, marginBottom: 8, lineHeight: 1.3 }}>
                    {map.title}
                  </h3>
                )}

                {/* Metadata */}
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <span>{formatDate(entry.timestamp)}</span>
                  <span>•</span>
                  <span>{map.nodes.length} nós</span>
                  <span>•</span>
                  <span>{map.edges.length} conexões</span>
                  <span>•</span>
                  <span style={{ textTransform: 'capitalize' }}>{map.mapSize}</span>
                </div>

                {/* Query */}
                <div style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.5)',
                  marginBottom: 12,
                  fontStyle: 'italic',
                }}>
                  "{map.query}"
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => handleLoad(map)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 4,
                      background: 'rgba(124,58,237,0.2)',
                      border: '1px solid rgba(124,58,237,0.4)',
                      color: '#c4b5fd',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}>
                    Carregar
                  </button>
                  <button onClick={() => handleStartRename(entry.id, map.title)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => handleExport(map)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                    <Download size={12} />
                  </button>
                  <button onClick={() => handleDelete(entry.id)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 4,
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
