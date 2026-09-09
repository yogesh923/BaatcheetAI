"use client";

// BYOK credentials — kept ONLY in this browser's localStorage.
// The API key is attached per request (x-openai-key header) and lives on
// the server in memory for that request/job only. It is never written to
// Postgres, logs, or disk. Models travel the same way.

const K = {
  key: "baatcheet:openai-key",
  emb: "baatcheet:embedding-model",
  chat: "baatcheet:chat-model",
} as const;

export const CREDENTIAL_DEFAULTS = {
  embeddingModel: "text-embedding-3-small",
  chatModel: "gpt-4o-mini",
};

function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

function lsSet(k: string, v: string): void {
  try {
    localStorage.setItem(k, v);
  } catch {
    // Private mode etc. — settings just won't persist.
  }
}

function lsDel(k: string): void {
  try {
    localStorage.removeItem(k);
  } catch {
    // no-op
  }
}

export function getApiKey(): string {
  return (lsGet(K.key) ?? "").trim();
}

export function getEmbeddingModel(): string {
  return lsGet(K.emb) ?? CREDENTIAL_DEFAULTS.embeddingModel;
}

export function getChatModel(): string {
  return lsGet(K.chat) ?? CREDENTIAL_DEFAULTS.chatModel;
}

export function saveCredentials(p: {
  apiKey: string;
  embeddingModel: string;
  chatModel: string;
}): void {
  lsSet(K.key, p.apiKey.trim());
  lsSet(K.emb, p.embeddingModel);
  lsSet(K.chat, p.chatModel);
}

export function clearApiKey(): void {
  lsDel(K.key);
}

/** Ask the header Settings dialog to open (e.g. submit without a key). */
export function requestApiKey(): void {
  window.dispatchEvent(new CustomEvent("baatcheet:need-key"));
}
