import { groqChat, parseJsonObject } from "./ai.server";
import { buildCareerContext } from "./mentor.server";
import { generateMarketReality, type MarketReality } from "./market.server";
import { loadLatestDiagnosis, type CareerDiagnosis } from "./diagnosis.server";
import { getTechTrends, type TechTrendsReport } from "./tech-trends.server";
import {
  resolveRoleProfile,
  TOP_REJECTION_REASONS,
  PERCEPTION_VS_REALITY,
} from "@/data/market-truth";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// The roadmap v2 tables are not yet in the generated Supabase types.
// Use an untyped alias for operations on those tables only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const str = (v: unknown, max = 200) =>
  String(v ?? "")
    .trim()
    .slice(0, max);

function normaliseRoadmapLevel(value: unknown): "beginner" | "intermediate" | "expert" {
  const level = str(value, 30)
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
  if (level === "expert" || level === "advanced") return "expert";
  if (level === "intermediate" || level === "mid") return "intermediate";
  return "beginner";
}

function normaliseRoadmapCategory(
  value: unknown,
): "core_skill" | "emerging_tech" | "problem_solving" | "tooling" | "deployment" {
  const category = str(value, 40)
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
  if (category.includes("emerging") || category.includes("ai")) return "emerging_tech";
  if (category.includes("problem") || category.includes("algorithm")) return "problem_solving";
  if (category.includes("deploy") || category.includes("devops")) return "deployment";
  if (category.includes("tool") || category.includes("workflow")) return "tooling";
  return "core_skill";
}

type RoadmapResource = {
  label: string;
  url: string;
  type: "video" | "article" | "docs" | "interactive";
  why: string;
};

const RESOURCE_TYPES = ["video", "article", "docs", "interactive"] as const;

function parseRoadmapResources(value: unknown, max = 3): RoadmapResource[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, max)
    .map((raw) => {
      const item = (raw ?? {}) as Record<string, unknown>;
      const type = str(item["type"], 20).toLowerCase();
      return {
        label: str(item["label"], 200),
        url: str(item["url"], 500),
        type: RESOURCE_TYPES.includes(type as (typeof RESOURCE_TYPES)[number])
          ? (type as RoadmapResource["type"])
          : "article",
        why: str(item["why"], 300),
      };
    })
    .filter((item) => item.label && /^https?:\/\//i.test(item.url));
}

function summarizeList(values: string[] | undefined, max = 8): string {
  return (values ?? []).filter(Boolean).slice(0, max).join("; ") || "Not available";
}

function formatMarketReality(market: MarketReality | null): string {
  if (!market) return "Market Reality is not available. Do not invent market evidence.";

  return [
    `Role snapshot: ${market.roleSnapshot.summary}`,
    `Global demand: ${market.globalMarket.demand}`,
    `Global technologies: ${summarizeList(market.globalMarket.commonTechnologies)}`,
    `Employer requirements: ${summarizeList(market.employerEvidence.recurringSkills)}`,
    `Trusted evidence: ${summarizeList(market.globalMarket.commonResponsibilities)}`,
    `Experience expectations: ${summarizeList(market.globalMarket.experienceExpectations, 5)}`,
    `AI impact: ${summarizeList(market.aiImpact.expectedEvolution, 5)}`,
    `Global salary signal: ${market.salaryInsights.entryLevel} | ${market.salaryInsights.midLevel} | ${market.salaryInsights.seniorLevel}`,
    `Market evidence date: ${market.researchedOn ?? market.evidenceCollectedAt}`,
  ].join("\n");
}

function formatDiagnosis(diagnosis: CareerDiagnosis | null): string {
  if (!diagnosis)
    return "No re-diagnosis has been run yet. Use role truth and Market Reality, but do not pretend the student has diagnosis evidence.";

  const company = diagnosis.companyDiagnosis;
  return [
    `Latest diagnosis target: ${diagnosis.targetRole ?? "Unknown role"}${diagnosis.targetCompany ? ` at ${diagnosis.targetCompany}` : ""}`,
    `Readiness: ${diagnosis.readiness.overall ?? "unknown"}/100`,
    `Blockers: ${
      diagnosis.blockers
        .map((item) => `${item.problem} - ${item.fix}`)
        .slice(0, 5)
        .join("; ") || "None recorded"
    }`,
    `Priorities: ${
      diagnosis.priorities
        .map((item) => `${item.title} (${item.impact}) - ${item.action}`)
        .slice(0, 5)
        .join("; ") || "None recorded"
    }`,
    `Next best action: ${diagnosis.nextBestAction?.action ?? "None recorded"}`,
    `Proof gaps: ${summarizeList(diagnosis.evidenceSummary.unknown, 8)}`,
    company
      ? `Company hiring bar: ${summarizeList(company.whatIsLacking.missingNonNegotiables, 6)}. Required project: ${company.prescription.recommendedProofProject.title}`
      : "No company-specific diagnosis is available.",
  ].join("\n");
}

function formatTechTrends(trends: TechTrendsReport | null): string {
  if (!trends) return "Live Future Tech data is not available. Do not invent trend claims.";

  const trendLines = [trends.featured, ...trends.alsoWatching]
    .slice(0, 5)
    .map(
      (trend) =>
        `${trend.name} [${trend.category}, ${trend.status}] - ${trend.whyItMatters} Career relevance: ${trend.careerRelevance}`,
    );
  return [
    `Featured trend: ${trends.featured.name} - ${trends.featured.whyItMatters}`,
    ...trendLines,
    `Trend sources were fetched from the live Future Tech research layer; use their URLs for emerging-tech learning links.`,
  ].join("\n");
}

function extractTechSources(trends: TechTrendsReport | null): RoadmapResource[] {
  if (!trends) return [];
  return [trends.featured, ...trends.alsoWatching]
    .flatMap((trend) => trend.sources)
    .filter((source) => /^https?:\/\//i.test(source.url))
    .slice(0, 8)
    .map((source) => ({
      label: source.title,
      url: source.url,
      type: "article" as const,
      why: source.summary || "Live source for this emerging technology signal.",
    }));
}

async function loadRoadmapIntelligence(userId: string): Promise<{
  marketRealitySummary: string;
  diagnosisSummary: string;
  techTrendsSummary: string;
  techSources: RoadmapResource[];
}> {
  const [marketResult, diagnosisResult, trendsResult] = await Promise.allSettled([
    generateMarketReality(supabaseAdmin, userId),
    loadLatestDiagnosis(supabaseAdmin, userId),
    getTechTrends(supabaseAdmin),
  ]);

  const market = marketResult.status === "fulfilled" ? marketResult.value : null;
  const diagnosis = diagnosisResult.status === "fulfilled" ? diagnosisResult.value : null;
  const trends = trendsResult.status === "fulfilled" ? trendsResult.value : null;

  if (marketResult.status === "rejected") {
    console.warn("[RoadmapV2] Market Reality unavailable (non-fatal):", marketResult.reason);
  }
  if (diagnosisResult.status === "rejected") {
    console.warn("[RoadmapV2] latest diagnosis unavailable (non-fatal):", diagnosisResult.reason);
  }
  if (trendsResult.status === "rejected") {
    console.warn("[RoadmapV2] Future Tech trends unavailable (non-fatal):", trendsResult.reason);
  }

  return {
    marketRealitySummary: formatMarketReality(market),
    diagnosisSummary: formatDiagnosis(diagnosis),
    techTrendsSummary: formatTechTrends(trends),
    techSources: extractTechSources(trends),
  };
}

/* ------------------------------------------------------------------ *
 * 1. System Prompt — Brutally Honest Roadmap Generator
 * ------------------------------------------------------------------ */

export const ROADMAP_V2_SYSTEM_PROMPT = `You are a brutally honest career roadmap generator. Create personalised day-by-day execution plans for CS students targeting entry-level tech roles.

RULES:
- Direct language: "You must" / "Companies require" — never "consider" or "you might want to"
- Every path must be justified by the student's Market Reality, latest diagnosis, or a live Future Tech signal.
- Every day must teach the topic: give a concise 1-3 sentence "what_is_this" brief, then a numbered how_to_learn sequence, then a concrete hands-on task.
- Free resources preferred (official docs, reputable courses, technical talks). Max 3 links/day. Exact URLs only
- Skip skills the student already has at 70%+
- NO tutorial projects (todo apps, calculators). Tasks must produce shareable, original output
- Flag outdated/declining technologies
- MCQs must be role-specific and scenario-based, like a real company technical screen. Tie every question to the target role, a named company hiring expectation, or a real production decision. Ne[...]
- Use live trend sources when a path is an emerging technology. Put the source URL in curated_links so the student can research further.

OUTPUT: Return ONLY a JSON object (no markdown fences, no prose) with this structure:
{
  "paths": [{
    "title": "string", "description": "string", "level": "beginner|intermediate|expert",
    "category": "core_skill|emerging_tech|problem_solving|tooling|deployment",
    "market_justification": "string", "outdated_warning": "string or null",
    "must_know": ["3-6 key concepts"],
    "curated_resources": [{"label":"s","url":"s","type":"video|article|docs|interactive","why":"s"}],
    "days": [{
      "day_number": 1, "title": "string", "what_is_this": "short topic brief",
      "explanation": "string",
      "why_companies_care": "string", "how_to_learn": ["steps"],
      "hands_on_task": "string", "problem_solving_exercise": "string",
      "curated_links": [{"label":"s","url":"s","type":"video|article|docs|interactive","why":"s"}],
      "estimated_minutes": 60
    }],
    "mcq_bank": [{
      "question": "role-specific production scenario", "options": {"a":"s","b":"s","c":"s","d":"s"},
      "correct": "a|b|c|d", "explanation": "string",
      "difficulty": "basic|intermediate|advanced", "company_relevance": "string", "tags": ["topic"]
    }]
  }]
}

SCOPE: 4-6 paths (2 beginner, 1-2 intermediate, 1 expert). Each path: 3-5 days, 4-6 MCQs.
Order from most urgent gap to least. Include ≥1 deployment and ≥1 problem-solving path.`;

/* ------------------------------------------------------------------ *
 * 2. generateRoadmapV2 — the core generation function
 * ------------------------------------------------------------------ */

export async function generateRoadmapV2(
  userId: string,
): Promise<{ success: boolean; pathCount: number; error?: string }> {
  try {
    // 1. Fetch user profile + career goal
    const [goalRes, profileRes] = await Promise.all([
      supabaseAdmin
        .from("career_goals")
        .select("target_role, target_industry")
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("first_name, last_name, current_role, degree, university, graduation_year")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const goal = goalRes.data;
    const profile = profileRes.data;

    if (!goal?.target_role) {
      return {
        success: false,
        pathCount: 0,
        error: "Set a career goal first so the roadmap can be tailored to it.",
      };
    }

    // 2. Resolve the role profile from Market Truth
    const roleProfile = resolveRoleProfile(goal.target_role);

    // 3. Build career context (skills, projects, resume, etc.)
    //    Wrapped in try/catch so a missing table doesn't kill the whole roadmap.
    let careerContext = "No career context available.";
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      careerContext = await buildCareerContext(supabaseAdmin as any, userId);
    } catch (ctxErr) {
      console.warn(
        "[RoadmapV2] buildCareerContext failed (non-fatal):",
        ctxErr instanceof Error ? ctxErr.message : String(ctxErr),
      );
    }

    // 4. Gather cross-cutting data
    const rejectionReasonsText = TOP_REJECTION_REASONS.map(
      (r) => `#${r.rank}: ${r.title} — ${r.detail}`,
    ).join("\n");

    const perceptionVsRealityText = PERCEPTION_VS_REALITY.map(
      (p) =>
        `Students think: "${p.studentsThink}" → Employers actually check: "${p.employersCheck}"`,
    ).join("\n");

    // 5. Role profile summary
    const roleSummary = [
      `Target role: ${roleProfile.displayName}`,
      `Headline: ${roleProfile.headline}`,
      `Must-have skills: ${roleProfile.mustHaveSkills.map((s) => `${s.skill} (${s.note ?? ""})`).join("; ")}`,
      `Common tools: ${roleProfile.commonTools.map((s) => s.skill).join(", ")}`,
      `Differentiators: ${roleProfile.differentiators.map((s) => s.skill).join(", ")}`,
      `What juniors lack: ${roleProfile.whatJuniorsLack.map((t) => t.statement).join("; ")}`,
      `Evidence employers trust: ${roleProfile.evidenceEmployersTrust.map((t) => t.statement).join("; ")}`,
    ].join("\n");

    // 6. Load the connected intelligence layers. Each layer is non-fatal so
    // the roadmap can still generate when one provider is unavailable.
    const intelligence = await loadRoadmapIntelligence(userId);

    // 7. Construct user message
    const userMessage = [
      `=== STUDENT PROFILE ===`,
      `Name: ${[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Student"}`,
      profile?.current_role ? `Current role: ${profile.current_role}` : "No current role recorded",
      profile?.degree ? `Degree: ${profile.degree}` : "No degree recorded",
      profile?.university ? `University: ${profile.university}` : "",
      `Target role: ${goal.target_role}`,
      goal.target_industry ? `Target industry: ${goal.target_industry}` : "",
      ``,
      `=== FULL CAREER CONTEXT ===`,
      careerContext,
      ``,
      `=== ROLE MARKET TRUTH: ${roleProfile.displayName} ===`,
      roleSummary,
      ``,
      `=== TOP REJECTION REASONS (2025-2026) ===`,
      rejectionReasonsText,
      ``,
      `=== PERCEPTION VS REALITY ===`,
      perceptionVsRealityText,
      ``,
      `=== EMERGING TECH TRENDS ===`,
      intelligence.techTrendsSummary,
      `Live sources for emerging-tech paths: ${JSON.stringify(intelligence.techSources)}`,
      ``,
      `=== MARKET REALITY ===`,
      intelligence.marketRealitySummary,
      ``,
      `=== LATEST RE-DIAGNOSIS ===`,
      intelligence.diagnosisSummary,
      ``,
      `Generate a complete, brutally honest learning roadmap for this student.`,
      `Tailor every path to the target role (${goal.target_role}).`,
      `Skip skills the student already demonstrates at 70%+.`,
      `Prioritise the biggest gaps between the student's current profile and what the market demands.`,
    ]
      .filter(Boolean)
      .join("\n");

    // 8. Call AI (roadmap generation is heavy). groqChat already fails over
    // across configured providers/models, so retrying the entire chain here
    // would duplicate the slowest part of the request.
    const MAX_AI_ATTEMPTS = 1;
    let raw: string | null = null;
    let lastAiError: unknown = null;

    for (let attempt = 1; attempt <= MAX_AI_ATTEMPTS; attempt++) {
      try {
        raw = await groqChat(
          [
            { role: "system", content: ROADMAP_V2_SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          { json: true, maxTokens: 5000, temperature: 0.4, timeoutMs: 60_000 },
        );
        break; // success — exit retry loop
      } catch (err) {
        lastAiError = err;
        console.warn(
          `[RoadmapV2] AI call attempt ${attempt}/${MAX_AI_ATTEMPTS} failed:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    // 9. Parse response
    const parsed = parseJsonObject<{ paths?: Record<string, unknown>[] }>(raw);
    const pathsRaw = Array.isArray(parsed.paths) ? parsed.paths : [];

    if (!pathsRaw.length) {
      return {
        success: false,
        pathCount: 0,
        error: "The roadmap couldn't be generated. Please try again.",
      };
    }

    // 10. Clear existing roadmap v2 data for this user.
    //     CASCADE rules handle downstream deletes:
    //     learning_paths → daily_work → mcq_attempts + notifications
    //     learning_paths → mcq_tests
    await db.from("roadmap_learning_paths").delete().eq("user_id", userId);

    // 11. Insert new data
    const validDifficulties = ["basic", "intermediate", "advanced"];
    const validOptions = ["a", "b", "c", "d"];

    let pathCount = 0;
    let firstDayId: string | null = null;

    for (let pathIndex = 0; pathIndex < pathsRaw.length; pathIndex++) {
      const pathData = pathsRaw[pathIndex] as Record<string, unknown>;

      const level = normaliseRoadmapLevel(pathData["level"]);
      const category = normaliseRoadmapCategory(pathData["category"]);

      const title = str(pathData["title"], 200);
      const description = str(pathData["description"], 600);
      if (!title || !description) continue;

      // Insert learning path
      const mustKnowRaw = pathData["must_know"];
      const mustKnow = Array.isArray(mustKnowRaw)
        ? mustKnowRaw.map((m: unknown) => str(m, 200)).filter(Boolean)
        : [];
      const pathResources = parseRoadmapResources(pathData["curated_resources"]);
      const connectedPathResources =
        category === "emerging_tech"
          ? [...pathResources, ...intelligence.techSources].slice(0, 3)
          : pathResources;

      const { data: insertedPath, error: pathError } = await db
        .from("roadmap_learning_paths")
        .insert({
          user_id: userId,
          title,
          description,
          level,
          category,
          market_justification: str(pathData["market_justification"], 800) || description,
          outdated_warning: pathData["outdated_warning"]
            ? str(pathData["outdated_warning"], 400)
            : null,
          must_know: mustKnow,
          curated_resources: connectedPathResources,
          position: pathIndex,
          completed: false,
        })
        .select("id")
        .single();

      if (pathError || !insertedPath) {
        console.error("[RoadmapV2] path insert failed:", pathError?.message);
        continue;
      }

      const pathId = insertedPath.id as string;
      pathCount++;

      // Insert daily work (batch)
      const daysRaw = Array.isArray(pathData["days"]) ? pathData["days"] : [];
      const dayInserts = daysRaw
        .map((dayRaw: unknown) => {
          const day = dayRaw as Record<string, unknown>;
          const dayNumber = typeof day["day_number"] === "number" ? day["day_number"] : 0;
          if (dayNumber < 1) return null;

          const howToLearnRaw = day["how_to_learn"];
          const howToLearnText = Array.isArray(howToLearnRaw)
            ? howToLearnRaw
                .map((s: unknown) => str(s, 500))
                .filter(Boolean)
                .join("\n")
            : str(howToLearnRaw, 2000);

          const generatedLinks = parseRoadmapResources(day["curated_links"]);
          const liveLinks =
            category === "emerging_tech"
              ? intelligence.techSources.slice(
                  dayNumber % Math.max(intelligence.techSources.length, 1),
                  (dayNumber % Math.max(intelligence.techSources.length, 1)) + 2,
                )
              : [];
          const curatedLinks = [...generatedLinks, ...liveLinks]
            .filter(
              (link, index, links) =>
                links.findIndex((candidate) => candidate.url === link.url) === index,
            )
            .slice(0, 3);

          const estimatedMinutes =
            typeof day["estimated_minutes"] === "number" && day["estimated_minutes"] > 0
              ? day["estimated_minutes"]
              : 60;

          const dayTitle = str(day["title"], 200) || `Day ${dayNumber}`;
          const explanation = str(day["explanation"], 5000) || "No explanation provided.";

          return {
            user_id: userId,
            learning_path_id: pathId,
            day_number: dayNumber,
            date_assigned: new Date().toISOString().split("T")[0],
            title: dayTitle,
            explanation,
            what_is_this: str(day["what_is_this"], 1200) || explanation,
            why_companies_care:
              str(day["why_companies_care"], 1000) || "Companies test this in interviews.",
            how_to_learn: howToLearnText || "Follow the curated links for this day.",
            hands_on_task:
              str(day["hands_on_task"], 1000) || "Complete the exercises for this day.",
            curated_links: curatedLinks,
            estimated_minutes: estimatedMinutes,
            problem_solving_exercise: day["problem_solving_exercise"]
              ? str(day["problem_solving_exercise"], 1500)
              : null,
            completed: false,
            mcq_passed: false,
          };
        })
        .filter(Boolean);

      if (dayInserts.length) {
        const { data: insertedDays } = await db
          .from("roadmap_daily_work")
          .insert(dayInserts)
          .select("id");

        if (firstDayId === null && insertedDays?.length) {
          firstDayId = insertedDays[0].id as string;
        }
      }

      // Insert MCQ bank (batch)
      const mcqRaw = Array.isArray(pathData["mcq_bank"]) ? pathData["mcq_bank"] : [];
      const mcqInserts = mcqRaw
        .map((mcqRawItem: unknown, mcqIndex: number) => {
          const mcq = mcqRawItem as Record<string, unknown>;
          const options = (mcq["options"] ?? {}) as Record<string, unknown>;
          const correct = str(mcq["correct"], 1).toLowerCase();
          const difficulty = str(mcq["difficulty"], 20).toLowerCase();

          if (!options["a"] || !options["b"] || !options["c"] || !options["d"]) return null;
          if (!validOptions.includes(correct)) return null;
          if (!validDifficulties.includes(difficulty)) return null;

          return {
            learning_path_id: pathId,
            question: str(mcq["question"], 1000) || "Question not provided.",
            option_a: str(options["a"], 500),
            option_b: str(options["b"], 500),
            option_c: str(options["c"], 500),
            option_d: str(options["d"], 500),
            correct_option: correct,
            explanation: str(mcq["explanation"], 800) || "See the learning material for this path.",
            difficulty,
            company_relevance:
              str(mcq["company_relevance"], 400) || "Relevant to target role interviews.",
            tags: Array.isArray(mcq["tags"])
              ? mcq["tags"]
                  .map((tag: unknown) => str(tag, 80))
                  .filter(Boolean)
                  .slice(0, 6)
              : [],
            position: mcqIndex,
          };
        })
        .filter(Boolean);

      if (mcqInserts.length) {
        await db.from("roadmap_mcq_tests").insert(mcqInserts);
      }
    }

    if (pathCount === 0) {
      return {
        success: false,
        pathCount: 0,
        error: "The roadmap response was not usable. Please try generating it again.",
      };
    }

    // 12. Create initial notification for Day 1
    if (firstDayId) {
      await db.from("roadmap_notifications").insert({
        user_id: userId,
        daily_work_id: firstDayId,
        type: "daily_work",
        title: "Your roadmap is ready!",
        message: `Your personalised roadmap has ${pathCount} learning paths. Start with Day 1 of your first path.`,
        read: false,
      });
    }

    return { success: true, pathCount };
  } catch (error) {
    console.error("[RoadmapV2] generateRoadmapV2 failed:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, pathCount: 0, error: message };
  }
}

/* ------------------------------------------------------------------ *
 * 3. Helper — getRoadmapProgress
 * ------------------------------------------------------------------ */

export async function getRoadmapProgress(userId: string) {
  // These reads are independent. Fetch them together so the roadmap sidebar
  // does not wait for three sequential database round trips.
  const [pathsRes, daysRes, scoreRes] = await Promise.all([
    db
      .from("roadmap_learning_paths")
      .select("id, level, completed, position")
      .eq("user_id", userId)
      .order("position"),
    db
      .from("roadmap_daily_work")
      .select("completed, mcq_passed, estimated_minutes")
      .eq("user_id", userId),
    db.from("roadmap_mcq_attempts").select("score").eq("user_id", userId),
  ]);

  const paths = pathsRes.data ?? [];
  const totalPaths = paths.length;
  const completedPaths = paths.filter((p: { completed: boolean }) => p.completed).length;

  // Determine current level (first incomplete path's level)
  const currentLevel =
    paths.find((p: { completed: boolean }) => !p.completed)?.level ??
    paths[paths.length - 1]?.level ??
    "beginner";

  const allDays = daysRes.data ?? [];
  const completedDaysData = allDays.filter((day: { completed: boolean }) => day.completed);
  const totalDays = allDays.length;
  const completedDays = completedDaysData.length;
  const mcqsPassed = allDays.filter((day: { mcq_passed: boolean }) => day.mcq_passed).length;
  const scores = (scoreRes.data ?? [])
    .map((row: { score: number }) => Number(row.score))
    .filter((score: number) => Number.isFinite(score));
  const estimatedMinutesCompleted = completedDaysData.reduce(
    (total: number, row: { estimated_minutes: number }) =>
      total + (Number(row.estimated_minutes) || 0),
    0,
  );

  return {
    totalPaths,
    completedPaths,
    totalDays,
    completedDays,
    currentLevel,
    mcqsPassed,
    mcqsAttempted: scores.length,
    averageMcqScore: scores.length
      ? Math.round(
          scores.reduce((total: number, score: number) => total + score, 0) / scores.length,
        )
      : null,
    estimatedMinutesCompleted,
    completionRate: totalDays ? Math.round((completedDays / totalDays) * 100) : 0,
  };
}
