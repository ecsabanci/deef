-- ============================================================
-- Migration 005 — Tone-neutral style_prompts
-- Principle (DECISIONS.md 2026-07-12): style_prompts carry TECHNIQUE
-- only (medium, palette, composition); TONE belongs to the directive
-- layer — the art director already writes playful/somber instructions
-- into each visual directive. The economy prompt's unconditional
-- "anthropomorphized objects with expressive cartoon faces" overrode
-- neutral directives (found at task 7.3 review).
-- Also adds the missing "no recognizable faces" clause to teknoloji for
-- hard-rule consistency. Idempotent: plain SETs.
-- ============================================================

update categories set style_prompt =
  'Flat editorial illustration, warm limited palette, clean negative ' ||
  'space, no text, no recognizable faces. Full-bleed composition, no ' ||
  'border, no frame, no margins.'
where slug = 'ekonomi';

update categories set style_prompt =
  'Isometric illustration, dark background with neon accents, geometric ' ||
  'precision, subtle glow, no text, no recognizable faces. Full-bleed ' ||
  'composition, no border, no frame, no margins.'
where slug = 'teknoloji';

-- Decided at 7.3: feed cards are portrait
update app_settings set value = '"3:4"' where key = 'image_aspect_ratio';
