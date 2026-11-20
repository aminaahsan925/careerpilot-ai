import type { SupabaseClient } from "@supabase/supabase-js";

import { AiError, groqChat, parseJsonObject, type ChatMsg } from "./ai.server";
import { consumeAiCall } from "./billing.server";
import {
  researchTechTrends,
  tavilySearch,
  TavilyError,
  type TavilySearchResponse,
} from "./tavily.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database, Json } from "@/integrations/supabase/types";
import { TECH_TREND_CATEGORIES, type TechTrendCategory } from "@/data/tech-trends";

export { TECH_TREND_CATEGORIES, type TechTrendCategory };

type Client = SupabaseClient<Database>;

/* ------------------------------------------------------------------ *
 * Future Tech Trends — Intelligence Layer
 *
 * Researches emerging technologies via Tavily, synthesises them into
 * structured intelligence via Groq AI, and caches the results globally
 * (shared across all users) in the tech_trends_cache table.
 *
 * Cache is keyed by topic (e.g. "AI", "Software") with a 7-day TTL.
 * ------------------------------------------------------------------ */

export type TechTrendStatus = "emerging" | "rapid_growth" | "growing" | "watch" | "declining";

export type TechTrendConfidence = "high" | "medium" | "low";

export type TechTrendLearningVerdict =
  "learn_now" | "worth_exploring" | "watch_for_now" | "not_a_priority";

export type TechTrend = {
  name: string;
  category: string;
  status: TechTrendStatus;
  trendScore: number;
  confidence: TechTrendConfidence;
  whatItIs: string;
  whyItMatters: string;
  whyEmerging: string;
  useCases: string[];
  prerequisites: string[];
  learningPath: string[];
  firstProject: string;
  careerRelevance: string;
  sources: { title: string; url: string; date: string | null; summary: string }[];
  /** ISO date the trend was last researched, or null when it was never researched (sample data). */
  lastResearched: string | null;
};

export type TechTrendsReport = {
  featured: TechTrend;
  alsoWatching: TechTrend[];
  pulse: {
    gainingAttention: number;
    worthWatching: number;
    newDevelopments: number;
  };
  totalTechnologies: number;
  fromCache: boolean;
  /** "sample" when live research failed and the hardcoded sample list is shown instead. */
  source: "live" | "sample";
};

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const GLOBAL_TOPIC = "global_tech_trends";

/* ------------------------------------------------------------------ */

/**
 * Fetch (or generate) the global tech trends report.
 *
 * 1. Check the DB cache — if a non-expired report exists, return it.
 * 2. Otherwise, research via Tavily + synthesise via AI, then cache.
 *
 * Pass `forceRefresh: true` to bypass the cache.
 */
export async function getTechTrends(
  supabase: Client,
  userId: string,
  opts?: { forceRefresh?: boolean; category?: string },
): Promise<TechTrendsReport> {
  const category = opts?.category ?? "All";

  // 1. Check cache
  if (!opts?.forceRefresh) {
    const cached = await loadFromCache(supabase, GLOBAL_TOPIC);
    if (cached) {
      console.info("[TechTrends] served from cache", { category });
      return { ...cached, fromCache: true };
    }
  }

  // 2. Research via Tavily — catch TavilyErrors so we can give a clear message
  let tavilyResults: TavilySearchResponse[];
  try {
    tavilyResults = await collectTrendEvidence(category);
  } catch (error) {
    if (error instanceof TavilyError) {
      console.warn("[TechTrends] Tavily research failed, using static fallback:", error.message);
      // Sample data, visibly labelled: never cached as fresh, never stamped
      // with a research date it does not have.
      const fallback = buildStaticFallback(category);
      return { ...fallback, fromCache: false };
    }
    throw error;
  }

  // If ALL Tavily calls failed silently (Promise.allSettled filtered them out),
  // we have no evidence to work with — use static fallback.
  if (tavilyResults.length === 0 || tavilyResults.every((r) => r.results.length === 0)) {
    console.warn("[TechTrends] Tavily returned no results, using static fallback");
    const fallback = buildStaticFallback(category);
    return { ...fallback, fromCache: false };
  }

  // 3. Synthesise via AI
  // Quota is checked AFTER the cache check and the Tavily research, so a
  // cached report or a failed research run costs no AI call. One AI call
  // is consumed before the provider is called; throws QuotaError at the
  // limit, QuotaUnavailableError when the quota check itself fails.
  await consumeAiCall(supabase, userId, "tech-trends");
  let report: TechTrendsReport;
  try {
    report = await synthesiseTrends(tavilyResults, category);
  } catch (error) {
    if (error instanceof AiError) {
      console.warn("[TechTrends] AI synthesis failed, building fallback:", error.message);
      report = buildFallbackFromTavily(tavilyResults, category);
    } else {
      throw error;
    }
  }

  // 4. Persist to cache
  await saveToCache(supabase, GLOBAL_TOPIC, report);

  return { ...report, fromCache: false };
}

/**
 * Get detailed information about a specific technology.
 * Uses Tavily for fresh research + AI for structured analysis.
 */
export async function getTechTrendDetail(
  supabase: Client,
  userId: string,
  technologyName: string,
): Promise<TechTrend> {
  // Search for the specific technology
  const { tavilySearch } = await import("./tavily.server");
  const searchResult = await tavilySearch(
    `${technologyName} technology 2026 emerging trends use cases`,
    { maxResults: 5, searchDepth: "basic" },
  );

  // Quota first: one AI call is consumed before the provider is called.
  await consumeAiCall(supabase, userId, "tech-trend-detail");

  const messages: ChatMsg[] = [
    { role: "system", content: DETAIL_SYSTEM_PROMPT },
    {
      role: "user",
      content: buildDetailPrompt(technologyName, searchResult),
    },
  ];

  const raw = await groqChat(messages, { json: true, maxTokens: 2500, temperature: 0.4 });
  const data = parseJsonObject<Record<string, unknown>>(raw);
  return enrichTrendSources(shapeTechTrend(data, technologyName), searchResult);
}

/* ------------------------------------------------------------------ */
/* Evidence collection                                                 */
/* ------------------------------------------------------------------ */

async function collectTrendEvidence(category: string): Promise<TavilySearchResponse[]> {
  if (category === "All") {
    // Research broad categories plus company and horizon signals. The UI
    // should explain where the industry is heading, not only name tools.
    const categories = ["AI", "Software", "Cloud", "Cybersecurity"];
    const frontierQueries = [
      "latest global AI technology trends 2026 agentic AI models developer tools",
      "April 2026 agentic AI trends new models enterprise AI agents",
      "Google DeepMind Microsoft Amazon AI agents model strategy 2026",
      "China DeepSeek Qwen open reasoning models AI infrastructure 2026",
      "software engineering skills future of work 2030 AI agents MCP",
    ];
    const results = await Promise.allSettled([
      ...categories.map((cat) => researchTechTrends(cat)),
      ...frontierQueries.map((query) =>
        tavilySearch(query, { maxResults: 4, searchDepth: "basic" }),
      ),
    ]);

    // Log failures for debugging
    const labels = [...categories, ...frontierQueries];
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.warn(`[TechTrends] Tavily research for '${labels[i] ?? "unknown query"}' failed:`, {
          reason: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    });

    const fulfilled = results
      .filter((r): r is PromiseFulfilledResult<TavilySearchResponse> => r.status === "fulfilled")
      .map((r) => r.value);

    // If ALL categories failed, throw the first error so the user gets a clear message
    if (fulfilled.length === 0 && results.length > 0) {
      const firstReason = results[0]!.status === "rejected" ? results[0]!.reason : null;
      if (firstReason instanceof TavilyError) throw firstReason;
      throw new TavilyError("All web research requests failed. Please try again shortly.");
    }

    return fulfilled;
  }

  const result = await researchTechTrends(category);
  return [result];
}

/* ------------------------------------------------------------------ */
/* AI synthesis                                                        */
/* ------------------------------------------------------------------ */

const SYNTHESIS_PROMPT = `You are a technology intelligence analyst for CareerPilot, a career development platform for computer science students.

You receive raw web search results about emerging technologies and synthesise them into a structured intelligence report.

CRITICAL RULES:
- Use ONLY the provided search results. Do NOT invent technologies, statistics, or facts.
- Never fabricate sources, trends, or adoption claims.
- If evidence is weak for a technology, mark confidence as "low".
- Prioritise technologies with multiple independent evidence sources.
- Do NOT include technologies that are already mainstream (React, Python, AWS) unless they have genuinely new emerging aspects.
- Focus on what's NEW and EMERGING, not what's already established.
- Use beginner-friendly language suitable for CS students.

Return a JSON object with EXACTLY this structure:
{
  "featured": {
    "name": "Technology Name",
    "category": "AI|Software|Cybersecurity|Cloud|Data|Web|Robotics|Computer Vision|AR/VR|Blockchain|Quantum|Developer Tools|Other",
    "status": "emerging|rapid_growth|growing|watch|declining",
    "trendScore": 0-100,
    "confidence": "high|medium|low",
    "whatItIs": "2-3 sentence beginner-friendly explanation",
    "whyItMatters": "2-3 sentence explanation of significance",
    "whyEmerging": "Why this is gaining attention now",
    "useCases": ["use case 1", "use case 2", "use case 3"],
    "prerequisites": ["prerequisite 1", "prerequisite 2"],
    "learningPath": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
    "firstProject": "A concrete beginner project description",
    "careerRelevance": "How this relates to CS student careers",
    "sources": [{"title": "Source Title", "url": "https://..."}]
  },
  "alsoWatching": [
    // Same structure as featured, but 2-4 additional technologies
  ],
  "pulse": {
    "gainingAttention": number,
    "worthWatching": number,
    "newDevelopments": number
  }
}`;

const DETAIL_SYSTEM_PROMPT = `You are a technology intelligence analyst for CareerPilot. You receive web search results about a specific technology and produce a detailed, structured analysis for CS students.

CRITICAL RULES:
- Use ONLY the provided search results. Do NOT invent facts.
- Never fabricate sources or statistics.
- Use beginner-friendly language.
- Be honest about uncertainty — if evidence is limited, say so.

Return a JSON object:
{
  "name": "Technology Name",
  "category": "AI|Software|...",
  "status": "emerging|rapid_growth|growing|watch|declining",
  "trendScore": 0-100,
  "confidence": "high|medium|low",
  "whatItIs": "3-5 sentence beginner-friendly explanation",
  "whyItMatters": "Why this technology is significant",
  "whyEmerging": "Why this is gaining attention now",
  "useCases": ["use case 1", "use case 2", "use case 3"],
  "prerequisites": ["prerequisite 1", "prerequisite 2"],
  "learningPath": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
  "firstProject": "A concrete beginner project description",
  "careerRelevance": "How this relates to CS careers",
  "sources": [{"title": "Source Title", "url": "https://..."}]
}`;

async function synthesiseTrends(
  tavilyResults: TavilySearchResponse[],
  category: string,
): Promise<TechTrendsReport> {
  const allResults = tavilyResults.flatMap((r) => r.results);
  const compactResults = allResults.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content.slice(0, 400),
  }));

  const messages: ChatMsg[] = [
    { role: "system", content: SYNTHESIS_PROMPT },
    {
      role: "user",
      content: `Analyse these web research results about emerging ${category === "All" ? "computer science" : category} technologies.\n\nResults:\n${JSON.stringify(compactResults)}\n\nUse ONLY the evidence above. Return the JSON object as specified.`,
    },
  ];

  const raw = await groqChat(messages, { json: true, maxTokens: 3000, temperature: 0.4 });
  const data = parseJsonObject<Record<string, unknown>>(raw);

  const featured = shapeTechTrend((data["featured"] as Record<string, unknown>) ?? {}, "Unknown");

  const alsoWatchingRaw = (data["alsoWatching"] as Record<string, unknown>[]) ?? [];
  const alsoWatching = alsoWatchingRaw
    .slice(0, 4)
    .map((t) => shapeTechTrend(t, (t["name"] as string) ?? "Unknown"));

  const pulseRaw = (data["pulse"] as Record<string, unknown>) ?? {};
  const pulse = {
    gainingAttention:
      typeof pulseRaw["gainingAttention"] === "number" ? pulseRaw["gainingAttention"] : 0,
    worthWatching: typeof pulseRaw["worthWatching"] === "number" ? pulseRaw["worthWatching"] : 0,
    newDevelopments:
      typeof pulseRaw["newDevelopments"] === "number" ? pulseRaw["newDevelopments"] : 0,
  };

  return enrichTrendSources(
    {
      featured,
      alsoWatching,
      pulse,
      totalTechnologies: 1 + alsoWatching.length,
      fromCache: false,
      source: "live",
    },
    tavilyResults,
  );
}

function enrichTrendSources(
  value: TechTrend,
  tavilyResults: TavilySearchResponse | TavilySearchResponse[],
): TechTrend;
function enrichTrendSources(
  value: TechTrendsReport,
  tavilyResults: TavilySearchResponse | TavilySearchResponse[],
): TechTrendsReport;
function enrichTrendSources(
  value: TechTrendsReport | TechTrend,
  tavilyResults: TavilySearchResponse | TavilySearchResponse[],
): TechTrendsReport | TechTrend {
  const responses = Array.isArray(tavilyResults) ? tavilyResults : [tavilyResults];
  const sourceByUrl = new Map(
    responses.flatMap((response) =>
      response.results.map((result) => [result.url, result] as const),
    ),
  );
  const enrich = (trend: TechTrend): TechTrend => ({
    ...trend,
    sources: trend.sources.map((source) => {
      const liveSource = sourceByUrl.get(source.url);
      return {
        ...source,
        date: source.date ?? liveSource?.publishedDate ?? null,
        summary: source.summary || liveSource?.content.slice(0, 220) || "Live web research source.",
      };
    }),
  });

  if ("featured" in value) {
    return {
      ...value,
      featured: enrich(value.featured),
      alsoWatching: value.alsoWatching.map(enrich),
    };
  }
  return enrich(value);
}

/* ------------------------------------------------------------------ */
/* Fallback                                                            */
/* ------------------------------------------------------------------ */

function buildFallbackFromTavily(
  tavilyResults: TavilySearchResponse[],
  category: string,
): TechTrendsReport {
  const allResults = tavilyResults.flatMap((r) => r.results);

  // Pick the top result as the featured technology
  const topResult = allResults[0];
  const featured: TechTrend = {
    name: topResult?.title?.split(" - ")[0]?.split(" | ")[0]?.trim() ?? "Emerging Technology",
    category: category === "All" ? "Other" : category,
    status: "growing",
    trendScore: 50,
    confidence: "low",
    whatItIs: topResult?.content?.slice(0, 200) ?? "Web research results are being processed.",
    whyItMatters: "Evidence is limited — further research is needed.",
    whyEmerging: "Detected in recent web search results.",
    useCases: [],
    prerequisites: [],
    learningPath: ["Research the fundamentals", "Read the official documentation"],
    firstProject: "Build a small project using this technology",
    careerRelevance: "This technology may become relevant to your career.",
    sources: allResults.slice(0, 3).map((r) => ({
      title: r.title,
      url: r.url,
      date: r.publishedDate ?? null,
      summary: r.content.slice(0, 220),
    })),
    lastResearched: new Date().toISOString(),
  };

  const alsoWatching: TechTrend[] = allResults.slice(1, 4).map((r) => ({
    name: r.title.split(" - ")[0]?.split(" | ")[0]?.trim() ?? "Technology",
    category: category === "All" ? "Other" : category,
    status: "watch" as TechTrendStatus,
    trendScore: 30,
    confidence: "low" as TechTrendConfidence,
    whatItIs: r.content.slice(0, 150),
    whyItMatters: "",
    whyEmerging: "",
    useCases: [],
    prerequisites: [],
    learningPath: [],
    firstProject: "",
    careerRelevance: "",
    sources: [
      {
        title: r.title,
        url: r.url,
        date: r.publishedDate ?? null,
        summary: r.content.slice(0, 220),
      },
    ],
    lastResearched: new Date().toISOString(),
  }));

  return {
    featured,
    alsoWatching,
    pulse: { gainingAttention: 1, worthWatching: alsoWatching.length, newDevelopments: 0 },
    totalTechnologies: 1 + alsoWatching.length,
    fromCache: false,
    // Built from live Tavily evidence (unsynthesised because AI failed), so
    // this is live data with low confidence, not a sample.
    source: "live",
  };
}

/* ------------------------------------------------------------------ */
/* Cache helpers                                                       */
/* ------------------------------------------------------------------ */

async function loadFromCache(_supabase: Client, topic: string): Promise<TechTrendsReport | null> {
  const { data, error } = await supabaseAdmin
    .from("tech_trends_cache")
    .select("data")
    .eq("topic", topic)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  try {
    const report = data.data as unknown as Record<string, unknown>;
    return parseCachedReport(report);
  } catch {
    return null;
  }
}

async function saveToCache(
  _supabase: Client,
  topic: string,
  report: TechTrendsReport,
): Promise<void> {
  // Delete existing entries for this topic
  await supabaseAdmin.from("tech_trends_cache").delete().eq("topic", topic);

  const { error } = await supabaseAdmin.from("tech_trends_cache").insert({
    topic,
    data: report as unknown as Json,
    expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
  });

  if (error) {
    console.error("[TechTrends] cache insert failed:", error.message);
  }
}

function parseCachedReport(raw: Record<string, unknown>): TechTrendsReport {
  const featured = (raw["featured"] as Record<string, unknown>) ?? {};
  if (!featured["name"]) throw new Error("invalid cache");

  const alsoWatchingRaw = (raw["alsoWatching"] as Record<string, unknown>[]) ?? [];
  const pulseRaw = (raw["pulse"] as Record<string, unknown>) ?? {};

  // Reports cached before the honesty fix may be the old static fallback
  // stamped as fresh. Live reports always carry sources; the sample list
  // never does, so empty sources on every trend identifies a sample.
  const allTrends = [featured, ...alsoWatchingRaw];
  const hasAnySource = allTrends.some(
    (trend) => Array.isArray(trend["sources"]) && (trend["sources"] as unknown[]).length > 0,
  );
  const source: TechTrendsReport["source"] =
    raw["source"] === "sample" || !hasAnySource ? "sample" : "live";

  return {
    featured: shapeTechTrend(featured, (featured["name"] as string) ?? "Unknown"),
    alsoWatching: alsoWatchingRaw.map((t) => shapeTechTrend(t, (t["name"] as string) ?? "Unknown")),
    pulse: {
      gainingAttention:
        typeof pulseRaw["gainingAttention"] === "number" ? pulseRaw["gainingAttention"] : 0,
      worthWatching: typeof pulseRaw["worthWatching"] === "number" ? pulseRaw["worthWatching"] : 0,
      newDevelopments:
        typeof pulseRaw["newDevelopments"] === "number" ? pulseRaw["newDevelopments"] : 0,
    },
    totalTechnologies:
      typeof raw["totalTechnologies"] === "number" ? (raw["totalTechnologies"] as number) : 1,
    fromCache: true,
    source,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function strArray(v: unknown, max = 8): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, max);
}

function shapeTechTrend(raw: Record<string, unknown>, fallbackName: string): TechTrend {
  const sourcesRaw = (raw["sources"] as Record<string, unknown>[]) ?? [];
  return {
    name: typeof raw["name"] === "string" ? raw["name"] : fallbackName,
    category: typeof raw["category"] === "string" ? raw["category"] : "Other",
    status: (typeof raw["status"] === "string" ? raw["status"] : "growing") as TechTrendStatus,
    trendScore:
      typeof raw["trendScore"] === "number" ? Math.min(100, Math.max(0, raw["trendScore"])) : 50,
    confidence: (typeof raw["confidence"] === "string"
      ? raw["confidence"]
      : "medium") as TechTrendConfidence,
    whatItIs: typeof raw["whatItIs"] === "string" ? raw["whatItIs"] : "",
    whyItMatters: typeof raw["whyItMatters"] === "string" ? raw["whyItMatters"] : "",
    whyEmerging: typeof raw["whyEmerging"] === "string" ? raw["whyEmerging"] : "",
    useCases: strArray(raw["useCases"], 5),
    prerequisites: strArray(raw["prerequisites"], 5),
    learningPath: strArray(raw["learningPath"], 6),
    firstProject: typeof raw["firstProject"] === "string" ? raw["firstProject"] : "",
    careerRelevance: typeof raw["careerRelevance"] === "string" ? raw["careerRelevance"] : "",
    sources: sourcesRaw
      .filter((s) => s["title"] && s["url"])
      .map((s) => ({
        title: String(s["title"]),
        url: String(s["url"]),
        date: typeof s["date"] === "string" ? s["date"] : null,
        summary: typeof s["summary"] === "string" ? s["summary"] : "Live web research source.",
      }))
      .slice(0, 5),
    lastResearched:
      typeof raw["lastResearched"] === "string"
        ? raw["lastResearched"]
        : raw["lastResearched"] === null
          ? null
          : new Date().toISOString(),
  };
}

function buildDetailPrompt(technologyName: string, searchResult: TavilySearchResponse): string {
  const compactResults = searchResult.results.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content.slice(0, 400),
  }));

  return `Analyse these web research results about ${technologyName} and produce a detailed technology intelligence report.\n\nResults:\n${JSON.stringify(compactResults)}\n\nUse ONLY the evidence above. Return the JSON object as specified.`;
}

/* ------------------------------------------------------------------ */
/* Static fallback — used when Tavily API is unavailable               */
/* ------------------------------------------------------------------ */

function buildStaticFallback(category: string): TechTrendsReport {
  // Curated sample data used only when live research fails. These trends
  // were never researched, so lastResearched stays null and the report is
  // labelled "sample" — it must never be cached as fresh.
  const fallbackTrends: Record<string, TechTrend[]> = {
    AI: [
      {
        name: "AI Agents (Agentic AI)",
        category: "AI",
        status: "rapid_growth",
        trendScore: 92,
        confidence: "high",
        whatItIs:
          "Autonomous AI systems that can plan, reason, use tools, and complete multi-step tasks independently — going beyond simple chatbots to actually execute workflows.",
        whyItMatters:
          "AI agents represent the next frontier after LLMs. Companies are building agents that can write code, manage projects, conduct research, and handle customer operations autonomously.",
        whyEmerging:
          "LLMs are now capable enough to power reliable tool-use and planning. Frameworks like LangGraph, CrewAI, and AutoGen have matured significantly.",
        useCases: [
          "Autonomous code review & debugging",
          "Customer support automation",
          "Research & data analysis agents",
          "DevOps pipeline automation",
        ],
        prerequisites: [
          "Python or TypeScript",
          "LLM fundamentals (prompting, RAG)",
          "API integration basics",
        ],
        learningPath: [
          "Learn LLM APIs (OpenAI, Anthropic)",
          "Study prompt engineering & function calling",
          "Build a simple tool-using agent",
          "Learn multi-agent orchestration",
          "Build a production agent with memory & guardrails",
        ],
        firstProject:
          "Build a research agent that can search the web, summarize findings, and write a structured report.",
        careerRelevance:
          "Every major tech company is investing in agentic AI. Engineers who can build reliable agents will be in extremely high demand.",
        sources: [],
        lastResearched: null,
      },
      {
        name: "Small Language Models (SLMs)",
        category: "AI",
        status: "rapid_growth",
        trendScore: 85,
        confidence: "high",
        whatItIs:
          "Compact AI models (1-7B parameters) that run locally on devices — phones, laptops, edge hardware — without needing cloud GPUs.",
        whyItMatters:
          "SLMs bring AI capabilities to edge devices with privacy, low latency, and zero API costs. Microsoft Phi, Google Gemma, and Meta Llama are leading this trend.",
        whyEmerging:
          "Model compression techniques (quantization, distillation) have improved dramatically. SLMs now rival larger models on specific tasks.",
        useCases: [
          "On-device code assistance",
          "Offline document analysis",
          "Privacy-sensitive healthcare apps",
          "IoT and edge computing",
        ],
        prerequisites: ["Python", "Basic ML concepts", "Hugging Face ecosystem"],
        learningPath: [
          "Understand model architectures (transformers)",
          "Learn quantization & distillation",
          "Run SLMs locally with Ollama",
          "Fine-tune an SLM on custom data",
          "Deploy an on-device AI application",
        ],
        firstProject:
          "Build a local code assistant using Ollama + Phi that runs entirely on your laptop.",
        careerRelevance:
          "Edge AI is growing fast. Companies want engineers who can deploy AI without cloud dependency.",
        sources: [],
        lastResearched: null,
      },
    ],
    Software: [
      {
        name: "Rust for Web & Systems",
        category: "Software",
        status: "rapid_growth",
        trendScore: 82,
        confidence: "high",
        whatItIs:
          "Rust is expanding beyond systems programming into web backends (Axum, Actix), WebAssembly, and developer tools — offering memory safety without garbage collection.",
        whyItMatters:
          "Major projects (Linux kernel, Android, Windows, Cloudflare) now use Rust. It prevents entire categories of bugs at compile time while matching C/C++ performance.",
        whyEmerging:
          "The Rust ecosystem has matured significantly. More companies are adopting it for performance-critical services and web infrastructure.",
        useCases: [
          "High-performance web APIs",
          "CLI developer tools",
          "WebAssembly modules",
          "Embedded systems & IoT",
        ],
        prerequisites: [
          "Programming fundamentals",
          "Basic understanding of memory/pointers",
          "Command line comfort",
        ],
        learningPath: [
          "Complete the Rust Book",
          "Build a CLI tool",
          "Learn async Rust (tokio)",
          "Build a web API with Axum",
          "Explore WebAssembly with Rust",
        ],
        firstProject: "Build a blazing-fast URL shortener API with Axum and SQLite.",
        careerRelevance:
          "Rust developers command premium salaries. It's increasingly required for infrastructure and performance-critical roles.",
        sources: [],
        lastResearched: null,
      },
    ],
    Cloud: [
      {
        name: "Platform Engineering (Internal Developer Platforms)",
        category: "Cloud",
        status: "growing",
        trendScore: 75,
        confidence: "medium",
        whatItIs:
          "Building self-service internal platforms that abstract cloud complexity for developers — using tools like Backstage, Crossplane, and Pulumi.",
        whyItMatters:
          "Developer experience is a competitive advantage. Platform engineers reduce cognitive load and speed up delivery by providing golden paths.",
        whyEmerging:
          "DevOps has evolved — organizations now realize developers need curated self-service tools, not raw cloud access.",
        useCases: [
          "Self-service infrastructure provisioning",
          "Internal service catalogs",
          "Automated CI/CD pipelines",
          "Cost optimization dashboards",
        ],
        prerequisites: ["Linux & shell scripting", "Docker & Kubernetes basics", "CI/CD concepts"],
        learningPath: [
          "Learn Kubernetes fundamentals",
          "Study Backstage or Port",
          "Build a service template with Crossplane",
          "Create a self-service developer portal",
          "Implement platform guardrails & policies",
        ],
        firstProject:
          "Build a Backstage developer portal with a one-click service deployment template.",
        careerRelevance:
          "Platform Engineering is one of the fastest-growing roles. Companies are hiring aggressively for this.",
        sources: [],
        lastResearched: null,
      },
    ],
    Cybersecurity: [
      {
        name: "AI-Powered Security & Threat Detection",
        category: "Cybersecurity",
        status: "rapid_growth",
        trendScore: 80,
        confidence: "high",
        whatItIs:
          "Using machine learning and AI to detect threats, analyze vulnerabilities, and automate security responses in real-time.",
        whyItMatters:
          "Traditional signature-based security can't catch novel attacks. AI can analyze patterns across millions of events to identify zero-day threats.",
        whyEmerging:
          "The volume of security alerts has overwhelmed human analysts. AI automation is now essential for SOC teams.",
        useCases: [
          "Automated threat detection",
          "Vulnerability prioritization",
          "Phishing detection",
          "Security log analysis",
        ],
        prerequisites: ["Python", "Networking fundamentals", "Basic security concepts"],
        learningPath: [
          "Learn security fundamentals (CompTIA Security+)",
          "Study ML for anomaly detection",
          "Build a log analysis pipeline",
          "Implement an AI-based IDS",
          "Explore SOAR platforms",
        ],
        firstProject: "Build a network traffic analyzer that uses ML to flag suspicious patterns.",
        careerRelevance:
          "Cybersecurity + AI is a powerful combination. This skillset commands top salaries in security.",
        sources: [],
        lastResearched: null,
      },
    ],
  };

  // Select trends based on category
  let featured: TechTrend;
  let alsoWatching: TechTrend[];

  if (category !== "All" && fallbackTrends[category]) {
    const trends = fallbackTrends[category]!;
    featured = trends[0]!;
    alsoWatching = trends.slice(1);
  } else {
    // Use AI trends as the default featured
    featured = fallbackTrends["AI"]![0]!;
    alsoWatching = [
      fallbackTrends["AI"]![1]!,
      fallbackTrends["Software"]![0]!,
      fallbackTrends["Cloud"]![0]!,
      fallbackTrends["Cybersecurity"]![0]!,
    ];
  }

  return {
    featured,
    alsoWatching,
    pulse: {
      gainingAttention: alsoWatching.filter((t) => t.status === "rapid_growth").length + 1,
      worthWatching: alsoWatching.filter((t) => t.status === "growing").length,
      newDevelopments: alsoWatching.length + 1,
    },
    totalTechnologies: 1 + alsoWatching.length,
    fromCache: false,
    source: "sample",
  };
}
