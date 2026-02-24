// ── Alchemy Lab — Grimoire (Book of the Alchemist) ───────────────────────────
import {
  GrimoireEntry, AlchemyMetrics, ElementMix, OpusPhase,
  AlchemyEvent, LapisState, GlyphSpec,
} from './alchemyTypes';
import { generateEntry } from './alchemistSecretary';

const MAX_ENTRIES = 140;
let _nextId = 1;

export function createGrimoire(): GrimoireEntry[] {
  return [];
}

export type GrimTrigger = 'phaseStart'|'phaseEnd'|'event'|'lapisForged'|'lapisCracked'|'periodic';

export function addEntry(
  grimoire:   GrimoireEntry[],
  trigger:    GrimTrigger,
  metrics:    AlchemyMetrics,
  elements:   ElementMix,
  phase:      OpusPhase | null,
  event:      AlchemyEvent | null,
  lapisState: LapisState,
): GrimoireEntry {
  const out = generateEntry(trigger, metrics, elements, phase, event, lapisState);
  const entry: GrimoireEntry = {
    id:          _nextId++,
    timestamp:   Date.now(),
    text:        out.text,
    causalLine:  out.causalLine,
    phase,
    event,
    tags:        out.tags,
    elements:    { ...elements },
    metrics:     { ...metrics },
    glyphSpec:   out.glyphSpec,
    bookmarked:  false,
  };
  grimoire.unshift(entry); // newest first
  if (grimoire.length > MAX_ENTRIES) grimoire.pop();
  return entry;
}

export function toggleBookmark(grimoire: GrimoireEntry[], id: number): void {
  const e = grimoire.find(e => e.id === id);
  if (e) e.bookmarked = !e.bookmarked;
}

export function filterEntries(
  grimoire:  GrimoireEntry[],
  tag?:      string,
  bookmarked?: boolean,
): GrimoireEntry[] {
  return grimoire.filter(e => {
    if (bookmarked && !e.bookmarked) return false;
    if (tag && !e.tags.includes(tag)) return false;
    return true;
  });
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}
