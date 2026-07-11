-- ============================================================
-- Migration 003 — Image generation settings
-- Rationale: TASKS.md 7.1 (approved 2026-07-12). Model, resolution,
-- aspect ratio and pricing are app_settings so they change without a
-- deploy. Apply in the Supabase SQL editor after 002.
-- ============================================================

-- image_aspect_ratio: 3:4 portrait, decided at task 7.3 (feed cards).
-- image_price_usd_per_1m_output_tokens: 60 per Google's pricing page for
-- gemini-3.1-flash-image (2026-07-12); observed real cost ≈ 1414 output
-- tokens ≈ $0.085 per 1K image. Used to compute api_usage.est_cost_usd
-- from actual tokens.
insert into app_settings (key, value) values
  ('image_model',                          '"gemini-3.1-flash-image"'),
  ('image_resolution',                     '"1K"'),
  ('image_aspect_ratio',                   '"3:4"'),
  ('image_price_usd_per_1m_output_tokens', '60')
on conflict (key) do nothing;
