// ── UI strings EN / PT-BR ─────────────────────────────────────────────────────

export type Locale = 'en' | 'pt-BR';

export type StringKey = keyof typeof en;

const en = {
  // Home — top bar
  home_entrar: 'Sign in',
  home_entrar_title: 'Sign in or register',
  home_admin: 'ADMIN',
  home_admin_on: 'ADMIN ON',
  home_admin_title: 'Admin Mode (active)',
  home_admin_title_off: 'Admin Mode (password)',

  // Home — hero
  home_alphaTest: 'ALPHA TEST',
  home_hello: 'Hello,',
  home_toolsNav: 'TOOLS',

  // Home — project section
  home_devicesTag: 'devices for intuition',
  home_projectTitle: 'A living lab to think with the body — and perception.',
  home_projectDesc: 'We build tools to perceive and study, heuristically, visually and non-linearly, complex dynamics: systems that change, self-organize, enter crisis, reinvent themselves.',
  home_projectDesc2: 'We build lenses to test hypotheses in real time — a machine for generating questions, not final answers.',
  home_toolsAre: 'the tools are',
  home_lenses: '"LENSES"',
  home_biblio_thesis: 'Continuous Thesis',
  home_biblio_bibliography: 'Bibliography',

  // Home — algorithm
  home_algorithm: 'Algorithm',
  home_algorithmDesc: 'All our tools use the same custom artificial life (ALife) principle and algorithm, based on particles with variable, mutable and influenceable archetypes.',
  home_simBackground: 'simulation running in real time in the background',
  home_field: '[ Field ]',
  home_agents: '[ Agents ]',
  home_interactions: '[ Interactions ]',
  home_recursivity: '↺ (recursivity)',

  // Home — manifesto
  home_manifesto1: 'We believe the act of forming a hypothesis should stay free, variable, continuous, visual — and meta-linguistic.',
  home_manifesto2: 'The point is not definitive truth, but lenses that resist linear, “closed” equations.',
  home_toolsAvailable: '9 tools available + 3 coming soon.',
  home_freeAlpha: '(free during alpha test)',

  // Home — labs section
  home_availableTools: 'AVAILABLE TOOLS (9) + SOON (3)',
  home_entrarToAccess: 'Sign in (top right) to access the tools.',
  home_locked: 'LOCKED',

  // Home — footer
  home_footer: 'Devices for Intuition © 2026',

  // Labs list (names, tags, descriptions) — by lab id
  lab_complexityLife_name: 'Complexity Lab',
  lab_complexityLife_desc: 'LEARN TO OPERATE THE ARTIFICIAL LIFE ALGORITHM THROUGH EXPERIMENTS, PRESETS AND INTERACTIVE VARIABLE PARAMETERS.',
  lab_metaArtLab_name: 'Meta-Gen-Art',
  lab_metaArtLab_desc: 'LIVING CREATION LAB. EXPERIMENT WITH GENERATIVE ART THROUGH "INK" WITH A LIFE OF ITS OWN.',
  lab_psycheLab_name: 'Psyche Lab',
  lab_psycheLab_desc: 'NEURAL FIELDS AND CONSCIOUSNESS DYNAMICS. EXPERIMENT WITH EMERGENT PSYCHIC FLOWS THROUGH ARCHETYPAL AGENTS.',
  lab_musicLab_name: 'Complex Music Lab',
  lab_musicLab_desc: 'COMPLEX DIGITAL MUSICAL INSTRUMENT. USE PARTICLES WITH A LIFE OF THEIR OWN TO MAKE EXPERIMENTAL MUSIC.',
  lab_rhizomeLab_name: 'Rhizome Search',
  lab_rhizomeLab_desc: 'TOOL FOR NON-LINEAR EPISTEMOLOGICAL RESEARCH. SEE CONCEPTS/NAMES/BIBLIOGRAPHIES THROUGH EXPANDABLE RHIZOMES.',
  lab_alchemyLab_name: 'Alchemy Table',
  lab_alchemyLab_desc: 'LEARN THE BASIC CONCEPT OF EMERGENCE, TRANSMUTATION AND COMPLEXITY OF CHEMICAL AND METAPHORICAL ELEMENTS.',
  lab_treeOfLife_name: 'Tree of Life',
  lab_treeOfLife_desc: 'HERMETIC QABALAH SIMULATOR. EXPLORE THE 10 SEPHIROTH, 22 PATHS, TAROT ARCANA, RITUAL TOOLS AND THE GREAT WORK. GOLDEN DAWN TRADITION.',
  lab_sociogenesis_name: 'Sociogenesis',
  lab_sociogenesis_desc: 'DISCOVER THE EMERGENCE OF SYMBOLS, INSTITUTIONS, MYTHS, TOTEMS AND TABOOS AMONG AGENTS AND HOW THIS CHANGES THE FIELD.',
  lab_milPlatos_name: 'Mil Platôs',
  lab_milPlatos_desc: 'DELEUZE & GUATTARI OPERATIONAL LENS. SIMULATE STRATIFICATION ↔ BODY WITHOUT ORGANS, PLATEAUS, RHIZOME AND LINES OF FLIGHT.',
  lab_languageLab_name: 'Recursive Language',
  lab_languageLab_desc: 'COMING SOON',
  lab_asimovTheater_name: 'Psico-history Theater',
  lab_asimovTheater_desc: 'COMING SOON',
  lab_physicsSandbox_name: 'Physics Sandbox',
  lab_physicsSandbox_desc: 'COMING SOON',

  lab_status_alpha: 'ALPHA V0',
  lab_status_experimental: 'EXPERIMENTAL BUILD',

  // Top HUD
  topHud_goHome: 'Back to Labs',
  topHud_tools: 'TOOLS',
  topHud_admin: 'ADMIN',
  topHud_admin_title: 'Admin Mode (active)',
  topHud_admin_title_off: 'Admin Mode (password)',
  topHud_3d: '3D',
  topHud_3d_title: 'Back to 2D',
  topHud_3d_title_off: '3D mode',
  topHud_play: 'Play',
  topHud_pause: 'Pause',
  topHud_reset: 'Reset',
  topHud_undo: 'Undo',
  topHud_field: 'FIELD',
  topHud_field_title: 'Energy Field',
  topHud_guide: 'Guided Tour',
  topHud_achievements: 'Achievements',
  topHud_worldLog: 'World Log',
  topHud_chronicle: 'Chronicle',
  topHud_cinematic: 'Cinematic mode (H)',
  topHud_circular: 'CIRCULAR',

  // Top HUD — lab tab labels
  tab_complexityLife: 'Complexity Life',
  tab_metaArtLab: 'Meta-Gen-Art',
  tab_musicLab: 'Music Lab',
  tab_rhizomeLab: 'Rhizome',
  tab_alchemyLab: 'Alchemy',
  tab_treeOfLife: 'Tree of Life',
  tab_sociogenesis: 'Sociogenesis',
  tab_psycheLab: 'Psyche',
  tab_milPlatos: 'Mil Platôs',
  tab_languageLab: 'Language',
  tab_asimovTheater: 'Asimov',
  tab_physicsSandbox: 'Physics',

  // Field layers (Complexity Lab)
  layer_tension: 'Tension',
  layer_cohesion: 'Cohesion',
  layer_scarcity: 'Nutrition',
  layer_novelty: 'Entropy',

  // Admin gate
  adminGate_title: 'Admin Mode',
  adminGate_desc: 'Unlocks access to locked/“coming soon” tools. (UI gate — not real security.)',
  adminGate_placeholder: 'Password...',
  adminGate_submit: 'Unlock',
  adminGate_close: 'Close',

  // Toasts
  toast_adminActivated: 'Admin Mode activated',
  toast_adminDesc: 'Access granted.',

  // Guide — 3-step emergence experiment (Complexity Life, accessible for all ages)
  guide_emergence_1_title: 'Take your time',
  guide_emergence_1_copy: "You're looking at a living canvas. Each dot is an agent; each colour is a species. They move by simple rules of attraction and repulsion. For a few seconds, just watch — there's nothing to do yet. When you're ready, click Next below.",
  guide_emergence_2_title: 'One small change',
  guide_emergence_2_copy: "In the bar at the top, find the «Speed» control (or the numbers 1–4 next to it). Try moving the speed a little — faster or slower. Watch how the same scene changes rhythm. When you've tried it, click Next.",
  guide_emergence_3_title: 'What you just saw',
  guide_emergence_3_copy: "That change is called emergence: the same rules, with a different rhythm, create different patterns — rings, flocks, or chaos. Nothing was programmed to «look like that»; it emerges from the rules. You can keep exploring: open the panel on the right for presets, or drag on the canvas to push the agents.",
} as const;

const ptBR: Record<StringKey, string> = {
  home_entrar: 'Entrar',
  home_entrar_title: 'Entrar ou cadastrar',
  home_admin: 'ADMIN',
  home_admin_on: 'ADMIN ON',
  home_admin_title: 'Admin Mode (ativado)',
  home_admin_title_off: 'Admin Mode (senha)',

  home_alphaTest: 'ALPHA TEST',
  home_hello: 'Olá,',
  home_toolsNav: 'FERRAMENTAS',

  home_devicesTag: 'devices for intuition',
  home_projectTitle: 'Um laboratório vivo para pensar com o corpo — e percepção.',
  home_projectDesc: 'Criamos ferramentas para perceber e estudar, de forma heurística, visual e não linear, dinâmicas complexas: sistemas que mudam, se organizam, entram em crise, se reinventam.',
  home_projectDesc2: 'Construímos lentes para testar hipóteses em tempo real — uma máquina de gerar perguntas, não respostas finais.',
  home_toolsAre: 'as ferramentas são',
  home_lenses: '"LENTES"',
  home_biblio_thesis: 'Tese Contínua',
  home_biblio_bibliography: 'Bibliografia',

  home_algorithm: 'Algoritmo',
  home_algorithmDesc: 'Todas as nossas ferramentas utilizam o mesmo princípio e algoritmo de vida artificial customizado (ALife), baseado em partículas com arquétipos variáveis, mutáveis e influenciáveis.',
  home_simBackground: 'simulação rodando em tempo real no background',
  home_field: '[ Campo ]',
  home_agents: '[ Agentes ]',
  home_interactions: '[ Interações ]',
  home_recursivity: '↺ (recursividade)',

  home_manifesto1: 'Acreditamos que o gesto de construir uma hipótese deve permanecer livre, variável, contínuo, visual — e meta-linguístico.',
  home_manifesto2: 'A ideia não é verdade definitiva, e sim lentes que resistem a equações lineares e “fechadas”.',
  home_toolsAvailable: '9 ferramentas disponíveis + 3 em breve.',
  home_freeAlpha: '(grátis durante alpha test)',

  home_availableTools: 'AVAILABLE TOOLS (9) + SOON (3)',
  home_entrarToAccess: 'Entrar (canto superior) para acessar as ferramentas.',
  home_locked: 'TRANCADO',

  home_footer: 'Devices for Intuition © 2026',

  lab_complexityLife_name: 'Complexity Lab',
  lab_complexityLife_desc: 'APRENDA A OPERAR COM O ALGORITMO DA VIDA ARTIFICIAL ATRAVÉS DE EXPERIMENTOS, PRESETS E PARÂMETROS VARIÁVEIS INTERATIVOS.',
  lab_metaArtLab_name: 'Meta-Gen-Art',
  lab_metaArtLab_desc: 'LABORATÓRIO DE CRIAÇÃO VIVA. EXPERIMENTE FAZER ARTE GENERATIVA ATRAVÉS DE "TINTA" COM VIDA PRÓPRIA.',
  lab_psycheLab_name: 'Psyche Lab',
  lab_psycheLab_desc: 'CAMPOS NEURAIS E DINÂMICAS DE CONSCIÊNCIA. EXPERIMENTE FLUXOS PSÍQUICOS EMERGENTES ATRAVÉS DE AGENTES ARQUETÍPICOS.',
  lab_musicLab_name: 'Complex Music Lab',
  lab_musicLab_desc: 'INSTRUMENTO MUSICAL DIGITAL COMPLEXO. USE PARTÍCULAS COM VIDA PRÓPRIA PRA FAZER MÚSICA EXPERIMENTAL.',
  lab_rhizomeLab_name: 'Rhizome Search',
  lab_rhizomeLab_desc: 'FERRAMENTA PARA PESQUISAS EPISTEMOLÓGICAS NÃO-LINEARES. VEJA CONCEITOS/NOMES/BIBLIOGRAFIAS ATRAVÉS DE RIZOMAS EXPANSÍVEIS.',
  lab_alchemyLab_name: 'Alchemy Table',
  lab_alchemyLab_desc: 'APRENDA O CONCEITO BÁSICO DE EMERGÊNCIA, TRANSMUTAÇÃO E COMPLEXIDADE DE ELEMENTOS QUÍMICOS E METAFÓRICOS.',
  lab_treeOfLife_name: 'Tree of Life',
  lab_treeOfLife_desc: 'HERMETIC QABALAH SIMULATOR. EXPLORE THE 10 SEPHIROTH, 22 PATHS, TAROT ARCANA, RITUAL TOOLS AND THE GREAT WORK. GOLDEN DAWN TRADITION.',
  lab_sociogenesis_name: 'Sociogenesis',
  lab_sociogenesis_desc: 'DESCUBRA A EMERGÊNCIA DE SÍMBOLOS, INSTITUIÇÕES, MITOS, TOTENS E TABUS ENTRE AGENTES E COMO ISSO ALTERA O CAMPO.',
  lab_milPlatos_name: 'Mil Platôs',
  lab_milPlatos_desc: 'LENTE OPERACIONAL DELEUZE & GUATTARI. SIMULE ESTRATIFICAÇÃO ↔ CORPO SEM ÓRGÃOS, PLATÔS, RIZOMA E LINHAS DE FUGA.',
  lab_languageLab_name: 'Recursive Language',
  lab_languageLab_desc: 'EM BREVE',
  lab_asimovTheater_name: 'Psico-history Theater',
  lab_asimovTheater_desc: 'EM BREVE',
  lab_physicsSandbox_name: 'Physics Sandbox',
  lab_physicsSandbox_desc: 'EM BREVE',

  lab_status_alpha: 'ALPHA V0',
  lab_status_experimental: 'EXPERIMENTAL BUILD',

  topHud_goHome: 'Voltar para Labs',
  topHud_tools: 'FERRAMENTAS',
  topHud_admin: 'ADMIN',
  topHud_admin_title: 'Admin Mode (ativado)',
  topHud_admin_title_off: 'Admin Mode (senha)',
  topHud_3d: '3D',
  topHud_3d_title: 'Voltar para 2D',
  topHud_3d_title_off: 'Modo 3D',
  topHud_play: 'Reproduzir',
  topHud_pause: 'Pausar',
  topHud_reset: 'Reiniciar',
  topHud_undo: 'Desfazer',
  topHud_field: 'CAMPO',
  topHud_field_title: 'Campo de Energia',
  topHud_guide: 'Tour Guiado',
  topHud_achievements: 'Conquistas',
  topHud_worldLog: 'World Log',
  topHud_chronicle: 'Chronicle',
  topHud_cinematic: 'Modo Cinematico (H)',
  topHud_circular: 'CIRCULAR',

  tab_complexityLife: 'Complexity Life',
  tab_metaArtLab: 'Meta-Gen-Art',
  tab_musicLab: 'Music Lab',
  tab_rhizomeLab: 'Rhizome',
  tab_alchemyLab: 'Alchemy',
  tab_treeOfLife: 'Tree of Life',
  tab_sociogenesis: 'Sociogenesis',
  tab_psycheLab: 'Psyche',
  tab_milPlatos: 'Mil Platôs',
  tab_languageLab: 'Idioma',
  tab_asimovTheater: 'Asimov',
  tab_physicsSandbox: 'Física',

  layer_tension: 'Tensao',
  layer_cohesion: 'Coesao',
  layer_scarcity: 'Nutricao',
  layer_novelty: 'Entropia',

  adminGate_title: 'Admin Mode',
  adminGate_desc: 'Libera acesso a tools trancadas/"em breve". (Gate de UI — não é segurança real.)',
  adminGate_placeholder: 'Senha...',
  adminGate_submit: 'Desbloquear',
  adminGate_close: 'Fechar',

  toast_adminActivated: 'Admin Mode ativado',
  toast_adminDesc: 'Acesso liberado.',

  guide_emergence_1_title: 'Olhe com calma',
  guide_emergence_1_copy: 'Você está vendo uma tela viva. Cada ponto é um agente; cada cor é uma espécie. Eles se movem por regras simples de atração e repulsão. Por alguns segundos, apenas observe — não há nada a fazer ainda. Quando quiser, clique em Próximo abaixo.',
  guide_emergence_2_title: 'Um ajuste só',
  guide_emergence_2_copy: 'Na barra no topo, procure o controle de «Velocidade» (ou os números 1–4 ao lado). Tente mudar um pouco — mais rápido ou mais devagar. Veja como a mesma cena muda de ritmo. Quando tiver experimentado, clique em Próximo.',
  guide_emergence_3_title: 'O que você viu',
  guide_emergence_3_copy: 'Essa mudança se chama emergência: as mesmas regras, com outro ritmo, geram outros padrões — anéis, cardumes ou caos. Nada foi programado para «ficar daquele jeito»; surge das regras. Você pode continuar explorando: abra o painel à direita para ver presets, ou arraste no canvas para empurrar os agentes.',
};

export const translations: Record<Locale, Record<StringKey, string>> = { en, 'pt-BR': ptBR };

export function t(locale: Locale, key: StringKey): string {
  const map = translations[locale];
  return (map && map[key]) ?? (en as Record<string, string>)[key] ?? String(key);
}
