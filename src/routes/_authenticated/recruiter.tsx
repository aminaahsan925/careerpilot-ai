import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Clock3,
  Code2,
  ExternalLink,
  FileText,
  Flame,
  Link2,
  Loader2,
  MessageCircle,
  Mic2,
  Search,
  Send,
  ShieldAlert,
  ShieldX,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app/AppLayout";
import { PilotMascot, PilotSays, type PilotMood } from "@/components/mascot/PilotMascot";
import { RecruiterDashboardWidgets } from "@/components/recruiter/RecruiterDashboardWidgets";
import { RecruiterHeroCard } from "@/components/recruiter/RecruiterHeroCard";
import { RecruiterPipelineStepper } from "@/components/recruiter/RecruiterPipelineStepper";
import { Button } from "@/components/ui/button";
import { useCompanyDashboard } from "@/data/company";
import { FEATURED_COMPANIES } from "@/data/company-truth";
import {
  useChatWithRecruiter,
  useMockAttempts,
  useRecruiterSession,
  useRunRecruiterAudit,
  useSubmitMockAnswer,
  type BarComparisonStage,
  type BrutalVerdict,
  type EvidenceAuditStage,
  type MockInterviewAttempt,
  type MockInterviewQuestion,
  type RecruiterAudit,
  type RecruiterSession,
  type RecruiterVerdict,
  type ResumeScreenStage,
} from "@/data/recruiter";
import { useGenerateRoadmapV2 } from "@/data/roadmap-v2";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/recruiter")({
  head: () => ({
    meta: [
      { title: "Recruiter Audit | CareerPilot AI" },
      {
        name: "description",
        content:
          "A staged recruiter screening against real evidence: resume screen, evidence audit, researched company bar, and a mock interview with a deterministic rubric.",
      },
    ],
  }),
  component: RecruiterPage,
});

const LAYOUT_TITLE = "Recruiter Audit";
const LAYOUT_SUBTITLE =
  "A staged screening against real evidence: resume screen, evidence audit, company bar, mock interview. No scores from the AI, no hiring probabilities.";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function CheckStatusIcon({ status }: { status: "pass" | "fail" | "warn" | "unknown" }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
  if (status === "fail") return <XCircle className="h-4 w-4 shrink-0 text-rose-600" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />;
  return <CircleHelp className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

const STATUS_LABEL: Record<"pass" | "fail" | "warn" | "unknown", string> = {
  pass: "Pass",
  fail: "Missing",
  warn: "Check",
  unknown: "Unknown",
};

/** Hostname for display; never throws on a malformed source URL. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 40);
  }
}

function SectionHeading({
  icon: Icon,
  title,
  note,
}: {
  icon: typeof FileText;
  title: string;
  note?: string;
}) {
  return (
    <div>
      <h3 className="d3-display text-lg font-semibold flex items-center gap-2">
        <Icon className="h-5 w-5 text-d3-flame" />
        {title}
      </h3>
      {note && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{note}</p>}
    </div>
  );
}

function LegacyAuditNotice() {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-foreground">
      <p className="font-bold flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        This audit predates the staged screens
      </p>
      <p className="mt-1 text-muted-foreground">
        It was run before the resume screen, evidence audit, bar comparison, and mock interview
        existed. Run a new audit to see the full staged breakdown.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scanning Animation Overlay                                          */
/* ------------------------------------------------------------------ */

const SCAN_STEPS = [
  "Reading your resume and checking it against the job description...",
  "Auditing claimed skills against linked project proof...",
  "Comparing your evidence against the researched company bar...",
  "Drafting mock interview questions from your gaps...",
  "Assembling your verdict and next action...",
];

function ScanningOverlay({ companyName }: { companyName: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev < SCAN_STEPS.length - 1 ? prev + 1 : prev));
    }, 1100);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="d3-card p-8 sm:p-12 text-center my-6 shadow-xl"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
    >
      <div className="mx-auto flex max-w-md flex-col items-center">
        <PilotMascot mood="thinking" size={120} className="mb-2" />

        <p className="text-xs font-bold uppercase tracking-widest text-d3-flame mb-2">
          {companyName} · Live Screening
        </p>
        <h3 className="d3-display text-xl font-bold text-foreground">Recruiter Audit in Progress</h3>

        <div className="mt-6 w-full space-y-3">
          {SCAN_STEPS.map((text, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3.5 text-xs font-medium transition-colors",
                i < step
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700"
                  : i === step
                    ? "border-d3-navy/30 bg-d3-flame/10 text-foreground font-semibold"
                    : "border-border bg-d3-cream text-muted-foreground",
              )}
            >
              {i < step ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : i === step ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-d3-flame" />
              ) : (
                <div className="h-4 w-4 shrink-0 rounded-full border border-border" />
              )}
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Company research state (Step 1)                                     */
/* ------------------------------------------------------------------ */

function CompanyResearchPanel({ companyName }: { companyName: string }) {
  const { data, isLoading, isError } = useCompanyDashboard(companyName);
  const isFeatured = FEATURED_COMPANIES.some((co) => co.name === companyName);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-d3-cream p-4 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-d3-flame" />
        Checking what CareerPilot knows about {companyName}...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed">
        <p className="font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4 text-amber-600" />
          {companyName} is not researched yet
        </p>
        <p className="mt-1 text-muted-foreground">
          Live research could not verify this company&apos;s hiring profile, so the audit cannot
          run for it. Pick one of the researched companies below, or open the Company page to
          research it first.
        </p>
      </div>
    );
  }

  if (data.status === "not_researched" || data.provenance.origin === "unavailable") {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed">
        <p className="font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4 text-amber-600" />
          {companyName} is not researched yet
        </p>
        <p className="mt-1 text-muted-foreground">
          No researched hiring profile exists for this company
          {data.researchError ? `: ${data.researchError}` : ""}. Pick one of the researched
          companies below, or open the Company page to research it first.
        </p>
      </div>
    );
  }

  const researched = data.provenance.origin === "researched";
  const retrievedDate = data.provenance.retrievedAt
    ? new Date(data.provenance.retrievedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="rounded-2xl border border-border bg-d3-cream p-4 text-xs leading-relaxed">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold",
            researched
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
              : "border-amber-500/30 bg-amber-500/10 text-amber-700",
          )}
        >
          {researched ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {researched ? "Researched profile" : "Static dataset (unverified)"}
        </span>
        <span className="text-muted-foreground">
          {researched
            ? `Researched ${retrievedDate ?? "on an unknown date"}`
            : data.provenance.sourceLabel}
        </span>
      </div>
      <p className="mt-2 text-muted-foreground">
        {data.hiringAreas.length > 0
          ? `${data.hiringAreas.length} hiring areas observed · ${data.commonSkills.length} skills tracked`
          : "No hiring areas observed yet."}
        {data.provenance.sources.length > 0 && (
          <>
            {" · Sources: "}
            {data.provenance.sources.slice(0, 2).map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold text-d3-flame hover:underline"
              >
                {hostOf(s.url)}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </>
        )}
      </p>
      {!isFeatured && (
        <p className="mt-2 font-medium text-foreground">
          The audit itself runs only for the researched companies below, so this company&apos;s
          hiring profile is not in the audit dataset yet.
        </p>
      )}
      {!researched && isFeatured && (
        <p className="mt-2 text-muted-foreground">
          The bar-comparison stage will be skipped for this audit: CareerPilot only compares you
          against a researched hiring bar, never the unverified static dataset.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stage 1 — Resume screen                                             */
/* ------------------------------------------------------------------ */

function ResumeScreenSection({ stage }: { stage: ResumeScreenStage }) {
  if (!stage.available) {
    return (
      <div className="d3-card p-6 sm:p-8 space-y-3">
        <SectionHeading
          icon={FileText}
          title="Stage 1: Resume Screen"
          note="The 6-second scan: must-have skills, knockout checks, and formatting gates."
        />
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-muted-foreground">
          {stage.unavailableReason}
        </div>
      </div>
    );
  }

  const passed = stage.skillChecks.filter((c) => c.status === "pass").length;

  return (
    <div className="d3-card d3-tilt-r p-6 sm:p-8 space-y-6">
      <SectionHeading
        icon={FileText}
        title="Stage 1: Resume Screen"
        note={
          stage.source === "job-description"
            ? `Checked against the job description you pasted: ${passed} of ${stage.skillChecks.length} must-have skills found in your resume.`
            : `No job description was pasted, so the must-have list comes from the company bar: ${passed} of ${stage.skillChecks.length} found in your resume.`
        }
      />

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Must-have skills
        </h4>
        <div className="space-y-2">
          {stage.skillChecks.map((check) => (
            <div
              key={check.label}
              className="flex items-start gap-3 rounded-xl border border-border p-3.5"
            >
              <CheckStatusIcon status={check.status} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold text-foreground">{check.label}</p>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {STATUS_LABEL[check.status]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{check.detail}</p>
                {check.lineRef && (
                  <p className="mt-1 text-[11px] font-medium text-d3-flame">{check.lineRef}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Knockout checks
        </h4>
        <div className="space-y-2">
          {stage.knockoutChecks.map((check) => (
            <div
              key={check.label}
              className="flex items-start gap-3 rounded-xl border border-border p-3.5"
            >
              <CheckStatusIcon status={check.status} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold text-foreground">{check.label}</p>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {STATUS_LABEL[check.status]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {stage.formatChecks.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Formatting gates (ATS checks)
          </h4>
          <div className="space-y-2">
            {stage.formatChecks.map((check) => (
              <div
                key={check.label}
                className="flex items-start gap-3 rounded-xl border border-border p-3.5"
              >
                <CheckStatusIcon status={check.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground">{check.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stage 2 — Evidence audit                                            */
/* ------------------------------------------------------------------ */

const EVIDENCE_LEVEL_LABEL: Record<string, string> = {
  PROVEN: "Proven",
  PARTIALLY_PROVEN: "Partially proven",
  WEAK_EVIDENCE: "Weak evidence",
  CLAIMED_ONLY: "Claimed only",
  MISSING: "Missing",
  UNCLEAR: "Unclear",
};

function EvidenceAuditSection({ stage }: { stage: EvidenceAuditStage }) {
  return (
    <div className="d3-card d3-tilt-l p-6 sm:p-8 space-y-6">
      <SectionHeading
        icon={Search}
        title="Stage 2: Evidence Audit"
        note="Claimed vs demonstrated: for each skill your resume claims, the proof behind it: a project, a repo link, or nothing."
      />

      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-d3-flame/5 border border-d3-navy/20 p-4">
        <div>
          <p className="d3-display text-3xl font-black text-foreground">
            {stage.evidenceCoverage}%
          </p>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Evidence coverage
          </p>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          {stage.skillsWithProof} of {stage.claimedSkills} claimed skills have linked proof. This
          is a share of your own claims, not a hiring probability.
        </p>
      </div>

      {stage.items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No skills recorded yet. Add skills on the Profile page and projects with live links to
          build your evidence.
        </p>
      ) : (
        <div className="space-y-2">
          {stage.items.map((item) => (
            <div
              key={item.skill}
              className="flex items-start gap-3 rounded-xl border border-border p-3.5"
            >
              {item.proof ? (
                <Link2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <CircleHelp className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold text-foreground">{item.skill}</p>
                  <span className="rounded-full bg-d3-cream px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {EVIDENCE_LEVEL_LABEL[item.level] ?? item.level}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.reason}</p>
                {item.proof && (
                  <p className="mt-1 text-xs">
                    <span className="font-semibold text-foreground">Proof: </span>
                    {item.proof.url ? (
                      <a
                        href={item.proof.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-d3-flame hover:underline"
                      >
                        {item.proof.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{item.proof.label}</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stage 3 — Bar comparison                                            */
/* ------------------------------------------------------------------ */

function BarComparisonSection({ stage }: { stage: BarComparisonStage }) {
  if (stage.state === "unknown") {
    return (
      <div className="d3-card p-6 sm:p-8 space-y-3">
        <SectionHeading
          icon={Target}
          title="Stage 3: Bar Comparison"
          note="Your evidence profile against the company's researched hiring bar."
        />
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-xs font-bold text-foreground flex items-center gap-2">
            <CircleHelp className="h-4 w-4 text-amber-600" />
            Bar unknown, stage skipped
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stage.reason}</p>
        </div>
      </div>
    );
  }

  const retrievedDate = new Date(stage.retrievedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="d3-card d3-tilt-r p-6 sm:p-8 space-y-6">
      <SectionHeading
        icon={Target}
        title={`Stage 3: Bar Comparison · ${stage.companyName}`}
        note={`Compared against the researched hiring bar (researched ${retrievedDate}). Every item cites its source.`}
      />
      <div className="space-y-2">
        {stage.items.map((item) => (
          <div
            key={item.item}
            className="flex items-start gap-3 rounded-xl border border-border p-3.5"
          >
            {item.status === "meets" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : item.status === "partial" ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold text-foreground">{item.item}</p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    item.status === "meets" && "bg-emerald-500/10 text-emerald-700",
                    item.status === "partial" && "bg-amber-500/10 text-amber-700",
                    item.status === "missing" && "bg-rose-500/10 text-rose-700",
                  )}
                >
                  {item.status === "meets" ? "Meets" : item.status === "partial" ? "Partial" : "Missing"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.evidence}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Source: {item.sourceLabel} · {retrievedDate}
                {item.sourceUrl && (
                  <>
                    {" · "}
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 font-semibold text-d3-flame hover:underline"
                    >
                      {hostOf(item.sourceUrl)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Verdict Card Component (deterministic rubric detail)                */
/* ------------------------------------------------------------------ */

const CATEGORY_ICONS: Record<string, typeof Code2> = {
  "CV Quality": FileText,
  "Technical Skills": Code2,
  "Project Portfolio": BriefcaseBusiness,
  "Interview Readiness": Brain,
  "Market Positioning": TrendingUp,
  "Culture Fit": Award,
};

const SEVERITY_BADGES: Record<
  BrutalVerdict["severity"],
  { label: string; icon: typeof ShieldX; className: string }
> = {
  fatal: {
    label: "Fatal",
    icon: ShieldX,
    className: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  },
  critical: {
    label: "Critical",
    icon: ShieldAlert,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  },
  strong: {
    label: "Strong",
    icon: CheckCircle2,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  },
};

function VerdictCard({ verdict }: { verdict: BrutalVerdict }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = CATEGORY_ICONS[verdict.category] || ShieldAlert;
  const badge = SEVERITY_BADGES[verdict.severity];
  const BadgeIcon = badge.icon;

  return (
    <div className="d3-card overflow-hidden transition-all hover:border-d3-navy/30 shadow-xs">
      <button
        type="button"
        className="flex w-full items-center gap-3.5 p-5 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-d3-flame/10 text-d3-flame">
          <Icon className="h-5 w-5" strokeWidth={1.7} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">{verdict.category}</h4>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
                badge.className,
              )}
            >
              <BadgeIcon className="h-3 w-3" />
              {badge.label}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground font-medium">{verdict.assessment}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border bg-d3-cream px-5 py-3.5 text-xs leading-relaxed">
          <p className="font-bold uppercase tracking-wider text-d3-flame">Fix Prescription</p>
          <p className="mt-1 text-foreground font-medium">{verdict.whatToFix}</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stage 4 — Mock interview                                            */
/* ------------------------------------------------------------------ */

const MOCK_TARGET_SECONDS = 90;

/**
 * The scoring rubric, shown next to every answer. These rules are the
 * deterministic rubric implemented in recruiter.server.ts
 * (scoreMockAnswer). The LLM never scores an answer.
 */
const MOCK_RUBRIC: Array<{
  key: "structure" | "specificity" | "evidence";
  criterion: string;
  rule: string;
}> = [
  {
    key: "structure",
    criterion: "Structure",
    rule: "2 points for 3+ sentences with a clear beginning, middle, and result; 1 for 2 sentences.",
  },
  {
    key: "specificity",
    criterion: "Specificity",
    rule: "2 points for naming both a number or metric and a specific technology; 1 for one of the two.",
  },
  {
    key: "evidence",
    criterion: "Evidence cited",
    rule: "2 points for naming one of your real projects or linking a repo; 1 for a generic project mention.",
  },
];

const QUESTION_SOURCE_LABEL: Record<MockInterviewQuestion["source"], string> = {
  jd: "From the job description",
  company: "Company bar",
  "evidence-gap": "Your evidence gap",
  general: "General practice",
};

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function MockInterviewSection({ session }: { session: RecruiterSession }) {
  const stage = session.auditResult.mockInterview;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<MockInterviewAttempt | null>(null);

  const submit = useSubmitMockAnswer();
  const { data: summary } = useMockAttempts(session.id);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  if (!stage || stage.questions.length === 0) {
    return (
      <div className="d3-card d3-tilt-l p-6 sm:p-8 space-y-3">
        <SectionHeading
          icon={Mic2}
          title="Stage 4: Mock Interview"
          note="Role- and company-specific questions, answered against a timed target and scored on a shown rubric."
        />
        <PilotSays mood="thinking" size={88}>
          No interview questions in this audit. Run a new audit and Pilot will draft your
          questions from the job description and your evidence gaps.
        </PilotSays>
        <LegacyAuditNotice />
      </div>
    );
  }

  const selected = stage.questions.find((q) => q.id === selectedId) ?? stage.questions[0]!;
  const remaining = MOCK_TARGET_SECONDS - elapsed;
  const overTime = elapsed > MOCK_TARGET_SECONDS;

  function selectQuestion(id: string) {
    setSelectedId(id);
    setAnswer("");
    setElapsed(0);
    setTimerRunning(false);
    setLastAttempt(null);
  }

  function handleAnswerChange(value: string) {
    setAnswer(value);
    if (!timerRunning && value.trim().length > 0) setTimerRunning(true);
  }

  function handleSubmit() {
    if (!answer.trim() || submit.isPending) return;
    setTimerRunning(false);
    submit.mutate(
      {
        sessionId: session.id,
        questionId: selected.id,
        question: selected.question,
        answer: answer.trim(),
        timeSpentSeconds: elapsed,
      },
      {
        onSuccess: (data) => setLastAttempt(data.attempt),
        onError: () => toast.error("Could not save your answer. Please try again."),
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="d3-card d3-tilt-l p-6 sm:p-8 space-y-6">
        <SectionHeading
          icon={Mic2}
          title="Stage 4: Mock Interview"
          note={
            stage.generatedBy === "ai"
              ? "Questions drafted by the coach from your job description, the company bar, and your evidence gaps."
              : "AI question drafting was unavailable, so these are template questions built from your job description and evidence gaps."
          }
        />

        <PilotSays mood="happy" size={88}>
          Ready for your first interview? Answer out loud first, then write what you said.
          Pilot times you and scores the answer against the rubric below.
        </PilotSays>

        <div className="space-y-2">
          {stage.questions.map((q) => {
            const isSelected = q.id === selected.id;
            const attempted = summary?.attempts.some((a) => a.questionId === q.id) ?? false;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => selectQuestion(q.id)}
                className={cn(
                  "w-full rounded-xl border p-3.5 text-left transition-colors",
                  isSelected
                    ? "border-d3-navy bg-d3-flame/5"
                    : "border-border hover:border-d3-navy/30",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      isSelected ? "bg-d3-navy text-white" : "bg-d3-cream text-muted-foreground",
                    )}
                  >
                    {q.id.replace("q", "")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-relaxed text-foreground">{q.question}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {QUESTION_SOURCE_LABEL[q.source]} · Tests: {q.focus}
                      {attempted && " · Attempted"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border bg-d3-cream p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold text-foreground flex items-center gap-2">
              <Timer className="h-4 w-4 text-d3-flame" />
              {overTime
                ? `Over the ${MOCK_TARGET_SECONDS}-second target, but you can still submit`
                : `${formatSeconds(Math.max(0, remaining))} left of the ${MOCK_TARGET_SECONDS}-second target`}
            </p>
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {formatSeconds(elapsed)} elapsed
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-d3-cream">
            <div
              className={cn("h-full rounded-full transition-all", overTime ? "bg-amber-500" : "bg-d3-navy")}
              style={{ width: `${Math.min(100, (elapsed / MOCK_TARGET_SECONDS) * 100)}%` }}
            />
          </div>
          <textarea
            value={answer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder="Answer out loud first, then write what you said: situation, action, result, with a number and a project name."
            className="mt-4 min-h-32 w-full resize-y rounded-2xl border border-border bg-card p-4 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-d3-navy"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              {answer.trim().length} characters · The timer starts when you begin typing.
            </p>
            <Button
              onClick={handleSubmit}
              disabled={submit.isPending || !answer.trim()}
              className="rounded-xl px-5 py-2.5 font-bold text-xs bg-d3-navy hover:bg-d3-navy/90 text-white"
            >
              {submit.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Submit answer
                  <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            How answers are scored (rubric shown, the AI never scores)
          </h4>
          <div className="space-y-2">
            {MOCK_RUBRIC.map((row) => {
              const scored = lastAttempt?.rubric.find((r) => r.criterion === row.key);
              return (
                <div
                  key={row.criterion}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border p-3.5"
                >
                  <div>
                    <p className="text-xs font-bold text-foreground">{row.criterion}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{row.rule}</p>
                    {scored && (
                      <p className="mt-1 text-xs font-medium text-d3-flame">{scored.reason}</p>
                    )}
                  </div>
                  {scored && (
                    <span className="shrink-0 rounded-full bg-d3-flame/10 px-2.5 py-1 text-[11px] font-bold text-d3-flame">
                      {scored.score}/{scored.max}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {lastAttempt && (
            <p className="mt-3 text-xs font-bold text-foreground">
              Last answer: {lastAttempt.totalScore}/6 · {formatSeconds(lastAttempt.timeSpentSeconds)}
            </p>
          )}
        </div>
      </div>

      {summary && summary.totalAttempts > 0 && (
        <div className="d3-card d3-tilt-r p-6 sm:p-8 space-y-4">
          <SectionHeading
            icon={TrendingUp}
            title="Your progress over time"
            note={`${summary.totalAttempts} attempt${summary.totalAttempts === 1 ? "" : "s"} on this audit · Average ${summary.averageTotal ?? "n/a"}/6 · Best ${summary.bestTotal ?? "n/a"}/6`}
          />
          <div className="space-y-2">
            {[...summary.attempts].reverse().slice(0, 5).map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-relaxed text-foreground">{attempt.question}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(attempt.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {formatSeconds(attempt.timeSpentSeconds)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-d3-cream px-2.5 py-1 text-[11px] font-bold text-foreground">
                  {attempt.totalScore}/6
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Coach Chat (reframed — never "Head of Talent at {real company}")    */
/* ------------------------------------------------------------------ */

function CoachChat({ session, companyName }: { session: RecruiterSession; companyName: string }) {
  const [input, setInput] = useState("");
  const chat = useChatWithRecruiter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState(session.chatMessages);

  useEffect(() => {
    setMessages(session.chatMessages);
  }, [session.chatMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(msg?: string) {
    const text = (msg ?? input).trim();
    if (!text || chat.isPending) return;
    setInput("");

    setMessages((prev) => [...prev, { role: "student" as const, content: text }]);

    chat.mutate(
      { sessionId: session.id, message: text },
      {
        onSuccess: (data) => setMessages(data.messages),
        onError: () => toast.error("Failed to send message."),
      },
    );
  }

  const QUICK_QUESTIONS = [
    "What specific project should I build to close my biggest gap?",
    "How do I prepare for the technical interview?",
    "What skills should I prioritize learning first?",
    "Is my resume good enough for ATS screening?",
  ];

  return (
    <div className="d3-card d3-tilt-l overflow-hidden shadow-md">
      <div className="flex items-center gap-3 border-b border-border bg-d3-cream px-6 py-4">
        <PilotMascot mood="happy" size={44} className="shrink-0" />
        <div>
          <h4 className="text-sm font-bold text-foreground">Practice with a recruiter-style coach</h4>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Coaching for {companyName}, a practice coach, not their hiring team
          </p>
        </div>
      </div>

      <div className="max-h-[380px] space-y-3 overflow-y-auto p-6">
        {messages.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground font-medium">
            Ask the coach anything: how to close your gaps, how to prepare, project ideas, or why
            an application would be rejected.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "student" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed font-medium",
                msg.role === "student"
                  ? "rounded-br-xs bg-d3-navy text-white font-semibold"
                  : "rounded-bl-xs bg-d3-cream text-foreground",
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {chat.isPending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-xs bg-d3-cream px-4 py-3 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-d3-flame" />
              Pilot is typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex flex-wrap gap-2 px-6 pb-3">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleSend(q)}
            disabled={chat.isPending}
            className="rounded-full bg-d3-cream px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-d3-cream/70 hover:text-foreground disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-border p-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask Pilot..."
          disabled={chat.isPending}
          className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-medium outline-none focus:border-d3-navy"
        />
        <Button
          type="button"
          onClick={() => handleSend()}
          disabled={chat.isPending || !input.trim()}
          className="rounded-xl px-4 bg-d3-navy hover:bg-d3-navy/90 text-white"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stage 5: Verdict & next action                                     */
/* ------------------------------------------------------------------ */

/** Pilot's face for each readiness band (see the mood convention in PilotMascot). */
const VERDICT_MOOD: Record<RecruiterVerdict["band"], PilotMood> = {
  ready: "cheering",
  one_gap: "encouraging",
  not_yet: "thinking",
};

const VERDICT_PILOT_COPY: Record<RecruiterVerdict["band"], string> = {
  ready: "Pilot found a match. You are ready to apply for this role.",
  one_gap: "One gap to close. Fix it, then apply.",
  not_yet: "Not yet, but every fix below is a real step. Pilot will keep score.",
};

function VerdictSection({
  audit,
  verdict,
  onAddToRoadmap,
  roadmapPending,
}: {
  audit: RecruiterAudit;
  verdict: RecruiterVerdict;
  onAddToRoadmap: () => void;
  roadmapPending: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="d3-card d3-tilt-r p-6 sm:p-8 space-y-4">
        <SectionHeading
          icon={Flame}
          title="Stage 5: Verdict"
          note="Readiness in plain language. Every claim below traces to a stage output, with no percentages-as-probabilities."
        />
        <PilotSays mood={VERDICT_MOOD[verdict.band]} size={88}>
          {VERDICT_PILOT_COPY[verdict.band]}
        </PilotSays>
        <div
          className={cn(
            "rounded-2xl border p-5",
            verdict.band === "ready" && "border-emerald-500/30 bg-emerald-500/5",
            verdict.band === "one_gap" && "border-amber-500/30 bg-amber-500/5",
            verdict.band === "not_yet" && "border-d3-navy/30 bg-d3-flame/5",
          )}
        >
          <p className="d3-display text-xl font-black text-foreground">{verdict.headline}</p>
          {verdict.topFixes.length > 0 && (
            <ol className="mt-3 space-y-2">
              {verdict.topFixes.map((fix, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-d3-flame/10 text-[10px] font-bold text-d3-flame">
                    {i + 1}
                  </span>
                  <span>
                    {fix.fix}{" "}
                    <span className="text-muted-foreground">({fix.stage})</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-2xl border border-d3-navy/20 bg-d3-flame/5 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-d3-flame">
            Your single highest-value next action
          </p>
          <p className="mt-2 text-sm font-bold text-foreground">{verdict.nextAction.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {verdict.nextAction.detail} <span className="font-medium">({verdict.nextAction.stage})</span>
          </p>
        </div>
      </div>

      <div className="d3-card p-6 sm:p-8 space-y-3">
        <h3 className="d3-display text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-d3-flame" />
          Recommended Proof Project to Build
        </h3>
        <h4 className="text-sm font-bold text-foreground">{audit.whatYouNeedToBuild.title}</h4>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {audit.whatYouNeedToBuild.description}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {audit.whatYouNeedToBuild.techStack.map((t) => (
            <span
              key={t}
              className="rounded-full bg-d3-flame/10 px-3 py-1 text-xs font-bold text-d3-flame"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="pt-4">
          <Button
            onClick={onAddToRoadmap}
            disabled={roadmapPending}
            className="w-full rounded-xl py-3 font-bold text-xs bg-d3-navy hover:bg-d3-navy/90 text-white"
          >
            {roadmapPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4" />
                Add Fixes & Project to My Roadmap
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page Component                                                */
/* ------------------------------------------------------------------ */

function RecruiterPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState<number>(1);

  // Company selection states
  const [isCustomCompany, setIsCustomCompany] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("Systems Limited");
  const [customCompanyInput, setCustomCompanyInput] = useState("");
  const [selectedRole, setSelectedRole] = useState("Associate Software Engineer");
  const [jobDescription, setJobDescription] = useState("");

  const effectiveCompany = isCustomCompany
    ? customCompanyInput.trim() || "Target Company"
    : selectedCompany;
  const isFeaturedCompany = FEATURED_COMPANIES.some((co) => co.name === effectiveCompany);

  const { data: existingSession } = useRecruiterSession();
  const runAudit = useRunRecruiterAudit();
  const generateRoadmap = useGenerateRoadmapV2();
  const [currentSession, setCurrentSession] = useState<RecruiterSession | null>(null);

  useEffect(() => {
    if (existingSession && !currentSession) {
      setCurrentSession(existingSession);
      // BUG FIX (2026-10-30): Step 1 defaulted to Systems Limited even when
      // the loaded session was for another company (e.g. NetSol), so
      // "Source Proof" showed the session's company while the header
      // showed a different one. Sync the form to the loaded session.
      const featured = FEATURED_COMPANIES.some((co) => co.name === existingSession.companyName);
      if (featured) {
        setIsCustomCompany(false);
        setSelectedCompany(existingSession.companyName);
      } else {
        setIsCustomCompany(true);
        setCustomCompanyInput(existingSession.companyName);
      }
      if (existingSession.targetRole) setSelectedRole(existingSession.targetRole);
    }
  }, [existingSession, currentSession]);

  const hasSession = Boolean(currentSession);
  const hasStages = Boolean(
    currentSession?.auditResult.resumeScreen &&
      currentSession?.auditResult.evidenceAudit &&
      currentSession?.auditResult.barComparison &&
      currentSession?.auditResult.mockInterview &&
      currentSession?.auditResult.verdict,
  );

  function handleRunAudit() {
    if (isCustomCompany && !customCompanyInput.trim()) {
      toast.error("Please enter a custom company name.");
      return;
    }
    if (!isCustomCompany && !selectedCompany) {
      toast.error("Please select a target company.");
      return;
    }
    if (!isFeaturedCompany) {
      toast.error(
        "The audit runs only for researched companies. Pick one of the featured companies.",
      );
      return;
    }
    if (!selectedRole.trim()) {
      toast.error("Please enter a target role position.");
      return;
    }

    runAudit.mutate(
      {
        company: effectiveCompany,
        role: selectedRole,
        ...(jobDescription.trim() ? { jobDescription: jobDescription.trim() } : {}),
      },
      {
        onSuccess: (session) => {
          setCurrentSession(session);
          setActiveStep(2);
          toast.success("Recruiter audit complete!");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Audit failed. Please try again.");
        },
      },
    );
  }

  function handleAddToRoadmap() {
    generateRoadmap.mutate(undefined, {
      onSuccess: () => {
        toast.success("Fixes added to your roadmap!");
        void navigate({ to: "/roadmap" });
      },
      onError: () => toast.error("Couldn't generate roadmap."),
    });
  }

  return (
    <AppLayout title={LAYOUT_TITLE} subtitle={LAYOUT_SUBTITLE}>
      <div className="space-y-6 pb-12">
        <RecruiterHeroCard
          targetCompany={effectiveCompany}
          targetRole={selectedRole}
          score={
            currentSession?.auditResult.scoreVersion === "deterministic-evidence-v1"
              ? currentSession.overallScore
              : null
          }
          verdictBand={currentSession?.auditResult.verdict?.band ?? null}
        />

        <RecruiterPipelineStepper
          activeStep={activeStep}
          onStepClick={setActiveStep}
          hasSession={hasSession}
        />

        <AnimatePresence mode="wait">
          {runAudit.isPending ? (
            <ScanningOverlay companyName={effectiveCompany} />
          ) : (
            <motion.div key={activeStep} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              {/* STEP 1: Define Role & Target Employer */}
              {activeStep === 1 && (
                <div className="d3-card d3-tilt-l p-6 sm:p-8 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="d3-display text-xl font-bold text-foreground sm:text-2xl">
                        Select Target Employer
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pick a researched employer, then paste the real job description for the
                        role. The audit screens your actual resume, projects, and evidence.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCustomCompany(!isCustomCompany)}
                      className="rounded-xl border-d3-navy/30 text-xs font-bold text-d3-flame hover:bg-d3-flame/10"
                    >
                      {isCustomCompany ? "← Choose Featured" : "+ Custom Company"}
                    </Button>
                  </div>

                  {isCustomCompany ? (
                    <div className="space-y-3 rounded-2xl border border-d3-navy/20 bg-d3-cream p-5">
                      <label className="text-xs font-bold uppercase tracking-wider text-d3-flame">
                        Enter Any Company Name
                      </label>
                      <input
                        type="text"
                        value={customCompanyInput}
                        onChange={(e) => setCustomCompanyInput(e.target.value)}
                        placeholder="e.g. Careem, Devsinc, Google, Arbitsoft, Folio3..."
                        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-xs font-semibold outline-none focus:border-d3-navy"
                      />
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {FEATURED_COMPANIES.map((co) => {
                        const isSelected = selectedCompany === co.name;
                        return (
                          <button
                            key={co.id}
                            type="button"
                            onClick={() => setSelectedCompany(co.name)}
                            className={cn(
                              "group relative flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all",
                              isSelected
                                ? "border-d3-navy bg-d3-flame/5 ring-2 ring-d3-navy/40 shadow-xs"
                                : "border-border bg-card hover:border-d3-navy/30",
                            )}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-d3-cream font-extrabold text-xs text-foreground">
                              {co.shortName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-foreground">{co.name}</p>
                              <p className="truncate text-[11px] text-muted-foreground">{co.tier}</p>
                            </div>
                            {isSelected && (
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-d3-navy text-white">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {effectiveCompany !== "Target Company" && (
                    <CompanyResearchPanel companyName={effectiveCompany} />
                  )}

                  <div className="pt-2">
                    <label className="text-xs font-bold text-foreground">Target Role Position</label>
                    <input
                      type="text"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      placeholder="Associate Software Engineer"
                      className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-4 text-xs font-semibold outline-none focus:border-d3-navy"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground">
                      Job Description <span className="text-muted-foreground font-medium">(paste the real posting, recommended)</span>
                    </label>
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder={"Paste the full job description here. The resume screen checks your resume against its must-have skills, and the mock interview questions are drafted from it.\n\nWithout a JD, the screen checks against the company bar instead."}
                      className="mt-1.5 min-h-36 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-xs leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-d3-navy"
                    />
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {jobDescription.trim().length} characters · Only the extracted keywords are
                      kept with the audit, not the full text.
                    </p>
                  </div>

                  <Button
                    onClick={handleRunAudit}
                    disabled={runAudit.isPending || !selectedRole.trim() || !isFeaturedCompany}
                    title={
                      !isFeaturedCompany
                        ? "The audit runs only for researched companies, so pick a featured company."
                        : undefined
                    }
                    className="w-full rounded-xl py-3 font-bold text-xs bg-d3-navy hover:bg-d3-navy/90 text-white"
                  >
                    {runAudit.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Run Recruiter Audit for {effectiveCompany}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Steps 2-5 need a session; the stepper disables them, this is defense in depth. */}
              {activeStep > 1 && !currentSession && (
                <div className="d3-card d3-tilt-r p-8 text-center">
                  <PilotMascot mood="sleeping" size={110} className="mx-auto" />
                  <p className="d3-display text-lg font-bold text-foreground">Run an audit first</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pick a company and role on step 1, and the stage screens unlock once an audit
                    exists.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="mt-4 rounded-xl bg-d3-navy px-5 py-2.5 text-xs font-bold text-white hover:bg-d3-navy/90"
                  >
                    Go to step 1
                  </Button>
                </div>
              )}

              {/* STEP 2: Resume Screen + Evidence Audit */}
              {activeStep === 2 && currentSession && (
                <div className="space-y-6">
                  {hasStages ? (
                    <>
                      <ResumeScreenSection stage={currentSession.auditResult.resumeScreen!} />
                      <EvidenceAuditSection stage={currentSession.auditResult.evidenceAudit!} />
                    </>
                  ) : (
                    <LegacyAuditNotice />
                  )}

                  <div className="flex justify-end pt-4 border-t border-border mt-6">
                    <Button
                      onClick={() => setActiveStep(3)}
                      className="rounded-xl px-6 py-2.5 font-bold text-xs bg-d3-navy hover:bg-d3-navy/90 text-white"
                    >
                      Continue to Evidence & Bar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Bar Comparison + Scorecard + Rubric detail */}
              {activeStep === 3 && currentSession && (
                <div className="space-y-6">
                  {hasStages ? (
                    <>
                      <BarComparisonSection stage={currentSession.auditResult.barComparison!} />
                      <RecruiterDashboardWidgets audit={currentSession.auditResult} companyName={currentSession.companyName} />
                    </>
                  ) : (
                    <>
                      <LegacyAuditNotice />
                      <RecruiterDashboardWidgets audit={currentSession.auditResult} companyName={currentSession.companyName} />
                    </>
                  )}

                  <div>
                    <h3 className="d3-display text-lg font-semibold mb-3 flex items-center gap-2">
                      <Flame className="h-5 w-5 text-d3-flame" />
                      Evidence Rubric Detail
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {currentSession.auditResult.brutalVerdicts.map((v) => (
                        <VerdictCard key={v.category} verdict={v} />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-border mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setActiveStep(2)}
                      className="rounded-xl px-6 py-2.5 font-bold text-xs"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Resume Screen
                    </Button>
                    <Button
                      onClick={() => setActiveStep(4)}
                      className="rounded-xl px-6 py-2.5 font-bold text-xs bg-d3-navy hover:bg-d3-navy/90 text-white"
                    >
                      Continue to Mock Interview
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 4: Mock Interview + Coach Chat */}
              {activeStep === 4 && currentSession && (
                <div className="space-y-6">
                  <MockInterviewSection session={currentSession} />

                  <div>
                    <h3 className="d3-display text-lg font-semibold mb-3 flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-d3-flame" />
                      Practice with the Coach
                    </h3>
                    <CoachChat session={currentSession} companyName={currentSession.companyName} />
                  </div>

                  <div className="flex justify-between pt-4 border-t border-border mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setActiveStep(3)}
                      className="rounded-xl px-6 py-2.5 font-bold text-xs"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Evidence & Bar
                    </Button>
                    <Button
                      onClick={() => setActiveStep(5)}
                      className="rounded-xl px-6 py-2.5 font-bold text-xs bg-d3-navy hover:bg-d3-navy/90 text-white"
                    >
                      Continue to Verdict
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 5: Verdict & Action Plan */}
              {activeStep === 5 && currentSession && (
                <div className="space-y-6">
                  {hasStages && currentSession.auditResult.verdict ? (
                    <VerdictSection
                      audit={currentSession.auditResult}
                      verdict={currentSession.auditResult.verdict}
                      onAddToRoadmap={handleAddToRoadmap}
                      roadmapPending={generateRoadmap.isPending}
                    />
                  ) : (
                    <div className="space-y-6">
                      <LegacyAuditNotice />
                      <div className="d3-card p-6 sm:p-8 space-y-3">
                        <h3 className="d3-display text-lg font-semibold flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-d3-flame" />
                          Recommended Proof Project to Build
                        </h3>
                        <h4 className="text-sm font-bold text-foreground">
                          {currentSession.auditResult.whatYouNeedToBuild.title}
                        </h4>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {currentSession.auditResult.whatYouNeedToBuild.description}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {currentSession.auditResult.whatYouNeedToBuild.techStack.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-d3-flame/10 px-3 py-1 text-xs font-bold text-d3-flame"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        <div className="pt-4">
                          <Button
                            onClick={handleAddToRoadmap}
                            disabled={generateRoadmap.isPending}
                            className="w-full rounded-xl py-3 font-bold text-xs bg-d3-navy hover:bg-d3-navy/90 text-white"
                          >
                            {generateRoadmap.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <BookOpen className="mr-2 h-4 w-4" />
                                Add Fixes & Project to My Roadmap
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-start pt-4 border-t border-border mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setActiveStep(4)}
                      className="rounded-xl px-6 py-2.5 font-bold text-xs"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Mock Interview
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
