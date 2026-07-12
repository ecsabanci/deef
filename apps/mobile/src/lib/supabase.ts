import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

// Anon client: RLS lets it read only published events, active categories
// and reaction counts. All writes go through backend API routes (v1 has
// no auth session to persist).
export const supabase: SupabaseClient = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
