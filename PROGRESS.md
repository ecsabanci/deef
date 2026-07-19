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

### 2026-07-12 — Checkpoint 9: mobile scaffold + theme system
- **Done:** 9.1–9.4 — Expo SDK 54 scaffold (Expo Go pin, DECISIONS.md) in
  the pnpm workspace, typecheck across 3 packages; anon client +
  EXPO_PUBLIC_* Zod env (live category smoke via RLS on iPhone); token
  theme system with Zustand preference store (system default + manual
  override); Text/Button/Card/Skeleton UI kit verified in both themes.
  Fixed template's userInterfaceStyle:"light" pin that blocked dark mode
- **Remaining:** checkpoint 10 (feed screen: TanStack Query, FlashList,
  tabs, states), checkpoint 11 (bottom sheet + sign-off)
- **Known issues:** README has no mobile setup section yet (add by
  checkpoint 11); app name/slug still template "mobile" (Phase 6
  branding); UiKitDemo screen is temporary until the feed lands

### 2026-07-18 — Checkpoint 10: feed screen
- **Done:** 10.0 DESIGN.md (binding broadsheet spec, Fraunces); 10.1 data
  layer (TanStack Query, two-phase ordering + empty-leading-page
  auto-advance); 10.2 feed UI (Masthead, CategoryTabs, FeedCard,
  SkeletonCard, FlashList, pull-to-refresh, infinite scroll); 10.3
  error/empty/offline states (StateBlock + expo-network); 10.4 masthead
  theme toggle (Feather sun/moon, animated) + Turkish uppercase fix.
  Verified on device: feed renders, states work, Fraunces loads, dark/light
  invert. Resolved a long pnpm+Metro dual-React "Invalid hook call" (single
  react forced in metro.config.js) and two missing manifest deps
  (expo-network, @expo/vector-icons)
- **Remaining:** checkpoint 11 (bottom-sheet detail + Phase 4 sign-off)
- **Known issues:** returning to "system" theme needs the future settings
  screen; B5 (palette vs real covers) + B6 (image prompts) still open

### 2026-07-12 — Checkpoint 8: images pipeline + publish — PHASE 3 COMPLETE
- **Done:** 8.1–8.3 — images module (importance-desc budget, daily-limit
  check against api_usage, crash-idempotent cover reuse, retry/transient
  rules shared with enrich via isTransientGeminiError); /api/cron/images
  + four-cron vercel.json conveyor; 15 events published with 3:4 covers;
  RLS verified from the anon key: only published events visible,
  raw_articles invisible. First end-to-end product output
- **Remaining:** ~65 events pending image drain (manual runs or deployed
  cron); Phase 4 (Expo app) breakdown next session
- **Known issues:** real cost ≈ $0.085/image → full 40-event day ≈ $3.40;
  max_images_per_day (50) should be revisited against budget; deploy
  decision (Vercel Pro vs external scheduler) still open

### 2026-07-12 — Checkpoint 7: image foundation + supervised test
- **Done:** 7.1–7.3 — migration 003 (image model/resolution/ratio/price
  as typed app_settings); covers bucket verified (public read, anon write
  rejected); gemini-image helper (token-accurate api_usage + est_cost_usd)
  + supervised test route; real illustrations reviewed on 4 events.
  Decisions: 3:4 portrait ratio; full-bleed suffix (migration 004);
  style_prompts carry technique only — economy cartoon-face clause
  removed, teknoloji faces clause added (migration 005)
- **Remaining:** checkpoint 8 — images pipeline + publish
  (`feat/images-publish`): pipeline module, cron endpoint, e2e + RLS check
- **Known issues:** real cost ≈ $0.085/image (1414 output tokens) vs
  $0.067 estimate — revisit max_images_per_day after more samples; dev
  image-test route still live until checkpoint 8

### 2026-07-12 — Checkpoint 6: quality pass — PHASE 2 COMPLETE
- **Done:** 6.1 — 15-event sample reviewed and signed off by the user:
  idiomatic Turkish, tone modes correct (somber wildfire condolence,
  playful markets), hard rules clean (no faces, no text, single scenes),
  honest importance spread (2–6). Two systemic findings recorded as
  proposed backlog tasks (B1 cluster near-duplicates, B2 digest filtering
  at fetch); prompt v2 neutral-register note in DECISIONS.md (v1 frozen)
- **Remaining:** Phase 3 (images) breakdown next session; ~10 events still
  awaiting enrich drain (run the loop twice)
- **Known issues:** threshold 0.82 can split one story into several events
  (B1); AA digest/promo items enter the pipeline (B2)

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
