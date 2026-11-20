/**
 * Job providers — Phase 3 market intelligence.
 *
 * A JobProvider turns a target role (+ optional location filter) into
 * normalized job postings. The Tavily-backed provider performs
 * search → normalize over live web results; the dataset-backed
 * `MarketTruthProvider` (market-research.server.ts) remains the fallback
 * in the research layer when no live provider is configured or when the
 * live call fails.
 *
 * Pure module except for the Tavily call itself: normalization, query
 * building, and dedup hashing are deterministic and unit-tested.
 */
import { tavilySearch, TavilyError } from "../tavily.server";

export type RemoteType = "remote" | "hybrid" | "onsite" | "unknown";

/** Geographic / work-mode scope for a job search. All fields optional. */
export type JobLocationFilter = {
  country: string | null;
  city: string | null;
  /** Null = no work-mode preference. */
  workMode: "remote" | "hybrid" | "onsite" | null;
};

export interface JobSearchQuery {
  targetRole: string;
  location: JobLocationFilter;
  /** Max postings to return (default 10). */
  limit?: number;
}

/** A job posting normalized from a provider's raw payload. */
export interface NormalizedJobPosting {
  externalId: string | null;
  title: string;
  company: string | null;
  country: string | null;
  city: string | null;
  remoteType: RemoteType;
  url: string | null;
  description: string | null;
  /** ISO timestamp or null when the provider gives none. */
  publishedAt: string | null;
}

export interface JobProvider {
  readonly name: string;
  searchJobs(query: JobSearchQuery): Promise<NormalizedJobPosting[]>;
}

/* ------------------------------------------------------------------ */
/* Location helpers                                                    */
/* ------------------------------------------------------------------ */

/** Human-readable location scope, e.g. "Lahore, Pakistan" / "Remote" / null. */
export function formatLocationFilter(
  location: JobLocationFilter,
): string | null {
  const parts = [location.city, location.country].filter(
    (part): part is string => !!part && part.trim().length > 0,
  );
  if (parts.length > 0) return parts.join(", ");
  if (location.workMode === "remote") return "Remote";
  return null;
}

/**
 * Normalized cache-key fragment for a location filter.
 * Distinct filters MUST produce distinct keys; "no filter" is "global".
 */
export function locationCacheKey(location: JobLocationFilter): string {
  const city = (location.city ?? "").trim().toLowerCase();
  const country = (location.country ?? "").trim().toLowerCase();
  const workMode = location.workMode ?? "any";
  if (!city && !country && location.workMode === null) return "global";
  return `${city}|${country}|${workMode}`;
}

/* ------------------------------------------------------------------ */
/* Dedup hash                                                          */
/* ------------------------------------------------------------------ */

/**
 * Deterministic 64-bit hash (cyrb53) over normalized
 * (title, company, location, description head).
 *
 * The same posting re-fetched must hash identically so re-ingestion is an
 * update, not a duplicate. Pure sync implementation so it runs anywhere
 * (no node:crypto dependency in this shared module).
 */
export function dedupHashJob(posting: {
  title: string;
  company: string | null;
  country: string | null;
  city: string | null;
  url: string | null;
  description: string | null;
}): string {
  const norm = (value: string | null) =>
    (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const canonical = [
    norm(posting.title),
    norm(posting.company),
    norm(posting.country),
    norm(posting.city),
    norm(posting.url),
    norm(posting.description).slice(0, 500),
  ].join("\u0000");

  // cyrb53 — deterministic 53-bit hash, hex encoded.
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < canonical.length; i++) {
    const ch = canonical.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h2 >>> 0).toString(16).padStart(8, "0") +
    (h1 >>> 0).toString(16).padStart(8, "0")
  );
}

/* ------------------------------------------------------------------ */
/* Tavily-backed provider                                              */
/* ------------------------------------------------------------------ */

/** Build the 2–3 search queries for a role (+ location) job hunt. */
export function buildJobSearchQueries(query: JobSearchQuery): string[] {
  const locationStr = formatLocationFilter(query.location);
  const scope = locationStr ? ` in ${locationStr}` : "";
  const remoteHint = query.location.workMode === "remote" ? " remote" : "";
  return [
    `${query.targetRole}${remoteHint} jobs${scope} hiring 2026`,
    `${query.targetRole} job openings${scope} apply`,
  ];
}

/**
 * Best-effort company-name extraction from a search result title.
 * Returns null rather than guessing — an unknown company stays unknown.
 */
export function extractCompany(title: string, url: string): string | null {
  const patterns = [/\s+at\s+([^|-–—]+?)\s*$/i, /\s+[-|–—]\s*([^|-–—]+?)\s*$/i];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    const candidate = match?.[1]?.trim();
    if (candidate && candidate.length > 1 && candidate.length < 80)
      return candidate;
  }
  // Fall back to the registrable domain of the posting URL.
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    if (parts.length >= 2) {
      const name = parts[parts.length - 2];
      if (name && name !== "com" && name.length > 1) return name;
    }
  } catch {
    // Invalid URL — no company guess.
  }
  return null;
}

function inferRemoteType(
  title: string,
  description: string,
  filter: JobLocationFilter,
): RemoteType {
  if (filter.workMode) return filter.workMode;
  const text = `${title} ${description}`.toLowerCase();
  if (/\bremote\b/.test(text) && !/\bremote-friendly\b/.test(text))
    return "remote";
  if (/\bhybrid\b/.test(text)) return "hybrid";
  if (/\bon-?site\b/.test(text)) return "onsite";
  return "unknown";
}

/**
 * Live job search via Tavily. Throws TavilyError when the service is not
 * configured or unreachable — the caller (research layer) treats that as
 * "fall back to the dataset provider", never as invented data.
 */
export class TavilyJobProvider implements JobProvider {
  readonly name = "tavily";

  async searchJobs(query: JobSearchQuery): Promise<NormalizedJobPosting[]> {
    const limit = query.limit ?? 10;
    const queries = buildJobSearchQueries(query);

    const settled = await Promise.allSettled(
      queries.map((q) =>
        tavilySearch(q, { maxResults: 5, searchDepth: "basic" }),
      ),
    );

    const failures: string[] = [];
    const postings: NormalizedJobPosting[] = [];
    const seenUrls = new Set<string>();

    for (const result of settled) {
      if (result.status === "rejected") {
        failures.push(
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
        );
        continue;
      }
      for (const item of result.value.results) {
        if (seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);
        postings.push({
          externalId: null,
          title:
            item.title.split(" - ")[0]?.split(" | ")[0]?.trim() || item.title,
          company: extractCompany(item.title, item.url),
          country: query.location.country,
          city: query.location.city,
          remoteType: inferRemoteType(item.title, item.content, query.location),
          url: item.url,
          description: item.content,
          publishedAt: item.publishedDate ?? null,
        });
        if (postings.length >= limit) break;
      }
      if (postings.length >= limit) break;
    }

    if (postings.length === 0) {
      // No evidence at all — fail loudly so the caller falls back to the
      // dataset instead of presenting an empty market as researched fact.
      const reason = failures.length > 0 ? `: ${failures[0]}` : "";
      throw new TavilyError(`Job search returned no postings${reason}`);
    }
    return postings;
  }
}
