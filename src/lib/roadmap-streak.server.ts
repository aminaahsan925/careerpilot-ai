import { supabaseAdmin } from "@/integrations/supabase/client.server";

// The roadmap v2 tables are not yet in the generated Supabase types.
// Use an untyped alias for operations on those tables only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

/* ------------------------------------------------------------------ *
 * Roadmap streak — consecutive days of completed work.
 *
 * HONESTY NOTE (2026-11-20): do NOT use `getDayStreak` from
 * daily-work.server.ts for this. It reads `created_at` of completed
 * `roadmap_daily_work` rows, but every day of a generated roadmap is
 * inserted in one batch, so `created_at` is the *generation* date, not
 * the completion date — the streak it returns is 0 or 1 for nearly
 * everyone and says nothing about when work was actually done.
 * `roadmap_daily_work` has no `completed_at` / `updated_at` column.
 *
 * The only real completion records with timestamps are the PASSED MCQ
 * attempts: a day becomes completed only through `markDayCompleted`,
 * which `mcq.server.ts` calls only after a passed attempt, and every
 * attempt is persisted in `roadmap_mcq_attempts` with `created_at`.
 * So the streak and the this-week count below are computed from the
 * distinct UTC dates of passed attempts. One passed attempt per day in
 * practice (the quiz only opens for uncompleted days); distinct-date
 * counting keeps the numbers right even if that ever changes.
 *
 * Streak rule: consecutive days ending today, or ending yesterday
 * (today not done yet — the streak is still alive, it just needs
 * today's day to keep going). A gap anywhere breaks the chain.
 * Week rule: Monday-start current week, UTC, matching the date
 * handling of the attempt timestamps.
 *
 * Errors THROW instead of returning 0: a failed read must surface as
 * "streak unavailable" in the UI, never as a fake zero streak.
 * ------------------------------------------------------------------ */

export type RoadmapStreakStats = {
  /** Consecutive days with completed work, ending today or yesterday. */
  streakDays: number;
  /** Distinct days with completed work in the current (Mon-start) week. */
  completedThisWeek: number;
};

const toUtcDate = (value: string) => value.split("T")[0] ?? "";

function mondayOfWeek(todayUtc: string): string {
  const date = new Date(`${todayUtc}T00:00:00Z`);
  // getUTCDay: 0 = Sunday … 6 = Saturday. Monday-start offset:
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().split("T")[0] ?? todayUtc;
}

export async function getRoadmapStreak(userId: string): Promise<RoadmapStreakStats> {
  const { data: attempts, error } = await db
    .from("roadmap_mcq_attempts")
    .select("created_at")
    .eq("user_id", userId)
    .eq("passed", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[RoadmapStreak] passed-attempts query error:", error.message);
    throw new Error("Could not load your streak right now.");
  }

  const completionDates = new Set<string>();
  for (const row of attempts ?? []) {
    if (typeof row.created_at === "string" && row.created_at) {
      completionDates.add(toUtcDate(row.created_at));
    }
  }

  if (completionDates.size === 0) {
    return { streakDays: 0, completedThisWeek: 0 };
  }

  const todayUtc = new Date().toISOString().split("T")[0] ?? "";
  const yesterday = new Date(`${todayUtc}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayUtc = yesterday.toISOString().split("T")[0] ?? "";

  // Walk back from today; if today has no completion yet, start at
  // yesterday so a live streak does not read as broken mid-day.
  const cursor = new Date(
    `${completionDates.has(todayUtc) ? todayUtc : yesterdayUtc}T00:00:00Z`,
  );
  let streakDays = 0;
  while (completionDates.has(cursor.toISOString().split("T")[0] ?? "")) {
    streakDays += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const mondayUtc = mondayOfWeek(todayUtc);
  let completedThisWeek = 0;
  for (const date of completionDates) {
    if (date >= mondayUtc && date <= todayUtc) completedThisWeek += 1;
  }

  return { streakDays, completedThisWeek };
}
