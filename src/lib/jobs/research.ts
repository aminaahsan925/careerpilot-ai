/**
 * Live job-market research loop — Phase 3.
 *
 * search → store → extract → aggregate, all best-effort:
 *  - Tavily unavailable → null (caller falls back to the dataset provider).
 *  - DB write fails → continue with in-memory postings.
 *  - Per-posting extraction fails → posting keeps zero structured
 *    requirements; it is logged, never invented.
 *
 * Nothing here throws except programmer errors. User flows never break
 * because the live job layer is down (Phase 2 pattern).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeSkill } from "../evidence/skill-aliases";
import type { RequirementInput } from "../evidence/matching";
import { aggregateSkillFrequency, type MarketAggregation } from "./coverage";
import {
  dedupHashJob,
  TavilyJobProvider,
  type JobLocationFilter,
  type NormalizedJobPosting,
} from "./providers";
import { extractRequirements, toRequirementInputs } from "./requirements";

/** Any client works — the new tables are not in the generated types yet. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>;

/** Max postings to run AI requirement extraction on per refresh (quota). */
const MAX_EXTRACTION_JOBS = 3;
/** Max postings to persist per refresh. */
const MAX_STORED_JOBS = 10;

export type LiveJobMarket = {
  providerName: string;
  postings: NormalizedJobPosting[];
  aggregation: MarketAggregation;
  /** ISO date (YYYY-MM-DD) the live research ran — provenance for the UI. */
  researchedOn: string;
};

/**
 * Run one live research pass for a role + location.
 * Returns null when the live layer cannot produce evidence (no Tavily key,
 * search failure, zero postings) — the caller then uses the dataset.
 */
export async function refreshJobMarket(
  supabase: AnyClient,
  userId: string,
  targetRole: string,
  location: JobLocationFilter,
): Promise<LiveJobMarket | null> {
  if (!process.env["TAVILY_API_KEY"]) {
    return null;
  }

  let postings: NormalizedJobPosting[];
  try {
    const provider = new TavilyJobProvider();
    postings = await provider.searchJobs({
      targetRole,
      location,
      limit: MAX_STORED_JOBS,
    });
  } catch (error) {
    console.warn(
      "[JobMarket] live search failed, falling back to dataset:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }

  // Persist postings (best-effort) so aggregation reads stored jobs.
  const storedIds = await storePostings(supabase, userId, postings);

  // Extract structured requirements for the top postings (best-effort each).
  const jobsForAggregation: { requirements: RequirementInput[] }[] = [];
  for (const posting of postings.slice(0, MAX_EXTRACTION_JOBS)) {
    const requirements = await extractPostingRequirements(
      supabase,
      userId,
      posting,
      storedIds.get(posting.url ?? ""),
    );
    jobsForAggregation.push({ requirements });
  }
  // Postings without extraction still count as analysed (zero requirements).
  for (let i = MAX_EXTRACTION_JOBS; i < postings.length; i++) {
    jobsForAggregation.push({ requirements: [] });
  }

  return {
    providerName: "tavily",
    postings,
    aggregation: aggregateSkillFrequency(jobsForAggregation),
    researchedOn: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Aggregate skill frequencies from the user's STORED jobs (non-expired).
 * Real counts from the database — the market aggregation the spec asks for.
 */
export async function aggregateStoredJobs(
  supabase: AnyClient,
  userId: string,
): Promise<MarketAggregation> {
  const { data, error } = await supabase
    .from("jobs")
    .select("id")
    .eq("user_id", userId)
    .gte("expires_at", new Date().toISOString());

  if (error || !data) {
    console.warn(
      "[JobMarket] stored-job read failed:",
      error?.message ?? "no data",
    );
    return aggregateSkillFrequency([]);
  }

  const jobs: { requirements: RequirementInput[] }[] = [];
  for (const row of data as { id: string }[]) {
    const { data: reqRows, error: reqError } = await supabase
      .from("job_requirements")
      .select("skill, importance")
      .eq("job_id", row.id);
    if (reqError || !reqRows) continue;
    jobs.push({
      requirements: (reqRows as { skill: string; importance: string }[]).map(
        (r) => ({
          skill: r.skill,
          importance: r.importance === "must_have" ? "must_have" : "preferred",
        }),
      ),
    });
  }
  return aggregateSkillFrequency(jobs);
}

/* ------------------------------------------------------------------ */
/* Storage                                                              */
/* ------------------------------------------------------------------ */

async function tavilySourceId(supabase: AnyClient): Promise<string | null> {
  const { data } = await supabase
    .from("job_sources")
    .select("id")
    .eq("name", "tavily")
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Upsert postings keyed by (user_id, dedup_hash). Returns a map of
 * posting URL → stored job id for the requirement-attachment step.
 */
async function storePostings(
  supabase: AnyClient,
  userId: string,
  postings: NormalizedJobPosting[],
): Promise<Map<string, string>> {
  const byUrl = new Map<string, string>();
  if (postings.length === 0) return byUrl;

  const sourceId = await tavilySourceId(supabase).catch(() => null);
  const rows = postings.map((p) => ({
    user_id: userId,
    source_id: sourceId,
    title: p.title,
    company: p.company,
    location_country: p.country,
    location_city: p.city,
    remote_type: p.remoteType,
    url: p.url,
    description: p.description,
    published_at: p.publishedAt,
    retrieved_at: new Date().toISOString(),
    dedup_hash: dedupHashJob(p),
    raw: { externalId: p.externalId },
  }));

  const { data, error } = await supabase
    .from("jobs")
    .upsert(rows, { onConflict: "user_id,dedup_hash" })
    .select("id, url");

  if (error) {
    console.warn(
      "[JobMarket] job upsert failed (continuing in-memory):",
      error.message,
    );
    return byUrl;
  }
  for (const row of (data ?? []) as { id: string; url: string | null }[]) {
    if (row.url) byUrl.set(row.url, row.id);
  }
  return byUrl;
}

/**
 * Extract + persist structured requirements for one posting.
 * Any failure → empty requirements (logged, never invented).
 */
async function extractPostingRequirements(
  supabase: AnyClient,
  userId: string,
  posting: NormalizedJobPosting,
  jobId: string | undefined,
): Promise<RequirementInput[]> {
  if (!posting.description || !jobId) return [];
  let result;
  try {
    result = await extractRequirements(
      supabase,
      userId,
      posting.title,
      posting.description,
    );
  } catch (error) {
    console.warn(
      "[JobMarket] requirement extraction failed for posting:",
      posting.url ?? posting.title,
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }

  const inputs = toRequirementInputs(result);
  const rows = inputs.map((input) => {
    const normalized = normalizeSkill(input.skill);
    return {
      job_id: jobId,
      user_id: userId,
      skill: normalized.canonical,
      category: normalized.category,
      importance: input.importance,
      source_text: posting.description!.slice(0, 500),
    };
  });

  if (rows.length > 0) {
    const { error } = await supabase.from("job_requirements").insert(rows);
    if (error) {
      console.warn("[JobMarket] requirement insert failed:", error.message);
    }
  }
  return inputs;
}
