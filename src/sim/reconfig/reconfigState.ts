// Reconfig state: detectors, operators, artifacts
export interface ReconfigState {
  cooldown: number;
  lastOperatorTime: number;
  artifacts: SemanticArtifact[];
}

export interface SemanticArtifact {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  duration: number;
  elapsed: number;
  effect: ArtifactEffect;
  sigil: string;
}

export interface ArtifactEffect {
  type: 'field' | 'matrix';
  fieldMod?: {
    layer: 'tension' | 'cohesion' | 'scarcity' | 'novelty' | 'mythic';
    delta: number;
  };
  matrixMod?: {
    reduceInterType: boolean;
    strength: number;
  };
}

export interface ReconfigConfig {
  interval: number; // seconds between reconfig ticks
  mutationStrength: number;
  speciationRate: number;
  institutionRate: number;
  operatorCooldown: number;
}

export const createReconfigState = (): ReconfigState => ({
  cooldown: 0,
  lastOperatorTime: 0,
  artifacts: [],
});

export const createReconfigConfig = (): ReconfigConfig => ({
  interval: 3.0, // Faster checks
  mutationStrength: 0.15,
  speciationRate: 0.6, // Higher chance of speciation
  institutionRate: 0.25,
  operatorCooldown: 2.0, // Shorter cooldown
});

export const updateArtifacts = (state: ReconfigState, dt: number): void => {
  for (let i = state.artifacts.length - 1; i >= 0; i--) {
    state.artifacts[i].elapsed += dt;
    if (state.artifacts[i].elapsed >= state.artifacts[i].duration) {
      state.artifacts.splice(i, 1);
    }
  }
};

let artifactIdCounter = 0;

export const createArtifact = (
  name: string,
  x: number,
  y: number,
  effect: ArtifactEffect,
  sigil: string
): SemanticArtifact => ({
  id: `artifact-${artifactIdCounter++}`,
  name,
  x,
  y,
  radius: 0.2,
  duration: 15,
  elapsed: 0,
  effect,
  sigil,
});
