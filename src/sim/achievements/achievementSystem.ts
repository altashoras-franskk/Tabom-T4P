// Achievement System — Complexity Life Lab
// Triggers are based on real simulation metrics, not arbitrary clicks.

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'pattern' | 'emergence' | 'stability' | 'chaos' | 'discovery' | 'milestone';
  icon: string;
  unlockedAt?: number;
  metadata?: {
    pattern?: string;
    particleCount?: number;
    typesCount?: number;
    duration?: number;
    confidence?: number;
  };
}

export interface AchievementPrompt {
  currentTime: number;
  particleCount: number;
  typesCount: number;
  organisms: Array<{
    id: string;
    age: number;
    stability: number;
    particleCount: number;
  }>;
  stabilityScore: number;
  entropyLevel: number;
  recentEvents: string[];
  configSummary: string;
  // Rich physics metrics (new)
  borderStrength?: number;        // 0–1: how strong spatial borders are
  stableClusters?: number;        // integer: how many stable clusters exist
  oscillation?: number;           // 0–1: periodic movement detected
  diversityIndex?: number;        // 0–1: shannon diversity of types
  avgTension?: number;            // 0–1: field tension level
  avgCohesion?: number;           // 0–1: field cohesion level
  totalBeats?: number;            // cumulative evolution events
  totalSpeciations?: number;      // cumulative speciation events
  totalMutations?: number;        // cumulative mutations
  totalMitosis?: number;          // cumulative mitosis events
  peakParticleCount?: number;     // all-time peak
}

// ─── Persistent store (localStorage) ────────────────────────────────────────
export class AchievementStore {
  private storageKey = 'metalife_achievements_v2';
  private achievements: Map<string, Achievement> = new Map();

  constructor() { this.load(); }

  load(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) this.achievements = new Map(Object.entries(JSON.parse(data)));
    } catch { /* ignore */ }
  }

  save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(Object.fromEntries(this.achievements)));
    } catch { /* ignore */ }
  }

  unlock(a: Achievement): boolean {
    if (this.achievements.has(a.id)) return false;
    a.unlockedAt = Date.now();
    this.achievements.set(a.id, a);
    this.save();
    return true;
  }

  getAll(): Achievement[] {
    return Array.from(this.achievements.values()).sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0));
  }

  getUnlockedCount(): number { return this.achievements.size; }
  isUnlocked(id: string): boolean { return this.achievements.has(id); }
  clear(): void { this.achievements.clear(); this.save(); }
}

// ─── All achievements (displayed locked/unlocked in panel) ───────────────────
export const KNOWN_PATTERN_ACHIEVEMENTS: Achievement[] = [
  // MILESTONES (time)
  { id: 'first_30_seconds', name: 'Observador', description: 'Assistiu 30 segundos de evolução', category: 'milestone', icon: '👁️' },
  { id: 'first_minute',     name: 'Testemunha', description: 'Um minuto de observação', category: 'milestone', icon: '⏱️' },
  { id: 'five_minutes',     name: 'Cronista', description: '5 minutos contemplando o universo', category: 'milestone', icon: '📜' },
  { id: 'ten_minutes',      name: 'Historiador', description: '10 minutos de vida artificial', category: 'milestone', icon: '📚' },
  { id: 'thirty_minutes',   name: 'Arquivista Temporal', description: 'Meia hora de existência', category: 'milestone', icon: '🕰️' },
  { id: 'one_hour',         name: 'Guardião das Eras', description: 'Uma hora de ciclos universais', category: 'milestone', icon: '⌛' },

  // POPULATION milestones (particle count)
  { id: 'pop_500',   name: 'Gênesis', description: 'Universo com 500+ partículas', category: 'milestone', icon: '🌱' },
  { id: 'pop_1000',  name: 'Ecossistema', description: 'Universo com 1000+ partículas', category: 'milestone', icon: '🌿' },
  { id: 'pop_2000',  name: 'Metrópole', description: '2000+ partículas simultâneas', category: 'milestone', icon: '🏙️' },
  { id: 'pop_5000',  name: 'Megacidade', description: '5000+ partículas! Densidade crítica', category: 'milestone', icon: '🌆' },

  // PATTERN — triggered by real physics metrics
  { id: 'border_formed',     name: 'Fronteira', description: 'Bordas territoriais claras emergiram', category: 'pattern', icon: '🗺️' },
  { id: 'stable_attractor',  name: 'Atrator Estável', description: '3+ clusters estáveis simultâneos', category: 'pattern', icon: '⚛️' },
  { id: 'oscillation',       name: 'Oscilador', description: 'Padrão oscilatório periódico detectado', category: 'pattern', icon: '〰️' },
  { id: 'crystal_form',      name: 'Cristal', description: 'Alta coesão + baixa entropia = cristal', category: 'pattern', icon: '💎' },
  { id: 'vortex_form',       name: 'Vórtice', description: 'Rotação coletiva estável', category: 'pattern', icon: '🌀' },
  { id: 'segregation',       name: 'Segregação', description: 'Tipos separados em territórios distintos', category: 'pattern', icon: '🛡️' },
  { id: 'spiral_arms',       name: 'Galáxia Espiral', description: 'Braços espirais rotativos', category: 'pattern', icon: '🌌' },
  { id: 'fractal_structure', name: 'Mandelbrot', description: 'Estrutura auto-similar recursiva', category: 'pattern', icon: '❄️' },
  { id: 'binary_orbit',      name: 'Sistema Binário', description: 'Dois grupos orbitando mutuamente', category: 'pattern', icon: '♊' },
  { id: 'perfect_symmetry',  name: 'Simetria', description: 'Simetria radial emergiu', category: 'pattern', icon: '✨' },

  // EMERGENCE — triggered by events
  { id: 'first_beat',        name: 'Primeira Batida', description: 'Primeiro evento evolutivo', category: 'emergence', icon: '💓' },
  { id: 'ten_beats',         name: 'Decálogo', description: '10 eventos evolutivos', category: 'emergence', icon: '📿' },
  { id: 'fifty_beats',       name: 'Sinfonia', description: '50 eventos evolutivos', category: 'emergence', icon: '🎵' },
  { id: 'first_speciation',  name: 'Gênese de Espécie', description: 'Primeira especiação emergiu', category: 'emergence', icon: '🦕' },
  { id: 'five_speciations',  name: 'Explosão Cambriana', description: '5+ especiações ocorreram', category: 'emergence', icon: '🧬' },
  { id: 'first_mitosis',     name: 'Divisão Celular', description: 'Primeiro evento de mitose', category: 'emergence', icon: '🔬' },
  { id: 'ten_mitosis',       name: 'Reprodução Ativa', description: '10 divisões celulares', category: 'emergence', icon: '🧫' },
  { id: 'first_mutation',    name: 'Primeira Mutação', description: 'Primeiro drift genético', category: 'emergence', icon: '🔀' },
  { id: 'phase_shift',       name: 'Transição de Fase', description: 'Mudança abrupta de regime detectada', category: 'emergence', icon: '⚡' },
  { id: 'cascade_event',     name: 'Cascata', description: 'Eventos encadeados em sequência', category: 'emergence', icon: '🎲' },

  // STABILITY
  { id: 'stability_30s',   name: 'Equilíbrio', description: 'Sistema estável por 30 segundos', category: 'stability', icon: '⚖️' },
  { id: 'stability_2min',  name: 'Homeostase', description: 'Estável por 2+ minutos', category: 'stability', icon: '🌡️' },
  { id: 'stability_5min',  name: 'Ordem Eterna', description: 'Estável por 5+ minutos', category: 'stability', icon: '🏛️' },
  { id: 'high_diversity',  name: 'Biodiversidade', description: 'Alta diversidade de tipos simultânea', category: 'stability', icon: '🌈' },
  { id: 'field_coherence', name: 'Campo Coerente', description: 'Alta coesão no campo de memória', category: 'stability', icon: '🧲' },

  // CHAOS
  { id: 'high_entropy',      name: 'Big Bang', description: 'Entropia máxima alcançada', category: 'chaos', icon: '💥' },
  { id: 'mass_extinction',   name: 'Extinção em Massa', description: 'Queda de 80%+ da população', category: 'chaos', icon: '☄️' },
  { id: 'chaos_recovery',    name: 'Fênix', description: 'Ordem emergiu do caos máximo', category: 'chaos', icon: '🔥' },
  { id: 'tension_spike',     name: 'Crise', description: 'Tensão crítica no campo', category: 'chaos', icon: '⚠️' },

  // DISCOVERY (interaction-based)
  { id: 'matrix_randomized', name: 'Alquimista', description: 'Matriz de interação randomizada', category: 'discovery', icon: '🎲' },
  { id: 'preset_explorer',   name: 'Explorador', description: '3+ presets diferentes testados', category: 'discovery', icon: '🗺️' },
  { id: 'field_heatmap',     name: 'Cartógrafo', description: 'Heatmap de campo ativado', category: 'discovery', icon: '🌡️' },
  { id: 'trails_on',         name: 'Rastro de Luz', description: 'Trilhas de partículas ativadas', category: 'discovery', icon: '✦' },
  { id: 'high_speed',        name: 'Aceleração', description: 'Simulação em velocidade 5x', category: 'discovery', icon: '⚡' },
  { id: 'codex_capture',     name: 'Taxonomista', description: 'Primeiro organismo capturado no Codex', category: 'discovery', icon: '📖' },
];

const ACHIEVEMENT_MAP = new Map<string, Achievement>(KNOWN_PATTERN_ACHIEVEMENTS.map(a => [a.id, a]));
const getA = (id: string): Achievement => ({ ...ACHIEVEMENT_MAP.get(id)! });

// ─── Stability tracker (keeps continuous count) ─────────────────────────────
let _stableSeconds = 0;
let _lastStabilityTime = 0;
let _presetsLoaded = 0;
let _prevParticleCount = -1;
let _peakParticleCount = 0;

export const trackExternalEvent = (event: 'preset_loaded' | 'field_heatmap' | 'trails_on' | 'high_speed' | 'matrix_randomized' | 'codex_capture') => {
  if (event === 'preset_loaded') _presetsLoaded++;
};

// ─── Main rule-based checker ─────────────────────────────────────────────────
export const checkRuleBasedAchievements = (
  prompt: AchievementPrompt,
  existingAchievements: Achievement[]
): Achievement | null => {
  const unlocked = new Set(existingAchievements.map(a => a.id));
  const t = prompt.currentTime;
  const pc = prompt.particleCount;
  const bs = prompt.borderStrength ?? 0;
  const sc = prompt.stableClusters ?? 0;
  const osc = prompt.oscillation ?? 0;
  const div = prompt.diversityIndex ?? 0;
  const tens = prompt.avgTension ?? 0;
  const coh = prompt.avgCohesion ?? 0;
  const ent = prompt.entropyLevel;
  const stab = prompt.stabilityScore;
  const beats = prompt.totalBeats ?? 0;
  const specs = prompt.totalSpeciations ?? 0;
  const mits = prompt.totalMitosis ?? 0;

  // ── Time milestones ──────────────────────────────────────────────────────
  if (!unlocked.has('first_30_seconds') && t >= 30)   return { ...getA('first_30_seconds'), metadata: { duration: t } };
  if (!unlocked.has('first_minute')     && t >= 60)   return { ...getA('first_minute'),     metadata: { duration: t } };
  if (!unlocked.has('five_minutes')     && t >= 300)  return { ...getA('five_minutes'),      metadata: { duration: t } };
  if (!unlocked.has('ten_minutes')      && t >= 600)  return { ...getA('ten_minutes'),       metadata: { duration: t } };
  if (!unlocked.has('thirty_minutes')   && t >= 1800) return { ...getA('thirty_minutes'),    metadata: { duration: t } };
  if (!unlocked.has('one_hour')         && t >= 3600) return { ...getA('one_hour'),          metadata: { duration: t } };

  // ── Population milestones ────────────────────────────────────────────────
  _peakParticleCount = Math.max(_peakParticleCount, pc);
  if (!unlocked.has('pop_500')  && _peakParticleCount >= 500)  return { ...getA('pop_500'),  metadata: { particleCount: pc } };
  if (!unlocked.has('pop_1000') && _peakParticleCount >= 1000) return { ...getA('pop_1000'), metadata: { particleCount: pc } };
  if (!unlocked.has('pop_2000') && _peakParticleCount >= 2000) return { ...getA('pop_2000'), metadata: { particleCount: pc } };
  if (!unlocked.has('pop_5000') && _peakParticleCount >= 5000) return { ...getA('pop_5000'), metadata: { particleCount: pc } };

  // ── Mass extinction: 80%+ drop in particles ──────────────────────────────
  if (_prevParticleCount > 0 && pc < _prevParticleCount * 0.2 && _prevParticleCount > 100) {
    _prevParticleCount = pc;
    if (!unlocked.has('mass_extinction')) return { ...getA('mass_extinction'), metadata: { particleCount: pc } };
  }
  if (pc > 50) _prevParticleCount = pc;

  // ── Physics-based patterns ───────────────────────────────────────────────
  if (!unlocked.has('border_formed')    && bs > 0.55)          return { ...getA('border_formed'),    metadata: { confidence: bs } };
  if (!unlocked.has('stable_attractor') && sc >= 3)            return { ...getA('stable_attractor'), metadata: { confidence: sc / 10 } };
  if (!unlocked.has('oscillation')      && osc > 0.5)          return { ...getA('oscillation'),      metadata: { confidence: osc } };
  if (!unlocked.has('segregation')      && bs > 0.7 && sc >= 2) return { ...getA('segregation'),     metadata: { confidence: bs } };
  if (!unlocked.has('crystal_form')     && coh > 0.7 && ent < 0.2) return { ...getA('crystal_form'), metadata: { confidence: coh } };
  if (!unlocked.has('field_coherence')  && coh > 0.65 && t > 30)   return { ...getA('field_coherence'), metadata: { confidence: coh } };
  if (!unlocked.has('high_entropy')     && ent > 0.85)          return { ...getA('high_entropy'),    metadata: { confidence: ent } };
  if (!unlocked.has('tension_spike')    && tens > 0.75)         return { ...getA('tension_spike'),   metadata: { confidence: tens } };
  if (!unlocked.has('high_diversity')   && div > 0.7 && prompt.typesCount >= 4) return { ...getA('high_diversity'), metadata: { typesCount: prompt.typesCount } };

  // ── Stability ────────────────────────────────────────────────────────────
  const now = Date.now() / 1000;
  if (stab > 0.65) {
    if (_lastStabilityTime === 0) _lastStabilityTime = now;
    _stableSeconds = now - _lastStabilityTime;
  } else {
    _lastStabilityTime = 0;
    _stableSeconds = 0;
  }
  if (!unlocked.has('stability_30s')  && _stableSeconds >= 30)  return { ...getA('stability_30s'),  metadata: { duration: _stableSeconds } };
  if (!unlocked.has('stability_2min') && _stableSeconds >= 120) return { ...getA('stability_2min'), metadata: { duration: _stableSeconds } };
  if (!unlocked.has('stability_5min') && _stableSeconds >= 300) return { ...getA('stability_5min'), metadata: { duration: _stableSeconds } };

  // ── Emergence events ─────────────────────────────────────────────────────
  const hasSpec = prompt.recentEvents.some(e =>
    e.toLowerCase().includes('espécie') || e.toLowerCase().includes('archetype') || e.toLowerCase().includes('speciação'));
  const hasMit  = prompt.recentEvents.some(e =>
    e.toLowerCase().includes('divisão') || e.toLowerCase().includes('mitose'));
  const hasMut  = prompt.recentEvents.some(e =>
    e.toLowerCase().includes('mutação') || e.toLowerCase().includes('mutation'));
  const hasBeat = prompt.recentEvents.some(e =>
    e.includes('💓') || e.includes('⚡') || e.includes('🧬'));

  if (!unlocked.has('first_beat')       && (hasBeat || hasSpec || beats >= 1)) return { ...getA('first_beat'), metadata: { confidence: 1 } };
  if (!unlocked.has('ten_beats')        && beats >= 10)   return { ...getA('ten_beats'),        metadata: { confidence: 1 } };
  if (!unlocked.has('fifty_beats')      && beats >= 50)   return { ...getA('fifty_beats'),      metadata: { confidence: 1 } };
  if (!unlocked.has('first_speciation') && (hasSpec || specs >= 1)) return { ...getA('first_speciation'), metadata: { confidence: 1 } };
  if (!unlocked.has('five_speciations') && specs >= 5)   return { ...getA('five_speciations'),  metadata: { confidence: 1 } };
  if (!unlocked.has('first_mitosis')    && (hasMit || mits >= 1))   return { ...getA('first_mitosis'),    metadata: { confidence: 1 } };
  if (!unlocked.has('ten_mitosis')      && mits >= 10)   return { ...getA('ten_mitosis'),       metadata: { confidence: 1 } };
  if (!unlocked.has('first_mutation')   && hasMut)       return { ...getA('first_mutation'),    metadata: { confidence: 1 } };

  // Phase shift: high-stability → high-entropy transition
  if (!unlocked.has('phase_shift') && ent > 0.6 && stab < 0.3 && t > 60) {
    return { ...getA('phase_shift'), metadata: { confidence: ent } };
  }

  // Chaos recovery: entropy was high, now stable again
  if (!unlocked.has('chaos_recovery') && ent < 0.4 && stab > 0.6 && beats >= 5) {
    return { ...getA('chaos_recovery'), metadata: { confidence: stab } };
  }

  // Cascade: many beats in recent events
  if (!unlocked.has('cascade_event') && beats >= 3 && prompt.recentEvents.length >= 5) {
    return { ...getA('cascade_event'), metadata: { confidence: 0.9 } };
  }

  // Preset explorer: 3+ presets tested
  if (!unlocked.has('preset_explorer') && _presetsLoaded >= 3) {
    return { ...getA('preset_explorer'), metadata: { confidence: 1 } };
  }

  return null;
};

// LLM detector placeholder (not implemented)
export const detectPatternWithLLM = async (
  _prompt: AchievementPrompt,
  _existing: Achievement[]
): Promise<Achievement | null> => null;
