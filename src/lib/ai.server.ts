/** Parses a JSON object out of a model response, tolerating stray prose/fences. */
export function parseJsonObject<T>(raw: string | null | undefined): T {
  const text = String(raw ?? "").trim();
  if (!text) {
    throw new AiError("The AI response was empty. Please try again.");
  }

  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/^\s*json\s*\n?/i, "")
    .replace(/\u2028/g, " ")
    .trim();

  const candidates: string[] = [];

  const pushCandidate = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) candidates.push(trimmed);
  };

  // The model commonly returns a JSON payload embedded in prose or markdown fences.
  for (const open of ["{", "["] as const) {
    const startIndex = cleaned.indexOf(open);
    if (startIndex >= 0) {
      const endIndex = findBalancedJsonEnd(cleaned, startIndex, open);
      if (endIndex > startIndex) {
        pushCandidate(cleaned.slice(startIndex, endIndex + 1));
      }
    }

    // Some model outputs contain more than one JSON payload. Keep all parseable matches.
    let searchIndex = cleaned.indexOf(open, startIndex + 1);
    while (searchIndex >= 0) {
      const endIndex = findBalancedJsonEnd(cleaned, searchIndex, open);
      if (endIndex > searchIndex) {
        pushCandidate(cleaned.slice(searchIndex, endIndex + 1));
      }
      searchIndex = cleaned.indexOf(open, searchIndex + 1);
    }
  }

  if (candidates.length === 0) {
    // Last resort: if the whole response is JSON-ish, try the whole body.
    pushCandidate(cleaned);
  }

  for (const candidate of candidates) {
    const normalized = candidate
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/\u0000/g, "");

    try {
      return JSON.parse(normalized) as T;
    } catch {
      // Try the next candidate; some models include commentary before or after valid JSON.
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
