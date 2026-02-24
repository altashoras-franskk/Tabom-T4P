// ─────────────────────────────────────────────────────────────────────────────
// Grimoire Store — localStorage persistence for the Language Lab lexicon
// ─────────────────────────────────────────────────────────────────────────────
import type { LexiconEntry, LanguageSession } from '../sim/language/types';

const KEY_LEXICON  = 'heptapod_lexicon_v1';
const KEY_SESSIONS = 'heptapod_sessions_v1';

// ── Lexicon ────────────────────────────────────────────────────────────────────
export function saveLexicon(entries: LexiconEntry[]): void {
  try {
    localStorage.setItem(KEY_LEXICON, JSON.stringify(entries));
  } catch (_) { /* quota exceeded – silently fail */ }
}

export function loadLexicon(): LexiconEntry[] {
  try {
    const raw = localStorage.getItem(KEY_LEXICON);
    if (!raw) return [];
    return JSON.parse(raw) as LexiconEntry[];
  } catch {
    return [];
  }
}

export function clearLexicon(): void {
  localStorage.removeItem(KEY_LEXICON);
}

// ── Sessions ───────────────────────────────────────────────────────────────────
export function saveSessions(sessions: LanguageSession[]): void {
  try {
    localStorage.setItem(KEY_SESSIONS, JSON.stringify(sessions.slice(-20)));
  } catch (_) {}
}

export function loadSessions(): LanguageSession[] {
  try {
    const raw = localStorage.getItem(KEY_SESSIONS);
    return raw ? (JSON.parse(raw) as LanguageSession[]) : [];
  } catch { return []; }
}

// ── Export / Import ────────────────────────────────────────────────────────────
export interface GrimoireExport {
  version: number;
  exportedAt: string;
  lexicon: LexiconEntry[];
  sessions: LanguageSession[];
}

export function exportGrimoire(lexicon: LexiconEntry[], sessions: LanguageSession[]): void {
  const payload: GrimoireExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    lexicon,
    sessions,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `heptapod_grimoire_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importGrimoire(
  file: File,
  onSuccess: (data: GrimoireExport) => void,
  onError: (msg: string) => void,
): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string) as GrimoireExport;
      if (!Array.isArray(data.lexicon)) throw new Error('Invalid format');
      onSuccess(data);
    } catch (err) {
      onError((err as Error).message);
    }
  };
  reader.readAsText(file);
}

// ── Upsert single entry ────────────────────────────────────────────────────────
export function upsertEntry(entries: LexiconEntry[], entry: LexiconEntry): LexiconEntry[] {
  const idx = entries.findIndex(e => e.glyphId === entry.glyphId);
  if (idx >= 0) {
    const next = [...entries];
    next[idx] = { ...next[idx], ...entry, lastUpdated: Date.now() };
    return next;
  }
  return [...entries, { ...entry, lastUpdated: Date.now() }];
}
