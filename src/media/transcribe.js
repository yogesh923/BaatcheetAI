import fs from "fs";
import { config } from "../config.js";
import { getOpenAIClient } from "../clients.js";
import { logger } from "../logger.js";

/** Transcribe one audio file with Whisper verbose_json segments. */
export async function transcribeFile(filePath, { apiKey } = {}) {
  logger.info(`Transcribing: ${filePath}`);
  const openai = getOpenAIClient(apiKey);
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: config.whisperModel,
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });
  return transcription.segments ?? [];
}

/**
 * Transcribe pre-split parts and rebase local timestamps
 * onto the original audio timeline.
 */
export async function transcribePartsWithOffsets(
  parts,
  { segmentSeconds, onProgress, apiKey } = {}
) {
  const segLen = segmentSeconds ?? config.audioSegmentSeconds;
  const allSegments = [];
  for (let i = 0; i < parts.length; i++) {
    const offset = i * segLen;
    const segments = await transcribeFile(parts[i], { apiKey });
    for (const s of segments) {
      allSegments.push({
        text: s.text,
        start: s.start + offset,
        end: s.end + offset,
      });
    }
    onProgress?.({ phase: "transcribing", done: i + 1, total: parts.length });
  }
  logger.info(`Total transcript segments: ${allSegments.length}`);
  return allSegments;
}
