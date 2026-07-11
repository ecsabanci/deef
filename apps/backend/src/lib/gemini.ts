import { GoogleGenAI, Type } from "@google/genai";
import { CATEGORY_SLUGS } from "@deef/shared";
import { env } from "@/lib/env";
import { logApiUsage } from "@/lib/api-usage";

// gemini-2.5-flash is closed to new users — see DECISIONS.md 2026-07-11
export const ENRICH_MODEL = "gemini-3.5-flash";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// API-enforced response shape: without this the model occasionally emits
// trailing junk after the JSON object (observed 2026-07-11). Zod remains
// the authoritative validator; this just guarantees parseable output.
const ENRICH_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    eli5: { type: Type.STRING },
    category_slug: { type: Type.STRING, enum: [...CATEGORY_SLUGS] },
    importance: { type: Type.INTEGER },
    cover_metaphor: { type: Type.STRING },
  },
  required: [
    "title",
    "summary",
    "eli5",
    "category_slug",
    "importance",
    "cover_metaphor",
  ],
};

// One JSON-mode call for the enrich step. Returns the raw response text
// (Zod parsing happens in the caller); logs the call with real token
// counts to api_usage (hard rule).
export async function generateEnrichJson(
  systemPrompt: string,
  userPrompt: string,
  eventId: number | null,
): Promise<string> {
  const response = await ai.models.generateContent({
    model: ENRICH_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: ENRICH_RESPONSE_SCHEMA,
    },
  });

  const usage = response.usageMetadata;
  await logApiUsage({
    event_id: eventId,
    provider: "gemini",
    operation: "enrich",
    model: ENRICH_MODEL,
    input_tokens: usage?.promptTokenCount ?? null,
    output_tokens: usage?.candidatesTokenCount ?? null,
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty enrich response");
  }
  return text;
}
