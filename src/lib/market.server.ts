import type { SupabaseClient } from "@supabase/supabase-js";

import { MARKET_TRUTH_VERSION } from "@/data/market-truth";
import { AiError, groqChat, parseJsonObject, type ChatMsg } from "./ai.server";
import { consumeAiCall } from "./billing.server";
import { locationCacheKey } from "./jobs/providers";
import {
  collectMarketEvidence,
  parseLocationFilter,
  type MarketEvidence,
  type MarketResearchInputs,
} from "./market-research.server";
import type { Database, Json } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

/**
 * Deterministic cache-key fragment for a Market Reality report.
 * Includes the dataset version (a dataset update must not serve stale
 * reports) and the location scope (different locations, different
 * markets). Exported for tests. (Ported from careerpilot-studio.)
 */
export function marketCacheKey(
  targetRole: string,
  datasetVersion: string,
  location: string | null,
): string {
  const filter = parseLocationFilter(location);
  const locationPart = filter ? locationCacheKey(filter) : "global";
  return [targetRole.trim().toLowerCase(), datasetVersion, locationPart].join(
    "::",
  );
}

/* ------------------------------------------------------------------ *
 * Market Reality — Phase 2 · Analysis Layer
 *
 * Consumes raw MarketEvidence from the research layer and synthesises
 * it into a student-friendly Market Reality report via a second AI
 * call.  The research layer is responsible for evidence collection;
 * this layer is responsible for analysis and presentation.
 *
 * Results are cached in the `market_reality_cache` table (7-day TTL).
 * Cache is keyed by (user_id, target_role, dataset_version, location) —
 * if the user changes their career goal, location, or the dataset is
 * updated, a fresh report is generated automatically.
 * ------------------------------------------------------------------ */

export type MarketSkillCategory = {
  label: string; // e.g. "Technologies", "Engineering Skills", "Professional Skills"
  items: string[];
};

export type MarketSkillDemand = {
  high: string[];
  common: string[];
  roleSpecific: string[];
};

export type MarketReality = {
  targetRole: string;
  targetIndustry: string | null;
  /**
   * Geographic scope the report was generated for, as entered by the user
   * ("Lahore, Pakistan", "Remote", ...). Null = global view.
   */
  location: string | null;
  roleSnapshot: {
    summary: string; // one-paragraph overview of the role
    involves: string[]; // bullet points of typical activities
  };
  companiesAskFor: MarketSkillCategory[];
  skillDemand: MarketSkillDemand;
  experienceExpectations: string[];
  responsibilities: { label: string; description: string }[];
  entryLevelReality: string[];
  marketSignals: string[];
  summary: {
    marketPriorities: string[];
    commonTechnologies: string[];
    experienceSignals: string[];
    keyResponsibilities: string[];
  };
  /* ---- Research-backed sections (from evidence layer) ---- */
  pakistanMarket: MarketEvidence["pakistanMarket"];
  globalMarket: MarketEvidence["globalMarket"];
  employerEvidence: MarketEvidence["employerEvidence"];
  technologySignals: MarketEvidence["technologySignals"];
  aiImpact: MarketEvidence["aiImpact"];
  salaryInsights: MarketEvidence["salaryInsights"];
  sources: MarketEvidence["sources"];
  evidenceCollectedAt: string; // ISO timestamp from research layer
  /** Which evidence source produced this, e.g. "market-truth-dataset". */
  evidenceProvider: string;
  /**
   * When the underlying facts were researched (YYYY-MM-DD), or null when the
   * source has no verifiable research date. The UI must not imply a date the
   * evidence does not have.
   */
  researchedOn: string | null;
  /** True when served from DB cache (no AI calls were made). */
  fromCache?: boolean;
};

/* ------------------------------------------------------------------ */

/**
 * Fetch (or generate) the Market Reality report for the authenticated user.
 *
 * 1. Load the user's career goal (target role / industry).
 * 2. Check the DB cache — if a non-expired report exists for the same
 *    target role, return it immediately (zero AI calls).
 * 3. Otherwise, collect evidence + synthesise via AI, then cache the result.
 *
 * Pass `forceRefresh: true` to bypass the cache.
 */
export async function generateMarketReality(
  supabase: Client,
  userId: string,
  opts?: { forceRefresh?: boolean },
): Promise<MarketReality> {
  /* 1. Load Phase 1 inputs (for target role / industry) -------------------- */
  const [goalRes, profileRes] = await Promise.all([
    supabase.from("career_goals").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("profiles")
      .select("education_level, experience")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const goal = goalRes.data;
  const profile = profileRes.data;
  const targetRole = goal?.target_role?.trim();

  if (!targetRole) {
    throw new Error("No target role found. Please complete Phase 1 (Know Me) first.");
  }

  const targetIndustry = goal?.target_industry ?? null;

  // `location` is added by the Phase 3 migration; read defensively until
  // the generated DB types know it.
  const location =
    ((goal as { location?: string | null } | null)?.location ?? null)?.trim() ||
    null;

  const preloaded: MarketResearchInputs = {
    targetRole,
    targetIndustry,
    education: profile?.education_level ?? null,
    experience: profile?.experience ?? null,
    location: parseLocationFilter(location),
  };

  /* 2. Check cache --------------------------------------------------------- */
  if (!opts?.forceRefresh) {
    const cached = await loadFromCache(
      supabase,
      userId,
      targetRole,
      MARKET_TRUTH_VERSION,
      location,
    );
    if (cached) {
      console.info("[MarketReality] served from cache", { userId, targetRole });
      return { ...cached, fromCache: true };
    }
  }

  // Quota is checked AFTER the cache check, so a cached report costs no AI
  // call. One AI call is consumed before the provider is called; throws
  // QuotaError at the limit, QuotaUnavailableError when the quota check
  // itself fails — either way the AI call must not run.
  await consumeAiCall(supabase, userId, "market");

  /* 3. Collect research evidence (pass pre-loaded inputs to avoid dup query) */
  const evidence = await collectMarketEvidence(supabase, userId, preloaded);

  /* 4. Synthesise evidence into Market Reality via AI --------------------- *
   * If the AI call fails (rate limit, timeout, etc.) we fall back to        *
   * building the report directly from the raw evidence so the user still    *
   * sees the research-backed screens (Pakistan Market, Global Market, etc.) */
  let report: MarketReality;
  try {
    const messages: ChatMsg[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildAnalysisPrompt(targetRole, targetIndustry, evidence) },
    ];

    const raw = await groqChat(messages, { json: true, maxTokens: 3000, temperature: 0.4 });
    const data = parseJsonObject<Record<string, unknown>>(raw);
    report = shapeMarketReality(data, targetRole, targetIndustry, location, evidence);
  } catch (error) {
    if (error instanceof AiError) {
      console.warn(
        "[MarketReality] AI synthesis failed, falling back to raw evidence:",
        error.message,
      );
      report = buildFallbackFromEvidence(targetRole, targetIndustry, location, evidence);
    } else {
      throw error;
    }
  }

  /* 5. Persist to cache ---------------------------------------------------- */
  await saveToCache(supabase, userId, targetRole, targetIndustry, location, report, evidence);

  return report;
}

/**
 * Invalidate the cached market report for a user.
 * Called when the user changes their career goal / target role.
 */
export async function invalidateMarketRealityCache(
  supabase: Client,
  userId: string,
): Promise<void> {
  await supabase.from("market_reality_cache").delete().eq("user_id", userId);
}

/* ------------------------------------------------------------------ */
/* Cache helpers                                                       */
/* ------------------------------------------------------------------ */

async function loadFromCache(
  supabase: Client,
  userId: string,
  targetRole: string,
  datasetVersion: string,
  location: string | null,
): Promise<MarketReality | null> {
  // NULL location means the global view; match it exactly so a
  // location-scoped report is never served as global (or vice versa).
  let filtered = supabase
    .from("market_reality_cache")
    .select("report, target_role, target_industry")
    .eq("user_id", userId)
    .eq("target_role", targetRole)
    // dataset_version + location are Phase 3 columns not yet in the
    // generated DB types; cast the column names so the filter compiles.
    .eq("dataset_version" as never, datasetVersion);
  filtered =
    location === null
      ? filtered.is("location" as never, null)
      : filtered.eq("location" as never, location);
  const { data, error } = await filtered
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  try {
    const report = data.report as unknown as Record<string, unknown>;
    return parseMarketRealityFromCache(
      report,
      data.target_role,
      data.target_industry,
      location,
    );
  } catch {
    return null;
  }
}

async function saveToCache(
  supabase: Client,
  userId: string,
  targetRole: string,
  targetIndustry: string | null,
  location: string | null,
  report: MarketReality,
  evidence: MarketEvidence,
): Promise<void> {
  // Clear any existing entries for this user first
  const { error: deleteError } = await supabase
    .from("market_reality_cache")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    // Silent cache failures mean every visit re-runs two Groq calls, so be loud.
    console.error(
      "[MarketReality] cache delete failed — reports will regenerate on every visit:",
      deleteError.message,
    );
    return;
  }

  // The generated DB types predate the Phase 3 columns; insert defensively.
  const { error: insertError } = await supabase
    .from("market_reality_cache")
    .insert({
      user_id: userId,
      target_role: targetRole,
      target_industry: targetIndustry,
      report: report as unknown as Json,
      evidence: evidence as unknown as Json,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      dataset_version: MARKET_TRUTH_VERSION,
      location,
    } as never);

  if (insertError) {
    console.error(
      "[MarketReality] cache insert failed — reports will regenerate on every visit:",
      insertError.message,
    );
  }
}

/**
 * Reconstruct a MarketReality from the cached JSONB blob.
 * The cached `report` already has the full MarketReality shape
 * (minus the `fromCache` flag), so we just need to validate it.
 */
function parseMarketRealityFromCache(
  raw: Record<string, unknown>,
  fallbackRole: string,
  fallbackIndustry: string | null,
  location: string | null,
): MarketReality {
  // The cached report was already shaped when first generated,
  // so we can return it directly with minimal validation.
  const roleSnapshot = (raw["roleSnapshot"] as Record<string, unknown>) ?? {};
  if (!roleSnapshot || typeof roleSnapshot !== "object") throw new Error("invalid cache");

  return {
    ...(raw as unknown as MarketReality),
    targetRole: typeof raw["targetRole"] === "string" ? raw["targetRole"] : fallbackRole,
    targetIndustry:
      (typeof raw["targetIndustry"] === "string" ? raw["targetIndustry"] : fallbackIndustry) ??
      fallbackIndustry,
    location: typeof raw["location"] === "string" ? raw["location"] : location,
    /* Reports cached before the dataset became the evidence source were built
       from model recall. They have no research date and must not claim one. */
    evidenceProvider:
      typeof raw["evidenceProvider"] === "string" ? raw["evidenceProvider"] : "groq-llm",
    researchedOn: typeof raw["researchedOn"] === "string" ? raw["researchedOn"] : null,
    fromCache: true,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function buildAnalysisPrompt(
  targetRole: string,
  targetIndustry: string | null,
  evidence: MarketEvidence,
): string {
  const lines: string[] = [];
  lines.push(`Analyse the collected market evidence and produce a Market Reality report.`);
  lines.push("");
  lines.push(`Target role: ${targetRole}`);
  if (targetIndustry) lines.push(`Target industry: ${targetIndustry}`);
  lines.push("");
  lines.push("--- Collected Evidence (JSON) ---");
  // Compact JSON — no pretty-printing, saves tokens on whitespace
  lines.push(JSON.stringify(evidence));
  lines.push("");
  lines.push("Use ONLY the evidence above. Do NOT invent new data.");
  lines.push("Return ONLY the JSON object described in the system instructions.");
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are a career-market analyst with a brutal honesty mandate. You receive structured market evidence and synthesise it into a clear, student-friendly Market Reality report.

You do NOT sugar-coat. If the market is saturated, say so. If a technology is dying, name it. If entry-level roles demand experience students can't realistically have, state it plainly. Students deserve the truth, not comfort.

CRITICAL RULES:
- Use ONLY the provided evidence. Do NOT invent companies, statistics, or facts not present in the evidence.
- Do NOT diagnose the student or comment on their profile — that's the Diagnosis feature's job.
- Present hard truths without cushioning: "This role is saturated" / "This technology is declining" / "Employers demand X and most candidates don't have it."
- If salary data shows low compensation, present it directly. Don't soften with "competitive" or "reasonable."
- If technology signals show declining tools, list them under "Declining" honestly. Don't hide bad news.
- If entry-level reality is harsh (e.g., "employers want 2+ years for junior roles"), say it plainly.
- Use direct market-research language: "Evidence shows…", "The data indicates…", "Employers demand…" — NOT "It might be helpful to know…"
- If the evidence is sparse on a point, say so honestly rather than filling in.
  - Global market data is FIRST-CLASS — always include worldwide evidence prominently.
  - Treat country-specific data as optional localization only, never as the default.

Return a JSON object with EXACTLY this structure:
{
  "roleSnapshot": {
    "summary": "One paragraph overview of what this role typically involves, based on the evidence",
    "involves": ["activity 1", "activity 2", ...]  // 4-6 bullet points derived from evidence
  },
  "companiesAskFor": [
    { "label": "Technologies", "items": ["React", "Node.js", ...] },
    { "label": "Engineering Skills", "items": ["APIs", "Testing", ...] },
    { "label": "Professional Skills", "items": ["Communication", ...] }
  ],
  "skillDemand": {
    "high": ["skill1", "skill2", ...],       // frequently requested (from employer evidence)
    "common": ["skill3", "skill4", ...],      // commonly requested
    "roleSpecific": ["skill5", "skill6", ...] // appears in some postings
  },
  "experienceExpectations": [
    "Expectation 1",
    "Expectation 2",
    ...
  ],  // 4-6 items about what employers commonly ask candidates to demonstrate
  "responsibilities": [
    { "label": "BUILD", "description": "Create and maintain applications" },
    { "label": "COLLABORATE", "description": "Work with engineers and designers" },
    ...
  ],  // 4-6 responsibility cards
  "entryLevelReality": [
    "Fact about entry-level market 1",
    "Fact about entry-level market 2",
    ...
  ],  // 4-6 realistic statements from evidence
  "marketSignals": [
    "Signal 1",
    "Signal 2",
    ...
  ],  // 4-6 patterns from the evidence
  "summary": {
    "marketPriorities": ["priority 1", "priority 2", ...],  // top 3-5 market expectations
    "commonTechnologies": ["tech 1", "tech 2", ...],         // top 3-5 technologies
    "experienceSignals": ["signal 1", "signal 2", ...],      // top 3-4 experience expectations
    "keyResponsibilities": ["resp 1", "resp 2", ...]         // top 3-4 responsibilities
  }
}`;

function strArray(v: unknown, max = 10): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, max);
}

/* ------------------------------------------------------------------ */
/* Fallback: build MarketReality directly from raw evidence            */
/* ------------------------------------------------------------------ */

/**
 * When the AI synthesis call fails (rate limit, timeout, etc.) we can
 * still present a useful report by mapping the raw evidence fields
 * directly into the MarketReality shape.  The research-backed screens
 * (Global Market, optional localization, Technology Signals, AI Impact,
 * Sources) will display perfectly; the AI-synthesised summary screens
 * will show evidence-derived content instead.
 */
function buildFallbackFromEvidence(
  targetRole: string,
  targetIndustry: string | null,
  location: string | null,
  evidence: MarketEvidence,
): MarketReality {
  const gl = evidence.globalMarket;
  const emp = evidence.employerEvidence;

  // Derive skill demand tiers from employer evidence
  const high = emp.recurringSkills.slice(0, 5);
  const common = emp.recurringTechnologies.slice(0, 5);
  const roleSpecific = [...emp.toolsAndPlatforms.slice(0, 4), ...emp.cloudRequirements.slice(0, 2)];

  // Build responsibilities from global market data
  const responsibilities = gl.commonResponsibilities.slice(0, 5).map((desc) => ({
    label: desc.split(" ").slice(0, 2).join(" ").toUpperCase(),
    description: desc,
  }));

  // Market signals from patterns
  const marketSignals = [...gl.remotePatterns.slice(0, 5), ...emp.experiencePatterns.slice(0, 2)];

  return {
    targetRole,
    targetIndustry,
    location,
    roleSnapshot: {
      summary:
        gl.demand || `Global market data for ${targetRole} — evidence collected successfully.`,
      involves:
        gl.commonResponsibilities.length > 0
          ? gl.commonResponsibilities
          : emp.recurringResponsibilities.slice(0, 5),
    },
    companiesAskFor: [
      {
        label: "Technologies",
        items: gl.commonTechnologies.slice(0, 10),
      },
      { label: "Skills", items: emp.recurringSkills.slice(0, 8) },
      { label: "Tools & Platforms", items: emp.toolsAndPlatforms.slice(0, 8) },
    ],
    skillDemand: { high, common, roleSpecific },
    experienceExpectations: gl.experienceExpectations,
    responsibilities,
    entryLevelReality: [...gl.experienceExpectations, ...gl.remotePatterns].slice(0, 6),
    marketSignals,
    summary: {
      marketPriorities: emp.recurringSkills.slice(0, 5),
      commonTechnologies: gl.commonTechnologies.slice(0, 5),
      experienceSignals: gl.experienceExpectations.slice(0, 4),
      keyResponsibilities: gl.commonResponsibilities.slice(0, 4),
    },
    pakistanMarket: evidence.pakistanMarket,
    globalMarket: gl,
    employerEvidence: emp,
    technologySignals: evidence.technologySignals,
    aiImpact: evidence.aiImpact,
    salaryInsights: evidence.salaryInsights,
    sources: evidence.sources,
    evidenceCollectedAt: evidence.collectedAt,
    evidenceProvider: evidence.provider,
    researchedOn: evidence.researchedOn,
  };
}

function shapeMarketReality(
  data: Record<string, unknown>,
  targetRole: string,
  targetIndustry: string | null,
  location: string | null,
  evidence: MarketEvidence,
): MarketReality {
  const roleSnapshot = (data["roleSnapshot"] as Record<string, unknown>) ?? {};
  const companiesAskFor = (data["companiesAskFor"] as Record<string, unknown>[]) ?? [];
  const skillDemand = (data["skillDemand"] as Record<string, unknown>) ?? {};
  const responsibilities = (data["responsibilities"] as Record<string, unknown>[]) ?? [];
  const summary = (data["summary"] as Record<string, unknown>) ?? {};

  return {
    targetRole,
    targetIndustry,
    location,
    roleSnapshot: {
      summary: typeof roleSnapshot["summary"] === "string" ? roleSnapshot["summary"] : "",
      involves: strArray(roleSnapshot["involves"], 6),
    },
    companiesAskFor: companiesAskFor.map((cat) => ({
      label: typeof cat["label"] === "string" ? cat["label"] : "Skills",
      items: strArray(cat["items"], 10),
    })),
    skillDemand: {
      high: strArray(skillDemand["high"], 8),
      common: strArray(skillDemand["common"], 8),
      roleSpecific: strArray(skillDemand["roleSpecific"], 8),
    },
    experienceExpectations: strArray(data["experienceExpectations"], 6),
    responsibilities: responsibilities.slice(0, 6).map((r) => ({
      label: typeof r["label"] === "string" ? r["label"].toUpperCase() : "",
      description: typeof r["description"] === "string" ? r["description"] : "",
    })),
    entryLevelReality: strArray(data["entryLevelReality"], 6),
    marketSignals: strArray(data["marketSignals"], 6),
    summary: {
      marketPriorities: strArray(summary["marketPriorities"], 5),
      commonTechnologies: strArray(summary["commonTechnologies"], 5),
      experienceSignals: strArray(summary["experienceSignals"], 4),
      keyResponsibilities: strArray(summary["keyResponsibilities"], 4),
    },
    /* ---- Pass through research evidence ---- */
    pakistanMarket: evidence.pakistanMarket,
    globalMarket: evidence.globalMarket,
    employerEvidence: evidence.employerEvidence,
    technologySignals: evidence.technologySignals,
    aiImpact: evidence.aiImpact,
    salaryInsights: evidence.salaryInsights,
    sources: evidence.sources,
    evidenceCollectedAt: evidence.collectedAt,
    evidenceProvider: evidence.provider,
    researchedOn: evidence.researchedOn,
  };
}
