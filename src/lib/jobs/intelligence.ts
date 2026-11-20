/**
 * Job intelligence server — Phase 5 job matching.
 *
 * Deterministic, per job+user analysis over the Phase 3 job tables:
 *  - `analyzeJobPosting`: candidate-vs-job gap via evidence/matching.ts,
 *    persisted to `job_snapshots` (the per job+user cache — structurally
 *    separate from Phase 4's shared company cache, which has no user
 *    dimension at all).
 *  - `getPostingDeepDive`: one stored posting with its extracted
 *    requirements, provenance, and URL validation.
 *  - `getCompanyPostingFrequency`: requirement frequency across the
 *    user's stored postings for one company (real stored rows only).
 *  - `getThreeWayComparison`: candidate vs company requirements vs the
 *    specific posting's requirements.
 *  - `validateJobUrl`: official-domain preference + broken-link
 *    detection, backed by the shared `job_link_checks` table.
 *
 * Best-effort by contract (Phase 2/3/4 pattern): cache/snapshot I/O
 * failures are logged and never break the analysis — the deterministic
 * result is always returned. Nothing here invents data.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { FEATURED_COMPANIES, matchCompanyTruth } from "@/data/company-truth";
import {
  computeCoverage,
  type CoverageReport,
  type EvidenceInput,
  type RequirementImportance,
  type RequirementInput,
} from "../evidence/matching";
import type { GapLevel } from "../evidence/schemas";
import { normalizeSkill } from "../evidence/skill-aliases";
import { companyIdentity } from "../companies/normalization";
import { seedRequirements } from "../companies/seed";
import {
  aggregateSkillFrequency,
  jobCoverageReport,
  type JobCoverageReport,
  type MarketAggregation,
} from "./coverage";
import {
  checkLink,
  classifyLink,
  LINK_CHECK_TTL_MS,
  normalizeUrl,
  urlHash,
} from "./urls";

/** Any client works — the new tables are not in the generated types yet. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>;

/** Snapshot TTL: a per job+user analysis is trusted for 30 days. */
export const JOB_SNAPSHOT_TTL_DAYS = 30;
/** Dataset version stamped on snapshots (bump when the format changes). */
export const JOB_DATASET_VERSION = "v1";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type StoredJob = {
  id: string;
  title: string;
  company: string | null;
  url: string | null;
  locationCountry: string | null;
  locationCity: string | null;
  remoteType: string;
  publishedAt: string | null;
  retrievedAt: string;
  expiresAt: string;
  sourceName: string | null;
};

export type StoredJobRequirement = {
  skill: string;
  importance: RequirementImportance;
  sourceText: string | null;
};

export type JobAnalysis = {
  job: StoredJob;
  report: JobCoverageReport;
  requirementsHash: string;
  /** True when the result came from a fresh `job_snapshots` row. */
  fromCache: boolean;
  snapshotAt: string;
  datasetVersion: string;
};

export type LinkValidation = {
  url: string | null;
  normalizedUrl: string | null;
  kind: "official" | "aggregator" | "unknown";
  host: string | null;
  /** Null = never checked (no URL, or the check was unavailable). */
  reachable: boolean | null;
  httpStatus: number | null;
  finalUrl: string | null;
  checkedAt: string | null;
  fromCache: boolean;
  expiresAt: string | null;
};

export type PostingDeepDive = {
  job: StoredJob;
  provenance: {
    sourceName: string | null;
    publishedAt: string | null;
    retrievedAt: string;
    expiresAt: string;
    url: string | null;
  };
  requirements: StoredJobRequirement[];
  analysis: JobAnalysis;
  link: LinkValidation;
};

export type CompanyPostingFrequency = {
  company: string;
  aggregation: MarketAggregation;
  retrievedAt: string;
  /** Distinct posting URLs that contributed (provenance). */
  postingUrls: string[];
};

export type ThreeWayRow = {
  skill: string;
  postingImportance: RequirementImportance | null;
  companyImportance: RequirementImportance | null;
  candidateLevel: GapLevel;
  candidateReason: string;
};

export type ThreeWayComparison = {
  jobTitle: string;
  company: string | null;
  posting: {
    requirementCount: number;
    coverage: CoverageReport;
    provenance: "stored-posting";
  };
  companySide: {
    requirementCount: number;
    coverage: CoverageReport | null;
    provenance:
      | { origin: "company-table"; verification: "verified" }
      | { origin: "seed"; verification: "unverified" }
      | { origin: "none" };
    note: string | null;
  };
  rows: ThreeWayRow[];
};

/* ------------------------------------------------------------------ */
/* Pure helpers (unit-tested)                                           */
/* ------------------------------------------------------------------ */

/**
 * The cache identity for a per job+user analysis. This is what keeps
 * candidate analyses out of Phase 4's shared company cache: the company
 * cache key is `company_research:v1:<normalized>:<domain>` (no user
 * dimension), while a job analysis is always addressed by the
 * (userId, jobId) pair. The two can never collide.
 */
export function jobSnapshotIdentity(userId: string, jobId: string): string {
  return `job_snapshot:v1:${userId}:${jobId}`;
}

/**
 * Deterministic hash over a posting's structured requirements.
 * Canonicalizes skills first ("postgres" and "PostgreSQL" hash the
 * same) and sorts, so requirement order never invalidates a snapshot.
 */
export function requirementsHash(requirements: RequirementInput[]): string {
  const parts = requirements
    .map((r) => {
      const normalized = normalizeSkill(r.skill);
      return `${normalized.canonical}|${r.importance}`;
    })
    .filter((p) => !p.startsWith("Unknown|"))
    .sort();
  const canonical = parts.join("\u0000");
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < canonical.length; i++) {
    const ch = canonical.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h2 >>> 0).toString(16).padStart(8, "0") +
    (h1 >>> 0).toString(16).padStart(8, "0")
  );
}

/**
 * Assemble the three-way skill table: every canonical skill from either
 * side, with the posting's importance, the company's importance, and
 * the candidate's deterministic classification against the posting.
 * Pure — the I/O wrappers supply the inputs.
 */
export function buildThreeWayRows(
  postingRequirements: RequirementInput[],
  companyRequirements: RequirementInput[],
  postingCoverage: CoverageReport,
): ThreeWayRow[] {
  const levelBySkill = new Map<string, { level: GapLevel; reason: string }>();
  for (const c of postingCoverage.classifications) {
    levelBySkill.set(c.skill, { level: c.level, reason: c.reason });
  }
  const postingBySkill = new Map<string, RequirementImportance>();
  for (const r of postingRequirements) {
    postingBySkill.set(normalizeSkill(r.skill).canonical, r.importance);
  }
  const companyBySkill = new Map<string, RequirementImportance>();
  for (const r of companyRequirements) {
    const canonical = normalizeSkill(r.skill).canonical;
    if (canonical === "Unknown") continue;
    const existing = companyBySkill.get(canonical);
    // must_have wins when a skill appears with both importances.
    if (!existing || r.importance === "must_have") {
      companyBySkill.set(canonical, r.importance);
    }
  }

  const skills = new Set<string>([
    ...postingBySkill.keys(),
    ...companyBySkill.keys(),
  ]);
  return [...skills]
    .sort((a, b) => a.localeCompare(b))
    .map((skill) => {
      const candidate = levelBySkill.get(skill);
      return {
        skill,
        postingImportance: postingBySkill.get(skill) ?? null,
        companyImportance: companyBySkill.get(skill) ?? null,
        candidateLevel: candidate?.level ?? "MISSING",
        candidateReason: candidate?.reason ?? `No evidence found for ${skill}.`,
      };
    });
}

/* ------------------------------------------------------------------ */
/* Loaders                                                              */
/* ------------------------------------------------------------------ */

function toStoredJob(row: any): StoredJob {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    company: (row.company as string | null) ?? null,
    url: (row.url as string | null) ?? null,
    locationCountry: (row.location_country as string | null) ?? null,
    locationCity: (row.location_city as string | null) ?? null,
    remoteType: String(row.remote_type ?? "unknown"),
    publishedAt: (row.published_at as string | null) ?? null,
    retrievedAt: String(row.retrieved_at ?? ""),
    expiresAt: String(row.expires_at ?? ""),
    sourceName: (row.job_sources?.name as string | null) ?? null,
  };
}

async function loadStoredJob(
  db: AnyClient,
  userId: string,
  jobId: string,
): Promise<StoredJob | null> {
  const { data, error } = await db
    .from("jobs")
    .select(
      "id, title, company, url, location_country, location_city, remote_type, published_at, retrieved_at, expires_at, job_sources(name)",
    )
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) {
    if (error) {
      console.warn("[CareerPilot][job-intel] job load failed", {
        jobId,
        error: error.message,
      });
    }
    return null;
  }
  return toStoredJob(data);
}

async function loadJobRequirements(
  db: AnyClient,
  jobId: string,
): Promise<StoredJobRequirement[]> {
  const { data, error } = await db
    .from("job_requirements")
    .select("skill, importance, source_text")
    .eq("job_id", jobId);
  if (error || !data) {
    if (error) {
      console.warn("[CareerPilot][job-intel] requirements load failed", {
        jobId,
        error: error.message,
      });
    }
    return [];
  }
  return (data as any[]).map((r) => ({
    skill: String(r.skill ?? ""),
    importance:
      r.importance === "must_have"
        ? ("must_have" as const)
        : ("preferred" as const),
    sourceText: (r.source_text as string | null) ?? null,
  }));
}

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

/* ------------------------------------------------------------------ */
/* 1. Flight Plan extension: deterministic per job+user analysis        */
/* ------------------------------------------------------------------ */

type SnapshotRow = {
  coverage: unknown;
  requirements_hash: string | null;
  expires_at: string | null;
  created_at: string;
};

async function readSnapshot(
  db: AnyClient,
  userId: string,
  jobId: string,
): Promise<SnapshotRow | null> {
  try {
    const { data, error } = await db
      .from("job_snapshots")
      .select("coverage, requirements_hash, expires_at, created_at")
      .eq("user_id", userId)
      .eq("job_id", jobId)
      .maybeSingle();
    if (error || !data) return null;
    return data as SnapshotRow;
  } catch (error) {
    // Table may not exist yet (migration not applied) — log, don't break.
    console.warn(
      "[CareerPilot][job-intel] snapshot read failed (best-effort)",
      {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      },
    );
    return null;
  }
}

async function writeSnapshot(
  db: AnyClient,
  userId: string,
  job: StoredJob,
  report: JobCoverageReport,
  hash: string,
): Promise<void> {
  try {
    const { error } = await db.from("job_snapshots").upsert(
      {
        user_id: userId,
        job_id: job.id,
        target_role: job.title,
        location:
          [job.locationCity, job.locationCountry].filter(Boolean).join(", ") ||
          null,
        coverage: report.coverage,
        requirements_hash: hash,
        dataset_version: JOB_DATASET_VERSION,
        expires_at: new Date(
          Date.now() + JOB_SNAPSHOT_TTL_DAYS * 86400_000,
        ).toISOString(),
      },
      { onConflict: "user_id,job_id" },
    );
    if (error) {
      console.warn("[CareerPilot][job-intel] snapshot write skipped", {
        jobId: job.id,
        error: error.message,
      });
    }
  } catch (error) {
    console.warn(
      "[CareerPilot][job-intel] snapshot write failed (best-effort)",
      {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }
}

function isCoverageReport(value: unknown): value is CoverageReport {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["coveragePct"] === "number" && Array.isArray(v["classifications"])
  );
}

/**
 * Deterministic candidate-vs-job gap for one stored posting, persisted
 * to `job_snapshots` (per user+job). A fresh snapshot with a matching
 * requirements hash is returned from cache; anything else recomputes.
 * Snapshot I/O never breaks the analysis.
 */
export async function analyzeJobPosting(
  db: AnyClient,
  userId: string,
  jobId: string,
): Promise<JobAnalysis> {
  const job = await loadStoredJob(db, userId, jobId);
  if (!job) throw new Error("That posting wasn't found in your saved jobs.");

  const requirements = await loadJobRequirements(db, jobId);
  const hash = requirementsHash(requirements);
  const now = new Date().toISOString();

  const snapshot = await readSnapshot(db, userId, jobId);
  if (
    snapshot &&
    snapshot.requirements_hash === hash &&
    snapshot.expires_at &&
    snapshot.expires_at > now &&
    isCoverageReport(snapshot.coverage)
  ) {
    return {
      job,
      report: {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        jobUrl: job.url,
        coverage: snapshot.coverage,
      },
      requirementsHash: hash,
      fromCache: true,
      snapshotAt: snapshot.created_at,
      datasetVersion: JOB_DATASET_VERSION,
    };
  }

  const evidence = await loadCandidateEvidence(db, userId);
  const report = jobCoverageReport(
    {
      id: job.id,
      title: job.title,
      company: job.company,
      url: job.url,
      requirements,
    },
    evidence,
  );
  await writeSnapshot(db, userId, job, report, hash);
  return {
    job,
    report,
    requirementsHash: hash,
    fromCache: false,
    snapshotAt: new Date().toISOString(),
    datasetVersion: JOB_DATASET_VERSION,
  };
}

/** Stored jobs for pickers/lists, newest first. */
export async function getStoredJobs(
  db: AnyClient,
  userId: string,
): Promise<StoredJob[]> {
  const { data, error } = await db
    .from("jobs")
    .select(
      "id, title, company, url, location_country, location_city, remote_type, published_at, retrieved_at, expires_at, job_sources(name)",
    )
    .eq("user_id", userId)
    .order("retrieved_at", { ascending: false })
    .limit(50);
  if (error || !data) {
    if (error) {
      console.warn("[CareerPilot][job-intel] stored-jobs load failed", {
        error: error.message,
      });
    }
    return [];
  }
  return (data as any[]).map(toStoredJob);
}

export type StoredJobWithCoverage = StoredJob & {
  /** Null when no fresh snapshot exists for this job yet. */
  coveragePct: number | null;
  snapshotFresh: boolean;
};

/**
 * Stored jobs annotated with their cached deterministic coverage.
 * Powers the Flight Plan "saved postings" section without N+1 analysis
 * calls — coverage appears where a fresh snapshot already exists.
 */
export async function getStoredJobsWithCoverage(
  db: AnyClient,
  userId: string,
): Promise<StoredJobWithCoverage[]> {
  const jobs = await getStoredJobs(db, userId);
  if (jobs.length === 0) return [];
  const now = new Date().toISOString();
  let snapshots: any[] = [];
  try {
    const { data, error } = await db
      .from("job_snapshots")
      .select("job_id, coverage, requirements_hash, expires_at")
      .eq("user_id", userId)
      .in(
        "job_id",
        jobs.map((j) => j.id),
      );
    if (!error && data) snapshots = data as any[];
  } catch (error) {
    console.warn("[CareerPilot][job-intel] snapshot batch read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  const byJob = new Map<string, any>();
  for (const s of snapshots) byJob.set(String(s.job_id), s);

  // Recompute requirement hashes per job to check freshness honestly.
  const result: StoredJobWithCoverage[] = [];
  for (const job of jobs) {
    const snap = byJob.get(job.id);
    let coveragePct: number | null = null;
    let snapshotFresh = false;
    if (snap && isCoverageReport(snap.coverage)) {
      const requirements = await loadJobRequirements(db, job.id);
      const hash = requirementsHash(requirements);
      snapshotFresh =
        snap.requirements_hash === hash &&
        !!snap.expires_at &&
        snap.expires_at > now;
      if (snapshotFresh) coveragePct = snap.coverage.coveragePct;
    }
    result.push({ ...job, coveragePct, snapshotFresh });
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* 3. Application URL validation                                        */
/* ------------------------------------------------------------------ */

const UNKNOWN_LINK: LinkValidation = {
  url: null,
  normalizedUrl: null,
  kind: "unknown",
  host: null,
  reachable: null,
  httpStatus: null,
  finalUrl: null,
  checkedAt: null,
  fromCache: false,
  expiresAt: null,
};

/** Best-effort official domain for a company (companies table, else null). */
async function resolveCompanyDomain(
  db: AnyClient,
  company: string | null,
): Promise<string | null> {
  if (!company) return null;
  try {
    const { normalizedName } = companyIdentity(company);
    const { data, error } = await db
      .from("companies")
      .select("domain")
      .eq("normalized_name", normalizedName)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return (data as { domain: string | null }).domain ?? null;
  } catch {
    return null;
  }
}

type LinkCheckRow = {
  status: string;
  http_status: number | null;
  final_url: string | null;
  checked_at: string;
  expires_at: string;
};

/**
 * Validate one posting's application URL: official-domain preference
 * plus best-effort broken-link detection. Results are cached in the
 * shared `job_link_checks` table (reachable 7 days, unreachable 24h).
 * Never throws — worst case returns an "unknown / unchecked" verdict.
 */
export async function validateJobUrl(
  db: AnyClient,
  userId: string,
  jobId: string,
): Promise<LinkValidation> {
  try {
    const job = await loadStoredJob(db, userId, jobId);
    if (!job || !job.url) return { ...UNKNOWN_LINK };

    const normalized = normalizeUrl(job.url);
    const hash = urlHash(job.url);
    const companyDomain = await resolveCompanyDomain(db, job.company);
    const classified = classifyLink(job.url, companyDomain);
    const base: LinkValidation = {
      url: job.url,
      normalizedUrl: normalized,
      kind: classified.kind,
      host: classified.host,
      reachable: null,
      httpStatus: null,
      finalUrl: null,
      checkedAt: null,
      fromCache: false,
      expiresAt: null,
    };
    if (!hash) return base;

    // Shared cache read (authenticated reads are allowed).
    try {
      const { data, error } = await db
        .from("job_link_checks")
        .select("status, http_status, final_url, checked_at, expires_at")
        .eq("url_hash", hash)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (!error && data) {
        const row = data as LinkCheckRow;
        return {
          ...base,
          reachable: row.status === "reachable",
          httpStatus: row.http_status,
          finalUrl: row.final_url,
          checkedAt: row.checked_at,
          fromCache: true,
          expiresAt: row.expires_at,
        };
      }
    } catch (error) {
      console.warn("[CareerPilot][job-intel] link-check read failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Live check (best-effort, never throws).
    const check = await checkLink(job.url);
    if (!check) return base;
    const ttlMs = check.reachable
      ? LINK_CHECK_TTL_MS.reachable
      : LINK_CHECK_TTL_MS.unreachable;
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();

    // Best-effort cache write (service-role-only table; user writes log
    // and are skipped — the verdict is still returned).
    try {
      const { error } = await db.from("job_link_checks").upsert(
        {
          url_hash: hash,
          url: normalized ?? job.url,
          status: check.reachable ? "reachable" : "unreachable",
          http_status: check.httpStatus,
          final_url: check.finalUrl,
          checked_at: check.checkedAt,
          expires_at: expiresAt,
        },
        { onConflict: "url_hash" },
      );
      if (error) {
        console.warn("[CareerPilot][job-intel] link-check write skipped", {
          error: error.message,
        });
      }
    } catch (error) {
      console.warn("[CareerPilot][job-intel] link-check write failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      ...base,
      reachable: check.reachable,
      httpStatus: check.httpStatus,
      finalUrl: check.finalUrl,
      checkedAt: check.checkedAt,
      fromCache: false,
      expiresAt,
    };
  } catch (error) {
    console.warn("[CareerPilot][job-intel] URL validation failed", {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...UNKNOWN_LINK };
  }
}

/* ------------------------------------------------------------------ */
/* 2a. Posting deep-dive                                                */
/* ------------------------------------------------------------------ */

/**
 * Deep-dive on one stored posting: its extracted requirements with
 * source citations, provenance (retrieval/published dates, source URL),
 * the deterministic candidate analysis, and the URL validation verdict.
 */
export async function getPostingDeepDive(
  db: AnyClient,
  userId: string,
  jobId: string,
): Promise<PostingDeepDive> {
  const [analysis, link] = await Promise.all([
    analyzeJobPosting(db, userId, jobId),
    validateJobUrl(db, userId, jobId),
  ]);
  const requirements = await loadJobRequirements(db, jobId);
  const job = analysis.job;
  return {
    job,
    provenance: {
      sourceName: job.sourceName,
      publishedAt: job.publishedAt,
      retrievedAt: job.retrievedAt,
      expiresAt: job.expiresAt,
      url: job.url,
    },
    requirements,
    analysis,
    link,
  };
}

/* ------------------------------------------------------------------ */
/* 2b. Requirement frequency across a company's postings                */
/* ------------------------------------------------------------------ */

/**
 * Aggregate requirement frequency across the user's stored postings
 * for one company — real counts from `job_requirements` rows only.
 * Company matching reuses Phase 4's `normalizeCompanyName` so
 * "Systems Limited" and "systems limited." count as one employer.
 */
export async function getCompanyPostingFrequency(
  db: AnyClient,
  userId: string,
  company: string,
): Promise<CompanyPostingFrequency> {
  const retrievedAt = new Date().toISOString();
  const wanted = companyIdentity(company).normalizedName;

  const jobs = await getStoredJobs(db, userId);
  const matching = jobs.filter(
    (j) => j.company && companyIdentity(j.company).normalizedName === wanted,
  );

  const jobsForAggregation: { requirements: RequirementInput[] }[] = [];
  const postingUrls: string[] = [];
  for (const job of matching) {
    const requirements = await loadJobRequirements(db, job.id);
    jobsForAggregation.push({ requirements });
    if (job.url) postingUrls.push(job.url);
  }

  return {
    company,
    aggregation: aggregateSkillFrequency(jobsForAggregation),
    retrievedAt,
    postingUrls,
  };
}

/* ------------------------------------------------------------------ */
/* 2c. Candidate-vs-company-vs-job three-way comparison                 */
/* ------------------------------------------------------------------ */

type CompanySideRequirements = {
  requirements: RequirementInput[];
  provenance:
    | { origin: "company-table"; verification: "verified" }
    | { origin: "seed"; verification: "unverified" }
    | { origin: "none" };
  note: string | null;
};

/**
 * Company-level requirements for the comparison, best source first:
 *  1. `company_requirements` rows (researched/seeded reference data).
 *  2. The source-reviewed seed — only for featured companies. A generic
 *     generated profile is NOT used: inventing a company's requirements
 *     would violate the provenance rule, so unknown companies get an
 *     explicit "no company data" state instead.
 */
async function loadCompanySideRequirements(
  db: AnyClient,
  company: string | null,
): Promise<CompanySideRequirements> {
  const none: CompanySideRequirements = {
    requirements: [],
    provenance: { origin: "none" },
    note: "No company-level requirements found — research the company on the Company page first.",
  };
  if (!company) return none;

  try {
    const { normalizedName } = companyIdentity(company);
    const { data: companyRow } = await db
      .from("companies")
      .select("id")
      .eq("normalized_name", normalizedName)
      .limit(1)
      .maybeSingle();
    const companyId = (companyRow as { id: string } | null)?.id ?? null;
    if (companyId) {
      const { data: reqRows, error } = await db
        .from("company_requirements")
        .select("skill_name, importance")
        .eq("company_id", companyId);
      if (!error && reqRows && (reqRows as any[]).length > 0) {
        return {
          requirements: (reqRows as any[]).map((r) => ({
            skill: String(r.skill_name),
            importance:
              r.importance === "must_have"
                ? ("must_have" as const)
                : ("preferred" as const),
          })),
          provenance: { origin: "company-table", verification: "verified" },
          note: null,
        };
      }
    }
  } catch (error) {
    console.warn("[CareerPilot][job-intel] company-table read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Seed fallback — featured companies only. matchCompanyTruth returns
  // null for unresearched companies (the fabrication branch was deleted
  // in the 2026-11-20 rebuild), so a null result is the explicit
  // "no company data" state, never an invented profile.
  const truth = matchCompanyTruth(company);
  if (!truth) return none;
  const isFeatured = FEATURED_COMPANIES.some((c) => c.id === truth.id);
  if (!isFeatured) return none;
  return {
    requirements: seedRequirements(truth).map((r) => ({
      skill: r.skillName,
      importance: r.importance,
    })),
    provenance: { origin: "seed", verification: "unverified" },
    note: "Company-level requirements come from the static dataset (unverified) — research the company for verified data.",
  };
}

/**
 * Three-way comparison: the candidate's deterministic coverage of the
 * specific posting's requirements, alongside the company's own
 * requirements and the candidate's coverage of those.
 */
export async function getThreeWayComparison(
  db: AnyClient,
  userId: string,
  jobId: string,
): Promise<ThreeWayComparison> {
  const analysis = await analyzeJobPosting(db, userId, jobId);
  const postingRequirements: RequirementInput[] =
    analysis.report.coverage.classifications.map((c) => ({
      skill: c.skill,
      importance: c.importance,
    }));

  const companySide = await loadCompanySideRequirements(
    db,
    analysis.job.company,
  );
  const evidence = await loadCandidateEvidence(db, userId);
  const companyCoverage =
    companySide.requirements.length > 0
      ? computeCoverage(companySide.requirements, evidence)
      : null;

  return {
    jobTitle: analysis.job.title,
    company: analysis.job.company,
    posting: {
      requirementCount: postingRequirements.length,
      coverage: analysis.report.coverage,
      provenance: "stored-posting",
    },
    companySide: {
      requirementCount: companySide.requirements.length,
      coverage: companyCoverage,
      provenance: companySide.provenance,
      note: companySide.note,
    },
    rows: buildThreeWayRows(
      postingRequirements,
      companySide.requirements,
      analysis.report.coverage,
    ),
  };
}
