// ─── Meta-Arte: Interaction Matrix Panel ─────────────────────────────────────
// 6×6 grid controlling Particle Life inter-species attraction/repulsion.
// Row = emitting species, Column = target species.
// Values −1 (strong repulsion) → 0 (neutral) → +1 (strong attraction).
import React, { useRef, useCallback } from 'react';

// ── Species metadata ──────────────────────────────────────────────────────────
const SPECIES_NAMES  = ['L',  'Sh', 'Fl', 'Ex', 'Mg', 'Gl'];
const SPECIES_LABELS = ['luminous', 'shadowed', 'flowing', 'expander', 'magnetic', 'glitch'];
const SPECIES_COLORS = ['#ffd060', '#7090d0', '#40c8ff', '#c060ff', '#ff7040', '#40ff90'];

// Preset click cycle values
const CYCLE_PRESETS = [-0.8, -0.5, -0.2, 0, 0.2, 0.5, 0.8];

// ── Color mapping for a matrix cell value ─────────────────────────────────────
function cellBg(val: number): string {
  const v = Math.max(-1, Math.min(1, val));
  if (v > 0.02) {
    const t = v;
    return `rgba(${Math.round(20 + t * 12)},${Math.round(155 + t * 90)},${Math.round(50 + t * 15)},${(0.28 + t * 0.55).toFixed(2)})`;
  } else if (v < -0.02) {
    const t = -v;
    return `rgba(${Math.round(160 + t * 85)},${Math.round(20 + t * 10)},${Math.round(20 + t * 8)},${(0.28 + t * 0.58).toFixed(2)})`;
  }
  return 'rgba(50,50,60,0.4)';
}

function cellTextColor(val: number): string {
  const a = 0.4 + Math.abs(Math.max(-1, Math.min(1, val))) * 0.5;
  return `rgba(255,255,255,${a.toFixed(2)})`;
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface MatrixPanelProps {
  matrix: number[];                // flat 6×6 array (length 36)
  onCellChange: (i: number, j: number, val: number) => void;
  onRandomize:  () => void;
  onSymmetrize: () => void;
  onReset:      () => void;
  onPreset:     (type: 'chaos' | 'harmony' | 'predator' | 'bubbles') => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function MatrixPanel({
  matrix, onCellChange, onRandomize, onSymmetrize, onReset, onPreset,
}: MatrixPanelProps) {
  // Drag state: stores the initial pointer position and starting cell value
  const dragRef = useRef<{
    i: number; j: number;
    startY: number; startVal: number;
    moved: boolean;
  } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, i: number, j: number) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      i, j,
      startY: e.clientY,
      startVal: matrix[i * 6 + j] ?? 0,
      moved: false,
    };
    e.preventDefault();
  }, [matrix]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dy = dragRef.current.startY - e.clientY; // up = positive = increase
    if (Math.abs(dy) > 3) dragRef.current.moved = true;
    const newVal = Math.max(-1, Math.min(1, dragRef.current.startVal + dy * 0.013));
    onCellChange(dragRef.current.i, dragRef.current.j, newVal);
  }, [onCellChange]);

  const handlePointerUp = useCallback((_e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current && !dragRef.current.moved) {
      // Short click → cycle through preset values
      const { i, j } = dragRef.current;
      const cur = matrix[i * 6 + j] ?? 0;
      const nearestIdx = CYCLE_PRESETS.reduce((best, v, idx) =>
        Math.abs(v - cur) < Math.abs(CYCLE_PRESETS[best] - cur) ? idx : best, 0);
      const nextIdx = (nearestIdx + 1) % CYCLE_PRESETS.length;
      onCellChange(i, j, CYCLE_PRESETS[nextIdx]);
    }
    dragRef.current = null;
  }, [matrix, onCellChange]);

  // ── Styles ────────────────────────────────────────────────────────────────
  const MONO = "'IBM Plex Mono', monospace";
  const ACCENT = '#ff0084';
  const DIM = 'rgba(255,255,255,0.28)';
  const BORDER = 'rgba(255,255,255,0.06)';

  const sty: React.CSSProperties = {
    padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
    fontFamily: MONO, color: 'rgba(255,255,255,0.75)',
    overflowY: 'auto', background: '#000',
  };
  const labelSty: React.CSSProperties = {
    fontSize: 7, color: DIM, letterSpacing: '0.12em',
    textTransform: 'uppercase', fontFamily: MONO,
  };
  const actionBtnSty: React.CSSProperties = {
    flex: 1, padding: '4px 0', borderRadius: 1, cursor: 'pointer', fontSize: 7,
    fontFamily: MONO, letterSpacing: '0.1em',
    background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`,
    color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
  };

  return (
    <div style={sty}>
      {/* Header */}
      <div style={{
        fontSize: 8, color: ACCENT,
        letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 400,
        fontFamily: MONO,
      }}>
        INTERACTION MATRIX
      </div>

      {/* Hint */}
      <div style={{ fontSize: 7, color: DIM, lineHeight: 1.6, fontFamily: MONO }}>
        Linha → emissora · Coluna → alvo<br />
        <span style={{ color: 'rgba(80,200,80,0.55)' }}>verde = atração</span>
        {' · '}
        <span style={{ color: 'rgba(220,80,80,0.55)' }}>vermelho = repulsão</span><br />
        Click = cicla · Drag ↕ = contínuo
      </div>

      {/* ── Matrix grid ─────────────────────────────────────────────────── */}
      <div>
        {/* Column headers */}
        <div style={{ display: 'flex', marginLeft: 22, marginBottom: 2 }}>
          {SPECIES_NAMES.map((name, j) => (
            <div key={j} style={{
              flex: 1, textAlign: 'center', fontSize: 7, fontFamily: 'monospace',
              color: SPECIES_COLORS[j], letterSpacing: '0.04em',
            }}>
              {name}
            </div>
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
            {/* Row label */}
            <div style={{
              width: 20, flexShrink: 0, fontSize: 7, fontFamily: 'monospace',
              color: SPECIES_COLORS[i], textAlign: 'right', paddingRight: 2,
              letterSpacing: '0.04em',
            }}>
              {SPECIES_NAMES[i]}
            </div>

            {/* Cells */}
            {Array.from({ length: 6 }, (_, j) => {
              const val = matrix[i * 6 + j] ?? 0;
              return (
                <div
                  key={j}
                  style={{
                    flex: 1, height: 25, marginLeft: 1,
                    background: cellBg(val),
                    borderRadius: 2,
                    border: `1px solid rgba(255,255,255,${i === j ? 0.28 : 0.06})`,
                    cursor: 'ns-resize',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    userSelect: 'none', WebkitUserSelect: 'none',
                    fontSize: 6, fontFamily: 'monospace',
                    color: cellTextColor(val),
                    outline: i === j ? '1px solid rgba(255,255,255,0.18)' : 'none',
                    outlineOffset: '-2px',
                  }}
                  onPointerDown={e => handlePointerDown(e, i, j)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  title={`${SPECIES_LABELS[i]} → ${SPECIES_LABELS[j]}: ${val.toFixed(3)}`}
                >
                  {val.toFixed(1)}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <div style={{ width: 10, height: 6, borderRadius: 1, background: 'rgba(200,40,40,0.65)' }} />
          <span style={{ ...labelSty, color: 'rgba(220,100,100,0.5)' }}>repuls.</span>
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <div style={{ width: 10, height: 6, borderRadius: 1, background: 'rgba(50,60,55,0.8)' }} />
          <span style={{ ...labelSty, color: 'rgba(150,150,150,0.4)' }}>neutro</span>
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <div style={{ width: 10, height: 6, borderRadius: 1, background: 'rgba(20,190,70,0.65)' }} />
          <span style={{ ...labelSty, color: 'rgba(100,220,120,0.5)' }}>atração</span>
        </div>
      </div>

      {/* Utility buttons */}
      <div>
        <div style={{ ...labelSty, marginBottom: 5 }}>Utilitários</div>
        <div style={{ display: 'flex', gap: 3 }}>
          <button onClick={onRandomize}  style={actionBtnSty} title="Gerar nova matriz aleatória">Rand</button>
          <button onClick={onSymmetrize} style={actionBtnSty} title="Tornar a matriz simétrica (média A↔B)">Sim</button>
          <button
            onClick={onReset}
            style={{ ...actionBtnSty, color: 'rgba(180,160,255,0.65)' }}
            title="Restaurar matriz calculada a partir do DNA atual"
          >DNA</button>
        </div>
      </div>

      {/* Dynamic presets */}
      <div>
        <div style={{ ...labelSty, marginBottom: 5 }}>Dinâmicas Pré-Definidas</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {([
            { id: 'chaos',    icon: '⊗', label: 'Caos',     desc: 'repulsão entre todas as espécies' },
            { id: 'harmony',  icon: '◎', label: 'Harmonia', desc: 'atração global · grande mistura' },
            { id: 'predator', icon: '→', label: 'Predador', desc: 'cadeia assimétrica 0→1→2→… →0' },
            { id: 'bubbles',  icon: '○', label: 'Bolhas',   desc: 'self+ · cross− · agrupa por espécie' },
          ] as const).map(({ id, icon, label, desc }) => (
            <button
              key={id}
              onClick={() => onPreset(id)}
              style={{
                textAlign: 'left', padding: '5px 8px', borderRadius: 4, cursor: 'pointer',
                background: 'rgba(80,100,160,0.07)',
                border: '1px solid rgba(100,120,200,0.15)',
                color: 'rgba(200,210,255,0.75)',
                fontSize: 8, width: '100%',
              }}
            >
              <span style={{ marginRight: 5, opacity: 0.6 }}>{icon}</span>
              <span style={{ fontWeight: 600 }}>{label}</span>
              <span style={{ marginLeft: 5, color: 'rgba(255,255,255,0.3)', fontSize: 7 }}>— {desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Species reference */}
      <div>
        <div style={{ ...labelSty, marginBottom: 5 }}>Espécies</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {SPECIES_NAMES.map((name, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: SPECIES_COLORS[i],
              }} />
              <span style={{ fontSize: 7, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)' }}>
                {name} — {SPECIES_LABELS[i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}