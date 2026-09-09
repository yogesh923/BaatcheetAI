import path from "path";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { createTimestampChunks } from "../chunking.js";
import { indexDocumentsBatched } from "../vectorStore.js";
import { splitAudio, removePathIfExists } from "../media/ffmpeg.js";
import { transcribePartsWithOffsets } from "../media/transcribe.js";

/**
 * Index an audio file: split -> Whisper each part -> timestamp chunks -> Qdrant.
 * Preserves original audio_indexing.js behaviour (chunkSize 1000, no overlap).
 */
export async function indexAudio(audioFile = "all_ai_terms.mp3", opts = {}) {
  const tmpDir = opts.tmpDir ?? config.audioTmpDir;
  const segmentSeconds = opts.segmentSeconds ?? config.audioSegmentSeconds;
  const onProgress = opts.onProgress;
  logger.info("Starting audio indexing...");

  try {
    onProgress?.({ phase: "splitting" });
    const audioParts = await splitAudio(audioFile, { tmpDir, segmentSeconds });
    const allSegments = await transcribePartsWithOffsets(audioParts, {
      segmentSeconds,
      onProgress,
      apiKey: opts.apiKey,
    });

    onProgress?.({ phase: "chunking" });
    const chunks = createTimestampChunks(allSegments, {
      chunkSize: opts.chunkSize ?? config.textChunkSize,
      chunkOverlap: 0, // original audio pipeline: no overlap
      sourceType: "audio",
      sourceName: path.basename(audioFile),
    });
    logger.info(`Total RAG chunks: ${chunks.length}`);

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
    logger.info("Audio indexing completed successfully.");
    return { segments: allSegments.length, chunks: chunks.length };
  } finally {
    if (opts.cleanup !== false) {
      removePathIfExists(tmpDir);
      logger.info("Temporary audio files deleted.");
    }
  }
}
