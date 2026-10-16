/* Improved groqChat diagnostics and resilience.
 * - Add Accept header
 * - Catch invalid JSON bodies and log response.text()
 * - Log OK responses with empty content
 * - Slightly increase per-model and overall timeouts to reduce spurious truncation
 * - Surface more diagnostic info in thrown AiError (truncated, non-sensitive)
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
  // Slightly larger defaults to reduce spurious truncation on slow providers.
  const perModelTimeout = opts.timeoutMs ?? 50_000; // ms (was 45_000)
  const overallDeadline = Date.now() + (opts.totalTimeoutMs ?? 58_000); // ms (was 52_000)
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
            Accept: "application/json",
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
          // We must defensively handle non-JSON or unexpected bodies.
          try {
            const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
            const content = data.choices?.[0]?.message?.content?.trim();
            if (content) return content;

            // No usable content found — log full text for diagnostics.
            const text = await res.text().catch(() => "");
            console.warn(
              `[AI][${config.label}] Model ${model} returned OK but no content. Body (truncated): ${String(text).slice(0, 800)}`,
            );
            errors.push(`${config.label}(${model}): ok_empty_body`);
          } catch (jsonErr) {
            // res.json() failed — capture raw text for diagnostics.
            const text = await res.text().catch(() => "");
            console.warn(
              `[AI][${config.label}] Model ${model} returned invalid JSON (status ${res.status}). Body (truncated): ${String(text).slice(0, 800)}`,
              jsonErr,
            );
            errors.push(`${config.label}(${model}): invalid_json`);
          }
        } else {
          const errText = await res.text().catch(() => "");
          console.warn(
            `[AI][${config.label}] Model ${model} failed (${res.status}): ${String(errText).slice(0, 400)}`,
          );
          errors.push(`${config.label}(${model}): ${res.status}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Distinguish abort/timeout vs network errors.
        if (msg === "The operation was aborted." || (err as any)?.name === "AbortError") {
          console.warn(`[AI][${config.label}] Model ${model} timed out after ${modelTimeout}ms`);
          errors.push(`${config.label}(${model}): timeout`);
        } else {
          console.warn(`[AI][${config.label}] Model ${model} network error: ${msg}`);
          errors.push(`${config.label}(${model}): ${msg}`);
        }
      }
    }
  }

  // Provide a compact diagnostics string to help troubleshooting without leaking keys.
  const diag = errors.join("; ") || "No active API keys found";
  throw new AiError(
    `The AI service is currently unavailable. (${diag}${budgetExhausted ? " — timed out" : ""}). See server logs for truncated provider responses.`,
  );
}

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
  } catch (err) {
    // Attach a truncated snippet to the thrown error in logs for debugging.
    const snippet = String(candidate).slice(0, 1000);
    console.warn("[AI][parseJsonObject] Failed to parse model response. Snippet:", snippet, err);
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
