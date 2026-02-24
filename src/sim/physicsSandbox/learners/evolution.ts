// ── Morphology Evolution ──────────────────────────────────────────────────────
// Optional: mutate blueprint every N generations and re-initialize policy
import { RobotBlueprint } from '../types'
import { mutateMorphology, oscillatorParamCount, makeInitialDNA } from '../builder'
import { CEMState, CEMConfig } from './cem'
import { createCEMState } from './cem'

export interface EvoConfig {
  enabled:         boolean
  mutateEveryNGen: number   // mutate blueprint every N generations
  mutateStrength:  number   // 0–1 scale for mutation magnitude
  retrainGens:     number   // gens to retrain after mutation before allowing another
}

export const DEFAULT_EVO: EvoConfig = {
  enabled:         false,
  mutateEveryNGen: 8,
  mutateStrength:  0.06,
  retrainGens:     3,
}

export interface EvoState {
  lastMutateGen:   number
  mutationCount:   number
  currentBlueprint: RobotBlueprint
}

export function createEvoState(bp: RobotBlueprint): EvoState {
  return { lastMutateGen: 0, mutationCount: 0, currentBlueprint: { ...bp } }
}

/**
 * Check if we should mutate this generation.
 * Returns new blueprint + reset CEM state if mutation happened.
 */
export function maybeEvolve(
  evo: EvoState,
  cem: CEMState,
  cfg: EvoConfig,
  cemCfg: CEMConfig,
): { blueprint: RobotBlueprint; cem: CEMState; mutated: boolean } {
  if (!cfg.enabled) {
    return { blueprint: evo.currentBlueprint, cem, mutated: false }
  }

  const sinceLastMutate = cem.gen - evo.lastMutateGen
  if (sinceLastMutate < cfg.mutateEveryNGen) {
    return { blueprint: evo.currentBlueprint, cem, mutated: false }
  }
  if (sinceLastMutate < cfg.mutateEveryNGen + cfg.retrainGens) {
    return { blueprint: evo.currentBlueprint, cem, mutated: false }
  }

  // Do mutation
  const newBp = mutateMorphology(evo.currentBlueprint, cfg.mutateStrength)
  evo.currentBlueprint = newBp
  evo.lastMutateGen = cem.gen
  evo.mutationCount++

  // Re-initialize CEM with new param count (structure might have changed)
  const dna = makeInitialDNA(newBp, 'oscillator')
  const newCEM = createCEMState(dna.params.length, cemCfg)
  // Warm-start mean from current best if param count matches
  if (cem.bestParams.length === newCEM.mean.length) {
    for (let i = 0; i < newCEM.mean.length; i++) {
      newCEM.mean[i] = cem.bestParams[i] * 0.5  // partial warm-start
    }
  }

  return { blueprint: newBp, cem: newCEM, mutated: true }
}
