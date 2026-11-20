import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  loadInterviewPrepFn,
  loadMcqAttemptsFn,
  recordMcqAttemptFn,
  saveInterviewPrepFn,
} from "@/lib/interview-prep.functions";

export type {
  InterviewPrepProgress,
  McqAttempt,
} from "@/lib/interview-prep.server";

export const interviewPrepQueryKey = (company: string, role: string) =>
  ["interview-prep", company, role] as const;

export const mcqAttemptsQueryKey = (company: string, role: string) =>
  ["interview-mcq-attempts", company, role] as const;

export function useInterviewPrep(company: string, role: string) {
  return useQuery({
    queryKey: interviewPrepQueryKey(company, role),
    queryFn: () => loadInterviewPrepFn({ data: { company, role } }),
    staleTime: 60_000,
  });
}

export function useSaveInterviewPrep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      company: string;
      role: string;
      practicedQuestions: string[];
      checklistItems: string[];
      answerDrafts: Record<string, string>;
    }) => saveInterviewPrepFn({ data: input }),
    onSuccess: (result) => {
      void qc.setQueryData(
        interviewPrepQueryKey(result.company, result.role),
        result,
      );
    },
  });
}

export function useMcqAttempts(company: string, role: string) {
  return useQuery({
    queryKey: mcqAttemptsQueryKey(company, role),
    queryFn: () => loadMcqAttemptsFn({ data: { company, role } }),
    staleTime: 60_000,
  });
}

export function useRecordMcqAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      company: string;
      role: string;
      mcqId: string;
      selectedOption: string;
      correct: boolean;
    }) => recordMcqAttemptFn({ data: input }),
    onSuccess: (_result, input) => {
      void qc.invalidateQueries({
        queryKey: mcqAttemptsQueryKey(input.company, input.role),
      });
    },
  });
}
