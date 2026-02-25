// ─────────────────────────────────────────────────────────────────────────────
// Tree of Life Lab — Hermetic Qabalah · Golden Dawn Edition
// Lightning Flash (Descending Light) ↓ + Serpent of Wisdom (Ascending Light) ↑
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState, useCallback } from 'react';

import type {
  TreeState, TreeOfLifeParams, SephirahId,
  DeckLensId, CardPlay, GrimoireChapter, TargetType, TreeEvent,
  RitualToolId, TreeOverlay,
} from '../../sim/kabbalah/types';
import { RITUAL_TOOLS } from '../../sim/kabbalah/types';
import {
  createTree, resetTree, stepTree, applyCard, applyRitualTool,
  drawHand, getStateSnapshot,
} from '../../sim/kabbalah/engine';
import { SEPHIROT, SEPHIRAH_MAP, PATHS, PATH_MAP } from '../../sim/kabbalah/topology';
import { ARCANA, ARCANA_MAP } from '../../sim/kabbalah/arcana';
import { DECK_LENSES, DECK_LENS_MAP } from '../../sim/kabbalah/deckLenses';
import { JOURNEY_PRESETS, DEFAULT_PARAMS } from '../../sim/kabbalah/presets';
import {
  RefreshCw, Play, Pause, Settings, ChevronDown, ChevronRight,
  Zap, ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react';

const TWO_PI = Math.PI * 2;
const TREE_W  = 540;
const TREE_H  = 900;
const NODE_R  = 26;

function wx(nx: number) { return nx * TREE_W - TREE_W * 0.5; }
function wy(ny: number) { return ny * TREE_H - TREE_H * 0.5; }

function ctrlPt(fx: number, fy: number, tx: number, ty: number) {
  const mx = (fx + tx) / 2, my = (fy + ty) / 2;
  const len = Math.sqrt(mx * mx + my * my) + 1;
  const bow = 22;
  return { x: mx + (mx / len) * bow, y: my + (my / len) * bow };
}

function bz(t: number, p0x: number, p0y: number, cx: number, cy: number, p1x: number, p1y: number) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0x + 2 * mt * t * cx + t * t * p1x,
    y: mt * mt * p0y + 2 * mt * t * cy + t * t * p1y,
  };
}

const GK = 'tol_grimoire_v3';
function loadGrimoire(): GrimoireChapter[] {
  try { return JSON.parse(localStorage.getItem(GK) ?? '[]'); } catch { return []; }
}
function saveGrimoire(c: GrimoireChapter[]) {
  try { localStorage.setItem(GK, JSON.stringify(c.slice(-60))); } catch {}
}

interface OrbitP { angle: number; angVel: number; radius: number; alpha: number; }
interface StreamP { t: number; speed: number; size: number; energy: number; }
interface Fx {
  kind: 'burst' | 'ripple' | 'flash' | 'dissolve';
  wx: number; wy: number;
  color: string;
  age: number; life: number;
  r: number;
}
interface Camera { zoom: number; px: number; py: number; }

function pathRGB(fromPillar: string, toPillar: string): [number, number, number] {
  if (fromPillar === 'mercy'    || toPillar === 'mercy')    return [80, 150, 255];
  if (fromPillar === 'severity' || toPillar === 'severity') return [220, 70, 60];
  return [220, 185, 80];
}

// ─────────────────────────────────────────────────────────────────────────────
// HERMETIC QABALAH LORE — Golden Dawn educational content
// ─────────────────────────────────────────────────────────────────────────────
interface SephirahLore {
  world: string;
  plane: string;
  divineName: string;
  archangel: string;
  gdGrade: string;
  planet: string;
  body: string;
  summary: string;
  spiritual: string;
  lightningFlash: string;
  serpentOfWisdom: string;
  practice: string;
  color: string;
}

const SEPHIRAH_LORE: Record<SephirahId, SephirahLore> = {
  kether: {
    world: 'Atziluth — Archetypal Plane',
    plane: 'The Limitless Light / LVX',
    divineName: 'Eheieh — "I Am"',
    archangel: 'Metatron — Angel of the Presence',
    gdGrade: '10°=1□ Ipsissimus',
    planet: 'Primum Mobile — the First Swirlings',
    body: 'Crown of the Head (Sahasrara)',
    color: '#f0ece0',
    summary: 'The Crown — point of first emanation from the Limitless Light. Beyond thought, beyond form.',
    spiritual: 'Kether is the first point where the Infinite concentrates itself to create. It is pure undifferentiated consciousness — the "I" before any experience. The Ipsissimus grade represents unity with the All. As the Emerald Tablet teaches: that which is Above is as that which is Below — and Kether is the ultimate Above. It cannot be grasped by the mind, only touched through the deepest meditation.',
    lightningFlash: 'Kether is the SOURCE of the Lightning Flash. The Limitless Light (LVX) descends from the unmanifest, striking like lightning through all 10 Sephiroth until it grounds in Malkuth. This is the descent of spirit into matter — the Great Work begins here.',
    serpentOfWisdom: 'When the Serpent of Wisdom returns, Kether RECEIVES it back, completing the sacred cycle. The light returns to its origin, transformed by the full experience of Creation. This is the completion of the Great Work — the Magnum Opus.',
    practice: 'Observe how Kether\'s charge flows to Chokmah and Binah. Apply INVOKE or CLARIFY to initiate the Lightning Flash. High coherence in Kether means the descending light flows freely.',
  },
  chokmah: {
    world: 'Atziluth — Archetypal Plane',
    plane: 'The Zodiac / Fixed Stars',
    divineName: 'Yah — the first flash of awareness',
    archangel: 'Ratziel — Secret of God',
    gdGrade: '9°=2□ Magus',
    planet: 'Fixed Stars / Zodiac',
    body: 'Right hemisphere — creative intuition',
    color: '#d0c8a0',
    summary: 'Wisdom — the primal flash of existence, the dynamic force from which all possibility emerges.',
    spiritual: 'Chokmah is the Supernal Father — primal masculine force, the first differentiation. In the Magus grade, one wields the Word of creation. It is Wisdom not as knowledge but as the raw flash of insight, the lightning-bolt of inspiration. On the Pillar of Mercy, it represents unlimited expansive force. "Every man and every woman is a star" — Chokmah is the stellar force within.',
    lightningFlash: 'Receives the Lightning Flash from Kether as an unfiltered ray — immediate, blazing. On the Pillar of Mercy, Chokmah transmits this fire to Binah (which gives it form) and to Chesed (which expands it). It is the Supernal Father.',
    serpentOfWisdom: 'Reflects the Serpent of Wisdom back to Kether: all wisdom gathered through manifestation returns to the source, enriching the Divine Mind. The Wisdom that descended returns as deep gnosis — "As Above, So Below."',
    practice: 'INVOKE and AMPLIFY at Chokmah expand the flow on the Pillar of Mercy. Observe how its charge feeds Chesed below. High charge here accelerates the Lightning Flash.',
  },
  binah: {
    world: 'Atziluth — Archetypal Plane',
    plane: 'Saturnian Sphere',
    divineName: 'YHVH Elohim — the formative divine principle',
    archangel: 'Tzaphkiel — Beholder of God',
    gdGrade: '8°=3□ Magister Templi',
    planet: 'Saturn — limitation, form and time',
    body: 'Left hemisphere — structure and reason',
    color: '#5055a0',
    summary: 'Understanding — the Great Mother, the womb in which all forms are gestated. Across the Abyss.',
    spiritual: 'Binah is the Supernal Mother who gives birth to all forms. She is both Aima (the Bright Mother) and Ama (the Dark Mother). The Magister Templi has crossed the Abyss and surrendered all to the Cup of Babalon. Saturn gives her dominion over time and boundary — without Binah, nothing could take shape, and therefore nothing could exist. She is the Great Sea, the root of Water.',
    lightningFlash: 'Receives the Lightning Flash from Kether and Chokmah. Binah "gives birth" to forms: here the formless light gains structure that will descend through the worlds. It is the first "No" that creates boundaries and makes existence possible.',
    serpentOfWisdom: 'Receiving the Serpent of Wisdom from below, Binah recognizes the completed patterns — full "understanding" of the cycle. She seals the comprehension before passing it to Kether: all experience understood and integrated.',
    practice: 'MEMORY and SEAL at Binah crystallize patterns. CLOSE_GATE here creates structuring limitation. High coherence in Binah means stable forms flowing through the Tree.',
  },
  chesed: {
    world: 'Beriah — Creative Plane',
    plane: 'Jovian Sphere',
    divineName: 'El — God of Grace and Abundance',
    archangel: 'Tzadkiel — Righteousness of God',
    gdGrade: '7°=4□ Adeptus Exemptus',
    planet: 'Jupiter — expansion, blessing and abundance',
    body: 'Right arm — the arm that gives',
    color: '#6090d0',
    summary: 'Mercy — unconditional love, expansion and divine grace. The benevolent King.',
    spiritual: 'Chesed is divine love in its most generous form — the Adeptus Exemptus embodies this masterful compassion. The archetype of the benevolent ruler who gives freely. In the Golden Dawn, this is where the Adept begins to command the forces below with wisdom. Without Geburah to balance it, Chesed would become infinite indulgence, dissolving all structure.',
    lightningFlash: 'Receives the Lightning Flash from the Supernals via direct path. On the Pillar of Mercy, Chesed expands the flow of light, making it more accessible and abundant for the lower Sephiroth.',
    serpentOfWisdom: 'Chesed reflects the ascending Serpent as accumulated love and compassion — all experience of giving and receiving returns as gratitude to the Creator. Human love is the ascending light — divine grace reflected back.',
    practice: 'AMPLIFY at Chesed expands flow for the entire Mercy column. Balance with Geburah via path 19 (Strength/Lust). High charge here benefits Netzach and Tiphereth.',
  },
  geburah: {
    world: 'Beriah — Creative Plane',
    plane: 'Martian Sphere',
    divineName: 'Elohim Gibor — God of Strength and Judgment',
    archangel: 'Khamael — Burner of God',
    gdGrade: '6°=5□ Adeptus Major',
    planet: 'Mars — strength, courage and delimitation',
    body: 'Left arm — the arm that cuts',
    color: '#c03030',
    summary: 'Severity — strength, justice and the necessary limitation that gives meaning to existence.',
    spiritual: 'Geburah is the divine principle of restriction and justice. What Chesed expands, Geburah delimits. The Adeptus Major wields the Sword of discernment. Also called Pachad (Fear) or Din (Judgment) — not cruelty, but precision. As the alchemists say, solve et coagula: Geburah is the "solve," the dissolution of the unnecessary.',
    lightningFlash: 'Receives the Lightning Flash from Binah and Chesed. Geburah "cuts" and refines the light, removing what is not essential — like the smith forging steel with fire and hammer. The light passing through Geburah becomes more concentrated and powerful.',
    serpentOfWisdom: 'Geburah reflects the ascending Serpent as discernment and clarity. The power to distinguish, to judge wisely, to say "no" when needed — all returns to the Source as purity. What was pruned was limiting growth.',
    practice: 'CUT and BANISH at Geburah remove blockages. SHOCK for strong interventions. High tension here may indicate excessive severity — balance with Chesed via path 19.',
  },
  tiphereth: {
    world: 'Beriah — Creative Plane',
    plane: 'Solar Sphere',
    divineName: 'YHVH Eloah va-Daath — the Mediator',
    archangel: 'Raphael — Healer of God',
    gdGrade: '5°=6□ Adeptus Minor',
    planet: 'Sun — the center, beauty, harmony',
    body: 'Heart and chest — the vital center',
    color: '#e8c830',
    summary: 'Beauty — heart of the Tree, point of perfect balance between the Lightning Flash and the Serpent of Wisdom.',
    spiritual: 'Tiphereth is the Sun of the Tree of Life — the center where ALL forces equilibrate. It is the meeting point of the descending Lightning Flash and the ascending Serpent of Wisdom. The Adeptus Minor stands at the crossroads of the universe. It corresponds to the solar archetype — Osiris, the Christos, the resurrected King. The Great Work of the Golden Dawn centers here: "To know, to will, to dare, to keep silence."',
    lightningFlash: 'Tiphereth is the CENTER of the descending flow. All light from Kether, Chokmah, Binah, Chesed and Geburah converges here — like sunlight illuminating all planets from the center.',
    serpentOfWisdom: 'Tiphereth is the TURNING POINT of the Serpent of Wisdom. Here the light received from Netzach, Hod and Yesod is transmuted and elevated. The heart that has integrated all experience of the lower worlds begins the great return. This is the "Fiat LVX" of the ascending light.',
    practice: 'BALANCE and INTEGRATE at Tiphereth affect the entire Tree. This is the most important hub. AMPLIFY here has global effect. Observe how its charge synchronizes with Kether above and Yesod below.',
  },
  netzach: {
    world: 'Yetzirah — Formative Plane',
    plane: 'Venusian Sphere',
    divineName: 'YHVH Tzabaoth — Lord of Hosts',
    archangel: 'Haniel — Grace of God',
    gdGrade: '4°=7□ Philosophus',
    planet: 'Venus — beauty, desire, instinct and nature',
    body: 'Right hip — the generative force',
    color: '#50a840',
    summary: 'Victory — instinct, emotion, the force of nature and the persistence of divine desire.',
    spiritual: 'Netzach is the realm of emotions, wild nature, sensory beauty and instinct. The Philosophus grade explores the fire of desire and passion. It is where the nature deities dwell — archetypes, elementals, natural forces. The "victory" is the persistence of divine will to manifest. In astral vision, Netzach reveals the green ray of creative force.',
    lightningFlash: 'Receives the Lightning Flash from Chesed, Tiphereth and partially from Geburah. Here the light becomes emotional and instinctive — it is the "feeling" of Creation, the divine pleasure in its works.',
    serpentOfWisdom: 'Netzach reflects the ascending Serpent as love for creation, beauty and instinctive gratitude. The purest emotions — awe, ecstasy, love of life — flow back to the Source. Human desire for the Divine is the ascending Serpent of Netzach.',
    practice: 'INVOKE at Netzach releases creative expression and emotional flow. AMPLIFY here empowers the entire lower Mercy column. Observe how it feeds Hod via path 27 (The Tower).',
  },
  hod: {
    world: 'Yetzirah — Formative Plane',
    plane: 'Mercurial Sphere',
    divineName: 'Elohim Tzabaoth — God of Form and Order',
    archangel: 'Michael — Who is like God',
    gdGrade: '3°=8□ Practicus',
    planet: 'Mercury — communication, reason and analysis',
    body: 'Left hip — analytical precision',
    color: '#b06820',
    summary: 'Splendor — intellect, language, analysis and the gift of naming. The domain of ceremonial magic.',
    spiritual: 'Hod is the rational faculty, the gift of language and analysis. The Practicus works with the Water element and the structured mind. It is where magicians and scientists operate — transforming experience into structured knowledge. Hod is the seat of ceremonial magic in the Golden Dawn system — ritual, formulae, vibration of divine names. It complements Netzach: where Netzach feels, Hod analyzes.',
    lightningFlash: 'Receives the Lightning Flash from Geburah, Tiphereth and Netzach. Here the light gains precision and articulation — becoming thought, language, intellectual form.',
    serpentOfWisdom: 'Hod reflects the ascending Serpent as structured comprehension — maps, models and languages returning to the Divine. All human knowledge is the ascending light of Hod: the human mind reflecting the cosmic mind back to the Source.',
    practice: 'CLARIFY and MEMORY at Hod structure intellectual patterns. BRIDGE connects Hod to Netzach for balancing reason and emotion. High memory here means consolidated cognitive patterns.',
  },
  yesod: {
    world: 'Yetzirah — Formative Plane',
    plane: 'Lunar Sphere',
    divineName: 'Shaddai El Chai — the Almighty Living God',
    archangel: 'Gabriel — Strength of God',
    gdGrade: '2°=9□ Theoricus',
    planet: 'Moon — reflection, the unconscious and cycles',
    body: 'Reproductive organs — the vital foundation',
    color: '#8060c0',
    summary: 'The Foundation — the astral plane, the collective unconscious, the mould of reality.',
    spiritual: 'Yesod is the intermediate plane between spirit and matter — the astral light. The Theoricus explores this lunar realm of vision and imagination. It is the foundation upon which Malkuth rests. It corresponds to the astral body, dreams and the Akashic memory. The Moon governs Yesod: cycles, tides, the hidden rhythm of reality. In astral travel, Yesod is the first sphere encountered.',
    lightningFlash: 'Receives the Lightning Flash from Tiphereth, Netzach and Hod. Here spiritual light compresses into etheric patterns that will manifest in Malkuth. Yesod is the "mould" of physical reality — everything in Malkuth first exists in Yesod.',
    serpentOfWisdom: 'Yesod reflects the ascending Serpent as collective memory and dreams — all human experience accumulates here before being elevated. It is the great reservoir of ascending light: it purifies and concentrates the returning current before sending it to Tiphereth.',
    practice: 'MEMORY at Yesod strengthens the foundation of the entire Tree. RITUAL_PULSE creates waves affecting Malkuth and Tiphereth simultaneously. High coherence here means Malkuth manifests clearly.',
  },
  malkuth: {
    world: 'Assiah — Material Plane',
    plane: 'The Sphere of the Elements',
    divineName: 'Adonai ha-Aretz — Lord of Earth',
    archangel: 'Sandalphon — Co-Brother',
    gdGrade: '1°=10□ Zelator',
    planet: 'Earth — the physical world fully manifest',
    body: 'The feet and base — connection to earth',
    color: '#806040',
    summary: 'The Kingdom — the physical world, the lowest point and simultaneously the starting point of the return.',
    spiritual: 'Malkuth is the world we inhabit — the kingdom of matter, body and the senses. The Zelator stands at the gate of the mysteries. It is where all spiritual light manifests as concrete reality. It is both the lowest point of descent and the STARTING POINT of the Serpent of Wisdom. "The stone the builders rejected has become the cornerstone." In the Hermetic tradition, matter is not fallen — it is Spirit made dense. The Great Work begins in Malkuth.',
    lightningFlash: 'Malkuth is the FINAL DESTINATION of the Lightning Flash. All divine light, after traversing the 10 Sephiroth, manifests here as physical reality. When Malkuth is "full" of charge, the Lightning Flash has completed its journey of descent.',
    serpentOfWisdom: 'Malkuth is the SOURCE of the Serpent of Wisdom! When Malkuth\'s charge reaches fullness, conscious matter recognizes its divine origin and light begins to reflect upward. When Malkuth exceeds 50% charge, VIOLET PARTICLES begin to RISE through the Tree — the ascending Serpent in action. This symbolizes spiritual awakening, the beginning of the Great Work — the Magnum Opus.',
    practice: 'Watch Malkuth with special attention. When its charge rises, the Serpent of Wisdom activates — violet particles ascend the Tree. Apply RITUAL_PULSE here to create return waves. AMPLIFY accelerates the ascent. This is the point of greatest spiritual significance.',
  },
};

const LVX_LORE = {
  title: 'The Limitless Light — LVX',
  text: 'Before Kether, there is the Ain Soph Aur: the Limitless Light. It is the absolute unconditioned, beyond any form or description. In the Hermetic tradition, this is the source of all — the hidden root from which the Tree springs. "That which is Above is as that which is Below, and that which is Below is as that which is Above, to accomplish the miracle of the One Thing." — The Emerald Tablet.',
};

const LIGHTNING_FLASH_LORE = {
  title: 'Lightning Flash ↓ — Descending Light',
  text: 'The Lightning Flash descends from the Limitless Light through all 10 Sephiroth. Each Sephirah receives, transforms and passes the current onward. The descent ends in Malkuth — spirit fully manifest as matter. In visualization: golden/colored particles descending along the paths. This is the involutionary current — the descent of the divine into manifestation.',
};

const SERPENT_LORE = {
  title: 'Serpent of Wisdom ↑ — Ascending Light',
  text: 'When the Lightning Flash reaches Malkuth, matter awakens to its divine origin and reflects light back upward — the Serpent of Wisdom. This ascending current returns purified by the complete experience of Creation. It is the foundation of all spiritual practice: the adept as a mirror reflecting light back to the Source. In visualization: violet particles rising along the paths. This is the evolutionary current — the Great Work of return.',
};

const GREAT_WORK_LORE = {
  title: 'The Great Work — Magnum Opus',
  text: 'When the Lightning Flash and the Serpent of Wisdom flow in simultaneous equilibrium — light descending and returning in harmony — the Great Work is accomplished. Each conscious act that elevates light from matter to spirit is an act of alchemy. The Tree in perfect balance represents the completed Magnum Opus. As the alchemists say: "Visita Interiora Terrae Rectificando Invenies Occultum Lapidem" — V.I.T.R.I.O.L.',
};

const FOUR_WORLDS = [
  { name: 'Atziluth', heb: 'אֲצִילוּת', meaning: 'Archetypal', sephirot: 'Kether, Chokmah, Binah', desc: 'The world of archetypes — divine emanation in its purest form. Here the light is nearly identical to the Source. The realm of the Supernals, beyond the Abyss.' },
  { name: 'Beriah', heb: 'בְּרִיאָה', meaning: 'Creative', sephirot: 'Chesed, Geburah, Tiphereth', desc: 'The creative world — archetypal forces differentiated into patterns. The realm of the Adept grades. Here the Great Work is consciously undertaken.' },
  { name: 'Yetzirah', heb: 'יְצִירָה', meaning: 'Formative', sephirot: 'Netzach, Hod, Yesod', desc: 'The astral/formative world — etheric patterns that mould physical reality. The realm of astral vision, ceremonial magic and elemental forces.' },
  { name: 'Assiah', heb: 'עֲשִׂיָּה', meaning: 'Material', sephirot: 'Malkuth', desc: 'The manifest physical world — action, matter, the kingdom we inhabit. The starting point of the Great Work and the ground of the Temple.' },
];

// ── Mystical Journey Questions ──────────────────────────────────────────────
const JOURNEY_QUESTIONS = [
  { id: 'q1', text: 'How drawn are you to structure vs. flow?', low: 'Pure flow', high: 'Pure structure', target: 'strictness' },
  { id: 'q2', text: 'Do you seek clarity or embrace mystery?', low: 'Deep mystery', high: 'Crystal clarity', target: 'astralClarity' },
  { id: 'q3', text: 'How intense is your inner fire?', low: 'Gentle ember', high: 'Blazing inferno', target: 'ritualIntensity' },
  { id: 'q4', text: 'Are you more earthly or celestial?', low: 'Rooted in earth', high: 'Dwelling in stars', target: 'earthCelestial' },
  { id: 'q5', text: 'Do you seek power or wisdom?', low: 'Wisdom alone', high: 'Power to act', target: 'powerWisdom' },
  { id: 'q6', text: 'How open are your inner gates?', low: 'Sealed tight', high: 'Wide open', target: 'openness' },
  { id: 'q7', text: 'Do you favor mercy or justice?', low: 'Pure mercy', high: 'Strict justice', target: 'mercyJustice' },
  { id: 'q8', text: 'How deep is your memory of past lives?', low: 'Blank slate', high: 'Ancient soul', target: 'memory' },
  { id: 'q9', text: 'Are you drawn to the sun or moon?', low: 'Silver moon', high: 'Golden sun', target: 'sunMoon' },
  { id: 'q10', text: 'How ready are you to cross the Abyss?', low: 'Not yet', high: 'I am prepared', target: 'abyssCrossing' },
];

interface OrChozerSt {
  level: number;
  greatWorkPulse: number;
  greatWorkFlash: number;
  lightningFlashLevel: number;
}

const DEFAULT_OVERLAYS: Record<TreeOverlay, boolean> = {
  sephiroth: true, paths: true, orYashar: true, orChozer: true,
  pillars: true, aura: true, particles: true, veils: true,
};

export function TreeOfLifeLab({ active }: { active: boolean }) {

  const [params, setParams]     = useState<TreeOfLifeParams>({ ...DEFAULT_PARAMS });
  const paramsRef               = useRef<TreeOfLifeParams>({ ...DEFAULT_PARAMS });
  const stateRef                = useRef<TreeState>(createTree(DEFAULT_PARAMS));
  const [snap, setSnap]         = useState(() => getStateSnapshot(stateRef.current));

  const [running, setRunning]   = useState(true);
  const runRef                  = useRef(true);
  const rafRef                  = useRef(0);
  const lastTRef                = useRef(0);

  const canvasRef               = useRef<HTMLCanvasElement>(null);
  const [csz, setCsz]           = useState({ w: 800, h: 600 });
  const [fullscreen, setFullscreen] = useState(false);

  const camRef  = useRef<Camera>({ zoom: 1, px: 0, py: 0 });
  const dragRef = useRef<{ active: boolean; sx: number; sy: number; opx: number; opy: number }>({
    active: false, sx: 0, sy: 0, opx: 0, opy: 0,
  });

  const orbitsRef  = useRef<Map<SephirahId, OrbitP[]>>(new Map());
  const streamsRef = useRef<Map<number, StreamP[]>>(new Map());
  const serpentStreamsRef = useRef<Map<number, StreamP[]>>(new Map());
  const spawnT     = useRef<Map<number, number>>(new Map());
  const spawnTSerpent = useRef<Map<number, number>>(new Map());

  const serpentRef = useRef<OrChozerSt>({ level: 0, greatWorkPulse: 0, greatWorkFlash: 0, lightningFlashLevel: 0 });
  const [serpentSnap, setSerpentSnap] = useState<OrChozerSt>({ level: 0, greatWorkPulse: 0, greatWorkFlash: 0, lightningFlashLevel: 0 });

  const fxRef  = useRef<Fx[]>([]);
  const nodeActivatedRef = useRef<Map<SephirahId, number>>(new Map());
  const pathActivatedRef = useRef<Map<number, number>>(new Map());

  const [hoveredSeph, setHoveredSeph]   = useState<SephirahId | null>(null);
  const [hoveredPath, setHoveredPath]   = useState<number | null>(null);
  const [hoverPos, setHoverPos]         = useState({ x: 0, y: 0 });
  const [selectedSeph, setSelectedSeph] = useState<SephirahId | null>(null);
  const [selectedPath, setSelectedPath] = useState<number | null>(null);

  const [hand, setHand]               = useState<{ id: number; reversed: boolean }[]>([]);
  const [selectedCard, setSelectedCard] = useState<{ id: number; reversed: boolean } | null>(null);
  const [events, setEvents]           = useState<TreeEvent[]>([]);

  const [chapters, setChapters]   = useState<GrimoireChapter[]>(() => loadGrimoire());
  const [rightTab, setRightTab]   = useState<'journey' | 'grimoire' | 'glossary'>('journey');
  const [advOpen, setAdvOpen]     = useState(false);
  const pendingPlays              = useRef<CardPlay[]>([]);
  const snapBefore                = useRef(getStateSnapshot(stateRef.current));

  const [activeTool, setActiveTool] = useState<RitualToolId>('select');
  const [overlays, setOverlays] = useState<Record<TreeOverlay, boolean>>({ ...DEFAULT_OVERLAYS });
  const overlaysRef = useRef<Record<TreeOverlay, boolean>>({ ...DEFAULT_OVERLAYS });
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [journeyAnswers, setJourneyAnswers] = useState<Record<string, number>>(() => {
    const ans: Record<string, number> = {};
    for (const q of JOURNEY_QUESTIONS) ans[q.id] = 0.5;
    return ans;
  });

  useEffect(() => { overlaysRef.current = overlays; }, [overlays]);

  const toggleOverlay = useCallback((key: TreeOverlay) => {
    setOverlays(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const initParticles = useCallback(() => {
    const o = orbitsRef.current;
    const s = streamsRef.current;
    const sc = serpentStreamsRef.current;
    o.clear(); s.clear(); sc.clear();
    spawnT.current.clear(); spawnTSerpent.current.clear();

    for (const seph of SEPHIROT) {
      const cnt = 8 + Math.round(Math.random() * 4);
      o.set(seph.id, Array.from({ length: cnt }, (_, i) => ({
        angle:  (i / cnt) * TWO_PI + Math.random() * 0.3,
        angVel: (0.5 + Math.random() * 0.6) * (Math.random() > 0.5 ? 1 : -1),
        radius: NODE_R * 1.4 + Math.random() * NODE_R * 0.6,
        alpha:  0.4 + Math.random() * 0.5,
      })));
    }
    for (const p of PATHS) {
      s.set(p.pathId, []);
      sc.set(p.pathId, []);
      spawnT.current.set(p.pathId, Math.random());
      spawnTSerpent.current.set(p.pathId, Math.random() * 0.5);
    }
  }, []);

  useEffect(() => { initParticles(); }, []);

  useEffect(() => {
    const container = canvasRef.current?.parentElement;
    if (!container) return;
    const apply = (w: number, h: number) => setCsz({ w: Math.max(1, Math.floor(w)), h: Math.max(1, Math.floor(h)) });
    apply(container.clientWidth, container.clientHeight);
    const ro = new ResizeObserver(e => { for (const v of e) apply(v.contentRect.width, v.contentRect.height); });
    ro.observe(container);
    return () => ro.disconnect();
  }, [fullscreen]);

  useEffect(() => { paramsRef.current = params; }, [params]);
  useEffect(() => { runRef.current = running; }, [running]);

  // ── RAF loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    let frame = 0;

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const rawDt = Math.min((now - lastTRef.current) / 1000, 0.1);
      lastTRef.current = now;
      const dt = rawDt * paramsRef.current.speed;

      if (runRef.current) {
        stepTree(stateRef.current, dt, paramsRef.current);

        if (stateRef.current.events.length > 0) {
          setEvents(prev => {
            const merged = [...prev, ...stateRef.current.events].slice(-40);
            stateRef.current.events = [];
            return merged;
          });
        }
        if (frame % 25 === 0) setSnap(getStateSnapshot(stateRef.current));
      }

      for (const [k, v] of nodeActivatedRef.current) nodeActivatedRef.current.set(k, v + dt);
      for (const [k, v] of pathActivatedRef.current) pathActivatedRef.current.set(k, v + dt);

      stepParticlesAndSerpent(dt, stateRef.current);

      fxRef.current = fxRef.current
        .map(f => ({ ...f, age: f.age + dt }))
        .filter(f => f.age < f.life);

      if (frame % 20 === 0) setSerpentSnap({ ...serpentRef.current });

      render(canvasRef.current, stateRef.current, paramsRef.current,
             camRef.current, fxRef.current, orbitsRef.current, streamsRef.current,
             serpentStreamsRef.current, serpentRef.current,
             selectedSeph, selectedPath, nodeActivatedRef.current, pathActivatedRef.current,
             overlaysRef.current);
      frame++;
    };

    lastTRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, selectedSeph, selectedPath]);

  // ── Particle step — Lightning Flash (down) + Serpent of Wisdom (up) ───────
  function stepParticlesAndSerpent(dt: number, state: TreeState) {
    const orbits  = orbitsRef.current;
    const streams = streamsRef.current;
    const serpentS = serpentStreamsRef.current;

    for (const seph of SEPHIROT) {
      const ps = orbits.get(seph.id);
      if (!ps) continue;
      const s = state.sephirot.get(seph.id)!;
      const speedMult = 0.6 + s.charge * 0.8 + s.tension * 0.4;
      for (const p of ps) {
        p.angle += p.angVel * speedMult * dt;
        p.radius = NODE_R * (1.4 + s.coherence * 0.5) + Math.sin(p.angle * 3) * 4;
        p.alpha  = 0.25 + s.charge * 0.5;
      }
    }

    const malkuth = state.sephirot.get('malkuth')!;
    const kether  = state.sephirot.get('kether')!;
    const tiphereth = state.sephirot.get('tiphereth')!;
    const targetSerpent = Math.max(0, malkuth.charge - 0.35) * (1 / 0.65);
    const oc = serpentRef.current;
    oc.level = oc.level + (targetSerpent - oc.level) * dt * 0.8;

    const topMean = (kether.charge + (state.sephirot.get('chokmah')?.charge ?? 0) + (state.sephirot.get('binah')?.charge ?? 0)) / 3;
    oc.lightningFlashLevel = oc.lightningFlashLevel + (topMean - oc.lightningFlashLevel) * dt * 0.6;

    const gwTarget = oc.level > 0.4 && oc.lightningFlashLevel > 0.4
      ? Math.min(oc.level, oc.lightningFlashLevel) * tiphereth.coherence
      : 0;
    oc.greatWorkPulse = oc.greatWorkPulse + (gwTarget - oc.greatWorkPulse) * dt * 0.5;
    if (oc.greatWorkFlash > 0) oc.greatWorkFlash = Math.max(0, oc.greatWorkFlash - dt);

    if (oc.greatWorkPulse > 0.6 && Math.random() < dt * 0.3) {
      oc.greatWorkFlash = 1.2;
      fxRef.current.push({ kind: 'ripple', wx: wx(0.5), wy: wy(0.52), color: '#c080ff', age: 0, life: 2.0, r: 200 });
    }

    for (const path of PATHS) {
      const pathS  = state.paths.get(path.pathId)!;
      const ps     = streams.get(path.pathId)!;
      const flow   = pathS.flow;
      const block  = pathS.blockage;
      const maxT   = 1 - block;

      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.t += p.speed * dt;
        if (p.t > maxT) {
          ps.splice(i, 1);
          const dest = state.sephirot.get(path.to);
          if (dest) dest.charge = Math.min(1, dest.charge + 0.008);
        }
      }

      if (flow > 0.05) {
        const rate = 1 / (flow * 5 + 0.5);
        const timer = spawnT.current.get(path.pathId)! + dt;
        spawnT.current.set(path.pathId, timer);
        if (timer > rate && ps.length < 14) {
          spawnT.current.set(path.pathId, 0);
          ps.push({ t: 0, speed: 0.18 + flow * 0.22 + (Math.random() - 0.5) * 0.05, size: 1.8 + flow * 2.0 + Math.random() * 1.2, energy: 0.5 + flow * 0.5 });
        }
      }

      const cps = serpentS.get(path.pathId)!;
      const serpentFlow = oc.level * flow;

      for (let i = cps.length - 1; i >= 0; i--) {
        const p = cps[i];
        p.t += p.speed * dt;
        if (p.t > 1) {
          cps.splice(i, 1);
          const src = state.sephirot.get(path.from);
          if (src) src.coherence = Math.min(1, src.coherence + 0.004);
        }
      }

      if (serpentFlow > 0.08) {
        const serpentRate = 1 / (serpentFlow * 4 + 0.3);
        const ctimer = spawnTSerpent.current.get(path.pathId)! + dt;
        spawnTSerpent.current.set(path.pathId, ctimer);
        if (ctimer > serpentRate && cps.length < 10) {
          spawnTSerpent.current.set(path.pathId, 0);
          cps.push({ t: 0, speed: 0.12 + serpentFlow * 0.18 + (Math.random() - 0.5) * 0.04, size: 1.5 + serpentFlow * 1.8 + Math.random() * 1.0, energy: 0.4 + serpentFlow * 0.5 });
        }
      }
    }
  }

  // ── Play card ─────────────────────────────────────────────────────────────
  const playCard = useCallback((card: { id: number; reversed: boolean },
    targetType: TargetType, targetId: SephirahId | number | 'global') => {

    const play: CardPlay = {
      arcanaId: card.id, reversed: card.reversed,
      targetType, targetId, timestamp: Date.now(),
      lensId: paramsRef.current.deckLens,
    };
    snapBefore.current = getStateSnapshot(stateRef.current);
    applyCard(stateRef.current, play, paramsRef.current);
    pendingPlays.current.push(play);
    setSelectedCard(null);
    setSnap(getStateSnapshot(stateRef.current));

    const arcana = ARCANA_MAP.get(card.id)!;
    spawnEffect(arcana.operator.primary, targetType, targetId);
    setTimeout(() => closeChapter(), 500);
  }, []);

  function spawnEffect(op: string, tt: TargetType, tid: SephirahId | number | 'global') {
    let ex = 0, ey = 0;
    if (tt === 'sephirah') {
      const s = SEPHIRAH_MAP.get(tid as SephirahId)!;
      ex = wx(s.nx); ey = wy(s.ny);
      nodeActivatedRef.current.set(tid as SephirahId, 0);
    } else if (tt === 'path') {
      const p = PATH_MAP.get(tid as number)!;
      const fs = SEPHIRAH_MAP.get(p.from)!, ts = SEPHIRAH_MAP.get(p.to)!;
      ex = (wx(fs.nx) + wx(ts.nx)) / 2; ey = (wy(fs.ny) + wy(ts.ny)) / 2;
      pathActivatedRef.current.set(tid as number, 0);
    } else {
      for (const s of SEPHIROT) nodeActivatedRef.current.set(s.id, 0);
    }

    const opColors: Record<string, string> = {
      AMPLIFY: '#ffd060', SHOCK: '#ff6040', CUT: '#ff4040',
      OPEN_GATE: '#60ff90', CLOSE_GATE: '#ff8060', BALANCE: '#60d0ff',
      CONVERGE: '#a060ff', CLARIFY: '#ffffff', INTEGRATE: '#c0ff80',
      SILENCE: '#6080ff', RITUAL_PULSE: '#ff80ff',
      INVOKE: '#ffd060', BANISH: '#ff6040', TRANSMUTE: '#a78bfa', SEAL: '#34d399',
    };
    const color = opColors[op] ?? '#c0c0ff';
    const kind: Fx['kind'] = op === 'SHOCK' ? 'burst' : op === 'CUT' ? 'dissolve' : 'ripple';
    fxRef.current.push({ kind, wx: ex, wy: ey, color, age: 0, life: 1.2, r: 60 });
  }

  const closeChapter = useCallback(() => {
    if (pendingPlays.current.length === 0) return;
    const sn = getStateSnapshot(stateRef.current);
    const bef = snapBefore.current;
    const plays = [...pendingPlays.current];
    pendingPlays.current = [];

    const lens = DECK_LENS_MAP.get(paramsRef.current.deckLens)!;
    const card = plays[0];
    const ld = card ? lens.majors[card.arcanaId] : null;
    const rev = card?.reversed ? ' (inv)' : '';
    const text = ld
      ? `${ld.name}${rev} → ${card.targetType === 'global' ? 'global' : card.targetId}. ` +
        `${ld.keywords.join(', ')}. Coh ${(sn.coherence * 100).toFixed(0)}%, Ten ${(sn.tension * 100).toFixed(0)}%.`
      : 'Session recorded.';

    const ch: GrimoireChapter = {
      id: Date.now().toString(), timestamp: Date.now(),
      lens: paramsRef.current.deckLens, preset: paramsRef.current.preset,
      cards: plays, snapshot: sn,
      deltas: {
        coherence: sn.coherence - bef.coherence,
        tension:   sn.tension - bef.tension,
        memory:    sn.memory - bef.memory,
        openness:  sn.openness - bef.openness,
        novelty:   sn.novelty - bef.novelty,
      },
      tags: plays.flatMap(p => {
        const ar = ARCANA_MAP.get(p.arcanaId);
        if (!ar) return [];
        return [p.reversed ? ar.operator.reversed.primary : ar.operator.primary];
      }),
      text,
    };
    setChapters(prev => { const next = [...prev, ch]; saveGrimoire(next); return next; });
  }, []);

  // ── Mouse events ──────────────────────────────────────────────────────────
  const screenToWorld = (sx: number, sy: number, W: number, H: number) => ({
    x: (sx - W / 2 - camRef.current.px) / camRef.current.zoom,
    y: (sy - H / 2 - camRef.current.py) / camRef.current.zoom,
  });

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const W = canvas.width, H = canvas.height;
    const factor = e.deltaY < 0 ? 1.13 : 1 / 1.13;
    const nz = Math.max(0.2, Math.min(4, camRef.current.zoom * factor));
    const npx = mx - W / 2 - (mx - W / 2 - camRef.current.px) * nz / camRef.current.zoom;
    const npy = my - H / 2 - (my - H / 2 - camRef.current.py) * nz / camRef.current.zoom;
    camRef.current = { zoom: nz, px: npx, py: npy };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      dragRef.current = { active: true, sx: e.clientX, sy: e.clientY,
        opx: camRef.current.px, opy: camRef.current.py };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const sy = (e.clientY - rect.top)  * (canvas.height / rect.height);

    if (dragRef.current.active) {
      const dx = e.clientX - dragRef.current.sx;
      const dy = e.clientY - dragRef.current.sy;
      camRef.current = { ...camRef.current, px: dragRef.current.opx + dx, py: dragRef.current.opy + dy };
    }

    const W = canvas.width, H = canvas.height;
    const wp = screenToWorld(sx, sy, W, H);
    setHoverPos({ x: e.clientX, y: e.clientY });

    let foundSeph: SephirahId | null = null;
    let foundPath: number | null = null;

    for (const s of SEPHIROT) {
      const dx = wp.x - wx(s.nx), dy = wp.y - wy(s.ny);
      if (dx * dx + dy * dy < (NODE_R + 8) * (NODE_R + 8)) { foundSeph = s.id; break; }
    }

    if (!foundSeph) {
      for (const path of PATHS) {
        const f = SEPHIRAH_MAP.get(path.from)!, t = SEPHIRAH_MAP.get(path.to)!;
        const fx2 = wx(f.nx), fy2 = wy(f.ny), tx2 = wx(t.nx), ty2 = wy(t.ny);
        const cp = ctrlPt(fx2, fy2, tx2, ty2);
        for (let ti = 0; ti <= 10; ti++) {
          const p = bz(ti / 10, fx2, fy2, cp.x, cp.y, tx2, ty2);
          const dx = wp.x - p.x, dy = wp.y - p.y;
          if (dx * dx + dy * dy < 80) { foundPath = path.pathId; break; }
        }
        if (foundPath !== null) break;
      }
    }

    setHoveredSeph(foundSeph);
    setHoveredPath(foundPath);
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const wasDragging = dragRef.current.active &&
      (Math.abs(e.clientX - dragRef.current.sx) > 5 || Math.abs(e.clientY - dragRef.current.sy) > 5);
    dragRef.current.active = false;
    if (wasDragging) return;

    const tool = activeTool;

    if (tool === 'select' || tool === 'drag') {
      if (hoveredSeph) {
        if (selectedCard) {
          playCard(selectedCard, 'sephirah', hoveredSeph);
          setSelectedSeph(hoveredSeph); setSelectedPath(null);
        } else {
          setSelectedSeph(hoveredSeph === selectedSeph ? null : hoveredSeph);
          setSelectedPath(null);
          setRightTab('journey');
        }
      } else if (hoveredPath !== null) {
        if (selectedCard) {
          playCard(selectedCard, 'path', hoveredPath);
          setSelectedPath(hoveredPath); setSelectedSeph(null);
        } else {
          setSelectedPath(hoveredPath === selectedPath ? null : hoveredPath);
          setSelectedSeph(null);
          setRightTab('journey');
        }
      } else {
        setSelectedSeph(null); setSelectedPath(null);
      }
    } else {
      if (hoveredSeph) {
        applyRitualTool(stateRef.current, tool, hoveredSeph, 'sephirah', paramsRef.current);
        nodeActivatedRef.current.set(hoveredSeph, 0);
        spawnEffect(tool.toUpperCase(), 'sephirah', hoveredSeph);
        setSnap(getStateSnapshot(stateRef.current));
        setSelectedSeph(hoveredSeph);
        setSelectedPath(null);
      } else if (hoveredPath !== null) {
        applyRitualTool(stateRef.current, tool, hoveredPath, 'path', paramsRef.current);
        pathActivatedRef.current.set(hoveredPath, 0);
        spawnEffect(tool.toUpperCase(), 'path', hoveredPath);
        setSnap(getStateSnapshot(stateRef.current));
        setSelectedPath(hoveredPath);
        setSelectedSeph(null);
      }
    }
  }, [hoveredSeph, hoveredPath, selectedCard, selectedSeph, selectedPath, playCard, activeTool]);

  const handleReset = useCallback(() => {
    resetTree(stateRef.current, paramsRef.current);
    initParticles();
    serpentRef.current = { level: 0, greatWorkPulse: 0, greatWorkFlash: 0, lightningFlashLevel: 0 };
    setSnap(getStateSnapshot(stateRef.current));
    setSelectedSeph(null); setSelectedPath(null);
    setHand(drawHand(paramsRef.current.drawRate));
    setSelectedCard(null);
  }, [initParticles]);

  const applyPreset = useCallback((preset: typeof JOURNEY_PRESETS[0]) => {
    const next: TreeOfLifeParams = {
      ...paramsRef.current, preset: preset.id, drawRate: preset.drawRate,
      strictness: preset.strictness, veilsEnabled: preset.veilsEnabled,
      pillarsEnabled: preset.pillarsEnabled,
    };
    setParams(next); paramsRef.current = next;
    resetTree(stateRef.current, next);
    for (const [id, ov] of Object.entries(preset.initialState)) {
      const s = stateRef.current.sephirot.get(id as SephirahId);
      if (s) Object.assign(s, ov);
    }
    initParticles();
    setSnap(getStateSnapshot(stateRef.current));
    setHand(drawHand(next.drawRate));
  }, [initParticles]);

  const updateParams = useCallback((update: Partial<TreeOfLifeParams>) => {
    setParams(prev => {
      const next = { ...prev, ...update };
      paramsRef.current = next;
      stateRef.current.veilsEnabled   = next.veilsEnabled;
      stateRef.current.pillarsEnabled = next.pillarsEnabled;
      return next;
    });
  }, []);

  const applyJourneyAnswers = useCallback(() => {
    const a = journeyAnswers;
    const next: TreeOfLifeParams = {
      ...paramsRef.current,
      preset: 'mystical_journey',
      strictness: a.q1,
      astralClarity: a.q2,
      ritualIntensity: a.q3,
      veilsEnabled: a.q10 > 0.6,
      pillarsEnabled: true,
      speed: 1.0,
    };
    setParams(next); paramsRef.current = next;
    resetTree(stateRef.current, next);

    const st = stateRef.current;
    const malk = st.sephirot.get('malkuth')!;
    malk.charge = 0.3 + (1 - a.q4) * 0.5;
    malk.openness = a.q6;

    const keth = st.sephirot.get('kether')!;
    keth.charge = 0.2 + a.q4 * 0.5;

    const chok = st.sephirot.get('chokmah')!;
    chok.charge = 0.2 + (1 - a.q5) * 0.4;

    const geb = st.sephirot.get('geburah')!;
    geb.charge = 0.2 + a.q5 * 0.4;
    geb.tension = a.q7 * 0.3;

    const ches = st.sephirot.get('chesed')!;
    ches.charge = 0.2 + (1 - a.q7) * 0.4;

    const tiph = st.sephirot.get('tiphereth')!;
    tiph.charge = 0.2 + a.q9 * 0.4;

    const yes = st.sephirot.get('yesod')!;
    yes.charge = 0.2 + (1 - a.q9) * 0.4;

    for (const s of st.sephirot.values()) {
      s.openness = Math.max(s.openness, a.q6 * 0.6);
      s.memory = Math.max(s.memory, a.q8 * 0.4);
    }

    if (a.q10 > 0.5) {
      const bin = st.sephirot.get('binah')!;
      bin.tension = a.q10 * 0.3;
    }

    initParticles();
    setSnap(getStateSnapshot(stateRef.current));
    setHand(drawHand(next.drawRate));
    setShowJourneyModal(false);
  }, [journeyAnswers, initParticles]);

  useEffect(() => { setHand(drawHand(params.drawRate)); }, []);

  if (!active) return null;

  const lens = DECK_LENS_MAP.get(params.deckLens)!;
  const selSephDef   = selectedSeph ? SEPHIRAH_MAP.get(selectedSeph) : null;
  const selSephState = selectedSeph ? stateRef.current.sephirot.get(selectedSeph) : null;
  const selPathDef   = selectedPath !== null ? PATH_MAP.get(selectedPath) : null;
  const selPathArcana = selPathDef ? ARCANA_MAP.get(selPathDef.arcanaId) : null;
  const selPathLens  = selPathArcana ? lens.majors[selPathArcana.id] : null;
  const hovSephDef   = hoveredSeph && hoveredSeph !== selectedSeph ? SEPHIRAH_MAP.get(hoveredSeph) : null;
  const hovPathDef   = hoveredPath !== null && hoveredPath !== selectedPath ? PATH_MAP.get(hoveredPath) : null;

  const containerStyle: React.CSSProperties = fullscreen
    ? { position: 'fixed', inset: 0, zIndex: 100 }
    : { position: 'fixed', inset: 0, top: 38, zIndex: 1 };

  const serpPct = Math.round(serpentSnap.level * 100);
  const lfPct = Math.round(serpentSnap.lightningFlashLevel * 100);
  const gwPct = Math.round(serpentSnap.greatWorkPulse * 100);

  const OVERLAY_LABELS: { key: TreeOverlay; label: string; icon: string }[] = [
    { key: 'sephiroth', label: 'Sephiroth', icon: '◉' },
    { key: 'paths',     label: 'Paths',     icon: '╱' },
    { key: 'orYashar',  label: 'Lightning Flash ↓', icon: '⚡' },
    { key: 'orChozer',  label: 'Serpent ↑', icon: '🐍' },
    { key: 'pillars',   label: 'Pillars',   icon: '☰' },
    { key: 'aura',      label: 'Aura',      icon: '◈' },
    { key: 'particles', label: 'Particles', icon: '✧' },
    { key: 'veils',     label: 'Veils',     icon: '☾' },
  ];

  return (
    <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column',
      background: '#000', fontFamily: 'system-ui, sans-serif' }}>

      {/* Mystical Journey Modal */}
      {showJourneyModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowJourneyModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 440, maxHeight: '85vh', overflowY: 'auto',
            background: 'rgba(10,6,30,0.98)', border: '1px solid rgba(180,120,255,0.3)',
            borderRadius: 12, padding: '24px 28px',
            boxShadow: '0 20px 60px rgba(100,40,180,0.3)',
          }}>
            <div style={{ fontSize: 16, color: 'rgba(240,230,210,0.95)', marginBottom: 4, fontWeight: 500 }}>
              Mystical Journey
            </div>
            <div style={{ fontSize: 9, color: 'rgba(180,160,200,0.5)', marginBottom: 16, lineHeight: 1.5 }}>
              Answer these questions to create a personalized Tree configuration.
              Let your intuition guide you — there are no wrong answers.
            </div>

            {JOURNEY_QUESTIONS.map(q => (
              <div key={q.id} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: 'rgba(210,195,240,0.8)', marginBottom: 6 }}>{q.text}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 7, color: 'rgba(180,160,200,0.4)', width: 60, textAlign: 'right', flexShrink: 0 }}>{q.low}</span>
                  <input type="range" min={0} max={1} step={0.01}
                    value={journeyAnswers[q.id]}
                    onChange={e => setJourneyAnswers(prev => ({ ...prev, [q.id]: parseFloat(e.target.value) }))}
                    style={{ flex: 1, height: 3, accentColor: '#a78bfa', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 7, color: 'rgba(180,160,200,0.4)', width: 60, flexShrink: 0 }}>{q.high}</span>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button title="Aplicar respostas da jornada" onClick={applyJourneyAnswers} style={{
                flex: 1, padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(160,100,255,0.2)', border: '1px solid rgba(180,120,255,0.5)',
                color: 'rgba(220,200,255,0.95)', fontSize: 10, letterSpacing: '0.08em',
              }}>Begin the Journey</button>
              <button title="Cancelar jornada" onClick={() => setShowJourneyModal(false)} style={{
                padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(180,165,150,0.5)', fontSize: 10,
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── LEFT SIDEBAR ───────────────────────────────────────────────── */}
        <div style={{
          width: 210, flexShrink: 0, overflowY: 'auto', scrollbarWidth: 'none',
          background: 'rgba(0,0,0,0.97)', borderRight: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', flexDirection: 'column', padding: '10px 0',
        }}>
          {/* Title */}
          <div style={{ padding: '0 12px 8px' }}>
            <div style={{ fontSize: 6.5, color: 'rgba(180,120,255,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Tree of Life</div>
            <div style={{ fontSize: 13, color: 'rgba(240,230,210,0.9)' }}>Hermetic Qabalah · Tarot</div>
            <div style={{ fontSize: 7.5, color: 'rgba(180,160,200,0.4)', marginTop: 2 }}>Journey through the 10 Sephiroth & 22 Paths</div>
          </div>

          <SBDiv />

          {/* ── RITUAL TOOLS ──────────────────────────────────────────── */}
          <SBSec label="Ritual Tools">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {RITUAL_TOOLS.map(t => (
                <button key={t.id} onClick={() => setActiveTool(t.id)} title={t.desc}
                  style={{
                    width: 30, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 5, cursor: 'pointer', fontSize: 13,
                    background: activeTool === t.id ? `${t.color}25` : 'rgba(255,255,255,0.025)',
                    border: activeTool === t.id ? `1px solid ${t.color}80` : '1px solid rgba(255,255,255,0.06)',
                    color: activeTool === t.id ? t.color : 'rgba(180,165,150,0.35)',
                    transition: 'all 0.15s',
                  }}>
                  {t.icon}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 6, color: 'rgba(180,160,200,0.35)', marginTop: 4 }}>
              {RITUAL_TOOLS.find(t => t.id === activeTool)?.desc ?? ''}
            </div>
          </SBSec>

          <SBDiv />

          {/* ── FLOW OF LIGHT STATUS ──────────────────────────────── */}
          <div style={{ padding: '6px 10px 8px' }}>
            <div style={{ fontSize: 6.5, color: 'rgba(180,120,255,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
              Flow of Light
            </div>

            <div style={{ marginBottom: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 7, color: 'rgba(220,185,80,0.7)', letterSpacing: '0.05em' }}>⬇ Lightning Flash</span>
                <span style={{ fontSize: 7, color: 'rgba(220,185,80,0.8)', fontFamily: 'monospace' }}>{lfPct}%</span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ width: `${lfPct}%`, height: '100%', borderRadius: 2, transition: 'width 0.4s', background: 'linear-gradient(90deg, #c0a040, #ffe080)' }} />
              </div>
            </div>

            <div style={{ marginBottom: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 7, color: 'rgba(160,90,255,0.7)', letterSpacing: '0.05em' }}>⬆ Serpent of Wisdom</span>
                <span style={{ fontSize: 7, color: serpPct > 30 ? '#c080ff' : 'rgba(160,90,255,0.5)', fontFamily: 'monospace' }}>{serpPct}%</span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ width: `${serpPct}%`, height: '100%', borderRadius: 2, transition: 'width 0.4s', background: 'linear-gradient(90deg, #6020c0, #c080ff)' }} />
              </div>
            </div>

            <div style={{
              padding: '4px 7px', borderRadius: 5, marginTop: 4,
              background: gwPct > 40 ? 'rgba(96,20,128,0.15)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${gwPct > 40 ? 'rgba(180,100,255,0.3)' : 'rgba(255,255,255,0.05)'}`,
              transition: 'all 0.5s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 7, color: gwPct > 40 ? 'rgba(210,170,255,0.8)' : 'rgba(170,155,140,0.35)', letterSpacing: '0.05em' }}>
                  ✦ The Great Work
                </span>
                <span style={{ fontSize: 7, fontFamily: 'monospace', color: gwPct > 40 ? '#e0c0ff' : 'rgba(170,155,140,0.3)' }}>{gwPct}%</span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ width: `${gwPct}%`, height: '100%', borderRadius: 2, transition: 'width 0.5s',
                  background: 'linear-gradient(90deg, #8040e0, #e0b0ff, #ffe080)' }} />
              </div>
              {gwPct < 10 && (
                <div style={{ fontSize: 6, color: 'rgba(160,145,130,0.3)', marginTop: 3 }}>
                  Raise Malkuth to activate the Serpent of Wisdom
                </div>
              )}
              {gwPct > 40 && (
                <div style={{ fontSize: 6.5, color: 'rgba(210,170,255,0.7)', marginTop: 3 }}>
                  Magnum Opus in progress — lights in harmony
                </div>
              )}
            </div>
          </div>

          <SBDiv />

          {/* ── OVERLAY TOGGLES ──────────────────────────────────── */}
          <SBSec label="Overlays">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {OVERLAY_LABELS.map(o => (
                <button key={o.key} onClick={() => toggleOverlay(o.key)} title={o.label}
                  style={{
                    padding: '2px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 7,
                    display: 'flex', alignItems: 'center', gap: 3,
                    background: overlays[o.key] ? 'rgba(180,120,255,0.12)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${overlays[o.key] ? 'rgba(180,120,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    color: overlays[o.key] ? 'rgba(210,185,255,0.85)' : 'rgba(170,155,140,0.3)',
                  }}>
                  <span style={{ fontSize: 9 }}>{o.icon}</span> {o.label}
                </button>
              ))}
            </div>
          </SBSec>

          <SBDiv />
          <SBSec label="Tarot Lens" hint="Changes vocabulary and emphasis. Base mechanics identical.">
            {DECK_LENSES.map(dl => (
              <SBLensBtn key={dl.id} active={params.deckLens === dl.id} label={dl.label}
                desc={dl.description.slice(0, 42) + '…'}
                onClick={() => updateParams({ deckLens: dl.id as DeckLensId })} />
            ))}
          </SBSec>

          <SBDiv />
          <SBSec label="Journey Presets">
            <button title="Iniciar jornada mística" onClick={() => setShowJourneyModal(true)} style={{
              width: '100%', padding: '5px 8px', marginBottom: 4, borderRadius: 5, cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(160,80,255,0.12), rgba(220,180,60,0.08))',
              border: '1px solid rgba(180,120,255,0.3)',
              color: 'rgba(220,200,255,0.85)', fontSize: 8, letterSpacing: '0.08em',
              textAlign: 'left',
            }}>
              ✦ Mystical Journey Questionnaire
            </button>
            {JOURNEY_PRESETS.map(p => (
              <button title={`${p.name}: ${p.desc}`} key={p.id} onClick={() => applyPreset(p)} style={{
                display: 'flex', alignItems: 'flex-start', gap: 5, width: '100%',
                padding: '4px 8px', marginBottom: 2, borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                background: params.preset === p.id ? 'rgba(96,20,128,0.18)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${params.preset === p.id ? 'rgba(180,120,255,0.35)' : 'rgba(255,255,255,0.05)'}`,
                color: params.preset === p.id ? 'rgba(210,180,255,0.9)' : 'rgba(180,165,150,0.45)',
              }}>
                <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>{p.emoji}</span>
                <div>
                  <div style={{ fontSize: 8 }}>{p.name}</div>
                  <div style={{ fontSize: 6, opacity: 0.55 }}>{p.description.slice(0, 38)}…</div>
                </div>
              </button>
            ))}
          </SBSec>

          <SBDiv />
          <SBSec label="Parameters">
            <SBSlider label="Strictness" value={params.strictness} onChange={v => updateParams({ strictness: v })} />
            <SBSlider label="Ritual Int." value={params.ritualIntensity} onChange={v => updateParams({ ritualIntensity: v })} />
            <SBSlider label="Astral Clar." value={params.astralClarity} onChange={v => updateParams({ astralClarity: v })} />
            <SBSlider label="Draw" value={(params.drawRate - 3) / 2}
              onChange={v => updateParams({ drawRate: Math.round(v * 2 + 3) as 3 | 4 | 5 })}
              display={`${params.drawRate} cards`} />
            <SBToggle label="Pillars" active={params.pillarsEnabled}
              hint="Field bias from the 3 pillars" onChange={v => updateParams({ pillarsEnabled: v })} />
            <SBToggle label="Veils" active={params.veilsEnabled}
              hint="Coherence thresholds for upper sephiroth" onChange={v => updateParams({ veilsEnabled: v })} />
          </SBSec>

          <SBDiv />

          {/* ── SPEED CONTROL ─────────────────────────────────────── */}
          <SBSec label="Speed">
            <SBSlider label="Speed" value={(params.speed - 0.25) / 2.75}
              onChange={v => updateParams({ speed: Math.round((v * 2.75 + 0.25) * 100) / 100 })}
              display={`${params.speed.toFixed(2)}x`} />
          </SBSec>

          <SBDiv />
          <SBSec label="Global State">
            <SBBar label="Coherence" v={snap.coherence} c="#60c0ff" />
            <SBBar label="Tension"   v={snap.tension}   c="#ff7050" />
            <SBBar label="Memory"    v={snap.memory}    c="#a070ff" />
            <SBBar label="Openness"  v={snap.openness}  c="#50d080" />
          </SBSec>

          <SBDiv />
          <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 3 }}>
              <SBBtn onClick={() => setRunning(r => !r)} c={running ? '#ffd060' : '#60c080'}>
                {running ? <><Pause size={9} />Pause</> : <><Play size={9} />Play</>}
              </SBBtn>
              <SBBtn onClick={handleReset} c="#7070a0"><RefreshCw size={9} />Reset</SBBtn>
            </div>
            <SBBtn onClick={() => setHand(drawHand(params.drawRate))} c="#c0a0ff">
              <Zap size={9} /> Draw {params.drawRate} Cards
            </SBBtn>
          </div>

          {/* Advanced */}
          <div style={{ padding: '0 10px 6px' }}>
            <button title={advOpen ? "Fechar avançado" : "Grimório & configuração"} onClick={() => setAdvOpen(!advOpen)} style={{
              display: 'flex', alignItems: 'center', gap: 4, width: '100%',
              fontSize: 7, background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(180,165,150,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              <Settings size={8} /> Advanced {advOpen ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
            </button>
            {advOpen && (
              <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 4, padding: '8px',
                border: '1px solid rgba(255,255,255,0.06)', marginTop: 3 }}>
                <div style={{ fontSize: 6.5, color: 'rgba(180,165,150,0.35)', lineHeight: 1.6 }}>
                  Lens: <b style={{ color: 'rgba(200,165,255,0.7)' }}>{params.deckLens}</b><br />
                  Preset: <b style={{ color: 'rgba(200,165,255,0.7)' }}>{params.preset}</b><br />
                  Chapters: {chapters.length}
                </div>
                <button title="Limpar grimório" onClick={() => { setChapters([]); saveGrimoire([]); }} style={{
                  marginTop: 5, fontSize: 7, background: 'rgba(255,50,30,0.08)',
                  border: '1px solid rgba(255,50,30,0.18)', borderRadius: 3,
                  padding: '2px 6px', cursor: 'pointer', color: 'rgba(255,110,90,0.55)',
                }}>Clear Grimoire</button>
              </div>
            )}
          </div>
        </div>

        {/* ── CANVAS + OVERLAYS ──────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}>
            <canvas ref={canvasRef}
              width={csz.w} height={csz.h}
              style={{ position: 'absolute', inset: 0, display: 'block',
                cursor: dragRef.current.active ? 'grabbing'
                  : activeTool !== 'select' && activeTool !== 'drag' ? 'crosshair'
                  : (hoveredSeph || hoveredPath !== null) ? 'pointer' : 'grab' }}
              onWheel={e => { e.preventDefault(); handleWheel(e); }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { dragRef.current.active = false; setHoveredSeph(null); setHoveredPath(null); }}
            />

            {/* Lens badge */}
            <div style={{
              position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
              padding: '3px 14px', borderRadius: 12,
              background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(96,20,128,0.3)',
              fontSize: 7, color: 'rgba(200,175,255,0.6)', letterSpacing: '0.14em', textTransform: 'uppercase',
              pointerEvents: 'none',
            }}>
              {lens.label} · {params.preset}{params.veilsEnabled ? ' · Veils ON' : ''}{params.pillarsEnabled ? ' · Pillars' : ''}
            </div>

            {/* Serpent badge */}
            {serpPct > 20 && (
              <div style={{
                position: 'absolute', top: 8, left: 12,
                padding: '3px 8px', borderRadius: 8,
                background: 'rgba(48,10,64,0.75)', border: '1px solid rgba(96,20,128,0.5)',
                fontSize: 7, color: 'rgba(200,150,255,0.9)', letterSpacing: '0.08em',
                pointerEvents: 'none', backdropFilter: 'blur(4px)',
                boxShadow: '0 0 12px rgba(160,80,255,0.2)',
              }}>
                ⬆ Serpent of Wisdom {serpPct}%
              </div>
            )}

            {/* Active tool badge */}
            {activeTool !== 'select' && (
              <div style={{
                position: 'absolute', top: 8, right: serpPct > 20 ? 12 : 'auto',
                left: serpPct > 20 ? 'auto' : 12,
                padding: '3px 8px', borderRadius: 8,
                background: 'rgba(0,0,0,0.65)', border: `1px solid ${RITUAL_TOOLS.find(t => t.id === activeTool)?.color ?? '#888'}60`,
                fontSize: 7, color: RITUAL_TOOLS.find(t => t.id === activeTool)?.color ?? '#888',
                letterSpacing: '0.08em', pointerEvents: 'none',
              }}>
                {RITUAL_TOOLS.find(t => t.id === activeTool)?.icon} {RITUAL_TOOLS.find(t => t.id === activeTool)?.label}
              </div>
            )}

            {/* Great Work flash overlay */}
            {serpentSnap.greatWorkFlash > 0 && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: `rgba(96,20,128,${serpentSnap.greatWorkFlash * 0.05})`,
                transition: 'background 0.3s',
              }} />
            )}

            {/* Zoom controls */}
            <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { ico: <ZoomIn size={12} />, action: () => { camRef.current = { ...camRef.current, zoom: Math.min(4, camRef.current.zoom * 1.25) }; } },
                { ico: <ZoomOut size={12} />, action: () => { camRef.current = { ...camRef.current, zoom: Math.max(0.2, camRef.current.zoom * 0.8) }; } },
                { ico: <RefreshCw size={11} />, action: () => { camRef.current = { zoom: 1, px: 0, py: 0 }; } },
                { ico: <Maximize2 size={11} />, action: () => setFullscreen(f => !f) },
              ].map(({ ico, action }, i) => (
                <button title={label} key={i} onClick={action} style={{
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 6, cursor: 'pointer',
                  background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(200,185,255,0.6)',
                }}>{ico}</button>
              ))}
            </div>

            {/* Global card apply button */}
            {selectedCard && (
              <button title="Jogar carta selecionada" onClick={() => playCard(selectedCard, 'global', 'global')} style={{
                position: 'absolute', top: 8, right: 12, padding: '4px 14px', borderRadius: 6,
                cursor: 'pointer', background: 'rgba(255,200,60,0.12)', border: '1px solid rgba(255,200,60,0.3)',
                fontSize: 8, color: 'rgba(255,220,100,0.9)', letterSpacing: '0.1em',
              }}>
                ✦ Apply Globally
              </button>
            )}

            {/* Selection info overlay */}
            {(selSephDef || selPathDef) && (
              <div style={{
                position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                padding: '8px 16px', borderRadius: 10, maxWidth: 380,
                background: 'rgba(6,3,20,0.92)', border: '1px solid rgba(180,120,255,0.3)',
                fontSize: 8, color: 'rgba(220,210,195,0.85)', textAlign: 'center',
                pointerEvents: 'none', backdropFilter: 'blur(8px)',
              }}>
                {selSephDef && selSephState && (
                  <>
                    <div style={{ fontSize: 11, color: 'rgba(210,185,255,0.95)', letterSpacing: '0.05em' }}>
                      {selSephDef.label}
                      <span style={{ fontSize: 7.5, color: 'rgba(180,160,240,0.5)', marginLeft: 6 }}>
                        {selSephDef.labelHeb}
                      </span>
                    </div>
                    <div style={{ fontSize: 7.5, color: 'rgba(180,165,200,0.6)', marginBottom: 5 }}>
                      {selSephDef.meaning} · Pillar of {selSephDef.pillar === 'mercy' ? 'Mercy' : selSephDef.pillar === 'severity' ? 'Severity' : 'Balance'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                      {[
                        { l: 'Charge', v: selSephState.charge, c: '#ffd060' },
                        { l: 'Coh', v: selSephState.coherence, c: '#60c0ff' },
                        { l: 'Tension', v: selSephState.tension, c: '#ff7050' },
                        { l: 'Memory', v: selSephState.memory, c: '#a070ff' },
                      ].map(({ l, v, c }) => (
                        <div key={l} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 6, color: 'rgba(180,165,200,0.5)', letterSpacing: '0.1em' }}>{l}</div>
                          <div style={{ fontSize: 10, color: c }}>{Math.round(v * 100)}%</div>
                        </div>
                      ))}
                    </div>
                    {selSephDef.id === 'malkuth' && serpPct > 20 && (
                      <div style={{ marginTop: 4, fontSize: 7, color: '#c080ff' }}>⬆ Serpent Active — light ascending to Source</div>
                    )}
                    {selectedCard && <div style={{ marginTop: 4, color: 'rgba(255,220,80,0.8)' }}>← Click to apply card</div>}
                  </>
                )}
                {selPathDef && selPathArcana && selPathLens && (
                  <>
                    <div style={{ fontSize: 11, color: 'rgba(210,185,255,0.95)' }}>
                      {selPathLens.name}
                      <span style={{ fontSize: 7.5, color: 'rgba(180,160,240,0.5)', marginLeft: 6 }}>
                        {selPathArcana.hebrewLetter} · Path {selectedPath}
                      </span>
                    </div>
                    <div style={{ fontSize: 7.5, color: 'rgba(180,165,200,0.6)', marginBottom: 3 }}>
                      {selPathDef.from} → {selPathDef.to}
                    </div>
                    <div style={{ fontSize: 7.5, marginBottom: 3 }}>
                      {selPathLens.keywords.join(' · ')}
                    </div>
                    <div style={{ fontSize: 7, color: 'rgba(200,185,165,0.5)' }}>
                      Op: {selPathArcana.operator.primary}
                      {selPathArcana.operator.secondary ? ` + ${selPathArcana.operator.secondary}` : ''}
                      {' '}· {selPathLens.microNote}
                    </div>
                    {selectedCard && <div style={{ marginTop: 4, color: 'rgba(255,220,80,0.8)' }}>← Click to apply card</div>}
                  </>
                )}
              </div>
            )}

            {/* Hover tooltip */}
            {(hovSephDef || hovPathDef) && (
              <div style={{
                position: 'fixed', left: hoverPos.x + 14, top: hoverPos.y - 10,
                padding: '5px 10px', borderRadius: 6, zIndex: 10,
                background: 'rgba(8,4,22,0.9)', border: '1px solid rgba(180,120,255,0.2)',
                fontSize: 8, color: 'rgba(220,210,200,0.85)',
                pointerEvents: 'none', maxWidth: 200, backdropFilter: 'blur(6px)',
              }}>
                {hovSephDef && (
                  <>
                    <b style={{ color: 'rgba(210,185,255,0.9)' }}>{hovSephDef.label}</b> — {hovSephDef.meaning}<br />
                    <span style={{ fontSize: 7, color: 'rgba(180,160,200,0.55)' }}>
                      {hovSephDef.planet}
                      {' · '}
                      {hovSephDef.pillar === 'mercy' ? '⟩ Mercy' : hovSephDef.pillar === 'severity' ? '⟨ Severity' : '| Balance'}
                      {selectedCard ? ' · Click to apply' : ' · Click to explore →'}
                    </span>
                  </>
                )}
                {hovPathDef && (() => {
                  const ar = ARCANA_MAP.get(hovPathDef.arcanaId)!;
                  const ld = lens.majors[ar.id];
                  return (
                    <>
                      <b style={{ color: 'rgba(210,185,255,0.9)' }}>{ld.name}</b><br />
                      <span style={{ fontSize: 7, color: 'rgba(180,160,200,0.5)' }}>
                        {ar.hebrewLetter} · {ld.keywords.join(', ')}
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* ── CARD HAND ──────────────────────────────────────────────────── */}
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(3,1,12,0.97)', overflowX: 'auto', scrollbarWidth: 'thin',
            minHeight: 108,
          }}>
            <div style={{ fontSize: 6.5, color: 'rgba(200,170,255,0.3)', letterSpacing: '0.15em',
              textTransform: 'uppercase', flexShrink: 0, writingMode: 'vertical-rl' }}>
              HAND
            </div>
            {hand.map((card, i) => {
              const ar = ARCANA_MAP.get(card.id)!;
              const ld = lens.majors[card.id];
              const isSel = selectedCard?.id === card.id && selectedCard?.reversed === card.reversed;
              return (
                <div key={`${card.id}-${i}`} onClick={() => setSelectedCard(isSel ? null : card)}
                  style={{
                    flexShrink: 0, width: 58, borderRadius: 8, overflow: 'hidden',
                    cursor: 'pointer', userSelect: 'none',
                    border: isSel ? '2px solid rgba(255,220,80,0.8)' : card.reversed
                      ? '1px solid rgba(255,70,50,0.3)' : '1px solid rgba(180,120,255,0.2)',
                    background: 'rgba(8,4,24,0.98)',
                    transform: isSel ? 'translateY(-10px) scale(1.05)' : 'none',
                    transition: 'transform 0.2s, border-color 0.2s',
                    boxShadow: isSel ? '0 4px 20px rgba(255,220,80,0.2)' : 'none',
                  }}>
                  <CardFace ar={ar} ld={ld} reversed={card.reversed} />
                </div>
              );
            })}
            <div style={{ flexShrink: 0, marginLeft: 4, fontSize: 7, color: 'rgba(160,145,200,0.2)',
              maxWidth: 70, lineHeight: 1.5 }}>
              {selectedCard ? '← click on node or path' : 'Select a card'}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
        <div style={{
          width: 250, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(3,1,14,0.97)',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {([
              { id: 'journey', label: 'Journey', ico: '✦' },
              { id: 'grimoire', label: 'Grimoire', ico: '📖' },
              { id: 'glossary', label: 'Glossary', ico: '📚' },
            ] as const).map(t => (
              <button title={t.label} key={t.id} onClick={() => setRightTab(t.id)} style={{
                flex: 1, padding: '7px 3px', fontSize: 7, border: 'none', cursor: 'pointer',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                background: rightTab === t.id ? 'rgba(180,120,255,0.1)' : 'transparent',
                borderBottom: rightTab === t.id ? '2px solid rgba(180,120,255,0.5)' : '2px solid transparent',
                color: rightTab === t.id ? 'rgba(210,180,255,0.9)' : 'rgba(170,155,140,0.3)',
              }}>
                {t.ico} {t.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', padding: '8px 10px' }}>

            {rightTab === 'journey' && (
              <JourneyPanel
                selectedSeph={selectedSeph}
                selectedPath={selectedPath}
                snap={snap}
                params={params}
                events={events}
                serpentSnap={serpentSnap}
                lens={lens}
              />
            )}

            {rightTab === 'grimoire' && (
              <div>
                <div style={{ fontSize: 6.5, color: 'rgba(180,120,255,0.4)', letterSpacing: '0.12em',
                  textTransform: 'uppercase', marginBottom: 6 }}>
                  Grimoire · {chapters.length} chapters
                </div>
                {chapters.length === 0 && (
                  <div style={{ fontSize: 7.5, color: 'rgba(170,155,140,0.3)', padding: '10px 0' }}>
                    Play cards to record chapters automatically.
                  </div>
                )}
                {[...chapters].reverse().slice(0, 24).map(ch => (
                  <div key={ch.id} style={{
                    marginBottom: 7, padding: '6px 8px', borderRadius: 5,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,120,255,0.09)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 6, color: 'rgba(180,120,255,0.5)', letterSpacing: '0.1em' }}>
                        {ch.lens.toUpperCase()} · {new Date(ch.timestamp).toLocaleTimeString()}
                      </span>
                      <span style={{ fontSize: 6, color: 'rgba(170,155,140,0.4)' }}>
                        {ch.tags.slice(0, 2).join(', ')}
                      </span>
                    </div>
                    <div style={{ fontSize: 7.5, color: 'rgba(210,200,185,0.7)', lineHeight: 1.45 }}>{ch.text}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                      <DeltaBadge label="coh" delta={ch.deltas.coherence} />
                      <DeltaBadge label="ten" delta={ch.deltas.tension} invert />
                      <DeltaBadge label="mem" delta={ch.deltas.memory} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {rightTab === 'glossary' && (
              <div>
                <div style={{ fontSize: 6.5, color: 'rgba(180,120,255,0.4)', letterSpacing: '0.12em',
                  textTransform: 'uppercase', marginBottom: 6 }}>
                  Glossary · {lens.label}
                </div>
                {ARCANA.map(ar => {
                  const ld = lens.majors[ar.id];
                  return (
                    <div key={ar.id} style={{
                      marginBottom: 5, padding: '4px 7px', borderRadius: 4,
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 14, color: 'rgba(220,210,195,0.65)', width: 18, flexShrink: 0 }}>{ar.symbol}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 7.5, color: 'rgba(220,210,195,0.82)', fontWeight: 500 }}>{ld.name}</span>
                          <span style={{ fontSize: 6, color: 'rgba(180,120,255,0.5)', marginLeft: 4 }}>{ar.hebrewLetter}</span>
                          <div style={{ fontSize: 6, color: 'rgba(170,155,200,0.45)' }}>
                            {ld.keywords.join(' · ')} · {ar.operator.primary}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Journey Panel — Hermetic Qabalah education + Serpent of Wisdom guide
// ─────────────────────────────────────────────────────────────────────────────
function JourneyPanel({
  selectedSeph, selectedPath, snap, params, events, serpentSnap, lens,
}: {
  selectedSeph: SephirahId | null;
  selectedPath: number | null;
  snap: ReturnType<typeof getStateSnapshot>;
  params: TreeOfLifeParams;
  events: TreeEvent[];
  serpentSnap: OrChozerSt;
  lens: ReturnType<typeof DECK_LENS_MAP.get>;
}) {
  const [showWorlds, setShowWorlds] = useState(false);
  const [showLightLore, setShowLightLore] = useState(false);
  const [showEvents, setShowEvents] = useState(true);

  const lore = selectedSeph ? SEPHIRAH_LORE[selectedSeph] : null;
  const sephDef = selectedSeph ? SEPHIRAH_MAP.get(selectedSeph) : null;
  const pathDef = selectedPath !== null ? PATH_MAP.get(selectedPath) : null;
  const pathArcana = pathDef ? ARCANA_MAP.get(pathDef.arcanaId) : null;
  const pathLens = pathArcana && lens ? lens.majors[pathArcana.id] : null;

  const P: React.CSSProperties = {
    fontSize: 7.5, color: 'rgba(200,190,175,0.7)', lineHeight: 1.55, marginBottom: 6,
  };
  const H: React.CSSProperties = {
    fontSize: 7, color: 'rgba(180,120,255,0.55)', letterSpacing: '0.12em',
    textTransform: 'uppercase', marginBottom: 4, marginTop: 8,
  };
  const Card: React.CSSProperties = {
    padding: '7px 9px', borderRadius: 6, marginBottom: 6,
    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(180,120,255,0.1)',
  };
  const CardSerpent: React.CSSProperties = {
    padding: '7px 9px', borderRadius: 6, marginBottom: 6,
    background: 'rgba(100,30,180,0.07)', border: '1px solid rgba(160,80,255,0.2)',
  };
  const CardFlash: React.CSSProperties = {
    padding: '7px 9px', borderRadius: 6, marginBottom: 6,
    background: 'rgba(180,140,30,0.07)', border: '1px solid rgba(220,180,60,0.2)',
  };

  if (selectedSeph && lore && sephDef) {
    const isMalkuth = selectedSeph === 'malkuth';
    return (
      <div>
        <div style={{ ...Card, border: `1px solid ${sephDef.color}40`, background: `${sephDef.color}0a`, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 16, color: sephDef.color, filter: `drop-shadow(0 0 6px ${sephDef.color}80)` }}>◉</span>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(240,235,220,0.95)', fontWeight: 500 }}>{sephDef.label}</div>
              <div style={{ fontSize: 8, color: 'rgba(200,185,255,0.5)' }}>{sephDef.labelHeb} · Sephirah {sephDef.num}</div>
            </div>
          </div>
          <div style={{ fontSize: 7.5, color: 'rgba(200,190,170,0.6)', marginBottom: 3 }}>
            {lore.divineName}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 6.5, padding: '2px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'rgba(200,185,170,0.5)' }}>
              ⟁ {lore.world}
            </span>
            <span style={{ fontSize: 6.5, padding: '2px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'rgba(200,185,170,0.5)' }}>
              ☿ {sephDef.planet}
            </span>
            <span style={{ fontSize: 6.5, padding: '2px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'rgba(200,185,170,0.5)' }}>
              ✦ {lore.gdGrade}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            <span style={{ fontSize: 6.5, padding: '2px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'rgba(200,185,170,0.5)' }}>
              ☽ {lore.archangel}
            </span>
            <span style={{ fontSize: 6.5, padding: '2px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'rgba(200,185,170,0.5)' }}>
              🫀 {lore.body}
            </span>
          </div>
        </div>

        <div style={H}>Spiritual Meaning</div>
        <div style={P}>{lore.spiritual}</div>

        <div style={CardFlash}>
          <div style={{ fontSize: 7, color: 'rgba(220,185,80,0.7)', letterSpacing: '0.1em', marginBottom: 4 }}>⬇ LIGHTNING FLASH — Descending Light</div>
          <div style={P}>{lore.lightningFlash}</div>
        </div>

        <div style={{
          ...CardSerpent,
          border: isMalkuth && serpentSnap.level > 0.2 ? '1px solid rgba(160,80,255,0.5)' : '1px solid rgba(160,80,255,0.2)',
          boxShadow: isMalkuth && serpentSnap.level > 0.2 ? '0 0 12px rgba(160,80,255,0.15)' : 'none',
        }}>
          <div style={{ fontSize: 7, color: 'rgba(160,90,255,0.8)', letterSpacing: '0.1em', marginBottom: 4 }}>⬆ SERPENT OF WISDOM — Ascending Light</div>
          <div style={P}>{lore.serpentOfWisdom}</div>
          {isMalkuth && serpentSnap.level > 0.15 && (
            <div style={{
              fontSize: 7, padding: '4px 7px', borderRadius: 4, marginTop: 4,
              background: 'rgba(160,80,255,0.12)', border: '1px solid rgba(160,80,255,0.3)',
              color: 'rgba(210,160,255,0.9)',
            }}>
              ✦ Serpent active ({Math.round(serpentSnap.level * 100)}%) — violet particles ascending
            </div>
          )}
        </div>

        <div style={H}>In the Simulation</div>
        <div style={{ ...Card, borderColor: 'rgba(100,180,255,0.15)', background: 'rgba(60,120,200,0.05)' }}>
          <div style={P}>{lore.practice}</div>
        </div>

        <div style={{ fontSize: 6, color: 'rgba(160,145,130,0.3)', marginTop: 8, textAlign: 'center' }}>
          Click another Sephirah to explore · Click empty space to return
        </div>
      </div>
    );
  }

  if (selectedPath !== null && pathDef && pathArcana && pathLens) {
    const fromDef = SEPHIRAH_MAP.get(pathDef.from)!;
    const toDef   = SEPHIRAH_MAP.get(pathDef.to)!;
    return (
      <div>
        <div style={{ ...Card, marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'rgba(210,185,255,0.95)', marginBottom: 3 }}>
            {pathArcana.symbol} {pathLens.name}
          </div>
          <div style={{ fontSize: 7.5, color: 'rgba(180,165,200,0.6)', marginBottom: 5 }}>
            Path {selectedPath} · Letter {pathArcana.hebrewLetter} · {pathDef.attribution}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 7.5 }}>
            <span style={{ color: fromDef.color }}>{fromDef.label}</span>
            <span style={{ color: 'rgba(200,185,165,0.4)' }}>→</span>
            <span style={{ color: toDef.color }}>{toDef.label}</span>
          </div>
        </div>

        <div style={H}>This Path</div>
        <div style={P}>
          Path {selectedPath} connects <b style={{ color: fromDef.color }}>{fromDef.label}</b> ({fromDef.meaning}) to <b style={{ color: toDef.color }}>{toDef.label}</b> ({toDef.meaning}). In the Hermetic tradition, each of the 22 paths is governed by a Major Arcana and a Hebrew letter. Attribution: {pathDef.attribution}.
        </div>

        <div style={CardFlash}>
          <div style={{ fontSize: 7, color: 'rgba(220,185,80,0.7)', marginBottom: 3 }}>⬇ Lightning Flash on this Path</div>
          <div style={P}>Light descends from <b style={{ color: 'rgba(200,185,165,0.7)' }}>{fromDef.label}</b> to <b style={{ color: 'rgba(200,185,165,0.7)' }}>{toDef.label}</b>. The arcanum <b style={{ color: 'rgba(210,185,255,0.8)' }}>{pathLens.name}</b> regulates the quality of this transmission.</div>
        </div>

        <div style={CardSerpent}>
          <div style={{ fontSize: 7, color: 'rgba(160,90,255,0.8)', marginBottom: 3 }}>⬆ Serpent of Wisdom on this Path</div>
          <div style={P}>When the Serpent is active, violet particles ascend from <b style={{ color: 'rgba(200,185,165,0.7)' }}>{toDef.label}</b> to <b style={{ color: 'rgba(200,185,165,0.7)' }}>{fromDef.label}</b> — the light returns purified by experience. As Above, So Below.</div>
        </div>

        <div style={H}>Arcanum · {pathLens.name}</div>
        <div style={Card}>
          <div style={{ fontSize: 7.5, color: 'rgba(220,210,195,0.75)', marginBottom: 3 }}>
            {pathLens.keywords.join(' · ')}
          </div>
          <div style={{ fontSize: 7, color: 'rgba(180,165,145,0.55)' }}>{pathLens.microNote}</div>
        </div>

        <div style={H}>Magical Operator</div>
        <div style={{ ...Card, borderColor: 'rgba(255,200,80,0.2)', background: 'rgba(180,140,30,0.04)' }}>
          <div style={{ fontSize: 8, color: 'rgba(220,190,90,0.8)', marginBottom: 2 }}>
            {pathArcana.operator.primary}
            {pathArcana.operator.secondary ? ` + ${pathArcana.operator.secondary}` : ''}
          </div>
          <div style={{ fontSize: 7, color: 'rgba(180,165,145,0.55)' }}>
            Reversed: {pathArcana.operator.reversed.primary}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        padding: '8px 10px', borderRadius: 7, marginBottom: 8,
        background: serpentSnap.greatWorkPulse > 0.3
          ? 'linear-gradient(135deg, rgba(180,120,30,0.08), rgba(120,40,200,0.08))'
          : 'rgba(255,255,255,0.02)',
        border: serpentSnap.greatWorkPulse > 0.3
          ? '1px solid rgba(180,120,255,0.25)'
          : '1px solid rgba(255,255,255,0.05)',
        transition: 'all 0.5s',
      }}>
        <div style={{ fontSize: 7, color: 'rgba(200,175,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>
          State of Light
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: 'rgba(220,185,80,0.7)', marginBottom: 2 }}>⬇ Lightning Flash</div>
            <div style={{ fontSize: 14, color: '#ffe080', fontFamily: 'monospace' }}>{Math.round(serpentSnap.lightningFlashLevel * 100)}%</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: 'rgba(160,90,255,0.7)', marginBottom: 2 }}>⬆ Serpent</div>
            <div style={{ fontSize: 14, color: '#c080ff', fontFamily: 'monospace' }}>{Math.round(serpentSnap.level * 100)}%</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: 'rgba(200,160,255,0.7)', marginBottom: 2 }}>✦ Great Work</div>
            <div style={{ fontSize: 14, color: serpentSnap.greatWorkPulse > 0.3 ? '#e8c0ff' : 'rgba(200,185,165,0.3)', fontFamily: 'monospace' }}>
              {Math.round(serpentSnap.greatWorkPulse * 100)}%
            </div>
          </div>
        </div>
        {serpentSnap.greatWorkPulse < 0.1 && (
          <div style={{ fontSize: 7, color: 'rgba(170,155,140,0.35)', textAlign: 'center' }}>
            Raise Malkuth to awaken the Serpent of Wisdom ↑
          </div>
        )}
        {serpentSnap.greatWorkPulse > 0.3 && (
          <div style={{ fontSize: 7.5, color: 'rgba(210,170,255,0.8)', textAlign: 'center' }}>
            ✦ The Great Work — Magnum Opus in progress
          </div>
        )}
      </div>

      <div style={{ padding: '6px 8px', borderRadius: 5, marginBottom: 8,
        background: 'rgba(180,120,255,0.06)', border: '1px solid rgba(180,120,255,0.15)' }}>
        <div style={{ fontSize: 7, color: 'rgba(200,175,255,0.6)', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 5 }}>How to Play</div>
        {[
          ['1', 'Click a Sephirah or path to explore its meaning'],
          ['2', 'Draw cards and apply them to modulate the flows'],
          ['3', 'Observe the Lightning Flash (gold ↓) and Serpent (violet ↑)'],
          ['4', 'Raise Malkuth to activate the Serpent of Wisdom — the ascent'],
          ['∞', 'Seek equilibrium: The Great Work'],
        ].map(([n, t]) => (
          <div key={n} style={{ display: 'flex', gap: 6, marginBottom: 3, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 7, color: 'rgba(180,120,255,0.5)', width: 12, flexShrink: 0, marginTop: 0.5 }}>{n}</span>
            <span style={{ fontSize: 7, color: 'rgba(200,190,175,0.65)', lineHeight: 1.4 }}>{t}</span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 6 }}>
        <button title={showLightLore ? "Ocultar Luz & Lore" : "Luz & Lore"} onClick={() => setShowLightLore(!showLightLore)} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 8px', borderRadius: 5, cursor: 'pointer',
          background: 'rgba(180,120,60,0.06)', border: '1px solid rgba(220,185,80,0.15)',
          color: 'rgba(220,185,80,0.7)', fontSize: 7.5, letterSpacing: '0.08em',
        }}>
          <span>✦ Lightning Flash & Serpent — The Cycle of Light</span>
          {showLightLore ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
        {showLightLore && (
          <div style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '0 0 5px 5px', border: '1px solid rgba(220,185,80,0.1)', borderTop: 'none' }}>
            {[LVX_LORE, LIGHTNING_FLASH_LORE, SERPENT_LORE, GREAT_WORK_LORE].map((item, i) => (
              <div key={i} style={{ marginBottom: i < 3 ? 8 : 0 }}>
                <div style={{ fontSize: 7.5, color: i < 2 ? 'rgba(220,185,80,0.8)' : i === 2 ? 'rgba(160,90,255,0.8)' : 'rgba(200,160,255,0.8)', marginBottom: 3 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 7, color: 'rgba(190,180,165,0.65)', lineHeight: 1.5 }}>{item.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 6 }}>
        <button title={showWorlds ? "Ocultar Mundos" : "Mundos"} onClick={() => setShowWorlds(!showWorlds)} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 8px', borderRadius: 5, cursor: 'pointer',
          background: 'rgba(80,120,200,0.06)', border: '1px solid rgba(100,150,220,0.15)',
          color: 'rgba(120,170,255,0.7)', fontSize: 7.5, letterSpacing: '0.08em',
        }}>
          <span>⟁ The Four Worlds (Hermetic Planes)</span>
          {showWorlds ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
        {showWorlds && (
          <div style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '0 0 5px 5px', border: '1px solid rgba(100,150,220,0.1)', borderTop: 'none' }}>
            {FOUR_WORLDS.map((w, i) => (
              <div key={w.name} style={{ marginBottom: i < 3 ? 8 : 0 }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'baseline', marginBottom: 2 }}>
                  <span style={{ fontSize: 8, color: 'rgba(200,185,165,0.85)' }}>{w.name}</span>
                  <span style={{ fontSize: 7, color: 'rgba(180,120,255,0.5)' }}>{w.heb}</span>
                  <span style={{ fontSize: 6.5, color: 'rgba(160,150,135,0.5)' }}>— {w.meaning}</span>
                </div>
                <div style={{ fontSize: 6.5, color: 'rgba(160,145,130,0.5)', marginBottom: 2 }}>Sephiroth: {w.sephirot}</div>
                <div style={{ fontSize: 7, color: 'rgba(190,180,165,0.6)', lineHeight: 1.45 }}>{w.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '6px 8px', borderRadius: 5, marginBottom: 8,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 7, color: 'rgba(200,175,255,0.45)', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 5 }}>
          Current State
        </div>
        <SystemDiagnosis snap={snap} params={params} serpent={serpentSnap} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, cursor: 'pointer' }}
        onClick={() => setShowEvents(v => !v)}>
        <div style={{ fontSize: 7, color: 'rgba(200,175,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', flex: 1 }}>
          Events
        </div>
        {showEvents ? <ChevronDown size={9} color="rgba(180,120,255,0.4)" /> : <ChevronRight size={9} color="rgba(180,120,255,0.4)" />}
      </div>
      {showEvents && (
        <>
          {events.length === 0 && (
            <div style={{ fontSize: 7.5, color: 'rgba(170,155,140,0.3)' }}>
              No events yet. Play cards to activate.
            </div>
          )}
          {[...events].reverse().slice(0, 12).map(ev => (
            <div key={ev.id} style={{
              marginBottom: 5, padding: '4px 7px', borderRadius: 4,
              background: 'rgba(255,255,255,0.025)',
              borderLeft: `2px solid ${ev.kind === 'DISSOLUTION' ? '#60c0ff' :
                ev.kind === 'CRYSTALLIZATION' ? '#ffd060' :
                ev.kind === 'VEIL_BREACH' ? '#ff6040' :
                ev.kind === 'GREAT_WORK_PULSE' ? '#e0c0ff' :
                ev.kind === 'GRADE_ADVANCEMENT' ? '#50d080' :
                ev.kind === 'QLIPHOTIC_WARNING' ? '#ff4040' : 'rgba(180,120,255,0.4)'}`,
            }}>
              <div style={{ fontSize: 6, color: 'rgba(180,120,255,0.5)', marginBottom: 1 }}>{ev.kind}</div>
              <div style={{ fontSize: 7.5, color: 'rgba(210,200,185,0.65)', lineHeight: 1.4 }}>{ev.description}</div>
            </div>
          ))}
        </>
      )}

      <div style={{ fontSize: 6.5, color: 'rgba(160,145,130,0.25)', marginTop: 10, textAlign: 'center', lineHeight: 1.6 }}>
        Click any Sephirah or path<br />to explore its spiritual meaning
      </div>
    </div>
  );
}

function SystemDiagnosis({ snap, params, serpent }: {
  snap: ReturnType<typeof getStateSnapshot>;
  params: TreeOfLifeParams;
  serpent: OrChozerSt;
}) {
  const lines: { text: string; color?: string }[] = [];
  if (snap.coherence > 0.6)       lines.push({ text: '✦ High coherence — Lightning Flash flowing well.' });
  if (snap.coherence < 0.25)      lines.push({ text: '◌ Low coherence — system dispersed.' });
  if (snap.tension > 0.55)        lines.push({ text: '⚠ High tension — risk of CRYSTALLIZATION.' });
  if (snap.tension < 0.15)        lines.push({ text: '◎ Minimal tension — system stable.' });
  if (snap.memory > 0.5)          lines.push({ text: '✎ High memory — patterns consolidated.' });
  if (snap.openness > 0.65)       lines.push({ text: '⊕ High openness — paths easily traversed.' });
  if (params.veilsEnabled)        lines.push({ text: '☾ Veils active — coherence required for upper gates.' });
  if (serpent.level > 0.3)        lines.push({ text: '⬆ Serpent of Wisdom active — light ascending.', color: '#c080ff' });
  if (serpent.greatWorkPulse > 0.4) lines.push({ text: '✦ The Great Work — Magnum Opus in progress!', color: '#e0c0ff' });
  if (!lines.length)              lines.push({ text: 'System in neutral state. Play cards to begin.' });
  return (
    <>
      {lines.map((l, i) => (
        <div key={i} style={{ fontSize: 7.5, color: l.color ?? 'rgba(200,190,175,0.65)', lineHeight: 1.45, marginBottom: 2 }}>{l.text}</div>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas Renderer (Lightning Flash + Serpent of Wisdom particles)
// ─────────────────────────────────────────────────────────────────────────────
function render(
  canvas: HTMLCanvasElement | null,
  state: TreeState,
  params: TreeOfLifeParams,
  cam: Camera,
  fxList: Fx[],
  orbits: Map<SephirahId, OrbitP[]>,
  streams: Map<number, StreamP[]>,
  serpentStreams: Map<number, StreamP[]>,
  serpent: OrChozerSt,
  selSeph: SephirahId | null,
  selPath: number | null,
  nodeAct: Map<SephirahId, number>,
  pathAct: Map<number, number>,
  ov: Record<TreeOverlay, boolean>,
): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const t = state.time;

  ctx.fillStyle = '#050210';
  ctx.fillRect(0, 0, W, H);

  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  bg.addColorStop(0,   'rgba(20,10,60,0.4)');
  bg.addColorStop(0.5, 'rgba(8,4,30,0.3)');
  bg.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (serpent.greatWorkPulse > 0.2) {
    const tg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.5);
    tg.addColorStop(0, `rgba(160,80,255,${serpent.greatWorkPulse * 0.06})`);
    tg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.save();
  for (let i = 0; i < 120; i++) {
    const sx = (i * 18731 + 5) % W;
    const sy = (i * 37311 + 17) % H;
    const bright = 0.04 + (i % 7) * 0.015 + Math.sin(t * 0.5 + i) * 0.01;
    ctx.fillStyle = `rgba(220,215,255,${bright})`;
    ctx.fillRect(sx, sy, 1.2, 1.2);
  }
  ctx.restore();

  ctx.save();
  ctx.translate(W / 2 + cam.px, H / 2 + cam.py);
  ctx.scale(cam.zoom, cam.zoom);

  if (ov.pillars && params.pillarsEnabled) {
    const pGrads: [number, number, number, string][] = [
      [-200, 0, 200, 'rgba(180,40,40,0.06)'],
      [ 200, 0, 200, 'rgba(40,80,200,0.06)'],
      [   0, 0, 160, 'rgba(200,170,60,0.05)'],
    ];
    for (const [px, py, r, col] of pGrads) {
      const g = ctx.createRadialGradient(px, py, 0, px, py, r * 3);
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-TREE_W, -TREE_H * 0.6, TREE_W * 2, TREE_H * 1.2);
    }
  }

  if (ov.paths) {
    for (const path of PATHS) {
      const fromS = SEPHIRAH_MAP.get(path.from)!;
      const toS   = SEPHIRAH_MAP.get(path.to)!;
      const fx2 = wx(fromS.nx), fy2 = wy(fromS.ny);
      const tx2 = wx(toS.nx),   ty2 = wy(toS.ny);
      const cp  = ctrlPt(fx2, fy2, tx2, ty2);

      const pState  = state.paths.get(path.pathId)!;
      const flow    = pState.flow;
      const block   = pState.blockage;
      const isSel   = selPath === path.pathId;
      const actAge  = pathAct.get(path.pathId) ?? 99;
      const actPulse = Math.max(0, 1 - actAge / 2);

      const [r, g, b] = pathRGB(fromS.pillar, toS.pillar);

      ctx.save();

      const pathObj = new Path2D();
      pathObj.moveTo(fx2, fy2);
      pathObj.quadraticCurveTo(cp.x, cp.y, tx2, ty2);

      ctx.strokeStyle = `rgba(${r},${g},${b},${0.04 + flow * 0.06 + actPulse * 0.12})`;
      ctx.lineWidth = 12 + actPulse * 8;
      ctx.filter = 'blur(4px)';
      ctx.stroke(pathObj);
      ctx.filter = 'none';

      ctx.strokeStyle = `rgba(${r},${g},${b},${0.08 + flow * 0.12 + actPulse * 0.2})`;
      ctx.lineWidth = 4;
      ctx.stroke(pathObj);

      if (block > 0.3) ctx.setLineDash([5, 5]);
      ctx.strokeStyle = isSel
        ? `rgba(255,220,80,${0.4 + flow * 0.4})`
        : `rgba(${r},${g},${b},${0.2 + flow * 0.4 + actPulse * 0.3})`;
      ctx.lineWidth = isSel ? 2 : (0.6 + flow * 1.4);
      ctx.stroke(pathObj);
      ctx.setLineDash([]);

      if (ov.orChozer && serpent.level > 0.15) {
        ctx.strokeStyle = `rgba(140,60,255,${serpent.level * 0.06 * flow})`;
        ctx.lineWidth = 6;
        ctx.filter = 'blur(2px)';
        ctx.stroke(pathObj);
        ctx.filter = 'none';
      }

      const lp = bz(0.5, fx2, fy2, cp.x, cp.y, tx2, ty2);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.3 + flow * 0.25})`;
      ctx.font = `${Math.round(10 + flow * 3)}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ARCANA_MAP.get(path.arcanaId)!.hebrewLetter, lp.x, lp.y);

      if (ov.orYashar) {
        const ps = streams.get(path.pathId) ?? [];
        for (const p of ps) {
          const pos  = bz(p.t, fx2, fy2, cp.x, cp.y, tx2, ty2);
          const fade = Math.min(p.t * 5, (1 - p.t) * 5, 1);
          const aIn  = p.energy * fade;
          const pr   = p.size * (1 + block * 0.5);

          ctx.filter = 'blur(3px)';
          const grd2 = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, pr * 3);
          grd2.addColorStop(0, `rgba(${r},${g},${b},${aIn * 0.5})`);
          grd2.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = grd2;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, pr * 3, 0, TWO_PI); ctx.fill();
          ctx.filter = 'none';

          ctx.fillStyle = `rgba(${r + 60},${g + 60},${b + 60},${aIn})`;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, pr, 0, TWO_PI); ctx.fill();
        }
      }

      if (ov.orChozer) {
        const cps = serpentStreams.get(path.pathId) ?? [];
        for (const p of cps) {
          const pos = bz(1 - p.t, fx2, fy2, cp.x, cp.y, tx2, ty2);
          const fade = Math.min(p.t * 5, (1 - p.t) * 5, 1);
          const aIn  = p.energy * fade * serpent.level;
          const pr   = p.size;

          ctx.filter = 'blur(3px)';
          const cGrd = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, pr * 3.5);
          cGrd.addColorStop(0, `rgba(160,80,255,${aIn * 0.6})`);
          cGrd.addColorStop(1, 'rgba(100,40,200,0)');
          ctx.fillStyle = cGrd;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, pr * 3.5, 0, TWO_PI); ctx.fill();
          ctx.filter = 'none';

          ctx.fillStyle = `rgba(200,140,255,${aIn})`;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, pr * 0.8, 0, TWO_PI); ctx.fill();

          ctx.fillStyle = `rgba(240,220,255,${aIn * 0.6})`;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, pr * 0.3, 0, TWO_PI); ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  if (ov.sephiroth) {
    for (const seph of SEPHIROT) {
      const sx    = wx(seph.nx), sy2 = wy(seph.ny);
      const s     = state.sephirot.get(seph.id)!;
      const isSel = selSeph === seph.id;
      const actAge = nodeAct.get(seph.id) ?? 99;
      const actP  = Math.max(0, 1 - actAge / 2.5);

      const nc = seph.color;
      const [nr, ng, nb] = [parseInt(nc.slice(1,3),16), parseInt(nc.slice(3,5),16), parseInt(nc.slice(5,7),16)];

      const isMalkuth = seph.id === 'malkuth';
      const isKether  = seph.id === 'kether';

      ctx.save();

      if (ov.aura && isMalkuth && serpent.level > 0.2) {
        const serpR = NODE_R * (4 + serpent.level * 4);
        ctx.filter = 'blur(8px)';
        const cg = ctx.createRadialGradient(sx, sy2, NODE_R, sx, sy2, serpR);
        cg.addColorStop(0, `rgba(140,60,220,${serpent.level * 0.3})`);
        cg.addColorStop(1, 'rgba(100,30,180,0)');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(sx, sy2, serpR, 0, TWO_PI); ctx.fill();
        ctx.filter = 'none';
      }

      if (ov.aura && isKether && serpent.level > 0.4) {
        const tikP = serpent.greatWorkPulse;
        ctx.filter = 'blur(6px)';
        const kg = ctx.createRadialGradient(sx, sy2, NODE_R, sx, sy2, NODE_R * 5);
        kg.addColorStop(0, `rgba(200,160,255,${tikP * 0.25})`);
        kg.addColorStop(1, 'rgba(180,120,255,0)');
        ctx.fillStyle = kg;
        ctx.beginPath(); ctx.arc(sx, sy2, NODE_R * 5, 0, TWO_PI); ctx.fill();
        ctx.filter = 'none';
      }

      if (ov.aura) {
        const glowR = NODE_R * (3 + s.charge * 3 + actP * 2);
        const grd = ctx.createRadialGradient(sx, sy2, NODE_R * 0.5, sx, sy2, glowR);
        grd.addColorStop(0, `rgba(${nr},${ng},${nb},${(s.charge * 0.25 + actP * 0.35)})`);
        grd.addColorStop(0.4, `rgba(${nr},${ng},${nb},${s.charge * 0.08})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.filter = 'blur(2px)';
        ctx.beginPath(); ctx.arc(sx, sy2, glowR, 0, TWO_PI); ctx.fill();
        ctx.filter = 'none';
      }

      if (ov.particles) {
        const orbs = orbits.get(seph.id) ?? [];
        for (const p of orbs) {
          const ox = sx + Math.cos(p.angle) * p.radius;
          const oy = sy2 + Math.sin(p.angle) * p.radius;
          ctx.fillStyle = `rgba(${nr + 40},${ng + 40},${nb + 40},${p.alpha * s.charge})`;
          ctx.beginPath(); ctx.arc(ox, oy, 1.5 + s.charge * 1.5, 0, TWO_PI); ctx.fill();
        }
      }

      const bg2 = ctx.createRadialGradient(sx - NODE_R * 0.25, sy2 - NODE_R * 0.25, 2, sx, sy2, NODE_R);
      bg2.addColorStop(0, `rgba(${nr},${ng},${nb},${0.35 + s.charge * 0.35 + actP * 0.2})`);
      bg2.addColorStop(1, `rgba(${nr},${ng},${nb},${0.06 + s.charge * 0.10})`);
      ctx.fillStyle = bg2;
      ctx.beginPath(); ctx.arc(sx, sy2, NODE_R, 0, TWO_PI); ctx.fill();

      if (s.tension > 0.1) {
        const pulseTension = 0.4 + Math.sin(t * 4 + seph.num) * 0.3;
        ctx.strokeStyle = `rgba(220,60,40,${s.tension * pulseTension})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sx, sy2, NODE_R * (0.8 + s.tension * 0.4), 0, TWO_PI); ctx.stroke();
      }

      if (s.coherence > 0.1) {
        ctx.strokeStyle = `rgba(80,180,255,${s.coherence * 0.4})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(sx, sy2, NODE_R * 1.15, 0, TWO_PI * s.coherence); ctx.stroke();
      }

      if (isMalkuth && serpent.level > 0.1) {
        const pulse = 0.5 + Math.sin(t * 2) * 0.3;
        ctx.strokeStyle = `rgba(160,80,255,${serpent.level * pulse * 0.8})`;
        ctx.lineWidth = 1.5 + serpent.level * 1.5;
        ctx.beginPath(); ctx.arc(sx, sy2, NODE_R * 1.3, 0, TWO_PI); ctx.stroke();
      }

      if (isKether && serpent.greatWorkPulse > 0.2) {
        const pulse = 0.5 + Math.sin(t * 1.5) * 0.4;
        ctx.strokeStyle = `rgba(200,150,255,${serpent.greatWorkPulse * pulse * 0.9})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy2, NODE_R * 1.5, 0, TWO_PI); ctx.stroke();
      }

      if (actP > 0) {
        ctx.strokeStyle = `rgba(255,220,80,${actP * 0.7})`;
        ctx.lineWidth = 2 + actP * 2;
        ctx.beginPath(); ctx.arc(sx, sy2, NODE_R * (1 + actP * 0.5), 0, TWO_PI); ctx.stroke();
      }

      if (isSel) {
        ctx.strokeStyle = 'rgba(255,220,80,0.9)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(sx, sy2, NODE_R + 3, 0, TWO_PI); ctx.stroke();
      }

      ctx.strokeStyle = isSel ? 'rgba(255,220,80,0.5)' : `rgba(${nr},${ng},${nb},${0.3 + s.coherence * 0.4})`;
      ctx.lineWidth = isSel ? 1.5 : 0.8;
      ctx.beginPath(); ctx.arc(sx, sy2, NODE_R, 0, TWO_PI); ctx.stroke();

      ctx.fillStyle = `rgba(240,235,220,${0.6 + s.coherence * 0.3})`;
      ctx.font = `${Math.round(NODE_R * 0.52)}px system-ui`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(seph.label, sx, sy2);

      ctx.fillStyle = `rgba(${nr + 30},${ng + 30},${nb + 30},0.4)`;
      ctx.font = `${Math.round(NODE_R * 0.42)}px serif`;
      ctx.fillText(seph.num.toString(), sx, sy2 + NODE_R * 1.4);

      ctx.restore();
    }
  }

  for (const fx of fxList) {
    const a = Math.max(0, 1 - fx.age / fx.life);
    const progress = fx.age / fx.life;
    ctx.save();

    if (fx.kind === 'ripple') {
      ctx.strokeStyle = fx.color + Math.round(a * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = 2 * a;
      ctx.beginPath(); ctx.arc(fx.wx, fx.wy, fx.r * progress, 0, TWO_PI); ctx.stroke();
      if (progress > 0.3) {
        ctx.strokeStyle = fx.color + Math.round(a * 0.5 * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(fx.wx, fx.wy, fx.r * progress * 1.6, 0, TWO_PI); ctx.stroke();
      }
    } else if (fx.kind === 'burst') {
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * TWO_PI + progress;
        const r1 = fx.r * 0.3, r2 = fx.r * progress;
        ctx.strokeStyle = fx.color + Math.round(a * 200).toString(16).padStart(2, '0');
        ctx.lineWidth = 1.5 * a;
        ctx.beginPath();
        ctx.moveTo(fx.wx + Math.cos(ang) * r1, fx.wy + Math.sin(ang) * r1);
        ctx.lineTo(fx.wx + Math.cos(ang) * r2, fx.wy + Math.sin(ang) * r2);
        ctx.stroke();
      }
      ctx.filter = 'blur(3px)';
      const g2 = ctx.createRadialGradient(fx.wx, fx.wy, 0, fx.wx, fx.wy, fx.r * 0.5);
      g2.addColorStop(0, fx.color + Math.round(a * 180).toString(16).padStart(2, '0'));
      g2.addColorStop(1, fx.color + '00');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(fx.wx, fx.wy, fx.r * 0.5, 0, TWO_PI); ctx.fill();
      ctx.filter = 'none';
    } else if (fx.kind === 'flash') {
      ctx.filter = 'blur(8px)';
      ctx.fillStyle = fx.color + Math.round(a * 180).toString(16).padStart(2, '0');
      ctx.beginPath(); ctx.arc(fx.wx, fx.wy, fx.r * 0.8, 0, TWO_PI); ctx.fill();
      ctx.filter = 'none';
    } else if (fx.kind === 'dissolve') {
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * TWO_PI;
        const r2 = fx.r * 0.7 * progress;
        const dx = Math.cos(ang) * r2, dy = Math.sin(ang) * r2;
        ctx.fillStyle = fx.color + Math.round(a * 180).toString(16).padStart(2, '0');
        ctx.beginPath(); ctx.arc(fx.wx + dx, fx.wy + dy, 3 * a, 0, TWO_PI); ctx.fill();
      }
    }
    ctx.restore();
  }

  ctx.restore();

  if (ov.pillars && params.pillarsEnabled) {
    ctx.save();
    ctx.font = '9px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(180,40,40,0.20)';
    ctx.save(); ctx.translate(18, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('SEVERITY', 0, 0); ctx.restore();
    ctx.fillStyle = 'rgba(40,80,200,0.20)';
    ctx.save(); ctx.translate(W - 18, H / 2); ctx.rotate(Math.PI / 2); ctx.fillText('MERCY', 0, 0); ctx.restore();
    ctx.restore();
  }

  if (serpent.level > 0.05) {
    ctx.save();
    const barW = 80, barH = 4;
    const bx = W - barW - 12, by = H - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
    ctx.fillStyle = `rgba(140,60,220,${serpent.level * 0.6})`;
    ctx.fillRect(bx, by, barW * serpent.level, barH);
    ctx.fillStyle = `rgba(200,150,255,${serpent.level * 0.9})`;
    ctx.font = '7px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(`⬆ Serpent ${Math.round(serpent.level * 100)}%`, W - 12, by - 4);
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function SBDiv() { return <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '3px 0' }} />; }

function SBSec({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '6px 10px 4px' }} title={hint}>
      <div style={{ fontSize: 6.5, color: 'rgba(180,120,255,0.4)', letterSpacing: '0.14em',
        textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

function SBLensBtn({ label, desc, active, onClick }: { label: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <button title={label} onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', width: '100%',
      padding: '4px 8px', marginBottom: 2, borderRadius: 4, cursor: 'pointer', textAlign: 'left',
      background: active ? 'rgba(180,120,255,0.12)' : 'rgba(255,255,255,0.025)',
      border: `1px solid ${active ? 'rgba(180,120,255,0.35)' : 'rgba(255,255,255,0.05)'}`,
      color: active ? 'rgba(210,185,255,0.95)' : 'rgba(175,160,145,0.45)',
    }}>
      <span style={{ fontSize: 8.5, letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 6, opacity: 0.5, letterSpacing: '0.04em', lineHeight: 1.3 }}>{desc}</span>
    </button>
  );
}

function SBSlider({ label, value, onChange, display }: { label: string; value: number; onChange: (v: number) => void; display?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
      <span style={{ fontSize: 6.5, color: 'rgba(185,175,160,0.45)', width: 58, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <input type="range" min={0} max={1} step={0.01} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, height: 2, accentColor: 'rgba(180,120,255,0.8)', cursor: 'pointer' }} />
      <span style={{ fontSize: 6.5, color: 'rgba(185,175,160,0.4)', width: 28, textAlign: 'right' }}>
        {display ?? value.toFixed(2)}
      </span>
    </div>
  );
}

function SBToggle({ label, active, hint, onChange }: { label: string; active: boolean; hint: string; onChange: (v: boolean) => void }) {
  return (
    <div title={hint} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer' }}
      onClick={() => onChange(!active)}>
      <div style={{ width: 22, height: 12, borderRadius: 6, position: 'relative',
        background: active ? 'rgba(180,120,255,0.6)' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }}>
        <div style={{ position: 'absolute', top: 2, left: active ? 12 : 2, width: 8, height: 8,
          borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
      </div>
      <span style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '0.08em',
        color: active ? 'rgba(210,185,255,0.8)' : 'rgba(175,160,145,0.4)' }}>{label}</span>
    </div>
  );
}

function SBBar({ label, v, c }: { label: string; v: number; c: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
      <span style={{ fontSize: 6.5, color: 'rgba(185,175,160,0.45)', width: 52, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
        <div style={{ width: `${Math.round(v * 100)}%`, height: '100%', background: c, borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 6.5, color: 'rgba(185,175,160,0.4)', width: 24, textAlign: 'right' }}>{Math.round(v * 100)}%</span>
    </div>
  );
}

function SBBtn({ onClick, c, children }: { onClick: () => void; c: string; children: React.ReactNode }) {
  return (
    <button title={label} onClick={onClick} style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      padding: '4px 5px', borderRadius: 4, cursor: 'pointer', fontSize: 8,
      textTransform: 'uppercase', letterSpacing: '0.07em',
      background: `${c}15`, border: `1px solid ${c}40`, color: c,
    }}>{children}</button>
  );
}

function DeltaBadge({ label, delta, invert = false }: { label: string; delta: number; invert?: boolean }) {
  const good = invert ? delta < 0 : delta > 0;
  const col  = good ? '#50b870' : '#b05050';
  if (Math.abs(delta) < 0.005) return null;
  return (
    <span style={{ fontSize: 6, padding: '1px 4px', borderRadius: 3,
      background: `${col}15`, border: `1px solid ${col}35`, color: col }}>
      {label} {delta > 0 ? '+' : ''}{(delta * 100).toFixed(0)}%
    </span>
  );
}

function CardFace({ ar, ld, reversed }: { ar: typeof ARCANA[0]; ld: { name: string; keywords: [string,string,string]; tone: string }; reversed: boolean }) {
  const toneCol: Record<string, string> = { logical: '#60c0ff', imaginal: '#c090ff', ritual: '#ffd060' };
  const col = toneCol[ld.tone] ?? '#b0a8c0';
  return (
    <div style={{
      padding: '6px 4px', textAlign: 'center',
      background: 'linear-gradient(155deg, rgba(18,12,38,0.95), rgba(8,5,20,0.98))',
      minHeight: 88, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 3,
      transform: reversed ? 'rotate(180deg)' : 'none',
    }}>
      <div style={{ fontSize: 22, color: col, lineHeight: 1, filter: `drop-shadow(0 0 4px ${col}80)` }}>{ar.symbol}</div>
      <div style={{ fontSize: 6.5, color: 'rgba(225,215,200,0.88)', lineHeight: 1.2, fontWeight: 500 }}>
        {ld.name}
      </div>
      <div style={{ fontSize: 5.5, color: 'rgba(180,165,200,0.5)', lineHeight: 1.3 }}>
        {ld.keywords.join('\n')}
      </div>
      {reversed && (
        <div style={{ fontSize: 5, color: 'rgba(255,90,70,0.6)', letterSpacing: '0.08em' }}>INV</div>
      )}
    </div>
  );
}
