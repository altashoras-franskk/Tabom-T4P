// Detectors: analyze system state
import { FieldState, getFieldIndex } from '../field/fieldState';
import { MicroState } from '../micro/microState';

export interface DetectorResults {
  stableClusters: number;
  borderStrength: number;
  oscillation: number;
  scarcityCrisis: boolean;
  noveltyBurst: boolean;
  avgTension: number;
  avgCohesion: number;
  avgScarcity: number;
  avgNovelty: number;
  avgMythic: number;
}

export const runDetectors = (
  micro: MicroState,
  field: FieldState
): DetectorResults => {
  // Compute averages
  let sumTension = 0;
  let sumCohesion = 0;
  let sumScarcity = 0;
  let sumNovelty = 0;
  let sumMythic = 0;

  for (let i = 0; i < field.tension.length; i++) {
    sumTension += field.tension[i];
    sumCohesion += field.cohesion[i];
    sumScarcity += field.scarcity[i];
    sumNovelty += field.novelty[i];
    sumMythic += field.mythic[i];
  }

  const size = field.tension.length;
  const avgTension = sumTension / size;
  const avgCohesion = sumCohesion / size;
  const avgScarcity = sumScarcity / size;
  const avgNovelty = sumNovelty / size;
  const avgMythic = sumMythic / size;

  // Detect stable clusters (simplified: count high-cohesion cells)
  let stableClusters = 0;
  for (let i = 0; i < size; i++) {
    if (field.cohesion[i] > 0.12) {
      stableClusters++;
    }
  }

  // Detect borders (high tension + high density variance)
  // (use avgTension as a stable proxy; old thresholded version under-reported in low-density regimes)
  const borderStrength = Math.max(0, Math.min(1, avgTension * 1.25));

  // Detect oscillation (tension vs cohesion)
  const oscillation = Math.abs(avgTension - avgCohesion);

  // Scarcity crisis
  const scarcityCrisis = avgScarcity > 0.18;

  // Novelty burst
  const noveltyBurst = avgNovelty > 0.14;

  return {
    stableClusters,
    borderStrength,
    oscillation,
    scarcityCrisis,
    noveltyBurst,
    avgTension,
    avgCohesion,
    avgScarcity,
    avgNovelty,
    avgMythic,
  };
};

export const computeDiversity = (micro: MicroState, typesCount: number): number => {
  const counts = new Array(typesCount).fill(0);
  for (let i = 0; i < micro.count; i++) {
    counts[micro.type[i]]++;
  }

  let shannon = 0;
  for (let i = 0; i < typesCount; i++) {
    if (counts[i] > 0) {
      const p = counts[i] / micro.count;
      shannon -= p * Math.log2(p);
    }
  }

  return shannon / Math.log2(typesCount); // Normalized
};
