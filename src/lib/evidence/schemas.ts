/**
 * Zod schemas for AI input/output at evidence-layer boundaries (Phase A14).
 *
 * Rule: every important LLM operation in the new code validates its output
 * against one of these schemas. Malformed output is REJECTED (never silently
 * degraded into defaults) so the verifier and UI never render invented data.
 */
import { z } from "zod";

export const SkillCategorySchema = z.enum([
  "language",
  "framework",
  "database",
  "cloud",
  "devops",
  "testing",
  "architecture",
  "ai",
  "data",
  "frontend",
  "backend",
  "mobile",
  "soft_skill",
  "other",
]);

export const EvidenceSourceTypeSchema = z.enum([
  "resume",
  "github",
  "project",
  "portfolio",
  "certificate",
  "course",
  "interview",
  "application",
  "manual_claim",
  "achievement",
  "hackathon",
  "other",
]);

export const VerificationStatusSchema = z.enum([
  "unverified",
  "extracted",
  "validated",
  "verified",
  "stale",
]);

/** One evidence claim extracted by the AI from a source document. */
export const ExtractedEvidenceSchema = z.object({
  skill: z.string().min(1).max(120),
  claim: z.string().min(1).max(500),
  source_type: EvidenceSourceTypeSchema,
  /** Exact quote from the source supporting the claim. Must not be invented. */
  quote: z.string().max(1000),
  /** 0 = claim only, 1 = listed, 2 = demonstrated, 3 = verified. */
  evidence_strength: z.number().int().min(0).max(3),
  confidence: z.number().min(0).max(1),
});

export const EvidenceExtractionResultSchema = z.object({
  evidence: z.array(ExtractedEvidenceSchema).max(50),
  /** Skills the source mentions that the extractor could not normalize. */
  unmapped_skills: z.array(z.string().max(120)).max(30).default([]),
});

export const GapLevelSchema = z.enum([
  "PROVEN",
  "PARTIALLY_PROVEN",
  "CLAIMED_ONLY",
  "WEAK_EVIDENCE",
  "MISSING",
  "UNCLEAR",
]);

export const RequirementImportanceSchema = z.enum(["must_have", "preferred"]);

/** Structured job requirement (used by Phase B extraction; defined here). */
export const JobRequirementSchema = z.object({
  skill: z.string().min(1).max(120),
  importance: RequirementImportanceSchema,
  /** Raw requirement text from the job, for citation. */
  source_text: z.string().max(500),
});

export const RequirementExtractionResultSchema = z.object({
  must_have_skills: z.array(z.string().max(120)).max(40).default([]),
  preferred_skills: z.array(z.string().max(120)).max(40).default([]),
  responsibilities: z.array(z.string().max(300)).max(20).default([]),
  years_experience: z.string().max(60).nullable().default(null),
});

export const VerifierVerdictSchema = z.enum(["PASS", "FAIL", "NEEDS_REPAIR"]);

/** Output contract for the verifier (Phase C). */
export const VerifierResultSchema = z.object({
  verdict: VerifierVerdictSchema,
  checks: z.array(
    z.object({
      name: z.string(),
      passed: z.boolean(),
      detail: z.string().max(500),
    }),
  ),
  /** Claims that failed evidence support, quoted verbatim. */
  unsupported_claims: z.array(z.string().max(500)).default([]),
});

export type ExtractedEvidence = z.infer<typeof ExtractedEvidenceSchema>;
export type EvidenceExtractionResult = z.infer<typeof EvidenceExtractionResultSchema>;
export type GapLevel = z.infer<typeof GapLevelSchema>;
export type JobRequirement = z.infer<typeof JobRequirementSchema>;
export type RequirementExtractionResult = z.infer<
  typeof RequirementExtractionResultSchema
>;
export type RequirementImportance = z.infer<typeof RequirementImportanceSchema>;
export type VerifierResult = z.infer<typeof VerifierResultSchema>;
