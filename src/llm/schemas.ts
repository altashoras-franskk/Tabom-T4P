// ─────────────────────────────────────────────────────────────────────────────
// LLM Schemas — Manual JSON validation (no Zod dep)
// ─────────────────────────────────────────────────────────────────────────────
import type { LLMRefineOutput, LLMClusterOutput } from '../sim/language/types';

type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string };

function isString(v: unknown): v is string { return typeof v === 'string'; }
function isNumber(v: unknown): v is number { return typeof v === 'number' && isFinite(v); }
function isArray(v: unknown): v is unknown[] { return Array.isArray(v); }
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// ── Validate refine_entry output ──────────────────────────────────────────────
export function validateRefineOutput(raw: unknown): ValidationResult<LLMRefineOutput> {
  if (!isObject(raw)) return { ok: false, error: 'Not an object' };

  const gloss       = raw.gloss;
  const definition  = raw.definition;
  const usage       = raw.usage;
  const contrasts   = raw.contrasts;
  const tags        = raw.tags;
  const confidence  = raw.confidence;
  const needs_ver   = raw.needs_verification;
  const rationale   = raw.rationale;

  if (!isString(gloss))      return { ok: false, error: 'Missing gloss' };
  if (!isString(definition)) return { ok: false, error: 'Missing definition' };
  if (!isString(usage))      return { ok: false, error: 'Missing usage' };
  if (!isArray(contrasts))   return { ok: false, error: 'contrasts must be array' };
  if (!isArray(tags))        return { ok: false, error: 'tags must be array' };
  if (!isNumber(confidence)) return { ok: false, error: 'confidence must be number' };
  if (typeof needs_ver !== 'boolean') return { ok: false, error: 'needs_verification must be boolean' };
  if (!isString(rationale))  return { ok: false, error: 'Missing rationale' };

  return {
    ok: true,
    data: {
      gloss:              gloss.slice(0, 60),
      definition:         definition.slice(0, 200),
      usage:              usage.slice(0, 200),
      contrasts:          (contrasts as unknown[]).filter(isString).map(s => (s as string).slice(0, 40)),
      tags:               (tags as unknown[]).filter(isString).map(s => (s as string).slice(0, 30)),
      confidence:         Math.max(0, Math.min(1, confidence as number)),
      needs_verification: needs_ver as boolean,
      rationale:          (rationale as string).slice(0, 300),
    },
  };
}

// ── Validate cluster_lexicon output ──────────────────────────────────────────
export function validateClusterOutput(raw: unknown): ValidationResult<LLMClusterOutput> {
  if (!isObject(raw)) return { ok: false, error: 'Not an object' };

  const clusters = raw.clusters;
  const bridges  = raw.bridges;
  const notes    = raw.notes;

  if (!isArray(clusters)) return { ok: false, error: 'clusters must be array' };
  if (!isArray(bridges))  return { ok: false, error: 'bridges must be array' };
  if (!isString(notes))   return { ok: false, error: 'Missing notes' };

  const validClusters = (clusters as unknown[]).filter(isObject).map((c) => ({
    id:      isString(c.id)      ? c.id      : String(Math.random()),
    label:   isString(c.label)   ? c.label   : 'cluster',
    members: isArray(c.members)  ? (c.members as unknown[]).filter(isString) as string[] : [],
  }));

  return {
    ok: true,
    data: {
      clusters: validClusters,
      bridges:  (bridges as unknown[]).filter(isString) as string[],
      notes:    (notes as string).slice(0, 400),
    },
  };
}

// ── Safe JSON parse ───────────────────────────────────────────────────────────
export function safeParseJSON(text: string): unknown {
  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
