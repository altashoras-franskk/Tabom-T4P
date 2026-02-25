// ── Rhizome LLM Service — Epistemological Rhizome Generator ──────────────────
//
// ARCHITECTURE NOTE:
// This module integrates a real LLM (OpenAI / Anthropic / Ollama / Custom).
// The LLM transforms any knowledge domain into a navigable rhizome network.
//
// API KEY: Set VITE_RHIZOME_LLM_API_KEY or VITE_OPENAI_API_KEY in .env
// ─────────────────────────────────────────────────────────────────────────────

import type {
  LLMRhizomeRequest, LLMRhizomeResponse, LLMNodeDef, LLMDepth, LLMMode,
  LLMEdgeDef, EdgeRelation,
} from './rhizomeTypes';
import type { RhizomeState } from './rhizomeTypes';
import { CANVAS_PAD, MAX_NODES } from './rhizomeTypes';
import type { RhizomeNode } from './rhizomeTypes';

// ── Prompt Templates per Mode ────────────────────────────────────────────────

/** DEFAULT — mixed concepts + people */
export const RHIZOME_PROMPT_TEMPLATE = `
You are an epistemological cartographer building a RHIZOMATIC knowledge graph. Given the topic "{TOPIC}", generate a map with {COUNT} nodes.
Depth level: {DEPTH} (shallow=key concepts only, medium=includes sub-concepts and people, deep=includes edge cases, controversies, and peripheral thinkers).

Return a JSON array of node objects with this EXACT structure:
[
  {
    "label": "ConceptOrPersonName",
    "description": "One-sentence description of this concept or person and their relation to the topic",
    "category": "CategoryName",
    "isEntry": true,
    "relevance": 0.95,
    "popularity": 0.80,
    "directLink": true,
    "connections": ["OtherConceptLabel", ...],
    "typedEdges": [
      { "target": "OtherConceptLabel", "strength": 0.85, "relation": "influences" },
      { "target": "AnotherConcept",    "strength": 0.40, "relation": "contrasts" }
    ]
  }
]

EDGE RELATION TYPES (use exactly these strings):
- "influences" — A shaped B's thinking or development
- "contrasts" — A opposes, tensions with, or challenges B
- "bridges" — A connects disparate domains (LINE OF FLIGHT — cross-cluster unexpected link)
- "extends" — A builds upon or develops from B
- "contains" — A subsumes or includes B
- "co_occurs" — A and B frequently appear together in discourse
- "method_for" — A is a methodology used to study/approach B
- "example_of" — A is an instance or case study of B
- "critiques" — A fundamentally challenges B's premises
- "related" — generic semantic proximity

FIELD RULES:
- label: short (1-4 words). Include PEOPLE (thinkers, artists, scientists) by name.
- description: one sentence, factual, no invented bibliography
- category: group into 3-6 thematic categories
- relevance: 0..1 — how central to "{TOPIC}" (1.0=core, 0.1=tangential). A concept that appears in many discussions of this topic should have HIGH relevance.
- popularity: 0..1 — cultural/academic prominence (1.0=extremely well-known)
- directLink: true if directly connected to the central topic
- isEntry: mark 3-5 nodes as true (main entry points to navigate the map)
- connections: 2-6 other node labels (MUST be meaningful semantic connections, never random)
- typedEdges: for EACH connection, specify the target label, connection strength (0..1), and relation type. Strength should reflect how tightly coupled the concepts are in real academic/intellectual discourse.

STRUCTURAL RULES:
1. Ensure the network is FULLY CONNECTED (no isolated nodes)
2. Include at least 2-3 BRIDGE edges (relation="bridges") connecting different categories — these are LINES OF FLIGHT
3. Connection strength should vary meaningfully: core relationships = 0.7-1.0, peripheral = 0.2-0.5
4. If a concept is referenced by MANY other nodes, it should have HIGH relevance (it's a hub)
5. Create real CLUSTERS via category — nodes in the same category should be more densely connected

Return ONLY the JSON array, no other text.
`.trim();

/** NAMES ONLY — only researchers/thinkers/people */
const PROMPT_NAMES_ONLY = `
You are an academic genealogist. For the topic "{TOPIC}", list {COUNT} key PEOPLE — researchers, thinkers, artists, scientists, philosophers, and activists — directly associated with this field.
Depth: {DEPTH}.

Return a JSON array:
[
  {
    "label": "Person Name",
    "description": "One sentence: who they are and their contribution to {TOPIC}",
    "category": "their field or school (e.g. 'critical theory', 'biology', 'art')",
    "isEntry": true/false,
    "relevance": 0.0-1.0,
    "popularity": 0.0-1.0,
    "directLink": true/false,
    "connections": ["Name of intellectual influence or collaborator", ...],
    "typedEdges": [
      { "target": "Other Person", "strength": 0.85, "relation": "influences" },
      { "target": "Another Person", "strength": 0.60, "relation": "contrasts" }
    ]
  }
]

EDGE RELATION TYPES: "influences", "contrasts", "bridges", "extends", "co_occurs", "critiques", "related"

Rules:
- ONLY real people (no concepts, no movements as nodes)
- label = person's name (1-3 words)
- connections = other people in this list who influenced, collaborated, or debated with this person
- typedEdges: specify relationship TYPE and STRENGTH for each connection. Use "influences" for teacher→student, "contrasts" for intellectual opponents, "bridges" for cross-disciplinary links, "co_occurs" for collaborators
- isEntry = true for 3-5 most central figures
- relevance: if this person is cited/referenced by MANY others in this list, they should have HIGH relevance
- ensure all names are connected (no isolated people)

Return ONLY the JSON array.
`.trim();

/** PERSON THEORY — key concepts, books, terms from ONE specific thinker */
const PROMPT_PERSON_THEORY = `
You are a philosophical cartographer specializing in the work of a single thinker.
Map the intellectual universe of "{TOPIC}" — their key concepts, major works, influences, and legacy — as {COUNT} nodes.
Depth: {DEPTH}.

Return a JSON array:
[
  {
    "label": "Concept or Book Title",
    "description": "One sentence: what this is within {TOPIC}'s thought",
    "category": "core concept / major work / influence / student/heir / debate",
    "isEntry": true/false,
    "relevance": 0.0-1.0,
    "popularity": 0.0-1.0,
    "directLink": true/false,
    "connections": ["Related concept or work", ...],
    "typedEdges": [
      { "target": "RelatedConcept", "strength": 0.90, "relation": "extends" },
      { "target": "InfluentialWork", "strength": 0.70, "relation": "contains" }
    ]
  }
]

EDGE RELATION TYPES: "influences", "contrasts", "bridges", "extends", "contains", "co_occurs", "method_for", "example_of", "critiques", "related"

Rules:
- Include: key concepts, book/article titles (short), people who influenced them, students/heirs
- isEntry = true for the 3-5 most central concepts
- typedEdges: specify how each concept RELATES to others. "extends" for developments, "contains" for subsumption, "influences" for genealogy, "bridges" for cross-domain leaps
- connections must be meaningful (not random)
- relevance: concepts that are referenced by MANY other nodes should have HIGH relevance
- label max 4 words

Return ONLY the JSON array.
`.trim();

/** STUDY ORDER — sequential learning path */
const PROMPT_STUDY_ORDER = `
You are a curriculum designer and expert in "{TOPIC}".
Create an optimal STUDY PATH of {COUNT} steps to master this topic from beginner to advanced.
Depth: {DEPTH}.

Return a JSON array ORDERED from first to last step:
[
  {
    "label": "Step Name",
    "description": "One sentence: what to study here and why it comes at this point",
    "category": "foundation / theory / method / advanced / practice",
    "isEntry": true/false,
    "relevance": 0.0-1.0,
    "popularity": 0.0-1.0,
    "directLink": true/false,
    "order": 1,
    "connections": ["Next step", "prerequisite step", ...],
    "typedEdges": [
      { "target": "Next Step", "strength": 0.90, "relation": "extends" },
      { "target": "Prerequisite", "strength": 0.80, "relation": "contains" }
    ]
  }
]

EDGE RELATION TYPES: "extends" (unlocks/builds-upon), "contains" (prerequisite), "bridges" (cross-domain leap), "co_occurs" (parallel study), "related"

Rules:
- order: integer starting at 1, increasing through the array
- The first 1-3 nodes are foundational (isEntry=true)
- connections should reflect prerequisites AND what this unlocks
- typedEdges: use "extends" for sequential progression, "contains" for prerequisites, "bridges" for unexpected cross-domain connections
- Each step connects to at least 2 others (prev/next or branching)
- label is a short name for this learning step

Return ONLY the JSON array.
`.trim();

/** CONTROVERSIES — debates, tensions, opposing schools */
const PROMPT_CONTROVERSIES = `
You are a scholar of academic disputes and intellectual history.
For "{TOPIC}", map the main CONTROVERSIES, tensions, competing schools, and unresolved debates as {COUNT} nodes.
Depth: {DEPTH}.

Return a JSON array:
[
  {
    "label": "Controversy or School Name",
    "description": "One sentence: what this debate or school is about",
    "category": "school / debate / tension / person / concept",
    "isEntry": true/false,
    "relevance": 0.0-1.0,
    "popularity": 0.0-1.0,
    "directLink": true/false,
    "connections": ["Opposing view", "related debate", ...],
    "typedEdges": [
      { "target": "Opposing School", "strength": 0.90, "relation": "contrasts" },
      { "target": "Related Debate", "strength": 0.60, "relation": "co_occurs" }
    ]
  }
]

EDGE RELATION TYPES: "contrasts" (opposition), "influences" (genealogy), "bridges" (cross-domain), "extends" (development), "critiques" (challenge), "co_occurs" (parallel), "related"

Rules:
- Include: opposing schools, key debates, contested figures, paradigm conflicts
- typedEdges: use "contrasts" for oppositions, "critiques" for challenges, "bridges" for surprising connections across domains, "influences" for genealogy of ideas
- connection strength should reflect intensity of the debate (0.9 = central dispute, 0.3 = tangential)
- isEntry = true for the 3-5 central fault lines
- Make tensions visible in the graph structure

Return ONLY the JSON array.
`.trim();

/** KEYWORDS — dense keyword cloud */
const PROMPT_KEYWORDS = `
You are a semantic indexer. For "{TOPIC}", generate a dense keyword/concept cloud of {COUNT} terms — the essential vocabulary to understand, search, and navigate this field.
Depth: {DEPTH}.

Return a JSON array:
[
  {
    "label": "Keyword",
    "description": "One sentence definition in context of {TOPIC}",
    "category": "term / method / entity / process / property",
    "isEntry": true/false,
    "relevance": 0.0-1.0,
    "popularity": 0.0-1.0,
    "directLink": true/false,
    "connections": ["Semantically related keyword", ...],
    "typedEdges": [
      { "target": "RelatedTerm", "strength": 0.80, "relation": "co_occurs" },
      { "target": "ParentConcept", "strength": 0.70, "relation": "contains" }
    ]
  }
]

EDGE RELATION TYPES: "co_occurs" (semantic proximity), "contains" (parent/child), "contrasts" (antonym/opposition), "extends" (specialization), "bridges" (cross-domain), "related"

Rules:
- labels are single words or short technical terms (1-2 words)
- connections = semantic proximity (synonyms, antonyms, parent/child concepts)
- typedEdges: use "co_occurs" for terms that frequently appear together, "contains" for hierarchy, "contrasts" for antonyms, "bridges" for cross-domain links
- strength should reflect co-occurrence frequency in academic literature (1.0 = always together, 0.2 = occasional)
- isEntry = true for 3-5 most fundamental terms
- high density: each node connects to 3-6 others

Return ONLY the JSON array.
`.trim();

function getPromptForMode(mode: LLMMode | undefined): string {
  switch (mode) {
    case 'names_only':    return PROMPT_NAMES_ONLY;
    case 'person_theory': return PROMPT_PERSON_THEORY;
    case 'study_order':   return PROMPT_STUDY_ORDER;
    case 'controversies': return PROMPT_CONTROVERSIES;
    case 'keywords':      return PROMPT_KEYWORDS;
    default:              return RHIZOME_PROMPT_TEMPLATE;
  }
}

// ── Mutable prompt map — editable at runtime via the Prompt Editor ────────────
export const PROMPT_MAP: Record<LLMMode, string> = {
  concepts:      RHIZOME_PROMPT_TEMPLATE,
  names_only:    PROMPT_NAMES_ONLY,
  person_theory: PROMPT_PERSON_THEORY,
  study_order:   PROMPT_STUDY_ORDER,
  controversies: PROMPT_CONTROVERSIES,
  keywords:      PROMPT_KEYWORDS,
};

/** Labels shown in the UI for each mode */
export const PROMPT_MODE_LABELS: Record<LLMMode, { icon: string; label: string; hint: string }> = {
  concepts:      { icon: '◈', label: 'Conceitos',    hint: 'Conceitos + pessoas misturados' },
  names_only:    { icon: '◉', label: 'Só Nomes',     hint: 'Apenas pesquisadores e pensadores' },
  person_theory: { icon: '◎', label: 'Teoria/Autor', hint: 'Conceitos, obras e legado de um autor' },
  study_order:   { icon: '▶', label: 'Ordem Estudo', hint: 'Caminho sequencial de aprendizado' },
  controversies: { icon: '⚡', label: 'Controvérsias', hint: 'Debates, tensões e escolas opostas' },
  keywords:      { icon: '⊞', label: 'Keywords',     hint: 'Vocabulário essencial denso' },
};

// ── Category color palette ────────────────────────────────────────────────────
export const CATEGORY_COLORS: Record<string, string> = {
  default:     '#00ff66',
  philosophy:  '#a78bfa',
  science:     '#38bdf8',
  mathematics: '#fb923c',
  history:     '#fbbf24',
  art:         '#f472b6',
  politics:    '#4ade80',
  economics:   '#34d399',
  psychology:  '#c084fc',
  biology:     '#86efac',
  physics:     '#60a5fa',
  category0:   '#00ff66',
  category1:   '#a78bfa',
  category2:   '#38bdf8',
  category3:   '#fb923c',
  category4:   '#fbbf24',
  category5:   '#f472b6',
};

/** Get color for a category string */
export function getCategoryColor(category?: string): string {
  if (!category) return CATEGORY_COLORS.default;
  const lower = category.toLowerCase();
  for (const key of Object.keys(CATEGORY_COLORS)) {
    if (lower.includes(key)) return CATEGORY_COLORS[key];
  }
  // Hash-based fallback
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) & 0xffffff;
  const hue = (hash % 360);
  return `hsl(${hue},70%,60%)`;
}

// ── Resolve API key ───────────────────────────────────────────────────────────
function resolveApiKey(request: LLMRhizomeRequest): string | null {
  if (request.apiKey) return request.apiKey;
  if (import.meta.env.VITE_RHIZOME_LLM_API_KEY) return import.meta.env.VITE_RHIZOME_LLM_API_KEY;
  if (import.meta.env.VITE_OPENAI_API_KEY) return import.meta.env.VITE_OPENAI_API_KEY;
  if (typeof window !== 'undefined') {
    const cfg = (window as any).__APP_CONFIG__;
    if (cfg?.OPENAI_API_KEY) return cfg.OPENAI_API_KEY;
  }
  return null;
}

// ── OpenAI / Ollama / Custom API call ─────────────────────────────────────────
async function callOpenAICompatible(
  apiKey: string,
  baseURL: string,
  model: string,
  prompt: string,
  nodeCount = 20,
): Promise<string> {
  const controller = new AbortController();
  // Scale timeout with node count — big maps take longer
  const timeoutMs = Math.max(90000, nodeCount * 1800);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Scale max_tokens: ~280 tokens per node (JSON overhead + description)
  // gpt-4o-mini supports 16384 output tokens
  const maxTokens = Math.min(16000, Math.max(4000, nodeCount * 300));

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    let msg = `API error (${response.status})`;
    try {
      const err = await response.json();
      if (err.error?.message) msg = err.error.message;
    } catch { /* ignore */ }
    if (response.status === 401) throw new Error('API key inválida. Verifique a chave em Settings.');
    if (response.status === 429) throw new Error('Limite de requisições excedido. Aguarde.');
    throw new Error(msg);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Resposta vazia da API.');
  return content;
}

// ── Anthropic API call ────────────────────────────────────────────────────────
async function callAnthropic(
  apiKey: string,
  model: string,
  prompt: string,
  nodeCount = 20,
): Promise<string> {
  const controller = new AbortController();
  const timeoutMs = Math.max(90000, nodeCount * 1800);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // claude-3-5-haiku supports 8192 output tokens; claude-3-5-sonnet supports 8192 too
  const maxTokens = Math.min(8000, Math.max(4000, nodeCount * 280));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    let msg = `Anthropic API error (${response.status})`;
    try {
      const err = await response.json();
      if (err.error?.message) msg = err.error.message;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error('Resposta vazia da API Anthropic.');
  return content;
}

// ── OpenAI streaming + real-time node extraction ──────────────────────────────
// Fires onNode(def) for each complete JSON object extracted from the SSE stream.
// Nodes arrive seconds before the full response is done — dramatic UX improvement.
async function callOpenAIStreamingExtract(
  apiKey: string,
  baseURL: string,
  model: string,
  prompt: string,
  nodeCount: number,
  onNode: (def: LLMNodeDef) => void,
): Promise<void> {
  const maxTokens = Math.min(16000, Math.max(4000, nodeCount * 300));
  const timeoutMs = Math.max(90000, nodeCount * 1800);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
      stream: true,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    let msg = `API error (${response.status})`;
    try { const e = await response.json(); if (e.error?.message) msg = e.error.message; } catch {}
    if (response.status === 401) throw new Error('API key inválida. Verifique a chave em Settings.');
    if (response.status === 429) throw new Error('Limite de requisições excedido. Aguarde.');
    throw new Error(msg);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';       // accumulated response text
  let nodesExtracted = 0; // how many objects already emitted

  // Depth-aware brace scanner — extracts complete top-level JSON objects from partial text.
  function tryExtractNew(): void {
    let pos = 0;
    let found = 0;
    while (pos < buffer.length) {
      const start = buffer.indexOf('{', pos);
      if (start === -1) break;
      let depth = 0, end = -1, inStr = false, esc = false;
      for (let i = start; i < buffer.length; i++) {
        const c = buffer[i];
        if (esc)          { esc = false; continue; }
        if (c === '\\' && inStr) { esc = true; continue; }
        if (c === '"')    { inStr = !inStr; continue; }
        if (inStr) continue;
        if (c === '{') depth++;
        if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end === -1) break; // object not yet complete
      found++;
      if (found > nodesExtracted) {
        try {
          const obj = JSON.parse(buffer.slice(start, end + 1));
          if (obj && typeof obj.label === 'string' && obj.label.trim()) {
            nodesExtracted++;
            onNode({
              label:       String(obj.label).trim(),
              description: obj.description ? String(obj.description) : undefined,
              category:    obj.category   ? String(obj.category).toLowerCase() : 'default',
              isEntry:     Boolean(obj.isEntry),
              connections: Array.isArray(obj.connections)
                ? obj.connections.filter((c: any) => typeof c === 'string').map((c: any) => String(c).trim())
                : [],
              typedEdges:  parseTypedEdges(obj.typedEdges),
              relevance:  typeof obj.relevance  === 'number' ? Math.max(0, Math.min(1, obj.relevance))  : 0.5,
              popularity: typeof obj.popularity === 'number' ? Math.max(0, Math.min(1, obj.popularity)) : 0.5,
              directLink: Boolean(obj.directLink ?? obj.isEntry),
            });
          }
        } catch { /* malformed partial — skip */ }
      }
      pos = end + 1;
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      for (const line of text.split('\n')) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const payload = t.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const chunk = JSON.parse(payload);
          const delta = chunk.choices?.[0]?.delta?.content ?? '';
          buffer += delta;
          tryExtractNew();
        } catch { /* incomplete SSE frame */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── Valid edge relation types ──────────────────────────────────────────────────
const VALID_RELATIONS: Set<string> = new Set([
  'influences', 'contrasts', 'bridges', 'extends', 'contains',
  'co_occurs', 'method_for', 'example_of', 'critiques', 'related',
]);

// ── Parse typed edges from LLM response ──────────────────────────────────────
function parseTypedEdges(raw: any): LLMEdgeDef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const edges: LLMEdgeDef[] = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object' || typeof e.target !== 'string') continue;
    const relation = VALID_RELATIONS.has(e.relation) ? e.relation as EdgeRelation : 'related';
    const strength = typeof e.strength === 'number' ? Math.max(0, Math.min(1, e.strength)) : 0.5;
    edges.push({ target: e.target.trim(), strength, relation });
  }
  return edges.length > 0 ? edges : undefined;
}

// ── Frequency-based relevance post-processing ────────────────────────────────
// Counts how many times each label is referenced across ALL nodes' connections
// and typedEdges. The more a concept is cited by others, the higher its real
// importance (hub detection from actual data, not random).
export function computeFrequencyRelevance(defs: LLMNodeDef[]): void {
  const mentionCounts = new Map<string, number>();

  for (const def of defs) {
    for (const conn of def.connections) {
      const key = conn.toLowerCase();
      mentionCounts.set(key, (mentionCounts.get(key) || 0) + 1);
    }
    if (def.typedEdges) {
      for (const edge of def.typedEdges) {
        const key = edge.target.toLowerCase();
        mentionCounts.set(key, (mentionCounts.get(key) || 0) + 1);
      }
    }
  }

  const maxMentions = Math.max(...Array.from(mentionCounts.values()), 1);

  for (const def of defs) {
    const key = def.label.toLowerCase();
    const mentions = mentionCounts.get(key) || 0;
    def.mentionCount = mentions;

    const freqScore = mentions / maxMentions;
    const llmRelevance = def.relevance ?? 0.5;

    // Blend: 40% LLM judgment + 40% cross-reference frequency + 20% entry bonus
    def.computedRelevance = Math.min(1, (
      llmRelevance * 0.40 +
      freqScore    * 0.40 +
      (def.isEntry ? 0.20 : 0)
    ));

    def.relevance = def.computedRelevance;
  }
}

// ── Parse JSON node defs from raw LLM text ────────────────────────────────────
// Handles markdown fences, preamble text, and partial JSON gracefully.
function parseNodeDefs(raw: string): LLMNodeDef[] {
  // Strip markdown code fences if present
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1].trim();

  // Find first '[' and last ']' — the JSON array
  const start = text.indexOf('[');
  const end   = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Nenhum array JSON encontrado na resposta.');
  }
  text = text.slice(start, end + 1);

  let arr: any[];
  try {
    arr = JSON.parse(text);
  } catch {
    // Try to extract as many complete objects as possible
    arr = [];
    const re = /\{[\s\S]*?\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      try { arr.push(JSON.parse(m[0])); } catch { /* skip malformed */ }
    }
  }

  if (!Array.isArray(arr)) throw new Error('Resposta não é um array JSON.');

  return arr
    .filter((o: any) => o && typeof o.label === 'string' && o.label.trim())
    .map((o: any): LLMNodeDef => ({
      label:       String(o.label).trim(),
      description: o.description ? String(o.description) : undefined,
      category:    o.category    ? String(o.category).toLowerCase() : 'default',
      isEntry:     Boolean(o.isEntry),
      connections: Array.isArray(o.connections)
        ? o.connections.filter((c: any) => typeof c === 'string').map((c: any) => String(c).trim())
        : [],
      typedEdges:  parseTypedEdges(o.typedEdges),
      relevance:  typeof o.relevance  === 'number' ? Math.max(0, Math.min(1, o.relevance))  : 0.5,
      popularity: typeof o.popularity === 'number' ? Math.max(0, Math.min(1, o.popularity)) : 0.5,
      directLink: Boolean(o.directLink ?? o.isEntry),
      order:      typeof o.order === 'number' ? o.order : undefined,
    }));
}

// ── Streaming generation — fires onNode as each concept is extracted ──────────
// For OpenAI/Ollama/Custom: uses SSE streaming so first nodes arrive in ~1s.
// For Anthropic: falls back to batch (Anthropic SSE has different format).
export async function generateLLMRhizomeStreaming(
  request:  LLMRhizomeRequest,
  onNode:   (def: LLMNodeDef, index: number) => void,
  onDone:   (total: number) => void,
): Promise<void> {
  const apiKey = resolveApiKey(request);

  if (!apiKey) {
    // Demo stub — simulate streaming pacing
    const stub = generateDemoStub(request);
    for (let i = 0; i < stub.nodes.length; i++) {
      await new Promise<void>(r => setTimeout(r, 80));
      onNode(stub.nodes[i], i);
    }
    onDone(stub.nodes.length);
    return;
  }

  const promptTemplate = getPromptForMode(request.llmMode);
  const prompt = promptTemplate
    .replace(/{TOPIC}/g, request.topic)
    .replace('{COUNT}', String(request.nodeCount))
    .replace('{DEPTH}', request.depth);

  let index = 0;
  const handle = (def: LLMNodeDef) => onNode(def, index++);

  try {
    if (request.provider === 'anthropic') {
      const model = request.modelId || 'claude-3-5-haiku-20241022';
      const raw = await callAnthropic(apiKey, model, prompt, request.nodeCount);
      for (const def of parseNodeDefs(raw)) handle(def);
    } else {
      const isOllama = request.provider === 'ollama';
      const baseURL = isOllama
        ? 'http://localhost:11434/v1'
        : (import.meta.env.VITE_RHIZOME_LLM_BASE_URL || 'https://api.openai.com/v1');
      const model = request.modelId || (isOllama ? 'llama3.2' : 'gpt-4o-mini');
      await callOpenAIStreamingExtract(
        isOllama ? (apiKey || 'ollama') : apiKey,
        baseURL, model, prompt, request.nodeCount, handle,
      );
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError')
      throw new Error('Timeout. Tente um mapa menor.');
    if (err instanceof Error && err.message.includes('Failed to fetch'))
      throw new Error('Erro de conexão. Verifique sua internet e a chave de API.');
    throw err;
  }

  onDone(index);
}

// ── Inject a single LLM node synchronously (used by streaming injection) ──────
export function injectSingleLLMNode(
  state:         RhizomeState,
  def:           LLMNodeDef,
  nodeIndex:     number,        // sequence index (for golden-angle spiral)
  totalExpected: number,        // expected total (for radial spread)
  W: number, H: number,
  anchorId?:     number,
  centerX?:      number,        // inject around this point (default: canvas centre)
  centerY?:      number,
  labelMap?:     Map<string, RhizomeNode>,
  categoryAngleMap?: Map<string, number>,  // category → base angle for clustering
): RhizomeNode | null {
  if (state.nodes.length >= MAX_NODES) return null;

  // ── DEDUPLICATION: if a node with this label already exists, just wire connections ──
  if (labelMap?.has(def.label)) {
    const existing = labelMap.get(def.label)!;
    // Wire any new connections from this def to the existing node
    if (def.connections && labelMap) {
      for (const tl of def.connections) {
        const nb = labelMap.get(tl);
        if (nb && nb.id !== existing.id && !existing.connections.has(nb.id)) {
          const w = 0.35 + Math.random() * 0.30;
          existing.connections.set(nb.id, w);
          nb.connections.set(existing.id, w);
        }
      }
    }
    return existing;
  }

  const margin     = 55;
  const cx         = centerX ?? W * 0.5;
  const cy         = centerY ?? H * 0.5;
  const minDim     = Math.min(W, H);
  const relevance  = def.relevance  ?? (def.isEntry ? 0.85 : 0.5);
  const popularity = def.popularity ?? 0.5;
  const isExpand   = centerX !== undefined; // tighter rings when expanding a single node

  // ── CATEGORY-BASED CLUSTERING ─────────────────────────────────────────────
  // Each unique category gets a deterministic angular sector.
  // Nodes of the same category are placed in the same angular neighborhood,
  // creating natural clusters rather than a uniform spiral.
  let baseAngle: number;

  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ≈ 2.3998 rad

  if (def.category && def.category !== 'default' && categoryAngleMap) {
    if (!categoryAngleMap.has(def.category)) {
      // Spread categories evenly around the circle, not golden-angle
      // With N categories, each gets 2π/N radians of arc
      const sectorIndex = categoryAngleMap.size;
      const maxCategories = Math.max(6, categoryAngleMap.size + 3);
      categoryAngleMap.set(def.category, (sectorIndex / maxCategories) * Math.PI * 2);
    }
    const sectorAngle = categoryAngleMap.get(def.category)!;

    const siblingCount = state.nodes.filter(n => n.category === def.category).length;

    // Tighter sub-spiral within each category's sector
    const subAngle = siblingCount * goldenAngle;
    const sectorSpread = 0.35;
    baseAngle = sectorAngle + subAngle * sectorSpread + (Math.random() - 0.5) * 0.12;
  } else {
    baseAngle = nodeIndex * goldenAngle + (Math.random() - 0.5) * 0.18;
  }

  const minRing    = isExpand ? 0.12 : 0.18;
  const maxRing    = isExpand ? 0.40 : 0.52;
  const spiralT    = totalExpected > 1 ? Math.sqrt(nodeIndex / (totalExpected - 1)) : 0.5;
  const ringFactor = minRing + spiralT * (maxRing - minRing) + (0.5 - relevance) * 0.10;
  const radius     = minDim * Math.min(maxRing, Math.max(minRing, ringFactor))
                   + (Math.random() - 0.5) * (minDim * 0.06);

  const x = Math.max(margin, Math.min(W - margin, cx + Math.cos(baseAngle) * radius));
  const y = Math.max(margin, Math.min(H - margin, cy + Math.sin(baseAngle) * radius));

  const node: RhizomeNode = {
    id:    state.nextId++,
    x, y,
    vx:    (Math.random() - 0.5) * 10,
    vy:    (Math.random() - 0.5) * 10,
    heat:  0.55 + popularity * 0.45,
    isEntry:  def.isEntry ?? false,
    age:   0,
    connections: new Map(),
    label: def.label,
    description:       def.description,
    connectionsLabels: def.connections,
    category:          def.category,
    relevance:         relevance,   // stored — engine uses for visual size
    popularity:        popularity,  // stored — drives heat/brightness
    userPlaced: false,
  };

  state.nodes.push(node);

  // Build a lookup from typedEdges for semantic edge data
  const edgeLookup = new Map<string, LLMEdgeDef>();
  if (def.typedEdges) {
    for (const te of def.typedEdges) {
      edgeLookup.set(te.target.toLowerCase(), te);
    }
  }

  if (labelMap) {
    labelMap.set(def.label, node);
    if (def.connections) {
      for (const tl of def.connections) {
        const nb = labelMap.get(tl);
        if (nb && nb.id !== node.id && !node.connections.has(nb.id)) {
          // Use typed edge strength if available, otherwise fallback
          const typed = edgeLookup.get(tl.toLowerCase());
          const w = typed ? typed.strength : (0.35 + Math.random() * 0.30);
          node.connections.set(nb.id, w);
          nb.connections.set(node.id, w);

          // Store edge type metadata
          if (typed) {
            if (!node.edgeTypes) node.edgeTypes = new Map();
            if (!nb.edgeTypes) nb.edgeTypes = new Map();
            node.edgeTypes.set(nb.id, typed.relation);
            nb.edgeTypes.set(node.id, typed.relation);
          }
        }
      }
    }
  }

  // Selective anchor bond — only isEntry nodes (not all directLink)
  // to prevent star topology where anchor connects to everything
  if (anchorId !== undefined) {
    const anchor = state.nodes.find(n => n.id === anchorId);
    if (anchor && !node.connections.has(anchorId)) {
      const isEntry = def.isEntry ?? false;
      if (isEntry) {
        const w = 0.35 + relevance * 0.15;
        node.connections.set(anchorId, w);
        anchor.connections.set(node.id, w);
      }
      // Non-entry nodes rely on label-matched connections only — no anchor pull
    }
  }

  return node;
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function generateLLMRhizome(
  request: LLMRhizomeRequest,
): Promise<LLMRhizomeResponse> {
  const apiKey = resolveApiKey(request);

  // If no API key, use demo stub data
  if (!apiKey) {
    await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
    return generateDemoStub(request);
  }

  const promptTemplate = getPromptForMode(request.llmMode);
  const prompt = promptTemplate
    .replace(/{TOPIC}/g, request.topic)
    .replace('{COUNT}', String(request.nodeCount))
    .replace('{DEPTH}', request.depth);

  let rawText: string;

  try {
    if (request.provider === 'anthropic') {
      const model = request.modelId || 'claude-3-5-haiku-20241022';
      rawText = await callAnthropic(apiKey, model, prompt, request.nodeCount);
    } else if (request.provider === 'ollama') {
      // Ollama uses OpenAI-compatible API on localhost
      const baseURL = 'http://localhost:11434/v1';
      const model = request.modelId || 'llama3.2';
      rawText = await callOpenAICompatible(apiKey || 'ollama', baseURL, model, prompt, request.nodeCount);
    } else if (request.provider === 'custom') {
      // Custom endpoint — expects VITE_RHIZOME_LLM_BASE_URL
      const baseURL = import.meta.env.VITE_RHIZOME_LLM_BASE_URL || 'https://api.openai.com/v1';
      const model = request.modelId || 'gpt-4o-mini';
      rawText = await callOpenAICompatible(apiKey, baseURL, model, prompt, request.nodeCount);
    } else {
      // Default: OpenAI
      const baseURL = import.meta.env.VITE_RHIZOME_LLM_BASE_URL || 'https://api.openai.com/v1';
      const model = request.modelId || 'gpt-4o-mini';
      rawText = await callOpenAICompatible(apiKey, baseURL, model, prompt, request.nodeCount);
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Timeout: A requisição demorou muito (>90s). Tente um mapa menor.');
    }
    if (err instanceof Error && err.message.includes('Failed to fetch')) {
      throw new Error('Erro de conexão. Verifique sua internet e a chave de API.');
    }
    throw err;
  }

  let nodes: LLMNodeDef[];
  try {
    nodes = parseNodeDefs(rawText);
  } catch (err) {
    throw new Error(`Falha ao interpretar resposta da LLM: ${(err as Error).message}`);
  }

  if (nodes.length === 0) {
    throw new Error('A LLM retornou zero nós. Tente reformular o tópico.');
  }

  // Post-process: compute frequency-based relevance from cross-references
  computeFrequencyRelevance(nodes);

  return {
    nodes,
    title: request.topic,
    description: `Mapa rizomático de "${request.topic}" — ${nodes.length} conceitos gerados.`,
    generatedAt: Date.now(),
  };
}

// ── Demo stub (shown when no API key is configured) ───────────────────────────
function generateDemoStub(request: LLMRhizomeRequest): LLMRhizomeResponse {
  const topic = request.topic.toLowerCase();
  let nodes: LLMNodeDef[];

  if (topic.includes('deleuze') || topic.includes('guattari') ||
      topic.includes('rizoma') || topic.includes('rhizome')) {
    nodes = STUB_DELEUZE.slice(0, Math.min(request.nodeCount, STUB_DELEUZE.length));
  } else {
    // Generic demo with topic name
    const count = Math.min(request.nodeCount, 16);
    const categories = ['conceptual', 'methodological', 'historical', 'applied', 'theoretical'];
    nodes = Array.from({ length: count }, (_, i) => ({
      label: i === 0 ? request.topic : `${request.topic} ${['fundamentos', 'contexto', 'método', 'prática', 'teoria', 'história', 'crítica', 'extensões', 'variantes', 'debates', 'aplicações', 'influências', 'correntes', 'escolas', 'obras'][i] || `Nó ${i}`}`,
      isEntry: i < 4,
      category: categories[i % categories.length],
      connections: i === 0
        ? Array.from({ length: Math.min(4, count - 1) }, (_, j) => `${request.topic} ${['fundamentos', 'contexto', 'método', 'prática', 'teoria'][j]}`)
        : [request.topic, i > 1 ? `${request.topic} ${['fundamentos', 'contexto', 'método', 'prática', 'teoria', 'história', 'crítica', 'extensões', 'variantes', 'debates', 'aplicações', 'influências', 'correntes', 'escolas', 'obras'][i - 1]}` : request.topic],
    }));
  }

  return {
    nodes,
    title: `${request.topic} [DEMO — configure API key]`,
    description: `Demo sem API key. Configure VITE_RHIZOME_LLM_API_KEY para usar LLM real.`,
    generatedAt: Date.now(),
  };
}

const STUB_DELEUZE: LLMNodeDef[] = [
  { label: 'Rizoma', category: 'philosophy', isEntry: true, relevance: 0.95, popularity: 0.90, description: 'Modelo de pensamento não-hierárquico',
    connections: ['Platô', 'Linhas de Fuga', 'Multiplicidade', 'Anti-Genealogia'],
    typedEdges: [
      { target: 'Platô', strength: 0.90, relation: 'co_occurs' },
      { target: 'Linhas de Fuga', strength: 0.85, relation: 'contains' },
      { target: 'Multiplicidade', strength: 0.88, relation: 'contains' },
      { target: 'Anti-Genealogia', strength: 0.75, relation: 'extends' },
    ] },
  { label: 'Platô', category: 'philosophy', relevance: 0.80, popularity: 0.75, description: 'Região de intensidade contínua',
    connections: ['Rizoma', 'Territórios', 'Corpo sem Órgãos'],
    typedEdges: [
      { target: 'Rizoma', strength: 0.90, relation: 'co_occurs' },
      { target: 'Territórios', strength: 0.65, relation: 'contrasts' },
      { target: 'Corpo sem Órgãos', strength: 0.80, relation: 'co_occurs' },
    ] },
  { label: 'Linhas de Fuga', category: 'philosophy', isEntry: true, relevance: 0.92, popularity: 0.85, description: 'Movimento de desterritorialização',
    connections: ['Rizoma', 'Devir', 'Multiplicidade', 'Esquizo'],
    typedEdges: [
      { target: 'Rizoma', strength: 0.85, relation: 'contains' },
      { target: 'Devir', strength: 0.80, relation: 'influences' },
      { target: 'Multiplicidade', strength: 0.70, relation: 'co_occurs' },
      { target: 'Esquizo', strength: 0.60, relation: 'bridges' },
    ] },
  { label: 'Territórios', category: 'philosophy', relevance: 0.70, popularity: 0.65, description: 'Zonas de estabilidade e identidade',
    connections: ['Platô', 'Reterritorialização', 'Desterritorialização'],
    typedEdges: [
      { target: 'Platô', strength: 0.65, relation: 'contrasts' },
      { target: 'Reterritorialização', strength: 0.90, relation: 'co_occurs' },
      { target: 'Desterritorialização', strength: 0.92, relation: 'contrasts' },
    ] },
  { label: 'Multiplicidade', category: 'philosophy', isEntry: true, relevance: 0.88, popularity: 0.80, description: 'Dimensão que escapa à unidade',
    connections: ['Rizoma', 'Devir', 'Anti-Genealogia'],
    typedEdges: [
      { target: 'Rizoma', strength: 0.88, relation: 'contains' },
      { target: 'Devir', strength: 0.75, relation: 'co_occurs' },
      { target: 'Anti-Genealogia', strength: 0.70, relation: 'extends' },
    ] },
  { label: 'Devir', category: 'philosophy', relevance: 0.82, popularity: 0.78, description: 'Processo sem origem nem fim',
    connections: ['Linhas de Fuga', 'Multiplicidade', 'Máquina de Guerra'],
    typedEdges: [
      { target: 'Linhas de Fuga', strength: 0.80, relation: 'influences' },
      { target: 'Multiplicidade', strength: 0.75, relation: 'co_occurs' },
      { target: 'Máquina de Guerra', strength: 0.55, relation: 'bridges' },
    ] },
  { label: 'Corpo sem Órgãos', category: 'philosophy', relevance: 0.78, popularity: 0.72, description: 'Plano de imanência e intensidade',
    connections: ['Platô', 'Esquizo', 'Intensidade'],
    typedEdges: [
      { target: 'Platô', strength: 0.80, relation: 'co_occurs' },
      { target: 'Esquizo', strength: 0.75, relation: 'influences' },
      { target: 'Intensidade', strength: 0.85, relation: 'contains' },
    ] },
  { label: 'Esquizo', category: 'philosophy', relevance: 0.65, popularity: 0.60, description: 'Processo esquizofrênico como modelo crítico',
    connections: ['Linhas de Fuga', 'Corpo sem Órgãos', 'Anti-Édipo'],
    typedEdges: [
      { target: 'Linhas de Fuga', strength: 0.60, relation: 'bridges' },
      { target: 'Corpo sem Órgãos', strength: 0.75, relation: 'influences' },
      { target: 'Anti-Édipo', strength: 0.90, relation: 'co_occurs' },
    ] },
  { label: 'Anti-Édipo', category: 'philosophy', isEntry: true, relevance: 0.90, popularity: 0.88, description: 'Crítica à triangulação familiar',
    connections: ['Esquizo', 'Máquinas Desejantes', 'Capitalismo'],
    typedEdges: [
      { target: 'Esquizo', strength: 0.90, relation: 'co_occurs' },
      { target: 'Máquinas Desejantes', strength: 0.85, relation: 'contains' },
      { target: 'Capitalismo', strength: 0.80, relation: 'critiques' },
    ] },
  { label: 'Máquinas Desejantes', category: 'philosophy', relevance: 0.72, popularity: 0.65, description: 'Produção desejante como máquina',
    connections: ['Anti-Édipo', 'Capitalismo', 'Intensidade'],
    typedEdges: [
      { target: 'Anti-Édipo', strength: 0.85, relation: 'contains' },
      { target: 'Capitalismo', strength: 0.55, relation: 'contrasts' },
      { target: 'Intensidade', strength: 0.60, relation: 'co_occurs' },
    ] },
  { label: 'Capitalismo', category: 'politics', relevance: 0.68, popularity: 0.75, description: 'Axiomática do capital',
    connections: ['Anti-Édipo', 'Reterritorialização', 'Máquinas Desejantes'],
    typedEdges: [
      { target: 'Anti-Édipo', strength: 0.80, relation: 'critiques' },
      { target: 'Reterritorialização', strength: 0.70, relation: 'influences' },
      { target: 'Máquinas Desejantes', strength: 0.55, relation: 'contrasts' },
    ] },
  { label: 'Reterritorialização', category: 'philosophy', relevance: 0.62, popularity: 0.55, description: 'Recaptura após linha de fuga',
    connections: ['Territórios', 'Capitalismo', 'Estado'],
    typedEdges: [
      { target: 'Territórios', strength: 0.90, relation: 'co_occurs' },
      { target: 'Capitalismo', strength: 0.70, relation: 'influences' },
      { target: 'Estado', strength: 0.65, relation: 'co_occurs' },
    ] },
  { label: 'Desterritorialização', category: 'philosophy', relevance: 0.75, popularity: 0.70, description: 'Abandono do território',
    connections: ['Territórios', 'Devir', 'Nômade'],
    typedEdges: [
      { target: 'Territórios', strength: 0.92, relation: 'contrasts' },
      { target: 'Devir', strength: 0.70, relation: 'co_occurs' },
      { target: 'Nômade', strength: 0.75, relation: 'influences' },
    ] },
  { label: 'Máquina de Guerra', category: 'politics', relevance: 0.60, popularity: 0.55, description: 'Exterior ao Estado, nômade',
    connections: ['Devir', 'Nômade', 'Estado'],
    typedEdges: [
      { target: 'Devir', strength: 0.55, relation: 'bridges' },
      { target: 'Nômade', strength: 0.80, relation: 'co_occurs' },
      { target: 'Estado', strength: 0.90, relation: 'contrasts' },
    ] },
  { label: 'Nômade', category: 'philosophy', isEntry: true, relevance: 0.72, popularity: 0.68, description: 'Pensamento e movimento sem fixação',
    connections: ['Máquina de Guerra', 'Desterritorialização', 'Espaço Liso'],
    typedEdges: [
      { target: 'Máquina de Guerra', strength: 0.80, relation: 'co_occurs' },
      { target: 'Desterritorialização', strength: 0.75, relation: 'influences' },
      { target: 'Espaço Liso', strength: 0.85, relation: 'co_occurs' },
    ] },
  { label: 'Estado', category: 'politics', relevance: 0.58, popularity: 0.70, description: 'Máquina de captura e estriagem',
    connections: ['Máquina de Guerra', 'Reterritorialização', 'Espaço Estriado'],
    typedEdges: [
      { target: 'Máquina de Guerra', strength: 0.90, relation: 'contrasts' },
      { target: 'Reterritorialização', strength: 0.65, relation: 'co_occurs' },
      { target: 'Espaço Estriado', strength: 0.85, relation: 'co_occurs' },
    ] },
  { label: 'Espaço Liso', category: 'philosophy', relevance: 0.55, popularity: 0.50, description: 'Espaço nômade e intensivo',
    connections: ['Nômade', 'Devir', 'Intensidade'],
    typedEdges: [
      { target: 'Nômade', strength: 0.85, relation: 'co_occurs' },
      { target: 'Devir', strength: 0.60, relation: 'co_occurs' },
      { target: 'Intensidade', strength: 0.65, relation: 'bridges' },
    ] },
  { label: 'Espaço Estriado', category: 'philosophy', relevance: 0.50, popularity: 0.45, description: 'Espaço sedentário e métrico',
    connections: ['Estado', 'Reterritorialização'],
    typedEdges: [
      { target: 'Estado', strength: 0.85, relation: 'co_occurs' },
      { target: 'Reterritorialização', strength: 0.70, relation: 'co_occurs' },
    ] },
  { label: 'Intensidade', category: 'philosophy', relevance: 0.65, popularity: 0.60, description: 'Diferença em si, sem negação',
    connections: ['Corpo sem Órgãos', 'Espaço Liso', 'Máquinas Desejantes'],
    typedEdges: [
      { target: 'Corpo sem Órgãos', strength: 0.85, relation: 'contains' },
      { target: 'Espaço Liso', strength: 0.65, relation: 'bridges' },
      { target: 'Máquinas Desejantes', strength: 0.60, relation: 'co_occurs' },
    ] },
  { label: 'Anti-Genealogia', category: 'philosophy', relevance: 0.55, popularity: 0.45, description: 'Rejeição da origem e da árvore',
    connections: ['Rizoma', 'Multiplicidade', 'Platô'],
    typedEdges: [
      { target: 'Rizoma', strength: 0.75, relation: 'extends' },
      { target: 'Multiplicidade', strength: 0.70, relation: 'extends' },
      { target: 'Platô', strength: 0.50, relation: 'co_occurs' },
    ] },
];

// ── Inject LLM nodes into simulation ─────────────────────────────────────────
export function injectLLMNodes(
  state: RhizomeState,
  defs: LLMNodeDef[],
  W: number,
  H: number,
  replaceExisting = false,
): void {
  if (replaceExisting) {
    state.nodes = state.nodes.filter(n => !n.label || n.userPlaced);
  }

  const margin = 60;
  const cx = W * 0.5;
  const cy = H * 0.5;

  const entries = defs.filter(d => d.isEntry);
  const regular = defs.filter(d => !d.isEntry);
  const allDefs = [...entries, ...regular];
  const count = Math.min(allDefs.length, MAX_NODES - state.nodes.length);

  const newNodes: RhizomeNode[] = [];
  const labelToNode = new Map<string, RhizomeNode>();

  for (let i = 0; i < count; i++) {
    const def = allDefs[i];
    const isEntryNode = def.isEntry ?? false;

    const ring = isEntryNode ? 0.28 : 0.45;
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const r = Math.min(W, H) * ring + (Math.random() - 0.5) * 50;
    const x = Math.max(margin, Math.min(W - margin, cx + Math.cos(angle) * r));
    const y = Math.max(margin, Math.min(H - margin, cy + Math.sin(angle) * r));

    const node: RhizomeNode = {
      id:    state.nextId++,
      x, y,
      vx:    (Math.random() - 0.5) * 20,
      vy:    (Math.random() - 0.5) * 20,
      heat:  isEntryNode ? 1.0 : 0.7,
      isEntry: isEntryNode,
      age:   0,
      connections: new Map(),
      label: def.label,
      description: def.description,
      connectionsLabels: def.connections,
      category: def.category,
      userPlaced: false,
    };

    newNodes.push(node);
    labelToNode.set(def.label, node);
    state.nodes.push(node);
  }

  // Apply connections with typed edge data
  for (let i = 0; i < count; i++) {
    const def = allDefs[i];
    const nodeA = labelToNode.get(def.label);
    if (!nodeA || !def.connections) continue;

    // Build lookup from typedEdges
    const edgeLookup = new Map<string, LLMEdgeDef>();
    if (def.typedEdges) {
      for (const te of def.typedEdges) {
        edgeLookup.set(te.target.toLowerCase(), te);
      }
    }

    for (const targetLabel of def.connections) {
      const nodeB = labelToNode.get(targetLabel);
      if (!nodeB || nodeB.id === nodeA.id) continue;
      if (!nodeA.connections.has(nodeB.id)) {
        const typed = edgeLookup.get(targetLabel.toLowerCase());
        const w = typed ? typed.strength : (0.5 + Math.random() * 0.35);
        nodeA.connections.set(nodeB.id, w);
        nodeB.connections.set(nodeA.id, w);

        if (typed) {
          if (!nodeA.edgeTypes) nodeA.edgeTypes = new Map();
          if (!nodeB.edgeTypes) nodeB.edgeTypes = new Map();
          nodeA.edgeTypes.set(nodeB.id, typed.relation);
          nodeB.edgeTypes.set(nodeA.id, typed.relation);
        }
      }
    }
  }
}

// ── Progressive injection (one node at a time) ────────────────────────────────
// Returns a cancel function. Calls onProgress(injectedCount, totalCount).
export function injectLLMNodesProgressively(
  state: RhizomeState,
  allDefs: LLMNodeDef[],
  W: number,
  H: number,
  onProgress: (injected: number, total: number) => void,
  onComplete: () => void,
  delayMs = 120,
  anchorId?: number,
): () => void {
  let cancelled = false;
  const margin = 55;
  const cx = W * 0.5;
  const cy = H * 0.5;
  const total = Math.min(allDefs.length, MAX_NODES - state.nodes.length);
  const minDim = Math.min(W, H);

  const labelToNode = new Map<string, RhizomeNode>();

  let i = 0;

  function injectNext() {
    if (cancelled || i >= total) {
      if (!cancelled) onComplete();
      return;
    }

    const def = allDefs[i];

    // ── Fibonacci/golden-angle spiral placement ───────────────────────────────
    // Golden angle ≈ 2.3998 rad ensures no two adjacent nodes share an angle,
    // giving near-uniform angular distribution for any node count.
    const relevance  = def.relevance  ?? (def.isEntry ? 0.85 : 0.5);
    const popularity = def.popularity ?? 0.5;

    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ≈ 2.3998 rad
    const baseAngle   = i * goldenAngle + (Math.random() - 0.5) * 0.18;

    // Radial placement: use sqrt(i/total) for uniform area distribution,
    // then modulate ±10% by relevance so core concepts sit slightly closer.
    // minRing = 0.14  (≈110px on 800px canvas) — never collapse onto anchor
    // maxRing = 0.44  (≈352px on 800px canvas) — near canvas edges
    const minRing = 0.14;
    const maxRing = 0.44;
    const spiralT  = total > 1 ? Math.sqrt(i / (total - 1)) : 0.5; // 0→1
    const ringFactor = minRing + spiralT * (maxRing - minRing)
                     + (0.5 - relevance) * 0.08; // relevant → slightly closer

    const radius = minDim * Math.min(maxRing, Math.max(minRing, ringFactor))
                 + (Math.random() - 0.5) * (minDim * 0.04);
    const x = Math.max(margin, Math.min(W - margin, cx + Math.cos(baseAngle) * radius));
    const y = Math.max(margin, Math.min(H - margin, cy + Math.sin(baseAngle) * radius));

    // ── Build node ────────────────────────────────────────────────────────────
    const node: RhizomeNode = {
      id:    state.nextId++,
      x, y,
      vx:    (Math.random() - 0.5) * 10,
      vy:    (Math.random() - 0.5) * 10,
      heat:  0.55 + popularity * 0.45,
      isEntry:  def.isEntry ?? false,
      age:   0,
      connections: new Map(),
      label: def.label,
      description:       def.description,
      connectionsLabels: def.connections,
      category:          def.category,
      relevance:         relevance,   // stored — engine uses for visual size scaling
      popularity:        popularity,  // stored — drives brightness via heat
      userPlaced: false,
    };

    labelToNode.set(def.label, node);
    state.nodes.push(node);

    // ── Connect to already-injected nodes via label (with typed edge data) ────
    const edgeLookup = new Map<string, LLMEdgeDef>();
    if (def.typedEdges) {
      for (const te of def.typedEdges) {
        edgeLookup.set(te.target.toLowerCase(), te);
      }
    }

    if (def.connections) {
      for (const targetLabel of def.connections) {
        const nodeB = labelToNode.get(targetLabel);
        if (nodeB && nodeB.id !== node.id && !node.connections.has(nodeB.id)) {
          const typed = edgeLookup.get(targetLabel.toLowerCase());
          const w = typed ? typed.strength : (0.45 + Math.random() * 0.40);
          node.connections.set(nodeB.id, w);
          nodeB.connections.set(node.id, w);

          if (typed) {
            if (!node.edgeTypes) node.edgeTypes = new Map();
            if (!nodeB.edgeTypes) nodeB.edgeTypes = new Map();
            node.edgeTypes.set(nodeB.id, typed.relation);
            nodeB.edgeTypes.set(node.id, typed.relation);
          }
        }
      }
    }

    // ── Connect to anchor — only entry nodes ─────────────────────────────────
    if (anchorId !== undefined) {
      const anchor = state.nodes.find(n => n.id === anchorId);
      if (anchor && !node.connections.has(anchorId)) {
        const isEntry = def.isEntry ?? false;
        if (isEntry) {
          const w = 0.35 + relevance * 0.15;
          node.connections.set(anchorId, w);
          anchor.connections.set(node.id, w);
        }
      }
    }

    i++;
    onProgress(i, total);
    setTimeout(injectNext, delayMs);
  }

  setTimeout(injectNext, 50);
  return () => { cancelled = true; };
}

// ── Post-injection graph metrics enrichment ──────────────────────────────────
// After injecting LLM nodes, compute real graph metrics and feed them back
// into each node so rendering can use them for visual differentiation.
export function enrichNodesWithGraphMetrics(state: RhizomeState): void {
  const nodes = state.nodes;
  if (nodes.length < 3) return;

  // Inline lightweight graph analysis to avoid circular imports
  // (graphMetrics.ts imports RhizomeNode from rhizomeTypes, not from here)

  // Betweenness centrality (Brandes algorithm)
  const adj = new Map<number, Set<number>>();
  for (const n of nodes) {
    if (!adj.has(n.id)) adj.set(n.id, new Set());
    for (const [tid] of n.connections) adj.get(n.id)!.add(tid);
  }

  const betweenness = new Map<number, number>();
  for (const n of nodes) betweenness.set(n.id, 0);

  for (const s of nodes) {
    const stack: number[] = [];
    const pred = new Map<number, number[]>();
    const sigma = new Map<number, number>();
    const dist = new Map<number, number>();
    for (const v of nodes) { pred.set(v.id, []); sigma.set(v.id, 0); dist.set(v.id, -1); }
    sigma.set(s.id, 1); dist.set(s.id, 0);
    const queue = [s.id];
    while (queue.length > 0) {
      const v = queue.shift()!;
      stack.push(v);
      for (const w of adj.get(v) || []) {
        if (dist.get(w)! < 0) { queue.push(w); dist.set(w, dist.get(v)! + 1); }
        if (dist.get(w) === dist.get(v)! + 1) { sigma.set(w, sigma.get(w)! + sigma.get(v)!); pred.get(w)!.push(v); }
      }
    }
    const delta = new Map<number, number>();
    for (const v of nodes) delta.set(v.id, 0);
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred.get(w)!) { delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!)); }
      if (w !== s.id) betweenness.set(w, betweenness.get(w)! + delta.get(w)!);
    }
  }
  const n = nodes.length;
  if (n > 2) { const norm = 2 / ((n - 1) * (n - 2)); for (const [id, val] of betweenness) betweenness.set(id, val * norm); }

  // Closeness centrality
  const closeness = new Map<number, number>();
  for (const node of nodes) {
    const d = new Map<number, number>();
    const q = [node.id]; d.set(node.id, 0);
    while (q.length > 0) { const u = q.shift()!; for (const v of adj.get(u) || []) { if (!d.has(v)) { d.set(v, d.get(u)! + 1); q.push(v); } } }
    let sum = 0, reach = 0;
    for (const [t, dd] of d) { if (t !== node.id && dd > 0) { sum += dd; reach++; } }
    closeness.set(node.id, reach > 0 ? reach / sum : 0);
  }

  // Community detection (greedy modularity)
  const community = new Map<number, number>();
  for (const nd of nodes) community.set(nd.id, nd.id);
  let improved = true; let iter = 0;
  while (improved && iter < 10) {
    improved = false; iter++;
    for (const nd of nodes) {
      const scores = new Map<number, number>();
      for (const nId of adj.get(nd.id) || []) {
        const c = community.get(nId)!;
        scores.set(c, (scores.get(c) || 0) + (nd.connections.get(nId) || 1));
      }
      let bestC = community.get(nd.id)!, bestS = scores.get(bestC) || 0;
      for (const [c, sc] of scores) { if (sc > bestS) { bestS = sc; bestC = c; } }
      if (bestC !== community.get(nd.id)) { community.set(nd.id, bestC); improved = true; }
    }
  }

  // Hub & bridge detection
  const maxDeg = Math.max(...nodes.map(nd => nd.connections.size), 1);
  const hubIds = new Set(nodes.filter(nd => nd.connections.size / maxDeg >= 0.6).map(nd => nd.id));

  const bridgeIds = new Set<number>();
  for (const nd of nodes) {
    const bet = betweenness.get(nd.id) || 0;
    if (bet < 0.2) continue;
    const neighborComms = new Set<number>();
    for (const [nId] of nd.connections) { const c = community.get(nId); if (c !== undefined) neighborComms.add(c); }
    if (neighborComms.size >= 2) bridgeIds.add(nd.id);
  }

  // Apply metrics to nodes
  for (const nd of nodes) {
    nd.betweenness  = betweenness.get(nd.id) ?? 0;
    nd.closeness    = closeness.get(nd.id) ?? 0;
    nd.communityId  = community.get(nd.id);
    nd.isHub        = hubIds.has(nd.id);
    nd.isBridge     = bridgeIds.has(nd.id);

    if (nd.mentionCount === undefined) nd.mentionCount = nd.connections.size;

    if (nd.computedRelevance === undefined && nd.relevance !== undefined) {
      const degNorm = Math.min(nd.connections.size / 10, 1);
      nd.computedRelevance = Math.min(1, (
        (nd.relevance ?? 0.5) * 0.35 +
        (nd.betweenness ?? 0) * 0.25 +
        (nd.closeness ?? 0) * 0.20 +
        degNorm * 0.20
      ));
    }
  }
}

/** Remove only LLM-generated labeled nodes from the simulation */
export function clearLLMNodes(state: RhizomeState): void {
  const llmIds = new Set(
    state.nodes.filter(n => n.label && !n.userPlaced).map(n => n.id)
  );
  if (llmIds.size === 0) return;

  state.nodes = state.nodes.filter(n => !llmIds.has(n.id));
  for (const n of state.nodes) {
    for (const id of llmIds) {
      n.connections.delete(id);
    }
  }
}