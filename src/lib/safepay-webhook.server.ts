/** Safepay webhook handler, called from src/server.ts for POST /api/safepay-webhook.
 *
 * Security: the webhook body is treated as untrusted. We extract the
 * tracker token, re-fetch it from Safepay with our secret key, and only
 * activate when the tracker ended, the amount is Rs 499 (49900 paisa) in
 * PKR, and the payment's user can be resolved. Duplicate webhooks are
 * harmless: the payments row is upserted by tracker and the subscription
 * row is upserted by user.
 */
import { activateFromTracker, isSafepayConfigured } from "./safepay.server";

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

  try {
    const result = await activateFromTracker(tracker);
    if (!result.activated) {
      return new Response(JSON.stringify({ ok: true, ignored: `state=${result.state}` }), {
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, activated: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("[CareerPilot][safepay] webhook activation failed:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Activation failed" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
