// Guide Hint Arrow - Points to guide button after preset selection

import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface GuideHintArrowProps {
  targetSelector: string;
  show: boolean;
}

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
          y: rect.top - 40, // Above the button
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
      className="fixed z-[90] pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Arrow */}
      <div className="flex flex-col items-center animate-bounce">
        <div className="text-yellow-400 text-xs font-medium mb-1 whitespace-nowrap bg-black/5 backdrop-blur-sm px-2 py-1 rounded">
          Clique aqui para começar
        </div>
        <ChevronDown className="w-6 h-6 text-yellow-400 animate-pulse" />
      </div>
    </div>
  );
};
