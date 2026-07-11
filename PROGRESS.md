# PROGRESS.md

Session log. At the end of each working session, add 3–5 lines: what was
done, what remains, known issues. Newest entry on top.

## Entry template

```
### YYYY-MM-DD — Session summary
- **Done:**
- **Remaining:**
- **Known issues:**
```

---

### 2026-07-11 — Checkpoint 5: enrich core
- **Done:** tasks 5.1–5.4 — Zod output schema; assembled system prompt
  (calibrated art-director section verbatim, user-approved); Gemini helper
  with API-enforced responseSchema + token-accurate api_usage logging;
  enrich module (15-min age gate, 10/run cap, clustering→enriching→
  generating_images, retry/failed verified via articleless test event);
  /api/cron/enrich + vercel.json. All 40 real events enriched, quality
  sample reviewed (somber/playful tones landing correctly)
- **Remaining:** checkpoint 6 quality pass (10–15 events, user sign-off);
  then Phase 3 (images)
- **Known issues:** enrich model swapped to gemini-3.5-flash (2.5 closed
  to new users); free tier (20 req/day) burned retry_count on healthy
  events before the transient-error fix — billing now enabled; transient
  429/503 no longer consume retry_count (DECISIONS.md)

### 2026-07-11 — Checkpoint 4: cluster step — PHASE 1 COMPLETE
- **Done:** tasks 4.1–4.5 — match_article_event RPC applied (migration
  002, service-role-only); cluster module (sequential matching, daily
  limit, near-miss logging); /api/cron/cluster + vercel.json (fetch :00/:30,
  cluster :15/:45); README; e2e verified: 57 articles embedded → 40 events
  created (limit exercised, 16 skipped), 1 attach — event 13 correctly
  merged two same-story articles (Swiss coach + player pre-match)
- **Remaining:** Phase 2 (enrich) — break into tasks next session; user
  provides the calibrated meta-prompt. Deploy decision (Vercel Pro vs
  external scheduler) still open
- **Known issues:** 16 articles await tomorrow's daily-limit reset (live
  test of the UTC reset); .env.example gitignore decision still pending

### 2026-07-11 — Checkpoint 3: fetch step
- **Done:** tasks 3.1–3.3 — fetch module (browser UA, per-source failure
  isolation, URL dedupe verified idempotent); embeddings on
  gemini-embedding-001 @ 768 dims after Google retired text-embedding-004
  (recorded in DECISIONS.md, spec docs updated); every embed call logged to
  api_usage; CRON_SECRET-protected /api/cron/fetch; temp smoke route
  removed. 57 articles fetched + embedded end to end
- **Remaining:** checkpoint 4 — cluster step + wiring (RPC migration
  proposal, cluster module, cron endpoint + vercel.json, README, Phase 1
  e2e verification)
- **Known issues:** embedding token counts logged as null (endpoint does
  not report usage); stale .next types break typecheck after route
  deletions — delete .next and restart dev

### 2026-07-11 — Checkpoint 2: Supabase foundation & seeds
- **Done:** tasks 2.1–2.4 — schema verified in Supabase (10 tables, view,
  pgvector, seeds); server-only service-role client; typed getSetting +
  logApiUsage helpers with temp /api/dev/smoke route; idempotent seed
  script with 2 verified Anadolu Ajansı feeds (gündem + ekonomi)
- **Remaining:** checkpoints 3–4 (fetch step, cluster step + wiring)
- **Known issues:** /api/dev/smoke is temporary, remove in checkpoint 3;
  Claude's WebFetch also hangs — feed verification goes through the user;
  Turkish news sites need a browser User-Agent (noted in task 3.1);
  .env.example gitignore decision still pending

### 2026-07-10 — Checkpoint 1: monorepo skeleton
- **Done:** TASKS.md approved; tasks 1.1–1.4 (Turborepo+pnpm workspace,
  Next.js backend with /api/health, @deef/shared, Zod env validation +
  .env.example); two decisions recorded in DECISIONS.md; stale RLS note
  added to docs/haber-app-veri-modeli.md; command-execution rules added to
  CLAUDE.md
- **Remaining:** Phase 1 checkpoints 2–4 (Supabase foundation & seeds,
  fetch step, cluster step + wiring)
- **Known issues:** build tools (pnpm/turbo/tsc/next) can't run in Claude's
  shell — verification handed to the user; `.env.example` is currently
  gitignored, which contradicts CLAUDE.md's "committed template" intent —
  pending user decision
