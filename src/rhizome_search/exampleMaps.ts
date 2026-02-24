// ── Rhizome Search — Example Maps ──────────────────────────────────────────────
// Pre-generated example maps for offline demonstration

import type { KnowledgeMap } from './types';

export const EXAMPLE_CYBERNETICS: KnowledgeMap = {
  title: 'Cibernética — Exemplo',
  summary: 'Mapa demonstrativo de cibernética com conceitos básicos',
  query: 'Cibernética',
  mapSize: 'small',
  outputStyle: 'balanced',
  generatedAt: Date.now(),
  nodes: [
    {
      id: 'node_1',
      label: 'Feedback Loop',
      type: 'concept',
      cluster: 'core',
      importance: 0.9,
      keywords: ['auto-regulação', 'sistema', 'controle'],
      inspector: {
        bullets: [
          'Processo circular de causa e efeito',
          'Base de sistemas auto-regulados',
          'Positivo (amplificação) ou negativo (estabilização)',
        ],
        connections: ['node_2', 'node_3'],
        search_queries: [
          'feedback loop cybernetics',
          'positive negative feedback systems',
          'homeostasis control theory',
        ],
        bibliography: [
          {
            title: 'Cybernetics: Or Control and Communication in the Animal and the Machine',
            author: 'Norbert Wiener',
            year: 1948,
            doi_or_isbn: '978-0262730099',
            confidence: 0.95,
            needs_verification: false,
          },
        ],
      },
    },
    {
      id: 'node_2',
      label: 'Norbert Wiener',
      type: 'person',
      cluster: 'founders',
      importance: 1.0,
      keywords: ['matemático', 'MIT', 'fundador'],
      inspector: {
        bullets: [
          'Matemático americano, pai da cibernética',
          'Trabalhou em sistemas de controle durante WWII',
          'Cunhou o termo "cibernética" em 1948',
        ],
        connections: ['node_1', 'node_3'],
        search_queries: [
          'Norbert Wiener biography',
          'Wiener cybernetics MIT',
          'Wiener WWII control systems',
        ],
        bibliography: [
          {
            title: 'I Am a Mathematician',
            author: 'Norbert Wiener',
            year: 1956,
            doi_or_isbn: '978-0262730112',
            confidence: 0.9,
            needs_verification: false,
          },
        ],
      },
    },
    {
      id: 'node_3',
      label: 'Sistema',
      type: 'concept',
      cluster: 'core',
      importance: 0.85,
      keywords: ['holismo', 'emergência', 'complexidade'],
      inspector: {
        bullets: [
          'Conjunto de elementos interconectados',
          'Propriedades emergentes do todo',
          'Mais que a soma das partes',
        ],
        connections: ['node_1', 'node_2', 'node_4'],
        search_queries: [
          'systems theory cybernetics',
          'emergence complex systems',
          'holism systems thinking',
        ],
        bibliography: [],
      },
    },
    {
      id: 'node_4',
      label: 'Entropia',
      type: 'concept',
      cluster: 'thermodynamics',
      importance: 0.7,
      keywords: ['desordem', 'informação', 'termodinâmica'],
      inspector: {
        bullets: [
          'Medida de desordem em um sistema',
          'Relacionada à informação (Shannon)',
          'Tende a aumentar em sistemas fechados',
        ],
        connections: ['node_3'],
        search_queries: [
          'entropy information theory',
          'Shannon entropy cybernetics',
          'thermodynamics systems',
        ],
        bibliography: [
          {
            title: 'A Mathematical Theory of Communication',
            author: 'Claude Shannon',
            year: 1948,
            doi_or_isbn: null,
            confidence: 0.8,
            needs_verification: true,
          },
        ],
      },
    },
  ],
  edges: [
    { source: 'node_1', target: 'node_2', weight: 0.9, relation: 'created_by', is_long: false },
    { source: 'node_1', target: 'node_3', weight: 0.8, relation: 'part_of', is_long: false },
    { source: 'node_2', target: 'node_3', weight: 0.7, relation: 'studied', is_long: false },
    { source: 'node_3', target: 'node_4', weight: 0.6, relation: 'relates_to', is_long: true },
  ],
  clusters: [
    {
      id: 'core',
      label: 'Conceitos Centrais',
      colorHint: '#7c3aed',
      description: 'Ideias fundamentais da cibernética',
    },
    {
      id: 'founders',
      label: 'Fundadores',
      colorHint: '#fbbf24',
      description: 'Pioneiros do campo',
    },
    {
      id: 'thermodynamics',
      label: 'Termodinâmica',
      colorHint: '#ef4444',
      description: 'Conexões com física',
    },
  ],
  bridges: ['node_3'],
  recommended_presets: {
    visibility: 0.6,
    noise: 0.3,
    territorializacao: 0.5,
    reterritorializacao: 0.4,
    linhasDeFuga: 0.5,
    hubs: 0.7,
    esquecimento: 0.2,
  },
};
