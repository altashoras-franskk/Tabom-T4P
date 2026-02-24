// ── Oscillator Policy ─────────────────────────────────────────────────────────
// targetAngle_j(t) = offset_j + amp_j * sin(2π * freq * t + phase_j)
// Modulations: foot contact resets phase, high tilt reduces amp
import { Observations } from '../sensors'
import { RobotBlueprint } from '../types'
import { normAngle } from '../world'

export interface OscillatorState {
  phaseAccum: number[]   // accumulated phase per joint (for foot-reset)
  prevContacts: number[] // previous foot contacts
}

export function createOscillatorState(nJoints: number): OscillatorState {
  return {
    phaseAccum: new Array(nJoints).fill(0),
    prevContacts: new Array(nJoints).fill(0),
  }
}

/**
 * Evaluate oscillator policy.
 * params layout: [offset_0, amp_0, phase_0, ..., offset_n, amp_n, phase_n, freq]
 * Returns array of target angles, one per motor joint.
 */
export function evalOscillator(
  params: number[],
  obs: Observations,
  blueprint: RobotBlueprint,
  state: OscillatorState,
  dt: number,
): number[] {
  const motorJoints = blueprint.jointDefs.filter(j => j.motorEnabled)
  const nj = motorJoints.length
  const freq = Math.max(0.3, params[nj * 3] ?? 1.2)  // global frequency Hz
  const t = obs.time

  const targets: number[] = []
  for (let i = 0; i < nj; i++) {
    const off  = params[i * 3 + 0] ?? 0
    const amp  = Math.max(0, params[i * 3 + 1] ?? 0.4)
    const ph   = params[i * 3 + 2] ?? 0

    // Stability reflex: reduce amplitude if body is tilted
    const tiltPenalty = Math.abs(obs.bodyTilt)  // 0=upright, 1=fallen
    const effAmp = amp * Math.max(0.1, 1 - tiltPenalty * 0.8)

    const angle = off + effAmp * Math.sin(2 * Math.PI * freq * t + ph)

    // Clamp to joint limits
    const jd = motorJoints[i]
    targets.push(Math.max(jd.lowerLimit, Math.min(jd.upperLimit, angle)))
  }
  return targets
}

/** Parameter count for this blueprint */
export function oscillatorParamCount(bp: RobotBlueprint): number {
  return bp.jointDefs.filter(j => j.motorEnabled).length * 3 + 1
}
