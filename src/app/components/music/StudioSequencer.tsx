// ── Studio Sequencer — deterministic 16-step grid for Music Lab ──────────────
import React, { useState } from 'react';
import { VoiceRole, ROLE_COLORS } from '../../../sim/music/musicTypes';

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
    <div className="flex flex-col select-none" style={{ background: 'rgba(4,6,14,0.92)' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.06]">
        {/* On/Off */}
        <button onClick={onToggleActive}
          className={`flex items-center gap-1 text-[7px] font-mono px-2.5 py-1 rounded border transition-all
            ${active
              ? 'border-cyan-400/60 text-cyan-300 bg-cyan-500/15'
              : 'border-white/15 text-white/30 hover:border-cyan-400/35 hover:text-white/55'}`}>
          {active
            ? <><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block mr-0.5" />ON</>
            : <>○ OFF</>}
        </button>

        <span className="text-[7.5px] font-mono uppercase tracking-widest text-white/35">Studio Seq</span>
        <span className="text-[6px] font-mono text-white/18">{bpm} BPM · {stepCount} steps · 4/4</span>

        <div className="flex-1"/>

        {/* Step count */}
        <div className="flex items-center gap-0.5">
          <span className="text-[5.5px] font-mono text-white/18 uppercase mr-1">Steps</span>
          {([8,16] as const).map(n => (
            <button key={n} onClick={() => onSetStepCount(n)}
              className={`text-[6px] font-mono px-2 py-0.5 rounded border transition-all
                ${stepCount === n ? 'border-cyan-400/45 text-cyan-300 bg-cyan-500/10' : 'border-white/10 text-white/20 hover:text-white/45'}`}>
              {n}
            </button>
          ))}
        </div>

        {/* Patterns */}
        <div className="relative">
          <button onClick={() => setShowPatterns(v => !v)}
            className="text-[6px] font-mono px-2 py-0.5 rounded border border-white/10 text-white/25 hover:text-white/55 hover:border-white/25 transition-all">
            Padrões ▾
          </button>
          {showPatterns && (
            <div className="absolute bottom-full right-0 mb-1 z-50 w-52 rounded-lg border border-white/10 bg-black/95 backdrop-blur-md py-1 shadow-2xl">
              {STUDIO_PATTERNS.map(pat => (
                <button key={pat.name}
                  onClick={() => { onLoadPattern(pat); setShowPatterns(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/5 transition-all group">
                  <div className="text-[7px] font-mono text-white/70 group-hover:text-white/90">{pat.name}</div>
                  <div className="text-[5.5px] font-mono text-white/25">{pat.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={onClearAll}
          className="text-[6px] font-mono px-2 py-0.5 rounded border border-red-900/35 text-red-900/60 hover:text-red-400/70 hover:border-red-500/40 transition-all">
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
                {/* Mute */}
                <button onClick={() => onToggleMute(ri)}
                  title="Mute"
                  className="w-[18px] h-[18px] rounded text-[5px] font-mono flex items-center justify-center border transition-all"
                  style={{
                    borderColor: row.muted ? 'rgba(255,255,255,0.08)' : color + '50',
                    color:       row.muted ? 'rgba(255,255,255,0.18)' : color + 'cc',
                    background:  row.muted ? 'transparent' : color + '12',
                  }}>M</button>
                {/* Solo */}
                <button onClick={() => onToggleSolo(ri)}
                  title="Solo"
                  className="w-[18px] h-[18px] rounded text-[5px] font-mono flex items-center justify-center border transition-all"
                  style={{
                    borderColor: row.solo ? '#ffd70099' : 'rgba(255,255,255,0.06)',
                    color:       row.solo ? '#ffd700'   : 'rgba(255,255,255,0.18)',
                    background:  row.solo ? '#ffd70012' : 'transparent',
                  }}>S</button>
                {/* Role label */}
                <span className="flex-1 text-center text-[7px] font-mono uppercase tracking-widest transition-colors"
                  style={{ color: dimmed ? 'rgba(255,255,255,0.15)' : color }}>
                  {row.role.slice(0, 3)}
                </span>
                {/* Clear row */}
                <button onClick={() => onClearRow(ri)}
                  className="text-[7px] text-white/12 hover:text-red-400/50 transition-colors" title="Limpar linha">✕</button>
              </div>

              {/* Steps */}
              <div className="flex gap-px flex-1">
                {Array.from({ length: stepCount }).map((_, si) => {
                  const step      = row.steps[si] ?? { on: false, vel: 0.8 };
                  const isOn      = step.on;
                  const isCur     = active && si === cursor;
                  const isBeat    = si % 4 === 0;   // quarter note
                  const isHalf    = si === 0 || si === 8;  // half note

                  return (
                    <button key={si} onClick={() => onToggleStep(ri, si)}
                      className={`relative flex-1 rounded-sm transition-all ${isCur ? 'ring-1 ring-white/80' : ''}`}
                      style={{
                        height: 22,
                        background: isOn
                          ? isCur ? color : dimmed ? color + '30' : color + '70'
                          : isBeat
                            ? 'rgba(255,255,255,0.055)'
                            : 'rgba(255,255,255,0.025)',
                        borderBottom: isOn
                          ? `2px solid ${dimmed ? color + '44' : color}`
                          : isHalf
                            ? '1px solid rgba(255,255,255,0.10)'
                            : isBeat
                              ? '1px solid rgba(255,255,255,0.06)'
                              : '1px solid rgba(255,255,255,0.025)',
                        boxShadow: isCur && isOn ? `0 0 8px ${color}88` : isOn && !dimmed ? `0 0 2px ${color}40` : 'none',
                        opacity: dimmed && !isCur ? 0.45 : 1,
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
                <span className="text-[5px] font-mono text-white/18">{si / 4 + 1}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
