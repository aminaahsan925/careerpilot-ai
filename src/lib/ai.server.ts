/** Server-only AI chat client with multi-provider failover. */

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };
export type AiProvider = "openrouter" | "groq" | "gemini";

type ProviderConfig = {
  url: string;
  models: string[];
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
    ],
    envKeys: ["GROQ_API_KEY"],
    extraHeaders: {},
    label: "Groq",
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    models: [
      process.env["GEMINI_MODEL"] || "gemini-3-flash-preview",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
    ],
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
    ],
    envKeys: ["OPENROUTER_API_KEY"],
    extraHeaders: { "HTTP-Referer": "https://careerpilot.dev", "X-Title": "CareerPilot AI" },
    label: "OpenRouter",
  },
};

function resolveApiKey(config: ProviderConfig): string | undefined {
  return config.envKeys.map((name) => process.env[name]?.trim()).find(Boolean);
}

export class AiError extends Error {}

export async function groqChat(
  messages: ChatMsg[],
  opts: {
    json?: boolean;
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
    totalTimeoutMs?: number;
  } = {},
): Promise<string> {
  const requested = (process.env["AI_PROVIDER"] ?? "groq").toLowerCase() as AiProvider;
  const allProviders: AiProvider[] = ["groq", "gemini", "openrouter"];
  const providerOrder = allProviders.includes(requested)
    ? [requested, ...allProviders.filter((provider) => provider !== requested)]
    : allProviders;
  const errors: string[] = [];
  const overallDeadline = Date.now() + (opts.totalTimeoutMs ?? 52_000);

  for (const providerName of providerOrder) {
    const config = PROVIDERS[providerName];
    const apiKey = resolveApiKey(config);
    if (!apiKey) continue;
    for (const model of config.models) {
      const remaining = overallDeadline - Date.now();
      if (remaining <= 2_000) break;
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        Math.min(opts.timeoutMs ?? 45_000, remaining),
      );
      try {
        const response = await fetch(config.url, {
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
          }),
          signal: controller.signal,
        });
        if (response.ok) {
          const data = (await response.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) return content;
          errors.push(`${config.label}(${model}): empty response`);
        } else {
          const body = await response.text().catch(() => "");
          errors.push(`${config.label}(${model}): ${response.status}`);
          console.warn(
            `[AI][${config.label}] ${model} failed (${response.status}): ${body.slice(0, 180)}`,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${config.label}(${model}): ${message}`);
        console.warn(`[AI][${config.label}] ${model} network error: ${message}`);
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }
  throw new AiError(
    `The AI service is currently unavailable. (${errors.join("; ") || "No active API keys found"})`,
  );
}

/** Parses JSON from model output, including nested arrays, fences, and prose. */
export function parseJsonObject<T>(raw: string | null | undefined): T {
  const text = String(raw ?? "").trim();
  if (!text) throw new AiError("The AI response was empty. Please try again.");
  const cleaned = text
    .replace(/^\uFEFF/, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^\s*json\s*\n?/i, "")
    .replace(/\u2028/g, " ")
    .trim();
  const candidates: string[] = [];
  const push = (value: string) => {
    if (value.trim()) candidates.push(value.trim());
  };
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // The provider may surround the JSON with a short explanation.
  }
  for (const opener of ["{", "["] as const) {
    const start = cleaned.indexOf(opener);
    if (start < 0) continue;
    const end = findBalancedJsonEnd(cleaned, start, opener);
    if (end > start) push(cleaned.slice(start, end + 1));
  }
  if (!candidates.length) push(cleaned);
  for (const candidate of candidates) {
    try {
      return JSON.parse(
        candidate.replace(/,\s*([}\]])/g, "$1").replaceAll(String.fromCharCode(0), ""),
      ) as T;
    } catch {
      // Try the next extracted payload.
    }
  }
  throw new AiError("The AI response couldn't be read. Please try again.");
}

function findBalancedJsonEnd(text: string, startIndex: number, opener: "{" | "[") {
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = startIndex; index < text.length; index += 1) {
    const current = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (current === "\\") {
      escaped = true;
      continue;
    }
    if (current === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (current === opener) depth += 1;
    else if (current === closer) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

export function clampScore(value: unknown, fallback = 0): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : fallback;
}

export function stringList(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, max);
}
