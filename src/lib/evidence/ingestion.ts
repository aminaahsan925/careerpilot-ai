/**
 * Evidence ingestion (Phase A9): turn user documents into evidence_items +
 * embedded evidence_chunks. All ingestion is idempotent:
 *
 * - evidence_sources tracks a content hash per source; unchanged sources are
 *   skipped entirely (no re-chunk, no re-embed, no re-insert).
 * - evidence_chunks are keyed by (user, domain, source_type, source_id,
 *   chunk_index); only chunks whose content hash changed are re-embedded.
 * - evidence_items upsert on a stable deduplication key stored in metadata.
 *
 * Nothing here calls an LLM. Skill extraction from resumes reuses the
 * existing resume_analyses.detected_skills; chunk text is quoted verbatim.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeSkill } from "./skill-aliases";
import {
  chunkJobDescription,
  chunkProjectText,
  chunkResumeText,
  sha256Hex,
  type EvidenceChunkInput,
} from "./chunking";
import { embedTexts } from "./embeddings";

type Db = SupabaseClient<any>;

export interface IngestResult {
  chunks: number;
  items: number;
  skipped: boolean;
}

interface ChunkRow {
  user_id: string;
  evidence_id: string | null;
  domain: "candidate" | "market";
  source_type: string;
  source_id: string;
  chunk_index: number;
  section: string;
  content: string;
  content_hash: string;
  embedding: number[];
}

/**
 * Upsert chunks for one source: embed only chunks whose content hash changed,
 * drop stale tail chunks. Returns number of chunks stored.
 */
async function syncChunks(
  db: Db,
  userId: string,
  domain: "candidate" | "market",
  sourceType: string,
  sourceId: string,
  chunks: EvidenceChunkInput[],
): Promise<number> {
  const { data: existing } = await db
    .from("evidence_chunks")
    .select("chunk_index, content_hash")
    .eq("user_id", userId)
    .eq("domain", domain)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);

  const existingByIndex = new Map<number, string>(
    (existing ?? []).map((r: any) => [r.chunk_index, r.content_hash]),
  );

  const toEmbed: EvidenceChunkInput[] = chunks.filter(
    (c) => existingByIndex.get(c.chunkIndex) !== c.contentHash,
  );

  const vectors = toEmbed.length ? await embedTexts(toEmbed.map((c) => c.content)) : [];
  const vectorByHash = new Map(toEmbed.map((c, i) => [c.contentHash, vectors[i] as number[]]));

  // Fetch existing vectors for unchanged chunks so upsert keeps them.
  const { data: existingVectors } = await db
    .from("evidence_chunks")
    .select("chunk_index, content_hash, embedding")
    .eq("user_id", userId)
    .eq("domain", domain)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);
  const keptVectors = new Map<string, number[]>(
    (existingVectors ?? [])
      .filter((r: any) => r.embedding)
      .map((r: any) => [r.content_hash as string, r.embedding as number[]]),
  );

  const rows: ChunkRow[] = chunks.map((c) => ({
    user_id: userId,
    evidence_id: null,
    domain,
    source_type: sourceType,
    source_id: sourceId,
    chunk_index: c.chunkIndex,
    section: c.section,
    content: c.content,
    content_hash: c.contentHash,
    embedding: (vectorByHash.get(c.contentHash) ?? keptVectors.get(c.contentHash) ?? []) as number[],
  }));

  const missing = rows.filter((r) => r.embedding.length === 0);
  if (missing.length) {
    throw new Error(
      `[evidence] ${missing.length} chunks have no embedding for ${sourceType}/${sourceId}; aborting to avoid null-vector rows.`,
    );
  }

  if (rows.length) {
    const { error } = await db.from("evidence_chunks").upsert(rows, {
      onConflict: "user_id,domain,source_type,source_id,chunk_index",
    });
    if (error) throw new Error(`[evidence] chunk upsert failed: ${error.message}`);
  }

  // Drop stale tail chunks (source shrank since last ingest).
  const { error: delError } = await db
    .from("evidence_chunks")
    .delete()
    .eq("user_id", userId)
    .eq("domain", domain)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .gte("chunk_index", chunks.length);
  if (delError) throw new Error(`[evidence] stale chunk cleanup failed: ${delError.message}`);

  return rows.length;
}

/** Record/update the provenance row for a source; returns true when the source changed. */
async function trackSource(
  db: Db,
  userId: string,
  domain: "candidate" | "market",
  sourceType: string,
  sourceId: string,
  contentHash: string,
  title?: string,
  sourceUrl?: string,
): Promise<boolean> {
  const { data: prev } = await db
    .from("evidence_sources")
    .select("content_hash")
    .eq("user_id", userId)
    .eq("domain", domain)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (prev && (prev as any).content_hash === contentHash) return false;

  const { error } = await db.from("evidence_sources").upsert(
    {
      user_id: userId,
      domain,
      source_type: sourceType,
      source_id: sourceId,
      source_url: sourceUrl ?? null,
      title: title ?? null,
      content_hash: contentHash,
      last_ingested_at: new Date().toISOString(),
    },
    { onConflict: "user_id,domain,source_type,source_id" },
  );
  if (error) throw new Error(`[evidence] source tracking failed: ${error.message}`);
  return true;
}

/** Insert an evidence item unless an identical dedupe key already exists. */
async function insertItemOnce(
  db: Db,
  userId: string,
  item: {
    skill_key: string;
    claim: string;
    source_type: string;
    source_id?: string | undefined;
    source_url?: string | undefined;
    content?: string | undefined;
    evidence_strength: number;
    verification_status?: string | undefined;
    confidence?: number | undefined;
    dedupeKey: string;
  },
): Promise<boolean> {
  const { data: prev } = await db
    .from("evidence_items")
    .select("id")
    .eq("user_id", userId)
    .eq("skill_key", item.skill_key)
    .eq("source_type", item.source_type)
    .filter("metadata->>dedupe_key", "eq", item.dedupeKey)
    .limit(1);
  if (prev && (prev as any[]).length > 0) return false;

  const { error } = await db.from("evidence_items").insert({
    user_id: userId,
    skill_key: item.skill_key,
    claim: item.claim,
    source_type: item.source_type,
    source_id: item.source_id ?? null,
    source_url: item.source_url ?? null,
    content: item.content ?? null,
    evidence_strength: item.evidence_strength,
    verification_status: item.verification_status ?? "extracted",
    confidence: item.confidence ?? 0.6,
    metadata: { dedupe_key: item.dedupeKey },
  });
  if (error) throw new Error(`[evidence] item insert failed: ${error.message}`);
  return true;
}

/**
 * Ingest a resume: chunk + embed its text, and create evidence items from
 * the detected skills of its latest analysis. Idempotent via content hash.
 */
export async function ingestResumeEvidence(
  db: Db,
  userId: string,
  resumeId: string,
): Promise<IngestResult> {
  const { data: resume, error } = await db
    .from("resumes")
    .select("id, file_name, content_text")
    .eq("user_id", userId)
    .eq("id", resumeId)
    .maybeSingle();
  if (error) throw new Error(`[evidence] resume load failed: ${error.message}`);
  if (!resume || !(resume as any).content_text?.trim()) {
    return { chunks: 0, items: 0, skipped: true };
  }

  const text = (resume as any).content_text as string;
  const changed = await trackSource(
    db, userId, "candidate", "resume", resumeId, sha256Hex(text),
    (resume as any).file_name ?? "resume",
  );

  let chunks = 0;
  if (changed) {
    chunks = await syncChunks(db, userId, "candidate", "resume", resumeId, chunkResumeText(text));
  }

  // Evidence items from the latest analysis' detected skills (already computed).
  let items = 0;
  const { data: analysis } = await db
    .from("resume_analyses")
    .select("detected_skills")
    .eq("user_id", userId)
    .eq("resume_id", resumeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const detected = ((analysis as any)?.detected_skills ?? []) as unknown[];
  const skills = detected
    .map((s) => (typeof s === "string" ? s : (s as any)?.name ?? (s as any)?.skill ?? ""))
    .filter((s): s is string => !!s && s.length > 0);

  for (const raw of skills) {
    const n = normalizeSkill(raw);
    const ok = await insertItemOnce(db, userId, {
      skill_key: n.canonical,
      claim: `Resume lists ${n.canonical}`,
      source_type: "resume",
      source_id: resumeId,
      evidence_strength: 1,
      verification_status: "extracted",
      confidence: 0.6,
      dedupeKey: `resume-skill:${resumeId}:${n.canonical}`,
    });
    if (ok) items++;
  }

  return { chunks, items, skipped: !changed && items === 0 };
}

/** Project shape as stored in user_projects. */
export interface ProjectInput {
  id: string;
  name: string;
  description?: string | null;
  technologies?: unknown;
  project_url?: string | null;
}

/**
 * Ingest a user project: chunk its text and create one evidence item per
 * technology (strength 2 = demonstrated in an artifact).
 */
export async function ingestProjectEvidence(
  db: Db,
  userId: string,
  project: ProjectInput,
): Promise<IngestResult> {
  const techs = Array.isArray(project.technologies)
    ? (project.technologies as unknown[]).map(String).filter(Boolean)
    : [];
  const chunks = chunkProjectText(project.name, project.description ?? "", techs);
  const docText = chunks.map((c) => c.content).join("\n");
  const changed = await trackSource(
    db, userId, "candidate", "project", project.id, sha256Hex(docText),
    project.name, project.project_url ?? undefined,
  );

  let stored = 0;
  if (changed) {
    stored = await syncChunks(db, userId, "candidate", "project", project.id, chunks);
  }

  let items = 0;
  for (const raw of techs) {
    const n = normalizeSkill(raw);
    const ok = await insertItemOnce(db, userId, {
      skill_key: n.canonical,
      claim: `Project "${project.name}" uses ${n.canonical}`,
      source_type: "project",
      source_id: project.id,
      source_url: project.project_url ?? undefined,
      content: chunks[0]?.content.slice(0, 500),
      evidence_strength: 2,
      verification_status: "extracted",
      confidence: 0.7,
      dedupeKey: `project-tech:${project.id}:${n.canonical}`,
    });
    if (ok) items++;
  }
  return { chunks: stored, items, skipped: !changed && items === 0 };
}

/**
 * One-time backfill: migrate legacy skill_evidence rows and user_skills into
 * evidence_items so the new model starts with the user's existing data.
 * Safe to re-run (dedupe keys).
 */
export async function backfillUserEvidence(db: Db, userId: string): Promise<{ items: number }> {
  let items = 0;

  const { data: legacy } = await db
    .from("skill_evidence")
    .select("skill_name, source, detail, strength")
    .eq("user_id", userId);
  for (const row of ((legacy ?? []) as any[])) {
    const n = normalizeSkill(String(row.skill_name ?? ""));
    if (n.canonical === "Unknown") continue;
    // Legacy enum drift: skill_evidence.source uses "certification" but the
    // evidence_items source_type enum only permits "certificate". Map explicitly.
    const legacySource = String(row.source ?? "");
    const sourceType =
      legacySource === "certification"
        ? "certificate"
        : (
              ["claim", "resume", "project", "github", "course"] as const
            ).includes(legacySource as any)
          ? legacySource
          : "other";
    const ok = await insertItemOnce(db, userId, {
      skill_key: n.canonical,
      claim: row.detail ? `${n.canonical}: ${String(row.detail).slice(0, 200)}` : `Evidence for ${n.canonical}`,
      source_type: sourceType as any,
      content: row.detail ? String(row.detail).slice(0, 500) : undefined,
      evidence_strength: Math.max(0, Math.min(3, Number(row.strength ?? 1) || 0)),
      verification_status: "extracted",
      confidence: 0.5,
      dedupeKey: `legacy-skill-evidence:${n.canonical}:${row.source}:${sha256Hex(String(row.detail ?? "")).slice(0, 12)}`,
    });
    if (ok) items++;
  }

  const { data: userSkills } = await db
    .from("user_skills")
    .select("proficiency, skills(name)")
    .eq("user_id", userId);
  for (const row of ((userSkills ?? []) as any[])) {
    const name = row.skills?.name as string | undefined;
    if (!name) continue;
    const n = normalizeSkill(name);
    const ok = await insertItemOnce(db, userId, {
      skill_key: n.canonical,
      claim: `Self-reported proficiency ${Number(row.proficiency ?? 0)}% in ${n.canonical}`,
      source_type: "manual_claim",
      evidence_strength: 0,
      verification_status: "extracted",
      confidence: 0.4,
      dedupeKey: `legacy-user-skill:${n.canonical}`,
    });
    if (ok) items++;
  }

  return { items };
}

/** Ingest a job description into the MARKET domain (Phase B uses this). */
export async function ingestJobDescription(
  db: Db,
  userId: string,
  jobSnapshotId: string,
  description: string,
  title?: string,
  sourceUrl?: string,
): Promise<IngestResult> {
  if (!description.trim()) return { chunks: 0, items: 0, skipped: true };
  const changed = await trackSource(
    db, userId, "market", "job", jobSnapshotId, sha256Hex(description), title, sourceUrl,
  );
  // Job chunks are stored per user for isolation simplicity.
  let chunks = 0;
  if (changed) {
    chunks = await syncChunks(db, userId, "market", "job", jobSnapshotId, chunkJobDescription(description));
  }
  return { chunks, items: 0, skipped: !changed };
}
