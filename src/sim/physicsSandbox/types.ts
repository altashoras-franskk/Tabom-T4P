// ── Physics Sandbox Types ─────────────────────────────────────────────────────
export interface Vec2 { x: number; y: number }

// ─── Rigid Body ────────────────────────────────────────────────────────────────
export interface Body {
  id: string
  x: number; y: number
  angle: number
  vx: number; vy: number
  omega: number            // angular velocity rad/s
  mass: number; invMass: number
  inertia: number; invInertia: number
  shape: 'rect' | 'circle'
  hw: number; hh: number   // half-width, half-height for rect
  r: number                // radius for circle
  friction: number
  restitution: number
  isStatic: boolean
  colorTag: string
  label: string
  isFoot: boolean
  footContact: boolean
  // accumulated forces this substep
  fx: number; fy: number; torque: number
}

// ─── Hinge Joint ──────────────────────────────────────────────────────────────
export interface Joint {
  id: string
  bodyAId: string; bodyBId: string
  localAnchorA: Vec2; localAnchorB: Vec2
  lowerLimit: number; upperLimit: number
  motorEnabled: boolean
  motorMaxTorque: number
  motorTargetAngle: number   // set by policy each frame
  damping: number
  label: string
  // runtime
  currentAngle: number
  currentOmega: number
}

// ─── Static Terrain Platform ──────────────────────────────────────────────────
export interface Platform {
  x: number; y: number     // center
  w: number; h: number     // full width/height
  angle: number
  friction: number
  colorTag: string
}

// ─── Robot Blueprint ──────────────────────────────────────────────────────────
export interface BodyDef {
  id: string
  shape: 'rect' | 'circle'
  hw: number; hh: number
  r: number
  density: number
  friction: number
  restitution: number
  offsetX: number; offsetY: number  // relative to spawn origin
  initAngle: number
  colorTag: string
  label: string
  isFoot: boolean
}

export interface JointDef {
  id: string
  bodyAId: string; bodyBId: string
  localAnchorA: Vec2; localAnchorB: Vec2
  lowerLimit: number; upperLimit: number
  motorEnabled: boolean
  motorMaxTorque: number
  damping: number
  label: string
}

export interface RobotBlueprint {
  id: string
  name: string
  desc: string
  icon: string
  bodyDefs: BodyDef[]
  jointDefs: JointDef[]
  rootBodyId: string
}

// ─── Policy DNA ───────────────────────────────────────────────────────────────
export type PolicyType = 'oscillator' | 'reflex' | 'hybrid'

export interface PolicyDNA {
  type: PolicyType
  params: number[]
  jointIds: string[]   // ordered list of joints this policy controls
}

// ─── Task ─────────────────────────────────────────────────────────────────────
export type TaskId = 'flat' | 'ramp' | 'steps' | 'obstacles' | 'wind' | 'curriculum'

export interface TaskConfig {
  id: TaskId
  name: string
  icon: string
  platforms: Platform[]
  wind: Vec2
  timeLimit: number
  targetDir: 1 | -1
  spawnX: number
  spawnY: number
}

// ─── Fitness ──────────────────────────────────────────────────────────────────
export type FitnessPreset = 'distance' | 'stability' | 'efficiency' | 'allRounder'

export interface FitnessWeights {
  wDx: number
  wUpright: number
  wEnergy: number
  wFalls: number
  wWobble: number
}

export const FITNESS_PRESETS: Record<FitnessPreset, FitnessWeights> = {
  distance:   { wDx: 3.0, wUpright: 0.5,  wEnergy: 0.1, wFalls: 2.0, wWobble: 0.0 },
  stability:  { wDx: 1.0, wUpright: 3.0,  wEnergy: 0.2, wFalls: 5.0, wWobble: 1.0 },
  efficiency: { wDx: 1.5, wUpright: 1.0,  wEnergy: 2.0, wFalls: 3.0, wWobble: 0.5 },
  allRounder: { wDx: 2.0, wUpright: 1.5,  wEnergy: 0.5, wFalls: 3.0, wWobble: 0.5 },
}

// ─── Episode result ───────────────────────────────────────────────────────────
export interface EpisodeResult {
  score: number
  dx: number
  uprightTime: number
  energyUsed: number
  falls: number
  wobble: number
}

// ─── CEM state ────────────────────────────────────────────────────────────────
export interface GenStats {
  gen: number
  bestScore: number
  avgScore: number
  bestDx: number
  falls: number
}

export interface CEMState {
  mean: number[]
  std: number[]
  gen: number
  bestScore: number
  bestParams: number[]
  history: GenStats[]
}

// ─── Replay ───────────────────────────────────────────────────────────────────
export interface ReplayFrame {
  t: number
  bodies: Array<{ id: string; x: number; y: number; angle: number; footContact: boolean }>
}
