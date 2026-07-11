# deef

A mobile app that presents news through AI-generated editorial
illustrations. Articles covering the same story are clustered into a single
"event"; an LLM writes the summary and a visual metaphor, and the Gemini
image API illustrates it in a category-specific art style.

Spec-driven development: see **PLANNING.md** (vision/phases), **TASKS.md**
(task list), **DECISIONS.md** (decision log), **PROGRESS.md** (session log),
and `docs/` (database schema + data model rationale).

## Repository layout

```
apps/backend      Next.js App Router — pipeline crons + API routes (Vercel)
apps/mobile      (later phase) Expo + React Native
packages/shared   Types/constants mirrored from the DB schema
docs/             SQL migrations (source of truth) + data model doc
```

Pipeline: `fetch` (RSS → raw_articles + embeddings) → `cluster`
(pgvector cosine similarity → events) → `enrich` (Phase 2) → `images`
(Phase 3) → published.

## Prerequisites

- Node.js ≥ 22, pnpm ≥ 11 (`corepack enable`)
- A Supabase project (Postgres + pgvector)
- A Google Gemini API key

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Apply the database migrations** — paste each file into the Supabase
   SQL editor, in order:

   - `docs/001_initial_schema.sql` (tables, RLS, category + settings seeds)
   - `docs/002_cluster_similarity_rpc.sql` (similarity-search RPC)

3. **Environment** — create `apps/backend/.env.local` (gitignored; never
   commit real values):

   | Variable | Value |
   |----------|-------|
   | `SUPABASE_URL` | Bare project URL, e.g. `https://abcdefgh.supabase.co` (no `/rest/v1/` suffix) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service role key — server-only, bypasses RLS |
   | `GEMINI_API_KEY` | Google Gemini API key |
   | `CRON_SECRET` | Shared secret for `/api/cron/*`, e.g. `openssl rand -hex 32` |

   All four are required; startup fails fast with a Zod error naming any
   missing variable.

4. **Seed the RSS sources** (idempotent, safe to re-run):

   ```bash
   pnpm --filter @deef/backend seed:sources
   ```

## Running

```bash
pnpm dev        # backend dev server (default http://localhost:3000)
pnpm typecheck  # must pass clean after every task
```

Trigger the pipeline steps manually (this is what Vercel Cron will do in
production — schedules live in `apps/backend/vercel.json`):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/fetch
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/cluster
```

Both return a JSON summary and are idempotent — re-running never duplicates
articles or events. Requests without the correct Bearer secret get a 401.
`GET /api/health` is unauthenticated and checks env wiring.

## Operational notes

- Every Gemini call is logged to the `api_usage` table; daily limits live
  in `app_settings` (`max_events_per_day`, `max_images_per_day`) and are
  checked by the pipeline before producing.
- Embeddings use `gemini-embedding-001` at 768 dimensions (see
  DECISIONS.md 2026-07-11).
- The service role key must never reach any client bundle
  (`src/lib/supabase.ts` is `server-only`-guarded).
