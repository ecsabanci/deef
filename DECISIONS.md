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
