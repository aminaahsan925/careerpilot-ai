import { motion } from "motion/react";

import { Lens } from "@/components/lens/Lens";
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import type { RoadmapStreakStats } from "@/lib/roadmap-streak.server";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Roadmap header (Round 3, Flashlight / Lens)                        */
/*                                                                    */
/* Replaces the Direction 3 LoopHeader (friendly loop + Pilot). No    */
/* loop motif, no mascot, no encouraging copy: a disciplined dark     */
/* header with the goal in display type, the real streak as a big     */
/* number under the lens, and real overall progress. Progress comes   */
/* only from real user state; a failed streak read shows as          */
/* unavailable, never as a fake zero.                                 */
/* ------------------------------------------------------------------ */

type RoadmapHeaderProps = {
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

export function RoadmapHeader({
  goal,
  streak,
  streakLoading,
  streakError,
  completedPaths,
  totalPaths,
  completedDays,
  totalDays,
  overallProgress,
}: RoadmapHeaderProps) {
  const streakDays = streak?.streakDays ?? 0;

  return (
    <SpotlightCard className="card-surface relative overflow-hidden bg-cp-ink p-5 sm:p-7">
      {/* Lime rule across the top. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-cp-lime" />
      {/* Faint dot texture, decorative only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(244,241,234,0.06) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative flex flex-wrap items-start gap-x-8 gap-y-6">
        {/* The streak, as a number under the lens. */}
        <div className="shrink-0">
          <p className="cp-eyebrow">Streak</p>
          {streakError ? (
            <p className="mt-3 max-w-[180px] text-xs font-semibold text-cp-paper/80">
              Streak unavailable right now
            </p>
          ) : streakLoading || !streak ? (
            <div
              aria-hidden="true"
              className="mt-3 h-14 w-32 animate-pulse rounded-xl bg-cp-paper/10"
            />
          ) : (
            <Lens>
              <p className="mt-1">
                <span className="font-display text-6xl font-black tracking-tight text-cp-lime">
                  {streak.streakDays}
                </span>
                <span className="ml-2 text-sm font-bold text-cp-paper">
                  {streak.streakDays === 1 ? "day in a row" : "days in a row"}
                </span>
              </p>
            </Lens>
          )}
          {!streakError && streak && streakDays === 0 && (
            <p className="mt-2 max-w-[220px] text-xs leading-relaxed text-cp-paper/60">
              No streak yet. Pass one checkpoint to start it.
            </p>
          )}
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
                        ? "bg-cp-lime"
                        : "bg-cp-paper/20",
                    )}
                  />
                ))}
                <span className="ml-2 text-xs font-bold text-cp-paper/85">
                  {streak.completedThisWeek} of 7 days this week
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-cp-paper/50">
                A day counts when its checkpoint is passed.
              </p>
            </div>
          )}
        </div>

        {/* Goal + real overall progress. */}
        <div className="min-w-[220px] flex-1">
          <p className="cp-eyebrow">Current goal</p>
          <p className="font-display editorial-title mt-2 text-2xl text-cp-paper sm:text-3xl">
            {goal}
          </p>
          <div className="mt-5 flex items-center gap-4">
            <span className="h-2.5 max-w-[420px] flex-1 overflow-hidden rounded-full bg-cp-paper/10">
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="block h-full rounded-full bg-cp-lime"
              />
            </span>
            <span className="shrink-0 font-mono text-[13px] font-semibold text-cp-paper">
              {overallProgress}% complete
            </span>
          </div>
          {totalPaths > 0 && (
            <p className="mt-2 font-mono text-xs text-cp-paper/50">
              {completedPaths}/{totalPaths} paths · {completedDays}/{totalDays} days
            </p>
          )}
        </div>
      </div>
    </SpotlightCard>
  );
}
