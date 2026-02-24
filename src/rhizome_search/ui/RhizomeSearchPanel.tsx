// ── Rhizome Search Panel — Main UI ────────────────────────────────────────────

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Sparkles, Loader, AlertCircle, CheckCircle2, Library,
  Eye, EyeOff, Settings, Zap, ZapOff, X,
} from 'lucide-react';
import type {
  KnowledgeMap, MapSize, OutputStyle, RhizomeSearchRequest,
  SearchUIState, KnowledgeNode,
} from '../types';
import { generateKnowledgeMap } from '../llmClient';
import {
  initializePositions, runForceLayout, updateLivingLayout,
  ensureConnectedness, cleanMap,
} from '../mapBuilder';
import { cacheMap, getCachedMap } from '../mapCache';
import { findNodeAtPosition } from '../nodeInspector';
import { NodeInspector } from './NodeInspector';
import { MapLibrary } from './MapLibrary';
import { renderKnowledgeMap } from '../renderer';
import { MESSAGES, OUTPUT_STYLE_LABELS, MAP_SIZE_LABELS } from '../constants';

interface Props {
  width: number;
  height: number;
  onClose?: () => void;
}

export const RhizomeSearchPanel: React.FC<Props> = ({ width, height, onClose }) => {
  // The actual canvas area excludes the left panel (300px) and top bar (60px)
  const PANEL_W = 300;
  const TOPBAR_H = 60;
  const canvasW = Math.max(400, width - PANEL_W);
  const canvasH = Math.max(300, height - TOPBAR_H);

  // Form state
  const [query, setQuery] = useState('');
  const [mapSize, setMapSize] = useState<MapSize>('medium');
  const [outputStyle, setOutputStyle] = useState<OutputStyle>('balanced');
  const [apiKey, setApiKey] = useState('');
  const [modelId, setModelId] = useState('');

  // UI state
  const [uiState, setUIState] = useState<SearchUIState>({
    status: 'idle',
    message: '',
    currentMap: null,
    selectedNodeId: null,
    livingLayout: false,
  });

  // Drawers
  const [showInspector, setShowInspector] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const currentMapRef = useRef<KnowledgeMap | null>(null);

  // Sync map ref
  useEffect(() => {
    currentMapRef.current = uiState.currentMap;
  }, [uiState.currentMap]);

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (!query.trim()) {
      setUIState(prev => ({ ...prev, status: 'error', message: MESSAGES.EMPTY_QUERY }));
      return;
    }

    // Check cache
    const cached = getCachedMap(query.trim(), mapSize, outputStyle);
    if (cached) {
      setUIState({
        status: 'success',
        message: MESSAGES.FROM_CACHE,
        currentMap: cached,
        selectedNodeId: null,
        livingLayout: false,
      });
      return;
    }

    setUIState(prev => ({ ...prev, status: 'loading', message: MESSAGES.GENERATING }));

    try {
      const request: RhizomeSearchRequest = {
        query: query.trim(),
        mapSize,
        outputStyle,
        apiKey: apiKey || undefined,
        modelId: modelId || undefined,
      };

      const map = await generateKnowledgeMap(request);

      // Clean and prepare
      cleanMap(map);
      ensureConnectedness(map);

      // Initialize layout using actual canvas dimensions
      initializePositions(map, canvasW, canvasH);
      runForceLayout(map, canvasW, canvasH);

      // Cache it
      cacheMap(map);

      setUIState({
        status: 'success',
        message: `Mapa gerado: ${map.nodes.length} nós, ${map.edges.length} conexões`,
        currentMap: map,
        selectedNodeId: null,
        livingLayout: false,
      });
    } catch (err) {
      setUIState(prev => ({
        ...prev,
        status: 'error',
        message: (err as Error).message || MESSAGES.ERROR_UNKNOWN,
      }));
    }
  }, [query, mapSize, outputStyle, apiKey, modelId, canvasW, canvasH]);

  // Handle load from library — re-layout with current canvas dimensions
  const handleLoadMap = useCallback((map: KnowledgeMap) => {
    cleanMap(map);
    ensureConnectedness(map);
    initializePositions(map, canvasW, canvasH);
    runForceLayout(map, canvasW, canvasH);
    setUIState({
      status: 'success',
      message: `Mapa carregado: ${map.title}`,
      currentMap: map,
      selectedNodeId: null,
      livingLayout: false,
    });
    setShowLibrary(false);
  }, [canvasW, canvasH]);

  // Handle canvas click — canvas buffer == canvasW×canvasH == display size, no scaling needed
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const map = currentMapRef.current;
    if (!canvas || !map) return;

    const rect = canvas.getBoundingClientRect();
    // Canvas buffer dimensions match actual display area so scale is always ~1
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const node = findNodeAtPosition(map, x, y, 20);
    if (node) {
      setUIState(prev => ({ ...prev, selectedNodeId: node.id }));
      setShowInspector(true);
    } else {
      setUIState(prev => ({ ...prev, selectedNodeId: null }));
      setShowInspector(false);
    }
  }, []);

  // Handle node navigation
  const handleNavigateToNode = useCallback((nodeId: string) => {
    setUIState(prev => ({ ...prev, selectedNodeId: nodeId }));
  }, []);

  // Rendering loop — uses canvasW/canvasH (actual visible area, not full window)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas buffer to the actual display area
    canvas.width = canvasW;
    canvas.height = canvasH;

    const loop = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(loop);

      const ctx = canvas.getContext('2d');
      const map = currentMapRef.current;

      // Always clear canvas, even without a map
      if (ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasW, canvasH);
      }

      if (!ctx || !map) return;

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const dt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (uiState.livingLayout && dt > 0 && dt < 0.1) {
        updateLivingLayout(map, dt);
      }

      renderKnowledgeMap(ctx, map, canvasW, canvasH, uiState.selectedNodeId || undefined);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [canvasW, canvasH, uiState.livingLayout, uiState.selectedNodeId]);

  const statusColor =
    uiState.status === 'success' ? '#4ade80' :
    uiState.status === 'error' ? '#ef4444' :
    uiState.status === 'loading' ? '#fbbf24' : '#64748b';

  const StatusIcon =
    uiState.status === 'success' ? CheckCircle2 :
    uiState.status === 'error' ? AlertCircle :
    uiState.status === 'loading' ? Loader : null;

  const selectedNode = uiState.currentMap?.nodes.find(n => n.id === uiState.selectedNodeId);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Top Bar */}
      <div style={{
        height: 60,
        background: 'linear-gradient(to bottom, rgba(10,8,20,0.97), rgba(5,4,12,0.95))',
        borderBottom: '1px solid rgba(124,58,237,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Sparkles size={20} color="#c4b5fd" strokeWidth={1.5} />
          <span style={{ fontSize: 16, color: '#c4b5fd', fontWeight: 600, letterSpacing: '0.05em' }}>
            RHIZOME SEARCH
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Library */}
          <button onClick={() => setShowLibrary(true)}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.35)',
              color: '#c4b5fd',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
            <Library size={14} />
            Biblioteca
          </button>

          {/* Settings */}
          <button onClick={() => setShowSettings(true)}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
            <Settings size={14} />
          </button>

          {/* Close */}
          {onClose && (
            <button onClick={onClose}
              style={{
                padding: '6px',
                borderRadius: 4,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
              }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel */}
        <div style={{
          width: 300,
          background: 'rgba(10,8,20,0.95)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          padding: 20,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {/* Query */}
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', marginBottom: 6, textTransform: 'uppercase' }}>
              Tópico / Disciplina
            </label>
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ex: Física Quântica, Filosofia de Deleuze..."
              rows={3}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
                fontSize: 12,
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'system-ui',
              }}
            />
          </div>

          {/* Map Size */}
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', marginBottom: 6, textTransform: 'uppercase' }}>
              Tamanho do Mapa
            </label>
            <select value={mapSize} onChange={e => setMapSize(e.target.value as MapSize)}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 11,
                cursor: 'pointer',
                outline: 'none',
              }}>
              {Object.entries(MAP_SIZE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Output Style */}
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', marginBottom: 6, textTransform: 'uppercase' }}>
              Estilo de Output
            </label>
            <select value={outputStyle} onChange={e => setOutputStyle(e.target.value as OutputStyle)}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 11,
                cursor: 'pointer',
                outline: 'none',
              }}>
              {Object.entries(OUTPUT_STYLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* API Key Warning */}
          {!apiKey && !import.meta.env.VITE_RHIZOME_LLM_API_KEY && !import.meta.env.VITE_OPENAI_API_KEY && (
            <div style={{
              padding: 10,
              borderRadius: 4,
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.3)',
              color: '#fbbf24',
              fontSize: 10,
              lineHeight: 1.5,
            }}>
              ⚠️ <b>API key não configurada</b><br />
              Configure em Settings ou adicione VITE_RHIZOME_LLM_API_KEY no .env
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={uiState.status === 'loading'}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 6,
              background: uiState.status === 'loading' ?
                'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.25)',
              border: `1px solid rgba(124,58,237,${uiState.status === 'loading' ? 0.2 : 0.5})`,
              color: uiState.status === 'loading' ? 'rgba(196,181,253,0.4)' : '#c4b5fd',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.05em',
              cursor: uiState.status === 'loading' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
            {uiState.status === 'loading' ? (
              <>
                <Loader size={16} className="animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Gerar Mapa
              </>
            )}
          </button>

          {/* Status Message */}
          {uiState.message && (
            <div style={{
              padding: 10,
              borderRadius: 4,
              background: `${statusColor}15`,
              border: `1px solid ${statusColor}40`,
              color: statusColor,
              fontSize: 11,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              lineHeight: 1.5,
            }}>
              {StatusIcon && <StatusIcon size={14} style={{ flexShrink: 0, marginTop: 2 }} />}
              <span>{uiState.message}</span>
            </div>
          )}

          {/* Living Layout Toggle */}
          {uiState.currentMap && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, marginTop: 8 }}>
              <button
                onClick={() => setUIState(prev => ({ ...prev, livingLayout: !prev.livingLayout }))}
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 4,
                  background: uiState.livingLayout ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${uiState.livingLayout ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: uiState.livingLayout ? '#c4b5fd' : 'rgba(255,255,255,0.6)',
                  fontSize: 11,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}>
                {uiState.livingLayout ? <Zap size={14} /> : <ZapOff size={14} />}
                {uiState.livingLayout ? 'Living Layout ON' : 'Living Layout OFF'}
              </button>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 6, lineHeight: 1.4 }}>
                Breathing animation sem alterar topologia
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              cursor: 'crosshair',
            }}
          />

          {!uiState.currentMap && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.2)',
              fontSize: 14,
              pointerEvents: 'none',
            }}>
              Insira um tópico e clique em "Gerar Mapa"
            </div>
          )}
        </div>
      </div>

      {/* Node Inspector Drawer */}
      {showInspector && uiState.currentMap && selectedNode && (
        <NodeInspector
          node={selectedNode}
          map={uiState.currentMap}
          onClose={() => setShowInspector(false)}
          onNavigate={handleNavigateToNode}
        />
      )}

      {/* Map Library Drawer */}
      {showLibrary && (
        <MapLibrary
          onClose={() => setShowLibrary(false)}
          onLoadMap={handleLoadMap}
        />
      )}

      {/* Settings Drawer */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 350,
          height: '100%',
          background: 'rgba(10,8,20,0.98)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          padding: 20,
          zIndex: 200,
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 14, color: '#c4b5fd', fontWeight: 600 }}>Settings</span>
            <button onClick={() => setShowSettings(false)}
              style={{
                padding: 4,
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
              }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', marginBottom: 6, textTransform: 'uppercase' }}>
                API Key (opcional)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..."
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 11,
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4, lineHeight: 1.4 }}>
                Deixe vazio para usar variável de ambiente.<br />
                <br />
                <b style={{ color: 'rgba(255,255,255,0.35)' }}>Como configurar no .env:</b><br />
                Crie um arquivo <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: 2 }}>.env</code> na raiz do projeto com:<br />
                <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 2, display: 'inline-block', marginTop: 4 }}>
                  VITE_RHIZOME_LLM_API_KEY=sk-...
                </code>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', marginBottom: 6, textTransform: 'uppercase' }}>
                Model ID (opcional)
              </label>
              <input
                type="text"
                value={modelId}
                onChange={e => setModelId(e.target.value)}
                placeholder="gpt-4o-mini"
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 11,
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                Default: gpt-4o-mini
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
