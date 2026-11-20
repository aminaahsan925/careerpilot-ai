import { Star } from "lucide-react";
import { Ring } from "@/components/analytics";
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
        <Ring
          value={hasCurrentScore ? audit.overallScore : 0}
          size={112}
          stroke={10}
          label={hasCurrentScore ? String(audit.overallScore) : "N/A"}
          sublabel="evidence rubric"
        />
        <p className="mt-3 text-xs font-bold text-primary">
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
            <Star className="h-4 w-4 text-primary fill-primary" />
            Role Non-Negotiables & Skill Rating
          </h3>
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
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
                        filled ? "bg-primary" : "bg-secondary"
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
