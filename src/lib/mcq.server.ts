import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { markDayCompleted } from "./daily-work.server";
import { createNotification } from "./roadmap-notifications.server";

// The roadmap v2 tables are not yet in the generated Supabase types.
// Use an untyped alias for operations on those tables only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

/* ------------------------------------------------------------------ *
 * 1. getMcqsForDay — fetch MCQ questions for a daily work item's path
 * ------------------------------------------------------------------ */

export async function getMcqsForDay(userId: string, dayId: string) {
  try {
    // Resolve the learning path through the daily work item
    const { data: day, error: dayError } = await db
      .from("roadmap_daily_work")
      .select("id, learning_path_id, user_id")
      .eq("id", dayId)
      .eq("user_id", userId)
      .maybeSingle();

    if (dayError) {
      console.error("[MCQ] getMcqsForDay day fetch error:", dayError.message);
      throw dayError;
    }

    if (!day) {
      throw new Error("Daily work item not found.");
    }

    // Return a stable subset so the server can require every displayed question.
    const { data: questions, error: qError } = await db
      .from("roadmap_mcq_tests")
      .select(
        "id, question, option_a, option_b, option_c, option_d, explanation, difficulty, company_relevance",
      )
      .eq("learning_path_id", day.learning_path_id)
      .order("position", { ascending: true });

    if (qError) {
      console.error("[MCQ] getMcqsForDay query error:", qError.message);
      throw qError;
    }

    if (!questions || questions.length === 0) {
      return [];
    }

    return [...questions].slice(0, 5);
  } catch (error) {
    console.error("[MCQ] getMcqsForDay failed:", error);
    throw error;
  }
}

/* ------------------------------------------------------------------ *
 * 2. submitMcqAttempt — grade and record an MCQ submission
 * ------------------------------------------------------------------ */

export async function submitMcqAttempt(
  userId: string,
  dayId: string,
  answers: Array<{ questionId: string; selectedOption: string }>,
) {
  try {
    const validOptions = new Set(["a", "b", "c", "d"]);
    const seenQuestionIds = new Set<string>();
    for (const answer of answers) {
      const questionId = answer.questionId.trim();
      const selectedOption = answer.selectedOption.trim().toLowerCase();
      if (!questionId || !validOptions.has(selectedOption)) {
        throw new Error("Each MCQ answer must include a valid option.");
      }
      if (seenQuestionIds.has(questionId)) {
        throw new Error("A question was submitted more than once. Please try again.");
      }
      seenQuestionIds.add(questionId);
    }

    // 1. Fetch the daily work item to verify ownership
    const { data: day, error: dayError } = await db
      .from("roadmap_daily_work")
      .select("id, learning_path_id, title, day_number")
      .eq("id", dayId)
      .eq("user_id", userId)
      .maybeSingle();

    if (dayError) {
      console.error("[MCQ] submitMcqAttempt day fetch error:", dayError.message);
      throw dayError;
    }

    if (!day) {
      throw new Error("Daily work item not found.");
    }

    // 2. Recompute the exact assessment set. Partial submissions must never
    // pass by submitting only the easiest question(s).
    const { data: allQuestions, error: allQuestionsError } = await db
      .from("roadmap_mcq_tests")
      .select("id")
      .eq("learning_path_id", day.learning_path_id)
      .order("position", { ascending: true });
    if (allQuestionsError) throw allQuestionsError;
    const expectedIds = (allQuestions ?? [])
      .slice(0, 5)
      .map((question: { id: string }) => question.id)
      .sort();
    const submittedIds = answers.map((answer) => answer.questionId).sort();
    if (
      expectedIds.length === 0 ||
      submittedIds.length !== expectedIds.length ||
      submittedIds.some((id: string, index: number) => id !== expectedIds[index])
    ) {
      throw new Error("Please answer every question in this assessment before submitting.");
    }

    // Fetch correct answers only after validating the complete set.
    const questionIds = expectedIds;
    const { data: testQuestions, error: tError } = await db
      .from("roadmap_mcq_tests")
      .select("id, correct_option, explanation, question")
      .eq("learning_path_id", day.learning_path_id)
      .in("id", questionIds);

    if (tError) {
      console.error("[MCQ] submitMcqAttempt test fetch error:", tError.message);
      throw tError;
    }

    if (!testQuestions || testQuestions.length === 0) {
      throw new Error("No matching MCQ questions found.");
    }

    if (testQuestions.length !== answers.length) {
      throw new Error("Some submitted questions do not belong to this assessment.");
    }

    // Build a lookup map for correct answers
    const correctMap = new Map<
      string,
      { correct_option: string; explanation: string; question: string }
    >();
    for (const q of testQuestions) {
      correctMap.set(q.id, q);
    }

    // 3. Grade each answer
    const totalQuestions = testQuestions.length;
    let correctCount = 0;
    const results: Array<{
      questionId: string;
      correct: boolean;
      selectedOption: string;
      correctOption: string;
      explanation: string;
    }> = [];

    for (const answer of answers) {
      const testQ = correctMap.get(answer.questionId);
      if (!testQ) continue;

      const isCorrect = answer.selectedOption.toLowerCase() === testQ.correct_option.toLowerCase();
      if (isCorrect) correctCount++;

      results.push({
        questionId: answer.questionId,
        correct: isCorrect,
        selectedOption: answer.selectedOption,
        correctOption: testQ.correct_option,
        explanation: testQ.explanation,
      });
    }

    // 4. Calculate score and pass/fail (70% threshold)
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 70;

    // 5. Build questions JSON snapshot for the attempt record
    const questionsSnapshot = answers.map((a) => {
      const testQ = correctMap.get(a.questionId);
      return {
        questionId: a.questionId,
        selectedOption: a.selectedOption,
        correctOption: testQ?.correct_option ?? null,
        correct: a.selectedOption.toLowerCase() === (testQ?.correct_option ?? "").toLowerCase(),
      };
    });

    // 6. Count previous attempts for this day
    const { count: prevAttempts } = await db
      .from("roadmap_mcq_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("daily_work_id", dayId);

    // 7. Insert attempt record
    const { error: insertError } = await db.from("roadmap_mcq_attempts").insert({
      user_id: userId,
      daily_work_id: dayId,
      questions: questionsSnapshot,
      score,
      passed,
      attempts: (prevAttempts ?? 0) + 1,
    });

    if (insertError) {
      console.error("[MCQ] submitMcqAttempt insert error:", insertError.message);
      throw insertError;
    }

    // 8. Side effects: mark day complete + notify
    if (passed) {
      await markDayCompleted(userId, dayId);
      await createNotification(
        userId,
        "mcq_ready",
        `Day ${day.day_number} Complete!`,
        `You passed the MCQ for "${day.title}" with ${score}%. Great work — that day is done.`,
        dayId,
      );
    } else {
      // Find which topics the student got wrong
      const wrongTopics = results
        .filter((r) => !r.correct)
        .map((r) => r.questionId)
        .slice(0, 3);

      await createNotification(
        userId,
        "mcq_ready",
        `MCQ Failed: ${day.title}`,
        `You scored ${score}% on "${day.title}". You need 70% to pass. Review the ${wrongTopics.length} question${wrongTopics.length === 1 ? "" : "s"} you got wrong and try again.`,
        dayId,
      );
    }

    return {
      score,
      passed,
      totalQuestions,
      correctCount,
      results,
    };
  } catch (error) {
    console.error("[MCQ] submitMcqAttempt failed:", error);
    throw error;
  }
}

/* ------------------------------------------------------------------ *
 * 3. getMcqHistory — all previous MCQ attempts for a daily work item
 * ------------------------------------------------------------------ */

export async function getMcqHistory(userId: string, dayId: string) {
  try {
    const { data, error } = await db
      .from("roadmap_mcq_attempts")
      .select("*")
      .eq("user_id", userId)
      .eq("daily_work_id", dayId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[MCQ] getMcqHistory error:", error.message);
      throw error;
    }

    return data ?? [];
  } catch (error) {
    console.error("[MCQ] getMcqHistory failed:", error);
    throw error;
  }
}
