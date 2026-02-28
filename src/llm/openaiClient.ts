// ─────────────────────────────────────────────────────────────────────────────
// OpenAI Client — thin fetch wrapper, no SDK dependency
// Reads key: env → __APP_CONFIG__ → localStorage (saved in Rhizome Lab)
// ─────────────────────────────────────────────────────────────────────────────

import { loadOpenAIApiKey } from '../storage/userStorage';

declare global {
  interface Window {
    __APP_CONFIG__?: { OPENAI_API_KEY?: string; OPENAI_MODEL?: string };
  }
}

function getApiKey(): string | null {
  if (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY)
    return process.env.OPENAI_API_KEY;
  if (typeof window !== 'undefined') {
    if (window.__APP_CONFIG__?.OPENAI_API_KEY) return window.__APP_CONFIG__.OPENAI_API_KEY;
    const k = loadOpenAIApiKey();
    if (k) return k;
  }
  return null;
}

function getModel(): string {
  if (typeof process !== 'undefined' && process.env?.OPENAI_MODEL)
    return process.env.OPENAI_MODEL;
  if (typeof window !== 'undefined' && window.__APP_CONFIG__?.OPENAI_MODEL)
    return window.__APP_CONFIG__.OPENAI_MODEL ?? 'gpt-4o-mini';
  return 'gpt-4o-mini';
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIResponse {
  choices: { message: { content: string } }[];
}

export async function chatCompletion(
  messages: ChatMessage[],
  timeoutMs = 20000,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada. Defina em process.env.OPENAI_API_KEY ou window.__APP_CONFIG__.OPENAI_API_KEY');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getModel(),
        messages,
        temperature: 0.3,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`OpenAI ${res.status}: ${err}`);
    }

    const data: OpenAIResponse = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  } finally {
    clearTimeout(timer);
  }
}

export function hasApiKey(): boolean {
  return getApiKey() !== null;
}
