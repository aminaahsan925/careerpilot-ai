/**
 * Hiring-weather signals for the destinations strip (Direction 3).
 *
 * A signal is computed ONLY from live ATS postings fetched from a
 * company's own verified job board. No board, no fetch, no signal:
 * anything that cannot be measured shows "Not measured", never an
 * invented forecast.
 *
 * Rule (stated in the UI next to every signal): count the postings
 * published in the last 7 days.
 *   - 5 or more  -> Busy
 *   - 1 to 4     -> Steady
 *   - 0          -> Quiet (the board answered, nothing new this week)
 *
 * The server caps the fetched board at 50 postings, so the count is
 * over the fetched set; the UI says "based on N new postings in the
 * last 7 days" and never claims a total the board did not return.
 */
import type { NormalizedJobPosting } from "@/lib/jobs/providers";

export type HiringSignal = "busy" | "steady" | "quiet" | "not_measured";

/** The minimum of what the weather math needs from a live-postings state. */
export type MeasurableBoard = {
  /** False when the company has no verified ATS board. */
  hasBoard: boolean;
  /** False when the board could not be read right now. */
  available: boolean;
  /** Live postings returned by the board (empty when unavailable). */
  postings: NormalizedJobPosting[];
};

export type HiringWeather = {
  signal: HiringSignal;
  /** Postings published in the last 7 days; null when not measurable. */
  newThisWeek: number | null;
  /** Live postings in the fetched set; null when not measurable. */
  totalLive: number | null;
  /** Human-readable reason, only when the signal is not_measured. */
  reason: string | null;
};

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const BUSY_THRESHOLD = 5;

/** Count postings with a usable publish date, and how many are fresh. */
export function countNewThisWeek(
  postings: NormalizedJobPosting[],
  now: Date = new Date(),
): { dated: number; fresh: number } {
  let dated = 0;
  let fresh = 0;
  for (const posting of postings) {
    if (!posting.publishedAt) continue;
    const published = Date.parse(posting.publishedAt);
    if (Number.isNaN(published)) continue;
    dated += 1;
    if (published <= now.getTime() && now.getTime() - published <= WEEK_MS) {
      fresh += 1;
    }
  }
  return { dated, fresh };
}

function bandFor(fresh: number, totalLive: number): HiringWeather {
  if (fresh >= BUSY_THRESHOLD) {
    return { signal: "busy", newThisWeek: fresh, totalLive, reason: null };
  }
  if (fresh >= 1) {
    return { signal: "steady", newThisWeek: fresh, totalLive, reason: null };
  }
  return { signal: "quiet", newThisWeek: 0, totalLive, reason: null };
}

function notMeasured(reason: string): HiringWeather {
  return { signal: "not_measured", newThisWeek: null, totalLive: null, reason };
}

/** Weather for one company, from its own live board. */
export function computeHiringWeather(
  board: MeasurableBoard,
  now: Date = new Date(),
): HiringWeather {
  if (!board.hasBoard) {
    return notMeasured("No live job board to measure");
  }
  if (!board.available) {
    return notMeasured("Live postings unavailable right now");
  }
  const { dated, fresh } = countNewThisWeek(board.postings, now);
  if (board.postings.length > 0 && dated === 0) {
    return notMeasured("This board does not publish posting dates");
  }
  return bandFor(fresh, board.postings.length);
}

/**
 * Weather for the student's target role, counted across the live boards
 * of the companies they applied to. A posting matches the role when
 * every meaningful word of the role (3+ letters) appears in its title,
 * e.g. "Software Engineer" matches "Senior Software Engineer".
 * With no readable board at all, the role is honestly "Not measured".
 */
export function computeRoleWeather(
  boards: MeasurableBoard[],
  targetRole: string,
  now: Date = new Date(),
): HiringWeather {
  const readable = boards.filter((board) => board.hasBoard && board.available);
  if (readable.length === 0) {
    return boards.some((board) => board.hasBoard)
      ? notMeasured("Live postings unavailable right now")
      : notMeasured("No live job boards to count from yet");
  }
  const words = targetRole
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z]/g, ""))
    .filter((word) => word.length >= 3);
  const matching = readable
    .flatMap((board) => board.postings)
    .filter((posting) => {
      if (words.length === 0) return false;
      const title = posting.title.toLowerCase();
      return words.every((word) => title.includes(word));
    });
  const { dated, fresh } = countNewThisWeek(matching, now);
  if (matching.length > 0 && dated === 0) {
    return notMeasured("These boards do not publish posting dates");
  }
  return bandFor(fresh, matching.length);
}
