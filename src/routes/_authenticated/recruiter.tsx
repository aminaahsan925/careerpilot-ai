import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  FileText,
  Flame,
  Lightbulb,
  Loader2,
  MessageCircle,
  Search,
  Send,
  ShieldAlert,
  ShieldX,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app/AppLayout";
import { RecruiterDashboardWidgets } from "@/components/recruiter/RecruiterDashboardWidgets";
import { RecruiterHeroCard } from "@/components/recruiter/RecruiterHeroCard";
import { RecruiterPipelineStepper } from "@/components/recruiter/RecruiterPipelineStepper";
import { Button } from "@/components/ui/button";
import { FEATURED_COMPANIES, type CompanyHiringTruth } from "@/data/company-truth";
import {
  useRecruiterSession,
  useRunRecruiterAudit,
  useChatWithRecruiter,
  type RecruiterAudit,
  type RecruiterSession,
  type BrutalVerdict,
} from "@/data/recruiter";
import { useGenerateRoadmapV2 } from "@/data/roadmap-v2";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/recruiter")({
  head: () => ({
    meta: [
      { title: "Brutal Honest Recruiter — CareerPilot AI" },
      {
        name: "description",
        content:
          "Face the brutal truth: an AI recruiter from your target company audits your profile and tells you exactly why you'd be hired or rejected.",
      },
    ],
  }),
  component: RecruiterPage,
});

const LAYOUT_TITLE = "Recruiter Audit Engine";
const LAYOUT_SUBTITLE =
  "360° Candidate Intelligence — We analyze candidate proof so you can build your readiness and get hired.";

/* ------------------------------------------------------------------ */
/* Scanning Animation Overlay                                          */
/* ------------------------------------------------------------------ */

const SCAN_STEPS = [
  "Reading your resume and analyzing ATS keyword density...",
  "Cross-referencing your project portfolio against company hiring bars...",
  "Evaluating technical depth in the company's primary tech stack...",
  "Calculating interview survival probability...",
  "Synthesizing brutal recruiter scorecard...",
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
      className="card-surface p-8 sm:p-12 text-center my-6 shadow-xl"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
    >
      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-terracotta/10 text-terracotta">
          <UserCheck className="h-10 w-10 animate-pulse" strokeWidth={1.7} />
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-terracotta mb-2">
          {companyName} · Live Screening
        </p>
        <h3 className="font-display text-xl font-bold text-foreground">Recruiter Audit in Progress</h3>

        <div className="mt-6 w-full space-y-3">
          {SCAN_STEPS.map((text, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3.5 text-xs font-medium transition-colors",
                i < step
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                  : i === step
                    ? "border-terracotta/30 bg-terracotta/10 text-foreground font-semibold"
                    : "border-border bg-secondary/30 text-muted-foreground",
              )}
            >
              {i < step ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : i === step ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-terracotta" />
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
/* Verdict Card Component                                             */
/* ------------------------------------------------------------------ */

const CATEGORY_ICONS: Record<string, typeof Code2> = {
  "CV Quality": FileText,
  "Technical Skills": Code2,
  "Project Portfolio": BriefcaseBusiness,
  "Interview Readiness": Brain,
  "Market Positioning": TrendingUp,
  "Culture Fit": Award,
};

const SEVERITY_BADGES = {
  fatal: "🔴 Fatal",
  critical: "🟡 Critical",
  strong: "🟢 Strong",
};

function VerdictCard({ verdict }: { verdict: BrutalVerdict }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = CATEGORY_ICONS[verdict.category] || ShieldAlert;

  return (
    <div className="card-surface overflow-hidden transition-all hover:border-terracotta/30 shadow-xs">
      <button
        type="button"
        className="flex w-full items-center gap-3.5 p-5 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta">
          <Icon className="h-5 w-5" strokeWidth={1.7} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">{verdict.category}</h4>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              {SEVERITY_BADGES[verdict.severity]}
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
        <div className="border-t border-border bg-secondary/40 px-5 py-3.5 text-xs leading-relaxed">
          <p className="font-bold uppercase tracking-wider text-terracotta">Fix Prescription</p>
          <p className="mt-1 text-foreground font-medium">{verdict.whatToFix}</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recruiter Chat Component                                           */
/* ------------------------------------------------------------------ */

function RecruiterChat({ session, companyName }: { session: RecruiterSession; companyName: string }) {
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
    "What specific project should I build to impress you?",
    "How do I prepare for your technical interview?",
    "What skills should I prioritize learning first?",
    "Is my resume good enough for your ATS screening?",
  ];

  return (
    <div className="card-surface overflow-hidden shadow-md">
      <div className="flex items-center gap-3 border-b border-border bg-secondary/30 px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-terracotta text-white font-bold">
          <UserCheck className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-foreground">{companyName} — Head of Talent</h4>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Online — Ask any brutal questions about your hiring chances
          </p>
        </div>
      </div>

      <div className="max-h-[380px] space-y-3 overflow-y-auto p-6">
        {messages.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground font-medium">
            Ask the recruiter anything: target salary, how to prepare, project ideas, or why you'd be rejected.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "student" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed font-medium",
                msg.role === "student"
                  ? "rounded-br-xs bg-terracotta text-white font-semibold"
                  : "rounded-bl-xs bg-secondary text-foreground",
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {chat.isPending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-xs bg-secondary px-4 py-3 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-terracotta" />
              {companyName} recruiter is typing...
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
            className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground disabled:opacity-40"
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
          placeholder="Ask the recruiter..."
          disabled={chat.isPending}
          className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-medium outline-none focus:border-terracotta"
        />
        <Button
          type="button"
          onClick={() => handleSend()}
          disabled={chat.isPending || !input.trim()}
          className="rounded-xl px-4 bg-terracotta hover:bg-terracotta/90 text-white"
        >
          <Send className="h-4 w-4" />
        </Button>
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

  const effectiveCompany = isCustomCompany
    ? customCompanyInput.trim() || "Target Company"
    : selectedCompany;

  const { data: existingSession } = useRecruiterSession();
  const runAudit = useRunRecruiterAudit();
  const generateRoadmap = useGenerateRoadmapV2();
  const [currentSession, setCurrentSession] = useState<RecruiterSession | null>(null);

  useEffect(() => {
    if (existingSession && !currentSession) {
      setCurrentSession(existingSession);
    }
  }, [existingSession, currentSession]);

  function handleRunAudit() {
    if (isCustomCompany && !customCompanyInput.trim()) {
      toast.error("Please enter a custom company name.");
      return;
    }
    if (!isCustomCompany && !selectedCompany) {
      toast.error("Please select a target company.");
      return;
    }

    runAudit.mutate(
      { company: effectiveCompany, role: selectedRole },
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
        {/* Top Hero Card (Inspired directly by RECRUITIQ screenshot layout with girl laptop image) */}
        <RecruiterHeroCard
          targetCompany={effectiveCompany}
          targetRole={selectedRole}
          score={
            currentSession?.auditResult.scoreVersion === "deterministic-evidence-v1"
              ? currentSession.overallScore
              : null
          }
        />

        {/* Process Stepper Pipeline (Inspired directly by bottom stepper in RECRUITIQ screenshot) */}
        <RecruiterPipelineStepper activeStep={activeStep} onStepClick={setActiveStep} />

        <AnimatePresence mode="wait">
          {runAudit.isPending ? (
            <ScanningOverlay companyName={effectiveCompany} />
          ) : (
            <motion.div key={activeStep} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              {/* STEP 1: Define Role & Target Employer */}
              {activeStep === 1 && (
                <div className="card-surface p-6 sm:p-8 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
                        Select Target Employer
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pick a prominent Pakistani/Global tech employer or enter your own custom company.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCustomCompany(!isCustomCompany)}
                      className="rounded-xl border-terracotta/30 text-xs font-bold text-terracotta hover:bg-terracotta/10"
                    >
                      {isCustomCompany ? "← Choose Featured" : "+ Custom Company"}
                    </Button>
                  </div>

                  {isCustomCompany ? (
                    <div className="space-y-3 rounded-2xl border border-terracotta/20 bg-secondary/30 p-5">
                      <label className="text-xs font-bold uppercase tracking-wider text-terracotta">
                        Enter Any Company Name
                      </label>
                      <input
                        type="text"
                        value={customCompanyInput}
                        onChange={(e) => setCustomCompanyInput(e.target.value)}
                        placeholder="e.g. Careem, Devsinc, Google, Arbitsoft, Folio3..."
                        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-xs font-semibold outline-none focus:border-terracotta"
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
                                ? "border-terracotta bg-terracotta/5 ring-2 ring-terracotta/40 shadow-xs"
                                : "border-border bg-card hover:border-terracotta/30",
                            )}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary font-extrabold text-xs text-foreground">
                              {co.shortName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-foreground">{co.name}</p>
                              <p className="truncate text-[11px] text-muted-foreground">{co.tier}</p>
                            </div>
                            {isSelected && (
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-terracotta text-white">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-2">
                    <label className="text-xs font-bold text-foreground">Target Role Position</label>
                    <input
                      type="text"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      placeholder="Associate Software Engineer"
                      className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-4 text-xs font-semibold outline-none focus:border-terracotta"
                    />
                  </div>

                  <Button
                    onClick={handleRunAudit}
                    disabled={runAudit.isPending}
                    className="w-full rounded-xl py-3 font-bold text-xs bg-terracotta hover:bg-terracotta/90 text-white"
                  >
                    {runAudit.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Run Brutal Recruiter Audit for {effectiveCompany}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* STEP 2 & 3: Recruiter Dashboard Widgets & Scorecard */}
              {(activeStep === 2 || activeStep === 3) && currentSession && (
                <div className="space-y-6">
                  {/* Rating Dots & Match Score Dashboard Widgets matching user screenshot */}
                  <RecruiterDashboardWidgets audit={currentSession.auditResult} companyName={currentSession.companyName} />

                  {/* Verdict Cards */}
                  <div>
                    <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
                      <Flame className="h-5 w-5 text-terracotta" />
                      Brutal Verdict Breakdown
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {currentSession.auditResult.brutalVerdicts.map((v) => (
                        <VerdictCard key={v.category} verdict={v} />
                      ))}
                    </div>
                  </div>

                  {/* Step Navigation */}
                  <div className="flex justify-end pt-4 border-t border-border mt-6">
                    <Button 
                      onClick={() => setActiveStep(4)}
                      className="rounded-xl px-6 py-2.5 font-bold text-xs bg-terracotta hover:bg-terracotta/90 text-white"
                    >
                      Continue to Action Plan
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 4 & 5: Live Q&A & Roadmap Action Plan */}
              {(activeStep === 4 || activeStep === 5) && currentSession && (
                <div className="space-y-6">
                  {/* Recommended Proof Project */}
                  <div className="card-surface p-6 sm:p-8 space-y-3">
                    <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-terracotta" />
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
                          className="rounded-full bg-terracotta/10 px-3 py-1 text-xs font-bold text-terracotta"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="pt-4">
                      <Button
                        onClick={handleAddToRoadmap}
                        disabled={generateRoadmap.isPending}
                        className="w-full rounded-xl py-3 font-bold text-xs bg-terracotta hover:bg-terracotta/90 text-white"
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

                  {/* Live Chat */}
                  <div>
                    <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-terracotta" />
                      Live Chat with {currentSession.companyName} Recruiter
                    </h3>
                    <RecruiterChat session={currentSession} companyName={currentSession.companyName} />
                  </div>

                  {/* Step Navigation */}
                  <div className="flex justify-start pt-4 border-t border-border mt-6">
                    <Button 
                      variant="outline"
                      onClick={() => setActiveStep(3)}
                      className="rounded-xl px-6 py-2.5 font-bold text-xs"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Dashboard
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

