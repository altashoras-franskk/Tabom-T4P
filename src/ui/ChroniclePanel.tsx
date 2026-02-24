import React, { useState } from 'react';
import { X, BookText, Filter } from 'lucide-react';
import type { NarrativeParagraph, NarrativeTone } from '../story/narrativeEngine';

interface ChroniclePanelProps {
  isOpen: boolean;
  onClose: () => void;
  paragraphs: NarrativeParagraph[];
  currentArc: string;
  tone: NarrativeTone;
  setTone: (t: NarrativeTone) => void;
}

export const ChroniclePanel: React.FC<ChroniclePanelProps> = ({
  isOpen,
  onClose,
  paragraphs,
  currentArc,
  tone,
  setTone,
}) => {
  const [filterTag, setFilterTag] = useState<string>('');
  
  if (!isOpen) return null;

  const filtered = filterTag
    ? paragraphs.filter(p => p.tags.includes(filterTag))
    : paragraphs;

  const allTags = Array.from(new Set(paragraphs.flatMap(p => p.tags)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-black/90 border border-white/10 rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <BookText size={20} className="text-cyan-400" />
            <h2 className="text-lg font-mono text-white">CHRONICLE</h2>
            <span className="text-xs text-cyan-400/60 font-mono">
              Arc: {currentArc}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/5 rounded transition-colors"
          >
            <X size={18} className="text-white/60" />
          </button>
        </div>

        {/* Tone Selector */}
        <div className="p-3 border-b border-white/5 flex items-center gap-2">
          <span className="text-xs text-white/40 font-mono">TONE:</span>
          {(['poetic', 'clinical', 'mythic', 'brutalist'] as NarrativeTone[]).map(t => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                tone === t
                  ? 'bg-cyan-400/20 text-cyan-400'
                  : 'text-white/40 hover:bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tag Filter */}
        <div className="p-3 border-b border-white/5 flex items-center gap-2 flex-wrap">
          <Filter size={12} className="text-white/40" />
          <button
            onClick={() => setFilterTag('')}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              !filterTag ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'
            }`}
          >
            all
          </button>
          {allTags.slice(0, 8).map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag === filterTag ? '' : tag)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                filterTag === tag
                  ? 'bg-cyan-400/20 text-cyan-400'
                  : 'text-white/40 hover:bg-white/5'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Paragraphs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filtered.length === 0 && (
            <div className="text-center text-white/30 text-sm py-8">
              Nenhum parágrafo ainda. A história está começando...
            </div>
          )}
          
          {filtered.map((para, i) => (
            <div
              key={i}
              className="border-l-2 border-cyan-400/30 pl-3 py-2 hover:border-cyan-400/60 transition-colors"
            >
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-sm font-mono text-white/90">{para.title}</h3>
                <span className="text-xs text-white/30 font-mono">
                  {para.t.toFixed(1)}s
                </span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">{para.text}</p>
              <div className="flex gap-1 mt-2">
                {para.tags.map((tag, j) => (
                  <span
                    key={j}
                    className="text-[10px] text-cyan-400/50 font-mono px-1.5 py-0.5 bg-cyan-400/5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 text-xs text-white/30 font-mono text-center">
          {paragraphs.length} paragraphs recorded
        </div>
      </div>
    </div>
  );
};
