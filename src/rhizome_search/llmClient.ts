// ── Rhizome Search — LLM Client ────────────────────────────────────────────────

import type { RhizomeSearchRequest, KnowledgeMap, MapSize, OutputStyle } from './types';
import { MAP_SIZE_NODE_COUNT } from './types';
import { RHIZOME_SEARCH_SYSTEM_PROMPT, buildUserPrompt, validateKnowledgeMap } from './schema';

// ── API Key Resolution ────────────────────────────────────────────────────────
import { loadOpenAIApiKey } from '../storage/userStorage';

function getAPIKey(providedKey?: string): string | null {
  // Priority order:
  // 1. Provided key
  if (providedKey) return providedKey;

  // 2. Environment variable RHIZOME_LLM_API_KEY
  if (import.meta.env.VITE_RHIZOME_LLM_API_KEY) {
    return import.meta.env.VITE_RHIZOME_LLM_API_KEY;
  }

  // 3. Environment variable OPENAI_API_KEY
  if (import.meta.env.VITE_OPENAI_API_KEY) {
    return import.meta.env.VITE_OPENAI_API_KEY;
  }

  // 4. Window config (if exists)
  if (typeof window !== 'undefined') {
    const cfg = (window as any).__APP_CONFIG__;
    if (cfg?.OPENAI_API_KEY) return cfg.OPENAI_API_KEY;
    // 5. localStorage (saved in Rhizome Lab)
    const k = loadOpenAIApiKey();
    if (k) return k;
  }

  return null;
}

// ── Base URL Resolution ───────────────────────────────────────────────────────
function getBaseURL(providedURL?: string): string {
  if (providedURL) return providedURL;
  if (import.meta.env.VITE_RHIZOME_LLM_BASE_URL) {
    return import.meta.env.VITE_RHIZOME_LLM_BASE_URL;
  }
  return 'https://api.openai.com/v1';
}

// ── Model ID Resolution ───────────────────────────────────────────────────────
function getModelID(providedModel?: string): string {
  if (providedModel) return providedModel;
  if (import.meta.env.VITE_RHIZOME_LLM_MODEL) {
    return import.meta.env.VITE_RHIZOME_LLM_MODEL;
  }
  return 'gpt-4o-mini';
}

// ── LLM Call with Retry ───────────────────────────────────────────────────────
async function callLLM(
  apiKey: string,
  baseURL: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxRetries = 1
): Promise<string> {
  const endpoint = `${baseURL}/chat/completions`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 8000,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout (increased)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `API error (${response.status})`;
        
        // Parse error details if possible
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMsg = errorData.error.message;
          }
        } catch {
          errorMsg = `${errorMsg}: ${errorText.substring(0, 200)}`;
        }
        
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in response');
      }

      return content;
    } catch (err) {
      lastError = err as Error;
      
      // Better error messages for common issues
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          lastError = new Error('Timeout: A requisição demorou muito (>60s). Tente um mapa menor ou verifique sua conexão.');
        } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          lastError = new Error('API key inválida ou ausente. Configure em Settings.');
        } else if (err.message.includes('429')) {
          lastError = new Error('Limite de requisições excedido. Aguarde alguns minutos.');
        } else if (err.message.includes('Failed to fetch')) {
          lastError = new Error('Erro de conexão. Verifique sua internet ou a URL da API.');
        }
      }
      
      if (attempt < maxRetries) {
        // Wait 1s before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError || new Error('LLM call failed');
}

// ── Main Function ─────────────────────────────────────────────────────────────
export async function generateKnowledgeMap(
  request: RhizomeSearchRequest
): Promise<KnowledgeMap> {
  const { query, mapSize, outputStyle, apiKey: providedKey, modelId, baseURL: providedBaseURL } = request;

  // Resolve configuration
  const apiKey = getAPIKey(providedKey);
  if (!apiKey) {
    throw new Error('API key not configured. Please set VITE_RHIZOME_LLM_API_KEY or provide it in settings.');
  }

  const baseURL = getBaseURL(providedBaseURL);
  const model = getModelID(modelId);
  const nodeCount = MAP_SIZE_NODE_COUNT[mapSize];

  // Build prompt
  const systemPrompt = RHIZOME_SEARCH_SYSTEM_PROMPT;
  const userPrompt = buildUserPrompt(query, nodeCount, outputStyle);

  // Call LLM
  const rawText = await callLLM(apiKey, baseURL, model, systemPrompt, userPrompt);

  // Parse JSON
  let rawJson: any;
  try {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : rawText;
    rawJson = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`Failed to parse LLM response as JSON: ${(err as Error).message}`);
  }

  // Validate
  const map = validateKnowledgeMap(rawJson);

  // Add metadata
  map.query = query;
  map.mapSize = mapSize;
  map.outputStyle = outputStyle;
  map.generatedAt = Date.now();

  return map;
}
