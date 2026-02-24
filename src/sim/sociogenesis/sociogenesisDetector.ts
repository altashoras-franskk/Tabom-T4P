// Sociogenesis Detector - Emergent institution spawning
// Analyzes particle field to spawn totems/taboos/rituals organically

import type { MicroState } from '../micro/microState';
import type {
  SociogenesisState,
  Totem,
  Taboo,
  Ritual,
  TotemKind,
  TabooKind,
  RitualKind,
} from './sociogenesisTypes';
import { genId } from './sociogenesisTypes';
import { generateTotemName, narrateEvent } from './sociogenesisNarrator';

const DETECTION_CADENCE_SEC = 20; // check every 20 seconds for slower, more deliberate emergence
const MIN_CLUSTER_SIZE = 8; // minimum particles to spawn totem (raised for quality)
const GRID_RESOLUTION = 10; // spatial grid for density analysis (was 12, lower = larger cells)
const VELOCITY_THRESHOLD_ORACLE = 0.07; // high velocity = chaos
const VELOCITY_THRESHOLD_ARCHIVE = 0.02; // low velocity = memory
const SEPARATION_THRESHOLD = 0.12; // distance for type separation detection
const ORBIT_DETECTION_SAMPLES = 5; // frames to detect circular motion

interface GridCell {
  count: number;
  typeCount: Map<number, number>;
  avgVx: number;
  avgVy: number;
  sumVel: number;
  centroidX: number;
  centroidY: number;
}

interface TemporalSample {
  time: number;
  centroidX: number;
  centroidY: number;
  angularMomentum: number;
}

/**
 * Main detection tick - analyzes field and spawns institutions
 */
export function detectEmergentInstitutions(
  state: SociogenesisState,
  micro: MicroState,
  elapsedSec: number,
): void {
  if (!state.config.enabled) return;

  // Build spatial grid
  const grid = buildSpatialGrid(micro);

  // Detect totems from spatial patterns
  detectTotems(state, micro, grid, elapsedSec);

  // Detect taboos from avoidance/separation
  detectTaboos(state, micro, grid, elapsedSec);

  // Detect rituals from temporal patterns
  detectRituals(state, micro, elapsedSec);
}

function buildSpatialGrid(micro: MicroState): Map<string, GridCell> {
  const grid = new Map<string, GridCell>();

  for (let i = 0; i < micro.count; i++) {
    const x = micro.x[i];
    const y = micro.y[i];
    const vx = micro.vx[i];
    const vy = micro.vy[i];
    const type = micro.type[i];

    const gx = Math.floor(x * GRID_RESOLUTION);
    const gy = Math.floor(y * GRID_RESOLUTION);
    const key = `${gx},${gy}`;

    let cell = grid.get(key);
    if (!cell) {
      cell = {
        count: 0,
        typeCount: new Map(),
        avgVx: 0,
        avgVy: 0,
        sumVel: 0,
        centroidX: 0,
        centroidY: 0,
      };
      grid.set(key, cell);
    }

    cell.count++;
    cell.typeCount.set(type, (cell.typeCount.get(type) || 0) + 1);
    cell.avgVx += vx;
    cell.avgVy += vy;
    cell.sumVel += Math.sqrt(vx * vx + vy * vy);
    cell.centroidX += x;
    cell.centroidY += y;
  }

  // Normalize averages
  for (const cell of grid.values()) {
    if (cell.count > 0) {
      cell.avgVx /= cell.count;
      cell.avgVy /= cell.count;
      cell.sumVel /= cell.count;
      cell.centroidX /= cell.count;
      cell.centroidY /= cell.count;
    }
  }

  return grid;
}

function detectTotems(
  state: SociogenesisState,
  micro: MicroState,
  grid: Map<string, GridCell>,
  elapsedSec: number,
): void {
  if (state.totems.length >= state.config.maxTotems) return;

  for (const [key, cell] of grid.entries()) {
    if (cell.count < MIN_CLUSTER_SIZE) continue;

    const cx = cell.centroidX;
    const cy = cell.centroidY;

    // Check if totem already exists nearby
    const hasNearby = state.totems.some(t => {
      const d2 = (t.pos.x - cx) ** 2 + (t.pos.y - cy) ** 2;
      return d2 < 0.08; // within 0.28 radius
    });
    if (hasNearby) continue;

    // Determine totem kind from local conditions (priority order)
    let kind: TotemKind | null = null;

    // ORACLE: high velocity chaos (detect first - most rare)
    if (cell.sumVel > VELOCITY_THRESHOLD_ORACLE && cell.count > MIN_CLUSTER_SIZE * 0.5) {
      kind = 'ORACLE';
    }
    // ARCHIVE: low velocity stagnation (memory)
    else if (cell.sumVel < VELOCITY_THRESHOLD_ARCHIVE && cell.count > MIN_CLUSTER_SIZE * 0.7) {
      kind = 'ARCHIVE';
    }
    // BOND: high density, single dominant type, moderate-low velocity
    else {
      const dominantType = getDominantType(cell.typeCount);
      const typePurity = dominantType ? (cell.typeCount.get(dominantType) || 0) / cell.count : 0;
      if (typePurity > 0.6 && cell.sumVel < 0.05 && cell.count > MIN_CLUSTER_SIZE) {
        kind = 'BOND';
      }
    }

    // RIFT: high type diversity (boundary zone) + moderate velocity
    if (!kind) {
      const diversity = cell.typeCount.size / Math.min(micro.count / 8, 5); // normalized
      if (diversity > 0.5 && cell.sumVel > 0.025 && cell.sumVel < 0.08 && cell.count > MIN_CLUSTER_SIZE * 0.6) {
        kind = 'RIFT';
      }
    }
    // Spawn totem if detected (with stricter limits to prevent spam)
    if (kind && state.totems.length < state.config.maxTotems) {
      // Additional check: don't spawn too many at once
      const recentEmergent = state.totems.filter(t => t.emergent && (elapsedSec - t.bornAt) < 30).length;
      if (recentEmergent >= 3) continue; // max 3 new totems per 30 seconds
      
      const name = generateTotemName(kind);
      const totem: Totem = {
        id: genId(state, 'totem'),
        kind,
        pos: { x: cx, y: cy },
        radius: 0.15,
        strength: 0.8,
        pinned: false, // emergent totems are not pinned
        bornAt: elapsedSec,
        name,
        emergent: true, // mark as emergent
        affectedCount: 0,
      };
      state.totems.push(totem);

      const entry = narrateEvent('TOTEM_EMERGED', { kind, name }, elapsedSec);
      state.chronicle.unshift(entry);

      // Debug logging
      console.log(`✨ TOTEM EMERGED: ${kind} "${name}" at (${cx.toFixed(2)}, ${cy.toFixed(2)})`);
    }
  }
}

function detectTaboos(
  state: SociogenesisState,
  micro: MicroState,
  grid: Map<string, GridCell>,
  elapsedSec: number,
): void {
  // Limit taboo spawning
  if (state.taboos.length >= 6) return;

  for (const [key, cell] of grid.entries()) {
    const cx = cell.centroidX;
    const cy = cell.centroidY;

    // Check if taboo already exists nearby
    const hasNearby = state.taboos.some(t => {
      const d2 = (t.pos.x - cx) ** 2 + (t.pos.y - cy) ** 2;
      return d2 < 0.06;
    });
    if (hasNearby) continue;

    // NO_ENTER: detect empty zones (voids that particles avoid naturally)
    if (cell.count === 0) {
      // Check if surrounded by dense cells (implies avoidance)
      const neighbors = getNeighborCells(key, grid);
      const avgNeighborDensity = neighbors.reduce((sum, n) => sum + n.count, 0) / (neighbors.length || 1);
      if (avgNeighborDensity > MIN_CLUSTER_SIZE * 0.6) {
        const [gx, gy] = key.split(',').map(Number);
        const taboo: Taboo = {
          id: genId(state, 'taboo'),
          kind: 'NO_ENTER',
          pos: { x: (gx + 0.5) / GRID_RESOLUTION, y: (gy + 0.5) / GRID_RESOLUTION },
          radius: 0.1,
          intensity: 0.7,
          bornAt: elapsedSec,
          emergent: true,
          affectedCount: 0,
        };
        state.taboos.push(taboo);

        const entry = narrateEvent('TABOO_EMERGED', { kind: 'NO_ENTER' }, elapsedSec);
        state.chronicle.unshift(entry);

        console.log(`⚡ TABOO EMERGED: NO_ENTER at (${taboo.pos.x.toFixed(2)}, ${taboo.pos.y.toFixed(2)})`);
        return; // only spawn one per cycle
      }
    }

    // NO_MIX: detect zones with strong type segregation
    if (cell.count > MIN_CLUSTER_SIZE * 0.4 && cell.typeCount.size === 1) {
      const dominantType = Array.from(cell.typeCount.keys())[0];
      
      // Check if there's another type nearby (boundary)
      const neighbors = getNeighborCells(key, grid);
      const hasMixedNeighbor = neighbors.some(n => {
        const otherTypes = Array.from(n.typeCount.keys()).filter(t => t !== dominantType);
        return otherTypes.length > 0 && n.typeCount.get(otherTypes[0])! > 2;
      });

      if (hasMixedNeighbor && state.taboos.length < 6) {
        const taboo: Taboo = {
          id: genId(state, 'taboo'),
          kind: 'NO_MIX',
          pos: { x: cx, y: cy },
          radius: 0.12,
          intensity: 0.6,
          targetType: dominantType,
          bornAt: elapsedSec,
          emergent: true,
          affectedCount: 0,
        };
        state.taboos.push(taboo);

        const entry = narrateEvent('TABOO_EMERGED', { kind: 'NO_MIX' }, elapsedSec);
        state.chronicle.unshift(entry);

        console.log(`⚡ TABOO EMERGED: NO_MIX at (${cx.toFixed(2)}, ${cy.toFixed(2)}) for type ${dominantType}`);
        return;
      }
    }
  }
}

function detectRituals(
  state: SociogenesisState,
  micro: MicroState,
  elapsedSec: number,
): void {
  if (state.rituals.length >= state.config.maxRituals) return;
  if (state.totems.length === 0) return;

  // For each totem without a ritual, analyze local motion to infer ritual kind
  for (const totem of state.totems) {
    // Skip if ritual already exists for this totem
    if (state.rituals.some(r => r.totemId === totem.id)) continue;
    if (state.rituals.length >= state.config.maxRituals) return;

    // Count nearby particles and analyze their motion
    let nearbyCount = 0;
    let radialSum = 0; // positive = toward totem
    let tangentialSum = 0; // magnitude of tangential component
    let avgSpeed = 0;

    const r2 = (totem.radius * 2.5) ** 2;

    for (let i = 0; i < micro.count; i++) {
      const dx = micro.x[i] - totem.pos.x;
      const dy = micro.y[i] - totem.pos.y;
      const d2 = dx * dx + dy * dy;

      if (d2 < r2 && d2 > 1e-6) {
        nearbyCount++;
        const d = Math.sqrt(d2);

        // Radial component (velocity toward/away from totem)
        const nx = dx / d;
        const ny = dy / d;
        const radial = micro.vx[i] * nx + micro.vy[i] * ny;
        radialSum += radial;

        // Tangential component (perpendicular motion)
        const tx = -ny;
        const ty = nx;
        const tangential = Math.abs(micro.vx[i] * tx + micro.vy[i] * ty);
        tangentialSum += tangential;

        avgSpeed += Math.sqrt(micro.vx[i] ** 2 + micro.vy[i] ** 2);
      }
    }

    if (nearbyCount < 4) continue; // need minimum activity

    radialSum /= nearbyCount;
    tangentialSum /= nearbyCount;
    avgSpeed /= nearbyCount;

    // Infer ritual kind (priority order)
    let kind: RitualKind | null = null;

    // PROCESSION: strong tangential motion (orbit) - most specific
    if (tangentialSum > 0.02 && Math.abs(radialSum) < 0.02) {
      kind = 'PROCESSION';
    }
    // GATHER: strong inward radial motion
    else if (radialSum < -0.008 && tangentialSum < 0.025) {
      kind = 'GATHER';
    }
    // OFFERING: low average speed (particles slow near totem)
    else if (avgSpeed < 0.03 && nearbyCount > 5) {
      kind = 'OFFERING';
    }

    if (kind) {
      const ritual: Ritual = {
        id: genId(state, 'ritual'),
        kind,
        totemId: totem.id,
        periodSec: 8,
        dutyCycle: 0.4,
        intensity: 0.7,
        bornAt: elapsedSec,
        emergent: true,
        affectedCount: 0,
      };
      state.rituals.push(ritual);

      const entry = narrateEvent('RITUAL_EMERGED', { kind, totemName: totem.name }, elapsedSec);
      state.chronicle.unshift(entry);

      console.log(`✴️ RITUAL EMERGED: ${kind} at totem "${totem.name}"`);
    }
  }
}

function getDominantType(typeCount: Map<number, number>): number | null {
  let maxCount = 0;
  let dominantType: number | null = null;
  for (const [type, count] of typeCount.entries()) {
    if (count > maxCount) {
      maxCount = count;
      dominantType = type;
    }
  }
  return dominantType;
}

function getNeighborCells(key: string, grid: Map<string, GridCell>): GridCell[] {
  const [gx, gy] = key.split(',').map(Number);
  const neighbors: GridCell[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const neighborKey = `${gx + dx},${gy + dy}`;
      const cell = grid.get(neighborKey);
      if (cell) neighbors.push(cell);
    }
  }
  return neighbors;
}

/**
 * Check if it's time to run detection
 */
export function shouldRunDetection(
  lastDetectionTime: number,
  elapsedSec: number,
): boolean {
  return elapsedSec - lastDetectionTime >= DETECTION_CADENCE_SEC;
}
