// ── User-scoped storage (hub) — localStorage + optional backend sync ─────────
// Keys and get/set for presets and saves per lab; when userId is set, syncs to backend.

import { getStoredToken } from '../sim/rhizome/rhizomeBackend';
import { projectId } from '/utils/supabase/info';

const STORAGE_PREFIX = 't4p_hub';
const ANON_PREFIX = 't4p_anon';
const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-0834700c`;

export type HubDataKind = 'presets' | 'saves';

export interface HubPayload<T = unknown> {
  presets?: T[];
  saves?: T[];
}

/** Storage key for a lab's hub data (localStorage). When userId is null, use anon key. */
export function getUserScopedKey(labId: string, kind: HubDataKind, userId: string | null): string {
  if (userId) {
    return `${STORAGE_PREFIX}_user_${userId}_lab_${labId}_${kind}`;
  }
  return `${ANON_PREFIX}_lab_${labId}_${kind}`;
}

/** Check if a token is stored (user is logged in for API purposes). */
export function isLoggedIn(): boolean {
  return !!getStoredToken();
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Get hub data for a lab from localStorage. */
export function getHubDataLocal<T>(labId: string, kind: HubDataKind, userId: string | null): T[] {
  try {
    const key = getUserScopedKey(labId, kind, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Save hub data for a lab to localStorage. */
export function setHubDataLocal<T>(labId: string, kind: HubDataKind, data: T[], userId: string | null): void {
  try {
    const key = getUserScopedKey(labId, kind, userId);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[userStorage] setHubDataLocal failed:', e);
  }
}

/** Load hub data from backend (requires valid user token). Returns null if not logged in or request fails. */
export async function loadHubFromBackend<T>(
  labId: string,
  userId: string
): Promise<HubPayload<T> | null> {
  try {
    const res = await fetch(`${SERVER_URL}/user/hub?lab=${encodeURIComponent(labId)}`, {
      method: 'GET',
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      presets: Array.isArray(data.presets) ? data.presets : [],
      saves: Array.isArray(data.saves) ? data.saves : [],
    };
  } catch (err) {
    console.warn('[userStorage] loadHubFromBackend failed:', err);
    return null;
  }
}

/** Save hub data to backend (requires valid user token). Fire-and-forget. */
export async function saveHubToBackend<T>(
  labId: string,
  payload: HubPayload<T>,
  userId: string
): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/user/hub`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ lab: labId, ...payload }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[userStorage] saveHubToBackend failed:', err);
    return false;
  }
}

/** Get hub data: from backend when userId set, then merge/fallback to local. */
export async function getHubData<T>(
  labId: string,
  userId: string | null
): Promise<HubPayload<T>> {
  const localPresets = getHubDataLocal<T>(labId, 'presets', userId);
  const localSaves = getHubDataLocal<T>(labId, 'saves', userId);

  if (!userId) {
    return { presets: localPresets, saves: localSaves };
  }

  const remote = await loadHubFromBackend<T>(labId, userId);
  if (remote) {
    // Prefer remote when we have it; merge with local (remote wins for same id if we add ids later)
    const presets = (remote.presets?.length ?? 0) > 0 ? remote.presets! : localPresets;
    const saves = (remote.saves?.length ?? 0) > 0 ? remote.saves! : localSaves;
    return { presets, saves };
  }

  return { presets: localPresets, saves: localSaves };
}

/** Persist hub data: write to local and, when userId set, sync to backend. */
export function setHubData<T>(
  labId: string,
  kind: HubDataKind,
  data: T[],
  userId: string | null
): void {
  setHubDataLocal(labId, kind, data, userId);
  if (userId) {
    const payload: HubPayload<T> = kind === 'presets' ? { presets: data } : { saves: data };
    saveHubToBackend(labId, payload, userId).catch(() => {});
  }
}

/** Add one preset/save and persist. */
export function addHubEntry<T extends { id?: string }>(
  labId: string,
  kind: HubDataKind,
  entry: T,
  userId: string | null
): void {
  const key = getUserScopedKey(labId, kind, userId);
  const existing = getHubDataLocal<T>(labId, kind, userId);
  const withId = { ...entry, id: entry.id ?? `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}` };
  const next = [...existing, withId];
  setHubDataLocal(labId, kind, next, userId);
  if (userId) {
    const payload: HubPayload<T> = kind === 'presets' ? { presets: next } : { saves: next };
    saveHubToBackend(labId, payload, userId).catch(() => {});
  }
}

/** Remove one entry by id and persist. */
export function removeHubEntry<T extends { id?: string }>(
  labId: string,
  kind: HubDataKind,
  entryId: string,
  userId: string | null
): void {
  const existing = getHubDataLocal<T>(labId, kind, userId);
  const next = existing.filter((e: T) => (e as T & { id: string }).id !== entryId);
  setHubData(labId, kind, next, userId);
}

// ── OpenAI API key (local persistence only, no backend) ───────────────────────
const OPENAI_API_KEY_STORAGE_KEY = 't4p_openai_api_key';

export function loadOpenAIApiKey(): string {
  try {
    if (typeof window === 'undefined') return '';
    const v = localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY);
    return typeof v === 'string' ? v : '';
  } catch {
    return '';
  }
}

export function saveOpenAIApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, key);
    else localStorage.removeItem(OPENAI_API_KEY_STORAGE_KEY);
  } catch (e) {
    console.warn('[userStorage] saveOpenAIApiKey failed:', e);
  }
}

export function clearOpenAIApiKey(): void {
  try {
    localStorage.removeItem(OPENAI_API_KEY_STORAGE_KEY);
  } catch {}
}
