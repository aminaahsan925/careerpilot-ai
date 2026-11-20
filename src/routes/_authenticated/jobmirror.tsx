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
  ListChecks,
  MessageSquareText,
  Mic2,
  SearchCheck,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AppLayout } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import {
  buildInterviewIntel,
  getInterviewCompanies,
  type InterviewMcq,
  type InterviewQuestion,
} from "@/data/interview-intel";
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
    <div
      className={cn(
        "rounded-2xl border bg-card transition-colors",
        selected ? "border-terracotta/50" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <CircleHelp className="h-4 w-4 shrink-0 text-terracotta" />
        <span className="flex-1 text-[13px] font-semibold leading-relaxed text-foreground">
          {question.question}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-4 pb-4 pt-3 text-[12px] leading-relaxed">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABELS[question.category]}
            </span>
          </div>
          <div>
            <p className="font-bold text-foreground">What it tests</p>
            <p className="mt-1 text-muted-foreground">{question.whatItTests}</p>
          </div>
          <div>
            <p className="font-bold text-foreground">Strong answer shape</p>
            <p className="mt-1 text-muted-foreground">{question.strongAnswer}</p>
          </div>
          <div className="rounded-xl bg-terracotta/5 p-3 text-muted-foreground">
            <span className="font-bold text-terracotta">Hiring signal: </span>
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
    </div>
  );
}

function McqCheckpoint({ questions }: { questions: InterviewMcq[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
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
    <div className="card-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-terracotta" />
            <h3 className="text-[15px] font-bold">Progressive MCQ checkpoint</h3>
          </div>
          <p className="mt-1 max-w-2xl text-[12px] text-muted-foreground">
            Start with role fundamentals, then work through employer-specific applied, advanced, and
            production scenarios.
          </p>
        </div>
        {submitted && (
          <span className="rounded-full bg-terracotta/10 px-3 py-1.5 text-[11px] font-bold text-terracotta">
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
                    active ? "border-terracotta bg-terracotta/10" : "border-border bg-secondary/40",
                  )}
                >
                  <div
                    className={cn(
                      "mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                      active
                        ? "bg-terracotta text-white"
                        : complete
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {complete ? <Check className="h-3 w-3" /> : level}
                  </div>
                  <p className="mt-1 hidden text-[9px] font-semibold uppercase tracking-wide text-muted-foreground sm:block">
                    {levelLabels[level].replace(/^Level [1-4] Â· /, "")}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-2xl border border-border bg-background/60 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-terracotta">
                Question {currentIndex + 1} of {orderedQuestions.length}
              </span>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                {currentQuestion.difficulty}
              </span>
            </div>
            <h4 className="mt-3 text-[15px] font-bold leading-relaxed">
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
                    onClick={() =>
                      setAnswers((current) => ({ ...current, [currentQuestion.id]: option.id }))
                    }
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left text-[11.5px] transition-colors",
                      correct
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : incorrect
                          ? "border-rose-400 bg-rose-50 text-rose-800"
                          : selected
                            ? "border-terracotta bg-terracotta/10"
                            : "border-border text-muted-foreground hover:border-terracotta/60 hover:bg-muted/40",
                    )}
                  >
                    <span className="mr-1 font-bold uppercase">{option.id}.</span> {option.text}
                  </button>
                );
              })}
            </div>
            {selectedAnswer && (
              <div
                className={cn(
                  "mt-4 rounded-xl border p-3 text-[11px] leading-relaxed",
                  selectedAnswer === currentQuestion.correctOption
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900",
                )}
              >
                <div className="flex items-start gap-2">
                  {selectedAnswer === currentQuestion.correctOption ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  )}
                  <div>
                    <p className="font-bold">
                      {selectedAnswer === currentQuestion.correctOption
                        ? "Correct — strong hiring signal."
                        : "Not quite — here is why."}
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
                className="rounded-xl bg-terracotta text-xs text-primary-foreground hover:bg-terracotta/90"
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
        <div className="mt-5 rounded-2xl border border-terracotta/20 bg-terracotta/5 p-5 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-lg font-bold">Checkpoint complete</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            You scored {score} out of {orderedQuestions.length}. Review each explanation, then try
            again to strengthen weak areas.
          </p>
          <Button
            variant="outline"
            className="mt-5 rounded-xl text-xs"
            onClick={() => {
              setAnswers({});
              setCurrentIndex(0);
              setSubmitted(false);
            }}
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

function InterviewPrepPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const companies = getInterviewCompanies();
  const defaultCompany = user?.applications?.[0]?.company || "";
  const [company, setCompany] = useState(defaultCompany);
  const [customCompany, setCustomCompany] = useState("");
  const [activeTab, setActiveTab] = useState<PrepTab>("overview");
  const [practiced, setPracticed] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [checklist, setChecklist] = useState<string[]>([]);
  const targetRole = user?.goal || user?.role || "Technology role";
  const selectedCompany = company === "__custom__" ? customCompany.trim() : company.trim();
  const intel = buildInterviewIntel(targetRole, selectedCompany);
  const firstQuestion = intel.questions[0];

  const visibleQuestions = useMemo(
    () =>
      activeTab === "overview" || activeTab === "answer_lab"
        ? intel.questions
        : intel.questions.filter((question) => question.category === activeTab),
    [activeTab, intel.questions],
  );
  const readiness = Math.min(100, 42 + practiced.length * 12 + checklist.length * 4);
  const toggleItem = (items: string[], value: string, setter: (next: string[]) => void) => {
    setter(items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
  };

  return (
    <AppLayout
      title="Interview Prep"
      subtitle="Turn your target role into a focused interview practice plan"
    >
      <div className="space-y-4">
        <section className="card-surface overflow-hidden bg-ink text-white">
          <div className="relative p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[24px] border-terracotta/10" />
            <div className="relative flex flex-wrap items-start justify-between gap-6">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-terracotta/20 text-terracotta">
                  <MessageSquareText className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-terracotta">
                    AI interview cockpit
                  </p>
                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">{intel.role}</h2>
                  <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-white/65">
                    {intel.companyTagline}
                  </p>
                </div>
              </div>
              <div className="w-full rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:w-auto sm:min-w-[190px]">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/55">Prep readiness</span>
                  <span className="font-bold text-terracotta">{readiness}%</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-terracotta transition-all"
                    style={{ width: `${readiness}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-white/45">
                  Practice questions to raise your score
                </p>
              </div>
            </div>
            <div className="relative mt-7 flex flex-wrap items-center gap-3">
              <label
                className="text-[11px] font-bold uppercase tracking-wider text-white/55"
                htmlFor="interview-company"
              >
                Target company
              </label>
              <select
                id="interview-company"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                className="w-full max-w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[12px] text-white outline-none sm:w-auto"
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
                  className="w-full max-w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/35 sm:w-auto"
                />
              )}
              {selectedCompany && !intel.companyResearched ? (
                <span className="text-[11px] text-amber-300">
                  “{selectedCompany}” is not researched yet — showing role-based interview prep, not company-specific standards.
                </span>
              ) : (
                <span className="text-[11px] text-white/40">
                  Research-backed prompts, not leaked interview questions
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 sm:px-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-2 text-[11.5px] font-semibold transition-colors",
                  activeTab === tab.id
                    ? "bg-terracotta text-white"
                    : "text-white/55 hover:bg-white/10 hover:text-white",
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
              <div key={label} className="card-surface flex items-start gap-3 p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-[16px] font-black">{value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {activeTab === "mcq_checkpoint" ? (
              <McqCheckpoint key={`${intel.role}:${intel.company}`} questions={intel.mcqs} />
            ) : activeTab === "answer_lab" ? (
              <div className="card-surface p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                    <Mic2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold">Answer lab</h3>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Draft a concise answer, then compare it with the evidence pattern recruiters
                      expect.
                    </p>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl bg-secondary/60 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-terracotta">
                    Prompt
                  </p>
                  <p className="mt-2 text-[14px] font-semibold leading-relaxed">
                    {firstQuestion?.question}
                  </p>
                </div>
                <textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Use: context, decision, evidence, result, reflection..."
                  className="mt-4 min-h-40 w-full resize-y rounded-2xl border border-border bg-card p-4 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-terracotta"
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] text-muted-foreground">
                    {answer.trim().length} characters · Aim for 60 to 90 seconds aloud
                  </p>
                  <Button
                    className="rounded-xl bg-ink text-xs font-bold text-white hover:bg-ink/90"
                    onClick={() =>
                      firstQuestion && toggleItem(practiced, firstQuestion.question, setPracticed)
                    }
                  >
                    {firstQuestion && practiced.includes(firstQuestion.question)
                      ? "Practice logged"
                      : "Log practice"}
                  </Button>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {["Clear situation", "Technical decision", "Proof of outcome"].map((item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-border p-3 text-[11px] font-semibold text-muted-foreground"
                    >
                      <Target className="mb-2 h-4 w-4 text-terracotta" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card-surface p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-bold">
                      {activeTab === "overview"
                        ? "Practice questions"
                        : `${CATEGORY_LABELS[activeTab]} questions`}
                    </h3>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Open a prompt to see the evaluation logic and answer structure.
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                    {visibleQuestions.length} prompts
                  </span>
                </div>
                <div className="mt-5 space-y-2">
                  {visibleQuestions.map((question) => (
                    <QuestionCard
                      key={question.question}
                      question={question}
                      selected={practiced.includes(question.question)}
                      onPractice={() => toggleItem(practiced, question.question, setPracticed)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="card-surface p-5">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-terracotta" />
                <h3 className="text-[14.5px] font-bold">Evidence to bring</h3>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                Use your roadmap work as proof instead of memorising generic answers.
              </p>
              <div className="mt-4 space-y-2">
                {[
                  "Proof project demo link",
                  "Architecture or decision note",
                  "Test or quality evidence",
                  "One measurable outcome",
                ].map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => toggleItem(checklist, item, setChecklist)}
                    className="flex w-full items-center gap-2 text-left text-[11.5px]"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-md border",
                        checklist.includes(item)
                          ? "border-terracotta bg-terracotta text-white"
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
            </div>
            <div className="card-surface p-5">
              <h3 className="text-[14.5px] font-bold">Expected interview stages</h3>
              <div className="mt-4 space-y-3">
                {intel.stages.map((stage, index) => (
                  <div key={stage} className="flex items-start gap-3 text-[12px]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-terracotta/10 text-[10px] font-bold text-terracotta">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed text-muted-foreground">{stage}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-surface bg-terracotta/5 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-terracotta">
                Keep moving
              </p>
              <p className="mt-2 text-[13px] font-semibold leading-relaxed">
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
                <Button
                  className="rounded-xl bg-ink text-[11px] font-bold text-white hover:bg-ink/90"
                  onClick={() => void navigate({ to: "/mentor" })}
                >
                  Ask AI Mentor
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
