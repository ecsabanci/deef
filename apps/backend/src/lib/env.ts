import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.url({ error: "must be the Supabase project URL" }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, { error: "is required" }),
  GEMINI_API_KEY: z.string().min(1, { error: "is required" }),
  CRON_SECRET: z.string().min(1, { error: "is required" }),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables (see .env.example):\n${details}`,
    );
  }
  return parsed.data;
}

// Validated once at first import; any consumer fails fast on a bad env
export const env = loadEnv();
