// ── Terrain Generator — Cave/Flat/Ramp/Water presets + procedural cave CA ──────
import { ParticleWorld, CELL } from './particles'

export type TerrainId = 'terrarium' | 'flat' | 'cave' | 'ramp' | 'water' | 'steps'

export interface TerrainDef {
  id: TerrainId
  label: string
  icon: string
  desc: string
  spawnX: number
  spawnY: number
  goalX: number
}

export const TERRAINS: TerrainDef[] = [
  { id: 'terrarium', label: 'Terrarium', icon: '🪴', desc: 'Blank box — build from scratch', spawnX: 30, spawnY: 0.6, goalX: 230 },
  { id: 'flat',  label: 'Flat',  icon: '🏜', desc: 'Open flat ground — first steps',            spawnX: 12, spawnY: 0.5, goalX: 230 },
  { id: 'cave',  label: 'Cave',  icon: '🕳', desc: 'Procedural cavern — Rain World vibes',      spawnX: 14, spawnY: 0.3, goalX: 240 },
  { id: 'ramp',  label: 'Ramp',  icon: '⛰', desc: 'Ascending terrain — test climbing',         spawnX: 12, spawnY: 0.5, goalX: 230 },
  { id: 'water', label: 'Water', icon: '🌊', desc: 'Flooded terrain — test swimming',           spawnX: 12, spawnY: 0.4, goalX: 230 },
  { id: 'steps', label: 'Steps', icon: '🪜', desc: 'Staircase obstacles — curriculum stage 3',  spawnX: 12, spawnY: 0.5, goalX: 230 },
]

// ── Border walls (always placed) ───────────────────────────────────────────────
function borders(grid: ParticleWorld): void {
  for (let x = 0; x < grid.cols; x++) {
    grid.set(x, 0, CELL.WALL)
    grid.set(x, grid.rows - 1, CELL.WALL)
    grid.set(x, grid.rows - 2, CELL.WALL)
  }
  for (let y = 0; y < grid.rows; y++) {
    grid.set(0, y, CELL.WALL)
    grid.set(grid.cols - 1, y, CELL.WALL)
  }
}

// ── Terrarium (clean blank box) ────────────────────────────────────────────────
export function buildTerrarium(grid: ParticleWorld): void {
  grid.clear()
  borders(grid)
  const rows = grid.rows, cols = grid.cols
  // Simple flat floor only — completely empty otherwise
  const floorY = Math.floor(rows * 0.85)
  for (let x = 1; x < cols - 1; x++) {
    for (let d = 0; d < 3; d++) grid.set(x, floorY + d, CELL.WALL)
  }
}

// ── Flat terrain ───────────────────────────────────────────────────────────────
export function buildFlat(grid: ParticleWorld): void {
  grid.clear()
  borders(grid)

  const floorY = Math.floor(grid.rows * 0.78)

  // Floor with slight surface variation
  for (let x = 1; x < grid.cols - 1; x++) {
    const bump = Math.floor(Math.sin(x * 0.12) * 1.5 + Math.random() * 0.5)
    for (let d = 0; d < 4 + bump; d++) {
      grid.set(x, floorY + d, CELL.WALL)
    }
  }

  // A few rock platforms
  const platforms = [
    [50, floorY - 14, 25], [130, floorY - 22, 30], [200, floorY - 12, 22],
  ] as [number, number, number][]
  for (const [px, py, pw] of platforms) {
    for (let x = px; x < px + pw; x++) grid.set(x, py, CELL.WALL)
  }

  // Water pool
  grid.fill(90, floorY - 8, 125, floorY - 1, CELL.WATER)

  // Food nodes
  grid.spawnFood(20)
  // Shelter marker (food cluster near goal)
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++)
      grid.set(220 + dx, floorY - 6 + dy, CELL.FOOD)
}

// ── Procedural cave (CA-based) ─────────────────────────────────────────────────
export function buildCave(grid: ParticleWorld, seed = Math.random()): void {
  grid.clear()

  const cols = grid.cols
  const rows = grid.rows

  // Random fill (45% wall density)
  const rng = seededRng(seed)
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      grid.cells[y * cols + x] = rng() < 0.44 ? CELL.WALL : CELL.EMPTY
    }
  }

  // CA smoothing (5 iterations)
  const scratch = new Uint8Array(cols * rows)
  for (let iter = 0; iter < 5; iter++) {
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        let walls = 0
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (grid.cells[(y + dy) * cols + (x + dx)] === CELL.WALL) walls++
        scratch[y * cols + x] = walls >= 5 ? CELL.WALL : CELL.EMPTY
      }
    }
    for (let i = 0; i < scratch.length; i++)
      if (scratch[i] !== 0) grid.cells[i] = scratch[i]
  }

  borders(grid)

  // Carve spawn corridor (ensure creature can spawn)
  const spawnY = Math.floor(rows * 0.5)
  for (let y = spawnY - 4; y < spawnY + 4; y++) {
    for (let x = 2; x < 22; x++) grid.set(x, y, CELL.EMPTY)
  }

  // Carve goal corridor at right side
  for (let y = spawnY - 5; y < spawnY + 5; y++) {
    for (let x = cols - 22; x < cols - 2; x++) grid.set(x, y, CELL.EMPTY)
  }

  // Carve a winding horizontal passage from spawn to goal
  let px = 15, py = spawnY
  while (px < cols - 20) {
    const width = 8 + (Math.floor(rng() * 6) | 0)
    const height = 6 + (Math.floor(rng() * 8) | 0)
    for (let dy = -height / 2; dy <= height / 2; dy++) {
      const cy = Math.floor(py + dy)
      if (cy > 1 && cy < rows - 2) {
        for (let dx = 0; dx < 6; dx++) {
          const cx = px + dx
          if (cx > 1 && cx < cols - 2) grid.set(cx, cy, CELL.EMPTY)
        }
      }
    }
    px += 4 + (Math.floor(rng() * 4) | 0)
    py += Math.floor((rng() - 0.5) * 5)
    py = Math.max(8, Math.min(rows - 10, py))
  }

  // Puddles in low areas
  for (let i = 0; i < 6; i++) {
    const wx = 20 + Math.floor(rng() * (cols - 40))
    const wy = rows - 10
    if (grid.get(wx, wy) === CELL.EMPTY) {
      for (let dy = 0; dy < 4; dy++)
        for (let dx = -5; dx <= 5; dx++)
          if (grid.get(wx + dx, wy - dy) === CELL.EMPTY)
            grid.set(wx + dx, wy - dy, CELL.WATER)
    }
  }

  grid.spawnFood(18)
}

// ── Ramp ──────────────────────────────────────────────────────────────────────
export function buildRamp(grid: ParticleWorld): void {
  grid.clear()
  borders(grid)

  const rows = grid.rows, cols = grid.cols
  // Ascending floor
  for (let x = 1; x < cols - 1; x++) {
    const floorY = Math.floor(rows * 0.82 - x * (rows * 0.35) / cols)
    for (let d = 0; d < 4; d++) grid.set(x, floorY + d, CELL.WALL)
  }

  // Ledges at different heights
  const ledges = [[60, 0.62, 20], [130, 0.5, 25], [200, 0.38, 20]] as [number, number, number][]
  for (const [lx, frac, lw] of ledges) {
    const ly = Math.floor(rows * frac)
    for (let x = lx; x < lx + lw; x++) grid.set(x, ly, CELL.WALL)
  }

  grid.spawnFood(15)
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -3; dx <= 3; dx++)
      grid.set(220 + dx, Math.floor(rows * 0.25) + dy, CELL.FOOD)
}

// ── Water ─────────────────────────────────────────────────────────────────────
export function buildWater(grid: ParticleWorld): void {
  grid.clear()
  borders(grid)

  const rows = grid.rows, cols = grid.cols
  const floorY = Math.floor(rows * 0.8)

  for (let x = 1; x < cols - 1; x++) {
    for (let d = 0; d < 3; d++) grid.set(x, floorY + d, CELL.WALL)
  }

  // Water fills most of the area
  grid.fill(1, Math.floor(rows * 0.35), cols - 2, floorY - 1, CELL.WATER)

  // Platforms above water
  grid.fill(30, Math.floor(rows * 0.32), 80, Math.floor(rows * 0.33), CELL.WALL)
  grid.fill(100, Math.floor(rows * 0.24), 160, Math.floor(rows * 0.25), CELL.WALL)
  grid.fill(180, Math.floor(rows * 0.28), 240, Math.floor(rows * 0.29), CELL.WALL)

  grid.spawnFood(18)
}

// ── Steps ─────────────────────────────────────────────────────────────────────
export function buildSteps(grid: ParticleWorld): void {
  grid.clear()
  borders(grid)

  const rows = grid.rows, cols = grid.cols
  const baseY = Math.floor(rows * 0.78)

  // Flat base
  for (let x = 1; x < cols - 1; x++) {
    for (let d = 0; d < 3; d++) grid.set(x, baseY + d, CELL.WALL)
  }

  // Staircase
  let stepH = 0
  for (let x = 30; x < cols - 30; x += 22) {
    stepH += 6
    const topY = baseY - stepH
    grid.fill(x, topY, x + 22, baseY, CELL.WALL)
  }

  grid.spawnFood(15)
}

// ── Main dispatcher ────────────────────────────────────────────────────────────
export function buildTerrain(id: TerrainId, grid: ParticleWorld, caveSeed?: number): TerrainDef {
  const def = TERRAINS.find(t => t.id === id) ?? TERRAINS[0]
  switch (id) {
    case 'terrarium': buildTerrarium(grid); break
    case 'flat':  buildFlat(grid);              break
    case 'cave':  buildCave(grid, caveSeed);    break
    case 'ramp':  buildRamp(grid);              break
    case 'water': buildWater(grid);             break
    case 'steps': buildSteps(grid);             break
  }
  return def
}

// Compute absolute spawn Y from fraction (find ground near spawnX)
export function findSpawnY(grid: ParticleWorld, sx: number, yFrac: number): number {
  const startY = Math.floor(grid.rows * yFrac)
  for (let y = startY; y < grid.rows - 2; y++) {
    if (grid.isSolid(sx | 0, y)) return y - 5  // 5 cells above first solid
  }
  return Math.floor(grid.rows * yFrac)
}

// ── Tiny seeded RNG ───────────────────────────────────────────────────────────
function seededRng(seed: number): () => number {
  let s = seed * 2654435761 >>> 0
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}