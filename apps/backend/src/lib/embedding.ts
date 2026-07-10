import { GoogleGenAI } from "@google/genai";
import { EMBEDDING_DIMENSIONS } from "@deef/shared";
import { env } from "@/lib/env";
import { logApiUsage } from "@/lib/api-usage";

// text-embedding-004 was retired by Google — see DECISIONS.md 2026-07-11
export const EMBEDDING_MODEL = "gemini-embedding-001";

// Gemini batch embedding limit per request
const MAX_BATCH_SIZE = 100;

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// Embeds texts in batches, preserving input order. Every API call is
// logged to api_usage (hard rule). Token counts are not reported by the
// embedding endpoint, so they are logged as null.
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];

  for (let start = 0; start < texts.length; start += MAX_BATCH_SIZE) {
    const batch = texts.slice(start, start + MAX_BATCH_SIZE);
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: batch,
      config: { outputDimensionality: EMBEDDING_DIMENSIONS },
    });

    await logApiUsage({
      provider: "gemini",
      operation: "embed",
      model: EMBEDDING_MODEL,
      input_tokens: null,
      output_tokens: null,
    });

    const embeddings = response.embeddings ?? [];
    if (embeddings.length !== batch.length) {
      throw new Error(
        `Embedding count mismatch: sent ${batch.length}, got ${embeddings.length}`,
      );
    }
    for (const embedding of embeddings) {
      const values = embedding.values;
      if (!values || values.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Unexpected embedding dimension: ${values?.length ?? 0} ` +
            `(expected ${EMBEDDING_DIMENSIONS})`,
        );
      }
      vectors.push(normalize(values));
    }
  }

  return vectors;
}

// Truncated-dimension gemini-embedding-001 vectors are not unit-length;
// cosine similarity doesn't care, but normalized vectors stay correct
// under any future metric (dot product, L2)
function normalize(values: number[]): number[] {
  const magnitude = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return values;
  return values.map((v) => v / magnitude);
}
