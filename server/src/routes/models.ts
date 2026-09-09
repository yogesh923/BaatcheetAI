import { Router, type Request, type Response } from "express";
import { requireUser } from "../auth/requireUser.js";
import {
  EMBEDDING_MODELS,
  CHAT_MODELS,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_CHAT_MODEL,
} from "../models.js";

const router = Router();

/** GET /api/models — curated embedding + chat model lists for the UI pickers. */
router.get("/", requireUser, (_req: Request, res: Response) => {
  res.json({
    ok: true,
    embeddingModels: [...EMBEDDING_MODELS],
    chatModels: [...CHAT_MODELS],
    defaults: {
      embeddingModel: DEFAULT_EMBEDDING_MODEL,
      chatModel: DEFAULT_CHAT_MODEL,
    },
  });
});

export default router;
