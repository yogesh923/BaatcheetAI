import { Google, GitHub, generateState, generateCodeVerifier } from "arctic";
import { env } from "../env.js";

export interface OAuthProfile {
  provider: "google" | "github";
  providerId: string;
  email: string;
  name: string | null;
  image: string | null;
}

function googleClient(): Google {
  if (!env.googleId || !env.googleSecret) {
    throw new Error("Google OAuth is not configured (GOOGLE_CLIENT_ID/SECRET).");
  }
  return new Google(
    env.googleId,
    env.googleSecret,
    `${env.appUrl}/api/auth/google/callback`
  );
}

function githubClient(): GitHub {
  if (!env.githubId || !env.githubSecret) {
    throw new Error("GitHub OAuth is not configured (GITHUB_CLIENT_ID/SECRET).");
  }
  return new GitHub(
    env.githubId,
    env.githubSecret,
    `${env.appUrl}/api/auth/github/callback`
  );
}

export function googleStart(): { url: string; state: string; verifier: string } {
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = googleClient().createAuthorizationURL(state, verifier, [
    "openid",
    "profile",
    "email",
  ]);
  return { url: url.toString(), state, verifier };
}

export function githubStart(): { url: string; state: string } {
  const state = generateState();
  const url = githubClient().createAuthorizationURL(state, ["read:user", "user:email"]);
  return { url: url.toString(), state };
}

export async function googleProfile(
  code: string,
  verifier: string
): Promise<OAuthProfile> {
  const tokens = await googleClient().validateAuthorizationCode(code, verifier);
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.accessToken()}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Google profile.");
  const data = (await res.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!data.sub || !data.email) throw new Error("Google profile is missing an email.");
  return {
    provider: "google",
    providerId: data.sub,
    email: data.email,
    name: data.name ?? null,
    image: data.picture ?? null,
  };
}

export async function githubProfile(code: string): Promise<OAuthProfile> {
  const tokens = await githubClient().validateAuthorizationCode(code);
  const headers = {
    Authorization: `Bearer ${tokens.accessToken()}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "baatcheet",
  };
  const meRes = await fetch("https://api.github.com/user", { headers });
  if (!meRes.ok) throw new Error("Failed to fetch GitHub profile.");
  const me = (await meRes.json()) as {
    id?: number;
    login?: string;
    name?: string;
    email?: string | null;
    avatar_url?: string;
  };
  let email = me.email ?? null;
  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as {
        email: string;
        primary: boolean;
        verified: boolean;
      }[];
      email =
        emails.find((e) => e.primary && e.verified)?.email ??
        emails.find((e) => e.verified)?.email ??
        null;
    }
  }
  if (me.id == null || !email) {
    throw new Error("GitHub profile is missing a verified email.");
  }
  return {
    provider: "github",
    providerId: String(me.id),
    email,
    name: me.name ?? me.login ?? null,
    image: me.avatar_url ?? null,
  };
}
