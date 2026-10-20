import {
  resolveRoleProfile,
  TOP_REJECTION_REASONS,
  type RoleTruthProfile,
} from "@/data/market-truth";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { indexRagEvidence, retrieveRagEvidence } from "./rag.server";

/** Shared behavior contract applied to every CareerPilot AI feature. */
export const BRUTAL_HONESTY_POLICY = `
CAREERPILOT INTELLIGENCE POLICY:
- Tell the student what the evidence supports, not what feels encouraging.
- Never invent skills, projects, scores, employers, sources, or outcomes.
- Separate demonstrated evidence, self-reported claims, and missing evidence.
- If evidence is missing, say "No evidence recorded" or "You have not proved this yet."
- Do not use soft language such as "consider", "you might want to", "could help", or "great job".
- Use direct language: "You are missing X", "This is unproven", and "Do X by DATE".
- Preserve the requested JSON schema exactly when the task asks for JSON.
- A recommendation is not a fact. Label predictions, assumptions, and uncertainty explicitly.
`;

export type EvidenceItem = {
  id: string;
  source: "role_truth" | "rejection_pattern" | "rag";
  statement: string;
  provenance: string;
  priority: number;
  sourceUrl?: string;
  similarity?: number;
  trustScore?: number;
};

type IntelligenceClient = SupabaseClient<Database>;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "for",
  "from",
  "has",
  "have",
  "how",
  "in",
  "is",
  "of",
  "on",
  "or",
  "the",
  "to",
  "what",
  "with",
  "you",
  "your",
]);

function terms(value: string): string[] {
  return [...new Set(value.toLowerCase().match(/[a-z0-9+#.]{3,}/g) ?? [])].filter(
    (term) => !STOP_WORDS.has(term),
  );
}

function addRoleEvidence(profile: RoleTruthProfile, items: EvidenceItem[]) {
  const add = (id: string, statement: string, provenance: string, priority: number) => {
    if (statement.trim()) items.push({ id, source: "role_truth", statement, provenance, priority });
  };

  profile.mustHaveSkills.forEach((item, index) =>
    add(
      `must-have-${index}`,
      `${item.skill}${item.note ? `: ${item.note}` : ""}`,
      `${profile.displayName} role truth — must-have skill`,
      5,
    ),
  );
  profile.differentiators.forEach((item, index) =>
    add(
      `differentiator-${index}`,
      `${item.skill}${item.note ? `: ${item.note}` : ""}`,
      `${profile.displayName} role truth — differentiator`,
      3,
    ),
  );
  profile.whatJuniorsLack.forEach((item, index) =>
    add(`junior-gap-${index}`, item.statement, `${profile.displayName} role truth — junior gap`, 5),
  );
  profile.evidenceEmployersTrust.forEach((item, index) =>
    add(
      `trusted-proof-${index}`,
      item.statement,
      `${profile.displayName} role truth — trusted evidence`,
      5,
    ),
  );
}

/** Retrieve the most relevant grounded facts for a user question. */
export function retrieveCareerEvidence(query: string, targetRole: string | null, limit = 8) {
  const profile = resolveRoleProfile(targetRole || "general technology role");
  const items: EvidenceItem[] = [];
  addRoleEvidence(profile, items);
  TOP_REJECTION_REASONS.forEach((item) =>
    items.push({
      id: `rejection-${item.rank}`,
      source: "rejection_pattern",
      statement: item.detail,
      provenance: `Market Truth — rejection pattern #${item.rank}: ${item.title}`,
      priority: Math.max(1, 6 - item.rank),
    }),
  );

  const queryTerms = terms(`${targetRole ?? ""} ${query}`);
  return items
    .map((item) => {
      const itemTerms = new Set(terms(item.statement));
      const overlap = queryTerms.reduce((score, term) => score + (itemTerms.has(term) ? 1 : 0), 0);
      return { item, score: overlap * 10 + item.priority };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}

export function formatEvidenceContext(items: EvidenceItem[]): string {
  if (!items.length) return "No grounded role evidence matched this question.";
  return items
    .map(
      (item, index) =>
        `[E${index + 1}] ${item.statement} (source: ${item.provenance}${item.sourceUrl ? `, url: ${item.sourceUrl}` : ""})`,
    )
    .join("\n");
}

/**
 * Hybrid retrieval entry point. The existing deterministic market corpus is
 * always queried first; persistent vector retrieval is additive and optional.
 */
export async function retrieveGroundedEvidence(
  client: IntelligenceClient,
  userId: string,
  query: string,
  targetRole: string | null,
  limit = 8,
): Promise<EvidenceItem[]> {
  const lexical = retrieveCareerEvidence(query, targetRole, limit);
  let rag = await retrieveRagEvidence(client, userId, `${targetRole ?? ""}\n${query}`, limit);
  if (!rag.length && process.env["RAG_AUTO_INDEX"] === "true" && lexical.length) {
    await indexRagEvidence(client, userId, lexical, targetRole || "CareerPilot market truth");
    rag = await retrieveRagEvidence(client, userId, `${targetRole ?? ""}\n${query}`, limit);
  }
  const seen = new Set<string>();
  return [...rag, ...lexical]
    .filter((item) => {
      const key = item.statement.toLowerCase().replace(/\s+/g, " ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, limit);
}
