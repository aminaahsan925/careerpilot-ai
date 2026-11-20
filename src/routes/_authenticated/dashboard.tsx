/**
 * Dashboard, Direction 3 (Character-Led / Living World).
 *
 * A tilted collage of cards (Bold Personality pattern) on a cream
 * poster board, with the student's personality as the product, and a
 * destinations map strip (Santorini pattern) fed only by the
 * student's real data. All data logic is unchanged from the previous
 * dashboard; this file only re-skins it.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle2,
  Circle,
  FileText,
  Flame,
  FolderOpen,
  MapIcon,
  MessageCircle,
  Mic,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { AppLayout } from "@/components/app/AppLayout";
import { CareerHero } from "@/components/app/CareerHero";
import { Sparkline } from "@/components/app/Sparkline";
import { DestinationsStrip } from "@/components/destinations/DestinationsStrip";
import { greeting, useCurrentUser } from "@/data/user";
import { useCareerOverview } from "@/data/career";
import { useProjects } from "@/data/projects";
import { AnimatedNumber, Stagger, StaggerItem, Skeleton } from "@/lib/animation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard - CareerPilot AI" },
      {
        name: "description",
        content:
          "Track your career score, resume health, roadmap progress and applications in one premium AI career workspace.",
      },
      { property: "og:title", content: "Dashboard - CareerPilot AI" },
      {
        property: "og:description",
        content: "Your AI career command center: scores, roadmap, mentor and applications.",
      },
    ],
  }),
  component: DashboardPage,
});

const statusStyles: Record<string, string> = {
  "Under Review": "bg-[var(--d3-peri)]/30 text-[var(--d3-choco)]",
  Applied: "bg-[var(--d3-leaf)]/25 text-[var(--d3-choco)]",
  "Interview Scheduled": "bg-[var(--d3-choco)] text-[var(--d3-cream)]",
  Offer: "bg-[var(--d3-flame)] text-white",
};

const stateStyles: Record<string, string> = {
  Active: "bg-[var(--d3-mustard)]/40 text-[var(--d3-choco)]",
  "In Progress": "bg-[var(--d3-mustard)]/40 text-[var(--d3-choco)]",
  Upcoming: "bg-[var(--d3-cream)] text-[var(--d3-choco)]/70",
  Completed: "bg-[var(--d3-leaf)]/25 text-[var(--d3-choco)]",
};

/** Accent cycle for score cards, skill bars and application tiles. */
const ACCENTS = [
  { chip: "bg-[var(--d3-mustard)]", line: "var(--d3-flame)", bar: "bg-[var(--d3-flame)]" },
  { chip: "bg-[var(--d3-flame)]", line: "var(--d3-navy)", bar: "bg-[var(--d3-navy)]" },
  { chip: "bg-[var(--d3-leaf)]", line: "var(--d3-leaf)", bar: "bg-[var(--d3-leaf)]" },
  { chip: "bg-[var(--d3-peri)]", line: "var(--d3-peri)", bar: "bg-[var(--d3-peri)]" },
];

/**
 * Tilted card with a soft entrance. The tilt lives on a plain outer
 * div: motion sets an inline transform on its own element, which would
 * override a tilt class applied to the same node.
 */
function TiltCard({
  children,
  className,
  delay = 0,
  tilt,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  tilt?: "l" | "r";
}) {
  return (
    <div className={cn(tilt === "l" ? "d3-tilt-l" : tilt === "r" ? "d3-tilt-r" : "")}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as const }}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        className={cn("d3-card p-5", className)}
      >
        {children}
      </motion.div>
    </div>
  );
}

function SectionHead({ title, to, sub }: { title: string; to?: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <h3 className="d3-display text-[16px] leading-tight">{title}</h3>
        {sub ? (
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--d3-choco)]/70">{sub}</p>
        ) : null}
      </div>
      {to ? (
        <Link
          to={to}
          className="shrink-0 pt-0.5 text-[12px] font-bold text-[var(--d3-flame)] hover:underline"
        >
          View All →
        </Link>
      ) : null}
    </div>
  );
}

function CardEmpty({
  icon: Icon,
  title,
  hint,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  cta?: { label: string; to: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--d3-cream)] text-[var(--d3-choco)]/70">
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>
      <p className="mt-3 text-[13px] font-bold">{title}</p>
      <p className="mt-1 max-w-[240px] text-[12px] leading-relaxed text-[var(--d3-choco)]/70">
        {hint}
      </p>
      {cta ? (
        <Link
          to={cta.to}
          className="mt-3 rounded-lg bg-[var(--d3-choco)] px-3 py-1.5 text-[12px] font-bold text-[var(--d3-cream)] transition-transform hover:-translate-y-0.5"
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}

/** Small hand-drawn scene for the Today's Plan card (sun, hills, path). */
function PlanScene() {
  return (
    <svg viewBox="0 0 130 120" className="h-full w-full" aria-hidden>
      <circle cx="88" cy="30" r="36" fill="var(--d3-mustard)" opacity="0.25" />
      <circle cx="88" cy="30" r="25" fill="var(--d3-mustard)" />
      <path d="M0 88 Q 32 58 66 80 T 130 72 L130 120 L0 120 Z" fill="var(--d3-leaf)" />
      <path d="M0 102 Q 40 82 80 98 T 130 94 L130 120 L0 120 Z" fill="var(--d3-lime)" />
      <path
        d="M28 120 C 38 106 54 102 64 92"
        stroke="var(--d3-paper)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="1 10"
      />
      <circle cx="104" cy="96" r="4" fill="var(--d3-flame)" />
    </svg>
  );
}

/** Hand-drawn scene strip for the motivation band. */
function MotivationScene() {
  return (
    <svg
      viewBox="0 0 320 160"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      aria-hidden
    >
      <rect width="320" height="160" fill="var(--d3-sky)" />
      <circle cx="262" cy="34" r="30" fill="var(--d3-mustard)" opacity="0.3" />
      <circle cx="262" cy="34" r="20" fill="var(--d3-mustard)" />
      <g fill="#ffffff" opacity="0.9">
        <ellipse cx="70" cy="30" rx="34" ry="11" />
        <ellipse cx="92" cy="22" rx="22" ry="9" />
      </g>
      <path d="M0 118 Q 80 70 170 104 T 320 92 L320 160 L0 160 Z" fill="var(--d3-leaf)" />
      <path d="M0 134 Q 100 100 200 126 T 320 120 L320 160 L0 160 Z" fill="var(--d3-lime)" />
      <path
        d="M40 160 C 70 140 110 136 140 122"
        stroke="var(--d3-paper)"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="1 12"
      />
      <g transform="rotate(14 210 60)">
        <path d="M210 60 L252 68 L216 80 Z" fill="var(--d3-paper)" />
        <path d="M210 60 L216 80 L226 72 Z" fill="var(--d3-flame)" />
      </g>
      <g stroke="var(--d3-choco)" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M140 44 q7 -7 14 0 q7 -7 14 0" />
      </g>
    </svg>
  );
}

function DashboardPage() {
  const {
    data: user,
    isLoading,
    isError,
    error,
    refetch,
  } = useCurrentUser();
  const { data: overview } = useCareerOverview();
  const { data: projects } = useProjects();
  const hasProjects = (projects?.length ?? 0) > 0;
  const hasResume = overview?.hasResume ?? false;

  if (isLoading) {
    return (
      <AppLayout title="Loading" subtitle="Preparing your workspace">
        <div className="rounded-3xl bg-[var(--d3-cream)] p-3 sm:p-5">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // The query failed (or returned no user), so show a recoverable error
  // state instead of an endless skeleton.
  if (isError || !user) {
    return (
      <AppLayout title="Dashboard" subtitle="">
        <div className="d3-card mx-auto max-w-lg p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--d3-mustard)]/40 text-[var(--d3-choco)]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="d3-display mt-4 text-[19px]">Couldn&apos;t load your workspace</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--d3-choco)]/70">
            {error instanceof Error
              ? error.message
              : "Something went wrong while loading your profile. This is usually temporary."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--d3-choco)] px-5 py-2.5 text-[13px] font-bold text-[var(--d3-cream)] transition-transform hover:-translate-y-0.5"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      </AppLayout>
    );
  }

  const scoreIcons = [Target, FileText, Mic, Sparkles];
  const mainBlocker =
    overview?.diagnosis?.blockers[0]?.problem ??
    overview?.readiness?.blockers[0]?.problem ??
    "Run a diagnosis to identify your biggest blocker.";
  const nextAction =
    overview?.diagnosis?.nextBestAction?.action ??
    overview?.readiness?.nextAction ??
    "Set a target role to begin your readiness assessment.";

  return (
    <AppLayout
      title={
        <span>
          {greeting()}, {user.firstName}
          <span className="ml-1 align-top text-sm text-[var(--d3-flame)]">✳</span>
        </span>
      }
      subtitle="Let's continue building your amazing career"
    >
      {/* Cream poster board: the tilted collage lives on it. */}
      <div className="space-y-5 overflow-x-clip rounded-3xl bg-[var(--d3-cream)] p-3 sm:p-5">
        {/* SCORE CARDS: staggered entrance with animated counters */}
        {user.scores.length ? (
          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" delay={0.08}>
            {user.scores.map((score, i) => {
              const Icon = scoreIcons[i] ?? Target;
              const accent = ACCENTS[i % ACCENTS.length] ?? ACCENTS[0]!;
              return (
                <StaggerItem key={score.label}>
                  <div
                    className={cn(
                      "d3-card p-5 transition-shadow hover:shadow-lift",
                      i % 2 === 0 ? "d3-tilt-l" : "d3-tilt-r",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg text-[var(--d3-choco)]",
                            accent.chip,
                          )}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.8} />
                        </span>
                        <p className="text-[13.5px] font-bold">{score.label}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[34px] font-bold leading-none tracking-[-0.03em]">
                          <AnimatedNumber value={score.value} duration={1.4} />
                          <span className="ml-1 text-[13px] font-medium text-[var(--d3-choco)]/60">
                            /{score.max}
                          </span>
                        </p>
                      </div>
                      <Sparkline
                        data={score.trend}
                        color={accent.line}
                        className="h-10 w-[96px]"
                      />
                    </div>

                    <p className="mt-3 flex items-center gap-1 text-[12px] text-[var(--d3-choco)]/70">
                      {i === 0 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-[var(--d3-flame)]" />
                      ) : null}
                      {score.note}
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        ) : (
          <div className="d3-card flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--d3-mustard)]/40 text-[var(--d3-choco)]">
                <Target className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-[13.5px] font-bold">No scores yet</p>
                <p className="mt-0.5 text-[12px] text-[var(--d3-choco)]/70">
                  Run your first diagnosis to unlock readiness, skills and evidence scores.
                </p>
              </div>
            </div>
            <Link
              to="/diagnosis"
              className="rounded-lg bg-[var(--d3-choco)] px-3.5 py-2 text-[12.5px] font-bold text-[var(--d3-cream)] transition-transform hover:-translate-y-0.5"
            >
              Run diagnosis →
            </Link>
          </div>
        )}

        {/* HERO + DIAGNOSIS */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="d3-tilt-l">
            <CareerHero />
          </div>

          <TiltCard className="flex flex-col" delay={0.3} tilt="r">
            <div className="flex items-center justify-between">
              <h3 className="d3-display text-[16px]">Career diagnosis</h3>
              <span className="flex items-center gap-1.5 text-[12px] text-[var(--d3-choco)]/70">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--d3-leaf)]" /> Online
              </span>
            </div>

            <div className="mt-5 flex-1 space-y-4">
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--d3-choco)] text-[var(--d3-cream)]">
                  <Sparkles className="h-4 w-4" />
                </span>
                <p className="rounded-xl rounded-tl-sm bg-[var(--d3-cream)] px-4 py-3 text-[12.5px] leading-relaxed">
                  <span className="font-bold">Career stage: </span>
                  {overview?.readiness?.stage ?? "Not assessed yet"}
                </p>
              </div>

              <div className="flex justify-end">
                <p className="rounded-xl rounded-tr-sm bg-[var(--d3-flame)] px-4 py-2.5 text-[12.5px] font-medium text-white">
                  {mainBlocker}
                </p>
              </div>

              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--d3-choco)] text-[var(--d3-cream)]">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="rounded-xl rounded-tl-sm bg-[var(--d3-cream)] px-4 py-3 text-[12.5px] leading-relaxed">
                    <span className="font-bold">Do this next: </span>
                    {nextAction}
                  </p>
                  <Link
                    to="/diagnosis"
                    className="mt-3 inline-block rounded-lg border border-[var(--d3-flame)] px-3 py-1.5 text-[12px] font-bold text-[var(--d3-flame)] transition-colors hover:bg-[var(--d3-flame)]/10"
                  >
                    Run full diagnosis
                  </Link>
                </div>
              </div>
            </div>

            <Link to="/mentor" className="mt-5 flex items-center gap-2">
              <span className="flex-1 rounded-xl border border-[var(--d3-choco)]/15 bg-[var(--d3-cream)] px-4 py-3 text-[12.5px] text-[var(--d3-choco)]/70">
                Ask me anything...
              </span>
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--d3-flame)] text-white"
              >
                <Send className="h-4 w-4" />
              </motion.span>
            </Link>
          </TiltCard>
        </div>

        {/* DESTINATIONS MAP: industries and companies as places to explore */}
        <DestinationsStrip
          targetRole={overview?.targetRole ?? user.goal}
          targetIndustry={user.targetIndustry}
          applications={user.applications}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
          {/* LEFT COLUMN */}
          <div className="min-w-0 space-y-4">
            {/* TECH EVENTS BANNER */}
            <TiltCard className="p-4 sm:p-5" delay={0.1} tilt="l">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--d3-mustard)]/40 text-[var(--d3-choco)]">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-[var(--d3-mustard)]/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--d3-choco)]">
                        Live Tech Ecosystem
                      </span>
                      <span className="text-[12px] font-semibold text-[var(--d3-choco)]/70">
                        Gemini Grounded Events
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium">
                      Inspect upcoming student hackathons and workshops, and pin the ones you
                      want to attend.
                    </p>
                  </div>
                </div>
                <Link
                  to="/events"
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--d3-flame)] px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-[var(--d3-flame)]/90"
                >
                  Explore Tech Events →
                </Link>
              </div>
            </TiltCard>

            {/* THREE-COLUMN SECTION */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* ROADMAP */}
              <TiltCard delay={0.1} tilt="r">
                <SectionHead title="Recommended Roadmap" to="/roadmap" />
                {user.roadmap.length ? (
                  <Stagger className="mt-4 space-y-1" delay={0.07}>
                    {user.roadmap.map((step, i) => (
                      <StaggerItem
                        key={step.title}
                        className={cn(
                          "flex items-center gap-3 py-3",
                          i > 0 && "border-t border-[var(--d3-choco)]/10",
                        )}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--d3-cream)]">
                          <MapIcon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold">{step.title}</p>
                          {i === 0 ? (
                            <p className="text-[12px] text-[var(--d3-choco)]/70">{step.meta}</p>
                          ) : null}
                        </div>
                        {i === 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-14 overflow-hidden rounded-full bg-[var(--d3-cream)]">
                              <motion.span
                                initial={{ width: 0 }}
                                animate={{ width: `${step.progress}%` }}
                                transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="block h-full rounded-full bg-[var(--d3-flame)]"
                              />
                            </span>
                            <span className="text-[12px] font-bold">{step.progress}%</span>
                          </div>
                        ) : (
                          <span
                            className={cn(
                              "rounded-md px-2 py-1 text-[12px] font-bold",
                              stateStyles[step.state],
                            )}
                          >
                            {step.state}
                          </span>
                        )}
                      </StaggerItem>
                    ))}
                  </Stagger>
                ) : (
                  <CardEmpty
                    icon={MapIcon}
                    title="No roadmap yet"
                    hint="Generate a roadmap from your diagnosis to see your learning stages here."
                    cta={{ label: "Build roadmap →", to: "/roadmap" }}
                  />
                )}
              </TiltCard>

              {/* APPLICATIONS */}
              <TiltCard delay={0.2} tilt="l">
                <SectionHead title="Recent Applications" />
                {user.applications.length ? (
                  <Stagger className="mt-4 space-y-1" delay={0.07}>
                    {user.applications.map((app, i) => {
                      const accent = ACCENTS[i % ACCENTS.length] ?? ACCENTS[0]!;
                      return (
                        <StaggerItem
                          key={app.company}
                          className={cn(
                            "flex items-center gap-3 py-3.5",
                            i > 0 && "border-t border-[var(--d3-choco)]/10",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold text-[var(--d3-choco)]",
                              accent.chip,
                            )}
                          >
                            {app.initials}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold">{app.company}</p>
                            <p className="truncate text-[12px] text-[var(--d3-choco)]/70">
                              {app.role}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-md px-2 py-1 text-[12px] font-bold",
                              statusStyles[app.status],
                            )}
                          >
                            {app.status}
                          </span>
                        </StaggerItem>
                      );
                    })}
                  </Stagger>
                ) : (
                  <CardEmpty
                    icon={Briefcase}
                    title="No applications tracked"
                    hint="Explore the market to find roles worth applying to, and they'll show up here."
                    cta={{ label: "Explore market →", to: "/market" }}
                  />
                )}
              </TiltCard>

              {/* SKILLS: personality as the product */}
              <TiltCard delay={0.3} tilt="r">
                <SectionHead
                  title="What makes you, you"
                  to="/resume"
                  sub="Your personality is the hireable part. These skills back it up."
                />
                <div className="mt-4 space-y-3.5">
                  {user.skills.length ? (
                    user.skills.map((skill, i) => {
                      const accent = ACCENTS[i % ACCENTS.length] ?? ACCENTS[0]!;
                      return (
                        <motion.div
                          key={skill.name}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.06, duration: 0.3 }}
                          className="flex items-center gap-3"
                        >
                          <p className="w-[110px] shrink-0 truncate text-[12.5px]">{skill.name}</p>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--d3-cream)]">
                            <motion.span
                              initial={{ width: 0 }}
                              animate={{ width: `${skill.level}%` }}
                              transition={{
                                duration: 0.7,
                                delay: 0.4 + i * 0.06,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              className={cn("block h-full rounded-full", accent.bar)}
                            />
                          </span>
                          <span className="w-9 shrink-0 text-right text-[12px] font-bold">
                            {skill.level}%
                          </span>
                        </motion.div>
                      );
                    })
                  ) : (
                    <CardEmpty
                      icon={Sparkles}
                      title="No skills added yet"
                      hint="Pick the tools you know during onboarding and your skill profile appears here."
                      cta={{ label: "Add skills →", to: "/onboarding" }}
                    />
                  )}
                </div>
              </TiltCard>
            </div>

            {/* MARKET REALITY BANNER */}
            <TiltCard delay={0.15} tilt="l">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--d3-navy)] text-white">
                    <BarChart3 className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <div>
                    <h3 className="d3-display text-[15px]">Market Reality</h3>
                    {user.goal ? (
                      <p className="text-[12px] text-[var(--d3-choco)]/70">
                        What employers actually demand for{" "}
                        <span className="font-bold text-[var(--d3-choco)]">{user.goal}</span>
                      </p>
                    ) : (
                      <p className="text-[12px] text-[var(--d3-choco)]/70">
                        See what the real job market requires. No sugar-coating.
                      </p>
                    )}
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/market"
                    className="shrink-0 rounded-lg bg-[var(--d3-flame)] px-3 py-1.5 text-[12px] font-bold text-white"
                  >
                    See the truth →
                  </Link>
                </motion.div>
              </div>
            </TiltCard>

            {/* EVIDENCE CTA */}
            {!hasResume && !hasProjects && (
              <TiltCard delay={0.2} tilt="r">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--d3-flame)]/15 text-[var(--d3-flame)]">
                    <FolderOpen className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <div className="flex-1">
                    <h3 className="d3-display text-[15px]">You have zero evidence</h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-[var(--d3-choco)]/70">
                      Right now every skill on your profile is a claim. No resume. No projects.
                      No proof. Recruiters need evidence, and you have none. Fix this today.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Link
                          to="/onboarding"
                          className="rounded-lg bg-[var(--d3-flame)] px-3 py-1.5 text-[12px] font-bold text-white"
                        >
                          Add projects now →
                        </Link>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Link
                          to="/resume"
                          className="rounded-lg border border-[var(--d3-choco)]/20 px-3 py-1.5 text-[12px] font-bold text-[var(--d3-choco)]/70 transition-colors hover:border-[var(--d3-flame)] hover:text-[var(--d3-flame)]"
                        >
                          Upload resume
                        </Link>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </TiltCard>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            <TiltCard className="overflow-hidden p-0" delay={0.15} tilt="r">
              <div className="flex items-center justify-between px-5 pt-5">
                <h3 className="d3-display text-[16px]">Today&apos;s Plan</h3>
                <Calendar className="h-4 w-4 text-[var(--d3-choco)]/60" />
              </div>

              <div className="relative mt-3 flex items-end justify-between px-5">
                <div className="pb-4">
                  <p className="text-[34px] font-bold leading-none tracking-[-0.03em]">
                    {user.planDate.day}
                  </p>
                  <p className="mt-1 text-[12.5px] text-[var(--d3-choco)]/70">
                    {user.planDate.month}
                  </p>
                </div>
                <div className="relative h-[120px] w-[130px] shrink-0">
                  <PlanScene />
                </div>
              </div>

              {user.plan.length ? (
                <Stagger
                  className="space-y-3.5 border-t border-[var(--d3-choco)]/10 px-5 py-4"
                  delay={0.06}
                >
                  {user.plan.map((item) => (
                    <StaggerItem key={item.id} className="flex items-center gap-2.5">
                      {item.done ? (
                        <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-[var(--d3-leaf)]" />
                      ) : (
                        <Circle className="h-[18px] w-[18px] shrink-0 text-[var(--d3-choco)]/40" />
                      )}
                      <p
                        className={cn(
                          "text-[12.5px]",
                          item.done
                            ? "text-[var(--d3-choco)]"
                            : "text-[var(--d3-choco)]/70",
                        )}
                      >
                        {item.label}
                      </p>
                    </StaggerItem>
                  ))}
                  <Link
                    to="/roadmap"
                    className="inline-block pt-1 text-[12px] font-bold text-[var(--d3-flame)] hover:underline"
                  >
                    View Full Plan →
                  </Link>
                </Stagger>
              ) : (
                <div className="border-t border-[var(--d3-choco)]/10 px-5 py-4">
                  <CardEmpty
                    icon={Calendar}
                    title="No plan yet"
                    hint="Generate your roadmap to unlock weekly goals that show up here."
                    cta={{ label: "Build roadmap →", to: "/roadmap" }}
                  />
                </div>
              )}
            </TiltCard>

            <div className="d3-tilt-l">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
                className="rounded-2xl bg-[var(--d3-choco)] p-5 text-[var(--d3-cream)] shadow-[0_2px_6px_rgba(18,18,18,0.05),0_18px_40px_-22px_rgba(18,18,18,0.25)]"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="d3-display text-[15px]">AI Resume Review</h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--d3-cream)]/70">
                      {!hasResume
                        ? "You haven't uploaded a resume yet. Without one, you're invisible to ATS systems."
                        : "Get your resume analyzed and find out exactly where it falls short."}
                    </p>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    to="/resume"
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--d3-flame)] px-4 py-2.5 text-[13px] font-bold text-white"
                  >
                    {hasResume ? "Re-analyze Resume →" : "Upload Resume →"}
                  </Link>
                </motion.div>
              </motion.div>
            </div>

            <TiltCard delay={0.35} tilt="r">
              <h3 className="d3-display text-[16px]">Quick Actions</h3>
              <Stagger className="mt-4 grid grid-cols-3 gap-2" delay={0.05}>
                {[
                  { label: "AI Chat", icon: MessageCircle, to: "/mentor" },
                  { label: "Roadmap", icon: MapIcon, to: "/roadmap" },
                  { label: "Market Reality", icon: BarChart3, to: "/market" },
                  { label: "Recruiter Audit", icon: Mic, to: "/recruiter" },
                  { label: "Resume Review", icon: FileText, to: "/resume" },
                  { label: "Diagnosis", icon: Target, to: "/diagnosis" },
                ].map(({ label, icon: Icon, to }) => (
                  <StaggerItem key={label}>
                    <Link
                      to={to}
                      className="flex flex-col items-center gap-2 rounded-xl border border-[var(--d3-choco)]/15 px-2 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-[var(--d3-flame)]/50 hover:shadow-lift"
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.7} />
                      <span className="text-[12px] leading-tight text-[var(--d3-choco)]/70">
                        {label}
                      </span>
                    </Link>
                  </StaggerItem>
                ))}
              </Stagger>
            </TiltCard>
          </div>
        </div>

        {/* MOTIVATION */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="grid overflow-hidden rounded-2xl bg-[var(--d3-choco)] text-[var(--d3-cream)] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_260px]"
        >
          <div className="flex items-start gap-4 p-8">
            <span className="text-4xl leading-none text-[var(--d3-mustard)]">"</span>
            <p className="max-w-md">
              <span className="text-[19px] font-semibold leading-snug">
                The only way to do great work is to love what you do.
              </span>
              <span className="mt-3 block text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--d3-mustard)]">
                Steve Jobs
              </span>
            </p>
          </div>

          <div className="flex flex-col justify-center gap-2 border-white/10 p-8 lg:border-l">
            <p className="text-[13.5px] font-bold">
              Daily <span className="text-[var(--d3-mustard)]">Reality Check</span>
            </p>
            <p className="text-[13px] leading-relaxed text-[var(--d3-cream)]/70">
              The market doesn't care about your feelings. Build proof or get left behind.
            </p>
          </div>

          <div className="hidden h-full min-h-[160px] lg:block">
            <MotivationScene />
          </div>
        </motion.section>
      </div>
    </AppLayout>
  );
}
