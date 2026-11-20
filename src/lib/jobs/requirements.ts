/**
 * Structured requirement extraction from job postings — Phase 3.
 *
 * The AI boundary for market intelligence: a job description goes in,
 * a zod-validated RequirementExtractionResult comes out. Malformed model
 * output is REJECTED (never silently degraded), following the
 * src/lib/evidence/schemas.ts rule that the verifier and UI never render
 * invented data.
 *
 * Extraction is best-effort per posting: a failure is logged and the
 * posting keeps zero structured requirements — the caller (research
 * layer) falls back to dataset evidence rather than presenting guesses.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { parseJsonObject, type ChatMsg } from "../ai.server";
import { guardedChat } from "../ai-quota.server";
import { normalizeSkill } from "../evidence/skill-aliases";
import {
  RequirementExtractionResultSchema,
  type RequirementExtractionResult,
  type RequirementImportance,
} from "../evidence/schemas";
import type { RequirementInput } from "../evidence/matching";
import type { Database } from "@/integrations/supabase/types";

export {
  RequirementExtractionResultSchema,
  type RequirementExtractionResult,
  type RequirementImportance,
};

type Client = SupabaseClient<Database>;

/** Re-exported for callers that validate raw payloads (tests, backfills). */
export const JobRequirementExtractionSchema = RequirementExtractionResultSchema;

const EXTRACTION_SYSTEM_PROMPT = `You are a job-posting requirement extractor. You read a job description and extract structured hiring requirements.

CRITICAL RULES:
- Extract ONLY requirements explicitly stated in the posting. Do NOT invent skills.
- Copy the exact requirement phrase into "source_text" for each skill — never paraphrase into a different skill.
- "must_have_skills": explicitly required qualifications ("required", "must have", "X+ years of").
- "preferred_skills": nice-to-have qualifications ("preferred", "bonus", "a plus", "familiarity with").
- Use canonical technology names (e.g. "PostgreSQL" not "postgres").
- If the posting states no clear requirements, return empty arrays — never guess.

Return ONLY a JSON object with EXACTLY this structure:
{
  "must_have_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill3"],
  "responsibilities": ["responsibility 1", "responsibility 2"],
  "years_experience": "2+ years" | null
}`;

/**
 * Validate a raw parsed payload against the extraction schema.
 * Throws a ZodError on malformed output — the caller decides whether
 * that is fatal or best-effort. Never returns invented defaults.
 */
export function parseRequirementExtraction(
  raw: Record<string, unknown>,
): RequirementExtractionResult {
  return RequirementExtractionResultSchema.parse(raw);
}

/**
 * Extract structured requirements from one job description via the model.
 * Quota-guarded; throws on AI failure or schema violation.
 */
export async function extractRequirements(
  supabase: Client,
  userId: string,
  jobTitle: string,
  jobDescription: string,
): Promise<RequirementExtractionResult> {
  const messages: ChatMsg[] = [
    { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        `Job title: ${jobTitle}`,
        "",
        "Job description:",
        jobDescription.slice(0, 6000),
        "",
        "Extract the structured requirements as specified.",
      ].join("\n"),
    },
  ];

  const raw = await guardedChat(
    supabase,
    userId,
    "job-requirement-extraction",
    messages,
    {
      json: true,
      maxTokens: 1200,
      temperature: 0.1,
    },
  );
  return parseRequirementExtraction(
    parseJsonObject<Record<string, unknown>>(raw),
  );
}

/**
 * Convert an extraction result into deterministic matcher inputs.
 * Skills are canonicalized via the skill-aliases taxonomy; duplicates
 * (same canonical skill in both lists) keep the stronger importance.
 */
export function toRequirementInputs(
  result: RequirementExtractionResult,
): RequirementInput[] {
  const seen = new Map<string, RequirementInput>();
  const add = (skill: string, importance: RequirementImportance) => {
    const canonical = normalizeSkill(skill).canonical;
    if (!canonical || canonical === "Unknown") return;
    const existing = seen.get(canonical);
    if (
      !existing ||
      (existing.importance === "preferred" && importance === "must_have")
    ) {
      seen.set(canonical, { skill: canonical, importance });
    }
  };
  for (const skill of result.must_have_skills) add(skill, "must_have");
  for (const skill of result.preferred_skills) add(skill, "preferred");
  return [...seen.values()];
}
