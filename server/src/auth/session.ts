import { SignJWT, jwtVerify } from "jose";
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

export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      // NOTE: set secure: true when serving over HTTPS in production.
      secure: false,
      sameSite: "lax" as const,
      path: "/",
      maxAge: MAX_AGE_SECONDS * 1000,
    },
  };
}
