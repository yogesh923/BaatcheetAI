import { Router, type Request, type Response } from "express";
import multer from "multer";
import { mkdirSync } from "node:fs";
import { unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createJob, getJob } from "../jobs/store.js";
import { runIndexJob, type JobInput } from "../jobs/runner.js";
import { requireUser, type AuthedRequest } from "../auth/requireUser.js";
import { requireApiKey, parseEmbeddingModel } from "../models.js";

const router = Router();

const UPLOAD_DIR = path.join(os.tmpdir(), "rag-uploads");

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1 GB — long videos are split before Whisper
});

type FileRequest = AuthedRequest & { file?: Express.Multer.File };

/** POST /api/jobs — validate input, stage upload, create a job and start it. */
router.post("/", requireUser, upload.single("file"), async (req: FileRequest, res: Response) => {
  const userId = req.userId!;
  const type = String(req.body?.type ?? "");
  let stagedPath: string | null = req.file?.path ?? null;

  const apiKey = requireApiKey(req, res);
  if (!apiKey) return;
  const emb = parseEmbeddingModel(req.body?.embeddingModel);
  if (!emb.ok) {
    res.status(400).json({ ok: false, error: emb.error });
    return;
  }
  const creds = { apiKey, embeddingModel: emb.value };

  try {
    if (type === "website") {
      const url = String(req.body?.url ?? "").trim();
      const sourceName = String(req.body?.sourceName ?? "").trim() || "Website";
      if (!url) {
        res.status(400).json({ ok: false, error: "URL is required." });
        return;
      }
      const job = createJob(userId, "website", sourceName);
      void runIndexJob(job.id, userId, { kind: "website", url, sourceName }, creds);
      res.json({ ok: true, jobId: job.id });
      return;
    }

    if (type !== "pdf" && type !== "audio" && type !== "video") {
      res.status(400).json({ ok: false, error: `Unsupported type: ${type || "(missing)"}.` });
      return;
    }

    if (!req.file || !stagedPath) {
      res.status(400).json({ ok: false, error: "A file upload is required." });
      return;
    }

    const job = createJob(userId, type, req.file.originalname);
    const input: JobInput = { kind: type, filePath: stagedPath, fileName: req.file.originalname };
    stagedPath = null; // runner owns the staged file from here (cleanup in finally)
    void runIndexJob(job.id, userId, input, creds);
    res.json({ ok: true, jobId: job.id });
  } finally {
    if (stagedPath) await unlink(stagedPath).catch(() => {});
  }
});

/** GET /api/jobs?id=… — poll the current job state. */
router.get("/", requireUser, (req: AuthedRequest, res: Response) => {
  const job = getJob(req.userId!, typeof req.query.id === "string" ? req.query.id : null);
  if (!job) {
    res.status(404).json({ ok: false, error: "Job not found." });
    return;
  }
  res.json({ ok: true, job });
});

/** GET /api/jobs/stream?id=… — Server-Sent Events: live logs + progress. */
router.get("/stream", requireUser, (req: AuthedRequest, res: Response) => {
  const job = getJob(req.userId!, typeof req.query.id === "string" ? req.query.id : null);
  if (!job) {
    res.status(404).json({ ok: false, error: "Job not found." });
    return;
  }
  const id = job.id;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const send = (event: string, data: unknown): void => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const current = (): ReturnType<typeof getJob> => getJob(req.userId!, id);
  let cursor = job.logs.length;
  let lastProgress = JSON.stringify(job.progress);
  send("state", job);

  const timer = setInterval(() => {
    const j = current();
    if (!j) {
      clearInterval(timer);
      res.end();
      return;
    }
    for (const log of j.logs.slice(cursor)) send("log", log);
    cursor = j.logs.length;
    const progressKey = JSON.stringify(j.progress);
    if (progressKey !== lastProgress) {
      lastProgress = progressKey;
      send("progress", j.progress);
    }
    if (j.status === "done" || j.status === "error") {
      send(j.status, j);
      clearInterval(timer);
      res.end();
    }
  }, 400);

  req.on("close", () => {
    clearInterval(timer);
  });
});

export default router;
