import { motion } from "motion/react";
import { Check, Search, Sparkles, UserCheck } from "lucide-react";
import { Lens } from "@/components/lens/Lens";
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import type { RecruiterVerdict } from "@/data/recruiter";

interface RecruiterHeroCardProps {
  targetCompany: string;
  targetRole: string;
  score?: number | null;
  /** Readiness band from the latest audit; null until an audit exists. */
  verdictBand?: RecruiterVerdict["band"] | null;
}

const BAND_LABEL: Record<RecruiterVerdict["band"], string> = {
  ready: "Ready to apply",
  one_gap: "One gap to close",
  not_yet: "Not yet",
};

const BAND_TONE: Record<RecruiterVerdict["band"], string> = {
  ready: "text-cp-lime2",
  one_gap: "text-cp-lime",
  not_yet: "text-cp-ember",
};

const BAND_COPY: Record<RecruiterVerdict["band"], string> = {
  ready: "This role fits your evidence. It is time to apply.",
  one_gap: "One gap to close, then this role is yours. The fix is in the verdict below.",
  not_yet: "Not yet. Every fix below is a real step toward this role.",
};

export function RecruiterHeroCard({
  targetCompany,
  targetRole,
  score = null,
  verdictBand = null,
}: RecruiterHeroCardProps) {
  const bandLabel = verdictBand ? BAND_LABEL[verdictBand] : "No verdict yet";
  const bandTone = verdictBand ? BAND_TONE[verdictBand] : "text-cp-stone";
  const bandCopy = verdictBand
    ? BAND_COPY[verdictBand]
    : "Pick a role and a company, then run the audit. The screen reads like a real recruiter would: no flattery, just the gaps.";

  return (
    <SpotlightCard className="card-surface relative overflow-hidden p-6 sm:p-8">
      {/* Lime glow behind the card content. */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-cp-lime/10 blur-3xl" />

      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left side: headline, subhead, feature badges. */}
        <div className="space-y-5">
          <div className="cp-eyebrow flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-cp-lime" />
            CareerPilot Coach · AI screening coach
          </div>

          <div className="space-y-1.5">
            <h1 className="font-display editorial-title text-4xl text-cp-paper sm:text-5xl lg:text-6xl">
              Audit Right. <br />
              <span className="text-cp-lime">Build Better.</span>
            </h1>
            <p className="max-w-md pt-1 text-xs leading-relaxed font-medium text-cp-paper/70 sm:text-sm">
              The audit checks your resume, projects, and evidence footprint for{" "}
              <strong className="text-cp-paper">{targetRole}</strong> at{" "}
              <span className="font-bold text-cp-lime">{targetCompany}</span>{" "}
              with zero flattery.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-cp-ink p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cp-lime/15 text-cp-lime">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-cp-paper">Smart Sourcing</p>
                <p className="text-[10px] text-cp-paper/60">GitHub &amp; Project Proof</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-cp-ink p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cp-lime2/15 text-cp-lime2">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-cp-paper">CV Screening</p>
                <p className="text-[10px] text-cp-paper/60">ATS Keyword Audit</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: the verdict panel. No face, just the verdict in
            type, with the lens over the evidence score. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="relative w-full rounded-3xl border border-border bg-cp-ink p-6"
        >
          <p className="cp-eyebrow">
            Target · {targetRole}
          </p>

          <p className={`font-display editorial-title mt-4 text-3xl sm:text-4xl ${bandTone}`}>
            {bandLabel}
          </p>
          <p className="mt-3 font-serif text-[15px] leading-relaxed text-cp-paper/80 italic">
            {bandCopy}
          </p>

          {/* Evidence score under the lens: static text, magnified. */}
          <div className="mt-6 border-t border-border pt-5">
            <Lens>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="cp-eyebrow">Evidence score</p>
                  <p className="font-display mt-1 text-4xl font-black tracking-tight text-cp-paper">
                    {score === null ? "n/a" : `${score}/100`}
                  </p>
                </div>
                <div className="flex items-center gap-2 pb-1">
                  {score !== null && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cp-lime2 text-cp-ink">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </span>
                  )}
                  <span className="text-[11px] font-bold text-cp-paper/60">
                    {score === null ? "Run audit first" : "Evidence rubric"}
                  </span>
                </div>
              </div>
            </Lens>
            <p className="mt-2 text-[11px] leading-relaxed text-cp-paper/50">
              Evidence rubric only; not a hiring probability. Move the lens over the
              score to inspect it.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-cp-panel px-4 py-2.5">
            <span className="shrink-0 font-mono text-[11px] font-semibold tracking-[0.18em] text-cp-lime uppercase">
              Coach
            </span>
            <span className="min-w-0 truncate text-right text-[10px] font-bold text-cp-paper/60">
              {targetCompany} Panel
            </span>
          </div>
        </motion.div>
      </div>
    </SpotlightCard>
  );
}
