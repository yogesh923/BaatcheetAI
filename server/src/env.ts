import path from "node:path";
import dotenv from "dotenv";

// Shared RAG vars (Qdrant, OpenAI, models) live in rag/.env — load first.
// Server-specific vars live in server/.env. dotenv never overrides
// existing values, so explicit assignments always win.
const here = import.meta.dirname; // server/src
dotenv.config({ path: path.resolve(here, "..", "..", ".env") });
dotenv.config({ path: path.resolve(here, "..", ".env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  serverUrl: (process.env.SERVER_URL ?? "http://localhost:4000").replace(/\/$/, ""),
  webUrl: (process.env.WEB_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  // Canonical UI origin — used for OAuth callback URLs so the session
  // cookie lands on the domain the browser is actually on.
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  googleId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  githubId: process.env.GITHUB_CLIENT_ID ?? "",
  githubSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
};

if (env.jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters.");
}
