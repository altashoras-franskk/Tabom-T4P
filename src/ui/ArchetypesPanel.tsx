// PATCH 04.5-SIGILS: Archetypes Panel - Shows active particle types with colors
import React, { useMemo } from 'react';
import { ArchetypeArtifact } from '../sim/sigils/archetypeDetector';
import { MicroState } from '../sim/micro/microState';
import { MicroConfig } from '../sim/micro/microState';
import { SigilConfig } from '../sim/sigils/sigilState';
import { ArchetypeRegistry } from '../sim/archetypes/archetypes';
import { Sparkles, Target, CircleDot, Dna, Activity } from 'lucide-react';
import { getTypeColor } from '../render/palette';

interface ArchetypesPanelProps {
  archetypesDetected: ArchetypeArtifact[];
  microState: MicroState;
  microConfig: MicroConfig;
  paletteIndex: number;
  sigilConfig: SigilConfig;
  onSigilConfigChange: (cfg: Partial<SigilConfig>) => void;
  archetypeRegistry: ArchetypeRegistry;
  lifeStats?: {
    births: number;
    deaths: number;
    mutations: number;
    speciation: number;
  };
}

export const ArchetypesPanel: React.FC<ArchetypesPanelProps> = ({
  archetypesDetected,
  microState,
  microConfig,
  paletteIndex,
  sigilConfig,
  onSigilConfigChange,
  archetypeRegistry,
  lifeStats,
}) => {
  // Count particles per type
  const typeCounts = useMemo(() => {
    const counts = new Array(microConfig.typesCount).fill(0);
    for (let i = 0; i < microState.count; i++) {
      const type = microState.type[i];
      if (type >= 0 && type < microConfig.typesCount) {
        counts[type]++;
      }
    }
    return counts;
  }, [microState.count, microState.type, microConfig.typesCount]);
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-2 pb-3 border-b border-white/[0.06]">
        <h2 className="text-white/90 text-[11px] tracking-[0.2em] uppercase font-light flex items-center gap-2">
          <CircleDot size={12} strokeWidth={1.5} />
          Tipos de Partículas
        </h2>
        <p className="text-white/50 text-[9px] font-light leading-relaxed">
          Legenda das cores e população de cada tipo de agente na simulação.
        </p>
      </div>

      {/* Life Stats - Dinâmica Populacional */}
      {lifeStats && (lifeStats.births > 0 || lifeStats.deaths > 0) && (
        <div className="p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-2 text-white/90">
            <Activity size={12} strokeWidth={2} />
            <span className="text-[9px] uppercase tracking-wider font-medium">Dinâmica Populacional (últimos 15s)</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1">
              <div className="text-green-400 text-[16px] font-mono font-bold">+{lifeStats.births}</div>
              <div className="text-white/50 text-[8px] uppercase tracking-wide">Nascimentos</div>
            </div>
            <div className="space-y-1">
              <div className="text-red-400 text-[16px] font-mono font-bold">-{lifeStats.deaths}</div>
              <div className="text-white/50 text-[8px] uppercase tracking-wide">Mortes</div>
            </div>
            <div className="space-y-1">
              <div className={`text-[16px] font-mono font-bold ${lifeStats.births - lifeStats.deaths >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                {lifeStats.births - lifeStats.deaths >= 0 ? '+' : ''}{lifeStats.births - lifeStats.deaths}
              </div>
              <div className="text-white/50 text-[8px] uppercase tracking-wide">Saldo</div>
            </div>
          </div>
        </div>
      )}

      {/* Genetic Archetypes - Especiação */}
      {archetypeRegistry.list.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
            <Dna size={12} strokeWidth={1.5} />
            <h3 className="text-white/80 text-[9px] tracking-[0.15em] uppercase font-light">
              Especiação Genética
            </h3>
            <span className="text-white/40 text-[9px] font-mono ml-auto">{archetypeRegistry.list.length} espécies</span>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1
            [&::-webkit-scrollbar]:w-1 
            [&::-webkit-scrollbar-track]:bg-white/5 
            [&::-webkit-scrollbar-thumb]:bg-white/20 
            [&::-webkit-scrollbar-thumb]:bg-white/15
            [&::-webkit-scrollbar-thumb:hover]:bg-white/30">
            {archetypeRegistry.list.slice(0, 10).map((arch) => (
              <div
                key={arch.id}
                className="bg-white/[0.02] p-2.5 hover:bg-white/[0.04] transition-all" style={{ border: '1px dashed rgba(255,255,255,0.04)' }}
              >
                <div className="flex items-start gap-2 mb-1.5">
                  <div className="text-xl leading-none">{arch.sigil}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/80 text-[10px] font-medium truncate">
                      {arch.name}
                    </div>
                    <div className="text-white/55 text-[8px] mt-0.5 leading-snug">
                      {arch.notes.length > 0 ? arch.notes.join(' · ') : '⚖️ Condições balanceadas'}
                    </div>
                    {arch.signal && (
                      <div className="text-white/35 text-[7px] font-mono mt-1 tracking-wide">
                        V {Math.round(arch.signal.volatility * 100)} · S {Math.round(arch.signal.scarcity * 100)} · C {Math.round(arch.signal.cohesion * 100)}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Genes mini-display */}
                <div className="grid grid-cols-4 gap-1 text-[7px] text-white/40 font-mono">
                  <div className="text-center">
                    <div className="text-white/60">{arch.genes.a.toFixed(2)}</div>
                    <div>A</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/60">{arch.genes.b.toFixed(2)}</div>
                    <div>B</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/60">{arch.genes.c.toFixed(2)}</div>
                    <div>C</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/60">{arch.genes.d.toFixed(2)}</div>
                    <div>D</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Particle Types */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-white/80 text-[9px] tracking-[0.15em] uppercase font-light border-b border-white/[0.06] pb-1.5">
            Tipos Ativos
          </h3>
          <span className="text-white/40 text-[9px] font-mono">{microConfig.typesCount} tipos</span>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1
          [&::-webkit-scrollbar]:w-1 
          [&::-webkit-scrollbar-track]:bg-white/5 
          [&::-webkit-scrollbar-thumb]:bg-white/20 
          [&::-webkit-scrollbar-thumb]:bg-white/15
          [&::-webkit-scrollbar-thumb:hover]:bg-white/30">
          {Array.from({ length: microConfig.typesCount }).map((_, typeIdx) => {
            const count = typeCounts[typeIdx];
            const percentage = microState.count > 0 ? ((count / microState.count) * 100).toFixed(1) : '0.0';
            const color = getTypeColor(typeIdx, paletteIndex, microConfig.typesCount);

            return (
              <div
                key={typeIdx}
                className="bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-all" style={{ border: '1px dashed rgba(255,255,255,0.04)' }}
              >
                {/* Type ID + Color */}
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-4 h-4"
                    style={{ backgroundColor: color, border: '1px dashed rgba(255,255,255,0.15)' }}
                  />
                  <div className="flex-1">
                    <div className="text-white/80 text-[11px] font-medium">
                      Tipo {typeIdx}
                    </div>
                    <div className="text-white/40 text-[9px] font-mono">
                      {count.toLocaleString()} partículas ({percentage}%)
                    </div>
                  </div>
                </div>

                {/* Population bar */}
                <div className="h-1.5 bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sigil System Section */}
      <div className="space-y-3 pt-4 border-t border-white/[0.06]">
        <h3 className="text-white/80 text-[9px] tracking-[0.15em] uppercase font-light border-b border-white/[0.06] pb-1.5 flex items-center gap-2">
          <Sparkles size={10} strokeWidth={1.5} />
          Sistema de Sigils (Padrões)
        </h3>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="sigilsEnabled"
            checked={sigilConfig.enabled}
            onChange={(e) => onSigilConfigChange({ enabled: e.target.checked })}
            className="w-3 h-3 border-white/15 bg-white/[0.05] checked:bg-cyan-500/50 cursor-pointer"
          />
          <label htmlFor="sigilsEnabled" className="text-white/70 text-[10px] font-light cursor-pointer">
            Detecção de Padrões Ativa
          </label>
        </div>
        
        {sigilConfig.enabled && (
          <>
            <div className="flex items-center gap-2 pl-4">
              <input
                type="checkbox"
                id="showSigilOverlay"
                checked={sigilConfig.showOverlay}
                onChange={(e) => onSigilConfigChange({ showOverlay: e.target.checked })}
                className="w-3 h-3 border-white/15 bg-white/[0.05] checked:bg-cyan-500/50 cursor-pointer"
              />
              <label htmlFor="showSigilOverlay" className="text-white/60 text-[10px] font-light cursor-pointer">
                Mostrar Overlay (Tecla: S)
              </label>
            </div>
            
            {/* Detected Patterns */}
            {archetypesDetected.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-white/60 text-[9px] font-light">
                  Padrões detectados: {archetypesDetected.length}
                </div>
                <div className="bg-white/[0.02] p-2 space-y-1" style={{ border: '1px dashed rgba(255,255,255,0.04)' }}>
                  {archetypesDetected.slice(0, 5).map((archetype) => (
                    <div key={archetype.id} className="flex items-center gap-2 text-[9px]">
                      <span className="text-lg">{archetype.sigil}</span>
                      <span className="text-white/60 flex-1">{archetype.name}</span>
                      <span className="text-white/40 font-mono">{archetype.kind}</span>
                    </div>
                  ))}
                  {archetypesDetected.length > 5 && (
                    <div className="text-white/30 text-[8px] text-center pt-1">
                      +{archetypesDetected.length - 5} mais...
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info Box */}
      <div className="p-3 space-y-2" style={{ background: 'rgba(34,211,238,0.03)', border: '1px dashed rgba(34,211,238,0.12)' }}>
        <div className="flex items-center gap-2 text-cyan-400/80">
          <Target size={12} strokeWidth={2} />
          <span className="text-[9px] uppercase tracking-wider font-medium">Sobre Tipos</span>
        </div>
        <div className="text-[8px] text-white/50 font-light leading-relaxed space-y-1">
          <p>
            • <strong className="text-white/70">Cada cor</strong> representa um tipo diferente de partícula
          </p>
          <p>
            • <strong className="text-white/70">Tipos interagem</strong> de acordo com a matriz de forças
          </p>
          <p>
            • <strong className="text-white/70">População</strong> muda dinamicamente com spawn/decay
          </p>
        </div>
      </div>
    </div>
  );
};
