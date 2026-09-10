import { unlink } from "node:fs/promises";
import path from "node:path";
import {
  setJobStatus,
  setJobProgress,
  pushJobLog,
} from "./store.js";
import { prisma } from "../db.js";
import {
  addLogListener,
  indexPdf,
  indexAudio,
  indexVideo,
  indexWebsite,
  type BackendIndexResult,
  type BackendLogEntry,
  type BackendProgress,
} from "../backend.js";

export function backendTmp(...parts: string[]): string {
  // Server runs from server/ — keep ffmpeg scratch next to the backend's ./tmp.
  return path.resolve(process.cwd(), "..", "tmp", ...parts);
}

export type JobInput =
  | { kind: "pdf" | "audio" | "video"; filePath: string; fileName: string }
  | { kind: "website"; url: string; sourceName: string };

/** Caller-owned OpenAI credentials — memory only, never persisted. */
export interface JobCreds {
  apiKey: string;
  embeddingModel: string;
}

/** Run an indexing job in the background, streaming logs/progress into the job store. */
export async function runIndexJob(
  jobId: string,
  userId: string,
  input: JobInput,
  creds: JobCreds
): Promise<void> {
  const startedAt = Date.now();
  setJobStatus(jobId, "running");

  const off = addLogListener((entry: BackendLogEntry) => pushJobLog(jobId, entry));
  const onProgress = (p: BackendProgress): void => {
    setJobProgress(jobId, {
      phase: p.phase,
      done: p.done ?? null,
      total: p.total ?? null,
    });
  };

  try {
    let result: BackendIndexResult;
    const credOpts = {
      apiKey: creds.apiKey,
      embeddingModel: creds.embeddingModel,
      // Unique per run — stamped on every chunk so deletes target exactly it.
      sourceId: jobId,
    };
    if (input.kind === "pdf") {
      result = await indexPdf(input.filePath, { onProgress, ...credOpts });
    } else if (input.kind === "audio") {
      result = await indexAudio(input.filePath, {
        tmpDir: backendTmp("audio_parts"),
        onProgress,
        ...credOpts,
      });
    } else if (input.kind === "video") {
      result = await indexVideo(input.filePath, {
        tmpDir: backendTmp("video"),
        onProgress,
        ...credOpts,
      });
    } else if (input.kind === "website") {
      result = await indexWebsite(input.url, {
        sourceName: input.sourceName,
        onProgress,
        ...credOpts,
      });
    } else {
      // Exhaustiveness guard — JobInput has no other kinds.
      throw new Error(`Unsupported job kind: ${(input as { kind: string }).kind}`);
    }

    setJobProgress(jobId, { phase: "done", done: 1, total: 1 });
    setJobStatus(jobId, "done", { result });

    const label = input.kind === "website" ? input.sourceName || input.url : input.fileName;
    const detail = input.kind === "website" ? input.url : undefined;

    await prisma.indexedSource.create({
      data: {
        userId,
        type: input.kind,
        label,
        detail,
        sourceId: jobId,
        chunks: result.chunks ?? null,
        segments: result.segments ?? null,
        documents: result.documents ?? null,
        durationMs: Date.now() - startedAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Indexing failed.";
    setJobProgress(jobId, { phase: "error" });
    setJobStatus(jobId, "error", { error: message });
  } finally {
    off();
    if ((input.kind === "pdf" || input.kind === "audio" || input.kind === "video") && input.filePath) {
      await unlink(input.filePath).catch(() => {});
    }
  }
}
