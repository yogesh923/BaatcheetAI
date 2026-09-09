// Typed gateway to the shared RAG backend (plain .js, lives in rag/src).
// The backend has no type declarations, so each re-export carries a
// @ts-ignore for the untyped import only — every use site stays typed.
// Verified at runtime by the API smoke tests, not by the compiler.

export interface BackendProgress {
  phase: string;
  done?: number | null;
  total?: number | null;
}

export interface BackendLogEntry {
  level: string;
  text: string;
  at: string;
}

export interface BackendIndexResult {
  chunks?: number;
  segments?: number;
  documents?: number;
  title?: string;
  videoId?: string;
  url?: string;
}

export interface IndexOpts {
  onProgress?: (p: BackendProgress) => void;
  tmpDir?: string;
  segmentSeconds?: number;
  chunkSize?: number;
  chunkOverlap?: number;
  cleanup?: boolean;
  sourceName?: string;
  /** Unique run id stamped as metadata.source_id on every chunk. */
  sourceId?: string;
}

// @ts-ignore: untyped shared backend module
export { logger, addLogListener } from "../../src/logger.js";
// @ts-ignore: untyped shared backend module
export { indexPdf } from "../../src/indexers/pdf.js";
// @ts-ignore: untyped shared backend module
export { indexAudio } from "../../src/indexers/audio.js";
// @ts-ignore: untyped shared backend module
export { indexVideo } from "../../src/indexers/video.js";
// @ts-ignore: untyped shared backend module
export { indexWebsite } from "../../src/indexers/website.js";
// @ts-ignore: untyped shared backend module
export { indexYoutube, parseYoutubeUrl } from "../../src/indexers/youtube.js";
// @ts-ignore: untyped shared backend module
export { askWithContext } from "../../src/queryService.js";
// @ts-ignore: untyped shared backend module
export { deleteSourceVectors } from "../../src/vectorStore.js";
