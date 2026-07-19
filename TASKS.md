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

## Phase 1 — Backend skeleton + fetch & cluster ✅ COMPLETE (2026-07-11)

**Phase outcome (met):** `raw_articles` starts filling from 2 real RSS
feeds and events get created by the cluster step.

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

- [x] **3.1 Fetch module `src/pipeline/fetch.ts`**
  For each active source: fetch RSS with `rss-parser`, dedupe by `url`,
  insert into `raw_articles` (title, excerpt, published_at), update
  `sources.last_fetched_at`. One failing source must not abort the rest.
  Requests MUST send a browser User-Agent — some Turkish news sites block
  bare clients (verified 2026-07-11).
  **DoD:** running twice against the real feeds inserts zero duplicates on
  the second run; a source with a broken URL is skipped with a logged error
  while others succeed.

- [x] **3.2 Embedding generation** (`gemini-embedding-001` — see
  DECISIONS.md 2026-07-11; original model was retired by Google)
  Embed title + excerpt for articles with `embedding is null`, write the
  768-dim vector, log every call to `api_usage` (operation `embed`).
  Runs as part of the fetch step (per docs/haber-app-veri-modeli.md).
  **DoD:** all new articles have non-null embeddings; matching `api_usage`
  rows exist; re-run embeds nothing (idempotent).

- [x] **3.3 Cron endpoint `GET /api/cron/fetch`**
  Protected by `CRON_SECRET` (Authorization: Bearer). Returns a JSON summary
  (sources processed, articles inserted, embeddings created).
  **DoD:** missing/wrong secret → 401 with no side effects; correct secret
  runs the full fetch step and returns accurate counts.

**Checkpoint DoD:** hitting the cron endpoint fills `raw_articles` with
embedded articles, idempotently. Open PR, stop.

---

### PR Checkpoint 4 — Cluster step + wiring
Branch: `feat/cluster-step`

- [x] **4.1 Migration proposal: similarity-search RPC (`docs/002_….sql`)**
  supabase-js cannot run pgvector similarity SQL directly; a `match_article`
  RPC (nearest neighbors among articles already linked to events within
  `cluster_lookback_hours`) is needed. New migration file + DECISIONS.md
  entry, **submitted for approval before applying**.
  **DoD:** migration file reviewed, approved, applied; decision recorded.

- [x] **4.2 Cluster module `src/pipeline/cluster.ts`**
  For each unclustered article: nearest-neighbor cosine similarity against
  articles of events from the last `cluster_lookback_hours`; if best match ≥
  `cluster_similarity_threshold` attach to that event, else create a new
  event (`status = clustering`, category from the source's
  `default_category`). Checks `max_events_per_day` before creating events.
  **DoD:** two similar articles end up on one event; a dissimilar article
  gets its own event; daily event limit respected; re-run changes nothing.

- [x] **4.3 Cron endpoint `GET /api/cron/cluster` + `vercel.json`**
  Same `CRON_SECRET` protection; `vercel.json` declares both cron schedules
  (fetch and cluster every 30 min).
  **DoD:** 401 without secret; with secret runs cluster and returns counts;
  `vercel.json` valid with two cron entries.

- [x] **4.4 README**
  Setup from a clean clone: prerequisites, `pnpm install`, env setup,
  applying the migration, seeding sources, triggering crons locally via curl.
  **DoD:** following the README verbatim reproduces a working local setup;
  every documented command works as written.

- [x] **4.5 Phase 1 end-to-end verification**
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

## Phase 2 — Enrich (art director) ✅ COMPLETE (2026-07-12)

**Phase outcome:** events in `clustering` status get an LLM-generated
Turkish title, summary, ELI5, visual metaphor, category and importance via
one structured Gemini 2.5 Flash call, then move to `generating_images` —
with the full retry/failed flow and token-accurate `api_usage` logging.
v1 rule: `event_cards` is NOT populated (`story_cards_enabled` is false).

---

### PR Checkpoint 5 — Enrich core (placeholder prompt)
Branch: `feat/enrich-step`

- [x] **5.1 Enrich output schema**
  Zod schema for the structured LLM response: `title`, `summary`,
  `eli5`, `category_slug` (must be one of `CATEGORY_SLUGS`),
  `importance` (int 1–10), `cover_metaphor`. Lives in
  `apps/backend/src/pipeline/enrich-schema.ts`; no card fields in v1.
  **DoD:** typecheck passes; schema demonstrably rejects an invalid
  sample (wrong slug, importance 11) and accepts a valid one.

- [x] **5.2 Gemini structured-call helper + assembled system prompt**
  `src/lib/gemini.ts`: one call to `gemini-2.5-flash` in JSON mode
  returning raw text + usage metadata; logs `api_usage` (operation
  `enrich`) with real input/output token counts.
  `src/pipeline/enrich-prompt.ts` assembles the system prompt: the
  calibrated visual-direction section from
  `docs/prompts/art-director-metaprompt-v1.md` embedded VERBATIM +
  authored summarization/title/ELI5 sections (Turkish output) + JSON
  schema section matching 5.1. The full assembled prompt is shown to the
  user for review BEFORE the first real Gemini call (see DECISIONS.md).
  **DoD:** user approves the assembled prompt; helper compiles; a single
  manual invocation returns parseable JSON and writes an `api_usage` row
  with non-null token counts.

- [x] **5.3 Enrich module `src/pipeline/enrich.ts`**
  Select events with `status in (clustering, enriching)` older than 15
  minutes (so cluster settles first); mark `enriching`; build the prompt
  from the event's linked article titles+excerpts; call Gemini; Zod-parse;
  update `title/summary/eli5_text/visual_metaphor/importance` and
  `category_id` (from returned slug); transition to `generating_images`.
  Failure path: increment `retry_count`, store `error_message`; at
  `MAX_RETRY_COUNT` (3) set status `failed`. Idempotent: a crashed run
  leaves `enriching` events that the next run picks up.
  **DoD:** one real event enriched end to end with Turkish fields
  populated and status `generating_images`; a forced failure (temporarily
  bad model name) increments `retry_count` and, after 3 runs, lands in
  `failed` with `error_message` set; re-run after success changes nothing.

- [x] **5.4 Cron endpoint `GET /api/cron/enrich` + vercel.json entry**
  Same `CRON_SECRET` pattern; summary JSON (processed, enriched, failed,
  retried); vercel.json adds the 15-min schedule offset from fetch/cluster.
  **DoD:** 401 without secret; with secret processes pending events and
  returns accurate counts; vercel.json valid with three cron entries.

**Checkpoint DoD:** the backlog of `clustering` events flows to
`generating_images` with plausible (placeholder-quality) Turkish content,
failures retry and dead-end correctly. Open PR, stop.

---

### PR Checkpoint 6 — Quality pass
Branch: `feat/enrich-quality`

- [x] **6.1 Quality pass on 10–15 real events**
  Reset an approved sample of enriched events back to `clustering`
  (allowed while nothing is published; api_usage logging as usual) and
  re-enrich. User reviews titles/summaries/ELI5/metaphors for tone,
  Turkish quality, and safe-image compliance; importance spread
  sanity-checked.
  **DoD:** user signs off on the sample; any prompt tweaks recorded in
  DECISIONS.md (the calibrated section itself stays frozen unless the
  user provides a new version); PROGRESS.md updated.

**Checkpoint DoD:** enrich output is production-quality per user review.
Open PR, stop.

---

## Open questions for Phase 2 (answer before approval)

1. **Enrich daily limit:** no `app_settings` key applies to enrich; its
   volume is naturally capped upstream by `max_events_per_day` (cluster
   creates at most 40 events/day, enrich only processes those). Proposal:
   no separate limit check, recorded in DECISIONS.md like the fetch
   decision. OK?
2. **Meta-prompt timing:** is the calibrated prompt ready now, or do we
   proceed with checkpoint 5's clearly-marked placeholder first? The
   placeholder will produce structurally valid but tonally uncalibrated
   content on real events (costing a few cents of Gemini calls).
3. **Re-enriching for the quality pass (6.2):** OK to reset a sample of
   already-enriched events back to `clustering` (clearing their generated
   fields) so the calibrated prompt reprocesses them? They're not
   published yet, so nothing user-visible changes.
4. **15-minute minimum event age** before enrich (from the data model doc,
   so cluster finishes attaching articles): confirm keeping it.

---

## Phase 3 — Image generation + publishing ✅ COMPLETE (2026-07-12)

**Phase outcome:** events in `generating_images` get one cover
illustration (category `style_prompt` + `visual_metaphor`), uploaded to
Supabase Storage, and transition to `published` — first end-to-end
published events, under `max_images_per_day`.
Model (user decision 2026-07-12): `gemini-3.1-flash-image` @ 1K —
Imagen 4 and 2.5-flash-image both have scheduled shutdowns.

---

### PR Checkpoint 7 — Image foundation + supervised test call
Branch: `feat/images-step`

- [x] **7.1 Migration 003: image settings + shared keys**
  New `app_settings` rows (seeded via `docs/003_image_settings.sql`,
  applied user-assisted): `image_model` (`"gemini-3.1-flash-image"`),
  `image_resolution` (`"1K"`), `image_aspect_ratio` (placeholder until
  the 7.3 decision), `image_price_usd_per_1m_output_tokens` (for
  `est_cost_usd`; user supplies the price from Google's pricing page).
  Extend `AppSettingKey` in `@deef/shared` + per-key Zod schemas in
  `settings.ts`. Model/resolution/ratio changes then need no deploy.
  **DoD:** migration applied; `getSetting` returns all four values typed;
  typecheck passes.

- [x] **7.2 Storage `covers` bucket (user-assisted)**
  User creates the bucket in the Supabase dashboard: public read, no anon
  writes (service role uploads). Path convention:
  `events/{event_id}/cover.png`.
  **DoD:** bucket exists; a manually uploaded test file is publicly
  readable via its URL; anon upload is rejected.

- [x] **7.3 Image call helper + ONE supervised test call**
  `src/lib/gemini-image.ts`: one image from a composed prompt
  (category `style_prompt` + event `visual_metaphor`), using the
  settings-driven model/resolution; logs `api_usage` (operation `image`,
  actual token counts from the response, `image_count`, `est_cost_usd`
  from the price setting). Temporary dev route generates ONE image from a
  real event and uploads it to `covers` for viewing. User reviews the
  output — quality, style adherence, safe-image rules — and DECIDES THE
  ASPECT RATIO from the model's supported options (feed-card driven; 1:1
  vs 3:4 vs 4:3 vs 16:9 vs 9:16) before anything is batched.
  **DoD:** one reviewed image in the bucket; aspect ratio decision
  recorded in DECISIONS.md and written to `app_settings`; api_usage row
  has non-null token counts and est_cost_usd.

**Checkpoint DoD:** model, resolution, ratio, price, and bucket all
confirmed against one real reviewed image. Open PR, stop.

---

### PR Checkpoint 8 — Images pipeline + publish
Branch: `feat/images-publish`

- [x] **8.1 Images module `src/pipeline/images.ts`**
  Select `generating_images` events (importance desc, created_at asc
  tiebreaker — biggest stories first, equal ones oldest-first); check `max_images_per_day` against
  today's `api_usage` image count before each generation; compose prompt;
  generate; upload to `covers/events/{id}/cover.png`; set
  `cover_image_url` + `cover_image_alt` (v1: derived from the event
  title); transition to `published` with `published_at = now()`.
  Retry/failed per hard rule; transient 429/503 stop the run without
  consuming retry_count (DECISIONS.md 2026-07-11). Idempotent: an event
  with an uploaded image but a crashed status update re-publishes without
  regenerating.
  **DoD:** a batch of real events publishes end to end; re-run changes
  nothing; a forced failure walks retry → failed; limit check verified.

- [x] **8.2 Cron endpoint `GET /api/cron/images` + vercel.json**
  Same CRON_SECRET pattern, summary JSON, schedule offset in the
  15-minute conveyor (e.g. `10,25,40,55 * * * *`).
  **DoD:** 401 without secret; accurate counts; vercel.json valid with
  four cron entries.

- [x] **8.3 Phase 3 end-to-end verification**
  Full local conveyor: fetch → cluster → enrich → images. Verify ≥1 event
  fully `published` with a viewable cover; **RLS check:** anon key sees
  published events only (and nothing else); PROGRESS.md updated.
  **DoD:** Phase 3 outcome met — first published events with
  illustrations, daily image limit respected.

**Checkpoint DoD:** the pipeline produces published, illustrated events
unattended. Open PR, stop.

---

## Phase 4 — Expo app — PROPOSED, awaiting approval

**Phase outcome:** a running Expo app (iOS/Android) showing the published
feed with category tabs, consistent 3:4 illustrated cards, pull-to-refresh,
skeleton/error/empty/offline states, and a bottom-sheet news detail — all
read-only via the anon key (RLS). Reactions/ELI5 view/push are Phase 5.

**Ground rules:** anon key + `EXPO_PUBLIC_*` env vars only (never the
service key); mobile consumes `@deef/shared`; all user-facing text
Turkish; every Expo/simulator command runs on the user's machine.

---

### PR Checkpoint 9 — Mobile scaffold + theme system
Branch: `feat/mobile-setup`

- [x] **9.1 Expo scaffold in `apps/mobile` (user-assisted)**
  `create-expo-app` (TS template, latest stable SDK), wired into the pnpm
  workspace + turbo (`typecheck` script), TS strict via the shared base
  config, `@deef/shared` consumed.
  **DoD:** app boots in the simulator/Expo Go with a placeholder screen;
  `pnpm typecheck` covers 3 packages and passes.

- [x] **9.2 Anon Supabase client + env plumbing**
  `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Zod-
  validated at startup, `.env.example` documented), anon supabase-js
  client. Smoke: fetch active categories (anon-readable by RLS).
  **DoD:** app renders the five Turkish category names from the real DB;
  service key nowhere in `apps/mobile`.

- [x] **9.3 Theme system**
  Color/spacing/typography/radius tokens, light + dark palettes, Zustand
  store (system/light/dark preference), `useTheme` hook.
  **DoD:** toggling theme live-switches every token consumer; tokens are
  typed (no raw hex in components).

- [x] **9.4 UI kit: Text, Button, Card, Skeleton**
  Token-driven primitives with a temporary demo screen showing all four
  in both themes (demo removed when the feed lands).
  **DoD:** demo screen reviewed in light + dark; components take no
  hardcoded colors/sizes.

**Checkpoint DoD:** themed app skeleton runs on device with live category
data. Open PR, stop.

---

### PR Checkpoint 10 — Feed screen
Branch: `feat/mobile-feed`

- [x] **10.0 DESIGN.md — binding mobile design spec** (user-directed
  addition, 2026-07-12)
  Draft `docs/DESIGN.md` in the format of
  `docs/design-reference-miranda.md` (tokens + recipes + do's/don'ts):
  "digital broadsheet" identity, near-monochrome chrome with one accent,
  warm neutrals in both light ("ink on paper") and dark ("paper on ink"),
  serif display face via expo-font, extending checkpoint-9 tokens.
  Referenced from CLAUDE.md as binding for all mobile UI work.
  **DoD:** user approves the draft; CLAUDE.md references it; 10.2+ builds
  against it.

- [x] **10.1 Data layer (TanStack Query)**
  Query client + `usePublishedEvents(categorySlug?)` hook: published
  events via anon RLS, feed ordering (see open question 1), reasonable
  page size; row types built on `@deef/shared`.
  **DoD:** hook returns real published events; category filter works;
  refetch on pull works at the hook level.

- [x] **10.2 Feed UI**
  FlashList of event cards (3:4 cover via expo-image with caching, title,
  category chip, "AI ile üretildi" transparency label), category tabs from
  the categories table (sort_order, "Tümü" first), pull-to-refresh,
  skeleton loaders during initial load.
  **DoD:** real feed scrolls smoothly with cached images on device; tabs
  filter correctly; skeletons show on cold start.

- [x] **10.3 Error / empty / offline states**

- [x] **10.4 Masthead theme toggle** (user-directed, 2026-07-12; DESIGN.md
  amended — see DECISIONS.md 2026-07-18)
  Feather sun/moon icon in the masthead toggling the theme with a
  rotate+pop animation (core Animated); also fixes Turkish uppercasing
  (EKONOMİ/TEKNOLOJİ) via a locale-correct helper.
  **DoD:** toggle flips light/dark on device in both themes with the
  animation; tabs/meta show correct Turkish capital İ; typecheck passes.
  Turkish copy + retry affordances; offline detection.
  **DoD:** airplane mode shows the offline state and recovers on retry;
  an empty category shows the empty state; a forced query error shows the
  error state.

**Checkpoint DoD:** the feed is a usable product on a real device. Open
PR, stop.

---

### PR Checkpoint 11 — News detail bottom sheet
Branch: `feat/mobile-detail`

- [x] **11.1 Bottom sheet detail (@gorhom/bottom-sheet)**
  Includes (user-requested 2026-07-20): ELI5 button→spinner→reveal +
  "Kaynakta oku" in-app WebView sheet (stacked at matching 92% height;
  migration 006 events.source_url; DECISIONS.md).
  Tap card → sheet with full cover, title, summary, published time,
  category, AI-generated label. (ELI5 toggle and reactions arrive in
  Phase 5.) Smooth open/close with reanimated; dismiss by swipe/backdrop.
  **DoD:** open/close feels 60fps on device; all content fields correct;
  works in both themes.

- [~] **11.2 Phase 4 end-to-end verification**
  Full pass on a real device against the production DB: cold start →
  skeletons → feed → tab switches → detail → theme toggle → offline test.
  PROGRESS.md updated.
  **DoD:** MVP feed experience matches the PLANNING.md "premium feel"
  principles; user signs off.

**Checkpoint DoD:** Phase 4 outcome met. Open PR, stop.

---

## Open questions for Phase 4 (answer before approval)

1. **Feed ordering.** Options: (a) `published_at` desc (pure freshness),
   (b) `importance` desc then `published_at` desc (curated-first), or
   (c) freshness with an importance boost. Recommendation: (b) within
   "today", then older days by freshness — but this is a product call.
2. **Category tabs:** confirm "Tümü" (all) as the first tab + the five
   categories by `sort_order`.
3. **Theme default:** follow the system (recommended) or default dark?
4. **Test target:** which device/simulator will you use for the DoD
   checks (iOS Simulator, Android emulator, physical phone via Expo Go)?
   Affects how I phrase the verification steps.
5. **Feed page size:** 20 initial + infinite scroll, or a flat "last 50"?
   v1 volume (≤40/day) makes flat viable; infinite scroll is more future-
   proof but adds pagination plumbing now.

---

## Proposed backlog (recorded 2026-07-12, NOT yet approved or scheduled)

- [ ] **B1. Clustering near-duplicate observation**
  Events 26/27/28 (Türkiye–KKTC gas pipeline) show the same story split
  across events at threshold 0.82. Observe frequency over a week of real
  runs (SQL over events + article titles) before tuning
  `cluster_similarity_threshold` (candidate range 0.78–0.80) — lowering
  blindly risks false merges.
  **DoD (when approved):** a written observation summary with data; a
  threshold decision recorded in DECISIONS.md (change via app_settings,
  no code).

- [ ] **B3. Accessibility pass on cover_image_alt** (recorded 2026-07-12)
  v1 derives alt text from the event title. A proper pass should describe
  the actual illustration (possibly a cheap LLM call on the metaphor) and
  follow alt-text conventions for Turkish screen readers.
  **DoD (when approved):** alt strategy decided + implemented; existing
  events backfilled.

- [ ] **B5. Palette warmth tuning against real covers** (recorded
  2026-07-12)
  Once real illustrations flow in the feed on device, revisit the
  DESIGN.md paper tones against actual covers — ±5% warmth adjustments
  expected. Token-value change only.
  **DoD (when approved):** side-by-side device review; adjusted values in
  tokens.ts + DESIGN.md; DECISIONS.md entry.

- [ ] **B6. Image prompt improvements** (recorded 2026-07-18)
  Illustration-first reaffirmed (real-photo/real-face pivot dropped
  2026-07-18). Improve the art-director prompt so covers read less
  childish and never mislead: (a) steer sports metaphors OFF
  club-specific color combos — the Spain red/yellow cover read as
  Galatasaray to a TR audience; (b) steer OFF juvenile literal
  size-metaphor clichés (the Switzerland "tiny player vs giant opponent").
  Coordinate with the frozen-prompt versioning + the v2 neutral-register
  candidate (DECISIONS.md 2026-07-12).
  **DoD (when approved):** prompt updated, sample re-reviewed by the user.

- [ ] **B5. Palette tuning against real covers** (recorded 2026-07-12)
  Once real illustrations flow in the feed on device, revisit the
  DESIGN.md paper tones against actual covers — ±5% warmth adjustments
  may be needed so chrome neither yellows nor cools next to the art.
  **DoD (when approved):** side-by-side device review in both themes;
  any token changes recorded in DECISIONS.md.

- [ ] **B4. Enrich outputs its tone classification** (recorded 2026-07-12)
  The art director internally classifies each story (playful/neutral/
  somber) but the label is not persisted. Add `tone` to the enrich JSON
  schema + an events column (migration), enabling tone-aware style
  composition and quality analytics. Requires prompt wrapper + schema
  changes — coordinate with the frozen-prompt versioning.
  **DoD (when approved):** tone stored per event; backfill strategy
  decided; analytics query documented.

- [ ] **B2. Digest/roundup filtering at fetch**
  AA publishes non-news digest items ("Günün Ekonomik Gelişmeleri …",
  sponsor-branded bulletins) that flow through the pipeline (event 35,
  importance 2). Decide filter mechanism at fetch (title patterns per
  source? a `skip_patterns` column on sources?) and propose as a concrete
  task.
  **DoD (when approved):** digest items from seeded feeds no longer enter
  `raw_articles`; filter is source-configurable, not hardcoded.

## Later phases

Phases 3–6 will be broken down after Phase 2 review is merged.
