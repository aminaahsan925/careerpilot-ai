import { motion } from "motion/react";
import { Check, ShieldAlert, Sparkles, Star } from "lucide-react";
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
      {/* 1. Match Score Card (Matching User Screenshot Top Right Widget) */}
      <div className="card-surface flex flex-col items-center justify-center p-6 text-center shadow-md">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Evidence Coverage (Heuristic)</p>
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--secondary)" strokeWidth="10" />
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
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
            <span className="font-display text-3xl font-black text-foreground">
              {hasCurrentScore ? audit.overallScore : "N/A"}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs font-bold text-terracotta">
          {hasCurrentScore ? audit.verdictTier : "Previous audit score unavailable"}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {hasCurrentScore
            ? "Evidence rubric only; not a hiring probability."
            : "Run a new audit to get the deterministic evidence score."}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">{audit.headline}</p>
      </div>

      {/* 2. Role Requirements 5-Dot Ratings (Matching User Screenshot Right Panel) */}
      <div className="card-surface p-6 shadow-md md:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Star className="h-4 w-4 text-terracotta fill-terracotta" />
            Role Non-Negotiables & Skill Rating
          </h3>
          <span className="text-[11px] font-bold text-terracotta bg-terracotta/10 px-2.5 py-0.5 rounded-full">
            {companyName} Bar
          </span>
        </div>

        <div className="space-y-3">
          {nonNegs.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4 border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
              <span className="text-xs font-semibold text-foreground truncate">{item.item}</span>

              {/* 5-Dot Rating Indicators matching screenshot */}
              <div className="flex items-center gap-1.5 shrink-0">
                {[1, 2, 3, 4, 5].map((dot) => {
                  const filled = item.youHave;
                  return (
                    <span
                      key={dot}
                      className={`h-2.5 w-2.5 rounded-full transition-colors ${
                        filled ? "bg-terracotta" : "bg-secondary"
                      }`}
                    />
                  );
                })}
                <span className="ml-2 text-[10px] font-extrabold text-muted-foreground w-12 text-right">
                  {item.youHave ? "Present" : "Missing"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
