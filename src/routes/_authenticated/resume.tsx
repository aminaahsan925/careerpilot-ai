import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  FileCode2,
  Award,
  Check,
  Zap,
  ShieldCheck,
  TrendingUp,
  FileUp,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app/AppLayout";
import { useLatestAnalysis, useLatestResume, useUploadAndAnalyze } from "@/data/resume";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/resume")({
  head: () => ({
    meta: [
      { title: "Resume Intelligence & ATS Audit — CareerPilot AI" },
      {
        name: "description",
        content:
          "Upload your resume for real-time ATS scoring, skill extraction, and recruiter positioning feedback.",
      },
    ],
  }),
  component: ResumePage,
});

/* ------------------------------------------------------------------ */
/* Radial Score Ring Component                                         */
/* ------------------------------------------------------------------ */

function ScoreRing({ value, label, sublabel }: { value: number; label: string; sublabel: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const getColor = (v: number) => {
    if (v >= 80) return "stroke-emerald-500";
    if (v >= 65) return "stroke-terracotta";
    return "stroke-amber-500";
  };

  return (
    <div className="flex flex-col items-center text-center p-4 rounded-2xl border border-border/80 bg-background/50">
      <div className="relative h-[110px] w-[110px]">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--secondary)" strokeWidth="8" />
          <motion.circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            className={cn("transition-all duration-1000", getColor(value))}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (value / 100) * c }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[26px] font-extrabold leading-none tracking-tight text-foreground">
            {value}
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">/ 100</span>
        </div>
      </div>
      <p className="mt-3 text-[13.5px] font-bold text-foreground">{label}</p>
      <p className="text-[11.5px] text-muted-foreground mt-0.5">{sublabel}</p>
    </div>
  );
}

function EmptyStateMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-8 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/40" />
      <p className="mt-2 text-[14px] font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-[12.5px] text-muted-foreground max-w-sm mx-auto">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */

function ResumePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { data: resume, error: resumeError } = useLatestResume();
  const { data: analysis, isLoading, error: analysisError } = useLatestAnalysis();
  const upload = useUploadAndAnalyze();

  function processFile(file: File | undefined) {
    if (!file) return;
    upload.mutate(file, {
      onSuccess: () =>
        toast.success("Resume analyzed successfully!", {
          description: "ATS score, skill extraction, and AI recommendations updated.",
        }),
      onError: (error) => {
        const msg =
          error instanceof Error
            ? error.message
            : typeof error === "object" && error !== null && "message" in error
              ? String((error as Record<string, unknown>)["message"])
              : "Could not process resume file.";
        console.error("[Resume] upload/analyze failed:", error);
        toast.error(msg);
      },
    });
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const busy = upload.isPending || isLoading;

  return (
    <AppLayout
      title="Resume & ATS Intelligence"
      subtitle="Recruiter-grade resume parsing, ATS scoring, and position rewrites"
    >
      <div className="space-y-6 pb-12">
        {/* INTERACTIVE UPLOAD DROPZONE */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "card-surface relative overflow-hidden p-7 transition-all duration-300 border-2 border-dashed",
            isDragging
              ? "border-terracotta bg-terracotta/5 shadow-2xl scale-[1.005]"
              : "border-border/80 hover:border-terracotta/40",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              processFile(e.target.files?.[0]);
              e.currentTarget.value = "";
            }}
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-colors",
                  isDragging ? "bg-terracotta text-white" : "bg-terracotta/10 text-terracotta",
                )}
              >
                {upload.isPending ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <FileUp className="h-7 w-7" strokeWidth={1.8} />
                )}
              </div>

              <div>
                <h3 className="text-[16px] font-bold text-foreground">
                  {upload.isPending
                    ? "Analyzing Resume Structure..."
                    : isDragging
                      ? "Drop your resume file here!"
                      : "Upload or Drag & Drop Resume"}
                </h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Supported formats: <strong className="text-foreground">PDF, DOCX, TXT</strong> (Up
                  to 5MB)
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-secondary/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    ATS Compatible Parser
                  </span>
                  <span className="rounded-md bg-secondary/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Private & Encrypted
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-terracotta px-6 py-3 text-[13.5px] font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50 shadow-lift"
              >
                {upload.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Select Resume File
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ACTIVE SAVED FILE BANNER */}
          {resume && !upload.isPending && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-[12.5px]">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4 text-terracotta" />
                <span>
                  Active File:{" "}
                  <strong className="text-foreground font-semibold">{resume.file_name}</strong>
                </span>
              </div>
              <span className="text-[11.5px] text-muted-foreground">
                Uploaded {new Date(resume.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* ANALYSIS RESULTS DASHBOARD */}
        {analysis ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
            {/* LEFT COLUMN: SCORES, SUMMARY, STRENGTHS, WEAKNESSES & RECOMMENDATIONS */}
            <div className="space-y-6">
              {/* RADIAL METRIC GAUGES */}
              <div className="card-surface p-6">
                <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                  <div>
                    <h3 className="text-[16px] font-bold text-foreground">
                      Executive Score Breakdown
                    </h3>
                    <p className="text-[12px] text-muted-foreground">
                      Calculated across structural ATS rules and target role alignment.
                    </p>
                  </div>
                  <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Analysis Active
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <ScoreRing
                    value={analysis.ats_score}
                    label="ATS Score"
                    sublabel="Keyword & format fit"
                  />
                  <ScoreRing
                    value={analysis.resume_score}
                    label="Impact Score"
                    sublabel="Action verbs & metrics"
                  />
                  <ScoreRing
                    value={analysis.career_match}
                    label="Role Match"
                    sublabel="Target alignment"
                  />
                </div>
              </div>

              {/* EXECUTIVE SUMMARY */}
              {analysis.summary && (
                <div className="card-surface p-6 space-y-3">
                  <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-terracotta">
                    <Sparkles className="h-4 w-4" /> Recruiter Executive Summary
                  </div>
                  <p className="text-[14px] leading-relaxed text-foreground/90 font-medium">
                    &quot;{analysis.summary}&quot;
                  </p>
                </div>
              )}

              {/* STRENGTHS & WEAKNESSES GRID */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* STRENGTHS */}
                <div className="card-surface p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <h4 className="text-[15px] font-bold text-foreground">Competitive Strengths</h4>
                  </div>
                  {analysis.strengths.length ? (
                    <ul className="space-y-3">
                      {analysis.strengths.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-[13px] text-muted-foreground leading-relaxed"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyStateMessage
                      title="No strengths detected"
                      description="Upload a detailed resume to extract strengths."
                    />
                  )}
                </div>

                {/* WEAKNESSES / RED FLAGS */}
                <div className="card-surface p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <AlertTriangle className="h-5 w-5 text-terracotta" />
                    <h4 className="text-[15px] font-bold text-foreground">ATS Red Flags & Gaps</h4>
                  </div>
                  {analysis.weaknesses.length ? (
                    <ul className="space-y-3">
                      {analysis.weaknesses.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-[13px] text-muted-foreground leading-relaxed"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyStateMessage
                      title="No red flags detected"
                      description="Your resume formatting looks strong!"
                    />
                  )}
                </div>
              </div>

              {/* AI REWRITE RECOMMENDATIONS */}
              <div className="card-surface p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-terracotta" />
                    <h4 className="text-[15px] font-bold text-foreground">
                      High-Impact Positioning Rewrites
                    </h4>
                  </div>
                  <span className="text-[11.5px] font-semibold text-muted-foreground">
                    Action Plan
                  </span>
                </div>

                {analysis.recommendations.length ? (
                  <div className="space-y-3">
                    {analysis.recommendations.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/80 bg-background/50 p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-terracotta/10 text-[11px] font-extrabold text-terracotta">
                            {idx + 1}
                          </span>
                          <p className="min-w-0 break-words text-[13.5px] font-medium text-foreground">
                            {item.title}
                          </p>
                        </div>
                        <span className="inline-flex max-w-full whitespace-normal break-words rounded-md bg-terracotta/10 px-2.5 py-1 text-left text-[11px] font-bold text-terracotta sm:max-w-[58%]">
                          {item.impact}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyStateMessage
                    title="No recommendations available"
                    description="Your resume passed core ATS checks."
                  />
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: SKILL INVENTORY & ROLE MATCHES */}
            <div className="space-y-6">
              {/* SKILLS DETECTED */}
              <div className="card-surface p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h4 className="text-[15px] font-bold text-foreground">
                    Extracted Technical Skills
                  </h4>
                  <span className="text-[11.5px] font-bold text-terracotta">
                    {analysis.detected_skills.length} Detected
                  </span>
                </div>

                {analysis.detected_skills.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.detected_skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg border border-border/80 bg-secondary/70 px-3 py-1.5 text-[12px] font-medium text-foreground shadow-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <EmptyStateMessage
                    title="No skills extracted"
                    description="Upload a text-based resume to extract skills."
                  />
                )}
              </div>

              {/* ROLE MATCHES */}
              <div className="card-surface p-6 space-y-4">
                <div className="border-b border-border pb-3">
                  <h4 className="text-[15px] font-bold text-foreground">
                    Market Target Compatibility
                  </h4>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5">
                    Matched against researched industry roles.
                  </p>
                </div>

                {analysis.role_matches.length ? (
                  <div className="space-y-4">
                    {analysis.role_matches.map((match) => (
                      <div key={match.role} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="font-semibold text-foreground truncate">
                            {match.role}
                          </span>
                          <span className="font-bold text-terracotta">{match.match}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${match.match}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full bg-terracotta"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyStateMessage
                    title="No role matches available"
                    description="Set your target role on the onboarding page."
                  />
                )}
              </div>

              {/* EVIDENCE NOTE CARD */}
              <div className="rounded-2xl border border-border bg-ink p-6 text-white space-y-3 shadow-lift">
                <div className="flex items-center gap-2 text-terracotta">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-[13px] font-bold uppercase tracking-wider">
                    Proof Verification Policy
                  </span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-white/75">
                  Skills extracted from your resume improve your overall evidence picture, but
                  CareerPilot treats them as unverified mentions until backed by GitHub
                  repositories, project code, or verifiable portfolio links.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-surface p-12 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta">
              <FileCode2 className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No Resume Analyzed Yet</h3>
            <p className="text-[13.5px] text-muted-foreground max-w-md mx-auto leading-relaxed">
              Upload your PDF, DOCX, or TXT resume using the dropzone above to generate your ATS
              Compatibility Score, skill extraction breakdown, and recruiter position rewrites.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
