/**
 * MarketAnalyticsGrid — Direction 2 (Dark Analytics) market mirror.
 *
 * Presentational only: it takes the market report and computed values
 * as props and contains NO data hooks, so it can be previewed
 * standalone. The page (market.tsx) owns the hooks and passes props
 * down.
 *
 * Honesty rules (REBUILD-REPORT-2026-11-20):
 *   - Every researched number carries its research date and source.
 *   - Unknown = "Not assessed yet" / "not researched yet", never a
 *     guessed number.
 *   - The donut is coverage (counts of matched vs missing skills),
 *     never a probability.
 *   - The heatmap shows REAL publish dates from the verified ATS
 *     boards; when the fetch fails it renders the honest empty state.
 *   - The AI-insight card reuses the report's existing marketSignals
 *     text — no new AI call is made.
 */
import { Activity, Flame, Sparkles, Target, TrendingUp } from "lucide-react";

import {
  Donut,
  GlowCard,
  HeatmapGrid,
  KpiStat,
  MiniBars,
} from "@/components/analytics";

/** Heatmap payload, as returned by getPostingActivityHeatmap. */
export type MarketHeatmapData = {
  /** One entry per week; `days` is 7 counts, Mon–Sun. */
  weeks: { label: string; days: number[] }[];
  totalPostings: number;
  datedPostings: number;
  boardsChecked: number;
  boardsFailed: number;
  /** ISO timestamp of the fetch. */
  fetchedAt: string;
};

export type MarketAnalyticsGridProps = {
  targetRole: string;
  highDemandCount: number;
  commonCount: number;
  roleSpecificCount: number;
  matchedCount: number;
  gapCount: number;
  /** Share of high-demand skills matched, or null when unassessable. */
  coveragePct: number | null;
  /** YYYY-MM-DD, or null when the evidence has no research date. */
  researchedOn: string | null;
  sourcesCount: number;
  evidenceProvider: string;
  /** Existing marketSignals text from the report (no new AI call). */
  marketSignals: string[];
  /** Null while loading or when the boards could not be reached. */
  heatmap: MarketHeatmapData | null;
  heatmapLoading: boolean;
};

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

/** "2026-08-31" -> "31 Aug 2026". Parsed manually to avoid TZ shifts. */
function formatResearchDate(iso: string | null): string {
  if (!iso) return "date unknown";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day || month < 1 || month > 12) return iso;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function formatFetchedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function MarketAnalyticsGrid({
  targetRole,
  highDemandCount,
  commonCount,
  roleSpecificCount,
  matchedCount,
  gapCount,
  coveragePct,
  researchedOn,
  sourcesCount,
  evidenceProvider,
  marketSignals,
  heatmap,
  heatmapLoading,
}: MarketAnalyticsGridProps) {
  const researchedLabel = formatResearchDate(researchedOn);
  const signals = marketSignals.filter(Boolean).slice(0, 3);

  const livePostingsValue = heatmap
    ? String(heatmap.totalPostings)
    : heatmapLoading
      ? "…"
      : "—";
  const livePostingsSub = heatmap
    ? `Fetched ${formatFetchedAt(heatmap.fetchedAt)} · ${heatmap.boardsChecked} verified boards`
    : heatmapLoading
      ? "Checking the verified job boards…"
      : "Live postings unavailable";

  return (
    <section aria-label="Market analytics" className="space-y-4">
      {/* Header: editorial title + provenance line */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="editorial-title text-2xl text-foreground sm:text-3xl">
            The market, <span className="text-gradient-accent">at a glance.</span>
          </h2>
          <p className="serif-accent mt-1 text-base text-muted-foreground">
            What employers actually want for {targetRole}.
          </p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Researched {researchedLabel} · {sourcesCount}{" "}
          {sourcesCount === 1 ? "source" : "sources"} · {evidenceProvider}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiStat
          label="High-demand skills"
          value={String(highDemandCount)}
          sub={`For ${targetRole} · researched ${researchedLabel}`}
          icon={<Flame className="h-4 w-4" />}
        />
        <KpiStat
          label="You match"
          value={String(matchedCount)}
          sub={
            coveragePct === null
              ? "Not assessed yet"
              : `${coveragePct}% of this role's high-demand skills`
          }
          highlight
          icon={<Target className="h-4 w-4" />}
        />
        <KpiStat
          label="Gaps to close"
          value={String(gapCount)}
          sub={
            gapCount > 0
              ? "Highest-priority gaps first"
              : "Core demand covered by your skills"
          }
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiStat
          label="Live postings"
          value={livePostingsValue}
          sub={livePostingsSub}
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      {/* Charts row: bars · donut · AI insight */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/60 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Skill demand by category
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Counts from your market report · researched {researchedLabel}
          </p>
          <div className="mt-4">
            <MiniBars
              bars={[
                { label: "High", value: highDemandCount },
                { label: "Match", value: matchedCount, highlight: true },
                { label: "Common", value: commonCount },
                { label: "Role", value: roleSpecificCount },
              ]}
              emptyLabel="No demand signals listed for this role yet"
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            The highlighted bar is the high-demand skills your profile already matches.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card/60 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            High-demand coverage
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your recorded skills against this role&apos;s high-demand list
          </p>
          <div className="mt-4">
            <Donut
              segments={[
                { label: "Matched", value: matchedCount, color: "var(--primary)" },
                { label: "Missing", value: gapCount, color: "oklch(1 0 0 / 18%)" },
              ]}
              centerLabel={
                highDemandCount > 0 ? `${matchedCount}/${highDemandCount}` : "—"
              }
              centerSub="high-demand skills covered"
              emptyLabel="No high-demand skills listed for this role yet"
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Coverage is a count of matched skills, not a hiring probability.
          </p>
        </div>

        <GlowCard className="flex flex-col">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              What the signals say
            </p>
          </div>
          {signals.length > 0 ? (
            <ul className="mt-4 flex-1 space-y-3">
              {signals.map((signal) => (
                <li key={signal} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {signal}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
              No market signals in this report yet. Refresh the report to pull the latest
              research pass.
            </p>
          )}
          <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
            Drawn from your market report&apos;s signals · researched {researchedLabel} ·
            no new AI call.
          </p>
        </GlowCard>
      </div>

      {/* Heatmap: real posting dates from the verified ATS boards */}
      <div className="rounded-xl border border-border bg-card/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Posting activity
            </p>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Postings published or updated per weekday over the last 6 weeks, from the
              verified boards of GitLab, Airbnb, Motive, Spotify, Linear and Ashby.
              Board-wide activity, not filtered to your role.
            </p>
          </div>
          <Activity className="h-4 w-4 text-primary" />
        </div>
        <div className="mt-4">
          <HeatmapGrid
            weeks={heatmap?.weeks ?? []}
            emptyLabel={
              heatmapLoading
                ? "Loading live postings…"
                : "Live postings unavailable — the verified job boards could not be reached."
            }
          />
        </div>
        {heatmap ? (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Fetched {formatFetchedAt(heatmap.fetchedAt)} · {heatmap.datedPostings} of{" "}
            {heatmap.totalPostings} postings carry a publish date
            {heatmap.boardsFailed > 0
              ? ` · ${heatmap.boardsFailed} of ${heatmap.boardsChecked} boards unreachable`
              : ""}
            .
          </p>
        ) : null}
      </div>
    </section>
  );
}
