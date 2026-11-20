/**
 * Phase 1 cost control: per-user daily AI call quotas.
 *
 * Every AI call in the app flows through `groqChat()` in ./ai.server.ts.
 * `guardedChat()` is a drop-in replacement that consumes one unit of the
 * caller's daily quota (via the `consume_ai_quota` Postgres RPC, which is
 * atomic so concurrent requests can't race past the limit) before spending
 * the call. Over-quota users get a clear QuotaExceededError instead of a
 * silent burn of your API budget.
 *
 * The free-tier budget defaults to 25 AI calls/user/day and can be raised
 * with the AI_DAILY_CALL_LIMIT env var. Paid tiers (Phase 4) will pass a
 * per-plan limit here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { groqChat, type ChatMsg } from "./ai.server";

export const AI_DAILY_CALL_LIMIT = Math.max(
  1,
  Number(process.env["AI_DAILY_CALL_LIMIT"] ?? 25) || 25,
);

export class QuotaExceededError extends Error {
  readonly calls: number;
  readonly limit: number;
  constructor(calls: number, limit: number) {
    super(
      `You've used all ${limit} free AI actions for today. They reset tomorrow.`,
    );
    this.name = "QuotaExceededError";
    this.calls = calls;
    this.limit = limit;
  }
}

type QuotaCheck = { allowed: boolean; calls: number; limit: number };

/**
 * Atomically consume one AI call from the user's daily quota and log which
 * endpoint spent it. Throws QuotaExceededError when the user is over quota,
 * or a plain Error if the quota RPC itself is unavailable (fail closed —
 * never silently burn budget).
 */
export async function consumeAiQuota(
  supabase: SupabaseClient<any>,
  userId: string,
  endpoint: string,
  limit: number = AI_DAILY_CALL_LIMIT,
): Promise<QuotaCheck> {
  // NOTE: the generated Database types don't include the new RPC yet, hence
  // the loose client type. Regenerate with `supabase gen types` to tighten.
  const { data, error } = await supabase.rpc("consume_ai_quota", {
    p_user_id: userId,
    p_daily_limit: limit,
    p_endpoint: endpoint,
  });
  if (error) {
    console.error("[AI quota] consume_ai_quota RPC failed:", error.message);
    throw new Error(
      "AI quota check is unavailable right now. Please try again in a moment.",
    );
  }
  const row = data as QuotaCheck;
  if (!row.allowed) throw new QuotaExceededError(row.calls, row.limit);
  return row;
}

/**
 * Drop-in replacement for groqChat() that enforces the per-user daily quota
 * first. `endpoint` is a short label recorded in ai_call_logs (e.g.
 * "mentor-chat", "resume-analysis").
 */
export async function guardedChat(
  supabase: SupabaseClient<any>,
  userId: string,
  endpoint: string,
  messages: ChatMsg[],
  opts?: Parameters<typeof groqChat>[1],
): Promise<string> {
  await consumeAiQuota(supabase, userId, endpoint);
  return groqChat(messages, opts ?? {});
}
