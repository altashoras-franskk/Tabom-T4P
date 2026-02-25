// ─────────────────────────────────────────────────────────────────────────────
// ControlsBar — HUD máximo 8 visíveis + Advanced colapsável
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import type { LangMode, DictionaryMode, LensId, LanguageParams } from '../../sim/language/types';
import type { LanguagePreset } from '../../sim/language/presets';
import { LANGUAGE_PRESETS } from '../../sim/language/presets';
import {
  BookOpen, ChevronDown, ChevronRight, RefreshCw,
  Ear, Mic, Brain, Settings, Eye,
} from 'lucide-react';

interface Props {
  params: LanguageParams;
  mode: LangMode;
  lens: LensId;
  running: boolean;
  onParams: (p: Partial<LanguageParams>) => void;
  onMode: (m: LangMode) => void;
  onLens: (l: LensId) => void;
  onReset: () => void;
  onOpenLexicon: () => void;
  onPreset: (p: LanguagePreset) => void;
  onToggleRunning: () => void;
}

const BTN: React.CSSProperties = {
  fontSize: 8, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
  letterSpacing: '0.1em', textTransform: 'uppercase',
  display: 'flex', alignItems: 'center', gap: 4,
};

const SLIDER_ROW = {
  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
};

function Slider({
  label, value, min = 0, max = 1, step = 0.01,
  onChange,
}: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div style={SLIDER_ROW as React.CSSProperties}>
      <span style={{ fontSize: 7, color: 'rgba(200,190,180,0.5)', width: 70,
        letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
        {label}
      </span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, height: 2, accentColor: 'rgba(160,80,255,0.8)', cursor: 'pointer' }} />
      <span style={{ fontSize: 7, color: 'rgba(200,190,180,0.4)', width: 24, textAlign: 'right' }}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

const MODE_DEFS: { id: LangMode; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'listen', label: 'Listen', icon: <Ear size={9} />,   color: '#60c0ff' },
  { id: 'speak',  label: 'Speak',  icon: <Mic size={9} />,   color: '#ffd060' },
  { id: 'train',  label: 'Train',  icon: <Brain size={9} />, color: '#80ff80' },
];

const LENS_DEFS: { id: LensId; label: string; color: string }[] = [
  { id: 'world',   label: 'World',   color: '#60c0ff' },
  { id: 'glyphs',  label: 'Glyphs',  color: '#e0d8cc' },
  { id: 'events',  label: 'Events',  color: '#ff8060' },
  { id: 'map',     label: 'Map',     color: '#80ff90' },
  { id: 'phase',   label: 'Phase',   color: '#a070ff' },
  { id: 'meaning', label: 'Meaning', color: '#ffd060' },
];

export function ControlsBar({
  params, mode, lens, running, onParams, onMode, onLens,
  onReset, onOpenLexicon, onPreset, onToggleRunning,
}: Props) {
  const [advOpen, setAdvOpen] = useState(false);

  const barSty: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 0,
    background: 'rgba(6,4,18,0.95)',
    borderRight: '1px solid rgba(255,255,255,0.05)',
    width: 200, flexShrink: 0,
    fontFamily: 'system-ui, sans-serif',
    overflowY: 'auto', scrollbarWidth: 'none',
    padding: '10px 0',
  };

  const section: React.CSSProperties = {
    padding: '6px 10px 4px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  };

  const secLabel: React.CSSProperties = {
    fontSize: 7, color: 'rgba(160,80,255,0.5)',
    letterSpacing: '0.14em', textTransform: 'uppercase',
    marginBottom: 5,
  };

  return (
    <div style={barSty}>
      {/* Title */}
      <div style={{ padding: '2px 10px 8px' }}>
        <div style={{ fontSize: 7, letterSpacing: '0.18em', color: 'rgba(160,80,255,0.5)', textTransform: 'uppercase' }}>
          Language Lab
        </div>
        <div style={{ fontSize: 11, color: 'rgba(242,232,215,0.85)' }}>
          Heptapod ∅
        </div>
      </div>

      {/* Presets */}
      <div style={section}>
        <div style={secLabel}>Preset</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {LANGUAGE_PRESETS.map(p => (
            <button key={p.id}
              onClick={() => onPreset(p)}
              style={{
                ...BTN,
                background: params.preset === p.id ? 'rgba(160,80,255,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${params.preset === p.id ? 'rgba(160,80,255,0.35)' : 'rgba(255,255,255,0.07)'}`,
                color: params.preset === p.id ? 'rgba(200,160,255,0.9)' : 'rgba(200,190,180,0.5)',
                textAlign: 'left', justifyContent: 'flex-start', width: '100%',
              }}>
              <span>{p.emoji}</span>
              <span style={{ fontSize: 8 }}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode */}
      <div style={section}>
        <div style={secLabel}>Modo</div>
        <div style={{ display: 'flex', gap: 3 }}>
          {MODE_DEFS.map(m => (
            <button key={m.id}
              onClick={() => onMode(m.id)}
              title={m.label}
              style={{
                ...BTN,
                flex: 1,
                justifyContent: 'center',
                background: mode === m.id ? `${m.color}22` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${mode === m.id ? m.color + '55' : 'rgba(255,255,255,0.07)'}`,
                color: mode === m.id ? m.color : 'rgba(200,190,180,0.4)',
                padding: '4px 4px',
              }}>
              {m.icon}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 8, color: 'rgba(200,190,180,0.4)', textAlign: 'center', marginTop: 3 }}>
          {MODE_DEFS.find(m => m.id === mode)?.label}
        </div>
      </div>

      {/* Dictionary Mode */}
      <div style={section}>
        <div style={secLabel}>Mapa Semântico</div>
        <select
          value={params.dictionaryMode}
          onChange={e => onParams({ dictionaryMode: e.target.value as DictionaryMode })}
          style={{ width: '100%', fontSize: 9, padding: '3px 4px', borderRadius: 4, cursor: 'pointer',
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(200,190,180,0.8)', outline: 'none' }}>
          <option value="linear">Linear</option>
          <option value="heptapod">Heptapod</option>
          <option value="recursive">Recursive</option>
          <option value="experimental">Experimental</option>
        </select>
      </div>

      {/* Sliders */}
      <div style={section}>
        <div style={secLabel}>Física</div>
        <Slider label="Agents" value={params.agentCount} min={100} max={1200} step={50}
          onChange={v => onParams({ agentCount: Math.round(v) })} />
        <Slider label="Dance" value={params.dance}
          onChange={v => onParams({ dance: v })} />
        <Slider label="Entrainment" value={params.entrainment}
          onChange={v => onParams({ entrainment: v })} />
        <Slider label="Ring Spring" value={params.loopThreshold}
          onChange={v => onParams({ loopThreshold: v })} />
        <Slider label="InkDecay" value={params.inkDecay}
          onChange={v => onParams({ inkDecay: v })} />
        <Slider label="TimeScope" value={params.timeScope}
          onChange={v => onParams({ timeScope: v })} />
        {mode === 'speak' && (
          <Slider label="Intensity" value={params.speakIntensity}
            onChange={v => onParams({ speakIntensity: v })} />
        )}
      </div>

      {/* Lens */}
      <div style={section}>
        <div style={secLabel}><Eye size={8} style={{ display: 'inline', marginRight: 4 }} />Lens</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {LENS_DEFS.map(l => (
            <button key={l.id}
              onClick={() => onLens(l.id)}
              style={{
                ...BTN,
                background: lens === l.id ? `${l.color}22` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${lens === l.id ? l.color + '55' : 'rgba(255,255,255,0.06)'}`,
                color: lens === l.id ? l.color : 'rgba(200,190,180,0.35)',
                fontSize: 7, padding: '3px 7px',
              }}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <button
          onClick={onOpenLexicon}
          style={{ ...BTN, background: 'rgba(160,80,255,0.12)', border: '1px solid rgba(160,80,255,0.25)',
            color: 'rgba(200,160,255,0.9)', justifyContent: 'center', padding: '5px 8px' }}>
          <BookOpen size={10} />
          Abrir Grimório
        </button>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={onToggleRunning}
            style={{ ...BTN, flex: 1, justifyContent: 'center',
              background: running ? 'rgba(255,200,60,0.1)' : 'rgba(80,200,80,0.1)',
              border: `1px solid ${running ? 'rgba(255,200,60,0.25)' : 'rgba(80,200,80,0.25)'}`,
              color: running ? 'rgba(255,220,120,0.8)' : 'rgba(140,220,140,0.8)', padding: '4px' }}>
            {running ? '⏸' : '▶'} {running ? 'Pausa' : 'Play'}
          </button>
          <button
            onClick={onReset}
            title="Reset simulação"
            style={{ ...BTN, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
              color: 'rgba(200,190,180,0.5)', padding: '4px 7px' }}>
            <RefreshCw size={9} />
          </button>
        </div>
      </div>

      {/* Advanced */}
      <div style={{ padding: '0 10px 8px' }}>
        <button
          onClick={() => setAdvOpen(!advOpen)}
          style={{ ...BTN, background: 'none', border: 'none', color: 'rgba(200,190,180,0.3)',
            width: '100%', justifyContent: 'flex-start', padding: '4px 0' }}>
          <Settings size={9} />
          Avançado
          {advOpen ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
        </button>

        {advOpen && (
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 5, padding: '8px 8px 4px',
            border: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
            <div style={{ ...SLIDER_ROW as React.CSSProperties, marginBottom: 6 }}>
              <span style={{ fontSize: 7, color: 'rgba(200,190,180,0.4)', width: 60, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Seed</span>
              <input type="number" value={params.seed}
                onChange={e => onParams({ seed: parseInt(e.target.value) || 0 })}
                style={{ flex: 1, fontSize: 8, padding: '2px 4px', borderRadius: 3,
                  background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(200,190,180,0.8)', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <input type="checkbox" id="autorefine" checked={params.llmAutoRefine}
                onChange={e => onParams({ llmAutoRefine: e.target.checked })}
                style={{ accentColor: 'rgba(160,80,255,0.8)' }} />
              <label htmlFor="autorefine" style={{ fontSize: 8, color: 'rgba(200,190,180,0.5)',
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                LLM Auto-Refine
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}