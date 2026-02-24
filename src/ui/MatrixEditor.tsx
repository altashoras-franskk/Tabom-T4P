import React, { useState } from 'react';
import { InteractionMatrix } from '../sim/micro/matrix';

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

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['attract', 'radius', 'falloff'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              mode === m ? 'bg-white/20 text-white' : 'text-white/50 hover:bg-white/10'
            }`}
          >
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
                  className="aspect-square rounded cursor-pointer border border-white/10 hover:border-white/30 transition-all"
                  style={{ backgroundColor: getCellColor(value) }}
                  onMouseDown={() => setIsDragging(true)}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseEnter={(e) => {
                    if (isDragging) {
                      handleCellChange(i, j, e.shiftKey ? -0.1 : 0.1);
                    }
                  }}
                  onClick={(e) => {
                    handleCellChange(i, j, e.shiftKey ? -0.1 : 0.1);
                  }}
                  title={`${i} → ${j}: ${value.toFixed(2)}`}
                />
              );
            })
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onRandomize}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-xs transition-colors"
        >
          Randomize
        </button>
        <button
          onClick={onSoften}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-xs transition-colors"
        >
          Soften
        </button>
        <button
          onClick={onSymmetrize}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-xs transition-colors"
        >
          Symmetrize
        </button>
        <button
          onClick={onInvert}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-xs transition-colors"
        >
          Invert
        </button>
        <button
          onClick={onNormalize}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-xs transition-colors col-span-2"
        >
          Normalize
        </button>
      </div>
    </div>
  );
};
