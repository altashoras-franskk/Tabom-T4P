// Codex UI - Organism catalog and grimoire with capture controls
import React, { useState } from 'react';
import { Organism } from '../sim/codex/organism';

interface CodexProps {
  organisms: Organism[];
  onSpawnOrganism: (organismId: string) => void;
  onDeleteOrganism: (organismId: string) => void;
  onRenameOrganism: (organismId: string, newName: string) => void;
  // Capture mode controls
  captureMode: boolean;
  onCaptureModeChange: (enabled: boolean) => void;
  brushRadius: number;
  onBrushRadiusChange: (value: number) => void;
}

export const Codex: React.FC<CodexProps> = ({
  organisms,
  onSpawnOrganism,
  onDeleteOrganism,
  onRenameOrganism,
  captureMode,
  onCaptureModeChange,
  brushRadius,
  onBrushRadiusChange,
}) => {
  const [selectedOrganism, setSelectedOrganism] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');

  const handleRename = (id: string) => {
    if (nameInput.trim()) {
      onRenameOrganism(id, nameInput.trim());
    }
    setEditingName(null);
    setNameInput('');
  };

  return (
    <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white/80 text-[11px] tracking-[0.15em] uppercase font-light">
          Codex
        </h2>
        <div className="text-white/40 text-[9px] font-mono">
          {organisms.length} organisms
        </div>
      </div>

      {/* Capture Controls */}
      <div className="border border-white/[0.02] rounded p-3 space-y-3 bg-black/5">
        <div className="flex items-center justify-between">
          <span className="text-white/60 text-[10px] uppercase tracking-wide font-light">
            Capture Mode
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={captureMode}
              onChange={(e) => onCaptureModeChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:border-white/20 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500/30 peer-checked:after:bg-yellow-400"></div>
          </label>
        </div>

        {captureMode && (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-white/50 text-[9px] uppercase tracking-wide font-light">
                  Brush Radius
                </label>
                <span className="text-white/40 text-[9px] font-mono">
                  {brushRadius}px
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={200}
                step={5}
                value={brushRadius}
                onChange={(e) => onBrushRadiusChange(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>

            <div className="text-white/40 text-[9px] leading-relaxed bg-yellow-500/5 border border-yellow-500/10 rounded p-2">
              <div className="flex items-start gap-1.5">
                <span className="text-yellow-400/80">⚡</span>
                <div>
                  <div className="font-medium text-yellow-400/90 mb-0.5">Capture Instructions:</div>
                  <div>• Click on canvas to capture organism</div>
                  <div>• Adjust brush radius to control area</div>
                  <div>• Captured organisms appear below</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Organisms Grid */}
      {organisms.length === 0 ? (
        <div className="text-white/30 text-[10px] text-center py-8 space-y-2 border border-white/[0.06] rounded">
          <p>No organisms captured yet</p>
          <p className="text-white/20 text-[9px]">
            Enable capture mode and click on canvas
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {organisms.map((organism) => (
            <div
              key={organism.id}
              className={`
                relative border rounded p-2 cursor-pointer transition-all
                ${selectedOrganism === organism.id
                  ? 'border-white/30 bg-white/[0.04]'
                  : 'border-white/10 hover:border-white/20'
                }
              `}
              onClick={() => setSelectedOrganism(organism.id)}
            >
              {/* Thumbnail */}
              <div className="flex justify-center mb-2 bg-black/10 rounded overflow-hidden">
                {organism.thumbnail ? (
                  <img
                    src={organism.thumbnail}
                    alt={organism.name}
                    className="w-full h-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center text-white/20 text-[8px]">
                    No preview
                  </div>
                )}
              </div>

              {/* Name */}
              {editingName === organism.id ? (
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={() => handleRename(organism.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(organism.id);
                    if (e.key === 'Escape') {
                      setEditingName(null);
                      setNameInput('');
                    }
                  }}
                  className="w-full bg-white/5 border border-white/20 rounded px-1 py-0.5 text-white text-[9px] font-mono focus:outline-none focus:border-white/40"
                  autoFocus
                />
              ) : (
                <div
                  className="text-white/70 text-[9px] font-mono text-center truncate mb-1"
                  onDoubleClick={() => {
                    setEditingName(organism.id);
                    setNameInput(organism.name);
                  }}
                >
                  {organism.name}
                </div>
              )}

              {/* Stats */}
              <div className="text-white/40 text-[8px] text-center mb-2">
                {organism.particles.length} particles
              </div>

              {/* Actions */}
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSpawnOrganism(organism.id);
                  }}
                  className="flex-1 border border-white/10 hover:border-white/30 text-white/60 hover:text-white text-[8px] uppercase py-1 rounded transition-all"
                >
                  Summon
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete ${organism.name}?`)) {
                      onDeleteOrganism(organism.id);
                      if (selectedOrganism === organism.id) {
                        setSelectedOrganism(null);
                      }
                    }
                  }}
                  className="border border-red-500/20 hover:border-red-500/40 text-red-400/60 hover:text-red-400 text-[8px] uppercase px-2 py-1 rounded transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected organism details */}
      {selectedOrganism && organisms.find(o => o.id === selectedOrganism) && (
        <div className="border-t border-white/[0.06] pt-3 mt-3">
          {(() => {
            const org = organisms.find(o => o.id === selectedOrganism)!;
            return (
              <div className="space-y-2 text-[9px] text-white/50 font-mono">
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span>{org.width.toFixed(2)} × {org.height.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Captured:</span>
                  <span>{new Date(org.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Types:</span>
                  <span>{org.captureContext.typesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Seed:</span>
                  <span>#{org.captureContext.seed.toString(16).slice(0, 6)}</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
