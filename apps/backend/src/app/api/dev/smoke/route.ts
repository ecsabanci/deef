import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { getSetting } from "@/lib/settings";
import { logApiUsage } from "@/lib/api-usage";

// TEMPORARY smoke-check route for checkpoint 2 (tasks 2.2 and 2.3).
// Remove once the pipeline modules become the real consumers (checkpoint 3).
export async function GET(request: Request): Promise<NextResponse> {
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // 2.2 — raw client read
    const { data, error } = await supabase.from("app_settings").select("key");
    if (error) throw new Error(`read app_settings: ${error.message}`);
    const keys = (data ?? []).map((row) => (row as { key: string }).key).sort();

    // 2.3 — typed settings reader
    const threshold = await getSetting("cluster_similarity_threshold");

    // 2.3 — api_usage logger round trip (insert, read back, clean up)
    await logApiUsage({ provider: "smoke", operation: "smoke", model: "none" });
    const { data: inserted, error: readError } = await supabase
      .from("api_usage")
      .select("id")
      .eq("provider", "smoke")
      .order("id", { ascending: false })
      .limit(1)
      .single();
    if (readError) throw new Error(`read back api_usage: ${readError.message}`);
    const insertedId = (inserted as { id: number }).id;
    const { error: deleteError } = await supabase
      .from("api_usage")
      .delete()
      .eq("id", insertedId);
    if (deleteError) throw new Error(`clean up api_usage: ${deleteError.message}`);

    return NextResponse.json({
      ok: true,
      settingKeys: keys,
      clusterSimilarityThreshold: threshold,
      apiUsageRoundtrip: `inserted and deleted api_usage row ${insertedId}`,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
