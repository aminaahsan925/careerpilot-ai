import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  chatWithRecruiterFn,
  loadMockAttemptsFn,
  loadRecruiterSessionFn,
  runRecruiterAuditFn,
  submitMockAnswerFn,
} from "@/lib/recruiter.functions";

export type {
  BarComparisonItem,
  BarComparisonStage,
  BrutalVerdict,
  CompanyProvenance,
  EvidenceAuditItem,
  EvidenceAuditStage,
  MockInterviewAttempt,
  MockInterviewQuestion,
  MockInterviewStage,
  MockAttemptSummary,
  MockRubricCriterion,
  RecruiterAudit,
  RecruiterSession,
  RecruiterVerdict,
  ResumeScreenCheck,
  ResumeScreenStage,
} from "@/lib/recruiter.server";

export const mockAttemptsQueryKey = (sessionId: string) =>
  ["mock-attempts", sessionId] as const;

export function useRecruiterSession() {
  return useQuery({
    queryKey: ["recruiter-session"],
    queryFn: async () => {
      console.info("[CareerPilot][client][loadRecruiterSession] request");
      try {
        const result = await loadRecruiterSessionFn();
        console.info("[CareerPilot][client][loadRecruiterSession] success", {
          hasSession: Boolean(result),
        });
        return result;
      } catch (error) {
        console.error("[CareerPilot][client][loadRecruiterSession] failed", error);
        throw error;
      }
    },
  });
}

export function useRunRecruiterAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input?: {
      company?: string;
      role?: string;
      jobDescription?: string;
    }) => {
      console.info("[CareerPilot][client][runRecruiterAudit] request", {
        company: input?.company,
        role: input?.role,
        hasJd: Boolean(input?.jobDescription?.trim()),
      });
      try {
        const result = await runRecruiterAuditFn({ data: input });
        console.info("[CareerPilot][client][runRecruiterAudit] success", {
          sessionId: result.id,
          score: result.overallScore,
        });
        return result;
      } catch (error) {
        console.error("[CareerPilot][client][runRecruiterAudit] failed", error);
        throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["recruiter-session"] });
      void qc.invalidateQueries({ queryKey: ["career-overview"] });
    },
  });
}

export function useChatWithRecruiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sessionId: string; message: string }) => {
      console.info("[CareerPilot][client][chatWithRecruiter] request");
      try {
        const result = await chatWithRecruiterFn({ data: input });
        console.info("[CareerPilot][client][chatWithRecruiter] success");
        return result;
      } catch (error) {
        console.error("[CareerPilot][client][chatWithRecruiter] failed", error);
        throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["recruiter-session"] });
    },
  });
}

export function useMockAttempts(sessionId: string | null) {
  return useQuery({
    queryKey: mockAttemptsQueryKey(sessionId ?? "none"),
    queryFn: async () => {
      if (!sessionId) return null;
      return loadMockAttemptsFn({ data: { sessionId } });
    },
    enabled: Boolean(sessionId),
    staleTime: 30_000,
  });
}

export function useSubmitMockAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      sessionId: string;
      questionId: string;
      question: string;
      answer: string;
      timeSpentSeconds: number;
    }) => {
      console.info("[CareerPilot][client][submitMockAnswer] request", {
        sessionId: input.sessionId,
        questionId: input.questionId,
      });
      const result = await submitMockAnswerFn({ data: input });
      console.info("[CareerPilot][client][submitMockAnswer] success", {
        attemptId: result.attempt.id,
        totalScore: result.attempt.totalScore,
      });
      return result;
    },
    onSuccess: (result, input) => {
      void qc.setQueryData(mockAttemptsQueryKey(input.sessionId), result.summary);
    },
  });
}
