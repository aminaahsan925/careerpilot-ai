import { motion } from "motion/react";

import { PilotSays } from "@/components/mascot/PilotMascot";
import type { RoadmapStreakStats } from "@/lib/roadmap-streak.server";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Smiling infinity loop (Loop pattern)                               */
/* ------------------------------------------------------------------ */

/**
 * Hand-drawn smiling infinity loop. Original inline SVG, no generated
 * imagery: the wobble in the path is deliberate, like a marker sketch.
 * Drawn in cream and gold so it sits on the chocolate poster board.
 */
export function LoopMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 110" fill="none" aria-hidden="true" className={className}>
      <path
        d="M42 56 C40 32 68 28 99 54 C128 79 160 81 161 57 C162 33 133 29 100 55 C69 80 41 80 42 56 Z"
        stroke="var(--d3-cream)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="70" cy="47" r="5" fill="var(--d3-cream)" />
      <circle cx="130" cy="47" r="5" fill="var(--d3-cream)" />
      <path
        d="M82 64 Q100 76 118 64"
        stroke="var(--d3-cream)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M18 20 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 Z"
        fill="var(--d3-gold)"
      />
      <path
        d="M180 12 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z"
        fill="var(--d3-sky)"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Encouraging copy (Loop: warm, never guilt)                         */
/* ------------------------------------------------------------------ */

function loopCopy(streakDays: number) {
  if (streakDays <= 0) {
    return {
      heading: "It's never too late to start a new thing!",
      line: "Your loop begins the day you pass your first checkpoint. One small day is all it takes.",
      bubble: "One small day is all it takes to start.",
    };
  }
  if (streakDays < 3) {
    return {
      heading: "The loop is warming up",
      line: `${streakDays} ${streakDays === 1 ? "day" : "days"} in a row. Small steps, kept daily, are the whole trick.`,
      bubble: "You showed up. That is the hardest part.",
    };
  }
  if (streakDays < 7) {
    return {
      heading: "Look at this loop go",
      line: `${streakDays} days in a row. You are building the habit that gets you hired.`,
      bubble: "Keep going, you are on a roll!",
    };
  }
  return {
    heading: "A full week around the loop!",
    line: `${streakDays} days in a row. One checkpoint today keeps the loop alive.`,
    bubble: "A whole week of showing up. Brilliant!",
  };
}

function loopMood(streakDays: number): "encouraging" | "happy" | "cheering" {
  if (streakDays <= 1) return "encouraging";
  if (streakDays >= 7) return "cheering";
  return "happy";
}

/* ------------------------------------------------------------------ */
/* Loop header                                                        */
/* ------------------------------------------------------------------ */

type LoopHeaderProps = {
  goal: string;
  /** Real streak stats (passed MCQ attempts). Undefined while loading. */
  streak: RoadmapStreakStats | undefined;
  streakLoading: boolean;
  /** A failed read must show as unavailable, never as a fake zero streak. */
  streakError: boolean;
  completedPaths: number;
  totalPaths: number;
  completedDays: number;
  totalDays: number;
  overallProgress: number;
};

export function LoopHeader({
  goal,
  streak,
  streakLoading,
  streakError,
  completedPaths,
  totalPaths,
  completedDays,
  totalDays,
  overallProgress,
}: LoopHeaderProps) {
  const streakDays = streak?.streakDays ?? 0;
  const copy = loopCopy(streakDays);
  const mood = loopMood(streakDays);

  return (
    <section
      aria-label="Your learning loop"
      className="relative overflow-hidden rounded-[2rem] border-2 border-[var(--d3-choco)] bg-[var(--d3-choco)] p-5 text-[var(--d3-cream)] shadow-[0_10px_30px_rgba(60,30,10,0.25)] sm:p-7"
    >
      {/* Faint poster-board dot texture, decorative only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-5">
        {/* The loop + the real streak count. */}
        <div className="flex shrink-0 flex-col items-center">
          <LoopMotif className="w-40 sm:w-48" />
          {streakError ? (
            <p className="mt-1 max-w-[180px] text-center text-xs font-semibold text-[var(--d3-cream)]/80">
              Streak unavailable right now
            </p>
          ) : streakLoading || !streak ? (
            <div
              aria-hidden="true"
              className="mt-2 h-12 w-28 animate-pulse rounded-xl bg-white/15"
            />
          ) : (
            <p className="mt-1 text-center">
              <span className="d3-display text-5xl font-extrabold text-[var(--d3-gold)]">
                {streak.streakDays}
              </span>
              <span className="ml-2 text-sm font-bold">
                {streak.streakDays === 1 ? "day in a row" : "days in a row"}
              </span>
            </p>
          )}
        </div>

        {/* Encouraging copy + the week so far. */}
        <div className="min-w-[220px] flex-1">
          <h2 className="d3-display text-2xl font-bold leading-tight sm:text-3xl">{copy.heading}</h2>
          <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-[var(--d3-cream)]/85">
            {copy.line}
          </p>
          {!streakError && streak && (
            <div className="mt-4">
              <div
                className="flex items-center gap-1.5"
                role="img"
                aria-label={`${streak.completedThisWeek} of 7 days completed this week`}
              >
                {Array.from({ length: 7 }).map((_, index) => (
                  <span
                    key={index}
                    aria-hidden="true"
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      index < streak.completedThisWeek
                        ? "bg-[var(--d3-lime)]"
                        : "bg-white/25",
                    )}
                  />
                ))}
                <span className="ml-2 text-xs font-bold text-[var(--d3-cream)]/85">
                  {streak.completedThisWeek} of 7 days this week
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-[var(--d3-cream)]/60">
                A day counts when its checkpoint is passed.
              </p>
            </div>
          )}
        </div>

        {/* The Pilot mascot, encouraging on low streaks, cheering on
            milestones. PilotSays renders the mascot plus its bubble. */}
        <PilotSays mood={mood} size={92} className="min-w-[240px] max-w-sm flex-1 sm:ml-auto">
          {copy.bubble}
        </PilotSays>
      </div>

      {/* Goal + real overall progress. */}
      <div className="relative mt-6 border-t border-white/15 pt-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--d3-gold)]">
          Current goal
        </p>
        <p className="d3-display mt-1 text-xl font-bold sm:text-2xl">{goal}</p>
        <div className="mt-4 flex items-center gap-4">
          <span className="h-2.5 max-w-[420px] flex-1 overflow-hidden rounded-full bg-white/15">
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="block h-full rounded-full bg-[var(--d3-lime)]"
            />
          </span>
          <span className="shrink-0 text-[13px] font-bold">{overallProgress}% complete</span>
        </div>
        {totalPaths > 0 && (
          <p className="mt-2 text-xs text-[var(--d3-cream)]/60">
            {completedPaths}/{totalPaths} paths · {completedDays}/{totalDays} days
          </p>
        )}
      </div>
    </section>
  );
}
