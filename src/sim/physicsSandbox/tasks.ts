// ── Task Definitions ─────────────────────────────────────────────────────────
import { TaskConfig, Platform, TaskId } from './types'

function plat(x: number, y: number, w: number, h: number, angle = 0, color = '#334455', friction = 0.7): Platform {
  return { x, y, w, h, angle, colorTag: color, friction }
}

// ── 1. Flat Walk ───────────────────────────────────────────────────────────────
const FLAT: TaskConfig = {
  id: 'flat', name: 'Flat Walk', icon: '🌱',
  platforms: [],  // just ground (y=0) is enough
  wind:     { x: 0, y: 0 },
  gravity:  { x: 0, y: -9.8 },
  timeLimit: 5,
  targetDir: 1,
  spawnX: -1, spawnY: 1.5,
}

// ── 2. Ramp Up ─────────────────────────────────────────────────────────────────
const RAMP: TaskConfig = {
  id: 'ramp', name: 'Ramp Up', icon: '⛰️',
  platforms: [
    plat(3.5, 0.55, 6, 0.2, 0.18, '#445566'),   // tilted ramp
    plat(7.5, 1.35, 2, 0.2, 0,    '#334455'),   // plateau
  ],
  wind:     { x: 0, y: 0 },
  gravity:  { x: 0, y: -9.8 },
  timeLimit: 6,
  targetDir: 1,
  spawnX: -1, spawnY: 1.5,
}

// ── 3. Steps ──────────────────────────────────────────────────────────────────
const STEPS: TaskConfig = {
  id: 'steps', name: 'Steps', icon: '🪜',
  platforms: [
    plat(2.5, 0.15, 2, 0.3,  0, '#44aa55'),
    plat(5.0, 0.40, 2, 0.3,  0, '#44aa55'),
    plat(7.5, 0.65, 2, 0.3,  0, '#44aa55'),
    plat(10,  0.90, 2, 0.3,  0, '#44aa55'),
  ],
  wind:     { x: 0, y: 0 },
  gravity:  { x: 0, y: -9.8 },
  timeLimit: 8,
  targetDir: 1,
  spawnX: -1, spawnY: 1.5,
}

// ── 4. Obstacles ──────────────────────────────────────────────────────────────
const OBSTACLES: TaskConfig = {
  id: 'obstacles', name: 'Obstacles', icon: '🧱',
  platforms: [
    plat(2,    0.2, 0.3, 0.4,  0, '#aa5544'),
    plat(4.5,  0.25, 0.3, 0.5, 0, '#aa5544'),
    plat(7,    0.2,  0.3, 0.4, 0, '#aa5544'),
    plat(9.5,  0.3,  0.3, 0.6, 0, '#aa5544'),
  ],
  wind:     { x: 0, y: 0 },
  gravity:  { x: 0, y: -9.8 },
  timeLimit: 6,
  targetDir: 1,
  spawnX: -1, spawnY: 1.5,
}

// ── 5. Push Wind ───────────────────────────────────────────────────────────────
const WIND: TaskConfig = {
  id: 'wind', name: 'Push Wind', icon: '💨',
  platforms: [],
  wind:     { x: -4.5, y: 0 },  // strong left wind
  gravity:  { x: 0, y: -9.8 },
  timeLimit: 5,
  targetDir: 1,
  spawnX: -1, spawnY: 1.5,
}

// ── 6. Curriculum (flat → ramp → steps auto-progression) ──────────────────────
export const CURRICULUM_STAGES: TaskConfig[] = [FLAT, RAMP, STEPS]

const CURRICULUM: TaskConfig = {
  id: 'curriculum', name: 'Curriculum', icon: '📚',
  platforms: [],  // swapped per stage
  wind:     { x: 0, y: 0 },
  gravity:  { x: 0, y: -9.8 },
  timeLimit: 5,
  targetDir: 1,
  spawnX: -1, spawnY: 1.5,
}

export const TASKS: TaskConfig[] = [FLAT, RAMP, STEPS, OBSTACLES, WIND, CURRICULUM]
export const TASK_MAP = new Map<TaskId, TaskConfig>(TASKS.map(t => [t.id, t]))

export function getTask(id: TaskId): TaskConfig {
  return TASK_MAP.get(id) ?? FLAT
}

// ── Curriculum: get stage by score threshold ──────────────────────────────────
export function getCurriculumStage(bestScore: number, gen: number): TaskConfig {
  if (gen < 5 || bestScore < 1.5)  return FLAT
  if (gen < 15 || bestScore < 3.0) return RAMP
  return STEPS
}
