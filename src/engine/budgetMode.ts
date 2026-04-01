/**
 * Budget mode + LOD (Level of Detail) for scalability.
 * Adapts processing resolution to available frame budget so the system can
 * make claims about scaling (e.g. for papers).
 *
 * - targetFps: e.g. 60 → budgetMs = 1000/60
 * - When frame time exceeds budget, we recommend reducing maxStepsPerFrame (and optionally LOD)
 * - LOD level 0 = full detail, 1 = reduced steps, 2 = also subsample expensive ops (feed, field injection)
 */

const BUDGET_WINDOW = 15; // frames to smooth over

export interface BudgetState {
  targetFps: number;
  budgetMs: number;
  frameMsHistory: number[];
  frameMsIndex: number;
  /** Recommended cap for maxStepsPerFrame (next frame). */
  recommendedMaxSteps: number;
  /** 0 = full, 1 = reduce steps, 2 = also LOD (subsample feed/field). */
  lodLevel: number;
}

export function createBudgetState(targetFps: number = 60): BudgetState {
  return {
    targetFps,
    budgetMs: 1000 / targetFps,
    frameMsHistory: new Array(BUDGET_WINDOW).fill(0),
    frameMsIndex: 0,
    recommendedMaxSteps: 15,
    lodLevel: 0,
  };
}

/**
 * Call once per frame with the total frame time (sim + render, ms).
 * Updates recommendedMaxSteps and lodLevel for the next frame.
 */
export function updateBudget(
  state: BudgetState,
  frameMs: number,
  currentMaxSteps: number,
  agentCount: number
): void {
  state.frameMsHistory[state.frameMsIndex] = frameMs;
  state.frameMsIndex = (state.frameMsIndex + 1) % BUDGET_WINDOW;

  const avgFrameMs =
    state.frameMsHistory.reduce((a, b) => a + b, 0) / BUDGET_WINDOW;
  // Só reduz steps quando frame está claramente acima do budget (evita animação travada)
  const overBudget = avgFrameMs > state.budgetMs * 1.05;

  const MIN_STEPS_FOR_FLUIDITY = 2; // Nunca cair abaixo de 2 steps/frame para manter animação fluida

  if (overBudget) {
    // Reduce steps first, but never below MIN_STEPS_FOR_FLUIDITY
    if (state.recommendedMaxSteps > MIN_STEPS_FOR_FLUIDITY) {
      state.recommendedMaxSteps = Math.max(MIN_STEPS_FOR_FLUIDITY, state.recommendedMaxSteps - 1);
    }
    // If still over with few steps, suggest LOD (subsample feed) instead of reducing steps further
    if (state.recommendedMaxSteps <= 3 && agentCount > 400) {
      state.lodLevel = Math.min(2, state.lodLevel + 1);
    }
  } else {
    // Recover: allow more steps and lower LOD when we're under budget (recuperação mais rápida)
    if (state.recommendedMaxSteps < currentMaxSteps && avgFrameMs < state.budgetMs * 0.85) {
      state.recommendedMaxSteps = Math.min(currentMaxSteps, state.recommendedMaxSteps + 1);
    }
    if (avgFrameMs < state.budgetMs * 0.7) {
      state.lodLevel = Math.max(0, state.lodLevel - 1);
    }
  }
}

/**
 * Returns the effective maxStepsPerFrame to use this frame (cap by budget recommendation).
 */
export function getCappedMaxSteps(
  state: BudgetState,
  desiredMaxSteps: number
): number {
  return Math.min(desiredMaxSteps, state.recommendedMaxSteps);
}

/**
 * When LOD >= 1, caller can subsample expensive ops (e.g. energy feedStep, field injection sampleStep).
 * Returns multiplier: 1 = every agent, 2 = every 2nd, 4 = every 4th when lodLevel >= 2.
 */
export function getLODFeedSubsample(state: BudgetState): number {
  if (state.lodLevel <= 0) return 1;
  return state.lodLevel >= 2 ? 4 : 2;
}
