// ── Robot Builder — blueprints + instantiation ───────────────────────────────
import { RobotBlueprint, BodyDef, JointDef, PolicyType, PolicyDNA } from './types'
import { PhysicsWorld, vrot } from './world'

// ── Helpers ───────────────────────────────────────────────────────────────────
function bd(
  id: string, shape: 'rect'|'circle',
  hw: number, hh: number, r: number,
  ox: number, oy: number, ia: number,
  density: number, friction: number, restitution: number,
  color: string, label: string, isFoot = false,
): BodyDef {
  return { id, shape, hw, hh, r, offsetX: ox, offsetY: oy, initAngle: ia,
           density, friction, restitution, colorTag: color, label, isFoot }
}
function jd(
  id: string, bA: string, bB: string,
  axA: number, ayA: number, axB: number, ayB: number,
  lo: number, hi: number, motor: boolean, torque: number,
  damp: number, label: string,
): JointDef {
  return {
    id, bodyAId: bA, bodyBId: bB,
    localAnchorA: { x: axA, y: ayA }, localAnchorB: { x: axB, y: ayB },
    lowerLimit: lo, upperLimit: hi,
    motorEnabled: motor, motorMaxTorque: torque, damping: damp, label,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BIPED — 4 motor joints (2 hips + 2 knees)
// ─────────────────────────────────────────────────────────────────────────────
const BIPED: RobotBlueprint = {
  id: 'biped', name: 'Biped', icon: '🚶',
  desc: 'Two-legged walker. 4 motor joints, 13 oscillator params.',
  bodyDefs: [
    bd('torso',   'rect',   0.22, 0.12, 0,  0,     1.10, 0, 3.5, 0.3, 0.05, '#5577ff', 'Torso'),
    bd('lthigh',  'rect',   0.06, 0.18, 0, -0.14,  0.70, 0, 1.8, 0.4, 0.05, '#ff8844', 'L.Thigh'),
    bd('lshin',   'rect',   0.05, 0.16, 0, -0.14,  0.28, 0, 1.8, 0.7, 0.05, '#ffaa22', 'L.Shin', true),
    bd('rthigh',  'rect',   0.06, 0.18, 0,  0.14,  0.70, 0, 1.8, 0.4, 0.05, '#44aaff', 'R.Thigh'),
    bd('rshin',   'rect',   0.05, 0.16, 0,  0.14,  0.28, 0, 1.8, 0.7, 0.05, '#22ccff', 'R.Shin', true),
  ],
  jointDefs: [
    jd('lhip',  'torso',  'lthigh', -0.14, -0.12,  0, 0.18, -1.0, 0.5,  true, 5.0, 1.2, 'L.Hip'),
    jd('lknee', 'lthigh', 'lshin',   0,    -0.18,  0, 0.16, -0.05, 1.6, true, 4.0, 1.0, 'L.Knee'),
    jd('rhip',  'torso',  'rthigh',  0.14, -0.12,  0, 0.18, -0.5,  1.0, true, 5.0, 1.2, 'R.Hip'),
    jd('rknee', 'rthigh', 'rshin',   0,    -0.18,  0, 0.16, -0.05, 1.6, true, 4.0, 1.0, 'R.Knee'),
  ],
  rootBodyId: 'torso',
}

// ─────────────────────────────────────────────────────────────────────────────
// QUADRUPED — 8 motor joints
// ─────────────────────────────────────────────────────────────────────────────
const QUAD: RobotBlueprint = {
  id: 'quadruped', name: 'Quadruped', icon: '🐾',
  desc: 'Four-legged creature. 8 motor joints, 25 oscillator params.',
  bodyDefs: [
    bd('body',  'rect', 0.32, 0.10, 0,  0,    1.00, 0, 3.0, 0.3, 0.05, '#66ff88', 'Body'),
    bd('flleg', 'rect', 0.05, 0.20, 0, -0.28, 0.65, 0, 1.5, 0.5, 0.05, '#00dd88', 'FL.Leg'),
    bd('flfoot','rect', 0.04, 0.15, 0, -0.28, 0.27, 0, 1.5, 0.7, 0.05, '#00ffaa', 'FL.Foot', true),
    bd('blleg', 'rect', 0.05, 0.20, 0,  0.28, 0.65, 0, 1.5, 0.5, 0.05, '#44dd44', 'BL.Leg'),
    bd('blfoot','rect', 0.04, 0.15, 0,  0.28, 0.27, 0, 1.5, 0.7, 0.05, '#66ff66', 'BL.Foot', true),
    bd('frleg', 'rect', 0.05, 0.20, 0, -0.14, 0.65, 0, 1.5, 0.5, 0.05, '#55ff44', 'FR.Leg'),
    bd('frfoot','rect', 0.04, 0.15, 0, -0.14, 0.27, 0, 1.5, 0.7, 0.05, '#88ff66', 'FR.Foot', true),
    bd('brleg', 'rect', 0.05, 0.20, 0,  0.14, 0.65, 0, 1.5, 0.5, 0.05, '#aaff44', 'BR.Leg'),
    bd('brfoot','rect', 0.04, 0.15, 0,  0.14, 0.27, 0, 1.5, 0.7, 0.05, '#ccff55', 'BR.Foot', true),
  ],
  jointDefs: [
    jd('flhip',  'body', 'flleg',  -0.28, -0.10,  0, 0.20, -0.8, 0.8, true, 4.5, 1.0, 'FL.Hip'),
    jd('flknee', 'flleg','flfoot',  0,    -0.20,  0, 0.15, -0.1, 1.2, true, 3.5, 0.8, 'FL.Knee'),
    jd('blhip',  'body', 'blleg',   0.28, -0.10,  0, 0.20, -0.8, 0.8, true, 4.5, 1.0, 'BL.Hip'),
    jd('blknee', 'blleg','blfoot',  0,    -0.20,  0, 0.15, -0.1, 1.2, true, 3.5, 0.8, 'BL.Knee'),
    jd('frhip',  'body', 'frleg',  -0.14, -0.10,  0, 0.20, -0.8, 0.8, true, 4.5, 1.0, 'FR.Hip'),
    jd('frknee', 'frleg','frfoot',  0,    -0.20,  0, 0.15, -0.1, 1.2, true, 3.5, 0.8, 'FR.Knee'),
    jd('brhip',  'body', 'brleg',   0.14, -0.10,  0, 0.20, -0.8, 0.8, true, 4.5, 1.0, 'BR.Hip'),
    jd('brknee', 'brleg','brfoot',  0,    -0.20,  0, 0.15, -0.1, 1.2, true, 3.5, 0.8, 'BR.Knee'),
  ],
  rootBodyId: 'body',
}

// ─────────────────────────────────────────────────────────────────────────────
// CRAWLER — 3 segments + tail (good for terrain)
// ─────────────────────────────────────────────────────────────────────────────
const CRAWLER: RobotBlueprint = {
  id: 'crawler', name: 'Crawler', icon: '🐛',
  desc: 'Segmented crawler. 3 joints, 10 oscillator params. Good on rough terrain.',
  bodyDefs: [
    bd('head',  'rect', 0.14, 0.10, 0, -0.38, 1.0, 0, 2.5, 0.5, 0.1, '#ff6644', 'Head'),
    bd('mid',   'rect', 0.16, 0.12, 0,  0,    1.0, 0, 2.5, 0.5, 0.1, '#ff8833', 'Mid',  true),
    bd('tail',  'rect', 0.14, 0.10, 0,  0.38, 1.0, 0, 2.5, 0.5, 0.1, '#ffaa22', 'Tail', true),
    bd('leg1',  'rect', 0.04, 0.14, 0, -0.38, 0.70, 0, 1.2, 0.7, 0.1, '#ff4422', 'Leg1', true),
    bd('leg2',  'rect', 0.04, 0.14, 0,  0.38, 0.70, 0, 1.2, 0.7, 0.1, '#ff5533', 'Leg2', true),
  ],
  jointDefs: [
    jd('neck',  'head', 'mid',   0.14, 0,  -0.16, 0, -0.6, 0.6, true, 3.0, 1.0, 'Neck'),
    jd('waist', 'mid',  'tail',  0.16, 0,  -0.14, 0, -0.6, 0.6, true, 3.0, 1.0, 'Waist'),
    jd('lleg',  'head', 'leg1',  0,   -0.10, 0, 0.14, -1.2, 0.2, true, 2.5, 0.8, 'L.Leg'),
    jd('rleg',  'tail', 'leg2',  0,   -0.10, 0, 0.14, -0.2, 1.2, true, 2.5, 0.8, 'R.Leg'),
  ],
  rootBodyId: 'head',
}

export const ROBOT_BLUEPRINTS: RobotBlueprint[] = [BIPED, QUAD, CRAWLER]
export const BLUEPRINT_MAP = new Map(ROBOT_BLUEPRINTS.map(b => [b.id, b]))

// ── Instantiate blueprint into PhysicsWorld ───────────────────────────────────
export function spawnRobot(
  world: PhysicsWorld,
  blueprint: RobotBlueprint,
  spawnX = 0,
  spawnY = 0,
): void {
  // Spawn all bodies
  for (const def of blueprint.bodyDefs) {
    world.addBody({
      id: def.id,
      x: spawnX + def.offsetX,
      y: spawnY + def.offsetY,
      angle: def.initAngle,
      vx: 0, vy: 0, omega: 0,
      shape: def.shape,
      hw: def.hw, hh: def.hh, r: def.r,
      density: def.density,
      friction: def.friction,
      restitution: def.restitution,
      isStatic: false,
      colorTag: def.colorTag,
      label: def.label,
      isFoot: def.isFoot,
      footContact: false,
    } as any)
  }
  // Spawn all joints
  for (const def of blueprint.jointDefs) {
    world.addJoint({
      id: def.id,
      bodyAId: def.bodyAId,
      bodyBId: def.bodyBId,
      localAnchorA: { ...def.localAnchorA },
      localAnchorB: { ...def.localAnchorB },
      lowerLimit: def.lowerLimit,
      upperLimit: def.upperLimit,
      motorEnabled: def.motorEnabled,
      motorMaxTorque: def.motorMaxTorque,
      motorTargetAngle: 0,
      damping: def.damping,
      label: def.label,
      currentAngle: 0,
      currentOmega: 0,
    })
  }
}

// ── Policy param count per blueprint ─────────────────────────────────────────
export function oscillatorParamCount(bp: RobotBlueprint): number {
  // 3 per motor joint (offset, amp, phase) + 1 global freq
  const motorJoints = bp.jointDefs.filter(j => j.motorEnabled).length
  return motorJoints * 3 + 1
}
export function reflexParamCount(bp: RobotBlueprint): number {
  // 4 per motor joint (w_tilt, w_vx, w_contact, bias)
  const motorJoints = bp.jointDefs.filter(j => j.motorEnabled).length
  return motorJoints * 4
}
export function hybridParamCount(bp: RobotBlueprint): number {
  return oscillatorParamCount(bp) + reflexParamCount(bp)
}
export function policyParamCount(bp: RobotBlueprint, type: PolicyType): number {
  if (type === 'oscillator') return oscillatorParamCount(bp)
  if (type === 'reflex')     return reflexParamCount(bp)
  return hybridParamCount(bp)
}

// ── Build initial DNA with sensible defaults ──────────────────────────────────
export function makeInitialDNA(bp: RobotBlueprint, type: PolicyType): PolicyDNA {
  const n = policyParamCount(bp, type)
  const motorJoints = bp.jointDefs.filter(j => j.motorEnabled).map(j => j.id)
  const params = new Array(n).fill(0)

  if (type === 'oscillator') {
    const nj = motorJoints.length
    // freq
    params[nj * 3] = 1.2
    // per joint
    for (let i = 0; i < nj; i++) {
      params[i * 3 + 0] = 0                  // offset
      params[i * 3 + 1] = 0.4                // amplitude
      params[i * 3 + 2] = (i * Math.PI / 2)  // phase (gait offset)
    }
  } else if (type === 'reflex') {
    for (let i = 0; i < params.length; i++) params[i] = 0
  } else {
    // hybrid: oscillator first, then reflex
    const nosc = oscillatorParamCount(bp)
    const nref = reflexParamCount(bp)
    const osc = makeInitialDNA(bp, 'oscillator').params
    for (let i = 0; i < nosc; i++) params[i] = osc[i]
    // reflex part: all zeros
  }

  return { type, params, jointIds: motorJoints }
}

// ── Mutate blueprint (morphology evolution) ───────────────────────────────────
export function mutateMorphology(bp: RobotBlueprint, strength = 0.08): RobotBlueprint {
  return {
    ...bp,
    id: `${bp.id}_mut_${Date.now() % 10000}`,
    bodyDefs: bp.bodyDefs.map(b => ({
      ...b,
      hw: Math.max(0.03, b.hw * (1 + (Math.random() - 0.5) * strength)),
      hh: Math.max(0.03, b.hh * (1 + (Math.random() - 0.5) * strength)),
      offsetX: b.offsetX + (Math.random() - 0.5) * strength * 0.3,
      offsetY: Math.max(0.1, b.offsetY + (Math.random() - 0.5) * strength * 0.2),
      density: Math.max(0.5, b.density + (Math.random() - 0.5) * strength),
    })),
    jointDefs: bp.jointDefs.map(j => ({
      ...j,
      lowerLimit: clampAngle(j.lowerLimit + (Math.random() - 0.5) * strength * 0.3),
      upperLimit: clampAngle(j.upperLimit + (Math.random() - 0.5) * strength * 0.3),
      motorMaxTorque: Math.max(1, j.motorMaxTorque + (Math.random() - 0.5) * strength * 2),
    })),
  }
}
function clampAngle(a: number): number {
  return Math.max(-Math.PI, Math.min(Math.PI, a))
}
