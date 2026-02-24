// Undo system: ring buffer of snapshots
import { MicroState, MicroConfig } from '../sim/micro/microState';
import { InteractionMatrix, copyMatrix } from '../sim/micro/matrix';
import { FieldState } from '../sim/field/fieldState';
import { ReconfigState, SemanticArtifact } from '../sim/reconfig/reconfigState';

export interface Snapshot {
  timestamp: number;
  microConfig: MicroConfig;
  matrix: InteractionMatrix;
  baseMatrix: InteractionMatrix;
  artifacts: SemanticArtifact[];
}

export interface UndoBuffer {
  snapshots: Snapshot[];
  maxSnapshots: number;
  currentIndex: number;
}

export const createUndoBuffer = (): UndoBuffer => ({
  snapshots: [],
  maxSnapshots: 20,
  currentIndex: -1,
});

export const takeSnapshot = (
  buffer: UndoBuffer,
  microConfig: MicroConfig,
  matrix: InteractionMatrix,
  baseMatrix: InteractionMatrix,
  reconfig: ReconfigState,
  timestamp: number
): void => {
  // Deep copy matrix
  const matrixCopy: InteractionMatrix = {
    attract: matrix.attract.map(row => [...row]),
    radius: matrix.radius.map(row => [...row]),
    falloff: matrix.falloff?.map(row => [...row]) ?? Array(matrix.attract.length).fill(0).map(() => Array(matrix.attract.length).fill(1.2)),
  };

  const baseMatrixCopy: InteractionMatrix = {
    attract: baseMatrix.attract.map(row => [...row]),
    radius: baseMatrix.radius.map(row => [...row]),
    falloff: baseMatrix.falloff?.map(row => [...row]) ?? Array(baseMatrix.attract.length).fill(0).map(() => Array(baseMatrix.attract.length).fill(1.2)),
  };

  const snapshot: Snapshot = {
    timestamp,
    microConfig: { ...microConfig },
    matrix: matrixCopy,
    baseMatrix: baseMatrixCopy,
    artifacts: reconfig.artifacts.map(a => ({ ...a })),
  };

  buffer.snapshots.push(snapshot);
  if (buffer.snapshots.length > buffer.maxSnapshots) {
    buffer.snapshots.shift();
  }
  buffer.currentIndex = buffer.snapshots.length - 1;
};

export const canUndo = (buffer: UndoBuffer): boolean => {
  return buffer.snapshots.length > 1;
};

export const undo = (
  buffer: UndoBuffer,
  microConfig: MicroConfig,
  matrix: InteractionMatrix,
  baseMatrix: InteractionMatrix,
  reconfig: ReconfigState
): boolean => {
  if (!canUndo(buffer)) return false;

  // Remove current state
  buffer.snapshots.pop();
  buffer.currentIndex = buffer.snapshots.length - 1;

  const snapshot = buffer.snapshots[buffer.currentIndex];

  // Restore
  Object.assign(microConfig, snapshot.microConfig);
  copyMatrix(snapshot.matrix, matrix);
  copyMatrix(snapshot.baseMatrix, baseMatrix);
  reconfig.artifacts = snapshot.artifacts.map(a => ({ ...a }));

  return true;
};
