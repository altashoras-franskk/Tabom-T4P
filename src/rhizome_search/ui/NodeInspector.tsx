// ── Node Inspector — Drawer for Node Details ───────────────────────────────────

import React, { useCallback } from 'react';
import { X, ExternalLink, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import type { KnowledgeNode, KnowledgeMap } from '../types';

interface Props {
  node: KnowledgeNode;
  map: KnowledgeMap;
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
}

export const NodeInspector: React.FC<Props> = ({ node, map, onClose, onNavigate }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const isBridge = map.bridges.includes(node.id);

  // Node type color
  let typeColor = '#7c3aed'; // purple (concept)
  if (node.type === 'person') typeColor = '#fbbf24'; // gold
  else if (node.type === 'work') typeColor = '#60a5fa'; // blue
  else if (node.type === 'method') typeColor = '#34d399'; // green

  // Node type label
  const typeLabel = {
    concept: 'Conceito',
    person: 'Pessoa',
    work: 'Obra',
    method: 'Método',
    discipline: 'Disciplina',
  }[node.type];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: 400,
      height: '100%',
      background: 'rgba(10,8,20,0.98)',
      borderLeft: '1px solid rgba(255,255,255,0.1)',
      padding: 20,
      overflowY: 'auto',
      zIndex: 150,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, color: '#fff', fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>
              {node.label}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                padding: '2px 8px',
                borderRadius: 3,
                background: `${typeColor}20`,
                border: `1px solid ${typeColor}40`,
                color: typeColor,
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {typeLabel}
              </span>
              {isBridge && (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  BRIDGE
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose}
            style={{
              padding: 4,
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              flexShrink: 0,
            }}>
            <X size={20} />
          </button>
        </div>

        {/* Cluster */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
          Cluster: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{node.cluster}</span>
        </div>

        {/* Keywords */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {node.keywords.map((keyword, idx) => (
            <span key={idx} style={{
              padding: '3px 8px',
              borderRadius: 3,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 10,
            }}>
              {keyword}
            </span>
          ))}
        </div>
      </div>

      {/* Bullets */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Resumo
        </h3>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {node.inspector.bullets.map((bullet, idx) => (
            <li key={idx} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
              {bullet}
            </li>
          ))}
        </ul>
      </div>

      {/* Connections */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Conexões
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {node.inspector.connections.map((connId, idx) => {
            const connNode = map.nodes.find(n => n.id === connId);
            if (!connNode) return null;
            return (
              <button
                key={idx}
                onClick={() => onNavigate(connId)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 4,
                  background: 'rgba(124,58,237,0.08)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  color: '#c4b5fd',
                  fontSize: 11,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <span>{connNode.label}</span>
                <ExternalLink size={12} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Queries */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Queries de Pesquisa
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {node.inspector.search_queries.map((query, idx) => (
            <div key={idx} style={{
              padding: '8px 10px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: 11,
              color: 'rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}>
              <span style={{ fontFamily: 'monospace', flex: 1 }}>{query}</span>
              <button
                onClick={() => handleCopy(query)}
                style={{
                  padding: 4,
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}>
                {copied ? <CheckCircle size={14} color="#4ade80" /> : <Copy size={14} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bibliography */}
      {node.inspector.bibliography.length > 0 && (
        <div>
          <h3 style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Bibliografia Sugerida
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {node.inspector.bibliography.map((entry, idx) => (
              <div key={idx} style={{
                padding: 12,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginBottom: 4, lineHeight: 1.4 }}>
                  {entry.title}
                </div>
                {entry.author && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                    {entry.author} {entry.year && `(${entry.year})`}
                  </div>
                )}
                {entry.doi_or_isbn && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', marginBottom: 6 }}>
                    {entry.doi_or_isbn}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: 3,
                    background: entry.confidence > 0.7 ? 'rgba(74,222,128,0.15)' : entry.confidence > 0.4 ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.15)',
                    border: `1px solid ${entry.confidence > 0.7 ? 'rgba(74,222,128,0.3)' : entry.confidence > 0.4 ? 'rgba(251,191,36,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: entry.confidence > 0.7 ? '#4ade80' : entry.confidence > 0.4 ? '#fbbf24' : '#ef4444',
                    fontSize: 9,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}>
                    {Math.round(entry.confidence * 100)}% confiança
                  </span>
                  {entry.needs_verification && (
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: 'rgba(251,191,36,0.15)',
                      border: '1px solid rgba(251,191,36,0.3)',
                      color: '#fbbf24',
                      fontSize: 9,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}>
                      <AlertTriangle size={9} />
                      Verificar
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
