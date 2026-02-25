// ─────────────────────────────────────────────────────────────────────────────
// Tree of Life — Hermetic Qabalah Topology (Golden Dawn tradition)
// 10 Sephiroth + 22 Paths with planetary, elemental & zodiacal attributions
// ─────────────────────────────────────────────────────────────────────────────
import type { SephirahId, PillarId } from './types';

export interface SephirahDef {
  id:        SephirahId;
  label:     string;
  labelHeb:  string;
  meaning:   string;
  pillar:    PillarId;
  nx: number;
  ny: number;
  color:     string;
  num:       number;
  planet:    string;
  element:   string;
  gdGrade:   string;
  divineName: string;
  archangel: string;
}

export interface PathDef {
  pathId:       number; // 11..32
  from:         SephirahId;
  to:           SephirahId;
  arcanaId:     number;  // 0..21
  hebrewLetter: string;
  pillarBias:   PillarId | 'all';
  attribution:  string;  // zodiac sign, planet or element
}

// ── Sephiroth ────────────────────────────────────────────────────────────────
export const SEPHIROT: SephirahDef[] = [
  {
    id:'kether', num:1, label:'Kether', labelHeb:'כתר', meaning:'The Crown',
    pillar:'balance', nx:0.50, ny:0.04, color:'#f0ece0',
    planet:'Primum Mobile', element:'Spirit', gdGrade:'10°=1□ Ipsissimus',
    divineName:'Eheieh', archangel:'Metatron',
  },
  {
    id:'chokmah', num:2, label:'Chokmah', labelHeb:'חכמה', meaning:'Wisdom',
    pillar:'mercy', nx:0.83, ny:0.17, color:'#d0c8a0',
    planet:'Fixed Stars / Zodiac', element:'Fire (primal)', gdGrade:'9°=2□ Magus',
    divineName:'Yah', archangel:'Ratziel',
  },
  {
    id:'binah', num:3, label:'Binah', labelHeb:'בינה', meaning:'Understanding',
    pillar:'severity', nx:0.17, ny:0.17, color:'#303048',
    planet:'Saturn', element:'Water (primal)', gdGrade:'8°=3□ Magister Templi',
    divineName:'YHVH Elohim', archangel:'Tzaphkiel',
  },
  {
    id:'chesed', num:4, label:'Chesed', labelHeb:'חסד', meaning:'Mercy',
    pillar:'mercy', nx:0.83, ny:0.40, color:'#6090d0',
    planet:'Jupiter', element:'Water', gdGrade:'7°=4□ Adeptus Exemptus',
    divineName:'El', archangel:'Tzadkiel',
  },
  {
    id:'geburah', num:5, label:'Geburah', labelHeb:'גבורה', meaning:'Severity',
    pillar:'severity', nx:0.17, ny:0.40, color:'#c03030',
    planet:'Mars', element:'Fire', gdGrade:'6°=5□ Adeptus Major',
    divineName:'Elohim Gibor', archangel:'Khamael',
  },
  {
    id:'tiphereth', num:6, label:'Tiphareth', labelHeb:'תפארת', meaning:'Beauty',
    pillar:'balance', nx:0.50, ny:0.52, color:'#e8c830',
    planet:'Sol', element:'Air', gdGrade:'5°=6□ Adeptus Minor',
    divineName:'YHVH Eloah va-Daath', archangel:'Raphael',
  },
  {
    id:'netzach', num:7, label:'Netzach', labelHeb:'נצח', meaning:'Victory',
    pillar:'mercy', nx:0.83, ny:0.65, color:'#50a840',
    planet:'Venus', element:'Fire (lesser)', gdGrade:'4°=7□ Philosophus',
    divineName:'YHVH Tzabaoth', archangel:'Haniel',
  },
  {
    id:'hod', num:8, label:'Hod', labelHeb:'הוד', meaning:'Splendour',
    pillar:'severity', nx:0.17, ny:0.65, color:'#b06820',
    planet:'Mercury', element:'Water (lesser)', gdGrade:'3°=8□ Practicus',
    divineName:'Elohim Tzabaoth', archangel:'Michael',
  },
  {
    id:'yesod', num:9, label:'Yesod', labelHeb:'יסוד', meaning:'The Foundation',
    pillar:'balance', nx:0.50, ny:0.78, color:'#8060c0',
    planet:'Luna', element:'Air (astral)', gdGrade:'2°=9□ Theoricus',
    divineName:'Shaddai El Chai', archangel:'Gabriel',
  },
  {
    id:'malkuth', num:10, label:'Malkuth', labelHeb:'מלכות', meaning:'The Kingdom',
    pillar:'balance', nx:0.50, ny:0.94, color:'#806040',
    planet:'Earth', element:'Earth', gdGrade:'1°=10□ Zelator',
    divineName:'Adonai ha-Aretz', archangel:'Sandalphon',
  },
];

export const SEPHIRAH_MAP: Map<SephirahId, SephirahDef> = new Map(
  SEPHIROT.map(s => [s.id, s])
);

// ── 22 Paths (Golden Dawn / Hermetic attribution) ────────────────────────────
export const PATHS: PathDef[] = [
  { pathId:11, from:'kether',    to:'chokmah',   arcanaId:0,  hebrewLetter:'א', pillarBias:'mercy',    attribution:'Air (Element)' },
  { pathId:12, from:'kether',    to:'binah',     arcanaId:1,  hebrewLetter:'ב', pillarBias:'severity', attribution:'Mercury (Planet)' },
  { pathId:13, from:'kether',    to:'tiphereth', arcanaId:2,  hebrewLetter:'ג', pillarBias:'balance',  attribution:'Luna (Planet)' },
  { pathId:14, from:'chokmah',   to:'binah',     arcanaId:3,  hebrewLetter:'ד', pillarBias:'all',      attribution:'Venus (Planet)' },
  { pathId:15, from:'chokmah',   to:'tiphereth', arcanaId:4,  hebrewLetter:'ה', pillarBias:'mercy',    attribution:'Aries (Zodiac)' },
  { pathId:16, from:'chokmah',   to:'chesed',    arcanaId:5,  hebrewLetter:'ו', pillarBias:'mercy',    attribution:'Taurus (Zodiac)' },
  { pathId:17, from:'binah',     to:'tiphereth', arcanaId:6,  hebrewLetter:'ז', pillarBias:'balance',  attribution:'Gemini (Zodiac)' },
  { pathId:18, from:'binah',     to:'geburah',   arcanaId:7,  hebrewLetter:'ח', pillarBias:'severity', attribution:'Cancer (Zodiac)' },
  { pathId:19, from:'chesed',    to:'geburah',   arcanaId:8,  hebrewLetter:'ט', pillarBias:'all',      attribution:'Leo (Zodiac)' },
  { pathId:20, from:'chesed',    to:'tiphereth', arcanaId:9,  hebrewLetter:'י', pillarBias:'mercy',    attribution:'Virgo (Zodiac)' },
  { pathId:21, from:'chesed',    to:'netzach',   arcanaId:10, hebrewLetter:'כ', pillarBias:'mercy',    attribution:'Jupiter (Planet)' },
  { pathId:22, from:'geburah',   to:'tiphereth', arcanaId:11, hebrewLetter:'ל', pillarBias:'balance',  attribution:'Libra (Zodiac)' },
  { pathId:23, from:'geburah',   to:'hod',       arcanaId:12, hebrewLetter:'מ', pillarBias:'severity', attribution:'Water (Element)' },
  { pathId:24, from:'tiphereth', to:'netzach',   arcanaId:13, hebrewLetter:'נ', pillarBias:'mercy',    attribution:'Scorpio (Zodiac)' },
  { pathId:25, from:'tiphereth', to:'yesod',     arcanaId:14, hebrewLetter:'ס', pillarBias:'balance',  attribution:'Sagittarius (Zodiac)' },
  { pathId:26, from:'tiphereth', to:'hod',       arcanaId:15, hebrewLetter:'ע', pillarBias:'severity', attribution:'Capricorn (Zodiac)' },
  { pathId:27, from:'netzach',   to:'hod',       arcanaId:16, hebrewLetter:'פ', pillarBias:'all',      attribution:'Mars (Planet)' },
  { pathId:28, from:'netzach',   to:'yesod',     arcanaId:17, hebrewLetter:'צ', pillarBias:'mercy',    attribution:'Aquarius (Zodiac)' },
  { pathId:29, from:'netzach',   to:'malkuth',   arcanaId:18, hebrewLetter:'ק', pillarBias:'mercy',    attribution:'Pisces (Zodiac)' },
  { pathId:30, from:'hod',       to:'yesod',     arcanaId:19, hebrewLetter:'ר', pillarBias:'balance',  attribution:'Sol (Planet)' },
  { pathId:31, from:'hod',       to:'malkuth',   arcanaId:20, hebrewLetter:'ש', pillarBias:'severity', attribution:'Fire (Element)' },
  { pathId:32, from:'yesod',     to:'malkuth',   arcanaId:21, hebrewLetter:'ת', pillarBias:'balance',  attribution:'Saturn (Planet) / Earth' },
];

export const PATH_MAP: Map<number, PathDef> = new Map(PATHS.map(p => [p.pathId, p]));

export const ARCANA_TO_PATH: Map<number, number> = new Map(PATHS.map(p => [p.arcanaId, p.pathId]));

export const PILLAR_NODES: Record<PillarId, SephirahId[]> = {
  mercy:    ['chokmah', 'chesed', 'netzach'],
  severity: ['binah',  'geburah', 'hod'],
  balance:  ['kether', 'tiphereth', 'yesod', 'malkuth'],
};
