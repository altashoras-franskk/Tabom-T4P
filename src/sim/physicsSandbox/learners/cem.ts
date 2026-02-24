// ── Cross-Entropy Method (CEM) ────────────────────────────────────────────────
// Online gradient-free optimizer. Maintains a Gaussian distribution over params.
import { CEMState, GenStats } from '../types'

export interface CEMConfig {
  popSize:    number   // N candidates per generation
  eliteK:     number   // top-K selected
  stdInit:    number   // initial std dev
  stdMin:     number   // std floor
  stdDecay:   number   // momentum for std reduction
  meanMoment: number   // momentum for mean update
}

export const DEFAULT_CEM: CEMConfig = {
  popSize:   16,
  eliteK:    4,
  stdInit:   0.6,
  stdMin:    0.05,
  stdDecay:  0.9,
  meanMoment: 0.7,
}

export function createCEMState(nParams: number, cfg: CEMConfig = DEFAULT_CEM): CEMState {
  return {
    mean:       new Array(nParams).fill(0),
    std:        new Array(nParams).fill(cfg.stdInit),
    gen:        0,
    bestScore:  -Infinity,
    bestParams: new Array(nParams).fill(0),
    history:    [],
  }
}

/** Sample N candidates from the current distribution */
export function sampleCandidates(state: CEMState, n: number): number[][] {
  return Array.from({ length: n }, () =>
    state.mean.map((m, i) => m + state.std[i] * randn())
  )
}

/** Update distribution after evaluating candidates */
export function updateCEM(
  state: CEMState,
  candidates: number[][],
  scores: number[],
  cfg: CEMConfig,
): void {
  const n = candidates.length
  const k = Math.min(cfg.eliteK, n)

  // Sort by score descending
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => scores[b] - scores[a])
  const elites = order.slice(0, k).map(i => candidates[i])

  const bestIdx = order[0]
  const bestScore = scores[bestIdx]

  // Update best
  if (bestScore > state.bestScore) {
    state.bestScore  = bestScore
    state.bestParams = [...candidates[bestIdx]]
  }

  const nParams = state.mean.length
  const newMean = new Array(nParams).fill(0)
  const newStd  = new Array(nParams).fill(0)

  // Elite mean and variance
  for (const elite of elites) {
    for (let p = 0; p < nParams; p++) {
      newMean[p] += elite[p] / k
    }
  }
  for (const elite of elites) {
    for (let p = 0; p < nParams; p++) {
      const d = elite[p] - newMean[p]
      newStd[p] += d * d / k
    }
  }
  for (let p = 0; p < nParams; p++) {
    newStd[p] = Math.sqrt(newStd[p])
  }

  // Momentum update
  for (let p = 0; p < nParams; p++) {
    state.mean[p] = cfg.meanMoment * state.mean[p] + (1 - cfg.meanMoment) * newMean[p]
    state.std[p]  = Math.max(cfg.stdMin,
      cfg.stdDecay * state.std[p] + (1 - cfg.stdDecay) * newStd[p]
    )
  }

  const avgScore = scores.reduce((a, b) => a + b, 0) / n
  const bestEl = elites[0]
  const dx = 0  // caller fills this if needed

  const stat: GenStats = {
    gen:       state.gen,
    bestScore: state.bestScore,
    avgScore,
    bestDx:    0,
    falls:     0,
  }
  state.history.push(stat)
  if (state.history.length > 200) state.history.shift()
  state.gen++
}

export function fillGenStats(
  state: CEMState,
  scores: number[],
  dxArr: number[],
  fallsArr: number[],
): void {
  const last = state.history[state.history.length - 1]
  if (!last) return
  const order = Array.from({ length: scores.length }, (_, i) => i)
    .sort((a, b) => scores[b] - scores[a])
  last.bestDx = dxArr[order[0]] ?? 0
  last.falls  = fallsArr[order[0]] ?? 0
}

// ── Box-Muller normal sample ───────────────────────────────────────────────────
function randn(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
