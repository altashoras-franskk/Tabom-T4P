// ── Physics Sandbox v4 — Ultimate Living Aquarium & Toybox ─────────────────────
// Persistent ecosystem sandbox with massive tool palette, organic creatures,
// interactive objects, growing plants, and full environment control.
// Dan Ball × Rain World × Powder Game × Terrarium aesthetic.

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Play, Pause, RotateCcw, ChevronLeft, ChevronRight, ChevronDown,
  Zap, Leaf, Dna, Trophy, Settings, Droplets,
  ZoomIn, ZoomOut, Move, Hand, Eraser, Paintbrush,
  Bug, TreePine, Target, Eye,
  Bomb as BombIcon,
  Sprout, Layers, Sparkles,
  Circle, Square, Crosshair,
} from 'lucide-react'

import { ParticleWorld, CELL, CellType, GRID_W, GRID_H, ELEMENTS, CATEGORIES, ELEMENT_PROPS, isFluid } from '../sim/physicsSandbox/particles'
import { buildTerrain, findSpawnY, TerrainId, TERRAINS } from '../sim/physicsSandbox/terrainGen'
import {
  SegCreature, CreatureBP, CEMTrainer, Species, TrainStats,
  BLUEPRINTS, spawnCreature, stepCreature, evalCPG, drawCreature, saveSpecies,
  pushCreaturesApart, tryReproduce,
  interactCreatures, collideCreatureSegments, stepRagdoll, drawRagdoll,
} from '../sim/physicsSandbox/segCreature'

// ── Types ─────────────────────────────────────────────────────────────────────
type ToolMode = 'paint' | 'erase' | 'grab' | 'inspect' | 'drop' | 'plant' | 'creature' | 'power' | 'plant_tool'
type PlantToolType = 'trim' | 'water' | 'fertilize' | 'harvest'
type PanelTab = 'elements' | 'objects' | 'creatures' | 'plants' | 'environment' | 'ecosystem'
type BrushShape = 'circle' | 'square' | 'spray' | 'hline' | 'vline'
type PowerType = 'attract' | 'repel' | 'feed' | 'shockwave' | 'heal' | 'fire_rain' | 'freeze_wave' | 'speed_boost'

const POWER_DEFS: { id: PowerType; label: string; icon: string; color: string; desc: string }[] = [
  { id: 'attract',      label: 'Attract',      icon: '◉', color: '#ff88ff', desc: 'Pull all creatures toward cursor' },
  { id: 'repel',        label: 'Repel',         icon: '◎', color: '#88ffcc', desc: 'Push all creatures away' },
  { id: 'feed',         label: 'Feed',          icon: '🍖', color: '#44ff88', desc: 'Spawn food at cursor area' },
  { id: 'shockwave',    label: 'Shockwave',     icon: '💥', color: '#ffaa44', desc: 'Explosive force push on creatures' },
  { id: 'heal',         label: 'Heal',          icon: '💚', color: '#88ff88', desc: 'Restore energy to nearby creatures' },
  { id: 'fire_rain',    label: 'Fire Rain',     icon: '🔥', color: '#ff5500', desc: 'Rain fire from above at cursor' },
  { id: 'freeze_wave',  label: 'Freeze Wave',   icon: '❄',  color: '#88ccff', desc: 'Freeze water and cool area' },
  { id: 'speed_boost',  label: 'Speed Boost',   icon: '⚡', color: '#ffff44', desc: 'Temporarily boost creature speed' },
]

interface DroppedObject {
  id: string
  type: string
  x: number; y: number
  vx: number; vy: number
  angle: number
  omega: number
  radius: number
  strength: number
  life: number
  maxLife: number
  active: boolean
}

interface PlantNode {
  x: number; y: number
  vx: number; vy: number           // velocity for ragdoll physics
  restDx: number; restDy: number   // rest offset from parent (spring target)
  age: number
  thickness: number
  children: PlantNode[]
  angle: number
  alive: boolean
}

interface GrowingPlant {
  id: string
  root: PlantNode
  species: 'tree' | 'vine' | 'coral' | 'mushroom' | 'fern' | 'cactus' | 'kelp' | 'bamboo' | 'moss' | 'sunflower' | 'lily' | 'mangrove' | 'orchid' | 'pitcher' | 'bonsai'
  color: string
  growthRate: number
  age: number
}

interface ViewState { scale: number; panX: number; panY: number }

// ── Object Definitions ─────────────────────────────────────────────────────────
const OBJECT_DEFS = [
  { id: 'bomb',       label: 'Bomb',       icon: '💣', cat: 'explosive', desc: 'Explodes on contact with fire', color: '#ff6622' },
  { id: 'c4',         label: 'C4',         icon: '🧨', cat: 'explosive', desc: 'Timed explosion, massive radius', color: '#ff4444' },
  { id: 'nuke',       label: 'Nuke',       icon: '☢',  cat: 'explosive', desc: 'Devastating chain reaction', color: '#ffcc00' },
  { id: 'fan',        label: 'Fan',        icon: '🌀', cat: 'force',     desc: 'Pushes particles & creatures', color: '#66ccff' },
  { id: 'attractor',  label: 'Attractor',  icon: '◉',  cat: 'force',     desc: 'Pulls everything nearby', color: '#ff88ff' },
  { id: 'repulsor',   label: 'Repulsor',   icon: '◎',  cat: 'force',     desc: 'Pushes everything away', color: '#88ffcc' },
  { id: 'vortex',     label: 'Vortex',     icon: '🌊', cat: 'force',     desc: 'Swirling force field', color: '#4488ff' },
  { id: 'heater',     label: 'Heater',     icon: '🔥', cat: 'thermal',   desc: 'Melts ice, boils water', color: '#ff8844' },
  { id: 'cooler',     label: 'Cooler',     icon: '❄',  cat: 'thermal',   desc: 'Freezes water, cools lava', color: '#88ccff' },
  { id: 'lightning',  label: 'Lightning',  icon: '⚡', cat: 'energy',    desc: 'Electric bolt, ignites & destroys', color: '#ffff44' },
  { id: 'laser',      label: 'Laser',      icon: '▬',  cat: 'energy',    desc: 'Focused beam cuts through matter', color: '#ff2222' },
  { id: 'virus',      label: 'Virus',      icon: '🦠', cat: 'bio',       desc: 'Spreads and consumes organic matter', color: '#88ff44' },
  { id: 'spore',      label: 'Spore Cloud', icon: '🍄', cat: 'bio',      desc: 'Disperses spores that grow', color: '#aa88ff' },
  { id: 'wheel',      label: 'Wheel',      icon: '⚙',  cat: 'mech',     desc: 'Rolling physics body', color: '#aabbcc' },
  { id: 'ball',       label: 'Ball',       icon: '●',  cat: 'mech',      desc: 'Bouncy physics sphere', color: '#ff88aa' },
  { id: 'box',        label: 'Box',        icon: '■',  cat: 'mech',      desc: 'Heavy physics block', color: '#88aaff' },
  { id: 'spring',     label: 'Spring',     icon: '⌇',  cat: 'mech',     desc: 'Bouncy spring launcher', color: '#44ff88' },
  { id: 'motor',      label: 'Motor',      icon: '⟳',  cat: 'mech',     desc: 'Spinning motor with torque', color: '#ffaa44' },
  { id: 'blackhole',  label: 'Black Hole', icon: '⬤',  cat: 'cosmic',   desc: 'Devours everything nearby', color: '#440066' },
  { id: 'whitehole',  label: 'White Hole', icon: '○',  cat: 'cosmic',   desc: 'Spawns random matter', color: '#ffffff' },
  { id: 'portal_in',  label: 'Portal In',  icon: '◐',  cat: 'cosmic',   desc: 'Teleports matter to portal out', color: '#ff44ff' },
  { id: 'portal_out', label: 'Portal Out', icon: '◑',  cat: 'cosmic',   desc: 'Receives teleported matter', color: '#44ffff' },
] as const

const OBJECT_CATS = [
  { id: 'explosive', label: 'Explosives',  color: '#ff6622' },
  { id: 'force',     label: 'Forces',      color: '#66ccff' },
  { id: 'thermal',   label: 'Thermal',     color: '#ff8844' },
  { id: 'energy',    label: 'Energy',      color: '#ffff44' },
  { id: 'bio',       label: 'Biological',  color: '#88ff44' },
  { id: 'mech',      label: 'Mechanical',  color: '#aabbcc' },
  { id: 'cosmic',    label: 'Cosmic',      color: '#aa44ff' },
]

const PLANT_DEFS = [
  { id: 'tree',       label: 'Oak Tree',     icon: '🌲', color: '#228833', desc: 'Grows tall, branches wide, drops fruit' },
  { id: 'vine',       label: 'Ivy Vine',     icon: '🌿', color: '#33aa44', desc: 'Invasive creeper, never stops growing' },
  { id: 'coral',      label: 'Coral',        icon: '🪸', color: '#ff6688', desc: 'Underwater only — needs water to grow' },
  { id: 'mushroom',   label: 'Mushroom',     icon: '🍄', color: '#aa66cc', desc: 'Fungi, spreads spores, grows in dark' },
  { id: 'fern',       label: 'Fern',         icon: '🌾', color: '#44cc55', desc: 'Fractal fronds, photosynthesizes fast' },
  { id: 'cactus',     label: 'Cactus',       icon: '🌵', color: '#55aa44', desc: 'Desert plant, slow growth, stores water' },
  { id: 'kelp',       label: 'Giant Kelp',   icon: '🌊', color: '#228866', desc: 'Aquatic, grows very tall in water' },
  { id: 'bamboo',     label: 'Bamboo',       icon: '🎋', color: '#33cc33', desc: 'Grows extremely fast, straight up' },
  { id: 'moss',       label: 'Moss',         icon: '🟢', color: '#448833', desc: 'Spreads on surfaces, needs moisture' },
  { id: 'sunflower',  label: 'Sunflower',    icon: '🌻', color: '#ddaa22', desc: 'Tall flower, produces seeds (food)' },
  { id: 'lily',       label: 'Water Lily',   icon: '🪷', color: '#ff88bb', desc: 'Floats on water, blooms flowers' },
  { id: 'mangrove',   label: 'Mangrove',     icon: '🌳', color: '#337744', desc: 'Roots in water/land boundary' },
  { id: 'orchid',     label: 'Orchid',       icon: '🌺', color: '#cc44aa', desc: 'Rare bloom, needs specific conditions' },
  { id: 'pitcher',    label: 'Pitcher Plant', icon: '🪴', color: '#44aa66', desc: 'Carnivorous! Traps small creatures' },
  { id: 'bonsai',     label: 'Bonsai',       icon: '🌴', color: '#557733', desc: 'Compact tree, slow but elegant growth' },
] as const

const PLANT_TOOL_DEFS: { id: PlantToolType; label: string; icon: string; color: string; desc: string }[] = [
  { id: 'trim',      label: 'Trim',      icon: '✂', color: '#ff8866', desc: 'Cut back overgrown plants' },
  { id: 'water',     label: 'Water',     icon: '💧', color: '#4488ff', desc: 'Water plants to boost growth' },
  { id: 'fertilize', label: 'Fertilize', icon: '🧪', color: '#88cc44', desc: 'Boost growth rate dramatically' },
  { id: 'harvest',   label: 'Harvest',   icon: '🧺', color: '#ddaa44', desc: 'Collect fruit/seeds from plants' },
]

// ── UI micro-components ───────────────────────────────────────────────────────
const MiniSlider: React.FC<{
  label: string; val: number; min: number; max: number; step: number
  fmt?: (v: number) => string; color?: string; onChange: (v: number) => void
}> = ({ label, val, min, max, step, fmt, color = '#88aaff', onChange }) => {
  const pct = ((val - min) / (max - min) * 100).toFixed(0) + '%'
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between">
        <span className="text-[6px] font-mono uppercase tracking-widest" style={{ color: color + '70' }}>{label}</span>
        <span className="text-[6.5px] font-mono" style={{ color: color + 'bb' }}>{fmt ? fmt(val) : val}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={e => onChange(+e.target.value)}
        className="w-full h-[2px] appearance-none cursor-pointer rounded-full"
        style={{ background: `linear-gradient(90deg,${color}55 ${pct},rgba(255,255,255,.06) ${pct})` }} />
    </div>
  )
}

const IconBtn: React.FC<{
  active?: boolean; color?: string; onClick: () => void; children: React.ReactNode
  title?: string; size?: 'sm' | 'md'
}> = ({ active, color = '#88aaff', onClick, children, title, size = 'sm' }) => (
  <button onClick={onClick} title={title}
    className={`flex items-center justify-center gap-0.5 rounded transition-all border
      ${size === 'sm' ? 'px-1.5 py-0.5 text-[6.5px]' : 'px-2 py-1 text-[7px]'} font-mono uppercase tracking-widest
      ${active
        ? 'border-current/30 bg-current/8'
        : 'border-white/[0.06] text-white/30 hover:text-white/55 hover:bg-white/[0.04]'}`}
    style={active ? { color, borderColor: color + '40', background: color + '10' } : {}}>
    {children}
  </button>
)

const SectionHeader: React.FC<{
  label: string; open: boolean; onToggle: () => void; color?: string; count?: number
}> = ({ label, open, onToggle, color = '#88aaff', count }) => (
  <button onClick={onToggle}
    className="flex items-center w-full px-2 py-1.5 gap-1 hover:bg-white/[0.03] transition-all">
    {open ? <ChevronDown size={7} className="text-white/25" /> : <ChevronRight size={7} className="text-white/25" />}
    <span className="text-[6px] font-mono uppercase tracking-widest" style={{ color: color + '70' }}>
      {label}
    </span>
    {count != null && (
      <span className="ml-auto text-[5.5px] font-mono px-1 rounded-full" style={{ color: color + '50', background: color + '0c' }}>
        {count}
      </span>
    )}
  </button>
)

// ── Component ──────────────────────────────────────────────────────────────────
interface Props { active: boolean }

export const PhysicsSandbox: React.FC<Props> = ({ active }) => {
  // Canvas
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const rafRef        = useRef(0)
  const tickRef       = useRef(0)

  // Sim state
  const gridRef       = useRef(new ParticleWorld())
  const offRef        = useRef<HTMLCanvasElement | null>(null)
  const imgRef        = useRef<ImageData | null>(null)
  const creaturesRef  = useRef<SegCreature[]>([])
  const trainerRef    = useRef<CEMTrainer | null>(null)
  const speciesRef    = useRef<Species[]>([])
  const objectsRef    = useRef<DroppedObject[]>([])
  const plantsRef     = useRef<GrowingPlant[]>([])

  // View
  const viewRef       = useRef<ViewState>({ scale: 1, panX: 0, panY: 0 })
  const isPanningRef  = useRef(false)
  const panStartRef   = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const cellSizeRef   = useRef(1)

  // Input state
  const draggingRef   = useRef(false)
  const mouseGRef     = useRef({ x: 0, y: 0 })
  const mouseRawRef   = useRef({ x: 0, y: 0 })
  const elemRef       = useRef<CellType>(CELL.SAND)
  const brushRef      = useRef(4)
  const runningRef    = useRef(true)
  const speedRef      = useRef(1)
  const toolRef       = useRef<ToolMode>('inspect')
  const dropTypeRef   = useRef<string>('bomb')
  const terrainRef    = useRef<TerrainId>('terrarium')
  const bpRef         = useRef<CreatureBP>(BLUEPRINTS[0])
  const taskRef       = useRef<'survive' | 'forage' | 'climb'>('survive')
  const grabTargetRef = useRef<SegCreature | null>(null)
  const grabPlantNodeRef = useRef<PlantNode | null>(null)
  const hoverInteractableRef = useRef(false) // true when hovering over plant or creature

  // Environment refs
  const gravityRef    = useRef(1.0)
  const windRef       = useRef(0)
  const tempRef       = useRef(0.5)
  const dragRef       = useRef(0.99)

  // React state (UI)
  const [running,     setRunning]     = useState(true)
  const [terrain,     setTerrain]     = useState<TerrainId>('terrarium')
  const [speed,       setSpeed]       = useState(1)
  const [element,     setElement]     = useState<CellType>(CELL.SAND)
  const [brushSize,   setBrushSize]   = useState(4)
  const [leftOpen,    setLeftOpen]    = useState(true)
  const [activeTab,   setActiveTab]   = useState<PanelTab>('elements')
  const [toolMode,    setToolMode]    = useState<ToolMode>('inspect')
  const [dropType,    setDropType]    = useState('bomb')
  const [bp,          setBP]          = useState<CreatureBP>(BLUEPRINTS[0])
  const [task,        setTask]        = useState<'survive' | 'forage' | 'climb'>('survive')
  const [popSize,     setPopSize]     = useState(12)
  const [trainStats,  setTrainStats]  = useState<TrainStats | null>(null)
  const [species,     setSpecies]     = useState<Species[]>([])
  const [stats,       setStats]       = useState({ food: 0, water: 0, creatures: 0, plants: 0, objects: 0 })
  const [showGallery, setShowGallery] = useState(false)
  const [zoom,        setZoom]        = useState(1)
  const [gravity,     setGravity]     = useState(1.0)
  const [wind,        setWind]        = useState(0)
  const [temperature, setTemperature] = useState(0.5)
  const [simDrag,     setSimDrag]     = useState(0.99)
  const [plantSpecies, setPlantSpecies] = useState<string>('tree')
  const plantSpeciesRef = useRef<string>('tree')

  // Brush shape & Power mode
  const [brushShape, setBrushShape] = useState<BrushShape>('circle')
  const brushShapeRef = useRef<BrushShape>('circle')
  const [powerType, setPowerType] = useState<PowerType>('attract')
  const powerTypeRef = useRef<PowerType>('attract')

  // Plant tool state
  const [plantTool, setPlantTool] = useState<PlantToolType>('water')
  const plantToolRef = useRef<PlantToolType>('water')

  // PATCH 01: Physics sliders — fluid pressure, object buoyancy, heat diffusion
  const [fluidPressure, setFluidPressure] = useState(0.6)
  const fluidPressureRef = useRef(0.6)
  const [objBuoyancy, setObjBuoyancy] = useState(0.7)
  const objBuoyancyRef = useRef(0.7)
  const [heatDiffusion, setHeatDiffusion] = useState(0.35)
  const heatDiffusionRef = useRef(0.35)

  // Ragdoll corpses — dead bodies that ragdoll then fade
  const ragdollsRef = useRef<{ creature: SegCreature; deathAge: number }[]>([])

  // Max population cap
  const [maxPop, setMaxPop] = useState(30)
  const maxPopRef = useRef(30)

  // Inspect overlay
  const [inspectedCreature, setInspectedCreature] = useState<SegCreature | null>(null)
  const inspectedRef = useRef<SegCreature | null>(null)
  const [followCreature, setFollowCreature] = useState(false)
  const followRef = useRef(false)

  // Death flash particles — brief visual effect when creatures die
  const deathFlashesRef = useRef<{ x: number; y: number; hue: number; age: number; r: number }[]>([])
  // Birth flash particles — brief visual when creatures reproduce
  const birthFlashesRef = useRef<{ x: number; y: number; hue: number; age: number }[]>([])

  // Collapsible sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    fluid: true, powder: false, solid: false, gas: false, bio: true, tool: false,
    explosive: true, force: true, thermal: false, energy: false, bio_obj: false, mech: false, cosmic: false,
  })
  const toggleSection = (id: string) => setOpenSections(s => ({ ...s, [id]: !s[id] }))

  // Sync refs
  useEffect(() => { runningRef.current = running }, [running])
  useEffect(() => { elemRef.current = element }, [element])
  useEffect(() => { brushRef.current = brushSize }, [brushSize])
  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { terrainRef.current = terrain }, [terrain])
  useEffect(() => { bpRef.current = bp }, [bp])
  useEffect(() => { taskRef.current = task }, [task])
  useEffect(() => { toolRef.current = toolMode }, [toolMode])
  useEffect(() => { dropTypeRef.current = dropType }, [dropType])
  useEffect(() => { plantSpeciesRef.current = plantSpecies }, [plantSpecies])
  useEffect(() => { brushShapeRef.current = brushShape }, [brushShape])
  useEffect(() => { powerTypeRef.current = powerType }, [powerType])
  useEffect(() => { plantToolRef.current = plantTool }, [plantTool])
  useEffect(() => { fluidPressureRef.current = fluidPressure; gridRef.current.fluidPressure = fluidPressure }, [fluidPressure])
  useEffect(() => { objBuoyancyRef.current = objBuoyancy }, [objBuoyancy])
  useEffect(() => { heatDiffusionRef.current = heatDiffusion }, [heatDiffusion])
  useEffect(() => { followRef.current = followCreature }, [followCreature])
  useEffect(() => { maxPopRef.current = maxPop }, [maxPop])
  useEffect(() => { gravityRef.current = gravity }, [gravity])
  useEffect(() => { windRef.current = wind }, [wind])
  useEffect(() => { tempRef.current = temperature }, [temperature])
  useEffect(() => { dragRef.current = simDrag }, [simDrag])

  // ── Brush shape painter ──────────────────────────────────────────────────────
  const paintBrush = useCallback((gx: number, gy: number, r: number, cellType: CellType) => {
    const grid = gridRef.current
    const shape = brushShapeRef.current
    const ri = Math.ceil(r)
    switch (shape) {
      case 'circle':
        grid.paint(gx | 0, gy | 0, r, cellType)
        break
      case 'square':
        for (let dy = -ri; dy <= ri; dy++)
          for (let dx = -ri; dx <= ri; dx++)
            if (Math.random() < 0.9) grid.set((gx + dx) | 0, (gy + dy) | 0, cellType)
        break
      case 'spray':
        for (let i = 0; i < ri * 3; i++) {
          const ang = Math.random() * Math.PI * 2
          const dist = Math.random() * r * 1.5
          grid.set((gx + Math.cos(ang) * dist) | 0, (gy + Math.sin(ang) * dist) | 0, cellType)
        }
        break
      case 'hline':
        for (let dx = -ri * 2; dx <= ri * 2; dx++)
          for (let dy = -1; dy <= 1; dy++)
            if (Math.random() < 0.85) grid.set((gx + dx) | 0, (gy + dy) | 0, cellType)
        break
      case 'vline':
        for (let dy = -ri * 2; dy <= ri * 2; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (Math.random() < 0.85) grid.set((gx + dx) | 0, (gy + dy) | 0, cellType)
        break
    }
  }, [])

  // ── Power tool application ─────────────────────────────────────────────────
  const applyPower = useCallback((gx: number, gy: number) => {
    const pwr = powerTypeRef.current
    const creatures = creaturesRef.current
    const grid = gridRef.current

    switch (pwr) {
      case 'attract':
        for (const c of creatures) {
          const dx = gx - c.segs[0].x, dy = gy - c.segs[0].y
          const dist = Math.sqrt(dx * dx + dy * dy) + 1
          if (dist < 80) {
            const f = 3.5 / (dist * 0.04 + 1)
            for (const s of c.segs) { s.vx += (dx / dist) * f; s.vy += (dy / dist) * f }
          }
        }
        break
      case 'repel':
        for (const c of creatures) {
          const dx = c.segs[0].x - gx, dy = c.segs[0].y - gy
          const dist = Math.sqrt(dx * dx + dy * dy) + 1
          if (dist < 80) {
            const f = 4.5 / (dist * 0.04 + 1)
            for (const s of c.segs) { s.vx += (dx / dist) * f; s.vy += (dy / dist) * f }
          }
        }
        break
      case 'feed':
        for (let i = 0; i < 25; i++) {
          const fx = (gx + (Math.random() - 0.5) * 24) | 0
          const fy = (gy + (Math.random() - 0.5) * 18) | 0
          if (grid.get(fx, fy) === CELL.EMPTY) grid.set(fx, fy, CELL.FOOD)
        }
        break
      case 'shockwave':
        for (const c of creatures) {
          const dx = c.segs[0].x - gx, dy = c.segs[0].y - gy
          const dist = Math.sqrt(dx * dx + dy * dy) + 1
          if (dist < 60) {
            const f = 12.0 / (dist * 0.06 + 1)
            for (const s of c.segs) { s.vx += (dx / dist) * f; s.vy += ((dy / dist) - 0.5) * f }
          }
        }
        break
      case 'heal':
        for (const c of creatures) {
          const dx = c.segs[0].x - gx, dy = c.segs[0].y - gy
          if (dx * dx + dy * dy < 1600) {
            c.energy = Math.min(200, c.energy + 8)
          }
        }
        break
      case 'fire_rain':
        for (let i = 0; i < 15; i++) {
          const fx = (gx + (Math.random() - 0.5) * 30) | 0
          const fy = Math.max(2, (gy - 10 - Math.random() * 30) | 0)
          grid.set(fx, fy, CELL.FIRE)
        }
        break
      case 'freeze_wave':
        for (let dy = -14; dy <= 14; dy++) {
          for (let dx = -14; dx <= 14; dx++) {
            if (dx * dx + dy * dy > 196) continue
            const px = (gx + dx) | 0, py = (gy + dy) | 0
            const cell = grid.get(px, py)
            if (cell === CELL.WATER && Math.random() < 0.35) grid.set(px, py, CELL.ICE)
            if (cell === CELL.FIRE && Math.random() < 0.6) grid.set(px, py, CELL.EMPTY)
            if (cell === CELL.MAGMA && Math.random() < 0.3) grid.set(px, py, CELL.WALL)
          }
        }
        break
      case 'speed_boost':
        for (const c of creatures) {
          const dx = c.segs[0].x - gx, dy = c.segs[0].y - gy
          if (dx * dx + dy * dy < 1600) {
            for (const s of c.segs) s.vx += c.facingDir * 2.5
          }
        }
        break
    }
  }, [])

  // ── View helpers ─────────────────────────────────────────────────────────────
  const updateZoomState = useCallback((v: ViewState) => {
    viewRef.current = v; setZoom(+(v.scale.toFixed(2)))
  }, [])

  const applyViewTransform = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const cellSz = Math.min(W / GRID_W, H / GRID_H)
    cellSizeRef.current = cellSz
    const { scale, panX, panY } = viewRef.current
    const ox = (W - cellSz * GRID_W) / 2
    const oy = (H - cellSz * GRID_H) / 2
    ctx.setTransform(cellSz * scale, 0, 0, cellSz * scale, ox + panX, oy + panY)
  }, [])

  const screenToGrid = useCallback((canvas: HTMLCanvasElement, sx: number, sy: number) => {
    const W = canvas.width, H = canvas.height
    const cellSz = cellSizeRef.current || Math.min(W / GRID_W, H / GRID_H)
    const { scale, panX, panY } = viewRef.current
    const ox = (W - cellSz * GRID_W) / 2
    const oy = (H - cellSz * GRID_H) / 2
    return { x: (sx - ox - panX) / (cellSz * scale), y: (sy - oy - panY) / (cellSz * scale) }
  }, [])

  // ── Terrain ──────────────────────────────────────────────────────────────────
  const loadTerrain = useCallback((id: TerrainId) => {
    buildTerrain(id, gridRef.current)
    setTerrain(id)
    creaturesRef.current = []
    objectsRef.current = []
    plantsRef.current = []
    // Scatter initial food so creatures have something to eat immediately
    gridRef.current.spawnFood(20)
    tickRef.current = 0
    trainerRef.current?.stop()
    trainerRef.current = null
    setTrainStats(null)
  }, [])

  const spawnCreatureNow = useCallback((bpOverride?: CreatureBP) => {
    const grid = gridRef.current
    const useBP = bpOverride ?? bpRef.current
    // Find a good spawn point — try several X positions
    const sx = 15 + Math.random() * (GRID_W - 30)
    let sy = GRID_H * 0.5 // fallback: mid-height
    for (let y = 5; y < GRID_H - 5; y++) {
      if (grid.isSolid(sx | 0, y)) { sy = y - 4; break }
    }
    // Clamp to safe range
    sy = Math.max(5, Math.min(GRID_H - 15, sy))
    const creature = spawnCreature(useBP, sx, sy)
    creaturesRef.current.push(creature)
  }, [])

  /** Spawn one creature at a specific canvas grid position, snapping to ground. */
  const spawnCreatureAt = useCallback((gx: number, gy: number, bpOverride?: CreatureBP) => {
    const grid = gridRef.current
    const useBP = bpOverride ?? bpRef.current
    let sy = gy | 0
    for (let y = (gy | 0); y < GRID_H - 5; y++) {
      if (grid.isSolid(gx | 0, y)) { sy = y - 6; break }
    }
    creaturesRef.current.push(spawnCreature(useBP, gx, sy))
  }, [])

  // ── Object Spawning ──────────────────────────────────────────────────────────
  const spawnObject = useCallback((type: string, gx: number, gy: number) => {
    const obj: DroppedObject = {
      id: `obj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type, x: gx, y: gy, vx: 0, vy: 0,
      angle: 0, omega: 0,
      radius: type === 'nuke' ? 18 : type === 'c4' ? 12 : type === 'blackhole' ? 15 : 8,
      strength: 1, life: 0,
      maxLife: type === 'c4' ? 180 : type === 'lightning' ? 15 : type === 'laser' ? 60 : -1,
      active: true,
    }
    objectsRef.current.push(obj)
  }, [])

  // ── Plant Spawning ───────────────────────────────────────────────────────────
  const spawnPlant = useCallback((species: string, gx: number, gy: number) => {
    const colorMap: Record<string, string> = {
      tree: '#228833', vine: '#33aa44', coral: '#ff6688',
      mushroom: '#aa66cc', fern: '#44cc55', cactus: '#55aa44',
      kelp: '#228866', bamboo: '#33cc33', moss: '#448833', sunflower: '#ddaa22',
      lily: '#ff88bb', mangrove: '#337744', orchid: '#cc44aa', pitcher: '#44aa66', bonsai: '#557733',
    }
    // Find ground below click point so plant roots at solid surface
    let groundY = gy | 0
    for (let y = (gy | 0); y < GRID_H - 1; y++) {
      if (gridRef.current.isSolid(gx | 0, y)) { groundY = y - 1; break }
    }
    const plant: GrowingPlant = {
      id: `plant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      root: { x: gx, y: groundY, vx: 0, vy: 0, restDx: 0, restDy: 0, age: 0, thickness: 4.0, children: [], angle: -Math.PI / 2, alive: true },
      species: species as GrowingPlant['species'],
      color: colorMap[species] ?? '#228833',
      growthRate: 0.28 + Math.random() * 0.20,
      age: 0,
    }
    // Immediately generate fractal structure — plant appears fully grown on spawn
    _initPlantFractal(plant.root, species, gridRef.current, 0)
    plantsRef.current.push(plant)
  }, [])

  // ── CEM Training ─────────────────────────────────────────────────────────────
  const startTraining = useCallback(() => {
    // Clear world creatures — only the evolving ghost will be visible
    creaturesRef.current = []
    const grid = gridRef.current
    const def = TERRAINS.find(t => t.id === terrainRef.current) ?? TERRAINS[0]
    // Find a good spawn Y — scan multiple X positions to be robust
    let bestSx = def.spawnX, bestSy = findSpawnY(grid, def.spawnX, def.spawnY)
    // If default spawn is bad (too near floor / ceiling), try alternatives
    for (const tryX of [def.spawnX, GRID_W * 0.25, GRID_W * 0.5]) {
      const tryY = findSpawnY(grid, tryX, def.spawnY)
      if (tryY > 5 && tryY < GRID_H - 15) { bestSx = tryX; bestSy = tryY; break }
    }
    // Ensure some food exists for forage training
    grid.spawnFood(20)
    const trainer = new CEMTrainer(bpRef.current, grid, bestSx, bestSy, taskRef.current)
    trainer.start(popSize, 4)
    trainerRef.current = trainer
    setTrainStats(trainer.getStats())
  }, [popSize])

  const stopTraining = useCallback(() => {
    trainerRef.current?.stop(); setTrainStats(null)
  }, [])

  const adoptChampion = useCallback(() => {
    const champion = trainerRef.current?.spawnChampion()
    if (champion) creaturesRef.current.push(champion)
  }, [])

  const saveToGallery = useCallback(() => {
    const t = trainerRef.current
    if (!t || !t.bestParams) return
    const sp = saveSpecies(bpRef.current, t.bestParams, t.bestScore, t.generation)
    speciesRef.current = [sp, ...speciesRef.current].slice(0, 20)
    setSpecies([...speciesRef.current])
  }, [])

  // ── Object Physics Step ──────────────────────────────────────────────────────
  const stepObjects = useCallback((grid: ParticleWorld, creatures: SegCreature[]) => {
    const objs = objectsRef.current
    const grav = gravityRef.current
    const toRemove: string[] = []

    for (const obj of objs) {
      if (!obj.active) { toRemove.push(obj.id); continue }
      obj.life++

      // Physics for physical objects (with buoyancy + fluid drag)
      if (['ball', 'box', 'wheel', 'bomb', 'c4', 'nuke'].includes(obj.type)) {
        // Object density by type: heavy objects sink, light ones float
        const objDensity = obj.type === 'box' ? 1.8 : obj.type === 'nuke' ? 2.5
          : obj.type === 'bomb' || obj.type === 'c4' ? 1.3
          : obj.type === 'wheel' ? 1.1 : 0.7  // ball is light
        // Check if center is in fluid
        const cx = obj.x | 0, cy = obj.y | 0
        const cellBelow = grid.get(cx, cy)
        const inFluid = isFluid(cellBelow)
        const buoyStr = objBuoyancyRef.current

        if (inFluid && buoyStr > 0.01) {
          const fp = ELEMENT_PROPS[cellBelow]
          const fluidDensity = fp ? fp.density : 1.0
          const fluidViscosity = fp ? fp.viscosity : 0.3
          // Buoyancy: upward force proportional to density ratio
          const buoyForce = (fluidDensity - objDensity) * 0.12 * buoyStr * grav
          obj.vy += buoyForce
          // Gravity still applies (reduced in fluid)
          obj.vy += 0.15 * grav * 0.3
          // Fluid drag — reduces velocity proportional to viscosity
          const dragFactor = 1.0 - fluidViscosity * 0.15 * buoyStr
          obj.vx *= dragFactor
          obj.vy *= dragFactor
          // Subtle lateral drift from "flow" (pressure-lite influence)
          const pStr = fluidPressureRef.current
          if (pStr > 0.1) {
            // Check fluid level difference left vs right
            const lFluid = isFluid(grid.get(cx - 3, cy)) ? 1 : 0
            const rFluid = isFluid(grid.get(cx + 3, cy)) ? 1 : 0
            obj.vx += (rFluid - lFluid) * 0.02 * pStr
          }
        } else {
          // Normal gravity in air
          obj.vy += 0.15 * grav
          obj.vx *= 0.995
          obj.vy *= 0.995
        }
        obj.x += obj.vx; obj.y += obj.vy
        // Ground collision
        if (obj.y > GRID_H - 4) { obj.y = GRID_H - 4; obj.vy *= -0.4; obj.vx *= 0.9 }
        if (obj.x < 2) { obj.x = 2; obj.vx *= -0.5 }
        if (obj.x > GRID_W - 2) { obj.x = GRID_W - 2; obj.vx *= -0.5 }
        // Solid collision
        if (grid.isSolid(obj.x | 0, (obj.y + 2) | 0)) {
          obj.vy *= -0.3
          obj.y -= 1
        }
      }

      // Object-specific behavior
      switch (obj.type) {
        case 'bomb':
          // Explode near fire or after 120 ticks on ground
          if (obj.life > 120 && Math.abs(obj.vy) < 0.1) {
            grid.paint(obj.x | 0, obj.y | 0, 8, CELL.FIRE, 0.7)
            grid.paint(obj.x | 0, obj.y | 0, 4, CELL.EMPTY, 1)
            obj.active = false
          }
          break

        case 'c4':
          if (obj.life >= obj.maxLife) {
            grid.paint(obj.x | 0, obj.y | 0, 14, CELL.FIRE, 0.8)
            grid.paint(obj.x | 0, obj.y | 0, 8, CELL.EMPTY, 1)
            obj.active = false
          }
          break

        case 'nuke':
          if (obj.life >= 90) {
            // Massive explosion
            for (let r = 0; r < 22; r += 3) {
              grid.paint(obj.x | 0, obj.y | 0, r, CELL.FIRE, 0.6)
            }
            grid.paint(obj.x | 0, obj.y | 0, 12, CELL.EMPTY, 1)
            // Kill nearby creatures
            for (const c of creatures) {
              const dx = c.segs[0].x - obj.x, dy = c.segs[0].y - obj.y
              if (dx * dx + dy * dy < 400) c.energy -= 100
            }
            obj.active = false
          }
          break

        case 'fan':
          // Push particles and creatures in a direction
          for (const c of creatures) {
            const dx = c.segs[0].x - obj.x, dy = c.segs[0].y - obj.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 20) {
              const force = 0.3 * (1 - dist / 20)
              for (const s of c.segs) {
                s.vx += Math.cos(obj.angle) * force
                s.vy += Math.sin(obj.angle) * force
              }
            }
          }
          // Push material particles
          if (obj.life % 3 === 0) {
            const cx = obj.x | 0, cy = obj.y | 0
            for (let dy = -8; dy <= 8; dy++) {
              for (let dx = -8; dx <= 8; dx++) {
                const px = cx + dx, py = cy + dy
                if (dx * dx + dy * dy > 64) continue
                const cell = grid.get(px, py)
                if (cell !== CELL.EMPTY && cell !== CELL.WALL && cell !== CELL.METAL) {
                  const nx = px + Math.round(Math.cos(obj.angle) * 2)
                  const ny = py + Math.round(Math.sin(obj.angle) * 2)
                  if (grid.get(nx, ny) === CELL.EMPTY) {
                    grid.set(nx, ny, cell)
                    grid.set(px, py, CELL.EMPTY)
                  }
                }
              }
            }
          }
          break

        case 'attractor':
          for (const c of creatures) {
            const dx = obj.x - c.segs[0].x, dy = obj.y - c.segs[0].y
            const dist = Math.sqrt(dx * dx + dy * dy) + 1
            if (dist < 25) {
              const f = 0.08 / (dist * 0.15 + 1)
              for (const s of c.segs) { s.vx += dx / dist * f; s.vy += dy / dist * f }
            }
          }
          break

        case 'repulsor':
          for (const c of creatures) {
            const dx = c.segs[0].x - obj.x, dy = c.segs[0].y - obj.y
            const dist = Math.sqrt(dx * dx + dy * dy) + 1
            if (dist < 25) {
              const f = 0.12 / (dist * 0.15 + 1)
              for (const s of c.segs) { s.vx += dx / dist * f; s.vy += dy / dist * f }
            }
          }
          break

        case 'heater':
          // Convert ice→water, water→steam nearby
          if (obj.life % 5 === 0) {
            const cx = obj.x | 0, cy = obj.y | 0
            for (let dy = -6; dy <= 6; dy++) {
              for (let dx = -6; dx <= 6; dx++) {
                if (dx * dx + dy * dy > 36) continue
                const cell = grid.get(cx + dx, cy + dy)
                if (cell === CELL.ICE && Math.random() < 0.1) grid.set(cx + dx, cy + dy, CELL.WATER)
                if (cell === CELL.WATER && Math.random() < 0.05) grid.set(cx + dx, cy + dy, CELL.STEAM)
                if (cell === CELL.SNOW && Math.random() < 0.15) grid.set(cx + dx, cy + dy, CELL.WATER)
              }
            }
          }
          break

        case 'cooler':
          if (obj.life % 5 === 0) {
            const cx = obj.x | 0, cy = obj.y | 0
            for (let dy = -6; dy <= 6; dy++) {
              for (let dx = -6; dx <= 6; dx++) {
                if (dx * dx + dy * dy > 36) continue
                const cell = grid.get(cx + dx, cy + dy)
                if (cell === CELL.WATER && Math.random() < 0.08) grid.set(cx + dx, cy + dy, CELL.ICE)
                if (cell === CELL.MAGMA && Math.random() < 0.1) grid.set(cx + dx, cy + dy, CELL.WALL)
                if (cell === CELL.FIRE && Math.random() < 0.2) grid.set(cx + dx, cy + dy, CELL.EMPTY)
                if (cell === CELL.STEAM && Math.random() < 0.15) grid.set(cx + dx, cy + dy, CELL.WATER)
              }
            }
          }
          break

        case 'lightning':
          // Bolt effect
          if (obj.life < 15) {
            const lx = obj.x | 0, ly = obj.y | 0
            for (let y = ly; y < Math.min(GRID_H - 2, ly + 40); y++) {
              const xOff = Math.round((Math.random() - 0.5) * 3)
              const cell = grid.get(lx + xOff, y)
              if (cell === CELL.WALL || cell === CELL.METAL) break
              grid.set(lx + xOff, y, CELL.FIRE)
            }
          }
          if (obj.life >= 15) obj.active = false
          break

        case 'virus':
          // Spread to adjacent organic cells
          if (obj.life % 8 === 0) {
            const cx = obj.x | 0, cy = obj.y | 0
            for (let dy = -3; dy <= 3; dy++) {
              for (let dx = -3; dx <= 3; dx++) {
                const cell = grid.get(cx + dx, cy + dy)
                if ((cell === CELL.WOOD || cell === CELL.VINE || cell === CELL.FOOD) && Math.random() < 0.15) {
                  grid.set(cx + dx, cy + dy, CELL.EMPTY)
                }
              }
            }
            // Virus moves
            obj.x += (Math.random() - 0.5) * 2
            obj.y += (Math.random() - 0.5) * 2
          }
          if (obj.life > 600) obj.active = false
          break

        case 'blackhole':
          // Pull everything in and destroy
          if (obj.life % 2 === 0) {
            const cx = obj.x | 0, cy = obj.y | 0
            for (let dy = -12; dy <= 12; dy++) {
              for (let dx = -12; dx <= 12; dx++) {
                const d = Math.sqrt(dx * dx + dy * dy)
                if (d > 12 || d < 1) continue
                const cell = grid.get(cx + dx, cy + dy)
                if (cell !== CELL.EMPTY && cell !== CELL.WALL && Math.random() < 0.08 / d) {
                  grid.set(cx + dx, cy + dy, CELL.EMPTY)
                }
              }
            }
          }
          for (const c of creatures) {
            const dx = obj.x - c.segs[0].x, dy = obj.y - c.segs[0].y
            const dist = Math.sqrt(dx * dx + dy * dy) + 1
            if (dist < 18) {
              const f = 0.2 / (dist * 0.1 + 1)
              for (const s of c.segs) { s.vx += dx / dist * f; s.vy += dy / dist * f }
              if (dist < 3) c.energy -= 2
            }
          }
          break

        case 'whitehole':
          // Spawn random matter
          if (obj.life % 10 === 0) {
            const types = [CELL.WATER, CELL.SAND, CELL.FOOD, CELL.OIL, CELL.SNOW]
            const t = types[Math.floor(Math.random() * types.length)]
            const ang = Math.random() * Math.PI * 2
            const r = 3 + Math.random() * 4
            grid.set((obj.x + Math.cos(ang) * r) | 0, (obj.y + Math.sin(ang) * r) | 0, t)
          }
          break

        case 'spring':
          // Launch creatures upward
          for (const c of creatures) {
            const dx = c.segs[0].x - obj.x, dy = c.segs[0].y - obj.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 5) {
              for (const s of c.segs) { s.vy -= 2.5 }
            }
          }
          break

        case 'vortex': {
          // Swirl particles and creatures in a circular pattern
          const cx = obj.x | 0, cy = obj.y | 0
          for (const c of creatures) {
            const dx = c.segs[0].x - obj.x, dy = c.segs[0].y - obj.y
            const dist = Math.sqrt(dx * dx + dy * dy) + 1
            if (dist < 22) {
              const f = 0.1 / (dist * 0.12 + 1)
              // Tangential force (perpendicular to radial)
              for (const s of c.segs) {
                s.vx += (-dy / dist) * f
                s.vy += (dx / dist) * f
                // Slight inward pull
                s.vx += (obj.x - s.x) * 0.002
                s.vy += (obj.y - s.y) * 0.002
              }
            }
          }
          // Swirl material particles
          if (obj.life % 3 === 0) {
            for (let dy = -10; dy <= 10; dy++) {
              for (let dx = -10; dx <= 10; dx++) {
                const d2 = dx * dx + dy * dy
                if (d2 > 100 || d2 < 4) continue
                const px = cx + dx, py = cy + dy
                const cell = grid.get(px, py)
                if (cell !== CELL.EMPTY && cell !== CELL.WALL && cell !== CELL.METAL) {
                  const dist = Math.sqrt(d2)
                  // Tangential displacement
                  const tx = -dy / dist, ty = dx / dist
                  const nx = px + Math.round(tx * 1.5)
                  const ny = py + Math.round(ty * 1.5)
                  if (grid.get(nx, ny) === CELL.EMPTY) {
                    grid.set(nx, ny, cell)
                    grid.set(px, py, CELL.EMPTY)
                  }
                }
              }
            }
          }
          break
        }

        case 'motor': {
          // Spinning motor — pushes creatures in rotation direction
          obj.angle += 0.08
          for (const c of creatures) {
            const dx = c.segs[0].x - obj.x, dy = c.segs[0].y - obj.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 8 && dist > 1) {
              // Apply tangential force
              const tx = -dy / dist, ty = dx / dist
              for (const s of c.segs) {
                s.vx += tx * 0.15
                s.vy += ty * 0.15
              }
            }
          }
          break
        }

        case 'laser': {
          // Focused beam downward that cuts through matter
          if (obj.life < (obj.maxLife > 0 ? obj.maxLife : 60)) {
            const lx = obj.x | 0
            for (let dy = 0; dy < 50; dy++) {
              const py = (obj.y | 0) + dy
              if (py >= GRID_H - 1) break
              const cell = grid.get(lx, py)
              if (cell === CELL.WALL && Math.random() < 0.3) break // walls resist
              if (cell !== CELL.EMPTY && cell !== CELL.METAL) {
                if (Math.random() < 0.4) grid.set(lx, py, CELL.FIRE)
                else grid.set(lx, py, CELL.EMPTY)
              }
            }
            // Hurt creatures in beam
            for (const c of creatures) {
              const head = c.segs[0]
              if (Math.abs(head.x - obj.x) < 2 && head.y > obj.y && head.y < obj.y + 50) {
                c.energy -= 0.8
              }
            }
          }
          if (obj.life >= (obj.maxLife > 0 ? obj.maxLife : 60)) obj.active = false
          break
        }

        case 'spore': {
          // Disperses spores that grow into vine
          if (obj.life % 15 === 0 && obj.life < 300) {
            for (let i = 0; i < 3; i++) {
              const ang = Math.random() * Math.PI * 2
              const r = 3 + Math.random() * 6
              const sx = (obj.x + Math.cos(ang) * r) | 0
              const sy = (obj.y + Math.sin(ang) * r) | 0
              if (grid.get(sx, sy) === CELL.EMPTY) {
                grid.set(sx, sy, Math.random() < 0.3 ? CELL.VINE : CELL.SEED)
              }
            }
          }
          // Drift slightly
          obj.x += (Math.random() - 0.5) * 0.5
          obj.y -= 0.1 // rises slightly
          if (obj.life > 300) obj.active = false
          break
        }

        case 'portal_in': {
          // Absorb nearby particles and creatures, teleport to portal_out
          const portalOut = objs.find(o => o.type === 'portal_out' && o.active)
          if (portalOut) {
            // Teleport particles
            if (obj.life % 4 === 0) {
              const cx2 = obj.x | 0, cy2 = obj.y | 0
              for (let dy = -4; dy <= 4; dy++) {
                for (let dx = -4; dx <= 4; dx++) {
                  if (dx * dx + dy * dy > 16) continue
                  const px = cx2 + dx, py = cy2 + dy
                  const cell = grid.get(px, py)
                  if (cell !== CELL.EMPTY && cell !== CELL.WALL && cell !== CELL.METAL && Math.random() < 0.2) {
                    const ox = (portalOut.x + dx) | 0, oy = (portalOut.y + dy) | 0
                    if (grid.get(ox, oy) === CELL.EMPTY) {
                      grid.set(ox, oy, cell)
                      grid.set(px, py, CELL.EMPTY)
                    }
                  }
                }
              }
            }
            // Teleport creatures
            for (const c of creatures) {
              const dx = c.segs[0].x - obj.x, dy2 = c.segs[0].y - obj.y
              if (dx * dx + dy2 * dy2 < 16) {
                const offX = portalOut.x - obj.x, offY = portalOut.y - obj.y
                for (const s of c.segs) {
                  s.x += offX; s.y += offY
                }
              }
            }
          }
          break
        }

        case 'portal_out':
          // Passive — receives teleported matter
          break
      }
    }

    // Remove dead objects
    objectsRef.current = objs.filter(o => o.active)
  }, [])

  // ── Plant Growth Step ────────────────────────────────────────────────────────
  const stepPlants = useCallback((grid: ParticleWorld) => {
    for (const plant of plantsRef.current) {
      plant.age++
      // Growth slows logarithmically — never stops, just gets rarer
      const growMult = 1.0 / (1.0 + plant.age * 0.0005)
      const effectiveRate = plant.growthRate * growMult
      if (Math.random() < effectiveRate) {
        _growNode(plant.root, plant, grid, 0)
      }
      // Physics step — wind, gravity, springs
      _stepPlantPhysics(plant.root, plant, null, windRef.current, gravityRef.current)
    }
  }, [])

  // ── Main RAF Loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) { cancelAnimationFrame(rafRef.current); return }

    if (!offRef.current) {
      offRef.current = document.createElement('canvas')
      offRef.current.width = GRID_W; offRef.current.height = GRID_H
    }
    const offscreen = offRef.current
    const offCtx = offscreen.getContext('2d')!
    imgRef.current = offCtx.createImageData(GRID_W, GRID_H)

    loadTerrain('terrarium')

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      const canvas = canvasRef.current; if (!canvas) return
      const ctx = canvas.getContext('2d'); if (!ctx) return

      if (canvas.width < 10 || canvas.height < 10) {
        canvas.width = canvas.offsetWidth || 900
        canvas.height = canvas.offsetHeight || 600
      }
      const W = canvas.width, H = canvas.height
      const tick = tickRef.current
      ctx.clearRect(0, 0, W, H)

      // Paint brush
      if (draggingRef.current) {
        const { x, y } = mouseGRef.current
        const tool = toolRef.current
        if (tool === 'paint') {
          paintBrush(x, y, brushRef.current, elemRef.current)
        } else if (tool === 'erase') {
          paintBrush(x, y, brushRef.current, CELL.EMPTY)
        } else if (tool === 'power') {
          applyPower(x, y)
        } else if ((tool === 'grab' || tool === 'inspect') && grabTargetRef.current) {
          const c = grabTargetRef.current
          const head = c.segs[0]
          const prevX = head.x, prevY = head.y
          const lerpF = 0.28
          head.x += (x - head.x) * lerpF
          head.y += (y - head.y) * lerpF
          // Carry momentum so creature flings when released
          head.vx = (head.x - prevX) * 0.6
          head.vy = (head.y - prevY) * 0.6
        }
        // Plant node drag — works from grab or inspect tool
        if (grabPlantNodeRef.current) {
          const n = grabPlantNodeRef.current
          n.vx += (x - n.x) * 0.35
          n.vy += (y - n.y) * 0.35
        }
      }

      // Simulation
      if (runningRef.current) {
        const steps = speedRef.current
        for (let s = 0; s < steps; s++) gridRef.current.update(tick + s)
        tickRef.current += steps

        // Wind effect
        const w = windRef.current
        if (Math.abs(w) > 0.01 && tick % 3 === 0) {
          // Push gas/steam/fire sideways
          for (let y = 0; y < GRID_H; y++) {
            for (let x = 0; x < GRID_W; x++) {
              const cell = gridRef.current.get(x, y)
              if ((cell === CELL.STEAM || cell === CELL.GAS || cell === CELL.FIRE) && Math.random() < Math.abs(w) * 0.1) {
                const nx = x + (w > 0 ? 1 : -1)
                if (gridRef.current.get(nx, y) === CELL.EMPTY) {
                  gridRef.current.set(nx, y, cell)
                  gridRef.current.set(x, y, CELL.EMPTY)
                }
              }
            }
          }
        }

        // Temperature effects — run every 8 ticks for perf
        const temp = tempRef.current
        if (tick % 8 === 0 && Math.abs(temp - 0.5) > 0.05) {
          const grid = gridRef.current
          const hotProb = Math.max(0, (temp - 0.5) * 0.04)   // hot melts ice, boils water
          const coldProb = Math.max(0, (0.5 - temp) * 0.04)  // cold freezes water, condenses steam
          // Sample ~5% of cells for perf (sparse stochastic scan)
          const stride = 5
          for (let y = 1; y < GRID_H - 1; y += stride) {
            for (let x = 1; x < GRID_W - 1; x += stride) {
              const ox = x + ((Math.random() * stride) | 0), oy = y + ((Math.random() * stride) | 0)
              if (ox >= GRID_W - 1 || oy >= GRID_H - 1) continue
              const cell = grid.get(ox, oy)
              if (hotProb > 0) {
                if (cell === CELL.ICE && Math.random() < hotProb)   grid.set(ox, oy, CELL.WATER)
                if (cell === CELL.SNOW && Math.random() < hotProb * 1.5) grid.set(ox, oy, CELL.WATER)
                if (cell === CELL.WATER && Math.random() < hotProb * 0.3) grid.set(ox, oy, CELL.STEAM)
              }
              if (coldProb > 0) {
                if (cell === CELL.WATER && Math.random() < coldProb) grid.set(ox, oy, CELL.ICE)
                if (cell === CELL.STEAM && Math.random() < coldProb * 1.5) grid.set(ox, oy, CELL.WATER)
                if (cell === CELL.MAGMA && Math.random() < coldProb * 0.5) grid.set(ox, oy, CELL.WALL)
              }
            }
          }
        }

        // PATCH 01: Heat diffusion — run every 3 ticks for perf
        if (tick % 3 === 0) {
          gridRef.current.diffuseHeat(heatDiffusionRef.current)
        }

        // Temperature Brownian jitter on creatures — hotter = more random movement
        if (Math.abs(temp - 0.5) > 0.05) {
          const jitterMag = Math.abs(temp - 0.5) * 0.12
          for (const c of creaturesRef.current) {
            if (!c.alive) continue
            for (const s of c.segs) {
              s.vx += (Math.random() - 0.5) * jitterMag
              s.vy += (Math.random() - 0.5) * jitterMag * 0.6
            }
          }
        }

        // Creature step
        const creatures = creaturesRef.current
        const effectiveGravity = 0.10 * gravityRef.current
        const simDragVal = dragRef.current
        for (const c of creatures) {
          if (!c.alive) continue
          const forces = evalCPG(c.policyParams, c)
          stepCreature(c, forces, gridRef.current, effectiveGravity)
          // Apply wind to creatures
          if (Math.abs(w) > 0.01) {
            for (const s of c.segs) s.vx += w * 0.025
          }
          // Apply environment drag to creature velocities
          if (simDragVal < 0.998) {
            for (const s of c.segs) { s.vx *= simDragVal; s.vy *= simDragVal }
          }
        }
        // Creature-creature collision — full per-segment physics
        collideCreatureSegments(creatures)
        pushCreaturesApart(creatures)

        // Predator/prey interactions — carnivores hunt, herbivores flee
        if (tick % 3 === 0) interactCreatures(creatures)

        // Max age death — creatures have natural lifespans
        for (const c of creatures) {
          if (c.alive && c.age > c.maxAge) {
            c.energy = -1  // die of old age
            c.alive = false
          }
        }

        // Reproduction — high-energy creatures can reproduce (if under pop cap)
        if (tick % 30 === 0 && creatures.length < maxPopRef.current) {
          const newborns: SegCreature[] = []
          for (const c of creatures) {
            if (!c.alive) continue
            const child = tryReproduce(c)
            if (child && creatures.length + newborns.length < maxPopRef.current) {
              newborns.push(child)
            }
          }
          for (const nb of newborns) {
            creaturesRef.current.push(nb)
            birthFlashesRef.current.push({ x: nb.segs[0].x, y: nb.segs[0].y, hue: nb.bp.hue, age: 0 })
          }
        }

        // Death particles — when creatures die, scatter nutrients + create ragdoll
        for (const c of creatures) {
          if (!c.alive && c.energy <= 0) {
            const head = c.segs[0]
            const grid = gridRef.current
            const nutrientCount = Math.min(8, Math.floor(c.segs.length * 1.2))
            for (let i = 0; i < nutrientCount; i++) {
              const dx = (Math.random() - 0.5) * 12
              const dy = (Math.random() - 0.5) * 8
              const px = (head.x + dx) | 0, py = (head.y + dy) | 0
              if (grid.get(px, py) === CELL.EMPTY) {
                grid.set(px, py, Math.random() < 0.7 ? CELL.FOOD : CELL.SEED)
              }
            }
            // Death flash visual at each segment
            for (const s of c.segs) {
              deathFlashesRef.current.push({
                x: s.x, y: s.y, hue: c.bp.hue,
                age: 0, r: s.r * 2.5,
              })
            }
            // Add as ragdoll corpse
            ragdollsRef.current.push({ creature: c, deathAge: 0 })
          }
        }
        creaturesRef.current = creatures.filter(c => c.alive)

        // Step ragdoll corpses — floppy physics, then fade and remove
        const effectiveGravRag = 0.10 * gravityRef.current
        ragdollsRef.current = ragdollsRef.current.filter(r => {
          r.deathAge++
          if (r.deathAge > 300) return false // fade out after ~5 seconds
          stepRagdoll(r.creature, gridRef.current, effectiveGravRag)
          return true
        })
        // Age + cull death flashes
        deathFlashesRef.current = deathFlashesRef.current
          .map(f => ({ ...f, age: f.age + 1 }))
          .filter(f => f.age < 30)
        // Age + cull birth flashes
        birthFlashesRef.current = birthFlashesRef.current
          .map(f => ({ ...f, age: f.age + 1 }))
          .filter(f => f.age < 20)

        // Update inspected creature reference
        const insp = inspectedRef.current
        if (insp && !insp.alive) {
          inspectedRef.current = null; setInspectedCreature(null)
          followRef.current = false; setFollowCreature(false)
        }

        // No auto-respawn — user controls creature population

        // Trainer step — runs headless; champion added only via "Adopt Champion" button
        if (trainerRef.current?.running) {
          trainerRef.current.step()
          // Update stats every 10 ticks (was 60) for snappier feedback
          if (tick % 10 === 0) setTrainStats(trainerRef.current.getStats())
        }

        // Objects step
        stepObjects(gridRef.current, creaturesRef.current)

        // Plants step — every tick for visible growth
        stepPlants(gridRef.current)

        // Photosynthesis — plants produce food particles near their tips
        if (tick % 60 === 0) {
          const grid = gridRef.current
          for (const plant of plantsRef.current) {
            if (plant.age < 30) continue
            // Count leaf tips and spawn food near some of them
            const tips: { x: number; y: number }[] = []
            const _collectTips = (node: PlantNode) => {
              if (node.children.length === 0 && node.alive) tips.push({ x: node.x, y: node.y })
              for (const ch of node.children) _collectTips(ch)
            }
            _collectTips(plant.root)
            // Photosynthesis: ~20% of tips drop food
            for (const tip of tips) {
              if (Math.random() < 0.15) {
                const fx = (tip.x + (Math.random() - 0.5) * 3) | 0
                const fy = (tip.y + (Math.random() - 0.5) * 3) | 0
                if (grid.get(fx, fy) === CELL.EMPTY) grid.set(fx, fy, CELL.FOOD)
              }
            }
          }
        }

        // Auto food — keep world well-fed (more aggressive for living ecosystem)
        if (tick % 90 === 0 && gridRef.current.countType(CELL.FOOD) < 25)
          gridRef.current.spawnFood(16)

        // Stats — update counts every 45 ticks, inspect every 12 ticks for responsiveness
        if (tick % 45 === 0) {
          setStats({
            food: gridRef.current.countType(CELL.FOOD),
            water: gridRef.current.countType(CELL.WATER),
            creatures: creaturesRef.current.length,
            plants: plantsRef.current.length,
            objects: objectsRef.current.length,
          })
        }
        // Re-trigger inspect panel render more frequently for smooth tracking
        if (tick % 12 === 0 && inspectedRef.current && inspectedRef.current.alive) {
          setInspectedCreature({ ...inspectedRef.current } as any)
        }
      }

      // ── Follow camera — smoothly pan to keep inspected creature centered ──
      if (followRef.current && inspectedRef.current && inspectedRef.current.alive) {
        const fHead = inspectedRef.current.segs[0]
        const cellSz = cellSizeRef.current || Math.min(W / GRID_W, H / GRID_H)
        const { scale } = viewRef.current
        const targetPanX = W / 2 - (fHead.x * cellSz * scale + (W - cellSz * GRID_W) / 2)
        const targetPanY = H / 2 - (fHead.y * cellSz * scale + (H - cellSz * GRID_H) / 2)
        const lerpF = 0.06 // smooth follow
        const newPanX = viewRef.current.panX + (targetPanX - viewRef.current.panX) * lerpF
        const newPanY = viewRef.current.panY + (targetPanY - viewRef.current.panY) * lerpF
        viewRef.current = { ...viewRef.current, panX: newPanX, panY: newPanY }
      }

      // ── Render ──────────────────────────────────────────────────────────────
      gridRef.current.render(imgRef.current!.data as Uint8ClampedArray, tickRef.current)
      offCtx.putImageData(imgRef.current!, 0, 0)

      ctx.save()
      applyViewTransform(ctx, W, H)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(offscreen, 0, 0)

      // Render plants
      for (const plant of plantsRef.current) {
        _renderPlant(ctx, plant.root, plant, 1)
      }

      // Render objects
      for (const obj of objectsRef.current) {
        _renderObject(ctx, obj, tickRef.current)
      }

      // Render ragdoll corpses (behind living creatures)
      for (const r of ragdollsRef.current) {
        drawRagdoll(ctx, r.creature, 1, r.deathAge)
      }

      // Render creatures
      const inspC_ = inspectedRef.current
      for (const c of creaturesRef.current) {
        drawCreature(ctx, c, 1, c === inspC_)
      }
      // Mini energy bars above each creature head (subtle, always visible)
      for (const c of creaturesRef.current) {
        const head = c.segs[0]
        const barW = head.r * 3.2
        const barH = 0.6
        const barX = head.x - barW / 2
        const barY = head.y - head.r * 2.2
        const eFrac = Math.max(0, Math.min(1, c.energy / 200))
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(barX - 0.2, barY - 0.1, barW + 0.4, barH + 0.2)
        // Fill
        const barColor = eFrac > 0.6 ? `hsla(${c.bp.hue},60%,50%,0.55)` :
                         eFrac > 0.3 ? 'rgba(220,180,40,0.55)' : 'rgba(220,50,40,0.6)'
        ctx.fillStyle = barColor
        ctx.fillRect(barX, barY, barW * eFrac, barH)
      }
      // Death flash effects — fading rings at creature death positions
      for (const flash of deathFlashesRef.current) {
        const progress = flash.age / 30
        const fadeA = Math.max(0, 1 - progress)
        const expandR = flash.r * (1 + progress * 2.5)
        // Expanding colored ring
        ctx.beginPath()
        ctx.arc(flash.x, flash.y, expandR, 0, Math.PI * 2)
        ctx.strokeStyle = `hsla(${flash.hue},80%,65%,${0.5 * fadeA})`
        ctx.lineWidth = 0.4 * fadeA
        ctx.stroke()
        // Fading core flash
        if (flash.age < 10) {
          const coreA = Math.max(0, 1 - flash.age / 10) * 0.4
          ctx.beginPath()
          ctx.arc(flash.x, flash.y, flash.r * 0.8, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${flash.hue},60%,85%,${coreA})`
          ctx.fill()
        }
      }

      // Birth flash effects — expanding green sparkle at creature birth positions
      for (const flash of birthFlashesRef.current) {
        const progress = flash.age / 20
        const fadeA = Math.max(0, 1 - progress)
        const expandR = 2 + progress * 6
        // Expanding green ring
        ctx.beginPath()
        ctx.arc(flash.x, flash.y, expandR, 0, Math.PI * 2)
        ctx.strokeStyle = `hsla(${flash.hue},70%,70%,${0.4 * fadeA})`
        ctx.lineWidth = 0.3 * fadeA
        ctx.stroke()
        // Sparkle dots
        for (let i = 0; i < 4; i++) {
          const sparkAng = progress * 6 + i * 1.57
          const sparkR = expandR * 0.8
          ctx.beginPath()
          ctx.arc(flash.x + Math.cos(sparkAng) * sparkR, flash.y + Math.sin(sparkAng) * sparkR,
            0.4 * fadeA, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(120,80%,75%,${0.5 * fadeA})`
          ctx.fill()
        }
      }

      // Render CEM evaluation candidate — brighter ghost so you can clearly see it train
      const cemCandidate = trainerRef.current?.currentCandidate
      if (cemCandidate && trainerRef.current?.running) {
        drawCreature(ctx, cemCandidate, 1, true, 0.85)
        // Draw "GHOST" label near the candidate
        const gh = cemCandidate.segs[0]
        ctx.font = `${2.5 / viewRef.current.scale}px monospace`
        ctx.fillStyle = 'rgba(200,140,255,0.5)'
        ctx.fillText('EVOLVING', gh.x - 6, gh.y - 5)
      }

      // Brush cursor
      if (mouseGRef.current.x > 0 || mouseGRef.current.y > 0) {
        const { x, y } = mouseGRef.current
        const pr = brushRef.current
        const tool = toolRef.current
        const lw = 0.5 / viewRef.current.scale
        if (tool === 'paint' || tool === 'erase') {
          const ec = tool === 'erase' ? '#ff4444' :
            (ELEMENTS as Record<number, { color: string }>)[elemRef.current]?.color ?? '#fff'
          const shape = brushShapeRef.current
          ctx.strokeStyle = ec + 'aa'
          ctx.lineWidth = lw
          ctx.beginPath()
          if (shape === 'circle' || shape === 'spray') {
            ctx.arc(x, y, pr, 0, Math.PI * 2)
          } else if (shape === 'square') {
            ctx.rect(x - pr, y - pr, pr * 2, pr * 2)
          } else if (shape === 'hline') {
            ctx.rect(x - pr * 2, y - 1, pr * 4, 3)
          } else if (shape === 'vline') {
            ctx.rect(x - 1, y - pr * 2, 3, pr * 4)
          }
          ctx.stroke()
          if (shape === 'spray') {
            // Show spray dots
            for (let i = 0; i < 8; i++) {
              const ang = (i / 8) * Math.PI * 2
              const r = pr * 0.7
              ctx.beginPath()
              ctx.arc(x + Math.cos(ang) * r, y + Math.sin(ang) * r, 0.3, 0, Math.PI * 2)
              ctx.fillStyle = ec + '55'
              ctx.fill()
            }
          }
        } else if (tool === 'drop') {
          ctx.beginPath()
          ctx.arc(x, y, 3, 0, Math.PI * 2)
          ctx.strokeStyle = '#ffaa44aa'
          ctx.lineWidth = lw
          ctx.setLineDash([1, 1])
          ctx.stroke()
          ctx.setLineDash([])
        } else if (tool === 'plant') {
          ctx.beginPath()
          ctx.arc(x, y, 3, 0, Math.PI * 2)
          ctx.strokeStyle = '#44ff88aa'
          ctx.lineWidth = lw
          ctx.setLineDash([1, 1])
          ctx.stroke()
          ctx.setLineDash([])
        } else if (tool === 'plant_tool') {
          // Plant tool cursor — ring with tool icon color
          const ptDef = PLANT_TOOL_DEFS.find(p => p.id === plantToolRef.current)
          const ptColor = ptDef?.color ?? '#44ff88'
          ctx.beginPath()
          ctx.arc(x, y, 8, 0, Math.PI * 2)
          ctx.strokeStyle = ptColor + '55'
          ctx.lineWidth = lw * 1.5
          ctx.setLineDash([1.5, 1])
          ctx.stroke()
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.arc(x, y, 1.5, 0, Math.PI * 2)
          ctx.fillStyle = ptColor + 'aa'
          ctx.fill()
        } else if (tool === 'power') {
          const pwrDef = POWER_DEFS.find(p => p.id === powerTypeRef.current)
          const pwrColor = pwrDef?.color ?? '#ffaa44'
          const pulseR = 10 + Math.sin(tickRef.current * 0.08) * 3
          ctx.beginPath()
          ctx.arc(x, y, pulseR, 0, Math.PI * 2)
          ctx.strokeStyle = pwrColor + '55'
          ctx.lineWidth = lw * 2
          ctx.setLineDash([2, 2])
          ctx.stroke()
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.arc(x, y, 2, 0, Math.PI * 2)
          ctx.fillStyle = pwrColor + 'aa'
          ctx.fill()
        } else if (tool === 'creature') {
          // Creature placement cursor
          const pulseR = 4 + Math.sin(tickRef.current * 0.1) * 1.5
          ctx.beginPath()
          ctx.arc(x, y, pulseR, 0, Math.PI * 2)
          ctx.strokeStyle = '#cc88ffaa'
          ctx.lineWidth = lw
          ctx.setLineDash([1.5, 1])
          ctx.stroke()
          ctx.setLineDash([])
        } else if (tool === 'inspect') {
          // Inspect cursor — small crosshair
          ctx.strokeStyle = '#88ffeebb'
          ctx.lineWidth = lw
          ctx.beginPath()
          ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y)
          ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, Math.PI * 2)
          ctx.setLineDash([1, 1])
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // Inspect HUD — render inline stats near inspected creature
      const inspC = inspectedRef.current
      if (inspC && inspC.alive) {
        const hd = inspC.segs[0]
        const fs = 2.5 / viewRef.current.scale
        ctx.font = `bold ${fs}px monospace`
        const lx = hd.x + inspC.segs[0].r * 2 + 1
        let ly = hd.y - 5
        const lines = [
          `${inspC.bp.name} (${inspC.bp.species})`,
          `HP ${inspC.energy.toFixed(0)} / 200`,
          `Age ${inspC.age}/${inspC.maxAge}  Gen ${inspC.generation}`,
          `Dir ${inspC.facingDir > 0 ? '→' : '←'}  Segs ${inspC.segs.length}  Grip ${inspC.segs.filter(s => s.gripped).length}`,
          `vX ${inspC.segs[0].vx.toFixed(2)}  vY ${inspC.segs[0].vy.toFixed(2)}`,
        ]
        // Background box
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.fillRect(lx - 0.5, ly - fs * 0.8, fs * 18, lines.length * fs * 1.4 + fs * 0.5)
        ctx.fillStyle = 'rgba(180,255,220,0.7)'
        for (const line of lines) {
          ctx.fillText(line, lx, ly)
          ly += fs * 1.4
        }
        // Highlight ring
        ctx.beginPath()
        ctx.arc(hd.x, hd.y, hd.r * 2 + Math.sin(tickRef.current * 0.15) * 0.5, 0, Math.PI * 2)
        ctx.strokeStyle = `hsla(${inspC.bp.hue},80%,65%,0.5)`
        ctx.lineWidth = 0.5 / viewRef.current.scale
        ctx.setLineDash([1.5, 1])
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.restore()
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Canvas resize
  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const onResize = () => { const w = c.offsetWidth, h = c.offsetHeight; if (w > 0 && h > 0) { c.width = w; c.height = h } }
    onResize(); window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [active])

  // ── Pointer events ────────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top
    mouseRawRef.current = { x: sx, y: sy }
    mouseGRef.current = screenToGrid(canvas, sx, sy)

    if (e.button === 1 || e.altKey) {
      isPanningRef.current = true
      panStartRef.current = { mx: sx, my: sy, px: viewRef.current.panX, py: viewRef.current.panY }
    } else {
      const tool = toolRef.current
      if (tool === 'drop') {
        const { x, y } = mouseGRef.current
        spawnObject(dropTypeRef.current, x, y)
      } else if (tool === 'plant') {
        const { x, y } = mouseGRef.current
        spawnPlant(plantSpeciesRef.current, x, y)
      } else if (tool === 'grab') {
        // Find nearest creature — check ALL segments, not just head
        const { x, y } = mouseGRef.current
        let best: SegCreature | null = null, bestD = 30
        for (const c of creaturesRef.current) {
          for (const s of c.segs) {
            const dx = s.x - x, dy = s.y - y
            const d = Math.sqrt(dx * dx + dy * dy)
            if (d < bestD) { bestD = d; best = c }
          }
        }
        // Also check plants — grab the nearest plant node
        let bestPlant: { node: PlantNode | null; dist: number } = { node: null, dist: 30 * 30 }
        for (const plant of plantsRef.current) {
          _findNearestPlantNode(plant.root, x, y, bestPlant)
        }
        if (bestPlant.node && Math.sqrt(bestPlant.dist) < bestD) {
          // Plant node is closer than any creature
          grabPlantNodeRef.current = bestPlant.node
          grabTargetRef.current = null
        } else {
          grabTargetRef.current = best
          grabPlantNodeRef.current = null
        }
        draggingRef.current = true
      } else if (tool === 'creature') {
        // Place one creature at the clicked canvas position
        const { x, y } = mouseGRef.current
        spawnCreatureAt(x, y)
      } else if (tool === 'inspect') {
        // Find nearest creature and inspect it
        const { x, y } = mouseGRef.current
        let best: SegCreature | null = null, bestD = 30
        for (const c of creaturesRef.current) {
          for (const s of c.segs) {
            const dx = s.x - x, dy = s.y - y
            const d = Math.sqrt(dx * dx + dy * dy)
            if (d < bestD) { bestD = d; best = c }
          }
        }
        inspectedRef.current = best
        setInspectedCreature(best)
        // Auto-switch to creatures tab so the detailed panel is visible
        if (best) setActiveTab('creatures')
        // Allow dragging the inspected creature or nearby plant
        if (best) {
          grabTargetRef.current = best
          draggingRef.current = true
        } else {
          const bestPlant = { node: null as PlantNode | null, dist: 225 }
          for (const plant of plantsRef.current) {
            _findNearestPlantNode(plant.root, x, y, bestPlant)
          }
          if (bestPlant.node) {
            grabPlantNodeRef.current = bestPlant.node
            draggingRef.current = true
          }
        }
      } else if (tool === 'plant_tool') {
        // Plant tools — apply to nearby plants
        const { x, y } = mouseGRef.current
        const ptool = plantToolRef.current
        for (const plant of plantsRef.current) {
          const dx = plant.root.x - x, dy = plant.root.y - y
          if (dx * dx + dy * dy < 400) { // 20px radius
            if (ptool === 'trim') {
              // Kill outer nodes
              const _trim = (node: PlantNode, depth: number) => {
                if (depth > 5) node.alive = false
                for (const ch of node.children) _trim(ch, depth + 1)
              }
              _trim(plant.root, 0)
            } else if (ptool === 'water') {
              plant.growthRate = Math.min(0.8, plant.growthRate + 0.15)
              // Also add water cells near root
              for (let i = 0; i < 3; i++) {
                const wx = (plant.root.x + (Math.random() - 0.5) * 6) | 0
                const wy = (plant.root.y + 1 + Math.random() * 3) | 0
                if (gridRef.current.get(wx, wy) === CELL.EMPTY)
                  gridRef.current.set(wx, wy, CELL.WATER)
              }
            } else if (ptool === 'fertilize') {
              plant.growthRate = Math.min(1.0, plant.growthRate + 0.3)
            } else if (ptool === 'harvest') {
              // Collect fruit: spawn food at roots and remove some tips
              const _harvestTips = (node: PlantNode) => {
                if (node.children.length === 0 && node.alive && Math.random() < 0.4) {
                  const fx = (node.x + (Math.random() - 0.5) * 4) | 0
                  const fy = (node.y + 1) | 0
                  if (gridRef.current.get(fx, fy) === CELL.EMPTY)
                    gridRef.current.set(fx, fy, CELL.FOOD)
                  node.alive = false
                }
                for (const ch of node.children) _harvestTips(ch)
              }
              _harvestTips(plant.root)
            }
          }
        }
        draggingRef.current = true
      } else if (tool === 'power') {
        // Power tools work via drag (continuous application)
        draggingRef.current = true
        const { x, y } = mouseGRef.current
        applyPower(x, y)
      } else {
        draggingRef.current = true
      }
    }
  }, [screenToGrid, spawnObject, spawnPlant, spawnCreatureAt, applyPower])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top
    mouseRawRef.current = { x: sx, y: sy }
    mouseGRef.current = screenToGrid(canvas, sx, sy)
    if (isPanningRef.current) {
      const { mx, my, px, py } = panStartRef.current
      updateZoomState({ ...viewRef.current, panX: px + (sx - mx), panY: py + (sy - my) })
    }
    // Hover detection — check if mouse is over any interactable (creature or plant)
    if (!draggingRef.current) {
      const { x, y } = mouseGRef.current
      let found = false
      // Check creatures
      for (const c of creaturesRef.current) {
        for (const s of c.segs) {
          const dx = s.x - x, dy = s.y - y
          if (dx * dx + dy * dy < 625) { found = true; break }
        }
        if (found) break
      }
      // Check plants
      if (!found) {
        const best = { node: null as PlantNode | null, dist: 225 }
        for (const plant of plantsRef.current) {
          _findNearestPlantNode(plant.root, x, y, best)
          if (best.node) { found = true; break }
        }
      }
      hoverInteractableRef.current = found
      // Update cursor directly on canvas for immediate feedback
      const tool = toolRef.current
      if (found && (tool === 'inspect' || tool === 'grab' || tool === 'paint' || tool === 'erase')) {
        canvas.style.cursor = 'grab'
      } else if (tool === 'grab') {
        canvas.style.cursor = 'grab'
      } else if (tool === 'paint' || tool === 'erase') {
        canvas.style.cursor = 'crosshair'
      } else if (tool === 'creature') {
        canvas.style.cursor = 'cell'
      } else if (tool === 'drop' || tool === 'plant') {
        canvas.style.cursor = 'copy'
      } else if (tool === 'power' || tool === 'plant_tool') {
        canvas.style.cursor = 'pointer'
      } else if (tool === 'inspect') {
        canvas.style.cursor = found ? 'grab' : 'help'
      } else {
        canvas.style.cursor = found ? 'grab' : 'default'
      }
    }
  }, [screenToGrid, updateZoomState])

  const onPointerUp = useCallback(() => {
    draggingRef.current = false
    isPanningRef.current = false
    grabTargetRef.current = null
    grabPlantNodeRef.current = null
  }, [])

  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.12 : (1 / 1.12)
    const newScale = Math.max(0.4, Math.min(5, viewRef.current.scale * factor))
    updateZoomState({
      scale: newScale,
      panX: mx - (mx - viewRef.current.panX) * (newScale / viewRef.current.scale),
      panY: my - (my - viewRef.current.panY) * (newScale / viewRef.current.scale),
    })
  }, [updateZoomState])

  const zoomTo = useCallback((factor: number) => {
    const canvas = canvasRef.current; if (!canvas) return
    const W = canvas.width, H = canvas.height
    const newScale = Math.max(0.4, Math.min(5, viewRef.current.scale * factor))
    updateZoomState({
      scale: newScale,
      panX: W / 2 - (W / 2 - viewRef.current.panX) * (newScale / viewRef.current.scale),
      panY: H / 2 - (H / 2 - viewRef.current.panY) * (newScale / viewRef.current.scale),
    })
  }, [updateZoomState])

  const resetView = useCallback(() => { updateZoomState({ scale: 1, panX: 0, panY: 0 }) }, [updateZoomState])

  // Keyboard
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setRunning(v => !v) }
      if (e.key === 'r') loadTerrain(terrainRef.current)
      if (e.key === 'c') spawnCreatureNow()
      if (e.key === 'f') gridRef.current.spawnFood(12)
      if (e.key === '=' || e.key === '+') zoomTo(1.2)
      if (e.key === '-') zoomTo(1 / 1.2)
      if (e.key === '0') resetView()
      if (e.key === '1') setToolMode('paint')
      if (e.key === '2') setToolMode('erase')
      if (e.key === '3') setToolMode('grab')
      if (e.key === '4') setToolMode('drop')
      if (e.key === '5') setToolMode('plant')
      if (e.key === '6') setToolMode('creature')
      if (e.key === '7') setToolMode('power')
      if (e.key === '8' || e.key === 'i') setToolMode('inspect')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, loadTerrain, spawnCreatureNow, zoomTo, resetView])

  // ── Panel Tabs ───────────────────────────────────────────────────────────────
  const TABS: { id: PanelTab; icon: React.ReactNode; label: string }[] = [
    { id: 'elements',    icon: <Droplets size={8} />,  label: 'Mat' },
    { id: 'objects',     icon: <BombIcon size={8} />,   label: 'Obj' },
    { id: 'creatures',   icon: <Bug size={8} />,        label: 'Life' },
    { id: 'plants',      icon: <Sprout size={8} />,     label: 'Flora' },
    { id: 'environment', icon: <Settings size={8} />,   label: 'Env' },
    { id: 'ecosystem',   icon: <Dna size={8} />,        label: 'Eco' },
  ]

  // ── UI ────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ display: active ? 'flex' : 'none' }}
      className="fixed inset-0 z-0 flex flex-col overflow-hidden bg-[#020408] pt-[30px]"
    >
      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div className="z-20 flex-shrink-0 flex items-center gap-1 px-2 py-1
        bg-black/70 backdrop-blur-md border-b border-white/[0.04]">

        {/* Terrain presets */}
        <div className="flex gap-0.5">
          {TERRAINS.map(t => (
            <button key={t.id} onClick={() => loadTerrain(t.id)} title={t.desc}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[6.5px] font-mono border transition-all
                ${terrain === t.id
                  ? 'border-white/15 text-white/55 bg-white/6'
                  : 'border-transparent text-white/20 hover:text-white/45 hover:bg-white/[0.03]'}`}>
              <span className="text-[8px]">{t.icon}</span>
              <span className="hidden md:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-3.5 bg-white/8 mx-0.5" />

        {/* Tool Mode */}
        <div className="flex gap-0.5">
          {([
            { id: 'paint' as ToolMode, icon: <Paintbrush size={8} />, label: 'Paint' },
            { id: 'erase' as ToolMode, icon: <Eraser size={8} />, label: 'Erase' },
            { id: 'grab'  as ToolMode, icon: <Hand size={8} />, label: 'Grab' },
            { id: 'drop'  as ToolMode, icon: <Target size={8} />, label: 'Drop Obj' },
            { id: 'plant' as ToolMode, icon: <Sprout size={8} />, label: 'Plant' },
            { id: 'creature' as ToolMode, icon: <Bug size={8} />, label: 'Place Creature' },
            { id: 'power' as ToolMode, icon: <Zap size={8} />, label: 'Power Tool' },
            { id: 'plant_tool' as ToolMode, icon: <Sprout size={8} />, label: 'Plant Tools' },
            { id: 'inspect' as ToolMode, icon: <Eye size={8} />, label: 'Inspect' },
          ]).map(t => (
            <IconBtn key={t.id} active={toolMode === t.id} color="#cc88ff"
              onClick={() => setToolMode(t.id)} title={t.label}>
              {t.icon}
            </IconBtn>
          ))}
        </div>

        <div className="w-px h-3.5 bg-white/8 mx-0.5" />

        {/* Play / Pause / Reset */}
        <button onClick={() => setRunning(v => !v)}
          className={`flex items-center gap-0.5 px-2 py-0.5 rounded text-[6.5px] font-mono uppercase tracking-widest transition-all border
            ${running ? 'border-cyan-400/30 text-cyan-300/80 bg-cyan-500/8' : 'border-white/10 text-white/40 hover:text-white/65'}`}>
          {running ? <><Pause size={7} />Pause</> : <><Play size={7} />Play</>}
        </button>
        <button onClick={() => loadTerrain(terrain)} title="Reset"
          className="p-1 rounded border border-white/[0.05] text-white/25 hover:text-white/50 transition-all">
          <RotateCcw size={8} />
        </button>

        {/* Speed */}
        <div className="flex gap-0.5">
          {[1, 2, 4].map(s => (
            <button key={s} onClick={() => setSpeed(s)}
              className={`w-5 h-4 rounded text-[6px] font-mono border transition-all
                ${speed === s ? 'border-cyan-400/25 text-cyan-300 bg-cyan-500/6' : 'border-white/[0.04] text-white/20 hover:text-white/45'}`}>
              {s}×
            </button>
          ))}
        </div>

        <div className="w-px h-3.5 bg-white/8 mx-0.5" />

        {/* Zoom */}
        <button onClick={() => zoomTo(1.25)} className="p-0.5 text-white/25 hover:text-white/50"><ZoomIn size={9} /></button>
        <span className="text-[6px] font-mono text-white/20 w-7 text-center">{(zoom * 100).toFixed(0)}%</span>
        <button onClick={() => zoomTo(1/1.25)} className="p-0.5 text-white/25 hover:text-white/50"><ZoomOut size={9} /></button>
        <button onClick={resetView} className="p-0.5 text-white/25 hover:text-white/50" title="Reset view"><Move size={8} /></button>

        {/* Stats & Gallery */}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[6px] font-mono">
            <span className="text-emerald-400/40"><Leaf size={7} className="inline" /> {stats.food}</span>
            <span className="text-blue-400/40"><Droplets size={7} className="inline" /> {stats.water}</span>
            <span className="text-purple-400/40"><Bug size={7} className="inline" /> {stats.creatures}</span>
            <span className="text-green-400/40"><Sprout size={7} className="inline" /> {stats.plants}</span>
            {stats.objects > 0 && <span className="text-orange-400/40"><Target size={7} className="inline" /> {stats.objects}</span>}
          </div>
          <button onClick={() => setShowGallery(v => !v)}
            className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[6px] font-mono border border-white/[0.05]
              text-white/25 hover:text-white/50 transition-all">
            <Trophy size={7} /> {species.length}
          </button>
        </div>
      </div>

      {/* ── MAIN AREA ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT PANEL ────────────────────────────────────────────────────── */}
        <div className="relative z-20 flex-shrink-0 transition-all duration-200"
          style={{ width: leftOpen ? 174 : 12 }}>

          <button onClick={() => setLeftOpen(v => !v)}
            className="absolute -right-4 top-12 z-30 w-4 h-8 flex items-center justify-center
              bg-black/60 border border-white/[0.06] rounded-r text-white/25 hover:text-white/50 transition-all">
            {leftOpen ? <ChevronLeft size={8} /> : <ChevronRight size={8} />}
          </button>

          {leftOpen && (
            <div className="flex flex-col h-full bg-black/65 backdrop-blur-md border-r border-white/[0.05]">

              {/* Tab bar */}
              <div className="flex border-b border-white/[0.04] px-0.5 py-0.5 gap-0.5">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded text-[5px] font-mono transition-all
                      ${activeTab === t.id
                        ? 'text-white/60 bg-white/6'
                        : 'text-white/18 hover:text-white/35 hover:bg-white/[0.02]'}`}>
                    {t.icon}
                    <span className="uppercase tracking-widest">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto py-1" style={{ scrollbarWidth: 'none' }}>

                {/* ── ELEMENTS TAB ──────────────────────────────────────────── */}
                {activeTab === 'elements' && (
                  <>
                    <div className="px-2 mb-1 flex flex-col gap-1">
                      <MiniSlider label="Brush Size" val={brushSize} min={1} max={40} step={1}
                        fmt={v => `${v}px`} color="#88aaff" onChange={setBrushSize} />
                      {/* Brush shape selector */}
                      <div className="flex gap-0.5">
                        {([
                          { id: 'circle' as BrushShape, icon: <Circle size={7} />, label: '○' },
                          { id: 'square' as BrushShape, icon: <Square size={7} />, label: '□' },
                          { id: 'spray' as BrushShape,  icon: <Crosshair size={7} />, label: '⊹' },
                          { id: 'hline' as BrushShape,  icon: <span className="text-[6px]">━</span>, label: '━' },
                          { id: 'vline' as BrushShape,  icon: <span className="text-[6px]">┃</span>, label: '┃' },
                        ]).map(s => (
                          <button key={s.id} onClick={() => setBrushShape(s.id)}
                            title={s.id}
                            className={`flex-1 flex items-center justify-center py-0.5 rounded text-[6px] font-mono border transition-all
                              ${brushShape === s.id
                                ? 'border-blue-400/25 text-blue-300 bg-blue-500/8'
                                : 'border-white/[0.04] text-white/20 hover:text-white/45'}`}>
                            {s.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    {CATEGORIES.map(cat => (
                      <div key={cat.id}>
                        <SectionHeader label={cat.label} color={cat.color}
                          open={openSections[cat.id] ?? true}
                          onToggle={() => toggleSection(cat.id)}
                          count={cat.cells.length} />
                        {(openSections[cat.id] ?? true) && (
                          <div className="grid grid-cols-2 gap-0.5 px-1.5 pb-1">
                            {cat.cells.map(t => {
                              const info = (ELEMENTS as Record<number, { label: string; color: string; desc: string }>)[t]
                              return (
                                <button key={t}
                                  onClick={() => { setElement(t); setToolMode('paint') }}
                                  title={info.desc}
                                  className={`flex items-center gap-1 px-1 py-0.5 rounded text-[6.5px] font-mono
                                    border transition-all ${element === t && toolMode === 'paint'
                                      ? 'bg-white/8 border-white/15'
                                      : 'border-transparent text-white/28 hover:bg-white/[0.04] hover:text-white/50'}`}
                                  style={{ color: element === t && toolMode === 'paint' ? info.color : undefined }}>
                                  <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ background: info.color }} />
                                  {info.label}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Quick actions */}
                    <div className="px-2 pt-1 flex flex-col gap-0.5">
                      <button onClick={() => gridRef.current.spawnFood(14)}
                        className="w-full py-1 rounded text-[6.5px] font-mono border border-emerald-400/15
                          text-emerald-300/45 hover:bg-emerald-500/6 transition-all flex items-center justify-center gap-1">
                        <Leaf size={7} /> Scatter Food
                      </button>
                      <button onClick={() => gridRef.current.clear()}
                        className="w-full py-1 rounded text-[6.5px] font-mono border border-red-400/15
                          text-red-300/35 hover:bg-red-500/6 transition-all flex items-center justify-center gap-1">
                        <Eraser size={7} /> Clear All
                      </button>
                    </div>
                  </>
                )}

                {/* ── OBJECTS TAB ──────────────────────────────────────────── */}
                {activeTab === 'objects' && (
                  <>
                    <div className="px-2 mb-1 text-[5.5px] font-mono text-white/20">
                      Select an object then click canvas to place it.
                    </div>
                    {OBJECT_CATS.map(cat => {
                      const items = OBJECT_DEFS.filter(o => o.cat === cat.id)
                      return (
                        <div key={cat.id}>
                          <SectionHeader label={cat.label} color={cat.color}
                            open={openSections[cat.id] ?? (cat.id === 'explosive' || cat.id === 'force')}
                            onToggle={() => toggleSection(cat.id)}
                            count={items.length} />
                          {(openSections[cat.id] ?? (cat.id === 'explosive' || cat.id === 'force')) && (
                            <div className="grid grid-cols-2 gap-0.5 px-1.5 pb-1">
                              {items.map(o => (
                                <button key={o.id}
                                  onClick={() => { setDropType(o.id); setToolMode('drop') }}
                                  title={o.desc}
                                  className={`flex items-center gap-1 px-1 py-0.5 rounded text-[6.5px] font-mono
                                    border transition-all ${dropType === o.id && toolMode === 'drop'
                                      ? 'bg-white/8 border-white/15'
                                      : 'border-transparent text-white/28 hover:bg-white/[0.04] hover:text-white/50'}`}
                                  style={{ color: dropType === o.id && toolMode === 'drop' ? o.color : undefined }}>
                                  <span className="text-[8px]">{o.icon}</span>
                                  {o.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}

                {/* ── CREATURES TAB ────────────────────────────────────────── */}
                {activeTab === 'creatures' && (
                  <>
                    <div className="px-2 mb-1.5">
                      <div className="text-[5.5px] font-mono text-white/20 mb-1">
                        Pick a body plan → <span className="text-purple-300/50">Place</span> → click canvas. Creatures seek food automatically.
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {BLUEPRINTS.map(b => (
                          <button key={b.id} onClick={() => { setBP(b); bpRef.current = b }}
                            className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-[6.5px] font-mono border transition-all
                              ${bp.id === b.id
                                ? 'border-purple-400/20 bg-purple-500/8 text-purple-200'
                                : 'border-transparent text-white/25 hover:bg-white/[0.03] hover:text-white/45'}`}>
                            <span className="text-[10px] w-4 text-center">{b.icon}</span>
                            <div className="flex-1 text-left">
                              <div>{b.name}</div>
                              <div className="text-[5px] opacity-40">{b.segN}seg · {b.species} · {b.appendageCount}limbs</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="px-2 flex flex-col gap-1">
                      {/* Primary: click-to-place mode */}
                      <button
                        onClick={() => setToolMode('creature')}
                        className={`w-full py-1.5 rounded text-[7px] font-mono border transition-all flex items-center justify-center gap-1
                          ${toolMode === 'creature'
                            ? 'border-purple-400/40 bg-purple-500/14 text-purple-200 animate-pulse'
                            : 'border-purple-400/20 text-purple-300/55 hover:bg-purple-500/6'}`}>
                        <Bug size={8} />
                        {toolMode === 'creature' ? '→ Click on canvas' : 'Place on Canvas'}
                      </button>
                      <button onClick={() => spawnCreatureNow()}
                        className="w-full py-1 rounded text-[6.5px] font-mono border border-white/[0.06]
                          text-white/28 hover:bg-white/[0.04] transition-all flex items-center justify-center gap-1">
                        <Sparkles size={7} /> Random Spawn
                      </button>
                      <button onClick={() => {
                        for (let i = 0; i < 5; i++) {
                          const randomBP = BLUEPRINTS[Math.floor(Math.random() * BLUEPRINTS.length)]
                          spawnCreatureNow(randomBP)
                        }
                      }}
                        className="w-full py-1 rounded text-[6.5px] font-mono border border-white/[0.06]
                          text-white/28 hover:bg-white/[0.04] transition-all flex items-center justify-center gap-1">
                        <Layers size={7} /> Spawn Colony (5)
                      </button>
                      <button onClick={() => gridRef.current.spawnFood(16)}
                        className="w-full py-1 rounded text-[6.5px] font-mono border border-emerald-400/12
                          text-emerald-300/40 hover:bg-emerald-500/6 transition-all flex items-center justify-center gap-1">
                        <Leaf size={7} /> Scatter Food
                      </button>
                      <button onClick={() => { creaturesRef.current = [] }}
                        className="w-full py-0.5 rounded text-[6px] font-mono border border-red-400/10
                          text-red-300/25 hover:bg-red-500/5 transition-all flex items-center justify-center gap-1">
                        <Eraser size={6} /> Clear All Creatures
                      </button>
                    </div>
                    <div className="px-2 pt-1">
                      <MiniSlider label="Max Population" val={maxPop} min={5} max={60} step={1}
                        fmt={v => `${v}`} color="#cc88ff" onChange={setMaxPop} />
                    </div>

                    {/* Creature Census — live population by species */}
                    {stats.creatures > 0 && (
                      <div className="px-2 pt-1.5 border-t border-white/[0.04] mt-1">
                        <div className="text-[5.5px] font-mono uppercase tracking-widest text-white/18 mb-1">
                          Census ({stats.creatures} alive)
                        </div>
                        <div className="flex flex-col gap-0.5 text-[6px] font-mono">
                          {(() => {
                            const census: Record<string, { count: number; icon: string; hue: number; maxGen: number }> = {}
                            for (const c of creaturesRef.current) {
                              if (!c.alive) continue
                              const key = c.bp.id
                              if (!census[key]) census[key] = { count: 0, icon: c.bp.icon, hue: c.bp.hue, maxGen: 0 }
                              census[key].count++
                              census[key].maxGen = Math.max(census[key].maxGen, c.generation)
                            }
                            return Object.entries(census).map(([id, info]) => (
                              <div key={id} className="flex items-center justify-between">
                                <span className="text-white/30">
                                  <span className="text-[8px] mr-0.5">{info.icon}</span>
                                  {BLUEPRINTS.find(b => b.id === id)?.name ?? id}
                                </span>
                                <div className="flex items-center gap-1">
                                  {info.maxGen > 0 && (
                                    <span className="text-[4.5px] font-mono text-white/15">G{info.maxGen}</span>
                                  )}
                                  <span className="px-1 rounded-full text-[5px]"
                                    style={{ color: `hsl(${info.hue},60%,55%)`, background: `hsla(${info.hue},40%,30%,0.15)` }}>
                                    ×{info.count}
                                  </span>
                                </div>
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Inspected Creature Info */}
                    {inspectedCreature && inspectedCreature.alive && (
                      <div className="px-2 pt-2 border-t border-white/[0.04] mt-1">
                        <div className="text-[5.5px] font-mono uppercase tracking-widest text-teal-300/35 mb-1">
                          <Eye size={6} className="inline mr-0.5" /> Inspecting: {inspectedCreature.bp.name}
                        </div>
                        <div className="flex flex-col gap-0.5 text-[6px] font-mono">
                          <div className="flex justify-between"><span className="text-white/22">Species</span><span className="text-white/50">{inspectedCreature.bp.species}</span></div>
                          <div className="flex justify-between"><span className="text-white/22">Diet</span>
                            <span style={{
                              color: inspectedCreature.bp.diet === 'herbivore' ? '#66ff88' :
                                     inspectedCreature.bp.diet === 'carnivore' ? '#ff6666' : '#ffaa44'
                            }}>
                              {inspectedCreature.bp.diet === 'herbivore' ? '🌿' : inspectedCreature.bp.diet === 'carnivore' ? '🥩' : '🍽'} {inspectedCreature.bp.diet}
                            </span>
                          </div>
                          <div className="flex justify-between"><span className="text-white/22">Energy</span>
                            <span style={{ color: inspectedCreature.energy < 40 ? '#ff6666' : inspectedCreature.energy > 120 ? '#66ff88' : '#aacc88' }}>
                              {inspectedCreature.energy.toFixed(0)} / 200
                            </span>
                          </div>
                          {/* Energy bar */}
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${Math.min(100, (inspectedCreature.energy / 200) * 100)}%`,
                              background: inspectedCreature.energy < 40 ? '#ff4444' : inspectedCreature.energy > 120 ? '#44ff88' : '#88aa66',
                            }} />
                          </div>
                          <div className="flex justify-between"><span className="text-white/22">Age</span><span className="text-white/50">{inspectedCreature.age} ticks</span></div>
                          <div className="flex justify-between"><span className="text-white/22">Segs</span><span className="text-white/50">{inspectedCreature.segs.length} ({inspectedCreature.segs.filter(s => s.gripped).length} gripped)</span></div>
                          <div className="flex justify-between"><span className="text-white/22">Facing</span><span className="text-white/50">{inspectedCreature.facingDir > 0 ? '→ Right' : '← Left'}</span></div>
                          <div className="flex justify-between"><span className="text-white/22">Vel</span><span className="text-white/50">{Math.sqrt(inspectedCreature.segs[0].vx ** 2 + inspectedCreature.segs[0].vy ** 2).toFixed(2)}</span></div>
                          <div className="flex justify-between"><span className="text-white/22">Gen</span><span className="text-white/50">G{inspectedCreature.generation}</span></div>
                          <div className="flex justify-between"><span className="text-white/22">Max Age</span><span className="text-white/50">{inspectedCreature.maxAge} ({((inspectedCreature.age / inspectedCreature.maxAge) * 100).toFixed(0)}%)</span></div>
                        </div>
                        <div className="mt-1 flex gap-0.5">
                          <button onClick={() => { setFollowCreature(v => !v) }}
                            className={`flex-1 py-0.5 rounded text-[5.5px] font-mono border transition-all flex items-center justify-center gap-0.5
                              ${followCreature
                                ? 'border-cyan-400/25 text-cyan-300/70 bg-cyan-500/8'
                                : 'border-white/[0.04] text-white/20 hover:text-white/40'}`}>
                            <Crosshair size={5} /> {followCreature ? 'Following' : 'Follow'}
                          </button>
                          <button onClick={() => { inspectedRef.current = null; setInspectedCreature(null); setFollowCreature(false) }}
                            className="flex-1 py-0.5 rounded text-[5.5px] font-mono border border-white/[0.04] text-white/20 hover:text-white/40 transition-all">
                            Deselect
                          </button>
                        </div>
                        <div className="mt-0.5 flex gap-0.5">
                          <button onClick={() => {
                            if (inspectedRef.current) {
                              inspectedRef.current.energy = Math.min(200, inspectedRef.current.energy + 60)
                            }
                          }}
                            className="flex-1 py-0.5 rounded text-[5.5px] font-mono border border-emerald-400/15 text-emerald-300/40 hover:bg-emerald-500/6 transition-all">
                            ♥ Feed
                          </button>
                          <button onClick={() => {
                            if (inspectedRef.current) {
                              inspectedRef.current.facingDir = (inspectedRef.current.facingDir * -1) as 1 | -1
                            }
                          }}
                            className="flex-1 py-0.5 rounded text-[5.5px] font-mono border border-white/[0.04] text-white/20 hover:text-white/40 transition-all">
                            ↔ Flip
                          </button>
                          <button onClick={() => {
                            if (inspectedRef.current) {
                              inspectedRef.current.energy = -1
                              inspectedRef.current = null
                              setInspectedCreature(null)
                              setFollowCreature(false)
                            }
                          }}
                            className="flex-1 py-0.5 rounded text-[5.5px] font-mono border border-red-400/12 text-red-300/25 hover:bg-red-500/6 transition-all">
                            ☠ Kill
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Power Tools Section */}
                    <div className="px-2 pt-2 border-t border-white/[0.04] mt-1">
                      <div className="text-[5.5px] font-mono uppercase tracking-widest text-white/18 mb-1">Power Tools</div>
                      <div className="text-[5px] font-mono text-white/15 mb-1">Select power → click & drag on canvas</div>
                      <div className="grid grid-cols-2 gap-0.5">
                        {POWER_DEFS.map(p => (
                          <button key={p.id}
                            onClick={() => { setPowerType(p.id); setToolMode('power') }}
                            title={p.desc}
                            className={`flex items-center gap-1 px-1 py-0.5 rounded text-[6px] font-mono
                              border transition-all ${powerType === p.id && toolMode === 'power'
                                ? 'bg-white/8 border-white/15'
                                : 'border-transparent text-white/28 hover:bg-white/[0.04] hover:text-white/50'}`}
                            style={{ color: powerType === p.id && toolMode === 'power' ? p.color : undefined }}>
                            <span className="text-[8px]">{p.icon}</span>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── PLANTS TAB ───────────────────────────────────────────── */}
                {activeTab === 'plants' && (
                  <>
                    <div className="px-2 mb-1.5 text-[5.5px] font-mono text-white/20">
                      Select species → click canvas to plant. Plants photosynthesize (produce food at tips).
                    </div>
                    <div className="flex flex-col gap-0.5 px-2 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                      {PLANT_DEFS.map(p => (
                        <button key={p.id}
                          onClick={() => { setPlantSpecies(p.id); setToolMode('plant') }}
                          className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[6px] font-mono border transition-all
                            ${plantSpecies === p.id
                              ? 'border-green-400/20 bg-green-500/8 text-green-200'
                              : 'border-transparent text-white/25 hover:bg-white/[0.03] hover:text-white/45'}`}>
                          <span className="text-[9px]">{p.icon}</span>
                          <div className="flex-1 text-left">
                            <div>{p.label}</div>
                            <div className="text-[4.5px] opacity-40">{p.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="px-2 pt-1.5 flex flex-col gap-0.5">
                      <button onClick={() => {
                        const { x, y } = mouseGRef.current
                        spawnPlant(plantSpecies, x > 0 ? x : GRID_W / 2, y > 0 ? y : GRID_H * 0.7)
                      }}
                        className="w-full py-1.5 rounded text-[7px] font-mono border border-green-400/20
                          text-green-300/55 hover:bg-green-500/6 transition-all flex items-center justify-center gap-1">
                        <TreePine size={8} /> Plant Here
                      </button>
                      <button onClick={() => { plantsRef.current = [] }}
                        className="w-full py-0.5 rounded text-[6px] font-mono border border-red-400/10
                          text-red-300/25 hover:bg-red-500/5 transition-all">
                        Clear All Plants
                      </button>
                    </div>
                    {/* Plant Care Tools */}
                    <div className="px-2 pt-2 border-t border-white/[0.04] mt-1">
                      <div className="text-[5.5px] font-mono uppercase tracking-widest text-white/18 mb-1">Plant Care Tools</div>
                      <div className="grid grid-cols-2 gap-0.5">
                        {PLANT_TOOL_DEFS.map(p => (
                          <button key={p.id}
                            onClick={() => { setPlantTool(p.id); setToolMode('plant_tool') }}
                            title={p.desc}
                            className={`flex items-center gap-1 px-1 py-0.5 rounded text-[6px] font-mono
                              border transition-all ${plantTool === p.id && toolMode === 'plant_tool'
                                ? 'bg-white/8 border-white/15'
                                : 'border-transparent text-white/28 hover:bg-white/[0.04] hover:text-white/50'}`}
                            style={{ color: plantTool === p.id && toolMode === 'plant_tool' ? p.color : undefined }}>
                            <span className="text-[8px]">{p.icon}</span>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── ENVIRONMENT TAB ──────────────────────────────────────── */}
                {activeTab === 'environment' && (
                  <div className="px-2 flex flex-col gap-2 pt-1">
                    <MiniSlider label="Gravity" val={gravity} min={0} max={3} step={0.05}
                      fmt={v => `${v.toFixed(2)}g`} color="#88aaff" onChange={v => { setGravity(v); gravityRef.current = v }} />
                    <MiniSlider label="Wind" val={wind} min={-2} max={2} step={0.1}
                      fmt={v => v > 0 ? `→${v.toFixed(1)}` : v < 0 ? `←${Math.abs(v).toFixed(1)}` : '0'} color="#66ccff"
                      onChange={v => { setWind(v); windRef.current = v }} />
                    <MiniSlider label="Temperature" val={temperature} min={0} max={1} step={0.01}
                      fmt={v => v < 0.3 ? 'Cold' : v > 0.7 ? 'Hot' : 'Mild'} color="#ff8844"
                      onChange={v => { setTemperature(v); tempRef.current = v }} />
                    <MiniSlider label="Drag" val={simDrag} min={0.9} max={1} step={0.001}
                      fmt={v => v.toFixed(3)} color="#aa88ff"
                      onChange={v => { setSimDrag(v); dragRef.current = v }} />

                    {/* PATCH 01: Physics sliders */}
                    <div className="border-t border-white/[0.04] pt-2 flex flex-col gap-2">
                      <div className="text-[5.5px] font-mono uppercase tracking-widest text-white/18 mb-0.5">Physics</div>
                      <MiniSlider label="Fluid Pressure" val={fluidPressure} min={0} max={1} step={0.05}
                        fmt={v => v.toFixed(2)} color="#2266ff"
                        onChange={v => { setFluidPressure(v); fluidPressureRef.current = v; gridRef.current.fluidPressure = v }} />
                      <MiniSlider label="Obj Buoyancy" val={objBuoyancy} min={0} max={1} step={0.05}
                        fmt={v => v.toFixed(2)} color="#44ccaa"
                        onChange={v => { setObjBuoyancy(v); objBuoyancyRef.current = v }} />
                      <MiniSlider label="Heat Diffusion" val={heatDiffusion} min={0} max={1} step={0.05}
                        fmt={v => v.toFixed(2)} color="#ff8844"
                        onChange={v => { setHeatDiffusion(v); heatDiffusionRef.current = v }} />
                    </div>

                    {/* Quick weather effects */}
                    <div className="border-t border-white/[0.04] pt-2 flex flex-col gap-0.5">
                      <div className="text-[5.5px] font-mono uppercase tracking-widest text-white/18 mb-0.5">Weather</div>
                      <div className="grid grid-cols-3 gap-0.5">
                        <button onClick={() => {
                          const grid = gridRef.current
                          for (let i = 0; i < 40; i++) {
                            const rx = 5 + ((Math.random() * (GRID_W - 10)) | 0)
                            if (grid.get(rx, 2) === CELL.EMPTY) grid.set(rx, 2, CELL.WATER)
                          }
                        }}
                          className="py-0.5 rounded text-[6px] font-mono border border-blue-400/12
                            text-blue-300/35 hover:bg-blue-500/6 transition-all">
                          🌧 Rain
                        </button>
                        <button onClick={() => {
                          const grid = gridRef.current
                          for (let i = 0; i < 20; i++) {
                            const rx = 5 + ((Math.random() * (GRID_W - 10)) | 0)
                            if (grid.get(rx, 2) === CELL.EMPTY) grid.set(rx, 2, CELL.SNOW)
                          }
                        }}
                          className="py-0.5 rounded text-[6px] font-mono border border-blue-200/12
                            text-blue-200/30 hover:bg-blue-200/6 transition-all">
                          ❄ Snow
                        </button>
                        <button onClick={() => {
                          const grid = gridRef.current
                          for (let i = 0; i < 15; i++) {
                            const rx = 5 + ((Math.random() * (GRID_W - 10)) | 0)
                            grid.set(rx, 2, CELL.FIRE)
                          }
                        }}
                          className="py-0.5 rounded text-[6px] font-mono border border-orange-400/12
                            text-orange-300/30 hover:bg-orange-500/6 transition-all">
                          ☄ Meteor
                        </button>
                        <button onClick={() => {
                          const grid = gridRef.current
                          for (let i = 0; i < 10; i++) {
                            const rx = 5 + ((Math.random() * (GRID_W - 10)) | 0)
                            if (grid.get(rx, 2) === CELL.EMPTY) grid.set(rx, 2, CELL.GAS)
                          }
                        }}
                          className="py-0.5 rounded text-[6px] font-mono border border-green-400/12
                            text-green-300/30 hover:bg-green-500/6 transition-all">
                          💨 Gas Cloud
                        </button>
                        <button onClick={() => {
                          // Flood — fill bottom section with water
                          const grid = gridRef.current
                          const floodY = Math.floor(GRID_H * 0.7)
                          for (let y = floodY; y < GRID_H - 2; y++) {
                            for (let x = 1; x < GRID_W - 1; x++) {
                              if (grid.get(x, y) === CELL.EMPTY) grid.set(x, y, CELL.WATER)
                            }
                          }
                        }}
                          className="py-0.5 rounded text-[6px] font-mono border border-cyan-400/12
                            text-cyan-300/30 hover:bg-cyan-500/6 transition-all">
                          🌊 Flood
                        </button>
                        <button onClick={() => {
                          // Clear all water from the world
                          const grid = gridRef.current
                          for (let y = 0; y < GRID_H; y++) {
                            for (let x = 0; x < GRID_W; x++) {
                              if (grid.get(x, y) === CELL.WATER) grid.set(x, y, CELL.EMPTY)
                            }
                          }
                        }}
                          className="py-0.5 rounded text-[6px] font-mono border border-red-300/12
                            text-red-300/25 hover:bg-red-400/6 transition-all">
                          🚿 Clear Water
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-white/[0.04] pt-2 flex flex-col gap-1">
                      <div className="text-[5.5px] font-mono uppercase tracking-widest text-white/18 mb-0.5">Presets</div>
                      {[
                        { label: 'Normal',      g: 1, w: 0, t: 0.5, d: 0.99 },
                        { label: 'Zero-G',      g: 0, w: 0, t: 0.5, d: 0.995 },
                        { label: 'Heavy',       g: 2.5, w: 0, t: 0.5, d: 0.98 },
                        { label: 'Windy',       g: 1, w: 1.5, t: 0.5, d: 0.99 },
                        { label: 'Ice World',   g: 1, w: 0.3, t: 0.1, d: 0.998 },
                        { label: 'Volcanic',    g: 1.2, w: 0, t: 0.9, d: 0.985 },
                        { label: 'Moon',        g: 0.16, w: 0, t: 0.2, d: 0.998 },
                      ].map(p => (
                        <button key={p.label}
                          onClick={() => {
                            setGravity(p.g); setWind(p.w); setTemperature(p.t); setSimDrag(p.d)
                            gravityRef.current = p.g; windRef.current = p.w; tempRef.current = p.t; dragRef.current = p.d
                          }}
                          className="w-full py-0.5 px-1.5 rounded text-[6px] font-mono border border-white/[0.04]
                            text-white/25 hover:bg-white/[0.04] hover:text-white/50 transition-all text-left">
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── ECOSYSTEM TAB ─────────────────────────────────────── */}
                {activeTab === 'ecosystem' && (
                  <div className="px-2 pt-1 flex flex-col gap-2">
                    <div className="text-[5.5px] font-mono text-white/25 leading-relaxed">
                      Prey/Predator ecosystem — herbivores eat plants, carnivores hunt smaller creatures. Balanced by food chain.
                    </div>

                    {/* Diet Legend */}
                    <div className="flex flex-col gap-0.5">
                      <div className="text-[5.5px] font-mono uppercase tracking-widest text-white/18 mb-0.5">Diet Legend</div>
                      <div className="flex gap-1 text-[6px] font-mono">
                        <span className="px-1 rounded bg-green-500/10 text-green-300/60">🌿 Herb</span>
                        <span className="px-1 rounded bg-red-500/10 text-red-300/60">🥩 Carn</span>
                        <span className="px-1 rounded bg-amber-500/10 text-amber-300/60">🍽 Omni</span>
                      </div>
                    </div>

                    {/* Population by diet */}
                    <div className="border-t border-white/[0.04] pt-1.5">
                      <div className="text-[5.5px] font-mono uppercase tracking-widest text-white/18 mb-1">Population by Diet</div>
                      <div className="flex flex-col gap-0.5 text-[6px] font-mono">
                        {(() => {
                          const dietCount = { herbivore: 0, carnivore: 0, omnivore: 0 }
                          for (const c of creaturesRef.current) {
                            if (c.alive) dietCount[c.bp.diet]++
                          }
                          return (
                            <>
                              <div className="flex justify-between">
                                <span className="text-green-300/50">🌿 Herbivores</span>
                                <span className="text-green-300/70">{dietCount.herbivore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-red-300/50">🥩 Carnivores</span>
                                <span className="text-red-300/70">{dietCount.carnivore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-amber-300/50">🍽 Omnivores</span>
                                <span className="text-amber-300/70">{dietCount.omnivore}</span>
                              </div>
                              <div className="flex justify-between mt-1 border-t border-white/[0.03] pt-1">
                                <span className="text-white/30">Total Alive</span>
                                <span className="text-white/55">{dietCount.herbivore + dietCount.carnivore + dietCount.omnivore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/20">Ragdoll Corpses</span>
                                <span className="text-white/35">{ragdollsRef.current.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/20">Plants</span>
                                <span className="text-white/35">{plantsRef.current.length}</span>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Quick ecosystem actions */}
                    <div className="border-t border-white/[0.04] pt-1.5 flex flex-col gap-0.5">
                      <div className="text-[5.5px] font-mono uppercase tracking-widest text-white/18 mb-0.5">Quick Actions</div>
                      <button onClick={() => {
                        const herbBPs = BLUEPRINTS.filter(b => b.diet === 'herbivore')
                        for (let i = 0; i < 3; i++) spawnCreatureNow(herbBPs[Math.floor(Math.random() * herbBPs.length)])
                      }}
                        className="w-full py-0.5 rounded text-[6px] font-mono border border-green-400/12
                          text-green-300/40 hover:bg-green-500/6 transition-all">
                        🌿 Spawn 3 Herbivores
                      </button>
                      <button onClick={() => {
                        const carnBPs = BLUEPRINTS.filter(b => b.diet === 'carnivore')
                        for (let i = 0; i < 2; i++) spawnCreatureNow(carnBPs[Math.floor(Math.random() * carnBPs.length)])
                      }}
                        className="w-full py-0.5 rounded text-[6px] font-mono border border-red-400/12
                          text-red-300/35 hover:bg-red-500/6 transition-all">
                        🥩 Spawn 2 Carnivores
                      </button>
                      <button onClick={() => {
                        for (let i = 0; i < 5; i++) {
                          const sp = PLANT_DEFS[Math.floor(Math.random() * PLANT_DEFS.length)]
                          const gx = 20 + Math.random() * (GRID_W - 40)
                          spawnPlant(sp.id, gx, GRID_H * 0.5)
                        }
                      }}
                        className="w-full py-0.5 rounded text-[6px] font-mono border border-green-400/12
                          text-green-300/35 hover:bg-green-500/6 transition-all">
                        🌱 Seed 5 Random Plants
                      </button>
                      <button onClick={() => gridRef.current.spawnFood(30)}
                        className="w-full py-0.5 rounded text-[6px] font-mono border border-emerald-400/12
                          text-emerald-300/35 hover:bg-emerald-500/6 transition-all">
                        🍖 Flood Food (30)
                      </button>
                      <button onClick={() => { ragdollsRef.current = [] }}
                        className="w-full py-0.5 rounded text-[6px] font-mono border border-white/[0.04]
                          text-white/20 hover:bg-white/[0.04] transition-all">
                        🧹 Clear Corpses
                      </button>
                    </div>

                    {/* Plant Tools Section */}
                    <div className="border-t border-white/[0.04] pt-1.5">
                      <div className="text-[5.5px] font-mono uppercase tracking-widest text-white/18 mb-0.5">Plant Tools</div>
                      <div className="text-[5px] font-mono text-white/15 mb-1">Select tool → click near a plant on canvas</div>
                      <div className="grid grid-cols-2 gap-0.5">
                        {PLANT_TOOL_DEFS.map(p => (
                          <button key={p.id}
                            onClick={() => { setPlantTool(p.id); setToolMode('plant_tool') }}
                            title={p.desc}
                            className={`flex items-center gap-1 px-1 py-0.5 rounded text-[6px] font-mono
                              border transition-all ${plantTool === p.id && toolMode === 'plant_tool'
                                ? 'bg-white/8 border-white/15'
                                : 'border-transparent text-white/28 hover:bg-white/[0.04] hover:text-white/50'}`}
                            style={{ color: plantTool === p.id && toolMode === 'plant_tool' ? p.color : undefined }}>
                            <span className="text-[8px]">{p.icon}</span>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Hints */}
              <div className="px-2 py-1.5 border-t border-white/[0.04]">
                <div className="text-[5px] font-mono text-white/10 leading-relaxed">
                  Scroll=zoom · Alt+drag=pan · Space=pause<br />
                  C=rand-spawn · F=food · R=reset · 1-8=tools
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── CANVAS ───────────────────────────────��──────────────────────────── */}
        <div className="flex-1 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{
              imageRendering: 'pixelated',
              cursor: toolMode === 'grab' ? 'grab'
                : toolMode === 'paint' || toolMode === 'erase' ? 'crosshair'
                : toolMode === 'creature' ? 'cell'
                : toolMode === 'drop' || toolMode === 'plant' ? 'copy'
                : toolMode === 'power' || toolMode === 'plant_tool' ? 'pointer'
                : toolMode === 'inspect' ? 'help'
                : 'default',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onWheel={onWheel}
          />

          {!running && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none
              text-[7px] font-mono text-white/25 bg-black/50 px-3 py-1 rounded border border-white/8">
              ⏸ PAUSED — Space to resume
            </div>
          )}

          {/* Floating inspect badge (visible from any tab) */}
          {inspectedCreature && inspectedCreature.alive && activeTab !== 'creatures' && (
            <div className="absolute bottom-3 left-3 z-10 pointer-events-auto
              px-2.5 py-1.5 rounded-lg bg-black/70 border border-teal-400/20 backdrop-blur-sm cursor-pointer"
              onClick={() => setActiveTab('creatures')}>
              <div className="flex items-center gap-1.5">
                <Eye size={7} className="text-teal-300/50" />
                <span className="text-[6.5px] font-mono text-teal-200/60">
                  {inspectedCreature.bp.icon} {inspectedCreature.bp.name}
                </span>
                <span className="text-[5.5px] font-mono" style={{
                  color: inspectedCreature.energy < 40 ? '#ff6666' : inspectedCreature.energy > 120 ? '#66ff88' : '#aacc88',
                }}>
                  ♥{inspectedCreature.energy.toFixed(0)}
                </span>
              </div>
            </div>
          )}

          {/* Training overlay */}
          {trainStats?.running && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none
              px-4 py-2 rounded-lg bg-black/70 border border-purple-400/25 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[7px] font-mono text-purple-200/80 font-bold">
                    EVOLVING — Gen {trainStats.generation}
                  </span>
                  <span className="text-[6px] font-mono text-purple-300/50">
                    Candidate {trainStats.candidateIdx + 1}/{trainStats.popSize} · best {trainStats.bestScore > -Infinity ? trainStats.bestScore.toFixed(1) : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SPECIES GALLERY MODAL ─────────────────────────────────────────────── */}
      {showGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowGallery(false) }}>
          <div className="bg-[#080c14] border border-white/[0.06] rounded-xl w-[480px] max-h-[60vh]
            flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05]">
              <div className="flex items-center gap-1.5">
                <Trophy size={10} className="text-amber-400/50" />
                <span className="text-[8px] font-mono uppercase tracking-widest text-white/40">Species Gallery</span>
              </div>
              <button onClick={() => setShowGallery(false)} className="text-white/20 hover:text-white/50 text-[9px] font-mono">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: 'none' }}>
              {species.length === 0 && (
                <div className="text-center text-[7px] font-mono text-white/15 py-6">
                  No species saved yet. Train in Evolve tab and save.
                </div>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                {species.map(sp => (
                  <div key={sp.id} className="p-2 rounded bg-white/[0.02] border border-white/[0.04] flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[12px]">{sp.bp.icon}</span>
                      <div>
                        <div className="text-[7px] font-mono text-white/55">{sp.bp.name}</div>
                        <div className="text-[5.5px] font-mono text-white/22">G{sp.generation} · {sp.bestScore.toFixed(1)}</div>
                      </div>
                    </div>
                    <button onClick={() => {
                      const def = TERRAINS.find(t => t.id === terrainRef.current) ?? TERRAINS[0]
                      const sy = findSpawnY(gridRef.current, def.spawnX, def.spawnY)
                      creaturesRef.current.push(spawnCreature(sp.bp, def.spawnX, sy, sp.bestParams.slice() as Float32Array))
                      setShowGallery(false)
                    }}
                      className="py-0.5 rounded text-[6px] font-mono border border-cyan-400/15
                        text-cyan-300/40 hover:bg-cyan-500/6 transition-all">
                      Adopt
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS (Plant growth, Object rendering, Plant rendering)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
//  FRACTAL PLANT SYSTEM — L-system inspired, iterative, recursive growth
// ═══════════════════════════════════════════════════════════════════════════════
// Each species has unique branching rules (angle, length, ratio, max depth).
// Growth happens in two phases:
//   1. BURST PHASE (age < 50): rapid fractal expansion, multiple nodes per tick
//   2. MATURE PHASE (age >= 50): slow incremental growth, fruit/flower production

interface PlantRules {
  maxDepth: number      // fractal recursion limit
  segLen: number        // base segment length
  lenDecay: number      // segment length multiplier per depth
  thickDecay: number    // thickness taper per depth
  branchAngle: number   // base branching angle (radians)
  angleJitter: number   // random variation in angle
  branchProb: number    // probability of branching at each node
  maxBranches: number   // max children per node
  growUp: boolean       // bias growth upward
  needsWater: boolean   // only grows in water
  trunkDepth: number    // depth below which no branching (straight trunk)
}

// segLen in GRID CELLS. World = 280×175.  Tree: 12 × ~4 trunk segs ≈ 48 cells (~27% height).
const PLANT_RULES: Record<string, PlantRules> = {
  tree:      { maxDepth: 8,  segLen: 12,  lenDecay: 0.82, thickDecay: 0.72, branchAngle: 0.50, angleJitter: 0.30, branchProb: 0.60, maxBranches: 3, growUp: true,  needsWater: false, trunkDepth: 3 },
  vine:      { maxDepth: 12, segLen: 6,   lenDecay: 0.92, thickDecay: 0.88, branchAngle: 0.55, angleJitter: 0.70, branchProb: 0.30, maxBranches: 3, growUp: false, needsWater: false, trunkDepth: 0 },
  coral:     { maxDepth: 7,  segLen: 6,   lenDecay: 0.82, thickDecay: 0.75, branchAngle: 0.65, angleJitter: 0.80, branchProb: 0.55, maxBranches: 4, growUp: false, needsWater: true,  trunkDepth: 1 },
  mushroom:  { maxDepth: 5,  segLen: 10,  lenDecay: 0.50, thickDecay: 0.50, branchAngle: 1.20, angleJitter: 0.35, branchProb: 0.85, maxBranches: 5, growUp: true,  needsWater: false, trunkDepth: 3 },
  fern:      { maxDepth: 8,  segLen: 8,   lenDecay: 0.82, thickDecay: 0.78, branchAngle: 0.45, angleJitter: 0.25, branchProb: 0.70, maxBranches: 2, growUp: true,  needsWater: false, trunkDepth: 1 },
  cactus:    { maxDepth: 5,  segLen: 10,  lenDecay: 0.70, thickDecay: 0.65, branchAngle: 0.25, angleJitter: 0.12, branchProb: 0.25, maxBranches: 2, growUp: true,  needsWater: false, trunkDepth: 2 },
  kelp:      { maxDepth: 10, segLen: 8,   lenDecay: 0.93, thickDecay: 0.90, branchAngle: 0.18, angleJitter: 0.12, branchProb: 0.15, maxBranches: 2, growUp: true,  needsWater: true,  trunkDepth: 5 },
  bamboo:    { maxDepth: 12, segLen: 10,  lenDecay: 0.97, thickDecay: 0.95, branchAngle: 0.12, angleJitter: 0.05, branchProb: 0.08, maxBranches: 2, growUp: true,  needsWater: false, trunkDepth: 9 },
  moss:      { maxDepth: 4,  segLen: 2.5, lenDecay: 0.80, thickDecay: 0.70, branchAngle: 1.00, angleJitter: 1.20, branchProb: 0.75, maxBranches: 5, growUp: false, needsWater: false, trunkDepth: 0 },
  sunflower: { maxDepth: 6,  segLen: 12,  lenDecay: 0.55, thickDecay: 0.55, branchAngle: 0.35, angleJitter: 0.06, branchProb: 0.08, maxBranches: 2, growUp: true,  needsWater: false, trunkDepth: 5 },
  lily:      { maxDepth: 4,  segLen: 3,   lenDecay: 0.75, thickDecay: 0.65, branchAngle: 0.80, angleJitter: 0.70, branchProb: 0.60, maxBranches: 4, growUp: false, needsWater: true,  trunkDepth: 0 },
  mangrove:  { maxDepth: 8,  segLen: 10,  lenDecay: 0.82, thickDecay: 0.72, branchAngle: 0.55, angleJitter: 0.45, branchProb: 0.50, maxBranches: 3, growUp: true,  needsWater: false, trunkDepth: 2 },
  orchid:    { maxDepth: 6,  segLen: 7,   lenDecay: 0.72, thickDecay: 0.65, branchAngle: 0.45, angleJitter: 0.30, branchProb: 0.35, maxBranches: 3, growUp: true,  needsWater: false, trunkDepth: 3 },
  pitcher:   { maxDepth: 5,  segLen: 8,   lenDecay: 0.70, thickDecay: 0.60, branchAngle: 0.70, angleJitter: 0.50, branchProb: 0.40, maxBranches: 3, growUp: true,  needsWater: false, trunkDepth: 2 },
  bonsai:    { maxDepth: 7,  segLen: 6,   lenDecay: 0.80, thickDecay: 0.70, branchAngle: 0.55, angleJitter: 0.45, branchProb: 0.60, maxBranches: 3, growUp: true,  needsWater: false, trunkDepth: 1 },
}

/** Immediately generate fractal skeleton when a plant is spawned.
 *  This creates the full visible structure recursively. */
function _initPlantFractal(
  node: PlantNode, species: string, grid: ParticleWorld, depth: number,
): void {
  const rules = PLANT_RULES[species] ?? PLANT_RULES.tree
  if (depth >= rules.maxDepth) return
  if (node.x < 2 || node.x > GRID_W - 2 || node.y < 2 || node.y > GRID_H - 2) return
  if (grid.isSolid(node.x | 0, node.y | 0)) return
  // Aquatic check
  if (rules.needsWater && depth > 0 && grid.cellAt(node.x | 0, node.y | 0) !== CELL.WATER) return

  // Determine branching: trunk region gets 1 child (straight), above gets multiple
  const inTrunk = depth < rules.trunkDepth
  const numBranches = inTrunk ? 1 :
    (Math.random() < rules.branchProb ? (1 + Math.floor(Math.random() * rules.maxBranches)) : 1)

  const segLen = rules.segLen * Math.pow(rules.lenDecay, depth)

  for (let b = 0; b < numBranches; b++) {
    let angle = node.angle
    if (inTrunk) {
      // Straight with very slight jitter
      angle += (Math.random() - 0.5) * rules.angleJitter * 0.3
    } else if (numBranches > 1) {
      // Fan out branches symmetrically with jitter
      const spread = rules.branchAngle
      const t = numBranches > 1 ? (b / (numBranches - 1)) - 0.5 : 0
      angle += t * spread * 2 + (Math.random() - 0.5) * rules.angleJitter
    } else {
      angle += (Math.random() - 0.5) * rules.angleJitter
    }
    // Bias upward for species that grow up — strong pull toward -PI/2 (up)
    if (rules.growUp) {
      const upBias = depth < rules.trunkDepth ? 0.7 : 0.4 // trunk is very straight up
      angle = angle * (1 - upBias) + (-Math.PI / 2) * upBias
    }

    const nx = node.x + Math.cos(angle) * segLen
    const ny = node.y + Math.sin(angle) * segLen
    if (nx < 2 || nx > GRID_W - 2 || ny < 2 || ny > GRID_H - 2) continue
    if (grid.isSolid(nx | 0, ny | 0)) continue

    const child: PlantNode = {
      x: nx, y: ny, vx: 0, vy: 0,
      restDx: nx - node.x, restDy: ny - node.y,
      age: 0,
      thickness: Math.max(0.15, node.thickness * rules.thickDecay),
      children: [], angle, alive: true,
    }
    node.children.push(child)
    // Recurse — high probability; only extreme depth causes thinning
    if (Math.random() < 0.96 - depth * 0.02) {
      _initPlantFractal(child, species, grid, depth + 1)
    }
  }
}

/** Ongoing growth — adds new tips, extends branches, produces fruit */
function _growNode(node: PlantNode, plant: GrowingPlant, grid: ParticleWorld, depth: number): void {
  if (!node.alive || depth > 50) return
  node.age++
  const rules = PLANT_RULES[plant.species] ?? PLANT_RULES.tree

  // Aquatic check
  if (rules.needsWater && depth > 0 && grid.cellAt(node.x | 0, node.y | 0) !== CELL.WATER) return

  // Leaf tips can sprout new growth — no hard depth cap, probability decreases
  if (node.children.length === 0) {
    // Growth chance decreases with depth but never reaches zero → infinite growth
    const depthFactor = 1.0 / (1.0 + Math.max(0, depth - rules.maxDepth) * 0.25)
    const growChance = plant.growthRate * 0.15 * depthFactor * (depth < rules.trunkDepth ? 0.3 : 1.0)
    if (Math.random() < growChance) {
      const segLen = rules.segLen * Math.pow(rules.lenDecay, depth) * (0.7 + Math.random() * 0.3)
      let angle = node.angle + (Math.random() - 0.5) * rules.angleJitter
      // Apply upward bias for species that grow up
      if (rules.growUp) {
        const upBias = depth < rules.trunkDepth ? 0.7 : 0.4
        angle = angle * (1 - upBias) + (-Math.PI / 2) * upBias
      }
      const nx = node.x + Math.cos(angle) * segLen
      const ny = node.y + Math.sin(angle) * segLen
      if (nx > 2 && nx < GRID_W - 2 && ny > 2 && ny < GRID_H - 2 && !grid.isSolid(nx | 0, ny | 0)) {
        node.children.push({
          x: nx, y: ny, vx: 0, vy: 0,
          restDx: nx - node.x, restDy: ny - node.y,
          age: 0,
          thickness: Math.max(0.12, node.thickness * rules.thickDecay),
          children: [], angle, alive: true,
        })
      }
    }
    // Branch splitting at tips
    if (node.age > 8 && Math.random() < rules.branchProb * 0.06 && node.children.length < rules.maxBranches) {
      const sign = Math.random() < 0.5 ? -1 : 1
      const bAngle = node.angle + sign * rules.branchAngle * (0.6 + Math.random() * 0.4)
      const bLen = rules.segLen * Math.pow(rules.lenDecay, depth) * 0.7
      const bx = node.x + Math.cos(bAngle) * bLen
      const by = node.y + Math.sin(bAngle) * bLen
      if (bx > 2 && bx < GRID_W - 2 && by > 2 && by < GRID_H - 2 && !grid.isSolid(bx | 0, by | 0)) {
        node.children.push({
          x: bx, y: by, vx: 0, vy: 0,
          restDx: bx - node.x, restDy: by - node.y,
          age: 0,
          thickness: Math.max(0.10, node.thickness * rules.thickDecay * 0.6),
          children: [], angle: bAngle, alive: true,
        })
      }
    }
    // Fruit/food production at mature tips
    const isFruiting = plant.species === 'sunflower' || plant.species === 'orchid' || plant.species === 'tree' || plant.species === 'mangrove'
    if (isFruiting && node.age > 50 && Math.random() < 0.008) {
      const fx = (node.x + (Math.random() - 0.5) * 3) | 0
      const fy = (node.y + 1) | 0
      if (grid.get(fx, fy) === CELL.EMPTY) grid.set(fx, fy, CELL.FOOD)
    }
  }

  // Thicken trunk over time (real trees add growth rings)
  if (depth < 3 && node.age % 60 === 0) {
    node.thickness = Math.min(4.0, node.thickness + 0.02)
  }

  for (const child of node.children) _growNode(child, plant, grid, depth + 1)
}

// ── Plant ragdoll physics — spring-based, per-node ─────────────────────────────

function _stepPlantPhysics(
  node: PlantNode, plant: GrowingPlant, parent: PlantNode | null,
  wind: number, gravity: number,
): void {
  if (!node.alive) return
  const sp = plant.species
  const isRoot = !parent

  if (!isRoot) {
    // Rest target position = parent's current pos + rest offset
    const targetX = parent!.x + node.restDx
    const targetY = parent!.y + node.restDy

    // Spring force toward rest position (stiffness varies by species & depth)
    // PATCH 01: increased stiffness across the board to reduce wobble
    const stiffBase = sp === 'bamboo' ? 0.55 : sp === 'cactus' ? 0.65 : sp === 'tree' ? 0.45
      : sp === 'vine' ? 0.12 : sp === 'kelp' ? 0.10 : sp === 'fern' ? 0.35
      : sp === 'mushroom' ? 0.50 : sp === 'moss' ? 0.30
      : sp === 'bonsai' ? 0.50 : sp === 'mangrove' ? 0.42 : sp === 'sunflower' ? 0.40 : 0.35
    const stiffness = stiffBase + node.thickness * 0.10 // thicker = stiffer
    node.vx += (targetX - node.x) * stiffness
    node.vy += (targetY - node.y) * stiffness

    // Wind force — stronger on thin branches/tips (reduced magnitude)
    const windFactor = (1.0 - Math.min(1, node.thickness * 0.3)) * 0.06
    node.vx += wind * windFactor

    // Very light gravity (branches droop slightly — reduced)
    const gFactor = sp === 'vine' ? 0.025 : sp === 'kelp' ? -0.008 : sp === 'moss' ? 0.012 : 0.008
    node.vy += gFactor * gravity

    // Species-specific natural sway (reduced amplitudes)
    const swayT = plant.age * 0.012 + node.restDx * 0.3 + node.restDy * 0.2
    if (sp === 'kelp' || sp === 'coral') {
      node.vx += Math.sin(swayT * 0.8 + node.y * 0.1) * 0.015
    } else if (sp === 'vine') {
      node.vx += Math.sin(swayT * 0.5) * 0.008
    } else if (sp === 'bamboo') {
      node.vx += Math.sin(swayT * 2.0) * 0.004
    } else if (sp === 'sunflower' || sp === 'fern') {
      node.vx += Math.sin(swayT * 0.7) * 0.005
      node.vy += Math.cos(swayT * 0.5) * 0.002
    }

    // Damping — stronger to prevent oscillation (was 0.88)
    node.vx *= 0.78
    node.vy *= 0.78

    // Integrate
    node.x += node.vx
    node.y += node.vy

    // Constraint: max stretch from parent (prevent explosions)
    const dx = node.x - parent!.x, dy = node.y - parent!.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const restLen = Math.sqrt(node.restDx * node.restDx + node.restDy * node.restDy)
    const maxStretch = restLen * 1.4
    if (dist > maxStretch && dist > 0.1) {
      const scale = maxStretch / dist
      node.x = parent!.x + dx * scale
      node.y = parent!.y + dy * scale
    }

    // Clamp to world bounds
    node.x = Math.max(2, Math.min(GRID_W - 2, node.x))
    node.y = Math.max(2, Math.min(GRID_H - 2, node.y))
  }

  for (const child of node.children) {
    _stepPlantPhysics(child, plant, node, wind, gravity)
  }
}

/** Find nearest plant node to a point (for dragging). Returns node & distance. */
function _findNearestPlantNode(node: PlantNode, mx: number, my: number, best: { node: PlantNode | null; dist: number }): void {
  if (!node.alive) return
  const dx = node.x - mx, dy = node.y - my
  const d = dx * dx + dy * dy
  if (d < best.dist) { best.dist = d; best.node = node }
  for (const child of node.children) _findNearestPlantNode(child, mx, my, best)
}

// ── Plant rendering — PIXEL ART style ──────────────────────────────────────────

const PLANT_HUE: Record<string, number> = {
  tree: 110, vine: 130, coral: 340, mushroom: 280, fern: 120, cactus: 100,
  kelp: 155, bamboo: 115, moss: 105, sunflower: 50, lily: 330, mangrove: 140,
  orchid: 310, pitcher: 135, bonsai: 95,
}

/** Pixel-art Bresenham line: fills 1×1 cells between two grid points. */
function _pxLine(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  thick: number, color: string,
): void {
  ctx.fillStyle = color
  let ix0 = Math.round(x0), iy0 = Math.round(y0)
  const ix1 = Math.round(x1), iy1 = Math.round(y1)
  const dx = Math.abs(ix1 - ix0), dy = -Math.abs(iy1 - iy0)
  const sx = ix0 < ix1 ? 1 : -1, sy = iy0 < iy1 ? 1 : -1
  let err = dx + dy
  const t = Math.max(0, Math.round(thick * 0.5))
  for (let step = 0; step < 200; step++) {
    // Fill a cross/block for thickness
    if (t <= 0) {
      ctx.fillRect(ix0, iy0, 1, 1)
    } else {
      ctx.fillRect(ix0 - t, iy0, 1 + t * 2, 1)
      ctx.fillRect(ix0, iy0 - t, 1, 1 + t * 2)
    }
    if (ix0 === ix1 && iy0 === iy1) break
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; ix0 += sx }
    if (e2 <= dx) { err += dx; iy0 += sy }
  }
}

function _renderPlant(
  ctx: CanvasRenderingContext2D,
  node: PlantNode,
  plant: GrowingPlant,
  cellPx: number,
  depth = 0,
): void {
  const hue = PLANT_HUE[plant.species] ?? 120
  const sp = plant.species
  const time = plant.age * 0.02

  for (const child of node.children) {
    if (!child.alive) continue

    // ── Pixel art branch (Bresenham line with thickness) ─────────────────
    const thick = Math.max(0, node.thickness * Math.pow(0.88, depth))
    let color: string
    if (sp === 'mushroom' && depth < 3) {
      color = `hsl(30,20%,${22 + depth * 3}%)`
    } else if (sp === 'cactus') {
      color = `hsl(${hue},55%,${28 + depth * 3}%)`
    } else if (sp === 'bamboo') {
      const nodeRing = depth % 3 === 0 && depth > 0
      color = nodeRing ? `hsl(${hue},30%,30%)` : `hsl(${hue},50%,${32 + depth * 2}%)`
    } else if (sp === 'coral') {
      color = `hsl(${hue + depth * 10},${65 + depth * 3}%,${35 + depth * 5}%)`
    } else if (sp === 'kelp') {
      color = `hsl(${hue},45%,${25 + depth * 3}%)`
    } else {
      // Brown trunk → green branches
      const trunkness = Math.max(0, 1 - depth / 4)
      const h = hue * (1 - trunkness) + 30 * trunkness
      const s = 25 + (1 - trunkness) * 45
      const l = 20 + depth * 3
      color = `hsl(${h},${s}%,${l}%)`
    }

    _pxLine(ctx, node.x, node.y, child.x, child.y, thick, color)

    // ── Pixel leaf/flower at tips ───────────────────────────────────────
    const isLeaf = child.children.length === 0 && child.alive
    if (isLeaf && depth > 1) {
      _renderLeafPx(ctx, child.x, child.y, sp, hue, depth, node.thickness, time)
    }

    _renderPlant(ctx, child, plant, cellPx, depth + 1)
  }
}

/** Pixel-art leaf/flower/cap rendering at branch tips */
function _renderLeafPx(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  species: string, hue: number, depth: number,
  thickness: number, time: number,
): void {
  const ix = Math.round(x), iy = Math.round(y)
  // Pixel helper
  const px = (cx: number, cy: number, col: string) => {
    ctx.fillStyle = col; ctx.fillRect(Math.round(cx), Math.round(cy), 1, 1)
  }

  switch (species) {
    case 'tree':
    case 'bonsai':
    case 'mangrove': {
      // Leaf cluster: 3×3 cross pattern in greens
      const c1 = `hsl(${hue + 10},55%,32%)`
      const c2 = `hsl(${hue + 20},60%,40%)`
      const c3 = `hsl(${hue + 5},50%,28%)`
      px(ix, iy, c1); px(ix - 1, iy, c2); px(ix + 1, iy, c2)
      px(ix, iy - 1, c2); px(ix, iy + 1, c3)
      // Extra pixels for thick trees
      if (thickness > 1) {
        px(ix - 1, iy - 1, c3); px(ix + 1, iy - 1, c3)
        px(ix - 2, iy, c2); px(ix + 2, iy, c2)
      }
      break
    }
    case 'fern': {
      // Tiny frond: 2-3 pixels in a diagonal
      const c = `hsl(${hue + 15},60%,36%)`
      const side = depth % 2 === 0 ? 1 : -1
      px(ix, iy, c); px(ix + side, iy - 1, c); px(ix + side * 2, iy - 2, c)
      break
    }
    case 'mushroom': {
      if (depth >= 2) {
        // Pixel cap: wide dome
        const c1 = `hsl(${hue},50%,38%)`
        const c2 = `hsl(${hue + 30},40%,55%)`   // spots
        const c3 = `hsl(${hue - 10},55%,30%)`
        // Cap dome
        for (let dx = -3; dx <= 3; dx++) {
          px(ix + dx, iy - 1, c1)
        }
        for (let dx = -2; dx <= 2; dx++) {
          px(ix + dx, iy - 2, c1)
        }
        px(ix - 1, iy - 3, c1); px(ix, iy - 3, c1); px(ix + 1, iy - 3, c1)
        // Spots
        px(ix - 1, iy - 2, c2); px(ix + 1, iy - 2, c2)
        // Underside dark
        px(ix - 2, iy, c3); px(ix + 2, iy, c3)
      }
      break
    }
    case 'coral': {
      // Bioluminescent tip — bright pixel with glow
      const c = `hsl(${hue},80%,60%)`
      px(ix, iy, c); px(ix + 1, iy, c); px(ix, iy - 1, c)
      // Soft glow
      ctx.fillStyle = `hsla(${hue},85%,65%,0.3)`
      ctx.fillRect(ix - 1, iy - 1, 3, 3)
      break
    }
    case 'sunflower': {
      if (depth >= 4) {
        // Sunflower head: yellow petals in cross, brown center
        const yc = `hsl(50,85%,55%)`
        const bc = `hsl(30,70%,22%)`
        // Petals (8-directional)
        px(ix - 2, iy, yc); px(ix + 2, iy, yc)
        px(ix, iy - 2, yc); px(ix, iy + 2, yc)
        px(ix - 1, iy - 1, yc); px(ix + 1, iy - 1, yc)
        px(ix - 1, iy + 1, yc); px(ix + 1, iy + 1, yc)
        // Center
        px(ix, iy, bc); px(ix - 1, iy, bc); px(ix + 1, iy, bc)
        px(ix, iy - 1, bc); px(ix, iy + 1, bc)
      } else {
        px(ix, iy, `hsl(${hue + 60},50%,35%)`)
      }
      break
    }
    case 'orchid': {
      if (depth >= 3) {
        // Delicate pixel flower: 5 colored dots + center
        const pc = `hsl(${hue},65%,58%)`
        const cc = `hsl(${hue + 40},70%,68%)`
        px(ix, iy - 2, pc); px(ix - 2, iy, pc); px(ix + 2, iy, pc)
        px(ix - 1, iy + 1, pc); px(ix + 1, iy + 1, pc)
        px(ix, iy, cc)
      }
      break
    }
    case 'vine':
    case 'moss': {
      px(ix, iy, `hsl(${hue + 15},55%,36%)`)
      px(ix + (depth % 2 === 0 ? 1 : -1), iy, `hsl(${hue + 10},50%,32%)`)
      break
    }
    case 'cactus': {
      // Spine pixels radiating out
      const sc = `hsl(60,30%,58%)`
      px(ix - 2, iy, sc); px(ix + 2, iy, sc)
      px(ix, iy - 2, sc); px(ix, iy + 2, sc)
      break
    }
    case 'kelp': {
      // Bulb: 2-pixel wide oval
      const kc = `hsl(${hue},45%,33%)`
      px(ix, iy, kc); px(ix, iy - 1, kc); px(ix + 1, iy, kc)
      break
    }
    case 'bamboo': {
      // Tiny leaf pair
      const lc = `hsl(${hue + 10},50%,38%)`
      px(ix - 1, iy, lc); px(ix + 1, iy, lc); px(ix - 2, iy - 1, lc); px(ix + 2, iy - 1, lc)
      break
    }
    case 'lily': {
      // Flat pad pixels + flower center
      const gc = `hsl(140,50%,30%)`
      for (let dx = -2; dx <= 2; dx++) px(ix + dx, iy, gc)
      for (let dx = -1; dx <= 1; dx++) px(ix + dx, iy - 1, gc)
      if (depth >= 2) {
        const fc = `hsl(${hue},60%,62%)`
        px(ix, iy - 1, fc); px(ix - 1, iy - 2, fc); px(ix + 1, iy - 2, fc)
      }
      break
    }
    case 'pitcher': {
      // Cup shape: U-shaped pixels
      const pc = `hsl(${hue},45%,33%)`
      const lp = `hsl(${hue + 30},55%,43%)`
      px(ix - 1, iy, pc); px(ix + 1, iy, pc)
      px(ix - 1, iy - 1, pc); px(ix + 1, iy - 1, pc)
      px(ix - 1, iy - 2, pc); px(ix + 1, iy - 2, pc)
      // Lip
      px(ix - 2, iy - 3, lp); px(ix - 1, iy - 3, lp); px(ix, iy - 3, lp); px(ix + 1, iy - 3, lp); px(ix + 2, iy - 3, lp)
      break
    }
    default: {
      px(ix, iy, `hsl(${hue + 20},55%,38%)`)
      px(ix + 1, iy, `hsl(${hue + 20},55%,38%)`)
    }
  }
}

// ── Object rendering ───────────────────────────────────────────────────────────
function _renderObject(
  ctx: CanvasRenderingContext2D,
  obj: DroppedObject,
  tick: number,
): void {
  const def = OBJECT_DEFS.find(d => d.id === obj.type)
  const color = def?.color ?? '#ffffff'
  const x = obj.x, y = obj.y

  ctx.save()

  switch (obj.type) {
    case 'bomb':
    case 'c4':
    case 'nuke': {
      const flash = Math.sin(tick * 0.3) > 0 && obj.life > 30
      ctx.beginPath()
      ctx.arc(x, y, obj.type === 'nuke' ? 3 : 2, 0, Math.PI * 2)
      ctx.fillStyle = flash ? '#ff0000' : color + 'cc'
      ctx.shadowColor = color; ctx.shadowBlur = 4
      ctx.fill()
      ctx.shadowBlur = 0
      // Fuse spark
      if (obj.life > 0 && obj.type === 'bomb') {
        ctx.beginPath()
        ctx.arc(x, y - 2.5, 0.5, 0, Math.PI * 2)
        ctx.fillStyle = `hsl(${(tick * 20) % 60},100%,70%)`
        ctx.fill()
      }
      break
    }

    case 'fan': {
      const bladeAngle = tick * 0.15
      for (let b = 0; b < 3; b++) {
        const a = bladeAngle + b * Math.PI * 2 / 3
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3)
        ctx.strokeStyle = color + '88'
        ctx.lineWidth = 0.6
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(x, y, 0.8, 0, Math.PI * 2)
      ctx.fillStyle = color + 'aa'
      ctx.fill()
      break
    }

    case 'attractor':
    case 'repulsor': {
      const pulse = Math.sin(tick * 0.08) * 2 + 5
      ctx.beginPath()
      ctx.arc(x, y, pulse, 0, Math.PI * 2)
      ctx.strokeStyle = color + '30'
      ctx.lineWidth = 0.3
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = color + 'cc'
      ctx.shadowColor = color; ctx.shadowBlur = 6
      ctx.fill()
      ctx.shadowBlur = 0
      break
    }

    case 'heater':
    case 'cooler': {
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fillStyle = color + '88'
      ctx.shadowColor = color; ctx.shadowBlur = 8
      ctx.fill()
      ctx.shadowBlur = 0
      // Shimmer
      for (let i = 0; i < 3; i++) {
        const ang = tick * 0.05 + i * 2.1
        const r = 3 + Math.sin(tick * 0.1 + i) * 1.5
        ctx.beginPath()
        ctx.arc(x + Math.cos(ang) * r, y + Math.sin(ang) * r, 0.4, 0, Math.PI * 2)
        ctx.fillStyle = color + '44'
        ctx.fill()
      }
      break
    }

    case 'lightning': {
      // Draw bolt
      ctx.beginPath()
      let lx = x, ly = y
      for (let i = 0; i < 8; i++) {
        lx += (Math.random() - 0.5) * 3
        ly += 4
        ctx.lineTo(lx, ly)
      }
      ctx.strokeStyle = '#ffff88'
      ctx.lineWidth = 0.5
      ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 6
      ctx.stroke()
      ctx.shadowBlur = 0
      break
    }

    case 'virus': {
      const pulse = Math.sin(tick * 0.12) * 0.5 + 1.5
      ctx.beginPath()
      ctx.arc(x, y, pulse, 0, Math.PI * 2)
      ctx.fillStyle = '#88ff4466'
      ctx.fill()
      // Spikes
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + tick * 0.02
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(a) * (pulse + 1), y + Math.sin(a) * (pulse + 1))
        ctx.strokeStyle = '#88ff4444'
        ctx.lineWidth = 0.2
        ctx.stroke()
      }
      break
    }

    case 'blackhole': {
      const rings = 3
      for (let r = rings; r > 0; r--) {
        ctx.beginPath()
        ctx.arc(x, y, r * 3 + Math.sin(tick * 0.05 + r) * 1, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(80,0,120,${0.15 / r})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fillStyle = '#1a0028'
      ctx.shadowColor = '#6600aa'; ctx.shadowBlur = 10
      ctx.fill()
      ctx.shadowBlur = 0
      break
    }

    case 'whitehole': {
      const pulse = Math.sin(tick * 0.1) * 1 + 3
      ctx.beginPath()
      ctx.arc(x, y, pulse, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 0.3
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8
      ctx.fill()
      ctx.shadowBlur = 0
      break
    }

    case 'spring': {
      // Coil
      for (let i = 0; i < 5; i++) {
        const sy = y + i * 0.8 - 2
        ctx.beginPath()
        ctx.moveTo(x - 1.5, sy)
        ctx.quadraticCurveTo(x + (i % 2 === 0 ? 2 : -2), sy + 0.4, x + 1.5, sy + 0.8)
        ctx.strokeStyle = '#44ff8888'
        ctx.lineWidth = 0.3
        ctx.stroke()
      }
      break
    }

    case 'vortex': {
      // Spinning vortex field
      for (let r = 0; r < 3; r++) {
        const ang = tick * 0.12 + r * Math.PI * 2 / 3
        const rad = 4 + r * 2.5 + Math.sin(tick * 0.06) * 1.5
        ctx.beginPath()
        ctx.arc(x, y, rad, ang, ang + 1.2)
        ctx.strokeStyle = `rgba(68,136,255,${0.3 - r * 0.08})`
        ctx.lineWidth = 0.4
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(x, y, 1.2, 0, Math.PI * 2)
      ctx.fillStyle = '#4488ffaa'
      ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 6
      ctx.fill()
      ctx.shadowBlur = 0
      break
    }

    case 'motor': {
      // Spinning gear
      const mAng = (obj as any).angle ?? tick * 0.08
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, Math.PI * 2)
      ctx.strokeStyle = '#ffaa44aa'
      ctx.lineWidth = 0.4
      ctx.stroke()
      for (let t2 = 0; t2 < 4; t2++) {
        const a = mAng + t2 * Math.PI / 2
        ctx.beginPath()
        ctx.moveTo(x + Math.cos(a) * 1.8, y + Math.sin(a) * 1.8)
        ctx.lineTo(x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5)
        ctx.strokeStyle = '#ffaa4488'
        ctx.lineWidth = 0.6
        ctx.lineCap = 'round'
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(x, y, 0.8, 0, Math.PI * 2)
      ctx.fillStyle = '#ffaa44cc'
      ctx.fill()
      break
    }

    case 'laser': {
      // Focused red beam downward
      if (obj.life < (obj.maxLife > 0 ? obj.maxLife : 60)) {
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + (Math.random() - 0.5) * 0.5, y + 50)
        ctx.strokeStyle = 'rgba(255,30,30,0.7)'
        ctx.lineWidth = 0.6
        ctx.shadowColor = '#ff2222'; ctx.shadowBlur = 8
        ctx.stroke()
        ctx.shadowBlur = 0
        // Emitter dot
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fillStyle = '#ff4444cc'
        ctx.fill()
      }
      break
    }

    case 'spore': {
      // Cloud of floating spores
      const sp = Math.sin(tick * 0.08) * 0.5 + 1.5
      ctx.beginPath()
      ctx.arc(x, y, sp * 2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(170,136,255,0.12)'
      ctx.fill()
      for (let i = 0; i < 5; i++) {
        const sa = tick * 0.04 + i * 1.25
        const sr = sp + Math.sin(sa * 2) * 1.5
        ctx.beginPath()
        ctx.arc(x + Math.cos(sa) * sr, y + Math.sin(sa) * sr, 0.4, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(170,136,255,0.5)'
        ctx.fill()
      }
      break
    }

    case 'portal_in': {
      // Swirling purple portal
      for (let r = 0; r < 3; r++) {
        const ang = tick * 0.15 + r * 2.1
        ctx.beginPath()
        ctx.arc(x, y, 3 + r + Math.sin(ang) * 0.8, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255,68,255,${0.25 - r * 0.06})`
        ctx.lineWidth = 0.4
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = '#ff44ff88'
      ctx.shadowColor = '#ff44ff'; ctx.shadowBlur = 6
      ctx.fill()
      ctx.shadowBlur = 0
      break
    }

    case 'portal_out': {
      // Swirling cyan portal
      for (let r = 0; r < 3; r++) {
        const ang = -tick * 0.15 + r * 2.1
        ctx.beginPath()
        ctx.arc(x, y, 3 + r + Math.sin(ang) * 0.8, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(68,255,255,${0.25 - r * 0.06})`
        ctx.lineWidth = 0.4
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = '#44ffff88'
      ctx.shadowColor = '#44ffff'; ctx.shadowBlur = 6
      ctx.fill()
      ctx.shadowBlur = 0
      break
    }

    case 'ball': {
      // Bouncy sphere
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fillStyle = '#ff88aacc'
      ctx.shadowColor = '#ff88aa'; ctx.shadowBlur = 3
      ctx.fill()
      ctx.shadowBlur = 0
      // Highlight
      ctx.beginPath()
      ctx.arc(x - 0.5, y - 0.5, 0.6, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.fill()
      break
    }

    case 'box': {
      // Heavy block
      ctx.fillStyle = '#88aaffcc'
      ctx.fillRect(x - 2, y - 2, 4, 4)
      ctx.strokeStyle = '#88aaff44'
      ctx.lineWidth = 0.3
      ctx.strokeRect(x - 2, y - 2, 4, 4)
      break
    }

    case 'wheel': {
      // Rolling wheel with spokes
      const wAng = tick * 0.1
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, Math.PI * 2)
      ctx.strokeStyle = '#aabbccaa'
      ctx.lineWidth = 0.5
      ctx.stroke()
      for (let sp2 = 0; sp2 < 4; sp2++) {
        const a = wAng + sp2 * Math.PI / 2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(a) * 2.3, y + Math.sin(a) * 2.3)
        ctx.strokeStyle = '#aabbcc66'
        ctx.lineWidth = 0.3
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(x, y, 0.5, 0, Math.PI * 2)
      ctx.fillStyle = '#aabbcccc'
      ctx.fill()
      break
    }

    default: {
      // Generic circle
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fillStyle = color + '88'
      ctx.fill()
    }
  }

  ctx.restore()
}

export default PhysicsSandbox
