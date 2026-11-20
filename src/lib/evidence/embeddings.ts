/**
 * Embeddings for the evidence retrieval layer (Phase A8).
 *
 * Uses Gemini text-embedding-004 (768 dims, matches the vector(768) columns
 * in migration 20261002000002) via the Generative Language REST API.
 * The key is read per-call from GEMINI_API_KEY / GOOGLE_API_KEY — server-only,
 * never exposed to the browser.
 *
 * Embeddings are content-addressed: callers check evidence_chunks by
 * content_hash first and never re-embed unchanged text (see ingestion.ts).
 */
import { AiError } from "../ai.server";

export const EMBEDDING_MODEL = "text-embedding-004";
export const EMBEDDING_DIMS = 768;
/** Batch endpoint limit; keep well under it. */
const BATCH_SIZE = 100;

function resolveEmbeddingKey(): string | undefined {
  return (
    process.env["GEMINI_API_KEY"]?.trim() ||
    process.env["GOOGLE_API_KEY"]?.trim() ||
    undefined
  );
}

interface BatchEmbedResponse {
  embeddings?: { values?: number[] }[];
}

/**
 * Embed a batch of texts. Returns one 768-dim vector per input, in order.
 * Throws AiError when no key is configured or the API fails.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = resolveEmbeddingKey();
  if (!apiKey) {
    throw new AiError(
      "Embeddings are unavailable: set GEMINI_API_KEY (or GOOGLE_API_KEY) in server env.",
    );
  }
  const cleaned = texts.map((t) => t.slice(0, 8000));
  const out: number[][] = [];

  for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
    const batch = cleaned.slice(i, i + BATCH_SIZE);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            requests: batch.map((text) => ({
              model: `models/${EMBEDDING_MODEL}`,
              content: { parts: [{ text }] },
            })),
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new AiError(
          `Embedding API failed (${res.status}): ${errText.slice(0, 180)}`,
        );
      }
      const data = (await res.json()) as BatchEmbedResponse;
      const embeddings = data.embeddings ?? [];
      if (embeddings.length !== batch.length) {
        throw new AiError(
          `Embedding API returned ${embeddings.length} vectors for ${batch.length} texts.`,
        );
      }
      for (const e of embeddings) {
        const values = e.values ?? [];
        if (values.length !== EMBEDDING_DIMS) {
          throw new AiError(
            `Unexpected embedding dims: got ${values.length}, expected ${EMBEDDING_DIMS}.`,
          );
        }
        out.push(values);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof AiError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new AiError(`Embedding request failed: ${msg}`);
    }
  }
  return out;
}

/** Embed a single text (convenience wrapper). */
export async function embedText(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  if (!vec) throw new AiError("Embedding API returned no vector.");
  return vec;
}
