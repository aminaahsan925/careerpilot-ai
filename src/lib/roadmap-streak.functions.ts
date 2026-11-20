import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { RoadmapStreakStats } from "./roadmap-streak.server";

/* ------------------------------------------------------------------ *
 * Roadmap streak server function — thin, authenticated wrapper around
 * the streak module. The userId always comes from the request
 * context, never the client. See roadmap-streak.server.ts for why the
 * streak is computed from passed MCQ attempts (the only real
 * completion records) and not from `getDayStreak`.
 * ------------------------------------------------------------------ */

/** Consecutive-day completion streak + days completed this week. */
export const getRoadmapStreakFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RoadmapStreakStats> => {
    const { getRoadmapStreak } = await import("./roadmap-streak.server");
    try {
      return await getRoadmapStreak(context.userId);
    } catch (error) {
      console.error("[CareerPilot][getRoadmapStreakFn] failed", {
        userId: context.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
