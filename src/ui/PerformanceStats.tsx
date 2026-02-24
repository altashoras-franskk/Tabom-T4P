import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Zap, Database, Layers } from 'lucide-react';

interface PerformanceStatsProps {
  fps: number;
  particleCount: number;
  fieldCellCount: number;
  artifactCount: number;
  speciesCount: number;
  avgTension: number;
  avgCohesion: number;
  avgScarcity: number;
  diversity: number;
  stats?: {
    totalBeats: number;
    totalSpeciations: number;
    totalInstitutions: number;
    totalMutations: number;
    totalMitosis: number;
    totalMetamorphosis: number;
    peakParticleCount: number;
    peakDiversity: number;
    peakTension: number;
    peakCohesion: number;
    simulationStartTime: number;
  };
}

export const PerformanceStats: React.FC<PerformanceStatsProps> = ({
  fps,
  particleCount,
  fieldCellCount,
  artifactCount,
  speciesCount,
  avgTension,
  avgCohesion,
  avgScarcity,
  diversity,
  stats,
}) => {
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<number>(0);

  useEffect(() => {
    // Update FPS history
    setFpsHistory((prev) => {
      const next = [...prev, fps];
      if (next.length > 60) next.shift();
      return next;
    });

    // Check memory usage (if available)
    if (performance && (performance as any).memory) {
      const mem = (performance as any).memory;
      const usedMB = mem.usedJSHeapSize / (1024 * 1024);
      setMemoryUsage(usedMB);
    }
  }, [fps]);

  const avgFps = fpsHistory.length > 0 
    ? fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length 
    : fps;

  const minFps = fpsHistory.length > 0 ? Math.min(...fpsHistory) : fps;
  const maxFps = fpsHistory.length > 0 ? Math.max(...fpsHistory) : fps;

  const StatRow: React.FC<{ icon: React.ReactNode; label: string; value: string; color?: string }> = ({ 
    icon, 
    label, 
    value, 
    color = 'text-white/60' 
  }) => (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5">
        <div className="text-white/40">{icon}</div>
        <span className="text-white/40 text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <span className={`font-mono text-[10px] ${color}`}>{value}</span>
    </div>
  );

  const ProgressBar: React.FC<{ label: string; value: number; max?: number; color: string }> = ({ 
    label, 
    value, 
    max = 1, 
    color 
  }) => {
    const percentage = Math.min(100, (value / max) * 100);
    
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-white/40 text-[10px] uppercase tracking-wide">{label}</span>
          <span className="text-white/60 text-[10px] font-mono">{value.toFixed(2)}</span>
        </div>
        <div className="w-full h-1 bg-white/5 overflow-hidden">
          <div 
            className={`h-full ${color} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-white/80';
    if (fps >= 30) return 'text-white/60';
    return 'text-white/40';
  };

  return (
    <div className="space-y-3">
      {/* FPS Section */}
      <div className="bg-white/[0.02] p-2.5" style={{ border: '1px dashed rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Activity size={12} className="text-white/50" strokeWidth={1.5} />
          <h3 className="text-white/70 text-[10px] uppercase tracking-wider">Taxa de Quadros</h3>
        </div>
        
        <div className="space-y-1.5">
          <StatRow 
            icon={<Zap size={11} strokeWidth={1.5} />} 
            label="Atual" 
            value={`${fps}`}
            color={getFpsColor(fps)}
          />
          <StatRow 
            icon={<Activity size={11} strokeWidth={1.5} />} 
            label="Média" 
            value={`${avgFps.toFixed(1)}`}
            color={getFpsColor(avgFps)}
          />
          <div className="flex items-center justify-between text-[9px] pt-0.5">
            <span className="text-white/30">Mín: {minFps.toFixed(0)}</span>
            <span className="text-white/30">Máx: {maxFps.toFixed(0)}</span>
          </div>
        </div>

        {/* FPS Graph */}
        <div className="mt-2 h-10 flex items-end gap-[1px]">
          {fpsHistory.slice(-30).map((f, i) => {
            const height = Math.max(2, (f / 60) * 100);
            const color = f >= 55 ? 'bg-white/40' : f >= 30 ? 'bg-white/25' : 'bg-white/15';
            
            return (
              <div
                key={i}
                className={`flex-1 ${color} transition-all`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* System Load */}
      <div className="bg-white/[0.02] p-2.5" style={{ border: '1px dashed rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Cpu size={12} className="text-white/50" strokeWidth={1.5} />
          <h3 className="text-white/70 text-[10px] uppercase tracking-wider">Carga do Sistema</h3>
        </div>
        
        <div className="space-y-1.5">
          <StatRow 
            icon={<Database size={11} strokeWidth={1.5} />} 
            label="Partículas" 
            value={particleCount.toLocaleString()}
            color="text-white/70"
          />
          <StatRow 
            icon={<Layers size={11} strokeWidth={1.5} />} 
            label="Células Campo" 
            value={fieldCellCount.toLocaleString()}
            color="text-white/60"
          />
          <StatRow 
            icon={<Zap size={11} strokeWidth={1.5} />} 
            label="Artefatos" 
            value={artifactCount.toString()}
            color="text-white/60"
          />
          <StatRow 
            icon={<Activity size={11} strokeWidth={1.5} />} 
            label="Espécies" 
            value={speciesCount.toString()}
            color="text-white/70"
          />
          
          {memoryUsage > 0 && (
            <StatRow 
              icon={<Database size={11} strokeWidth={1.5} />} 
              label="Memória" 
              value={`${memoryUsage.toFixed(1)} MB`}
              color="text-white/60"
            />
          )}
        </div>
      </div>

      {/* Field Metrics */}
      <div className="bg-white/[0.02] p-2.5" style={{ border: '1px dashed rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Layers size={12} className="text-white/50" strokeWidth={1.5} />
          <h3 className="text-white/70 text-[10px] uppercase tracking-wider">Métricas de Campo</h3>
        </div>
        
        <div className="space-y-2">
          <ProgressBar 
            label="Tensão" 
            value={avgTension} 
            color="bg-white/60"
          />
          <ProgressBar 
            label="Coesão" 
            value={avgCohesion} 
            color="bg-white/50"
          />
          <ProgressBar 
            label="Escassez" 
            value={avgScarcity} 
            color="bg-white/40"
          />
          <ProgressBar 
            label="Diversidade" 
            value={diversity} 
            color="bg-white/30"
          />
        </div>
      </div>

      {/* Accumulated Stats - Session Summary */}
      {stats && (
        <>
          <div className="bg-white/[0.02] p-2.5" style={{ border: '1px dashed rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Activity size={12} className="text-yellow-400/70" strokeWidth={1.5} />
              <h3 className="text-white/70 text-[10px] uppercase tracking-wider">Eventos Emergentes</h3>
            </div>
            
            <div className="space-y-1.5">
              <StatRow 
                icon={<span className="text-[10px]">·</span>} 
                label="Total Beats" 
                value={stats.totalBeats.toString()}
                color="text-yellow-400/80"
              />
              <StatRow 
                icon={<span className="text-[10px]">◎</span>} 
                label="Especiações" 
                value={stats.totalSpeciations.toString()}
                color="text-green-400/80"
              />
              <StatRow 
                icon={<span className="text-[10px]">◈</span>} 
                label="Instituições" 
                value={stats.totalInstitutions.toString()}
                color="text-purple-400/80"
              />
              <StatRow 
                icon={<Zap size={11} strokeWidth={1.5} />} 
                label="Mutações" 
                value={stats.totalMutations.toString()}
                color="text-blue-400/80"
              />
              <StatRow 
                icon={<span className="text-[10px]">◎</span>} 
                label="Mitose" 
                value={stats.totalMitosis.toString()}
                color="text-pink-400/80"
              />
            </div>
          </div>

          <div className="bg-white/[0.02] p-2.5" style={{ border: '1px dashed rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Zap size={12} className="text-orange-400/70" strokeWidth={1.5} />
              <h3 className="text-white/70 text-[10px] uppercase tracking-wider">Recordes da Sessão</h3>
            </div>
            
            <div className="space-y-1.5">
              <StatRow 
                icon={<Database size={11} strokeWidth={1.5} />} 
                label="Pico de Partículas" 
                value={stats.peakParticleCount.toLocaleString()}
                color="text-orange-400/80"
              />
              <StatRow 
                icon={<Layers size={11} strokeWidth={1.5} />} 
                label="Pico de Diversidade" 
                value={stats.peakDiversity.toFixed(3)}
                color="text-cyan-400/80"
              />
              <StatRow 
                icon={<Zap size={11} strokeWidth={1.5} />} 
                label="Pico de Tensão" 
                value={stats.peakTension.toFixed(3)}
                color="text-red-400/80"
              />
              <StatRow 
                icon={<Activity size={11} strokeWidth={1.5} />} 
                label="Pico de Coesão" 
                value={stats.peakCohesion.toFixed(3)}
                color="text-green-400/80"
              />
            </div>
          </div>

          <div className="bg-white/[0.02] p-2.5" style={{ border: '1px dashed rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Activity size={12} className="text-white/50" strokeWidth={1.5} />
              <h3 className="text-white/70 text-[10px] uppercase tracking-wider">Tempo de Simulação</h3>
            </div>
            <div className="text-white/60 text-[11px] font-mono text-center">
              {(() => {
                const elapsed = Math.floor((Date.now() - stats.simulationStartTime) / 1000);
                const mins = Math.floor(elapsed / 60);
                const secs = elapsed % 60;
                return `${mins}m ${secs}s`;
              })()}
            </div>
          </div>
        </>
      )}

      {/* Performance Tips */}
      {fps < 30 && (
        <div className="bg-white/[0.02] p-2.5" style={{ border: '1px dashed rgba(255,255,255,0.06)' }}>
          <div className="flex items-start gap-1.5">
            <Activity size={11} className="text-white/50 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
            <div className="space-y-0.5">
              <p className="text-white/60 text-[10px] uppercase tracking-wide">Aviso de Performance</p>
              <p className="text-white/40 text-[9px] leading-relaxed">
                FPS baixo. Tente reduzir a contagem de partículas ou desativar rastros.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};