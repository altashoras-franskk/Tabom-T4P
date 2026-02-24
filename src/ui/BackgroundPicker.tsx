import React, { useState } from 'react';
import { X, Palette } from 'lucide-react';

interface BackgroundPickerProps {
  currentBg: string;
  onBgChange: (bg: string) => void;
  onClose: () => void;
}

const PRESET_GRADIENTS = [
  { name: 'Black', value: 'radial-gradient(circle, #000000 0%, #000000 100%)' },
  { name: 'Dark Gray', value: 'radial-gradient(circle, #1a1a1a 0%, #000000 100%)' },
  { name: 'Deep Blue', value: 'radial-gradient(circle, #0f172a 0%, #000000 100%)' },
  { name: 'Purple Void', value: 'radial-gradient(circle, #1e1b4b 0%, #000000 100%)' },
  { name: 'Crimson', value: 'radial-gradient(circle, #450a0a 0%, #000000 100%)' },
  { name: 'Forest', value: 'radial-gradient(circle, #14532d 0%, #000000 100%)' },
  { name: 'Ocean Deep', value: 'radial-gradient(circle, #082f49 0%, #000000 100%)' },
  { name: 'Midnight', value: 'radial-gradient(circle, #1e3a8a 0%, #000000 100%)' },
  { name: 'Rose', value: 'radial-gradient(circle, #4c0519 0%, #000000 100%)' },
  { name: 'Emerald', value: 'radial-gradient(circle, #064e3b 0%, #000000 100%)' },
  { name: 'Amber', value: 'radial-gradient(circle, #451a03 0%, #000000 100%)' },
  { name: 'Slate', value: 'radial-gradient(circle, #1e293b 0%, #000000 100%)' },
  { name: 'Neon Blue', value: 'radial-gradient(circle, #0c4a6e 30%, #000000 100%)' },
  { name: 'Neon Purple', value: 'radial-gradient(circle, #581c87 30%, #000000 100%)' },
  { name: 'Neon Pink', value: 'radial-gradient(circle, #831843 30%, #000000 100%)' },
  { name: 'Cosmic', value: 'radial-gradient(circle, #312e81 0%, #1e1b4b 50%, #000000 100%)' },
  { name: 'Sunset', value: 'radial-gradient(circle, #7c2d12 0%, #450a0a 50%, #000000 100%)' },
  { name: 'Aurora', value: 'radial-gradient(circle, #164e63 0%, #1e3a8a 50%, #000000 100%)' },
  { name: 'Galaxy', value: 'radial-gradient(circle, #4c1d95 20%, #1e1b4b 60%, #000000 100%)' },
  { name: 'Fire', value: 'radial-gradient(circle, #7f1d1d 0%, #450a0a 40%, #000000 100%)' },
];

const COLOR_STOPS = [
  { name: 'Black', value: '#000000' },
  { name: 'Deep Blue', value: '#0f172a' },
  { name: 'Purple', value: '#1e1b4b' },
  { name: 'Crimson', value: '#450a0a' },
  { name: 'Forest', value: '#14532d' },
  { name: 'Ocean', value: '#082f49' },
  { name: 'Midnight', value: '#1e3a8a' },
  { name: 'Rose', value: '#4c0519' },
  { name: 'Emerald', value: '#064e3b' },
  { name: 'Amber', value: '#451a03' },
  { name: 'Slate', value: '#1e293b' },
  { name: 'Neon Blue', value: '#0c4a6e' },
  { name: 'Neon Purple', value: '#581c87' },
  { name: 'Neon Pink', value: '#831843' },
];

export const BackgroundPicker: React.FC<BackgroundPickerProps> = ({ currentBg, onBgChange, onClose }) => {
  const [customCenter, setCustomCenter] = useState('#1e1b4b');
  const [customEdge, setCustomEdge] = useState('#000000');
  const [centerIntensity, setCenterIntensity] = useState(30);
  
  const handleApplyCustom = () => {
    const gradient = `radial-gradient(circle, ${customCenter} ${centerIntensity}%, ${customEdge} 100%)`;
    onBgChange(gradient);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-black/5 backdrop-blur-sm border border-white/[0.02] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Palette className="w-4 h-4 text-purple-500" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-base font-light text-white tracking-tight">Background Gradient</h2>
              <p className="text-[10px] text-white/40 font-light">Customize canvas background</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full border border-white/10 hover:border-white/30 text-white/40 hover:text-white/80 transition-all"
          >
            <X size={16} strokeWidth={1} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Presets Grid */}
          <div className="mb-6">
            <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 font-light">Presets</h3>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_GRADIENTS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => onBgChange(preset.value)}
                  className="group relative h-20 rounded-lg border border-white/10 hover:border-white/30 transition-all overflow-hidden"
                  style={{ background: preset.value }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 text-[9px] text-white/70 font-light text-center">
                    {preset.name}
                  </div>
                  {currentBg === preset.value && (
                    <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-purple-500 border border-white" />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Custom Gradient Builder */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 font-light">Custom Gradient</h3>
            
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 space-y-4">
              {/* Preview */}
              <div 
                className="h-32 rounded-lg border border-white/10"
                style={{ background: `radial-gradient(circle, ${customCenter} ${centerIntensity}%, ${customEdge} 100%)` }}
              />
              
              {/* Center Color */}
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-light mb-2 block">
                  Center Color
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {COLOR_STOPS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setCustomCenter(color.value)}
                      className={`h-10 rounded border-2 transition-all ${
                        customCenter === color.value ? 'border-white scale-110' : 'border-white/20 hover:border-white/40'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              
              {/* Edge Color */}
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-light mb-2 block">
                  Edge Color
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {COLOR_STOPS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setCustomEdge(color.value)}
                      className={`h-10 rounded border-2 transition-all ${
                        customEdge === color.value ? 'border-white scale-110' : 'border-white/20 hover:border-white/40'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              
              {/* Intensity Slider */}
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-light mb-2 block">
                  Center Spread: {centerIntensity}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={centerIntensity}
                  onChange={(e) => setCenterIntensity(Number(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer 
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 
                    [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 
                    [&::-webkit-slider-thumb]:border-white"
                />
              </div>
              
              {/* Apply Button */}
              <button
                onClick={handleApplyCustom}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs py-2.5 rounded transition-colors font-light tracking-wide uppercase"
              >
                Apply Custom Gradient
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
