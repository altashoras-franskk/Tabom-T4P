import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface SeedPanelProps {
  currentSeed: number;
  onLoadSeed: (seed: number) => void;
}

export const SeedPanel: React.FC<SeedPanelProps> = ({ currentSeed, onLoadSeed }) => {
  const [inputSeed, setInputSeed] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedSeeds, setSavedSeeds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('metalife-saved-seeds');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleCopySeed = async () => {
    try {
      await navigator.clipboard.writeText(currentSeed.toString());
      setCopied(true);
      toast.success('Seed copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentSeed.toString();
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        toast.success('Seed copiado!');
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast.error('Erro ao copiar seed');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSaveSeed = () => {
    if (savedSeeds.includes(currentSeed)) {
      toast.info('Seed já salvo');
      return;
    }
    
    const newSeeds = [...savedSeeds, currentSeed];
    setSavedSeeds(newSeeds);
    localStorage.setItem('metalife-saved-seeds', JSON.stringify(newSeeds));
    toast.success('Seed salvo!');
  };

  const handleLoadSeed = () => {
    const seed = parseInt(inputSeed);
    if (isNaN(seed)) {
      toast.error('Seed inválido');
      return;
    }
    onLoadSeed(seed);
    setInputSeed('');
    toast.success('Seed carregado!');
  };

  const handleLoadSavedSeed = (seed: number) => {
    onLoadSeed(seed);
    toast.success('Seed carregado!');
  };

  const handleDeleteSeed = (seed: number) => {
    const newSeeds = savedSeeds.filter(s => s !== seed);
    setSavedSeeds(newSeeds);
    localStorage.setItem('metalife-saved-seeds', JSON.stringify(newSeeds));
    toast.success('Seed removido');
  };

  return (
    <div className="space-y-4">
      {/* Current Seed */}
      <div className="space-y-2">
        <h3 className="text-white/80 text-[9px] tracking-[0.15em] uppercase font-light border-b border-white/[0.06] pb-1.5">
          Seed Atual
        </h3>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 bg-white/[0.03] rounded border border-white/[0.08] font-mono text-white/70 text-xs">
            {currentSeed}
          </div>
          <button
            onClick={handleCopySeed}
            className="px-3 py-2 bg-white/[0.05] hover:bg-white/[0.1] rounded border border-white/[0.08] transition-colors"
          >
            {copied ? (
              <Check size={14} className="text-green-400" />
            ) : (
              <Copy size={14} className="text-white/60" />
            )}
          </button>
          <button
            onClick={handleSaveSeed}
            className="px-3 py-2 bg-white/[0.05] hover:bg-white/[0.1] rounded border border-white/[0.08] text-white/70 text-xs transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>

      {/* Load Seed */}
      <div className="space-y-2">
        <h3 className="text-white/80 text-[9px] tracking-[0.15em] uppercase font-light border-b border-white/[0.06] pb-1.5">
          Carregar Seed
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputSeed}
            onChange={(e) => setInputSeed(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoadSeed()}
            placeholder="Cole um seed..."
            className="flex-1 px-3 py-2 bg-white/[0.03] rounded border border-white/[0.08] font-mono text-white/70 text-xs placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
          <button
            onClick={handleLoadSeed}
            disabled={!inputSeed}
            className="px-3 py-2 bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed rounded border border-white/[0.08] text-white/70 text-xs transition-colors"
          >
            Carregar
          </button>
        </div>
      </div>

      {/* Saved Seeds */}
      {savedSeeds.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-white/80 text-[9px] tracking-[0.15em] uppercase font-light border-b border-white/[0.06] pb-1.5">
            Seeds Salvos
          </h3>
          <div className="space-y-1 max-h-64 overflow-auto">
            {savedSeeds.map((seed) => (
              <div
                key={seed}
                className="flex items-center gap-2 p-2 bg-white/[0.02] rounded border border-white/[0.06] hover:border-white/10 transition-colors"
              >
                <span className="flex-1 font-mono text-white/60 text-xs">{seed}</span>
                <button
                  onClick={() => handleLoadSavedSeed(seed)}
                  className="px-2 py-1 bg-white/[0.05] hover:bg-white/[0.1] rounded text-white/70 text-[10px] transition-colors"
                >
                  Carregar
                </button>
                <button
                  onClick={() => handleDeleteSeed(seed)}
                  className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded text-red-400/70 text-[10px] transition-colors"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-white/[0.04]">
        <p className="text-white/30 text-[10px] leading-relaxed">
          Seeds determinam o universo gerado. Compartilhe seeds para recriar mundos idênticos!
        </p>
      </div>
    </div>
  );
};
