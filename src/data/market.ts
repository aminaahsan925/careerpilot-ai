import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getMarketReality,
  getMarketRealityFresh,
  getOutdatedTech,
  invalidateMarketReality,
  updateTargetRole,
} from "@/lib/market.functions";
import { friendlyError } from "./user";

export type MarketReality = Awaited<ReturnType<typeof getMarketReality>>;

export const MARKET_REALITY_QUERY_KEY = ["market-reality"] as const;

export function useMarketReality() {
  return useQuery({
    queryKey: MARKET_REALITY_QUERY_KEY,
    queryFn: async () => {
      console.info("[CareerPilot][client][getMarketReality] request");
      try {
        const result = await getMarketReality();
        console.info("[CareerPilot][client][getMarketReality] success", {
          targetRole: result.targetRole,
          fromCache: result.fromCache ?? false,
        });
        return result;
      } catch (error) {
        console.error("[CareerPilot][client][getMarketReality] failed", error);
        throw new Error(friendlyError(error, "Market data couldn't be loaded. Please try again."));
      }
    },
    staleTime: 10 * 60_000, // 10 minutes — market data doesn't change often
  });
}

/**
 * Refresh the Market Reality report, bypassing both the React Query
 * cache and the server-side DB cache.
 */
export function useRefreshMarketReality() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // 1. Invalidate server-side cache
      await invalidateMarketReality();
      // 2. Fetch fresh data via the dedicated fresh endpoint
      const result = await getMarketRealityFresh();
      return result;
    },
    onSuccess: (data) => {
      // Update the React Query cache with the fresh data
      queryClient.setQueryData(MARKET_REALITY_QUERY_KEY, data);
    },
  });
}

/**
 * Update the user's target role and trigger a fresh market report.
 */
export function useUpdateTargetRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetRole: string) => updateTargetRole({ data: { targetRole } }),
    onSuccess: () => {
      // Invalidate the current user so sidebar reflects the new goal
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      // Invalidate the market report cache so the next fetch is fresh
      queryClient.invalidateQueries({ queryKey: MARKET_REALITY_QUERY_KEY });
    },
  });
}

/**
 * Invalidate the market reality cache (client-side only).
 * Useful when the user changes their career goal.
 */
export function invalidateMarketRealityClient(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: MARKET_REALITY_QUERY_KEY });
}

export const OUTDATED_TECH_QUERY_KEY = ["outdated-tech"] as const;

/**
 * Detect outdated technologies in the student's skill set relative
 * to their target role. The outdated-tech check runs a Tavily-backed
 * trend lookup server-side; it is separate from the Market Reality
 * report, which is built from the researched dataset snapshot
 * (2026-08-31) enriched with live job postings where available.
 */
export function useOutdatedTech() {
  return useQuery({
    queryKey: OUTDATED_TECH_QUERY_KEY,
    queryFn: async () => {
      console.info("[CareerPilot][client][getOutdatedTech] request");
      try {
        const result = await getOutdatedTech();
        console.info("[CareerPilot][client][getOutdatedTech] success", {
          outdatedCount: result.outdatedItems.length,
          skillCount: result.studentSkills.length,
        });
        return result;
      } catch (error) {
        console.error("[CareerPilot][client][getOutdatedTech] failed", error);
        throw error;
      }
    },
    staleTime: 30 * 60_000, // 30 minutes — tech trends don't change hourly
  });
}
