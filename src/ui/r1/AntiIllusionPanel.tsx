/**
 * Patch R1 — Anti-illusion: indices + tooltips + "Generate Counter-Map" button.
 */

import React, { useState } from 'react';
import type { AntiIllusionIndices, CounterMapEntry } from '../../r1/antiIllusion';
import { generateCounterMap, getSuggestionForIndex } from '../../r1/antiIllusion';

const MONO = "'IBM Plex Mono', monospace";
const DIM = 'rgba(255,255,255,0.18)';
const TEAL = '#37b2da';

interface AntiIllusionPanelProps {
  indices: AntiIllusionIndices;
  onGenerateCounterMap: () => CounterMapEntry[];
}

export function AntiIllusionPanel({ indices, onGenerateCounterMap }: AntiIllusionPanelProps) {
  const [counterMap, setCounterMap] = useState<CounterMapEntry[] | null>(null);

  const handleGenerate = () => {
    setCounterMap(onGenerateCounterMap());
  };

  const indexKeys: (keyof AntiIllusionIndices)[] = ['hallucination_probability', 'symbolic_overload_index', 'confirmation_bias_score'];
  const labels: Record<keyof AntiIllusionIndices, string> = {
    hallucination_probability: 'Hallucination prob.',
    symbolic_overload_index: 'Symbolic overload',
    confirmation_bias_score: 'Confirmation bias',
  };

  return (
    <div
      style={{
        padding: 8,
        background: 'rgba(6,8,12,0.92)',
        border: `1px dashed ${TEAL}44`,
        fontFamily: MONO,
        fontSize: 9,
        maxWidth: 300,
        maxHeight: 400,
        overflowY: 'auto',
      }}
    >
      <div style={{ color: TEAL, marginBottom: 6 }}>ANTI-ILLUSION</div>
      {indexKeys.map(k => (
        <div key={k} style={{ marginBottom: 6 }} title={getSuggestionForIndex(k, indices[k])}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: DIM }}>
            <span>{labels[k]}</span>
            <span style={{ color: TEAL }}>{(indices[k] * 100).toFixed(0)}%</span>
          </div>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.06)' }}>
            <div
              style={{
                height: '100%',
                width: `${indices[k] * 100}%`,
                background: indices[k] > 0.6 ? '#ff6050' : indices[k] > 0.3 ? '#ffc840' : TEAL + '88',
              }}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={handleGenerate}
        style={{
          marginTop: 8,
          padding: '4px 8px',
          background: TEAL + '22',
          border: `1px solid ${TEAL}44`,
          color: TEAL,
          fontFamily: MONO,
          fontSize: 9,
          cursor: 'pointer',
        }}
      >
        Generate Counter-Map
      </button>
      {counterMap && counterMap.length > 0 && (
        <div style={{ marginTop: 8, padding: 4, background: 'rgba(0,0,0,0.3)', fontSize: 8 }}>
          {counterMap.map((entry, i) => (
            <div key={i} style={{ marginBottom: 6, color: 'rgba(255,255,255,0.7)' }}>
              <div style={{ color: DIM }}>H: {entry.hypothesis}</div>
              <div style={{ color: TEAL }}>C: {entry.counter_hypothesis}</div>
              <div style={{ color: 'rgba(255,200,64,0.9)' }}>≠ {entry.contradiction}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
