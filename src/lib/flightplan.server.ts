import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { groqChat, parseJsonObject } from "./ai.server";
import { buildCareerState, careerStateToPrompt, type CareerState } from "./career-state.server";
import { formatEvidenceContext, retrieveGroundedEvidence } from "./intelligence.server";
import { tavilySearch, type TavilyResult } from "./tavily.server";

type Client = SupabaseClient<Database>;

export type FlightPlanMarketSource = {
  title: string;
  url: string;
  publishedDate: string | null;
  summary: string;
};

export type FlightPlanGitLabReview = {
  connected: boolean;
  inspected: boolean;
  url: string | null;
  projectName: string | null;
  qualityScore: number | null;
  signals: string[];
  note: string;
};

export type FlightPlanReadiness = "ready" | "almost_ready" | "not_ready" | "needs_review";

export type FlightPlanAssessment = {
  role: string;
  company: string | null;
  readiness: FlightPlanReadiness;
  summary: string;
  brutalTruth: string;
  missingSkills: { skill: string; why: string; fix: string }[];
  cvNotes: { issue: string; note: string; rewrite: string }[];
  preparationRoadmap: { step: string; action: string; outcome: string; proof: string }[];
  gitlab: FlightPlanGitLabReview;
  market: {
    status: "live" | "unavailable";
    note: string;
    sources: FlightPlanMarketSource[];
  };
  generatedAt: string;
};

type GitLabProject = {
  id?: number;
  name?: string;
  path_with_namespace?: string;
  description?: string | null;
  default_branch?: string | null;
};

type GitLabTreeEntry = { path?: string; type?: string };

const text = (value: unknown, max: number) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

function isGitLabUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)gitlab\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function projectPathFromGitLabUrl(value: string): { origin: string; path: string } | null {
  if (!isGitLabUrl(value)) return null;
  const url = new URL(value);
  const path = (url.pathname.split("/-/")[0] ?? "").replace(/^\/+|\/+$/g, "");
  return path ? { origin: url.origin, path } : null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`GitLab returned HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function inspectGitLab(
  url: string | null,
  state: CareerState,
): Promise<FlightPlanGitLabReview> {
  const savedGitLabUrl = state.projects.find((project) =>
    isGitLabUrl(project.projectUrl ?? ""),
  )?.projectUrl;
  const candidateUrl = url || savedGitLabUrl || null;

  if (!candidateUrl) {
    return {
      connected: false,
      inspected: false,
      url: null,
      projectName: null,
      qualityScore: null,
      signals: [],
      note: "No GitLab project is connected. Add a public GitLab project URL to verify proof.",
    };
  }

  const project = projectPathFromGitLabUrl(candidateUrl);
  if (!project) {
    return {
      connected: true,
      inspected: false,
      url: candidateUrl,
      projectName: null,
      qualityScore: null,
      signals: [],
      note: "This is not a valid public GitLab.com project URL, so the repository could not be inspected.",
    };
  }

  try {
    const encodedPath = encodeURIComponent(project.path);
    const metadata = await fetchJson<GitLabProject>(
      `${project.origin}/api/v4/projects/${encodedPath}`,
    );
    const tree = metadata.id
      ? await fetchJson<GitLabTreeEntry[]>(
          `${project.origin}/api/v4/projects/${metadata.id}/repository/tree?recursive=true&per_page=100`,
        )
      : [];
    const paths = tree.map((entry) => entry.path ?? "").filter(Boolean);
    const lowerPaths = paths.map((entry) => entry.toLowerCase());
    const hasReadme = lowerPaths.some((entry) =>
      /^readme(?:\.|$)/.test(entry.split("/").pop() ?? ""),
    );
    const hasCi = lowerPaths.some((entry) => entry.endsWith(".gitlab-ci.yml"));
    const hasTests = lowerPaths.some((entry) =>
      /(^|\/)(test|tests|spec|specs)(\/|$)|\.(test|spec)\./.test(entry),
    );
    const sourceFiles = lowerPaths.filter((entry) =>
      /\.(ts|tsx|js|jsx|py|java|go|rs|rb|php|cs|cpp|c|vue|svelte)$/.test(entry),
    ).length;
    const signals = [
      hasReadme ? "README is present" : "README is missing",
      hasCi ? "GitLab CI configuration is present" : "No GitLab CI configuration found",
      hasTests ? "Test files are present" : "No obvious test files found",
      sourceFiles > 0 ? `${sourceFiles} source files are visible` : "No source files were visible",
    ];
    const qualityScore = Math.min(
      100,
      (hasReadme ? 25 : 0) +
        (hasCi ? 25 : 0) +
        (hasTests ? 25 : 0) +
        (sourceFiles > 0 ? 15 : 0) +
        (metadata.description ? 10 : 0),
    );

    return {
      connected: true,
      inspected: true,
      url: candidateUrl,
      projectName: metadata.path_with_namespace || metadata.name || project.path,
      qualityScore,
      signals,
      note: "Public repository structure was checked for documentation, tests, source files, and GitLab CI.",
    };
  } catch (error) {
    console.error("[CareerPilot][flightplan] GitLab inspection failed", {
      url: candidateUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      connected: true,
      inspected: false,
      url: candidateUrl,
      projectName: null,
      qualityScore: null,
      signals: [],
      note: "GitLab is connected, but this repository could not be read. Check that the project is public and try again.",
    };
  }
}

function toMarketSources(results: TavilyResult[]): FlightPlanMarketSource[] {
  return results.slice(0, 5).map((result) => ({
    title: text(result.title, 180),
    url: result.url,
    publishedDate: result.publishedDate ?? null,
    summary: text(result.content, 320),
  }));
}

function fallbackAssessment(
  role: string,
  company: string | null,
  state: CareerState,
  gitlab: FlightPlanGitLabReview,
  market: FlightPlanAssessment["market"],
  reason: string,
): FlightPlanAssessment {
  const missingSkills = state.gaps
    .filter(
      (gap) => gap.status === "missing" || gap.status === "no_evidence" || gap.status === "partial",
    )
    .slice(0, 6)
    .map((gap) => ({
      skill: gap.skill,
      why:
        gap.whyItMatters ||
        "This requirement is not yet backed by strong evidence in your profile.",
      fix: gap.action || gap.proofTask || `Build and document one ${gap.skill} project.`,
    }));
  const roadmap = missingSkills.slice(0, 4).map((gap, index) => ({
    step: `Priority ${index + 1}`,
    action: gap.fix,
    outcome: `You can explain and demonstrate ${gap.skill}.`,
    proof: `Add ${gap.skill} to a public project with a short README and a measurable result.`,
  }));

  return {
    role,
    company,
    readiness: state.resume.hasResume || state.projects.length ? "needs_review" : "not_ready",
    summary: `The detailed AI assessment is temporarily unavailable. Your current profile still needs a manual review before applying for ${role}.`,
    brutalTruth: reason,
    missingSkills,
    cvNotes: state.resume.weaknesses.slice(0, 4).map((weakness) => ({
      issue: weakness,
      note: "This weakness was already found in your saved resume analysis.",
      rewrite: "Rewrite this section with a specific action, technology, and measurable result.",
    })),
    preparationRoadmap: roadmap,
    gitlab,
    market,
    generatedAt: new Date().toISOString(),
  };
}

const SYSTEM = `You are CareerPilot's brutally honest job-readiness assessor. Compare a student's real evidence against one specific job description and current market signals.

Return ONLY JSON:
{
  "readiness": "ready" | "almost_ready" | "not_ready",
  "summary": string (max 260 chars),
  "brutal_truth": string (max 320 chars),
  "missing_skills": [{"skill": string, "why": string, "fix": string}] (max 8),
  "cv_notes": [{"issue": string, "note": string, "rewrite": string}] (max 6),
  "preparation_roadmap": [{"step": string, "action": string, "outcome": string, "proof": string}] (max 6)
}

Rules:
- Judge the CV or self-description against the exact JD, not a generic career path.
- Never invent experience, skills, projects, company requirements, salary, or hiring outcomes.
- A resume mention is a claim; project or repository evidence is stronger proof.
- Explain how to fix each gap with a concrete practice task, CV change, or portfolio proof.
- If the candidate is missing a CV, say that clearly and use the self-description only as provisional evidence.
- Treat the market research as context, not proof of this company's exact requirements.
- Be direct and specific, never insulting or vague.`;

export async function assessFlightPlan(
  supabase: Client,
  userId: string,
  input: {
    role: string;
    company: string | null;
    jobDescription: string;
    selfDescription: string | null;
    gitlabUrl: string | null;
  },
): Promise<FlightPlanAssessment> {
  const state = await buildCareerState(supabase, userId);
  if (!state.resume.hasResume && !input.selfDescription) {
    throw new Error("Upload a CV first, or confirm that you have no CV and describe yourself.");
  }

  const marketQuery = `${input.company ? `${input.company} ` : ""}${input.role} hiring requirements skills engineering job description 2026`;
  const marketPromise = (async (): Promise<FlightPlanAssessment["market"]> => {
    try {
      const research = await tavilySearch(marketQuery, { maxResults: 5, searchDepth: "basic" });
      return {
        status: "live",
        note: "Fresh web signals were included for this assessment.",
        sources: toMarketSources(research.results),
      };
    } catch (error) {
      console.error("[CareerPilot][flightplan] live market search failed", {
        userId,
        role: input.role,
        company: input.company,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        status: "unavailable",
        note: "Live market search was unavailable, so the assessment will rely on the JD and your internal profile evidence.",
        sources: [],
      };
    }
  })();

  // These checks are independent. Running them together removes an avoidable
  // 8-second wait before the assessment can even reach the AI provider.
  const [market, gitlab] = await Promise.all([
    marketPromise,
    inspectGitLab(input.gitlabUrl, state),
  ]);
  const groundedEvidence = formatEvidenceContext(
    await retrieveGroundedEvidence(
      supabase,
      userId,
      `${input.company ?? ""} ${input.role} exact job requirements and proof expectations\n${input.jobDescription}`,
      input.role,
    ),
  );
  const candidate = [
    careerStateToPrompt(state),
    `CV status: ${state.resume.hasResume ? "A saved CV analysis is available." : "No CV is available."}`,
    input.selfDescription
      ? `Self-description supplied for this assessment:\n${input.selfDescription}`
      : "No self-description supplied.",
    `GitLab review: ${gitlab.note}${gitlab.signals.length ? ` Signals: ${gitlab.signals.join("; ")}` : ""}`,
    `Grounded role evidence:\n${groundedEvidence}`,
  ].join("\n\n");
  const marketContext = market.sources
    .map((source) => `- ${source.title}: ${source.summary}`)
    .join("\n");

  try {
    const raw = await groqChat(
      [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `TARGET ROLE: ${input.role}\nCOMPANY: ${input.company || "Not specified"}\n\nJOB DESCRIPTION:\n${input.jobDescription}\n\nCANDIDATE EVIDENCE:\n${candidate}\n\nCURRENT MARKET SIGNALS:\n${marketContext || "Live market signals were unavailable; do not invent them."}`,
        },
      ],
      { maxTokens: 1800, temperature: 0.2, timeoutMs: 15_000, totalTimeoutMs: 25_000 },
    );
    const output = parseJsonObject<Record<string, unknown>>(raw);
    const readiness = ["ready", "almost_ready", "not_ready"].includes(String(output["readiness"]))
      ? (String(output["readiness"]) as FlightPlanReadiness)
      : "needs_review";
    return {
      role: input.role,
      company: input.company,
      readiness,
      summary: text(output["summary"], 260) || "The assessment did not return a summary.",
      brutalTruth:
        text(output["brutal_truth"], 320) ||
        "Your application should not be sent until the missing evidence is addressed.",
      missingSkills: Array.isArray(output["missing_skills"])
        ? output["missing_skills"]
            .slice(0, 8)
            .map((item) => {
              const row = (item ?? {}) as Record<string, unknown>;
              return {
                skill: text(row["skill"], 100),
                why: text(row["why"], 240),
                fix: text(row["fix"], 320),
              };
            })
            .filter((item) => item.skill)
        : [],
      cvNotes: Array.isArray(output["cv_notes"])
        ? output["cv_notes"]
            .slice(0, 6)
            .map((item) => {
              const row = (item ?? {}) as Record<string, unknown>;
              return {
                issue: text(row["issue"], 120),
                note: text(row["note"], 260),
                rewrite: text(row["rewrite"], 320),
              };
            })
            .filter((item) => item.issue)
        : [],
      preparationRoadmap: Array.isArray(output["preparation_roadmap"])
        ? output["preparation_roadmap"]
            .slice(0, 6)
            .map((item) => {
              const row = (item ?? {}) as Record<string, unknown>;
              return {
                step: text(row["step"], 80),
                action: text(row["action"], 320),
                outcome: text(row["outcome"], 240),
                proof: text(row["proof"], 320),
              };
            })
            .filter((item) => item.action)
        : [],
      gitlab,
      market,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[CareerPilot][flightplan] AI assessment failed", {
      userId,
      role: input.role,
      company: input.company,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallbackAssessment(
      input.role,
      input.company,
      state,
      gitlab,
      market,
      "Your saved evidence does not yet give enough detail for a confident role-specific verdict.",
    );
  }
}
