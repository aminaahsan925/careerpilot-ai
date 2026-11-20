import { motion } from "motion/react";
import { CheckCircle2, CircleDashed, CircleSlash, Flashlight as FlashlightIcon } from "lucide-react";

import type { MirrorSkill, SkillStatus, TierCoverage } from "@/lib/jobmirror.server";
import { cn } from "@/lib/utils";
import { Flashlight } from "@/components/lens/Flashlight";
import { KineticText } from "@/components/lens/KineticText";
import { SpotlightCard } from "@/components/lens/SpotlightCard";
import { usePrefersReducedMotion } from "@/components/lens/usePrefersReducedMotion";
import { Cite } from "./MarketTruthNote";

const STATUS_META: Record<
  SkillStatus,
  { icon: typeof CheckCircle2; label: string; className: string; ring: string }
> = {
  demonstrated: {
    icon: CheckCircle2,
    label: "Proven",
    className: "text-cp-lime",
    ring: "bg-cp-lime/10",
  },
  claimed: {
    icon: CircleDashed,
    label: "Claimed, no proof",
    className: "text-cp-ember",
    ring: "bg-cp-ember/10",
  },
  missing: {
    icon: CircleSlash,
    label: "Not recorded",
    className: "text-cp-stone",
    ring: "bg-secondary",
  },
};

/** What counts as proof for each tier, revealed by the flashlight. */
const TIER_PROOF: Record<string, string> = {
  "Non-negotiables": "Only project or GitHub proof counts here. A CV mention does not.",
  Tools: "Working familiarity, proven the same way: a project that uses the tool.",
  Differentiators: "These separate two otherwise identical candidates.",
};

function CoverageBar({
  label,
  coverage,
  showProof,
}: {
  label: string;
  coverage: TierCoverage;
  /** Lit layer shows the proof line; base keeps it hidden for height. */
  showProof: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-cp-stone">
          {label}
        </p>
        <p className="text-xs text-cp-stone">
          <span className="font-display text-base font-semibold text-cp-paper">
            {coverage.covered}
          </span>
          /{coverage.total} proven
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full bg-cp-lime"
          initial={{ width: 0 }}
          animate={{ width: `${coverage.pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p
        aria-hidden={!showProof}
        className={cn(
          "mt-2.5 text-[11.5px] leading-5",
          showProof ? "text-cp-lime" : "text-cp-lime opacity-0",
        )}
      >
        {TIER_PROOF[label]}
      </p>
    </div>
  );
}

function SkillRow({ skill, index }: { skill: MirrorSkill; index: number }) {
  const meta = STATUS_META[skill.status];
  const Icon = meta.icon;

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.3) }}
      className="flex gap-3 border-b border-border py-4 last:border-0"
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          meta.ring,
          meta.className,
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-cp-paper">{skill.skill}</p>
          <span className={cn("text-[11px] font-medium", meta.className)}>{meta.label}</span>
        </div>

        {skill.note && (
          <p className="mt-1.5 text-xs leading-5 text-cp-stone">{skill.note}</p>
        )}

        {skill.matchedRecord && (
          <p className="mt-1.5 text-[11px] leading-5 text-cp-stone">
            Matched from your record: {skill.matchedRecord}
          </p>
        )}

        {skill.citation && (
          <div className="mt-1.5">
            <Cite citation={skill.citation} />
          </div>
        )}
      </div>
    </motion.li>
  );
}

/**
 * The mirror itself: what the market requires for this role, and whether
 * the student can actually prove each item. Requirements and their
 * percentages come from the research dataset; statuses come from the
 * student's own records.
 *
 * Round 3: the coverage strip is a flashlight. The bars stay readable
 * at rest; the light reveals what counts as proof for each tier. The
 * tier cards carry spotlight borders and kinetic headings.
 */
export function SkillMirror({
  skills,
  coverage,
}: {
  skills: MirrorSkill[];
  coverage: { mustHave: TierCoverage; tools: TierCoverage; differentiators: TierCoverage };
}) {
  const reduced = usePrefersReducedMotion();
  const groups = [
    {
      tier: "must-have" as const,
      title: "Non-negotiables",
      blurb: "Missing one of these ends the application. There is no partial credit here.",
    },
    {
      tier: "tool" as const,
      title: "Tools that show up across postings",
      blurb: "Expected working familiarity, not deep expertise.",
    },
    {
      tier: "differentiator" as const,
      title: "What actually makes a junior stand out",
      blurb: "These are the items that separate two otherwise identical candidates.",
    },
  ];

  const bars = [
    { label: "Non-negotiables", coverage: coverage.mustHave },
    { label: "Tools", coverage: coverage.tools },
    { label: "Differentiators", coverage: coverage.differentiators },
  ];

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-cp-panel p-6 sm:p-8">
        <p className="cp-eyebrow flex items-center gap-2">
          <FlashlightIcon className="h-3.5 w-3.5 text-cp-lime" /> Coverage at a glance
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-cp-stone">
          {reduced
            ? "What counts as proof for each tier, shown in full below."
            : "Shine the light on a bar to see what counts as proof for that tier."}
        </p>
        <div className="mt-5">
          <Flashlight
            dimChildren={false}
            lit={
              <div className="grid gap-6 sm:grid-cols-3">
                {bars.map((bar) => (
                  <CoverageBar
                    key={bar.label}
                    label={bar.label}
                    coverage={bar.coverage}
                    showProof
                  />
                ))}
              </div>
            }
          >
            <div className="grid gap-6 sm:grid-cols-3">
              {bars.map((bar) => (
                <CoverageBar
                  key={bar.label}
                  label={bar.label}
                  coverage={bar.coverage}
                  showProof={false}
                />
              ))}
            </div>
          </Flashlight>
        </div>
      </div>

      {groups.map((group) => {
        const rows = skills.filter((skill) => skill.tier === group.tier);
        if (rows.length === 0) return null;

        return (
          <SpotlightCard className="card-surface p-6 sm:p-8" key={group.tier}>
            <h3 className="font-display text-lg font-semibold text-cp-paper">
              <KineticText text={group.title} />
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-cp-stone">{group.blurb}</p>
            <ul className="mt-4">
              {rows.map((skill, index) => (
                <SkillRow key={skill.skill} skill={skill} index={index} />
              ))}
            </ul>
          </SpotlightCard>
        );
      })}
    </section>
  );
}
