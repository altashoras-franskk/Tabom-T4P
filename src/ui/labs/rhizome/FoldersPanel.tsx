// ── Folders Panel — Are.na-style Collections ─────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import { Folder, Plus, Trash2, ChevronDown, ChevronRight, X, MoveRight, ExternalLink, Tag } from 'lucide-react';

const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";
import type { RhizomeFolder, SavedCard } from '../../../sim/rhizome/rhizomeFolders';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  folders: RhizomeFolder[];
  onCreateFolder: (name: string, desc?: string) => void;
  onDeleteFolder: (id: string) => void;
  onSelectCard: (card: SavedCard) => void;
  onRemoveCard: (folderId: string, cardId: string) => void;
  onMoveCard: (fromFolderId: string, toFolderId: string, cardId: string) => void;
  onClose: () => void;
}

export function FoldersPanel({
  folders, onCreateFolder, onDeleteFolder, onSelectCard, onRemoveCard, onMoveCard, onClose,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [width, setWidth] = useState(340);
  const [isResizing, setIsResizing] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [moveDialogCard, setMoveDialogCard] = useState<{ folderId: string; card: SavedCard } | null>(null);
  
  const panelRef = useRef<HTMLDivElement>(null);

  const toggleFolder = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateFolder(newName.trim(), newDesc.trim() || undefined);
    setNewName('');
    setNewDesc('');
    setShowNew(false);
  };

  // ── Resize Logic ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(280, Math.min(600, e.clientX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <>
      <div
        ref={panelRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height: '100%',
          background: 'rgba(0,0,0,0.97)',
          backdropFilter: 'blur(8px)',
          borderRight: '1px dashed rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 50,
          boxShadow: '6px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 18px',
          borderBottom: '1px dashed rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Folder size={14} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.45)' }} />
            <span style={{ fontFamily: DOTO, fontSize: 11, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              COLEÇÕES
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setShowNew(v => !v)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px dashed rgba(255,255,255,0.06)',
                borderRadius: 1,
                padding: '4px 6px',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.65)',
                fontFamily: MONO,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
              }}
              title="Nova pasta"
            >
              <Plus size={11} strokeWidth={1.5} />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px dashed rgba(255,255,255,0.06)',
                borderRadius: 1,
                padding: '4px 6px',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.45)',
                fontFamily: MONO,
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
              }}
              title="Fechar"
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* New folder form */}
        <AnimatePresence>
          {showNew && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                borderBottom: '1px dashed rgba(255,255,255,0.06)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Nome da coleção"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 1,
                    fontSize: 10,
                    fontFamily: MONO,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px dashed rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.85)',
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
                    padding: '6px 8px',
                    borderRadius: 1,
                    fontSize: 9,
                    fontFamily: MONO,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.65)',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleCreate}
                  style={{
                    width: '100%',
                    padding: '5px 0',
                    borderRadius: 1,
                    fontSize: 8,
                    fontFamily: MONO,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px dashed rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.65)',
                    cursor: 'pointer',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  }}
                >
                  Criar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Folders list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {folders.length === 0 && !showNew && (
            <div style={{
              padding: '24px 20px',
              textAlign: 'center',
              fontSize: 8,
              fontFamily: MONO,
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.5,
            }}>
              Nenhuma coleção ainda.<br/>
              Clique <span style={{ color: 'rgba(255,255,255,0.65)' }}>+</span> para criar.
            </div>
          )}

          {folders.map(folder => {
            const isExpanded = expanded.has(folder.id);
            return (
              <div key={folder.id} style={{ marginBottom: 2 }}>
                {/* Folder header */}
                <div
                  style={{
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => toggleFolder(folder.id)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
                    {isExpanded ? (
                      <ChevronDown size={10} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.45)' }} />
                    ) : (
                      <ChevronRight size={10} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.45)' }} />
                    )}
                    <Folder size={12} strokeWidth={1.5} style={{ color: folder.color || 'rgba(255,255,255,0.45)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>
                        {folder.name}
                      </div>
                      {folder.description && (
                        <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                          {folder.description}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.22)', fontFamily: MONO }}>
                      {folder.cards.length}
                    </span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onDeleteFolder(folder.id); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.2)',
                      padding: 3,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.7)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
                    title="Deletar pasta"
                  >
                    <Trash2 size={10} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Cards */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden', paddingLeft: 32 }}
                    >
                      {folder.cards.length === 0 ? (
                        <div style={{
                          padding: '8px 12px',
                          fontSize: 8,
                          fontFamily: MONO,
                          color: 'rgba(255,255,255,0.22)',
                          fontStyle: 'italic',
                        }}>
                          Vazio
                        </div>
                      ) : (
                        folder.cards.map(card => {
                          const isCardExpanded = expandedCard === card.id;
                          return (
                            <div key={card.id} style={{ marginBottom: 4 }}>
                              <div
                                style={{
                                  padding: '6px 10px',
                                  margin: '2px 8px 2px 0',
                                  borderRadius: 1,
                                  cursor: 'pointer',
                                  background: isCardExpanded ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
                                  border: `1px dashed ${isCardExpanded ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  transition: 'all 0.15s',
                                }}
                                onClick={() => setExpandedCard(isCardExpanded ? null : card.id)}
                                onMouseEnter={e => {
                                  if (!isCardExpanded) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                  }
                                }}
                                onMouseLeave={e => {
                                  if (!isCardExpanded) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                                  }
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontFamily: MONO,
                                    fontSize: 9,
                                    color: 'rgba(255,255,255,0.65)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {card.label}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <button
                                    onClick={e => { 
                                      e.stopPropagation(); 
                                      setMoveDialogCard({ folderId: folder.id, card });
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'rgba(255,255,255,0.15)',
                                      padding: 2,
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(124,58,237,0.6)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.15)')}
                                    title="Mover para outra pasta"
                                  >
                                    <MoveRight size={9} strokeWidth={1.5} />
                                  </button>
                                  <button
                                    onClick={e => { 
                                      e.stopPropagation(); 
                                      onSelectCard(card);
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'rgba(255,255,255,0.15)',
                                      padding: 2,
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(34,197,94,0.7)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.15)')}
                                    title="Abrir snapshot"
                                  >
                                    <ExternalLink size={9} strokeWidth={1.5} />
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); onRemoveCard(folder.id, card.id); }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'rgba(255,255,255,0.15)',
                                      padding: 2,
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.6)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.15)')}
                                    title="Remover"
                                  >
                                    <Trash2 size={8} strokeWidth={1.5} />
                                  </button>
                                </div>
                              </div>

                              {/* Expanded card details */}
                              <AnimatePresence>
                                {isCardExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{
                                      overflow: 'hidden',
                                      margin: '0 8px 0 0',
                                      padding: '8px 10px',
                                      background: 'rgba(0,0,0,0.5)',
                                      borderRadius: 1,
                                      border: '1px dashed rgba(255,255,255,0.06)',
                                    }}
                                  >
                                    {/* Description */}
                                    {card.description && (
                                      <div style={{ marginBottom: 8 }}>
                                        <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.22)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                          Descrição
                                        </div>
                                        <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                                          {card.description}
                                        </div>
                                      </div>
                                    )}

                                    {/* Tags */}
                                    {card.tags && card.tags.length > 0 && (
                                      <div style={{ marginBottom: 8 }}>
                                        <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.22)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <Tag size={7} />
                                          Tags
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                          {card.tags.map((tag, i) => (
                                            <span
                                              key={i}
                                              style={{
                                                fontFamily: MONO,
                                                fontSize: 7,
                                                padding: '2px 6px',
                                                borderRadius: 1,
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px dashed rgba(255,255,255,0.06)',
                                                color: 'rgba(255,255,255,0.65)',
                                              }}
                                            >
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Links */}
                                    {card.links && card.links.length > 0 && (
                                      <div style={{ marginBottom: 8 }}>
                                        <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.22)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                          Links
                                        </div>
                                        {card.links.map((link, i) => (
                                          <a
                                            key={i}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                              display: 'block',
                                              fontFamily: MONO,
                                              fontSize: 8,
                                              color: 'rgba(255,255,255,0.65)',
                                              textDecoration: 'none',
                                              marginBottom: 2,
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
                                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                                          >
                                            🔗 {link}
                                          </a>
                                        ))}
                                      </div>
                                    )}

                                    {/* Connections */}
                                    {card.connections && card.connections.length > 0 && (
                                      <div>
                                        <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.22)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                          Conexões ({card.connections.length})
                                        </div>
                                        <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                                          {card.connections.join(', ')}
                                        </div>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Resize Handle */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 6,
            height: '100%',
            cursor: 'ew-resize',
            background: isResizing ? 'rgba(255,255,255,0.08)' : 'transparent',
            transition: 'all 0.15s',
          }}
          onMouseDown={() => setIsResizing(true)}
          onMouseEnter={e => {
            if (!isResizing) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          }}
          onMouseLeave={e => {
            if (!isResizing) e.currentTarget.style.background = 'transparent';
          }}
        />
      </div>

      {/* Move Card Dialog */}
      <AnimatePresence>
        {moveDialogCard && (
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
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
            onClick={() => setMoveDialogCard(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'rgba(0,0,0,0.97)',
                border: '1px dashed rgba(255,255,255,0.06)',
                borderRadius: 1,
                padding: '20px 24px',
                minWidth: 300,
                maxWidth: 400,
              }}
            >
              <div style={{ fontFamily: DOTO, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 12 }}>
                Mover "{moveDialogCard.card.label}"
              </div>
              <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.45)', marginBottom: 16, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Escolha a pasta de destino:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {folders
                  .filter(f => f.id !== moveDialogCard.folderId)
                  .map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => {
                        onMoveCard(moveDialogCard.folderId, folder.id, moveDialogCard.card.id);
                        setMoveDialogCard(null);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 1,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px dashed rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.65)',
                        fontFamily: MONO,
                        fontSize: 10,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        letterSpacing: '0.06em',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
                      }}
                    >
                      <Folder size={12} strokeWidth={1.5} style={{ color: folder.color || 'rgba(255,255,255,0.45)' }} />
                      <span style={{ fontFamily: MONO }}>{folder.name}</span>
                    </button>
                  ))}
              </div>
              <button
                onClick={() => setMoveDialogCard(null)}
                style={{
                  width: '100%',
                  padding: '6px',
                  borderRadius: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px dashed rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.45)',
                  fontFamily: MONO,
                  fontSize: 8,
                  cursor: 'pointer',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                }}
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
