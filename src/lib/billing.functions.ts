import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getBillingStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { isSafepayConfigured } = await import("./safepay.server");
  return { safepayConfigured: isSafepayConfigured() };
});

/** Fallback activation: after Safepay redirects back with ?tracker=…,
 * the signed-in user can check that tracker and activate their own plan.
 * No webhook registration in Safepay is required for this path. */
export const checkProofPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { tracker: string }) => {
    const tracker = String(input?.tracker ?? "").trim();
    if (!tracker) throw new Error("No payment tracker to check.");
    return { tracker };
  })
  .handler(async ({ data, context }) => {
    const { activateFromTracker } = await import("./safepay.server");
    return activateFromTracker(data.tracker, context.userId);
  });

export const startProofPlanCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { origin: string }) => {
    const origin = String(input?.origin ?? "").trim();
    if (!origin.startsWith("https://")) throw new Error("A secure origin is required.");
    return { origin };
  })
  .handler(async ({ data, context }) => {
    const { createProofPlanCheckout } = await import("./safepay.server");
    return createProofPlanCheckout(context.userId, data.origin);
  });
