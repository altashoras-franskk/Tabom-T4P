// WorldLogPanel: Unified event viewer with filters
import React, { useState } from 'react';
import { WorldEvent, WorldEventType, formatEventTime } from '../story/worldLog';
import { X, Copy, Filter } from 'lucide-react';

interface WorldLogPanelProps {
  events: WorldEvent[];
  visible?: boolean;
  onClose?: () => void;
}

const EVENT_TYPE_LABELS: Record<WorldEventType, { label: string; color: string }> = {
  beat: { label: 'Beat', color: '#60a5fa' },
  achievement: { label: 'Achievement', color: '#fbbf24' },
  challenge: { label: 'Challenge', color: '#a78bfa' },
  organism_capture: { label: 'Capture', color: '#34d399' },
  mitosis: { label: 'Mitosis', color: '#f472b6' },
  metamorphosis: { label: 'Evolution', color: '#22d3ee' },
  pattern: { label: 'Pattern', color: '#fb923c' },
  system: { label: 'System', color: '#94a3b8' },
};

export const WorldLogPanel: React.FC<WorldLogPanelProps> = ({ events, visible, onClose }) => {
  const [filter, setFilter] = useState<WorldEventType | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!visible) return null;

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter);

  const copyLog = () => {
    const text = filteredEvents.slice(0, 50).map(e => 
      `[${formatEventTime(e.t)}] ${e.sigil || ''} ${e.title}${e.detail ? ` - ${e.detail}` : ''}`
    ).join('\n');
    navigator.clipboard.writeText(text);
  };

  const highlights = {
    lastSpeciation: events.find(e => e.type === 'beat' && e.meta?.beatType === 'speciation'),
    lastInstitution: events.find(e => e.type === 'beat' && e.meta?.beatType === 'institution'),
    lastAchievement: events.find(e => e.type === 'achievement'),
    lastCapture: events.find(e => e.type === 'organism_capture'),
  };

  return (
    <div className="fixed top-20 right-4 w-[480px] max-h-[calc(100vh-120px)] bg-black/90 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧾</span>
          <h2 className="text-white font-light text-sm tracking-wider uppercase">World Log</h2>
          <span className="text-white/40 text-xs">({filteredEvents.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyLog}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="Copy log to clipboard"
          >
            <Copy size={14} className="text-white/60" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
            >
              <X size={14} className="text-white/60" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 border-b border-white/10 flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter('all')}
          className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded transition-all ${
            filter === 'all'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
          }`}
        >
          All ({events.length})
        </button>
        {Object.entries(EVENT_TYPE_LABELS).map(([type, info]) => {
          const count = events.filter(e => e.type === type).length;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => setFilter(type as WorldEventType)}
              className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded transition-all ${
                filter === type
                  ? 'text-white border'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
              }`}
              style={{
                backgroundColor: filter === type ? info.color + '20' : undefined,
                borderColor: filter === type ? info.color + '40' : undefined,
                color: filter === type ? info.color : undefined,
              }}
            >
              {info.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Highlights */}
      {filter === 'all' && (
        <div className="p-3 border-b border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-white/40 text-[9px] uppercase tracking-wider mb-2">
            <Filter size={10} />
            <span>Highlights</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {highlights.lastSpeciation && (
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                <div className="text-blue-400 text-[9px] uppercase tracking-wider mb-0.5">Last Speciation</div>
                <div className="text-white/80 text-[11px]">{highlights.lastSpeciation.sigil} {highlights.lastSpeciation.title}</div>
                <div className="text-white/40 text-[9px] mt-0.5">{formatEventTime(highlights.lastSpeciation.t)}</div>
              </div>
            )}
            {highlights.lastAchievement && (
              <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                <div className="text-yellow-400 text-[9px] uppercase tracking-wider mb-0.5">Last Achievement</div>
                <div className="text-white/80 text-[11px]">{highlights.lastAchievement.title}</div>
                <div className="text-white/40 text-[9px] mt-0.5">{formatEventTime(highlights.lastAchievement.t)}</div>
              </div>
            )}
            {highlights.lastCapture && (
              <div className="p-2 bg-green-500/10 border border-green-500/20 rounded">
                <div className="text-green-400 text-[9px] uppercase tracking-wider mb-0.5">Last Capture</div>
                <div className="text-white/80 text-[11px]">{highlights.lastCapture.sigil} {highlights.lastCapture.title}</div>
                <div className="text-white/40 text-[9px] mt-0.5">{formatEventTime(highlights.lastCapture.t)}</div>
              </div>
            )}
            {highlights.lastInstitution && (
              <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded">
                <div className="text-purple-400 text-[9px] uppercase tracking-wider mb-0.5">Last Institution</div>
                <div className="text-white/80 text-[11px]">{highlights.lastInstitution.sigil} {highlights.lastInstitution.title}</div>
                <div className="text-white/40 text-[9px] mt-0.5">{formatEventTime(highlights.lastInstitution.t)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {filteredEvents.length === 0 && (
          <div className="text-white/40 text-xs text-center py-8">
            No events yet. Keep simulating!
          </div>
        )}
        {filteredEvents.map((event) => {
          const typeInfo = EVENT_TYPE_LABELS[event.type];
          const isExpanded = expandedId === event.id;
          
          return (
            <div
              key={event.id}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-all cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : event.id)}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none">{event.sigil || '•'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-white/80 text-[11px] font-medium">{event.title}</span>
                    <span 
                      className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider"
                      style={{ 
                        backgroundColor: typeInfo.color + '15',
                        color: typeInfo.color 
                      }}
                    >
                      {typeInfo.label}
                    </span>
                  </div>
                  {event.detail && (
                    <div className="text-white/50 text-[10px] mt-0.5">{event.detail}</div>
                  )}
                  <div className="text-white/30 text-[9px] mt-1">{formatEventTime(event.t)}</div>
                </div>
              </div>
              
              {isExpanded && event.meta && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="text-white/40 text-[9px] uppercase tracking-wider mb-1">Metadata</div>
                  <pre className="text-white/60 text-[9px] font-mono overflow-x-auto">
                    {JSON.stringify(event.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
