import { z } from "zod";
import type { AppSettingKey } from "@deef/shared";
import { supabase } from "@/lib/supabase";

// app_settings.value is jsonb; each key gets its own Zod schema so callers
// receive a correctly typed, runtime-validated value
const settingSchemas = {
  max_events_per_day: z.number().int().nonnegative(),
  max_images_per_day: z.number().int().nonnegative(),
  cluster_similarity_threshold: z.number().min(0).max(1),
  story_cards_enabled: z.boolean(),
  cluster_lookback_hours: z.number().int().positive(),
  image_model: z.string().min(1),
  image_resolution: z.string().min(1),
  image_aspect_ratio: z.string().regex(/^\d+:\d+$/),
  image_price_usd_per_1m_output_tokens: z.number().positive(),
} as const satisfies Record<AppSettingKey, z.ZodType>;

export type SettingValue<K extends AppSettingKey> = z.infer<
  (typeof settingSchemas)[K]
>;

export async function getSetting<K extends AppSettingKey>(
  key: K,
): Promise<SettingValue<K>> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .single();
  if (error) {
    throw new Error(`Failed to read app_settings['${key}']: ${error.message}`);
  }
  const value = (data as { value: unknown }).value;
  return settingSchemas[key].parse(value) as SettingValue<K>;
}
