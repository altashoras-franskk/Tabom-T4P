// ── Music Lab — What's New Banner (Patch 01.3) ────────────────────────────────
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export const WhatsNewBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already seen this banner
    const seen = localStorage.getItem('musiclab_patch_01.3_seen');
    if (!seen) {
      // Show after 2 seconds
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem('musiclab_patch_01.3_seen', 'true');
  };

  if (!visible || dismissed) return null;

  return (
    <div
      className="fixed top-20 right-4 z-40 max-w-sm rounded-xl border border-cyan-400/30 bg-black/90 backdrop-blur-xl p-4 shadow-2xl animate-in slide-in-from-right"
      style={{
        animation: 'slideIn 0.5s ease-out',
        boxShadow: '0 0 40px rgba(0,212,255,0.15)',
      }}
    >
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-white/40 hover:text-white/80 transition-colors"
      >
        <X size={14} />
      </button>

      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-[9px] font-mono uppercase tracking-widest text-cyan-300">
          Patch 01.3
        </span>
      </div>

      {/* Title */}
      <h3 className="text-white text-sm font-mono uppercase tracking-wide mb-2">
        Evolution & 3D Vision
      </h3>

      {/* Features list */}
      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <span className="text-cyan-400 text-xs flex-shrink-0">◎</span>
          <p className="text-white/70 text-xs leading-relaxed">
            <strong className="text-white/90">3D Visualization</strong> — Toggle "◎ 3D" to explore particles in three dimensions
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-cyan-400 text-xs flex-shrink-0">♪</span>
          <p className="text-white/70 text-xs leading-relaxed">
            <strong className="text-white/90">20 New Presets</strong> — Organic instruments, experimental FX, physics showcase
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-cyan-400 text-xs flex-shrink-0">✨</span>
          <p className="text-white/70 text-xs leading-relaxed">
            <strong className="text-white/90">Professional Templates</strong> — Guitar, sax, cello, sitar, quantum tunneling & more
          </p>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
        <div className="rounded bg-white/5 px-2 py-1.5 border border-white/5">
          <div className="text-white/40 mb-0.5">Total Presets</div>
          <div className="text-cyan-400 font-semibold">60</div>
        </div>
        <div className="rounded bg-white/5 px-2 py-1.5 border border-white/5">
          <div className="text-white/40 mb-0.5">Camera Modes</div>
          <div className="text-cyan-400 font-semibold">4</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-white/5 text-[9px] font-mono text-white/30 text-center">
        Explore new sonic territories
      </div>
    </div>
  );
};
