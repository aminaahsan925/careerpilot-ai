import { useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  GitBranch,
  Globe2,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";

import { useFlightPlanAssessment } from "@/data/flightplan";
import { useUploadAndAnalyze } from "@/data/resume";
import type {
  FlightPlanAssessment,
  FlightPlanGitLabReview,
  FlightPlanReadiness,
} from "@/lib/flightplan.server";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const readinessMeta: Record<
  FlightPlanReadiness,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  ready: { label: "Ready to apply", className: "text-emerald-300", icon: CheckCircle2 },
  almost_ready: { label: "Almost ready", className: "text-amber-300", icon: AlertTriangle },
  not_ready: { label: "Not ready yet", className: "text-orange-300", icon: XCircle },
  needs_review: { label: "Review needed", className: "text-orange-300", icon: AlertTriangle },
};

function ReadinessBadge({ status }: { status: FlightPlanReadiness }) {
  const meta = readinessMeta[status];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs font-semibold", meta.className)}>
      <Icon className="h-4 w-4" strokeWidth={2} />
      {meta.label}
    </span>
  );
}

function StepMarker({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-white">
        {number}
      </span>
      <span className="truncate text-[11px] font-semibold text-foreground">{label}</span>
    </div>
  );
}

function GitLabReview({ review }: { review: FlightPlanGitLabReview }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-secondary/45 px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-white">
          <GitBranch className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">GitLab proof check</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{review.note}</p>
          {review.projectName && (
            <p className="mt-1 truncate text-[11px] font-medium">{review.projectName}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {review.qualityScore !== null && (
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            {review.qualityScore}/100 proof quality
          </span>
        )}
        {review.url && (
          <a
            href={review.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta hover:underline"
          >
            Open project <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function MarketSources({ result }: { result: FlightPlanAssessment }) {
  return (
    <div className="border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
      <div className="flex items-center gap-2">
        <Globe2 className="h-4 w-4 text-terracotta" />
        <p className="text-sm font-semibold">Live market context</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{result.market.note}</p>
      {result.market.sources.length > 0 && (
        <div className="mt-4 space-y-2">
          {result.market.sources.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start justify-between gap-3 border-b border-border/70 pb-2.5 text-xs last:border-0 last:pb-0"
            >
              <span className="line-clamp-2 leading-5 transition-colors group-hover:text-terracotta">
                {source.title}
              </span>
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-terracotta" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function AssessmentResult({ result }: { result: FlightPlanAssessment }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 space-y-7 border-t border-border pt-7"
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl bg-ink p-5 text-white sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
              {result.company ? `${result.company} · ` : "Target role · "}
              {result.role}
            </p>
            <ReadinessBadge status={result.readiness} />
          </div>
          <p className="mt-5 max-w-xl font-display text-xl font-semibold leading-7 sm:text-2xl">
            {result.summary}
          </p>
          <div className="mt-5 border-l-2 border-terracotta pl-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-terracotta">
              The honest answer
            </p>
            <p className="mt-2 text-sm leading-6 text-white/70">{result.brutalTruth}</p>
          </div>
        </div>
        <MarketSources result={result} />
      </div>

      {result.missingSkills.length > 0 && (
        <div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-terracotta" />
            <h3 className="text-sm font-semibold">What is missing for this application</h3>
          </div>
          <div className="mt-4 divide-y divide-border rounded-2xl border border-border px-4 sm:px-5">
            {result.missingSkills.map((gap) => (
              <div className="grid gap-2 py-4 md:grid-cols-[0.55fr_1fr_1.1fr]" key={gap.skill}>
                <p className="text-sm font-semibold">{gap.skill}</p>
                <p className="text-xs leading-5 text-muted-foreground">{gap.why}</p>
                <p className="text-xs leading-5">
                  <span className="font-semibold text-terracotta">How to fix it: </span>
                  {gap.fix}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {result.cvNotes.length > 0 && (
          <div className="rounded-2xl border border-border p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-terracotta" />
              <h3 className="text-sm font-semibold">Make your CV fit this JD</h3>
            </div>
            <div className="mt-4 divide-y divide-border">
              {result.cvNotes.map((note) => (
                <div className="py-3 first:pt-0 last:pb-0" key={note.issue}>
                  <p className="text-xs font-semibold">{note.issue}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{note.note}</p>
                  <p className="mt-1.5 text-xs leading-5">
                    <span className="font-semibold text-terracotta">Rewrite: </span>
                    {note.rewrite}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.preparationRoadmap.length > 0 && (
          <div className="rounded-2xl border border-terracotta/25 bg-terracotta/[0.04] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-terracotta" />
              <h3 className="text-sm font-semibold">Preparation plan before you apply</h3>
            </div>
            <div className="mt-4 space-y-4">
              {result.preparationRoadmap.map((item, index) => (
                <div className="flex gap-3" key={`${item.step}-${index}`}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold">{item.step}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.action}</p>
                    <p className="mt-1 text-xs leading-5">
                      <span className="font-semibold text-terracotta">Proof: </span>
                      {item.proof}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/roadmap"
              className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-terracotta hover:underline"
            >
              Open my learning roadmap <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>

      <GitLabReview review={result.gitlab} />
    </motion.div>
  );
}

export function JobReadinessAssessment({
  roleName,
  hasResume,
}: {
  roleName: string;
  hasResume: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState(roleName);
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selfDescription, setSelfDescription] = useState("");
  const [gitlabUrl, setGitlabUrl] = useState("");
  const [noCvConfirmed, setNoCvConfirmed] = useState(false);
  const [uploadedHere, setUploadedHere] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const assessment = useFlightPlanAssessment();
  const upload = useUploadAndAnalyze();
  const cvAvailable = hasResume || uploadedHere;

  function chooseFile(file: File | undefined) {
    if (!file) return;
    setFormError(null);
    upload.mutate(file, {
      onSuccess: () => setUploadedHere(true),
      onError: (error) =>
        setFormError(error instanceof Error ? error.message : "We could not analyze that CV."),
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!cvAvailable && !noCvConfirmed) {
      setFormError(
        "Upload a CV, or confirm that you do not have one and provide your self-description.",
      );
      return;
    }
    if (!cvAvailable && selfDescription.trim().length < 40) {
      setFormError(
        "Tell us about your background, education, and skills in at least a few sentences.",
      );
      return;
    }
    // BUG FIX (2026-10-30): the JD field was only `required`, so an empty
    // submit just moved focus with no visible error. Show an explicit error.
    if (!jobDescription.trim()) {
      setFormError("Paste the exact job description before assessing your readiness.");
      return;
    }
    assessment.mutate({
      role,
      company,
      jobDescription,
      selfDescription: cvAvailable ? "" : selfDescription,
      gitlabUrl,
    });
  }

  return (
    <section className="card-surface overflow-hidden">
      <div className="relative overflow-hidden bg-ink px-6 py-7 text-white sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-terracotta/15 blur-3xl" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-terracotta">
              <Sparkles className="h-4 w-4" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                Job readiness assessment
              </p>
            </div>
            <h2 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-[-0.02em] sm:text-3xl">
              Test yourself against the job you actually want.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
              Add your evidence and the exact JD. Flight Plan will show what is missing, how to fix
              your CV, and what proof to build before applying.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/70">
            <Search className="h-3.5 w-3.5 text-terracotta" />
            Fresh market check
          </span>
        </div>
      </div>

      <div className="px-6 py-6 sm:px-8 sm:py-7">
        <div className="grid gap-2 border-b border-border pb-6 sm:grid-cols-4 sm:gap-4">
          <StepMarker number={1} label="Your evidence" />
          <StepMarker number={2} label="Exact JD" />
          <StepMarker number={3} label="Market context" />
          <StepMarker number={4} label="Fix and prove" />
        </div>

        <form className="mt-6 space-y-6" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold">Target role</span>
              <input
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-terracotta"
                placeholder="e.g. Frontend Engineer"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold">
                Company name <span className="font-normal text-muted-foreground">(optional)</span>
              </span>
              <input
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-terracotta"
                placeholder="e.g. Acme"
              />
            </label>
          </div>

          <div className="border-t border-border pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">1. Add your CV</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {cvAvailable
                      ? "Your saved CV analysis will be compared with this job."
                      : "A CV is required unless you explicitly choose the no-CV path."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(event) => {
                    chooseFile(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl text-xs"
                  disabled={upload.isPending}
                  onClick={() => inputRef.current?.click()}
                >
                  {upload.isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-3.5 w-3.5" />
                  )}
                  {upload.isPending ? "Analyzing CV" : cvAvailable ? "Replace CV" : "Upload CV"}
                </Button>
                <Link
                  to="/resume"
                  className="text-xs font-semibold text-terracotta hover:underline"
                >
                  Open Resume
                </Link>
              </div>
            </div>

            {!cvAvailable && (
              <div className="mt-4 border-t border-border pt-4">
                <label className="flex items-start gap-2.5 text-xs leading-5">
                  <input
                    type="checkbox"
                    checked={noCvConfirmed}
                    onChange={(event) => setNoCvConfirmed(event.target.checked)}
                    className="mt-1 accent-[var(--terracotta)]"
                  />
                  <span>
                    I confirm I do not have a CV. I will provide my background, education, skills,
                    and projects below instead.
                  </span>
                </label>
                {noCvConfirmed && (
                  <textarea
                    value={selfDescription}
                    onChange={(event) => setSelfDescription(event.target.value)}
                    className="mt-3 min-h-28 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm leading-6 outline-none transition-colors focus:border-terracotta"
                    placeholder="Describe your education, current level, skills, projects, experience, and what you can actually build..."
                  />
                )}
              </div>
            )}
          </div>

          <label className="block border-t border-border pt-6">
            <span className="text-xs font-semibold">2. Paste the exact job description</span>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              className="mt-2 min-h-36 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm leading-6 outline-none transition-colors focus:border-terracotta"
              placeholder="Paste the responsibilities, requirements, and qualifications from the job posting..."
            />
            <span className="mt-1.5 block text-[11px] text-muted-foreground">
              Use a complete posting so the comparison stays specific to this role.
            </span>
          </label>

          <label className="block border-t border-border pt-6">
            <span className="text-xs font-semibold">
              GitLab project URL{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <div className="relative mt-2">
              <GitBranch className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                value={gitlabUrl}
                onChange={(event) => setGitlabUrl(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-terracotta"
                placeholder="https://gitlab.com/your-name/your-project"
              />
            </div>
            <span className="mt-1.5 block text-[11px] leading-5 text-muted-foreground">
              Public projects are checked for README, source files, tests, and GitLab CI signals.
            </span>
          </label>

          {formError && (
            <p className="rounded-xl border border-terracotta/25 bg-terracotta/5 px-3 py-2.5 text-xs leading-5 text-terracotta">
              {formError}
            </p>
          )}
          {assessment.error && !formError && (
            <p className="rounded-xl border border-terracotta/25 bg-terracotta/5 px-3 py-2.5 text-xs leading-5 text-terracotta">
              {assessment.error instanceof Error
                ? assessment.error.message
                : "The assessment could not be completed. Please try again."}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
            <p className="max-w-xl text-[11px] leading-5 text-muted-foreground">
              Flight Plan is direct about evidence. It will not promise a job or turn an unsupported
              claim into proof.
            </p>
            <Button
              type="submit"
              className="rounded-xl px-5"
              disabled={assessment.isPending || upload.isPending}
            >
              {assessment.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {assessment.isPending ? "Assessing your fit" : "Assess my job readiness"}
              {!assessment.isPending && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </form>

        {assessment.data && <AssessmentResult result={assessment.data} />}
      </div>
    </section>
  );
}
