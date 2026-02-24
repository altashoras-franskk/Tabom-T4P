import React, { useState } from 'react';
import { Activity, Minimize2, Maximize2, X } from 'lucide-react';
import { PerformanceStats } from './PerformanceStats';

interface StatsWindowProps {
  fps: number;
  particleCount: number;
  fieldCellCount: number;
  artifactCount: number;
  speciesCount: number;
  avgTension: number;
  avgCohesion: number;
  avgScarcity: number;
  diversity: number;
  onClose?: () => void;
}

export const StatsWindow: React.FC<StatsWindowProps> = (props) => {
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    
    setDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  React.useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  if (minimized) {
    return (
      <div
        className="fixed z-20 pointer-events-auto"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        <div
          className="bg-black/5 backdrop-blur-sm rounded border border-white/[0.02] cursor-move"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <Activity size={12} className="text-white/70" strokeWidth={1.5} />
            <span className="text-white/80 text-[10px] font-mono uppercase tracking-wider">
              Stats
            </span>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => setMinimized(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Expandir"
              >
                <Maximize2 size={11} className="text-white/70" strokeWidth={1.5} />
              </button>
              {props.onClose && (
                <button
                  onClick={props.onClose}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Fechar"
                >
                  <X size={11} className="text-white/70" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed z-20 pointer-events-auto w-72"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className="bg-black/5 backdrop-blur-sm rounded border border-white/[0.02] flex flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-white/[0.02] cursor-move"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-white/70" strokeWidth={1.5} />
            <span className="text-white/80 text-[10px] font-mono uppercase tracking-wider">
              Estatísticas
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(true)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Minimizar"
            >
              <Minimize2 size={11} className="text-white/70" strokeWidth={1.5} />
            </button>
            {props.onClose && (
              <button
                onClick={props.onClose}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Fechar"
              >
                <X size={11} className="text-white/70" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto max-h-[60vh] p-3">
          <PerformanceStats
            fps={props.fps}
            particleCount={props.particleCount}
            fieldCellCount={props.fieldCellCount}
            artifactCount={props.artifactCount}
            speciesCount={props.speciesCount}
            avgTension={props.avgTension}
            avgCohesion={props.avgCohesion}
            avgScarcity={props.avgScarcity}
            diversity={props.diversity}
          />
        </div>
      </div>
    </div>
  );
};
