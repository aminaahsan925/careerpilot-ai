import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ExternalLink,
  Flame,
  FolderClosed,
  Loader2,
  MapPin,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app/AppLayout";
import { CompletionCertificate } from "@/components/roadmap/CompletionCertificate";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/data/user";
import {
  getPinnedEvents,
  togglePinEvent,
  sendEventReminderNotification,
  type PinnedEvent,
} from "@/lib/push-notifications";
import { getDaysUntil } from "@/data/tech-events";
import {
  useDailyWork,
  useClaimDayComplete,
  useGenerateRoadmapV2,
  useLearningPaths,
  useMcqsForDay,
  useRoadmapProgress,
  useSubmitMcq,
  type DailyWork,
  type LearningPath,
  type McqAttemptResult,
} from "@/data/roadmap-v2";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({
    meta: [
      { title: "Career Roadmap — CareerPilot AI" },
      {
        name: "description",
        content:
          "A personalised, day-by-day execution plan toward your target role with learning paths, daily tasks and MCQ gates.",
      },
    ],
  }),
  component: RoadmapPage,
});

/* ------------------------------------------------------------------ */
/* Level badge colours                                                */
/* ------------------------------------------------------------------ */

function levelColor(level: string) {
  switch (level) {
    case "beginner":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "intermediate":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "expert":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-secondary text-muted-foreground border-border";
  }
}

function categoryIcon(category: string) {
  switch (category) {
    case "core_skill":
      return Target;
    case "emerging_tech":
      return Sparkles;
    case "problem_solving":
      return BookOpen;
    case "deployment":
      return FolderClosed;
    default:
      return BookOpen;
  }
}

/* ------------------------------------------------------------------ */
/* Learning Path Card                                                 */
/* ------------------------------------------------------------------ */

function LearningPathCard({ path }: { path: LearningPath }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [quizDayId, setQuizDayId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<McqAttemptResult | null>(null);
  // BUG FIX (2026-10-30): days were only fetched when a card was expanded,
  // so every collapsed card showed "0/? days" while the header said 0/12.
  // Fetch per-path days always (cached by React Query) so collapsed totals
  // are real.
  const { data: days } = useDailyWork(path.id);
  const dayList = (Array.isArray(days) ? days : []) as DailyWork[];
  const completedDays = dayList.filter((d) => d.completed).length;
  const totalDays = dayList.length;
  const CatIcon = categoryIcon(path.category);
  const selectedDay = dayList.find((day) => day.id === selectedDayId) ?? null;
  const { data: questions = [], isLoading: questionsLoading } = useMcqsForDay(quizDayId);
  const claimDay = useClaimDayComplete();
  const submitMcq = useSubmitMcq();

  const openDay = (day: DailyWork) => {
    setSelectedDayId((current) => (current === day.id ? null : day.id));
    setQuizDayId("");
    setQuizResult(null);
    setAnswers({});
  };

  const startMcq = (day: DailyWork) => {
    claimDay.mutate(
      { dayId: day.id },
      {
        onSuccess: (result) => {
          if (result.needsMcq) {
            setQuizDayId(day.id);
            setQuizResult(null);
            setAnswers({});
          }
        },
        onError: (error) => toast.error(error.message || "Could not open the assessment."),
      },
    );
  };

  const submitAssessment = () => {
    if (!quizDayId || questions.some((question) => !answers[question.id])) {
      toast.error("Answer every question before submitting the assessment.");
      return;
    }

    submitMcq.mutate(
      {
        dayId: quizDayId,
        answers: questions.map((question) => ({
          questionId: question.id,
          selectedOption: answers[question.id] ?? "",
        })),
      },
      {
        onSuccess: (result) => {
          setQuizResult(result);
          if (result.passed) {
            toast.success(`Assessment passed with ${result.score}%. Day complete.`);
          } else {
            toast.error(`You scored ${result.score}%. Review the topic and try again.`);
          }
        },
        onError: (error) => toast.error(error.message || "Could not grade the assessment."),
      },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-surface overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-muted/30"
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            path.completed
              ? "border-terracotta bg-terracotta text-white"
              : "border-border bg-secondary text-muted-foreground",
          )}
        >
          {path.completed ? <Check className="h-4 w-4" /> : <CatIcon className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14.5px] font-bold tracking-[-0.01em] text-foreground">
              {path.title}
            </p>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase",
                levelColor(path.level),
              )}
            >
              {path.level}
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground line-clamp-2">
            {path.description}
          </p>
          {path.outdated_warning && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {path.outdated_warning}
            </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-terracotta transition-all"
                style={{
                  width: totalDays > 0 ? `${(completedDays / totalDays) * 100}%` : "0%",
                }}
              />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
              {completedDays}/{totalDays || "?"} days
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && dayList.length > 0 && (
        <div className="border-t border-border px-5 pb-4 pt-3">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Must Know
          </p>
          {path.must_know.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {path.must_know.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Daily Tasks
          </p>
          <div className="space-y-1.5">
            {dayList.map((day) => (
              <div
                key={day.id}
                role="button"
                tabIndex={0}
                onClick={() => openDay(day)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") openDay(day);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] transition-colors hover:bg-muted/50",
                  selectedDayId === day.id && "ring-1 ring-terracotta/40",
                  day.completed ? "bg-muted/40 text-muted-foreground" : "bg-card text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    day.completed
                      ? "bg-terracotta text-white"
                      : "border border-border text-muted-foreground",
                  )}
                >
                  {day.completed ? <Check className="h-3 w-3" /> : day.day_number}
                </span>
                <span className="min-w-0 flex-1 truncate">{day.title}</span>
                <span className="shrink-0 text-[10.5px] text-muted-foreground">
                  {day.estimated_minutes}m
                </span>
              </div>
            ))}
          </div>

          {selectedDay && (
            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-terracotta">
                    Day {selectedDay.day_number} · Topic brief
                  </p>
                  <h4 className="mt-1 text-[14px] font-bold text-foreground">
                    {selectedDay.title}
                  </h4>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {selectedDay.estimated_minutes} minutes
                </span>
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-foreground">
                {selectedDay.what_is_this}
              </p>
              <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                {selectedDay.explanation}
              </p>
              <div className="mt-3 rounded-lg bg-secondary/60 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  How to learn it
                </p>
                <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-foreground">
                  {selectedDay.how_to_learn}
                </p>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Company signal:</span>{" "}
                {selectedDay.why_companies_care}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Build:</span>{" "}
                {selectedDay.hands_on_task}
              </p>
              {selectedDay.curated_links.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedDay.curated_links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-terracotta transition-colors hover:bg-terracotta/10"
                    >
                      {link.label}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              )}
              {!selectedDay.completed && !quizDayId && (
                <Button
                  size="sm"
                  className="mt-4 rounded-lg bg-terracotta text-primary-foreground hover:bg-terracotta/90"
                  disabled={claimDay.isPending}
                  onClick={() => startMcq(selectedDay)}
                >
                  {claimDay.isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CircleCheck className="mr-2 h-3.5 w-3.5" />
                  )}
                  I&apos;ve done this, take MCQ
                </Button>
              )}

              {quizDayId === selectedDay.id && (
                <div className="mt-4 border-t border-border pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-terracotta">
                        Role-specific checkpoint
                      </p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        Pass at 70% to unlock the next day.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuizDayId("")}
                      className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      Close
                    </button>
                  </div>
                  {questionsLoading ? (
                    <div className="mt-3 h-20 animate-pulse rounded-lg bg-secondary" />
                  ) : questions.length === 0 ? (
                    <p className="mt-3 rounded-lg bg-amber-50 p-3 text-[12px] text-amber-800">
                      This path has no checkpoint questions yet. Regenerate the roadmap to create
                      its company-specific assessment.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {questions.map((question, index) => {
                        const options = [
                          ["a", question.option_a],
                          ["b", question.option_b],
                          ["c", question.option_c],
                          ["d", question.option_d],
                        ] as const;
                        return (
                          <div key={question.id} className="rounded-lg border border-border p-3">
                            <p className="text-[12.5px] font-semibold leading-relaxed text-foreground">
                              {index + 1}. {question.question}
                            </p>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              {options.map(([key, label]) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => {
                                    if (!quizResult)
                                      setAnswers((current) => ({ ...current, [question.id]: key }));
                                  }}
                                  className={cn(
                                    "rounded-lg border px-3 py-2 text-left text-[11.5px] transition-colors",
                                    quizResult?.results.find(
                                      (result) => result.questionId === question.id,
                                    )?.correctOption === key
                                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                      : quizResult?.results.find(
                                            (result) => result.questionId === question.id,
                                          )?.selectedOption === key
                                        ? "border-rose-400 bg-rose-50 text-rose-800"
                                        : answers[question.id] === key
                                          ? "border-terracotta bg-terracotta/10 text-foreground"
                                          : "border-border text-muted-foreground hover:bg-muted/40",
                                  )}
                                >
                                  <span className="mr-1 font-bold uppercase">{key}.</span> {label}
                                </button>
                              ))}
                            </div>
                            {quizResult &&
                              (() => {
                                const result = quizResult.results.find(
                                  (item) => item.questionId === question.id,
                                );
                                if (!result) return null;
                                return (
                                  <div
                                    className={cn(
                                      "mt-3 rounded-lg p-3 text-[11px] leading-relaxed",
                                      result.correct
                                        ? "bg-emerald-50 text-emerald-800"
                                        : "bg-rose-50 text-rose-800",
                                    )}
                                  >
                                    <p className="font-bold">
                                      {result.correct
                                        ? "Correct answer"
                                        : `Correct answer: ${result.correctOption.toUpperCase()}`}
                                    </p>
                                    <p className="mt-1">{result.explanation}</p>
                                  </div>
                                );
                              })()}
                            <p className="mt-2 text-[10.5px] text-muted-foreground">
                              {question.company_relevance}
                            </p>
                          </div>
                        );
                      })}
                      {!quizResult && (
                        <Button
                          size="sm"
                          className="rounded-lg bg-terracotta text-primary-foreground hover:bg-terracotta/90"
                          disabled={submitMcq.isPending}
                          onClick={submitAssessment}
                        >
                          {submitMcq.isPending ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-3.5 w-3.5" />
                          )}
                          Submit assessment
                        </Button>
                      )}
                      {quizResult && !quizResult.passed && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-2 rounded-lg text-[11px]"
                          onClick={() => {
                            setQuizResult(null);
                            setAnswers({});
                          }}
                        >
                          <RotateCcw className="mr-2 h-3.5 w-3.5" /> Try again
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {quizResult && (
                <div
                  className={cn(
                    "mt-3 flex items-center gap-2 rounded-lg p-3 text-[12px]",
                    quizResult.passed
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-amber-50 text-amber-800",
                  )}
                >
                  {quizResult.passed ? (
                    <Check className="h-4 w-4 shrink-0" />
                  ) : (
                    <RotateCcw className="h-4 w-4 shrink-0" />
                  )}
                  Score: {quizResult.score}% ({quizResult.correctCount}/{quizResult.totalQuestions}
                  ).
                  {quizResult.passed ? " Day unlocked." : " Review the topic and try again."}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

function RoadmapPage() {
  const { data: user } = useCurrentUser();
  const { data: paths, isLoading } = useLearningPaths();
  const { data: progress } = useRoadmapProgress();
  const generateRoadmap = useGenerateRoadmapV2();
  const [pinnedEvents, setPinnedEvents] = useState<PinnedEvent[]>([]);

  useEffect(() => {
    setPinnedEvents(getPinnedEvents());
  }, []);

  const handleRemovePinnedEvent = (event: PinnedEvent) => {
    togglePinEvent(event);
    setPinnedEvents(getPinnedEvents());
    toast.info(`"${event.title}" removed from your roadmap targets.`);
  };

  const pathList = (paths ?? []) as LearningPath[];
  const totalPaths = progress?.totalPaths ?? pathList.length;
  const completedPaths = progress?.completedPaths ?? pathList.filter((p) => p.completed).length;
  const totalDays = progress?.totalDays ?? 0;
  const completedDays = progress?.completedDays ?? 0;
  const overallProgress = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  return (
    <AppLayout
      title="Career Roadmap"
      subtitle="A guided path from where you are to where you're going"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {/* Hero */}
          <div className="card-surface overflow-hidden bg-ink p-8 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-terracotta">
              Current Goal
            </p>
            <h2 className="editorial-title mt-3 text-[clamp(1.8rem,4vw,2.8rem)]">
              {user?.goal ?? "Your goal"}
            </h2>
            <div className="mt-6 flex items-center gap-4">
              <span className="h-1.5 max-w-[420px] flex-1 overflow-hidden rounded-full bg-white/15">
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: `${overallProgress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="block h-full rounded-full bg-terracotta"
                />
              </span>
              <span className="text-[13px] font-semibold">{overallProgress}% complete</span>
            </div>
            {totalPaths > 0 && (
              <p className="mt-3 text-[12px] text-white/50">
                {completedPaths}/{totalPaths} paths · {completedDays}/{totalDays} days
              </p>
            )}
          </div>

          {/* Pinned Tech Events & Hackathon Milestones */}
          {pinnedEvents.length > 0 && (
            <div className="card-surface rounded-3xl border border-terracotta/20 bg-gradient-to-br from-card via-card to-terracotta/5 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-terracotta/15 text-terracotta">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Target Hackathons & Event Milestones
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Competitions and hackathons pinned to your active Career Roadmap.
                    </p>
                  </div>
                </div>
                <Link
                  to="/events"
                  className="text-xs font-semibold text-terracotta hover:underline"
                >
                  Browse events →
                </Link>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {pinnedEvents.map((evt) => {
                  const daysLeft = getDaysUntil(evt.eventDate);
                  return (
                    <div
                      key={evt.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs hover:border-terracotta/30 transition-all"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-terracotta/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-terracotta">
                            {evt.eventType}
                          </span>
                          <span className="text-[10.5px] font-medium text-muted-foreground">
                            {daysLeft > 0 ? `in ${daysLeft} days` : "Event active"}
                          </span>
                        </div>
                        <h4 className="truncate text-xs font-bold text-foreground">
                          {evt.title}
                        </h4>
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                          <MapPin className="h-3 w-3 text-terracotta shrink-0" />
                          <span className="truncate">{evt.city}</span> · <span className="truncate">{evt.organizer}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            const sent = await sendEventReminderNotification(evt, daysLeft);
                            if (sent) {
                              toast.success(`Reminder alert sent for "${evt.title}"!`);
                            } else {
                              toast.info(`Reminder saved for "${evt.title}". Ensure browser alerts are allowed.`);
                            }
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-terracotta/40 hover:text-terracotta transition-colors"
                          title="Send / Test Event Reminder"
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={evt.eventUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-terracotta/40 hover:text-terracotta transition-colors"
                          title="Open Event Website"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemovePinnedEvent(evt)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Remove from Roadmap"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Learning Paths */}
          <div className="space-y-3">
            <h3 className="text-[14.5px] font-bold">Learning Paths</h3>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="card-surface h-28 animate-pulse" />
                ))}
              </div>
            ) : pathList.length > 0 ? (
              pathList.map((path) => <LearningPathCard key={path.id} path={path} />)
            ) : (
              <div className="card-surface relative overflow-hidden border-terracotta/15 bg-gradient-to-br from-card via-card to-terracotta/[0.06] p-5 sm:p-7">
                <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-terracotta/10 blur-3xl" />
                <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.85fr)] md:gap-8">
                  <div className="text-center md:text-left">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-terracotta/20 bg-terracotta/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-terracotta">
                      <Sparkles className="h-3 w-3" /> Your next chapter
                    </span>
                    <h4 className="mt-3 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      Turn your goal into a plan you can follow.
                    </h4>
                    <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground md:mx-0">
                      No learning paths generated yet. Build a roadmap based on your profile, target
                      role, and market gaps.
                    </p>
                    <Button
                      className="mt-5 rounded-xl bg-terracotta text-primary-foreground shadow-lift hover:bg-terracotta/90"
                      disabled={generateRoadmap.isPending}
                      onClick={() =>
                        generateRoadmap.mutate(undefined, {
                          onSuccess: (result) => {
                            if (result.success) {
                              toast.success(
                                `Roadmap generated with ${result.pathCount} learning paths!`,
                              );
                            } else {
                              toast.error(result.error ?? "Failed to generate roadmap.");
                            }
                          },
                          onError: (err) =>
                            toast.error(err.message || "Failed to generate roadmap."),
                        })
                      }
                    >
                      {generateRoadmap.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Roadmap...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" /> Generate Roadmap
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="relative mx-auto w-full max-w-[330px] overflow-hidden rounded-2xl border border-terracotta/15 bg-white shadow-card">
                    <img
                      src="/careerpilot-learning-illustration.png"
                      alt="Student learning career skills on a laptop"
                      className="h-auto w-full object-contain"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Regenerate button (shown when paths exist) */}
          {pathList.length > 0 && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                className="rounded-xl text-[12.5px] text-muted-foreground"
                disabled={generateRoadmap.isPending}
                onClick={() =>
                  generateRoadmap.mutate(undefined, {
                    onSuccess: (result) => {
                      if (result.success) {
                        toast.success(`Roadmap regenerated with ${result.pathCount} paths!`);
                      } else {
                        toast.error(result.error ?? "Failed to regenerate roadmap.");
                      }
                    },
                    onError: (err) => toast.error(err.message || "Failed to regenerate roadmap."),
                  })
                }
              >
                {generateRoadmap.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-3.5 w-3.5" /> Regenerate Roadmap
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Progress Summary */}
          <div className="card-surface p-5">
            <h3 className="text-[14.5px] font-bold">Progress</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Learning Paths</span>
                <span className="font-semibold">
                  {completedPaths}/{totalPaths}
                </span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Days Completed</span>
                <span className="font-semibold">
                  {completedDays}/{totalDays || "—"}
                </span>
              </div>
              {progress?.currentLevel && (
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Current Level</span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
                      levelColor(progress.currentLevel),
                    )}
                  >
                    {progress.currentLevel}
                  </span>
                </div>
              )}
              {progress?.mcqsPassed != null && (
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">MCQs Passed</span>
                  <span className="font-semibold">{progress.mcqsPassed}</span>
                </div>
              )}
            </div>
          </div>

          {/* Measurable impact: derived from completed work and assessment history. */}
          <div className="card-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[14.5px] font-bold">Proof of progress</h3>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-terracotta">
                Evidence
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-[10px] text-muted-foreground">Completion rate</p>
                <p className="mt-1 text-lg font-bold">{progress?.completionRate ?? 0}%</p>
              </div>
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-[10px] text-muted-foreground">Avg. checkpoint</p>
                <p className="mt-1 text-lg font-bold">
                  {progress?.averageMcqScore != null ? `${progress.averageMcqScore}%` : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-[10px] text-muted-foreground">Learning time</p>
                <p className="mt-1 text-lg font-bold">
                  {progress?.estimatedMinutesCompleted
                    ? `${Math.round(progress.estimatedMinutesCompleted / 60)}h`
                    : "0h"}
                </p>
              </div>
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-[10px] text-muted-foreground">Checkpoints</p>
                <p className="mt-1 text-lg font-bold">
                  {progress?.mcqsPassed ?? 0}/{progress?.mcqsAttempted ?? 0}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[10.5px] leading-relaxed text-muted-foreground">
              Based on completed roadmap days, estimated work time, checkpoint scores, and recorded
              assessment attempts.
            </p>
          </div>

          {/* Next Action */}
          <div className="card-surface bg-ink p-5 text-white">
            <p className="text-[11px] uppercase tracking-[0.18em] text-terracotta">Next Action</p>
            <p className="mt-2 text-[14px] font-semibold leading-snug">
              {pathList.length > 0
                ? (pathList.find((p) => !p.completed)?.title ?? "All paths complete!")
                : "Generate a roadmap after running your diagnosis"}
            </p>
          </div>

          <CompletionCertificate
            studentName={user?.fullName ?? "CareerPilot student"}
            targetRole={user?.goal ?? user?.role ?? "your target role"}
            targetCompany={user?.applications?.[0]?.company ?? null}
            completedPaths={completedPaths}
            totalPaths={totalPaths}
            completedDays={completedDays}
            totalDays={totalDays}
            unlocked={
              totalPaths > 0 &&
              totalDays > 0 &&
              completedPaths >= totalPaths &&
              completedDays >= totalDays
            }
          />
        </div>
      </div>
    </AppLayout>
  );
}
