// ── Trainer — time-sliced CEM training loop ──────────────────────────────────
import { PhysicsWorld } from '../world'
import { spawnRobot, policyParamCount } from '../builder'
import {
  extractObservations, createFitnessTracker, updateFitnessTracker, computeEpisodeScore,
} from '../sensors'
import { evalOscillator, createOscillatorState } from '../controllers/oscillatorPolicy'
import { evalReflex } from '../controllers/reflexPolicy'
import { evalHybrid } from '../controllers/hybridPolicy'
import {
  sampleCandidates, updateCEM, fillGenStats, CEMState, CEMConfig, createCEMState,
} from './cem'
import { maybeEvolve, EvoConfig, EvoState, createEvoState } from './evolution'
import {
  RobotBlueprint, PolicyType, FitnessWeights, GenStats, TaskConfig,
} from '../types'

export interface TrainerConfig {
  episodeDt:    number
  episodeTime:  number
  budgetMs:     number
  popSize:      number
  eliteK:       number
  policyType:   PolicyType
  fitness:      FitnessWeights
  evo:          EvoConfig
  task:         TaskConfig
}

export const DEFAULT_TRAINER: TrainerConfig = {
  episodeDt:   0.025,
  episodeTime: 4.0,
  budgetMs:    5,
  popSize:     16,
  eliteK:      4,
  policyType:  'oscillator',
  fitness:     { wDx: 2.0, wUpright: 1.5, wEnergy: 0.5, wFalls: 3.0, wWobble: 0.5 },
  evo:         { enabled: false, mutateEveryNGen: 8, mutateStrength: 0.06, retrainGens: 3 },
  task:        null as any,
}

export interface TrainerState {
  candidates:   number[][]
  scores:       number[]
  dxArr:        number[]
  fallsArr:     number[]
  curIdx:       number
  curStep:      number
  curTracker:   ReturnType<typeof createFitnessTracker> | null
  curOscState:  ReturnType<typeof createOscillatorState> | null
  cem:          CEMState
  evo:          EvoState
  blueprint:    RobotBlueprint
  gen:          number
  running:      boolean
  championParams: number[]
  championScore:  number
  lastGenStats:   GenStats | null
  replayFrames:   Array<{ id: string; x: number; y: number; angle: number; footContact: boolean }[]>
}

export function createTrainerState(bp: RobotBlueprint, cfg: TrainerConfig): TrainerState {
  const cemCfg: CEMConfig = {
    popSize: cfg.popSize, eliteK: cfg.eliteK,
    stdInit: 0.6, stdMin: 0.04, stdDecay: 0.88, meanMoment: 0.72,
  }
  const nParams = policyParamCount(bp, cfg.policyType)
  const cem = createCEMState(nParams, cemCfg)
  return {
    candidates: [], scores: [], dxArr: [], fallsArr: [],
    curIdx: 0, curStep: 0,
    curTracker: null, curOscState: null,
    cem, evo: createEvoState(bp),
    blueprint: bp, gen: 0, running: true,
    championParams: new Array(nParams).fill(0),
    championScore: -Infinity, lastGenStats: null, replayFrames: [],
  }
}

// ── Per-frame tick (time-sliced, time-budget driven) ──────────────────────────
export function trainerTick(
  ts: TrainerState,
  cfg: TrainerConfig,
  evalWorld: PhysicsWorld,
): { generationComplete: boolean } {
  if (!ts.running) return { generationComplete: false }

  const cemCfg: CEMConfig = {
    popSize: cfg.popSize, eliteK: cfg.eliteK,
    stdInit: 0.6, stdMin: 0.04, stdDecay: 0.88, meanMoment: 0.72,
  }

  // Start new generation
  if (ts.candidates.length === 0) {
    ts.candidates = sampleCandidates(ts.cem, cfg.popSize)
    ts.scores     = new Array(cfg.popSize).fill(-1e9)
    ts.dxArr      = new Array(cfg.popSize).fill(0)
    ts.fallsArr   = new Array(cfg.popSize).fill(0)
    ts.curIdx     = 0
    ts.curStep    = 0
    ts.curTracker = null
    ts.curOscState = null
  }

  const deadline    = performance.now() + cfg.budgetMs
  const totalSteps  = Math.ceil(cfg.episodeTime / cfg.episodeDt)
  const motorJoints = ts.blueprint.jointDefs.filter(j => j.motorEnabled)
  const nMotor      = motorJoints.length

  while (performance.now() < deadline && ts.curIdx < cfg.popSize) {
    // Initialize episode
    if (ts.curStep === 0) {
      evalWorld.clear()
      evalWorld.gravity = { ...cfg.task.gravity }
      evalWorld.wind    = { ...cfg.task.wind }
      for (const p of cfg.task.platforms) evalWorld.addPlatform(p)
      spawnRobot(evalWorld, ts.blueprint, cfg.task.spawnX, cfg.task.spawnY)
      const root = evalWorld.getBody(ts.blueprint.rootBodyId)
      ts.curTracker  = createFitnessTracker(root?.x ?? 0)
      ts.curOscState = createOscillatorState(nMotor)
    }

    const params = ts.candidates[ts.curIdx]
    const obs    = extractObservations(evalWorld, ts.blueprint)

    let targets: number[]
    if (cfg.policyType === 'oscillator') {
      targets = evalOscillator(params, obs, ts.blueprint, ts.curOscState!, cfg.episodeDt)
    } else if (cfg.policyType === 'reflex') {
      targets = evalReflex(params, obs, ts.blueprint)
    } else {
      targets = evalHybrid(params, obs, ts.blueprint, ts.curOscState!, cfg.episodeDt)
    }

    // Apply motor targets
    for (let ji = 0; ji < nMotor; ji++) {
      const joint = evalWorld.getJoint(motorJoints[ji].id)
      if (joint) joint.motorTargetAngle = targets[ji] ?? 0
    }

    evalWorld.fastStep(cfg.episodeDt)
    if (ts.curTracker) {
      updateFitnessTracker(ts.curTracker, evalWorld, ts.blueprint, targets, cfg.episodeDt)
    }

    ts.curStep++

    if (ts.curStep >= totalSteps) {
      const result = ts.curTracker
        ? computeEpisodeScore(ts.curTracker, evalWorld, ts.blueprint, cfg.fitness)
        : { score: -10, dx: 0, uprightTime: 0, energyUsed: 0, falls: 0, wobble: 0 }

      ts.scores[ts.curIdx]   = result.score
      ts.dxArr[ts.curIdx]    = result.dx
      ts.fallsArr[ts.curIdx] = result.falls
      ts.curIdx++
      ts.curStep    = 0
      ts.curTracker = null
    }
  }

  // Generation complete
  if (ts.curIdx >= cfg.popSize) {
    updateCEM(ts.cem, ts.candidates, ts.scores, cemCfg)
    fillGenStats(ts.cem, ts.scores, ts.dxArr, ts.fallsArr)
    ts.lastGenStats = ts.cem.history[ts.cem.history.length - 1] ?? null

    if (ts.cem.bestScore > ts.championScore) {
      ts.championScore  = ts.cem.bestScore
      ts.championParams = [...ts.cem.bestParams]
    }
    ts.gen = ts.cem.gen

    // Morphology evolution check
    const { blueprint: newBp, cem: newCem, mutated } = maybeEvolve(
      ts.evo, ts.cem, cfg.evo, cemCfg,
    )
    if (mutated) { ts.blueprint = newBp; ts.cem = newCem }

    ts.candidates = []  // signal next gen start
    return { generationComplete: true }
  }

  return { generationComplete: false }
}

// ── Apply champion policy to live world joints ────────────────────────────────
export function applyChampion(
  ts: TrainerState,
  liveWorld: PhysicsWorld,
  cfg: TrainerConfig,
  obs: ReturnType<typeof extractObservations>,
  oscState: ReturnType<typeof createOscillatorState>,
  dt: number,
): void {
  const params = ts.championParams
  let targets: number[]
  if (cfg.policyType === 'oscillator') {
    targets = evalOscillator(params, obs, ts.blueprint, oscState, dt)
  } else if (cfg.policyType === 'reflex') {
    targets = evalReflex(params, obs, ts.blueprint)
  } else {
    targets = evalHybrid(params, obs, ts.blueprint, oscState, dt)
  }
  const motorJoints = ts.blueprint.jointDefs.filter(j => j.motorEnabled)
  for (let ji = 0; ji < motorJoints.length; ji++) {
    const joint = liveWorld.getJoint(motorJoints[ji].id)
    if (joint) joint.motorTargetAngle = targets[ji] ?? 0
  }
}
