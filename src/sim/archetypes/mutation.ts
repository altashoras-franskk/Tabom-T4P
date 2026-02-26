// Mutation engine: entropy-driven genome drift + speciation trigger

export type MutationConfig = {
  baseRate: number; // e.g. 0.002 per second
  entropyGain: number; // additional rate from entropy
  step: number; // mutation magnitude
};

export function mutateGenes(
  state: any,
  fieldInfluence: (x: number, y: number) => any,
  dt: number,
  cfg: MutationConfig,
  rng: { next: () => number } = { next: () => Math.random() },
) {
  if (!state.geneA || !state.geneB || !state.geneC || !state.geneD) return;

  for (let i = 0; i < state.count; i += 2) {
    // sample step 2 for perf
    const x = state.x[i],
      y = state.y[i];
    const F = fieldInfluence(x, y);
    const rate = cfg.baseRate + cfg.entropyGain * (F.entropy ?? 0);
    if (rng.next() < rate * dt) {
      // mutate one gene (small)
      const k = (rng.next() * 4) | 0;
      const delta = (rng.next() - 0.5) * cfg.step * (0.5 + (F.entropy ?? 0));
      if (k === 0) state.geneA[i] = clamp01(state.geneA[i] + delta);
      if (k === 1) state.geneB[i] = clamp01(state.geneB[i] + delta);
      if (k === 2) state.geneC[i] = clamp01(state.geneC[i] + delta);
      if (k === 3) state.geneD[i] = clamp01(state.geneD[i] + delta);
    }
  }
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
