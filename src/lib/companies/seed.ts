/**
 * Company seed with source review — Phase 4 company intelligence.
 *
 * Migrates the static `company-truth.ts` dataset into `companies` /
 * `company_snapshots` / `company_requirements` seed rows, applying the
 * Phase 4 provenance rule:
 *
 *   - `screeningFilterRate`-style statistics (e.g. "78% rejected before
 *     1st round") have NO cited source in the dataset → they are DROPPED
 *     from the seed. They never reach the database or the UI.
 *   - Every other seeded claim is stored with `verification: "unverified"`
 *     and a source label naming the static dataset, so the UI can badge
 *     it instead of presenting it as researched fact.
 *
 * No invented numbers: anything numeric that isn't a deterministic count
 * derived from the dataset itself is excluded.
 *
 * Pure module: seed-shape builders + the source-review filter. The
 * service-role seeder (server) imports these. Unit-tested.
 */
import type { CompanyHiringTruth } from "@/data/company-truth";
import { companyIdentity } from "./normalization";

/** Source label stamped on every seeded row. */
export const SEED_SOURCE_LABEL =
  "company-truth.ts static dataset (unverified — no cited sources)";

/** Verification status for seeded claims. */
export type SeedVerification = "unverified";

/**
 * Seeded company row shape — maps to `public.companies` + seed metadata.
 * Note: `screeningFilterRate` is intentionally absent.
 */
export type SeedCompany = {
  normalizedName: string;
  domain: string | null;
  displayName: string;
  category: string;
  location: string;
  tier: string;
  tagline: string;
  careersUrl: string | null;
  sourceLabel: string;
  verification: SeedVerification;
};

/**
 * Seeded snapshot shape — maps to `public.company_snapshots` (dataset_version 'seed').
 * The hiring-bar statistics field is dropped by source review.
 */
export type SeedSnapshot = {
  datasetVersion: "seed";
  verification: SeedVerification;
  sourceLabel: string;
  /** Review note: which fields source review removed. */
  sourceReviewNote: string;
  entryRoles: string[];
  primaryStack: string[];
  evaluationStages: string[];
  nonNegotiables: {
    skill: string;
    whyRequired: string;
    level: "Crucial" | "High Priority" | "Differentiator";
  }[];
  rejectionTruths: CompanyHiringTruth["rejectionTruths"];
  projectExpectation: CompanyHiringTruth["projectExpectation"];
  interviewPreparation: CompanyHiringTruth["interviewPreparation"];
};

/** Seeded requirement row — maps to `public.company_requirements`. */
export type SeedRequirement = {
  skillName: string;
  importance: "must_have" | "preferred";
  frequencyCount: number;
  source: "seed";
};

const LEVEL_TO_IMPORTANCE: Record<string, "must_have" | "preferred"> = {
  Crucial: "must_have",
  "High Priority": "preferred",
  Differentiator: "preferred",
};

/**
 * Source review: returns the list of dataset fields that were dropped
 * because they present statistics without a cited source. Used both as
 * documentation and in the snapshot's `sourceReviewNote`.
 */
export function sourceReviewDroppedFields(): string[] {
  return [
    "hiringBar.screeningFilterRate — percentage-style rejection statistics with no cited source (dropped from all 8 seeded companies)",
  ];
}

/** Build the `companies` seed row for one dataset entry. */
export function seedCompany(truth: CompanyHiringTruth): SeedCompany {
  const { normalizedName, domain } = companyIdentity(truth.name);
  return {
    normalizedName,
    domain,
    displayName: truth.name,
    category: truth.category,
    location: truth.location,
    tier: truth.tier,
    tagline: truth.tagline,
    careersUrl: null, // Unknown from the static dataset — research fills this in.
    sourceLabel: SEED_SOURCE_LABEL,
    verification: "unverified",
  };
}

/**
 * Build the versioned snapshot seed for one dataset entry.
 * `screeningFilterRate` is dropped here by source review.
 */
export function seedSnapshot(truth: CompanyHiringTruth): SeedSnapshot {
  return {
    datasetVersion: "seed",
    verification: "unverified",
    sourceLabel: SEED_SOURCE_LABEL,
    sourceReviewNote: `Source review dropped: ${sourceReviewDroppedFields().join("; ")}.`,
    entryRoles: [...truth.entryRoles],
    primaryStack: [...truth.primaryStack],
    evaluationStages: [...truth.hiringBar.evaluationStages],
    nonNegotiables: truth.hiringBar.nonNegotiables.map((n) => ({ ...n })),
    rejectionTruths: truth.rejectionTruths.map((r) => ({ ...r })),
    projectExpectation: {
      ...truth.projectExpectation,
      mustHaveFeatures: [...truth.projectExpectation.mustHaveFeatures],
      unacceptableClones: [...truth.projectExpectation.unacceptableClones],
      recommendedTechStack: [...truth.projectExpectation.recommendedTechStack],
    },
    interviewPreparation: {
      dsaFocus: [...truth.interviewPreparation.dsaFocus],
      coreTheory: [...truth.interviewPreparation.coreTheory],
      behavioralKeys: [...truth.interviewPreparation.behavioralKeys],
    },
  };
}

/**
 * Derive seed requirement rows from a dataset entry: non-negotiable
 * skills (Crucial → must_have) plus the primary stack as preferred
 * signals. Frequency counts start at 1 per company — they are real
 * counts (mentions in the dataset), not invented market statistics.
 */
export function seedRequirements(truth: CompanyHiringTruth): SeedRequirement[] {
  const rows = new Map<string, SeedRequirement>();

  for (const n of truth.hiringBar.nonNegotiables) {
    const skillName = n.skill.trim();
    if (!skillName) continue;
    rows.set(skillName, {
      skillName,
      importance: LEVEL_TO_IMPORTANCE[n.level] ?? "preferred",
      frequencyCount: 1,
      source: "seed",
    });
  }

  for (const stack of truth.primaryStack) {
    const skillName = stack.trim();
    if (!skillName || rows.has(skillName)) continue;
    rows.set(skillName, {
      skillName,
      importance: "preferred",
      frequencyCount: 1,
      source: "seed",
    });
  }

  return [...rows.values()];
}

/** Convenience: build all three seed shapes for a dataset entry. */
export function seedCompanyBundle(truth: CompanyHiringTruth): {
  company: SeedCompany;
  snapshot: SeedSnapshot;
  requirements: SeedRequirement[];
} {
  return {
    company: seedCompany(truth),
    snapshot: seedSnapshot(truth),
    requirements: seedRequirements(truth),
  };
}
