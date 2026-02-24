// ── Critter Ecosystem v2 — Body Plans + Physics + Visual DNA ──────────────────
// Each creature has a unique visual + behavioral genome. 5 body plans:
//   worm | biped | quad | fish | bird
// Creatures sense food, walk/swim/fly using plan-specific physics, reproduce.

import { ParticleWorld, CELL } from './particles'

// ── Body plan ──────────────────────────────────────────────────────────────────
export type BodyPlan = 'worm' | 'biped' | 'quad' | 'fish' | 'bird'

export const BODY_PLANS: { id: BodyPlan; icon: string; label: string; desc: string }[] = [
  { id: 'worm',  icon: '🐛', label: 'Worm',   desc: 'Sinusoidal crawler, any terrain'   },
  { id: 'biped', icon: '🚶', label: 'Biped',  desc: 'Walks on surfaces, 2 legs'         },
  { id: 'quad',  icon: '🐾', label: 'Quad',   desc: 'Fast runner, 4 legs'                },
  { id: 'fish',  icon: '🐟', label: 'Fish',   desc: 'Fastest in water, fins'             },
  { id: 'bird',  icon: '🦅', label: 'Bird',   desc: 'Floats, avoids ground, wings'       },
]

// ── Genome — visual + behavioral DNA ──────────────────────────────────────────
export interface Genome {
  bodyPlan:    BodyPlan
  freq:        number   // oscillator freq (0.4–4.0 Hz)
  amp:         number   // oscillation amplitude
  speed:       number   // base movement speed (grid/tick)
  turnRate:    number   // max turn/tick (rad)
  sense:       number   // food detection radius (grid cells)
  size:        number   // body scale (0.5–2.0)
  hue:         number   // primary color hue 0–360
  hue2:        number   // secondary hue (for pattern)
  pattern:     0|1|2    // 0=plain, 1=striped, 2=spotted
  saturation:  number   // color saturation 40–100%
  generation:  number
  lineage:     number   // parent genome ID for visual tracking
}

// ── Critter ────────────────────────────────────────────────────────────────────
export interface Critter {
  id:       number
  x:        number     // grid x (float)
  y:        number     // grid y (float)
  vx:       number     // horizontal velocity
  vy:       number     // vertical velocity
  angle:    number     // heading (rad)
  phase:    number     // oscillator phase
  energy:   number     // [0–220], dies at 0
  age:      number     // ticks alive
  alive:    boolean
  genome:   Genome
  trail:    { x: number; y: number }[]
  flash:    number     // flash counter for eat/reproduce
  onGround: boolean
  inWater:  boolean
}

let _gid = 1
let _cid  = 1

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v }
function norm(a: number): number {
  while (a > Math.PI)  a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

// ── Genome factory ─────────────────────────────────────────────────────────────
export function randomGenome(plan?: BodyPlan, gen = 0): Genome {
  const plans: BodyPlan[] = ['worm', 'biped', 'quad', 'fish', 'bird']
  const bp = plan ?? plans[(Math.random() * plans.length) | 0]
  // Speed varies by body plan archetype
  const baseSpeed = bp === 'bird' ? 0.55 : bp === 'fish' ? 0.45 : bp === 'quad' ? 0.5 : 0.35
  return {
    bodyPlan:   bp,
    freq:       0.6 + Math.random() * 2.4,
    amp:        0.3 + Math.random() * 1.2,
    speed:      baseSpeed + Math.random() * 0.4,
    turnRate:   0.04 + Math.random() * 0.1,
    sense:      14 + Math.random() * 32,
    size:       0.6 + Math.random() * 0.9,
    hue:        Math.random() * 360,
    hue2:       Math.random() * 360,
    pattern:    [0, 1, 2][(Math.random() * 3) | 0] as 0|1|2,
    saturation: 55 + Math.random() * 45,
    generation: gen,
    lineage:    _gid++,
  }
}

export function mutate(g: Genome): Genome {
  const m = (v: number, sd: number, lo: number, hi: number) =>
    clamp(v + (Math.random() - 0.5) * sd * 2, lo, hi)
  return {
    ...g,
    freq:       m(g.freq,     0.5,  0.3, 5.0),
    amp:        m(g.amp,      0.25, 0.1, 2.5),
    speed:      m(g.speed,    0.12, 0.1, 1.8),
    turnRate:   m(g.turnRate, 0.025, 0.01, 0.2),
    sense:      m(g.sense,    7, 8, 70),
    size:       m(g.size,     0.18, 0.4, 2.2),
    hue:        (g.hue + (Math.random() - 0.5) * 50 + 360) % 360,
    hue2:       (g.hue2 + (Math.random() - 0.5) * 40 + 360) % 360,
    pattern:    Math.random() < 0.1 ? ([0,1,2][(Math.random()*3)|0] as 0|1|2) : g.pattern,
    saturation: m(g.saturation, 8, 40, 100),
    generation: g.generation + 1,
    lineage:    g.lineage,  // inherited lineage
  }
}

export function spawnCritter(x: number, y: number, genome?: Genome, energy = 85): Critter {
  return {
    id: _cid++, x, y, vx: 0, vy: 0,
    angle: Math.random() * Math.PI * 2,
    phase: Math.random() * Math.PI * 2,
    energy: energy + Math.random() * 30,
    age: 0, alive: true,
    genome: genome ?? randomGenome(),
    trail: [],
    flash: 0,
    onGround: false,
    inWater: false,
  }
}

// ── Critter update ─────────────────────────────────────────────────────────────
export function updateCritters(
  critters: Critter[],
  particles: ParticleWorld,
  maxPop = 90,
): Critter[] {
  const newBorn: Critter[] = []

  for (const c of critters) {
    if (!c.alive) continue
    c.age++
    if (c.flash > 0) c.flash--
    c.phase += c.genome.freq * 0.09

    const cell = particles.cellAt(c.x, c.y)
    c.inWater  = cell === CELL.WATER
    const belowSolid = particles.isSolid(c.x, c.y + 1.2)
    c.onGround = belowSolid

    // ── Gravity / buoyancy by body plan ──────────────────────────────────────
    switch (c.genome.bodyPlan) {
      case 'biped':
      case 'quad':
        if (!belowSolid) {
          c.vy += 0.14  // gravity pull
        } else {
          c.vy = Math.min(0, c.vy) * 0.2  // ground friction
        }
        break
      case 'fish':
        if (!c.inWater && !particles.isPassable(c.x, c.y + 0.8)) {
          c.vy += 0.06  // slight gravity on land
        } else {
          c.vy *= 0.85  // water drag
        }
        break
      case 'bird':
        c.vy -= 0.025  // anti-gravity / lift
        c.vy *= 0.92
        if (c.y < 2) c.vy = Math.max(0, c.vy)
        break
      default:  // worm
        c.vy = 0
        break
    }

    // Apply vertical velocity
    const newY = clamp(c.y + c.vy, 1.5, particles.rows - 2.5)
    if (particles.isPassable(c.x, newY) || (c.genome.bodyPlan === 'bird' && !particles.isSolid(c.x, newY))) {
      c.y = newY
    } else {
      c.vy = 0
    }

    // ── Food sensing + steering ───────────────────────────────────────────────
    const food = particles.nearestFood(c.x, c.y, c.genome.sense)
    let desiredAngle = c.angle
    if (food) {
      desiredAngle = Math.atan2(food.y - c.y, food.x - c.x)
    } else {
      desiredAngle += (Math.random() - 0.5) * 0.4
    }

    const diff = norm(desiredAngle - c.angle)
    c.angle += clamp(diff, -c.genome.turnRate, c.genome.turnRate)

    // Oscillator lateral wiggle
    c.angle += Math.sin(c.phase) * c.genome.amp * 0.04

    // ── Speed by plan + terrain ───────────────────────────────────────────────
    const inWater = c.inWater
    const onGnd   = c.onGround
    let spd = c.genome.speed
    switch (c.genome.bodyPlan) {
      case 'worm':  spd *= inWater ? 0.7 : 1.0; break
      case 'biped': spd *= onGnd ? 1.2 : (inWater ? 0.4 : 0.2); break
      case 'quad':  spd *= onGnd ? 1.8 : (inWater ? 0.5 : 0.15); break
      case 'fish':  spd *= inWater ? 2.8 : 0.12; break
      case 'bird':  spd *= !onGnd ? 1.3 : 0.3; break
    }

    // ── Movement ─────────────────────────────────────────────────────────────
    const nx = c.x + Math.cos(c.angle) * spd
    const ny = c.y + Math.sin(c.angle) * spd
    if (particles.isPassable(nx, c.y)) c.x = clamp(nx, 1.5, particles.cols - 2.5)
    else if (particles.isPassable(c.x, ny)) {
      c.y = clamp(ny, 1.5, particles.rows - 2.5)
      c.angle = -c.angle + (Math.random() - 0.5) * 0.6
    } else {
      c.angle += Math.PI * (0.3 + Math.random() * 0.7)
    }

    // ── Trail ─────────────────────────────────────────────────────────────────
    const TLEN = c.genome.bodyPlan === 'worm' ? 18 : c.genome.bodyPlan === 'fish' ? 12 : 8
    c.trail.push({ x: c.x, y: c.y })
    if (c.trail.length > TLEN) c.trail.shift()

    // ── Energy drain ──────────────────────────────────────────────────────────
    c.energy -= 0.03 + spd * 0.012

    // Environmental hazards
    if (cell === CELL.FIRE || cell === CELL.MAGMA) { c.energy -= 5; c.flash = 8 }
    if (cell === CELL.ACID)                         { c.energy -= 2; c.flash = 4 }

    // ── Eat food ──────────────────────────────────────────────────────────────
    const eatR = c.genome.size * 1.8
    const eaten = particles.consume(c.x, c.y, eatR)
    if (eaten > 0) { c.energy += eaten * 42; c.flash = 6 }

    // ── Reproduction ──────────────────────────────────────────────────────────
    if (c.energy >= 195 && critters.length + newBorn.length < maxPop) {
      c.energy = 65
      const child = spawnCritter(
        c.x + (Math.random() - 0.5) * 5,
        c.y + (Math.random() - 0.5) * 5,
        mutate(c.genome), 60,
      )
      newBorn.push(child)
      c.flash = 14
    }

    // ── Death ─────────────────────────────────────────────────────────────────
    if (c.energy <= 0) {
      c.alive = false
      if (Math.random() < 0.45) particles.set(c.x | 0, c.y | 0, CELL.FOOD)
    }
  }

  return [...critters.filter(c => c.alive), ...newBorn]
}

// ── Rendering ──────────────────────────────────────────────────────────────────
export function drawCritters(
  ctx: CanvasRenderingContext2D,
  critters: Critter[],
  scaleX: number,
  scaleY: number,
  tick: number,
): void {
  const sc = Math.min(scaleX, scaleY)

  for (const c of critters) {
    if (!c.alive) continue
    ctx.save()
    const energy = clamp(c.energy / 200, 0, 1)
    const sx = c.x * scaleX
    const sy = c.y * scaleY
    const { hue, hue2, pattern, saturation, size, bodyPlan } = c.genome
    const bs = size * sc
    const flashColor = c.flash > 0 ? `hsl(60,100%,80%)` : `hsl(${hue},${saturation}%,65%)`

    switch (bodyPlan) {
      case 'worm':  _drawWorm(ctx,  c, scaleX, scaleY, sx, sy, bs, energy, hue, hue2, pattern, saturation, flashColor); break
      case 'biped': _drawBiped(ctx, c, sx, sy, bs, energy, hue, hue2, pattern, saturation, flashColor, tick); break
      case 'quad':  _drawQuad(ctx,  c, sx, sy, bs, energy, hue, hue2, pattern, saturation, flashColor, tick); break
      case 'fish':  _drawFish(ctx,  c, sx, sy, bs, energy, hue, hue2, pattern, saturation, flashColor); break
      case 'bird':  _drawBird(ctx,  c, sx, sy, bs, energy, hue, hue2, pattern, saturation, flashColor, tick); break
    }

    // Energy bar
    const bw = bs * 7
    const bx = sx - bw / 2
    const byBar = sy - bs * 5
    const barCol = energy > 0.6 ? '#00ff88' : energy > 0.3 ? '#ffcc00' : '#ff3322'
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.fillRect(bx - 0.5, byBar - 0.5, bw + 1, 2.5)
    ctx.fillStyle = barCol
    ctx.fillRect(bx, byBar, bw * energy, 1.8)

    // Gen label
    if (c.genome.generation > 0) {
      ctx.font = `${Math.max(5.5, bs * 1.8)}px monospace`
      ctx.textAlign = 'center'
      ctx.fillStyle = `hsla(${hue},80%,75%,0.5)`
      ctx.fillText(`G${c.genome.generation}`, sx, byBar - 3)
    }

    ctx.restore()
  }
}

// ── Per-plan draw functions ────────────────────────────────────────────────────

function _bodyColor(hue: number, sat: number, light: number, alpha: number, pattern: 0|1|2, hue2: number, idx: number): string {
  if (pattern === 0) return `hsla(${hue},${sat}%,${light}%,${alpha})`
  if (pattern === 1) return idx % 2 === 0 ? `hsla(${hue},${sat}%,${light}%,${alpha})` : `hsla(${hue2},${sat}%,${light * 0.8}%,${alpha})`
  // spotted
  const spot = (idx * 7) % 4 === 0
  return spot ? `hsla(${hue2},${sat}%,${light * 1.2}%,${alpha})` : `hsla(${hue},${sat}%,${light}%,${alpha})`
}

function _setGlow(ctx: CanvasRenderingContext2D, color: string, blur: number): void {
  ctx.shadowColor = color; ctx.shadowBlur = blur
}

function _drawWorm(
  ctx: CanvasRenderingContext2D,
  c: Critter, scaleX: number, scaleY: number,
  sx: number, sy: number, bs: number,
  energy: number, hue: number, hue2: number, pattern: 0|1|2, sat: number, glowColor: string,
): void {
  if (c.trail.length < 2) return
  const seg = c.trail.length

  for (let i = 0; i < seg; i++) {
    const t = c.trail[i]
    const frac = i / (seg - 1)
    const r = Math.max(1.5, bs * (0.8 + frac * 1.4))
    const isHead = frac > 0.82

    if (isHead) { _setGlow(ctx, glowColor, r * 3) }
    else ctx.shadowBlur = 0

    ctx.beginPath()
    ctx.arc(t.x * scaleX, t.y * scaleY, r, 0, Math.PI * 2)
    ctx.fillStyle = _bodyColor(hue, sat, 32 + frac * 28, 0.5 + frac * 0.4, pattern, hue2, i)
    ctx.fill()
  }

  // Eyes on head
  ctx.shadowBlur = 0
  const hw = c.trail[c.trail.length - 1]
  _drawEyes(ctx, hw.x * scaleX, hw.y * scaleY, c.angle, bs * 0.55, bs * 1.4, energy)
}

function _drawBiped(
  ctx: CanvasRenderingContext2D,
  c: Critter, sx: number, sy: number, bs: number,
  energy: number, hue: number, hue2: number, pattern: 0|1|2, sat: number, glowColor: string,
  tick: number,
): void {
  const bodyW = bs * 1.6, bodyH = bs * 2.2
  const legLen = bs * 3.5
  const legPhase = Math.sin(c.phase) * 0.7

  // Legs
  ctx.lineWidth = Math.max(1, bs * 0.7)
  ctx.strokeStyle = `hsla(${hue},${sat}%,45%,${energy * 0.85 + 0.1})`
  ctx.shadowBlur = 0
  for (const side of [-1, 1] as const) {
    const lp = legPhase * side
    const hipX = sx + Math.cos(c.angle + Math.PI / 2) * bodyW * 0.45 * side
    const hipY = sy + bodyH * 0.4
    const kneeX = hipX + Math.sin(lp) * legLen * 0.55
    const kneeY = hipY + Math.abs(Math.cos(lp)) * legLen * 0.45
    const footX = kneeX + Math.cos(c.angle + lp * 0.3) * legLen * 0.4
    const footY = kneeY + legLen * 0.35
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke()
  }

  // Body
  _setGlow(ctx, glowColor, bs * 2.5)
  ctx.beginPath()
  ctx.ellipse(sx, sy, bodyW, bodyH, c.angle * 0.5, 0, Math.PI * 2)
  ctx.fillStyle = _bodyColor(hue, sat, 40, energy * 0.75 + 0.1, pattern, hue2, 0)
  ctx.fill()

  // Head
  const headR = bs * 1.1
  ctx.beginPath()
  ctx.arc(sx + Math.cos(c.angle) * bodyH * 0.75, sy + Math.sin(c.angle) * bodyH * 0.75, headR, 0, Math.PI * 2)
  ctx.fillStyle = _bodyColor(hue, sat, 52, energy * 0.85 + 0.1, pattern, hue2, 1)
  ctx.fill()

  _drawEyes(ctx, sx + Math.cos(c.angle) * bodyH * 0.75, sy + Math.sin(c.angle) * bodyH * 0.75, c.angle, bs * 0.45, bs * 0.9, energy)
}

function _drawQuad(
  ctx: CanvasRenderingContext2D,
  c: Critter, sx: number, sy: number, bs: number,
  energy: number, hue: number, hue2: number, pattern: 0|1|2, sat: number, glowColor: string,
  tick: number,
): void {
  const bodyW = bs * 2.8, bodyH = bs * 1.5
  const legLen = bs * 2.8

  // 4 legs
  ctx.lineWidth = Math.max(1, bs * 0.65)
  ctx.strokeStyle = `hsla(${hue},${sat}%,40%,${energy * 0.8 + 0.1})`
  ctx.shadowBlur = 0
  const legPairs = [[-bodyW * 0.55, 0.6], [bodyW * 0.55, -0.6]] // front/back phases
  for (const [xOff, phaseOff] of legPairs) {
    for (const side of [-1, 1] as const) {
      const lp = Math.sin(c.phase + phaseOff) * 0.8 * side
      const hipX = sx + xOff
      const hipY = sy + bodyH * 0.4
      const footX = hipX + Math.sin(lp) * legLen * 0.6
      const footY = hipY + Math.abs(Math.cos(lp)) * legLen * 0.45 + legLen * 0.35
      ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(footX, footY); ctx.stroke()
    }
  }

  // Body
  _setGlow(ctx, glowColor, bs * 2)
  ctx.beginPath()
  ctx.ellipse(sx, sy, bodyW, bodyH, 0, 0, Math.PI * 2)
  ctx.fillStyle = _bodyColor(hue, sat, 38, energy * 0.8 + 0.1, pattern, hue2, 0)
  ctx.fill()

  // Head nub
  const hx_ = sx + Math.cos(c.angle) * (bodyW * 0.9)
  const hy_ = sy + Math.sin(c.angle) * (bodyW * 0.9)
  ctx.beginPath()
  ctx.arc(hx_, hy_, bs * 0.9, 0, Math.PI * 2)
  ctx.fillStyle = _bodyColor(hue, sat, 50, energy * 0.85 + 0.1, pattern, hue2, 1)
  ctx.fill()
  _drawEyes(ctx, hx_, hy_, c.angle, bs * 0.38, bs * 0.75, energy)
}

function _drawFish(
  ctx: CanvasRenderingContext2D,
  c: Critter, sx: number, sy: number, bs: number,
  energy: number, hue: number, hue2: number, pattern: 0|1|2, sat: number, glowColor: string,
): void {
  ctx.save()
  ctx.translate(sx, sy)
  ctx.rotate(c.angle)

  // Tail fin (oscillates)
  const tailSwing = Math.sin(c.phase) * bs * 1.8
  const tailX = -bs * 2.5
  ctx.beginPath()
  ctx.moveTo(tailX, 0)
  ctx.quadraticCurveTo(tailX - bs, tailSwing * 0.5, tailX - bs * 1.6, tailSwing)
  ctx.quadraticCurveTo(tailX - bs, -tailSwing * 0.5, tailX, 0)
  ctx.fillStyle = _bodyColor(hue2, sat, 40, energy * 0.7 + 0.1, pattern, hue, 2)
  ctx.fill()

  // Body (elongated)
  _setGlow(ctx, glowColor, bs * 3)
  ctx.beginPath()
  ctx.ellipse(0, 0, bs * 2.5, bs * 1.0, 0, 0, Math.PI * 2)
  ctx.fillStyle = _bodyColor(hue, sat, 44, energy * 0.85 + 0.1, pattern, hue2, 0)
  ctx.fill()

  // Dorsal fin
  ctx.beginPath()
  ctx.moveTo(-bs * 0.5, -bs)
  ctx.quadraticCurveTo(bs * 0.3, -bs * 1.8, bs * 1.5, -bs * 0.6)
  ctx.lineTo(bs * 1.5, 0)
  ctx.lineTo(-bs * 0.5, 0)
  ctx.fillStyle = `hsla(${hue},${sat}%,35%,${energy * 0.5 + 0.1})`
  ctx.fill()

  // Eye
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.arc(bs * 1.6, -bs * 0.2, bs * 0.35, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(255,255,255,${energy * 0.85 + 0.1})`
  ctx.fill()

  ctx.restore()
}

function _drawBird(
  ctx: CanvasRenderingContext2D,
  c: Critter, sx: number, sy: number, bs: number,
  energy: number, hue: number, hue2: number, pattern: 0|1|2, sat: number, glowColor: string,
  tick: number,
): void {
  const wingFlap = Math.sin(c.phase * 2) * bs * 3.5
  const wingSpan = bs * 4

  // Wings
  for (const side of [-1, 1] as const) {
    const wx = sx + side * wingSpan
    const wy = sy + wingFlap * side * 0.5
    ctx.beginPath()
    ctx.moveTo(sx, sy - bs * 0.5)
    ctx.quadraticCurveTo(sx + side * wingSpan * 0.5, wy - bs * 0.8, wx, wy)
    ctx.quadraticCurveTo(sx + side * wingSpan * 0.5, wy + bs * 0.4, sx, sy + bs * 0.5)
    ctx.fillStyle = _bodyColor(hue2, sat, 38, energy * 0.65 + 0.1, pattern, hue, 1)
    ctx.fill()
  }

  // Body
  _setGlow(ctx, glowColor, bs * 3)
  ctx.beginPath()
  ctx.ellipse(sx, sy, bs * 1.6, bs * 1.0, c.angle, 0, Math.PI * 2)
  ctx.fillStyle = _bodyColor(hue, sat, 48, energy * 0.85 + 0.1, pattern, hue2, 0)
  ctx.fill()

  // Head
  const hx_ = sx + Math.cos(c.angle) * bs * 1.6
  const hy_ = sy + Math.sin(c.angle) * bs * 1.6
  ctx.beginPath()
  ctx.arc(hx_, hy_, bs * 0.85, 0, Math.PI * 2)
  ctx.fillStyle = _bodyColor(hue, sat, 55, energy * 0.9 + 0.1, pattern, hue2, 2)
  ctx.fill()

  // Beak
  const bx = hx_ + Math.cos(c.angle) * bs * 0.85
  const by_ = hy_ + Math.sin(c.angle) * bs * 0.85
  ctx.beginPath()
  ctx.moveTo(bx, by_)
  ctx.lineTo(bx + Math.cos(c.angle + 0.3) * bs * 0.8, by_ + Math.sin(c.angle + 0.3) * bs * 0.8)
  ctx.strokeStyle = `hsla(40, 90%, 65%, ${energy * 0.8 + 0.1})`
  ctx.lineWidth = Math.max(1, bs * 0.5)
  ctx.shadowBlur = 0
  ctx.stroke()

  _drawEyes(ctx, hx_, hy_, c.angle, bs * 0.35, bs * 0.7, energy)
}

function _drawEyes(
  ctx: CanvasRenderingContext2D,
  hx: number, hy: number, angle: number,
  eyeR: number, eyeOff: number, energy: number,
): void {
  const perp = angle + Math.PI / 2
  ctx.shadowColor = '#ffffff'
  ctx.shadowBlur   = eyeR * 3
  for (const side of [-1, 1] as const) {
    ctx.beginPath()
    ctx.arc(
      hx + Math.cos(perp) * eyeOff * side,
      hy + Math.sin(perp) * eyeOff * side,
      eyeR, 0, Math.PI * 2,
    )
    ctx.fillStyle = `rgba(255,255,255,${energy * 0.85 + 0.1})`
    ctx.fill()
    // Pupil
    ctx.beginPath()
    ctx.arc(
      hx + Math.cos(perp) * eyeOff * side + Math.cos(angle) * eyeR * 0.4,
      hy + Math.sin(perp) * eyeOff * side + Math.sin(angle) * eyeR * 0.4,
      eyeR * 0.4, 0, Math.PI * 2,
    )
    ctx.fillStyle = '#111'
    ctx.shadowBlur = 0
    ctx.fill()
  }
}