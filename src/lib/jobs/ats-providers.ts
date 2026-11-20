/**
 * ATS public job-board clients — real companies data (Wave 2).
 *
 * Greenhouse, Lever, and Ashby all publish official, keyless, public
 * job-board APIs. These clients fetch a company's LIVE postings from its
 * own board — no scraping, no key, no invented data.
 *
 *   - Greenhouse: boards-api.greenhouse.io/v1/boards/{token}/jobs
 *   - Lever:      api.lever.co/v0/postings/{site}
 *   - Ashby:      api.ashbyhq.com/posting-api/job-board/{board}
 *
 * Honesty contract (same as the rest of the intelligence layer):
 *   - A board that answers with zero jobs is a real fact (no open roles),
 *     not an error — it returns an empty list.
 *   - A board that cannot be reached, or answers in an unexpected shape,
 *     throws AtsProviderError. Callers show "live postings unavailable",
 *     never fake postings.
 *   - Board tokens are NEVER guessed. A company gets an `atsBoard` only
 *     when its public careers page links the board or the API endpoint
 *     itself answers for that token (see KNOWN_ATS_BOARDS, verified live
 *     2026-11-20). Everything else uses Tavily careers-page research.
 *
 * Each provider implements the `JobProvider` interface (role-filtered
 * search over the board) and exposes `fetchBoardPostings()` for the
 * company dashboard, which shows every live posting, unfiltered.
 */
import { normalizeCompanyName } from "../companies/normalization";
import type {
  JobProvider,
  JobSearchQuery,
  NormalizedJobPosting,
  RemoteType,
} from "./providers";

/* ------------------------------------------------------------------ */
/* Board identity                                                      */
/* ------------------------------------------------------------------ */

export type AtsProviderName = "greenhouse" | "lever" | "ashby";

/** A company's public ATS job board. Null = no verifiable board. */
export type AtsBoard = {
  provider: AtsProviderName;
  /** Board token / site slug, exactly as the ATS API expects it. */
  token: string;
};

/**
 * Boards verified LIVE by fetching the API endpoint itself on
 * 2026-11-20. `postingsSeen` is the count observed on that date — a
 * verification note, not live data (live counts come from the fetch).
 *
 * Add a board here ONLY after verifying it the same way. Never guess a
 * token: several plausible-looking tokens (e.g. Lever "netflix",
 * Greenhouse "10pearls") return 404.
 */
export type VerifiedAtsBoard = AtsBoard & {
  companyName: string;
  verifiedOn: string;
  postingsSeen: number;
};

export const KNOWN_ATS_BOARDS: VerifiedAtsBoard[] = [
  {
    companyName: "Motive",
    provider: "greenhouse",
    token: "gomotive",
    verifiedOn: "2026-11-20",
    postingsSeen: 186,
  },
  {
    companyName: "GitLab",
    provider: "greenhouse",
    token: "gitlab",
    verifiedOn: "2026-11-20",
    postingsSeen: 246,
  },
  {
    companyName: "Airbnb",
    provider: "greenhouse",
    token: "airbnb",
    verifiedOn: "2026-11-20",
    postingsSeen: 203,
  },
  {
    companyName: "Spotify",
    provider: "lever",
    token: "spotify",
    verifiedOn: "2026-11-20",
    postingsSeen: 94,
  },
  {
    companyName: "Linear",
    provider: "ashby",
    token: "linear",
    verifiedOn: "2026-11-20",
    postingsSeen: 32,
  },
  {
    companyName: "Ashby",
    provider: "ashby",
    token: "ashby",
    verifiedOn: "2026-11-20",
    postingsSeen: 79,
  },
];

/**
 * Resolve a typed company name to a verified ATS board, or null when
 * the company has no verified board. Name matching uses the same
 * normalization as the company dedup key.
 */
export function resolveAtsBoard(companyName: string): AtsBoard | null {
  const normalized = normalizeCompanyName(companyName);
  if (!normalized) return null;
  const found = KNOWN_ATS_BOARDS.find(
    (b) => normalizeCompanyName(b.companyName) === normalized,
  );
  return found ? { provider: found.provider, token: found.token } : null;
}

/** Public API endpoint for a board (the fetch target). */
export function atsBoardApiUrl(board: AtsBoard): string {
  switch (board.provider) {
    case "greenhouse":
      return `https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs`;
    case "lever":
      return `https://api.lever.co/v0/postings/${board.token}`;
    case "ashby":
      return `https://api.ashbyhq.com/posting-api/job-board/${board.token}`;
  }
}

/** Human-facing board page (the "view all jobs" link shown in the UI). */
export function atsBoardPageUrl(board: AtsBoard): string {
  switch (board.provider) {
    case "greenhouse":
      return `https://job-boards.greenhouse.io/${board.token}`;
    case "lever":
      return `https://jobs.lever.co/${board.token}`;
    case "ashby":
      return `https://jobs.ashbyhq.com/${board.token}`;
  }
}

/* ------------------------------------------------------------------ */
/* Errors + fetch                                                      */
/* ------------------------------------------------------------------ */

export class AtsProviderError extends Error {
  readonly provider: AtsProviderName;
  /** HTTP status when the failure was an HTTP response, else null. */
  readonly status: number | null;
  constructor(
    provider: AtsProviderName,
    message: string,
    status: number | null = null,
  ) {
    super(message);
    this.name = "AtsProviderError";
    this.provider = provider;
    this.status = status;
  }
}

const ATS_FETCH_TIMEOUT_MS = 12_000;

async function fetchBoardJson(
  board: AtsBoard,
): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ATS_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(atsBoardApiUrl(board), {
      headers: {
        Accept: "application/json",
        "User-Agent": "CareerPilotAI/1.0 (job-board research)",
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new AtsProviderError(
        board.provider,
        `Live postings unavailable for this board (HTTP ${res.status}).`,
        res.status,
      );
    }
    return (await res.json()) as unknown;
  } catch (error) {
    if (error instanceof AtsProviderError) throw error;
    throw new AtsProviderError(
      board.provider,
      error instanceof Error && error.name === "AbortError"
        ? "Live postings request timed out."
        : "Live postings unavailable — the job board could not be reached.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ------------------------------------------------------------------ */
/* Shared parsing helpers (pure)                                       */
/* ------------------------------------------------------------------ */

/** Strip HTML tags + common entities to plain text, whitespace-collapsed. */
export function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : null;
}

function inferRemoteTypeFromText(text: string): RemoteType {
  const lowered = text.toLowerCase();
  if (/\bremote\b/.test(lowered)) return "remote";
  if (/\bhybrid\b/.test(lowered)) return "hybrid";
  if (/\bon-?site\b/.test(lowered)) return "onsite";
  return "unknown";
}

function remoteTypeFromWorkplaceType(
  value: string | null | undefined,
  fallbackText = "",
): RemoteType {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "remote") return "remote";
  if (normalized === "hybrid") return "hybrid";
  if (normalized === "onsite" || normalized === "on-site") return "onsite";
  return inferRemoteTypeFromText(fallbackText);
}

/**
 * Split a free-form location like "Remote, United States" or
 * "Bangalore, India" into { city, country }. The first segment is the
 * city unless it is a work-mode word; the last segment is the country.
 * Multi-location strings ("Remote, Canada; Remote, United States") keep
 * only the first location — the posting URL carries the full detail.
 */
export function splitLocationName(
  name: string | null | undefined,
): { city: string | null; country: string | null } {
  if (!name) return { city: null, country: null };
  const first = name.split(";")[0]?.trim() ?? "";
  const parts = first
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { city: null, country: null };
  if (parts.length === 1) {
    const only = parts[0]!;
    return /^(remote|hybrid|onsite|on-site)$/i.test(only)
      ? { city: null, country: null }
      : { city: null, country: only };
  }
  const head = parts[0]!;
  const city = /^(remote|hybrid|onsite|on-site)$/i.test(head) ? null : head;
  return { city, country: parts[parts.length - 1] ?? null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

/* ------------------------------------------------------------------ */
/* Greenhouse — boards-api.greenhouse.io/v1/boards/{token}/jobs        */
/* Response: { jobs: [{ id, title, absolute_url, location: { name },   */
/*   first_published, updated_at, ... }] } (list endpoint carries no   */
/*   description content). Verified live 2026-11-20 (GitLab, Airbnb).  */
/* ------------------------------------------------------------------ */

export function parseGreenhouseJobs(
  payload: unknown,
  companyName: string | null,
): NormalizedJobPosting[] {
  if (!isRecord(payload) || !Array.isArray(payload["jobs"])) {
    throw new AtsProviderError(
      "greenhouse",
      "Greenhouse returned an unexpected response shape.",
    );
  }
  const postings: NormalizedJobPosting[] = [];
  for (const raw of payload["jobs"]) {
    if (!isRecord(raw)) continue;
    const title = asString(raw["title"]);
    if (!title) continue;
    const locationName = isRecord(raw["location"])
      ? asString(raw["location"]["name"])
      : null;
    const { city, country } = splitLocationName(locationName);
    postings.push({
      externalId: asString(raw["id"]),
      title,
      company: companyName,
      country,
      city,
      remoteType: inferRemoteTypeFromText(locationName ?? ""),
      url: asString(raw["absolute_url"]),
      // The Greenhouse list endpoint carries no description; the
      // posting URL is the source of truth. Never invent one.
      description: null,
      publishedAt:
        asString(raw["first_published"]) ?? asString(raw["updated_at"]),
    });
  }
  return postings;
}

/* ------------------------------------------------------------------ */
/* Lever — api.lever.co/v0/postings/{site}                             */
/* Response: [{ id, text, hostedUrl, descriptionPlain, createdAt (ms),  */
/*   country (ISO code), categories: { location }, workplaceType }]    */
/* Verified live 2026-11-20 (Spotify, 94 postings).                    */
/* ------------------------------------------------------------------ */

export function parseLeverPostings(
  payload: unknown,
  companyName: string | null,
): NormalizedJobPosting[] {
  if (!Array.isArray(payload)) {
    throw new AtsProviderError(
      "lever",
      "Lever returned an unexpected response shape.",
    );
  }
  const postings: NormalizedJobPosting[] = [];
  for (const raw of payload) {
    if (!isRecord(raw)) continue;
    const title = asString(raw["text"]);
    if (!title) continue;
    const categories = isRecord(raw["categories"]) ? raw["categories"] : null;
    const locationName = categories ? asString(categories["location"]) : null;
    const { city } = splitLocationName(locationName);
    const createdAt = raw["createdAt"];
    postings.push({
      externalId: asString(raw["id"]),
      title,
      company: companyName,
      // Lever returns an ISO country code ("US", "GB") — kept as-is
      // rather than mapped to a name we did not verify.
      country: asString(raw["country"]),
      city,
      remoteType: remoteTypeFromWorkplaceType(
        asString(raw["workplaceType"]),
        locationName ?? "",
      ),
      url: asString(raw["hostedUrl"]),
      description:
        stripHtml(asString(raw["descriptionPlain"]))?.slice(0, 4000) ?? null,
      publishedAt:
        typeof createdAt === "number" && Number.isFinite(createdAt)
          ? new Date(createdAt).toISOString()
          : null,
    });
  }
  return postings;
}

/* ------------------------------------------------------------------ */
/* Ashby — api.ashbyhq.com/posting-api/job-board/{board}               */
/* Response: { jobs: [{ id, title, location, isRemote, workplaceType,  */
/*   publishedAt, jobUrl, descriptionHtml, address: { postalAddress:   */
/*   { addressLocality, addressRegion, addressCountry } } }] }          */
/* Verified live 2026-11-20 (Linear, Ashby).                           */
/* ------------------------------------------------------------------ */

export function parseAshbyJobs(
  payload: unknown,
  companyName: string | null,
): NormalizedJobPosting[] {
  if (!isRecord(payload) || !Array.isArray(payload["jobs"])) {
    throw new AtsProviderError(
      "ashby",
      "Ashby returned an unexpected response shape.",
    );
  }
  const postings: NormalizedJobPosting[] = [];
  for (const raw of payload["jobs"]) {
    if (!isRecord(raw)) continue;
    // Unlisted jobs are not public postings; skip them.
    if (raw["isListed"] === false) continue;
    const title = asString(raw["title"]);
    if (!title) continue;
    const postal = isRecord(raw["address"])
      ? isRecord(raw["address"]["postalAddress"])
        ? raw["address"]["postalAddress"]
        : null
      : null;
    const locationName = asString(raw["location"]);
    const split = splitLocationName(locationName);
    postings.push({
      externalId: asString(raw["id"]),
      title,
      company: companyName,
      country:
        (postal ? asString(postal["addressCountry"]) : null) ?? split.country,
      city: (postal ? asString(postal["addressLocality"]) : null) ?? split.city,
      remoteType:
        raw["isRemote"] === true
          ? "remote"
          : remoteTypeFromWorkplaceType(
              asString(raw["workplaceType"]),
              locationName ?? "",
            ),
      url: asString(raw["jobUrl"]) ?? asString(raw["applyUrl"]),
      description:
        stripHtml(asString(raw["descriptionHtml"]))?.slice(0, 4000) ?? null,
      publishedAt: asString(raw["publishedAt"]),
    });
  }
  return postings;
}

/* ------------------------------------------------------------------ */
/* Providers                                                           */
/* ------------------------------------------------------------------ */

export interface AtsJobProvider extends JobProvider {
  readonly board: AtsBoard;
  /** Every live posting on the board, unfiltered. */
  fetchBoardPostings(limit?: number): Promise<NormalizedJobPosting[]>;
}

abstract class BaseAtsProvider implements AtsJobProvider {
  abstract readonly name: string;
  abstract readonly board: AtsBoard;
  protected abstract parse(
    payload: unknown,
    companyName: string | null,
  ): NormalizedJobPosting[];

  constructor(protected readonly companyName: string | null) {}

  async fetchBoardPostings(limit?: number): Promise<NormalizedJobPosting[]> {
    const payload = await fetchBoardJson(this.board);
    const postings = this.parse(payload, this.companyName);
    return limit ? postings.slice(0, limit) : postings;
  }

  /**
   * JobProvider search over one board: fetch the live board, then keep
   * postings whose title contains the target role (case-insensitive
   * substring). A board with no matching role returns [] — an honest
   * empty result, not a failure.
   */
  async searchJobs(query: JobSearchQuery): Promise<NormalizedJobPosting[]> {
    const postings = await this.fetchBoardPostings();
    const needle = query.targetRole.trim().toLowerCase();
    const limit = query.limit ?? 10;
    if (!needle) return postings.slice(0, limit);
    return postings
      .filter((p) => p.title.toLowerCase().includes(needle))
      .slice(0, limit);
  }
}

export class GreenhouseProvider extends BaseAtsProvider {
  readonly name = "greenhouse";
  readonly board: AtsBoard;
  constructor(board: AtsBoard, companyName: string | null) {
    super(companyName);
    this.board = board;
  }
  protected parse(payload: unknown, companyName: string | null) {
    return parseGreenhouseJobs(payload, companyName);
  }
}

export class LeverProvider extends BaseAtsProvider {
  readonly name = "lever";
  readonly board: AtsBoard;
  constructor(board: AtsBoard, companyName: string | null) {
    super(companyName);
    this.board = board;
  }
  protected parse(payload: unknown, companyName: string | null) {
    return parseLeverPostings(payload, companyName);
  }
}

export class AshbyProvider extends BaseAtsProvider {
  readonly name = "ashby";
  readonly board: AtsBoard;
  constructor(board: AtsBoard, companyName: string | null) {
    super(companyName);
    this.board = board;
  }
  protected parse(payload: unknown, companyName: string | null) {
    return parseAshbyJobs(payload, companyName);
  }
}

/** Build the right client for a board. */
export function createAtsProvider(
  board: AtsBoard,
  companyName: string | null,
): AtsJobProvider {
  switch (board.provider) {
    case "greenhouse":
      return new GreenhouseProvider(board, companyName);
    case "lever":
      return new LeverProvider(board, companyName);
    case "ashby":
      return new AshbyProvider(board, companyName);
  }
}

/**
 * Fetch a company's live postings when it has a verified board, else
 * null (the caller then uses Tavily careers-page research). Throws
 * AtsProviderError when the board exists but cannot be read.
 */
export async function fetchLivePostingsForCompany(
  companyName: string,
  board: AtsBoard | null,
  limit?: number,
): Promise<NormalizedJobPosting[] | null> {
  if (!board) return null;
  const provider = createAtsProvider(board, companyName);
  return provider.fetchBoardPostings(limit);
}
