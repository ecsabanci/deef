-- ============================================================
-- Migration 006 — events.source_url
-- Surfaces a representative source article URL onto the event so the
-- anon mobile app can offer a "read at source" link. raw_articles is not
-- anon-readable (RLS), so the URL must live on the published event.
-- Rationale: DECISIONS.md 2026-07-20. Apply after 005.
-- ============================================================

alter table events add column if not exists source_url text;

-- One-time backfill for already-published events: each event's earliest
-- linked article URL. New events get source_url populated by the enrich
-- step going forward.
update events e
set source_url = sub.url
from (
  select distinct on (event_id) event_id, url
  from raw_articles
  where event_id is not null
  order by event_id, published_at asc nulls last
) sub
where sub.event_id = e.id
  and e.source_url is null;
