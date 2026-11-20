import { useQuery } from "@tanstack/react-query";

import { getRoadmapStreakFn } from "@/lib/roadmap-streak.functions";
import type { RoadmapStreakStats } from "@/lib/roadmap-streak.server";

export const ROADMAP_STREAK_QUERY_KEY = ["roadmap-v2", "streak"] as const;

/**
 * The user's completion streak (consecutive days with completed work)
 * and days completed this week — both computed server-side from passed
 * MCQ attempts, the only real completion records. See
 * src/lib/roadmap-streak.server.ts for the rules.
 *
 * The MCQ-submit mutation (useSubmitMcq in roadmap-v2.ts) invalidates this
 * key on success, so the streak refreshes instantly after a passed
 * checkpoint.
 */
export function useRoadmapStreak() {
  return useQuery({
    queryKey: ROADMAP_STREAK_QUERY_KEY,
    queryFn: async (): Promise<RoadmapStreakStats> => {
      console.info("[CareerPilot][client][getRoadmapStreak] request");
      try {
        const result = await getRoadmapStreakFn();
        console.info("[CareerPilot][client][getRoadmapStreak] success", {
          streakDays: result.streakDays,
          completedThisWeek: result.completedThisWeek,
        });
        return result;
      } catch (error) {
        console.error("[CareerPilot][client][getRoadmapStreak] failed", error);
        throw error;
      }
    },
    staleTime: 30_000,
  });
}
