import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  ExternalLink,
  Flashlight as FlashlightIcon,
  RefreshCw,
} from "lucide-react";

import { MagneticButton } from "@/components/lens/MagneticButton";
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import { useJobAnalysis } from "@/data/job-intel";
import { cn } from "@/lib/utils";

/**
 * The Market Mirror, Round 3 (Cursor as Flashlight / Lens).
 *
 * Replaces the Direction 3 koi pond entirely. Every node in the
 * constellation is ONE REAL job posting from the student's stored job
 * research (Tavily search + company ATS boards, persisted by
 * `refreshJobMarket` and read through `useStoredJobsWithCoverage`).
 * Nothing here is invented: no fake jobs, counts, salaries, or
 * probabilities.
 *
 * - The field is dark. A flashlight follows the pointer and lights the
 *   nodes near it; a lit node shows its posting. Tap or click a node to
 *   focus it and read the real gap analysis for that posting
 *   (`useJobAnalysis`, deterministic coverage of the posting's extracted
 *   requirements by the student's saved evidence). The field runs its
 *   own travelling light rather than worker 1's <Flashlight>: the nodes
 *   are buttons that must stay visible and clickable, and Flashlight
 *   dims its children and reveals a second content layer instead.
 * - Lime nodes meet the 70% coverage bar (the same bar as the Flight
 *   Plan's SavedPostings badges). Hollow nodes are "not measured yet":
 *   coverage is null, never a default.
 * - The skill strip below reveals which skills are in demand, with real
 *   counts from the stored postings: how many stored posting titles name
 *   each skill. Counts are labelled exactly as title mentions; they are
 *   not requirement-level counts (the stored-requirements aggregation
 *   endpoint is not exposed to the client yet).
 * - With prefers-reduced-motion the parallax and the travelling light
 *   stay still and every node label and count is reachable by keyboard
 *   focus or tap. Nothing is hidden behind a cursor-only interaction:
 *   nodes are buttons, and "Show all counts" reveals the whole strip.
 */

/** One real posting, shaped for the mirror. Built in market.tsx. */
export type LensPosting = {
  id: string;
  title: string;
  company: string | null;
  /** "City, Country", "Remote"/"Hybrid"/"On-site", or null when unlisted. */
  location: string | null;
  url: string | null;
  /** ISO timestamp the posting was saved by job research. */
  retrievedAt: string;
  sourceName: string | null;
  /** Null = coverage not measured yet. Never an invented default. */
  coveragePct: number | null;
  matched: boolean;
};

interface MarketLensProps {
  /** Real postings, newest first. The mirror shows at most MAX_NODES. */
  postings: LensPosting[];
  isLoading: boolean;
  targetRole: string;
  /** The page's existing refresh action (re-runs market research, which stores new postings). */
  onRefresh: () => void;
  refreshPending: boolean;
  /** "Review my resume" action (navigates to /resume). */
  onDropResume: () => void;
  /** Researched high-demand skills for the target role (real market research). */
  highDemandSkills: string[];
  /** High-demand skills the student's recorded skills already cover. */
  matchedSkills: string[];
  /** High-demand skills the student does not have yet. */
  missingSkills: string[];
}

const MAX_NODES = 10;

/* ------------------------------------------------------------------ */
/* Deterministic layout from the posting id (stable across renders)    */
/* ------------------------------------------------------------------ */

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

type NodeLayout = {
  left: string;
  top: string;
  size: number;
  depth: number;
  labelBelow: boolean;
};

function layoutFor(posting: LensPosting, index: number): NodeLayout {
  const hash = hashString(posting.id);
  const pick = (n: number) => (hash >> (n * 3)) % 8;
  // Spread nodes across the field; the index term keeps nodes with
  // similar hashes from stacking on each other.
  const leftPct = 6 + pick(0) * 9 + (index % 4) * 2.5;
  const topPct = 12 + pick(1) * 8 + (index % 3) * 5;
  return {
    left: `${Math.min(leftPct, 88)}%`,
    top: `${Math.min(topPct, 80)}%`,
    size: 12 + pick(2),
    depth: 0.5 + pick(3) * 0.2,
    labelBelow: topPct < 30,
  };
}

/* Deterministic starfield: seeded positions, no images. */
function starfield(count: number) {
  const stars: Array<{ left: string; top: string; size: number; opacity: number }> = [];
  let seed = 42;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) | 0;
    return Math.abs(seed) / 2147483647;
  };
  for (let i = 0; i < count; i++) {
    stars.push({
      left: `${(next() * 100).toFixed(1)}%`,
      top: `${(next() * 100).toFixed(1)}%`,
      size: next() > 0.85 ? 2 : 1,
      opacity: 0.25 + next() * 0.5,
    });
  }
  return stars;
}

const STARS = starfield(48);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Real count: stored postings whose title names this skill. */
function titleMentions(skill: string, postings: LensPosting[]): number {
  const needle = skill.toLowerCase();
  return postings.filter((posting) => posting.title.toLowerCase().includes(needle)).length;
}

function formatRetrievedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date unknown";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/* Focused posting: real gap analysis                                  */
/* ------------------------------------------------------------------ */

function PostingDetail({ posting }: { posting: LensPosting }) {
  const { data: analysis, isLoading, error } = useJobAnalysis(posting.id);
  const coverage = analysis?.report.coverage;
  const proven = coverage
    ? coverage.classifications.filter(
        (c) => c.level === "PROVEN" || c.level === "PARTIALLY_PROVEN",
      )
    : [];
  const missing = coverage
    ? coverage.classifications.filter((c) => c.level === "MISSING")
    : [];

  return (
    <SpotlightCard className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="cp-eyebrow">Under the light</p>
          <h3 className="mt-2 font-display text-xl font-bold leading-tight text-cp-paper sm:text-2xl">
            {posting.title}
          </h3>
          <p className="mt-1 text-[13px] text-cp-stone">
            {[posting.company, posting.location].filter(Boolean).join(" · ") || "Company not listed"}
          </p>
          <p className="mt-1 font-mono text-[11px] text-cp-stone/70">
            Saved {formatRetrievedAt(posting.retrievedAt)}
            {posting.sourceName ? ` · via ${posting.sourceName}` : ""}
          </p>
        </div>
        {posting.url ? (
          <a
            href={posting.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-[12px] font-bold text-cp-paper transition-colors hover:border-cp-lime/50 hover:text-cp-lime"
          >
            View posting <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {posting.coveragePct !== null ? (
          <>
            <span className="rounded-full bg-cp-lime px-3 py-1 font-mono text-[12px] font-bold text-cp-ink">
              {posting.coveragePct}% covered
            </span>
            <span className="text-[12px] text-cp-stone">
              {posting.matched
                ? "Meets the 70% bar: your saved evidence covers most of what this posting asks for."
                : "Below the 70% bar: this posting asks for more than your saved evidence shows."}
            </span>
          </>
        ) : (
          <span className="rounded-full border border-white/15 px-3 py-1 font-mono text-[12px] font-bold text-cp-stone">
            Coverage not measured yet
          </span>
        )}
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        {isLoading ? (
          <p className="text-[13px] text-cp-stone">Reading this posting&apos;s requirements…</p>
        ) : error ? (
          <p className="text-[13px] text-cp-ember">
            The gap analysis couldn&apos;t be loaded:{" "}
            {error instanceof Error ? error.message : "something went wrong."}
          </p>
        ) : coverage ? (
          coverage.total === 0 ? (
            <p className="text-[13px] leading-relaxed text-cp-stone">
              This posting has no extracted requirements yet, so there is nothing to measure your
              evidence against. The posting itself is real; its requirements were not pulled into
              structured form.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-cp-lime">
                  <Check className="h-4 w-4" /> You can show ({proven.length} of {coverage.total})
                </p>
                {proven.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {proven.map((item) => (
                      <span
                        key={item.skill}
                        className="rounded-lg border border-cp-lime/25 bg-cp-lime/10 px-2.5 py-1 text-[12px] font-semibold text-cp-paper"
                      >
                        {item.skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[12.5px] text-cp-stone">
                    None of this posting&apos;s requirements are backed by your saved evidence yet.
                  </p>
                )}
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-cp-ember">
                  <AlertTriangle className="h-4 w-4" /> Missing ({missing.length})
                </p>
                {missing.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {missing.map((item) => (
                      <span
                        key={item.skill}
                        className="rounded-lg border border-cp-ember/30 bg-cp-ember/10 px-2.5 py-1 text-[12px] font-semibold text-cp-paper"
                      >
                        {item.skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[12.5px] text-cp-stone">
                    No missing requirements found for this posting.
                  </p>
                )}
                {coverage.criticalGaps.length > 0 && (
                  <p className="mt-3 text-[12px] leading-relaxed text-cp-stone">
                    {coverage.criticalGaps.length} must-have{" "}
                    {coverage.criticalGaps.length === 1 ? "requirement is" : "requirements are"}{" "}
                    missing. Those are the first gaps to close for this posting.
                  </p>
                )}
              </div>
            </div>
          )
        ) : null}
      </div>
    </SpotlightCard>
  );
}

/* ------------------------------------------------------------------ */
/* Skill demand strip: real counts from stored postings                */
/* ------------------------------------------------------------------ */

function SkillDemandStrip({
  postings,
  highDemandSkills,
  matchedSkills,
  missingSkills,
  targetRole,
}: {
  postings: LensPosting[];
  highDemandSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  targetRole: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const [openSkill, setOpenSkill] = useState<string | null>(null);
  const total = postings.length;

  if (highDemandSkills.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="cp-eyebrow">Skills in demand</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-cp-stone">
          No demand signals researched for {targetRole} yet, so there is nothing to count. Refresh
          the market to research what employers ask for.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="cp-eyebrow">What the light finds</p>
          <h3 className="mt-2 font-display text-lg font-bold text-cp-paper">
            Skills in demand for {targetRole}
          </h3>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-cp-stone">
            {total === 0 ? (
              <>
                Researched demand for this role. Counts appear once postings are stored, each one
                counted from real posting titles.
              </>
            ) : (
              <>
                Researched demand for this role, counted against your stored postings. Hover,
                focus, or tap a skill to see how many of your {total} stored posting{" "}
                {total === 1 ? "title names" : "titles name"} it, and whether your profile covers
                it.
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          aria-expanded={showAll}
          className="shrink-0 rounded-xl border border-white/15 px-3 py-2 text-[12px] font-bold text-cp-paper transition-colors hover:border-cp-lime/50 hover:text-cp-lime"
        >
          {showAll ? "Hide counts" : "Show all counts"}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {highDemandSkills.map((skill) => {
          const count = titleMentions(skill, postings);
          const hasIt = matchedSkills.includes(skill);
          const missing = missingSkills.includes(skill);
          const open = showAll || openSkill === skill;
          return (
            <button
              key={skill}
              type="button"
              onClick={() => setOpenSkill((current) => (current === skill ? null : skill))}
              onMouseEnter={() => setOpenSkill(skill)}
              onMouseLeave={() => setOpenSkill((current) => (current === skill ? null : current))}
              onFocus={() => setOpenSkill(skill)}
              onBlur={() => setOpenSkill((current) => (current === skill ? null : current))}
              aria-expanded={open}
              className={cn(
                "group rounded-xl border px-3 py-2 text-left transition-all",
                open
                  ? "border-cp-lime/50 bg-cp-lime/10"
                  : "border-white/10 bg-white/[0.02] opacity-60 hover:opacity-100",
              )}
            >
              <span className="flex items-center gap-2 text-[13px] font-bold text-cp-paper">
                {skill}
                {hasIt && (
                  <span className="rounded-full bg-cp-lime px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wide text-cp-ink">
                    You have it
                  </span>
                )}
                {missing && (
                  <span className="rounded-full bg-cp-ember px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wide text-cp-ink">
                    Missing
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "mt-0.5 block font-mono text-[11px] text-cp-stone transition-opacity",
                  open ? "opacity-100" : "opacity-0",
                )}
              >
                {total === 0
                  ? "no stored postings to count yet"
                  : count > 0
                    ? `in ${count} of ${total} posting ${total === 1 ? "title" : "titles"}`
                    : "not named in any stored posting title"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The mirror                                                          */
/* ------------------------------------------------------------------ */

export function MarketLens({
  postings,
  isLoading,
  targetRole,
  onRefresh,
  refreshPending,
  onDropResume,
  highDemandSkills,
  matchedSkills,
  missingSkills,
}: MarketLensProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [lightOn, setLightOn] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const nodes = useMemo(
    () => postings.slice(0, MAX_NODES).map((posting, index) => ({ posting, layout: layoutFor(posting, index) })),
    [postings],
  );
  const focused = nodes.find((node) => node.posting.id === focusedId)?.posting ?? null;

  // The focused posting must stay in the visible set; if the list
  // refreshes under us, drop the focus rather than showing a stale card.
  useEffect(() => {
    if (focusedId && !postings.some((posting) => posting.id === focusedId)) setFocusedId(null);
  }, [postings, focusedId]);

  function updatePointer(clientX: number, clientY: number) {
    const el = fieldRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPointer({
      x: Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100)),
    });
  }

  function isLit(layout: NodeLayout): boolean {
    if (!pointer || reducedMotion) return false;
    const left = parseFloat(layout.left);
    const top = parseFloat(layout.top);
    return Math.abs(pointer.x - left) < 15 && Math.abs(pointer.y - top) < 24;
  }

  const matchedCount = postings.filter((posting) => posting.matched).length;
  const unmeasuredCount = postings.filter((posting) => posting.coveragePct === null).length;

  return (
    <section aria-label="Market mirror" className="overflow-hidden rounded-3xl border border-white/10 bg-cp-ink">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0">
          <p className="cp-eyebrow flex items-center gap-2">
            <FlashlightIcon className="h-3.5 w-3.5 text-cp-lime" /> Market mirror · {targetRole}
          </p>
          <h2 className="editorial-title mt-3 font-display text-[34px] text-cp-paper sm:text-[44px]">
            Follow the light
          </h2>
          <p className="mt-2 font-serif text-[17px] italic leading-snug text-cp-stone">
            The market, revealed one posting at a time.
          </p>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-cp-stone">
            {isLoading
              ? "Loading your stored postings…"
              : postings.length === 0
                ? "No stored postings yet. Refresh the market to pull real postings for this role."
                : `${postings.length} real ${postings.length === 1 ? "posting" : "postings"} from your saved research. Point the light at a node to see it; tap one to read what it asks for and what you are missing.`}
          </p>
          {postings.length > 0 && (
            <p className="mt-2 font-mono text-[11px] text-cp-stone/70">
              {matchedCount} meet the 70% bar · {unmeasuredCount} not measured yet
              {postings.length > MAX_NODES ? ` · showing ${MAX_NODES} newest` : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDropResume}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2.5 text-[12.5px] font-bold text-cp-paper transition-colors hover:border-cp-lime/50 hover:text-cp-lime"
          >
            Review my resume <ArrowUpRight className="h-4 w-4" />
          </button>
          <MagneticButton
            onClick={() => {
              if (!refreshPending) onRefresh();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-cp-lime px-4 py-2.5 text-[12.5px] font-bold text-cp-ink"
          >
            <RefreshCw className={cn("h-4 w-4", refreshPending && "animate-spin")} />
            {refreshPending ? "Refreshing…" : "Refresh market"}
          </MagneticButton>
        </div>
      </div>

      {/* Constellation field */}
      {isLoading ? (
        <div className="mx-5 mb-5 h-[340px] animate-pulse rounded-2xl bg-white/[0.04] sm:mx-6 sm:mb-6 sm:h-[400px]" />
      ) : postings.length === 0 ? (
        <div className="mx-5 mb-5 rounded-2xl border border-dashed border-white/15 p-8 text-center sm:mx-6 sm:mb-6 sm:p-12">
          <FlashlightIcon className="mx-auto h-8 w-8 text-cp-stone/50" />
          <h3 className="mt-3 font-display text-lg font-bold text-cp-paper">
            No stored postings yet
          </h3>
          <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-cp-stone">
            The mirror is empty because no real postings have been saved for {targetRole} yet.
            Refresh the market to pull live postings. Nothing here is invented.
          </p>
          <div className="mt-5 flex justify-center">
            <MagneticButton
              maxPull={22}
              onClick={() => {
                if (!refreshPending) onRefresh();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-cp-lime px-5 py-2.5 text-[12.5px] font-bold text-cp-ink"
            >
              <RefreshCw className={cn("h-4 w-4", refreshPending && "animate-spin")} />
              {refreshPending ? "Refreshing…" : "Refresh market"}
            </MagneticButton>
          </div>
        </div>
      ) : (
        <div className="mx-5 mb-5 sm:mx-6 sm:mb-6">
          <div
            ref={fieldRef}
            role="group"
            aria-label={`Constellation of ${nodes.length} stored postings for ${targetRole}`}
            onPointerMove={(event) => {
              if (reducedMotion) return;
              updatePointer(event.clientX, event.clientY);
              setLightOn(true);
            }}
            onPointerDown={(event) => {
              if (reducedMotion) return;
              updatePointer(event.clientX, event.clientY);
              setLightOn(true);
            }}
            onPointerLeave={() => setLightOn(false)}
            className="relative h-[340px] touch-pan-y overflow-hidden rounded-2xl border border-white/10 bg-[#070706] sm:h-[400px]"
          >
            {/* Starfield (parallax layer, drifts against the pointer). */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 transition-transform duration-300 ease-out"
              style={
                pointer && !reducedMotion
                  ? { transform: `translate(${(pointer.x - 50) * -0.16}px, ${(pointer.y - 50) * -0.12}px)` }
                  : undefined
              }
            >
              {STARS.map((star, index) => (
                <span
                  key={index}
                  className="absolute rounded-full bg-cp-paper"
                  style={{
                    left: star.left,
                    top: star.top,
                    width: star.size,
                    height: star.size,
                    opacity: star.opacity,
                  }}
                />
              ))}
            </div>

            {/* Flashlight glow. */}
            {pointer && lightOn && !reducedMotion && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left,top] duration-150 ease-out"
                style={{
                  left: `${pointer.x}%`,
                  top: `${pointer.y}%`,
                  background:
                    "radial-gradient(circle, color-mix(in srgb, var(--cp-lime) 24%, transparent) 0%, color-mix(in srgb, var(--cp-lime) 10%, transparent) 42%, transparent 72%)",
                }}
              />
            )}

            {/* Posting nodes (parallax layer, drifts with the pointer). */}
            <div
              className="absolute inset-0 transition-transform duration-300 ease-out"
              style={
                pointer && !reducedMotion
                  ? { transform: `translate(${(pointer.x - 50) * 0.22}px, ${(pointer.y - 50) * 0.16}px)` }
                  : undefined
              }
            >
              {nodes.map(({ posting, layout }) => {
                const lit = isLit(layout) || focusedId === posting.id;
                return (
                  <div
                    key={posting.id}
                    className="absolute"
                    style={{ left: layout.left, top: layout.top }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setFocusedId((current) => (current === posting.id ? null : posting.id))
                      }
                      aria-label={`${posting.title}${posting.company ? ` at ${posting.company}` : ""}${posting.coveragePct !== null ? `, ${posting.coveragePct}% covered` : ", coverage not measured yet"}`}
                      aria-pressed={focusedId === posting.id}
                      className={cn(
                        "relative block rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cp-lime",
                        posting.matched
                          ? "bg-cp-lime shadow-[0_0_18px_2px_color-mix(in_srgb,var(--cp-lime)_55%,transparent)]"
                          : posting.coveragePct === null
                            ? "border-2 border-dashed border-cp-stone/60 bg-transparent"
                            : "bg-cp-stone/80",
                        lit ? "scale-125" : "scale-100",
                      )}
                      style={{ width: layout.size, height: layout.size }}
                    />
                    {/* Label: appears when the light is on the node, or it is focused. */}
                    <div
                      className={cn(
                        "pointer-events-none absolute left-1/2 z-10 w-44 -translate-x-1/2 rounded-xl border border-white/10 bg-cp-panel/95 px-3 py-2 shadow-lift backdrop-blur transition-opacity duration-200",
                        layout.labelBelow ? "top-[calc(100%+10px)]" : "bottom-[calc(100%+10px)]",
                        lit ? "opacity-100" : "opacity-0",
                      )}
                    >
                      <p className="truncate text-[12px] font-bold leading-tight text-cp-paper">
                        {posting.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-cp-stone">
                        {[posting.company, posting.location].filter(Boolean).join(" · ") ||
                          "Details not listed"}
                      </p>
                      <p className="mt-1 font-mono text-[10.5px] font-bold text-cp-lime">
                        {posting.coveragePct !== null
                          ? `${posting.coveragePct}% covered`
                          : "Not measured yet"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="pointer-events-none absolute bottom-3 left-1/2 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 truncate rounded-full border border-white/10 bg-cp-ink/80 px-3 py-1 text-center font-mono text-[10.5px] text-cp-stone backdrop-blur">
              {focused
                ? "Tap the node again to close its read-out"
                : "Move the light over a node, or tap one, to read the posting"}
            </p>
          </div>
        </div>
      )}

      {/* Focused posting read-out */}
      {focused && (
        <div key={focused.id} className="animate-blur-in mx-5 mb-5 sm:mx-6 sm:mb-6">
          <PostingDetail posting={focused} />
        </div>
      )}

      {/* Skill demand reveal */}
      <div className="mx-5 mb-5 sm:mx-6 sm:mb-6">
        <SkillDemandStrip
          postings={postings}
          highDemandSkills={highDemandSkills}
          matchedSkills={matchedSkills}
          missingSkills={missingSkills}
          targetRole={targetRole}
        />
      </div>
    </section>
  );
}
