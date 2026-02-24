// ── Node Inspector — Graph Metrics + Quick Actions ──────────────────────────

const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";

import React from 'react';
import { Bookmark, ExternalLink, Network, Zap } from 'lucide-react';
import type { RhizomeNode } from '../../../sim/rhizome/rhizomeTypes';
import type { NodeScore } from '../../../sim/rhizome/graphMetrics';
import { motion } from 'motion/react';

interface Props {
  node: RhizomeNode;
  allNodes: RhizomeNode[];
  score?: NodeScore;
  onClose: () => void;
  onSaveCard: (node: RhizomeNode) => void;
  onSendToArena: (node: RhizomeNode) => void;
  onExpand: (node: RhizomeNode) => void;
}

export function NodeInspector({
  node, allNodes, score, onClose, onSaveCard, onSendToArena, onExpand,
}: Props) {
  const connectedNodes = Array.from(node.connections.keys())
    .map(id => allNodes.find(n => n.id === id))
    .filter(Boolean) as RhizomeNode[];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{
        position: 'fixed',
        top: 80,
        right: 20,
        width: 320,
        maxHeight: 'calc(100vh - 120px)',
        background: 'rgba(10,8,18,0.95)',
        backdropFilter: 'blur(24px)',
        border: '1px dashed rgba(255,255,255,0.06)',
        borderRadius: 1,
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px dashed rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: DOTO,
            fontSize: 13,
            color: 'rgba(255,255,255,0.85)',
            fontWeight: 600,
            lineHeight: 1.3,
          }}>
            {node.label || `Node ${node.id}`}
          </div>
          {node.category && (
            <div style={{
              display: 'inline-block',
              marginTop: 4,
              padding: '2px 6px',
              borderRadius: 1,
              fontSize: 7,
              background: 'rgba(124,58,237,0.15)',
              border: '1px dashed rgba(124,58,237,0.35)',
              color: 'rgba(196,181,253,0.8)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontFamily: MONO,
            }}>
              {node.category}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontFamily: MONO,
            color: 'rgba(255,255,255,0.45)',
            cursor: 'pointer',
            fontSize: 16,
            padding: 0,
            lineHeight: 1,
            transition: 'all 0.15s',
          }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {/* Description */}
        {node.description && (
          <div style={{
            fontFamily: MONO,
            fontSize: 10,
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.5,
            marginBottom: 14,
          }}>
            {node.description}
          </div>
        )}

        {/* Graph Metrics */}
        {score && (
          <div style={{
            marginBottom: 14,
            padding: '10px 12px',
            borderRadius: 1,
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.06)',
          }}>
            <div style={{
              fontFamily: MONO,
              fontSize: 8,
              color: 'rgba(255,255,255,0.22)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}>
              <Network size={9} strokeWidth={1.5} />
              Métricas de Rede
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Relevance */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>
                  Relevância
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 60,
                    height: 4,
                    borderRadius: 1,
                    background: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${score.relevance * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, rgba(124,58,237,0.6), rgba(196,181,253,0.8))',
                    }} />
                  </div>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', fontFamily: MONO, minWidth: 28 }}>
                    {(score.relevance * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Betweenness (Bridge Quality) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>
                  Ponte {score.isBridge && '🌉'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 60,
                    height: 4,
                    borderRadius: 1,
                    background: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${score.betweenness * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, rgba(251,191,36,0.6), rgba(251,191,36,0.9))',
                    }} />
                  </div>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', fontFamily: MONO, minWidth: 28 }}>
                    {(score.betweenness * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Closeness (Centrality) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>
                  Centralidade
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 60,
                    height: 4,
                    borderRadius: 1,
                    background: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.min(score.closeness * 100, 100)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, rgba(34,197,94,0.6), rgba(34,197,94,0.9))',
                    }} />
                  </div>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', fontFamily: MONO, minWidth: 28 }}>
                    {(Math.min(score.closeness, 1) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Degree (Connections) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>
                  Conexões {score.isHub && '⭐'}
                </span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', fontFamily: MONO }}>
                  {score.degree}
                </span>
              </div>

              {/* Combined Score */}
              <div style={{
                marginTop: 4,
                paddingTop: 8,
                borderTop: '1px dashed rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                  Score Total
                </span>
                <div style={{
                  padding: '2px 7px',
                  borderRadius: 1,
                  background: 'rgba(124,58,237,0.2)',
                  border: '1px dashed rgba(124,58,237,0.35)',
                  fontSize: 9,
                  color: 'rgba(196,181,253,0.95)',
                  fontFamily: MONO,
                  fontWeight: 600,
                }}>
                  {(score.combined * 100).toFixed(0)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connected Nodes */}
        {connectedNodes.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontFamily: MONO,
              fontSize: 8,
              color: 'rgba(255,255,255,0.22)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 7,
            }}>
              Conexões ({connectedNodes.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {connectedNodes.slice(0, 8).map(cn => (
                <div
                  key={cn.id}
                  style={{
                    padding: '5px 8px',
                    borderRadius: 1,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.06)',
                    fontSize: 9,
                    fontFamily: MONO,
                    color: 'rgba(255,255,255,0.65)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => onExpand(cn)}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(124,58,237,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  }}
                >
                  {cn.label || `Node ${cn.id}`}
                </div>
              ))}
              {connectedNodes.length > 8 && (
                <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.22)', marginTop: 2, fontStyle: 'italic' }}>
                  +{connectedNodes.length - 8} mais
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <button
            onClick={() => onSaveCard(node)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 1,
              fontSize: 10,
              fontFamily: MONO,
              fontWeight: 500,
              background: 'rgba(124,58,237,0.15)',
              border: '1px dashed rgba(124,58,237,0.35)',
              color: 'rgba(196,181,253,0.9)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(124,58,237,0.25)';
              e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(124,58,237,0.15)';
              e.currentTarget.style.borderColor = 'rgba(124,58,237,0.35)';
            }}
          >
            <Bookmark size={11} strokeWidth={1.5} />
            Salvar em Coleção
          </button>

          <button
            onClick={() => onSendToArena(node)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 1,
              fontSize: 10,
              fontFamily: MONO,
              fontWeight: 500,
              background: 'rgba(255,255,255,0.04)',
              border: '1px dashed rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.65)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
            }}
          >
            <ExternalLink size={11} strokeWidth={1.5} />
            Enviar ao Are.na
          </button>

          <button
            onClick={() => onExpand(node)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 1,
              fontSize: 10,
              fontFamily: MONO,
              fontWeight: 500,
              background: 'rgba(255,255,255,0.04)',
              border: '1px dashed rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.65)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
            }}
          >
            <Zap size={11} strokeWidth={1.5} />
            Expandir Rizoma
          </button>
        </div>
      </div>
    </motion.div>
  );
}
