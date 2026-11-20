import { CalendarCheck, Flame, Sparkles, Target } from "lucide-react";

import { GlowCard, Ring } from "@/components/analytics";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * GamifiedHeader — Direction 2 (Dark Analytics) roadmap header,
 * Mindzy pattern: streak, points, study-flow rings, week challenge,
 * skill/path % rings.
 *
 * PRESENTATIONAL ONLY: every number arrives as a prop from the page
 * (roadmap.tsx), which owns the hooks. No data fetching here, so this
 * component can be previewed standalone with any props.
 *
 * Honesty rules (see REBUILD-REPORT-2026-11-20.md):
 * - Points come from completed work only. The formula is defined once
 *   in the page: points = 10 x completed days + 5 x checkpoints
 *   passed. This component only displays the value and its breakdown.
 * - A fresh user sees 0 streak, 0 points and empty rings, with copy
 *   that invites the first day — never seeded or faked progress.
 * - streakDays === null means the streak read failed: show the honest
 *   "unavailable" state, never a zero that was never measured.
 * - weekPlanned is the roadmap's own cadence (one day of work per
 *   calendar day, so 7 per week), labelled as the plan — the
 *   completed side is always real.
 * ------------------------------------------------------------------ */

/** One learning path's completion, as a small ring. */
export type GamifiedPathRing = {
  id: string;
  title: string;
  /** 0–100, from that path's completed / total days. */
  percent: number;
  completedDays: number;
  totalDays: number;
};

export type GamifiedHeaderProps = {
  /** The student's target role / goal line. */
  goal: string;
  /** Consecutive days with completed work, or null when unavailable. */
  streakDays: number | null;
  streakLoading: boolean;
  /** Points earned from completed work (see formula note above). */
  points: number;
  /** Completed days — shown as the points breakdown. */
  completedDays: number;
  /** Passed checkpoints (MCQs) — shown as the points breakdown. */
  checkpointsPassed: number;
  /** Overall roadmap completion, 0–100. */
  overallPercent: number;
  /** Days completed in the current week (real). */
  weekCompleted: number;
  /** Days planned this week (the roadmap's one-per-day cadence: 7). */
  weekPlanned: number;
  /** Title of the next uncompleted day, or null when there is none. */
  nextDayTitle: string | null;
  /** Learning path the next day belongs to, or null. */
  nextDayPathTitle: string | null;
  /** False when no roadmap has been generated yet. */
  hasRoadmap: boolean;
  /** One ring per learning path. */
  paths: GamifiedPathRing[];
};

export function GamifiedHeader({
  goal,
  streakDays,
  streakLoading,
  points,
  completedDays,
  checkpointsPassed,
  overallPercent,
  weekCompleted,
  weekPlanned,
  nextDayTitle,
  nextDayPathTitle,
  hasRoadmap,
  paths,
}: GamifiedHeaderProps) {
  const freshStart = hasRoadmap && completedDays === 0;
  const weekPercent =
    weekPlanned > 0 ? Math.round((weekCompleted / weekPlanned) * 100) : 0;
  const streakKnown = streakDays !== null;
  const streakLit = streakKnown && streakDays > 0;

  return (
    <section aria-label="Roadmap progress" className="space-y-4">
      {/* Hero: goal + streak + points + study-flow rings */}
      <GlowCard>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Current Goal
        </p>
        <h2 className="editorial-title mt-3 text-[clamp(1.8rem,4vw,2.8rem)]">{goal}</h2>
        <p className="serif-accent mt-2 text-lg text-muted-foreground">
          {freshStart
            ? "your first day is waiting."
            : completedDays > 0
              ? "one day at a time, keep the chain going."
              : "turn your goal into a plan you can follow."}
        </p>

        <div className="mt-6 flex flex-wrap items-start gap-x-8 gap-y-6">
          {/* Streak */}
          <div className="min-w-[120px]">
            <div className="flex items-center gap-2">
              <Flame
                className={cn(
                  "h-4 w-4",
                  streakLit ? "text-primary" : "text-muted-foreground",
                )}
                aria-hidden="true"
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Day streak
              </p>
            </div>
            {streakLoading ? (
              <p className="numeral mt-2 animate-pulse text-5xl leading-none">—</p>
            ) : streakKnown ? (
              <p className="numeral mt-2 text-5xl leading-none">{streakDays}</p>
            ) : (
              <p className="numeral mt-2 text-5xl leading-none text-muted-foreground">—</p>
            )}
            <p className="mt-2 max-w-[160px] text-xs leading-relaxed text-muted-foreground">
              {streakLoading
                ? "Loading your streak…"
                : !streakKnown
                  ? "Streak unavailable right now."
                  : streakDays === 0
                    ? "Complete a day to light the flame."
                    : streakDays === 1
                      ? "1 day in a row. Do today to keep it alive."
                      : `${streakDays} days in a row. Do today to keep it alive.`}
            </p>
          </div>

          {/* Points */}
          <div className="min-w-[160px]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Points
              </p>
            </div>
            <p className="numeral mt-2 text-5xl leading-none">{points}</p>
            <p className="mt-2 max-w-[200px] text-xs leading-relaxed text-muted-foreground">
              Points earned from completed work: 10 per day done ({completedDays}) + 5 per
              checkpoint passed ({checkpointsPassed}).
            </p>
          </div>

          {/* Study-flow rings */}
          <div className="ml-auto flex flex-wrap items-start gap-6">
            <div className="flex flex-col items-center gap-2">
              <Ring
                value={overallPercent}
                size={120}
                label={`${Math.round(overallPercent)}%`}
                sublabel="roadmap complete"
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Overall
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Ring
                value={weekPercent}
                size={120}
                label={`${weekCompleted}/${weekPlanned}`}
                sublabel="days this week"
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                This week
              </p>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Week challenge strip */}
      <div className="card-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">This week&apos;s challenge</h3>
              <p className="text-xs text-muted-foreground">
                {weekCompleted} of {weekPlanned} days done — one day of work per day.
              </p>
            </div>
          </div>
          <span className="numeral text-2xl leading-none">
            {weekCompleted}/{weekPlanned}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${weekPercent}%` }}
          />
        </div>
        <div className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {nextDayTitle ? (
            <p className="text-foreground">
              Next up: <span className="font-semibold">{nextDayTitle}</span>
              {nextDayPathTitle ? (
                <span className="text-muted-foreground"> · {nextDayPathTitle}</span>
              ) : null}
            </p>
          ) : hasRoadmap ? (
            <p className="text-foreground">
              Every day is done. Your roadmap is complete — time to celebrate, then aim higher.
            </p>
          ) : (
            <p className="text-foreground">
              Generate your roadmap below to see your first day here.
            </p>
          )}
        </div>
      </div>

      {/* Skill / path % rings */}
      {paths.length > 0 && (
        <div className="card-surface p-5">
          <h3 className="text-[14.5px] font-bold">Paths in progress</h3>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-5">
            {paths.map((path) => (
              <div key={path.id} className="flex w-[104px] flex-col items-center gap-2">
                <Ring
                  value={path.percent}
                  size={84}
                  stroke={8}
                  label={`${Math.round(path.percent)}%`}
                />
                <p className="w-full text-center text-xs font-semibold leading-snug text-foreground">
                  {path.title}
                </p>
                <p className="-mt-1 text-[11px] text-muted-foreground">
                  {/* totalDays 0 means the shared day query has not
                      resolved yet — a path always has days once loaded. */}
                  {path.totalDays > 0
                    ? `${path.completedDays}/${path.totalDays} days`
                    : "loading days…"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
