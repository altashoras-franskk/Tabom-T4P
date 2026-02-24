// ── Alchemy Lab — 20 Presets ──────────────────────────────────────────────────
// Named after classical alchemical operations (Pseudo-Paracelsus, Basilius Valentinus,
// Splendor Solis tradition). Each preset encodes an authentic alchemical intent.
import { AlchemyPreset } from './alchemyTypes';

export const ALCHEMY_PRESETS: AlchemyPreset[] = [

  // ── I. Classics (adapted) ──────────────────────────────────────────────────

  {
    id: 'athanor-calm',
    name: 'Athanor Calmo',
    subtitle: 'Contemplação. O forno aquece devagar.',
    description: 'Baixo risco. Contemplativo. Integração gradual. Ideal para observação.',
    agentCount: 400, heat: 0.22,
    elements: { earth:.35, water:.35, air:.20, fire:.10 },
  },
  {
    id: 'fermentation',
    name: 'Fermentação',
    subtitle: 'Nigredo forte. A obra começa na sombra.',
    description: 'Risco médio. A putrefação domina inicialmente.',
    agentCount: 600, heat: 0.55,
    elements: { earth:.20, water:.35, air:.15, fire:.30 },
  },
  {
    id: 'crucible',
    name: 'Cadinho',
    subtitle: 'Fogo alto. Risco real. Lapis possível.',
    description: 'Alto fogo. Risco de burnout. Lapis pode ser forjada se integração for sustentada.',
    agentCount: 900, heat: 0.80,
    elements: { earth:.15, water:.15, air:.25, fire:.45 },
  },

  // ── II. Operações Puras ────────────────────────────────────────────────────

  {
    id: 'solutio',
    name: 'Solutio',
    subtitle: 'Aqua dominat. A dissolução total.',
    description: 'Água domina. A matéria se dissolve. Risco de dissolution alto.',
    agentCount: 500, heat: 0.30,
    elements: { earth:.08, water:.65, air:.20, fire:.07 },
  },
  {
    id: 'calcinatio',
    name: 'Calcinatio',
    subtitle: 'Ignis consumit. A purificação pelo fogo.',
    description: 'Fogo alto com calor moderado. Queima o impuro. Risco de burnout.',
    agentCount: 700, heat: 0.70,
    elements: { earth:.12, water:.10, air:.18, fire:.60 },
  },
  {
    id: 'sublimatio',
    name: 'Sublimatio',
    subtitle: 'Aer elevat. A elevação espiritual.',
    description: 'Ar domina. Volatilização máxima. Risco de ruído e dispersão.',
    agentCount: 600, heat: 0.40,
    elements: { earth:.08, water:.12, air:.65, fire:.15 },
  },
  {
    id: 'coagulatio',
    name: 'Coagulatio',
    subtitle: 'Terra fixat. A fixação da matéria.',
    description: 'Terra domina. Fixação máxima. Risco de cristalização prematura.',
    agentCount: 500, heat: 0.28,
    elements: { earth:.62, water:.18, air:.10, fire:.10 },
  },

  // ── III. Opus Fases Diretas ────────────────────────────────────────────────

  {
    id: 'putrefactio-nigra',
    name: 'Putrefactio Nigra',
    subtitle: 'O negro primordial. A matéria apodrece.',
    description: 'Nigredo puro. Alta tensão. A putrefação é o início de tudo.',
    agentCount: 650, heat: 0.62,
    elements: { earth:.15, water:.40, air:.12, fire:.33 },
  },
  {
    id: 'distillatio-alba',
    name: 'Distillatio Alba',
    subtitle: 'A prata emerge. Luna illuminat.',
    description: 'Albedo puro. Água+Terra purificam. Baixo calor. Clarificação gradual.',
    agentCount: 450, heat: 0.25,
    elements: { earth:.25, water:.50, air:.18, fire:.07 },
  },
  {
    id: 'aurora-citrina',
    name: 'Aurora Citrina',
    subtitle: 'O Sol nasce. A integração manifesta.',
    description: 'Citrinitas. Equilíbrio entre os 4 elementos com leve dominância do Ar.',
    agentCount: 550, heat: 0.42,
    elements: { earth:.22, water:.28, air:.32, fire:.18 },
  },
  {
    id: 'rubedo-regis',
    name: 'Rubedo Regis',
    subtitle: 'O Rei Vermelho encarna. Fogo fixado.',
    description: 'Rubedo. Fogo+Terra coagulam. Lapis busca forma. Alta integração possível.',
    agentCount: 650, heat: 0.58,
    elements: { earth:.28, water:.15, air:.20, fire:.37 },
  },

  // ── IV. Tria Prima (Paracelso) ────────────────────────────────────────────

  {
    id: 'mercurius',
    name: 'Mercurius',
    subtitle: 'O mediador. Ar+Água. Fluidez do espírito.',
    description: 'Tria Prima: Mercúrio = Ar+Água. Medeia entre Enxofre e Sal. Alto globalMix.',
    agentCount: 600, heat: 0.38,
    elements: { earth:.10, water:.40, air:.40, fire:.10 },
  },
  {
    id: 'sulphur',
    name: 'Sulphur Vivi',
    subtitle: 'A alma em combustão. Fogo+Ar.',
    description: 'Tria Prima: Enxofre = Fogo+Ar. A alma ativa. Alta mutação e transformação.',
    agentCount: 700, heat: 0.72,
    elements: { earth:.08, water:.12, air:.30, fire:.50 },
  },
  {
    id: 'sal-terrae',
    name: 'Sal Terrae',
    subtitle: 'O corpo fixado. Terra+Água.',
    description: 'Tria Prima: Sal = Terra+Água. O corpo da matéria. Estável, lento, profundo.',
    agentCount: 480, heat: 0.20,
    elements: { earth:.45, water:.40, air:.08, fire:.07 },
  },

  // ── V. Operações Compostas ─────────────────────────────────────────────────

  {
    id: 'coniunctio',
    name: 'Coniunctio',
    subtitle: 'Sol e Luna se unem. Fogo+Água.',
    description: 'A conjunção dos opostos (Sol/Fogo e Luna/Água). Tensão produtiva. Lapis próxima.',
    agentCount: 600, heat: 0.50,
    elements: { earth:.15, water:.35, air:.12, fire:.38 },
  },
  {
    id: 'separatio',
    name: 'Separatio',
    subtitle: 'Separa o fixo do volátil.',
    description: 'Solve máximo. Ar+Água dominam. Desfaz estruturas para criar novas.',
    agentCount: 600, heat: 0.45,
    elements: { earth:.08, water:.38, air:.38, fire:.16 },
  },
  {
    id: 'fixatio',
    name: 'Fixatio',
    subtitle: 'Fixa o volátil. Coagula máximo.',
    description: 'Coagula forte. Terra+calor fixam o que foi volatilizado. Baixo risco.',
    agentCount: 500, heat: 0.55,
    elements: { earth:.55, water:.12, air:.10, fire:.23 },
  },
  {
    id: 'lapis-hunt',
    name: 'Venatione Lapidis',
    subtitle: 'A caçada à Pedra. Alta integração.',
    description: 'Otimizado para forjar a Lapis: integração alta, calor moderado, terra+agua base.',
    agentCount: 700, heat: 0.52,
    elements: { earth:.28, water:.30, air:.20, fire:.22 },
  },
  {
    id: 'multiplicatio',
    name: 'Multiplicatio',
    subtitle: 'A pedra se multiplica. Máximo agentes.',
    description: 'Alta densidade. Fogo domina. Sistema altamente emergente. Caos produtivo.',
    agentCount: 900, heat: 0.75,
    elements: { earth:.15, water:.20, air:.22, fire:.43 },
  },
  {
    id: 'via-negativa',
    name: 'Via Negativa',
    subtitle: 'O mínimo. Vazio contemplativo.',
    description: 'Mínima interferência. Poucos agentes, calor baixo. Medita sobre o vazio do campo.',
    agentCount: 200, heat: 0.08,
    elements: { earth:.25, water:.25, air:.25, fire:.25 },
  },
];

export function getPreset(id: string): AlchemyPreset | undefined {
  return ALCHEMY_PRESETS.find(p => p.id === id);
}
