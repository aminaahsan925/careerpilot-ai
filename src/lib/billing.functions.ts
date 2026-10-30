import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getBillingStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { isSafepayConfigured } = await import("./safepay.server");
  return { safepayConfigured: isSafepayConfigured() };
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
