import React, { useEffect, useState } from 'react';

interface GuideHintArrowProps {
  targetSelector: string;
  show: boolean;
}

const MONO = "'IBM Plex Mono', monospace";
const ACCENT = '#ffd400';

export const GuideHintArrow: React.FC<GuideHintArrowProps> = ({ targetSelector, show }) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!show) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 32,
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [show, targetSelector]);

  if (!show || !position) return null;

  return (
    <div
      style={{
        position: 'fixed', zIndex: 90, pointerEvents: 'none',
        left: position.x, top: position.y,
        transform: 'translateX(-50%)',
      }}
    >
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        <div style={{
          fontFamily: MONO, fontSize: 8, color: `${ACCENT}90`,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          background: 'rgba(0,0,0,0.88)',
          border: `1px dashed ${ACCENT}30`,
          padding: '4px 10px', marginBottom: 4,
          whiteSpace: 'nowrap',
        }}>
          Guia disponível
        </div>
        <div style={{ color: `${ACCENT}60`, fontSize: 10 }}>▾</div>
      </div>
    </div>
  );
};
