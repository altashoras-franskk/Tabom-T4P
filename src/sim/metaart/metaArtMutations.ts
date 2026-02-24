// ─── Meta-Arte: Mutations ─────────────────────────────────────────────────
import type { DNA, DNAGenes, VitrineCard } from './metaArtTypes';
import { newDNAId, lerpGenes, randomizePalette } from './metaArtDNA';

function seededRng(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function clampGene(v: number): number { return Math.max(0, Math.min(1, v)); }

export function mutateDNA(base: DNA, budget = 0.25, count = 8): DNA[] {
  const results: DNA[] = [];
  const rng = seededRng(base.createdAt + count);
  for (let i = 0; i < count; i++) {
    const genes = { ...base.genes };
    const totalBudget = budget * (0.5 + rng() * 1.2);
    const keys = Object.keys(genes) as (keyof DNAGenes)[];
    // pick 3-5 genes to mutate (exclude 'linear', 'agentShape' which are special flags)
    const numMutate = 3 + Math.floor(rng() * 3);
    const toMutate = [...keys].filter(k => k !== 'linear' && k !== 'agentShape').sort(() => rng() - 0.5).slice(0, numMutate);
    let remaining = totalBudget;
    for (const k of toMutate) {
      const cur = genes[k] ?? 0;
      const delta = (rng() - 0.5) * 2 * Math.min(remaining, 0.35);
      genes[k] = clampGene(cur + delta);
      remaining -= Math.abs(delta);
      if (remaining <= 0) break;
    }
    const palette = rng() > 0.6 ? randomizePalette(base.palette, rng) : base.palette;
    results.push({
      ...base,
      id: newDNAId(),
      genes,
      palette,
      createdAt: Date.now() + i,
    });
  }
  return results;
}

export function crossbreedDNA(a: DNA, b: DNA, bias = 0.5): DNA {
  const rng = seededRng(a.createdAt ^ b.createdAt);
  const genes = lerpGenes(a.genes, b.genes, bias + (rng() - 0.5) * 0.2);
  // Interleave palettes
  const palette: string[] = [];
  const longer = a.palette.length >= b.palette.length ? a.palette : b.palette;
  const shorter = a.palette.length < b.palette.length ? a.palette : b.palette;
  for (let i = 0; i < longer.length; i++) {
    palette.push(rng() > 0.5 ? longer[i] : (shorter[i % shorter.length] ?? longer[i]));
  }
  return {
    id: newDNAId(),
    genes,
    intention: rng() > 0.5 ? a.intention : b.intention,
    palette: palette.slice(0, 6),
    background: rng() > 0.5 ? a.background : b.background,
    quantaCount: rng() > 0.5 ? a.quantaCount : b.quantaCount,
    createdAt: Date.now(),
    name: `cross(${(a.name ?? 'A').slice(0, 8)},${(b.name ?? 'B').slice(0, 8)})`,
  };
}

// ── Procedural thumbnail (gradient preview, no simulation needed) ──────────
export function generateThumbnail(dna: DNA, size = 100): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const { genes, palette, background } = dna;

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);

  const layers = Math.max(2, Math.floor(genes.layering * 6 + 2));

  for (let li = 0; li < layers; li++) {
    const color = palette[li % palette.length];
    const opacity = 0.12 + genes.contrast * 0.45;
    ctx.globalAlpha = opacity;

    if (genes.structure > 0.7) {
      // Grid blocks
      const cols = Math.round(3 + genes.structure * 4);
      const bw = size / cols;
      const bh = size / cols;
      for (let r = 0; r < cols; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r + c + li) % 3 !== 0) continue;
          ctx.fillStyle = palette[(r + c + li) % palette.length];
          ctx.fillRect(c * bw, r * bh, bw * (1 - genes.fragmentation * 0.4), bh);
        }
      }
    } else if (genes.symmetry > 0.7) {
      // Radial
      const cx = size / 2, cy = size / 2;
      const r = size * (0.15 + li * 0.12);
      const grad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    } else {
      // Organic blobs
      const cx = (genes.fragmentation < 0.5 ? 0.5 : (li + 1) / (layers + 1)) * size;
      const cy = (0.3 + genes.flow * 0.4) * size;
      const r = size * (0.18 + genes.coherence * 0.3);
      const grad = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
      grad.addColorStop(0, color + 'ff');
      grad.addColorStop(1, color + '00');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
  }

  // Glyph overlay
  if (genes.glyphness > 0.4) {
    ctx.globalAlpha = genes.glyphness * 0.7;
    ctx.fillStyle = palette[0];
    ctx.font = `${Math.round(size * 0.28)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyphs = ['◎', '⊕', '∑', '∇', '⊛', '◈'];
    ctx.fillText(glyphs[Math.floor(genes.glyphness * 5) % glyphs.length], size / 2, size / 2);
  }

  // Noise grain
  if (genes.entropy > 0.4) {
    const idata = ctx.getImageData(0, 0, size, size);
    const d = idata.data;
    const scale = genes.entropy * 25;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * scale;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    ctx.putImageData(idata, 0, 0);
  }

  ctx.globalAlpha = 1;
  return canvas.toDataURL('image/jpeg', 0.8);
}

export function buildVitrine(baseDNA: DNA, seed: number): VitrineCard[] {
  const variants = mutateDNA(baseDNA, 0.3, 8);
  return variants.map((dna, i) => ({
    id: `vitrine-${seed}-${i}`,
    dna,
    thumbnail: generateThumbnail(dna, 96),
    pinned: false,
    favorite: false,
    seed: seed + i * 7919,
    label: `V${i + 1}`,
  }));
}