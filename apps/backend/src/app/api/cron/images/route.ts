import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runImages } from "@/pipeline/images";

// Up to MAX_EVENTS_PER_RUN sequential image generations per invocation
export const maxDuration = 60;

// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" automatically
// when the CRON_SECRET env var is set on the project
export async function GET(request: Request): Promise<NextResponse> {
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runImages();
    return NextResponse.json({ ok: true, ...summary });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error(`[cron/images] failed: ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
