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

  // Common case: the model returns a plain JSON object/array with no prose.
  if (/^[\[{]/.test(cleaned)) {
    pushCandidate(cleaned);
  }

  // Extract the first parseable object/array from mixed model output.
  for (const token of ["{", "["]) {
    let index = cleaned.indexOf(token);
    while (index >= 0) {
      const end = findMatchingJsonEnd(cleaned, index, token);
      if (end > index) {
        pushCandidate(cleaned.slice(index, end + 1));
      }
      index = cleaned.indexOf(token, index + 1);
    }
  }

  for (const candidate of candidates) {
    const normalized = candidate.replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(normalized) as T;
    } catch {
      // Try the next candidate. The model often wraps JSON with commentary.
    }
  }

  throw new AiError("The AI response couldn't be read. Please try again.");
}

function findMatchingJsonEnd(text: string, startIndex: number, opener: "{" | "[") {
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === opener) depth += 1;
    else if (char === closer) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}
