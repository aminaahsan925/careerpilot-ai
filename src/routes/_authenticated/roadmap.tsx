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
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import { CompletionCertificate } from "@/components/roadmap/CompletionCertificate";
import { RoadmapHeader } from "@/components/roadmap/RoadmapHeader";
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
/* Level badge colours (Round 3 tokens)                               */
/* ------------------------------------------------------------------ */

function levelColor(level: string) {
  switch (level) {
    case "beginner":
      return "border-cp-lime2/40 bg-cp-lime2/15 text-cp-lime2";
    case "intermediate":
      return "border-cp-lime/50 bg-cp-lime/20 text-cp-paper";
    case "expert":
      return "border-cp-ember/40 bg-cp-ember/10 text-cp-ember";
    default:
      return "border-cp-paper/15 bg-cp-panel text-cp-paper/70";
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
/* Learning Path Card (spotlight card)                                */
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <SpotlightCard className="card-surface overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-cp-paper/5/60"
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2",
              path.completed
                ? "border-cp-lime2 bg-cp-lime2 text-cp-ink"
                : "border-cp-paper/15 bg-cp-panel text-cp-paper/60",
            )}
          >
            {path.completed ? <Check className="h-4 w-4" /> : <CatIcon className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14.5px] font-bold tracking-[-0.01em] text-cp-paper">
                {path.title}
              </p>
              <span className={cn("cp-chip uppercase", levelColor(path.level))}>
                {path.level}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-cp-paper/65 line-clamp-2">
              {path.description}
            </p>
            {path.outdated_warning && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-cp-paper">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-cp-ember" />
                {path.outdated_warning}
              </div>
            )}
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-cp-ink/10">
                <div
                  className="h-full rounded-full bg-cp-lime transition-all"
                  style={{
                    width: totalDays > 0 ? `${(completedDays / totalDays) * 100}%` : "0%",
                  }}
                />
              </div>
              <span className="shrink-0 text-xs font-bold text-cp-paper/65">
                {completedDays}/{totalDays || "?"} days
              </span>
            </div>
          </div>
          {expanded ? (
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-cp-paper/50" />
          ) : (
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-cp-paper/50" />
          )}
        </button>

        {expanded && dayList.length > 0 && (
          <div className="border-t border-cp-paper/10 px-5 pb-4 pt-3">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-cp-paper/55">
              Must Know
            </p>
            {path.must_know.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {path.must_know.map((skill) => (
                  <span
                    key={skill}
                    className="cp-chip border border-cp-paper/15 bg-cp-ink text-cp-paper"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-cp-paper/55">
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
                    "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-cp-paper/5",
                    selectedDayId === day.id && "ring-2 ring-cp-lime/50",
                    day.completed
                      ? "bg-cp-ink/70 text-cp-paper/55"
                      : "bg-cp-panel text-cp-paper",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      day.completed
                        ? "bg-cp-lime2 text-cp-ink"
                        : "border border-cp-paper/25 text-cp-paper/60",
                    )}
                  >
                    {day.completed ? <Check className="h-3 w-3" /> : day.day_number}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{day.title}</span>
                  <span className="shrink-0 text-xs text-cp-paper/55">
                    {day.estimated_minutes}m
                  </span>
                </button>
              ))}
            </div>

            {selectedDay && (
              <div className="mt-4 rounded-2xl border border-cp-paper/10 bg-cp-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-cp-ember">
                      Day {selectedDay.day_number} · Topic brief
                    </p>
                    <h4 className="mt-1 text-[14px] font-bold text-cp-paper">
                      {selectedDay.title}
                    </h4>
                  </div>
                  <span className="text-xs text-cp-paper/55">
                    {selectedDay.estimated_minutes} minutes
                  </span>
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-cp-paper">
                  {selectedDay.what_is_this}
                </p>
                <p className="mt-3 text-[12px] leading-relaxed text-cp-paper/70">
                  {selectedDay.explanation}
                </p>
                <div className="mt-3 rounded-xl bg-cp-ink p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-cp-paper/55">
                    How to learn it
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-cp-paper">
                    {selectedDay.how_to_learn}
                  </p>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-cp-paper/70">
                  <span className="font-semibold text-cp-paper">Company signal:</span>{" "}
                  {selectedDay.why_companies_care}
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-cp-paper/70">
                  <span className="font-semibold text-cp-paper">Build:</span>{" "}
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
                        className="inline-flex items-center gap-1 rounded-full border border-cp-stone/40 px-2.5 py-1 text-xs font-medium text-cp-stone transition-colors hover:bg-cp-stone/10"
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
                    className="mt-4 rounded-xl bg-cp-lime font-bold text-cp-ink hover:bg-cp-lime/90"
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
                  <div className="mt-4 border-t border-cp-paper/10 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-cp-ember">
                          Role-specific checkpoint
                        </p>
                        <p className="mt-1 text-[12px] text-cp-paper/65">
                          Pass at 70% to unlock the next day.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuizDayId("")}
                        className="text-xs font-medium text-cp-paper/60 hover:text-cp-paper"
                      >
                        Close
                      </button>
                    </div>
                    {questionsLoading ? (
                      <div className="mt-3 h-20 animate-pulse rounded-xl bg-cp-ink" />
                    ) : questions.length === 0 ? (
                      <p className="mt-3 rounded-xl bg-cp-lime/15 p-3 text-[12px] text-cp-paper">
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
                              className="rounded-xl border border-cp-paper/10 p-3"
                            >
                              <p className="text-[12.5px] font-semibold leading-relaxed text-cp-paper">
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
                                        ? "border-cp-lime2 bg-cp-lime2/10 text-cp-paper"
                                        : quizResult?.results.find(
                                              (result) => result.questionId === question.id,
                                            )?.selectedOption === key
                                          ? "border-cp-ember bg-cp-ember/10 text-cp-paper"
                                          : answers[question.id] === key
                                            ? "border-cp-stone bg-cp-stone/10 text-cp-paper"
                                            : "border-cp-paper/15 text-cp-paper/70 hover:bg-cp-paper/5",
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
                                          ? "bg-cp-lime2/10 text-cp-paper"
                                          : "bg-cp-ember/10 text-cp-paper",
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
                              <p className="mt-2 text-xs text-cp-paper/55">
                                {question.company_relevance}
                              </p>
                            </div>
                          );
                        })}
                        {!quizResult && (
                          <Button
                            size="sm"
                            className="rounded-xl bg-cp-lime font-bold text-cp-ink hover:bg-cp-lime/90"
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
                        ? "bg-cp-lime2/10 text-cp-paper"
                        : "bg-cp-lime/15 text-cp-paper",
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
      </SpotlightCard>
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
      subtitle="Day by day, toward the role"
    >
      {/* Ink ground: bleeds to the content column edges (AppLayout owns the
          outer padding, so negative margins reclaim it). */}
      <div className="-mx-4 -mb-6 -mt-6 bg-cp-ink px-4 pb-6 pt-6 sm:-mx-6 lg:-mx-8 lg:-mb-8 lg:pb-8">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            {/* Disciplined dark header: real streak, goal, progress. */}
            <RoadmapHeader
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
              <div className="card-surface p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cp-ember/15 text-cp-ember">
                      <Flame className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-cp-paper">
                        Target Hackathons & Event Milestones
                      </h3>
                      <p className="text-xs text-cp-paper/60">
                        Competitions and hackathons pinned to your active Career Roadmap.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/events"
                    className="shrink-0 text-xs font-semibold text-cp-ember hover:underline"
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
                        className="flex items-start justify-between gap-3 rounded-2xl border border-cp-paper/10 bg-cp-panel p-4 transition-all hover:border-cp-ember/30"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-cp-ember/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-cp-ember">
                              {evt.eventType}
                            </span>
                            <span className="text-xs font-medium text-cp-paper/60">
                              {daysLeft > 0 ? `in ${daysLeft} days` : "Event active"}
                            </span>
                          </div>
                          <h4 className="truncate text-xs font-bold text-cp-paper">
                            {evt.title}
                          </h4>
                          <p className="flex items-center gap-1 truncate text-xs text-cp-paper/60">
                            <MapPin className="h-3 w-3 shrink-0 text-cp-ember" />
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
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-cp-paper/15 text-cp-paper/60 transition-colors hover:border-cp-ember/40 hover:text-cp-ember"
                            title="Send / Test Event Reminder"
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </button>
                          <a
                            href={evt.eventUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-cp-paper/15 text-cp-paper/60 transition-colors hover:border-cp-ember/40 hover:text-cp-ember"
                            title="Open Event Website"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemovePinnedEvent(evt)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-cp-paper/60 transition-colors hover:bg-cp-ember/10 hover:text-cp-ember"
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
              <h3 className="font-display pt-2 text-xl font-bold text-cp-paper">Learning Paths</h3>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="card-surface h-28 animate-pulse" />
                  ))}
                </div>
              ) : pathsError ? (
                <div className="card-surface p-6 text-center sm:p-8">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cp-ember/10 text-cp-ember">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <h4 className="font-display mt-4 text-lg font-bold text-cp-paper">
                    Your learning paths couldn&apos;t be loaded
                  </h4>
                  <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-cp-paper/65">
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
                pathList.map((path) => (
                  <LearningPathCard key={path.id} path={path} />
                ))
              ) : (
                <div className="card-surface relative overflow-hidden p-5 sm:p-7">
                  <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.85fr)] md:gap-8">
                    <div className="text-center md:text-left">
                      <span className="cp-chip border border-cp-lime/50 bg-cp-lime/20 uppercase tracking-[0.14em] text-cp-paper">
                        Your next chapter
                      </span>
                      <h4 className="font-display mt-3 text-xl font-bold text-cp-paper sm:text-2xl">
                        Turn your goal into a plan you can follow.
                      </h4>
                      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-cp-paper/65 md:mx-0">
                        No learning paths generated yet. Build a roadmap based on your profile,
                        target role, and market gaps.
                      </p>
                      <Button
                        className="mt-5 rounded-xl bg-cp-lime font-bold text-cp-ink hover:bg-cp-lime/90"
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

                    {/* How the roadmap starts, in three steps. No mascot. */}
                    <div className="relative mx-auto w-full max-w-[330px] rounded-2xl border border-cp-lime/30 bg-cp-ink p-5">
                      <p className="cp-eyebrow">How it starts</p>
                      <ol className="mt-4 space-y-3">
                        {[
                          { n: "01", text: "Generate the roadmap from your profile and target role." },
                          { n: "02", text: "Pass one checkpoint to start the streak." },
                          { n: "03", text: "One day at a time. Proof, not promises." },
                        ].map((step) => (
                          <li key={step.n} className="flex items-start gap-3">
                            <span className="font-mono text-xs font-semibold text-cp-lime">
                              {step.n}
                            </span>
                            <span className="text-[12.5px] leading-relaxed text-cp-paper/80">
                              {step.text}
                            </span>
                          </li>
                        ))}
                      </ol>
                      <p className="mt-4 border-t border-border pt-3 font-serif text-[14px] leading-relaxed text-cp-paper/75 italic">
                        One day is all it takes to start.
                      </p>
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
                  className="rounded-xl text-[12.5px] text-cp-paper/65"
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
              <h3 className="text-[14.5px] font-bold text-cp-paper">Progress</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-cp-paper/60">Learning Paths</span>
                  <span className="font-semibold text-cp-paper">
                    {completedPaths}/{totalPaths}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-cp-paper/60">Days Completed</span>
                  <span className="font-semibold text-cp-paper">
                    {completedDays}/{totalDays || "?"}
                  </span>
                </div>
                {progress?.currentLevel && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-cp-paper/60">Current Level</span>
                    <span
                      className={cn("cp-chip capitalize", levelColor(progress.currentLevel))}
                    >
                      {progress.currentLevel}
                    </span>
                  </div>
                )}
                {progress?.mcqsPassed != null && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-cp-paper/60">MCQs Passed</span>
                    <span className="font-semibold text-cp-paper">{progress.mcqsPassed}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Measurable impact: derived from completed work and assessment history. */}
            <div className="card-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[14.5px] font-bold text-cp-paper">Proof of progress</h3>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-cp-ember">
                  Evidence
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-cp-stone/15 p-3">
                  <p className="text-xs text-cp-paper/60">Completion rate</p>
                  <p className="mt-1 text-lg font-bold text-cp-paper">
                    {progress?.completionRate ?? 0}%
                  </p>
                </div>
                <div className="rounded-xl bg-cp-lime/20 p-3">
                  <p className="text-xs text-cp-paper/60">Avg. checkpoint</p>
                  <p className="mt-1 text-lg font-bold text-cp-paper">
                    {progress?.averageMcqScore != null ? `${progress.averageMcqScore}%` : "Not yet"}
                  </p>
                </div>
                <div className="rounded-xl bg-cp-lime/20 p-3">
                  <p className="text-xs text-cp-paper/60">Learning time</p>
                  <p className="mt-1 text-lg font-bold text-cp-paper">
                    {progress?.estimatedMinutesCompleted
                      ? `${Math.round(progress.estimatedMinutesCompleted / 60)}h`
                      : "0h"}
                  </p>
                </div>
                <div className="rounded-xl bg-cp-stone/15 p-3">
                  <p className="text-xs text-cp-paper/60">Checkpoints</p>
                  <p className="mt-1 text-lg font-bold text-cp-paper">
                    {progress?.mcqsPassed ?? 0}/{progress?.mcqsAttempted ?? 0}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-cp-paper/60">
                Based on completed roadmap days, estimated work time, checkpoint scores, and
                recorded assessment attempts.
              </p>
            </div>

            {/* Next Action */}
            <div className="rounded-3xl border border-cp-lime/40 bg-cp-ink p-5">
              <p className="cp-eyebrow">
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
