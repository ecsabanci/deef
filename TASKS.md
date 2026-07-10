# TASKS.md

Task list for the current phase. Rules (from CLAUDE.md):

- Only **approved** tasks are worked on, one at a time, in order
- `pnpm typecheck` must pass clean after every task
- Tasks are grouped into **PR checkpoints**. When every task in a checkpoint
  meets its definition of done, commit on the checkpoint's feature branch,
  push, open a PR with `gh pr create`, then STOP for review
- New needs discovered mid-work are added here as proposed tasks and
  submitted for approval — no scope creep

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## Phase 1 — Backend skeleton + fetch & cluster

**Phase outcome:** `raw_articles` starts filling from 2 real RSS feeds and
events get created by the cluster step.

---

### PR Checkpoint 1 — Monorepo skeleton
Branch: `feat/monorepo-setup`

- [x] **1.1 Initialize Turborepo + pnpm workspace**
  Root `package.json`, `pnpm-workspace.yaml`, `turbo.json` (dev + typecheck
  pipelines), shared strict `tsconfig` base, `.gitignore`.
  **DoD:** `pnpm install` succeeds; `pnpm typecheck` runs across all
  workspaces and passes.

- [x] **1.2 Scaffold `apps/backend` (Next.js App Router, TS strict)**
  Minimal app with a `GET /api/health` route returning `{ ok: true }`.
  **DoD:** `pnpm dev` serves the health endpoint locally; typecheck passes.

- [x] **1.3 Create `packages/shared`**
  Package `@deef/shared`: `EventStatus` union, category slug union, and
  pipeline constants mirrored from the schema. Backend consumes it.
  **DoD:** backend imports at least one type/constant from `@deef/shared`;
  typecheck passes.

- [x] **1.4 Zod-validated env module + `.env.example`**
  `apps/backend/src/lib/env.ts` validating `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `CRON_SECRET` at startup.
  `.env.example` lists every variable; `.env.local` gitignored.
  **DoD:** starting with a missing/empty variable fails fast with a clear
  Zod error naming the variable; `.env.example` complete; typecheck passes.

**Checkpoint DoD:** fresh clone → `pnpm install && pnpm typecheck` clean,
`pnpm dev` serves health route. Open PR, stop.

---

### PR Checkpoint 2 — Supabase foundation & seeds
Branch: `feat/supabase-foundation`

- [x] **2.1 Apply `docs/001_initial_schema.sql` to the Supabase project**
  User-assisted: requires a Supabase project + credentials. The schema file
  is applied as-is (never regenerated).
  **DoD:** all tables, the `event_reaction_counts` view, pgvector extension,
  5 seeded categories and 5 `app_settings` keys exist in the project.

- [x] **2.2 Server-side Supabase client helper**
  `apps/backend/src/lib/supabase.ts` — service-role client, guarded with the
  `server-only` package so it can never be bundled client-side.
  **DoD:** a temporary smoke check (script or the health route) reads
  `app_settings` successfully; service key appears only in server code;
  typecheck passes.

- [x] **2.3 Pipeline shared helpers: settings reader + api_usage logger**
  `getSetting(key)` (typed, Zod-parsed jsonb values) and `logApiUsage(row)`
  used by all later pipeline steps.
  **DoD:** a scratch script reads `cluster_similarity_threshold` as a number
  and inserts one `api_usage` row; typecheck passes.

- [x] **2.4 Source seed script (2 real RSS feeds)**
  `scripts/seed-sources.ts`, idempotent (upsert by `rss_url`), each source
  mapped to a seeded category via `default_category`. Feed choice confirmed
  with the user (see Open questions).
  **DoD:** running the script twice leaves exactly 2 active rows in
  `sources`; both feed URLs verified to return parseable RSS.

**Checkpoint DoD:** DB matches the schema doc, backend can read/write it
server-side, sources seeded. Open PR, stop.

---

### PR Checkpoint 3 — Fetch step
Branch: `feat/fetch-step`

- [ ] **3.1 Fetch module `src/pipeline/fetch.ts`**
  For each active source: fetch RSS with `rss-parser`, dedupe by `url`,
  insert into `raw_articles` (title, excerpt, published_at), update
  `sources.last_fetched_at`. One failing source must not abort the rest.
  Requests MUST send a browser User-Agent — some Turkish news sites block
  bare clients (verified 2026-07-11).
  **DoD:** running twice against the real feeds inserts zero duplicates on
  the second run; a source with a broken URL is skipped with a logged error
  while others succeed.

- [ ] **3.2 Embedding generation (`text-embedding-004`)**
  Embed title + excerpt for articles with `embedding is null`, write the
  768-dim vector, log every call to `api_usage` (operation `embed`).
  Runs as part of the fetch step (per docs/haber-app-veri-modeli.md).
  **DoD:** all new articles have non-null embeddings; matching `api_usage`
  rows exist; re-run embeds nothing (idempotent).

- [ ] **3.3 Cron endpoint `GET /api/cron/fetch`**
  Protected by `CRON_SECRET` (Authorization: Bearer). Returns a JSON summary
  (sources processed, articles inserted, embeddings created).
  **DoD:** missing/wrong secret → 401 with no side effects; correct secret
  runs the full fetch step and returns accurate counts.

**Checkpoint DoD:** hitting the cron endpoint fills `raw_articles` with
embedded articles, idempotently. Open PR, stop.

---

### PR Checkpoint 4 — Cluster step + wiring
Branch: `feat/cluster-step`

- [ ] **4.1 Migration proposal: similarity-search RPC (`docs/002_….sql`)**
  supabase-js cannot run pgvector similarity SQL directly; a `match_article`
  RPC (nearest neighbors among articles already linked to events within
  `cluster_lookback_hours`) is needed. New migration file + DECISIONS.md
  entry, **submitted for approval before applying**.
  **DoD:** migration file reviewed, approved, applied; decision recorded.

- [ ] **4.2 Cluster module `src/pipeline/cluster.ts`**
  For each unclustered article: nearest-neighbor cosine similarity against
  articles of events from the last `cluster_lookback_hours`; if best match ≥
  `cluster_similarity_threshold` attach to that event, else create a new
  event (`status = clustering`, category from the source's
  `default_category`). Checks `max_events_per_day` before creating events.
  **DoD:** two similar articles end up on one event; a dissimilar article
  gets its own event; daily event limit respected; re-run changes nothing.

- [ ] **4.3 Cron endpoint `GET /api/cron/cluster` + `vercel.json`**
  Same `CRON_SECRET` protection; `vercel.json` declares both cron schedules
  (fetch and cluster every 30 min).
  **DoD:** 401 without secret; with secret runs cluster and returns counts;
  `vercel.json` valid with two cron entries.

- [ ] **4.4 README**
  Setup from a clean clone: prerequisites, `pnpm install`, env setup,
  applying the migration, seeding sources, triggering crons locally via curl.
  **DoD:** following the README verbatim reproduces a working local setup;
  every documented command works as written.

- [ ] **4.5 Phase 1 end-to-end verification**
  Trigger fetch → cluster locally against the 2 real feeds and inspect the DB.
  **DoD:** `raw_articles` populated with embeddings; at least one event in
  `clustering` status with ≥1 linked article; PROGRESS.md session entry
  added. **Phase 1 outcome met.**

**Checkpoint DoD:** full Phase 1 outcome demonstrated end to end. Open PR,
stop.

---

## Open questions — RESOLVED 2026-07-10 (user review)

1. **Fetch step daily limit:** fetch performs no limit check (naturally
   bounded by feed size). Recorded in DECISIONS.md.
2. **Cluster comparison method:** confirmed — compare against articles
   linked to events within `cluster_lookback_hours`, adopt the best match's
   event. RPC migration proposal proceeds in task 4.1. Recorded in
   DECISIONS.md.
3. **RSS feeds:** propose 2–3 verified candidates at task 2.4 before
   seeding. Preference: one gündem + one ekonomi feed from major Turkish
   outlets (TRT Haber, NTV or Anadolu Ajansı); every URL verified parseable
   before proposing.
4. **Supabase project:** exists, initial migration already applied. User
   provides `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
   once task 1.4 defines `.env.example`. (Task 2.1 becomes verification
   rather than application.)
5. **Vercel plan:** crons triggered locally/manually for now; Pro vs
   external scheduler decided at deploy time. No action.
6. **Stale doc:** note added at the top of the RLS section in
   `docs/haber-app-veri-modeli.md` pointing to the schema file as the
   source of truth.

---

## Later phases

Phases 2–6 will be broken down here after Phase 1 is complete and reviewed.
