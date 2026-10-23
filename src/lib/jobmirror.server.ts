/* ------------------------------------------------------------------ *
 * Job Mirror — holds the researched market up against one student
 *
 * Every figure, skill, salary band and quote in the output comes from
 * `@/data/market-truth` and carries that dataset's citation. Nothing is
 * randomised, seeded, estimated or inferred:
 *
 *   - market facts        -> @/data/market-truth (researched, cited)
 *   - the student's side  -> their own CareerState (their recorded data)
 *   - the AI's job        -> prose only, never numbers
 *
 * If the AI is unavailable the report is still complete and useful —
 * `personalized` simply becomes null. The mirror never invents job
 * listings, employer names, opening counts or posting dates, because no
 * free, verifiable source for those exists.
 * ------------------------------------------------------------------ */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  citationUrl,
  EVIDENCE_HIERARCHY,
  isStale,
  LAST_RESEARCHED,
  MARKET_TRUTH_PROVENANCE,
  MARKET_TRUTH_VERSION,
  matchRoleProfile,
  PAKISTAN_MARKET,
  ROLE_OPTIONS,
  TOP_REJECTION_REASONS,
  type Citation,
  type MarketTruthFieldGroup,
  type RoleTruthProfile,
  type SalaryBand,
  type SkillRequirement,
  type TruthStatement,
} from "@/data/market-truth";
import type { Database } from "@/integrations/supabase/types";
import { groqChat, parseJsonObject } from "./ai.server";
import { buildCareerState, type CareerState } from "./career-state.server";
import {
  coverageOf,
  resolveRequirement,
  satisfies,
  skillAliases,
  statusFor,
  type MirrorCitation,
  type MirrorSkill,
  type SkillTier,
  type TierCoverage,
} from "./market-fit";

type Client = SupabaseClient<Database>;

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/* Skill-level shapes and the rules behind them are shared with the
   Diagnostic — see ./market-fit. Re-exported here so UI components can
   keep importing the report's types from one place. */
export type {
  MirrorCitation,
  MirrorSkill,
  SkillStatus,
  SkillTier,
  TierCoverage,
} from "./market-fit";

export type MirrorSalaryBand = {
  label: string;
  min: number;
  max: number;
  currency: "PKR" | "USD";
  period: "month" | "year";
  note: string | null;
  citation: MirrorCitation;
};

export type MirrorTruth = { statement: string; citation: MirrorCitation | null };

export type MirrorRejectionReason = {
  rank: number;
  title: string;
  detail: string;
  stats: { label: string; value: string; detail: string; citation: MirrorCitation | null }[];
  citations: MirrorCitation[];
};

/** AI-written prose. Never contains numbers the dataset did not supply. */
export type MirrorPersonalization = {
  verdict: string;
  brutalTruth: string;
  buildNext: string;
};

export type CvReadinessItem = {
  skill: string;
  status: "demonstrated" | "claimed" | "missing";
  cvMentioned: boolean;
  githubProof: boolean;
  projectProof: boolean;
  matchedRecord: string | null;
};

export type JobMirrorReport = {
  role: {
    /** What the student actually typed as their target. */
    requested: string;
    roleId: string;
    displayName: string;
    headline: string;
    matchedBy: "alias" | "keywords" | "fallback";
    /** True when the target role is outside the eight researched roles. */
    isFallback: boolean;
  };
  /** Roles the dataset genuinely covers, for the "not your role?" picker. */
  researchedRoles: { roleId: string; displayName: string }[];
  coverage: {
    mustHave: TierCoverage;
    tools: TierCoverage;
    differentiators: TierCoverage;
  };
  skills: MirrorSkill[];
  salaryBands: MirrorSalaryBand[];
  whatJuniorsLack: MirrorTruth[];
  evidenceEmployersTrust: MirrorTruth[];
  evidenceHierarchy: { rank: number; label: string; detail: string }[];
  rejectionReasons: MirrorRejectionReason[];
  aiImpact: {
    automatedByAi: MirrorTruth[];
    stillValued: string[];
    emergingSkills: string[];
    stabilityNote: string;
    notes: MirrorTruth[];
  };
  portfolio: { typicalExperience: string | null; items: MirrorTruth[] };
  pakistan: {
    hiringNorms: MirrorTruth[];
    softwareHouses: string[];
    freelanceReality: MirrorTruth[];
    employerVsInternationalClient: {
      dimension: string;
      pakistaniEmployers: string;
      internationalClients: string;
    }[];
  };
  /** The student's own evidence totals — used for honest empty states. */
  studentEvidence: {
    hasResume: boolean;
    projectCount: number;
    demonstratedSkillCount: number;
    claimedOnlySkillCount: number;
    resumeDetectedSkillCount: number;
    githubRepositoryCount: number;
    githubRepositories: string[];
  };
  cvReadiness: CvReadinessItem[];
  personalized: MirrorPersonalization | null;
  provenance: {
    version: string;
    lastResearched: string;
    note: string;
    /** Field groups whose refresh cadence has lapsed — shown as a warning. */
    staleFieldGroups: string[];
  };
  generatedAt: string;
};

/* ------------------------------------------------------------------ */
/* Citation mapping                                                    */
/* ------------------------------------------------------------------ */

function toMirrorCitation(citation: Citation | null): MirrorCitation | null {
  if (!citation) return null;
  return { label: citation.label, url: citationUrl(citation) };
}

function toMirrorTruth(statement: TruthStatement): MirrorTruth {
  return { statement: statement.statement, citation: toMirrorCitation(statement.source) };
}

function toMirrorBand(label: string, band: SalaryBand): MirrorSalaryBand {
  return {
    label,
    min: band.min,
    max: band.max,
    currency: band.currency,
    period: band.period,
    note: band.note,
    citation: toMirrorCitation(band.source) ?? { label: band.source.label, url: null },
  };
}

/* ------------------------------------------------------------------ */
/* Freshness                                                           */
/* ------------------------------------------------------------------ */

/** Field groups worth warning about on this screen. */
const WATCHED_FIELD_GROUPS: MarketTruthFieldGroup[] = [
  "mustHaveSkills",
  "toolPopularity",
  "aiSkillDemand",
  "pakistanSalaries",
  "usdSalaries",
  "aiAutomation",
];

function staleFieldGroups(asOf: string): string[] {
  return WATCHED_FIELD_GROUPS.filter((group) => isStale(group, asOf));
}

/* ------------------------------------------------------------------ */
/* AI personalization — prose only                                     */
/* ------------------------------------------------------------------ */

const SYSTEM = `You are CareerPilot's market mirror. You explain how one student measures against RESEARCHED market expectations for their target role.

Return ONLY JSON:
{
  "verdict": string (max 180 chars — one sentence naming where this student actually stands for this role),
  "brutal_truth": string (max 240 chars — the single most uncomfortable, specific fact about their gap),
  "build_next": string (max 240 chars — ONE concrete, buildable piece of evidence that closes the biggest must-have gap)
}

NON-NEGOTIABLE RULES:
- Use ONLY the facts given to you. The MARKET TRUTH block and the STUDENT block are your only sources.
- NEVER invent a statistic, percentage, salary figure, company name, or job opening. If you cite a number, it must appear verbatim in the MARKET TRUTH block.
- NEVER claim the student has a skill the STUDENT block does not list.
- A skill marked "claimed" is NOT proof. Say so plainly.
- If the student has no demonstrated skills, say directly that they have no evidence — do not soften it.
- Never predict hiring outcomes and never guarantee employment.
- Name the gap, not a feeling. "You cannot show a component test" — not "you may want to explore testing".`;

function skillLine(skill: MirrorSkill): string {
  const note = skill.note ? ` — ${skill.note}` : "";
  return `${skill.skill} [${skill.status}]${note}`;
}

function buildPrompt(report: JobMirrorReport, state: CareerState): string {
  const marketTruth = [
    `Target role: ${report.role.displayName}${report.role.isFallback ? " (NOT one of the researched roles — this is generic guidance)" : ""}`,
    `Market headline: ${report.role.headline}`,
    "",
    "Must-have skills (missing one of these ends the application):",
    ...report.skills.filter((s) => s.tier === "must-have").map((s) => `  - ${skillLine(s)}`),
    "",
    "Differentiators that actually stand out:",
    ...report.skills.filter((s) => s.tier === "differentiator").map((s) => `  - ${skillLine(s)}`),
    "",
    "Why juniors get filtered out of this role:",
    ...report.whatJuniorsLack.map((t) => `  - ${t.statement}`),
    "",
    "Evidence employers trust for this role:",
    ...report.evidenceEmployersTrust.map((t) => `  - ${t.statement}`),
  ].join("\n");

  const student = [
    `Must-have coverage: ${report.coverage.mustHave.covered}/${report.coverage.mustHave.total} demonstrated (${report.coverage.mustHave.pct}%)`,
    `Resume on file: ${report.studentEvidence.hasResume ? "yes" : "no"}`,
    `Projects recorded: ${report.studentEvidence.projectCount}`,
    `Skills with project/GitHub proof: ${
      report.skills
        .filter((s) => s.status === "demonstrated")
        .map((s) => s.skill)
        .join(", ") || "none"
    }`,
    `Skills claimed with no proof: ${
      report.skills
        .filter((s) => s.status === "claimed")
        .map((s) => s.skill)
        .join(", ") || "none"
    }`,
    `Market expectations not recorded at all: ${
      report.skills
        .filter((s) => s.status === "missing")
        .map((s) => s.skill)
        .join(", ") || "none"
    }`,
    `Resume detected skills: ${state.resume.detectedSkills.join(", ") || "none"}`,
    `Resume weaknesses: ${state.resume.weaknesses.join("; ") || "none recorded"}`,
    `Project and GitHub proof: ${
      state.projects
        .map((project) => `${project.name}${project.projectUrl ? ` (${project.projectUrl})` : ""}`)
        .join("; ") || "none recorded"
    }`,
    `Stage: ${state.readiness?.stage ?? "unknown"}`,
  ].join("\n");

  return `=== MARKET TRUTH (researched ${report.provenance.lastResearched}) ===\n${marketTruth}\n\n=== STUDENT ===\n${student}`;
}

const clamp = (value: unknown, max: number) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

/**
 * Ask the model to narrate the gap. Optional by design: any failure
 * returns null and the caller still ships a complete, cited report.
 */
async function personalize(
  report: JobMirrorReport,
  state: CareerState,
): Promise<MirrorPersonalization | null> {
  try {
    const raw = await groqChat(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildPrompt(report, state) },
      ],
      { json: true, maxTokens: 700, temperature: 0.3 },
    );
    const out = parseJsonObject<Record<string, unknown>>(raw);
    const verdict = clamp(out["verdict"], 180);
    const brutalTruth = clamp(out["brutal_truth"], 240);
    const buildNext = clamp(out["build_next"], 240);
    if (!verdict && !brutalTruth && !buildNext) return null;
    return { verdict, brutalTruth, buildNext };
  } catch (error) {
    console.error("[CareerPilot][jobmirror] personalization unavailable", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function personalizeWithinBudget(
  report: JobMirrorReport,
  state: CareerState,
): Promise<MirrorPersonalization | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      personalize(report, state),
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), 4_000);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/* ------------------------------------------------------------------ */
/* Report assembly                                                     */
/* ------------------------------------------------------------------ */

function assemble(
  profile: RoleTruthProfile,
  match: ReturnType<typeof matchRoleProfile>,
  requested: string,
  state: CareerState,
): JobMirrorReport {
  const studentSkills = state.skills.map((skill) => ({
    name: skill.name,
    sources: skill.sources,
    strength: skill.evidenceStrength,
  }));

  /* Skill matching lives in ./market-fit so the Diagnostic scores the same
     student against the same expectations and never contradicts this screen. */
  const resolve = (requirement: SkillRequirement, tier: SkillTier) =>
    resolveRequirement(requirement, tier, studentSkills, toMirrorCitation);

  const skills: MirrorSkill[] = [
    ...profile.mustHaveSkills.map((s) => resolve(s, "must-have")),
    ...profile.commonTools.map((s) => resolve(s, "tool")),
    ...profile.differentiators.map((s) => resolve(s, "differentiator")),
  ];

  const salaryBands: MirrorSalaryBand[] = [
    toMirrorBand("Junior · Pakistan (on-site)", profile.salary.pakistanOnSite),
    ...(profile.salary.pakistanRemoteIntl
      ? [
          toMirrorBand(
            "Pakistan-based · remote for international clients",
            profile.salary.pakistanRemoteIntl,
          ),
        ]
      : []),
    toMirrorBand("Junior · fully remote (global)", profile.salary.globalRemoteUSD),
    ...(profile.salary.usOnSite
      ? [toMirrorBand("Entry level · US on-site", profile.salary.usOnSite)]
      : []),
    ...profile.salary.additionalBands.map((extra) => toMirrorBand(extra.label, extra.band)),
  ];

  const trustedEvidence = profile.evidenceEmployersTrust.map(toMirrorTruth);

  const cvReadiness: CvReadinessItem[] = profile.mustHaveSkills.map((requirement) => {
    const aliases = skillAliases(requirement.skill);
    const matchingRecords = studentSkills.filter((record) =>
      aliases.some((alias) => satisfies(record.name, alias)),
    );
    const cvMentioned = state.resume.detectedSkills.some((skill) =>
      aliases.some((alias) => satisfies(skill, alias)),
    );
    const githubProof = matchingRecords.some((record) => record.sources.includes("github"));
    const projectProof = matchingRecords.some((record) => record.sources.includes("project"));
    const matchedRecord = matchingRecords[0]?.name ?? null;

    return {
      skill: requirement.skill,
      status:
        githubProof || projectProof
          ? "demonstrated"
          : cvMentioned || matchedRecord
            ? "claimed"
            : "missing",
      cvMentioned,
      githubProof,
      projectProof,
      matchedRecord,
    };
  });

  const demonstratedSkillCount = studentSkills.filter(
    (s) => statusFor(s) === "demonstrated",
  ).length;

  return {
    role: {
      requested,
      roleId: profile.roleId,
      displayName: profile.displayName,
      headline: profile.headline,
      matchedBy: match.matchedBy,
      isFallback: match.isFallback,
    },
    researchedRoles: ROLE_OPTIONS.map((option) => ({ ...option })),
    coverage: {
      mustHave: coverageOf(skills, "must-have"),
      tools: coverageOf(skills, "tool"),
      differentiators: coverageOf(skills, "differentiator"),
    },
    skills,
    salaryBands,
    whatJuniorsLack: profile.whatJuniorsLack.map(toMirrorTruth),
    evidenceEmployersTrust: trustedEvidence,
    evidenceHierarchy: EVIDENCE_HIERARCHY.map((tier) => ({
      rank: tier.rank,
      label: tier.label,
      detail: tier.detail,
    })),
    rejectionReasons: TOP_REJECTION_REASONS.map((reason) => ({
      rank: reason.rank,
      title: reason.title,
      detail: reason.detail,
      stats: reason.stats.map((entry) => ({
        label: entry.label,
        value: entry.value,
        detail: entry.detail,
        citation: toMirrorCitation(entry.source),
      })),
      citations: reason.sources
        .map(toMirrorCitation)
        .filter((entry): entry is MirrorCitation => entry !== null),
    })),
    aiImpact: {
      automatedByAi: profile.aiImpact.automatedByAi.map(toMirrorTruth),
      stillValued: [...profile.aiImpact.stillValued],
      emergingSkills: [...profile.aiImpact.emergingSkills],
      stabilityNote: profile.aiImpact.stabilityNote,
      notes: profile.aiImpact.notes.map(toMirrorTruth),
    },
    portfolio: {
      typicalExperience: profile.portfolioExpectations.typicalExperience,
      items: profile.portfolioExpectations.items.map(toMirrorTruth),
    },
    pakistan: {
      hiringNorms: PAKISTAN_MARKET.hiringNorms.map(toMirrorTruth),
      softwareHouses: [...PAKISTAN_MARKET.softwareHouses],
      freelanceReality: PAKISTAN_MARKET.freelanceReality.map(toMirrorTruth),
      employerVsInternationalClient: PAKISTAN_MARKET.employerVsInternationalClient.map((entry) => ({
        dimension: entry.dimension,
        pakistaniEmployers: entry.pakistaniEmployers,
        internationalClients: entry.internationalClients,
      })),
    },
    studentEvidence: {
      hasResume: state.resume.hasResume,
      projectCount: state.projects.length,
      demonstratedSkillCount,
      claimedOnlySkillCount: studentSkills.length - demonstratedSkillCount,
      resumeDetectedSkillCount: state.resume.detectedSkills.length,
      githubRepositoryCount: state.projects.filter((project) =>
        /github\.com\//i.test(project.projectUrl ?? ""),
      ).length,
      githubRepositories: state.projects
        .map((project) => project.projectUrl)
        .filter((url): url is string => Boolean(url && /github\.com\//i.test(url))),
    },
    cvReadiness,
    personalized: null,
    provenance: {
      version: MARKET_TRUTH_VERSION,
      lastResearched: LAST_RESEARCHED,
      note: MARKET_TRUTH_PROVENANCE,
      staleFieldGroups: staleFieldGroups(new Date().toISOString().slice(0, 10)),
    },
    generatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

/**
 * Build the Job Mirror for one student.
 *
 * `roleOverride` lets the student read a different researched role than
 * their saved target — the dataset only covers eight, so the UI offers an
 * explicit picker rather than silently guessing.
 */
export async function generateJobMirror(
  supabase: Client,
  userId: string,
  roleOverride?: string,
): Promise<JobMirrorReport> {
  const state = await buildCareerState(supabase, userId);

  const requested = (roleOverride ?? state.targetRole ?? "").trim();
  if (!requested) {
    throw new Error(
      "Choose a target career first — the mirror needs a role to hold the market up against.",
    );
  }

  const match = matchRoleProfile(requested);
  const report = assemble(match.profile, match, requested, state);

  console.info("[CareerPilot][jobmirror] assembled", {
    userId,
    requested,
    roleId: report.role.roleId,
    matchedBy: report.role.matchedBy,
    mustHaveCoverage: `${report.coverage.mustHave.covered}/${report.coverage.mustHave.total}`,
  });

  // Personalization is optional; never hold the complete market report hostage
  // to a slow or exhausted AI provider.
  report.personalized = await personalizeWithinBudget(report, state);
  return report;
}
