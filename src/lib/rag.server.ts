import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_TIMEOUT_MS = 3_500;

export type RagEvidence = {
  id: string;
  statement: string;
  source: "rag";
  provenance: string;
  priority: number;
  similarity: number;
  trustScore: number;
  sourceType: string;
  sourceUrl?: string;
  expiresAt?: string;
};

export type RagSeedItem = {
  id: string;
  statement: string;
  provenance: string;
  sourceType?: "market_truth" | "job_description" | "company_truth" | "system";
  sourceUrl?: string;
  trustScore?: number;
  publishedAt?: string;
  expiresAt?: string;
};

export type RagIndexOptions = { force?: boolean };

type MatchRow = {
  id: string;
  content: string;
  similarity: number;
  source_type: string;
  title: string;
  source_url: string | null;
  trust_score: number;
  expires_at: string | null;
};

function configured(value: string | undefined): value is string {
  return Boolean(value?.trim() && !value.includes("your_") && !value.includes("..."));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Embedding request timed out")), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function asEmbedding(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== EMBEDDING_DIMENSIONS) return null;
  const vector = value.map((item) => Number(item));
  return vector.every(Number.isFinite) ? vector : null;
}

function contentHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Creates a 768-dimensional embedding without adding a client-side AI SDK.
 * A custom OpenAI-compatible endpoint can be supplied for Alibaba embeddings;
 * Gemini is the safe default when GEMINI_API_KEY is already configured.
 */
export async function embedForRag(text: string): Promise<number[] | null> {
  if (process.env["RAG_EMBEDDINGS_ENABLED"] === "false") return null;
  const trimmed = text.trim().slice(0, 12_000);
  if (!trimmed) return null;

  const customUrl = process.env["RAG_EMBEDDING_URL"]?.trim();
  const customKey = process.env["RAG_EMBEDDING_API_KEY"]?.trim();
  const geminiKey = process.env["GEMINI_API_KEY"]?.trim() || process.env["GOOGLE_API_KEY"]?.trim();

  try {
    if (customUrl && configured(customKey)) {
      const response = await withTimeout(
        fetch(customUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${customKey}`,
          },
          body: JSON.stringify({
            model: process.env["RAG_EMBEDDING_MODEL"] || "text-embedding-3-small",
            input: trimmed,
            dimensions: EMBEDDING_DIMENSIONS,
          }),
        }),
        EMBEDDING_TIMEOUT_MS,
      );
      if (!response.ok) return null;
      const payload = (await response.json()) as { data?: { embedding?: unknown }[] };
      return asEmbedding(payload.data?.[0]?.embedding);
    }

    if (configured(geminiKey)) {
      const model = process.env["RAG_GEMINI_EMBEDDING_MODEL"] || "gemini-embedding-001";
      const response = await withTimeout(
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${encodeURIComponent(geminiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: `models/${model}`,
              content: { parts: [{ text: trimmed }] },
              outputDimensionality: EMBEDDING_DIMENSIONS,
            }),
          },
        ),
        EMBEDDING_TIMEOUT_MS,
      );
      if (!response.ok) return null;
      const payload = (await response.json()) as { embedding?: { values?: unknown } };
      return asEmbedding(payload.embedding?.values);
    }
  } catch (error) {
    console.warn("[CareerPilot][rag] embedding unavailable; using existing retrieval:", error);
  }
  return null;
}

/**
 * Optional persistent retrieval. Any schema, provider, or network failure
 * returns an empty list so existing feature flows keep working.
 */
export async function retrieveRagEvidence(
  client: Client,
  userId: string,
  query: string,
  limit = 8,
): Promise<RagEvidence[]> {
  const embedding = await embedForRag(query);
  if (!embedding) return [];

  try {
    const rpc = (
      client as unknown as {
        rpc: (
          name: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      }
    ).rpc;
    const { data, error } = await rpc("match_intelligence_chunks", {
      query_embedding: `[${embedding.join(",")}]`,
      match_count: Math.min(Math.max(limit, 1), 20),
      match_user_id: userId,
      minimum_similarity: 0.35,
    });
    if (error || !Array.isArray(data)) {
      if (error) console.warn("[CareerPilot][rag] vector search unavailable:", error.message);
      return [];
    }

    return (data as MatchRow[]).map((row) => ({
      id: `rag-${row.id}`,
      statement: row.content,
      source: "rag" as const,
      provenance: `${row.title} (${row.source_type})`,
      priority: Math.round((row.similarity ?? 0) * 10),
      similarity: row.similarity ?? 0,
      trustScore: row.trust_score ?? 0.5,
      sourceType: row.source_type,
      ...(row.source_url ? { sourceUrl: row.source_url } : {}),
      ...(row.expires_at ? { expiresAt: row.expires_at } : {}),
    }));
  } catch (error) {
    console.warn("[CareerPilot][rag] retrieval failed; using existing retrieval:", error);
    return [];
  }
}

/**
 * Best-effort indexing for user-scoped evidence. It is opt-in so adding the
 * migration never changes existing latency or database behavior by default.
 */
export async function indexRagEvidence(
  client: Client,
  userId: string,
  items: RagSeedItem[],
  titlePrefix: string,
  options: RagIndexOptions = {},
): Promise<void> {
  if (!options.force && process.env["RAG_AUTO_INDEX"] !== "true") return;

  // The generated Supabase types intentionally do not know about the new
  // migration until the project regenerates them. Keep this boundary typed
  // locally so the rest of the application remains unchanged.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = client as unknown as { from: (table: string) => any };
  for (const item of items.slice(0, 12)) {
    const embedding = await embedForRag(`${item.provenance}\n${item.statement}`);
    if (!embedding) continue;
    const hash = contentHash(item.statement);
    try {
      const { data: document, error: documentError } = await db
        .from("intelligence_documents")
        .upsert(
          {
            user_id: userId,
            source_type: item.sourceType ?? "market_truth",
            source_key: item.id,
            title: `${titlePrefix} — ${item.provenance}`.slice(0, 240),
            source_url: item.sourceUrl ?? null,
            content_hash: hash,
            trust_score: Math.max(0, Math.min(1, item.trustScore ?? 0.8)),
            published_at: item.publishedAt ?? null,
            expires_at: item.expiresAt ?? null,
            metadata: { indexed_by: "careerpilot", evidence_id: item.id, provenance: item.provenance },
          },
          { onConflict: "user_id,source_type,source_key,content_hash" },
        )
        .select("id")
        .single();
      if (documentError || !document?.id) continue;

      await db.from("intelligence_chunks").upsert(
        {
          document_id: document.id,
          chunk_index: 0,
          content: item.statement,
          embedding: `[${embedding.join(",")}]`,
          token_count: item.statement.split(/\s+/).length,
          metadata: { provenance: item.provenance, source_url: item.sourceUrl ?? null },
        },
        { onConflict: "document_id,chunk_index" },
      );
    } catch (error) {
      console.warn("[CareerPilot][rag] evidence indexing skipped:", error);
    }
  }
}
