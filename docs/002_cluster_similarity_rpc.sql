-- ============================================================
-- Migration 002 — Cluster similarity-search RPC
-- Rationale: DECISIONS.md 2026-07-10 (article-level nearest neighbor)
--            and 2026-07-11 (RPC signature).
-- Apply in the Supabase SQL editor after 001_initial_schema.sql.
-- ============================================================

-- Returns the single best-matching event for a candidate article
-- embedding, searching only articles already linked to events created
-- within the lookback window. The caller (cluster step) compares the
-- returned similarity against app_settings.cluster_similarity_threshold —
-- keeping the threshold out of SQL lets the pipeline log near-misses.
--
-- Scale note: hnsw retrieves candidates first and applies the WHERE
-- filters afterwards, so with a very large raw_articles table and a
-- narrow window this could under-return. Fine at current volumes;
-- revisit (iterative scan / partial index) if article volume grows.
create or replace function match_article_event(
  query_embedding vector(768),
  lookback_hours  int
)
returns table (event_id bigint, similarity double precision)
language sql
stable
set search_path = public
as $$
  select
    ra.event_id,
    1 - (ra.embedding <=> query_embedding) as similarity
  from raw_articles ra
  join events e on e.id = ra.event_id
  where ra.embedding is not null
    and e.created_at >= now() - make_interval(hours => lookback_hours)
  order by ra.embedding <=> query_embedding
  limit 1;
$$;

-- Pipeline-internal: only the service role may call it. (raw_articles has
-- no anon RLS policy, and this function must not become a side channel.)
revoke execute on function match_article_event(vector, int) from public;
revoke execute on function match_article_event(vector, int) from anon;
revoke execute on function match_article_event(vector, int) from authenticated;
