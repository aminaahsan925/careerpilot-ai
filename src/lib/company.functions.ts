import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Fetch the company dashboard for an authenticated user.
 *  Uses the shared company cache; research failures fall back to seed. */
export const getCompanyDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { companyName: string }) => data)
  .handler(async ({ context, data }) => {
    const companyName = data.companyName?.trim();
    if (!companyName) {
      throw new Error("A company name is required.");
    }
    console.info("[CareerPilot][getCompanyDashboard] start", {
      userId: context.userId,
      companyName,
    });
    const { getCompanyDashboard: build } =
      await import("./companies/company.server");
    try {
      const result = await build(context.supabase, context.userId, companyName);
      console.info("[CareerPilot][getCompanyDashboard] success", {
        userId: context.userId,
        companyName,
        origin: result.provenance.origin,
        fromCache: result.provenance.fromCache,
      });
      return result;
    } catch (error) {
      console.error("[CareerPilot][getCompanyDashboard] failed", {
        userId: context.userId,
        companyName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
