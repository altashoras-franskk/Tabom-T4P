// ─── Meta-Arte: Export ─────────────────────────────────────────────────────
import type { DNA } from './metaArtTypes';

export function exportPNG(canvas: HTMLCanvasElement, filename = 'metaarte'): void {
  const link = document.createElement('a');
  link.download = `${filename}-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function exportDNA(dna: DNA, filename = 'recipe'): void {
  const json = JSON.stringify(dna, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${filename}-${Date.now()}.json`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function importDNA(onLoad: (dna: DNA) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const dna = JSON.parse(ev.target?.result as string) as DNA;
        onLoad(dna);
      } catch {
        console.warn('[MetaArte] Failed to parse DNA JSON');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
