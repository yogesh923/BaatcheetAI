import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { logger } from "../logger.js";
import { splitTextDocuments, withSourceMetadata } from "../chunking.js";
import { indexDocumentsBatched } from "../vectorStore.js";

/**
 * Index a web page into Qdrant.
 * Same chunking/metadata as the original web_page_indexing.js.
 */
export async function indexWebsite(
  url = "https://www.aajtak.in/technology/tech-news/story/australia-social-media-algorithm-my-feed-my-way-prym-dskc-2638822-2026-09-08",
  { sourceName = "Website", ...opts } = {}
) {
  logger.info(`Starting website indexing: ${url}`);
  const loader = new CheerioWebBaseLoader(url);
  opts.onProgress?.({ phase: "fetching" });
  const docs = await loader.load();
  logger.info(`Documents: ${docs.length}`);

  opts.onProgress?.({ phase: "chunking" });
  const chunks = await splitTextDocuments(docs, opts.splitter);
  logger.info(`Chunks: ${chunks.length}`);

  withSourceMetadata(chunks, {
    sourceType: "website",
    extra: { source_name: sourceName, source_url: url },
  });

  // Unique run id — lets vector deletes target exactly this source's chunks.
  if (opts.sourceId) {
    chunks.forEach((doc) => {
      doc.metadata.source_id = opts.sourceId;
    });
  }

  await indexDocumentsBatched(chunks, {
    ...opts.index,
    onProgress: opts.onProgress,
    apiKey: opts.apiKey,
    embeddingModel: opts.embeddingModel,
  });
  logger.info("Website indexing completed!");
  return { documents: docs.length, chunks: chunks.length };
}
