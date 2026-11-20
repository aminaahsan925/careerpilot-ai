/**
 * Interview Prep (Round 3, Direction 2, Cursor as Flashlight / Lens).
 *
 * Presentation only: every behaviour, query, save and score below is
 * the original page. What changed is the surface: near-black ground,
 * neon lime accent, Cabinet Grotesk display type with Fraunces serif
 * for the reveal moments, and the shared lens engine throughout.
 *
 * Signature moment: "Under the light". One question at a time sits in
 * the dark in big serif type; the flashlight reveals what it tests,
 * the shape of a strong answer, and the hiring signal, all from the
 * real question data. The lit column is deliberately narrow (230px on
 * phones, 260px on desktop) so its lines sit inside the light pool at
 * the natural cursor position instead of straddling the pool edge: at
 * the narrowest desktop width the pool is 292px across, so a 320px
 * column clipped every line. The base content is vertically centred,
 * so the question (where the eye and the cursor go) sits at the
 * column's height. The practiced count in the hero sits under a Lens;
 * question cards, stat cards and the aside carry spotlight borders;
 * the question-bank heading is kinetic (it is reached by scrolling,
 * which is the motion the engine is built for); headings that mount
 * already in view (hero, MCQ, Answer lab) stay plain, because
 * KineticText measures on scroll and a heading that mounts mid-view
 * renders stuck mid-morph, dim and overlapping the copy below. The
 * primary CTAs are magnetic.
 *
 * Honesty rules: the prep figure is the real practiced count, never a
 * formula score. Unresearched companies say so. No invented numbers.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Award,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Flashlight as FlashlightIcon,
  ListChecks,
  MessageSquareText,
  Mic2,
  SearchCheck,
  Target,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppLayout } from "@/components/app/AppLayout";
import { Flashlight } from "@/components/lens/Flashlight";
import { KineticText } from "@/components/lens/KineticText";
import { Lens } from "@/components/lens/Lens";
import { MagneticButton } from "@/components/lens/MagneticButton";
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import "@/components/interview-prep/interview-prep-r3.css";
import { Button } from "@/components/ui/button";
import {
  buildInterviewIntel,
  getInterviewCompanies,
  type InterviewMcq,
  type InterviewQuestion,
} from "@/data/interview-intel";
import {
  useInterviewPrep,
  useMcqAttempts,
  useRecordMcqAttempt,
  useSaveInterviewPrep,
} from "@/data/interview-prep";
import { useCurrentUser } from "@/data/user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/jobmirror")({
  head: () => ({
    meta: [
      { title: "Interview Prep - CareerPilot AI" },
      {
        name: "description",
        content: "Prepare for the interview stages and questions behind your target role.",
      },
    ],
  }),
  component: InterviewPrepPage,
});

type PrepTab =
  "overview" | "technical" | "system_design" | "behavioral" | "mcq_checkpoint" | "answer_lab";

const TABS: Array<{ id: PrepTab; label: string }> = [
  { id: "overview", label: "Brief overview" },
  { id: "technical", label: "Technical" },
  { id: "system_design", label: "System design" },
  { id: "behavioral", label: "Behavioral" },
  { id: "mcq_checkpoint", label: "MCQ checkpoint" },
  { id: "answer_lab", label: "Answer lab" },
];

const CATEGORY_LABELS: Record<InterviewQuestion["category"], string> = {
  technical: "Technical screen",
  system_design: "System design",
  behavioral: "Behavioral round",
};

const plural = (count: number, word: string) => (count === 1 ? word : `${word}s`);

function QuestionCard({
  question,
  selected,
  onPractice,
}: {
  question: InterviewQuestion;
  selected: boolean;
  onPractice: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <SpotlightCard
      className={cn(
        "rounded-2xl border bg-card transition-colors",
        selected ? "border-cp-lime/50" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <CircleHelp className="h-4 w-4 shrink-0 text-cp-lime" />
        <span className="flex-1 font-display text-[14px] font-semibold leading-relaxed text-foreground">
          {question.question}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="space-y-4 border-t border-border px-4 pb-4 pt-4 text-[12.5px] leading-relaxed">
          <div className="flex flex-wrap gap-2">
            <span className="cp-chip text-muted-foreground">
              {CATEGORY_LABELS[question.category]}
            </span>
            {selected && <span className="cp-chip text-cp-lime">Practiced</span>}
          </div>
          <div>
            <p className="cp-eyebrow">What it tests</p>
            <p className="mt-1.5 text-muted-foreground">{question.whatItTests}</p>
          </div>
          <div>
            <p className="cp-eyebrow">Strong answer shape</p>
            <p className="mt-1.5 font-serif text-[14px] italic leading-relaxed text-cp-paper">
              {question.strongAnswer}
            </p>
          </div>
          <div className="rounded-xl border border-cp-lime/20 bg-cp-lime/5 p-3 text-muted-foreground">
            <span className="font-bold text-cp-lime">Hiring signal: </span>
            {question.companySignal}
          </div>
          <Button
            variant={selected ? "secondary" : "outline"}
            size="sm"
            className="rounded-lg text-[11px]"
            onClick={(event) => {
              event.stopPropagation();
              onPractice();
            }}
          >
            {selected ? (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Mic2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            {selected ? "Practiced" : "Mark practiced"}
          </Button>
        </div>
      )}
    </SpotlightCard>
  );
}

/* ------------------------------------------------------------------ */
/* The signature moment: one question under the light.                 */
/*                                                                     */
/* Built on the shared <Flashlight>: the question sits dimmed in big   */
/* serif type, and the light reveals what it tests, the strong answer  */
/* shape, and the hiring signal, all from the real question data. The  */
/* lit column is narrow on purpose (230px on phones, 260px on          */
/* desktop) so its lines sit inside the light pool at the natural      */
/* cursor position: at the narrowest desktop width the pool is 292px   */
/* across, so a 320px column clipped every line at the pool edge, and  */
/* lines above/below the cursor clip where the circle narrows, which   */
/* is why the copy tells the user to move the light to read each part. */
/* The base content is vertically centred, so the question (where the  */
/* eye and the cursor go) sits at the column's height. The base layer  */
/* carries a min-height so the taller lit layer never clips: the lit   */
/* layer is absolutely positioned over the base, so the base defines   */
/* the panel height. The practice action lives below the flashlight,   */
/* outside it, so it is always clickable (the lit layer is             */
/* pointer-events none until revealed). Reduced motion and touch get   */
/* the engine's own fallbacks: both layers stacked and fully visible,  */
/* plus the reveal toggle.                                             */
/* ------------------------------------------------------------------ */

function SpotlightQuestion({
  question,
  practiced,
  practicedCount,
  totalCount,
  position,
  allPracticed,
  onPractice,
}: {
  question: InterviewQuestion;
  practiced: boolean;
  practicedCount: number;
  totalCount: number;
  /** 1-based position of this question within the current view. */
  position: number;
  allPracticed: boolean;
  onPractice: () => void;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10 bg-cp-ink"
      data-r3c="spotlight-question"
    >
      <Flashlight
        className="px-5 py-6 sm:px-6"
        lit={
          <div className="mx-auto w-full max-w-[230px] px-2 sm:max-w-[260px]">
            <p className="cp-eyebrow text-cp-lime">What it tests</p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-cp-paper">
              {question.whatItTests}
            </p>
            <p className="cp-eyebrow mt-4 text-cp-lime">Strong answer shape</p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-cp-paper">
              {question.strongAnswer}
            </p>
            <p className="cp-eyebrow mt-4 text-cp-lime">Hiring signal</p>
            <p className="mt-1.5 font-serif text-[13.5px] italic leading-snug text-cp-paper">
              {question.companySignal}
            </p>
          </div>
        }
      >
        {/* Base layer: the question in the dark, dimmed by Flashlight.
            Vertically centred, so the question sits at the lit column's
            height and the min-height reads as breathing room, not a
            hole. The min-height keeps the taller lit layer from
            clipping. */}
        <div className="flex min-h-[360px] flex-col justify-center sm:min-h-[320px]">
          <div className="flex flex-wrap items-center gap-2">
            <p className="cp-eyebrow flex items-center gap-2">
              <FlashlightIcon className="h-3.5 w-3.5 text-cp-lime" /> Under the light
            </p>
            <span className="cp-chip text-cp-stone">{CATEGORY_LABELS[question.category]}</span>
            {practiced && <span className="cp-chip text-cp-lime">Practiced</span>}
          </div>
          <p className="mt-6 max-w-xl font-serif text-[22px] italic leading-snug text-cp-paper sm:text-[26px]">
            &quot;{question.question}&quot;
          </p>
          <p className="mt-5 max-w-md font-mono text-[11px] leading-relaxed tracking-[0.08em] text-cp-stone">
            {allPracticed
              ? "Every prompt in this view is practiced. Shine the light again to revisit the first one."
              : "Move the light across the panel to see what this question tests, the shape of a strong answer, and the hiring signal."}
          </p>
          <p className="mt-6 font-mono text-[10.5px] tracking-[0.18em] text-cp-stone/70">
            PROMPT {position} OF {totalCount} IN THIS VIEW
          </p>
        </div>
      </Flashlight>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:px-6">
        <p className="font-mono text-[11px] tracking-[0.08em] text-cp-stone">
          {practicedCount} of {totalCount} {plural(totalCount, "prompt")} in this view practiced
        </p>
        <MagneticButton
          onClick={onPractice}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em]",
            practiced
              ? "border border-cp-lime/40 bg-cp-lime/10 text-cp-lime"
              : "bg-cp-lime text-cp-ink hover:bg-cp-lime2",
          )}
        >
          {practiced ? <Check className="h-3.5 w-3.5" /> : <Mic2 className="h-3.5 w-3.5" />}
          {practiced ? "Practiced" : "Mark practiced"}
        </MagneticButton>
      </div>
    </div>
  );
}

function McqCheckpoint({
  questions,
  company,
  role,
  initialAnswers,
  totalAttempts,
  onAnswer,
}: {
  questions: InterviewMcq[];
  company: string;
  role: string;
  /** Latest saved answer per MCQ (loaded async); undefined while loading. */
  initialAnswers: Record<string, string> | undefined;
  totalAttempts: number;
  onAnswer: (mcqId: string, selectedOption: string, correct: boolean) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const hydratedRef = useRef("");

  // Restore the latest saved answers once they load (per company + role).
  useEffect(() => {
    const key = `${company}|||${role}`;
    if (hydratedRef.current === key) return;
    if (initialAnswers === undefined) return;
    hydratedRef.current = key;
    setAnswers(initialAnswers);
  }, [initialAnswers, company, role]);

  function handleSelect(question: InterviewMcq, optionId: string) {
    setAnswers((current) => ({ ...current, [question.id]: optionId }));
    onAnswer(question.id, optionId, optionId === question.correctOption);
  }
  const orderedQuestions = [...questions].sort(
    (a, b) => a.level - b.level || a.id.localeCompare(b.id),
  );
  const currentQuestion = orderedQuestions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const score = orderedQuestions.filter(
    (question) => answers[question.id] === question.correctOption,
  ).length;
  const answeredCount = Object.keys(answers).length;
  const levels = [1, 2, 3, 4] as const;
  const levelLabels = {
    1: "Level 1 · Foundations",
    2: "Level 2 · Applied practice",
    3: "Level 3 · Advanced judgement",
    4: "Level 4 · Scenario panel",
  } as const;

  return (
    <SpotlightCard className="card-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-cp-lime" />
            <h3 className="font-display text-[17px] font-bold">
              Progressive MCQ checkpoint
            </h3>
          </div>
          <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
            Start with role fundamentals, then work through employer-specific applied, advanced, and
            production scenarios.
            {totalAttempts > 0 && (
              <> Your answers are saved. {totalAttempts} attempt{totalAttempts === 1 ? "" : "s"} recorded for this role and company.</>
            )}
          </p>
        </div>
        {submitted && (
          <span className="cp-chip bg-cp-lime/10 font-bold text-cp-lime">
            Score: {score}/{questions.length}
          </span>
        )}
      </div>
      {!submitted && currentQuestion ? (
        <>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {levels.map((level) => {
              const active = currentQuestion.level === level;
              const complete = orderedQuestions
                .slice(0, currentIndex)
                .some((question) => question.level === level);
              return (
                <div
                  key={level}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-center",
                    active ? "border-cp-lime bg-cp-lime/10" : "border-border bg-secondary/40",
                  )}
                >
                  <div
                    className={cn(
                      "mx-auto flex h-6 w-6 items-center justify-center rounded-full font-mono text-[10px] font-bold",
                      active
                        ? "bg-cp-lime text-cp-ink"
                        : complete
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {complete ? <Check className="h-3 w-3" /> : level}
                  </div>
                  <p className="mt-1 hidden font-mono text-[9px] font-semibold uppercase tracking-wide text-muted-foreground sm:block">
                    {levelLabels[level].replace(/^Level [1-4] Â· /, "")}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-2xl border border-border bg-background/60 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-cp-lime">
                Question {currentIndex + 1} of {orderedQuestions.length}
              </span>
              <span className="cp-chip text-muted-foreground">
                {currentQuestion.difficulty}
              </span>
            </div>
            <h4 className="mt-3 font-display text-[16px] font-bold leading-relaxed">
              {currentQuestion.question}
            </h4>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {currentQuestion.options.map((option) => {
                const selected = selectedAnswer === option.id;
                const correct = selectedAnswer && option.id === currentQuestion.correctOption;
                const incorrect = selectedAnswer && selected && !correct;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={Boolean(selectedAnswer)}
                    onClick={() => handleSelect(currentQuestion, option.id)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left text-[12px] leading-relaxed transition-colors",
                      correct
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                        : incorrect
                          ? "border-rose-400 bg-rose-500/10 text-rose-300"
                          : selected
                            ? "border-cp-lime bg-cp-lime/10"
                            : "border-border text-muted-foreground hover:border-cp-lime/60 hover:bg-muted/40",
                    )}
                  >
                    <span className="mr-1 font-mono font-bold uppercase">{option.id}.</span> {option.text}
                  </button>
                );
              })}
            </div>
            {selectedAnswer && (
              <div
                className={cn(
                  "mt-4 rounded-xl border p-3 text-[12px] leading-relaxed",
                  selectedAnswer === currentQuestion.correctOption
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                    : "border-rose-500/25 bg-rose-500/10 text-rose-200",
                )}
              >
                <div className="flex items-start gap-2">
                  {selectedAnswer === currentQuestion.correctOption ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  )}
                  <div>
                    <p className="font-bold">
                      {selectedAnswer === currentQuestion.correctOption
                        ? "Correct. Strong hiring signal."
                        : "Not quite. Here is why."}
                    </p>
                    <p className="mt-1">{currentQuestion.explanation}</p>
                    <p className="mt-2 font-semibold">
                      What the interviewer is testing: {currentQuestion.hiringSignal}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-5 flex justify-end">
              <Button
                className="rounded-xl bg-cp-lime text-xs font-bold text-cp-ink hover:bg-cp-lime2"
                disabled={!selectedAnswer}
                onClick={() =>
                  currentIndex === orderedQuestions.length - 1
                    ? setSubmitted(true)
                    : setCurrentIndex((index) => index + 1)
                }
              >
                {currentIndex === orderedQuestions.length - 1
                  ? "Finish checkpoint"
                  : "Next question"}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-cp-lime/20 bg-cp-lime/5 p-5 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cp-lime/10 text-cp-lime">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h4 className="mt-3 font-display text-lg font-bold">Checkpoint complete</h4>
          {/* The score is the real count of correct answers, under a Lens
              (static text, so the light copy stays clean). */}
          <div data-r3c="mcq-score-lens">
            <Lens>
              <p className="mt-2 font-display text-[52px] font-extrabold leading-none tracking-tight text-cp-lime">
                {score}
                <span className="font-mono text-[18px] font-medium text-cp-stone">
                  {" "}
                  / {orderedQuestions.length}
                </span>
              </p>
            </Lens>
          </div>
          <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-muted-foreground">
            You scored {score} out of {orderedQuestions.length}. Review each explanation, then try
            again to strengthen weak areas.
          </p>
          <MagneticButton
            className="mt-5 inline-flex items-center rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-foreground hover:border-cp-lime/60"
            onClick={() => {
              setAnswers({});
              setCurrentIndex(0);
              setSubmitted(false);
            }}
          >
            Try again
          </MagneticButton>
        </div>
      )}
    </SpotlightCard>
  );
}

export function InterviewPrepPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const companies = getInterviewCompanies();
  const defaultCompany = user?.applications?.[0]?.company || "";
  const [company, setCompany] = useState(defaultCompany);
  const [customCompany, setCustomCompany] = useState("");
  const [activeTab, setActiveTab] = useState<PrepTab>("overview");
  const targetRole = user?.goal || user?.role || "Technology role";
  const selectedCompany = company === "__custom__" ? customCompany.trim() : company.trim();
  const intel = buildInterviewIntel(targetRole, selectedCompany);
  const firstQuestion = intel.questions[0];

  // Persisted prep state (Supabase, per company + role), no longer
  // local useState that resets on refresh.
  const { data: savedPrep } = useInterviewPrep(selectedCompany, intel.role);
  const savePrep = useSaveInterviewPrep();
  const [practiced, setPracticed] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [answer, setAnswer] = useState("");
  const hydratedKey = useRef("");

  useEffect(() => {
    const key = `${selectedCompany}|||${intel.role}`;
    if (hydratedKey.current === key) return;
    if (savedPrep === undefined) return;
    hydratedKey.current = key;
    setPracticed(savedPrep?.practicedQuestions ?? []);
    setChecklist(savedPrep?.checklistItems ?? []);
    const loadedDrafts = savedPrep?.answerDrafts ?? {};
    setDrafts(loadedDrafts);
    setAnswer(firstQuestion ? (loadedDrafts[firstQuestion.question] ?? "") : "");
  }, [savedPrep, selectedCompany, intel.role, firstQuestion]);

  function persist(next: {
    practiced?: string[];
    checklist?: string[];
    drafts?: Record<string, string>;
  }) {
    savePrep.mutate({
      company: selectedCompany,
      role: intel.role,
      practicedQuestions: next.practiced ?? practiced,
      checklistItems: next.checklist ?? checklist,
      answerDrafts: next.drafts ?? drafts,
    });
  }

  function togglePracticed(value: string) {
    const next = practiced.includes(value)
      ? practiced.filter((item) => item !== value)
      : [...practiced, value];
    setPracticed(next);
    persist({ practiced: next });
  }

  function toggleChecklist(value: string) {
    const next = checklist.includes(value)
      ? checklist.filter((item) => item !== value)
      : [...checklist, value];
    setChecklist(next);
    persist({ checklist: next });
  }

  function saveDraft() {
    if (!firstQuestion) return;
    const next = { ...drafts, [firstQuestion.question]: answer };
    setDrafts(next);
    persist({ drafts: next });
  }

  // MCQ attempts (persisted; latest answer per question is restored).
  const { data: mcqData } = useMcqAttempts(selectedCompany, intel.role);
  const recordMcq = useRecordMcqAttempt();
  const initialMcqAnswers = useMemo(() => {
    const out: Record<string, string> = {};
    for (const attempt of mcqData?.latest ?? []) out[attempt.mcqId] = attempt.selectedOption;
    return out;
  }, [mcqData]);

  const visibleQuestions = useMemo(
    () =>
      activeTab === "overview" || activeTab === "answer_lab"
        ? intel.questions
        : intel.questions.filter((question) => question.category === activeTab),
    [activeTab, intel.questions],
  );
  // Honest progress: a real count of practiced prompts, not a formula
  // score. The old "42 + practiced*12 + checklist*4" readiness number
  // was invented and is gone.
  const totalQuestions = intel.questions.length;
  const progressPct =
    totalQuestions > 0 ? Math.round((practiced.length / totalQuestions) * 100) : 0;

  // The question under the light: the first unpracticed prompt in this
  // view, or the first prompt again once all of them are practiced.
  const spotlightQuestion =
    visibleQuestions.find((question) => !practiced.includes(question.question)) ??
    visibleQuestions[0];
  const spotlightPracticedCount = visibleQuestions.filter((question) =>
    practiced.includes(question.question),
  ).length;
  const spotlightAllPracticed =
    visibleQuestions.length > 0 && spotlightPracticedCount === visibleQuestions.length;
  const isQuestionTab =
    activeTab === "overview" ||
    activeTab === "technical" ||
    activeTab === "system_design" ||
    activeTab === "behavioral";

  return (
    <AppLayout
      title="Interview Prep"
      subtitle="Turn your target role into a focused interview practice plan"
    >
      <div className="space-y-4">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-cp-panel">
          <div className="cp-interview-beam" aria-hidden="true" />
          <div className="cp-interview-hero-glow" aria-hidden="true" />
          <div className="relative p-6 sm:p-8">
            <div className="relative flex flex-wrap items-start justify-between gap-6">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cp-lime/15 text-cp-lime">
                  <MessageSquareText className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="cp-eyebrow text-cp-lime">Interview practice plan</p>
                  <h2 className="editorial-title mt-3 font-display text-4xl text-cp-paper sm:text-5xl">
                    {intel.role}
                  </h2>
                  <p className="mt-3 max-w-xl font-serif text-[16px] italic leading-relaxed text-cp-stone">
                    {intel.companyTagline}
                  </p>
                </div>
              </div>
              {/* Prep progress, under a Lens: the count and the bar are
                  static text, so the light copy stays clean. */}
              <div
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:w-auto sm:min-w-[230px]"
                data-r3c="hero-progress"
              >
                <Lens>
                  <div className="flex items-center justify-between gap-4">
                    <span className="cp-eyebrow">Prep progress</span>
                    <span className="font-mono text-[11px] font-bold text-cp-lime">
                      {practiced.length} of {totalQuestions} {plural(totalQuestions, "prompt")}
                    </span>
                  </div>
                  <p className="mt-3 font-display text-[40px] font-extrabold leading-none tracking-tight text-cp-lime">
                    {practiced.length}
                    <span className="font-mono text-[15px] font-medium text-cp-stone">
                      {" "}
                      / {totalQuestions}
                    </span>
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cp-lime transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="mt-2.5 font-mono text-[10.5px] leading-relaxed text-cp-stone">
                    {checklist.length} of 4 evidence items ready · Progress is saved
                  </p>
                </Lens>
              </div>
            </div>
            <div className="relative mt-7 flex flex-wrap items-center gap-3">
              <label
                className="cp-eyebrow"
                htmlFor="interview-company"
              >
                Target company
              </label>
              <select
                id="interview-company"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                className="w-full max-w-full rounded-xl border border-white/15 bg-cp-panel px-3 py-2 text-[12px] text-cp-paper outline-none focus:border-cp-lime sm:w-auto"
              >
                <option value="" className="text-foreground">
                  General industry (no company)
                </option>
                <option value="__custom__" className="text-foreground">
                  Add my own company
                </option>
                {companies.map((item) => (
                  <option key={item.id} value={item.name} className="text-foreground">
                    {item.name}
                  </option>
                ))}
                {!companies.some((item) => item.name === company) && (
                  <option value={company} className="text-foreground">
                    {company}
                  </option>
                )}
              </select>
              {company === "__custom__" && (
                <input
                  value={customCompany}
                  onChange={(event) => setCustomCompany(event.target.value)}
                  placeholder="Type any company"
                  aria-label="Custom company name"
                  className="w-full max-w-full rounded-xl border border-white/15 bg-cp-panel px-3 py-2 text-[12px] text-cp-paper outline-none placeholder:text-cp-stone/50 focus:border-cp-lime sm:w-auto"
                />
              )}
              {selectedCompany && !intel.companyResearched ? (
                <span className="text-[11.5px] leading-relaxed text-amber-300">
                  &ldquo;{selectedCompany}&rdquo; is not researched yet, so this shows role-based interview prep, not company-specific standards.
                </span>
              ) : (
                <span className="text-[11.5px] text-cp-stone">
                  Research-backed prompts, not leaked interview questions
                </span>
              )}
            </div>
          </div>
          <div className="relative flex gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 sm:px-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors",
                  activeTab === tab.id
                    ? "bg-cp-lime text-cp-ink"
                    : "text-cp-stone hover:bg-white/10 hover:text-cp-paper",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === "overview" && (
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: SearchCheck,
                label: "Hiring lens",
                value: `${intel.focusAreas.length} focus areas`,
                note: "What the company screens for",
              },
              {
                icon: Clock3,
                label: "Interview flow",
                value: `${intel.stages.length} stages`,
                note: "Likely evaluation sequence",
              },
              {
                icon: ClipboardCheck,
                label: "Question bank",
                value: `${intel.questions.length} prompts + ${intel.mcqs.length} MCQs`,
                note: "Practice with evidence and hiring-bar checkpoints",
              },
            ].map(({ icon: Icon, label, value, note }) => (
              <SpotlightCard key={label} className="card-surface flex items-start gap-3 p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cp-lime/10 text-cp-lime">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="cp-eyebrow">{label}</p>
                  <p className="mt-1.5 font-display text-[17px] font-bold leading-tight">{value}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{note}</p>
                </div>
              </SpotlightCard>
            ))}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {activeTab === "mcq_checkpoint" ? (
              <McqCheckpoint
                key={`${intel.role}:${intel.company}`}
                questions={intel.mcqs}
                company={selectedCompany}
                role={intel.role}
                initialAnswers={mcqData ? initialMcqAnswers : undefined}
                totalAttempts={mcqData?.totalAttempts ?? 0}
                onAnswer={(mcqId, selectedOption, correct) =>
                  recordMcq.mutate({
                    company: selectedCompany,
                    role: intel.role,
                    mcqId,
                    selectedOption,
                    correct,
                  })
                }
              />
            ) : activeTab === "answer_lab" ? (
              <SpotlightCard className="card-surface p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-lime/10 text-cp-lime">
                    <Mic2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-[17px] font-bold">
                      Answer lab
                    </h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                      Draft a concise answer, then compare it with the evidence pattern recruiters
                      expect.
                    </p>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl border border-white/10 bg-cp-ink p-4">
                  <p className="cp-eyebrow text-cp-lime">Prompt</p>
                  <p className="mt-2 font-serif text-[16px] italic leading-relaxed text-cp-paper">
                    {firstQuestion?.question}
                  </p>
                </div>
                <textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  onBlur={saveDraft}
                  placeholder="Use: context, decision, evidence, result, reflection..."
                  className="mt-4 min-h-40 w-full resize-y rounded-2xl border border-border bg-card p-4 text-[13px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-cp-lime"
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {answer.trim().length} characters · Aim for 60 to 90 seconds aloud · Drafts
                    are saved
                  </p>
                  <MagneticButton
                    className="inline-flex items-center rounded-xl bg-cp-lime px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-cp-ink hover:bg-cp-lime2"
                    onClick={() => {
                      saveDraft();
                      if (firstQuestion) togglePracticed(firstQuestion.question);
                    }}
                  >
                    {firstQuestion && practiced.includes(firstQuestion.question)
                      ? "Practice logged"
                      : "Log practice"}
                  </MagneticButton>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {["Clear situation", "Technical decision", "Proof of outcome"].map((item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-border p-3 text-[11.5px] font-semibold text-muted-foreground"
                    >
                      <Target className="mb-2 h-4 w-4 text-cp-lime" />
                      {item}
                    </div>
                  ))}
                </div>
              </SpotlightCard>
            ) : (
              <div className="card-surface p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-[17px] font-bold">
                      {/* Kinetic: this heading is reached by scrolling, so
                          the morph plays as it arrives. The description
                          below carries mt-8, so the words' 28px dip
                          while morphing never overlaps it. */}
                      <KineticText
                        text={
                          activeTab === "overview"
                            ? "Practice questions"
                            : `${CATEGORY_LABELS[activeTab]} questions`
                        }
                      />
                    </h3>
                    <p className="mt-8 text-[12.5px] text-muted-foreground">
                      Open a prompt to see the evaluation logic and answer structure.
                    </p>
                  </div>
                  <span className="cp-chip shrink-0 text-muted-foreground">
                    {visibleQuestions.length} {plural(visibleQuestions.length, "prompt")}
                  </span>
                </div>
                {isQuestionTab && spotlightQuestion && (
                  <div className="mt-5">
                    <SpotlightQuestion
                      question={spotlightQuestion}
                      practiced={practiced.includes(spotlightQuestion.question)}
                      practicedCount={spotlightPracticedCount}
                      totalCount={visibleQuestions.length}
                      position={visibleQuestions.indexOf(spotlightQuestion) + 1}
                      allPracticed={spotlightAllPracticed}
                      onPractice={() => togglePracticed(spotlightQuestion.question)}
                    />
                  </div>
                )}
                <div className="mt-5 space-y-2">
                  {visibleQuestions.map((question) => (
                    <QuestionCard
                      key={question.question}
                      question={question}
                      selected={practiced.includes(question.question)}
                      onPractice={() => togglePracticed(question.question)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <SpotlightCard className="card-surface p-5">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-cp-lime" />
                <h3 className="font-display text-[15px] font-bold">Evidence to bring</h3>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                Use your roadmap work as proof instead of memorising generic answers.
              </p>
              <div className="mt-4 space-y-2.5">
                {[
                  "Proof project demo link",
                  "Architecture or decision note",
                  "Test or quality evidence",
                  "One measurable outcome",
                ].map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => toggleChecklist(item)}
                    className="flex w-full items-center gap-2 text-left text-[12px]"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        checklist.includes(item)
                          ? "border-cp-lime bg-cp-lime text-cp-ink"
                          : "border-border text-transparent",
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span
                      className={cn(
                        checklist.includes(item) && "text-muted-foreground line-through",
                      )}
                    >
                      {item}
                    </span>
                  </button>
                ))}
              </div>
            </SpotlightCard>
            <SpotlightCard className="card-surface p-5">
              <h3 className="font-display text-[15px] font-bold">Expected interview stages</h3>
              <div className="mt-4 space-y-3">
                {intel.stages.map((stage, index) => (
                  <div key={stage} className="flex items-start gap-3 text-[12.5px]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cp-lime/10 font-mono text-[10px] font-bold text-cp-lime">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed text-muted-foreground">{stage}</span>
                  </div>
                ))}
              </div>
            </SpotlightCard>
            <div className="card-surface bg-cp-lime/5 p-5">
              <p className="cp-eyebrow text-cp-lime">Keep moving</p>
              <p className="mt-2 font-serif text-[15px] italic leading-relaxed text-cp-paper">
                Turn your weakest interview signal into the next roadmap task.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl text-[11px]"
                  onClick={() => void navigate({ to: "/roadmap" })}
                >
                  Open Roadmap
                </Button>
                <MagneticButton
                  href="/mentor"
                  className="inline-flex items-center rounded-xl bg-cp-lime px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-cp-ink hover:bg-cp-lime2"
                >
                  Ask AI Mentor
                </MagneticButton>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
