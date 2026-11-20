import type { SupabaseClient } from "@supabase/supabase-js";

import { matchCompanyTruth, type CompanyHiringTruth } from "@/data/company-truth";
import type { Database } from "@/integrations/supabase/types";
import { clampScore, groqChat, parseJsonObject, stringList } from "./ai.server";
import { consumeAiCall } from "./billing.server";
import { buildCareerState, careerStateToPrompt, type CareerState } from "./career-state.server";
import { getCompanyDashboard, type CompanyDashboard } from "./companies/company.server";
import {
  classifyRequirement,
  type EvidenceInput,
} from "./evidence/matching";
import { buildRetrievalContext, retrieveCandidateEvidence } from "./evidence/retrieval";
import type { GapLevel } from "./evidence/schemas";
import { knownSkills, normalizeSkill } from "./evidence/skill-aliases";
import { formatEvidenceContext, retrieveGroundedEvidence } from "./intelligence.server";
import {
  auditResumeFormat,
  extractJobKeywords,
  extractResumeText,
  type FormatCheck,
} from "./resume.server";

type Client = SupabaseClient<Database>;
type AnyClient = SupabaseClient<any>;

/* ------------------------------------------------------------------ */
/*  Honesty contract for this module (read before changing it)         */
/* ------------------------------------------------------------------ */
/*
 * The LLM writes NARRATIVE and QUESTIONS ONLY — never scores, never
 * company facts, never probabilities. Every number in an audit comes
 * from the deterministic rubric (computeBaselineScore), the deterministic
 * evidence matcher (evidence/matching.ts), or plain counting over real
 * rows. The model is never even asked for a score: the prompt requests
 * narrative fields only, and any numeric field the model returns is
 * ignored. A fallback may degrade, never impersonate: when research or
 * AI is unavailable, the affected stage says so explicitly instead of
 * substituting invented content.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type BrutalVerdict = {
  category: string;
  severity: "fatal" | "critical" | "strong";
  assessment: string;
  whatToFix: string;
};

/** One deterministic check in the Stage 1 resume screen. */
export type ResumeScreenCheck = {
  kind: "skill" | "knockout" | "format";
  label: string;
  /** "unknown" means the check could not be run — shown, never hidden. */
  status: "pass" | "fail" | "warn" | "unknown";
  detail: string;
  /** e.g. "Resume line 12: \"Built a REST API in Node.js\"" — skill checks only. */
  lineRef?: string;
};

/** Stage 1 — the 6-second resume screen. A checklist, not a score. */
export type ResumeScreenStage = {
  available: boolean;
  unavailableReason?: string;
  /** Where the must-have list came from. */
  source: "job-description" | "company-bar" | "none";
  skillChecks: ResumeScreenCheck[];
  knockoutChecks: ResumeScreenCheck[];
  formatChecks: FormatCheck[];
  jdKeywords: string[];
};

/** One claimed skill and the proof (or lack of it) behind it. */
export type EvidenceAuditItem = {
  skill: string;
  level: GapLevel;
  reason: string;
  proof: { label: string; url: string | null } | null;
};

/** Stage 2 — claimed vs demonstrated. */
export type EvidenceAuditStage = {
  claimedSkills: number;
  skillsWithProof: number;
  /**
   * Share of claimed skills with linked proof (0-100). This is the only
   * headline number the audit produces, and it is labelled "evidence
   * coverage" in the UI — never a hiring probability.
   */
  evidenceCoverage: number;
  items: EvidenceAuditItem[];
};

export type BarComparisonItem = {
  item: string;
  status: "meets" | "partial" | "missing";
  evidence: string;
  sourceLabel: string;
  sourceUrl: string | null;
  retrievedAt: string;
};

/**
 * Stage 3 — comparison against the RESEARCHED company bar only. When no
 * researched profile exists the stage is skipped with an explicit
 * "unknown" state; the unverified static dataset is never used as a bar.
 */
export type BarComparisonStage =
  | {
      state: "compared";
      companyName: string;
      items: BarComparisonItem[];
      retrievedAt: string;
      origin: "researched";
    }
  | { state: "unknown"; reason: string };

export type MockInterviewQuestion = {
  id: string;
  question: string;
  focus: string;
  source: "jd" | "company" | "evidence-gap" | "general";
};

/** Stage 4 — mock interview questions (LLM-drafted, grounded, or templates). */
export type MockInterviewStage = {
  generatedBy: "ai" | "template";
  generatedNote: string;
  questions: MockInterviewQuestion[];
};

export type RecruiterVerdict = {
  band: "ready" | "one_gap" | "not_yet";
  headline: string;
  /** Top fixes, each naming the stage it came from. */
  topFixes: { fix: string; stage: string }[];
  /** The single highest-value next action. */
  nextAction: { label: string; detail: string; stage: string };
};

export type CompanyProvenance = {
  name: string;
  origin: "researched" | "seed" | "unavailable";
  sourceLabel: string;
  retrievedAt: string | null;
  sources: { url: string; label: string }[];
};

export type RecruiterAudit = {
  scoreVersion?: "deterministic-evidence-v1";
  /** Deterministic evidence-rubric score (0-100). Labelled "evidence rubric" in the UI. */
  overallScore: number;
  /**
   * Legacy columns kept for the recruiter_sessions schema. They mirror
   * the rubric score and must NEVER be presented as hiring/rejection
   * probabilities — the UI does not render them at all.
   */
  hireChance: number;
  rejectChance: number;
  verdictTier: string;
  headline: string;
  brutalVerdicts: BrutalVerdict[];
  missingCritical: string[];
  whatYouNeedToBuild: {
    title: string;
    description: string;
    techStack: string[];
  };
  interviewPrediction: string;
  recruiterQuestions: string[];
  expectVsHave: { item: string; companyExpects: boolean; youHave: boolean }[];
  /* Staged outputs (absent on audits run before the 2026-11-20 rebuild). */
  resumeScreen?: ResumeScreenStage;
  evidenceAudit?: EvidenceAuditStage;
  barComparison?: BarComparisonStage;
  mockInterview?: MockInterviewStage;
  verdict?: RecruiterVerdict;
  companyProvenance?: CompanyProvenance;
  jobDescriptionUsed?: boolean;
};

export type RecruiterSession = {
  id: string;
  companyId: string;
  companyName: string;
  targetRole: string;
  overallScore: number;
  hireChance: number;
  rejectChance: number;
  verdictTier: string;
  auditResult: RecruiterAudit;
  chatMessages: { role: "recruiter" | "student"; content: string }[];
  createdAt: string;
};

/** One criterion of the deterministic mock-answer rubric (0-2 each, 6 total). */
export type MockRubricCriterion = {
  criterion: "structure" | "specificity" | "evidence";
  score: number;
  max: number;
  reason: string;
};

export type MockInterviewAttempt = {
  id: string;
  questionId: string;
  question: string;
  answer: string;
  totalScore: number;
  rubric: MockRubricCriterion[];
  timeSpentSeconds: number;
  createdAt: string;
};

export type MockAttemptSummary = {
  attempts: MockInterviewAttempt[];
  totalAttempts: number;
  averageTotal: number | null;
  bestTotal: number | null;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const text = (value: unknown, max: number) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

type ResumeLines = { number: number; text: string }[];

function toLines(resumeText: string): ResumeLines {
  return resumeText
    .split(/\r?\n/)
    .map((line, index) => ({ number: index + 1, text: line.trim() }))
    .filter((line) => line.text.length > 0);
}

function wordPattern(term: string): RegExp {
  return new RegExp(`(^|[^a-z0-9+#.])${escapeRegex(term)}([^a-z0-9+#]|$)`, "i");
}

/**
 * Find the first resume line that evidences a skill. Single-word skills
 * match on a word boundary; multi-word phrases match on the full phrase
 * first, then on any significant word. Returns the line + excerpt for
 * the UI, or null when the skill is absent.
 */
function findSkillLine(lines: ResumeLines, skill: string): ResumeLines[number] | null {
  const trimmed = skill.trim();
  if (!trimmed) return null;
  const phrase = wordPattern(trimmed);
  for (const line of lines) {
    if (phrase.test(line.text)) return line;
  }
  const words = trimmed
    .toLowerCase()
    .split(/[\s&,/()]+/)
    .filter((w) => w.length > 2);
  if (words.length <= 1) return null;
  for (const line of lines) {
    const lower = line.text.toLowerCase();
    if (words.some((w) => wordPattern(w).test(lower))) return line;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Coach system prompt (replaces the "Head of Talent" roleplay)       */
/* ------------------------------------------------------------------ */

function coachSystemPrompt(company: CompanyHiringTruth, role: string): string {
  return `You are a recruiter-style interview COACH helping a student prepare for a ${role} role at ${company.name}.
You are NOT an employee of ${company.name}, NOT its Head of Talent, and NOT on its hiring panel — never claim to be, and never speak as if you decide who gets hired.

Your personality:
- Relentlessly honest — you do NOT sugarcoat.
- You evaluate candidates the way a real hiring panel would, from the evidence in front of you.
- You speak directly, professionally, but with zero flattery.

Company context (from CareerPilot's hiring dataset for ${company.name}):
- Category: ${company.category}
- Primary Stack: ${company.primaryStack.join(", ")}
- Non-Negotiables: ${company.hiringBar.nonNegotiables.map((n) => `${n.skill} (${n.level})`).join("; ")}
- Top Rejection Reasons: ${company.rejectionTruths.map((r) => r.title).join("; ")}

Rules:
- Never invent skills or experience the candidate doesn't have.
- Never invent facts about ${company.name} beyond the context above.
- Never give a score, a percentage chance, or a hiring probability. You write narrative feedback and interview questions only; all scoring is done by CareerPilot's deterministic rubric.
- If they have zero production projects, say it bluntly.
- If their skills are all claimed with no proof, call it out.
- Output ONLY valid JSON when asked for structured data.
- In chat mode, respond as the coach in natural language (no JSON).`;
}

/* ------------------------------------------------------------------ */
/*  Deterministic Baseline Scoring (kept from the original rubric)     */
/* ------------------------------------------------------------------ */

function computeBaselineScore(
  state: CareerState,
  company: CompanyHiringTruth,
): { score: number; verdicts: BrutalVerdict[]; expectVsHave: RecruiterAudit["expectVsHave"] } {
  let score = 0;
  const verdicts: BrutalVerdict[] = [];
  const expectVsHave: RecruiterAudit["expectVsHave"] = [];

  // --- Resume quality (0–20 points) ---
  const ats = state.resume.atsScore ?? 0;
  const resumeScore = state.resume.resumeScore ?? 0;
  const resumeAvg = (ats + resumeScore) / 2;
  score += Math.round((resumeAvg / 100) * 20);

  if (!state.resume.hasResume) {
    verdicts.push({
      category: "CV Quality",
      severity: "fatal",
      assessment: "No resume uploaded. Without a CV, you cannot even enter the screening pipeline.",
      whatToFix: "Upload a professional, ATS-optimized resume immediately.",
    });
  } else if (resumeAvg < 40) {
    verdicts.push({
      category: "CV Quality",
      severity: "critical",
      assessment: `Your resume scores ${ats}/100 on ATS and ${resumeScore}/100 overall. This will be filtered out before any human sees it.`,
      whatToFix:
        "Rewrite your resume with quantified achievements, remove graphics/skill bars, use single-column ATS format.",
    });
  } else {
    verdicts.push({
      category: "CV Quality",
      severity: resumeAvg >= 70 ? "strong" : "critical",
      assessment: `ATS score: ${ats}/100, Overall: ${resumeScore}/100. ${resumeAvg >= 70 ? "Passes basic screening." : "Borderline — needs improvement."}`,
      whatToFix:
        resumeAvg >= 70
          ? "Minor polish — add more quantified metrics."
          : "Optimize keywords for the target role and add measurable outcomes.",
    });
  }

  // --- Projects (0–25 points) ---
  const projects = state.projects || [];
  const deployedProjects = projects.filter((p) => p.projectUrl && p.projectUrl.startsWith("http"));
  const projectScore = Math.min(25, projects.length * 5 + deployedProjects.length * 5);
  score += projectScore;

  if (projects.length === 0) {
    verdicts.push({
      category: "Project Portfolio",
      severity: "fatal",
      assessment: "Zero projects on record. Every company requires proof of what you can build.",
      whatToFix:
        "Build at least 2 production-grade projects with live deployed URLs and clean GitHub repos.",
    });
  } else if (deployedProjects.length === 0) {
    verdicts.push({
      category: "Project Portfolio",
      severity: "critical",
      assessment: `You have ${projects.length} project(s) but none are live-deployed. Localhost projects are dismissed instantly.`,
      whatToFix:
        "Deploy your best project to Vercel/Render with a public URL and document the architecture in your README.",
    });
  } else {
    verdicts.push({
      category: "Project Portfolio",
      severity: deployedProjects.length >= 2 ? "strong" : "critical",
      assessment: `${deployedProjects.length} deployed project(s) out of ${projects.length} total. ${deployedProjects.length >= 2 ? "Shows initiative." : "Need more deployed work."}`,
      whatToFix:
        deployedProjects.length >= 2
          ? "Add test coverage and CI/CD pipeline documentation."
          : "Deploy at least one more project with proper documentation.",
    });
  }

  // --- Skill coverage vs company non-negotiables (0–30 points) ---
  const studentSkillNames = new Set(state.skills.map((s) => s.name.toLowerCase()));
  const nonNegs = company.hiringBar.nonNegotiables;
  let coveredNonNeg = 0;
  const missingNonNeg: string[] = [];

  for (const nn of nonNegs) {
    const words = nn.skill
      .toLowerCase()
      .split(/[\s&,/]+/)
      .filter((w) => w.length > 2);
    const hasSkill = words.some((w) =>
      [...studentSkillNames].some((s) => s.includes(w) || w.includes(s)),
    );
    if (hasSkill) {
      coveredNonNeg++;
    } else {
      missingNonNeg.push(nn.skill);
    }
    expectVsHave.push({
      item: nn.skill,
      companyExpects: true,
      youHave: hasSkill,
    });
  }

  const skillPct = nonNegs.length > 0 ? coveredNonNeg / nonNegs.length : 0;
  score += Math.round(skillPct * 30);

  verdicts.push({
    category: "Technical Skills",
    severity: skillPct >= 0.7 ? "strong" : skillPct >= 0.4 ? "critical" : "fatal",
    assessment: `You cover ${coveredNonNeg}/${nonNegs.length} of ${company.name}'s non-negotiable skills. ${missingNonNeg.length > 0 ? `Missing: ${missingNonNeg.join(", ")}.` : "All covered."}`,
    whatToFix:
      missingNonNeg.length > 0
        ? `Learn and build proof for: ${missingNonNeg.slice(0, 3).join(", ")}.`
        : "Strengthen evidence for your existing skills with project proof.",
  });

  // --- Evidence strength (0–15 points) ---
  const evidencedSkills = state.skills.filter((s) => s.evidenceStrength > 0);
  const evidencePct = state.skills.length > 0 ? evidencedSkills.length / state.skills.length : 0;
  score += Math.round(evidencePct * 15);

  verdicts.push({
    category: "Interview Readiness",
    severity: evidencePct >= 0.6 ? "strong" : evidencePct >= 0.3 ? "critical" : "fatal",
    assessment: `${evidencedSkills.length}/${state.skills.length} skills have verified evidence beyond self-claims. ${evidencePct < 0.3 ? "Most skills are unverified claims — interviewers will probe these." : ""}`,
    whatToFix:
      evidencePct < 0.5
        ? "Prove your skills through project commits, certifications, or competition results."
        : "Continue building evidence for remaining claimed skills.",
  });

  // --- Profile completeness (0–10 points) ---
  const hasGoal = Boolean(state.targetRole);
  const hasProfile = Boolean(state.profile.firstName);
  const profileScore = (hasGoal ? 5 : 0) + (hasProfile ? 5 : 0);
  score += profileScore;

  verdicts.push({
    category: "Market Positioning",
    severity: hasGoal && hasProfile ? "strong" : "critical",
    assessment: `${!hasGoal ? "No target role defined — you're applying without direction. " : ""}${!hasProfile ? "Incomplete profile." : "Profile is set up."}`,
    whatToFix: !hasGoal
      ? "Define a specific target role and company."
      : "Keep your profile updated and aligned with your target.",
  });

  return { score: clampScore(score), verdicts, expectVsHave };
}

function scoreToTier(score: number): string {
  if (score <= 25) return "Immediate Reject";
  if (score <= 45) return "Weak Candidate";
  if (score <= 65) return "Needs Significant Work";
  if (score <= 80) return "Competitive with Gaps";
  return "Strong Hire Potential";
}

/* ------------------------------------------------------------------ */
/*  Resume text (Stage 1 input)                                        */
/* ------------------------------------------------------------------ */

async function loadResumeText(
  supabase: Client,
  userId: string,
): Promise<{ text: string; fileName: string } | null> {
  const { data: resume, error } = await supabase
    .from("resumes")
    .select("id, file_name, file_path, content_text")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !resume) return null;

  const stored = (resume.content_text as string | null) ?? "";
  if (stored.trim().length > 0) {
    return { text: stored, fileName: resume.file_name };
  }

  // Uploaded but never analysed: read the stored file and extract text
  // the same way the resume engine does.
  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(resume.file_path);
    if (downloadError || !file) return null;
    const extracted = await extractResumeText(
      new Uint8Array(await file.arrayBuffer()),
      resume.file_name,
    );
    if (!extracted.trim()) return null;
    return { text: extracted, fileName: resume.file_name };
  } catch (err) {
    console.warn("[CareerPilot][recruiter-audit] resume extraction failed", err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Stage 1 — Resume screen (deterministic, checklist not score)       */
/* ------------------------------------------------------------------ */

function buildKnockoutChecks(
  state: CareerState,
  jobDescription: string | null,
): ResumeScreenCheck[] {
  const checks: ResumeScreenCheck[] = [];
  const jd = jobDescription ?? "";

  // Degree — only checkable against a real JD.
  if (!jd) {
    checks.push({
      kind: "knockout",
      label: "Degree requirement",
      status: "unknown",
      detail: "No job description was pasted, so the degree requirement is unknown.",
    });
  } else if (/\b(bachelor|b\.?sc|b\.?s\b|btech|b\.?e\b|master'?s?|degree in)\b/i.test(jd)) {
    const degree = [state.profile.degree, state.profile.educationLevel]
      .filter(Boolean)
      .join(" ");
    checks.push(
      degree
        ? {
            kind: "knockout",
            label: "Degree requirement",
            status: "pass",
            detail: `The JD asks for a degree; your profile lists: ${degree}.`,
          }
        : {
            kind: "knockout",
            label: "Degree requirement",
            status: "fail",
            detail:
              "The JD asks for a degree but your profile has no degree recorded. Add it on the Profile page, or confirm the role accepts equivalent experience.",
          },
    );
  } else {
    checks.push({
      kind: "knockout",
      label: "Degree requirement",
      status: "pass",
      detail: "No degree requirement was detected in this job description.",
    });
  }

  // Experience years — CareerPilot does not track years of experience,
  // so a JD that demands them is "unknown", never guessed.
  if (!jd) {
    checks.push({
      kind: "knockout",
      label: "Experience requirement",
      status: "unknown",
      detail: "No job description was pasted, so the experience requirement is unknown.",
    });
  } else {
    const match = jd.match(/(\d+)\+?\s*(?:years?|yrs?)\b/i);
    const years = match?.[1] ? Number(match[1]) : null;
    if (years === null || years <= 1 || /fresh graduate|entry[- ]level|no experience/i.test(jd)) {
      checks.push({
        kind: "knockout",
        label: "Experience requirement",
        status: "pass",
        detail:
          years === null
            ? "No years-of-experience requirement was detected in this job description."
            : `The JD asks for ${years} year${years === 1 ? "" : "s"} or less — entry-level friendly.`,
      });
    } else {
      checks.push({
        kind: "knockout",
        label: "Experience requirement",
        status: "unknown",
        detail: `The JD asks for ${years}+ years of experience, and CareerPilot does not track your years of experience yet. Check this against your own history before applying.`,
      });
    }
  }

  // Location — remote is a pass; a named city is a prompt to verify.
  if (!jd) {
    checks.push({
      kind: "knockout",
      label: "Location",
      status: "unknown",
      detail: "No job description was pasted, so the location requirement is unknown.",
    });
  } else if (/\bremote\b/i.test(jd)) {
    checks.push({
      kind: "knockout",
      label: "Location",
      status: "pass",
      detail: "The JD mentions remote work — location is not a barrier for this role.",
    });
  } else {
    const cities = ["lahore", "karachi", "islamabad", "rawalpindi", "faisalabad", "multan", "peshawar", "london", "dubai", "new york", "san francisco"];
    const found = cities.find((city) => new RegExp(`\\b${escapeRegex(city)}\\b`, "i").test(jd));
    checks.push({
      kind: "knockout",
      label: "Location",
      status: "unknown",
      detail: found
        ? `The JD mentions ${found}. Confirm you can work from there (or that the role allows remote) before applying.`
        : "No location requirement was detected in this job description — verify the posting's location before applying.",
    });
  }

  return checks;
}

function buildResumeScreen(
  state: CareerState,
  resume: { text: string; fileName: string } | null,
  jobDescription: string | null,
  company: CompanyHiringTruth,
): ResumeScreenStage {
  const knockoutChecks = buildKnockoutChecks(state, jobDescription);
  const jdKeywords = jobDescription ? extractJobKeywords(jobDescription, 26) : [];

  if (!resume) {
    return {
      available: false,
      unavailableReason:
        "No resume found. Upload one on the Resume page and run the audit again to see the screen.",
      source: "none",
      skillChecks: [],
      knockoutChecks,
      formatChecks: [],
      jdKeywords,
    };
  }

  const lines = toLines(resume.text);
  const hasJd = jdKeywords.length > 0;
  const mustHaves = hasJd
    ? jdKeywords
    : company.hiringBar.nonNegotiables.map((n) => n.skill);
  const skillChecks: ResumeScreenCheck[] = mustHaves.map((skill) => {
    const line = findSkillLine(lines, skill);
    return line
      ? {
          kind: "skill" as const,
          label: skill,
          status: "pass" as const,
          detail: hasJd
            ? "Found in your resume."
            : "Found in your resume (checked against the company bar; no JD was pasted).",
          lineRef: `Resume line ${line.number}: "${line.text.slice(0, 120)}"`,
        }
      : {
          kind: "skill" as const,
          label: skill,
          status: "fail" as const,
          detail: hasJd
            ? "Not found anywhere in your resume."
            : "Not found anywhere in your resume (checked against the company bar; no JD was pasted).",
        };
  });

  const { checks: formatChecks } = auditResumeFormat(resume.text, resume.fileName);

  return {
    available: true,
    source: hasJd ? "job-description" : "company-bar",
    skillChecks,
    knockoutChecks,
    formatChecks,
    jdKeywords,
  };
}

/* ------------------------------------------------------------------ */
/*  Evidence ledger (Stage 2 + 3 input)                                */
/* ------------------------------------------------------------------ */

type EvidenceLedgerRow = EvidenceInput & { source_url: string | null; claim: string | null };

async function loadEvidenceLedger(
  supabase: Client,
  userId: string,
): Promise<EvidenceLedgerRow[]> {
  const db = supabase as unknown as AnyClient;
  try {
    const { data, error } = await db
      .from("evidence_items")
      .select("id, skill_key, evidence_strength, confidence, verification_status, source_type, source_url, claim")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []) as EvidenceLedgerRow[];
  } catch (err) {
    // The evidence ledger is Phase 2 data; older accounts may have none.
    console.warn("[CareerPilot][recruiter-audit] evidence ledger unavailable", err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Stage 2 — Evidence audit (claimed vs demonstrated)                 */
/* ------------------------------------------------------------------ */

function buildEvidenceAudit(
  state: CareerState,
  ledger: EvidenceLedgerRow[],
): EvidenceAuditStage {
  const items: EvidenceAuditItem[] = state.skills.map((skill) => {
    const canonical = normalizeSkill(skill.name).canonical;
    const classification = classifyRequirement(
      { skill: skill.name, importance: "preferred" },
      ledger,
    );

    // Linked proof, in order: an evidence item with a source URL, then a
    // project whose technologies include the skill and which has a URL.
    const linkedEvidence = ledger
      .filter((e) => e.skill_key === canonical && e.source_url)
      .sort((a, b) => b.evidence_strength - a.evidence_strength)[0];
    const linkedProject = state.projects.find(
      (p) =>
        p.projectUrl &&
        p.technologies.some(
          (t) => normalizeSkill(t).canonical.toLowerCase() === canonical.toLowerCase(),
        ),
    );

    const proof = linkedEvidence
      ? {
          label: linkedEvidence.claim?.trim()
            ? linkedEvidence.claim.trim().slice(0, 120)
            : `${skill.name} evidence`,
          url: linkedEvidence.source_url,
        }
      : linkedProject
        ? { label: linkedProject.name, url: linkedProject.projectUrl }
        : null;

    return {
      skill: skill.name,
      level: classification.level,
      reason: classification.reason,
      proof,
    };
  });

  const skillsWithProof = items.filter((i) => i.proof !== null).length;
  const evidenceCoverage =
    items.length > 0 ? Math.round((skillsWithProof / items.length) * 100) : 0;

  return {
    claimedSkills: items.length,
    skillsWithProof,
    evidenceCoverage,
    items,
  };
}

/* ------------------------------------------------------------------ */
/*  Stage 3 — Bar comparison (researched profiles only)                */
/* ------------------------------------------------------------------ */

function buildBarComparison(
  dashboard: CompanyDashboard | null,
  companyName: string,
  ledger: EvidenceLedgerRow[],
): BarComparisonStage {
  if (!dashboard) {
    return {
      state: "unknown",
      reason: `Company research was unavailable during this audit, so the hiring bar for ${companyName} is unknown. Run the audit again later — CareerPilot will not compare you against unverified data.`,
    };
  }
  if (dashboard.provenance.origin !== "researched") {
    return {
      state: "unknown",
      reason: `No researched hiring bar exists for ${companyName} yet. Live careers-page research could not verify this company's requirements, and the static dataset is unverified, so this stage is skipped rather than compared against data CareerPilot cannot stand behind.`,
    };
  }

  // Past the guard above, provenance is narrowed to the researched
  // variant, so retrievedAt is a guaranteed string. Capture the narrowed
  // values in consts: narrowing does not survive into the map callback.
  const provenance = dashboard.provenance;
  const retrievedAt = provenance.retrievedAt;
  const mustHaves = dashboard.commonSkills.filter((s) => s.importance === "must_have");
  const barSkills = (mustHaves.length > 0 ? mustHaves : dashboard.commonSkills).slice(0, 8);
  const sourceUrl =
    provenance.sources[0]?.url ?? dashboard.company.careersUrl ?? null;

  const items: BarComparisonItem[] = barSkills.map((skill) => {
    const classification = classifyRequirement(
      { skill: skill.skillName, importance: skill.importance },
      ledger,
    );
    const status =
      classification.level === "PROVEN"
        ? ("meets" as const)
        : classification.level === "PARTIALLY_PROVEN" ||
            classification.level === "WEAK_EVIDENCE"
          ? ("partial" as const)
          : ("missing" as const);
    return {
      item: skill.skillName,
      status,
      evidence: classification.reason,
      sourceLabel: provenance.sourceLabel,
      sourceUrl,
      retrievedAt,
    };
  });

  return {
    state: "compared",
    companyName: dashboard.company.displayName,
    items,
    retrievedAt,
    origin: "researched",
  };
}

/* ------------------------------------------------------------------ */
/*  Stage 4 — Mock interview questions                                 */
/* ------------------------------------------------------------------ */

const MOCK_SOURCES = ["jd", "company", "evidence-gap", "general"] as const;

function parseMockQuestions(value: unknown): MockInterviewQuestion[] {
  if (!Array.isArray(value)) return [];
  const out: MockInterviewQuestion[] = [];
  for (const [index, raw] of value.entries()) {
    if (out.length >= 5) break;
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const question = text(row["question"], 500);
    if (!question) continue;
    const sourceRaw = String(row["source"] ?? "general");
    const source = (MOCK_SOURCES as readonly string[]).includes(sourceRaw)
      ? (sourceRaw as MockInterviewQuestion["source"])
      : "general";
    out.push({
      id: `q${index + 1}`,
      question,
      focus: text(row["focus"], 200) || "Interview practice",
      source,
    });
  }
  return out;
}

/** Deterministic template questions — used only when the AI call fails. */
function templateMockQuestions(
  jobDescription: string | null,
  company: CompanyHiringTruth,
  role: string,
  evidenceAudit: EvidenceAuditStage,
  resumeScreen: ResumeScreenStage,
): MockInterviewQuestion[] {
  const questions: MockInterviewQuestion[] = [];
  const topKeyword = resumeScreen.jdKeywords[0];
  if (jobDescription && topKeyword) {
    questions.push({
      id: "q1",
      question: `The job description asks for ${topKeyword}. Walk me through a project where you used ${topKeyword} and what you would do differently now.`,
      focus: "JD requirement depth",
      source: "jd",
    });
  }
  const unproven = evidenceAudit.items.find((i) => i.proof === null);
  if (unproven) {
    questions.push({
      id: `q${questions.length + 1}`,
      question: `Your profile lists ${unproven.skill} without linked proof. How would you convince a hiring panel you can actually do ${unproven.skill}?`,
      focus: "Evidence for claimed skills",
      source: "evidence-gap",
    });
  }
  questions.push({
    id: `q${questions.length + 1}`,
    question: `Why ${company.name}? What do you know about how they hire and what they expect from a ${role}?`,
    focus: "Company motivation",
    source: "company",
  });
  questions.push({
    id: `q${questions.length + 1}`,
    question:
      "Tell me about the hardest technical decision in your most recent project, and what evidence you used to make it.",
    focus: "Technical judgement",
    source: "general",
  });
  questions.push({
    id: `q${questions.length + 1}`,
    question:
      "Describe a time you debugged something under pressure. What did you check first, and how did you know the fix worked?",
    focus: "Debugging under pressure",
    source: "general",
  });
  return questions.slice(0, 5);
}

/* ------------------------------------------------------------------ */
/*  Verdict (deterministic, every claim traces to a stage output)      */
/* ------------------------------------------------------------------ */

function buildVerdict(
  resumeScreen: ResumeScreenStage,
  evidenceAudit: EvidenceAuditStage,
  barComparison: BarComparisonStage,
): RecruiterVerdict {
  const fixes: { fix: string; stage: string }[] = [];

  if (!resumeScreen.available) {
    fixes.push({
      fix: "Upload a resume so the screen can run — without one, no recruiter can see you at all.",
      stage: "Resume screen",
    });
  }

  for (const check of resumeScreen.knockoutChecks.filter((c) => c.status === "fail")) {
    fixes.push({ fix: `Knockout risk — ${check.label}: ${check.detail}`, stage: "Resume screen" });
  }

  for (const check of resumeScreen.skillChecks.filter((c) => c.status === "fail").slice(0, 2)) {
    fixes.push({
      fix: `Add ${check.label} to your resume, backed by a project that proves it.`,
      stage: "Resume screen",
    });
  }

  if (barComparison.state === "compared") {
    for (const item of barComparison.items.filter((i) => i.status === "missing").slice(0, 2)) {
      fixes.push({
        fix: `Close the bar gap on ${item.item} — the researched hiring bar screens for it.`,
        stage: "Bar comparison",
      });
    }
  }

  const firstUnproven = evidenceAudit.items.find((i) => i.proof === null);
  if (firstUnproven) {
    fixes.push({
      fix: `Link proof for ${firstUnproven.skill}: deploy a project or add a repo link that shows it in use.`,
      stage: "Evidence audit",
    });
  }

  const topFixes = fixes.slice(0, 3);

  if (topFixes.length === 0) {
    return {
      band: "ready",
      headline: "Ready to apply",
      topFixes: [],
      nextAction: {
        label: "Apply, then keep practicing",
        detail:
          "Your evidence covers the bar that could be checked. Use the mock interview to prepare for the panel.",
        stage: "Verdict",
      },
    };
  }

  const first = topFixes[0]!;
  const nextAction: RecruiterVerdict["nextAction"] = {
    label: first.fix,
    detail: "This is the single highest-value fix from this audit.",
    stage: first.stage,
  };

  if (topFixes.length === 1) {
    return {
      band: "one_gap",
      headline: `One gap to close: ${first.fix}`,
      topFixes,
      nextAction,
    };
  }
  return {
    band: "not_yet",
    headline: "Not yet — here are your top 3 fixes",
    topFixes,
    nextAction,
  };
}

/* ------------------------------------------------------------------ */
/*  Grounded context for the LLM (narrative + questions only)          */
/* ------------------------------------------------------------------ */

async function buildGroundedContext(
  supabase: Client,
  userId: string,
  state: CareerState,
  companyName: string,
  role: string,
): Promise<string> {
  // Preferred: vector retrieval over the candidate evidence ledger.
  try {
    const chunks = await retrieveCandidateEvidence(
      supabase as unknown as AnyClient,
      userId,
      `${companyName} ${role} hiring requirements, rejection reasons, and trusted proof`,
      { matchCount: 8 },
    );
    if (chunks.length > 0) return buildRetrievalContext(chunks);
  } catch (err) {
    console.warn(
      "[CareerPilot][recruiter-audit] vector retrieval unavailable, using keyword evidence",
      err,
    );
  }
  // Fallback: lexical grounded evidence over the profile + dataset.
  try {
    return formatEvidenceContext(
      await retrieveGroundedEvidence(
        supabase,
        userId,
        `${companyName} ${role} hiring requirements, rejection reasons, and trusted proof`,
        role,
      ),
    );
  } catch (err) {
    console.warn("[CareerPilot][recruiter-audit] grounded evidence unavailable", err);
    return careerStateToPrompt(state);
  }
}

/* ------------------------------------------------------------------ */
/*  Run Recruiter Audit                                                */
/* ------------------------------------------------------------------ */

export async function runRecruiterAudit(
  supabase: Client,
  userId: string,
  options: { company?: string; role?: string; jobDescription?: string } = {},
): Promise<RecruiterSession> {
  console.info("[CareerPilot][recruiter-audit] start", { userId, options: { company: options.company, role: options.role, hasJd: Boolean(options.jobDescription?.trim()) } });

  const state = await buildCareerState(supabase, userId);
  const targetRole = options.role?.trim() || state.targetRole || "Associate Software Engineer";
  const targetCompany = options.company?.trim() || state.targetJob?.company || "";
  const jobDescription = options.jobDescription?.trim()
    ? options.jobDescription.trim().slice(0, 8000)
    : null;
  if (!targetCompany) {
    throw new Error(
      "Pick a target company first — CareerPilot will not audit against a guessed employer.",
    );
  }
  const companyTruth = matchCompanyTruth(targetCompany);
  // No researched hiring profile: refuse the audit rather than screening
  // against invented company data. Checked before consuming AI quota.
  if (!companyTruth) {
    throw new Error(
      `"${targetCompany}" is not researched yet — CareerPilot has no hiring profile for this company, so a recruiter audit cannot run. Pick one of the researched companies instead.`,
    );
  }

  // Quota first: one AI call is consumed before the provider is called.
  await consumeAiCall(supabase, userId, "recruiter-audit");

  // Deterministic baseline (kept: the evidence rubric).
  const baseline = computeBaselineScore(state, companyTruth);

  // Real inputs for the stages.
  const resume = await loadResumeText(supabase, userId);
  const ledger = await loadEvidenceLedger(supabase, userId);
  let dashboard: CompanyDashboard | null = null;
  try {
    dashboard = await getCompanyDashboard(supabase, userId, companyTruth.name);
  } catch (err) {
    console.warn("[CareerPilot][recruiter-audit] company dashboard unavailable", err);
  }

  // Stages 1-3 are fully deterministic — no LLM involvement.
  const resumeScreen = buildResumeScreen(state, resume, jobDescription, companyTruth);
  const evidenceAudit = buildEvidenceAudit(state, ledger);
  const barComparison = buildBarComparison(dashboard, companyTruth.name, ledger);
  const verdict = buildVerdict(resumeScreen, evidenceAudit, barComparison);
  const companyProvenance: CompanyProvenance = dashboard
    ? {
        name: dashboard.company.displayName,
        origin: dashboard.provenance.origin,
        sourceLabel: dashboard.provenance.sourceLabel,
        retrievedAt: dashboard.provenance.retrievedAt,
        sources: dashboard.provenance.sources.map((s) => ({ url: s.url, label: s.label })),
      }
    : {
        name: companyTruth.name,
        origin: "unavailable",
        sourceLabel: "Company research unavailable during this audit",
        retrievedAt: null,
        sources: [],
      };

  // Stage 4 questions + narrative feedback from the LLM, grounded in the
  // retrieved context. The model is asked for narrative fields and
  // interview questions ONLY — it is never asked for a score, and any
  // numeric field it returns is ignored (see the honesty contract above).
  let aiResult: Partial<RecruiterAudit> = {};
  let mockInterview: MockInterviewStage | null = null;
  try {
    const groundedEvidence = await buildGroundedContext(
      supabase,
      userId,
      state,
      companyTruth.name,
      targetRole,
    );
    const prompt = `=== CANDIDATE PROFILE ===
${careerStateToPrompt(state)}

=== TARGET ===
Role: ${targetRole}
Company: ${companyTruth.name} (${companyTruth.tier})
Non-Negotiables: ${companyTruth.hiringBar.nonNegotiables.map((n) => n.skill).join(", ")}
Rejection Reasons: ${companyTruth.rejectionTruths.map((t) => t.title).join("; ")}
${jobDescription ? `=== JOB DESCRIPTION (pasted by the candidate) ===\n${jobDescription.slice(0, 3000)}` : "=== JOB DESCRIPTION ===\nNo job description was pasted for this audit."}

=== DETERMINISTIC RESULTS (already computed — do not re-score) ===
Evidence rubric: ${baseline.score}/100
Evidence coverage (claimed skills with linked proof): ${evidenceAudit.evidenceCoverage}%
Resume screen: ${resumeScreen.skillChecks.filter((c) => c.status === "pass").length}/${resumeScreen.skillChecks.length} must-have skills present
${barComparison.state === "compared" ? `Bar comparison: ${barComparison.items.filter((i) => i.status === "meets").length} meets / ${barComparison.items.filter((i) => i.status === "partial").length} partial / ${barComparison.items.filter((i) => i.status === "missing").length} missing` : "Bar comparison: skipped — company bar unknown"}

=== GROUNDED EVIDENCE ===
${groundedEvidence}

As the candidate's recruiter-style coach, write honest narrative feedback and draft mock interview questions grounded ONLY in the profile, job description, and evidence above. Never invent skills, experience, or company facts. Return JSON:
{
  "headline": string (one blunt sentence summary, max 120 chars),
  "brutal_verdicts": [
    { "category": string, "severity": "fatal"|"critical"|"strong", "assessment": string, "what_to_fix": string }
  ] (exactly 6 verdicts for: CV Quality, Technical Skills, Project Portfolio, Interview Readiness, Market Positioning, Culture Fit),
  "missing_critical": string[] (3-5 critical things ${companyTruth.name} requires that this candidate lacks),
  "what_you_need_to_build": { "title": string, "description": string, "tech_stack": string[] },
  "interview_prediction": string (how would this candidate perform in a real ${companyTruth.name} interview today, 2-3 sentences),
  "mock_interview_questions": [
    { "question": string, "focus": string (what it tests), "source": "jd"|"company"|"evidence-gap"|"general" }
  ] (exactly 5 questions: grounded in the pasted JD, the company bar, and this candidate's evidence gaps — never generic)
}`;

    const raw = await groqChat(
      [
        { role: "system", content: coachSystemPrompt(companyTruth, targetRole) },
        { role: "user", content: prompt },
      ],
      { json: true, maxTokens: 2600, temperature: 0.35 },
    );

    const parsed = parseJsonObject<Record<string, unknown>>(raw);

    // Numerical outcome uses only the deterministic evidence rubric. The
    // model supplies narrative feedback and interview questions, never an
    // uncalibrated hiring forecast — its JSON is read for text fields
    // only, and no score it might return is ever used.
    const finalScore = baseline.score;

    const parsedQuestions = parseMockQuestions(parsed["mock_interview_questions"]);
    mockInterview =
      parsedQuestions.length >= 3
        ? {
            generatedBy: "ai",
            generatedNote:
              "Drafted by the coach from your pasted job description, the company bar, and your evidence gaps.",
            questions: parsedQuestions,
          }
        : null;

    aiResult = {
      overallScore: finalScore,
      hireChance: finalScore,
      rejectChance: 100 - finalScore,
      headline:
        String(parsed["headline"] ?? "")
          .trim()
          .slice(0, 200) || `Evidence rubric: ${finalScore}/100`,
      brutalVerdicts: Array.isArray(parsed["brutal_verdicts"])
        ? (parsed["brutal_verdicts"] as Record<string, unknown>[]).map((v) => ({
            category: String(v["category"] ?? "").trim(),
            severity: (["fatal", "critical", "strong"].includes(String(v["severity"]))
              ? String(v["severity"])
              : "critical") as BrutalVerdict["severity"],
            assessment: String(v["assessment"] ?? "").trim(),
            whatToFix: String(v["what_to_fix"] ?? "").trim(),
          }))
        : baseline.verdicts,
      missingCritical: stringList(parsed["missing_critical"], 6),
      whatYouNeedToBuild: (() => {
        const w = parsed["what_you_need_to_build"];
        if (w && typeof w === "object") {
          const wObj = w as Record<string, unknown>;
          return {
            title: String(wObj["title"] ?? "Production-Grade Project").trim(),
            description: String(wObj["description"] ?? "").trim(),
            techStack: stringList(wObj["tech_stack"], 6),
          };
        }
        return {
          title: `Production-Grade ${companyTruth.primaryStack[0] || "Full Stack"} Application`,
          description: `Build a real application that demonstrates mastery of ${companyTruth.name}'s core stack.`,
          techStack: companyTruth.primaryStack.slice(0, 4),
        };
      })(),
      interviewPrediction:
        String(parsed["interview_prediction"] ?? "").trim() ||
        "Unable to assess — insufficient data for interview prediction.",
    };
  } catch (err) {
    console.warn("[CareerPilot][recruiter-audit] AI failed, using deterministic baseline", err);
  }

  if (!mockInterview) {
    // AI unavailable (or returned too few usable questions): deterministic
    // templates, labelled as such — never presented as AI-drafted.
    mockInterview = {
      generatedBy: "template",
      generatedNote:
        "AI question drafting was unavailable for this audit, so these are template questions built from your job description and evidence gaps.",
      questions: templateMockQuestions(
        jobDescription,
        companyTruth,
        targetRole,
        evidenceAudit,
        resumeScreen,
      ),
    };
  }

  // Merge AI narrative with the deterministic baseline (baseline as fallback).
  const audit: RecruiterAudit = {
    scoreVersion: "deterministic-evidence-v1",
    overallScore: baseline.score,
    hireChance: baseline.score,
    rejectChance: 100 - baseline.score,
    verdictTier: scoreToTier(baseline.score),
    headline: aiResult.headline ?? `Evidence rubric: ${baseline.score}/100`,
    brutalVerdicts:
      aiResult.brutalVerdicts && aiResult.brutalVerdicts.length >= 4
        ? aiResult.brutalVerdicts
        : baseline.verdicts,
    missingCritical: aiResult.missingCritical?.length
      ? aiResult.missingCritical
      : companyTruth.hiringBar.nonNegotiables
          .filter((_, i) => !baseline.expectVsHave[i]?.youHave)
          .map((n) => n.skill)
          .slice(0, 5),
    whatYouNeedToBuild: aiResult.whatYouNeedToBuild ?? {
      title: `Production-Grade ${companyTruth.primaryStack[0] || "Full Stack"} Application`,
      description: `Build a deployed project using ${companyTruth.name}'s core stack.`,
      techStack: companyTruth.primaryStack.slice(0, 4),
    },
    interviewPrediction: aiResult.interviewPrediction ?? "Assessment requires more data.",
    recruiterQuestions: mockInterview.questions.map((q) => q.question),
    expectVsHave: baseline.expectVsHave,
    resumeScreen,
    evidenceAudit,
    barComparison,
    mockInterview,
    verdict,
    companyProvenance,
    jobDescriptionUsed: Boolean(jobDescription),
  };

  // Save to database
  const { data: session, error } = await supabase
    .from("recruiter_sessions")
    .insert({
      user_id: userId,
      company_id: companyTruth.id,
      company_name: companyTruth.name,
      target_role: targetRole,
      overall_score: audit.overallScore,
      hire_chance: audit.hireChance,
      reject_chance: audit.rejectChance,
      verdict_tier: audit.verdictTier,
      audit_result: JSON.parse(JSON.stringify(audit)),
      chat_messages: JSON.parse("[]"),
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("[CareerPilot][recruiter-audit] DB save failed", error);
    throw new Error("Failed to save recruiter audit session.");
  }

  console.info("[CareerPilot][recruiter-audit] complete", {
    userId,
    sessionId: session.id,
    score: audit.overallScore,
    evidenceCoverage: evidenceAudit.evidenceCoverage,
    verdictBand: verdict.band,
  });

  return {
    id: session.id,
    companyId: companyTruth.id,
    companyName: companyTruth.name,
    targetRole,
    overallScore: audit.overallScore,
    hireChance: audit.hireChance,
    rejectChance: audit.rejectChance,
    verdictTier: audit.verdictTier,
    auditResult: audit,
    chatMessages: [],
    createdAt: session.created_at,
  };
}

/* ------------------------------------------------------------------ */
/*  Mock interview answer scoring (deterministic rubric, 0-6)          */
/*                                                                     */
/*  The LLM never scores answers. Each criterion is a fixed,            */
/*  explainable rule, and the UI shows the rubric next to every score, */
/*  so the candidate can see exactly why they got each point.          */
/* ------------------------------------------------------------------ */

/**
 * Structure (0-2): 2 = 3+ sentences, 1 = 2 sentences, 0 = fewer.
 * Specificity (0-2): 2 = a number/metric AND a named technology,
 *   1 = one of the two, 0 = neither.
 * Evidence cited (0-2): 2 = names one of the candidate's real projects
 *   (or links a repo/project URL), 1 = a generic project mention,
 *   0 = no project reference at all.
 */
export function scoreMockAnswer(
  answer: string,
  projects: CareerState["projects"],
): MockRubricCriterion[] {
  const trimmed = answer.trim();
  const lower = trimmed.toLowerCase();

  const sentences = trimmed
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const structureScore = sentences.length >= 3 ? 2 : sentences.length === 2 ? 1 : 0;

  const hasNumber = /\d/.test(trimmed);
  const known = knownSkills().map((s) => s.canonical.toLowerCase());
  const projectTechs = projects.flatMap((p) => p.technologies.map((t) => t.toLowerCase()));
  const hasTech =
    known.some((skill) => skill.length > 2 && lower.includes(skill)) ||
    projectTechs.some((tech) => tech.length > 2 && lower.includes(tech));
  const specificityScore = hasNumber && hasTech ? 2 : hasNumber || hasTech ? 1 : 0;

  const namesRealProject = projects.some(
    (p) => p.name.trim().length > 2 && lower.includes(p.name.trim().toLowerCase()),
  );
  const hasLink = /https?:\/\/|github\.com|gitlab\.com/i.test(trimmed);
  const genericMention =
    /\b(my|our|the) (project|app|codebase|system|website|api|service)\b/i.test(trimmed) ||
    /\binternship\b/i.test(trimmed);
  const evidenceScore = namesRealProject || hasLink ? 2 : genericMention ? 1 : 0;

  return [
    {
      criterion: "structure",
      score: structureScore,
      max: 2,
      reason:
        structureScore === 2
          ? `${sentences.length} sentences — a clear beginning, middle, and result.`
          : structureScore === 1
            ? "2 sentences — add a result or reflection to complete the structure."
            : "Too short to judge structure — aim for 3+ sentences: situation, action, result.",
    },
    {
      criterion: "specificity",
      score: specificityScore,
      max: 2,
      reason:
        specificityScore === 2
          ? "Names both a number or metric and a specific technology."
          : specificityScore === 1
            ? hasNumber
              ? "Has a number or metric, but no named technology — name the tools you used."
              : "Names a technology, but no number or metric — quantify the result."
            : "No number, metric, or named technology — be specific about what you built and what it achieved.",
    },
    {
      criterion: "evidence",
      score: evidenceScore,
      max: 2,
      reason:
        evidenceScore === 2
          ? namesRealProject
            ? "Names one of your real projects — verifiable evidence."
            : "Links a project or repository — verifiable evidence."
          : evidenceScore === 1
            ? "Mentions a project generically — name the actual project so a panel can check it."
            : "No project referenced — anchor your answer in a real project you built.",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Mock interview attempts (persisted, progress over time)            */
/* ------------------------------------------------------------------ */

async function loadSessionForUser(
  supabase: Client,
  userId: string,
  sessionId: string,
) {
  const { data, error } = await supabase
    .from("recruiter_sessions")
    .select("id, company_name, target_role")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("Recruiter session not found.");
  return data;
}

function attemptFromRow(row: {
  id: string;
  question_id: string;
  question: string;
  answer: string;
  structure_score: number;
  specificity_score: number;
  evidence_score: number;
  time_spent_seconds: number;
  created_at: string;
}): MockInterviewAttempt {
  const rubric: MockRubricCriterion[] = [
    {
      criterion: "structure",
      score: row.structure_score,
      max: 2,
      reason:
        row.structure_score === 2
          ? "Clear beginning, middle, and result."
          : row.structure_score === 1
            ? "Partly structured — add a result or reflection."
            : "Too short to judge structure.",
    },
    {
      criterion: "specificity",
      score: row.specificity_score,
      max: 2,
      reason:
        row.specificity_score === 2
          ? "Named a number/metric and a specific technology."
          : row.specificity_score === 1
            ? "Named one of a number/metric or a technology — add the other."
            : "No number, metric, or named technology.",
    },
    {
      criterion: "evidence",
      score: row.evidence_score,
      max: 2,
      reason:
        row.evidence_score === 2
          ? "Cited a real project or a link."
          : row.evidence_score === 1
            ? "Mentioned a project generically — name the actual project."
            : "No project referenced.",
    },
  ];
  return {
    id: row.id,
    questionId: row.question_id,
    question: row.question,
    answer: row.answer,
    totalScore: row.structure_score + row.specificity_score + row.evidence_score,
    rubric,
    timeSpentSeconds: row.time_spent_seconds,
    createdAt: row.created_at,
  };
}

export async function submitMockAnswer(
  supabase: Client,
  userId: string,
  sessionId: string,
  input: {
    questionId: string;
    question: string;
    answer: string;
    timeSpentSeconds: number;
  },
): Promise<{ attempt: MockInterviewAttempt; summary: MockAttemptSummary }> {
  const session = await loadSessionForUser(supabase, userId, sessionId);
  const answer = text(input.answer, 4000);
  if (!answer) throw new Error("Write an answer before submitting.");
  const question = text(input.question, 500);
  if (!question) throw new Error("Question is required.");

  // Deterministic rubric scoring — the LLM is never involved.
  const state = await buildCareerState(supabase, userId);
  const rubric = scoreMockAnswer(answer, state.projects);
  const byCriterion = Object.fromEntries(rubric.map((r) => [r.criterion, r.score])) as Record<
    MockRubricCriterion["criterion"],
    number
  >;

  const db = supabase as unknown as AnyClient;
  const { data, error } = await db
    .from("mock_interview_attempts")
    .insert({
      user_id: userId,
      session_id: session.id,
      question_id: text(input.questionId, 60),
      question,
      answer,
      structure_score: byCriterion["structure"] ?? 0,
      specificity_score: byCriterion["specificity"] ?? 0,
      evidence_score: byCriterion["evidence"] ?? 0,
      time_spent_seconds: Math.max(0, Math.min(3600, Math.floor(input.timeSpentSeconds) || 0)),
    })
    .select(
      "id, question_id, question, answer, structure_score, specificity_score, evidence_score, time_spent_seconds, created_at",
    )
    .single();

  if (error || !data) {
    console.error("[CareerPilot][mock-interview] attempt save failed", {
      error: error?.message,
    });
    throw new Error("Could not save your mock interview attempt. Please try again.");
  }

  const attempt = attemptFromRow(data as Parameters<typeof attemptFromRow>[0]);
  const summary = await loadMockAttempts(supabase, userId, sessionId);
  return { attempt, summary };
}

export async function loadMockAttempts(
  supabase: Client,
  userId: string,
  sessionId: string,
): Promise<MockAttemptSummary> {
  await loadSessionForUser(supabase, userId, sessionId);
  const db = supabase as unknown as AnyClient;
  const { data, error } = await db
    .from("mock_interview_attempts")
    .select(
      "id, question_id, question, answer, structure_score, specificity_score, evidence_score, time_spent_seconds, created_at",
    )
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) {
    console.warn("[CareerPilot][mock-interview] attempts load failed", {
      error: error.message,
    });
    return { attempts: [], totalAttempts: 0, averageTotal: null, bestTotal: null };
  }
  const attempts = ((data ?? []) as Array<Parameters<typeof attemptFromRow>[0]>).map(
    attemptFromRow,
  );
  const totals = attempts.map((a) => a.totalScore);
  return {
    attempts,
    totalAttempts: attempts.length,
    averageTotal:
      totals.length > 0
        ? Math.round((totals.reduce((sum, t) => sum + t, 0) / totals.length) * 10) / 10
        : null,
    bestTotal: totals.length > 0 ? Math.max(...totals) : null,
  };
}

/* ------------------------------------------------------------------ */
/*  Coach Chat (reframed: never "Head of Talent at {real company}")    */
/* ------------------------------------------------------------------ */

export async function chatWithRecruiter(
  supabase: Client,
  userId: string,
  sessionId: string,
  userMessage: string,
): Promise<{ reply: string; messages: RecruiterSession["chatMessages"] }> {
  console.info("[CareerPilot][recruiter-chat] start", { userId, sessionId });

  // Load session
  const { data: session, error } = await supabase
    .from("recruiter_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (error || !session) throw new Error("Recruiter session not found.");

  const companyTruth = matchCompanyTruth(session.company_name);
  const audit = session.audit_result as unknown as RecruiterAudit;
  const existingMessages = (session.chat_messages ?? []) as RecruiterSession["chatMessages"];

  // Build conversation history for AI
  const chatHistory = existingMessages.map((m) => ({
    role: (m.role === "recruiter" ? "assistant" : "user") as "assistant" | "user",
    content: m.content,
  }));

  let reply: string;
  if (!companyTruth) {
    // Legacy session for a company with no researched profile: do not
    // invent company specifics. The coach can still help generally.
    reply = `"${session.company_name}" is not researched yet, so I can't speak to their specific hiring bar. I can still help you prepare generally — ask about your resume, your projects, or how to build proof for the role.`;
  } else {
    const coverage = audit.evidenceAudit?.evidenceCoverage;
    const band = audit.verdict?.band;
    const contextPrompt = `You previously audited this candidate for ${session.target_role} at ${companyTruth.name}.
Evidence rubric: ${audit.overallScore}/100.${coverage !== undefined ? ` Evidence coverage: ${coverage}% of claimed skills have linked proof.` : ""}${band ? ` Readiness band: ${band}.` : ""} Headline: ${audit.headline}.
Missing critical skills: ${audit.missingCritical.join(", ")}.
Answer as their recruiter-style coach: honest, specific, actionable. Never claim to work for ${companyTruth.name} or to decide hiring. Never give a score or a hiring probability.
Keep responses concise (2-4 paragraphs max).`;

    const aiMessages = [
      { role: "system" as const, content: coachSystemPrompt(companyTruth, session.target_role) },
      { role: "user" as const, content: contextPrompt },
      ...chatHistory,
      { role: "user" as const, content: userMessage },
    ];

    try {
      reply = await groqChat(aiMessages, { maxTokens: 800, temperature: 0.5 });
    } catch {
      reply = "I'm having trouble connecting right now. Please try again in a moment.";
    }
  }

  // Append new messages
  const newMessages: RecruiterSession["chatMessages"] = [
    ...existingMessages,
    { role: "student", content: userMessage },
    { role: "recruiter", content: reply },
  ];

  // Update session
  await supabase
    .from("recruiter_sessions")
    .update({
      chat_messages: JSON.parse(JSON.stringify(newMessages)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  console.info("[CareerPilot][recruiter-chat] replied", { sessionId, replyLength: reply.length });

  return { reply, messages: newMessages };
}

/* ------------------------------------------------------------------ */
/*  Load Latest Session                                                */
/* ------------------------------------------------------------------ */

export async function loadRecruiterSession(
  supabase: Client,
  userId: string,
): Promise<RecruiterSession | null> {
  const { data, error } = await supabase
    .from("recruiter_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    companyId: data.company_id,
    companyName: data.company_name,
    targetRole: data.target_role,
    overallScore: data.overall_score,
    // Legacy schema fields are retained, but are now treated as evidence
    // coverage complements, never probabilities of hiring/rejection.
    hireChance: data.overall_score,
    rejectChance: 100 - data.overall_score,
    verdictTier: data.verdict_tier,
    auditResult: data.audit_result as unknown as RecruiterAudit,
    chatMessages: (data.chat_messages ?? []) as unknown as RecruiterSession["chatMessages"],
    createdAt: data.created_at,
  };
}
