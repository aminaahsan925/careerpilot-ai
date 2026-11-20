import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Bell,
  BookOpen,
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
import { PilotSays } from "@/components/mascot/PilotMascot";
import { CompletionCertificate } from "@/components/roadmap/CompletionCertificate";
import { LoopHeader, LoopMotif } from "@/components/roadmap/LoopHeader";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/data/user";
import {
  getPinnedEvents,
  togglePinEvent,
  sendEventReminderNotification,
  type PinnedEvent,
} from "@/lib/push-notifications";
import { getDaysUntil } from "@/data/tech-events";
import { useRoadmapStreak } from "@/data/roadmap-streak";
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
      { title: "Career Roadmap | CareerPilot AI" },
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
/* Level badge colours (Direction 3 toy-bright tokens)                */
/* ------------------------------------------------------------------ */

function levelColor(level: string) {
  switch (level) {
    case "beginner":
      return "border-[var(--d3-leaf)]/40 bg-[var(--d3-leaf)]/15 text-[var(--d3-leaf)]";
    case "intermediate":
      return "border-[var(--d3-mustard)]/50 bg-[var(--d3-mustard)]/20 text-[var(--d3-choco)]";
    case "expert":
      return "border-[var(--d3-flame)]/40 bg-[var(--d3-flame)]/10 text-[var(--d3-flame)]";
    default:
      return "border-[var(--d3-choco)]/15 bg-[var(--d3-paper)] text-[var(--d3-ink)]/70";
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
/* Learning Path Card (tilted collage card)                           */
/* ------------------------------------------------------------------ */

function LearningPathCard({ path, index }: { path: LearningPath; index: number }) {
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Tilt lives on the inner card so the entrance motion and the
          collage tilt stay independent. */}
      <div className={cn("d3-card overflow-hidden", index % 2 === 0 ? "d3-tilt-l" : "d3-tilt-r")}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-[var(--d3-cream)]/60"
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2",
              path.completed
                ? "border-[var(--d3-leaf)] bg-[var(--d3-leaf)] text-white"
                : "border-[var(--d3-choco)]/15 bg-[var(--d3-paper)] text-[var(--d3-ink)]/60",
            )}
          >
            {path.completed ? <Check className="h-4 w-4" /> : <CatIcon className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14.5px] font-bold tracking-[-0.01em] text-[var(--d3-ink)]">
                {path.title}
              </p>
              <span className={cn("d3-chip uppercase", levelColor(path.level))}>
                {path.level}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-[var(--d3-ink)]/65 line-clamp-2">
              {path.description}
            </p>
            {path.outdated_warning && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--d3-choco)]">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[var(--d3-flame)]" />
                {path.outdated_warning}
              </div>
            )}
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--d3-choco)]/10">
                <div
                  className="h-full rounded-full bg-[var(--d3-mustard)] transition-all"
                  style={{
                    width: totalDays > 0 ? `${(completedDays / totalDays) * 100}%` : "0%",
                  }}
                />
              </div>
              <span className="shrink-0 text-xs font-bold text-[var(--d3-ink)]/65">
                {completedDays}/{totalDays || "?"} days
              </span>
            </div>
          </div>
          {expanded ? (
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-[var(--d3-ink)]/50" />
          ) : (
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--d3-ink)]/50" />
          )}
        </button>

        {expanded && dayList.length > 0 && (
          <div className="border-t border-[var(--d3-choco)]/10 px-5 pb-4 pt-3">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--d3-ink)]/55">
              Must Know
            </p>
            {path.must_know.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {path.must_know.map((skill) => (
                  <span
                    key={skill}
                    className="d3-chip border border-[var(--d3-choco)]/15 bg-[var(--d3-cream)] text-[var(--d3-ink)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--d3-ink)]/55">
              Daily Tasks
            </p>
            <div className="space-y-1.5">
              {dayList.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  aria-expanded={selectedDayId === day.id}
                  onClick={() => openDay(day)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-[var(--d3-cream)]",
                    selectedDayId === day.id && "ring-2 ring-[var(--d3-peri)]/50",
                    day.completed
                      ? "bg-[var(--d3-cream)]/70 text-[var(--d3-ink)]/55"
                      : "bg-[var(--d3-paper)] text-[var(--d3-ink)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      day.completed
                        ? "bg-[var(--d3-leaf)] text-white"
                        : "border border-[var(--d3-choco)]/25 text-[var(--d3-ink)]/60",
                    )}
                  >
                    {day.completed ? <Check className="h-3 w-3" /> : day.day_number}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{day.title}</span>
                  <span className="shrink-0 text-xs text-[var(--d3-ink)]/55">
                    {day.estimated_minutes}m
                  </span>
                </button>
              ))}
            </div>

            {selectedDay && (
              <div className="mt-4 rounded-2xl border border-[var(--d3-choco)]/10 bg-[var(--d3-paper)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--d3-flame)]">
                      Day {selectedDay.day_number} · Topic brief
                    </p>
                    <h4 className="mt-1 text-[14px] font-bold text-[var(--d3-ink)]">
                      {selectedDay.title}
                    </h4>
                  </div>
                  <span className="text-xs text-[var(--d3-ink)]/55">
                    {selectedDay.estimated_minutes} minutes
                  </span>
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--d3-ink)]">
                  {selectedDay.what_is_this}
                </p>
                <p className="mt-3 text-[12px] leading-relaxed text-[var(--d3-ink)]/70">
                  {selectedDay.explanation}
                </p>
                <div className="mt-3 rounded-xl bg-[var(--d3-cream)] p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--d3-ink)]/55">
                    How to learn it
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-[var(--d3-ink)]">
                    {selectedDay.how_to_learn}
                  </p>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-[var(--d3-ink)]/70">
                  <span className="font-semibold text-[var(--d3-ink)]">Company signal:</span>{" "}
                  {selectedDay.why_companies_care}
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-[var(--d3-ink)]/70">
                  <span className="font-semibold text-[var(--d3-ink)]">Build:</span>{" "}
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
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--d3-peri)]/40 px-2.5 py-1 text-xs font-medium text-[var(--d3-peri)] transition-colors hover:bg-[var(--d3-peri)]/10"
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
                    className="mt-4 rounded-xl border-2 border-[var(--d3-choco)] bg-[var(--d3-mustard)] font-bold text-[var(--d3-choco)] shadow-[3px_3px_0_var(--d3-choco)] hover:bg-[var(--d3-gold)]"
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
                  <div className="mt-4 border-t border-[var(--d3-choco)]/10 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--d3-flame)]">
                          Role-specific checkpoint
                        </p>
                        <p className="mt-1 text-[12px] text-[var(--d3-ink)]/65">
                          Pass at 70% to unlock the next day.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuizDayId("")}
                        className="text-xs font-medium text-[var(--d3-ink)]/60 hover:text-[var(--d3-ink)]"
                      >
                        Close
                      </button>
                    </div>
                    {questionsLoading ? (
                      <div className="mt-3 h-20 animate-pulse rounded-xl bg-[var(--d3-cream)]" />
                    ) : questions.length === 0 ? (
                      <p className="mt-3 rounded-xl bg-[var(--d3-mustard)]/15 p-3 text-[12px] text-[var(--d3-choco)]">
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
                            <div
                              key={question.id}
                              className="rounded-xl border border-[var(--d3-choco)]/10 p-3"
                            >
                              <p className="text-[12.5px] font-semibold leading-relaxed text-[var(--d3-ink)]">
                                {index + 1}. {question.question}
                              </p>
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                {options.map(([key, label]) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                      if (!quizResult)
                                        setAnswers((current) => ({
                                          ...current,
                                          [question.id]: key,
                                        }));
                                    }}
                                    className={cn(
                                      "rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                                      quizResult?.results.find(
                                        (result) => result.questionId === question.id,
                                      )?.correctOption === key
                                        ? "border-[var(--d3-leaf)] bg-[var(--d3-leaf)]/10 text-[var(--d3-ink)]"
                                        : quizResult?.results.find(
                                              (result) => result.questionId === question.id,
                                            )?.selectedOption === key
                                          ? "border-[var(--d3-flame)] bg-[var(--d3-flame)]/10 text-[var(--d3-ink)]"
                                          : answers[question.id] === key
                                            ? "border-[var(--d3-peri)] bg-[var(--d3-peri)]/10 text-[var(--d3-ink)]"
                                            : "border-[var(--d3-choco)]/15 text-[var(--d3-ink)]/70 hover:bg-[var(--d3-cream)]",
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
                                        "mt-3 rounded-xl p-3 text-xs leading-relaxed",
                                        result.correct
                                          ? "bg-[var(--d3-leaf)]/10 text-[var(--d3-ink)]"
                                          : "bg-[var(--d3-flame)]/10 text-[var(--d3-ink)]",
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
                              <p className="mt-2 text-xs text-[var(--d3-ink)]/55">
                                {question.company_relevance}
                              </p>
                            </div>
                          );
                        })}
                        {!quizResult && (
                          <Button
                            size="sm"
                            className="rounded-xl border-2 border-[var(--d3-choco)] bg-[var(--d3-mustard)] font-bold text-[var(--d3-choco)] shadow-[3px_3px_0_var(--d3-choco)] hover:bg-[var(--d3-gold)]"
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
                            className="ml-2 rounded-xl text-xs"
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
                      "mt-3 flex items-center gap-2 rounded-xl p-3 text-[12px]",
                      quizResult.passed
                        ? "bg-[var(--d3-leaf)]/10 text-[var(--d3-ink)]"
                        : "bg-[var(--d3-mustard)]/15 text-[var(--d3-ink)]",
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
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

function RoadmapPage() {
  const { data: user } = useCurrentUser();
  const { data: paths, isLoading, error: pathsError, refetch: refetchPaths } = useLearningPaths();
  const { data: progress } = useRoadmapProgress();
  const {
    data: streak,
    isLoading: streakLoading,
    isError: streakError,
  } = useRoadmapStreak();
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
      subtitle="One day at a time, all the way around the loop"
    >
      {/* Cream ground: bleeds to the content column edges (AppLayout owns the
          outer padding, so negative margins reclaim it). */}
      <div className="-mx-4 -mb-6 -mt-6 bg-[var(--d3-cream)] px-4 pb-6 pt-6 sm:-mx-6 lg:-mx-8 lg:-mb-8 lg:pb-8">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            {/* Friendly loop header (Loop pattern): real streak, encouraging copy. */}
            <LoopHeader
              goal={user?.goal ?? "Your goal"}
              streak={streak}
              streakLoading={streakLoading}
              streakError={streakError}
              completedPaths={completedPaths}
              totalPaths={totalPaths}
              completedDays={completedDays}
              totalDays={totalDays}
              overallProgress={overallProgress}
            />

            {/* Pinned Tech Events & Hackathon Milestones */}
            {pinnedEvents.length > 0 && (
              <div className="d3-card p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--d3-flame)]/15 text-[var(--d3-flame)]">
                      <Flame className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--d3-ink)]">
                        Target Hackathons & Event Milestones
                      </h3>
                      <p className="text-xs text-[var(--d3-ink)]/60">
                        Competitions and hackathons pinned to your active Career Roadmap.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/events"
                    className="shrink-0 text-xs font-semibold text-[var(--d3-flame)] hover:underline"
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
                        className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--d3-choco)]/10 bg-[var(--d3-paper)] p-4 transition-all hover:border-[var(--d3-flame)]/30"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-[var(--d3-flame)]/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-[var(--d3-flame)]">
                              {evt.eventType}
                            </span>
                            <span className="text-xs font-medium text-[var(--d3-ink)]/60">
                              {daysLeft > 0 ? `in ${daysLeft} days` : "Event active"}
                            </span>
                          </div>
                          <h4 className="truncate text-xs font-bold text-[var(--d3-ink)]">
                            {evt.title}
                          </h4>
                          <p className="flex items-center gap-1 truncate text-xs text-[var(--d3-ink)]/60">
                            <MapPin className="h-3 w-3 shrink-0 text-[var(--d3-flame)]" />
                            <span className="truncate">{evt.city}</span> ·{" "}
                            <span className="truncate">{evt.organizer}</span>
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const sent = await sendEventReminderNotification(evt, daysLeft);
                              if (sent) {
                                toast.success(`Reminder shown for "${evt.title}".`);
                              } else {
                                toast.info(
                                  `Could not show a reminder for "${evt.title}". Allow browser alerts and try again.`,
                                );
                              }
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--d3-choco)]/15 text-[var(--d3-ink)]/60 transition-colors hover:border-[var(--d3-flame)]/40 hover:text-[var(--d3-flame)]"
                            title="Send / Test Event Reminder"
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </button>
                          <a
                            href={evt.eventUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--d3-choco)]/15 text-[var(--d3-ink)]/60 transition-colors hover:border-[var(--d3-flame)]/40 hover:text-[var(--d3-flame)]"
                            title="Open Event Website"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemovePinnedEvent(evt)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--d3-ink)]/60 transition-colors hover:bg-[var(--d3-flame)]/10 hover:text-[var(--d3-flame)]"
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
              <h3 className="d3-display pt-2 text-xl font-bold text-[var(--d3-ink)]">Learning Paths</h3>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="d3-card h-28 animate-pulse" />
                  ))}
                </div>
              ) : pathsError ? (
                <div className="d3-card p-6 text-center sm:p-8">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--d3-flame)]/10 text-[var(--d3-flame)]">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <h4 className="d3-display mt-4 text-lg font-bold text-[var(--d3-ink)]">
                    Your learning paths couldn&apos;t be loaded
                  </h4>
                  <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-[var(--d3-ink)]/65">
                    {pathsError instanceof Error
                      ? pathsError.message
                      : "Something went wrong while loading your roadmap."}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-5 rounded-xl font-bold"
                    onClick={() => void refetchPaths()}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Try again
                  </Button>
                </div>
              ) : pathList.length > 0 ? (
                pathList.map((path, index) => (
                  <LearningPathCard key={path.id} path={path} index={index} />
                ))
              ) : (
                <div className="d3-card relative overflow-hidden p-5 sm:p-7">
                  <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.85fr)] md:gap-8">
                    <div className="text-center md:text-left">
                      <span className="d3-chip border border-[var(--d3-mustard)]/50 bg-[var(--d3-mustard)]/20 uppercase tracking-[0.14em] text-[var(--d3-choco)]">
                        Your next chapter
                      </span>
                      <h4 className="d3-display mt-3 text-xl font-bold text-[var(--d3-ink)] sm:text-2xl">
                        Turn your goal into a plan you can follow.
                      </h4>
                      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-[var(--d3-ink)]/65 md:mx-0">
                        No learning paths generated yet. Build a roadmap based on your profile,
                        target role, and market gaps.
                      </p>
                      <Button
                        className="mt-5 rounded-xl border-2 border-[var(--d3-choco)] bg-[var(--d3-mustard)] font-bold text-[var(--d3-choco)] shadow-[3px_3px_0_var(--d3-choco)] hover:bg-[var(--d3-gold)]"
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

                    {/* The loop + Pilot, drawn in code: no stock illustration.
                        PilotSays renders the mascot plus its bubble. */}
                    <div className="relative mx-auto w-full max-w-[330px] overflow-hidden rounded-2xl border-2 border-[var(--d3-choco)] bg-[var(--d3-choco)] p-5">
                      <LoopMotif className="w-full" />
                      <div className="mt-2 flex justify-center">
                        <PilotSays mood="encouraging" size={72} className="w-full max-w-[280px]">
                          Your loop starts with one day.
                        </PilotSays>
                      </div>
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
                  className="rounded-xl text-[12.5px] text-[var(--d3-ink)]/65"
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
            <div className="d3-card p-5">
              <h3 className="text-[14.5px] font-bold text-[var(--d3-ink)]">Progress</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[var(--d3-ink)]/60">Learning Paths</span>
                  <span className="font-semibold text-[var(--d3-ink)]">
                    {completedPaths}/{totalPaths}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[var(--d3-ink)]/60">Days Completed</span>
                  <span className="font-semibold text-[var(--d3-ink)]">
                    {completedDays}/{totalDays || "?"}
                  </span>
                </div>
                {progress?.currentLevel && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[var(--d3-ink)]/60">Current Level</span>
                    <span
                      className={cn("d3-chip capitalize", levelColor(progress.currentLevel))}
                    >
                      {progress.currentLevel}
                    </span>
                  </div>
                )}
                {progress?.mcqsPassed != null && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[var(--d3-ink)]/60">MCQs Passed</span>
                    <span className="font-semibold text-[var(--d3-ink)]">{progress.mcqsPassed}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Measurable impact: derived from completed work and assessment history. */}
            <div className="d3-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[14.5px] font-bold text-[var(--d3-ink)]">Proof of progress</h3>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--d3-flame)]">
                  Evidence
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--d3-sky)]/15 p-3">
                  <p className="text-xs text-[var(--d3-ink)]/60">Completion rate</p>
                  <p className="mt-1 text-lg font-bold text-[var(--d3-ink)]">
                    {progress?.completionRate ?? 0}%
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--d3-lime)]/20 p-3">
                  <p className="text-xs text-[var(--d3-ink)]/60">Avg. checkpoint</p>
                  <p className="mt-1 text-lg font-bold text-[var(--d3-ink)]">
                    {progress?.averageMcqScore != null ? `${progress.averageMcqScore}%` : "Not yet"}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--d3-mustard)]/20 p-3">
                  <p className="text-xs text-[var(--d3-ink)]/60">Learning time</p>
                  <p className="mt-1 text-lg font-bold text-[var(--d3-ink)]">
                    {progress?.estimatedMinutesCompleted
                      ? `${Math.round(progress.estimatedMinutesCompleted / 60)}h`
                      : "0h"}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--d3-peri)]/15 p-3">
                  <p className="text-xs text-[var(--d3-ink)]/60">Checkpoints</p>
                  <p className="mt-1 text-lg font-bold text-[var(--d3-ink)]">
                    {progress?.mcqsPassed ?? 0}/{progress?.mcqsAttempted ?? 0}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[var(--d3-ink)]/60">
                Based on completed roadmap days, estimated work time, checkpoint scores, and
                recorded assessment attempts.
              </p>
            </div>

            {/* Next Action */}
            <div className="d3-tilt-r rounded-3xl border-2 border-[var(--d3-navy)] bg-[var(--d3-navy)] p-5 text-[var(--d3-cream)] shadow-[0_10px_30px_rgba(20,20,80,0.25)]">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--d3-gold)]">
                Next Action
              </p>
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
      </div>
    </AppLayout>
  );
}
