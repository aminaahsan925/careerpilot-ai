import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const text = (v: unknown, max: number) =>
  String(v ?? "")
    .trim()
    .slice(0, max);

/** Runs the staged recruiter audit for a target company, role, and pasted JD. */
export const runRecruiterAuditFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input?: { company?: string; role?: string; jobDescription?: string }) => {
    return {
      company: text(input?.company, 160) || undefined,
      role: text(input?.role, 160) || undefined,
      jobDescription: text(input?.jobDescription, 8000) || undefined,
    };
  })
  .handler(async ({ data, context }) => {
    console.info("[CareerPilot][runRecruiterAudit] start", {
      userId: context.userId,
      company: data?.company,
      role: data?.role,
      hasJd: Boolean(data?.jobDescription),
    });
    const { runRecruiterAudit } = await import("./recruiter.server");
    try {
      const options: { company?: string; role?: string; jobDescription?: string } = {};
      if (data?.company) options.company = data.company;
      if (data?.role) options.role = data.role;
      if (data?.jobDescription) options.jobDescription = data.jobDescription;
      const result = await runRecruiterAudit(context.supabase, context.userId, options);
      console.info("[CareerPilot][runRecruiterAudit] success", {
        userId: context.userId,
        sessionId: result.id,
        score: result.overallScore,
      });
      return result;
    } catch (error) {
      console.error("[CareerPilot][runRecruiterAudit] failed", {
        userId: context.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });

/** Sends a message to the AI recruiter and gets a response. */
export const chatWithRecruiterFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { sessionId: string; message: string }) => {
    const sessionId = text(input?.sessionId, 60);
    const message = text(input?.message, 2000);
    if (!sessionId) throw new Error("Session ID is required.");
    if (!message) throw new Error("Please type a message.");
    return { sessionId, message };
  })
  .handler(async ({ data, context }) => {
    console.info("[CareerPilot][chatWithRecruiter] start", {
      userId: context.userId,
      sessionId: data.sessionId,
    });
    const { chatWithRecruiter } = await import("./recruiter.server");
    try {
      const result = await chatWithRecruiter(
        context.supabase,
        context.userId,
        data.sessionId,
        data.message,
      );
      console.info("[CareerPilot][chatWithRecruiter] success", {
        userId: context.userId,
        replyLength: result.reply.length,
      });
      return result;
    } catch (error) {
      console.error("[CareerPilot][chatWithRecruiter] failed", {
        userId: context.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });

/** Loads the latest recruiter session for the current user. */
export const loadRecruiterSessionFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadRecruiterSession } = await import("./recruiter.server");
    return loadRecruiterSession(context.supabase, context.userId);
  });

/** Submits one mock-interview answer; scored against the deterministic rubric. */
export const submitMockAnswerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      sessionId: string;
      questionId: string;
      question: string;
      answer: string;
      timeSpentSeconds?: number;
    }) => {
      const sessionId = text(input?.sessionId, 60);
      const questionId = text(input?.questionId, 60);
      const question = text(input?.question, 500);
      const answer = text(input?.answer, 4000);
      if (!sessionId) throw new Error("Session ID is required.");
      if (!questionId) throw new Error("Question ID is required.");
      if (!question) throw new Error("Question is required.");
      if (!answer) throw new Error("Write an answer before submitting.");
      return {
        sessionId,
        questionId,
        question,
        answer,
        timeSpentSeconds: Math.max(0, Math.min(3600, Math.floor(input?.timeSpentSeconds ?? 0) || 0)),
      };
    },
  )
  .handler(async ({ data, context }) => {
    console.info("[CareerPilot][submitMockAnswer] start", {
      userId: context.userId,
      sessionId: data.sessionId,
      questionId: data.questionId,
    });
    const { submitMockAnswer } = await import("./recruiter.server");
    try {
      const result = await submitMockAnswer(context.supabase, context.userId, data.sessionId, {
        questionId: data.questionId,
        question: data.question,
        answer: data.answer,
        timeSpentSeconds: data.timeSpentSeconds,
      });
      console.info("[CareerPilot][submitMockAnswer] success", {
        userId: context.userId,
        attemptId: result.attempt.id,
        totalScore: result.attempt.totalScore,
      });
      return result;
    } catch (error) {
      console.error("[CareerPilot][submitMockAnswer] failed", {
        userId: context.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });

/** Loads the mock-interview attempts (with progress summary) for a session. */
export const loadMockAttemptsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { sessionId: string }) => {
    const sessionId = text(input?.sessionId, 60);
    if (!sessionId) throw new Error("Session ID is required.");
    return { sessionId };
  })
  .handler(async ({ data, context }) => {
    const { loadMockAttempts } = await import("./recruiter.server");
    return loadMockAttempts(context.supabase, context.userId, data.sessionId);
  });
