/**
 * Shared coercion helpers for AI/JSON boundary values.
 *
 * Every server module used to define its own local copy of these (~9 copies
 * with subtly different caps). They are behaviorally identical except for
 * default caps, so they live here now. All call sites pass explicit caps;
 * no bare single-arg calls existed, so consolidation changes nothing.
 */

/** Trim + cap a value, coercing non-strings via String(). */
export const str = (v: unknown, max = 300): string =>
  String(v ?? "")
    .trim()
    .slice(0, max);

/**
 * Trim a value only if it is already a string, else "".
 * Used where the old market-research code deliberately did NOT coerce
 * numbers/objects to strings.
 */
export const strStrict = (v: unknown): string =>
  typeof v === "string" ? v.trim() : "";

/** Coerce an unknown value to a trimmed string array, capped. */
export const strArray = (v: unknown, max = 10): string[] => {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, max);
};

/** Coerce an unknown value to a plain object, else {}. */
export const obj = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
