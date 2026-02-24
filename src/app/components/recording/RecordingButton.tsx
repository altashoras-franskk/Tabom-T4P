// ── RecordingButton — floating start/stop control ────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import {
  RecorderState, fmtTime, RecordFormat, RecordQuality,
  RecordingOptions, RECORD_FORMAT_LABELS, RECORD_QUALITY_LABELS,
  isFormatSupported,
} from './canvasRecorder';

interface Props {
  state:       RecorderState;
  elapsed:     number;
  /** onStart now receives the chosen options (format + quality).
   *  For backward-compat, the callback may be defined as `() => void`
   *  — extra arguments are silently ignored in JS. */
  onStart:     (opts?: RecordingOptions) => void;
  onStop:      () => void;
  className?:  string;
  /** When true, renders format/quality dropdowns inline (default false) */
  showOptions?: boolean;
}

export const RecordingButton: React.FC<Props> = ({
  state, elapsed, onStart, onStop, className = '', showOptions = false,
}) => {
  const [format,  setFormat]  = useState<RecordFormat>('auto');
  const [quality, setQuality] = useState<RecordQuality>('standard');
  const [optOpen, setOptOpen] = useState(false);

  // Force re-render every second while recording to update the timer
  const [, tick] = useState(0);
  useEffect(() => {
    if (state !== 'recording') return;
    const id = setInterval(() => tick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  const mp4Supported = isFormatSupported('mp4');

  const sty: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
  };

  // ── Saving state ──────────────────────────────────────────────────────────
  if (state === 'saving') {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
        bg-black/60 border border-yellow-400/20 backdrop-blur-sm ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/70 animate-pulse" />
        <span className="text-[8px] font-mono text-yellow-300/60 uppercase tracking-widest">
          salvando…
        </span>
      </div>
    );
  }

  // ── Recording state ───────────────────────────────────────────────────────
  if (state === 'recording') {
    return (
      <button
        onClick={onStop}
        title="Parar gravação"
        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
          bg-red-950/70 border border-red-500/50 text-red-400
          hover:bg-red-900/80 hover:border-red-400/70 transition-all
          backdrop-blur-sm ${className}`}
      >
        <span className="w-2 h-2 rounded-sm bg-red-500 group-hover:bg-red-400 animate-pulse flex-shrink-0" />
        <span className="text-[9px] font-mono tabular-nums">{fmtTime(elapsed)}</span>
        <span className="text-[7px] font-mono text-red-400/50 tracking-widest uppercase ml-0.5">parar</span>
      </button>
    );
  }

  // ── Idle state ────────────────────────────────────────────────────────────
  return (
    <div className={`relative flex flex-col gap-1 ${className}`}>
      {/* Options dropdown */}
      {showOptions && optOpen && (
        <div className="absolute bottom-full mb-1 right-0 z-50
          bg-black/90 border border-white/10 rounded-lg p-2 min-w-[160px]
          backdrop-blur-sm shadow-xl"
        >
          {/* Format */}
          <div className="mb-2">
            <div className="text-[7px] font-mono text-white/30 uppercase tracking-widest mb-1">Formato</div>
            {(['auto', 'webm', 'mp4', 'mov'] as RecordFormat[]).map(f => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`w-full text-left px-2 py-0.5 rounded text-[9px] font-mono transition-colors mb-0.5 flex items-center justify-between ${
                  format === f
                    ? 'bg-white/10 text-white/80'
                    : 'text-white/35 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                <span>{RECORD_FORMAT_LABELS[f]}</span>
                {(f === 'mp4' || f === 'mov') && !mp4Supported && (
                  <span className="text-[7px] text-yellow-500/60">→WebM</span>
                )}
              </button>
            ))}
          </div>

          {/* Quality */}
          <div>
            <div className="text-[7px] font-mono text-white/30 uppercase tracking-widest mb-1">Qualidade</div>
            {(['draft', 'standard', 'high', 'ultra'] as RecordQuality[]).map(q => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={`w-full text-left px-2 py-0.5 rounded text-[9px] font-mono transition-colors mb-0.5 ${
                  quality === q
                    ? 'bg-white/10 text-white/80'
                    : 'text-white/35 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                {RECORD_QUALITY_LABELS[q]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main row */}
      <div style={sty}>
        {/* Options toggle (only when showOptions=true) */}
        {showOptions && (
          <button
            onClick={() => setOptOpen(v => !v)}
            title="Opções de gravação"
            className={`flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-[7px] font-mono uppercase tracking-widest
              transition-all backdrop-blur-sm ${
              optOpen
                ? 'bg-white/10 border border-white/20 text-white/70'
                : 'bg-black/50 border border-white/8 text-white/25 hover:text-white/50 hover:bg-black/70'
            }`}
          >
            ⚙
          </button>
        )}

        {/* Record button */}
        <button
          onClick={() => onStart({ format, quality })}
          title="Iniciar gravação do canvas"
          className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
            bg-black/50 border border-white/10 text-white/35
            hover:bg-black/70 hover:border-purple-400/30 hover:text-white/65
            transition-all backdrop-blur-sm`}
        >
          <span className="w-2 h-2 rounded-full border border-current
            group-hover:border-red-400/70 group-hover:bg-red-500/20
            transition-colors flex-shrink-0" />
          <span className="text-[8px] font-mono uppercase tracking-widest">gravar</span>
          {showOptions && (
            <span className="text-[7px] font-mono text-white/20 ml-0.5">
              {RECORD_FORMAT_LABELS[format]} · {quality}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
