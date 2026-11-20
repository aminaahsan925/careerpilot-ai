import { motion } from "motion/react";
import { ShieldAlert, Sparkles, Star } from "lucide-react";
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
      <div className="d3-card d3-tilt-l flex flex-col items-center justify-center p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-d3-ink/60 mb-3">
          Evidence Coverage (Heuristic)
        </p>
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--d3-cream, #fbf3e0)" strokeWidth="10" />
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="var(--d3-leaf, #528f38)"
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
            <span className="d3-display text-3xl font-black text-d3-ink">
              {hasCurrentScore ? audit.overallScore : "N/A"}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs font-bold text-d3-flame">
          {hasCurrentScore ? audit.verdictTier : "Previous audit score unavailable"}
        </p>
        <p className="mt-1 text-[11px] text-d3-ink/60">
          {hasCurrentScore
            ? "Evidence rubric only; not a hiring probability."
            : "Run a new audit to get the deterministic evidence score."}
        </p>
        <p className="mt-1 text-[11px] text-d3-ink/60">{audit.headline}</p>
      </div>

      {/* 2. Role non-negotiables with 5-dot ratings. */}
      <div className="d3-card d3-tilt-r p-6 md:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-d3-ink flex items-center gap-2">
            <Star className="h-4 w-4 text-d3-mustard fill-d3-mustard" />
            Role Non-Negotiables &amp; Skill Rating
          </h3>
          <span className="d3-chip bg-d3-navy text-white text-[11px]">{companyName} Bar</span>
        </div>

        <div className="space-y-3">
          {nonNegs.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4 border-b border-d3-choco/10 pb-2.5 last:border-0 last:pb-0">
              <span className="text-xs font-semibold text-d3-ink truncate">{item.item}</span>

              {/* 5-dot rating indicators. */}
              <div className="flex items-center gap-1.5 shrink-0">
                {[1, 2, 3, 4, 5].map((dot) => {
                  const filled = item.youHave;
                  return (
                    <span
                      key={dot}
                      className={`h-2.5 w-2.5 rounded-full transition-colors ${
                        filled ? "bg-d3-mustard" : "bg-d3-cream"
                      }`}
                    />
                  );
                })}
                <span className="ml-2 text-[10px] font-extrabold text-d3-ink/60 w-12 text-right">
                  {item.youHave ? "Present" : "Missing"}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-d3-ink/60">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-d3-flame" />
          <span>
            Dots show whether the skill is present in your evidence, not a rating out of five.
            Pilot reads these from your resume and linked projects.
          </span>
        </p>

        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-d3-ink/60">
          <Sparkles className="h-3.5 w-3.5 text-d3-peri" />
          Close a missing item and it flips to Present on your next audit.
        </p>
      </div>
    </div>
  );
}
