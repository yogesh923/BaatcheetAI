import "dotenv/config";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? null,
  embeddingModel: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
  embeddingBatchSize: 50,
  qdrantUrl: process.env.QDRANT_URL ?? "http://localhost:6333",
  qdrantCollection: process.env.QDRANT_PROJECT_NAME ?? "desi_rag",
  qdrantApiKey: process.env.QDRANT_API_KEY ?? null,
  qdrantBatchSize: 50,
  topK: parseInt(process.env.MAX_SIMILATARY_SEARCH ?? "5", 10),
  chatModel: process.env.GPT_RESPONSE_MODEL ?? "gpt-4o-mini",
  whisperModel: "whisper-1",
  // Audio splitting — keeps each Whisper request below the 25 MB limit.
  audioSegmentSeconds: 300, // 5 minutes
  audioTmpDir: "./tmp/audio_parts",
  videoTmpDir: "./tmp/video",
  youtubeTmpDir: "./tmp/youtube",
  ytDlpBinary: process.env.YT_DLP_BINARY ?? "yt-dlp",
  // YouTube bot-check bypass: the android player client is challenged far
  // less than web on datacenter IPs. Override via YT_EXTRACTOR_ARGS.
  // Optional logged-in session: YT_COOKIES_FILE=/path/to/cookies.txt
  // (exported from a logged-in browser; needed only if challenges persist).
  ytExtractorArgs:
    process.env.YT_EXTRACTOR_ARGS ?? "youtube:player_client=android,web",
  ytCookiesFile: process.env.YT_COOKIES_FILE ?? "",
  textChunkSize: 1000,
  textChunkOverlap: 200,
};

export function validateConfig({ strict = false } = {}) {
  const required = ["QDRANT_URL", "QDRANT_PROJECT_NAME", "EMBEDDING_MODEL"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    const msg = `Missing env vars: ${missing.join(", ")}`;
    if (strict) throw new Error(msg);
    console.warn(`[warn] ${msg} — falling back to defaults.`);
  }
  // OpenAI key is validated lazily by the SDK, but warn early.
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[warn] OPENAI_API_KEY is not set.");
  }
  // Touch getters so typos fail fast in strict mode.
  if (strict) requireEnv("QDRANT_URL");
  return config;
}
