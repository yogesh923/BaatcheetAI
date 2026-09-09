import { QdrantVectorStore } from "@langchain/qdrant";
import { config } from "./config.js";
import { getEmbeddings } from "./clients.js";
import { logger } from "./logger.js";

function qdrantArgs() {
  return {
    url: config.qdrantUrl,
    collectionName: config.qdrantCollection,
    // Qdrant Cloud mandates an API key; self-hosted instances ignore it.
    ...(config.qdrantApiKey ? { apiKey: config.qdrantApiKey } : {}),
  };
}

/**
 * Create the collection from the first batch, then append the rest.
 * Same behaviour as the original per-type scripts, now in one place.
 */
export async function indexDocumentsBatched(
  chunks,
  { batchSize, onProgress, apiKey, embeddingModel } = {}
) {
  const size = batchSize ?? config.qdrantBatchSize;
  if (!chunks || chunks.length === 0) {
    throw new Error("No chunks to index.");
  }
  const embeddings = getEmbeddings(apiKey, embeddingModel);

  const firstBatch = chunks.slice(0, size);
  const vectorStore = await QdrantVectorStore.fromDocuments(
    firstBatch,
    embeddings,
    qdrantArgs()
  );
  logger.info(`Indexed chunks: 0 - ${firstBatch.length}`);

  // Filtered deletes (metadata.source_id) require a payload index.
  // Create it once per collection — ignore when it already exists so
  // indexing never breaks over this.
  try {
    await vectorStore.client.createPayloadIndex(vectorStore.collectionName, {
      field_name: "metadata.source_id",
      field_schema: "keyword",
    });
  } catch (err) {
    logger.warn(`Payload index not ensured: ${err?.message ?? err}`);
  }

  const totalBatches = Math.max(1, Math.ceil(chunks.length / size));
  let doneBatches = 1;
  onProgress?.({ phase: "embedding", done: doneBatches, total: totalBatches });

  for (let i = size; i < chunks.length; i += size) {
    const batch = chunks.slice(i, i + size);
    logger.info(`Indexing chunks: ${i} - ${i + batch.length}`);
    await vectorStore.addDocuments(batch);
    doneBatches++;
    onProgress?.({ phase: "embedding", done: doneBatches, total: totalBatches });
  }
  return vectorStore;
}

/** Open an existing collection for retrieval (query path). */
export async function openExistingCollection({ apiKey, embeddingModel } = {}) {
  const embeddings = getEmbeddings(apiKey, embeddingModel);
  return QdrantVectorStore.fromExistingCollection(embeddings, qdrantArgs());
}

export async function getRetriever({ k, apiKey, embeddingModel } = {}) {
  const store = await openExistingCollection({ apiKey, embeddingModel });
  return store.asRetriever({ k: k ?? config.topK });
}

/**
 * Delete every vector stamped with a source run id (metadata.source_id).
 * Used when a user removes an indexed source — no orphaned chunks left
 * answering questions. Never throws for missing collections: deleting a
 * source whose vectors are already gone is a success.
 */
export async function deleteSourceVectors(sourceId, { apiKey } = {}) {
  if (!sourceId) {
    throw new Error("sourceId is required to delete vectors.");
  }
  // Embeddings are only needed to open the collection object — the delete
  // itself is a pure metadata-filter operation (zero OpenAI spend).
  const embeddings = getEmbeddings(apiKey);
  let store;
  try {
    store = await QdrantVectorStore.fromExistingCollection(embeddings, qdrantArgs());
  } catch (err) {
    if (err?.message?.includes("doesn't exist") || err?.status === 404) return;
    throw err;
  }
  await store.delete({
    filter: { must: [{ key: "metadata.source_id", match: { value: sourceId } }] },
  });
}
