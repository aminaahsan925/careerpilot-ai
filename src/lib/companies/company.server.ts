/**
 * Company dashboard server — Phase 4 company intelligence.
 *
 * Builds the per-company dashboard: overview, hiring areas, common
 * skills, tech signals, candidate alignment/gaps (via
 * evidence/matching.ts), best projects, and official job links.
 *
 * Data flow (all best-effort, never breaking user flows):
 *   1. Normalize the company identity (dedup key) and resolve its ATS
 *      board (seed entry first, then the verified-board registry).
 *   2. When a board is known, fetch its LIVE postings on every load
 *      (keyless, cheap) — the dashboard always shows the current count.
 *      A failed fetch is "live postings unavailable", never fake jobs.
 *   3. Read the SHARED company cache (`company_research_cache`, keyed by
 *      company + dataset version). This cache is shared across users and
 *      is a different cache from per-user candidate analysis.
 *   4. On miss/expiry (or forced refresh): build a snapshot from live
 *      ATS postings when the board returned roles; otherwise run live
 *      Tavily careers-page research (the path for companies with no ATS
 *      board, including Pakistani companies). On research failure: fall
 *      back to the source-reviewed seed (featured companies only).
 *   5. No seed either → a typed "not researched yet" dashboard state
 *      with a research action, never an error and never invented data.
 *   6. Match the candidate's evidence against the company's requirements
 *      with the deterministic matcher.
 *
 * Provenance: every dashboard section carries its source (URL +
 * retrieved date) or an explicit `unverified` badge — never presented
 * as fact without it. Seed snapshots carry NO retrieved date (the
 * dataset has none on file); only real research runs stamp one.
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
  aggregateRequirementFrequency,
  CompanyResearchError,
  type CompanyResearch,
} from "./research";
import { seedSnapshot, seedRequirements, SEED_SOURCE_LABEL } from "./seed";
import {
  atsBoardPageUrl,
  createAtsProvider,
  resolveAtsBoard,
  AtsProviderError,
  type AtsBoard,
} from "../jobs/ats-providers";
import type { NormalizedJobPosting } from "../jobs/providers";

type Client = SupabaseClient<Database>;
type AnyClient = SupabaseClient<any>;

type DashboardProvenanceBase = {
  sourceLabel: string;
  expiresAt: string | null;
  fromCache: boolean;
  sources: { url: string; label: string; retrievedAt: string | null }[];
  /** Present only for seed origin: what source review removed. */
  sourceReviewNote?: string;
};

/**
 * Provenance is a discriminated union so the type system enforces the
 * honesty rule: a researched profile ALWAYS carries its research date,
 * a seed or unavailable profile NEVER does (there is no date on file).
 * Consumers that narrow on `origin === "researched"` get a guaranteed
 * string `retrievedAt`; every other branch gets null.
 */
export type DashboardProvenance =
  | (DashboardProvenanceBase & {
      /** Live ATS board or Tavily careers-page research. */
      origin: "researched";
      verification: "verified";
      /** ISO timestamp of the research run — always present. */
      retrievedAt: string;
    })
  | (DashboardProvenanceBase & {
      /** Static dataset — unverified, no research date on file. */
      origin: "seed";
      verification: "unverified";
      retrievedAt: null;
    })
  | (DashboardProvenanceBase & {
      /** No researched profile exists yet. */
      origin: "unavailable";
      verification: "unverified";
      retrievedAt: null;
    });

export type CompanySkill = {
  skillName: string;
  importance: "must_have" | "preferred";
  frequencyCount: number;
  shareOfPostings: number | null;
};

/**
 * Live ATS postings for the company, fetched fresh on every dashboard
 * load when a verified board is known. `available: false` means the
 * board could not be read right now (error carries the reason) — the
 * snapshot below is unaffected. `board: null` means the company has no
 * verifiable ATS board and uses Tavily research instead.
 */
export type LivePostingsState = {
  board: AtsBoard | null;
  /** Human-facing board page URL, or null when there is no board. */
  boardUrl: string | null;
  available: boolean;
  retrievedAt: string | null;
  postings: NormalizedJobPosting[];
  error: string | null;
};

export type CompanyDashboard = {
  /**
   * "researched" = live research snapshot; "seed" = unverified static
   * dataset; "not_researched" = no profile exists yet (research action
   * available). The UI branches on this, never on thrown errors.
   */
  status: "researched" | "seed" | "not_researched";
  company: {
    displayName: string;
    category: string | null;
    location: string | null;
    tier: string | null;
    tagline: string | null;
    domain: string | null;
    careersUrl: string | null;
    atsBoard: AtsBoard | null;
  };
  provenance: DashboardProvenance;
  /** Live ATS postings (only when the company has a verified board). */
  livePostings: LivePostingsState;
  /** Why the last research attempt failed, when it did (shown in the
   *  not-researched state so the user knows it was tried). */
  researchError: string | null;
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
  jobLinks: { url: string; label: string; retrievedAt: string | null }[];
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

type SnapshotPayloadBase = {
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
  sources: { url: string; label: string }[];
  sourceReviewNote?: string;
};

/** A researched snapshot ALWAYS carries its research date. */
type ResearchedSnapshotPayload = SnapshotPayloadBase & {
  origin: "researched";
  retrievedAt: string;
  /** True when this snapshot was built from live ATS postings. */
  atsSnapshot?: boolean;
};

/** A seed snapshot NEVER carries a research date (none on file). */
type SeedSnapshotPayload = SnapshotPayloadBase & {
  origin: "seed";
  retrievedAt: null;
};

type SnapshotPayload = ResearchedSnapshotPayload | SeedSnapshotPayload;

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

/**
 * Build a snapshot from LIVE ATS postings. Roles come from posting
 * titles; requirement frequencies are counted deterministically from
 * posting descriptions (Greenhouse list responses carry no description,
 * so those snapshots honestly have no requirement frequencies — the
 * roles and live postings are still real). Only used when the board
 * returned at least one posting.
 */
function payloadFromAtsPostings(
  board: AtsBoard,
  companyName: string,
  postings: NormalizedJobPosting[],
  retrievedAt: string,
): SnapshotPayload {
  const descriptions = postings
    .map((p) => p.description)
    .filter((d): d is string => typeof d === "string" && d.trim().length > 0);
  const requirements = aggregateRequirementFrequency(descriptions);
  const boardUrl = atsBoardPageUrl(board);
  const providerLabel =
    board.provider === "greenhouse"
      ? "Greenhouse"
      : board.provider === "lever"
        ? "Lever"
        : "Ashby";
  return {
    origin: "researched",
    displayName: companyName,
    category: null,
    location: null,
    tier: null,
    tagline: null,
    domain: null,
    careersUrl: boardUrl,
    hiringAreas: [...new Set(postings.map((p) => p.title))].slice(0, 25),
    techSignals: requirements.slice(0, 12).map((r) => r.skillName),
    skills: requirements.map((r) => ({
      skillName: r.skillName,
      importance:
        r.shareOfPostings >= 0.5
          ? ("must_have" as const)
          : ("preferred" as const),
      frequencyCount: r.frequencyCount,
      shareOfPostings: r.shareOfPostings,
    })),
    jobLinks: postings
      .filter((p) => p.url)
      .slice(0, 10)
      .map((p) => ({ url: p.url as string, label: p.title })),
    retrievedAt,
    sources: [
      {
        url: boardUrl,
        label: `${providerLabel} job board — ${postings.length} live postings`,
      },
    ],
    atsSnapshot: true,
  };
}

function payloadFromSeed(companyName: string): SnapshotPayload | null {
  // matchCompanyTruth returns null for companies outside the 8 featured
  // entries (the fabrication branch was deleted in the 2026-11-20
  // rebuild). There is no seed for such a company, so the honest
  // outcome is null — the caller returns the typed "not researched yet"
  // dashboard state, never an invented profile and never a throw.
  const truth = matchCompanyTruth(companyName);
  if (!truth) return null;
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
    // The seed dataset has no research date on file — null, not "now".
    // Stamping today here would present unverified data as fresh.
    retrievedAt: null,
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
 * failures fall back to the source-reviewed seed, and when there is no
 * seed either the result is the typed "not researched yet" state with a
 * research action. Alignment is null (with a note) when the candidate
 * has no evidence yet.
 *
 * `forceRefresh` skips the shared-cache read and re-runs live research
 * (ATS board, then Tavily) — the "research this company" action.
 */
export async function getCompanyDashboard(
  supabase: Client,
  userId: string,
  companyName: string,
  opts?: { forceRefresh?: boolean },
): Promise<CompanyDashboard> {
  const db = supabase as unknown as AnyClient;
  const { normalizedName, domain } = companyIdentity(companyName);
  const cacheKey = companyResearchCacheKey(companyName, domain);
  const forceRefresh = opts?.forceRefresh === true;

  // 0. Resolve the company's ATS board: the seed entry's board first,
  //    then the verified-board registry. Null = Tavily research path.
  const seedTruth = matchCompanyTruth(companyName);
  const atsBoard: AtsBoard | null =
    seedTruth?.atsBoard ?? resolveAtsBoard(companyName);

  // 1. Live ATS postings, fresh on every load when a board is known.
  //    Independent of the snapshot cache — posting counts go stale fast.
  //    A failed fetch is recorded, never fatal.
  let livePostings: LivePostingsState = {
    board: atsBoard,
    boardUrl: atsBoard ? atsBoardPageUrl(atsBoard) : null,
    available: false,
    retrievedAt: null,
    postings: [],
    error: null,
  };
  if (atsBoard) {
    try {
      const provider = createAtsProvider(atsBoard, companyName);
      const postings = await provider.fetchBoardPostings(50);
      livePostings = {
        board: atsBoard,
        boardUrl: atsBoardPageUrl(atsBoard),
        available: true,
        retrievedAt: new Date().toISOString(),
        postings,
        error: null,
      };
    } catch (error) {
      const message =
        error instanceof AtsProviderError
          ? error.message
          : "Live postings unavailable right now.";
      console.warn("[CareerPilot][company] ATS board fetch failed", {
        companyName,
        provider: atsBoard.provider,
        error: message,
      });
      livePostings = { ...livePostings, available: false, error: message };
    }
  }

  // 2. Shared company cache (skipped on forced refresh).
  let payload: SnapshotPayload | null = null;
  let fromCache = false;
  let expiresAt: string | null = null;

  if (!forceRefresh) {
    const cached = await readSharedCache(db, cacheKey);
    if (cached && isSnapshotPayload(cached.payload)) {
      payload = cached.payload;
      fromCache = true;
      expiresAt = cached.expiresAt;
    }
  }

  // 3. Miss → build a fresh snapshot: live ATS postings first (when the
  //    board returned roles), then Tavily careers-page research, then
  //    the source-reviewed seed. Nothing left → not-researched state.
  let researchError: string | null = null;
  if (!payload) {
    if (livePostings.available && livePostings.postings.length > 0) {
      payload = payloadFromAtsPostings(
        atsBoard as AtsBoard,
        companyName,
        livePostings.postings,
        livePostings.retrievedAt as string,
      );
      await writeSharedCache(db, cacheKey, null, payload);
    } else {
      try {
        const research = await researchCompany(companyName, domain);
        payload = payloadFromResearch(research);
        await writeSharedCache(db, cacheKey, null, payload);
      } catch (error) {
        researchError =
          error instanceof CompanyResearchError
            ? error.message
            : "Live research is unavailable right now.";
        console.warn(
          "[CareerPilot][company] live research failed, using seed fallback",
          { companyName, error: researchError },
        );
        payload = payloadFromSeed(companyName);
        if (payload) {
          await writeSharedCache(db, cacheKey, null, payload);
        }
      }
    }
  }

  // 4. Candidate alignment (private per-user evidence — never cached in
  //    the shared company cache). Skipped for the not-researched state:
  //    there are no requirements to align against yet.
  let alignment: CoverageReport | null = null;
  let alignmentNote: string | null = null;
  let bestProjects: CompanyDashboard["bestProjects"] = [];
  if (payload) {
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
  }

  // 5. Not researched yet: no snapshot, no seed — a typed state with the
  //    research action, not an error. (Not cached: the next attempt may
  //    succeed.)
  if (!payload) {
    return {
      status: "not_researched",
      company: {
        displayName: companyName,
        category: null,
        location: null,
        tier: null,
        tagline: null,
        domain: domain,
        careersUrl: livePostings.boardUrl,
        atsBoard,
      },
      provenance: {
        origin: "unavailable",
        verification: "unverified",
        sourceLabel: "No researched profile yet",
        retrievedAt: null,
        expiresAt: null,
        fromCache: false,
        sources: [],
      },
      livePostings,
      researchError,
      hiringAreas: [],
      commonSkills: [],
      techSignals: [],
      alignment: null,
      alignmentNote:
        "Research this company first — alignment needs its hiring requirements.",
      bestProjects: [],
      jobLinks: [],
    };
  }

  // Provenance branches on the snapshot origin so the discriminated
  // union holds: researched snapshots always carry their date, seed
  // snapshots never do.
  const provenance: DashboardProvenance =
    payload.origin === "researched"
      ? {
          origin: "researched",
          verification: "verified",
          sourceLabel: payload.atsSnapshot
            ? "Live ATS job board"
            : "Live careers-page research",
          retrievedAt: payload.retrievedAt,
          expiresAt,
          fromCache,
          sources: payload.sources.map((s) => ({
            ...s,
            retrievedAt: payload.retrievedAt,
          })),
          ...(payload.sourceReviewNote
            ? { sourceReviewNote: payload.sourceReviewNote }
            : {}),
        }
      : {
          origin: "seed",
          verification: "unverified",
          sourceLabel: SEED_SOURCE_LABEL,
          retrievedAt: null,
          expiresAt,
          fromCache,
          sources: payload.sources.map((s) => ({
            ...s,
            retrievedAt: null,
          })),
          ...(payload.sourceReviewNote
            ? { sourceReviewNote: payload.sourceReviewNote }
            : {}),
        };

  return {
    status: payload.origin === "researched" ? "researched" : "seed",
    company: {
      displayName: payload.displayName,
      category: payload.category,
      location: payload.location,
      tier: payload.tier,
      tagline: payload.tagline,
      domain: payload.domain,
      careersUrl: payload.careersUrl,
      atsBoard,
    },
    provenance,
    livePostings,
    researchError,
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
  if (typeof v["displayName"] !== "string") return false;
  if (!Array.isArray(v["skills"]) || !Array.isArray(v["hiringAreas"]))
    return false;
  // The discriminated union is enforced at the cache boundary too:
  // researched snapshots must carry a real research date, seed
  // snapshots must not (a date on a seed would be a fabrication stamp,
  // and v1 cached seeds did exactly that — they fail here and are
  // re-researched).
  if (v["origin"] === "researched")
    return typeof v["retrievedAt"] === "string";
  if (v["origin"] === "seed")
    return v["retrievedAt"] === null || v["retrievedAt"] === undefined;
  return false;
}
