import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Compass,
  Cpu,
  FileCheck,
  Flame,
  Globe2,
  Layers,
  Lightbulb,
  Loader2,
  LockKeyhole,
  Map,
  RefreshCw,
  Rocket,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Terminal,
  TrendingUp,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app/AppLayout";
import { CareerIllustration } from "@/components/ui/career-illustration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCareerOverview, useRunDiagnosis, type CareerOverview } from "@/data/career";
import { FEATURED_COMPANIES, matchCompanyTruth } from "@/data/company-truth";
import { useGenerateRoadmapV2 } from "@/data/roadmap-v2";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/diagnosis")({
  head: () => ({
    meta: [
      { title: "Company-Specific Career Diagnosis — CareerPilot AI" },
      {
        name: "description",
        content:
          "Discover why you are unemployed, what is lacking in your profile, and why specific companies reject you.",
      },
    ],
  }),
  component: DiagnosisPage,
});

/* ------------------------------------------------------------------ */
/* Scanning Overlay with Aesthetic Concentric Radar Pulse              */
/* ------------------------------------------------------------------ */

const SCAN_STEPS = [
  "Querying real-world hiring parameters & company screening filters...",
  "Auditing candidate skills footprint, projects & verified repository evidence...",
  "Evaluating non-negotiable tech stack & relational database indexing benchmarks...",
  "Calculating algorithmic screening test and ATS rejection probability...",
  "Synthesizing root-cause rejection report & 4-week recovery prescription...",
];

function ScanningOverlay({ companyName, roleName }: { companyName: string; roleName: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const discoveryMode = !roleName.trim() || roleName.toLowerCase().includes("don't know");
  const steps = discoveryMode
    ? [
        "Reading your saved skills, education, and experience...",
        "Separating self-reported claims from demonstrated evidence...",
        "Checking beginner prerequisites before advanced topics...",
        "Comparing your intake with official career-pathway sources...",
        "Building a starting-point plan without guessing an employer...",
      ]
    : SCAN_STEPS;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1100);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="relative overflow-hidden rounded-3xl border border-terracotta/25 bg-gradient-to-br from-card via-background to-terracotta/10 p-8 text-center sm:p-14 shadow-2xl backdrop-blur-md"
    >
      {/* Aesthetic glowing background orbs */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-terracotta/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-clay/20 blur-3xl" />

      {/* Radar Animation Hub */}
      <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
        <motion.div
          animate={{ scale: [1, 2.3], opacity: [0.6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          className="absolute inset-0 rounded-full bg-terracotta/25"
        />
        <motion.div
          animate={{ scale: [1, 1.7], opacity: [0.7, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 0.7 }}
          className="absolute inset-0 rounded-full bg-terracotta/20"
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-ink via-neutral-900 to-neutral-800 text-white shadow-2xl border border-terracotta/40">
          <Building2 className="h-8 w-8 text-terracotta animate-pulse" />
        </div>
      </div>

      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-terracotta/30 bg-terracotta/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-terracotta shadow-xs">
        <Sparkles className="h-3.5 w-3.5 animate-spin text-terracotta" />
        Live Technical Audit In Progress
      </div>

      <h2 className="mt-3 font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">
        {discoveryMode ? (
          <>Building your <span className="text-terracotta">career starting point</span></>
        ) : (
          <>Diagnosing <span className="text-terracotta">{roleName}</span> @{" "}
            <span className="text-foreground underline decoration-terracotta/40 decoration-wavy underline-offset-4">{companyName}</span>
          </>
        )}
      </h2>

      <p className="mt-2 text-xs text-muted-foreground max-w-lg mx-auto">
        {discoveryMode
          ? "Using your profile and intake to identify the next appropriate learning step—without assuming a target role."
          : "Evaluating your profile against role-specific requirements and evidence."}
      </p>

      {/* Step by step terminal audit feed */}
      <div className="mx-auto mt-8 max-w-lg space-y-2.5 text-left">
        {steps.map((stepText, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <motion.div
              key={stepText}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: idx <= currentStep ? 1 : 0.35, x: 0 }}
              className={cn(
                "flex items-center gap-3 rounded-2xl p-3.5 text-xs transition-all border",
                isCurrent
                  ? "border-terracotta/40 bg-card shadow-md font-bold text-foreground"
                  : isDone
                    ? "border-emerald-500/20 bg-emerald-50/40 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300"
                    : "border-transparent bg-secondary/40 text-muted-foreground",
              )}
            >
              {isDone ? (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                  <Check className="h-3.5 w-3.5" />
                </div>
              ) : isCurrent ? (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-terracotta/20 text-terracotta">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
              ) : (
                <div className="h-4 w-4 shrink-0 rounded-full border border-border/80" />
              )}
              <span className="truncate flex-1">{stepText}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Step-by-Step Guided Setup Wizard Component                          */
/* ------------------------------------------------------------------ */

function WizardSetup({
  targetCompany,
  targetRole,
  onRunDiagnosis,
  isPending,
}: {
  targetCompany: string;
  targetRole: string;
  onRunDiagnosis: (company: string, role: string) => void;
  isPending: boolean;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCompany, setSelectedCompany] = useState(targetCompany || "Systems Limited");
  const [customCompany, setCustomCompany] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [role, setRole] = useState(targetRole || "I don't know my target yet");

  useEffect(() => {
    setRole(targetRole || "I don't know my target yet");
  }, [targetRole]);

  const effectiveCompany =
    isCustom && customCompany.trim() ? customCompany.trim() : selectedCompany;
  const matchedTruth = matchCompanyTruth(effectiveCompany);

  const handleStart = () => {
    onRunDiagnosis(effectiveCompany, role.trim() || "I don't know my target yet");
  };

  return (
    <div className="space-y-6">
      {/* Wizard Progress Pill Indicator */}
      <div className="card-surface p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {[
            { s: 1, title: "1. Target Employer", subtitle: "Select Company", icon: Building2 },
            { s: 2, title: "2. Target Position", subtitle: "Job Role Title", icon: Target },
            { s: 3, title: "3. Launch Audit", subtitle: "Rejection Diagnosis", icon: ShieldAlert },
          ].map(({ s, title, subtitle, icon: Icon }) => {
            const isCurrent = step === s;
            const isPassed = step > s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStep(s as 1 | 2 | 3)}
                className={cn(
                  "flex min-w-[150px] flex-1 items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all border",
                  isCurrent
                    ? "border-terracotta/40 bg-ink text-white shadow-lg"
                    : isPassed
                      ? "border-emerald-500/20 bg-secondary/70 text-foreground hover:bg-secondary"
                      : "border-transparent text-muted-foreground hover:bg-secondary/40",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-transform",
                    isCurrent
                      ? "bg-terracotta text-white shadow-xs scale-105"
                      : isPassed
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-secondary text-muted-foreground",
                  )}
                >
                  {isPassed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold leading-tight">{title}</p>
                  <p className="truncate text-[10px] text-muted-foreground opacity-80">
                    {subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Views */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25 }}
            className="card-surface p-6 sm:p-8 space-y-6 border-terracotta/15"
          >
            <div className="grid gap-6 md:grid-cols-2 items-center">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-terracotta/10 px-2.5 py-0.5 text-xs font-bold text-terracotta">
                  <Building2 className="h-3.5 w-3.5" /> Step 1 of 3
                </div>
                <h2 className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl">
                  Select Target Employer to Inspect
                </h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Pick a prominent Pakistani/Global software house or type any custom company name.
                </p>
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCustom(!isCustom)}
                    className="rounded-xl border-terracotta/30 text-xs font-bold text-terracotta hover:bg-terracotta/10"
                  >
                    {isCustom ? "← Choose Featured Employers" : "+ Type Custom Company Name"}
                  </Button>
                </div>
              </div>

              <CareerIllustration
                badgeText="Diagnose your rejection risk."
                className="py-0 max-w-[320px] justify-self-center md:justify-self-end"
              />
            </div>

            {isCustom ? (
              <div className="space-y-3 rounded-2xl border border-terracotta/20 bg-gradient-to-br from-card to-terracotta/5 p-6">
                <Label className="text-xs font-bold uppercase tracking-wider text-terracotta">
                  Enter Any Company Name
                </Label>
                <Input
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  placeholder="e.g. Careem, Devsinc, Folio3, 10x Banking, Arbitsoft, Google..."
                  className="h-12 rounded-xl text-sm border-border focus:border-terracotta shadow-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  We will perform a live diagnostic audit on real hiring standards for this specific
                  organization.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURED_COMPANIES.map((comp) => {
                  const isSelected = selectedCompany === comp.name;
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => setSelectedCompany(comp.name)}
                      className={cn(
                        "group relative flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all",
                        isSelected
                          ? "border-terracotta bg-terracotta/5 ring-2 ring-terracotta/40 shadow-md"
                          : "border-border bg-card hover:border-terracotta/40 hover:shadow-xs",
                      )}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink font-extrabold text-xs text-white shadow-xs group-hover:scale-105 transition-transform">
                        {comp.shortName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-foreground">{comp.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{comp.tier}</p>
                      </div>
                      {isSelected && (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-terracotta text-white shadow-xs">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground">
                Target Selected: <strong className="text-foreground">{effectiveCompany}</strong>
              </div>
              <Button
                className="rounded-xl px-6 font-bold text-xs shadow-md"
                onClick={() => setStep(2)}
              >
                Next: Select Target Position <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25 }}
            className="card-surface p-6 sm:p-8 space-y-6 border-terracotta/15"
          >
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-md bg-terracotta/10 px-2.5 py-0.5 text-xs font-bold text-terracotta">
                <Target className="h-3.5 w-3.5" /> Step 2 of 3
              </div>
              <h2 className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl">
                What Exact Position at {effectiveCompany}?
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Different job titles trigger drastically different technical screening filters.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Target Job Title</Label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Associate Software Engineer, Full Stack MERN, Flutter Developer..."
                className="h-12 rounded-xl text-sm border-border focus:border-terracotta shadow-xs"
              />
              <button
                type="button"
                onClick={() => setRole("I don't know my target yet")}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border",
                  role.toLowerCase().includes("don't know")
                    ? "border-terracotta bg-terracotta text-white shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:border-terracotta/40 hover:text-foreground",
                )}
              >
                I don't know my target yet
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2.5 uppercase tracking-wider">
                Popular Role Tracks:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Associate Software Engineer",
                  "Associate Full-Stack Developer",
                  "Frontend React / Next.js Engineer",
                  "Backend (.NET / Java / Node) Engineer",
                  "Mobile (Flutter / React Native) Developer",
                  "Python & AI Solutions Engineer",
                  "Associate SQA & Automation Engineer",
                ].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border",
                      role === r
                        ? "border-terracotta bg-terracotta text-white shadow-xs"
                        : "border-border bg-card text-muted-foreground hover:border-terracotta/40 hover:text-foreground",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="ghost"
                className="rounded-xl text-xs font-bold"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Employer
              </Button>
              <Button
                className="rounded-xl px-6 font-bold text-xs shadow-md"
                onClick={() => setStep(3)}
              >
                Next: Review & Launch Audit <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25 }}
            className="card-surface p-6 sm:p-8 space-y-6 border-terracotta/20"
          >
            {/* Aesthetic Summary Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-neutral-900 to-neutral-800 p-7 text-white shadow-xl border border-terracotta/30">
              <div className="pointer-events-none absolute -right-10 -bottom-10 h-44 w-44 rounded-full bg-terracotta/20 blur-2xl" />

              <div className="relative z-10 space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta/20 px-3.5 py-1 text-xs font-bold text-terracotta border border-terracotta/30">
                  <Sparkles className="h-3.5 w-3.5" /> Step 3 of 3: Ready for Technical Audit
                </span>
                <div>
                  <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
                    Diagnose Rejection Risk for {role}
                  </h2>
                  <p className="mt-1 text-xs text-white/70">
                    Target Employer:{" "}
                    <strong className="text-white underline decoration-terracotta">
                      {effectiveCompany}
                    </strong>
                  </p>
                </div>

                <div className="grid gap-3 pt-2 sm:grid-cols-2 text-xs">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                    <p className="text-[11px] font-bold text-terracotta uppercase">
                      What We Will Inspect:
                    </p>
                    <p className="text-white/80 mt-1">
                      Real screening test patterns, ATS keyword filters, and project proof
                      expectations.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                    <p className="text-[11px] font-bold text-emerald-400 uppercase">
                      What You Will Get:
                    </p>
                    <p className="text-white/80 mt-1">
                      Exact reasons for rejection, missing non-negotiables, and a personalized
                      recovery plan.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="ghost"
                className="rounded-xl text-xs font-bold"
                onClick={() => setStep(2)}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Change Selection
              </Button>
              <Button
                className="h-12 rounded-xl px-8 font-bold text-xs shadow-lg bg-terracotta hover:bg-terracotta/90 text-white"
                disabled={isPending}
                onClick={handleStart}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running Live Audit...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="mr-2 h-4 w-4" /> Launch Rejection Diagnosis Now →
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Comprehensive Diagnostic Results Dashboard                         */
/* ------------------------------------------------------------------ */

function DiagnosticResultsView({
  overview,
  onRerun,
  isRerunning,
}: {
  overview: CareerOverview;
  onRerun: (company?: string, role?: string) => void;
  isRerunning: boolean;
}) {
  const navigate = useNavigate();
  const d = overview.diagnosis;
  const generateRoadmap = useGenerateRoadmapV2();
  const [activeTab, setActiveTab] = useState<
    "why-unemployed" | "lacking-matrix" | "company-truth" | "prescription"
  >("why-unemployed");
  const [generatedSuccess, setGeneratedSuccess] = useState(false);

  if (!d || !d.companyDiagnosis) return null;
  const companyDiag = d.companyDiagnosis;

  const handleGenerateRoadmap = () => {
    generateRoadmap.mutate(undefined, {
      onSuccess: (res) => {
        if (res.success) {
          toast.success("Prescription successfully integrated into your Career Roadmap!");
          setGeneratedSuccess(true);
        } else {
          toast.error(res.error || "Failed to generate roadmap.");
        }
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to sync to roadmap.");
      },
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Rejection Verdict & High-Impact Metric Ring */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-neutral-900 to-neutral-800 p-8 text-white sm:p-10 shadow-2xl border border-terracotta/30">
        <div className="pointer-events-none absolute -bottom-14 -right-14 h-72 w-72 rounded-full bg-terracotta/25 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -top-10 -left-10 h-48 w-48 rounded-full bg-clay/20 blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,390px)] lg:items-center">
          <div className="min-w-0 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta/20 px-3.5 py-1 text-xs font-bold text-terracotta border border-terracotta/30 shadow-xs">
                <Building2 className="h-3.5 w-3.5" /> Technical Audit Verdict
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-300 border border-rose-500/30">
                {d.targetRole ? <ShieldAlert className="h-3 w-3" /> : <Compass className="h-3 w-3" />}
                {d.targetRole ? "Employer Risk Estimate" : "Career Starting-Point Assessment"}
              </span>
            </div>

              <h1 className="font-display text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
                {d.targetRole ? "Rejection Diagnosis:" : "Starting-Point Diagnosis:"} <br />
                <span className="text-terracotta underline decoration-terracotta/40 underline-offset-4">
                  {d.targetRole ? companyDiag.riskTier : "No target selected"}
                </span>
              </h1>

              <p className="text-xs leading-relaxed text-white/75 sm:text-sm">
                {d.targetRole ? (
                  <>Audited for <strong className="text-white">{d.targetRole}</strong> @{" "}
                    <strong className="text-terracotta">{companyDiag.companyName}</strong>. Findings are based on the profile evidence currently recorded.</>
                ) : (
                  <>No employer rejection risk is estimated. This assessment uses your recorded profile and intake to identify a realistic next learning step.</>
                )}
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-5 shadow-inner backdrop-blur-md sm:flex-row">
              <div className="flex items-center gap-3">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-terracotta/60 bg-terracotta/20 shadow-lg">
                  <span className="text-xl font-black text-terracotta">
                    {d.targetRole ? `${companyDiag.rejectionRisk}%` : "N/A"}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-wider text-white">
                    {d.targetRole ? "Rejection Risk" : "Employer Risk"}
                  </p>
                  <p className="text-[11px] text-white/60">{d.targetRole ? "Estimate" : "Not assessed"}</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl border-white/20 bg-white/10 text-xs font-bold text-white shadow-xs hover:bg-white/20"
                disabled={isRerunning}
                onClick={() =>
                  onRerun(companyDiag.companyName, d.targetRole || "I don't know my target yet")
                }
              >
                {isRerunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-terracotta" /> Re-audit Standard
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="hidden min-h-[280px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/95 p-4 shadow-2xl lg:flex">
          <img
            src="/careerpilot-learning-illustration.png"
            alt="Student learning career skills on a laptop"
            className="h-full w-full object-contain"
          />
          </div>
        </div>
      </section>

      {/* Modern 4-Tab Control Rail */}
      <div className="card-surface p-2.5 sm:p-3 shadow-md border-terracotta/15">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { id: "why-unemployed", label: "1. Why You Are Screened Out", icon: ShieldAlert },
            { id: "lacking-matrix", label: "2. What Is Lacking In Profile", icon: AlertCircle },
            { id: "company-truth", label: "3. Company Hiring Standards", icon: Building2 },
            { id: "prescription", label: "4. Recovery & Roadmap", icon: Flame },
          ].map(({ id, label, icon: Icon }) => {
            const isCurrent = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-bold transition-all text-left border",
                  isCurrent
                    ? "border-terracotta/40 bg-ink text-white shadow-md scale-[1.01]"
                    : "border-transparent bg-card text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isCurrent ? "text-terracotta" : "text-muted-foreground",
                  )}
                />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Why You Are Screened Out */}
      {activeTab === "why-unemployed" && (
        <motion.div
          key="tab-1"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card-surface p-6 sm:p-8 space-y-6 border-terracotta/15 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
                Why {companyDiag.companyName} Screens Out Your Applications
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Specific structural barriers derived from live recruiting patterns and technical
                screening criteria.
              </p>
            </div>
            <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-3.5 py-1 text-xs font-extrabold text-rose-600 dark:text-rose-400">
              {companyDiag.whyUnemployedReasons.length} Critical Barriers Detected
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {companyDiag.whyUnemployedReasons.map(
              (
                reason: { title: string; detail: string; recruiterPerspective: string },
                index: number,
              ) => (
                <div
                  key={reason.title}
                  className="group relative rounded-2xl border border-border bg-card p-6 space-y-4 hover:border-terracotta/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-terracotta/10 border border-terracotta/20 px-3 py-0.5 text-xs font-black text-terracotta">
                      Barrier 0{index + 1}
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground group-hover:text-terracotta transition-colors">
                      {reason.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {reason.detail}
                    </p>
                  </div>

                  <div className="rounded-xl bg-secondary/70 p-4 text-xs space-y-1 border border-border/60">
                    <p className="text-[10px] font-black uppercase tracking-wider text-terracotta">
                      Verified Recruiter Feedback:
                    </p>
                    <p className="italic font-medium text-foreground leading-relaxed">
                      "{reason.recruiterPerspective}"
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              className="rounded-xl font-bold text-xs shadow-md bg-ink hover:bg-ink/90 text-white"
              onClick={() => setActiveTab("lacking-matrix")}
            >
              Next: Inspect Profile Deficiencies{" "}
              <ArrowRight className="ml-1.5 h-4 w-4 text-terracotta" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Tab 2: What Is Lacking */}
      {activeTab === "lacking-matrix" && (
        <motion.div
          key="tab-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card-surface p-6 sm:p-8 space-y-6 border-terracotta/15 shadow-sm"
        >
          <div>
            <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
              Capability & Evidence Gap Breakdown
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Pinpoint deficiencies in required tech stacks, project proof artifacts, and ATS
              keyword optimization.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Missing Non-Negotiables */}
            <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-500/5 to-card p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <X className="h-4 w-4 shrink-0 font-bold" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Missing Non-Negotiables
                </h3>
              </div>
              <ul className="space-y-2.5 text-xs text-foreground">
                {companyDiag.whatIsLacking.missingNonNegotiables.map((item: string) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 rounded-xl bg-card p-3 border border-rose-500/15 shadow-2xs"
                  >
                    <span className="mt-1 h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Project Deficiencies */}
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-card p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Project Deficiencies
                </h3>
              </div>
              <ul className="space-y-2.5 text-xs text-foreground">
                {companyDiag.whatIsLacking.projectDeficiencies.map((item: string) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 rounded-xl bg-card p-3 border border-amber-500/15 shadow-2xs"
                  >
                    <span className="mt-1 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ATS & Formatting Flaws */}
            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-500/5 to-card p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <FileCheck className="h-4 w-4 shrink-0" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Profile & Evidence Flaws
                </h3>
              </div>
              <ul className="space-y-2.5 text-xs text-foreground">
                {companyDiag.whatIsLacking.cvAndAtsFlaws.map((item: string) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 rounded-xl bg-card p-3 border border-blue-500/15 shadow-2xs"
                  >
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="ghost"
              className="rounded-xl text-xs font-bold"
              onClick={() => setActiveTab("why-unemployed")}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Rejection Reasons
            </Button>
            <Button
              className="rounded-xl font-bold text-xs shadow-md bg-ink hover:bg-ink/90 text-white"
              onClick={() => setActiveTab("company-truth")}
            >
              Next: View Company Standards <ArrowRight className="ml-1.5 h-4 w-4 text-terracotta" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Tab 3: Company Hiring Bar */}
      {activeTab === "company-truth" && (
        <motion.div
          key="tab-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card-surface p-6 sm:p-8 space-y-6 border-terracotta/15 shadow-sm"
        >
          <div>
            <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
              {companyDiag.companyName} Hiring Standard vs Candidate Proof
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              How engineering leaders evaluate technical candidates in screening rounds.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3.5 hover:border-terracotta/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2.5 text-terracotta">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                  <Code2 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  Technical Screening Test Expectation
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed sm:text-sm">
                Candidates are expected to solve live algorithmic problems, write indexed SQL
                queries under time pressure, and present modular OOP / System Architecture cleanly
                without tutorial code copy-pasting.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-3.5 hover:border-terracotta/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2.5 text-terracotta">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                  <Terminal className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  Verified Proof Artifact Requirements
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed sm:text-sm">
                Instead of basic UI clones, top tier hires present production applications featuring
                Docker containerization, REST API documentation (Swagger), production database
                schemas, and live test suites.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="ghost"
              className="rounded-xl text-xs font-bold"
              onClick={() => setActiveTab("lacking-matrix")}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Profile Deficiencies
            </Button>
            <Button
              className="rounded-xl font-bold text-xs shadow-md bg-ink hover:bg-ink/90 text-white"
              onClick={() => setActiveTab("prescription")}
            >
              Next: View Action Blueprint & Roadmap{" "}
              <ArrowRight className="ml-1.5 h-4 w-4 text-terracotta" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Tab 4: Prescription & Roadmap Sync */}
      {activeTab === "prescription" && (
        <motion.div
          key="tab-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="card-surface p-6 sm:p-8 space-y-6 border-terracotta/30 shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-terracotta/15 text-terracotta border border-terracotta/30">
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-terracotta">
                  Prescribed Proof Project for {companyDiag.companyName}
                </span>
                <h2 className="font-display text-2xl font-black text-foreground sm:text-3xl">
                  {companyDiag.prescription.recommendedProofProject.title}
                </h2>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed sm:text-sm">
              {companyDiag.prescription.recommendedProofProject.description}
            </p>

            {/* Prescribed Deliverables */}
            <div className="rounded-2xl bg-secondary/60 p-6 space-y-4 border border-border">
              <p className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                Key Deliverables Required to Pass {companyDiag.companyName}'s Bar:
              </p>
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                {[
                  "Production REST / GraphQL API with automated database migrations",
                  "Comprehensive integration & unit test suite (Jest / Vitest)",
                  "Dockerized environment configuration with PostgreSQL / Redis",
                  "Live deployed production URL with clean public GitHub repository & documentation",
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-xl bg-card p-3.5 border border-border shadow-2xs"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-medium text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 1-Click Sync to Career Roadmap */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
              <Button
                className="h-12 rounded-xl px-7 text-xs font-bold shadow-lg bg-terracotta hover:bg-terracotta/90 text-white"
                disabled={generateRoadmap.isPending}
                onClick={handleGenerateRoadmap}
              >
                {generateRoadmap.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building Career Roadmap...
                  </>
                ) : (
                  <>
                    <Map className="mr-2 h-4 w-4" /> Build This in My Career Roadmap →
                  </>
                )}
              </Button>

              {generatedSuccess ? (
                <Button
                  variant="outline"
                  className="h-12 rounded-xl px-6 text-xs font-bold border-terracotta text-terracotta hover:bg-terracotta/10"
                  onClick={() => navigate({ to: "/roadmap" })}
                >
                  <Sparkles className="mr-1.5 h-4 w-4" /> View Your Generated Roadmap →
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-12 rounded-xl px-6 text-xs font-bold border-border"
                  onClick={() => navigate({ to: "/roadmap" })}
                >
                  Go to Career Roadmap
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Diagnosis Route Component                                     */
/* ------------------------------------------------------------------ */

function DiagnosisPage() {
  const navigate = useNavigate();
  const overview = useCareerOverview();
  const runDiagnosis = useRunDiagnosis();

  const handleRunDiagnosis = (company: string, role: string) => {
    runDiagnosis.mutate(
      { company, role },
      {
        onSuccess: async (diagnosis) => {
          toast.success(
            diagnosis.targetRole
              ? `Diagnostic audit refreshed for ${diagnosis.targetRole}${diagnosis.targetCompany ? ` @ ${diagnosis.targetCompany}` : ""}.`
              : "Career starting-point diagnosis refreshed.",
          );
          await overview.refetch();
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Diagnosis failed"),
      },
    );
  };

  if (overview.isLoading) {
    return (
      <AppLayout title="Career Diagnosis" subtitle="Auditing your employability...">
        <div className="space-y-6">
          <div className="h-44 animate-pulse rounded-3xl bg-secondary/80" />
          <div className="h-80 animate-pulse rounded-3xl bg-secondary/80" />
        </div>
      </AppLayout>
    );
  }

  // The overview query failed — offer a retry instead of silently rendering
  // the "no diagnosis" wizard (which hides the real problem).
  if (overview.isError) {
    return (
      <AppLayout title="Career Diagnosis" subtitle="">
        <div className="card-surface mx-auto max-w-lg p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-[17px] font-bold text-foreground">
            Couldn&apos;t load your diagnosis
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {overview.error instanceof Error
              ? overview.error.message
              : "Something went wrong while loading your career data. This is usually temporary."}
          </p>
          <Button
            className="mt-5 rounded-xl bg-terracotta font-bold text-xs"
            onClick={() => void overview.refetch()}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" /> Try again
          </Button>
        </div>
      </AppLayout>
    );
  }

  const data = overview.data;
  const hasDiagnosis = Boolean(data?.diagnosis?.companyDiagnosis);

  return (
    <AppLayout
      title={
        <span>
          Career Rejection Diagnosis <Sparkles className="inline h-5 w-5 text-terracotta" />
        </span>
      }
      subtitle="Discover why you are unemployed, what is lacking in your profile, and why specific companies reject you."
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-xs font-bold"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Dashboard
          </Button>
          <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5 text-terracotta" /> Private & Confidential
          </div>
        </div>

        {runDiagnosis.isPending ? (
          <ScanningOverlay
            companyName={
              runDiagnosis.variables?.company || data?.diagnosis?.targetCompany || data?.targetJob?.company || "Systems Limited"
            }
            roleName={
              runDiagnosis.variables?.role || data?.targetRole || "I don't know my target yet"
            }
          />
        ) : hasDiagnosis ? (
          <div className="space-y-8">
            <DiagnosticResultsView
              overview={data!}
              onRerun={(comp, r) =>
                handleRunDiagnosis(comp || "Systems Limited", r || "Associate Software Engineer")
              }
              isRerunning={runDiagnosis.isPending}
            />
            <div className="border-t border-border pt-8">
              <div className="mb-4">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Audit Another Company or Role
                </h3>
                <p className="text-xs text-muted-foreground">
                  Run a fresh technical diagnostic audit against another employer.
                </p>
              </div>
              <WizardSetup
                targetCompany={data?.diagnosis?.targetCompany || "Systems Limited"}
                targetRole={data?.targetRole || "I don't know my target yet"}
                onRunDiagnosis={handleRunDiagnosis}
                isPending={runDiagnosis.isPending}
              />
            </div>
          </div>
        ) : (
          <WizardSetup
            targetCompany={data?.targetJob?.company || "Systems Limited"}
            targetRole={data?.targetRole || "I don't know my target yet"}
            onRunDiagnosis={handleRunDiagnosis}
            isPending={runDiagnosis.isPending}
          />
        )}
      </div>
    </AppLayout>
  );
}
