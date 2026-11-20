/** Monetization layer for CareerPilot AI — honest, no invented prices.
 *
 * Plans:
 * - free: the readiness score and basic tools, capped at FREE_DAILY_AI_CALLS
 *   AI calls per day so one user cannot run up the whole AI bill.
 * - proof: the paid Proof Plan (roadmap + recruiter audit + weekly proof
 *   checks), capped at PROOF_DAILY_AI_CALLS. A user is on proof only when
 *   user_subscriptions has an active row for them — never by a client-side flag.
 *
 * Pricing: PROOF_PLAN_PRICE is deliberately NOT set here. It is set only
 * after the first 50 beta users test it. Until then the pricing page says
 * so, and no checkout button pretends a price exists. Stripe checkout is
 * the next step once she has a Stripe account and a chosen price; this
 * module is written so Stripe only has to write the subscription row.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

export type PlanId = "free" | "proof";

export const FREE_DAILY_AI_CALLS = 10;
export const PROOF_DAILY_AI_CALLS = 100;

/** Price chosen by the founder on 2026-10-30, to be tested with the first 50 beta users.
 * Payment is manual for the beta (JazzCash/Easypaisa + screenshot, founder
 * activates the row) because Stripe does not onboard Pakistan businesses. */
export const PROOF_PLAN_PRICE: string | null = "Rs 499/month";
export const STRIPE_CONFIGURED = false;

export class QuotaError extends Error {
  constructor(
    public readonly calls: number,
    public readonly limit: number,
  ) {
    super(
      `Daily AI limit reached (${calls}/${limit} calls today). Your readiness score and saved results still work — AI analysis resumes tomorrow, or upgrade to the Proof Plan when it opens.`,
    );
    this.name = "QuotaError";
  }
}

/** Thrown when the quota system itself cannot answer (RPC missing, DB
 * error, no verdict). Fail-closed: the AI call must NOT run when the
 * plan cannot be verified, so this is a refusal, not a warning. */
export class QuotaUnavailableError extends Error {
  constructor() {
    super("We could not verify your AI plan right now. Please try again in a moment.");
    this.name = "QuotaUnavailableError";
  }
}

export async function getUserPlan(supabase: Client, userId: string): Promise<PlanId> {
  // user_subscriptions is created by the billing migration
  // (supabase/migrations/20261120000000_billing.sql), so it is not in the
  // generated Database types yet; cast only this table access.
  const { data, error } = await (
    supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{
                data: { plan?: string; status?: string } | null;
                error: { message?: string } | null;
              }>;
            };
          };
        };
      };
    }
  )
    .from("user_subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) {
    // Subscriptions table not created yet (migrations not run) = free plan.
    // This is a grace period, not a bypass: once the table exists, only an
    // active row unlocks the paid limit.
    return "free";
  }
  return data?.plan === "proof" ? "proof" : "free";
}

/**
 * Consume one AI call for this user, BEFORE the AI call is made.
 * Throws QuotaError when the daily limit is reached.
 *
 * FAIL-CLOSED: if the quota check itself errors (RPC missing, DB down,
 * no verdict returned), this throws QuotaUnavailableError and the AI
 * call must not run. It never lets a call through unverified. That
 * means the billing migration must be applied before AI features work;
 * until then every AI feature refuses with a clear user-facing error
 * instead of silently spending AI cost with no quota.
 */
export async function consumeAiCall(
  supabase: Client,
  userId: string,
  endpoint: string,
): Promise<{ plan: PlanId; calls: number; limit: number }> {
  const plan = await getUserPlan(supabase, userId);
  const limit = plan === "proof" ? PROOF_DAILY_AI_CALLS : FREE_DAILY_AI_CALLS;
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: { allowed?: boolean; calls?: number } | null; error: { message?: string } | null }>;
    }
  ).rpc("consume_ai_quota", {
    p_user_id: userId,
    p_daily_limit: limit,
    p_endpoint: endpoint,
  });
  if (error) {
    console.error("[CareerPilot][billing] quota check failed, refusing AI call:", error.message);
    throw new QuotaUnavailableError();
  }
  const calls = data?.calls ?? 0;
  if (data && data.allowed === false) {
    throw new QuotaError(calls, limit);
  }
  if (!data || typeof data.allowed !== "boolean") {
    console.error("[CareerPilot][billing] quota check returned no verdict, refusing AI call");
    throw new QuotaUnavailableError();
  }
  return { plan, calls, limit };
}
