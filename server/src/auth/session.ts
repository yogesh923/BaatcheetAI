import { SignJWT, jwtVerify } from "jose";
import type { CookieOptions } from "express";
import { env } from "../env.js";

const ALG = "HS256";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const SESSION_COOKIE = "baatcheet_session";

function key(): Uint8Array {
  return new TextEncoder().encode(env.jwtSecret);
}

/** Mint a 7-day session JWT for a user id. */
export async function mintSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS} seconds`)
    .sign(key());
}

/** Return the user id from a session token, or null when missing/invalid. */
export async function readSession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: [ALG] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): {
  name: string;
  value: string;
  options: CookieOptions;
} {
  // Production serves UI and API on different sites (Vercel ↔ Render), so
  // the session cookie must be SameSite=None + Secure — browsers silently
  // drop Lax cross-site fetch cookies, which strands users on /login after
  // a successful signup. Local dev (same-site localhost) keeps Lax.
  const isProd = process.env.NODE_ENV === "production";
  return {
    name: SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : ("lax" as const),
      path: "/",
      maxAge: MAX_AGE_SECONDS * 1000,
    },
  };
}
