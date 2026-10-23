/* ------------------------------------------------------------------ *
 * Market fit — compares recorded evidence against researched expectations
 *
 * Shared by Job Mirror and the Diagnostic so both features apply exactly
 * the same rules about what counts as proof. Duplicating these rules is
 * how the two screens would start contradicting each other.
 *
 * Pure module: no server imports, no environment, no side effects.
 * ------------------------------------------------------------------ */

import {
  MARKET_TRUTH_VERSION,
  matchRoleProfile,
  type RoleTruthProfile,
  type SkillRequirement,
} from "@/data/market-truth";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Where a skill sits in the market's expectations for a role. */
export type SkillTier = "must-have" | "tool" | "differentiator";

/**
 * How well the student can back a skill.
 *  - demonstrated: a project or GitHub repo proves it
 *  - claimed:      recorded, but only as a claim / resume line
 *  - missing:      not recorded at all
 */
export type SkillStatus = "demonstrated" | "claimed" | "missing";

export type MirrorCitation = { label: string; url: string | null };

export type MirrorSkill = {
  skill: string;
  tier: SkillTier;
  /** The research report's qualifier, e.g. "Required by 71% of job postings". */
  note: string | null;
  citation: MirrorCitation | null;
  status: SkillStatus;
  /** Which of the student's own records backs this, when any does. */
  matchedRecord: string | null;
};

export type TierCoverage = { covered: number; total: number; pct: number };

/**
 * Minimal shape this module needs from a recorded skill. `CareerState`'s
 * `StateSkill` satisfies it structurally.
 */
export type EvidenceRecord = { name: string; sources: readonly string[]; strength?: number };

/** The deterministic market comparison persisted with a diagnosis. */
export type MarketBenchmark = {
  roleId: string;
  displayName: string;
  matchedBy: "alias" | "keywords" | "fallback";
  /** True when the target role is outside the researched roles. */
  isFallback: boolean;
  mustHave: TierCoverage;
  /** Non-negotiables the student cannot currently prove. */
  unprovenMustHaves: string[];
  /** Non-negotiables recorded as claims with no project or repo behind them. */
  claimedOnlyMustHaves: string[];
  datasetVersion: string;
};

/* ------------------------------------------------------------------ */
/* Skill name matching — conservative by design                        */
/* ------------------------------------------------------------------ */

/** Lowercase, drop punctuation, collapse whitespace. */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Words that describe depth rather than a technology. */
const FILLER_WORDS = new Set([
  "fundamentals",
  "basics",
  "proficiency",
  "and",
  "with",
  "or",
  "the",
  "a",
  "an",
  "using",
  "knowledge",
  "experience",
]);

/**
 * Split a dataset skill label into the skills it actually covers, so
 * "HTML/CSS fundamentals" can be satisfied by a student who recorded
 * "HTML" and "CSS", and "Jest + React Testing Library" by either.
 */
export function skillAliases(label: string): string[] {
  const withoutParens = label.replace(/\([^)]*\)/g, " ");
  const parts = withoutParens
    .split(/[/+,—–-]| and | or /i)
    .map((part) => normalise(part))
    .map((part) =>
      part
        .split(" ")
        .filter((word) => !FILLER_WORDS.has(word))
        .join(" "),
    )
    .filter((part) => part.length >= 2);

  const whole = normalise(withoutParens);
  return [...new Set([whole, ...parts])].filter((part) => part.length >= 2);
}

/**
 * Does a recorded skill satisfy this alias?
 *
 * Deliberately strict: exact match, or whole-word phrase containment in
 * either direction. No stemming, no fuzzy distance. Over-claiming
 * coverage is the failure mode this module exists to remove, so an
 * uncertain match counts as *not* covered.
 */
export function satisfies(recordedSkill: string, alias: string): boolean {
  const recorded = normalise(recordedSkill);
  if (recorded.length < 2 || alias.length < 2) return false;
  if (recorded === alias) return true;
  return ` ${recorded} `.includes(` ${alias} `) || ` ${alias} `.includes(` ${recorded} `);
}

/** Only a project or repo counts as proof; everything else is a claim. */
export function statusFor(record: EvidenceRecord): Exclude<SkillStatus, "missing"> {
  const proven =
    (record.strength ?? 0) >= 3 &&
    record.sources.some((source) => source === "project" || source === "github");
  return proven ? "demonstrated" : "claimed";
}

function describeRecord(record: EvidenceRecord): string {
  const sources = [...new Set(record.sources)].join(", ");
  return sources ? `${record.name} (${sources})` : record.name;
}

/* ------------------------------------------------------------------ */
/* Requirement resolution                                              */
/* ------------------------------------------------------------------ */

/**
 * Resolve one market expectation against recorded skills, preferring the
 * strongest evidence when several records match.
 */
export function resolveRequirement(
  requirement: SkillRequirement,
  tier: SkillTier,
  records: readonly EvidenceRecord[],
  toCitation: (source: SkillRequirement["source"]) => MirrorCitation | null,
): MirrorSkill {
  const aliases = skillAliases(requirement.skill);

  let best: { record: EvidenceRecord; status: Exclude<SkillStatus, "missing"> } | null = null;
  for (const record of records) {
    if (!aliases.some((alias) => satisfies(record.name, alias))) continue;
    const status = statusFor(record);
    if (!best || (status === "demonstrated" && best.status === "claimed")) {
      best = { record, status };
    }
  }

  return {
    skill: requirement.skill,
    tier,
    note: requirement.note,
    citation: toCitation(requirement.source),
    status: best ? best.status : "missing",
    matchedRecord: best ? describeRecord(best.record) : null,
  };
}

export function coverageOf(skills: readonly MirrorSkill[], tier: SkillTier): TierCoverage {
  const inTier = skills.filter((entry) => entry.tier === tier);
  const covered = inTier.filter((entry) => entry.status === "demonstrated").length;
  const total = inTier.length;
  return { covered, total, pct: total === 0 ? 0 : Math.round((covered / total) * 100) };
}

/* ------------------------------------------------------------------ */
/* Benchmark                                                           */
/* ------------------------------------------------------------------ */

/** Resolve must-have status without needing citation plumbing. */
function mustHaveStatuses(
  profile: RoleTruthProfile,
  records: readonly EvidenceRecord[],
): MirrorSkill[] {
  return profile.mustHaveSkills.map((requirement) =>
    resolveRequirement(requirement, "must-have", records, () => null),
  );
}

/**
 * Deterministic answer to "is this student competitive for this role yet?"
 *
 * Depends only on the researched dataset and the student's own records —
 * no model involvement, so the number never drifts between runs.
 */
export function benchmarkRole(
  targetRole: string,
  records: readonly EvidenceRecord[],
): MarketBenchmark {
  const match = matchRoleProfile(targetRole);
  const mustHaves = mustHaveStatuses(match.profile, records);

  return {
    roleId: match.roleId,
    displayName: match.profile.displayName,
    matchedBy: match.matchedBy,
    isFallback: match.isFallback,
    mustHave: coverageOf(mustHaves, "must-have"),
    unprovenMustHaves: mustHaves
      .filter((skill) => skill.status !== "demonstrated")
      .map((skill) => skill.skill),
    claimedOnlyMustHaves: mustHaves
      .filter((skill) => skill.status === "claimed")
      .map((skill) => skill.skill),
    datasetVersion: MARKET_TRUTH_VERSION,
  };
}
