// ── Reflex Policy ─────────────────────────────────────────────────────────────
// targetAngle_j = w1*tilt + w2*vx + w3*contact + bias
// Purely reactive — no time dependency
import { Observations } from '../sensors'
import { RobotBlueprint } from '../types'

/**
 * params layout: [w_tilt, w_vx, w_contact, bias] × nJoints
 */
export function evalReflex(
  params: number[],
  obs: Observations,
  blueprint: RobotBlueprint,
): number[] {
  const motorJoints = blueprint.jointDefs.filter(j => j.motorEnabled)
  const nj = motorJoints.length
  const targets: number[] = []

  for (let i = 0; i < nj; i++) {
    const wTilt    = params[i * 4 + 0] ?? 0
    const wVx      = params[i * 4 + 1] ?? 0
    const wContact = params[i * 4 + 2] ?? 0
    const bias     = params[i * 4 + 3] ?? 0

    // Use foot contact of nearest foot (simplified: use avg)
    const contactSignal = obs.footContacts.length > 0
      ? obs.footContacts.reduce((a, b) => a + b, 0) / obs.footContacts.length
      : 0

    const angle = wTilt * obs.bodyTilt
               + wVx   * obs.comVx
               + wContact * contactSignal
               + bias

    const jd = motorJoints[i]
    targets.push(Math.max(jd.lowerLimit, Math.min(jd.upperLimit, angle)))
  }
  return targets
}

export function reflexParamCount(bp: RobotBlueprint): number {
  return bp.jointDefs.filter(j => j.motorEnabled).length * 4
}
