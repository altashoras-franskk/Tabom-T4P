// ── Rhizome Search — Constants & Messages ──────────────────────────────────────

// ── UI Messages ───────────────────────────────────────────────────────────────
export const MESSAGES = {
  EMPTY_QUERY: 'Insira um tópico para pesquisar.',
  API_KEY_MISSING: 'API key não configurada. Configure nas Settings ou via .env',
  GENERATING: 'Gerando mapa rizomático...',
  FROM_CACHE: 'Mapa carregado do cache.',
  ERROR_NETWORK: 'Erro de rede. Verifique sua conexão.',
  ERROR_PARSE: 'Erro ao processar resposta do LLM.',
  ERROR_UNKNOWN: 'Erro desconhecido. Tente novamente.',
};

// ── Default Settings ──────────────────────────────────────────────────────────
export const DEFAULTS = {
  MAP_SIZE: 'medium' as const,
  OUTPUT_STYLE: 'balanced' as const,
  LIVING_LAYOUT: false,
  TIMEOUT_MS: 20000,
  MAX_RETRIES: 1,
};

// ── Style Labels ──────────────────────────────────────────────────────────────
export const OUTPUT_STYLE_LABELS = {
  concepts: 'Conceitos',
  people_works: 'Pessoas & Obras',
  methods: 'Métodos',
  balanced: 'Balanceado',
};

export const MAP_SIZE_LABELS = {
  small: 'Small (40 nós)',
  medium: 'Medium (80 nós)',
  large: 'Large (150 nós)',
};
