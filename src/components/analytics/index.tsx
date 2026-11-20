import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Direction 2 shared chart kit — dependency-free SVG + Tailwind, styled
 * against the dark design tokens. Every component degrades honestly: pass
 * no data and you get an empty state, never invented numbers.
 */

/* ------------------------------------------------------------------ */
/* KPI stat — big white numeral, small uppercase label (Pulse strip)   */
/* ------------------------------------------------------------------ */

export function KpiStat({
  label,
  value,
  sub,
  highlight = false,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/60 px-4 py-4",
        highlight && "glow-card bg-card",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        {icon ? <span className="text-primary">{icon}</span> : null}
      </div>
      <p className="numeral mt-2 text-3xl leading-none sm:text-4xl">{value}</p>
      {sub ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ring — single progress ring with a centred label (Mindzy pattern)   */
/* ------------------------------------------------------------------ */

export function Ring({
  value,
  size = 120,
  stroke = 10,
  label,
  sublabel,
  className,
}: {
  /** 0–100, from real state only. */
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  sublabel?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${Math.round(clamped)}%`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out"
          style={{ filter: "drop-shadow(0 0 6px oklch(0.65 0.18 295 / 60%))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="numeral text-xl leading-none sm:text-2xl">{label}</span>
        {sublabel ? (
          <span className="mt-1 max-w-[80%] text-[11px] leading-tight text-muted-foreground">
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Donut — segmented donut (e.g. matched vs missing skills)            */
/* ------------------------------------------------------------------ */

export type DonutSegment = {
  label: string;
  value: number;
  /** CSS colour, e.g. "var(--primary)". */
  color: string;
};

export function Donut({
  segments,
  size = 160,
  thickness = 18,
  centerLabel,
  centerSub,
  emptyLabel = "No data yet",
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel: string;
  centerSub?: string;
  emptyLabel?: string;
}) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={centerLabel}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            className="stroke-white/10"
          />
          {total > 0 &&
            segments.map((seg) => {
              const frac = Math.max(0, seg.value) / total;
              const dash = frac * circumference;
              const gap = frac > 0 && frac < 1 ? 2 : 0;
              const el = (
                <circle
                  key={seg.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={thickness}
                  strokeDasharray={`${Math.max(0, dash - gap)} ${circumference - Math.max(0, dash - gap)}`}
                  strokeDashoffset={-acc * circumference}
                  style={{ stroke: seg.color }}
                />
              );
              acc += frac;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="numeral text-2xl leading-none">{total > 0 ? centerLabel : "—"}</span>
          {centerSub ? (
            <span className="mt-1 max-w-[70%] text-[11px] leading-tight text-muted-foreground">
              {total > 0 ? centerSub : emptyLabel}
            </span>
          ) : null}
        </div>
      </div>
      {total > 0 ? (
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {segments.map((seg) => (
            <li key={seg.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="inline-block h-2.5 w-2.5 rounded-[3px]"
                style={{ backgroundColor: seg.color }}
                aria-hidden="true"
              />
              {seg.label} · {seg.value}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MiniBars — vertical bars, one highlighted (Pulse pattern)           */
/* ------------------------------------------------------------------ */

export type MiniBar = {
  label: string;
  value: number;
  highlight?: boolean;
};

export function MiniBars({
  bars,
  height = 120,
  emptyLabel = "No data yet",
}: {
  bars: MiniBar[];
  height?: number;
  emptyLabel?: string;
}) {
  const max = Math.max(0, ...bars.map((b) => b.value));
  if (bars.length === 0 || max === 0) {
    return (
      <p className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        {emptyLabel}
      </p>
    );
  }
  return (
    <div
      className="flex items-end gap-2 sm:gap-3"
      style={{ height }}
      role="img"
      aria-label={bars.map((b) => `${b.label}: ${b.value}`).join(", ")}
    >
      {bars.map((bar) => (
        <div key={bar.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className="numeral text-sm leading-none">{bar.value}</span>
          <div
            className={cn(
              "w-full max-w-10 rounded-t-md transition-[height] duration-500",
              bar.highlight
                ? "bg-gradient-to-t from-violet-deep to-primary shadow-[0_0_18px_-2px_oklch(0.65_0.18_295/70%)]"
                : "bg-white/12",
            )}
            style={{ height: `${Math.max(6, (bar.value / max) * 72)}%` }}
          />
          <span className="w-full truncate text-center text-[11px] leading-tight text-muted-foreground">
            {bar.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HeatmapGrid — weekday × week intensity grid (Pulse pattern)         */
/* Rows are weekdays (Mon–Sun), columns are weeks. Values are real     */
/* counts; a zero everywhere renders the honest empty state.           */
/* ------------------------------------------------------------------ */

export const HEATMAP_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function HeatmapGrid({
  weeks,
  emptyLabel = "No posting activity recorded yet",
}: {
  /** One entry per week; `days` is 7 counts, Mon–Sun. */
  weeks: { label: string; days: number[] }[];
  emptyLabel?: string;
}) {
  const max = Math.max(0, ...weeks.flatMap((w) => w.days));
  if (weeks.length === 0 || max === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div>
      <div className="flex gap-1.5" role="img" aria-label={`Posting activity heatmap, busiest day ${max} postings`}>
        <div className="flex flex-col gap-1.5 pr-1">
          {HEATMAP_DAYS.map((d) => (
            <span
              key={d}
              className="flex h-5 items-center text-[10px] font-medium text-muted-foreground"
            >
              {d}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week.label} className="flex flex-1 flex-col gap-1.5">
            {week.days.map((value, i) => {
              const intensity = value / max;
              return (
                <div
                  key={`${week.label}-${i}`}
                  title={`${HEATMAP_DAYS[i]} · ${week.label}: ${value} postings`}
                  className="h-5 w-full rounded-[4px]"
                  style={{
                    backgroundColor:
                      value === 0
                        ? "oklch(1 0 0 / 6%)"
                        : `oklch(0.65 0.18 295 / ${0.18 + 0.82 * intensity})`,
                    boxShadow:
                      intensity > 0.75
                        ? "0 0 10px -2px oklch(0.65 0.18 295 / 80%)"
                        : undefined,
                  }}
                />
              );
            })}
            <span className="truncate text-center text-[10px] text-muted-foreground">{week.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        <span>Less</span>
        {[0.15, 0.4, 0.65, 0.9].map((o) => (
          <span
            key={o}
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{ backgroundColor: `oklch(0.65 0.18 295 / ${o})` }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* GlowCard — the one hero card per screen                             */
/* ------------------------------------------------------------------ */

export function GlowCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("glow-card p-5 sm:p-6", className)}>{children}</div>;
}
