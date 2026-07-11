import { MAX_RETRY_COUNT } from "@deef/shared";
import { supabase } from "@/lib/supabase";
import { generateEnrichJson, isTransientGeminiError } from "@/lib/gemini";
import { enrichOutputSchema } from "@/pipeline/enrich-schema";
import {
  ENRICH_SYSTEM_PROMPT,
  buildEnrichUserPrompt,
  type EnrichArticleInput,
} from "@/pipeline/enrich-prompt";

// Events younger than this may still be collecting articles in cluster
const MIN_EVENT_AGE_MINUTES = 15;

// Sequential LLM calls: cap per invocation so the route stays inside
// Vercel's maxDuration; leftovers are picked up by the next run
const MAX_EVENTS_PER_RUN = 10;

export interface EnrichSummary {
  eventsEnriched: number;
  eventsRetried: number;
  eventsFailed: number;
  eventsPending: number;
  errors: string[];
}

interface PendingEvent {
  id: number;
  retry_count: number;
}

interface ArticleRow {
  title: string;
  excerpt: string | null;
  published_at: string | null;
  sources: { name: string } | null;
}

export async function runEnrich(): Promise<EnrichSummary> {
  const summary: EnrichSummary = {
    eventsEnriched: 0,
    eventsRetried: 0,
    eventsFailed: 0,
    eventsPending: 0,
    errors: [],
  };

  const cutoff = new Date(
    Date.now() - MIN_EVENT_AGE_MINUTES * 60_000,
  ).toISOString();

  // 'enriching' is included so events from a crashed run are resumed
  const { data, error } = await supabase
    .from("events")
    .select("id, retry_count")
    .in("status", ["clustering", "enriching"])
    .lte("created_at", cutoff)
    .order("id");
  if (error) throw new Error(`Failed to read pending events: ${error.message}`);
  const pending = (data ?? []) as PendingEvent[];

  const batch = pending.slice(0, MAX_EVENTS_PER_RUN);
  summary.eventsPending = pending.length - batch.length;
  if (batch.length === 0) return summary;

  const categoryIdBySlug = await loadCategoryMap();

  for (const event of batch) {
    try {
      await setStatus(event.id, "enriching");

      const articles = await loadArticles(event.id);
      if (articles.length === 0) {
        throw new Error("event has no linked articles");
      }

      const raw = await generateEnrichJson(
        ENRICH_SYSTEM_PROMPT,
        buildEnrichUserPrompt(articles),
        event.id,
      );
      const output = enrichOutputSchema.parse(JSON.parse(raw));

      const categoryId = categoryIdBySlug.get(output.category_slug);
      if (categoryId === undefined) {
        throw new Error(`unknown category slug: ${output.category_slug}`);
      }

      const { error: updateError } = await supabase
        .from("events")
        .update({
          title: output.title,
          summary: output.summary,
          eli5_text: output.eli5,
          visual_metaphor: output.cover_metaphor,
          importance: output.importance,
          category_id: categoryId,
          status: "generating_images",
          error_message: null,
        })
        .eq("id", event.id);
      if (updateError) {
        throw new Error(`event update failed: ${updateError.message}`);
      }
      summary.eventsEnriched += 1;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      // Rate limits / API outages say nothing about the event itself:
      // don't touch retry_count, stop the run, let the next cron resume
      if (isTransientGeminiError(message)) {
        summary.errors.push(
          `transient API error at event ${event.id}, stopping run: ` +
            message.slice(0, 200),
        );
        summary.eventsPending +=
          batch.length - batch.indexOf(event);
        break;
      }
      await recordFailure(event, message, summary);
    }
  }

  return summary;
}

async function loadCategoryMap(): Promise<Map<string, number>> {
  const { data, error } = await supabase.from("categories").select("id, slug");
  if (error) throw new Error(`Failed to read categories: ${error.message}`);
  return new Map(
    (data ?? []).map((row) => {
      const { id, slug } = row as { id: number; slug: string };
      return [slug, id] as const;
    }),
  );
}

async function loadArticles(eventId: number): Promise<EnrichArticleInput[]> {
  const { data, error } = await supabase
    .from("raw_articles")
    .select("title, excerpt, published_at, sources(name)")
    .eq("event_id", eventId)
    .order("published_at", { ascending: true });
  if (error) {
    throw new Error(`failed to read event articles: ${error.message}`);
  }
  return ((data ?? []) as unknown as ArticleRow[]).map((row) => ({
    sourceName: row.sources?.name ?? "unknown",
    title: row.title,
    excerpt: row.excerpt,
    publishedAt: row.published_at,
  }));
}

async function setStatus(eventId: number, status: string): Promise<void> {
  const { error } = await supabase
    .from("events")
    .update({ status })
    .eq("id", eventId);
  if (error) {
    throw new Error(`status update to '${status}' failed: ${error.message}`);
  }
}

// Hard rule: retry_count increments; at MAX_RETRY_COUNT the event becomes
// 'failed' with error_message filled. Below the cap it stays 'enriching'
// so the next run retries it.
async function recordFailure(
  event: PendingEvent,
  message: string,
  summary: EnrichSummary,
): Promise<void> {
  const attempts = event.retry_count + 1;
  const failed = attempts >= MAX_RETRY_COUNT;
  console.error(
    `[enrich] event ${event.id} attempt ${attempts} failed: ${message}`,
  );
  const { error } = await supabase
    .from("events")
    .update({
      retry_count: attempts,
      error_message: message.slice(0, 500),
      status: failed ? "failed" : "enriching",
    })
    .eq("id", event.id);
  if (error) {
    // The failure itself could not be recorded — surface loudly
    summary.errors.push(
      `event ${event.id}: ${message} (AND failed to record: ${error.message})`,
    );
    return;
  }
  summary.errors.push(`event ${event.id}: ${message}`);
  if (failed) {
    summary.eventsFailed += 1;
  } else {
    summary.eventsRetried += 1;
  }
}
