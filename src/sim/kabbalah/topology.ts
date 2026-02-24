// ─────────────────────────────────────────────────────────────────────────────
// Tree of Life — Canonical Topology
// 10 Sephirot + 22 Paths (GD / Hermetic tradition)
// Single canonical mapping used by ALL deck lenses
// ─────────────────────────────────────────────────────────────────────────────
import type { SephirahId, PillarId } from './types';

export interface SephirahDef {
  id:        SephirahId;
  label:     string;
  labelHeb:  string;
  meaning:   string;
  pillar:    PillarId;
  /** Normalised [0..1] layout coords for canvas rendering */
  nx: number;
  ny: number;
  /** Element/planet symbolic colour */
  color:     string;
  /** Number 1..10 */
  num:       number;
}

export interface PathDef {
  pathId:      number; // 11..32
  from:        SephirahId;
  to:          SephirahId;
  arcanaId:    number;  // 0..21 (Major Arcana index)
  hebrewLetter: string;
  pillarBias:  PillarId | 'all';
}

// ── Sephirot ─────────────────────────────────────────────────────────────────
export const SEPHIROT: SephirahDef[] = [
  { id:'kether',    num:1,  label:'Kether',    labelHeb:'כֶּתֶר',  meaning:'Crown',        pillar:'balance',  nx:0.50, ny:0.04, color:'#f0ece0' },
  { id:'chokmah',   num:2,  label:'Chokmah',   labelHeb:'חָכְמָה',  meaning:'Wisdom',       pillar:'mercy',    nx:0.83, ny:0.17, color:'#d0c8a0' },
  { id:'binah',     num:3,  label:'Binah',     labelHeb:'בִּינָה',  meaning:'Understanding',pillar:'severity', nx:0.17, ny:0.17, color:'#303048' },
  { id:'chesed',    num:4,  label:'Chesed',    labelHeb:'חֶסֶד',   meaning:'Mercy',        pillar:'mercy',    nx:0.83, ny:0.40, color:'#6090d0' },
  { id:'geburah',   num:5,  label:'Geburah',   labelHeb:'גְּבוּרָה', meaning:'Severity',     pillar:'severity', nx:0.17, ny:0.40, color:'#c03030' },
  { id:'tiphereth', num:6,  label:'Tiphereth', labelHeb:'תִּפְאֶרֶת',meaning:'Beauty',       pillar:'balance',  nx:0.50, ny:0.52, color:'#e8c830' },
  { id:'netzach',   num:7,  label:'Netzach',   labelHeb:'נֵצַח',   meaning:'Victory',      pillar:'mercy',    nx:0.83, ny:0.65, color:'#50a840' },
  { id:'hod',       num:8,  label:'Hod',       labelHeb:'הוֹד',    meaning:'Splendour',    pillar:'severity', nx:0.17, ny:0.65, color:'#b06820' },
  { id:'yesod',     num:9,  label:'Yesod',     labelHeb:'יְסוֹד',  meaning:'Foundation',   pillar:'balance',  nx:0.50, ny:0.78, color:'#8060c0' },
  { id:'malkuth',   num:10, label:'Malkuth',   labelHeb:'מַלְכוּת', meaning:'Kingdom',      pillar:'balance',  nx:0.50, ny:0.94, color:'#806040' },
];

export const SEPHIRAH_MAP: Map<SephirahId, SephirahDef> = new Map(
  SEPHIROT.map(s => [s.id, s])
);

// ── 22 Paths (Hermetic Qabalah / GD tradition) ────────────────────────────────
// Path IDs 11..32 → Arcana 0..21 (Fool to World)
// One canonical mapping used by all three deck lenses
export const PATHS: PathDef[] = [
  { pathId:11, from:'kether',    to:'chokmah',   arcanaId:0,  hebrewLetter:'א', pillarBias:'mercy'    }, // Fool
  { pathId:12, from:'kether',    to:'binah',     arcanaId:1,  hebrewLetter:'ב', pillarBias:'severity' }, // Magician
  { pathId:13, from:'kether',    to:'tiphereth', arcanaId:2,  hebrewLetter:'ג', pillarBias:'balance'  }, // High Priestess
  { pathId:14, from:'chokmah',   to:'binah',     arcanaId:3,  hebrewLetter:'ד', pillarBias:'all'      }, // Empress
  { pathId:15, from:'chokmah',   to:'tiphereth', arcanaId:4,  hebrewLetter:'ה', pillarBias:'mercy'    }, // Emperor
  { pathId:16, from:'chokmah',   to:'chesed',    arcanaId:5,  hebrewLetter:'ו', pillarBias:'mercy'    }, // Hierophant
  { pathId:17, from:'binah',     to:'tiphereth', arcanaId:6,  hebrewLetter:'ז', pillarBias:'balance'  }, // Lovers
  { pathId:18, from:'binah',     to:'geburah',   arcanaId:7,  hebrewLetter:'ח', pillarBias:'severity' }, // Chariot
  { pathId:19, from:'chesed',    to:'geburah',   arcanaId:8,  hebrewLetter:'ט', pillarBias:'all'      }, // Strength
  { pathId:20, from:'chesed',    to:'tiphereth', arcanaId:9,  hebrewLetter:'י', pillarBias:'mercy'    }, // Hermit
  { pathId:21, from:'chesed',    to:'netzach',   arcanaId:10, hebrewLetter:'כ', pillarBias:'mercy'    }, // Wheel
  { pathId:22, from:'geburah',   to:'tiphereth', arcanaId:11, hebrewLetter:'ל', pillarBias:'balance'  }, // Justice
  { pathId:23, from:'geburah',   to:'hod',       arcanaId:12, hebrewLetter:'מ', pillarBias:'severity' }, // Hanged Man
  { pathId:24, from:'tiphereth', to:'netzach',   arcanaId:13, hebrewLetter:'נ', pillarBias:'mercy'    }, // Death
  { pathId:25, from:'tiphereth', to:'yesod',     arcanaId:14, hebrewLetter:'ס', pillarBias:'balance'  }, // Temperance
  { pathId:26, from:'tiphereth', to:'hod',       arcanaId:15, hebrewLetter:'ע', pillarBias:'severity' }, // Devil
  { pathId:27, from:'netzach',   to:'hod',       arcanaId:16, hebrewLetter:'פ', pillarBias:'all'      }, // Tower
  { pathId:28, from:'netzach',   to:'yesod',     arcanaId:17, hebrewLetter:'צ', pillarBias:'mercy'    }, // Star
  { pathId:29, from:'netzach',   to:'malkuth',   arcanaId:18, hebrewLetter:'ק', pillarBias:'mercy'    }, // Moon
  { pathId:30, from:'hod',       to:'yesod',     arcanaId:19, hebrewLetter:'ר', pillarBias:'balance'  }, // Sun
  { pathId:31, from:'hod',       to:'malkuth',   arcanaId:20, hebrewLetter:'ש', pillarBias:'severity' }, // Judgement
  { pathId:32, from:'yesod',     to:'malkuth',   arcanaId:21, hebrewLetter:'ת', pillarBias:'balance'  }, // World
];

export const PATH_MAP: Map<number, PathDef> = new Map(PATHS.map(p => [p.pathId, p]));

// Lookup: arcana → pathId
export const ARCANA_TO_PATH: Map<number, number> = new Map(PATHS.map(p => [p.arcanaId, p.pathId]));

// Pillar node sets
export const PILLAR_NODES: Record<PillarId, SephirahId[]> = {
  mercy:    ['chokmah', 'chesed', 'netzach'],
  severity: ['binah',  'geburah', 'hod'],
  balance:  ['kether', 'tiphereth', 'yesod', 'malkuth'],
};
