import Parser from "rss-parser";
import { supabase } from "@/lib/supabase";
import { embedTexts } from "@/lib/embedding";

// Some Turkish news sites (incl. aa.com.tr) block bare HTTP clients, so
// feed requests must send a browser User-Agent
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const FEED_TIMEOUT_MS = 15_000;

export interface FetchSummary {
  sourcesProcessed: number;
  sourcesFailed: number;
  articlesInserted: number;
  articlesEmbedded: number;
  errors: string[];
}

interface SourceRow {
  id: number;
  name: string;
  rss_url: string;
}

interface ArticleInsert {
  source_id: number;
  url: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
}

export async function runFetch(): Promise<FetchSummary> {
  const parser = new Parser({
    timeout: FEED_TIMEOUT_MS,
    headers: { "User-Agent": BROWSER_USER_AGENT },
  });

  const { data, error } = await supabase
    .from("sources")
    .select("id, name, rss_url")
    .eq("is_active", true);
  if (error) throw new Error(`Failed to read sources: ${error.message}`);
  const sources = (data ?? []) as SourceRow[];

  const summary: FetchSummary = {
    sourcesProcessed: 0,
    sourcesFailed: 0,
    articlesInserted: 0,
    articlesEmbedded: 0,
    errors: [],
  };

  // One failing source must not abort the rest (task 3.1 DoD)
  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.rss_url);

      const seenUrls = new Set<string>();
      const rows = (feed.items ?? []).flatMap((item): ArticleInsert[] => {
        const url = item.link?.trim();
        const title = item.title?.trim();
        // Items without a URL or title are useless downstream; a repeated
        // URL within one feed would break ON CONFLICT DO NOTHING batching
        if (!url || !title || seenUrls.has(url)) return [];
        seenUrls.add(url);
        return [
          {
            source_id: source.id,
            url,
            title,
            excerpt: item.contentSnippet?.trim() || null,
            published_at: item.isoDate ?? null,
          },
        ];
      });

      let inserted = 0;
      if (rows.length > 0) {
        // Dedupe by url: ignoreDuplicates + select() returns new rows only
        const { data: insertedRows, error: upsertError } = await supabase
          .from("raw_articles")
          .upsert(rows, { onConflict: "url", ignoreDuplicates: true })
          .select("id");
        if (upsertError) {
          throw new Error(`raw_articles insert failed: ${upsertError.message}`);
        }
        inserted = insertedRows?.length ?? 0;
      }

      const { error: touchError } = await supabase
        .from("sources")
        .update({ last_fetched_at: new Date().toISOString() })
        .eq("id", source.id);
      if (touchError) {
        throw new Error(`last_fetched_at update failed: ${touchError.message}`);
      }

      summary.sourcesProcessed += 1;
      summary.articlesInserted += inserted;
    } catch (cause) {
      summary.sourcesFailed += 1;
      const message = cause instanceof Error ? cause.message : String(cause);
      summary.errors.push(`${source.name}: ${message}`);
      console.error(`[fetch] source "${source.name}" failed: ${message}`);
    }
  }

  // Embedding failures leave rows with embedding = null, so the next run
  // picks them up again (idempotent); they must not fail the whole step
  try {
    summary.articlesEmbedded = await embedPendingArticles();
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    summary.errors.push(`embedding: ${message}`);
    console.error(`[fetch] embedding failed: ${message}`);
  }

  return summary;
}

interface PendingArticle {
  id: number;
  title: string;
  excerpt: string | null;
}

// Embeds every article that does not have an embedding yet (title +
// excerpt), regardless of which run inserted it. Returns the count.
async function embedPendingArticles(): Promise<number> {
  const { data, error } = await supabase
    .from("raw_articles")
    .select("id, title, excerpt")
    .is("embedding", null)
    .order("id");
  if (error) {
    throw new Error(`Failed to read pending articles: ${error.message}`);
  }
  const pending = (data ?? []) as PendingArticle[];
  if (pending.length === 0) return 0;

  const vectors = await embedTexts(
    pending.map((article) =>
      article.excerpt ? `${article.title}\n\n${article.excerpt}` : article.title,
    ),
  );

  for (let i = 0; i < pending.length; i += 1) {
    const article = pending[i];
    const vector = vectors[i];
    if (!article || !vector) {
      throw new Error(`Missing embedding for pending article index ${i}`);
    }
    const { error: updateError } = await supabase
      .from("raw_articles")
      .update({ embedding: vector })
      .eq("id", article.id);
    if (updateError) {
      throw new Error(
        `Failed to store embedding for article ${article.id}: ${updateError.message}`,
      );
    }
  }

  return pending.length;
}
