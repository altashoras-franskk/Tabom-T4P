// React hook for reactive world log updates
import { useState, useCallback } from 'react';
import { WorldLogState, createWorldLog, addWorldEvent, WorldEvent } from '../story/worldLog';

export const useWorldLog = () => {
  const [log] = useState<WorldLogState>(() => createWorldLog(250));
  const [, bump] = useState(0);

  const push = useCallback((e: Omit<WorldEvent, 'id'|'ts'>) => {
    const ev = addWorldEvent(log, e);
    bump(v => v + 1); // force reactive updates
    return ev;
  }, [log]);

  const clear = useCallback(() => {
    log.events = [];
    bump(v => v + 1);
  }, [log]);

  return { 
    log, 
    push, 
    clear,
    events: log.events 
  };
};
