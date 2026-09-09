# BaatCheetLLM API — Express + Prisma + shared RAG backend.
# Build context is the repo root (needs ../src and root node_modules).
#   docker compose build server

# ---------- builder: install, generate Prisma client, compile ----------
FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# --legacy-peer-deps: matches the local tree (langchain's stagehand peer
# wants dotenv 16 while the app uses 17 — harmless at runtime).
RUN npm ci --legacy-peer-deps
COPY src ./src
COPY server/package.json server/package-lock.json ./server/
WORKDIR /app/server
RUN npm ci
COPY server/prisma ./prisma
COPY server/prisma.config.ts ./
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npx prisma generate && npm run build

# ---------- runner: ffmpeg + yt-dlp + prod deps only ----------
FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg python3 python3-pip curl openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && pip install --no-cache-dir --break-system-packages yt-dlp
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
# Generated Prisma client (lives under node_modules/.prisma — fresh installs don't have it).
COPY --from=builder /app/server/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/prisma ./prisma
COPY server/prisma.config.ts ./
# Shared RAG backend (plain JS, imported at runtime) + its dependencies.
COPY --from=builder /app/src ../src
COPY --from=builder /app/node_modules ../node_modules
EXPOSE 4000
# Apply pending migrations, then serve. Needs DATABASE_URL at runtime.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
