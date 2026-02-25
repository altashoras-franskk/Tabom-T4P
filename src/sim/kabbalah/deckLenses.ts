// ─────────────────────────────────────────────────────────────────────────────
// Deck Lenses — 3 Tarot Vocabularies (RWS, Marseille, Thoth)
// Hermetic Qabalah framing · Golden Dawn tradition
// Same operator mechanics; lenses change names, keywords, tone & micro-bias
// Extensible: future lenses (Thelema, Synthesis) plug in via same contract
// ─────────────────────────────────────────────────────────────────────────────
import type { DeckLens } from './types';

// ── Rider–Waite–Smith (default · imaginal/narrative) ─────────────────────────
const RWS: DeckLens = {
  id: 'rws',
  label: 'Rider–Waite–Smith',
  description: 'Imaginal narrative tradition. Story-rich, symbol-dense, accessible.',
  tradition: 'Golden Dawn (A.E. Waite / Pamela Colman Smith)',
  mentorTone: 'imaginal',
  bias: { operators: {} },
  majors: {
    0:  { name:'The Fool',            keywords:['leap','potential','spirit'],       tone:'imaginal', microNote:'Spirit descending into matter — pure potential before the first step.' },
    1:  { name:'The Magician',        keywords:['will','channel','As Above'],      tone:'imaginal', microNote:'Mercury\'s power — "As Above, So Below." Focus of the adept.' },
    2:  { name:'The High Priestess',  keywords:['mystery','veil','memory'],        tone:'imaginal', microNote:'Guardian of the veil between Kether and Tiphareth. Lunar gnosis.' },
    3:  { name:'The Empress',         keywords:['abundance','venus','creation'],   tone:'imaginal', microNote:'Venus bridges Chokmah and Binah — primal creative force.' },
    4:  { name:'The Emperor',         keywords:['structure','aries','authority'],   tone:'logical',  microNote:'Aries fire of will forging order from chaos.' },
    5:  { name:'The Hierophant',      keywords:['tradition','taurus','initiation'],tone:'ritual',   microNote:'Hierophant of the Mysteries — the inner teacher transmits.' },
    6:  { name:'The Lovers',          keywords:['union','gemini','choice'],        tone:'imaginal', microNote:'Alchemical marriage of opposites. The path of discernment.' },
    7:  { name:'The Chariot',         keywords:['triumph','cancer','willpower'],   tone:'logical',  microNote:'The victorious charioteer masters opposing forces.' },
    8:  { name:'Strength',            keywords:['fortitude','leo','taming'],       tone:'imaginal', microNote:'The lion and the maiden — mastery through love, not force.' },
    9:  { name:'The Hermit',          keywords:['solitude','virgo','lantern'],     tone:'imaginal', microNote:'Inner light illuminating the solitary path.' },
    10: { name:'Wheel of Fortune',    keywords:['cycle','jupiter','karma'],        tone:'imaginal', microNote:'Jupiter\'s wheel turns — cycles of fortune and karma.' },
    11: { name:'Justice',             keywords:['balance','libra','truth'],         tone:'logical',  microNote:'Ma\'at\'s scales — cosmic equilibrium enacted.' },
    12: { name:'The Hanged Man',      keywords:['surrender','water','inversion'],  tone:'ritual',   microNote:'Suspension between worlds — seeing from the Other Side.' },
    13: { name:'Death',               keywords:['transformation','scorpio','rebirth'], tone:'imaginal', microNote:'Scorpionic death of form — the alchemical nigredo.' },
    14: { name:'Temperance',          keywords:['alchemy','sagittarius','blend'],   tone:'imaginal', microNote:'The Angel of Art — blending fire and water in the Great Work.' },
    15: { name:'The Devil',           keywords:['shadow','capricorn','bondage'],    tone:'imaginal', microNote:'Chains of matter — recognise them to transcend.' },
    16: { name:'The Tower',           keywords:['lightning','mars','revelation'],   tone:'imaginal', microNote:'The Lightning Flash destroys false structures.' },
    17: { name:'The Star',            keywords:['hope','aquarius','guidance'],      tone:'imaginal', microNote:'Nuit pours forth the waters of life. Stellar consciousness.' },
    18: { name:'The Moon',            keywords:['illusion','pisces','threshold'],   tone:'imaginal', microNote:'Astral tides and deception — the path through darkness.' },
    19: { name:'The Sun',             keywords:['clarity','sol','illumination'],    tone:'imaginal', microNote:'Tiphareth\'s radiance — the inner sun fully revealed.' },
    20: { name:'Judgement',           keywords:['awakening','fire','resurrection'], tone:'ritual',   microNote:'The trumpet calls — the dead rise in spiritual rebirth.' },
    21: { name:'The World',           keywords:['completion','saturn','wholeness'], tone:'imaginal', microNote:'Saturn\'s completion — the dancer in the cosmic mandala.' },
  },
};

// ── Marseille (structural/formal) ────────────────────────────────────────────
const MARSEILLE: DeckLens = {
  id: 'marseille',
  label: 'Marseille',
  description: 'Structural-archetype tradition. Precise, architectural, classical.',
  tradition: 'French esoteric tradition (Eliphas Lévi / Papus)',
  mentorTone: 'logical',
  bias: {
    operators: {
      CLOSE_GATE: 1.10,
      CUT:        1.10,
      BALANCE:    1.10,
    },
  },
  majors: {
    0:  { name:'Le Mat',             keywords:['errance','zero','departure'],     tone:'logical',  microNote:'The unmapped wanderer at the edge of the Abyss.' },
    1:  { name:'Le Bateleur',        keywords:['skill','tools','craft'],          tone:'logical',  microNote:'The artisan of the elements — mastery of the table.' },
    2:  { name:'La Papesse',         keywords:['secret','book','threshold'],      tone:'logical',  microNote:'Hidden knowledge guarded behind the temple veil.' },
    3:  { name:'L\'Impératrice',     keywords:['reign','fertility','form'],       tone:'logical',  microNote:'Fertile form generating structure across worlds.' },
    4:  { name:'L\'Empereur',        keywords:['empire','law','stone'],           tone:'logical',  microNote:'Architected order — the cubic stone of foundation.' },
    5:  { name:'Le Pape',            keywords:['keys','rite','transmission'],     tone:'ritual',   microNote:'Ritual transmission between inner and outer orders.' },
    6:  { name:'L\'Amoureux',        keywords:['choice','fork','duality'],        tone:'logical',  microNote:'The crossroads where the adept must choose.' },
    7:  { name:'Le Chariot',         keywords:['movement','mastery','direction'], tone:'logical',  microNote:'Directed force traversing the path between pillars.' },
    8:  { name:'La Justice',         keywords:['sword','scales','measure'],       tone:'logical',  microNote:'Structural equilibration — the blade of discernment.' },
    9:  { name:'L\'Ermite',          keywords:['retreat','lamp','patience'],      tone:'logical',  microNote:'Solitary watchman with the lamp of Hermes.' },
    10: { name:'La Roue de Fortune', keywords:['cycle','reversal','fate'],        tone:'logical',  microNote:'The wheel turns — ascent and descent are one motion.' },
    11: { name:'La Force',           keywords:['endurance','gentleness','grip'],  tone:'logical',  microNote:'Silent mastery of the inner beast through patience.' },
    12: { name:'Le Pendu',           keywords:['inversion','waiting','release'],  tone:'ritual',   microNote:'Suspended between worlds — memory deepens.' },
    13: { name:'L\'Arcane sans nom', keywords:['scythe','passage','harvest'],     tone:'logical',  microNote:'The unnamed force reaping what is no longer needed.' },
    14: { name:'La Tempérance',      keywords:['flow','mixing','measure'],        tone:'logical',  microNote:'Steady blending of opposing currents.' },
    15: { name:'Le Diable',          keywords:['chains','shadow','attraction'],   tone:'logical',  microNote:'Bound by material attachment — the shadow is the teacher.' },
    16: { name:'La Maison-Dieu',     keywords:['lightning','collapse','opening'], tone:'logical',  microNote:'The House of God struck open by divine fire.' },
    17: { name:'L\'Étoile',          keywords:['hope','pouring','star'],          tone:'logical',  microNote:'Patient coherence poured into the great work.' },
    18: { name:'La Lune',            keywords:['illusion','drift','nocturne'],    tone:'logical',  microNote:'Nocturnal ambiguity — the path through the waters.' },
    19: { name:'Le Soleil',          keywords:['clarity','bloom','day'],          tone:'logical',  microNote:'Diurnal clarity — the twin pillars illuminated.' },
    20: { name:'Le Jugement',        keywords:['awakening','review','trumpet'],   tone:'ritual',   microNote:'Review and consolidation at the threshold of rebirth.' },
    21: { name:'Le Monde',           keywords:['totality','dance','completion'],  tone:'logical',  microNote:'Total integration as cosmic dance.' },
  },
};

// ── Thoth (alchemical-energetic · Crowley/Harris) ────────────────────────────
const THOTH: DeckLens = {
  id: 'thoth',
  label: 'Thoth',
  description: 'Alchemical-energetic tradition. Transformative, intense, esoteric.',
  tradition: 'Thelemic tradition (Aleister Crowley / Frieda Harris)',
  mentorTone: 'ritual',
  bias: {
    operators: {
      AMPLIFY: 1.10,
      SHOCK:   1.10,
      LOOP:    1.10,
    },
  },
  majors: {
    0:  { name:'The Fool',          keywords:['spirit','limitless','aethyr'],    tone:'ritual',   microNote:'Pure spirit before manifestation — Aleph, the breath.' },
    1:  { name:'The Magus',         keywords:['mercury','logos','power'],         tone:'ritual',   microNote:'The Word as focused operator — Beth, the house of the Magus.' },
    2:  { name:'The Priestess',     keywords:['moon','silver','gnosis'],          tone:'ritual',   microNote:'Lunar gnosis behind the veil of Paroketh.' },
    3:  { name:'The Empress',       keywords:['venus','daleth','gateway'],        tone:'ritual',   microNote:'Venus as the luminous gateway of creation.' },
    4:  { name:'The Emperor',       keywords:['aries','heh','vision'],            tone:'logical',  microNote:'Constituting Intelligence — the window of sight.' },
    5:  { name:'The Hierophant',    keywords:['taurus','vau','nail'],             tone:'ritual',   microNote:'The Nail that fixes spirit into form — inner teaching.' },
    6:  { name:'The Lovers',        keywords:['gemini','zayin','sword'],          tone:'ritual',   microNote:'The Sword that divides and reunites — alchemical solve.' },
    7:  { name:'The Chariot',       keywords:['cancer','grail','triumph'],        tone:'ritual',   microNote:'The Holy Grail borne across the Abyss.' },
    8:  { name:'Lust',              keywords:['leo','babalon','ecstasy'],         tone:'ritual',   microNote:'Babalon rides the Beast — creative fire unleashed.' },
    9:  { name:'The Hermit',        keywords:['virgo','yod','seed'],              tone:'ritual',   microNote:'The Seed of Light hidden in the darkness of the earth.' },
    10: { name:'Fortune',           keywords:['jupiter','kaph','wheel'],          tone:'ritual',   microNote:'Jupiter\'s wheel — the three gunas in rotation.' },
    11: { name:'Adjustment',        keywords:['libra','lamed','equilibrium'],     tone:'logical',  microNote:'Adjustment of all imbalance — the Daughter of the Lords.' },
    12: { name:'The Hanged Man',    keywords:['water','mem','sacrifice'],         tone:'ritual',   microNote:'Redemption through water — the drowned god rises.' },
    13: { name:'Death',             keywords:['scorpio','nun','putrefaction'],    tone:'ritual',   microNote:'Putrefactio — the alchemical black dissolves false form.' },
    14: { name:'Art',               keywords:['sagittarius','samekh','opus'],     tone:'ritual',   microNote:'The Art of transmutation — rainbow of the Great Work.' },
    15: { name:'The Devil',         keywords:['capricorn','ayin','matter'],       tone:'ritual',   microNote:'Lord of the Gates of Matter — creative energy in chains.' },
    16: { name:'The Tower',         keywords:['mars','peh','destruction'],        tone:'ritual',   microNote:'War-engine of Mars — the lightning flash liberates.' },
    17: { name:'The Star',          keywords:['aquarius','tzaddi','nuit'],        tone:'ritual',   microNote:'Nuit reveals herself — "Every man and every woman is a star."' },
    18: { name:'The Moon',          keywords:['pisces','qoph','midnight'],        tone:'ritual',   microNote:'Midnight sun behind the gates of dream and illusion.' },
    19: { name:'The Sun',           keywords:['sol','resh','glory'],              tone:'ritual',   microNote:'Ra-Hoor-Khuit in full radiance — the crowned child.' },
    20: { name:'The Aeon',          keywords:['fire','shin','horus'],             tone:'ritual',   microNote:'The Aeon of Horus — the crowned and conquering child.' },
    21: { name:'The Universe',      keywords:['saturn','tav','completion'],       tone:'ritual',   microNote:'Saturn\'s cosmic dance — the Universe as complete temple.' },
  },
};

export const DECK_LENSES: DeckLens[] = [RWS, MARSEILLE, THOTH];
export const DECK_LENS_MAP: Map<string, DeckLens> = new Map(DECK_LENSES.map(d => [d.id, d]));
