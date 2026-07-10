# Haber Feed Uygulaması — Veri Modeli ve Pipeline Tasarımı

## Genel Mimari

```
RSS Kaynakları
     │
     ▼
[Cron: fetch] ──► raw_articles (ham haberler + embedding)
     │
     ▼
[Cron: cluster] ──► events (aynı olayı anlatan haberler tek event)
     │
     ▼
[Cron: enrich] ──► LLM tek çağrı: özet + kategori + metafor + ELI5 + kart metinleri
     │
     ▼
[Cron: images] ──► Gemini image: kapak + kart görselleri
     │
     ▼
status = 'published' ──► Mobil uygulama sadece bunları okur
```

Temel prensip: uygulama aptal, backend akıllı. Mobil taraf hiçbir generation yapmaz,
sadece `published` event'leri çeker.

---

## Tablolar

### categories
Elle seed edilir. Her kategorinin görsel kimliği burada yaşar.

```sql
create table categories (
  id            smallint primary key generated always as identity,
  slug          text unique not null,        -- 'spor', 'ekonomi', 'teknoloji', 'gundem', 'dunya'
  name_tr       text not null,               -- 'Spor'
  style_prompt  text not null,               -- görsel üretim şablonu (İngilizce yazılır)
  sort_order    smallint not null default 0,
  is_active     boolean not null default true
);
```

`style_prompt` örneği (ekonomi):
> "Flat editorial illustration, limited warm palette, anthropomorphized objects
> with expressive faces, clean negative space, no text, no real people."

Metafor + bu şablon birleşip image prompt'u oluşturur. Kategori stili tek yerden
değişir, feed tutarlı kalır.

### sources
RSS kaynakları.

```sql
create table sources (
  id               smallint primary key generated always as identity,
  name             text not null,            -- 'Anadolu Ajansı - Ekonomi'
  rss_url          text unique not null,
  default_category smallint references categories(id),  -- kaynak kategori ipucu
  is_active        boolean not null default true,
  last_fetched_at  timestamptz
);
```

### raw_articles
Çekilen ham haberler. Dedupe ve cluster'lamanın hammaddesi.

```sql
create table raw_articles (
  id            bigint primary key generated always as identity,
  source_id     smallint not null references sources(id),
  url           text unique not null,        -- dedupe anahtarı
  title         text not null,
  excerpt       text,                        -- RSS description
  published_at  timestamptz,
  embedding     vector(768),                 -- pgvector, cluster için
  event_id      bigint references events(id), -- null = henüz cluster'lanmadı
  fetched_at    timestamptz not null default now()
);

create index on raw_articles using ivfflat (embedding vector_cosine_ops);
create index on raw_articles (event_id) where event_id is null;
```

### events
Uygulamanın ana içerik birimi. Feed'de görünen şey bu.

```sql
create type event_status as enum (
  'clustering',        -- yeni oluştu, makale bağlanıyor
  'enriching',         -- LLM metin üretimi sırada
  'generating_images', -- görseller üretiliyor
  'published',         -- yayında
  'failed'             -- bir adım başarısız, retry veya manuel müdahale
);

create table events (
  id               bigint primary key generated always as identity,
  category_id      smallint not null references categories(id),
  status           event_status not null default 'clustering',

  -- LLM üretimi (tek structured çağrı)
  title            text,                     -- kısa, ilgi çekici başlık
  summary          text,                     -- 2-3 cümle özet
  eli5_text        text,                     -- "5 yaşındaymışım gibi anlat"
  visual_metaphor  text,                     -- "korkmuş çeyrek altın yüksekten düşüyor"

  -- Görsel
  cover_image_url  text,                     -- feed thumbnail (Supabase Storage)
  cover_image_alt  text,

  importance       smallint not null default 5,  -- 1-10, feed sıralaması için
  error_message    text,                     -- failed durumunda debug
  retry_count      smallint not null default 0,

  event_date       timestamptz not null,     -- olayın tarihi
  published_at     timestamptz,              -- yayına alınma anı
  created_at       timestamptz not null default now()
);

create index on events (status) where status != 'published';
create index on events (category_id, published_at desc) where status = 'published';
```

### event_cards
Story deneyimi. Her event 3-4 kart, her kart olayın bir aşaması.

```sql
create table event_cards (
  id           bigint primary key generated always as identity,
  event_id     bigint not null references events(id) on delete cascade,
  position     smallint not null,            -- 0, 1, 2, 3
  text         text not null,                -- kart metni (1-2 cümle)
  image_prompt text not null,                -- LLM'in ürettiği kart metaforu
  image_url    text,                         -- üretilince dolar
  unique (event_id, position)
);
```

Feed thumbnail'i `events.cover_image_url`, story akışı `event_cards`. Kapak
görseli kart 0'dan farklı bir kompozisyon olabilir diye ayrı tutuldu.

### reactions
Auth'suz çalışır, auth gelince kırılmaz.

```sql
create table reactions (
  id          bigint primary key generated always as identity,
  event_id    bigint not null references events(id) on delete cascade,
  device_id   uuid not null,                 -- client'ta üretilir, cihazda saklanır
  user_id     uuid references auth.users(id), -- şimdilik hep null
  emoji       text not null check (emoji in ('👍','😮','😂','😢','😡')),
  created_at  timestamptz not null default now(),
  unique (event_id, device_id)               -- cihaz başına tek reaction
);
```

Auth eklendiğinde: login olan kullanıcının `device_id` kayıtlarına `user_id`
yazılır, migration gerekmez. Comment tablosu da aynı kalıpla eklenir.

### device_tokens
Push notification (günlük brief) için.

```sql
create table device_tokens (
  device_id        uuid primary key,
  expo_push_token  text not null,
  platform         text not null check (platform in ('ios','android')),
  user_id          uuid references auth.users(id),  -- ileride
  daily_brief      boolean not null default true,   -- bildirim tercihi
  updated_at       timestamptz not null default now()
);
```

### daily_briefs
Sabah 08:00 push digest'i.

```sql
create table daily_briefs (
  id          bigint primary key generated always as identity,
  brief_date  date unique not null,
  event_ids   bigint[] not null,             -- günün 5 haberi
  headline    text not null,                 -- push metni
  created_at  timestamptz not null default now()
);
```

### api_usage
Maliyet takibi. Her LLM/image çağrısı loglanır.

```sql
create table api_usage (
  id             bigint primary key generated always as identity,
  event_id       bigint references events(id),
  provider       text not null,              -- 'gemini'
  operation      text not null,              -- 'enrich', 'embed', 'image'
  model          text not null,
  input_tokens   integer,
  output_tokens  integer,
  image_count    smallint,
  est_cost_usd   numeric(10,6),
  created_at     timestamptz not null default now()
);
```

### app_settings
Günlük limitler ve pipeline ayarları, deploy'suz değişir.

```sql
create table app_settings (
  key    text primary key,
  value  jsonb not null
);
-- örnek: ('max_events_per_day', '40'), ('max_images_per_day', '200'),
--        ('cluster_similarity_threshold', '0.82')
```

---

## RLS Politikaları

- `events`, `event_cards`, `categories`: herkese **read**, sadece
  `status = 'published'` olanlar (service role hariç). Write yok.
- `reactions`: anon **insert/delete** (kendi `device_id`'si ile), read herkese
  (sayaçlar için aggregate view kullan).
- `device_tokens`: anon **upsert** kendi `device_id`'si ile.
- Diğer tüm tablolar (`raw_articles`, `sources`, `api_usage`...): sadece
  service role. Mobil uygulama bunları hiç görmez.

Reaction sayaçları için view:

```sql
create view event_reaction_counts as
select event_id, emoji, count(*) as count
from reactions group by event_id, emoji;
```

---

## Pipeline Adımları (Vercel Cron)

| Adım | Sıklık | İş |
|------|--------|-----|
| **fetch** | 30 dk | Aktif kaynakların RSS'ini çek, `url` ile dedupe, `raw_articles`'a yaz, embedding üret |
| **cluster** | 30 dk | `event_id` null makaleleri son 48 saatin event'leriyle cosine similarity karşılaştır. Eşleşen event'e bağla, eşleşmeyen için yeni event aç (`clustering`) |
| **enrich** | 15 dk | `clustering` durumundaki, en az 15 dk yaşındaki event'ler için LLM structured çağrısı → title, summary, eli5, metafor, importance, kart metinleri + image prompt'ları. Sonra `generating_images` |
| **images** | 15 dk | Kapak + kart görsellerini üret, Storage'a yaz, hepsi tamamsa `published` |
| **brief** | Günde 1 (07:30) | Son 24 saatin en yüksek importance'lı 5 event'i → `daily_briefs` → Expo push |

Kurallar:
- Her adım başlamadan `app_settings` limitlerini kontrol eder. Limit dolduysa
  o gün üretim durur, feed mevcut içerikle yaşar.
- Hata → `retry_count` artar, 3 denemeden sonra `failed`. Failed event feed'e
  düşmez, sen dashboard'dan (veya Supabase panelinden) görürsün.
- `enriching` ve `generating_images` ara durumları sayesinde cron yarıda
  kesilse bile kaldığı yerden devam eder (idempotent).

## Enrich Çağrısının Structured Output Şeması

Tek çağrı, JSON mode:

```json
{
  "title": "Arjantin çeyrek finalde",
  "summary": "...",
  "eli5": "...",
  "category_slug": "spor",
  "importance": 8,
  "cover_metaphor": "faceless football players in sky blue and white celebrating, dynamic pose",
  "cards": [
    { "text": "...", "image_prompt": "..." },
    { "text": "...", "image_prompt": "..." },
    { "text": "...", "image_prompt": "..." }
  ]
}
```

Prompt'a gömülecek sabit kurallar: gerçek kişi yüzü yok, metin içeren görsel
yok, kategori style_prompt'u ile birleştirilecek.

## Model Seçimi

| İş | Model | Not |
|----|-------|-----|
| Embedding | `text-embedding-004` (Gemini) | Ucuz, cluster için yeterli |
| Enrich | Gemini 2.5 Flash | JSON mode, olay başına ~1 çağrı |
| Görsel | Gemini image API | Kafe projesiyle aynı, olay başına 4-5 görsel |

## Maliyet Modeli (kabaca)

Günde 40 event × 5 görsel = 200 görsel/gün en büyük kalem. Bu yüzden görsel
üretimi olay başına (haber başına değil), cache'li ve günlük limitli.
`api_usage` tablosundan haftalık toplam çekip gerçek maliyeti gör, limitleri
ona göre ayarla.

## Sonraki Adımlar

1. Supabase projesini aç, bu şemayı migration olarak uygula (pgvector extension dahil)
2. Kategori seed'leri + her kategori için style_prompt taslakları
3. `fetch` + `cluster` cron'unu yaz (2-3 gerçek RSS kaynağıyla test)
4. `enrich` prompt'unu tasarla ve 10-15 gerçek haberle kalitesini test et
5. Görsel üretimi bağla, ilk uçtan uca `published` event
6. Expo projesi + tema/component temeli
