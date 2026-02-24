// ── Alchemist's Secretary — Interpretive Text Generator ──────────────────────
// No external API. Template + heuristic. Always includes:
//   - 1–2 poetic lines
//   - 1 causal sentence ("porque [metric] [changed]...")
// Vocabulary rooted in classical hermeticism.
import {
  AlchemyMetrics, ElementMix, OpusPhase, AlchemyEvent,
  LapisState, GlyphSpec,
} from './alchemyTypes';
import { deriveGlyph } from './alchemyGlyphs';

// ── Vocabulary pools ──────────────────────────────────────────────────────────
const V = {
  nigredo: [
    'A prima matéria retorna ao caos fértil.',
    'A sombra é o útero do ser.',
    'O chumbo dissolve-se em si mesmo.',
    'Putrefação: primeiro sacramento do Opus.',
    'O corvo pousou; o negro precede o branco.',
    'Toda fixação se dissolve antes de reconstruir.',
  ],
  albedo: [
    'A lua revela o que o sol consome.',
    'A prata emerge do resíduo carbonizado.',
    'Clarificação: o campo respira com menos ruído.',
    'O espelho se lava; o reflexo se precisa.',
    'A água purifica o que o fogo revelou.',
  ],
  citrinitas: [
    'A aurora dora os contornos do ser emergente.',
    'O mercúrio estabiliza entre dois polos.',
    'A integração acende a primeira chama consciente.',
    'Citrinitas: nem prata nem ouro — transição sagrada.',
    'O Sol ainda não é — mas o horizonte é seu.',
  ],
  rubedo: [
    'O vermelho-rei encarna no campo coagulado.',
    'Rubedo: a fixação final, a pedra quer corpo.',
    'O ouro não é cor — é estado de permanência.',
    'A obra encarna; o Opus se fecha neste ciclo.',
    'O enxofre vence o mercúrio; a matéria se fixa.',
  ],
  solve: [
    'Solve: a estrutura cede à corrente.',
    'A dissolução não destrói — prepara.',
    'O vínculo se afroxa para que um novo nasça.',
    'Toda dissolução é semente de nova forma.',
  ],
  coagula: [
    'Coagula: o disperso se recolhe em forma.',
    'A cohesão escreve novos padrões no campo.',
    'O sólido vence o fluido por tempo.',
    'A pedra busca a pedra pelo peso do semelhante.',
  ],
  burnout: [
    'O athanor aqueceu além do suportável.',
    'O excesso de fogo carboniza o que não é fixado.',
    'Calcinação involuntária: recuar ou aceitar o colapso.',
  ],
  crystallization: [
    'A terra dominou; a novelty morreu.',
    'Cristalização: dogma endurecido onde havia mistério.',
    'O fixo prende o que devia transformar.',
  ],
  dissolution: [
    'A água venceu toda coesão; o campo se dissolve.',
    'Sem terra, nenhuma forma persiste.',
    'Excesso de solutio: perda de identidade do opus.',
  ],
  noise: [
    'O ar em excesso transforma sinal em ruído.',
    'A volatilização sem terra produz dispersão sem sentido.',
    'O caos aéreo dissolve a ordem emergente.',
  ],
  lapisForged: [
    'A Pedra Filosofal consolida-se no centro.',
    'Lapis Philosophorum: o catalisador encarna.',
    'A transmutação S→A ativa-se pelo centro do campo.',
    'A Pedra não é ouro — é o que transforma em ouro.',
  ],
  lapisCracked: [
    'A Pedra racha sob pressão excessiva.',
    'O catalisador quebra; a transmutação suspende-se.',
    'Retorno ao Albedo será necessário para reconstituir.',
  ],
  generic: [
    'O campo registra a passagem do tempo alquímico.',
    'O Opus avança por suas próprias leis.',
    'A obra caminha sem pressa, mas sem pausa.',
    'Observe; o sistema fala antes de ser perguntado.',
  ],
};

// ── Causal sentence templates ─────────────────────────────────────────────────
function causalLine(metrics: AlchemyMetrics, elements: ElementMix): string {
  const { integrationIndex:I, tensionIndex:T, noveltyIndex:N } = metrics;
  const dom = dominantElement(elements);

  if (T > 0.6)       return `porque o campo S (separatio) subiu a ${(T*100).toFixed(0)}%, a coesão cedeu à tensão.`;
  if (I > 0.7)       return `porque A (affinity) excede S em ${((I-0.5)*200).toFixed(0)}%, a integração avança.`;
  if (N < 0.08)      return `porque a novelty caiu a ${(N*100).toFixed(0)}%, o sistema tende à cristalização.`;
  if (dom==='fire')  return `porque o Fogo domina, a taxa de mutação aumenta e o risco cresce.`;
  if (dom==='water') return `porque a Água domina, a difusão absorve as estruturas mais frágeis.`;
  if (dom==='earth') return `porque a Terra domina, a cohesão freia a volatilidade.`;
  if (dom==='air')   return `porque o Ar domina, o campo propaga além da sua capacidade de reter.`;
  return `porque integração=${(I*100).toFixed(0)}% e tensão=${(T*100).toFixed(0)}%, o Opus encontra seu equilíbrio momentâneo.`;
}

function dominantElement(e: ElementMix): keyof ElementMix {
  const entries = Object.entries(e) as [keyof ElementMix, number][];
  return entries.reduce((a,b)=>b[1]>a[1]?b:a)[0];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Main generation ───────────────────────────────────────────────────────────
export interface SecretaryOutput {
  text:       string;
  causalLine: string;
  glyphSpec:  GlyphSpec;
  tags:       string[];
}

export function generateEntry(
  trigger:  'phaseStart'|'phaseEnd'|'event'|'lapisForged'|'lapisCracked'|'periodic',
  metrics:  AlchemyMetrics,
  elements: ElementMix,
  phase:    OpusPhase | null,
  event:    AlchemyEvent | null,
  lapisState: LapisState,
): SecretaryOutput {
  let pool: string[] = [];
  const tags: string[] = [];

  if (event) {
    switch (event) {
      case 'BURNOUT':         pool = V.burnout;        tags.push('burnout'); break;
      case 'CRYSTALLIZATION': pool = V.crystallization; tags.push('crystallization'); break;
      case 'DISSOLUTION':     pool = V.dissolution;    tags.push('dissolution'); break;
      case 'NOISE':           pool = V.noise;          tags.push('noise'); break;
    }
  }

  if (trigger === 'lapisForged')  { pool = V.lapisForged; tags.push('lapis','forged'); }
  if (trigger === 'lapisCracked') { pool = V.lapisCracked; tags.push('lapis','cracked'); }

  if (pool.length === 0 && phase) {
    switch (phase) {
      case 'NIGREDO':    pool = V.nigredo;    tags.push('nigredo');    break;
      case 'ALBEDO':     pool = V.albedo;     tags.push('albedo');     break;
      case 'CITRINITAS': pool = V.citrinitas; tags.push('citrinitas'); break;
      case 'RUBEDO':     pool = V.rubedo;     tags.push('rubedo');     break;
    }
  }

  if (pool.length === 0) pool = V.generic;

  // Element tags
  const dom = dominantElement(elements);
  tags.push(dom);
  if (phase) tags.push(phase.toLowerCase());

  const line1 = pick(pool);
  // Optionally add a second poetic line from phase or solve/coagula pool
  let text = line1;
  if (trigger==='phaseStart'||trigger==='phaseEnd') {
    const bonus = pick(phase ? (V as any)[phase.toLowerCase()] ?? V.generic : V.generic);
    if (bonus !== line1) text = `${line1}\n${bonus}`;
  }

  const causal = causalLine(metrics, elements);

  const glyph = deriveGlyph(
    metrics, elements, phase, event,
    lapisState==='CRACKED',
  );

  return { text, causalLine: causal, glyphSpec: glyph, tags };
}
