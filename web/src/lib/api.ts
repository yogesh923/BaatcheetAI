// Base URL of the Express API (server/). The browser ALWAYS uses a relative
// URL — Next.js rewrites /api/* to the API (same origin), which keeps the
// session cookie first-party. Server-side callers use API_INTERNAL_URL.
export const API_URL =
  typeof window === "undefined"
    ? (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(/\/+$/, "")
    : "";

import { getApiKey } from "./credentials";

/** fetch() against the Express API with session cookies attached. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  // BYOK: the user's own OpenAI key rides along per request.
  // Auth/history endpoints ignore it; jobs/chat require it.
  const key = getApiKey();
  if (key && !headers.has("x-openai-key")) headers.set("x-openai-key", key);
  return fetch(`${API_URL}${path}`, { ...init, credentials: "include", headers });
}
