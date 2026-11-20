import { tavilySearch, type TavilySearchResponse } from "./tavily.server";
import { groqChat, parseJsonObject } from "./ai.server";
import { consumeAiCall } from "./billing.server";
import { resolveRoleProfile, type RoleTruthProfile } from "@/data/market-truth";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// The diagnostic_intakes table may not be in the generated Supabase types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

/* ------------------------------------------------------------------ *
 * Outdated Technology Detection
 *
 * Compares a student's current skills against their target role's
 * requirements, then uses Tavily to identify which of those skills
 * are becoming obsolete or declining in market demand.
 * ------------------------------------------------------------------ */

export type OutdatedTechItem = {
  skill: string;
  status: "declining" | "at_risk" | "stable";
  reason: string;
  replacement: string | null;
  evidence: string;
  source: string;
};

export type OutdatedTechReport = {
  targetRole: string;
  studentSkills: string[];
  roleRequiredSkills: string[];
  outdatedItems: OutdatedTechItem[];
  healthySkills: string[];
  researchedAt: string;
  fromCache: boolean;
};

/**
 * Detect outdated technologies in a student's skill set relative to
 * their target role. Uses Tavily for fresh market signals and Groq
 * for structured analysis.
 */
export async function detectOutdatedTechnologies(
  userId: string,
): Promise<OutdatedTechReport> {
  // 1. Load user's skills and career goal
  const [goalRes, skillsRes, intakeRes] = await Promise.all([
    supabaseAdmin
      .from("career_goals")
      .select("target_role")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("user_skills")
      .select("skills(name)")
      .eq("user_id", userId),
    db
      .from("diagnostic_intakes")
      .select("languagesFrameworks, practicalExperience")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const targetRole = goalRes.data?.target_role?.trim();
  if (!targetRole) {
    throw new Error("Set a career goal first to check for outdated technologies.");
  }

  // Extract student's current skills from multiple sources
  const skillNames = new Set<string>();
  for (const row of skillsRes.data ?? []) {
    const skillData = row.skills as { name?: string } | null;
    if (skillData?.name) skillNames.add(skillData.name);
  }
  // Also parse free-text skills from the intake form
  const freeText = [
    intakeRes.data?.languagesFrameworks,
    intakeRes.data?.practicalExperience,
  ]
    .filter(Boolean)
    .join(", ");
  if (freeText) {
    for (const part of freeText.split(/[,;/]+/)) {
      const trimmed = part.trim();
      if (trimmed.length > 1 && trimmed.length < 40) skillNames.add(trimmed);
    }
  }

  const studentSkills = Array.from(skillNames);
  if (studentSkills.length === 0) {
    return {
      targetRole,
      studentSkills: [],
      roleRequiredSkills: [],
      outdatedItems: [],
      healthySkills: [],
      researchedAt: new Date().toISOString(),
      fromCache: false,
    };
  }

  // 2. Get the role's required skills from the Market Truth dataset
  const roleProfile = resolveRoleProfile(targetRole);
  const roleRequiredSkills = [
    ...roleProfile.mustHaveSkills.map((s) => s.skill),
    ...roleProfile.commonTools.map((t) => t.skill),
    ...roleProfile.differentiators.map((d) => d.skill),
  ];

  // 3. Use Tavily to search for declining technologies in this role's domain
  const tavilyResults = await searchDecliningTech(targetRole, studentSkills);

  // Quota first: one AI call is consumed before the provider is called.
  // This check sits OUTSIDE analyzeOutdatedTech's try/catch on purpose:
  // that catch returns a report on any error, and a quota refusal must
  // reach the user as an error, never as a clean bill of health.
  await consumeAiCall(supabaseAdmin, userId, "outdated-tech");

  // 4. Use Groq to synthesize the analysis
  const report = await analyzeOutdatedTech(
    targetRole,
    studentSkills,
    roleRequiredSkills,
    roleProfile,
    tavilyResults,
  );

  return report;
}

/**
 * Search Tavily for declining/outdated technologies relevant to the
 * target role and the student's current skills.
 */
async function searchDecliningTech(
  targetRole: string,
  studentSkills: string[],
): Promise<TavilySearchResponse[]> {
  const skillList = studentSkills.slice(0, 10).join(", ");
  const queries = [
    `outdated technologies for ${targetRole} 2026 declining skills`,
    `deprecated frameworks tools ${targetRole} replaced by 2026`,
  ];

  // Only add a skill-specific query if the student has notable skills
  if (skillList) {
    queries.push(`are these technologies outdated ${skillList} 2026 job market demand`);
  }

  const results: TavilySearchResponse[] = [];
  // Run every query, including the skill-specific third one: the student's
  // own skills must actually be searched.
  for (const query of queries) {
    try {
      const result = await tavilySearch(query, { maxResults: 4, searchDepth: "basic" });
      results.push(result);
    } catch {
      // Tavily failures are non-fatal — we proceed with whatever we have
      console.warn("[OutdatedTech] Tavily query failed:", query.slice(0, 60));
    }
  }
  return results;
}

/**
 * Use Groq to analyze the student's skills against market evidence
 * and produce a structured outdated tech report.
 */
async function analyzeOutdatedTech(
  targetRole: string,
  studentSkills: string[],
  roleRequiredSkills: string[],
  roleProfile: RoleTruthProfile,
  tavilyResults: TavilySearchResponse[],
): Promise<OutdatedTechReport> {
  const tavilyContext = tavilyResults
    .flatMap((r) => r.results)
    .map((r) => `Source: ${r.title}\nURL: ${r.url}\nContent: ${r.content.slice(0, 500)}`)
    .join("\n\n");

  const systemPrompt = `You are a career technology analyst. You compare a student's current skills against their target role's requirements and identify which skills are becoming outdated or declining in market demand.

RULES:
- Be honest and direct. If a technology is dying, say so.
- Only flag a skill as "declining" if there is real market evidence.
- "at_risk" means the skill is still used but losing demand.
- "stable" means the skill is still relevant and not declining.
- For each declining/at-risk skill, suggest a modern replacement.
- Use the provided Tavily research evidence to support your claims.
- If no evidence suggests a skill is declining, classify it as "stable".
- Return ONLY a valid JSON object. No markdown fences.

Return a JSON object:
{
  "outdatedItems": [{
    "skill": "the skill name",
    "status": "declining | at_risk | stable",
    "reason": "why this skill is declining or at risk",
    "replacement": "the modern alternative to learn instead (or null if stable)",
    "evidence": "brief market evidence note",
    "source": "where this information came from"
  }],
  "healthySkills": ["skills that are still relevant and worth maintaining"]
}`;

  const userMessage = [
    `Target role: ${targetRole}`,
    `Role: ${roleProfile.displayName} — ${roleProfile.headline}`,
    ``,
    `Student's current skills: ${studentSkills.join(", ")}`,
    ``,
    `Role's required skills: ${roleRequiredSkills.join(", ")}`,
    ``,
    `Must-have skills for this role: ${roleProfile.mustHaveSkills.map((s) => s.skill).join(", ")}`,
    `Common tools: ${roleProfile.commonTools.map((t) => t.skill).join(", ")}`,
    ``,
    `=== TAVILY RESEARCH EVIDENCE ===`,
    tavilyContext || "No live research available. Use your training knowledge.",
    ``,
    `Analyse each of the student's skills and classify them.`,
  ].join("\n");

  try {
    const raw = await groqChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { json: true, maxTokens: 2000, temperature: 0.3 },
    );

    const parsed = parseJsonObject<Record<string, unknown>>(raw);
    const outdatedRaw = Array.isArray(parsed["outdatedItems"]) ? parsed["outdatedItems"] : [];
    const healthyRaw = Array.isArray(parsed["healthySkills"]) ? parsed["healthySkills"] : [];

    const outdatedItems: OutdatedTechItem[] = outdatedRaw
      .map((item) => {
        const rec = item as Record<string, unknown>;
        const status = String(rec["status"] ?? "stable").toLowerCase();
        if (!["declining", "at_risk", "stable"].includes(status)) return null;
        return {
          skill: String(rec["skill"] ?? "").trim(),
          status: status as OutdatedTechItem["status"],
          reason: String(rec["reason"] ?? "").trim(),
          replacement: rec["replacement"] ? String(rec["replacement"]).trim() : null,
          evidence: String(rec["evidence"] ?? "").trim(),
          source: String(rec["source"] ?? "Market analysis").trim(),
        };
      })
      .filter((item): item is OutdatedTechItem => item !== null && item.skill.length > 0);

    const healthySkills = healthyRaw
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);

    return {
      targetRole,
      studentSkills,
      roleRequiredSkills,
      outdatedItems,
      healthySkills,
      researchedAt: new Date().toISOString(),
      fromCache: false,
    };
  } catch (error) {
    console.error("[OutdatedTech] AI analysis failed:", error);
    // Never return a fake "all healthy" report: the check did not run, so
    // say so. Callers show an error state instead of a clean bill of health.
    throw new Error(
      "Outdated-technology check unavailable — the analysis failed, so your skills have not been checked. Please try again.",
    );
  }
}
