import React, { useState, useRef, useEffect } from 'react';
import { Save, Upload, Download, Trash2, Clock, FileText, Cloud } from 'lucide-react';
import { 
  SimulationSnapshot, 
  saveToFile, 
  loadFromFile, 
  saveToLocalStorage, 
  loadFromLocalStorage,
  listLocalStorageSaves,
  deleteLocalStorageSave 
} from '../engine/snapshot';
import { useAuth } from '../app/components/AuthModal';
import { getHubData, addHubEntry, removeHubEntry } from '../storage/userStorage';

const LAB_ID = 'complexityLife';

export interface ComplexityHubSave {
  id: string;
  name: string;
  timestamp: number;
  snapshot: SimulationSnapshot;
}

interface SaveLoadPanelProps {
  onSave: (name: string) => SimulationSnapshot;
  onLoad: (snapshot: SimulationSnapshot) => void;
}

export const SaveLoadPanel: React.FC<SaveLoadPanelProps> = ({ onSave, onLoad }) => {
  const [saveName, setSaveName] = useState('');
  const [saves, setSaves] = useState(listLocalStorageSaves());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user: authUser } = useAuth();
  const userId = authUser?.id ?? null;
  const [hubSaves, setHubSaves] = useState<ComplexityHubSave[]>([]);
  const [hubLoading, setHubLoading] = useState(false);

  const refreshHubSaves = async () => {
    setHubLoading(true);
    try {
      const data = await getHubData<ComplexityHubSave>(LAB_ID, userId);
      const list = Array.isArray(data.saves) ? data.saves : [];
      setHubSaves(list);
    } finally {
      setHubLoading(false);
    }
  };

  useEffect(() => {
    refreshHubSaves();
  }, [userId]);

  const refreshSaves = () => {
    setSaves(listLocalStorageSaves());
  };

  const handleQuickSave = (slot: number) => {
    const name = saveName.trim() || `Slot ${slot + 1}`;
    const snapshot = onSave(name);
    saveToLocalStorage(snapshot, slot);
    refreshSaves();
  };

  const handleQuickLoad = (slot: number) => {
    const snapshot = loadFromLocalStorage(slot);
    if (snapshot) {
      onLoad(snapshot);
    }
  };

  const handleDelete = (slot: number) => {
    deleteLocalStorageSave(slot);
    refreshSaves();
  };

  const handleExport = () => {
    const name = saveName.trim() || 'Export';
    const snapshot = onSave(name);
    saveToFile(snapshot);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const snapshot = await loadFromFile(file);
      onLoad(snapshot);
    } catch (error) {
      console.error('Failed to load file:', error);
      alert('Failed to load file. Please check the file format.');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-white/70 text-xs font-mono">Save Name</label>
        <input
          type="text"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="Enter save name..."
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded px-3 py-2 text-blue-300 text-sm transition-colors"
        >
          <Download size={16} />
          Export
        </button>
        <button
          onClick={handleImport}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded px-3 py-2 text-green-300 text-sm transition-colors"
        >
          <Upload size={16} />
          Import
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="border-t border-white/10 pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-white/70 text-xs font-mono">Quick Save Slots</label>
          <button
            onClick={refreshSaves}
            className="text-white/50 hover:text-white/80 text-xs"
          >
            Refresh
          </button>
        </div>

        <div className="space-y-1 max-h-60 overflow-y-auto">
          {[0, 1, 2, 3, 4].map((slot) => {
            const save = saves.find((s) => s.slot === slot);
            
            return (
              <div
                key={slot}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded p-2 transition-colors"
              >
                <span className="text-white/40 text-xs font-mono w-6">{slot + 1}</span>
                
                {save ? (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm truncate">{save.name}</div>
                      <div className="flex items-center gap-1 text-white/40 text-xs">
                        <Clock size={10} />
                        {formatDate(save.timestamp)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleQuickLoad(slot)}
                      className="p-1.5 hover:bg-white/10 rounded transition-colors"
                      title="Load"
                    >
                      <Upload size={14} className="text-green-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(slot)}
                      className="p-1.5 hover:bg-white/10 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 text-white/30 text-sm italic">Empty slot</div>
                    <button
                      onClick={() => handleQuickSave(slot)}
                      className="p-1.5 hover:bg-white/10 rounded transition-colors"
                      title="Save to slot"
                    >
                      <Save size={14} className="text-blue-400" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hub saves (account) */}
      <div className="border-t border-white/10 pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-white/70 text-xs font-mono flex items-center gap-1">
            {userId ? <Cloud size={10} className="text-blue-400" /> : null}
            Meus presets {userId ? '(conta)' : '(entre para sincronizar)'}
          </label>
          {userId && (
            <button
              onClick={refreshHubSaves}
              disabled={hubLoading}
              className="text-white/50 hover:text-white/80 text-xs disabled:opacity-50"
            >
              {hubLoading ? '...' : 'Refresh'}
            </button>
          )}
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {hubSaves.length === 0 && !hubLoading && (
            <div className="text-white/30 text-xs italic py-2">Nenhum preset salvo na conta.</div>
          )}
          {hubSaves.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded p-2 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm truncate">{entry.name}</div>
                <div className="flex items-center gap-1 text-white/40 text-xs">
                  <Clock size={10} />
                  {formatDate(entry.timestamp)}
                </div>
              </div>
              <button
                onClick={() => onLoad(entry.snapshot)}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title="Carregar"
              >
                <Upload size={14} className="text-green-400" />
              </button>
              {userId && (
                <button
                  onClick={() => {
                    removeHubEntry<ComplexityHubSave>(LAB_ID, 'saves', entry.id, userId);
                    setHubSaves((prev) => prev.filter((e) => e.id !== entry.id));
                  }}
                  className="p-1.5 hover:bg-white/10 rounded transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
        {(userId || !authUser) && (
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Nome do preset"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-white/30"
            />
            <button
              onClick={() => {
                const name = saveName.trim() || `Preset ${Date.now()}`;
                const snapshot = onSave(name);
                const entry: ComplexityHubSave = {
                  id: `save_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                  name,
                  timestamp: Date.now(),
                  snapshot,
                };
                addHubEntry(LAB_ID, 'saves', entry, userId);
                setHubSaves((prev) => [...prev, entry]);
                setSaveName('');
              }}
              className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded px-2 py-1.5 text-blue-300 text-xs transition-colors"
            >
              <Save size={12} />
              Salvar na conta
            </button>
          </div>
        )}
      </div>

      <div className="bg-white/5 rounded p-3 border border-white/10">
        <div className="flex items-start gap-2">
          <FileText size={14} className="text-white/50 mt-0.5 flex-shrink-0" />
          <p className="text-white/50 text-xs leading-relaxed">
            Quick saves are stored locally in your browser. Use Export to download a file for backup or sharing.
          </p>
        </div>
      </div>
    </div>
  );
};
