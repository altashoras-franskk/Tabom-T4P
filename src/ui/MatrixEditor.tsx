import React, { useState } from 'react';
import { InteractionMatrix } from '../sim/micro/matrix';

const MONO = "'IBM Plex Mono', monospace";

interface MatrixEditorProps {
  matrix: InteractionMatrix;
  typesCount: number;
  onMatrixChange: (matrix: InteractionMatrix) => void;
  onRandomize: () => void;
  onSoften: () => void;
  onSymmetrize: () => void;
  onInvert: () => void;
  onNormalize: () => void;
}

export const MatrixEditor: React.FC<MatrixEditorProps> = ({
  matrix,
  typesCount,
  onMatrixChange,
  onRandomize,
  onSoften,
  onSymmetrize,
  onInvert,
  onNormalize,
}) => {
  const [mode, setMode] = useState<'attract' | 'radius' | 'falloff'>('attract');
  const [isDragging, setIsDragging] = useState(false);

  const handleCellChange = (i: number, j: number, delta: number) => {
    const newMatrix = { ...matrix };
    
    if (mode === 'attract') {
      newMatrix.attract[i][j] = Math.max(-1, Math.min(1, matrix.attract[i][j] + delta));
    } else if (mode === 'radius') {
      newMatrix.radius[i][j] = Math.max(0, Math.min(0.3, matrix.radius[i][j] + delta * 0.01));
    } else if (mode === 'falloff') {
      newMatrix.falloff[i][j] = Math.max(0.5, Math.min(3, matrix.falloff[i][j] + delta * 0.1));
    }
    
    onMatrixChange(newMatrix);
  };

  const getCellValue = (i: number, j: number): number => {
    if (mode === 'attract') return matrix.attract[i][j];
    if (mode === 'radius') return matrix.radius[i][j];
    return matrix.falloff[i][j];
  };

  const getCellColor = (value: number): string => {
    if (mode === 'attract') {
      if (value > 0) {
        const intensity = Math.floor(value * 255);
        return `rgb(${intensity}, 255, ${intensity})`;
      } else {
        const intensity = Math.floor(-value * 255);
        return `rgb(255, ${intensity}, ${intensity})`;
      }
    }
    const intensity = Math.floor((value / 3) * 255);
    return `rgb(${intensity}, ${intensity}, 255)`;
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: MONO,
    fontSize: 9,
    padding: '3px 10px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: active ? '1px dashed rgba(255,212,0,0.25)' : '1px dashed rgba(255,255,255,0.06)',
    color: active ? '#ffd400' : 'rgba(255,255,255,0.40)',
    background: active ? 'rgba(255,212,0,0.04)' : 'transparent',
  });

  const actionBtnStyle: React.CSSProperties = {
    fontFamily: MONO,
    fontSize: 9,
    padding: '6px 10px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: '1px dashed rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.40)',
    background: 'transparent',
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['attract', 'radius', 'falloff'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} style={btnStyle(mode === m)}>
            {m}
          </button>
        ))}
      </div>

      <div className="overflow-auto max-h-96">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${typesCount}, 1fr)` }}
          onMouseLeave={() => setIsDragging(false)}
        >
          {Array.from({ length: typesCount }).map((_, i) =>
            Array.from({ length: typesCount }).map((_, j) => {
              const value = getCellValue(i, j);
              return (
                <div
                  key={`${i}-${j}`}
                  className="aspect-square cursor-pointer transition-all"
                  style={{ backgroundColor: getCellColor(value), border: '1px dashed rgba(255,255,255,0.08)' }}
                  onMouseDown={() => setIsDragging(true)}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseEnter={(e) => {
                    if (isDragging) handleCellChange(i, j, e.shiftKey ? -0.1 : 0.1);
                  }}
                  onClick={(e) => handleCellChange(i, j, e.shiftKey ? -0.1 : 0.1)}
                  title={`${i} → ${j}: ${value.toFixed(2)}`}
                />
              );
            })
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onRandomize} style={actionBtnStyle}>Randomize</button>
        <button onClick={onSoften} style={actionBtnStyle}>Soften</button>
        <button onClick={onSymmetrize} style={actionBtnStyle}>Symmetrize</button>
        <button onClick={onInvert} style={actionBtnStyle}>Invert</button>
        <button onClick={onNormalize} style={{ ...actionBtnStyle, gridColumn: 'span 2' }}>Normalize</button>
      </div>
    </div>
  );
};
