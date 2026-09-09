// Base URL of the Express API (server/). All app HTTP goes through Express —
// Next.js owns pages only. NEXT_PUBLIC_API_URL is exposed to the browser.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
