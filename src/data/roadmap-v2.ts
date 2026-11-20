import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  claimDayCompleteFn,
  generateRoadmapFn,
  getAllNotificationsFn,
  getDailyWorkByPathFn,
  getLearningPathsFn,
  getMcqHistoryFn,
  getMcqsForDayFn,
  getRoadmapProgressFn,
  getTodayWorkFn,
  getUnreadCountFn,
  getUnreadNotificationsFn,
  markAllNotificationsReadFn,
  markNotificationReadFn,
  submitMcqFn,
  type McqAnswer,
} from "@/lib/roadmap-v2.functions";

/* ------------------------------------------------------------------ *
 * Types for the UI layer
 * ------------------------------------------------------------------ */

/** A curated resource link attached to a day of work. */
export type CuratedLink = {
  label: string;
  url: string;
  type: "video" | "article" | "docs" | "interactive";
  why: string;
};

/** One learning path of the Brutal Roadmap. */
export type LearningPath = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "expert";
  category: string;
  market_justification: string;
  outdated_warning: string | null;
  must_know: string[];
  curated_resources: CuratedLink[];
  position: number;
  completed: boolean;
  created_at: string;
};

/** One day of work inside a learning path. */
export type DailyWork = {
  id: string;
  user_id: string;
  learning_path_id: string;
  day_number: number;
  date_assigned: string;
  title: string;
  explanation: string;
  what_is_this: string;
  why_companies_care: string;
  how_to_learn: string;
  hands_on_task: string;
  curated_links: CuratedLink[];
  estimated_minutes: number;
  problem_solving_exercise: string | null;
  completed: boolean;
  mcq_passed: boolean;
  created_at: string;
  /** Joined in only on today's-work reads — used to header the day card. */
  roadmap_learning_paths?: { title: string; level: string };
};

/** One MCQ gate question (the correct answer is withheld until grading). */
export type McqQuestion = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  explanation: string;
  difficulty: "basic" | "intermediate" | "advanced";
  company_relevance: string;
  /** Not selected by the day endpoint — present only in the raw bank. */
  tags?: string[];
  position?: number;
};

/** One graded MCQ submission. */
export type McqAttemptResult = {
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctCount: number;
  results: Array<{
    questionId: string;
    correct: boolean;
    selectedOption: string;
    correctOption: string;
    explanation: string;
  }>;
};

/** A previous MCQ attempt row (from history reads). */
export type McqAttempt = {
  id: string;
  user_id: string;
  daily_work_id: string;
  questions: Array<{
    questionId: string;
    selectedOption: string;
    correctOption: string | null;
    correct: boolean;
  }>;
  score: number;
  passed: boolean;
  attempts: number;
  created_at: string;
};

/** A roadmap notification — streak nudges, MCQ results, level-ups. */
export type RoadmapNotification = {
  id: string;
  user_id: string;
  daily_work_id: string | null;
  type: "daily_work" | "streak_warning" | "mcq_ready" | "level_up" | "market_alert";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

/** Overall roadmap stats. */
export type RoadmapProgress = {
  totalPaths: number;
  completedPaths: number;
  totalDays: number;
  completedDays: number;
  currentLevel: string;
  mcqsPassed: number;
  mcqsAttempted: number;
  averageMcqScore: number | null;
  estimatedMinutesCompleted: number;
  completionRate: number;
};

/* ------------------------------------------------------------------ *
 * Query keys
 *
 * Everything lives under ["roadmap-v2", ...] so the whole tree can be
 * invalidated at once while each sub-key stays independently
 * invalidatable (prefix matching).
 * ------------------------------------------------------------------ */

export const ROADMAP_V2_QUERY_KEY = ["roadmap-v2"] as const;
export const LEARNING_PATHS_QUERY_KEY = ["roadmap-v2", "learning-paths"] as const;
export const DAILY_WORK_QUERY_KEY = ["roadmap-v2", "daily-work"] as const;
export const ROADMAP_PROGRESS_QUERY_KEY = ["roadmap-v2", "progress"] as const;
export const MCQ_QUESTIONS_QUERY_KEY = ["roadmap-v2", "mcqs"] as const;
export const MCQ_HISTORY_QUERY_KEY = ["roadmap-v2", "mcq-history"] as const;
export const ROADMAP_NOTIFICATIONS_QUERY_KEY = ["roadmap-v2", "notifications"] as const;

/* ------------------------------------------------------------------ *
 * Query hooks
 * ------------------------------------------------------------------ */

/** All learning paths, ordered beginner → intermediate → expert. */
export function useLearningPaths() {
  return useQuery({
    queryKey: LEARNING_PATHS_QUERY_KEY,
    queryFn: async (): Promise<LearningPath[]> => {
      console.info("[CareerPilot][client][getLearningPaths] request");
      try {
        const result = await getLearningPathsFn();
        console.info("[CareerPilot][client][getLearningPaths] success", {
          pathCount: result.length,
        });
        return result as LearningPath[];
      } catch (error) {
        console.error("[CareerPilot][client][getLearningPaths] failed", error);
        throw error;
      }
    },
    staleTime: 60_000,
  });
}

/**
 * Daily work. Without `pathId` this reads today's single next day (or
 * null once every day is done); with `pathId` it reads every day of
 * that path in order — so the result is `DailyWork | null` versus
 * `DailyWork[]` depending on the argument.
 */
export function useDailyWork(pathId?: string) {
  return useQuery({
    queryKey: [...DAILY_WORK_QUERY_KEY, pathId || "today"],
    queryFn: async (): Promise<DailyWork[] | DailyWork | null> => {
      if (pathId) {
        console.info("[CareerPilot][client][getDailyWorkByPath] request", { pathId });
        try {
          const result = await getDailyWorkByPathFn({ data: { pathId } });
          console.info("[CareerPilot][client][getDailyWorkByPath] success", {
            pathId,
            dayCount: result.length,
          });
          return (result ?? []) as DailyWork[];
        } catch (error) {
          console.error("[CareerPilot][client][getDailyWorkByPath] failed", error);
          throw error;
        }
      }
      console.info("[CareerPilot][client][getTodayWork] request");
      try {
        const result = await getTodayWorkFn();
        console.info("[CareerPilot][client][getTodayWork] success", {
          hasWork: Boolean(result),
        });
        return (result ?? null) as DailyWork | null;
      } catch (error) {
        console.error("[CareerPilot][client][getTodayWork] failed", error);
        throw error;
      }
    },
  });
}

/** Overall roadmap stats: paths, days, current level, MCQs passed. */
export function useRoadmapProgress() {
  return useQuery({
    queryKey: ROADMAP_PROGRESS_QUERY_KEY,
    queryFn: async (): Promise<RoadmapProgress> => {
      console.info("[CareerPilot][client][getRoadmapProgress] request");
      try {
        const result = await getRoadmapProgressFn();
        console.info("[CareerPilot][client][getRoadmapProgress] success", {
          totalPaths: result.totalPaths,
          completedDays: result.completedDays,
        });
        return result as RoadmapProgress;
      } catch (error) {
        console.error("[CareerPilot][client][getRoadmapProgress] failed", error);
        throw error;
      }
    },
    staleTime: 30_000,
  });
}

/** The MCQ gate questions for a day. */
export function useMcqsForDay(dayId: string) {
  return useQuery({
    queryKey: [...MCQ_QUESTIONS_QUERY_KEY, dayId],
    queryFn: async (): Promise<McqQuestion[]> => {
      console.info("[CareerPilot][client][getMcqsForDay] request", { dayId });
      try {
        const result = await getMcqsForDayFn({ data: { dayId } });
        console.info("[CareerPilot][client][getMcqsForDay] success", {
          dayId,
          questionCount: result.length,
        });
        return (result ?? []) as McqQuestion[];
      } catch (error) {
        console.error("[CareerPilot][client][getMcqsForDay] failed", error);
        throw error;
      }
    },
    enabled: Boolean(dayId),
    // The server shuffles the question set on every call — keep one set
    // stable while the quiz is open so answers don't jump mid-attempt.
    refetchOnWindowFocus: false,
  });
}

/** Previous MCQ attempts for a day, newest first. */
export function useMcqHistory(dayId: string) {
  return useQuery({
    queryKey: [...MCQ_HISTORY_QUERY_KEY, dayId],
    queryFn: async (): Promise<McqAttempt[]> => {
      console.info("[CareerPilot][client][getMcqHistory] request", { dayId });
      try {
        const result = await getMcqHistoryFn({ data: { dayId } });
        console.info("[CareerPilot][client][getMcqHistory] success", {
          dayId,
          attemptCount: result.length,
        });
        return (result ?? []) as McqAttempt[];
      } catch (error) {
        console.error("[CareerPilot][client][getMcqHistory] failed", error);
        throw error;
      }
    },
    enabled: Boolean(dayId),
  });
}

/** Unread roadmap notifications, newest first. */
export function useRoadmapNotifications() {
  return useQuery({
    queryKey: [...ROADMAP_NOTIFICATIONS_QUERY_KEY, "unread"],
    queryFn: async (): Promise<RoadmapNotification[]> => {
      console.info("[CareerPilot][client][getUnreadNotifications] request");
      try {
        const result = await getUnreadNotificationsFn();
        console.info("[CareerPilot][client][getUnreadNotifications] success", {
          count: result.length,
        });
        return (result ?? []) as RoadmapNotification[];
      } catch (error) {
        console.error("[CareerPilot][client][getUnreadNotifications] failed", error);
        throw error;
      }
    },
  });
}

/** All roadmap notifications, newest first. */
export function useAllNotifications() {
  return useQuery({
    queryKey: [...ROADMAP_NOTIFICATIONS_QUERY_KEY, "all"],
    queryFn: async (): Promise<RoadmapNotification[]> => {
      console.info("[CareerPilot][client][getAllNotifications] request");
      try {
        const result = await getAllNotificationsFn();
        console.info("[CareerPilot][client][getAllNotifications] success", {
          count: result.length,
        });
        return (result ?? []) as RoadmapNotification[];
      } catch (error) {
        console.error("[CareerPilot][client][getAllNotifications] failed", error);
        throw error;
      }
    },
  });
}

/** Count of unread notifications — drives the bell badge. */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [...ROADMAP_NOTIFICATIONS_QUERY_KEY, "unread-count"],
    queryFn: async (): Promise<number> => {
      try {
        const result = await getUnreadCountFn();
        return Number(result ?? 0);
      } catch (error) {
        console.error("[CareerPilot][client][getUnreadCount] failed", error);
        throw error;
      }
    },
  });
}

/* ------------------------------------------------------------------ *
 * Mutation hooks
 * ------------------------------------------------------------------ */

/** Generate (or fully regenerate) the Brutal Roadmap. */
export function useGenerateRoadmapV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; pathCount: number; error?: string }> => {
      console.info("[CareerPilot][client][generateRoadmapV2] request");
      try {
        const result = await generateRoadmapFn({});
        console.info("[CareerPilot][client][generateRoadmapV2] success", {
          pathCount: result.pathCount,
        });
        return result;
      } catch (error) {
        console.error("[CareerPilot][client][generateRoadmapV2] failed", error);
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LEARNING_PATHS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ROADMAP_PROGRESS_QUERY_KEY });
    },
  });
}

/** Claim a day's work is done — reports whether the MCQ gate applies. */
export function useClaimDayComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dayId,
    }: {
      dayId: string;
    }): Promise<{ success: boolean; needsMcq: boolean }> => {
      console.info("[CareerPilot][client][claimDayComplete] request", { dayId });
      try {
        const result = await claimDayCompleteFn({ data: { dayId } });
        console.info("[CareerPilot][client][claimDayComplete] success", {
          dayId,
          needsMcq: result.needsMcq,
        });
        return result;
      } catch (error) {
        console.error("[CareerPilot][client][claimDayComplete] failed", error);
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DAILY_WORK_QUERY_KEY });
    },
  });
}

/** Submit a day's MCQ answers and grade them. */
export function useSubmitMcq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dayId,
      answers,
    }: {
      dayId: string;
      answers: McqAnswer[];
    }): Promise<McqAttemptResult> => {
      console.info("[CareerPilot][client][submitMcq] request", {
        dayId,
        answerCount: answers.length,
      });
      try {
        const result = await submitMcqFn({ data: { dayId, answers } });
        console.info("[CareerPilot][client][submitMcq] success", {
          dayId,
          score: result.score,
          passed: result.passed,
        });
        return result as McqAttemptResult;
      } catch (error) {
        console.error("[CareerPilot][client][submitMcq] failed", error);
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DAILY_WORK_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: LEARNING_PATHS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ROADMAP_PROGRESS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ROADMAP_NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
}

/** Mark a single notification as read. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ notificationId }: { notificationId: string }) =>
      markNotificationReadFn({ data: { notificationId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROADMAP_NOTIFICATIONS_QUERY_KEY });
    },
  });
}

/** Mark every unread notification as read. */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsReadFn({}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROADMAP_NOTIFICATIONS_QUERY_KEY });
    },
  });
}
