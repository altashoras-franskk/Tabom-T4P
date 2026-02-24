// ── Studio Sequencer — deterministic 16-step grid for Music Lab ──────────────
import React, { useState } from 'react';
import { VoiceRole, ROLE_COLORS } from '../../../sim/music/musicTypes';

const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";
const ACCENT = '#37b2da';

// ── Data types ────────────────────────────────────────────────────────────────
export interface SStep { on: boolean; vel: number; }
export interface SRow  {
  role:   VoiceRole;
  muted:  boolean;
  solo:   boolean;
  steps:  SStep[];
}

const mkSteps = (count = 16): SStep[] =>
  Array.from({ length: count }, () => ({ on: false, vel: 0.8 }));

export const DEFAULT_STUDIO_ROWS = (): SRow[] => [
  { role: 'KICK',    muted: false, solo: false, steps: mkSteps() },
  { role: 'BASS',    muted: false, solo: false, steps: mkSteps() },
  { role: 'PERC',    muted: false, solo: false, steps: mkSteps() },
  { role: 'LEAD',    muted: false, solo: false, steps: mkSteps() },
  { role: 'ARP',     muted: false, solo: false, steps: mkSteps() },
  { role: 'PAD',     muted: false, solo: false, steps: mkSteps() },
];

// ── Preset patterns ────────────────────────────────────────────────────────────
export type PatternDef = { name: string; desc: string; steps: Partial<Record<VoiceRole, number[]>> };
export const STUDIO_PATTERNS: PatternDef[] = [
  {
    name: '4 on 4',   desc: 'Kick em cada beat — techno clássico',
    steps: { KICK:[0,4,8,12], BASS:[0,4,8,12], PERC:[2,6,10,14], LEAD:[2,10], ARP:[0,2,4,6,8,10,12,14] },
  },
  {
    name: 'Boom Bap', desc: 'Hip-hop: kick 1+3, snare 2+4',
    steps: { KICK:[0,6,10], BASS:[0,8], PERC:[4,12], ARP:[2,6,14] },
  },
  {
    name: 'Techno',   desc: 'Groove de 2 barras, bassline acido',
    steps: { KICK:[0,4,8,12], PERC:[2,6,10,14], BASS:[0,3,8,11], LEAD:[6,14], ARP:[1,5,9,13] },
  },
  {
    name: 'Arpejo',   desc: 'ARP livre, PAD e BASS no 1+3',
    steps: { ARP:[0,2,4,6,8,10,12,14], PAD:[0,8], BASS:[0,8], KICK:[0,8] },
  },
  {
    name: 'Minimal',  desc: 'Espaço e respiro',
    steps: { KICK:[0,8], BASS:[0,6], PERC:[4], PAD:[0] },
  },
  {
    name: 'D&B',      desc: 'Drum and Bass: kick sincopado',
    steps: { KICK:[0,10], BASS:[0,3,8,11], PERC:[4,6,12,14], ARP:[0,4,8,12] },
  },
  {
    name: 'Afro',     desc: 'Poliritmo afrobeat',
    steps: { KICK:[0,3,6,9,12], PERC:[2,5,8,11,14], BASS:[0,6,12], ARP:[2,8,14], LEAD:[4,10] },
  },
  {
    name: 'Ambient',  desc: 'Texturas lentas, sem percussão',
    steps: { PAD:[0], ARP:[0,4,8,12], LEAD:[4], BASS:[0,8] },
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  rows:            SRow[];
  active:          boolean;
  stepCount:       8 | 16;
  cursor:          number;
  bpm:             number;
  onToggleActive:  () => void;
  onToggleStep:    (ri: number, si: number) => void;
  onSetStepCount:  (n: 8 | 16) => void;
  onToggleMute:    (ri: number) => void;
  onToggleSolo:    (ri: number) => void;
  onSetVel:        (ri: number, vel: number) => void;
  onClearRow:      (ri: number) => void;
  onLoadPattern:   (p: PatternDef) => void;
  onClearAll:      () => void;
}

export const StudioSequencer: React.FC<Props> = ({
  rows, active, stepCount, cursor, bpm,
  onToggleActive, onToggleStep, onSetStepCount,
  onToggleMute, onToggleSolo, onClearRow, onLoadPattern, onClearAll,
}) => {
  const [showPatterns, setShowPatterns] = useState(false);
  const hasSolo = rows.some(r => r.solo);

  return (
    <div className="flex flex-col select-none" style={{ background: 'rgba(0,0,0,0.94)', fontFamily: MONO }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5" style={{borderBottom:'1px dashed rgba(255,255,255,0.04)'}}>
        {/* On/Off */}
        <button onClick={onToggleActive}
          className="flex items-center gap-1 px-2.5 py-1 transition-all"
          style={{
            fontSize:7,letterSpacing:'0.08em',textTransform:'uppercase',
            color: active ? ACCENT : 'rgba(255,255,255,0.25)',
            background: active ? `${ACCENT}08` : 'transparent',
            border: active ? `1px dashed ${ACCENT}30` : '1px dashed rgba(255,255,255,0.06)',
          }}>
          {active
            ? <><span className="w-1.5 h-1.5 animate-pulse inline-block mr-0.5" style={{background:ACCENT}}/>ON</>
            : <>○ OFF</>}
        </button>

        <span style={{fontFamily:DOTO,fontSize:8,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.28)'}}>Studio Seq</span>
        <span style={{fontSize:6,color:'rgba(255,255,255,0.14)'}}>{bpm} BPM · {stepCount} steps · 4/4</span>

        <div className="flex-1"/>

        {/* Step count */}
        <div className="flex items-center gap-0.5">
          <span style={{fontSize:6,color:'rgba(255,255,255,0.14)',textTransform:'uppercase',marginRight:4}}>Steps</span>
          {([8,16] as const).map(n => (
            <button key={n} onClick={() => onSetStepCount(n)}
              className="transition-all"
              style={{
                fontSize:7,padding:'2px 8px',
                color: stepCount === n ? ACCENT : 'rgba(255,255,255,0.18)',
                background: stepCount === n ? `${ACCENT}08` : 'transparent',
                border: stepCount === n ? `1px dashed ${ACCENT}30` : '1px dashed rgba(255,255,255,0.04)',
              }}>
              {n}
            </button>
          ))}
        </div>

        {/* Patterns */}
        <div className="relative">
          <button onClick={() => setShowPatterns(v => !v)}
            className="transition-all"
            style={{fontSize:7,padding:'2px 8px',color:'rgba(255,255,255,0.22)',border:'1px dashed rgba(255,255,255,0.06)'}}>
            Padrões ▾
          </button>
          {showPatterns && (
            <div className="absolute bottom-full right-0 mb-1 z-50 w-52 py-1"
              style={{background:'rgba(0,0,0,0.96)',border:'1px dashed rgba(255,255,255,0.06)'}}>
              {STUDIO_PATTERNS.map(pat => (
                <button key={pat.name}
                  onClick={() => { onLoadPattern(pat); setShowPatterns(false); }}
                  className="w-full text-left px-3 py-1.5 transition-all"
                  style={{background:'transparent'}}
                  onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.03)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <div style={{fontSize:7,color:'rgba(255,255,255,0.55)'}}>{pat.name}</div>
                  <div style={{fontSize:6,color:'rgba(255,255,255,0.20)'}}>{pat.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={onClearAll}
          className="transition-all"
          style={{fontSize:7,padding:'2px 8px',color:'rgba(255,60,60,0.35)',border:'1px dashed rgba(255,60,60,0.12)'}}>
          Limpar
        </button>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────────────── */}
      <div className="px-3 py-2 flex flex-col gap-[3px]">
        {rows.map((row, ri) => {
          const color  = ROLE_COLORS[row.role];
          const dimmed = row.muted || (hasSolo && !row.solo);

          return (
            <div key={row.role} className="flex items-center gap-2">
              {/* Left controls */}
              <div className="flex items-center gap-1 flex-shrink-0" style={{ width: 80 }}>
                <button onClick={() => onToggleMute(ri)} title="Mute"
                  className="w-[18px] h-[18px] flex items-center justify-center transition-all"
                  style={{
                    fontSize:6,
                    border: `1px dashed ${row.muted ? 'rgba(255,255,255,0.06)' : color + '40'}`,
                    color:       row.muted ? 'rgba(255,255,255,0.15)' : color + 'bb',
                    background:  row.muted ? 'transparent' : color + '08',
                  }}>M</button>
                <button onClick={() => onToggleSolo(ri)} title="Solo"
                  className="w-[18px] h-[18px] flex items-center justify-center transition-all"
                  style={{
                    fontSize:6,
                    border: `1px dashed ${row.solo ? 'rgba(255,215,0,0.50)' : 'rgba(255,255,255,0.04)'}`,
                    color:       row.solo ? '#ffd700'   : 'rgba(255,255,255,0.15)',
                    background:  row.solo ? 'rgba(255,215,0,0.06)' : 'transparent',
                  }}>S</button>
                <span className="flex-1 text-center transition-colors"
                  style={{ fontSize:7, letterSpacing:'0.10em', textTransform:'uppercase', color: dimmed ? 'rgba(255,255,255,0.12)' : color }}>
                  {row.role.slice(0, 3)}
                </span>
                <button onClick={() => onClearRow(ri)}
                  style={{fontSize:7,color:'rgba(255,255,255,0.10)'}}
                  className="transition-colors" title="Limpar linha">✕</button>
              </div>

              {/* Steps */}
              <div className="flex gap-px flex-1">
                {Array.from({ length: stepCount }).map((_, si) => {
                  const step      = row.steps[si] ?? { on: false, vel: 0.8 };
                  const isOn      = step.on;
                  const isCur     = active && si === cursor;
                  const isBeat    = si % 4 === 0;
                  const isHalf    = si === 0 || si === 8;

                  return (
                    <button key={si} onClick={() => onToggleStep(ri, si)}
                      className={`relative flex-1 transition-all ${isCur ? 'ring-1 ring-white/70' : ''}`}
                      style={{
                        height: 22,
                        background: isOn
                          ? isCur ? color : dimmed ? color + '28' : color + '60'
                          : isBeat
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(255,255,255,0.02)',
                        borderBottom: isOn
                          ? `2px solid ${dimmed ? color + '35' : color}`
                          : isHalf
                            ? '1px solid rgba(255,255,255,0.08)'
                            : isBeat
                              ? '1px solid rgba(255,255,255,0.04)'
                              : '1px solid rgba(255,255,255,0.02)',
                        opacity: dimmed && !isCur ? 0.4 : 1,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Beat ruler */}
        <div className="flex gap-px" style={{ marginLeft: 88 }}>
          {Array.from({ length: stepCount }).map((_, si) => (
            <div key={si} className="flex-1 flex justify-start pl-0.5">
              {si % 4 === 0 && (
                <span style={{fontSize:5,color:'rgba(255,255,255,0.14)'}}>{si / 4 + 1}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
