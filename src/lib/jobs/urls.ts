/**
 * Application URL validation — Phase 5 job intelligence.
 *
 * Pure helpers (normalization, official-domain preference, aggregator
 * classification) plus one best-effort network check. The check never
 * throws: an unreachable host, a timeout, or a network error all become
 * an "unreachable" verdict with a short TTL so transient outages
 * self-heal instead of permanently marking a link dead.
 *
 * No invented data: when a URL cannot be classified it is "unknown",
 * never guessed.
 */

/** Hosts that aggregate other employers' postings. Heuristic list —
 *  used only to *prefer* official domains, never to block a link. */
const KNOWN_AGGREGATOR_HOSTS = new Set([
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "simplyhired.com",
  "monster.com",
  "naukri.com",
  "rozee.pk",
  "bayt.com",
  "gulftalent.com",
  "foundit.in",
  "cutshort.io",
]);

/** Query params that identify the click, not the posting — stripped. */
const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_|igshid$|vero_)/i;

export type LinkKind = "official" | "aggregator" | "unknown";

export type ClassifiedLink = {
  kind: LinkKind;
  /** Lowercased registrable host, or null when the URL is unparseable. */
  host: string | null;
};

/**
 * Normalize a URL for identity: lowercase host, strip default ports,
 * tracking params, hash fragments, and trailing slashes. Returns null
 * for unparseable input.
 */
export function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (!host) return null;

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  }
  url.hash = "";
  // Drop default ports so http://x:80 and http://x compare equal.
  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }
  let normalized = `${url.protocol}//${host}${url.port ? `:${url.port}` : ""}${url.pathname}${url.search}`;
  // Collapse a trailing slash unless the path is only "/".
  if (
    normalized.endsWith("/") &&
    !normalized.endsWith("://") &&
    url.pathname !== "/"
  ) {
    normalized = normalized.slice(0, -1);
  }
  return normalized.replace(/\/$/, "").replace(/^(https?:\/\/[^/]+)\/$/, "$1");
}

/**
 * Deterministic 64-bit hash (cyrb53, same construction as
 * dedupHashJob) over the normalized URL. Pure and sync so the module
 * stays dependency-free; used as the `job_link_checks` primary key.
 */
export function urlHash(raw: string | null | undefined): string | null {
  const normalized = normalizeUrl(raw);
  if (!normalized) return null;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
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

/** True when `host` is the domain itself or a subdomain of it. */
function hostMatchesDomain(host: string, domain: string): boolean {
  const d = domain.toLowerCase().replace(/^www\./, "");
  return host === d || host.endsWith(`.${d}`);
}

/**
 * Classify a posting URL against the employer's official domain.
 *  - "official"   — the link lives on the company's own domain
 *  - "aggregator" — the link lives on a known job aggregator
 *  - "unknown"    — anything else, or unparseable (never guessed)
 */
export function classifyLink(
  raw: string | null | undefined,
  companyDomain: string | null | undefined,
): ClassifiedLink {
  const normalized = normalizeUrl(raw);
  if (!normalized) return { kind: "unknown", host: null };
  let host: string;
  try {
    host = new URL(normalized).hostname.toLowerCase();
  } catch {
    return { kind: "unknown", host: null };
  }
  const bare = host.replace(/^www\./, "");
  if (companyDomain && hostMatchesDomain(bare, companyDomain)) {
    return { kind: "official", host: bare };
  }
  if (KNOWN_AGGREGATOR_HOSTS.has(bare)) {
    return { kind: "aggregator", host: bare };
  }
  return { kind: "unknown", host: bare };
}

/**
 * Order posting URLs by trust: official domains first, then unknown,
 * aggregators last. Stable — ties keep their input order.
 */
export function preferOfficialUrls(
  urls: (string | null | undefined)[],
  companyDomain: string | null | undefined,
): string[] {
  const rank: Record<LinkKind, number> = {
    official: 0,
    unknown: 1,
    aggregator: 2,
  };
  return urls
    .map((url, index) => ({ url, index }))
    .filter(
      (entry): entry is { url: string; index: number } =>
        typeof entry.url === "string" && entry.url.trim().length > 0,
    )
    .sort((a, b) => {
      const ra = rank[classifyLink(a.url, companyDomain).kind];
      const rb = rank[classifyLink(b.url, companyDomain).kind];
      return ra - rb || a.index - b.index;
    })
    .map((entry) => entry.url);
}

/* ------------------------------------------------------------------ */
/* Broken-link detection (best-effort, never throws)                   */
/* ------------------------------------------------------------------ */

export type LinkCheckResult = {
  /** True = the link responded; false = it did not; null was never used —
   *  uncertainty is expressed via `checkedAt` age instead. */
  reachable: boolean;
  /** Last observed HTTP status, null when no response was received. */
  httpStatus: number | null;
  /** URL after following redirects, null when none observed. */
  finalUrl: string | null;
  checkedAt: string;
};

/** How long a verdict is trusted: reachable links 7 days, failures 24h. */
export const LINK_CHECK_TTL_MS = {
  reachable: 7 * 86400_000,
  unreachable: 86400_000,
} as const;

/**
 * Best-effort liveness check: HEAD first, then GET on failure.
 * Follows redirects (fetch default). Any error — DNS, timeout, refused
 * connection — becomes an "unreachable" verdict, never an exception.
 */
export async function checkLink(
  raw: string | null | undefined,
  timeoutMs = 8000,
): Promise<LinkCheckResult | null> {
  const normalized = normalizeUrl(raw);
  if (!normalized) return null;
  const checkedAt = new Date().toISOString();

  const attempt = async (method: "HEAD" | "GET"): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(normalized, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "CareerPilot-LinkCheck/1.0" },
      });
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let response = await attempt("HEAD");
    // Some servers reject HEAD — retry with GET before giving up.
    if (response.status === 405 || response.status === 501) {
      response = await attempt("GET");
    }
    const finalUrl =
      response.url && response.url !== normalized ? response.url : null;
    return {
      reachable: response.status < 400,
      httpStatus: response.status,
      finalUrl,
      checkedAt,
    };
  } catch {
    return { reachable: false, httpStatus: null, finalUrl: null, checkedAt };
  }
}
