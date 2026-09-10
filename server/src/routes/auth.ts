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

type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  phone?: string | null;
  gender?: string | null;
  providers?: string[];
  hasPassword?: boolean;
};

function safeUser(u: SafeUser): SafeUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    phone: u.phone ?? null,
    gender: u.gender ?? null,
    providers: u.providers ?? [],
    hasPassword: u.hasPassword ?? false,
  };
}

const ME_SELECT = {
  id: true,
  email: true,
  name: true,
  image: true,
  phone: true,
  gender: true,
  passwordHash: true,
  accounts: { select: { provider: true } },
} as const;

function shapeMe(
  u: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    phone: string | null;
    gender: string | null;
    passwordHash: string | null;
    accounts: { provider: string }[];
  }
): SafeUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    phone: u.phone,
    gender: u.gender,
    providers: u.accounts.map((a) => a.provider),
    hasPassword: !!u.passwordHash,
  };
}

const GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const;

const PENDING_TTL_MS = 10 * 60 * 1000;
interface PendingLink {
  userId: string;
  provider: "google" | "github";
  verifier?: string;
  expiresAt: number;
}
// state → pending link intent. Memory-only; entries expire in 10 minutes.
const pendingLinks = new Map<string, PendingLink>();

function rememberLink(state: string, entry: Omit<PendingLink, "expiresAt">): void {
  for (const [k, v] of pendingLinks) {
    if (v.expiresAt <= Date.now()) pendingLinks.delete(k);
  }
  pendingLinks.set(state, { ...entry, expiresAt: Date.now() + PENDING_TTL_MS });
}

function takePendingLink(state: string): PendingLink | null {
  const entry = pendingLinks.get(state);
  pendingLinks.delete(state);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry;
}

const PROVIDER_LABEL: Record<string, string> = { google: "Google", github: "GitHub" };

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
    select: ME_SELECT,
  });
  if (!user) {
    res.status(404).json({ ok: false, error: "User not found." });
    return;
  }
  res.json({ ok: true, user: shapeMe(user) });
});

router.patch("/profile", requireUser, async (req: AuthedRequest, res: Response) => {
  const { name, phone, gender } = (req.body ?? {}) as {
    name?: unknown;
    phone?: unknown;
    gender?: unknown;
  };
  const data: { name?: string | null; phone?: string | null; gender?: string | null } = {};
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
      res.status(400).json({ ok: false, error: "Enter a name up to 100 characters." });
      return;
    }
    data.name = name.trim();
  }
  if (phone !== undefined) {
    const p = typeof phone === "string" ? phone.trim() : "";
    if (p && !/^[+\d][\d\s\-().]{5,19}$/.test(p)) {
      res.status(400).json({ ok: false, error: "Enter a valid phone number." });
      return;
    }
    data.phone = p || null;
  }
  if (gender !== undefined) {
    const g = typeof gender === "string" ? gender : "";
    if (g && !(GENDERS as readonly string[]).includes(g)) {
      res.status(400).json({ ok: false, error: "Choose a valid option." });
      return;
    }
    data.gender = g || null;
  }
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data,
    select: ME_SELECT,
  });
  res.json({ ok: true, user: shapeMe(user) });
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

/** Start an OAuth LINK (not login) for the signed-in user. */
function beginLink(
  res: Response,
  provider: "google" | "github",
  userId: string,
  start: () => { url: string; state: string; verifier?: string }
): void {
  const { url, state, verifier } = start();
  rememberLink(state, { userId, provider, verifier });
  res.cookie(OAUTH_STATE_COOKIE, state, oauthCookieOptions());
  if (verifier) res.cookie(OAUTH_VERIFIER_COOKIE, verifier, oauthCookieOptions());
  res.redirect(url);
}

router.get("/google/link", requireUser, (req: AuthedRequest, res: Response) => {
  try {
    beginLink(res, "google", req.userId!, () => googleStart());
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "OAuth failed." });
  }
});

router.get("/github/link", requireUser, (req: AuthedRequest, res: Response) => {
  try {
    beginLink(res, "github", req.userId!, () => githubStart());
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "OAuth failed." });
  }
});

/** Attach an OAuth profile to an existing user (link mode). */
async function linkOAuthAccount(userId: string, profile: OAuthProfile) {
  const clash = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerId: { provider: profile.provider, providerId: profile.providerId },
    },
  });
  if (clash) {
    if (clash.userId === userId) {
      const same = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      return same;
    }
    throw new Error(
      `This ${PROVIDER_LABEL[profile.provider] ?? profile.provider} account is already linked to a different account.`
    );
  }
  await prisma.oAuthAccount.create({
    data: { provider: profile.provider, providerId: profile.providerId, userId },
  });
  return prisma.user.findUniqueOrThrow({ where: { id: userId } });
}

/** Remove an OAuth link — refuses to strand a user with zero login methods. */
router.delete("/:provider/unlink", requireUser, async (req: AuthedRequest, res: Response) => {
  const provider = req.params.provider;
  if (provider !== "google" && provider !== "github") {
    res.status(404).json({ ok: false, error: "Unknown provider." });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    include: { accounts: true },
  });
  if (!user) {
    res.status(404).json({ ok: false, error: "User not found." });
    return;
  }
  const link = user.accounts.find((a) => a.provider === provider);
  if (!link) {
    res.status(404).json({ ok: false, error: "That account is not linked." });
    return;
  }
  const otherLogins = user.accounts.filter((a) => a.provider !== provider).length;
  if (!user.passwordHash && otherLogins === 0) {
    res.status(400).json({
      ok: false,
      error: "This is your only sign-in method. Set a password first.",
    });
    return;
  }
  await prisma.oAuthAccount.delete({ where: { id: link.id } });
  res.json({ ok: true });
});

router.get("/google/callback", async (req: Request, res: Response) => {
  // Consume link intent (if any) before validation can throw.
  const preState = typeof req.query.state === "string" ? takePendingLink(req.query.state) : null;
  const link = preState && preState.provider === "google" ? preState : null;
  const fail = (err: unknown): void => {
    const msg = err instanceof Error ? err.message : "OAuth failed.";
    const where = link ? "/app/profile" : "/login";
    res.redirect(`${env.appUrl}${where}?error=${encodeURIComponent(msg)}`);
  };
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    if (typeof code !== "string" || typeof state !== "string") throw new Error("Invalid callback.");
    if (state !== req.cookies?.[OAUTH_STATE_COOKIE]) throw new Error("State mismatch.");
    const verifier = req.cookies?.[OAUTH_VERIFIER_COOKIE];
    if (typeof verifier !== "string") throw new Error("Missing verifier.");
    if (link) {
      const user = await linkOAuthAccount(link.userId, await googleProfile(code, verifier));
      await setSessionCookie(res, user.id);
      res.redirect(`${env.appUrl}/app/profile?linked=google`);
      return;
    }
    const user = await upsertOAuthUser(await googleProfile(code, verifier));
    await setSessionCookie(res, user.id);
    // NOTE: appUrl (single origin), never webUrl — webUrl may be a
    // comma-separated CORS allow-list, which is not a valid redirect target.
    res.redirect(`${env.appUrl}/app`);
  } catch (err) {
    fail(err);
  } finally {
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });
    res.clearCookie(OAUTH_VERIFIER_COOKIE, { path: "/" });
  }
});

router.get("/github/callback", async (req: Request, res: Response) => {
  // Consume link intent (if any) before validation can throw.
  const preState = typeof req.query.state === "string" ? takePendingLink(req.query.state) : null;
  const link = preState && preState.provider === "github" ? preState : null;
  const fail = (err: unknown): void => {
    const msg = err instanceof Error ? err.message : "OAuth failed.";
    const where = link ? "/app/profile" : "/login";
    res.redirect(`${env.appUrl}${where}?error=${encodeURIComponent(msg)}`);
  };
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    if (typeof code !== "string" || typeof state !== "string") throw new Error("Invalid callback.");
    if (state !== req.cookies?.[OAUTH_STATE_COOKIE]) throw new Error("State mismatch.");
    if (link) {
      const user = await linkOAuthAccount(link.userId, await githubProfile(code));
      await setSessionCookie(res, user.id);
      res.redirect(`${env.appUrl}/app/profile?linked=github`);
      return;
    }
    const user = await upsertOAuthUser(await githubProfile(code));
    await setSessionCookie(res, user.id);
    // NOTE: appUrl (single origin), never webUrl — see google callback above.
    res.redirect(`${env.appUrl}/app`);
  } catch (err) {
    fail(err);
  } finally {
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });
  }
});

export default router;
