import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { toast } from "sonner";

import { AppLayout } from "@/components/app/AppLayout";
import { useCareerOverview } from "@/data/career";
import { useChatHistory, useSendMentorMessage } from "@/data/mentor";
import { useRoadmap } from "@/data/roadmap";
import { friendlyError, useCurrentUser } from "@/data/user";
import {
  MentorView,
  type MentorInsight,
  type MentorMessage,
  type MentorSuggestion,
} from "@/components/mentor/MentorView";

export const Route = createFileRoute("/_authenticated/mentor")({
  head: () => ({
    meta: [
      { title: "AI Career Mentor - CareerPilot AI" },
      {
        name: "description",
        content:
          "Talk to your AI career mentor about roles, skills, interviews and next steps with tailored career insights.",
      },
      { property: "og:title", content: "AI Career Mentor - CareerPilot AI" },
      {
        property: "og:description",
        content: "A focused AI conversation built around your career goal.",
      },
    ],
  }),
  component: MentorPage,
});

const SUGGESTION_TEXTS = [
  "How do I become a Full Stack Developer?",
  "What skills should I learn next?",
  "How can I improve my resume?",
  "Prepare me for a frontend interview",
  "Which internships fit my profile?",
] as const;

/* ------------------------------------------------------------------ */
/* Mentor page: the data lives here; the layout lives in <MentorView>. */
/* Each suggestion carries a one-line evidence fact, computed from     */
/* the student's real data (goal, gaps, readiness, next roadmap step,  */
/* goal alignment), with honest fallbacks where nothing is measured    */
/* yet. Nothing is invented.                                           */
/* ------------------------------------------------------------------ */

function MentorPage() {
  const { data: user } = useCurrentUser();
  const { data: overview } = useCareerOverview();
  const { data: roadmap } = useRoadmap();
  const { data: history } = useChatHistory();
  const sendMessage = useSendMentorMessage();
  const [input, setInput] = useState("");
  const [optimisticUserMsg, setOptimisticUserMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const thinking = sendMessage.isPending;

  const gaps = overview?.gaps ?? null;
  const readiness = overview?.readiness ?? null;
  const nextStages = (roadmap?.stages ?? []).filter((stage) => !stage.completed);
  const actions = [
    ...(readiness?.nextAction ? [readiness.nextAction] : []),
    ...nextStages.slice(0, 2).map((stage) => stage.title),
  ].slice(0, 3);

  const messages: MentorMessage[] = [
    {
      role: "ai" as const,
      text: "I'm your career mentor. I can see your profile, skills and target role. Ask me anything about roles, skills, interviews or your next step.",
    },
    ...(history ?? []).map((m) => ({
      role: m.role === "assistant" ? ("ai" as const) : ("user" as const),
      text: m.content,
    })),
    ...(optimisticUserMsg ? [{ role: "user" as const, text: optimisticUserMsg }] : []),
  ];

  /* Each suggestion carries a one-line evidence fact, computed from
     the student's real data (goal, gaps, readiness, next roadmap
     step, goal alignment), with honest fallbacks where nothing is
     measured yet. One line keeps the flashlight rows compact: the
     base layer reserves the same height for the hidden line, so a
     two-line why would leave the rows looking hollow at rest. */
  const suggestions: MentorSuggestion[] = [
    {
      text: SUGGESTION_TEXTS[0],
      why: user?.goal ? `Target role: ${user.goal}` : "Target role: not set yet",
    },
    {
      text: SUGGESTION_TEXTS[1],
      why: gaps
        ? `${gaps.length} skill gap${gaps.length === 1 ? "" : "s"} on record`
        : "Skill gaps: not measured yet",
    },
    {
      text: SUGGESTION_TEXTS[2],
      why: readiness ? `Readiness: ${readiness.overall}%` : "Readiness: not measured yet",
    },
    {
      text: SUGGESTION_TEXTS[3],
      why: nextStages[0] ? `Next step: ${nextStages[0].title}` : "No open roadmap steps",
    },
    {
      text: SUGGESTION_TEXTS[4],
      why: `Goal alignment: ${user?.goalProgress ?? 0}%`,
    },
  ];

  const insights: MentorInsight[] = [
    {
      label: "Goal alignment",
      value: `${user?.goalProgress ?? 0}%`,
      note: "on track for your target role",
    },
    gaps
      ? {
          label: "Skill gaps",
          value: String(gaps.length),
          note: "requirements left to close",
        }
      : { label: "Skill gaps", value: "n/a", note: "run your diagnosis to see them" },
    readiness
      ? {
          label: "Readiness",
          value: `${readiness.overall}%`,
          note: readiness.stage ?? "for your target role",
        }
      : { label: "Readiness", value: "n/a", note: "run your diagnosis for a score" },
  ];

  function send(text: string) {
    const value = text.trim();
    if (!value || thinking) return;
    setInput("");
    setOptimisticUserMsg(value);
    sendMessage.mutate(value, {
      onError: (error) => toast.error(friendlyError(error, "The mentor couldn't reply just now.")),
      onSettled: () => {
        setOptimisticUserMsg(null);
        inputRef.current?.focus();
      },
    });
  }

  return (
    <AppLayout
      title="AI Career Mentor"
      subtitle="Guidance shaped by your goals, scores and roadmap"
    >
      <MentorView
        goal={user?.goal ?? null}
        messages={messages}
        thinking={thinking}
        input={input}
        onInputChange={setInput}
        onSend={send}
        suggestions={suggestions}
        insights={insights}
        actions={actions}
        inputRef={inputRef}
      />
    </AppLayout>
  );
}
