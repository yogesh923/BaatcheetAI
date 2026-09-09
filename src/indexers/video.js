import path from "path";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { createTimestampChunks } from "../chunking.js";
import { indexDocumentsBatched } from "../vectorStore.js";
import { extractAudioFromVideo, removePathIfExists } from "../media/ffmpeg.js";
import { transcribeFile } from "../media/transcribe.js";

/**
 * Index a video file: extract audio -> Whisper -> overlap chunks -> Qdrant.
 * Preserves original video_indexing.js behaviour (chunkSize 1000, overlap 200).
 */
export async function indexVideo(
  videoFile = "GPT_Astra_AI_Video_Automation.mp4",
  opts = {}
) {
  const tmpDir = opts.tmpDir ?? config.videoTmpDir;
  const onProgress = opts.onProgress;
  logger.info(`Starting video indexing: ${videoFile}`);
  let audioFile = null;
  try {
    onProgress?.({ phase: "extracting" });
    audioFile = await extractAudioFromVideo(videoFile, { tmpDir });
    onProgress?.({ phase: "transcribing" });
    const segments = await transcribeFile(audioFile, { apiKey: opts.apiKey });
    logger.info(`Transcription segments: ${segments.length}`);

    onProgress?.({ phase: "chunking" });
    const chunks = createTimestampChunks(segments, {
      chunkSize: opts.chunkSize ?? config.textChunkSize,
      chunkOverlap: opts.chunkOverlap ?? config.textChunkOverlap,
      sourceType: "video",
      sourceName: path.basename(videoFile),
      sourcePath: videoFile,
    });
    logger.info(`Created chunks: ${chunks.length}`);

    // Unique run id — lets vector deletes target exactly this source's chunks.
    if (opts.sourceId) {
      chunks.forEach((doc) => {
        doc.metadata.source_id = opts.sourceId;
      });
    }

    await indexDocumentsBatched(chunks, {
      ...opts.index,
      onProgress,
      apiKey: opts.apiKey,
      embeddingModel: opts.embeddingModel,
    });
    logger.info("Video indexing completed!");
    return { segments: segments.length, chunks: chunks.length };
  } finally {
    if (opts.cleanup !== false && audioFile) {
      removePathIfExists(audioFile);
    }
  }
}
