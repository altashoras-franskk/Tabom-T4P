// ── Asimov Theater — Anomaly "The Mule" ──────────────────────────────────────
import { WorldState, MuleState, makeRNG } from './asimovTypes';
import { applyMuleEffect } from './asimovEngine';
import { wrapDelta, wrap } from './asimovWorld';

const MULE_SPAWN_PROB_PER_SCENE = 0.28;  // 28% chance per scene if enabled
const MULE_LIFETIME_SECONDS     = 45;
const MULE_RADIUS               = 0.28;
const MULE_DRIFT_SPEED          = 0.0008;

export function createMuleState(): MuleState {
  return {
    active: false,
    x: 0.5,
    y: 0.5,
    charisma: 0,
    age: 0,
    radius: MULE_RADIUS,
    factionId: 0,
  };
}

// ── Check if mule should spawn at scene end ───────────────────────────────
export function checkMuleSpawn(
  mule: MuleState,
  enabled: boolean,
  seed: number,
  sceneIndex: number,
): boolean {
  if (!enabled) return false;
  if (mule.active) return false;
  // Deterministic per-scene probability
  const rng = makeRNG(seed ^ (sceneIndex * 0x9e3779b9));
  return rng() < MULE_SPAWN_PROB_PER_SCENE;
}

// ── Spawn mule at a random position ──────────────────────────────────────
export function spawnMule(world: WorldState, seed: number): MuleState {
  const rng = makeRNG(seed ^ Date.now());
  return {
    active: true,
    x: 0.1 + rng() * 0.8,
    y: 0.1 + rng() * 0.8,
    charisma: 0.75 + rng() * 0.25,
    age: 0,
    radius: MULE_RADIUS,
    factionId: Math.floor(rng() * world.factionCount),
  };
}

// ── Update mule each frame ────────────────────────────────────────────────
export function updateMule(mule: MuleState, world: WorldState, dt: number): boolean {
  if (!mule.active) return false;

  mule.age += dt;

  // Drift slowly through world
  const angle = mule.age * 0.3;
  mule.x = wrap(mule.x + Math.cos(angle) * MULE_DRIFT_SPEED);
  mule.y = wrap(mule.y + Math.sin(angle * 1.3) * MULE_DRIFT_SPEED);

  // Apply field + agent effects
  applyMuleEffect(world, mule.x, mule.y, mule.radius);

  // Expire
  if (mule.age > MULE_LIFETIME_SECONDS) {
    mule.active = false;
    return false;
  }

  return true;
}

// ── Forecast confidence collapse ─────────────────────────────────────────
export function getMuleConfidencePenalty(mule: MuleState): number {
  if (!mule.active) return 0;
  // Confidence collapses proportionally to charisma and age fraction
  const ageFraction = Math.min(1, mule.age / MULE_LIFETIME_SECONDS);
  const peak = Math.sin(ageFraction * Math.PI); // 0 → 1 → 0
  return mule.charisma * peak * 0.65;
}
