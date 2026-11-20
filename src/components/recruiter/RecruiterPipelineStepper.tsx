import { Briefcase, CheckCircle2, ClipboardCheck, MessagesSquare, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

const PIPELINE_STEPS = [
  { id: 1, title: "1. Define Role", icon: Briefcase },
  { id: 2, title: "2. Resume Screen", icon: ClipboardCheck },
  { id: 3, title: "3. Evidence & Bar", icon: Scale },
  { id: 4, title: "4. Mock Interview", icon: MessagesSquare },
  { id: 5, title: "5. Verdict & Plan", icon: CheckCircle2 },
];

export function RecruiterPipelineStepper({
  activeStep,
  onStepClick,
  /** Steps 2-5 stay disabled until an audit session exists (fixes the blank-steps bug). */
  hasSession = true,
}: {
  activeStep: number;
  onStepClick: (step: number) => void;
  hasSession?: boolean;
}) {
  return (
    <div className="d3-card p-4 sm:p-5">
      <div className="flex items-center justify-between overflow-x-auto gap-2">
        {PIPELINE_STEPS.map((s, index) => {
          const isActive = activeStep === s.id;
          const isDone = activeStep > s.id;
          const disabled = s.id > 1 && !hasSession;

          return (
            <div key={s.id} className="flex min-w-[130px] flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => onStepClick(s.id)}
                disabled={disabled}
                title={disabled ? "Run an audit first to unlock this step." : undefined}
                aria-disabled={disabled}
                className={cn(
                  "flex flex-1 items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left transition-all border-2",
                  isActive
                    ? "border-d3-navy bg-d3-navy text-white shadow-md font-bold"
                    : isDone
                      ? "border-d3-leaf/30 bg-d3-lime/20 text-d3-ink font-semibold"
                      : disabled
                        ? "border-transparent text-d3-ink/40 cursor-not-allowed"
                        : "border-transparent text-d3-ink/60 hover:bg-d3-cream",
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black",
                    isActive
                      ? "bg-d3-mustard text-d3-ink"
                      : "bg-d3-cream text-d3-ink/60",
                  )}
                >
                  <s.icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs truncate">{s.title}</span>
              </button>

              {index < PIPELINE_STEPS.length - 1 && (
                <span className="text-d3-ink/30 text-xs hidden sm:inline">→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
