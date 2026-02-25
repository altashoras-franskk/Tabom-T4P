// ── Music Lab — What's New Banner (Patch 01.3) ────────────────────────────────
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const DOTO = "'Doto', monospace";
const MONO = "'IBM Plex Mono', monospace";
const ACCENT = '#37b2da';

export const WhatsNewBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('musiclab_patch_01.3_seen');
    if (!seen) {
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
    <div className="fixed top-20 right-4 z-40 max-w-sm"
      style={{
        background: 'rgba(0,0,0,0.96)',
        border: '1px dashed rgba(255,255,255,0.06)',
        padding: 16,
        animation: 'slideIn 0.5s ease-out',
      }}>
      <button title="Dispensar" onClick={handleDismiss}
        className="absolute top-2 right-2 transition-colors"
        style={{color:'rgba(255,255,255,0.20)'}}>
        <X size={13} />
      </button>

      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-3"
        style={{background:`${ACCENT}08`,border:`1px dashed ${ACCENT}25`}}>
        <div className="w-1.5 h-1.5 animate-pulse" style={{background:ACCENT}} />
        <span style={{fontFamily:MONO,fontSize:8,letterSpacing:'0.14em',textTransform:'uppercase',color:`${ACCENT}cc`}}>
          Patch 01.3
        </span>
      </div>

      <h3 style={{fontFamily:DOTO,fontSize:12,letterSpacing:'0.06em',textTransform:'uppercase',color:'rgba(255,255,255,0.65)',marginBottom:8}}>
        Evolution & 3D Vision
      </h3>

      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
        {[
          ['◎', '3D Visualization', 'Toggle ◎ 3D to explore particles in three dimensions'],
          ['♪', '20 New Presets', 'Organic instruments, experimental FX, physics showcase'],
          ['✦', 'Pro Templates', 'Guitar, sax, cello, sitar, quantum tunneling & more'],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{display:'flex',alignItems:'flex-start',gap:8}}>
            <span style={{color:`${ACCENT}88`,fontSize:10,flexShrink:0}}>{icon}</span>
            <p style={{fontFamily:MONO,fontSize:8,color:'rgba(255,255,255,0.45)',lineHeight:1.6}}>
              <strong style={{color:'rgba(255,255,255,0.65)'}}>{title}</strong> — {desc}
            </p>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,fontFamily:MONO,fontSize:8}}>
        {[['Total Presets','60'],['Camera Modes','4']].map(([label,val])=>(
          <div key={label} style={{background:'rgba(255,255,255,0.02)',border:'1px dashed rgba(255,255,255,0.04)',padding:'6px 8px'}}>
            <div style={{color:'rgba(255,255,255,0.25)',marginBottom:2}}>{label}</div>
            <div style={{color:ACCENT}}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop:12,paddingTop:10,borderTop:'1px dashed rgba(255,255,255,0.04)',fontFamily:MONO,fontSize:7,color:'rgba(255,255,255,0.18)',textAlign:'center',letterSpacing:'0.08em'}}>
        Explore new sonic territories
      </div>
    </div>
  );
};
