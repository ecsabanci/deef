import { MAX_RETRY_COUNT } from "@deef/shared";
import { supabase } from "@/lib/supabase";
import { getSetting } from "@/lib/settings";
import { isTransientGeminiError } from "@/lib/gemini";
import { composeImagePrompt, generateCoverImage } from "@/lib/gemini-image";

// Image calls are slower and pricier than enrich; keep runs small so the
// route stays inside maxDuration
const MAX_EVENTS_PER_RUN = 5;

export interface ImagesSummary {
  eventsPublished: number;
  eventsRetried: number;
  eventsFailed: number;
  eventsPending: number;
  skippedByDailyLimit: number;
  errors: string[];
}

interface PendingEvent {
  id: number;
  title: string | null;
  visual_metaphor: string | null;
  retry_count: number;
  categories: { style_prompt: string } | null;
}

export async function runImages(): Promise<ImagesSummary> {
  const summary: ImagesSummary = {
    eventsPublished: 0,
    eventsRetried: 0,
    eventsFailed: 0,
    eventsPending: 0,
    skippedByDailyLimit: 0,
    errors: [],
  };

  const maxImagesPerDay = await getSetting("max_images_per_day");
  let imagesUsedToday = await countImagesToday();

  // Biggest stories first; equal importance drains oldest-first
  const { data, error } = await supabase
    .from("events")
    .select("id, title, visual_metaphor, retry_count, categories(style_prompt)")
    .eq("status", "generating_images")
    .order("importance", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to read pending events: ${error.message}`);
  const pending = (data ?? []) as unknown as PendingEvent[];

  const batch = pending.slice(0, MAX_EVENTS_PER_RUN);
  summary.eventsPending = pending.length - batch.length;

  for (const event of batch) {
    try {
      if (!event.visual_metaphor || !event.categories?.style_prompt) {
        throw new Error("event is missing visual_metaphor or style_prompt");
      }

      const path = `events/${event.id}/cover.png`;

      // Idempotency: a previous run may have uploaded the image and
      // crashed before the status update — publish without regenerating
      let hasImage = await coverExists(event.id);
      if (!hasImage) {
        // Hard rule: check the daily limit before every generation
        if (imagesUsedToday >= maxImagesPerDay) {
          summary.skippedByDailyLimit += 1;
          continue;
        }
        const prompt = composeImagePrompt(
          event.visual_metaphor,
          event.categories.style_prompt,
        );
        const image = await generateCoverImage(prompt, event.id);
        imagesUsedToday += 1;
        const { error: uploadError } = await supabase.storage
          .from("covers")
          .upload(path, image.bytes, {
            contentType: image.mimeType,
            upsert: true,
          });
        if (uploadError) {
          throw new Error(`upload failed: ${uploadError.message}`);
        }
        hasImage = true;
      } else {
        console.log(`[images] event ${event.id}: reusing existing cover`);
      }

      const { data: urlData } = supabase.storage
        .from("covers")
        .getPublicUrl(path);
      const { error: publishError } = await supabase
        .from("events")
        .update({
          cover_image_url: urlData.publicUrl,
          cover_image_alt: `İllüstrasyon: ${event.title ?? "haber görseli"}`,
          status: "published",
          published_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", event.id);
      if (publishError) {
        throw new Error(`publish update failed: ${publishError.message}`);
      }
      summary.eventsPublished += 1;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      if (isTransientGeminiError(message)) {
        summary.errors.push(
          `transient API error at event ${event.id}, stopping run: ` +
            message.slice(0, 200),
        );
        summary.eventsPending += batch.length - batch.indexOf(event);
        break;
      }
      await recordFailure(event, message, summary);
    }
  }

  return summary;
}

// Daily budget = api_usage image rows since UTC midnight (dev/test calls
// count too — they spent real money)
async function countImagesToday(): Promise<number> {
  const utcMidnight = new Date();
  utcMidnight.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from("api_usage")
    .select("id", { count: "exact", head: true })
    .eq("operation", "image")
    .gte("created_at", utcMidnight.toISOString());
  if (error) {
    throw new Error(`Failed to count today's images: ${error.message}`);
  }
  return count ?? 0;
}

async function coverExists(eventId: number): Promise<boolean> {
  const { data, error } = await supabase.storage
    .from("covers")
    .list(`events/${eventId}`);
  if (error) {
    throw new Error(`storage list failed: ${error.message}`);
  }
  return (data ?? []).some((file) => file.name === "cover.png");
}

// Same contract as enrich: event-specific failures increment retry_count,
// MAX_RETRY_COUNT attempts -> 'failed' with error_message
async function recordFailure(
  event: PendingEvent,
  message: string,
  summary: ImagesSummary,
): Promise<void> {
  const attempts = event.retry_count + 1;
  const failed = attempts >= MAX_RETRY_COUNT;
  console.error(
    `[images] event ${event.id} attempt ${attempts} failed: ${message}`,
  );
  const { error } = await supabase
    .from("events")
    .update({
      retry_count: attempts,
      error_message: message.slice(0, 500),
      status: failed ? "failed" : "generating_images",
    })
    .eq("id", event.id);
  if (error) {
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
