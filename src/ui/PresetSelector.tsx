// Preset Selector Component
import React, { useState } from 'react';
import { Palette, Sparkles } from 'lucide-react';
import { CREATIVE_PRESETS, CreativePreset } from '../sim/presets/creativePalette';

interface PresetSelectorProps {
  onSelectPreset: (preset: CreativePreset) => void;
  currentSeed: number;
  onSeedChange: (seed: number) => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({ 
  onSelectPreset, 
  currentSeed,
  onSeedChange 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'art', name: 'Abstract Art', ids: ['pollock', 'kandinsky', 'mondrian', 'miro'] },
    { id: 'bio', name: 'Biological', ids: ['mitosis', 'predator_prey', 'symbiosis', 'parasitism'] },
    { id: 'cosmic', name: 'Cosmic', ids: ['nebula', 'supernova', 'black_hole', 'galaxy'] },
    { id: 'social', name: 'Social', ids: ['revolution', 'harmony', 'market', 'tribe'] },
    { id: 'exp', name: 'Experimental', ids: ['quantum', 'fractal', 'neural', 'emergence'] },
  ];

  const filteredPresets = selectedCategory === 'all' 
    ? CREATIVE_PRESETS
    : CREATIVE_PRESETS.filter(p => {
        const cat = categories.find(c => c.id === selectedCategory);
        return cat && 'ids' in cat ? cat.ids.includes(p.id) : false;
      });

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between" data-guide="presets-panel">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded border border-white/20 transition-colors"
        >
          <Palette className="w-4 h-4" />
          <span className="text-sm font-medium">Creative Presets</span>
          <span className="text-xs text-white/50">({CREATIVE_PRESETS.length})</span>
        </button>

        {/* Seed Input */}
        <div className="flex items-center gap-2" data-guide="seed-button">
          <button
            onClick={() => {
              onSeedChange(Date.now());
            }}
            className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs transition-colors"
            title="New Universe"
            data-guide="new-universe"
          >
            New
          </button>
          <Sparkles className="w-4 h-4 text-white/50" />
          <label className="text-xs text-white/70">Seed:</label>
          <input
            type="number"
            value={currentSeed}
            onChange={(e) => onSeedChange(parseInt(e.target.value) || 1000)}
            className="w-20 px-2 py-1 bg-black/10 border border-white/10 rounded text-xs font-mono"
            min="1"
            max="99999"
          />
        </div>
      </div>

      {/* Expanded Preset Grid */}
      {expanded && (
        <div className="bg-black/5 border border-white/10 rounded p-3">
          {/* Category Filter */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedCategory === cat.id 
                    ? 'bg-cyan-500/30 border border-cyan-400/50' 
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Preset Grid */}
          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
            {filteredPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => {
                  onSelectPreset(preset);
                  setExpanded(false);
                }}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-cyan-400/50 rounded text-left transition-all group"
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-sm font-semibold text-cyan-300 group-hover:text-cyan-200">
                    {preset.name}
                  </h3>
                  <span className="text-xs text-white/40 font-mono">#{preset.seed}</span>
                </div>
                <p className="text-xs text-white/60 mb-2 line-clamp-2">
                  {preset.description}
                </p>
                <div className="flex gap-2 text-xs text-white/50">
                  <span>N={preset.particleCount}</span>
                  <span>S={preset.typesCount}</span>
                  {preset.micro.energyEnabled && <span className="text-green-400">⚡</span>}
                  {preset.micro.foodEnabled && <span className="text-yellow-400">🍃</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
