import "./env.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./env.js";
import { prisma } from "./db.js";
import authRouter from "./routes/auth.js";
import jobsRouter from "./routes/jobs.js";
import chatRouter from "./routes/chat.js";
import historyRouter from "./routes/history.js";
import modelsRouter from "./routes/models.js";

const app = express();

// WEB_URL may be a comma-separated list (local + production UIs).
const allowedOrigins = env.webUrl
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length > 1 ? allowedOrigins : (allowedOrigins[0] ?? env.webUrl),
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/history", historyRouter);
app.use("/api/models", modelsRouter);

app.use("/api", (_req, res) => {
  res.status(404).json({ ok: false, error: "Not found." });
});

// Last-resort error handler (async errors in Express 5 reach here too).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[server] unhandled error:", err);
    if (res.headersSent) return;
    res.status(500).json({ ok: false, error: "Internal server error." });
  }
);

const server = app.listen(env.port, () => {
  console.log(`[server] BaatCheetLLM API listening on http://localhost:${env.port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[server] ${signal} — shutting down...`);
  server.close(() => process.exit(0));
  await prisma.$disconnect().catch(() => {});
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
