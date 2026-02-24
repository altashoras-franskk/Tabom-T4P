// ── Tabela Periódica Completa — 118 Elementos com Receitas Alquímicas ──────────
// Cada elemento tem condições de descoberta mapeadas para os 4 elementos clássicos
// (Terra, Água, Ar, Fogo) + Calor + Operações + Fases Opus + Lapis

export type ElementCategory =
  | 'alcali'
  | 'alcalino-terroso'
  | 'transicao'
  | 'lantanideo'
  | 'actinineo'
  | 'metal-representativo'
  | 'semi-metal'
  | 'nao-metal'
  | 'halogeno'
  | 'gas-nobre'
  | 'desconhecido';

export interface CategoryInfo {
  label: string;
  color: string;
  dim:   string;  // dim version for undiscovered
}

export const CATEGORY_INFO: Record<ElementCategory, CategoryInfo> = {
  'alcali':               { label:'Metais Alcalinos',         color:'#ff9800', dim:'#7a4800' },
  'alcalino-terroso':     { label:'Metais Alcalino-Terrosos', color:'#ffc107', dim:'#7a5c00' },
  'transicao':            { label:'Metais de Transição',      color:'#f06292', dim:'#6a2545' },
  'lantanideo':           { label:'Lantanídeos',              color:'#81c784', dim:'#2a5c2e' },
  'actinineo':            { label:'Actinídeos',               color:'#a5d6a7', dim:'#2e5c30' },
  'metal-representativo': { label:'Metais Representativos',   color:'#4dd0e1', dim:'#1a5c65' },
  'semi-metal':           { label:'Semi-metais',              color:'#26a69a', dim:'#0f4a45' },
  'nao-metal':            { label:'Não-metais',               color:'#90caf9', dim:'#2a4a6a' },
  'halogeno':             { label:'Halogênios',               color:'#66bb6a', dim:'#1e4a20' },
  'gas-nobre':            { label:'Gases Nobres',             color:'#9575cd', dim:'#3a2a6a' },
  'desconhecido':         { label:'Desconhecido',             color:'#90a4ae', dim:'#3a4a50' },
};

export interface ElementRecipe {
  earth?: [number, number];   // proporção mínima e máxima [0-1]
  water?: [number, number];
  air?:   [number, number];
  fire?:  [number, number];
  heat:   [number, number];   // calor [min, max] 0-1
  ops?:   string[];           // operações que devem ter sido usadas
  opusPhase?: 'NIGREDO'|'ALBEDO'|'CITRINITAS'|'RUBEDO';
  lapisRequired?: boolean;
  ticksNeeded:  number;       // ciclos de 60 ticks nas condições corretas
  hint: string;               // dica instrutiva para o jogador
}

export interface ChemElement {
  z:      number;
  symbol: string;
  name:   string;     // português
  cat:    ElementCategory;
  period: number;
  group:  number | null;
  row:    number;     // linha de display (1-7 principal, 8=lantanídeos, 9=actinídeos)
  col:    number;     // coluna de display 1-18
  mass:   number;
  desc:   string;     // descrição breve
  alch?:  string;     // nome alquímico / símbolo
  recipe: ElementRecipe;
}

// ── Os 118 Elementos ──────────────────────────────────────────────────────────
export const PERIODIC_ELEMENTS: ChemElement[] = [

  // ═══════════════════════════════════════════════════════════ PERÍODO 1
  { z:1,  symbol:'H',  name:'Hidrogênio',  cat:'nao-metal',         period:1, group:1,  row:1, col:1,  mass:1.008,   alch:'☿ Primordial',
    desc:'O elemento mais abundante. Base de toda matéria.',
    recipe:{ water:[0.3,1], air:[0.2,0.8], heat:[0,0.4], ticksNeeded:2, hint:'↑ Água + Ar. Condições primordiais — o primeiro elemento.' }},
  { z:2,  symbol:'He', name:'Hélio',        cat:'gas-nobre',          period:1, group:18, row:1, col:18, mass:4.003,
    desc:'Gás nobre raro. Inerte, incombustível.',
    recipe:{ air:[0.6,1], heat:[0,0.12], ticksNeeded:5, hint:'Ar máximo + calor mínimo. Use SUBLIMATIO para isolar.' }},

  // ═══════════════════════════════════════════════════════════ PERÍODO 2
  { z:3,  symbol:'Li', name:'Lítio',        cat:'alcali',             period:2, group:1,  row:2, col:1,  mass:6.941,   alch:'♄ Inflamável',
    desc:'Metal alcalino leve. Reage com água liberando fogo.',
    recipe:{ fire:[0.4,0.9], earth:[0.05,0.35], heat:[0.3,0.7], ticksNeeded:6, hint:'↑ Fogo + pouca Terra. O fogo toca a matéria sólida.' }},
  { z:4,  symbol:'Be', name:'Berílio',      cat:'alcalino-terroso',   period:2, group:2,  row:2, col:2,  mass:9.012,
    desc:'Metal leve e rígido. Extremamente tóxico.',
    recipe:{ earth:[0.3,0.6], fire:[0.3,0.6], heat:[0.35,0.72], ticksNeeded:8, hint:'Terra + Fogo em proporções iguais, calor moderado.' }},
  { z:5,  symbol:'B',  name:'Boro',          cat:'semi-metal',         period:2, group:13, row:2, col:13, mass:10.811,
    desc:'Semi-metal essencial. Cristais boratos formam gemas.',
    recipe:{ earth:[0.25,0.55], air:[0.25,0.55], heat:[0.3,0.7], ticksNeeded:7, hint:'Terra + Ar equilibrados — a cristalização do éter.' }},
  { z:6,  symbol:'C',  name:'Carbono',       cat:'nao-metal',          period:2, group:14, row:2, col:14, mass:12.011,  alch:'♁ Quintessência',
    desc:'Base da vida. Do diamante ao grafite, infinitas formas.',
    recipe:{ earth:[0.2,0.5], air:[0.2,0.5], heat:[0.2,0.6], ticksNeeded:3, hint:'Terra + Ar equilibrados. A quintessência da vida orgânica.' }},
  { z:7,  symbol:'N',  name:'Nitrogênio',    cat:'nao-metal',          period:2, group:15, row:2, col:15, mass:14.007,
    desc:'78% da atmosfera. Essencial para aminoácidos.',
    recipe:{ air:[0.45,0.95], heat:[0,0.4], ticksNeeded:4, hint:'Ar dominante + baixo calor. O ar primordial inerte.' }},
  { z:8,  symbol:'O',  name:'Oxigênio',      cat:'nao-metal',          period:2, group:16, row:2, col:16, mass:15.999,  alch:'☁ Vital',
    desc:'Essencial à respiração e combustão.',
    recipe:{ water:[0.3,0.7], air:[0.2,0.5], heat:[0.1,0.5], ticksNeeded:3, hint:'Água + Ar com calor suave — a respiração do cosmos.' }},
  { z:9,  symbol:'F',  name:'Flúor',         cat:'halogeno',           period:2, group:17, row:2, col:17, mass:18.998,
    desc:'O elemento mais eletronegativo. Corrói quase tudo.',
    recipe:{ air:[0.3,0.65], fire:[0.3,0.65], heat:[0.25,0.65], ticksNeeded:8, hint:'Ar + Fogo equilibrados. O sal do fogo celestial.' }},
  { z:10, symbol:'Ne', name:'Neônio',         cat:'gas-nobre',          period:2, group:18, row:2, col:18, mass:20.180,
    desc:'Gás nobre que emite luz vermelha ao ionizar.',
    recipe:{ air:[0.6,1], heat:[0,0.15], ticksNeeded:6, hint:'Ar máximo + calor muito baixo. SUBLIMATIO ajuda.' }},

  // ═══════════════════════════════════════════════════════════ PERÍODO 3
  { z:11, symbol:'Na', name:'Sódio',         cat:'alcali',             period:3, group:1,  row:3, col:1,  mass:22.990,  alch:'♄ Sal Volátil',
    desc:'Metal mole. Explode em contato com água.',
    recipe:{ fire:[0.4,0.8], earth:[0.1,0.4], heat:[0.4,0.8], ticksNeeded:6, hint:'↑ Fogo + alguma Terra, calor médio-alto.' }},
  { z:12, symbol:'Mg', name:'Magnésio',      cat:'alcalino-terroso',   period:3, group:2,  row:3, col:2,  mass:24.305,
    desc:'Metal leve. Queima com chama branca intensa.',
    recipe:{ earth:[0.3,0.6], fire:[0.2,0.5], heat:[0.35,0.72], ticksNeeded:7, hint:'Terra + Fogo, calor moderado. O brilho metálico nasce.' }},
  { z:13, symbol:'Al', name:'Alumínio',      cat:'metal-representativo', period:3, group:13, row:3, col:13, mass:26.982,
    desc:'O metal mais abundante na crosta terrestre.',
    recipe:{ earth:[0.4,0.8], air:[0.1,0.3], heat:[0.35,0.72], ticksNeeded:7, hint:'Terra + Ar, calor moderado. A pedra que se torna metal.' }},
  { z:14, symbol:'Si', name:'Silício',       cat:'semi-metal',         period:3, group:14, row:3, col:14, mass:28.086,  alch:'Areia Filosófica',
    desc:'Areia, vidro, chips — a pedra da era digital.',
    recipe:{ earth:[0.45,0.9], fire:[0.05,0.25], heat:[0.3,0.72], ticksNeeded:7, hint:'Terra dominante + pouco Fogo. A areia cristalizada.' }},
  { z:15, symbol:'P',  name:'Fósforo',       cat:'nao-metal',          period:3, group:15, row:3, col:15, mass:30.974,  alch:'Enxofre da Vida',
    desc:'Essencial ao DNA. O fósforo branco queima espontaneamente.',
    recipe:{ earth:[0.2,0.5], fire:[0.2,0.5], heat:[0.35,0.72], ticksNeeded:8, hint:'Terra + Fogo equilibrados. O fósforo: luz que nasce da terra.' }},
  { z:16, symbol:'S',  name:'Enxofre',       cat:'nao-metal',          period:3, group:16, row:3, col:16, mass:32.065,  alch:'🜍 Sulphur',
    desc:'O enxofre clássico dos alquimistas. Amarelo, cristalino.',
    recipe:{ fire:[0.35,0.7], earth:[0.2,0.5], heat:[0.45,0.85], ticksNeeded:5, hint:'↑ Fogo + Terra, calor elevado. O Enxofre Alquímico!' }},
  { z:17, symbol:'Cl', name:'Cloro',         cat:'halogeno',           period:3, group:17, row:3, col:17, mass:35.453,
    desc:'Gás verde-amarelado. Usado em piscinas e guerra química.',
    recipe:{ water:[0.2,0.5], air:[0.2,0.5], fire:[0.1,0.4], heat:[0.25,0.65], ticksNeeded:8, hint:'Água + Ar + Fogo. O sal corrosivo da atmosfera.' }},
  { z:18, symbol:'Ar', name:'Argônio',       cat:'gas-nobre',          period:3, group:18, row:3, col:18, mass:39.948,
    desc:'Gás nobre, 1% da atmosfera. Proteção em soldagem.',
    recipe:{ air:[0.55,1], heat:[0,0.2], ticksNeeded:6, hint:'Ar dominante + baixo calor. O guardião inerte.' }},

  // ═══════════════════════════════════════════════════════════ PERÍODO 4
  { z:19, symbol:'K',  name:'Potássio',      cat:'alcali',             period:4, group:1,  row:4, col:1,  mass:39.098,  alch:'Sal Fixo',
    desc:'Alcalino essencial à vida. Reage violentamente com água.',
    recipe:{ fire:[0.5,0.9], earth:[0.05,0.3], heat:[0.35,0.72], ops:['SOLVE'], ticksNeeded:8, hint:'↑ Fogo + SOLVE aplicado. O Sal Fixo se liberta.' }},
  { z:20, symbol:'Ca', name:'Cálcio',        cat:'alcalino-terroso',   period:4, group:2,  row:4, col:2,  mass:40.078,
    desc:'Os ossos, as conchas, o calcário — tudo é cálcio.',
    recipe:{ earth:[0.3,0.65], water:[0.1,0.35], fire:[0.15,0.45], heat:[0.3,0.72], ticksNeeded:7, hint:'Terra + Água + algum Fogo. A pedra calcária.' }},
  { z:21, symbol:'Sc', name:'Escândio',      cat:'transicao',          period:4, group:3,  row:4, col:3,  mass:44.956,
    desc:'Metal raro, leve. Usado em bicicletas de alta performance.',
    recipe:{ earth:[0.4,0.75], fire:[0.2,0.4], heat:[0.45,0.82], ticksNeeded:10, hint:'Terra + Fogo, calor médio-alto. Metal de transição leve.' }},
  { z:22, symbol:'Ti', name:'Titânio',       cat:'transicao',          period:4, group:4,  row:4, col:4,  mass:47.867,  alch:'Marte Branco',
    desc:'Resistente como o aço, leve como o alumínio.',
    recipe:{ earth:[0.45,0.82], fire:[0.1,0.3], heat:[0.5,0.9], ticksNeeded:10, hint:'Terra dominante + calor alto. O metal dos deuses.' }},
  { z:23, symbol:'V',  name:'Vanádio',       cat:'transicao',          period:4, group:5,  row:4, col:5,  mass:50.942,
    desc:'Metal multicolorido. Suas soluções formam arco-íris.',
    recipe:{ earth:[0.4,0.72], fire:[0.2,0.5], heat:[0.5,0.9], ticksNeeded:10, hint:'Terra + Fogo, calor alto. As cores do arco-íris metálico.' }},
  { z:24, symbol:'Cr', name:'Cromo',         cat:'transicao',          period:4, group:6,  row:4, col:6,  mass:51.996,  alch:'Cor do Fogo',
    desc:'Confere brilho ao aço inox. Esmeraldas têm cromo.',
    recipe:{ earth:[0.3,0.65], fire:[0.3,0.65], heat:[0.55,0.92], ticksNeeded:12, hint:'Terra + Fogo iguais, calor alto. O espelho metálico.' }},
  { z:25, symbol:'Mn', name:'Manganês',      cat:'transicao',          period:4, group:7,  row:4, col:7,  mass:54.938,
    desc:'Essencial ao aço. Cores violeta na oxidação.',
    recipe:{ earth:[0.35,0.68], fire:[0.25,0.5], heat:[0.45,0.85], ticksNeeded:10, hint:'Terra + Fogo, calor moderado-alto.' }},
  { z:26, symbol:'Fe', name:'Ferro',         cat:'transicao',          period:4, group:8,  row:4, col:8,  mass:55.845,  alch:'♂ Marte',
    desc:'O metal da civilização. Desde a Idade do Ferro até hoje.',
    recipe:{ earth:[0.45,0.8], fire:[0.2,0.5], heat:[0.5,0.9], ticksNeeded:8, hint:'Terra + Fogo, calor alto. ♂ Marte forja o Ferro.' }},
  { z:27, symbol:'Co', name:'Cobalto',       cat:'transicao',          period:4, group:9,  row:4, col:9,  mass:58.933,  alch:'Cor Azul',
    desc:'O azul do cobalto coloriu vitrais medievais.',
    recipe:{ earth:[0.35,0.65], fire:[0.3,0.6], heat:[0.5,0.9], ticksNeeded:10, hint:'Terra + Fogo iguais, calor alto. O azul profundo.' }},
  { z:28, symbol:'Ni', name:'Níquel',        cat:'transicao',          period:4, group:10, row:4, col:10, mass:58.693,
    desc:'Moedas, aço inox, baterias. O espelho duradouro.',
    recipe:{ earth:[0.35,0.68], fire:[0.25,0.5], heat:[0.5,0.9], ticksNeeded:10, hint:'Terra + Fogo, calor alto. O metal das moedas.' }},
  { z:29, symbol:'Cu', name:'Cobre',         cat:'transicao',          period:4, group:11, row:4, col:11, mass:63.546,  alch:'♀ Vênus',
    desc:'O metal dos condutores. Verde no ar, vermelho puro.',
    recipe:{ earth:[0.3,0.65], water:[0.1,0.3], fire:[0.2,0.5], heat:[0.45,0.85], ticksNeeded:8, hint:'Terra + Água + Fogo. ♀ Vênus — o cobre conduz o amor.' }},
  { z:30, symbol:'Zn', name:'Zinco',         cat:'transicao',          period:4, group:12, row:4, col:12, mass:65.38,   alch:'Tutia',
    desc:'Proteção contra ferrugem. Latão = cobre + zinco.',
    recipe:{ earth:[0.35,0.65], fire:[0.2,0.45], heat:[0.45,0.82], ticksNeeded:9, hint:'Terra + Fogo, calor médio. A tutia dos alquimistas.' }},
  { z:31, symbol:'Ga', name:'Gálio',         cat:'metal-representativo', period:4, group:13, row:4, col:13, mass:69.723,
    desc:'Derrete na palma da mão. Líquido a 29°C.',
    recipe:{ earth:[0.35,0.65], air:[0.1,0.3], heat:[0.35,0.72], ops:['COAGULA'], ticksNeeded:12, hint:'Terra + Ar, COAGULA. O metal que derrete nas mãos.' }},
  { z:32, symbol:'Ge', name:'Germânio',      cat:'semi-metal',         period:4, group:14, row:4, col:14, mass:72.63,
    desc:'Semicondutor. Essencial na eletrônica antiga.',
    recipe:{ earth:[0.35,0.65], fire:[0.2,0.4], heat:[0.45,0.82], ops:['COAGULA'], ticksNeeded:12, hint:'Terra + Fogo + COAGULA. O semi-metal da era digital.' }},
  { z:33, symbol:'As', name:'Arsênio',       cat:'semi-metal',         period:4, group:15, row:4, col:15, mass:74.922,  alch:'☠ Arsenicum',
    desc:'Veneno histórico. Os Bórgia o usavam em vinhos.',
    recipe:{ earth:[0.25,0.55], fire:[0.3,0.6], heat:[0.45,0.85], ticksNeeded:10, hint:'Terra + Fogo. O veneno dos alquimistas.' }},
  { z:34, symbol:'Se', name:'Selênio',       cat:'nao-metal',          period:4, group:16, row:4, col:16, mass:78.96,
    desc:'Não-metal vermelho. Essencial em pequenas doses.',
    recipe:{ earth:[0.2,0.5], air:[0.2,0.45], heat:[0.35,0.72], ticksNeeded:10, hint:'Terra + Ar, calor moderado. O sel lunar.' }},
  { z:35, symbol:'Br', name:'Bromo',         cat:'halogeno',           period:4, group:17, row:4, col:17, mass:79.904,
    desc:'Único não-metal líquido em temperatura ambiente.',
    recipe:{ water:[0.25,0.55], air:[0.2,0.45], fire:[0.2,0.5], heat:[0.35,0.72], ticksNeeded:10, hint:'Água + Ar + Fogo. O halogênio vermelho-alaranjado.' }},
  { z:36, symbol:'Kr', name:'Criptônio',     cat:'gas-nobre',          period:4, group:18, row:4, col:18, mass:83.798,
    desc:'Gás nobre. Lâmpadas de cripton têm luz brilhante.',
    recipe:{ air:[0.5,0.9], heat:[0.1,0.3], ticksNeeded:8, hint:'Ar dominante + baixo calor. O gás oculto.' }},

  // ═══════════════════════════════════════════════════════════ PERÍODO 5
  { z:37, symbol:'Rb', name:'Rubídio',       cat:'alcali',             period:5, group:1,  row:5, col:1,  mass:85.468,
    desc:'Alcalino raro. Usado em relógios atômicos.',
    recipe:{ fire:[0.5,0.9], earth:[0.05,0.25], heat:[0.45,0.82], ticksNeeded:12, hint:'↑ Fogo muito dominante + pouca Terra.' }},
  { z:38, symbol:'Sr', name:'Estrôncio',     cat:'alcalino-terroso',   period:5, group:2,  row:5, col:2,  mass:87.62,
    desc:'O estrôncio dá a cor vermelha nos fogos de artifício.',
    recipe:{ earth:[0.3,0.62], fire:[0.3,0.6], heat:[0.45,0.85], ticksNeeded:12, hint:'Terra + Fogo, calor médio-alto. O fogo vermelho.' }},
  { z:39, symbol:'Y',  name:'Ítrio',         cat:'transicao',          period:5, group:3,  row:5, col:3,  mass:88.906,
    desc:'Metal raro em LEDs brancas e supercondutores.',
    recipe:{ earth:[0.4,0.72], fire:[0.25,0.5], heat:[0.5,0.88], ticksNeeded:14, hint:'Terra + Fogo, calor alto. Metal de terras raras leves.' }},
  { z:40, symbol:'Zr', name:'Zircônio',      cat:'transicao',          period:5, group:4,  row:5, col:4,  mass:91.224,
    desc:'Resistência térmica extrema. Usado em reatores nucleares.',
    recipe:{ earth:[0.5,0.85], fire:[0.1,0.3], heat:[0.55,0.92], ticksNeeded:14, hint:'Terra muito dominante + calor alto.' }},
  { z:41, symbol:'Nb', name:'Nióbio',        cat:'transicao',          period:5, group:5,  row:5, col:5,  mass:92.906,  alch:'Nióbio Brasileiro',
    desc:'Brasil tem 98% das reservas mundiais. Supercondutividade.',
    recipe:{ earth:[0.45,0.78], fire:[0.2,0.45], heat:[0.55,0.92], ticksNeeded:14, hint:'Terra + Fogo, calor alto. O orgulho brasileiro!' }},
  { z:42, symbol:'Mo', name:'Molibdênio',    cat:'transicao',          period:5, group:6,  row:5, col:6,  mass:95.96,
    desc:'Aço molibdênio é usado em turbinas de aviões.',
    recipe:{ earth:[0.4,0.75], fire:[0.25,0.5], heat:[0.55,0.92], ticksNeeded:14, hint:'Terra + Fogo, calor alto.' }},
  { z:43, symbol:'Tc', name:'Tecnécio',      cat:'transicao',          period:5, group:7,  row:5, col:7,  mass:98,
    desc:'Primeiro elemento sintético. Não existe na natureza.',
    recipe:{ earth:[0.3,0.6], fire:[0.3,0.6], heat:[0.55,0.92], ops:['FERMENTATIO'], ticksNeeded:18, hint:'Terra + Fogo + FERMENTATIO. Criação artificial!' }},
  { z:44, symbol:'Ru', name:'Rutênio',       cat:'transicao',          period:5, group:8,  row:5, col:8,  mass:101.07,
    desc:'Metal do grupo da platina. Extremamente duro.',
    recipe:{ earth:[0.4,0.72], fire:[0.3,0.58], heat:[0.6,0.95], ticksNeeded:15, hint:'Terra + Fogo, calor muito alto.' }},
  { z:45, symbol:'Rh', name:'Ródio',         cat:'transicao',          period:5, group:9,  row:5, col:9,  mass:102.906,
    desc:'O mais raro dos metais preciosos. Catalisador essencial.',
    recipe:{ earth:[0.35,0.68], fire:[0.3,0.6], heat:[0.62,0.98], ticksNeeded:16, hint:'Terra + Fogo iguais, calor muito alto.' }},
  { z:46, symbol:'Pd', name:'Paládio',       cat:'transicao',          period:5, group:10, row:5, col:10, mass:106.42,
    desc:'Catalisadores de automóveis. Absorve hidrogênio.',
    recipe:{ earth:[0.35,0.68], fire:[0.28,0.58], heat:[0.58,0.95], ticksNeeded:15, hint:'Terra + Fogo, calor alto.' }},
  { z:47, symbol:'Ag', name:'Prata',         cat:'transicao',          period:5, group:11, row:5, col:11, mass:107.868, alch:'☽ Luna/Argentum',
    desc:'A Prata Lunar. Melhor condutor elétrico. Antibacteriana.',
    recipe:{ earth:[0.3,0.62], fire:[0.25,0.52], heat:[0.5,0.9], opusPhase:'ALBEDO', ticksNeeded:20, hint:'Terra + Fogo + Opus ALBEDO (Brancura). ☽ A Luna Alquímica!' }},
  { z:48, symbol:'Cd', name:'Cádmio',        cat:'transicao',          period:5, group:12, row:5, col:12, mass:112.411,
    desc:'Metal tóxico. Pigmento amarelo brilhante.',
    recipe:{ earth:[0.38,0.68], fire:[0.22,0.48], heat:[0.48,0.88], ticksNeeded:13, hint:'Terra + Fogo, calor médio-alto.' }},
  { z:49, symbol:'In', name:'Índio',         cat:'metal-representativo', period:5, group:13, row:5, col:13, mass:114.818,
    desc:'Metal mole e brilhante. Essencial nas telas touch.',
    recipe:{ earth:[0.38,0.68], water:[0.1,0.3], heat:[0.45,0.82], ticksNeeded:12, hint:'Terra + Água, calor médio.' }},
  { z:50, symbol:'Sn', name:'Estanho',       cat:'metal-representativo', period:5, group:14, row:5, col:14, mass:118.71,  alch:'♃ Júpiter',
    desc:'Metal de Júpiter. Bronze = cobre + estanho. Soldagem.',
    recipe:{ earth:[0.3,0.62], water:[0.1,0.3], heat:[0.42,0.8], ticksNeeded:10, hint:'Terra + Água, calor médio. ♃ Júpiter — o estanho nobre.' }},
  { z:51, symbol:'Sb', name:'Antimônio',     cat:'semi-metal',         period:5, group:15, row:5, col:15, mass:121.76,  alch:'♈ Antimônio',
    desc:'Usado pelos antigos egípcios como kohl. Semi-metal.',
    recipe:{ earth:[0.35,0.65], fire:[0.25,0.5], heat:[0.45,0.85], ticksNeeded:12, hint:'Terra + Fogo, calor moderado-alto.' }},
  { z:52, symbol:'Te', name:'Telúrio',       cat:'semi-metal',         period:5, group:16, row:5, col:16, mass:127.6,
    desc:'Semi-metal raro. Cheiro de alho se inalado.',
    recipe:{ earth:[0.32,0.62], fire:[0.22,0.48], water:[0.08,0.28], heat:[0.45,0.85], ticksNeeded:13, hint:'Terra + Fogo + pouca Água, calor alto.' }},
  { z:53, symbol:'I',  name:'Iodo',          cat:'halogeno',           period:5, group:17, row:5, col:17, mass:126.904, alch:'Violeta Sublime',
    desc:'Sólido que sublima diretamente em vapor violeta.',
    recipe:{ water:[0.25,0.55], air:[0.12,0.4], fire:[0.22,0.5], heat:[0.35,0.72], ops:['SUBLIMATIO'], ticksNeeded:12, hint:'Água + Ar + Fogo + SUBLIMATIO. O vapor violeta do iodo!' }},
  { z:54, symbol:'Xe', name:'Xenônio',       cat:'gas-nobre',          period:5, group:18, row:5, col:18, mass:131.293,
    desc:'Gás nobre anestésico. Propulsão iônica espacial.',
    recipe:{ air:[0.5,0.88], heat:[0.12,0.35], ops:['SUBLIMATIO'], ticksNeeded:12, hint:'Ar dominante + baixo calor + SUBLIMATIO. O estrangeiro gasoso.' }},

  // ═══════════════════════════════════════════════════════════ PERÍODO 6
  { z:55, symbol:'Cs', name:'Césio',         cat:'alcali',             period:6, group:1,  row:6, col:1,  mass:132.905,
    desc:'Metal mais reativo ao ar. Relógios atômicos de césio.',
    recipe:{ fire:[0.62,0.95], earth:[0.04,0.2], heat:[0.45,0.82], ticksNeeded:15, hint:'↑↑ Fogo máximo + pouca Terra. Extremamente reativo.' }},
  { z:56, symbol:'Ba', name:'Bário',         cat:'alcalino-terroso',   period:6, group:2,  row:6, col:2,  mass:137.327,
    desc:'Óxido de bário em raios-X. Sulfato opaco para contraste.',
    recipe:{ earth:[0.32,0.65], fire:[0.32,0.65], heat:[0.52,0.9], ticksNeeded:15, hint:'Terra + Fogo, calor alto.' }},
  { z:72, symbol:'Hf', name:'Háfnio',        cat:'transicao',          period:6, group:4,  row:6, col:4,  mass:178.49,
    desc:'Controle de reatores nucleares. Absorve nêutrons.',
    recipe:{ earth:[0.48,0.82], fire:[0.18,0.4], heat:[0.6,0.95], opusPhase:'NIGREDO', ticksNeeded:22, hint:'Terra + Fogo + NIGREDO opus. O guardião dos nêutrons.' }},
  { z:73, symbol:'Ta', name:'Tântalo',       cat:'transicao',          period:6, group:5,  row:6, col:5,  mass:180.948,
    desc:'Biocompatível. Usado em implantes médicos.',
    recipe:{ earth:[0.45,0.8], fire:[0.22,0.48], heat:[0.62,0.97], opusPhase:'NIGREDO', ticksNeeded:22, hint:'Terra + Fogo + NIGREDO opus. O metal imortal.' }},
  { z:74, symbol:'W',  name:'Tungstênio',    cat:'transicao',          period:6, group:6,  row:6, col:6,  mass:183.84,  alch:'Espuma de Lobo',
    desc:'Maior ponto de fusão de todos os metais: 3422°C.',
    recipe:{ earth:[0.52,0.88], fire:[0.32,0.62], heat:[0.72,1.0], opusPhase:'RUBEDO', ticksNeeded:25, hint:'Terra + Fogo + RUBEDO opus + calor máximo. O metal dos filamentos!' }},
  { z:75, symbol:'Re', name:'Rênio',         cat:'transicao',          period:6, group:7,  row:6, col:7,  mass:186.207,
    desc:'Metal raríssimo. Pás de turbinas supersônicas.',
    recipe:{ earth:[0.48,0.82], fire:[0.3,0.58], heat:[0.7,1.0], opusPhase:'RUBEDO', ticksNeeded:25, hint:'Terra + Fogo intenso + RUBEDO opus.' }},
  { z:76, symbol:'Os', name:'Ósmio',         cat:'transicao',          period:6, group:8,  row:6, col:8,  mass:190.23,
    desc:'Metal mais denso do universo. Cheiro de ozônio.',
    recipe:{ earth:[0.45,0.78], fire:[0.35,0.62], heat:[0.68,1.0], opusPhase:'RUBEDO', ticksNeeded:25, hint:'Terra + Fogo intenso + RUBEDO opus. A densidade máxima.' }},
  { z:77, symbol:'Ir', name:'Irídio',        cat:'transicao',          period:6, group:9,  row:6, col:9,  mass:192.217,
    desc:'Metal de meteorito. Fronteira K-T — extinção dos dinossauros.',
    recipe:{ earth:[0.42,0.78], fire:[0.38,0.65], heat:[0.7,1.0], ops:['CALCINATIO'], opusPhase:'RUBEDO', ticksNeeded:28, hint:'Terra + Fogo + CALCINATIO + RUBEDO. O metal dos meteoritos.' }},
  { z:78, symbol:'Pt', name:'Platina',       cat:'transicao',          period:6, group:10, row:6, col:10, mass:195.084, alch:'Prata Branca',
    desc:'Catalisador nobre. Joias e conversores catalíticos.',
    recipe:{ earth:[0.35,0.68], fire:[0.35,0.65], heat:[0.68,1.0], opusPhase:'RUBEDO', ticksNeeded:25, hint:'Terra + Fogo equilibrados + RUBEDO opus. A prata branca nobre.' }},
  { z:79, symbol:'Au', name:'Ouro',          cat:'transicao',          period:6, group:11, row:6, col:11, mass:196.967, alch:'☉ Sol/Aurum',
    desc:'A Grande Obra. O Ouro Filosófico. A transmutação final.',
    recipe:{ earth:[0.3,0.65], fire:[0.3,0.65], heat:[0.72,1.0], ops:['COAGULA'], opusPhase:'RUBEDO', lapisRequired:true, ticksNeeded:40, hint:'☉ RUBEDO + Lapis + COAGULA + calor alto. A Grande Obra está próxima!' }},
  { z:80, symbol:'Hg', name:'Mercúrio',      cat:'transicao',          period:6, group:12, row:6, col:12, mass:200.59,  alch:'☿ Mercurius',
    desc:'O único metal líquido em temp. ambiente. Vivo, fluido.',
    recipe:{ water:[0.3,0.65], fire:[0.28,0.58], heat:[0.42,0.82], ops:['FERMENTATIO'], ticksNeeded:12, hint:'Água + Fogo + FERMENTATIO. ☿ O Mercúrio Alquímico vivo!' }},
  { z:81, symbol:'Tl', name:'Tálio',         cat:'metal-representativo', period:6, group:13, row:6, col:13, mass:204.383,
    desc:'Metal tóxico. Veneno favorito de assassinos.',
    recipe:{ earth:[0.35,0.65], fire:[0.22,0.5], heat:[0.52,0.9], opusPhase:'NIGREDO', ticksNeeded:20, hint:'Terra + Fogo + NIGREDO opus. O metal da sombra.' }},
  { z:82, symbol:'Pb', name:'Chumbo',        cat:'metal-representativo', period:6, group:14, row:6, col:14, mass:207.2,   alch:'♄ Saturno/Plumbum',
    desc:'O Chumbo de Saturno. Início da Grande Obra.',
    recipe:{ earth:[0.42,0.75], fire:[0.22,0.48], heat:[0.45,0.85], ticksNeeded:8, hint:'♄ Terra + Fogo, calor médio. O início — Plumbum/Saturno.' }},
  { z:83, symbol:'Bi', name:'Bismuto',       cat:'metal-representativo', period:6, group:15, row:6, col:15, mass:208.98,
    desc:'Cristais geométricos iridescentes. Relativamente seguro.',
    recipe:{ earth:[0.35,0.65], fire:[0.3,0.58], heat:[0.5,0.9], ticksNeeded:14, hint:'Terra + Fogo, calor alto.' }},
  { z:84, symbol:'Po', name:'Polônio',       cat:'semi-metal',         period:6, group:16, row:6, col:16, mass:209,
    desc:'Radioativo letal. Usado no assassinato de Litvinenko.',
    recipe:{ earth:[0.22,0.48], fire:[0.42,0.72], heat:[0.72,1.0], opusPhase:'RUBEDO', ticksNeeded:30, hint:'Fogo dominante + RUBEDO opus + calor máximo. Radioativo!' }},
  { z:85, symbol:'At', name:'Ástato',        cat:'halogeno',           period:6, group:17, row:6, col:17, mass:210,
    desc:'O elemento mais raro que ocorre naturalmente. ~30g na Terra.',
    recipe:{ fire:[0.42,0.72], air:[0.2,0.45], heat:[0.65,1.0], opusPhase:'RUBEDO', ticksNeeded:32, hint:'Fogo + Ar + RUBEDO opus + calor máximo. Extremamente raro!' }},
  { z:86, symbol:'Rn', name:'Radônio',       cat:'gas-nobre',          period:6, group:18, row:6, col:18, mass:222,
    desc:'Gás nobre radioativo. Se acumula em porões.',
    recipe:{ air:[0.4,0.85], heat:[0.45,0.82], opusPhase:'NIGREDO', ops:['SUBLIMATIO'], ticksNeeded:25, hint:'Ar + calor médio + NIGREDO + SUBLIMATIO. O gás invisível radioativo.' }},

  // ═══════════════════════════════════════════════════════════ PERÍODO 7
  { z:87, symbol:'Fr', name:'Frâncio',       cat:'alcali',             period:7, group:1,  row:7, col:1,  mass:223,
    desc:'Metal alcalino mais instável. Existe por milissegundos.',
    recipe:{ fire:[0.72,1.0], heat:[0.72,1.0], lapisRequired:true, ticksNeeded:45, hint:'Fogo + calor máximos + Lapis. A instabilidade extrema.' }},
  { z:88, symbol:'Ra', name:'Rádio',         cat:'alcalino-terroso',   period:7, group:2,  row:7, col:2,  mass:226,     alch:'Marie Curie',
    desc:'Marie Curie morreu por ele. Luminescência nas trevas.',
    recipe:{ earth:[0.3,0.62], fire:[0.4,0.72], heat:[0.72,1.0], opusPhase:'CITRINITAS', ticksNeeded:30, hint:'Terra + Fogo + CITRINITAS + calor máximo. O brilho mortal.' }},
  { z:104, symbol:'Rf', name:'Ruterfórdio',  cat:'transicao',          period:7, group:4,  row:7, col:4,  mass:267,
    desc:'Elemento sintético. Criado em aceleradores.',
    recipe:{ earth:[0.4,0.7], fire:[0.4,0.7], heat:[0.8,1.0], lapisRequired:true, ticksNeeded:55, hint:'Terra + Fogo intensos + Lapis + calor extremo.' }},
  { z:105, symbol:'Db', name:'Dúbnio',       cat:'transicao',          period:7, group:5,  row:7, col:5,  mass:268,
    desc:'Sintético. Meia-vida de 28 horas.',
    recipe:{ earth:[0.35,0.68], fire:[0.42,0.72], heat:[0.82,1.0], lapisRequired:true, ticksNeeded:58, hint:'Terra + Fogo + Lapis + calor extremo.' }},
  { z:106, symbol:'Sg', name:'Seabórgio',    cat:'transicao',          period:7, group:6,  row:7, col:6,  mass:271,
    desc:'Sintético. Homenagem a Glenn Seaborg.',
    recipe:{ earth:[0.35,0.68], fire:[0.42,0.72], heat:[0.85,1.0], lapisRequired:true, ticksNeeded:60, hint:'Condições extremas + Lapis forjada.' }},
  { z:107, symbol:'Bh', name:'Bóhrio',       cat:'transicao',          period:7, group:7,  row:7, col:7,  mass:272,
    desc:'Sintético. Homenagem a Niels Bohr.',
    recipe:{ earth:[0.35,0.68], fire:[0.45,0.75], heat:[0.88,1.0], lapisRequired:true, ticksNeeded:62, hint:'Condições extremas + Lapis.' }},
  { z:108, symbol:'Hs', name:'Hássio',       cat:'transicao',          period:7, group:8,  row:7, col:8,  mass:270,
    desc:'Sintético. Apenas alguns átomos produzidos.',
    recipe:{ earth:[0.35,0.65], fire:[0.45,0.75], heat:[0.88,1.0], lapisRequired:true, ticksNeeded:62, hint:'Condições extremas + Lapis.' }},
  { z:109, symbol:'Mt', name:'Meitnério',    cat:'desconhecido',       period:7, group:9,  row:7, col:9,  mass:278,
    desc:'Homenagem a Lise Meitner. Propriedades desconhecidas.',
    recipe:{ earth:[0.3,0.65], fire:[0.48,0.78], heat:[0.9,1.0], lapisRequired:true, ticksNeeded:65, hint:'Fogo intensíssimo + Lapis + calor extremo.' }},
  { z:110, symbol:'Ds', name:'Darmstácio',   cat:'desconhecido',       period:7, group:10, row:7, col:10, mass:281,
    desc:'Produzido em 1994. Meia-vida de microssegundos.',
    recipe:{ earth:[0.3,0.62], fire:[0.5,0.8], heat:[0.9,1.0], lapisRequired:true, ticksNeeded:65, hint:'Condições extremas máximas + Lapis.' }},
  { z:111, symbol:'Rg', name:'Roentgênio',   cat:'desconhecido',       period:7, group:11, row:7, col:11, mass:282,
    desc:'Homenagem a Röntgen (raios-X). Sintético instável.',
    recipe:{ earth:[0.28,0.6], fire:[0.5,0.82], heat:[0.92,1.0], lapisRequired:true, ticksNeeded:68, hint:'Condições máximas + Lapis forjada.' }},
  { z:112, symbol:'Cn', name:'Copernício',   cat:'transicao',          period:7, group:12, row:7, col:12, mass:285,
    desc:'Homenagem a Copérnico. Pode ser gasoso em temp. ambiente.',
    recipe:{ earth:[0.25,0.58], fire:[0.5,0.82], heat:[0.92,1.0], lapisRequired:true, ticksNeeded:68, hint:'Condições máximas + Lapis.' }},
  { z:113, symbol:'Nh', name:'Nihônio',      cat:'metal-representativo', period:7, group:13, row:7, col:13, mass:286,
    desc:'Descoberto pelo Japão em 2016. O Nh do Nihon.',
    recipe:{ earth:[0.25,0.58], fire:[0.52,0.85], heat:[0.93,1.0], lapisRequired:true, ticksNeeded:70, hint:'Condições máximas extremas + Lapis.' }},
  { z:114, symbol:'Fl', name:'Fleróvio',     cat:'metal-representativo', period:7, group:14, row:7, col:14, mass:289,
    desc:'Pode ser um gás nobre. Extremamente instável.',
    recipe:{ earth:[0.22,0.55], fire:[0.55,0.88], heat:[0.95,1.0], lapisRequired:true, ticksNeeded:72, hint:'Condições extremas máximas + Lapis.' }},
  { z:115, symbol:'Mc', name:'Moscóvio',     cat:'metal-representativo', period:7, group:15, row:7, col:15, mass:290,
    desc:'Produzido em 2003. Meia-vida de 220ms.',
    recipe:{ earth:[0.2,0.52], fire:[0.55,0.88], heat:[0.95,1.0], lapisRequired:true, ticksNeeded:72, hint:'Condições extremas + Lapis.' }},
  { z:116, symbol:'Lv', name:'Livermório',   cat:'metal-representativo', period:7, group:16, row:7, col:16, mass:293,
    desc:'Homenagem ao Livermore Lab. Decai muito rápido.',
    recipe:{ earth:[0.18,0.5], fire:[0.58,0.9], heat:[0.96,1.0], lapisRequired:true, ticksNeeded:75, hint:'Condições máximas + Lapis forjada.' }},
  { z:117, symbol:'Ts', name:'Tenessínio',   cat:'halogeno',           period:7, group:17, row:7, col:17, mass:294,
    desc:'Produzido em 2010. Segundo mais pesado da tabela.',
    recipe:{ fire:[0.6,0.92], air:[0.18,0.42], heat:[0.96,1.0], lapisRequired:true, ticksNeeded:78, hint:'Fogo + Ar + condições extremas + Lapis.' }},
  { z:118, symbol:'Og', name:'Oganessônio',  cat:'gas-nobre',          period:7, group:18, row:7, col:18, mass:294,
    desc:'O elemento mais pesado conhecido. 5 átomos já foram criados.',
    recipe:{ heat:[0.98,1.0], lapisRequired:true, ticksNeeded:100, hint:'☉ Lapis + calor máximo absoluto. O fim da tabela periódica!' }},

  // ═══════════════════════════════════════════════════════════ LANTANÍDEOS (row 8)
  { z:57,  symbol:'La', name:'Lantânio',      cat:'lantanideo', period:6, group:null, row:8, col:3,  mass:138.905,
    desc:'Início dos lantanídeos. Catalisadores de refino de petróleo.',
    recipe:{ earth:[0.4,0.72], fire:[0.22,0.48], heat:[0.52,0.9], opusPhase:'NIGREDO', ticksNeeded:20, hint:'Terra + Fogo + NIGREDO opus. O início das terras raras.' }},
  { z:58,  symbol:'Ce', name:'Cério',         cat:'lantanideo', period:6, group:null, row:8, col:4,  mass:140.116,
    desc:'Mais abundante dos lantanídeos. Isqueiros de pederneira.',
    recipe:{ earth:[0.4,0.72], fire:[0.25,0.5], heat:[0.52,0.9], opusPhase:'NIGREDO', ticksNeeded:20, hint:'Terra + Fogo + NIGREDO opus.' }},
  { z:59,  symbol:'Pr', name:'Praseodímio',   cat:'lantanideo', period:6, group:null, row:8, col:5,  mass:140.908,
    desc:'Ímãs superpoderosos com neodímio.',
    recipe:{ earth:[0.38,0.7], fire:[0.25,0.52], heat:[0.55,0.92], opusPhase:'NIGREDO', ticksNeeded:22, hint:'Terra + Fogo + NIGREDO opus.' }},
  { z:60,  symbol:'Nd', name:'Neodímio',      cat:'lantanideo', period:6, group:null, row:8, col:6,  mass:144.242,
    desc:'Ímãs de neodímio: os mais fortes do mundo.',
    recipe:{ earth:[0.38,0.7], fire:[0.28,0.55], heat:[0.55,0.92], opusPhase:'NIGREDO', ticksNeeded:22, hint:'Terra + Fogo + NIGREDO opus. O ímã mais forte.' }},
  { z:61,  symbol:'Pm', name:'Promécio',      cat:'lantanideo', period:6, group:null, row:8, col:7,  mass:145,
    desc:'Único lantanídeo radioativo sem isótopos estáveis.',
    recipe:{ earth:[0.35,0.68], fire:[0.3,0.58], heat:[0.58,0.95], opusPhase:'NIGREDO', ops:['FERMENTATIO'], ticksNeeded:28, hint:'Terra + Fogo + NIGREDO + FERMENTATIO. O lantanídeo sintético.' }},
  { z:62,  symbol:'Sm', name:'Samário',       cat:'lantanideo', period:6, group:null, row:8, col:8,  mass:150.36,
    desc:'Ímãs de samário-cobalto. Resistentes ao calor.',
    recipe:{ earth:[0.38,0.7], fire:[0.28,0.55], heat:[0.55,0.92], opusPhase:'ALBEDO', ticksNeeded:23, hint:'Terra + Fogo + ALBEDO opus.' }},
  { z:63,  symbol:'Eu', name:'Európio',       cat:'lantanideo', period:6, group:null, row:8, col:9,  mass:151.964,
    desc:'Faz o vermelho brilhar nas telas de TV e notas de euro.',
    recipe:{ earth:[0.35,0.68], fire:[0.3,0.58], heat:[0.58,0.92], opusPhase:'ALBEDO', ticksNeeded:24, hint:'Terra + Fogo + ALBEDO opus.' }},
  { z:64,  symbol:'Gd', name:'Gadolínio',     cat:'lantanideo', period:6, group:null, row:8, col:10, mass:157.25,
    desc:'Contraste em ressonância magnética. Superconductividade.',
    recipe:{ earth:[0.38,0.7], fire:[0.3,0.58], heat:[0.58,0.95], opusPhase:'ALBEDO', ticksNeeded:24, hint:'Terra + Fogo + ALBEDO opus.' }},
  { z:65,  symbol:'Tb', name:'Térbio',        cat:'lantanideo', period:6, group:null, row:8, col:11, mass:158.925,
    desc:'Luz verde em telas de computador. Magnetorestrição.',
    recipe:{ earth:[0.38,0.7], fire:[0.32,0.6], heat:[0.6,0.95], opusPhase:'CITRINITAS', ticksNeeded:25, hint:'Terra + Fogo + CITRINITAS opus.' }},
  { z:66,  symbol:'Dy', name:'Disprósio',     cat:'lantanideo', period:6, group:null, row:8, col:12, mass:162.5,
    desc:'Ímãs de motor elétrico. "Difícil de obter" — do grego.',
    recipe:{ earth:[0.38,0.7], fire:[0.32,0.6], heat:[0.6,0.95], opusPhase:'CITRINITAS', ticksNeeded:25, hint:'Terra + Fogo + CITRINITAS opus. Difícil de obter!' }},
  { z:67,  symbol:'Ho', name:'Hólmio',        cat:'lantanideo', period:6, group:null, row:8, col:13, mass:164.93,
    desc:'Maior momento magnético de todos os elementos.',
    recipe:{ earth:[0.4,0.72], fire:[0.32,0.6], heat:[0.62,0.97], opusPhase:'CITRINITAS', ticksNeeded:26, hint:'Terra + Fogo + CITRINITAS opus.' }},
  { z:68,  symbol:'Er', name:'Érbio',         cat:'lantanideo', period:6, group:null, row:8, col:14, mass:167.259,
    desc:'Amplificadores ópticos de fibra. Rosa elegante.',
    recipe:{ earth:[0.4,0.72], fire:[0.32,0.62], heat:[0.62,0.97], opusPhase:'CITRINITAS', ticksNeeded:26, hint:'Terra + Fogo + CITRINITAS opus.' }},
  { z:69,  symbol:'Tm', name:'Túlio',         cat:'lantanideo', period:6, group:null, row:8, col:15, mass:168.934,
    desc:'Raríssimo. Portáteis de raios-X médicos.',
    recipe:{ earth:[0.38,0.7], fire:[0.35,0.65], heat:[0.65,1.0], opusPhase:'RUBEDO', ticksNeeded:30, hint:'Terra + Fogo + RUBEDO opus + calor alto.' }},
  { z:70,  symbol:'Yb', name:'Itérbio',       cat:'lantanideo', period:6, group:null, row:8, col:16, mass:173.054,
    desc:'Relógios de precisão atômica mais exatos do mundo.',
    recipe:{ earth:[0.38,0.7], fire:[0.35,0.65], heat:[0.65,1.0], opusPhase:'RUBEDO', ticksNeeded:30, hint:'Terra + Fogo + RUBEDO opus.' }},
  { z:71,  symbol:'Lu', name:'Lutécio',       cat:'lantanideo', period:6, group:null, row:8, col:17, mass:174.967,
    desc:'Último lantanídeo. Cintiladores para PET scan.',
    recipe:{ earth:[0.4,0.72], fire:[0.38,0.68], heat:[0.68,1.0], opusPhase:'RUBEDO', ticksNeeded:32, hint:'Terra + Fogo + RUBEDO opus. O último lantanídeo.' }},

  // ═══════════════════════════════════════════════════════════ ACTINÍDEOS (row 9)
  { z:89,  symbol:'Ac', name:'Actínio',       cat:'actinineo',  period:7, group:null, row:9, col:3,  mass:227,
    desc:'Início dos actinídeos. Raro e radioativo.',
    recipe:{ earth:[0.38,0.7], fire:[0.35,0.65], heat:[0.68,1.0], opusPhase:'RUBEDO', lapisRequired:true, ticksNeeded:35, hint:'Terra + Fogo + RUBEDO + Lapis.' }},
  { z:90,  symbol:'Th', name:'Tório',         cat:'actinineo',  period:7, group:null, row:9, col:4,  mass:232.038,
    desc:'Combustível nuclear limpo. Mais abundante que urânio.',
    recipe:{ earth:[0.4,0.75], fire:[0.38,0.68], heat:[0.72,1.0], opusPhase:'RUBEDO', ticksNeeded:30, hint:'Terra + Fogo intenso + RUBEDO opus. Potência nuclear.' }},
  { z:91,  symbol:'Pa', name:'Protactínio',   cat:'actinineo',  period:7, group:null, row:9, col:5,  mass:231.036,
    desc:'Intermediário na produção de urânio-233.',
    recipe:{ earth:[0.38,0.72], fire:[0.38,0.68], heat:[0.72,1.0], opusPhase:'RUBEDO', lapisRequired:true, ticksNeeded:40, hint:'Terra + Fogo + RUBEDO + Lapis.' }},
  { z:92,  symbol:'U',  name:'Urânio',        cat:'actinineo',  period:7, group:null, row:9, col:6,  mass:238.029,
    desc:'A fissão nuclear. Hiroshima, Nagasaki, e energia limpa.',
    recipe:{ earth:[0.4,0.75], fire:[0.4,0.72], heat:[0.75,1.0], opusPhase:'RUBEDO', ticksNeeded:32, hint:'Terra + Fogo muito intenso + RUBEDO opus. A fissão nuclear!' }},
  { z:93,  symbol:'Np', name:'Netúnio',       cat:'actinineo',  period:7, group:null, row:9, col:7,  mass:237,
    desc:'Primeiro transurânio sintético descoberto.',
    recipe:{ earth:[0.35,0.68], fire:[0.42,0.72], heat:[0.78,1.0], lapisRequired:true, ticksNeeded:45, hint:'Terra + Fogo intenso + Lapis.' }},
  { z:94,  symbol:'Pu', name:'Plutônio',      cat:'actinineo',  period:7, group:null, row:9, col:8,  mass:244,
    desc:'Bomba atômica. Extremamente tóxico e radioativo.',
    recipe:{ earth:[0.35,0.68], fire:[0.45,0.75], heat:[0.82,1.0], lapisRequired:true, ticksNeeded:48, hint:'Terra + Fogo + Lapis + calor extremo. Perigo nuclear!' }},
  { z:95,  symbol:'Am', name:'Amerício',      cat:'actinineo',  period:7, group:null, row:9, col:9,  mass:243,
    desc:'Detectores de fumaça. Produzido de plutônio.',
    recipe:{ earth:[0.32,0.65], fire:[0.45,0.75], heat:[0.82,1.0], lapisRequired:true, ticksNeeded:50, hint:'Terra + Fogo + Lapis.' }},
  { z:96,  symbol:'Cm', name:'Cúrio',         cat:'actinineo',  period:7, group:null, row:9, col:10, mass:247,
    desc:'Homenagem a Pierre e Marie Curie.',
    recipe:{ earth:[0.3,0.62], fire:[0.48,0.78], heat:[0.85,1.0], lapisRequired:true, ticksNeeded:52, hint:'Terra + Fogo intenso + Lapis.' }},
  { z:97,  symbol:'Bk', name:'Berquélio',     cat:'actinineo',  period:7, group:null, row:9, col:11, mass:247,
    desc:'Produzido em Berkeley, CA. Poucos microgramas feitos.',
    recipe:{ earth:[0.28,0.6], fire:[0.5,0.82], heat:[0.87,1.0], lapisRequired:true, ticksNeeded:55, hint:'Condições extremas + Lapis.' }},
  { z:98,  symbol:'Cf', name:'Califórnio',    cat:'actinineo',  period:7, group:null, row:9, col:12, mass:251,
    desc:'Custo: $27 milhões/grama. Fonte de nêutrons.',
    recipe:{ earth:[0.25,0.58], fire:[0.52,0.85], heat:[0.9,1.0], lapisRequired:true, ticksNeeded:58, hint:'Condições extremas máximas + Lapis.' }},
  { z:99,  symbol:'Es', name:'Einsteínio',    cat:'actinineo',  period:7, group:null, row:9, col:13, mass:252,
    desc:'Descoberto após o teste nuclear "Ivy Mike" de 1952.',
    recipe:{ earth:[0.22,0.55], fire:[0.55,0.88], heat:[0.92,1.0], lapisRequired:true, ticksNeeded:60, hint:'Condições extremas + Lapis.' }},
  { z:100, symbol:'Fm', name:'Férmio',        cat:'actinineo',  period:7, group:null, row:9, col:14, mass:257,
    desc:'Homenagem a Enrico Fermi. Sintético radioativo.',
    recipe:{ earth:[0.2,0.52], fire:[0.58,0.9], heat:[0.93,1.0], lapisRequired:true, ticksNeeded:62, hint:'Condições extremas + Lapis.' }},
  { z:101, symbol:'Md', name:'Mendelévio',    cat:'actinineo',  period:7, group:null, row:9, col:15, mass:258,
    desc:'Homenagem a Mendeleev, criador da tabela periódica.',
    recipe:{ earth:[0.18,0.5], fire:[0.6,0.92], heat:[0.95,1.0], lapisRequired:true, ticksNeeded:65, hint:'Condições máximas + Lapis.' }},
  { z:102, symbol:'No', name:'Nobélio',       cat:'actinineo',  period:7, group:null, row:9, col:16, mass:259,
    desc:'Homenagem a Alfred Nobel (prêmio Nobel).',
    recipe:{ earth:[0.15,0.48], fire:[0.62,0.92], heat:[0.96,1.0], lapisRequired:true, ticksNeeded:68, hint:'Condições extremas máximas + Lapis.' }},
  { z:103, symbol:'Lr', name:'Laurêncio',     cat:'actinineo',  period:7, group:null, row:9, col:17, mass:266,
    desc:'Último actinídeo. Homenagem a Ernest Lawrence.',
    recipe:{ earth:[0.15,0.48], fire:[0.62,0.92], heat:[0.97,1.0], lapisRequired:true, ticksNeeded:70, hint:'Condições extremas máximas + Lapis. O último actinídeo!' }},
];

// ── Mapa por número atômico ───────────────────────────────────────────────────
export const ELEMENT_BY_Z: Map<number, ChemElement> = new Map(
  PERIODIC_ELEMENTS.map(e => [e.z, e]),
);

// ── Verifica se as condições atuais correspondem à receita de um elemento ─────
export function meetsRecipe(
  recipe:     ElementRecipe,
  mix:        { earth: number; water: number; air: number; fire: number },
  heat:       number,
  opsUsed:    Set<string>,
  opusPhase:  string | null,
  lapisState: string,
): boolean {
  const [hMin, hMax] = recipe.heat;
  if (heat < hMin || heat > hMax) return false;
  if (recipe.lapisRequired && lapisState !== 'FORGED') return false;
  if (recipe.opusPhase && opusPhase !== recipe.opusPhase) return false;
  if (recipe.ops) {
    for (const op of recipe.ops) {
      if (!opsUsed.has(op)) return false;
    }
  }
  const check = (range: [number, number] | undefined, val: number) =>
    !range || (val >= range[0] && val <= range[1]);
  return check(recipe.earth, mix.earth)
      && check(recipe.water, mix.water)
      && check(recipe.air,   mix.air)
      && check(recipe.fire,  mix.fire);
}

// ── Elementos iniciais já "descobertos" (H, He, C, N, O, S, Fe) ──────────────
export const INITIAL_DISCOVERED = new Set<number>([1, 2, 6, 7, 8, 16, 26]);

// ── Categorias ordenadas para a legenda ──────────────────────────────────────
export const CATEGORY_ORDER: ElementCategory[] = [
  'alcali','alcalino-terroso','transicao','lantanideo','actinineo',
  'metal-representativo','semi-metal','nao-metal','halogeno','gas-nobre','desconhecido',
];
