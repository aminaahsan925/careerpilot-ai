import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Droplets, ExternalLink, Fish, RefreshCw, Waves, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The Market Pond (Direction 3, Character-Led / Living World).
 *
 * The Market Mirror's hero as a living koi pond. Every koi is ONE REAL
 * job posting from the student's stored job research (Tavily search +
 * company ATS boards, persisted by `refreshJobMarket` and read through
 * `useStoredJobsWithCoverage`). Nothing here is invented: no fake jobs,
 * counts, salaries, or probabilities.
 *
 * - Gold koi = matched postings: deterministic coverage of the posting's
 *   requirements by the student's saved evidence is 70% or higher (the
 *   same bar as the Flight Plan's SavedPostings badges). They drift
 *   toward the student's shore on the right of the pond.
 * - Other koi swim freely. Coverage of null means "not measured yet",
 *   never a default.
 * - All illustration is hand-written inline SVG/CSS. No images, no
 *   AI-generated art (the Pinterest koi reference is AI-modified, so it
 *   was used as mood/composition only).
 * - Koi dart gently away from the cursor; with prefers-reduced-motion
 *   they sit still (the global reduced-motion rule in styles.css also
 *   forces every animation here to complete instantly).
 */

/** One real posting, shaped for the pond. Built in market.tsx. */
export type PondKoi = {
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

interface KoiPondProps {
  /** Real postings, newest first. The pond shows at most MAX_KOI. */
  koi: PondKoi[];
  isLoading: boolean;
  targetRole: string;
  /** The page's existing refresh action (re-runs market research, which stores new postings). */
  onRefresh: () => void;
  refreshPending: boolean;
  /** "Drop your resume in" action (navigates to /resume). */
  onDropResume: () => void;
}

const MAX_KOI = 10;

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

type KoiLayout = {
  left: string;
  top: string;
  width: number;
  flip: boolean;
  driftX: number;
  driftY: number;
  driftY2: number;
  duration: number;
  delay: number;
  colorway: 0 | 1 | 2 | 3;
};

function layoutFor(fish: PondKoi, index: number): KoiLayout {
  const hash = hashString(fish.id);
  const pick = (n: number) => (hash >> (n * 3)) % 8;
  // Matched (gold) koi cluster near the student's shore, right side.
  // Free koi roam the whole pond. The left edge is capped so a koi plus
  // its drift never swims past the pond's right edge on a 390px phone.
  const leftPct = fish.matched
    ? 54 + pick(0) * 2 + (index % 3) * 2
    : 4 + pick(0) * 7.5 + (index % 4) * 2;
  return {
    left: `${Math.min(leftPct, 70)}%`,
    top: `${8 + pick(1) * 9 + (index % 3) * 4}%`,
    width: 62 + pick(2) * 4,
    flip: pick(3) % 2 === 0,
    driftX: fish.matched ? 10 + pick(4) : 18 + pick(4) * 2,
    driftY: 8 + pick(5),
    driftY2: 6 + pick(6),
    duration: 16 + pick(2) * 2,
    delay: pick(7),
    colorway: (pick(1) % 4) as 0 | 1 | 2 | 3,
  };
}

/* Koi colourways: body, belly/fin shade, patch. Matched koi are gold. */
type KoiColors = { body: string; shade: string; patch: string; tail: string };
const COLORWAYS: KoiColors[] = [
  { body: "#f58220", shade: "#d96a0e", patch: "#fff3e0", tail: "#e8720c" },
  { body: "#fffdf6", shade: "#efe3cd", patch: "#f58220", tail: "#f2e7d3" },
  { body: "#8fd3d1", shade: "#5fb3b0", patch: "#fffdf6", tail: "#6fc1be" },
  { body: "#f2a03d", shade: "#d9831f", patch: "#fffdf6", tail: "#e08d26" },
];
const GOLD: KoiColors = { body: "#f2b705", shade: "#d99e00", patch: "#fff8dc", tail: "#e0a800" };

/* ------------------------------------------------------------------ */
/* Original hand-drawn koi (inline SVG, facing right; flip via CSS)    */
/* ------------------------------------------------------------------ */

function KoiFish({ colors }: { colors: KoiColors }) {
  return (
    <svg
      viewBox="0 0 120 56"
      className="h-auto w-full drop-shadow-[0_6px_6px_rgba(0,0,0,0.28)]"
      aria-hidden="true"
    >
      {/* Tail fin, gently wagging (see .koi-tail keyframes below). */}
      <g className="koi-tail">
        <path d="M20 28 L3 15 C8 22 8 34 3 41 Z" fill={colors.tail} />
      </g>
      {/* Body */}
      <path
        d="M18 28 C24 13 48 7 70 11 C90 14 104 20 108 28 C104 36 90 42 70 45 C48 49 24 43 18 28 Z"
        fill={colors.body}
      />
      {/* Belly shading */}
      <path
        d="M32 39 C50 47 78 46 96 36 C86 42 68 45 52 43 C44 42 36 41 32 39 Z"
        fill={colors.shade}
        opacity="0.55"
      />
      {/* Koi patch */}
      <ellipse cx="60" cy="23" rx="13" ry="7.5" fill={colors.patch} opacity="0.9" />
      {/* Dorsal fin */}
      <path d="M50 12 C56 4 68 3 73 10 C65 7 58 8 50 12 Z" fill={colors.shade} />
      {/* Pectoral fin */}
      <path d="M78 40 C84 46 92 46 94 42 C88 40 82 39 78 40 Z" fill={colors.shade} opacity="0.8" />
      {/* Eye */}
      <circle cx="92" cy="24" r="3.4" fill="#241407" />
      <circle cx="93.2" cy="22.8" r="1.1" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

/* Lily pad: flat hand-drawn ellipse with a small flower. */
function LilyPad({ className, flower = true }: { className?: string; flower?: boolean }) {
  return (
    <svg viewBox="0 0 100 60" className={className} aria-hidden="true">
      <ellipse cx="50" cy="32" rx="46" ry="24" fill="#2e7d4f" opacity="0.9" />
      <ellipse cx="42" cy="26" rx="30" ry="14" fill="#3c9a63" opacity="0.7" />
      <path d="M50 32 L50 8" stroke="#2e7d4f" strokeWidth="3" strokeLinecap="round" />
      {flower && (
        <g>
          <circle cx="50" cy="12" r="6" fill="#fffdf6" />
          <circle cx="44" cy="14" r="4.5" fill="#f7c8d8" />
          <circle cx="56" cy="14" r="4.5" fill="#f7c8d8" />
          <circle cx="50" cy="12" r="2.5" fill="#f2b705" />
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* The pond                                                            */
/* ------------------------------------------------------------------ */

type Ripple = { id: number; x: number; y: number };

export function KoiPond({
  koi,
  isLoading,
  targetRole,
  onRefresh,
  refreshPending,
  onDropResume,
}: KoiPondProps) {
  const pondRef = useRef<HTMLDivElement>(null);
  const dartRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const rippleId = useRef(0);
  const rafPending = useRef(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const visibleKoi = useMemo(() => koi.slice(0, MAX_KOI), [koi]);
  const layouts = useMemo(
    () => new Map(visibleKoi.map((fish, i) => [fish.id, layoutFor(fish, i)])),
    [visibleKoi],
  );
  const selected = visibleKoi.find((fish) => fish.id === selectedId) ?? null;
  const hiddenCount = koi.length - visibleKoi.length;

  const addRipple = (x: number, y: number) => {
    const id = ++rippleId.current;
    setRipples((current) => [...current.slice(-5), { id, x, y }]);
    window.setTimeout(
      () => setRipples((current) => current.filter((ripple) => ripple.id !== id)),
      1200,
    );
  };

  const handlePondClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const pond = pondRef.current;
    if (!pond) return;
    const rect = pond.getBoundingClientRect();
    addRipple(event.clientX - rect.left, event.clientY - rect.top);
  };

  /* Koi dart gently away from the cursor: cheap direct DOM writes on the
     inner dart span (the swim animation lives on the outer button, so the
     two transforms never fight). Skipped under reduced motion. */
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || rafPending.current) return;
    rafPending.current = true;
    const clientX = event.clientX;
    const clientY = event.clientY;
    requestAnimationFrame(() => {
      rafPending.current = false;
      const pond = pondRef.current;
      if (!pond) return;
      const pondRect = pond.getBoundingClientRect();
      const px = clientX - pondRect.left;
      const py = clientY - pondRect.top;
      dartRefs.current.forEach((el) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2 - pondRect.left;
        const cy = rect.top + rect.height / 2 - pondRect.top;
        const dx = cx - px;
        const dy = cy - py;
        const dist = Math.hypot(dx, dy);
        const radius = 130;
        if (dist < radius && dist > 0.001) {
          const push = (1 - dist / radius) * 16;
          el.style.transform = `translate(${(dx / dist) * push}px, ${(dy / dist) * push}px)`;
        } else {
          el.style.transform = "";
        }
      });
    });
  };

  const resetDart = () => {
    dartRefs.current.forEach((el) => {
      if (el) el.style.transform = "";
    });
  };

  const handleDropResume = () => {
    if (dropping) return;
    setDropping(true);
    const pond = pondRef.current;
    if (pond) {
      const rect = pond.getBoundingClientRect();
      addRipple(rect.width / 2, rect.height / 2);
    }
    window.setTimeout(() => {
      setDropping(false);
      onDropResume();
    }, 650);
  };

  return (
    <div className="space-y-4">
      {/* Pond-scoped motion. The global prefers-reduced-motion rule in
          styles.css forces these to complete instantly, so koi sit still
          for users who asked for reduced motion. */}
      <style>{`
        @keyframes koi-drift {
          0% { transform: translate(0px, 0px) rotate(-2deg); }
          35% { transform: translate(var(--drift-x, 22px), var(--drift-y, -12px)) rotate(2deg); }
          70% { transform: translate(calc(var(--drift-x, 22px) * -0.7), var(--drift-y2, 10px)) rotate(-1deg); }
          100% { transform: translate(0px, 0px) rotate(-2deg); }
        }
        @keyframes koi-tail {
          from { transform: rotate(-12deg); }
          to { transform: rotate(12deg); }
        }
        @keyframes pond-ripple {
          from { transform: scale(0.6); opacity: 0.85; }
          to { transform: scale(3.4); opacity: 0; }
        }
        .koi-swim {
          animation: koi-drift var(--drift-dur, 22s) ease-in-out var(--drift-delay, 0s) infinite alternate;
          will-change: transform;
        }
        .koi-tail {
          transform-box: fill-box;
          transform-origin: 100% 50%;
          animation: koi-tail 1.5s ease-in-out infinite alternate;
        }
        .koi-dart {
          display: block;
          transition: transform 0.55s ease-out;
          will-change: transform;
        }
        .pond-ripple {
          animation: pond-ripple 1.1s ease-out forwards;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="d3-display text-2xl font-bold text-d3-choco sm:text-3xl">
            The Market Pond
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-d3-choco/70">
            Every koi is a real posting from your saved job research for{" "}
            <strong className="text-d3-choco">{targetRole}</strong>. Tap a koi to see the
            posting. Gold koi match your skills and swim to your shore.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="d3-chip bg-d3-gold/25 text-d3-choco">
              <span className="h-2.5 w-2.5 rounded-full bg-d3-gold" /> Matches your skills
            </span>
            <span className="d3-chip bg-d3-koi/15 text-d3-choco">
              <span className="h-2.5 w-2.5 rounded-full bg-d3-koi" /> Other postings
            </span>
            {koi.length > 0 && (
              <span className="text-xs font-semibold text-d3-choco/50">
                {koi.length} posting{koi.length === 1 ? "" : "s"} swimming, newest first
                {hiddenCount > 0 ? ` (showing ${MAX_KOI})` : ""}
              </span>
            )}
          </div>
        </div>
        <Button
          type="button"
          onClick={handleDropResume}
          disabled={dropping}
          className="shrink-0 rounded-full bg-d3-mustard px-5 font-bold text-d3-ink shadow-md hover:bg-d3-gold"
        >
          <Droplets className="mr-2 h-4 w-4" />
          {dropping ? "Dropping it in..." : "Drop your resume in"}
        </Button>
      </div>

      {/* The pond */}
      <div
        ref={pondRef}
        role="region"
        aria-label="Market pond: live job postings as koi"
        onClick={handlePondClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetDart}
        className="relative h-[340px] touch-manipulation overflow-hidden rounded-[2rem] border border-d3-teal/40 bg-d3-teal shadow-d3-chunky sm:h-[400px]"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--d3-teal) 82%, white) 0%, var(--d3-teal) 45%, color-mix(in srgb, var(--d3-teal) 78%, black) 100%)",
        }}
      >
        {/* Light on the water */}
        <div className="pointer-events-none absolute -top-10 left-[12%] h-40 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute right-[8%] bottom-[18%] h-32 w-48 rounded-full bg-white/10 blur-2xl" />
        {/* Pebbles on the pond floor */}
        <div className="pointer-events-none absolute bottom-3 left-[6%] h-4 w-10 rounded-[50%] bg-d3-ink/25" />
        <div className="pointer-events-none absolute bottom-5 left-[30%] h-3 w-7 rounded-[50%] bg-d3-ink/20" />
        <div className="pointer-events-none absolute bottom-2 left-[62%] h-5 w-12 rounded-[50%] bg-d3-ink/25" />
        <div className="pointer-events-none absolute bottom-6 right-[10%] h-3 w-8 rounded-[50%] bg-d3-ink/20" />
        {/* Lily pads */}
        <LilyPad className="animate-d3-bob pointer-events-none absolute top-[8%] left-[4%] w-20 opacity-90 sm:w-24" />
        <LilyPad
          className="pointer-events-none absolute right-[6%] bottom-[10%] w-16 opacity-80 sm:w-20"
          flower={false}
        />
        {/* Your shore, bottom right: where the gold koi gather */}
        <div className="pointer-events-none absolute right-0 bottom-0 h-24 w-40 rounded-tl-[100%] bg-d3-mustard/70 sm:h-28 sm:w-52" />
        <span className="d3-chip pointer-events-none absolute right-3 bottom-3 bg-d3-gold text-d3-ink shadow-md">
          <Fish className="h-3.5 w-3.5" /> Your shore
        </span>

        {/* Ripples */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            aria-hidden="true"
            className="pond-ripple pointer-events-none absolute h-10 w-10 rounded-full border-2 border-white/70"
            style={{ left: ripple.x - 20, top: ripple.y - 20 }}
          />
        ))}

        {/* Koi */}
        {visibleKoi.map((fish, index) => {
          const layout = layouts.get(fish.id);
          if (!layout) return null;
          const colorway = COLORWAYS[layout.colorway];
          const colors: KoiColors = fish.matched ? GOLD : (colorway ?? GOLD);
          const isSelected = fish.id === selectedId;
          return (
            <button
              key={fish.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedId(isSelected ? null : fish.id);
              }}
              aria-pressed={isSelected}
              aria-label={`${fish.title} at ${fish.company ?? "company not listed"}${fish.matched ? ", strong match for your skills" : ""}. Tap to see the posting.`}
              className={cn(
                "koi-swim absolute cursor-pointer rounded-full p-1 outline-none",
                isSelected && "ring-4 ring-d3-gold ring-offset-2 ring-offset-d3-teal",
                !isSelected && "focus-visible:ring-4 focus-visible:ring-d3-paper/80",
              )}
              style={
                {
                  left: layout.left,
                  top: layout.top,
                  width: layout.width,
                  "--drift-x": `${layout.driftX}px`,
                  "--drift-y": `${layout.driftY}px`,
                  "--drift-y2": `${layout.driftY2}px`,
                  "--drift-dur": `${layout.duration}s`,
                  "--drift-delay": `${layout.delay}s`,
                } as React.CSSProperties
              }
            >
              <span
                ref={(el) => {
                  dartRefs.current[index] = el;
                }}
                className="koi-dart"
              >
                <span
                  className="block"
                  style={layout.flip ? { transform: "scaleX(-1)" } : undefined}
                >
                  <KoiFish colors={colors} />
                </span>
              </span>
            </button>
          );
        })}

        {/* Loading: still water while postings load */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <Waves className="h-8 w-8 animate-pulse text-d3-paper/80" />
            <p className="d3-display text-lg font-bold text-d3-paper">Filling the pond...</p>
          </div>
        )}

        {/* Honest empty state: still water, never fake fish */}
        {!isLoading && visibleKoi.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <Waves className="h-8 w-8 text-d3-paper/80" />
            <p className="d3-display text-xl font-bold text-d3-paper sm:text-2xl">
              No live postings yet
            </p>
            <p className="max-w-sm text-xs leading-relaxed text-d3-paper/85">
              Your pond fills with real postings when the market research runs for{" "}
              {targetRole}. Refresh below and the koi will swim in.
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={refreshPending}
                onClick={onRefresh}
                className="rounded-full bg-d3-paper font-bold text-d3-teal hover:bg-white"
              >
                <RefreshCw
                  className={cn("mr-1.5 h-3.5 w-3.5", refreshPending && "animate-spin")}
                />
                {refreshPending ? "Refreshing..." : "Refresh market data"}
              </Button>
              <Link
                to="/jobmirror"
                className="rounded-full px-3 py-1.5 text-xs font-bold text-d3-paper underline underline-offset-2 hover:text-white"
              >
                Open Job Mirror
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Selected posting card (same facts as the Flight Plan's saved postings) */}
      {selected && (
        <div className="d3-card animate-rise-in p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-d3-choco">{selected.title}</h3>
              <p className="mt-0.5 truncate text-xs font-semibold text-d3-choco/70">
                {selected.company ?? "Company not listed"}
                {selected.location ? ` · ${selected.location}` : " · Location not listed"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Close posting details"
              className="shrink-0 rounded-lg p-1.5 text-d3-choco/60 hover:bg-d3-cream hover:text-d3-choco"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {selected.coveragePct !== null ? (
              <span
                className={cn(
                  "d3-chip",
                  selected.matched
                    ? "bg-d3-gold text-d3-ink"
                    : "bg-d3-sky/30 text-d3-navy",
                )}
              >
                {selected.matched ? "Strong match: " : "Coverage: "}
                {selected.coveragePct}%
              </span>
            ) : (
              <span className="d3-chip border border-d3-choco/15 bg-d3-cream text-d3-choco/70">
                Coverage not measured yet
              </span>
            )}
            <span className="text-xs text-d3-choco/60">
              Saved{" "}
              {new Date(selected.retrievedAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {selected.sourceName ? ` · via ${selected.sourceName}` : ""}
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-d3-choco/70">
            {selected.coveragePct !== null
              ? `Your saved evidence covers ${selected.coveragePct}% of this posting's listed requirements.`
              : "Open the Job Mirror to measure your evidence against this posting."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {selected.url && (
              <a
                href={selected.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-d3-teal px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-d3-teal/90"
              >
                Open posting <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <Link
              to="/jobmirror"
              className="inline-flex items-center gap-1.5 rounded-full border border-d3-choco/15 bg-d3-paper px-4 py-2 text-xs font-bold text-d3-choco hover:bg-d3-cream"
            >
              Open Job Mirror
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
