import type { Request, Response } from "express";

// Curated model lists — the single source of truth served to the UI via
// GET /api/models. Users pick from these; anything else is rejected so a
// typo can't silently burn money on an unexpected model.
export const EMBEDDING_MODELS = [
  "text-embedding-3-small",
  "text-embedding-3-large",
  "text-embedding-ada-002",
] as const;

export const CHAT_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1",
] as const;

export const DEFAULT_EMBEDDING_MODEL: string = EMBEDDING_MODELS[0];
export const DEFAULT_CHAT_MODEL: string = CHAT_MODELS[0];

/**
 * The caller's own OpenAI key, sent per request in the `x-openai-key`
 * header. Held in memory for the request/job only — never written to
 * Postgres, logs, or disk.
 */
export function apiKeyFrom(req: Request): string {
  const v = req.headers["x-openai-key"];
  return (Array.isArray(v) ? v[0] : (v ?? "")).trim();
}

export function requireApiKey(req: Request, res: Response): string | null {
  const key = apiKeyFrom(req);
  if (!key) {
    res.status(400).json({
      ok: false,
      error: "Add your OpenAI API key in Settings (gear icon, top right).",
    });
    return null;
  }
  return key;
}

export function parseEmbeddingModel(
  value: unknown
): { ok: true; value: string } | { ok: false; error: string } {
  const v = String(value ?? "").trim() || DEFAULT_EMBEDDING_MODEL;
  if (!(EMBEDDING_MODELS as readonly string[]).includes(v)) {
    return {
      ok: false,
      error: `Unsupported embedding model. Choose: ${EMBEDDING_MODELS.join(", ")}.`,
    };
  }
  return { ok: true, value: v };
}

export function parseChatModel(
  value: unknown
): { ok: true; value: string } | { ok: false; error: string } {
  const v = String(value ?? "").trim() || DEFAULT_CHAT_MODEL;
  if (!(CHAT_MODELS as readonly string[]).includes(v)) {
    return {
      ok: false,
      error: `Unsupported chat model. Choose: ${CHAT_MODELS.join(", ")}.`,
    };
  }
  return { ok: true, value: v };
}
