/**
 * AI call quotas — delegates to the single plan-based rule.
 *
 * Every AI call in the product is governed by ONE quota: the plan-based
 * limits in ./billing.server.ts (free 10/day, Proof 100/day), enforced
 * by `consumeAiCall` via the atomic `consume_ai_quota` RPC. This module
 * used to enforce its own flat 25/day env-default limit; that second
 * rule was deleted in the Wave 2 reconciliation (2026-11-20) because
 * two quota helpers with different limits meant the same user could be
 * both over and under quota depending on which feature they used.
 *
 * `guardedChat()` keeps its export shape: it is a drop-in replacement
 * for groqChat() that consumes one unit of the caller's plan-based
 * daily quota before spending the call. Over-quota users get a clear
 * QuotaExceededError; an unavailable quota system fails closed (the AI
 * call does not run).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { groqChat, type ChatMsg } from "./ai.server";
import {
  consumeAiCall,
  PROOF_DAILY_AI_CALLS,
  QuotaError,
  QuotaUnavailableError,
  type PlanId,
} from "./billing.server";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

export class QuotaExceededError extends Error {
  readonly calls: number;
  readonly limit: number;
  readonly plan: PlanId;
  constructor(calls: number, limit: number, plan: PlanId = "free") {
    super(
      `You've used all ${limit} AI actions for today on the ${plan} plan. They reset tomorrow.`,
    );
    this.name = "QuotaExceededError";
    this.calls = calls;
    this.limit = limit;
    this.plan = plan;
  }
}

export type QuotaCheck = {
  allowed: boolean;
  calls: number;
  limit: number;
  plan: PlanId;
};

/**
 * Atomically consume one AI call from the user's PLAN-BASED daily quota
 * (billing.server.ts: free 10/day, Proof 100/day) and log which
 * endpoint spent it.
 *
 * Throws QuotaExceededError when the user is over quota, or
 * QuotaUnavailableError if the quota system itself cannot answer
 * (fail closed — never silently burn budget).
 *
 * The `limit` parameter is DEPRECATED and ignored: the plan governs
 * the limit now. It is kept only so existing callers keep compiling.
 */
export async function consumeAiQuota(
  supabase: SupabaseClient<any>,
  userId: string,
  endpoint: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  limit?: number,
): Promise<QuotaCheck> {
  try {
    const result = await consumeAiCall(
      supabase as unknown as Client,
      userId,
      endpoint,
    );
    return {
      allowed: true,
      calls: result.calls,
      limit: result.limit,
      plan: result.plan,
    };
  } catch (error) {
    if (error instanceof QuotaError) {
      // consumeAiCall's QuotaError does not carry the plan; the limit
      // it enforced identifies it (Proof limit vs free limit).
      const plan: PlanId =
        error.limit >= PROOF_DAILY_AI_CALLS ? "proof" : "free";
      throw new QuotaExceededError(error.calls, error.limit, plan);
    }
    if (error instanceof QuotaUnavailableError) throw error;
    throw error;
  }
}

/**
 * Drop-in replacement for groqChat() that enforces the plan-based
 * per-user daily quota first. `endpoint` is a short label recorded in
 * ai_call_logs (e.g. "mentor-chat", "resume-analysis").
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
