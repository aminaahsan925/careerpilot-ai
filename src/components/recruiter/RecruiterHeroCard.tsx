import { motion } from "motion/react";
import { Check, Search, Sparkles, UserCheck } from "lucide-react";
import { PilotMascot, PilotSays, type PilotMood } from "@/components/mascot/PilotMascot";
import type { RecruiterVerdict } from "@/data/recruiter";

interface RecruiterHeroCardProps {
  targetCompany: string;
  targetRole: string;
  score?: number | null;
  /** Readiness band from the latest audit; null until an audit exists. */
  verdictBand?: RecruiterVerdict["band"] | null;
}

/** Pilot reacts to the readiness band: a win cheers, a gap encourages. */
const BAND_MOOD: Record<RecruiterVerdict["band"], PilotMood> = {
  ready: "cheering",
  one_gap: "encouraging",
  not_yet: "thinking",
};

const BAND_COPY: Record<RecruiterVerdict["band"], string> = {
  ready: "Pilot found a match. This role fits your evidence, so it is time to apply.",
  one_gap: "One gap to close, then this role is yours. Pilot has the fix in the verdict below.",
  not_yet: "Not yet, but every fix below is a real step. Pilot will keep score.",
};

export function RecruiterHeroCard({
  targetCompany,
  targetRole,
  score = null,
  verdictBand = null,
}: RecruiterHeroCardProps) {
  const mood: PilotMood = verdictBand ? BAND_MOOD[verdictBand] : "happy";
  const bubble = verdictBand
    ? BAND_COPY[verdictBand]
    : "Pick a role and a company, and Pilot will screen you like a real recruiter would. No flattery, just the gaps.";

  return (
    <div className="d3-card relative overflow-hidden p-6 sm:p-8">
      {/* Toy-bright blobs behind the card content. */}
      <div className="pointer-events-none absolute -top-14 -left-14 h-48 w-48 rounded-full bg-d3-lime/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-14 -right-14 h-48 w-48 rounded-full bg-d3-sky/40 blur-2xl" />

      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left side: headline, subhead, feature badges. */}
        <div className="space-y-5">
          <div className="d3-chip bg-d3-mustard text-d3-ink">
            <Sparkles className="h-3.5 w-3.5" />
            CareerPilot Coach · AI screening coach
          </div>

          <div className="space-y-1.5">
            <h1 className="d3-display text-3xl font-black tracking-tight text-d3-ink sm:text-4xl lg:text-5xl leading-tight">
              Audit Right. <br />
              <span className="text-d3-flame">Build Better.</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium leading-relaxed text-d3-ink/70 max-w-md pt-1">
              Pilot checks your resume, projects, and evidence footprint for{" "}
              <strong className="text-d3-ink">{targetRole}</strong> at{" "}
              <span className="font-bold text-d3-flame">{targetCompany}</span>{" "}
              with zero flattery.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2.5 rounded-2xl border-2 border-d3-choco/15 bg-d3-paper p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-d3-lime/40 text-d3-choco">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-d3-ink">Smart Sourcing</p>
                <p className="text-[10px] text-d3-ink/60">GitHub &amp; Project Proof</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-2xl border-2 border-d3-choco/15 bg-d3-paper p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-d3-sky/50 text-d3-choco">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-d3-ink">CV Screening</p>
                <p className="text-[10px] text-d3-ink/60">ATS Keyword Audit</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Pilot, the recruiter's face, breaking out of the frame. */}
        <div className="relative flex items-center justify-center">
          <div className="d3-tilt-r relative w-full max-w-[380px] rounded-3xl border-2 border-d3-choco bg-d3-paper p-6 shadow-[5px_5px_0_var(--d3-choco)]">
            {/* Top bubble: target role. */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="absolute -top-4 left-6 z-20 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border-2 border-d3-choco bg-d3-mustard px-3.5 py-1.5 shadow-md"
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-d3-navy text-white">
                <Search className="h-3 w-3" />
              </div>
              <div className="text-[11px] leading-snug font-bold text-d3-ink">
                Target: <span className="text-d3-navy">{targetRole}</span>
              </div>
            </motion.div>

            {/* Floating evidence chip. */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute -right-3 top-8 z-20 flex items-center gap-2.5 rounded-2xl border-2 border-d3-choco bg-d3-paper p-2.5 shadow-lg"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-d3-lime text-xs font-black text-d3-ink">
                CP
              </div>
              <div>
                <p className="text-[11px] font-bold text-d3-ink">Evidence score</p>
                <p className="text-[10px] font-extrabold text-d3-flame">
                  {score === null ? "Run audit first" : `${score}/100 evidence`}
                </p>
              </div>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-d3-leaf text-white">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
            </motion.div>

            {/* Pilot, breaking out of the top of the frame. */}
            <div className="relative z-10 -mt-10 flex items-center justify-center pt-2">
              <motion.div
                initial={{ scale: 0.95, rotate: -2 }}
                animate={{ scale: [0.98, 1.02, 0.98], rotate: [-2, 1, -2] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <PilotMascot mood={mood} size={200} />
              </motion.div>
            </div>

            <PilotSays mood={mood} showMascot={false} className="relative z-10 mt-1">
              {bubble}
            </PilotSays>

            {/* Bottom label badge. */}
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-d3-navy px-4 py-2 text-white shadow-md">
              <span className="shrink-0 text-xs font-black tracking-widest uppercase text-d3-mustard">
                Pilot · Coach
              </span>
              <span className="min-w-0 truncate text-right text-[10px] font-bold opacity-80">
                {targetCompany} Panel
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
