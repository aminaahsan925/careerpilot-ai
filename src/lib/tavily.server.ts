/**
 * Server-only Tavily web research client.
 * TAVILY_API_KEY is read inside each call, never at module scope,
 * and is never exposed to the browser.
 *
 * Uses api_key in the request body per the official Tavily API spec.
 */

export type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
};

export type TavilySearchResponse = {
  query: string;
  results: TavilyResult[];
};

const TAVILY_URL = "https://api.tavily.com/search";
const TAVILY_TIMEOUT_MS = 30_000; // 30s — Tavily basic searches usually respond in 5-15s

export class TavilyError extends Error {}

/* ------------------------------------------------------------------ */
/* IPv6 DNS fix                                                       */
/* ------------------------------------------------------------------ */

/**
 * Some networks can't reach IPv6 endpoints, causing fetch() to hang
 * until timeout.  We flip Node's DNS resolver to "ipv4first" once so
 * every subsequent fetch resolves hostnames to IPv4 addresses first.
 * No-op (and safe) in non-Node environments.
 */
let _dnsFixPromise: Promise<void> | null = null;
function ensureDnsFix(): Promise<void> {
  if (!_dnsFixPromise) {
    _dnsFixPromise = import("node:module")
      .then(({ createRequire }) => {
        const dns = createRequire(import.meta.url)("node:dns") as {
          setDefaultResultOrder: (order: "ipv4first" | "verbatim") => void;
        };
        dns.setDefaultResultOrder("ipv4first");
        console.info("[Tavily] DNS fix applied: ipv4first");
      })
      .catch(() => {
        // Not in Node.js (e.g. Cloudflare Workers) — skip.
      });
  }
  return _dnsFixPromise;
}

/**
 * Call the Tavily search API. Uses minimal credits by requesting
 * only the essential fields and limiting result count.
 *
 * Authentication: api_key in the request body (official method).
 */
export async function tavilySearch(
  query: string,
  opts: {
    maxResults?: number;
    searchDepth?: "basic" | "advanced";
    includeDomains?: string[];
    timeoutMs?: number;
  } = {},
): Promise<TavilySearchResponse> {
  await ensureDnsFix();

  const apiKey = process.env["TAVILY_API_KEY"];
  if (!apiKey) {
    throw new TavilyError(
      "The web research service isn't configured yet. Add a TAVILY_API_KEY in your .env file or project secrets.",
    );
  }

  const maxResults = opts.maxResults ?? 5;
  const searchDepth = opts.searchDepth ?? "basic";

  console.info("[Tavily] search", { query: query.slice(0, 80), maxResults, searchDepth });

  // Use AbortController for timeout since fetch doesn't have a native timeout option
  const controller = new AbortController();
  const timeoutMs = Math.min(Math.max(opts.timeoutMs ?? TAVILY_TIMEOUT_MS, 1_000), TAVILY_TIMEOUT_MS);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(TAVILY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: searchDepth,
        ...(opts.includeDomains?.length ? { include_domains: opts.includeDomains.slice(0, 10) } : {}),
        include_answer: false,
        include_raw_content: false,
        include_images: false,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    const isAbort = error instanceof DOMException && error.name === "AbortError";
    console.error("[Tavily] network error", {
      aborted: isAbort,
      message: error instanceof Error ? error.message : String(error),
    });
    if (isAbort) {
      throw new TavilyError(
        `Web research service timed out after ${Math.round(timeoutMs / 1000)}s. The service may be slow or unreachable.`,
      );
    }
    throw new TavilyError(
      `Couldn't reach the web research service: ${error instanceof Error ? error.message : "unknown error"}. Check your network connection and TAVILY_API_KEY.`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[Tavily] HTTP error", { status: res.status, body: body.slice(0, 500) });
    if (res.status === 401 || res.status === 403)
      throw new TavilyError(
        "Web research API key is invalid or expired. Check your TAVILY_API_KEY in project secrets.",
      );
    if (res.status === 429)
      throw new TavilyError(
        "Web research service is rate limited — you may have used all your credits for this billing period.",
      );
    throw new TavilyError(`Web research service returned HTTP ${res.status}.`);
  }

  const data = (await res.json()) as {
    query?: string;
    results?: {
      title?: string;
      url?: string;
      content?: string;
      score?: number;
      published_date?: string;
    }[];
  };

  const results = (data.results ?? [])
    .filter((r) => r.title && r.url && r.content)
    .map((r) => ({
      title: r.title!,
      url: r.url!,
      content: r.content!,
      score: r.score ?? 0,
      ...(r.published_date ? { publishedDate: r.published_date } : {}),
    }));

  console.info("[Tavily] success", {
    query: (data.query ?? query).slice(0, 60),
    resultCount: results.length,
  });

  return {
    query: data.query ?? query,
    results,
  };
}

/**
 * Research emerging technology trends across a given category.
 * Designed to use minimal Tavily credits — one targeted query per category.
 */
export async function researchTechTrends(category: string): Promise<TavilySearchResponse> {
  const queryMap: Record<string, string> = {
    AI: "emerging artificial intelligence technologies 2026 new frameworks tools",
    Software: "emerging software engineering technologies 2026 new languages frameworks",
    Cybersecurity: "emerging cybersecurity technologies 2026 new security tools approaches",
    Cloud: "emerging cloud computing technologies 2026 new services platforms",
    Data: "emerging data engineering technologies 2026 new databases analytics tools",
    Web: "emerging web development technologies 2026 new frameworks standards",
    Robotics: "emerging robotics technologies 2026 new automation systems",
    "Computer Vision": "emerging computer vision technologies 2026 new models applications",
    "AR/VR": "emerging augmented reality virtual reality technologies 2026",
    Blockchain: "emerging blockchain web3 technologies 2026 new protocols",
    Quantum: "emerging quantum computing technologies 2026 breakthroughs",
    "Developer Tools": "emerging developer tools 2026 new IDEs productivity tools",
    Other: "emerging computer science technologies 2026 breakthroughs innovations",
  };

  const query = queryMap[category] ?? `emerging ${category} technologies 2026 new innovations`;
  return tavilySearch(query, { maxResults: 6, searchDepth: "basic" });
}
