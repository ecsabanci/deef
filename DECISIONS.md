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
