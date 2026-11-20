import type { ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleHelp,
  FileText,
  Link2,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { Ring } from "@/components/analytics";
import { cn } from "@/lib/utils";

/**
 * Quest-map header for the recruiter page (Direction 2 — Dark Analytics,
 * Cyera/Imogen quest pattern).
 *
 * PRESENTATIONAL ONLY: no data hooks, no fetches. Every status arrives as
 * props from recruiter.tsx, which owns the session. Each world lights up
 * only from real session state — before a session exists, all three worlds
 * honestly read as unstarted, and the shield honestly reads as untested.
 *
 * Honesty rules (same as the funnel):
 * - The shield shows the readiness BAND only — never a percentage.
 * - Skills world shows "evidence coverage", a share of the student's own
 *   claimed skills with linked proof — never a hiring probability.
 * - Job Market world shows "bar unknown" for unresearched companies.
 * - Missions are exactly the fixes from the verdict, each tagged with its
 *   source stage. No invented missions.
 * - The AI is presented as an AI screening coach, never as a Head of
 *   Talent or a real person.
 */

export type QuestMapProps = {
  companyName: string;
  targetRole: string;
  /** Resume world — driven by the stage-2 (step 2) resume screen state. */
  resume:
    | { status: "unstarted" }
    | { status: "done"; detail: string }
    | { status: "unavailable"; detail?: string | undefined };
  /** Skills world — driven by the stage-2 evidence audit. */
  skills:
    | { status: "unstarted" }
    | {
        status: "done";
        evidenceCoverage: number;
        skillsWithProof: number;
        claimedSkills: number;
      };
  /** Job Market world — driven by the stage-3 bar comparison. */
  jobMarket:
    | { status: "unstarted" }
    | { status: "researched"; detail: string }
    | { status: "unknown"; detail: string };
  /** Hireability band from the verdict, or null before a verdict exists. */
  shieldBand: "ready" | "one_gap" | "not_yet" | null;
  /** Fixes from the verdict — missions = fixes, nothing else. */
  missions: { fix: string; stage: string }[];
  /** Optional: jump into the funnel (worlds → their step, missions → 5). */
  onNavigate?: ((step: number) => void) | undefined;
};

const SHIELD_BANDS: Record<
  NonNullable<QuestMapProps["shieldBand"]>,
  { label: string; note: string; icon: typeof ShieldCheck; className: string; iconClassName: string }
> = {
  ready: {
    label: "Ready to apply",
    note: "The verdict found you ready — apply, then keep the proof fresh.",
    icon: ShieldCheck,
    className: "border-emerald-500/40 bg-emerald-500/10",
    iconClassName: "text-emerald-400",
  },
  one_gap: {
    label: "One gap to close",
    note: "One fix stands between you and ready — it is your first mission.",
    icon: ShieldAlert,
    className: "border-amber-500/40 bg-amber-500/10",
    iconClassName: "text-amber-400",
  },
  not_yet: {
    label: "Not yet",
    note: "The verdict lists what to fix first — work the missions in order.",
    icon: Shield,
    className: "border-rose-500/40 bg-rose-500/10",
    iconClassName: "text-rose-400",
  },
};

type WorldTone = "done" | "pending" | "warn";

function WorldCard({
  icon: Icon,
  name,
  tagline,
  statusLabel,
  tone,
  detail,
  onSelect,
  children,
}: {
  icon: typeof FileText;
  name: string;
  tagline: string;
  statusLabel: string;
  tone: WorldTone;
  detail?: string | undefined;
  onSelect?: (() => void) | undefined;
  children?: ReactNode | undefined;
}) {
  const StatusIcon =
    tone === "done" ? CheckCircle2 : tone === "warn" ? CircleHelp : Lock;
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" strokeWidth={1.7} />
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold",
            tone === "done" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
            tone === "pending" && "border-border bg-secondary/60 text-muted-foreground",
            tone === "warn" && "border-amber-500/30 bg-amber-500/10 text-amber-300",
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {statusLabel}
        </span>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-foreground">{name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{tagline}</p>
          {detail && (
            <p className="mt-2 text-xs leading-relaxed text-foreground/80">{detail}</p>
          )}
        </div>
        {children}
      </div>
      {onSelect && (
        <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary">
          {tone === "pending" ? "Start the quest" : "View this world"}
          <ArrowRight className="h-3 w-3" />
        </p>
      )}
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className="w-full rounded-2xl border border-border bg-card/60 p-4 text-left transition-colors hover:border-primary/40 hover:bg-card"
      >
        {inner}
      </button>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">{inner}</div>
  );
}

export function QuestMap({
  companyName,
  targetRole,
  resume,
  skills,
  jobMarket,
  shieldBand,
  missions,
  onNavigate,
}: QuestMapProps) {
  const shield = shieldBand ? SHIELD_BANDS[shieldBand] : null;
  const ShieldIcon = shield?.icon ?? Shield;

  const go = (step: number) => (onNavigate ? () => onNavigate(step) : undefined);

  return (
    <section aria-label="Screening quest map" className="glow-card overflow-hidden p-5 sm:p-6">
      {/* AI character + shield */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet-deep to-fuchsia-500 text-white shadow-[0_0_24px_-4px_oklch(0.65_0.18_295/80%)]"
          >
            <Sparkles className="h-6 w-6" strokeWidth={1.7} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              CareerPilot Coach · AI screening coach
            </p>
            <h2 className="editorial-title mt-1 text-2xl sm:text-3xl">
              The screening quest
            </h2>
            <p className="serif-accent mt-1">
              Three worlds stand between you and the offer — clear them with real proof.
            </p>
            <p className="mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground">
              Your coach is an AI, not a hiring manager and not {companyName}&rsquo;s team.
              It screens your real resume, projects, and evidence for{" "}
              <strong className="text-foreground">{targetRole}</strong> at{" "}
              <strong className="text-foreground">{companyName}</strong> — and it never
              scores you or guesses a hiring chance.
            </p>
          </div>
        </div>

        {/* Shield — the readiness band, never a percentage */}
        <div
          className={cn(
            "flex w-full shrink-0 flex-col items-center rounded-2xl border px-5 py-4 text-center sm:w-56",
            shield ? shield.className : "border-dashed border-border bg-card/40",
          )}
        >
          <ShieldIcon
            className={cn("h-9 w-9", shield ? shield.iconClassName : "text-muted-foreground")}
            strokeWidth={1.5}
          />
          <p className="mt-2 font-display text-base font-black text-foreground">
            {shield ? shield.label : "Untested"}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {shield
              ? shield.note
              : "Your shield is earned by a verdict — run an audit to test it."}
          </p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Shield · readiness band, not a score
          </p>
        </div>
      </div>

      {/* Three worlds */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <WorldCard
          icon={FileText}
          name="World 1 · Resume"
          tagline="The 6-second screen against the job description."
          statusLabel={
            resume.status === "done"
              ? "Screened"
              : resume.status === "unavailable"
                ? "Unavailable"
                : "Unstarted"
          }
          tone={
            resume.status === "done"
              ? "done"
              : resume.status === "unavailable"
                ? "warn"
                : "pending"
          }
          detail={
            resume.status === "done"
              ? resume.detail
              : resume.status === "unavailable"
                ? (resume.detail ?? "The resume screen could not run for this audit.")
                : "Run an audit to screen your resume against the role."
          }
          onSelect={go(resume.status === "unstarted" ? 1 : 2)}
        />

        <WorldCard
          icon={Link2}
          name="World 2 · Skills"
          tagline="Every claimed skill matched to its proof."
          statusLabel={skills.status === "done" ? "Audited" : "Unstarted"}
          tone={skills.status === "done" ? "done" : "pending"}
          detail={
            skills.status === "done"
              ? `${skills.skillsWithProof} of ${skills.claimedSkills} claimed skills have linked proof.`
              : "Run an audit to match your claimed skills to project proof."
          }
          onSelect={go(skills.status === "unstarted" ? 1 : 2)}
        >
          {skills.status === "done" && (
            <Ring
              value={skills.evidenceCoverage}
              size={84}
              stroke={8}
              label={`${skills.evidenceCoverage}%`}
              sublabel="coverage"
              className="shrink-0"
            />
          )}
        </WorldCard>

        <WorldCard
          icon={Building2}
          name="World 3 · Job Market"
          tagline="Your evidence against the company's researched bar."
          statusLabel={
            jobMarket.status === "researched"
              ? "Bar researched"
              : jobMarket.status === "unknown"
                ? "Bar unknown"
                : "Unstarted"
          }
          tone={
            jobMarket.status === "researched"
              ? "done"
              : jobMarket.status === "unknown"
                ? "warn"
                : "pending"
          }
          detail={
            jobMarket.status === "researched"
              ? jobMarket.detail
              : jobMarket.status === "unknown"
                ? jobMarket.detail
                : "Run an audit to compare yourself against the researched hiring bar."
          }
          onSelect={go(jobMarket.status === "unstarted" ? 1 : 3)}
        />
      </div>

      {/* Missions — fixes from the verdict, nothing else */}
      <div className="mt-6 rounded-2xl border border-border bg-card/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
            <Target className="h-5 w-5 text-primary" />
            Missions
            {missions.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                {missions.length}
              </span>
            )}
          </h3>
          {shieldBand && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate(5)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
            >
              View the verdict
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {missions.length > 0 ? (
          <ol className="mt-3 space-y-2">
            {missions.map((mission, i) => (
              <li
                key={`${mission.stage}-${i}`}
                className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-black text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-relaxed text-foreground">
                    {mission.fix}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    From: {mission.stage}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : shieldBand ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            No missions — the verdict found nothing to fix. You are ready to apply.
          </p>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            No missions yet. Run an audit and every fix the verdict names becomes a
            mission here, tagged with the stage it came from.
          </p>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Worlds light up only from your real audit. Nothing here is guessed, and no
        world is ever marked done from a promise.
      </p>
    </section>
  );
}
