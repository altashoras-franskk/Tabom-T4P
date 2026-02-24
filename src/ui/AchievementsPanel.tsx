import React, { useState, useMemo } from 'react';
import { Achievement, KNOWN_PATTERN_ACHIEVEMENTS } from '../sim/achievements/achievementSystem';
import { X, Sparkles, Target, Zap, Flame, Star, Award, Lock } from 'lucide-react';

interface AchievementsPanelProps {
  achievements: Achievement[];  // unlocked achievements
  events?: any[];
  onClose: () => void;
  onClearAll?: () => void;
}

const CATEGORY_INFO = {
  pattern:   { label: 'Padrão',      color: 'text-purple-400', bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  icon: Target },
  emergence: { label: 'Emergência',  color: 'text-cyan-400',   bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    icon: Sparkles },
  stability: { label: 'Estabilidade',color: 'text-green-400',  bg: 'bg-green-500/10',   border: 'border-green-500/20',   icon: Star },
  chaos:     { label: 'Caos',        color: 'text-red-400',    bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: Flame },
  discovery: { label: 'Descoberta',  color: 'text-yellow-400', bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20',  icon: Zap },
  milestone: { label: 'Marco',       color: 'text-orange-400', bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  icon: Award },
};

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({
  achievements,
  onClose,
  onClearAll,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showLocked, setShowLocked] = useState(true);

  const unlockedIds = useMemo(() => new Set(achievements.map(a => a.id)), [achievements]);

  // Merge: all known achievements, mark locked/unlocked
  const allAchievements = useMemo(() =>
    KNOWN_PATTERN_ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: unlockedIds.has(a.id),
      unlockedAt: achievements.find(u => u.id === a.id)?.unlockedAt,
    })),
    [unlockedIds, achievements]
  );

  const filtered = useMemo(() => {
    let list = allAchievements;
    if (selectedCategory) list = list.filter(a => a.category === selectedCategory);
    if (!showLocked) list = list.filter(a => a.unlocked);
    // Unlocked first
    return list.sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      return (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0);
    });
  }, [allAchievements, selectedCategory, showLocked]);

  const categoryCounts = useMemo(() =>
    achievements.reduce((acc, a) => { acc[a.category] = (acc[a.category] || 0) + 1; return acc; }, {} as Record<string, number>),
    [achievements]
  );

  const unlockedCount = achievements.length;
  const totalCount = KNOWN_PATTERN_ACHIEVEMENTS.length;
  const progress = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl h-[88vh] bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-base font-light text-white tracking-tight">Conquistas</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="h-1 w-32 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-white/40 font-mono">{unlockedCount}/{totalCount}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLocked(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] rounded border transition-all
                ${showLocked ? 'border-white/15 text-white/50 hover:text-white/70' : 'border-white/5 text-white/25 hover:text-white/40'}`}
            >
              <Lock size={10} />
              {showLocked ? 'Mostrando bloqueadas' : 'Apenas desbloqueadas'}
            </button>
            {onClearAll && (
              <button
                onClick={onClearAll}
                className="px-3 py-1.5 text-[10px] text-red-400/50 hover:text-red-400/80 border border-red-500/10 hover:border-red-500/30 rounded transition-all"
              >
                Resetar
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full border border-white/10 hover:border-white/30 text-white/40 hover:text-white/80 transition-all"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-1.5 px-5 py-3 border-b border-white/[0.04] overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 text-[10px] tracking-wider uppercase font-light transition-all rounded-lg border shrink-0
              ${selectedCategory === null ? 'text-white bg-white/10 border-white/20' : 'text-white/35 border-white/5 hover:text-white/60 hover:border-white/10'}`}
          >
            Todas · {unlockedCount}
          </button>
          {Object.entries(CATEGORY_INFO).map(([key, info]) => {
            const count = categoryCounts[key] || 0;
            const Icon = info.icon;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-wider uppercase font-light transition-all rounded-lg border shrink-0
                  ${selectedCategory === key ? `${info.color} ${info.bg} ${info.border}` : 'text-white/35 border-white/5 hover:text-white/60 hover:border-white/10'}`}
              >
                <Icon size={10} strokeWidth={1.5} />
                {info.label}
                {count > 0 && <span className="ml-0.5 opacity-70">· {count}</span>}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
          {filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/25">
              <Sparkles size={40} strokeWidth={1} className="mb-3 opacity-30" />
              <p className="text-sm font-light">Nenhuma conquista ainda</p>
              <p className="text-xs mt-1.5 opacity-60">Continue explorando o universo</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(achievement => {
                const catInfo = CATEGORY_INFO[achievement.category as keyof typeof CATEGORY_INFO];
                const Icon = catInfo.icon;
                const isUnlocked = achievement.unlocked;

                return (
                  <div
                    key={achievement.id}
                    className={`relative p-4 rounded-lg border transition-all
                      ${isUnlocked
                        ? `${catInfo.bg} ${catInfo.border} hover:scale-[1.01]`
                        : 'bg-white/[0.02] border-white/[0.05] opacity-40'
                      }`}
                  >
                    {!isUnlocked && (
                      <div className="absolute top-3 right-3">
                        <Lock size={10} className="text-white/30" />
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className={`text-3xl leading-none shrink-0 ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className={`text-sm font-medium ${isUnlocked ? 'text-white' : 'text-white/50'}`}>
                            {achievement.name}
                          </span>
                          <div className={`flex items-center gap-0.5 px-1.5 py-px rounded-full ${catInfo.bg} border ${catInfo.border} shrink-0`}>
                            <Icon size={8} strokeWidth={2} className={catInfo.color} />
                            <span className={`text-[8px] uppercase tracking-wider ${catInfo.color}`}>{catInfo.label}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-white/40 leading-snug">{achievement.description}</p>
                        {isUnlocked && achievement.unlockedAt && (
                          <p className="text-[9px] text-white/25 mt-1.5 font-mono">
                            {new Date(achievement.unlockedAt).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.04] bg-black/20 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[10px] font-light flex-wrap">
            {Object.entries(CATEGORY_INFO).map(([key, info]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${info.color.replace('text-', 'bg-')}`} />
                <span className="text-white/30">{info.label}:</span>
                <span className="text-white/60 font-mono">{categoryCounts[key] || 0}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-white/30 font-mono">{progress}% completo</div>
        </div>
      </div>
    </div>
  );
};
