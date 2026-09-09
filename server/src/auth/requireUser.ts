import type { Request, Response, NextFunction } from "express";
import { readSession, SESSION_COOKIE } from "./session.js";

export interface AuthedRequest extends Request {
  userId?: string;
}

/** Express guard — 401 JSON when the session cookie is missing/invalid. */
export async function requireUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = await readSession(req.cookies?.[SESSION_COOKIE]);
  if (!userId) {
    res.status(401).json({ ok: false, error: "Unauthorized. Please sign in." });
    return;
  }
  req.userId = userId;
  next();
}
