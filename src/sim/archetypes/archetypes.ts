// Archetype registry: NEW species/archetypes emerging from gene drift
export type Archetype = {
  id: number;
  name: string;
  sigil: string;
  colorHint?: string;
  genes: { a: number; b: number; c: number; d: number }; // centroid
  bornAt: number; // sim time
  notes: string[]; // interpretive tags
};

export type ArchetypeRegistry = {
  nextId: number;
  list: Archetype[];
};

export function createRegistry(): ArchetypeRegistry {
  return { nextId: 100, list: [] }; // reserve <100 for "base types"
}

export function maybeCreateArchetype(
  reg: ArchetypeRegistry,
  t: number,
  centroid: { a: number; b: number; c: number; d: number },
  signal: { volatility: number; scarcity: number; cohesion: number }
): Archetype | null {
  // simple novelty gate: only create if system is "alive enough"
  // PATCH 04.6.1: Reduzido para 0.05 para facilitar emergência inicial
  if (signal.volatility < 0.05) return null;

  // prevent duplicates: if close to existing centroid, do nothing
  for (const A of reg.list) {
    const d = dist4(A.genes, centroid);
    if (d < 0.18) return null;
  }

  const id = reg.nextId++;
  const sigil = pickSigil(id);
  const name = genName(id, centroid, signal);

  const notes = [];
  if (signal.scarcity > 0.6) notes.push('🏜️ Nascido da Escassez');
  if (signal.cohesion > 0.6) notes.push('🔗 Altamente Coesivo');
  if (signal.volatility > 0.6) notes.push('⚡ Filho da Tempestade');

  const A: Archetype = { id, name, sigil, genes: centroid, bornAt: t, notes };
  reg.list.unshift(A);
  if (reg.list.length > 60) reg.list.pop();
  return A;
}

function dist4(a: any, b: any) {
  const dx = a.a - b.a,
    dy = a.b - b.b,
    dz = a.c - b.c,
    dw = a.d - b.d;
  return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
}

function pickSigil(seed: number) {
  const S = [
    '✶',
    '✹',
    '⟡',
    '⟁',
    '⦿',
    '⧈',
    '⨳',
    '⨯',
    '⟢',
    '⟣',
    '⟠',
    '⟟',
    '⌁',
    '⌬',
    '⍟',
    '⚘',
    '⚚',
    '⛧',
    '☍',
  ];
  return S[Math.abs(seed) % S.length];
}

function genName(seed: number, g: any, s: any) {
  const A = [
    'Aster',
    'Kera',
    'Mori',
    'Nexa',
    'Vira',
    'Soma',
    'Luma',
    'Rho',
    'Ech',
    'Tess',
  ];
  const B = [
    'espiral',
    'ruptura',
    'florescer',
    'escriba',
    'deriva',
    'forja',
    'véu',
    'pulso',
    'vínculo',
    'sussurro',
  ];
  return `${A[Math.abs(seed) % A.length]} ${B[Math.abs((seed * 7) | 0) % B.length]}`;
}

// Sample genes centroid from a subset of agents
export function sampleGenesCentroid(
  state: any,
  sampleCount: number = 200
): { centroid: { a: number; b: number; c: number; d: number }; spread: number } | null {
  if (state.count < 10) return null;

  const samples = Math.min(sampleCount, state.count);
  let sumA = 0,
    sumB = 0,
    sumC = 0,
    sumD = 0;

  // Random sampling for performance
  for (let s = 0; s < samples; s++) {
    const i = (Math.random() * state.count) | 0;
    if (state.geneA && state.geneB && state.geneC && state.geneD) {
      sumA += state.geneA[i];
      sumB += state.geneB[i];
      sumC += state.geneC[i];
      sumD += state.geneD[i];
    }
  }

  const centroid = {
    a: sumA / samples,
    b: sumB / samples,
    c: sumC / samples,
    d: sumD / samples,
  };

  // Calculate spread (variance)
  let spreadSum = 0;
  for (let s = 0; s < samples; s++) {
    const i = (Math.random() * state.count) | 0;
    if (state.geneA && state.geneB && state.geneC && state.geneD) {
      const da = state.geneA[i] - centroid.a;
      const db = state.geneB[i] - centroid.b;
      const dc = state.geneC[i] - centroid.c;
      const dd = state.geneD[i] - centroid.d;
      spreadSum += da * da + db * db + dc * dc + dd * dd;
    }
  }

  const spread = Math.sqrt(spreadSum / samples);

  return { centroid, spread };
}
