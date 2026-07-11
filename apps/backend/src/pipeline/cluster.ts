import { supabase } from "@/lib/supabase";
import { getSetting } from "@/lib/settings";

export interface ClusterSummary {
  articlesProcessed: number;
  attachedToExisting: number;
  eventsCreated: number;
  skippedByDailyLimit: number;
  errors: string[];
}

interface UnclusteredArticle {
  id: number;
  // PostgREST serializes vector columns as a string literal ("[0.1,...]");
  // it casts back to vector when passed to the RPC, so it stays opaque here
  embedding: string;
  published_at: string | null;
  sources: { default_category: number | null } | null;
}

interface MatchRow {
  event_id: number;
  similarity: number;
}

export async function runCluster(): Promise<ClusterSummary> {
  const threshold = await getSetting("cluster_similarity_threshold");
  const lookbackHours = await getSetting("cluster_lookback_hours");
  const maxEventsPerDay = await getSetting("max_events_per_day");

  const summary: ClusterSummary = {
    articlesProcessed: 0,
    attachedToExisting: 0,
    eventsCreated: 0,
    skippedByDailyLimit: 0,
    errors: [],
  };

  // Daily limit counts events created since UTC midnight (hard rule:
  // every cron step checks app_settings limits before producing)
  const utcMidnight = new Date();
  utcMidnight.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", utcMidnight.toISOString());
  if (countError) {
    throw new Error(`Failed to count today's events: ${countError.message}`);
  }
  let eventsCreatedToday = count ?? 0;

  const { data, error } = await supabase
    .from("raw_articles")
    .select("id, embedding, published_at, sources(default_category)")
    .is("event_id", null)
    .not("embedding", "is", null)
    .order("id");
  if (error) {
    throw new Error(`Failed to read unclustered articles: ${error.message}`);
  }
  const articles = (data ?? []) as unknown as UnclusteredArticle[];

  // Sequential on purpose: once article A creates an event, article B about
  // the same story must see A via the RPC and attach instead of forking a
  // duplicate event
  for (const article of articles) {
    try {
      const { data: matches, error: rpcError } = await supabase.rpc(
        "match_article_event",
        { query_embedding: article.embedding, lookback_hours: lookbackHours },
      );
      if (rpcError) {
        throw new Error(`match_article_event failed: ${rpcError.message}`);
      }
      const best = ((matches ?? []) as MatchRow[])[0];

      if (best && best.similarity >= threshold) {
        await attachArticle(article.id, best.event_id);
        summary.attachedToExisting += 1;
      } else {
        if (best) {
          // Near-miss visibility for threshold tuning
          console.log(
            `[cluster] article ${article.id} best similarity ` +
              `${best.similarity.toFixed(4)} < ${threshold} (event ${best.event_id})`,
          );
        }
        if (eventsCreatedToday >= maxEventsPerDay) {
          summary.skippedByDailyLimit += 1;
          continue;
        }
        const categoryId = article.sources?.default_category;
        if (categoryId == null) {
          throw new Error("source has no default_category; cannot create event");
        }
        const eventId = await createEvent(categoryId, article.published_at);
        await attachArticle(article.id, eventId);
        eventsCreatedToday += 1;
        summary.eventsCreated += 1;
      }
      summary.articlesProcessed += 1;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      summary.errors.push(`article ${article.id}: ${message}`);
      console.error(`[cluster] article ${article.id} failed: ${message}`);
    }
  }

  return summary;
}

async function createEvent(
  categoryId: number,
  articlePublishedAt: string | null,
): Promise<number> {
  const { data, error } = await supabase
    .from("events")
    .insert({
      category_id: categoryId,
      status: "clustering",
      event_date: articlePublishedAt ?? new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(`event insert failed: ${error.message}`);
  return (data as { id: number }).id;
}

async function attachArticle(articleId: number, eventId: number): Promise<void> {
  const { error } = await supabase
    .from("raw_articles")
    .update({ event_id: eventId })
    .eq("id", articleId);
  if (error) {
    throw new Error(
      `attaching article ${articleId} to event ${eventId} failed: ${error.message}`,
    );
  }
}
