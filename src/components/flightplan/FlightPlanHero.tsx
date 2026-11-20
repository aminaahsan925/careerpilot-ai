import { motion } from "motion/react";
import { Calendar, Flashlight as FlashlightIcon, Plane, ShieldCheck } from "lucide-react";

import type { TierCoverage } from "@/lib/jobmirror.server";
import { Flashlight } from "@/components/lens/Flashlight";
import { KineticText } from "@/components/lens/KineticText";
import { Lens } from "@/components/lens/Lens";
import { usePrefersReducedMotion } from "@/components/lens/usePrefersReducedMotion";
import "./flightplan-r3.css";

/**
 * Flight Plan header, Round 3 (Cursor as Flashlight / Lens).
 *
 * The signature moment: the coverage fraction sits under a real glass
 * lens, and below it a flashlight reveals the evidence behind the
 * number. Every number shown is either a count of researched
 * expectations or a count of the student's own proven skills. There
 * are no listing, city or "companies hiring" counts, because no free
 * verifiable source for those exists.
 *
 * The old stock illustration is gone: the evidence panel is the
 * visual now, and no AI-generated imagery is used anywhere here.
 */
export function FlightPlanHero({
  roleName,
  headline,
  lastResearched,
  mustHave,
  expectationCount,
  isFallback,
  evidence,
}: {
  roleName: string;
  headline: string;
  lastResearched: string;
  mustHave: TierCoverage;
  expectationCount: number;
  isFallback: boolean;
  /** The student's own evidence totals, from the report. */
  evidence: {
    projectCount: number;
    hasResume: boolean;
    demonstratedSkillCount: number;
    claimedOnlySkillCount: number;
  };
}) {
  const reduced = usePrefersReducedMotion();
  const evidenceRows = [
    {
      label: "Projects on record",
      value: String(evidence.projectCount),
      source: "Counted from your project records",
    },
    {
      label: "Resume on file",
      value: evidence.hasResume ? "Yes" : "No",
      source: evidence.hasResume
        ? "Your latest resume analysis"
        : "Upload a resume to count it here",
    },
    {
      label: "Skills with proof",
      value: String(evidence.demonstratedSkillCount),
      source: "Project or GitHub proof",
    },
    {
      label: "Claimed without proof",
      value: String(evidence.claimedOnlySkillCount),
      source: "Recorded claims, not proven yet",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-3xl border border-white/10 bg-cp-panel shadow-lift"
    >
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── Left: the statement ── */}
        <div className="relative flex flex-col justify-center overflow-hidden p-8 sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cp-lime/[0.06] blur-3xl" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cp-lime text-cp-ink shadow-lg shadow-cp-lime/20">
              <Plane className="h-7 w-7" strokeWidth={1.7} />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-cp-stone">
              <span className="cp-verify-pulse h-1.5 w-1.5 rounded-full bg-cp-lime" />
              <ShieldCheck className="h-3.5 w-3.5 text-cp-lime" /> Market verified
            </span>
          </div>

          <p className="cp-eyebrow relative z-10 mt-7 text-cp-lime">
            Job Mirror · {roleName}
          </p>

          <h1 className="editorial-title relative z-10 mt-3 max-w-xl font-display text-[clamp(2rem,4.5vw,3.25rem)] text-cp-paper">
            <KineticText text="WHAT THE MARKET ACTUALLY ASKS FOR" />
          </h1>

          <p className="relative z-10 mt-4 max-w-md font-serif text-[17px] italic leading-7 text-cp-stone">
            {headline}
          </p>

          {isFallback && (
            <p className="relative z-10 mt-4 max-w-md rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-200">
              Your target role isn't one of the eight roles we researched, so you're seeing general
              entry-level guidance. Pick a researched role below to get specifics.
            </p>
          )}

          <p className="relative z-10 mt-7 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-cp-stone/70">
            <Calendar className="h-3.5 w-3.5" strokeWidth={1.7} />
            Market data researched {lastResearched}
          </p>
        </div>

        {/* ── Right: the evidence, under the lens ── */}
        <div className="relative flex flex-col justify-center gap-6 border-t border-white/10 bg-cp-ink/60 p-8 sm:p-10 lg:border-l lg:border-t-0">
          <div>
            <p className="cp-eyebrow text-cp-lime">Non-negotiables, under the lens</p>
            <p className="mt-2 text-[12px] leading-relaxed text-cp-stone">
              {reduced
                ? "Your coverage, in full."
                : "Move your cursor over the number to look closer. On touch, tap and drag."}
            </p>
          </div>

          {/* The lens magnifies the live fraction: static text only, no
              interactive elements inside, per the engine's contract. */}
          <Lens magnify={1.6}>
            <div>
              <p className="font-display text-[clamp(4rem,9vw,6.5rem)] font-extrabold leading-none tracking-tight">
                <span className="text-cp-paper">{mustHave.covered}</span>
                <span className="text-cp-stone">/{mustHave.total}</span>
              </p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-cp-stone">
                Non-negotiables proven
              </p>
              <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
                <div>
                  <p className="font-display text-2xl font-bold leading-none text-cp-paper">
                    {mustHave.pct}%
                  </p>
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-cp-stone">
                    Ready on the basics
                  </p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold leading-none text-cp-paper">
                    {expectationCount}
                  </p>
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-cp-stone">
                    Researched expectations
                  </p>
                </div>
              </div>
            </div>
          </Lens>

          <div className="cp-flight-dash" aria-hidden="true">
            <span className="cp-flight-dot" />
          </div>

          {/* The flashlight reveals where each evidence count comes from.
              Base rows carry the provenance line hidden (opacity-0) so
              base and lit layers share exactly the same height, and the
              light never clips a line. dimChildren stays false: the
              counts stay readable at rest, the light only adds the
              provenance. */}
          <div>
            <p className="cp-eyebrow flex items-center gap-2">
              <FlashlightIcon className="h-3.5 w-3.5 text-cp-lime" /> The evidence behind the
              number
            </p>
            <div className="mt-4">
              <Flashlight
                dimChildren={false}
                lit={
                  <div className="space-y-3">
                    {evidenceRows.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-baseline justify-between gap-4 border-b border-white/[0.07] pb-3 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-cp-paper">{row.label}</p>
                          <p className="mt-0.5 font-mono text-[11px] leading-5 text-cp-lime">
                            {row.source}
                          </p>
                        </div>
                        <p className="shrink-0 font-display text-lg font-bold text-cp-paper">
                          {row.value}
                        </p>
                      </div>
                    ))}
                  </div>
                }
              >
                <div className="space-y-3">
                  {evidenceRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-baseline justify-between gap-4 border-b border-white/[0.07] pb-3 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-cp-paper">{row.label}</p>
                        <p
                          aria-hidden="true"
                          className="mt-0.5 font-mono text-[11px] leading-5 text-cp-lime opacity-0"
                        >
                          {row.source}
                        </p>
                      </div>
                      <p className="shrink-0 font-display text-lg font-bold text-cp-paper">
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>
              </Flashlight>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
