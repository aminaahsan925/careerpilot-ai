/** Safepay webhook handler, called from src/server.ts for POST /api/safepay-webhook.
 *
 * Security: the webhook body is treated as untrusted. We extract the
 * tracker token, re-fetch it from Safepay with our secret key, and only
 * activate when the tracker ended, the amount is Rs 499 (49900 paisa) in
 * PKR, and the payment's user can be resolved. Duplicate webhooks are
 * harmless: the payments row is upserted by tracker and the subscription
 * row is upserted by user.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import {
  PROOF_PLAN_AMOUNT_PAISA,
  PROOF_PLAN_CURRENCY,
  fetchTrackerState,
  isSafepayConfigured,
} from "./safepay.server";

export async function handleSafepayWebhook(request: Request): Promise<Response> {
  if (!isSafepayConfigured()) {
    return new Response(JSON.stringify({ ok: false, error: "Safepay not configured" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const payload = body as {
    notification?: { tracker?: string; metadata?: Record<string, unknown> };
    tracker?: string;
    metadata?: Record<string, unknown>;
  };
  const tracker = payload.notification?.tracker ?? payload.tracker;
  if (!tracker) {
    return new Response(JSON.stringify({ ok: false, error: "No tracker in webhook" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const checked = await fetchTrackerState(tracker);
  if (checked.state !== "TRACKER_ENDED") {
    return new Response(JSON.stringify({ ok: true, ignored: `state=${checked.state}` }), {
      headers: { "content-type": "application/json" },
    });
  }
  if (checked.amount !== PROOF_PLAN_AMOUNT_PAISA || checked.currency !== PROOF_PLAN_CURRENCY) {
    return new Response(JSON.stringify({ ok: false, error: "Amount or currency mismatch" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const userId = String(
    checked.metadata["user_id"] ??
      payload.notification?.metadata?.["user_id"] ??
      payload.metadata?.["user_id"] ??
      "",
  );
  if (!userId) {
    return new Response(JSON.stringify({ ok: false, error: "No user_id in payment metadata" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const orderId = `proof-${userId.slice(0, 8)}-${tracker}`;
  const { error: paymentError } = await (supabaseAdmin as unknown as {
    from: (t: string) => {
      upsert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
    };
  })
    .from("payments")
    .upsert({
      order_id: orderId,
      user_id: userId,
      tracker,
      amount: PROOF_PLAN_AMOUNT_PAISA,
      currency: PROOF_PLAN_CURRENCY,
      status: "paid",
    });
  if (paymentError) {
    console.error("[CareerPilot][safepay] payment upsert failed:", paymentError);
    return new Response(JSON.stringify({ ok: false, error: "Payment record failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const { error: subError } = await (supabaseAdmin as unknown as {
    from: (t: string) => {
      upsert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
    };
  })
    .from("user_subscriptions")
    .upsert({ user_id: userId, plan: "proof", status: "active" });
  if (subError) {
    console.error("[CareerPilot][safepay] subscription upsert failed:", subError);
    return new Response(JSON.stringify({ ok: false, error: "Activation failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, activated: true }), {
    headers: { "content-type": "application/json" },
  });
}
