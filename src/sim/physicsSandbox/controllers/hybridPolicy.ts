// ── Hybrid Policy ─────────────────────────────────────────────────────────────
// Blends oscillator + reflex with per-joint blend weight
// params = [oscillator params..., reflex params..., blend_0..blend_n]
import { Observations } from '../sensors'
import { RobotBlueprint } from '../types'
import { evalOscillator, createOscillatorState } from './oscillatorPolicy'
import type { OscillatorState } from './oscillatorPolicy'
import { evalReflex } from './reflexPolicy'
import { oscillatorParamCount } from '../builder'
import { reflexParamCount } from './reflexPolicy'

export type { OscillatorState }
export { createOscillatorState }

export function evalHybrid(
  params: number[],
  obs: Observations,
  blueprint: RobotBlueprint,
  oscState: OscillatorState,
  dt: number,
): number[] {
  const nOsc = oscillatorParamCount(blueprint)
  const nRef = reflexParamCount(blueprint)
  const nj   = blueprint.jointDefs.filter(j => j.motorEnabled).length

  const oscParams   = params.slice(0, nOsc)
  const refParams   = params.slice(nOsc, nOsc + nRef)
  const blendParams = params.slice(nOsc + nRef, nOsc + nRef + nj)

  const oscTargets = evalOscillator(oscParams, obs, blueprint, oscState, dt)
  const refTargets = evalReflex(refParams, obs, blueprint)

  const motorJoints = blueprint.jointDefs.filter(j => j.motorEnabled)
  return oscTargets.map((ot, i) => {
    const blend = Math.max(0, Math.min(1, (blendParams[i] ?? 0.5) + 0.5)) // sigmoid-like
    const angle = blend * ot + (1 - blend) * (refTargets[i] ?? 0)
    const jd = motorJoints[i]
    return Math.max(jd.lowerLimit, Math.min(jd.upperLimit, angle))
  })
}

export function hybridParamCount(bp: RobotBlueprint): number {
  const nj = bp.jointDefs.filter(j => j.motorEnabled).length
  return oscillatorParamCount(bp) + reflexParamCount(bp) + nj
}