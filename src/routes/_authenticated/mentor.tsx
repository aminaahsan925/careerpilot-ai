import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowUpRight, Send, Sparkles, TrendingUp } from "lucide-react";

import { toast } from "sonner";

import { AppLayout } from "@/components/app/AppLayout";
import { useCareerOverview } from "@/data/career";
import { useChatHistory, useSendMentorMessage } from "@/data/mentor";
import { useRoadmap } from "@/data/roadmap";
import { friendlyError, useCurrentUser } from "@/data/user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mentor")({
  head: () => ({
    meta: [
      { title: "AI Career Mentor — CareerPilot AI" },
      {
        name: "description",
        content:
          "Talk to your AI career mentor about roles, skills, interviews and next steps with tailored career insights.",
      },
      { property: "og:title", content: "AI Career Mentor — CareerPilot AI" },
      {
        property: "og:description",
        content: "A focused AI conversation built around your career goal.",
      },
    ],
  }),
  component: MentorPage,
});

type Msg = { role: "ai" | "user"; text: string };

const SUGGESTIONS = [
  "How do I become a Full Stack Developer?",
  "What skills should I learn next?",
  "How can I improve my resume?",
  "Prepare me for a frontend interview",
  "Which internships fit my profile?",
];

function MentorPage() {
  const { data: user } = useCurrentUser();
  const { data: overview } = useCareerOverview();
  const { data: roadmap } = useRoadmap();
  const { data: history } = useChatHistory();
  const sendMessage = useSendMentorMessage();
  const [input, setInput] = useState("");
  const [optimisticUserMsg, setOptimisticUserMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const thinking = sendMessage.isPending;

  const gaps = overview?.gaps ?? null;
  const readiness = overview?.readiness ?? null;
  const nextStages = (roadmap?.stages ?? []).filter((stage) => !stage.completed);
  const actions = [
    ...(readiness?.nextAction ? [readiness.nextAction] : []),
    ...nextStages.slice(0, 2).map((stage) => stage.title),
  ].slice(0, 3);

  const messages: Msg[] = [
    {
      role: "ai" as const,
      text: "I'm your career mentor — I can see your profile, skills and target role. Ask me anything about roles, skills, interviews or your next step.",
    },
    ...(history ?? []).map((m) => ({
      role: m.role === "assistant" ? ("ai" as const) : ("user" as const),
      text: m.content,
    })),
    ...(optimisticUserMsg ? [{ role: "user" as const, text: optimisticUserMsg }] : []),
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking]);

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
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="card-surface flex min-h-[640px] flex-col p-0">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold">Career Mentor</p>
                <p className="truncate text-[11.5px] text-muted-foreground">
                  Focused on {user?.goal ?? "your career goal"}
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
            </span>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={cn("flex gap-3", m.role === "user" && "justify-end")}
              >
                {m.role === "ai" ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
                    <Sparkles className="h-4 w-4" />
                  </span>
                ) : null}
                <p
                  className={cn(
                    "max-w-[520px] px-4 py-3 text-[13px] leading-relaxed",
                    m.role === "ai"
                      ? "rounded-xl rounded-tl-sm bg-secondary"
                      : "rounded-xl rounded-tr-sm bg-terracotta font-medium text-primary-foreground",
                  )}
                >
                  {m.text}
                </p>
              </motion.div>
            ))}

            {thinking ? (
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="rounded-xl rounded-tl-sm bg-secondary px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-terracotta" />
                    <span className="text-[12px] font-semibold text-foreground">
                      Magic is happening...
                    </span>
                    <span className="flex items-center gap-1 pl-0.5">
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          animate={{ opacity: [0.25, 1, 0.25] }}
                          transition={{ duration: 1.1, repeat: Infinity, delay: d * 0.18 }}
                          className="h-1.5 w-1.5 rounded-full bg-terracotta"
                        />
                      ))}
                    </span>
                  </div>
                  <p className="mt-1 text-[10.5px] text-muted-foreground">
                    CareerPilot is checking your evidence...
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-border px-4 py-4 sm:px-6">
            <div className="flex flex-wrap gap-2 pb-4">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-[11.5px] text-muted-foreground transition-colors hover:border-terracotta/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-[13px] outline-none focus:border-terracotta/50"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-terracotta text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-surface p-5">
            <h3 className="text-[14.5px] font-bold">Suggested Questions</h3>
            <div className="mt-4 space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-border px-3 py-3 text-left text-[12.5px] transition-transform hover:-translate-y-0.5 hover:border-terracotta/40"
                >
                  {s}
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-terracotta" />
                </button>
              ))}
            </div>
          </div>

          <div className="card-surface p-5">
            <h3 className="text-[14.5px] font-bold">Career Insights</h3>
            <div className="mt-4 space-y-4">
              {[
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
                  : { label: "Skill gaps", value: "—", note: "run your diagnosis to see them" },
                readiness
                  ? {
                      label: "Readiness",
                      value: `${readiness.overall}%`,
                      note: readiness.stage ?? "for your target role",
                    }
                  : { label: "Readiness", value: "—", note: "run your diagnosis for a score" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-[20px] font-bold tracking-[-0.02em]">
                    {item.value}
                    <TrendingUp className="h-4 w-4 text-terracotta" />
                  </p>
                  <p className="text-[12px] text-muted-foreground">{item.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-surface bg-ink p-5 text-white">
            <h3 className="text-[14px] font-bold">Recommended Actions</h3>
            {actions.length ? (
              <ul className="mt-3 space-y-2.5 text-[12.5px] text-white/70">
                {actions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[12.5px] leading-relaxed text-white/70">
                Run your career diagnosis or generate a roadmap to unlock personalized actions.
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
