import React, { useState } from 'react';
import { CREATIVE_PRESETS, CreativePreset } from '../sim/presets/creativePalette';
import { X } from 'lucide-react';

interface PresetLauncherProps {
  onSelectPreset: (preset: CreativePreset) => void;
  onSkip?: () => void;
}

const CATEGORIES = [
  { id: 'abstract', name: 'Abstrato' },
  { id: 'biological', name: 'Biológico' },
  { id: 'cosmic', name: 'Cósmico' },
  { id: 'social', name: 'Social' },
  { id: 'physics', name: 'Física' },
  { id: 'emergence', name: 'Emergência' },
  { id: 'nature', name: 'Natureza' },
  { id: 'music', name: 'Música' },
];

const CATEGORY_MAPPING: Record<string, string> = {
  // Abstract Art Series (8)
  'pollock': 'abstract',
  'kandinsky': 'abstract',
  'mondrian': 'abstract',
  'miro': 'abstract',
  'rothko': 'abstract',
  'klee': 'abstract',
  'malevich': 'abstract',
  'dekooning': 'abstract',
  
  // Biological Series (10)
  'mitosis': 'biological',
  'predator_prey': 'biological',
  'symbiosis': 'biological',
  'parasitism': 'biological',
  'coral_reef': 'biological',
  'mycelium': 'biological',
  'slime_mold': 'biological',
  'bacteria': 'biological',
  'virus': 'biological',
  'immune': 'biological',
  
  // Cosmic Series (8)
  'nebula': 'cosmic',
  'supernova': 'cosmic',
  'black_hole': 'cosmic',
  'galaxy': 'cosmic',
  'pulsar': 'cosmic',
  'quasar': 'cosmic',
  'asteroid': 'cosmic',
  'comet': 'cosmic',
  
  // Social Dynamics (6)
  'revolution': 'social',
  'harmony': 'social',
  'market': 'social',
  'tribe': 'social',
  'propaganda': 'social',
  'migration': 'social',
  
  // Physics Phenomena (8)
  'quantum': 'physics',
  'plasma': 'physics',
  'superconductor': 'physics',
  'ferrofluid': 'physics',
  'crystal': 'physics',
  'turbulence': 'physics',
  'bose_einstein': 'physics',
  'sonoluminescence': 'physics',
  
  // Emergence & Complexity (10)
  'fractal': 'emergence',
  'neural': 'emergence',
  'emergence': 'emergence',
  'swarm': 'emergence',
  'autopilot': 'emergence',
  'cascade': 'emergence',
  'attractor': 'emergence',
  'percolation': 'emergence',
  'resonance': 'emergence',
  'bifurcation': 'emergence',
  
  // Nature & Elements (10)
  'aurora': 'nature',
  'volcano': 'nature',
  'tornado': 'nature',
  'tsunami': 'nature',
  'lightning': 'nature',
  'earthquake': 'nature',
  'sandstorm': 'nature',
  'avalanche': 'nature',
  'geyser': 'nature',
  'wildfire': 'nature',
  
  // Music & Sound (10)
  'symphony': 'music',
  'jazz': 'music',
  'techno': 'music',
  'ambient': 'music',
  'drum_circle': 'music',
  'glitch': 'music',
  'dubstep': 'music',
  'choir': 'music',
  'metal': 'music',
  'binaural': 'music',
};

export const PresetLauncher: React.FC<PresetLauncherProps> = ({ onSelectPreset, onSkip }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);

  const handlePresetClick = (preset: CreativePreset) => {
    onSelectPreset(preset);
  };

  const filteredPresets = CREATIVE_PRESETS.filter(preset => 
    !selectedCategory || CATEGORY_MAPPING[preset.id] === selectedCategory
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center bg-black overflow-auto py-12">
      {/* Grain texture overlay */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}
      />
      
      {/* Skip button */}
      {onSkip && (
        <button
          onClick={onSkip}
          className="absolute top-6 right-6 p-2.5 rounded-full border border-white/10 hover:border-white/30 text-white/40 hover:text-white/80 transition-all duration-300"
          title="Skip"
        >
          <X size={18} strokeWidth={1} />
        </button>
      )}
      
      {/* Header - Mysterious & Minimal */}
      <div className="text-center mb-12 px-4 max-w-3xl">
        <div className="inline-block mb-6 px-4 py-1 border border-white/10 rounded-full">
          <span className="text-white/50 text-xs tracking-[0.2em] uppercase font-light">
            Devices for Intuition
          </span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extralight text-white mb-6 tracking-tight leading-none">
          AESTHESIS
        </h1>
        
        <p className="text-white/40 text-sm sm:text-base font-light tracking-wide max-w-xl mx-auto leading-relaxed">
          Selecione uma configuração inicial. Cada preset incorpora<br/>
          uma assinatura algorítmica única esperando para emergir.
        </p>
      </div>

      {/* Categories - Minimal tabs */}
      <div className="flex flex-wrap gap-1 mb-10 px-4 justify-center max-w-4xl">
        {/* All button */}
        <button
          onClick={() => setSelectedCategory(null)}
          className={`
            px-5 py-2 text-xs tracking-wider uppercase font-light transition-all duration-300
            border-b
            ${
              selectedCategory === null
                ? 'text-white border-white'
                : 'text-white/40 border-transparent hover:text-white/70 hover:border-white/20'
            }
          `}
        >
          Tudo
        </button>
        
        <div className="w-px h-6 bg-white/10 self-center mx-1" />
        
        {CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(isSelected ? null : category.id)}
              className={`
                px-5 py-2 text-xs tracking-wider uppercase font-light transition-all duration-300
                border-b
                ${
                  isSelected
                    ? 'text-white border-white'
                    : 'text-white/40 border-transparent hover:text-white/70 hover:border-white/20'
                }
              `}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Preset Grid - Elegant cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-white/5 p-px max-w-[1400px] w-full mx-4">
        {filteredPresets.map((preset) => {
          const isHovered = hoveredPreset === preset.id;
          const category = CATEGORY_MAPPING[preset.id];

          return (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              onMouseEnter={() => setHoveredPreset(preset.id)}
              onMouseLeave={() => setHoveredPreset(null)}
              className={`
                group relative p-6 bg-black
                transition-all duration-500 cursor-pointer
                ${isHovered ? 'bg-white/[0.02]' : 'hover:bg-white/[0.01]'}
              `}
            >
              {/* Content */}
              <div className="relative">
                {/* Category badge */}
                <div className="mb-4">
                  <span className="text-[10px] tracking-[0.15em] uppercase text-white/30 font-light">
                    {category}
                  </span>
                </div>
                
                {/* Name */}
                <h3 className={`
                  text-lg font-light text-left mb-3 transition-all duration-300
                  ${isHovered ? 'text-white' : 'text-white/70'}
                `}>
                  {preset.name}
                </h3>
                
                {/* Description */}
                <p className="text-xs text-white/40 mb-5 text-left leading-relaxed font-light">
                  {preset.description}
                </p>

                {/* Metadata - Monospace minimal */}
                <div className="flex items-center gap-4 text-[10px] font-mono text-white/30">
                  <div>
                    <span className="text-white/50">{preset.particleCount}</span>
                    <span className="ml-1">p</span>
                  </div>
                  <div className="w-px h-3 bg-white/10" />
                  <div>
                    <span className="text-white/50">{preset.typesCount}</span>
                    <span className="ml-1">t</span>
                  </div>
                  <div className="w-px h-3 bg-white/10" />
                  <div>
                    <span className="text-white/50">{preset.seed}</span>
                  </div>
                </div>
              </div>

              {/* Hover indicator - subtle line */}
              <div className={`
                absolute bottom-0 left-0 h-px bg-white transition-all duration-500
                ${isHovered ? 'w-full' : 'w-0'}
              `} />
            </button>
          );
        })}
      </div>

      {/* Footer - Minimal signature */}
      <div className="mt-12 text-center pb-8 px-4">
        <div className="inline-block px-6 py-2 border border-white/5 rounded-full">
          <p className="text-white/30 text-[10px] tracking-[0.2em] uppercase font-light">
            Micro · Field · Reconfig
          </p>
        </div>
      </div>
    </div>
  );
};
