// ── Rhizome Search — JSON Schema & Validation ───────────────────────────────────

import type {
  KnowledgeMap, KnowledgeNode, KnowledgeEdge, KnowledgeCluster,
  BibliographyEntry, NodeInspectorData, MapSize, OutputStyle,
} from './types';

// ── System Prompt ─────────────────────────────────────────────────────────────
export const RHIZOME_SEARCH_SYSTEM_PROMPT = `You are a knowledge map generator that outputs ONLY valid JSON.

Your task is to create RHIZOMATIC knowledge maps: multiple entries, cross-cluster bridges, no single tree hierarchy.

CRITICAL RULES:
1. DO NOT invent bibliography as fact. If uncertain, mark needs_verification=true and use low confidence.
2. ALWAYS provide search_queries (this is the real "link" for research).
3. Bibliography fields can be null.
4. Relation strings should be concise: "influences", "contrasts", "method_for", "example_of", "bridges", etc.

OUTPUT: Return ONLY the JSON object, no markdown, no explanation.`;

// ── User Prompt Template ──────────────────────────────────────────────────────
export function buildUserPrompt(
  query: string,
  nodeCount: number,
  outputStyle: string
): string {
  return `Generate a rhizomatic knowledge map for the following query:

QUERY: ${query}

PARAMETERS:
- Target nodes: ${nodeCount}
- Output style: ${outputStyle}

REQUIREMENTS:
1. Create a RHIZOMATIC structure:
   - Multiple entry points (no single root)
   - Cross-cluster bridges (nodes connecting 3+ clusters)
   - Long-distance edges (is_long=true) between different clusters
2. Include:
   - Core concepts
   - Sub-themes and methods
   - Tensions/critiques
   - Interdisciplinary bridges
3. Create sufficient edges to form readable clusters AND bridges
4. Mark edges connecting different clusters as is_long=true
5. Identify nodes that bridge 3+ clusters (put their IDs in the "bridges" array)
6. Suggest recommended_presets for the Rhizome renderer (visual only, not structural)

Return ONLY the JSON object matching this schema:

{
  "title": "string (concise title for this map)",
  "summary": "string (1-2 lines describing the map)",
  "nodes": [
    {
      "id": "string (unique identifier, e.g., 'node_1')",
      "label": "string (concept/person/work/method name)",
      "type": "concept|person|work|method|discipline",
      "cluster": "string (e.g., 'cybernetics', 'psychoanalysis')",
      "importance": "number (0..1)",
      "keywords": ["string", "..."] // 3-8 keywords,
      "inspector": {
        "bullets": ["string", "string", "string"], // exactly 3 bullets
        "connections": ["node_id_1", "..."], // 3-8 related node IDs
        "search_queries": ["string", "..."], // 5-10 research queries
        "bibliography": [
          {
            "title": "string",
            "author": "string or null",
            "year": "number or null",
            "doi_or_isbn": "string or null",
            "confidence": "number (0..1)",
            "needs_verification": "boolean (true if uncertain)"
          }
        ]
      }
    }
  ],
  "edges": [
    {
      "source": "string (node id)",
      "target": "string (node id)",
      "weight": "number (0..1)",
      "relation": "string (concise)",
      "is_long": "boolean (true if cross-cluster)"
    }
  ],
  "clusters": [
    {
      "id": "string (e.g., 'cluster_1')",
      "label": "string (e.g., 'Cybernetics')",
      "colorHint": "string (hex color, e.g., '#7c3aed')",
      "description": "string (1 line)"
    }
  ],
  "bridges": ["node_id_1", "..."], // IDs of nodes connecting 3+ clusters
  "recommended_presets": {
    "visibility": "number (0..1)",
    "noise": "number (0..1)",
    "territorializacao": "number (0..1)",
    "reterritorializacao": "number (0..1)",
    "linhasDeFuga": "number (0..1)",
    "hubs": "number (0..1)",
    "esquecimento": "number (0..1)"
  }
}`;
}

// ── Validation ────────────────────────────────────────────────────────────────
export function validateKnowledgeMap(raw: any): KnowledgeMap {
  // Type checks
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid response: not an object');
  }

  if (typeof raw.title !== 'string') {
    throw new Error('Invalid response: title must be a string');
  }

  if (typeof raw.summary !== 'string') {
    throw new Error('Invalid response: summary must be a string');
  }

  if (!Array.isArray(raw.nodes)) {
    throw new Error('Invalid response: nodes must be an array');
  }

  if (!Array.isArray(raw.edges)) {
    throw new Error('Invalid response: edges must be an array');
  }

  if (!Array.isArray(raw.clusters)) {
    throw new Error('Invalid response: clusters must be an array');
  }

  // Validate nodes
  const validNodes: KnowledgeNode[] = raw.nodes.map((node: any, idx: number) => {
    if (typeof node !== 'object' || node === null) {
      throw new Error(`Invalid node at index ${idx}: not an object`);
    }

    if (typeof node.id !== 'string') {
      throw new Error(`Invalid node at index ${idx}: id must be a string`);
    }

    if (typeof node.label !== 'string') {
      throw new Error(`Invalid node at index ${idx}: label must be a string`);
    }

    if (!['concept', 'person', 'work', 'method', 'discipline'].includes(node.type)) {
      throw new Error(`Invalid node at index ${idx}: type must be one of concept/person/work/method/discipline`);
    }

    if (typeof node.cluster !== 'string') {
      throw new Error(`Invalid node at index ${idx}: cluster must be a string`);
    }

    if (typeof node.importance !== 'number' || node.importance < 0 || node.importance > 1) {
      throw new Error(`Invalid node at index ${idx}: importance must be a number between 0 and 1`);
    }

    if (!Array.isArray(node.keywords)) {
      throw new Error(`Invalid node at index ${idx}: keywords must be an array`);
    }

    // Validate inspector
    const inspector = node.inspector;
    if (typeof inspector !== 'object' || inspector === null) {
      throw new Error(`Invalid node at index ${idx}: inspector must be an object`);
    }

    if (!Array.isArray(inspector.bullets) || inspector.bullets.length !== 3) {
      throw new Error(`Invalid node at index ${idx}: inspector.bullets must be an array of exactly 3 strings`);
    }

    if (!Array.isArray(inspector.connections)) {
      throw new Error(`Invalid node at index ${idx}: inspector.connections must be an array`);
    }

    if (!Array.isArray(inspector.search_queries)) {
      throw new Error(`Invalid node at index ${idx}: inspector.search_queries must be an array`);
    }

    if (!Array.isArray(inspector.bibliography)) {
      throw new Error(`Invalid node at index ${idx}: inspector.bibliography must be an array`);
    }

    // Validate bibliography entries
    const validBibliography: BibliographyEntry[] = inspector.bibliography.map((entry: any, bibIdx: number) => {
      if (typeof entry !== 'object' || entry === null) {
        throw new Error(`Invalid bibliography entry at node ${idx}, entry ${bibIdx}`);
      }

      return {
        title: String(entry.title || ''),
        author: entry.author !== null && entry.author !== undefined ? String(entry.author) : null,
        year: typeof entry.year === 'number' ? entry.year : null,
        doi_or_isbn: entry.doi_or_isbn !== null && entry.doi_or_isbn !== undefined ? String(entry.doi_or_isbn) : null,
        confidence: typeof entry.confidence === 'number' ? Math.max(0, Math.min(1, entry.confidence)) : 0.5,
        needs_verification: Boolean(entry.needs_verification),
      };
    });

    const validInspector: NodeInspectorData = {
      bullets: inspector.bullets.map((b: any) => String(b)),
      connections: inspector.connections.map((c: any) => String(c)),
      search_queries: inspector.search_queries.map((q: any) => String(q)),
      bibliography: validBibliography,
    };

    return {
      id: node.id,
      label: node.label,
      type: node.type,
      cluster: node.cluster,
      importance: node.importance,
      keywords: node.keywords.map((k: any) => String(k)),
      inspector: validInspector,
    };
  });

  // Validate edges
  const validEdges: KnowledgeEdge[] = raw.edges.map((edge: any, idx: number) => {
    if (typeof edge !== 'object' || edge === null) {
      throw new Error(`Invalid edge at index ${idx}: not an object`);
    }

    if (typeof edge.source !== 'string') {
      throw new Error(`Invalid edge at index ${idx}: source must be a string`);
    }

    if (typeof edge.target !== 'string') {
      throw new Error(`Invalid edge at index ${idx}: target must be a string`);
    }

    return {
      source: edge.source,
      target: edge.target,
      weight: typeof edge.weight === 'number' ? Math.max(0, Math.min(1, edge.weight)) : 0.5,
      relation: String(edge.relation || 'related'),
      is_long: Boolean(edge.is_long),
    };
  });

  // Validate clusters
  const validClusters: KnowledgeCluster[] = raw.clusters.map((cluster: any, idx: number) => {
    if (typeof cluster !== 'object' || cluster === null) {
      throw new Error(`Invalid cluster at index ${idx}: not an object`);
    }

    return {
      id: String(cluster.id || `cluster_${idx}`),
      label: String(cluster.label || `Cluster ${idx}`),
      colorHint: String(cluster.colorHint || '#7c3aed'),
      description: String(cluster.description || ''),
    };
  });

  // Validate bridges
  const validBridges: string[] = Array.isArray(raw.bridges) ? raw.bridges.map((b: any) => String(b)) : [];

  // Validate recommended_presets
  const presets = raw.recommended_presets || {};
  const validPresets = {
    visibility: typeof presets.visibility === 'number' ? presets.visibility : 0.5,
    noise: typeof presets.noise === 'number' ? presets.noise : 0.3,
    territorializacao: typeof presets.territorializacao === 'number' ? presets.territorializacao : 0.5,
    reterritorializacao: typeof presets.reterritorializacao === 'number' ? presets.reterritorializacao : 0.3,
    linhasDeFuga: typeof presets.linhasDeFuga === 'number' ? presets.linhasDeFuga : 0.4,
    hubs: typeof presets.hubs === 'number' ? presets.hubs : 0.6,
    esquecimento: typeof presets.esquecimento === 'number' ? presets.esquecimento : 0.2,
  };

  // Construct final map
  const map: KnowledgeMap = {
    title: raw.title,
    summary: raw.summary,
    nodes: validNodes,
    edges: validEdges,
    clusters: validClusters,
    bridges: validBridges,
    recommended_presets: validPresets,
    generatedAt: Date.now(),
    query: '',
    mapSize: 'medium',
    outputStyle: 'balanced',
  };

  return map;
}
