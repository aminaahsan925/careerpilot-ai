import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const text = (v: unknown, max: number) =>
  String(v ?? "")
    .trim()
    .slice(0, max);

const stringArray = (v: unknown, maxItems: number, maxLen: number): string[] => {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (out.length >= maxItems) break;
    const cleaned = text(item, maxLen);
    if (cleaned && !out.includes(cleaned)) out.push(cleaned);
  }
  return out;
};

const draftMap = (v: unknown): Record<string, string> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [key, draft] of Object.entries(v as Record<string, unknown>)) {
    const question = text(key, 500);
    const body = text(draft, 4000);
    if (question && body) out[question] = body;
  }
  return out;
};

/** Loads the saved interview-prep state for one (company, role) pair. */
export const loadInterviewPrepFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { company?: string; role?: string }) => ({
    company: text(input?.company, 160),
    role: text(input?.role, 160),
  }))
  .handler(async ({ data, context }) => {
    const { loadInterviewPrep } = await import("./interview-prep.server");
    return loadInterviewPrep(context.supabase, context.userId, data.company, data.role);
  });

/** Saves the interview-prep state for one (company, role) pair. */
export const saveInterviewPrepFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      company?: string;
      role?: string;
      practicedQuestions?: string[];
      checklistItems?: string[];
      answerDrafts?: Record<string, string>;
    }) => ({
      company: text(input?.company, 160),
      role: text(input?.role, 160),
      practicedQuestions: stringArray(input?.practicedQuestions, 200, 500),
      checklistItems: stringArray(input?.checklistItems, 50, 200),
      answerDrafts: draftMap(input?.answerDrafts),
    }),
  )
  .handler(async ({ data, context }) => {
    const { saveInterviewPrep } = await import("./interview-prep.server");
    return saveInterviewPrep(context.supabase, context.userId, data);
  });

/** Records one MCQ answer. */
export const recordMcqAttemptFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      company?: string;
      role?: string;
      mcqId: string;
      selectedOption: string;
      correct?: boolean;
    }) => ({
      company: text(input?.company, 160),
      role: text(input?.role, 160),
      mcqId: text(input?.mcqId, 120),
      selectedOption: text(input?.selectedOption, 1),
      correct: Boolean(input?.correct),
    }),
  )
  .handler(async ({ data, context }) => {
    if (!data.mcqId) throw new Error("MCQ id is required.");
    const { recordMcqAttempt } = await import("./interview-prep.server");
    return recordMcqAttempt(context.supabase, context.userId, data);
  });

/** Loads the latest MCQ attempt per question for one (company, role) pair. */
export const loadMcqAttemptsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { company?: string; role?: string }) => ({
    company: text(input?.company, 160),
    role: text(input?.role, 160),
  }))
  .handler(async ({ data, context }) => {
    const { loadMcqAttempts } = await import("./interview-prep.server");
    return loadMcqAttempts(context.supabase, context.userId, data.company, data.role);
  });
