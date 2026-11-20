import { useQuery } from "@tanstack/react-query";

import { getCompanyDashboard } from "@/lib/company.functions";
import { friendlyError } from "./user";

export type CompanyDashboard = Awaited<ReturnType<typeof getCompanyDashboard>>;

export const companyDashboardQueryKey = (companyName: string) =>
  ["company-dashboard", companyName.trim().toLowerCase()] as const;

/**
 * Load a company's intelligence dashboard. The server resolves the
 * shared company cache first, then live research, then the
 * source-reviewed seed — the hook only surfaces the result.
 */
export function useCompanyDashboard(companyName: string | null) {
  const name = (companyName ?? "").trim();
  return useQuery({
    queryKey: companyDashboardQueryKey(name || "none"),
    queryFn: async () => {
      console.info("[CareerPilot][client][getCompanyDashboard] request", {
        companyName: name,
      });
      try {
        const result = await getCompanyDashboard({
          data: { companyName: name },
        });
        console.info("[CareerPilot][client][getCompanyDashboard] success", {
          companyName: name,
          origin: result.provenance.origin,
        });
        return result;
      } catch (error) {
        console.error(
          "[CareerPilot][client][getCompanyDashboard] failed",
          error,
        );
        throw new Error(
          friendlyError(
            error,
            "Company data couldn't be loaded. Please try again.",
          ),
        );
      }
    },
    enabled: name.length > 0,
    staleTime: 30 * 60_000, // 30 minutes — company data changes slowly
  });
}
