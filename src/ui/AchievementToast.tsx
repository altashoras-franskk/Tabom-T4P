import React, { useEffect, useState } from 'react';
import { Achievement } from '../sim/achievements/achievementSystem';
import { Sparkles } from 'lucide-react';

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({ achievement, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievement]);
  
  if (!achievement) return null;
  
  return (
    <div
      className={`
        fixed top-6 right-6 z-50 transition-all duration-300 transform
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      onClick={() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300);
      }}
    >
      <div className="relative w-96 bg-gradient-to-br from-black/95 to-black/90 backdrop-blur-xl border border-cyan-500/20 rounded-lg overflow-hidden shadow-2xl shadow-cyan-500/10 cursor-pointer hover:border-cyan-500/40 transition-all">
        {/* Subtle animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-transparent opacity-50" />
        
        {/* Content */}
        <div className="relative p-4 flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 text-4xl leading-none mt-1 drop-shadow-glow">
            {achievement.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3 h-3 text-cyan-400" strokeWidth={2} />
              <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/80 font-light">
                Conquista
              </span>
            </div>
            
            {/* Title */}
            <h3 className="text-white text-base font-medium mb-1 leading-tight">
              {achievement.name}
            </h3>
            
            {/* Description */}
            <p className="text-white/50 text-xs font-light leading-relaxed">
              {achievement.description}
            </p>
          </div>
        </div>
        
        {/* Progress bar (auto-dismiss indicator) */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-[5000ms] ease-linear"
            style={{ width: isVisible ? '0%' : '100%' }}
          />
        </div>
      </div>
    </div>
  );
};
