import { z } from "zod";
import { CATEGORY_SLUGS } from "@deef/shared";

// Structured output contract for the enrich LLM call. Mirrors the fields
// the pipeline writes onto events (docs/haber-app-veri-modeli.md); v1 has
// no card fields (story_cards_enabled = false).
export const enrichOutputSchema = z.object({
  // Short, catchy Turkish headline
  title: z.string().trim().min(1).max(120),
  // 2-3 sentence Turkish summary
  summary: z.string().trim().min(1).max(1000),
  // "Explain like I'm five" Turkish text
  eli5: z.string().trim().min(1).max(1000),
  category_slug: z.enum(CATEGORY_SLUGS),
  importance: z.number().int().min(1).max(10),
  // English visual directive, 25-50 words per the art-director prompt;
  // generous bounds so a valid directive is never rejected on length
  cover_metaphor: z.string().trim().min(20).max(600),
});

export type EnrichOutput = z.infer<typeof enrichOutputSchema>;
