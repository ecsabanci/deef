// Seeds the sources table with the Phase 1 RSS feeds. Idempotent: upserts
// by rss_url, so running it repeatedly never duplicates rows.
// Run from apps/backend: pnpm seed:sources
import { createClient } from "@supabase/supabase-js";
import type { CategorySlug } from "@deef/shared";
import { env } from "../src/lib/env";

interface SeedSource {
  name: string;
  rss_url: string;
  category_slug: CategorySlug;
}

// Feeds verified parseable on 2026-07-11 (see TASKS.md 2.4)
const SEED_SOURCES: SeedSource[] = [
  {
    name: "Anadolu Ajansı — Güncel",
    rss_url: "https://www.aa.com.tr/tr/rss/default?cat=guncel",
    category_slug: "gundem",
  },
  {
    name: "Anadolu Ajansı — Ekonomi",
    rss_url: "https://www.aa.com.tr/tr/rss/default?cat=ekonomi",
    category_slug: "ekonomi",
  },
];

async function main(): Promise<void> {
  // src/lib/supabase.ts is guarded by `server-only`, which throws outside
  // the Next.js runtime — standalone scripts build their own client from
  // the same validated env
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, slug");
  if (categoriesError) {
    throw new Error(`Failed to read categories: ${categoriesError.message}`);
  }
  const idBySlug = new Map(
    (categories ?? []).map((row) => {
      const { id, slug } = row as { id: number; slug: string };
      return [slug, id] as const;
    }),
  );

  const rows = SEED_SOURCES.map((source) => {
    const categoryId = idBySlug.get(source.category_slug);
    if (categoryId === undefined) {
      throw new Error(`Category slug not found in DB: ${source.category_slug}`);
    }
    return {
      name: source.name,
      rss_url: source.rss_url,
      default_category: categoryId,
      is_active: true,
    };
  });

  const { error: upsertError } = await supabase
    .from("sources")
    .upsert(rows, { onConflict: "rss_url" });
  if (upsertError) {
    throw new Error(`Failed to upsert sources: ${upsertError.message}`);
  }

  const { data: allSources, error: readError } = await supabase
    .from("sources")
    .select("id, name, rss_url, default_category, is_active")
    .order("id");
  if (readError) {
    throw new Error(`Failed to read back sources: ${readError.message}`);
  }
  console.log(`sources table now has ${allSources?.length ?? 0} row(s):`);
  for (const row of allSources ?? []) {
    console.log(JSON.stringify(row));
  }
}

main().catch((cause: unknown) => {
  console.error(cause);
  process.exit(1);
});
