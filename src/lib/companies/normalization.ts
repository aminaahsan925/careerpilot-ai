/**
 * Company normalization — Phase 4 company intelligence.
 *
 * Canonicalizes company identities so the same employer is never stored
 * twice: the dedup key is (normalized_name, domain), matching the
 * `companies(normalized_name, domain)` unique constraint.
 *
 * Pure module: no server imports, no side effects, unit-tested.
 */

/** Dataset version for company research — bump when the snapshot format changes. */
export const COMPANY_DATASET_VERSION = "v1";

/** Legal-entity suffixes that should not distinguish two company records. */
const ENTITY_SUFFIXES =
  /\b(inc|incorporated|llc|ltd|limited|corp|corporation|co|company|pvt|private|gmbh|sarl|sas|plc|bv|pty|technologies|technology)\.?\b/gi;

/**
 * Normalize a company name for dedup: lowercase, strip legal-entity
 * suffixes, collapse punctuation/whitespace.
 *
 * "Systems Limited" and "systems limited." normalize identically.
 */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(ENTITY_SUFFIXES, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Normalize a domain for dedup: lowercase, strip protocol, www, path,
 * query, and trailing dot. Null/empty stays null (unknown domain).
 */
export function normalizeDomain(
  domain: string | null | undefined,
): string | null {
  if (!domain) return null;
  const trimmed = domain.trim().toLowerCase();
  if (!trimmed) return null;
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const host = withoutProtocol.split(/[/?#]/)[0] ?? "";
  const withoutWww = host.replace(/^www\./, "").replace(/\.$/, "");
  return withoutWww || null;
}

/**
 * Build the dedup identity for a company: the (normalized_name, domain)
 * pair that maps to the `companies` unique constraint.
 */
export function companyIdentity(
  name: string,
  domain?: string | null,
): {
  normalizedName: string;
  domain: string | null;
} {
  return {
    normalizedName: normalizeCompanyName(name),
    domain: normalizeDomain(domain ?? null),
  };
}

/**
 * Two company records are duplicates when both normalized name and
 * domain match (null domain matches null domain only when the names are
 * equal AND both lack domains — a name match alone is not enough to
 * merge, to avoid conflating e.g. "Systems Limited" (PK) with an
 * unrelated "Systems" elsewhere).
 */
export function isDuplicateCompany(
  a: { normalizedName: string; domain: string | null },
  b: { normalizedName: string; domain: string | null },
): boolean {
  if (a.normalizedName !== b.normalizedName) return false;
  if (a.domain && b.domain) return a.domain === b.domain;
  // One side has a domain and the other doesn't: treat as different
  // records rather than risking a wrong merge.
  return a.domain === b.domain;
}
