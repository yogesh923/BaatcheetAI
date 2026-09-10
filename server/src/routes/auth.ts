import { Router, type Request, type Response } from "express";
import { prisma } from "../db.js";
import {
  isValidEmail,
  normalizeEmail,
  hashPassword,
  verifyPassword,
} from "../auth/password.js";
import { mintSession, sessionCookie, SESSION_COOKIE } from "../auth/session.js";
import {
  googleStart,
  githubStart,
  googleProfile,
  githubProfile,
  type OAuthProfile,
} from "../auth/oauth.js";
import { requireUser, type AuthedRequest } from "../auth/requireUser.js";
import { env } from "../env.js";

const router = Router();

const OAUTH_STATE_COOKIE = "baatcheet_oauth_state";
const OAUTH_VERIFIER_COOKIE = "baatcheet_oauth_verifier";

type SafeUser = { id: string; email: string; name: string | null; image: string | null };

function safeUser(u: SafeUser): SafeUser {
  return { id: u.id, email: u.email, name: u.name, image: u.image };
}

async function setSessionCookie(res: Response, userId: string): Promise<void> {
  const c = sessionCookie(await mintSession(userId));
  res.cookie(c.name, c.value, c.options);
}

/** Link (or create) a user for an OAuth profile. */
async function upsertOAuthUser(profile: OAuthProfile) {
  const email = normalizeEmail(profile.email);
  const linked = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerId: { provider: profile.provider, providerId: profile.providerId },
    },
    include: { user: true },
  });
  if (linked) {
    const patch: { name?: string | null; image?: string | null } = {};
    if (!linked.user.name && profile.name) patch.name = profile.name;
    if (!linked.user.image && profile.image) patch.image = profile.image;
    return Object.keys(patch).length > 0
      ? await prisma.user.update({ where: { id: linked.user.id }, data: patch })
      : linked.user;
  }
  const byEmail = await prisma.user.findUnique({ where: { email } });
  const user =
    byEmail ??
    (await prisma.user.create({
      data: { email, name: profile.name, image: profile.image },
    }));
  await prisma.oAuthAccount.create({
    data: { provider: profile.provider, providerId: profile.providerId, userId: user.id },
  });
  return user;
}

function oauthCookieOptions() {
  return {
    httpOnly: true,
    secure: false, // NOTE: set secure: true when serving over HTTPS in production.
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60 * 1000,
  };
}

router.post("/signup", async (req: Request, res: Response) => {
  const { name, email, password } = (req.body ?? {}) as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
  };
  if (typeof email !== "string" || !isValidEmail(email)) {
    res.status(400).json({ ok: false, error: "Enter a valid email address." });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ ok: false, error: "Password must be at least 8 characters." });
    return;
  }
  const norm = normalizeEmail(email);
  const existing = await prisma.user.findUnique({ where: { email: norm } });
  if (existing) {
    res.status(409).json({ ok: false, error: "An account with this email already exists." });
    return;
  }
  const user = await prisma.user.create({
    data: {
      email: norm,
      name: typeof name === "string" && name.trim() ? name.trim().slice(0, 100) : null,
      passwordHash: await hashPassword(password),
    },
  });
  await setSessionCookie(res, user.id);
  res.status(201).json({ ok: true, user: safeUser(user) });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = (req.body ?? {}) as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ ok: false, error: "Email and password are required." });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user || !user.passwordHash) {
    res.status(401).json({
      ok: false,
      error: user
        ? "This email uses Google/GitHub sign-in — no password is set."
        : "Incorrect email or password.",
    });
    return;
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ ok: false, error: "Incorrect email or password." });
    return;
  }
  await setSessionCookie(res, user.id);
  res.json({ ok: true, user: safeUser(user) });
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

router.get("/me", requireUser, async (req: AuthedRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, email: true, name: true, image: true },
  });
  if (!user) {
    res.status(404).json({ ok: false, error: "User not found." });
    return;
  }
  res.json({ ok: true, user });
});

router.get("/google", (_req: Request, res: Response) => {
  try {
    const { url, state, verifier } = googleStart();
    res.cookie(OAUTH_STATE_COOKIE, state, oauthCookieOptions());
    res.cookie(OAUTH_VERIFIER_COOKIE, verifier, oauthCookieOptions());
    res.redirect(url);
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "OAuth failed." });
  }
});

router.get("/github", (_req: Request, res: Response) => {
  try {
    const { url, state } = githubStart();
    res.cookie(OAUTH_STATE_COOKIE, state, oauthCookieOptions());
    res.redirect(url);
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "OAuth failed." });
  }
});

router.get("/google/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    if (typeof code !== "string" || typeof state !== "string") throw new Error("Invalid callback.");
    if (state !== req.cookies?.[OAUTH_STATE_COOKIE]) throw new Error("State mismatch.");
    const verifier = req.cookies?.[OAUTH_VERIFIER_COOKIE];
    if (typeof verifier !== "string") throw new Error("Missing verifier.");
    const user = await upsertOAuthUser(await googleProfile(code, verifier));
    await setSessionCookie(res, user.id);
    // NOTE: appUrl (single origin), never webUrl — webUrl may be a
    // comma-separated CORS allow-list, which is not a valid redirect target.
    res.redirect(`${env.appUrl}/app`);
  } catch (err) {
    res.redirect(
      `${env.appUrl}/login?error=${encodeURIComponent(err instanceof Error ? err.message : "OAuth failed.")}`
    );
  } finally {
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });
    res.clearCookie(OAUTH_VERIFIER_COOKIE, { path: "/" });
  }
});

router.get("/github/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    if (typeof code !== "string" || typeof state !== "string") throw new Error("Invalid callback.");
    if (state !== req.cookies?.[OAUTH_STATE_COOKIE]) throw new Error("State mismatch.");
    const user = await upsertOAuthUser(await githubProfile(code));
    await setSessionCookie(res, user.id);
    // NOTE: appUrl (single origin), never webUrl — see google callback above.
    res.redirect(`${env.appUrl}/app`);
  } catch (err) {
    res.redirect(
      `${env.appUrl}/login?error=${encodeURIComponent(err instanceof Error ? err.message : "OAuth failed.")}`
    );
  } finally {
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });
  }
});

export default router;
