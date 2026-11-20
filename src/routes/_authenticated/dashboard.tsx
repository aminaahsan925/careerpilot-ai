/**
 * Dashboard, Round 3 (Cursor as Flashlight / Lens).
 *
 * A disciplined dark grid of spotlight cards on a near-black ground,
 * with the destinations strip fed only by the student's real data.
 * All data logic is unchanged from the previous dashboard; this file
 * only re-skins it.
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
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import { MagneticCTA } from "@/components/magnetic-cta";
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
  "Under Review": "bg-cp-stone/30 text-cp-paper",
  Applied: "bg-cp-lime2/25 text-cp-paper",
  "Interview Scheduled": "bg-cp-lime text-cp-ink",
  Offer: "bg-cp-ember text-cp-ink",
};

const stateStyles: Record<string, string> = {
  Active: "bg-cp-lime/40 text-cp-paper",
  "In Progress": "bg-cp-lime/40 text-cp-paper",
  Upcoming: "bg-cp-paper/10 text-cp-stone",
  Completed: "bg-cp-lime2/25 text-cp-paper",
};

/** Accent cycle for score cards, skill bars and application tiles. */
const ACCENTS = [
  { chip: "bg-cp-lime text-cp-ink", line: "var(--cp-lime)", bar: "bg-cp-lime" },
  { chip: "bg-cp-ember text-cp-ink", line: "var(--cp-ember)", bar: "bg-cp-ember" },
  { chip: "bg-cp-lime2 text-cp-ink", line: "var(--cp-lime2)", bar: "bg-cp-lime2" },
  { chip: "bg-cp-stone text-cp-ink", line: "var(--cp-stone)", bar: "bg-cp-stone" },
];

/**
 * Spotlight card with a soft entrance. The motion wrapper owns the
 * entrance and hover lift; the spotlight border lives on the card.
 */
function DashCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as const }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <SpotlightCard className={cn("card-surface p-5", className)}>{children}</SpotlightCard>
    </motion.div>
  );
}

function SectionHead({ title, to, sub }: { title: string; to?: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <h3 className="font-display text-[16px] leading-tight">{title}</h3>
        {sub ? (
          <p className="mt-1 text-[12px] leading-relaxed text-cp-paper/70">{sub}</p>
        ) : null}
      </div>
      {to ? (
        <Link
          to={to}
          className="shrink-0 pt-0.5 text-[12px] font-bold text-cp-lime hover:underline"
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
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cp-ink text-cp-paper/70">
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>
      <p className="mt-3 text-[13px] font-bold">{title}</p>
      <p className="mt-1 max-w-[240px] text-[12px] leading-relaxed text-cp-paper/70">
        {hint}
      </p>
      {cta ? (
        <MagneticCTA
          href={cta.to}
          className="mt-3 rounded-lg bg-cp-lime px-3 py-1.5 text-[12px] font-bold text-cp-ink transition-colors hover:bg-cp-lime/90"
        >
          {cta.label}
        </MagneticCTA>
      ) : null}
    </div>
  );
}

/** Small abstract scene for the Today's Plan card: a rising signal line. */
function PlanScene() {
  return (
    <svg viewBox="0 0 130 120" className="h-full w-full" aria-hidden>
      <g fill="var(--cp-paper)" opacity="0.25">
        <circle cx="18" cy="18" r="1.5" />
        <circle cx="48" cy="10" r="1.5" />
        <circle cx="84" cy="18" r="1.5" />
        <circle cx="114" cy="10" r="1.5" />
        <circle cx="30" cy="44" r="1.5" />
        <circle cx="104" cy="40" r="1.5" />
      </g>
      <path
        d="M8 96 L38 74 L64 82 L92 48 L122 30"
        fill="none"
        stroke="var(--cp-lime)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 96 L38 74 L64 82 L92 48 L122 30 L122 120 L8 120 Z"
        fill="var(--cp-lime)"
        opacity="0.08"
      />
      <circle cx="122" cy="30" r="4" fill="var(--cp-lime)" />
      <circle cx="122" cy="30" r="9" fill="none" stroke="var(--cp-lime)" strokeOpacity="0.4" strokeWidth="1.5" />
      <line x1="8" y1="112" x2="122" y2="112" stroke="var(--cp-paper)" strokeOpacity="0.2" strokeWidth="1.5" />
    </svg>
  );
}

/** Abstract scene strip for the motivation band: a lime horizon line. */
function MotivationScene() {
  return (
    <svg
      viewBox="0 0 320 160"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      aria-hidden
    >
      <rect width="320" height="160" fill="var(--cp-ink)" />
      <g fill="var(--cp-paper)" opacity="0.22">
        <circle cx="24" cy="22" r="1.6" />
        <circle cx="72" cy="14" r="1.6" />
        <circle cx="128" cy="26" r="1.6" />
        <circle cx="188" cy="14" r="1.6" />
        <circle cx="244" cy="24" r="1.6" />
        <circle cx="296" cy="16" r="1.6" />
        <circle cx="52" cy="52" r="1.6" />
        <circle cx="160" cy="56" r="1.6" />
        <circle cx="268" cy="50" r="1.6" />
      </g>
      <circle cx="262" cy="34" r="18" fill="var(--cp-lime)" opacity="0.9" />
      <circle cx="262" cy="34" r="28" fill="var(--cp-lime)" opacity="0.12" />
      <path
        d="M0 118 L70 96 L140 108 L210 78 L320 92"
        fill="none"
        stroke="var(--cp-lime)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M0 118 L70 96 L140 108 L210 78 L320 92 L320 160 L0 160 Z"
        fill="var(--cp-lime)"
        opacity="0.07"
      />
      <path
        d="M0 138 L90 122 L180 132 L320 118"
        fill="none"
        stroke="var(--cp-paper)"
        strokeOpacity="0.25"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="210" cy="78" r="4" fill="var(--cp-ember)" />
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
        <div className="rounded-3xl bg-cp-ink p-3 sm:p-5">
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
        <div className="card-surface mx-auto max-w-lg p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cp-lime/40 text-cp-paper">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="font-display mt-4 text-[19px]">Couldn&apos;t load your workspace</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-cp-paper/70">
            {error instanceof Error
              ? error.message
              : "Something went wrong while loading your profile. This is usually temporary."}
          </p>
          <MagneticCTA
            onClick={() => void refetch()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cp-lime px-5 py-2.5 text-[13px] font-bold text-cp-ink transition-colors hover:bg-cp-lime/90"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </MagneticCTA>
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
          <span className="ml-1 align-top text-sm text-cp-lime">✳</span>
        </span>
      }
      subtitle="Let's continue building your amazing career"
    >
      {/* Dark ground: the spotlight cards live on it. */}
      <div className="space-y-5 overflow-x-clip p-3 sm:p-5">
        {/* SCORE CARDS: staggered entrance with animated counters */}
        {user.scores.length ? (
          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" delay={0.08}>
            {user.scores.map((score, i) => {
              const Icon = scoreIcons[i] ?? Target;
              const accent = ACCENTS[i % ACCENTS.length] ?? ACCENTS[0]!;
              return (
                <StaggerItem key={score.label}>
                  <SpotlightCard className="card-surface p-5 transition-shadow hover:shadow-lift">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
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
                          <span className="ml-1 text-[13px] font-medium text-cp-paper/60">
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

                    <p className="mt-3 flex items-center gap-1 text-[12px] text-cp-paper/70">
                      {i === 0 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-cp-ember" />
                      ) : null}
                      {score.note}
                    </p>
                  </SpotlightCard>
                </StaggerItem>
              );
            })}
          </Stagger>
        ) : (
          <div className="card-surface flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-lime/40 text-cp-paper">
                <Target className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-[13.5px] font-bold">No scores yet</p>
                <p className="mt-0.5 text-[12px] text-cp-paper/70">
                  Run your first diagnosis to unlock readiness, skills and evidence scores.
                </p>
              </div>
            </div>
            <MagneticCTA
              href="/diagnosis"
              className="rounded-lg bg-cp-lime px-3.5 py-2 text-[12.5px] font-bold text-cp-ink transition-colors hover:bg-cp-lime/90"
            >
              Run diagnosis →
            </MagneticCTA>
          </div>
        )}

        {/* HERO + DIAGNOSIS */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <CareerHero />

          <DashCard className="flex flex-col" delay={0.3}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[16px]">Career diagnosis</h3>
              <span className="flex items-center gap-1.5 text-[12px] text-cp-paper/70">
                <span className="h-1.5 w-1.5 rounded-full bg-cp-lime2" /> Online
              </span>
            </div>

            <div className="mt-5 flex-1 space-y-4">
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cp-ink text-cp-paper">
                  <Sparkles className="h-4 w-4" />
                </span>
                <p className="rounded-xl rounded-tl-sm bg-cp-ink px-4 py-3 text-[12.5px] leading-relaxed">
                  <span className="font-bold">Career stage: </span>
                  {overview?.readiness?.stage ?? "Not assessed yet"}
                </p>
              </div>

              <div className="flex justify-end">
                <p className="rounded-xl rounded-tr-sm bg-cp-lime px-4 py-2.5 text-[12.5px] font-medium text-cp-ink">
                  {mainBlocker}
                </p>
              </div>

              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cp-ink text-cp-paper">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="rounded-xl rounded-tl-sm bg-cp-ink px-4 py-3 text-[12.5px] leading-relaxed">
                    <span className="font-bold">Do this next: </span>
                    {nextAction}
                  </p>
                  <Link
                    to="/diagnosis"
                    className="mt-3 inline-block rounded-lg border border-cp-lime px-3 py-1.5 text-[12px] font-bold text-cp-lime transition-colors hover:bg-cp-lime/10"
                  >
                    Run full diagnosis
                  </Link>
                </div>
              </div>
            </div>

            <Link to="/mentor" className="mt-5 flex items-center gap-2">
              <span className="flex-1 rounded-xl border border-cp-paper/15 bg-cp-ink px-4 py-3 text-[12.5px] text-cp-paper/70">
                Ask me anything...
              </span>
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-cp-lime text-cp-ink"
              >
                <Send className="h-4 w-4" />
              </motion.span>
            </Link>
          </DashCard>
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
            <DashCard className="p-4 sm:p-5" delay={0.1}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-lime/40 text-cp-paper">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-cp-lime/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-cp-paper">
                        Live Tech Ecosystem
                      </span>
                      <span className="text-[12px] font-semibold text-cp-paper/70">
                        Gemini Grounded Events
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium">
                      Inspect upcoming student hackathons and workshops, and pin the ones you
                      want to attend.
                    </p>
                  </div>
                </div>
                <MagneticCTA
                  href="/events"
                  wrapperClassName="shrink-0"
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-cp-lime px-4 py-2 text-xs font-bold text-cp-ink shadow-xs transition-colors hover:bg-cp-lime/90"
                >
                  Explore Tech Events →
                </MagneticCTA>
              </div>
            </DashCard>

            {/* THREE-COLUMN SECTION */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* ROADMAP */}
              <DashCard delay={0.1}>
                <SectionHead title="Recommended Roadmap" to="/roadmap" />
                {user.roadmap.length ? (
                  <Stagger className="mt-4 space-y-1" delay={0.07}>
                    {user.roadmap.map((step, i) => (
                      <StaggerItem
                        key={step.title}
                        className={cn(
                          "flex items-center gap-3 py-3",
                          i > 0 && "border-t border-cp-paper/10",
                        )}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cp-ink">
                          <MapIcon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold">{step.title}</p>
                          {i === 0 ? (
                            <p className="text-[12px] text-cp-paper/70">{step.meta}</p>
                          ) : null}
                        </div>
                        {i === 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-14 overflow-hidden rounded-full bg-cp-ink">
                              <motion.span
                                initial={{ width: 0 }}
                                animate={{ width: `${step.progress}%` }}
                                transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="block h-full rounded-full bg-cp-lime"
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
              </DashCard>

              {/* APPLICATIONS */}
              <DashCard delay={0.2}>
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
                            i > 0 && "border-t border-cp-paper/10",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold",
                              accent.chip,
                            )}
                          >
                            {app.initials}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold">{app.company}</p>
                            <p className="truncate text-[12px] text-cp-paper/70">
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
              </DashCard>

              {/* SKILLS: evidence behind the claims */}
              <DashCard delay={0.3}>
                <SectionHead
                  title="Your skills, with evidence"
                  to="/resume"
                  sub="Skills from your profile, and the proof behind them."
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
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cp-ink">
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
              </DashCard>
            </div>

            {/* MARKET REALITY BANNER */}
            <DashCard delay={0.15}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cp-lime text-cp-ink">
                    <BarChart3 className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <div>
                    <h3 className="font-display text-[15px]">Market Reality</h3>
                    {user.goal ? (
                      <p className="text-[12px] text-cp-paper/70">
                        What employers actually demand for{" "}
                        <span className="font-bold text-cp-paper">{user.goal}</span>
                      </p>
                    ) : (
                      <p className="text-[12px] text-cp-paper/70">
                        See what the real job market requires. No sugar-coating.
                      </p>
                    )}
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <MagneticCTA
                    href="/market"
                    className="shrink-0 rounded-lg bg-cp-lime px-3 py-1.5 text-[12px] font-bold text-cp-ink"
                  >
                    See the truth →
                  </MagneticCTA>
                </motion.div>
              </div>
            </DashCard>

            {/* EVIDENCE CTA */}
            {!hasResume && !hasProjects && (
              <DashCard delay={0.2}>
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cp-ember/15 text-cp-ember">
                    <FolderOpen className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <div className="flex-1">
                    <h3 className="font-display text-[15px]">You have zero evidence</h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-cp-paper/70">
                      Right now every skill on your profile is a claim. No resume. No projects.
                      No proof. Recruiters need evidence, and you have none. Fix this today.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <MagneticCTA
                          href="/onboarding"
                          className="rounded-lg bg-cp-lime px-3 py-1.5 text-[12px] font-bold text-cp-ink"
                        >
                          Add projects now →
                        </MagneticCTA>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Link
                          to="/resume"
                          className="rounded-lg border border-cp-paper/20 px-3 py-1.5 text-[12px] font-bold text-cp-paper/70 transition-colors hover:border-cp-lime hover:text-cp-lime"
                        >
                          Upload resume
                        </Link>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </DashCard>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            <DashCard className="overflow-hidden p-0" delay={0.15}>
              <div className="flex items-center justify-between px-5 pt-5">
                <h3 className="font-display text-[16px]">Today&apos;s Plan</h3>
                <Calendar className="h-4 w-4 text-cp-paper/60" />
              </div>

              <div className="relative mt-3 flex items-end justify-between px-5">
                <div className="pb-4">
                  <p className="text-[34px] font-bold leading-none tracking-[-0.03em]">
                    {user.planDate.day}
                  </p>
                  <p className="mt-1 text-[12.5px] text-cp-paper/70">
                    {user.planDate.month}
                  </p>
                </div>
                <div className="relative h-[120px] w-[130px] shrink-0">
                  <PlanScene />
                </div>
              </div>

              {user.plan.length ? (
                <Stagger
                  className="space-y-3.5 border-t border-cp-paper/10 px-5 py-4"
                  delay={0.06}
                >
                  {user.plan.map((item) => (
                    <StaggerItem key={item.id} className="flex items-center gap-2.5">
                      {item.done ? (
                        <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-cp-lime2" />
                      ) : (
                        <Circle className="h-[18px] w-[18px] shrink-0 text-cp-paper/40" />
                      )}
                      <p
                        className={cn(
                          "text-[12.5px]",
                          item.done
                            ? "text-cp-paper"
                            : "text-cp-paper/70",
                        )}
                      >
                        {item.label}
                      </p>
                    </StaggerItem>
                  ))}
                  <Link
                    to="/roadmap"
                    className="inline-block pt-1 text-[12px] font-bold text-cp-lime hover:underline"
                  >
                    View Full Plan →
                  </Link>
                </Stagger>
              ) : (
                <div className="border-t border-cp-paper/10 px-5 py-4">
                  <CardEmpty
                    icon={Calendar}
                    title="No plan yet"
                    hint="Generate your roadmap to unlock weekly goals that show up here."
                    cta={{ label: "Build roadmap →", to: "/roadmap" }}
                  />
                </div>
              )}
            </DashCard>

            <div className="">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
                className="rounded-2xl border border-border bg-cp-ink p-5 text-cp-paper shadow-[0_2px_6px_rgba(18,18,18,0.05),0_18px_40px_-22px_rgba(18,18,18,0.25)]"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-display text-[15px]">AI Resume Review</h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-cp-paper/70">
                      {!hasResume
                        ? "You haven't uploaded a resume yet. Without one, you're invisible to ATS systems."
                        : "Get your resume analyzed and find out exactly where it falls short."}
                    </p>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <MagneticCTA
                    href="/resume"
                    fullWidth
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-cp-lime px-4 py-2.5 text-[13px] font-bold text-cp-ink"
                  >
                    {hasResume ? "Re-analyze Resume →" : "Upload Resume →"}
                  </MagneticCTA>
                </motion.div>
              </motion.div>
            </div>

            <DashCard delay={0.35}>
              <h3 className="font-display text-[16px]">Quick Actions</h3>
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
                      className="flex flex-col items-center gap-2 rounded-xl border border-cp-paper/15 px-2 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-cp-lime/50 hover:shadow-lift"
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.7} />
                      <span className="text-[12px] leading-tight text-cp-paper/70">
                        {label}
                      </span>
                    </Link>
                  </StaggerItem>
                ))}
              </Stagger>
            </DashCard>
          </div>
        </div>

        {/* MOTIVATION */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="grid overflow-hidden rounded-2xl border border-border bg-cp-ink text-cp-paper lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_260px]"
        >
          <div className="flex items-start gap-4 p-8">
            <span className="text-4xl leading-none text-cp-lime">"</span>
            <p className="max-w-md">
              <span className="text-[19px] font-semibold leading-snug">
                The only way to do great work is to love what you do.
              </span>
              <span className="mt-3 block text-[12px] font-bold uppercase tracking-[0.18em] text-cp-lime">
                Steve Jobs
              </span>
            </p>
          </div>

          <div className="flex flex-col justify-center gap-2 border-white/10 p-8 lg:border-l">
            <p className="text-[13.5px] font-bold">
              Daily <span className="text-cp-lime">Reality Check</span>
            </p>
            <p className="text-[13px] leading-relaxed text-cp-paper/70">
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
