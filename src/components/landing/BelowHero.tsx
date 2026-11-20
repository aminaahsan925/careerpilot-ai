/*
 * Round 3 landing, everything below the hero. Rendered by worker 1 after
 * HeroLens in src/routes/index.tsx.
 *
 * Disciplined, quiet, one accent. Bento pillars with cursor-tracked
 * spotlight borders (SpotlightCard, worker 1) and a subtle local tilt,
 * a how-it-works strip, a market teaser, and a footer CTA with the
 * magnetic button. No mascots, no koi, no loop motif, no toy colours.
 *
 * Honesty rules (REBUILD-REPORT): no invented numbers anywhere. Pillar
 * cards describe what each tool does; the only figures on the page are
 * structural (four pillars, three steps).
 */

import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  FileSearch,
  Radar,
  Route,
  ScanSearch,
} from "lucide-react";
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import { MagneticButton } from "@/components/lens/MagneticButton";
import { KineticText } from "@/components/lens/KineticText";
import { CornerMark, PlusMark } from "@/components/landing/landing-decor";

/*
 * Subtle pointer tilt for the bento cards (Kiln pattern, kept small:
 * max 4 degrees, no chaos). Runs only on fine pointers with full motion;
 * touch and reduced-motion users get a still card. The transform is
 * written straight to the DOM so pointer moves never re-render.
 */
function TiltCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useRef(false);

  useEffect(() => {
    // Gated on NOT-coarse rather than on fine: real browsers always
    // report fine or coarse, so this is identical there, but
    // environments that report neither (headless shells) get the tilt
    // instead of silently losing it.
    enabled.current =
      !window.matchMedia("(pointer: coarse)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{ transformStyle: "preserve-3d" }}
      onPointerMove={(event) => {
        const el = ref.current;
        if (!el || !enabled.current) return;
        const rect = el.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        el.style.transition = "transform 0.08s linear";
        el.style.transform = `perspective(900px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg)`;
      }}
      onPointerLeave={() => {
        const el = ref.current;
        if (!el || !enabled.current) return;
        el.style.transition = "transform 0.45s ease";
        el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
      }}
    >
      {children}
    </div>
  );
}

const PILLARS = [
  {
    index: "01",
    icon: FileSearch,
    title: "Resume Analysis",
    line: "Your resume, read the way a recruiter reads it.",
    body: "ATS checks, line-level gaps, and a banded verdict with the evidence behind every call. No invented score.",
    to: "/resume",
    cta: "Analyse your resume",
  },
  {
    index: "02",
    icon: Route,
    title: "Learning Roadmap",
    line: "A day-by-day plan built from your actual gaps.",
    body: "Your gaps become ordered steps with real resources. Progress is measured from what you complete, nothing else.",
    to: "/roadmap",
    cta: "See your roadmap",
  },
  {
    index: "03",
    icon: Radar,
    title: "Job Market Mirror",
    line: "Real postings from real boards, researched live.",
    body: "Live postings pulled from public ATS boards, and careers pages researched with sources. A company that has not been researched yet says so.",
    to: "/market",
    cta: "Open the mirror",
  },
  {
    index: "04",
    icon: ScanSearch,
    title: "AI Recruiter",
    line: "A screening funnel, not a roleplay.",
    body: "Resume screen, evidence audit, researched-bar comparison, mock interview. Banded verdicts, no fake probabilities.",
    to: "/recruiter",
    cta: "Run an audit",
  },
] as const;

const STEPS = [
  {
    index: "01",
    title: "Bring your resume",
    body: "Upload the resume you actually send to employers.",
  },
  {
    index: "02",
    title: "See the real picture",
    body: "Your band, your gaps, and what the market is actually asking for.",
  },
  {
    index: "03",
    title: "Close the gaps, day by day",
    body: "A roadmap built from your gaps, and a recruiter audit when you are ready.",
  },
] as const;

const MIRROR_FACTS = [
  {
    title: "Live postings",
    body: "Pulled fresh from public Greenhouse, Lever and Ashby boards.",
  },
  {
    title: "Researched companies",
    body: "Careers pages researched with linked sources and dates shown.",
  },
  {
    title: "Honest unknowns",
    body: "No researched data means it says not researched yet, never a guess.",
  },
] as const;

function Pillars() {
  return (
    <section id="pillars" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
      <div className="max-w-3xl">
        <p className="cp-eyebrow flex items-center gap-2">
          <PlusMark className="h-3 w-3 text-cp-lime" />
          The four pillars
        </p>
        <h2 className="mt-5">
          <KineticText
            text="FOUR TOOLS. ONE CLEAR PICTURE."
            className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-cp-paper sm:text-6xl"
          />
        </h2>
        <p className="mt-5 font-serif text-xl italic leading-snug text-cp-stone sm:text-2xl">
          No guesses. No invented numbers.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((pillar) => (
          <TiltCard key={pillar.title} className="h-full">
            <SpotlightCard className="flex h-full min-h-[19rem] flex-col rounded-2xl border border-white/10 bg-cp-panel p-6">
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-cp-lime">
                  <pillar.icon className="h-5 w-5" strokeWidth={1.6} />
                </span>
                <span className="font-mono text-xs text-cp-stone/70">{pillar.index}</span>
              </div>
              <h3 className="mt-6 font-display text-xl font-bold leading-tight text-cp-paper">
                {pillar.title}
              </h3>
              <p className="mt-2 text-[15px] font-medium leading-snug text-cp-paper/90">
                {pillar.line}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-cp-stone">{pillar.body}</p>
              <Link
                to={pillar.to}
                className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-cp-lime transition-colors hover:text-cp-lime2"
              >
                {pillar.cta}
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </SpotlightCard>
          </TiltCard>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="border-t border-white/10">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-28">
        <p className="cp-eyebrow flex items-center gap-2">
          <PlusMark className="h-3 w-3 text-cp-lime" />
          How it works
        </p>
        <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <div key={step.index} className="border-t border-white/10 pt-6">
              <p className="font-mono text-sm text-cp-lime">{step.index}</p>
              <h3 className="mt-4 font-display text-2xl font-bold leading-tight text-cp-paper">
                {step.title}
              </h3>
              <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-cp-stone">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MarketTeaser() {
  return (
    <section id="market" className="border-t border-white/10">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 px-5 py-24 sm:px-8 sm:py-28 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="cp-eyebrow flex items-center gap-2">
            <PlusMark className="h-3 w-3 text-cp-lime" />
            Job Market Mirror
          </p>
          <h2 className="mt-5 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-cp-paper sm:text-5xl">
            Demand you can check.
          </h2>
          <p className="mt-5 font-serif text-xl italic leading-snug text-cp-stone sm:text-2xl">
            Every number has a source. Every unknown says so.
          </p>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-cp-stone">
            The mirror reads the market as it is, not as a model imagines it.
            When a board is down, it says unavailable. It never fills the gap
            with invented postings.
          </p>
          <Link
            to="/market"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-cp-lime transition-colors hover:text-cp-lime2"
          >
            Open the Market Mirror
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>

        <div className="relative rounded-2xl border border-white/10 bg-cp-panel px-6 py-2 sm:px-8">
          <CornerMark className="absolute -left-px -top-px h-5 w-5 text-cp-lime" />
          <CornerMark className="absolute -bottom-px -right-px h-5 w-5 rotate-180 text-cp-lime" />
          {MIRROR_FACTS.map((fact, i) => (
            <div
              key={fact.title}
              className={`py-6 ${i < MIRROR_FACTS.length - 1 ? "border-b border-white/10" : ""}`}
            >
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-cp-lime">
                {fact.title}
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-cp-paper/90">{fact.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FooterCta() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-7xl px-5 py-24 text-center sm:px-8 sm:py-32">
        <h2>
          <KineticText
            text="STOP GUESSING."
            className="font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight text-cp-paper sm:text-7xl"
          />
        </h2>
        <p className="mx-auto mt-6 max-w-xl font-serif text-xl italic leading-snug text-cp-stone sm:text-2xl">
          See what the market sees, then fix what it finds.
        </p>
        <div className="mt-10 flex justify-center">
          <MagneticButton
            href="/register"
            maxPull={26}
            className="rounded-full bg-cp-lime px-8 py-4 font-display text-base font-bold text-cp-ink"
          >
            Start with your resume
          </MagneticButton>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-6 text-sm text-cp-stone sm:flex-row sm:px-8">
          <p className="font-display font-bold tracking-tight text-cp-paper">
            CareerPilot <span className="text-cp-lime">AI</span>
          </p>
          <nav className="flex items-center gap-6" aria-label="Footer">
            <Link
              to="/pricing"
              search={{ paid: undefined, cancelled: undefined, tracker: undefined }}
              className="transition-colors hover:text-cp-paper"
            >
              Pricing
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-cp-paper">
              Privacy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-cp-paper">
              Terms
            </Link>
          </nav>
          <p className="font-mono text-xs">2026 CareerPilot AI</p>
        </div>
      </div>
    </footer>
  );
}

export function BelowHero() {
  return (
    <div className="bg-cp-ink text-cp-paper">
      <Pillars />
      <HowItWorks />
      <MarketTeaser />
      <FooterCta />
    </div>
  );
}

export default BelowHero;
