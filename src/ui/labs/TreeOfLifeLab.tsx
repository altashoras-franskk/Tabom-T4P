// ─────────────────────────────────────────────────────────────────────────────
// Tree of Life Lab v2 — Or Chozer Edition
// Or Yashar (Direct Light) ↓ + Or Chozer (Returning Light) ↑
// Rich Kabbalah education, guided journey, immersive simulation
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState, useCallback } from 'react';

import type {
  TreeState, TreeOfLifeParams, SephirahId,
  DeckLensId, CardPlay, GrimoireChapter, TargetType, KabbalahEvent,
} from '../../sim/kabbalah/types';
import {
  createTree, resetTree, stepTree, applyCard, drawHand, getStateSnapshot,
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

// ── Grimoire ──────────────────────────────────────────────────────────────────
const GK = 'tol_grimoire_v2';
function loadGrimoire(): GrimoireChapter[] {
  try { return JSON.parse(localStorage.getItem(GK) ?? '[]'); } catch { return []; }
}
function saveGrimoire(c: GrimoireChapter[]) {
  try { localStorage.setItem(GK, JSON.stringify(c.slice(-60))); } catch {}
}

// ── Particle interfaces ────────────────────────────────────────────────────────
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
// KABBALAH LORE — Educational content for the Journey panel
// ─────────────────────────────────────────────────────────────────────────────
interface SephirahLore {
  world: string;
  worldHeb: string;
  divineAspect: string;
  planet: string;
  body: string;
  summary: string;
  spiritual: string;
  orYashar: string;
  orChozer: string;
  practice: string;
  color: string;
}

const SEPHIRAH_LORE: Record<SephirahId, SephirahLore> = {
  kether: {
    world: 'Atziluth — Emanação', worldHeb: 'אֵין סוֹף אוֹר',
    divineAspect: 'Ehyeh — "Eu Sou o que Sou"',
    planet: 'Primum Mobile — o Primeiro Motor',
    body: 'Topo da cabeça (a Coroa)',
    color: '#f0ece0',
    summary: 'A Coroa — o ponto de emanação do Divino. Antes do pensamento, antes da forma.',
    spiritual: 'Kether é o ponto onde o Infinito (Ain Soph) se contrai para criar o universo. É pura consciência sem forma, o "Eu" antes de qualquer experiência. Não pode ser compreendido com a mente — apenas experienciado. É o primeiro Sephirah e o último destino.',
    orYashar: 'Kether é a FONTE do Or Yashar (Luz Direta). A luz infinita de Ain Soph Aur flui de dentro para fora, descendo pela Árvore como o Relâmpago da Criação (Reshef ha-Reshut), passando por todos os 10 Sephirot até se manifestar em Malkuth.',
    orChozer: 'Quando o Or Chozer retorna, Kether o RECEBE de volta, completando o ciclo sagrado. A luz retorna ao seu ponto de origem, transformada pela experiência completa da Criação. Este é o momento do Tikkun — a Correção.',
    practice: 'Observe como a carga de Kether flui para Chokmah e Binah. Aplique OPEN_GATE ou CLARIFY para iniciar o Relâmpago. A alta coerência em Kether significa que o Or Yashar flui livremente.',
  },
  chokmah: {
    world: 'Atziluth — Emanação', worldHeb: 'חָכְמָה',
    divineAspect: 'Yah — o primeiro flash da consciência',
    planet: 'Zodíaco — a esfera das estrelas fixas',
    body: 'Lado direito do cérebro (hemisfério criativo)',
    color: '#d0c8a0',
    summary: 'A Sabedoria — o primeiro flash de existência, o ponto primordial de onde tudo emerge.',
    spiritual: 'Chokmah é o primeiro diferencial: o ponto de onde emerge toda possibilidade. É a Sabedoria não-estruturada, o impulso criativo puro antes da forma. No ser humano, é o hemisfério criativo, intuitivo — o lampejo de insight antes da análise.',
    orYashar: 'Recebe Or Yashar de Kether como um raio — imediato, não filtrado. No Pilar da Misericórdia, Chokmah transmite a luz para Binah (que a forma) e para Chesed (que a expande). É o Pai Supremo.',
    orChozer: 'Reflete Or Chozer de volta a Kether: toda sabedoria acumulada através da experiência retorna ao ponto-fonte, enriquecendo o Divino com o aprendizado da Criação. A Sabedoria que desceu retorna Sabedoria-profunda.',
    practice: 'OPEN_GATE e CLARIFY em Chokmah ampliam o fluxo no Pilar da Misericórdia. Observe como sua carga alimenta Chesed abaixo. Alta carga aqui acelera o Relâmpago.',
  },
  binah: {
    world: 'Atziluth — Emanação', worldHeb: 'בִּינָה',
    divineAspect: 'YHVH Elohim — o princípio formativo divino',
    planet: 'Saturno — limitação, forma e tempo',
    body: 'Lado esquerdo do cérebro (estrutura e razão)',
    color: '#5055a0',
    summary: 'O Entendimento — a Grande Mãe, o útero onde as formas são gestadas.',
    spiritual: 'Binah transforma o flash caótico de Chokmah em formas definidas. É a Mãe Suprema — princípio feminino divino que dá à luz todas as formas. É Aima (Mãe Fértil) e Ama (Mãe Sombria). Saturno dá a ela o domínio sobre o tempo e os limites — sem Binah, não haveria forma, e portanto nada poderia existir.',
    orYashar: 'Recebe Or Yashar de Kether e Chokmah. Binah "dá à luz" as formas: aqui a luz informe ganha estrutura que descerá pelos mundos. É o início da diferenciação — o primeiro "Não" que cria fronteiras e possibilidade.',
    orChozer: 'Ao receber Or Chozer de Geburah e Chesed, Binah reconhece os padrões completos — a "compreensão" total do ciclo. Ela sela o entendimento antes de repassar a Kether: toda experiência compreendida e integrada.',
    practice: 'MEMORY e STABILIZE em Binah cristalizam padrões. CLOSE_GATE aqui cria limitação estruturante. Binah em alta coerência significa formas estáveis fluindo pela Árvore.',
  },
  chesed: {
    world: 'Beriah — Criação', worldHeb: 'חֶסֶד',
    divineAspect: 'El — o Deus da Graça e da Generosidade',
    planet: 'Júpiter — expansão, bênção e abundância',
    body: 'Braço direito — o braço que doa',
    color: '#6090d0',
    summary: 'A Misericórdia — amor incondicional, expansão e graça divina.',
    spiritual: 'Chesed é o amor divino em sua forma mais generosa. O Criador expande, doa, abençoa sem condição. É o arquétipo do rei benigno, o pai amoroso. Sem Geburah para equilibrá-lo, Chesed se tornaria indulgência infinita e dissolveria toda forma.',
    orYashar: 'Recebe Or Yashar de Chokmah, Binah e Kether via caminho direto. No Pilar da Misericórdia, Chesed expande o fluxo de luz, tornando-a mais acessível e abundante para os Sephirot inferiores.',
    orChozer: 'Chesed reflete Or Chozer como amor e compaixão acumulados — toda a experiência de dar e receber retorna como gratidão ao Criador. O amor humano é Or Chozer — a luz divina refletida de volta.',
    practice: 'AMPLIFY em Chesed expande o fluxo para toda a coluna da Misericórdia. Equilibre com Geburah via caminho 19 (Força). Alta carga aqui beneficia Netzach e Tiphereth.',
  },
  geburah: {
    world: 'Beriah — Criação', worldHeb: 'גְּבוּרָה',
    divineAspect: 'Elohim Gibor — Deus da Força e do Julgamento',
    planet: 'Marte — força, coragem e delimitação',
    body: 'Braço esquerdo — o braço que remove',
    color: '#c03030',
    summary: 'A Severidade — força, justiça e a necessária limitação que dá sentido à existência.',
    spiritual: 'Geburah é o princípio divino da restrição e justiça. O que Chesed expande, Geburah delimita. É o arquétipo do guerreiro-juiz. Sem Geburah, o universo se dissolveria em expansão infinita. Também chamada Pachad (Temor) ou Din (Julgamento) — não crueldade, mas precisão necessária.',
    orYashar: 'Recebe Or Yashar de Binah e Chesed. Geburah "corta" e refina a luz, removendo o que não é essencial — como o ferreiro que forja o aço com calor e golpes. A luz que passa por Geburah é mais concentrada e poderosa.',
    orChozer: 'Geburah reflete Or Chozer como discernimento e clareza adquiridos. O poder de distinguir, julgar com sabedoria, dizer "não" quando necessário — tudo isso retorna à Fonte como pureza. O que foi podado era o que limitava o crescimento.',
    practice: 'CUT e CLOSE_GATE em Geburah removem bloqueios. SHOCK para intervenções fortes. Tensão alta aqui pode indicar julgamento excessivo — equilibre com Chesed via caminho 19.',
  },
  tiphereth: {
    world: 'Beriah — Criação', worldHeb: 'תִּפְאֶרֶת',
    divineAspect: 'YHVH Eloah va-Daath — o Filho, o Mediador',
    planet: 'Sol — o centro, a beleza, a harmonia',
    body: 'Coração e peito — o centro vital',
    color: '#e8c830',
    summary: 'A Beleza — coração da Árvore, ponto de equilíbrio perfeito entre Or Yashar e Or Chozer.',
    spiritual: 'Tiphereth é o sol da Árvore da Vida — o centro onde TODAS as forças se equilibram. É o ponto de encontro entre Or Yashar (vindo de cima) e Or Chozer (vindo de baixo). Corresponde ao arquétipo do Filho (Cristo solar, Osiris, Mitra) — o mediador entre o divino e o humano, o sacrifício que redime. A "Bela" que integra tudo.',
    orYashar: 'Tiphereth é o CENTRO do fluxo descendente. Toda luz que desceu de Kether, Chokmah, Binah, Chesed e Geburah converge aqui — como a luz solar que equilibra e ilumina todos os planetas.',
    orChozer: 'Tiphereth é o PONTO DE VIRADA do Or Chozer. Aqui, a luz que recebeu de Netzach, Hod e Yesod é transformada e elevada. O coração que integrou toda experiência dos mundos inferiores inicia a grande jornada de retorno. É o "Fiat Lux" do Or Chozer.',
    practice: 'BALANCE e INTEGRATE em Tiphereth afetam toda a Árvore. É o hub mais importante. AMPLIFY aqui tem efeito global. Observe como sua carga sincroniza com Kether no alto e Yesod abaixo.',
  },
  netzach: {
    world: 'Yetzirah — Formação', worldHeb: 'נֵצַח',
    divineAspect: 'YHVH Tzabaoth — Deus dos Exércitos da Natureza',
    planet: 'Vênus — beleza, desejo, instinto e natureza',
    body: 'Quadril direito, loins — a força gerativa',
    color: '#50a840',
    summary: 'A Vitória — instinto, emoção, força da natureza e a persistência do desejo divino.',
    spiritual: 'Netzach é o reino das emoções, da natureza selvagem, da beleza sensorial e do instinto. É onde os deuses da natureza habitam — arquétipos, elementais, forças naturais. A "vitória" é a persistência do desejo divino em se manifestar. É o primeiro Sephirah no mundo de Yetzirah (Formação).',
    orYashar: 'Recebe Or Yashar de Chesed, Tiphereth e parcialmente de Geburah. A luz aqui se torna emocional e instintiva — é o "sentir" da Criação, o prazer divino em suas obras. Em Netzach, a luz aprende a desejar.',
    orChozer: 'Netzach reflete Or Chozer como amor à criação, beleza e gratidão instintiva. As emoções mais puras — admiração, êxtase, amor à vida — fluem de volta à Fonte. O desejo humano pelo Divino é Or Chozer de Netzach.',
    practice: 'OPEN_GATE em Netzach libera expressão criativa e fluxo emocional. AMPLIFY aqui potencializa toda a coluna da Misericórdia inferior. Observe como alimenta Hod via caminho 27 (Torre).',
  },
  hod: {
    world: 'Yetzirah — Formação', worldHeb: 'הוֹד',
    divineAspect: 'Elohim Tzabaoth — Deus da Forma e da Ordem',
    planet: 'Mercúrio — comunicação, razão e análise',
    body: 'Quadril esquerdo — a precisão analítica',
    color: '#b06820',
    summary: 'O Esplendor — intelecto, linguagem, análise e o dom de nomear.',
    spiritual: 'Hod é a faculdade racional, o dom da linguagem e da análise. É onde os magos e cientistas trabalham — transformando experiência em conhecimento estruturado. O esplendor da ordem racional. Complementa Netzach: enquanto Netzach sente, Hod analisa. Juntos formam o par emoção-razão.',
    orYashar: 'Recebe Or Yashar de Geburah, Tiphereth e Netzach. A luz aqui ganha precisão e articulação — torna-se pensamento, linguagem, forma intelectual. Em Hod, a luz aprende a nomear e classificar.',
    orChozer: 'Hod reflete Or Chozer como compreensão estruturada — mapas, modelos e linguagens que retornam ao Divino. Todo conhecimento humano é Or Chozer de Hod: a mente humana refletindo a mente cósmica de volta à Fonte.',
    practice: 'CLARIFY e MEMORY em Hod estruturam padrões intelectuais. BRIDGE conecta Hod a Netzach para equilibrar razão e emoção. Alta memória aqui significa padrões cognitivos consolidados.',
  },
  yesod: {
    world: 'Yetzirah — Formação', worldHeb: 'יְסוֹד',
    divineAspect: 'Shaddai El Chai — o Deus Vivo e a Força Vital',
    planet: 'Lua — reflexo, inconsciente e ciclos',
    body: 'Órgãos reprodutivos e centro vital — a fundação',
    color: '#8060c0',
    summary: 'A Fundação — o plano astral, o inconsciente coletivo, o molde da realidade.',
    spiritual: 'Yesod é o plano intermediário entre espírito e matéria — o éter ou plano astral. É a fundação sobre a qual Malkuth (o mundo físico) repousa. Corresponde ao inconsciente coletivo, aos sonhos e ao "Akasha" — a memória cósmica de toda experiência. A Lua governa Yesod: ciclos, marés, o ritmo oculto da realidade.',
    orYashar: 'Recebe Or Yashar de Tiphereth, Netzach e Hod. Aqui a luz espiritual se comprime em padrões etéricos que serão manifestados em Malkuth. Yesod é o "molde" da realidade física — tudo que existe em Malkuth primeiro existe em Yesod.',
    orChozer: 'Yesod reflete Or Chozer como memória coletiva e sonhos — toda experiência da humanidade se acumula aqui antes de ser elevada. É o grande depósito do Or Chozer: purifica e concentra a luz retornante antes de enviá-la a Tiphereth.',
    practice: 'MEMORY em Yesod fortalece a fundação de toda a Árvore. RITUAL_PULSE cria ondas que afetam Malkuth e Tiphereth simultaneamente. A coerência alta aqui significa que Malkuth se manifesta claramente.',
  },
  malkuth: {
    world: 'Assiah — Ação/Manifestação', worldHeb: 'מַלְכוּת',
    divineAspect: 'Adonai Melech — o Rei da Terra e da Manifestação',
    planet: 'Terra — o mundo físico completamente manifestado',
    body: 'Os pés e a base — a conexão com a terra',
    color: '#806040',
    summary: 'O Reino — o mundo físico, o ponto mais baixo e ao mesmo tempo o ponto de partida do retorno.',
    spiritual: 'Malkuth é o mundo que habitamos — o reino da matéria, do corpo, dos sentidos. É onde toda a luz espiritual se manifesta em realidade concreta. É tanto o ponto mais baixo da descida quanto o ponto de PARTIDA do Or Chozer. A "pedra que os construtores rejeitaram tornou-se a pedra angular." Sem Malkuth, a Criação não teria destino.',
    orYashar: 'Malkuth é o DESTINO FINAL do Or Yashar. Toda a luz divina, após percorrer os 10 Sephirot (o Relâmpago completo), manifesta-se aqui como realidade física. Quando Malkuth está "pleno" de carga, o Or Yashar completou sua jornada de descida.',
    orChozer: '⚡ Malkuth é a FONTE do Or Chozer! Quando a carga de Malkuth atinge o pleno, a matéria consciente reconhece sua origem divina e a luz começa a refletir de volta. Neste simulador, quando Malkuth supera 50% de carga, PARTÍCULAS VIOLETAS começam a SUBIR pela Árvore — o Or Chozer em ação. Isso simboliza o despertar espiritual, a ascensão, o início do Tikkun Olam (Reparação do Mundo).',
    practice: 'Observe Malkuth com atenção especial. Quando sua carga sobe, o Or Chozer se ativa — partículas violetas sobem pela Árvore. Aplique RITUAL_PULSE aqui para criar ondas de retorno. AMPLIFY acelera o Or Chozer. Este é o ponto de maior significado espiritual.',
  },
};

// Or Chozer / Ain Soph overview
const AIN_SOPH_LORE = {
  title: 'Ain Soph Aur — A Luz Infinita',
  text: 'Antes de Kether, existe o Ain Soph Aur: "A Luz Sem Fim". É o absoluto incondicionado, além de qualquer forma ou descrição. O Ain Soph se contraiu (Tzimtzum) para criar espaço para a Criação — e dessa contração emergiu Kether, o primeiro Sephirah.',
};

const OR_YASHAR_LORE = {
  title: 'Or Yashar — A Luz Direta ↓',
  text: 'A Luz Direta desce de Ain Soph Aur através de todos os 10 Sephirot como o "Relâmpago da Criação". Cada Sephirah recebe, transforma e passa adiante. A descida termina em Malkuth — o mundo físico manifestado. Nas visualizações: partículas douradas/coloridas descendo pelos caminhos.',
};

const OR_CHOZER_LORE = {
  title: 'Or Chozer — A Luz Retornante ↑',
  text: 'Quando Or Yashar atinge Malkuth, a "matéria" desperta para sua origem divina e reflete a luz de volta — Or Chozer. Esta luz retorna purificada pela experiência completa da Criação. É o fundamento de toda prática espiritual: o ser humano como espelho que reflete a luz de volta ao Criador. Nas visualizações: partículas violetas subindo pelos caminhos.',
};

const TIKKUN_LORE = {
  title: 'Tikkun Olam — A Reparação do Mundo',
  text: 'Quando Or Yashar e Or Chozer fluem em equilíbrio simultâneo — a luz descendo e retornando em harmonia — ocorre o Tikkun: a Reparação. Cada ato consciente que eleva a luz da matéria ao espírito é Tikkun. A Árvore em equilíbrio perfeito representa o estado de Tikkun completo.',
};

const FOUR_WORLDS = [
  { name: 'Atziluth', heb: 'אֲצִילוּת', meaning: 'Emanação', sephirot: 'Kether, Chokmah, Binah', desc: 'O mundo das ideias puras, da emanação direta do Divino. Aqui a luz ainda é quase idêntica à Fonte.' },
  { name: 'Beriah', heb: 'בְּרִיאָה', meaning: 'Criação', sephirot: 'Chesed, Geburah, Tiphereth', desc: 'O mundo da criação arquetípica. Forças ainda espirituais mas já diferenciadas em padrões.' },
  { name: 'Yetzirah', heb: 'יְצִירָה', meaning: 'Formação', sephirot: 'Netzach, Hod, Yesod', desc: 'O mundo astral, da formação. Padrões etéricos que moldam a realidade física iminente.' },
  { name: 'Assiah', heb: 'עֲשִׂיָּה', meaning: 'Ação', sephirot: 'Malkuth', desc: 'O mundo físico manifestado. A ação concreta, a matéria, o reino onde habitamos.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Or Chozer state (tracked in the RAF loop)
// ─────────────────────────────────────────────────────────────────────────────
interface OrChozerSt {
  level: number;      // 0..1 — how active is the returning light
  tikkunPulse: number; // 0..1 — simultaneous Or Yashar + Or Chozer (harmony)
  tikkunFlash: number; // countdown for visual flash
  orYasharLevel: number; // 0..1 — direct light level (from top sephirot)
}

export function TreeOfLifeLab({ active }: { active: boolean }) {

  // ── Sim ─────────────────────────────────────────────────────────────────────
  const [params, setParams]     = useState<TreeOfLifeParams>({ ...DEFAULT_PARAMS });
  const paramsRef               = useRef<TreeOfLifeParams>({ ...DEFAULT_PARAMS });
  const stateRef                = useRef<TreeState>(createTree(DEFAULT_PARAMS));
  const [snap, setSnap]         = useState(() => getStateSnapshot(stateRef.current));

  const [running, setRunning]   = useState(true);
  const runRef                  = useRef(true);
  const rafRef                  = useRef(0);
  const lastTRef                = useRef(0);

  // ── Canvas ───────────────────────────────────────────────────────────────────
  const canvasRef               = useRef<HTMLCanvasElement>(null);
  const [csz, setCsz]           = useState({ w: 800, h: 600 });
  const [fullscreen, setFullscreen] = useState(false);

  // ── Camera ────────────────────────────────────────────────────────────────────
  const camRef  = useRef<Camera>({ zoom: 1, px: 0, py: 0 });
  const dragRef = useRef<{ active: boolean; sx: number; sy: number; opx: number; opy: number }>({
    active: false, sx: 0, sy: 0, opx: 0, opy: 0,
  });

  // ── Particles ─────────────────────────────────────────────────────────────────
  const orbitsRef  = useRef<Map<SephirahId, OrbitP[]>>(new Map());
  const streamsRef = useRef<Map<number, StreamP[]>>(new Map()); // Or Yashar (down)
  const orChozerStreamsRef = useRef<Map<number, StreamP[]>>(new Map()); // Or Chozer (up)
  const spawnT     = useRef<Map<number, number>>(new Map());
  const spawnTChozer = useRef<Map<number, number>>(new Map());

  // ── Or Chozer state ───────────────────────────────────────────────────────────
  const orChozerRef = useRef<OrChozerSt>({ level: 0, tikkunPulse: 0, tikkunFlash: 0, orYasharLevel: 0 });
  const [orChozerSnap, setOrChozerSnap] = useState<OrChozerSt>({ level: 0, tikkunPulse: 0, tikkunFlash: 0, orYasharLevel: 0 });

  // ── Effects ───────────────────────────────────────────────────────────────────
  const fxRef  = useRef<Fx[]>([]);
  const nodeActivatedRef = useRef<Map<SephirahId, number>>(new Map());
  const pathActivatedRef = useRef<Map<number, number>>(new Map());

  // ── Hover ────────────────────────────────────────────────────────────────────
  const [hoveredSeph, setHoveredSeph]   = useState<SephirahId | null>(null);
  const [hoveredPath, setHoveredPath]   = useState<number | null>(null);
  const [hoverPos, setHoverPos]         = useState({ x: 0, y: 0 });
  const [selectedSeph, setSelectedSeph] = useState<SephirahId | null>(null);
  const [selectedPath, setSelectedPath] = useState<number | null>(null);

  // ── Hand & selection ──────────────────────────────────────────────────────────
  const [hand, setHand]               = useState<{ id: number; reversed: boolean }[]>([]);
  const [selectedCard, setSelectedCard] = useState<{ id: number; reversed: boolean } | null>(null);
  const [events, setEvents]           = useState<KabbalahEvent[]>([]);

  // ── Grimoire ──────────────────────────────────────────────────────────────────
  const [chapters, setChapters]   = useState<GrimoireChapter[]>(() => loadGrimoire());
  const [rightTab, setRightTab]   = useState<'journey' | 'grimoire' | 'glossary'>('journey');
  const [advOpen, setAdvOpen]     = useState(false);
  const pendingPlays              = useRef<CardPlay[]>([]);
  const snapBefore                = useRef(getStateSnapshot(stateRef.current));

  // ─────────────────────────────────────────────────────────────────────────────
  // Init particles
  // ─────────────────────────────────────────────────────────────────────────────
  const initParticles = useCallback(() => {
    const o = orbitsRef.current;
    const s = streamsRef.current;
    const sc = orChozerStreamsRef.current;
    o.clear(); s.clear(); sc.clear();
    spawnT.current.clear(); spawnTChozer.current.clear();

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
      spawnTChozer.current.set(p.pathId, Math.random() * 0.5);
    }
  }, []);

  useEffect(() => { initParticles(); }, []);

  // ── ResizeObserver ────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  // RAF loop
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    let frame = 0;

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const dt = Math.min((now - lastTRef.current) / 1000, 0.1);
      lastTRef.current = now;

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

      stepParticlesAndOrChozer(dt, stateRef.current);

      fxRef.current = fxRef.current
        .map(f => ({ ...f, age: f.age + dt }))
        .filter(f => f.age < f.life);

      // Update Or Chozer snap every 20 frames
      if (frame % 20 === 0) setOrChozerSnap({ ...orChozerRef.current });

      render(canvasRef.current, stateRef.current, paramsRef.current,
             camRef.current, fxRef.current, orbitsRef.current, streamsRef.current,
             orChozerStreamsRef.current, orChozerRef.current,
             selectedSeph, selectedPath, nodeActivatedRef.current, pathActivatedRef.current);
      frame++;
    };

    lastTRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, selectedSeph, selectedPath]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Particle step — Or Yashar (down) + Or Chozer (up)
  // ─────────────────────────────────────────────────────────────────────────────
  function stepParticlesAndOrChozer(dt: number, state: TreeState) {
    const orbits  = orbitsRef.current;
    const streams = streamsRef.current;
    const chozerS = orChozerStreamsRef.current;

    // ── Orbiting particles ──────────────────────────────────────────────────
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

    // ── Compute Or Chozer level from Malkuth charge ───────────────────────
    const malkuth = state.sephirot.get('malkuth')!;
    const kether  = state.sephirot.get('kether')!;
    const tiphereth = state.sephirot.get('tiphereth')!;
    const targetOrChozer = Math.max(0, malkuth.charge - 0.35) * (1 / 0.65);
    const oc = orChozerRef.current;
    oc.level = oc.level + (targetOrChozer - oc.level) * dt * 0.8;

    // Or Yashar from top sephirot
    const topMean = (kether.charge + (state.sephirot.get('chokmah')?.charge ?? 0) + (state.sephirot.get('binah')?.charge ?? 0)) / 3;
    oc.orYasharLevel = oc.orYasharLevel + (topMean - oc.orYasharLevel) * dt * 0.6;

    // Tikkun = both flows active simultaneously
    const tikkunTarget = oc.level > 0.4 && oc.orYasharLevel > 0.4
      ? Math.min(oc.level, oc.orYasharLevel) * tiphereth.coherence
      : 0;
    oc.tikkunPulse = oc.tikkunPulse + (tikkunTarget - oc.tikkunPulse) * dt * 0.5;
    if (oc.tikkunFlash > 0) oc.tikkunFlash = Math.max(0, oc.tikkunFlash - dt);

    // Trigger Tikkun flash when both are high
    if (oc.tikkunPulse > 0.6 && Math.random() < dt * 0.3) {
      oc.tikkunFlash = 1.2;
      fxRef.current.push({ kind: 'ripple', wx: wx(0.5), wy: wy(0.52), color: '#c080ff', age: 0, life: 2.0, r: 200 });
    }

    // ── Or Yashar stream particles (down: from→to) ────────────────────────
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

      // ── Or Chozer stream particles (up: to→from, reversed direction) ─────
      const cps = chozerS.get(path.pathId)!;
      const chozerFlow = oc.level * flow; // Or Chozer only on active paths

      for (let i = cps.length - 1; i >= 0; i--) {
        const p = cps[i];
        p.t += p.speed * dt;
        if (p.t > 1) {
          cps.splice(i, 1);
          // Or Chozer deposits charge in the source (ascending)
          const src = state.sephirot.get(path.from);
          if (src) src.coherence = Math.min(1, src.coherence + 0.004);
        }
      }

      if (chozerFlow > 0.08) {
        const chozerRate = 1 / (chozerFlow * 4 + 0.3);
        const ctimer = spawnTChozer.current.get(path.pathId)! + dt;
        spawnTChozer.current.set(path.pathId, ctimer);
        if (ctimer > chozerRate && cps.length < 10) {
          spawnTChozer.current.set(path.pathId, 0);
          cps.push({ t: 0, speed: 0.12 + chozerFlow * 0.18 + (Math.random() - 0.5) * 0.04, size: 1.5 + chozerFlow * 1.8 + Math.random() * 1.0, energy: 0.4 + chozerFlow * 0.5 });
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Play card
  // ─────────────────────────────────────────────────────────────────────────────
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
    };
    const color = opColors[op] ?? '#c0c0ff';
    const kind: Fx['kind'] = op === 'SHOCK' ? 'burst' : op === 'CUT' ? 'dissolve' : 'ripple';
    fxRef.current.push({ kind, wx: ex, wy: ey, color, age: 0, life: 1.2, r: 60 });
  }

  // ── Chapter close ─────────────────────────────────────────────────────────────
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
        `${ld.keywords.join(', ')}. Coer ${(sn.coherence * 100).toFixed(0)}%, Ten ${(sn.tension * 100).toFixed(0)}%.`
      : 'Sessão registrada.';

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

  // ── Mouse events ──────────────────────────────────────────────────────────────
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
  }, [hoveredSeph, hoveredPath, selectedCard, selectedSeph, selectedPath, playCard]);

  // ── Controls ──────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    resetTree(stateRef.current, paramsRef.current);
    initParticles();
    orChozerRef.current = { level: 0, tikkunPulse: 0, tikkunFlash: 0, orYasharLevel: 0 };
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

  const ocPct = Math.round(orChozerSnap.level * 100);
  const oyPct = Math.round(orChozerSnap.orYasharLevel * 100);
  const tikPct = Math.round(orChozerSnap.tikkunPulse * 100);

  return (
    <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column',
      background: '#000', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── LEFT SIDEBAR ───────────────────────────────────────────────── */}
        <div style={{
          width: 210, flexShrink: 0, overflowY: 'auto', scrollbarWidth: 'none',
          background: 'rgba(0,0,0,0.97)', borderRight: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', flexDirection: 'column', padding: '10px 0',
        }}>
          {/* Title */}
          <div style={{ padding: '0 12px 8px' }}>
            <div style={{ fontSize: 6.5, color: 'rgba(180,120,255,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Tree of Life Lab</div>
            <div style={{ fontSize: 13, color: 'rgba(240,230,210,0.9)' }}>Kabbalah · Tarot</div>
            <div style={{ fontSize: 7.5, color: 'rgba(180,160,200,0.4)', marginTop: 2 }}>Jornada pelos 10 sephirot e 22 caminhos</div>
          </div>

          <SBDiv />

          {/* ── OR CHOZER / OR YASHAR STATUS ─────────────────────────── */}
          <div style={{ padding: '6px 10px 8px' }}>
            <div style={{ fontSize: 6.5, color: 'rgba(180,120,255,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
              Fluxo de Luz
            </div>

            {/* Or Yashar */}
            <div style={{ marginBottom: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 7, color: 'rgba(220,185,80,0.7)', letterSpacing: '0.05em' }}>⬇ Or Yashar</span>
                <span style={{ fontSize: 7, color: 'rgba(220,185,80,0.8)', fontFamily: 'monospace' }}>{oyPct}%</span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ width: `${oyPct}%`, height: '100%', borderRadius: 2, transition: 'width 0.4s', background: 'linear-gradient(90deg, #c0a040, #ffe080)' }} />
              </div>
            </div>

            {/* Or Chozer */}
            <div style={{ marginBottom: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 7, color: 'rgba(160,90,255,0.7)', letterSpacing: '0.05em' }}>⬆ Or Chozer</span>
                <span style={{ fontSize: 7, color: ocPct > 30 ? '#c080ff' : 'rgba(160,90,255,0.5)', fontFamily: 'monospace' }}>{ocPct}%</span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ width: `${ocPct}%`, height: '100%', borderRadius: 2, transition: 'width 0.4s', background: 'linear-gradient(90deg, #6020c0, #c080ff)' }} />
              </div>
            </div>

            {/* Tikkun */}
            <div style={{
              padding: '4px 7px', borderRadius: 5, marginTop: 4,
              background: tikPct > 40 ? 'rgba(96,20,128,0.15)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${tikPct > 40 ? 'rgba(180,100,255,0.3)' : 'rgba(255,255,255,0.05)'}`,
              transition: 'all 0.5s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 7, color: tikPct > 40 ? 'rgba(210,170,255,0.8)' : 'rgba(170,155,140,0.35)', letterSpacing: '0.05em' }}>
                  ✦ Tikkun Olam
                </span>
                <span style={{ fontSize: 7, fontFamily: 'monospace', color: tikPct > 40 ? '#e0c0ff' : 'rgba(170,155,140,0.3)' }}>{tikPct}%</span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ width: `${tikPct}%`, height: '100%', borderRadius: 2, transition: 'width 0.5s',
                  background: 'linear-gradient(90deg, #8040e0, #e0b0ff, #ffe080)' }} />
              </div>
              {tikPct < 10 && (
                <div style={{ fontSize: 6, color: 'rgba(160,145,130,0.3)', marginTop: 3 }}>
                  Eleve Malkuth para ativar Or Chozer
                </div>
              )}
              {tikPct > 40 && (
                <div style={{ fontSize: 6.5, color: 'rgba(210,170,255,0.7)', marginTop: 3 }}>
                  Reparação em curso — luzes em harmonia
                </div>
              )}
            </div>
          </div>

          <SBDiv />
          <SBSec label="Tarot Lens" hint="Muda vocabulário e ênfase. Mecânica base idêntica.">
            {DECK_LENSES.map(dl => (
              <SBLensBtn key={dl.id} active={params.deckLens === dl.id} label={dl.label}
                desc={dl.description.slice(0, 42) + '…'}
                onClick={() => updateParams({ deckLens: dl.id as DeckLensId })} />
            ))}
          </SBSec>

          <SBDiv />
          <SBSec label="Jornada">
            {JOURNEY_PRESETS.map(p => (
              <button key={p.id} onClick={() => applyPreset(p)} style={{
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
          <SBSec label="Parâmetros">
            <SBSlider label="Ring Spring" value={params.strictness} onChange={v => updateParams({ strictness: v })} />
            <SBSlider label="Draw" value={(params.drawRate - 3) / 2}
              onChange={v => updateParams({ drawRate: Math.round(v * 2 + 3) as 3 | 4 | 5 })}
              display={`${params.drawRate} cartas`} />
            <SBToggle label="Pilares" active={params.pillarsEnabled}
              hint="Bias de campo pelos 3 pilares" onChange={v => updateParams({ pillarsEnabled: v })} />
            <SBToggle label="Véus" active={params.veilsEnabled}
              hint="Limites de coerência para sephirot superiores" onChange={v => updateParams({ veilsEnabled: v })} />
          </SBSec>

          <SBDiv />
          <SBSec label="Estado Global">
            <SBBar label="Coerência" v={snap.coherence} c="#60c0ff" />
            <SBBar label="Tensão"    v={snap.tension}   c="#ff7050" />
            <SBBar label="Memória"   v={snap.memory}    c="#a070ff" />
            <SBBar label="Abertura"  v={snap.openness}  c="#50d080" />
          </SBSec>

          <SBDiv />
          <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 3 }}>
              <SBBtn onClick={() => setRunning(r => !r)} c={running ? '#ffd060' : '#60c080'}>
                {running ? <><Pause size={9} />Pausa</> : <><Play size={9} />Play</>}
              </SBBtn>
              <SBBtn onClick={handleReset} c="#7070a0"><RefreshCw size={9} />Reset</SBBtn>
            </div>
            <SBBtn onClick={() => setHand(drawHand(params.drawRate))} c="#c0a0ff">
              <Zap size={9} /> Comprar {params.drawRate} Cartas
            </SBBtn>
          </div>

          {/* Advanced */}
          <div style={{ padding: '0 10px 6px' }}>
            <button onClick={() => setAdvOpen(!advOpen)} style={{
              display: 'flex', alignItems: 'center', gap: 4, width: '100%',
              fontSize: 7, background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(180,165,150,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              <Settings size={8} /> Avançado {advOpen ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
            </button>
            {advOpen && (
              <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 4, padding: '8px',
                border: '1px solid rgba(255,255,255,0.06)', marginTop: 3 }}>
                <div style={{ fontSize: 6.5, color: 'rgba(180,165,150,0.35)', lineHeight: 1.6 }}>
                  Lens: <b style={{ color: 'rgba(200,165,255,0.7)' }}>{params.deckLens}</b><br />
                  Preset: <b style={{ color: 'rgba(200,165,255,0.7)' }}>{params.preset}</b><br />
                  Capítulos: {chapters.length}
                </div>
                <button onClick={() => { setChapters([]); saveGrimoire([]); }} style={{
                  marginTop: 5, fontSize: 7, background: 'rgba(255,50,30,0.08)',
                  border: '1px solid rgba(255,50,30,0.18)', borderRadius: 3,
                  padding: '2px 6px', cursor: 'pointer', color: 'rgba(255,110,90,0.55)',
                }}>Limpar Grimório</button>
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
                cursor: dragRef.current.active ? 'grabbing' : (hoveredSeph || hoveredPath !== null) ? 'pointer' : 'grab' }}
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
              {lens.label} · {params.preset}{params.veilsEnabled ? ' · Véus ON' : ''}{params.pillarsEnabled ? ' · Pilares' : ''}
            </div>

            {/* Or Chozer badge */}
            {ocPct > 20 && (
              <div style={{
                position: 'absolute', top: 8, left: 12,
                padding: '3px 8px', borderRadius: 8,
                background: 'rgba(48,10,64,0.75)', border: '1px solid rgba(96,20,128,0.5)',
                fontSize: 7, color: 'rgba(200,150,255,0.9)', letterSpacing: '0.08em',
                pointerEvents: 'none', backdropFilter: 'blur(4px)',
                boxShadow: '0 0 12px rgba(160,80,255,0.2)',
              }}>
                ⬆ Or Chozer {ocPct}%
              </div>
            )}

            {/* Tikkun flash overlay */}
            {orChozerSnap.tikkunFlash > 0 && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: `rgba(96,20,128,${orChozerSnap.tikkunFlash * 0.05})`,
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
                <button key={i} onClick={action} style={{
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 6, cursor: 'pointer',
                  background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(200,185,255,0.6)',
                }}>{ico}</button>
              ))}
            </div>

            {/* Global card apply button */}
            {selectedCard && (
              <button onClick={() => playCard(selectedCard, 'global', 'global')} style={{
                position: 'absolute', top: 8, right: 12, padding: '4px 14px', borderRadius: 6,
                cursor: 'pointer', background: 'rgba(255,200,60,0.12)', border: '1px solid rgba(255,200,60,0.3)',
                fontSize: 8, color: 'rgba(255,220,100,0.9)', letterSpacing: '0.1em',
              }}>
                ✦ Aplicar Globalmente
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
                      {selSephDef.meaning} · Pilar da {selSephDef.pillar === 'mercy' ? 'Misericórdia' : selSephDef.pillar === 'severity' ? 'Severidade' : 'Equilíbrio'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                      {[
                        { l: 'Carga', v: selSephState.charge, c: '#ffd060' },
                        { l: 'Coer', v: selSephState.coherence, c: '#60c0ff' },
                        { l: 'Tensão', v: selSephState.tension, c: '#ff7050' },
                        { l: 'Memória', v: selSephState.memory, c: '#a070ff' },
                      ].map(({ l, v, c }) => (
                        <div key={l} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 6, color: 'rgba(180,165,200,0.5)', letterSpacing: '0.1em' }}>{l}</div>
                          <div style={{ fontSize: 10, color: c }}>{Math.round(v * 100)}%</div>
                        </div>
                      ))}
                    </div>
                    {selSephDef.id === 'malkuth' && ocPct > 20 && (
                      <div style={{ marginTop: 4, fontSize: 7, color: '#c080ff' }}>⬆ Or Chozer Ativo — luz retornando à Fonte</div>
                    )}
                    {selectedCard && <div style={{ marginTop: 4, color: 'rgba(255,220,80,0.8)' }}>← Clique para aplicar carta</div>}
                  </>
                )}
                {selPathDef && selPathArcana && selPathLens && (
                  <>
                    <div style={{ fontSize: 11, color: 'rgba(210,185,255,0.95)' }}>
                      {selPathLens.name}
                      <span style={{ fontSize: 7.5, color: 'rgba(180,160,240,0.5)', marginLeft: 6 }}>
                        {selPathArcana.hebrewLetter} · Caminho {selectedPath}
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
                    {selectedCard && <div style={{ marginTop: 4, color: 'rgba(255,220,80,0.8)' }}>← Clique para aplicar carta</div>}
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
                      {SEPHIRAH_LORE[hovSephDef.id].planet.split(' ')[0]}
                      {' · '}
                      {hovSephDef.pillar === 'mercy' ? '⟩ Misericórdia' : hovSephDef.pillar === 'severity' ? '⟨ Severidade' : '| Equilíbrio'}
                      {selectedCard ? ' · Clique para aplicar' : ' · Clique p/ explorar →'}
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
              MÃO
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
              {selectedCard ? '← clique no nó ou caminho' : 'Selecione uma carta'}
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
              { id: 'journey', label: 'Jornada', ico: '✦' },
              { id: 'grimoire', label: 'Grimório', ico: '📖' },
              { id: 'glossary', label: 'Glossário', ico: '📚' },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setRightTab(t.id)} style={{
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

            {/* JOURNEY */}
            {rightTab === 'journey' && (
              <JourneyPanel
                selectedSeph={selectedSeph}
                selectedPath={selectedPath}
                snap={snap}
                params={params}
                events={events}
                orChozerSnap={orChozerSnap}
                lens={lens}
              />
            )}

            {/* GRIMOIRE */}
            {rightTab === 'grimoire' && (
              <div>
                <div style={{ fontSize: 6.5, color: 'rgba(180,120,255,0.4)', letterSpacing: '0.12em',
                  textTransform: 'uppercase', marginBottom: 6 }}>
                  Grimório · {chapters.length} capítulos
                </div>
                {chapters.length === 0 && (
                  <div style={{ fontSize: 7.5, color: 'rgba(170,155,140,0.3)', padding: '10px 0' }}>
                    Jogue cartas para registrar capítulos automaticamente.
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

            {/* GLOSSARY */}
            {rightTab === 'glossary' && (
              <div>
                <div style={{ fontSize: 6.5, color: 'rgba(180,120,255,0.4)', letterSpacing: '0.12em',
                  textTransform: 'uppercase', marginBottom: 6 }}>
                  Glossário · {lens.label}
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
// Journey Panel — Kabbalah education + Or Chozer guide
// ─────────────────────────────────────────────────────────────────────────────
function JourneyPanel({
  selectedSeph, selectedPath, snap, params, events, orChozerSnap, lens,
}: {
  selectedSeph: SephirahId | null;
  selectedPath: number | null;
  snap: ReturnType<typeof getStateSnapshot>;
  params: TreeOfLifeParams;
  events: KabbalahEvent[];
  orChozerSnap: OrChozerSt;
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
  const CardChozer: React.CSSProperties = {
    padding: '7px 9px', borderRadius: 6, marginBottom: 6,
    background: 'rgba(100,30,180,0.07)', border: '1px solid rgba(160,80,255,0.2)',
  };
  const CardYashar: React.CSSProperties = {
    padding: '7px 9px', borderRadius: 6, marginBottom: 6,
    background: 'rgba(180,140,30,0.07)', border: '1px solid rgba(220,180,60,0.2)',
  };

  // ── SELECTED SEPHIRAH view ─────────────────────────────────────────────────
  if (selectedSeph && lore && sephDef) {
    const isMalkuth = selectedSeph === 'malkuth';
    return (
      <div>
        {/* Sephirah header */}
        <div style={{ ...Card, border: `1px solid ${sephDef.color}40`, background: `${sephDef.color}0a`, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 16, color: sephDef.color, filter: `drop-shadow(0 0 6px ${sephDef.color}80)` }}>◉</span>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(240,235,220,0.95)', fontWeight: 500 }}>{sephDef.label}</div>
              <div style={{ fontSize: 8, color: 'rgba(200,185,255,0.5)' }}>{sephDef.labelHeb} · Sephirah {sephDef.num}</div>
            </div>
          </div>
          <div style={{ fontSize: 7.5, color: 'rgba(200,190,170,0.6)', marginBottom: 3 }}>
            {lore.divineAspect}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 6.5, padding: '2px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'rgba(200,185,170,0.5)' }}>
              🌍 {lore.world}
            </span>
            <span style={{ fontSize: 6.5, padding: '2px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'rgba(200,185,170,0.5)' }}>
              ⟁ {lore.planet.split(' ')[0]}
            </span>
            <span style={{ fontSize: 6.5, padding: '2px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'rgba(200,185,170,0.5)' }}>
              🫀 {lore.body.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* Spiritual meaning */}
        <div style={H}>Significado Espiritual</div>
        <div style={P}>{lore.spiritual}</div>

        {/* Or Yashar */}
        <div style={CardYashar}>
          <div style={{ fontSize: 7, color: 'rgba(220,185,80,0.7)', letterSpacing: '0.1em', marginBottom: 4 }}>⬇ OR YASHAR — Luz Direta</div>
          <div style={P}>{lore.orYashar}</div>
        </div>

        {/* Or Chozer */}
        <div style={{
          ...CardChozer,
          border: isMalkuth && orChozerSnap.level > 0.2 ? '1px solid rgba(160,80,255,0.5)' : '1px solid rgba(160,80,255,0.2)',
          boxShadow: isMalkuth && orChozerSnap.level > 0.2 ? '0 0 12px rgba(160,80,255,0.15)' : 'none',
        }}>
          <div style={{ fontSize: 7, color: 'rgba(160,90,255,0.8)', letterSpacing: '0.1em', marginBottom: 4 }}>⬆ OR CHOZER — Luz Retornante</div>
          <div style={P}>{lore.orChozer}</div>
          {isMalkuth && orChozerSnap.level > 0.15 && (
            <div style={{
              fontSize: 7, padding: '4px 7px', borderRadius: 4, marginTop: 4,
              background: 'rgba(160,80,255,0.12)', border: '1px solid rgba(160,80,255,0.3)',
              color: 'rgba(210,160,255,0.9)',
            }}>
              ✦ Or Chozer ativo ({Math.round(orChozerSnap.level * 100)}%) — partículas violetas ascendendo
            </div>
          )}
        </div>

        {/* Practice */}
        <div style={H}>Na Simulação</div>
        <div style={{ ...Card, borderColor: 'rgba(100,180,255,0.15)', background: 'rgba(60,120,200,0.05)' }}>
          <div style={P}>{lore.practice}</div>
        </div>

        <div style={{ fontSize: 6, color: 'rgba(160,145,130,0.3)', marginTop: 8, textAlign: 'center' }}>
          Clique em outro Sephirah para explorar · Clique no espaço para voltar
        </div>
      </div>
    );
  }

  // ── SELECTED PATH view ─────────────────────────────────────────────────────
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
            Caminho {selectedPath} · Letra {pathArcana.hebrewLetter}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 7.5 }}>
            <span style={{ color: fromDef.color }}>{fromDef.label}</span>
            <span style={{ color: 'rgba(200,185,165,0.4)' }}>→</span>
            <span style={{ color: toDef.color }}>{toDef.label}</span>
          </div>
        </div>

        <div style={H}>Este Caminho</div>
        <div style={P}>
          O Caminho {selectedPath} conecta <b style={{ color: fromDef.color }}>{fromDef.label}</b> ({fromDef.meaning}) a <b style={{ color: toDef.color }}>{toDef.label}</b> ({toDef.meaning}). Na tradição Hermética, cada um dos 22 caminhos é governado por uma arcana maior do Tarot e uma letra hebraica.
        </div>

        <div style={CardYashar}>
          <div style={{ fontSize: 7, color: 'rgba(220,185,80,0.7)', marginBottom: 3 }}>⬇ Or Yashar neste Caminho</div>
          <div style={P}>A luz desce de <b style={{ color: 'rgba(200,185,165,0.7)' }}>{fromDef.label}</b> para <b style={{ color: 'rgba(200,185,165,0.7)' }}>{toDef.label}</b>. A arcana <b style={{ color: 'rgba(210,185,255,0.8)' }}>{pathLens.name}</b> regula a qualidade desta transmissão.</div>
        </div>

        <div style={CardChozer}>
          <div style={{ fontSize: 7, color: 'rgba(160,90,255,0.8)', marginBottom: 3 }}>⬆ Or Chozer neste Caminho</div>
          <div style={P}>Quando Or Chozer está ativo, partículas violetas ascendem de <b style={{ color: 'rgba(200,185,165,0.7)' }}>{toDef.label}</b> para <b style={{ color: 'rgba(200,185,165,0.7)' }}>{fromDef.label}</b> — a luz retorna purificada pela experiência.</div>
        </div>

        <div style={H}>Arcana · {pathLens.name}</div>
        <div style={Card}>
          <div style={{ fontSize: 7.5, color: 'rgba(220,210,195,0.75)', marginBottom: 3 }}>
            {pathLens.keywords.join(' · ')}
          </div>
          <div style={{ fontSize: 7, color: 'rgba(180,165,145,0.55)' }}>{pathLens.microNote}</div>
        </div>

        <div style={H}>Operador Mágico</div>
        <div style={{ ...Card, borderColor: 'rgba(255,200,80,0.2)', background: 'rgba(180,140,30,0.04)' }}>
          <div style={{ fontSize: 8, color: 'rgba(220,190,90,0.8)', marginBottom: 2 }}>
            {pathArcana.operator.primary}
            {pathArcana.operator.secondary ? ` + ${pathArcana.operator.secondary}` : ''}
          </div>
          <div style={{ fontSize: 7, color: 'rgba(180,165,145,0.55)' }}>
            Invertido: {pathArcana.operator.reversed.primary}
          </div>
        </div>
      </div>
    );
  }

  // ── DEFAULT: Overview / Or Chozer education ───────────────────────────────
  return (
    <div>
      {/* Or Chozer / Or Yashar status card */}
      <div style={{
        padding: '8px 10px', borderRadius: 7, marginBottom: 8,
        background: orChozerSnap.tikkunPulse > 0.3
          ? 'linear-gradient(135deg, rgba(180,120,30,0.08), rgba(120,40,200,0.08))'
          : 'rgba(255,255,255,0.02)',
        border: orChozerSnap.tikkunPulse > 0.3
          ? '1px solid rgba(180,120,255,0.25)'
          : '1px solid rgba(255,255,255,0.05)',
        transition: 'all 0.5s',
      }}>
        <div style={{ fontSize: 7, color: 'rgba(200,175,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>
          Estado da Luz
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: 'rgba(220,185,80,0.7)', marginBottom: 2 }}>⬇ Or Yashar</div>
            <div style={{ fontSize: 14, color: '#ffe080', fontFamily: 'monospace' }}>{Math.round(orChozerSnap.orYasharLevel * 100)}%</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: 'rgba(160,90,255,0.7)', marginBottom: 2 }}>⬆ Or Chozer</div>
            <div style={{ fontSize: 14, color: '#c080ff', fontFamily: 'monospace' }}>{Math.round(orChozerSnap.level * 100)}%</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: 'rgba(200,160,255,0.7)', marginBottom: 2 }}>✦ Tikkun</div>
            <div style={{ fontSize: 14, color: orChozerSnap.tikkunPulse > 0.3 ? '#e8c0ff' : 'rgba(200,185,165,0.3)', fontFamily: 'monospace' }}>
              {Math.round(orChozerSnap.tikkunPulse * 100)}%
            </div>
          </div>
        </div>
        {orChozerSnap.tikkunPulse < 0.1 && (
          <div style={{ fontSize: 7, color: 'rgba(170,155,140,0.35)', textAlign: 'center' }}>
            Eleve Malkuth para iniciar Or Chozer ↑
          </div>
        )}
        {orChozerSnap.tikkunPulse > 0.3 && (
          <div style={{ fontSize: 7.5, color: 'rgba(210,170,255,0.8)', textAlign: 'center' }}>
            ✦ Tikkun Olam — Reparação em curso
          </div>
        )}
      </div>

      {/* How to play */}
      <div style={{ padding: '6px 8px', borderRadius: 5, marginBottom: 8,
        background: 'rgba(180,120,255,0.06)', border: '1px solid rgba(180,120,255,0.15)' }}>
        <div style={{ fontSize: 7, color: 'rgba(200,175,255,0.6)', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 5 }}>Como Jogar</div>
        {[
          ['1', 'Clique num Sephirah ou caminho para explorar seu significado'],
          ['2', 'Compre cartas e aplique-as para modular os fluxos'],
          ['3', 'Observe Or Yashar (ouro ↓) e Or Chozer (violeta ↑)'],
          ['4', 'Eleve Malkuth para ativar o Or Chozer — a ascensão'],
          ['∞', 'Busque o equilíbrio: Tikkun Olam'],
        ].map(([n, t]) => (
          <div key={n} style={{ display: 'flex', gap: 6, marginBottom: 3, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 7, color: 'rgba(180,120,255,0.5)', width: 12, flexShrink: 0, marginTop: 0.5 }}>{n}</span>
            <span style={{ fontSize: 7, color: 'rgba(200,190,175,0.65)', lineHeight: 1.4 }}>{t}</span>
          </div>
        ))}
      </div>

      {/* Or Yashar / Or Chozer explanation toggle */}
      <div style={{ marginBottom: 6 }}>
        <button onClick={() => setShowLightLore(!showLightLore)} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 8px', borderRadius: 5, cursor: 'pointer',
          background: 'rgba(180,120,60,0.06)', border: '1px solid rgba(220,185,80,0.15)',
          color: 'rgba(220,185,80,0.7)', fontSize: 7.5, letterSpacing: '0.08em',
        }}>
          <span>✦ Or Yashar & Or Chozer — O Ciclo de Luz</span>
          {showLightLore ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
        {showLightLore && (
          <div style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '0 0 5px 5px', border: '1px solid rgba(220,185,80,0.1)', borderTop: 'none' }}>
            {[AIN_SOPH_LORE, OR_YASHAR_LORE, OR_CHOZER_LORE, TIKKUN_LORE].map((item, i) => (
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

      {/* 4 Worlds */}
      <div style={{ marginBottom: 6 }}>
        <button onClick={() => setShowWorlds(!showWorlds)} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 8px', borderRadius: 5, cursor: 'pointer',
          background: 'rgba(80,120,200,0.06)', border: '1px solid rgba(100,150,220,0.15)',
          color: 'rgba(120,170,255,0.7)', fontSize: 7.5, letterSpacing: '0.08em',
        }}>
          <span>🌍 Os Quatro Mundos (Olamot)</span>
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
                <div style={{ fontSize: 6.5, color: 'rgba(160,145,130,0.5)', marginBottom: 2 }}>Sephirot: {w.sephirot}</div>
                <div style={{ fontSize: 7, color: 'rgba(190,180,165,0.6)', lineHeight: 1.45 }}>{w.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System state */}
      <div style={{ padding: '6px 8px', borderRadius: 5, marginBottom: 8,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 7, color: 'rgba(200,175,255,0.45)', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 5 }}>
          Sistema atual
        </div>
        <SystemDiagnosis snap={snap} params={params} orChozer={orChozerSnap} />
      </div>

      {/* Events */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, cursor: 'pointer' }}
        onClick={() => setShowEvents(v => !v)}>
        <div style={{ fontSize: 7, color: 'rgba(200,175,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', flex: 1 }}>
          Eventos
        </div>
        {showEvents ? <ChevronDown size={9} color="rgba(180,120,255,0.4)" /> : <ChevronRight size={9} color="rgba(180,120,255,0.4)" />}
      </div>
      {showEvents && (
        <>
          {events.length === 0 && (
            <div style={{ fontSize: 7.5, color: 'rgba(170,155,140,0.3)' }}>
              Nenhum evento ainda. Jogue cartas para ativar.
            </div>
          )}
          {[...events].reverse().slice(0, 12).map(ev => (
            <div key={ev.id} style={{
              marginBottom: 5, padding: '4px 7px', borderRadius: 4,
              background: 'rgba(255,255,255,0.025)',
              borderLeft: `2px solid ${ev.kind === 'DISSOLUTION' ? '#60c0ff' :
                ev.kind === 'CRYSTALLIZATION' ? '#ffd060' :
                ev.kind === 'VEIL_BREACH' ? '#ff6040' : 'rgba(180,120,255,0.4)'}`,
            }}>
              <div style={{ fontSize: 6, color: 'rgba(180,120,255,0.5)', marginBottom: 1 }}>{ev.kind}</div>
              <div style={{ fontSize: 7.5, color: 'rgba(210,200,185,0.65)', lineHeight: 1.4 }}>{ev.description}</div>
            </div>
          ))}
        </>
      )}

      <div style={{ fontSize: 6.5, color: 'rgba(160,145,130,0.25)', marginTop: 10, textAlign: 'center', lineHeight: 1.6 }}>
        Clique em qualquer Sephirah ou caminho<br />para explorar seu significado espiritual
      </div>
    </div>
  );
}

function SystemDiagnosis({ snap, params, orChozer }: {
  snap: ReturnType<typeof getStateSnapshot>;
  params: TreeOfLifeParams;
  orChozer: OrChozerSt;
}) {
  const lines: { text: string; color?: string }[] = [];
  if (snap.coherence > 0.6)   lines.push({ text: '✦ Alta coerência — Or Yashar fluindo bem.' });
  if (snap.coherence < 0.25)  lines.push({ text: '◌ Baixa coerência — sistema disperso.' });
  if (snap.tension > 0.55)    lines.push({ text: '⚠ Alta tensão — risco de CRYSTALLIZATION.' });
  if (snap.tension < 0.15)    lines.push({ text: '◎ Tensão mínima — sistema estável.' });
  if (snap.memory > 0.5)      lines.push({ text: '✎ Alta memória — padrões consolidados.' });
  if (snap.openness > 0.65)   lines.push({ text: '⊕ Alta abertura — travessias fáceis.' });
  if (params.veilsEnabled)    lines.push({ text: '🌑 Véus ativos — coerência requer alturas.' });
  if (orChozer.level > 0.3)   lines.push({ text: '⬆ Or Chozer ativo — luz ascendendo.', color: '#c080ff' });
  if (orChozer.tikkunPulse > 0.4) lines.push({ text: '✦ Tikkun Olam — reparação em curso!', color: '#e0c0ff' });
  if (!lines.length)          lines.push({ text: 'Sistema em estado neutro. Jogue cartas.' });
  return (
    <>
      {lines.map((l, i) => (
        <div key={i} style={{ fontSize: 7.5, color: l.color ?? 'rgba(200,190,175,0.65)', lineHeight: 1.45, marginBottom: 2 }}>{l.text}</div>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas Renderer (Or Yashar + Or Chozer particles)
// ─────────────────────────────────────────────────────────────────────────────
function render(
  canvas: HTMLCanvasElement | null,
  state: TreeState,
  params: TreeOfLifeParams,
  cam: Camera,
  fxList: Fx[],
  orbits: Map<SephirahId, OrbitP[]>,
  streams: Map<number, StreamP[]>,
  chozerStreams: Map<number, StreamP[]>,
  orChozer: OrChozerSt,
  selSeph: SephirahId | null,
  selPath: number | null,
  nodeAct: Map<SephirahId, number>,
  pathAct: Map<number, number>,
): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const t = state.time;

  // ── Background ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#050210';
  ctx.fillRect(0, 0, W, H);

  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  bg.addColorStop(0,   'rgba(20,10,60,0.4)');
  bg.addColorStop(0.5, 'rgba(8,4,30,0.3)');
  bg.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Tikkun ambient glow
  if (orChozer.tikkunPulse > 0.2) {
    const tg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.5);
    tg.addColorStop(0, `rgba(160,80,255,${orChozer.tikkunPulse * 0.06})`);
    tg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, W, H);
  }

  // Stars
  ctx.save();
  for (let i = 0; i < 120; i++) {
    const sx = (i * 18731 + 5) % W;
    const sy = (i * 37311 + 17) % H;
    const bright = 0.04 + (i % 7) * 0.015 + Math.sin(t * 0.5 + i) * 0.01;
    ctx.fillStyle = `rgba(220,215,255,${bright})`;
    ctx.fillRect(sx, sy, 1.2, 1.2);
  }
  ctx.restore();

  // ── Camera transform ────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(W / 2 + cam.px, H / 2 + cam.py);
  ctx.scale(cam.zoom, cam.zoom);

  // ── Pillar fields ────────────────────────────────────────────────────────────
  if (params.pillarsEnabled) {
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

  // ── Paths + Or Yashar + Or Chozer ────────────────────────────────────────────
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

    // Outer glow
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.04 + flow * 0.06 + actPulse * 0.12})`;
    ctx.lineWidth = 12 + actPulse * 8;
    ctx.filter = 'blur(4px)';
    ctx.stroke(pathObj);
    ctx.filter = 'none';

    // Mid glow
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.08 + flow * 0.12 + actPulse * 0.2})`;
    ctx.lineWidth = 4;
    ctx.stroke(pathObj);

    // Core line
    if (block > 0.3) ctx.setLineDash([5, 5]);
    ctx.strokeStyle = isSel
      ? `rgba(255,220,80,${0.4 + flow * 0.4})`
      : `rgba(${r},${g},${b},${0.2 + flow * 0.4 + actPulse * 0.3})`;
    ctx.lineWidth = isSel ? 2 : (0.6 + flow * 1.4);
    ctx.stroke(pathObj);
    ctx.setLineDash([]);

    // Or Chozer channel glow (violet overlay on active paths)
    if (orChozer.level > 0.15) {
      ctx.strokeStyle = `rgba(140,60,255,${orChozer.level * 0.06 * flow})`;
      ctx.lineWidth = 6;
      ctx.filter = 'blur(2px)';
      ctx.stroke(pathObj);
      ctx.filter = 'none';
    }

    // Hebrew letter at midpoint
    const lp = bz(0.5, fx2, fy2, cp.x, cp.y, tx2, ty2);
    ctx.fillStyle = `rgba(${r},${g},${b},${0.3 + flow * 0.25})`;
    ctx.font = `${Math.round(10 + flow * 3)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ARCANA_MAP.get(path.arcanaId)!.hebrewLetter, lp.x, lp.y);

    // ── Or Yashar stream particles (golden, flowing down) ────────────────────
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

    // ── Or Chozer stream particles (violet/indigo, flowing UP = reversed path) ──
    const cps = chozerStreams.get(path.pathId) ?? [];
    for (const p of cps) {
      // t=0 at "to" node, t=1 at "from" node (reversed)
      const pos = bz(1 - p.t, fx2, fy2, cp.x, cp.y, tx2, ty2);
      const fade = Math.min(p.t * 5, (1 - p.t) * 5, 1);
      const aIn  = p.energy * fade * orChozer.level;
      const pr   = p.size;

      // Violet glow
      ctx.filter = 'blur(3px)';
      const cGrd = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, pr * 3.5);
      cGrd.addColorStop(0, `rgba(160,80,255,${aIn * 0.6})`);
      cGrd.addColorStop(1, 'rgba(100,40,200,0)');
      ctx.fillStyle = cGrd;
      ctx.beginPath(); ctx.arc(pos.x, pos.y, pr * 3.5, 0, TWO_PI); ctx.fill();
      ctx.filter = 'none';

      // Core violet dot
      ctx.fillStyle = `rgba(200,140,255,${aIn})`;
      ctx.beginPath(); ctx.arc(pos.x, pos.y, pr * 0.8, 0, TWO_PI); ctx.fill();

      // Inner white spark
      ctx.fillStyle = `rgba(240,220,255,${aIn * 0.6})`;
      ctx.beginPath(); ctx.arc(pos.x, pos.y, pr * 0.3, 0, TWO_PI); ctx.fill();
    }

    ctx.restore();
  }

  // ── Sephirot ─────────────────────────────────────────────────────────────────
  for (const seph of SEPHIROT) {
    const sx    = wx(seph.nx), sy2 = wy(seph.ny);
    const s     = state.sephirot.get(seph.id)!;
    const isSel = selSeph === seph.id;
    const actAge = nodeAct.get(seph.id) ?? 99;
    const actP  = Math.max(0, 1 - actAge / 2.5);

    const nc = seph.color;
    const [nr, ng, nb] = [parseInt(nc.slice(1,3),16), parseInt(nc.slice(3,5),16), parseInt(nc.slice(5,7),16)];

    // Or Chozer aura for Malkuth when returning light is active
    const isMalkuth = seph.id === 'malkuth';
    const isKether  = seph.id === 'kether';

    ctx.save();

    // Chozer aura (Malkuth — source; Kether — destination)
    if (isMalkuth && orChozer.level > 0.2) {
      const chozerR = NODE_R * (4 + orChozer.level * 4);
      ctx.filter = 'blur(8px)';
      const cg = ctx.createRadialGradient(sx, sy2, NODE_R, sx, sy2, chozerR);
      cg.addColorStop(0, `rgba(140,60,220,${orChozer.level * 0.3})`);
      cg.addColorStop(1, 'rgba(100,30,180,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(sx, sy2, chozerR, 0, TWO_PI); ctx.fill();
      ctx.filter = 'none';
    }

    if (isKether && orChozer.level > 0.4) {
      const tikP = orChozer.tikkunPulse;
      ctx.filter = 'blur(6px)';
      const kg = ctx.createRadialGradient(sx, sy2, NODE_R, sx, sy2, NODE_R * 5);
      kg.addColorStop(0, `rgba(200,160,255,${tikP * 0.25})`);
      kg.addColorStop(1, 'rgba(180,120,255,0)');
      ctx.fillStyle = kg;
      ctx.beginPath(); ctx.arc(sx, sy2, NODE_R * 5, 0, TWO_PI); ctx.fill();
      ctx.filter = 'none';
    }

    // Outer nebula glow
    const glowR = NODE_R * (3 + s.charge * 3 + actP * 2);
    const grd = ctx.createRadialGradient(sx, sy2, NODE_R * 0.5, sx, sy2, glowR);
    grd.addColorStop(0, `rgba(${nr},${ng},${nb},${(s.charge * 0.25 + actP * 0.35)})`);
    grd.addColorStop(0.4, `rgba(${nr},${ng},${nb},${s.charge * 0.08})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.filter = 'blur(2px)';
    ctx.beginPath(); ctx.arc(sx, sy2, glowR, 0, TWO_PI); ctx.fill();
    ctx.filter = 'none';

    // Orbiting particles
    const orbs = orbits.get(seph.id) ?? [];
    for (const p of orbs) {
      const ox = sx + Math.cos(p.angle) * p.radius;
      const oy = sy2 + Math.sin(p.angle) * p.radius;
      ctx.fillStyle = `rgba(${nr + 40},${ng + 40},${nb + 40},${p.alpha * s.charge})`;
      ctx.beginPath(); ctx.arc(ox, oy, 1.5 + s.charge * 1.5, 0, TWO_PI); ctx.fill();
    }

    // Node circle bg
    const bg2 = ctx.createRadialGradient(sx - NODE_R * 0.25, sy2 - NODE_R * 0.25, 2, sx, sy2, NODE_R);
    bg2.addColorStop(0, `rgba(${nr},${ng},${nb},${0.35 + s.charge * 0.35 + actP * 0.2})`);
    bg2.addColorStop(1, `rgba(${nr},${ng},${nb},${0.06 + s.charge * 0.10})`);
    ctx.fillStyle = bg2;
    ctx.beginPath(); ctx.arc(sx, sy2, NODE_R, 0, TWO_PI); ctx.fill();

    // Tension ring
    if (s.tension > 0.1) {
      const pulseTension = 0.4 + Math.sin(t * 4 + seph.num) * 0.3;
      ctx.strokeStyle = `rgba(220,60,40,${s.tension * pulseTension})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(sx, sy2, NODE_R * (0.8 + s.tension * 0.4), 0, TWO_PI); ctx.stroke();
    }

    // Coherence ring
    if (s.coherence > 0.1) {
      ctx.strokeStyle = `rgba(80,180,255,${s.coherence * 0.4})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(sx, sy2, NODE_R * 1.15, 0, TWO_PI * s.coherence); ctx.stroke();
    }

    // Or Chozer ring on Malkuth (pulsing violet)
    if (isMalkuth && orChozer.level > 0.1) {
      const pulse = 0.5 + Math.sin(t * 2) * 0.3;
      ctx.strokeStyle = `rgba(160,80,255,${orChozer.level * pulse * 0.8})`;
      ctx.lineWidth = 1.5 + orChozer.level * 1.5;
      ctx.beginPath(); ctx.arc(sx, sy2, NODE_R * 1.3, 0, TWO_PI); ctx.stroke();
    }

    // Tikkun crown on Kether
    if (isKether && orChozer.tikkunPulse > 0.2) {
      const pulse = 0.5 + Math.sin(t * 1.5) * 0.4;
      ctx.strokeStyle = `rgba(200,150,255,${orChozer.tikkunPulse * pulse * 0.9})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy2, NODE_R * 1.5, 0, TWO_PI); ctx.stroke();
    }

    // Activation flash
    if (actP > 0) {
      ctx.strokeStyle = `rgba(255,220,80,${actP * 0.7})`;
      ctx.lineWidth = 2 + actP * 2;
      ctx.beginPath(); ctx.arc(sx, sy2, NODE_R * (1 + actP * 0.5), 0, TWO_PI); ctx.stroke();
    }

    // Selection ring
    if (isSel) {
      ctx.strokeStyle = 'rgba(255,220,80,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sx, sy2, NODE_R + 3, 0, TWO_PI); ctx.stroke();
    }

    // Border
    ctx.strokeStyle = isSel ? 'rgba(255,220,80,0.5)' : `rgba(${nr},${ng},${nb},${0.3 + s.coherence * 0.4})`;
    ctx.lineWidth = isSel ? 1.5 : 0.8;
    ctx.beginPath(); ctx.arc(sx, sy2, NODE_R, 0, TWO_PI); ctx.stroke();

    // Labels
    ctx.fillStyle = `rgba(240,235,220,${0.6 + s.coherence * 0.3})`;
    ctx.font = `${Math.round(NODE_R * 0.52)}px system-ui`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(seph.label, sx, sy2);

    ctx.fillStyle = `rgba(${nr + 30},${ng + 30},${nb + 30},0.4)`;
    ctx.font = `${Math.round(NODE_R * 0.42)}px serif`;
    ctx.fillText(seph.num.toString(), sx, sy2 + NODE_R * 1.4);

    ctx.restore();
  }

  // ── Visual effects ──────────────────────────────────────────────────────────
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

  ctx.restore(); // end camera transform

  // ── Pillar labels (screen-space) ─────────────────────────────────────────────
  if (params.pillarsEnabled) {
    ctx.save();
    ctx.font = '9px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(180,40,40,0.20)';
    ctx.save(); ctx.translate(18, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('SEVERIDADE', 0, 0); ctx.restore();
    ctx.fillStyle = 'rgba(40,80,200,0.20)';
    ctx.save(); ctx.translate(W - 18, H / 2); ctx.rotate(Math.PI / 2); ctx.fillText('MISERICÓRDIA', 0, 0); ctx.restore();
    ctx.restore();
  }

  // ── Or Chozer indicator (screen-space, bottom right) ─────────────────────────
  if (orChozer.level > 0.05) {
    ctx.save();
    const barW = 80, barH = 4;
    const bx = W - barW - 12, by = H - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
    ctx.fillStyle = `rgba(140,60,220,${orChozer.level * 0.6})`;
    ctx.fillRect(bx, by, barW * orChozer.level, barH);
    ctx.fillStyle = `rgba(200,150,255,${orChozer.level * 0.9})`;
    ctx.font = '7px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(`⬆ Or Chozer ${Math.round(orChozer.level * 100)}%`, W - 12, by - 4);
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
    <button onClick={onClick} style={{
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
    <button onClick={onClick} style={{
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
