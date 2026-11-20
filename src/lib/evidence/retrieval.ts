/**
 * Retrieval for the evidence layer (Phase A10).
 *
 * Pipeline: query -> embed -> user-scoped vector search (match_evidence_chunks
 * RPC) -> provenance-attached results. The LLM always knows where each chunk
 * came from (domain / source_type / section), so generated claims can cite
 * sources instead of inventing them.
 *
 * Tenant isolation is enforced twice: the RPC filters by the verified userId,
 * and RLS policies guard direct table access.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { embedText } from "./embeddings";

type Db = SupabaseClient<any>;

export interface RetrievedChunk {
  chunkId: string;
  evidenceId: string | null;
  content: string;
  section: string | null;
  sourceType: string;
  sourceId: string | null;
  /** Cosine similarity 0..1. */
  similarity: number;
}

export interface RetrieveOptions {
  /** Max chunks to return. Default 8. */
  matchCount?: number;
  /** Restrict to source types, e.g. ["resume", "project"]. */
  sourceTypes?: string[];
  /** Minimum similarity to keep. Default 0 (keep all RPC results). */
  minSimilarity?: number;
}

/**
 * Retrieve candidate-domain evidence relevant to a query.
 * Returns chunks ordered by similarity, each with full provenance.
 */
export async function retrieveCandidateEvidence(
  db: Db,
  userId: string,
  query: string,
  opts: RetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const embedding = await embedText(trimmed);

  const { data, error } = await db.rpc("match_evidence_chunks", {
    p_user_id: userId,
    p_domain: "candidate",
    p_embedding: embedding,
    p_match_count: opts.matchCount ?? 8,
    p_source_types: opts.sourceTypes ?? null,
  });
  if (error) {
    throw new Error(`[evidence] retrieval failed: ${error.message}`);
  }

  const min = opts.minSimilarity ?? 0;
  return ((data ?? []) as any[])
    .map((r) => ({
      chunkId: r.chunk_id as string,
      evidenceId: (r.evidence_id as string | null) ?? null,
      content: r.content as string,
      section: (r.section as string | null) ?? null,
      sourceType: r.source_type as string,
      sourceId: (r.source_id as string | null) ?? null,
      similarity: Number(r.similarity ?? 0),
    }))
    .filter((c) => c.similarity >= min);
}

/**
 * Assemble retrieved chunks into prompt context with source citations.
 * The model sees exactly where each fact came from.
 */
export function buildRetrievalContext(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return "No candidate evidence retrieved.";
  return chunks
    .map((c, i) => {
      const provenance = [c.sourceType, c.section].filter(Boolean).join(" → ");
      return `[${i + 1}] (${provenance}, relevance ${c.similarity.toFixed(2)})\n${c.content}`;
    })
    .join("\n\n");
}
