import { Router, type Response } from "express";
import { prisma } from "../db.js";
import { requireUser, type AuthedRequest } from "../auth/requireUser.js";
import { deleteSourceVectors } from "../backend.js";

const router = Router();

/** GET /api/history — newest-first list of this user's indexed sources. */
router.get("/", requireUser, async (req: AuthedRequest, res: Response) => {
  const rows = await prisma.indexedSource.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({
    ok: true,
    entries: rows.map((r) => ({
      id: r.id,
      type: r.type,
      label: r.label,
      detail: r.detail ?? undefined,
      chunks: r.chunks ?? undefined,
      segments: r.segments ?? undefined,
      documents: r.documents ?? undefined,
      durationMs: r.durationMs,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

/** DELETE /api/history?id=… — remove a source AND its vectors. */
router.delete("/", requireUser, async (req: AuthedRequest, res: Response) => {
  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) {
    res.status(400).json({ ok: false, error: "id is required." });
    return;
  }
  const row = await prisma.indexedSource.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!row) {
    res.status(404).json({ ok: false, error: "Entry not found." });
    return;
  }
  // Vectors first: if Qdrant is unreachable we keep the record rather than
  // orphaning chunks. No OpenAI key needed — deletes are pure filter ops.
  // Rows indexed before source-stamping (sourceId null) only clear the record.
  let vectorsDeleted = false;
  if (row.sourceId) {
    try {
      await deleteSourceVectors(row.sourceId);
      vectorsDeleted = true;
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: `Could not reach the vector collection (${err instanceof Error ? err.message : "unknown error"}). Record kept — try again.`,
      });
      return;
    }
  }
  await prisma.indexedSource.delete({ where: { id: row.id } });
  res.json({ ok: true, vectorsDeleted });
});

export default router;
