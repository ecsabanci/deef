-- ============================================================
-- Migration 004 — Full-bleed suffix on category style_prompts
-- Finding from the 7.3 supervised test (2026-07-12): generated covers
-- had a baked-in white border/frame. Fix lives in the category style
-- layer; the frozen art-director prompt is untouched.
-- Idempotent: the WHERE guard skips already-suffixed rows.
-- ============================================================

update categories
set style_prompt = style_prompt ||
  ' Full-bleed composition, no border, no frame, no margins.'
where style_prompt not ilike '%full-bleed%';
