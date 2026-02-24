// ── Rhizome Search — Map Cache (localStorage) ──────────────────────────────────

import type { KnowledgeMap, MapSize, OutputStyle, MapCacheEntry } from './types';

const STORAGE_KEY = 'rhizome_search_maps';
const MAX_CACHED_MAPS = 12;

// ── Generate Cache ID ─────────────────────────────────────────────────────────
function generateCacheId(query: string, size: MapSize, style: OutputStyle): string {
  return `${query.toLowerCase().trim()}|${size}|${style}`;
}

// ── Cache Map ─────────────────────────────────────────────────────────────────
export function cacheMap(map: KnowledgeMap): void {
  try {
    const id = generateCacheId(map.query, map.mapSize, map.outputStyle);
    const entry: MapCacheEntry = {
      id,
      map,
      timestamp: Date.now(),
    };

    // Get existing cache
    const cached = getAllCachedMaps();

    // Remove if already exists
    const filtered = cached.filter(e => e.id !== id);

    // Add new entry
    filtered.push(entry);

    // Keep only last MAX_CACHED_MAPS
    const limited = filtered.slice(-MAX_CACHED_MAPS);

    // Save
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch (err) {
    console.error('[Rhizome Cache] Failed to cache map:', err);
  }
}

// ── Get Cached Map ────────────────────────────────────────────────────────────
export function getCachedMap(
  query: string,
  size: MapSize,
  style: OutputStyle
): KnowledgeMap | null {
  try {
    const id = generateCacheId(query, size, style);
    const cached = getAllCachedMaps();
    const found = cached.find(e => e.id === id);
    return found ? found.map : null;
  } catch (err) {
    console.error('[Rhizome Cache] Failed to get cached map:', err);
    return null;
  }
}

// ── Get All Cached Maps ───────────────────────────────────────────────────────
export function getAllCachedMaps(): MapCacheEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error('[Rhizome Cache] Failed to load cache:', err);
    return [];
  }
}

// ── Delete Cached Map ─────────────────────────────────────────────────────────
export function deleteCachedMap(id: string): void {
  try {
    const cached = getAllCachedMaps();
    const filtered = cached.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('[Rhizome Cache] Failed to delete map:', err);
  }
}

// ── Rename Cached Map ─────────────────────────────────────────────────────────
export function renameCachedMap(id: string, newTitle: string): void {
  try {
    const cached = getAllCachedMaps();
    const entry = cached.find(e => e.id === id);
    if (entry) {
      entry.map.title = newTitle;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
    }
  } catch (err) {
    console.error('[Rhizome Cache] Failed to rename map:', err);
  }
}

// ── Export Map as JSON ────────────────────────────────────────────────────────
export function exportMapAsJSON(map: KnowledgeMap): void {
  try {
    const json = JSON.stringify(map, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rhizome-${map.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[Rhizome Cache] Failed to export map:', err);
  }
}
