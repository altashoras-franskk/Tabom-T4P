// ─── Meta-Arte: Archive & Grimoire ─────────────────────────────────────────
import type { ArchiveEntry, GrimoireEntry, GestureRecord, DNA } from './metaArtTypes';

let _entryId = 1;
function newEntryId(): string { return `arch-${Date.now()}-${_entryId++}`; }

export function captureSnapshot(
  canvas: HTMLCanvasElement,
  dna: DNA,
  seed: number,
  gestures: GestureRecord[]
): ArchiveEntry {
  const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
  return {
    id: newEntryId(),
    timestamp: Date.now(),
    dna: { ...dna, genes: { ...dna.genes } },
    seed,
    thumbnail,
    gestures: gestures.slice(-10),
    pinned: false,
    favorite: false,
  };
}

export function addGrimoireEntry(
  grimoire: GrimoireEntry[],
  text: string,
  type: GrimoireEntry['type']
): GrimoireEntry[] {
  const entry: GrimoireEntry = {
    id: `grim-${Date.now()}`,
    timestamp: Date.now(),
    text,
    type,
  };
  // Cap at 80 entries
  return [entry, ...grimoire].slice(0, 80);
}

export function formatGrimoireTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}
