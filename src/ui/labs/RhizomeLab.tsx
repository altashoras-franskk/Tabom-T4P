// ── Rhizome Lab — Heuristic-Exact Network Simulation ──────────────────────────
// Physics: nodes navigate vacuum → captured by lines of flight → spring network
// Features: interactive node adding, aesthetic controls, recording, LLM panel
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useEffect, useRef, useState, useCallback,
} from 'react';
import {
  RotateCcw, ChevronDown, ChevronRight, Info, Camera,
  Plus, Eye, Sparkles, Trash2, Video, Settings, Box,
  Folder, ExternalLink, Bookmark,
} from 'lucide-react';
import type {
  RhizomeParams, RhizomeState, RhizomeMetrics, RhizomeAesthetics,
  LLMRhizomeRequest, LLMStatus, LLMProvider, LLMDepth, RhizomeNode, LLMMode,
  Camera3D,
} from '../../sim/rhizome/rhizomeTypes';
import {
  DEFAULT_PARAMS, RHIZOME_PRESETS, PARAM_METAS, DEFAULT_AESTHETICS,
  DEFAULT_CAMERA3D,
} from '../../sim/rhizome/rhizomeTypes';
import type { ParamMeta } from '../../sim/rhizome/rhizomeTypes';
import {
  createRhizomeState, tickRhizome, computeRhizomeMetrics,
  renderRhizome, addNodeAtPosition, renderRhizome3D,
  createSnapshot, restoreFromSnapshot,
} from '../../sim/rhizome/rhizomeEngine';
import {
  generateLLMRhizomeStreaming, injectSingleLLMNode,
  clearLLMNodes,
  PROMPT_MAP, PROMPT_MODE_LABELS,
} from '../../sim/rhizome/rhizomeLLM';
import {
  CanvasRecorder, RecorderState, RecordFormat, RecordQuality,
  fmtTime, RECORD_FORMAT_LABELS, RECORD_QUALITY_LABELS, isFormatSupported,
} from '../../app/components/recording/canvasRecorder';
// Patch 01.01 — Folders, Are.na, Graph Metrics
import { FoldersPanel } from './rhizome/FoldersPanel';
import { ArenaConnectModal } from './rhizome/ArenaConnectModal';
import { NodeInspector as NodeInspectorNew } from './rhizome/NodeInspector';
import { SaveToFolderModal } from './rhizome/SaveToFolderModal';
import type { RhizomeFolder, SavedCard } from '../../sim/rhizome/rhizomeFolders';
import {
  loadFolders, saveFolders, createFolder, deleteFolder,
  addCardToFolder, removeCardFromFolder, createCardFromNode,
  saveRhizome, loadSavedRhizomes, moveCardBetweenFolders,
} from '../../sim/rhizome/rhizomeFolders';
import { isArenaConnected } from '../../sim/rhizome/arenaAPI';
import { scoreNodes } from '../../sim/rhizome/graphMetrics';
import type { NodeScore } from '../../sim/rhizome/graphMetrics';
import { AuthModal, useAuth } from '../../app/components/AuthModal';
import type { AuthUser } from '../../app/components/AuthModal';

interface Props { active: boolean; }

const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";

// ── Palette for quick color preset buttons ────────────────────────────────────
const COLOR_PRESETS: { name: string; swatch: string; ae: Partial<RhizomeAesthetics> }[] = [
  { name: 'Mono Dark',  swatch: '#e0e0e0', ae: { bgColor: '#000000', nodeColor: '#e0e0e0', entryColor: '#ffffff', hubColor: '#b0b0b0', hotColor: '#ffffff', linkColor: '#2a2a2a', flightColor: '#555555', labelColor: '#ffffff', glowIntensity: 0 } },
  { name: 'Mono Light', swatch: '#111111', ae: { bgColor: '#f0f0f0', nodeColor: '#111111', entryColor: '#000000', hubColor: '#444444', hotColor: '#222222', linkColor: '#cccccc', flightColor: '#888888', labelColor: '#111111', glowIntensity: 0 } },
  { name: 'Cyber',      swatch: '#00ff66', ae: { bgColor: '#000000', nodeColor: '#00ff66', entryColor: '#d8f2ff', hubColor: '#3aa3ff', hotColor: '#ff9b3a', linkColor: '#00ff66', flightColor: '#ff3bd5', labelColor: '#ffffff' } },
  { name: 'Violet',     swatch: '#a78bfa', ae: { bgColor: '#05020e', nodeColor: '#a78bfa', entryColor: '#f0e6ff', hubColor: '#ec4899', hotColor: '#fbbf24', linkColor: '#7c3aed', flightColor: '#f472b6', labelColor: '#ffffff' } },
  { name: 'Ochre',      swatch: '#fbbf24', ae: { bgColor: '#0a0800', nodeColor: '#fbbf24', entryColor: '#fff7ed', hubColor: '#f97316', hotColor: '#ef4444', linkColor: '#d97706', flightColor: '#fb923c', labelColor: '#ffffff' } },
  { name: 'Arctic',     swatch: '#38bdf8', ae: { bgColor: '#00060f', nodeColor: '#38bdf8', entryColor: '#e0f2fe', hubColor: '#818cf8', hotColor: '#34d399', linkColor: '#0ea5e9', flightColor: '#a78bfa', labelColor: '#ffffff' } },
  { name: 'Blood',      swatch: '#ef4444', ae: { bgColor: '#040000', nodeColor: '#ef4444', entryColor: '#fef2f2', hubColor: '#f87171', hotColor: '#fbbf24', linkColor: '#dc2626', flightColor: '#fb923c', labelColor: '#ffffff' } },
];

// ── Tiny reusable slider ──────────────────────────────────────────────────────
function Slider({
  label, value, min = 0, max = 1, step = 0.01, tooltip, onChange,
}: {
  label: string; value: number; min?: number; max?: number; step?: number;
  tooltip?: string; onChange: (v: number) => void;
}) {
  const [tip, setTip] = useState(false);
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2, position: 'relative' }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: MONO, display: 'flex', alignItems: 'center', gap: 4 }}>
          {label}
          {tooltip && (
            <span style={{ cursor: 'help', display: 'flex', alignItems: 'center' }}
              onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
              <Info size={8} strokeWidth={1.5} style={{ opacity: 0.25 }} />
            </span>
          )}
        </span>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.22)', fontFamily: MONO }}>
          {value.toFixed(step < 0.1 ? 2 : 0)}
        </span>
        {tip && tooltip && (
          <div style={{ position:'absolute', left:0, top:-44, zIndex:200, background:'rgba(0,0,0,0.97)', border:'1px dashed rgba(255,255,255,0.08)', borderRadius:1, padding:'5px 8px', fontSize:8, maxWidth:220, color:'rgba(255,255,255,0.55)', lineHeight:1.5, pointerEvents:'none', fontFamily: MONO }}>
            {tooltip}
          </div>
        )}
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width:'100%', height:2, accentColor:'#10d45b', cursor:'pointer' }}
      />
    </div>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────
function Section({
  title, open, onToggle, children, accent = 'rgba(255,255,255,0.18)',
}: {
  title: string; open: boolean; onToggle: () => void;
  children: React.ReactNode; accent?: string;
}) {
  return (
    <div style={{ borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 10 }}>
      <button onClick={onToggle}
        style={{ background:'none', border:'none', cursor:'pointer', color: accent, fontSize:11, display:'flex', alignItems:'center', gap:5, padding:0, letterSpacing:'0.08em', textTransform:'uppercase', width:'100%', textAlign:'left', fontFamily: DOTO }}>
        {open ? <ChevronDown size={9}/> : <ChevronRight size={9}/>}
        {title}
      </button>
      {open && <div style={{ marginTop: 10 }}>{children}</div>}
    </div>
  );
}

// ── Color row ─────────────────────────────────────────────────────────────────
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
      <span style={{ fontSize:8, color:'rgba(255,255,255,0.38)', letterSpacing:'0.06em', textTransform:'uppercase', fontFamily: MONO }}>{label}</span>
      <label style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}>
        <div style={{ width:18, height:18, borderRadius:1, background:value, border:'1px dashed rgba(255,255,255,0.12)', flexShrink:0 }} />
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ opacity:0, position:'absolute', width:18, height:18, cursor:'pointer' }} />
      </label>
    </div>
  );
}

// ── Recording panel ───────────────────────────────────────────────────────────
function RecordingPanel({
  recState, elapsed, onStart, onStop, actualFmt,
}: {
  recState: RecorderState;
  elapsed:  number;
  onStart:  (fmt: RecordFormat, q: RecordQuality) => void;
  onStop:   () => void;
  actualFmt: string;
}) {
  const [fmt,  setFmt]  = useState<RecordFormat>('auto');
  const [qual, setQual] = useState<RecordQuality>('standard');
  const mp4ok = isFormatSupported('mp4');

  const btnSty = (active: boolean): React.CSSProperties => ({
    padding: '3px 6px', borderRadius: 1, fontSize: 8, fontFamily: MONO, cursor: 'pointer',
    background: active ? 'rgba(16,212,91,0.12)' : 'rgba(255,255,255,0.03)',
    border: `1px dashed ${active ? 'rgba(16,212,91,0.35)' : 'rgba(255,255,255,0.06)'}`,
    color: active ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.30)',
    letterSpacing: '0.04em', textTransform: 'uppercase' as const,
    marginRight: 3, marginBottom: 3,
  });

  if (recState === 'saving') {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 0' }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background:'#fbbf24', animation:'pulse 1s infinite' }} />
        <span style={{ fontSize:9, color:'rgba(251,191,36,0.6)', fontFamily:'monospace', letterSpacing:'0.06em' }}>SALVANDO…</span>
      </div>
    );
  }

  if (recState === 'recording') {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:7, height:7, borderRadius:2, background:'#ef4444', animation:'pulse 0.8s infinite' }} />
          <span style={{ fontSize:10, color:'#ef4444', fontFamily:'monospace' }}>{fmtTime(elapsed)}</span>
          <span style={{ fontSize:8, color:'rgba(239,68,68,0.5)', letterSpacing:'0.08em' }}>{actualFmt}</span>
        </div>
        <button onClick={onStop}
          style={{ width:'100%', padding:'5px 0', borderRadius:4, background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.35)', color:'rgba(239,68,68,0.8)', fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
          <span>■</span> Parar Gravação
        </button>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      {/* Format */}
      <div>
        <div style={{ fontSize:8, color:'rgba(255,255,255,0.22)', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:4 }}>Formato</div>
        <div style={{ display:'flex', flexWrap:'wrap' }}>
          {(['auto','webm','mp4','mov'] as RecordFormat[]).map(f => (
            <button key={f} style={btnSty(fmt===f)} onClick={() => setFmt(f)}>
              {RECORD_FORMAT_LABELS[f]}
              {(f==='mp4'||f==='mov') && !mp4ok && (
                <span style={{ fontSize:7, color:'rgba(251,191,36,0.5)', marginLeft:2 }}>*</span>
              )}
            </button>
          ))}
        </div>
        {(fmt==='mp4'||fmt==='mov') && !mp4ok && (
          <div style={{ fontSize:8, color:'rgba(251,191,36,0.5)', lineHeight:1.4, marginTop:2 }}>
            * Seu browser não suporta MP4 nativo. Será salvo como WebM.<br/>
            Converta: <span style={{ fontFamily:'monospace' }}>ffmpeg -i rec.webm out.mp4</span>
          </div>
        )}
      </div>

      {/* Quality */}
      <div>
        <div style={{ fontSize:8, color:'rgba(255,255,255,0.22)', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:4 }}>Qualidade</div>
        <div style={{ display:'flex', flexWrap:'wrap' }}>
          {(['draft','standard','high','ultra'] as RecordQuality[]).map(q => (
            <button key={q} style={btnSty(qual===q)} onClick={() => setQual(q)}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button onClick={() => onStart(fmt, qual)}
        style={{ width:'100%', padding:'6px 0', borderRadius:4, background:'rgba(124,58,237,0.18)', border:'1px solid rgba(124,58,237,0.35)', color:'rgba(196,181,253,0.85)', fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
        <Video size={10} strokeWidth={1.5} />
        Iniciar Gravação
      </button>
    </div>
  );
}

// ── Prompt Editor Modal ───────────────────────────────────────────────────────
function PromptEditorModal({
  onClose,
}: { onClose: () => void }) {
  const MODES = Object.keys(PROMPT_MODE_LABELS) as LLMMode[];
  const [activeMode, setActiveMode] = useState<LLMMode>('concepts');
  const [drafts, setDrafts] = useState<Record<LLMMode, string>>(() => ({
    concepts:      PROMPT_MAP.concepts,
    names_only:    PROMPT_MAP.names_only,
    person_theory: PROMPT_MAP.person_theory,
    study_order:   PROMPT_MAP.study_order,
    controversies: PROMPT_MAP.controversies,
    keywords:      PROMPT_MAP.keywords,
  }));

  const handleSave = () => {
    // Apply to the mutable PROMPT_MAP
    for (const mode of MODES) {
      PROMPT_MAP[mode] = drafts[mode];
    }
    onClose();
  };

  const handleReset = (mode: LLMMode) => {
    // We keep the original in a closure comment — reset by reverting to PROMPT_MAP current value
    // Since we can't import the original consts here, we just clear to the current saved
    setDrafts(prev => ({ ...prev, [mode]: PROMPT_MAP[mode] }));
  };

  const m = PROMPT_MODE_LABELS[activeMode];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        background: '#000', border: '1px dashed rgba(255,255,255,0.06)',
        borderRadius: 1, overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px dashed rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={12} strokeWidth={1.5} style={{ color: 'rgba(196,181,253,0.7)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em' }}>EDITOR DE PROMPTS</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Mode tabs */}
          <div style={{ width: 140, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '8px 0', flexShrink: 0, overflowY: 'auto' }}>
            {MODES.map(mode => {
              const ml = PROMPT_MODE_LABELS[mode];
              const isActive = mode === activeMode;
              return (
                <button key={mode} onClick={() => setActiveMode(mode)} style={{
                  width: '100%', padding: '8px 14px', textAlign: 'left', border: 'none',
                  borderLeft: `2px solid ${isActive ? 'rgba(196,181,253,0.7)' : 'transparent'}`,
                  background: isActive ? 'rgba(255,255,255,0.04)' : 'none',
                  color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
                  cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', gap: 7,
                  transition: 'all 0.1s',
                }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, opacity: 0.7 }}>{ml.icon}</span>
                  <span>{ml.label}</span>
                </button>
              );
            })}
          </div>

          {/* Editor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{m.label}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{m.hint}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace', alignSelf: 'center' }}>
                  {'{TOPIC}'} {'{COUNT}'} {'{DEPTH}'}
                </div>
              </div>
            </div>
            <textarea
              value={drafts[activeMode]}
              onChange={e => setDrafts(prev => ({ ...prev, [activeMode]: e.target.value }))}
              style={{
                flex: 1, resize: 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.06)',
                borderRadius: 1, padding: '10px 12px',
                color: 'rgba(255,255,255,0.7)', outline: 'none', lineHeight: 1.6,
                minHeight: 280,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 18px', borderTop: '1px dashed rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '6px 14px', borderRadius: 1, background: 'none', border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', fontSize: 10, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} style={{ padding: '6px 16px', borderRadius: 1, background: 'rgba(16,212,91,0.08)', border: '1px dashed rgba(16,212,91,0.35)', color: 'rgba(16,212,91,0.9)', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={9} strokeWidth={1.5} />
            Salvar Prompts
          </button>
        </div>
      </div>
    </div>
  );
}

// ── OpenAI curated models ─────────────────────────────────────────────────────
const OPENAI_MODELS: { id: string; label: string; group: string }[] = [
  // GPT-5 family (2025/2026) — frontier
  { id: 'gpt-5',          label: 'GPT-5          — frontier',           group: 'GPT-5'  },
  { id: 'gpt-5-mini',     label: 'GPT-5 mini     — rápido ⚡',          group: 'GPT-5'  },
  // GPT-4.5
  { id: 'gpt-4.5-preview',label: 'GPT-4.5        — qualidade',          group: 'GPT-4.5' },
  // GPT-4.1 family (2025) — fastest & cheapest daily driver
  { id: 'gpt-4.1-nano',   label: 'GPT-4.1 nano   — ultra-rápido ⚡⚡',  group: 'GPT-4.1' },
  { id: 'gpt-4.1-mini',   label: 'GPT-4.1 mini   — rápido ⚡',          group: 'GPT-4.1' },
  { id: 'gpt-4.1',        label: 'GPT-4.1        — qualidade',           group: 'GPT-4.1' },
  // GPT-4o family
  { id: 'gpt-4o-mini',    label: 'GPT-4o mini    — rápido ⚡',           group: 'GPT-4o'  },
  { id: 'gpt-4o',         label: 'GPT-4o         — qualidade',           group: 'GPT-4o'  },
  // Reasoning
  { id: 'o4-mini',        label: 'o4-mini        — raciocínio ⚡',       group: 'Raciocínio' },
  { id: 'o3-mini',        label: 'o3-mini        — raciocínio',          group: 'Raciocínio' },
  { id: 'o3',             label: 'o3             — raciocínio+',         group: 'Raciocínio' },
  // Legacy
  { id: 'gpt-3.5-turbo',  label: 'GPT-3.5        — legado',              group: 'Legado' },
];

// ── LLM Panel ─────────────────────────────────────────────────────────────────
function LLMPanel({
  onGenerate, onClear, hasLLMNodes, onOpenPromptEditor,
  provider, setProvider, apiKey, setApiKey, modelId, setModelId,
  llmMode, setLlmMode,
}: {
  onGenerate: (req: LLMRhizomeRequest) => void;
  onClear: () => void;
  hasLLMNodes: boolean;
  onOpenPromptEditor: () => void;
  provider:    LLMProvider; setProvider: (v: LLMProvider) => void;
  apiKey:      string;      setApiKey:   (v: string) => void;
  modelId:     string;      setModelId:  (v: string) => void;
  llmMode:     LLMMode;     setLlmMode:  (v: LLMMode) => void;
}) {
  const [topic,    setTopic]    = useState('');
  const [depth,    setDepth]    = useState<LLMDepth>('medium');
  const [count,    setCount]    = useState(22);
  const [showCfg,  setShowCfg]  = useState(false);

  const inputSty: React.CSSProperties = {
    width: '100%', padding: '5px 7px', borderRadius: 1, fontSize: 10,
    background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.7)', outline: 'none', fontFamily: "'IBM Plex Mono', monospace",
    boxSizing: 'border-box',
  };
  const lblSty: React.CSSProperties = {
    fontSize: 8, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.07em',
    textTransform: 'uppercase', marginBottom: 3, display: 'block',
  };

  const handleGenerate = () => {
    if (!topic.trim()) return;
    const req: LLMRhizomeRequest = {
      topic: topic.trim(), depth, nodeCount: count,
      provider, apiKey: apiKey || undefined, modelId: modelId || undefined,
      llmMode,
    };
    onGenerate(req);
  };

  const MODES = Object.keys(PROMPT_MODE_LABELS) as LLMMode[];
  const activeM = PROMPT_MODE_LABELS[llmMode];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

      {/* ── Hero search bar ───────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <input
          style={{
            ...inputSty,
            padding: '9px 38px 9px 12px',
            fontSize: 11,
            borderRadius: 7,
            border: '1px solid rgba(255,255,255,0.13)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            transition: 'border-color 0.15s',
          }}
          placeholder="Tópico, conceito, pessoa..."
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleGenerate(); }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(196,181,253,0.45)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)')}
        />
        <button
          onClick={handleGenerate}
          style={{
            position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(124,58,237,0.35)', border: '1px solid rgba(124,58,237,0.5)',
            borderRadius: 5, padding: '3px 7px', cursor: 'pointer',
            color: 'rgba(196,181,253,0.9)', display: 'flex', alignItems: 'center',
          }}
          title="Gerar Rizoma (Enter)"
        >
          <Sparkles size={10} strokeWidth={1.5} />
        </button>
      </div>

      {/* ── Mode selector ─────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={lblSty}>Modo</span>
          <button onClick={onOpenPromptEditor} title="Editar prompts"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', gap: 3, fontSize: 8, padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(196,181,253,0.6)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.22)')}
          >
            <Settings size={8} strokeWidth={1.5} /> prompts
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          {MODES.map(mode => {
            const ml = PROMPT_MODE_LABELS[mode];
            const isActive = mode === llmMode;
            return (
              <button key={mode} onClick={() => setLlmMode(mode)} title={ml.hint}
                style={{
                  padding: '5px 7px', borderRadius: 5, cursor: 'pointer', textAlign: 'left',
                  background: isActive ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.06)'}`,
                  color: isActive ? 'rgba(196,181,253,0.92)' : 'rgba(255,255,255,0.35)',
                  fontSize: 9, display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.14)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)'; } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; } }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{ml.icon}</span>
                {ml.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 8, color: 'rgba(196,181,253,0.4)', marginTop: 4, fontStyle: 'italic' }}>
          {activeM.hint}
        </div>
      </div>

      {/* ── Depth + node count ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <span style={lblSty}>Profundidade</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {(['shallow','medium','deep'] as LLMDepth[]).map(d => (
              <button key={d} onClick={() => setDepth(d)}
                style={{ flex: 1, padding: '3px 0', borderRadius: 3, fontSize: 8, cursor: 'pointer', fontFamily: 'monospace',
                  background: depth===d ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${depth===d ? 'rgba(124,58,237,0.45)' : 'rgba(255,255,255,0.07)'}`,
                  color: depth===d ? 'rgba(196,181,253,0.9)' : 'rgba(255,255,255,0.28)',
                  transition: 'all 0.1s' }}>
                {d === 'shallow' ? 'Raso' : d === 'medium' ? 'Med.' : 'Fundo'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ width: 60 }}>
          <span style={lblSty}>Nós</span>
          <input type="number" min={8} max={60} value={count}
            onChange={e => setCount(Math.max(8, Math.min(60, parseInt(e.target.value)||18)))}
            style={{ ...inputSty, width: '100%', padding: '3px 6px', textAlign: 'center' }}
          />
        </div>
      </div>

      {/* ── Config (collapsible) ──────────────────────────────────────────── */}
      <div>
        <button onClick={() => setShowCfg(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 9, display: 'flex', alignItems: 'center', gap: 4, padding: 0, letterSpacing: '0.05em' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
        >
          {showCfg ? <ChevronDown size={8}/> : <ChevronRight size={8}/>}
          Modelo / API Key
        </button>

        {showCfg && (
          <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Provider selector */}
            <div>
              <span style={lblSty}>Provedor</span>
              <select value={provider} onChange={e => setProvider(e.target.value as LLMProvider)}
                style={{ ...inputSty, cursor: 'pointer' }}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="ollama">Ollama (local)</option>
                <option value="custom">Custom endpoint</option>
              </select>
            </div>

            {/* Model — curated dropdown for OpenAI, free text for others */}
            <div>
              <span style={lblSty}>Modelo</span>
              {provider === 'openai' ? (
                <select value={modelId || 'gpt-4.1-mini'} onChange={e => setModelId(e.target.value)}
                  style={{ ...inputSty, cursor: 'pointer' }}>
                  {(() => {
                    const groups = [...new Set(OPENAI_MODELS.map(m => m.group))];
                    return groups.map(g => (
                      <optgroup key={g} label={g}>
                        {OPENAI_MODELS.filter(m => m.group === g).map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </optgroup>
                    ));
                  })()}
                </select>
              ) : (
                <input style={inputSty}
                  placeholder={provider === 'anthropic' ? 'claude-3-5-haiku-20241022' : provider === 'ollama' ? 'llama3.2' : 'model-id'}
                  value={modelId} onChange={e => setModelId(e.target.value)} />
              )}
            </div>

            {/* API Key */}
            <div>
              <span style={lblSty}>API Key {provider === 'ollama' ? '(não necessária)' : ''}</span>
              <input style={inputSty} type="password"
                placeholder={provider === 'openai' ? 'sk-...' : provider === 'anthropic' ? 'sk-ant-...' : '(não necessária)'}
                value={apiKey} onChange={e => setApiKey(e.target.value)} />
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.18)', marginTop: 2 }}>
                Chave processada localmente. Streaming ativo para OpenAI.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 5 }}>
        <button onClick={handleGenerate}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 6, cursor: 'pointer',
            background: 'rgba(124,58,237,0.22)', border: '1px solid rgba(124,58,237,0.45)',
            color: 'rgba(196,181,253,0.9)', fontSize: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.35)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.65)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.22)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.45)'; }}
        >
          <Sparkles size={10} strokeWidth={1.5} />
          Gerar Rizoma
        </button>
        {hasLLMNodes && (
          <button onClick={onClear}
            style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', color: 'rgba(239,68,68,0.55)', display: 'flex', alignItems: 'center', transition: 'all 0.12s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.14)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.35)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.06)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.18)'; }}
          >
            <Trash2 size={9} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Node Info Card ────────────────────────────────────────────────────────────
function NodeCard({
  node, allNodes, onClose, onExpand, onSave,
}: {
  node: RhizomeNode;
  allNodes: RhizomeNode[];
  onClose: () => void;
  onExpand: (node: RhizomeNode) => void;
  onSave: (node: RhizomeNode) => void;
}) {
  const connectedNodes = node.connectionsLabels
    ? node.connectionsLabels
    : Array.from(node.connections.keys())
        .map(id => allNodes.find(n => n.id === id)?.label)
        .filter(Boolean) as string[];

  const categoryColor = node.category
    ? (() => {
        const colors: Record<string, string> = {
          philosophy: '#a78bfa', science: '#38bdf8', mathematics: '#fb923c',
          history: '#fbbf24', art: '#f472b6', politics: '#4ade80',
          economics: '#34d399', psychology: '#c084fc', biology: '#86efac',
          physics: '#60a5fa', default: '#00ff66',
        };
        const k = node.category.toLowerCase();
        for (const [key, val] of Object.entries(colors)) {
          if (k.includes(key)) return val;
        }
        let hash = 0;
        for (let i = 0; i < node.category.length; i++) hash = (hash * 31 + node.category.charCodeAt(i)) & 0xffffff;
        return `hsl(${hash % 360},70%,60%)`;
      })()
    : '#00ff66';

  // ── Build contextual links ────────────────────────────────────────────────
  const q   = encodeURIComponent(node.label ?? '');
  const cat = (node.category ?? '').toLowerCase();

  type LinkDef = { label: string; icon: string; url: string; color: string };

  const exploreLinks: LinkDef[] = [
    { label: 'Wikipedia', icon: 'W', url: `https://en.wikipedia.org/wiki/Special:Search?search=${q}`, color: '#e2e8f0' },
    { label: 'Scholar',   icon: '◎', url: `https://scholar.google.com/scholar?q=${q}`,                color: '#60a5fa' },
    { label: 'YouTube',   icon: '▶', url: `https://www.youtube.com/results?search_query=${q}`,        color: '#f87171' },
  ];

  if (cat.includes('philos') || cat.includes('concept') || cat.includes('theory') || cat.includes('method')) {
    exploreLinks.push({ label: 'SEP', icon: 'Φ', url: `https://plato.stanford.edu/search/searcher.py?query=${q}`, color: '#a78bfa' });
  } else if (cat.includes('physic') || cat.includes('math') || cat.includes('science') || cat.includes('bio')) {
    exploreLinks.push({ label: 'arXiv', icon: 'Σ', url: `https://arxiv.org/search/?query=${q}&searchtype=all`, color: '#fb923c' });
  } else if (cat.includes('histor') || cat.includes('art') || cat.includes('cultur')) {
    exploreLinks.push({ label: 'JSTOR', icon: 'J', url: `https://www.jstor.org/action/doBasicSearch?Query=${q}`, color: '#fbbf24' });
  } else {
    exploreLinks.push({ label: 'Google', icon: '⊕', url: `https://www.google.com/search?q=${q}`, color: '#4ade80' });
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: 20,
      width: 280,
      background: 'rgba(0,0,0,0.97)',
      border: `1px dashed ${categoryColor}35`,
      borderRadius: 1,
      padding: '14px 16px',
      zIndex: 100,
      fontFamily: MONO,
      boxShadow: `0 0 24px ${categoryColor}15`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, color: '#fff', marginBottom: 4, lineHeight: 1.2, fontFamily: DOTO, letterSpacing: '0.04em' }}>
            {node.label}
          </div>
          {node.category && (
            <div style={{
              display: 'inline-block', fontSize: 7, padding: '2px 6px', borderRadius: 1,
              background: `${categoryColor}15`, border: `1px dashed ${categoryColor}40`,
              color: categoryColor, letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              {node.category}
            </div>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer', padding: 2, fontSize: 14, lineHeight: 1,
        }}>✕</button>
      </div>

      {/* Description */}
      {node.description && (
        <div style={{
          fontSize: 9, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6,
          marginBottom: 10, padding: '6px 8px',
          background: 'rgba(255,255,255,0.03)', borderRadius: 1,
          borderLeft: `2px dashed ${categoryColor}50`,
        }}>
          {node.description}
        </div>
      )}

      {/* Connections */}
      {connectedNodes.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
            Conexões ({connectedNodes.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {connectedNodes.slice(0, 8).map(label => (
              <span key={label} style={{
                fontSize: 7, padding: '2px 6px', borderRadius: 1,
                background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.50)',
              }}>{label}</span>
            ))}
            {connectedNodes.length > 8 && (
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.22)', padding: '2px 4px' }}>
                +{connectedNodes.length - 8}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Explore links ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, fontFamily: MONO }}>
          Explorar
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {exploreLinks.map(lk => (
            <a
              key={lk.label}
              href={lk.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Pesquisar "${node.label}" no ${lk.label}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 1,
                background: `${lk.color}0A`,
                border: `1px dashed ${lk.color}25`,
                color: lk.color,
                fontSize: 8, textDecoration: 'none',
                cursor: 'pointer', fontFamily: MONO,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = `${lk.color}25`;
                (e.currentTarget as HTMLAnchorElement).style.borderColor = `${lk.color}60`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = `${lk.color}12`;
                (e.currentTarget as HTMLAnchorElement).style.borderColor = `${lk.color}30`;
              }}
            >
              <span style={{ fontFamily: 'monospace', fontSize: 10, lineHeight: 1, opacity: 0.85 }}>{lk.icon}</span>
              {lk.label}
            </a>
          ))}
        </div>
      </div>

      {/* Expand search button */}
      <button
        onClick={() => { onExpand(node); onClose(); }}
        style={{
          marginTop: 8, marginBottom: 6, width: '100%', padding: '7px 0',
          borderRadius: 1, cursor: 'pointer', fontFamily: MONO,
          background: 'rgba(124,58,237,0.10)', border: '1px dashed rgba(124,58,237,0.35)',
          color: 'rgba(196,181,253,0.85)', fontSize: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 0.15s', letterSpacing: '0.04em', textTransform: 'uppercase',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.22)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.55)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.10)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.35)';
        }}
      >
        <Sparkles size={9} strokeWidth={1.5} />
        Expandir ↳ <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{node.label}"</span>
      </button>

      {/* Save to collection button */}
      <button
        onClick={() => onSave(node)}
        style={{
          marginBottom: 8, width: '100%', padding: '6px 0',
          borderRadius: 1, cursor: 'pointer', fontFamily: MONO,
          background: 'rgba(34,197,94,0.08)', border: '1px dashed rgba(34,197,94,0.25)',
          color: 'rgba(134,239,172,0.80)', fontSize: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 0.15s', letterSpacing: '0.04em', textTransform: 'uppercase',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.16)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(34,197,94,0.45)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.08)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(34,197,94,0.25)';
        }}
      >
        <Bookmark size={9} strokeWidth={1.5} />
        Salvar em Coleção
      </button>

      {/* Bibliography note */}
      <div style={{
        fontSize: 8, color: 'rgba(255,255,255,0.18)', lineHeight: 1.5,
        borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8,
        fontStyle: 'italic',
      }}>
        ⚠ Descrições geradas pela LLM — <b style={{ color: 'rgba(251,191,36,0.45)' }}>verifique fontes primárias</b>.
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export const RhizomeLab: React.FC<Props> = ({ active }) => {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef(0);
  const stateRef     = useRef<RhizomeState | null>(null);
  const lastTimeRef  = useRef(0);

  const [params,     setParams]     = useState<RhizomeParams>({ ...DEFAULT_PARAMS });
  const [aesthetics, setAesthetics] = useState<RhizomeAesthetics>({ ...DEFAULT_AESTHETICS });
  const [metrics,    setMetrics]    = useState<RhizomeMetrics | null>(null);
  const [dims,       setDims]       = useState({ W: window.innerWidth, H: window.innerHeight });
  const [addMode,    setAddMode]    = useState(false);
  const [hasLLMNodes,setHasLLMNodes]= useState(false);
  const [llmStatus,  setLlmStatus]  = useState<LLMStatus>('idle');
  const [llmMsg,     setLlmMsg]     = useState('');
  const [llmTitle,   setLlmTitle]   = useState('');
  const [llmTopic,   setLlmTopic]   = useState('');
  const [selectedNode, setSelectedNode] = useState<RhizomeNode | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [use3D,        setUse3D]        = useState(true); // default 3D
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Auth
  const { user: authUser, signOut, setUser: setAuthUser } = useAuth();

  // 3D camera state — mutable ref for RAF loop, plus display state for sliders
  const cam3DRef = useRef<Camera3D>({ ...DEFAULT_CAMERA3D });
  const [cam3DUI, setCam3DUI] = useState<Camera3D>({ ...DEFAULT_CAMERA3D });

  // 3D orbit drag
  const drag3DRef = useRef({ active: false, startX: 0, startY: 0,
    startRotX: 0, startRotY: 0, startRotZ: 0, isRoll: false });

  // Loading animation timer
  const loadingStartRef = useRef(0);
  const loadingTopicRef = useRef('');

  // Sections open state
  const [secPhysics, setSecPhysics]   = useState(false);
  const [secAE,      setSecAE]        = useState(false);
  const [secRec,     setSecRec]       = useState(false);
  const [secLLM,     setSecLLM]       = useState(true);
  const [secDebug,   setSecDebug]     = useState(false);

  // Recording
  const recorderRef  = useRef<CanvasRecorder | null>(null);
  const [recState,   setRecState]   = useState<RecorderState>('idle');
  const [recElapsed, setRecElapsed] = useState(0);
  const [recFmt,     setRecFmt]     = useState('WebM');

  // ── Patch 01.01 — Folders & Are.na ──────────────────────────────────────
  const [folders,         setFolders]         = useState<RhizomeFolder[]>([]);
  const [savedRhizomes,   setSavedRhizomes]   = useState<import('../../sim/rhizome/rhizomeFolders').SavedRhizome[]>([]);
  const [showArenaModal,  setShowArenaModal]  = useState(false);
  const [showFolders,     setShowFolders]     = useState(true);
  const [saveToFolderNode, setSaveToFolderNode] = useState<{ node: RhizomeNode; card: SavedCard } | null>(null);
  const [nodeScores,      setNodeScores]      = useState<Map<number, NodeScore>>(new Map());

  // Lifted LLM config — needed by handleLLMExpand (NodeCard)
  const [llmProvider, setLlmProvider] = useState<LLMProvider>('openai');
  const [llmApiKey,   setLlmApiKey]   = useState('');
  const [llmModelId,  setLlmModelId]  = useState('gpt-4.1-mini');
  const [llmMode,     setLlmMode]     = useState<LLMMode>('concepts');

  const paramsRef     = useRef(params);
  const aestheticsRef = useRef(aesthetics);
  const searchModeRef = useRef(false);
  const use3DRef      = useRef(true);  // matches useState(true) above
  const llmStatusRef  = useRef<LLMStatus>('idle');
  const llmProviderRef = useRef<LLMProvider>('openai');
  const llmApiKeyRef   = useRef('');
  const llmModelIdRef  = useRef('gpt-4.1-mini');

  // ── Camera (zoom + pan) ──────────────────────────────────────────────────
  const cameraRef = useRef({ zoom: 1, panX: 0, panY: 0 });
  const [zoomDisplay, setZoomDisplay] = useState(1);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0, moved: false });

  useEffect(() => { paramsRef.current      = params;       }, [params]);
  useEffect(() => { aestheticsRef.current  = aesthetics;   }, [aesthetics]);
  useEffect(() => { use3DRef.current       = use3D;        }, [use3D]);
  useEffect(() => { llmStatusRef.current   = llmStatus;    }, [llmStatus]);
  useEffect(() => { llmProviderRef.current = llmProvider;  }, [llmProvider]);
  useEffect(() => { llmApiKeyRef.current   = llmApiKey;    }, [llmApiKey]);
  useEffect(() => { llmModelIdRef.current  = llmModelId;   }, [llmModelId]);

  // Canvas layout
  const panelW = 250;
  const topH   = 36;
  const canvasW = Math.max(200, dims.W - panelW);
  const canvasH = Math.max(200, dims.H - topH);

  useEffect(() => {
    const fn = () => setDims({ W: window.innerWidth, H: window.innerHeight });
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // ── Recorder lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    recorderRef.current = new CanvasRecorder(s => {
      setRecState(s);
      if (s === 'idle') setRecElapsed(0);
    });
    return () => recorderRef.current?.dispose();
  }, []);

  useEffect(() => {
    if (recState !== 'recording') return;
    const id = setInterval(() => setRecElapsed(recorderRef.current?.elapsed ?? 0), 500);
    return () => clearInterval(id);
  }, [recState]);

  // ── Init ─────────────────────────────────────────────────────────────────
  const initSim = useCallback((p: RhizomeParams, ae?: RhizomeAesthetics, seed?: number) => {
    const s = seed ?? Date.now();
    const state = createRhizomeState(canvasW, canvasH, s, p);
    if (ae) state.aesthetics = { ...ae };
    stateRef.current   = state;
    lastTimeRef.current = 0;
    searchModeRef.current = false; // exit search mode on reset
    setHasLLMNodes(false);
    setLlmTitle('');
    setLlmMsg('');
    setLlmStatus('idle');
    setSelectedNode(null);
    setIsSearchMode(false);
  }, [canvasW, canvasH]);

  useEffect(() => {
    if (active) initSim(paramsRef.current, aestheticsRef.current);
  }, [active]); // eslint-disable-line

  // ── Patch 01.01 — Load folders on mount (local + backend sync) ─────────
  useEffect(() => {
    // Load from localStorage first
    setFolders(loadFolders());
    
    // Then sync from backend
    import('../../sim/rhizome/rhizomeBackend').then(backend => {
      backend.loadFoldersFromBackend().then(remoteFolders => {
        if (remoteFolders.length > 0) {
          // Merge with local (prefer newer)
          const local = loadFolders();
          const merged = [...remoteFolders];
          
          for (const localFolder of local) {
            const remoteIdx = merged.findIndex(r => r.id === localFolder.id);
            if (remoteIdx >= 0) {
              // Take the newer one
              if (localFolder.updatedAt > merged[remoteIdx].updatedAt) {
                merged[remoteIdx] = localFolder;
              }
            } else {
              merged.push(localFolder);
            }
          }
          
          setFolders(merged);
          saveFolders(merged); // Save merged back
        }
      }).catch(err => {
        console.error('[RhizomeLab] Failed to load folders from backend:', err);
      });
    }).catch(err => {
      console.error('[RhizomeLab] Failed to import rhizome backend:', err);
    });
  }, []);

  // ── Patch 01.01 — Load saved rhizomes on mount (local + backend sync) ──
  useEffect(() => {
    // Load from localStorage first
    setSavedRhizomes(loadSavedRhizomes());
    
    // Then sync from backend
    import('../../sim/rhizome/rhizomeBackend').then(backend => {
      backend.loadRhizomesFromBackend().then(remoteRhizomes => {
        if (remoteRhizomes.length > 0) {
          // Merge with local (prefer newer)
          const local = loadSavedRhizomes();
          const merged = [...remoteRhizomes];
          
          for (const localRhizome of local) {
            const remoteIdx = merged.findIndex(r => r.id === localRhizome.id);
            if (remoteIdx >= 0) {
              // Take the newer one (SavedRhizome uses `savedAt`, not `createdAt`)
              if (localRhizome.savedAt > merged[remoteIdx].savedAt) {
                merged[remoteIdx] = localRhizome;
              }
            } else {
              merged.push(localRhizome);
            }
          }
          
          import('../../sim/rhizome/rhizomeFolders').then(({ saveSavedRhizomes }) => {
            setSavedRhizomes(merged);
            saveSavedRhizomes(merged); // Save merged back
          });
        }
      }).catch(err => {
        console.error('[RhizomeLab] Failed to load rhizomes from backend:', err);
      });
    }).catch(err => {
      console.error('[RhizomeLab] Failed to import rhizome backend:', err);
    });
  }, []);

  // ── Patch 01.01 — Compute graph metrics when nodes change ──────────────
  useEffect(() => {
    if (!stateRef.current || stateRef.current.nodes.length === 0) {
      setNodeScores(new Map());
      return;
    }
    const scores = scoreNodes(stateRef.current.nodes);
    setNodeScores(scores);
  }, [stateRef.current?.nodes.length]); // eslint-disable-line

  // ── Main loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    let metricsCounter = 0;

    const loop = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const canvas   = canvasRef.current;
      const state    = stateRef.current;
      if (!canvas || !state) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      if (rawDt <= 0 || rawDt > 0.5) return;

      // Sync live param + aesthetics changes
      state.params     = paramsRef.current;
      state.aesthetics = aestheticsRef.current;

      // ── SEARCH MODE: freeze organic growth ──────────────────────────────────
      // Reset timers every frame so tickRhizome never triggers entry/child spawning.
      // Also set state.searchMode so applyForces skips random capture.
      if (searchModeRef.current) {
        state.entryTimer    = 0;
        state.growthTimer   = 0;
        state.forgetTimer   = 0; // also freeze forgetting so LLM nodes never get pruned
        state.reterritTimer = 0; // disable reterritorialization in search mode
        state.searchMode    = true;
      } else {
        state.searchMode = false;
      }

      const W = canvas.width, H = canvas.height;

      // During loading: run physics normally so nodes spread as they arrive in real-time
      tickRhizome(state, W, H, rawDt);

      // 2D camera ref — declared before the 3D branch so it is in scope for renderHUD
      const cam = cameraRef.current;

      if (use3DRef.current) {
        // 3D mode: engine manages its own projection — no 2D camera transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const cam3d = cam3DRef.current;
        if (cam3d.autoRotate) cam3d.rotY += rawDt * cam3d.autoSpeed;
        renderRhizome3D(ctx, state, W, H, cam3d);
      } else {
        // 2D mode: apply pan/zoom camera
        ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.panX, cam.panY);
        renderRhizome(ctx, state, W, H);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset for screen-space HUD
      renderHUD(ctx, state, W, cam.zoom);

      metricsCounter++;
      if (metricsCounter >= 30) {
        metricsCounter = 0;
        setMetrics(computeRhizomeMetrics(state));
        setHasLLMNodes(state.nodes.some(n => n.label && !n.userPlaced));
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]); // eslint-disable-line

  // ── Screen → world coords ─────────────────────────────────────────────────
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const cam    = cameraRef.current;
    return {
      x: ((clientX - rect.left) * scaleX - cam.panX) / cam.zoom,
      y: ((clientY - rect.top)  * scaleY - cam.panY) / cam.zoom,
    };
  }, []);

  // ── Zoom centered on a screen point ──────────────────────────────────────
  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const sx = (clientX - rect.left) * scaleX;
    const sy = (clientY - rect.top)  * scaleY;
    const cam = cameraRef.current;
    const oldZoom = cam.zoom;
    const newZoom = Math.max(0.10, Math.min(16, oldZoom * factor));
    
    // Only update if zoom actually changed
    if (Math.abs(newZoom - oldZoom) > 0.001) {
      const scale = newZoom / oldZoom;
      cameraRef.current = {
        zoom: newZoom,
        panX: sx - (sx - cam.panX) * scale,
        panY: sy - (sy - cam.panY) * scale,
      };
      setZoomDisplay(parseFloat(newZoom.toFixed(2)));
    }
  }, []);

  // ── Fit all nodes into view ───────────────────────────────────────────────
  const fitView = useCallback(() => {
    const canvas = canvasRef.current;
    const state  = stateRef.current;
    if (!canvas || !state || state.nodes.length === 0) {
      cameraRef.current = { zoom: 1, panX: 0, panY: 0 };
      setZoomDisplay(1);
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of state.nodes) {
      if (n.x < minX) minX = n.x; if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x; if (n.y > maxY) maxY = n.y;
    }
    const pad  = 80;
    const bW   = maxX - minX + pad * 2;
    const bH   = maxY - minY + pad * 2;
    const zoom = Math.max(0.15, Math.min(6, Math.min(canvas.width / bW, canvas.height / bH)));
    cameraRef.current = {
      zoom,
      panX: canvas.width  / 2 - (minX + maxX) / 2 * zoom,
      panY: canvas.height / 2 - (minY + maxY) / 2 * zoom,
    };
    setZoomDisplay(parseFloat(zoom.toFixed(2)));
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') fitView();
      if (e.key === '=' || e.key === '+') zoomAt(canvasW / 2, canvasH / 2, 1.25);
      if (e.key === '-' || e.key === '_') zoomAt(canvasW / 2, canvasH / 2, 0.80);
      if (e.key === '0') { cameraRef.current = { zoom: 1, panX: 0, panY: 0 }; setZoomDisplay(1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, fitView, zoomAt, canvasW, canvasH]);

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (use3DRef.current) {
        // 3D: dolly zoom (scroll) or shift+scroll = pan Z
        const factor = e.deltaY < 0 ? 1.12 : 0.89;
        const next = Math.max(0.1, Math.min(5.0, cam3DRef.current.zoom * factor));
        cam3DRef.current.zoom = next;
        return;
      }
      const factor = e.ctrlKey
        ? (e.deltaY < 0 ? 1.06 : 0.94)
        : (e.deltaY < 0 ? 1.18 : 0.845);
      zoomAt(e.clientX, e.clientY, factor);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [active, zoomAt]);

  // ── Drag: 3D orbit or 2D pan ─────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (addMode) return;
    if (use3DRef.current) {
      // 3D orbit: left-drag = orbit, Shift+drag = roll, middle-drag = pan
      drag3DRef.current = {
        active:     true,
        startX:     e.clientX,
        startY:     e.clientY,
        startRotX:  cam3DRef.current.rotX,
        startRotY:  cam3DRef.current.rotY,
        startRotZ:  cam3DRef.current.rotZ,
        isRoll:     e.shiftKey || e.button === 1,
      };
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    dragRef.current = {
      active:    true,
      startX:    (e.clientX - rect.left) * (canvas.width  / rect.width),
      startY:    (e.clientY - rect.top)  * (canvas.height / rect.height),
      startPanX: cameraRef.current.panX,
      startPanY: cameraRef.current.panY,
      moved:     false,
    };
  }, [addMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (use3DRef.current) {
      const d = drag3DRef.current;
      if (!d.active) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const sens = 0.005;
      if (d.isRoll) {
        cam3DRef.current.rotZ = d.startRotZ + dx * sens;
      } else {
        cam3DRef.current.rotY = d.startRotY + dx * sens;
        cam3DRef.current.rotX = Math.max(-Math.PI / 2 + 0.05,
          Math.min(Math.PI / 2 - 0.05, d.startRotX + dy * sens));
      }
      // Mark as moved so click doesn't fire
      dragRef.current.moved = true;
      return;
    }
    const d = dragRef.current;
    if (!d.active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width  / rect.width);
    const cy = (e.clientY - rect.top)  * (canvas.height / rect.height);
    const dx = cx - d.startX;
    const dy = cy - d.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    if (d.moved) {
      cameraRef.current = { ...cameraRef.current, panX: d.startPanX + dx, panY: d.startPanY + dy };
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current.active   = false;
    drag3DRef.current.active = false;
  }, []);

  // ── Double-click: reset 3D camera ────────────────────────────────────────
  const handleCanvasDblClick = useCallback(() => {
    if (!use3DRef.current) return;
    cam3DRef.current = { ...DEFAULT_CAMERA3D };
    setCam3DUI({ ...DEFAULT_CAMERA3D });
  }, []);

  // ── Canvas click (select node) ────────────────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current.moved) { dragRef.current.moved = false; return; } // was a drag
    if (!stateRef.current) return;

    // In 3D mode: project all nodes to screen and find nearest to click
    if (use3DRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      const cam3d = cam3DRef.current;
      const W = canvas.width, H = canvas.height;
      const cx = W / 2 + cam3d.panX;
      const cy = H / 2 + cam3d.panY;
      const fovPx = Math.min(W, H) * cam3d.fov;
      const camD = fovPx + 300;
      const cosY = Math.cos(cam3d.rotY), sinY = Math.sin(cam3d.rotY);
      const cosX = Math.cos(cam3d.rotX), sinX = Math.sin(cam3d.rotX);
      const cosZ = Math.cos(cam3d.rotZ), sinZ = Math.sin(cam3d.rotZ);

      let closest: RhizomeNode | null = null;
      let closestDist = 28; // px threshold in screen space

      for (const n of stateRef.current.nodes) {
        const deg = n.connections.size;
        const importance = Math.min(1,
          (deg / 8) * 0.5 + n.heat * 0.45 +
          (n.isEntry ? 0.2 : 0) + (n.isAnchor ? 0.4 : 0)
        );
        const z0 = (importance - 0.5) * cam3d.zSpread + Math.sin(n.id * 2.39996) * cam3d.zSpread * 0.33;
        const x = n.x - W / 2, y = n.y - H / 2, z = z0;
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const xf = x1 * cosZ - y2 * sinZ;
        const yf = x1 * sinZ + y2 * cosZ;
        const factor = camD / (z2 + camD) * cam3d.zoom;
        const px = cx + xf * factor;
        const py = cy + yf * factor;
        const dx = px - clickX, dy2 = py - clickY;
        const d = Math.sqrt(dx * dx + dy2 * dy2);
        if (d < closestDist) { closestDist = d; closest = n; }
      }
      setSelectedNode(closest?.label ? closest : null);
      return;
    }

    const { x, y } = screenToWorld(e.clientX, e.clientY);

    if (addMode) {
      addNodeAtPosition(stateRef.current, x, y, canvasW, canvasH);
      setMetrics(computeRhizomeMetrics(stateRef.current));
      return;
    }

    // Click radius grows when zoomed out, shrinks when zoomed in
    const clickRadius = Math.max(6, Math.min(32, 22 / cameraRef.current.zoom));
    let closest: RhizomeNode | null = null;
    let closestDist = clickRadius;
    for (const n of stateRef.current.nodes) {
      const dx = n.x - x, dy = n.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < closestDist) { closestDist = d; closest = n; }
    }
    setSelectedNode(closest?.label ? closest : null);
  }, [addMode, canvasW, canvasH, screenToWorld]);

  // ── Preset handler ────────────────────────────────────────────────────────
  const handlePreset = useCallback((idx: number) => {
    const preset = RHIZOME_PRESETS[idx];
    if (!preset) return;
    const newP = { ...preset.params };
    setParams(newP);
    paramsRef.current = newP;
    initSim(newP, aestheticsRef.current);
  }, [initSim]);

  // ── Param change ──────────────────────────────────────────────────────────
  const handleParamChange = useCallback((key: keyof RhizomeParams, v: number) => {
    setParams(prev => {
      const next = { ...prev, [key]: v };
      paramsRef.current = next;
      if (stateRef.current) stateRef.current.params = next;
      return next;
    });
  }, []);

  // ── Aesthetics change ─────────────────────────────────────────────────────
  const handleAEChange = useCallback(<K extends keyof RhizomeAesthetics>(key: K, v: RhizomeAesthetics[K]) => {
    setAesthetics(prev => {
      const next = { ...prev, [key]: v };
      aestheticsRef.current = next;
      if (stateRef.current) stateRef.current.aesthetics = next;
      return next;
    });
  }, []);

  const applyColorPreset = useCallback((preset: Partial<RhizomeAesthetics>) => {
    setAesthetics(prev => {
      const next = { ...prev, ...preset };
      aestheticsRef.current = next;
      if (stateRef.current) stateRef.current.aesthetics = next;
      return next;
    });
  }, []);

  // ── Export frame PNG ──────────────────────────────────────────────────────
  const handleExportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a   = document.createElement('a');
    a.href    = url;
    a.download = `rhizome-${Date.now()}.png`;
    a.click();
  }, []);

  // ── Recording ─────────────────────────────────────────────────────────────
  const handleRecStart = useCallback((fmt: string, qual: string) => {
    const rec = recorderRef.current;
    if (!rec) return;
    const p = paramsRef.current;
    rec.start(
      () => [canvasRef.current],
      () => ({
        labName: 'Rhizome Lab',
        lines: [
          `intensidade:${p.organismToIntensity.toFixed(2)}  ruido:${p.noise.toFixed(2)}`,
          `l.fuga:${p.linhasDeFuga.toFixed(2)}  territ:${p.territorializacao.toFixed(2)}`,
          `hubs:${p.hubs.toFixed(2)}  esquec:${p.esquecimento.toFixed(2)}`,
        ],
      }),
      30, undefined,
      { format: fmt as any, quality: qual as any },
    );
    setRecFmt(rec.actualFmt);
  }, []);

  const handleRecStop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  // ── Patch 01.01 — Folder handlers ────────────────────────────────────────
  const handleCreateFolder = useCallback((name: string, desc?: string) => {
    const folder = createFolder(name, desc);
    setFolders(loadFolders());
  }, []);

  const handleDeleteFolder = useCallback((id: string) => {
    deleteFolder(id);
    setFolders(loadFolders());
  }, []);

  const handleSaveCard = useCallback((node: RhizomeNode, folderId?: string) => {
    // Build connection labels
    const connectedLabels: string[] = node.connectionsLabels
      ? [...node.connectionsLabels]
      : Array.from(node.connections.keys())
          .map(id => stateRef.current?.nodes.find(n => n.id === id)?.label)
          .filter(Boolean) as string[];

    // Build external reference links
    const q = encodeURIComponent(node.label || '');
    const externalLinks = [
      `https://en.wikipedia.org/wiki/Special:Search?search=${q}`,
      `https://scholar.google.com/scholar?q=${q}`,
    ];

    // Tags from category
    const tags = node.category ? [node.category] : [];

    const card = createCardFromNode(
      node.label || `Node ${node.id}`,
      node.description,
      node.category,
      connectedLabels.length > 0 ? connectedLabels : undefined,
      tags.length > 0 ? tags : undefined,
      externalLinks,
    );
    
    // If folderId is provided, save directly (from modal)
    if (folderId) {
      addCardToFolder(folderId, card);
      setFolders(loadFolders());
      
      // Also save the current rhizome state as a snapshot
      if (stateRef.current) {
        import('../../sim/rhizome/rhizomeEngine').then(({ createSnapshot }) => {
          import('../../sim/rhizome/rhizomeFolders').then(({ saveRhizome, loadSavedRhizomes, saveSavedRhizomes }) => {
            const snapshot = createSnapshot(stateRef.current!);
            if (snapshot) {
              const rhizome = saveRhizome(
                node.label || `Rizoma ${Date.now()}`,
                node.description || '',
                llmTitle || node.label || 'Untitled',
                stateRef.current!.nodes.length,
                snapshot,
                folderId
              );
              console.log('Saved rhizome snapshot:', rhizome.title);
            }
          });
        });
      }
      setSaveToFolderNode(null); // Close modal
    } else {
      // No folderId provided - open modal to choose
      setSaveToFolderNode({ node, card });
    }
  }, [folders, llmTitle]);

  const handleRemoveCard = useCallback((folderId: string, cardId: string) => {
    removeCardFromFolder(folderId, cardId);
    setFolders(loadFolders());
  }, []);

  const handleMoveCard = useCallback((fromFolderId: string, toFolderId: string, cardId: string) => {
    moveCardBetweenFolders(fromFolderId, toFolderId, cardId);
    setFolders(loadFolders());
  }, []);

  const handleSelectCard = useCallback((card: SavedCard) => {
    console.log('Card selected:', card);
    
    // Check if this card has an associated saved rhizome
    import('../../sim/rhizome/rhizomeFolders').then(({ loadSavedRhizomes }) => {
      const allRhizomes = loadSavedRhizomes();
      const matchingRhizome = allRhizomes.find(r => 
        r.title === card.label || r.topic === card.label
      );
      
      if (matchingRhizome && matchingRhizome.snapshot) {
        // Restore the rhizome from snapshot
        import('../../sim/rhizome/rhizomeEngine').then(({ restoreFromSnapshot }) => {
          const restored = restoreFromSnapshot(matchingRhizome.snapshot, canvasW, canvasH);
          if (restored) {
            stateRef.current = restored;
            lastTimeRef.current = 0;
            setLlmTitle(matchingRhizome.title);
            setIsSearchMode(true);
            searchModeRef.current = true;
            console.log('Restored rhizome from snapshot:', matchingRhizome.title);
          }
        });
      } else if (card.url) {
        // Open the link
        window.open(card.url, '_blank');
      }
    });
  }, [canvasW, canvasH]);

  const handleSendToArena = useCallback((node: RhizomeNode) => {
    if (!isArenaConnected()) {
      setShowArenaModal(true);
    } else {
      console.log('Send to Arena:', node);
      // Future: implement actual Arena API call
    }
  }, []);

  const handleExpandNode = useCallback((node: RhizomeNode) => {
    // Generate new rizoma from this node
    const req: LLMRhizomeRequest = {
      topic: node.label || `Node ${node.id}`,
      depth: 'medium',
      nodeCount: 18,
      provider: llmProviderRef.current,
      apiKey: llmApiKeyRef.current || undefined,
      modelId: llmModelIdRef.current || undefined,
      llmMode: llmMode,
    };
    handleLLMGenerate(req); // eslint-disable-line
  }, [llmMode]);

  // ── LLM ───────────────────────────────────────────────────────────────────
  const handleLLMGenerate = useCallback(async (req: LLMRhizomeRequest) => {
    setLlmStatus('loading');
    llmStatusRef.current = 'loading';
    loadingStartRef.current = performance.now() / 1000;
    loadingTopicRef.current = req.topic;
    setLlmTopic(req.topic);
    setLlmMsg('Conectando à LLM...');
    setLlmTitle(req.topic);
    setSelectedNode(null);

    // Enable labels immediately so anchor is visible during loading
    aestheticsRef.current = { ...aestheticsRef.current, showLabels: true };
    setAesthetics(prev => ({ ...prev, showLabels: true }));

    // Create a CLEAN empty state — only one anchor node at center
    const freshState = createRhizomeState(canvasW, canvasH, Date.now(), paramsRef.current);
    freshState.aesthetics = { ...aestheticsRef.current };
    freshState.nodes = [];
    freshState.nextId = 0;

    const anchorNode: RhizomeNode = {
      id: freshState.nextId++,
      x: canvasW / 2, y: canvasH / 2,
      vx: 0, vy: 0, heat: 1.0, isEntry: true, age: 0,
      connections: new Map(),
      label: req.topic,
      description: 'Tema central do mapa rizomático',
      category: undefined, pinned: true, userPlaced: false, isAnchor: true,
    };
    freshState.nodes.push(anchorNode);
    freshState.searchMode = true;
    stateRef.current = freshState;
    lastTimeRef.current = 0;
    searchModeRef.current = true;
    setIsSearchMode(true);
    setHasLLMNodes(false);
    cameraRef.current = { zoom: 1, panX: 0, panY: 0 };
    setZoomDisplay(1);

    // Build label map from anchor + category angle map for clustering
    const labelMap = new Map<string, RhizomeNode>();
    labelMap.set(req.topic, anchorNode);
    const categoryAngleMap = new Map<string, number>();
    let injectedCount = 0;

    try {
      // Streaming: nodes appear as the LLM generates them (not after full response)
      await generateLLMRhizomeStreaming(
        req,
        (def, index) => {
          if (!stateRef.current) return;
          injectedCount++;
          setLlmMsg(`⟳ ${injectedCount} nós...`);
          injectSingleLLMNode(
            stateRef.current, def, index, req.nodeCount,
            canvasW, canvasH,
            anchorNode.id, undefined, undefined, labelMap, categoryAngleMap,
          );
        },
        (total) => {
          setHasLLMNodes(true);
          setLlmMsg(`◈ ${total} conceitos · ${req.topic}`);
          setLlmStatus('done');
          llmStatusRef.current = 'done';
        },
      );
    } catch (err) {
      setLlmStatus('error');
      llmStatusRef.current = 'error';
      setLlmMsg(`Erro: ${(err as Error).message}`);
    }
  }, [canvasW, canvasH, handleAEChange]); // eslint-disable-line

  const handleLLMClear = useCallback(() => {
    if (!stateRef.current) return;
    clearLLMNodes(stateRef.current);
    searchModeRef.current = false;
    setIsSearchMode(false);
    setHasLLMNodes(false);
    setLlmTitle('');
    setLlmMsg('');
    setLlmStatus('idle');
    setSelectedNode(null);
    handleAEChange('showLabels', false);
  }, [handleAEChange]);

  // ── Expand search from a node (infinite drill-down) ───────────────────────
  const handleLLMExpand = useCallback(async (node: RhizomeNode) => {
    if (!stateRef.current || llmStatusRef.current === 'loading') return;

    setLlmStatus('loading');
    llmStatusRef.current = 'loading';
    loadingStartRef.current = performance.now() / 1000;
    loadingTopicRef.current = node.label ?? '';
    setLlmMsg(`↳ Expandindo "${node.label}"...`);
    setSelectedNode(null);

    const req: LLMRhizomeRequest = {
      topic:     node.label ?? '',
      depth:     'medium',
      nodeCount: 20,
      provider:  llmProviderRef.current,
      apiKey:    llmApiKeyRef.current || undefined,
      modelId:   llmModelIdRef.current || undefined,
      llmMode:   'concepts',
    };

    const state = stateRef.current;
    searchModeRef.current = true;
    setIsSearchMode(true);
    handleAEChange('showLabels', true);

    // Build label map from ALL existing nodes so connections link correctly
    const labelMap = new Map<string, RhizomeNode>();
    for (const n of state.nodes) {
      if (n.label) labelMap.set(n.label, n);
    }
    // Category angle map: seed from existing nodes so expanded nodes cluster consistently
    const categoryAngleMap = new Map<string, number>();
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const seenCats: string[] = [];
    for (const n of state.nodes) {
      if (n.category && n.category !== 'default' && !seenCats.includes(n.category)) {
        categoryAngleMap.set(n.category, seenCats.length * goldenAngle * 2.5);
        seenCats.push(n.category);
      }
    }

    let injectedCount = 0;
    try {
      await generateLLMRhizomeStreaming(
        req,
        (def, index) => {
          if (!stateRef.current) return;
          injectedCount++;
          setLlmMsg(`↳ "${node.label}" — ${injectedCount} nós`);
          injectSingleLLMNode(
            stateRef.current, def, index, req.nodeCount,
            canvasW, canvasH,
            node.id, node.x, node.y, // centre expansion on the clicked node
            labelMap, categoryAngleMap,
          );
        },
        (total) => {
          setHasLLMNodes(true);
          setLlmMsg(`◈ ${total} nós de "${node.label}"`);
          setLlmStatus('done');
          llmStatusRef.current = 'done';
        },
      );
    } catch (err) {
      setLlmStatus('error');
      setLlmMsg((err as Error).message);
      llmStatusRef.current = 'error';
    }
  }, [canvasW, canvasH, handleAEChange]);

  if (!active) return null;

  const accentGreen = 'rgba(16,212,91,0.65)';
  const accentPurple = 'rgba(16,212,91,0.55)';
  const inputSty: React.CSSProperties = {
    width: '100%', padding: '4px 7px', borderRadius: 1, fontSize: 10,
    background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.65)', outline: 'none', fontFamily: "'IBM Plex Mono', monospace",
    boxSizing: 'border-box', cursor: 'pointer',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 5,
      display: 'flex', flexDirection: 'column',
      paddingTop: topH,
      background: '#000', fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* ── Canvas (full width) ───────────────────────────────────────── */}
        <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            style={{ display:'block', width:'100%', height:'100%',
              cursor: addMode ? 'crosshair' : (use3D ? (drag3DRef.current.active ? 'grabbing' : 'grab') : 'grab') }}
            onClick={handleCanvasClick}
            onDoubleClick={handleCanvasDblClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />

          {/* ── Patch 01.01: Quick Actions Bar (top-left) ──────────────── */}
          <div style={{
            position: 'absolute', top: 12, left: 12,
            display: 'flex', gap: 6, zIndex: 50,
          }}>
            <button
              onClick={() => {
                console.log('🟣 Botão coleções clicado, estado atual:', showFolders);
                setShowFolders(v => !v);
              }}
              title={showFolders ? 'Esconder Coleções' : 'Mostrar Coleções'}
              style={{
                padding: '6px 12px', borderRadius: 1, fontFamily: MONO,
                background: showFolders ? 'rgba(16,212,91,0.10)' : 'rgba(0,0,0,0.92)',
                border: `1px dashed ${showFolders ? 'rgba(16,212,91,0.35)' : 'rgba(255,255,255,0.10)'}`,
                color: showFolders ? 'rgba(16,212,91,0.90)' : 'rgba(255,255,255,0.55)',
                fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                backdropFilter: 'blur(8px)', transition: 'all 0.15s',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}
              onMouseEnter={e => {
                if (!showFolders) {
                  e.currentTarget.style.background = 'rgba(16,212,91,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(16,212,91,0.25)';
                  e.currentTarget.style.color = 'rgba(16,212,91,0.85)';
                }
              }}
              onMouseLeave={e => {
                if (!showFolders) {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.92)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                }
              }}
            >
              <Folder size={10} strokeWidth={1.5} /> {showFolders ? 'Esconder' : 'Coleções'}
            </button>
            <button
              onClick={() => setShowArenaModal(true)}
              title="Conectar Are.na"
              style={{
                padding: '5px 10px', borderRadius: 1, fontFamily: MONO,
                background: isArenaConnected() ? 'rgba(34,197,94,0.10)' : 'rgba(0,0,0,0.88)',
                border: `1px dashed ${isArenaConnected() ? 'rgba(34,197,94,0.30)' : 'rgba(255,255,255,0.08)'}`,
                color: isArenaConnected() ? 'rgba(34,197,94,0.90)' : 'rgba(255,255,255,0.45)',
                fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                backdropFilter: 'blur(8px)', letterSpacing: '0.06em', textTransform: 'uppercase',
              }}
            >
              {isArenaConnected() ? '✓' : '○'} Are.na
            </button>

            {/* Auth button */}
            <button
              onClick={() => authUser ? signOut() : setShowAuthModal(true)}
              title={authUser ? `${authUser.email} — Clique para sair` : 'Entrar para sincronizar coleções'}
              style={{
                padding: '5px 10px', borderRadius: 1, fontFamily: MONO,
                background: authUser ? 'rgba(96,165,250,0.10)' : 'rgba(0,0,0,0.88)',
                border: `1px dashed ${authUser ? 'rgba(96,165,250,0.30)' : 'rgba(255,255,255,0.08)'}`,
                color: authUser ? 'rgba(147,197,253,0.90)' : 'rgba(255,255,255,0.40)',
                fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                backdropFilter: 'blur(8px)', transition: 'all 0.15s',
                letterSpacing: '0.04em',
              }}
            >
              {authUser
                ? `◉ ${authUser.name || authUser.email.split('@')[0]}`
                : '○ Login'}
            </button>
          </div>

          {/* ── Auth Modal ─────────────────────────────────────────────── */}
          {showAuthModal && (
            <AuthModal
              onClose={() => setShowAuthModal(false)}
              onAuthChange={(user) => {
                setAuthUser(user);
                setShowAuthModal(false);
              }}
            />
          )}

          {/* ── Patch 01.01: Folders Panel (overlay transparente) ─────── */}
          {showFolders && (
            <FoldersPanel
              folders={folders}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              onSelectCard={handleSelectCard}
              onRemoveCard={handleRemoveCard}
              onMoveCard={handleMoveCard}
              onClose={() => setShowFolders(false)}
            />
          )}

          {/* ── Zoom controls ────────────────────────────────────────── */}
          <div style={{
            position: 'absolute', bottom: 16, right: 16,
            display: 'flex', flexDirection: 'column', gap: 3,
            zIndex: 50,
          }}>
            {/* Zoom level badge */}
            <div style={{
              textAlign: 'center', fontSize: 7, fontFamily: MONO,
              color: 'rgba(255,255,255,0.22)', letterSpacing: '0.08em',
              marginBottom: 2,
            }}>
              {Math.round(zoomDisplay * 100)}%
            </div>
            {/* Zoom in */}
            <button
              onClick={() => zoomAt(canvasW / 2, canvasH / 2, 1.35)}
              title="Zoom In (+)"
              style={{
                width: 28, height: 28, borderRadius: 1, border: '1px dashed rgba(255,255,255,0.10)',
                background: 'rgba(0,0,0,0.88)', color: 'rgba(255,255,255,0.45)',
                fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1, fontFamily: MONO,
              }}
            >+</button>
            {/* Fit view */}
            <button
              onClick={fitView}
              title="Encaixar tudo na tela (F)"
              style={{
                width: 28, height: 28, borderRadius: 1, border: '1px dashed rgba(255,255,255,0.10)',
                background: 'rgba(0,0,0,0.88)', color: 'rgba(255,255,255,0.35)',
                fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: MONO,
              }}
            >⊡</button>
            {/* Zoom out */}
            <button
              onClick={() => zoomAt(canvasW / 2, canvasH / 2, 0.74)}
              title="Zoom Out (-)"
              style={{
                width: 28, height: 28, borderRadius: 1, border: '1px dashed rgba(255,255,255,0.10)',
                background: 'rgba(0,0,0,0.88)', color: 'rgba(255,255,255,0.45)',
                fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1, fontFamily: MONO,
              }}
            >−</button>
            {/* Reset 1:1 */}
            <button
              onClick={() => { cameraRef.current = { zoom: 1, panX: 0, panY: 0 }; setZoomDisplay(1); }}
              title="Reset zoom 1:1"
              style={{
                width: 28, height: 28, borderRadius: 1, border: '1px dashed rgba(255,255,255,0.06)',
                background: 'rgba(0,0,0,0.88)', color: 'rgba(255,255,255,0.22)',
                fontSize: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: MONO, letterSpacing: '0.06em',
              }}
            >1:1</button>
          </div>

          {/* Add mode banner */}
          {addMode && (
            <div style={{
              position:'absolute', top:8, left:'50%', transform:'translateX(-50%)',
              background:'rgba(0,0,0,0.80)', border:'1px dashed rgba(16,212,91,0.30)',
              borderRadius:1, padding:'4px 12px', fontSize:8, color:'rgba(16,212,91,0.75)',
              fontFamily: MONO, letterSpacing:'0.08em', pointerEvents:'none', textTransform:'uppercase',
            }}>
              + clique no canvas para adicionar nó
            </div>
          )}

          {/* 3D controls hint */}
          {use3D && !selectedNode && (
            <div style={{
              position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.75)', border: '1px dashed rgba(56,189,248,0.18)',
              borderRadius: 1, padding: '4px 14px', fontSize: 7,
              color: 'rgba(56,189,248,0.45)', fontFamily: MONO,
              pointerEvents: 'none', backdropFilter: 'blur(4px)',
              display: 'flex', gap: 10, alignItems: 'center',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              <span>drag = órbita</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>scroll = zoom</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>click = inspecionar</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>dbl-click = reset</span>
            </div>
          )}

          {/* LLM status chip on canvas */}
          {llmStatus === 'done' && llmTitle && (
            <div style={{
              position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.80)', border: '1px dashed rgba(255,255,255,0.08)',
              borderRadius: 1, padding: '4px 14px', fontSize: 8,
              color: 'rgba(255,255,255,0.40)', fontFamily: MONO,
              pointerEvents: 'none', whiteSpace: 'nowrap', backdropFilter: 'blur(6px)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              ◈ {llmTitle}
            </div>
          )}

          {/* Node inspector card */}
          {selectedNode && (
            <NodeCard
              node={selectedNode}
              allNodes={stateRef.current?.nodes ?? []}
              onClose={() => setSelectedNode(null)}
              onExpand={handleLLMExpand}
              onSave={handleSaveCard}
            />
          )}

          {/* Interaction hints */}
          {!addMode && hasLLMNodes && !selectedNode && (
            <div style={{
              position:'absolute', top:8, right:8,
              fontSize: 8, color:'rgba(255,255,255,0.18)', fontFamily:'monospace',
              pointerEvents:'none', textAlign: 'right', lineHeight: 1.7,
            }}>
              scroll · zoom<br/>
              drag · pan<br/>
              F · fit all<br/>
              click · inspect
            </div>
          )}
        </div>

        {/* ── Right Panel ────────────────────────────────────────────────── */}
        <div style={{
          width: panelW, flexShrink: 0, overflow: 'auto',
          borderLeft: '1px dashed rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.99)',
          padding: '12px 14px',
          scrollbarWidth: 'thin',
          fontFamily: MONO,
        }}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, borderBottom:'1px dashed rgba(255,255,255,0.06)', paddingBottom:10 }}>
            <div style={{ fontSize:13, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.50)', fontFamily: DOTO }}>
              Rhizome Lab
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {metrics && (
                <div style={{ fontSize:7, color:'rgba(255,255,255,0.18)', fontFamily:'monospace' }}>
                  {metrics.nodeCount}n
                </div>
              )}
              {/* 3D toggle */}
              <button onClick={() => setUse3D(v => !v)} title={use3D ? 'Voltar para 2D' : 'Modo 3D'}
                style={{
                  padding: '3px 7px', borderRadius: 1, cursor: 'pointer', fontSize: 8, fontFamily: MONO,
                  background: use3D ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px dashed ${use3D ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  color: use3D ? 'rgba(56,189,248,0.85)' : 'rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}
                onMouseEnter={e => { if (!use3D) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56,189,248,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(56,189,248,0.6)'; }}}
                onMouseLeave={e => { if (!use3D) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'; }}}
              >
                <Box size={8} strokeWidth={1.5} /> 3D
              </button>
            </div>
          </div>

          {/* ── LLM Epistêmico (TOP — highlight) ────────────────────────── */}
          <Section title="Pesquisa Epistêmica" open={secLLM} onToggle={() => setSecLLM(v=>!v)} accent="rgba(16,212,91,0.65)">
            <LLMPanel
              onGenerate={handleLLMGenerate}
              onClear={handleLLMClear}
              hasLLMNodes={hasLLMNodes}
              onOpenPromptEditor={() => setShowPromptEditor(true)}
              provider={llmProvider}
              setProvider={v => { setLlmProvider(v); llmProviderRef.current = v; }}
              apiKey={llmApiKey}
              setApiKey={v => { setLlmApiKey(v); llmApiKeyRef.current = v; }}
              modelId={llmModelId}
              setModelId={v => { setLlmModelId(v); llmModelIdRef.current = v; }}
              llmMode={llmMode}
              setLlmMode={v => { setLlmMode(v); }}
            />
            {/* Status */}
            {llmMsg && llmStatus !== 'idle' && (
              <div style={{ marginTop: 7, fontSize: 8, lineHeight: 1.5,
                color: llmStatus==='done' ? 'rgba(74,222,128,0.7)' : llmStatus==='error' ? 'rgba(248,113,113,0.7)' : 'rgba(251,191,36,0.6)',
                fontFamily: 'monospace' }}>
                {llmMsg}
              </div>
            )}
          </Section>

          {/* ── Interaction mode ─────────────────────────────────────────── */}
          <div style={{ display:'flex', gap:4, marginBottom:0 }}>
            <button onClick={() => setAddMode(false)}
              style={{ flex:1, padding:'5px 0', borderRadius:1, fontSize:8, cursor:'pointer', fontFamily: MONO,
                background: !addMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px dashed ${!addMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                color: !addMode ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.25)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:4, transition:'all 0.15s',
                letterSpacing:'0.06em', textTransform:'uppercase' }}>
              <Eye size={9} strokeWidth={1.5} /> Observar
            </button>
            <button onClick={() => setAddMode(true)}
              style={{ flex:1, padding:'5px 0', borderRadius:1, fontSize:8, cursor:'pointer', fontFamily: MONO,
                background: addMode ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)',
                border: `1px dashed ${addMode ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.06)'}`,
                color: addMode ? 'rgba(196,181,253,0.80)' : 'rgba(255,255,255,0.25)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:4, transition:'all 0.15s',
                letterSpacing:'0.06em', textTransform:'uppercase' }}>
              <Plus size={9} strokeWidth={1.5} /> Nó
            </button>
            <select value="" onChange={e => { const i = parseInt(e.target.value,10); if(!isNaN(i)) handlePreset(i); }}
              style={{ ...inputSty, flex: 1.4, fontSize: 8, padding: '4px 4px' }}>
              <option value="">Preset…</option>
              {RHIZOME_PRESETS.map((p,i) => <option key={p.name} value={i}>{p.name}</option>)}
            </select>
          </div>

          {/* ── Physics ─────────────────────────────────────────────────── */}
          <Section
            title={isSearchMode ? 'Dinâmica do Mapa' : 'Física'}
            open={secPhysics} onToggle={() => setSecPhysics(v=>!v)} accent={accentGreen}
          >
            {(isSearchMode ? SEARCH_PARAM_METAS : PARAM_METAS).map(pm => (
              <Slider key={pm.key} label={pm.label} value={params[pm.key]} tooltip={pm.tooltip}
                onChange={v => handleParamChange(pm.key, v)} />
            ))}
          </Section>

          {/* ── Espaço 3D (only when 3D mode is on) ─────────────────────── */}
          {use3D && (
            <Section title="Espaço 3D" open={true} onToggle={() => {}} accent="rgba(56,189,248,0.65)">
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.28)', marginBottom: 8, lineHeight: 1.6 }}>
                Drag = órbita · Shift+drag = roll · Scroll = zoom · Dbl-click = reset
              </div>

              {/* Auto-rotate toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>Auto-rotação</span>
                <button onClick={() => {
                  const next = !cam3DRef.current.autoRotate;
                  cam3DRef.current.autoRotate = next;
                  setCam3DUI(prev => ({ ...prev, autoRotate: next }));
                }} style={{
                  padding: '2px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 8,
                  background: cam3DUI.autoRotate ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${cam3DUI.autoRotate ? 'rgba(56,189,248,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  color: cam3DUI.autoRotate ? 'rgba(56,189,248,0.9)' : 'rgba(255,255,255,0.3)',
                }}>
                  {cam3DUI.autoRotate ? 'ON' : 'OFF'}
                </button>
              </div>

              <Slider label="Velocidade Rotação" value={cam3DUI.autoSpeed / 0.8}
                tooltip="Velocidade da auto-rotação em modo automático"
                onChange={v => { cam3DRef.current.autoSpeed = v * 0.8; setCam3DUI(p => ({ ...p, autoSpeed: v * 0.8 })); }} />

              <Slider label="Campo Visual (FOV)" value={(cam3DUI.fov - 0.2) / 1.3}
                tooltip="Perspectiva: baixo = teleobjetiva, alto = grande angular"
                onChange={v => { const fov = 0.2 + v * 1.3; cam3DRef.current.fov = fov; setCam3DUI(p => ({ ...p, fov })); }} />

              <Slider label="Profundidade Z" value={(cam3DUI.zSpread - 40) / 460}
                tooltip="Quão espalhados os nós ficam no eixo de profundidade"
                onChange={v => { const z = 40 + v * 460; cam3DRef.current.zSpread = z; setCam3DUI(p => ({ ...p, zSpread: z })); }} />

              <Slider label="Névoa de Profundidade" value={cam3DUI.fog}
                tooltip="Nós distantes ficam mais escuros e transparentes"
                onChange={v => { cam3DRef.current.fog = v; setCam3DUI(p => ({ ...p, fog: v })); }} />

              {/* Reset button */}
              <button onClick={() => { cam3DRef.current = { ...DEFAULT_CAMERA3D }; setCam3DUI({ ...DEFAULT_CAMERA3D }); }}
                style={{
                  marginTop: 6, width: '100%', padding: '4px 0', borderRadius: 4,
                  cursor: 'pointer', fontSize: 8, letterSpacing: '0.05em',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.3)',
                }}>
                ↺ Resetar câmera
              </button>
            </Section>
          )}

          {/* ── Semântica Visual (only in search mode) ──────────────────── */}
          {isSearchMode && (
            <Section title="Semântica Visual" open={true} onToggle={() => {}} accent="rgba(196,181,253,0.65)">
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.28)', marginBottom: 8, lineHeight: 1.6 }}>
                Como dados da LLM afetam o visual do rizoma.
              </div>
              <Slider
                label="Relevância → Tamanho"
                value={aesthetics.relSizeScale}
                tooltip="Nós mais relevantes para o tema ficam visualmente maiores"
                onChange={v => handleAEChange('relSizeScale', v)}
              />
              <Slider
                label="Conexões → Tamanho"
                value={aesthetics.connSizeScale}
                tooltip="Nós com mais conexões (hubs) crescem mais"
                onChange={v => handleAEChange('connSizeScale', v)}
              />
              <Slider
                label="Relevância → Distância"
                value={aesthetics.relDistScale}
                tooltip="Nós relevantes ficam mais perto do centro; periféricos se afastam"
                onChange={v => handleAEChange('relDistScale', v)}
              />
            </Section>
          )}

          {/* ── Aesthetics ──────────────────────────────────────────────── */}
          <Section title="Estética" open={secAE} onToggle={() => setSecAE(v=>!v)} accent={accentPurple}>
            {/* Color presets */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, fontFamily: MONO }}>Paletas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {COLOR_PRESETS.map(cp => (
                  <button
                    key={cp.name}
                    onClick={() => applyColorPreset(cp.ae)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '5px 8px', borderRadius: 1,
                      cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.06)',
                      background: 'rgba(255,255,255,0.02)',
                      transition: 'all 0.15s', textAlign: 'left',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.02)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.06)';
                    }}
                  >
                    <div style={{ display: 'flex', borderRadius: 1, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.10)' }}>
                      <div style={{ width: 10, height: 12, background: cp.ae.bgColor ?? '#000' }} />
                      <div style={{ width: 10, height: 12, background: cp.swatch }} />
                    </div>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em', fontFamily: MONO, textTransform: 'uppercase' }}>{cp.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color pickers */}
            <ColorRow label="Background"       value={aesthetics.bgColor}     onChange={v => handleAEChange('bgColor', v)} />
            <ColorRow label="Nós normais"       value={aesthetics.nodeColor}   onChange={v => handleAEChange('nodeColor', v)} />
            <ColorRow label="Entradas"          value={aesthetics.entryColor}  onChange={v => handleAEChange('entryColor', v)} />
            <ColorRow label="Hubs"              value={aesthetics.hubColor}    onChange={v => handleAEChange('hubColor', v)} />
            <ColorRow label="Nós ativos"        value={aesthetics.hotColor}    onChange={v => handleAEChange('hotColor', v)} />
            <ColorRow label="Links"             value={aesthetics.linkColor}   onChange={v => handleAEChange('linkColor', v)} />
            <ColorRow label="Linhas de Fuga"    value={aesthetics.flightColor} onChange={v => handleAEChange('flightColor', v)} />
            <ColorRow label="Labels"            value={aesthetics.labelColor}  onChange={v => handleAEChange('labelColor', v)} />

            <div style={{ marginTop:8 }}>
              <Slider label="Glow"         value={aesthetics.glowIntensity} onChange={v => handleAEChange('glowIntensity', v)} />
              <Slider label="Tamanho nós"  value={aesthetics.nodeSize}      onChange={v => handleAEChange('nodeSize', v)} />
              <Slider label="Opac. links"  value={aesthetics.linkOpacity}   onChange={v => handleAEChange('linkOpacity', v)} />
              <Slider label="Esp. links"   value={aesthetics.linkWidth}     onChange={v => handleAEChange('linkWidth', v)} />
            </div>

            {/* Labels */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6, marginBottom:6 }}>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>Mostrar Labels</span>
              <button onClick={() => handleAEChange('showLabels', !aesthetics.showLabels)}
                style={{ padding:'3px 8px', borderRadius:3, fontSize:9, cursor:'pointer',
                  background: aesthetics.showLabels ? 'rgba(0,255,102,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${aesthetics.showLabels ? 'rgba(0,255,102,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  color: aesthetics.showLabels ? 'rgba(0,255,102,0.85)' : 'rgba(255,255,255,0.3)' }}>
                {aesthetics.showLabels ? 'ON' : 'OFF'}
              </button>
            </div>
            {aesthetics.showLabels && (
              <Slider label="Tamanho labels" value={aesthetics.labelSize} onChange={v => handleAEChange('labelSize', v)} />
            )}

            {/* Export frame */}
            <button onClick={handleExportPNG}
              style={{ marginTop:6, width:'100%', padding:'5px 0', borderRadius:4, cursor:'pointer',
                background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)',
                color:'rgba(255,255,255,0.5)', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
              <Camera size={10} strokeWidth={1.5} />
              Exportar Frame PNG
            </button>
          </Section>

          {/* ── Recording ───────────────────────────────────────────────── */}
          <Section title="Gravação" open={secRec} onToggle={() => setSecRec(v=>!v)} accent="rgba(239,68,68,0.55)">
            <RecordingPanel
              recState={recState}
              elapsed={recElapsed}
              actualFmt={recFmt}
              onStart={handleRecStart}
              onStop={handleRecStop}
            />
          </Section>

          {/* ── Debug ───────────────────────────────────────────────────── */}
          <Section title="Debug / Métricas" open={secDebug} onToggle={() => setSecDebug(v=>!v)}>
            {metrics && (
              <div style={{ marginBottom:8 }}>
                {[
                  { label:'Nós',          v: metrics.nodeCount },
                  { label:'Entradas',     v: metrics.entryCount },
                  { label:'Links longos', v: metrics.longLinkCount },
                  { label:'Isolados',     v: metrics.isolatedCount },
                  { label:'Grau médio',   v: metrics.avgDegree.toFixed(2) },
                  { label:'Hubness',      v: metrics.hubness.toFixed(3) },
                ].map(m => (
                  <div key={m.label} style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'rgba(255,255,255,0.32)', marginBottom:3 }}>
                    <span>{m.label}</span>
                    <span style={{ fontFamily:'monospace', color:'rgba(255,255,255,0.5)' }}>{m.v}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => initSim(paramsRef.current, aestheticsRef.current)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'5px 0', borderRadius:4, cursor:'pointer', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.45)', fontSize:10 }}>
              <RotateCcw size={10} strokeWidth={1.5} />
              Reset (novo seed)
            </button>
          </Section>

        </div>{/* end right panel */}
      </div>

      {/* ── Prompt Editor Modal ──────────────────────────────────────────── */}
      {showPromptEditor && (
        <PromptEditorModal onClose={() => setShowPromptEditor(false)} />
      )}

      {/* ── Patch 01.01: Node Inspector (direita, quando node selecionado) ── */}
      {selectedNode && (
        <NodeInspectorNew
          node={selectedNode}
          allNodes={stateRef.current?.nodes || []}
          score={nodeScores.get(selectedNode.id)}
          onClose={() => setSelectedNode(null)}
          onSaveCard={(node) => handleSaveCard(node)}
          onSendToArena={(node) => handleSendToArena(node)}
          onExpand={(node) => handleExpandNode(node)}
        />
      )}

      {/* ── Patch 01.01: Are.na Connect Modal ─────────────────────────────── */}
      {showArenaModal && (
        <ArenaConnectModal
          onClose={() => setShowArenaModal(false)}
        />
      )}

      {/* ── Save to Folder Modal ──────────────────────────────────────────── */}
      {saveToFolderNode && (
        <SaveToFolderModal
          folders={folders}
          onSelect={(folderId) => {
            handleSaveCard(saveToFolderNode.node, folderId);
          }}
          onCreateFolder={(name, desc) => {
            handleCreateFolder(name, desc);
            // Auto-select the newly created folder
            const newFolders = loadFolders();
            const newFolder = newFolders[newFolders.length - 1];
            if (newFolder) {
              handleSaveCard(saveToFolderNode.node, newFolder.id);
            }
          }}
          onClose={() => setSaveToFolderNode(null)}
        />
      )}
    </div>
  );
};

// ── Minimal analysis HUD (canvas overlay, screen-space) ──────────────────────
function renderHUD(ctx: CanvasRenderingContext2D, state: RhizomeState, W: number, zoom = 1): void {
  const nodes   = state.nodes;
  if (nodes.length === 0) return;
  const entries  = nodes.filter(n => n.isEntry).length;
  const isolated = nodes.filter(n => n.connections.size === 0 && !n.isEntry).length;

  ctx.save();
  ctx.font      = '9px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.fillText(`nodes:${nodes.length}  entries:${entries}  isolated:${isolated}`, 10, 14);
  ctx.restore();
}

// ── Semantic param metas for LLM search mode ─────────────────────────────────
// These map the existing physics params to knowledge-map semantics.
// Organic growth params (multiplicidade, density, organismToIntensity) are
// hidden — they're frozen by searchModeRef anyway.
const SEARCH_PARAM_METAS: ParamMeta[] = [
  {
    key: 'territorializacao',
    label: 'Coesão ao Centro',
    tooltip: 'Quão fortemente os conceitos são puxados de volta ao tema central. Alto = mapa compacto; baixo = conceitos se dispersam livremente.',
  },
  {
    key: 'linhasDeFuga',
    label: 'Dispersão Semântica',
    tooltip: 'Conceitos tangenciais se distanciam do centro. Alto = conceitos periféricos voam para longe; baixo = tudo fica próximo.',
  },
  {
    key: 'noise',
    label: 'Deriva Conceitual',
    tooltip: 'Quanto os nós derivam aleatoriamente no espaço epistêmico. Alto = layout mais caótico; baixo = posições estáveis.',
  },
  {
    key: 'hubs',
    label: 'Popularidade / Hub',
    tooltip: 'Conceitos populares e muito conectados crescem mais. Alto = figuras centrais dominam visualmente; baixo = igualdade entre nós.',
  },
  {
    key: 'reterritorializacao',
    label: 'Re-Conexão',
    tooltip: 'Força que cria novas conexões entre conceitos próximos. Alto = rede densa e interligada; baixo = conexões esparsas.',
  },
  {
    key: 'esquecimento',
    label: 'Filtragem',
    tooltip: 'Conexões fracas desaparecem com o tempo. Alto = apenas relações fortes sobrevivem (mapa mais limpo); baixo = acumulo de conexões.',
  },
  {
    key: 'visibility',
    label: 'Visibilidade',
  },
];