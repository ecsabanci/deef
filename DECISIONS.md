# DECISIONS.md

Architectural and design decision log. When a decision changes or contradicts
PLANNING.md / docs/, it is recorded here **first** (date + rationale) and
discussed with the user before any code changes.

## Entry template

```
### YYYY-MM-DD — Short decision title
- **Decision:** what was decided
- **Rationale:** why
- **Affects:** files / documents / phases impacted
```

---

### 2026-07-12 — Style prompts carry technique only; tone lives in directives
- **Decision:** Category `style_prompt`s must describe TECHNIQUE (medium,
  palette, composition, hard-rule clauses) and never emotional register.
  Tone (playful/neutral/somber) is decided per event by the art-director
  directive layer. Migration 005 rewrites the economy prompt accordingly
  (drops "anthropomorphized objects with expressive cartoon faces") and
  adds the missing "no recognizable faces" clause to teknoloji. Spor's
  "motion lines and energy" reviewed and kept — movement is the domain's
  visual identity, not a tone override.
- **Rationale:** The unconditional cartoon-face clause overrode neutral
  directives (7.3 test, economy event) — a somber economy story would
  have gotten a joke illustration. Found and directed by the user.
- **Affects:** categories.style_prompt data (migration 005); the frozen
  art-director prompt is untouched.

### 2026-07-12 — Cover aspect ratio: 3:4 portrait
- **Decision:** `image_aspect_ratio` = "3:4" (was a 1:1 placeholder).
  Set by migration 005 for the live DB and in 003's seed for fresh
  environments.
- **Rationale:** User decision after comparing 1:1 / 3:4 / 16:9 renders
  of real events at task 7.3 — portrait suits scrolling feed cards.
- **Affects:** app_settings, all future cover generations.

### 2026-07-12 — Full-bleed suffix on style_prompts (migration 004)
- **Decision:** All five category `style_prompt`s get the suffix
  "Full-bleed composition, no border, no frame, no margins." via
  docs/004_style_prompt_full_bleed.sql.
- **Rationale:** The first supervised gemini-3.1-flash-image generation
  (task 7.3, event 9) produced a baked-in white border. The fix belongs in
  the category style layer — the frozen art-director prompt describes
  scenes, not framing, and stays untouched.
- **Affects:** categories.style_prompt data (via migration, not schema);
  all future image generations.

### 2026-07-12 — Prompt v2 candidate: neutral register (not applied)
- **Decision:** Recorded for the NEXT prompt version only — v1 stays
  frozen. The user wants summaries and ELI5s in a more neutral editorial
  register that does not inherit the source agency's institutional tone
  (e.g. AA's "devletimiz" warmth observed in the 6.1 quality pass).
- **Rationale:** Editorial direction from the user during the checkpoint 6
  sign-off. Applying it would alter calibrated behavior mid-phase; it
  waits for a user-provided v2 of the art-director document or an approved
  wrapper revision.
- **Affects:** future docs/prompts/art-director-metaprompt-v2 and/or the
  authored wrapper sections in enrich-prompt.ts. No current code change.

### 2026-07-11 — Transient API errors do not consume retry_count
- **Decision:** In pipeline steps, provider-side transient errors (HTTP
  429 RESOURCE_EXHAUSTED, 503 UNAVAILABLE) do NOT increment an event's
  `retry_count` and do not set `failed`. The run stops early and the next
  cron resumes. `retry_count` is reserved for event-specific failures
  (malformed LLM output, missing articles, etc.). Additionally, enrich
  calls now pass an API-enforced `responseSchema` after the model emitted
  trailing junk past the JSON object.
- **Rationale:** A quota error says nothing about the event; during the
  first backlog run the free-tier limit (20 req/day) marked ~10 healthy
  events `failed`. The CLAUDE.md retry rule is interpreted as applying to
  event-specific errors only.
- **Affects:** src/pipeline/enrich.ts, src/lib/gemini.ts; future images
  step inherits the same rule.

### 2026-07-11 — Enrich model: Gemini 2.5 Flash → gemini-3.5-flash
- **Decision:** The enrich step uses `gemini-3.5-flash` (JSON mode)
  instead of `gemini-2.5-flash`.
- **Rationale:** Google returns 404 "no longer available to new users" for
  gemini-2.5-flash on this project's API key (verified 2026-07-11), even
  though ListModels still lists it. `gemini-3.5-flash` is the current
  stable flash-class model; the floating alias `gemini-flash-latest` was
  rejected because a silently changing model would drift under the
  calibrated prompt, and preview/lite variants are unstable/weaker.
- **Affects:** src/lib/gemini.ts, PLANNING.md technology table, CLAUDE.md
  architecture summary, docs/haber-app-veri-modeli.md model table.

### 2026-07-11 — Enrich step: no separate daily limit
- **Decision:** The enrich cron performs no dedicated `app_settings` limit
  check. Its volume is capped upstream: cluster creates at most
  `max_events_per_day` events, and enrich only processes those.
- **Rationale:** Mirrors the 2026-07-10 fetch decision — no seeded key
  applies, and adding one would double-count the same cap. Approved by the
  user at Phase 2 breakdown review.
- **Affects:** tasks 5.3/5.4 (enrich module and cron endpoint).

### 2026-07-11 — Enrich system prompt assembly
- **Decision:** The enrich system prompt = user-calibrated visual-direction
  section (`docs/prompts/art-director-metaprompt-v1.md`, embedded VERBATIM
  — no rewording or shortening) + Claude-authored sections for
  summarization/title/ELI5 (Turkish output) and the JSON output schema
  matching the 5.1 Zod schema. The fully assembled prompt is shown to the
  user for review BEFORE the first real Gemini call. No placeholder prompt
  phase.
- **Rationale:** The visual-direction section was calibrated separately and
  frozen (PLANNING.md Phase 2); wrapping it without touching it keeps that
  calibration intact.
- **Affects:** task 5.2 (`enrich-prompt.ts`), checkpoint 6 scope (quality
  pass only, no prompt swap).

### 2026-07-11 — match_article_event RPC (migration 002) design
- **Decision:** `match_article_event(query_embedding vector(768),
  lookback_hours int)` returns the single best `(event_id, similarity)`
  among articles already linked to events, filtered by **event creation
  time** (`events.created_at`), not article fetch time. The similarity
  threshold is applied in the cluster module, not in SQL. Execute rights
  revoked from anon/authenticated — service role only.
- **Rationale:** Event age matches the data model's "events of the last 48
  hours" wording (an old event can own a recently fetched article).
  Thresholding in TypeScript lets the pipeline observe near-miss
  similarities for tuning. supabase-js cannot express pgvector operators,
  hence the RPC (see 2026-07-10 entry).
- **Affects:** docs/002_cluster_similarity_rpc.sql (new), task 4.2.

### 2026-07-11 — Embedding model: text-embedding-004 → gemini-embedding-001
- **Decision:** The pipeline uses `gemini-embedding-001` with
  `outputDimensionality: 768` instead of the retired `text-embedding-004`.
  Vectors are L2-normalized before storage (Google recommends this for
  truncated dimensions; cosine similarity itself is scale-invariant, this
  guards any future dot-product/L2 usage). Schema stays `vector(768)`.
- **Rationale:** Google removed `text-embedding-004` from the API
  (verified 2026-07-11 via ListModels: 404 on embedContent, model absent
  from the key's model list). `gemini-embedding-001` is the stable
  successor supporting 768-dim output, so no schema migration is needed.
- **Affects:** src/lib/embedding.ts, PLANNING.md technology table,
  CLAUDE.md architecture summary, docs/haber-app-veri-modeli.md model
  table.

### 2026-07-10 — Fetch step performs no daily-limit check
- **Decision:** The fetch cron step does not check any `app_settings` daily
  limit. CLAUDE.md's "every cron step checks daily limits" rule applies to
  the steps that have a seeded limit key: cluster (`max_events_per_day`)
  and images (`max_images_per_day`).
- **Rationale:** Fetch volume is naturally bounded by the size of the
  configured RSS feeds; no limit key exists for it in the seeded
  `app_settings`, and adding one would be scope creep. Approved by the user
  during TASKS.md review.
- **Affects:** tasks 3.1/3.3 (fetch module and cron endpoint), CLAUDE.md
  hard-rule interpretation.

### 2026-07-10 — Cluster comparison uses article-level nearest neighbor
- **Decision:** Clustering compares a new article's embedding against the
  embeddings of articles already linked to events within
  `cluster_lookback_hours` (HNSW cosine nearest neighbor). If the best match
  is ≥ `cluster_similarity_threshold`, the article adopts that article's
  event; otherwise a new event is created. Requires a similarity-search RPC
  added as migration `docs/002_*.sql` (task 4.1).
- **Rationale:** `events` has no embedding column, so event-level comparison
  is not possible with the current schema (which is the source of truth).
  Article-level matching uses the existing HNSW index. supabase-js cannot
  express pgvector similarity queries, hence the RPC. Approved by the user
  during TASKS.md review.
- **Affects:** tasks 4.1/4.2, docs/001_initial_schema.sql (extended by a new
  migration, not modified).
