import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { createTimestampChunks } from "../chunking.js";
import { indexDocumentsBatched } from "../vectorStore.js";
import { splitAudio, removePathIfExists } from "../media/ffmpeg.js";
import { transcribePartsWithOffsets } from "../media/transcribe.js";

const execFileAsync = promisify(execFile);

const YOUTUBE_URL_RE =
  /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?[^#\s]*v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/i;

/**
 * Validate a YouTube URL (watch, shorts, embed, live, youtu.be share links).
 * Returns `{ videoId, watchUrl }` or `null` when the URL is not a YouTube video.
 */
export function parseYoutubeUrl(url) {
  if (typeof url !== "string") return null;
  const match = url.trim().match(YOUTUBE_URL_RE);
  if (!match) return null;
  return {
    videoId: match[1],
    watchUrl: `https://www.youtube.com/watch?v=${match[1]}`,
  };
}

async function runYtDlp(args, cwd) {
  // --js-runtimes node: Node is installed here, and YouTube extraction
  // increasingly requires a JS runtime (n-sig deciphering).
  const fullArgs = ["--js-runtimes", "node", ...args];
  try {
    return await execFileAsync(config.ytDlpBinary, fullArgs, {
      cwd,
      timeout: 10 * 60 * 1000,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (err) {
    if (err?.code === "ENOENT") {
      throw new Error(
        `yt-dlp not found (looked for "${config.ytDlpBinary}"). Install it: https://github.com/yt-dlp/yt-dlp#installation`
      );
    }
    const lines = (err?.stderr ?? "")
      .toString()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !l.startsWith("WARNING:"));
    const errLine =
      [...lines].reverse().find((l) => l.startsWith("ERROR:")) ??
      lines.slice(-2).join(" ");
    throw new Error(`yt-dlp failed: ${errLine || err.message}`);
  }
}

/**
 * Download a YouTube video's audio track as mp3 and fetch its title.
 * Exported so callers (and smoke tests) can exercise the download alone.
 */
export async function downloadYoutubeAudio(watchUrl, outDir) {
  fs.mkdirSync(outDir, { recursive: true });

  const { stdout: titleOut } = await runYtDlp(
    ["--no-playlist", "--skip-download", "--print", "%(title)s", watchUrl],
    outDir
  );
  const title = titleOut.trim() || "YouTube video";

  await runYtDlp(
    [
      "--no-playlist",
      "--no-progress",
      "-f",
      "bestaudio[ext=m4a]/bestaudio/best",
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "96K",
      "-o",
      "audio.%(ext)s",
      watchUrl,
    ],
    outDir
  );

  const audioFile = path.join(outDir, "audio.mp3");
  if (!fs.existsSync(audioFile)) {
    throw new Error("yt-dlp finished but audio.mp3 was not created.");
  }
  return { audioFile, title };
}

/**
 * Index a YouTube video: download audio -> split -> Whisper each part ->
 * timestamp chunks -> Qdrant. Long videos are safe: audio is split into
 * ~5 min parts (same as the audio pipeline) to stay under Whisper limits.
 */
export async function indexYoutube(url, opts = {}) {
  const parsed = parseYoutubeUrl(url);
  if (!parsed) {
    throw new Error("Not a valid YouTube watch/shorts/share URL.");
  }
  const onProgress = opts.onProgress;
  const segmentSeconds = opts.segmentSeconds ?? config.audioSegmentSeconds;
  // Unique scratch dir per run so concurrent jobs never collide.
  const tmpDir = path.join(
    opts.tmpDir ?? config.youtubeTmpDir,
    `yt_${parsed.videoId}_${Date.now()}`
  );

  logger.info(`Starting YouTube indexing: ${parsed.watchUrl}`);

  try {
    onProgress?.({ phase: "downloading" });
    const { audioFile, title } = await downloadYoutubeAudio(
      parsed.watchUrl,
      tmpDir
    );
    logger.info(`Downloaded: ${title}`);

    const audioParts = await splitAudio(audioFile, {
      tmpDir: path.join(tmpDir, "parts"),
      segmentSeconds,
    });
    const allSegments = await transcribePartsWithOffsets(audioParts, {
      segmentSeconds,
      onProgress,
      apiKey: opts.apiKey,
    });

    onProgress?.({ phase: "chunking" });
    const chunks = createTimestampChunks(allSegments, {
      chunkSize: opts.chunkSize ?? config.textChunkSize,
      chunkOverlap: opts.chunkOverlap ?? config.textChunkOverlap,
      sourceType: "youtube",
      sourceName: title,
    });
    chunks.forEach((doc) => {
      doc.metadata.source_url = parsed.watchUrl;
      doc.metadata.video_id = parsed.videoId;
      // Unique run id — lets vector deletes target exactly this source's chunks.
      if (opts.sourceId) doc.metadata.source_id = opts.sourceId;
    });
    logger.info(`Total RAG chunks: ${chunks.length}`);

    await indexDocumentsBatched(chunks, {
      ...opts.index,
      onProgress,
      apiKey: opts.apiKey,
      embeddingModel: opts.embeddingModel,
    });
    logger.info("YouTube indexing completed successfully.");
    return {
      videoId: parsed.videoId,
      title,
      url: parsed.watchUrl,
      segments: allSegments.length,
      chunks: chunks.length,
    };
  } finally {
    if (opts.cleanup !== false) {
      removePathIfExists(tmpDir);
      logger.info("Temporary YouTube files deleted.");
    }
  }
}
