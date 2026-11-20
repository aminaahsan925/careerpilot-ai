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
  Search,
  Send,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";

import motivationImg from "@/assets/motivation-architecture.jpg";
import { AppLayout } from "@/components/app/AppLayout";
import { CareerHero } from "@/components/app/CareerHero";
import { KpiStat } from "@/components/analytics";
import { greeting, useCurrentUser } from "@/data/user";
import { useCareerOverview } from "@/data/career";
import { useProjects } from "@/data/projects";
import { AnimatedCard, Stagger, StaggerItem, Skeleton } from "@/lib/animation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CareerPilot AI" },
      {
        name: "description",
        content:
          "Track your career score, resume health, roadmap progress and applications in one premium AI career workspace.",
      },
      { property: "og:title", content: "Dashboard — CareerPilot AI" },
      {
        property: "og:description",
        content: "Your AI career command center: scores, roadmap, mentor and applications.",
      },
    ],
  }),
  component: DashboardPage,
});

const statusStyles: Record<string, string> = {
  "Under Review": "bg-secondary text-foreground",
  Applied: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  "Interview Scheduled": "border border-primary/30 bg-primary/15 text-primary",
  Offer: "bg-primary text-primary-foreground",
};

const stateStyles: Record<string, string> = {
  Active: "bg-primary/10 text-primary",
  "In Progress": "bg-primary/10 text-primary",
  Upcoming: "bg-secondary text-muted-foreground",
  Completed: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

function SectionHead({ title, to }: { title: string; to?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-[14.5px] font-bold tracking-[-0.01em]">{title}</h3>
      {to ? (
        <Link to={to} className="text-[12px] font-semibold text-primary hover:underline">
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
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>
      <p className="mt-3 text-[13px] font-semibold">{title}</p>
      <p className="mt-1 max-w-[240px] text-[11.5px] leading-relaxed text-muted-foreground">
        {hint}
      </p>
      {cta ? (
        <Link
          to={cta.to}
          className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/90"
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
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
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  // The query failed (or returned no user) — show a recoverable error state
  // instead of an endless skeleton.
  if (isError || !user) {
    return (
      <AppLayout title="Dashboard" subtitle="">
        <div className="card-surface mx-auto max-w-lg p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-[17px] font-bold text-foreground">
            Couldn&apos;t load your workspace
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Something went wrong while loading your profile. This is usually temporary."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/90"
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
          <span className="ml-1 align-top text-sm text-primary">✳</span>
        </span>
      }
      subtitle="Let's continue building your amazing career"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
        {/* LEFT COLUMN */}
        <div className="min-w-0 space-y-4">
          {/* SCORE CARDS — KPI strip from the shared analytics kit. The
              trend sparklines are gone: every trend is a single data point,
              so a sparkline showed a flat line and said nothing. */}
          {user.scores.length ? (
            <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" delay={0.08}>
              {user.scores.map((score, i) => {
                const Icon = scoreIcons[i] ?? Target;
                return (
                  <StaggerItem key={score.label}>
                    <KpiStat
                      label={score.label}
                      value={`${Math.round(score.value)}/${score.max}`}
                      sub={score.note}
                      highlight={i === 0}
                      icon={<Icon className="h-4 w-4" strokeWidth={1.8} />}
                    />
                  </StaggerItem>
                );
              })}
            </Stagger>
          ) : (
            <div className="card-surface flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  <Target className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold">No scores yet</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    Run your first diagnosis to unlock readiness, skills and evidence scores.
                  </p>
                </div>
              </div>
              <Link
                to="/diagnosis"
                className="rounded-lg bg-primary px-3.5 py-2 text-[12.5px] font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/90"
              >
                Run diagnosis →
              </Link>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <CareerHero personImage={user.heroImage} />

            {/* DIAGNOSIS CARD — brutal honesty */}
            <AnimatedCard className="flex flex-col" delay={0.3}>
              <div className="flex items-center justify-between">
                <h3 className="text-[14.5px] font-bold">Career diagnosis</h3>
                <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
                </span>
              </div>

              <div className="mt-5 flex-1 space-y-4">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-deep text-white">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <p className="rounded-xl rounded-tl-sm bg-secondary px-4 py-3 text-[12.5px] leading-relaxed">
                    <span className="font-semibold text-foreground">Career stage: </span>
                    {overview?.readiness?.stage ?? "Not assessed yet"}
                  </p>
                </div>

                <div className="flex justify-end">
                  <p className="rounded-xl rounded-tr-sm bg-primary px-4 py-2.5 text-[12.5px] font-medium text-primary-foreground">
                    {mainBlocker}
                  </p>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-deep text-white">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="rounded-xl rounded-tl-sm bg-secondary px-4 py-3 text-[12.5px] leading-relaxed">
                      <span className="font-semibold text-foreground">Do this next: </span>
                      {nextAction}
                    </p>
                    <Link
                      to="/diagnosis"
                      className="mt-3 inline-block rounded-lg border border-primary px-3 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                      Run full diagnosis
                    </Link>
                  </div>
                </div>
              </div>

              <Link to="/mentor" className="mt-5 flex items-center gap-2">
                <span className="flex-1 rounded-xl border border-border px-4 py-3 text-[12.5px] text-muted-foreground">
                  Ask me anything...
                </span>
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"
                >
                  <Send className="h-4 w-4" />
                </motion.span>
              </Link>
            </AnimatedCard>
          </div>

          {/* TECH EVENTS & BACKGROUND INTEL PROMO BANNER */}
          <div className="card-surface flex flex-col gap-4 rounded-2xl border border-primary/25 bg-gradient-to-r from-card via-card to-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                    Live Tech Ecosystem
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Gemini Grounded Events
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-foreground font-medium">
                  Inspect upcoming student hackathons and workshops, and pin the ones you want to attend.
                </p>
              </div>
            </div>
            <Link
              to="/events"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-primary/90"
            >
              Explore Tech Events →
            </Link>
          </div>

          {/* THREE-COLUMN SECTION */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* ROADMAP — staggered items */}
            <AnimatedCard delay={0.1}>
              <SectionHead title="Recommended Roadmap" to="/roadmap" />
              {user.roadmap.length ? (
                <Stagger className="mt-4 space-y-1" delay={0.07}>
                  {user.roadmap.map((step, i) => (
                    <StaggerItem
                      key={step.title}
                      className={cn(
                        "flex items-center gap-3 py-3",
                        i > 0 && "border-t border-border",
                      )}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                        <MapIcon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">{step.title}</p>
                        {i === 0 ? (
                          <p className="text-[11.5px] text-muted-foreground">{step.meta}</p>
                        ) : null}
                      </div>
                      {i === 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-14 overflow-hidden rounded-full bg-secondary">
                            <motion.span
                              initial={{ width: 0 }}
                              animate={{ width: `${step.progress}%` }}
                              transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                              className="block h-full rounded-full bg-gradient-to-r from-violet-deep to-primary"
                            />
                          </span>
                          <span className="text-[12px] font-semibold">{step.progress}%</span>
                        </div>
                      ) : (
                        <span
                          className={cn(
                            "rounded-md px-2 py-1 text-[11px] font-semibold",
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
            </AnimatedCard>

            {/* APPLICATIONS — staggered items */}
            <AnimatedCard delay={0.2}>
              <SectionHead title="Recent Applications" />
              {user.applications.length ? (
                <Stagger className="mt-4 space-y-1" delay={0.07}>
                  {user.applications.map((app, i) => (
                    <StaggerItem
                      key={app.company}
                      className={cn(
                        "flex items-center gap-3 py-3.5",
                        i > 0 && "border-t border-border",
                      )}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-[12px] font-bold">
                        {app.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">{app.company}</p>
                        <p className="truncate text-[11.5px] text-muted-foreground">{app.role}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold",
                          statusStyles[app.status],
                        )}
                      >
                        {app.status}
                      </span>
                    </StaggerItem>
                  ))}
                </Stagger>
              ) : (
                <CardEmpty
                  icon={Briefcase}
                  title="No applications tracked"
                  hint="Explore the market to find roles worth applying to, and they'll show up here."
                  cta={{ label: "Explore market →", to: "/market" }}
                />
              )}
            </AnimatedCard>

            {/* SKILLS — animated bars */}
            <AnimatedCard delay={0.3}>
              <SectionHead title="Top Skills" to="/resume" />
              <div className="mt-4 space-y-3.5">
                {user.skills.length ? (
                  user.skills.map((skill, i) => (
                    <motion.div
                      key={skill.name}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.06, duration: 0.3 }}
                      className="flex items-center gap-3"
                    >
                      <p className="w-[110px] shrink-0 truncate text-[12.5px]">{skill.name}</p>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: `${skill.level}%` }}
                          transition={{
                            duration: 0.7,
                            delay: 0.4 + i * 0.06,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="block h-full rounded-full bg-gradient-to-r from-violet-deep to-primary"
                        />
                      </span>
                      <span className="w-9 shrink-0 text-right text-[12px] font-semibold">
                        {skill.level}%
                      </span>
                    </motion.div>
                  ))
                ) : (
                  <CardEmpty
                    icon={Sparkles}
                    title="No skills added yet"
                    hint="Pick the tools you know during onboarding and your skill profile appears here."
                    cta={{ label: "Add skills →", to: "/onboarding" }}
                  />
                )}
              </div>
            </AnimatedCard>
          </div>

          {/* MARKET REALITY BANNER — urgent CTA */}
          <AnimatedCard className="border-primary/20" delay={0.15}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="h-4 w-4 text-primary" strokeWidth={1.8} />
                </span>
                <div>
                  <h3 className="text-[14px] font-bold">Market Reality</h3>
                  {user.goal ? (
                    <p className="text-[12px] text-muted-foreground">
                      What employers actually demand for{" "}
                      <span className="font-semibold text-foreground">{user.goal}</span>
                    </p>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">
                      See what the real job market requires — no sugar-coating
                    </p>
                  )}
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/market"
                  className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground"
                >
                  See the truth →
                </Link>
              </motion.div>
            </div>
          </AnimatedCard>

          {/* EVIDENCE CTA — brutal honesty */}
          {!hasResume && !hasProjects && (
            <AnimatedCard className="border-primary/25 bg-primary/[0.05]" delay={0.2}>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FolderOpen className="h-4 w-4 text-primary" strokeWidth={1.8} />
                </span>
                <div className="flex-1">
                  <h3 className="text-[14px] font-bold">You have zero evidence</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    Right now every skill on your profile is a claim. No resume. No projects. No
                    proof. Recruiters need evidence — and you have none. Fix this today.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Link
                        to="/onboarding"
                        className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground"
                      >
                        Add projects now →
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Link
                        to="/resume"
                        className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        Upload resume
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <AnimatedCard className="overflow-hidden p-0" delay={0.15}>
            <div className="flex items-center justify-between px-5 pt-5">
              <h3 className="text-[14.5px] font-bold">Today&apos;s Plan</h3>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="relative mt-3 flex items-end justify-between px-5">
              <div className="pb-4">
                <p className="numeral text-[34px] leading-none">
                  {user.planDate.day}
                </p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">{user.planDate.month}</p>
              </div>
              <div className="relative h-[120px] w-[130px] shrink-0">
                <span className="absolute bottom-0 right-0 h-[86px] w-[86px] rounded-full bg-gradient-to-br from-primary to-magenta shadow-[0_0_36px_-6px_oklch(0.65_0.18_295/70%)]" />
                <img
                  src={user.planImage}
                  alt=""
                  loading="lazy"
                  className="absolute bottom-0 right-2 h-full w-auto object-contain object-bottom"
                />
              </div>
            </div>

            {user.plan.length ? (
              <Stagger className="space-y-3.5 border-t border-border px-5 py-4" delay={0.06}>
                {user.plan.map((item) => (
                  <StaggerItem key={item.id} className="flex items-center gap-2.5">
                    {item.done ? (
                      <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-primary" />
                    ) : (
                      <Circle className="h-[18px] w-[18px] shrink-0 text-muted-foreground/50" />
                    )}
                    <p
                      className={cn(
                        "text-[12.5px]",
                        item.done ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </p>
                  </StaggerItem>
                ))}
                <Link
                  to="/roadmap"
                  className="inline-block pt-1 text-[12px] font-semibold text-primary hover:underline"
                >
                  View Full Plan →
                </Link>
              </Stagger>
            ) : (
              <div className="border-t border-border px-5 py-4">
                <CardEmpty
                  icon={Calendar}
                  title="No plan yet"
                  hint="Generate your roadmap to unlock weekly goals that show up here."
                  cta={{ label: "Build roadmap →", to: "/roadmap" }}
                />
              </div>
            )}
          </AnimatedCard>

          <AnimatedCard className="border-primary/30 bg-gradient-to-br from-violet-deep/50 via-card to-card text-white" delay={0.25}>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-[14px] font-bold">AI Resume Review</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/70">
                  {!hasResume
                    ? "You haven't uploaded a resume yet. Without one, you're invisible to ATS systems."
                    : "Get your resume analyzed and find out exactly where it falls short."}
                </p>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/resume"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {hasResume ? "Re-analyze Resume →" : "Upload Resume →"}
              </Link>
            </motion.div>
          </AnimatedCard>

          <AnimatedCard delay={0.35}>
            <h3 className="text-[14.5px] font-bold">Quick Actions</h3>
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
                    className="flex flex-col items-center gap-2 rounded-xl border border-border px-2 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.7} />
                    <span className="text-[10.5px] leading-tight text-muted-foreground">
                      {label}
                    </span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </AnimatedCard>
        </div>
      </div>

      {/* MOTIVATION — serious, editorial tone */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 grid overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-violet-deep/40 via-ink to-ink text-white lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_260px]"
      >
        <div className="flex items-start gap-4 p-8">
          <span className="text-4xl leading-none text-primary">"</span>
          <p className="max-w-md">
            <span className="text-[19px] font-semibold leading-snug">
              The only way to do great work is to love what you do.
            </span>
            <span className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Steve Jobs
            </span>
          </p>
        </div>

        <div className="flex flex-col justify-center gap-2 border-white/10 p-8 lg:border-l">
          <p className="text-[13.5px] font-semibold">
            Daily <span className="text-primary">Reality Check</span>
          </p>
          <p className="text-[13px] leading-relaxed text-white/60">
            The market doesn't care about your feelings. Build proof or get left behind.
          </p>
        </div>

        <img
          src={motivationImg}
          alt="Modern architecture"
          loading="lazy"
          className="hidden h-full w-full object-cover lg:block"
        />
      </motion.section>
    </AppLayout>
  );
}
