// ── Aquarium Engine v1 — Evolutionary Physics Sandbox ────────────────────────
// Soft-body creatures + fluid dynamics + interactive toybox

export const WORLD_W = 160  // logical units
export const WORLD_H = 90

// ── Verlet Point ──────────────────────────────────────────────────────────────
export interface Point {
  x: number; y: number
  px: number; py: number  // previous position (for Verlet)
  vx: number; vy: number  // velocity (visual)
  pinned: boolean
  radius: number
  mass: number
}

// ── Stick Constraint ──────────────────────────────────────────────────────────
export interface Stick {
  p0: Point
  p1: Point
  length: number
  stiffness: number  // 0-1 (1 = rigid)
}

// ── Creature Skeleton ─────────────────────────────────────────────────────────
export interface CreatureDNA {
  segments: number       // body segments (4-12)
  appendages: number     // legs/fins (0-8)
  bodyWidth: number      // 0.3-1.5
  metabolism: number     // energy consumption rate
  mutability: number     // how much it mutates
  color: string
  biolum: boolean        // bioluminescence?
}

export interface Creature {
  id: string
  dna: CreatureDNA
  points: Point[]
  sticks: Stick[]
  alive: boolean
  energy: number
  age: number
  x: number  // center of mass
  y: number
  vx: number
  vy: number
  muscles: number[]      // oscillator phases for movement
  fitness: number        // for evolution
}

// ── Material Types ────────────────────────────────────────────────────────────
export const MAT = {
  EMPTY:     0,
  WATER:     1,
  SAND:      2,
  STONE:     3,
  WOOD:      4,
  METAL:     5,
  ACID:      6,
  LAVA:      7,
  ICE:       8,
  OIL:       9,
  FIRE:      10,
  SMOKE:     11,
  STEAM:     12,
  PLANT:     13,
  FOOD:      14,
  SPORE:     15,
  VINE:      16,
  NECTAR:    17,
  POISON:    18,
  CRYSTAL:   19,
} as const

export type Material = (typeof MAT)[keyof typeof MAT]

export interface MaterialDef {
  name: string
  color: string
  density: number     // for buoyancy
  flammable: boolean
  flowRate: number    // 0 = solid, 1 = gas
  dissolves: Material[]
}

export const MATERIALS: Record<Material, MaterialDef> = {
  [MAT.EMPTY]:   { name: 'Empty',   color: '#0a0e14', density: 0,    flammable: false, flowRate: 1,    dissolves: [] },
  [MAT.WATER]:   { name: 'Water',   color: '#1a4d8f', density: 1,    flammable: false, flowRate: 0.8,  dissolves: [] },
  [MAT.SAND]:    { name: 'Sand',    color: '#c4a050', density: 2.5,  flammable: false, flowRate: 0.3,  dissolves: [] },
  [MAT.STONE]:   { name: 'Stone',   color: '#5a6a7a', density: 3,    flammable: false, flowRate: 0,    dissolves: [] },
  [MAT.WOOD]:    { name: 'Wood',    color: '#6b4423', density: 0.6,  flammable: true,  flowRate: 0,    dissolves: [] },
  [MAT.METAL]:   { name: 'Metal',   color: '#8a95a5', density: 7,    flammable: false, flowRate: 0,    dissolves: [] },
  [MAT.ACID]:    { name: 'Acid',    color: '#44ff88', density: 1.2,  flammable: false, flowRate: 0.7,  dissolves: [MAT.STONE, MAT.METAL, MAT.WOOD, MAT.SAND] },
  [MAT.LAVA]:    { name: 'Lava',    color: '#ff4422', density: 2.8,  flammable: false, flowRate: 0.2,  dissolves: [MAT.WOOD, MAT.ICE] },
  [MAT.ICE]:     { name: 'Ice',     color: '#b0d8f0', density: 0.9,  flammable: false, flowRate: 0,    dissolves: [] },
  [MAT.OIL]:     { name: 'Oil',     color: '#6a3a8a', density: 0.8,  flammable: true,  flowRate: 0.6,  dissolves: [] },
  [MAT.FIRE]:    { name: 'Fire',    color: '#ff8800', density: 0.1,  flammable: false, flowRate: 1,    dissolves: [] },
  [MAT.SMOKE]:   { name: 'Smoke',   color: '#4a4a4a', density: 0.5,  flammable: false, flowRate: 0.95, dissolves: [] },
  [MAT.STEAM]:   { name: 'Steam',   color: '#d0e0f0', density: 0.3,  flammable: false, flowRate: 0.9,  dissolves: [] },
  [MAT.PLANT]:   { name: 'Plant',   color: '#2a6a2a', density: 0.7,  flammable: true,  flowRate: 0,    dissolves: [] },
  [MAT.FOOD]:    { name: 'Food',    color: '#88ff44', density: 1.1,  flammable: false, flowRate: 0.1,  dissolves: [] },
  [MAT.SPORE]:   { name: 'Spore',   color: '#aa88ff', density: 0.4,  flammable: false, flowRate: 0.85, dissolves: [] },
  [MAT.VINE]:    { name: 'Vine',    color: '#3a8a3a', density: 0.6,  flammable: true,  flowRate: 0,    dissolves: [] },
  [MAT.NECTAR]:  { name: 'Nectar',  color: '#ffcc44', density: 1.3,  flammable: false, flowRate: 0.5,  dissolves: [] },
  [MAT.POISON]:  { name: 'Poison',  color: '#aa44ff', density: 1.1,  flammable: false, flowRate: 0.6,  dissolves: [MAT.PLANT, MAT.VINE] },
  [MAT.CRYSTAL]: { name: 'Crystal', color: '#88ddff', density: 2.6,  flammable: false, flowRate: 0,    dissolves: [] },
}

// ── Material Grid ─────────────────────────────────────────────────────────────
export class MaterialGrid {
  w: number
  h: number
  cells: Uint8Array
  temp: Float32Array   // temperature
  
  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.cells = new Uint8Array(w * h)
    this.temp = new Float32Array(w * h)
    this.cells.fill(MAT.EMPTY)
    this.temp.fill(0.5)
  }
  
  idx(x: number, y: number): number {
    return Math.floor(y) * this.w + Math.floor(x)
  }
  
  get(x: number, y: number): Material {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return MAT.STONE
    return this.cells[this.idx(x, y)] as Material
  }
  
  set(x: number, y: number, mat: Material): void {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return
    this.cells[this.idx(x, y)] = mat
  }
  
  swap(x0: number, y0: number, x1: number, y1: number): void {
    if (x0 < 0 || x0 >= this.w || y0 < 0 || y0 >= this.h) return
    if (x1 < 0 || x1 >= this.w || y1 < 0 || y1 >= this.h) return
    const i0 = this.idx(x0, y0), i1 = this.idx(x1, y1)
    const tmp = this.cells[i0]
    this.cells[i0] = this.cells[i1]
    this.cells[i1] = tmp
  }
  
  paint(cx: number, cy: number, radius: number, mat: Material): void {
    const r2 = radius * radius
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= r2) {
          this.set(cx + dx, cy + dy, mat)
        }
      }
    }
  }
}

// ── Tool/Object Types ─────────────────────────────────────────────────────────
export interface GameObject {
  id: string
  type: 'bomb' | 'fan' | 'heater' | 'cooler' | 'attractor' | 'repulsor' | 'virus' | 'lightning' | 'motor' | 'rope' | 'wheel'
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  omega: number
  active: boolean
  strength: number
  radius: number
}

// ── Plant System ──────────────────────────────────────────────────────────────
export interface PlantNode {
  x: number; y: number
  age: number
  branch: boolean
  parent: PlantNode | null
  children: PlantNode[]
}

export interface Plant {
  id: string
  root: PlantNode
  species: 'vine' | 'tree' | 'coral' | 'mushroom'
  growthRate: number
  color: string
}

// ── Physics Engine ────────────────────────────────────────────────────────────
export class AquariumEngine {
  gravity = { x: 0, y: -0.15 }
  drag = 0.992
  
  creatures: Creature[] = []
  materials: MaterialGrid
  objects: GameObject[] = []
  plants: Plant[] = []
  
  time = 0
  
  constructor() {
    this.materials = new MaterialGrid(WORLD_W, WORLD_H)
  }
  
  // ── Creature Spawning ──────────────────────────────────────────────────────
  spawnCreature(x: number, y: number, dna?: Partial<CreatureDNA>): Creature {
    const fullDNA: CreatureDNA = {
      segments: 6,
      appendages: 4,
      bodyWidth: 0.8,
      metabolism: 0.5,
      mutability: 0.1,
      color: '#ff8844',
      biolum: false,
      ...dna,
    }
    
    const points: Point[] = []
    const sticks: Stick[] = []
    
    // Create spine
    const spacing = 1.2
    for (let i = 0; i < fullDNA.segments; i++) {
      points.push({
        x: x + i * spacing,
        y: y,
        px: x + i * spacing,
        py: y,
        vx: 0, vy: 0,
        pinned: false,
        radius: fullDNA.bodyWidth * (1 - i / fullDNA.segments * 0.3),
        mass: 1,
      })
    }
    
    // Connect spine
    for (let i = 0; i < points.length - 1; i++) {
      sticks.push({
        p0: points[i],
        p1: points[i + 1],
        length: spacing,
        stiffness: 0.8,
      })
    }
    
    // Add appendages (legs/fins)
    for (let i = 0; i < fullDNA.appendages; i++) {
      const baseIdx = Math.floor(i / 2) + 1
      if (baseIdx >= points.length) continue
      const side = (i % 2) * 2 - 1
      const legP = {
        x: points[baseIdx].x + side * 0.5,
        y: points[baseIdx].y - 1.5,
        px: points[baseIdx].x + side * 0.5,
        py: points[baseIdx].y - 1.5,
        vx: 0, vy: 0,
        pinned: false,
        radius: fullDNA.bodyWidth * 0.3,
        mass: 0.3,
      }
      points.push(legP)
      sticks.push({
        p0: points[baseIdx],
        p1: legP,
        length: 1.5,
        stiffness: 0.6,
      })
    }
    
    const creature: Creature = {
      id: `creature-${Date.now()}-${Math.random()}`,
      dna: fullDNA,
      points,
      sticks,
      alive: true,
      energy: 100,
      age: 0,
      x, y,
      vx: 0, vy: 0,
      muscles: new Array(sticks.length).fill(0).map(() => Math.random() * Math.PI * 2),
      fitness: 0,
    }
    
    this.creatures.push(creature)
    return creature
  }
  
  // ── Step ───────────────────────────────────────────────────────────────────
  step(dt: number = 1/60): void {
    this.time += dt
    
    // Update creatures
    for (const c of this.creatures) {
      if (!c.alive) continue
      this.stepCreature(c, dt)
    }
    
    // Update materials
    this.stepMaterials()
    
    // Update plants
    for (const p of this.plants) {
      this.stepPlant(p, dt)
    }
    
    // Update objects
    for (const obj of this.objects) {
      if (obj.active) this.stepObject(obj, dt)
    }
  }
  
  stepCreature(c: Creature, dt: number): void {
    // Muscle oscillation
    for (let i = 0; i < c.muscles.length; i++) {
      c.muscles[i] += dt * 3
      if (i < c.sticks.length) {
        const s = c.sticks[i]
        const force = Math.sin(c.muscles[i]) * 0.5
        s.length = s.length * (1 + force * 0.05)
      }
    }
    
    // Verlet integration
    for (const p of c.points) {
      if (p.pinned) continue
      
      // Gravity
      const ax = this.gravity.x
      const ay = this.gravity.y
      
      // Buoyancy (crude)
      const mat = this.materials.get(p.x, p.y)
      const matDef = MATERIALS[mat]
      const buoyancy = matDef.density > 0 ? matDef.density * 0.1 : 0
      
      const nvx = p.x - p.px + ax * dt * dt
      const nvy = p.y - p.py + (ay + buoyancy) * dt * dt
      
      p.px = p.x
      p.py = p.y
      p.x += nvx * this.drag
      p.y += nvy * this.drag
      
      // Bounds
      if (p.y < 0) { p.y = 0; p.py = p.y + 0.1 }
      if (p.y > WORLD_H) { p.y = WORLD_H; p.py = p.y - 0.1 }
      if (p.x < 0) { p.x = 0; p.px = p.x + 0.1 }
      if (p.x > WORLD_W) { p.x = WORLD_W; p.px = p.x - 0.1 }
      
      p.vx = p.x - p.px
      p.vy = p.y - p.py
    }
    
    // Constraint solving (sticks)
    for (let iter = 0; iter < 3; iter++) {
      for (const s of c.sticks) {
        const dx = s.p1.x - s.p0.x
        const dy = s.p1.y - s.p0.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001
        const diff = (s.length - dist) / dist
        const offsetX = dx * diff * 0.5 * s.stiffness
        const offsetY = dy * diff * 0.5 * s.stiffness
        
        if (!s.p0.pinned) {
          s.p0.x -= offsetX
          s.p0.y -= offsetY
        }
        if (!s.p1.pinned) {
          s.p1.x += offsetX
          s.p1.y += offsetY
        }
      }
    }
    
    // Update center of mass
    let cx = 0, cy = 0, mass = 0
    for (const p of c.points) {
      cx += p.x * p.mass
      cy += p.y * p.mass
      mass += p.mass
    }
    c.x = cx / mass
    c.y = cy / mass
    
    // Energy decay
    c.energy -= c.dna.metabolism * dt * 0.1
    if (c.energy <= 0) c.alive = false
    
    c.age += dt
  }
  
  stepMaterials(): void {
    // Simple falling sand + fluids
    for (let y = 1; y < this.materials.h; y++) {
      for (let x = 0; x < this.materials.w; x++) {
        const mat = this.materials.get(x, y)
        if (mat === MAT.EMPTY) continue
        const def = MATERIALS[mat]
        
        if (def.flowRate > 0) {
          const below = this.materials.get(x, y - 1)
          const belowDef = MATERIALS[below]
          
          // Fall if lighter than below or below is empty
          if (below === MAT.EMPTY || def.density > belowDef.density) {
            if (Math.random() < def.flowRate) {
              this.materials.swap(x, y, x, y - 1)
            }
          } else if (def.flowRate > 0.5) {
            // Spread sideways for fluids
            const dir = Math.random() < 0.5 ? -1 : 1
            const nx = x + dir
            const side = this.materials.get(nx, y)
            if (side === MAT.EMPTY && Math.random() < 0.3) {
              this.materials.swap(x, y, nx, y)
            }
          }
        }
      }
    }
  }
  
  stepPlant(p: Plant, dt: number): void {
    // Plants grow upward and branch
    // TODO: Implement L-system growth
  }
  
  stepObject(obj: GameObject, dt: number): void {
    // Objects affect creatures and materials
    if (obj.type === 'fan') {
      // Push creatures
      for (const c of this.creatures) {
        const dx = c.x - obj.x
        const dy = c.y - obj.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001
        if (dist < obj.radius) {
          const force = obj.strength * (1 - dist / obj.radius)
          const angle = obj.angle
          const fx = Math.cos(angle) * force
          const fy = Math.sin(angle) * force
          for (const p of c.points) {
            p.x += fx
            p.y += fy
          }
        }
      }
    }
    
    if (obj.type === 'attractor') {
      for (const c of this.creatures) {
        const dx = obj.x - c.x
        const dy = obj.y - c.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001
        if (dist < obj.radius) {
          const force = obj.strength / (dist * dist + 1)
          for (const p of c.points) {
            p.x += dx / dist * force
            p.y += dy / dist * force
          }
        }
      }
    }
  }
  
  spawnObject(type: GameObject['type'], x: number, y: number): GameObject {
    const obj: GameObject = {
      id: `obj-${Date.now()}`,
      type,
      x, y,
      vx: 0, vy: 0,
      angle: 0,
      omega: 0,
      active: true,
      strength: 1,
      radius: 10,
    }
    this.objects.push(obj)
    return obj
  }
}
