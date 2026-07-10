// The server-only import turns any accidental client-bundle inclusion of
// this module (and the service role key) into a build error
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Service-role client — bypasses RLS, so it must never leave the server
export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
