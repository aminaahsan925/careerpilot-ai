/**
 * Company research cache keys — Phase 4 company intelligence.
 *
 * Two caches exist and MUST never mix:
 *
 *   - SHARED company evidence cache (`company_research_cache` table):
 *     keyed by (company identity + dataset version), readable by every
 *     authenticated user, longer TTL (30 days). Company data is the same
 *     for everyone — there is no reason to re-research it per user.
 *
 *   - PRIVATE candidate analysis caches (e.g. `market_reality_cache`,
 *     keyed by user_id): never read or write the company cache, and the
 *     company research layer never touches user-scoped tables.
 *
 * Pure module: key composition only, unit-tested.
 */
import { COMPANY_DATASET_VERSION, companyIdentity } from "./normalization";

/** Prefix that makes company cache keys unmistakable in logs and the DB. */
export const COMPANY_CACHE_KEY_PREFIX = "company_research";

/**
 * Build the shared cache key for a company's research snapshot.
 *
 * Format: `company_research:v1:<normalized_name>:<domain|null>:<datasetVersion>`
 *
 * The company identity (not the raw display name) is part of the key so
 * "Systems Limited" and "systems limited." hit the same cache entry, and
 * two different companies that normalize identically but have different
 * domains stay separate.
 */
export function companyResearchCacheKey(
  companyName: string,
  domain?: string | null,
  datasetVersion: string = COMPANY_DATASET_VERSION,
): string {
  const { normalizedName, domain: normalizedDomain } = companyIdentity(
    companyName,
    domain,
  );
  const domainPart = normalizedDomain ?? "no-domain";
  return `${COMPANY_CACHE_KEY_PREFIX}:${datasetVersion}:${normalizedName}:${domainPart}`;
}

/**
 * Guard: a candidate-analysis cache key must never be routed to the
 * company cache. Candidate keys are user-scoped (`user_id` is always
 * part of their identity); company keys never contain a user id.
 * Returns true only for keys this module produced.
 */
export function isCompanyResearchCacheKey(key: string): boolean {
  return key.startsWith(`${COMPANY_CACHE_KEY_PREFIX}:`);
}

/**
 * The inverse guard for callers that handle both cache families:
 * company cache keys must never be written to a user-scoped table.
 */
export function assertNotCompanyKeyForUserCache(key: string): void {
  if (isCompanyResearchCacheKey(key)) {
    throw new Error(
      "Company research cache keys must not be used with per-user candidate caches.",
    );
  }
}
