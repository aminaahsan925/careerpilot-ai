/**
 * Future Tech Trends, Round 3 (Cursor as Flashlight / Lens).
 *
 * Signature moments:
 * - Hero: a Lens over a live signal panel built from the real pulse
 *   counts (gaining attention / worth watching / new developments) and
 *   the real featured trend. No invented percentages: the old hero
 *   panel's "+94% Demand" style figures were fabricated and are gone.
 *   While research loads, the panel says so and shows no numbers.
 * - Section headings are kinetic (scroll-linked word reveal).
 * - The 2030 radar (FutureTechRadar) carries its own lens over the
 *   banner and a flashlight inside each region card.
 *
 * Presentation only: filters, mode, tracking mutations and the explore
 * modal flow are unchanged. All numbers come from the trends report.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Bookmark,
  Building2,
  ChevronDown,
  ExternalLink,
  Flame,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

import { AppLayout } from "@/components/app/AppLayout";
import { FutureTechRadar } from "@/components/market/FutureTechRadar";
import { useCurrentUser } from "@/data/user";
import {
  useTechTrends,
  useRefreshTechTrends,
  useTechTrendDetail,
  useUpdateTechTracking,
  useTechTracking,
  TECH_TREND_CATEGORIES,
  type TechTrendCategory,
} from "@/data/tech-trends";
import type { TechTrend } from "@/data/tech-trends";
import { Stagger, StaggerItem, ShimmerSkeleton, PulseBadge, TrendArrow } from "@/lib/animation";
import { cn } from "@/lib/utils";
import { Lens } from "@/components/lens/Lens";
import { usePrefersReducedMotion } from "@/components/lens/usePrefersReducedMotion";
import { KineticText } from "@/components/lens/KineticText";
import { MagneticButton } from "@/components/lens/MagneticButton";
import { SpotlightCard } from "@/components/lens/SpotlightCard";

export const Route = createFileRoute("/_authenticated/future-tech")({
  component: FutureTechPage,
});

function FutureTechPage() {
  const [mode, setMode] = useState<"global" | "for-you">("global");
  const [category, setCategory] = useState<TechTrendCategory>("All");
  const [exploringTech, setExploringTech] = useState<string | null>(null);
  const [exploreStep, setExploreStep] = useState(0);
  const [technologySearch, setTechnologySearch] = useState("");
  const { data: user } = useCurrentUser();

  const { data: trends, isLoading, error, refetch } = useTechTrends();
  const { data: tracking } = useTechTracking();
  const refresh = useRefreshTechTrends();

  // Track which technology names the user is tracking
  const trackedNames = new Set((tracking ?? []).map((t) => t.technology_name));

  // Filter by category AND mode
  // BUG FIX (2026-10-30): cached AI output can contain a placeholder trend
  // named "Unknown" (category "Other", medium confidence). Never show it
  // as if it were a real technology.
  const isRealTrend = (name: string | undefined) =>
    Boolean(name) && name !== "Unknown";
  const filteredTrends = trends?.alsoWatching.filter((t) => {
    const matchesCategory = category === "All" || t.category === category;
    const matchesMode = mode === "global" || trackedNames.has(t.name);
    return isRealTrend(t.name) && matchesCategory && matchesMode;
  });

  // Also filter featured by mode
  const featuredTrend = trends?.featured;
  const showFeatured =
    featuredTrend &&
    isRealTrend(featuredTrend.name) &&
    (mode === "global" || trackedNames.has(featuredTrend.name)) &&
    (category === "All" || featuredTrend.category === category);

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[900px] space-y-8">
        {/* Hero */}
        <HeroSection
          pulse={trends?.pulse}
          featuredName={showFeatured ? featuredTrend.name : undefined}
          source={trends?.source}
          fromCache={trends?.fromCache}
          isLoading={isLoading}
        />

        {/* Mode toggle + Category filter */}
        <ControlsBar
          mode={mode}
          onModeChange={setMode}
          category={category}
          onCategoryChange={setCategory}
          searchValue={technologySearch}
          onSearchChange={setTechnologySearch}
          onSearch={() => {
            const query = technologySearch.trim();
            if (query) {
              setExploringTech(query);
              setExploreStep(0);
            }
          }}
        />

        <FrontierRadar targetRole={user?.goal || user?.role || "your target career"} />

        <FutureTechRadar targetRole={user?.goal || user?.role || "your target career"} />

        {/* Technology Pulse */}
        {trends?.source === "sample" && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <p className="text-[13px] font-semibold text-cp-paper">
              Showing sample trends. Live refresh failed.
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-cp-stone">
              These are curated examples, not live research. Try refreshing again shortly.
            </p>
          </div>
        )}
        {trends && (
          <PulseSection pulse={trends.pulse} fromCache={trends.fromCache} source={trends.source} />
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            <ShimmerSkeleton className="h-6 w-48" />
            <ShimmerSkeleton className="h-4 w-full" />
            <ShimmerSkeleton className="h-4 w-3/4" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ShimmerSkeleton className="h-40 w-full" />
              <ShimmerSkeleton className="h-40 w-full" />
            </div>
            <motion.p
              className="mt-6 text-center text-[13px] text-cp-stone"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              Researching emerging technologies…
            </motion.p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-2xl border border-cp-ember/30 bg-cp-ember/5 px-5 py-4">
            <p className="text-[13px] font-semibold text-cp-ember">Couldn&apos;t load tech trends</p>
            <p className="mt-1 text-[12px] leading-relaxed text-cp-stone">
              {error.message}
            </p>
            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                onClick={() => refetch()}
                className="text-[12px] font-semibold text-cp-lime hover:underline"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => refresh.mutate()}
                disabled={refresh.isPending}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-cp-stone hover:text-cp-paper disabled:opacity-50"
              >
                {refresh.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Force refresh
              </button>
            </div>
          </div>
        )}

        {/* Featured technology */}
        {showFeatured && !isLoading && (
          <FeaturedSection
            trend={featuredTrend}
            onExplore={() => {
              setExploringTech(featuredTrend.name);
              setExploreStep(0);
            }}
            trackingStatus={
              tracking?.find((t) => t.technology_name === featuredTrend.name)?.status ?? undefined
            }
          />
        )}

        {/* Also watching */}
        {filteredTrends && filteredTrends.length > 0 && !isLoading && (
          <AlsoWatchingSection
            trends={filteredTrends}
            onExplore={(name) => {
              setExploringTech(name);
              setExploreStep(0);
            }}
            tracking={tracking ?? []}
          />
        )}

        {/* Refresh button */}
        {trends && (
          <div className="flex justify-center pt-4">
            <motion.button
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98 }}
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-cp-panel px-5 py-2.5 text-[12.5px] font-medium text-cp-stone transition hover:border-cp-lime/40 hover:text-cp-paper disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refresh.isPending ? "animate-spin" : ""}`} />
              {refresh.isPending ? "Researching fresh trends…" : "Refresh trends"}
            </motion.button>
          </div>
        )}

        {/* Empty state */}
        {trends && !trends.featured.name && !isLoading && <EmptyState />}

        {/* No results for "For You" mode */}
        {mode === "for-you" &&
          !isLoading &&
          trends &&
          filteredTrends?.length === 0 &&
          !showFeatured && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/10 bg-cp-panel p-8 text-center"
            >
              <Sparkles className="mx-auto h-8 w-8 text-cp-stone/50" />
              <h3 className="mt-3 text-[15px] font-semibold text-cp-paper">
                No tracked technologies yet
              </h3>
              <p className="mt-1.5 max-w-[320px] mx-auto text-[13px] text-cp-stone">
                Switch to &quot;Global&quot; to explore trends, or save technologies from the Global
                view to see them here.
              </p>
              <button
                type="button"
                onClick={() => setMode("global")}
                className="mt-4 rounded-xl bg-cp-lime px-4 py-2 text-[12.5px] font-semibold text-cp-ink transition hover:-translate-y-0.5"
              >
                Browse Global Trends
              </button>
            </motion.div>
          )}
      </div>

      {/* Explore modal */}
      <AnimatePresence>
        {exploringTech && (
          <ExploreModal
            technologyName={exploringTech}
            step={exploreStep}
            onStepChange={setExploreStep}
            onClose={() => {
              setExploringTech(null);
              setExploreStep(0);
            }}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Hero Section: kinetic headline, lens over the real pulse           */
/* ------------------------------------------------------------------ */

export function HeroSection({
  pulse,
  featuredName,
  source,
  fromCache,
  isLoading,
}: {
  pulse?: { gainingAttention: number; worthWatching: number; newDevelopments: number } | undefined;
  featuredName?: string | undefined;
  source?: "live" | "sample" | undefined;
  fromCache?: boolean | undefined;
  isLoading: boolean;
}) {
  const pulseLabel = source === "sample" ? "Sample" : fromCache ? "Cached" : "Live";
  const reduced = usePrefersReducedMotion();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-cp-panel">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Lime glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-cp-lime/10 blur-3xl sm:h-64 sm:w-64" />

      <div className="relative flex flex-col gap-8 p-8 sm:flex-row sm:items-center sm:gap-10 sm:p-10 lg:gap-14">
        {/* Text content */}
        <div className="flex-1 space-y-5">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-cp-lime"
          >
            Future Tech Trends
          </motion.p>

          <h1 className="font-display text-[clamp(1.9rem,4vw,2.9rem)] font-extrabold leading-[1.05] tracking-tight text-cp-paper">
            <KineticText text="See what technology" className="block" />
            <KineticText text="is becoming." className="block" />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[480px] text-[14px] leading-relaxed text-cp-stone"
          >
            Discover important emerging technologies, understand why they matter, and learn what to
            do next.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap gap-2 pt-1"
          >
            {["AI", "Cloud", "Cybersecurity", "Quantum"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-cp-ink px-3 py-1 font-mono text-[11px] text-cp-stone"
              >
                {tag}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Signal panel: real pulse counts under a lens. Static content
            only, so the light disc can fall on it. While research loads it
            says so and shows no numbers. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-[320px] shrink-0 sm:mx-0 sm:max-w-[290px] lg:max-w-[320px]"
        >
          <div className="absolute inset-0 rounded-3xl bg-cp-lime/10 blur-2xl" />
          <Lens className="relative overflow-hidden rounded-3xl border border-cp-lime/25 bg-cp-ink p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cp-lime2 opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cp-lime2" />
                </span>
                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-cp-stone">
                  Technology pulse
                </span>
              </div>
              <span className="rounded border border-cp-lime/40 bg-cp-lime/10 px-2 py-0.5 font-mono text-[11px] font-medium text-cp-lime">
                {pulseLabel}
              </span>
            </div>

            {!pulse || isLoading ? (
              <p className="py-8 text-center font-mono text-[12px] text-cp-stone">
                Researching emerging technologies…
              </p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-display text-[28px] font-extrabold leading-none text-cp-lime">
                      {pulse.gainingAttention}
                    </p>
                    <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-cp-stone">
                      Gaining attention
                    </p>
                  </div>
                  <div>
                    <p className="font-display text-[28px] font-extrabold leading-none text-cp-paper">
                      {pulse.worthWatching}
                    </p>
                    <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-cp-stone">
                      Worth watching
                    </p>
                  </div>
                  <div>
                    <p className="font-display text-[28px] font-extrabold leading-none text-cp-ember">
                      {pulse.newDevelopments}
                    </p>
                    <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-cp-stone">
                      New developments
                    </p>
                  </div>
                </div>
                {featuredName && (
                  <div className="mt-4 border-t border-white/10 pt-3.5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cp-stone">
                      Featured right now
                    </p>
                    <p className="mt-1 font-serif text-[17px] italic leading-snug text-cp-paper">
                      {featuredName}
                    </p>
                  </div>
                )}
                <p className="mt-3.5 font-mono text-[10.5px] text-cp-stone/70">
                  {reduced ? "The numbers are shown in full." : "Put the light over a number to see it lit."}
                </p>
              </>
            )}
          </Lens>
        </motion.div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Controls Bar                                                        */
/* ------------------------------------------------------------------ */

export function ControlsBar({
  mode,
  onModeChange,
  category,
  onCategoryChange,
  searchValue,
  onSearchChange,
  onSearch,
}: {
  mode: "global" | "for-you";
  onModeChange: (m: "global" | "for-you") => void;
  category: TechTrendCategory;
  onCategoryChange: (c: TechTrendCategory) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Mode toggle */}
      <div className="flex rounded-2xl border border-white/10 bg-cp-panel p-1">
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => onModeChange("global")}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-mono text-[12px] font-medium transition ${
            mode === "global"
              ? "bg-cp-lime text-cp-ink"
              : "text-cp-stone hover:text-cp-paper"
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          Global
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => onModeChange("for-you")}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-mono text-[12px] font-medium transition ${
            mode === "for-you"
              ? "bg-cp-lime text-cp-ink"
              : "text-cp-stone hover:text-cp-paper"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          For You
        </motion.button>
      </div>

      {/* Category filter */}
      <div className="relative">
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as TechTrendCategory)}
          className="appearance-none rounded-2xl border border-white/10 bg-cp-panel py-2 pl-3.5 pr-9 font-mono text-[12px] font-medium text-cp-paper outline-none transition hover:border-cp-lime/30 focus:border-cp-lime"
        >
          {TECH_TREND_CATEGORIES.map((cat) => (
            <option key={cat} value={cat} className="bg-cp-panel">
              {cat}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cp-stone" />
      </div>

      <form
        className="flex min-w-[260px] flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-cp-panel p-1"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <Search className="ml-2 h-3.5 w-3.5 shrink-0 text-cp-stone" />
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search live technology or trend"
          aria-label="Search live technology or trend"
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[12px] text-cp-paper outline-none placeholder:text-cp-stone/60"
        />
        <button
          type="submit"
          disabled={!searchValue.trim()}
          className="rounded-xl bg-cp-lime px-3 py-2 text-xs font-semibold text-cp-ink transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Search
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pulse Section                                                       */
/* ------------------------------------------------------------------ */

const FRONTIER_LENSES = [
  { name: "Google", focus: "Multimodal models, AI agents, cloud infrastructure", icon: Sparkles },
  { name: "Microsoft", focus: "Copilots, agent orchestration, enterprise AI", icon: Building2 },
  { name: "Amazon", focus: "Bedrock, model routing, AI infrastructure", icon: Zap },
  {
    name: "China frontier",
    focus: "Open reasoning models, efficient inference, open source",
    icon: Globe,
  },
];

export function FrontierRadar({ targetRole }: { targetRole: string }) {
  const role = targetRole.toLowerCase();
  const targetAction = role.includes("data")
    ? "Prioritise model evaluation, data pipelines, vector search, and responsible AI."
    : role.includes("design") || role.includes("frontend")
      ? "Prioritise multimodal interfaces, AI-assisted product workflows, accessibility, and human-centred evaluation."
      : role.includes("devops") || role.includes("cloud")
        ? "Prioritise AI infrastructure, observability, secure deployment, and cost-aware model operations."
        : "Prioritise agent orchestration, tool integration, evaluation, and secure production deployment.";

  return (
    <section className="rounded-3xl border border-white/10 bg-cp-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-cp-lime">
            Global frontier radar
          </p>
          <h2 className="mt-2 pb-7 font-display text-xl font-bold tracking-tight text-cp-paper">
            <KineticText text="What the industry is building next" />
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-cp-stone">
            Live research is filtered through four strategic lenses so you see company direction and
            career impact, not just a list of tools.
          </p>
        </div>
        <span className="rounded-full border border-cp-lime/30 bg-cp-lime/10 px-3 py-1.5 font-mono text-[11px] font-medium text-cp-lime">
          Research lenses · 2026 → 2030
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {FRONTIER_LENSES.map(({ name, focus, icon: Icon }) => (
          <SpotlightCard
            key={name}
            className="rounded-2xl border border-white/10 bg-cp-ink p-4"
          >
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cp-lime/10 text-cp-lime">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-cp-paper">{name}</p>
                <p className="mt-1 text-xs leading-5 text-cp-stone">{focus}</p>
              </div>
            </div>
          </SpotlightCard>
        ))}
      </div>
      <div className="mt-4 grid gap-4 border-t border-white/10 pt-4 md:grid-cols-[1fr_1fr]">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-cp-stone">
            The 2030 shift
          </p>
          <p className="mt-1 font-serif text-[16px] italic leading-snug text-cp-paper">
            From writing every line to designing, supervising, and evaluating intelligent systems.
          </p>
        </div>
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-cp-stone">
            For {targetRole}
          </p>
          <p className="mt-1 text-sm font-semibold text-cp-paper">{targetAction}</p>
        </div>
      </div>
    </section>
  );
}

export function PulseSection({
  pulse,
  fromCache,
  source,
}: {
  pulse: { gainingAttention: number; worthWatching: number; newDevelopments: number };
  fromCache?: boolean;
  source?: "live" | "sample";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="rounded-3xl border border-white/10 bg-cp-panel px-5 py-4"
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-cp-stone">
          Technology Pulse
        </p>
        <PulseBadge variant={source === "sample" || fromCache ? "amber" : "emerald"}>
          {source === "sample" ? "Sample" : fromCache ? "Cached" : "Live"}
        </PulseBadge>
      </div>
      <Stagger className="mt-3 flex flex-wrap gap-4" delay={0.06}>
        {pulse.gainingAttention > 0 && (
          <StaggerItem>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cp-lime" />
              <span className="text-[13px] text-cp-paper">
                <span className="font-display text-[16px] font-bold text-cp-lime">{pulse.gainingAttention}</span>{" "}
                {pulse.gainingAttention === 1 ? "technology is" : "technologies are"} gaining
                attention
              </span>
            </div>
          </StaggerItem>
        )}
        {pulse.worthWatching > 0 && (
          <StaggerItem>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-cp-ember" />
              <span className="text-[13px] text-cp-paper">
                <span className="font-display text-[16px] font-bold text-cp-ember">{pulse.worthWatching}</span>{" "}
                {pulse.worthWatching === 1 ? "is" : "are"} worth watching
              </span>
            </div>
          </StaggerItem>
        )}
        {pulse.newDevelopments > 0 && (
          <StaggerItem>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-cp-lime2" />
              <span className="text-[13px] text-cp-paper">
                <span className="font-display text-[16px] font-bold text-cp-lime2">{pulse.newDevelopments}</span> new development
                {pulse.newDevelopments === 1 ? "" : "s"} detected
              </span>
            </div>
          </StaggerItem>
        )}
      </Stagger>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Featured Section                                                    */
/* ------------------------------------------------------------------ */

export function FeaturedSection({
  trend,
  onExplore,
  trackingStatus,
}: {
  trend: TechTrend;
  onExplore: () => void;
  trackingStatus: string | undefined;
}) {
  const trackMutation = useUpdateTechTracking();

  const trendDirection: Record<string, "up" | "flat" | "down"> = {
    emerging: "up",
    rapid_growth: "up",
    growing: "up",
    watch: "flat",
    declining: "down",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <SpotlightCard className="overflow-hidden rounded-3xl border border-white/10 bg-cp-panel">
        <div className="border-b border-white/10 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-cp-lime/30 bg-cp-lime/10 px-2.5 py-1 font-mono text-[11px] font-medium text-cp-lime">
                <Flame className="h-3 w-3" />
                {formatStatus(trend.status)}
              </span>
              <TrendArrow direction={trendDirection[trend.status] ?? "flat"} />
              <span className="font-mono text-[11px] text-cp-stone">{trend.category}</span>
            </div>
            <ConfidenceBadge confidence={trend.confidence} />
          </div>
        </div>

        <div className="px-5 py-5">
          <h2 className="font-display text-[22px] font-bold tracking-tight text-cp-paper">{trend.name}</h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-cp-stone">{trend.whatItIs}</p>

          {trend.whyEmerging && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mt-4 rounded-2xl border border-white/10 bg-cp-ink px-4 py-3"
            >
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-cp-stone">
                Why it&apos;s appearing
              </p>
              <p className="mt-1 font-serif text-[16px] italic leading-relaxed text-cp-paper">
                {trend.whyEmerging}
              </p>
            </motion.div>
          )}

          {trend.sources.length > 0 && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-cp-stone">
                Fresh web sources
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {trend.sources.slice(0, 4).map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl border border-white/10 bg-cp-ink p-2.5 transition hover:border-cp-lime/40"
                  >
                    <span className="block truncate text-xs font-semibold text-cp-paper">
                      {source.title}
                    </span>
                    <span className="mt-1 block line-clamp-2 text-xs leading-4 text-cp-stone">
                      {source.summary}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] text-cp-lime">
                      {source.date ? formatSourceDate(source.date) : "Live research"}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <MagneticButton
              onClick={onExplore}
              className="flex items-center gap-1.5 rounded-xl bg-cp-lime px-4 py-2.5 text-[12.5px] font-semibold text-cp-ink"
            >
              Explore
              <ArrowRight className="h-3.5 w-3.5" />
            </MagneticButton>

            {trackingStatus ? (
              <span className="text-[12px] text-cp-stone">
                Tracking:{" "}
                <span className="font-medium text-cp-paper">
                  {formatTrackingStatus(trackingStatus)}
                </span>
              </span>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  trackMutation.mutate({
                    technologyName: trend.name,
                    status: "want_to_learn",
                  })
                }
                className="flex items-center gap-1.5 text-[12px] font-medium text-cp-stone transition hover:text-cp-lime"
              >
                <Bookmark className="h-3.5 w-3.5" />
                Save for later
              </motion.button>
            )}
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Also Watching Section                                               */
/* ------------------------------------------------------------------ */

export function AlsoWatchingSection({
  trends,
  onExplore,
  tracking,
}: {
  trends: TechTrend[];
  onExplore: (name: string) => void;
  tracking: { technology_name: string; status: string }[];
}) {
  const trendDirection: Record<string, "up" | "flat" | "down"> = {
    emerging: "up",
    rapid_growth: "up",
    growing: "up",
    watch: "flat",
    declining: "down",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <h3 className="pb-7 font-display text-[17px] font-bold tracking-tight text-cp-paper">
        <KineticText text="Also worth watching" />
      </h3>
      <Stagger className="mt-3 grid gap-3 sm:grid-cols-2" delay={0.05}>
        {trends.map((trend) => (
          <StaggerItem key={trend.name}>
            <motion.div whileHover={{ y: -3, transition: { duration: 0.15 } }} whileTap={{ scale: 0.98 }}>
              <SpotlightCard className="rounded-3xl border border-white/10 bg-cp-panel">
                <button
                  type="button"
                  onClick={() => onExplore(trend.name)}
                  className="flex w-full flex-col gap-2 px-4 py-3.5 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-cp-paper">{trend.name}</span>
                      <TrendArrow direction={trendDirection[trend.status] ?? "flat"} />
                    </div>
                    <span className="font-mono text-[11px] text-cp-stone">{trend.category}</span>
                  </div>
                  <p className="line-clamp-2 text-[12px] leading-relaxed text-cp-stone">
                    {trend.whatItIs}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono text-[11px] font-medium",
                        trend.status === "emerging" || trend.status === "rapid_growth"
                          ? "bg-cp-lime/10 text-cp-lime"
                          : trend.status === "growing"
                            ? "bg-cp-ember/10 text-cp-ember"
                            : "bg-white/5 text-cp-stone",
                      )}
                    >
                      {formatStatus(trend.status)}
                    </span>
                    {tracking.find((t) => t.technology_name === trend.name) && (
                      <span className="font-mono text-[11px] text-cp-lime">Tracking</span>
                    )}
                  </div>
                </button>
              </SpotlightCard>
            </motion.div>
          </StaggerItem>
        ))}
      </Stagger>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Explore Modal (Progressive Disclosure)                              */
/* ------------------------------------------------------------------ */

function ExploreModal({
  technologyName,
  step,
  onStepChange,
  onClose,
}: {
  technologyName: string;
  step: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
}) {
  const { data: detail, isLoading, error, refetch } = useTechTrendDetail(technologyName);
  const trackMutation = useUpdateTechTracking();

  const steps = ["What is it?", "Why it matters", "Should I learn it?", "How to learn it"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-cp-ink/70 p-4 backdrop-blur-sm sm:items-center sm:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-[640px] overflow-hidden rounded-3xl border border-white/10 bg-cp-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="font-display text-[17px] font-bold text-cp-paper">{technologyName}</h2>
            <p className="mt-0.5 font-mono text-[11px] text-cp-stone">{steps[step]}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-cp-stone transition hover:bg-white/5 hover:text-cp-paper"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex overflow-x-auto border-b border-white/10 px-5">
          {steps.map((label, i) => (
            <button
              key={label}
              onClick={() => onStepChange(i)}
              className={`relative shrink-0 px-3 py-2.5 font-mono text-[11.5px] font-medium transition ${
                i === step ? "text-cp-lime" : "text-cp-stone hover:text-cp-paper"
              }`}
            >
              {label}
              {i === step && (
                <motion.div
                  layoutId="step-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-cp-lime"
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          {isLoading && (
            <div className="space-y-4 py-4">
              <ShimmerSkeleton className="h-5 w-3/4" />
              <ShimmerSkeleton className="h-4 w-full" />
              <ShimmerSkeleton className="h-4 w-5/6" />
              <div className="mt-6 space-y-3">
                <ShimmerSkeleton className="h-4 w-1/3" />
                <div className="flex gap-2">
                  <ShimmerSkeleton className="h-7 w-20" />
                  <ShimmerSkeleton className="h-7 w-24" />
                  <ShimmerSkeleton className="h-7 w-16" />
                </div>
              </div>
              <motion.p
                className="mt-6 text-center text-[13px] text-cp-stone"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                Analysing {technologyName}…
              </motion.p>
            </div>
          )}

          {error && !isLoading && (
            <div className="space-y-3 rounded-2xl border border-cp-ember/30 bg-cp-ember/5 p-4">
              <p className="text-sm font-semibold text-cp-ember">
                Live research could not load this topic.
              </p>
              <p className="text-xs leading-5 text-cp-stone">{error.message}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-lg bg-cp-lime px-3 py-2 text-xs font-semibold text-cp-ink"
              >
                Retry live search
              </button>
            </div>
          )}

          {detail && !isLoading && (
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {step === 0 && <StepWhatIsIt detail={detail} />}
                {step === 1 && <StepWhyItMatters detail={detail} />}
                {step === 2 && (
                  <StepShouldILearn
                    detail={detail}
                    onSave={() =>
                      trackMutation.mutate({
                        technologyName: detail.name,
                        status: "want_to_learn",
                      })
                    }
                  />
                )}
                {step === 3 && (
                  <StepHowToLearn
                    detail={detail}
                    onStartLearning={() =>
                      trackMutation.mutate({
                        technologyName: detail.name,
                        status: "learning",
                      })
                    }
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function StepWhatIsIt({ detail }: { detail: TechTrend }) {
  return (
    <div className="space-y-4">
      <p className="text-[14px] leading-relaxed text-cp-paper">{detail.whatItIs}</p>
      {detail.prerequisites.length > 0 && (
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-cp-stone">
            Before you start
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {detail.prerequisites.map((p) => (
              <span
                key={p}
                className="rounded-lg border border-white/10 bg-cp-ink px-2.5 py-1 text-xs text-cp-paper"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepWhyItMatters({ detail }: { detail: TechTrend }) {
  return (
    <div className="space-y-4">
      <p className="text-[14px] leading-relaxed text-cp-paper">{detail.whyItMatters}</p>
      {detail.useCases.length > 0 && (
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-cp-stone">
            Where it&apos;s being used
          </p>
          <ul className="mt-2 space-y-1.5">
            {detail.useCases.map((uc) => (
              <li key={uc} className="flex items-start gap-2 text-[13px] text-cp-paper">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cp-lime" />
                {uc}
              </li>
            ))}
          </ul>
        </div>
      )}
      {detail.careerRelevance && (
        <div className="rounded-2xl border border-white/10 bg-cp-ink px-4 py-3">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-cp-stone">
            Career relevance
          </p>
          <p className="mt-1 font-serif text-[15px] italic leading-relaxed text-cp-paper">{detail.careerRelevance}</p>
        </div>
      )}
    </div>
  );
}

function StepShouldILearn({ detail, onSave }: { detail: TechTrend; onSave: () => void }) {
  const verdict = getLearningVerdict(detail);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cp-lime/25 bg-cp-lime/5 px-4 py-3.5">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-cp-lime">
          {verdict.label}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-cp-paper">{verdict.explanation}</p>
      </div>

      <div className="flex items-center gap-3">
        <ConfidenceBadge confidence={detail.confidence} />
        <span className="font-mono text-[12px] text-cp-stone">
          Trend score: {detail.trendScore}/100
        </span>
      </div>

      <button
        onClick={onSave}
        className="flex items-center gap-1.5 text-[12.5px] font-medium text-cp-stone transition hover:text-cp-lime"
      >
        <Bookmark className="h-3.5 w-3.5" />
        Save for later
      </button>
    </div>
  );
}

function StepHowToLearn({
  detail,
  onStartLearning,
}: {
  detail: TechTrend;
  onStartLearning: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Learning path */}
      {detail.learningPath.length > 0 && (
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-cp-stone">
            How to learn it
          </p>
          <div className="mt-3 space-y-0">
            {detail.learningPath.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cp-lime/10 font-mono text-[11px] font-bold text-cp-lime">
                    {i + 1}
                  </span>
                  {i < detail.learningPath.length - 1 && <div className="h-6 w-px bg-white/10" />}
                </div>
                <p className="pt-1 text-[13px] text-cp-paper">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* First project */}
      {detail.firstProject && (
        <div className="rounded-2xl border border-white/10 bg-cp-ink px-4 py-3.5">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-cp-stone">
            Your first project
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-cp-paper">
            {detail.firstProject}
          </p>
        </div>
      )}

      {/* Sources */}
      {detail.sources.length > 0 && (
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-cp-stone">
            Sources
          </p>
          <div className="mt-2 space-y-1.5">
            {detail.sources.slice(0, 3).map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[12px] text-cp-lime hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="min-w-0">
                  <span className="block truncate">{source.title}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-cp-stone">
                    {source.date ? `Published ${formatSourceDate(source.date)}` : "Live source"}
                  </span>
                  {source.summary && (
                    <span className="mt-1 block line-clamp-2 text-xs leading-4 text-cp-stone">
                      {source.summary}
                    </span>
                  )}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <MagneticButton
        onClick={onStartLearning}
        maxPull={20}
        className="flex items-center gap-1.5 rounded-xl bg-cp-lime px-5 py-2.5 text-[13px] font-semibold text-cp-ink transition hover:-translate-y-0.5"
      >
        Start Learning
        <ArrowRight className="h-3.5 w-3.5" />
      </MagneticButton>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty State                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Globe className="h-8 w-8 text-cp-stone/50" />
      <h3 className="mt-4 text-[15px] font-semibold text-cp-paper">
        We&apos;re researching what&apos;s changing next
      </h3>
      <p className="mt-1.5 max-w-[320px] text-[13px] text-cp-stone">
        New technology intelligence will appear here soon.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    high: "bg-cp-lime/10 text-cp-lime border-cp-lime/30",
    medium: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    low: "bg-white/5 text-cp-stone border-white/10",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium ${colors[confidence] ?? colors["low"]}`}
    >
      {confidence} confidence
    </span>
  );
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    emerging: "Emerging",
    rapid_growth: "Rapid Growth",
    growing: "Growing",
    watch: "Watch",
    declining: "Declining",
  };
  return map[status] ?? status;
}

function formatTrackingStatus(status: string): string {
  const map: Record<string, string> = {
    want_to_learn: "Want to Learn",
    learning: "Learning",
    built_project: "Built a Project",
    completed: "Completed",
  };
  return map[status] ?? status;
}

function formatSourceDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getLearningVerdict(detail: TechTrend): { label: string; explanation: string } {
  if (detail.status === "emerging" || detail.status === "rapid_growth") {
    if (detail.confidence === "high") {
      return {
        label: "Learn Now",
        explanation: `This technology is ${formatStatus(detail.status).toLowerCase()} with high confidence. Understanding it now gives you an early advantage.`,
      };
    }
    return {
      label: "Worth Exploring",
      explanation: `This technology is growing, but it's not yet essential for everyone. Understanding the fundamentals is worth your time before going deeper.`,
    };
  }
  if (detail.status === "growing") {
    return {
      label: "Watch For Now",
      explanation: `This technology is developing steadily. Keep an eye on it, but don't prioritise it over established skills.`,
    };
  }
  return {
    label: "Not a Priority",
    explanation: `This technology doesn't appear to be a priority right now. Focus on core skills first.`,
  };
}