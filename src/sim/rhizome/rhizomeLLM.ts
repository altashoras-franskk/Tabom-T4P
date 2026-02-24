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
} from './rhizomeTypes';
import type { RhizomeState } from './rhizomeTypes';
import { CANVAS_PAD, MAX_NODES } from './rhizomeTypes';
import type { RhizomeNode } from './rhizomeTypes';

// ── Prompt Templates per Mode ────────────────────────────────────────────────

/** DEFAULT — mixed concepts + people */
export const RHIZOME_PROMPT_TEMPLATE = `
You are an epistemological cartographer. Given the topic "{TOPIC}", generate a rhizomatic map with {COUNT} nodes.
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
    "connections": ["OtherConceptLabel", ...]
  },
  ...
]

Field rules:
- label: short (1-4 words). Include PEOPLE (thinkers, artists, scientists) by name.
- description: one sentence, factual, no invented bibliography
- category: group into 3-6 thematic categories (e.g. "philosophy", "science", "people", "method", "art")
- relevance: 0..1 — how directly relevant this concept is to "{TOPIC}" (1.0=core, 0.2=tangential)
- popularity: 0..1 — cultural/academic prominence of this concept (1.0=extremely well-known)
- directLink: true if this node connects directly to the central topic anchor
- isEntry: mark 3-5 nodes as true (key entry points)
- connections: 2-5 other node labels (meaningful, not random)
- ensure the network is fully connected (no isolated nodes)

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
    "connections": ["Name of intellectual influence or collaborator", ...]
  }
]

Rules:
- ONLY real people (no concepts, no movements as nodes)
- label = person's name (1-3 words)
- connections = other people in this list who influenced, collaborated, or debated with this person
- isEntry = true for 3-5 most central figures
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
    "category": "concept / book / influence / legacy / person",
    "isEntry": true/false,
    "relevance": 0.0-1.0,
    "popularity": 0.0-1.0,
    "directLink": true/false,
    "connections": ["Related concept or work", ...]
  }
]

Rules:
- Include: key concepts, book/article titles (short), people who influenced them, students/heirs
- category values: "core concept", "major work", "influence", "student/heir", "debate"
- isEntry = true for the 3-5 most central concepts
- connections must be meaningful (not random)
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
    "connections": ["Next step", "prerequisite step", ...]
  }
]

Rules:
- order: integer starting at 1, increasing through the array
- The first 1-3 nodes are foundational (isEntry=true)
- connections should reflect prerequisites AND what this unlocks
- Each step connects to at least 2 others (prev/next or branching)
- label is a short name for this learning step (e.g. "Basic Algebra", "Quantum Postulates")

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
    "connections": ["Opposing view", "related debate", ...]
  }
]

Rules:
- Include: opposing schools, key debates, contested figures, paradigm conflicts
- Connections should indicate intellectual opposition OR alliance
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
    "connections": ["Semantically related keyword", ...]
  }
]

Rules:
- labels are single words or short technical terms (1-2 words)
- connections = semantic proximity (synonyms, antonyms, parent/child concepts)
- isEntry = true for 3-5 most fundamental terms
- high density: each node connects to 3-5 others

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
    // Assign a sector angle to this category if not yet seen
    if (!categoryAngleMap.has(def.category)) {
      // Use golden-angle-spaced sectors for categories themselves
      const sectorIndex = categoryAngleMap.size;
      categoryAngleMap.set(def.category, sectorIndex * goldenAngle * 2.5); // wider sector spacing
    }
    const sectorAngle = categoryAngleMap.get(def.category)!;

    // Count how many nodes of this category already exist (for sub-spiral within cluster)
    const siblingCount = state.nodes.filter(n => n.category === def.category).length;

    // Sub-spiral within the category sector — compact spread
    const subAngle = siblingCount * goldenAngle;
    const sectorSpread = 0.55; // radians — how wide within the sector
    baseAngle = sectorAngle + subAngle * sectorSpread + (Math.random() - 0.5) * 0.15;
  } else {
    // Default: plain golden-angle spiral (for nodes without category)
    baseAngle = nodeIndex * goldenAngle + (Math.random() - 0.5) * 0.18;
  }

  const minRing    = isExpand ? 0.11 : 0.14;
  const maxRing    = isExpand ? 0.34 : 0.44;
  const spiralT    = totalExpected > 1 ? Math.sqrt(nodeIndex / (totalExpected - 1)) : 0.5;
  const ringFactor = minRing + spiralT * (maxRing - minRing) + (0.5 - relevance) * 0.07;
  const radius     = minDim * Math.min(maxRing, Math.max(minRing, ringFactor))
                   + (Math.random() - 0.5) * (minDim * 0.04);

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

  if (labelMap) {
    labelMap.set(def.label, node);
    if (def.connections) {
      for (const tl of def.connections) {
        const nb = labelMap.get(tl);
        if (nb && nb.id !== node.id && !node.connections.has(nb.id)) {
          const w = 0.45 + Math.random() * 0.40;
          node.connections.set(nb.id, w);
          nb.connections.set(node.id, w);
        }
      }
    }
  }

  // Selective anchor bond — ONLY directLink nodes tether to centre
  // (prevents all-to-all star topology)
  if (anchorId !== undefined) {
    const anchor = state.nodes.find(n => n.id === anchorId);
    if (anchor && !node.connections.has(anchorId)) {
      const isDirect = def.directLink ?? (def.isEntry ?? false);
      if (isDirect) {
        // Strong tether for direct-link nodes
        const w = 0.50 + relevance * 0.20;
        node.connections.set(anchorId, w);
        anchor.connections.set(node.id, w);
      }
      // Nodes with relevance > 0.85 get a weak anchor connection (true hubs only)
      else if (relevance > 0.85) {
        const w = 0.18 + relevance * 0.10;
        node.connections.set(anchorId, w);
        anchor.connections.set(node.id, w);
      }
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
  { label: 'Rizoma', category: 'philosophy', isEntry: true, description: 'Modelo de pensamento não-hierárquico', connections: ['Platô', 'Linhas de Fuga', 'Multiplicidade', 'Anti-Genealogia'] },
  { label: 'Platô', category: 'philosophy', description: 'Região de intensidade contínua', connections: ['Rizoma', 'Territórios', 'Corpo sem Órgãos'] },
  { label: 'Linhas de Fuga', category: 'philosophy', isEntry: true, description: 'Movimento de desterritorialização', connections: ['Rizoma', 'Devir', 'Multiplicidade', 'Esquizo'] },
  { label: 'Territórios', category: 'philosophy', description: 'Zonas de estabilidade e identidade', connections: ['Platô', 'Reterritorialização', 'Desterritorialização'] },
  { label: 'Multiplicidade', category: 'philosophy', isEntry: true, description: 'Dimensão que escapa à unidade', connections: ['Rizoma', 'Devir', 'Anti-Genealogia'] },
  { label: 'Devir', category: 'philosophy', description: 'Processo sem origem nem fim', connections: ['Linhas de Fuga', 'Multiplicidade', 'Máquina de Guerra'] },
  { label: 'Corpo sem Órgãos', category: 'philosophy', description: 'Plano de imanência e intensidade', connections: ['Platô', 'Esquizo', 'Intensidade'] },
  { label: 'Esquizo', category: 'philosophy', description: 'Processo esquizofrênico como modelo crítico', connections: ['Linhas de Fuga', 'Corpo sem Órgãos', 'Anti-Édipo'] },
  { label: 'Anti-Édipo', category: 'philosophy', isEntry: true, description: 'Crítica à triangulação familiar', connections: ['Esquizo', 'Máquinas Desejantes', 'Capitalismo'] },
  { label: 'Máquinas Desejantes', category: 'philosophy', description: 'Produção desejante como máquina', connections: ['Anti-Édipo', 'Capitalismo', 'Intensidade'] },
  { label: 'Capitalismo', category: 'politics', description: 'Axiomática do capital', connections: ['Anti-Édipo', 'Reterritorialização', 'Máquinas Desejantes'] },
  { label: 'Reterritorialização', category: 'philosophy', description: 'Recaptura após linha de fuga', connections: ['Territórios', 'Capitalismo', 'Estado'] },
  { label: 'Desterritorialização', category: 'philosophy', description: 'Abandono do território', connections: ['Territórios', 'Devir', 'Nômade'] },
  { label: 'Máquina de Guerra', category: 'philosophy', description: 'Exterior ao Estado, nômade', connections: ['Devir', 'Nômade', 'Estado'] },
  { label: 'Nômade', category: 'philosophy', isEntry: true, description: 'Pensamento e movimento sem fixação', connections: ['Máquina de Guerra', 'Desterritorialização', 'Espaço Liso'] },
  { label: 'Estado', category: 'politics', description: 'Máquina de captura e estriagem', connections: ['Máquina de Guerra', 'Reterritorialização', 'Espaço Estriado'] },
  { label: 'Espaço Liso', category: 'philosophy', description: 'Espaço nômade e intensivo', connections: ['Nômade', 'Devir', 'Intensidade'] },
  { label: 'Espaço Estriado', category: 'philosophy', description: 'Espaço sedentário e métrico', connections: ['Estado', 'Reterritorialização'] },
  { label: 'Intensidade', category: 'philosophy', description: 'Diferença em si, sem negação', connections: ['Corpo sem Órgãos', 'Espaço Liso', 'Máquinas Desejantes'] },
  { label: 'Anti-Genealogia', category: 'philosophy', description: 'Rejeição da origem e da árvore', connections: ['Rizoma', 'Multiplicidade', 'Platô'] },
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

  // Apply connections
  for (let i = 0; i < count; i++) {
    const def = allDefs[i];
    const nodeA = labelToNode.get(def.label);
    if (!nodeA || !def.connections) continue;

    for (const targetLabel of def.connections) {
      const nodeB = labelToNode.get(targetLabel);
      if (!nodeB || nodeB.id === nodeA.id) continue;
      if (!nodeA.connections.has(nodeB.id)) {
        const w = 0.5 + Math.random() * 0.35;
        nodeA.connections.set(nodeB.id, w);
        nodeB.connections.set(nodeA.id, w);
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

    // ── Connect to already-injected nodes via label ───────────────────────────
    if (def.connections) {
      for (const targetLabel of def.connections) {
        const nodeB = labelToNode.get(targetLabel);
        if (nodeB && nodeB.id !== node.id && !node.connections.has(nodeB.id)) {
          const w = 0.45 + Math.random() * 0.40;
          node.connections.set(nodeB.id, w);
          nodeB.connections.set(node.id, w);
        }
      }
    }

    // ── Connect to anchor ─────────────────────────────────────────────────────
    // directLink / entry nodes get a moderate spring; peripheral ones get nothing
    // (they'll connect via label matching — no need to pull everyone to center)
    if (anchorId !== undefined) {
      const anchor = state.nodes.find(n => n.id === anchorId);
      if (anchor && !node.connections.has(anchorId)) {
        const isDirect = def.directLink ?? (def.isEntry ?? false);
        if (isDirect || relevance > 0.70) {
          // Only strongly-relevant nodes tether to anchor
          const w = isDirect
            ? 0.45 + relevance * 0.20   // moderate anchor bond (was 0.65+)
            : 0.20 + relevance * 0.15;  // weak tether for high-relevance only
          node.connections.set(anchorId, w);
          anchor.connections.set(node.id, w);
        }
        // Low-relevance peripheral nodes: no anchor bond — they spread freely
      }
    }

    i++;
    onProgress(i, total);
    setTimeout(injectNext, delayMs);
  }

  setTimeout(injectNext, 50);
  return () => { cancelled = true; };
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