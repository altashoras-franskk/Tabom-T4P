// ── Particle Simulation v2 — Dan Ball inspired, 21 element types ──────────────
// Cellular automata on a fixed grid. All data in typed arrays for speed.

export const GRID_W = 280
export const GRID_H = 175

export const CELL = {
  EMPTY:     0,
  WALL:      1,
  WATER:     2,
  SAND:      3,
  FIRE:      4,
  FOOD:      5,
  OIL:       6,
  STEAM:     7,
  POWDER:    8,   // Dust — falls, ignites explosively
  GUNPOWDER: 9,   // Chain-explosive powder
  ICE:       10,  // Solid ice — melts to water near heat
  SNOW:      11,  // Slow-falling, accumulates, melts
  MAGMA:     12,  // Heavy hot liquid — burns organics
  GAS:       13,  // Flammable gas — rises, explodes
  ACID:      14,  // Dissolves WALL/SAND/ICE/WOOD/METAL
  SEED:      15,  // Grows into WOOD when planted
  WOOD:      16,  // Organic solid — burns slowly
  VINE:      17,  // Grows and spreads organically
  CLONE:     18,  // Copies whatever it touches
  SALT:      19,  // Dissolves in WATER, sinks in OIL
  METAL:     20,  // Solid conductor — fireproof
  BOMB:      21,  // Explodes when lit by FIRE
} as const

export type CellType = (typeof CELL)[keyof typeof CELL]

export interface ElementDef {
  label:   string
  color:   string
  desc:    string
  cat:     'fluid' | 'powder' | 'solid' | 'gas' | 'bio' | 'tool'
}

export const ELEMENTS: Record<number, ElementDef> = {
  [CELL.EMPTY]:     { label: 'Erase',     color: '#1a2030', desc: 'Clear cells',               cat: 'tool'   },
  [CELL.WALL]:      { label: 'Wall',      color: '#5577aa', desc: 'Immovable barrier',          cat: 'solid'  },
  [CELL.WATER]:     { label: 'Water',     color: '#2266ff', desc: 'Flows and pools',            cat: 'fluid'  },
  [CELL.SAND]:      { label: 'Sand',      color: '#d4a030', desc: 'Falls and piles',            cat: 'powder' },
  [CELL.FIRE]:      { label: 'Fire',      color: '#ff5500', desc: 'Burns oil, wood, gas',       cat: 'gas'    },
  [CELL.FOOD]:      { label: 'Food',      color: '#00ff88', desc: 'Creatures eat this',         cat: 'bio'    },
  [CELL.OIL]:       { label: 'Oil',       color: '#8822cc', desc: 'Floats, burns wildly',       cat: 'fluid'  },
  [CELL.STEAM]:     { label: 'Steam',     color: '#88aacc', desc: 'Hot gas — rises, fades',     cat: 'gas'    },
  [CELL.POWDER]:    { label: 'Powder',    color: '#ddc488', desc: 'Dust — ignites and blasts',  cat: 'powder' },
  [CELL.GUNPOWDER]: { label: 'Gunpowder', color: '#555544', desc: 'Chain explosion!',           cat: 'powder' },
  [CELL.ICE]:       { label: 'Ice',       color: '#aaddff', desc: 'Solid — melts near heat',   cat: 'solid'  },
  [CELL.SNOW]:      { label: 'Snow',      color: '#ddeeff', desc: 'Falls slow, melts in fire',  cat: 'powder' },
  [CELL.MAGMA]:     { label: 'Magma',     color: '#ff2200', desc: 'Hot heavy liquid — burns',   cat: 'fluid'  },
  [CELL.GAS]:       { label: 'Gas',       color: '#88ff44', desc: 'Flammable gas — rises',      cat: 'gas'    },
  [CELL.ACID]:      { label: 'Acid',      color: '#00ffaa', desc: 'Dissolves most solids',      cat: 'fluid'  },
  [CELL.SEED]:      { label: 'Seed',      color: '#664422', desc: 'Grows into wood + vine',     cat: 'bio'    },
  [CELL.WOOD]:      { label: 'Wood',      color: '#8b5a2b', desc: 'Solid organic — burns',      cat: 'solid'  },
  [CELL.VINE]:      { label: 'Vine',      color: '#2a8822', desc: 'Grows and spreads',          cat: 'bio'    },
  [CELL.CLONE]:     { label: 'Clone',     color: '#cc44ff', desc: 'Multiplies what it touches', cat: 'tool'   },
  [CELL.SALT]:      { label: 'Salt',      color: '#eeeeff', desc: 'Dissolves in water',         cat: 'powder' },
  [CELL.METAL]:     { label: 'Metal',     color: '#8899aa', desc: 'Fireproof solid conductor',  cat: 'solid'  },
  [CELL.BOMB]:      { label: 'Bomb',      color: '#ff8800', desc: 'Explodes when ignited',      cat: 'tool'   },
}

// Categorised palette for UI
export const CATEGORIES: { id: string; label: string; color: string; cells: CellType[] }[] = [
  { id: 'fluid',  label: 'Fluids',   color: '#2266ff', cells: [CELL.WATER, CELL.OIL, CELL.MAGMA, CELL.ACID] },
  { id: 'powder', label: 'Powders',  color: '#d4a030', cells: [CELL.SAND, CELL.POWDER, CELL.GUNPOWDER, CELL.SNOW, CELL.SALT] },
  { id: 'solid',  label: 'Solids',   color: '#5577aa', cells: [CELL.WALL, CELL.ICE, CELL.METAL, CELL.WOOD, CELL.BOMB] },
  { id: 'gas',    label: 'Gas',      color: '#ff5500', cells: [CELL.FIRE, CELL.GAS, CELL.STEAM] },
  { id: 'bio',    label: 'Biology',  color: '#00ff88', cells: [CELL.FOOD, CELL.SEED, CELL.VINE] },
  { id: 'tool',   label: 'Tools',    color: '#cc44ff', cells: [CELL.EMPTY, CELL.CLONE] },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v }

// ── Element Physical Properties ───────────────────────────────────────────────
export const ELEMENT_PROPS: Record<number, { density: number; viscosity: number; thermal: number }> = {
  [CELL.WATER]:     { density: 1.0,  viscosity: 0.3,  thermal: 0.45 },
  [CELL.OIL]:       { density: 0.8,  viscosity: 0.6,  thermal: 0.25 },
  [CELL.MAGMA]:     { density: 1.4,  viscosity: 0.8,  thermal: 0.90 },
  [CELL.ACID]:      { density: 1.1,  viscosity: 0.4,  thermal: 0.40 },
  [CELL.WALL]:      { density: 3.0,  viscosity: 1.0,  thermal: 0.10 },
  [CELL.SAND]:      { density: 1.6,  viscosity: 1.0,  thermal: 0.15 },
  [CELL.ICE]:       { density: 0.92, viscosity: 1.0,  thermal: 0.55 },
  [CELL.METAL]:     { density: 5.0,  viscosity: 1.0,  thermal: 0.95 },
  [CELL.WOOD]:      { density: 0.6,  viscosity: 1.0,  thermal: 0.08 },
  [CELL.SNOW]:      { density: 0.3,  viscosity: 1.0,  thermal: 0.20 },
}

/** Check if a cell type is a fluid (for buoyancy/drag) */
export function isFluid(c: CellType): boolean {
  return c === CELL.WATER || c === CELL.OIL || c === CELL.MAGMA || c === CELL.ACID
}

// ── Particle World ─────────────────────────────────────────────────────────────
export class ParticleWorld {
  readonly cols = GRID_W
  readonly rows = GRID_H
  cells  = new Uint8Array(GRID_W * GRID_H)   // cell type
  heat   = new Float32Array(GRID_W * GRID_H) // temperature / timer [0-1]
  extra  = new Float32Array(GRID_W * GRID_H) // extra data (bomb countdown, seed age, etc.)
  _upd   = new Uint8Array(GRID_W * GRID_H)   // updated this frame?

  // Reusable buffer for heat diffusion (avoid alloc per frame)
  private _heatBuf = new Float32Array(GRID_W * GRID_H)

  // Tunables set from outside (PhysicsSandbox sliders)
  fluidPressure = 0.6   // 0..1 — strength of pressure-lite lateral spread

  idx(x: number, y: number): number { return y * this.cols + x }

  get(x: number, y: number): CellType {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return CELL.WALL
    return this.cells[y * this.cols + x] as CellType
  }

  set(x: number, y: number, t: CellType, h = 0): void {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return
    const i = y * this.cols + x
    this.cells[i] = t
    this.heat[i]  = h
    this.extra[i] = 0
    if (t === CELL.FIRE)      this.heat[i]  = 0.8 + Math.random() * 0.2
    if (t === CELL.STEAM)     this.heat[i]  = 0.3 + Math.random() * 0.4
    if (t === CELL.GAS)       this.heat[i]  = 0.8 + Math.random() * 0.2
    if (t === CELL.SEED)      this.heat[i]  = 0.0
    if (t === CELL.VINE)      this.heat[i]  = 0.5 + Math.random() * 0.5
    if (t === CELL.MAGMA)     this.heat[i]  = 1.0
    if (t === CELL.BOMB)      this.extra[i] = 0  // not ignited
  }

  private swap(x1: number, y1: number, x2: number, y2: number): void {
    const i1 = y1 * this.cols + x1, i2 = y2 * this.cols + x2
    const tc = this.cells[i1]; this.cells[i1] = this.cells[i2]; this.cells[i2] = tc
    const th = this.heat[i1];  this.heat[i1]  = this.heat[i2];  this.heat[i2] = th
    const te = this.extra[i1]; this.extra[i1] = this.extra[i2]; this.extra[i2] = te
  }

  private mark(x: number, y: number) { this._upd[y * this.cols + x] = 1 }

  // ── Brush painting ───────────────────────────────────────────────────────────
  paint(cx: number, cy: number, r: number, t: CellType, density = 1.0): void {
    const ri = Math.ceil(r)
    for (let dy = -ri; dy <= ri; dy++) {
      for (let dx = -ri; dx <= ri; dx++) {
        if (dx * dx + dy * dy <= r * r && Math.random() < density) {
          const px = (cx + dx) | 0, py = (cy + dy) | 0
          const cur = this.get(px, py)
          if (t === CELL.EMPTY || cur !== CELL.WALL || t === CELL.WALL)
            this.set(px, py, t)
        }
      }
    }
  }

  fill(x0: number, y0: number, x1: number, y1: number, t: CellType): void {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) this.set(x, y, t)
  }

  spawnFood(n = 8): void {
    let placed = 0, tries = 0
    while (placed < n && tries < n * 30) {
      tries++
      const x = 2 + ((Math.random() * (this.cols - 4)) | 0)
      const y = 2 + ((Math.random() * (this.rows - 5)) | 0)
      if (this.get(x, y) === CELL.EMPTY) { this.set(x, y, CELL.FOOD); placed++ }
    }
  }

  // ── Explosion ────────────────────────────────────────────────────────────────
  private _explode(cx: number, cy: number, radius: number): void {
    const r = Math.ceil(radius)
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d > radius) continue
        const nx = cx + dx, ny = cy + dy
        const c = this.get(nx, ny)
        if (c === CELL.WALL || c === CELL.METAL) continue
        const i = this.idx(nx, ny)
        if (d < radius * 0.45) {
          this.cells[i] = CELL.EMPTY; this.heat[i] = 0
        } else {
          this.cells[i] = CELL.FIRE; this.heat[i] = 1.0
        }
        this._upd[i] = 1
      }
    }
  }

  // ── Main update ───────────────────────────────────────────────────────────────
  update(tick: number): void {
    this._upd.fill(0)
    const lf = (tick & 1) === 0

    for (let y = this.rows - 2; y >= 0; y--) {
      for (let xi = 0; xi < this.cols; xi++) {
        const x = lf ? xi : this.cols - 1 - xi
        const i = y * this.cols + x
        if (this._upd[i]) continue

        switch (this.cells[i]) {
          case CELL.SAND:      this._sand(x, y);      break
          case CELL.WATER:     this._water(x, y);     break
          case CELL.FIRE:      this._fire(x, y);      break
          case CELL.OIL:       this._oil(x, y);       break
          case CELL.STEAM:     this._steam(x, y);     break
          case CELL.POWDER:    this._powder(x, y);    break
          case CELL.GUNPOWDER: this._gunpowder(x, y); break
          case CELL.ICE:       this._ice(x, y);       break
          case CELL.SNOW:      this._snow(x, y);      break
          case CELL.MAGMA:     this._magma(x, y);     break
          case CELL.GAS:       this._gas(x, y);       break
          case CELL.ACID:      this._acid(x, y);      break
          case CELL.SEED:      this._seed(x, y, tick);break
          case CELL.WOOD:      this._wood(x, y, tick);break
          case CELL.VINE:      this._vine(x, y);      break
          case CELL.CLONE:     this._clone(x, y);     break
          case CELL.SALT:      this._salt(x, y);      break
          case CELL.BOMB:      this._bomb(x, y);      break
          case CELL.FOOD:      this._food(x, y);      break
        }
      }
    }
  }

  // ── Fluid helpers ─────────────────────────────────────────────────────────────
  private _fall(x: number, y: number, into: number[]): boolean {
    if (y + 1 >= this.rows) return false
    if (into.includes(this.get(x, y + 1))) {
      this.swap(x, y, x, y + 1); this.mark(x, y + 1); return true
    }
    return false
  }

  private _slide(x: number, y: number, into: number[]): boolean {
    const r = Math.random() < 0.5 ? 1 : -1
    for (const dx of [r, -r]) {
      if (y + 1 < this.rows && into.includes(this.get(x + dx, y + 1)) && this.get(x + dx, y) === CELL.EMPTY) {
        this.swap(x, y, x + dx, y + 1); this.mark(x + dx, y + 1); return true
      }
    }
    return false
  }

  private _spread(x: number, y: number, into: number[]): boolean {
    const r = Math.random() < 0.5 ? 1 : -1
    for (const dx of [r, -r]) {
      if (into.includes(this.get(x + dx, y))) {
        this.swap(x, y, x + dx, y); this.mark(x + dx, y); return true
      }
    }
    return false
  }

  // ── Cell rules ────────────────────────────────────────────────────────────────
  private _sand(x: number, y: number): void {
    if (this._fall(x, y, [CELL.EMPTY, CELL.WATER, CELL.OIL, CELL.GAS])) return
    this._slide(x, y, [CELL.EMPTY, CELL.WATER, CELL.GAS])
  }

  private _water(x: number, y: number): void {
    if (this._fall(x, y, [CELL.EMPTY])) return
    const r = Math.random() < 0.5 ? 1 : -1
    if (y + 1 < this.rows) {
      if (this.get(x + r, y + 1) === CELL.EMPTY) { this.swap(x, y, x + r, y + 1); this.mark(x + r, y + 1); return }
      if (this.get(x - r, y + 1) === CELL.EMPTY) { this.swap(x, y, x - r, y + 1); this.mark(x - r, y + 1); return }
    }
    // Pressure-lite: count water cells above (up to 6). Taller column → more aggressive lateral spread.
    const pStr = this.fluidPressure
    if (pStr > 0.01) {
      let col = 0
      for (let dy = 1; dy <= 6; dy++) {
        if (y - dy < 0) break
        if (this.get(x, y - dy) === CELL.WATER) col++; else break
      }
      // Spread chance increases with column height and pressure setting
      const spreadChance = 0.5 + col * 0.08 * pStr
      if (Math.random() < spreadChance) {
        // Try 2-wide spread when column is tall (siphon/jet effect)
        if (col >= 3 && pStr > 0.3) {
          for (const dx of [r, -r]) {
            if (this.get(x + dx, y) === CELL.EMPTY && this.get(x + dx * 2, y) === CELL.EMPTY) {
              this.swap(x, y, x + dx, y); this.mark(x + dx, y); return
            }
          }
        }
        if (this._spread(x, y, [CELL.EMPTY])) return
      }
    }
    this._spread(x, y, [CELL.EMPTY])
  }

  private _fire(x: number, y: number): void {
    const i = this.idx(x, y)
    this.heat[i] -= 0.004 + Math.random() * 0.009
    if (this.heat[i] <= 0) {
      this.cells[i] = Math.random() < 0.28 ? CELL.STEAM : CELL.EMPTY
      if (this.cells[i] === CELL.STEAM) this.heat[i] = 0.2 + Math.random() * 0.3
      return
    }
    if (y > 0 && this.get(x, y - 1) === CELL.EMPTY && Math.random() < 0.6) {
      this.swap(x, y, x, y - 1); this.mark(x, y - 1)
    }
    // Ignite flammables
    if (Math.random() < 0.04) {
      const dirs: [number,number][] = [[0,-1],[0,1],[-1,0],[1,0]]
      for (const [dx, dy] of dirs) {
        const nc = this.get(x+dx, y+dy)
        const ni = this.idx(x+dx, y+dy)
        if (nc === CELL.OIL || nc === CELL.WOOD || nc === CELL.VINE || nc === CELL.GAS || nc === CELL.POWDER) {
          this.cells[ni] = CELL.FIRE; this.heat[ni] = 1.0
        }
        if (nc === CELL.GUNPOWDER) { this._explode(x+dx, y+dy, 7); }
        if (nc === CELL.BOMB) { const bi = this.idx(x+dx, y+dy); if (this.extra[bi] === 0) this.extra[bi] = 1.0 }
        if (nc === CELL.WATER && Math.random() < 0.35) {
          this.cells[i] = CELL.STEAM; this.heat[i] = 0.4; return
        }
        if (nc === CELL.ICE && Math.random() < 0.1) {
          this.cells[ni] = CELL.WATER; this.heat[ni] = 0
        }
      }
    }
  }

  private _oil(x: number, y: number): void {
    if (this._fall(x, y, [CELL.EMPTY])) return
    // Float on water
    if (y > 0 && this.get(x, y - 1) === CELL.WATER) { this.swap(x, y, x, y - 1); this.mark(x, y - 1); return }
    // Pressure-lite for oil (more viscous = lower spread)
    const pStr = this.fluidPressure
    if (pStr > 0.01) {
      let col = 0
      for (let dy = 1; dy <= 4; dy++) {
        if (y - dy < 0) break
        if (this.get(x, y - dy) === CELL.OIL) col++; else break
      }
      const spreadChance = 0.2 + col * 0.06 * pStr  // lower than water (viscous)
      if (Math.random() < spreadChance) {
        this._spread(x, y, [CELL.EMPTY])
        return
      }
    }
    if (Math.random() < 0.35) this._spread(x, y, [CELL.EMPTY])
  }

  private _steam(x: number, y: number): void {
    const i = this.idx(x, y)
    this.heat[i] -= 0.005 + Math.random() * 0.004
    if (this.heat[i] <= 0) { this.cells[i] = CELL.EMPTY; return }
    if (y > 0) {
      const r = Math.random() < 0.5 ? 1 : -1
      if (this.get(x, y - 1) === CELL.EMPTY)       { this.swap(x, y, x, y - 1);   this.mark(x, y - 1) }
      else if (this.get(x+r, y-1) === CELL.EMPTY)   { this.swap(x, y, x+r, y - 1); this.mark(x+r, y - 1) }
      else if (this.get(x-r, y-1) === CELL.EMPTY)   { this.swap(x, y, x-r, y - 1); this.mark(x-r, y - 1) }
    }
  }

  private _powder(x: number, y: number): void {
    if (this._fall(x, y, [CELL.EMPTY, CELL.WATER, CELL.OIL])) return
    this._slide(x, y, [CELL.EMPTY, CELL.WATER])
    // Near fire: small explosion
    if (Math.random() < 0.03) {
      for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]] as const) {
        if (this.get(x+dx, y+dy) === CELL.FIRE || this.get(x+dx, y+dy) === CELL.MAGMA) {
          this._explode(x, y, 4); return
        }
      }
    }
  }

  private _gunpowder(x: number, y: number): void {
    if (this._fall(x, y, [CELL.EMPTY, CELL.WATER])) return
    this._slide(x, y, [CELL.EMPTY, CELL.WATER])
    // Chain reaction near fire
    if (Math.random() < 0.05) {
      for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]] as const) {
        const nc = this.get(x+dx, y+dy)
        if (nc === CELL.FIRE || nc === CELL.MAGMA) {
          this._explode(x, y, 9); return
        }
      }
    }
  }

  private _ice(x: number, y: number): void {
    const i = this.idx(x, y)
    // Melt from adjacent heat sources (fire, magma, steam)
    if (Math.random() < 0.005) {
      for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]] as const) {
        const nc = this.get(x+dx, y+dy)
        if (nc === CELL.FIRE || nc === CELL.MAGMA || nc === CELL.STEAM) {
          this.cells[i] = CELL.WATER; this.heat[i] = 0; return
        }
      }
    }
    // Heat-field melt: if local heat is above threshold, melt (integrates with diffusion)
    if (this.heat[i] > 0.35 && Math.random() < 0.04) {
      this.cells[i] = CELL.WATER; this.heat[i] = 0; return
    }
    // Gradual heat absorption from warm neighbors (even without fire)
    if (Math.random() < 0.02) {
      for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]] as const) {
        const nx = x+dx, ny = y+dy
        if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
          const ni = ny * this.cols + nx
          if (this.heat[ni] > 0.5) {
            this.heat[i] += 0.03
            break
          }
        }
      }
    }
  }

  private _snow(x: number, y: number): void {
    // Falls slowly
    if (Math.random() < 0.35) {
      if (this._fall(x, y, [CELL.EMPTY])) return
      this._slide(x, y, [CELL.EMPTY])
    }
    // Melt near heat
    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]] as const) {
      const nc = this.get(x+dx, y+dy)
      if ((nc === CELL.FIRE || nc === CELL.MAGMA) && Math.random() < 0.08) {
        this.set(x, y, CELL.WATER); return
      }
    }
  }

  private _magma(x: number, y: number): void {
    const i = this.idx(x, y)
    // Flows slowly like water
    if (Math.random() < 0.55) {
      if (this._fall(x, y, [CELL.EMPTY, CELL.WATER])) return
      if (Math.random() < 0.45) this._spread(x, y, [CELL.EMPTY])
    }
    // Ignite adjacent organics
    if (Math.random() < 0.06) {
      for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]] as const) {
        const nx = x+dx, ny = y+dy
        const nc = this.get(nx, ny)
        const ni = this.idx(nx, ny)
        if (nc === CELL.WATER)  { this.cells[ni] = CELL.STEAM; this.heat[ni] = 0.5; }
        if (nc === CELL.OIL || nc === CELL.WOOD || nc === CELL.VINE || nc === CELL.GAS) {
          this.cells[ni] = CELL.FIRE; this.heat[ni] = 1.0
        }
        if (nc === CELL.ICE)   { this.cells[ni] = CELL.WATER; this.heat[ni] = 0 }
        if (nc === CELL.SNOW)  { this.cells[ni] = CELL.STEAM; this.heat[ni] = 0.4 }
      }
    }
  }

  private _gas(x: number, y: number): void {
    const i = this.idx(x, y)
    this.heat[i] -= 0.002 + Math.random() * 0.003
    if (this.heat[i] <= 0) { this.cells[i] = CELL.EMPTY; return }
    // Rise
    if (y > 0 && Math.random() < 0.65) {
      const r = Math.random() < 0.5 ? 1 : -1
      if (this.get(x, y - 1) === CELL.EMPTY)     { this.swap(x, y, x, y - 1); this.mark(x, y - 1) }
      else if (this.get(x+r, y-1) === CELL.EMPTY) { this.swap(x, y, x+r, y-1); this.mark(x+r, y-1) }
    }
    // Explode near fire
    if (Math.random() < 0.03) {
      for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]] as const) {
        if (this.get(x+dx, y+dy) === CELL.FIRE || this.get(x+dx, y+dy) === CELL.MAGMA) {
          this._explode(x, y, 5); return
        }
      }
    }
  }

  private _acid(x: number, y: number): void {
    if (this._fall(x, y, [CELL.EMPTY])) return
    const r = Math.random() < 0.5 ? 1 : -1
    if (this.get(x+r, y+1) === CELL.EMPTY || this.get(x-r, y+1) === CELL.EMPTY)
      this._slide(x, y, [CELL.EMPTY])
    else
      this._spread(x, y, [CELL.EMPTY])
    // Dissolve adjacent cells
    if (Math.random() < 0.08) {
      const dirs: [number,number][] = [[0,-1],[0,1],[-1,0],[1,0]]
      for (const [dx, dy] of dirs) {
        const nc = this.get(x+dx, y+dy)
        if (nc === CELL.WALL || nc === CELL.SAND || nc === CELL.ICE ||
            nc === CELL.WOOD || nc === CELL.METAL || nc === CELL.VINE) {
          const ni = this.idx(x+dx, y+dy)
          this.cells[ni] = CELL.EMPTY; this.heat[ni] = 0
          // Acid weakens itself
          if (Math.random() < 0.3) { this.cells[this.idx(x,y)] = CELL.EMPTY; return }
          break
        }
      }
    }
  }

  private _seed(x: number, y: number, tick: number): void {
    // Falls
    if (this._fall(x, y, [CELL.EMPTY, CELL.WATER])) return
    this._slide(x, y, [CELL.EMPTY])
    // Once settled, germinate
    const i = this.idx(x, y)
    this.heat[i] += 0.004
    if (this.heat[i] >= 1.0 && Math.random() < 0.02) {
      // Become wood root
      this.cells[i] = CELL.WOOD; this.heat[i] = 0.9; this.extra[i] = 1  // growing=1
    }
  }

  private _wood(x: number, y: number, tick: number): void {
    const i = this.idx(x, y)
    // Burn near fire
    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]] as const) {
      const nc = this.get(x+dx, y+dy)
      if ((nc === CELL.FIRE || nc === CELL.MAGMA) && Math.random() < 0.008) {
        this.cells[i] = CELL.FIRE; this.heat[i] = 0.9; return
      }
    }
    // Grow upward if this is a growing wood tip
    if (this.extra[i] > 0 && this.heat[i] > 0.2 && Math.random() < 0.004) {
      this.heat[i] -= 0.05
      const gx = x + (Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? 1 : -1))
      const gy = y - 1
      if (this.get(gx, gy) === CELL.EMPTY) {
        this.set(gx, gy, CELL.WOOD)
        const ni = this.idx(gx, gy)
        this.heat[ni] = this.heat[i] * 0.85
        this.extra[ni] = 1  // new tip
      }
    }
  }

  private _vine(x: number, y: number): void {
    const i = this.idx(x, y)
    this.heat[i] -= 0.001
    if (this.heat[i] <= 0) return
    // Near fire: burn
    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]] as const) {
      const nc = this.get(x+dx, y+dy)
      if (nc === CELL.FIRE || nc === CELL.MAGMA) {
        this.cells[i] = CELL.FIRE; this.heat[i] = 0.9; return
      }
    }
    // Grow slowly
    if (Math.random() < 0.007) {
      const dirs: [number,number][] = [[0,1],[0,-1],[-1,0],[1,0],[1,1],[-1,1]]
      const dir = dirs[(Math.random() * dirs.length) | 0]
      const nx = x + dir[0], ny = y + dir[1]
      if (this.get(nx, ny) === CELL.EMPTY) {
        this.set(nx, ny, CELL.VINE)
        this.heat[this.idx(nx, ny)] = this.heat[i] * 0.8
      }
    }
  }

  private _clone(x: number, y: number): void {
    if (Math.random() > 0.04) return
    const dirs: [number,number][] = [[0,-1],[0,1],[-1,0],[1,0]]
    for (const [dx, dy] of dirs) {
      const nc = this.get(x+dx, y+dy)
      if (nc !== CELL.EMPTY && nc !== CELL.CLONE) {
        // Clone to a random empty neighbor
        const empDirs = dirs.filter(([ex, ey]) => this.get(x+ex, y+ey) === CELL.EMPTY)
        if (empDirs.length > 0) {
          const [ex, ey] = empDirs[(Math.random() * empDirs.length) | 0]
          this.set(x+ex, y+ey, nc)
        }
        return
      }
    }
  }

  private _salt(x: number, y: number): void {
    if (this._fall(x, y, [CELL.EMPTY, CELL.WATER, CELL.OIL])) return
    this._slide(x, y, [CELL.EMPTY])
    // Dissolve in water
    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]] as const) {
      if (this.get(x+dx, y+dy) === CELL.WATER && Math.random() < 0.06) {
        const ni = this.idx(x+dx, y+dy)
        this.cells[ni] = CELL.EMPTY  // salt water (simplified: water disappears)
        this.cells[this.idx(x,y)] = CELL.EMPTY
        return
      }
    }
  }

  private _bomb(x: number, y: number): void {
    const i = this.idx(x, y)
    if (this.extra[i] > 0) {
      // Countdown
      this.extra[i] += 0.08
      if (this.extra[i] >= 1.0) {
        this._explode(x, y, 12)
      }
      return
    }
    // Ignite near fire
    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]] as const) {
      const nc = this.get(x+dx, y+dy)
      if (nc === CELL.FIRE || nc === CELL.MAGMA) {
        this.extra[i] = 0.01  // start countdown
      }
    }
  }

  private _food(x: number, y: number): void {
    // Food has gravity — falls like grains, piles up on solid surfaces
    if (this._fall(x, y, [CELL.EMPTY, CELL.WATER])) return
    this._slide(x, y, [CELL.EMPTY])
  }

  // ── Rendering to RGBA ImageData ────────────────────────────────────────────────
  render(data: Uint8ClampedArray, tick: number): void {
    const t = tick * 0.06
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const ci = y * this.cols + x
        const pi = ci << 2
        const cell = this.cells[ci]
        const heat = this.heat[ci]
        let r = 4, g = 6, b = 14

        switch (cell) {
          case CELL.WALL: {
            const v = ((x * 3 + y * 7) & 7) * 3
            r = 38 + v; g = 55 + v; b = 75 + v
            break
          }
          case CELL.WATER: {
            const w = (Math.sin(t + x * 0.35 + y * 0.2) * 15) | 0
            r = 10; g = 65 + w; b = 195 + w * 0.5
            break
          }
          case CELL.SAND: {
            const v = ((x * 5 + y * 3) & 15) * 4
            r = 165 + (v >> 1); g = 112 + (v >> 2); b = 38
            break
          }
          case CELL.FIRE: {
            const h = clamp(heat, 0, 1)
            const fl = (Math.random() * 50) | 0
            r = clamp((210 + h * 45 + fl) | 0, 0, 255)
            g = clamp((h * 90 + 12 + (fl >> 2)) | 0, 0, 255)
            b = 0
            break
          }
          case CELL.FOOD: {
            const p = (Math.sin(t * 1.4 + x * 0.7 + y * 0.5) * 30) | 0
            r = 0; g = clamp(170 + p, 80, 255); b = clamp(75 + (p >> 1), 30, 150)
            break
          }
          case CELL.OIL: {
            const v = ((x ^ y) & 7) * 5
            r = 55 + v; g = 12; b = 80 + v
            break
          }
          case CELL.STEAM: {
            const a = clamp(heat * 2.8, 0, 1)
            r = (115 * a + 4) | 0; g = (138 * a + 6) | 0; b = (162 * a + 14) | 0
            break
          }
          case CELL.POWDER: {
            const v = ((x * 7 + y * 5) & 15) * 3
            r = 205 + v; g = 185 + v; b = 140
            break
          }
          case CELL.GUNPOWDER: {
            const v = ((x ^ y) & 7) * 4
            r = 50 + v; g = 52 + v; b = 48 + v
            break
          }
          case CELL.ICE: {
            const v = ((x * 2 + y) & 7) * 4
            r = 140 + v; g = 205 + v; b = 255
            break
          }
          case CELL.SNOW: {
            const v = ((x + y) & 3) * 8
            r = 215 + v; g = 220 + v; b = 235 + v
            break
          }
          case CELL.MAGMA: {
            const fl = (Math.random() * 40) | 0
            r = clamp(235 + fl, 0, 255)
            g = clamp((heat * 60 + 20 + (fl >> 1)) | 0, 0, 255)
            b = 0
            break
          }
          case CELL.GAS: {
            const a = clamp(heat * 1.8, 0, 1)
            r = (80 * a + 4) | 0; g = (185 * a + 6) | 0; b = (60 * a + 10) | 0
            break
          }
          case CELL.ACID: {
            const p = (Math.sin(t * 1.8 + x * 0.4) * 20) | 0
            r = 0; g = clamp(200 + p, 100, 255); b = clamp(160 + p, 80, 220)
            break
          }
          case CELL.SEED: {
            const v = ((x * 3 + y * 5) & 7) * 5
            r = 80 + v; g = 55 + v; b = 20
            break
          }
          case CELL.WOOD: {
            const v = ((x * 7 + y * 3) & 15) * 3
            r = 110 + v; g = 75 + v; b = 28
            break
          }
          case CELL.VINE: {
            const v = ((x + y * 3) & 7) * 5
            r = 18; g = 105 + v; b = 22
            break
          }
          case CELL.CLONE: {
            const p = (Math.sin(t * 2.5 + x * 0.8 + y * 0.6) * 40) | 0
            r = clamp(180 + p, 80, 255); g = 30; b = clamp(220 + p, 100, 255)
            break
          }
          case CELL.SALT: {
            const v = ((x + y) & 3) * 10
            r = 210 + v; g = 210 + v; b = 230 + v
            break
          }
          case CELL.METAL: {
            const v = ((x * 3 + y) & 7) * 3
            r = 100 + v; g = 115 + v; b = 135 + v
            break
          }
          case CELL.BOMB: {
            const lit = this.extra[ci] > 0
            const fl = lit ? ((Math.random() * 60) | 0) : 0
            r = lit ? clamp(230 + fl, 0, 255) : 40
            g = lit ? clamp(100 + fl, 0, 255) : 35
            b = lit ? 0 : 30
            break
          }
          default:
            r = 4 + ((y / this.rows * 5) | 0)
            g = 6 + ((y / this.rows * 6) | 0)
            b = 14 + ((y / this.rows * 10) | 0)
        }

        data[pi]     = r
        data[pi + 1] = g
        data[pi + 2] = b
        data[pi + 3] = 255
      }
    }
  }

  // ── Query utilities ────────────────────────────────────────────────────────────
  countType(t: CellType): number {
    let n = 0
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i] === t) n++
    return n
  }

  nearestFood(gx: number, gy: number, radius: number): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null
    let bestD = radius * radius
    const r = Math.ceil(radius)
    const x0 = Math.max(0, (gx - r) | 0), x1 = Math.min(this.cols - 1, (gx + r) | 0)
    const y0 = Math.max(0, (gy - r) | 0), y1 = Math.min(this.rows - 1, (gy + r) | 0)
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (this.cells[cy * this.cols + cx] === CELL.FOOD) {
          const d = (cx - gx) ** 2 + (cy - gy) ** 2
          if (d < bestD) { bestD = d; best = { x: cx, y: cy } }
        }
      }
    }
    return best
  }

  consume(gx: number, gy: number, radius: number): number {
    let n = 0
    const r = Math.ceil(radius)
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const x = (gx + dx) | 0, y = (gy + dy) | 0
          if (this.get(x, y) === CELL.FOOD) { this.set(x, y, CELL.EMPTY); n++ }
        }
      }
    }
    return n
  }

  isPassable(x: number, y: number): boolean {
    const c = this.get(x | 0, y | 0)
    return c === CELL.EMPTY || c === CELL.WATER || c === CELL.FOOD ||
           c === CELL.OIL   || c === CELL.GAS   || c === CELL.STEAM
  }

  isSolid(x: number, y: number): boolean {
    const c = this.get(x | 0, y | 0)
    return c === CELL.WALL || c === CELL.SAND || c === CELL.ICE ||
           c === CELL.WOOD || c === CELL.METAL || c === CELL.BOMB ||
           c === CELL.SNOW || c === CELL.SALT  || c === CELL.POWDER ||
           c === CELL.GUNPOWDER
  }

  cellAt(x: number, y: number): CellType { return this.get(x | 0, y | 0) }

  // ── Heat diffusion — cheap von Neumann blur, runs every few ticks ────────────
  diffuseHeat(strength: number): void {
    if (strength < 0.001) return
    const W = this.cols, H = this.rows
    const src = this.heat, dst = this._heatBuf
    const coeff = 0.08 * strength  // small diffusion coefficient
    // Copy current heat to buffer
    dst.set(src)
    // Diffuse: for each cell, average with 4 neighbors weighted by coeff
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x
        const c = this.cells[i]
        // Skip cells that "own" their heat (fire, steam, gas, seed, vine — timers, not temperature)
        if (c === CELL.FIRE || c === CELL.STEAM || c === CELL.GAS ||
            c === CELL.SEED || c === CELL.VINE || c === CELL.EMPTY) continue
        // Reduce diffusion in solids (walls, metal conduct well; wood, ice less)
        const props = ELEMENT_PROPS[c]
        const k = props ? props.thermal * coeff : coeff * 0.5
        const avg = (src[i - 1] + src[i + 1] + src[i - W] + src[i + W]) * 0.25
        dst[i] = src[i] + (avg - src[i]) * k
        // Clamp
        if (dst[i] < 0) dst[i] = 0
        if (dst[i] > 1) dst[i] = 1
      }
    }
    // Write back
    src.set(dst)
  }

  clear(): void { this.cells.fill(0); this.heat.fill(0); this.extra.fill(0) }
}

// ── Scene generators ───────────────────────────────────────────────────────────

export interface SpawnPoint { x: number; y: number }

/** Cellular automata cave — Rain World style */
export function generateCave(grid: ParticleWorld, seed = Math.random()): SpawnPoint {
  grid.clear()
  const { cols, rows } = grid

  // 1. Random fill (55% wall)
  const rng = (() => { let s = seed * 2147483647; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 } })()
  const buf = new Uint8Array(cols * rows)
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      buf[y * cols + x] = (x === 0 || x === cols-1 || y === 0 || y === rows-1) ? 1 : (rng() < 0.54 ? 1 : 0)

  // 2. CA smoothing (5 passes)
  const tmp = new Uint8Array(cols * rows)
  for (let pass = 0; pass < 5; pass++) {
    for (let y = 1; y < rows-1; y++) {
      for (let x = 1; x < cols-1; x++) {
        let w = 0
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) w += buf[(y+dy)*cols+(x+dx)]
        tmp[y*cols+x] = w >= 5 ? 1 : 0
      }
    }
    buf.set(tmp)
    buf[0] = buf[cols-1] = buf[(rows-1)*cols] = buf[rows*cols-1] = 1
  }

  // 3. Apply to grid
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      if (buf[y*cols+x]) grid.set(x, y, CELL.WALL)

  // 4. Solid floor
  for (let x = 0; x < cols; x++) { grid.set(x, rows-1, CELL.WALL); grid.set(x, rows-2, CELL.WALL) }

  // 5. Water pockets (low empty areas)
  for (let x = 2; x < cols-2; x++) {
    for (let y = Math.floor(rows*0.75); y < rows-3; y++) {
      if (grid.get(x,y) === CELL.EMPTY && grid.get(x,y-1) === CELL.EMPTY && rng() < 0.12)
        grid.set(x, y, CELL.WATER)
    }
  }

  // 6. Food nodes
  for (let i = 0; i < 6; i++) {
    for (let tries = 0; tries < 50; tries++) {
      const fx = 2 + (rng() * (cols-4)) | 0, fy = 2 + (rng() * (rows-4)) | 0
      if (grid.get(fx, fy) === CELL.EMPTY) { grid.set(fx, fy, CELL.FOOD); break }
    }
  }

  // 7. Find spawn: clear area near center-top
  const sx = (cols / 2) | 0
  for (let y = 4; y < rows-4; y++) {
    if (grid.get(sx, y) === CELL.EMPTY && grid.get(sx, y+1) === CELL.EMPTY && grid.get(sx, y+2) === CELL.EMPTY)
      return { x: sx, y: y + 1 }
  }
  return { x: sx, y: 10 }
}

/** Flat terrain with platforms */
export function generateFlat(grid: ParticleWorld): SpawnPoint {
  grid.clear()
  const { cols, rows } = grid

  // Borders
  for (let x = 0; x < cols; x++) { grid.set(x, 0, CELL.WALL); grid.set(x, rows-1, CELL.WALL); grid.set(x, rows-2, CELL.WALL) }
  for (let y = 0; y < rows; y++) { grid.set(0, y, CELL.WALL); grid.set(cols-1, y, CELL.WALL) }

  // Floor
  for (let x = 1; x < cols-1; x++) {
    const dh = 1 + (Math.sin(x * 0.1) * 1.5 + Math.random() * 1) | 0
    for (let d = 0; d <= dh; d++) grid.set(x, rows-3-d, CELL.SAND)
  }

  // Platforms
  for (let i = 0; i < 5; i++) {
    const px = 15 + (Math.random() * (cols-30)) | 0
    const py = rows - 8 - (Math.random() * (rows * 0.4)) | 0
    const pw = 10 + (Math.random() * 20) | 0
    grid.fill(px, py, px+pw, py+1, CELL.WALL)
  }

  grid.spawnFood(12)
  return { x: (cols * 0.15) | 0, y: rows - 8 }
}

/** Rising water / escape scenario */
export function generateEscape(grid: ParticleWorld): SpawnPoint {
  grid.clear()
  const { cols, rows } = grid

  for (let x = 0; x < cols; x++) { grid.set(x, 0, CELL.WALL); grid.set(x, rows-1, CELL.WALL) }
  for (let y = 0; y < rows; y++) { grid.set(0, y, CELL.WALL); grid.set(cols-1, y, CELL.WALL) }

  // Stepped terrain
  for (let x = 1; x < cols-1; x++) {
    const step = Math.floor(x / (cols / 6))
    const floorY = rows - 4 - step * 4
    for (let y = floorY; y < rows-1; y++) grid.set(x, y, CELL.WALL)
    // Step platforms
    if (x % ((cols/6)|0) === 0 && x > 0) {
      const py = floorY - 1
      grid.fill(x, py, x + 8, py, CELL.WALL)
    }
  }

  // Shelter at top-right
  const shx = cols - 18, shy = 3
  grid.fill(shx, shy, cols-2, shy+5, CELL.WALL)
  grid.set(shx, shy+1, CELL.EMPTY); grid.set(shx, shy+2, CELL.EMPTY); grid.set(shx, shy+3, CELL.EMPTY) // entrance
  grid.set(shx + 2, shy + 2, CELL.FOOD) // food inside

  grid.spawnFood(8)
  return { x: 8, y: rows - 8 }
}