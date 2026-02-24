// Save/Load system for complete simulation state
import { MicroState, MicroConfig } from '../sim/micro/microState';
import { FieldState, FieldConfig } from '../sim/field/fieldState';
import { ReconfigState, ReconfigConfig } from '../sim/reconfig/reconfigState';
import { InteractionMatrix } from '../sim/micro/matrix';
import { Chronicle } from '../story/beats';

export interface SimulationSnapshot {
  version: string;
  timestamp: number;
  name: string;
  
  // Micro
  microState: {
    count: number;
    x: number[];
    y: number[];
    vx: number[];
    vy: number[];
    type: number[];
  };
  microConfig: MicroConfig;
  matrix: {
    size: number;
    data: number[][];
  };
  baseMatrix: {
    size: number;
    data: number[][];
  };
  
  // Field
  fieldState: {
    width: number;
    height: number;
    tension: number[];
    cohesion: number[];
    scarcity: number[];
    novelty: number[];
    mythic: number[];
  };
  fieldConfig: FieldConfig;
  
  // Reconfig
  reconfigState: ReconfigState;
  reconfigConfig: ReconfigConfig;
  
  // Story
  chronicle: Chronicle;
}

export const createSnapshot = (
  microState: MicroState,
  microConfig: MicroConfig,
  matrix: InteractionMatrix,
  baseMatrix: InteractionMatrix,
  fieldState: FieldState,
  fieldConfig: FieldConfig,
  reconfigState: ReconfigState,
  reconfigConfig: ReconfigConfig,
  chronicle: Chronicle,
  name: string = 'Snapshot'
): SimulationSnapshot => {
  return {
    version: '1.0',
    timestamp: Date.now(),
    name,
    microState: {
      count: microState.count,
      x: Array.from(microState.x.slice(0, microState.count)),
      y: Array.from(microState.y.slice(0, microState.count)),
      vx: Array.from(microState.vx.slice(0, microState.count)),
      vy: Array.from(microState.vy.slice(0, microState.count)),
      type: Array.from(microState.type.slice(0, microState.count)),
    },
    microConfig: { ...microConfig },
    matrix: {
      size: matrix.size,
      data: matrix.data.map(row => [...row]),
    },
    baseMatrix: {
      size: baseMatrix.size,
      data: baseMatrix.data.map(row => [...row]),
    },
    fieldState: {
      width: fieldState.width,
      height: fieldState.height,
      tension: Array.from(fieldState.tension),
      cohesion: Array.from(fieldState.cohesion),
      scarcity: Array.from(fieldState.scarcity),
      novelty: Array.from(fieldState.novelty),
      mythic: Array.from(fieldState.mythic),
    },
    fieldConfig: { ...fieldConfig },
    reconfigState: {
      artifacts: reconfigState.artifacts.map(a => ({ ...a })),
    },
    reconfigConfig: { ...reconfigConfig },
    chronicle: {
      beats: chronicle.beats.map(b => ({ ...b })),
    },
  };
};

export const restoreSnapshot = (
  snapshot: SimulationSnapshot,
  microState: MicroState,
  microConfig: MicroConfig,
  matrix: InteractionMatrix,
  baseMatrix: InteractionMatrix,
  fieldState: FieldState,
  fieldConfig: FieldConfig,
  reconfigState: ReconfigState,
  reconfigConfig: ReconfigConfig,
  chronicle: Chronicle
): void => {
  // Restore micro
  microState.count = snapshot.microState.count;
  microState.x.set(snapshot.microState.x);
  microState.y.set(snapshot.microState.y);
  microState.vx.set(snapshot.microState.vx);
  microState.vy.set(snapshot.microState.vy);
  microState.type.set(snapshot.microState.type);
  
  // Clear trail history
  if (microState.historyX && microState.historyY) {
    for (let h = 0; h < microState.historyLength; h++) {
      microState.historyX[h].fill(0);
      microState.historyY[h].fill(0);
    }
    microState.historyIndex = 0;
  }
  
  Object.assign(microConfig, snapshot.microConfig);
  
  // Restore matrix
  matrix.size = snapshot.matrix.size;
  for (let i = 0; i < snapshot.matrix.size; i++) {
    for (let j = 0; j < snapshot.matrix.size; j++) {
      matrix.data[i][j] = snapshot.matrix.data[i][j];
    }
  }
  
  // Restore base matrix (if available, for backwards compatibility)
  if (snapshot.baseMatrix) {
    baseMatrix.size = snapshot.baseMatrix.size;
    for (let i = 0; i < snapshot.baseMatrix.size; i++) {
      for (let j = 0; j < snapshot.baseMatrix.size; j++) {
        baseMatrix.data[i][j] = snapshot.baseMatrix.data[i][j];
      }
    }
  } else {
    // For old snapshots, copy matrix to baseMatrix
    baseMatrix.size = snapshot.matrix.size;
    for (let i = 0; i < snapshot.matrix.size; i++) {
      for (let j = 0; j < snapshot.matrix.size; j++) {
        baseMatrix.data[i][j] = snapshot.matrix.data[i][j];
      }
    }
  }
  
  // Restore field
  fieldState.width = snapshot.fieldState.width;
  fieldState.height = snapshot.fieldState.height;
  fieldState.tension.set(snapshot.fieldState.tension);
  fieldState.cohesion.set(snapshot.fieldState.cohesion);
  fieldState.scarcity.set(snapshot.fieldState.scarcity);
  fieldState.novelty.set(snapshot.fieldState.novelty);
  fieldState.mythic.set(snapshot.fieldState.mythic);
  
  Object.assign(fieldConfig, snapshot.fieldConfig);
  
  // Restore reconfig
  reconfigState.artifacts = snapshot.reconfigState.artifacts.map(a => ({ ...a }));
  Object.assign(reconfigConfig, snapshot.reconfigConfig);
  
  // Restore chronicle
  chronicle.beats = snapshot.chronicle.beats.map(b => ({ ...b }));
};

export const saveToFile = (snapshot: SimulationSnapshot): void => {
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `particle-life-${snapshot.name.replace(/\s+/g, '-')}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const loadFromFile = (file: File): Promise<SimulationSnapshot> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const snapshot = JSON.parse(json) as SimulationSnapshot;
        
        // Validate version
        if (!snapshot.version || snapshot.version !== '1.0') {
          reject(new Error('Incompatible snapshot version'));
          return;
        }
        
        resolve(snapshot);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

export const saveToLocalStorage = (snapshot: SimulationSnapshot, slot: number): void => {
  try {
    localStorage.setItem(`particle-life-save-${slot}`, JSON.stringify(snapshot));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    throw new Error('Failed to save (storage full?)');
  }
};

export const loadFromLocalStorage = (slot: number): SimulationSnapshot | null => {
  try {
    const json = localStorage.getItem(`particle-life-save-${slot}`);
    if (!json) return null;
    
    const snapshot = JSON.parse(json) as SimulationSnapshot;
    
    // Validate version
    if (!snapshot.version || snapshot.version !== '1.0') {
      return null;
    }
    
    return snapshot;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

export const listLocalStorageSaves = (): Array<{ slot: number; name: string; timestamp: number }> => {
  const saves: Array<{ slot: number; name: string; timestamp: number }> = [];
  
  for (let slot = 0; slot < 10; slot++) {
    try {
      const json = localStorage.getItem(`particle-life-save-${slot}`);
      if (json) {
        const snapshot = JSON.parse(json) as SimulationSnapshot;
        saves.push({
          slot,
          name: snapshot.name,
          timestamp: snapshot.timestamp,
        });
      }
    } catch (error) {
      // Skip invalid saves
    }
  }
  
  return saves;
};

export const deleteLocalStorageSave = (slot: number): void => {
  localStorage.removeItem(`particle-life-save-${slot}`);
};
