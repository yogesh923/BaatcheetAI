# BaatcheetAI

Chat with your documents. Index **PDFs, audio, video, YouTube links and web pages**, then ask questions and get **grounded answers with citations** — page numbers, URLs and timestamps.

Bring your own OpenAI key: every user runs the app on their own API budget. Keys live only in their browser — never in our database.

## How it works

```
PDF / audio / video / YouTube / URL
        │ ① ingest (yt-dlp · ffmpeg · Whisper · pdf-parse)
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
     Baatcheet UI
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

- Node.js 24 + npm
- Docker (for Qdrant + Postgres)
- `ffmpeg` and `yt-dlp` on PATH (audio/video/YouTube indexing)
- An OpenAI API key **per user** — entered in the app's Settings dialog, never stored server-side

## Quickstart

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

# 3. Configure environment (see tables below — never commit these files)
#    rag/.env, rag/server/.env, rag/web/.env.local

# 4. Create database tables
cd rag/server && npx prisma migrate dev

# 5. Run everything (three terminals)
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
| `QDRANT_URL` | `http://localhost:6333` |
| `QDRANT_PROJECT_NAME` | `desi_rag` |
| `MAX_SIMILATARY_SEARCH` | `5` |
| `GPT_RESPONSE_MODEL` | `gpt-4o-mini` |

**`rag/server/.env`** — Express API + Prisma:

| Key | Example |
|---|---|
| `DATABASE_URL` | `postgresql://baatcheet:<password>@localhost:5432/baatcheet` |
| `JWT_SECRET` | 48-char random string (**must match** `web/.env.local`) |
| `PORT` / `SERVER_URL` / `WEB_URL` | `4000` / `http://localhost:4000` / `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | from GitHub Developer Settings |

**`rag/web/.env.local`** — Next.js UI:

| Key | Example |
|---|---|
| `JWT_SECRET` | same value as `server/.env` (proxy verifies the session) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` |

## OAuth setup

- **GitHub:** Settings → Developer settings → OAuth Apps. Authorization callback URL: `http://localhost:4000/api/auth/github/callback`
- **Google:** Cloud Console → Credentials → OAuth client (Web). Authorized redirect URI: `http://localhost:4000/api/auth/google/callback`

(Callbacks hit the Express server, not Next.js.) Restart the API server after changing `server/.env`.

## Using it

- **Studio (`/app`)** — left: index PDFs, audio, video, YouTube, web URLs with **live progress + streaming logs**; below it, **Indexed sources** history (per user, click 🗑 → confirm to remove the record). Right: **chat** with collapsible retrieved sources, copy buttons, timestamps.
- **Settings (gear icon)** — your OpenAI key (show/hide, remove anytime) + embedding model for indexing + chat model for answering. Stored in `localStorage` only; sent per request as `x-openai-key`; the server keeps it in memory for that request/job and never persists it.
- **Landing (`/`)** — public page with an animated, auto-playing pipeline walkthrough (indexing + answering modes).

## CLI (same backend, no server needed)

```bash
npm run index:pdf       # scripts/index-pdf.js [file]
npm run index:audio     # scripts/index-audio.js [file]
npm run index:video     # scripts/index-video.js [file]
npm run index:website   # scripts/index-website.js [url]
npm run index:youtube   # scripts/index-youtube.js <youtube-url>
npm start               # terminal chat (main.js)
```

These use `rag/.env` directly (your own key there).

## Project structure

```
rag/
├── src/                 # shared RAG backend (indexers, chunking, vector store, query)
├── scripts/             # CLI entry points (npm run index:*)
├── main.js              # terminal chat
├── server/              # Express API :4000
│   ├── prisma/          # schema + migrations (Postgres)
│   └── src/             # env, db, auth/, routes/, jobs/
├── web/                 # Next.js UI :3000 (pages + components only)
└── docker services      # Qdrant :6333, Postgres :5432 (separate from code)
```

## Notes

- **Costs:** indexing (Whisper + embeddings) and chat bill the OpenAI key entered in Settings —(each user pays their own). Embedding model must stay consistent within a collection or retrieval quality drops.
- **History vs vectors:** deleting a history entry removes the *record* from Postgres; vectors stay in Qdrant.
- **Fresh database:** `psql $DATABASE_URL` → tables `User`, `OAuthAccount`, `IndexedSource`. Inspect with `npm run db:studio` in `server/`.
- **Never commit** `.env` files — all three packages gitignore them (see `.gitignore` files).
