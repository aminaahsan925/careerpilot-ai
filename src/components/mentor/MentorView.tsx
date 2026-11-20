import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowUpRight, Flashlight as FlashlightIcon, Send, Sparkles, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Flashlight } from "@/components/lens/Flashlight";
import { KineticText } from "@/components/lens/KineticText";
import { MagneticButton } from "@/components/lens/MagneticButton";
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import { usePrefersReducedMotion } from "@/components/lens/usePrefersReducedMotion";
import "./mentor-r3.css";

export type MentorMessage = { role: "ai" | "user"; text: string };
export type MentorSuggestion = { text: string; why: string };
export type MentorInsight = { label: string; value: string; note: string };

/**
 * Presentational mentor layout, Round 3 (Cursor as Flashlight / Lens).
 *
 * The signature moment: the suggested questions sit under a
 * flashlight. The questions stay readable at rest; the light reveals
 * the one-line evidence fact behind each one, computed from the
 * student's real data (goal, gaps, readiness, next roadmap step,
 * goal alignment) in the route. The evidence is supplementary: the
 * questions themselves are always visible, the toggle reveals the
 * full lit layer, and reduced motion stacks both layers in full.
 *
 * Interview prep: the mentor only touches interviews through one
 * suggestion ("Prepare me for a frontend interview") and the intro
 * copy. The full interview prep screen lives in Job Mirror
 * (jobmirror.tsx), linked from the suggestions panel.
 */
export function MentorView({
  goal,
  messages,
  thinking,
  input,
  onInputChange,
  onSend,
  suggestions,
  insights,
  actions,
  inputRef,
}: {
  goal: string | null;
  messages: MentorMessage[];
  thinking: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  suggestions: MentorSuggestion[];
  insights: MentorInsight[];
  actions: string[];
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      {/* ── Chat ── */}
      <SpotlightCard className="card-surface overflow-hidden p-0">
        <div className="flex min-h-[640px] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cp-lime text-cp-ink">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-cp-paper">Career Mentor</p>
                <p className="truncate text-[11.5px] text-cp-stone">
                  Focused on {goal ?? "your career goal"}
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[12px] text-cp-stone">
              <span className="cp-mentor-live-dot h-1.5 w-1.5 rounded-full bg-cp-lime" /> Online
            </span>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={cn("flex gap-3", m.role === "user" && "justify-end")}
              >
                {m.role === "ai" ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cp-lime text-cp-ink">
                    <Sparkles className="h-4 w-4" />
                  </span>
                ) : null}
                <p
                  className={cn(
                    "max-w-[520px] px-4 py-3 text-[13px] leading-relaxed",
                    m.role === "ai"
                      ? "rounded-xl rounded-tl-sm bg-secondary text-cp-paper"
                      : "rounded-xl rounded-tr-sm bg-cp-lime font-medium text-cp-ink",
                  )}
                >
                  {m.text}
                </p>
              </motion.div>
            ))}

            {thinking ? (
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cp-lime text-cp-ink">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="rounded-xl rounded-tl-sm bg-secondary px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-cp-lime" />
                    <span className="text-[12px] font-semibold text-cp-paper">
                      Thinking it through...
                    </span>
                    <span className="flex items-center gap-1 pl-0.5">
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          animate={{ opacity: [0.25, 1, 0.25] }}
                          transition={{ duration: 1.1, repeat: Infinity, delay: d * 0.18 }}
                          className="h-1.5 w-1.5 rounded-full bg-cp-lime"
                        />
                      ))}
                    </span>
                  </div>
                  <div className="cp-thinking-beam mt-2.5" aria-hidden="true" />
                  <p className="mt-2 text-[10.5px] text-cp-stone">
                    CareerPilot is checking your evidence...
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-border px-4 py-4 sm:px-6">
            <div className="flex flex-wrap gap-2 pb-4">
              {suggestions.slice(0, 3).map((s) => (
                <button
                  key={s.text}
                  type="button"
                  onClick={() => onSend(s.text)}
                  className="rounded-full border border-border px-3 py-1.5 text-[11.5px] text-cp-stone transition-colors hover:border-cp-lime/40 hover:text-cp-paper"
                >
                  {s.text}
                </button>
              ))}
            </div>
            <form
              ref={formRef}
              onSubmit={(e) => {
                e.preventDefault();
                onSend(input);
              }}
              className="flex items-center gap-4"
            >
              <input
                ref={inputRef}
                autoFocus
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-[13px] text-cp-paper outline-none focus:border-cp-lime/50"
              />
              {/* Magnetic send: the button leans toward the cursor; the
                  click submits the form, so validation and the send
                  guard in the route run exactly as before. */}
              <MagneticButton
                onClick={() => formRef.current?.requestSubmit()}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-cp-lime text-cp-ink"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </MagneticButton>
            </form>
          </div>
        </div>
      </SpotlightCard>

      {/* ── Sidebar ── */}
      <div className="space-y-4">
        <SpotlightCard className="card-surface p-5">
          <h3 className="text-[14.5px] font-bold text-cp-paper">
            <KineticText text="Suggested Questions" />
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-cp-stone">
            <FlashlightIcon className="h-3 w-3 text-cp-lime" />
            {reduced
              ? "The evidence behind each one, shown in full"
              : "Shine the light to see the evidence behind each one"}
          </p>
          <div className="mt-4">
            <Flashlight
              dimChildren={false}
              lit={
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <SuggestionRow key={s.text} suggestion={s} onSend={onSend} lit />
                  ))}
                </div>
              }
            >
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <SuggestionRow key={s.text} suggestion={s} onSend={onSend} lit={false} />
                ))}
              </div>
            </Flashlight>
          </div>
          <Link
            to="/jobmirror"
            className="mt-4 inline-flex items-center gap-1 text-[11.5px] font-semibold text-cp-lime hover:underline"
          >
            Full interview prep lives in Job Mirror
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </SpotlightCard>

        <SpotlightCard className="card-surface p-5">
          <h3 className="text-[14.5px] font-bold text-cp-paper">
            <KineticText text="Career Insights" />
          </h3>
          <div className="mt-4 space-y-4">
            {insights.map((item) => (
              <div
                key={item.label}
                className="border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-cp-stone">
                  {item.label}
                </p>
                <p className="mt-1 flex items-center gap-2 font-display text-[20px] font-bold tracking-[-0.02em] text-cp-paper">
                  {item.value}
                  <TrendingUp className="h-4 w-4 text-cp-lime" />
                </p>
                <p className="text-[12px] text-cp-stone">{item.note}</p>
              </div>
            ))}
          </div>
        </SpotlightCard>

        <SpotlightCard className="card-surface p-5">
          <div className="h-1 w-10 rounded-full bg-cp-lime" aria-hidden="true" />
          <h3 className="mt-3 text-[14px] font-bold text-cp-paper">
            <KineticText text="Recommended Actions" />
          </h3>
          {actions.length ? (
            <>
              <ul className="mt-3 space-y-2.5 text-[12.5px] text-cp-stone">
                {actions.map((action, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-[7px] h-1 w-3 shrink-0 rounded-full bg-cp-lime" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <MagneticButton
                  href="/roadmap"
                  className="inline-flex items-center gap-2 rounded-xl bg-cp-lime px-4 py-2.5 text-xs font-semibold text-cp-ink"
                >
                  Open your roadmap
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </MagneticButton>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-[12.5px] leading-relaxed text-cp-stone">
                Run your career diagnosis or generate a roadmap to unlock personalized actions.
              </p>
              <div className="mt-4">
                <MagneticButton
                  href="/diagnosis"
                  className="inline-flex items-center gap-2 rounded-xl bg-cp-lime px-4 py-2.5 text-xs font-semibold text-cp-ink"
                >
                  Run your diagnosis
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </MagneticButton>
              </div>
            </>
          )}
        </SpotlightCard>
      </div>
    </div>
  );
}

/**
 * One suggestion row, rendered identically in the flashlight's base
 * and lit layers: same text, same sizes, same line clamps, so the two
 * layers share exactly the same height and the light never clips a
 * line. Only the colours change. The base hides its evidence line
 * (opacity-0, aria-hidden); the lit layer shows it in lime mono. Both
 * layers are real buttons, so the suggestion stays sendable whether
 * the light is pinned by a tap or the full layer is revealed by the
 * toggle.
 */
function SuggestionRow({
  suggestion,
  onSend,
  lit,
}: {
  suggestion: MentorSuggestion;
  onSend: (text: string) => void;
  lit: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSend(suggestion.text)}
      className="flex min-h-[76px] w-full items-center justify-between gap-2 rounded-xl border border-border bg-cp-panel px-3 py-3 text-left transition-colors hover:border-cp-lime/40"
    >
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[12.5px] font-medium leading-snug",
            lit ? "text-cp-lime" : "text-cp-paper",
          )}
        >
          {suggestion.text}
        </span>
        <span
          aria-hidden={!lit}
          className={cn(
            "mt-1 line-clamp-2 block font-mono text-[11px] leading-5",
            lit ? "text-cp-lime" : "text-cp-lime opacity-0",
          )}
        >
          {suggestion.why}
        </span>
      </span>
      <ArrowUpRight
        className={cn("h-3.5 w-3.5 shrink-0", lit ? "text-cp-lime" : "text-cp-stone")}
      />
    </button>
  );
}
