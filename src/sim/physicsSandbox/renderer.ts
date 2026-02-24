// ── Physics Sandbox Canvas Renderer ─────────────────────────────────────────
import { PhysicsWorld } from './world'
import { RobotBlueprint, TaskConfig } from './types'

export interface Camera {
  x: number      // world x at canvas center
  y: number      // world y at ground line
  scale: number  // pixels per meter
}

export interface RenderConfig {
  showJoints:   boolean
  showContacts: boolean
  showTrail:    boolean
  trailBuffer:  { x: number; y: number }[]
}

export function createCamera(scale = 110): Camera {
  return { x: 0, y: 0, scale }
}

export function worldToScreen(
  wx: number, wy: number,
  cam: Camera, W: number, H: number
): { sx: number; sy: number } {
  return {
    sx: W / 2 + (wx - cam.x) * cam.scale,
    sy: H * 0.78 - (wy - cam.y) * cam.scale,
  }
}

function screenToWorld(sx: number, sy: number, cam: Camera, W: number, H: number) {
  return {
    wx: cam.x + (sx - W / 2) / cam.scale,
    wy: cam.y + (H * 0.78 - sy) / cam.scale,
  }
}

export function renderSandbox(
  ctx: CanvasRenderingContext2D,
  world: PhysicsWorld,
  blueprint: RobotBlueprint,
  cam: Camera,
  task: TaskConfig,
  cfg: RenderConfig,
  generation: number,
  bestScore: number,
  training: boolean,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height)

  // ── Background ─────────────────────────────────────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, 0, height)
  grad.addColorStop(0, '#060a14')
  grad.addColorStop(1, '#0a1020')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  const W = width, H = height

  // ── Trail ──────────────────────────────────────────────────────────────────
  if (cfg.showTrail && cfg.trailBuffer.length > 2) {
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(100,200,255,0.18)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < cfg.trailBuffer.length; i++) {
      const { sx, sy } = worldToScreen(cfg.trailBuffer[i].x, cfg.trailBuffer[i].y, cam, W, H)
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy)
    }
    ctx.stroke()
  }

  // ── Ground ─────────────────────────────────────────────────────────────────
  const { sy: groundSy } = worldToScreen(0, world.groundY, cam, W, H)
  // Ground fill
  const gGrad = ctx.createLinearGradient(0, groundSy, 0, groundSy + 60)
  gGrad.addColorStop(0, '#1a3a2a')
  gGrad.addColorStop(1, '#0c1c14')
  ctx.fillStyle = gGrad
  ctx.fillRect(0, groundSy, W, H - groundSy)
  // Ground line
  ctx.beginPath()
  ctx.strokeStyle = '#33ff8833'
  ctx.lineWidth = 1
  ctx.setLineDash([6, 4])
  ctx.moveTo(0, groundSy); ctx.lineTo(W, groundSy)
  ctx.stroke(); ctx.setLineDash([])

  // Ground surface glow
  ctx.beginPath()
  const glow = ctx.createLinearGradient(0, groundSy - 2, 0, groundSy + 4)
  glow.addColorStop(0, 'rgba(50,255,100,0.35)')
  glow.addColorStop(1, 'rgba(50,255,100,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, groundSy - 2, W, 6)

  // ── Platforms ──────────────────────────────────────────────────────────────
  for (const p of task.platforms) {
    const { sx: px, sy: py } = worldToScreen(p.x, p.y, cam, W, H)
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(-p.angle)
    const pw = p.w * cam.scale
    const ph = p.h * cam.scale
    // Fill
    ctx.fillStyle = p.colorTag + 'cc'
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph)
    // Border
    ctx.strokeStyle = '#aaffcc44'
    ctx.lineWidth = 1
    ctx.strokeRect(-pw / 2, -ph / 2, pw, ph)
    ctx.restore()
  }

  // ── Joints ─────────────────────────────────────────────────────────────────
  if (cfg.showJoints) {
    for (const joint of world.joints.values()) {
      const bA = world.getBody(joint.bodyAId)
      const bB = world.getBody(joint.bodyBId)
      if (!bA || !bB) continue

      const rA = rotVec(joint.localAnchorA, bA.angle)
      const rB = rotVec(joint.localAnchorB, bB.angle)
      const wA = { x: bA.x + rA.x, y: bA.y + rA.y }
      const wB = { x: bB.x + rB.x, y: bB.y + rB.y }

      const { sx: ax, sy: ay } = worldToScreen(wA.x, wA.y, cam, W, H)
      const { sx: bx, sy: by } = worldToScreen(wB.x, wB.y, cam, W, H)

      // Draw joint connector
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255,255,120,0.25)'
      ctx.lineWidth = 1
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by)
      ctx.stroke()

      // Joint circle
      const mix = (ax + bx) / 2, miy = (ay + by) / 2
      const tLoad = joint.motorEnabled
        ? Math.abs(joint.currentAngle) / Math.PI
        : 0
      ctx.beginPath()
      ctx.fillStyle = `hsl(${50 - tLoad * 50}, 100%, 65%)`
      ctx.arc(mix, miy, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ── Bodies ─────────────────────────────────────────────────────────────────
  for (const body of world.bodies.values()) {
    if (body.isStatic) continue
    const { sx, sy } = worldToScreen(body.x, body.y, cam, W, H)

    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(-body.angle)

    if (body.shape === 'rect') {
      const bw = body.hw * cam.scale * 2
      const bh = body.hh * cam.scale * 2

      // Glow for feet in contact
      if (body.isFoot && body.footContact) {
        ctx.shadowColor = '#00ff88'
        ctx.shadowBlur  = 12
      }

      // Fill
      ctx.fillStyle = body.colorTag + 'ee'
      ctx.beginPath()
      const r = Math.min(bw, bh) * 0.15
      roundRect(ctx, -bw / 2, -bh / 2, bw, bh, r)
      ctx.fill()
      ctx.shadowBlur = 0

      // Border
      ctx.strokeStyle = '#ffffff22'
      ctx.lineWidth = 0.7
      ctx.stroke()

      // Label
      if (bw > 18) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.font = `${Math.max(6, bh * 0.35)}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(body.label.slice(0, 4), 0, 0)
      }
    } else {
      // Circle
      const sr = body.r * cam.scale
      if (body.isFoot && body.footContact) {
        ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10
      }
      ctx.beginPath()
      ctx.arc(0, 0, sr, 0, Math.PI * 2)
      ctx.fillStyle = body.colorTag + 'dd'
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 0.7
      ctx.stroke()
      // Direction indicator
      ctx.beginPath()
      ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 1
      ctx.moveTo(0, 0); ctx.lineTo(sr * 0.7, 0)
      ctx.stroke()
    }

    ctx.restore()

    // Foot contact circle overlay
    if (body.isFoot && body.footContact) {
      ctx.beginPath()
      ctx.fillStyle = 'rgba(50,255,130,0.22)'
      ctx.arc(sx, sy + (body.hh * cam.scale * 0.8), body.hw * cam.scale, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ── HUD overlay ────────────────────────────────────────────────────────────
  ctx.save()
  ctx.font = '10px monospace'
  ctx.fillStyle = 'rgba(100,200,255,0.55)'

  if (training) {
    ctx.fillStyle = '#ff8844cc'
    ctx.fillText('● TRAINING', 10, 18)
    ctx.fillStyle = 'rgba(100,200,255,0.55)'
  }
  ctx.fillText(`Gen ${generation}`, 10, 34)
  ctx.fillText(`Best ${bestScore.toFixed(2)}`, 10, 48)
  ctx.restore()
}

// ── Utils ──────────────────────────────────────────────────────────────────────
function rotVec(v: { x: number; y: number }, a: number) {
  const c = Math.cos(a), s = Math.sin(a)
  return { x: c * v.x - s * v.y, y: s * v.x + c * v.y }
}
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ── Sparkline for score history ────────────────────────────────────────────────
export function renderSparkline(
  ctx: CanvasRenderingContext2D,
  history: { bestScore: number; avgScore: number }[],
  x: number, y: number, w: number, h: number,
): void {
  if (history.length < 2) return
  const vals = history.map(g => g.bestScore)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = Math.max(maxV - minV, 0.1)

  const norm = (v: number) => (v - minV) / range

  ctx.save()
  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(x, y, w, h)

  // Avg line
  ctx.beginPath()
  ctx.strokeStyle = 'rgba(100,200,255,0.2)'
  ctx.lineWidth = 1
  history.forEach((g, i) => {
    const sx = x + (i / (history.length - 1)) * w
    const sy = y + h - norm(g.avgScore) * h
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy)
  })
  ctx.stroke()

  // Best line
  ctx.beginPath()
  ctx.strokeStyle = '#00ff88cc'
  ctx.lineWidth = 1.5
  vals.forEach((v, i) => {
    const sx = x + (i / (vals.length - 1)) * w
    const sy = y + h - norm(v) * h
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy)
  })
  ctx.stroke()

  // Latest dot
  const last = vals[vals.length - 1]
  const lx = x + w
  const ly = y + h - norm(last) * h
  ctx.beginPath()
  ctx.fillStyle = '#00ff88'
  ctx.arc(lx, ly, 2.5, 0, Math.PI * 2)
  ctx.fill()

  // Border
  ctx.strokeStyle = 'rgba(100,200,255,0.15)'
  ctx.lineWidth = 0.5
  ctx.strokeRect(x, y, w, h)

  ctx.restore()
}

// ── Smooth camera follow ───────────────────────────────────────────────────────
export function smoothCamera(
  cam: Camera,
  targetX: number,
  dt: number,
  lerpSpeed = 2.5,
): void {
  cam.x += (targetX - cam.x) * Math.min(1, lerpSpeed * dt)
}
