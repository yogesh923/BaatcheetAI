// Public API barrel — import indexers / query from one place.
export { config, validateConfig } from "./config.js";
export { logger, addLogListener, removeLogListener } from "./logger.js";
export { getOpenAIClient, getEmbeddings } from "./clients.js";
export {
  getTextSplitter,
  splitTextDocuments,
  createTimestampChunks,
  withSourceMetadata,
  formatTimestamp,
} from "./chunking.js";
export {
  indexDocumentsBatched,
  openExistingCollection,
  getRetriever,
} from "./vectorStore.js";
export { indexPdf } from "./indexers/pdf.js";
export { indexWebsite } from "./indexers/website.js";
export { indexAudio } from "./indexers/audio.js";
export { indexVideo } from "./indexers/video.js";
export { buildContext, buildSystemPrompt, buildSystemPromptWithContext, ask, askWithContext } from "./queryService.js";
