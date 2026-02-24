import { LoopMetrics } from '../sim/fieldLayers/loops';
import { DraggableWindow } from './DraggableWindow';

type LoopsMapProps = {
  loops: LoopMetrics | null;
  visible?: boolean;
};

export const LoopsMap = ({ loops, visible = true }: LoopsMapProps) => {
  if (!visible || !loops) return null;

  return (
    <DraggableWindow 
      title="Feedback Loops" 
      defaultPosition={{ x: window.innerWidth - 320, y: window.innerHeight - 360 }}
    >
      <div className="w-72 font-mono text-xs">
        {/* Stock Levels */}
        <div className="space-y-1.5 mb-3">
          <BarIndicator label="NUTRIENT" value={loops.avgNutrient} color="rgb(100, 255, 100)" />
          <BarIndicator label="TENSION" value={loops.avgTension} color="rgb(255, 100, 100)" />
          <BarIndicator label="MEMORY" value={loops.avgMemory} color="rgb(100, 200, 255)" />
          <BarIndicator label="ENTROPY" value={loops.avgEntropy} color="rgb(255, 150, 255)" />
        </div>

        <div className="h-px bg-white/10 mb-3" />

        {/* Derived Loop Signals */}
        <div className="space-y-1.5 mb-3">
          <BarIndicator label="SCARCITY" value={loops.scarcity} color="rgb(255, 200, 100)" />
          <BarIndicator label="COHESION" value={loops.cohesion} color="rgb(100, 255, 200)" />
          <BarIndicator label="VOLATILITY" value={loops.volatility} color="rgb(255, 100, 200)" />
        </div>

        <div className="h-px bg-white/10 mb-2" />

        {/* Loop Captions */}
        <div className="space-y-1 text-[10px] text-white/50">
          <div>↑ Scarcity → ↑ Tension → ↑ Volatility → Break</div>
          <div>↑ Memory → ↑ Cohesion → ↑ Stability</div>
          <div>↑ Nutrient → ↑ Attraction → ↑ Clustering</div>
        </div>
      </div>
    </DraggableWindow>
  );
};

const BarIndicator = ({ label, value, color }: { label: string; value: number; color: string }) => {
  const pct = Math.max(0, Math.min(100, value * 100));
  
  // Pulses when value is very high or very low
  const isPulsing = pct > 80 || pct < 10;
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 text-white/60 text-[10px]">{label}</div>
      <div className="flex-1 h-3 bg-white/5 rounded-sm overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${isPulsing ? 'animate-pulse' : ''}`}
          style={{ 
            width: `${pct}%`, 
            backgroundColor: color,
            boxShadow: `0 0 ${isPulsing ? '12' : '8'}px ${color}${isPulsing ? '60' : '40'}`
          }} 
        />
      </div>
      <div className={`w-8 text-right text-[9px] ${isPulsing ? 'text-white/70 font-bold' : 'text-white/40'}`}>
        {pct.toFixed(0)}%
      </div>
    </div>
  );
};