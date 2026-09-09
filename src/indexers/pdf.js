import path from "path";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { splitTextDocuments, withSourceMetadata } from "../chunking.js";
import { indexDocumentsBatched } from "../vectorStore.js";

/**
 * Index a PDF file into Qdrant.
 * Same chunking/metadata as the original indexing.js.
 */
export async function indexPdf(pdfFile = "the_bhagavad_gita.pdf", opts = {}) {
  const onProgress = opts.onProgress;
  onProgress?.({ phase: "loading" });
  logger.info(`Starting PDF indexing: ${pdfFile}`);
  const loader = new PDFLoader(pdfFile);
  const docs = await loader.load();
  logger.info(`Documents: ${docs.length}`);

  onProgress?.({ phase: "chunking" });
  const chunks = await splitTextDocuments(docs, opts.splitter);
  logger.info(`Chunks: ${chunks.length}`);

  withSourceMetadata(chunks, {
    sourceType: "pdf",
    extra: { source_name: path.basename(pdfFile) },
  });

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
  logger.info("PDF successfully indexed!");
  return { documents: docs.length, chunks: chunks.length };
}
