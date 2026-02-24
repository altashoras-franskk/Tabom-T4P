# Rhizome Search — LLM-Powered Knowledge Maps

Sistema completo de geração de mapas de conhecimento rizomáticos usando LLMs.

## Visão Geral

O Rhizome Search transforma qualquer área do conhecimento em um **rizoma epistêmico navegável**. O sistema usa LLMs para gerar grafos de conhecimento com:

- **Múltiplas entradas** (sem hierarquia única)
- **Bridges** (nós que conectam 3+ clusters)
- **Linhas de fuga** (arestas cross-cluster)
- **Nós clicáveis** com inspeção detalhada

## Arquitetura

```
/src/rhizome_search/
├── types.ts              # Sistema de tipos completo
├── schema.ts             # Schema JSON e validação
├── llmClient.ts          # Cliente LLM com retry e timeout
├── mapBuilder.ts         # Layout force-directed e living layout
├── mapCache.ts           # LocalStorage cache e biblioteca
├── nodeInspector.ts      # Lógica de seleção e navegação
├── renderer.ts           # Renderização canvas
├── constants.ts          # Constantes e mensagens
├── exampleMaps.ts        # Mapas de exemplo
├── index.ts              # Exports principais
└── ui/
    ├── RhizomeSearchPanel.tsx   # UI principal
    ├── NodeInspector.tsx        # Drawer de inspeção de nós
    └── MapLibrary.tsx           # Biblioteca de mapas salvos
```

## Uso

### No Rhizome Lab

1. Abra o Rhizome Lab
2. Expanda a seção "LLM Epistêmico"
3. Clique em **"Abrir Rhizome Search"**

### Interface

#### Painel de Busca

- **Query**: Área de conhecimento para explorar
- **Map Size**: Small (40), Medium (80), Large (150) nós
- **Output Style**: Concepts, People+Works, Methods, Balanced
- **Living Layout**: Toggle para manter layout animado

#### Canvas

- **Nós coloridos** por cluster
- **Bridges** com halo branco
- **Linhas de fuga** em magenta (cross-cluster)
- **Clique** em nó para abrir Inspector

#### Node Inspector

- **3 bullets** resumo
- **Conexões** navegáveis
- **Search Queries** copiáveis
- **Bibliografia** com confiança e verificação

#### Map Library

- Histórico de últimos 12 mapas
- Load, Rename, Export JSON, Delete

## Configuração

### API Key

Prioridade de resolução:

1. Input do usuário no painel
2. `VITE_RHIZOME_LLM_API_KEY` (env)
3. `VITE_OPENAI_API_KEY` (env)
4. `window.__APP_CONFIG__.OPENAI_API_KEY`

### Modelo

- Default: `gpt-4o-mini`
- Override via `VITE_RHIZOME_LLM_MODEL` ou input

### Base URL

- Default: `https://api.openai.com/v1`
- Override via `VITE_RHIZOME_LLM_BASE_URL`

## Schema JSON

O LLM deve retornar:

```json
{
  "title": "string",
  "summary": "string (1-2 linhas)",
  "nodes": [
    {
      "id": "string",
      "label": "string",
      "type": "concept|person|work|method|discipline",
      "cluster": "string",
      "importance": 0.8,
      "keywords": ["tag1", "tag2"],
      "inspector": {
        "bullets": ["bullet1", "bullet2", "bullet3"],
        "connections": ["node_id_1", "node_id_2"],
        "search_queries": ["query1", "query2"],
        "bibliography": [
          {
            "title": "Book Title",
            "author": "Author Name",
            "year": 2020,
            "doi_or_isbn": "978-...",
            "confidence": 0.9,
            "needs_verification": false
          }
        ]
      }
    }
  ],
  "edges": [
    {
      "source": "node_id_1",
      "target": "node_id_2",
      "weight": 0.7,
      "relation": "influences",
      "is_long": false
    }
  ],
  "clusters": [
    {
      "id": "cluster_id",
      "label": "Cluster Name",
      "colorHint": "#7c3aed",
      "description": "Description"
    }
  ],
  "bridges": ["node_id_3"],
  "recommended_presets": {
    "visibility": 0.6,
    "noise": 0.3,
    "territorializacao": 0.5,
    "reterritorializacao": 0.4,
    "linhasDeFuga": 0.5,
    "hubs": 0.7,
    "esquecimento": 0.2
  }
}
```

## Anti-Alucinação

### Regras Críticas

1. **NÃO inventar bibliografia como fato**
   - Se incerto, marcar `needs_verification: true`
   - Usar `confidence` baixa (< 0.5)
   - Campos `author`, `year`, `doi_or_isbn` podem ser `null`

2. **SEMPRE fornecer search_queries**
   - Estas são o "link" real para pesquisa
   - 5-10 queries por nó
   - Copiáveis para Google Scholar, PubMed, etc.

3. **Bibliografia verificável**
   - Badge de confiança (0-100%)
   - Badge "Verificar" quando `needs_verification: true`
   - DOI/ISBN apenas quando confiante

## Funcionalidades

### ✅ Geração de Mapas

- Múltiplos providers (OpenAI, Anthropic, Ollama, Custom)
- Timeout de 20s com 1 retry
- Validação rigorosa
- Deduplicação automática
- Auto-bridges para conectividade

### ✅ Visualização

- Nós coloridos por cluster
- Bridges com halo branco
- Linhas de fuga em magenta
- Labels inteligentes
- Seleção com destaque

### ✅ Layout

- Inicialização por cluster (círculo)
- Force-directed (200-500 iterações)
- Living Layout (breathing animation)
- Repulsão + spring + gravity
- Damping e bounds

### ✅ Navegação

- Clique para selecionar nó
- Node Inspector com detalhes
- Navegação por conexões
- Copy to clipboard (queries)

### ✅ Cache

- LocalStorage automático
- Key por (query + size + style)
- Últimos 12 mapas
- Load instantâneo

## Performance

- Force layout: ~200-500 iter em < 1s
- Living layout: 60fps
- Geração: ~5-15s (depende do LLM)
- Cache: localStorage (~5-10MB)
- Max visible links: 160

## Segurança

- API keys nunca enviadas a terceiros
- Processamento local
- Sem tracking
- localStorage para cache
- Suporte a proxy/backend

## Troubleshooting

Veja [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md) para resolução de problemas comuns.

## Documentação Adicional

- [QUICKSTART.md](./QUICKSTART.md) — Guia de início rápido
- [DEV_REFERENCE.md](./DEV_REFERENCE.md) — Referência para desenvolvedores
- [STATUS.md](../../STATUS.md) — Status de implementação
- [CHANGELOG.md](../../CHANGELOG_RHIZOME_SEARCH.md) — Histórico de mudanças

---

**Versão**: 1.0.0  
**Status**: ✅ Production Ready  
**Data**: 2026-02-22
