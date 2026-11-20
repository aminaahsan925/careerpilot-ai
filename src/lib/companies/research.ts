/**
 * Company research flow — Phase 4 company intelligence.
 *
 * careers-page fetch → role extraction → requirement frequency analysis.
 *
 * Reuses the Phase 3 Tavily patterns (tavily.server.ts): live web search
 * over a company's careers pages and job postings, then DETERMINISTIC
 * parsing — role titles from result titles, skill frequencies by counting
 * mentions of taxonomy-known skills (skill-aliases), never by asking an
 * LLM to invent requirements.
 *
 * Best-effort by contract: research failure must never break existing
 * flows. `researchCompany` throws `CompanyResearchError`; callers catch
 * it, log, and fall back to the seeded dataset. Nothing here invents
 * data — zero results is a failure, not an invitation to guess.
 */

import { normalizeSkill, knownSkills } from "../evidence/skill-aliases";
import { tavilySearch, TavilyError } from "../tavily.server";

export class CompanyResearchError extends Error {
  constructor(message: string, opts?: { cause?: unknown }) {
    super(message);
    this.name = "CompanyResearchError";
    if (opts?.cause !== undefined)
      (this as { cause?: unknown }).cause = opts.cause;
  }
}

/** One role observed on the company's careers surface. */
export type ResearchedRole = {
  title: string;
  url: string | null;
  location: string | null;
};

/** One skill with its observed mention frequency across researched postings. */
export type ResearchedRequirement = {
  skillName: string;
  category: string | null;
  frequencyCount: number;
  /** Share of researched postings mentioning the skill (0–1). Real ratio, not a stat. */
  shareOfPostings: number;
};

/** The research result: roles + requirement frequencies + provenance. */
export type CompanyResearch = {
  companyName: string;
  domain: string | null;
  careersUrl: string | null;
  roles: ResearchedRole[];
  requirements: ResearchedRequirement[];
  postingsAnalyzed: number;
  retrievedAt: string;
  sources: { url: string; label: string }[];
};

/* ------------------------------------------------------------------ */
/* Deterministic parsing                                               */
/* ------------------------------------------------------------------ */

const ROLE_TITLE_HINTS =
  /\b(engineer|developer|designer|manager|analyst|scientist|architect|qa|sqa|devops|data|product|intern|associate|lead|senior|junior)\b/i;

/**
 * Keep only results that look like job roles (title carries a role hint),
 * deduped by URL. Deterministic; no guessing.
 */
export function extractRoles(
  results: { title: string; url: string }[],
  limit = 25,
): ResearchedRole[] {
  const seen = new Set<string>();
  const roles: ResearchedRole[] = [];
  for (const r of results) {
    if (roles.length >= limit) break;
    if (!r.url || seen.has(r.url)) continue;
    if (!ROLE_TITLE_HINTS.test(r.title)) continue;
    seen.add(r.url);
    roles.push({ title: r.title.trim(), url: r.url, location: null });
  }
  return roles;
}

/**
 * Alias-aware frequency aggregation: counts a skill when the posting
 * mentions its canonical name (e.g. "postgres" normalizes to
 * "PostgreSQL"). Counts once per posting.
 */
export function aggregateRequirementFrequency(
  postingTexts: string[],
): ResearchedRequirement[] {
  const known = knownSkills();
  const counts = new Map<string, { category: string | null; count: number }>();

  for (const text of postingTexts) {
    const lowered = text.toLowerCase();
    const seenInPosting = new Set<string>();
    for (const skill of known) {
      const normalized = normalizeSkill(skill.canonical);
      const canonical = normalized.canonical;
      if (seenInPosting.has(canonical)) continue;
      if (canonical.length > 2 && lowered.includes(canonical.toLowerCase())) {
        seenInPosting.add(canonical);
        const entry = counts.get(canonical) ?? {
          category: normalized.category,
          count: 0,
        };
        entry.count += 1;
        counts.set(canonical, entry);
      }
    }
  }

  const total = Math.max(postingTexts.length, 1);
  return [...counts.entries()]
    .map(([skillName, { category, count }]) => ({
      skillName,
      category,
      frequencyCount: count,
      shareOfPostings: count / total,
    }))
    .sort((a, b) => b.frequencyCount - a.frequencyCount);
}

/* ------------------------------------------------------------------ */
/* Live research (Tavily-backed, best-effort)                          */
/* ------------------------------------------------------------------ */

/**
 * Research a company: find its careers surface, extract open roles, and
 * compute requirement frequencies from posting content.
 *
 * Throws CompanyResearchError on any failure (no API key, zero results,
 * network error) — the caller logs and falls back to seed data.
 */
export async function researchCompany(
  companyName: string,
  domain?: string | null,
): Promise<CompanyResearch> {
  const retrievedAt = new Date().toISOString();
  const domainHint = domain ? ` site:${domain}` : "";

  let searchResponse;
  try {
    searchResponse = await tavilySearch(
      `${companyName} careers open roles software engineer${domainHint}`,
      { maxResults: 10, searchDepth: "basic" },
    );
  } catch (error) {
    throw new CompanyResearchError(
      `Company research unavailable for "${companyName}": ${
        error instanceof TavilyError ? error.message : "web research failed"
      }.`,
      { cause: error },
    );
  }

  const results = searchResponse.results ?? [];
  if (results.length === 0) {
    throw new CompanyResearchError(
      `Company research found no careers results for "${companyName}" — falling back to the static dataset.`,
    );
  }

  const roles = extractRoles(results);
  const postingTexts = results
    .map((r) => r.content)
    .filter((c): c is string => typeof c === "string" && c.trim().length > 0);
  const requirements = aggregateRequirementFrequency(postingTexts);

  const careersUrl = results[0]?.url ?? null;
  return {
    companyName,
    domain: domain ?? null,
    careersUrl,
    roles,
    requirements,
    postingsAnalyzed: postingTexts.length,
    retrievedAt,
    sources: results.slice(0, 5).map((r) => ({ url: r.url, label: r.title })),
  };
}
