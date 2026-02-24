// Metamorphosis System: Particles that mutate, evolve, and transform based on interactions
// Inspired by emergence in cellular automata and particle swarm evolution

import { MicroState, MicroConfig, FOOD_TYPE } from './microState';
import { InteractionMatrix } from './matrix';

// Lightweight metamorphosis that tracks interactions during force calculation
export const updateMetamorphosis = (
  state: MicroState,
  config: MicroConfig,
  matrix: InteractionMatrix,
  fieldInfluence: (x: number, y: number) => { entropy: number; volatility: number; nutrient: number },
  rng: { next: () => number; int: (min: number, max: number) => number },
  tick: number,
  onMutation?: () => void
): void => {
  const mutationRate = config.mutationRate;
  const typeStability = config.typeStability;

  for (let i = 0; i < state.count; i++) {
    const ti = state.type[i];
    if (ti === FOOD_TYPE || ti < 0 || ti >= config.typesCount) continue;

    // Increment age
    state.age[i]++;

    const field = fieldInfluence(state.x[i], state.y[i]);
    const entropy = field.entropy || 0;
    const volatility = field.volatility || 0;
    const nutrient = field.nutrient || 0.5;

    // A) SIZE EVOLUTION: particles grow/shrink based on energy
    const targetSize = 0.7 + state.energy[i] * 0.6; // 0.7-1.3 range
    const sizeSpeed = 0.02;
    state.size[i] += (targetSize - state.size[i]) * sizeSpeed;
    state.size[i] = Math.max(0.5, Math.min(2.0, state.size[i]));

    // B) MUTATION POTENTIAL: accumulates from various pressures
    // Pressure from high energy (readiness to evolve)
    const energyPressure = Math.max(0, (state.energy[i] - 1.5) / 1.5);

    // Pressure from field chaos
    const fieldPressure = (entropy * 0.5 + volatility * 0.3) * 0.3;

    // Pressure from age (old particles more likely to die/transform)
    const agePressure = Math.min(1.0, state.age[i] / 3600); // 60 seconds = full pressure

    // Accumulate mutation potential
    const pressureGain = (energyPressure * 0.4 + fieldPressure * 0.3 + agePressure * 0.3);
    state.mutationPotential[i] += pressureGain * 0.01;
    
    // Natural decay (stability)
    state.mutationPotential[i] *= typeStability;
    state.mutationPotential[i] = Math.max(0, Math.min(1, state.mutationPotential[i]));

    // C) TYPE MUTATION: roll for transformation
    const mutationChance = mutationRate * (1 + state.mutationPotential[i] * 10);
    
    if (rng.next() < mutationChance) {
      // Mutation triggered!
      const oldType = ti;
      let newType = oldType;

      // Rule 1: HIGH ENERGY → Evolve forward (evolution)
      if (state.energy[i] > 1.5) {
        newType = (oldType + 1) % config.typesCount;
      }
      // Rule 2: LOW ENERGY → Revert to "simpler" type (de-evolution)
      else if (state.energy[i] < 0.5) {
        newType = Math.max(0, oldType - 1);
      }
      // Rule 3: HIGH CHAOS FIELD → Random mutation (chaos-driven)
      else if (entropy > 0.6 || volatility > 0.6) {
        newType = rng.int(0, config.typesCount - 1);
      }
      // Rule 4: OLD AGE → Die and respawn as random type (rebirth)
      else if (state.age[i] > 1800) { // 30 seconds
        newType = rng.int(0, config.typesCount - 1);
        state.energy[i] = 1.0; // Reset energy
      }

      // Apply mutation
      if (newType !== oldType) {
        state.type[i] = newType;
        
        // Reset mutation state
        state.mutationPotential[i] = 0;
        state.age[i] = 0;
        
        // Consume some energy
        state.energy[i] *= 0.7;
        
        // Visual feedback: size pulse
        state.size[i] = Math.min(2.0, state.size[i] * 1.3);
        
        // Notify mutation callback
        if (onMutation) onMutation();
      }
    }

    // D) NUTRIENT ABSORPTION: particles gain energy from nutrient-rich fields
    if (nutrient > 0.6) {
      state.energy[i] += (nutrient - 0.6) * 0.002;
    }
    
    // Energy decay (metabolism)
    if (config.energyEnabled) {
      state.energy[i] *= (1 - config.energyDecay);
    }
    
    // Clamp energy
    state.energy[i] = Math.max(0.1, Math.min(3.0, state.energy[i]));
  }
};

// Visual helpers for rendering mutations
export const getMutationGlow = (mutationPotential: number): number => {
  // Returns 0-1 glow intensity
  return Math.sin(mutationPotential * Math.PI) * mutationPotential;
};

export const getEvolutionStage = (age: number, energy: number): 'infant' | 'adult' | 'elder' | 'transcendent' => {
  if (energy > 2.0) return 'transcendent';
  if (age > 600) return 'elder'; // 10 seconds
  if (age > 180) return 'adult'; // 3 seconds
  return 'infant';
};

