// ── Segment Creature — Aesthetic organic physics creatures ──────────────────────
// Chain of segments with PBD constraints, gravity, contact-based gait.
// Beautiful bioluminescent rendering — no cartoon eyes, pure organic forms.
// CPG oscillators + CEM++ optimizer.

import { ParticleWorld, CELL } from './particles'

// ── Data structures ────────────────────────────────────────────────────────────
export interface SegState {
  x: number; y: number
  vx: number; vy: number
  r: number
  mass: number
  isGrip: boolean
  gripped: boolean
}

export interface CreatureBP {
  id: string
  name: string
  icon: string
  segN: number
  segR: number[]
  segM: number[]
  gripIdx: number[]
  jointStiff: number
  hue: number
  lineage: number
  species: 'crawler' | 'swimmer' | 'serpent' | 'spider' | 'jellyfish' | 'centipede' | 'aerial'
  appendageCount: number
  biolum: boolean
  tailFade: boolean
  diet: 'herbivore' | 'carnivore' | 'omnivore'
}

export interface SegCreature {
  bp: CreatureBP
  segs: SegState[]
  phase: number
  alive: boolean
  energy: number
  age: number
  startX: number
  startY: number
  fitness: number
  policyParams: Float32Array
  lastProgress: number
  stuckTimer: number
  trail: { x: number; y: number; age: number }[]
  facingDir: 1 | -1
  lastAteTick: number    // tick when creature last ate food (for glow effect)
  ateAmount: number      // how much food eaten on last eat (for glow intensity)
  maxAge: number         // natural lifespan — creature dies when age exceeds this
  generation: number     // reproduction generation counter
}

// ── Constants ─────────────────────────────────────────────────────────────
export const GRAVITY  = 0.10
export const SIM_DT   = 1 / 60
export const TRAIN_BUDGET_MS = 8  // raised from 5.5 — allow more evals per frame
export const VMAX     = 0.9       // hard velocity cap — keeps the ecosystem contemplative

// ── Blueprints ─────────────────────────────────────────────────────────────────
let _bpLineage = 0
export const BLUEPRINTS: CreatureBP[] = [
  {
    id: 'slugcat', name: 'Slugcat', icon: '◉',
    segN: 6, segR: [2.6, 2.3, 2.1, 1.9, 1.6, 1.3],
    segM: [2.2, 1.8, 1.5, 1.3, 1.0, 0.8],
    gripIdx: [4, 5], jointStiff: 0.45, hue: 210, lineage: _bpLineage++,
    species: 'crawler', appendageCount: 3, biolum: true, tailFade: true,
    diet: 'omnivore',
  },
  {
    id: 'centipede', name: 'Centipede', icon: '⟐',
    segN: 10, segR: [1.6, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8, 1.4],
    segM: [1.4, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 0.9],
    gripIdx: [1, 3, 5, 7, 9], jointStiff: 0.55, hue: 28, lineage: _bpLineage++,
    species: 'centipede', appendageCount: 5, biolum: false, tailFade: false,
    diet: 'carnivore',
  },
  {
    id: 'crawler', name: 'Crawler', icon: '⬢',
    segN: 4, segR: [3.2, 3.0, 2.8, 2.4],
    segM: [3.5, 3.0, 2.5, 2.0],
    gripIdx: [2, 3], jointStiff: 0.5, hue: 340, lineage: _bpLineage++,
    species: 'crawler', appendageCount: 2, biolum: true, tailFade: true,
    diet: 'herbivore',
  },
  {
    id: 'serpent', name: 'Serpent', icon: '∿',
    segN: 8, segR: [1.5, 1.7, 1.8, 1.9, 1.9, 1.8, 1.6, 1.3],
    segM: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.8],
    gripIdx: [2, 4, 6, 7], jointStiff: 0.35, hue: 100, lineage: _bpLineage++,
    species: 'serpent', appendageCount: 0, biolum: true, tailFade: true,
    diet: 'omnivore',
  },
  {
    id: 'spider', name: 'Arachnid', icon: '✦',
    segN: 5, segR: [2.8, 2.5, 2.2, 1.9, 1.5],
    segM: [3.0, 2.5, 2.0, 1.5, 1.0],
    gripIdx: [3, 4], jointStiff: 0.60, hue: 270, lineage: _bpLineage++,
    species: 'spider', appendageCount: 4, biolum: true, tailFade: false,
    diet: 'carnivore',
  },
  {
    id: 'jellyfish', name: 'Medusa', icon: '◎',
    segN: 7, segR: [3.5, 3.0, 2.8, 2.5, 2.0, 1.5, 1.0],
    segM: [0.6, 0.5, 0.5, 0.4, 0.3, 0.3, 0.2],
    gripIdx: [], jointStiff: 0.25, hue: 185, lineage: _bpLineage++,
    species: 'jellyfish', appendageCount: 6, biolum: true, tailFade: true,
    diet: 'omnivore',
  },
  {
    id: 'leviathan', name: 'Leviathan', icon: '⬟',
    segN: 12, segR: [2.0, 2.4, 2.8, 3.0, 3.2, 3.2, 3.0, 2.8, 2.4, 2.0, 1.6, 1.2],
    segM: [1.8, 2.0, 2.2, 2.5, 2.8, 2.8, 2.5, 2.2, 2.0, 1.8, 1.4, 1.0],
    gripIdx: [3, 5, 7, 9], jointStiff: 0.40, hue: 55, lineage: _bpLineage++,
    species: 'serpent', appendageCount: 4, biolum: true, tailFade: true,
    diet: 'omnivore',
  },
  // ── New species ─────────────────────────────────────────────────────────────
  {
    id: 'manta', name: 'Manta Ray', icon: '🐟',
    segN: 5, segR: [2.2, 2.8, 3.4, 2.8, 1.8],
    segM: [0.8, 0.9, 1.0, 0.8, 0.5],
    gripIdx: [], jointStiff: 0.28, hue: 190, lineage: _bpLineage++,
    species: 'swimmer', appendageCount: 2, biolum: true, tailFade: true,
    diet: 'omnivore',
  },
  {
    id: 'bird', name: 'Skybird', icon: '🦅',
    segN: 4, segR: [1.6, 2.0, 1.8, 1.0],
    segM: [0.28, 0.35, 0.30, 0.18],
    gripIdx: [], jointStiff: 0.30, hue: 42, lineage: _bpLineage++,
    species: 'aerial', appendageCount: 2, biolum: false, tailFade: true,
    diet: 'carnivore',
  },
  {
    id: 'glowworm', name: 'Glowworm', icon: '〰',
    segN: 11,
    segR: [1.0, 1.1, 1.2, 1.3, 1.3, 1.3, 1.2, 1.2, 1.1, 1.0, 0.8],
    segM: [0.7, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.5],
    gripIdx: [2, 5, 8, 10], jointStiff: 0.38, hue: 140, lineage: _bpLineage++,
    species: 'serpent', appendageCount: 0, biolum: true, tailFade: true,
    diet: 'omnivore',
  },
  {
    id: 'starfish', name: 'Starfish', icon: '✶',
    segN: 5, segR: [2.0, 1.8, 1.8, 1.8, 1.8],
    segM: [2.2, 1.6, 1.6, 1.6, 1.6],
    gripIdx: [0, 1, 2, 3, 4], jointStiff: 0.52, hue: 22, lineage: _bpLineage++,
    species: 'crawler', appendageCount: 5, biolum: true, tailFade: false,
    diet: 'omnivore',
  },
  {
    id: 'dragonfly', name: 'Dragonfly', icon: '✈',
    segN: 3, segR: [1.2, 1.5, 0.8],
    segM: [0.22, 0.28, 0.16],
    gripIdx: [], jointStiff: 0.40, hue: 160, lineage: _bpLineage++,
    species: 'aerial', appendageCount: 2, biolum: false, tailFade: true,
    diet: 'carnivore',
  },
  {
    id: 'crab', name: 'Crab', icon: '🦀',
    segN: 4, segR: [2.6, 2.8, 2.8, 2.4],
    segM: [2.8, 3.0, 2.8, 2.2],
    gripIdx: [0, 1, 2, 3], jointStiff: 0.65, hue: 15, lineage: _bpLineage++,
    species: 'spider', appendageCount: 4, biolum: false, tailFade: false,
    diet: 'omnivore',
  },
]

// ── CPG Policy ─────────────────────────────────────────────────────────────────
export function paramCount(bp: CreatureBP): number {
  const nZones = Math.min(4, Math.ceil((bp.segN - 1) / 3))
  return 3 + nZones * 2
}

export function defaultParams(bp: CreatureBP): Float32Array {
  const n = paramCount(bp)
  const p = new Float32Array(n)
  p[0] = 1.6; p[1] = 0.55; p[2] = 0.20  // slow omega, gentle phase coupling
  const nZones = Math.min(4, Math.ceil((bp.segN - 1) / 3))
  for (let z = 0; z < nZones; z++) {
    p[3 + z * 2]     = 0.10 + Math.random() * 0.05  // soft default amplitude
    p[3 + z * 2 + 1] = (Math.random() - 0.5) * 0.04
  }
  return p
}

export function evalCPG(params: Float32Array, c: SegCreature): number[] {
  const omega  = params[0]
  const phiOff = params[1]
  const tiltG  = params[2]
  const segs = c.segs
  const n    = segs.length
  const nZones = Math.min(4, Math.ceil((n - 1) / 3))
  const tilt    = bodyTilt(c)
  const tiltCorr = -tiltG * tilt * 0.04
  const forces: number[] = []
  for (let i = 0; i < n; i++) {
    const zone = Math.min(nZones - 1, Math.floor(i * nZones / n))
    const pOff = 3 + zone * 2
    const amp   = params[pOff]     ?? 0.10
    const dcOff = params[pOff + 1] ?? 0
    const phase = omega * c.phase * 60 + i * phiOff
    forces.push((dcOff + amp * Math.sin(phase) + tiltCorr) * segs[i].mass)
  }
  return forces
}

// ── Physics helpers ────────────────────────────────────────────────────────────
export function headPos(c: SegCreature)  { return { x: c.segs[0].x, y: c.segs[0].y } }
export function bodyTilt(c: SegCreature) {
  const a = c.segs[0], b = c.segs[c.segs.length - 1]
  return Math.atan2(b.y - a.y, b.x - a.x)
}
export function comX(c: SegCreature): number {
  let mxSum = 0, mSum = 0
  for (const s of c.segs) { mxSum += s.x * s.mass; mSum += s.mass }
  return mxSum / mSum
}
export function comVelX(c: SegCreature): number {
  let mvx = 0, m = 0
  for (const s of c.segs) { mvx += s.vx * s.mass; m += s.mass }
  return mvx / m
}
export function contacts(c: SegCreature): number {
  return c.segs.filter(s => s.gripped).length
}

// ── Creature-creature soft collision ───────────────────────────────────────────
// Pushes overlapping creatures apart (head-to-head and seg-to-seg)
export function pushCreaturesApart(creatures: SegCreature[]): void {
  const n = creatures.length
  if (n < 2) return
  for (let i = 0; i < n; i++) {
    const a = creatures[i]
    if (!a.alive) continue
    const ah = a.segs[0]
    for (let j = i + 1; j < n; j++) {
      const b = creatures[j]
      if (!b.alive) continue
      const bh = b.segs[0]
      const dx = bh.x - ah.x, dy = bh.y - ah.y
      const d2 = dx * dx + dy * dy
      const minDist = (ah.r + bh.r) * 1.8
      if (d2 < minDist * minDist && d2 > 0.001) {
        const d = Math.sqrt(d2)
        const overlap = minDist - d
        const nx = dx / d, ny = dy / d
        const push = overlap * 0.15
        // Push both heads apart proportionally
        ah.vx -= nx * push; ah.vy -= ny * push
        bh.vx += nx * push; bh.vy += ny * push
      }
    }
  }
}

// ── Reproduction — spawn offspring when energy is high ─────────────────────────
export function tryReproduce(c: SegCreature): SegCreature | null {
  // Require high energy, minimum age, and random chance
  if (c.energy < 160 || c.age < 300 || !c.alive) return null
  if (Math.random() > 0.15) return null  // ~15% chance per check
  // Cost of reproduction
  c.energy -= 80
  const head = c.segs[0]
  // Offspring spawns nearby with slight mutation
  const offX = head.x + (Math.random() - 0.5) * 10
  const offY = head.y - 2
  const mutatedParams = c.policyParams.slice() as Float32Array
  // Slight mutation on each param
  for (let i = 0; i < mutatedParams.length; i++) {
    mutatedParams[i] += (Math.random() - 0.5) * 0.08
  }
  // Slightly mutate hue for visual diversity
  const childBP: CreatureBP = {
    ...c.bp,
    hue: ((c.bp.hue + Math.floor((Math.random() - 0.5) * 12)) % 360 + 360) % 360,
    lineage: c.bp.lineage + 1,
  }
  const child = spawnCreature(childBP, offX, offY, mutatedParams)
  child.energy = 80  // born with moderate energy
  child.generation = c.generation + 1
  child.facingDir = (Math.random() < 0.5 ? 1 : -1) as 1 | -1
  return child
}

// ── Creature factory ───────────────────────────────────────────────────────────
export function spawnCreature(bp: CreatureBP, sx: number, sy: number, params?: Float32Array): SegCreature {
  const segs: SegState[] = bp.segR.map((r, i) => ({
    x: sx + i * r * 1.65, y: sy,
    vx: 0, vy: 0, r,
    mass: bp.segM[i] ?? 1.0,
    isGrip: bp.gripIdx.includes(i),
    gripped: false,
  }))
  return {
    bp, segs, phase: 0,
    alive: true, energy: 120, age: 0,
    startX: sx, startY: sy,
    fitness: 0,
    policyParams: params ?? defaultParams(bp),
    lastProgress: sx, stuckTimer: 0,
    trail: [],
    facingDir: Math.random() < 0.5 ? 1 : -1,
    lastAteTick: 0,
    ateAmount: 0,
    maxAge: 800 + Math.floor(Math.random() * 600),  // natural lifespan 800-1400 ticks
    generation: 0,
  }
}

// ── Physics step ───────────────────────────────────────────────────────────────
export function stepCreature(c: SegCreature, motorForces: number[], grid: ParticleWorld, grav = GRAVITY): void {
  const segs = c.segs
  const n    = segs.length
  c.age++
  c.phase += SIM_DT

  // Record trail
  const head = segs[0]
  c.trail.push({ x: head.x, y: head.y, age: 0 })
  if (c.trail.length > 40) c.trail.shift()
  for (const t of c.trail) t.age++

  // ── Food seeking — scan for nearest food, steer facingDir towards it ─────────
  if (c.age % 12 === 0) {
    const food = grid.nearestFood(head.x, head.y, 60)
    if (food) {
      c.facingDir = food.x >= head.x ? 1 : -1
    }
  }

  const isAerial  = c.bp.species === 'aerial'
  const isSwimmer = c.bp.species === 'swimmer' || c.bp.species === 'jellyfish'

  // 1. Forces + velocity integration
  for (let i = 0; i < n; i++) {
    const s = segs[i]
    const mf = motorForces[i] ?? 0
    const cell = grid.cellAt(s.x | 0, s.y | 0)
    const inWater = cell === CELL.WATER

    // Aerial species float — much reduced gravity
    const effectiveGrav = isAerial ? grav * 0.12 : grav
    s.vy += effectiveGrav * 60 * SIM_DT
    s.vy += mf * SIM_DT * 60   // CPG vertical oscillation (body undulation)

    if (inWater) {
      s.vx *= 0.84; s.vy *= 0.84
      // Buoyancy counters gravity
      s.vy -= grav * (isAerial ? 1.2 : isSwimmer ? 0.85 : 0.55) * 60 * SIM_DT
      // Swimmers get horizontal thrust in water
      if (isSwimmer) {
        const swimPhase = (c.policyParams[0] ?? 1.6) * c.phase * 60 + i * 0.6
        s.vx += Math.sin(swimPhase) * 0.035 * c.facingDir * s.mass
      }
    }

    // Physics drag — environment-specific, NOT uniform air soup:
    //   • inWater: 0.84 damping already applied above — no double-damp
    //   • in air:  near-frictionless (VMAX = 0.9 cap is the real governor)
    //   • gripped: ground contact friction slows sliding
    const damp = inWater ? 1.0 : (s.gripped ? 0.84 : 0.997)
    s.vx *= damp; s.vy *= damp
    // Hard velocity cap — no frantic darting
    s.vx = Math.max(-VMAX, Math.min(VMAX, s.vx))
    s.vy = Math.max(-VMAX, Math.min(VMAX, s.vy))
    s.x += s.vx; s.y += s.vy
  }

  // 2. Distance constraints — PBD, 5 iterations (less rigid = more fluid movement)
  const stiff = Math.max(0.15, Math.min(0.85, c.bp.jointStiff))
  for (let iter = 0; iter < 5; iter++) {
    for (let i = 0; i < n - 1; i++) {
      const a = segs[i], b = segs[i + 1]
      const restLen = (a.r + b.r) * 0.85  // tighter chain = more efficient undulation
      const dx = b.x - a.x, dy = b.y - a.y
      const d  = Math.sqrt(dx * dx + dy * dy)
      if (d < 0.0001) continue
      const delta = ((d - restLen) / d) * stiff
      const totalM = a.mass + b.mass
      const wa = (b.mass / totalM), wb = (a.mass / totalM)
      a.x += dx * delta * wa; a.y += dy * delta * wa
      b.x -= dx * delta * wb; b.y -= dy * delta * wb
    }
  }

  // 3. Grid collision per segment
  for (const s of segs) {
    s.gripped = false
    const botY = s.y + s.r + 0.5
    const gx   = s.x | 0
    const botGY = botY | 0
    if (botGY >= 0 && botGY < grid.rows && grid.isSolid(gx, botGY)) {
      let topY = botGY
      while (topY > 1 && grid.isSolid(gx, topY - 1)) topY--
      const pen = (s.y + s.r) - topY
      if (pen > 0 && pen < s.r * 2.5) {
        s.y -= pen
        s.vy = Math.min(0, s.vy) * -0.10
        s.vx *= 0.76  // ground friction slows forward momentum
        s.gripped = s.isGrip
      }
    }
    const lx = (s.x - s.r - 0.5) | 0
    const rx = (s.x + s.r + 0.5) | 0
    const sy_ = s.y | 0
    if (lx >= 0 && grid.isSolid(lx, sy_)) { s.x += 0.6; s.vx = Math.abs(s.vx) * 0.3 }
    if (rx < grid.cols && grid.isSolid(rx, sy_)) { s.x -= 0.6; s.vx = -Math.abs(s.vx) * 0.3 }
    const topY2 = (s.y - s.r - 0.5) | 0
    if (topY2 >= 0 && grid.isSolid(gx, topY2)) {
      s.y = topY2 + s.r + 1
      s.vy = Math.abs(s.vy) * 0.25
    }
    s.x = Math.max(s.r + 1, Math.min(grid.cols - s.r - 1, s.x))
    s.y = Math.max(s.r + 1, Math.min(grid.rows - s.r - 1, s.y))
    const cellAt = grid.cellAt(s.x | 0, s.y | 0)
    if (cellAt === CELL.FIRE || cellAt === CELL.MAGMA) c.energy -= 0.25
    if (cellAt === CELL.ACID) c.energy -= 0.08
  }

  // 4-6. ── SPECIES-SPECIFIC LOCOMOTION ───────────────────────────────────────────
  // Each species has a biomechanically distinct movement pattern.
  // Serpentine undulation, arthropod metachronal wave, jellyfish jet propulsion,
  // inchworm peristalsis, avian flap-glide cycle, fish caudal oscillation.
  const omega    = c.policyParams[0] ?? 1.6
  const phiOff   = c.policyParams[1] ?? 0.55
  const driveAmp = Math.max(0.04, c.policyParams[3] ?? 0.10) * 0.55
  const headSeg  = segs[0]
  const t60      = c.phase * 60
  const sp       = c.bp.species

  switch (sp) {

    // ── SERPENT: Lateral undulation — visible S-curves, tail→head ───────────────
    case 'serpent': {
      for (let i = 0; i < n; i++) {
        const waveT = omega * t60 + i * phiOff * 2.2
        const prev = segs[Math.max(0, i - 1)], next = segs[Math.min(n - 1, i + 1)]
        const bodyAng = Math.atan2(next.y - prev.y, next.x - prev.x)
        const perp = bodyAng + Math.PI / 2
        const tFrac = i / (n - 1)
        const lateralAmp = driveAmp * (1.0 + tFrac * 2.5) * segs[i].mass
        segs[i].vx += Math.cos(perp) * Math.sin(waveT) * lateralAmp
        segs[i].vy += Math.sin(perp) * Math.sin(waveT) * lateralAmp
        segs[i].vx += Math.max(0, Math.sin(waveT + 0.9)) * driveAmp * 0.35 * c.facingDir * segs[i].mass
      }
      for (let i = 1; i < n; i++) {
        if (segs[i].gripped) headSeg.vx += c.facingDir * 0.035 * segs[i].mass
      }
      break
    }

    // ── SPIDER / CRAB: Alternating tetrapod gait ───────────────────────────────
    case 'spider': {
      const gaitCycle = Math.sin(omega * t60 * 1.6)
      const gripIdxs = c.bp.gripIdx
      for (let gi = 0; gi < gripIdxs.length; gi++) {
        const idx = gripIdxs[gi]
        const s = segs[idx]
        const isGroupA = gi % 2 === 0
        const active = isGroupA ? gaitCycle > 0 : gaitCycle < 0
        if (s.gripped && active) {
          headSeg.vx += c.facingDir * 0.11 * s.mass
          segs[Math.max(0, idx - 1)].vy -= 0.018
        }
        if (s.isGrip && !active) {
          s.vy -= 0.012 * Math.max(0, -Math.sin(omega * t60 * 1.6 + (isGroupA ? 0 : Math.PI)))
        }
      }
      headSeg.vy += Math.sin(omega * t60 * 3.2) * 0.01
      for (let i = 0; i < n; i++) {
        segs[i].vx += driveAmp * 0.15 * c.facingDir * segs[i].mass * Math.max(0, Math.sin(omega * t60 + i * 0.6))
      }
      break
    }

    // ── CENTIPEDE: Metachronal wave — legs activate in sequence tail→head ───────
    case 'centipede': {
      const gripIdxs = c.bp.gripIdx
      for (let gi = 0; gi < gripIdxs.length; gi++) {
        const idx = gripIdxs[gi]
        const s = segs[idx]
        const legPhase = omega * t60 * 1.2 + gi * phiOff * 1.8
        const power = Math.max(0, Math.sin(legPhase))
        if (s.gripped && power > 0.3) {
          const thrust = c.facingDir * 0.065 * s.mass * power
          segs[Math.max(0, idx - 1)].vx += thrust
          headSeg.vx += thrust * 0.25
        }
        if (s.isGrip && power < 0.2) {
          s.vy -= 0.018 * Math.max(0, Math.sin(legPhase + Math.PI))
        }
      }
      for (let i = 0; i < n; i++) {
        segs[i].vy += Math.sin(omega * t60 * 0.9 + i * 0.45) * driveAmp * 0.18 * segs[i].mass
      }
      break
    }

    // ── CRAWLER / STARFISH: Peristaltic inchworm — compress then extend ─────────
    case 'crawler': {
      const cycle = Math.sin(omega * t60 * 0.7)
      const mid = Math.floor(n / 2)
      if (cycle > 0) {
        for (let i = 0; i < mid; i++) segs[i].vx += c.facingDir * driveAmp * 1.4 * segs[i].mass
        for (let i = mid; i < n; i++) { if (segs[i].gripped) segs[i].vx *= 0.65 }
      } else {
        for (let i = mid; i < n; i++) segs[i].vx += c.facingDir * driveAmp * 1.8 * segs[i].mass
        for (let i = 0; i < mid; i++) { if (segs[i].gripped) segs[i].vx *= 0.65 }
      }
      const archStrength = Math.abs(Math.cos(omega * t60 * 0.7)) * 0.03
      for (let i = 1; i < n - 1; i++) {
        const midDist = 1 - Math.abs(i - mid) / Math.max(1, mid)
        segs[i].vy -= archStrength * midDist * segs[i].mass
      }
      for (let i = 1; i < n; i++) {
        if (segs[i].gripped) headSeg.vx += c.facingDir * 0.025 * segs[i].mass
      }
      break
    }

    // ── JELLYFISH: Bell contraction jet propulsion ─────────────────────────────
    case 'jellyfish': {
      const pulseRaw = Math.sin(omega * 0.45 * t60)
      let cmx = 0, cmy = 0, tmass = 0
      for (const s of segs) { cmx += s.x * s.mass; cmy += s.y * s.mass; tmass += s.mass }
      cmx /= tmass; cmy /= tmass
      if (pulseRaw > 0) {
        const strength = pulseRaw * 0.065
        for (const s of segs) { s.vx += (cmx - s.x) * strength; s.vy += (cmy - s.y) * strength }
        for (const s of segs) s.vy -= pulseRaw * 0.045 * s.mass
        headSeg.vx += c.facingDir * pulseRaw * 0.025
      } else {
        const relax = Math.abs(pulseRaw) * 0.018
        for (const s of segs) { s.vx += (s.x - cmx) * relax * 0.5; s.vy += (s.y - cmy) * relax * 0.3 }
      }
      for (let i = Math.floor(n * 0.55); i < n; i++) {
        segs[i].vy += 0.009; segs[i].vx += Math.sin(t60 * 0.6 + i * 0.9) * 0.009
      }
      break
    }

    // ── SWIMMER (Manta): Powerful tail-beat propulsion ─────────────────────────
    case 'swimmer': {
      const anyInWater = segs.some(s => grid.cellAt(s.x | 0, s.y | 0) === CELL.WATER)
      if (anyInWater) {
        const tailStart = Math.floor(n * 0.4)
        for (let i = tailStart; i < n; i++) {
          const tailPhase = omega * 1.8 * t60 + i * 0.9
          const prev = segs[Math.max(0, i - 1)], next = segs[Math.min(n - 1, i + 1)]
          const bodyAng = Math.atan2(next.y - prev.y, next.x - prev.x)
          const perp = bodyAng + Math.PI / 2
          const tailFrac = (i - tailStart) / Math.max(1, n - 1 - tailStart)
          const amplitude = driveAmp * 3.0 * segs[i].mass * (0.3 + tailFrac * 0.7)
          segs[i].vx += Math.cos(perp) * Math.sin(tailPhase) * amplitude
          segs[i].vy += Math.sin(perp) * Math.sin(tailPhase) * amplitude
        }
        headSeg.vx += c.facingDir * driveAmp * 0.55
      } else {
        const flopCycle = Math.sin(omega * t60 * 2.5)
        for (let i = Math.floor(n / 2); i < n; i++) {
          segs[i].vy -= Math.max(0, flopCycle) * 0.12 * segs[i].mass
          segs[i].vx += flopCycle * 0.04 * c.facingDir * segs[i].mass
        }
      }
      break
    }

    // ── AERIAL: Flap-glide cycle with visible wing beat ────────────────────────
    case 'aerial': {
      const flapPhase = omega * t60 * 1.1
      const flapCycle = Math.sin(flapPhase)
      if (flapCycle > -0.2) {
        const liftForce = Math.max(0, flapCycle) * 0.16
        for (const s of segs) s.vy -= liftForce * s.mass
        const forwardThrust = Math.max(0, flapCycle) * 0.065
        for (const s of segs) s.vx += forwardThrust * c.facingDir * s.mass
      } else {
        for (const s of segs) s.vy += 0.005 * s.mass
      }
      headSeg.vy += flapCycle * 0.025
      headSeg.vx += c.facingDir * 0.02
      segs[n - 1].vx -= Math.sin(flapPhase * 0.5) * 0.01 * c.facingDir
      break
    }

    // ── DEFAULT: Generic traveling wave + grip thrust ───────────────────────────
    default: {
      for (let i = 0; i < n; i++) {
        const wavePhase = omega * t60 + i * phiOff
        segs[i].vx += Math.max(0, Math.sin(wavePhase)) * driveAmp * c.facingDir * segs[i].mass
      }
      for (let i = 1; i < n; i++) {
        if (segs[i].gripped) {
          headSeg.vx += c.facingDir * 0.06 * segs[i].mass
          if (i > 1) segs[i - 1].vx += c.facingDir * 0.03 * segs[i].mass
        }
      }
      break
    }
  }

  // 7. Food eating — wider radius for better foraging
  const eaten = grid.consume(headSeg.x, headSeg.y, headSeg.r * 3.0)
  if (eaten > 0) {
    c.energy = Math.min(200, c.energy + eaten * 50)
    // Gentle feeding nudge (was 0.2 — caused speed bursts)
    headSeg.vx += c.facingDir * 0.04
    c.lastAteTick = c.age
    c.ateAmount = eaten
  }

  c.energy -= 0.015  // slightly slower energy drain
  if (c.energy <= 0) c.alive = false

  // 8. Stuck detection — flip direction if stuck too long
  const cx = comX(c)
  if (Math.abs(cx - c.lastProgress) < 0.08) {  // slightly more tolerant threshold
    c.stuckTimer++
    if (c.stuckTimer > 80) {  // flip sooner (was 120)
      c.facingDir = (c.facingDir * -1) as 1 | -1
      c.stuckTimer = 0
      c.lastProgress = cx
    }
  } else {
    c.stuckTimer = 0
    c.lastProgress = cx
  }
}

// ── Fitness function ───────────────────────────────────────────────────────────
export function computeFitness(c: SegCreature, task: TaskType): number {
  const progress    = comX(c) - c.startX
  const alive       = c.alive ? 5 : -5
  const contact     = contacts(c) > 0 ? 1 : -2
  const energyGain  = c.energy - 120   // positive if creature ate food
  const energyRatio = Math.max(0, Math.min(1, c.energy / 120))

  if (task === 'survive')
    return progress * 0.9 + alive + contact + energyRatio * 3

  if (task === 'forage')
    // Reward eating heavily; small movement bonus so it explores
    return energyGain * 0.22 + progress * 0.30 + alive + contact

  if (task === 'climb')
    // Reward moving UP (lower Y value = higher altitude)
    return (c.startY - c.segs[0].y) * 1.5 + alive + energyRatio * 2

  return progress + alive + contact
}

export type TaskType = 'survive' | 'forage' | 'climb'

// ── CEM++ Trainer ──────────────────────────────────────────────────────────────
export interface TrainStats {
  generation: number
  bestScore: number
  avgScore: number
  candidateIdx: number
  popSize: number
  running: boolean
}

export class CEMTrainer {
  private mean: Float32Array
  private std: Float32Array
  private _bp: CreatureBP
  private _grid: ParticleWorld
  private _sx: number; private _sy: number
  private _task: TaskType
  private candidates: { params: Float32Array; score: number }[] = []
  private evalCreature: SegCreature | null = null
  private evalIdx = 0
  private evalTick = 0
  private evalMaxTick = 240   // 4 seconds per candidate

  generation   = 0
  bestScore    = -Infinity
  bestParams:  Float32Array | null = null
  running      = false
  popSize      = 12
  eliteK       = 4

  constructor(bp: CreatureBP, grid: ParticleWorld, sx: number, sy: number, task: TaskType = 'survive') {
    this._bp = bp; this._grid = grid; this._sx = sx; this._sy = sy; this._task = task
    const pc = paramCount(bp)
    this.mean = defaultParams(bp).slice()
    this.std  = new Float32Array(pc).fill(0.35)
    this.std[0] = 0.5; this.std[1] = 0.4; this.std[2] = 0.2
  }

  start(popSize = 12, evalSec = 4): void {
    this.popSize = popSize; this.evalMaxTick = (evalSec * 60) | 0
    this.running = true; this._newRound()
  }
  stop(): void { this.running = false }

  step(): { improved: boolean } {
    if (!this.running) return { improved: false }
    const t0 = performance.now()
    let improved = false
    while (performance.now() - t0 < TRAIN_BUDGET_MS) {
      if (!this.evalCreature || this.evalIdx >= this.candidates.length) {
        this._update(); this._newRound(); this.generation++; improved = true; break
      }
      const cand = this.candidates[this.evalIdx]
      const forces = evalCPG(cand.params, this.evalCreature)
      stepCreature(this.evalCreature, forces, this._grid)
      this.evalTick++
      const stuck = this.evalTick > 90 && this.evalCreature.stuckTimer > 80
      if (!this.evalCreature.alive || stuck || this.evalTick >= this.evalMaxTick) {
        cand.score = computeFitness(this.evalCreature, this._task)
        if (cand.score > this.bestScore) {
          this.bestScore  = cand.score
          this.bestParams = new Float32Array(cand.params)
          improved        = true
        }
        this.evalIdx++
        if (this.evalIdx < this.candidates.length) {
          this.evalCreature = spawnCreature(this._bp, this._sx, this._sy, this.candidates[this.evalIdx].params)
          this.evalTick = 0
        }
      }
    }
    return { improved }
  }

  spawnChampion(): SegCreature | null {
    if (!this.bestParams) return null
    return spawnCreature(this._bp, this._sx, this._sy, this.bestParams.slice() as Float32Array)
  }

  get currentCandidate(): SegCreature | null { return this.evalCreature }

  getStats(): TrainStats {
    const scored = this.candidates.filter(c => isFinite(c.score))
    const avg    = scored.length > 0 ? scored.reduce((s, c) => s + c.score, 0) / scored.length : 0
    return {
      generation: this.generation, bestScore: this.bestScore, avgScore: avg,
      candidateIdx: this.evalIdx, popSize: this.popSize, running: this.running,
    }
  }

  changeGrid(grid: ParticleWorld): void { this._grid = grid }

  private _newRound(): void {
    this.candidates = Array.from({ length: this.popSize }, () => ({
      params: this._sample(), score: -Infinity,
    }))
    // For forage: ensure food is present near training area each round
    if (this._task === 'forage') {
      for (let dx = -20; dx <= 50; dx += 5) {
        for (let dy = -6; dy <= 4; dy += 3) {
          if (Math.random() < 0.45) {
            const fx = (this._sx + dx) | 0
            const fy = (this._sy + dy) | 0
            if (fx > 1 && fx < this._grid.cols - 1 && fy > 1 && fy < this._grid.rows - 1) {
              if (this._grid.cellAt(fx, fy) === 0) this._grid.set(fx, fy, CELL.FOOD)
            }
          }
        }
      }
    }
    this.evalCreature = spawnCreature(this._bp, this._sx, this._sy, this.candidates[0].params)
    this.evalIdx = 0; this.evalTick = 0
  }

  private _sample(): Float32Array {
    const p = new Float32Array(this.mean.length)
    for (let i = 0; i < p.length; i++) p[i] = this.mean[i] + gauss() * this.std[i]
    return p
  }

  private _update(): void {
    const scored = this.candidates.filter(c => isFinite(c.score)).sort((a, b) => b.score - a.score)
    if (scored.length === 0) return
    const elites = scored.slice(0, Math.max(2, this.eliteK))
    for (let i = 0; i < this.mean.length; i++) {
      let s = 0; for (const e of elites) s += e.params[i]
      this.mean[i] = s / elites.length
    }
    for (let i = 0; i < this.std.length; i++) {
      let v = 0; for (const e of elites) v += (e.params[i] - this.mean[i]) ** 2
      this.std[i] = Math.max(0.008, Math.sqrt(v / elites.length) * 1.05 + 0.003)
    }
  }
}

function gauss(): number {
  let u = 0, v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// ── Species registry ───────────────────────────────────────────────────────────
export interface Species {
  id: string
  bp: CreatureBP
  bestParams: Float32Array
  bestScore: number
  generation: number
  createdAt: number
  tags: string[]
}

let _speciesId = 1
export function saveSpecies(bp: CreatureBP, params: Float32Array, score: number, gen: number): Species {
  const tags: string[] = []
  if (score > 20)  tags.push('runner')
  if (score > 40)  tags.push('climber')
  if (bp.segN > 7) tags.push('crawler')
  if (bp.segN <= 4) tags.push('heavy')
  return {
    id: `sp-${_speciesId++}`,
    bp: { ...bp, lineage: bp.lineage + 1 },
    bestParams: params.slice() as Float32Array,
    bestScore: score, generation: gen, createdAt: Date.now(), tags,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ECOSYSTEM — Prey/Predator interactions, Ragdoll death, per-segment collision
// ═══════════════════════════════════════════════════════════════════════════════

/** Total mass of a creature */
export function totalMass(c: SegCreature): number {
  let m = 0; for (const s of c.segs) m += s.mass; return m
}

/** Carnivores/omnivores hunt smaller creatures; herbivores flee from predators */
export function interactCreatures(creatures: SegCreature[]): void {
  const n = creatures.length
  if (n < 2) return
  for (let i = 0; i < n; i++) {
    const a = creatures[i]
    if (!a.alive) continue
    const aDiet = a.bp.diet

    // Herbivores flee from nearby carnivores
    if (aDiet === 'herbivore') {
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const b = creatures[j]
        if (!b.alive || b.bp.diet === 'herbivore') continue
        const dx = a.segs[0].x - b.segs[0].x, dy = a.segs[0].y - b.segs[0].y
        const d2 = dx * dx + dy * dy
        if (d2 < 900 && d2 > 0.01) {
          const d = Math.sqrt(d2)
          const flee = 0.08 / (d * 0.05 + 1)
          a.segs[0].vx += (dx / d) * flee; a.segs[0].vy += (dy / d) * flee * 0.5
          a.facingDir = dx > 0 ? 1 : -1
        }
      }
      continue
    }

    // Carnivores/omnivores — hunt smaller creatures
    if (aDiet === 'carnivore' || aDiet === 'omnivore') {
      const aHead = a.segs[0], aMass = totalMass(a)
      let closest: SegCreature | null = null, closestD2 = Infinity
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const b = creatures[j]
        if (!b.alive) continue
        const bMass = totalMass(b)
        const sizeRatio = aDiet === 'carnivore' ? 0.95 : 0.65
        if (bMass >= aMass * sizeRatio) continue
        const dx = b.segs[0].x - aHead.x, dy = b.segs[0].y - aHead.y
        const d2 = dx * dx + dy * dy
        if (d2 < closestD2 && d2 < 2500) { closestD2 = d2; closest = b }
      }
      if (closest) {
        const dx = closest.segs[0].x - aHead.x, dy = closest.segs[0].y - aHead.y
        const d = Math.sqrt(closestD2)
        a.facingDir = dx > 0 ? 1 : -1
        const chase = 0.05 / (d * 0.03 + 1)
        aHead.vx += (dx / d) * chase; aHead.vy += (dy / d) * chase * 0.5
        // Bite — close range per-segment check
        for (const sa of a.segs) {
          for (const sb of closest.segs) {
            const bx = sb.x - sa.x, by = sb.y - sa.y, bd2 = bx * bx + by * by
            const biteR = (sa.r + sb.r) * 1.2
            if (bd2 < biteR * biteR) {
              const dmg = sa.mass * 0.8
              closest.energy -= dmg
              a.energy = Math.min(200, a.energy + dmg * 0.6)
              if (bd2 > 0.01) { const bd = Math.sqrt(bd2); sb.vx += (bx/bd)*0.3; sb.vy += (by/bd)*0.3 }
              a.lastAteTick = a.age; a.ateAmount = 1; break
            }
          }
        }
      }
    }
  }
}

/** Per-segment collision between creatures — full body physics */
export function collideCreatureSegments(creatures: SegCreature[]): void {
  const n = creatures.length
  if (n < 2) return
  for (let i = 0; i < n; i++) {
    const a = creatures[i]; if (!a.alive) continue
    for (let j = i + 1; j < n; j++) {
      const b = creatures[j]; if (!b.alive) continue
      const hDx = a.segs[0].x - b.segs[0].x, hDy = a.segs[0].y - b.segs[0].y
      if (hDx * hDx + hDy * hDy > 2500) continue
      for (const sa of a.segs) {
        for (const sb of b.segs) {
          const dx = sb.x - sa.x, dy = sb.y - sa.y, d2 = dx * dx + dy * dy
          const minD = (sa.r + sb.r) * 0.9
          if (d2 < minD * minD && d2 > 0.001) {
            const d = Math.sqrt(d2), overlap = minD - d
            const nx = dx / d, ny = dy / d, push = overlap * 0.12
            const totalM = sa.mass + sb.mass
            sa.vx -= nx * push * (sb.mass / totalM); sa.vy -= ny * push * (sb.mass / totalM)
            sb.vx += nx * push * (sa.mass / totalM); sb.vy += ny * push * (sa.mass / totalM)
          }
        }
      }
    }
  }
}

/** Step ragdoll physics for dead creatures — floppy body, gravity, no motor */
export function stepRagdoll(c: SegCreature, grid: ParticleWorld, grav = GRAVITY): void {
  const segs = c.segs; const n = segs.length
  c.phase += SIM_DT * 0.3
  for (const s of segs) {
    s.vy += grav * 60 * SIM_DT
    const inWater = grid.cellAt(s.x | 0, s.y | 0) === CELL.WATER
    if (inWater) { s.vx *= 0.88; s.vy *= 0.88; s.vy -= grav * 0.35 * 60 * SIM_DT }
    else { s.vx *= 0.992; s.vy *= 0.992 }
    s.vx = Math.max(-VMAX, Math.min(VMAX, s.vx)); s.vy = Math.max(-VMAX, Math.min(VMAX, s.vy))
    s.x += s.vx; s.y += s.vy
  }
  for (let iter = 0; iter < 2; iter++) {
    for (let i = 0; i < n - 1; i++) {
      const a = segs[i], b = segs[i + 1]; const restLen = (a.r + b.r) * 1.2
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy)
      if (d < 0.0001) continue
      const delta = ((d - restLen) / d) * 0.15; const totalM = a.mass + b.mass
      a.x += dx * delta * (b.mass / totalM); a.y += dy * delta * (b.mass / totalM)
      b.x -= dx * delta * (a.mass / totalM); b.y -= dy * delta * (a.mass / totalM)
    }
  }
  for (const s of segs) {
    s.gripped = false
    s.x = Math.max(s.r + 1, Math.min(grid.cols - s.r - 1, s.x))
    s.y = Math.max(s.r + 1, Math.min(grid.rows - s.r - 1, s.y))
    const gx = s.x | 0, botGY = (s.y + s.r + 0.5) | 0
    if (botGY >= 0 && botGY < grid.rows && grid.isSolid(gx, botGY)) {
      s.y = botGY - s.r - 0.5; s.vy = Math.min(0, s.vy) * -0.1; s.vx *= 0.6; s.gripped = true
    }
  }
}

/** Render a dead ragdoll — desaturated, fading */
export function drawRagdoll(ctx: CanvasRenderingContext2D, c: SegCreature, cellPx: number, fadeAge: number): void {
  const alpha = Math.max(0, 1 - fadeAge / 300) * 0.45
  if (alpha < 0.01) return
  drawCreature(ctx, c, cellPx, false, alpha)
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AESTHETIC ORGANIC RENDERING — Bioluminescent, flowing, no cartoon features
// ═══════════════════════════════════════════════════════════════════════════════

export function drawCreature(
  ctx: CanvasRenderingContext2D,
  c: SegCreature,
  cellPx: number,
  selected = false,
  alpha = 1.0,
): void {
  const segs = c.segs
  if (segs.length < 2) return
  const { hue, species, biolum, tailFade, appendageCount } = c.bp
  const energyFrac = Math.max(0, Math.min(1, c.energy / 120))
  const breathe = Math.sin(c.phase * 2.2) * 0.08 + 1.0

  ctx.save()

  // ── Trail (ghostly afterimage) ───────────────────────────────────────────
  if (c.trail.length > 3) {
    for (let i = 0; i < c.trail.length - 1; i++) {
      const t = c.trail[i]
      const a = Math.max(0, 1 - t.age / 40) * 0.15 * alpha
      if (a < 0.01) continue
      ctx.beginPath()
      ctx.arc(t.x, t.y, segs[0].r * cellPx * 0.4, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${hue},70%,55%,${a})`
      ctx.fill()
    }
  }

  // ── Appendages (organic limbs/tendrils/wings) ────────────────────────────
  if (appendageCount > 0) {
    _drawAppendages(ctx, c, cellPx, alpha)
  }

  // ── Body spline (smooth bezier body silhouette) ─────────────────────────
  _drawBodySpline(ctx, segs, cellPx, hue, energyFrac, alpha, biolum, tailFade, breathe, c.phase)

  // ── Grip glow (contact points) ──────────────────────────────────────────
  for (const s of segs) {
    if (s.gripped) {
      const sr = s.r * cellPx * 0.6
      ctx.beginPath()
      ctx.arc(s.x, s.y + s.r * cellPx * 0.5, sr, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${(hue + 130) % 360},90%,60%,${0.25 * alpha})`
      ctx.fill()
    }
  }

  // ── Head sensory organ ──────────────────────────────────────────────────
  const head = segs[0]
  const next = segs[1]
  const headAngle = Math.atan2(head.y - next.y, head.x - next.x)
  const senseR = head.r * cellPx * 0.15
  const senseD = head.r * cellPx * 0.5

  if (biolum) {
    ctx.shadowColor = `hsl(${hue},100%,80%)`
    ctx.shadowBlur = senseR * 6
  }

  const fx = head.x + Math.cos(headAngle) * senseD
  const fy = head.y + Math.sin(headAngle) * senseD
  ctx.beginPath()
  ctx.arc(fx, fy, senseR * breathe, 0, Math.PI * 2)
  ctx.fillStyle = `hsla(${hue},60%,85%,${0.7 * alpha * energyFrac})`
  ctx.fill()
  ctx.shadowBlur = 0

  // ── Low energy warning flash ────────────────────────────────────────────
  if (energyFrac < 0.35) {
    const flashRate = 1 + (0.35 - energyFrac) * 8
    const flashA = (Math.sin(c.phase * flashRate) * 0.5 + 0.5) * 0.4
    ctx.beginPath()
    ctx.arc(head.x, head.y, head.r * cellPx * 1.2, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(0,80%,50%,${flashA * alpha})`
    ctx.fill()
  }

  // ── High energy glow (well-fed creatures glow brighter) ─────────────────
  if (energyFrac > 0.8 && biolum) {
    const glowA = (energyFrac - 0.8) * 2.5 * 0.12  // max ~0.06
    ctx.beginPath()
    ctx.arc(head.x, head.y, head.r * cellPx * 2.5 * breathe, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${hue},80%,70%,${glowA * alpha})`
    ctx.fill()
  }

  // ── Food-eating glow (brief flash when creature just ate) ───────────────
  const eatRecency = c.age - c.lastAteTick
  if (eatRecency < 25 && c.lastAteTick > 0) {
    const eatGlow = Math.max(0, 1 - eatRecency / 25)
    const eatR = head.r * cellPx * (1.8 + c.ateAmount * 0.6) * eatGlow
    ctx.beginPath()
    ctx.arc(head.x, head.y, eatR, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(120,90%,65%,${0.18 * eatGlow * alpha})`
    ctx.fill()
    // Particle sparkle effect
    for (let i = 0; i < Math.min(4, c.ateAmount * 2); i++) {
      const sparkAngle = c.phase * 8 + i * 1.57
      const sparkDist = eatR * (0.5 + eatGlow * 0.5)
      const sx = head.x + Math.cos(sparkAngle) * sparkDist
      const sy = head.y + Math.sin(sparkAngle) * sparkDist
      ctx.beginPath()
      ctx.arc(sx, sy, 0.3 * eatGlow, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(100,100%,80%,${0.5 * eatGlow * alpha})`
      ctx.fill()
    }
  }

  // ── Direction indicator (subtle forward dot) ────────────────────────────
  const dirDot = head.r * cellPx * 1.8
  const dirX = head.x + Math.cos(headAngle) * dirDot * c.facingDir
  const dirY = head.y + Math.sin(headAngle) * dirDot * 0.3 * c.facingDir
  ctx.beginPath()
  ctx.arc(dirX, dirY, senseR * 0.4, 0, Math.PI * 2)
  ctx.fillStyle = `hsla(${hue},50%,70%,${0.15 * alpha * energyFrac})`
  ctx.fill()

  // ── Selected highlight ──────────────────────────────────────────────────
  if (selected) {
    ctx.strokeStyle = `hsla(${hue},80%,70%,${0.4 * alpha})`
    ctx.lineWidth = cellPx * 0.2
    ctx.setLineDash([cellPx * 0.5, cellPx * 0.3])
    ctx.beginPath()
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i]
      if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y)
    }
    ctx.stroke()
    ctx.setLineDash([])
  }

  ctx.restore()
}

// ── Smooth body spline ─────────────────────────────────────────────────────────
function _drawBodySpline(
  ctx: CanvasRenderingContext2D,
  segs: SegState[],
  cellPx: number,
  hue: number,
  energy: number,
  alpha: number,
  biolum: boolean,
  tailFade: boolean,
  breathe: number,
  phase: number,
): void {
  const n = segs.length
  if (n < 2) return

  const upperPts: { x: number; y: number }[] = []
  const lowerPts: { x: number; y: number }[] = []

  for (let i = 0; i < n; i++) {
    const s = segs[i]
    const nextS = segs[Math.min(i + 1, n - 1)]
    const prevS = segs[Math.max(i - 1, 0)]
    const angle = Math.atan2(nextS.y - prevS.y, nextS.x - prevS.x)
    const perp = angle + Math.PI / 2
    const segBreathe = 1 + Math.sin(phase * 2.2 + i * 0.5) * 0.06
    const r = s.r * cellPx * 0.9 * segBreathe
    upperPts.push({ x: s.x + Math.cos(perp) * r, y: s.y + Math.sin(perp) * r })
    lowerPts.push({ x: s.x - Math.cos(perp) * r, y: s.y - Math.sin(perp) * r })
  }

  ctx.beginPath()
  ctx.moveTo(upperPts[0].x, upperPts[0].y)
  for (let i = 1; i < upperPts.length; i++) {
    const prev = upperPts[i - 1], curr = upperPts[i]
    ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2)
  }
  ctx.lineTo(upperPts[n - 1].x, upperPts[n - 1].y)

  const tailS = segs[n - 1]
  ctx.quadraticCurveTo(
    tailS.x + (upperPts[n-1].x - tailS.x) * 0.3,
    tailS.y + 1, lowerPts[n - 1].x, lowerPts[n - 1].y,
  )

  for (let i = lowerPts.length - 2; i >= 0; i--) {
    const prev = lowerPts[i + 1], curr = lowerPts[i]
    ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2)
  }

  const headS = segs[0]
  ctx.quadraticCurveTo(
    headS.x - (headS.x - lowerPts[0].x) * 0.3,
    headS.y - 1, upperPts[0].x, upperPts[0].y,
  )
  ctx.closePath()

  const grad = ctx.createLinearGradient(segs[0].x, segs[0].y, segs[n-1].x, segs[n-1].y)
  const baseL = 18 + energy * 22
  const baseSat = 50 + energy * 25
  const tailAlpha = tailFade ? 0.35 : 0.75
  grad.addColorStop(0, `hsla(${hue},${baseSat}%,${baseL + 12}%,${0.85 * alpha})`)
  grad.addColorStop(0.4, `hsla(${hue},${baseSat}%,${baseL}%,${0.8 * alpha})`)
  grad.addColorStop(1, `hsla(${(hue + 20) % 360},${baseSat - 10}%,${baseL - 6}%,${tailAlpha * alpha})`)

  if (biolum) {
    ctx.shadowColor = `hsl(${hue},90%,65%)`
    ctx.shadowBlur = headS.r * cellPx * 2.5 * energy
  }
  ctx.fillStyle = grad
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.strokeStyle = `hsla(${hue},65%,${baseL + 20}%,${0.18 * alpha})`
  ctx.lineWidth = cellPx * 0.12
  ctx.stroke()

  for (let i = 1; i < n - 1; i += 2) {
    const s = segs[i]
    const prevS = segs[i - 1], nextS = segs[i + 1]
    const ang = Math.atan2(nextS.y - prevS.y, nextS.x - prevS.x)
    const perp = ang + Math.PI / 2
    const r = s.r * cellPx * 0.5
    ctx.beginPath()
    ctx.moveTo(s.x + Math.cos(perp) * r, s.y + Math.sin(perp) * r)
    ctx.lineTo(s.x - Math.cos(perp) * r, s.y - Math.sin(perp) * r)
    ctx.strokeStyle = `hsla(${(hue + 40) % 360},45%,${baseL + 15}%,${0.12 * alpha})`
    ctx.lineWidth = cellPx * 0.08
    ctx.stroke()
  }
}

// ── Appendages (limbs / tendrils / fins / wings) ───────────────────────────────
function _drawAppendages(
  ctx: CanvasRenderingContext2D,
  c: SegCreature,
  cellPx: number,
  alpha: number,
): void {
  const { hue, species, appendageCount } = c.bp
  const segs = c.segs
  const n = segs.length

  for (let a = 0; a < appendageCount; a++) {
    const segIdx = Math.min(n - 1, Math.floor((a + 1) * n / (appendageCount + 1)))
    const s = segs[segIdx]
    const prevS = segs[Math.max(0, segIdx - 1)]
    const nextS = segs[Math.min(n - 1, segIdx + 1)]
    const bodyAng = Math.atan2(nextS.y - prevS.y, nextS.x - prevS.x)
    const perp = bodyAng + Math.PI / 2

    const limbLen = s.r * cellPx * (
      species === 'spider'    ? 3.5 :
      species === 'centipede' ? 2.2 :
      species === 'jellyfish' ? 3.0 :
      species === 'aerial'    ? 4.5 :
      1.8
    )
    const wiggle = Math.sin(c.phase * (species === 'aerial' ? 9 : 3) + a * 1.7) * 0.4
    const gravity = species === 'jellyfish' ? 0.3 : species === 'aerial' ? -0.5 : -0.2

    for (const side of [-1, 1]) {
      const baseX = s.x + Math.cos(perp) * s.r * cellPx * 0.7 * side
      const baseY = s.y + Math.sin(perp) * s.r * cellPx * 0.7 * side
      const midAng = perp * side + wiggle + gravity
      const midX = baseX + Math.cos(midAng) * limbLen * 0.5
      const midY = baseY + Math.sin(midAng) * limbLen * 0.5
      const tipAng = midAng + wiggle * 0.6 + (species === 'jellyfish' ? 0.5 : species === 'aerial' ? -0.8 : -0.3)
      const tipX = midX + Math.cos(tipAng) * limbLen * 0.5
      const tipY = midY + Math.sin(tipAng) * limbLen * 0.5

      ctx.beginPath()
      ctx.moveTo(baseX, baseY)
      ctx.quadraticCurveTo(midX, midY, tipX, tipY)
      const limbWidth = species === 'jellyfish' ? 0.08 : species === 'spider' ? 0.15 : species === 'aerial' ? 0.30 : 0.2
      ctx.lineWidth = s.r * cellPx * limbWidth
      ctx.strokeStyle = `hsla(${hue},45%,30%,${(species === 'aerial' ? 0.22 : 0.5) * alpha})`
      ctx.lineCap = 'round'
      ctx.stroke()

      // Wing membrane for aerial species
      if (species === 'aerial') {
        ctx.beginPath()
        ctx.moveTo(baseX, baseY)
        ctx.lineTo(tipX, tipY)
        ctx.lineTo(s.x, s.y)
        ctx.closePath()
        ctx.fillStyle = `hsla(${hue},55%,60%,${0.09 * alpha})`
        ctx.fill()
      }

      if (s.isGrip || species === 'spider' || species === 'centipede') {
        ctx.beginPath()
        ctx.arc(tipX, tipY, s.r * cellPx * 0.15, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${(hue + 100) % 360},60%,50%,${0.4 * alpha})`
        ctx.fill()
      }
    }
  }
}