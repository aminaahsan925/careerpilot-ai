import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles,
  ArrowRight,
  BarChart3,
  UserCheck,
  CheckCircle2,
  FileCheck,
  Bot,
  Flame,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  Check,
  Map,
  Menu,
  X,
} from "lucide-react";

import heroPerson from "@/assets/hero-person.png";
import { Donut, KpiStat, Ring } from "@/components/analytics";
import { HireabilityCalculator } from "@/components/landing/HireabilityCalculator";
import { ROLE_PROFILES } from "@/data/market-truth/roles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareerPilot AI — Precision Career Intelligence" },
      {
        name: "description",
        content:
          "CareerPilot AI analyzes your resume, simulates Recruiter Audits, maps Market Reality & Future Tech trends, and turns your gaps into a day-by-day roadmap.",
      },
      { property: "og:title", content: "CareerPilot AI — Build Your Future" },
      {
        property: "og:description",
        content:
          "Career Intelligence Platform: Recruiter Audit, Market Reality, Roadmap & AI Mentorship.",
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
    title: "ROADMAP",
    subtitle: "Day-by-Day Execution Plan",
    body: "Turn your skill gaps into a day-by-day roadmap: daily topics, focused tasks, and short checks that unlock the next day.",
    tags: ["Daily Tasks", "Topic Briefs", "Progress Checks"],
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
    icon: Map,
    title: "Day-by-Day Roadmap",
    body: "Work your roadmap one day at a time: daily topics, focused tasks, and checks that unlock the next day, matched to your target role.",
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
    after: "Working a day-by-day roadmap with clear daily tasks and visible progress.",
  },
];

/** Example day shown in the roadmap mockup — the ring counts from this list, never invented. */
const ROADMAP_DAY_TASKS = [
  { title: "Improve project search", tag: "Completed", done: true },
  { title: "Review recruiter feedback", tag: "Completed", done: true },
  { title: "Complete architecture practice", tag: "In progress", done: false },
];

/**
 * The market mockup shows one researched role, straight from the Market
 * Truth dataset (snapshot 2026-08-31) — skill lists, counts and the
 * automation note are all read off this profile, not hardcoded.
 */
const MARKET_ROLE = ROLE_PROFILES["frontend-react"];

function Landing() {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    // Some Supabase email templates redirect to the site root. Preserve the
    // recovery token and move the user to the password form immediately.
    if (window.location.hash.includes("type=recovery")) {
      void navigate({ to: "/auth", search: { reset: true, redirect: undefined } });
    }
  }, [navigate]);

  const roadmapDone = ROADMAP_DAY_TASKS.filter((t) => t.done).length;
  const marketTotal =
    MARKET_ROLE.mustHaveSkills.length +
    MARKET_ROLE.commonTools.length +
    MARKET_ROLE.differentiators.length;

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      {/* HEADER */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.6} />
          <span className="text-[15px] font-extrabold tracking-[0.14em]">CAREERPILOT</span>
          <span className="text-[12px] font-semibold tracking-[0.16em] text-primary">AI</span>
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
          <a href="#roadmap" className="transition hover:text-foreground">
            Roadmap
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
            className="whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 shadow-sm"
          >
            Open Dashboard
          </Link>
          <button
            type="button"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((open) => !open)}
            className="rounded-lg border border-border bg-card p-2.5 text-foreground lg:hidden"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* MOBILE NAV — the desktop nav is hidden below lg, so phones get this panel. */}
      {mobileNavOpen && (
        <nav
          aria-label="Mobile"
          className="mx-auto max-w-6xl px-6 pb-2 lg:hidden"
        >
          <div className="card-surface flex flex-col gap-1 p-3 text-[14px] font-medium text-muted-foreground">
            <a
              href="#how"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-lg px-3 py-2.5 transition hover:bg-secondary hover:text-foreground"
            >
              Workflow
            </a>
            <a
              href="#recruiter-audit"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-lg px-3 py-2.5 transition hover:bg-secondary hover:text-foreground"
            >
              Recruiter Audit
            </a>
            <a
              href="#market-reality"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-lg px-3 py-2.5 transition hover:bg-secondary hover:text-foreground"
            >
              Market Reality
            </a>
            <a
              href="#roadmap"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-lg px-3 py-2.5 transition hover:bg-secondary hover:text-foreground"
            >
              Roadmap
            </a>
            <Link
              to="/diagnosis"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-lg px-3 py-2.5 transition hover:bg-secondary hover:text-foreground"
            >
              Diagnosis
            </Link>
            <Link
              to="/auth"
              search={{ redirect: undefined, reset: undefined }}
              onClick={() => setMobileNavOpen(false)}
              className="rounded-lg border-t border-border px-3 py-2.5 font-semibold text-foreground transition hover:bg-secondary sm:hidden"
            >
              Sign in
            </Link>
          </div>
        </nav>
      )}

      <main className="mx-auto max-w-6xl px-6">
        {/* HERO — Direction 2: dark, violet glow, grotesk headline with an
            italic serif second line. Content is visible by default;
            animate-rise-in is a CSS-only progressive enhancement, so the
            hero renders with no JS too. */}
        <section className="animate-rise-in relative mt-4 overflow-hidden rounded-3xl bg-ink text-white">
          <div
            aria-hidden="true"
            className="absolute -left-24 -top-24 aspect-square w-[380px] rounded-full bg-magenta/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-0 right-[8%] aspect-square w-[42%] max-w-[440px] translate-y-[38%] rounded-full bg-primary/40 blur-3xl"
          />
          <div className="absolute bottom-0 right-[8%] aspect-square w-[42%] max-w-[440px] translate-y-[38%] rounded-full bg-violet-deep" />
          <img
            src={heroPerson}
            alt="CareerPilot member walking forward"
            width={912}
            height={1200}
            className="absolute bottom-0 right-[4%] z-10 hidden h-[88%] w-auto object-contain object-bottom grayscale md:block"
          />
          <div className="relative z-20 max-w-[560px] px-8 py-16 md:px-14 md:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              For university students, whatever career you want next
            </p>
            <h1 className="mt-6">
              <span className="editorial-title block text-[clamp(2.6rem,7vw,5rem)]">
                Build your
              </span>
              <span className="serif-accent text-gradient-accent block text-[clamp(2.6rem,7vw,5rem)]">
                future.
              </span>
            </h1>
            <p className="mt-6 max-w-[420px] text-[14px] leading-relaxed text-white/75">
              CareerPilot turns your resume, projects, and experience into one clear readiness
              verdict — with the exact proof you must build next to get interviews. Not generic career
              advice: upload your evidence, compare it with the job you actually want, and get 3 gaps
              and 1 proof task, whether that is backend, design, data, or anything else.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-[13.5px] font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Start your roadmap <span aria-hidden>→</span>
              </Link>
              <a
                href="#calculator"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-5 py-3.5 text-[13px] font-medium text-white/90 transition hover:bg-white/10"
              >
                Check your hireability
              </a>
            </div>
          </div>
        </section>

        {/* KPI STRIP — real counts only: researched roles, pipeline stages,
            gaps + proof task from the product's own promise. */}
        <section aria-label="CareerPilot at a glance" className="mt-8 grid gap-4 sm:grid-cols-3">
          <KpiStat
            label="Roles researched"
            value="8"
            sub="Entry-level roles in the market dataset (snapshot 2026-08-31)."
          />
          <KpiStat
            label="Pipeline stages"
            value="5"
            sub="From resume analysis to a day-by-day roadmap."
            highlight
          />
          <KpiStat
            label="Gaps + next proof task"
            value="3 + 1"
            sub="The audit surfaces 3 gaps and the single proof task to close the first."
          />
        </section>

        {/* HIREABILITY CALCULATOR */}
        <HireabilityCalculator />

        {/* SECTION 1: END-TO-END WORKFLOW */}
        <section id="how" className="border-t border-border py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Complete System Architecture
            </p>
            <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)] font-bold tracking-[-0.03em] text-foreground">
              From current profile
              <span className="serif-accent block">to hired professional.</span>
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              CareerPilot replaces fragmented advice with an integrated, intelligence-driven career
              pipeline.
            </p>
          </div>

          <div className="mt-14 space-y-4">
            {STAGES.map((s, idx) => (
              <div
                key={s.n}
                style={{ animationDelay: `${idx * 0.08}s` }}
                className="animate-rise-in card-surface group p-7 transition-all duration-200 hover:border-primary/40 hover:shadow-lift"
              >
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-5">
                    <span className="numeral text-2xl leading-none text-primary">
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
                        className="rounded-md bg-secondary/80 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURE SPOTLIGHT 1: RECRUITER AUDIT */}
        <section id="recruiter-audit" className="border-t border-border py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Hiring Manager Intelligence
              </p>
              <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)] font-bold tracking-[-0.03em] text-foreground">
                See yourself through
                <span className="serif-accent block">a hiring manager&apos;s eyes.</span>
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                The Recruiter Audit engine evaluates your candidate profile against real industry
                standards. It catches candidate red flags, identifies missing production proof, and
                provides exact positioning rewrites to make your resume unignorable.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-[13.5px] font-semibold text-foreground">Red Flag Exposure</p>
                    <p className="text-[12.5px] text-muted-foreground">
                      Detect formatting errors, vague impact statements, and missing technical
                      proof.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
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
                  className="inline-flex items-center gap-2 text-[13.5px] font-bold text-primary hover:underline"
                >
                  Explore Recruiter Audit <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* RECRUITER AUDIT MOCKUP — banded verdict + evidence counts, the
                way the rebuilt recruiter actually reports. No scores. */}
            <div className="lg:col-span-7">
              <div className="glow-card space-y-6 p-7 sm:p-8">
                <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-foreground">
                        Recruiter Audit Report
                      </h4>
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                        Example
                      </span>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Evidence coverage:{" "}
                        <strong className="text-foreground">4 of 6 skills with linked proof</strong>
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Verdict
                    </p>
                    <p className="text-gradient-accent mt-1 text-xl font-extrabold leading-tight tracking-[-0.02em]">
                      One gap
                      <br />
                      to close
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-amber-600">
                        Critical Red Flag Detected
                      </span>
                      <span className="text-xs font-semibold text-amber-600">
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
                      <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-600">
                        Strong Positioning Highlight
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Verified
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-foreground font-medium">
                      &quot;Strong architecture ownership demonstrated in React & Next.js
                      projects.&quot;
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3.5 py-2 text-xs text-muted-foreground">
                  <span>3 red flags found, 1 still open</span>
                  <span className="font-semibold text-primary">One gap to close</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE SPOTLIGHT 2: MARKET REALITY & FUTURE TECH */}
        <section id="market-reality" className="border-t border-border py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* PREVIEW CONTAINER — lists and counts read off the dataset profile. */}
            <div className="order-2 lg:order-1 lg:col-span-7">
              <div className="card-surface space-y-6 p-7 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Target Role Demands
                    </span>
                    <p className="text-[16px] font-bold text-foreground">
                      {MARKET_ROLE.displayName}
                    </p>
                  </div>
                  <span className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-[12px] font-semibold text-primary">
                    Dataset snapshot 2026-08-31
                  </span>
                </div>

                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                  <Donut
                    size={150}
                    thickness={16}
                    centerLabel={String(marketTotal)}
                    centerSub="listed expectations"
                    segments={[
                      {
                        label: "Must-have",
                        value: MARKET_ROLE.mustHaveSkills.length,
                        color: "var(--primary)",
                      },
                      {
                        label: "Common tools",
                        value: MARKET_ROLE.commonTools.length,
                        color: "var(--magenta)",
                      },
                      {
                        label: "Differentiators",
                        value: MARKET_ROLE.differentiators.length,
                        color: "oklch(1 0 0 / 40%)",
                      },
                    ]}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                      Must-have skills
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {MARKET_ROLE.mustHaveSkills.map((sk) => (
                        <span
                          key={sk.skill}
                          title={sk.note ?? undefined}
                          className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground"
                        >
                          {sk.skill}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                      {MARKET_ROLE.headline}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-primary">
                    <Bot className="h-3.5 w-3.5" /> Being automated by AI
                  </div>
                  {MARKET_ROLE.aiImpact.automatedByAi.map((item) => (
                    <p
                      key={item.statement}
                      className="mt-1.5 text-[12.5px] text-muted-foreground leading-relaxed"
                    >
                      {item.statement}
                    </p>
                  ))}
                </div>

                <div className="rounded-xl border border-border/80 bg-background/50 p-4">
                  <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-primary">
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Market Reality Engine
              </p>
              <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)] font-bold tracking-[-0.03em] text-foreground">
                The market changes.
                <span className="serif-accent block">Your preparation should too.</span>
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                CareerPilot continuously cross-evaluates your profile against current industry
                demand data—showing what skills are skyrocketing, what legacy tools are dying, and
                what global tech giants are planning next.
              </p>

              <div className="mt-8">
                <Link
                  to="/market"
                  className="inline-flex items-center gap-2 text-[13.5px] font-bold text-primary hover:underline"
                >
                  Explore Market Reality & Future Tech <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE SPOTLIGHT 3: ROADMAP */}
        <section id="roadmap" className="border-t border-border py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Day-by-Day Roadmap
              </p>
              <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)] font-bold tracking-[-0.03em] text-foreground">
                Turn your roadmap into
                <span className="serif-accent block">focused daily progress.</span>
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                Your roadmap breaks your goal into daily work: one topic, one focused task list,
                and a short check that unlocks the next day.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <Map className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-[13.5px] font-semibold text-foreground">
                      One Day, One Focus
                    </p>
                    <p className="text-[12.5px] text-muted-foreground">
                      Each day has a clear topic and task list that closes one gap at a time.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-[13.5px] font-semibold text-foreground">
                      Visible Daily Progress
                    </p>
                    <p className="text-[12.5px] text-muted-foreground">
                      Track completed days and paths so you can see exactly how far you have come.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/roadmap"
                  className="inline-flex items-center gap-2 text-[13.5px] font-bold text-primary hover:underline"
                >
                  Open Your Roadmap <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* ROADMAP MOCKUP — the ring counts completed tasks from the example day. */}
            <div className="lg:col-span-7">
              <div className="card-surface space-y-6 p-7 sm:p-8">
                <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Map className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-foreground">
                        Roadmap · Day Tasks
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                          This week
                        </span>
                      </h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Example day from your roadmap
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-center">
                    <Ring
                      value={(roadmapDone / ROADMAP_DAY_TASKS.length) * 100}
                      size={76}
                      stroke={7}
                      label={`${roadmapDone}/${ROADMAP_DAY_TASKS.length}`}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">tasks done</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {ROADMAP_DAY_TASKS.map((task) => (
                    <div
                      key={task.title}
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
                      <span className="shrink-0 text-xs font-semibold text-primary">
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
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Full Platform Suite
            </p>
            <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)] font-bold tracking-[-0.03em] text-foreground">
              An ecosystem engineered
              <span className="serif-accent block">for career victory.</span>
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_SUITE.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="card-surface p-7 transition-all duration-200 hover:border-primary/40 hover:shadow-lift flex flex-col justify-between"
                >
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              The Career Transformation
            </p>
            <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.5rem)] font-bold tracking-[-0.03em]">
              Replace uncertainty with
              <span className="serif-accent block">structured execution.</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {BEFORE_AFTER.map((item, i) => (
              <div key={i} className="card-surface flex flex-col justify-between p-7">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
                    Without CareerPilot
                  </span>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    &quot;{item.before}&quot;
                  </p>
                </div>

                <div className="mt-6 border-t border-border/80 pt-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
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
        <section className="my-16 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-violet-deep/40 via-card to-card p-10 text-center shadow-glow md:p-16">
          <div className="mx-auto max-w-2xl space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Take Control of Your Future
            </p>
            <h2>
              <span className="editorial-title block text-[clamp(2.2rem,5vw,3.6rem)] text-foreground">
                Stop guessing.
              </span>
              <span className="serif-accent text-gradient-accent block text-[clamp(2.2rem,5vw,3.6rem)]">
                start with a plan.
              </span>
            </h2>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              Audit your profile like a recruiter. Master Market Reality. Work your roadmap one
              day at a time.
            </p>
            <div className="pt-2">
              <Link
                to="/diagnosis"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-[14px] font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 shadow-lift"
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
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-[13px] font-extrabold tracking-[0.14em]">CAREERPILOT AI</span>
          </div>
          <div className="flex items-center gap-4 text-[12px] font-semibold text-muted-foreground">
            <Link to="/privacy" className="transition hover:text-foreground">
              Privacy
            </Link>
            <Link
              to="/pricing"
              search={{ paid: undefined, cancelled: undefined, tracker: undefined }}
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
