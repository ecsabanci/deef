import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { composeImagePrompt, generateCoverImage } from "@/lib/gemini-image";

// TEMPORARY supervised test route for task 7.3: generates ONE image from
// a real event and uploads it for review. Does NOT touch event status —
// the pipeline transitions belong to checkpoint 8. Removed there.
export const maxDuration = 60;

interface EventRow {
  id: number;
  title: string | null;
  visual_metaphor: string | null;
  categories: { style_prompt: string } | null;
}

export async function GET(request: Request): Promise<NextResponse> {
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // Same ordering the images pipeline will use (8.1): biggest story,
    // oldest first. ?event_id=N overrides for re-tests on other tones.
    const requestedId = new URL(request.url).searchParams.get("event_id");
    let query = supabase
      .from("events")
      .select("id, title, visual_metaphor, categories(style_prompt)")
      .eq("status", "generating_images");
    query = requestedId
      ? query.eq("id", Number(requestedId))
      : query
          .order("importance", { ascending: false })
          .order("created_at", { ascending: true });
    const { data, error } = await query.limit(1).single();
    if (error) throw new Error(`event lookup failed: ${error.message}`);
    const event = data as unknown as EventRow;
    if (!event.visual_metaphor || !event.categories?.style_prompt) {
      throw new Error(`event ${event.id} is missing metaphor or style`);
    }

    const prompt = composeImagePrompt(
      event.visual_metaphor,
      event.categories.style_prompt,
    );

    // ?ratio=3:4 override for the 7.3 aspect-ratio comparison; each ratio
    // gets its own file so variants can be viewed side by side
    const ratio = new URL(request.url).searchParams.get("ratio") ?? undefined;
    if (ratio && !/^\d+:\d+$/.test(ratio)) {
      return NextResponse.json(
        { ok: false, error: `invalid ratio: ${ratio}` },
        { status: 400 },
      );
    }
    const image = await generateCoverImage(prompt, event.id, ratio);

    const path = ratio
      ? `events/${event.id}/cover-${ratio.replace(":", "x")}.png`
      : `events/${event.id}/cover.png`;
    const { error: uploadError } = await supabase.storage
      .from("covers")
      .upload(path, image.bytes, { contentType: image.mimeType, upsert: true });
    if (uploadError) throw new Error(`upload failed: ${uploadError.message}`);
    const { data: urlData } = supabase.storage
      .from("covers")
      .getPublicUrl(path);

    return NextResponse.json({
      ok: true,
      eventId: event.id,
      title: event.title,
      prompt,
      imageUrl: urlData.publicUrl,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
