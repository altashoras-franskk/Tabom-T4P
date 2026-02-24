// ── Save to Folder Modal ──────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Folder, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { RhizomeFolder } from '../../../sim/rhizome/rhizomeFolders';

interface Props {
  folders: RhizomeFolder[];
  onSelect: (folderId: string) => void;
  onCreateFolder: (name: string, desc?: string) => void;
  onClose: () => void;
}

export function SaveToFolderModal({ folders, onSelect, onCreateFolder, onClose }: Props) {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateFolder(newName.trim(), newDesc.trim() || undefined);
    setNewName('');
    setNewDesc('');
    setShowNew(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(10,8,20,0.95)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          padding: '20px 24px',
          minWidth: 340,
          maxWidth: 420,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Folder size={16} strokeWidth={1.5} style={{ color: 'rgba(196,181,253,0.6)' }} />
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
              Salvar em Coleção
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* New Folder Toggle */}
        <button
          onClick={() => setShowNew(v => !v)}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            background: showNew ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.1)',
            border: `1px solid ${showNew ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.25)'}`,
            color: 'rgba(196,181,253,0.9)',
            fontSize: 10,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 12,
            fontWeight: 500,
          }}
        >
          <Plus size={11} strokeWidth={1.5} />
          Nova Coleção
        </button>

        {/* New Folder Form */}
        <AnimatePresence>
          {showNew && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden', marginBottom: 12 }}
            >
              <div style={{
                padding: 12,
                borderRadius: 6,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <input
                  type="text"
                  placeholder="Nome da coleção"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 4,
                    fontSize: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    outline: 'none',
                  }}
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 4,
                    fontSize: 9,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleCreate}
                  style={{
                    width: '100%',
                    padding: '6px 0',
                    borderRadius: 4,
                    fontSize: 9,
                    background: 'rgba(124,58,237,0.25)',
                    border: '1px solid rgba(124,58,237,0.4)',
                    color: 'rgba(196,181,253,0.95)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    letterSpacing: '0.05em',
                  }}
                >
                  Criar e Salvar Aqui
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Folders List */}
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
          Escolha uma coleção existente:
        </div>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginBottom: 16,
        }}>
          {folders.length === 0 ? (
            <div style={{
              padding: '24px 20px',
              textAlign: 'center',
              fontSize: 9,
              color: 'rgba(255,255,255,0.25)',
              lineHeight: 1.5,
            }}>
              Nenhuma coleção ainda.<br/>
              Crie uma nova acima.
            </div>
          ) : (
            folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => onSelect(folder.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(124,58,237,0.25)',
                  color: 'rgba(196,181,253,0.9)',
                  fontSize: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(124,58,237,0.2)';
                  e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(124,58,237,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)';
                }}
              >
                <Folder size={13} strokeWidth={1.5} style={{ color: folder.color || 'rgba(196,181,253,0.6)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{folder.name}</div>
                  {folder.description && (
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {folder.description}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 8,
                  color: 'rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '2px 6px',
                  borderRadius: 3,
                  fontFamily: 'monospace',
                }}>
                  {folder.cards.length}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '7px',
            borderRadius: 4,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 9,
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </motion.div>
    </motion.div>
  );
}
