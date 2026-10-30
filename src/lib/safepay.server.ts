/** Safepay automatic payments for CareerPilot AI — decided 2026-10-30.
 *
 * Why Safepay, not Stripe: Stripe does not onboard Pakistan businesses.
 * Safepay does onboard Pakistan sole proprietors/freelancers, and takes
 * local cards, JazzCash, Easypaisa, and international cards.
 *
 * Flow (from Safepay's Express Checkout guide):
 * 1. Server creates a payment session (tracker) for Rs 499 = 49900 paisa, PKR.
 * 2. Server creates a passport token.
 * 3. Server builds the hosted checkout URL and the user is redirected there.
 * 4. Safepay posts a webhook to /api/safepay-webhook. We do NOT trust the
 *    webhook payload alone: we re-fetch the tracker from Safepay with our
 *    secret key and only activate when tracker.state is TRACKER_ENDED and
 *    the amount/currency match. That authenticated re-check is the
 *    verification, and it also makes duplicate webhooks harmless.
 *
 * Keys live ONLY in environment variables (Vercel): SAFEPAY_SECRET_KEY,
 * SAFEPAY_API_KEY, SAFEPAY_ENVIRONMENT (sandbox | production).
 * Until they are set, createProofPlanCheckout throws a clear
 * "not configured" error and the pricing page shows the manual beta
 * instructions instead of a broken Pay button.
 */

import { Safepay } from "@sfpy/node-core";

export const PROOF_PLAN_AMOUNT_PAISA = 49900;
export const PROOF_PLAN_CURRENCY = "PKR";

export function isSafepayConfigured(): boolean {
  return Boolean(
    process.env["SAFEPAY_SECRET_KEY"]?.trim() && process.env["SAFEPAY_API_KEY"]?.trim(),
  );
}

function getSafepayClient() {
  const secret = process.env["SAFEPAY_SECRET_KEY"]?.trim();
  const environment =
    process.env["SAFEPAY_ENVIRONMENT"]?.trim() === "production" ? "production" : "sandbox";
  if (!secret) throw new Error("Safepay is not configured yet — no SAFEPAY_SECRET_KEY set.");
  const host =
    environment === "production"
      ? "https://api.getsafepay.com"
      : "https://sandbox.api.getsafepay.com";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = new (Safepay as any)(secret, { authType: "secret", host });
  return { client, environment };
}

export async function createProofPlanCheckout(
  userId: string,
  origin: string,
): Promise<{ url: string; tracker: string; orderId: string }> {
  const apiKey = process.env["SAFEPAY_API_KEY"]?.trim();
  if (!apiKey) throw new Error("Safepay is not configured yet — no SAFEPAY_API_KEY set.");
  const { client, environment } = getSafepayClient();
  const orderId = `proof-${userId.slice(0, 8)}-${Date.now()}`;

  const session = await client.payments.session.setup({
    merchant_api_key: apiKey,
    intent: "CYBERSOURCE",
    mode: "payment",
    entry_mode: "raw",
    currency: PROOF_PLAN_CURRENCY,
    amount: PROOF_PLAN_AMOUNT_PAISA,
    metadata: { order_id: orderId, user_id: userId, plan: "proof" },
    include_fees: false,
  });
  const tracker = session?.data?.tracker?.token as string | undefined;
  if (!tracker) throw new Error("Safepay did not return a payment tracker.");

  const passport = await client.client.passport.create();
  const tbt = (passport?.data ?? passport) as string;
  if (typeof tbt !== "string" || !tbt) {
    throw new Error("Safepay did not return a passport token.");
  }

  const url = client.checkout.createCheckoutUrl({
    env: environment === "production" ? "production" : "sandbox",
    tbt,
    tracker,
    source: "hosted",
    order_id: orderId,
    redirect_url: `${origin}/pricing?paid=1`,
    cancel_url: `${origin}/pricing?cancelled=1`,
  });
  return { url, tracker, orderId };
}

/** Activate a user from a verified tracker. Shared by the webhook handler
 * and by the manual "Check payment" fallback, so activation does not
 * depend on the webhook being registered in Safepay at all. */
export async function activateFromTracker(
  tracker: string,
  expectedUserId?: string,
): Promise<{ activated: boolean; state: string; userId: string }> {
  const checked = await fetchTrackerState(tracker);
  if (checked.state !== "TRACKER_ENDED") {
    return { activated: false, state: checked.state, userId: "" };
  }
  if (checked.amount !== PROOF_PLAN_AMOUNT_PAISA || checked.currency !== PROOF_PLAN_CURRENCY) {
    throw new Error("Payment amount or currency does not match the Rs 499 Proof Plan.");
  }
  const userId = String(checked.metadata["user_id"] ?? "");
  if (!userId) throw new Error("This payment has no user attached, so it cannot be activated.");
  if (expectedUserId && expectedUserId !== userId) {
    throw new Error("This payment belongs to a different account.");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as {
    from: (t: string) => {
      upsert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
    };
  };
  const orderId = `proof-${userId.slice(0, 8)}-${tracker}`;
  const { error: paymentError } = await admin.from("payments").upsert({
    order_id: orderId,
    user_id: userId,
    tracker,
    amount: PROOF_PLAN_AMOUNT_PAISA,
    currency: PROOF_PLAN_CURRENCY,
    status: "paid",
  });
  if (paymentError) throw new Error("Could not record the payment. Please try again.");
  const { error: subError } = await admin
    .from("user_subscriptions")
    .upsert({ user_id: userId, plan: "proof", status: "active" });
  if (subError) throw new Error("Could not activate the plan. Please try again.");
  return { activated: true, state: checked.state, userId };
}

/** Authenticated re-check: fetch the tracker from Safepay and confirm it ended paid. */
export async function fetchTrackerState(tracker: string): Promise<{
  state: string;
  amount: number;
  currency: string;
  metadata: Record<string, unknown>;
}> {
  const { client } = getSafepayClient();
  const response = await client.reporter.payments.fetch(tracker);
  const data = response?.data ?? {};
  const t = data.tracker ?? {};
  const totals = t.purchase_totals?.quote_amount ?? {};
  return {
    state: String(t.state ?? ""),
    amount: Number(totals.amount ?? 0),
    currency: String(totals.currency ?? ""),
    metadata: (data.metadata ?? {}) as Record<string, unknown>,
  };
}
