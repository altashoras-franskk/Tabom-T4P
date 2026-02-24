// ── 2D Physics World — Spring-Damper Joints + Impulse Ground Contact ──────────
import { Vec2, Body, Joint, Platform } from './types'

// ── Vec2 helpers ──────────────────────────────────────────────────────────────
export function v2(x: number, y: number): Vec2 { return { x, y } }
export function vadd(a: Vec2, b: Vec2): Vec2 { return { x: a.x + b.x, y: a.y + b.y } }
export function vsub(a: Vec2, b: Vec2): Vec2 { return { x: a.x - b.x, y: a.y - b.y } }
export function vscale(a: Vec2, s: number): Vec2 { return { x: a.x * s, y: a.y * s } }
export function vdot(a: Vec2, b: Vec2): number { return a.x * b.x + a.y * b.y }
export function vcross2d(a: Vec2, b: Vec2): number { return a.x * b.y - a.y * b.x }
export function vperp(omega: number, r: Vec2): Vec2 { return { x: -omega * r.y, y: omega * r.x } }
export function vrot(v: Vec2, a: number): Vec2 {
  const c = Math.cos(a), s = Math.sin(a)
  return { x: c * v.x - s * v.y, y: s * v.x + c * v.y }
}
export function vlen(a: Vec2): number { return Math.sqrt(a.x * a.x + a.y * a.y) }

export function normAngle(a: number): number {
  while (a > Math.PI)  a -= 2 * Math.PI
  while (a < -Math.PI) a += 2 * Math.PI
  return a
}
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

function rectCorners(b: Body): Vec2[] {
  const corners: [number, number][] = [
    [-b.hw, -b.hh], [b.hw, -b.hh], [b.hw, b.hh], [-b.hw, b.hh],
  ]
  return corners.map(([cx, cy]) => {
    const w = vrot({ x: cx, y: cy }, b.angle)
    return { x: b.x + w.x, y: b.y + w.y }
  })
}

// ── Physics World ─────────────────────────────────────────────────────────────
export class PhysicsWorld {
  bodies   = new Map<string, Body>()
  joints   = new Map<string, Joint>()
  platforms: Platform[] = []
  gravity  = { x: 0, y: -9.8 }
  groundY  = 0
  time     = 0
  wind     = { x: 0, y: 0 }

  // Joint spring parameters — high enough for ~rigid joints with substeps
  readonly KS = 55000   // N/m
  readonly KD = 550     // N·s/m
  readonly N_ITER = 1   // constraint solver iterations per substep
  readonly N_SUBS = 8   // substeps per frame dt

  // ── API ────────────────────────────────────────────────────────────────────
  addBody(def: Partial<Body> & { id: string }): Body {
    const density = (def as any).density ?? 1.2
    const b: Body = {
      x: 0, y: 2, angle: 0, vx: 0, vy: 0, omega: 0,
      mass: 0, invMass: 0, inertia: 0, invInertia: 0,
      shape: 'rect', hw: 0.2, hh: 0.15, r: 0.2,
      friction: 0.6, restitution: 0.05,
      isStatic: false, colorTag: '#88aaff',
      label: '', isFoot: false, footContact: false,
      fx: 0, fy: 0, torque: 0,
      ...def,
    }
    if (b.isStatic) {
      b.mass = 1e30; b.invMass = 0; b.inertia = 1e30; b.invInertia = 0
    } else if (b.shape === 'rect') {
      b.mass = density * (2 * b.hw) * (2 * b.hh)
      b.invMass = 1 / b.mass
      b.inertia = b.mass * ((4 * b.hw * b.hw + 4 * b.hh * b.hh) / 12)
      b.invInertia = 1 / b.inertia
    } else {
      b.mass = density * Math.PI * b.r * b.r
      b.invMass = 1 / b.mass
      b.inertia = 0.5 * b.mass * b.r * b.r
      b.invInertia = 1 / b.inertia
    }
    this.bodies.set(b.id, b)
    return b
  }

  addJoint(j: Joint): void { this.joints.set(j.id, j) }
  addPlatform(p: Platform): void { this.platforms.push(p) }

  getBody(id: string): Body | undefined { return this.bodies.get(id) }
  getJoint(id: string): Joint | undefined { return this.joints.get(id) }

  worldAnchor(b: Body, local: Vec2): Vec2 {
    const r = vrot(local, b.angle)
    return { x: b.x + r.x, y: b.y + r.y }
  }

  // ── Step ──────────────────────────────────────────────────────────────────
  step(dt: number): void {
    const sub = dt / this.N_SUBS
    for (let i = 0; i < this.N_SUBS; i++) this._substep(sub)
    this.time += dt
  }

  // ── Headless fast step (for CEM evaluation) ───────────────────────────────
  fastStep(dt: number): void {
    // 2 substeps for speed vs stability trade-off
    const sub = dt / 2
    this._substep(sub)
    this._substep(sub)
    this.time += dt
  }

  private _substep(dt: number): void {
    // 1. Clear and apply gravity + wind
    for (const b of this.bodies.values()) {
      if (b.isStatic) continue
      b.fx = (this.gravity.x + this.wind.x) * b.mass
      b.fy = (this.gravity.y + this.wind.y) * b.mass
      b.torque = 0
    }

    // 2. Apply joint spring forces + motor torques
    for (const j of this.joints.values()) {
      const bA = this.bodies.get(j.bodyAId)
      const bB = this.bodies.get(j.bodyBId)
      if (!bA || !bB) continue
      this._applyJointSpring(j, bA, bB)
      if (j.motorEnabled) this._applyMotorTorque(j, bA, bB)
    }

    // 3. Integrate velocities
    for (const b of this.bodies.values()) {
      if (b.isStatic) continue
      b.vx    += b.fx * b.invMass    * dt
      b.vy    += b.fy * b.invMass    * dt
      b.omega += b.torque * b.invInertia * dt
      // Slight linear damping (air resistance)
      b.vx *= 0.9998
      b.vy *= 0.9998
      b.omega *= 0.9990
    }

    // 4. Integrate positions
    for (const b of this.bodies.values()) {
      if (b.isStatic) continue
      b.x     += b.vx    * dt
      b.y     += b.vy    * dt
      b.angle += b.omega * dt
    }

    // 5. Ground contacts
    this._resolveGround()
    // 6. Platform contacts
    this._resolvePlatforms()
    // 7. Update foot flags
    this._updateFootContacts()
  }

  private _applyJointSpring(j: Joint, bA: Body, bB: Body): void {
    const rA = vrot(j.localAnchorA, bA.angle)
    const rB = vrot(j.localAnchorB, bB.angle)
    const wA = { x: bA.x + rA.x, y: bA.y + rA.y }
    const wB = { x: bB.x + rB.x, y: bB.y + rB.y }

    const ex = wB.x - wA.x
    const ey = wB.y - wA.y

    // Relative velocity at anchor points
    const vAx = bA.vx - bA.omega * rA.y
    const vAy = bA.vy + bA.omega * rA.x
    const vBx = bB.vx - bB.omega * rB.y
    const vBy = bB.vy + bB.omega * rB.x

    const Fx = this.KS * ex + this.KD * (vBx - vAx)
    const Fy = this.KS * ey + this.KD * (vBy - vAy)

    bA.fx += Fx; bA.fy += Fy
    bA.torque += rA.x * Fy - rA.y * Fx

    bB.fx -= Fx; bB.fy -= Fy
    bB.torque -= (rB.x * Fy - rB.y * Fx)
  }

  private _applyMotorTorque(j: Joint, bA: Body, bB: Body): void {
    const relAngle = normAngle(bA.angle - bB.angle)
    j.currentAngle = relAngle
    j.currentOmega = bA.omega - bB.omega

    const clamped = clamp(j.motorTargetAngle, j.lowerLimit, j.upperLimit)
    const err = normAngle(clamped - relAngle)

    const Kp = j.motorMaxTorque * 10
    const T  = clamp(Kp * err - j.damping * j.currentOmega,
                     -j.motorMaxTorque, j.motorMaxTorque)

    bA.torque += T
    bB.torque -= T
  }

  private _resolveGround(): void {
    for (const b of this.bodies.values()) {
      if (b.isStatic) continue
      const contacts = b.shape === 'rect' ? rectCorners(b) : [{ x: b.x, y: b.y - b.r }]

      for (const cp of contacts) {
        const depth = this.groundY - cp.y
        if (depth <= 0) continue

        b.y += depth   // positional correction

        const r = { x: cp.x - b.x, y: this.groundY - b.y }
        const vn = b.vy + b.omega * r.x
        if (vn < 0) {
          const effN = b.invMass + r.x * r.x * b.invInertia
          const jn = Math.max(0, -(1 + b.restitution) * vn / (effN + 1e-9))
          b.vy    += jn * b.invMass
          b.omega += r.x * jn * b.invInertia

          // Friction
          const vt = b.vx - b.omega * r.y
          const effT = b.invMass + r.y * r.y * b.invInertia
          const jt = clamp(-vt / (effT + 1e-9), -b.friction * jn, b.friction * jn)
          b.vx    += jt * b.invMass
          b.omega -= r.y * jt * b.invInertia
        }
      }
    }
  }

  private _resolvePlatforms(): void {
    for (const b of this.bodies.values()) {
      if (b.isStatic) continue
      for (const plat of this.platforms) {
        this._resolvePlatformContact(b, plat)
      }
    }
  }

  private _resolvePlatformContact(b: Body, p: Platform): void {
    // AABB-only (platforms with angle~0 for now)
    const pLeft = p.x - p.w / 2, pRight = p.x + p.w / 2
    const pBottom = p.y - p.h / 2, pTop = p.y + p.h / 2

    // Body bounding box (conservative)
    const bSize = b.shape === 'rect' ? Math.max(b.hw, b.hh) * 1.414 : b.r
    if (b.x + bSize < pLeft || b.x - bSize > pRight) return
    if (b.y + bSize < pBottom || b.y - bSize > pTop) return

    // Ground-like contact: only top surface matters for standing
    const topY = pTop
    const contacts = b.shape === 'rect' ? rectCorners(b) : [{ x: b.x, y: b.y - b.r }]
    for (const cp of contacts) {
      if (cp.x < pLeft || cp.x > pRight) continue
      const depth = topY - cp.y
      if (depth <= 0 || depth > 0.3) continue

      b.y += depth
      const r = { x: cp.x - b.x, y: topY - b.y }
      const vn = b.vy + b.omega * r.x
      if (vn < 0) {
        const effN = b.invMass + r.x * r.x * b.invInertia
        const jn = Math.max(0, -(1 + b.restitution) * vn / (effN + 1e-9))
        b.vy    += jn * b.invMass
        b.omega += r.x * jn * b.invInertia

        const vt = b.vx - b.omega * r.y
        const effT = b.invMass + r.y * r.y * b.invInertia
        const jt = clamp(-vt / (effT + 1e-9), -p.friction * jn, p.friction * jn)
        b.vx    += jt * b.invMass
        b.omega -= r.y * jt * b.invInertia
      }
    }
  }

  private _updateFootContacts(): void {
    for (const b of this.bodies.values()) {
      if (!b.isFoot || b.isStatic) continue
      const botY = b.shape === 'rect'
        ? b.y - Math.abs(Math.cos(b.angle)) * b.hh - Math.abs(Math.sin(b.angle)) * b.hw
        : b.y - b.r
      b.footContact = botY < this.groundY + 0.06
      if (!b.footContact) {
        for (const p of this.platforms) {
          if (Math.abs(b.x - p.x) < p.w / 2 + 0.1 &&
              Math.abs(b.y - (p.y + p.h / 2)) < 0.12) {
            b.footContact = true; break
          }
        }
      }
    }
  }

  clear(): void {
    this.bodies.clear()
    this.joints.clear()
    this.platforms = []
    this.time = 0
    this.wind = { x: 0, y: 0 }
  }

  // ── Snapshot / Restore for cheap reset ───────────────────────────────────
  snapshot(): BodySnapshot[] {
    return Array.from(this.bodies.values()).map(b => ({
      id: b.id, x: b.x, y: b.y, angle: b.angle,
      vx: b.vx, vy: b.vy, omega: b.omega,
    }))
  }
  restore(snap: BodySnapshot[]): void {
    for (const s of snap) {
      const b = this.bodies.get(s.id)
      if (b) Object.assign(b, s)
    }
    this.time = 0
  }
}

export interface BodySnapshot {
  id: string; x: number; y: number; angle: number
  vx: number; vy: number; omega: number
}
