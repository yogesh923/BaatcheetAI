import { cookies } from "next/headers";
import { API_URL } from "./api";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

/** Server-side current user via the Express API (forwards the session cookie). */
export async function getSessionUser(): Promise<SessionUser | null> {
  // NOTE: must NOT use the public localhost URL here — inside the web
  // container localhost is itself. Compose provides API_INTERNAL_URL.
  const base = process.env.API_INTERNAL_URL ?? API_URL;
  try {
    const res = await fetch(`${base}/api/auth/me`, {
      headers: { cookie: (await cookies()).toString() },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.user ?? null;
  } catch {
    return null;
  }
}
