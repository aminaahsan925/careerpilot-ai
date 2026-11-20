/**
 * Resume page, Direction 3 (Character-Led / Living World).
 *
 * The resume score is a FACE that changes expression (Loop pattern):
 * the Pilot mascot reacts to the real deterministic ATS score. The
 * score stays a checklist number, never a chance of being hired.
 * All analysis, upload and checklist logic is unchanged; this file
 * only re-skins the page and adds the face.
 */
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
  Award,
  Check,
  Zap,
  ShieldCheck,
  TrendingUp,
  FileUp,
  RefreshCw,
  ArrowUpRight,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app/AppLayout";
import { PilotMascot } from "@/components/mascot/PilotMascot";
import { useLatestAnalysis, useLatestResume, useUploadAndAnalyze } from "@/data/resume";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/resume")({
  head: () => ({
    meta: [
      { title: "Resume Intelligence & ATS Audit - CareerPilot AI" },
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
/* Score face: the Pilot mascot reacts to the real ATS score           */
/* ------------------------------------------------------------------ */

type ScoreMood = "thinking" | "cheering" | "happy" | "encouraging";

function moodForAts(ats: number | null): ScoreMood {
  if (ats === null) return "thinking";
  if (ats >= 80) return "cheering";
  if (ats >= 65) return "happy";
  return "encouraging";
}

const MOOD_COPY: Record<ScoreMood, { title: string; line: string }> = {
  thinking: {
    title: "No score yet",
    line: "Upload a resume and I will read it with you.",
  },
  cheering: {
    title: "This resume reads clean",
    line: "Strong shape. Keep it sharp with every application.",
  },
  happy: {
    title: "Solid shape",
    line: "A few fixes below will lift it higher.",
  },
  encouraging: {
    title: "Lots of room to grow",
    line: "Every fix is listed below. Start at the top.",
  },
};

function ScoreFace({ ats }: { ats: number | null }) {
  const mood = moodForAts(ats);
  const copy = MOOD_COPY[mood];
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-[var(--d3-cream)] p-4 text-center sm:flex-row sm:text-left">
      <PilotMascot mood={mood} className="h-24 w-24 shrink-0 sm:h-28 sm:w-28" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-center gap-x-2 sm:justify-start">
          {ats !== null ? (
            <span className="d3-display text-[30px] leading-none">
              {ats}
              <span className="ml-1 text-[14px] font-bold text-[var(--d3-choco)]/60">/100</span>
            </span>
          ) : null}
          <span className="text-[15px] font-bold">{copy.title}</span>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--d3-choco)]/70">
          {copy.line}
        </p>
        <p className="mt-1.5 text-[12px] font-semibold text-[var(--d3-choco)]/60">
          ATS checklist score. Deterministic format checks, not a hiring chance.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Radial Score Ring Component                                         */
/* ------------------------------------------------------------------ */

function ScoreRing({ value, label, sublabel }: { value: number | null; label: string; sublabel: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const getColor = (v: number) => {
    if (v >= 80) return "stroke-[var(--d3-leaf)]";
    if (v >= 65) return "stroke-[var(--d3-flame)]";
    return "stroke-[var(--d3-mustard)]";
  };

  return (
    <div className="flex flex-col items-center rounded-2xl border border-[var(--d3-choco)]/10 bg-[var(--d3-cream)]/70 p-4 text-center">
      <div className="relative h-[110px] w-[110px]">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--d3-cream)" strokeWidth="8" />
          <motion.circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            className={cn("transition-all duration-1000", value === null ? "stroke-[var(--d3-choco)]/20" : getColor(value))}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - ((value ?? 0) / 100) * c }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[26px] font-extrabold leading-none tracking-tight">
            {value ?? "N/A"}
          </span>
          {value !== null && <span className="text-[10px] font-semibold uppercase text-[var(--d3-choco)]/60">/ 100</span>}
        </div>
      </div>
      <p className="mt-3 text-[13.5px] font-bold">{label}</p>
      <p className="mt-0.5 text-[12px] text-[var(--d3-choco)]/70">{sublabel}</p>
    </div>
  );
}

function EmptyStateMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-8 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-[var(--d3-choco)]/30" />
      <p className="mt-2 text-[14px] font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-[var(--d3-choco)]/70">{description}</p>
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
  const { data: analysis, isLoading, error: analysisError } = useLatestAnalysis(resume?.id);
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
  const priorityActions = analysis?.recommendations.slice(0, 4) ?? [];
  const scoreRows = analysis
    ? [
        { label: "ATS compatibility", value: analysis.ats_score },
        { label: "Resume impact", value: analysis.resume_score },
      ]
    : [];
  const roleScoreAvailable = Boolean(analysis?.role_matches.length);
  const lowestScore = scoreRows.length ? Math.min(...scoreRows.map((item) => item.value)) : 0;
  const readinessLabel =
    lowestScore >= 75
      ? "Ready for targeted applications"
      : lowestScore >= 55
        ? "Promising, but evidence is thin"
        : "Not competitive yet";

  return (
    <AppLayout
      title="Resume & ATS Intelligence"
      subtitle="Recruiter-grade resume parsing, ATS scoring, and position rewrites"
    >
      {/* Cream poster board: the tilted collage lives on it. */}
      <div className="w-full space-y-6 overflow-x-clip rounded-3xl bg-[var(--d3-cream)] p-3 pb-12 sm:p-5">
        {/* Surface load failures instead of silently showing an empty page. */}
        {(resumeError || analysisError) && (
          <div className="rounded-xl border border-[var(--d3-flame)]/30 bg-[var(--d3-flame)]/10 px-5 py-4">
            <p className="flex items-center gap-2 text-[13px] font-bold text-[var(--d3-choco)]">
              <AlertTriangle className="h-4 w-4 text-[var(--d3-flame)]" />
              Couldn&apos;t load your resume data
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--d3-choco)]/70">
              {(resumeError ?? analysisError) instanceof Error
                ? (resumeError ?? analysisError)?.message
                : "Something went wrong while loading your saved resume and analysis. Try refreshing the page."}
            </p>
          </div>
        )}
        {/* INTERACTIVE UPLOAD DROPZONE */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "d3-card relative overflow-hidden border-2 border-dashed p-7 transition-all duration-300",
            isDragging
              ? "border-[var(--d3-flame)] bg-[var(--d3-flame)]/5 shadow-2xl scale-[1.005]"
              : "border-[var(--d3-choco)]/25 hover:border-[var(--d3-flame)]/50",
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

          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-colors",
                  isDragging
                    ? "bg-[var(--d3-flame)] text-white"
                    : "bg-[var(--d3-mustard)]/40 text-[var(--d3-choco)]",
                )}
              >
                {upload.isPending ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <FileUp className="h-7 w-7" strokeWidth={1.8} />
                )}
              </div>

              <div>
                <h3 className="d3-display text-[17px]">
                  {upload.isPending
                    ? "Analyzing Resume Structure..."
                    : isDragging
                      ? "Drop your resume file here!"
                      : "Upload or Drag & Drop Resume"}
                </h3>
                <p className="mt-1 text-[13px] text-[var(--d3-choco)]/70">
                  Supported formats: <strong>PDF, DOCX, TXT</strong> (Up
                  to 5MB)
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="d3-chip bg-[var(--d3-cream)] text-[var(--d3-choco)]/70">ATS Compatible Parser</span>
                  <span className="d3-chip bg-[var(--d3-cream)] text-[var(--d3-choco)]/70">Private & Encrypted</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--d3-flame)] px-6 py-3 text-[13.5px] font-bold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50 shadow-lift"
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
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--d3-choco)]/10 pt-4 text-[12.5px]">
              <div className="flex items-center gap-2 text-[var(--d3-choco)]/70">
                <FileText className="h-4 w-4 text-[var(--d3-flame)]" />
                <span>
                  Active File:{" "}
                  <strong className="font-bold">{resume.file_name}</strong>
                </span>
              </div>
              <span className="text-[12px] text-[var(--d3-choco)]/70">
                Uploaded {new Date(resume.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* ANALYSIS RESULTS DASHBOARD */}
        {analysis ? (
          <div className="grid w-full gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,1fr)]">
            {/* LEFT COLUMN: SCORES, SUMMARY, STRENGTHS, WEAKNESSES & RECOMMENDATIONS */}
            <div className="space-y-6">
              {/* SCORE FACE + RADIAL METRIC GAUGES */}
              <div className="d3-card d3-tilt-l p-6">
                <div className="mb-6 flex items-center justify-between gap-3 border-b border-[var(--d3-choco)]/10 pb-4">
                  <div>
                    <h3 className="d3-display text-[17px]">
                      Executive Score Breakdown
                    </h3>
                    <p className="text-[12px] text-[var(--d3-choco)]/70">
                      Heuristic text/format checks; not a score from an employer’s ATS.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-[var(--d3-leaf)]/25 px-3 py-1 text-[12px] font-bold text-[var(--d3-choco)]">
                    Analysis Active
                  </span>
                </div>

                <ScoreFace ats={analysis.ats_score} />

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <ScoreRing
                    value={analysis.ats_score}
                    label="ATS Readability Estimate"
                    sublabel="Deterministic format checks"
                  />
                  <ScoreRing
                    value={analysis.resume_score}
                    label="Content Quality Estimate"
                    sublabel="Length, metrics & bullet checks"
                  />
                  <ScoreRing
                    value={roleScoreAvailable ? analysis.career_match : null}
                    label="AI Role-Fit Estimate"
                    sublabel={roleScoreAvailable ? "Model estimate; not calibrated" : "No role-specific estimate available"}
                  />
                </div>
              </div>

              {/* EXECUTIVE SUMMARY */}
              {analysis.summary && (
                <div className="d3-card d3-tilt-r space-y-3 p-6">
                  <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[var(--d3-flame)]">
                    <Sparkles className="h-4 w-4" /> Recruiter Executive Summary
                  </div>
                  <p className="text-[14px] font-medium leading-relaxed">
                    &quot;{analysis.summary}&quot;
                  </p>
                </div>
              )}

              {/* STRENGTHS & WEAKNESSES GRID */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* STRENGTHS */}
                <div className="d3-card d3-tilt-l space-y-4 p-6">
                  <div className="flex items-center gap-2 border-b border-[var(--d3-choco)]/10 pb-3">
                    <CheckCircle2 className="h-5 w-5 text-[var(--d3-leaf)]" />
                    <h4 className="d3-display text-[15px]">Competitive Strengths</h4>
                  </div>
                  {analysis.strengths.length ? (
                    <ul className="space-y-3">
                      {analysis.strengths.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[var(--d3-choco)]/75"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--d3-leaf)]" />
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
                <div className="d3-card d3-tilt-r space-y-4 p-6">
                  <div className="flex items-center gap-2 border-b border-[var(--d3-choco)]/10 pb-3">
                    <AlertTriangle className="h-5 w-5 text-[var(--d3-flame)]" />
                    <h4 className="d3-display text-[15px]">ATS Red Flags & Gaps</h4>
                  </div>
                  {analysis.weaknesses.length ? (
                    <ul className="space-y-3">
                      {analysis.weaknesses.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[var(--d3-choco)]/75"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--d3-flame)]" />
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
              <div className="d3-card d3-tilt-l space-y-4 p-6">
                <div className="flex items-center justify-between border-b border-[var(--d3-choco)]/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-[var(--d3-flame)]" />
                    <h4 className="d3-display text-[15px]">
                      High-Impact Positioning Rewrites
                    </h4>
                  </div>
                  <span className="text-[12px] font-bold text-[var(--d3-choco)]/70">
                    Action Plan
                  </span>
                </div>

                {analysis.recommendations.length ? (
                  <div className="space-y-3">
                    {analysis.recommendations.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--d3-choco)]/10 bg-[var(--d3-cream)]/70 p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--d3-mustard)]/40 text-[11px] font-extrabold text-[var(--d3-choco)]">
                            {idx + 1}
                          </span>
                          <p className="min-w-0 break-words text-[13.5px] font-medium">
                            {item.title}
                          </p>
                        </div>
                        <span className="inline-flex max-w-full whitespace-normal break-words rounded-md bg-[var(--d3-flame)]/10 px-2.5 py-1 text-left text-xs font-bold text-[var(--d3-flame)] sm:max-w-[58%]">
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
            <div className="space-y-6 xl:sticky xl:top-6 xl:self-start xl:min-h-[calc(100vh-12rem)]">
              {/* DECISION RAIL */}
              <div className="relative overflow-hidden rounded-2xl bg-[var(--d3-choco)] p-6 text-[var(--d3-cream)] shadow-lift">
                <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[var(--d3-flame)]/25 blur-2xl" />
                <div className="relative space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-[var(--d3-mustard)]">
                        <Target className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-[0.16em]">
                          Decision rail
                        </span>
                      </div>
                      <h3 className="d3-display mt-2 text-[17px]">What to fix next</h3>
                      <p className="mt-1 text-[12px] leading-relaxed text-[var(--d3-cream)]/70">
                        The lowest score is the constraint. Fix that before adding more tools or
                        courses.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-[var(--d3-cream)]/80">
                      {readinessLabel}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {scoreRows.map((item) => (
                      <div key={item.label}>
                        <div className="mb-1.5 flex items-center justify-between text-[12px]">
                          <span className="text-[var(--d3-cream)]/70">{item.label}</span>
                          <span className="font-bold">{item.value}/100</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.value}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={cn(
                              "h-full rounded-full",
                              item.value >= 75
                                ? "bg-[var(--d3-leaf)]"
                                : item.value >= 55
                                  ? "bg-[var(--d3-mustard)]"
                                  : "bg-[var(--d3-flame)]",
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="d3-card d3-tilt-r overflow-hidden p-6">
                <div className="flex items-start justify-between gap-3 border-b border-[var(--d3-choco)]/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-[var(--d3-flame)]">
                      <ArrowUpRight className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-[0.14em]">
                        Immediate moves
                      </span>
                    </div>
                    <h4 className="d3-display mt-1.5 text-[15px]">
                      Close the biggest proof gaps
                    </h4>
                  </div>
                  <span className="rounded-lg bg-[var(--d3-cream)] px-2 py-1 text-[10px] font-bold text-[var(--d3-choco)]/70">
                    {priorityActions.length} priorities
                  </span>
                </div>

                {priorityActions.length ? (
                  <div className="divide-y divide-[var(--d3-choco)]/10">
                    {priorityActions.map((item, index) => (
                      <div
                        key={`${item.title}-${index}`}
                        className="flex gap-3 py-4 first:pt-4 last:pb-0"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--d3-mustard)]/40 text-[11px] font-extrabold text-[var(--d3-choco)]">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="break-words text-[12.5px] font-bold leading-relaxed">
                            {item.title}
                          </p>
                          <p className="mt-1 break-words text-[12px] leading-relaxed text-[var(--d3-choco)]/70">
                            {item.impact}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="pt-4 text-[12.5px] leading-relaxed text-[var(--d3-choco)]/70">
                    No action items were returned. Upload a fuller resume or re-run the audit to get
                    specific next steps.
                  </p>
                )}
              </div>

              {/* SKILLS DETECTED */}
              <div className="d3-card d3-tilt-l space-y-4 p-6">
                <div className="flex items-center justify-between border-b border-[var(--d3-choco)]/10 pb-3">
                  <h4 className="d3-display text-[15px]">
                    Extracted Technical Skills
                  </h4>
                  <span className="text-[12px] font-bold text-[var(--d3-flame)]">
                    {analysis.detected_skills.length} Detected
                  </span>
                </div>

                {analysis.detected_skills.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.detected_skills.map((skill) => (
                      <span key={skill} className="d3-chip bg-[var(--d3-cream)] text-[var(--d3-choco)]">
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
              <div className="d3-card d3-tilt-r space-y-4 p-6">
                <div className="border-b border-[var(--d3-choco)]/10 pb-3">
                  <h4 className="d3-display text-[15px]">
                    Market Target Compatibility
                  </h4>
                  <p className="mt-0.5 text-[12px] text-[var(--d3-choco)]/70">
                    Matched against researched industry roles.
                  </p>
                </div>

                {analysis.role_matches.length ? (
                  <div className="space-y-4">
                    {analysis.role_matches.map((match) => (
                      <div key={match.role} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="truncate font-bold">
                            {match.role}
                          </span>
                          <span className="font-bold text-[var(--d3-flame)]">{match.match}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--d3-cream)]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${match.match}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full bg-[var(--d3-flame)]"
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
              <div className="space-y-3 rounded-2xl bg-[var(--d3-choco)] p-6 text-[var(--d3-cream)] shadow-lift">
                <div className="flex items-center gap-2 text-[var(--d3-mustard)]">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-[13px] font-bold uppercase tracking-wider">
                    Proof Verification Policy
                  </span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-[var(--d3-cream)]/75">
                  Skills extracted from your resume improve your overall evidence picture, but
                  CareerPilot treats them as unverified mentions until backed by GitHub
                  repositories, project code, or verifiable portfolio links.
                </p>
              </div>

              <div className="d3-card d3-tilt-l flex min-h-[220px] flex-col justify-between p-6">
                <div>
                  <div className="flex items-center justify-between border-b border-[var(--d3-choco)]/10 pb-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--d3-flame)]">
                        Evidence health
                      </p>
                      <h4 className="d3-display mt-1 text-[15px]">
                        What a recruiter can verify
                      </h4>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-[var(--d3-flame)]" />
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {[
                      { label: "Skills", value: analysis.detected_skills.length },
                      { label: "Strengths", value: analysis.strengths.length },
                      { label: "Gaps", value: analysis.weaknesses.length },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-[var(--d3-cream)] p-3 text-center">
                        <p className="text-xl font-extrabold tracking-tight">
                          {item.value}
                        </p>
                        <p className="mt-0.5 text-[10.5px] font-semibold text-[var(--d3-choco)]/70">
                          {item.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-6 text-[12px] leading-relaxed text-[var(--d3-choco)]/70">
                  A resume mention is not proof by itself. Back the most important skills with a
                  public project, repository, deployed demo, or measurable outcome.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="d3-card space-y-4 p-12 text-center">
            <PilotMascot mood="thinking" className="mx-auto h-28 w-28" />
            <h3 className="d3-display text-[19px]">No Resume Analyzed Yet</h3>
            <p className="mx-auto max-w-md text-[13.5px] leading-relaxed text-[var(--d3-choco)]/70">
              Upload your PDF, DOCX, or TXT resume using the dropzone above to generate your ATS
              Compatibility Score, skill extraction breakdown, and recruiter position rewrites.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
