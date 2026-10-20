import type { SupabaseClient } from "@supabase/supabase-js";

import { matchCompanyTruth } from "@/data/company-truth";
import type { Database } from "@/integrations/supabase/types";
import { clampScore, groqChat, parseJsonObject, stringList } from "./ai.server";
import { syncResumeEvidence } from "./career.server";
import { buildCareerState, careerStateToPrompt } from "./career-state.server";
import { formatEvidenceContext, retrieveGroundedEvidence } from "./intelligence.server";
import { buildCareerContext } from "./mentor.server";
import { saveReadiness } from "./readiness.server";

type Client = SupabaseClient<Database>;

/* ------------------------------------------------------------------ *
 * Text extraction
 * ------------------------------------------------------------------ */

function stripXml(xml: string): string {
  return xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractResumeText(bytes: Uint8Array, fileName: string): Promise<string> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const doc = await getDocumentProxy(bytes);
    const { text } = await extractText(doc, { mergePages: true });
    return String(text ?? "").trim();
  }
  if (lower.endsWith(".docx")) {
    const { unzipSync, strFromU8 } = await import("fflate");
    const files = unzipSync(bytes);
    const doc = files["word/document.xml"];
    if (!doc) throw new Error("That .docx file couldn't be read. Try exporting it as a PDF.");
    return stripXml(strFromU8(doc));
  }
  if (lower.endsWith(".txt")) return new TextDecoder().decode(bytes).trim();
  throw new Error("Unsupported file type. Upload a PDF, DOCX or TXT resume.");
}

/* ------------------------------------------------------------------ *
 * Shared shapes
 * ------------------------------------------------------------------ */

/** A single deterministic ATS formatting check. */
export type FormatCheck = {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

/** A concrete before/after line rewrite the student can copy straight in. */
export type SectionRewrite = { section: string; before: string; after: string };

/** What the CV is being graded against. Empty description = general grade. */
export type ResumeTarget = {
  company: string | null;
  role: string | null;
  jobDescription: string | null;
};

export type AnalysisResult = {
  scope: "general" | "job";
  target_company: string | null;
  target_role: string | null;
  job_description: string | null;
  ats_score: number;
  resume_score: number;
  career_match: number;
  verdict: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  detected_skills: string[];
  recommendations: { title: string; impact: string }[];
  role_matches: { role: string; match: number }[];
  keyword_hits: string[];
  missing_keywords: string[];
  format_audit: FormatCheck[];
  section_rewrites: SectionRewrite[];
};

export const EMPTY_TARGET: ResumeTarget = { company: null, role: null, jobDescription: null };

/* ------------------------------------------------------------------ *
 * Deterministic ATS formatting audit
 *
 * These checks never depend on the AI, so the student always gets an
 * honest, reproducible formatting verdict even when a free-tier model
 * is rate limited.
 * ------------------------------------------------------------------ */

const ACTION_VERBS = [
  "built",
  "designed",
  "developed",
  "implemented",
  "shipped",
  "launched",
  "led",
  "optimized",
  "reduced",
  "increased",
  "automated",
  "migrated",
  "refactored",
  "architected",
  "integrated",
  "deployed",
  "improved",
  "delivered",
  "scaled",
  "engineered",
  "created",
  "resolved",
  "tested",
  "benchmarked",
];

const FILLER_PHRASES = [
  "responsible for",
  "worked on",
  "duties included",
  "team player",
  "hard worker",
  "hard working",
  "passionate about",
  "quick learner",
  "good communication skills",
  "familiar with",
  "helped with",
  "involved in",
];

/** Details recruiters outside your CV's job market treat as noise or bias risk. */
const PRIVATE_DETAILS = [
  "marital status",
  "date of birth",
  "father's name",
  "fathers name",
  "religion",
  "cnic",
  "nationality",
  "gender",
  "age:",
];

const REQUIRED_SECTIONS: { label: string; patterns: RegExp }[] = [
  { label: "Education", patterns: /\beducation|academic|university|degree\b/i },
  { label: "Experience", patterns: /\bexperience|employment|internship|work history\b/i },
  { label: "Skills", patterns: /\b(technical )?skills|technologies|tech stack\b/i },
  { label: "Projects", patterns: /\bprojects?\b/i },
];

function check(label: string, status: FormatCheck["status"], detail: string): FormatCheck {
  return { label, status, detail };
}

/**
 * Grades the mechanical, parser-facing qualities of the CV text.
 * Returns the checks plus a 0-100 formatting score derived from them.
 */
export function auditResumeFormat(
  text: string,
  fileName: string,
): { checks: FormatCheck[]; formatScore: number } {
  const lower = text.toLowerCase();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean).length;
  const checks: FormatCheck[] = [];

  // 1. Contact essentials — an ATS that cannot find a contact record drops the row.
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]{2,}/.test(text);
  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(text);
  checks.push(
    hasEmail && hasPhone
      ? check("Contact details", "pass", "Email and phone number were both parsed correctly.")
      : check(
          "Contact details",
          "fail",
          `Missing ${!hasEmail ? "email" : "phone number"}. Put both on the first line as plain text — never inside a header, footer, or image.`,
        ),
  );

  // 2. Proof links — recruiters click before they read.
  const hasGithub = /github\.com\//i.test(text);
  const hasLinkedin = /linkedin\.com\//i.test(text);
  const hasAnyLink = /https?:\/\/|www\./i.test(text);
  checks.push(
    hasGithub && hasLinkedin
      ? check("Proof links", "pass", "GitHub and LinkedIn URLs are both present.")
      : check(
          "Proof links",
          hasAnyLink ? "warn" : "fail",
          `Add a full ${!hasGithub ? "GitHub" : "LinkedIn"} URL as visible text (github.com/yourname), not a clickable word like "portfolio".`,
        ),
  );

  // 3. Length — one page for students, two only with real experience.
  checks.push(
    words >= 320 && words <= 900
      ? check("Length", "pass", `${words} words — the right density for a one-page CV.`)
      : check(
          "Length",
          words < 200 || words > 1200 ? "fail" : "warn",
          words < 320
            ? `Only ${words} words. Too thin to score — expand each project into 2-3 outcome bullets.`
            : `${words} words. Cut to one page by removing coursework, hobbies, and duty-style lines.`,
        ),
  );

  // 4. Quantified impact — the single biggest differentiator on a junior CV.
  const numericLines = lines.filter((l) => /\d+\s?(%|x|k\b|ms\b|s\b|users|requests|rows)/i.test(l));
  checks.push(
    numericLines.length >= 3
      ? check(
          "Quantified impact",
          "pass",
          `${numericLines.length} bullets carry real numbers. This is what separates you from duty-list CVs.`,
        )
      : check(
          "Quantified impact",
          numericLines.length ? "warn" : "fail",
          `Only ${numericLines.length} measurable bullet${numericLines.length === 1 ? "" : "s"}. Every project needs a number: latency, users, rows, test coverage, or % improvement.`,
        ),
  );

  // 5. Action verbs at the start of bullets.
  const verbLines = lines.filter((l) =>
    ACTION_VERBS.some((v) => new RegExp(`^[•\\-*\\s]*${v}\\b`, "i").test(l)),
  );
  checks.push(
    verbLines.length >= 4
      ? check("Action verbs", "pass", `${verbLines.length} bullets open with a strong action verb.`)
      : check(
          "Action verbs",
          verbLines.length ? "warn" : "fail",
          "Start every bullet with a past-tense action verb (Built, Reduced, Automated, Migrated) instead of a noun or pronoun.",
        ),
  );

  // 6. Filler phrases that signal a copied template.
  const foundFillers = FILLER_PHRASES.filter((p) => lower.includes(p));
  checks.push(
    foundFillers.length === 0
      ? check("Filler phrases", "pass", "No empty template phrases detected.")
      : check(
          "Filler phrases",
          foundFillers.length > 2 ? "fail" : "warn",
          `Remove: "${foundFillers.slice(0, 4).join('", "')}". These say nothing a recruiter can verify.`,
        ),
  );

  // 7. Standard section headings the parser looks for by name.
  const missingSections = REQUIRED_SECTIONS.filter((s) => !s.patterns.test(text)).map(
    (s) => s.label,
  );
  checks.push(
    missingSections.length === 0
      ? check("Standard sections", "pass", "Education, Experience, Skills and Projects were found.")
      : check(
          "Standard sections",
          missingSections.length > 1 ? "fail" : "warn",
          `Missing headings: ${missingSections.join(", ")}. Use these exact plain words — ATS parsers match on them literally.`,
        ),
  );

  // 8. Bullet structure — walls of prose do not get read.
  const bulletLines = lines.filter((l) => /^[•▪◦‣·*\-–]/.test(l));
  checks.push(
    bulletLines.length >= 6
      ? check("Bullet structure", "pass", `${bulletLines.length} bullet lines — easy to skim.`)
      : check(
          "Bullet structure",
          "warn",
          "Break paragraphs into single-line bullets. Recruiters skim for 7 seconds before deciding.",
        ),
  );

  // 9. Machine-readable text layer — scanned or image-based CVs score zero.
  checks.push(
    text.replace(/\s/g, "").length >= 900
      ? check("Text layer", "pass", "The file exposes a clean, selectable text layer.")
      : check(
          "Text layer",
          "fail",
          "Very little machine-readable text. If this is a scan or a design export, re-export a text-based PDF from Word or Google Docs.",
        ),
  );

  // 10. Multi-column / table layout risk. Wide internal whitespace runs are the
  // signature of a two-column template collapsing during extraction.
  const columnishLines = lines.filter((l) => /\S {4,}\S/.test(l));
  const columnRatio = lines.length ? columnishLines.length / lines.length : 0;
  checks.push(
    columnRatio < 0.2
      ? check("Single-column layout", "pass", "Reads as a single column — parses cleanly.")
      : check(
          "Single-column layout",
          columnRatio > 0.4 ? "fail" : "warn",
          "Looks like a two-column or table-based template. ATS parsers read left-to-right and scramble columns — switch to one column.",
        ),
  );

  // 11. First-person pronouns.
  checks.push(
    !/\b(I|my|me)\b/.test(text)
      ? check("Professional voice", "pass", "No first-person pronouns.")
      : check(
          "Professional voice",
          "warn",
          'Drop "I", "my" and "me". CV bullets are written in implied first person.',
        ),
  );

  // 12. Private details that only add bias risk.
  const foundPrivate = PRIVATE_DETAILS.filter((p) => lower.includes(p));
  checks.push(
    foundPrivate.length === 0
      ? check("No bias-risk details", "pass", "No date of birth, marital status, or ID numbers.")
      : check(
          "No bias-risk details",
          "warn",
          `Delete ${foundPrivate.join(", ")}. It wastes prime space and invites bias — most global employers expect it removed.`,
        ),
  );

  // 13. File format.
  const isPdf = fileName.toLowerCase().endsWith(".pdf");
  checks.push(
    isPdf
      ? check("File format", "pass", "PDF — preserves layout across every ATS.")
      : check(
          "File format",
          "warn",
          "Submit a PDF unless the posting explicitly asks for .docx. Name it FirstName-LastName-Role.pdf.",
        ),
  );

  const weights = { pass: 1, warn: 0.5, fail: 0 };
  const formatScore = Math.round(
    (checks.reduce((sum, c) => sum + weights[c.status], 0) / checks.length) * 100,
  );

  return { checks, formatScore };
}

/* ------------------------------------------------------------------ *
 * Job-description keyword matching
 * ------------------------------------------------------------------ */

/** Concrete, matchable hiring vocabulary. Generic words are deliberately absent. */
const TECH_VOCAB = [
  "javascript",
  "typescript",
  "python",
  "java",
  "c#",
  ".net",
  "c++",
  "go",
  "golang",
  "rust",
  "ruby",
  "php",
  "kotlin",
  "swift",
  "dart",
  "scala",
  "sql",
  "bash",
  "react",
  "react native",
  "next.js",
  "vue",
  "angular",
  "svelte",
  "node.js",
  "express",
  "nestjs",
  "django",
  "flask",
  "fastapi",
  "spring boot",
  "laravel",
  "rails",
  "asp.net",
  "flutter",
  "tailwind",
  "redux",
  "zustand",
  "tanstack query",
  "graphql",
  "rest api",
  "grpc",
  "websockets",
  "postgresql",
  "mysql",
  "sql server",
  "oracle",
  "mongodb",
  "redis",
  "elasticsearch",
  "dynamodb",
  "firebase",
  "supabase",
  "prisma",
  "sequelize",
  "docker",
  "kubernetes",
  "terraform",
  "jenkins",
  "github actions",
  "gitlab ci",
  "ci/cd",
  "aws",
  "azure",
  "gcp",
  "vercel",
  "netlify",
  "render",
  "railway",
  "cloudflare",
  "lambda",
  "serverless",
  "microservices",
  "kafka",
  "rabbitmq",
  "celery",
  "linux",
  "nginx",
  "git",
  "jira",
  "agile",
  "scrum",
  "jest",
  "vitest",
  "cypress",
  "playwright",
  "selenium",
  "junit",
  "xunit",
  "pytest",
  "unit testing",
  "integration testing",
  "tdd",
  "oop",
  "solid",
  "design patterns",
  "data structures",
  "algorithms",
  "system design",
  "pandas",
  "numpy",
  "pytorch",
  "tensorflow",
  "scikit-learn",
  "machine learning",
  "deep learning",
  "nlp",
  "llm",
  "computer vision",
  "power bi",
  "tableau",
  "etl",
  "data warehouse",
  "spark",
  "airflow",
  "figma",
  "html",
  "css",
  "sass",
  "webpack",
  "vite",
  "oauth",
  "jwt",
  "authentication",
  "authorization",
  "rbac",
  "stripe",
  "swagger",
  "openapi",
  "redis cache",
  "caching",
  "indexing",
  "query optimization",
  "load balancing",
  "observability",
  "monitoring",
  "sentry",
  "accessibility",
  "responsive design",
  "seo",
  "web vitals",
];

/**
 * Pulls concrete, checkable requirements out of a job description:
 * known tech vocabulary plus capitalised proper nouns the posting repeats.
 */
export function extractJobKeywords(jobDescription: string, max = 26): string[] {
  const lower = jobDescription.toLowerCase();
  const found = new Set<string>();

  for (const term of TECH_VOCAB) {
    // Word-boundary match so "go" does not fire inside "google".
    const pattern = new RegExp(`(^|[^a-z0-9+#.])${escapeRegex(term)}([^a-z0-9+#]|$)`, "i");
    if (pattern.test(lower)) found.add(term);
  }

  // Capitalised multi-word tools the vocabulary does not know about yet.
  const proper = jobDescription.match(/\b[A-Z][a-zA-Z0-9.+#]{2,}(?: [A-Z][a-zA-Z0-9.+#]{2,})?\b/g);
  for (const raw of proper ?? []) {
    const value = raw.trim();
    if (value.length < 3 || value.length > 24) continue;
    if (STOP_PROPER.has(value.toLowerCase())) continue;
    if ([...found].some((f) => f.toLowerCase() === value.toLowerCase())) continue;
    if (found.size >= max) break;
    found.add(value.toLowerCase());
  }

  return [...found].slice(0, max);
}

const STOP_PROPER = new Set([
  "the",
  "you",
  "we",
  "our",
  "your",
  "this",
  "they",
  "and",
  "for",
  "with",
  "about",
  "role",
  "team",
  "job",
  "company",
  "position",
  "responsibilities",
  "requirements",
  "qualifications",
  "benefits",
  "experience",
  "years",
  "apply",
  "please",
  "must",
  "should",
  "will",
  "have",
  "strong",
  "good",
  "excellent",
  "bachelor",
  "master",
  "degree",
  "monday",
  "friday",
  "full",
  "part",
  "time",
  "remote",
  "onsite",
  "hybrid",
  "office",
  "candidate",
  "candidates",
  "engineer",
  "engineers",
  "developer",
  "developers",
  "description",
]);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Splits job keywords into the ones the CV proves and the ones it misses. */
export function matchKeywords(
  resumeText: string,
  keywords: string[],
): { hits: string[]; missing: string[] } {
  const lower = resumeText.toLowerCase();
  const hits: string[] = [];
  const missing: string[] = [];
  for (const keyword of keywords) {
    const pattern = new RegExp(`(^|[^a-z0-9+#.])${escapeRegex(keyword)}([^a-z0-9+#]|$)`, "i");
    (pattern.test(lower) ? hits : missing).push(keyword);
  }
  return { hits, missing };
}

/**
 * Reads an uploaded resume, runs the ATS analysis, and stores the result.
 * This is intentionally server-only: the private storage file never reaches
 * the browser as a public URL.
 */
export async function analyzeStoredResume(
  supabase: Client,
  userId: string,
  resumeId: string,
): Promise<AnalysisResult & { id: string }> {
  const { data: resume, error: resumeError } = await supabase
    .from("resumes")
    .select("id, file_name, file_path")
    .eq("id", resumeId)
    .eq("user_id", userId)
    .single();
  if (resumeError || !resume)
    throw new Error("Resume not found or no longer belongs to this account.");

  const { data: file, error: downloadError } = await supabase.storage
    .from("resumes")
    .download(resume.file_path);
  if (downloadError || !file) throw new Error("We could not read your uploaded resume.");

  const resumeText = await extractResumeText(
    new Uint8Array(await file.arrayBuffer()),
    resume.file_name,
  );
  if (!resumeText) throw new Error("No readable text was found in this resume.");
  console.info("[CareerPilot][analyzeResume] extracted text", {
    userId,
    resumeId,
    fileName: resume.file_name,
    textLength: resumeText.length,
  });

  const { checks, formatScore } = auditResumeFormat(resumeText, resume.file_name);
  const goal = await supabase
    .from("career_goals")
    .select("target_role")
    .eq("user_id", userId)
    .maybeSingle();
  const targetRole = goal.data?.target_role ?? null;
  const groundedEvidence = formatEvidenceContext(
    await retrieveGroundedEvidence(
      supabase,
      userId,
      "resume ATS requirements, role fit, proof gaps, and recruiter rejection reasons",
      targetRole,
    ),
  );

  /* ---------- Short optional AI enhancement ----------
   * The deterministic ATS scan is the source of truth and is always saved.
   * AI must not hold the upload hostage for multiple provider retries.
   */
  const system =
    "You are an ATS resume reviewer. Return ONLY a single JSON object (no markdown, no code fences) with these exact keys: summary (string), strengths (array of strings), weaknesses (array of strings), detected_skills (array of strings), recommendations (array of {title, impact}), role_matches (array of {role, match} where match is a number 0-100). Be specific and concise. Use the grounded evidence below for role claims. Never call an unverified resume mention proven.\n\n<grounded_evidence>\n" +
    groundedEvidence +
    "\n</grounded_evidence>";
  let parsed: Record<string, unknown> = {};
  let aiFailed = false;
  for (let attempt = 0; attempt < 1; attempt++) {
    try {
      const raw = await groqChat(
        [
          { role: "system", content: system },
          {
            role: "user",
            content: `Target role: ${targetRole ?? "not specified"}\nResume:\n${resumeText.slice(0, 12000)}`,
          },
        ],
        {
          json: true,
          maxTokens: 900,
          temperature: 0.2,
          timeoutMs: 8_000,
          totalTimeoutMs: 12_000,
        },
      );
      parsed = parseJsonObject<Record<string, unknown>>(raw);
      // If the provider returns an empty/partial object, use deterministic data.
      if (!parsed["strengths"] && !parsed["detected_skills"]) aiFailed = true;
    } catch (error) {
      console.warn(`[Resume] AI analysis attempt ${attempt + 1} failed.`, {
        error: error instanceof Error ? error.message : String(error),
        attempt: attempt + 1,
      });
      if (attempt === 1) aiFailed = true;
    }
  }

  /* ---------- Deterministic fallback skill extraction ---------- */
  const strings = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string").slice(0, 15)
      : [];

  let detectedSkills = strings(parsed["detected_skills"]);
  if (detectedSkills.length === 0) {
    // Fallback: scan resume text against the known tech vocabulary
    const lower = resumeText.toLowerCase();
    detectedSkills = TECH_VOCAB.filter((term) => {
      const pattern = new RegExp(`(^|[^a-z0-9+#.])${escapeRegex(term)}([^a-z0-9+#]|$)`, "i");
      return pattern.test(lower);
    }).slice(0, 15);
  }

  /* ---------- Deterministic fallback strengths & weaknesses ---------- */
  let strengths = strings(parsed["strengths"]);
  let weaknesses = strings(parsed["weaknesses"]);
  if (strengths.length === 0 && weaknesses.length === 0) {
    const passed = checks.filter((c) => c.status === "pass");
    const failed = checks.filter((c) => c.status === "fail");
    const warned = checks.filter((c) => c.status === "warn");
    strengths = passed.slice(0, 5).map((c) => c.label + ": " + c.detail);
    weaknesses = [...failed, ...warned].slice(0, 5).map((c) => c.label + ": " + c.detail);
  }

  /* ---------- Deterministic fallback recommendations ---------- */
  let recommendations = Array.isArray(parsed["recommendations"])
    ? (parsed["recommendations"] as Record<string, unknown>[])
        .filter((item): item is Record<string, unknown> =>
          Boolean(
            item &&
            typeof item === "object" &&
            typeof (item as Record<string, unknown>)["title"] === "string",
          ),
        )
        .map((item) => ({
          title: String(item["title"] ?? ""),
          impact: String(item["impact"] ?? ""),
        }))
        .slice(0, 8)
    : [];
  if (recommendations.length === 0) {
    const failed = checks.filter((c) => c.status === "fail");
    const warned = checks.filter((c) => c.status === "warn");
    recommendations = [...failed, ...warned].slice(0, 5).map((c) => ({
      title: `Fix: ${c.label}`,
      impact: c.detail,
    }));
  }
  const rawRoleMatches = parsed["role_matches"];
  const roleMatches = Array.isArray(rawRoleMatches)
    ? rawRoleMatches
        .filter((item): item is { role: string; match: number } => {
          if (!item || typeof item !== "object") return false;
          const rec = item as Record<string, unknown>;
          if (typeof rec["role"] !== "string") return false;
          // AI models sometimes return strings like "High (≈80%)" — coerce to a number.
          const m = rec["match"];
          return typeof m === "number" || typeof m === "string";
        })
        .map((item) => {
          const raw = (item as Record<string, unknown>)["match"];
          let match: number;
          if (typeof raw === "number") {
            match = raw;
          } else if (typeof raw === "string") {
            // Try to extract a number from strings like "80%", "≈80%", "High (≈80%)"
            const extracted = raw.match(/(\d+)/);
            match = extracted?.[1] ? parseInt(extracted[1], 10) : 0;
          } else {
            match = 0;
          }
          return {
            role: (item as Record<string, unknown>)["role"] as string,
            match: Math.max(0, Math.min(100, Math.round(match))),
          };
        })
        .slice(0, 6)
    : [];
  const result = {
    scope: "general" as const,
    target_company: null,
    target_role: targetRole,
    job_description: null,
    ats_score: formatScore,
    resume_score: formatScore,
    career_match: Math.max(0, Math.min(100, roleMatches[0]?.match ?? formatScore)),
    verdict:
      typeof parsed["verdict"] === "string"
        ? parsed["verdict"]
        : aiFailed
          ? "AI analysis unavailable — showing ATS formatting checks only."
          : "Your resume has been checked for ATS readability and recruiter proof.",
    summary:
      typeof parsed["summary"] === "string"
        ? parsed["summary"]
        : aiFailed
          ? `ATS format score: ${formatScore}/100. AI skill extraction and recommendations were generated from deterministic analysis because the AI service was unavailable.`
          : "Your resume was analyzed with deterministic ATS formatting checks.",
    strengths,
    weaknesses,
    detected_skills: detectedSkills,
    recommendations,
    role_matches: roleMatches,
    keyword_hits: [],
    missing_keywords: [],
    format_audit: checks,
    section_rewrites: [],
  } satisfies AnalysisResult;

  const { data: analysis, error: insertError } = await supabase
    .from("resume_analyses")
    .insert({
      user_id: userId,
      resume_id: resume.id,
      ats_score: result.ats_score,
      resume_score: result.resume_score,
      career_match: result.career_match,
      summary: result.summary,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      detected_skills: result.detected_skills,
      recommendations: result.recommendations,
      role_matches: result.role_matches,
      verdict: result.verdict,
      format_audit: result.format_audit,
    })
    .select("id")
    .single();
  if (insertError || !analysis)
    console.error("[CareerPilot][analyzeResume] analysis insert failed", {
      userId,
      resumeId,
      error: insertError?.message ?? "No analysis row returned",
    });
  if (insertError || !analysis)
    throw insertError ?? new Error("Could not save the resume analysis.");

  await supabase
    .from("resumes")
    .update({ content_text: resumeText })
    .eq("id", resume.id)
    .eq("user_id", userId);
  return { ...result, id: analysis.id };
}
