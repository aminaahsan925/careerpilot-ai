/**
 * Adzuna API client — salary bands from live aggregated listings.
 *
 * API shape verified against the official Adzuna developer docs
 * (developer.adzuna.com, read 2026-11-20):
 *
 *   Root:    https://api.adzuna.com/v1/api
 *   Auth:    app_id + app_key query params on EVERY request (free tier:
 *            register at developer.adzuna.com — self-serve, key issued
 *            immediately, no payment details).
 *   Search:  GET /v1/api/jobs/{country}/search/{page}?app_id&app_key
 *            &what={keywords}&where={place} — results carry salary_min /
 *            salary_max per ad.
 *   Salary histogram (used here for bands):
 *            GET /v1/api/jobs/{country}/histogram?app_id&app_key
 *            &what={keywords}&location0={area}&content-type=application/json
 *            Response: { "__CLASS__": "Adzuna::API::Response::SalaryHistogram",
 *                        "histogram": { "10000": "31", "20000": "154", ... } }
 *            Each key is the LOWER bound of a salary bucket; each value is
 *            the vacancy count in that bucket. Key order is NOT guaranteed.
 *
 * Honesty contract:
 *   - No keys configured → `getSalaryBand` returns null. The caller keeps
 *     the labelled stale dataset; no salary figure is ever invented.
 *   - Zero vacancies in the histogram → band is null ("no salary data for
 *     this query"), never a made-up range.
 *   - Bands are computed from the bucket distribution (p25 / median /
 *     p75 by vacancy count) and always carry the source + retrieved date.
 *   - Amounts are in the local currency of the queried country.
 *
 * NOT wired into the market/job-mirror pages yet — this module is the
 * client; wiring is a follow-up once ADZUNA_APP_ID / ADZUNA_APP_KEY are
 * configured (see .env.example).
 */

export class AdzunaError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "AdzunaError";
    this.status = status;
  }
}

const ADZUNA_ROOT = "https://api.adzuna.com/v1/api";
const ADZUNA_TIMEOUT_MS = 12_000;

/** ISO currency for the countries Adzuna serves (local currency of the
 *  returned salary figures). Unknown country → null, never a guess. */
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  gb: "GBP",
  us: "USD",
  ca: "CAD",
  au: "AUD",
  nz: "NZD",
  za: "ZAR",
  in: "INR",
  de: "EUR",
  fr: "EUR",
  nl: "EUR",
  it: "EUR",
  es: "EUR",
  at: "EUR",
  be: "EUR",
  ie: "EUR",
  pl: "PLN",
  br: "BRL",
  mx: "MXN",
  sg: "SGD",
  ch: "CHF",
};

export function adzunaCurrencyForCountry(country: string): string | null {
  return CURRENCY_BY_COUNTRY[country.trim().toLowerCase()] ?? null;
}

export type AdzunaCredentials = {
  appId: string;
  appKey: string;
};

/** Read credentials from the environment. Null when not configured. */
export function adzunaCredentialsFromEnv(): AdzunaCredentials | null {
  const appId = process.env["ADZUNA_APP_ID"]?.trim();
  const appKey = process.env["ADZUNA_APP_KEY"]?.trim();
  if (!appId || !appKey) return null;
  return { appId, appKey };
}

/** Raw histogram: bucket lower bound → vacancy count. */
export type SalaryHistogram = Record<string, number>;

export type SalaryBand = {
  /** 25th percentile of the vacancy-weighted distribution. */
  p25: number;
  /** Median of the vacancy-weighted distribution. */
  median: number;
  /** 75th percentile of the vacancy-weighted distribution. */
  p75: number;
  /** Lowest bucket with vacancies. */
  minBucket: number;
  /** Highest bucket with vacancies. */
  maxBucket: number;
  /** Total vacancies across all buckets. */
  totalVacancies: number;
  currency: string | null;
  country: string;
  query: string;
};

export type SalaryBandResult = {
  band: SalaryBand | null;
  retrievedAt: string;
  source: string;
};

/* ------------------------------------------------------------------ */
/* Pure: histogram parsing + band math (unit-tested)                    */
/* ------------------------------------------------------------------ */

/**
 * Parse the Adzuna histogram response body. Returns null for an
 * unexpected shape instead of throwing — the caller treats that as
 * "no salary data", not a crash.
 */
export function parseSalaryHistogram(payload: unknown): SalaryHistogram | null {
  if (typeof payload !== "object" || payload === null) return null;
  const histogram = (payload as Record<string, unknown>)["histogram"];
  if (typeof histogram !== "object" || histogram === null) return null;
  const out: SalaryHistogram = {};
  for (const [key, value] of Object.entries(
    histogram as Record<string, unknown>,
  )) {
    const bucket = Number(key);
    const count = Number(value);
    if (!Number.isFinite(bucket) || !Number.isFinite(count)) continue;
    if (count < 0) continue;
    out[bucket] = (out[bucket] ?? 0) + count;
  }
  return out;
}

/**
 * Compute p25 / median / p75 from a vacancy-weighted histogram.
 * Percentile = the lowest bucket whose cumulative vacancies reach the
 * target share. Returns null when the histogram has zero vacancies —
 * no data means no band, never a fabricated range.
 */
export function salaryBandFromHistogram(
  histogram: SalaryHistogram,
  country: string,
  query: string,
): SalaryBand | null {
  const buckets = Object.entries(histogram)
    .map(([bound, count]) => ({ bound: Number(bound), count }))
    .filter((b) => Number.isFinite(b.bound) && b.count > 0)
    .sort((a, b) => a.bound - b.bound);
  const totalVacancies = buckets.reduce((sum, b) => sum + b.count, 0);
  if (buckets.length === 0 || totalVacancies === 0) return null;

  const percentile = (share: number): number => {
    const target = totalVacancies * share;
    let cumulative = 0;
    for (const bucket of buckets) {
      cumulative += bucket.count;
      if (cumulative >= target) return bucket.bound;
    }
    return buckets[buckets.length - 1]!.bound;
  };

  return {
    p25: percentile(0.25),
    median: percentile(0.5),
    p75: percentile(0.75),
    minBucket: buckets[0]!.bound,
    maxBucket: buckets[buckets.length - 1]!.bound,
    totalVacancies,
    currency: adzunaCurrencyForCountry(country),
    country: country.trim().toLowerCase(),
    query,
  };
}

/* ------------------------------------------------------------------ */
/* Live client                                                          */
/* ------------------------------------------------------------------ */

async function adzunaGet(
  path: string,
  params: Record<string, string>,
  credentials: AdzunaCredentials,
): Promise<unknown> {
  const url = new URL(`${ADZUNA_ROOT}${path}`);
  url.searchParams.set("app_id", credentials.appId);
  url.searchParams.set("app_key", credentials.appKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ADZUNA_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new AdzunaError(
        `Adzuna request failed (HTTP ${res.status}).`,
        res.status,
      );
    }
    return (await res.json()) as unknown;
  } catch (error) {
    if (error instanceof AdzunaError) throw error;
    throw new AdzunaError(
      error instanceof Error && error.name === "AbortError"
        ? "Adzuna request timed out."
        : "Adzuna could not be reached.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch the live salary histogram for a role query in a country.
 * Throws AdzunaError on failure. `location` is an Adzuna area name
 * (e.g. "London"); omit it for a country-wide distribution.
 */
export async function getSalaryHistogram(
  credentials: AdzunaCredentials,
  country: string,
  query: string,
  location?: string | null,
): Promise<{ histogram: SalaryHistogram; retrievedAt: string }> {
  const params: Record<string, string> = {
    what: query,
    "content-type": "application/json",
  };
  if (location?.trim()) params["location0"] = location.trim();
  const payload = await adzunaGet(
    `/jobs/${country.trim().toLowerCase()}/histogram`,
    params,
    credentials,
  );
  const histogram = parseSalaryHistogram(payload);
  if (!histogram) {
    throw new AdzunaError("Adzuna returned an unexpected response shape.");
  }
  return { histogram, retrievedAt: new Date().toISOString() };
}

/**
 * Salary band for a role query, or null when Adzuna is not configured
 * (no keys) — the caller keeps the labelled stale dataset in that case.
 * Throws AdzunaError only when configured but the request fails.
 */
export async function getSalaryBand(
  credentials: AdzunaCredentials | null,
  country: string,
  query: string,
  location?: string | null,
): Promise<SalaryBandResult | null> {
  if (!credentials) return null;
  const { histogram, retrievedAt } = await getSalaryHistogram(
    credentials,
    country,
    query,
    location,
  );
  return {
    band: salaryBandFromHistogram(histogram, country, query),
    retrievedAt,
    source: "Adzuna salary histogram (live)",
  };
}
