// ─────────────────────────────────────────────────────────────────────────────
// Deck Lenses — 3 Tarot Vocabularies (RWS, Marseille, Thoth)
// Same operator mechanics; lenses change names, keywords, tone & micro-bias
// ─────────────────────────────────────────────────────────────────────────────
import type { DeckLens } from './types';

// ── Rider–Waite–Smith (default) ───────────────────────────────────────────────
const RWS: DeckLens = {
  id: 'rws',
  label: 'Rider–Waite–Smith',
  description: 'Imaginal narrative tradition. Balanced emphasis on story and symbol.',
  mentorTone: 'imaginal',
  bias: { operators: {} }, // baseline — no bias
  majors: {
    0:  { name:'The Fool',             keywords:['leap','potential','beginning'],      tone:'imaginal', microNote:'Pure openness before choice.' },
    1:  { name:'The Magician',         keywords:['will','skill','channel'],            tone:'imaginal', microNote:'Focused intention directing energy.' },
    2:  { name:'The High Priestess',   keywords:['mystery','memory','veil'],           tone:'imaginal', microNote:'Hidden knowledge held in stillness.' },
    3:  { name:'The Empress',          keywords:['abundance','growth','nurture'],      tone:'imaginal', microNote:'Fertile amplification of life.' },
    4:  { name:'The Emperor',          keywords:['structure','authority','order'],     tone:'logical',  microNote:'Stable form holding the field.' },
    5:  { name:'The Hierophant',       keywords:['tradition','ritual','transmission'], tone:'ritual',   microNote:'Periodic pulse of received wisdom.' },
    6:  { name:'The Lovers',           keywords:['union','choice','bridge'],           tone:'imaginal', microNote:'Alignment bridging two nodes.' },
    7:  { name:'The Chariot',          keywords:['victory','drive','momentum'],        tone:'logical',  microNote:'Willful traversal opening the gate.' },
    8:  { name:'Strength',             keywords:['courage','tame','resilience'],       tone:'imaginal', microNote:'Local tension resolved through presence.' },
    9:  { name:'The Hermit',           keywords:['solitude','lantern','inward'],       tone:'imaginal', microNote:'Isolated stillness and slow wisdom.' },
    10: { name:'Wheel of Fortune',     keywords:['cycle','chance','turn'],             tone:'imaginal', microNote:'Sudden shift of thresholds.' },
    11: { name:'Justice',              keywords:['balance','law','equalize'],          tone:'logical',  microNote:'Extremes equalised by the scales.' },
    12: { name:'The Hanged Man',       keywords:['suspension','yield','reversal'],     tone:'ritual',   microNote:'Willful delay deepening memory.' },
    13: { name:'Death',                keywords:['ending','release','transform'],      tone:'imaginal', microNote:'Clean severance and local reset.' },
    14: { name:'Temperance',           keywords:['flow','mix','patience'],             tone:'imaginal', microNote:'Steady equilibration and stabilisation.' },
    15: { name:'The Devil',            keywords:['bind','compulsion','shadow'],        tone:'imaginal', microNote:'Compulsive convergence, looping bonds.' },
    16: { name:'The Tower',            keywords:['rupture','lightning','sudden'],      tone:'imaginal', microNote:'Disruptive shock opening blocked paths.' },
    17: { name:'The Star',             keywords:['hope','coherence','guidance'],       tone:'imaginal', microNote:'Gentle global coherence increase.' },
    18: { name:'The Moon',             keywords:['illusion','drift','cycle'],          tone:'imaginal', microNote:'Looping ambiguity with delay.' },
    19: { name:'The Sun',              keywords:['clarity','joy','radiance'],          tone:'imaginal', microNote:'Illumination clearing ambiguity.' },
    20: { name:'Judgement',            keywords:['call','review','insight'],           tone:'ritual',   microNote:'Consolidation of chapters into insight.' },
    21: { name:'The World',            keywords:['completion','integration','whole'],  tone:'imaginal', microNote:'Full integration, resilient stability.' },
  },
};

// ── Marseille ─────────────────────────────────────────────────────────────────
const MARSEILLE: DeckLens = {
  id: 'marseille',
  label: 'Marseille',
  description: 'Structural-archetype tradition. Dry, formal, architectural reading.',
  mentorTone: 'logical',
  bias: {
    operators: {
      CLOSE_GATE: 1.10,
      CUT:        1.10,
      BALANCE:    1.10,
    },
  },
  majors: {
    0:  { name:'Le Mat',            keywords:['errance','début','zéro'],          tone:'logical',  microNote:'The unmapped traveller.' },
    1:  { name:'Le Bateleur',       keywords:['adresse','outils','acte'],         tone:'logical',  microNote:'The skilled operator at the table.' },
    2:  { name:'La Papesse',        keywords:['secret','livre','intérieur'],      tone:'logical',  microNote:'Hidden knowledge before the threshold.' },
    3:  { name:'L\'Impératrice',    keywords:['règne','fécondité','forme'],       tone:'logical',  microNote:'Fertile form generating structure.' },
    4:  { name:'L\'Empereur',       keywords:['empire','loi','solidité'],         tone:'logical',  microNote:'Architected order holding the field.' },
    5:  { name:'Le Pape',           keywords:['clés','rite','enseignement'],      tone:'ritual',   microNote:'Ritual transmission between levels.' },
    6:  { name:'L\'Amoureux',       keywords:['choix','jonction','dualité'],      tone:'logical',  microNote:'The fork bridging two vectors.' },
    7:  { name:'Le Chariot',        keywords:['mouvement','maîtrise','cap'],      tone:'logical',  microNote:'Directed force traversing the path.' },
    8:  { name:'La Justice',        keywords:['épée','balance','mesure'],         tone:'logical',  microNote:'Structural equilibration by measure.' },
    9:  { name:'L\'Ermite',         keywords:['retrait','lumière','lent'],        tone:'logical',  microNote:'Solitary slowing with lantern raised.' },
    10: { name:'La Roue de Fortune',keywords:['cycle','hasard','retournement'],   tone:'logical',  microNote:'Threshold reversal by the turning wheel.' },
    11: { name:'La Force',          keywords:['endurance','douceur','maîtrise'],  tone:'logical',  microNote:'Quiet taming of local tension.' },
    12: { name:'Le Pendu',          keywords:['inversion','attente','lâcher'],    tone:'ritual',   microNote:'Suspended inversion, memory deepens.' },
    13: { name:'L\'Arcane sans nom',keywords:['rupture','fauchage','passage'],    tone:'logical',  microNote:'Unnamed force of radical severance.' },
    14: { name:'La Tempérance',     keywords:['mélange','flux','mesure'],         tone:'logical',  microNote:'Steady blending and measured flow.' },
    15: { name:'Le Diable',         keywords:['liure','ombre','emprise'],         tone:'logical',  microNote:'Bound loop, compulsive attachment.' },
    16: { name:'La Maison-Dieu',    keywords:['foudre','effondrement','ouvert'], tone:'logical',  microNote:'Lightning strike opening the house.' },
    17: { name:'L\'Étoile',         keywords:['espoir','versement','guidance'],   tone:'logical',  microNote:'Patient coherence poured into the system.' },
    18: { name:'La Lune',           keywords:['illusion','dérive','nocturne'],    tone:'logical',  microNote:'Nocturnal drift and looping ambiguity.' },
    19: { name:'Le Soleil',         keywords:['clarté','épanouissement','jour'],  tone:'logical',  microNote:'Diurnal clarity, fields illuminated.' },
    20: { name:'Le Jugement',       keywords:['éveil','bilan','résurrection'],    tone:'ritual',   microNote:'Review and consolidation of the record.' },
    21: { name:'Le Monde',          keywords:['totalité','danse','achèvement'],   tone:'logical',  microNote:'Total integration as structured whole.' },
  },
};

// ── Thoth ─────────────────────────────────────────────────────────────────────
const THOTH: DeckLens = {
  id: 'thoth',
  label: 'Thoth',
  description: 'Alchemical-energetic tradition. Dynamic, transformative, intensity-focused.',
  mentorTone: 'ritual',
  bias: {
    operators: {
      AMPLIFY: 1.10,
      SHOCK:   1.10,
      LOOP:    1.10,
    },
  },
  majors: {
    0:  { name:'The Fool',         keywords:['spirit','zero','limitless'],      tone:'ritual',   microNote:'Pure spirit before manifestation.' },
    1:  { name:'The Magus',        keywords:['mercury','word','power'],          tone:'ritual',   microNote:'The Word as focused operator.' },
    2:  { name:'The Priestess',    keywords:['moon','silver','memory'],          tone:'ritual',   microNote:'Reflective deep-memory before the veil.' },
    3:  { name:'The Empress',      keywords:['venus','birth','plenty'],          tone:'ritual',   microNote:'Venus amplifying life into form.' },
    4:  { name:'The Emperor',      keywords:['aries','structure','dominion'],    tone:'logical',  microNote:'Martial order crystallising the field.' },
    5:  { name:'The Hierophant',   keywords:['taurus','law','transmission'],     tone:'ritual',   microNote:'Fixed-earth ritual transmission.' },
    6:  { name:'The Lovers',       keywords:['gemini','solve','bridge'],         tone:'ritual',   microNote:'Alchemical solve et coagula between nodes.' },
    7:  { name:'The Chariot',      keywords:['cancer','grail','force'],          tone:'ritual',   microNote:'Grail-bearer crossing the threshold.' },
    8:  { name:'Lust',             keywords:['leo','fire','ecstasy'],            tone:'ritual',   microNote:'Creative fire transmuting local tension.' },
    9:  { name:'The Hermit',       keywords:['virgo','semen','lantern'],         tone:'ritual',   microNote:'Hermit slowing the field inward.' },
    10: { name:'Fortune',          keywords:['jupiter','spin','chance'],         tone:'ritual',   microNote:'Jupiter\'s wheel shocking thresholds.' },
    11: { name:'Adjustment',       keywords:['libra','truth','law'],             tone:'logical',  microNote:'Libra equalising extremes by law.' },
    12: { name:'The Hanged Man',   keywords:['water','suspend','sacrifice'],     tone:'ritual',   microNote:'Suspended water deepening memory.' },
    13: { name:'Death',            keywords:['scorpio','transform','ending'],    tone:'ritual',   microNote:'Scorpionic transformation, sharp cut.' },
    14: { name:'Art',              keywords:['sagittarius','alchemy','blend'],   tone:'ritual',   microNote:'Alchemical blending and transmutation.' },
    15: { name:'The Devil',        keywords:['capricorn','bind','materialize'], tone:'ritual',   microNote:'Capricornian binding loop, earth-bound.' },
    16: { name:'The Tower',        keywords:['mars','war','lightning'],          tone:'ritual',   microNote:'Martial strike dissolving crystallised form.' },
    17: { name:'The Star',         keywords:['aquarius','nuit','pour'],          tone:'ritual',   microNote:'Nuit pouring coherence into all.' },
    18: { name:'The Moon',         keywords:['pisces','flux','dual'],            tone:'ritual',   microNote:'Piscean dual loop, creative ambiguity.' },
    19: { name:'The Sun',          keywords:['sun','ra','radiance'],             tone:'ritual',   microNote:'Ra-Hoor clarifying and amplifying.' },
    20: { name:'The Aeon',         keywords:['fire','horus','new'],              tone:'ritual',   microNote:'Aeon: review as new-age integration.' },
    21: { name:'The Universe',     keywords:['saturn','earth','complete'],       tone:'ritual',   microNote:'Saturn\'s totality: complete integration.' },
  },
};

export const DECK_LENSES: DeckLens[] = [RWS, MARSEILLE, THOTH];
export const DECK_LENS_MAP: Map<string, DeckLens> = new Map(DECK_LENSES.map(d => [d.id, d]));
