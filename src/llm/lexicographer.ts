// ─────────────────────────────────────────────────────────────────────────────
// LLM Lexicographer — prompts + retries + anti-hallucination
// ─────────────────────────────────────────────────────────────────────────────
import { chatCompletion } from './openaiClient';
import { validateRefineOutput, validateClusterOutput, safeParseJSON } from './schemas';
import type { LexiconEntry, LLMRefineOutput, LLMClusterOutput, Observables } from '../sim/language/types';

const SYSTEM_LEXICOGRAPHER = `Você é um lexicógrafo de uma linguagem experimental chamada Heptapod.
Você APENAS pode inferir significado a partir de:
- Tokens/forma do glifo fornecidos
- Métricas observadas no mundo (física simulada)
- Efeito real após aplicar o glifo (Speak)
- Labels humanos (se fornecidos)

Nunca afirme fatos externos ou invenções. Retorne SOMENTE JSON válido conforme o schema solicitado.
Seja conciso, operacional e verificável. Confidence < 0.5 → needs_verification: true.`;

// ── refine_entry ──────────────────────────────────────────────────────────────
export async function refineEntry(
  entry: LexiconEntry,
  recentObs: Observables,
  effectDelta?: { before: Partial<Observables>; after: Partial<Observables> },
  userLabels?: string[],
  allGlosses?: string[],
): Promise<LLMRefineOutput> {
  const effectStr = effectDelta
    ? `Efeito após Speak — antes: sync=${effectDelta.before.syncIndex?.toFixed(2)} coh=${effectDelta.before.coherenceMean?.toFixed(2)} | depois: sync=${effectDelta.after.syncIndex?.toFixed(2)} coh=${effectDelta.after.coherenceMean?.toFixed(2)}`
    : 'Sem dados de Speak ainda.';

  const userStr = userLabels?.length
    ? `Labels do usuário: ${userLabels.join(', ')}`
    : 'Nenhum label humano ainda.';

  const contrastsHint = allGlosses?.length
    ? `Glosses existentes no dicionário: ${allGlosses.slice(0, 12).join(', ')}`
    : '';

  const userMsg = `
Glifo: ${entry.glyphId}
Tokens/features: ${entry.tokens.join(', ')}
Observáveis: sync=${recentObs.syncIndex.toFixed(2)} coherence=${recentObs.coherenceMean.toFixed(2)} tension=${recentObs.tensionIndex.toFixed(2)} novelty=${recentObs.noveltyIndex.toFixed(2)} loops=${recentObs.loopCount.toFixed(2)} silence=${recentObs.silenceIndex.toFixed(2)}
${effectStr}
${userStr}
${contrastsHint}
Definição prévia: "${entry.gloss}" — "${entry.definition}"

Retorne JSON com campos: gloss (1–3 palavras), definition (1–2 frases), usage (1 frase), contrasts (array strings), tags (array), confidence (0..1), needs_verification (bool), rationale (1–2 frases).`;

  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await chatCompletion(
        [
          { role: 'system', content: SYSTEM_LEXICOGRAPHER },
          { role: 'user',   content: userMsg },
        ],
        20000,
      );
      const parsed = safeParseJSON(raw);
      const result = validateRefineOutput(parsed);
      if (result.ok) return result.data;
      lastError = result.error;
    } catch (e) {
      lastError = (e as Error).message;
    }
  }
  throw new Error(`LLM refine failed: ${lastError}`);
}

// ── cluster_lexicon ───────────────────────────────────────────────────────────
export async function clusterLexicon(
  entries: LexiconEntry[],
): Promise<LLMClusterOutput> {
  if (entries.length < 3) throw new Error('Dicionário muito pequeno para clusterizar');

  const items = entries.slice(0, 30).map(e => ({
    id: e.glyphId,
    gloss: e.gloss,
    tokens: e.tokens.slice(0, 6).join(' '),
    confidence: e.confidence.toFixed(2),
  }));

  const userMsg = `
Dicionário Heptapod (${items.length} entradas):
${items.map(i => `- id=${i.id} gloss="${i.gloss}" tokens=[${i.tokens}] conf=${i.confidence}`).join('\n')}

Identifique 2–5 clusters temáticos/funcionais. Retorne JSON com:
clusters (array de {id, label, members: [glyphId...]}),
bridges (glyphIds que conectam clusters),
notes (1 frase geral).`;

  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await chatCompletion(
        [
          { role: 'system', content: SYSTEM_LEXICOGRAPHER },
          { role: 'user',   content: userMsg },
        ],
        20000,
      );
      const parsed = safeParseJSON(raw);
      const result = validateClusterOutput(parsed);
      if (result.ok) return result.data;
      lastError = result.error;
    } catch (e) {
      lastError = (e as Error).message;
    }
  }
  throw new Error(`LLM cluster failed: ${lastError}`);
}

// ── firstWordsAnalysis — batch-name the language's first words ───────────────
// Called once when the lexicon has 3+ entries to bootstrap vocabulary
export interface FirstWordResult {
  glyphId: string;
  gloss: string;
  definition: string;
  tags: string[];
  confidence: number;
}

export async function firstWordsAnalysis(
  entries: import('../sim/language/types').LexiconEntry[],
): Promise<FirstWordResult[]> {
  if (entries.length < 2) throw new Error('Léxico muito pequeno');

  const items = entries.slice(0, 8).map(e => ({
    id:       e.glyphId,
    hash:     e.signatureHash.slice(0, 8),
    tokens:   e.tokens.slice(0, 8).join(' '),
    freq:     e.frequency,
    obs: `sync=${e.examples?.[0]?.snapshotMetrics?.syncIndex?.toFixed(2) ?? '?'} coh=${e.examples?.[0]?.snapshotMetrics?.coherenceMean?.toFixed(2) ?? '?'}`,
  }));

  const system = `Você é o lexicógrafo fundador da língua Heptapod — uma linguagem alienígena não-linear cujos símbolos são criados por "Ink Quanta" (partículas orbitais de tinta que formam anéis e splatters).
Sua missão é nomear as PRIMEIRAS PALAVRAS desta língua: os conceitos primordiais que surgem de padrões físicos observados.
Inspire-se em conceitos como: tempo não-linear, percepção holística, fluxo, ressonância, tensão, emergência, silêncio, ligação.
Retorne SOMENTE JSON válido. Seja poético mas preciso.`;

  const userMsg = `Estas são as primeiras formas observadas na língua Heptapod:

${items.map(i => `ID: ${i.id}\nHash: ${i.hash}\nTokens: ${i.tokens}\nFrequência: ${i.freq}\nMétricas: ${i.obs}`).join('\n\n')}

Para cada forma, sugira:
- gloss: 1–3 palavras (português), o NOME do conceito
- definition: 1–2 frases sobre o que esse padrão físico SIGNIFICA na língua alienígena
- tags: 2–4 categorias (ex: "tempo", "fluxo", "tensão", "coerência")
- confidence: 0.1–0.8 (pois são primeiras palavras — incerteza alta)

Retorne JSON: { "results": [ { "glyphId": "...", "gloss": "...", "definition": "...", "tags": [...], "confidence": 0.x }, ... ] }`;

  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await chatCompletion(
        [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
        25000,
      );
      const parsed = safeParseJSON(raw);
      const results = parsed?.results;
      if (!Array.isArray(results)) throw new Error('results not array');
      return results.map((r: any) => ({
        glyphId:    String(r.glyphId ?? ''),
        gloss:      String(r.gloss ?? 'desconhecido'),
        definition: String(r.definition ?? ''),
        tags:       Array.isArray(r.tags) ? r.tags.map(String) : [],
        confidence: Number(r.confidence ?? 0.3),
      }));
    } catch (e) {
      lastError = (e as Error).message;
    }
  }
  throw new Error(`LLM firstWords failed: ${lastError}`);
}