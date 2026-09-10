# BaatCheetLLM

Chat with your documents. Index **PDFs, audio, video and web pages**, then ask questions and get **grounded answers with citations** — page numbers, URLs and timestamps.

Bring your own OpenAI key: every user runs the app on their own API budget. Keys live only in their browser — never in our database.

## How it works

```
PDF / audio / video / URL
        │ ① ingest (ffmpeg · Whisper · pdf-parse)
        ▼
  split → 1000-char chunks (200 overlap, timestamps kept)
        │ ② embed (OpenAI, per-user key + model)
        ▼
  ┌─────────────┐   ┌──────────────┐
  │   Qdrant    │   │   Postgres   │  ← kept strictly separate:
  │   vectors   │   │ users +      │    vectors in Qdrant,
  │  (port 6333)│   │ index history│    relations in Postgres
  └─────────────┘   └──────────────┘
        │ ③ ask → top-k retrieve → cited answer
        ▼
     BaatCheetLLM UI
```

## Architecture

| Piece | Tech | Port | Job |
|---|---|---|---|
| `web/` | Next.js 16 + Tailwind + shadcn-style UI | 3000 | Pages only (landing, login, studio). No API routes. |
| `server/` | Express 5 + Prisma 7 + PostgreSQL 16 | 4000 | **All** HTTP: auth, indexing jobs (SSE), chat, history. |
| `src/` | Shared RAG backend (LangChain) | — | Imported by Express *and* the CLI scripts — one implementation. |
| Postgres | Docker (`baatcheet-postgres`) | 5432 | `User`, `OAuthAccount`, `IndexedSource` tables. |
| Qdrant | Docker | 6333 | Vector collection for chunks. |

Auth: email + password (bcrypt) plus Google/GitHub OAuth, 7-day JWT in an httpOnly cookie. The Next.js proxy verifies the JWT; every Express route (except health/models shapes) requires it.

## Prerequisites

- Docker + Docker Compose (recommended — everything runs containerized), **or**
  Node.js 24 + npm for local dev
- An OpenAI API key **per user** — entered in the app's Settings dialog, never stored server-side

## Quickstart (Docker — recommended)

```bash
# 1. Configure environment (see tables below — never commit these files)
#    rag/.env, rag/server/.env, rag/web/.env.local

# 2. Build + start the whole stack (Postgres, Qdrant, API :4000, web :3000)
docker compose up --build -d

# 3. Follow the API logs (migrations apply automatically on boot)
docker compose logs -f server
```

Open `http://localhost:3000` → **Create account** (or Google/GitHub) → gear icon ⚙ → paste your OpenAI key, pick models → index your first source.

| Service | URL | Notes |
|---|---|---|
| web | `http://localhost:3000` | Next.js UI |
| server | `http://localhost:4000/api/health` | Express API (`ffmpeg` baked into the image) |
| postgres | `localhost:5432` | Data in the `baatcheet-pgdata` volume — kept across restarts |
| qdrant | `http://localhost:6333` | Vectors in the `baatcheet-qdrant` volume |

```bash
docker compose ps            # status
docker compose logs -f       # all logs
docker compose down          # stop (volumes + data are kept)
docker compose down -v       # stop AND delete all data (fresh start)
docker compose build server  # rebuild after changing server/ or src/
docker compose build web     # rebuild after changing web/
```

### Using Neon Postgres instead of local

Nothing to rebuild — only connection strings change. Qdrant stays wherever it is.

```bash
# 1. Create a project at https://neon.tech → Copy the connection string
#    (Postgres 16+, pooled or direct — both work; it ends with ?sslmode=require)

# 2a. Docker Compose: add ONE line to rag/.env (gitignored, auto-loaded)
DATABASE_URL="postgresql://<user>:<password>@<endpoint>.neon.tech/<dbname>?sslmode=require"

# 2b. Local dev (no Docker): put the SAME string in rag/server/.env instead
#     (this file is what `npm run dev` in server/ reads)

# 3. Create the tables on Neon (run once — safe to re-run, applies pending only)
cd rag/server && npx prisma migrate deploy

# 4. Restart the API
docker compose up -d server        # Docker path (recreates with the new URL)
# or: restart `npm run dev`        # local-dev path

# 5. Verify
curl http://localhost:4000/api/health
# sign up in the UI → check the user row landed in Neon (Neon dashboard → Tables → User)
```

Notes:
- Compose reads `DATABASE_URL` from `rag/.env`/shell first; the local `postgres:` service is only a fallback default. You can `docker compose stop postgres` once Neon is live (server only needs it at boot for `depends_on`).
- Optional — copy existing local data over first:
  ```bash
  pg_dump "postgresql://baatcheet:<pass>@localhost:5432/baatcheet" --no-owner \
    | psql "<neon-DATABASE_URL>"
  ```
- OAuth callback URLs don't change (they point at the API on `:4000`, not the DB).
```

> Migrating from the old standalone containers? Stop them first
> (`docker stop baatcheet-postgres laughing_shtern`) to free ports 5432/6333.
> The Postgres volume is reused by name, so existing users survive the move.
> Qdrant starts a fresh volume — re-index your sources afterwards.

## Quickstart (local dev, no Docker images)

```bash
# 1. Start infrastructure
docker run -d --name baatcheet-qdrant -p 6333:6333 qdrant/qdrant
docker run -d --name baatcheet-postgres --restart unless-stopped \
  -e POSTGRES_USER=baatcheet -e POSTGRES_PASSWORD=<pick-a-password> \
  -e POSTGRES_DB=baatcheet -p 5432:5432 \
  -v baatcheet-pgdata:/var/lib/postgresql/data postgres:16

# 2. Install dependencies (root RAG backend, API server, web UI)
npm install          # in rag/
npm install          # in rag/server/
npm install          # in rag/web/
# (ffmpeg must be on PATH for audio/video indexing)

# 3. Configure environment (see tables below — never commit these files)
#    rag/.env, rag/server/.env, rag/web/.env.local

# 4. Create database tables
cd rag/server && npx prisma migrate dev

# 5. Run everything (two terminals)
npm run dev          # in rag/server/  → API on :4000
npm run dev          # in rag/web/     → UI on :3000
```

Open `http://localhost:3000` → **Create account** (or Google/GitHub) → gear icon ⚙ → paste your OpenAI key, pick models → index your first source.

## Environment

**`rag/.env`** — shared RAG backend (also used by the CLI scripts):

| Key | Example |
|---|---|
| `OPENAI_API_KEY` | `sk-proj-…` (CLI fallback; the web app uses each user's own key) |
| `EMBEDDING_MODEL` | `text-embedding-3-small` |
| `QDRANT_URL` | `http://localhost:6333` (or Qdrant Cloud `https://….cloud.qdrant.io`) |
| `QDRANT_PROJECT_NAME` | `desi_rag` (collection name) |
| `QDRANT_API_KEY` | *(Qdrant Cloud only)* API key from the Cloud dashboard; empty = self-hosted |
| `MAX_SIMILATARY_SEARCH` | `5` |
| `GPT_RESPONSE_MODEL` | `gpt-4o-mini` |

**`rag/server/.env`** — Express API + Prisma:

| Key | Example |
|---|---|
| `DATABASE_URL` | `postgresql://baatcheet:<password>@localhost:5432/baatcheet` |
| `JWT_SECRET` | 48-char random string (**must match** `web/.env.local`) |
| `PORT` / `SERVER_URL` / `WEB_URL` | `4000` / `http://localhost:4000` / `http://localhost:3000` |
| `APP_URL` | UI origin for OAuth callbacks (`http://localhost:3000` locally, Vercel URL in prod) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | from GitHub Developer Settings |

**`rag/web/.env.local`** — Next.js UI:

| Key | Example |
|---|---|
| `JWT_SECRET` | same value as `server/.env` (proxy verifies the session) |
| `API_INTERNAL_URL` | `http://localhost:4000` locally · `http://server:4000` in Compose · API URL on Vercel |

> The browser always calls same-origin `/api/*` — Next.js rewrites it to the
> API, so the session cookie stays first-party. `NEXT_PUBLIC_API_URL` is
> intentionally unused.

## OAuth setup

- **GitHub:** Settings → Developer settings → OAuth Apps. Authorization callback URL: `<APP_URL>/api/auth/github/callback`
- **Google:** Cloud Console → Credentials → OAuth client (Web). Authorized redirect URI: `<APP_URL>/api/auth/google/callback`

(`APP_URL` = where the UI runs: `http://localhost:3000` locally, your Vercel
URL in prod — set it in `server/.env`. Callbacks go through the UI origin so
the session cookie lands on the right domain. Register localhost + prod URLs
side by side in both dashboards.)

Restart the API server after changing `server/.env`.

## Using it

- **Studio (`/app`)** — left: index PDFs, audio, video, web URLs with **live progress + streaming logs**; below it, **Indexed sources** history (per user, click 🗑 → confirm to remove the record). Right: **chat** with collapsible retrieved sources, copy buttons, timestamps.
- **Profile (`/app/profile`, header avatar)** — edit name, phone and gender; connect or remove Google/GitHub logins (removing your last sign-in method is blocked).
- **Settings (gear icon)** — your OpenAI key (show/hide, remove anytime) + embedding model for indexing + chat model for answering. Stored in `localStorage` only; sent per request as `x-openai-key`; the server keeps it in memory for that request/job and never persists it.
- **Landing (`/`)** — public page with an animated, auto-playing pipeline walkthrough (indexing + answering modes).

## CLI (same backend, no server needed)

```bash
npm run index:pdf       # scripts/index-pdf.js [file]
npm run index:audio     # scripts/index-audio.js [file]
npm run index:video     # scripts/index-video.js [file]
npm run index:website   # scripts/index-website.js [url]
npm start               # terminal chat (main.js)
```

These use `rag/.env` directly (your own key there).

## Project structure

```
rag/
├── docker-compose.yml   # full stack: postgres + qdrant + server + web
├── src/                 # shared RAG backend (indexers, chunking, vector store, query)
├── scripts/             # CLI entry points (npm run index:*)
├── main.js              # terminal chat
├── server/              # Express API :4000
│   ├── Dockerfile       # multi-stage (ffmpeg + prod deps)
│   ├── prisma/          # schema + migrations (Postgres)
│   └── src/             # env, db, auth/, routes/, jobs/
├── web/                 # Next.js UI :3000 (pages + components only)
│   └── Dockerfile       # standalone output
└── volumes (Docker)     # baatcheet-pgdata (users/history), baatcheet-qdrant (vectors)
```

## Notes

- **Costs:** indexing (Whisper + embeddings) and chat bill the OpenAI key entered in Settings —(each user pays their own). Embedding model must stay consistent within a collection or retrieval quality drops.
- **History = vectors too:** deleting a history entry removes its vectors from the collection first (filtered by an id stamped on every chunk), then drops the record. Sources indexed before this existed only clear the record.
- **Fresh database:** `psql $DATABASE_URL` → tables `User`, `OAuthAccount`, `IndexedSource`. Inspect with `npm run db:studio` in `server/`.
- **Never commit** `.env` files — all three packages gitignore them (see `.gitignore` files).
