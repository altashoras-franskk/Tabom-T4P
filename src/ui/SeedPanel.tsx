import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";

interface SeedPanelProps {
  currentSeed: number;
  onLoadSeed: (seed: number) => void;
}

const sectionTitle: React.CSSProperties = {
  fontFamily: DOTO, fontSize: 10, color: 'rgba(255,255,255,0.50)',
  letterSpacing: '0.08em', textTransform: 'uppercase', paddingBottom: 5,
  borderBottom: '1px dashed rgba(255,255,255,0.05)', marginBottom: 6,
};
const btnBase: React.CSSProperties = {
  fontFamily: MONO, fontSize: 9, cursor: 'pointer', transition: 'all 0.15s',
  border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)',
  background: 'transparent', textTransform: 'uppercase', letterSpacing: '0.06em',
};

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
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = currentSeed.toString();
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        toast.success('Seed copiado!');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Erro ao copiar seed');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSaveSeed = () => {
    if (savedSeeds.includes(currentSeed)) { toast.info('Seed já salvo'); return; }
    const newSeeds = [...savedSeeds, currentSeed];
    setSavedSeeds(newSeeds);
    localStorage.setItem('metalife-saved-seeds', JSON.stringify(newSeeds));
    toast.success('Seed salvo!');
  };

  const handleLoadSeed = () => {
    const seed = parseInt(inputSeed);
    if (isNaN(seed)) { toast.error('Seed inválido'); return; }
    onLoadSeed(seed);
    setInputSeed('');
    toast.success('Seed carregado!');
  };

  const handleLoadSavedSeed = (seed: number) => { onLoadSeed(seed); toast.success('Seed carregado!'); };

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
        <h3 style={sectionTitle}>Seed Atual</h3>
        <div className="flex gap-2">
          <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.55)', padding: '5px 10px', border: '1px dashed rgba(255,255,255,0.06)', flex: 1 }}>
            {currentSeed}
          </div>
          <button onClick={handleCopySeed} style={{ ...btnBase, padding: '5px 10px' }}>
            {copied ? <Check size={12} style={{ color: '#10d45b' }} /> : <Copy size={12} />}
          </button>
          <button onClick={handleSaveSeed} style={{ ...btnBase, padding: '5px 10px' }}>Salvar</button>
        </div>
      </div>

      {/* Load Seed */}
      <div className="space-y-2">
        <h3 style={sectionTitle}>Carregar Seed</h3>
        <div className="flex gap-2">
          <input type="text" value={inputSeed} onChange={(e) => setInputSeed(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoadSeed()}
            placeholder="Cole um seed..."
            className="flex-1 focus:outline-none"
            style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.55)', padding: '5px 10px', border: '1px dashed rgba(255,255,255,0.06)', background: 'transparent' }}
          />
          <button onClick={handleLoadSeed} disabled={!inputSeed}
            className="disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ ...btnBase, padding: '5px 10px' }}>
            Carregar
          </button>
        </div>
      </div>

      {/* Saved Seeds */}
      {savedSeeds.length > 0 && (
        <div className="space-y-2">
          <h3 style={sectionTitle}>Seeds Salvos</h3>
          <div className="space-y-1 max-h-64 overflow-auto">
            {savedSeeds.map((seed) => (
              <div key={seed} className="flex items-center gap-2 p-2 transition-colors"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.04)' }}>
                <span style={{ flex: 1, fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{seed}</span>
                <button onClick={() => handleLoadSavedSeed(seed)} style={{ ...btnBase, padding: '3px 8px' }}>Carregar</button>
                <button onClick={() => handleDeleteSeed(seed)} style={{ ...btnBase, padding: '3px 8px', color: 'rgba(255,80,80,0.55)' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ paddingTop: 8, borderTop: '1px dashed rgba(255,255,255,0.04)' }}>
        <p style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.22)', lineHeight: 1.5 }}>
          Seeds determinam o universo gerado. Compartilhe seeds para recriar mundos idênticos!
        </p>
      </div>
    </div>
  );
};
