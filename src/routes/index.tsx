import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  ArrowRight,
  Target,
  BarChart3,
  Compass,
  UserCheck,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Plane,
  FileCheck,
  Bot,
  Flame,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  Check,
  Activity,
} from "lucide-react";

import heroPerson from "@/assets/hero-person.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareerPilot AI — Precision Career Intelligence" },
      {
        name: "description",
        content:
          "CareerPilot AI analyzes your resume, simulates Recruiter Audits, maps Market Reality & Future Tech trends, and powers your daily career Flight Plan.",
      },
      { property: "og:title", content: "CareerPilot AI — Build Your Future" },
      {
        property: "og:description",
        content:
          "Career Intelligence Platform: Recruiter Audit, Market Reality, Flight Plan & AI Mentorship.",
      },
    ],
  }),
  component: Landing,
});

const STAGES = [
  {
    n: "01",
    title: "ANALYZE PROFILE",
    subtitle: "Deep Resume Intelligence",
    body: "Upload your resume for instant parsing of technical skills, experience depth, project impact, and structural ATS compatibility.",
    tags: ["Resume Intelligence", "ATS Matcher", "Skill Extraction"],
  },
  {
    n: "02",
    title: "RECRUITER AUDIT",
    subtitle: "Simulated Hiring Manager Evaluation",
    body: "Expose profile red flags, weak project proof, and positioning gaps through a ruthless, simulated recruiter lens before you apply.",
    tags: ["Hiring Manager Audit", "Positioning Review", "Red Flag Detection"],
  },
  {
    n: "03",
    title: "MARKET REALITY",
    subtitle: "Real-Time Demands & Tech Radar",
    body: "Uncover in-demand skills, emerging global AI models, outdated legacy tech, and exact gaps for your specific target role.",
    tags: ["Market Skill Demands", "Outdated Tech Radar", "Frontier AI Trends"],
  },
  {
    n: "04",
    title: "FLIGHT PLAN",
    subtitle: "Daily Execution Cockpit",
    body: "Transform your multi-month roadmap into daily sprint tasks, weekly velocity metrics, and actionable portfolio milestones.",
    tags: ["Daily Sprints", "Execution Velocity", "Milestone Tracking"],
  },
  {
    n: "05",
    title: "24/7 AI MENTOR",
    subtitle: "Context-Aware Career Coaching",
    body: "A dedicated AI mentor fully initialized with your resume data, target role, skill gaps, and active roadmap for continuous guidance.",
    tags: ["AI Mentor", "Interview Prep", "Real-Time Guidance"],
  },
];

const PLATFORM_SUITE = [
  {
    icon: ShieldCheck,
    title: "Recruiter Audit Engine",
    body: "Get an unfiltered evaluation of how top tech recruiters view your candidacy, identifying candidate red flags and positioning fixes.",
  },
  {
    icon: Plane,
    title: "Daily Flight Plan",
    body: "Stay in peak execution momentum with daily sprint tasks, focus priorities, and weekly velocity tracking tailored to your role.",
  },
  {
    icon: BarChart3,
    title: "Market Reality Intelligence",
    body: "See real-time skill demand shifts, emerging technologies, and legacy frameworks losing traction across local and global markets.",
  },
  {
    icon: FileCheck,
    title: "ATS Job Mirror",
    body: "Compare your resume directly against specific job postings to get an instant keyword match score and missing requirement breakdown.",
  },
  {
    icon: Flame,
    title: "Future Tech Radar",
    body: "Stay ahead of industry disruption with live insights on frontier AI models (Google DeepMind, Anthropic, OpenAI, DeepSeek) and paradigm shifts.",
  },
  {
    icon: Bot,
    title: "Contextual AI Mentor",
    body: "An AI mentor that remembers your exact profile, target role, and roadmap milestones—providing custom advice whenever you need it.",
  },
];

const BEFORE_AFTER = [
  {
    before:
      "Applying to dozens of roles blindly without knowing why recruiters pass on your resume.",
    after:
      "Running a Recruiter Audit to catch red flags and optimize your positioning before submitting.",
  },
  {
    before: "Wasting months learning outdated frameworks recommended by obsolete tutorials.",
    after: "Leveraging Market Reality to master in-demand skills and emerging global technologies.",
  },
  {
    before: "Overwhelmed by a massive learning list with zero daily accountability or structure.",
    after: "Executing your daily Flight Plan with clear sprint tasks and visible weekly velocity.",
  },
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    // Some Supabase email templates redirect to the site root. Preserve the
    // recovery token and move the user to the password form immediately.
    if (window.location.hash.includes("type=recovery")) {
      void navigate({ to: "/auth", search: { reset: true, redirect: undefined } });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      {/* HEADER */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-terracotta" strokeWidth={1.6} />
          <span className="text-[15px] font-extrabold tracking-[0.14em]">CAREERPILOT</span>
          <span className="text-[12px] font-semibold tracking-[0.16em] text-terracotta">AI</span>
        </div>
        <nav className="hidden items-center gap-7 text-[13px] font-medium text-muted-foreground lg:flex">
          <a href="#how" className="transition hover:text-foreground">
            Workflow
          </a>
          <a href="#recruiter-audit" className="transition hover:text-foreground">
            Recruiter Audit
          </a>
          <a href="#market-reality" className="transition hover:text-foreground">
            Market Reality
          </a>
          <a href="#flight-plan" className="transition hover:text-foreground">
            Flight Plan
          </a>
          <Link to="/diagnosis" className="transition hover:text-foreground">
            Diagnosis
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            search={{ redirect: undefined, reset: undefined }}
            className="hidden text-[13px] font-semibold text-muted-foreground transition hover:text-foreground sm:block"
          >
            Sign in
          </Link>
          <Link
            to="/dashboard"
            className="whitespace-nowrap rounded-lg bg-terracotta px-4 py-2.5 text-[13px] font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 shadow-sm"
          >
            Open Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* HERO SECTION - PRESERVED VISUAL COMPOSITION */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mt-4 overflow-hidden rounded-3xl bg-ink text-white"
        >
          <div className="absolute bottom-0 right-[8%] aspect-square w-[42%] max-w-[440px] translate-y-[38%] rounded-full bg-terracotta" />
          <img
            src={heroPerson}
            alt="CareerPilot member walking forward"
            width={912}
            height={1200}
            className="absolute bottom-0 right-[4%] z-10 hidden h-[88%] w-auto object-contain object-bottom grayscale md:block"
          />
          <div className="relative z-20 max-w-[560px] px-8 py-16 md:px-14 md:py-24">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-terracotta">
              For final-year CS students chasing backend roles
            </p>
            <h1 className="editorial-title mt-6 text-[clamp(2.6rem,7vw,5rem)]">
              <span className="block">Build</span>
              <span className="block">Your</span>
              <span className="block text-terracotta">Future</span>
            </h1>
            <p className="mt-6 max-w-[420px] text-[14px] leading-relaxed text-white/75">
              CareerPilot turns your resume, projects, and GitHub into one backend-job readiness
              score — with the exact proof you must build next to get interviews. Not generic career
              advice: upload your evidence, compare it with one target backend job, and get 3 gaps
              and 1 proof task.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-terracotta px-6 py-3.5 text-[13.5px] font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Start your roadmap <span aria-hidden>→</span>
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-5 py-3.5 text-[13px] font-medium text-white/90 transition hover:bg-white/10"
              >
                Explore how it works
              </a>
            </div>
          </div>
        </motion.section>

        {/* SECTION 1: END-TO-END WORKFLOW */}
        <section id="how" className="py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-terracotta">
              Complete System Architecture
            </p>
            <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)] font-bold tracking-[-0.03em] text-foreground">
              From current profile to hired professional.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              CareerPilot replaces fragmented advice with an integrated, intelligence-driven career
              pipeline.
            </p>
          </div>

          <div className="mt-14 space-y-4">
            {STAGES.map((s, idx) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="card-surface group p-7 transition-all duration-200 hover:border-terracotta/40 hover:shadow-lift"
              >
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-5">
                    <span className="text-[14px] font-extrabold tracking-[0.16em] text-terracotta">
                      {s.n}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-[17px] font-bold tracking-[-0.01em] text-foreground">
                          {s.title}
                        </h3>
                        <span className="text-[12px] font-medium text-muted-foreground">
                          • {s.subtitle}
                        </span>
                      </div>
                      <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
                        {s.body}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 md:justify-end">
                    {s.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-secondary/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FEATURE SPOTLIGHT 1: RECRUITER AUDIT */}
        <section id="recruiter-audit" className="border-t border-border py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-terracotta">
                Hiring Manager Intelligence
              </p>
              <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)] font-bold tracking-[-0.03em] text-foreground">
                See yourself through a hiring manager&apos;s eyes.
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                The Recruiter Audit engine evaluates your candidate profile against real industry
                standards. It catches candidate red flags, identifies missing production proof, and
                provides exact positioning rewrites to make your resume unignorable.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
                  <div>
                    <p className="text-[13.5px] font-semibold text-foreground">Red Flag Exposure</p>
                    <p className="text-[12.5px] text-muted-foreground">
                      Detect formatting errors, vague impact statements, and missing technical
                      proof.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
                  <div>
                    <p className="text-[13.5px] font-semibold text-foreground">
                      Strategic Positioning Advice
                    </p>
                    <p className="text-[12.5px] text-muted-foreground">
                      Reframe your experience to match what senior engineering leaders actively look
                      for.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/recruiter"
                  className="inline-flex items-center gap-2 text-[13.5px] font-bold text-terracotta hover:underline"
                >
                  Explore Recruiter Audit <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* RECRUITER AUDIT MOCKUP */}
            <div className="lg:col-span-7">
              <div className="card-surface p-7 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-foreground">
                        Recruiter Audit Report
                      </h4>
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        Example
                      </span>
                      <p className="text-[11.5px] text-muted-foreground flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        ATS Match Score: <strong className="text-foreground">91%</strong>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[28px] font-extrabold leading-none text-foreground">
                      84
                    </span>
                    <span className="text-[13px] font-semibold text-muted-foreground">/100</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Critical Red Flag Detected
                      </span>
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        High Priority
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] text-foreground font-medium">
                      &quot;Resume lacks measurable production metrics for backend
                      microservices.&quot;
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Fix: Quantify API throughput or latency reductions in your recent project
                      section.
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Strong Positioning Highlight
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Verified
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-foreground font-medium">
                      &quot;Strong architecture ownership demonstrated in React & Next.js
                      projects.&quot;
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3.5 py-2 text-[11.5px] text-muted-foreground">
                  <span>3 Red Flags Resolved automatically</span>
                  <span className="font-semibold text-terracotta">Ready for Applications</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE SPOTLIGHT 2: MARKET REALITY & FUTURE TECH */}
        <section id="market-reality" className="border-t border-border py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* PREVIEW CONTAINER */}
            <div className="order-2 lg:order-1 lg:col-span-7">
              <div className="card-surface p-7 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
                  <div>
                    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Target Role Demands
                    </span>
                    <p className="text-[16px] font-bold text-foreground">
                      AI Systems & Full-Stack Architect
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-lg border border-terracotta/30 bg-terracotta/10 px-3 py-1.5 text-[12px] font-semibold text-terracotta">
                    <Activity className="h-3.5 w-3.5 animate-pulse" /> Sample Market Snapshot
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/80 bg-background/50 p-4">
                    <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="h-3.5 w-3.5" /> High Market Demand
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[
                        "TypeScript",
                        "React 19",
                        "Next.js",
                        "Agentic AI",
                        "Vector DBs",
                        "PyTorch",
                      ].map((sk) => (
                        <span
                          key={sk}
                          className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11.5px] font-medium text-emerald-700 dark:text-emerald-300"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-background/50 p-4">
                    <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-rose-500">
                      <AlertTriangle className="h-3.5 w-3.5" /> Outdated / Declining Tech
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {["Legacy jQuery", "REST Monoliths", "Manual Deployments"].map((sk) => (
                        <span
                          key={sk}
                          className="rounded bg-rose-500/10 px-2 py-0.5 text-[11.5px] font-medium text-rose-700 dark:text-rose-300"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-terracotta/20 bg-terracotta/5 p-4">
                  <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-terracotta">
                    <Flame className="h-3.5 w-3.5" /> Global Frontier Tech Intelligence
                  </div>
                  <p className="mt-1.5 text-[12.5px] text-muted-foreground leading-relaxed">
                    Tracks emerging AI models from Google DeepMind, OpenAI, Anthropic, and DeepSeek
                    to ensure your skills align with 2030 paradigm shifts.
                  </p>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 lg:col-span-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-terracotta">
                Market Reality Engine
              </p>
              <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)] font-bold tracking-[-0.03em] text-foreground">
                The market changes. Your preparation should too.
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                CareerPilot continuously cross-evaluates your profile against current industry
                demand data—showing what skills are skyrocketing, what legacy tools are dying, and
                what global tech giants are planning next.
              </p>

              <div className="mt-8">
                <Link
                  to="/market"
                  className="inline-flex items-center gap-2 text-[13.5px] font-bold text-terracotta hover:underline"
                >
                  Explore Market Reality & Future Tech <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE SPOTLIGHT 3: FLIGHT PLAN */}
        <section id="flight-plan" className="border-t border-border py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-terracotta">
                Daily Execution Cockpit
              </p>
              <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)] font-bold tracking-[-0.03em] text-foreground">
                Turn your roadmap into focused daily progress.
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                Flight Plan turns your goals into clear daily actions, active project work, and
                visible weekly progress.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <Plane className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
                  <div>
                    <p className="text-[13.5px] font-semibold text-foreground">
                      Daily Sprint Focus
                    </p>
                    <p className="text-[12.5px] text-muted-foreground">
                      Clear, prioritized daily actions to close your skill gaps step by step.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
                  <div>
                    <p className="text-[13.5px] font-semibold text-foreground">
                      Weekly Velocity Tracking
                    </p>
                    <p className="text-[12.5px] text-muted-foreground">
                      Measure real progress every week until you are fully ready to land the role.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/flightplan"
                  className="inline-flex items-center gap-2 text-[13.5px] font-bold text-terracotta hover:underline"
                >
                  Open Flight Plan Cockpit <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* FLIGHT PLAN MOCKUP */}
            <div className="lg:col-span-7">
              <div className="card-surface p-7 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta">
                      <Plane className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-foreground">Flight Plan Cockpit</h4>
                      <p className="text-[11.5px] text-muted-foreground">Example daily sprint</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-secondary px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground">
                    This week
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    { title: "Improve project search", tag: "Completed", done: true },
                    { title: "Review recruiter feedback", tag: "Completed", done: true },
                    { title: "Complete architecture practice", tag: "In progress", done: false },
                  ].map((task, i) => (
                    <div
                      key={i}
                      className="flex min-w-0 flex-col gap-2 rounded-xl border border-border/80 bg-background/50 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <CheckCircle2
                          className={`h-4 w-4 ${task.done ? "text-emerald-500" : "text-muted-foreground/40"}`}
                        />
                        <span
                          className={`min-w-0 truncate text-[13px] font-medium ${
                            task.done ? "text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>
                      <span className="shrink-0 text-[11px] font-semibold text-terracotta">
                        {task.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: PLATFORM CAPABILITIES SUITE */}
        <section id="features" className="border-t border-border py-24">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-terracotta">
              Full Platform Suite
            </p>
            <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)] font-bold tracking-[-0.03em] text-foreground">
              An ecosystem engineered for career victory.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_SUITE.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="card-surface p-7 transition-all duration-200 hover:border-terracotta/40 hover:shadow-lift flex flex-col justify-between"
                >
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-[16px] font-bold tracking-[-0.01em] text-foreground">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                      {f.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION: BEFORE VS AFTER TRANSFORMATION */}
        <section className="border-t border-border py-24">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-terracotta">
              The Career Transformation
            </p>
            <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.5rem)] font-bold tracking-[-0.03em]">
              Replace uncertainty with structured execution.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {BEFORE_AFTER.map((item, i) => (
              <div key={i} className="card-surface flex flex-col justify-between p-7">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    Without CareerPilot
                  </span>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    &quot;{item.before}&quot;
                  </p>
                </div>

                <div className="mt-6 border-t border-border/80 pt-6">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-terracotta">
                    With CareerPilot AI
                  </span>
                  <p className="mt-2 text-[14px] font-semibold leading-relaxed text-foreground">
                    {item.after}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CALL TO ACTION */}
        <section className="my-16 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-muted/30 p-10 text-center md:p-16">
          <div className="mx-auto max-w-2xl space-y-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-terracotta">
              Take Control of Your Future
            </p>
            <h2 className="editorial-title text-[clamp(2.2rem,5vw,3.6rem)] text-foreground">
              STOP GUESSING. <br />
              <span className="text-terracotta">START WITH A PLAN.</span>
            </h2>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              Audit your profile like a recruiter. Master Market Reality. Execute your daily Flight
              Plan.
            </p>
            <div className="pt-2">
              <Link
                to="/diagnosis"
                className="inline-flex items-center gap-2 rounded-xl bg-terracotta px-8 py-4 text-[14px] font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 shadow-lift"
              >
                Start Your Career Diagnosis <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-terracotta" />
            <span className="text-[13px] font-extrabold tracking-[0.14em]">CAREERPILOT AI</span>
          </div>
          <div className="flex items-center gap-4 text-[12px] font-semibold text-muted-foreground">
            <Link to="/privacy" className="transition hover:text-foreground">
              Privacy
            </Link>
            <Link
              to="/pricing"
              search={{ paid: undefined, cancelled: undefined }}
              className="transition hover:text-foreground"
            >
              Pricing
            </Link>
            <Link to="/terms" className="transition hover:text-foreground">
              Terms
            </Link>
            <Link to="/auth" search={{ redirect: undefined, reset: undefined }} className="transition hover:text-foreground">
              Sign in
            </Link>
          </div>
          <p className="text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} CareerPilot AI. Precision Career Intelligence.
          </p>
        </div>
      </footer>
    </div>
  );
}
