# PLANNING.md

## Vision

A mobile app that turns news reading into a visual experience. Articles
covering the same story are grouped into a single "event", an LLM generates
an engaging summary and a visual metaphor for each event, and the Gemini
image API illustrates that metaphor in a category-specific art style. The
differentiator is visual identity: consistent, striking editorial
illustration instead of real news photos.

Example: "Gold drops 3%" → an illustration of a frightened gold coin falling
from a height with its mouth open.

## Product principles

- The app is "dumb": all generation happens in the backend, mobile only
  reads published content
- Predictable cost: image generation per event (not per article), daily
  limits, cached
- Premium feel: consistent theme system, skeleton loaders, smooth
  animations, dark mode, consistent responsive behavior on every device
- Transparency: "AI-generated" label on images
- Safe image policy: no recognizable faces of real people, no text inside
  images, emotion conveyed through body language and composition

## Technology

| Layer | Choice | Note |
|-------|--------|------|
| Monorepo | Turborepo + pnpm | apps/backend, apps/mobile, packages/shared |
| Backend | Next.js App Router (Vercel) | cron + API routes |
| DB | Supabase Postgres + pgvector | schema: docs/001_initial_schema.sql |
| Storage | Supabase Storage (covers bucket) | |
| Mobile | Expo + React Native + TypeScript | |
| Server state | TanStack Query | cache, pull-to-refresh |
| Local state | Zustand | theme, preferences |
| Animation | react-native-reanimated | story, transitions |
| Lists | FlashList + expo-image | performance + image cache |
| Bottom sheet | @gorhom/bottom-sheet | news detail experience |
| Text LLM | Gemini 2.5 Flash (JSON mode) | summary, metaphor, ELI5 |
| Embedding | text-embedding-004 | clustering |
| Images | Gemini image API | category style_prompt + metaphor |
| Push | expo-notifications | daily brief |
| Monitoring | Sentry + PostHog | free tier |

## Pipeline

RSS → fetch (30 min) → cluster (30 min, cosine similarity, threshold in
app_settings) → enrich (15 min, one structured call: title + summary + ELI5
+ metaphor + importance) → images (15 min, cover image) → published

Detailed rationale and table docs: docs/haber-app-veri-modeli.md

## Phases

### Phase 1 — Backend skeleton + fetch & cluster
Monorepo setup, Supabase client helpers (Zod-validated env), fetch step with
rss-parser, cluster step with pgvector cosine similarity, two cron endpoints
protected by CRON_SECRET, source seed script (2 real RSS feeds), README.
Outcome: raw_articles starts filling and events get created.

### Phase 2 — Enrich (art director)
The meta-prompt will be calibrated separately with the user and provided
ready. Structured output + Zod schema validation, category assignment,
importance, retry/failed flow, api_usage logging.

### Phase 3 — Image generation + publishing
Gemini image integration, category style_prompt + metaphor combination,
Storage upload, cover_image_url + transition to published, daily image
limit. Outcome: first end-to-end published event.

### Phase 4 — Expo app
Theme system (color/spacing/typography tokens, dark mode), shared ui/
component library (Text, Card, Skeleton, Button), feed screen (FlashList,
category tabs, skeleton loaders, pull-to-refresh), bottom sheet news detail,
error/empty/offline states.

### Phase 5 — Interaction
Reaction API route + UI, ELI5 view, device_id management, push notifications
+ daily brief cron, Sentry + PostHog integration.

### Phase 6 — Release readiness
Privacy policy, store assets, EAS build + submit, AI content labels, final
cost calibration.

### Deferred (schema ready, no code)
Story cards (event_cards), auth (Supabase Auth), comments, personalized
category weights.

## MVP success criteria

End-to-end flow: crons run in the morning, the feed lists the day's news
with category tabs and consistent illustrations, tapping a story opens a
bottom sheet with summary + ELI5, reactions can be left. Daily image cost
stays under the app_settings limit.