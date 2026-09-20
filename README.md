<h1 align="center">deef</h1>

<p align="center">
  News you read as pictures. Articles about the same story are clustered into one event, an LLM writes the summary and a visual metaphor for it, and Gemini illustrates that metaphor in an art style chosen for the category.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo"/>
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase"/>
  <img src="https://img.shields.io/badge/pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="pgvector"/>
  <img src="https://img.shields.io/badge/Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white" alt="Gemini"/>
  <img src="https://img.shields.io/badge/Turborepo-EF4444?style=flat-square&logo=turborepo&logoColor=white" alt="Turborepo"/>
</p>

<!-- Add a screenshot or a short GIF here once the mobile client renders an event.
<p align="center"><img src="docs/preview.png" alt="deef preview" width="700"/></p>
-->

## Why

Ten outlets cover the same story and you end up reading the same paragraph ten times. deef collapses those into a single event, then gives it an illustration instead of yet another stock photo. The interesting part is not the UI. It is the pipeline that decides two articles are the same story, and the prompt chain that turns a news summary into a visual metaphor an image model can actually draw.

## How it works

```
RSS feeds
   │
   ▼  fetch      raw articles + 768-dim embeddings (gemini-embedding-001)
   │
   ▼  cluster    pgvector cosine similarity groups articles into events
   │
   ▼  enrich     LLM writes the summary and a visual metaphor
   │
   ▼  images     Gemini renders the metaphor in a category-specific art style
   │
   ▼  published
```

Each step runs as an idempotent cron route on Vercel. Re-running one never duplicates an article or an event, which means a failed run is safe to simply replay.

## Engineering notes

A few decisions worth pointing out, with the full reasoning in `DECISIONS.md`.

**Idempotency over bookkeeping.** Every pipeline step can run twice with no side effects, so there is no run-state machine to keep in sync and no cleanup job when a cron times out halfway.

**Fail fast on configuration.** Environment variables are validated with Zod at startup, so a missing key surfaces immediately by name rather than as a null reference three layers into the pipeline.

**The service role key never leaves the server.** `src/lib/supabase.ts` is `server-only` guarded, so an accidental client import becomes a build error instead of a leaked credential.

**Spending limits live in the database, not the code.** Every Gemini call is written to an `api_usage` table and the pipeline checks daily ceilings from `app_settings` before it produces anything. Changing a limit does not need a deploy.

**Written before it was built.** `PLANNING.md` holds the vision and phases, `TASKS.md` the task list, `DECISIONS.md` the decision log and `PROGRESS.md` the session log. The schema in `docs/` is the source of truth and `packages/shared` mirrors it as types.

## Layout

```
apps/backend       Next.js App Router, pipeline crons and API routes (Vercel)
apps/mobile        Expo and React Native client
packages/shared    Types and constants mirrored from the database schema
docs/              SQL migrations (source of truth) and the data model doc
```

## Status

The fetch and cluster stages run end to end. Enrichment and image generation are the next phases, and the mobile client is being built against the published events.

## Running it locally

**Prerequisites** — Node.js 22 or newer, pnpm 11 or newer (`corepack enable`), a Supabase project with pgvector and a Google Gemini API key.

```bash
pnpm install
```

Apply the migrations by pasting each file into the Supabase SQL editor, in order.

- `docs/001_initial_schema.sql` (tables, RLS, category and settings seeds)
- `docs/002_cluster_similarity_rpc.sql` (similarity search RPC)

Create `apps/backend/.env.local`. All four values are required and startup fails with a Zod error naming anything missing.

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Bare project URL, for example `https://abcdefgh.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key, server only, bypasses RLS |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CRON_SECRET` | Shared secret for `/api/cron/*`, for example `openssl rand -hex 32` |

Seed the RSS sources. This is idempotent and safe to re-run.

```bash
pnpm --filter @deef/backend seed:sources
```

Then start the backend.

```bash
pnpm dev        # http://localhost:3000
pnpm typecheck  # expected to pass clean
```

Trigger the pipeline by hand. This is exactly what Vercel Cron does in production, with the schedules in `apps/backend/vercel.json`.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/fetch
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/cluster
```

Both return a JSON summary. Requests without the correct bearer secret get a 401. `GET /api/health` is unauthenticated and checks that the environment is wired correctly.
