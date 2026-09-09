import { Router, type Request, type Response } from "express";
import { requireUser } from "../auth/requireUser.js";
import { requireApiKey, parseChatModel, parseEmbeddingModel } from "../models.js";
import { askWithContext } from "../backend.js";

const router = Router();

/** POST /api/chat — grounded answer + retrieved sources. */
router.post("/", requireUser, async (req: Request, res: Response) => {
  const message = String(req.body?.message ?? "").trim();
  if (!message) {
    res.status(400).json({ ok: false, error: "Message is required." });
    return;
  }
  const apiKey = requireApiKey(req, res);
  if (!apiKey) return;
  const chat = parseChatModel(req.body?.chatModel);
  if (!chat.ok) {
    res.status(400).json({ ok: false, error: chat.error });
    return;
  }
  const emb = parseEmbeddingModel(req.body?.embeddingModel);
  if (!emb.ok) {
    res.status(400).json({ ok: false, error: emb.error });
    return;
  }
  try {
    const { answer, sources } = await askWithContext(message, {
      apiKey,
      chatModel: chat.value,
      embeddingModel: emb.value,
    });
    res.json({ ok: true, answer, sources });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "Chat failed." });
  }
});

export default router;
