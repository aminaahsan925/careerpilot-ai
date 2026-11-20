import { motion } from "motion/react";
import { ShieldAlert, Sparkles, Star } from "lucide-react";
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import type { RecruiterAudit } from "@/data/recruiter";

interface RecruiterDashboardWidgetsProps {
  audit: RecruiterAudit;
  companyName: string;
}

export function RecruiterDashboardWidgets({ audit, companyName }: RecruiterDashboardWidgetsProps) {
  const nonNegs = audit.expectVsHave || [];
  const hasCurrentScore = audit.scoreVersion === "deterministic-evidence-v1";

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* 1. Evidence coverage ring. */}
      <SpotlightCard className="card-surface flex flex-col items-center justify-center p-6 text-center">
        <p className="cp-eyebrow mb-3">
          Evidence Coverage (Heuristic)
        </p>
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--cp-paper)" strokeOpacity="0.12" strokeWidth="10" />
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="var(--cp-lime2)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="251.2"
              initial={{ strokeDashoffset: 251.2 }}
              animate={{
                strokeDashoffset: hasCurrentScore
                  ? 251.2 - (251.2 * audit.overallScore) / 100
                  : 251.2,
              }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-black text-cp-paper">
              {hasCurrentScore ? audit.overallScore : "N/A"}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs font-bold text-cp-ember">
          {hasCurrentScore ? audit.verdictTier : "Previous audit score unavailable"}
        </p>
        <p className="mt-1 text-[11px] text-cp-paper/60">
          {hasCurrentScore
            ? "Evidence rubric only; not a hiring probability."
            : "Run a new audit to get the deterministic evidence score."}
        </p>
        <p className="mt-1 text-[11px] text-cp-paper/60">{audit.headline}</p>
      </SpotlightCard>

      {/* 2. Role non-negotiables with 5-dot ratings. */}
      <SpotlightCard className="card-surface p-6 md:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-cp-paper flex items-center gap-2">
            <Star className="h-4 w-4 text-cp-lime fill-cp-lime" />
            Role Non-Negotiables &amp; Skill Rating
          </h3>
          <span className="cp-chip bg-cp-lime text-cp-ink">{companyName} Bar</span>
        </div>

        <div className="space-y-3">
          {nonNegs.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4 border-b border-cp-paper/10 pb-2.5 last:border-0 last:pb-0">
              <span className="text-xs font-semibold text-cp-paper truncate">{item.item}</span>

              {/* 5-dot rating indicators. */}
              <div className="flex items-center gap-1.5 shrink-0">
                {[1, 2, 3, 4, 5].map((dot) => {
                  const filled = item.youHave;
                  return (
                    <span
                      key={dot}
                      className={`h-2.5 w-2.5 rounded-full transition-colors ${
                        filled ? "bg-cp-lime" : "bg-cp-paper/15"
                      }`}
                    />
                  );
                })}
                <span className="ml-2 text-[10px] font-extrabold text-cp-paper/60 w-12 text-right">
                  {item.youHave ? "Present" : "Missing"}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-cp-paper/60">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cp-ember" />
          <span>
            Dots show whether the skill is present in your evidence, not a rating out of five.
            The audit reads these from your resume and linked projects.
          </span>
        </p>

        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-cp-paper/60">
          <Sparkles className="h-3.5 w-3.5 text-cp-stone" />
          Close a missing item and it flips to Present on your next audit.
        </p>
      </SpotlightCard>
    </div>
  );
}
