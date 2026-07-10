-- ============================================================
-- Haber Feed Uygulaması — İlk Migration
-- Supabase SQL Editor'de veya `supabase db push` ile çalıştır
-- ============================================================

-- pgvector (embedding'ler için)
create extension if not exists vector;

-- ------------------------------------------------------------
-- ENUM
-- ------------------------------------------------------------
create type event_status as enum (
  'clustering',
  'enriching',
  'generating_images',
  'published',
  'failed'
);

-- ------------------------------------------------------------
-- categories
-- ------------------------------------------------------------
create table categories (
  id           smallint primary key generated always as identity,
  slug         text unique not null,
  name_tr      text not null,
  style_prompt text not null,
  sort_order   smallint not null default 0,
  is_active    boolean not null default true
);

-- ------------------------------------------------------------
-- sources
-- ------------------------------------------------------------
create table sources (
  id               smallint primary key generated always as identity,
  name             text not null,
  rss_url          text unique not null,
  default_category smallint references categories(id),
  is_active        boolean not null default true,
  last_fetched_at  timestamptz
);

-- ------------------------------------------------------------
-- events
-- ------------------------------------------------------------
create table events (
  id              bigint primary key generated always as identity,
  category_id     smallint not null references categories(id),
  status          event_status not null default 'clustering',

  title           text,
  summary         text,
  eli5_text       text,
  visual_metaphor text,

  cover_image_url text,
  cover_image_alt text,

  importance      smallint not null default 5
                  check (importance between 1 and 10),
  error_message   text,
  retry_count     smallint not null default 0,

  event_date      timestamptz not null default now(),
  published_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_events_pending
  on events (status)
  where status <> 'published';

create index idx_events_feed
  on events (category_id, published_at desc)
  where status = 'published';

-- ------------------------------------------------------------
-- raw_articles
-- ------------------------------------------------------------
create table raw_articles (
  id           bigint primary key generated always as identity,
  source_id    smallint not null references sources(id),
  url          text unique not null,
  title        text not null,
  excerpt      text,
  published_at timestamptz,
  embedding    vector(768),
  event_id     bigint references events(id),
  fetched_at   timestamptz not null default now()
);

-- hnsw: veri olmadan da verimli, ivfflat'in aksine ön-eğitim istemez
create index idx_raw_articles_embedding
  on raw_articles using hnsw (embedding vector_cosine_ops);

create index idx_raw_articles_unclustered
  on raw_articles (fetched_at)
  where event_id is null;

-- ------------------------------------------------------------
-- event_cards  (v1'de pipeline doldurmuyor, şema hazır)
-- ------------------------------------------------------------
create table event_cards (
  id           bigint primary key generated always as identity,
  event_id     bigint not null references events(id) on delete cascade,
  position     smallint not null,
  text         text not null,
  image_prompt text not null,
  image_url    text,
  unique (event_id, position)
);

-- ------------------------------------------------------------
-- reactions
-- ------------------------------------------------------------
create table reactions (
  id         bigint primary key generated always as identity,
  event_id   bigint not null references events(id) on delete cascade,
  device_id  uuid not null,
  user_id    uuid references auth.users(id),
  emoji      text not null
             check (emoji in ('👍','😮','😂','😢','😡')),
  created_at timestamptz not null default now(),
  unique (event_id, device_id)
);

create index idx_reactions_event on reactions (event_id);

-- Reaction sayaçları (uygulama bunu okur, ham tabloyu değil)
create view event_reaction_counts as
select event_id, emoji, count(*)::int as count
from reactions
group by event_id, emoji;

-- ------------------------------------------------------------
-- device_tokens
-- ------------------------------------------------------------
create table device_tokens (
  device_id       uuid primary key,
  expo_push_token text not null,
  platform        text not null check (platform in ('ios','android')),
  user_id         uuid references auth.users(id),
  daily_brief     boolean not null default true,
  updated_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- daily_briefs
-- ------------------------------------------------------------
create table daily_briefs (
  id         bigint primary key generated always as identity,
  brief_date date unique not null,
  event_ids  bigint[] not null,
  headline   text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- api_usage
-- ------------------------------------------------------------
create table api_usage (
  id            bigint primary key generated always as identity,
  event_id      bigint references events(id),
  provider      text not null,
  operation     text not null,
  model         text not null,
  input_tokens  integer,
  output_tokens integer,
  image_count   smallint,
  est_cost_usd  numeric(10,6),
  created_at    timestamptz not null default now()
);

create index idx_api_usage_daily on api_usage (created_at);

-- ------------------------------------------------------------
-- app_settings
-- ------------------------------------------------------------
create table app_settings (
  key   text primary key,
  value jsonb not null
);

insert into app_settings (key, value) values
  ('max_events_per_day',            '40'),
  ('max_images_per_day',            '50'),
  ('cluster_similarity_threshold',  '0.82'),
  ('story_cards_enabled',           'false'),
  ('cluster_lookback_hours',        '48');

-- ------------------------------------------------------------
-- RLS
-- Prensip: anon key sadece yayınlanmış içeriği OKUR.
-- Tüm yazma işlemleri Next.js API route'ları üzerinden
-- service role ile yapılır (reaction ve push token dahil).
-- Service role RLS'i zaten bypass eder.
-- ------------------------------------------------------------
alter table categories    enable row level security;
alter table sources       enable row level security;
alter table events        enable row level security;
alter table raw_articles  enable row level security;
alter table event_cards   enable row level security;
alter table reactions     enable row level security;
alter table device_tokens enable row level security;
alter table daily_briefs  enable row level security;
alter table api_usage     enable row level security;
alter table app_settings  enable row level security;

create policy "public read active categories"
  on categories for select
  using (is_active = true);

create policy "public read published events"
  on events for select
  using (status = 'published');

create policy "public read cards of published events"
  on event_cards for select
  using (exists (
    select 1 from events e
    where e.id = event_cards.event_id
      and e.status = 'published'
  ));

create policy "public read reactions"
  on reactions for select
  using (true);

-- sources, raw_articles, device_tokens, daily_briefs,
-- api_usage, app_settings: anon politikası YOK → görünmez.

-- ------------------------------------------------------------
-- SEED: kategoriler (style_prompt'lar taslak, adım 2'de rafine)
-- ------------------------------------------------------------
insert into categories (slug, name_tr, style_prompt, sort_order) values
  ('gundem', 'Gündem',
   'Flat editorial illustration, bold symbolic composition, muted palette with one strong accent color, no text, no recognizable faces.',
   0),
  ('ekonomi', 'Ekonomi',
   'Flat editorial illustration, anthropomorphized objects with expressive cartoon faces, warm limited palette, clean negative space, no text.',
   1),
  ('spor', 'Spor',
   'Dynamic stylized illustration, faceless athletic figures, team colors dominant, motion lines and energy, dramatic angle, no text, no recognizable faces.',
   2),
  ('teknoloji', 'Teknoloji',
   'Isometric illustration, dark background with neon accents, geometric precision, subtle glow, no text.',
   3),
  ('dunya', 'Dünya',
   'Editorial illustration, map and landmark motifs, symbolic metaphors, cool balanced palette, no text, no recognizable faces.',
   4);
