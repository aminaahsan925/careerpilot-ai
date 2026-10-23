import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { groqChat, parseJsonObject, stringList } from "./ai.server";
import {
  buildCareerState,
  careerStateToPrompt,
  weekStart,
  type CareerState,
} from "./career-state.server";
import { saveReadiness } from "./readiness.server";

type Client = SupabaseClient<Database>;

const str = (v: unknown, max = 200) =>
  String(v ?? "")
    .trim()
    .slice(0, max);

function normaliseSkill(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]/g, "");
}

/* ------------------------------------------------------------------ *
 * 1. Career discovery
 * ------------------------------------------------------------------ */

export type DiscoveryAnswers = {
  interests: string;
  strengths: string;
  favouriteSubjects: string;
  workType: string;
  environment: string;
  goals: string;
};

const DISCOVERY_SYSTEM = `You are a realistic career advisor for students and early-career people.
Return ONLY JSON:
{"recommendations":[{
 "role": string,
 "why_fit": string (max 200 chars, grounded in what the student actually said),
 "required_skills": string[] (4-7),
 "already_have": string[] (only skills the student actually reported; may be empty),
 "need_to_build": string[] (3-6),
 "example_titles": string[] (2-4 realistic entry-level job titles),
 "fit_note": string (max 140 chars, an honest caveat)
}]}
Give 4 recommendations. Never guarantee employment. Never invent experience the student did not mention.`;

export async function runCareerDiscovery(
  supabase: Client,
  userId: string,
  answers: DiscoveryAnswers,
) {
  const state = await buildCareerState(supabase, userId);

  const raw = await groqChat(
    [
      { role: "system", content: DISCOVERY_SYSTEM },
      {
        role: "user",
        content: `=== CAREER STATE ===\n${careerStateToPrompt(state)}\n\n=== QUESTIONNAIRE ===
Interests: ${answers.interests}
Strengths: ${answers.strengths}
Subjects enjoyed: ${answers.favouriteSubjects}
Preferred type of work: ${answers.workType}
Preferred work environment: ${answers.environment}
Goals: ${answers.goals}`,
      },
    ],
    { json: true, maxTokens: 2000, temperature: 0.5 },
  );

  const parsed = parseJsonObject<Record<string, unknown>>(raw);
  const list = Array.isArray(parsed["recommendations"])
    ? (parsed["recommendations"] as Record<string, unknown>[])
    : [];
  if (!list.length) throw new Error("No recommendations could be generated. Please try again.");

  const rows = list.slice(0, 5).map((r, i) => ({
    user_id: userId,
    role: str(r["role"], 120) || `Option ${i + 1}`,
    why_fit: str(r["why_fit"], 400),
    required_skills: stringList(r["required_skills"], 8),
    already_have: stringList(r["already_have"], 8),
    need_to_build: stringList(r["need_to_build"], 8),
    example_titles: stringList(r["example_titles"], 4),
    fit_note: str(r["fit_note"], 240),
    selected: false,
    position: i,
  }));

  await supabase.from("career_recommendations").delete().eq("user_id", userId);
  const { error } = await supabase.from("career_recommendations").insert(rows as never);
  if (error) throw error;

  return { count: rows.length };
}

export async function selectCareerTarget(
  supabase: Client,
  userId: string,
  input: { recommendationId?: string; role?: string; industry?: string | null },
) {
  let role = str(input.role, 120);

  if (input.recommendationId) {
    const { data } = await supabase
      .from("career_recommendations")
      .select("id, role")
      .eq("id", input.recommendationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) throw new Error("That recommendation couldn't be found.");
    role = data.role as string;
    await supabase.from("career_recommendations").update({ selected: false }).eq("user_id", userId);
    await supabase.from("career_recommendations").update({ selected: true }).eq("id", data.id);
  }

  if (!role) throw new Error("Please choose or enter a target role.");

  const { error } = await supabase.from("career_goals").upsert(
    {
      user_id: userId,
      target_role: role,
      target_industry: input.industry ? str(input.industry, 120) : null,
    } as never,
    { onConflict: "user_id" },
  );
  if (error) throw error;

  return { targetRole: role };
}

/* ------------------------------------------------------------------ *
 * 2. Target job + job description analysis + skill gaps
 * ------------------------------------------------------------------ */

const JOB_SYSTEM = `You are a hiring manager and career analyst. You compare a real job description against a candidate's ACTUAL recorded career state.
Return ONLY JSON:
{
 "parsed": {
   "required_skills": string[],
   "preferred_skills": string[],
   "responsibilities": string[],
   "education": string[],
   "experience": string[],
   "technical_requirements": string[],
   "soft_skills": string[]
 },
 "gaps": [{
   "skill": string,
   "status": "matched" | "partial" | "missing" | "no_evidence",
   "priority": "high" | "medium" | "low",
   "required_level": string,
   "evidence": string (what in the candidate's state supports this, or "No evidence recorded"),
   "why_it_matters": string (max 140 chars),
   "action": string (what to learn/do),
   "proof_task": string (a concrete project or task that would prove the skill)
 }]
}
Rules:
- Judge every requirement against the candidate's recorded skills, evidence, resume and projects. Do not keyword match blindly.
- Use "no_evidence" when the candidate claims a skill but nothing supports it.
- Never invent candidate experience. 8-14 gaps maximum, most important first.
- "high" = required skill missing or unproven, "medium" = strengthens the application, "low" = nice to have.`;

export async function analyzeTargetJob(
  supabase: Client,
  userId: string,
  input: { title: string; company?: string | null; sourceUrl?: string | null; description: string },
) {
  const description = input.description.trim();
  if (description.length < 80)
    throw new Error("Paste the full job description (at least a few sentences).");

  const state = await buildCareerState(supabase, userId);

  const raw = await groqChat(
    [
      { role: "system", content: JOB_SYSTEM },
      {
        role: "user",
        content: `=== CANDIDATE CAREER STATE ===\n${careerStateToPrompt(state)}\n\n=== JOB: ${input.title}${
          input.company ? ` @ ${input.company}` : ""
        } ===\n${description.slice(0, 16000)}`,
      },
    ],
    { json: true, maxTokens: 2600, temperature: 0.3 },
  );

  const out = parseJsonObject<Record<string, unknown>>(raw);
  const parsedRaw = (out["parsed"] as Record<string, unknown>) ?? {};
  const parsed = {
    required_skills: stringList(parsedRaw["required_skills"], 15),
    preferred_skills: stringList(parsedRaw["preferred_skills"], 12),
    responsibilities: stringList(parsedRaw["responsibilities"], 10),
    education: stringList(parsedRaw["education"], 5),
    experience: stringList(parsedRaw["experience"], 5),
    technical_requirements: stringList(parsedRaw["technical_requirements"], 12),
    soft_skills: stringList(parsedRaw["soft_skills"], 8),
  };

  await supabase.from("target_jobs").update({ is_active: false }).eq("user_id", userId);

  const { data: job, error: jobError } = await supabase
    .from("target_jobs")
    .insert({
      user_id: userId,
      title: str(input.title, 160) || "Target role",
      company: input.company ? str(input.company, 160) : null,
      source_url: input.sourceUrl ? str(input.sourceUrl, 500) : null,
      description: description.slice(0, 20000),
      parsed: parsed as never,
      is_active: true,
    } as never)
    .select("id")
    .single();
  if (jobError) throw jobError;

  const validPriority = ["high", "medium", "low"];
  const gapRows = (Array.isArray(out["gaps"]) ? (out["gaps"] as Record<string, unknown>[]) : [])
    .map((g, i) => {
      const skill = str(g["skill"], 120);
      if (!skill) return null;
      const priority = str(g["priority"], 12).toLowerCase();
      const actualSkill = state.skills.find(
        (candidate) => normaliseSkill(candidate.name) === normaliseSkill(skill),
      );
      // The model extracts requirements and suggests actions. Evidence status is
      // always derived from the user's recorded evidence, never model judgement.
      const status = !actualSkill
        ? "missing"
        : actualSkill.evidenceStrength >= 3 &&
            actualSkill.sources.some((source) => source === "project" || source === "github")
          ? "matched"
          : actualSkill.evidenceStrength > 0
            ? "partial"
            : "no_evidence";
      return {
        user_id: userId,
        target_job_id: job.id as string,
        skill,
        status,
        priority: validPriority.includes(priority) ? priority : "medium",
        evidence: str(g["evidence"], 300) || null,
        required_level: str(g["required_level"], 120) || null,
        why_it_matters: str(g["why_it_matters"], 300) || null,
        action: str(g["action"], 300) || null,
        proof_task: str(g["proof_task"], 300) || null,
        position: i,
      };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null)
    .slice(0, 14);

  await supabase.from("skill_gaps").delete().eq("user_id", userId);
  if (gapRows.length) {
    const { error } = await supabase.from("skill_gaps").insert(gapRows as never);
    if (error) throw error;
  }

  const fresh = await buildCareerState(supabase, userId);
  const readiness = await saveReadiness(supabase, userId, fresh);

  return { targetJobId: job.id as string, gaps: gapRows.length, readiness };
}

/* ------------------------------------------------------------------ *
 * 3. Resume analysis → skill evidence
 * ------------------------------------------------------------------ */

/**
 * Records resume-detected skills as EVIDENCE (strength 1 = mentioned in a
 * document). Claims stay in user_skills; nothing is marked "verified" here.
 */
export async function syncResumeEvidence(
  supabase: Client,
  userId: string,
  detectedSkills: string[],
  resumeName: string,
) {
  const names = Array.from(
    new Map(
      detectedSkills
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => [s.toLowerCase(), s]),
    ).values(),
  ).slice(0, 20);
  const { data: existing, error: readError } = await supabase
    .from("skill_evidence")
    .select("id, skill_name")
    .eq("user_id", userId)
    .eq("source", "resume");
  if (readError) throw readError;

  const have = new Set((existing ?? []).map((e) => (e.skill_name ?? "").toLowerCase()));
  const rows = names
    .filter((n) => !have.has(n.toLowerCase()))
    .map((n) => ({
      user_id: userId,
      skill_name: n,
      source: "resume",
      detail: `Mentioned in ${resumeName}`,
      strength: 1,
    }));

  if (rows.length) {
    const { error } = await supabase.from("skill_evidence").insert(rows as never);
    if (error) throw error;
  }

  const keep = new Set(names.map((name) => name.toLowerCase()));
  const obsoleteIds = (existing ?? [])
    .filter((entry) => !keep.has((entry.skill_name ?? "").toLowerCase()))
    .map((entry) => entry.id);
  if (obsoleteIds.length) {
    const { error } = await supabase
      .from("skill_evidence")
      .delete()
      .eq("user_id", userId)
      .in("id", obsoleteIds);
    if (error) throw error;
  }
  return { added: rows.length };
}

/**
 * Adds user-submitted, linkable proof for explicitly named skills. This does
 * not scrape a repository or infer skills: the user supplies both the skills
 * and the GitHub/project URL, which stays attached as the evidence detail.
 */
export async function recordSkillEvidence(
  supabase: Client,
  userId: string,
  input: { source: "github" | "project"; detail: string; skills: string[] },
) {
  const detail = str(input.detail, 500);
  if (!/^https?:\/\//i.test(detail)) {
    throw new Error("Add a valid GitHub or project URL as proof.");
  }
  const skills = Array.from(
    new Map(
      input.skills
        .map((skill) => str(skill, 120))
        .filter(Boolean)
        .map((skill) => [normaliseSkill(skill), skill]),
    ).values(),
  ).slice(0, 12);
  if (!skills.length) throw new Error("Name at least one skill this link demonstrates.");

  const { data: existing, error: readError } = await supabase
    .from("skill_evidence")
    .select("skill_name")
    .eq("user_id", userId)
    .eq("source", input.source)
    .eq("detail", detail);
  if (readError) throw readError;

  const have = new Set((existing ?? []).map((row) => normaliseSkill(row.skill_name ?? "")));
  const rows = skills
    .filter((skill) => !have.has(normaliseSkill(skill)))
    .map((skill) => ({
      user_id: userId,
      skill_name: skill,
      source: input.source,
      detail,
      // A user-submitted link is supporting evidence, not independently
      // verified proof that the repository demonstrates the named skill.
      strength: 2,
    }));
  if (rows.length) {
    const { error } = await supabase.from("skill_evidence").insert(rows as never);
    if (error) throw error;
  }

  const readiness = await saveReadiness(supabase, userId, await buildCareerState(supabase, userId));
  return { added: rows.length, readiness };
}

/* ------------------------------------------------------------------ *
 * 4. Weekly goals
 * ------------------------------------------------------------------ */

const GOALS_SYSTEM = `You are a career coach setting ONE week of work for a student.
Return ONLY JSON: {"goals":[{"title": string (max 90 chars, specific and measurable),
"detail": string (max 180 chars, how to do it),
"linked_skill": string, "evidence_created": string (what artefact this produces)}]}
Give 3-5 goals, all tied to the student's highest-priority gaps and target role. No generic advice.`;

export async function generateWeeklyGoals(supabase: Client, userId: string) {
  const state = await buildCareerState(supabase, userId);
  if (!state.targetRole)
    throw new Error("Set a target career first so weekly goals can be tailored to it.");

  const raw = await groqChat(
    [
      { role: "system", content: GOALS_SYSTEM },
      { role: "user", content: `=== CAREER STATE ===\n${careerStateToPrompt(state)}` },
    ],
    { json: true, maxTokens: 1200, temperature: 0.5 },
  );

  const parsed = parseJsonObject<Record<string, unknown>>(raw);
  const list = Array.isArray(parsed["goals"]) ? (parsed["goals"] as Record<string, unknown>[]) : [];
  if (!list.length) throw new Error("Weekly goals couldn't be generated. Please try again.");

  const week = weekStart();
  const rows = list.slice(0, 5).map((g, i) => ({
    user_id: userId,
    week_start: week,
    title: str(g["title"], 160) || `Goal ${i + 1}`,
    detail: str(g["detail"], 300) || null,
    linked_skill: str(g["linked_skill"], 120) || null,
    evidence_created: str(g["evidence_created"], 200) || null,
    completed: false,
    status: "not_started",
    position: i,
  }));

  await supabase.from("weekly_goals").delete().eq("user_id", userId).eq("week_start", week);
  const { error } = await supabase.from("weekly_goals").insert(rows as never);
  if (error) throw error;
  return { count: rows.length, weekStart: week };
}

/* ------------------------------------------------------------------ *
 * 5. Readiness refresh (deterministic, never an LLM number)
 * ------------------------------------------------------------------ */

export async function refreshReadiness(supabase: Client, userId: string) {
  const state = await buildCareerState(supabase, userId);
  return saveReadiness(supabase, userId, state);
}

export async function loadCareerState(supabase: Client, userId: string): Promise<CareerState> {
  return buildCareerState(supabase, userId);
}
