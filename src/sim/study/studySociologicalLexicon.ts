// ─── Sociogenesis — Léxico sociológico ────────────────────────────────────────
// Rótulos interpretativos para fases, papéis, símbolos, rituais, eventos e arquétipos.
// Inspirado em Durkheim, Weber, Foucault, Morin, Berger & Luckmann.

import type { StudyPhase } from './studyTypes';
import type { AgentRole } from './studyEngine';
import type { TotemKind, TabuKind, RitualKind } from './studyTypes';
import type { ArchetypeAxis, ArchetypeTier, IdeologyBucket } from './studyArchetypes';

// ── Fases do sistema (lente sociológica) ───────────────────────────────────────
export const PHASE_LABELS: Record<StudyPhase, { short: string; long: string }> = {
  SWARM:         { short: 'Anomia',            long: 'Anomia / dispersão — laços fracos, sem núcleo' },
  CLUSTERS:      { short: 'Tribos',            long: 'Tribos / clusters — coesão identitária' },
  POLARIZED:     { short: 'Polarização',       long: 'Polarização — nós vs. eles, ideologias em choque' },
  CONFLICT:      { short: 'Guerra',            long: 'Guerra / conflito aberto — hostilidade generalizada' },
  CONSENSUS:     { short: 'Consenso',          long: 'Consenso — ordem estável, normas compartilhadas' },
  EXCEPTION:     { short: 'Exceção',           long: 'Estado de exceção — soberania suspende a norma' },
  FERVOR:        { short: 'Religião política', long: 'Movimento de massa / religião política — sapiens-demens' },
  ECO_CRISIS:    { short: 'Crise ecológica',   long: 'Crise ecológica — auto-eco-organização colapsando' },
  TRANSCENDENCE: { short: 'Nova filosofia',    long: 'Ética emergente / nova filosofia — transcendência' },
};

export function getPhaseLabel(phase: StudyPhase, long = false): string {
  const p = PHASE_LABELS[phase];
  return p ? (long ? p.long : p.short) : phase;
}

// ── Codex por fase (card didático: o que é, por que, condições) ─────────────────
export interface PhaseCodexEntry {
  title: string;
  what: string;
  why: string;
  conditions: string;
}

export const PHASE_CODEX: Record<StudyPhase, PhaseCodexEntry> = {
  SWARM: {
    title: 'Anomia',
    what: 'Estado de dispersão em que os laços sociais são fracos e não há núcleo de normas ou identidade compartilhada.',
    why: 'Os agentes ainda não formaram clusters estáveis; coesão baixa e alta mobilidade mantêm o sistema fluido.',
    conditions: 'Coesão baixa · poucos encontros repetidos · ausência de símbolos (totens) que cristalizem crença.',
  },
  CLUSTERS: {
    title: 'Tribos / Clusters',
    what: 'Grupos identitários começam a se formar; os agentes se agrupam por proximidade e afinidade (crença, grupo).',
    why: 'A atração por similares e a coesão de boids fazem emergir aglomerados estáveis.',
    conditions: 'Coesão média-alta · grupos espacialmente separados · legitimidade (L) ou norma (N) em zonas definidas.',
  },
  POLARIZED: {
    title: 'Polarização',
    what: '“Nós vs. eles”: as ideologias se separam em polos (ordem vs. liberdade) e a confiança entre grupos cai.',
    why: 'Totens de cisma (RIFT), pressão ideológica alta ou conflito de legitimidade amplificam a divergência.',
    conditions: 'Alta variância de ideologia · baixa confiança intergrupo · presença de símbolos divisivos.',
  },
  CONFLICT: {
    title: 'Guerra / Conflito aberto',
    what: 'Hostilidade generalizada entre grupos; violência e medo altos; normas são contestadas pela força.',
    why: 'Conflito de recursos, legitimidade ou identidade sem mediação; agressão e medo se realimentam.',
    conditions: 'Conflito medido alto · muitos encontros hostis · baixa compreensão e ética emergente.',
  },
  CONSENSUS: {
    title: 'Consenso',
    what: 'Ordem estável: normas compartilhadas, ideologia convergente e conflito baixo. A sociedade opera por acordo tácito ou explícito.',
    why: 'Alta coesão, pressão de conformidade e/ou totens de fundação (BOND) cristalizam crença; conflito foi resolvido ou evitado.',
    conditions: 'Consenso medido alto · coesão alta · polarização e conflito baixos · legitimidade (L) e norma (N) distribuídas.',
  },
  EXCEPTION: {
    title: 'Estado de exceção',
    what: 'A soberania suspende a norma: as regras habituais não valem; o poder age além do consenso.',
    why: 'Muitas violações de tabu ou crise levam o sistema a “estado de exceção” (Schmitt / Agamben).',
    conditions: 'Violações de tabu acima do limiar · duração configurada de exceção.',
  },
  FERVOR: {
    title: 'Religião política / Movimento de massa',
    what: 'Movimento de massa: crença e fervor altos, conformidade forte; risco de “sapiens-demens” (Morin) — razão e desrazão juntas.',
    why: 'Fervor (crença + medo) acima do limiar; totens ou oráculos concentram carisma e adesão.',
    conditions: 'Fervor médio alto · crença e medo elevados · possível presença de oráculo ou BOND forte.',
  },
  ECO_CRISIS: {
    title: 'Crise ecológica',
    what: 'Auto-eco-organização em colapso: o ambiente (campo R) degrada; recursos insuficientes para a população.',
    why: 'Extração (harvest) maior que regeneração; ecoFootprint dos agentes danifica o campo R.',
    conditions: 'Saúde ecológica baixa · regeneração de R insuficiente · ecoDegradation alto.',
  },
  TRANSCENDENCE: {
    title: 'Nova filosofia / Transcendência',
    what: 'Ética e compreensão emergentes permitem ir além do conflito tribal: antropo-ética (Morin) — cuidado de si e do outro.',
    why: 'Encontros pacíficos entre grupos e entendimento mútuo elevam “compreensão” e “ética”; estas reduzem hybris e agressão.',
    conditions: 'Ética e compreensão médias altas · conflito baixo · memórias amigáveis cross-group.',
  },
};

export function getPhaseCodex(phase: StudyPhase): PhaseCodexEntry {
  return PHASE_CODEX[phase] ?? { title: phase, what: '', why: '', conditions: '' };
}

// ── Rótulos completos das métricas (para barras e codex) ────────────────────────
export const METRIC_LABELS: Record<string, { short: string; long: string }> = {
  cohesion:     { short: 'Coesão',      long: 'Coesão — força dos laços entre agentes do mesmo grupo; atração e alinhamento.' },
  polarization: { short: 'Polarização', long: 'Polarização — divergência ideológica (ordem vs. liberdade); “nós vs. eles”.' },
  conflict:     { short: 'Conflito',    long: 'Conflito — nível de hostilidade entre grupos; encontros hostis e agressão.' },
  consensus:    { short: 'Consenso',    long: 'Consenso — grau de acordo nas normas e na ideologia; ordem estável.' },
};
export const ROLE_LABELS: Record<AgentRole, { short: string; long: string }> = {
  normal:    { short: 'Cidadão',         long: 'Cidadão — agente de base' },
  leader:    { short: 'Líder nato',      long: 'Líder nato — centralidade e status' },
  authority: { short: 'Autoridade',      long: 'Autoridade institucional — poder legítimo' },
  dictator:  { short: 'Ditador',         long: 'Ditador / tirano — poder coercivo' },
  priest:    { short: 'Sacerdote',       long: 'Sacerdote / legitimador — religião e carisma' },
  guardian:  { short: 'Guardião',       long: 'Guardião das normas — crença + status' },
  mediator:  { short: 'Mediador',       long: 'Mediador / ponte — laços cross-group' },
  aggressor: { short: 'Agressor',       long: 'Agressor — hostilidade ativa' },
  rebel:     { short: 'Revolucionário',  long: 'Revolucionário / dissidente' },
  artist:    { short: 'Artista',        long: 'Artista — desejo alto, transgressão simbólica' },
  innovator: { short: 'Inovador',       long: 'Inovador — desejo + status + liberdade' },
  predator:  { short: 'Predador',        long: 'Predador / psicopata social — agressão + baixa empatia' },
};

export function getRoleLabel(role: AgentRole, long = false): string {
  const r = ROLE_LABELS[role];
  return r ? (long ? r.long : r.short) : role;
}

// ── Símbolos: totens (instituições / lugares sagrados) ─────────────────────────
export const TOTEM_LABELS: Record<TotemKind, { short: string; long: string }> = {
  BOND:       { short: 'Fundação',      long: 'Fundação / religião — N+L, cristaliza crença' },
  RIFT:       { short: 'Cisma',         long: 'Cisma / guerra ideológica — anti-N, polarização' },
  ORACLE:     { short: 'Oráculo',       long: 'Oráculo — autoridade carismática' },
  ARCHIVE:    { short: 'Arquivo',       long: 'Arquivo / memória coletiva' },
  PANOPTICON: { short: 'Panóptico',     long: 'Panóptico — vigilância, disciplina' },
};

export function getTotemLabel(kind: TotemKind, long = false): string {
  const t = TOTEM_LABELS[kind];
  return t ? (long ? t.long : t.short) : kind;
}

// ── Tabus (limites morais / pânico moral) ──────────────────────────────────────
export const TABU_LABELS: Record<TabuKind, { short: string; long: string }> = {
  NO_ENTER: { short: 'Proibido entrar',   long: 'Tabu de entrada — medo no limiar' },
  NO_MIX:   { short: 'Proibido misturar', long: 'Tabu de mistura — endogamia, fronteira' },
};

export function getTabuLabel(kind: TabuKind, long = false): string {
  const t = TABU_LABELS[kind];
  return t ? (long ? t.long : t.short) : kind;
}

// ── Rituais (práticas coletivas) ──────────────────────────────────────────────
export const RITUAL_LABELS: Record<RitualKind, { short: string; long: string }> = {
  GATHER:     { short: 'Assembleia',    long: 'Assembleia / ritual de consenso' },
  PROCESSION: { short: 'Procissão',     long: 'Procissão — disciplina e N' },
  OFFERING:   { short: 'Oferta',        long: 'Oferta — redistribuição de recursos' },
  REVOLT:     { short: 'Revolução',     long: 'Revolução — quebra de normas' },
};

export function getRitualLabel(kind: RitualKind, long = false): string {
  const r = RITUAL_LABELS[kind];
  return r ? (long ? r.long : r.short) : kind;
}

// ── Ações / ferramentas (lente sociológica) ───────────────────────────────────
export const TOOL_SOCIOLOGICAL_LABELS: Record<string, { short: string; long: string }> = {
  totem_bond:        { short: 'Fundação',     long: 'Colocar totem de fundação (religião / instituição)' },
  totem_rift:        { short: 'Cisma',        long: 'Colocar totem de cisma (polarização)' },
  totem_oracle:      { short: 'Oráculo',      long: 'Colocar oráculo (autoridade carismática)' },
  totem_archive:     { short: 'Arquivo',      long: 'Colocar arquivo (memória coletiva)' },
  totem_panopticon:  { short: 'Panóptico',   long: 'Colocar panóptico (vigilância)' },
  tabu_enter:        { short: 'Tabu entrada', long: 'Tabu de entrada (moral panic)' },
  tabu_mix:          { short: 'Tabu mistura', long: 'Tabu de mistura (fronteira)' },
  ritual_gather:     { short: 'Assembleia',   long: 'Ritual de assembleia' },
  ritual_procession: { short: 'Procissão',    long: 'Ritual de procissão' },
  ritual_offering:   { short: 'Oferta',       long: 'Ritual de oferta (redistribuição)' },
  ritual_revolt:     { short: 'Revolução',    long: 'Ritual de revolução' },
};

// ── Eventos: normalização de mensagens para rótulo sociológico ───────────────
export function getEventSociologicalLabel(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('phase') || lower.includes('→')) return 'Mudança de fase';
  if (lower.includes('taboo') || lower.includes('violation') || lower.includes('violação')) return 'Violação de tabu';
  if (lower.includes('state of exception') || lower.includes('excepção')) return 'Estado de exceção';
  if (lower.includes('coalition') || lower.includes('coalizão')) return 'Coalizão';
  if (lower.includes('wealth gap') || lower.includes('gini')) return 'Desigualdade';
  if (lower.includes('foundation') || lower.includes('crystallised') || lower.includes('cristaliz')) return 'Fundação emergente';
  if (lower.includes('schism') || lower.includes('breaks from')) return 'Cisma';
  if (lower.includes('oracle') || lower.includes('charismatic')) return 'Oráculo emergente';
  if (lower.includes('archive') || lower.includes('memory')) return 'Arquivo emergente';
  if (lower.includes('revolt') || lower.includes('revolução') || lower.includes('erupted')) return 'Revolução';
  if (lower.includes('offering') || lower.includes('redistribut') || lower.includes('poverty')) return 'Oferta / redistribuição';
  if (lower.includes('gather') || lower.includes('ritual begins')) return 'Assembleia';
  if (lower.includes('procession')) return 'Procissão';
  if (lower.includes('migrated') || lower.includes('migração')) return 'Migração de grupo';
  if (lower.includes('sealed') || lower.includes('limit')) return 'Tabu selado';
  return message;
}

// Helper: agLow for archetype label
function agLow(agT: number): boolean {
  return agT < 1;
}

// ── Arquétipos (eixo + tier + poder + ideologia + agressão) ─────────────────────
export function getArchetypeSociologicalLabel(
  axis: ArchetypeAxis,
  axisT: ArchetypeTier,
  powerT: ArchetypeTier,
  agT: ArchetypeTier,
  ideB: IdeologyBucket,
): string {
  const powerHigh = powerT >= 1;
  const powerTop = powerT === 2;
  const order = ideB === 0;
  const liberty = ideB === 2;

  if (axis === 0) {
    if (powerTop && agLow(agT) && order) return 'Sacerdote';
    if (powerTop && agT >= 1 && order) return 'Ditador';
    if (powerHigh && order) return 'Crente ortodoxo';
    if (powerHigh && liberty) return 'Reformista';
    if (axisT >= 1 && order) return 'Conformista';
    if (axisT === 0 && liberty) return 'Cético';
    return 'Crente';
  }
  if (axis === 1) {
    if (powerHigh && agT >= 1) return 'Paranoico';
    if (powerHigh) return 'Refugiado';
    if (agT >= 1) return 'Pânico';
    return 'Medroso';
  }
  if (axis === 2) {
    if (powerHigh && liberty && agLow(agT)) return 'Inovador';
    if (powerHigh && agT >= 1) return 'Revolucionário';
    if (!powerHigh && agLow(agT) && liberty) return 'Artista';
    if (liberty && agT >= 1) return 'Transgressor';
    if (powerHigh) return 'Ambicioso';
    return 'Desejante';
  }
  if (axis === 3) {
    if (powerHigh && agT >= 1) return 'Revolucionário';
    if (powerHigh && liberty) return 'Dissidente';
    if (agT >= 1) return 'Rebelde';
    if (liberty) return 'Libertário';
    return 'Resistente';
  }
  return 'Cidadão';
}

// ── Arquétipo a partir da chave numérica (mesma bit-layout que studyArchetypes) ─
export function archetypeKeyToSociologicalLabel(key: number): string {
  const axis = (key & 0x03) as ArchetypeAxis;
  const axisT = Math.min(2, (key >>> 2) & 0x03) as ArchetypeTier;
  const powerT = Math.min(2, (key >>> 4) & 0x03) as ArchetypeTier;
  const agT = Math.min(2, (key >>> 6) & 0x03) as ArchetypeTier;
  const ideB = Math.min(2, (key >>> 8) & 0x03) as IdeologyBucket;
  return getArchetypeSociologicalLabel(axis, axisT, powerT, agT, ideB);
}
