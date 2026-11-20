/**
 * Company dashboard server — Phase 4 company intelligence.
 *
 * Builds the per-company dashboard: overview, hiring areas, common
 * skills, tech signals, candidate alignment/gaps (via
 * evidence/matching.ts), best projects, and official job links.
 *
 * Data flow (all best-effort, never breaking user flows):
 *   1. Normalize the company identity (dedup key).
 *   2. Read the SHARED company cache (`company_research_cache`, keyed by
 *      company + dataset version). This cache is shared across users and
 *      is a different cache from per-user candidate analysis.
 *   3. On miss/expiry: try live research (Tavily careers-page flow).
 *      On research failure: fall back to the source-reviewed seed
 *      (company-truth.ts with screening stats dropped, badged unverified).
 *   4. Match the candidate's evidence against the company's requirements
 *      with the deterministic matcher.
 *
 * Provenance: every dashboard section carries its source (URL +
 * retrieved date) or an explicit `unverified` badge — never presented
 * as fact without it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { matchCompanyTruth } from "@/data/company-truth";
import type { Database } from "@/integrations/supabase/types";
import {
  computeCoverage,
  type CoverageReport,
  type EvidenceInput,
  type RequirementInput,
} from "../evidence/matching";
import { companyIdentity, COMPANY_DATASET_VERSION } from "./normalization";
import { companyResearchCacheKey } from "./cache";
import {
  researchCompany,
  CompanyResearchError,
  type CompanyResearch,
} from "./research";
import { seedSnapshot, seedRequirements, SEED_SOURCE_LABEL } from "./seed";

type Client = SupabaseClient<Database>;
type AnyClient = SupabaseClient<any>;

export type DashboardProvenance = {
  /** "researched" = live careers-page research; "seed" = static dataset. */
  origin: "researched" | "seed";
  verification: "verified" | "unverified";
  sourceLabel: string;
  retrievedAt: string;
  expiresAt: string | null;
  fromCache: boolean;
  sources: { url: string; label: string; retrievedAt: string }[];
  /** Present only for seed origin: what source review removed. */
  sourceReviewNote?: string;
};

export type CompanySkill = {
  skillName: string;
  importance: "must_have" | "preferred";
  frequencyCount: number;
  shareOfPostings: number | null;
};

export type CompanyDashboard = {
  company: {
    displayName: string;
    category: string | null;
    location: string | null;
    tier: string | null;
    tagline: string | null;
    domain: string | null;
    careersUrl: string | null;
  };
  provenance: DashboardProvenance;
  hiringAreas: string[];
  commonSkills: CompanySkill[];
  techSignals: string[];
  alignment: CoverageReport | null;
  alignmentNote: string | null;
  bestProjects: {
    claim: string;
    skillKey: string;
    strength: number;
    sourceUrl: string | null;
  }[];
  jobLinks: { url: string; label: string; retrievedAt: string }[];
};

const COMPANY_CACHE_TTL_DAYS = 30;

/* ------------------------------------------------------------------ */
/* Shared cache (company-scoped, NOT user-scoped)                       */
/* ------------------------------------------------------------------ */

async function readSharedCache(
  db: AnyClient,
  cacheKey: string,
): Promise<{ payload: any; expiresAt: string } | null> {
  try {
    const { data, error } = await db
      .from("company_research_cache")
      .select("payload, expires_at")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error || !data) return null;
    return { payload: data.payload, expiresAt: data.expires_at };
  } catch (error) {
    // Table may not exist yet (migration not applied) — log, don't break.
    console.warn(
      "[CareerPilot][company] shared cache read failed (best-effort)",
      {
        cacheKey,
        error: error instanceof Error ? error.message : String(error),
      },
    );
    return null;
  }
}

async function writeSharedCache(
  db: AnyClient,
  cacheKey: string,
  companyId: string | null,
  payload: unknown,
): Promise<void> {
  try {
    const expiresAt = new Date(
      Date.now() + COMPANY_CACHE_TTL_DAYS * 86400_000,
    ).toISOString();
    const { error } = await db.from("company_research_cache").upsert(
      {
        cache_key: cacheKey,
        company_id: companyId,
        dataset_version: COMPANY_DATASET_VERSION,
        payload,
        expires_at: expiresAt,
      },
      { onConflict: "cache_key" },
    );
    if (error) {
      console.warn("[CareerPilot][company] shared cache write skipped", {
        cacheKey,
        error: error.message,
      });
    }
  } catch (error) {
    console.warn(
      "[CareerPilot][company] shared cache write failed (best-effort)",
      {
        cacheKey,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }
}

/* ------------------------------------------------------------------ */
/* Research → snapshot payload                                          */
/* ------------------------------------------------------------------ */

type SnapshotPayload = {
  origin: "researched" | "seed";
  displayName: string;
  category: string | null;
  location: string | null;
  tier: string | null;
  tagline: string | null;
  domain: string | null;
  careersUrl: string | null;
  hiringAreas: string[];
  techSignals: string[];
  skills: CompanySkill[];
  jobLinks: { url: string; label: string }[];
  retrievedAt: string;
  sources: { url: string; label: string }[];
  sourceReviewNote?: string;
};

function payloadFromResearch(research: CompanyResearch): SnapshotPayload {
  return {
    origin: "researched",
    displayName: research.companyName,
    category: null,
    location: null,
    tier: null,
    tagline: null,
    domain: research.domain,
    careersUrl: research.careersUrl,
    hiringAreas: research.roles.map((r) => r.title),
    techSignals: research.requirements.slice(0, 12).map((r) => r.skillName),
    skills: research.requirements.map((r) => ({
      skillName: r.skillName,
      importance:
        r.shareOfPostings >= 0.5
          ? ("must_have" as const)
          : ("preferred" as const),
      frequencyCount: r.frequencyCount,
      shareOfPostings: r.shareOfPostings,
    })),
    jobLinks: research.roles
      .filter((r) => r.url)
      .slice(0, 10)
      .map((r) => ({ url: r.url as string, label: r.title })),
    retrievedAt: research.retrievedAt,
    sources: research.sources,
  };
}

function payloadFromSeed(companyName: string): SnapshotPayload {
  // matchCompanyTruth returns null for companies outside the 8 featured
  // entries (the fabrication branch was deleted in the 2026-11-20
  // rebuild). There is no seed for such a company, so the honest
  // outcome is a clear error, not an invented profile. The caller
  // (getCompanyDashboard) only reaches here after live research has
  // already failed; the Company page surfaces the error state.
  // Follow-up (company-data phase): return a typed "not researched
  // yet" dashboard instead of throwing.
  const truth = matchCompanyTruth(companyName);
  if (!truth) {
    throw new Error(
      `No researched hiring profile exists for "${companyName}" yet, and live research is unavailable right now. Try again later.`,
    );
  }
  const snapshot = seedSnapshot(truth);
  const requirements = seedRequirements(truth);
  return {
    origin: "seed",
    displayName: truth.name,
    category: truth.category,
    location: truth.location,
    tier: truth.tier,
    tagline: truth.tagline,
    domain: null,
    careersUrl: null,
    hiringAreas: snapshot.entryRoles,
    techSignals: snapshot.primaryStack,
    skills: requirements.map((r) => ({
      skillName: r.skillName,
      importance: r.importance,
      frequencyCount: r.frequencyCount,
      shareOfPostings: null,
    })),
    jobLinks: [],
    retrievedAt: new Date().toISOString(),
    sources: [],
    sourceReviewNote: snapshot.sourceReviewNote,
  };
}

/* ------------------------------------------------------------------ */
/* Candidate evidence → alignment                                       */
/* ------------------------------------------------------------------ */

async function loadCandidateEvidence(
  db: AnyClient,
  userId: string,
): Promise<EvidenceInput[]> {
  const { data, error } = await db
    .from("evidence_items")
    .select(
      "id, skill_key, evidence_strength, confidence, verification_status, source_type",
    )
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as EvidenceInput[];
}

async function bestProjectsForSkills(
  db: AnyClient,
  userId: string,
  skillNames: string[],
): Promise<CompanyDashboard["bestProjects"]> {
  if (skillNames.length === 0) return [];
  const { data, error } = await db
    .from("evidence_items")
    .select("claim, skill_key, evidence_strength, source_url")
    .eq("user_id", userId)
    .in("skill_key", skillNames)
    .order("evidence_strength", { ascending: false })
    .limit(5);
  if (error) {
    console.warn(
      "[CareerPilot][company] best-projects lookup failed (best-effort)",
      {
        error: error.message,
      },
    );
    return [];
  }
  return (data ?? []).map((row: any) => ({
    claim: String(row.claim ?? ""),
    skillKey: String(row.skill_key ?? ""),
    strength: Number(row.evidence_strength ?? 0),
    sourceUrl: (row.source_url as string | null) ?? null,
  }));
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                   */
/* ------------------------------------------------------------------ */

/**
 * Build the company dashboard. Never throws for missing data: research
 * failures fall back to the source-reviewed seed, and alignment is null
 * (with a note) when the candidate has no evidence yet.
 */
export async function getCompanyDashboard(
  supabase: Client,
  userId: string,
  companyName: string,
): Promise<CompanyDashboard> {
  const db = supabase as unknown as AnyClient;
  const { normalizedName, domain } = companyIdentity(companyName);
  const cacheKey = companyResearchCacheKey(companyName, domain);

  // 1. Shared company cache (never the per-user candidate caches).
  let payload: SnapshotPayload | null = null;
  let fromCache = false;
  let expiresAt: string | null = null;

  const cached = await readSharedCache(db, cacheKey);
  if (cached && isSnapshotPayload(cached.payload)) {
    payload = cached.payload;
    fromCache = true;
    expiresAt = cached.expiresAt;
  }

  // 2. Miss → live research, best-effort.
  if (!payload) {
    try {
      const research = await researchCompany(companyName, domain);
      payload = payloadFromResearch(research);
      await writeSharedCache(db, cacheKey, null, payload);
    } catch (error) {
      console.warn(
        "[CareerPilot][company] live research failed, using seed fallback",
        {
          companyName,
          error:
            error instanceof CompanyResearchError
              ? error.message
              : String(error),
        },
      );
      payload = payloadFromSeed(companyName);
      await writeSharedCache(db, cacheKey, null, payload);
    }
  }

  // 3. Candidate alignment (private per-user evidence — never cached in
  //    the shared company cache).
  let alignment: CoverageReport | null = null;
  let alignmentNote: string | null = null;
  let bestProjects: CompanyDashboard["bestProjects"] = [];
  try {
    const evidence = await loadCandidateEvidence(db, userId);
    if (evidence.length === 0) {
      alignmentNote =
        "Add projects or skills to your evidence ledger to see your alignment with this company.";
    } else {
      const requirements: RequirementInput[] = payload.skills.map((s) => ({
        skill: s.skillName,
        importance: s.importance,
      }));
      alignment = computeCoverage(requirements, evidence);
      bestProjects = await bestProjectsForSkills(
        db,
        userId,
        payload.skills.slice(0, 12).map((s) => s.skillName),
      );
    }
  } catch (error) {
    console.warn("[CareerPilot][company] alignment failed (best-effort)", {
      error: error instanceof Error ? error.message : String(error),
    });
    alignmentNote =
      "Your alignment couldn't be computed right now — company data below is unaffected.";
  }

  const provenance: DashboardProvenance = {
    origin: payload.origin,
    verification: payload.origin === "researched" ? "verified" : "unverified",
    sourceLabel:
      payload.origin === "researched"
        ? "Live careers-page research"
        : SEED_SOURCE_LABEL,
    retrievedAt: payload.retrievedAt,
    expiresAt,
    fromCache,
    sources: payload.sources.map((s) => ({
      ...s,
      retrievedAt: payload!.retrievedAt,
    })),
    ...(payload.sourceReviewNote
      ? { sourceReviewNote: payload.sourceReviewNote }
      : {}),
  };

  return {
    company: {
      displayName: payload.displayName,
      category: payload.category,
      location: payload.location,
      tier: payload.tier,
      tagline: payload.tagline,
      domain: payload.domain,
      careersUrl: payload.careersUrl,
    },
    provenance,
    hiringAreas: payload.hiringAreas,
    commonSkills: payload.skills,
    techSignals: payload.techSignals,
    alignment,
    alignmentNote,
    bestProjects,
    jobLinks: payload.jobLinks.map((j) => ({
      ...j,
      retrievedAt: payload!.retrievedAt,
    })),
  };
}

function isSnapshotPayload(value: unknown): value is SnapshotPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (v["origin"] === "researched" || v["origin"] === "seed") &&
    typeof v["displayName"] === "string" &&
    Array.isArray(v["skills"]) &&
    Array.isArray(v["hiringAreas"])
  );
}
