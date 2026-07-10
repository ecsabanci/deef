import { supabase } from "@/lib/supabase";

// Column names mirror the api_usage table in docs/001_initial_schema.sql
export interface ApiUsageEntry {
  event_id?: number | null;
  provider: string;
  operation: string;
  model: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  image_count?: number | null;
  est_cost_usd?: number | null;
}

// Hard rule: every LLM/embedding/image call is logged to api_usage
export async function logApiUsage(entry: ApiUsageEntry): Promise<void> {
  const { error } = await supabase.from("api_usage").insert(entry);
  if (error) {
    throw new Error(
      `Failed to log api_usage (${entry.operation}/${entry.model}): ${error.message}`,
    );
  }
}
