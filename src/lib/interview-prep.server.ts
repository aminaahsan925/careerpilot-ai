import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

/**
 * Interview-prep persistence (jobmirror route).
 *
 * Practiced questions, the evidence checklist, answer-lab drafts, and MCQ
 * attempts used to live only in React useState and reset on refresh. They
 * now persist per user per (company, role) in the interview_prep tables
 * (migration 20261120000001). All access is user-scoped; RLS enforces
 * own-row access and every query here filters by the verified userId.
 */

type Client = SupabaseClient<Database>;
type AnyClient = SupabaseClient<any>;

export type InterviewPrepProgress = {
  company: string;
  role: string;
  practicedQuestions: string[];
  checklistItems: string[];
  /** Answer drafts keyed by question text. */
  answerDrafts: Record<string, string>;
  updatedAt: string | null;
};

export type McqAttempt = {
  mcqId: string;
  selectedOption: "a" | "b" | "c" | "d";
  correct: boolean;
  createdAt: string;
};

const text = (value: unknown, max: number) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

const asStringArray = (value: unknown, maxItems: number, maxLen: number): string[] => {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (out.length >= maxItems) break;
    const cleaned = text(item, maxLen);
    if (cleaned && !out.includes(cleaned)) out.push(cleaned);
  }
  return out;
};

const asDraftMap = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, draft] of Object.entries(value as Record<string, unknown>)) {
    const question = text(key, 500);
    const body = text(draft, 4000);
    if (question && body) out[question] = body;
  }
  return out;
};

function contextKey(company: string, role: string): { company: string; role: string } {
  return { company: text(company, 160), role: text(role, 160) };
}

/** Load the saved prep state for one (company, role) pair. Null when never saved. */
export async function loadInterviewPrep(
  supabase: Client,
  userId: string,
  company: string,
  role: string,
): Promise<InterviewPrepProgress | null> {
  const db = supabase as unknown as AnyClient;
  const { company: companyKey, role: roleKey } = contextKey(company, role);
  const { data, error } = await db
    .from("interview_prep_progress")
    .select("practiced_questions, checklist_items, answer_drafts, updated_at")
    .eq("user_id", userId)
    .eq("company", companyKey)
    .eq("role", roleKey)
    .maybeSingle();
  if (error) {
    console.warn("[CareerPilot][interview-prep] load failed", {
      error: error.message,
    });
    return null;
  }
  if (!data) return null;
  return {
    company: companyKey,
    role: roleKey,
    practicedQuestions: asStringArray(data.practiced_questions, 200, 500),
    checklistItems: asStringArray(data.checklist_items, 50, 200),
    answerDrafts: asDraftMap(data.answer_drafts),
    updatedAt: (data.updated_at as string | null) ?? null,
  };
}

/** Upsert the prep state for one (company, role) pair. */
export async function saveInterviewPrep(
  supabase: Client,
  userId: string,
  input: {
    company: string;
    role: string;
    practicedQuestions: string[];
    checklistItems: string[];
    answerDrafts: Record<string, string>;
  },
): Promise<InterviewPrepProgress> {
  const db = supabase as unknown as AnyClient;
  const { company, role } = contextKey(input.company, input.role);
  const row = {
    user_id: userId,
    company,
    role,
    practiced_questions: asStringArray(input.practicedQuestions, 200, 500),
    checklist_items: asStringArray(input.checklistItems, 50, 200),
    answer_drafts: asDraftMap(input.answerDrafts),
    updated_at: new Date().toISOString(),
  };
  const { error } = await db
    .from("interview_prep_progress")
    .upsert(row, { onConflict: "user_id,company,role" });
  if (error) {
    console.error("[CareerPilot][interview-prep] save failed", { error: error.message });
    throw new Error("Could not save your interview prep progress. Please try again.");
  }
  return {
    company,
    role,
    practicedQuestions: row.practiced_questions,
    checklistItems: row.checklist_items,
    answerDrafts: row.answer_drafts,
    updatedAt: row.updated_at,
  };
}

/** Record one MCQ answer (append-only; latest row per mcq_id is current). */
export async function recordMcqAttempt(
  supabase: Client,
  userId: string,
  input: {
    company: string;
    role: string;
    mcqId: string;
    selectedOption: string;
    correct: boolean;
  },
): Promise<McqAttempt> {
  const db = supabase as unknown as AnyClient;
  const { company, role } = contextKey(input.company, input.role);
  const option = text(input.selectedOption, 1).toLowerCase();
  if (!["a", "b", "c", "d"].includes(option)) {
    throw new Error("Invalid MCQ option.");
  }
  const { data, error } = await db
    .from("interview_mcq_attempts")
    .insert({
      user_id: userId,
      company,
      role,
      mcq_id: text(input.mcqId, 120),
      selected_option: option,
      correct: Boolean(input.correct),
    })
    .select("mcq_id, selected_option, correct, created_at")
    .single();
  if (error || !data) {
    console.error("[CareerPilot][interview-prep] MCQ record failed", {
      error: error?.message,
    });
    throw new Error("Could not record your MCQ answer. Please try again.");
  }
  return {
    mcqId: String(data.mcq_id),
    selectedOption: String(data.selected_option) as McqAttempt["selectedOption"],
    correct: Boolean(data.correct),
    createdAt: String(data.created_at),
  };
}

/**
 * Latest attempt per MCQ for one (company, role) pair, plus the total
 * number of attempts recorded (for "attempt N" progress display).
 */
export async function loadMcqAttempts(
  supabase: Client,
  userId: string,
  company: string,
  role: string,
): Promise<{ latest: McqAttempt[]; totalAttempts: number }> {
  const db = supabase as unknown as AnyClient;
  const { company: companyKey, role: roleKey } = contextKey(company, role);
  const { data, error } = await db
    .from("interview_mcq_attempts")
    .select("mcq_id, selected_option, correct, created_at")
    .eq("user_id", userId)
    .eq("company", companyKey)
    .eq("role", roleKey)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("[CareerPilot][interview-prep] MCQ load failed", {
      error: error.message,
    });
    return { latest: [], totalAttempts: 0 };
  }
  const rows = (data ?? []) as Array<{
    mcq_id: string;
    selected_option: string;
    correct: boolean;
    created_at: string;
  }>;
  const seen = new Set<string>();
  const latest: McqAttempt[] = [];
  for (const row of rows) {
    if (seen.has(row.mcq_id)) continue;
    seen.add(row.mcq_id);
    latest.push({
      mcqId: row.mcq_id,
      selectedOption: row.selected_option as McqAttempt["selectedOption"],
      correct: row.correct,
      createdAt: row.created_at,
    });
  }
  return { latest, totalAttempts: rows.length };
}
