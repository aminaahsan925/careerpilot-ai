/**
 * Server-only AI chat client with multi-provider support.
 *
 * Supports three backends, all speaking the OpenAI chat-completions dialect:
 *  - **Groq** (default) — fastest inference, generous free tier.
 *    Key: `GROQ_API_KEY` (get one at https://console.groq.com/keys)
 *  - **Gemini** — Google AI Studio, permanently free tier (~1M tokens/day),
 *    best long-context headroom for whole resumes and job descriptions.
 *    Key: `GEMINI_API_KEY` or `GOOGLE_API_KEY`
 *    (get one at https://aistudio.google.com/apikey)
 *  - **OpenRouter** — widest model selection, free-tier models available.
 *    Key: `OPENROUTER_API_KEY` (get one at https://openrouter.ai/keys)
 *
 * Set `AI_PROVIDER=groq | gemini | openrouter` in .env / secrets to choose the
 * first provider tried.  If it has no key configured — or every one of its
 * models fails — the client automatically walks the remaining providers that
 * *do* have a key, so a single exhausted free tier never takes the app down.
 *
 * Keys are read inside the call, never at module scope, and are never
 * exposed to the browser.
 */

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export type AiProvider = "openrouter" | "groq" | "gemini";

type ProviderConfig = {
  url: string;
  models: string[];
  /** Accepted env var names, tried in order — first non-empty one wins. */
  envKeys: string[];
  extraHeaders: Record<string, string>;
  label: string;
};

const PROVIDERS: Record<AiProvider, ProviderConfig> = {
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    models: [
      process.env["GROQ_MODEL"] || "qwen/qwen3.8-27b",
      "qwen/qwen3.6-27b",
      "openai/gpt-oss-20b",
    ].filter(Boolean),
    envKeys: ["GROQ_API_KEY"],
    extraHeaders: {},
    label: "Groq",
  },
  gemini: {
    // Google's OpenAI-compatible endpoint, so the same fetch body works.
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    models: [
      process.env["GEMINI_MODEL"] || "gemini-3-flash-preview",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
    ].filter(Boolean),
    envKeys: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    extraHeaders: {},
    label: "Gemini",
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    models: [
      process.env["OPENROUTER_MODEL"] || "openai/gpt-oss-20b",
      "meta-llama/llama-3.3-70b-instruct",
      "mistralai/mistral-7b-instruct:free",
      "deepseek/deepseek-chat",
    ].filter(Boolean),
    envKeys: ["OPENROUTER_API_KEY"],
    extraHeaders: {
      "HTTP-Referer": "https://careerpilot.dev",
      "X-Title": "CareerPilot AI",
    },
    label: "OpenRouter",
  },
};

function resolveApiKey(config: ProviderConfig): string | undefined {
  for (const name of config.envKeys) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export class AiError extends Error {}

/**
 * Execute AI chat with multi-provider and multi-model failover.
 *
 * An overall time budget (default 52 s) keeps the whole failover chain
 * inside the serverless function limit (60 s on Vercel Hobby) so callers
 * get a clean AiError instead of the platform killing the request mid-flight.
 */
export async function groqChat(
  messages: ChatMsg[],
  opts: {
    json?: boolean;
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
    /** Total budget for the entire provider/model chain, in ms. */
    totalTimeoutMs?: number;
  } = {},
): Promise<string> {
  const requested = (process.env["AI_PROVIDER"] ?? "groq").toLowerCase() as AiProvider;
  const allProviders: AiProvider[] = ["groq", "gemini", "openrouter"];
  const providerOrder = allProviders.includes(requested)
    ? [requested, ...allProviders.filter((p) => p !== requested)]
    : allProviders;

  const errors: string[] = [];
  // Allow callers to override the per-model timeout (default 45 s).
  const perModelTimeout = opts.timeoutMs ?? 45_000;
  const overallDeadline = Date.now() + (opts.totalTimeoutMs ?? 52_000);
  let budgetExhausted = false;

  for (const providerName of providerOrder) {
    if (budgetExhausted) break;
    const config = PROVIDERS[providerName];
    const apiKey = resolveApiKey(config);
    if (!apiKey) continue;

    for (const model of config.models) {
      const remaining = overallDeadline - Date.now();
      if (remaining <= 2_000) {
        budgetExhausted = true;
        errors.push("overall time budget exhausted before more retries");
        break;
      }
      const modelTimeout = Math.min(perModelTimeout, remaining);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), modelTimeout);

        const res = await fetch(config.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            ...config.extraHeaders,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: opts.temperature ?? 0.4,
            max_tokens: opts.maxTokens ?? 2400,
            // NOTE: response_format is intentionally omitted — not all models
            // support json_object mode and it causes unnecessary failures.
            // parseJsonObject() handles JSON extraction from mixed content.
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) {
            return content;
          }
        } else {
          const errText = await res.text().catch(() => "");
          console.warn(
            `[AI][${config.label}] Model ${model} failed (${res.status}): ${errText.slice(0, 180)}`,
          );
          errors.push(`${config.label}(${model}): ${res.status}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[AI][${config.label}] Model ${model} network error: ${msg}`);
        errors.push(`${config.label}(${model}): ${msg}`);
      }
    }
  }

  throw new AiError(
    `The AI service is currently unavailable. (${errors.join("; ") || "No active API keys found"}${budgetExhausted ? " — timed out" : ""})`,
  );
}

/** Parses a JSON object out of a model response, tolerating stray prose/fences. */
export function parseJsonObject<T>(raw: string): T {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    throw new AiError("The AI response couldn't be read. Please try again.");
  }
}

export function clampScore(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function stringList(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .slice(0, max);
}
