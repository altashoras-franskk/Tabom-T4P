// ── Music Lab — Preset Categories Helper ──────────────────────────────────────
import React from 'react';

export interface PresetCategory {
  name: string;
  range: string;
  icon: string;
  description: string;
  color: string;
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    name: 'Techno & Electronic',
    range: '1-5, 21, 24, 27, 29, 35, 38',
    icon: '⚡',
    description: 'Club-ready techno, acid, minimal, and industrial',
    color: '#00d4ff',
  },
  {
    name: 'Ambient & Drone',
    range: '6-8, 10, 22, 33, 49, 60',
    icon: '☁️',
    description: 'Atmospheric pads, drones, and ethereal soundscapes',
    color: '#9b59ff',
  },
  {
    name: 'Classical & Orchestral',
    range: '9, 11-15, 34, 36, 57',
    icon: '🎼',
    description: 'Baroque, minimalist, romantic, and symphonic',
    color: '#ffd700',
  },
  {
    name: 'Jazz & Improvisation',
    range: '16-18, 37, 42-43, 48',
    icon: '🎺',
    description: 'Modal jazz, bebop, swing, and free improvisation',
    color: '#ff9944',
  },
  {
    name: 'World & Traditional',
    range: '26, 30-32, 39-40, 44, 46-47',
    icon: '🌍',
    description: 'Global traditions: bossa, flamenco, gamelan, sitar, shakuhachi',
    color: '#ff6600',
  },
  {
    name: 'Organic Instruments',
    range: '41-48',
    icon: '🎸',
    description: 'Acoustic guitar, sax, cello, piano, trumpet (Patch 01.3)',
    color: '#aa7744',
  },
  {
    name: 'Experimental FX',
    range: '19-20, 49-52',
    icon: '🔊',
    description: 'Granular, doppler, phase distortion, spectral (Patch 01.3)',
    color: '#ff00ff',
  },
  {
    name: 'Physics Showcase',
    range: '53-56',
    icon: '⚛️',
    description: 'Orbital, ballistic, magnetic, quantum (Patch 01.3)',
    color: '#00ffaa',
  },
  {
    name: 'Hybrid & Cinematic',
    range: '25, 28, 58-59',
    icon: '🎬',
    description: 'K-pop, neo-soul, cyberpunk, afrofuturism (Patch 01.3)',
    color: '#ff0088',
  },
];

export const PresetCategoryView: React.FC<{onClose: ()=>void}> = ({onClose}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(2,2,5,0.92)'}}>
      <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-black/80 backdrop-blur-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white text-xl font-mono uppercase tracking-wider mb-1">Preset Library</h2>
            <p className="text-white/40 text-xs font-mono">60 professionally crafted musical templates</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {PRESET_CATEGORIES.map((cat, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/5 bg-black/40 p-4 hover:border-white/10 transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className="text-2xl flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{background:`${cat.color}15`, border:`1px solid ${cat.color}30`}}
                >
                  {cat.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-white/90 font-mono text-sm mb-1">{cat.name}</h3>
                  <p className="text-white/50 text-xs mb-2">{cat.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-white/25 uppercase">Presets:</span>
                    <span className="text-[10px] font-mono" style={{color:`${cat.color}aa`}}>
                      {cat.range}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-[10px] font-mono text-white/30">
            <span>Total: 60 presets across 9 categories</span>
            <span>Patch 01.3: +20 new professional templates</span>
          </div>
        </div>
      </div>
    </div>
  );
};
