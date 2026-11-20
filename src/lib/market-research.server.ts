import type { SupabaseClient } from "@supabase/supabase-js";

import {
  citationUrl,
  LAST_RESEARCHED,
  matchRoleProfile,
  PAKISTAN_MARKET,
  TOP_REJECTION_REASONS,
  type RoleTruthProfile,
  type SalaryBand,
} from "@/data/market-truth";
import type { Database } from "@/integrations/supabase/types";
import {
  formatLocationFilter,
  type JobLocationFilter,
} from "./jobs/providers";
import { refreshJobMarket, type LiveJobMarket } from "./jobs/research";

type Client = SupabaseClient<Database>;

/* ------------------------------------------------------------------ *
 * Market Reality · Research Layer
 *
 * Collects structured market evidence for a student's target role.
 * Kept separate from the analysis layer (market.server.ts) so the
 * evidence source can be swapped without touching presentation, as long
 * as it implements MarketResearchProvider and returns MarketEvidence.
 *
 * The default provider reads `@/data/market-truth` — researched, cited
 * data with a known collection date. It makes no network calls and costs
 * nothing to run. It is a FALLBACK ONLY: a static snapshot from
 * 2026-08-31 (see LAST_RESEARCHED), never "live" — the UI must label it
 * as a snapshot with its date, never as current market research.
 *
 * Fields the dataset does not cover are returned EMPTY on purpose. An
 * empty list is honest; a model-generated list presented as research is
 * not.
 *
 * The live job layer (src/lib/jobs) is the live path: Tavily-backed
 * search over real postings (`refreshJobMarket`), aggregated into skill
 * frequencies and merged into the dataset evidence with provenance.
 * When the live layer is unavailable, the dataset snapshot stands
 * alone — labelled as a snapshot, never as live.
 *
 * Server-only file (.server.ts) — never imported from client code.
 * ------------------------------------------------------------------ */

export type MarketResearchQuery = {
  targetRole: string;
  targetIndustry: string | null;
  /** Geographic scope. Null = global view. */
  location: JobLocationFilter | null;
  education: string | null;
  experience: string | null;
};

/** Pre-loaded profile + goal data so callers can avoid duplicate DB queries. */
export type MarketResearchInputs = {
  targetRole: string;
  targetIndustry: string | null;
  education: string | null;
  experience: string | null;
  location: JobLocationFilter | null;
};

export type MarketEvidence = {
  collectedAt: string; // ISO timestamp
  // "market-truth-dataset" = static snapshot fallback (2026-08-31, never
  // live) · "market-truth-dataset+live-jobs" = snapshot enriched with live
  // Tavily job postings (see the "live-job-postings" source for the date).
  provider: string;
  /**
   * When the underlying facts were actually researched (YYYY-MM-DD).
   * Distinct from `collectedAt`, which is only when this object was built.
   * A model recalling its training data has no meaningful research date.
   */
  researchedOn: string | null;
  pakistanMarket: {
    demand: string;
    hiringCities: string[];
    commonRequirements: string[];
    frequentTechnologies: string[];
    entryLevelExpectations: string[];
    experienceRequirements: string[];
    remoteOpportunities: string;
    patterns: string[];
  };
  globalMarket: {
    demand: string;
    commonTechnologies: string[];
    commonResponsibilities: string[];
    experienceExpectations: string[];
    remotePatterns: string[];
    pakistanVsInternational: string[];
  };
  employerEvidence: {
    recurringSkills: string[];
    recurringTechnologies: string[];
    recurringResponsibilities: string[];
    experiencePatterns: string[];
    toolsAndPlatforms: string[];
    cloudRequirements: string[];
    aiRequirements: string[];
  };
  technologySignals: {
    current: { name: string; evidence: string }[];
    stable: { name: string; evidence: string }[];
    growing: { name: string; evidence: string }[];
    emerging: { name: string; evidence: string }[];
    declining: { name: string; evidence: string }[];
  };
  aiImpact: {
    currentEvidence: string[];
    expectedEvolution: string[];
  };
  salaryInsights: {
    entryLevel: string;
    midLevel: string;
    seniorLevel: string;
    currency: string;
    notes: string[];
  };
  sources: {
    type: string;
    description: string;
    date: string;
  }[];
};

export interface MarketResearchProvider {
  collectEvidence(query: MarketResearchQuery): Promise<MarketEvidence>;
}

/* ------------------------------------------------------------------ */
/* Fallback provider — the researched dataset snapshot (2026-08-31)    */
/* ------------------------------------------------------------------ */

function bandText(band: SalaryBand, label: string): string {
  const unit = band.currency === "PKR" ? "PKR" : "USD";
  const per = band.period === "month" ? "/month" : "/year";
  const range = `${band.min.toLocaleString("en-US")}–${band.max.toLocaleString("en-US")} ${unit}${per}`;
  const source = band.source ? ` [${band.source.label}]` : "";
  return `${label}: ${range}${band.note ? ` — ${band.note}` : ""}${source}`;
}

/** `statement [Source label]`, so a citation survives into the prompt and UI. */
function cited(statement: { statement: string; source: { label: string } | null }): string {
  return statement.source
    ? `${statement.statement} [${statement.source.label}]`
    : statement.statement;
}

function requirementText(entry: { skill: string; note: string | null }): string {
  return entry.note ? `${entry.skill} — ${entry.note}` : entry.skill;
}

/**
 * Builds market evidence from the researched, cited dataset.
 *
 * FALLBACK ONLY. This is a static snapshot from 2026-08-31
 * (LAST_RESEARCHED) — it must never be labelled "live" in the UI. The
 * live path is `refreshJobMarket` (Tavily-backed, src/lib/jobs), merged
 * in by `mergeLiveJobEvidence`; this provider stands alone only when
 * the live layer is unavailable.
 *
 * No network calls, no model, no cost. Deterministic for a given role, so
 * the Market Reality screen and the Flight Plan cannot disagree.
 *
 * Where the dataset genuinely has nothing (hiring cities, per-city
 * posting counts, "declining" technology verdicts) the field stays empty
 * rather than being filled in by a model. That absence is the point.
 */
export class MarketTruthProvider implements MarketResearchProvider {
  async collectEvidence(query: MarketResearchQuery): Promise<MarketEvidence> {
    const match = matchRoleProfile(query.targetRole);
    return buildDatasetEvidence(match.profile, match.isFallback);
  }
}

function buildDatasetEvidence(profile: RoleTruthProfile, isFallback: boolean): MarketEvidence {
  const scopeNote = isFallback
    ? "This role is outside the eight researched roles, so the figures below are general entry-level expectations rather than role-specific research."
    : "";

  const salaryBands = [
    bandText(profile.salary.globalRemoteUSD, "Junior, fully-remote global"),
    profile.salary.usOnSite ? bandText(profile.salary.usOnSite, "Entry level, US on-site") : null,
    ...profile.salary.additionalBands.map((entry) => bandText(entry.band, entry.label)),
  ].filter((line): line is string => line !== null);

  return {
    collectedAt: new Date().toISOString(),
    provider: "market-truth-dataset",
    researchedOn: LAST_RESEARCHED,
    pakistanMarket: {
      demand: [profile.headline, scopeNote].filter(Boolean).join(" "),
      /* The dataset names software houses as the entry path but does not
         rank hiring by city, so this stays empty rather than guessed. */
      hiringCities: [],
      commonRequirements: profile.mustHaveSkills.map(requirementText),
      frequentTechnologies: profile.commonTools.map((tool) => tool.skill),
      entryLevelExpectations: profile.portfolioExpectations.items.map(cited),
      experienceRequirements: profile.portfolioExpectations.typicalExperience
        ? [profile.portfolioExpectations.typicalExperience]
        : [],
      remoteOpportunities: profile.salary.pakistanRemoteIntl
        ? bandText(
            profile.salary.pakistanRemoteIntl,
            "Remote work for international clients pays materially more than local on-site work",
          )
        : "",
      patterns: [
        ...PAKISTAN_MARKET.hiringNorms.map(cited),
        ...profile.pakistanSpecifics.map(cited),
      ],
    },
    globalMarket: {
      demand: [profile.headline, profile.aiImpact.stabilityNote, scopeNote]
        .filter(Boolean)
        .join(" "),
      commonTechnologies: profile.commonTools.map((tool) => tool.skill),
      commonResponsibilities: profile.evidenceEmployersTrust.map(cited),
      experienceExpectations: profile.portfolioExpectations.typicalExperience
        ? [profile.portfolioExpectations.typicalExperience]
        : [],
      remotePatterns: profile.salary.pakistanRemoteIntl
        ? [bandText(profile.salary.globalRemoteUSD, "Global remote benchmark")]
        : [],
      pakistanVsInternational: [],
    },
    employerEvidence: {
      recurringSkills: profile.mustHaveSkills.map(requirementText),
      recurringTechnologies: profile.commonTools.map(requirementText),
      recurringResponsibilities: [],
      /* Why candidates get filtered out is researched; how employers phrase
         experience requirements is not. */
      experiencePatterns: [
        ...profile.whatJuniorsLack.map(cited),
        ...TOP_REJECTION_REASONS.slice(0, 3).map((reason) => `${reason.title} — ${reason.detail}`),
      ],
      toolsAndPlatforms: profile.commonTools.map((tool) => tool.skill),
      cloudRequirements: [],
      aiRequirements: profile.aiImpact.emergingSkills,
    },
    technologySignals: {
      current: profile.commonTools.map((tool) => ({
        name: tool.skill,
        evidence: tool.note ?? (tool.source ? `Researched: ${tool.source.label}` : ""),
      })),
      stable: profile.mustHaveSkills.map((skill) => ({
        name: skill.skill,
        evidence: skill.note ?? "Non-negotiable for this role — missing it ends the application.",
      })),
      growing: profile.differentiators.map((skill) => ({
        name: skill.skill,
        evidence: skill.note ?? "Researched differentiator for juniors in this role.",
      })),
      emerging: profile.aiImpact.emergingSkills.map((name) => ({
        name,
        evidence: "Growing fast enough to be a hiring differentiator right now.",
      })),
      /* We do not call a technology "declining" without a cited verdict. */
      declining: [],
    },
    aiImpact: {
      currentEvidence: profile.aiImpact.automatedByAi.map(cited),
      expectedEvolution: [...profile.aiImpact.stillValued, ...profile.aiImpact.notes.map(cited)],
    },
    salaryInsights: {
      entryLevel: salaryBands.join(" · "),
      /* The dataset researched entry level only. Saying nothing beats
         inventing mid and senior figures. */
      midLevel: "",
      seniorLevel: "",
      currency: "USD",
      notes: [
        "Global compensation varies by country, employment model, experience, and total package.",
        ...profile.salary.additionalBands.map((entry) => bandText(entry.band, entry.label)),
      ].slice(0, 4),
    },
    sources: datasetSources(profile),
  };
}

/** Real citations from the dataset, deduped, with URLs where they exist. */
function datasetSources(profile: RoleTruthProfile): MarketEvidence["sources"] {
  const citations = [
    ...profile.mustHaveSkills.map((skill) => skill.source),
    ...profile.commonTools.map((tool) => tool.source),
    ...profile.whatJuniorsLack.map((truth) => truth.source),
    ...profile.evidenceEmployersTrust.map((truth) => truth.source),
    ...profile.aiImpact.automatedByAi.map((truth) => truth.source),
    profile.salary.globalRemoteUSD.source,
    profile.salary.usOnSite?.source ?? null,
    ...profile.salary.additionalBands.map((entry) => entry.band.source),
    ...TOP_REJECTION_REASONS.flatMap((reason) => reason.sources),
  ];

  const seen = new Set<string>();
  const sources: MarketEvidence["sources"] = [
    // First source names the fallback for what it is: a static snapshot,
    // dated, never live. The live path appends a "live-job-postings"
    // source with its own research date (see mergeLiveJobEvidence).
    {
      type: "dataset-snapshot",
      description: `Market-truth dataset snapshot from ${LAST_RESEARCHED} — static fallback, not live research`,
      date: LAST_RESEARCHED,
    },
  ];
  for (const citation of citations) {
    if (!citation || seen.has(citation.label)) continue;
    seen.add(citation.label);
    const url = citationUrl(citation);
    sources.push({
      type: url ?? "researched-source",
      description: citation.label,
      date: LAST_RESEARCHED,
    });
  }
  return sources.slice(0, 24);
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

/**
 * Collect market evidence for a student's target role.
 *
 * Accepts either:
 *  - Pre-loaded inputs (when the caller already fetched profile + goal), or
 *  - Falls back to loading them from Supabase.
 *
 * This avoids duplicate DB queries when the analysis layer has already
 * loaded the user's career goal.
 */
export async function collectMarketEvidence(
  supabase: Client,
  userId: string,
  preloaded?: MarketResearchInputs,
): Promise<MarketEvidence> {
  let inputs: MarketResearchInputs;

  if (preloaded) {
    inputs = preloaded;
  } else {
    /* Load Phase 1 inputs in parallel ------------------------------ */
    const [profileRes, goalRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("career_goals").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const profile = profileRes.data;
    const goal = goalRes.data;
    const targetRole = goal?.target_role?.trim();

    if (!targetRole) {
      throw new Error("No target role found. Please complete Phase 1 (Know Me) first.");
    }

    // `location` is added by the Phase 3 migration; the generated DB
    // types do not know it yet, so read it defensively.
    const locationRaw =
      (goal as { location?: string | null } | null)?.location ?? null;
    inputs = {
      targetRole,
      targetIndustry: goal?.target_industry ?? null,
      education: profile?.education_level ?? null,
      experience: profile?.experience ?? null,
      location: parseLocationFilter(locationRaw),
    };
  }

  /* Build the research query ------------------------------------- */
  const query: MarketResearchQuery = {
    targetRole: inputs.targetRole,
    targetIndustry: inputs.targetIndustry,
    location: inputs.location,
    education: inputs.education,
    experience: inputs.experience,
  };

  /* Collect evidence --------------------------------------------- *
   * The researched dataset is the base source: cited, dated, free to
   * run and identical for every student with the same target role.
   * The live job layer optionally enriches it with real skill
   * frequencies from stored postings; when unavailable, the dataset
   * stands alone (never invented data). */
  const provider: MarketResearchProvider = new MarketTruthProvider();
  const evidence = await provider.collectEvidence(query);
  return mergeLiveJobEvidence(supabase, userId, query, evidence);
}

/**
 * Parse the free-text location stored on career_goals into a filter.
 * Stored as "City, Country", "Country", or "Remote" (case-insensitive).
 */
export function parseLocationFilter(
  raw: string | null,
): JobLocationFilter | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  if (/^remote$/i.test(text)) return { country: null, city: null, workMode: "remote" };
  const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return { country: parts[0]!, city: null, workMode: null };
  return { country: parts[parts.length - 1]!, city: parts.slice(0, -1).join(", "), workMode: null };
}

/**
 * Best-effort live enrichment: aggregate real skill frequencies from
 * stored job postings and fold them into the dataset evidence with
 * provenance. Returns the base evidence unchanged on any failure.
 */
async function mergeLiveJobEvidence(
  supabase: Client,
  userId: string,
  query: MarketResearchQuery,
  base: MarketEvidence,
): Promise<MarketEvidence> {
  const location: JobLocationFilter = query.location ?? {
    country: null,
    city: null,
    workMode: null,
  };
  let live: LiveJobMarket | null = null;
  try {
    live = await refreshJobMarket(supabase, userId, query.targetRole, location);
  } catch (error) {
    console.warn(
      "[MarketResearch] live job layer failed, using dataset only:",
      error instanceof Error ? error.message : String(error),
    );
    return base;
  }
  if (!live || live.aggregation.skills.length === 0) return base;

  const locationStr = formatLocationFilter(location);
  const top = live.aggregation.skills.slice(0, 8).map(
    (s) =>
      `${s.skill} — mentioned in ${s.total} of ${live!.aggregation.jobsAnalysed} live postings` +
      (s.mustHave > 0 ? ` (${s.mustHave} as required)` : ""),
  );
  return {
    ...base,
    provider: "market-truth-dataset+live-jobs",
    employerEvidence: {
      ...base.employerEvidence,
      recurringSkills: top,
    },
    sources: [
      ...base.sources,
      {
        type: "live-job-postings",
        description:
          `Skill frequencies aggregated from ${live.aggregation.jobsAnalysed} live job ` +
          `postings${locationStr ? ` (${locationStr})` : ""} via ${live.providerName}`,
        date: live.researchedOn,
      },
    ],
  };
}
