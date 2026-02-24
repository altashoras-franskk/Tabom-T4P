// ── Rhizome Folders — Local + Backend Persistence System (are.na-style) ──────
// Manages saved rhizomes, cards, and links in folder collections
// Now with multi-device sync via Supabase

export interface SavedCard {
  id:          string;
  label:       string;
  description?: string;
  url?:        string;
  imageUrl?:   string;
  category?:   string;
  tags?:       string[];        // topic tags
  connections?: string[];       // connected concept labels
  links?:      string[];        // external reference URLs
  savedAt:     number;
  source:      'rhizome' | 'manual' | 'arena';
  arenaId?:    string;
}

export interface RhizomeFolder {
  id:          string;
  name:        string;
  description?: string;
  cards:       SavedCard[];
  createdAt:   number;
  updatedAt:   number;
  color?:      string;
  isPublic:    boolean;
}

export interface SavedRhizome {
  id:          string;
  title:       string;
  description?: string;
  nodeCount:   number;
  topic:       string;
  snapshot:    string;  // serialized state
  savedAt:     number;
  folderId?:   string;
}

const STORAGE_KEY_FOLDERS = 'rhizome_folders_v1';
const STORAGE_KEY_RHIZOMES = 'saved_rhizomes_v1';

// ── Folder Management ─────────────────────────────────────────────────────────
export function loadFolders(): RhizomeFolder[] {
  try {
    const json = localStorage.getItem(STORAGE_KEY_FOLDERS);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export function saveFolders(folders: RhizomeFolder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(folders));
    // Also sync to backend (fire and forget)
    import('./rhizomeBackend').then(backend => {
      backend.saveFoldersToBackend(folders).catch(err => {
        console.warn('Backend sync failed:', err);
      });
    });
  } catch (e) {
    console.warn('Failed to save folders:', e);
  }
}

export function createFolder(name: string, description?: string): RhizomeFolder {
  const folder: RhizomeFolder = {
    id: `folder_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
    name,
    description,
    cards: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPublic: false,
  };
  const folders = loadFolders();
  folders.push(folder);
  saveFolders(folders);
  return folder;
}

export function deleteFolder(folderId: string): void {
  const folders = loadFolders();
  const updated = folders.filter(f => f.id !== folderId);
  saveFolders(updated);
}

export function updateFolder(folderId: string, updates: Partial<RhizomeFolder>): void {
  const folders = loadFolders();
  const idx = folders.findIndex(f => f.id === folderId);
  if (idx >= 0) {
    folders[idx] = { ...folders[idx], ...updates, updatedAt: Date.now() };
    saveFolders(folders);
  }
}

export function addCardToFolder(folderId: string, card: SavedCard): void {
  const folders = loadFolders();
  const folder = folders.find(f => f.id === folderId);
  if (folder) {
    // Check for duplicates
    const exists = folder.cards.some(c => 
      c.label === card.label || (c.url && c.url === card.url)
    );
    if (!exists) {
      folder.cards.push(card);
      folder.updatedAt = Date.now();
      saveFolders(folders);
    }
  }
}

export function removeCardFromFolder(folderId: string, cardId: string): void {
  const folders = loadFolders();
  const folder = folders.find(f => f.id === folderId);
  if (folder) {
    folder.cards = folder.cards.filter(c => c.id !== cardId);
    folder.updatedAt = Date.now();
    saveFolders(folders);
  }
}

export function moveCardBetweenFolders(fromFolderId: string, toFolderId: string, cardId: string): void {
  const folders = loadFolders();
  const fromFolder = folders.find(f => f.id === fromFolderId);
  const toFolder = folders.find(f => f.id === toFolderId);
  
  if (fromFolder && toFolder) {
    const card = fromFolder.cards.find(c => c.id === cardId);
    if (card) {
      // Remove from source folder
      fromFolder.cards = fromFolder.cards.filter(c => c.id !== cardId);
      fromFolder.updatedAt = Date.now();
      
      // Add to destination folder (avoid duplicates)
      if (!toFolder.cards.find(c => c.id === cardId)) {
        toFolder.cards.push(card);
        toFolder.updatedAt = Date.now();
      }
      
      saveFolders(folders);
    }
  }
}

// ── Saved Rhizomes ────────────────────────────────────────────────────────────
export function loadSavedRhizomes(): SavedRhizome[] {
  try {
    const json = localStorage.getItem(STORAGE_KEY_RHIZOMES);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export function saveSavedRhizomes(rhizomes: SavedRhizome[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_RHIZOMES, JSON.stringify(rhizomes));
    // Also sync to backend (fire and forget)
    import('./rhizomeBackend').then(backend => {
      backend.saveRhizomesToBackend(rhizomes).catch(err => {
        console.warn('Backend sync failed:', err);
      });
    });
  } catch (e) {
    console.warn('Failed to save rhizomes:', e);
  }
}

export function saveRhizome(
  title: string,
  description: string,
  topic: string,
  nodeCount: number,
  snapshot: string,
  folderId?: string
): SavedRhizome {
  const rhizome: SavedRhizome = {
    id: `rhizome_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
    title,
    description,
    topic,
    nodeCount,
    snapshot,
    savedAt: Date.now(),
    folderId,
  };
  const rhizomes = loadSavedRhizomes();
  rhizomes.push(rhizome);
  saveSavedRhizomes(rhizomes);
  return rhizome;
}

export function deleteSavedRhizome(rhizomeId: string): void {
  const rhizomes = loadSavedRhizomes();
  const updated = rhizomes.filter(r => r.id !== rhizomeId);
  saveSavedRhizomes(updated);
}

// ── Quick Card Creation from Node ─────────────────────────────────────────────
export function createCardFromNode(
  label: string,
  description?: string,
  category?: string,
  connections?: string[],
  tags?: string[],
  links?: string[],
): SavedCard {
  return {
    id: `card_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
    label,
    description,
    category,
    tags: tags ?? (category ? [category] : []),
    connections,
    links,
    savedAt: Date.now(),
    source: 'rhizome',
  };
}