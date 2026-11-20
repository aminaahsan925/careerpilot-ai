import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ShieldCheck, Target, TriangleAlert } from "lucide-react";

import { GlowCard, KpiStat, Ring } from "@/components/analytics";
import { ROLE_IDS, ROLE_PROFILES } from "@/data/market-truth/roles";
import type { MarketTruthRoleId } from "@/data/market-truth/types";

/**
 * Hireability calculator — Direction 2 landing widget.
 *
 * Honesty contract (see REBUILD-REPORT-2026-11-20.md):
 * - The ONLY researched data is the role's own listed must-have skills and
 *   portfolio expectations, from the Market Truth dataset (snapshot
 *   2026-08-31). Coverage = skills the user ticked ∩ that listed set.
 * - The verdict is BANDED (Ready to apply / One gap to close / Not yet),
 *   never a probability. The coverage ratio is shown only as a count
 *   ("3 of 5") plus a ring labelled "skill coverage".
 * - NO salary figures: this calculator has no salary data source.
 * - Months of experience inform the advice but never change the band:
 *   entry-level roles in the dataset list 0-2 years as typical.
 * - Everything is labelled "Self-assessment, not a prediction".
 */

/**
 * Completed-project bar per role, read off each role's own
 * `portfolioExpectations` in src/data/market-truth/roles.ts — not invented:
 * frontend and data list "2-3 deployed/portfolio projects", the rest list
 * a single baseline artefact (one deployed API, one end-to-end app, one
 * published app, one home-lab deployment, one automated suite, one
 * outcome-led case study).
 */
const PROJECT_BAR: Record<MarketTruthRoleId, number> = {
  "frontend-react": 2,
  "backend-node-python": 1,
  "full-stack": 1,
  "data-analyst-scientist": 2,
  "mobile-flutter-react-native": 1,
  "devops-cloud": 1,
  "qa-automation": 1,
  "ui-ux-design": 1,
};

const DATASET_LABEL = "dataset snapshot 2026-08-31";

type Verdict = "ready" | "one-gap" | "not-yet";

type NextAction = { title: string; detail: string };

const DEFAULT_ROLE: MarketTruthRoleId = "frontend-react";

/** Default starting point: the first three listed must-haves, for the user to adjust. */
function defaultEvidenced(roleId: MarketTruthRoleId): string[] {
  return ROLE_PROFILES[roleId].mustHaveSkills.slice(0, 3).map((s) => s.skill);
}

export function HireabilityCalculator() {
  const [roleId, setRoleId] = useState<MarketTruthRoleId>(DEFAULT_ROLE);
  const [evidenced, setEvidenced] = useState<string[]>(() => defaultEvidenced(DEFAULT_ROLE));
  const [projects, setProjects] = useState(2);
  const [months, setMonths] = useState(6);

  const profile = ROLE_PROFILES[roleId];
  const mustHaves = profile.mustHaveSkills;
  const projectBar = PROJECT_BAR[roleId];

  const result = useMemo(() => {
    const matched = mustHaves.filter((s) => evidenced.includes(s.skill));
    const missing = mustHaves.filter((s) => !evidenced.includes(s.skill));
    const skillsDone = missing.length === 0;
    const projectsDone = projects >= projectBar;
    const verdict: Verdict =
      skillsDone && projectsDone ? "ready" : skillsDone || projectsDone ? "one-gap" : "not-yet";

    const actions: NextAction[] = [];
    const firstMissing = missing[0];
    if (firstMissing) {
      const notePart =
        firstMissing.note ??
        `One of the ${mustHaves.length} must-have skills listed for ${profile.displayName}.`;
      const note = notePart.endsWith(".") ? notePart : `${notePart}.`;
      actions.push({
        title: `Evidence ${firstMissing.skill} next`,
        detail: [
          note,
          missing.length > 1
            ? `Then ${missing
                .slice(1)
                .map((s) => s.skill)
                .join(", ")} — ${missing.length - 1} more after that.`
            : null,
        ]
          .filter((part): part is string => part !== null)
          .join(" "),
      });
    }
    if (!projectsDone) {
      const shortfall = projectBar - projects;
      const expectation = profile.portfolioExpectations.items[0]?.statement;
      actions.push({
        title: `Ship ${shortfall} more completed project${shortfall === 1 ? "" : "s"}`,
        detail: expectation
          ? `The bar for ${profile.displayName} is ${projectBar}: ${expectation}`
          : `The bar for ${profile.displayName} is ${projectBar} completed project${projectBar === 1 ? "" : "s"}.`,
      });
    }
    if (months === 0) {
      const proof = profile.evidenceEmployersTrust[0]?.statement;
      actions.push({
        title: "Get one real-world proof point",
        detail: proof
          ? `No experience stated yet. What employers trust for this role: ${proof}`
          : "No experience stated yet — an internship or a shipped project is the fastest proof.",
      });
    }
    if (verdict === "ready") {
      actions.push({
        title: "Run the full Recruiter Audit",
        detail:
          "This calculator trusts what you ticked. The audit checks your real resume, your linked project proof, and the researched bar for the company you target.",
      });
    }

    return {
      matched,
      missing,
      skillsDone,
      projectsDone,
      verdict,
      actions: actions.slice(0, 3),
      coveragePct: mustHaves.length === 0 ? 0 : (matched.length / mustHaves.length) * 100,
    };
  }, [evidenced, months, mustHaves, profile, projectBar, projects]);

  const changeRole = (next: MarketTruthRoleId) => {
    setRoleId(next);
    // A new role has a different listed set, so the ticked skills reset to
    // the new role's first three must-haves as the starting point.
    setEvidenced(defaultEvidenced(next));
  };

  const toggleSkill = (name: string) => {
    setEvidenced((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  /** The skills slider sets the COUNT; it fills or trims from the listed order. */
  const setSkillCount = (count: number) => {
    const target = Math.max(0, Math.min(mustHaves.length, count));
    setEvidenced((prev) => {
      const checked = mustHaves.filter((s) => prev.includes(s.skill));
      if (checked.length === target) return prev;
      if (checked.length < target) {
        const add = mustHaves
          .filter((s) => !prev.includes(s.skill))
          .slice(0, target - checked.length)
          .map((s) => s.skill);
        return [...prev, ...add];
      }
      const keep = new Set(checked.slice(0, target).map((s) => s.skill));
      return prev.filter((name) => keep.has(name));
    });
  };

  const verdictCopy: Record<
    Verdict,
    { title: string; detail: string; icon: typeof ShieldCheck; className: string }
  > = {
    ready: {
      title: "Ready to apply",
      detail: `You stated every must-have skill for ${profile.displayName} and ${projects} completed project${projects === 1 ? "" : "s"}. That clears this calculator's bars — the full audit still checks the proof itself.`,
      icon: ShieldCheck,
      className: "text-emerald-400",
    },
    "one-gap": {
      title: "One gap to close",
      detail: !result.skillsDone
        ? `${result.missing.length} must-have skill${result.missing.length === 1 ? "" : "s"} still missing: ${result.missing.map((s) => s.skill).join(", ")}. Your project proof already clears the bar.`
        : `Your skills clear the bar. Project proof is short by ${projectBar - projects} — the bar for ${profile.displayName} is ${projectBar}.`,
      icon: Target,
      className: "text-primary",
    },
    "not-yet": {
      title: "Not yet",
      detail: `Two bars still open: ${result.missing.length} must-have skill${result.missing.length === 1 ? "" : "s"} and ${projectBar - projects} more completed project${projectBar - projects === 1 ? "" : "s"}. Start with the first fix below.`,
      icon: TriangleAlert,
      className: "text-amber-400",
    },
  };
  const verdict = verdictCopy[result.verdict];
  const VerdictIcon = verdict.icon;

  return (
    <section id="calculator" aria-label="Hireability calculator" className="py-16 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Your hireability, honestly
        </p>
        <h2 className="mt-4 text-[clamp(1.8rem,3.4vw,2.5rem)] font-bold tracking-[-0.03em] text-foreground">
          Check your hireability
          <span className="serif-accent text-gradient-accent block">before you apply.</span>
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          Three sliders, one target role. The verdict comes from the role&apos;s own listed
          requirements, not a guess — and it is a self-assessment, not a prediction.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-5">
        {/* INPUTS */}
        <div className="card-surface p-6 sm:p-7 lg:col-span-2">
          <div className="space-y-7">
            <div>
              <label
                htmlFor="calc-role"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Target role
              </label>
              <select
                id="calc-role"
                value={roleId}
                onChange={(e) => changeRole(e.target.value as MarketTruthRoleId)}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[14px] font-medium text-foreground outline-none transition focus:border-primary"
              >
                {ROLE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {ROLE_PROFILES[id].displayName}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                The eight roles researched in the Market Truth dataset ({DATASET_LABEL}).
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label
                  htmlFor="calc-skills"
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Skills you can evidence
                </label>
                <span className="numeral text-2xl leading-none">
                  {result.matched.length}
                  <span className="text-base text-muted-foreground"> / {mustHaves.length}</span>
                </span>
              </div>
              <input
                id="calc-skills"
                type="range"
                min={0}
                max={mustHaves.length}
                step={1}
                value={result.matched.length}
                onChange={(e) => setSkillCount(Number(e.target.value))}
                aria-valuetext={`${result.matched.length} of ${mustHaves.length} must-have skills evidenced`}
                className="mt-3 w-full accent-primary"
              />
              <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Must-have skills for this role">
                {mustHaves.map((s) => {
                  const checked = evidenced.includes(s.skill);
                  return (
                    <button
                      key={s.skill}
                      type="button"
                      aria-pressed={checked}
                      onClick={() => toggleSkill(s.skill)}
                      className={
                        checked
                          ? "rounded-md border border-primary/60 bg-primary/20 px-2.5 py-1 text-xs font-semibold text-foreground transition"
                          : "rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                      }
                    >
                      {s.skill}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Tap the ones you can prove with a project, a repo, or real work — not ones you
                have only watched a tutorial for. Listed in the report&apos;s order.
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label
                  htmlFor="calc-projects"
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Projects completed
                </label>
                <span className="numeral text-2xl leading-none">{projects}</span>
              </div>
              <input
                id="calc-projects"
                type="range"
                min={0}
                max={10}
                step={1}
                value={projects}
                onChange={(e) => setProjects(Number(e.target.value))}
                aria-valuetext={`${projects} projects completed`}
                className="mt-3 w-full accent-primary"
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Finished, working projects. Tutorial clones do not count — the dataset calls them
                &quot;tutorial artifacts, not proof of skill&quot;.
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label
                  htmlFor="calc-months"
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Months of experience
                </label>
                <span className="numeral text-2xl leading-none">
                  {months}
                  <span className="text-base text-muted-foreground"> mo</span>
                </span>
              </div>
              <input
                id="calc-months"
                type="range"
                min={0}
                max={36}
                step={1}
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                aria-valuetext={`${months} months of experience`}
                className="mt-3 w-full accent-primary"
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Internships and freelance work count. Months inform the advice below, not the
                band: entry-level roles in this dataset list 0–2 years as typical.
              </p>
            </div>
          </div>
        </div>

        {/* RESULT */}
        <GlowCard className="lg:col-span-3">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <VerdictIcon className={`h-4 w-4 ${verdict.className}`} aria-hidden="true" />
                Verdict — self-assessment, not a prediction
              </p>
              <p className="text-gradient-accent mt-3 text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
                {verdict.title}
              </p>
              <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
                {verdict.detail}
              </p>
            </div>
            <div className="shrink-0 self-center text-center sm:self-start">
              <Ring
                value={result.coveragePct}
                size={128}
                label={`${result.matched.length}/${mustHaves.length}`}
                sublabel="skill coverage"
              />
            </div>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
            Skill coverage vs {profile.displayName}&apos;s listed requirements ({DATASET_LABEL}):
            {" "}
            <span className="font-semibold text-foreground">
              {result.matched.length} of {mustHaves.length} must-have skills evidenced
            </span>
            {result.missing.length > 0 ? (
              <>
                {" "}— still to evidence:{" "}
                <span className="font-semibold text-foreground">
                  {result.missing.map((s) => s.skill).join(", ")}
                </span>
              </>
            ) : (
              <> — every listed must-have covered.</>
            )}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <KpiStat
              label="Project proof"
              value={`${projects} / ${projectBar}`}
              sub={`Completed projects vs the bar for ${profile.displayName}.`}
            />
            <KpiStat
              label="Experience stated"
              value={`${months} mo`}
              sub="Shown for context — it does not change the band."
            />
          </div>

          <div className="mt-7 border-t border-border pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Your next actions
            </p>
            <ol className="mt-4 space-y-4">
              {result.actions.map((action, i) => (
                <li key={action.title} className="flex items-start gap-3">
                  <span className="numeral mt-0.5 w-6 shrink-0 text-lg leading-none text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[13.5px] font-semibold text-foreground">{action.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                      {action.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <blockquote className="mt-7 border-l-2 border-primary/60 pl-4">
            <p className="serif-accent text-[15px] leading-relaxed text-foreground">
              “{profile.headline}”
            </p>
            <cite className="mt-1 block text-xs not-italic text-muted-foreground">
              Market Truth Report on {profile.displayName} · {DATASET_LABEL}
            </cite>
          </blockquote>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              to="/recruiter"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-[13.5px] font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Run the full Recruiter Audit <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              The audit checks your real evidence, not ticked boxes.
            </p>
          </div>

          <details className="mt-7 border-t border-border pt-5 text-[12.5px] leading-relaxed text-muted-foreground">
            <summary className="cursor-pointer text-[13px] font-semibold text-foreground">
              How this verdict is decided
            </summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>
                Skill coverage counts the must-have skills you ticked against the{" "}
                {mustHaves.length} listed for {profile.displayName} in the Market Truth dataset
                ({DATASET_LABEL}).
              </li>
              <li>
                The project bar is {projectBar} completed project{projectBar === 1 ? "" : "s"}{" "}
                for this role, from its listed portfolio expectation.
              </li>
              <li>
                Both bars cleared means ready to apply. One open bar means one gap to close. Both
                open means not yet.
              </li>
              <li>
                Months of experience do not change the band: entry-level roles in this dataset
                list 0–2 years as typical.
              </li>
              <li>
                This is a self-assessment from what you entered. It is not a prediction, it says
                nothing about your chances with any specific employer, and it shows no salary
                figures — this calculator has no salary data source.
              </li>
            </ul>
          </details>
        </GlowCard>
      </div>
    </section>
  );
}
