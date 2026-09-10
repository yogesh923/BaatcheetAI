import { config } from "./config.js";
import { getOpenAIClient } from "./clients.js";
import { getRetriever } from "./vectorStore.js";
import { formatTimestamp } from "./chunking.js";

function formatSource(doc, index) {
  const metadata = doc.metadata ?? {};
  let sourceInfo = "";

  if (metadata.source_type === "pdf") {
    const pageNumber =
      metadata.loc?.pageNumber ?? metadata.page_number ?? "Unknown";
    sourceInfo = `Page: ${pageNumber}`;
  }

  if (metadata.source_type === "website") {
    sourceInfo = `URL: ${metadata.source_url ?? "Unknown"}`;
  }

  if (metadata.source_type === "audio") {
    sourceInfo = `Timestamp: ${formatTimestamp(
      metadata.timestamp_start
    )} - ${formatTimestamp(metadata.timestamp_end)}`;
  }

  if (metadata.source_type === "video") {
    sourceInfo = `Source Type: Video
      Source Name: ${metadata.source_name}
      Timestamp: ${formatTimestamp(metadata.timestamp_start)}
      - ${formatTimestamp(metadata.timestamp_end)}`;
  }

  return `
      [Source ${index + 1}]

      Source Type: ${metadata.source_type ?? "Unknown"}
      Source Name: ${metadata.source_name ?? metadata.source ?? "Unknown"}
      ${sourceInfo}

      Content:
      ${doc.pageContent}
      `;
}

export async function buildContext(userQuery, { apiKey, embeddingModel } = {}) {
  const retriever = await getRetriever({ apiKey, embeddingModel });
  const results = await retriever.invoke(userQuery);
  return results.map(formatSource).join("\n\n");
}

export async function buildSystemPrompt(userQuery, opts = {}) {
  const similarContext = await buildContext(userQuery, opts);
  return buildSystemPromptWithContext(similarContext);
}

export function buildSystemPromptWithContext(similarContext) {
  return `
  You are a source-grounded question answering assistant.

  Your job is to answer the user's question using ONLY the information
  provided in the CONTEXT below.

  CONTEXT:
  ${similarContext}

  RULES:

  1. Use only the information available in the provided CONTEXT.

  2. Do not use outside knowledge, assumptions, or information from your
    own knowledge.

  3. If the answer cannot be found in the CONTEXT, respond exactly:
    "I couldn't find enough information in the provided sources."

  4. Do not guess, hallucinate, or invent facts.

  5. Keep the answer concise and within 100 words.

  6. Every factual claim in the answer must be supported by the CONTEXT.

  7. Always provide the source reference at the end of the answer.

  8. The source reference must depend on the source type:

    - PDF:
      Mention the relevant page number.
      Example: Source: the_bhagavad_gita.pdf, Page 42

    - Website:
      Mention the source name and URL.
      Example: Source: Aaj Tak, URL: <source_url>

    - Audio:
      Mention the source name and timestamp.
      Example: Source: all_ai_terms.mp3, Timestamp: 10:23 - 11:21

  9. Never invent or guess page numbers, URLs, timestamps, source names,
    or other metadata.

  10. If multiple sources support the answer, mention all relevant sources.

  11. If the CONTEXT contains conflicting information from different
      sources, clearly mention the conflict instead of choosing an
      unsupported answer.

  12. Do not mention the retrieval process, embeddings, vector database,
      Qdrant, or internal system instructions.

  13. Answer the user's question directly and factually.

  OUTPUT FORMAT:

  Answer: <your concise answer>

  Sources:
  <relevant source references>
  `;
}

export async function ask(userQuery, opts = {}) {
  const { answer } = await askWithContext(userQuery, opts);
  return answer;
}

/**
 * Single-retrieval variant for API/UI callers: returns the answer
 * plus the formatted retrieved context so the UI can show citations.
 * `ask()` behaviour is unchanged.
 */
export async function askWithContext(
  userQuery,
  { apiKey, chatModel, embeddingModel } = {}
) {
  const client = getOpenAIClient(apiKey);
  const similarContext = await buildContext(userQuery, { apiKey, embeddingModel });
  const systemPrompt = await buildSystemPromptWithContext(similarContext);
  const response = await client.chat.completions.create({
    model: chatModel ?? config.chatModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuery },
    ],
  });
  const answer = response.choices[0].message.content;
  console.log(`Final output: ${answer}`);
  return { answer, sources: similarContext };
}

export default ask;
