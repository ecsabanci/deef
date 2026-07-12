import { z } from "zod";

// EXPO_PUBLIC_* vars are inlined into the JS bundle at build time — they
// are PUBLIC by definition. Only the anon key belongs here; the service
// role key must never appear anywhere in apps/mobile.
const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url({ error: "must be the Supabase URL" }),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, { error: "is required" }),
});

export type MobileEnv = z.infer<typeof envSchema>;

function loadEnv(): MobileEnv {
  const parsed = envSchema.safeParse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid mobile environment (create apps/mobile/.env):\n${details}`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();
