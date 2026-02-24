// ── Rhizome Backend — Multi-device Persistence via Supabase ─────────────────
import type { RhizomeFolder, SavedRhizome } from './rhizomeFolders';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-0834700c`;

// Generate or load device ID for this browser
function getDeviceId(): string {
  const KEY = 'rhizome_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

// Get stored access token (set by auth)
export function getStoredToken(): string | null {
  return localStorage.getItem('rhizome_access_token');
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem('rhizome_access_token', token);
  } else {
    localStorage.removeItem('rhizome_access_token');
  }
}

// Build auth headers — use user token if available, else anon key
function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return {
    'Authorization': `Bearer ${token || publicAnonKey}`,
    'Content-Type': 'application/json',
  };
}

// ── Folders ───────────────────────────────────────────────────────────────────

export async function loadFoldersFromBackend(): Promise<RhizomeFolder[]> {
  try {
    const deviceId = getDeviceId();
    const response = await fetch(`${SERVER_URL}/rhizome/folders/${deviceId}`, {
      method: 'GET',
      headers: authHeaders(),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.folders || [];
  } catch (err) {
    console.error('Error loading folders from backend:', err);
    return [];
  }
}

export async function saveFoldersToBackend(folders: RhizomeFolder[]): Promise<boolean> {
  try {
    const deviceId = getDeviceId();
    const response = await fetch(`${SERVER_URL}/rhizome/folders/${deviceId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ folders }),
    });
    return response.ok;
  } catch (err) {
    console.error('Error saving folders to backend:', err);
    return false;
  }
}

// ── Saved Rhizomes ────────────────────────────────────────────────────────────

export async function loadRhizomesFromBackend(): Promise<SavedRhizome[]> {
  try {
    const deviceId = getDeviceId();
    const response = await fetch(`${SERVER_URL}/rhizome/saved/${deviceId}`, {
      method: 'GET',
      headers: authHeaders(),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.rhizomes || [];
  } catch (err) {
    console.error('Error loading rhizomes from backend:', err);
    return [];
  }
}

export async function saveRhizomesToBackend(rhizomes: SavedRhizome[]): Promise<boolean> {
  try {
    const deviceId = getDeviceId();
    const response = await fetch(`${SERVER_URL}/rhizome/saved/${deviceId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ rhizomes }),
    });
    return response.ok;
  } catch (err) {
    console.error('Error saving rhizomes to backend:', err);
    return false;
  }
}