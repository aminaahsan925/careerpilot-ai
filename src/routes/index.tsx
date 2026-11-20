import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles,
  ArrowRight,
  BarChart3,
  UserCheck,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  FileCheck,
  Bot,
  Flame,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  Check,
  Activity,
  Map,
  Menu,
  X,
  Fish,
} from "lucide-react";

import { PilotMascot } from "@/components/mascot/PilotMascot";
import { KoiStrip, Squiggle, StarBurst, DoodleCircle } from "@/components/landing/landing-decor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareerPilot AI: Precision Career Intelligence" },
      {
        name: "description",
        content:
          "CareerPilot AI analyzes your resume, simulates Recruiter Audits, maps Market Reality & Future Tech trends, and turns your gaps into a day-by-day roadmap.",
      },
      { property: "og:title", content: "CareerPilot AI: Build Your Future" },
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
    body: "An AI mentor that remembers your exact profile, target role, and roadmap milestones, providing custom advice whenever you need it.",
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

/* Tilted feature collage: the four places in the CareerPilot world. */
const FEATURE_COLLAGE = [
  {
    icon: FileCheck,
    title: "Resume",
    body: "Upload your resume and see what a recruiter sees: your skills, your proof, and the gaps that cost you interviews.",
    link: "/resume" as const,
    linkLabel: "Check your resume",
    cardClass: "bg-d3-peri text-d3-navy",
    iconClass: "bg-d3-navy text-d3-paper",
    tilt: "d3-tilt-l",
  },
  {
    icon: Map,
    title: "Roadmap",
    body: "Your gaps become a day-by-day plan: one topic, one task list, and a short check that unlocks the next day.",
    link: "/roadmap" as const,
    linkLabel: "Open your roadmap",
    cardClass: "bg-d3-lime text-d3-choco",
    iconClass: "bg-d3-leaf text-white",
    tilt: "d3-tilt-r",
  },
  {
    icon: Fish,
    title: "Market Mirror",
    body: "Real job postings and live research show which skills employers actually ask for right now, not last year.",
    link: "/market" as const,
    linkLabel: "See the market",
    cardClass: "bg-d3-sky text-d3-navy",
    iconClass: "bg-d3-teal text-white",
    tilt: "d3-tilt-r",
  },
  {
    icon: Bot,
    title: "AI Recruiter",
    body: "A friendly recruiter face that screens your resume against a real job post and tells you exactly what to fix.",
    link: "/recruiter" as const,
    linkLabel: "Meet your recruiter",
    cardClass: "bg-d3-mustard text-d3-ink",
    iconClass: "bg-d3-flame text-white",
    tilt: "d3-tilt-l",
  },
];

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

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      {/* HEADER */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-d3-flame" strokeWidth={1.6} />
          <span className="d3-display text-[15px] font-extrabold tracking-[0.14em] text-d3-choco">
            CAREERPILOT
          </span>
          <span className="d3-display text-[12px] font-bold tracking-[0.16em] text-d3-flame">
            AI
          </span>
        </div>
        <nav className="hidden items-center gap-7 text-[13px] font-medium text-d3-choco/70 lg:flex">
          <a href="#how" className="transition hover:text-d3-choco">
            Workflow
          </a>
          <a href="#recruiter-audit" className="transition hover:text-d3-choco">
            Recruiter Audit
          </a>
          <a href="#market-reality" className="transition hover:text-d3-choco">
            Market Reality
          </a>
          <a href="#roadmap" className="transition hover:text-d3-choco">
            Roadmap
          </a>
          <Link to="/diagnosis" className="transition hover:text-d3-choco">
            Diagnosis
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            search={{ redirect: undefined, reset: undefined }}
            className="hidden text-[13px] font-semibold text-d3-choco/70 transition hover:text-d3-choco sm:block"
          >
            Sign in
          </Link>
          <Link
            to="/dashboard"
            className="whitespace-nowrap rounded-full bg-d3-flame px-4 py-2.5 text-[13px] font-bold text-white shadow-d3-chunky transition-transform hover:-translate-y-0.5"
          >
            Open Dashboard
          </Link>
          <button
            type="button"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((open) => !open)}
            className="rounded-full border border-d3-choco/10 bg-d3-paper p-2.5 text-d3-choco lg:hidden"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* MOBILE NAV: the desktop nav is hidden below lg, so phones get this panel. */}
      {mobileNavOpen && (
        <nav aria-label="Mobile" className="mx-auto max-w-6xl px-6 pb-2 lg:hidden">
          <div className="card-surface flex flex-col gap-1 p-3 text-[14px] font-medium text-muted-foreground">
            <a
              href="#how"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-xl px-3 py-2.5 transition hover:bg-secondary hover:text-foreground"
            >
              Workflow
            </a>
            <a
              href="#recruiter-audit"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-xl px-3 py-2.5 transition hover:bg-secondary hover:text-foreground"
            >
              Recruiter Audit
            </a>
            <a
              href="#market-reality"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-xl px-3 py-2.5 transition hover:bg-secondary hover:text-foreground"
            >
              Market Reality
            </a>
            <a
              href="#roadmap"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-xl px-3 py-2.5 transition hover:bg-secondary hover:text-foreground"
            >
              Roadmap
            </a>
            <Link
              to="/diagnosis"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-xl px-3 py-2.5 transition hover:bg-secondary hover:text-foreground"
            >
              Diagnosis
            </Link>
            <Link
              to="/auth"
              search={{ redirect: undefined, reset: undefined }}
              onClick={() => setMobileNavOpen(false)}
              className="rounded-xl border-t border-border px-3 py-2.5 font-semibold text-foreground transition hover:bg-secondary sm:hidden"
            >
              Sign in
            </Link>
          </div>
        </nav>
      )}

      <main className="mx-auto max-w-6xl px-6">
        {/* HERO: cream ground, toy-bright blocks, Pilot greets visitors. */}
        {/* Content is visible by default; animate-rise-in is a CSS-only
            progressive enhancement, so the hero renders with no JS too. */}
        <section className="animate-rise-in relative overflow-hidden rounded-[2.5rem] border border-d3-choco/10 bg-d3-paper shadow-d3-chunky">
          {/* Toy-bright colour blocks */}
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 aspect-square w-[46%] max-w-[420px] rounded-full bg-d3-mustard/90"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 -left-16 aspect-square w-[38%] max-w-[320px] rounded-full bg-d3-lime/70"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-[12%] right-[38%] hidden aspect-square w-24 rounded-full bg-d3-peri/70 lg:block"
          />
          <StarBurst
            className="absolute left-[50%] top-[8%] hidden h-6 w-6 text-d3-flame lg:block"
          />
          <StarBurst
            className="absolute bottom-[16%] right-[6%] hidden h-8 w-8 text-d3-koi sm:block"
          />

          <div className="relative z-10 grid gap-10 px-6 py-12 sm:px-10 md:px-14 md:py-16 lg:grid-cols-12 lg:items-center lg:gap-6">
            <div className="lg:col-span-7">
              <p className="d3-chip bg-d3-mustard/25 text-d3-choco">
                For university students, whatever career you want next
              </p>
              <h1 className="d3-display mt-6 text-[clamp(2.8rem,8vw,5.2rem)] font-extrabold leading-[0.95] text-d3-choco">
                <span className="block">Build</span>
                <span className="block">Your</span>
                <span className="relative inline-block text-d3-flame">
                  Future
                  <Squiggle className="absolute -bottom-2 left-0 h-3 w-full text-d3-mustard" />
                </span>
              </h1>
              <p className="mt-8 max-w-[440px] text-[15px] leading-relaxed text-d3-choco/75">
                CareerPilot looks at your resume, projects, and experience the way a recruiter
                would. You get your top 3 gaps and the 1 proof task to build first, whether that
                is backend, design, data, or anything else.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full bg-d3-flame px-6 py-3.5 text-[13.5px] font-bold text-white shadow-d3-chunky transition-transform hover:-translate-y-0.5"
                >
                  Start your roadmap <span aria-hidden>→</span>
                </Link>
                <a
                  href="#how"
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-d3-choco/15 bg-d3-paper px-5 py-3.5 text-[13px] font-bold text-d3-choco transition hover:border-d3-choco/30"
                >
                  Explore how it works
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                <span className="d3-chip bg-d3-peri/60 text-d3-navy">Resume</span>
                <span className="d3-chip bg-d3-lime/70 text-d3-choco">Roadmap</span>
                <span className="d3-chip bg-d3-sky/60 text-d3-navy">Market Mirror</span>
                <span className="d3-chip bg-d3-mustard/50 text-d3-ink">AI Recruiter</span>
              </div>
            </div>

            {/* Pilot, the AI recruiter mascot, greets visitors. */}
            <div className="relative mx-auto flex w-full max-w-[360px] flex-col items-center lg:col-span-5">
              <div className="relative">
                <DoodleCircle className="absolute -inset-4 text-d3-flame/50" />
                <div className="animate-d3-bob relative rounded-full bg-d3-mustard p-4 shadow-d3-chunky">
                  <PilotMascot mood="happy" size={200} />
                </div>
              </div>
              <div className="relative mt-6 rounded-3xl border border-d3-choco/10 bg-d3-paper px-5 py-3 text-center shadow-d3-chunky">
                <span
                  aria-hidden="true"
                  className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-d3-choco/10 bg-d3-paper"
                />
                <p className="d3-display text-[17px] font-bold leading-snug text-d3-choco">
                  Hi, I&apos;m Pilot!
                </p>
                <p className="mt-0.5 text-[13px] font-medium text-d3-choco/70">
                  Ready for your first interview?
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* LIVING POND STRIP: a first taste of the Market Mirror pond. */}
        <KoiStrip className="mt-6 h-28" />

        {/* FEATURE COLLAGE: tilted cards, one per place in the world. */}
        <section id="features" className="py-20 md:py-24">
          <div className="max-w-2xl">
            <p className="d3-chip bg-d3-lime/70 text-d3-choco">Four places, one journey</p>
            <h2 className="d3-display mt-4 text-[clamp(1.9rem,3.6vw,2.6rem)] font-extrabold leading-[1.05] text-d3-choco">
              Your career, mapped as places to explore.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-d3-choco/70">
              No wall of metrics. Each part of CareerPilot is a place with a job to do, and Pilot
              walks with you between them.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {FEATURE_COLLAGE.map((f, idx) => {
              const Icon = f.icon;
              return (
                <Link
                  key={f.title}
                  to={f.link}
                  className={`${f.tilt} ${f.cardClass} group block rounded-[2rem] border border-d3-choco/10 p-7 shadow-d3-chunky transition-shadow hover:shadow-lift sm:p-8 ${
                    idx % 2 === 1 ? "sm:mt-8" : ""
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${f.iconClass}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="d3-display mt-5 text-[24px] font-extrabold leading-none">
                    {f.title}
                  </h3>
                  <p className="mt-2.5 text-[13.5px] font-medium leading-relaxed opacity-80">
                    {f.body}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-extrabold underline-offset-4 group-hover:underline">
                    {f.linkLabel} <ArrowUpRight className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* SECTION 1: END-TO-END WORKFLOW */}
        <section id="how" className="border-t border-d3-choco/10 py-20 md:py-24">
          <div className="max-w-2xl">
            <p className="d3-chip bg-d3-sky/50 text-d3-navy">Complete System Architecture</p>
            <h2 className="d3-display mt-4 text-[clamp(1.9rem,3.6vw,2.6rem)] font-extrabold leading-[1.05] text-d3-choco">
              From current profile to hired professional.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-d3-choco/70">
              CareerPilot replaces fragmented advice with an integrated, intelligence-driven career
              pipeline.
            </p>
          </div>

          <div className="mt-14 space-y-4">
            {STAGES.map((s, idx) => (
              <div
                key={s.n}
                style={{ animationDelay: `${idx * 0.08}s` }}
                className="animate-rise-in d3-card group p-7 transition-shadow duration-200 hover:shadow-lift"
              >
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-5">
                    <span className="d3-display rounded-2xl bg-d3-mustard px-3 py-1.5 text-[14px] font-extrabold tracking-[0.08em] text-d3-ink">
                      {s.n}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="d3-display text-[19px] font-extrabold tracking-[-0.01em] text-d3-choco">
                          {s.title}
                        </h3>
                        <span className="text-[12px] font-semibold text-d3-choco/60">
                          {s.subtitle}
                        </span>
                      </div>
                      <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-d3-choco/70">
                        {s.body}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 md:justify-end">
                    {s.tags.map((tag) => (
                      <span
                        key={tag}
                        className="d3-chip bg-secondary text-d3-choco/70"
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
        <section id="recruiter-audit" className="border-t border-d3-choco/10 py-20 md:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <p className="d3-chip bg-d3-mustard/50 text-d3-ink">Hiring Manager Intelligence</p>
              <h2 className="d3-display mt-4 text-[clamp(1.9rem,3.6vw,2.6rem)] font-extrabold leading-[1.05] text-d3-choco">
                See yourself through a hiring manager&apos;s eyes.
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-d3-choco/70">
                The Recruiter Audit engine evaluates your candidate profile against real industry
                standards. It catches candidate red flags, identifies missing production proof, and
                provides exact positioning rewrites to make your resume unignorable.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-d3-flame" />
                  <div>
                    <p className="text-[13.5px] font-bold text-d3-choco">Red Flag Exposure</p>
                    <p className="text-[12.5px] text-d3-choco/70">
                      Detect formatting errors, vague impact statements, and missing technical
                      proof.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-d3-flame" />
                  <div>
                    <p className="text-[13.5px] font-bold text-d3-choco">
                      Strategic Positioning Advice
                    </p>
                    <p className="text-[12.5px] text-d3-choco/70">
                      Reframe your experience to match what senior engineering leaders actively look
                      for.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/recruiter"
                  className="inline-flex items-center gap-2 text-[13.5px] font-extrabold text-d3-flame hover:underline"
                >
                  Explore Recruiter Audit <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* RECRUITER AUDIT MOCKUP */}
            <div className="lg:col-span-7">
              <div className="d3-card space-y-6 p-7 sm:p-8">
                <div className="flex items-center justify-between border-b border-d3-choco/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-d3-flame/10 text-d3-flame">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="d3-display text-[15px] font-extrabold text-d3-choco">
                        Recruiter Audit Report
                      </h4>
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-d3-choco/70">
                        Example
                      </span>
                      <p className="flex items-center gap-1.5 text-xs text-d3-choco/70">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-d3-leaf" />
                        ATS Match Score: <strong className="text-d3-choco">91%</strong>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="d3-display text-[28px] font-extrabold leading-none text-d3-choco">
                      84
                    </span>
                    <span className="text-[13px] font-semibold text-d3-choco/60">/100</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-d3-flame/25 bg-d3-flame/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-d3-flame">
                        Critical Red Flag Detected
                      </span>
                      <span className="text-xs font-semibold text-d3-flame">High Priority</span>
                    </div>
                    <p className="mt-1.5 text-[13px] font-semibold text-d3-choco">
                      &quot;Resume lacks measurable production metrics for backend
                      microservices.&quot;
                    </p>
                    <p className="mt-1 text-[12px] text-d3-choco/70">
                      Fix: Quantify API throughput or latency reductions in your recent project
                      section.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-d3-leaf/30 bg-d3-leaf/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-[#3c6b28]">
                        Strong Positioning Highlight
                      </span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-[#3c6b28]">
                        <Check className="h-3 w-3" /> Verified
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] font-semibold text-d3-choco">
                      &quot;Strong architecture ownership demonstrated in React & Next.js
                      projects.&quot;
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-secondary/60 px-3.5 py-2 text-xs text-d3-choco/70">
                  <span>3 Red Flags Resolved automatically</span>
                  <span className="font-bold text-d3-flame">Ready for Applications</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE SPOTLIGHT 2: MARKET REALITY & FUTURE TECH */}
        <section id="market-reality" className="border-t border-d3-choco/10 py-20 md:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* PREVIEW CONTAINER */}
            <div className="order-2 lg:order-1 lg:col-span-7">
              <div className="d3-card space-y-6 p-7 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-d3-choco/10 pb-5">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-d3-choco/60">
                      Target Role Demands
                    </span>
                    <p className="d3-display text-[16px] font-extrabold text-d3-choco">
                      AI Systems & Full-Stack Architect
                    </p>
                  </div>
                  <span className="d3-chip border border-d3-flame/30 bg-d3-flame/10 text-d3-flame">
                    <Activity className="h-3.5 w-3.5 animate-pulse" /> Sample Market Snapshot
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-d3-choco/10 bg-d3-cream/60 p-4">
                    <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#3c6b28]">
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
                          className="rounded-full bg-d3-leaf/15 px-2 py-0.5 text-xs font-semibold text-d3-choco"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-d3-choco/10 bg-d3-cream/60 p-4">
                    <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-d3-flame">
                      <AlertTriangle className="h-3.5 w-3.5" /> Outdated / Declining Tech
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {["Legacy jQuery", "REST Monoliths", "Manual Deployments"].map((sk) => (
                        <span
                          key={sk}
                          className="rounded-full bg-d3-flame/10 px-2 py-0.5 text-xs font-semibold text-d3-flame"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-d3-flame/20 bg-d3-flame/5 p-4">
                  <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-d3-flame">
                    <Flame className="h-3.5 w-3.5" /> Global Frontier Tech Intelligence
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-d3-choco/70">
                    Tracks emerging AI models from Google DeepMind, OpenAI, Anthropic, and DeepSeek
                    to ensure your skills align with 2030 paradigm shifts.
                  </p>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 lg:col-span-5">
              <p className="d3-chip bg-d3-sky/50 text-d3-navy">Market Reality Engine</p>
              <h2 className="d3-display mt-4 text-[clamp(1.9rem,3.6vw,2.6rem)] font-extrabold leading-[1.05] text-d3-choco">
                The market changes. Your preparation should too.
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-d3-choco/70">
                CareerPilot continuously cross-evaluates your profile against current industry
                demand data, showing what skills are skyrocketing, what legacy tools are dying, and
                what global tech giants are planning next.
              </p>

              <div className="mt-8">
                <Link
                  to="/market"
                  className="inline-flex items-center gap-2 text-[13.5px] font-extrabold text-d3-flame hover:underline"
                >
                  Explore Market Reality & Future Tech <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE SPOTLIGHT 3: ROADMAP */}
        <section id="roadmap" className="border-t border-d3-choco/10 py-20 md:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <p className="d3-chip bg-d3-lime/70 text-d3-choco">Day-by-Day Roadmap</p>
              <h2 className="d3-display mt-4 text-[clamp(1.9rem,3.6vw,2.6rem)] font-extrabold leading-[1.05] text-d3-choco">
                Turn your roadmap into focused daily progress.
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-d3-choco/70">
                Your roadmap breaks your goal into daily work: one topic, one focused task list,
                and a short check that unlocks the next day.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <Map className="mt-0.5 h-4 w-4 shrink-0 text-d3-flame" />
                  <div>
                    <p className="text-[13.5px] font-bold text-d3-choco">One Day, One Focus</p>
                    <p className="text-[12.5px] text-d3-choco/70">
                      Each day has a clear topic and task list that closes one gap at a time.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-d3-flame" />
                  <div>
                    <p className="text-[13.5px] font-bold text-d3-choco">Visible Daily Progress</p>
                    <p className="text-[12.5px] text-d3-choco/70">
                      Track completed days and paths so you can see exactly how far you have come.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  to="/roadmap"
                  className="inline-flex items-center gap-2 text-[13.5px] font-extrabold text-d3-flame hover:underline"
                >
                  Open Your Roadmap <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* ROADMAP MOCKUP */}
            <div className="lg:col-span-7">
              <div className="d3-card space-y-6 p-7 sm:p-8">
                <div className="flex items-center justify-between border-b border-d3-choco/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-d3-flame/10 text-d3-flame">
                      <Map className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="d3-display text-[15px] font-extrabold text-d3-choco">
                        Roadmap · Day Tasks
                      </h4>
                      <p className="text-xs text-d3-choco/70">Example day from your roadmap</p>
                    </div>
                  </div>
                  <span className="d3-chip shrink-0 bg-secondary text-d3-choco/70">This week</span>
                </div>

                <div className="space-y-3">
                  {[
                    { title: "Improve project search", tag: "Completed", done: true },
                    { title: "Review recruiter feedback", tag: "Completed", done: true },
                    { title: "Complete architecture practice", tag: "In progress", done: false },
                  ].map((task, i) => (
                    <div
                      key={i}
                      className="flex min-w-0 flex-col gap-2 rounded-2xl border border-d3-choco/10 bg-d3-cream/60 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <CheckCircle2
                          className={`h-4 w-4 ${task.done ? "text-d3-leaf" : "text-d3-choco/30"}`}
                        />
                        <span
                          className={`min-w-0 truncate text-[13px] font-medium ${
                            task.done ? "text-d3-choco/60" : "text-d3-choco"
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-d3-flame">{task.tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: PLATFORM CAPABILITIES SUITE */}
        <section className="border-t border-d3-choco/10 py-20 md:py-24">
          <div className="max-w-xl">
            <p className="d3-chip bg-d3-peri/60 text-d3-navy">Full Platform Suite</p>
            <h2 className="d3-display mt-4 text-[clamp(1.9rem,3.6vw,2.6rem)] font-extrabold leading-[1.05] text-d3-choco">
              An ecosystem engineered for career victory.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_SUITE.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`d3-card flex flex-col justify-between p-7 transition-shadow duration-200 hover:shadow-lift ${
                    idx % 2 === 0 ? "d3-tilt-l" : "d3-tilt-r"
                  }`}
                >
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-d3-flame/10 text-d3-flame">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="d3-display mt-5 text-[17px] font-extrabold tracking-[-0.01em] text-d3-choco">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-d3-choco/70">{f.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION: BEFORE VS AFTER TRANSFORMATION */}
        <section className="border-t border-d3-choco/10 py-20 md:py-24">
          <div className="text-center">
            <p className="d3-chip bg-d3-mustard/50 text-d3-ink">The Career Transformation</p>
            <h2 className="d3-display mt-4 text-[clamp(1.9rem,3.6vw,2.6rem)] font-extrabold leading-[1.05] text-d3-choco">
              Replace uncertainty with structured execution.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {BEFORE_AFTER.map((item, i) => (
              <div
                key={i}
                className={`d3-card flex flex-col justify-between p-7 ${
                  i % 2 === 0 ? "d3-tilt-l" : "d3-tilt-r"
                }`}
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-d3-choco/50">
                    Without CareerPilot
                  </span>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-d3-choco/70">
                    &quot;{item.before}&quot;
                  </p>
                </div>

                <div className="mt-6 border-t border-d3-choco/10 pt-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-d3-flame">
                    With CareerPilot AI
                  </span>
                  <p className="mt-2 text-[14px] font-bold leading-relaxed text-d3-choco">
                    {item.after}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CALL TO ACTION */}
        <section className="relative my-16 overflow-hidden rounded-[2.5rem] bg-d3-navy p-10 text-center shadow-d3-chunky md:p-16">
          <StarBurst className="absolute left-[8%] top-[14%] h-7 w-7 text-d3-gold" />
          <StarBurst className="absolute bottom-[18%] right-[9%] h-5 w-5 text-d3-gold" />
          <div
            aria-hidden="true"
            className="absolute -bottom-20 -right-16 aspect-square w-64 rounded-full bg-d3-peri/20"
          />
          <div className="relative mx-auto max-w-2xl space-y-6">
            <div className="flex justify-center">
              <div className="animate-d3-bob rounded-full bg-d3-mustard p-2 shadow-d3-chunky">
                <PilotMascot mood="cheering" size={96} />
              </div>
            </div>
            <p className="d3-chip bg-white/10 text-d3-paper">Take Control of Your Future</p>
            <h2 className="d3-display text-[clamp(2.2rem,5vw,3.6rem)] font-extrabold leading-[0.95] text-d3-paper">
              STOP GUESSING. <br />
              <span className="text-d3-mustard">START WITH A PLAN.</span>
            </h2>
            <p className="text-[14px] leading-relaxed text-d3-paper/75">
              Audit your profile like a recruiter. Master Market Reality. Work your roadmap one
              day at a time.
            </p>
            <div className="pt-2">
              <Link
                to="/diagnosis"
                className="inline-flex items-center gap-2 rounded-full bg-d3-mustard px-8 py-4 text-[14px] font-extrabold text-d3-ink shadow-d3-chunky transition-transform hover:-translate-y-0.5"
              >
                Start Your Career Diagnosis <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-d3-choco/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-d3-flame" />
            <span className="d3-display text-[13px] font-extrabold tracking-[0.14em] text-d3-choco">
              CAREERPILOT AI
            </span>
          </div>
          <div className="flex items-center gap-4 text-[12px] font-bold text-d3-choco/70">
            <Link to="/privacy" className="transition hover:text-d3-choco">
              Privacy
            </Link>
            <Link
              to="/pricing"
              search={{ paid: undefined, cancelled: undefined, tracker: undefined }}
              className="transition hover:text-d3-choco"
            >
              Pricing
            </Link>
            <Link to="/terms" className="transition hover:text-d3-choco">
              Terms
            </Link>
            <Link
              to="/auth"
              search={{ redirect: undefined, reset: undefined }}
              className="transition hover:text-d3-choco"
            >
              Sign in
            </Link>
          </div>
          <p className="text-[12px] text-d3-choco/60">
            © {new Date().getFullYear()} CareerPilot AI. Precision Career Intelligence.
          </p>
        </div>
      </footer>
    </div>
  );
}
