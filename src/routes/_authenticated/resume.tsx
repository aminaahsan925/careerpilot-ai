/**
 * Resume page, Round 3 (Cursor as Flashlight / Lens).
 *
 * The resume summary renders dimmed and monochrome; a flashlight
 * follows the pointer and reveals the real AI score and what is
 * missing underneath. The score stays a checklist number, never a
 * chance of being hired. All analysis, upload and checklist logic is
 * unchanged; this file re-skins the page and adds the reveal.
 *
 * Motion rules: the reveal is worker 1's <Flashlight>, which owns the
 * cursor spring, the touch toggle, and the reduced-motion fallback
 * (both layers stacked, fully visible). Nothing is hidden behind a
 * cursor-only interaction.
 */
import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  FileUp,
  Flashlight as FlashlightIcon,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app/AppLayout";
import { Flashlight } from "@/components/lens/Flashlight";
import { Lens } from "@/components/lens/Lens";
import { MagneticButton } from "@/components/lens/MagneticButton";
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import {
  useLatestAnalysis,
  useLatestResume,
  useUploadAndAnalyze,
  type ResumeAnalysis,
} from "@/data/resume";
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
/* Score bands: honest labels, never a hiring chance                   */
/* ------------------------------------------------------------------ */

type ScoreBand = "clean" | "solid" | "needsWork";

function bandForAts(ats: number): ScoreBand {
  if (ats >= 80) return "clean";
  if (ats >= 65) return "solid";
  return "needsWork";
}

const BAND_COPY: Record<ScoreBand, { title: string; line: string }> = {
  clean: {
    title: "This resume reads clean",
    line: "Strong shape. Keep it sharp with every application.",
  },
  solid: {
    title: "Solid shape",
    line: "A few fixes below will lift it higher.",
  },
  needsWork: {
    title: "Lots of room to grow",
    line: "Every fix is listed below. Start at the top.",
  },
};

/* ------------------------------------------------------------------ */
/* The reveal: dimmed resume, flashlight shows the score and the gaps  */
/*                                                                     */
/* Built on worker 1's <Flashlight>: children render dimmed, and the   */
/* `lit` layer (the real score and what is missing) is revealed only   */
/* inside the light. Flashlight owns the cursor spring, the touch      */
/* toggle ("Reveal the hidden detail"), and the reduced-motion          */
/* fallback (both layers stacked, fully visible). The base layer       */
/* carries a min-height so the taller lit layer never clips: the lit   */
/* layer is absolutely positioned over the base, so the base defines   */
/* the panel height.                                                   */
/* ------------------------------------------------------------------ */

function ResumeReveal({
  analysis,
  fileName,
}: {
  analysis: ResumeAnalysis;
  fileName: string | null;
}) {
  const band = BAND_COPY[bandForAts(analysis.ats_score)];

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-cp-panel">
      <div className="border-b border-white/10 px-5 pt-5 sm:px-6 sm:pt-6">
        <p className="cp-eyebrow flex items-center gap-2">
          <FlashlightIcon className="h-3.5 w-3.5 text-cp-lime" /> Resume reveal
        </p>
        <p className="mt-2 font-serif text-[22px] italic leading-none text-cp-paper">
          Follow the light.
        </p>
        <p className="mt-2 pb-5 text-[12.5px] leading-relaxed text-cp-stone">
          Your resume, read in the dark. The light shows the score and what is missing.
        </p>
      </div>

      <Flashlight
        className="px-5 py-5 sm:px-6 sm:py-6"
        lit={
          <div className="grid gap-8 sm:grid-cols-[minmax(0,auto)_minmax(0,1fr)]">
            <div>
              <p className="cp-eyebrow">ATS checklist score</p>
              <div className="mt-3 flex items-baseline gap-2">
                <Lens magnify={1.15}>
                  <span className="font-display text-[72px] font-extrabold leading-none tracking-tight text-cp-lime sm:text-[88px]">
                    {analysis.ats_score}
                  </span>
                </Lens>
                <span className="font-mono text-[15px] text-cp-stone">/ 100</span>
              </div>
              <p className="mt-3 font-serif text-[20px] italic leading-tight text-cp-paper">
                {band.title}
              </p>
              <p className="mt-1 max-w-xs text-[12.5px] leading-relaxed text-cp-stone">
                {band.line}
              </p>
              <p className="mt-4 max-w-xs text-[11.5px] leading-relaxed text-cp-stone/70">
                ATS checklist score. Deterministic format checks, not a hiring chance.
              </p>
            </div>

            <div>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-cp-ember">
                What is missing
              </p>
              {analysis.weaknesses.length ? (
                <ul className="mt-3 space-y-2.5">
                  {analysis.weaknesses.slice(0, 3).map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2.5 text-[13px] leading-relaxed text-cp-paper"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cp-ember" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[13px] leading-relaxed text-cp-stone">
                  No red flags detected. Your resume formatting looks strong.
                </p>
              )}
              {analysis.weaknesses.length > 3 && (
                <p className="mt-3 text-[12px] text-cp-stone">
                  Plus {analysis.weaknesses.length - 3} more below.
                </p>
              )}
              <p className="mt-5 font-mono text-[11.5px] text-cp-stone">
                {analysis.detected_skills.length} skills detected · {analysis.strengths.length}{" "}
                strengths found
              </p>
            </div>
          </div>
        }
      >
        {/* Base layer: the resume itself, dimmed by Flashlight. Real
            content only: summary, detected skills, strengths, role
            matches. The min-height keeps the taller lit layer from
            clipping on small screens. */}
        <div className="min-h-[480px] sm:min-h-[360px]">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cp-stone">
            {fileName ?? "Your resume"}
          </p>
          {analysis.summary ? (
            <p className="mt-4 max-w-2xl font-serif text-[19px] italic leading-relaxed text-cp-paper">
              &quot;{analysis.summary}&quot;
            </p>
          ) : (
            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-cp-stone">
              No summary was returned for this resume.
            </p>
          )}
          {analysis.detected_skills.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {analysis.detected_skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[11px] text-cp-stone"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
          {analysis.strengths.length > 0 && (
            <div className="mt-6">
              <p className="cp-eyebrow">Strengths in the resume</p>
              <ul className="mt-3 space-y-2">
                {analysis.strengths.slice(0, 3).map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2.5 text-[13px] leading-relaxed text-cp-stone"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cp-lime" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.role_matches.length > 0 && (
            <div className="mt-6">
              <p className="cp-eyebrow">Role matches</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {analysis.role_matches.map((match) => (
                  <span
                    key={match.role}
                    className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[11px] text-cp-stone"
                  >
                    {match.role} · {match.match}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Flashlight>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Radial Score Ring Component                                         */
/* ------------------------------------------------------------------ */

function ScoreRing({ value, label, sublabel }: { value: number | null; label: string; sublabel: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const ringColor =
    value === null
      ? "stroke-white/15"
      : value >= 80
        ? "stroke-cp-lime"
        : value >= 65
          ? "stroke-cp-lime2"
          : "stroke-cp-ember";

  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
      <div className="relative h-[110px] w-[110px]">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(244 241 234 / 0.08)" strokeWidth="8" />
          <motion.circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            className={cn("transition-all duration-1000", ringColor)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - ((value ?? 0) / 100) * c }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[26px] font-extrabold leading-none tracking-tight text-cp-paper">
            {value ?? "N/A"}
          </span>
          {value !== null && <span className="text-[10px] font-semibold uppercase text-cp-stone">/ 100</span>}
        </div>
      </div>
      <p className="mt-3 text-[13.5px] font-bold text-cp-paper">{label}</p>
      <p className="mt-0.5 text-[12px] text-cp-stone">{sublabel}</p>
    </div>
  );
}

function EmptyStateMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-8 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-cp-stone/40" />
      <p className="mt-2 text-[14px] font-bold text-cp-paper">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-cp-stone">{description}</p>
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
      <div className="w-full space-y-6 pb-12">
        {/* Surface load failures instead of silently showing an empty page. */}
        {(resumeError || analysisError) && (
          <div className="rounded-xl border border-cp-ember/30 bg-cp-ember/10 px-5 py-4">
            <p className="flex items-center gap-2 text-[13px] font-bold text-cp-paper">
              <AlertTriangle className="h-4 w-4 text-cp-ember" />
              Couldn&apos;t load your resume data
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-cp-stone">
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
            "relative overflow-hidden rounded-3xl border-2 border-dashed bg-cp-panel p-7 transition-all duration-300",
            isDragging
              ? "border-cp-lime bg-cp-lime/5 shadow-lift"
              : "border-white/20 hover:border-cp-lime/50",
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
                    ? "bg-cp-lime text-cp-ink"
                    : "bg-cp-lime/15 text-cp-lime",
                )}
              >
                {upload.isPending ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <FileUp className="h-7 w-7" strokeWidth={1.8} />
                )}
              </div>

              <div>
                <h3 className="font-display text-[17px] font-bold text-cp-paper">
                  {upload.isPending
                    ? "Analyzing Resume Structure..."
                    : isDragging
                      ? "Drop your resume file here!"
                      : "Upload or Drag & Drop Resume"}
                </h3>
                <p className="mt-1 text-[13px] text-cp-stone">
                  Supported formats: <strong>PDF, DOCX, TXT</strong> (Up
                  to 5MB)
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="cp-chip text-cp-stone">ATS Compatible Parser</span>
                  <span className="cp-chip text-cp-stone">Private & Encrypted</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <MagneticButton
                onClick={() => {
                  if (!busy) inputRef.current?.click();
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl bg-cp-lime px-6 py-3 text-[13.5px] font-bold text-cp-ink shadow-lift",
                  busy && "cursor-not-allowed opacity-50",
                )}
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
              </MagneticButton>
            </div>
          </div>

          {/* ACTIVE SAVED FILE BANNER */}
          {resume && !upload.isPending && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-[12.5px]">
              <div className="flex items-center gap-2 text-cp-stone">
                <FileText className="h-4 w-4 text-cp-lime" />
                <span>
                  Active File:{" "}
                  <strong className="font-bold text-cp-paper">{resume.file_name}</strong>
                </span>
              </div>
              <span className="text-[12px] text-cp-stone">
                Uploaded {new Date(resume.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* ANALYSIS RESULTS DASHBOARD */}
        {analysis ? (
          <div className="grid w-full gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,1fr)]">
            {/* LEFT COLUMN: REVEAL, SCORES, SUMMARY, STRENGTHS, WEAKNESSES & RECOMMENDATIONS */}
            <div className="space-y-6">
              {/* THE REVEAL: score and gaps under the flashlight. */}
              <ResumeReveal analysis={analysis} fileName={resume?.file_name ?? null} />

              {/* SCORE BREAKDOWN + RADIAL METRIC GAUGES */}
              <SpotlightCard className="rounded-3xl border border-white/10 bg-cp-panel p-6">
                <div className="mb-6 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-display text-[17px] font-bold text-cp-paper">
                      Executive Score Breakdown
                    </h3>
                    <p className="text-[12px] text-cp-stone">
                      Heuristic text/format checks; not a score from an employer’s ATS.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-cp-lime/15 px-3 py-1 text-[12px] font-bold text-cp-lime">
                    Analysis Active
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
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
              </SpotlightCard>

              {/* EXECUTIVE SUMMARY */}
              {analysis.summary && (
                <SpotlightCard className="space-y-3 rounded-3xl border border-white/10 bg-cp-panel p-6">
                  <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-cp-lime">
                    <Sparkles className="h-4 w-4" /> Recruiter Executive Summary
                  </div>
                  <p className="font-serif text-[17px] italic leading-relaxed text-cp-paper">
                    &quot;{analysis.summary}&quot;
                  </p>
                </SpotlightCard>
              )}

              {/* STRENGTHS & WEAKNESSES GRID */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* STRENGTHS */}
                <SpotlightCard className="space-y-4 rounded-3xl border border-white/10 bg-cp-panel p-6">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <CheckCircle2 className="h-5 w-5 text-cp-lime" />
                    <h4 className="font-display text-[15px] font-bold text-cp-paper">Competitive Strengths</h4>
                  </div>
                  {analysis.strengths.length ? (
                    <ul className="space-y-3">
                      {analysis.strengths.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-[13px] leading-relaxed text-cp-stone"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cp-lime" />
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
                </SpotlightCard>

                {/* WEAKNESSES / RED FLAGS */}
                <SpotlightCard className="space-y-4 rounded-3xl border border-white/10 bg-cp-panel p-6">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <AlertTriangle className="h-5 w-5 text-cp-ember" />
                    <h4 className="font-display text-[15px] font-bold text-cp-paper">ATS Red Flags & Gaps</h4>
                  </div>
                  {analysis.weaknesses.length ? (
                    <ul className="space-y-3">
                      {analysis.weaknesses.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-[13px] leading-relaxed text-cp-stone"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cp-ember" />
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
                </SpotlightCard>
              </div>

              {/* AI REWRITE RECOMMENDATIONS */}
              <SpotlightCard className="space-y-4 rounded-3xl border border-white/10 bg-cp-panel p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-cp-lime" />
                    <h4 className="font-display text-[15px] font-bold text-cp-paper">
                      High-Impact Positioning Rewrites
                    </h4>
                  </div>
                  <span className="text-[12px] font-bold text-cp-stone">
                    Action Plan
                  </span>
                </div>

                {analysis.recommendations.length ? (
                  <div className="space-y-3">
                    {analysis.recommendations.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex min-w-0 flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cp-lime/15 text-[11px] font-extrabold text-cp-lime">
                            {idx + 1}
                          </span>
                          <p className="min-w-0 break-words text-[13.5px] font-medium text-cp-paper">
                            {item.title}
                          </p>
                        </div>
                        <span className="inline-flex max-w-full whitespace-normal break-words rounded-md bg-cp-lime/10 px-2.5 py-1 text-left text-xs font-bold text-cp-lime sm:max-w-[58%]">
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
              </SpotlightCard>
            </div>

            {/* RIGHT COLUMN: SKILL INVENTORY & ROLE MATCHES */}
            <div className="space-y-6 xl:sticky xl:top-6 xl:self-start xl:min-h-[calc(100vh-12rem)]">
              {/* DECISION RAIL */}
              <div className="relative overflow-hidden rounded-3xl border border-cp-lime/20 bg-cp-panel p-6 shadow-lift">
                <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cp-lime/15 blur-2xl" />
                <div className="relative space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-cp-lime">
                        <Target className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-[0.16em]">
                          Decision rail
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-[17px] font-bold text-cp-paper">What to fix next</h3>
                      <p className="mt-1 text-[12px] leading-relaxed text-cp-stone">
                        The lowest score is the constraint. Fix that before adding more tools or
                        courses.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-cp-stone">
                      {readinessLabel}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {scoreRows.map((item) => (
                      <div key={item.label}>
                        <div className="mb-1.5 flex items-center justify-between text-[12px]">
                          <span className="text-cp-stone">{item.label}</span>
                          <span className="font-bold text-cp-paper">{item.value}/100</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.value}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={cn(
                              "h-full rounded-full",
                              item.value >= 75
                                ? "bg-cp-lime"
                                : item.value >= 55
                                  ? "bg-cp-lime2"
                                  : "bg-cp-ember",
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <SpotlightCard className="overflow-hidden rounded-3xl border border-white/10 bg-cp-panel p-6">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-cp-lime">
                      <ArrowUpRight className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-[0.14em]">
                        Immediate moves
                      </span>
                    </div>
                    <h4 className="mt-1.5 font-display text-[15px] font-bold text-cp-paper">
                      Close the biggest proof gaps
                    </h4>
                  </div>
                  <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-cp-stone">
                    {priorityActions.length} priorities
                  </span>
                </div>

                {priorityActions.length ? (
                  <div className="divide-y divide-white/10">
                    {priorityActions.map((item, index) => (
                      <div
                        key={`${item.title}-${index}`}
                        className="flex gap-3 py-4 first:pt-4 last:pb-0"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cp-lime/15 text-[11px] font-extrabold text-cp-lime">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="break-words text-[12.5px] font-bold leading-relaxed text-cp-paper">
                            {item.title}
                          </p>
                          <p className="mt-1 break-words text-[12px] leading-relaxed text-cp-stone">
                            {item.impact}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="pt-4 text-[12.5px] leading-relaxed text-cp-stone">
                    No action items were returned. Upload a fuller resume or re-run the audit to get
                    specific next steps.
                  </p>
                )}
              </SpotlightCard>

              {/* SKILLS DETECTED */}
              <SpotlightCard className="space-y-4 rounded-3xl border border-white/10 bg-cp-panel p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="font-display text-[15px] font-bold text-cp-paper">
                    Extracted Technical Skills
                  </h4>
                  <span className="text-[12px] font-bold text-cp-lime">
                    {analysis.detected_skills.length} Detected
                  </span>
                </div>

                {analysis.detected_skills.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.detected_skills.map((skill) => (
                      <span key={skill} className="cp-chip text-cp-paper">
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
              </SpotlightCard>

              {/* ROLE MATCHES */}
              <SpotlightCard className="space-y-4 rounded-3xl border border-white/10 bg-cp-panel p-6">
                <div className="border-b border-white/10 pb-3">
                  <h4 className="font-display text-[15px] font-bold text-cp-paper">
                    Market Target Compatibility
                  </h4>
                  <p className="mt-0.5 text-[12px] text-cp-stone">
                    Matched against researched industry roles.
                  </p>
                </div>

                {analysis.role_matches.length ? (
                  <div className="space-y-4">
                    {analysis.role_matches.map((match) => (
                      <div key={match.role} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="truncate font-bold text-cp-paper">
                            {match.role}
                          </span>
                          <span className="font-bold text-cp-lime">{match.match}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${match.match}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full bg-cp-lime"
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
              </SpotlightCard>

              {/* EVIDENCE NOTE CARD */}
              <div className="space-y-3 rounded-3xl border border-white/10 bg-cp-panel p-6 shadow-lift">
                <div className="flex items-center gap-2 text-cp-lime">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-[13px] font-bold uppercase tracking-wider text-cp-paper">
                    Proof Verification Policy
                  </span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-cp-stone">
                  Skills extracted from your resume improve your overall evidence picture, but
                  CareerPilot treats them as unverified mentions until backed by GitHub
                  repositories, project code, or verifiable portfolio links.
                </p>
              </div>

              <SpotlightCard className="flex min-h-[220px] flex-col justify-between rounded-3xl border border-white/10 bg-cp-panel p-6">
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-cp-lime">
                        Evidence health
                      </p>
                      <h4 className="mt-1 font-display text-[15px] font-bold text-cp-paper">
                        What a recruiter can verify
                      </h4>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-cp-lime" />
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {[
                      { label: "Skills", value: analysis.detected_skills.length },
                      { label: "Strengths", value: analysis.strengths.length },
                      { label: "Gaps", value: analysis.weaknesses.length },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-white/[0.04] p-3 text-center">
                        <p className="text-xl font-extrabold tracking-tight text-cp-paper">
                          {item.value}
                        </p>
                        <p className="mt-0.5 text-[10.5px] font-semibold text-cp-stone">
                          {item.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-6 text-[12px] leading-relaxed text-cp-stone">
                  A resume mention is not proof by itself. Back the most important skills with a
                  public project, repository, deployed demo, or measurable outcome.
                </p>
              </SpotlightCard>
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-3xl border border-dashed border-white/15 bg-cp-panel p-12 text-center">
            <FlashlightIcon className="mx-auto h-10 w-10 text-cp-stone/50" />
            <h3 className="font-display text-[19px] font-bold text-cp-paper">No analysis yet</h3>
            <p className="mx-auto max-w-md text-[13.5px] leading-relaxed text-cp-stone">
              Upload a resume to start. Your ATS Compatibility Score, skill extraction breakdown,
              and recruiter position rewrites appear here once an analysis exists. Nothing is shown
              until there is a real analysis to show.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
