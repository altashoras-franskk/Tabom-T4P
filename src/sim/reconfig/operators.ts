// Operators: structural changes to the system
import { InteractionMatrix, expandMatrix } from '../micro/matrix';
import { MicroState, MicroConfig } from '../micro/microState';
import { ReconfigState, createArtifact } from './reconfigState';
import { DetectorResults } from './detectors';
import { SeededRNG } from '../../engine/rng';

export interface Beat {
  time: number;
  type: 'mutation' | 'speciation' | 'institution';
  message: string;
  sigil: string;
}

export const runOperators = (
  micro: MicroState,
  microConfig: MicroConfig,
  matrix: InteractionMatrix,
  reconfig: ReconfigState,
  detectors: DetectorResults,
  mutationStrength: number,
  speciationRate: number,
  institutionRate: number,
  rng: SeededRNG,
  totalTime: number
): Beat | null => {
  // Check cooldown
  if (totalTime - reconfig.lastOperatorTime < 3) {
    return null;
  }

  // Decide which operator to run (weighted by rates)
  const roll = rng.next();
  
  // Matrix Mutation
  if (detectors.borderStrength > 0.15 && detectors.avgTension > 0.2 && roll < mutationStrength) {
    reconfig.lastOperatorTime = totalTime;
    
    // Mutate 2-4 random pairs
    const pairs = rng.int(2, 4);
    for (let p = 0; p < pairs; p++) {
      const i = rng.int(0, microConfig.typesCount - 1);
      const j = rng.int(0, microConfig.typesCount - 1);
      const delta = rng.range(-0.2, 0.2);
      matrix.attract[i][j] = Math.max(-1, Math.min(1, matrix.attract[i][j] + delta));
    }

    return {
      time: totalTime,
      type: 'mutation',
      message: 'Contact patterns shift',
      sigil: '◈',
    };
  }

  // Speciation - made easier to trigger
  if (detectors.stableClusters > 20 && roll < speciationRate && microConfig.typesCount < 16) {
    reconfig.lastOperatorTime = totalTime;
    
    // Add new species
    const oldCount = microConfig.typesCount;
    const newCount = oldCount + 1;
    
    // Update config FIRST
    microConfig.typesCount = newCount;
    
    // Then expand matrix
    expandMatrix(matrix, newCount, rng, microConfig.rmax);

    // Convert more particles to new type for visibility (10-20%)
    const motherType = rng.int(0, oldCount - 1);
    let converted = 0;
    const targetConversions = Math.floor(micro.count * (0.1 + rng.next() * 0.1));
    for (let i = 0; i < micro.count && converted < targetConversions; i++) {
      if (micro.type[i] === motherType && rng.next() < 0.5) {
        micro.type[i] = oldCount;
        converted++;
      }
    }

    return {
      time: totalTime,
      type: 'speciation',
      message: `⚘ Speciation! ${oldCount} → ${microConfig.typesCount} (${converted} converted)`,
      sigil: '⚘',
    };
  }

  // Institution (semantic artifact)
  if ((detectors.oscillation > 0.2 || detectors.avgMythic > 0.2) && roll < institutionRate) {
    reconfig.lastOperatorTime = totalTime;
    
    // Find high-mythic location
    let maxMythic = 0;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const idx = y * 16 + x;
        if (detectors.avgMythic > maxMythic) {
          maxMythic = detectors.avgMythic;
          maxX = x / 16 * 2 - 1;
          maxY = y / 16 * 2 - 1;
        }
      }
    }

    const artifact = createArtifact(
      'Taboo',
      maxX,
      maxY,
      {
        type: 'field',
        fieldMod: {
          layer: 'mythic',
          delta: 0.1,
        },
      },
      '⊛'
    );
    reconfig.artifacts.push(artifact);

    return {
      time: totalTime,
      type: 'institution',
      message: 'A taboo spreads',
      sigil: '⊛',
    };
  }

  return null;
};
