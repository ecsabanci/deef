import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { logApiUsage } from "@/lib/api-usage";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// Scene first (the event's visual directive), then the category's frozen
// style — per docs/haber-app-veri-modeli.md ("metafor + şablon birleşir")
export function composeImagePrompt(
  visualMetaphor: string,
  stylePrompt: string,
): string {
  return `${visualMetaphor}\n\nStyle: ${stylePrompt}`;
}

export interface GeneratedImage {
  bytes: Buffer;
  mimeType: string;
}

// Generates ONE cover image using the settings-driven model/resolution/
// aspect ratio. Logs api_usage with the response's actual token counts
// and est_cost_usd from the configured price (hard rule + task 7.1).
export async function generateCoverImage(
  prompt: string,
  eventId: number | null,
  // Dev-test override only (task 7.3 ratio comparison); the pipeline
  // always uses the app_settings value
  aspectRatioOverride?: string,
): Promise<GeneratedImage> {
  const [model, resolution, aspectRatio, priceUsdPer1M] = await Promise.all([
    getSetting("image_model"),
    getSetting("image_resolution"),
    getSetting("image_aspect_ratio"),
    getSetting("image_price_usd_per_1m_output_tokens"),
  ]);

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: aspectRatioOverride ?? aspectRatio,
        imageSize: resolution,
      },
    },
  });

  const usage = response.usageMetadata;
  const outputTokens = usage?.candidatesTokenCount ?? null;
  await logApiUsage({
    event_id: eventId,
    provider: "gemini",
    operation: "image",
    model,
    input_tokens: usage?.promptTokenCount ?? null,
    output_tokens: outputTokens,
    image_count: 1,
    est_cost_usd:
      outputTokens === null
        ? null
        : (outputTokens / 1_000_000) * priceUsdPer1M,
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = part.inlineData?.data;
    if (data) {
      return {
        bytes: Buffer.from(data, "base64"),
        mimeType: part.inlineData?.mimeType ?? "image/png",
      };
    }
  }
  throw new Error("Gemini returned no image data");
}
