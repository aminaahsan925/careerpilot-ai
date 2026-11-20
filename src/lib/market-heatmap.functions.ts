/**
 * Posting-activity heatmap server function — Direction 2 market mirror.
 *
 * Buckets REAL publish dates from the verified ATS boards
 * (KNOWN_ATS_BOARDS in ./jobs/ats-providers) by weekday over the last
 * 6 weeks. No dates are ever invented:
 *
 *   - A posting without a publish date counts in `totalPostings` but
 *     is never placed in a cell.
 *   - A board that cannot be reached is counted in `boardsFailed`;
 *     the other boards still contribute.
 *   - When every board fails, every week is all zeros, so the UI
 *     renders its honest "live postings unavailable" state.
 *
 * The boards are company-wide (GitLab, Airbnb, Motive, Spotify,
 * Linear, Ashby) — this is market-wide posting activity, NOT filtered
 * to the student's target role. The UI must label it that way.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** One week of posting activity; `days` is 7 counts, Mon–Sun. */
export type PostingActivityWeek = {
  /** Monday of the week, e.g. "Nov 16". */
  label: string;
  days: number[];
};

export type PostingActivity = {
  weeks: PostingActivityWeek[];
  /** Live postings seen across all reachable boards. */
  totalPostings: number;
  /** Postings that carry a publish date (the only ones placed in cells). */
  datedPostings: number;
  boardsChecked: number;
  boardsFailed: number;
  /** ISO timestamp of the fetch. */
  fetchedAt: string;
};

const WEEKS = 6;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function mondayLabel(monday: Date): string {
  return `${MONTHS[monday.getMonth()]} ${monday.getDate()}`;
}

/** The last 6 Mon–Sun weeks, oldest first, ending with the current week. */
function buildWeeks(now: Date): { monday: Date; label: string; days: number[] }[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mondayOffset = (today.getDay() + 6) % 7; // Mon -> 0, Sun -> 6
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - mondayOffset);
  const weeks: { monday: Date; label: string; days: number[] }[] = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() - 7 * i);
    weeks.push({ monday, label: mondayLabel(monday), days: [0, 0, 0, 0, 0, 0, 0] });
  }
  return weeks;
}

/** Fetch live postings from every verified ATS board and bucket their
 *  publish dates by weekday. Never throws for a board failure — a
 *  failed board is reported in `boardsFailed` instead. */
export const getPostingActivityHeatmap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<PostingActivity> => {
    const { fetchLivePostingsForCompany, KNOWN_ATS_BOARDS } =
      await import("./jobs/ats-providers");
    const fetchedAt = new Date().toISOString();

    const results = await Promise.allSettled(
      KNOWN_ATS_BOARDS.map((board) =>
        fetchLivePostingsForCompany(board.companyName, {
          provider: board.provider,
          token: board.token,
        }),
      ),
    );

    let totalPostings = 0;
    let boardsFailed = 0;
    const publishDates: (string | null)[] = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value) {
        totalPostings += result.value.length;
        for (const posting of result.value) publishDates.push(posting.publishedAt);
      } else {
        boardsFailed += 1;
        console.warn("[CareerPilot][getPostingActivityHeatmap] board failed", {
          board: KNOWN_ATS_BOARDS[index]?.companyName,
          error:
            result.status === "rejected"
              ? result.reason instanceof Error
                ? result.reason.message
                : String(result.reason)
              : "no board",
        });
      }
    });

    const weeks = buildWeeks(new Date());
    let datedPostings = 0;
    for (const raw of publishDates) {
      if (!raw) continue;
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) continue;
      const day = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      const week = weeks.find((w) => {
        const nextMonday = new Date(w.monday);
        nextMonday.setDate(w.monday.getDate() + 7);
        return day >= w.monday && day < nextMonday;
      });
      if (!week) continue; // Outside the 6-week window: counted, not placed.
      datedPostings += 1;
      const dayIndex = (day.getDay() + 6) % 7; // Mon -> 0, Sun -> 6
      week.days[dayIndex] = (week.days[dayIndex] ?? 0) + 1;
    }

    return {
      weeks: weeks.map(({ label, days }) => ({ label, days })),
      totalPostings,
      datedPostings,
      boardsChecked: KNOWN_ATS_BOARDS.length,
      boardsFailed,
      fetchedAt,
    };
  });
