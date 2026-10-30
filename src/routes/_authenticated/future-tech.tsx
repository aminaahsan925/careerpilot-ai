import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Bookmark,
  Building2,
  Code2,
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
        <HeroSection />

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
        {trends && <PulseSection pulse={trends.pulse} fromCache={trends.fromCache} />}

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
              className="mt-6 text-center text-[13px] text-muted-foreground"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              Researching emerging technologies…
            </motion.p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4">
            <p className="text-[13px] font-semibold text-destructive">Couldn't load tech trends</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {error.message}
            </p>
            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                onClick={() => refetch()}
                className="text-[12px] font-semibold text-terracotta hover:underline"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => refresh.mutate()}
                disabled={refresh.isPending}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
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
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-[12.5px] font-medium text-muted-foreground shadow-card transition hover:text-foreground disabled:opacity-50"
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
              className="rounded-xl border border-border bg-card p-8 text-center"
            >
              <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <h3 className="mt-3 text-[15px] font-semibold text-foreground">
                No tracked technologies yet
              </h3>
              <p className="mt-1.5 max-w-[320px] mx-auto text-[13px] text-muted-foreground">
                Switch to &quot;Global&quot; to explore trends, or save technologies from the Global
                view to see them here.
              </p>
              <button
                type="button"
                onClick={() => setMode("global")}
                className="mt-4 rounded-xl bg-terracotta px-4 py-2 text-[12.5px] font-semibold text-primary-foreground transition hover:-translate-y-0.5"
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
/* Hero Section                                                        */
/* ------------------------------------------------------------------ */

function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-muted/20">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Glow orb */}
      <motion.div
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-terracotta/8 blur-3xl sm:h-64 sm:w-64"
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex flex-col gap-8 p-8 sm:flex-row sm:items-center sm:gap-10 sm:p-10 lg:gap-14">
        {/* Text content */}
        <div className="flex-1 space-y-5">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta"
          >
            Future Tech Trends
          </motion.p>

          {/* Title — two separate lines with proper spacing */}
          <div className="space-y-1">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="editorial-title text-[clamp(1.8rem,4vw,2.8rem)]"
            >
              See what technology
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="editorial-title text-[clamp(1.8rem,4vw,2.8rem)]"
            >
              is becoming.
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[480px] text-[14px] leading-relaxed text-muted-foreground"
          >
            Discover important emerging technologies, understand why they matter, and learn what to
            do next.
          </motion.p>

          {/* Decorative tech badges */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap gap-2 pt-1"
          >
            {["AI", "Cloud", "Cybersecurity", "Quantum"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </motion.div>
        </div>

        {/* High-Tech Tech Velocity Radar Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-[320px] shrink-0 sm:mx-0 sm:max-w-[290px] lg:max-w-[320px]"
        >
          <div className="absolute inset-0 rounded-3xl bg-terracotta/15 blur-2xl" />
          <div className="relative overflow-hidden rounded-3xl border border-terracotta/30 bg-ink p-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/70">
                  LIVE TECH VELOCITY RADAR
                </span>
              </div>
              <span className="rounded border border-terracotta/40 bg-terracotta/10 px-2 py-0.5 text-[10px] font-bold text-terracotta">
                Q3 2026
              </span>
            </div>

            {/* Glowing SVG Wave Sparkline & Radar Radar Area */}
            <div className="relative mt-4 flex h-32 w-full flex-col justify-between overflow-hidden rounded-2xl bg-white/[0.03] p-3 border border-white/5">
              {/* Radar Grid Background Lines */}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between opacity-15">
                <div className="h-px w-full bg-white" />
                <div className="h-px w-full bg-white" />
                <div className="h-px w-full bg-white" />
                <div className="h-px w-full bg-white" />
              </div>

              {/* Dynamic SVG Gradient Path */}
              <svg className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 300 100">
                <defs>
                  <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-terracotta)" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="var(--color-terracotta)" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="stroke-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="50%" stopColor="var(--color-terracotta)" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>

                {/* Filled Area */}
                <motion.path
                  initial={{ opacity: 0, d: "M 0 100 L 0 80 Q 50 60 100 75 T 200 35 T 300 15 L 300 100 Z" }}
                  animate={{ opacity: 1, d: "M 0 100 L 0 75 Q 50 45 100 65 T 200 25 T 300 10 L 300 100 Z" }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  fill="url(#sparkline-gradient)"
                />

                {/* Glowing Curved Line */}
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.8, ease: "easeOut" }}
                  d="M 0 75 Q 50 45 100 65 T 200 25 T 300 10"
                  fill="none"
                  stroke="url(#stroke-gradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>

              {/* Glowing Data Nodes */}
              <div className="relative z-10 flex justify-between pt-1">
                <span className="text-[9.5px] font-semibold text-emerald-400">Agentic AI</span>
                <span className="text-[9.5px] font-semibold text-terracotta">Reasoning</span>
                <span className="text-[9.5px] font-semibold text-amber-400">MCP Standard</span>
              </div>

              <div className="relative z-10 flex items-center justify-between text-[11px] font-bold text-white">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>+94% Demand</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                  <span>+88% Adoption</span>
                </div>
              </div>
            </div>

            {/* Micro Metrics Grid */}
            <div className="mt-3.5 grid grid-cols-2 gap-2 text-[10.5px]">
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                <span className="block text-[10px] text-white/50">Top Emerging Paradigm</span>
                <span className="font-bold text-white">Agent Swarms</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                <span className="block text-[10px] text-white/50">Obsolete Tech</span>
                <span className="font-bold text-rose-400">-42% Declining</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Controls Bar                                                        */
/* ------------------------------------------------------------------ */

function ControlsBar({
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
      <div className="flex rounded-xl border border-border bg-card p-1 shadow-card">
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => onModeChange("global")}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-medium transition ${
            mode === "global"
              ? "bg-terracotta text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          Global
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => onModeChange("for-you")}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-medium transition ${
            mode === "for-you"
              ? "bg-terracotta text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
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
          className="appearance-none rounded-xl border border-border bg-card py-2 pl-3.5 pr-9 text-[12.5px] font-medium text-foreground shadow-card outline-none transition hover:border-terracotta/30 focus:border-terracotta"
        >
          {TECH_TREND_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>

      <form
        className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-border bg-card p-1 shadow-card"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <Search className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search live technology or trend"
          aria-label="Search live technology or trend"
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={!searchValue.trim()}
          className="rounded-lg bg-terracotta px-3 py-2 text-[11px] font-semibold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
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

function FrontierRadar({ targetRole }: { targetRole: string }) {
  const role = targetRole.toLowerCase();
  const targetAction = role.includes("data")
    ? "Prioritise model evaluation, data pipelines, vector search, and responsible AI."
    : role.includes("design") || role.includes("frontend")
      ? "Prioritise multimodal interfaces, AI-assisted product workflows, accessibility, and human-centred evaluation."
      : role.includes("devops") || role.includes("cloud")
        ? "Prioritise AI infrastructure, observability, secure deployment, and cost-aware model operations."
        : "Prioritise agent orchestration, tool integration, evaluation, and secure production deployment.";

  return (
    <section className="rounded-2xl border border-terracotta/20 bg-card p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-terracotta">
            Global frontier radar
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
            What the industry is building next
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            Live research is filtered through four strategic lenses so you see company direction and
            career impact, not just a list of tools.
          </p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">
          Research lenses · 2026 → 2030
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {FRONTIER_LENSES.map(({ name, focus, icon: Icon }) => (
          <div
            key={name}
            className="flex gap-3 rounded-xl border border-border bg-secondary/30 p-4 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{name}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{focus}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            The 2030 shift
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            From writing every line to designing, supervising, and evaluating intelligent systems.
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            For {targetRole}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{targetAction}</p>
        </div>
      </div>
    </section>
  );
}

function PulseSection({
  pulse,
  fromCache,
}: {
  pulse: { gainingAttention: number; worthWatching: number; newDevelopments: number };
  fromCache?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="card-surface px-5 py-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Technology Pulse
        </p>
        <PulseBadge variant={fromCache ? "amber" : "emerald"}>
          {fromCache ? "Cached" : "Live"}
        </PulseBadge>
      </div>
      <Stagger className="mt-3 flex flex-wrap gap-4" delay={0.06}>
        {pulse.gainingAttention > 0 && (
          <StaggerItem>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-terracotta" />
              <span className="text-[13px] text-foreground">
                <span className="font-semibold">{pulse.gainingAttention}</span>{" "}
                {pulse.gainingAttention === 1 ? "technology is" : "technologies are"} gaining
                attention
              </span>
            </div>
          </StaggerItem>
        )}
        {pulse.worthWatching > 0 && (
          <StaggerItem>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-clay" />
              <span className="text-[13px] text-foreground">
                <span className="font-semibold">{pulse.worthWatching}</span>{" "}
                {pulse.worthWatching === 1 ? "is" : "are"} worth watching
              </span>
            </div>
          </StaggerItem>
        )}
        {pulse.newDevelopments > 0 && (
          <StaggerItem>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              <span className="text-[13px] text-foreground">
                <span className="font-semibold">{pulse.newDevelopments}</span> new development
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

function FeaturedSection({
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
      className="card-surface overflow-hidden"
    >
      <div className="border-b border-border/50 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-terracotta/10 px-2.5 py-1 text-[11px] font-semibold text-terracotta">
              <Flame className="h-3 w-3" />
              {formatStatus(trend.status)}
            </span>
            <TrendArrow direction={trendDirection[trend.status] ?? "flat"} />
            <span className="text-[11px] text-muted-foreground">{trend.category}</span>
          </div>
          <ConfidenceBadge confidence={trend.confidence} />
        </div>
      </div>

      <div className="px-5 py-5">
        <h2 className="text-[20px] font-bold tracking-tight text-foreground">{trend.name}</h2>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">{trend.whatItIs}</p>

        {trend.whyEmerging && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mt-4 rounded-lg bg-muted/50 px-4 py-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Why it's appearing
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-foreground">
              {trend.whyEmerging}
            </p>
          </motion.div>
        )}

        {trend.sources.length > 0 && (
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Fresh web sources
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {trend.sources.slice(0, 4).map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-border bg-muted/20 p-2.5 transition hover:border-terracotta/40"
                >
                  <span className="block truncate text-[11px] font-semibold text-foreground">
                    {source.title}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-[10px] leading-4 text-muted-foreground">
                    {source.summary}
                  </span>
                  <span className="mt-1 block text-[10px] text-terracotta">
                    {source.date ? formatSourceDate(source.date) : "Live research"}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <motion.button
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.98 }}
            onClick={onExplore}
            className="flex items-center gap-1.5 rounded-xl bg-terracotta px-4 py-2.5 text-[12.5px] font-semibold text-primary-foreground shadow-sm"
          >
            Explore
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.button>

          {trackingStatus ? (
            <span className="text-[12px] text-muted-foreground">
              Tracking:{" "}
              <span className="font-medium text-foreground">
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
              className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition hover:text-terracotta"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Save for later
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Also Watching Section                                               */
/* ------------------------------------------------------------------ */

function AlsoWatchingSection({
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
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Also worth watching
      </h3>
      <Stagger className="mt-3 grid gap-3 sm:grid-cols-2" delay={0.05}>
        {trends.map((trend) => (
          <StaggerItem key={trend.name}>
            <motion.button
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onExplore(trend.name)}
              className="card-surface flex w-full flex-col gap-2 px-4 py-3.5 text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-foreground">{trend.name}</span>
                  <TrendArrow direction={trendDirection[trend.status] ?? "flat"} />
                </div>
                <span className="text-[11px] text-muted-foreground">{trend.category}</span>
              </div>
              <p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                {trend.whatItIs}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                    trend.status === "emerging" || trend.status === "rapid_growth"
                      ? "bg-terracotta/10 text-terracotta"
                      : trend.status === "growing"
                        ? "bg-clay/10 text-clay"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {formatStatus(trend.status)}
                </span>
                {tracking.find((t) => t.technology_name === trend.name) && (
                  <span className="text-[10.5px] text-terracotta">Tracking</span>
                )}
              </div>
            </motion.button>
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm sm:items-center sm:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.25 }}
        className="card-surface w-full max-w-[640px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-foreground">{technologyName}</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{steps[step]}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex border-b border-border/30 px-5">
          {steps.map((label, i) => (
            <button
              key={label}
              onClick={() => onStepChange(i)}
              className={`relative px-3 py-2.5 text-[11.5px] font-medium transition ${
                i === step ? "text-terracotta" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {i === step && (
                <motion.div
                  layoutId="step-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-terracotta"
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
                className="mt-6 text-center text-[13px] text-muted-foreground"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                Analysing {technologyName}…
              </motion.p>
            </div>
          )}

          {error && !isLoading && (
            <div className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-semibold text-destructive">
                Live research could not load this topic.
              </p>
              <p className="text-xs leading-5 text-muted-foreground">{error.message}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-lg bg-terracotta px-3 py-2 text-xs font-semibold text-primary-foreground"
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
      <p className="text-[14px] leading-relaxed text-foreground">{detail.whatItIs}</p>
      {detail.prerequisites.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Before you start
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {detail.prerequisites.map((p) => (
              <span
                key={p}
                className="rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-[11.5px] text-foreground"
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
      <p className="text-[14px] leading-relaxed text-foreground">{detail.whyItMatters}</p>
      {detail.useCases.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Where it's being used
          </p>
          <ul className="mt-2 space-y-1.5">
            {detail.useCases.map((uc) => (
              <li key={uc} className="flex items-start gap-2 text-[13px] text-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" />
                {uc}
              </li>
            ))}
          </ul>
        </div>
      )}
      {detail.careerRelevance && (
        <div className="rounded-lg bg-muted/50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Career relevance
          </p>
          <p className="mt-1 text-[12.5px] text-foreground">{detail.careerRelevance}</p>
        </div>
      )}
    </div>
  );
}

function StepShouldILearn({ detail, onSave }: { detail: TechTrend; onSave: () => void }) {
  const verdict = getLearningVerdict(detail);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-terracotta/20 bg-terracotta/5 px-4 py-3.5">
        <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-terracotta">
          {verdict.label}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">{verdict.explanation}</p>
      </div>

      <div className="flex items-center gap-3">
        <ConfidenceBadge confidence={detail.confidence} />
        <span className="text-[12px] text-muted-foreground">
          Trend score: {detail.trendScore}/100
        </span>
      </div>

      <button
        onClick={onSave}
        className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground transition hover:text-terracotta"
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            How to learn it
          </p>
          <div className="mt-3 space-y-0">
            {detail.learningPath.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-terracotta/10 text-[11px] font-bold text-terracotta">
                    {i + 1}
                  </span>
                  {i < detail.learningPath.length - 1 && <div className="h-6 w-px bg-border" />}
                </div>
                <p className="pt-1 text-[13px] text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* First project */}
      {detail.firstProject && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Your first project
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">
            {detail.firstProject}
          </p>
        </div>
      )}

      {/* Sources */}
      {detail.sources.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Sources
          </p>
          <div className="mt-2 space-y-1.5">
            {detail.sources.slice(0, 3).map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[12px] text-terracotta hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="min-w-0">
                  <span className="block truncate">{source.title}</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {source.date ? `Published ${formatSourceDate(source.date)}` : "Live source"}
                  </span>
                  {source.summary && (
                    <span className="mt-1 block line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                      {source.summary}
                    </span>
                  )}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onStartLearning}
        className="flex items-center gap-1.5 rounded-xl bg-terracotta px-5 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        Start Learning
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty State                                                         */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Globe className="h-8 w-8 text-muted-foreground/50" />
      <h3 className="mt-4 text-[15px] font-semibold text-foreground">
        We're researching what's changing next
      </h3>
      <p className="mt-1.5 max-w-[320px] text-[13px] text-muted-foreground">
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
    high: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${colors[confidence] ?? colors["low"]}`}
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
