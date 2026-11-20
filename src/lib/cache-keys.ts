/**
 * Deterministic cache-key builders — pure module.
 *
 * No server imports, no client imports, no side effects: the composition
 * rules for cache keys are unit-testable here, and the server modules
 * import these builders instead of hand-rolling keys.
 */

/**
 * Tech-trends cache topic.
 *
 * The category is part of the key: a report researched for "AI" must
 * never be served for "Cloud" (the old single global key did exactly
 * that). The `v1` segment lets a future format change invalidate old
 * entries without a migration.
 */
export function techTrendsTopic(category: string): string {
  const normalized = (category || "All").trim() || "All";
  return `tech_trends:v1:${normalized}`;
}
