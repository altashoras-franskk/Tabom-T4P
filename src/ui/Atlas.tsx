import React from 'react';
import { Chronicle } from '../story/beats';
import { SemanticArtifact } from '../sim/reconfig/reconfigState';

interface AtlasProps {
  chronicle: Chronicle;
  artifacts: SemanticArtifact[];
  diversity: number;
  clusterCount: number;
  borderStrength: number;
  avgTension: number;
  avgCohesion: number;
  avgScarcity: number;
}

export const Atlas: React.FC<AtlasProps> = ({
  chronicle,
  artifacts,
  diversity,
  clusterCount,
  borderStrength,
  avgTension,
  avgCohesion,
  avgScarcity,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-white font-semibold text-sm">Chronicle</h3>
        <div className="space-y-1 max-h-40 overflow-auto">
          {chronicle.beats.slice(0, 10).map((beat, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 bg-white/5 rounded text-xs"
            >
              <span className="text-xl">{beat.sigil}</span>
              <span className="text-white/70">{beat.message}</span>
            </div>
          ))}
          {chronicle.beats.length === 0 && (
            <div className="text-white/30 text-xs italic">No events yet...</div>
          )}
        </div>
      </div>

      <div className="h-px bg-white/10" />

      <div className="space-y-2">
        <h3 className="text-white font-semibold text-sm">Institutions</h3>
        <div className="space-y-1">
          {artifacts.map((artifact) => {
            const life = 1 - artifact.elapsed / artifact.duration;
            return (
              <div
                key={artifact.id}
                className="flex items-center gap-2 p-2 bg-white/5 rounded text-xs"
              >
                <span className="text-xl">{artifact.sigil}</span>
                <div className="flex-1">
                  <div className="text-white/70">{artifact.name}</div>
                  <div className="w-full bg-white/10 h-1 rounded mt-1">
                    <div
                      className="bg-purple-400 h-1 rounded transition-all"
                      style={{ width: `${life * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {artifacts.length === 0 && (
            <div className="text-white/30 text-xs italic">None active</div>
          )}
        </div>
      </div>

      <div className="h-px bg-white/10" />

      <div className="space-y-2">
        <h3 className="text-white font-semibold text-sm">Metrics</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-white/50">Diversity</div>
            <div className="text-white font-mono">{diversity.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-white/50">Clusters</div>
            <div className="text-white font-mono">{clusterCount}</div>
          </div>
          <div>
            <div className="text-white/50">Friction</div>
            <div className="text-white font-mono">{avgTension.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-white/50">Bond</div>
            <div className="text-white font-mono">{avgCohesion.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-white/50">Hunger</div>
            <div className="text-white font-mono">{avgScarcity.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-white/50">Borders</div>
            <div className="text-white font-mono">{borderStrength.toFixed(3)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
