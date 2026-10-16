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

function buildDeterministicRoadmapFallback(
  targetRole: string,
  roleProfile: ReturnType<typeof resolveRoleProfile>,
): Record<string, unknown>[] {
  const roleName = roleProfile.displayName || targetRole;
  const mustHave = roleProfile.mustHaveSkills.slice(0, 4).map((s) => s.skill);
  const tooling = roleProfile.commonTools.slice(0, 4).map((s) => s.skill);
  const coreSkills = mustHave.length ? mustHave : ["problem solving", "clean code", "version control", "system design"];

  const fallbackPaths = [
    {
      title: `${roleName} Foundations`,
      description: `Build the core technical and engineering habits that employers screen for before they trust you with ${roleName} work.`,
      level: "beginner",
      category: "core_skill",
      market_justification: `Employers hiring for ${roleName} still check fundamentals, debugging discipline, and clean code before they advance you to real production work.`,
      outdated_warning: null,
      must_know: coreSkills.slice(0, 5),
      curated_resources: [
        {
          label: "Roadmap.sh Frontend/Backend path",
          url: "https://roadmap.sh/",
          type: "docs",
          why: "A practical checklist of the core skills employers expect.",
        },
        {
          label: "MDN JavaScript / Web Docs",
          url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
          type: "docs",
          why: "Official documentation for the language and web API fundamentals behind most technical roles.",
        },
      ],
      days: [
        {
          day_number: 1,
          title: "Core coding fundamentals",
          what_is_this: "Build clean problem-solving habits and language fluency in the tools your target role depends on.",
          explanation: "This is the baseline employers expect before they trust you with production-critical code or architecture choices.",
          why_companies_care: "Strong fundamentals reduce debugging time and show that you can reason clearly under pressure.",
          how_to_learn: [
            "Review the core syntax, data structures, and control flow used by your target role.",
            "Practice with short algorithmic problems and document the reasoning behind each solution.",
            "Refactor one messy solution into a cleaner version with better naming and structure.",
          ],
          hands_on_task: "Write and explain one small project feature using a clean, testable structure and a readable implementation path.",
          problem_solving_exercise: "Solve three small coding challenges and explain trade-offs between a simple solution and a more scalable one.",
          curated_links: [
            {
              label: "MDN JavaScript",
              url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
              type: "docs",
              why: "Official language reference for the core syntax and browser APIs you need to reason about confidently.",
            },
          ],
          estimated_minutes: 65,
        },
        {
          day_number: 2,
          title: "Version control and debugging workflow",
          what_is_this: "Learn the everyday workflow that keeps team projects reliable, reviewable, and recoverable.",
          explanation: "Companies expect more than coding — they expect disciplined Git, debugging habits, and the ability to explain changes clearly.",
          why_companies_care: "A clean workflow lowers deployment risk and helps you work without creating avoidable mistakes.",
          how_to_learn: [
            "Practice branching, committing, and resolving merge conflicts in a small repo.",
            "Read a few real debugging scenarios and document the root cause before fixing the issue.",
            "Review a teammate's diff and identify risk areas before code reaches production.",
          ],
          hands_on_task: "Create a mini project repo, make a few feature branches, and document the commit history as if it were a real team workflow.",
          problem_solving_exercise: "Repair a broken feature in a small repo and explain the root cause, the fix, and the risk you prevented.",
          curated_links: [
            {
              label: "GitHub Skills",
              url: "https://skills.github.com/",
              type: "interactive",
              why: "Hands-on Git workflows for branching, commits, and collaboration.",
            },
          ],
          estimated_minutes: 60,
        },
        {
          day_number: 3,
          title: "Build one credible proof project",
          what_is_this: "Turn fundamentals into visible evidence with a project that matches the role you are targeting.",
          explanation: "Companies rarely trust claims alone; they want proof that you can reason, build, and explain your work under realistic constraints.",
          why_companies_care: "A project proves you can deliver while giving interviewers something concrete to ask about.",
          how_to_learn: [
            "Pick one system or user problem related to the job description.",
            "Design a small but real user flow from start to finish.",
            "Document decisions, trade-offs, and what you would improve next.",
          ],
          hands_on_task: "Ship one small project with a clear problem statement, implementation notes, and a polished README that explains the architecture.",
          problem_solving_exercise: "List the top three technical risks in your project and explain how you would mitigate them in production.",
          curated_links: [
            {
              label: "Project planning guide",
              url: "https://roadmap.sh/projects",
              type: "docs",
              why: "A straightforward way to frame a portfolio project around real user value.",
            },
          ],
          estimated_minutes: 75,
        },
      ],
      mcq_bank: [
        {
          question: "A feature works locally but fails in production. What is the most likely first step?",
          options: { a: "Ship a hotfix without logging", b: "Trace the root cause and compare runtime assumptions with local configuration", c: "Rewrite the whole app", d: "Ignore it until the next release" },
          correct: "b",
          explanation: "The first move is to isolate the mismatch between local assumptions and production conditions before making any large change.",
          difficulty: "basic",
          company_relevance: "Expected in real-world debugging conversations for ${roleName} roles.",
          tags: ["debugging", "production", "root cause"],
        },
        {
          question: "Which habit most improves code maintainability for a team project?",
          options: { a: "Avoid comments", b: "Use clear naming, small functions, and consistent structure", c: "Copy-paste repeated logic", d: "Only optimize for speed" },
          correct: "b",
          explanation: "Readable structure and maintainable design matter more than cleverness when teams need to extend features quickly and safely.",
          difficulty: "basic",
          company_relevance: "Core expectation in software engineering interviews and code review.",
          tags: ["clean code", "teamwork"],
        },
      ],
    },
    {
      title: `${roleName} Problem Solving`,
      description: `Practice the kinds of reasoning and trade-offs companies use to test whether you can make good decisions under ambiguity.`,
      level: "intermediate",
      category: "problem_solving",
      market_justification: `Hiring screens for ${roleName} still test whether you can break down a problem, choose a sensible approach, and explain trade-offs.`,
      outdated_warning: null,
      must_know: ["data structures", "time complexity", "debugging", "trade-off analysis"],
      curated_resources: [
        {
          label: "LeetCode patterns",
          url: "https://leetcode.com/problem-list/top-interview-questions/",
          type: "interactive",
          why: "Good pattern practice for common problem-solving scenarios used in technical screening.",
        },
      ],
      days: [
        {
          day_number: 1,
          title: "Break down the problem",
          what_is_this: "Learn to interpret a vague requirement before you start coding.",
          explanation: "Good coding interviews begin with structured understanding, not with fast typing.",
          why_companies_care: "Companies look for clear reasoning and the ability to reduce ambiguity before implementing a solution.",
          how_to_learn: [
            "Restate the problem in your own words.",
            "Identify edge cases and hidden constraints.",
            "Write out a simple example before choosing a data structure.",
          ],
          hands_on_task: "Solve two small interview-style problems and explain the assumptions, inputs, and edge cases before writing code.",
          problem_solving_exercise: "Compare a brute-force approach with a more efficient one and explain why the latter is better under realistic constraints.",
          curated_links: [
            { label: "Interview patterns", url: "https://www.hackerrank.com/domains/algorithms", type: "interactive", why: "Structured practice around common coding interview patterns." },
          ],
          estimated_minutes: 70,
        },
        {
          day_number: 2,
          title: "Reason about trade-offs",
          what_is_this: "Learn to choose a solution that is correct, explainable, and practical for business use.",
          explanation: "A good solution balances speed, maintainability, and constraints rather than chasing optimization too early.",
          why_companies_care: "Hiring teams reward engineers who can justify design decisions and not just memorize patterns.",
          how_to_learn: [
            "Review common trade-offs in time complexity, memory usage, and API design.",
            "Compare two implementations and explain which one is safer under real constraints.",
            "Practice turning a vague requirement into a clear algorithmic plan.",
          ],
          hands_on_task: "Choose one technical challenge and compare two possible approaches before implementing the final version.",
          problem_solving_exercise: "Explain which approach you would choose under production constraints like limited memory, response time, or team maintainability.",
          curated_links: [
            { label: "Big-O cheatsheet", url: "https://www.bigocheatsheet.com/", type: "docs", why: "Quick reference for comparing algorithmic trade-offs." },
          ],
          estimated_minutes: 75,
        },
      ],
      mcq_bank: [
        {
          question: "When a user report says 'the app is slow', what is the best first step?",
          options: { a: "Guess and rewrite the UI", b: "Measure, isolate bottlenecks, and verify the actual constraint", c: "Ignore it until more reports come in", d: "Only optimize the database without checking the frontend" },
          correct: "b",
          explanation: "Good engineering requires data and diagnosis before large changes are made.",
          difficulty: "intermediate",
          company_relevance: "A real engineering triage skill in production support and debugging.",
          tags: ["debugging", "triage"],
        },
      ],
    },
    {
      title: `${roleName} Tooling and Delivery`,
      description: `Use the tools and workflows that companies expect to see in team-based software delivery and deployment work.`,
      level: "intermediate",
      category: "tooling",
      market_justification: `Most employers expect entry-level candidates to be comfortable using the standard toolchain, CI patterns, and deployment workflow for ${roleName}.`,
      outdated_warning: null,
      must_know: tooling.length ? tooling : ["GitHub workflows", "APIs", "deployment basics", "terminal tools"],
      curated_resources: [
        {
          label: "GitHub Docs",
          url: "https://docs.github.com/en",
          type: "docs",
          why: "Official references for workflows and collaboration patterns used in modern software teams.",
        },
      ],
      days: [
        {
          day_number: 1,
          title: "Developer toolchain",
          what_is_this: "Understand the tooling that makes backend and platform work reliable in teams.",
          explanation: "A good engineer is not only a coder — they are also comfortable with the terminal, automation, and collaboration workflow the team depends on.",
          why_companies_care: "Tooling confidence reduces errors and makes you effective in a real product environment.",
          how_to_learn: [
            "Set up a local project workflow with package manager, linting, and build scripts.",
            "Learn the common commands for running tests and checking project health.",
            "Document one common workflow so you can explain it clearly in a team environment.",
          ],
          hands_on_task: "Set up a small project workflow and document the essential commands, risks, and recovery steps.",
          problem_solving_exercise: "Compare the workflow of a local dev setup versus a deployment environment and explain the main differences.",
          curated_links: [
            { label: "GitHub Docs", url: "https://docs.github.com/en", type: "docs", why: "Official guidance for GitHub workflows and collaboration." },
          ],
          estimated_minutes: 75,
        },
      ],
      mcq_bank: [
        {
          question: "Your app builds locally but fails in CI. What is the most practical next step?",
          options: { a: "Push anyway and fix later", b: "Inspect the exact failing step and compare environment parity", c: "Delete the pipeline", d: "Modify the code without checking logs" },
          correct: "b",
          explanation: "CI failures typically come from mismatched environment assumptions or missing dependencies, so diagnosis should be data-driven.",
          difficulty: "intermediate",
          company_relevance: "A common real team workflow and quality gate issue.",
          tags: ["ci", "deployment", "debugging"],
        },
      ],
    },
    {
      title: `${roleName} Interview Readiness`,
      description: `Prepare for the communication layer of hiring: explaining trade-offs, architecture, and evidence clearly.`,
      level: "beginner",
      category: "core_skill",
      market_justification: `Companies do not only hire for code; they hire for communication, evidence, and the ability to explain decisions clearly.`,
      outdated_warning: null,
      must_know: ["clarity", "storytelling", "proof", "communication"],
      curated_resources: [
        {
          label: "Amazon leadership principles style interview prep",
          url: "https://www.amazon.jobs/en/landing_pages/leadership-principles",
          type: "docs",
          why: "Useful examples of structured explanations and decision framing in professional interviews.",
        },
      ],
      days: [
        {
          day_number: 1,
          title: "Explain your work clearly",
          what_is_this: "Turn technical work into a concise, real-world story that recruiters and interviewers can understand.",
          explanation: "Most candidates fail in interviews not because they lack the skill, but because they cannot explain what they built and why it mattered.",
          why_companies_care: "Communication is a core hiring signal because teams need engineers who can explain trade-offs and decision-making.",
          how_to_learn: [
            "Prepare a 60-second story about each project in your portfolio.",
            "Explain the problem, your approach, and what you learned.",
            "Practice answering follow-up questions without getting defensive or vague.",
          ],
          hands_on_task: "Record yourself explaining one project in under 90 seconds and make it more concrete and concise.",
          problem_solving_exercise: "Turn a technical detail into a short business explanation that a non-technical manager could follow.",
          curated_links: [
            { label: "Interview story framework", url: "https://www.indeed.com/career-advice/interviewing/how-to-answer-tell-me-about-yourself", type: "docs", why: "A practical framework for turning experience into a coherent story." },
          ],
          estimated_minutes: 60,
        },
      ],
      mcq_bank: [
        {
          question: "Which answer best demonstrates strong engineering communication in an interview?",
          options: { a: "Give a long, vague explanation without structure", b: "State the problem, your approach, trade-offs, and what you learned", c: "Only talk about the tools used", d: "Avoid discussing failures" },
          correct: "b",
          explanation: "Strong communication is structured and grounded in trade-offs, decisions, and lessons from real work.",
          difficulty: "basic",
          company_relevance: "This is a core hiring signal across technical and product-facing roles.",
          tags: ["communication", "storytelling"],
        },
      ],
    },
  ];

  return fallbackPaths.map((path) => ({
    ...path,
    curated_resources: path.curated_resources.slice(0, 3),
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

    let pathsRaw: Record<string, unknown>[] = [];

    if (raw) {
      try {
        const parsed = parseJsonObject<{ paths?: Record<string, unknown>[] }>(raw);
        pathsRaw = Array.isArray(parsed.paths) ? parsed.paths : [];
      } catch (err) {
        console.warn("[RoadmapV2] AI response was not valid JSON, using fallback roadmap.", err);
      }
    }

    if (!pathsRaw.length) {
      console.warn(
        "[RoadmapV2] Using created fallback roadmap because the AI response was unavailable or malformed.",
        lastAiError instanceof Error ? lastAiError.message : "No AI response",
      );
      pathsRaw = buildDeterministicRoadmapFallback(goal.target_role, roleProfile);
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

/* ------------------------------------------------------------------ *
 * 4. Helper — getLearningPaths
 * ------------------------------------------------------------------ */

export async function getLearningPaths(userId: string) {
  const levelOrder: Record<string, number> = { beginner: 0, intermediate: 1, expert: 2 };

  const { data: paths, error } = await db
    .from("roadmap_learning_paths")
    .select("*")
    .eq("user_id", userId)
    .order("position");

  if (error) throw error;

  // Sort by level (beginner first) then by position
  const sorted = (paths ?? []).sort(
    (a: { level: string; position: number }, b: { level: string; position: number }) => {
      const levelDiff = (levelOrder[a.level] ?? 9) - (levelOrder[b.level] ?? 9);
      if (levelDiff !== 0) return levelDiff;
      return a.position - b.position;
    },
  );

  return sorted;
}
