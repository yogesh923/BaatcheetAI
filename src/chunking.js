import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { config } from "./config.js";

/** Shared text splitter for PDF / website sources. */
export function getTextSplitter({ chunkSize, chunkOverlap } = {}) {
  return new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize ?? config.textChunkSize,
    chunkOverlap: chunkOverlap ?? config.textChunkOverlap,
  });
}

export async function splitTextDocuments(docs, opts) {
  const splitter = getTextSplitter(opts);
  return splitter.splitDocuments(docs);
}

export function formatTimestamp(seconds) {
  if (seconds == null || Number.isNaN(Number(seconds))) return "Unknown";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Timestamp-aware chunking for Whisper `segment` arrays.
 * Unifies audio_indexing.js (no overlap) and video_indexing.js (overlap).
 *
 * @param {Array<{text,start,end}>} segments
 * @param {object} opts
 * @param {number} opts.chunkSize   target chars per chunk
 * @param {number} opts.chunkOverlap chars of overlap carried to next chunk (0 = audio behaviour)
 * @param {string} opts.sourceType  "audio" | "video"
 * @param {string} opts.sourceName  basename e.g. "all_ai_terms.mp3"
 * @param {string} [opts.sourcePath] full path (video behaviour)
 * @param {number} [opts.startChunkId]
 */
export function createTimestampChunks(segments, opts) {
  const {
    chunkSize = config.textChunkSize,
    chunkOverlap = 0,
    sourceType,
    sourceName,
    sourcePath,
    startChunkId = 0,
  } = opts;

  const chunks = [];
  let currentSegments = [];
  let currentLength = 0;
  let chunkId = startChunkId;

  const flush = () => {
    if (currentSegments.length === 0) return;
    const first = currentSegments[0];
    const last = currentSegments[currentSegments.length - 1];
    const metadata = {
      source_type: sourceType,
      source_name: sourceName,
      chunk_id: chunkId,
      timestamp_start: first.start,
      timestamp_end: last.end,
    };
    if (sourcePath) metadata.source_path = sourcePath;
    // Video pipeline also stored human-readable timestamps.
    if (sourceType === "video") {
      metadata.timestamp_start_formatted = formatTimestamp(first.start);
      metadata.timestamp_end_formatted = formatTimestamp(last.end);
    }
    chunks.push(
      new Document({
        pageContent: currentSegments.map((s) => s.text.trim()).join(" "),
        metadata,
      })
    );
    chunkId++;
  };

  const carryOverlap = () => {
    if (!chunkOverlap || chunkOverlap <= 0) {
      currentSegments = [];
      currentLength = 0;
      return;
    }
    let overlapLength = 0;
    const overlapSegments = [];
    for (let i = currentSegments.length - 1; i >= 0; i--) {
      overlapSegments.unshift(currentSegments[i]);
      overlapLength += (currentSegments[i].text ?? "").length;
      if (overlapLength >= chunkOverlap) break;
    }
    currentSegments = overlapSegments;
    currentLength = overlapLength;
  };

  for (const segment of segments) {
    const text = (segment.text ?? "").trim();
    if (!text) continue;
    currentSegments.push({ ...segment, text });
    currentLength += text.length;
    if (currentLength >= chunkSize) {
      flush();
      carryOverlap();
    }
  }
  flush();
  return chunks;
}

/** Attach uniform metadata to plain text chunks (pdf / website). */
export function withSourceMetadata(chunks, { sourceType, extra = {} }) {
  chunks.forEach((doc, index) => {
    doc.metadata = {
      ...doc.metadata,
      source_type: sourceType,
      chunk_id: doc.metadata?.chunk_id ?? index,
      ...extra,
    };
  });
  return chunks;
}
