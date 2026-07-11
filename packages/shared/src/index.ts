// Types and constants mirrored from docs/001_initial_schema.sql (the source
// of truth). Update only alongside an approved schema migration.

export const EVENT_STATUSES = [
  "clustering",
  "enriching",
  "generating_images",
  "published",
  "failed",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const CATEGORY_SLUGS = [
  "gundem",
  "ekonomi",
  "spor",
  "teknoloji",
  "dunya",
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const REACTION_EMOJIS = ["👍", "😮", "😂", "😢", "😡"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const APP_SETTING_KEYS = [
  "max_events_per_day",
  "max_images_per_day",
  "cluster_similarity_threshold",
  "story_cards_enabled",
  "cluster_lookback_hours",
  // added by docs/003_image_settings.sql
  "image_model",
  "image_resolution",
  "image_aspect_ratio",
  "image_price_usd_per_1m_output_tokens",
] as const;
export type AppSettingKey = (typeof APP_SETTING_KEYS)[number];

/** vector(768) — dimension of text-embedding-004 embeddings. */
export const EMBEDDING_DIMENSIONS = 768;

/** After this many failed attempts an event's status becomes 'failed'. */
export const MAX_RETRY_COUNT = 3;
