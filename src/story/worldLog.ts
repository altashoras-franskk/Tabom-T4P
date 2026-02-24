// WorldLog: Unified event stream for all emergent phenomena
// Replaces fragmented logging with single source of truth

export type WorldEventType =
  | 'beat'              // mutation/speciation/institution
  | 'achievement'       // unlocked achievement
  | 'challenge'         // challenge unlocked
  | 'organism_capture'  // codex capture
  | 'mitosis'           // division event
  | 'metamorphosis'     // type mutation
  | 'pattern'           // detected pattern (rule-based)
  | 'system';           // seed change, preset load, etc.

export type WorldEvent = {
  id: string;
  t: number;                 // sim time seconds (timeRef.elapsed)
  ts: number;                // Date.now() timestamp
  type: WorldEventType;
  title: string;
  detail?: string;
  sigil?: string;            // icon char
  meta?: Record<string, any>;
};

let _id = 0;

export type WorldLogState = {
  events: WorldEvent[];
  max: number;
};

export const createWorldLog = (max = 200): WorldLogState => ({ 
  events: [], 
  max 
});

export function addWorldEvent(log: WorldLogState, e: Omit<WorldEvent, 'id'|'ts'>): WorldEvent {
  const ev: WorldEvent = { 
    id: `ev_${_id++}`, 
    ts: Date.now(), 
    ...e 
  };
  log.events.unshift(ev);
  if (log.events.length > log.max) log.events.pop();
  return ev;
}

export function clearWorldLog(log: WorldLogState): void {
  log.events = [];
}

export function getEventsByType(log: WorldLogState, type: WorldEventType): WorldEvent[] {
  return log.events.filter(e => e.type === type);
}

export function getRecentEvents(log: WorldLogState, count: number): WorldEvent[] {
  return log.events.slice(0, count);
}

// Helper: format event for display
export function formatEventTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}
