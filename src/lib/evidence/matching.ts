/**
 * Deterministic requirement ↔ evidence matcher (Phase A11).
 *
 * This is the scoring brain. It is PURE: no AI, no I/O, no randomness.
 * The LLM may explain a match, but only this module calculates it.
 *
 * For each requirement it classifies the candidate's evidence into:
 *   PROVEN           strength 3 (verified: deployed, tested, reviewed)
 *   PARTIALLY_PROVEN strength 2 (demonstrated in an artifact)
 *   WEAK_EVIDENCE    strength 1 (listed/named but not demonstrated)
 *   CLAIMED_ONLY     strength 0 (self-reported claim only)
 *   MISSING          no evidence at all
 *   UNCLEAR          evidence exists but is too uncertain to classify
 *
 * Every classification carries a human-readable reason and the evidence IDs
 * behind it, so the UI can show its work (spec §67).
 */
import { normalizeSkill } from "./skill-aliases";
import type { GapLevel } from "./schemas";

export type RequirementImportance = "must_have" | "preferred";

export interface RequirementInput {
  /** Free-text skill, e.g. "Postgres". Normalized internally. */
  skill: string;
  importance: RequirementImportance;
}

export interface EvidenceInput {
  id: string;
  /** Canonical skill key, e.g. "PostgreSQL". */
  skill_key: string;
  /** 0..3 deterministic strength. */
  evidence_strength: number;
  /** 0..1 confidence. */
  confidence: number;
  verification_status: string;
  source_type: string;
}

export interface MatchClassification {
  /** Canonical skill name. */
  skill: string;
  importance: RequirementImportance;
  level: GapLevel;
  reason: string;
  /** IDs of the evidence items behind this classification. */
  evidenceIds: string[];
  /** Strongest evidence strength found (0..3), -1 when none. */
  bestStrength: number;
}

/** Score weight per classification level (for coverage math). */
const LEVEL_WEIGHT: Record<GapLevel, number> = {
  PROVEN: 1,
  PARTIALLY_PROVEN: 0.6,
  WEAK_EVIDENCE: 0.3,
  CLAIMED_ONLY: 0.15,
  UNCLEAR: 0.2,
  MISSING: 0,
};

const IMPORTANCE_WEIGHT: Record<RequirementImportance, number> = {
  must_have: 2,
  preferred: 1,
};

export function classifyRequirement(
  requirement: RequirementInput,
  evidence: EvidenceInput[],
): MatchClassification {
  const normalized = normalizeSkill(requirement.skill);
  const skill = normalized.canonical;
  const relevant = evidence.filter((e) => e.skill_key === skill);
  const evidenceIds = relevant.map((e) => e.id);

  if (relevant.length === 0) {
    return {
      skill,
      importance: requirement.importance,
      level: "MISSING",
      reason: `No evidence found for ${skill}.`,
      evidenceIds,
      bestStrength: -1,
    };
  }

  const bestStrength = Math.max(...relevant.map((e) => e.evidence_strength));
  const avgConfidence =
    relevant.reduce((sum, e) => sum + e.confidence, 0) / relevant.length;

  if (avgConfidence < 0.35 && bestStrength < 2) {
    return {
      skill,
      importance: requirement.importance,
      level: "UNCLEAR",
      reason:
        `Evidence mentions ${skill} but is too uncertain to classify ` +
        `(average confidence ${avgConfidence.toFixed(2)}). Verify the source.`,
      evidenceIds,
      bestStrength,
    };
  }

  switch (bestStrength) {
    case 3:
      return {
        skill,
        importance: requirement.importance,
        level: "PROVEN",
        reason: `${skill} is supported by verified evidence (${relevant.length} item${relevant.length === 1 ? "" : "s"}).`,
        evidenceIds,
        bestStrength,
      };
    case 2:
      return {
        skill,
        importance: requirement.importance,
        level: "PARTIALLY_PROVEN",
        reason: `${skill} is demonstrated in an artifact but lacks verification (no deployment, test, or review evidence).`,
        evidenceIds,
        bestStrength,
      };
    case 1:
      return {
        skill,
        importance: requirement.importance,
        level: "WEAK_EVIDENCE",
        reason: `${skill} is listed but not demonstrated — no artifact shows it in use.`,
        evidenceIds,
        bestStrength,
      };
    default:
      return {
        skill,
        importance: requirement.importance,
        level: "CLAIMED_ONLY",
        reason: `${skill} appears only as a self-reported claim with no supporting source.`,
        evidenceIds,
        bestStrength,
      };
  }
}

export interface CoverageReport {
  total: number;
  mustHave: { total: number; proven: number; partial: number };
  preferred: { total: number; proven: number; partial: number };
  /** Weighted coverage 0..100. */
  coveragePct: number;
  /** Must-have requirements that are MISSING — the critical gaps. */
  criticalGaps: MatchClassification[];
  classifications: MatchClassification[];
}

/**
 * Deterministic coverage report over a set of requirements.
 * Pure arithmetic — the numbers in the UI come from here, never from an LLM.
 */
export function computeCoverage(
  requirements: RequirementInput[],
  evidence: EvidenceInput[],
): CoverageReport {
  const classifications = requirements.map((r) => classifyRequirement(r, evidence));

  let weightedSum = 0;
  let weightTotal = 0;
  const mustHave = { total: 0, proven: 0, partial: 0 };
  const preferred = { total: 0, proven: 0, partial: 0 };

  for (const c of classifications) {
    const w = IMPORTANCE_WEIGHT[c.importance];
    weightedSum += LEVEL_WEIGHT[c.level] * w;
    weightTotal += w;
    const bucket = c.importance === "must_have" ? mustHave : preferred;
    bucket.total++;
    if (c.level === "PROVEN") bucket.proven++;
    if (c.level === "PARTIALLY_PROVEN") bucket.partial++;
  }

  const criticalGaps = classifications.filter(
    (c) => c.importance === "must_have" && c.level === "MISSING",
  );

  return {
    total: classifications.length,
    mustHave,
    preferred,
    coveragePct: weightTotal === 0 ? 0 : Math.round((weightedSum / weightTotal) * 100),
    criticalGaps,
    classifications,
  };
}
