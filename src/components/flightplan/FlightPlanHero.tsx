import { motion } from "motion/react";
import { ArrowUpRight, Calendar, Plane, ShieldCheck, Sparkles } from "lucide-react";

import type { TierCoverage } from "@/lib/jobmirror.server";
import jobMirrorHero from "@/assets/job-mirror-hero.png";

/**
 * Flight Plan header. Every number shown is either a count of researched
 * expectations or a count of the student's own proven skills — there are
 * no listing, city or "companies hiring" counts, because no free
 * verifiable source for those exists.
 */
export function FlightPlanHero({
  roleName,
  headline,
  lastResearched,
  mustHave,
  expectationCount,
  isFallback,
}: {
  roleName: string;
  headline: string;
  lastResearched: string;
  mustHave: TierCoverage;
  expectationCount: number;
  isFallback: boolean;
}) {
  const stats = [
    { value: `${mustHave.covered}/${mustHave.total}`, label: "Non-negotiables proven" },
    { value: expectationCount, label: "Researched expectations" },
    { value: `${mustHave.pct}%`, label: "Ready on the basics" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="card-surface overflow-hidden border-ink/10 shadow-lift"
    >
      <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
        {/* ── Left: copy & stats ── */}
        <div className="relative flex flex-col justify-center overflow-hidden bg-gradient-to-br from-ink to-sidebar-accent p-8 text-white sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-[38px] border-terracotta/10" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-terracotta/10 blur-3xl" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta text-white shadow-lg shadow-terracotta/20">
              <Plane className="h-7 w-7" strokeWidth={1.7} />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white/75">
              <ShieldCheck className="h-3.5 w-3.5 text-terracotta" /> Market verified
            </span>
          </div>

          <p className="relative z-10 mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">
            Job Mirror · {roleName}
          </p>

          <h1 className="relative z-10 mt-3 max-w-xl font-display text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-[1.1] tracking-tight text-white">
            What the market
            <br />
            actually asks for
          </h1>

          <p className="relative z-10 mt-4 max-w-md text-sm leading-7 text-white/65">{headline}</p>

          {isFallback && (
            <p className="relative z-10 mt-4 max-w-md rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-200">
              Your target role isn't one of the eight roles we researched, so you're seeing general
              entry-level guidance. Pick a researched role below to get specifics.
            </p>
          )}

          <div className="relative z-10 mt-9 grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-3">
            {stats.map(({ value, label }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.2 + index * 0.09,
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm"
              >
                <p className="font-display text-[clamp(1.65rem,3vw,2.25rem)] font-semibold leading-none tracking-tight text-white">
                  {value}
                </p>
                <p className="mt-2 text-xs font-medium uppercase leading-relaxed tracking-[0.12em] text-white/50">
                  {label}
                </p>
              </motion.div>
            ))}
          </div>

          <p className="relative z-10 mt-7 inline-flex items-center gap-1.5 text-xs text-white/45">
            <Calendar className="h-3.5 w-3.5" strokeWidth={1.7} />
            Market data researched {lastResearched}
          </p>
        </div>

        {/* ── Right: illustration ── */}
        <div className="relative hidden min-h-[360px] items-center justify-center overflow-hidden bg-secondary lg:flex">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-terracotta/10" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-terracotta/10" />
          <div className="absolute left-8 top-8 z-20 rounded-2xl border border-ink/10 bg-white/85 p-4 shadow-card backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-terracotta" /> Your market mirror
            </div>
            <p className="mt-2 text-[13px] font-bold text-foreground">Evidence over assumptions</p>
            <p className="mt-1 max-w-[170px] text-xs leading-relaxed text-muted-foreground">
              See the proof employers expect before you apply.
            </p>
          </div>

          <motion.img
            src={jobMirrorHero}
            alt="Person reviewing job market expectations on a laptop"
            className="relative z-10 h-auto w-full max-w-[380px] translate-y-4 object-contain drop-shadow-xl"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          />
          <div className="absolute bottom-8 right-8 z-20 flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white shadow-lg">
            <ArrowUpRight className="h-3.5 w-3.5 text-terracotta" /> Turn gaps into proof
          </div>
        </div>
      </div>
    </motion.section>
  );
}
