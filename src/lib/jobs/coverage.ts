/**
 * Job-level coverage and market aggregation — Phase 3.
 *
 * Pure deterministic module:
 *  - per-job coverage: a job's structured requirements matched against the
 *    candidate's evidence via src/lib/evidence/matching.ts (the same
 *    scoring brain as the rest of the platform — no second rulebook).
 *  - market aggregation: real skill-frequency counts computed from stored
 *    job requirements. The numbers come from the database, never from a
 *    model.
 */
import {
  computeCoverage,
  type CoverageReport,
  type EvidenceInput,
  type RequirementInput,
} from "../evidence/matching";
import { normalizeSkill } from "../evidence/skill-aliases";

export type { CoverageReport };

/** Minimal job shape the coverage math needs. */
export type JobForCoverage = {
  id: string;
  title: string;
  company: string | null;
  url: string | null;
  requirements: RequirementInput[];
};

export type JobCoverageReport = {
  jobId: string;
  jobTitle: string;
  company: string | null;
  jobUrl: string | null;
  coverage: CoverageReport;
};

/**
 * Per-job coverage report: how well the candidate's evidence covers one
 * specific posting's requirements. Pure arithmetic via computeCoverage.
 */
export function jobCoverageReport(
  job: JobForCoverage,
  evidence: EvidenceInput[],
): JobCoverageReport {
  return {
    jobId: job.id,
    jobTitle: job.title,
    company: job.company,
    jobUrl: job.url,
    coverage: computeCoverage(job.requirements, evidence),
  };
}

/* ------------------------------------------------------------------ */
/* Market aggregation                                                  */
/* ------------------------------------------------------------------ */

export type SkillFrequency = {
  /** Canonical skill name (skill-aliases taxonomy). */
  skill: string;
  category: string;
  mustHave: number;
  preferred: number;
  /** mustHave + preferred. */
  total: number;
  /** Share of analysed jobs mentioning the skill, 0..1. */
  shareOfJobs: number;
};

export type MarketAggregation = {
  /** Jobs that contributed requirements to this aggregation. */
  jobsAnalysed: number;
  /** Total structured requirements seen. */
  requirementsSeen: number;
  skills: SkillFrequency[];
  aggregatedAt: string;
};

/**
 * Aggregate real skill-frequency counts from stored job requirements.
 * Skills are canonicalized first, so "postgres" and "PostgreSQL" count
 * as one skill. Sorted by total mentions, descending.
 */
export function aggregateSkillFrequency(
  jobs: { requirements: RequirementInput[] }[],
): MarketAggregation {
  const counts = new Map<
    string,
    { category: string; mustHave: number; preferred: number }
  >();
  let requirementsSeen = 0;

  for (const job of jobs) {
    const seenInJob = new Set<string>();
    for (const req of job.requirements) {
      requirementsSeen++;
      const normalized = normalizeSkill(req.skill);
      const canonical = normalized.canonical;
      if (!canonical || canonical === "Unknown") continue;
      // Count each skill once per job for shareOfJobs math.
      if (seenInJob.has(canonical)) continue;
      seenInJob.add(canonical);
      const entry = counts.get(canonical) ?? {
        category: normalized.category,
        mustHave: 0,
        preferred: 0,
      };
      if (req.importance === "must_have") entry.mustHave++;
      else entry.preferred++;
      counts.set(canonical, entry);
    }
  }

  const jobsAnalysed = jobs.length;
  const skills: SkillFrequency[] = [...counts.entries()]
    .map(([skill, entry]) => {
      const total = entry.mustHave + entry.preferred;
      return {
        skill,
        category: entry.category,
        mustHave: entry.mustHave,
        preferred: entry.preferred,
        total,
        shareOfJobs:
          jobsAnalysed === 0
            ? 0
            : Math.round((total / jobsAnalysed) * 100) / 100,
      };
    })
    .sort((a, b) => b.total - a.total || a.skill.localeCompare(b.skill));

  return {
    jobsAnalysed,
    requirementsSeen,
    skills,
    aggregatedAt: new Date().toISOString(),
  };
}
