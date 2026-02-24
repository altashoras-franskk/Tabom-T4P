// ── Sensors — extract observations from the physics world ───────────────────
import { PhysicsWorld, normAngle } from './world'
import { RobotBlueprint } from './types'

export interface Observations {
  bodyTilt: number           // torso angle, normalized [-1, 1]
  bodyOmega: number          // torso angular velocity, scaled
  comVx: number              // COM velocity x
  comVy: number              // COM velocity y
  heightAboveGround: number  // root body height
  jointAngles: number[]      // per motor joint, normalized
  jointOmegas: number[]      // per motor joint
  footContacts: number[]     // per foot (0 or 1)
  time: number               // elapsed sim time (for oscillator)
}

export function extractObservations(
  world: PhysicsWorld,
  blueprint: RobotBlueprint,
): Observations {
  const root = world.getBody(blueprint.rootBodyId)
  const motorJointIds = blueprint.jointDefs.filter(j => j.motorEnabled).map(j => j.id)
  const footBodyIds   = blueprint.bodyDefs.filter(b => b.isFoot).map(b => b.id)

  // COM
  let comX = 0, comY = 0, totalMass = 0, comVx = 0, comVy = 0
  for (const b of world.bodies.values()) {
    comX  += b.x    * b.mass
    comY  += b.y    * b.mass
    comVx += b.vx   * b.mass
    comVy += b.vy   * b.mass
    totalMass += b.mass
  }
  if (totalMass > 0) {
    comX /= totalMass; comY /= totalMass
    comVx /= totalMass; comVy /= totalMass
  }

  // Joint observations
  const jointAngles: number[] = []
  const jointOmegas: number[] = []
  for (const jid of motorJointIds) {
    const j = world.getJoint(jid)
    if (j) {
      jointAngles.push(j.currentAngle / Math.PI)         // [-1, 1]
      jointOmegas.push(Math.tanh(j.currentOmega * 0.2))  // bounded
    } else {
      jointAngles.push(0); jointOmegas.push(0)
    }
  }

  // Foot contacts
  const footContacts: number[] = footBodyIds.map(fid => {
    const b = world.getBody(fid)
    return b?.footContact ? 1 : 0
  })

  return {
    bodyTilt:           root ? normAngle(root.angle) / Math.PI : 0,
    bodyOmega:          root ? Math.tanh(root.omega * 0.15) : 0,
    comVx:              Math.tanh(comVx * 0.8),
    comVy:              Math.tanh(comVy * 0.5),
    heightAboveGround:  root ? Math.tanh((root.y - world.groundY) * 0.5) : 0,
    jointAngles,
    jointOmegas,
    footContacts,
    time: world.time,
  }
}

// ── Fitness tracking state ─────────────────────────────────────────────────────
export interface FitnessTracker {
  startX: number
  falls: number
  energyUsed: number
  tiltAccum: number
  steps: number
  prevRootY: number
}

export function createFitnessTracker(startX: number): FitnessTracker {
  return { startX, falls: 0, energyUsed: 0, tiltAccum: 0, steps: 0, prevRootY: 0 }
}

export function updateFitnessTracker(
  tracker: FitnessTracker,
  world: PhysicsWorld,
  blueprint: RobotBlueprint,
  torques: number[],
  dt: number,
): void {
  const root = world.getBody(blueprint.rootBodyId)
  if (!root) return

  // Fall detection: root y drops below 0.3
  if (root.y < 0.3) tracker.falls++

  // Energy used: sum of |torque| × |omega| × dt per joint
  const motorJointIds = blueprint.jointDefs.filter(j => j.motorEnabled).map(j => j.id)
  for (let i = 0; i < motorJointIds.length; i++) {
    const j = world.getJoint(motorJointIds[i])
    if (j) tracker.energyUsed += Math.abs(torques[i] ?? 0) * Math.abs(j.currentOmega) * dt
  }

  // Tilt accumulator (wobble measure)
  tracker.tiltAccum += Math.abs(normAngle(root.angle))
  tracker.steps++
  tracker.prevRootY = root.y
}

export function computeEpisodeScore(
  tracker: FitnessTracker,
  world: PhysicsWorld,
  blueprint: RobotBlueprint,
  weights: { wDx: number; wUpright: number; wEnergy: number; wFalls: number; wWobble: number },
): { score: number; dx: number; uprightTime: number; energyUsed: number; falls: number; wobble: number } {
  const root = world.getBody(blueprint.rootBodyId)
  const dx = root ? root.x - tracker.startX : 0
  const uprightTime = tracker.steps > 0
    ? Math.max(0, 1 - tracker.tiltAccum / (tracker.steps * Math.PI * 0.5))
    : 0
  const wobble = tracker.steps > 0 ? tracker.tiltAccum / tracker.steps : 0

  const score =
    weights.wDx      * dx
    + weights.wUpright * uprightTime
    - weights.wEnergy  * tracker.energyUsed * 0.1
    - weights.wFalls   * tracker.falls
    - weights.wWobble  * wobble

  return {
    score,
    dx,
    uprightTime,
    energyUsed: tracker.energyUsed,
    falls: tracker.falls,
    wobble,
  }
}
