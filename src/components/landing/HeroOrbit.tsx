import {
  useEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getStoredJobsWithCoverage } from "@/lib/job-intel.functions";
import { useLatestAnalysis, useLatestResume } from "@/data/resume";
import { Flashlight, Lens, usePrefersReducedMotion } from "@/components/lens";
import {
  bandLabel,
  topSkillsByMentions,
  type HeroOrbitData,
} from "./hero-orbit-data";
import "./hero-orbit.css";

/**
 * Right-side hero composition (Round 3, Direction 2, Cursor as
 * Flashlight / Lens). Amina, 20 Nov 21:07 PKT: the build is approved,
 * but the hero's right side needs animation: at rest the right ~40%
 * of the desktop hero is empty dark space.
 *
 * The composition is an orbiting constellation of the student's own
 * detected skills, counted against their stored postings, plus three
 * drifting glass chips (resume band, top gap, stored postings). It
 * moves on its own at idle (slow orbit, gentle drift), reacts to the
 * cursor (parallax at four depths, the light disc falls on it, the
 * flashlight lights its detail), and uses real data only: skill
 * counts are title mentions in stored postings, exactly like the
 * Market Mirror. With no data it shows the honest empty state and
 * still moves; it never invents a count.
 *
 * Motion systems, all reused from the lens engine, none rebuilt:
 * - Lens: the composition has its own Lens instance (the hero already
 *   has two), so the light disc falls on nodes and chips.
 * - Flashlight: dimChildren={false}, so the composition stays fully
 *   visible at rest and the light only adds the detail layer (counts
 *   with denominators, sources, the ATS score with its disclaimer).
 *   hideToggle, because the flashlight sits inside a Lens, whose
 *   children must be static (no interactive elements to duplicate).
 *   Touch users still get the light by tapping; the lit detail is
 *   provenance, never the only copy of a fact.
 * - Parallax: pointer position over the whole hero section, layers
 *   shifting at different depths (MarketLens pattern: pointer state
 *   plus a CSS transition, no extra spring). Depths, cursor-feel pass
 *   (20 Nov 2026): stars 8, ring and nodes 16, hub 12, chips 26, so
 *   the layers visibly separate as the cursor moves.
 * - prefers-reduced-motion: the component branches to a static
 *   full-detail scene (no Lens, no Flashlight); the CSS also kills
 *   the keyframes.
 *
 * Layout: the box is 340x400, absolutely positioned in the hero's
 * empty right side (lg+ only; below lg the mobile strip below the
 * headline carries the same signals). The headline keeps its full
 * width: the composition floats in the space the headline does not
 * reach, and never overlaps it (verified in proof at 1024 and 1280).
 * The box carries z-10: the headline's Lens box is full-width, so
 * without it the headline (not the composition) receives the pointer
 * over the top of the composition, the composition's lens never
 * activates, and the headline light shows a soft pool over the
 * empty right end of its row. With z-10 the composition is the hit
 * target over its own box; the headline text itself ends well left of
 * the box, so nothing the user reads is ever covered.
 */

const MONO_FONT =
  "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

/**
 * Live data for the composition. Stored postings are fetched only
 * when a session exists, so anonymous visitors never hit the authed
 * server function; the resume hooks are RLS-safe and return null for
 * them. The hook is called once in HeroLens and the data passed down
 * to both the desktop composition and the mobile strip.
 */
export function useHeroOrbitData(): HeroOrbitData {
  const sessionQuery = useQuery({
    queryKey: ["hero-orbit", "session"],
    queryFn: async () =>
      (await supabase.auth.getSession()).data.session?.user.id ?? null,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const userId = sessionQuery.data ?? null;

  const jobsQuery = useQuery({
    // Same key as the shared hook (data/job-intel), so the cache is
    // shared with the Market Mirror.
    queryKey: ["job-intel", "stored-jobs", "with-coverage"],
    queryFn: () => getStoredJobsWithCoverage(),
    enabled: userId !== null,
    staleTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: resume, isLoading: resumeLoading } = useLatestResume();
  const { data: analysis, isLoading: analysisLoading } = useLatestAnalysis(
    resume?.id,
  );

  const jobs = jobsQuery.data ?? [];
  const titles = jobs.map((job) => job.title);
  const skills = topSkillsByMentions(analysis?.detected_skills ?? [], titles, 6);
  const band = analysis ? bandLabel(analysis.ats_score) : null;

  return {
    skills,
    totalPostings: jobs.length,
    newestRetrievedAt: jobs[0]?.retrievedAt ?? null,
    resumeBand: band,
    atsScore: analysis ? analysis.ats_score : null,
    topGap: analysis?.weaknesses[0] ?? null,
    gapCount: analysis?.weaknesses.length ?? 0,
    hasResume: analysis !== null && analysis !== undefined,
    hasPostings: jobs.length > 0,
    isLoading:
      sessionQuery.isLoading ||
      jobsQuery.isLoading ||
      resumeLoading ||
      analysisLoading,
  };
}

/* ------------------------------------------------------------------ */
/* Parallax (MarketLens pattern: pointer state + CSS transition)       */
/* ------------------------------------------------------------------ */

type PointerPct = { x: number; y: number } | null;

function useHeroParallax(
  heroRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): PointerPct {
  const [pointer, setPointer] = useState<PointerPct>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = heroRef.current;
    if (!el) return;
    const update = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      setPointer({
        x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
        y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
      });
    };
    const onMove = (event: PointerEvent) => update(event.clientX, event.clientY);
    const onDown = (event: PointerEvent) => update(event.clientX, event.clientY);
    const onLeave = () => setPointer(null);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [heroRef, enabled]);

  return pointer;
}

function parallaxStyle(pointer: PointerPct, depth: number): CSSProperties {
  if (!pointer) return {};
  return {
    transform: `translate3d(${((pointer.x - 0.5) * 2 * depth).toFixed(1)}px, ${((pointer.y - 0.5) * 2 * depth).toFixed(1)}px, 0)`,
  };
}

const PARALLAX_TRANSITION = "transform 0.3s ease-out";

/* ------------------------------------------------------------------ */
/* Starfield (deterministic, seeded; no images)                        */
/* ------------------------------------------------------------------ */

function starfield(count: number) {
  const stars: Array<{ left: string; top: string; size: number; opacity: number }> = [];
  let seed = 17;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) | 0;
    return Math.abs(seed) / 2147483647;
  };
  for (let i = 0; i < count; i++) {
    stars.push({
      left: `${(next() * 100).toFixed(1)}%`,
      top: `${(next() * 100).toFixed(1)}%`,
      size: next() > 0.85 ? 2 : 1,
      opacity: 0.2 + next() * 0.45,
    });
  }
  return stars;
}

const STARS = starfield(26);

/* ------------------------------------------------------------------ */
/* The scene (rendered twice: dimmed base and lit detail)              */
/* ------------------------------------------------------------------ */

const NODE_ANGLES = [-90, -30, 30, 90, 150, 210];
const RING_RADIUS = 130;

function formatRetrievedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date unknown";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Chip({
  label,
  value,
  line,
  detailLine,
  detail,
  className,
  driftClass,
  style,
}: {
  label: string;
  value: string;
  line: string;
  detailLine: string;
  detail: boolean;
  className?: string;
  driftClass: string;
  style: CSSProperties;
}) {
  return (
    <div
      className={`${driftClass} absolute rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 backdrop-blur ${className ?? ""}`}
      style={style}
    >
      <p
        style={{
          fontFamily: MONO_FONT,
          fontSize: "9px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--cp-lime, #e1f10d)",
        }}
      >
        {label}
      </p>
      <p className="mt-1 text-[12.5px] font-bold leading-tight text-[var(--cp-paper,#f4f1ea)]">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-[var(--cp-stone,#c6c5bf)]">
        {line}
      </p>
      {/* The detail line is always laid out, hidden in the base layer,
          so the base and lit layers align exactly. */}
      <p
        className="mt-1 text-[10px] leading-snug text-[var(--cp-stone,#c6c5bf)]"
        style={{
          fontFamily: MONO_FONT,
          visibility: detail ? "visible" : "hidden",
        }}
      >
        {detailLine}
      </p>
    </div>
  );
}

function OrbitScene({
  data,
  detail,
  pointer,
  nodesAboveChips = false,
}: {
  data: HeroOrbitData;
  detail: boolean;
  pointer: PointerPct;
  /**
   * Reduced-motion only: the ring is frozen, so nodes that rest behind
   * a glass chip would stay unreadable forever. Raising the nodes layer
   * above the chips keeps every frozen label readable (white on dark
   * glass). The orbit path stays behind the chips; only the nodes rise.
   * In the animated scene the nodes pass behind the chips, which is the
   * depth effect, so this stays false there.
   */
  nodesAboveChips?: boolean;
}) {
  const { skills, totalPostings } = data;
  // Six slots, always: measured skills fill from the top, the rest
  // stay hollow ("not measured yet", the MarketLens convention).
  const slots: Array<{ skill: string; count: number } | null> = Array.from(
    { length: 6 },
    (_, i) => skills[i] ?? null,
  );

  const hubNumber = data.isLoading
    ? "…"
    : totalPostings > 0
      ? String(totalPostings)
      : "—";
  const hubLabel = data.isLoading
    ? "Loading your market…"
    : totalPostings > 0
      ? totalPostings === 1
        ? "stored posting"
        : "stored postings"
      : "No postings stored yet";

  const resumeValue = data.isLoading
    ? "…"
    : (data.resumeBand?.label ?? "Not analysed yet");
  const resumeLine = data.isLoading
    ? "Reading your resume…"
    : (data.resumeBand?.line ?? "Upload your resume to see your band.");
  const resumeDetail =
    data.atsScore !== null
      ? `ATS ${data.atsScore} · format checks, not a hiring chance`
      : "Analysis runs on your latest upload.";

  const gapValue = data.isLoading
    ? "…"
    : (data.topGap ?? "Not measured yet");
  const gapLine = data.isLoading
    ? "Reading your gaps…"
    : data.topGap
      ? "The first gap to close."
      : "Gaps come from your resume analysis.";
  const gapDetail =
    data.gapCount > 0 ? `Gap 1 of ${data.gapCount} recorded.` : "No gaps recorded yet.";

  const postingsValue = data.isLoading
    ? "…"
    : totalPostings > 0
      ? `${totalPostings} stored`
      : "None stored yet";
  const postingsLine = data.isLoading
    ? "Reading your market…"
    : totalPostings > 0
      ? "From your saved research."
      : "Refresh the market to pull live postings.";
  const postingsDetail =
    data.newestRetrievedAt !== null
      ? `Newest saved ${formatRetrievedAt(data.newestRetrievedAt)}.`
      : "Counts come from stored posting titles.";

  return (
    <div className="relative h-full w-full">
      {/* Far layer: starfield. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ ...parallaxStyle(pointer, 8), transition: PARALLAX_TRANSITION }}
      >
        {STARS.map((star, index) => (
          <span
            key={index}
            className="absolute rounded-full bg-[var(--cp-paper,#f4f1ea)]"
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

      {/* Mid layer: the orbit ring (path + inner ring). The nodes live
          in their own layer below so the reduced-motion branch can raise
          them above the chips without lifting the orbit path too. */}
      <div
        className="absolute inset-0"
        style={{ ...parallaxStyle(pointer, 16), transition: PARALLAX_TRANSITION }}
      >
        <div
          className="absolute"
          style={{ left: 40, top: 70, width: 260, height: 260 }}
        >
          {/* Orbit path. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full"
            style={{ border: "1px dashed rgba(198, 197, 191, 0.28)" }}
          />
          {/* Inner decorative ring, turning the other way, slower. */}
          <div
            aria-hidden="true"
            className="cp-orbit-spin-slow-rev absolute rounded-full"
            style={{
              left: 40,
              top: 40,
              width: 180,
              height: 180,
              border: "1px solid rgba(198, 197, 191, 0.12)",
            }}
          >
            <span
              className="absolute rounded-full bg-[var(--cp-lime2,#9bf80d)]"
              style={{ left: "50%", top: -2, width: 4, height: 4 }}
            />
          </div>
        </div>
      </div>

      {/* Nodes layer: the rotating ring with its nodes. Same mid depth
          as the orbit path, so the two stay locked together under
          parallax. */}
      <div
        className="absolute inset-0"
        style={{
          ...parallaxStyle(pointer, 16),
          transition: PARALLAX_TRANSITION,
          zIndex: nodesAboveChips ? 2 : undefined,
        }}
      >
        <div
          className="absolute"
          style={{ left: 40, top: 70, width: 260, height: 260 }}
        >
          <div className="cp-orbit-spin absolute inset-0">
            {slots.map((slot, i) => {
              const angle = NODE_ANGLES[i] ?? 0;
              const measured = slot !== null && totalPostings > 0;
              return (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: "50%",
                    top: "50%",
                    width: 0,
                    height: 0,
                    transform: `rotate(${angle}deg) translateX(${RING_RADIUS}px) rotate(${-angle}deg)`,
                  }}
                >
                  <div
                    className="absolute"
                    style={{ left: 0, top: 0, transform: "translate(-50%, -50%)" }}
                  >
                    <div className="cp-orbit-spin-rev flex w-[76px] flex-col items-center">
                      <span
                        className="block rounded-full"
                        style={
                          measured
                            ? {
                                width: 10,
                                height: 10,
                                background: "var(--cp-lime, #e1f10d)",
                                boxShadow:
                                  "0 0 14px 2px rgba(225, 241, 13, 0.45)",
                              }
                            : {
                                width: 10,
                                height: 10,
                                border: "1.5px dashed rgba(198, 197, 191, 0.55)",
                                background: "transparent",
                              }
                        }
                      />
                      {slot ? (
                        <>
                          <span
                            className="mt-1.5 block max-w-full truncate text-center text-[10px] font-bold leading-tight text-[var(--cp-paper,#f4f1ea)]"
                            style={{ fontFamily: MONO_FONT }}
                          >
                            {slot.skill}
                          </span>
                          <span
                            className="block text-center text-[9px] leading-tight text-[var(--cp-lime,#e1f10d)]"
                            style={{ fontFamily: MONO_FONT }}
                          >
                            {totalPostings > 0
                              ? detail
                                ? `${slot.count}/${totalPostings}`
                                : String(slot.count)
                              : "—"}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hub: the market total, at the ring's centre. */}
      <div
        className="absolute"
        style={{
          left: "calc(50% - 80px)",
          top: "calc(50% - 46px)",
          width: 160,
          ...parallaxStyle(pointer, 12),
          transition: PARALLAX_TRANSITION,
        }}
      >
        <div className="flex flex-col items-center text-center">
          <span className="flex items-center gap-1.5">
            <span
              className="cp-hub-pulse block rounded-full bg-[var(--cp-lime,#e1f10d)]"
              style={{ width: 7, height: 7 }}
            />
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: "9px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--cp-lime, #e1f10d)",
              }}
            >
              Market, live
            </span>
          </span>
          <span
            className="mt-1.5 text-[26px] font-bold leading-none text-[var(--cp-paper,#f4f1ea)]"
            style={{ fontFamily: "var(--font-display, system-ui, sans-serif)" }}
          >
            {hubNumber}
          </span>
          <span
            className="mt-1 block text-[10px] leading-tight text-[var(--cp-stone,#c6c5bf)]"
            style={{ fontFamily: MONO_FONT }}
          >
            {hubLabel}
          </span>
          <span
            className="mt-1 block text-[9px] leading-tight text-[var(--cp-stone,#c6c5bf)]"
            style={{
              fontFamily: MONO_FONT,
              visibility: detail ? "visible" : "hidden",
            }}
          >
            Counts are title mentions in stored postings.
          </span>
        </div>
      </div>

      {/* Near layer: the three drifting glass chips. */}
      <div
        className="absolute inset-0"
        style={{ ...parallaxStyle(pointer, 26), transition: PARALLAX_TRANSITION }}
      >
        <Chip
          label="Resume"
          value={resumeValue}
          line={resumeLine}
          detailLine={resumeDetail}
          detail={detail}
          driftClass="cp-chip-drift-a"
          style={{ top: 6, right: 8, width: 158 }}
        />
        <Chip
          label="Top gap"
          value={gapValue}
          line={gapLine}
          detailLine={gapDetail}
          detail={detail}
          driftClass="cp-chip-drift-b"
          style={{ left: 8, bottom: 30, width: 160 }}
        />
        <Chip
          label="Postings"
          value={postingsValue}
          line={postingsLine}
          detailLine={postingsDetail}
          detail={detail}
          driftClass="cp-chip-drift-c"
          style={{ right: 8, bottom: 8, width: 152 }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The desktop composition                                             */
/* ------------------------------------------------------------------ */

export function HeroOrbit({
  data,
  heroRef,
}: {
  data: HeroOrbitData;
  heroRef: RefObject<HTMLElement | null>;
}) {
  const reduced = usePrefersReducedMotion();
  const pointer = useHeroParallax(heroRef, !reduced);

  // Reduced motion: no lens, no flashlight, no orbit. The full detail
  // renders in place, still and readable.
  if (reduced) {
    return (
      <div
        className="absolute right-6 top-[140px] z-10 hidden h-[400px] w-[340px] lg:block"
        role="group"
        aria-label="Live market signals: your skills in orbit"
      >
        <OrbitScene data={data} detail pointer={null} nodesAboveChips />
      </div>
    );
  }

  return (
    <div
      className="absolute right-6 top-[140px] z-10 hidden h-[400px] w-[340px] lg:block"
      role="group"
      aria-label="Live market signals: your skills in orbit"
    >
      <Lens className="h-full w-full">
        <Flashlight
          className="h-full w-full"
          dimChildren={false}
          hideToggle
          lit={<OrbitScene data={data} detail pointer={pointer} />}
        >
          <OrbitScene data={data} detail={false} pointer={pointer} />
        </Flashlight>
      </Lens>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The mobile strip: the same signals, compact, below the headline     */
/* ------------------------------------------------------------------ */

export function HeroSignalsStrip({ data }: { data: HeroOrbitData }) {
  const resume = data.isLoading
    ? "…"
    : (data.resumeBand?.label ?? "Not analysed yet");
  const gap = data.isLoading ? "…" : (data.topGap ?? "Not measured yet");
  const market = data.isLoading
    ? "…"
    : data.totalPostings > 0
      ? `${data.totalPostings} stored`
      : "None stored yet";

  const chips: Array<{ label: string; value: string }> = [
    { label: "Resume", value: resume },
    { label: "Top gap", value: gap },
    { label: "Market", value: market },
  ];

  return (
    <div className="mt-8 lg:hidden" role="group" aria-label="Live signals">
      <div className="flex flex-wrap items-stretch gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">
          <span
            className="cp-live-dot block rounded-full bg-[var(--cp-lime,#e1f10d)]"
            style={{ width: 6, height: 6 }}
          />
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: "9px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--cp-lime, #e1f10d)",
            }}
          >
            Live
          </span>
        </span>
        {chips.map((chip) => (
          <span
            key={chip.label}
            className="min-w-[104px] flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
          >
            <span
              className="block"
              style={{
                fontFamily: MONO_FONT,
                fontSize: "9px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--cp-stone, #c6c5bf)",
              }}
            >
              {chip.label}
            </span>
            <span className="mt-0.5 block truncate text-[12px] font-bold leading-tight text-[var(--cp-paper,#f4f1ea)]">
              {chip.value}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
