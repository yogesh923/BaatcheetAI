import OpenAI from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { config } from "./config.js";

let _openai = null;
let _embeddings = null;

// Per-user clients for BYOK web flows (key + model arrive per request).
// Cached in memory only — never persisted. Bounded to cap memory.
const openaiByKey = new Map();
const embeddingsByKey = new Map();
const MAX_CACHED_CLIENTS = 20;

function cacheSet(map, key, value) {
  if (map.size >= MAX_CACHED_CLIENTS) {
    map.delete(map.keys().next().value);
  }
  map.set(key, value);
}

/**
 * Shared OpenAI client (Whisper + Chat).
 * Pass apiKey for per-user (BYOK) use; without it the env-based
 * singleton is used (CLI behaviour, unchanged).
 */
export function getOpenAIClient(apiKey) {
  const key = apiKey ?? process.env.OPENAI_API_KEY ?? null;
  if (!key) {
    if (!_openai) _openai = new OpenAI();
    return _openai;
  }
  if (!openaiByKey.has(key)) {
    cacheSet(openaiByKey, key, new OpenAI({ apiKey: key }));
  }
  return openaiByKey.get(key);
}

/**
 * Shared embeddings instance — reuse to avoid re-creating per batch.
 * Pass apiKey + model for per-user (BYOK) use; without them the
 * env-based singleton is used (CLI behaviour, unchanged).
 */
export function getEmbeddings(apiKey, model) {
  const key = apiKey ?? process.env.OPENAI_API_KEY ?? null;
  const name = model ?? config.embeddingModel;
  if (!key && !model) {
    if (!_embeddings) {
      _embeddings = new OpenAIEmbeddings({
        model: config.embeddingModel,
        batchSize: config.embeddingBatchSize,
      });
    }
    return _embeddings;
  }
  const cacheKey = `${name}::${key ?? "env"}`;
  if (!embeddingsByKey.has(cacheKey)) {
    cacheSet(
      embeddingsByKey,
      cacheKey,
      new OpenAIEmbeddings({
        ...(key ? { apiKey: key } : {}),
        model: name,
        batchSize: config.embeddingBatchSize,
      })
    );
  }
  return embeddingsByKey.get(cacheKey);
}
